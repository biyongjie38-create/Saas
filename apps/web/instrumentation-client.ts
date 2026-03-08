import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

declare global {
  interface Window {
    __viralbrainPosthogInitialized?: boolean;
  }
}

function readSampleRate(value: string | undefined, fallback = 0) {
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, parsed));
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.NEXT_PUBLIC_APP_RUNTIME_MODE ??
    process.env.NODE_ENV,
  tracesSampleRate: readSampleRate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0),
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false
});

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY && !window.__viralbrainPosthogInitialized) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true
  });
  window.__viralbrainPosthogInitialized = true;
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
