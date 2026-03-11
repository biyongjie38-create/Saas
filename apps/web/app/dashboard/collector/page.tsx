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
            title={text(lang, "Connections for Viral Collection", "爆款作品采集所需连接")}
            subtitle={text(
              lang,
              "Complete the collection connection here. Once saved, it can also support related fetch and trend workflows in the same browser.",
              "在这里完成采集所需连接。保存后，也会在同一浏览器里支持相关抓取和趋势流程。"
            )}
            storageHint={text(
              lang,
              "These settings stay in the current browser and support collection plus related discovery workflows.",
              "这些设置只会保存在当前浏览器，并支持采集和相关发现流程。"
            )}
            activeNotice={text(
              lang,
              "Saved collection settings are reused by viral collection and nearby content discovery workflows.",
              "这里保存的采集连接会自动复用于爆款采集和相关内容发现流程。"
            )}
          />
        </div>
      </section>
    </main>
  );
}
