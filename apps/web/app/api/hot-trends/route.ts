import { okJsonResponse, withApiRoute } from "@/lib/api-response";
import { readApiIntegrationConfigFromHeaders } from "@/lib/api-integrations";
import { fetchHotTrendsDataset } from "@/lib/hot-trends";

export const runtime = "nodejs";

export const GET = withApiRoute(async (request, { requestId }) => {
  const { searchParams } = new URL(request.url);
  const regionCode = searchParams.get("region");
  const providerConfig = readApiIntegrationConfigFromHeaders(request.headers);
  const dataset = await fetchHotTrendsDataset({
    apiKeyOverride: providerConfig.youtubeApiKey,
    regionCode
  });

  return okJsonResponse(dataset, requestId);
});
