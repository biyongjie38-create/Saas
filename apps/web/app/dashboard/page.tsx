import Link from "next/link";
import { ApiConnectionPanel } from "@/components/api-connection-panel";
import { DashboardClient } from "@/components/dashboard-client";
import { RecentReportsPanel } from "@/components/recent-reports-panel";
import { SiteNav } from "@/components/site-nav";
import { requirePageAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { getDailyLimitByPlan } from "@/lib/quota";
import { isProductionRuntimeMode } from "@/lib/runtime-mode";
import { countUsageForDay, listReports } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const authUser = await requirePageAuthUser("/dashboard");
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  const recentReports = await listReports({ userId: authUser.id, limit: 4 }, { supabaseClient });
  const usedToday = await countUsageForDay(user.id, {
    supabaseClient,
    action: "analyze"
  });
  const dailyLimit = getDailyLimitByPlan(user.plan);
  const remaining = Math.max(0, dailyLimit - usedToday);
  const strictMode = isProductionRuntimeMode();

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <h1 style={{ marginTop: 0 }}>{text(lang, "Console", "控制台")}</h1>
        <p>
          {text(
            lang,
            "Paste one YouTube URL to generate a report. Any analysis settings you need are available directly below this workspace.",
            "在这里输入 YouTube 链接生成报告。分析所需设置会直接放在当前工作区下方。"
          )}
        </p>
        <div className="content-stack">
          <DashboardClient lang={lang} plan={user.plan} strictMode={strictMode} />
          <div className="grid-3">
            <article className="card panel profile-card">
              <p className="card-kicker">{text(lang, "Usage", "用量")}</p>
              <h3>{text(lang, "Today's Analysis Budget", "今日分析额度")}</h3>
              <div className="usage-metric">
                {usedToday} / {dailyLimit}
              </div>
              <p className="small">
                {text(lang, "Remaining today", "今日剩余")}: {remaining}
              </p>
            </article>

            <article className="card panel profile-card">
              <p className="card-kicker">{text(lang, "Reports", "报告")}</p>
              <h3>{text(lang, "Recent Report Snapshot", "最近报告摘要")}</h3>
              <div className="usage-metric">{recentReports.data.length}</div>
              <p className="small">
                {text(lang, "Latest report status follows your live reruns and exports.", "最新报告状态会随着重跑和导出实时更新。")}
              </p>
              <Link className="btn btn-ghost compact-button" href="/dashboard/reports">
                {text(lang, "Open Report History", "打开历史报告")}
              </Link>
            </article>

            <article className="card panel profile-card">
              <p className="card-kicker">{text(lang, "Membership", "会员")}</p>
              <h3>{text(lang, "Plan Controls", "套餐管理")}</h3>
              <p className="small">
                {text(lang, "Current plan", "当前套餐")}: {user.plan}
              </p>
              <p className="small">
                {text(lang, "Subscription status", "订阅状态")}: {user.subscriptionStatus ?? "none"}
              </p>
              <Link className="btn btn-primary compact-button" href="/membership?next=%2Fdashboard">
                {text(lang, "Open Membership", "打开会员页")}
              </Link>
            </article>
          </div>

          <RecentReportsPanel lang={lang} plan={user.plan} initialReports={recentReports.data} />
          <ApiConnectionPanel
            lang={lang}
            plan={user.plan}
            sections={["llm", "pinecone"]}
            title={text(lang, "Connections for Link Analysis", "链接分析所需连接")}
            subtitle={text(
              lang,
              "Complete the connections needed for report generation and comparison here. Saved settings will be reused automatically in the same browser.",
              "在这里补全报告生成与对比所需连接。保存后的设置会在同一浏览器里自动复用。"
            )}
            storageHint={text(
              lang,
              "These settings stay in the current browser and only support the workflows tied to this workspace.",
              "这些设置只会保存在当前浏览器，并用于这个工作区关联的流程。"
            )}
            activeNotice={text(
              lang,
              "Saved analysis connections are reused by link analysis, report reruns, and comparison workflows.",
              "这里保存的分析连接会自动用于链接分析、报告重跑和对比流程。"
            )}
          />
        </div>
      </section>
    </main>
  );
}
