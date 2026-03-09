import {
  getFallbackHotTrendsDataset,
  type HotTrendsDataset,
  type TrendChannelRow,
  type TrendTopicRow,
  type TrendVideoRow
} from "@/lib/hot-trends-data";
import { allowPreviewFallbacks } from "@/lib/runtime-mode";

type YoutubeApiVideoItem = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      maxres?: { url?: string };
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  contentDetails?: {
    duration?: string;
  };
  statistics?: {
    viewCount?: string;
  };
};

type YoutubeApiVideoResponse = {
  items?: YoutubeApiVideoItem[];
};

type YoutubeApiChannelItem = {
  id: string;
  snippet?: {
    title?: string;
    country?: string;
  };
  statistics?: {
    subscriberCount?: string;
    videoCount?: string;
  };
};

type YoutubeApiChannelResponse = {
  items?: YoutubeApiChannelItem[];
};

type FetchOptions = {
  apiKeyOverride?: string | null;
  regionCode?: string | null;
  allowServerKeyFallback?: boolean;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "before",
  "being",
  "build",
  "from",
  "have",
  "into",
  "just",
  "make",
  "more",
  "right",
  "that",
  "their",
  "them",
  "they",
  "this",
  "those",
  "through",
  "using",
  "video",
  "videos",
  "what",
  "when",
  "where",
  "with",
  "your"
]);

function toInt(value: string | undefined, fallback = 0) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIsoDurationToSeconds(input: string | undefined): number {
  if (!input) {
    return 0;
  }

  const match = input.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) {
    return 0;
  }

  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const seconds = Number.parseInt(match[3] ?? "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

function pickThumbnail(item: YoutubeApiVideoItem, videoId: string) {
  return (
    item.snippet?.thumbnails?.maxres?.url ??
    item.snippet?.thumbnails?.high?.url ??
    item.snippet?.thumbnails?.medium?.url ??
    item.snippet?.thumbnails?.default?.url ??
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`YOUTUBE_HTTP_${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeKeyword(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleToTokens(input: string) {
  return normalizeKeyword(input)
    .split(" ")
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function toTitleCase(input: string) {
  return input.replace(/\b\w/g, (value) => value.toUpperCase());
}

function extractBestKeyword(title: string) {
  const tokens = titleToTokens(title);
  if (tokens.length === 0) {
    return "creator ideas";
  }

  if (tokens.length >= 2) {
    return `${tokens[0]} ${tokens[1]}`;
  }

  return tokens[0];
}

function buildHook(title: string) {
  const normalized = title.trim();
  if (!normalized) {
    return "Lead with the clearest payoff in the opening seconds.";
  }

  const words = normalized.split(/\s+/).slice(0, 7).join(" ");
  return `Lead with "${words}" before explaining the setup.`;
}

function inferVideoType(durationSec: number): "short" | "long" {
  return durationSec <= 180 ? "short" : "long";
}

function filterRecentVideos(rows: TrendVideoRow[]) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
  return rows.filter((row) => new Date(row.publishedAt).getTime() >= sevenDaysAgo);
}

function formatTopicSummary(topic: string, sampleVideos: number, avgViews: number) {
  const average = avgViews.toLocaleString("en-US");
  return `${toTitleCase(topic)} is showing up in ${sampleVideos} recent breakout videos, averaging ${average} views with clear payoff-led hooks.`;
}

function buildTopicRows(videos: TrendVideoRow[]): TrendTopicRow[] {
  const topicMap = new Map<
    string,
    {
      topic: string;
      sampleVideos: number;
      totalViews: number;
      freshnessScore: number;
    }
  >();

  for (const video of videos) {
    const topic = extractBestKeyword(video.title);
    const ageHours = Math.max(1, (Date.now() - new Date(video.publishedAt).getTime()) / 3600_000);
    const bucket = topicMap.get(topic) ?? {
      topic,
      sampleVideos: 0,
      totalViews: 0,
      freshnessScore: 0
    };

    bucket.sampleVideos += 1;
    bucket.totalViews += video.views;
    bucket.freshnessScore += Math.max(0, 72 - ageHours);
    topicMap.set(topic, bucket);
  }

  return Array.from(topicMap.values())
    .map((item) => {
      const avgViews = Math.round(item.totalViews / Math.max(1, item.sampleVideos));
      const momentumScore = Math.min(99, Math.round(item.sampleVideos * 12 + avgViews / 250_000 + item.freshnessScore / 12));

      return {
        id: `topic-${item.topic.replace(/\s+/g, "-")}`,
        topic: toTitleCase(item.topic),
        sampleVideos: item.sampleVideos,
        avgViews,
        momentumScore,
        summary: formatTopicSummary(item.topic, item.sampleVideos, avgViews)
      };
    })
    .sort((left, right) => right.momentumScore - left.momentumScore)
    .slice(0, 10);
}

function buildChannelRows(
  videos: TrendVideoRow[],
  details: Map<string, YoutubeApiChannelItem>,
  regionCode: string
): TrendChannelRow[] {
  const channelMap = new Map<
    string,
    {
      channelId: string;
      channel: string;
      videos: number;
      totalViews: number;
      latestPublishedAt: string;
      keywords: string[];
    }
  >();

  for (const video of videos) {
    const current = channelMap.get(video.channelId) ?? {
      channelId: video.channelId,
      channel: video.channel,
      videos: 0,
      totalViews: 0,
      latestPublishedAt: video.publishedAt,
      keywords: []
    };

    current.videos += 1;
    current.totalViews += video.views;
    current.latestPublishedAt =
      new Date(video.publishedAt).getTime() > new Date(current.latestPublishedAt).getTime()
        ? video.publishedAt
        : current.latestPublishedAt;
    current.keywords.push(extractBestKeyword(video.title));
    channelMap.set(video.channelId, current);
  }

  return Array.from(channelMap.values())
    .map((entry) => {
      const detail = details.get(entry.channelId);
      const subscribers = Math.max(0, toInt(detail?.statistics?.subscriberCount));
      const totalVideos = Math.max(entry.videos, toInt(detail?.statistics?.videoCount, entry.videos));
      const averageViews = entry.totalViews / Math.max(1, entry.videos);
      const ageHours = Math.max(1, (Date.now() - new Date(entry.latestPublishedAt).getTime()) / 3600_000);
      const freshnessBonus = Math.max(0, 96 - ageHours) / 8;
      const growthScore = Math.min(99, Number(((averageViews / Math.max(50_000, subscribers || 50_000)) * 100 + freshnessBonus).toFixed(1)));
      const niche = toTitleCase(
        entry.keywords
          .sort(
            (left, right) =>
              entry.keywords.filter((value) => value === right).length -
              entry.keywords.filter((value) => value === left).length
          )[0] ?? "Creator momentum"
      );

      return {
        id: `channel-${entry.channelId}`,
        channel: detail?.snippet?.title ?? entry.channel,
        channelId: entry.channelId,
        url: `https://www.youtube.com/channel/${entry.channelId}`,
        niche,
        videos: totalVideos,
        subscribers,
        growthScore,
        country: detail?.snippet?.country ?? regionCode
      };
    })
    .sort((left, right) => right.growthScore - left.growthScore)
    .slice(0, 12);
}

