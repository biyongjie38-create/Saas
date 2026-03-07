import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import {
  getApiAuthUser,
  resolveAuthenticatedAppUser,
  unauthorizedJsonResponse
} from "@/lib/auth";
import { readApiIntegrationConfigFromHeaders } from "@/lib/api-integrations";
import { executeAnalyzeTask } from "@/lib/analysis-runner";
import { assertPlanAllowsProvider, assertPlanFeature } from "@/lib/plan-access";
import { getReportById } from "@/lib/report-store";
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
  assertPlanFeature(user.plan, "canRerunReports", "Upgrade to Pro to rerun reports.");

  const existing = await getReportById(parsedParams.data.id, authUser.id, { supabaseClient });
  if (!existing) {
    return errorJsonResponse(
      {
        code: "REPORT_NOT_FOUND",
        message: "Report not found."
      },
      requestId,
      404
    );
  }

  const providerConfig = readApiIntegrationConfigFromHeaders(request.headers);
  assertPlanAllowsProvider(user.plan, providerConfig);
  const result = await executeAnalyzeTask({
    url: `https://www.youtube.com/watch?v=${existing.videoId}`,
    userId: authUser.id,
    plan: user.plan,
    supabaseClient,
    providerConfig
  });

  return okJsonResponse(
    {
      previous_report_id: existing.id,
      report_id: result.reportId,
      score_total: result.scoreTotal
    },
    requestId,
    201
  );
});

