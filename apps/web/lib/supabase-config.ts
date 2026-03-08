import { isProductionRuntimeMode } from "@/lib/runtime-mode";

type BackendMode = "mock" | "supabase" | "auto";

function normalizeEnv(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getServerSupabaseUrl(): string | null {
  return normalizeEnv(process.env.SUPABASE_URL) ?? normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function getServerSupabaseAnonKey(): string | null {
  return normalizeEnv(process.env.SUPABASE_ANON_KEY) ?? normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getBrowserSupabaseAuthConfig(): { url: string | null; anonKey: string | null } {
  return {
    url: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export function getSupabaseUrl(): string | null {
  if (typeof window === "undefined") {
    return getServerSupabaseUrl();
  }

  return getBrowserSupabaseAuthConfig().url;
}

export function getSupabaseAnonKey(): string | null {
  if (typeof window === "undefined") {
    return getServerSupabaseAnonKey();
  }

  return getBrowserSupabaseAuthConfig().anonKey;
}

export function hasSupabaseAuthConfig(): boolean {
  return Boolean(getServerSupabaseUrl() && getServerSupabaseAnonKey());
}

export function getBackendMode(): BackendMode {
  const defaultMode: BackendMode = isProductionRuntimeMode() ? "supabase" : "mock";
  const mode = (process.env.DATA_BACKEND ?? defaultMode).toLowerCase();
  if (mode === "supabase" || mode === "auto" || mode === "mock") {
    return mode;
  }
  return defaultMode;
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

