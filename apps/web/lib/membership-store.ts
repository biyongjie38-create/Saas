import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readDb, writeDb } from "@/lib/db";
import { normalizeUserIdForBackend, useSupabaseBackend } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type {
  BillingCycle,
  MembershipOrder,
  MembershipOrderStatus,
  SubscriptionStatus,
  User,
  UserPlan,
} from "@/lib/types";

export type MembershipQueryOptions = {
  supabaseClient?: SupabaseClient | null;
};

type UserProfileRow = {
  user_id: string;
  email: string | null;
  plan: UserPlan;
  subscription_status: SubscriptionStatus;
  billing_cycle: BillingCycle | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type MembershipOrderRow = {
  id: string;
  user_id: string;
  plan: UserPlan;
  billing_cycle: BillingCycle;
  status: MembershipOrderStatus;
  amount_cny: number;
  payment_provider: "demo_checkout";
  created_at: string;
  paid_at: string | null;
};

function isMissingSchemaError(message: string, table: string) {
  const normalized = message.toLowerCase();
  return normalized.includes(table.toLowerCase()) && (normalized.includes("does not exist") || normalized.includes("could not find"));
}

function createFallbackUser(input: Pick<User, "id" | "email"> & { fallbackPlan?: UserPlan }): User {
  const fallbackPlan = input.fallbackPlan === "pro" ? "pro" : "free";
  const now = new Date().toISOString();
  return {
    id: input.id,
    email: input.email,
    plan: fallbackPlan,
    subscriptionStatus: fallbackPlan === "pro" ? "active" : "none",
    billingCycle: fallbackPlan === "pro" ? "monthly" : null,
    planStartedAt: fallbackPlan === "pro" ? now : null,
    planExpiresAt: fallbackPlan === "pro" ? addCycle(new Date(now), "monthly").toISOString() : null,
  };
}

async function getSupabaseUserClient(options?: MembershipQueryOptions): Promise<SupabaseClient | null> {
  if (!useSupabaseBackend()) {
    return null;
  }

  if (options?.supabaseClient) {
    return options.supabaseClient;
  }

  try {
    return await createServerSupabaseClient();
  } catch {
    throw new Error("SUPABASE_REQUEST_CONTEXT_MISSING");
  }
}

function toUserFromProfile(row: UserProfileRow): User {
  return {
    id: row.user_id,
    email: row.email ?? "unknown@viralbrain.ai",
    plan: row.plan === "pro" ? "pro" : "free",
    subscriptionStatus: row.subscription_status,
    billingCycle: row.billing_cycle,
    planStartedAt: row.plan_started_at,
    planExpiresAt: row.plan_expires_at,
  };
}

function toMembershipOrder(row: MembershipOrderRow): MembershipOrder {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    billingCycle: row.billing_cycle,
    status: row.status,
    amountCny: row.amount_cny,
    paymentProvider: row.payment_provider,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

function addCycle(startedAt: Date, cycle: BillingCycle): Date {
  const next = new Date(startedAt.getTime());
  if (cycle === "yearly") {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    return next;
  }

  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function planPrice(plan: UserPlan, cycle: BillingCycle): number {
  if (plan === "free") {
    return 0;
  }
  return cycle === "yearly" ? 999 : 99;
}

export async function resolveAppUserProfile(
  input: Pick<User, "id" | "email"> & { fallbackPlan?: UserPlan },
  options?: MembershipQueryOptions,
): Promise<User> {
  const fallbackPlan = input.fallbackPlan === "pro" ? "pro" : "free";
  const client = await getSupabaseUserClient(options);

  if (client) {
    const normalizedUserId = normalizeUserIdForBackend(input.id);
    const { data: existing, error } = await client
      .from("user_profiles")
      .select("user_id,email,plan,subscription_status,billing_cycle,plan_started_at,plan_expires_at,created_at,updated_at")
      .eq("user_id", normalizedUserId)
      .maybeSingle<UserProfileRow>();

    if (error) {
      if (isMissingSchemaError(error.message, "user_profiles")) {
        return createFallbackUser({ ...input, fallbackPlan });
      }
      throw new Error(`SUPABASE_GET_PROFILE_FAILED:${error.message}`);
    }

    if (existing) {
      return toUserFromProfile(existing);
    }

    const now = new Date().toISOString();
    const payload = {
      user_id: normalizedUserId,
      email: input.email,
      plan: fallbackPlan,
      subscription_status: fallbackPlan === "pro" ? "active" : "none",
      billing_cycle: fallbackPlan === "pro" ? "monthly" : null,
      plan_started_at: fallbackPlan === "pro" ? now : null,
      plan_expires_at: fallbackPlan === "pro" ? addCycle(new Date(now), "monthly").toISOString() : null,
      created_at: now,
      updated_at: now,
    };

    const { data: inserted, error: insertError } = await client
      .from("user_profiles")
      .insert(payload)
      .select("user_id,email,plan,subscription_status,billing_cycle,plan_started_at,plan_expires_at,created_at,updated_at")
      .single<UserProfileRow>();

    if (insertError) {
      if (isMissingSchemaError(insertError.message, "user_profiles")) {
        return createFallbackUser({ ...input, fallbackPlan });
      }
      throw new Error(`SUPABASE_CREATE_PROFILE_FAILED:${insertError.message}`);
    }

    return toUserFromProfile(inserted);
  }

  const db = await readDb();
  const existing = db.users.find((user) => user.id === input.id);
  if (existing) {
    if (!existing.email && input.email) {
      existing.email = input.email;
      await writeDb(db);
    }
    return existing;
  }

  const user = createFallbackUser({ ...input, fallbackPlan });
  db.users.unshift(user);
  await writeDb(db);
  return user;
}

export async function activateMembershipPlan(
  input: {
    userId: string;
    email: string;
    plan: UserPlan;
    billingCycle: BillingCycle;
  },
  options?: MembershipQueryOptions,
): Promise<{ user: User; order: MembershipOrder }> {
  const startedAt = new Date();
  const expiresAt = input.plan === "pro" ? addCycle(startedAt, input.billingCycle).toISOString() : null;
  const paidAt = input.plan === "pro" ? startedAt.toISOString() : null;
  const amountCny = planPrice(input.plan, input.billingCycle);
  const client = await getSupabaseUserClient(options);

  if (client) {
    const normalizedUserId = normalizeUserIdForBackend(input.userId);
    const now = startedAt.toISOString();

    const { data: profile, error: profileError } = await client
      .from("user_profiles")
      .upsert(
        {
          user_id: normalizedUserId,
          email: input.email,
          plan: input.plan,
          subscription_status: input.plan === "pro" ? "active" : "none",
          billing_cycle: input.plan === "pro" ? input.billingCycle : null,
          plan_started_at: input.plan === "pro" ? now : null,
          plan_expires_at: expiresAt,
          updated_at: now,
        },
        { onConflict: "user_id" },
      )
      .select("user_id,email,plan,subscription_status,billing_cycle,plan_started_at,plan_expires_at,created_at,updated_at")
      .single<UserProfileRow>();

    if (profileError) {
      if (isMissingSchemaError(profileError.message, "user_profiles")) {
        throw new Error("SUPABASE_MEMBERSHIP_SCHEMA_MISSING");
      }
      throw new Error(`SUPABASE_UPSERT_PROFILE_FAILED:${profileError.message}`);
    }

    const orderPayload = {
      id: crypto.randomUUID(),
      user_id: normalizedUserId,
      plan: input.plan,
      billing_cycle: input.billingCycle,
      status: "paid",
      amount_cny: amountCny,
      payment_provider: "demo_checkout",
      created_at: now,
      paid_at: paidAt,
    };

    const { data: order, error: orderError } = await client
      .from("membership_orders")
      .insert(orderPayload)
      .select("id,user_id,plan,billing_cycle,status,amount_cny,payment_provider,created_at,paid_at")
      .single<MembershipOrderRow>();

    if (orderError) {
      if (isMissingSchemaError(orderError.message, "membership_orders")) {
        throw new Error("SUPABASE_MEMBERSHIP_SCHEMA_MISSING");
      }
      throw new Error(`SUPABASE_CREATE_ORDER_FAILED:${orderError.message}`);
    }

    return {
      user: toUserFromProfile(profile),
      order: toMembershipOrder(order),
    };
  }

  const db = await readDb();
  let user = db.users.find((item) => item.id === input.userId);
  if (!user) {
    user = {
      id: input.userId,
      email: input.email,
      plan: input.plan,
      subscriptionStatus: input.plan === "pro" ? "active" : "none",
      billingCycle: input.plan === "pro" ? input.billingCycle : null,
      planStartedAt: input.plan === "pro" ? startedAt.toISOString() : null,
      planExpiresAt: expiresAt,
    };
    db.users.unshift(user);
  } else {
    user.email = input.email;
    user.plan = input.plan;
    user.subscriptionStatus = input.plan === "pro" ? "active" : "none";
    user.billingCycle = input.plan === "pro" ? input.billingCycle : null;
    user.planStartedAt = input.plan === "pro" ? startedAt.toISOString() : null;
    user.planExpiresAt = expiresAt;
  }

  const order: MembershipOrder = {
    id: crypto.randomUUID(),
    userId: input.userId,
    plan: input.plan,
    billingCycle: input.billingCycle,
    status: "paid",
    amountCny,
    paymentProvider: "demo_checkout",
    createdAt: startedAt.toISOString(),
    paidAt,
  };

  db.membershipOrders.unshift(order);
  await writeDb(db);
  return {
    user,
    order,
  };
}

export async function listMembershipOrders(userId: string, options?: MembershipQueryOptions): Promise<MembershipOrder[]> {
  const client = await getSupabaseUserClient(options);
  if (client) {
    const normalizedUserId = normalizeUserIdForBackend(userId);
    const { data, error } = await client
      .from("membership_orders")
      .select("id,user_id,plan,billing_cycle,status,amount_cny,payment_provider,created_at,paid_at")
      .eq("user_id", normalizedUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      if (isMissingSchemaError(error.message, "membership_orders")) {
        return [];
      }
      throw new Error(`SUPABASE_LIST_ORDERS_FAILED:${error.message}`);
    }

    return (data ?? []).map((row) => toMembershipOrder(row as MembershipOrderRow));
  }

  const db = await readDb();
  return db.membershipOrders.filter((item) => item.userId === userId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

