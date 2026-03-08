import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { readApiIntegrationConfigFromHeaders } from "@/lib/api-integrations";
import { fetchHotTrendsDataset } from "@/lib/hot-trends";
import { toUserFacingRuntimeMessage } from "@/lib/runtime-errors";

export const runtime = "nodejs";

export const GET = withApiRoute(async (request, { requestId }) => {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get("region");
  const providerConfig = readApiIntegrationConfigFromHeaders(request.headers);
  try {
    const dataset = await fetchHotTrendsDataset({
      apiKeyOverride: providerConfig.youtubeApiKey,
      regionCode
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
