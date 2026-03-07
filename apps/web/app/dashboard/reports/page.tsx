import { RecentReportsPanel } from "@/components/recent-reports-panel";
import { SiteNav } from "@/components/site-nav";
import { requirePageAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { listReports } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function DashboardReportsPage() {
  const authUser = await requirePageAuthUser("/dashboard/reports");
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  const result = await listReports({ userId: authUser.id, limit: 8 }, { supabaseClient });

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <div className="section-intro compact-intro">
          <span className="badge">Reports</span>
          <h1 style={{ marginTop: 18 }}>{text(lang, "Report History", "历史报告")}</h1>
          <p>
            {text(
              lang,
              "Review previous reports, open previews, rerun analysis, and export from one dedicated screen.",
              "在独立页面里查看历史报告、打开预览、重跑分析并导出结果。"
            )}
          </p>
        </div>
        <RecentReportsPanel lang={lang} plan={user.plan} initialReports={result.data} />
      </section>
    </main>
  );
}
