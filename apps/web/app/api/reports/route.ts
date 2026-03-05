import { createRequestId, okJsonResponse } from "@/lib/api-response";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import { listReports } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const supabaseClient = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const result = await listReports(
    { userId: authUser.id, limit, cursor },
    { supabaseClient }
  );

  return okJsonResponse(
    {
      items: result.data,
      next_cursor: result.nextCursor
    },
    requestId
  );
}
