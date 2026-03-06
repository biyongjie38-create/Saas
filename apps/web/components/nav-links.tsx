"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkItem = {
  href: string;
  label: string;
};

type Props = {
  links: NavLinkItem[];
};

function isLinkActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ links }: Props) {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="nav-links">
      {links.map((item) => {
        const active = isLinkActive(pathname, item.href);
        const className = active ? "nav-link nav-link-active" : "nav-link";

        return (
          <Link href={item.href} key={item.href} className={className}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
