"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n-shared";

type Props = {
  lang: Lang;
  initialEmail?: string;
};

type Copy = {
  title: string;
  subtitle: string;
  name: string;
  email: string;
  message: string;
  submit: string;
  submitting: string;
  success: string;
  failed: string;
  page: string;
};

const copyByLang: Record<Lang, Copy> = {
  en: {
    title: "Send a support request",
    subtitle: "This sends a branded support email and replies with a confirmation email to you.",
    name: "Name",
    email: "Email",
    message: "Message",
    submit: "Send request",
    submitting: "Sending...",
    success: "Support request sent. Check your inbox for confirmation.",
    failed: "Could not send support request.",
    page: "Current page"
  },
  zh: {
    title: "发送支持请求",
    subtitle: "这里会发送一封品牌化支持邮件，同时给你回一封确认邮件。",
    name: "姓名",
    email: "邮箱",
    message: "问题描述",
    submit: "发送请求",
    submitting: "发送中...",
    success: "支持请求已发送，请检查你的邮箱确认邮件。",
    failed: "支持请求发送失败。",
    page: "当前页面"
  }
};

type ContactResponse = {
  ok: boolean;
  data: {
    message: string;
  } | null;
  error?: {
    message?: string;
  } | null;
};

export function SupportContactForm({ lang, initialEmail = "" }: Props) {
  const copy = copyByLang[lang];
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");
    setError("");

    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          message,
          page: window.location.pathname
        })
      });
      const payload = (await response.json().catch(() => null)) as ContactResponse | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.error?.message ?? copy.failed);
        return;
      }

      setStatus(payload.data?.message ?? copy.success);
      setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.failed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card panel" onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <div>
        <p className="card-kicker">{copy.title}</p>
        <p className="small" style={{ margin: "6px 0 0" }}>
          {copy.subtitle}
        </p>
      </div>
      <label style={{ display: "grid", gap: 6 }}>
        <span className="small">{copy.name}</span>
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span className="small">{copy.email}</span>
        <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={160} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span className="small">{copy.message}</span>
        <textarea
          className="input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          minLength={10}
          maxLength={4000}
          rows={6}
        />
      </label>
      <p className="small" style={{ margin: 0 }}>
        {copy.page}: <span className="mono">/support</span>
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? copy.submitting : copy.submit}
        </button>
        {status ? <span className="small status-done">{status}</span> : null}
        {error ? <span className="small status-failed">{error}</span> : null}
      </div>
    </form>
  );
}
