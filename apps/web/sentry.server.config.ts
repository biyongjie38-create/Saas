import * as Sentry from "@sentry/nextjs";

function readSampleRate(value: string | undefined, fallback = 0) {
  const parsed = Number.parseFloat(value ?? "");
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, parsed));
}

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment:
    process.env.SENTRY_ENVIRONMENT ??
    process.env.NEXT_PUBLIC_APP_RUNTIME_MODE ??
    process.env.NODE_ENV,
  tracesSampleRate: readSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0),
  sendDefaultPii: false
});
