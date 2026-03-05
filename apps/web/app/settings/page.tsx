import { SiteNav } from "@/components/site-nav";
import { requirePageAuthUser, toAppUser } from "@/lib/auth";
import { countUsageForDay } from "@/lib/report-store";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function SettingsPage() {
  const authUser = await requirePageAuthUser("/settings");
  const supabaseClient = await createServerSupabaseClient();
  const user = toAppUser(authUser);
  const usedToday = await countUsageForDay(user.id, { supabaseClient });
  const dailyLimit = user.plan === "free" ? 5 : 200;

  return (
    <main>
      <SiteNav />
      <section className="shell section">
        <h1 style={{ marginTop: 0 }}>Settings</h1>
        <div className="grid-3">
          <article className="card panel">
            <h3>Account</h3>
            <p className="mono">{user.email}</p>
            <p className="small">Plan: {user.plan}</p>
          </article>

          <article className="card panel">
            <h3>Usage</h3>
            <p>
              Today {usedToday} / {dailyLimit}
            </p>
            <p className="small">Data backend follows DATA_BACKEND setting (mock or supabase).</p>
          </article>

          <article className="card panel">
            <h3>Pro Plan</h3>
            <p>Pro waitlist is open (MVP placeholder).</p>
            <button className="btn btn-ghost" type="button">
              Join Waitlist
            </button>
          </article>
        </div>
      </section>
    </main>
  );
}
