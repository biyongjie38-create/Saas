import Link from "next/link";
import { getOptionalAuthUser } from "@/lib/auth";
import { getServerLang, text } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NavLinks } from "@/components/nav-links";

export async function SiteNav() {
  const authUser = await getOptionalAuthUser();
  const lang = await getServerLang();

  const links = [
    { href: "/dashboard", label: text(lang, "Dashboard", "\u63a7\u5236\u53f0") },
    { href: "/library", label: text(lang, "Viral Library", "\u7206\u6b3e\u5e93") },
    { href: "/membership", label: text(lang, "Membership", "\u8ba2\u9605\u4f1a\u5458") },
    { href: "/settings", label: text(lang, "Personal Center", "\u4e2a\u4eba\u4e2d\u5fc3") }
  ];

  return (
    <header className="nav">
      <div className="shell nav-inner">
        <Link href="/" className="brand" aria-label="ViralBrain homepage">
          <span className="brand-dot" />
          <span>ViralBrain.ai</span>
        </Link>

        <div className="nav-utilities">
          <NavLinks links={links} />
          <LanguageSwitcher currentLang={lang} />
          {authUser ? null : (
            <Link href="/login" className="nav-link nav-auth-link">
              {text(lang, "Sign In", "\u767b\u5f55")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}