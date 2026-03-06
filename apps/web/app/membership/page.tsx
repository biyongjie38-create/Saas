import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { requirePageAuthUser, toAppUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { getDailyLimitByPlan, PRO_DAILY_LIMIT } from "@/lib/quota";
import { countUsageForDay } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function MembershipPage() {
  const authUser = await requirePageAuthUser("/membership");
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = toAppUser(authUser);
  const usedToday = await countUsageForDay(user.id, {
    supabaseClient,
    action: "analyze"
  });
  const currentLimit = getDailyLimitByPlan(user.plan);

  const freeFeatures = [
    text(lang, `Up to ${getDailyLimitByPlan("free")} analyses per day`, `\u6bcf\u5929\u6700\u591a ${getDailyLimitByPlan("free")} \u6b21\u5206\u6790`),
    text(lang, "Full 5-tab report view", "\u5b8c\u6574 5 Tab \u62a5\u544a\u9875"),
    text(lang, "Viral Library search and manual import", "\u652f\u6301\u7206\u6b3e\u5e93\u641c\u7d22\u4e0e\u624b\u52a8\u5bfc\u5165"),
    text(lang, "Bilingual interface switching", "\u652f\u6301\u4e2d\u82f1\u6587\u754c\u9762\u5207\u6362"),
    text(lang, "Best for demos and lightweight creator workflows", "\u9002\u5408\u6f14\u793a\u3001\u9762\u8bd5\u5c55\u793a\u4e0e\u65e9\u671f\u9a8c\u8bc1")
  ];

  const proFeatures = [
    text(lang, `Up to ${PRO_DAILY_LIMIT} analyses per day`, `\u6bcf\u5929\u6700\u591a ${PRO_DAILY_LIMIT} \u6b21\u5206\u6790`),
    text(lang, "Priority access to real-model routing when enabled", "\u5f00\u542f\u540e\u4f18\u5148\u4f7f\u7528\u771f\u5b9e\u6a21\u578b\u94fe\u8def"),
    text(lang, "Expanded library operations and batch workflow support", "\u6269\u5c55\u7206\u6b3e\u5e93\u8fd0\u8425\u80fd\u529b\u4e0e\u6279\u91cf\u5de5\u4f5c\u6d41\u652f\u6301"),
    text(lang, "Shareable reports and advanced exports in roadmap", "\u89c4\u5212\u4e2d\u7684\u62a5\u544a\u5206\u4eab\u4e0e\u9ad8\u7ea7\u5bfc\u51fa\u80fd\u529b"),
    text(lang, "Early access to new AI features and support", "\u4f18\u5148\u4f53\u9a8c\u65b0 AI \u80fd\u529b\u4e0e\u652f\u6301")
  ];

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <div className="section-intro membership-intro">
          <span className="badge">{text(lang, "Membership", "\u8ba2\u9605\u4f1a\u5458")}</span>
          <h1 style={{ marginTop: 18 }}>
            {text(lang, "Choose the plan that fits your analysis workflow", "\u9009\u62e9\u66f4\u9002\u5408\u4f60\u5206\u6790\u5de5\u4f5c\u6d41\u7684\u5957\u9910")}
          </h1>
          <p>
            {text(
              lang,
              "Free is live today. Pro is presented as a preview tier so users can understand the difference before billing opens.",
              "\u514d\u8d39\u7248\u5f53\u524d\u5df2\u53ef\u4f7f\u7528\uff0c\u4e13\u4e1a\u7248\u5148\u4ee5\u9884\u89c8\u5f62\u5f0f\u5c55\u793a\uff0c\u65b9\u4fbf\u7528\u6237\u5728\u8ba1\u8d39\u5f00\u653e\u524d\u7406\u89e3\u4e24\u8005\u5dee\u5f02\u3002"
            )}
          </p>
          <div className="membership-summary-row">
            <span className="badge">{text(lang, "Current plan", "\u5f53\u524d\u5957\u9910")}: {user.plan}</span>
            <span className="badge">{text(lang, "Used today", "\u4eca\u65e5\u5df2\u7528")}: {usedToday}/{currentLimit}</span>
          </div>
        </div>

        <div className="plan-grid">
          <article className={`card panel plan-card plan-card-free ${user.plan === "free" ? "plan-card-current" : ""}`}>
            <div className="plan-card-head">
              <div>
                <p className="card-kicker">{text(lang, "Available Now", "\u5f53\u524d\u53ef\u7528")}</p>
                <h2>{text(lang, "Free", "\u514d\u8d39\u7248")}</h2>
              </div>
              {user.plan === "free" ? <span className="plan-pill">{text(lang, "Current", "\u5f53\u524d\u4f7f\u7528")}</span> : null}
            </div>
            <div className="plan-price-row">
              <span className="plan-price">CNY 0</span>
              <span className="plan-cycle">/ {text(lang, "month", "\u6708")}</span>
            </div>
            <p className="small plan-desc">
              {text(lang, "Best for demos, interview showcases, and early creator validation.", "\u9002\u5408\u6f14\u793a\u3001\u9762\u8bd5\u5c55\u793a\u4e0e\u65e9\u671f\u9a8c\u8bc1\u3002")}
            </p>
            <ul className="plan-feature-list">
              {freeFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className="plan-actions">
              <Link href="/dashboard" className="btn btn-primary plan-action-button">
                {text(lang, "Use Free Plan", "\u7ee7\u7eed\u4f7f\u7528\u514d\u8d39\u7248")}
              </Link>
            </div>
          </article>

          <article className={`card panel plan-card plan-card-pro ${user.plan === "pro" ? "plan-card-current" : ""}`}>
            <div className="plan-card-head">
              <div>
                <p className="card-kicker">{text(lang, "Pro Preview", "\u4e13\u4e1a\u7248\u9884\u89c8")}</p>
                <h2>{text(lang, "Professional", "\u4e13\u4e1a\u7248")}</h2>
              </div>
              {user.plan === "pro" ? (
                <span className="plan-pill">{text(lang, "Current", "\u5f53\u524d\u4f7f\u7528")}</span>
              ) : (
                <span className="plan-pill plan-pill-preview">{text(lang, "Waitlist", "\u5019\u8865\u4e2d")}</span>
              )}
            </div>
            <div className="plan-price-row">
              <span className="plan-price">CNY 99</span>
              <span className="plan-cycle">/ {text(lang, "month", "\u6708")}</span>
            </div>
            <p className="small plan-desc">
              {text(lang, "Built for heavier usage, faster iteration, and future advanced creator workflows.", "\u9762\u5411\u66f4\u9ad8\u9891\u5206\u6790\u3001\u66f4\u5feb\u8fed\u4ee3\u548c\u540e\u7eed\u9ad8\u7ea7\u5de5\u4f5c\u6d41\u3002")}
            </p>
            <ul className="plan-feature-list">
              {proFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className="plan-actions plan-actions-stacked">
              <button type="button" className="btn btn-primary plan-action-button">
                {text(lang, "Join Pro Waitlist", "\u52a0\u5165\u4e13\u4e1a\u7248\u5019\u8865")}
              </button>
              <Link href="/settings" className="btn btn-ghost plan-action-button">
                {text(lang, "Open Personal Center", "\u524d\u5f80\u4e2a\u4eba\u4e2d\u5fc3")}
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}