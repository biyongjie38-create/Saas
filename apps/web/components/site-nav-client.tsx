"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Lang } from "@/lib/i18n-shared";
import type { UserPlan } from "@/lib/types";

type NavUser = {
  email: string;
  displayName: string;
  plan: UserPlan;
};

type MenuLink = {
  href?: string;
  label: string;
  desc?: string;
  onClick?: () => void;
};

type Props = {
  lang: Lang;
  user: NavUser | null;
};

type ThemeMode = "dark" | "light";
type OpenMenuState = {
  pathname: string;
  key: string | null;
};

const THEME_STORAGE_KEY = "vb_theme";
const THEME_CHANGE_EVENT = "vb-theme-change";

type Copy = {
  trends: string;
  dashboard: string;
  help: string;
  hotVideos: string;
  hotChannels: string;
  hotTopics: string;
  trendVideoDesc: string;
  trendChannelDesc: string;
  trendTopicDesc: string;
  consoleEntry: string;
  consoleDesc: string;
  libraryEntry: string;
  libraryDesc: string;
  collectorEntry: string;
  collectorDesc: string;
  reportsEntry: string;
  reportsDesc: string;
  manual: string;
  faq: string;
  contact: string;
  manualDesc: string;
  faqDesc: string;
  contactDesc: string;
  personalCenter: string;
  membership: string;
  upgrade: string;
  signOut: string;
  signIn: string;
  light: string;
  dark: string;
  more: string;
  free: string;
  pro: string;
};

const copyByLang: Record<Lang, Copy> = {
  en: {
    trends: "Hot Trends",
    dashboard: "Console",
    help: "Help & Support",
    hotVideos: "Hot Videos",
    hotChannels: "Hot Channels",
    hotTopics: "Hot Topics",
    trendVideoDesc: "Track breakout videos in your category.",
    trendChannelDesc: "Spot channels gaining attention quickly.",
    trendTopicDesc: "Find recurring topics worth following.",
    consoleEntry: "YouTube Analysis",
    consoleDesc: "Run URL analysis and see streaming progress.",
    libraryEntry: "Viral Library",
    libraryDesc: "Search, import, and maintain reusable references.",
    collectorEntry: "Viral Collector",
    collectorDesc: "Pull fresh breakout candidates into your library.",
    reportsEntry: "Recent Reports",
    reportsDesc: "Review history, rerun, and export.",
    manual: "User Manual",
    faq: "FAQ",
    contact: "Contact Support",
    manualDesc: "Start quickly with the core workflow.",
    faqDesc: "Common answers about plans, APIs, and quotas.",
    contactDesc: "Talk to us when setup or billing is blocked.",
    personalCenter: "Personal Center",
    membership: "Membership",
    upgrade: "Upgrade",
    signOut: "Sign Out",
    signIn: "Sign In",
    light: "Light",
    dark: "Dark",
    more: "More",
    free: "Free",
    pro: "Pro"
  },
  zh: {
    trends: "热门趋势",
    dashboard: "控制台",
    help: "帮助与支持",
    hotVideos: "热门视频",
    hotChannels: "热门频道",
    hotTopics: "热门主题",
    trendVideoDesc: "追踪正在起量的爆款视频。",
    trendChannelDesc: "查看增长更快的频道。",
    trendTopicDesc: "发现值得持续跟踪的话题。",
    consoleEntry: "链接分析",
    consoleDesc: "输入视频链接并查看实时分析进度。",
    libraryEntry: "爆款库",
    libraryDesc: "搜索、导入并维护运营素材。",
    collectorEntry: "爆款作品采集",
    collectorDesc: "单独采集近期爆款候选并导入素材库。",
    reportsEntry: "历史报告",
    reportsDesc: "查看历史、重跑和导出报告。",
    manual: "用户手册",
    faq: "常见问题",
    contact: "联系支持",
    manualDesc: "快速上手核心工作流。",
    faqDesc: "查看套餐、API、额度等常见问题。",
    contactDesc: "配置或计费卡住时直接联系。",
    personalCenter: "个人中心",
    membership: "会员信息",
    upgrade: "立即升级",
    signOut: "退出登录",
    signIn: "登录",
    light: "浅色",
    dark: "深色",
    more: "更多",
    free: "免费版",
    pro: "专业版"
  }
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isTrendsRoute(pathname: string) {
  return pathname === "/dashboard/trends" || pathname.startsWith("/dashboard/trends/");
}

function isConsoleRoute(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname === "/library" ||
    pathname.startsWith("/library/") ||
    pathname.startsWith("/dashboard/collector") ||
    pathname.startsWith("/dashboard/reports") ||
    pathname.startsWith("/report/")
  );
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

function subscribeToTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorageChange = (event: Event) => {
    if (event instanceof StorageEvent && event.key && event.key !== THEME_STORAGE_KEY) {
      return;
    }

    onStoreChange();
  };

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(THEME_CHANGE_EVENT, handleStorageChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(THEME_CHANGE_EVENT, handleStorageChange);
  };
}

