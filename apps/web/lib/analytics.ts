"use client";

import posthog from "posthog-js";
import type { BillingCycle, SubscriptionStatus, UserPlan } from "@/lib/types";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsValue>;

export type AnalyticsUser = {
  id: string;
  email: string;
  plan: UserPlan;
  subscriptionStatus?: SubscriptionStatus;
  billingCycle?: BillingCycle | null;
};

export type AnalyticsEventName =
  | "analysis_started"
  | "analysis_completed"
  | "analysis_failed"
  | "membership_checkout_started"
  | "membership_checkout_confirmed"
  | "membership_checkout_cancelled"
  | "membership_checkout_failed"
  | "report_share_created"
  | "report_share_revoked"
  | "report_rerun_started"
  | "report_rerun_completed"
  | "report_rerun_failed"
  | "report_pdf_exported"
  | "report_pdf_export_failed";

function isEnabled() {
  return typeof window !== "undefined" && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

function sanitizeProperties(properties: AnalyticsProperties) {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}

export function identifyAnalyticsUser(user: AnalyticsUser | null) {
  if (!isEnabled()) {
    return;
  }

  if (!user) {
    posthog.reset();
    return;
  }

  posthog.identify(user.id, {
    email: user.email,
    plan: user.plan,
    subscription_status: user.subscriptionStatus ?? "none",
    billing_cycle: user.billingCycle ?? null
  });
}

export function captureAnalyticsEvent(event: AnalyticsEventName, properties: AnalyticsProperties = {}) {
  if (!isEnabled()) {
    return;
  }

  posthog.capture(event, sanitizeProperties(properties));
}
