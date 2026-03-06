import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import { getReportById } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getVideoByVideoId } from "@/lib/youtube";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const paramsSchema = z.object({
  id: z.string().min(1)
});

export const GET = withApiRoute<Params>(async (_request, { requestId }, context) => {
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

  const supabaseClient = await createServerSupabaseClient();
  const report = await getReportById(parsedParams.data.id, authUser.id, { supabaseClient });

  if (!report) {
    return errorJsonResponse(
      {
        code: "REPORT_NOT_FOUND",
        message: "Report not found."
      },
      requestId,
      404
    );
  }

  const video = await getVideoByVideoId(report.videoId, { supabaseClient });

  return okJsonResponse(
    {
      report,
      video
    },
    requestId
  );
});
