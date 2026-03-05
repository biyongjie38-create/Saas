import { generateLocalAnalysis, generateLocalBenchmarks, generateLocalScore } from "@/lib/local-ai";
import type { AnalysisJson, BenchmarksJson, ScoreJson, ViralLibraryItem, YoutubeVideo } from "@/lib/types";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";

type AiStats = {
  view_count: number;
  like_count: number;
  comment_count: number;
};

type AiAnalysisResponse = {
  analysis: {
    structure: {
      hook_analysis: string;
      pacing_notes: string[];
      cta_review: string;
    };
    thumbnail_review: {
      score: number;
      diagnosis: string;
      improvements: string[];
    };
    comments_insights: {
      sentiment: "positive" | "neutral" | "mixed" | "negative";
      audience_persona: string;
      motivations: string[];
      concerns: string[];
    };
  };
};

type AiBenchmarksResponse = {
  benchmarks: {
    top_matches: {
      id: string;
      title: string;
      source_url: string;
      similarity: number;
      shared_points: string[];
      differences: string[];
      copy: string[];
      avoid: string[];
    }[];
  };
};

type AiScoreResponse = {
  score: {
    total: number;
    breakdown: {
      title: number;
      thumbnail: number;
      hook: number;
      pacing: number;
      value_density: number;
      emotion_resonance: number;
    };
    top_actions: string[];
  };
};

function toAiStats(stats: YoutubeVideo["stats"]): AiStats {
  return {
    view_count: stats.viewCount,
    like_count: stats.likeCount,
    comment_count: stats.commentCount
  };
}

function fromAiAnalysis(payload: AiAnalysisResponse["analysis"]): AnalysisJson {
  return {
    structure: {
      hookAnalysis: payload.structure.hook_analysis,
      pacingNotes: payload.structure.pacing_notes,
      ctaReview: payload.structure.cta_review
    },
    thumbnailReview: {
      score: payload.thumbnail_review.score,
      diagnosis: payload.thumbnail_review.diagnosis,
      improvements: payload.thumbnail_review.improvements
    },
    commentsInsights: {
      sentiment: payload.comments_insights.sentiment,
      audiencePersona: payload.comments_insights.audience_persona,
      motivations: payload.comments_insights.motivations,
      concerns: payload.comments_insights.concerns
    }
  };
}

function fromAiBenchmarks(payload: AiBenchmarksResponse["benchmarks"]): BenchmarksJson {
  return {
    topMatches: payload.top_matches.map((item) => ({
      id: item.id,
      title: item.title,
      sourceUrl: item.source_url,
      similarity: item.similarity,
      sharedPoints: item.shared_points,
      differences: item.differences,
      copy: item.copy,
      avoid: item.avoid
    }))
  };
}

function fromAiScore(payload: AiScoreResponse["score"]): ScoreJson {
  return {
    total: payload.total,
    breakdown: {
      title: payload.breakdown.title,
      thumbnail: payload.breakdown.thumbnail,
      hook: payload.breakdown.hook,
      pacing: payload.breakdown.pacing,
      valueDensity: payload.breakdown.value_density,
      emotionResonance: payload.breakdown.emotion_resonance
    },
    topActions: payload.top_actions
  };
}

async function postJson<TResponse>(path: string, payload: unknown): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);

  try {
    const response = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`AI_SERVICE_${response.status}`);
    }

    return (await response.json()) as TResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function runAnalysis(video: YoutubeVideo): Promise<AnalysisJson> {
  try {
    const res = await postJson<AiAnalysisResponse>("/ai/analyze", {
      metadata: {
        video_id: video.videoId,
        title: video.title,
        description: video.description,
        channel_name: video.channelName,
        published_at: video.publishedAt,
        duration_sec: video.durationSec,
        stats: toAiStats(video.stats)
      },
      comments: video.topComments,
      thumbnail_url: video.thumbnailUrl
    });

    return fromAiAnalysis(res.analysis);
  } catch {
    return generateLocalAnalysis(video);
  }
}

export async function runBenchmarks(
  video: YoutubeVideo,
  structureSummary: string,
  libraryItems: ViralLibraryItem[]
): Promise<BenchmarksJson> {
  try {
    const res = await postJson<AiBenchmarksResponse>("/ai/rag/compare", {
      video_id: video.videoId,
      structure_summary: structureSummary,
      topic_hint: video.title,
      top_k: 3
    });

    return fromAiBenchmarks(res.benchmarks);
  } catch {
    return generateLocalBenchmarks(video, libraryItems);
  }
}

export async function runScoring(
  video: YoutubeVideo,
  analysis: AnalysisJson,
  benchmarks: BenchmarksJson
): Promise<ScoreJson> {
  try {
    const res = await postJson<AiScoreResponse>("/ai/score", {
      metadata: {
        video_id: video.videoId,
        title: video.title,
        description: video.description,
        channel_name: video.channelName,
        published_at: video.publishedAt,
        duration_sec: video.durationSec,
        stats: toAiStats(video.stats)
      },
      analysis: {
        structure: {
          hook_analysis: analysis.structure.hookAnalysis,
          pacing_notes: analysis.structure.pacingNotes,
          cta_review: analysis.structure.ctaReview
        },
        thumbnail_review: {
          score: analysis.thumbnailReview.score,
          diagnosis: analysis.thumbnailReview.diagnosis,
          improvements: analysis.thumbnailReview.improvements
        },
        comments_insights: {
          sentiment: analysis.commentsInsights.sentiment,
          audience_persona: analysis.commentsInsights.audiencePersona,
          motivations: analysis.commentsInsights.motivations,
          concerns: analysis.commentsInsights.concerns
        }
      },
      benchmarks: {
        top_matches: benchmarks.topMatches.map((item) => ({
          id: item.id,
          title: item.title,
          source_url: item.sourceUrl,
          similarity: item.similarity,
          shared_points: item.sharedPoints,
          differences: item.differences,
          copy: item.copy,
          avoid: item.avoid
        }))
      }
    });

    return fromAiScore(res.score);
  } catch {
    return generateLocalScore(video, analysis);
  }
}
