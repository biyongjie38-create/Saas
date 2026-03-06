import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import { listReports } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const querySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const GET = withApiRoute(async (request, { requestId }) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const supabaseClient = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined
  });

  if (!parsed.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid query parameters."
      },
      requestId,
      422
    );
  }

  const result = await listReports(
    {
      userId: authUser.id,
      limit: parsed.data.limit,
      cursor: parsed.data.cursor
    },
    { supabaseClient }
  );

  return okJsonResponse(
    {
      items: result.data,
      next_cursor: result.nextCursor
    },
    requestId
  );
});
