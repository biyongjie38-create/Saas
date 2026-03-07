import { ApiConnectionPanel } from "@/components/api-connection-panel";
import { SiteNav } from "@/components/site-nav";
import { requirePageAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function DashboardIntegrationsPage() {
  const authUser = await requirePageAuthUser("/dashboard/integrations");
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <div className="section-intro compact-intro">
          <span className="badge">BYOK</span>
          <h1 style={{ marginTop: 18 }}>{text(lang, "API Integrations", "API 对接")}</h1>
          <p>
            {text(
              lang,
              "Connect your own platform and model keys here. Analysis requests will prefer your configured providers.",
              "在这里接入你自己的平台和模型 Key。分析请求会优先走你当前配置的供应商。"
            )}
          </p>
        </div>
        <ApiConnectionPanel lang={lang} plan={user.plan} />
      </section>
    </main>
  );
}
