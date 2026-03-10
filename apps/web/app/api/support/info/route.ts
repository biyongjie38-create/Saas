import { okJsonResponse, withApiRoute } from "@/lib/api-response";
import { getPublicSupportEmail } from "@/lib/support-contact-server";

export const runtime = "nodejs";

export const GET = withApiRoute(async (_request, { requestId }) => {
  return okJsonResponse(
    {
      support_email: getPublicSupportEmail()
    },
    requestId
  );
});
