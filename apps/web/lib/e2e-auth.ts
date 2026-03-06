import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const E2E_AUTH_COOKIE = "vb_e2e_auth";

export type E2EAuthPayload = {
  id: string;
  email: string;
  plan?: "free" | "pro";
};

function normalizePlan(value: string | undefined): "free" | "pro" {
  return value === "pro" ? "pro" : "free";
}

function encodePayload(payload: E2EAuthPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string): E2EAuthPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    const id = typeof parsed.id === "string" ? parsed.id.trim() : "";
    const email = typeof parsed.email === "string" ? parsed.email.trim() : "";

    if (!id || !email) {
      return null;
    }

    return {
      id,
      email,
      plan: normalizePlan(typeof parsed.plan === "string" ? parsed.plan : undefined)
    };
  } catch {
    return null;
  }
}

function toSupabaseLikeUser(payload: E2EAuthPayload): SupabaseAuthUser {
  return {
    id: payload.id,
    app_metadata: {},
    user_metadata: {
      plan: normalizePlan(payload.plan)
    },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: payload.email
  } as SupabaseAuthUser;
}

export function isE2EAuthBypassEnabled(): boolean {
  return process.env.ENABLE_E2E_AUTH_BYPASS === "true";
}

export function getDefaultE2EAuthPayload(): E2EAuthPayload {
  return {
    id: "local-user",
    email: "local@viralbrain.ai",
    plan: "free"
  };
}

export async function getE2EAuthUser(): Promise<SupabaseAuthUser | null> {
  if (!isE2EAuthBypassEnabled()) {
    return null;
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(E2E_AUTH_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  const payload = decodePayload(raw);
  return payload ? toSupabaseLikeUser(payload) : null;
}

export function createE2EAuthCookieValue(payload: E2EAuthPayload): string {
  return encodePayload({
    id: payload.id,
    email: payload.email,
    plan: normalizePlan(payload.plan)
  });
}

export function getE2EAuthCookieName(): string {
  return E2E_AUTH_COOKIE;
}
