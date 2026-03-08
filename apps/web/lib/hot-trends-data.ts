export type TrendVideoRow = {
  id: string;
  videoId: string;
  url: string;
  title: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  views: number;
  keyword: string;
  hook: string;
  type: "short" | "long";
  thumbnailUrl: string;
};

export type TrendChannelRow = {
  id: string;
  channel: string;
  channelId: string;
  url: string;
  niche: string;
  videos: number;
  subscribers: number;
  growthScore: number;
  country: string;
};

export type TrendTopicRow = {
  id: string;
  topic: string;
  sampleVideos: number;
  avgViews: number;
  momentumScore: number;
  summary: string;
};

export type HotTrendsDataset = {
  source: "live" | "fallback";
  updatedAt: string;
  videos: TrendVideoRow[];
  channels: TrendChannelRow[];
  topics: TrendTopicRow[];
  message?: string;
};

export function getFallbackHotTrendsDataset(): HotTrendsDataset {
  const now = Date.now();

  return {
    source: "fallback",
    updatedAt: new Date(now).toISOString(),
    message: "Falling back to the built-in preview dataset because no live YouTube key is available.",
    videos: [
      {
        id: "trend-video-1",
        videoId: "dQw4w9WgXcQ",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title: "She turned a $5 thrift flip into a studio-worthy setup",
        channel: "Creator Lab",
        channelId: "creator-lab",
        publishedAt: new Date(now - 2 * 3600 * 1000).toISOString(),
        views: 3_800_000,
        keyword: "thrift flip",
        hook: "Start with the final reveal in under two seconds.",
        type: "short",
        thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
      },
      {
        id: "trend-video-2",
        videoId: "aqz-KE-bpKQ",
        url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
        title: "The one ChatGPT workflow that cut my editing time in half",
        channel: "Growth Sprint",
        channelId: "growth-sprint",
        publishedAt: new Date(now - 5 * 3600 * 1000).toISOString(),
        views: 1_900_000,
        keyword: "chatgpt workflow",
        hook: "Lead with time saved before showing the setup.",
        type: "short",
        thumbnailUrl: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg"
      },
      {
        id: "trend-video-3",
        videoId: "ysz5S6PUM-U",
        url: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
        title: "I rebuilt my landing page after stealing 7 patterns from winners",
        channel: "Launch Notes",
        channelId: "launch-notes",
        publishedAt: new Date(now - 12 * 3600 * 1000).toISOString(),
        views: 812_000,
        keyword: "landing page audit",
        hook: "Frame the teardown as a scorecard against competitors.",
        type: "long",
        thumbnailUrl: "https://i.ytimg.com/vi/ysz5S6PUM-U/hqdefault.jpg"
      },
      {
        id: "trend-video-4",
        videoId: "jNQXAC9IVRw",
        url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
        title: "This faceless shorts niche quietly prints 6-figure ad revenue",
        channel: "Silent Scale",
        channelId: "silent-scale",
        publishedAt: new Date(now - 30 * 3600 * 1000).toISOString(),
        views: 5_400_000,
        keyword: "faceless shorts",
        hook: "Use revenue claim plus niche reveal as the opening contrast.",
        type: "short",
        thumbnailUrl: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg"
      },
      {
        id: "trend-video-5",
        videoId: "ScMzIvxBSi4",
        url: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
        title: "7 retention edits I stole from the fastest-growing education channels",
        channel: "Editing Deck",
        channelId: "editing-deck",
        publishedAt: new Date(now - 36 * 3600 * 1000).toISOString(),
        views: 1_200_000,
        keyword: "retention editing",
        hook: "Open with the biggest retention lift before the tutorial.",
        type: "long",
        thumbnailUrl: "https://i.ytimg.com/vi/ScMzIvxBSi4/hqdefault.jpg"
      },
      {
        id: "trend-video-6",
        videoId: "5qap5aO4i9A",
        url: "https://www.youtube.com/watch?v=5qap5aO4i9A",
        title: "The AI voiceover format brands keep buying right now",
        channel: "Voice Commerce",
        channelId: "voice-commerce",
        publishedAt: new Date(now - 72 * 3600 * 1000).toISOString(),
        views: 684_000,
        keyword: "ai voiceover",
        hook: "Promise deal volume before revealing the workflow stack.",
        type: "short",
        thumbnailUrl: "https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg"
      }
    ],
    channels: [
      {
        id: "trend-channel-1",
        channel: "Creator Lab",
        channelId: "creator-lab",
        url: "https://www.youtube.com/@creatorlab",
        niche: "creator economy",
        videos: 124,
        subscribers: 412_000,
        growthScore: 18.4,
        country: "US"
      },
      {
        id: "trend-channel-2",
        channel: "Silent Scale",
        channelId: "silent-scale",
        url: "https://www.youtube.com/@silentscale",
        niche: "faceless automation",
        videos: 88,
        subscribers: 265_000,
        growthScore: 14.8,
        country: "CA"
      },
      {
        id: "trend-channel-3",
        channel: "Launch Notes",
        channelId: "launch-notes",
        url: "https://www.youtube.com/@launchnotes",
        niche: "landing pages",
        videos: 51,
        subscribers: 97_000,
        growthScore: 11.1,
        country: "GB"
      }
    ],
    topics: [
      {
        id: "trend-topic-1",
        topic: "Faceless creator workflows",
        sampleVideos: 42,
        avgViews: 1_600_000,
        momentumScore: 92,
        summary: "Short, proof-driven videos that position AI systems as labor savings are accelerating fastest."
      },
      {
        id: "trend-topic-2",
        topic: "Landing page teardown frameworks",
        sampleVideos: 19,
        avgViews: 742_000,
        momentumScore: 78,
        summary: "Audits with before/after screenshots and ranking scorecards are outperforming generic design advice."
      },
      {
        id: "trend-topic-3",
        topic: "AI editing stacks for small teams",
        sampleVideos: 25,
        avgViews: 1_100_000,
        momentumScore: 81,
        summary: "The winning format shows time savings first, then reveals the exact tool chain and cost breakdown."
      }
    ]
  };
}
