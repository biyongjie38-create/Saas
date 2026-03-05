"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  getBrowserSupabaseClient,
  type BrowserSupabaseAuthConfig
} from "@/lib/supabase-browser";

type Props = {
  nextPath: string;
  appUrl: string | null;
  authConfig: {
    url: string | null;
    anonKey: string | null;
  };
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

function isHttpsOrigin(origin: string): boolean {
  try {
    return new URL(origin).protocol === "https:";
  } catch {
    return false;
  }
}

function chooseRedirectOrigin(runtimeOrigin: string | null, configuredOrigin: string | null): string | null {
  if (runtimeOrigin && !isLoopbackHost(runtimeOrigin)) {
    return runtimeOrigin;
  }

  return configuredOrigin ?? runtimeOrigin;
}

function buildMissingAuthConfigMessage(config: BrowserSupabaseAuthConfig): string | null {
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

  return `Missing Supabase Auth config: ${missing.join(", ")}.`;
}

function mapAuthError(error: unknown, configMessage: string | null): string {
  if (error instanceof Error && error.message.startsWith("SUPABASE_AUTH_CONFIG_MISSING")) {
    return configMessage ?? "Missing Supabase Auth config.";
  }

  return error instanceof Error ? error.message : "Sign-in failed.";
}

export function LoginForm({ nextPath, appUrl, authConfig }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const safeNextPath = useMemo(() => normalizeNextPath(nextPath), [nextPath]);
  const configMessage = useMemo(() => buildMissingAuthConfigMessage(authConfig), [authConfig]);
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
      return "No redirect origin available. Set NEXT_PUBLIC_APP_URL or open this page from your real domain.";
    }

    if (isLoopbackHost(redirectOrigin)) {
      return "Redirect target is localhost. Magic Link only works on the same device/browser that can access localhost.";
    }

    if (isPrivateHost(redirectOrigin)) {
      return "Redirect target is a private LAN address. It only works for users on the same local network.";
    }

    if (!isHttpsOrigin(redirectOrigin)) {
      return "Redirect target is not HTTPS. Public users should sign in through an HTTPS domain.";
    }

    return null;
  }, [redirectOrigin]);

  function buildRedirectUrl() {
    if (!redirectOrigin) {
      throw new Error("Missing redirect origin.");
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
      setError(mapAuthError(e, configMessage));
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
      setError("Please enter your email.");
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

      setMessage("Magic link sent. Check your inbox and click the link to continue.");
    } catch (e) {
      setError(mapAuthError(e, configMessage));
    } finally {
      setLoading(false);
    }
  }

  const disableActions = loading || Boolean(configMessage) || !redirectOrigin;

  return (
    <div className="card panel" style={{ maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>Sign In</h2>
      <p className="small">Use Google OAuth or Email Magic Link.</p>
      <p className="small mono" style={{ marginTop: 8 }}>
        callback: {callbackPreview}
      </p>

      <button className="btn btn-primary" onClick={signInWithGoogle} disabled={disableActions} type="button">
        Continue with Google
      </button>

      <div style={{ height: 16 }} />

      <form onSubmit={signInWithEmail} style={{ display: "grid", gap: 10 }}>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          disabled={disableActions}
        />
        <button className="btn btn-ghost" type="submit" disabled={disableActions}>
          Send Email Magic Link
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