async function fetchMostPopularVideos(apiKey: string, regionCode: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails,statistics");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", regionCode);
  url.searchParams.set("maxResults", "50");
  url.searchParams.set("key", apiKey);

  const payload = await fetchJson<YoutubeApiVideoResponse>(url.toString());
  return payload.items ?? [];
}

async function fetchChannelDetails(apiKey: string, channelIds: string[]) {
  if (channelIds.length === 0) {
    return new Map<string, YoutubeApiChannelItem>();
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("id", channelIds.slice(0, 50).join(","));
  url.searchParams.set("key", apiKey);

  const payload = await fetchJson<YoutubeApiChannelResponse>(url.toString());
  return new Map((payload.items ?? []).map((item) => [item.id, item]));
}

function buildVideoRows(items: YoutubeApiVideoItem[]): TrendVideoRow[] {
  return items
    .map((item) => {
      const videoId = item.id;
      const durationSec = parseIsoDurationToSeconds(item.contentDetails?.duration);
      const publishedAt = item.snippet?.publishedAt ?? new Date().toISOString();
      const title = item.snippet?.title ?? `Popular video ${videoId}`;

      return {
        id: `video-${videoId}`,
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title,
        channel: item.snippet?.channelTitle ?? "Unknown channel",
        channelId: item.snippet?.channelId ?? videoId,
        publishedAt,
        views: toInt(item.statistics?.viewCount),
        keyword: extractBestKeyword(title),
        hook: buildHook(title),
        type: inferVideoType(durationSec),
        thumbnailUrl: pickThumbnail(item, videoId)
      };
    })
    .sort((left, right) => right.views - left.views);
}

export async function fetchHotTrendsDataset(options?: FetchOptions): Promise<HotTrendsDataset> {
  const apiKeyOverride = (options?.apiKeyOverride || "").trim();
  const apiKey = apiKeyOverride;
  const regionCode = (options?.regionCode ?? "US").trim().toUpperCase() || "US";

  if (!apiKey) {
    if (!allowPreviewFallbacks()) {
      throw new Error("YOUTUBE_KEY_MISSING");
    }
    return getFallbackHotTrendsDataset();
  }

  try {
    const rawVideos = await fetchMostPopularVideos(apiKey, regionCode);
    const videos = filterRecentVideos(buildVideoRows(rawVideos));

    if (videos.length === 0) {
      if (!allowPreviewFallbacks()) {
        throw new Error("YOUTUBE_TRENDS_EMPTY");
      }
      return {
        ...getFallbackHotTrendsDataset(),
        message: "Live YouTube results returned no recent trend candidates, so the preview dataset is shown instead."
      };
    }

    const channelIds = Array.from(new Set(videos.map((video) => video.channelId)));
    const channelDetails = await fetchChannelDetails(apiKey, channelIds);
    const channels = buildChannelRows(videos, channelDetails, regionCode);
    const topics = buildTopicRows(videos);

      return {
        source: "live",
        updatedAt: new Date().toISOString(),
        videos: videos.slice(0, 36),
        channels,
        topics,
      message: "Live trend data was loaded from the YouTube Data API."
    };
  } catch (error) {
    if (!allowPreviewFallbacks()) {
      throw error instanceof Error ? error : new Error("YOUTUBE_TRENDS_FAILED");
    }
    const fallback = getFallbackHotTrendsDataset();
    return {
      ...fallback,
      message: error instanceof Error ? error.message : fallback.message
    };
  }
}
