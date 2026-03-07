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

type PaymentProvider = MembershipOrder["paymentProvider"];

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
  payment_provider: string;
  provider_session_id: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  provider_payment_intent_id: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

type UpsertUserSubscriptionInput = {
  userId: string;
  email: string;
  plan: UserPlan;
  subscriptionStatus: SubscriptionStatus;
  billingCycle?: BillingCycle | null;
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
};

type CreateMembershipOrderInput = {
  userId: string;
  plan: UserPlan;
  billingCycle: BillingCycle;
  paymentProvider: PaymentProvider;
  status?: MembershipOrderStatus;
  amountCny?: number;
};

type UpdateMembershipOrderInput = {
  orderId: string;
  status?: MembershipOrderStatus;
  providerSessionId?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerPaymentIntentId?: string | null;
  failureReason?: string | null;
  paidAt?: string | null;
};

type CompleteMembershipOrderInput = {
  orderId: string;
  userId: string;
  email: string;
  plan: UserPlan;
  billingCycle: BillingCycle;
  paymentProvider: PaymentProvider;
  providerSessionId?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerPaymentIntentId?: string | null;
  paidAt?: string | null;
  planExpiresAt?: string | null;
};

type SyncSubscriptionStateInput = {
  orderId?: string | null;
  providerSubscriptionId?: string | null;
  providerCustomerId?: string | null;
  userId?: string | null;
  email?: string | null;
  plan?: UserPlan;
  billingCycle?: BillingCycle | null;
  subscriptionStatus: SubscriptionStatus;
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
};

function isMissingSchemaError(message: string, table: string) {
  const normalized = message.toLowerCase();
  return normalized.includes(table.toLowerCase()) && (normalized.includes("does not exist") || normalized.includes("could not find"));
}

