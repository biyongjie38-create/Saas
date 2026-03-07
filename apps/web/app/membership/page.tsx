import { SiteNav } from "@/components/site-nav";
import { MembershipCheckoutPanel } from "@/components/membership-checkout-panel";
import { requirePageAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { listMembershipOrders } from "@/lib/membership-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export default async function MembershipPage() {
  const authUser = await requirePageAuthUser("/membership");
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  const orders = await listMembershipOrders(authUser.id, { supabaseClient });

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <MembershipCheckoutPanel lang={lang} user={user} initialOrders={orders} />
      </section>
    </main>
  );
}

