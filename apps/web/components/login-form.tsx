"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  getBrowserSupabaseClient,
  type BrowserSupabaseAuthConfig
} from "@/lib/supabase-browser";
import type { Lang } from "@/lib/i18n-shared";

type Props = {
  nextPath: string;
  appUrl: string | null;
  lang: Lang;
  authConfig: {
    url: string | null;
    anonKey: string | null;
  };
};

type LoginCopy = {
  title: string;
  subtitle: string;
  callback: string;
  continueGoogle: string;
  sendMagicLink: string;
  emailPlaceholder: string;
  inputEmailRequired: string;
  magicSent: string;
  signInFailed: string;
  missingConfigPrefix: string;
  missingConfigFallback: string;
  missingRedirectOrigin: string;
  hintVercelCurrent: string;
  hintLoopback: string;
  hintPrivate: string;
  hintVercelTarget: string;
  hintNonHttps: string;
};

const copyByLang: Record<Lang, LoginCopy> = {
  en: {
    title: "Sign In",
    subtitle: "Use Google OAuth or Email Magic Link.",
    callback: "callback",
    continueGoogle: "Continue with Google",
    sendMagicLink: "Send Email Magic Link",
    emailPlaceholder: "you@example.com",
    inputEmailRequired: "Please enter your email.",
    magicSent: "Magic link sent. Check your inbox and click the link to continue.",
    signInFailed: "Sign-in failed.",
    missingConfigPrefix: "Missing Supabase Auth config",
    missingConfigFallback: "Missing Supabase Auth config.",
    missingRedirectOrigin: "No redirect origin available. Set NEXT_PUBLIC_APP_URL or open this page from your real domain.",
    hintVercelCurrent: "Current domain is *.vercel.app. Set NEXT_PUBLIC_APP_URL to your public domain to avoid protected login callbacks.",
    hintLoopback: "Redirect target is localhost. Magic Link only works on the same device/browser that can access localhost.",
    hintPrivate: "Redirect target is a private LAN address. It only works for users on the same local network.",
    hintVercelTarget: "Redirect target is a vercel.app domain. If users see 401, disable Deployment Protection or use a custom domain.",
    hintNonHttps: "Redirect target is not HTTPS. Public users should sign in through an HTTPS domain."
  },
  zh: {
    title: "登录",
    subtitle: "使用 Google OAuth 或邮箱魔法链接登录。",
    callback: "回调地址",
    continueGoogle: "使用 Google 登录",
    sendMagicLink: "发送邮箱魔法链接",
    emailPlaceholder: "you@example.com",
    inputEmailRequired: "请输入邮箱地址。",
    magicSent: "魔法链接已发送，请到邮箱点击登录。",
    signInFailed: "登录失败。",
    missingConfigPrefix: "缺少 Supabase 登录配置",
    missingConfigFallback: "缺少 Supabase 登录配置。",
    missingRedirectOrigin: "未找到回调来源域名。请设置 NEXT_PUBLIC_APP_URL，或从真实域名打开本页。",
    hintVercelCurrent: "当前域名是 *.vercel.app。请设置 NEXT_PUBLIC_APP_URL 为正式域名，避免回调被保护策略拦截。",
    hintLoopback: "回调目标是 localhost，仅在同一设备/浏览器可用。",
    hintPrivate: "回调目标是局域网地址，仅同一网络可用。",
    hintVercelTarget: "回调目标是 vercel.app 域名。如出现 401，请关闭 Deployment Protection 或使用自定义域名。",
    hintNonHttps: "回调目标不是 HTTPS。对外用户请使用 HTTPS 域名登录。"
  }
};

function normalizeNextPath(input: string): string {
  if (input.startsWith("/")) {
    return input;
  }
  return "/dashboard";
}

function normalizeAppOrigin(appUrl: string | null): string | null {
  if (!appUrl) {
    return null;
  }

  const trimmed = appUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function getRuntimeOrigin(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.location.origin;
  } catch {
    return null;
  }
}

function isLoopbackHost(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

function isPrivateHost(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);

    if (hostname.endsWith(".local")) {
      return true;
    }

    const parts = hostname.split(".");
    if (parts.length !== 4) {
      return false;
    }

    const nums = parts.map((part) => Number.parseInt(part, 10));
    if (nums.some((item) => Number.isNaN(item) || item < 0 || item > 255)) {
      return false;
    }

    if (nums[0] === 10) {
      return true;
    }

    if (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31) {
      return true;
    }

    if (nums[0] === 192 && nums[1] === 168) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function isVercelAppHost(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function isHttpsOrigin(origin: string): boolean {
  try {
    return new URL(origin).protocol === "https:";
  } catch {
    return false;
  }
}

function chooseRedirectOrigin(runtimeOrigin: string | null, configuredOrigin: string | null): string | null {
  if (configuredOrigin) {
    if (!runtimeOrigin) {
      return configuredOrigin;
    }

    if (
      isLoopbackHost(runtimeOrigin) ||
      isPrivateHost(runtimeOrigin) ||
      isVercelAppHost(runtimeOrigin)
    ) {
      return configuredOrigin;
    }
  }

  if (runtimeOrigin && !isLoopbackHost(runtimeOrigin)) {
    return runtimeOrigin;
  }

  return configuredOrigin ?? runtimeOrigin;
}

function buildMissingAuthConfigMessage(config: BrowserSupabaseAuthConfig, copy: LoginCopy): string | null {
  const missing: string[] = [];

  if (!config.url) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
  }

  if (!config.anonKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)");
  }

  if (missing.length === 0) {
    return null;
  }

  return `${copy.missingConfigPrefix}: ${missing.join(", ")}.`;
}

