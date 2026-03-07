export type TrendVideoRow = {
  id: string;
  title: string;
  channel: string;
  publishedAt: string;
  views: string;
  keyword: string;
  hook: string;
  type: "short" | "long";
  window: "24h" | "48h" | "7d";
};

export type TrendChannelRow = {
  id: string;
  channel: string;
  niche: string;
  videos: number;
  subscribers: string;
  growth: string;
  country: string;
};

export type TrendTopicRow = {
  id: string;
  topic: string;
  sampleVideos: number;
  avgViews: string;
  momentum: string;
  summary: string;
};

export const HOT_TREND_VIDEOS: TrendVideoRow[] = [
  {
    id: "trend-video-1",
    title: "She turned a $5 thrift flip into a studio-worthy setup",
    channel: "Creator Lab",
    publishedAt: "2 hours ago",
    views: "3.8M",
    keyword: "thriftflip",
    hook: "Start with the final reveal in under 2 seconds.",
    type: "short",
    window: "24h"
  },
  {
    id: "trend-video-2",
    title: "The one ChatGPT workflow that cut my editing time in half",
    channel: "Growth Sprint",
    publishedAt: "5 hours ago",
    views: "1.9M",
    keyword: "chatgptworkflow",
    hook: "Lead with time saved instead of setup process.",
    type: "short",
    window: "24h"
  },
  {
    id: "trend-video-3",
    title: "I rebuilt my landing page after stealing 7 patterns from winners",
    channel: "Launch Notes",
    publishedAt: "12 hours ago",
    views: "812K",
    keyword: "landingpageaudit",
    hook: "Frame the teardown as a scorecard against competitors.",
    type: "long",
    window: "24h"
  },
  {
    id: "trend-video-4",
    title: "This faceless shorts niche quietly prints 6-figure ad revenue",
    channel: "Silent Scale",
    publishedAt: "1 day ago",
    views: "5.4M",
    keyword: "facelessshorts",
    hook: "Use revenue claim + niche reveal as the opening contrast.",
    type: "short",
    window: "48h"
  },
  {
    id: "trend-video-5",
    title: "7 retention edits I stole from the fastest-growing education channels",
    channel: "Editing Deck",
    publishedAt: "1 day ago",
    views: "1.2M",
    keyword: "retentionediting",
    hook: "Open with the largest retention lift before the tutorial.",
    type: "long",
    window: "48h"
  },
  {
    id: "trend-video-6",
    title: "The AI voiceover format brands keep buying right now",
    channel: "Voice Commerce",
    publishedAt: "3 days ago",
    views: "684K",
    keyword: "aivoiceover",
    hook: "Promise deal volume before showing the workflow stack.",
    type: "short",
    window: "7d"
  }
];

export const HOT_TREND_CHANNELS: TrendChannelRow[] = [
  {
    id: "trend-channel-1",
    channel: "Creator Lab",
    niche: "creator economy",
    videos: 124,
    subscribers: "412K",
    growth: "+18.4% / 7d",
    country: "US"
  },
  {
    id: "trend-channel-2",
    channel: "Silent Scale",
    niche: "faceless automation",
    videos: 88,
    subscribers: "265K",
    growth: "+14.8% / 7d",
    country: "CA"
  },
  {
    id: "trend-channel-3",
    channel: "Launch Notes",
    niche: "landing pages",
    videos: 51,
    subscribers: "97K",
    growth: "+11.1% / 7d",
    country: "GB"
  },
  {
    id: "trend-channel-4",
    channel: "Voice Commerce",
    niche: "AI ads",
    videos: 72,
    subscribers: "180K",
    growth: "+9.7% / 7d",
    country: "AU"
  }
];

export const HOT_TREND_TOPICS: TrendTopicRow[] = [
  {
    id: "trend-topic-1",
    topic: "Faceless creator workflows",
    sampleVideos: 42,
    avgViews: "1.6M",
    momentum: "Very high",
    summary: "Short, proof-driven videos that position AI systems as labor savings are accelerating fastest."
  },
  {
    id: "trend-topic-2",
    topic: "Landing page teardown frameworks",
    sampleVideos: 19,
    avgViews: "742K",
    momentum: "High",
    summary: "Audits with before/after screenshots and ranking scorecards are outperforming generic design advice."
  },
  {
    id: "trend-topic-3",
    topic: "AI editing stacks for small teams",
    sampleVideos: 25,
    avgViews: "1.1M",
    momentum: "High",
    summary: "The winning format shows time savings first, then reveals the exact tool chain and cost breakdown."
  }
];
