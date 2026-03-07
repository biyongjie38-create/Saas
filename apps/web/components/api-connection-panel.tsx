"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n-shared";
import {
  applyProviderPreset,
  clearApiIntegrationConfig,
  createEmptyApiIntegrationConfig,
  getProviderPreset,
  hasConnectedKeys,
  listProviderPresets,
  maskSecret,
  persistApiIntegrationConfig,
  readApiIntegrationConfigFromStorage,
  type ApiIntegrationConfig
} from "@/lib/api-integrations";
import type { UserPlan } from "@/lib/types";

type Props = {
  lang: Lang;
  plan: UserPlan;
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
  llmTitle: string;
  llmDesc: string;
  pineconeTitle: string;
  pineconeDesc: string;
  provider: string;
  analysisModel: string;
  scoreModel: string;
  embeddingModel: string;
  youtubeKey: string;
  llmKey: string;
  llmBaseUrl: string;
  pineconeKey: string;
  pineconeHost: string;
  pineconeName: string;
  pineconeNamespace: string;
  optional: string;
  save: string;
  clear: string;
  test: string;
  testing: string;
  saved: string;
  cleared: string;
  empty: string;
  activeNotice: string;
  advancedLocked: string;
  providerNote: string;
  testSummary: string;
};

type TestResponse = {
  ok: boolean;
  data: {
    results: Record<string, { ok: boolean; message: string; detail?: string }>;
    plan: UserPlan;
  } | null;
  error?: { message?: string } | null;
};

const copyByLang: Record<Lang, Copy> = {
  en: {
    title: "Bring Your Own API Keys",
    subtitle:
      "Users can connect their own platform credentials so data and model costs are billed to their own provider accounts.",
    storageHint:
      "Keys are stored only in the current browser and attached to requests on demand. This MVP does not write secrets into your database.",
    liveNow: "Live now",
    planned: "Reserved",
    connected: "Connected",
    missing: "Not connected",
    youtubeTitle: "YouTube Data API",
    youtubeDesc: "Used to fetch live video metadata, comments, and viral collection candidates.",
    llmTitle: "LLM Provider",
    llmDesc: "Supports OpenAI and OpenAI-compatible domestic providers such as Bailian or Yunwu.",
    pineconeTitle: "Pinecone",
    pineconeDesc: "Optional for real benchmark retrieval when vector search is enabled.",
    provider: "Provider",
    analysisModel: "Analysis model",
    scoreModel: "Score model",
    embeddingModel: "Embedding model",
    youtubeKey: "YouTube API Key",
    llmKey: "Provider API Key",
    llmBaseUrl: "Provider Base URL",
    pineconeKey: "Pinecone API Key",
    pineconeHost: "Pinecone Index Host",
    pineconeName: "Pinecone Index Name",
    pineconeNamespace: "Pinecone Namespace",
    optional: "Optional",
    save: "Save Local Config",
    clear: "Clear Local Config",
    test: "Test Connection",
    testing: "Testing...",
    saved: "API configuration saved in this browser.",
    cleared: "Local API configuration cleared.",
    empty: "No keys have been entered yet.",
    activeNotice: "Analysis requests automatically prefer your own connected APIs when available.",
    advancedLocked: "Domestic/custom LLM providers are available in Pro.",
    providerNote: "Provider note",
    testSummary: "Connection summary"
  },
  zh: {
    title: "对接用户自己的 API",
    subtitle: "让用户自己接入平台和模型凭证，把真实数据与模型调用费用计到用户自己的供应商账户上。",
    storageHint: "Key 只保存在当前浏览器，本次请求按需附带。这个 MVP 版本不会把密钥写入数据库。",
    liveNow: "已接入",
    planned: "预留",
    connected: "已配置",
    missing: "未配置",
    youtubeTitle: "YouTube Data API",
    youtubeDesc: "用于抓取真实视频元数据、评论，以及爆款作品采集候选。",
    llmTitle: "模型供应商",
    llmDesc: "支持 OpenAI，也支持阿里云百炼、云雾这类 OpenAI 兼容接口。",
    pineconeTitle: "Pinecone",
    pineconeDesc: "可选，用于开启真实向量检索后的对标召回。",
    provider: "供应商",
    analysisModel: "分析模型",
    scoreModel: "评分模型",
    embeddingModel: "向量模型",
    youtubeKey: "YouTube API Key",
    llmKey: "模型 API Key",
    llmBaseUrl: "模型 Base URL",
    pineconeKey: "Pinecone API Key",
    pineconeHost: "Pinecone Index Host",
    pineconeName: "Pinecone Index Name",
    pineconeNamespace: "Pinecone Namespace",
    optional: "可选",
    save: "保存本地配置",
    clear: "清空本地配置",
    test: "测试连接",
    testing: "测试中...",
    saved: "API 配置已保存到当前浏览器。",
    cleared: "本地 API 配置已清空。",
    empty: "还没有填写任何 Key。",
    activeNotice: "当你填写了自己的 API 后，分析请求会优先走你自己的平台额度。",
    advancedLocked: "国产 / 自定义模型供应商属于专业版能力。",
    providerNote: "供应商说明",
    testSummary: "连接结果"
  }
};

