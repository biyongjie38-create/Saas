import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { ReportTabs } from "@/components/report-tabs";
import { getServerLang, text } from "@/lib/i18n";
import { localizeAnalysisJson, localizeBenchmarksJson, localizeScoreJson } from "@/lib/report-localize";
import { getReportByShareToken } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
import { getVideoByVideoId } from "@/lib/youtube";

type Props = {
  params: Promise<{ token: string }>;
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

export default async function SharedReportPage({ params }: Props) {
  const { token } = await params;
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const report = await getReportByShareToken(token, { supabaseClient });

  if (!report) {
    notFound();
  }

  const video = await getVideoByVideoId(report.videoId, { supabaseClient });
  const localizedAnalysis = localizeAnalysisJson(lang, report.analysisJson);
  const localizedBenchmarks = localizeBenchmarksJson(lang, report.benchmarksJson);
  const localizedScore = localizeScoreJson(lang, report.scoreJson);

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <div className="section-intro share-hero">
          <span className="badge">{text(lang, "Shared Report", "分享报告")}</span>
          <h1 style={{ marginTop: 18 }}>{text(lang, "A shared ViralBrain.ai report", "一份已分享的 ViralBrain.ai 报告")}</h1>
          <p>
            {text(
              lang,
              "This report was shared via a public link. Review the score, structure, and playbook without signing in.",
              "这份报告通过公开链接分享，可在不登录的情况下查看评分、结构拆解和行动方案。"
            )}
          </p>
        </div>

        <div className="report-grid">
          <aside className="card panel report-side-stack">
            <p className="small mono">report_id: {report.id}</p>
            <p className={`mono ${classForStatus(report.status)}`}>status: {report.status}</p>
            <h3 style={{ marginBottom: 4 }}>{text(lang, "Viral Score", "爆款评分")}</h3>
            <div style={{ fontSize: 42, fontWeight: 800 }}>{localizedScore?.total ?? "--"}</div>
            <p className="small mono">video_id: {report.videoId}</p>
            <p className="small">{text(lang, "Created", "创建时间")}: {new Date(report.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}</p>
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

