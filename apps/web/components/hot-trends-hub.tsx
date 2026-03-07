"use client";

import { useMemo, useState } from "react";
import { MembershipUpgradeModal } from "@/components/membership-upgrade-modal";
import {
  HOT_TREND_CHANNELS,
  HOT_TREND_TOPICS,
  HOT_TREND_VIDEOS,
  type TrendChannelRow,
  type TrendTopicRow,
  type TrendVideoRow
} from "@/lib/hot-trends-data";
import type { Lang } from "@/lib/i18n-shared";
import type { UserPlan } from "@/lib/types";

type TrendTab = "videos" | "channels" | "topics";
type VideoType = "short" | "long";
type VideoWindow = "24h" | "48h" | "7d";

type Props = {
  lang: Lang;
  plan: UserPlan;
  initialTab: TrendTab;
  signedIn: boolean;
};

type Copy = {
  kicker: string;
  title: string;
  intro: string;
  demoDataTitle: string;
  demoDataDesc: string;
  demoDataAction: string;
  videos: string;
  channels: string;
  topics: string;
  short: string;
  long: string;
  twentyFour: string;
  fortyEight: string;
  sevenDays: string;
  discover: string;
  preview: string;
  locked: string;
  unlockTitle: string;
  unlockSubtitle: string;
  viewDetails: string;
  loginForMore: string;
  rank: string;
  thumbnail: string;
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
  summary: string;
  detailTitle: string;
  detailHook: string;
  detailAnalysis: string;
  proNote: string;
};

const copyByLang: Record<Lang, Copy> = {
  en: {
    kicker: "Hot Trends",
    title: "Spot videos, channels, and topics worth following before everyone else.",
    intro: "Use ViralBrain.ai to monitor breakout momentum, build a reusable topic pipeline, and decide what to analyze next in your console.",
    demoDataTitle: "Curated preview data",
    demoDataDesc:
      "The hot videos, channels, and topics on this page are currently curated sample rows from the product preview layer. Live provider access today covers single-video fetch, viral collection, and BYOK connection testing.",
    demoDataAction: "Open API setup guide",
    videos: "Hot Videos",
    channels: "Hot Channels",
    topics: "Hot Topics",
    short: "Shorts",
    long: "Long Videos",
    twentyFour: "24 Hours",
    fortyEight: "48 Hours",
    sevenDays: "7 Days",
    discover: "Discover Trends",
    preview: "Preview only",
    locked: "Pro required",
    unlockTitle: "Unlock trend intelligence",
    unlockSubtitle: "Upgrade to Pro to open full hot video, channel, and topic details.",
    viewDetails: "View Details",
    loginForMore: "Sign in for upgrade options",
    rank: "#",
    thumbnail: "Thumbnail",
    publishDate: "Publish Date",
    channel: "Channel",
    views: "Views",
    keyword: "Keyword",
    subscribers: "Subscribers",
    growth: "Growth",
    country: "Country",
    videosCount: "Videos",
    topic: "Topic",
    avgViews: "Avg Views",
    momentum: "Momentum",
    summary: "Summary",
    detailTitle: "Trend detail",
    detailHook: "Winning hook",
    detailAnalysis: "Why it is moving now",
    proNote: "Free users can browse the list but need Pro to open the full detail panel."
  },
  zh: {
    kicker: "热门趋势",
    title: "先一步发现正在起量的视频、频道和主题，决定下一条内容该往哪做。",
    intro: "用 ViralBrain.ai 跟踪爆款趋势、沉淀选题池，并把趋势洞察直接带回控制台分析和素材运营。",
    demoDataTitle: "当前是演示趋势样例",
    demoDataDesc: "这个页面里的热门视频、频道和主题目前还是产品预览层的静态样例，还没接入实时趋势聚合数据源。当前真实接入主要覆盖单视频抓取、爆款采集，以及用户自带 Key 的连接测试。",
    demoDataAction: "查看 API 配置教程",
    videos: "热门视频",
    channels: "热门频道",
    topics: "热门主题",
    short: "短视频",
    long: "长视频",
    twentyFour: "24 小时",
    fortyEight: "48 小时",
    sevenDays: "7 天",
    discover: "发现热门趋势",
    preview: "仅预览",
    locked: "需 Pro 解锁",
    unlockTitle: "解锁热门趋势详情",
    unlockSubtitle: "升级到 Pro 后可查看热门视频、频道和主题的完整数据与详情。",
    viewDetails: "查看详情",
    loginForMore: "登录后可升级解锁",
    rank: "排名",
    thumbnail: "缩略图",
    publishDate: "发布时间",
    channel: "频道",
    views: "观看数",
    keyword: "关键词",
    subscribers: "订阅数",
    growth: "增长",
    country: "国家",
    videosCount: "视频数",
    topic: "主题",
    avgViews: "平均播放",
    momentum: "势能",
    summary: "摘要",
    detailTitle: "趋势详情",
    detailHook: "高表现钩子",
    detailAnalysis: "为什么现在在涨",
    proNote: "免费用户可以浏览趋势列表，但查看完整详情需要升级到 Pro。"
  }
};

