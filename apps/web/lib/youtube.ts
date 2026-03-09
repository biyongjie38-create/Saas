import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { demoVideos } from "@/lib/mock-data";
import { readDb, writeDb } from "@/lib/db";
import { allowPreviewFallbacks, isProductionRuntimeMode } from "@/lib/runtime-mode";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isSupabaseBackendEnabled } from "@/lib/supabase";
import type { CollectedViralItem, VideoDataSource, YoutubeVideo } from "@/lib/types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const YOUTUBE_REQUEST_TIMEOUT_MS = Math.max(5000, Number.parseInt(process.env.YOUTUBE_REQUEST_TIMEOUT_MS ?? "12000", 10) || 12000);

type FetchMode = "auto" | "live" | "mock";

type QueryOptions = {
  supabaseClient?: SupabaseClient | null;
  apiKeyOverride?: string | null;
};

type YoutubeCaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
  name?: {
    simpleText?: string;
    runs?: Array<{ text?: string }>;
  };
};

type YoutubePlayerResponse = {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: YoutubeCaptionTrack[];
    };
  };
};

type YoutubeCaptionJson3Response = {
  events?: Array<{
    segs?: Array<{
      utf8?: string;
    }>;
  }>;
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
    captionsText: typeof row.captions_text === "string" ? row.captions_text : null,
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
    captions_text: video.captionsText ?? null,
    fetched_at: video.fetchedAt
  };

  if (includeDataSource) {
    row.data_source = video.dataSource;
  }

  return row;
}

async function getSupabaseUserClient(options?: QueryOptions): Promise<SupabaseClient | null> {
  if (!isSupabaseBackendEnabled()) {
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
    delete compatibilityPayload.captions_text;

    const fallbackTry = await client.from("videos").upsert(compatibilityPayload, { onConflict: "video_id" }).select("*").single();

    if (fallbackTry.error) {
      throw new Error(`SUPABASE_SAVE_VIDEO_FAILED:${firstTry.error.message};${fallbackTry.error.message}`);
    }

    const row = fallbackTry.data as Record<string, unknown>;
    return {
      ...toVideoFromRow(row),
      dataSource: video.dataSource,
      description: video.description,
      captionsText: video.captionsText ?? null
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
    captionsText:
      source === "mock_demo"
        ? demoVideos[videoId]?.captionsText ?? null
        : "Synthetic transcript preview generated because live captions were unavailable in the current environment.",
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

function decodeHtmlJsonLiteral(value: string): string {
  return value
    .replace(/\\u0026/g, "&")
    .replace(/\\u003d/g, "=")
    .replace(/\\u002F/g, "/");
}

function parsePlayerResponse(html: string): YoutubePlayerResponse | null {
  const patterns = [
    /ytInitialPlayerResponse\s*=\s*({.+?});<\/script>/s,
    /ytInitialPlayerResponse\s*=\s*({.+?});/s,
    /"playerResponse":"({.+?})"/s
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const candidate = pattern.source.includes('"playerResponse"')
      ? decodeHtmlJsonLiteral(match[1]).replace(/\\"/g, '"')
      : match[1];

    try {
      return JSON.parse(candidate) as YoutubePlayerResponse;
    } catch {
      continue;
    }
  }

  return null;
}

function scoreCaptionTrack(track: YoutubeCaptionTrack): number {
  const language = (track.languageCode ?? "").toLowerCase();
  const label = [
    track.name?.simpleText ?? "",
    ...(track.name?.runs?.map((item) => item.text ?? "") ?? [])
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  if (track.kind !== "asr") {
    score += 5;
  }
  if (language.startsWith("en")) {
    score += 4;
  }
  if (language.startsWith("zh")) {
    score += 3;
  }
  if (label.includes("english")) {
    score += 2;
  }
  if (label.includes("chinese") || label.includes("中文")) {
    score += 2;
  }

  return score;
}

function pickCaptionTrack(tracks: YoutubeCaptionTrack[]): YoutubeCaptionTrack | null {
  if (!tracks.length) {
    return null;
  }

  return [...tracks].sort((left, right) => scoreCaptionTrack(right) - scoreCaptionTrack(left))[0] ?? null;
}

function normalizeCaptionLine(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .trim();
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), YOUTUBE_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("YT_REQUEST_TIMEOUT");
    }

    const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause : null;
    const causeCode =
      cause && typeof cause === "object" && "code" in cause ? String((cause as { code?: unknown }).code ?? "") : "";

    if (causeCode === "UND_ERR_CONNECT_TIMEOUT") {
      throw new Error("YT_REQUEST_TIMEOUT");
    }

    throw new Error("YT_API_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetchWithTimeout(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`YT_HTTP_${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchCaptionText(trackBaseUrl: string): Promise<string | null> {
  const captionUrl = new URL(trackBaseUrl);
  captionUrl.searchParams.set("fmt", "json3");

  const payload = await fetchJson<YoutubeCaptionJson3Response>(captionUrl.toString());
  const lines = (payload.events ?? [])
    .map((event) => (event.segs ?? []).map((segment) => segment.utf8 ?? "").join(""))
    .map(normalizeCaptionLine)
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  return lines.join(" ").slice(0, 12000);
}

async function fetchCaptionsFromWatchPage(videoId: string): Promise<string | null> {
  const response = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`YT_WATCH_HTTP_${response.status}`);
  }

  const html = await response.text();
  const playerResponse = parsePlayerResponse(html);
  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const preferredTrack = pickCaptionTrack(tracks);

  if (!preferredTrack?.baseUrl) {
    return null;
  }

  return fetchCaptionText(preferredTrack.baseUrl);
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
  let captionsText: string | null = null;

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

  try {
    captionsText = await fetchCaptionsFromWatchPage(videoId);
  } catch {
    captionsText = null;
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
    captionsText,
    dataSource: "youtube_api"
  };
}

function resolveFetchMode(): FetchMode {
  if (isProductionRuntimeMode()) {
    return "live";
  }
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
    if (age < CACHE_TTL_MS && (existing.captionsText || existing.dataSource !== "youtube_api")) {
      return existing;
    }
  }

  const mode = resolveFetchMode();
  const apiKey = (options?.apiKeyOverride || "").trim();
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

  if (!record && !allowPreviewFallbacks()) {
    throw new Error(apiKey ? "YT_API_FAILED" : "YOUTUBE_KEY_MISSING");
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
  const apiKey = (options.apiKeyOverride || "").trim();

  if (!apiKey) {
    if (!allowPreviewFallbacks()) {
      throw new Error("YOUTUBE_KEY_MISSING");
    }
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
          captionsText: null,
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

  if (!allowPreviewFallbacks()) {
    throw new Error("YOUTUBE_COLLECT_EMPTY");
  }

  return buildMockCollectedItems({ hoursWithin, minViews, maxResults });
}

