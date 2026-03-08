import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getServerLang, text } from "@/lib/i18n";

export default async function HomePage() {
  const lang = await getServerLang();

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
      title: text(lang, "Context-Aware API Setup", "按工作流分布的 API 配置"),
      desc: text(
        lang,
        "Configure model providers below link analysis, and configure YouTube below viral collection, so each workflow makes its required APIs obvious.",
        "把模型供应商配置放在链接分析下面，把 YouTube 配置放在爆款采集下面，让用户一眼就知道每个工作流分别需要哪些 API。"
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
        "Instead of scattering tools across multiple products, ViralBrain.ai keeps trend discovery, page-specific API setup, analysis, report review, and library management inside one workflow.",
        "不把能力拆散到多个产品里，ViralBrain.ai 把趋势发现、按页面归位的 API 配置、分析、报告查看和爆款库管理统一放在一个工作流里。"
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

  return (
    <main>
      <SiteNav />

      <section className="shell hero hero-landing">
        <span className="badge landing-kicker">{text(lang, "Trend discovery + AI growth console", "趋势发现 + AI 增长控制台")}</span>
        <h1>{text(lang, "Find breakout ideas, dissect winners, and turn them into your next YouTube playbook.", "找爆款、拆逻辑、做增长，把热门内容变成你的下一套 YouTube 方案。")}</h1>
        <p>
          {text(
            lang,
            "ViralBrain.ai is built for operators who need one place to track hot trends, run deep video teardowns, manage a viral library, and work with their own APIs.",
            "ViralBrain.ai 面向内容操盘手，把热门趋势、视频深度拆解、爆款库管理和自带 API 工作流统一到一个界面中。"
          )}
        </p>
        <div className="qa-banner landing-demo-banner">
          <strong>{text(lang, "Product preview mode", "产品预览模式")}</strong>
          <p>
            {text(
              lang,
              "The homepage is intentionally a marketing overview. It does not bind to live provider data. Real data paths now exist in single-video analysis, Hot Trends, viral collection, and BYOK connection tests.",
              "首页本身是产品能力展示页，并不直接绑定实时数据源。当前真实接入已经覆盖单视频分析、热门趋势、爆款采集，以及用户自带 Key 的连接测试。"
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
          <Link href="/support#api-guide" className="btn btn-ghost">
            {text(lang, "See API Setup Guide", "查看 API 配置教程")}
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

      <SiteFooter lang={lang} />
    </main>
  );
}