function pillClass(active: boolean) {
  return `trend-filter-pill ${active ? "trend-filter-pill-active" : ""}`;
}

function TrendDetailModal({
  lang,
  row,
  onClose
}: {
  lang: Lang;
  row: TrendVideoRow | TrendChannelRow | TrendTopicRow;
  onClose: () => void;
}) {
  const copy = copyByLang[lang];
  const title = "title" in row ? row.title : "topic" in row ? row.topic : row.channel;
  const meta = "keyword" in row ? row.keyword : "country" in row ? row.country : row.momentum;
  const primaryMetric = "views" in row ? row.views : "subscribers" in row ? row.subscribers : row.avgViews;
  const analysis = "hook" in row ? row.hook : "summary" in row ? row.summary : `${row.niche} · ${row.growth}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell trend-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="card-kicker">{copy.detailTitle}</p>
            <h2 style={{ margin: 0 }}>{title}</h2>
          </div>
          <button type="button" className="btn btn-ghost compact-button" onClick={onClose}>
            {lang === "zh" ? "关闭" : "Close"}
          </button>
        </div>
        <div className="trend-detail-body">
          <div className="trend-detail-main card panel">
            <span className="badge">{meta}</span>
            <h3>{copy.detailHook}</h3>
            <p>{analysis}</p>
            <h3>{copy.detailAnalysis}</h3>
            <p>
              {lang === "zh"
                ? "这类内容之所以在当前时间窗口内快速增长，通常是因为它把结果承诺放在最前面，同时让观众能马上判断是否值得继续看下去。"
                : "This format is climbing because the outcome promise appears early and the viewer can immediately judge whether the content is worth continuing."}
            </p>
          </div>
          <div className="trend-detail-side card panel">
            <p className="small">{copy.views}</p>
            <strong>{primaryMetric}</strong>
            <p className="small">{lang === "zh" ? "适合继续做相近选题、缩略图和标题拆解。" : "Use this to guide your next topic, thumbnail, and title teardown."}</p>
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
  const [detailRow, setDetailRow] = useState<TrendVideoRow | TrendChannelRow | TrendTopicRow | null>(null);

  const isPro = plan === "pro";

  const visibleVideos = useMemo(
    () => HOT_TREND_VIDEOS.filter((item) => item.type === videoType && item.window === videoWindow),
    [videoType, videoWindow]
  );

  function onOpenDetail(row: TrendVideoRow | TrendChannelRow | TrendTopicRow) {
    if (!isPro) {
      setUpgradeOpen(true);
      return;
    }
    setDetailRow(row);
  }

  return (
    <div className="trends-shell">
      <section className="trends-hero card panel">
        <div>
          <span className="badge trends-kicker">{copy.kicker}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
          <div className="qa-banner trend-demo-banner">
            <strong>{copy.demoDataTitle}</strong>
            <p>{copy.demoDataDesc}</p>
            <a className="btn btn-ghost compact-button" href="/support#api-guide">
              {copy.demoDataAction}
            </a>
          </div>
        </div>
        <div className="trends-hero-side card panel">
          <p className="card-kicker">{copy.preview}</p>
          <h3>{lang === "zh" ? "控制台里的趋势雷达" : "Trend radar inside your console"}</h3>
          <p>{copy.proNote}</p>
          {!isPro ? (
            <button type="button" className="btn btn-primary" onClick={() => setUpgradeOpen(true)}>
              {signedIn ? (lang === "zh" ? "升级查看完整详情" : "Upgrade for full detail") : copy.loginForMore}
            </button>
          ) : null}
        </div>
      </section>

      <section className="trends-toolbar card panel">
        <div className="tab-bar trends-tabs">
          <button type="button" className={`tab-button ${tab === "videos" ? "tab-button-active" : ""}`} onClick={() => setTab("videos")}>{copy.videos}</button>
          <button type="button" className={`tab-button ${tab === "channels" ? "tab-button-active" : ""}`} onClick={() => setTab("channels")}>{copy.channels}</button>
          <button type="button" className={`tab-button ${tab === "topics" ? "tab-button-active" : ""}`} onClick={() => setTab("topics")}>{copy.topics}</button>
        </div>

        {tab === "videos" ? (
          <div className="trends-filter-row">
            <div className="trends-filter-group">
              <span className="small">{lang === "zh" ? "视频类型" : "Video Type"}</span>
              <button type="button" className={pillClass(videoType === "short")} onClick={() => setVideoType("short")}>{copy.short}</button>
              <button type="button" className={pillClass(videoType === "long")} onClick={() => setVideoType("long")}>{copy.long}</button>
            </div>
            <div className="trends-filter-group">
              <span className="small">{lang === "zh" ? "发布时间" : "Publish Window"}</span>
              <button type="button" className={pillClass(videoWindow === "24h")} onClick={() => setVideoWindow("24h")}>{copy.twentyFour}</button>
              <button type="button" className={pillClass(videoWindow === "48h")} onClick={() => setVideoWindow("48h")}>{copy.fortyEight}</button>
              <button type="button" className={pillClass(videoWindow === "7d")} onClick={() => setVideoWindow("7d")}>{copy.sevenDays}</button>
            </div>
          </div>
        ) : null}
      </section>

      {tab === "videos" ? (
        <section className="card panel trends-table-shell">
          <div className="trends-table-head trends-video-grid">
            <span>{copy.rank}</span>
            <span>{copy.thumbnail}</span>
            <span>{lang === "zh" ? "标题" : "Title"}</span>
            <span>{copy.publishDate}</span>
            <span>{copy.channel}</span>
            <span>{copy.views}</span>
            <span>{copy.keyword}</span>
            <span>{lang === "zh" ? "操作" : "Action"}</span>
          </div>
          <div className="trends-table-body">
            {visibleVideos.map((row, index) => (
              <div key={row.id} className={`trends-video-grid trend-row ${!isPro ? "trend-row-locked" : ""}`}>
                <span className="trend-rank">{index + 1}</span>
                <div className="trend-thumb" />
                <div className="trend-title-block">
                  <strong>{row.title}</strong>
                  <span>{row.hook}</span>
                </div>
                <span>{row.publishedAt}</span>
                <span>{row.channel}</span>
                <span>{row.views}</span>
                <span>{row.keyword}</span>
                <button type="button" className="btn btn-ghost compact-button" onClick={() => onOpenDetail(row)}>
                  {isPro ? copy.viewDetails : copy.locked}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "channels" ? (
        <section className="card panel trends-table-shell">
          <div className="trends-table-head trends-channel-grid">
            <span>{copy.rank}</span>
            <span>{copy.channel}</span>
            <span>{lang === "zh" ? "赛道" : "Niche"}</span>
            <span>{copy.videosCount}</span>
            <span>{copy.subscribers}</span>
            <span>{copy.growth}</span>
            <span>{copy.country}</span>
            <span>{lang === "zh" ? "操作" : "Action"}</span>
          </div>
          <div className="trends-table-body">
            {HOT_TREND_CHANNELS.map((row, index) => (
              <div key={row.id} className={`trends-channel-grid trend-row ${!isPro ? "trend-row-locked" : ""}`}>
                <span className="trend-rank">{index + 1}</span>
                <strong>{row.channel}</strong>
                <span>{row.niche}</span>
                <span>{row.videos}</span>
                <span>{row.subscribers}</span>
                <span>{row.growth}</span>
                <span>{row.country}</span>
                <button type="button" className="btn btn-ghost compact-button" onClick={() => onOpenDetail(row)}>
                  {isPro ? copy.viewDetails : copy.locked}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "topics" ? (
        <section className="trend-topic-grid">
          {HOT_TREND_TOPICS.map((row) => (
            <article key={row.id} className={`card panel trend-topic-card ${!isPro ? "trend-row-locked" : ""}`}>
              <div className="library-card-head">
                <div>
                  <p className="card-kicker">{copy.topic}</p>
                  <h3>{row.topic}</h3>
                </div>
                <span className="badge">{row.momentum}</span>
              </div>
              <p>{row.summary}</p>
              <div className="trend-topic-metrics">
                <div>
                  <span className="small">{copy.videosCount}</span>
                  <strong>{row.sampleVideos}</strong>
                </div>
                <div>
                  <span className="small">{copy.avgViews}</span>
                  <strong>{row.avgViews}</strong>
                </div>
              </div>
              <button type="button" className="btn btn-primary compact-button" onClick={() => onOpenDetail(row)}>
                {isPro ? copy.viewDetails : copy.locked}
              </button>
            </article>
          ))}
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
