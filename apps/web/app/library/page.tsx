import { SiteNav } from "@/components/site-nav";
import { LibraryManager } from "@/components/library-manager";
import { getServerLang } from "@/lib/i18n";
import { requirePageAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { listLibraryItems } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function LibraryPage() {
  const authUser = await requirePageAuthUser("/library");
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  const items = await listLibraryItems({ supabaseClient });
  const deletedItems = await listLibraryItems({ supabaseClient, includeDeleted: true });

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <LibraryManager
          lang={lang}
          plan={user.plan}
          initialItems={items}
          initialDeletedItems={deletedItems.filter((item) => Boolean(item.deletedAt))}
        />
      </section>
    </main>
  );
}

