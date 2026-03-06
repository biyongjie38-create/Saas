import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-config";

export async function maybeCreateServerSupabaseClient() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // noop in Server Components where cookie mutation is blocked
        }
      }
    }
  });
}

export async function createServerSupabaseClient() {
  const client = await maybeCreateServerSupabaseClient();
  if (!client) {
    throw new Error("SUPABASE_AUTH_CONFIG_MISSING");
  }
  return client;
}
