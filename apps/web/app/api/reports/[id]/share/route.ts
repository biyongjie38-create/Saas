import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import {
  getApiAuthUser,
  resolveAuthenticatedAppUser,
  unauthorizedJsonResponse
} from "@/lib/auth";
import { assertPlanFeature } from "@/lib/plan-access";
import { enableReportShare } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const paramsSchema = z.object({
  id: z.string().min(1)
});

export const POST = withApiRoute<Params>(async (request, { requestId }, context) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid report id."
      },
      requestId,
      422
    );
  }

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  assertPlanFeature(user.plan, "canUseShareLinks", "Upgrade to Pro to create share links.");

  const report = await enableReportShare(parsedParams.data.id, authUser.id, { supabaseClient });
  if (!report?.shareToken) {
    return errorJsonResponse(
      {
        code: "REPORT_NOT_FOUND",
        message: "Report not found."
      },
      requestId,
      404
    );
  }

  const origin = new URL(request.url).origin;
  return okJsonResponse(
    {
      report_id: report.id,
      share_token: report.shareToken,
      share_url: `${origin}/share/${report.shareToken}`
    },
    requestId
  );
});

