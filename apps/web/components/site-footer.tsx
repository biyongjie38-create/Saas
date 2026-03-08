import Link from "next/link";
import { SupportEmailTrigger } from "@/components/support-email-trigger";
import type { Lang } from "@/lib/i18n-shared";
import { text } from "@/lib/i18n-shared";

export function SiteFooter({ lang }: { lang: Lang }) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer-wrap">
      <div className="shell site-footer">
        <div className="site-footer-brand">
          <div className="brand" aria-hidden="true">
            <span className="brand-dot" />
            <span>ViralBrain.ai</span>
          </div>
          <p>
            {text(
              lang,
              "A focused YouTube growth console for trend discovery, report generation, BYOK integrations, and operator-ready workflows.",
              "一个聚焦 YouTube 增长的控制台，覆盖趋势发现、报告生成、自带 Key 接入和运营级工作流。"
            )}
          </p>
          <small>{text(lang, `Copyright ${year} ViralBrain.ai. All rights reserved.`, `版权所有 ${year} ViralBrain.ai。保留所有权利。`)}</small>

          <form className="site-footer-subscribe" action="/support" method="get">
            <label htmlFor="footer-email">{text(lang, "Subscribe for updates", "订阅我们的资讯")}</label>
            <div className="site-footer-input-row">
              <input
                id="footer-email"
                type="email"
                name="email"
                className="site-footer-input"
                placeholder={text(lang, "Enter your email", "输入您的邮箱")}
              />
              <button type="submit" className="site-footer-arrow" aria-label={text(lang, "Open support", "打开支持页面")}>
                -&gt;
              </button>
            </div>
          </form>
        </div>

        <div className="site-footer-columns">
          <div>
            <h4>{text(lang, "Product", "产品")}</h4>
            <Link href="/dashboard">{text(lang, "Console", "控制台")}</Link>
            <Link href="/dashboard/trends">{text(lang, "Hot Trends", "热门趋势")}</Link>
            <Link href="/library">{text(lang, "Viral Library", "爆款库")}</Link>
          </div>
          <div>
            <h4>{text(lang, "Support", "支持")}</h4>
            <Link href="/support#manual">{text(lang, "User Manual", "用户手册")}</Link>
            <Link href="/support#faq">{text(lang, "FAQ", "常见问题")}</Link>
            <SupportEmailTrigger lang={lang} label={text(lang, "Contact Us", "联系我们")} />
          </div>
          <div>
            <h4>{text(lang, "Company", "公司")}</h4>
            <Link href="/settings">{text(lang, "Personal Center", "个人中心")}</Link>
            <SupportEmailTrigger lang={lang} label={text(lang, "Get in touch", "获取支持")} />
            <a href="https://github.com/biyongjie38-create/Saas" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
