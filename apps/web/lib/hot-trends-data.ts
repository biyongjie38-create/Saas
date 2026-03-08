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
      },
      {
        id: "trend-video-7",
        videoId: "e-ORhEE9VVg",
        url: "https://www.youtube.com/watch?v=e-ORhEE9VVg",
        title: "I cloned three winning thumbnails and doubled CTR in a week",
        channel: "Thumbnail Sprint",
        channelId: "thumbnail-sprint",
        publishedAt: new Date(now - 7 * 3600 * 1000).toISOString(),
        views: 2_700_000,
        keyword: "thumbnail ctr",
        hook: "Show the CTR delta before opening Photoshop.",
        type: "short",
        thumbnailUrl: "https://i.ytimg.com/vi/e-ORhEE9VVg/hqdefault.jpg"
      },
      {
        id: "trend-video-8",
        videoId: "M7lc1UVf-VE",
        url: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
        title: "This prompt stack writes faceless shorts scripts in 9 minutes",
        channel: "Script Engine",
        channelId: "script-engine",
        publishedAt: new Date(now - 10 * 3600 * 1000).toISOString(),
        views: 1_480_000,
        keyword: "faceless scripts",
        hook: "Start with finished script output, then reverse engineer the prompts.",
        type: "short",
        thumbnailUrl: "https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg"
      },
      {
        id: "trend-video-9",
        videoId: "9bZkp7q19f0",
        url: "https://www.youtube.com/watch?v=9bZkp7q19f0",
        title: "How I rebuilt my comments section into a conversion funnel",
        channel: "Audience Loop",
        channelId: "audience-loop",
        publishedAt: new Date(now - 15 * 3600 * 1000).toISOString(),
        views: 934_000,
        keyword: "comment funnel",
        hook: "Lead with conversion uplift before showing the pinned comment structure.",
        type: "long",
        thumbnailUrl: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg"
      },
      {
        id: "trend-video-10",
        videoId: "Zi_XLOBDo_Y",
        url: "https://www.youtube.com/watch?v=Zi_XLOBDo_Y",
        title: "The B-roll pacing trick that makes tutorial videos feel expensive",
        channel: "Editing Deck",
        channelId: "editing-deck",
        publishedAt: new Date(now - 18 * 3600 * 1000).toISOString(),
        views: 1_060_000,
        keyword: "b-roll pacing",
        hook: "Open with the side-by-side pacing comparison, not the timeline.",
        type: "long",
        thumbnailUrl: "https://i.ytimg.com/vi/Zi_XLOBDo_Y/hqdefault.jpg"
      },
      {
        id: "trend-video-11",
        videoId: "L_jWHffIx5E",
        url: "https://www.youtube.com/watch?v=L_jWHffIx5E",
        title: "This boring finance format is suddenly printing millions of views",
        channel: "Niche Radar",
        channelId: "niche-radar",
        publishedAt: new Date(now - 23 * 3600 * 1000).toISOString(),
        views: 4_200_000,
        keyword: "finance format",
        hook: "Start with the surprising niche reveal before any charts.",
        type: "short",
        thumbnailUrl: "https://i.ytimg.com/vi/L_jWHffIx5E/hqdefault.jpg"
      },
      {
        id: "trend-video-12",
        videoId: "60ItHLz5WEA",
        url: "https://www.youtube.com/watch?v=60ItHLz5WEA",
        title: "I turned one benchmark report into 14 new content angles",
        channel: "Benchmark Lab",
        channelId: "benchmark-lab",
        publishedAt: new Date(now - 27 * 3600 * 1000).toISOString(),
        views: 736_000,
        keyword: "benchmark workflow",
        hook: "Promise 14 angles up front, then reveal the report framework.",
        type: "long",
        thumbnailUrl: "https://i.ytimg.com/vi/60ItHLz5WEA/hqdefault.jpg"
      },
      {
        id: "trend-video-13",
        videoId: "RgKAFK5djSk",
        url: "https://www.youtube.com/watch?v=RgKAFK5djSk",
        title: "The shorts hook framework SaaS founders keep copying right now",
        channel: "Growth Sprint",
        channelId: "growth-sprint",
        publishedAt: new Date(now - 41 * 3600 * 1000).toISOString(),
        views: 2_240_000,
        keyword: "shorts hook",
        hook: "Open with the copied pattern before naming the framework.",
        type: "short",
        thumbnailUrl: "https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg"
      },
      {
        id: "trend-video-14",
        videoId: "CevxZvSJLk8",
        url: "https://www.youtube.com/watch?v=CevxZvSJLk8",
        title: "What fast-growing channels do in the first 30 seconds that you do not",
        channel: "Creator Lab",
        channelId: "creator-lab",
        publishedAt: new Date(now - 52 * 3600 * 1000).toISOString(),
        views: 1_560_000,
        keyword: "first 30 seconds",
        hook: "Use a direct comparison opener instead of a generic lesson frame.",
        type: "long",
        thumbnailUrl: "https://i.ytimg.com/vi/CevxZvSJLk8/hqdefault.jpg"
      },
      {
        id: "trend-video-15",
        videoId: "hT_nvWreIhg",
        url: "https://www.youtube.com/watch?v=hT_nvWreIhg",
        title: "I tested 20 faceless intros and only 3 survived the retention graph",
        channel: "Silent Scale",
        channelId: "silent-scale",
        publishedAt: new Date(now - 61 * 3600 * 1000).toISOString(),
        views: 3_180_000,
        keyword: "retention graph",
        hook: "Lead with the losing intros first to create contrast.",
        type: "short",
        thumbnailUrl: "https://i.ytimg.com/vi/hT_nvWreIhg/hqdefault.jpg"
      },
      {
        id: "trend-video-16",
        videoId: "kJQP7kiw5Fk",
        url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
        title: "This micro-niche channel crossed 100k subs with one repeatable format",
        channel: "Micro Channel Ops",
        channelId: "micro-channel-ops",
        publishedAt: new Date(now - 79 * 3600 * 1000).toISOString(),
        views: 588_000,
        keyword: "micro niche",
        hook: "Open with the 100k milestone, then show the repeatable content loop.",
        type: "long",
        thumbnailUrl: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg"
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
      },
      {
        id: "trend-channel-4",
        channel: "Growth Sprint",
        channelId: "growth-sprint",
        url: "https://www.youtube.com/@growthsprint",
        niche: "AI creator workflows",
        videos: 173,
        subscribers: 528_000,
        growthScore: 22.3,
        country: "US"
      },
      {
        id: "trend-channel-5",
        channel: "Editing Deck",
        channelId: "editing-deck",
        url: "https://www.youtube.com/@editingdeck",
        niche: "editing systems",
        videos: 97,
        subscribers: 184_000,
        growthScore: 16.7,
        country: "AU"
      },
      {
        id: "trend-channel-6",
        channel: "Thumbnail Sprint",
        channelId: "thumbnail-sprint",
        url: "https://www.youtube.com/@thumbnailsprint",
        niche: "thumbnail optimization",
        videos: 66,
        subscribers: 143_000,
        growthScore: 19.9,
        country: "US"
      },
      {
        id: "trend-channel-7",
        channel: "Benchmark Lab",
        channelId: "benchmark-lab",
        url: "https://www.youtube.com/@benchmarklab",
        niche: "content research",
        videos: 43,
        subscribers: 78_000,
        growthScore: 12.8,
        country: "SG"
      },
      {
        id: "trend-channel-8",
        channel: "Niche Radar",
        channelId: "niche-radar",
        url: "https://www.youtube.com/@nicheradar",
        niche: "format discovery",
        videos: 58,
        subscribers: 119_000,
        growthScore: 17.5,
        country: "DE"
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
      },
      {
        id: "trend-topic-4",
        topic: "Thumbnail CTR rebuilds",
        sampleVideos: 31,
        avgViews: 1_340_000,
        momentumScore: 87,
        summary: "Creators are packaging thumbnail experiments as clear before-and-after wins instead of generic design tips."
      },
      {
        id: "trend-topic-5",
        topic: "Benchmark-driven ideation",
        sampleVideos: 18,
        avgViews: 668_000,
        momentumScore: 74,
        summary: "Reports that turn one winning video into multiple publishable angles are resonating with small teams."
      },
      {
        id: "trend-topic-6",
        topic: "Comment-to-offer funnels",
        sampleVideos: 14,
        avgViews: 592_000,
        momentumScore: 69,
        summary: "More channels are reframing community engagement as a conversion asset rather than just audience proof."
      },
      {
        id: "trend-topic-7",
        topic: "Retention graph teardowns",
        sampleVideos: 22,
        avgViews: 1_020_000,
        momentumScore: 83,
        summary: "Videos that reveal what failed before showing the winning intro format are outperforming generic editing lessons."
      }
    ]
  };
}
