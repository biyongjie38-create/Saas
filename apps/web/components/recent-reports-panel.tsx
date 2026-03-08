"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n-shared";
import { localizeAnalysisJson, localizeBenchmarksJson, localizeScoreJson } from "@/lib/report-localize";
import type { Report, UserPlan, YoutubeVideo } from "@/lib/types";
import { ReportTabs } from "@/components/report-tabs";
import { ReportActions } from "@/components/report-actions";

type Props = {
  lang: Lang;
  plan: UserPlan;
  initialReports: Report[];
};

type ReportsEnvelope = {
  ok: boolean;
  data: {
    items: Report[];
  } | null;
  error?: {
    message?: string;
  } | null;
};

type ReportDetailEnvelope = {
  ok: boolean;
  data: {
    report: Report;
    video: YoutubeVideo | null;
  } | null;
  error?: {
    message?: string;
  } | null;
};

type PreviewPayload = {
  report: Report;
  video: YoutubeVideo | null;
};

type Copy = {
  title: string;
  empty: string;
  preview: string;
  open: string;
  loading: string;
  previewTitle: string;
  close: string;
  openFull: string;
  created: string;
  score: string;
  status: string;
  failed: string;
};

const copyByLang: Record<Lang, Copy> = {
  en: {
    title: "Recent Reports",
    empty: "No reports yet. Run your first analysis.",
    preview: "View Report Analysis",
    open: "Open Full Report",
    loading: "Loading report preview...",
    previewTitle: "Report Preview",
    close: "Close",
    openFull: "Open Full Report",
    created: "Created",
    score: "Score",
    status: "Status",
    failed: "Could not load report preview."
  },
  zh: {
    title: "最近报告",
    empty: "还没有报告，先运行一次分析吧。",
    preview: "查看报告分析",
    open: "打开完整报告",
    loading: "正在加载报告预览...",
    previewTitle: "报告预览",
    close: "关闭",
    openFull: "打开完整报告",
    created: "创建时间",
    score: "评分",
    status: "状态",
    failed: "加载报告预览失败。"
  }
};

function classForStatus(status: string): string {
  if (status === "done") {
    return "status-done";
  }
  if (status === "failed") {
    return "status-failed";
  }
  return "status-running";
}

export function RecentReportsPanel({ lang, plan, initialReports }: Props) {
  const copy = copyByLang[lang];
  const [reports, setReports] = useState(initialReports);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewPayload, setPreviewPayload] = useState<PreviewPayload | null>(null);

  async function refreshReports() {
    setLoading(true);
    try {
      const response = await fetch("/api/reports?limit=8", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ReportsEnvelope | null;
      if (response.ok && payload?.ok && payload.data?.items) {
        setReports(payload.data.items);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handler = () => {
      void refreshReports();
    };

    window.addEventListener("viralbrain:reports-refresh", handler);
    return () => window.removeEventListener("viralbrain:reports-refresh", handler);
  }, []);

  async function openPreview(reportId: string) {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewPayload(null);

    try {
      const response = await fetch(`/api/reports/${reportId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ReportDetailEnvelope | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        setPreviewError(payload?.error?.message ?? copy.failed);
        return;
      }

      setPreviewPayload(payload.data);
    } catch {
      setPreviewError(copy.failed);
    } finally {
      setPreviewLoading(false);
    }
  }

  const localizedPreview = useMemo(() => {
    if (!previewPayload) {
      return null;
    }

    return {
      report: previewPayload.report,
      video: previewPayload.video,
      analysis: localizeAnalysisJson(lang, previewPayload.report.analysisJson),
      benchmarks: localizeBenchmarksJson(lang, previewPayload.report.benchmarksJson),
      score: localizeScoreJson(lang, previewPayload.report.scoreJson)
    };
  }, [lang, previewPayload]);

  return (
    <section style={{ marginTop: 24 }} className="card panel">
      <div className="library-card-head">
        <h2 style={{ margin: 0 }}>{copy.title}</h2>
        {loading ? <span className="small">...</span> : null}
      </div>

      {reports.length === 0 ? (
        <p className="small">{copy.empty}</p>
      ) : (
        <div className="recent-reports-stack">
          {reports.map((report) => (
            <article key={report.id} className="card panel recent-report-card">
              <div className="recent-report-main">
                <div>
                  <p className="small mono">report_id: {report.id.slice(0, 8)}</p>
                  <h3 style={{ margin: "4px 0 8px" }}>{report.videoId}</h3>
                  <p className={`small mono ${classForStatus(report.status)}`}>{copy.status}: {report.status}</p>
                  <p className="small">{copy.created}: {new Date(report.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}</p>
                </div>
                <div className="recent-report-score">
                  <span className="small">{copy.score}</span>
                  <strong>{report.scoreTotal ?? "--"}</strong>
                </div>
              </div>

              <div className="recent-report-actions">
                <button type="button" className="btn btn-primary report-history-action" onClick={() => openPreview(report.id)}>
                  {copy.preview}
                </button>
                <Link href={`/report/${report.id}`} className="btn btn-ghost report-history-action">
                  {copy.open}
                </Link>
              </div>
              <ReportActions
                lang={lang}
                plan={plan}
                reportId={report.id}
                shareToken={report.shareToken}
                shareEnabledAt={report.shareEnabledAt}
                shareExpiresAt={report.shareExpiresAt}
                shareRevokedAt={report.shareRevokedAt}
                compact
                onRerunCreated={() => void refreshReports()}
              />
            </article>
          ))}
        </div>
      )}

      {previewOpen ? (
        <div className="modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="modal-shell report-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="card-kicker">{copy.previewTitle}</p>
                <h2 style={{ margin: 0 }}>{localizedPreview?.report.id.slice(0, 8) ?? "--"}</h2>
              </div>
              <button type="button" className="btn btn-ghost compact-button" onClick={() => setPreviewOpen(false)}>
                {copy.close}
              </button>
            </div>

            {previewLoading ? <p className="small">{copy.loading}</p> : null}
            {previewError ? <p className="status-failed">{previewError}</p> : null}

            {localizedPreview ? (
              <div className="report-preview-body">
                <aside className="card panel report-preview-side">
                  <p className="small mono">report_id: {localizedPreview.report.id}</p>
                  <p className={`mono ${classForStatus(localizedPreview.report.status)}`}>status: {localizedPreview.report.status}</p>
                  <h3 style={{ marginBottom: 4 }}>{copy.score}</h3>
                  <div style={{ fontSize: 42, fontWeight: 800 }}>{localizedPreview.score?.total ?? "--"}</div>
                  <p className="small mono">video_id: {localizedPreview.report.videoId}</p>
                  <p className="small">{copy.created}: {new Date(localizedPreview.report.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}</p>
                  <Link href={`/report/${localizedPreview.report.id}`} className="btn btn-primary report-history-action" style={{ marginTop: 16 }}>
                    {copy.openFull}
                  </Link>
                  <ReportActions
                    lang={lang}
                    plan={plan}
                    reportId={localizedPreview.report.id}
                    shareToken={localizedPreview.report.shareToken}
                    shareEnabledAt={localizedPreview.report.shareEnabledAt}
                    shareExpiresAt={localizedPreview.report.shareExpiresAt}
                    shareRevokedAt={localizedPreview.report.shareRevokedAt}
                    includePrint={false}
                  />
                </aside>

                <ReportTabs
                  lang={lang}
                  video={localizedPreview.video}
                  analysis={localizedPreview.analysis}
                  benchmarks={localizedPreview.benchmarks}
                  score={localizedPreview.score}
                  trace={localizedPreview.report.modelTrace}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

