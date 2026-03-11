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
              "会员和个人资料已经拆开，方便你在这里清晰查看套餐状态、额度和登录会话。"
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
                "Your daily limit updates automatically with your current plan, so you can always see how much room is left today.",
                "每日额度会跟随当前套餐自动更新，你可以随时看到今天还剩多少可用次数。"
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
            <h3>{text(lang, "Language & Workspace", "语言与工作区")}</h3>
            <ul className="list">
              <li>{text(lang, "Use the top EN / 中文 switch to change the current interface language.", "使用顶部 EN / 中文 切换当前界面语言。")}</li>
              <li>{text(lang, "Use the dedicated workspaces for link analysis, viral collection, report review, and library management.", "把链接分析、爆款采集、报告查看和爆款库管理分别放在对应工作区里完成。")}</li>
              <li>{text(lang, "Reports, library actions, and advanced workflows follow your current plan permissions.", "报告、爆款库操作和进阶工作流会跟随当前套餐权限。")}</li>
            </ul>
          </article>

          <article className="card panel profile-card">
            <p className="card-kicker">{text(lang, "Security", "安全")}</p>
            <h3>{text(lang, "Account & Session", "账号与会话")}</h3>
            <ul className="list">
              <li>{text(lang, "You can continue to sign in with Google or email, depending on the login option shown on the sign-in page.", "你可以继续使用 Google 或邮箱方式登录，具体取决于登录页展示的选项。")}</li>
              <li>{text(lang, "Your reports, library content, and membership information stay with the account you are currently using.", "你的报告、爆款库内容和会员信息都会跟随当前使用的账号。")}</li>
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
