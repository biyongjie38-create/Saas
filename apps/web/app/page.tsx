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
      title: text(lang, "Hot Video Discovery", "热门视频发现"),
      desc: text(
        lang,
        "Track breakout YouTube videos before they become obvious, then route the best ones into your report workflow.",
        "在爆款完全扩散之前追踪起量视频，再把高价值样本送进报告工作流。"
      )
    },
    {
      title: text(lang, "Hot Channel Analysis", "热门频道分析"),
      desc: text(
        lang,
        "Spot channels that are accelerating fast and understand which content systems they are repeating.",
        "找到增长加速更快的频道，并看清它们在重复什么内容系统。"
      )
    },
    {
      title: text(lang, "Hot Topic Tracking", "热门主题追踪"),
      desc: text(
        lang,
        "Build a topic pipeline from recurring themes instead of chasing random inspiration.",
        "从持续重复出现的话题中建立选题池，而不是随机找灵感。"
      )
    }
  ];

  const consoleCards = [
    {
      title: text(lang, "YouTube Link Analysis", "YouTube 链接分析"),
      desc: text(
        lang,
        "Drop one URL and get structure, thumbnail, audience, benchmark, and action output in one place.",
        "输入一个链接，即可在一个界面里拿到结构、封面、受众、对标和行动建议。"
      )
    },
    {
      title: text(lang, "Workspace Setup Guidance", "按工作区整理的连接设置"),
      desc: text(
        lang,
        "Each workspace keeps its own required setup nearby, so users can complete analysis or collection without jumping across pages.",
        "每个工作区都会把需要的连接放在附近，让用户不用来回跳页面，也能完成分析或采集。"
      )
    },
    {
      title: text(lang, "Report Review & Export", "报告查看与导出"),
      desc: text(
        lang,
        "Preview recent reports, rerun with live data, share links, and export action-ready output.",
        "预览最近报告、用实时数据重跑、分享链接，并导出可执行结果。"
      )
    }
  ];

  const featureBlocks = [
    {
      kicker: text(lang, "Control Center", "控制台"),
      title: text(lang, "Operate everything from a single YouTube growth console.", "把所有动作都收进一个 YouTube 增长控制台。"),
      desc: text(
        lang,
        "Instead of scattering tools across multiple products, viralbrainxc.ai keeps trend discovery, analysis, report review, collection, and library management inside one workflow.",
        "不把能力拆散到多个产品里，viralbrainxc.ai 把趋势发现、分析、报告查看、采集和爆款库管理统一放在一个工作流里。"
      )
    },
    {
      kicker: text(lang, "Trend Radar", "趋势雷达"),
      title: text(lang, "Find what is heating up before you decide what to make next.", "在决定下一条内容之前，先判断什么正在起量。"),
      desc: text(
        lang,
        "Hot trends helps you watch videos, channels, and topics, then pull the strongest candidates back into analysis and benchmarking.",
        "热门趋势会帮你监控视频、频道和主题，再把最强样本拉回分析和对标流程。"
      )
    }
  ];

  const pricingHighlights = [
    {
      name: membershipCopy.freeName,
      desc: membershipCopy.freeDesc,
      price: "CNY 0",
      cycle: text(lang, "/ month", "/ 月"),
      features: membershipCopy.freeFeatures,
      cta: text(lang, "Start Free", "免费开始"),
      href: "/dashboard",
      secondary: text(lang, "No payment setup required", "无需先接支付"),
      tone: "free" as const,
    },
    {
      name: membershipCopy.proName,
      desc: membershipCopy.proDesc,
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
        <span className="badge landing-kicker">{text(lang, "Trend discovery + AI growth console", "趋势发现 + AI 增长控制台")}</span>
        <h1>{text(lang, "Find breakout ideas, dissect winners, and turn them into your next YouTube playbook.", "找爆款、拆逻辑、做增长，把热门内容变成你的下一套 YouTube 方案。")}</h1>
        <p>
          {text(
            lang,
            "viralbrainxc.ai is built for operators who need one place to track hot trends, run deep video teardowns, manage a viral library, and keep research workflows moving fast.",
            "viralbrainxc.ai 面向内容操盘手，把热门趋势、视频深度拆解、爆款库管理和研究工作流统一到一个界面中。"
          )}
        </p>
        <div className="qa-banner landing-demo-banner">
          <strong>{strictMode ? text(lang, "Live service mode", "实时服务模式") : text(lang, "Experience mode", "体验模式")}</strong>
          <p>
            {strictMode
              ? text(
                  lang,
                  "Analysis, trend discovery, collection, and report generation are using live service paths in this deployment.",
                  "当前部署中的分析、趋势、采集和报告生成会优先走实时服务链路。"
                )
              : text(
                  lang,
                  "You can preview the full workflow first. Some pages may use sample content to keep the experience stable before live services are connected.",
                  "你可以先体验完整工作流。在实时服务尚未接通前，部分页面会使用示例内容保持体验稳定。"
                )}
          </p>
        </div>
        <div className="hero-actions">
          <Link href="/dashboard/trends" className="btn btn-primary">
            {text(lang, "Discover Hot Trends", "发现热门趋势")}
          </Link>
          <Link href="/dashboard" className="btn btn-ghost">
            {text(lang, "Open Console", "进入控制台")}
          </Link>
          <Link href="/support#manual" className="btn btn-ghost">
            {text(lang, "See User Guide", "查看用户手册")}
          </Link>
        </div>
      </section>

      <section className="shell section landing-feature-grid">
        {workflowCards.map((item) => (
          <article className="card panel landing-mini-card" key={item.title}>
            <p className="card-kicker">{text(lang, "Trend Layer", "趋势层")}</p>
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
          <span className="badge">{text(lang, "Capabilities", "功能矩阵")}</span>
          <h2>{text(lang, "Everything you need to go from trend to action", "从趋势到执行，所需能力都在这里")}</h2>
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
          <span className="badge">{text(lang, "Pricing", "定价方案")}</span>
          <h2>{text(lang, "Start free, then upgrade when you need deeper research ops", "先免费验证，再在需要更深研究工作流时升级")}</h2>
          <p>{membershipCopy.billingHint}</p>
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
