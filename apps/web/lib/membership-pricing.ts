import type { Lang } from "@/lib/i18n-shared";
import type { BillingCycle } from "@/lib/types";

export const PRO_MONTHLY_PRICE_CNY = 49;
export const PRO_YEARLY_PRICE_CNY = 399;
export const PRO_YEARLY_SAVINGS_PERCENT = 32;

export type MembershipMarketingCopy = {
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
  freeCycle: string;
  monthlyPlanName: string;
  yearlyPlanName: string;
  monthlyDesc: string;
  yearlyDesc: string;
  billingHint: string;
  freeFeatures: string[];
  proFeatures: string[];
  yearlyFeatures: string[];
  current: string;
  activate: string;
  activating: string;
  active: string;
  activated: string;
  verifying: string;
  cancelled: string;
  close: string;
  success: string;
  failed: string;
  loginToUpgrade: string;
  loginHint: string;
  history: string;
  noOrders: string;
  orderStatus: string;
  orderAmount: string;
  orderCycle: string;
  orderTime: string;
  orderProvider: string;
  returnToPrevious: string;
  yearlyBadge: string;
};

const copyByLang: Record<Lang, MembershipMarketingCopy> = {
  en: {
    badge: "Membership",
    title: "Turn ViralBrain.ai into a repeatable research workflow",
    subtitle:
      "ViralBrain.ai now runs in BYOK mode. Users pay their own model and data providers directly, while Pro charges for workflow depth, throughput, and client-ready outputs.",
    checkoutNote:
      "Checkout opens a real Stripe hosted payment flow. Access changes only after the payment session is verified.",
    monthly: "Monthly",
    yearly: "Yearly",
    currentPlan: "Current plan",
    freeName: "Free",
    proName: "Pro",
    freeDesc: "Built for first-time validation. You connect your own keys and compatible provider, test a few ideas, and confirm whether the workflow fits your content process.",
    proDesc: "Built for creators, strategists, and small teams that need repeatable research, benchmark retrieval, and deliverable-ready reports.",
    month: "month",
    year: "year",
    freeCycle: "free forever",
    monthlyPlanName: "Pro (Monthly)",
    yearlyPlanName: "Pro (Yearly)",
    monthlyDesc: "Unlock benchmark retrieval, client-ready deliverables, and higher daily throughput.",
    yearlyDesc: "Best value if you are running content research every week and want a lower blended monthly cost.",
    billingHint: "Third-party API costs are not bundled. Users connect their own YouTube, LLM, and optional Pinecone keys.",
    freeFeatures: [
      "3 analyses per day",
      "Bring your own YouTube key + any OpenAI-compatible LLM key",
      "Core report only: structure, thumbnail, comments, and score",
      "Trend list preview and basic viral collection (up to 5 items per batch)",
    ],
    proFeatures: [
      "50 analyses per day",
      "Pinecone benchmark retrieval and similarity comparison",
      "Full hot trend detail panels",
      "Share links, rerun, PDF export, and recycle-bin recovery",
      "Larger viral collection batches for repeatable research",
    ],
    yearlyFeatures: [
      "Everything in Pro Monthly",
      "Lower effective monthly cost",
      "Better fit for weekly research ops",
      "Priority onboarding support",
    ],
    current: "Current plan",
    activate: "Continue to secure checkout",
    activating: "Redirecting...",
    active: "Active",
    activated: "Payment confirmed. Pro membership is now active.",
    verifying: "Verifying payment...",
    cancelled: "Checkout was cancelled before payment confirmation.",
    close: "Close",
    success: "Stripe checkout session created.",
    failed: "Membership checkout failed.",
    loginToUpgrade: "Sign in to upgrade",
    loginHint: "Sign in first to activate a plan and save membership history.",
    history: "Membership orders",
    noOrders: "No membership orders yet.",
    orderStatus: "Status",
    orderAmount: "Amount",
    orderCycle: "Billing cycle",
    orderTime: "Created",
    orderProvider: "Provider",
    returnToPrevious: "Return to previous page",
    yearlyBadge: `Save ${PRO_YEARLY_SAVINGS_PERCENT}%`,
  },
  zh: {
    badge: "会员方案",
    title: "把 ViralBrain.ai 变成可复用的内容研究工作流",
    subtitle:
      "ViralBrain.ai 当前采用 BYOK 模式。用户自己承担模型和数据平台的调用费用，而 Pro 收费的是工作流深度、效率和可交付能力。",
    checkoutNote:
      "当前支付会进入真实的 Stripe 托管结账流程。只有支付会话校验成功后，权限才会正式切换。",
    monthly: "月付",
    yearly: "年付",
    currentPlan: "当前套餐",
    freeName: "免费版",
    proName: "专业版",
    freeDesc: "适合第一次验证需求。你接入自己的 Key 和兼容模型供应商，跑出少量报告，判断这套工作流是否适合你的内容业务。",
    proDesc: "适合创作者、操盘手和小团队，把爆款研究、对标检索和可交付报告做成稳定日常流程。",
    month: "月",
    year: "年",
    freeCycle: "永久免费",
    monthlyPlanName: "专业版（月付）",
    yearlyPlanName: "专业版（年付）",
    monthlyDesc: "解锁对标检索、可交付报告和更高日分析额度。",
    yearlyDesc: "适合每周持续做内容研究的团队，用更低的平均月成本长期使用。",
    billingHint: "平台不代付第三方 API 成本。用户需要自行接入 YouTube、LLM，以及可选的 Pinecone Key。",
    freeFeatures: [
      "每天 3 次分析",
      "自带 YouTube Key + 任意 OpenAI 兼容模型 Key",
      "仅基础报告：结构、缩略图、评论洞察与评分",
      "趋势列表预览与基础爆款采集（单次最多 5 条）",
    ],
    proFeatures: [
      "每天 50 次分析",
      "Pinecone 对标检索与相似案例召回",
      "完整热门趋势详情页",
      "分享链接、重跑报告、导出 PDF、回收站恢复",
      "更高爆款采集上限，适合连续研究",
    ],
    yearlyFeatures: [
      "包含专业版月付全部能力",
      "平均月成本更低",
      "更适合每周固定研究节奏",
      "优先上手支持",
    ],
    current: "当前套餐",
    activate: "前往安全支付",
    activating: "跳转中...",
    active: "已生效",
    activated: "支付已确认，专业版会员已生效。",
    verifying: "正在校验支付结果...",
    cancelled: "你已取消本次支付，尚未扣款。",
    close: "关闭",
    success: "已创建 Stripe 支付会话。",
    failed: "会员开通失败。",
    loginToUpgrade: "登录后升级",
    loginHint: "先登录，再开通会员并保存你的套餐和订单记录。",
    history: "会员订单",
    noOrders: "还没有会员订单。",
    orderStatus: "状态",
    orderAmount: "金额",
    orderCycle: "计费周期",
    orderTime: "创建时间",
    orderProvider: "支付渠道",
    returnToPrevious: "返回上一页",
    yearlyBadge: `立省 ${PRO_YEARLY_SAVINGS_PERCENT}%`,
  },
};

export function getMembershipMarketingCopy(lang: Lang): MembershipMarketingCopy {
  return copyByLang[lang];
}

export function resolveMembershipPriceCny(cycle: BillingCycle): number {
  return cycle === "yearly" ? PRO_YEARLY_PRICE_CNY : PRO_MONTHLY_PRICE_CNY;
}

export function formatMembershipPriceLabel(lang: Lang, cycle: BillingCycle) {
  const price = resolveMembershipPriceCny(cycle);
  if (lang === "zh") {
    return `CNY ${price} / ${cycle === "yearly" ? "年" : "月"}`;
  }

  return `CNY ${price} / ${cycle === "yearly" ? "year" : "month"}`;
}
