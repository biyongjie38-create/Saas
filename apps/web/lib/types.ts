export type VideoStats = {
  viewCount: number;
  likeCount: number;
  commentCount: number;
};

export type VideoDataSource = "youtube_api" | "mock_demo" | "mock_synthetic";
export type UserPlan = "free" | "pro";
export type BillingCycle = "monthly" | "yearly";
export type SubscriptionStatus = "none" | "active" | "canceled";
export type MembershipOrderStatus = "pending" | "paid" | "failed" | "canceled";
export type ApiLlmProvider = "openai" | "bailian" | "yunwu" | "custom";

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
  captionsText?: string | null;
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

export type ModelTraceStep = {
  model: string;
  provider: string;
  fallbackUsed: boolean;
  retries: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  providerRequestId?: string | null;
};

export type ModelTrace = {
  analysisModel: string;
  benchmarkModel: string;
  scoreModel: string;
  totalLatencyMs: number;
  retries: number;
  fallbackUsed?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  analysis?: ModelTraceStep;
  benchmark?: ModelTraceStep;
  score?: ModelTraceStep;
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
  shareToken?: string | null;
  shareEnabledAt?: string | null;
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
  plan: UserPlan;
  subscriptionStatus?: SubscriptionStatus;
  billingCycle?: BillingCycle | null;
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
};

export type MembershipOrder = {
  id: string;
  userId: string;
  plan: UserPlan;
  billingCycle: BillingCycle;
  status: MembershipOrderStatus;
  amountCny: number;
  paymentProvider: "demo_checkout" | "stripe_checkout";
  providerSessionId?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerPaymentIntentId?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  paidAt?: string | null;
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
  deletedAt?: string | null;
};

export type CollectedViralItem = {
  id: string;
  videoId: string;
  url: string;
  title: string;
  summary: string;
  channelName: string;
  publishedAt: string;
  stats: VideoStats;
  thumbnailUrl: string;
  tags: ViralLibraryItem["tags"];
  dataSource: VideoDataSource;
};

export type MockDb = {
  users: User[];
  videos: YoutubeVideo[];
  reports: Report[];
  usageLogs: UsageLog[];
  library: ViralLibraryItem[];
  membershipOrders: MembershipOrder[];
};

export type AnalyzePayload = {
  url: string;
  userId?: string;
  stream?: boolean;
};

