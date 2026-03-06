"use client";

import { useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n-shared";
import type { AnalysisJson, BenchmarksJson, ModelTrace, ModelTraceStep, ScoreJson, YoutubeVideo } from "@/lib/types";

type Props = {
  lang: Lang;
  video: YoutubeVideo | null;
  analysis: AnalysisJson | null;
  benchmarks: BenchmarksJson | null;
  score: ScoreJson | null;
  trace: ModelTrace | null;
};

type TabKey = "overview" | "structure" | "thumbnail" | "audience" | "playbook";

const copyByLang = {
  en: {
    tabs: {
      overview: "Snapshot",
      structure: "Structure",
      thumbnail: "Thumbnail",
      audience: "Audience",
      playbook: "Playbook"
    },
    source: "Source",
    views: "Views",
    likes: "Likes",
    comments: "Comments",
    sentiment: "Sentiment",
    score: "Score",
    breakdown: "Breakdown",
    hook: "Hook",
    pacing: "Pacing",
    cta: "CTA",
    motivations: "Motivations",
    concerns: "Concerns",
    titleLabel: "Title",
    thumbnailLabel: "Thumbnail",
    hookLabel: "Hook",
    pacingLabel: "Pacing",
    valueLabel: "Value",
    noVideo: "No cached video data found.",
    noAnalysis: "Analysis not ready yet.",
    noThumbnail: "No thumbnail review yet.",
    noAudience: "No comments insight yet.",
    noPlaybook: "No playbook data yet.",
    benchmarks: "Top3 Benchmarks",
    actions: "Action List",
    trace: "Model Trace",
    latency: "Latency",
    fallback: "Fallback",
    provider: "Provider",
    input: "Input",
    output: "Output",
    total: "Total",
    yes: "Yes",
    no: "No",
    signals: "Shared signals",
    reuse: "Reusable moves",
    differences: "Key differences",
    avoid: "Avoid"
  },
  zh: {
    tabs: {
      overview: "快照",
      structure: "结构",
      thumbnail: "封面",
      audience: "受众",
      playbook: "方案"
    },
    source: "来源",
    views: "播放",
    likes: "点赞",
    comments: "评论",
    sentiment: "情绪",
    score: "评分",
    breakdown: "拆解",
    hook: "钩子",
    pacing: "节奏",
    cta: "CTA",
    motivations: "动机",
    concerns: "顾虑",
    titleLabel: "标题",
    thumbnailLabel: "封面",
    hookLabel: "钩子",
    pacingLabel: "节奏",
    valueLabel: "价值密度",
    noVideo: "未找到缓存视频数据。",
    noAnalysis: "分析结果暂未就绪。",
    noThumbnail: "暂无封面评估。",
    noAudience: "暂无评论洞察。",
    noPlaybook: "暂无行动方案数据。",
    benchmarks: "Top3 对标案例",
    actions: "行动清单",
    trace: "模型追踪",
    latency: "耗时",
    fallback: "兜底",
    provider: "供应商",
    input: "输入",
    output: "输出",
    total: "总计",
    yes: "是",
    no: "否",
    signals: "相似信号",
    reuse: "可复用点",
    differences: "差异提醒",
    avoid: "应避免"
  }
} as const;

const sourceLabelByLang = {
  en: {
    youtube_api: "Live API",
    mock_demo: "Mock Demo",
    mock_synthetic: "Mock Synthetic"
  },
  zh: {
    youtube_api: "实时 API",
    mock_demo: "演示数据",
    mock_synthetic: "合成数据"
  }
} as const;

function fallbackTraceStep(model: string): ModelTraceStep {
  return {
    model,
    provider: "unknown",
    fallbackUsed: false,
    retries: 0,
    latencyMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    providerRequestId: null
  };
}

function formatBoolean(value: boolean, lang: Lang) {
  return value ? copyByLang[lang].yes : copyByLang[lang].no;
}

export function ReportTabs({ lang, video, analysis, benchmarks, score, trace }: Props) {
  const copy = copyByLang[lang];
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const traceSteps = useMemo(() => {
    if (!trace) {
      return [];
    }

    return [
      {
        key: "analysis",
        label: lang === "zh" ? "分析" : "Analysis",
        step: trace.analysis ?? fallbackTraceStep(trace.analysisModel)
      },
      {
        key: "benchmark",
        label: lang === "zh" ? "对标" : "Benchmark",
        step: trace.benchmark ?? fallbackTraceStep(trace.benchmarkModel)
      },
      {
        key: "score",
        label: lang === "zh" ? "评分" : "Score",
        step: trace.score ?? fallbackTraceStep(trace.scoreModel)
      }
    ];
  }, [lang, trace]);

  return (
    <div className="card panel">
      <div className="tab-bar">
        {(Object.keys(copy.tabs) as TabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`tab-button ${activeTab === key ? "tab-button-active" : ""}`}
            onClick={() => setActiveTab(key)}
          >
            {copy.tabs[key]}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        {activeTab === "overview" ? (
          <div className="content-stack">
            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>{copy.tabs.overview}</h2>
              {video ? (
                <>
                  <p><strong>{video.title}</strong></p>
                  <p className="small">{video.channelName}</p>
                  <p className="small mono">
                    {copy.views} {video.stats.viewCount.toLocaleString()} · {copy.likes} {video.stats.likeCount.toLocaleString()} · {copy.comments} {video.stats.commentCount.toLocaleString()}
                  </p>
                  <p className="small mono">{copy.source}: {sourceLabelByLang[lang][video.dataSource]}</p>
                </>
              ) : (
                <p className="small">{copy.noVideo}</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>{copy.breakdown}</h2>
              {score ? (
                <div className="report-subgrid">
                  <div className="metric-card"><span className="small">{copy.score}</span><strong>{score.total}</strong></div>
                  <div className="metric-card"><span className="small">{copy.titleLabel}</span><strong>{score.breakdown.title}</strong></div>
                  <div className="metric-card"><span className="small">{copy.thumbnailLabel}</span><strong>{score.breakdown.thumbnail}</strong></div>
                  <div className="metric-card"><span className="small">{copy.hookLabel}</span><strong>{score.breakdown.hook}</strong></div>
                  <div className="metric-card"><span className="small">{copy.pacingLabel}</span><strong>{score.breakdown.pacing}</strong></div>
                  <div className="metric-card"><span className="small">{copy.valueLabel}</span><strong>{score.breakdown.valueDensity}</strong></div>
                </div>
              ) : (
                <p className="small">{copy.noPlaybook}</p>
              )}
            </article>
          </div>
        ) : null}

        {activeTab === "structure" ? (
          analysis ? (
            <div className="content-stack">
              <article className="card panel">
                <h2 style={{ marginTop: 0 }}>{copy.hook}</h2>
                <p>{analysis.structure.hookAnalysis}</p>
              </article>
              <article className="card panel">
                <h2 style={{ marginTop: 0 }}>{copy.pacing}</h2>
                <ul className="list">
                  {analysis.structure.pacingNotes.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
              <article className="card panel">
                <h2 style={{ marginTop: 0 }}>{copy.cta}</h2>
                <p>{analysis.structure.ctaReview}</p>
              </article>
            </div>
          ) : (
            <p className="small">{copy.noAnalysis}</p>
          )
        ) : null}

        {activeTab === "thumbnail" ? (
          analysis ? (
            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>{copy.tabs.thumbnail}</h2>
              <p>{copy.score}: <strong>{analysis.thumbnailReview.score}</strong>/100</p>
              <p>{analysis.thumbnailReview.diagnosis}</p>
              <ul className="list">
                {analysis.thumbnailReview.improvements.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ) : (
            <p className="small">{copy.noThumbnail}</p>
          )
        ) : null}

        {activeTab === "audience" ? (
          analysis ? (
            <div className="content-stack">
              <article className="card panel">
                <h2 style={{ marginTop: 0 }}>{copy.tabs.audience}</h2>
                <p className="small">{copy.sentiment}: {analysis.commentsInsights.sentiment}</p>
                <p>{analysis.commentsInsights.audiencePersona}</p>
              </article>
              <article className="card panel">
                <h2 style={{ marginTop: 0 }}>{copy.motivations}</h2>
                <ul className="list">
                  {analysis.commentsInsights.motivations.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
              <article className="card panel">
                <h2 style={{ marginTop: 0 }}>{copy.concerns}</h2>
                <ul className="list">
                  {analysis.commentsInsights.concerns.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
            </div>
          ) : (
            <p className="small">{copy.noAudience}</p>
          )
        ) : null}

        {activeTab === "playbook" ? (
          <div className="content-stack">
            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>{copy.benchmarks}</h2>
              {benchmarks?.topMatches?.length ? (
                <div className="content-stack">
                  {benchmarks.topMatches.map((item) => (
                    <div className="card panel" key={item.id}>
                      <div className="library-card-head">
                        <h3 style={{ margin: 0 }}>{item.title}</h3>
                        <span className="badge">{item.similarity}</span>
                      </div>
                      <div className="split-grid" style={{ marginTop: 12 }}>
                        <div>
                          <p className="small" style={{ fontWeight: 700 }}>{copy.signals}</p>
                          <ul className="list">{item.sharedPoints.map((point) => <li key={point}>{point}</li>)}</ul>
                        </div>
                        <div>
                          <p className="small" style={{ fontWeight: 700 }}>{copy.differences}</p>
                          <ul className="list">{item.differences.map((point) => <li key={point}>{point}</li>)}</ul>
                        </div>
                      </div>
                      <div className="split-grid" style={{ marginTop: 12 }}>
                        <div>
                          <p className="small" style={{ fontWeight: 700 }}>{copy.reuse}</p>
                          <ul className="list">{item.copy.map((point) => <li key={point}>{point}</li>)}</ul>
                        </div>
                        <div>
                          <p className="small" style={{ fontWeight: 700 }}>{copy.avoid}</p>
                          <ul className="list">{item.avoid.map((point) => <li key={point}>{point}</li>)}</ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="small">{copy.noPlaybook}</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>{copy.actions}</h2>
              {score?.topActions?.length ? (
                <ol className="list">
                  {score.topActions.map((item) => <li key={item}>{item}</li>)}
                </ol>
              ) : (
                <p className="small">{copy.noPlaybook}</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>{copy.trace}</h2>
              {trace ? (
                <div className="content-stack">
                  {traceSteps.map((item) => (
                    <div key={item.key} className="card panel">
                      <p style={{ margin: 0, fontWeight: 700 }}>{item.label}</p>
                      <p className="small mono">model: {item.step.model}</p>
                      <p className="small mono">{copy.provider}: {item.step.provider}</p>
                      <p className="small mono">{copy.latency}: {item.step.latencyMs}ms · retries: {item.step.retries}</p>
                      <p className="small mono">{copy.input}: {item.step.inputTokens} · {copy.output}: {item.step.outputTokens} · {copy.total}: {item.step.totalTokens}</p>
                      <p className="small mono">{copy.fallback}: {formatBoolean(item.step.fallbackUsed, lang)}</p>
                      {item.step.providerRequestId ? <p className="small mono">provider_request_id: {item.step.providerRequestId}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="small">{copy.noPlaybook}</p>
              )}
            </article>
          </div>
        ) : null}
      </div>
    </div>
  );
}
