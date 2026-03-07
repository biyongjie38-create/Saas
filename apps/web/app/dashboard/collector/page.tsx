import { SiteNav } from "@/components/site-nav";
import { ViralCollectorPanel } from "@/components/viral-collector-panel";
import { requirePageAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
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
        <ViralCollectorPanel lang={lang} plan={user.plan} />
      </section>
    </main>
  );
}