export function ApiConnectionPanel({ lang, plan }: Props) {
  const copy = copyByLang[lang];
  const presets = useMemo(() => listProviderPresets(), []);
  const [config, setConfig] = useState<ApiIntegrationConfig>(createEmptyApiIntegrationConfig());
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string; detail?: string }>>({});

  useEffect(() => {
    setConfig(readApiIntegrationConfigFromStorage());
  }, []);

  const currentPreset = getProviderPreset(config.llmProvider);
  const providerCards = useMemo(
    () => [
      {
        id: "youtube",
        title: copy.youtubeTitle,
        desc: copy.youtubeDesc,
        state: config.youtubeApiKey ? copy.connected : copy.missing,
        mask: maskSecret(config.youtubeApiKey)
      },
      {
        id: "llm",
        title: `${copy.llmTitle}: ${currentPreset.label}`,
        desc: copy.llmDesc,
        state: config.openaiApiKey ? copy.connected : copy.missing,
        mask: maskSecret(config.openaiApiKey)
      },
      {
        id: "pinecone",
        title: copy.pineconeTitle,
        desc: copy.pineconeDesc,
        state: config.pineconeApiKey ? copy.connected : copy.missing,
        mask: maskSecret(config.pineconeApiKey)
      }
    ],
    [config, copy, currentPreset.label]
  );

  function updateField<K extends keyof ApiIntegrationConfig>(key: K, value: ApiIntegrationConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function changeProvider(nextProvider: ApiIntegrationConfig["llmProvider"]) {
    setConfig((current) => applyProviderPreset(current, nextProvider, { preserveSecrets: true }));
    setMessage("");
  }

  function saveConfig() {
    persistApiIntegrationConfig(config);
    setMessage(hasConnectedKeys(config) ? copy.saved : copy.empty);
  }

  function clearConfig() {
    clearApiIntegrationConfig();
    setConfig(createEmptyApiIntegrationConfig());
    setResults({});
    setMessage(copy.cleared);
  }

  async function testConfig() {
    setTesting(true);
    setMessage("");
    try {
      const response = await fetch("/api/integrations/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          target: "all",
          config
        })
      });
      const payload = (await response.json().catch(() => null)) as TestResponse | null;
      if (!response.ok || !payload?.ok || !payload.data) {
        setMessage(payload?.error?.message ?? "Test failed.");
        return;
      }
      setResults(payload.data.results);
      setMessage(copy.testSummary);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test failed.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="card panel integrations-panel">
      <div className="integrations-header">
        <div>
          <h2 style={{ marginTop: 0 }}>{copy.title}</h2>
          <p>{copy.subtitle}</p>
          <p className="small">{copy.storageHint}</p>
          {plan === "free" ? <div className="upgrade-hint">{copy.advancedLocked}</div> : null}
        </div>
        <div className="integration-status-stack">
          {providerCards.map((item) => (
            <article key={item.id} className="integration-provider-card">
              <div className="library-card-head">
                <strong>{item.title}</strong>
                <span className="badge badge-live">{copy.liveNow}</span>
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
          <span className="small">{copy.provider}</span>
          <select className="input" value={config.llmProvider} onChange={(event) => changeProvider(event.target.value as ApiIntegrationConfig["llmProvider"])}>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
        </label>
        <label className="integration-field">
          <span className="small">{copy.llmKey}</span>
          <input className="input" value={config.openaiApiKey} onChange={(event) => updateField("openaiApiKey", event.target.value)} placeholder="sk-..." />
        </label>
        <label className="integration-field">
          <span className="small">{copy.llmBaseUrl}</span>
          <input className="input" value={config.openaiBaseUrl} onChange={(event) => updateField("openaiBaseUrl", event.target.value)} placeholder="https://api.openai.com/v1" />
        </label>
        <label className="integration-field">
          <span className="small">{copy.analysisModel}</span>
          <input className="input" value={config.analysisModel} onChange={(event) => updateField("analysisModel", event.target.value)} placeholder="gpt-4o-mini" />
        </label>
        <label className="integration-field">
          <span className="small">{copy.scoreModel}</span>
          <input className="input" value={config.scoreModel} onChange={(event) => updateField("scoreModel", event.target.value)} placeholder="gpt-4o" />
        </label>
        <label className="integration-field integration-field-wide">
          <span className="small">{copy.embeddingModel} ({copy.optional})</span>
          <input className="input" value={config.embeddingModel} onChange={(event) => updateField("embeddingModel", event.target.value)} placeholder="text-embedding-3-small" />
        </label>
        <label className="integration-field">
          <span className="small">{copy.pineconeKey} ({copy.optional})</span>
          <input className="input" value={config.pineconeApiKey} onChange={(event) => updateField("pineconeApiKey", event.target.value)} placeholder="pcsk_..." />
        </label>
        <label className="integration-field">
          <span className="small">{copy.pineconeHost} ({copy.optional})</span>
          <input className="input" value={config.pineconeIndexHost} onChange={(event) => updateField("pineconeIndexHost", event.target.value)} placeholder="example.svc.aped-...pinecone.io" />
        </label>
        <label className="integration-field">
          <span className="small">{copy.pineconeName} ({copy.optional})</span>
          <input className="input" value={config.pineconeIndexName} onChange={(event) => updateField("pineconeIndexName", event.target.value)} placeholder="viralbrain-library" />
        </label>
        <label className="integration-field">
          <span className="small">{copy.pineconeNamespace} ({copy.optional})</span>
          <input className="input" value={config.pineconeNamespace} onChange={(event) => updateField("pineconeNamespace", event.target.value)} placeholder="viral-library" />
        </label>
      </div>

      {currentPreset.note ? (
        <div className="api-roadmap card panel">
          <div className="library-card-head">
            <strong>{copy.providerNote}</strong>
            <span className="badge">{currentPreset.label}</span>
          </div>
          <p className="small">{currentPreset.note}</p>
        </div>
      ) : null}

      <div className="plan-actions" style={{ marginTop: 20 }}>
        <button type="button" className="btn btn-primary plan-action-button" onClick={saveConfig}>
          {copy.save}
        </button>
        <button type="button" className="btn btn-ghost plan-action-button" onClick={testConfig} disabled={testing}>
          {testing ? copy.testing : copy.test}
        </button>
        <button type="button" className="btn btn-ghost plan-action-button" onClick={clearConfig}>
          {copy.clear}
        </button>
      </div>

      {message ? <p className="status-done small" style={{ marginTop: 14 }}>{message}</p> : null}

      {Object.keys(results).length > 0 ? (
        <div className="integration-status-stack">
          {Object.entries(results).map(([key, result]) => (
            <article key={key} className={`integration-provider-card ${result.ok ? "integration-result-success" : "integration-result-failed"}`}>
              <div className="library-card-head">
                <strong>{key}</strong>
                <span className="badge">{result.ok ? copy.connected : copy.missing}</span>
              </div>
              <p className="small">{result.message}</p>
              {result.detail ? <p className="small mono">{result.detail}</p> : null}
            </article>
          ))}
        </div>
      ) : null}

      <p className="small" style={{ marginTop: 8 }}>{copy.activeNotice}</p>
    </section>
  );
}

