import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiIntegrationConfig } from "@/lib/api-integrations";
import { runAnalysis, runBenchmarks, runScoring } from "@/lib/ai-client";
import { consumeUsage, createReport, listLibraryItems, updateReport } from "@/lib/report-store";
import type { ModelTrace } from "@/lib/types";
import { fetchYoutubeData } from "@/lib/youtube";

type AnalyzeExecutionResult = {
  reportId: string;
  scoreTotal: number;
};

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

export async function executeAnalyzeTask(input: {
  url: string;
  userId: string;
  plan: "free" | "pro";
  supabaseClient: SupabaseClient | null;
  onStage?: (stage: string, payload?: Record<string, unknown>) => void;
  providerConfig?: ApiIntegrationConfig;
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

