import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function normalizeNextPath(input: string | null): string {
  if (input && input.startsWith("/")) {
    return input;
  }
  return "/dashboard";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
