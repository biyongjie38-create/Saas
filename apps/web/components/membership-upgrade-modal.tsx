"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
    message: string;
  } | null;
  error?: {
    message?: string;
  } | null;
};

type Copy = {
  title: string;
  subtitle: string;
  freeName: string;
  freeDesc: string;
  freePrice: string;
  freeCycle: string;
  proMonthly: string;
  proYearly: string;
  monthlyDesc: string;
  yearlyDesc: string;
  monthlyPrice: string;
  yearlyPrice: string;
  monthlyCycle: string;
  yearlyCycle: string;
  billingHint: string;
  freeFeatures: string[];
  proFeatures: string[];
  yearlyFeatures: string[];
  current: string;
  activate: string;
  active: string;
  activating: string;
  close: string;
  sandboxNote: string;
  success: string;
  failed: string;
  loginToUpgrade: string;
  loginHint: string;
};

const copyByLang: Record<Lang, Copy> = {
  en: {
    title: "Flexible plans for your growth",
    subtitle:
      "ViralBrain.ai sells workflow, reporting, and trend analysis. Third-party API costs are paid by the user to their chosen provider.",
    freeName: "Free",
    freeDesc: "Best for validation and light experimentation.",
    freePrice: "0",
    freeCycle: "free forever",
    proMonthly: "Pro (Monthly)",
    proYearly: "Pro (Yearly)",
    monthlyDesc: "Unlock full trend detail access and higher daily limits.",
    yearlyDesc: "Best value for teams running continuous content research.",
    monthlyPrice: "99",
    yearlyPrice: "999",
    monthlyCycle: "CNY / month",
    yearlyCycle: "CNY / year",
    billingHint: "API costs are not bundled. Users bring their own third-party keys.",
    freeFeatures: [
      "5 analyses per day",
      "Basic viral library import and manual maintenance",
      "Preview-level report review",
      "Community support"
    ],
    proFeatures: [
      "200 analyses per day",
      "Hot trend detail access",
      "Share link, rerun, and PDF export",
      "Advanced providers and BYOK integrations"
    ],
    yearlyFeatures: [
      "Everything in Pro Monthly",
      "Priority support",
      "Long-cycle research workflow",
      "Best annual price"
    ],
    current: "Current plan",
    activate: "Upgrade to Pro",
    active: "Already Pro",
    activating: "Upgrading...",
    close: "Close",
    sandboxNote:
      "This is still a sandbox membership flow. It activates immediately and can later be replaced with a real payment provider.",
    success: "Pro plan activated.",
    failed: "Membership activation failed.",
    loginToUpgrade: "Sign in to upgrade",
    loginHint: "Sign in first to activate a plan and save membership history."
  },
  zh: {
    title: "灵活的定价方案，支撑你的增长工作流",
    subtitle:
      "ViralBrain.ai 收费的是工作流、报告能力和趋势洞察。第三方 API 成本由用户自行向对应供应商支付。",
    freeName: "免费版",
    freeDesc: "适合验证需求和轻量体验。",
    freePrice: "0",
    freeCycle: "永久免费",
    proMonthly: "专业会员（月付）",
    proYearly: "专业会员（年付）",
    monthlyDesc: "解锁完整趋势详情、更高分析额度和更强工作流能力。",
    yearlyDesc: "适合长期内容研究和持续化运营团队。",
    monthlyPrice: "99",
    yearlyPrice: "999",
    monthlyCycle: "CNY / 月",
    yearlyCycle: "CNY / 年",
    billingHint: "本平台不代付 API 成本，用户自行使用第三方 Key。",
    freeFeatures: [
      "每天 5 次分析",
      "基础爆款库导入与手动维护",
      "报告预览级查看",
      "社区支持"
    ],
    proFeatures: [
      "每天 200 次分析",
      "完整热门趋势详情",
      "分享链接、重跑报告、导出 PDF",
      "高级供应商与 BYOK 接入"
    ],
    yearlyFeatures: [
      "包含专业版月付全部能力",
      "优先支持",
      "长期研究型工作流",
      "更优年度价格"
    ],
    current: "当前套餐",
    activate: "立即升级到 Pro",
    active: "当前已是 Pro",
    activating: "升级中...",
    close: "关闭",
    sandboxNote: "当前仍是沙盒开通流程，确认后会立即生效，后续可直接替换成真实支付渠道。",
    success: "专业版已开通。",
    failed: "会员开通失败。",
    loginToUpgrade: "登录后升级",
    loginHint: "先登录，再开通会员并保存你的套餐和订单记录。"
  }
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
}: {
  name: string;
  desc: string;
  price: string;
  cycle: string;
  features: string[];
  active?: boolean;
  primary?: boolean;
  onPrimary?: () => void;
  primaryLabel?: string;
}) {
  return (
    <article className={`card panel upgrade-plan-card ${primary ? "upgrade-plan-card-primary" : ""} ${active ? "upgrade-plan-card-current" : ""}`}>
      <div className="upgrade-plan-head">
        <div>
          <p className="card-kicker">{name}</p>
          <h3>{name}</h3>
        </div>
        {active ? <span className="plan-pill">{primaryLabel}</span> : null}
      </div>
      <p className="small upgrade-plan-desc">{desc}</p>
      <div className="upgrade-plan-price-row">
        <span className="upgrade-plan-price">￥{price}</span>
        <span className="upgrade-plan-cycle">{cycle}</span>
      </div>
      <ul className="plan-feature-list">
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      {onPrimary ? (
        <button type="button" className={`btn ${primary ? "btn-primary" : "btn-ghost"} upgrade-plan-button`} onClick={onPrimary}>
          {primaryLabel}
        </button>
      ) : null}
    </article>
  );
}

