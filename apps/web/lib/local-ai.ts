import type {
  AnalysisJson,
  BenchmarksJson,
  ScoreBreakdown,
  ScoreJson,
  VideoStats,
  ViralLibraryItem,
  YoutubeVideo
} from "@/lib/types";

function calculateVelocity(stats: VideoStats): number {
  const interaction = stats.likeCount + stats.commentCount * 5;
  return Math.min(100, Math.round((interaction / Math.max(1, stats.viewCount)) * 4000));
}

export function generateLocalAnalysis(video: YoutubeVideo): AnalysisJson {
  const titleLength = video.title.length;
  return {
    structure: {
      hookAnalysis:
        titleLength > 52
          ? "Title has high information density. Move the outcome promise earlier and reduce extra wording."
          : "Title length is healthy and the value promise is clear for first-screen attention.",
      pacingNotes: [
        "Show the final outcome within 0-15 seconds before background context.",
        "Add one contrastive case around 35% runtime to improve retention.",
        "Tie CTA to the next specific video topic instead of generic subscription ask."
      ],
      ctaReview: "CTA is actionable but should include one concrete next action and expected payoff."
    },
    thumbnailReview: {
      score: video.stats.viewCount > 1000000 ? 82 : 71,
      diagnosis: "Main subject is clear, but contrast hierarchy and text layering can be improved.",
      improvements: [
        "Keep overlay text under 4 words and start with action verbs.",
        "Increase brightness contrast between face/object and background.",
        "Use before/after visual contrast to increase click intent."
      ]
    },
    commentsInsights: {
      sentiment: "mixed",
      audiencePersona: "Growth-focused creators looking for reusable scripts and repeatable workflows.",
      motivations: [
        "Reuse proven script patterns",
        "Increase thumbnail CTR",
        "Reduce creative trial-and-error"
      ],
      concerns: ["Not enough cases", "Need more measurable advanced detail"]
    }
  };
}

function scoreByStats(stats: VideoStats): number {
  const interactionRate = (stats.likeCount + stats.commentCount * 4) / Math.max(1, stats.viewCount);
  return Math.min(100, Math.max(38, Math.round(interactionRate * 2000)));
}

export function generateLocalBenchmarks(
  video: YoutubeVideo,
  library: ViralLibraryItem[]
): BenchmarksJson {
  const matches = library.slice(0, 3).map((item, index) => ({
    id: item.id,
    title: item.title,
    sourceUrl: item.sourceUrl,
    similarity: Math.max(62, 87 - index * 8),
    sharedPoints: [
      "Both use outcome-first narrative style",
      "Both include method breakdown in the middle section"
    ],
    differences: [
      `${item.title} pushes conflict harder while current video keeps a calmer teaching rhythm.`
    ],
    copy: [
      "Add quantified outcome statement in the first 8 seconds",
      "Use a before/after segment as the second block"
    ],
    avoid: ["Do not overload background in first 30 seconds", "Do not place CTA too late"]
  }));

  if (!matches.length) {
    return { topMatches: [] };
  }

  return { topMatches: matches };
}

export function generateLocalScore(video: YoutubeVideo, analysis: AnalysisJson): ScoreJson {
  const velocity = calculateVelocity(video.stats);
  const statsBase = scoreByStats(video.stats);

  const breakdown: ScoreBreakdown = {
    title: Math.min(95, 55 + Math.round(video.title.length / 2)),
    thumbnail: analysis.thumbnailReview.score,
    hook: Math.min(96, 58 + Math.round(velocity / 2)),
    pacing: 70,
    valueDensity: Math.min(94, 64 + Math.round(statsBase / 4)),
    emotionResonance: 68
  };

  const total = Math.round(
    breakdown.title * 0.16 +
      breakdown.thumbnail * 0.18 +
      breakdown.hook * 0.2 +
      breakdown.pacing * 0.14 +
      breakdown.valueDensity * 0.18 +
      breakdown.emotionResonance * 0.14
  );

  return {
    total,
    breakdown,
    topActions: [
      "Show final outcome footage in first 10 seconds.",
      "Reduce thumbnail words to 3-4 and highlight conflict keyword.",
      "Insert one failure case around 40% timeline to boost value density.",
      "Rewrite CTA with clear promise for the next video."
    ]
  };
}
