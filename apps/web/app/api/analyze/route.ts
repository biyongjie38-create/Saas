import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createRequestId, errorJsonResponse, okJsonResponse } from "@/lib/api-response";
import { getApiAuthUser, toAppUser, unauthorizedJsonResponse } from "@/lib/auth";
import { runAnalysis, runBenchmarks, runScoring } from "@/lib/ai-client";
import { routeModels } from "@/lib/model-router";
import {
  consumeUsage,
  countUsageForDay,
  createReport,
  listLibraryItems,
  updateReport
} from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { assertUsageWithinLimit, UsageLimitExceededError } from "@/lib/quota";
import { fetchYoutubeData } from "@/lib/youtube";

export const runtime = "nodejs";

type AnalyzeExecutionResult = {
  reportId: string;
  scoreTotal: number;
};

const requestSchema = z.object({
  url: z.string().url(),
  stream: z.boolean().optional().default(true)
});

async function executeAnalyzeTask(input: {
  url: string;
  userId: string;
  plan: "free" | "pro";
  supabaseClient: SupabaseClient;
  onStage?: (stage: string, payload?: Record<string, unknown>) => void;
}): Promise<AnalyzeExecutionResult> {
  const startedAt = Date.now();
  let reportId: string | null = null;

  try {
    await consumeUsage(
      {
        userId: input.userId,
        plan: input.plan,
        action: "analyze",
        costTokens: 0,
        costUsd: null
      },
      { supabaseClient: input.supabaseClient }
    );

    input.onStage?.("fetching_youtube", { message: "Fetching video metadata and comments" });
    const video = await fetchYoutubeData(input.url, { supabaseClient: input.supabaseClient });

    const report = await createReport(
      {
        userId: input.userId,
        videoId: video.videoId,
        status: "running"
      },
      { supabaseClient: input.supabaseClient }
    );

    reportId = report.id;
    input.onStage?.("report_created", {
      reportId,
      videoId: video.videoId,
      source: video.dataSource
    });

    const models = routeModels(video);

    input.onStage?.("analysis", { model: models.analysisModel });
    const analysis = await runAnalysis(video);

    input.onStage?.("benchmark", { model: models.benchmarkModel });
    const libraryItems = await listLibraryItems({ supabaseClient: input.supabaseClient });
    const benchmarks = await runBenchmarks(video, analysis.structure.hookAnalysis, libraryItems);

    input.onStage?.("score", { model: models.scoreModel });
    const score = await runScoring(video, analysis, benchmarks);

    await updateReport(
      report.id,
      {
        status: "done",
        analysisJson: analysis,
        benchmarksJson: benchmarks,
        scoreJson: score,
        scoreTotal: score.total,
        modelTrace: {
          analysisModel: models.analysisModel,
          benchmarkModel: models.benchmarkModel,
          scoreModel: models.scoreModel,
          totalLatencyMs: Date.now() - startedAt,
          retries: 0
        }
      },
      { supabaseClient: input.supabaseClient }
    );

    input.onStage?.("done", {
      reportId: report.id,
      scoreTotal: score.total,
      source: video.dataSource
    });

    return {
      reportId: report.id,
      scoreTotal: score.total
    };
  } catch (error) {
    if (reportId) {
      await updateReport(
        reportId,
        {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "UNKNOWN_ERROR"
        },
        { supabaseClient: input.supabaseClient }
      );
    }

    throw error;
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid request payload. Provide a valid YouTube URL."
      },
      requestId,
      422
    );
  }

  const supabaseClient = await createServerSupabaseClient();
  const appUser = toAppUser(authUser);
  const usedToday = await countUsageForDay(appUser.id, {
    supabaseClient,
    action: "analyze"
  });

  try {
    assertUsageWithinLimit(appUser.plan, usedToday);
  } catch (error) {
    if (error instanceof UsageLimitExceededError) {
      return errorJsonResponse(
        {
          code: error.code,
          message: error.message,
          details: error.details
        },
        requestId,
        429
      );
    }

    throw error;
  }

  const { url, stream } = parsed.data;

  if (!stream) {
    try {
      const result = await executeAnalyzeTask({
        url,
        userId: authUser.id,
        plan: appUser.plan,
        supabaseClient
      });

      return okJsonResponse(
        {
          report_id: result.reportId,
          score_total: result.scoreTotal,
          status: "done"
        },
        requestId
      );
    } catch (error) {
      if (error instanceof UsageLimitExceededError) {
        return errorJsonResponse(
          {
            code: error.code,
            message: error.message,
            details: error.details
          },
          requestId,
          429
        );
      }

      return errorJsonResponse(
        {
          code: "ANALYZE_FAILED",
          message: error instanceof Error ? error.message : "Analyze task failed"
        },
        requestId,
        500
      );
    }
  }

  const encoder = new TextEncoder();

  const streamResponse = new ReadableStream({
    start(controller) {
      const send = (event: string, payload: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify({ request_id: requestId, ...payload })}\n\n`)
        );
      };

      executeAnalyzeTask({
        url,
        userId: authUser.id,
        plan: appUser.plan,
        supabaseClient,
        onStage(stage, payload) {
          send(stage, payload ?? {});
        }
      })
        .catch((error) => {
          if (error instanceof UsageLimitExceededError) {
            send("error", {
              code: error.code,
              message: error.message,
              details: error.details
            });
            return;
          }

          send("error", {
            code: "ANALYZE_FAILED",
            message: error instanceof Error ? error.message : "Analyze task failed"
          });
        })
        .finally(() => {
          controller.close();
        });
    }
  });

  return new Response(streamResponse, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "x-request-id": requestId
    }
  });
}
