"use client";

import { useState } from "react";
import { buildApiIntegrationHeaders, readApiIntegrationConfigFromStorage } from "@/lib/api-integrations";
import type { CollectDurationPreset } from "@/lib/collector-duration";
import type { Lang } from "@/lib/i18n-shared";
import type { CollectedViralItem, UserPlan } from "@/lib/types";

type Props = {
  lang: Lang;
  plan: UserPlan;
};

type CollectResponse = {
  ok: boolean;
  data: {
    collected: CollectedViralItem[];
    imported_count: number;
    max_results_applied: number;
    vector_sync?: {
      ok: boolean;
      message: string;
      detail?: string;
    };
  } | null;
  error?: {
    message?: string;
  } | null;
};

const copyByLang = {
  en: {
    title: "Viral Work Collector",
    subtitle: "Pull recent breakout YouTube candidates into your library with a configurable time window and view threshold. The YouTube Data API key for this workflow now lives below this panel.",
    hoursWithin: "Published within hours",
    minViews: "Minimum views",
    maxResults: "Max results",
    durationRange: "Video length",
    regionCode: "Region code",
    button: "Collect and Import",
    collecting: "Collecting...",
    summary: "Recommended starting point: 24-48h and 100k+ views.",
    loaded: "Imported",
    items: "items",
    previewTitle: "Latest candidates",
    failed: "Collection failed."
  },
  zh: {
    title: "爆款作品采集",
    subtitle: "按发布时间窗口和最低播放量筛选近期爆款作品，并直接导入你的爆款库。这个工作流所需的 YouTube Data API Key 现在就在当前面板下方配置。",
    hoursWithin: "采集最近多少小时",
    minViews: "最低播放量",
    maxResults: "最多采集条数",
    durationRange: "作品时长范围",
    regionCode: "地区代码",
    button: "采集并导入",
    collecting: "采集中...",
    summary: "推荐起始条件：24-48 小时、10 万以上播放量。",
    loaded: "已导入",
    items: "条",
    previewTitle: "最近命中的爆款候选",
    failed: "采集失败。"
  }
} as const;

const durationOptionsByLang: Record<Lang, Array<{ value: CollectDurationPreset; label: string }>> = {
  en: [
    { value: "any", label: "Any length" },
    { value: "shorts", label: "Shorts (0-1 min)" },
    { value: "minutes_1_3", label: "1-3 min" },
    { value: "minutes_3_5", label: "3-5 min" },
    { value: "minutes_5_10", label: "5-10 min" },
    { value: "minutes_10_20", label: "10-20 min" },
    { value: "minutes_20_plus", label: "20+ min" }
  ],
  zh: [
    { value: "any", label: "不限" },
    { value: "shorts", label: "短视频（0-1 分钟）" },
    { value: "minutes_1_3", label: "1-3 分钟" },
    { value: "minutes_3_5", label: "3-5 分钟" },
    { value: "minutes_5_10", label: "5-10 分钟" },
    { value: "minutes_10_20", label: "10-20 分钟" },
    { value: "minutes_20_plus", label: "20 分钟以上" }
  ]
};

function formatDuration(durationSec: number): string {
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const seconds = durationSec % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ViralCollectorPanel({ lang, plan }: Props) {
  const copy = copyByLang[lang];
  const durationOptions = durationOptionsByLang[lang];
  const [collecting, setCollecting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [collectPreview, setCollectPreview] = useState<CollectedViralItem[]>([]);
  const [collectForm, setCollectForm] = useState({
    hoursWithin: 48,
    minViews: 100000,
    maxResults: plan === "pro" ? 20 : 10,
    durationPreset: "any" as CollectDurationPreset,
    regionCode: "US"
  });

  async function handleCollect() {
    setCollecting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/library/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildApiIntegrationHeaders(readApiIntegrationConfigFromStorage())
        },
        body: JSON.stringify({
          ...collectForm,
          autoImport: true
        })
      });

      const payload = (await response.json().catch(() => null)) as CollectResponse | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        setError(payload?.error?.message ?? copy.failed);
        return;
      }

      setCollectPreview(payload.data.collected);
      setMessage(
        [
          `${copy.loaded} ${payload.data.imported_count} ${copy.items}`,
          payload.data.vector_sync?.message ?? ""
        ]
          .filter(Boolean)
          .join(" · ")
      );
      window.dispatchEvent(new Event("viralbrain:library-refresh"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.failed);
    } finally {
      setCollecting(false);
    }
  }

  return (
    <section className="card panel collect-panel collect-page-panel">
      <div className="section-intro compact-intro">
        <span className="badge">YouTube</span>
        <h1 style={{ marginTop: 18 }}>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </div>

      <div className="collect-form-grid collect-form-grid-wide">
        <label className="collect-field">
          <span className="small">{copy.hoursWithin}</span>
          <input
            className="input"
            type="number"
            min={1}
            max={168}
            value={collectForm.hoursWithin}
            onChange={(event) =>
              setCollectForm((current) => ({ ...current, hoursWithin: Number(event.target.value) || 24 }))
            }
          />
        </label>
        <label className="collect-field">
          <span className="small">{copy.minViews}</span>
          <input
            className="input"
            type="number"
            min={1000}
            step={1000}
            value={collectForm.minViews}
            onChange={(event) =>
              setCollectForm((current) => ({ ...current, minViews: Number(event.target.value) || 100000 }))
            }
          />
        </label>
        <label className="collect-field">
          <span className="small">{copy.maxResults}</span>
          <input
            className="input"
            type="number"
            min={1}
            max={plan === "pro" ? 30 : 10}
            value={collectForm.maxResults}
            onChange={(event) =>
              setCollectForm((current) => ({ ...current, maxResults: Number(event.target.value) || 10 }))
            }
          />
        </label>
        <label className="collect-field">
          <span className="small">{copy.durationRange}</span>
          <select
            className="input"
            value={collectForm.durationPreset}
            onChange={(event) =>
              setCollectForm((current) => ({
                ...current,
                durationPreset: event.target.value as CollectDurationPreset
              }))
            }
          >
            {durationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="collect-field">
          <span className="small">{copy.regionCode}</span>
          <input
            className="input"
            value={collectForm.regionCode}
            onChange={(event) => setCollectForm((current) => ({ ...current, regionCode: event.target.value.toUpperCase() }))}
            placeholder="US"
          />
        </label>
      </div>

      <div className="collect-panel-actions collect-page-actions">
        <button type="button" className="btn btn-primary collect-panel-button" onClick={handleCollect} disabled={collecting}>
          {collecting ? copy.collecting : copy.button}
        </button>
        <p className="small collect-panel-note">{copy.summary}</p>
      </div>

      {message ? <p className="status-done small">{message}</p> : null}
      {error ? <p className="status-failed small">{error}</p> : null}

      {collectPreview.length > 0 ? (
        <div className="collect-preview-list">
          <p className="small" style={{ fontWeight: 700 }}>{copy.previewTitle}</p>
          {collectPreview.map((item) => (
            <div key={item.id} className="collect-preview-card">
              <strong>{item.title}</strong>
              <p className="small">
                {item.channelName} · {formatDuration(item.durationSec)} · {item.stats.viewCount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
