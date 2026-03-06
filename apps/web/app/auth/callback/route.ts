function normalizeNextPath(input: string | null): string {
  if (input && input.startsWith("/")) {
    return input;
  }
  return "/dashboard";
}

function fallbackHtml(defaultNextPath: string): string {
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
        var url = new URL(window.location.href);
        var params = new URLSearchParams(url.search);
        var defaultNext = ${JSON.stringify(defaultNextPath)};
        var next = params.get("next");
        if (!next || next.charAt(0) !== "/") {
          params.set("next", defaultNext);
        }
        var query = params.toString();
        var target = "/auth/confirm" + (query ? "?" + query : "") + (url.hash || "");
        window.location.replace(target);
      })();
    </script>
    <noscript>
      JavaScript is required to complete sign-in.
      <a href="/login">Go to Login</a>
    </noscript>
  </body>
</html>`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));

  return new Response(fallbackHtml(nextPath), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
