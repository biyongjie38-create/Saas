"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { MembershipUpgradeModal } from "@/components/membership-upgrade-modal";
import { buildApiIntegrationHeaders, readApiIntegrationConfigFromStorage } from "@/lib/api-integrations";
import {
  getFallbackHotTrendsDataset,
  type HotTrendsDataset,
  type TrendChannelRow,
  type TrendTopicRow,
  type TrendVideoRow,
} from "@/lib/hot-trends-data";
import type { Lang } from "@/lib/i18n-shared";
import type { UserPlan } from "@/lib/types";

type TrendTab = "videos" | "channels" | "topics";
type VideoType = "short" | "long";
type VideoWindow = "24h" | "48h" | "7d";
type TrendDetailRow = TrendVideoRow | TrendChannelRow | TrendTopicRow;

type Props = {
  lang: Lang;
  plan: UserPlan;
  initialTab: TrendTab;
  signedIn: boolean;
};

type HotTrendsResponse = {
  ok: boolean;
  data: HotTrendsDataset | null;
  error?: {
    message?: string;
  } | null;
};

type Copy = {
  kicker: string;
  title: string;
  intro: string;
  liveTitle: string;
  fallbackTitle: string;
  liveDesc: string;
  fallbackDesc: string;
  openGuide: string;
  updatedAt: string;
  refreshing: string;
  refreshFailed: string;
  videos: string;
  channels: string;
  topics: string;
  short: string;
  long: string;
  twentyFour: string;
  fortyEight: string;
  sevenDays: string;
  preview: string;
  locked: string;
  unlockTitle: string;
  unlockSubtitle: string;
  viewDetails: string;
  upgradeToView: string;
  loginForMore: string;
  rank: string;
  thumbnail: string;
  titleColumn: string;
  publishDate: string;
  channel: string;
  views: string;
  keyword: string;
  subscribers: string;
  growth: string;
  country: string;
  videosCount: string;
  topic: string;
  avgViews: string;
  momentum: string;
  niche: string;
  action: string;
  videoType: string;
  publishWindow: string;
  detailTitle: string;
  detailHook: string;
  detailAnalysis: string;
  close: string;
  upgradeForFullDetail: string;
  proNote: string;
  noRows: string;
  openYoutube: string;
  consoleRadarTitle: string;
};

