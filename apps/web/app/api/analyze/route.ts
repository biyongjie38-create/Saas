import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  errorJsonResponse,
  logApiError,
  okJsonResponse,
  toSseErrorEvent,
  toSseSuccessEvent,
  withApiRoute
} from "@/lib/api-response";
import { getApiAuthUser, toAppUser, unauthorizedJsonResponse } from "@/lib/auth";
import { readApiIntegrationConfigFromHeaders } from "@/lib/api-integrations";
import { runAnalysis, runBenchmarks, runScoring } from "@/lib/ai-client";
import { consumeUsage, countUsageForDay, createReport, listLibraryItems, updateReport } from "@/lib/report-store";
import { assertUsageWithinLimit, UsageLimitExceededError } from "@/lib/quota";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
import type { ModelTrace } from "@/lib/types";
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

function buildModelTrace(input: {
  analysis: Awaited<ReturnType<typeof runAnalysis>>["trace"];
  benchmark: Awaited<ReturnType<typeof runBenchmarks>>["trace"];
  score: Awaited<ReturnType<typeof runScoring>>["trace"];
  totalLatencyMs: number;
}): ModelTrace {
  const inputTokens = input.analysis.inputTokens + input.benchmark.inputTokens + input.score.inputTokens;
  const outputTokens = input.analysis.outputTokens + input.benchmark.outputTokens + input.score.outputTokens;
  const totalTokens = input.analysis.totalTokens + input.benchmark.totalTokens + input.score.totalTokens;

  return {
    analysisModel: input.analysis.model,
    benchmarkModel: input.benchmark.model,
    scoreModel: input.score.model,
    totalLatencyMs: input.totalLatencyMs,
    retries: input.analysis.retries + input.benchmark.retries + input.score.retries,
    fallbackUsed: input.analysis.fallbackUsed || input.benchmark.fallbackUsed || input.score.fallbackUsed,
    inputTokens,
    outputTokens,
    totalTokens,
    analysis: input.analysis,
    benchmark: input.benchmark,
    score: input.score
  };
}

async function executeAnalyzeTask(input: {
  url: string;
  userId: string;
  plan: "free" | "pro";
  supabaseClient: SupabaseClient | null;
  onStage?: (stage: string, payload?: Record<string, unknown>) => void;
  providerConfig?: ReturnType<typeof readApiIntegrationConfigFromHeaders>;
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
    const video = await fetchYoutubeData(input.url, {
      supabaseClient: input.supabaseClient,
      apiKeyOverride: input.providerConfig?.youtubeApiKey
    });

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

    input.onStage?.("analysis", {});
    const analysisResult = await runAnalysis(video, input.providerConfig);

    input.onStage?.("benchmark", {});
    const libraryItems = await listLibraryItems({ supabaseClient: input.supabaseClient });
    const benchmarkResult = await runBenchmarks(
      video,
      analysisResult.analysis.structure.hookAnalysis,
      libraryItems,
      input.providerConfig
    );

    input.onStage?.("score", {});
    const scoreResult = await runScoring(video, analysisResult.analysis, benchmarkResult.benchmarks, input.providerConfig);

    const modelTrace = buildModelTrace({
      analysis: analysisResult.trace,
      benchmark: benchmarkResult.trace,
      score: scoreResult.trace,
      totalLatencyMs: Date.now() - startedAt
    });

    await updateReport(
      report.id,
      {
        status: "done",
        analysisJson: analysisResult.analysis,
        benchmarksJson: benchmarkResult.benchmarks,
        scoreJson: scoreResult.score,
        scoreTotal: scoreResult.score.total,
        modelTrace
      },
      { supabaseClient: input.supabaseClient }
    );

    input.onStage?.("done", {
      reportId: report.id,
      scoreTotal: scoreResult.score.total,
      source: video.dataSource,
      modelTrace: {
        analysis_model: modelTrace.analysisModel,
        score_model: modelTrace.scoreModel,
        total_tokens: modelTrace.totalTokens ?? 0,
        fallback_used: modelTrace.fallbackUsed ?? false
      }
    });

    return {
      reportId: report.id,
      scoreTotal: scoreResult.score.total
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

export const POST = withApiRoute(async (request, { requestId }) => {
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

  const supabaseClient = await maybeCreateServerSupabaseClient();
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
  const providerConfig = readApiIntegrationConfigFromHeaders(request.headers);

  if (!stream) {
    try {
      const result = await executeAnalyzeTask({
        url,
        userId: authUser.id,
        plan: appUser.plan,
        supabaseClient,
        providerConfig
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

      logApiError(request, requestId, error);
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
      const sendSuccess = (event: string, payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(toSseSuccessEvent(event, payload, requestId)));
      };

      const sendError = (error: { code: string; message: string; details?: Record<string, unknown> }) => {
        controller.enqueue(encoder.encode(toSseErrorEvent("error", error, requestId)));
      };

      executeAnalyzeTask({
        url,
        userId: authUser.id,
        plan: appUser.plan,
        supabaseClient,
        providerConfig,
        onStage(stage, payload) {
          sendSuccess(stage, payload ?? {});
        }
      })
        .catch((error) => {
          if (error instanceof UsageLimitExceededError) {
            sendError({
              code: error.code,
              message: error.message,
              details: error.details
            });
            return;
          }

          logApiError(request, requestId, error);
          sendError({
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
});
