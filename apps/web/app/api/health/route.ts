import { okJsonResponse, withApiRoute } from "@/lib/api-response";
import { buildProcessHealthPayload } from "@/lib/health";

export const runtime = "nodejs";

export const GET = withApiRoute(async (_request, { requestId }) => {
  return okJsonResponse(buildProcessHealthPayload(), requestId);
});

export const HEAD = GET;
