"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildApiIntegrationHeaders, readApiIntegrationConfigFromStorage } from "@/lib/api-integrations";
import { captureAnalyticsEvent } from "@/lib/analytics";
import { getPlanFeatures } from "@/lib/plan-features";
import type { Lang } from "@/lib/i18n-shared";
import type { UserPlan } from "@/lib/types";

type Props = {
  lang: Lang;
  plan: UserPlan;
  reportId: string;
  shareToken?: string | null;
  shareEnabledAt?: string | null;
  shareExpiresAt?: string | null;
  shareRevokedAt?: string | null;
  compact?: boolean;
  includePrint?: boolean;
  onRerunCreated?: (reportId: string) => void;
};

type ShareResponse = {
  ok: boolean;
  data: {
    share_url: string;
    share_token: string;
    share_expires_at: string | null;
  } | null;
  error?: {
    message?: string;
  } | null;
};

type RevokeShareResponse = {
  ok: boolean;
  data: {
    share_revoked_at: string | null;
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
  revokeShare: string;
  rerun: string;
  exportPdf: string;
  exporting: string;
  sharing: string;
  revoking: string;
  rerunning: string;
  copied: string;
  shareFallback: string;
  shareRevoked: string;
  shareActiveUntil: string;
  rerunDone: string;
  upgradeShare: string;
  upgradeRerun: string;
  upgradeExport: string;
  failed: string;
};

const copyByLang: Record<Lang, Copy> = {
  en: {
    share: "Share Link",
    revokeShare: "Revoke Link",
    rerun: "Rerun with Live Data",
    exportPdf: "Export PDF",
    exporting: "Exporting...",
    sharing: "Creating...",
    revoking: "Revoking...",
    rerunning: "Rerunning...",
    copied: "Share link copied.",
    shareFallback: "Share link created.",
    shareRevoked: "Share link revoked.",
    shareActiveUntil: "Active until",
    rerunDone: "A new report has been created.",
    upgradeShare: "Upgrade to Pro to create share links for teammates or clients.",
    upgradeRerun: "Upgrade to Pro to rerun reports with fresh live data.",
    upgradeExport: "Upgrade to Pro to export PDF deliverables.",
    failed: "Action failed."
  },
  zh: {
    share: "分享链接",
    revokeShare: "撤销链接",
    rerun: "用真实数据重跑",
    exportPdf: "导出 PDF",
    exporting: "导出中...",
    sharing: "生成中...",
    revoking: "撤销中...",
    rerunning: "重跑中...",
    copied: "分享链接已复制。",
    shareFallback: "分享链接已生成。",
    shareRevoked: "分享链接已撤销。",
    shareActiveUntil: "有效期至",
    rerunDone: "已创建一份新的报告。",
    upgradeShare: "升级到专业版后可创建分享链接。",
    upgradeRerun: "升级到专业版后可重跑报告。",
    upgradeExport: "升级到专业版后可导出报告。",
    failed: "操作失败。"
  }
};

function isShareActive(
  shareToken: string | null,
  shareEnabledAt: string | null,
  shareExpiresAt: string | null,
  shareRevokedAt: string | null
) {
  if (!shareToken || !shareEnabledAt || !shareExpiresAt || shareRevokedAt) {
    return false;
  }

  const expiresAt = new Date(shareExpiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function formatShareExpiry(value: string | null, lang: Lang) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function ReportActions({
  lang,
  plan,
  reportId,
  shareToken = null,
  shareEnabledAt = null,
  shareExpiresAt = null,
  shareRevokedAt = null,
  compact = false,
  includePrint = true,
  onRerunCreated
}: Props) {
  const copy = copyByLang[lang];
  const router = useRouter();
  const features = getPlanFeatures(plan);
  const [sharing, setSharing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [shareMeta, setShareMeta] = useState({
    shareToken,
    shareEnabledAt,
    shareExpiresAt,
    shareRevokedAt
  });

  useEffect(() => {
    setShareMeta({
      shareToken,
      shareEnabledAt,
      shareExpiresAt,
      shareRevokedAt
    });
  }, [shareEnabledAt, shareExpiresAt, shareRevokedAt, shareToken]);

  const shareActive = isShareActive(
    shareMeta.shareToken,
    shareMeta.shareEnabledAt,
    shareMeta.shareExpiresAt,
    shareMeta.shareRevokedAt
  );

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

      setShareMeta({
        shareToken: payload.data.share_token,
        shareEnabledAt: new Date().toISOString(),
        shareExpiresAt: payload.data.share_expires_at,
        shareRevokedAt: null
      });
      window.dispatchEvent(new Event("viralbrain:reports-refresh"));
      router.refresh();

      const expiryMessage = payload.data.share_expires_at
        ? `${copy.shareActiveUntil} ${formatShareExpiry(payload.data.share_expires_at, lang)}`
        : "";

      try {
        await navigator.clipboard.writeText(payload.data.share_url);
        setMessage([copy.copied, expiryMessage].filter(Boolean).join(" · "));
      } catch {
        setMessage([`${copy.shareFallback} ${payload.data.share_url}`, expiryMessage].filter(Boolean).join(" · "));
      }
      captureAnalyticsEvent("report_share_created", {
        report_id: reportId,
        lang,
        plan,
        share_expires_at: payload.data.share_expires_at ?? null
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.failed);
    } finally {
      setSharing(false);
    }
  }

  async function handleRevokeShare() {
    setRevoking(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/reports/${reportId}/share`, {
        method: "DELETE"
      });
      const payload = (await response.json().catch(() => null)) as RevokeShareResponse | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        setError(payload?.error?.message ?? copy.failed);
        return;
      }

      setShareMeta((current) => ({
        ...current,
        shareRevokedAt: payload.data?.share_revoked_at ?? new Date().toISOString()
      }));
      window.dispatchEvent(new Event("viralbrain:reports-refresh"));
      router.refresh();
      setMessage(copy.shareRevoked);
      captureAnalyticsEvent("report_share_revoked", {
        report_id: reportId,
        lang,
        plan
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.failed);
    } finally {
      setRevoking(false);
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
    captureAnalyticsEvent("report_rerun_started", {
      report_id: reportId,
      lang,
      plan
    });

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
      captureAnalyticsEvent("report_rerun_completed", {
        report_id: reportId,
        next_report_id: payload.data.report_id,
        lang,
        plan
      });
      onRerunCreated?.(payload.data.report_id);
      router.push(`/report/${payload.data.report_id}`);
      router.refresh();
    } catch (cause) {
      const failureMessage = cause instanceof Error ? cause.message : copy.failed;
      setError(failureMessage);
      captureAnalyticsEvent("report_rerun_failed", {
        report_id: reportId,
        lang,
        plan,
        reason: failureMessage
      });
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
      captureAnalyticsEvent("report_pdf_exported", {
        report_id: reportId,
        lang,
        plan
      });
    } catch (cause) {
      const failureMessage = cause instanceof Error ? cause.message : copy.failed;
      setError(failureMessage);
      captureAnalyticsEvent("report_pdf_export_failed", {
        report_id: reportId,
        lang,
        plan,
        reason: failureMessage
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={`report-actions ${compact ? "report-actions-compact" : ""}`}>
      <button type="button" className="btn btn-ghost report-history-action" onClick={handleShare} disabled={sharing}>
        {sharing ? copy.sharing : copy.share}
      </button>
      {shareActive ? (
        <button type="button" className="btn btn-ghost report-history-action" onClick={handleRevokeShare} disabled={revoking}>
          {revoking ? copy.revoking : copy.revokeShare}
        </button>
      ) : null}
      <button type="button" className="btn btn-ghost report-history-action" onClick={handleRerun} disabled={rerunning}>
        {rerunning ? copy.rerunning : copy.rerun}
      </button>
      {includePrint ? (
        <button type="button" className="btn btn-ghost report-history-action" onClick={handlePrint} disabled={exporting}>
          {exporting ? copy.exporting : copy.exportPdf}
        </button>
      ) : null}
      {shareActive ? <p className="small report-actions-note">{copy.shareActiveUntil}: {formatShareExpiry(shareMeta.shareExpiresAt, lang)}</p> : null}
      {message ? <p className="small status-done report-actions-note">{message}</p> : null}
      {error ? <p className="small status-failed report-actions-note">{error}</p> : null}
    </div>
  );
}
