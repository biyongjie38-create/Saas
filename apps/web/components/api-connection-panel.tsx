"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n-shared";
import {
  clearApiIntegrationConfig,
  createEmptyApiIntegrationConfig,
  hasConnectedKeys,
  maskSecret,
  persistApiIntegrationConfig,
  readApiIntegrationConfigFromStorage,
  type ApiIntegrationConfig
} from "@/lib/api-integrations";

type Props = {
  lang: Lang;
};

type Copy = {
  title: string;
  subtitle: string;
  storageHint: string;
  liveNow: string;
  planned: string;
  connected: string;
  missing: string;
  youtubeTitle: string;
  youtubeDesc: string;
  openaiTitle: string;
  openaiDesc: string;
  pineconeTitle: string;
  pineconeDesc: string;
  roadmapTitle: string;
  roadmapDesc: string;
  tiktok: string;
  bilibili: string;
  instagram: string;
  youtubeKey: string;
  openaiKey: string;
  openaiBaseUrl: string;
  pineconeKey: string;
  pineconeHost: string;
  pineconeName: string;
  pineconeNamespace: string;
  optional: string;
  save: string;
  clear: string;
  saved: string;
  cleared: string;
  empty: string;
  activeNotice: string;
};

const copyByLang: Record<Lang, Copy> = {
  en: {
    title: "Bring Your Own API Keys",
    subtitle:
      "Users can connect their own API credentials so analysis costs are billed to their own platform accounts instead of your SaaS account.",
    storageHint:
      "Keys are stored only in the current browser and sent on demand. They are not written into your database in this MVP.",
    liveNow: "Live now",
    planned: "Planned",
    connected: "Connected",
    missing: "Not connected",
    youtubeTitle: "YouTube Data API",
    youtubeDesc: "Used to fetch live video metadata and comments during analysis.",
    openaiTitle: "OpenAI API",
    openaiDesc: "Used for real AI analysis when the AI service is deployed and remote mode is enabled.",
    pineconeTitle: "Pinecone",
    pineconeDesc: "Optional for real benchmark retrieval when RAG is fully enabled.",
    roadmapTitle: "Platform roadmap",
    roadmapDesc:
      "Current production analysis is still focused on YouTube. Additional platforms are shown as reserved connectors.",
    tiktok: "TikTok Creator API",
    bilibili: "Bilibili Open Platform",
    instagram: "Instagram Graph API",
    youtubeKey: "YouTube API Key",
    openaiKey: "OpenAI API Key",
    openaiBaseUrl: "OpenAI Base URL",
    pineconeKey: "Pinecone API Key",
    pineconeHost: "Pinecone Index Host",
    pineconeName: "Pinecone Index Name",
    pineconeNamespace: "Pinecone Namespace",
    optional: "Optional",
    save: "Save Local Config",
    clear: "Clear Local Config",
    saved: "API connection settings saved in this browser.",
    cleared: "Local API connection settings cleared.",
    empty: "No keys have been entered yet.",
    activeNotice: "Current analysis will automatically prefer your own keys when they are present."
  },
  zh: {
    title: "\u5bf9\u63a5\u7528\u6237\u81ea\u5df1\u7684 API",
    subtitle:
      "\u5141\u8bb8\u7528\u6237\u63a5\u5165\u81ea\u5df1\u7684 API \u51ed\u8bc1\uff0c\u8ba9\u5206\u6790\u8c03\u7528\u8d39\u7528\u8d70\u7528\u6237\u81ea\u5df1\u7684\u5e73\u53f0\u8d26\u53f7\uff0c\u800c\u4e0d\u662f\u7531\u4f60\u7684 SaaS \u5e73\u53f0\u7edf\u4e00\u57cb\u5355\u3002",
    storageHint:
      "API Key \u53ea\u4f1a\u4fdd\u5b58\u5728\u5f53\u524d\u6d4f\u89c8\u5668\u91cc\uff0c\u5f53\u6b21\u8c03\u7528\u65f6\u6309\u9700\u53d1\u9001\uff0c\u8fd9\u4e2a MVP \u7248\u672c\u4e0d\u4f1a\u5199\u5165\u4f60\u7684\u6570\u636e\u5e93\u3002",
    liveNow: "\u5df2\u63a5\u5165",
    planned: "\u9884\u7559",
    connected: "\u5df2\u914d\u7f6e",
    missing: "\u672a\u914d\u7f6e",
    youtubeTitle: "YouTube Data API",
    youtubeDesc: "\u7528\u4e8e\u5728\u5206\u6790\u65f6\u6293\u53d6\u771f\u5b9e\u89c6\u9891\u5143\u6570\u636e\u548c\u8bc4\u8bba\u3002",
    openaiTitle: "OpenAI API",
    openaiDesc: "\u5f53 AI \u670d\u52a1\u5df2\u90e8\u7f72\u4e14\u542f\u7528\u8fdc\u7a0b\u6a21\u5f0f\u65f6\uff0c\u7528\u6237\u7684 OpenAI Key \u53ef\u76f4\u63a5\u7528\u4e8e\u771f\u5b9e\u5206\u6790\u3002",
    pineconeTitle: "Pinecone",
    pineconeDesc: "\u53ef\u9009\uff0c\u7528\u4e8e\u5728\u5f00\u542f\u771f RAG \u540e\u6267\u884c\u5bf9\u6807\u68c0\u7d22\u3002",
    roadmapTitle: "\u5e73\u53f0\u63a5\u5165\u8def\u7ebf",
    roadmapDesc:
      "\u5f53\u524d\u751f\u4ea7\u5206\u6790\u4ecd\u7136\u805a\u7126 YouTube\uff0c\u5176\u4ed6\u5e73\u53f0\u5148\u505a\u6210\u9884\u7559\u8fde\u63a5\u5668\u3002",
    tiktok: "TikTok Creator API",
    bilibili: "Bilibili Open Platform",
    instagram: "Instagram Graph API",
    youtubeKey: "YouTube API Key",
    openaiKey: "OpenAI API Key",
    openaiBaseUrl: "OpenAI Base URL",
    pineconeKey: "Pinecone API Key",
    pineconeHost: "Pinecone Index Host",
    pineconeName: "Pinecone Index Name",
    pineconeNamespace: "Pinecone Namespace",
    optional: "\u53ef\u9009",
    save: "\u4fdd\u5b58\u672c\u5730\u914d\u7f6e",
    clear: "\u6e05\u7a7a\u672c\u5730\u914d\u7f6e",
    saved: "API \u5bf9\u63a5\u8bbe\u7f6e\u5df2\u4fdd\u5b58\u5230\u5f53\u524d\u6d4f\u89c8\u5668\u3002",
    cleared: "\u672c\u5730 API \u5bf9\u63a5\u8bbe\u7f6e\u5df2\u6e05\u7a7a\u3002",
    empty: "\u8fd8\u6ca1\u6709\u586b\u5165\u4efb\u4f55 Key\u3002",
    activeNotice: "\u5f53\u524d\u5206\u6790\u6d41\u7a0b\u4f1a\u4f18\u5148\u4f7f\u7528\u4f60\u81ea\u5df1\u5df2\u586b\u7684 Key\u3002"
  }
};

