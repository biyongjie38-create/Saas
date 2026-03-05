import { z } from "zod";
import { createRequestId, errorJsonResponse, okJsonResponse } from "@/lib/api-response";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { fetchYoutubeData } from "@/lib/youtube";

export const runtime = "nodejs";

const requestSchema = z.object({
  url: z.string().url()
});

export async function POST(request: Request) {
  const requestId = createRequestId();
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
    const supabaseClient = await createServerSupabaseClient();
    const video = await fetchYoutubeData(parsed.data.url, { supabaseClient });

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

    if (error instanceof Error && error.message === "YOUTUBE_KEY_MISSING") {
      return errorJsonResponse(
        {
          code: "YOUTUBE_KEY_MISSING",
          message: "YOUTUBE_API_KEY is required when YOUTUBE_FETCH_MODE=live."
        },
        requestId,
        400
      );
    }

    return errorJsonResponse(
      {
        code: "YT_API_FAILED",
        message: "Failed to fetch YouTube data."
      },
      requestId,
      502
    );
  }
}
