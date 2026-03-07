import Stripe from "stripe";
import { resolveMembershipAmountCny } from "@/lib/membership-store";
import type { BillingCycle, SubscriptionStatus, UserPlan } from "@/lib/types";

function normalizeEnv(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeInternalPath(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
}

export function isStripeConfigured() {
  return Boolean(normalizeEnv(process.env.STRIPE_SECRET_KEY));
}

export function getStripeClient() {
  const secretKey = normalizeEnv(process.env.STRIPE_SECRET_KEY);
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY_MISSING");
  }

  return new Stripe(secretKey, {
    appInfo: {
      name: "ViralBrain.ai",
      version: "0.1.0"
    }
  });
}

export function getStripeWebhookSecret() {
  return normalizeEnv(process.env.STRIPE_WEBHOOK_SECRET);
}

export function resolveAppOrigin(request: Request) {
  const explicitOrigin = normalizeEnv(process.env.NEXT_PUBLIC_APP_URL);
  if (explicitOrigin) {
    return new URL(explicitOrigin).origin;
  }

  const headerOrigin = normalizeEnv(request.headers.get("origin") ?? undefined);
  if (headerOrigin) {
    return new URL(headerOrigin).origin;
  }

  const forwardedHost = normalizeEnv(request.headers.get("x-forwarded-host") ?? undefined);
  if (forwardedHost) {
    const proto = normalizeEnv(request.headers.get("x-forwarded-proto") ?? undefined) ?? "https";
    return `${proto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export function buildMembershipReturnUrls(request: Request, nextPath?: string | null) {
  const origin = resolveAppOrigin(request);
  const safeNextPath = sanitizeInternalPath(nextPath);
  const successParams = new URLSearchParams({
    checkout: "success",
    session_id: "{CHECKOUT_SESSION_ID}"
  });

  if (safeNextPath) {
    successParams.set("next", safeNextPath);
  }

  const cancelParams = new URLSearchParams({
    checkout: "cancelled"
  });

  if (safeNextPath) {
    cancelParams.set("next", safeNextPath);
  }

  return {
    successUrl: `${origin}/membership?${successParams.toString()}`,
    cancelUrl: `${origin}/membership?${cancelParams.toString()}`,
    safeNextPath
  };
}

function resolveStripePriceId(cycle: BillingCycle) {
  return cycle === "yearly"
    ? normalizeEnv(process.env.STRIPE_PRO_YEARLY_PRICE_ID)
    : normalizeEnv(process.env.STRIPE_PRO_MONTHLY_PRICE_ID);
}

function resolveStripeCurrency() {
  return (normalizeEnv(process.env.STRIPE_CURRENCY) ?? "cny").toLowerCase();
}

function planLabel(plan: UserPlan, cycle: BillingCycle) {
  if (plan !== "pro") {
    return "ViralBrain.ai Free";
  }

  return cycle === "yearly" ? "ViralBrain.ai Pro (Yearly)" : "ViralBrain.ai Pro (Monthly)";
}

export function buildStripeCheckoutLineItem(plan: UserPlan, billingCycle: BillingCycle): Stripe.Checkout.SessionCreateParams.LineItem {
  const priceId = resolveStripePriceId(billingCycle);
  if (priceId) {
    return {
      price: priceId,
      quantity: 1
    };
  }

  return {
    price_data: {
      currency: resolveStripeCurrency(),
      product_data: {
        name: planLabel(plan, billingCycle)
      },
      recurring: {
        interval: billingCycle === "yearly" ? "year" : "month"
      },
      unit_amount: resolveMembershipAmountCny(plan, billingCycle) * 100
    },
    quantity: 1
  };
}

export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active" || status === "trialing") {
    return "active";
  }

  return "canceled";
}

export function extractStripeId(value: string | { id: string } | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

export function extractStripeCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  if (typeof currentPeriodEnd !== "number") {
    return null;
  }

  return new Date(currentPeriodEnd * 1000).toISOString();
}

export function resolveBillingCycleFromStripeSubscription(subscription: Stripe.Subscription): BillingCycle | null {
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  if (interval === "year") {
    return "yearly";
  }
  if (interval === "month") {
    return "monthly";
  }
  return null;
}

export function getCheckoutMetadata(session: Stripe.Checkout.Session): {
  orderId: string | null;
  userId: string | null;
  plan: UserPlan | null;
  billingCycle: BillingCycle | null;
} {
  const metadata = session.metadata ?? {};
  return {
    orderId: metadata.order_id ?? null,
    userId: metadata.user_id ?? null,
    plan: metadata.plan === "pro" ? "pro" : null,
    billingCycle:
      metadata.billing_cycle === "yearly" || metadata.billing_cycle === "monthly" ? metadata.billing_cycle : null
  };
}

export function getSubscriptionMetadata(subscription: Stripe.Subscription): {
  orderId: string | null;
  userId: string | null;
  plan: UserPlan | null;
  billingCycle: BillingCycle | null;
} {
  const metadata = subscription.metadata ?? {};
  return {
    orderId: metadata.order_id ?? null,
    userId: metadata.user_id ?? null,
    plan: metadata.plan === "pro" ? "pro" : null,
    billingCycle:
      metadata.billing_cycle === "yearly" || metadata.billing_cycle === "monthly" ? metadata.billing_cycle : null
  };
}
