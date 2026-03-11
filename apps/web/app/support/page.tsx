import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SupportContactForm } from "@/components/support-contact-form";
import { SupportEmailLink } from "@/components/support-email-link";
import { SiteNav } from "@/components/site-nav";
import { getServerLang, text } from "@/lib/i18n";
import { getPublicSupportEmail } from "@/lib/support-contact-server";

type WorkflowCard = {
  key: string;
  kicker: string;
  title: string;
  intro: string;
  steps: ReactNode[];
  note: string;
  actionHref: string;
  actionLabel: string;
};

export default async function SupportPage({
  searchParams
}: {
  searchParams?: Promise<{ email?: string }>;
}) {
  const lang = await getServerLang();
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialEmail = typeof resolvedSearchParams.email === "string" ? resolvedSearchParams.email : "";
  const supportEmail = getPublicSupportEmail();

  const manualItems: ReactNode[] = [
    text(
      lang,
      "Start from Hot Trends when you want new ideas, or start from Link Analysis when you already have a video to dissect.",
      "如果你想找新灵感，就先看“热门趋势”；如果你已经有目标视频，就直接从“链接分析”开始。"
    ),
    text(
      lang,
      "Use Viral Collector to batch-pull promising samples into your library by time window, views, duration, or keyword.",
      "使用“爆款作品采集”按时间、播放量、时长或关键词批量拉取值得研究的样本，并导入爆款库。"
    ),
    text(
      lang,
      "Use Viral Library to search, classify, restore, and export the materials you want to keep.",
      "使用“爆款库”搜索、分类、恢复和导出你真正想留住的素材。"
    ),
    text(
      lang,
      "Open Report History any time to revisit previous analyses and continue refining your decisions.",
      "你可以随时打开“历史报告”回看旧分析，并继续完善判断。"
    )
  ];

  const faqItems = [
    {
      q: text(lang, "What is the fastest way to get started?", "最快的上手方式是什么？"),
      a: text(
        lang,
        "Analyze one YouTube video first, then use Hot Trends and Viral Collector to expand your sample pool, and finally save the best references into Viral Library.",
        "先分析一条 YouTube 视频，再用“热门趋势”和“爆款作品采集”扩充样本池，最后把最有价值的案例保存到“爆款库”。"
      )
    },
    {
      q: text(lang, "Where can I find my previous reports?", "之前生成的报告在哪里看？"),
      a: text(
        lang,
        "Open Report History from the console, or enter the Reports workspace directly. Your latest reports stay there for review, rerun, and export.",
        "可以从控制台里的“历史报告”进入，或直接打开报告页面。最新报告会保留在里面，方便你继续查看、重跑和导出。"
      )
    },
    {
      q: text(lang, "How do I keep and organize useful examples?", "怎样保存并整理有价值的案例？"),
      a: text(
        lang,
        "Move strong items into Viral Library, give them folders, and use search plus category filters to keep your reference set tidy and reusable.",
        "把高价值样本放进“爆款库”，再配合分类夹、搜索和分类筛选，把素材库整理成可复用的参考集合。"
      )
    },
    {
      q: text(lang, "What should I do if a page or action feels blocked?", "如果某个页面或操作卡住了怎么办？"),
      a: text(
        lang,
        "Go to the support section on this page and send us the page name, what you clicked, and a screenshot. That is usually enough for us to help you quickly.",
        "直接到本页底部的支持区，把页面名称、你的操作和截图一起发给我们，通常就足够快速定位问题。"
      )
    }
  ];

  const workflowCards: WorkflowCard[] = [
    {
      key: "trends",
      kicker: text(lang, "Hot Trends", "热门趋势"),
      title: text(lang, "Use trend pages to discover what is already heating up", "先用趋势页判断什么内容已经在起量"),
      intro: text(
        lang,
        "Hot Trends helps you scan breakout videos, fast-growing channels, and recurring topics before deciding what to analyze or produce next.",
        "热门趋势会帮你先扫一遍正在起量的视频、增长更快的频道和反复出现的话题，再决定下一步分析什么、做什么。"
      ),
      steps: [
        text(lang, "Switch between videos, channels, and topics to compare where attention is moving.", "在视频、频道和主题之间切换，先判断注意力正往哪里移动。"),
        text(lang, "Use the built-in filters to narrow your view to the kind of signal you want to track.", "用页面内的筛选条件，把视野收窄到你真正想追踪的信号。"),
        text(lang, "Open promising entries in a new tab or bring them back into your analysis workflow.", "遇到值得研究的对象，就打开详情，或直接把它带回后续分析流程。")
      ],
      note: text(
        lang,
        "A good habit is to start here when you need fresh inspiration, then go deeper with analysis or collection.",
        "如果你需要新的内容方向，最好先从这里开始，再进入分析或采集。"
      ),
      actionHref: "/dashboard/trends",
      actionLabel: text(lang, "Open Hot Trends", "打开热门趋势")
    },
    {
      key: "analysis",
      kicker: text(lang, "Link Analysis", "链接分析"),
      title: text(lang, "Turn one YouTube URL into a structured report", "把一个 YouTube 链接拆成结构化分析报告"),
      intro: text(
        lang,
        "When you already know which video you want to study, Link Analysis is the fastest way to understand structure, audience angle, and next actions.",
        "如果你已经知道要研究哪条视频，“链接分析”就是最快的拆解入口，可以直接看清结构、受众角度和后续行动。"
      ),
      steps: [
        text(lang, "Paste a YouTube URL and start analysis.", "粘贴一个 YouTube 链接并开始分析。"),
        text(lang, "Watch the live progress list to see each stage moving forward.", "通过实时进度列表确认每一步都在推进。"),
        text(lang, "Open the finished report and review structure, audience, comparison, and action output in one place.", "分析完成后打开报告，在一个页面里查看结构、受众、对比和行动建议。")
      ],
      note: text(
        lang,
        "This is the best starting point when you want to learn from one specific winner instead of scanning broadly.",
        "当你想深拆一条确定的赢家样本，而不是大范围扫趋势时，这里最适合开始。"
      ),
      actionHref: "/dashboard",
      actionLabel: text(lang, "Open Link Analysis", "打开链接分析")
    },
    {
      key: "collector",
      kicker: text(lang, "Viral Collector", "爆款作品采集"),
      title: text(lang, "Batch-collect samples by time, views, duration, and keyword", "按时间、播放量、时长和关键词批量采集样本"),
      intro: text(
        lang,
        "Viral Collector is designed for widening your sample pool fast, especially when you already know the direction, duration, or keyword you care about.",
        "“爆款作品采集”适合快速扩充样本池，尤其是在你已经知道方向、时长段或关键词的时候。"
      ),
      steps: [
        text(lang, "Set your time window, minimum views, and maximum result count.", "先设定采集时间窗口、最低播放量和最多采集条数。"),
        text(lang, "Use duration range and keyword input to narrow the candidates to the kind of videos you truly want.", "再用时长范围和关键词把候选缩小到你真正想研究的视频类型。"),
        text(lang, "Run collection and import the promising results into your library in one step.", "执行采集后，可以一步把优质候选导入爆款库。")
      ],
      note: text(
        lang,
        "Use this page when you want to build a reference set around a topic, style, or content window instead of studying videos one by one.",
        "如果你要围绕某个主题、风格或内容窗口建立样本集，而不是一条条看，这个页面会更高效。"
      ),
      actionHref: "/dashboard/collector",
      actionLabel: text(lang, "Open Viral Collector", "打开爆款作品采集")
    },
    {
      key: "library",
      kicker: text(lang, "Viral Library", "爆款库"),
      title: text(lang, "Keep the best materials organized and reusable", "把最有价值的素材整理成可复用资料库"),
      intro: text(
        lang,
        "Viral Library is where strong references stop being scattered links and become a reusable research asset for your team.",
        "“爆款库”会把零散链接变成可以复用的研究资产，让团队反复调用同一批优质样本。"
      ),
      steps: [
        text(lang, "Search by title, channel, category, topic, or hook type to find the reference you need quickly.", "你可以按标题、频道、分类、主题或钩子类型快速找到所需案例。"),
        text(lang, "Create your own folders so different directions stay separated and easy to revisit.", "通过自定义分类夹，把不同方向的案例分开管理，方便以后回看。"),
        text(lang, "Export single items when you want to carry one reference into external review or sharing workflows.", "当你需要把某一条案例带到外部复盘或分享流程时，可以单条导出。")
      ],
      note: text(
        lang,
        "The best time to organize is right after collection or analysis, before useful examples get buried again.",
        "最适合整理素材的时机，就是刚采集或刚分析完的时候，避免好样本再次淹没。"
      ),
      actionHref: "/library",
      actionLabel: text(lang, "Open Viral Library", "打开爆款库")
    }
  ];

  return (
    <main>
      <SiteNav />
      <section className="shell section support-shell">
        <div className="section-intro">
          <span className="badge">{text(lang, "Help & Support", "帮助与支持")}</span>
          <h1 style={{ marginTop: 18 }}>
            {text(lang, "Learn the workflow quickly and keep your work moving", "快速学会核心工作流，让你的研究和创作持续推进")}
          </h1>
          <p>
            {text(
              lang,
              "This page is the user manual for daily use. It focuses on how to discover ideas, analyze videos, collect samples, manage your library, and get support when needed.",
              "这页就是日常使用的用户手册，重点只讲如何发现趋势、分析视频、采集样本、管理爆款库，以及在需要时获得支持。"
            )}
          </p>
        </div>

        <div className="support-grid">
          <article className="card panel" id="manual">
            <p className="card-kicker">{text(lang, "User Manual", "用户手册")}</p>
            <h3>{text(lang, "Start in four habits", "先记住这四个使用习惯")}</h3>
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

        <section className="card panel support-guide-shell">
          <div className="library-card-head support-guide-head">
            <div>
              <p className="card-kicker">{text(lang, "Workflow Guide", "工作流指南")}</p>
              <h2 style={{ margin: "6px 0 0" }}>
                {text(lang, "Know which page to open, what to do there, and how to keep moving", "知道先去哪一页、在里面做什么，以及如何顺着流程往下走")}
              </h2>
            </div>
            <div className="support-quick-actions">
              <Link href="/dashboard/trends" className="btn btn-primary">
                {text(lang, "Open Hot Trends", "打开热门趋势")}
              </Link>
              <Link href="/dashboard" className="btn btn-ghost">
                {text(lang, "Open Link Analysis", "打开链接分析")}
              </Link>
              <Link href="/dashboard/collector" className="btn btn-ghost">
                {text(lang, "Open Viral Collector", "打开爆款作品采集")}
              </Link>
              <Link href="/library" className="btn btn-ghost">
                {text(lang, "Open Viral Library", "打开爆款库")}
              </Link>
            </div>
          </div>

          <div className="support-guide-grid">
            {workflowCards.map((card) => (
              <article key={card.key} className="card panel support-guide-card">
                <p className="card-kicker">{card.kicker}</p>
                <h3>{card.title}</h3>
                <p>{card.intro}</p>

                <div className="support-step-block">
                  <strong>{text(lang, "How to use it well", "怎么用更顺手")}</strong>
                  <ul className="list">
                    {card.steps.map((step, index) => (
                      <li key={`${card.key}-step-${index}`}>{step}</li>
                    ))}
                  </ul>
                </div>

                <p className="small">{card.note}</p>
                <Link href={card.actionHref} className="btn btn-ghost compact-button">
                  {card.actionLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <article className="card panel support-contact-card" id="contact">
          <div>
            <p className="card-kicker">{text(lang, "Contact Support", "联系支持")}</p>
            <h3>{text(lang, "Need help with account, billing, analysis, collection, or library workflows?", "如果账号、会员、分析、采集或爆款库流程卡住，直接联系支持。")}</h3>
            <p>
              {text(
                lang,
                "Send the page name, what you clicked, and a screenshot. That usually gives us enough context to help you quickly.",
                "把页面名称、你的操作和截图一起发给我们，通常就足够让我们快速帮你判断问题。"
              )}
            </p>
          </div>
          <div className="support-contact-actions">
            <SupportEmailLink className="btn btn-primary" subject="viralbrainxc.ai Support" initialEmail={supportEmail} />
            <Link className="btn btn-ghost" href="/support#manual">
              {text(lang, "Open User Manual", "查看用户手册")}
            </Link>
          </div>
        </article>

        <SupportContactForm lang={lang} initialEmail={initialEmail} />
      </section>
      <SiteFooter lang={lang} />
    </main>
  );
}
