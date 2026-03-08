"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n-shared";
import { text } from "@/lib/i18n-shared";
import { SUPPORT_EMAIL, buildSupportMailto } from "@/lib/support-contact";

type Props = {
  lang: Lang;
  label: string;
};

export function SupportEmailTrigger({ lang, label }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function onCopyEmail() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button type="button" className="footer-link-button" onClick={() => setOpen(true)}>
        {label}
      </button>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="modal-shell support-email-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-email-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="card-kicker">{text(lang, "Contact Support", "联系支持")}</p>
                <h3 id="support-email-title" style={{ margin: 0 }}>
                  {text(lang, "Send us an email", "给我们发邮件")}
                </h3>
              </div>
              <button type="button" className="btn btn-ghost compact-button" onClick={() => setOpen(false)}>
                {text(lang, "Close", "关闭")}
              </button>
            </div>

            <div className="support-email-modal-body">
              <p>
                {text(
                  lang,
                  "If you hit any issue with login, plans, APIs, payment, or testing, send the details to this email and include screenshots if possible.",
                  "如果你在登录、会员、API、支付或测试时遇到任何问题，直接把详情发到这个邮箱，最好附上截图。"
                )}
              </p>

              <div className="support-email-box">
                <strong>{SUPPORT_EMAIL}</strong>
                <span className="small">
                  {text(
                    lang,
                    "Click Send Email to open your mail app, or copy the address manually.",
                    "点击“发送邮件”可直接打开你的邮箱客户端，也可以先复制邮箱地址。"
                  )}
                </span>
              </div>

              <div className="support-email-actions">
                <a className="btn btn-primary" href={buildSupportMailto("ViralBrain.ai Support")}>
                  {text(lang, "Send Email", "发送邮件")}
                </a>
                <button type="button" className="btn btn-ghost" onClick={onCopyEmail}>
                  {copied ? text(lang, "Copied", "已复制") : text(lang, "Copy Email", "复制邮箱")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
