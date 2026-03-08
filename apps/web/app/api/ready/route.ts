import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { buildReadyPayload } from "@/lib/health";

export const runtime = "nodejs";

export const GET = withApiRoute(async (_request, { requestId }) => {
  const payload = await buildReadyPayload();

  if (!payload.ok) {
    return errorJsonResponse(
      {
        code: "SERVICE_NOT_READY",
        message: "One or more required runtime dependencies are not ready.",
        details: payload
      },
      requestId,
      503
    );
  }

  return okJsonResponse(payload, requestId);
});

export const HEAD = GET;
