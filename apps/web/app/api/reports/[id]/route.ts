import { createRequestId, errorJsonResponse, okJsonResponse } from "@/lib/api-response";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import { getReportById } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getVideoByVideoId } from "@/lib/youtube";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: Params) {
  const requestId = createRequestId();
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const supabaseClient = await createServerSupabaseClient();
  const { id } = await context.params;
  const report = await getReportById(id, authUser.id, { supabaseClient });

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
}
