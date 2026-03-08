import { ApiConnectionPanel } from "@/components/api-connection-panel";
import { DashboardClient } from "@/components/dashboard-client";
import { SiteNav } from "@/components/site-nav";
import { requirePageAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const authUser = await requirePageAuthUser("/dashboard");
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });

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
          <DashboardClient lang={lang} />
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