function mapAuthError(error: unknown, configMessage: string | null, copy: LoginCopy): string {
  if (error instanceof Error && error.message.startsWith("SUPABASE_AUTH_CONFIG_MISSING")) {
    return configMessage ?? copy.missingConfigFallback;
  }

  return error instanceof Error ? error.message : copy.signInFailed;
}

export function LoginForm({ nextPath, appUrl, lang, authConfig }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => copyByLang[lang], [lang]);
  const safeNextPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);
  const configMessage = useMemo(() => buildMissingAuthConfigMessage(authConfig, copy), [authConfig, copy]);
  const runtimeOrigin = useMemo(() => getRuntimeOrigin(), []);
  const configuredOrigin = useMemo(() => normalizeAppOrigin(appUrl), [appUrl]);
  const callbackPath = useMemo(
    () => `/auth/callback?next=${encodeURIComponent(safeNextPath)}`,
    [safeNextPath]
  );

  const redirectOrigin = useMemo(
    () => chooseRedirectOrigin(runtimeOrigin, configuredOrigin),
    [runtimeOrigin, configuredOrigin]
  );

  const callbackPreview = `${redirectOrigin ?? "<missing-origin>"}${callbackPath}`;

  const originHint = useMemo(() => {
    if (!redirectOrigin) {
      return copy.missingRedirectOrigin;
    }

    if (runtimeOrigin && isVercelAppHost(runtimeOrigin) && !configuredOrigin) {
      return copy.hintVercelCurrent;
    }

    if (isLoopbackHost(redirectOrigin)) {
      return copy.hintLoopback;
    }

    if (isPrivateHost(redirectOrigin)) {
      return copy.hintPrivate;
    }

    if (isVercelAppHost(redirectOrigin)) {
      return copy.hintVercelTarget;
    }

    if (!isHttpsOrigin(redirectOrigin)) {
      return copy.hintNonHttps;
    }

    return null;
  }, [redirectOrigin, runtimeOrigin, configuredOrigin, copy]);

  function buildRedirectUrl() {
    if (!redirectOrigin) {
      throw new Error(copy.missingRedirectOrigin);
    }

    return `${redirectOrigin}${callbackPath}`;
  }

  async function signInWithGoogle() {
    if (configMessage) {
      setError(configMessage);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = getBrowserSupabaseClient(authConfig);
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildRedirectUrl()
        }
      });

      if (authError) {
        throw authError;
      }
    } catch (e) {
      setError(mapAuthError(e, configMessage, copy));
      setLoading(false);
    }
  }

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (configMessage) {
      setError(configMessage);
      return;
    }

    if (!email.trim()) {
      setError(copy.inputEmailRequired);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = getBrowserSupabaseClient(authConfig);
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: buildRedirectUrl()
        }
      });

      if (authError) {
        throw authError;
      }

      setMessage(copy.magicSent);
    } catch (e) {
      setError(mapAuthError(e, configMessage, copy));
    } finally {
      setLoading(false);
    }
  }

  const disableActions = loading || Boolean(configMessage) || !redirectOrigin;

  return (
    <div className="card panel" style={{ maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>{copy.title}</h2>
      <p className="small">{copy.subtitle}</p>
      <p className="small mono" style={{ marginTop: 8 }}>
        {copy.callback}: {callbackPreview}
      </p>

      <button className="btn btn-primary" onClick={signInWithGoogle} disabled={disableActions} type="button">
        {copy.continueGoogle}
      </button>

      <div style={{ height: 16 }} />

      <form onSubmit={signInWithEmail} style={{ display: "grid", gap: 10 }}>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.emailPlaceholder}
          disabled={disableActions}
        />
        <button className="btn btn-ghost" type="submit" disabled={disableActions}>
          {copy.sendMagicLink}
        </button>
      </form>

      {originHint && (
        <p className="small" style={{ marginTop: 12, color: "#ffc36b" }}>
          {originHint}
        </p>
      )}

      {message && (
        <p className="small" style={{ marginTop: 12, color: "#66f0bf" }}>
          {message}
        </p>
      )}

      {configMessage && !error && (
        <p className="small status-failed" style={{ marginTop: 12 }}>
          {configMessage}
        </p>
      )}

      {error && (
        <p className="small status-failed" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </div>
  );
}



