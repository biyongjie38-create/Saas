#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function loadDotEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnvFile(".env.local");
loadDotEnvFile(".env");

function readEnv(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function parseUrl(input) {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1";
}

function isPrivateIp(hostname) {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((num) => Number.isNaN(num) || num < 0 || num > 255)) {
    return false;
  }

  if (parts[0] === 10) {
    return true;
  }

  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }

  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }

  return false;
}

function isVercelAppHost(hostname) {
  return hostname.endsWith(".vercel.app");
}

function normalizeOrigin(raw) {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;

  const parsed = parseUrl(candidate);
  return parsed ? parsed.origin : null;
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
];

const recommended = [
  "NEXT_PUBLIC_APP_URL",
  "AI_SERVICE_URL"
];

const missingRequired = required.filter((key) => !readEnv(key));
const missingRecommended = recommended.filter((key) => !readEnv(key));
const dataBackendMode = (readEnv("DATA_BACKEND") || "auto").toLowerCase();
const stripeSecretKey = readEnv("STRIPE_SECRET_KEY");
const stripeWebhookSecret = readEnv("STRIPE_WEBHOOK_SECRET");
const supabaseServiceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
const posthogKey = readEnv("NEXT_PUBLIC_POSTHOG_KEY");
const posthogHost = readEnv("NEXT_PUBLIC_POSTHOG_HOST");

const supabaseConfigured = Boolean(readEnv("NEXT_PUBLIC_SUPABASE_URL") && readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
const usesSupabaseBackend = dataBackendMode === "supabase" || (dataBackendMode !== "mock" && supabaseConfigured);
const stripeEnabled = Boolean(stripeSecretKey);

console.log("ViralBrain deploy check");
console.log("======================");

if (missingRequired.length > 0) {
  console.error("Missing required environment variables:");
  for (const key of missingRequired) {
    console.error(`- ${key}`);
  }
  process.exitCode = 1;
} else {
  console.log("Required env: OK");
}

if (missingRecommended.length > 0) {
  console.warn("Missing recommended environment variables:");
  for (const key of missingRecommended) {
    console.warn(`- ${key}`);
  }
}

if (stripeEnabled && !stripeWebhookSecret) {
  console.error("STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is missing.");
  process.exitCode = 1;
}

if (stripeEnabled && usesSupabaseBackend && !supabaseServiceRoleKey) {
  console.error("Stripe billing is enabled with a Supabase backend, but SUPABASE_SERVICE_ROLE_KEY is missing.");
  console.error("Stripe webhooks need a Supabase admin client to sync membership state.");
  process.exitCode = 1;
}

if (posthogHost && !posthogKey) {
  console.warn("NEXT_PUBLIC_POSTHOG_HOST is set but NEXT_PUBLIC_POSTHOG_KEY is missing. PostHog will stay disabled.");
}

if (posthogKey && !posthogHost) {
  console.warn("NEXT_PUBLIC_POSTHOG_KEY is set without NEXT_PUBLIC_POSTHOG_HOST. The app will default to https://us.i.posthog.com.");
}

const appUrlRaw = readEnv("NEXT_PUBLIC_APP_URL");
const appUrl = appUrlRaw ? parseUrl(appUrlRaw) : null;

if (appUrlRaw && !appUrl) {
  console.error("NEXT_PUBLIC_APP_URL is not a valid URL.");
  process.exitCode = 1;
}

if (appUrl) {
  const host = appUrl.hostname;
  const https = appUrl.protocol === "https:";

  if (!https) {
    console.warn("Warning: NEXT_PUBLIC_APP_URL is not HTTPS. Public magic-link login should use HTTPS.");
  }

  if (isLoopbackHost(host)) {
    console.warn("Warning: NEXT_PUBLIC_APP_URL points to localhost. External users cannot access it.");
  }

  if (isPrivateIp(host) || host.endsWith(".local")) {
    console.warn("Warning: NEXT_PUBLIC_APP_URL points to LAN/private host. Only local-network users can access it.");
  }

  if (isVercelAppHost(host)) {
    console.warn("Warning: NEXT_PUBLIC_APP_URL uses *.vercel.app. If users see 401, disable Deployment Protection or use a custom production domain.");
  }

  console.log("Suggested Supabase Auth URL Configuration:");
  console.log(`- Site URL: ${appUrl.origin}`);
  console.log(`- Redirect URL: ${appUrl.origin}/auth/callback`);
} else {
  const vercelProdOrigin =
    normalizeOrigin(readEnv("PUBLIC_VERCEL_PROJECT_PRODUCTION_URL")) ??
    normalizeOrigin(readEnv("VERCEL_PROJECT_PRODUCTION_URL"));

  if (vercelProdOrigin) {
    console.log(`Detected Vercel production domain: ${vercelProdOrigin}`);
    console.log(`Suggested NEXT_PUBLIC_APP_URL=${vercelProdOrigin}`);
    console.log("Suggested Supabase Redirect URL:");
    console.log(`- ${vercelProdOrigin}/auth/callback`);
  } else {
    console.log("NEXT_PUBLIC_APP_URL not set. App will use runtime origin.");
    console.log("For production, set NEXT_PUBLIC_APP_URL to your public HTTPS domain.");
  }
}

if (process.exitCode && process.exitCode !== 0) {
  console.error("Deploy check failed.");
} else {
  console.log("Deploy check completed.");
}
