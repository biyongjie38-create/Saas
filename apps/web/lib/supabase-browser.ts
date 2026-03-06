import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getBrowserSupabaseAuthConfig } from "@/lib/supabase-config";

export type BrowserSupabaseAuthConfig = {
  url?: string | null;
  anonKey?: string | null;
};

let browserClient: ReturnType<typeof createBrowserClient> | null = null;
let browserClientCacheKey: string | null = null;

function normalizeValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveAuthConfig(input?: BrowserSupabaseAuthConfig): {
  url: string | null;
  anonKey: string | null;
} {
  const browserEnv = getBrowserSupabaseAuthConfig();
  return {
    url: normalizeValue(input?.url) ?? browserEnv.url,
    anonKey: normalizeValue(input?.anonKey) ?? browserEnv.anonKey
  };
}

function requireAuthConfig(authConfig: { url: string | null; anonKey: string | null }) {
  if (!authConfig.url || !authConfig.anonKey) {
    const missing = [
      !authConfig.url ? "NEXT_PUBLIC_SUPABASE_URL (or server-side SUPABASE_URL)" : null,
      !authConfig.anonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY (or server-side SUPABASE_ANON_KEY)" : null
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(`SUPABASE_AUTH_CONFIG_MISSING: ${missing}`);
  }
}

export function getBrowserSupabaseClient(input?: BrowserSupabaseAuthConfig) {
  const authConfig = resolveAuthConfig(input);
  requireAuthConfig(authConfig);

  const cacheKey = `${authConfig.url}::${authConfig.anonKey}`;
  if (browserClient && browserClientCacheKey === cacheKey) {
    return browserClient;
  }

  browserClient = createBrowserClient(authConfig.url!, authConfig.anonKey!);
  browserClientCacheKey = cacheKey;

  return browserClient;
}

export function createImplicitBrowserSupabaseClient(input?: BrowserSupabaseAuthConfig) {
  const authConfig = resolveAuthConfig(input);
  requireAuthConfig(authConfig);

  return createClient(authConfig.url!, authConfig.anonKey!, {
    auth: {
      flowType: "implicit",
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}
