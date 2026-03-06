import { NextResponse } from "next/server";
import { getE2EAuthCookieName, isE2EAuthBypassEnabled } from "@/lib/e2e-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isE2EAuthBypassEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.set(getE2EAuthCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}
