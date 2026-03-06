import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { requirePageAuthUser, toAppUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { getDailyLimitByPlan } from "@/lib/quota";
import { countUsageForDay } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function SettingsPage() {
  const authUser = await requirePageAuthUser("/settings");
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = toAppUser(authUser);
  const usedToday = await countUsageForDay(user.id, {
    supabaseClient,
    action: "analyze"
  });
  const dailyLimit = getDailyLimitByPlan(user.plan);
  const remaining = Math.max(0, dailyLimit - usedToday);

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <div className="section-intro">
          <span className="badge">{text(lang, "Personal Center", "\u4e2a\u4eba\u4e2d\u5fc3")}</span>
          <h1 style={{ marginTop: 18 }}>
            {text(lang, "Manage profile, preferences, and security", "\u7ba1\u7406\u8d44\u6599\u3001\u504f\u597d\u4e0e\u5b89\u5168")}
          </h1>
          <p>
            {text(
              lang,
              "Move account actions into one place so membership and profile settings stay clearly separated.",
              "\u628a\u8d26\u53f7\u64cd\u4f5c\u96c6\u4e2d\u5230\u4e00\u4e2a\u9875\u9762\uff0c\u8ba9\u8ba2\u9605\u548c\u4e2a\u4eba\u8d44\u6599\u7ba1\u7406\u4fdd\u6301\u5206\u79bb\u3002"
            )}
          </p>
        </div>

        <div className="grid-3">
          <article className="card panel profile-card">
            <p className="card-kicker">{text(lang, "Profile", "\u8d44\u6599")}</p>
            <h3>{text(lang, "Account Overview", "\u8d26\u53f7\u6982\u89c8")}</h3>
            <p className="mono profile-email">{user.email}</p>
            <p className="small">{text(lang, "Current plan", "\u5f53\u524d\u5957\u9910")}: {user.plan}</p>
            <p className="small">
              {text(lang, "Authentication is handled by Supabase Auth.", "\u5f53\u524d\u767b\u5f55\u7531 Supabase Auth \u7edf\u4e00\u7ba1\u7406\u3002")}
            </p>
          </article>

          <article className="card panel profile-card">
            <p className="card-kicker">{text(lang, "Usage", "\u7528\u91cf")}</p>
            <h3>{text(lang, "Daily Analysis Limit", "\u6bcf\u65e5\u5206\u6790\u989d\u5ea6")}</h3>
            <div className="usage-metric">{usedToday} / {dailyLimit}</div>
            <p className="small">{text(lang, "Remaining today", "\u4eca\u65e5\u5269\u4f59")}: {remaining}</p>
            <p className="small">
              {text(
                lang,
                "Free users are hard-limited by API and database guardrails.",
                "\u514d\u8d39\u7528\u6237\u989d\u5ea6\u7531\u63a5\u53e3\u5c42\u548c\u6570\u636e\u5e93\u5c42\u53cc\u91cd\u786c\u62e6\u622a\u3002"
              )}
            </p>
          </article>

          <article className="card panel profile-card">
            <p className="card-kicker">{text(lang, "Membership", "\u4f1a\u5458")}</p>
            <h3>{text(lang, "Plan & Upgrade", "\u5957\u9910\u4e0e\u5347\u7ea7")}</h3>
            <p>
              {text(
                lang,
                user.plan === "pro" ? "You are currently using Pro." : "You are currently using Free.",
                user.plan === "pro"
                  ? "\u4f60\u5f53\u524d\u4f7f\u7528\u7684\u662f\u4e13\u4e1a\u7248\u3002"
                  : "\u4f60\u5f53\u524d\u4f7f\u7528\u7684\u662f\u514d\u8d39\u7248\u3002"
              )}
            </p>
            <p className="small">
              {text(
                lang,
                "View the dedicated membership page to compare Free and Pro features.",
                "\u524d\u5f80\u72ec\u7acb\u7684\u8ba2\u9605\u4f1a\u5458\u9875\u9762\uff0c\u53ef\u67e5\u770b\u514d\u8d39\u7248\u4e0e\u4e13\u4e1a\u7248\u5dee\u5f02\u3002"
              )}
            </p>
            <Link href="/membership" className="btn btn-ghost compact-button">
              {text(lang, "Open Membership", "\u6253\u5f00\u8ba2\u9605\u4f1a\u5458")}
            </Link>
          </article>
        </div>

        <div className="split-grid" style={{ marginTop: 18 }}>
          <article className="card panel profile-card">
            <p className="card-kicker">{text(lang, "Preferences", "\u504f\u597d\u8bbe\u7f6e")}</p>
            <h3>{text(lang, "Language & Experience", "\u8bed\u8a00\u4e0e\u4f53\u9a8c")}</h3>
            <ul className="list">
              <li>
                {text(
                  lang,
                  "The top navigation EN / 中文 switch controls the current UI language.",
                  "\u9876\u90e8\u5bfc\u822a\u4e2d\u7684 EN / \u4e2d\u6587 \u63a7\u5236\u5f53\u524d\u754c\u9762\u8bed\u8a00\u3002"
                )}
              </li>
              <li>
                {text(
                  lang,
                  "Report copy and system prompts follow the current language where supported.",
                  "\u5728\u652f\u6301\u7684\u6a21\u5757\u4e2d\uff0c\u62a5\u544a\u6587\u6848\u4f1a\u5c3d\u91cf\u8ddf\u968f\u5f53\u524d\u8bed\u8a00\u8f93\u51fa\u3002"
                )}
              </li>
              <li>
                {text(
                  lang,
                  "Current experience is optimized for desktop and mobile browsers.",
                  "\u5f53\u524d\u4f53\u9a8c\u5df2\u9002\u914d\u684c\u9762\u7aef\u548c\u79fb\u52a8\u7aef\u6d4f\u89c8\u5668\u3002"
                )}
              </li>
            </ul>
          </article>

          <article className="card panel profile-card">
            <p className="card-kicker">{text(lang, "Security", "\u5b89\u5168")}</p>
            <h3>{text(lang, "Session & Sign Out", "\u4f1a\u8bdd\u4e0e\u9000\u51fa\u767b\u5f55")}</h3>
            <ul className="list">
              <li>
                {text(
                  lang,
                  "All report and usage writes are scoped to the signed-in user via RLS.",
                  "\u62a5\u544a\u4e0e\u7528\u91cf\u5199\u5165\u90fd\u901a\u8fc7 RLS \u7ed1\u5b9a\u5230\u5f53\u524d\u767b\u5f55\u7528\u6237\u3002"
                )}
              </li>
              <li>
                {text(
                  lang,
                  "Magic Link and Google OAuth both return to the same account center experience.",
                  "\u90ae\u7bb1\u9b54\u6cd5\u94fe\u63a5\u4e0e Google OAuth \u6700\u7ec8\u90fd\u4f1a\u56de\u5230\u540c\u4e00\u5957\u4e2a\u4eba\u4e2d\u5fc3\u4f53\u9a8c\u3002"
                )}
              </li>
            </ul>
            <form action="/auth/signout" method="post" style={{ marginTop: 18 }}>
              <button className="btn btn-ghost compact-button" type="submit">
                {text(lang, "Sign Out", "\u9000\u51fa\u767b\u5f55")}
              </button>
            </form>
          </article>
        </div>
      </section>
    </main>
  );
}