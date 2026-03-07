import Link from "next/link";
import { getOptionalAuthUser, resolveAuthenticatedAppUser } from "@/lib/auth";
import { getServerLang } from "@/lib/i18n";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
import { SiteNavClient } from "@/components/site-nav-client";

function resolveDisplayName(email: string | null | undefined, rawName: unknown): string {
  if (typeof rawName === "string" && rawName.trim()) {
    return rawName.trim();
  }

  if (!email) {
    return "ViralBrain User";
  }

  const local = email.split("@")[0] ?? email;
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function SiteNav() {
  const authUser = await getOptionalAuthUser();
  const lang = await getServerLang();
  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = authUser
    ? await resolveAuthenticatedAppUser(authUser, { supabaseClient })
    : null;

  const navUser = user
    ? {
        email: user.email,
        plan: user.plan,
        displayName: resolveDisplayName(user.email, authUser?.user_metadata?.full_name ?? authUser?.user_metadata?.name)
      }
    : null;

  return (
    <header className="nav">
      <div className="shell nav-inner nav-inner-rich">
        <Link href="/" className="brand" aria-label="ViralBrain homepage">
          <span className="brand-dot" />
          <span>ViralBrain.ai</span>
        </Link>

        <SiteNavClient lang={lang} user={navUser} />
      </div>
    </header>
  );
}
