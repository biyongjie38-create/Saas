import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getServerLang, text } from "@/lib/i18n";

type GuideCard = {
  key: string;
  kicker: string;
  title: string;
  intro: string;
  getSteps: ReactNode[];
  fillSteps: ReactNode[];
  note: string;
};

export default async function SupportPage() {
  const lang = await getServerLang();

  const manualItems: ReactNode[] = [
    text(lang, "Open Link Analysis and paste one YouTube URL.", "打开“链接分析”并粘贴一个 YouTube 链接。"),
    text(
      lang,
      "If you need live model output, configure the model provider and optional Pinecone directly below the Link Analysis workspace.",
      "如果你要跑真实模型分析，就在“链接分析”页面下方配置模型供应商，以及可选的 Pinecone。",
    ),
    text(
      lang,
      "If you need real collection or live trend refresh, open Viral Collector and configure your YouTube Data API key below that page.",
      "如果你要做真实作品采集或热门趋势实时刷新，就去“爆款作品采集”页面下方配置 YouTube Data API Key。",
    ),
  ];

  const faqItems = [
    {
      q: text(lang, "Do I need to pay third-party API fees through ViralBrain.ai?", "第三方 API 费用需要通过 ViralBrain.ai 支付吗？"),
      a: text(
        lang,
        "No. ViralBrain.ai sells the workflow and analysis product. Users pay YouTube, model providers, and vector services directly with their own keys.",
        "不需要。ViralBrain.ai 收费的是工作流和分析产品，用户通过自己的 Key 直接向 YouTube、模型供应商和向量服务商付费。",
      ),
    },
    {
      q: text(lang, "Where do I configure APIs now?", "现在 API 要去哪里配置？"),
      a: text(
        lang,
        "Model provider and Pinecone now live below Link Analysis. The YouTube Data API key now lives below Viral Collector. The old standalone API Integrations page has been removed.",
        "模型供应商和 Pinecone 现在放在“链接分析”页面下方，YouTube Data API Key 现在放在“爆款作品采集”页面下方。原来的独立“API 对接”页已经移除。",
      ),
    },
    {
      q: text(lang, "How do I switch myself between Free and Pro?", "我怎么把自己切到免费版或会员版？"),
      a: text(
        lang,
        "In production with Supabase, edit the user_profiles row. In local development, either enable the test-auth bypass route or edit the mock database directly.",
        "如果你在线上用 Supabase，就修改 user_profiles 里的当前用户记录；如果你在本地开发，可以启用测试登录旁路，或者直接改 mock 数据库。",
      ),
    },
    {
      q: text(lang, "Why might I still see fallback data?", "为什么我有时还是会看到回退数据？"),
      a: text(
        lang,
        "When the browser has no key, the server has no usable key, or the upstream provider is temporarily unavailable, the product falls back to stable sample rows so the workflow stays usable.",
        "当浏览器没有 Key、服务端也没有可用 Key，或者上游供应商暂时不可用时，系统会回退到稳定样例数据，避免工作流直接中断。",
      ),
    },
  ];

  const guideCards: GuideCard[] = [
    {
      key: "analysis-llm",
      kicker: text(lang, "Link Analysis", "链接分析"),
      title: text(lang, "Model provider API setup", "模型供应商 API 配置"),
      intro: text(
        lang,
        "Link Analysis uses an OpenAI-compatible model provider. You can keep the default OpenAI endpoint or switch to Bailian, Yunwu, or any compatible custom endpoint.",
        "链接分析使用 OpenAI 兼容模型接口。你可以继续用默认 OpenAI，也可以切到百炼、云雾，或任何兼容端点。",
      ),
      getSteps: [
        text(lang, "Create an API key in your provider console.", "在对应模型供应商控制台创建 API Key。"),
        text(lang, "If the provider is not OpenAI, copy its compatible Base URL as well.", "如果不是 OpenAI 默认地址，同时复制它的兼容 Base URL。"),
        text(lang, "Prepare an analysis model and a score model. Optionally prepare an embedding model.", "准备一个分析模型和一个评分模型；如需向量检索，再准备一个 embedding 模型。"),
      ],
      fillSteps: [
        text(lang, "Open /dashboard.", "打开 /dashboard。"),
        text(lang, "Scroll to the API panel below Link Analysis.", "滚动到“链接分析”下方的 API 面板。"),
        text(lang, "Select the provider preset, fill API Key / Base URL / model names, then save and test.", "选择供应商预设，填写 API Key、Base URL 和模型名，然后保存并测试连接。"),
      ],
      note: text(
        lang,
        "These settings are reused by link analysis, report reruns, and benchmark scoring in the same browser session.",
        "这些配置会在同一浏览器里复用给链接分析、报告重跑和评分流程。",
      ),
    },
    {
      key: "analysis-pinecone",
      kicker: "Pinecone",
      title: text(lang, "Optional vector benchmark retrieval", "可选的向量对标检索配置"),
      intro: text(
        lang,
        "Pinecone is optional. Without it, the product falls back to local similarity logic for benchmark retrieval.",
        "Pinecone 是可选项。不配置时，系统会用本地相似度逻辑作为对标检索兜底。",
      ),
      getSteps: [
        text(lang, "Create a Pinecone project and an index that matches your embedding dimension.", "创建 Pinecone 项目和与 embedding 维度匹配的索引。"),
        text(lang, "Copy the API key and index host.", "复制 Pinecone API Key 和 Index Host。"),
        text(lang, "Prepare an index name and namespace, for example viral-library.", "准备索引名和 namespace，例如 viral-library。"),
      ],
      fillSteps: [
        text(lang, "Open /dashboard.", "打开 /dashboard。"),
        text(lang, "Scroll to the API panel below Link Analysis.", "滚动到“链接分析”下方的 API 面板。"),
        text(lang, "Fill in Pinecone API Key, Index Host, Index Name, and Namespace, then save and test.", "填写 Pinecone API Key、Index Host、Index Name 和 Namespace，然后保存并测试。"),
      ],
      note: text(
        lang,
        "Make sure the embedding model matches the index dimension, otherwise retrieval quality will be unstable.",
        "请确认 embedding 模型与索引维度一致，否则检索质量会不稳定。",
      ),
    },
    {
      key: "collector-youtube",
      kicker: "YouTube Data API",
      title: text(lang, "YouTube key for viral collection and live trends", "用于采集与热门趋势的 YouTube Key"),
      intro: text(
        lang,
        "The YouTube Data API key now lives under Viral Collector. Once saved, it is also reused by single-video fetch and Hot Trends in the same browser.",
        "YouTube Data API Key 现在统一放在“爆款作品采集”页面下方。保存后，也会在同一浏览器里复用给单视频抓取和热门趋势。",
      ),
      getSteps: [
        text(lang, "Open Google Cloud Console and create or select a project.", "打开 Google Cloud Console，创建或选择一个项目。"),
        text(lang, "Enable YouTube Data API v3 in APIs & Services.", "在 APIs & Services 里启用 YouTube Data API v3。"),
        text(lang, "Create an API key and add HTTP or IP restrictions before production use.", "创建 API Key，并在正式使用前补上 HTTP 或 IP 限制。"),
      ],
      fillSteps: [
        text(lang, "Open /dashboard/collector.", "打开 /dashboard/collector。"),
        text(lang, "Scroll to the API panel below Viral Collector.", "滚动到“爆款作品采集”下方的 API 面板。"),
        text(lang, "Paste the YouTube API Key, save locally, then run the built-in connection test.", "粘贴 YouTube API Key，本地保存后执行内置连接测试。"),
      ],
      note: text(
        lang,
        "If both the browser and the server lack a usable YouTube key, viral collection and Hot Trends will fall back to stable sample rows.",
        "如果浏览器和服务端都没有可用的 YouTube Key，爆款采集和热门趋势都会回退到稳定样例。",
      ),
    },
    {
      key: "stripe",
      kicker: "Stripe Billing",
      title: text(lang, "Real membership payment setup", "真实会员支付配置"),
      intro: text(
        lang,
        "Membership checkout supports Stripe hosted checkout plus webhook reconciliation.",
        "会员支付已经支持 Stripe 托管结账和 webhook 回写。",
      ),
      getSteps: [
        text(lang, "Create a Stripe account and copy STRIPE_SECRET_KEY.", "创建 Stripe 账号，并复制 STRIPE_SECRET_KEY。"),
        text(lang, "Create monthly and yearly recurring prices if you want fixed Stripe prices.", "如果你想使用固定 Stripe Price，就创建月付和年付的循环价格。"),
        text(lang, "Register a webhook endpoint that points to /api/membership/webhook/stripe and copy STRIPE_WEBHOOK_SECRET.", "注册一个指向 /api/membership/webhook/stripe 的 webhook，并复制 STRIPE_WEBHOOK_SECRET。"),
      ],
      fillSteps: [
        text(lang, "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in apps/web/.env.local.", "在 apps/web/.env.local 里设置 STRIPE_SECRET_KEY 和 STRIPE_WEBHOOK_SECRET。"),
        text(lang, "Optional: set STRIPE_PRO_MONTHLY_PRICE_ID and STRIPE_PRO_YEARLY_PRICE_ID.", "可选：设置 STRIPE_PRO_MONTHLY_PRICE_ID 和 STRIPE_PRO_YEARLY_PRICE_ID。"),
        text(lang, "Restart Next.js, execute the latest supabase/schema.sql, then open /membership to verify checkout.", "重启 Next.js，执行最新 supabase/schema.sql，然后打开 /membership 验证支付流程。"),
      ],
      note: text(
        lang,
        "When Supabase is the backend, webhook reconciliation also needs a server-side SUPABASE_SERVICE_ROLE_KEY.",
        "如果 Supabase 是后端，webhook 回写还需要服务端存在 SUPABASE_SERVICE_ROLE_KEY。",
      ),
    },
    {
      key: "membership-control",
      kicker: text(lang, "Membership Control", "会员控制"),
      title: text(lang, "How to switch yourself between Free and Pro", "如何把自己切到免费版或会员版"),
      intro: text(
        lang,
        "There are three practical control modes: production Supabase, local mock backend, and local test-auth bypass.",
        "这块有 3 种常用控制方式：线上 Supabase、本地 mock 数据库、本地测试登录旁路。",
      ),
      getSteps: [
        <>
          <strong>{text(lang, "Production Supabase:", "线上 Supabase：")}</strong>{" "}
          <span>{text(lang, "edit your row in", "修改你自己在")} <code>user_profiles</code> {text(lang, "and set", "中的记录，设置")} <code>plan</code> {text(lang, "to", "为")} <code>free</code> {text(lang, "or", "或")} <code>pro</code>，<code>subscription_status</code> {text(lang, "to", "为")} <code>none</code> {text(lang, "or", "或")} <code>active</code>。</span>
        </>,
        <>
          <strong>{text(lang, "Local mock backend:", "本地 mock 后端：")}</strong>{" "}
          <span>{text(lang, "edit", "修改")} <code>data/mock-db.json</code> {text(lang, "inside the current user row.", "里当前用户那一行的 plan 和 subscriptionStatus。")}</span>
        </>,
        <>
          <strong>{text(lang, "Local test bypass:", "本地测试旁路：")}</strong>{" "}
          <span>{text(lang, "set", "把")} <code>ENABLE_E2E_AUTH_BYPASS=true</code> {text(lang, "in", "写到")} <code>apps/web/.env.local</code>。</span>
        </>,
      ],
      fillSteps: [
        <>
          <span>{text(lang, "Switch to Pro:", "切到会员：")} <code>/api/test-auth/login?plan=pro&amp;next=/dashboard</code></span>
        </>,
        <>
          <span>{text(lang, "Switch to Free:", "切到免费：")} <code>/api/test-auth/login?plan=free&amp;next=/dashboard</code></span>
        </>,
        <>
          <span>{text(lang, "This route only exists when test bypass is enabled, and it is meant for local QA only.", "这个路由只有在启用测试旁路时才存在，只用于本地 QA。")}</span>
        </>,
      ],
      note: text(
        lang,
        "Normal production upgrades and downgrades should still be driven by Stripe checkout and webhook reconciliation.",
        "正式环境下的升级和降级，仍然建议通过 Stripe 结账和 webhook 回写来驱动。",
      ),
    },
    {
      key: "diagnostics",
      kicker: text(lang, "Diagnostics", "测试与诊断"),
      title: text(lang, "How to test captions fetch and thumbnail multimodal locally", "如何本地测试字幕抓取和缩略图多模态"),
      intro: text(
        lang,
        "These two chains require the machine running the server to reach YouTube, i.ytimg.com, Google APIs, and your model provider endpoint.",
        "这两条链要求运行服务端的机器能访问 YouTube、i.ytimg.com、Google APIs，以及你的模型供应商域名。",
      ),
      getSteps: [
        text(lang, "Set YOUTUBE_API_KEY in apps/web/.env.local and start apps/web.", "在 apps/web/.env.local 里设置 YOUTUBE_API_KEY，并启动 apps/web。"),
        text(lang, "Set OPENAI_API_KEY or another compatible provider in apps/ai-service/.env and start apps/ai-service.", "在 apps/ai-service/.env 里设置 OPENAI_API_KEY 或其他兼容供应商，并启动 apps/ai-service。"),
        text(lang, "Use one public YouTube URL that definitely has captions, and another URL that has no captions, for fallback verification.", "准备一个确认有字幕的公开视频，再准备一个没有字幕的视频，用来验证回退路径。"),
      ],
      fillSteps: [
        <>
          <span>{text(lang, "Step 1: POST", "步骤 1：请求")} <code>/api/youtube/fetch</code> {text(lang, "and confirm the response contains", "，确认返回里包含")} <code>captionsText</code>。</span>
        </>,
        <>
          <span>{text(lang, "Step 2: open Link Analysis and analyze the same URL. The generated report snapshot should show transcript content.", "步骤 2：到“链接分析”分析同一个视频，生成报告后在快照页应能看到字幕内容。")}</span>
        </>,
        <>
          <span>{text(lang, "Step 3: check ai-service logs. If the thumbnail is downloaded successfully, the model call will run with image input first; if not, it will fall back to text-only.", "步骤 3：查看 ai-service 日志。如果缩略图下载成功，会先走图片输入；如果失败，会自动回退到纯文本。")}</span>
        </>,
        <>
          <span>{text(lang, "Step 4: run the no-caption sample. It should still finish analysis, but the report will show that no transcript was captured.", "步骤 4：再跑没有字幕的视频。分析仍应完成，但报告会显示未抓取到字幕。")}</span>
        </>,
      ],
      note: text(
        lang,
        "If your server cannot reach YouTube from the current network, you need to test this on a machine or server that can. The code path is complete, but outbound connectivity is still a hard prerequisite.",
        "如果当前网络下服务端无法访问 YouTube，就需要换到能通外网的机器或服务器上测试。代码链路已经接好，但出网能力仍是硬前提。",
      ),
    },
    {
      key: "pdf-font",
      kicker: text(lang, "PDF Export", "PDF 导出"),
      title: text(lang, "Chinese font embedding for report export", "报告导出的中文字体嵌入"),
      intro: text(
        lang,
        "PDF export now supports CJK fonts. On Windows development machines, the app will auto-detect common fonts. In deployment, set explicit font paths.",
        "PDF 导出现在支持 CJK 字体。Windows 开发机上会自动探测常见字体；部署环境建议显式配置字体路径。",
      ),
      getSteps: [
        <>
          <span><code>PDF_CJK_FONT_PATH</code> {text(lang, "points to a readable TTF or OTF font file, for example Noto Sans SC or SimHei.", "指向一个可读的 TTF 或 OTF 字体文件，例如 Noto Sans SC 或黑体。")}</span>
        </>,
        <>
          <span><code>PDF_CJK_BOLD_FONT_PATH</code> {text(lang, "is optional. If omitted, the regular font is reused for bold headings.", "可选。不填时会复用常规字体作为粗体标题。")}</span>
        </>,
        text(lang, "Restart Next.js after changing env vars.", "修改环境变量后重启 Next.js。"),
      ],
      fillSteps: [
        <>
          <span>{text(lang, "Windows dev usually works without extra setup because common fonts are auto-detected.", "Windows 本地开发一般无需额外配置，因为会自动探测常见字体。")}</span>
        </>,
        <>
          <span>{text(lang, "For Linux or cloud deployment, set the two env vars explicitly, then export one report that contains Chinese title or transcript content.", "Linux 或云端部署请显式设置这两个环境变量，然后导出一份带中文标题或字幕的报告。")}</span>
        </>,
        <>
          <span>{text(lang, "If the PDF renders Chinese correctly and no line overflows appear, the embedding is working.", "如果 PDF 里的中文显示正常，且没有整行溢出，说明字体嵌入已经生效。")}</span>
        </>,
      ],
      note: text(
        lang,
        "If no CJK font is available, export will still work but fall back to ASCII-safe output. For production Chinese reports, always configure an explicit font file.",
        "如果没有可用的 CJK 字体，导出仍能工作，但会退回到 ASCII 安全输出。要稳定导出中文报告，建议始终显式配置字体文件。",
      ),
    },
  ];

  return (
    <main>
      <SiteNav />
      <section className="shell section support-shell">
        <div className="section-intro">
          <span className="badge">{text(lang, "Help & Support", "帮助与支持")}</span>
          <h1 style={{ marginTop: 18 }}>
            {text(lang, "Learn the workflow fast and resolve setup blockers", "快速学会工作流，并解决配置与使用问题")}
          </h1>
          <p>
            {text(
              lang,
              "This page centralizes the quick-start path, updated API setup tutorials, membership control methods, testing plans, and direct support channels.",
              "这里集中提供上手路径、更新后的 API 配置教程、会员控制方法、测试方案，以及直接支持入口。",
            )}
          </p>
        </div>

        <div className="support-grid">
          <article className="card panel" id="manual">
            <p className="card-kicker">{text(lang, "User Manual", "用户手册")}</p>
            <h3>{text(lang, "Start in three steps", "三步开始使用")}</h3>
            <ul className="list">
              {manualItems.map((item, index) => (
                <li key={`manual-${index}`}>{item}</li>
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
              <p className="card-kicker">{text(lang, "Setup & Operations", "配置与运维")}</p>
              <h2 style={{ margin: "6px 0 0" }}>
                {text(lang, "Which key to get, which page to configure, and how to test it", "每类 Key 去哪里申请、在哪一页配置、以及如何测试")}
              </h2>
            </div>
            <div className="support-quick-actions">
              <Link href="/dashboard" className="btn btn-primary">
                {text(lang, "Open Link Analysis", "打开链接分析")}
              </Link>
              <Link href="/dashboard/collector" className="btn btn-ghost">
                {text(lang, "Open Viral Collector", "打开爆款作品采集")}
              </Link>
              <Link href="/membership" className="btn btn-ghost">
                {text(lang, "Open Membership", "打开会员页")}
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
                  <strong>{text(lang, "How to get it", "如何准备")}</strong>
                  <ul className="list">
                    {card.getSteps.map((step, index) => (
                      <li key={`${card.key}-get-${index}`}>{step}</li>
                    ))}
                  </ul>
                </div>

                <div className="support-step-block">
                  <strong>{text(lang, "How to configure or verify it in ViralBrain.ai", "在 ViralBrain.ai 里怎么配置或验证")}</strong>
                  <ul className="list">
                    {card.fillSteps.map((step, index) => (
                      <li key={`${card.key}-fill-${index}`}>{step}</li>
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
            <h3>{text(lang, "Need help with plan, auth, provider config, or testing blockers?", "如果套餐、登录、供应商配置或测试卡住，直接联系支持。")}</h3>
            <p>
              {text(
                lang,
                "Send context, screenshots, and the exact page where you are blocked. We can usually tell quickly whether the issue is auth, quota, webhook, provider configuration, or outbound network access.",
                "把上下文、截图以及卡住的具体页面一起发过来，我们通常能很快判断是登录、额度、webhook、供应商配置，还是出网访问问题。",
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
