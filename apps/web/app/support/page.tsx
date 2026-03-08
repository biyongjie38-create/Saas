import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getServerLang, text } from "@/lib/i18n";

export default async function SupportPage() {
  const lang = await getServerLang();

  const manualItems = [
    text(lang, "Open Link Analysis and paste one YouTube URL.", "打开“链接分析”并粘贴一个 YouTube 链接。"),
    text(
      lang,
      "If you need live model output, configure the model provider and optional Pinecone directly below the Link Analysis workspace.",
      "如果你要跑真实模型分析，就在“链接分析”页面下方配置模型供应商，以及可选的 Pinecone。"
    ),
    text(
      lang,
      "If you need real collection or live trend refresh, open Viral Collector and configure your YouTube Data API key below that page.",
      "如果你要做真实作品采集或热门趋势实时刷新，就去“爆款作品采集”页面下方配置 YouTube Data API Key。"
    )
  ];

  const faqItems = [
    {
      q: text(lang, "Do I need to pay third-party API fees through ViralBrain.ai?", "第三方 API 费用需要通过 ViralBrain.ai 支付吗？"),
      a: text(
        lang,
        "No. ViralBrain.ai sells the workflow and analysis product. Users pay YouTube, model providers, and vector services directly with their own keys.",
        "不需要。ViralBrain.ai 收费的是工作流和分析产品，用户通过自己的 Key 直接向 YouTube、模型供应商和向量服务商付费。"
      )
    },
    {
      q: text(lang, "Where do I configure APIs now?", "现在 API 要去哪里配置？"),
      a: text(
        lang,
        "Model provider and Pinecone now live below Link Analysis. The YouTube Data API key now lives below Viral Collector. The old standalone API Integrations page has been removed.",
        "模型供应商和 Pinecone 现在放在“链接分析”页面下方，YouTube Data API Key 现在放在“爆款作品采集”页面下方。原来的独立“API 对接”页已经拿掉。"
      )
    },
    {
      q: text(lang, "What does Pro unlock?", "Pro 解锁哪些能力？"),
      a: text(
        lang,
        "Higher daily quota, hot trend detail panels, share links, reruns, exports, and advanced provider routing.",
        "更高的每日额度、热门趋势详情、分享链接、重跑、导出，以及高级供应商路由。"
      )
    },
    {
      q: text(lang, "Why might I still see fallback or mock data?", "为什么我有时还是会看到回退 / mock 数据？"),
      a: text(
        lang,
        "When the current browser has no key configured, the server has no usable key, or the provider is temporarily unavailable, the product falls back to stable sample data so the workflow stays usable.",
        "当当前浏览器没有配置 Key、服务端也没有可用 Key，或者外部供应商暂时不可用时，系统会回退到稳定样例数据，避免工作流直接中断。"
      )
    }
  ];

  const guideCards = [
    {
      key: "analysis-llm",
      kicker: text(lang, "Link Analysis", "链接分析"),
      title: text(lang, "Model provider API setup", "模型供应商 API 配置"),
      intro: text(
        lang,
        "Link Analysis uses an OpenAI-compatible model provider. You can keep the default OpenAI endpoint or switch to Bailian, Yunwu, or any compatible custom endpoint.",
        "链接分析使用 OpenAI 兼容的模型供应商。你可以继续用默认 OpenAI，也可以切到阿里云百炼、云雾，或任何兼容接口。"
      ),
      getSteps: [
        text(lang, "Create an API key in your provider console.", "在对应模型供应商控制台创建 API Key。"),
        text(lang, "If the provider is not OpenAI, copy its compatible Base URL as well.", "如果不是 OpenAI 默认地址，同时复制它的兼容 Base URL。"),
        text(lang, "Prepare an analysis model and a score model. Optionally prepare an embedding model.", "准备一个分析模型和一个评分模型；如需向量检索，再准备一个 embedding 模型。")
      ],
      fillSteps: [
        text(lang, "Open /dashboard.", "打开 /dashboard。"),
        text(lang, "Scroll to the API panel below Link Analysis.", "滚动到“链接分析”下方的 API 面板。"),
        text(lang, "Select the provider preset, fill API Key / Base URL / model names, then save and test.", "选择供应商预设，填写 API Key、Base URL 和模型名，然后保存并测试连接。")
      ],
      note: text(
        lang,
        "These settings are reused by link analysis, report reruns, and benchmark scoring in the same browser session.",
        "这些配置会在同一浏览器里复用给链接分析、报告重跑和评分流程。"
      )
    },
    {
      key: "analysis-pinecone",
      kicker: "Pinecone",
      title: text(lang, "Optional vector benchmark retrieval", "可选的向量对标检索配置"),
      intro: text(
        lang,
        "Pinecone is optional. Without it, the product falls back to local similarity logic for benchmark retrieval.",
        "Pinecone 是可选项。不配置时，系统会用本地相似度逻辑作为对标检索兜底。"
      ),
      getSteps: [
        text(lang, "Create a Pinecone project and an index that matches your embedding dimension.", "创建 Pinecone 项目和与 embedding 维度匹配的索引。"),
        text(lang, "Copy the API key and index host.", "复制 Pinecone API Key 和 Index Host。"),
        text(lang, "Prepare an index name and namespace, for example viral-library.", "准备索引名和 namespace，例如 viral-library。")
      ],
      fillSteps: [
        text(lang, "Open /dashboard.", "打开 /dashboard。"),
        text(lang, "Scroll to the API panel below Link Analysis.", "滚动到“链接分析”下方的 API 面板。"),
        text(lang, "Fill in Pinecone API Key, Index Host, Index Name, and Namespace, then save and test.", "填写 Pinecone API Key、Index Host、Index Name 和 Namespace，然后保存并测试。")
      ],
      note: text(
        lang,
        "Make sure the embedding model you choose matches the index dimension, otherwise retrieval quality will be unstable.",
        "请确认你选择的 embedding 模型与索引维度一致，否则检索质量会不稳定。"
      )
    },
    {
      key: "collector-youtube",
      kicker: "YouTube Data API",
      title: text(lang, "YouTube key for viral collection and live trends", "用于采集与热门趋势的 YouTube Key"),
      intro: text(
        lang,
        "The YouTube Data API key now lives under Viral Collector. Once saved, it is also reused by single-video fetch and Hot Trends in the same browser.",
        "YouTube Data API Key 现在统一放在“爆款作品采集”页下方。保存后，也会在同一浏览器里复用给单视频抓取和热门趋势。"
      ),
      getSteps: [
        text(lang, "Open Google Cloud Console and create or select a project.", "打开 Google Cloud Console，创建或选择一个项目。"),
        text(lang, "Enable YouTube Data API v3 in APIs & Services.", "在 APIs & Services 里启用 YouTube Data API v3。"),
        text(lang, "Create an API key and add HTTP / IP restrictions before production use.", "创建 API Key，并在正式使用前补上 HTTP / IP 限制。")
      ],
      fillSteps: [
        text(lang, "Open /dashboard/collector.", "打开 /dashboard/collector。"),
        text(lang, "Scroll to the API panel below Viral Collector.", "滚动到“爆款作品采集”下方的 API 面板。"),
        text(lang, "Paste the YouTube API Key, save locally, then run the built-in connection test.", "粘贴 YouTube API Key，本地保存后执行内置测试连接。")
      ],
      note: text(
        lang,
        "If the current browser and the server both lack a usable YouTube key, viral collection and Hot Trends will fall back to stable sample rows.",
        "如果当前浏览器和服务端都没有可用的 YouTube Key，爆款采集和热门趋势会回退到稳定样例。"
      )
    },
    {
      key: "stripe",
      kicker: "Stripe Billing",
      title: text(lang, "Real membership payment setup", "真实会员支付配置"),
      intro: text(
        lang,
        "Membership checkout now supports a real Stripe hosted checkout flow plus webhook reconciliation.",
        "会员支付现在已经支持真实 Stripe 托管结账，以及 webhook 回写。"
      ),
      getSteps: [
        text(lang, "Create a Stripe account and copy STRIPE_SECRET_KEY.", "创建 Stripe 账号，并复制 STRIPE_SECRET_KEY。"),
        text(lang, "Create monthly / yearly recurring prices if you want fixed Stripe prices.", "如果你想使用固定 Stripe Price，就创建月付 / 年付循环价格。"),
        text(lang, "Register a webhook endpoint that points to /api/membership/webhook/stripe and copy STRIPE_WEBHOOK_SECRET.", "注册一个指向 /api/membership/webhook/stripe 的 webhook，并复制 STRIPE_WEBHOOK_SECRET。")
      ],
      fillSteps: [
        text(lang, "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in apps/web/.env.local.", "在 apps/web/.env.local 里设置 STRIPE_SECRET_KEY 和 STRIPE_WEBHOOK_SECRET。"),
        text(lang, "Optional: set STRIPE_PRO_MONTHLY_PRICE_ID and STRIPE_PRO_YEARLY_PRICE_ID.", "可选：设置 STRIPE_PRO_MONTHLY_PRICE_ID 和 STRIPE_PRO_YEARLY_PRICE_ID。"),
        text(lang, "Restart Next.js, execute the latest supabase/schema.sql, then open /membership to verify checkout.", "重启 Next.js，执行最新 supabase/schema.sql，然后打开 /membership 验证支付流程。")
      ],
      note: text(
        lang,
        "When Supabase is the backend, webhook reconciliation also requires a server-side SUPABASE_SERVICE_ROLE_KEY.",
        "如果 Supabase 是后端，webhook 回写还需要服务端存在 SUPABASE_SERVICE_ROLE_KEY。"
      )
    }
  ];

  return (
    <main>
      <SiteNav />
      <section className="shell section support-shell">
        <div className="section-intro">
          <span className="badge">{text(lang, "Help & Support", "帮助与支持")}</span>
          <h1 style={{ marginTop: 18 }}>{text(lang, "Learn the workflow fast and resolve setup blockers", "快速学会工作流，并解决配置与使用问题")}</h1>
          <p>
            {text(
              lang,
              "This page centralizes the quick-start path, updated API setup tutorials, billing notes, and direct support channels.",
              "这里集中提供上手路径、更新后的 API 配置教程、计费说明，以及直接支持入口。"
            )}
          </p>
        </div>

        <div className="support-grid">
          <article className="card panel" id="manual">
            <p className="card-kicker">{text(lang, "User Manual", "用户手册")}</p>
            <h3>{text(lang, "Start in three steps", "三步开始使用")}</h3>
            <ul className="list">
              {manualItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="card panel" id="faq">
            <p className="card-kicker">FAQ</p>
            <h3>{text(lang, "Most common questions", "最常见问题")}</h3>
            <div className="faq-stack">
              {faqItems.map((item) => (
                <div key={item.q} className="faq-item">
                  <strong>{item.q}</strong>
                  <p>{item.a}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <section className="card panel support-guide-shell" id="api-guide">
          <div className="library-card-head support-guide-head">
            <div>
              <p className="card-kicker">{text(lang, "API & Billing Guide", "API 与支付教程")}</p>
              <h2 style={{ margin: "6px 0 0" }}>{text(lang, "Which key to get, and which page to configure it on", "每类 Key 去哪里申请，以及现在该在什么页面里配置")}</h2>
            </div>
            <div className="support-quick-actions">
              <Link href="/dashboard" className="btn btn-primary">
                {text(lang, "Open Link Analysis", "打开链接分析")}
              </Link>
              <Link href="/dashboard/collector" className="btn btn-ghost">
                {text(lang, "Open Viral Collector", "打开爆款作品采集")}
              </Link>
              <Link href="/membership" className="btn btn-ghost">
                {text(lang, "Open Membership", "打开会员支付")}
              </Link>
            </div>
          </div>

          <div className="support-guide-grid">
            {guideCards.map((card) => (
              <article key={card.key} className="card panel support-guide-card">
                <p className="card-kicker">{card.kicker}</p>
                <h3>{card.title}</h3>
                <p>{card.intro}</p>

                <div className="support-step-block">
                  <strong>{text(lang, "How to get it", "如何获取")}</strong>
                  <ul className="list">
                    {card.getSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>

                <div className="support-step-block">
                  <strong>{text(lang, "How to configure it in ViralBrain.ai", "在 ViralBrain.ai 里怎么填")}</strong>
                  <ul className="list">
                    {card.fillSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>

                <p className="small">{card.note}</p>
              </article>
            ))}
          </div>
        </section>

        <article className="card panel support-contact-card" id="contact">
          <div>
            <p className="card-kicker">{text(lang, "Contact Support", "联系支持")}</p>
            <h3>{text(lang, "Need help with plan, auth, or provider configuration?", "如果套餐、登录或供应商配置卡住，直接联系支持。")}</h3>
            <p>
              {text(
                lang,
                "Send context, screenshots, and the exact page where you are blocked. We can usually tell quickly whether the issue is auth, webhook, quota, or provider configuration.",
                "把上下文、截图以及卡住的具体页面一起发过来，我们通常能很快判断是登录、webhook、额度，还是供应商配置问题。"
              )}
            </p>
          </div>
          <div className="support-contact-actions">
            <a className="btn btn-primary" href="mailto:support@viralbrain.ai">
              support@viralbrain.ai
            </a>
            <a className="btn btn-ghost" href="https://github.com/biyongjie38-create/Saas" target="_blank" rel="noreferrer">
              {text(lang, "Open Repository", "查看仓库")}
            </a>
          </div>
        </article>
      </section>
      <SiteFooter lang={lang} />
    </main>
  );
}
