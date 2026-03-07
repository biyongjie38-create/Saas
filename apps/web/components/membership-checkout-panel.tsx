"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type Copy = {
  badge: string;
  title: string;
  subtitle: string;
  checkoutNote: string;
  monthly: string;
  yearly: string;
  currentPlan: string;
  freeName: string;
  proName: string;
  freeDesc: string;
  proDesc: string;
  month: string;
  year: string;
  freeFeatures: string[];
  proFeatures: string[];
  activate: string;
  activating: string;
  active: string;
  activated: string;
  verifying: string;
  cancelled: string;
  history: string;
  noOrders: string;
  orderStatus: string;
  orderAmount: string;
  orderCycle: string;
  orderTime: string;
  orderProvider: string;
  returnToPrevious: string;
};

const copyByLang: Record<Lang, Copy> = {
  en: {
    badge: "Membership",
    title: "Open membership and unlock advanced workflow limits",
    subtitle: "Pro checkout now uses a real Stripe hosted payment flow and syncs subscription state back into your account.",
    checkoutNote: "You will be redirected to Stripe Checkout. Access changes only after the payment session is verified.",
    monthly: "Monthly",
    yearly: "Yearly",
    currentPlan: "Current plan",
    freeName: "Free",
    proName: "Professional",
    freeDesc: "Best for demos, early validation, and low-frequency analysis.",
    proDesc: "Built for BYOK, real reruns, share links, recycle-bin management, and heavier analysis volume.",
    month: "month",
    year: "year",
    freeFeatures: [
      "5 analyses per day",
      "Basic viral collection and manual import",
      "Report preview and core tabs",
      "OpenAI default / local fallback path"
    ],
    proFeatures: [
      "200 analyses per day",
      "Share links, rerun, and PDF export",
      "Bailian / Yunwu / custom OpenAI-compatible providers",
      "Recycle bin recovery and higher collection limits"
    ],
    activate: "Continue to secure checkout",
    activating: "Redirecting...",
    active: "Active",
    activated: "Payment confirmed. Pro membership is now active.",
    verifying: "Verifying payment...",
    cancelled: "Checkout was cancelled before payment confirmation.",
    history: "Membership orders",
    noOrders: "No membership orders yet.",
    orderStatus: "Status",
    orderAmount: "Amount",
    orderCycle: "Billing cycle",
    orderTime: "Created",
    orderProvider: "Provider",
    returnToPrevious: "Return to previous page"
  },
  zh: {
    badge: "订阅会员",
    title: "开通会员并解锁更高阶的工作流能力",
    subtitle: "专业版现在走真实 Stripe 托管支付流程，支付完成后会把订阅状态回写到你的账号。",
    checkoutNote: "点击后会跳转到 Stripe Checkout。只有支付会话校验成功后，权限才会正式切换。",
    monthly: "月付",
    yearly: "年付",
    currentPlan: "当前套餐",
    freeName: "免费版",
    proName: "专业版",
    freeDesc: "适合演示、早期验证和低频分析。",
    proDesc: "面向自带 Key、真实重跑、分享链接、回收站管理和更高频率分析。",
    month: "月",
    year: "年",
    freeFeatures: [
      "每天 5 次分析",
      "基础爆款采集与手动导入",
      "报告预览和核心分析标签页",
      "OpenAI 默认链路 / 本地兜底"
    ],
    proFeatures: [
      "每天 200 次分析",
      "分享链接、重跑报告、导出 PDF",
      "阿里云百炼 / 云雾 / 自定义兼容供应商",
      "回收站恢复与更高采集上限"
    ],
    activate: "前往安全支付",
    activating: "跳转中...",
    active: "已生效",
    activated: "支付已确认，专业版会员已生效。",
    verifying: "正在校验支付结果...",
    cancelled: "你已取消本次支付，尚未扣款。",
    history: "会员订单",
    noOrders: "还没有会员订单。",
    orderStatus: "状态",
    orderAmount: "金额",
    orderCycle: "计费周期",
    orderTime: "创建时间",
    orderProvider: "支付渠道",
    returnToPrevious: "返回上一页"
  }
};

