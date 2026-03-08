"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildApiIntegrationHeaders, readApiIntegrationConfigFromStorage } from "@/lib/api-integrations";
import { getPlanFeatures } from "@/lib/plan-features";
import type { Lang } from "@/lib/i18n-shared";
import type { UserPlan } from "@/lib/types";

type Props = {
  lang: Lang;
  plan: UserPlan;
  reportId: string;
  compact?: boolean;
  includePrint?: boolean;
  onRerunCreated?: (reportId: string) => void;
};

type ShareResponse = {
  ok: boolean;
  data: {
    share_url: string;
    share_token: string;
  } | null;
  error?: {
    message?: string;
  } | null;
};

type RerunResponse = {
  ok: boolean;
  data: {
    report_id: string;
  } | null;
  error?: {
    message?: string;
  } | null;
};

type Copy = {
  share: string;
  rerun: string;
  exportPdf: string;
  exporting: string;
  sharing: string;
  rerunning: string;
  copied: string;
  shareFallback: string;
  rerunDone: string;
  upgradeShare: string;
  upgradeRerun: string;
  upgradeExport: string;
  failed: string;
};

const copyByLang: Record<Lang, Copy> = {
  en: {
    share: "Share Link",
    rerun: "Rerun with Live Data",
    exportPdf: "Export PDF",
    exporting: "Exporting...",
    sharing: "Creating...",
    rerunning: "Rerunning...",
    copied: "Share link copied.",
    shareFallback: "Share link created.",
    rerunDone: "A new report has been created.",
    upgradeShare: "Upgrade to Pro to create share links.",
    upgradeRerun: "Upgrade to Pro to rerun reports.",
    upgradeExport: "Upgrade to Pro to export reports.",
    failed: "Action failed."
  },
  zh: {
    share: "分享链接",
    rerun: "用真实数据重跑",
    exportPdf: "导出 PDF",
    exporting: "导出中...",
    sharing: "生成中...",
    rerunning: "重跑中...",
    copied: "分享链接已复制。",
    shareFallback: "分享链接已生成。",
    rerunDone: "已创建一份新的报告。",
    upgradeShare: "升级到专业版后可创建分享链接。",
    upgradeRerun: "升级到专业版后可重跑报告。",
    upgradeExport: "升级到专业版后可导出报告。",
    failed: "操作失败。"
  }
};

export function ReportActions({ lang, plan, reportId, compact = false, includePrint = true, onRerunCreated }: Props) {
  const copy = copyByLang[lang];
  const router = useRouter();
  const features = getPlanFeatures(plan);
  const [sharing, setSharing] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleShare() {
    if (!features.canUseShareLinks) {
      setError(copy.upgradeShare);
      setMessage("");
      return;
    }

    setSharing(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/reports/${reportId}/share`, {
        method: "POST"
      });
      const payload = (await response.json().catch(() => null)) as ShareResponse | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        setError(payload?.error?.message ?? copy.failed);
        return;
      }

      try {
        await navigator.clipboard.writeText(payload.data.share_url);
        setMessage(copy.copied);
      } catch {
        setMessage(`${copy.shareFallback} ${payload.data.share_url}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.failed);
    } finally {
      setSharing(false);
    }
  }

  async function handleRerun() {
    if (!features.canRerunReports) {
      setError(copy.upgradeRerun);
      setMessage("");
      return;
    }

    setRerunning(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/reports/${reportId}/rerun`, {
        method: "POST",
        headers: {
          ...buildApiIntegrationHeaders(readApiIntegrationConfigFromStorage())
        }
      });
      const payload = (await response.json().catch(() => null)) as RerunResponse | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        setError(payload?.error?.message ?? copy.failed);
        return;
      }

      window.dispatchEvent(new Event("viralbrain:reports-refresh"));
      setMessage(copy.rerunDone);
      onRerunCreated?.(payload.data.report_id);
      router.push(`/report/${payload.data.report_id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.failed);
    } finally {
      setRerunning(false);
    }
  }

  async function handlePrint() {
    if (!features.canExportReports) {
      setError(copy.upgradeExport);
      setMessage("");
      return;
    }

    setError("");
    setMessage("");
    setExporting(true);

    try {
      const response = await fetch(`/api/reports/${reportId}/export`, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(payload?.error?.message ?? copy.failed);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `viral-report-${reportId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.failed);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={`report-actions ${compact ? "report-actions-compact" : ""}`}>
      <button type="button" className="btn btn-ghost report-history-action" onClick={handleShare} disabled={sharing}>
        {sharing ? copy.sharing : copy.share}
      </button>
      <button type="button" className="btn btn-ghost report-history-action" onClick={handleRerun} disabled={rerunning}>
        {rerunning ? copy.rerunning : copy.rerun}
      </button>
      {includePrint ? (
        <button type="button" className="btn btn-ghost report-history-action" onClick={handlePrint} disabled={exporting}>
          {exporting ? copy.exporting : copy.exportPdf}
        </button>
      ) : null}
      {message ? <p className="small status-done report-actions-note">{message}</p> : null}
      {error ? <p className="small status-failed report-actions-note">{error}</p> : null}
    </div>
  );
}

