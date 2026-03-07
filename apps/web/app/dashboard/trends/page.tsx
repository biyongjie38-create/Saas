import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { HotTrendsHub } from "@/components/hot-trends-hub";
import { getOptionalAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function HotTrendsPage({
  searchParams
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const authUser = await getOptionalAuthUser();
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = authUser ? await resolveAuthenticatedAppUser(authUser, { supabaseClient }) : null;
  const params = (await searchParams) ?? {};
  const initialTab = params.tab === "channels" || params.tab === "topics" ? params.tab : "videos";

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <HotTrendsHub lang={lang} plan={user?.plan ?? "free"} signedIn={Boolean(authUser)} initialTab={initialTab} />
      </section>
      <SiteFooter lang={lang} />
    </main>
  );
}
