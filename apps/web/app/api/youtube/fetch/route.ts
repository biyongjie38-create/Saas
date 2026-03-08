import { z } from "zod";
import { errorJsonResponse, logApiError, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import { readApiIntegrationConfigFromHeaders } from "@/lib/api-integrations";
import { toUserFacingRuntimeMessage } from "@/lib/runtime-errors";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
import { fetchYoutubeData } from "@/lib/youtube";

export const runtime = "nodejs";

const requestSchema = z.object({
  url: z.string().url()
});

export const POST = withApiRoute(async (request, { requestId }) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return errorJsonResponse(
      {
        code: "INVALID_URL",
        message: "Provide a valid YouTube URL."
      },
      requestId,
      400
    );
  }

  try {
    const supabaseClient = await maybeCreateServerSupabaseClient();
    const providerConfig = readApiIntegrationConfigFromHeaders(request.headers);
    const video = await fetchYoutubeData(parsed.data.url, {
      supabaseClient,
      apiKeyOverride: providerConfig.youtubeApiKey
    });

    return okJsonResponse(
      {
        video,
        source: video.dataSource
      },
      requestId
    );
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_URL") {
      return errorJsonResponse(
        {
          code: "INVALID_URL",
          message: "Could not parse video_id."
        },
        requestId,
        400
      );
    }

    logApiError(request, requestId, error);
    return errorJsonResponse(
      {
        code: "YT_API_FAILED",
        message: toUserFacingRuntimeMessage(error)
      },
      requestId,
      502
    );
  }
});
