import { getBackendMode, hasSupabaseAuthConfig } from "@/lib/supabase-config";
import { getAppRuntimeMode } from "@/lib/runtime-mode";

export type MonitoringCheck = {
  ok: boolean;
  required: boolean;
  detail: string;
};

export type MonitoringPayload = {
  ok: boolean;
  service: "web";
  runtime_mode: ReturnType<typeof getAppRuntimeMode>;
  backend_mode: ReturnType<typeof getBackendMode>;
  timestamp: string;
  checks: {
    app_url: MonitoringCheck;
    supabase_auth: MonitoringCheck;
    ai_service_config: MonitoringCheck;
    ai_service_health: MonitoringCheck;
    stripe_billing: MonitoringCheck;
    rate_limit_store: MonitoringCheck;
    transactional_email: MonitoringCheck;
    sentry: MonitoringCheck;
    posthog: MonitoringCheck;
  };
};

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function hasEnv(name: string): boolean {
  return Boolean(readEnv(name));
}

function normalizeAiServiceHealthUrl(): string | null {
  const baseUrl = readEnv("AI_SERVICE_URL");
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/+$/, "")}/health`;
}

function requiresSupabase(): boolean {
  const backendMode = getBackendMode();
  return backendMode === "supabase" || backendMode === "auto";
}

function requiresSupabaseServiceRole(): boolean {
  return requiresSupabase() && hasEnv("STRIPE_SECRET_KEY");
}

export function buildProcessHealthPayload(): MonitoringPayload {
  const backendMode = getBackendMode();

  return {
    ok: true,
    service: "web",
    runtime_mode: getAppRuntimeMode(),
    backend_mode: backendMode,
    timestamp: new Date().toISOString(),
    checks: {
      app_url: {
        ok: hasEnv("NEXT_PUBLIC_APP_URL"),
        required: false,
        detail: hasEnv("NEXT_PUBLIC_APP_URL")
          ? "NEXT_PUBLIC_APP_URL is set."
          : "NEXT_PUBLIC_APP_URL is optional but recommended for production links and monitors."
      },
      supabase_auth: {
        ok: !requiresSupabase() || hasSupabaseAuthConfig(),
        required: requiresSupabase(),
        detail: requiresSupabase()
          ? hasSupabaseAuthConfig()
            ? "Supabase auth configuration is present."
            : "Supabase auth configuration is missing."
          : "Supabase auth is optional in mock mode."
      },
      ai_service_config: {
        ok: hasEnv("AI_SERVICE_URL"),
        required: true,
        detail: hasEnv("AI_SERVICE_URL") ? "AI_SERVICE_URL is configured." : "AI_SERVICE_URL is missing."
      },
      ai_service_health: {
        ok: true,
        required: false,
        detail: "Dependency health is checked by /api/ready."
      },
      stripe_billing: {
        ok:
          !hasEnv("STRIPE_SECRET_KEY") ||
          (hasEnv("STRIPE_WEBHOOK_SECRET") && (!requiresSupabaseServiceRole() || hasEnv("SUPABASE_SERVICE_ROLE_KEY"))),
        required: hasEnv("STRIPE_SECRET_KEY"),
        detail: !hasEnv("STRIPE_SECRET_KEY")
          ? "Stripe billing is disabled."
          : hasEnv("STRIPE_WEBHOOK_SECRET") && (!requiresSupabaseServiceRole() || hasEnv("SUPABASE_SERVICE_ROLE_KEY"))
            ? "Stripe billing webhook dependencies are configured."
            : "Stripe billing is enabled but webhook secret or Supabase service role key is missing."
      },
      rate_limit_store: {
        ok: hasEnv("UPSTASH_REDIS_REST_URL") && hasEnv("UPSTASH_REDIS_REST_TOKEN"),
        required: false,
        detail: hasEnv("UPSTASH_REDIS_REST_URL") && hasEnv("UPSTASH_REDIS_REST_TOKEN")
          ? "Distributed rate limiting is configured with Upstash Redis."
          : "Rate limiting falls back to local process memory."
      },
      transactional_email: {
        ok: hasEnv("RESEND_API_KEY") && hasEnv("SUPPORT_FROM_EMAIL"),
        required: false,
        detail: hasEnv("RESEND_API_KEY") && hasEnv("SUPPORT_FROM_EMAIL")
          ? "Transactional email is configured."
          : "Transactional email is not configured."
      },
      sentry: {
        ok: hasEnv("SENTRY_DSN") || hasEnv("NEXT_PUBLIC_SENTRY_DSN"),
        required: false,
        detail: hasEnv("SENTRY_DSN") || hasEnv("NEXT_PUBLIC_SENTRY_DSN")
          ? "Sentry is configured."
          : "Sentry is not configured."
      },
      posthog: {
        ok: hasEnv("NEXT_PUBLIC_POSTHOG_KEY"),
        required: false,
        detail: hasEnv("NEXT_PUBLIC_POSTHOG_KEY") ? "PostHog is configured." : "PostHog is not configured."
      }
    }
  };
}

export async function buildReadyPayload(): Promise<MonitoringPayload> {
  const payload = buildProcessHealthPayload();
  const aiHealthUrl = normalizeAiServiceHealthUrl();

  if (!aiHealthUrl) {
    payload.checks.ai_service_health = {
      ok: false,
      required: true,
      detail: "AI service health URL could not be derived because AI_SERVICE_URL is missing."
    };
  } else {
    try {
      const response = await fetch(aiHealthUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000)
      });

      const data = (await response.json().catch(() => null)) as { ok?: boolean; billing_mode?: string } | null;
      const healthy = response.ok && data?.ok === true;

      payload.checks.ai_service_health = {
        ok: healthy,
        required: true,
        detail: healthy
          ? `AI service responded healthy${data?.billing_mode ? ` (${data.billing_mode})` : ""}.`
          : `AI service returned ${response.status}.`
      };
    } catch (error) {
      payload.checks.ai_service_health = {
        ok: false,
        required: true,
        detail: error instanceof Error ? error.message : "AI service health check failed."
      };
    }
  }

  payload.ok = Object.values(payload.checks).every((check) => !check.required || check.ok);
  return payload;
}
