import type { SupabaseClient, User as SupabaseAuthUser } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createRequestId, errorJsonResponse } from "@/lib/api-response";
import { getE2EAuthUser } from "@/lib/e2e-auth";
import { resolveAppUserProfile } from "@/lib/membership-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
import type { User } from "@/lib/types";

function resolvePlan(user: SupabaseAuthUser): User["plan"] {
  const rawPlan = user.user_metadata?.plan ?? user.app_metadata?.plan;
  return rawPlan === "pro" ? "pro" : "free";
}

export function toAppUser(user: SupabaseAuthUser): User {
  return {
    id: user.id,
    email: user.email ?? "unknown@viralbrain.ai",
    plan: resolvePlan(user),
    subscriptionStatus: resolvePlan(user) === "pro" ? "active" : "none",
    billingCycle: null,
    planStartedAt: null,
    planExpiresAt: null,
  };
}

export async function resolveAuthenticatedAppUser(
  user: SupabaseAuthUser,
  options?: { supabaseClient?: SupabaseClient | null },
): Promise<User> {
  return resolveAppUserProfile(
    {
      id: user.id,
      email: user.email ?? "unknown@viralbrain.ai",
      fallbackPlan: resolvePlan(user),
    },
    options,
  );
}

export async function getOptionalAuthUser(): Promise<SupabaseAuthUser | null> {
  const bypassUser = await getE2EAuthUser();
  if (bypassUser) {
    return bypassUser;
  }

  const supabase = await maybeCreateServerSupabaseClient();
  if (!supabase) {
    return null;
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function requirePageAuthUser(nextPath: string): Promise<SupabaseAuthUser> {
  const user = await getOptionalAuthUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

export async function getApiAuthUser(): Promise<SupabaseAuthUser | null> {
  return getOptionalAuthUser();
}

export function unauthorizedJsonResponse(requestId?: string) {
  return errorJsonResponse(
    {
      code: "UNAUTHORIZED",
      message: "Please sign in first.",
    },
    requestId ?? createRequestId(),
    401,
  );
}

