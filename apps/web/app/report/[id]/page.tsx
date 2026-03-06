import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { requirePageAuthUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
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
  const lang = await getServerLang();
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
        <h1 style={{ marginTop: 0 }}>{text(lang, "Viral Report", "爆款报告")}</h1>
        <div className="report-grid">
          <aside className="card panel">
            <p className="small mono">report_id: {report.id}</p>
            <p className={`mono ${classForStatus(report.status)}`}>status: {report.status}</p>
            <h3 style={{ marginBottom: 4 }}>{text(lang, "Viral Score", "爆款评分")}</h3>
            <div style={{ fontSize: 42, fontWeight: 800 }}>{report.scoreJson?.total ?? "--"}</div>
            <p className="small">video_id: {report.videoId}</p>
            <p className="small">{text(lang, "created", "创建时间")}: {new Date(report.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}</p>
          </aside>

          <div style={{ display: "grid", gap: 16 }}>
            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>{text(lang, "Video Snapshot", "视频快照")}</h2>
              {video ? (
                <>
                  <p>
                    <strong>{video.title}</strong>
                  </p>
                  <p className="small">{video.channelName}</p>
                  <p className="small">
                    {text(lang, "source", "来源")}: <span className="badge">{sourceLabel[video.dataSource] ?? video.dataSource}</span>
                  </p>
                  <p className="small mono">
                    {text(lang, "views", "播放")} {video.stats.viewCount.toLocaleString()} - {text(lang, "likes", "点赞")} {video.stats.likeCount.toLocaleString()} - {text(lang, "comments", "评论")} {video.stats.commentCount.toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="small">{text(lang, "No cached video data found.", "未找到缓存视频数据。")}</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>{text(lang, "Structure Breakdown", "结构拆解")}</h2>
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
                <p className="small">{text(lang, "Analysis not ready yet.", "分析结果暂未就绪。")}</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>{text(lang, "Thumbnail Review", "封面评估")}</h2>
              {report.analysisJson ? (
                <>
                  <p>
                    {text(lang, "score", "评分")} <strong>{report.analysisJson.thumbnailReview.score}</strong>/100
                  </p>
                  <p>{report.analysisJson.thumbnailReview.diagnosis}</p>
                  <ul className="list">
                    {report.analysisJson.thumbnailReview.improvements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="small">{text(lang, "No thumbnail review yet.", "暂无封面评估。")}</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>{text(lang, "Comments & Audience", "评论与受众")}</h2>
              {report.analysisJson ? (
                <>
                  <p className="small">{text(lang, "sentiment", "情绪")}: {report.analysisJson.commentsInsights.sentiment}</p>
                  <p>{report.analysisJson.commentsInsights.audiencePersona}</p>
                  <ul className="list">
                    {report.analysisJson.commentsInsights.motivations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="small">{text(lang, "No comments insight yet.", "暂无评论洞察。")}</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>{text(lang, "Top3 Benchmarks", "Top3 对标案例")}</h2>
              {report.benchmarksJson?.topMatches?.length ? (
                <ul className="list">
                  {report.benchmarksJson.topMatches.map((item) => (
                    <li key={item.id}>
                      <strong>{item.title}</strong> - {text(lang, "similarity", "相似度")} {item.similarity}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small">{text(lang, "No benchmark result yet.", "暂无对标结果。")}</p>
              )}
            </article>

            <article className="card panel">
              <h2 style={{ marginTop: 0 }}>{text(lang, "Action List", "行动清单")}</h2>
              {report.scoreJson?.topActions?.length ? (
                <ol className="list">
                  {report.scoreJson.topActions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              ) : (
                <p className="small">{text(lang, "No action list yet.", "暂无行动清单。")}</p>
              )}
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}