export function ApiConnectionPanel({ lang }: Props) {
  const copy = copyByLang[lang];
  const [config, setConfig] = useState<ApiIntegrationConfig>(createEmptyApiIntegrationConfig());
  const [message, setMessage] = useState("");

  useEffect(() => {
    setConfig(readApiIntegrationConfigFromStorage());
  }, []);

  const providerCards = useMemo(
    () => [
      {
        id: "youtube",
        title: copy.youtubeTitle,
        desc: copy.youtubeDesc,
        state: config.youtubeApiKey ? copy.connected : copy.missing,
        live: true,
        mask: maskSecret(config.youtubeApiKey)
      },
      {
        id: "openai",
        title: copy.openaiTitle,
        desc: copy.openaiDesc,
        state: config.openaiApiKey ? copy.connected : copy.missing,
        live: true,
        mask: maskSecret(config.openaiApiKey)
      },
      {
        id: "pinecone",
        title: copy.pineconeTitle,
        desc: copy.pineconeDesc,
        state: config.pineconeApiKey ? copy.connected : copy.missing,
        live: true,
        mask: maskSecret(config.pineconeApiKey)
      }
    ],
    [config.openaiApiKey, config.pineconeApiKey, config.youtubeApiKey, copy]
  );

  function updateField<K extends keyof ApiIntegrationConfig>(key: K, value: ApiIntegrationConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function saveConfig() {
    persistApiIntegrationConfig(config);
    setMessage(hasConnectedKeys(config) ? copy.saved : copy.empty);
  }

  function clearConfig() {
    clearApiIntegrationConfig();
    setConfig(createEmptyApiIntegrationConfig());
    setMessage(copy.cleared);
  }

  return (
    <section className="card panel integrations-panel">
      <div className="integrations-header">
        <div>
          <h2 style={{ marginTop: 0 }}>{copy.title}</h2>
          <p>{copy.subtitle}</p>
          <p className="small">{copy.storageHint}</p>
        </div>
        <div className="integration-status-stack">
          {providerCards.map((item) => (
            <article key={item.id} className="integration-provider-card">
              <div className="library-card-head">
                <strong>{item.title}</strong>
                <span className={`badge ${item.live ? "badge-live" : ""}`}>{item.live ? copy.liveNow : copy.planned}</span>
              </div>
              <p className="small">{item.desc}</p>
              <p className="small mono">{item.state}{item.mask ? `: ${item.mask}` : ""}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="integration-form-grid">
        <label className="integration-field">
          <span className="small">{copy.youtubeKey}</span>
          <input className="input" value={config.youtubeApiKey} onChange={(event) => updateField("youtubeApiKey", event.target.value)} placeholder="AIza..." />
        </label>
        <label className="integration-field">
          <span className="small">{copy.openaiKey}</span>
          <input className="input" value={config.openaiApiKey} onChange={(event) => updateField("openaiApiKey", event.target.value)} placeholder="sk-..." />
        </label>
        <label className="integration-field">
          <span className="small">{copy.openaiBaseUrl} ({copy.optional})</span>
          <input className="input" value={config.openaiBaseUrl} onChange={(event) => updateField("openaiBaseUrl", event.target.value)} placeholder="https://api.openai.com/v1" />
        </label>
        <label className="integration-field">
          <span className="small">{copy.pineconeKey} ({copy.optional})</span>
          <input className="input" value={config.pineconeApiKey} onChange={(event) => updateField("pineconeApiKey", event.target.value)} placeholder="pcsk_..." />
        </label>
        <label className="integration-field">
          <span className="small">{copy.pineconeHost} ({copy.optional})</span>
          <input className="input" value={config.pineconeIndexHost} onChange={(event) => updateField("pineconeIndexHost", event.target.value)} placeholder="example.svc.aped-4627-b74a.pinecone.io" />
        </label>
        <label className="integration-field">
          <span className="small">{copy.pineconeName} ({copy.optional})</span>
          <input className="input" value={config.pineconeIndexName} onChange={(event) => updateField("pineconeIndexName", event.target.value)} placeholder="viralbrain-library" />
        </label>
        <label className="integration-field integration-field-wide">
          <span className="small">{copy.pineconeNamespace} ({copy.optional})</span>
          <input className="input" value={config.pineconeNamespace} onChange={(event) => updateField("pineconeNamespace", event.target.value)} placeholder="viral-library" />
        </label>
      </div>

      <div className="api-roadmap card panel">
        <div className="library-card-head">
          <strong>{copy.roadmapTitle}</strong>
          <span className="badge">{copy.planned}</span>
        </div>
        <p className="small">{copy.roadmapDesc}</p>
        <div className="membership-summary-row">
          <span className="badge">{copy.tiktok}</span>
          <span className="badge">{copy.bilibili}</span>
          <span className="badge">{copy.instagram}</span>
        </div>
      </div>

      <div className="plan-actions" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn-primary plan-action-button" onClick={saveConfig}>
          {copy.save}
        </button>
        <button type="button" className="btn btn-ghost plan-action-button" onClick={clearConfig}>
          {copy.clear}
        </button>
      </div>

      {message ? <p className="status-done small" style={{ marginTop: 14 }}>{message}</p> : null}
      <p className="small" style={{ marginTop: 8 }}>{copy.activeNotice}</p>
    </section>
  );
}
