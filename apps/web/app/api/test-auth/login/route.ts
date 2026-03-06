import { NextResponse } from "next/server";
import { createE2EAuthCookieValue, getDefaultE2EAuthPayload, getE2EAuthCookieName, isE2EAuthBypassEnabled } from "@/lib/e2e-auth";

export const runtime = "nodejs";

function normalizeNextPath(value: string | null): string {
  if (value && value.startsWith("/")) {
    return value;
  }
  return "/dashboard";
}

export async function GET(request: Request) {
  if (!isE2EAuthBypassEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const payload = getDefaultE2EAuthPayload();
  const userId = url.searchParams.get("user_id")?.trim();
  const email = url.searchParams.get("email")?.trim();
  const plan = url.searchParams.get("plan")?.trim();
  const nextPath = normalizeNextPath(url.searchParams.get("next"));

  const cookieValue = createE2EAuthCookieValue({
    id: userId || payload.id,
    email: email || payload.email,
    plan: plan === "pro" ? "pro" : payload.plan
  });

  const response = NextResponse.redirect(new URL(nextPath, request.url), { status: 303 });
  response.cookies.set(getE2EAuthCookieName(), cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
  return response;
}
