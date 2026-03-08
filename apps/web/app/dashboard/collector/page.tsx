import { ApiConnectionPanel } from "@/components/api-connection-panel";
import { SiteNav } from "@/components/site-nav";
import { ViralCollectorPanel } from "@/components/viral-collector-panel";
import { requirePageAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function DashboardCollectorPage() {
  const authUser = await requirePageAuthUser("/dashboard/collector");
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <div className="content-stack">
          <ViralCollectorPanel lang={lang} plan={user.plan} />
          <ApiConnectionPanel
            lang={lang}
            plan={user.plan}
            sections={["youtube"]}
            title={text(lang, "APIs Required for Viral Collection", "爆款作品采集所需 API")}
            subtitle={text(
              lang,
              "Configure your YouTube Data API key here. This same browser-level key is also reused by single-video fetch and the Hot Trends page.",
              "在这里配置爆款作品采集所需的 YouTube Data API Key。这个 Key 也会在同一浏览器里复用给单视频抓取和“热门趋势”页面。"
            )}
            activeNotice={text(
              lang,
              "This YouTube key is reused by viral collection, single-video fetch, and live trend refresh.",
              "这里保存的 YouTube Key 会被爆款采集、单视频抓取和热门趋势实时刷新自动复用。"
            )}
          />
        </div>
      </section>
    </main>
  );
}
