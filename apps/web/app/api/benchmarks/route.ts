import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import { runBenchmarks } from "@/lib/ai-client";
import { listLibraryItems } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getVideoByVideoId } from "@/lib/youtube";

export const runtime = "nodejs";

const schema = z.object({
  videoId: z.string().min(3),
  structureSummary: z.string().min(6)
});

export const POST = withApiRoute(async (request, { requestId }) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Missing required fields."
      },
      requestId,
      422
    );
  }

  const supabaseClient = await createServerSupabaseClient();
  const video = await getVideoByVideoId(body.data.videoId, { supabaseClient });

  if (!video) {
    return errorJsonResponse(
      {
        code: "VIDEO_NOT_FOUND",
        message: "Run /api/youtube/fetch first."
      },
      requestId,
      404
    );
  }

  const libraryItems = await listLibraryItems({ supabaseClient });
  const result = await runBenchmarks(video, body.data.structureSummary, libraryItems);

  return okJsonResponse(
    {
      benchmarks: result.benchmarks,
      model_trace: result.trace
    },
    requestId
  );
});
