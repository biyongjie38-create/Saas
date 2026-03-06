import { SiteNav } from "@/components/site-nav";
import { ApiConnectionPanel } from "@/components/api-connection-panel";
import { DashboardClient } from "@/components/dashboard-client";
import { RecentReportsPanel } from "@/components/recent-reports-panel";
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
        <p>
          {text(
            lang,
            "Analyze a YouTube URL, connect your own APIs, and manage historical reports in one console.",
            "在同一个控制台里输入 YouTube 链接、对接你自己的 API，并管理历史报告。"
          )}
        </p>

        <DashboardClient lang={lang} />
        <section style={{ marginTop: 24 }}>
          <ApiConnectionPanel lang={lang} />
        </section>
        <RecentReportsPanel lang={lang} initialReports={recentReports} />
      </section>
    </main>
  );
}
