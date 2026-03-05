import type { YoutubeVideo } from "@/lib/types";

export type RoutedModels = {
  analysisModel: string;
  benchmarkModel: string;
  scoreModel: string;
};

export function routeModels(video: YoutubeVideo): RoutedModels {
  const analysisModel = "gpt-4o-mini";
  const benchmarkModel = "gpt-4o";
  const scoreModel = video.durationSec > 600 || video.stats.viewCount > 3000000 ? "gpt-4o" : "gpt-4o-mini";

  return {
    analysisModel,
    benchmarkModel,
    scoreModel
  };
}
