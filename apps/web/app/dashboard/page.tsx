import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { DashboardClient } from "@/components/dashboard-client";
import { requirePageAuthUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { listReports } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const authUser = await requirePageAuthUser("/dashboard");
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const result = await listReports(
    { userId: authUser.id, limit: 8 },
    { supabaseClient }
  );
  const recentReports = result.data;

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <h1 style={{ marginTop: 0 }}>{text(lang, "Dashboard", "控制台")}</h1>
        <p>{text(lang, "Analyze a YouTube URL with streaming task updates and report history.", "输入 YouTube 链接，实时查看任务进度并管理历史报告。")}</p>

        <DashboardClient lang={lang} />

        <section style={{ marginTop: 24 }} className="card panel">
          <h2>{text(lang, "Recent Reports", "最近报告")}</h2>
          {recentReports.length === 0 ? (
            <p className="small">{text(lang, "No reports yet. Run your first analysis.", "还没有报告，先运行一次分析吧。")}</p>
          ) : (
            <ul className="list">
              {recentReports.map((report) => (
                <li key={report.id}>
                  <Link href={`/report/${report.id}`}>
                    {report.id.slice(0, 8)} - {report.videoId} - {report.status}
                    {report.scoreTotal ? ` - ${text(lang, "Score", "评分")} ${report.scoreTotal}` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
