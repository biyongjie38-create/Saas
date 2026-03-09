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
            "Paste a YouTube URL to generate a report. Provider and Pinecone setup now lives directly below the analysis workspace.",
            "在这里输入 YouTube 链接生成报告。模型供应商和 Pinecone 配置现在直接放在链接分析区域下方。"
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
                {text(lang, "Latest report status follows your live reruns and exports.", "最新报告状态会随重跑和导出实时更新。")}
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
            title={text(lang, "APIs Required for Link Analysis", "链接分析所需 API")}
            subtitle={text(
              lang,
              "Configure your model provider and optional Pinecone retrieval here. The YouTube Data API key is now managed on the Viral Collector page and is shared across the same browser session.",
              "在这里配置链接分析所需的模型供应商，以及可选的 Pinecone 对标检索。YouTube Data API Key 已移动到“爆款作品采集”页面下方，并会在同一浏览器里共享给单视频抓取和热门趋势。"
            )}
            activeNotice={text(
              lang,
              "These settings are reused by link analysis, report reruns, and benchmark retrieval.",
              "这里保存的配置会被链接分析、报告重跑和对标检索自动复用。"
            )}
          />
        </div>
      </section>
    </main>
  );
}
