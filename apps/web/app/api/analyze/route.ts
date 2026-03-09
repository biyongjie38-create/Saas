import { z } from "zod";
import {
  errorJsonResponse,
  logApiError,
  okJsonResponse,
  toSseErrorEvent,
  toSseSuccessEvent,
  withApiRoute
} from "@/lib/api-response";
import {
  getApiAuthUser,
  resolveAuthenticatedAppUser,
  unauthorizedJsonResponse
} from "@/lib/auth";
import { getAnalyzeConfigMissingFields, readApiIntegrationConfigFromHeaders } from "@/lib/api-integrations";
import { executeAnalyzeTask } from "@/lib/analysis-runner";
import { countUsageForDay } from "@/lib/report-store";
import { toUserFacingRuntimeMessage } from "@/lib/runtime-errors";
import { assertUsageWithinLimit, UsageLimitExceededError } from "@/lib/quota";
import { assertPlanAllowsProvider } from "@/lib/plan-access";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const requestSchema = z.object({
  url: z.string().url(),
  stream: z.boolean().optional().default(true)
});

async function parseAppUser() {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return null;
  }

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const appUser = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  return { authUser, supabaseClient, appUser };
}

export const POST = withApiRoute(async (request, { requestId }) => {
  const auth = await parseAppUser();
  if (!auth) {
    return unauthorizedJsonResponse(requestId);
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid request payload. Provide a valid YouTube URL."
      },
      requestId,
      422
    );
  }

  const providerConfig = readApiIntegrationConfigFromHeaders(request.headers);
  const missingFields = getAnalyzeConfigMissingFields(providerConfig);
  if (missingFields.length > 0) {
    return errorJsonResponse(
      {
        code: "BYOK_CONFIG_MISSING",
        message: "Connect your own YouTube API key and LLM provider credentials before running analysis.",
        details: {
          missing_fields: missingFields
        }
      },
      requestId,
      422
    );
  }
  assertPlanAllowsProvider(auth.appUser.plan, providerConfig);

  const usedToday = await countUsageForDay(auth.appUser.id, {
    supabaseClient: auth.supabaseClient,
    action: "analyze"
  });

  try {
    assertUsageWithinLimit(auth.appUser.plan, usedToday);
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

  const { url, stream } = parsed.data;

  if (!stream) {
    try {
      const result = await executeAnalyzeTask({
        url,
        userId: auth.authUser.id,
        plan: auth.appUser.plan,
        supabaseClient: auth.supabaseClient,
        providerConfig
      });

      return okJsonResponse(
        {
          report_id: result.reportId,
          score_total: result.scoreTotal,
          status: "done"
        },
        requestId
      );
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

      logApiError(request, requestId, error);
      return errorJsonResponse(
        {
          code: "ANALYZE_FAILED",
          message: toUserFacingRuntimeMessage(error)
        },
        requestId,
        500
      );
    }
  }

  const encoder = new TextEncoder();

  const streamResponse = new ReadableStream({
    start(controller) {
      let closed = false;

      const closeController = () => {
        if (closed) {
          return;
        }

        closed = true;
        try {
          controller.close();
        } catch {
          // Ignore duplicate close / disconnected client races.
        }
      };

      const enqueueChunk = (chunk: string) => {
        if (closed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const sendSuccess = (event: string, payload: Record<string, unknown>) => {
        enqueueChunk(toSseSuccessEvent(event, payload, requestId));
      };

      const sendError = (error: { code: string; message: string; details?: Record<string, unknown> }) => {
        enqueueChunk(toSseErrorEvent("error", error, requestId));
      };

      executeAnalyzeTask({
        url,
        userId: auth.authUser.id,
        plan: auth.appUser.plan,
        supabaseClient: auth.supabaseClient,
        providerConfig,
        onStage(stage, payload) {
          sendSuccess(stage, payload ?? {});
        }
      })
        .catch((error) => {
          if (error instanceof UsageLimitExceededError) {
            sendError({
              code: error.code,
              message: error.message,
              details: error.details
            });
            return;
          }

          logApiError(request, requestId, error);
          sendError({
            code: "ANALYZE_FAILED",
            message: toUserFacingRuntimeMessage(error)
          });
        })
        .finally(() => {
          closeController();
        });
    },
    cancel() {
      // The client disconnected; the next enqueue attempt should be ignored.
    }
  });

  return new Response(streamResponse, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "x-request-id": requestId
    }
  });
});

