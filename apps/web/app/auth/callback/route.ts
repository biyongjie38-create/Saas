import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function normalizeNextPath(input: string | null): string {
  if (input && input.startsWith("/")) {
    return input;
  }
  return "/dashboard";
}

function fallbackHtml(nextPath: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Auth Redirect</title>
  </head>
  <body>
    <script>
      (function() {
        var next = ${JSON.stringify(nextPath)};
        var hash = window.location.hash || "";
        var target = "/auth/confirm?next=" + encodeURIComponent(next) + hash;
        window.location.replace(target);
      })();
    </script>
    Redirecting...
  </body>
</html>`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  return new Response(fallbackHtml(nextPath), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

