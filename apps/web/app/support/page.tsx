import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getServerLang, text } from "@/lib/i18n";

export default async function SupportPage() {
  const lang = await getServerLang();

  const manualItems = [
    text(lang, "Open the console and paste one YouTube URL.", "打开控制台并粘贴一个 YouTube 链接。"),
    text(lang, "Open API Integrations to connect your own YouTube / model / vector keys when needed.", "按需进入 API 对接页，接入你自己的 YouTube / 模型 / 向量 Key。"),
    text(lang, "Run analysis, then preview report tabs and export or rerun when necessary.", "开始分析后，可预览报告标签页，并按需导出或重跑。")
  ];

  const faqItems = [
    {
      q: text(lang, "Do I need to pay third-party API fees through ViralBrain.ai?", "第三方 API 费用需要通过 ViralBrain.ai 支付吗？"),
      a: text(
        lang,
        "No. ViralBrain.ai sells the workflow and analysis product. Users pay YouTube / model providers directly with their own keys.",
        "不需要。ViralBrain.ai 收费的是工作流和分析产品，用户通过自己的 Key 直接向 YouTube / 模型供应商付费。"
      )
    },
    {
      q: text(lang, "What does Pro unlock?", "Pro 解锁哪些能力？"),
      a: text(
        lang,
        "Higher daily quota, hot trend details, share links, reruns, exports, and advanced provider routing.",
        "更高的每日额度、热门趋势详情、分享链接、重跑、导出，以及高级供应商路由。"
      )
    },
    {
      q: text(lang, "Why do I still see homepage previews or trend demo rows?", "为什么首页展示和热门趋势里还有演示数据？"),
      a: text(
        lang,
        "The homepage is a product overview by design. The Hot Trends page still uses curated preview rows because this repo has not yet connected a real trend aggregation source. Live/provider-backed paths currently exist in single-video fetch, viral collection, and BYOK connection testing.",
        "首页本身就是产品能力展示页。热门趋势页目前仍是策划好的预览样例，因为这个仓库还没有把实时趋势聚合数据源真正接进来。当前已经真实接入的部分主要是单视频抓取、爆款采集，以及用户自带 Key 的连接测试。"
      )
    },
    {
      q: text(lang, "Why am I seeing mock data during analysis?", "为什么我在分析流程里还会看到 mock 数据？"),
      a: text(
        lang,
        "When YouTube keys are missing, the provider is unavailable, or QA mode is enabled, the product falls back to stable mock/local data so the workflow does not break.",
        "当 YouTube Key 缺失、外部供应商不可用，或者当前处于 QA 模式时，系统会回退到稳定的 mock / 本地数据，保证工作流不会直接中断。"
      )
    }
  ];

  const guideCards = [
    {
      key: "youtube",
      kicker: "YouTube Data API",
      title: text(lang, "Get real YouTube metadata", "获取真实 YouTube 数据"),
      intro: text(
        lang,
        "Use your own Google Cloud key so single-video fetch and viral collection stop falling back to demo rows.",
        "使用你自己的 Google Cloud Key，让单视频抓取和爆款采集不再回退到演示数据。"
      ),
      getSteps: [
        text(lang, "Open Google Cloud Console and create/select a project.", "打开 Google Cloud Console，创建或选择一个项目。"),
        text(lang, "Enable YouTube Data API v3 in APIs & Services.", "在 APIs & Services 里启用 YouTube Data API v3。"),
        text(lang, "Create an API key and add HTTP/IP restrictions before production use.", "创建 API Key，并在上线前补上 HTTP / IP 限制。")
      ],
      fillSteps: [
        text(lang, "Open /dashboard/integrations.", "打开 /dashboard/integrations。"),
        text(lang, "Paste the key into “YouTube API Key”.", "把 Key 填进 “YouTube API Key”。"),
        text(lang, "Click “Save Local Config” and then “Test Connection”.", "点击“保存本地配置”，再执行“测试连接”。")
      ],
      note: text(
        lang,
        "If YOUTUBE_FETCH_MODE is set to live on the server, the backend also needs a valid YOUTUBE_API_KEY env.",
        "如果服务端把 YOUTUBE_FETCH_MODE 设成 live，后端环境里也需要配置有效的 YOUTUBE_API_KEY。"
      )
    },
    {
      key: "llm",
      kicker: "OpenAI-Compatible LLM",
      title: text(lang, "Connect OpenAI / Bailian / Yunwu / custom providers", "连接 OpenAI / 百炼 / 云雾 / 自定义模型"),
      intro: text(
        lang,
        "The app uses OpenAI-compatible request shape. You can keep the default OpenAI base URL or replace it with your domestic/custom endpoint.",
        "当前应用使用 OpenAI 兼容请求格式。你可以保留默认 OpenAI Base URL，也可以替换成国产/自定义兼容地址。"
      ),
      getSteps: [
        text(lang, "Create an API key from your provider console.", "在对应供应商控制台创建 API Key。"),
        text(lang, "Copy the API base URL if the provider is not OpenAI’s default endpoint.", "如果不是 OpenAI 默认地址，同时复制该供应商的 Base URL。"),
        text(lang, "Prepare one analysis model and one score model; optional embedding model if you use vector retrieval.", "准备一个分析模型和一个评分模型；如果要做向量检索，再准备 embedding 模型。")
      ],
      fillSteps: [
        text(lang, "Open /dashboard/integrations and choose the provider preset.", "打开 /dashboard/integrations，先选择供应商预设。"),
        text(lang, "Fill in API Key, Base URL, Analysis model, Score model, and optional Embedding model.", "填写 API Key、Base URL、分析模型、评分模型，以及可选的向量模型。"),
        text(lang, "Save locally, then run the built-in connection test.", "先本地保存，再运行内置测试连接。")
      ],
      note: text(
        lang,
        "This project stores BYOK credentials only in the current browser for MVP safety; it does not write user secrets into the database.",
        "这个项目当前只把 BYOK 凭证保存在当前浏览器，不会把用户密钥写入数据库。"
      )
    },
    {
      key: "pinecone",
      kicker: "Pinecone",
      title: text(lang, "Enable real benchmark retrieval", "开启真实向量对标检索"),
      intro: text(
        lang,
        "Pinecone is optional. Without it, the app falls back to local similarity logic for benchmark retrieval.",
        "Pinecone 是可选项。不配置时，系统会回退到本地相似度逻辑进行对标召回。"
      ),
      getSteps: [
        text(lang, "Create a Pinecone project and an index whose dimension matches your embedding model.", "创建 Pinecone 项目和索引，索引维度要和你的 embedding 模型匹配。"),
        text(lang, "Copy the API key and index host.", "复制 API Key 和索引 Host。"),
        text(lang, "Decide a namespace, for example viral-library.", "准备一个 namespace，例如 viral-library。")
      ],
      fillSteps: [
        text(lang, "Paste Pinecone API Key, Index Host, Index Name, and Namespace into /dashboard/integrations.", "把 Pinecone API Key、Index Host、Index Name 和 Namespace 填入 /dashboard/integrations。"),
        text(lang, "Make sure your selected embedding model matches the index dimension.", "确认你填写的 embedding 模型和索引维度一致。"),
        text(lang, "Run connection test, then re-index the viral library if needed.", "执行测试连接，如有需要再重新为爆款库建立索引。")
      ],
      note: text(
        lang,
        "If either the embedding provider or Pinecone is unavailable, benchmark retrieval falls back to a deterministic local path instead of crashing.",
        "如果 embedding 供应商或 Pinecone 不可用，系统会回退到确定性的本地路径，而不是直接报错中断。"
      )
    },
    {
      key: "stripe",
      kicker: "Stripe Billing",
      title: text(lang, "Enable real membership payment", "开启真实会员支付"),
      intro: text(
        lang,
        "Membership checkout now supports real Stripe hosted checkout plus webhook reconciliation.",
        "会员支付现在支持真实 Stripe 托管结账和 webhook 回写。"
      ),
      getSteps: [
        text(lang, "Create a Stripe account and copy STRIPE_SECRET_KEY.", "创建 Stripe 账号，并复制 STRIPE_SECRET_KEY。"),
        text(lang, "Create recurring monthly/yearly prices, or let this project build inline recurring prices automatically.", "创建月付/年付循环价格，或者直接让本项目自动创建内联循环价格。"),
        text(lang, "Register a webhook endpoint that points to /api/membership/webhook/stripe and copy STRIPE_WEBHOOK_SECRET.", "注册一个 webhook 端点，指向 /api/membership/webhook/stripe，并复制 STRIPE_WEBHOOK_SECRET。")
      ],
      fillSteps: [
        text(lang, "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in apps/web/.env.local.", "在 apps/web/.env.local 里设置 STRIPE_SECRET_KEY 和 STRIPE_WEBHOOK_SECRET。"),
        text(lang, "Optional: set STRIPE_PRO_MONTHLY_PRICE_ID and STRIPE_PRO_YEARLY_PRICE_ID if you want to use prebuilt Stripe prices.", "可选：如果你想使用预先创建好的 Stripe Price，再补 STRIPE_PRO_MONTHLY_PRICE_ID 和 STRIPE_PRO_YEARLY_PRICE_ID。"),
        text(lang, "Restart Next.js, re-run the latest supabase/schema.sql, then open /membership to test checkout.", "重启 Next.js，重新执行最新 supabase/schema.sql，然后进入 /membership 测试支付。")
      ],
      note: text(
        lang,
        "When Supabase is your backend, Stripe webhook reconciliation requires SUPABASE_SERVICE_ROLE_KEY on the server.",
        "如果你使用 Supabase 作为后端，Stripe webhook 回写还需要服务端存在 SUPABASE_SERVICE_ROLE_KEY。"
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
              "This page centralizes the quick-start path, API setup tutorials, billing notes, and direct support channels.",
              "这里集中提供上手路径、API 配置教程、计费说明，以及直接支持入口。"
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
              <h2 style={{ margin: "6px 0 0" }}>{text(lang, "How to get the keys and where to configure them", "去哪里申请 Key，以及在项目里怎么配置")}</h2>
            </div>
            <div className="support-quick-actions">
              <Link href="/dashboard/integrations" className="btn btn-primary">
                {text(lang, "Open API Integrations", "打开 API 对接")}
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
                "Send context, screenshots, and the page you are blocked on. We can usually identify whether the issue is auth, webhook, quota, or provider configuration.",
                "把上下文、截图以及卡住的页面一起发过来，我们通常能快速判断是登录、webhook、额度，还是供应商配置问题。"
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
