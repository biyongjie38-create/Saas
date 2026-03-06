import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { getServerLang, text } from "@/lib/i18n";

export default async function HomePage() {
  const lang = await getServerLang();

  const highlights = [
    {
      title: text(lang, "Structure Breakdown", "结构拆解"),
      desc: text(
        lang,
        "Dissect hook, pacing, and CTA to explain why a video keeps attention.",
        "拆解开场钩子、节奏与 CTA，解释视频为何能持续吸引注意力。"
      )
    },
    {
      title: text(lang, "Benchmark Comparison", "对标比较"),
      desc: text(
        lang,
        "Retrieve Top3 similar hits from viral library and output copy/avoid actions.",
        "从爆款库检索 Top3 相似案例，并给出可复用/应避免动作。"
      )
    },
    {
      title: text(lang, "Viral Score", "爆款评分"),
      desc: text(
        lang,
        "Explainable 0-100 scoring with prioritized action list.",
        "可解释的 0-100 评分，并附优先级行动清单。"
      )
    }
  ];

  return (
    <main>
      <SiteNav />

      <section className="shell hero">
        <span className="badge">{text(lang, "YouTube Viral Intelligence SaaS", "YouTube 爆款智能 SaaS")}</span>
        <h1>{text(lang, "Drop one YouTube URL and get an action-ready viral playbook.", "输入一个 YouTube 链接，立即生成可执行的爆款方案。")}</h1>
        <p>
          {text(
            lang,
            "ViralBrain.ai focuses on YouTube depth. MVP includes stable mock-first delivery for structure analysis, thumbnail review, comment sentiment, benchmark comparison, and Viral Score.",
            "ViralBrain.ai 专注 YouTube 深度分析。MVP 已支持结构分析、封面评估、评论情绪、对标比较和爆款评分。"
          )}
        </p>
        <div className="hero-actions">
          <Link href="/dashboard" className="btn btn-primary">
            {text(lang, "Start Analysis", "开始分析")}
          </Link>
          <Link href="/library" className="btn btn-ghost">
            {text(lang, "Open Viral Library", "打开爆款库")}
          </Link>
        </div>

        <div className="grid-3">
          <div className="kpi card">
            <div className="label">{text(lang, "Experience", "体验")}</div>
            <div className="value">{text(lang, "Streaming", "流式反馈")}</div>
          </div>
          <div className="kpi card">
            <div className="label">{text(lang, "Model Routing", "模型路由")}</div>
            <div className="value">mini + gpt-4o</div>
          </div>
          <div className="kpi card">
            <div className="label">{text(lang, "Goal", "目标")}</div>
            <div className="value">{text(lang, "10-20s visible progress", "10-20 秒可见进度")}</div>
          </div>
        </div>
      </section>

      <section className="shell section">
        <h2>{text(lang, "MVP Core Modules", "MVP 核心模块")}</h2>
        <div className="grid-3">
          {highlights.map((item) => (
            <article className="card panel" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

