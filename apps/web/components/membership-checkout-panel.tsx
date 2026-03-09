"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { captureAnalyticsEvent } from "@/lib/analytics";
import {
  formatMembershipPriceLabel,
  getMembershipMarketingCopy,
  resolveMembershipPriceCny,
} from "@/lib/membership-pricing";
import type { BillingCycle, MembershipOrder, User } from "@/lib/types";
import type { Lang } from "@/lib/i18n-shared";

type Props = {
  lang: Lang;
  user: User;
  initialOrders: MembershipOrder[];
};

type CheckoutResponse = {
  ok: boolean;
  data: {
    user: User;
    order: MembershipOrder | null;
    checkoutUrl: string | null;
    message: string;
  } | null;
  error?: {
    message?: string;
  } | null;
};

type ConfirmResponse = {
  ok: boolean;
  data: {
    user: User;
    order: MembershipOrder | null;
    message: string;
  } | null;
  error?: {
    message?: string;
  } | null;
};

function mergeOrder(nextOrder: MembershipOrder, orders: MembershipOrder[]) {
  return [nextOrder, ...orders.filter((item) => item.id !== nextOrder.id)];
}

function formatSubscriptionBadge(lang: Lang, value: User["subscriptionStatus"]) {
  if (value === "active") {
    return lang === "zh" ? "已生效" : "Active";
  }

  return lang === "zh" ? "未生效" : "Inactive";
}