function formatPrice(lang: Lang, cycle: BillingCycle) {
  return cycle === "yearly"
    ? lang === "zh"
      ? "CNY 999 / 年"
      : "CNY 999 / year"
    : lang === "zh"
      ? "CNY 99 / 月"
      : "CNY 99 / month";
}

function mergeOrder(nextOrder: MembershipOrder, orders: MembershipOrder[]) {
  return [nextOrder, ...orders.filter((item) => item.id !== nextOrder.id)];
}

export function MembershipCheckoutPanel({ lang, user, initialOrders }: Props) {
  const copy = copyByLang[lang];
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

  const currentPrice = useMemo(() => formatPrice(lang, billingCycle), [billingCycle, lang]);
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
    }
  }, [checkoutState, copy.activated, copy.cancelled]);

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
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sessionId
          })
        });
        const payload = (await response.json().catch(() => null)) as ConfirmResponse | null;
        if (!response.ok || !payload?.ok || !payload.data) {
          if (!ignore) {
            setMessage("");
            setError(payload?.error?.message ?? "Payment confirmation failed.");
          }
          return;
        }

        if (ignore) {
          return;
        }

        const confirmedData = payload.data;
        setCurrentUser(confirmedData.user);
        if (confirmedData.order) {
          const nextOrder = confirmedData.order;
          setOrders((current) => mergeOrder(nextOrder, current));
        }
        setError("");
        setMessage(copy.activated);
        router.refresh();

        const params = new URLSearchParams();
        params.set("checkout", "paid");
        if (nextPath) {
          params.set("next", nextPath);
        }
        router.replace(`/membership?${params.toString()}`);
      } catch (cause) {
        if (!ignore) {
          setMessage("");
          setError(cause instanceof Error ? cause.message : "Payment confirmation failed.");
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
  }, [checkoutState, copy.activated, copy.verifying, nextPath, router, sessionId]);

  async function openMembership() {
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
          billingCycle
        })
      });
      const payload = (await response.json().catch(() => null)) as CheckoutResponse | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        setError(payload?.error?.message ?? "Checkout failed.");
        return;
      }

      const checkoutData = payload.data;
      if (checkoutData.order) {
        const nextOrder = checkoutData.order;
        setOrders((current) => mergeOrder(nextOrder, current));
      }

      if (checkoutData.checkoutUrl) {
        window.location.assign(checkoutData.checkoutUrl);
        return;
      }

      setCurrentUser(checkoutData.user);
      setMessage(checkoutData.message || copy.activated);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout failed.");
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
        <span className="badge">{copy.currentPlan}: {currentUser.plan}</span>
        <span className="badge">{currentUser.subscriptionStatus === "active" ? copy.active : currentUser.subscriptionStatus ?? "none"}</span>
        {currentUser.planExpiresAt ? <span className="badge">{lang === "zh" ? `到期：${new Date(currentUser.planExpiresAt).toLocaleDateString("zh-CN")}` : `Expires: ${new Date(currentUser.planExpiresAt).toLocaleDateString("en-US")}`}</span> : null}
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
            {currentUser.plan === "pro" ? <span className="plan-pill">{copy.active}</span> : null}
          </div>

          <div className="pricing-toggle">
            <button type="button" className={`tab-button ${billingCycle === "monthly" ? "tab-button-active" : ""}`} onClick={() => setBillingCycle("monthly")}>{copy.monthly}</button>
            <button type="button" className={`tab-button ${billingCycle === "yearly" ? "tab-button-active" : ""}`} onClick={() => setBillingCycle("yearly")}>{copy.yearly}</button>
          </div>

          <div className="plan-price-row">
            <span className="plan-price">{billingCycle === "yearly" ? "999" : "99"}</span>
            <span className="plan-cycle">CNY / {billingCycle === "yearly" ? copy.year : copy.month}</span>
          </div>
          <p className="small plan-desc">{copy.proDesc}</p>
          <p className="small membership-price-hint">{currentPrice}</p>
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
                <p className="small">{copy.orderProvider}: {order.paymentProvider}</p>
                <p className="small">{copy.orderAmount}: CNY {order.amountCny}</p>
                <p className="small">{copy.orderCycle}: {order.billingCycle}</p>
                <p className="small">{copy.orderStatus}: {order.status}</p>
                <p className="small">{copy.orderTime}: {new Date(order.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
