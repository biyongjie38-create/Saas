import { SiteNav } from "@/components/site-nav";
import { requirePageAuthUser, toAppUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { countUsageForDay } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function SettingsPage() {
  const authUser = await requirePageAuthUser("/settings");
  const lang = await getServerLang();
  const supabaseClient = await createServerSupabaseClient();
  const user = toAppUser(authUser);
  const usedToday = await countUsageForDay(user.id, { supabaseClient });
  const dailyLimit = user.plan === "free" ? 5 : 200;

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <h1 style={{ marginTop: 0 }}>{text(lang, "Settings", "设置")}</h1>
        <div className="grid-3">
          <article className="card panel">
            <h3>{text(lang, "Account", "账号")}</h3>
            <p className="mono">{user.email}</p>
            <p className="small">{text(lang, "Plan", "套餐")}: {user.plan}</p>
          </article>

          <article className="card panel">
            <h3>{text(lang, "Usage", "用量")}</h3>
            <p>
              {text(lang, "Today", "今日")} {usedToday} / {dailyLimit}
            </p>
            <p className="small">{text(lang, "Data backend follows DATA_BACKEND setting (mock or supabase).", "数据后端遵循 DATA_BACKEND 配置（mock 或 supabase）。")}</p>
          </article>

          <article className="card panel">
            <h3>{text(lang, "Pro Plan", "专业版")}</h3>
            <p>{text(lang, "Pro waitlist is open (MVP placeholder).", "专业版候补列表已开放（MVP 占位）。")}</p>
            <button className="btn btn-ghost" type="button">
              {text(lang, "Join Waitlist", "加入候补")}
            </button>
          </article>
        </div>
      </section>
    </main>
  );
}