export function MembershipUpgradeModal({ open, onClose, lang, plan, title, subtitle, signedIn = true, nextPath = "/dashboard/trends" }: Props) {
  const copy = copyByLang[lang];
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
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
  }, [copy, plan, signedIn, submitting]);

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

    setBillingCycle(nextCycle);
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/membership/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          plan: "pro",
          billingCycle: nextCycle
        })
      });

      const payload = (await response.json().catch(() => null)) as CheckoutResponse | null;
      if (!response.ok || !payload?.ok) {
        setError(payload?.error?.message ?? copy.failed);
        return;
      }

      setMessage(copy.success);
      router.refresh();
      window.dispatchEvent(new Event("viralbrain:membership-refresh"));
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.failed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-shell upgrade-modal-shell" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="card-kicker">{title ?? copy.title}</p>
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
              price={copy.freePrice}
              cycle={copy.freeCycle}
              features={copy.freeFeatures}
              active={signedIn ? plan === "free" : false}
              primaryLabel={signedIn && plan === "free" ? copy.current : undefined}
            />
            <PlanCard
              name={copy.proMonthly}
              desc={copy.monthlyDesc}
              price={copy.monthlyPrice}
              cycle={copy.monthlyCycle}
              features={copy.proFeatures}
              primary
              active={signedIn && plan === "pro" && billingCycle === "monthly"}
              onPrimary={() => activate("monthly")}
              primaryLabel={currentPrimaryLabel}
            />
            <PlanCard
              name={copy.proYearly}
              desc={copy.yearlyDesc}
              price={copy.yearlyPrice}
              cycle={copy.yearlyCycle}
              features={copy.yearlyFeatures}
              active={signedIn && plan === "pro" && billingCycle === "yearly"}
              onPrimary={() => activate("yearly")}
              primaryLabel={currentPrimaryLabel}
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
            <p className="small">{copy.sandboxNote}</p>
            {message ? <p className="small status-done">{message}</p> : null}
            {error ? <p className="small status-failed">{error}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
