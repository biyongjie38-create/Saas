import { getBackendMode, hasSupabaseAuthConfig, isValidUuid } from "@/lib/supabase-config";

export { isValidUuid };

export function normalizeUserIdForBackend(userId: string): string {
  if (!useSupabaseBackend()) {
    return userId;
  }

  if (!isValidUuid(userId)) {
    throw new Error("INVALID_AUTH_USER_ID");
  }

  return userId;
}

export function useSupabaseBackend(): boolean {
  const mode = getBackendMode();

  if (mode === "mock") {
    return false;
  }

  return hasSupabaseAuthConfig();
}
