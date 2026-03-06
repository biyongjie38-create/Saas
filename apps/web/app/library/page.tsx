import { SiteNav } from "@/components/site-nav";
import { LibraryManager } from "@/components/library-manager";
import { getServerLang } from "@/lib/i18n";
import { requirePageAuthUser } from "@/lib/auth";
import { listLibraryItems } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function LibraryPage() {
  await requirePageAuthUser("/library");
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const items = await listLibraryItems({ supabaseClient });

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <LibraryManager lang={lang} initialItems={items} />
      </section>
    </main>
  );
}
