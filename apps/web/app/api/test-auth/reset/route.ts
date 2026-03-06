import { okJsonResponse, withApiRoute } from "@/lib/api-response";
import { resetDb } from "@/lib/db";
import { isE2EAuthBypassEnabled } from "@/lib/e2e-auth";

export const runtime = "nodejs";

export const GET = withApiRoute(async (_request, { requestId }) => {
  if (!isE2EAuthBypassEnabled()) {
    return new Response("Not Found", { status: 404 });
  }

  const db = await resetDb();
  return okJsonResponse(
    {
      users: db.users.length,
      reports: db.reports.length,
      usage_logs: db.usageLogs.length,
      library_items: db.library.length
    },
    requestId
  );
});
