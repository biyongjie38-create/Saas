import type { ViralLibraryItem, YoutubeVideo } from "@/lib/types";

export const demoVideos: Record<string, Omit<YoutubeVideo, "id" | "fetchedAt">> = {
  dQw4w9WgXcQ: {
    videoId: "dQw4w9WgXcQ",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "How We Reframed a Dead Product into a 10M View Comeback",
    description: "Case study + storytelling about product relaunch strategy.",
    channelId: "channel-growth-lab",
    channelName: "Growth Lab",
    publishedAt: "2025-08-14T12:00:00Z",
    durationSec: 612,
    stats: {
      viewCount: 10323458,
      likeCount: 381200,
      commentCount: 12450
    },
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    topComments: [
      "The first 15 seconds created strong curiosity.",
      "The case breakdown is practical and reusable.",
      "Before/after contrast in the thumbnail is effective."
    ],
    dataSource: "mock_demo"
  },
  M7lc1UVfVEU: {
    videoId: "M7lc1UVfVEU",
    url: "https://www.youtube.com/watch?v=M7lc1UVfVEU",
    title: "30 Days YouTube Script System (No Burnout)",
    description: "Workflow template for writing better hooks and CTA.",
    channelId: "creator-os",
    channelName: "Creator OS",
    publishedAt: "2025-10-02T08:30:00Z",
    durationSec: 508,
    stats: {
      viewCount: 2845011,
      likeCount: 121430,
      commentCount: 3551
    },
    thumbnailUrl: "https://i.ytimg.com/vi/M7lc1UVfVEU/maxresdefault.jpg",
    topComments: [
      "Template can be copied directly.",
      "Would love more real examples.",
      "Pacing markers are very useful."
    ],
    dataSource: "mock_demo"
  },
  "E7wJTI-1dvQ": {
    videoId: "E7wJTI-1dvQ",
    url: "https://www.youtube.com/watch?v=E7wJTI-1dvQ",
    title: "We Rebuilt Our Thumbnail Strategy from Scratch",
    description: "Thumbnail teardown and CTR increase playbook.",
    channelId: "thumb-labs",
    channelName: "Thumbnail Labs",
    publishedAt: "2025-12-11T15:10:00Z",
    durationSec: 421,
    stats: {
      viewCount: 1265002,
      likeCount: 59210,
      commentCount: 2160
    },
    thumbnailUrl: "https://i.ytimg.com/vi/E7wJTI-1dvQ/maxresdefault.jpg",
    topComments: [
      "Great explanation of thumbnail principles.",
      "Please add more AB test examples.",
      "The second comparison was very convincing."
    ],
    dataSource: "mock_demo"
  }
};

export const fallbackLibrary: ViralLibraryItem[] = [
  {
    id: "lib-1",
    title: "The 5-Second Hook Formula for Tutorials",
    sourceUrl: "https://youtube.com/watch?v=hook001",
    summary:
      "Open with outcome, then show risk of failure, then promise the roadmap. Works well for tutorial content.",
    tags: {
      hookType: "result-first",
      topic: "education",
      durationBucket: "5-10m"
    },
    createdAt: "2025-09-01T08:00:00Z"
  },
  {
    id: "lib-2",
    title: "Before/After Story Arc for Product Videos",
    sourceUrl: "https://youtube.com/watch?v=arc002",
    summary:
      "Before/after storytelling increases contrast with 3 turning points. Good for product transformation videos.",
    tags: {
      hookType: "contrast",
      topic: "productivity",
      durationBucket: "8-15m"
    },
    createdAt: "2025-09-09T09:00:00Z"
  },
  {
    id: "lib-3",
    title: "Emotional Tension + Fast Cuts for Vlog Growth",
    sourceUrl: "https://youtube.com/watch?v=vlog003",
    summary:
      "Fast cuts and emotional spikes improve immersion. Place CTA 20 seconds after emotional peak.",
    tags: {
      hookType: "emotion-spike",
      topic: "vlog",
      durationBucket: "10-20m"
    },
    createdAt: "2025-10-16T10:00:00Z"
  }
];
