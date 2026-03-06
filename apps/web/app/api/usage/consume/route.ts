import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { getApiAuthUser, toAppUser, unauthorizedJsonResponse } from "@/lib/auth";
import { assertUsageWithinLimit, UsageLimitExceededError } from "@/lib/quota";
import { consumeUsage, countUsageForDay } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const schema = z.object({
  action: z.string().default("analyze"),
  costTokens: z.number().int().nonnegative().default(0),
  costUsd: z.number().nonnegative().nullable().optional()
});

export const POST = withApiRoute(async (request, { requestId }) => {
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
  const appUser = toAppUser(authUser);

  if (parsed.data.action === "analyze") {
    const usedToday = await countUsageForDay(appUser.id, {
      supabaseClient,
      action: "analyze"
    });

    try {
      assertUsageWithinLimit(appUser.plan, usedToday);
    } catch (error) {
      if (error instanceof UsageLimitExceededError) {
        return errorJsonResponse(
          {
            code: error.code,
            message: error.message,
            details: error.details
          },
          requestId,
          429
        );
      }

      throw error;
    }
  }

  try {
    const usage = await consumeUsage(
      {
        userId: authUser.id,
        plan: appUser.plan,
        action: parsed.data.action,
        costTokens: parsed.data.costTokens,
        costUsd: parsed.data.costUsd
      },
      { supabaseClient }
    );

    return okJsonResponse({ usage }, requestId);
  } catch (error) {
    if (error instanceof UsageLimitExceededError) {
      return errorJsonResponse(
        {
          code: error.code,
          message: error.message,
          details: error.details
        },
        requestId,
        429
      );
    }

    throw error;
  }
});
