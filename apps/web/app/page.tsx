import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getServerLang, text } from "@/lib/i18n";
import {
  getMembershipMarketingCopy,
  PRO_MONTHLY_PRICE_CNY,
  PRO_YEARLY_PRICE_CNY,
  PRO_YEARLY_SAVINGS_PERCENT,
} from "@/lib/membership-pricing";
import { isProductionRuntimeMode } from "@/lib/runtime-mode";

export default async function HomePage() {
  const lang = await getServerLang();
  const strictMode = isProductionRuntimeMode();
  const membershipCopy = getMembershipMarketingCopy(lang);

  const workflowCards = [
    {
      kicker: text(lang, "Step 1", "步骤 1"),
      title: text(lang, "See which videos, channels, and topics are starting to move.", "先判断哪些视频、频道和主题正在起量。"),
      desc: text(
        lang,
        "Use Hot Trends to spot movement early, then decide what deserves a deeper teardown instead of following random inspiration.",
        "先用热门趋势看清哪些内容开始起量，再决定什么值得深拆，而不是靠随机灵感做判断。"
      )
    },
    {
      kicker: text(lang, "Step 2", "步骤 2"),
      title: text(lang, "Turn one YouTube URL into a reusable teardown.", "把一个 YouTube 链接拆成可复用的分析。"),
      desc: text(
        lang,
        "Go from title, thumbnail, comments, and structure to a report you can actually reuse in planning and review.",
        "把标题、封面、评论和结构转成真正可用于策划和复盘的报告，而不只是看一遍就忘。"
      )
    },
    {
      kicker: text(lang, "Step 3", "步骤 3"),
      title: text(lang, "Keep the strongest references in a library you can reuse.", "把最有价值的参考样本沉淀成可复用资料库。"),
      desc: text(
        lang,
        "Save examples, organize them by topic, and bring them back into future research instead of losing them in bookmarks.",
        "把高价值案例保存下来、按主题整理，并在之后的研究里反复调用，而不是淹没在收藏夹里。"
      )
    }
  ];

  const consoleCards = [
    {
      title: text(lang, "YouTube Link Analysis", "YouTube 链接分析"),
      desc: text(
        lang,
        "Drop one URL and get structure, thumbnail, audience, and next-step output in one place.",
        "输入一个链接，就能在一个界面里拿到结构、封面、受众和下一步建议。"
      )
    },
    {
      title: text(lang, "Benchmark Retrieval", "爆款对标检索"),
      desc: text(
        lang,
        "Compare a video against saved references so you can see what is shared, what is different, and what is worth borrowing.",
        "把当前视频和你保存的参考样本做对比，看清共同点、差异点，以及真正值得借鉴的部分。"
      )
    },
    {
      title: text(lang, "Report Review & Export", "报告查看与导出"),
      desc: text(
        lang,
        "Reopen reports, rerun with live data, share links, and export work that is ready for review.",
        "重新打开报告、用实时数据重跑、分享链接，并导出可以直接进入复盘或评审的结果。"
      )
    }
  ];

  const featureBlocks = [
    {
      kicker: text(lang, "Control Center", "控制台"),
      title: text(lang, "Run trend discovery, teardown, benchmarking, and library work from one console.", "把趋势发现、深拆、对标和资料沉淀放进同一个控制台。"),
      desc: text(
        lang,
        "Instead of jumping between trend pages, notes, spreadsheets, and separate summary tools, viralbrainxc.ai keeps research, teardown, comparison, and library management in one workflow.",
        "你不需要在趋势页、笔记、表格和零散总结工具之间来回切换，viralbrainxc.ai 把研究、拆解、对比和资料管理放进同一条工作流里。"
      )
    },
    {
      kicker: text(lang, "Trend To Action", "从趋势到行动"),
      title: text(lang, "Start with what is moving, then decide what deserves deeper analysis.", "先看什么在起量，再决定什么值得深度分析。"),
      desc: text(
        lang,
        "Use the trend radar to see what is heating up, move into link analysis when something is worth studying, and keep the strongest references in your library for the next round.",
        "先用趋势雷达判断什么正在升温，再把值得研究的样本拉进链接分析，最后把最强参考案例沉淀进爆款库。"
      )
    }
  ];

  const differenceCards = [
    {
      title: text(lang, "Not just one-video summaries", "不只是单条视频总结"),
      desc: text(
        lang,
        "You do not stop at a single teardown. The workflow continues into comparison, report review, and reusable references.",
        "它不是看完一条视频就结束，而是把拆解继续推进到对标、报告复盘和资料沉淀。"
      )
    },
    {
      title: text(lang, "Not just a trend list", "不只是趋势榜单"),
      desc: text(
        lang,
        "Trend discovery is only the starting signal. The product is built to help you explain why something is working and what to do next.",
        "趋势发现只是起点，这个产品真正想帮你解决的是：为什么它有效，以及接下来该做什么。"
      )
    },
    {
      title: text(lang, "One workflow instead of scattered tools", "不是零散工具，而是一条完整工作流"),
      desc: text(
        lang,
        "Instead of splitting research across tabs, docs, and bookmarks, you can move from signal to teardown to reusable library inside one product.",
        "你不用再把研究拆散到网页、文档和收藏夹里，而是可以在一个产品里完成从信号判断到深拆再到资料库沉淀。"
      )
    }
  ];

  const pricingHighlights = [
    {
      name: membershipCopy.freeName,
      desc: text(
        lang,
        "Built for first-time validation. Bring your own keys, run a few analyses, and confirm whether this workflow fits how you research content.",
        "适合第一次验证工作流。自带密钥、跑几次分析，先确认这套研究流程是不是适合你的内容方式。"
      ),
      price: "CNY 0",
      cycle: text(lang, "/ month", "/ 月"),
      features: membershipCopy.freeFeatures,
      cta: text(lang, "Start Free", "免费开始"),
      href: "/dashboard",
      secondary: text(lang, "Bring your own YouTube and LLM keys to test the full workflow", "自带 YouTube 和 LLM 密钥即可体验完整工作流"),
      tone: "free" as const,
    },
    {
      name: membershipCopy.proName,
      desc: text(
        lang,
        "Built for creators and small teams that need repeatable research, benchmark retrieval, exports, and larger collection batches.",
        "适合需要可重复研究、爆款对标、导出能力和更大采集批量的创作者与小团队。"
      ),
      price: `CNY ${PRO_MONTHLY_PRICE_CNY}`,
      cycle: text(lang, "/ month", "/ 月"),
      features: membershipCopy.proFeatures,
      cta: text(lang, "See Pro Plan", "查看专业版"),
      href: "/membership",
      secondary: text(
        lang,
        `Or CNY ${PRO_YEARLY_PRICE_CNY} / year, save ${PRO_YEARLY_SAVINGS_PERCENT}%`,
        `或 CNY ${PRO_YEARLY_PRICE_CNY} / 年，立省 ${PRO_YEARLY_SAVINGS_PERCENT}%`
      ),
      tone: "pro" as const,
    }
  ];

  return (
    <main>
      <SiteNav />

      <section className="shell hero hero-landing">
        <span className="badge landing-kicker">{text(lang, "For YouTube creators and content operators", "面向 YouTube 创作者与内容操盘手")}</span>
        <h1>{text(lang, "Turn YouTube videos into clear content decisions your team can reuse.", "把 YouTube 视频变成团队可以反复复用的内容判断。")}</h1>
        <p>
          {text(
            lang,
            "viralbrainxc.ai helps YouTube creators, operators, and small content teams spot rising signals, break down why one video works, compare it against strong references, and save the best examples in one workflow.",
            "viralbrainxc.ai 帮助 YouTube 创作者、内容操盘手和小团队先看信号、再拆逻辑、再做对标、再沉淀资料，把研究工作流收进一个界面里。"
          )}
        </p>
        <div className="qa-banner landing-demo-banner">
          <strong>
            {strictMode
              ? text(lang, "Real workflow, live service paths", "真实工作流，实时服务链路")
              : text(lang, "Full workflow preview", "完整工作流预览")}
          </strong>
          <p>
            {strictMode
              ? text(
                  lang,
                  "This deployment runs analysis, trend discovery, collection, and report generation through live service paths. It is built for real analysis workflows and has already been used for paid validation.",
                  "当前部署中的分析、趋势、采集和报告生成都走实时服务链路。这个产品面向真实研究工作流设计，并且已经被用于真实分析和付费验证。"
                )
              : text(
                  lang,
                  "You can preview the full workflow here first. Some pages may still use sample content before live services are connected, but the product itself is designed around real analysis workflows.",
                  "你可以先在这里体验完整工作流。在部分实时服务尚未接通前，某些页面可能会使用示例内容，但产品本身仍然按真实分析工作流来设计。"
                )}
          </p>
        </div>
        <div className="hero-actions">
          <Link href="/dashboard" className="btn btn-primary">
            {text(lang, "Open Console", "进入控制台")}
          </Link>
          <Link href="/dashboard/trends" className="btn btn-ghost">
            {text(lang, "Discover Hot Trends", "发现热门趋势")}
          </Link>
          <Link href="/support#manual" className="btn btn-ghost">
            {text(lang, "See User Guide", "查看用户手册")}
          </Link>
        </div>
      </section>

      <section className="shell section landing-feature-grid">
        {workflowCards.map((item) => (
          <article className="card panel landing-mini-card" key={item.title}>
            <p className="card-kicker">{item.kicker}</p>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
          </article>
        ))}
      </section>

      <section className="shell section landing-showcase">
        <div className="landing-showcase-copy">
          <span className="badge">{featureBlocks[0].kicker}</span>
          <h2>{featureBlocks[0].title}</h2>
          <p>{featureBlocks[0].desc}</p>
        </div>
        <div className="landing-showcase-visual card panel">
          <div className="landing-console-window">
            {consoleCards.map((item, index) => (
              <div className="landing-console-row" key={item.title}>
                <span className="landing-console-index">0{index + 1}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell section landing-showcase landing-showcase-reverse">
        <div className="landing-showcase-visual card panel landing-stacked-cards">
          <div className="landing-floating-card">
            <span className="badge">{text(lang, "Videos", "视频")}</span>
            <strong>{text(lang, "Breakout this week", "本周起量")}</strong>
            <p>{text(lang, "Views, pace, title angle, and reusable hook patterns.", "播放、节奏、标题角度和可复用钩子模式。")}</p>
          </div>
          <div className="landing-floating-card landing-floating-card-alt">
            <span className="badge">{text(lang, "Channels", "频道")}</span>
            <strong>{text(lang, "Fastest-growing operators", "增长更快的操盘手")}</strong>
            <p>{text(lang, "Who is compounding attention, and what cadence are they using?", "谁在持续放大注意力，他们在用什么更新节奏？")}</p>
          </div>
        </div>
        <div className="landing-showcase-copy">
          <span className="badge">{featureBlocks[1].kicker}</span>
          <h2>{featureBlocks[1].title}</h2>
          <p>{featureBlocks[1].desc}</p>
          <div className="hero-actions" style={{ marginTop: 20 }}>
            <Link href="/dashboard/trends?tab=videos" className="btn btn-primary">
              {text(lang, "Hot Videos", "热门视频")}
            </Link>
            <Link href="/dashboard/trends?tab=channels" className="btn btn-ghost">
              {text(lang, "Hot Channels", "热门频道")}
            </Link>
          </div>
        </div>
      </section>

      <section className="shell section">
        <div className="section-intro">
          <span className="badge">{text(lang, "Workflow", "工作流")}</span>
          <h2>{text(lang, "A workflow built for research, teardown, and reuse", "一条为研究、拆解和复用而设计的工作流")}</h2>
        </div>
        <div className="landing-capability-grid">
          {consoleCards.concat(workflowCards).map((item) => (
            <article className="card panel landing-capability-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="shell section">
        <div className="section-intro">
          <span className="badge">{text(lang, "Why It Differs", "为什么不一样")}</span>
          <h2>{text(lang, "Built for a full research workflow, not just one feature", "它服务的是完整研究流程，不只是某一个功能")}</h2>
        </div>
        <div className="landing-capability-grid">
          {differenceCards.map((item) => (
            <article className="card panel landing-capability-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="shell section">
        <div className="section-intro">
          <span className="badge">{text(lang, "Pricing", "定价方案")}</span>
          <h2>{text(lang, "Start free to validate the workflow, then upgrade for repeatable research", "先免费验证工作流，再在需要可重复研究时升级")}</h2>
          <p>
            {text(
              lang,
              "You bring your own YouTube, LLM, and optional Pinecone keys. The free plan is for first-time validation; Pro is for repeatable research, benchmark retrieval, exports, and larger collection runs.",
              "你自带 YouTube、LLM 和可选的 Pinecone 密钥。免费版适合先验证工作流，专业版适合做可重复的研究、对标检索、导出和更大批量的采集。"
            )}
          </p>
        </div>
        <div className="plan-grid landing-pricing-grid">
          {pricingHighlights.map((plan) => (
            <article
              key={plan.name}
              className={`card panel plan-card landing-plan-card ${
                plan.tone === "pro" ? "plan-card-pro" : "plan-card-free"
              }`}
            >
              <div className="plan-card-head">
                <div>
                  <p className="card-kicker">{plan.name}</p>
                  <h3>{plan.name}</h3>
                </div>
                {plan.tone === "pro" ? <span className="badge">{membershipCopy.yearlyBadge}</span> : null}
              </div>
              <p className="plan-desc">{plan.desc}</p>
              <div className="plan-price-row">
                <span className="price price-large">{plan.price}</span>
                <span className="price-cycle">{plan.cycle}</span>
              </div>
              <p className="small landing-plan-note">{plan.secondary}</p>
              <ul className="plan-feature-list">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="plan-actions">
                <Link href={plan.href} className={`btn ${plan.tone === "pro" ? "btn-primary" : "btn-ghost"}`}>
                  {plan.cta}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter lang={lang} />
    </main>
  );
}
