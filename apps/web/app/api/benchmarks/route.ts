import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { getApiAuthUser, resolveAuthenticatedAppUser, unauthorizedJsonResponse } from "@/lib/auth";
import { getPineconeConfigMissingFields, readApiIntegrationConfigFromHeaders } from "@/lib/api-integrations";
import { runBenchmarks } from "@/lib/ai-client";
import { assertPlanFeature } from "@/lib/plan-access";
import { listLibraryItems } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
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

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  assertPlanFeature(user.plan, "canUseBenchmarkRetrieval", "Upgrade to Pro to run benchmark retrieval.");
  const providerConfig = readApiIntegrationConfigFromHeaders(request.headers);
  const missingFields = getPineconeConfigMissingFields(providerConfig);
  if (missingFields.length > 0) {
    return errorJsonResponse(
      {
        code: "BYOK_PINECONE_CONFIG_MISSING",
        message: "Connect your embedding model and Pinecone credentials before running benchmark retrieval.",
        details: {
          missing_fields: missingFields
        }
      },
      requestId,
      422
    );
  }

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
  const result = await runBenchmarks(video, body.data.structureSummary, libraryItems, providerConfig);

  return okJsonResponse(
    {
      benchmarks: result.benchmarks,
      model_trace: result.trace
    },
    requestId
  );
});
