import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { ReportActions } from "@/components/report-actions";
import { ReportTabs } from "@/components/report-tabs";
import { requirePageAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { localizeAnalysisJson, localizeBenchmarksJson, localizeScoreJson } from "@/lib/report-localize";
import { getReportById, getReportShareAuditSummary } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
import { getVideoByVideoId } from "@/lib/youtube";

type Props = {
  params: Promise<{ id: string }>;
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

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const lang = await getServerLang();
  const authUser = await requirePageAuthUser(`/report/${id}`);
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  const report = await getReportById(id, authUser.id, { supabaseClient });

  if (!report) {
    notFound();
  }

  const video = await getVideoByVideoId(report.videoId, { supabaseClient });
  const shareAudit = await getReportShareAuditSummary(report.id, { supabaseClient });
  const localizedAnalysis = localizeAnalysisJson(lang, report.analysisJson);
  const localizedBenchmarks = localizeBenchmarksJson(lang, report.benchmarksJson);
  const localizedScore = localizeScoreJson(lang, report.scoreJson);
  const shareStatus = report.shareRevokedAt
    ? text(lang, "Revoked", "已撤销")
    : report.shareExpiresAt && new Date(report.shareExpiresAt).getTime() <= Date.now() // eslint-disable-line react-hooks/purity
      ? text(lang, "Expired", "已过期")
      : report.shareEnabledAt && report.shareExpiresAt
        ? text(lang, "Active", "生效中")
        : text(lang, "Not shared", "未分享");

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <div className="report-shell-head">
          <div>
            <h1 style={{ marginTop: 0 }}>{text(lang, "Viral Report", "爆款报告")}</h1>
            <p className="small">
              {text(
                lang,
                "Review the full analysis, then share, rerun with live data, or export the current report.",
                "查看完整分析后，可以继续分享链接、用真实数据重跑，或导出当前报告。"
              )}
            </p>
          </div>
          <ReportActions
            lang={lang}
            plan={user.plan}
            reportId={report.id}
            shareToken={report.shareToken}
            shareEnabledAt={report.shareEnabledAt}
            shareExpiresAt={report.shareExpiresAt}
            shareRevokedAt={report.shareRevokedAt}
          />
        </div>

        <div className="report-grid">
          <aside className="card panel report-side-stack">
            <p className="small mono">report_id: {report.id}</p>
            <p className={`mono ${classForStatus(report.status)}`}>status: {report.status}</p>
            <h3 style={{ marginBottom: 4 }}>{text(lang, "Viral Score", "爆款评分")}</h3>
            <div style={{ fontSize: 42, fontWeight: 800 }}>{localizedScore?.total ?? "--"}</div>
            <p className="small mono">video_id: {report.videoId}</p>
            <p className="small">
              {text(lang, "Created", "创建时间")}: {new Date(report.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
            </p>
            <p className="small">{text(lang, "Share status", "分享状态")}: {shareStatus}</p>
            {report.shareExpiresAt ? (
              <p className="small">
                {text(lang, "Share expires", "分享到期")}: {new Date(report.shareExpiresAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
              </p>
            ) : null}
            <p className="small">{text(lang, "Share views", "访问次数")}: {shareAudit.accessCount}</p>
            {shareAudit.lastAccessedAt ? (
              <p className="small">
                {text(lang, "Last viewed", "最近访问")}: {new Date(shareAudit.lastAccessedAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
              </p>
            ) : null}
          </aside>

          <ReportTabs
            lang={lang}
            video={video}
            analysis={localizedAnalysis}
            benchmarks={localizedBenchmarks}
            score={localizedScore}
            trace={report.modelTrace}
          />
        </div>
      </section>
    </main>
  );
}

