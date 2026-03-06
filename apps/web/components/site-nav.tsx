import Link from "next/link";
import { getOptionalAuthUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NavLinks } from "@/components/nav-links";

export async function SiteNav() {
  const authUser = await getOptionalAuthUser();
  const lang = await getServerLang();

  const links = [
    { href: "/dashboard", label: text(lang, "Dashboard", "控制台") },
    { href: "/library", label: text(lang, "Viral Library", "爆款库") },
    { href: "/settings", label: text(lang, "Settings", "设置") }
  ];

  return (
    <header className="nav">
      <div className="shell nav-inner">
        <Link href="/" className="brand">
          <span className="brand-dot" /> ViralBrain.ai
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <NavLinks links={links} />

          <LanguageSwitcher currentLang={lang} />

          {authUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="small" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                {authUser.email}
              </span>
              <form action="/auth/signout" method="post">
                <button className="btn btn-ghost" type="submit" style={{ height: 34, padding: "0 12px" }}>
                  {text(lang, "Sign Out", "退出登录")}
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="btn btn-ghost" style={{ height: 34, padding: "0 12px" }}>
              {text(lang, "Sign In", "登录")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
