import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { readApiIntegrationConfigFromHeaders } from "@/lib/api-integrations";
import { getApiAuthUser } from "@/lib/auth";
import { fetchHotTrendsDataset } from "@/lib/hot-trends";
import { getFallbackHotTrendsDataset } from "@/lib/hot-trends-data";
import { enforceRateLimit } from "@/lib/rate-limit";
import { toUserFacingRuntimeMessage } from "@/lib/runtime-errors";

export const runtime = "nodejs";

export const GET = withApiRoute(async (request, { requestId }) => {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get("region");
  const authUser = await getApiAuthUser();
  const providerConfig = readApiIntegrationConfigFromHeaders(request.headers);
  const hasUserYoutubeKey = Boolean(providerConfig.youtubeApiKey?.trim());
  const rateLimitDecision = await enforceRateLimit({
    request,
    requestId,
    namespace: "hot-trends",
    userId: authUser?.id,
    maxRequests: authUser ? (hasUserYoutubeKey ? 120 : 30) : hasUserYoutubeKey ? 60 : 20,
    window: {
      label: "10 m",
      ms: 10 * 60 * 1000
    },
    message: "Too many hot trend requests. Please wait a few minutes and try again."
  });

  if (!rateLimitDecision.allowed) {
    return rateLimitDecision.response;
  }

  if (!authUser && !hasUserYoutubeKey) {
    return okJsonResponse(
      {
        ...getFallbackHotTrendsDataset(),
        updatedAt: new Date().toISOString(),
        message: "Sign in or connect your own YouTube API key to load live trends. Showing preview rows instead."
      },
      requestId
    );
  }

  try {
    const dataset = await fetchHotTrendsDataset({
      apiKeyOverride: providerConfig.youtubeApiKey,
      regionCode,
      allowServerKeyFallback: Boolean(authUser)
    });

    return okJsonResponse(dataset, requestId);
  } catch (error) {
    return errorJsonResponse(
      {
        code: "HOT_TRENDS_FAILED",
        message: toUserFacingRuntimeMessage(error)
      },
      requestId,
      503
    );
  }
});
