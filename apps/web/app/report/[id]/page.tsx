import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { ReportTabs } from "@/components/report-tabs";
import { requirePageAuthUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import {
  localizeAnalysisJson,
  localizeBenchmarksJson,
  localizeScoreJson
} from "@/lib/report-localize";
import { getReportById } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";
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
  const supabaseClient = await createServerSupabaseClient();
  const report = await getReportById(id, authUser.id, { supabaseClient });

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
        <h1 style={{ marginTop: 0 }}>{text(lang, "Viral Report", "爆款报告")}</h1>
        <div className="report-grid">
          <aside className="card panel">
            <p className="small mono">report_id: {report.id}</p>
            <p className={`mono ${classForStatus(report.status)}`}>status: {report.status}</p>
            <h3 style={{ marginBottom: 4 }}>{text(lang, "Viral Score", "爆款评分")}</h3>
            <div style={{ fontSize: 42, fontWeight: 800 }}>{localizedScore?.total ?? "--"}</div>
            <p className="small">video_id: {report.videoId}</p>
            <p className="small">
              {text(lang, "created", "创建时间")}: {new Date(report.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
            </p>
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
