"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type ApiSection = "youtube" | "llm" | "pinecone";
type TestTarget = "youtube" | "llm" | "pinecone";

type Props = {
  lang: Lang;
  plan: UserPlan;
  sections?: ApiSection[];
  title?: string;
  subtitle?: string;
  storageHint?: string;
  activeNotice?: string;
};

type Copy = {
  title: string;
  subtitle: string;
  storageHint: string;
  liveNow: string;
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
  providerHint: string;
  providerSelected: string;
  providerDefaultNote: string;
  clearVisible: string;
  testFailed: string;
};

type TestResponse = {
  ok: boolean;
  data: {
    results: Record<string, { ok: boolean; message: string; detail?: string }>;
    plan: UserPlan;
  } | null;
  error?: { message?: string } | null;
};

const DEFAULT_SECTIONS: ApiSection[] = ["youtube", "llm", "pinecone"];

const copyByLang: Record<Lang, Copy> = {
  en: {
    title: "Bring Your Own API Keys",
    subtitle:
      "Users can connect their own platform credentials so data and model costs are billed to their own provider accounts.",
    storageHint:
      "Keys are stored only in the current browser and attached to requests on demand. This MVP does not write secrets into your database.",
    liveNow: "Live now",
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
    cleared: "Selected API fields were cleared from this browser.",
    empty: "No keys have been entered yet.",
    activeNotice: "Requests automatically prefer your own connected APIs when available.",
    advancedLocked: "Domestic/custom LLM providers are available in Pro.",
    providerNote: "Provider note",
    testSummary: "Connection summary",
    providerHint: "Click to open the provider picker and auto-fill the recommended defaults.",
    providerSelected: "Selected",
    providerDefaultNote: "Use the default compatible settings, then fill in the key and test the connection.",
    clearVisible: "Clear visible fields",
    testFailed: "Connection test failed."
  },
  zh: {
    title: "对接用户自己的 API",
    subtitle: "让用户自己接入平台和模型凭证，把真实数据与模型调用费用计到用户自己的供应商账户上。",
    storageHint: "Key 只保存在当前浏览器，本次请求按需附带。这个 MVP 版本不会把密钥写入数据库。",
    liveNow: "已接入",
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
    cleared: "当前页面涉及的 API 配置已清空。",
    empty: "还没有填写任何 Key。",
    activeNotice: "当你填写了自己的 API 后，请求会优先走你自己的平台额度。",
    advancedLocked: "国产 / 自定义模型供应商属于专业版能力。",
    providerNote: "供应商说明",
    testSummary: "连接结果",
    providerHint: "点击后会展开清晰的供应商选择面板，并自动带入推荐配置。",
    providerSelected: "当前选择",
    providerDefaultNote: "先使用默认兼容配置，再填写对应 Key 并执行测试连接。",
    clearVisible: "清空当前页配置",
    testFailed: "测试连接失败。"
  }
};

function toVisibleSections(input?: ApiSection[]) {
  if (!input?.length) {
    return DEFAULT_SECTIONS;
  }

  const unique = Array.from(new Set(input));
  return unique.filter(
    (section): section is ApiSection =>
      section === "youtube" || section === "llm" || section === "pinecone"
  );
}

function mapSectionToTargets(section: ApiSection): TestTarget[] {
  if (section === "llm") {
    return ["llm"];
  }
  if (section === "pinecone") {
    return ["pinecone"];
  }
  return ["youtube"];
}

function persistVisibleConfig(config: ApiIntegrationConfig) {
  if (hasConnectedKeys(config)) {
    persistApiIntegrationConfig(config);
    return;
  }
  clearApiIntegrationConfig();
}

function clearSections(config: ApiIntegrationConfig, sections: ApiSection[]) {
  let next = { ...config };

  if (sections.includes("youtube")) {
    next.youtubeApiKey = "";
  }

  if (sections.includes("llm")) {
    next = applyProviderPreset(next, "openai");
    next.openaiApiKey = "";
  }

  if (sections.includes("pinecone")) {
    next.pineconeApiKey = "";
    next.pineconeIndexHost = "";
    next.pineconeIndexName = "";
    next.pineconeNamespace = "viral-library";
  }

  return next;
}