export function MembershipCheckoutPanel({ lang, user, initialOrders }: Props) {
  const copy = getMembershipMarketingCopy(lang);
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmedSessionRef = useRef<string | null>(null);
  const [currentUser, setCurrentUser] = useState(user);
  const [orders, setOrders] = useState(initialOrders);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(user.billingCycle ?? "monthly");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const currentPriceLabel = useMemo(() => formatMembershipPriceLabel(lang, billingCycle), [billingCycle, lang]);
  const currentPrice = useMemo(() => resolveMembershipPriceCny(billingCycle), [billingCycle]);
  const checkoutState = searchParams.get("checkout");
  const sessionId = searchParams.get("session_id");
  const nextPath = searchParams.get("next");

  useEffect(() => {
    setCurrentUser(user);
    setOrders(initialOrders);
    setBillingCycle(user.billingCycle ?? "monthly");
  }, [initialOrders, user]);

  useEffect(() => {
    if (checkoutState === "paid") {
      setError("");
      setMessage(copy.activated);
      return;
    }

    if (checkoutState === "cancelled") {
      setMessage("");
      setError(copy.cancelled);
      captureAnalyticsEvent("membership_checkout_cancelled", {
        entry_point: "membership_page",
        lang,
        billing_cycle: billingCycle,
      });
    }
  }, [billingCycle, checkoutState, copy.activated, copy.cancelled, lang]);

  useEffect(() => {
    if (checkoutState !== "success" || !sessionId || confirmedSessionRef.current === sessionId) {
      return;
    }

    confirmedSessionRef.current = sessionId;
    let ignore = false;

    async function confirmCheckout() {
      setConfirming(true);
      setError("");
      setMessage(copy.verifying);

      try {
        const response = await fetch("/api/membership/checkout/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
          }),
        });
        const payload = (await response.json().catch(() => null)) as ConfirmResponse | null;
        if (!response.ok || !payload?.ok || !payload.data) {
          if (!ignore) {
            const failureMessage = payload?.error?.message ?? "Payment confirmation failed.";
            setMessage("");
            setError(failureMessage);
            captureAnalyticsEvent("membership_checkout_failed", {
              entry_point: "membership_page",
              stage: "confirm",
              lang,
              billing_cycle: billingCycle,
              reason: failureMessage,
            });
          }
          return;
        }

        if (ignore) {
          return;
        }

        const confirmedData = payload.data;
        setCurrentUser(confirmedData.user);
        if (confirmedData.order) {
          setOrders((current) => mergeOrder(confirmedData.order as MembershipOrder, current));
        }
        setError("");
        setMessage(copy.activated);
        captureAnalyticsEvent("membership_checkout_confirmed", {
          entry_point: "membership_page",
          lang,
          billing_cycle: confirmedData.order?.billingCycle ?? billingCycle,
          order_id: confirmedData.order?.id ?? null,
          plan: confirmedData.user.plan,
        });
        router.refresh();

        const params = new URLSearchParams();
        params.set("checkout", "paid");
        if (nextPath) {
          params.set("next", nextPath);
        }
        router.replace(`/membership?${params.toString()}`);
      } catch (cause) {
        if (!ignore) {
          const failureMessage = cause instanceof Error ? cause.message : "Payment confirmation failed.";
          setMessage("");
          setError(failureMessage);
          captureAnalyticsEvent("membership_checkout_failed", {
            entry_point: "membership_page",
            stage: "confirm",
            lang,
            billing_cycle: billingCycle,
            reason: failureMessage,
          });
        }
      } finally {
        if (!ignore) {
          setConfirming(false);
        }
      }
    }

    void confirmCheckout();

    return () => {
      ignore = true;
    };
  }, [billingCycle, checkoutState, copy.activated, copy.verifying, lang, nextPath, router, sessionId]);

  async function openMembership() {
    setSubmitting(true);
    setError("");
    setMessage("");
    captureAnalyticsEvent("membership_checkout_started", {
      entry_point: "membership_page",
      lang,
      billing_cycle: billingCycle,
      current_plan: currentUser.plan,
    });

    try {
      const response = await fetch("/api/membership/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: "pro",
          billingCycle,
        }),
      });
      const payload = (await response.json().catch(() => null)) as CheckoutResponse | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        const failureMessage = payload?.error?.message ?? "Checkout failed.";
        setError(failureMessage);
        captureAnalyticsEvent("membership_checkout_failed", {
          entry_point: "membership_page",
          stage: "create",
          lang,
          billing_cycle: billingCycle,
          reason: failureMessage,
        });
        return;
      }

      const checkoutData = payload.data;
      if (checkoutData.order) {
        setOrders((current) => mergeOrder(checkoutData.order as MembershipOrder, current));
      }

      if (checkoutData.checkoutUrl) {
        window.location.assign(checkoutData.checkoutUrl);
        return;
      }

      setCurrentUser(checkoutData.user);
      setMessage(checkoutData.message || copy.activated);
      captureAnalyticsEvent("membership_checkout_confirmed", {
        entry_point: "membership_page",
        lang,
        billing_cycle: billingCycle,
        order_id: checkoutData.order?.id ?? null,
        plan: checkoutData.user.plan,
      });
      router.refresh();
    } catch (cause) {
      const failureMessage = cause instanceof Error ? cause.message : "Checkout failed.";
      setError(failureMessage);
      captureAnalyticsEvent("membership_checkout_failed", {
        entry_point: "membership_page",
        stage: "create",
        lang,
        billing_cycle: billingCycle,
        reason: failureMessage,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="membership-shell">
      <div className="section-intro membership-intro">
        <span className="badge">{copy.badge}</span>
        <h1 style={{ marginTop: 18 }}>{copy.title}</h1>
        <p>{copy.subtitle}</p>
        <div className="qa-banner">
          <p style={{ margin: 0 }}>{copy.checkoutNote}</p>
        </div>
      </div>

      <div className="membership-summary-row">
        <span className="badge">
          {copy.currentPlan}: {currentUser.plan}
        </span>
        <span className="badge">{formatSubscriptionBadge(lang, currentUser.subscriptionStatus)}</span>
        {currentUser.planExpiresAt ? (
          <span className="badge">
            {lang === "zh"
              ? `到期：${new Date(currentUser.planExpiresAt).toLocaleDateString("zh-CN")}`
              : `Expires: ${new Date(currentUser.planExpiresAt).toLocaleDateString("en-US")}`}
          </span>
        ) : null}
        {nextPath ? (
          <a className="btn btn-ghost compact-button" href={nextPath}>
            {copy.returnToPrevious}
          </a>
        ) : null}
      </div>

      <div className="plan-grid membership-checkout-grid">
        <article className={`card panel plan-card plan-card-free ${currentUser.plan === "free" ? "plan-card-current" : ""}`}>
          <div className="plan-card-head">
            <div>
              <p className="card-kicker">{copy.freeName}</p>
              <h2>{copy.freeName}</h2>
            </div>
            {currentUser.plan === "free" ? <span className="plan-pill">{copy.active}</span> : null}
          </div>
          <div className="plan-price-row">
            <span className="plan-price">CNY 0</span>
            <span className="plan-cycle">/ {copy.month}</span>
          </div>
          <p className="small plan-desc">{copy.freeDesc}</p>
          <ul className="plan-feature-list">
            {copy.freeFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </article>

        <article className={`card panel plan-card plan-card-pro ${currentUser.plan === "pro" ? "plan-card-current" : ""}`}>
          <div className="plan-card-head">
            <div>
              <p className="card-kicker">{copy.proName}</p>
              <h2>{copy.proName}</h2>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {billingCycle === "yearly" ? <span className="badge">{copy.yearlyBadge}</span> : null}
              {currentUser.plan === "pro" ? <span className="plan-pill">{copy.active}</span> : null}
            </div>
          </div>

          <div className="pricing-toggle">
            <button
              type="button"
              className={`tab-button ${billingCycle === "monthly" ? "tab-button-active" : ""}`}
              onClick={() => setBillingCycle("monthly")}
            >
              {copy.monthly}
            </button>
            <button
              type="button"
              className={`tab-button ${billingCycle === "yearly" ? "tab-button-active" : ""}`}
              onClick={() => setBillingCycle("yearly")}
            >
              {copy.yearly}
            </button>
          </div>

          <div className="plan-price-row">
            <span className="plan-price">{currentPrice}</span>
            <span className="plan-cycle">CNY / {billingCycle === "yearly" ? copy.year : copy.month}</span>
          </div>
          <p className="small plan-desc">{copy.proDesc}</p>
          <p className="small membership-price-hint">{currentPriceLabel}</p>
          <ul className="plan-feature-list">
            {copy.proFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <div className="plan-actions">
            <button
              type="button"
              className="btn btn-primary plan-action-button"
              onClick={openMembership}
              disabled={submitting || confirming || currentUser.plan === "pro"}
            >
              {submitting ? copy.activating : confirming ? copy.verifying : currentUser.plan === "pro" ? copy.active : copy.activate}
            </button>
          </div>
          {message ? <p className="small status-done">{message}</p> : null}
          {error ? <p className="small status-failed">{error}</p> : null}
        </article>
      </div>

      <section className="card panel" style={{ marginTop: 22 }}>
        <div className="library-card-head">
          <h2 style={{ margin: 0 }}>{copy.history}</h2>
          <span className="badge">{orders.length}</span>
        </div>
        {orders.length === 0 ? (
          <p className="small">{copy.noOrders}</p>
        ) : (
          <div className="membership-order-list">
            {orders.map((order) => (
              <article key={order.id} className="card panel order-item">
                <div className="library-card-head">
                  <strong>{order.plan.toUpperCase()}</strong>
                  <span className="badge">{order.status}</span>
                </div>
                <p className="small mono">order_id: {order.id}</p>
                <p className="small">
                  {copy.orderProvider}: {order.paymentProvider}
                </p>
                <p className="small">
                  {copy.orderAmount}: CNY {order.amountCny}
                </p>
                <p className="small">
                  {copy.orderCycle}: {order.billingCycle}
                </p>
                <p className="small">
                  {copy.orderStatus}: {order.status}
                </p>
                <p className="small">
                  {copy.orderTime}: {new Date(order.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
