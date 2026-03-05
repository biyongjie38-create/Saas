import Link from "next/link";
import { getOptionalAuthUser } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/library", label: "Viral Library" },
  { href: "/settings", label: "Settings" }
];

export async function SiteNav() {
  const authUser = await getOptionalAuthUser();

  return (
    <header className="nav">
      <div className="shell nav-inner">
        <Link href="/" className="brand">
          <span className="brand-dot" /> ViralBrain.ai
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <nav className="nav-links">
            {links.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          {authUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="small" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                {authUser.email}
              </span>
              <form action="/auth/signout" method="post">
                <button className="btn btn-ghost" type="submit" style={{ height: 34, padding: "0 12px" }}>
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="btn btn-ghost" style={{ height: 34, padding: "0 12px" }}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
