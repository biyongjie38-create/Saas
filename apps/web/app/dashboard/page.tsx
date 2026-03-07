import { SiteNav } from "@/components/site-nav";
import { DashboardClient } from "@/components/dashboard-client";
import { requirePageAuthUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";

export default async function DashboardPage() {
  await requirePageAuthUser("/dashboard");
  const lang = await getServerLang();

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <h1 style={{ marginTop: 0 }}>{text(lang, "Console", "控制台")}</h1>
        <p>
          {text(
            lang,
            "Paste a YouTube URL to generate a report. API integrations, library, collector, and report history now live on their own pages.",
            "在这里输入 YouTube 链接生成报告。API 对接、爆款库、作品采集和历史报告都已经拆成独立页面。"
          )}
        </p>
        <DashboardClient lang={lang} />
      </section>
    </main>
  );
}
