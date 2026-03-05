export type VideoStats = {
  viewCount: number;
  likeCount: number;
  commentCount: number;
};

export type VideoDataSource = "youtube_api" | "mock_demo" | "mock_synthetic";

export type YoutubeVideo = {
  id: string;
  videoId: string;
  url: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  publishedAt: string;
  durationSec: number;
  stats: VideoStats;
  thumbnailUrl: string;
  topComments: string[];
  dataSource: VideoDataSource;
  fetchedAt: string;
};

export type StructureAnalysis = {
  hookAnalysis: string;
  pacingNotes: string[];
  ctaReview: string;
};

export type ThumbnailReview = {
  score: number;
  diagnosis: string;
  improvements: string[];
};

export type CommentsInsight = {
  sentiment: "positive" | "neutral" | "mixed" | "negative";
  audiencePersona: string;
  motivations: string[];
  concerns: string[];
};

export type AnalysisJson = {
  structure: StructureAnalysis;
  thumbnailReview: ThumbnailReview;
  commentsInsights: CommentsInsight;
};

export type BenchmarkItem = {
  id: string;
  title: string;
  sourceUrl: string;
  similarity: number;
  sharedPoints: string[];
  differences: string[];
  copy: string[];
  avoid: string[];
};

export type BenchmarksJson = {
  topMatches: BenchmarkItem[];
};

export type ScoreBreakdown = {
  title: number;
  thumbnail: number;
  hook: number;
  pacing: number;
  valueDensity: number;
  emotionResonance: number;
};

export type ScoreJson = {
  total: number;
  breakdown: ScoreBreakdown;
  topActions: string[];
};

export type ModelTrace = {
  analysisModel: string;
  benchmarkModel: string;
  scoreModel: string;
  totalLatencyMs: number;
  retries: number;
};

export type ReportStatus = "queued" | "running" | "done" | "failed";

export type Report = {
  id: string;
  userId: string;
  videoId: string;
  status: ReportStatus;
  analysisJson: AnalysisJson | null;
  benchmarksJson: BenchmarksJson | null;
  scoreJson: ScoreJson | null;
  scoreTotal: number | null;
  modelTrace: ModelTrace | null;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type UsageLog = {
  id: string;
  userId: string;
  action: string;
  costTokens: number;
  costUsd: number | null;
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  plan: "free" | "pro";
};

export type ViralLibraryItem = {
  id: string;
  title: string;
  sourceUrl: string;
  summary: string;
  tags: {
    hookType: string;
    topic: string;
    durationBucket: string;
  };
  createdAt: string;
};

export type MockDb = {
  users: User[];
  videos: YoutubeVideo[];
  reports: Report[];
  usageLogs: UsageLog[];
  library: ViralLibraryItem[];
};

export type AnalyzePayload = {
  url: string;
  userId?: string;
  stream?: boolean;
};
