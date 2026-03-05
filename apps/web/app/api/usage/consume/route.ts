import { z } from "zod";
import { createRequestId, errorJsonResponse, okJsonResponse } from "@/lib/api-response";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import { consumeUsage } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const schema = z.object({
  action: z.string().default("analyze"),
  costTokens: z.number().int().nonnegative().default(0),
  costUsd: z.number().nonnegative().nullable().optional()
});

export async function POST(request: Request) {
  const requestId = createRequestId();
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid payload."
      },
      requestId,
      422
    );
  }

  const supabaseClient = await createServerSupabaseClient();
  const usage = await consumeUsage(
    {
      userId: authUser.id,
      action: parsed.data.action,
      costTokens: parsed.data.costTokens,
      costUsd: parsed.data.costUsd
    },
    { supabaseClient }
  );

  return okJsonResponse({ usage }, requestId);
}