function normalizePaymentProvider(value: unknown): PaymentProvider {
  return value === "stripe_checkout" ? "stripe_checkout" : "demo_checkout";
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

async function getSupabaseClient(options?: MembershipQueryOptions): Promise<SupabaseClient | null> {
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
    paymentProvider: normalizePaymentProvider(row.payment_provider),
    providerSessionId: row.provider_session_id,
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
    providerPaymentIntentId: row.provider_payment_intent_id,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export function resolveMembershipAmountCny(plan: UserPlan, cycle: BillingCycle): number {
  if (plan === "free") {
    return 0;
  }
  return cycle === "yearly" ? 999 : 99;
}

function mapOrderRowPayload(order: MembershipOrder): MembershipOrderRow {
  return {
    id: order.id,
    user_id: order.userId,
    plan: order.plan,
    billing_cycle: order.billingCycle,
    status: order.status,
    amount_cny: order.amountCny,
    payment_provider: order.paymentProvider,
    provider_session_id: order.providerSessionId ?? null,
    provider_customer_id: order.providerCustomerId ?? null,
    provider_subscription_id: order.providerSubscriptionId ?? null,
    provider_payment_intent_id: order.providerPaymentIntentId ?? null,
    failure_reason: order.failureReason ?? null,
    created_at: order.createdAt,
    updated_at: order.updatedAt ?? order.createdAt,
    paid_at: order.paidAt ?? null,
  };
}

async function upsertUserSubscription(input: UpsertUserSubscriptionInput, options?: MembershipQueryOptions): Promise<User> {
  const client = await getSupabaseClient(options);
  if (client) {
    const normalizedUserId = normalizeUserIdForBackend(input.userId);
    const payload = {
      user_id: normalizedUserId,
      email: input.email,
      plan: input.plan,
      subscription_status: input.subscriptionStatus,
      billing_cycle: input.billingCycle ?? null,
      plan_started_at: input.planStartedAt ?? null,
      plan_expires_at: input.planExpiresAt ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from("user_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("user_id,email,plan,subscription_status,billing_cycle,plan_started_at,plan_expires_at,created_at,updated_at")
      .single<UserProfileRow>();

    if (error) {
      if (isMissingSchemaError(error.message, "user_profiles")) {
        return createFallbackUser({ id: input.userId, email: input.email, fallbackPlan: input.plan });
      }
      throw new Error(`SUPABASE_UPSERT_PROFILE_FAILED:${error.message}`);
    }

    return toUserFromProfile(data);
  }

  const db = await readDb();
  let user = db.users.find((item) => item.id === input.userId);
  if (!user) {
    user = {
      id: input.userId,
      email: input.email,
      plan: input.plan,
      subscriptionStatus: input.subscriptionStatus,
      billingCycle: input.billingCycle ?? null,
      planStartedAt: input.planStartedAt ?? null,
      planExpiresAt: input.planExpiresAt ?? null,
    };
    db.users.unshift(user);
  } else {
    user.email = input.email;
    user.plan = input.plan;
    user.subscriptionStatus = input.subscriptionStatus;
    user.billingCycle = input.billingCycle ?? null;
    user.planStartedAt = input.planStartedAt ?? null;
    user.planExpiresAt = input.planExpiresAt ?? null;
  }

  await writeDb(db);
  return user;
}

export async function resolveAppUserProfile(
  input: Pick<User, "id" | "email"> & { fallbackPlan?: UserPlan },
  options?: MembershipQueryOptions,
): Promise<User> {
  const fallbackPlan = input.fallbackPlan === "pro" ? "pro" : "free";
  const client = await getSupabaseClient(options);

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

    return upsertUserSubscription(
      {
        userId: input.id,
        email: input.email,
        plan: fallbackPlan,
        subscriptionStatus: fallbackPlan === "pro" ? "active" : "none",
        billingCycle: fallbackPlan === "pro" ? "monthly" : null,
        planStartedAt: fallbackPlan === "pro" ? new Date().toISOString() : null,
        planExpiresAt: fallbackPlan === "pro" ? addCycle(new Date(), "monthly").toISOString() : null,
      },
      options,
    );
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

export async function createMembershipOrder(
  input: CreateMembershipOrderInput,
  options?: MembershipQueryOptions,
): Promise<MembershipOrder> {
  const now = new Date().toISOString();
  const order: MembershipOrder = {
    id: crypto.randomUUID(),
    userId: input.userId,
    plan: input.plan,
    billingCycle: input.billingCycle,
    status: input.status ?? "pending",
    amountCny: input.amountCny ?? resolveMembershipAmountCny(input.plan, input.billingCycle),
    paymentProvider: input.paymentProvider,
    providerSessionId: null,
    providerCustomerId: null,
    providerSubscriptionId: null,
    providerPaymentIntentId: null,
    failureReason: null,
    createdAt: now,
    updatedAt: now,
    paidAt: input.status === "paid" ? now : null,
  };

  const client = await getSupabaseClient(options);
  if (client) {
    const normalizedUserId = normalizeUserIdForBackend(input.userId);
    const payload = {
      ...mapOrderRowPayload(order),
      user_id: normalizedUserId,
    };

    const { data, error } = await client
      .from("membership_orders")
      .insert(payload)
      .select("id,user_id,plan,billing_cycle,status,amount_cny,payment_provider,provider_session_id,provider_customer_id,provider_subscription_id,provider_payment_intent_id,failure_reason,created_at,updated_at,paid_at")
      .single<MembershipOrderRow>();

    if (error) {
      if (isMissingSchemaError(error.message, "membership_orders")) {
        throw new Error("SUPABASE_MEMBERSHIP_SCHEMA_MISSING");
      }
      throw new Error(`SUPABASE_CREATE_ORDER_FAILED:${error.message}`);
    }

    return toMembershipOrder(data);
  }

  const db = await readDb();
  db.membershipOrders.unshift(order);
  await writeDb(db);
  return order;
}

export async function getMembershipOrderById(orderId: string, options?: MembershipQueryOptions): Promise<MembershipOrder | null> {
  const client = await getSupabaseClient(options);
  if (client) {
    const { data, error } = await client
      .from("membership_orders")
      .select("id,user_id,plan,billing_cycle,status,amount_cny,payment_provider,provider_session_id,provider_customer_id,provider_subscription_id,provider_payment_intent_id,failure_reason,created_at,updated_at,paid_at")
      .eq("id", orderId)
      .maybeSingle<MembershipOrderRow>();

    if (error) {
      if (isMissingSchemaError(error.message, "membership_orders")) {
        return null;
      }
      throw new Error(`SUPABASE_GET_ORDER_FAILED:${error.message}`);
    }

    return data ? toMembershipOrder(data) : null;
  }

  const db = await readDb();
  return db.membershipOrders.find((item) => item.id === orderId) ?? null;
}

export async function getMembershipOrderByProviderSessionId(
  providerSessionId: string,
  options?: MembershipQueryOptions,
): Promise<MembershipOrder | null> {
  const client = await getSupabaseClient(options);
  if (client) {
    const { data, error } = await client
      .from("membership_orders")
      .select("id,user_id,plan,billing_cycle,status,amount_cny,payment_provider,provider_session_id,provider_customer_id,provider_subscription_id,provider_payment_intent_id,failure_reason,created_at,updated_at,paid_at")
      .eq("provider_session_id", providerSessionId)
      .maybeSingle<MembershipOrderRow>();

    if (error) {
      if (isMissingSchemaError(error.message, "membership_orders")) {
        return null;
      }
      throw new Error(`SUPABASE_GET_ORDER_BY_SESSION_FAILED:${error.message}`);
    }

    return data ? toMembershipOrder(data) : null;
  }

  const db = await readDb();
  return db.membershipOrders.find((item) => item.providerSessionId === providerSessionId) ?? null;
}

export async function getMembershipOrderByProviderSubscriptionId(
  providerSubscriptionId: string,
  options?: MembershipQueryOptions,
): Promise<MembershipOrder | null> {
  const client = await getSupabaseClient(options);
  if (client) {
    const { data, error } = await client
      .from("membership_orders")
      .select("id,user_id,plan,billing_cycle,status,amount_cny,payment_provider,provider_session_id,provider_customer_id,provider_subscription_id,provider_payment_intent_id,failure_reason,created_at,updated_at,paid_at")
      .eq("provider_subscription_id", providerSubscriptionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<MembershipOrderRow>();

    if (error) {
      if (isMissingSchemaError(error.message, "membership_orders")) {
        return null;
      }
      throw new Error(`SUPABASE_GET_ORDER_BY_SUBSCRIPTION_FAILED:${error.message}`);
    }

    return data ? toMembershipOrder(data) : null;
  }

  const db = await readDb();
  return db.membershipOrders
    .filter((item) => item.providerSubscriptionId === providerSubscriptionId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0] ?? null;
}

export async function updateMembershipOrder(
  input: UpdateMembershipOrderInput,
  options?: MembershipQueryOptions,
): Promise<MembershipOrder | null> {
  const updatedAt = new Date().toISOString();
  const client = await getSupabaseClient(options);
  if (client) {
    const payload: Record<string, unknown> = {
      updated_at: updatedAt,
    };

    if (input.status) {
      payload.status = input.status;
    }
    if (input.providerSessionId !== undefined) {
      payload.provider_session_id = input.providerSessionId;
    }
    if (input.providerCustomerId !== undefined) {
      payload.provider_customer_id = input.providerCustomerId;
    }
    if (input.providerSubscriptionId !== undefined) {
      payload.provider_subscription_id = input.providerSubscriptionId;
    }
    if (input.providerPaymentIntentId !== undefined) {
      payload.provider_payment_intent_id = input.providerPaymentIntentId;
    }
    if (input.failureReason !== undefined) {
      payload.failure_reason = input.failureReason;
    }
    if (input.paidAt !== undefined) {
      payload.paid_at = input.paidAt;
    }

    const { data, error } = await client
      .from("membership_orders")
      .update(payload)
      .eq("id", input.orderId)
      .select("id,user_id,plan,billing_cycle,status,amount_cny,payment_provider,provider_session_id,provider_customer_id,provider_subscription_id,provider_payment_intent_id,failure_reason,created_at,updated_at,paid_at")
      .maybeSingle<MembershipOrderRow>();

    if (error) {
      if (isMissingSchemaError(error.message, "membership_orders")) {
        throw new Error("SUPABASE_MEMBERSHIP_SCHEMA_MISSING");
      }
      throw new Error(`SUPABASE_UPDATE_ORDER_FAILED:${error.message}`);
    }

    return data ? toMembershipOrder(data) : null;
  }

  const db = await readDb();
  const order = db.membershipOrders.find((item) => item.id === input.orderId);
  if (!order) {
    return null;
  }

  if (input.status) {
    order.status = input.status;
  }
  if (input.providerSessionId !== undefined) {
    order.providerSessionId = input.providerSessionId;
  }
  if (input.providerCustomerId !== undefined) {
    order.providerCustomerId = input.providerCustomerId;
  }
  if (input.providerSubscriptionId !== undefined) {
    order.providerSubscriptionId = input.providerSubscriptionId;
  }
  if (input.providerPaymentIntentId !== undefined) {
    order.providerPaymentIntentId = input.providerPaymentIntentId;
  }
  if (input.failureReason !== undefined) {
    order.failureReason = input.failureReason;
  }
  if (input.paidAt !== undefined) {
    order.paidAt = input.paidAt;
  }
  order.updatedAt = updatedAt;

  await writeDb(db);
  return order;
}

export async function completeMembershipOrder(
  input: CompleteMembershipOrderInput,
  options?: MembershipQueryOptions,
): Promise<{ user: User; order: MembershipOrder }> {
  const paidAt = input.paidAt ?? new Date().toISOString();
  const planExpiresAt = input.planExpiresAt ?? addCycle(new Date(paidAt), input.billingCycle).toISOString();

  const currentOrder = await getMembershipOrderById(input.orderId, options);
  if (!currentOrder) {
    throw new Error("MEMBERSHIP_ORDER_NOT_FOUND");
  }

  const existingUser = await resolveAppUserProfile(
    {
      id: input.userId,
      email: input.email,
      fallbackPlan: input.plan
    },
    options,
  );
  const nextEmail = input.email === "unknown@viralbrain.ai" ? existingUser.email : input.email;

  const user = await upsertUserSubscription(
    {
      userId: input.userId,
      email: nextEmail,
      plan: input.plan,
      subscriptionStatus: input.plan === "pro" ? "active" : "none",
      billingCycle: input.plan === "pro" ? input.billingCycle : null,
      planStartedAt: input.plan === "pro" ? paidAt : null,
      planExpiresAt: input.plan === "pro" ? planExpiresAt : null,
    },
    options,
  );

  const order = await updateMembershipOrder(
    {
      orderId: input.orderId,
      status: "paid",
      providerSessionId: input.providerSessionId,
      providerCustomerId: input.providerCustomerId,
      providerSubscriptionId: input.providerSubscriptionId,
      providerPaymentIntentId: input.providerPaymentIntentId,
      failureReason: null,
      paidAt,
    },
    options,
  );

  if (!order) {
    throw new Error("MEMBERSHIP_ORDER_NOT_FOUND");
  }

  return {
    user,
    order: {
      ...order,
      paymentProvider: input.paymentProvider,
    },
  };
}

export async function markMembershipOrderByProviderSession(
  providerSessionId: string,
  status: Extract<MembershipOrderStatus, "failed" | "canceled">,
  failureReason: string | null,
  options?: MembershipQueryOptions,
): Promise<MembershipOrder | null> {
  const order = await getMembershipOrderByProviderSessionId(providerSessionId, options);
  if (!order) {
    return null;
  }

  return updateMembershipOrder(
    {
      orderId: order.id,
      status,
      failureReason,
    },
    options,
  );
}

export async function syncMembershipSubscriptionState(
  input: SyncSubscriptionStateInput,
  options?: MembershipQueryOptions,
): Promise<User | null> {
  const order =
    (input.orderId ? await getMembershipOrderById(input.orderId, options) : null) ??
    (input.providerSubscriptionId ? await getMembershipOrderByProviderSubscriptionId(input.providerSubscriptionId, options) : null);

  const userId = input.userId ?? order?.userId ?? null;
  if (!userId) {
    return null;
  }

  const currentUser = await resolveAppUserProfile(
    {
      id: userId,
      email: input.email ?? "unknown@viralbrain.ai",
      fallbackPlan: input.subscriptionStatus === "active" ? "pro" : "free",
    },
    options,
  );

  const plan = input.subscriptionStatus === "active" ? input.plan ?? order?.plan ?? "pro" : "free";
  const billingCycle =
    input.subscriptionStatus === "active"
      ? input.billingCycle ?? order?.billingCycle ?? currentUser.billingCycle ?? "monthly"
      : null;
  const planStartedAt =
    input.subscriptionStatus === "active"
      ? input.planStartedAt ?? currentUser.planStartedAt ?? new Date().toISOString()
      : null;
  const planExpiresAt =
    input.subscriptionStatus === "active"
      ? input.planExpiresAt ??
        currentUser.planExpiresAt ??
        addCycle(new Date(planStartedAt ?? new Date().toISOString()), billingCycle ?? "monthly").toISOString()
      : null;

  const user = await upsertUserSubscription(
    {
      userId,
      email: currentUser.email,
      plan,
      subscriptionStatus: input.subscriptionStatus,
      billingCycle,
      planStartedAt,
      planExpiresAt,
    },
    options,
  );

  if (order) {
    await updateMembershipOrder(
      {
        orderId: order.id,
        providerCustomerId: input.providerCustomerId ?? order.providerCustomerId ?? null,
        providerSubscriptionId: input.providerSubscriptionId ?? order.providerSubscriptionId ?? null,
      },
      options,
    );
  }

  return user;
}

export async function listMembershipOrders(userId: string, options?: MembershipQueryOptions): Promise<MembershipOrder[]> {
  const client = await getSupabaseClient(options);
  if (client) {
    const normalizedUserId = normalizeUserIdForBackend(userId);
    const { data, error } = await client
      .from("membership_orders")
      .select("id,user_id,plan,billing_cycle,status,amount_cny,payment_provider,provider_session_id,provider_customer_id,provider_subscription_id,provider_payment_intent_id,failure_reason,created_at,updated_at,paid_at")
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