const copyByLang: Record<Lang, Copy> = {
  en: {
    kicker: "Hot Trends",
    title: "Spot videos, channels, and topics worth following before everyone else.",
    intro: "Use ViralBrain.ai to monitor breakout momentum, build a reusable topic pipeline, and decide what to analyze next in your console.",
    liveTitle: "Live YouTube trend feed",
    fallbackTitle: "Fallback preview feed",
    liveDesc: "This page is now pulling real YouTube trend candidates. Your browser key takes priority; if missing, the server key is used.",
    fallbackDesc: "No usable YouTube key is available right now, so the page is showing stable preview rows instead of a blank state.",
    openGuide: "Open setup guide",
    updatedAt: "Updated",
    refreshing: "Refreshing live trends...",
    refreshFailed: "Live refresh failed. Showing the fallback dataset.",
    videos: "Hot Videos",
    channels: "Hot Channels",
    topics: "Hot Topics",
    short: "Shorts",
    long: "Long Videos",
    twentyFour: "24 Hours",
    fortyEight: "48 Hours",
    sevenDays: "7 Days",
    preview: "Preview",
    locked: "Pro required",
    unlockTitle: "Unlock trend intelligence",
    unlockSubtitle: "Upgrade to Pro to open full hot video, channel, and topic details.",
    viewDetails: "View Details",
    upgradeToView: "Upgrade to View",
    loginForMore: "Sign in for upgrade options",
    rank: "#",
    thumbnail: "Thumbnail",
    titleColumn: "Title",
    publishDate: "Publish Date",
    channel: "Channel",
    views: "Views",
    keyword: "Keyword",
    subscribers: "Subscribers",
    growth: "Momentum",
    country: "Country",
    videosCount: "Videos",
    topic: "Topic",
    avgViews: "Avg Views",
    momentum: "Momentum",
    niche: "Niche",
    action: "Action",
    videoType: "Video Type",
    publishWindow: "Publish Window",
    detailTitle: "Trend detail",
    detailHook: "Winning hook",
    detailAnalysis: "Why it is moving now",
    close: "Close",
    upgradeForFullDetail: "Upgrade for full detail",
    proNote: "Free users can browse the trend list, but opening the full detail panel requires Pro.",
    noRows: "No recent rows matched the current filter.",
    openYoutube: "Open on YouTube",
    consoleRadarTitle: "Trend radar inside your console",
  },
  zh: {
    kicker: "热门趋势",
    title: "先一步发现正在起量的视频、频道和主题，决定下一条内容该往哪做。",
    intro: "用 ViralBrain.ai 跟踪爆款趋势、沉淀选题池，并把趋势洞察直接带回控制台分析和素材运营。",
    liveTitle: "实时 YouTube 趋势数据",
    fallbackTitle: "样例回退数据",
    liveDesc: "这个页面会优先拉取真实 YouTube 趋势候选。当前浏览器里的 Key 优先，其次才会使用服务端 Key。",
    fallbackDesc: "当前没有可用的 YouTube Key，所以页面自动回退到稳定样例，而不是直接显示空白。",
    openGuide: "查看接入教程",
    updatedAt: "更新时间",
    refreshing: "正在刷新实时趋势...",
    refreshFailed: "实时刷新失败，当前展示回退样例。",
    videos: "热门视频",
    channels: "热门频道",
    topics: "热门主题",
    short: "短视频",
    long: "长视频",
    twentyFour: "24 小时",
    fortyEight: "48 小时",
    sevenDays: "7 天",
    preview: "预览",
    locked: "需 Pro 解锁",
    unlockTitle: "解锁热门趋势详情",
    unlockSubtitle: "升级到 Pro 后可查看热门视频、频道和主题的完整数据与详情。",
    viewDetails: "查看详情",
    upgradeToView: "升级查看",
    loginForMore: "登录后可升级解锁",
    rank: "排名",
    thumbnail: "缩略图",
    titleColumn: "标题",
    publishDate: "发布时间",
    channel: "频道",
    views: "观看数",
    keyword: "关键词",
    subscribers: "订阅数",
    growth: "增长势能",
    country: "国家",
    videosCount: "视频数",
    topic: "主题",
    avgViews: "平均播放",
    momentum: "势能",
    niche: "赛道",
    action: "操作",
    videoType: "视频类型",
    publishWindow: "发布时间",
    detailTitle: "趋势详情",
    detailHook: "高表现钩子",
    detailAnalysis: "为什么现在在涨",
    close: "关闭",
    upgradeForFullDetail: "升级查看完整详情",
    proNote: "免费用户可以浏览趋势列表，但查看完整详情需要升级到 Pro。",
    noRows: "当前筛选条件下没有命中最近趋势。",
    openYoutube: "打开 YouTube",
    consoleRadarTitle: "控制台里的趋势雷达",
  },
};

function pillClass(active: boolean) {
  return `trend-filter-pill ${active ? "trend-filter-pill-active" : ""}`;
}

function isVideoRow(row: TrendDetailRow): row is TrendVideoRow {
  return "thumbnailUrl" in row;
}

function isChannelRow(row: TrendDetailRow): row is TrendChannelRow {
  return "growthScore" in row;
}

