import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { demoVideos } from "@/lib/mock-data";
import { readDb, writeDb } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { useSupabaseBackend } from "@/lib/supabase";
import type { CollectedViralItem, VideoDataSource, YoutubeVideo } from "@/lib/types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type FetchMode = "auto" | "live" | "mock";

type QueryOptions = {
  supabaseClient?: SupabaseClient | null;
  apiKeyOverride?: string | null;
};

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
    likeCount?: string;
    commentCount?: string;
  };
};

type YoutubeApiVideoResponse = {
  items?: YoutubeApiVideoItem[];
};

type YoutubeApiCommentsResponse = {
  items?: Array<{
    snippet?: {
      topLevelComment?: {
        snippet?: {
          textOriginal?: string;
          textDisplay?: string;
        };
      };
    };
  }>;
};

function normalizeDataSource(value: unknown): VideoDataSource {
  if (value === "youtube_api" || value === "mock_demo" || value === "mock_synthetic") {
    return value;
  }
  return "youtube_api";
}

function toVideoFromRow(row: Record<string, unknown>): YoutubeVideo {
  const stats = (row.stats ?? {}) as Record<string, unknown>;
  const topComments = Array.isArray(row.top_comments)
    ? row.top_comments.map((item) => String(item))
    : [];

  return {
    id: String(row.id),
    videoId: String(row.video_id),
    url: String(row.url ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    channelId: String(row.channel_id ?? ""),
    channelName: String(row.channel_name ?? ""),
    publishedAt: String(row.published_at ?? new Date().toISOString()),
    durationSec: Number(row.duration_sec ?? 0),
    stats: {
      viewCount: Number(stats.viewCount ?? 0),
      likeCount: Number(stats.likeCount ?? 0),
      commentCount: Number(stats.commentCount ?? 0)
    },
    thumbnailUrl: String(row.thumbnail_url ?? ""),
    topComments,
    dataSource: normalizeDataSource(row.data_source),
    fetchedAt: String(row.fetched_at ?? new Date().toISOString())
  };
}

function toVideoRow(video: YoutubeVideo, includeDataSource = true): Record<string, unknown> {
  const row: Record<string, unknown> = {
    video_id: video.videoId,
    url: video.url,
    title: video.title,
    description: video.description,
    channel_id: video.channelId,
    channel_name: video.channelName,
    published_at: video.publishedAt,
    duration_sec: video.durationSec,
    stats: video.stats,
    thumbnail_url: video.thumbnailUrl,
    top_comments: video.topComments,
    fetched_at: video.fetchedAt
  };

  if (includeDataSource) {
    row.data_source = video.dataSource;
  }

  return row;
}

async function getSupabaseUserClient(options?: QueryOptions): Promise<SupabaseClient | null> {
  if (!useSupabaseBackend()) {
    return null;
  }

  if (options?.supabaseClient) {
    return options.supabaseClient;
  }

  try {
    return await createServerSupabaseClient();
  } catch {
    throw new Error("SUPABASE_REQUEST_CONTEXT_MISSING");
  }
}

async function getCachedVideo(videoId: string, options?: QueryOptions): Promise<YoutubeVideo | null> {
  const client = await getSupabaseUserClient(options);
  if (client) {
    const { data, error } = await client.from("videos").select("*").eq("video_id", videoId).maybeSingle();

    if (error) {
      throw new Error(`SUPABASE_GET_VIDEO_FAILED:${error.message}`);
    }

    return data ? toVideoFromRow(data as Record<string, unknown>) : null;
  }

  const db = await readDb();
  return db.videos.find((item) => item.videoId === videoId) ?? null;
}

async function saveVideo(video: YoutubeVideo, options?: QueryOptions): Promise<YoutubeVideo> {
  const client = await getSupabaseUserClient(options);
  if (client) {
    const primaryPayload = toVideoRow(video, true);

    const firstTry = await client.from("videos").upsert(primaryPayload, { onConflict: "video_id" }).select("*").single();

    if (!firstTry.error) {
      return toVideoFromRow(firstTry.data as Record<string, unknown>);
    }

    const compatibilityPayload = toVideoRow(video, false);
    delete compatibilityPayload.description;

    const fallbackTry = await client.from("videos").upsert(compatibilityPayload, { onConflict: "video_id" }).select("*").single();

    if (fallbackTry.error) {
      throw new Error(`SUPABASE_SAVE_VIDEO_FAILED:${firstTry.error.message};${fallbackTry.error.message}`);
    }

    const row = fallbackTry.data as Record<string, unknown>;
    return {
      ...toVideoFromRow(row),
      dataSource: video.dataSource,
      description: video.description
    };
  }

  const db = await readDb();
  db.videos = db.videos.filter((item) => item.videoId !== video.videoId);
  db.videos.unshift(video);
  await writeDb(db);

  return video;
}

export async function getVideoByVideoId(videoId: string, options?: QueryOptions): Promise<YoutubeVideo | null> {
  return getCachedVideo(videoId, options);
}

export function extractVideoId(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace("/", "") || null;
    }

    if (url.searchParams.has("v")) {
      return url.searchParams.get("v");
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const embedIndex = parts.findIndex((part) => part === "embed");
    if (embedIndex >= 0 && parts[embedIndex + 1]) {
      return parts[embedIndex + 1];
    }
    return null;
  } catch {
    return null;
  }
}

