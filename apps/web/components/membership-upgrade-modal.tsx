"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { captureAnalyticsEvent } from "@/lib/analytics";
import {
  getMembershipMarketingCopy,
  resolveMembershipPriceCny,
} from "@/lib/membership-pricing";
import type { BillingCycle, UserPlan } from "@/lib/types";
import type { Lang } from "@/lib/i18n-shared";

type Props = {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  plan: UserPlan;
  title?: string;
  subtitle?: string;
  signedIn?: boolean;
  nextPath?: string;
};

type CheckoutResponse = {
  ok: boolean;
  data: {
    checkoutUrl: string | null;
    message: string;
  } | null;
  error?: {
    message?: string;
  } | null;
};

function PlanCard({
  name,
  desc,
  price,
  cycle,
  features,
  active,
  primary,
  onPrimary,
  primaryLabel,
  badge,
}: {
  name: string;
  desc: string;
  price: number | string;
  cycle: string;
  features: string[];
  active?: boolean;
  primary?: boolean;
  onPrimary?: () => void;
  primaryLabel?: string;
  badge?: string | null;
}) {
  return (
    <article
      className={`card panel upgrade-plan-card ${primary ? "upgrade-plan-card-primary" : ""} ${
        active ? "upgrade-plan-card-current" : ""
      }`}
    >
      <div className="upgrade-plan-head">
        <div>
          <p className="card-kicker">{name}</p>
          <h3>{name}</h3>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {badge ? <span className="badge">{badge}</span> : null}
          {active ? <span className="plan-pill">{primaryLabel}</span> : null}
        </div>
      </div>
      <p className="small upgrade-plan-desc">{desc}</p>
      <div className="upgrade-plan-price-row">
        <span className="upgrade-plan-price">{typeof price === "number" ? `￥${price}` : price}</span>
        <span className="upgrade-plan-cycle">{cycle}</span>
      </div>
      <ul className="plan-feature-list">
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      {onPrimary ? (
        <button
          type="button"
          className={`btn ${primary ? "btn-primary" : "btn-ghost"} upgrade-plan-button`}
          onClick={onPrimary}
        >
          {primaryLabel}
        </button>
      ) : null}
    </article>
  );
}

export function MembershipUpgradeModal({
  open,
  onClose,
  lang,
  plan,
  title,
  subtitle,
  signedIn = true,
  nextPath = "/dashboard/trends",
}: Props) {
  const copy = getMembershipMarketingCopy(lang);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const currentPrimaryLabel = useMemo(() => {
    if (!signedIn) {
      return copy.loginToUpgrade;
    }
    if (plan === "pro") {
      return copy.active;
    }
    return submitting ? copy.activating : copy.activate;
  }, [copy.activate, copy.active, copy.activating, copy.loginToUpgrade, plan, signedIn, submitting]);

  if (!open) {
    return null;
  }

  async function activate(nextCycle: BillingCycle) {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (plan === "pro") {
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    captureAnalyticsEvent("membership_checkout_started", {
      entry_point: "upgrade_modal",
      lang,
      billing_cycle: nextCycle,
      current_plan: plan,
    });

    try {
      const response = await fetch("/api/membership/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: "pro",
          billingCycle: nextCycle,
          nextPath,
        }),
      });

      const payload = (await response.json().catch(() => null)) as CheckoutResponse | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        const failureMessage = payload?.error?.message ?? copy.failed;
        setError(failureMessage);
        captureAnalyticsEvent("membership_checkout_failed", {
          entry_point: "upgrade_modal",
          stage: "create",
          lang,
          billing_cycle: nextCycle,
          reason: failureMessage,
        });
        return;
      }

      if (payload.data.checkoutUrl) {
        window.location.assign(payload.data.checkoutUrl);
        return;
      }

      setMessage(payload.data.message || copy.success);
      captureAnalyticsEvent("membership_checkout_confirmed", {
        entry_point: "upgrade_modal",
        lang,
        billing_cycle: nextCycle,
        plan: "pro",
      });
      router.refresh();
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (cause) {
      const failureMessage = cause instanceof Error ? cause.message : copy.failed;
      setError(failureMessage);
      captureAnalyticsEvent("membership_checkout_failed", {
        entry_point: "upgrade_modal",
        stage: "create",
        lang,
        billing_cycle: nextCycle,
        reason: failureMessage,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell upgrade-modal-shell" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="card-kicker">{copy.badge}</p>
            <h2 style={{ margin: "6px 0 0" }}>{title ?? copy.title}</h2>
          </div>
          <button type="button" className="btn btn-ghost compact-button" onClick={onClose}>
            {copy.close}
          </button>
        </div>

        <div className="upgrade-modal-body">
          <p className="small upgrade-modal-copy">{subtitle ?? copy.subtitle}</p>
          <div className="upgrade-note">
            <strong>{copy.current}</strong>
            <span>{signedIn ? (plan === "pro" ? copy.active : copy.freeName) : copy.loginHint}</span>
          </div>

          <div className="plan-grid upgrade-modal-grid">
            <PlanCard
              name={copy.freeName}
              desc={copy.freeDesc}
              price="CNY 0"
              cycle={copy.freeCycle}
              features={copy.freeFeatures}
              active={signedIn ? plan === "free" : false}
              primaryLabel={signedIn && plan === "free" ? copy.current : undefined}
            />
            <PlanCard
              name={copy.monthlyPlanName}
              desc={copy.monthlyDesc}
              price={resolveMembershipPriceCny("monthly")}
              cycle={lang === "zh" ? "CNY / 月" : "CNY / month"}
              features={copy.proFeatures}
              primary
              active={signedIn && plan === "pro"}
              onPrimary={() => activate("monthly")}
              primaryLabel={currentPrimaryLabel}
            />
            <PlanCard
              name={copy.yearlyPlanName}
              desc={copy.yearlyDesc}
              price={resolveMembershipPriceCny("yearly")}
              cycle={lang === "zh" ? "CNY / 年" : "CNY / year"}
              features={copy.yearlyFeatures}
              active={signedIn && plan === "pro"}
              onPrimary={() => activate("yearly")}
              primaryLabel={currentPrimaryLabel}
              badge={copy.yearlyBadge}
            />
          </div>

          {!signedIn ? (
            <div className="upgrade-footer-actions">
              <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="btn btn-primary">
                {copy.loginToUpgrade}
              </Link>
            </div>
          ) : null}

          <div className="upgrade-footer-copy">
            <p className="small">{copy.billingHint}</p>
            <p className="small">{copy.checkoutNote}</p>
            {message ? <p className="small status-done">{message}</p> : null}
            {error ? <p className="small status-failed">{error}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
