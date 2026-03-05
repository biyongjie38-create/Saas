import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { requirePageAuthUser } from "@/lib/auth";
import { getReportById } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getVideoByVideoId } from "@/lib/youtube";

const sourceLabel: Record<string, string> = {
  youtube_api: "Live API",
  mock_demo: "Mock Demo",
  mock_synthetic: "Mock Synthetic"
};

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
  const authUser = await requirePageAuthUser(`/report/${id}`);
  const supabaseClient = await createServerSupabaseClient();
  const report = await getReportById(id, authUser.id, { supabaseClient });

  if (!report) {
    notFound();
  }

  const video = await getVideoByVideoId(report.videoId, { supabaseClient });

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <h1 style={{ marginTop: 0 }}>Viral Report</h1>
        <div className="report-grid">
          <aside className="card panel">
            <p className="small mono">report_id: {report.id}</p>
            <p className={`mono ${classForStatus(report.status)}`}>status: {report.status}</p>
            <h3 style={{ marginBottom: 4 }}>Viral Score</h3>
            <div style={{ fontSize: 42, fontWeight: 800 }}>{report.scoreJson?.total ?? "--"}</div>
            <p className="small">video_id: {report.videoId}</p>
            <p className="small">created: {new Date(report.createdAt).toLocaleString("en-US")}</p>
          </aside>

          <div style={{ display: "grid", gap: 16 }}>
            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>Video Snapshot</h2>
              {video ? (
                <>
                  <p>
                    <strong>{video.title}</strong>
                  </p>
                  <p className="small">{video.channelName}</p>
                  <p className="small">
                    source: <span className="badge">{sourceLabel[video.dataSource] ?? video.dataSource}</span>
                  </p>
                  <p className="small mono">
                    views {video.stats.viewCount.toLocaleString()} - likes {video.stats.likeCount.toLocaleString()} - comments {video.stats.commentCount.toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="small">No cached video data found.</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>Structure Breakdown</h2>
              {report.analysisJson ? (
                <>
                  <p>{report.analysisJson.structure.hookAnalysis}</p>
                  <ul className="list">
                    {report.analysisJson.structure.pacingNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                  <p className="small">CTA: {report.analysisJson.structure.ctaReview}</p>
                </>
              ) : (
                <p className="small">Analysis not ready yet.</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>Thumbnail Review</h2>
              {report.analysisJson ? (
                <>
                  <p>
                    score <strong>{report.analysisJson.thumbnailReview.score}</strong>/100
                  </p>
                  <p>{report.analysisJson.thumbnailReview.diagnosis}</p>
                  <ul className="list">
                    {report.analysisJson.thumbnailReview.improvements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="small">No thumbnail review yet.</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>Comments & Audience</h2>
              {report.analysisJson ? (
                <>
                  <p className="small">sentiment: {report.analysisJson.commentsInsights.sentiment}</p>
                  <p>{report.analysisJson.commentsInsights.audiencePersona}</p>
                  <ul className="list">
                    {report.analysisJson.commentsInsights.motivations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="small">No comments insight yet.</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>Top3 Benchmarks</h2>
              {report.benchmarksJson?.topMatches?.length ? (
                <ul className="list">
                  {report.benchmarksJson.topMatches.map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong> - similarity {item.similarity}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small">No benchmark result yet.</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>Action List</h2>
              {report.scoreJson?.topActions?.length ? (
                <ol className="list">
                  {report.scoreJson.topActions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              ) : (
                <p className="small">No action list yet.</p>
              )}
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