export function ApiConnectionPanel({
  lang,
  plan,
  sections,
  title,
  subtitle,
  storageHint,
  activeNotice
}: Props) {
  const copy = copyByLang[lang];
  const presets = useMemo(() => listProviderPresets(), []);
  const visibleSections = useMemo(() => toVisibleSections(sections), [sections]);
  const visibleTargets = useMemo(
    () => Array.from(new Set(visibleSections.flatMap((section) => mapSectionToTargets(section)))),
    [visibleSections]
  );
  const [config, setConfig] = useState<ApiIntegrationConfig>(createEmptyApiIntegrationConfig());
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string; detail?: string }>>({});
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const providerPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setConfig(readApiIntegrationConfigFromStorage());
  }, []);

  useEffect(() => {
    if (!providerMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!providerPickerRef.current?.contains(event.target as Node)) {
        setProviderMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [providerMenuOpen]);

  const currentPreset = getProviderPreset(config.llmProvider);
  const providerCards = useMemo(
    () =>
      [
        {
          id: "youtube" as const,
          title: copy.youtubeTitle,
          desc: copy.youtubeDesc,
          state: config.youtubeApiKey ? copy.connected : copy.missing,
          mask: maskSecret(config.youtubeApiKey)
        },
        {
          id: "llm" as const,
          title: `${copy.llmTitle}: ${currentPreset.label}`,
          desc: copy.llmDesc,
          state: config.openaiApiKey ? copy.connected : copy.missing,
          mask: maskSecret(config.openaiApiKey)
        },
        {
          id: "pinecone" as const,
          title: copy.pineconeTitle,
          desc: copy.pineconeDesc,
          state: config.pineconeApiKey ? copy.connected : copy.missing,
          mask: maskSecret(config.pineconeApiKey)
        }
      ].filter((item) => visibleSections.includes(item.id)),
    [config, copy, currentPreset.label, visibleSections]
  );

  function clearMessages() {
    setMessage("");
    setMessageTone("success");
  }

  function updateField<K extends keyof ApiIntegrationConfig>(key: K, value: ApiIntegrationConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
    clearMessages();
  }

  function changeProvider(nextProvider: ApiIntegrationConfig["llmProvider"]) {
    setConfig((current) => applyProviderPreset(current, nextProvider, { preserveSecrets: true }));
    clearMessages();
    setProviderMenuOpen(false);
  }

  function saveConfig() {
    persistVisibleConfig(config);
    setMessage(hasConnectedKeys(config) ? copy.saved : copy.empty);
    setMessageTone("success");
  }

  function clearConfig() {
    const nextConfig = clearSections(config, visibleSections);
    persistVisibleConfig(nextConfig);
    setConfig(nextConfig);
    setResults((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => {
          if (key === "youtube") {
            return !visibleSections.includes("youtube");
          }
          if (key === "llm") {
            return !visibleSections.includes("llm");
          }
          if (key === "pinecone") {
            return !visibleSections.includes("pinecone");
          }
          return true;
        })
      )
    );
    setMessage(copy.cleared);
    setMessageTone("success");
    setProviderMenuOpen(false);
  }

  async function testSingleTarget(target: TestTarget) {
    const response = await fetch("/api/integrations/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        target,
        config
      })
    });

    const payload = (await response.json().catch(() => null)) as TestResponse | null;
    if (!response.ok || !payload?.ok || !payload.data) {
      throw new Error(payload?.error?.message ?? copy.testFailed);
    }

    return payload.data.results;
  }

  async function testConfig() {
    setTesting(true);
    clearMessages();
    setResults({});

    try {
      const mergedResults: Record<string, { ok: boolean; message: string; detail?: string }> = {};

      for (const target of visibleTargets) {
        const targetResults = await testSingleTarget(target);
        Object.assign(mergedResults, targetResults);
      }

      setResults(mergedResults);
      setMessage(copy.testSummary);
      setMessageTone("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.testFailed);
      setMessageTone("error");
    } finally {
      setTesting(false);
    }
  }

  const messageClass = messageTone === "error" ? "status-failed" : "status-done";

  return (
    <section className="card panel integrations-panel">
      <div className="integrations-header">
        <div>
          <h2 style={{ marginTop: 0 }}>{title ?? copy.title}</h2>
          <p>{subtitle ?? copy.subtitle}</p>
          <p className="small">{storageHint ?? copy.storageHint}</p>
          {plan === "free" && visibleSections.includes("llm") ? <div className="upgrade-hint">{copy.advancedLocked}</div> : null}
        </div>
        <div className="integration-status-stack">
          {providerCards.map((item) => (
            <article key={item.id} className="integration-provider-card">
              <div className="library-card-head">
                <strong>{item.title}</strong>
                <span className="badge badge-live">{copy.liveNow}</span>
              </div>
              <p className="small">{item.desc}</p>
              <p className="small mono">
                {item.state}
                {item.mask ? `: ${item.mask}` : ""}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="integration-form-grid">
        {visibleSections.includes("youtube") ? (
          <label className="integration-field">
            <span className="small">{copy.youtubeKey}</span>
            <input
              className="input"
              value={config.youtubeApiKey}
              onChange={(event) => updateField("youtubeApiKey", event.target.value)}
              placeholder="AIza..."
            />
          </label>
        ) : null}

        {visibleSections.includes("llm") ? (
          <>
            <div className="integration-field provider-picker" ref={providerPickerRef}>
              <span className="small">{copy.provider}</span>
              <button
                type="button"
                className={`provider-picker-trigger ${providerMenuOpen ? "provider-picker-trigger-active" : ""}`}
                onClick={() => setProviderMenuOpen((current) => !current)}
                aria-haspopup="dialog"
                aria-expanded={providerMenuOpen}
              >
                <div className="provider-picker-text">
                  <strong>{currentPreset.label}</strong>
                  <span className="small">{copy.providerHint}</span>
                </div>
                <span className="provider-picker-chevron">
                  {providerMenuOpen ? (lang === "zh" ? "收起" : "Close") : (lang === "zh" ? "选择" : "Choose")}
                </span>
              </button>
              {providerMenuOpen ? (
                <div className="provider-picker-popover" role="dialog" aria-label={copy.provider}>
                  {presets.map((preset) => {
                    const active = config.llmProvider === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`provider-option ${active ? "provider-option-active" : ""}`}
                        onClick={() => changeProvider(preset.id)}
                      >
                        <div className="provider-option-head">
                          <strong>{preset.label}</strong>
                          {active ? <span className="badge badge-live">{copy.providerSelected}</span> : null}
                        </div>
                        <p className="small provider-option-note">{preset.note ?? copy.providerDefaultNote}</p>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <label className="integration-field">
              <span className="small">{copy.llmKey}</span>
              <input
                className="input"
                value={config.openaiApiKey}
                onChange={(event) => updateField("openaiApiKey", event.target.value)}
                placeholder="sk-..."
              />
            </label>
            <label className="integration-field">
              <span className="small">{copy.llmBaseUrl}</span>
              <input
                className="input"
                value={config.openaiBaseUrl}
                onChange={(event) => updateField("openaiBaseUrl", event.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </label>
            <label className="integration-field">
              <span className="small">{copy.analysisModel}</span>
              <input
                className="input"
                value={config.analysisModel}
                onChange={(event) => updateField("analysisModel", event.target.value)}
                placeholder="gpt-4o-mini"
              />
            </label>
            <label className="integration-field">
              <span className="small">{copy.scoreModel}</span>
              <input
                className="input"
                value={config.scoreModel}
                onChange={(event) => updateField("scoreModel", event.target.value)}
                placeholder="gpt-4o"
              />
            </label>
            <label className="integration-field integration-field-wide">
              <span className="small">
                {copy.embeddingModel} ({copy.optional})
              </span>
              <input
                className="input"
                value={config.embeddingModel}
                onChange={(event) => updateField("embeddingModel", event.target.value)}
                placeholder="text-embedding-3-small"
              />
            </label>
          </>
        ) : null}

        {visibleSections.includes("pinecone") ? (
          <>
            <label className="integration-field">
              <span className="small">
                {copy.pineconeKey} ({copy.optional})
              </span>
              <input
                className="input"
                value={config.pineconeApiKey}
                onChange={(event) => updateField("pineconeApiKey", event.target.value)}
                placeholder="pcsk_..."
              />
            </label>
            <label className="integration-field">
              <span className="small">
                {copy.pineconeHost} ({copy.optional})
              </span>
              <input
                className="input"
                value={config.pineconeIndexHost}
                onChange={(event) => updateField("pineconeIndexHost", event.target.value)}
                placeholder="example.svc.aped-...pinecone.io"
              />
            </label>
            <label className="integration-field">
              <span className="small">
                {copy.pineconeName} ({copy.optional})
              </span>
              <input
                className="input"
                value={config.pineconeIndexName}
                onChange={(event) => updateField("pineconeIndexName", event.target.value)}
                placeholder="viralbrain-library"
              />
            </label>
            <label className="integration-field">
              <span className="small">
                {copy.pineconeNamespace} ({copy.optional})
              </span>
              <input
                className="input"
                value={config.pineconeNamespace}
                onChange={(event) => updateField("pineconeNamespace", event.target.value)}
                placeholder="viral-library"
              />
            </label>
          </>
        ) : null}
      </div>

      {visibleSections.includes("llm") && currentPreset.note ? (
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
          {visibleSections.length === DEFAULT_SECTIONS.length ? copy.clear : copy.clearVisible}
        </button>
      </div>

      {message ? (
        <p className={`${messageClass} small`} style={{ marginTop: 14 }}>
          {message}
        </p>
      ) : null}

      {Object.keys(results).length > 0 ? (
        <div className="integration-status-stack">
          {Object.entries(results).map(([key, result]) => (
            <article
              key={key}
              className={`integration-provider-card ${result.ok ? "integration-result-success" : "integration-result-failed"}`}
            >
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

      <p className="small" style={{ marginTop: 8 }}>
        {activeNotice ?? copy.activeNotice}
      </p>
    </section>
  );
}
