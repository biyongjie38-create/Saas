import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { getServerLang, text } from "@/lib/i18n";

export default async function SupportPage() {
  const lang = await getServerLang();

  const manualItems = [
    text(lang, "Open the console and paste one YouTube URL.", "打开控制台并粘贴一个 YouTube 链接。"),
    text(lang, "Connect your own YouTube / model / vector keys when needed.", "按需接入你自己的 YouTube / 模型 / 向量 Key。"),
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
      a: text(lang, "Higher daily quota, hot trend details, share links, reruns, exports, and advanced provider routing.", "更高的每日额度、热门趋势详情、分享链接、重跑、导出，以及高级供应商路由。")
    },
    {
      q: text(lang, "Why am I seeing mock data?", "为什么我会看到 mock 数据？"),
      a: text(
        lang,
        "When the external provider or platform data is unavailable, the product falls back to stable mock/local data to keep the workflow available.",
        "当外部供应商或平台数据不可用时，系统会回退到稳定的 mock / 本地数据，以保证工作流可继续使用。"
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
              "This page centralizes the quick-start path, common billing and API answers, and direct support channels.",
              "这里集中提供上手路径、计费与 API 常见问题，以及直接支持入口。"
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

        <article className="card panel support-contact-card" id="contact">
          <div>
            <p className="card-kicker">{text(lang, "Contact Support", "联系支持")}</p>
            <h3>{text(lang, "Need help with plan, auth, or provider configuration?", "如果套餐、登录或供应商配置卡住，直接联系支持。")}</h3>
            <p>
              {text(
                lang,
                "Send context, screenshots, and the page you are blocked on. We can usually identify whether the issue is auth, quota, or provider configuration.",
                "把上下文、截图以及卡住的页面一起发过来，我们通常能快速判断是登录、额度，还是供应商配置问题。"
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
