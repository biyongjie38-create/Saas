"use client";

import { useEffect, useMemo, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { normalizeLang, type Lang } from "@/lib/i18n-shared";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type Phase = "working" | "failed";

type ConfirmCopy = {
  workingTitle: string;
  workingDesc: string;
  failedTitle: string;
  fallbackError: string;
  backToLogin: string;
  missingConfig: string;
  callbackFailed: string;
  missingPayload: string;
  browserMismatchHint: string;
  linkExpiredHint: string;
};

const copyByLang: Record<Lang, ConfirmCopy> = {
  en: {
    workingTitle: "Signing you in...",
    workingDesc: "Please wait. We are completing your login session.",
    failedTitle: "Sign-in callback failed",
    fallbackError: "Unknown callback error.",
    backToLogin: "Back to Login",
    missingConfig: "Missing Supabase auth config on production env.",
    callbackFailed: "Sign-in callback failed.",
    missingPayload: "No auth payload in callback URL.",
    browserMismatchHint: "Please open the magic link in the same browser where you requested it, or use Google sign-in.",
    linkExpiredHint: "Magic link may be expired or already used. Please request a new one."
  },
  zh: {
    workingTitle: "正在登录...",
    workingDesc: "请稍候，系统正在完成你的登录会话。",
    failedTitle: "登录回调失败",
    fallbackError: "未知回调错误。",
    backToLogin: "返回登录页",
    missingConfig: "生产环境缺少 Supabase 登录配置。",
    callbackFailed: "登录回调失败。",
    missingPayload: "回调地址中没有有效登录参数。",
    browserMismatchHint: "请在发起登录请求的同一浏览器中打开魔法链接，或改用 Google 登录。",
    linkExpiredHint: "魔法链接可能已过期或已被使用，请重新获取新链接。"
  }
};

const otpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email"
]);

function resolveLangFromClient(): Lang {
  if (typeof document !== "undefined") {
    const cookieMatch = document.cookie.match(/(?:^|; )vb_lang=([^;]+)/);
    if (cookieMatch?.[1]) {
      return normalizeLang(decodeURIComponent(cookieMatch[1]));
    }
  }

  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh")) {
    return "zh";
  }

  return "en";
}

function normalizeNextPath(input: string | null): string {
  if (input && input.startsWith("/")) {
    return input;
  }
  return "/dashboard";
}

function extractHashSession(hashRaw: string): { accessToken: string; refreshToken: string } | null {
  const hash = hashRaw.startsWith("#") ? hashRaw.slice(1) : hashRaw;
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

function extractQuerySession(params: URLSearchParams | null): { accessToken: string; refreshToken: string } | null {
  if (!params) {
    return null;
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

function mapErrorMessage(error: unknown, copy: ConfirmCopy): string {
  if (error instanceof Error && error.message.startsWith("SUPABASE_AUTH_CONFIG_MISSING")) {
    return copy.missingConfig;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("code_verifier") || message.includes("code verifier") || message.includes("pkce")) {
      return copy.browserMismatchHint;
    }
    if (message.includes("expired") || message.includes("invalid") || message.includes("otp") || message.includes("token")) {
      return copy.linkExpiredHint;
    }
    return error.message;
  }

  return copy.callbackFailed;
}

export default function AuthConfirmPage() {
  const [phase, setPhase] = useState<Phase>("working");
  const [error, setError] = useState<string | null>(null);

  const lang = useMemo(() => resolveLangFromClient(), []);
  const copy = useMemo(() => copyByLang[lang], [lang]);
  const search = useMemo(
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const nextPath = normalizeNextPath(search?.get("next") ?? null);
        const code = search?.get("code");
        const tokenHash = search?.get("token_hash");
        const token = search?.get("token");
        const email = search?.get("email");
        const rawType = search?.get("type");
        const otpType = rawType && otpTypes.has(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null;
        const authError = search?.get("error_description") ?? search?.get("error");

        if (authError) {
          throw new Error(decodeURIComponent(authError));
        }

        const supabase = getBrowserSupabaseClient();
        const errors: unknown[] = [];
        let signedIn = false;

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeError) {
            signedIn = true;
          } else {
            errors.push(exchangeError);
          }
        }

        if (!signedIn && tokenHash && otpType) {
          const { error: otpHashError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType
          });
          if (!otpHashError) {
            signedIn = true;
          } else {
            errors.push(otpHashError);
          }
        }

        if (!signedIn && token && otpType && email) {
          const { error: otpTokenError } = await supabase.auth.verifyOtp({
            token,
            type: otpType,
            email
          });
          if (!otpTokenError) {
            signedIn = true;
          } else {
            errors.push(otpTokenError);
          }
        }

        if (!signedIn) {
          const querySession = extractQuerySession(search);
          const hashSession = extractHashSession(window.location.hash);
          const sessionPayload = querySession ?? hashSession;

          if (sessionPayload) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: sessionPayload.accessToken,
              refresh_token: sessionPayload.refreshToken
            });
            if (!setSessionError) {
              signedIn = true;
            } else {
              errors.push(setSessionError);
            }
          }
        }

        if (!signedIn) {
          const {
            data: { session }
          } = await supabase.auth.getSession();

          if (session) {
            signedIn = true;
          }
        }

        if (!signedIn) {
          throw (errors.length > 0 ? errors[errors.length - 1] : new Error(copy.missingPayload));
        }

        window.location.replace(nextPath);
      } catch (e) {
        if (!mounted) {
          return;
        }

        setError(mapErrorMessage(e, copy));
        setPhase("failed");
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [search, copy]);

  return (
    <main>
      <section className="shell section" style={{ maxWidth: 760 }}>
        <div className="card panel">
          <h1 style={{ marginTop: 0 }}>{phase === "working" ? copy.workingTitle : copy.failedTitle}</h1>
          {phase === "working" ? (
            <p>{copy.workingDesc}</p>
          ) : (
            <>
              <p className="status-failed">{error ?? copy.fallbackError}</p>
              <a className="btn btn-primary" href="/login">
                {copy.backToLogin}
              </a>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