export function SiteNavClient({ lang, user }: Props) {
  const copy = copyByLang[lang];
  const pathname = usePathname() ?? "/";
  const [openMenuState, setOpenMenuState] = useState<OpenMenuState>({ pathname, key: null });
  const openMenu = openMenuState.pathname === pathname ? openMenuState.key : null;
  const theme = useSyncExternalStore(subscribeToTheme, readStoredTheme, () => "dark");
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node)) {
        setOpenMenuState({ pathname, key: null });
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [pathname]);

  const trendsLinks: MenuLink[] = [
    { href: "/dashboard/trends?tab=videos", label: copy.hotVideos, desc: copy.trendVideoDesc },
    { href: "/dashboard/trends?tab=channels", label: copy.hotChannels, desc: copy.trendChannelDesc },
    { href: "/dashboard/trends?tab=topics", label: copy.hotTopics, desc: copy.trendTopicDesc }
  ];

  const consoleLinks: MenuLink[] = [
    { href: "/dashboard", label: copy.consoleEntry, desc: copy.consoleDesc },
    { href: "/library", label: copy.libraryEntry, desc: copy.libraryDesc },
    { href: "/dashboard/collector", label: copy.collectorEntry, desc: copy.collectorDesc },
    { href: "/dashboard/reports", label: copy.reportsEntry, desc: copy.reportsDesc }
  ];

  const helpLinks: MenuLink[] = [
    { href: "/support#manual", label: copy.manual, desc: copy.manualDesc },
    { href: "/support#faq", label: copy.faq, desc: copy.faqDesc },
    { href: "/support#contact", label: copy.contact, desc: copy.contactDesc }
  ];

  const avatarLabel = useMemo(() => {
    const source = user?.displayName?.trim() || user?.email || "V";
    return source.slice(0, 1).toUpperCase();
  }, [user]);
  const membershipHref = `/membership?next=${encodeURIComponent(pathname)}`;

  function toggleMenu(key: string) {
    setOpenMenuState((current) => {
      const currentKey = current.pathname === pathname ? current.key : null;
      return {
        pathname,
        key: currentKey === key ? null : key
      };
    });
  }

  function closeMenus() {
    setOpenMenuState({ pathname, key: null });
  }

  function applyTheme(nextTheme: ThemeMode) {
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  function renderMenu(key: string, label: string, links: MenuLink[]) {
    const active =
      key === "trends"
        ? isTrendsRoute(pathname)
        : key === "console"
          ? isConsoleRoute(pathname)
          : isActive(pathname, "/support");

    return (
      <div className="nav-menu-group">
        <button type="button" className={`nav-menu-trigger ${active ? "nav-link-active" : ""}`} onClick={() => toggleMenu(key)}>
          <span>{label}</span>
          <span className={`nav-menu-caret ${openMenu === key ? "nav-menu-caret-open" : ""}`}>v</span>
        </button>
        {openMenu === key ? (
          <div className="nav-menu-panel">
            {links.map((item) => {
              const content = (
                <>
                  <strong>{item.label}</strong>
                  {item.desc ? <span>{item.desc}</span> : null}
                </>
              );

              if (item.href) {
                return (
                  <Link key={item.label} href={item.href} className="nav-menu-item" onClick={closeMenus}>
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  className="nav-menu-item nav-menu-item-button"
                  onClick={() => {
                    item.onClick?.();
                    closeMenus();
                  }}
                >
                  {content}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="nav-client-shell" ref={shellRef}>
        <div className="nav-main-links">
          {renderMenu("trends", copy.trends, trendsLinks)}
          {renderMenu("console", copy.dashboard, consoleLinks)}
          {renderMenu("help", copy.help, helpLinks)}
        </div>

        <div className="nav-utilities nav-utilities-rich">
          <LanguageSwitcher currentLang={lang} />
          <button
            type="button"
            className="utility-icon-button"
            onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? copy.light : copy.dark}
          >
            {theme === "dark" ? "L" : "D"}
          </button>

          {user ? (
            <div className="nav-menu-group nav-avatar-group">
              <button type="button" className="avatar-button" onClick={() => toggleMenu("avatar")} aria-label={copy.more}>
                {avatarLabel}
              </button>
              {openMenu === "avatar" ? (
                <div className="nav-menu-panel avatar-panel">
                  <div className="avatar-summary">
                    <strong>{user.displayName}</strong>
                    <span>{user.email}</span>
                    <span className="avatar-plan">{user.plan === "pro" ? copy.pro : copy.free}</span>
                  </div>
                  <Link href="/settings" className="nav-menu-item" onClick={closeMenus}>
                    <strong>{copy.personalCenter}</strong>
                    <span>{lang === "zh" ? "管理资料、额度和会话。" : "Manage profile, quota, and sessions."}</span>
                  </Link>
                  <Link href={membershipHref} className="nav-menu-item" onClick={closeMenus}>
                    <strong>{copy.membership}</strong>
                    <span>
                      {user.plan === "pro"
                        ? lang === "zh"
                          ? "查看当前套餐、订单记录和续费信息。"
                          : "View your current plan, billing history, and renewal options."
                        : lang === "zh"
                          ? "查看套餐差异并完成会员升级。"
                          : "Review plan differences and upgrade when you are ready."}
                    </span>
                  </Link>
                  <form action="/auth/signout" method="post" className="avatar-signout-form">
                    <button type="submit" className="nav-menu-item nav-menu-item-button nav-menu-danger">
                      <strong>{copy.signOut}</strong>
                      <span>{lang === "zh" ? "结束当前会话。" : "End the current session."}</span>
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ) : (
            <Link href="/login" className="nav-link nav-auth-link">
              {copy.signIn}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
