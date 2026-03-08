import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { requirePageAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { listMembershipOrders } from "@/lib/membership-store";
import { getDailyLimitByPlan } from "@/lib/quota";
import { countUsageForDay } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function SettingsPage() {
  const authUser = await requirePageAuthUser("/settings");
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  const orders = await listMembershipOrders(authUser.id, { supabaseClient });
  const usedToday = await countUsageForDay(user.id, {
    supabaseClient,
    action: "analyze"
  });
  const dailyLimit = getDailyLimitByPlan(user.plan);
  const remaining = Math.max(0, dailyLimit - usedToday);
  const latestOrder = orders[0] ?? null;

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <div className="section-intro">
          <span className="badge">{text(lang, "Personal Center", "个人中心")}</span>
          <h1 style={{ marginTop: 18 }}>{text(lang, "Manage profile, plan, and session settings", "统一管理账号资料、套餐和会话设置")}</h1>
          <p>
            {text(
              lang,
              "Membership and profile controls are separated so users can clearly manage plan status, usage, and sign-out in one place.",
              "会员体系和个人资料已经拆开，用户可以在这里清晰管理套餐状态、用量和退出登录。"
            )}
          </p>
        </div>

        <div className="grid-3">
          <article className="card panel profile-card">
            <p className="card-kicker">{text(lang, "Profile", "资料")}</p>
            <h3>{text(lang, "Account Overview", "账号概览")}</h3>
            <p className="mono profile-email">{user.email}</p>
            <p className="small">
              {text(lang, "Current plan", "当前套餐")}: {user.plan}
            </p>
            <p className="small">
              {text(lang, "Subscription status", "订阅状态")}: {user.subscriptionStatus ?? "none"}
            </p>
            {user.planExpiresAt ? (
              <p className="small">
                {text(lang, "Expires", "到期时间")}: {new Date(user.planExpiresAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
              </p>
            ) : null}
          </article>

          <article className="card panel profile-card">
            <p className="card-kicker">{text(lang, "Usage", "用量")}</p>
            <h3>{text(lang, "Daily Analysis Limit", "每日分析额度")}</h3>
            <div className="usage-metric">
              {usedToday} / {dailyLimit}
            </div>
            <p className="small">
              {text(lang, "Remaining today", "今日剩余")}: {remaining}
            </p>
            <p className="small">
              {text(
                lang,
                "Usage is hard-limited in the API and the database. Free and Pro plan capabilities are enforced server-side.",
                "额度限制已经在接口层和数据库层硬拦截，免费版和专业版能力也已经在服务端做了权限控制。"
              )}
            </p>
          </article>

          <article id="membership" className="card panel profile-card" style={{ scrollMarginTop: 96 }}>
            <p className="card-kicker">{text(lang, "Subscription", "订阅")}</p>
            <h3>{text(lang, "Membership Status", "会员状态")}</h3>
            <p className="small">
              {text(lang, "Current plan", "当前套餐")}: {user.plan}
            </p>
            <p className="small">
              {text(lang, "Billing cycle", "计费周期")}: {user.billingCycle ?? (lang === "zh" ? "未开通" : "none")}
            </p>
            {latestOrder ? (
              <>
                <p className="small mono">order_id: {latestOrder.id.slice(0, 8)}</p>
                <p className="small">
                  {text(lang, "Latest amount", "最近金额")}: CNY {latestOrder.amountCny}
                </p>
              </>
            ) : (
              <p className="small">{text(lang, "No membership orders yet.", "还没有会员订单。")}</p>
            )}
            <Link className="btn btn-primary compact-button" href="/membership?next=%2Fsettings">
              {text(lang, "Open Membership", "查看会员方案")}
            </Link>
          </article>
        </div>

        <div className="split-grid" style={{ marginTop: 18 }}>
          <article className="card panel profile-card">
            <p className="card-kicker">{text(lang, "Preferences", "偏好设置")}</p>
            <h3>{text(lang, "Language & Integrations", "语言与 API 配置")}</h3>
            <ul className="list">
              <li>{text(lang, "Use the top EN / 中文 switch to change the current interface language.", "使用顶部 EN / 中文 切换当前界面语言。")}</li>
              <li>{text(lang, "Configure model providers below Link Analysis, and configure YouTube below Viral Collector.", "在“链接分析”下方配置模型供应商，在“爆款作品采集”下方配置 YouTube。")}</li>
              <li>{text(lang, "Reports, library operations, and rerun capability follow the current plan permissions.", "报告、爆款库和重跑能力都会跟随当前套餐权限。")}</li>
            </ul>
          </article>

          <article className="card panel profile-card">
            <p className="card-kicker">{text(lang, "Security", "安全")}</p>
            <h3>{text(lang, "Session & Sign Out", "会话与退出登录")}</h3>
            <ul className="list">
              <li>{text(lang, "Supabase Auth manages Google OAuth and Email Magic Link sign-in.", "当前登录由 Supabase Auth 统一管理，支持 Google OAuth 和邮箱魔法链接。")}</li>
              <li>{text(lang, "All report and usage writes remain bound to the signed-in user by RLS.", "报告和用量写入都通过 RLS 绑定到当前登录用户。")}</li>
            </ul>
            <form action="/auth/signout" method="post" style={{ marginTop: 18 }}>
              <button className="btn btn-ghost compact-button" type="submit">
                {text(lang, "Sign Out", "退出登录")}
              </button>
            </form>
          </article>
        </div>
      </section>
    </main>
  );
}