function formatCompactNumber(value: number, lang: Lang) {
  return new Intl.NumberFormat(lang === "zh" ? "zh-CN" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatRelativeTime(value: string, lang: Lang) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return value;
  }

  const diffMs = timestamp - Date.now();
  const diffHours = diffMs / 3_600_000;
  const rtf = new Intl.RelativeTimeFormat(lang === "zh" ? "zh-CN" : "en-US", { numeric: "auto" });

  if (Math.abs(diffHours) < 24) {
    return rtf.format(Math.round(diffHours), "hour");
  }

  const diffDays = diffHours / 24;
  if (Math.abs(diffDays) < 7) {
    return rtf.format(Math.round(diffDays), "day");
  }

  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function formatTimestamp(value: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMomentum(score: number, lang: Lang) {
  if (score >= 90) {
    return lang === "zh" ? "非常高" : "Very high";
  }
  if (score >= 75) {
    return lang === "zh" ? "高" : "High";
  }
  if (score >= 60) {
    return lang === "zh" ? "中高" : "Medium-high";
  }
  return lang === "zh" ? "中等" : "Medium";
}

function formatTopicSummaryText(row: TrendTopicRow, lang: Lang) {
  if (lang === "zh") {
    return `${row.topic} 在最近 ${row.sampleVideos} 条起量内容里反复出现，平均播放约 ${formatCompactNumber(row.avgViews, lang)}，而且更偏向“先给结果、再讲过程”的表达方式。`;
  }

  return `${row.topic} is appearing across ${row.sampleVideos} recent breakout videos, averaging ${formatCompactNumber(row.avgViews, lang)} views with a payoff-first framing pattern.`;
}

function isWithinWindow(publishedAt: string, window: VideoWindow) {
  const timestamp = new Date(publishedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const diffHours = (Date.now() - timestamp) / 3_600_000;
  if (window === "24h") {
    return diffHours <= 24;
  }
  if (window === "48h") {
    return diffHours <= 48;
  }
  return diffHours <= 168;
}

function TrendDetailModal({
  lang,
  row,
  onClose,
}: {
  lang: Lang;
  row: TrendDetailRow;
  onClose: () => void;
}) {
  const copy = copyByLang[lang];

  const title = isVideoRow(row) ? row.title : isChannelRow(row) ? row.channel : row.topic;
  const badge = isVideoRow(row) ? row.keyword : isChannelRow(row) ? row.country : formatMomentum(row.momentumScore, lang);
  const primaryLabel = isVideoRow(row) ? copy.views : isChannelRow(row) ? copy.subscribers : copy.avgViews;
  const primaryMetric = isVideoRow(row)
    ? formatCompactNumber(row.views, lang)
    : isChannelRow(row)
      ? formatCompactNumber(row.subscribers, lang)
      : formatCompactNumber(row.avgViews, lang);
  const analysis = isVideoRow(row)
    ? row.hook
    : isChannelRow(row)
      ? `${row.niche} / ${copy.growth} ${row.growthScore.toFixed(1)}%`
      : formatTopicSummaryText(row, lang);
  const sourceHref = isVideoRow(row)
    ? row.url
    : isChannelRow(row)
      ? row.url
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(row.topic)}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell trend-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="card-kicker">{copy.detailTitle}</p>
            <h2 style={{ margin: 0 }}>{title}</h2>
          </div>
          <button type="button" className="btn btn-ghost compact-button" onClick={onClose}>
            {copy.close}
          </button>
        </div>
        <div className="trend-detail-body">
          <div className="trend-detail-main card panel">
            <span className="badge">{badge}</span>
            <h3>{copy.detailHook}</h3>
            <p>{analysis}</p>
            <h3>{copy.detailAnalysis}</h3>
            <p>
              {isVideoRow(row)
                ? lang === "zh"
                  ? "这条视频当前起量，通常说明它在开头就交代了结果承诺，而且用很低的理解成本把观众留住。"
                  : "This video is moving because the payoff promise lands early and the viewer can immediately tell why the content is worth watching."
                : isChannelRow(row)
                  ? lang === "zh"
                    ? "这个频道近期热门视频密度更高，说明它在标题角度、选题复用和更新节奏上已经形成稳定打法。"
                    : "This channel is surfacing because more of its recent uploads are converting attention into breakout-level reach."
                  : lang === "zh"
                    ? "这个主题在最近热门内容里重复出现，说明观众已经开始对同类结果承诺和表达方式形成稳定需求。"
                    : "This topic is recurring across recent breakout videos, which usually means the audience now recognizes the payoff pattern quickly."}
            </p>
          </div>
          <div className="trend-detail-side card panel">
            <p className="small">{primaryLabel}</p>
            <strong>{primaryMetric}</strong>
            {isChannelRow(row) ? <p className="small">{copy.growth}: {row.growthScore.toFixed(1)}%</p> : null}
            {"momentumScore" in row ? <p className="small">{copy.momentum}: {formatMomentum(row.momentumScore, lang)}</p> : null}
            <a className="btn btn-ghost compact-button" href={sourceHref} target="_blank" rel="noreferrer">
              {copy.openYoutube}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HotTrendsHub({ lang, plan, initialTab, signedIn }: Props) {
  const copy = copyByLang[lang];
  const [tab, setTab] = useState<TrendTab>(initialTab);
  const [videoType, setVideoType] = useState<VideoType>("short");
  const [videoWindow, setVideoWindow] = useState<VideoWindow>("48h");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<TrendDetailRow | null>(null);
  const [trendData, setTrendData] = useState<HotTrendsDataset>(() => getFallbackHotTrendsDataset());
  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState("");

  const isPro = plan === "pro";

  useEffect(() => {
    let ignore = false;

    async function loadHotTrends() {
      setLoading(true);
      setRefreshError("");

      try {
        const response = await fetch("/api/hot-trends?region=US", {
          cache: "no-store",
          headers: {
            ...buildApiIntegrationHeaders(readApiIntegrationConfigFromStorage()),
          },
        });
        const payload = (await response.json().catch(() => null)) as HotTrendsResponse | null;
        if (!response.ok || !payload?.ok || !payload.data) {
          throw new Error(payload?.error?.message ?? copy.refreshFailed);
        }

        if (ignore) {
          return;
        }

        startTransition(() => {
          setTrendData(payload.data ?? getFallbackHotTrendsDataset());
        });
      } catch (error) {
        if (!ignore) {
          setRefreshError(error instanceof Error && error.message ? copy.refreshFailed : copy.refreshFailed);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadHotTrends();
    return () => {
      ignore = true;
    };
  }, [copy.refreshFailed]);

  const visibleVideos = useMemo(
    () =>
      trendData.videos
        .filter((item) => item.type === videoType && isWithinWindow(item.publishedAt, videoWindow))
        .slice(0, 24),
    [trendData.videos, videoType, videoWindow],
  );

  function onOpenDetail(row: TrendDetailRow) {
    if (!isPro) {
      setUpgradeOpen(true);
      return;
    }
    setDetailRow(row);
  }

  const sourceTitle = trendData.source === "live" ? copy.liveTitle : copy.fallbackTitle;
  const sourceDescription = trendData.source === "live" ? copy.liveDesc : copy.fallbackDesc;
  const detailActionLabel = isPro ? copy.viewDetails : copy.upgradeToView;

  return (
    <div className="trends-shell">
      <section className="trends-hero card panel">
        <div>
          <span className="badge trends-kicker">{copy.kicker}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
          <div className="qa-banner trend-demo-banner">
            <strong>{sourceTitle}</strong>
            <p>{sourceDescription}</p>
            <p className="small">
              {copy.updatedAt}: {formatTimestamp(trendData.updatedAt, lang)}
              {loading ? ` | ${copy.refreshing}` : ""}
            </p>
            {refreshError ? <p className="small">{refreshError}</p> : null}
            <a className="btn btn-ghost compact-button" href="/support#api-guide">
              {copy.openGuide}
            </a>
          </div>
        </div>
        <div className="trends-hero-side card panel">
          <p className="card-kicker">{copy.preview}</p>
          <h3>{copy.consoleRadarTitle}</h3>
          <p>{copy.proNote}</p>
          {!isPro ? (
            <button type="button" className="btn btn-primary" onClick={() => setUpgradeOpen(true)}>
              {signedIn ? copy.upgradeForFullDetail : copy.loginForMore}
            </button>
          ) : null}
        </div>
      </section>

      <section className="trends-toolbar card panel">
        <div className="tab-bar trends-tabs">
          <button type="button" className={`tab-button ${tab === "videos" ? "tab-button-active" : ""}`} onClick={() => setTab("videos")}>
            {copy.videos}
          </button>
          <button type="button" className={`tab-button ${tab === "channels" ? "tab-button-active" : ""}`} onClick={() => setTab("channels")}>
            {copy.channels}
          </button>
          <button type="button" className={`tab-button ${tab === "topics" ? "tab-button-active" : ""}`} onClick={() => setTab("topics")}>
            {copy.topics}
          </button>
        </div>

        {tab === "videos" ? (
          <div className="trends-filter-row">
            <div className="trends-filter-group">
              <span className="small">{copy.videoType}</span>
              <button type="button" className={pillClass(videoType === "short")} onClick={() => setVideoType("short")}>
                {copy.short}
              </button>
              <button type="button" className={pillClass(videoType === "long")} onClick={() => setVideoType("long")}>
                {copy.long}
              </button>
            </div>
            <div className="trends-filter-group">
              <span className="small">{copy.publishWindow}</span>
              <button type="button" className={pillClass(videoWindow === "24h")} onClick={() => setVideoWindow("24h")}>
                {copy.twentyFour}
              </button>
              <button type="button" className={pillClass(videoWindow === "48h")} onClick={() => setVideoWindow("48h")}>
                {copy.fortyEight}
              </button>
              <button type="button" className={pillClass(videoWindow === "7d")} onClick={() => setVideoWindow("7d")}>
                {copy.sevenDays}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {tab === "videos" ? (
        <section className="card panel trends-table-shell">
          <div className="trends-table-head trends-video-grid">
            <span>{copy.rank}</span>
            <span>{copy.thumbnail}</span>
            <span>{copy.titleColumn}</span>
            <span>{copy.publishDate}</span>
            <span>{copy.channel}</span>
            <span>{copy.views}</span>
            <span>{copy.keyword}</span>
            <span>{copy.action}</span>
          </div>
          <div className="trends-table-body">
            {visibleVideos.length === 0 ? (
              <div className="empty-state">
                <p className="small">{copy.noRows}</p>
              </div>
            ) : (
              visibleVideos.map((row, index) => (
                <div key={row.id} className={`trends-video-grid trend-row ${!isPro ? "trend-row-locked" : ""}`}>
                  <span className="trend-rank">{index + 1}</span>
                  <div className="trend-thumb">
                    <img className="trend-thumb-image" src={row.thumbnailUrl} alt={row.title} />
                  </div>
                  <div className="trend-title-block">
                    <strong>{row.title}</strong>
                    <span>{row.hook}</span>
                  </div>
                  <span>{formatRelativeTime(row.publishedAt, lang)}</span>
                  <span>{row.channel}</span>
                  <span>{formatCompactNumber(row.views, lang)}</span>
                  <span>{row.keyword}</span>
                  <button type="button" className="btn btn-ghost compact-button" onClick={() => onOpenDetail(row)}>
                    {detailActionLabel}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {tab === "channels" ? (
        <section className="card panel trends-table-shell">
          <div className="trends-table-head trends-channel-grid">
            <span>{copy.rank}</span>
            <span>{copy.channel}</span>
            <span>{copy.niche}</span>
            <span>{copy.videosCount}</span>
            <span>{copy.subscribers}</span>
            <span>{copy.growth}</span>
            <span>{copy.country}</span>
            <span>{copy.action}</span>
          </div>
          <div className="trends-table-body">
            {trendData.channels.length === 0 ? (
              <div className="empty-state">
                <p className="small">{copy.noRows}</p>
              </div>
            ) : (
              trendData.channels.map((row, index) => (
                <div key={row.id} className={`trends-channel-grid trend-row ${!isPro ? "trend-row-locked" : ""}`}>
                  <span className="trend-rank">{index + 1}</span>
                  <strong>{row.channel}</strong>
                  <span>{row.niche}</span>
                  <span>{row.videos}</span>
                  <span>{formatCompactNumber(row.subscribers, lang)}</span>
                  <span>{row.growthScore.toFixed(1)}%</span>
                  <span>{row.country}</span>
                  <button type="button" className="btn btn-ghost compact-button" onClick={() => onOpenDetail(row)}>
                    {detailActionLabel}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {tab === "topics" ? (
        <section className="trend-topic-grid">
          {trendData.topics.length === 0 ? (
            <article className="card panel empty-state">
              <p className="small">{copy.noRows}</p>
            </article>
          ) : (
            trendData.topics.map((row) => (
              <article key={row.id} className={`card panel trend-topic-card ${!isPro ? "trend-row-locked" : ""}`}>
                <div className="library-card-head">
                  <div>
                    <p className="card-kicker">{copy.topic}</p>
                    <h3>{row.topic}</h3>
                  </div>
                  <span className="badge">{formatMomentum(row.momentumScore, lang)}</span>
                </div>
                <p>{formatTopicSummaryText(row, lang)}</p>
                <div className="trend-topic-metrics">
                  <div>
                    <span className="small">{copy.videosCount}</span>
                    <strong>{row.sampleVideos}</strong>
                  </div>
                  <div>
                    <span className="small">{copy.avgViews}</span>
                    <strong>{formatCompactNumber(row.avgViews, lang)}</strong>
                  </div>
                </div>
                <button type="button" className="btn btn-primary compact-button" onClick={() => onOpenDetail(row)}>
                  {detailActionLabel}
                </button>
              </article>
            ))
          )}
        </section>
      ) : null}

      <MembershipUpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        lang={lang}
        plan={plan}
        signedIn={signedIn}
        nextPath={`/dashboard/trends?tab=${tab}`}
        title={copy.unlockTitle}
        subtitle={copy.unlockSubtitle}
      />

      {detailRow ? <TrendDetailModal lang={lang} row={detailRow} onClose={() => setDetailRow(null)} /> : null}
    </div>
  );
}