function createMockVideo(
  videoId: string,
  url: string,
  source: Extract<VideoDataSource, "mock_demo" | "mock_synthetic">
): Omit<YoutubeVideo, "id" | "fetchedAt"> {
  if (source === "mock_demo" && demoVideos[videoId]) {
    return {
      ...demoVideos[videoId],
      url,
      dataSource: "mock_demo"
    };
  }

  const base = Math.max(50000, videoId.length * 13337);
  return {
    videoId,
    url,
    title: `YouTube Strategy Breakdown - ${videoId}`,
    description: "Synthetic mock video used when URL is not part of the prepared demo list.",
    channelId: "channel-synthetic",
    channelName: "Synthetic Studio",
    publishedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    durationSec: 460,
    stats: {
      viewCount: base * 8,
      likeCount: Math.round(base * 0.32),
      commentCount: Math.round(base * 0.02)
    },
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    topComments: [
      "Good pacing and high information density.",
      "Would like more practical examples.",
      "Strong consistency between title and thumbnail."
    ],
    dataSource: "mock_synthetic"
  };
}

function toInt(value: string | undefined, fallback = 0): number {
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

function pickThumbnail(item: YoutubeApiVideoItem, videoId: string): string {
  return (
    item.snippet?.thumbnails?.maxres?.url ??
    item.snippet?.thumbnails?.high?.url ??
    item.snippet?.thumbnails?.medium?.url ??
    item.snippet?.thumbnails?.default?.url ??
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`YT_HTTP_${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchFromYoutubeApi(videoId: string, url: string, apiKey: string): Promise<Omit<YoutubeVideo, "id" | "fetchedAt">> {
  const videoApiUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videoApiUrl.searchParams.set("part", "snippet,contentDetails,statistics");
  videoApiUrl.searchParams.set("id", videoId);
  videoApiUrl.searchParams.set("key", apiKey);

  const videoPayload = await fetchJson<YoutubeApiVideoResponse>(videoApiUrl.toString());
  const item = videoPayload.items?.[0];

  if (!item) {
    throw new Error("YT_NOT_FOUND");
  }

  const commentsApiUrl = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
  commentsApiUrl.searchParams.set("part", "snippet");
  commentsApiUrl.searchParams.set("videoId", videoId);
  commentsApiUrl.searchParams.set("maxResults", "20");
  commentsApiUrl.searchParams.set("order", "relevance");
  commentsApiUrl.searchParams.set("textFormat", "plainText");
  commentsApiUrl.searchParams.set("key", apiKey);

  let topComments: string[] = [];

  try {
    const commentsPayload = await fetchJson<YoutubeApiCommentsResponse>(commentsApiUrl.toString());
    topComments = (commentsPayload.items ?? [])
      .map((comment) => {
        const snippet = comment.snippet?.topLevelComment?.snippet;
        return snippet?.textOriginal ?? snippet?.textDisplay ?? "";
      })
      .map((text) => text.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 20);
  } catch {
    topComments = [];
  }

  return {
    videoId,
    url,
    title: item.snippet?.title ?? `YouTube Video ${videoId}`,
    description: item.snippet?.description ?? "",
    channelId: item.snippet?.channelId ?? "",
    channelName: item.snippet?.channelTitle ?? "Unknown channel",
    publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
    durationSec: Math.max(1, parseIsoDurationToSeconds(item.contentDetails?.duration)),
    stats: {
      viewCount: toInt(item.statistics?.viewCount),
      likeCount: toInt(item.statistics?.likeCount),
      commentCount: toInt(item.statistics?.commentCount)
    },
    thumbnailUrl: pickThumbnail(item, videoId),
    topComments,
    dataSource: "youtube_api"
  };
}

function resolveFetchMode(): FetchMode {
  const mode = (process.env.YOUTUBE_FETCH_MODE ?? "auto").toLowerCase();
  if (mode === "live" || mode === "mock" || mode === "auto") {
    return mode;
  }
  return "auto";
}

export async function fetchYoutubeData(url: string, options?: QueryOptions): Promise<YoutubeVideo> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("INVALID_URL");
  }

  const existing = await getCachedVideo(videoId, options);

  if (existing) {
    const age = Date.now() - new Date(existing.fetchedAt).getTime();
    if (age < CACHE_TTL_MS) {
      return existing;
    }
  }

  const mode = resolveFetchMode();
  const apiKey = (options?.apiKeyOverride ?? process.env.YOUTUBE_API_KEY ?? "").trim();
  const shouldAttemptLiveFetch = mode !== "mock" || Boolean(apiKey);

  let record: Omit<YoutubeVideo, "id" | "fetchedAt"> | null = null;

  if (shouldAttemptLiveFetch) {
    if (!apiKey && mode === "live") {
      throw new Error("YOUTUBE_KEY_MISSING");
    }

    if (apiKey) {
      try {
        record = await fetchFromYoutubeApi(videoId, url, apiKey);
      } catch (error) {
        if (mode === "live") {
          throw error instanceof Error ? error : new Error("YT_API_FAILED");
        }
      }
    }
  }

  if (!record) {
    const mockSource: "mock_demo" | "mock_synthetic" = demoVideos[videoId] ? "mock_demo" : "mock_synthetic";
    record = createMockVideo(videoId, url, mockSource);
  }

  const current: YoutubeVideo = {
    id: existing?.id ?? crypto.randomUUID(),
    ...record,
    url,
    fetchedAt: new Date().toISOString()
  };

  return saveVideo(current, options);
}

type CollectViralOptions = QueryOptions & {
  hoursWithin: number;
  minViews: number;
  maxResults: number;
  regionCode?: string | null;
};

function buildCollectedItem(video: YoutubeVideo): CollectedViralItem {
  return {
    id: `collect-${video.videoId}`,
    videoId: video.videoId,
    url: video.url,
    title: video.title,
    summary: video.description || `${video.channelName} · ${video.stats.viewCount.toLocaleString()} views`,
    channelName: video.channelName,
    publishedAt: video.publishedAt,
    stats: video.stats,
    thumbnailUrl: video.thumbnailUrl,
    tags: {
      hookType: video.stats.viewCount >= 1_000_000 ? "spike" : "emerging",
      topic: "youtube-trending",
      durationBucket: video.durationSec >= 600 ? "10m+" : video.durationSec >= 300 ? "5-10m" : "0-5m",
    },
    dataSource: video.dataSource,
  };
}

async function fetchMostPopularVideos(apiKey: string, regionCode: string, maxResults: number): Promise<YoutubeApiVideoItem[]> {
  const apiUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  apiUrl.searchParams.set("part", "snippet,contentDetails,statistics");
  apiUrl.searchParams.set("chart", "mostPopular");
  apiUrl.searchParams.set("regionCode", regionCode || "US");
  apiUrl.searchParams.set("maxResults", String(Math.min(50, Math.max(10, maxResults))));
  apiUrl.searchParams.set("key", apiKey);

  const payload = await fetchJson<YoutubeApiVideoResponse>(apiUrl.toString());
  return payload.items ?? [];
}

function buildMockCollectedItems(input: { hoursWithin: number; minViews: number; maxResults: number }): CollectedViralItem[] {
  const now = Date.now();
  const candidates = Object.values(demoVideos).map((video, index) => ({
    ...video,
    publishedAt: new Date(now - Math.min(input.hoursWithin, 48) * 3600 * 1000 + index * 1800 * 1000).toISOString(),
    stats: {
      ...video.stats,
      viewCount: Math.max(video.stats.viewCount, input.minViews + index * 25_000),
    },
  }));

  return candidates
    .filter((video) => video.stats.viewCount >= input.minViews)
    .slice(0, input.maxResults)
    .map((video) =>
      buildCollectedItem({
        id: crypto.randomUUID(),
        ...video,
        fetchedAt: new Date().toISOString(),
      }),
    );
}

export async function collectViralYoutubeItems(options: CollectViralOptions): Promise<CollectedViralItem[]> {
  const hoursWithin = Math.min(168, Math.max(1, Math.floor(options.hoursWithin || 24)));
  const minViews = Math.max(1000, Math.floor(options.minViews || 100_000));
  const maxResults = Math.min(50, Math.max(1, Math.floor(options.maxResults || 10)));
  const regionCode = (options.regionCode || "US").trim().toUpperCase() || "US";
  const mode = resolveFetchMode();
  const apiKey = (options.apiKeyOverride ?? process.env.YOUTUBE_API_KEY ?? "").trim();

  if (!apiKey) {
    return buildMockCollectedItems({ hoursWithin, minViews, maxResults });
  }

  try {
    const publishedAfter = Date.now() - hoursWithin * 3600 * 1000;
    const items = await fetchMostPopularVideos(apiKey, regionCode, Math.max(maxResults, 20));
    const collected = items
      .map((item) => {
        const videoId = item.id;
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const candidate: YoutubeVideo = {
          id: crypto.randomUUID(),
          videoId,
          url,
          title: item.snippet?.title ?? `Popular Video ${videoId}`,
          description: item.snippet?.description ?? "",
          channelId: item.snippet?.channelId ?? "",
          channelName: item.snippet?.channelTitle ?? "Unknown channel",
          publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
          durationSec: Math.max(1, parseIsoDurationToSeconds(item.contentDetails?.duration)),
          stats: {
            viewCount: toInt(item.statistics?.viewCount),
            likeCount: toInt(item.statistics?.likeCount),
            commentCount: toInt(item.statistics?.commentCount),
          },
          thumbnailUrl: pickThumbnail(item, videoId),
          topComments: [],
          dataSource: "youtube_api",
          fetchedAt: new Date().toISOString(),
        };
        return candidate;
      })
      .filter((video) => new Date(video.publishedAt).getTime() >= publishedAfter && video.stats.viewCount >= minViews)
      .slice(0, maxResults)
      .map(buildCollectedItem);

    if (collected.length > 0) {
      return collected;
    }
  } catch (error) {
    if (mode === "live") {
      throw error;
    }
  }

  return buildMockCollectedItems({ hoursWithin, minViews, maxResults });
}

