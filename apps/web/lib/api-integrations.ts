import type { ApiLlmProvider } from "@/lib/types";

export type ApiIntegrationConfig = {
  youtubeApiKey: string;
  llmProvider: ApiLlmProvider;
  openaiApiKey: string;
  openaiBaseUrl: string;
  analysisModel: string;
  scoreModel: string;
  embeddingModel: string;
  pineconeApiKey: string;
  pineconeIndexHost: string;
  pineconeIndexName: string;
  pineconeNamespace: string;
};

export type ProviderPreset = {
  id: ApiLlmProvider;
  label: string;
  baseUrl: string;
  analysisModel: string;
  scoreModel: string;
  embeddingModel: string;
  requiresCustomBaseUrl?: boolean;
  note?: string;
};

export const API_INTEGRATION_STORAGE_KEY = "vb_api_integrations_v2";

export const API_INTEGRATION_HEADERS = {
  youtubeApiKey: "x-vb-youtube-api-key",
  llmProvider: "x-vb-llm-provider",
  openaiApiKey: "x-vb-openai-api-key",
  openaiBaseUrl: "x-vb-openai-base-url",
  analysisModel: "x-vb-analysis-model",
  scoreModel: "x-vb-score-model",
  embeddingModel: "x-vb-embedding-model",
  pineconeApiKey: "x-vb-pinecone-api-key",
  pineconeIndexHost: "x-vb-pinecone-index-host",
  pineconeIndexName: "x-vb-pinecone-index-name",
  pineconeNamespace: "x-vb-pinecone-namespace"
} as const;

const PROVIDER_PRESETS: Record<ApiLlmProvider, ProviderPreset> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    analysisModel: "gpt-4o-mini",
    scoreModel: "gpt-4o",
    embeddingModel: "text-embedding-3-small"
  },
  bailian: {
    id: "bailian",
    label: "阿里云百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    analysisModel: "qwen-plus",
    scoreModel: "qwen-plus",
    embeddingModel: "text-embedding-v4",
    note: "使用阿里云百炼 OpenAI 兼容模式。"
  },
  yunwu: {
    id: "yunwu",
    label: "云雾 / 兼容 OpenAI",
    baseUrl: "",
    analysisModel: "",
    scoreModel: "",
    embeddingModel: "",
    requiresCustomBaseUrl: true,
    note: "请填写云雾实际兼容地址与模型名。"
  },
  custom: {
    id: "custom",
    label: "自定义兼容接口",
    baseUrl: "",
    analysisModel: "",
    scoreModel: "",
    embeddingModel: "",
    requiresCustomBaseUrl: true,
    note: "适用于任何 OpenAI 兼容接口。"
  }
};

export function getProviderPreset(provider: ApiLlmProvider): ProviderPreset {
  return PROVIDER_PRESETS[provider] ?? PROVIDER_PRESETS.openai;
}

export function listProviderPresets(): ProviderPreset[] {
  return Object.values(PROVIDER_PRESETS);
}

export function createEmptyApiIntegrationConfig(): ApiIntegrationConfig {
  return {
    youtubeApiKey: "",
    llmProvider: "openai",
    openaiApiKey: "",
    openaiBaseUrl: "",
    analysisModel: "",
    scoreModel: "",
    embeddingModel: "",
    pineconeApiKey: "",
    pineconeIndexHost: "",
    pineconeIndexName: "",
    pineconeNamespace: "viral-library"
  };
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeProvider(value: unknown): ApiLlmProvider {
  return value === "bailian" || value === "yunwu" || value === "custom" ? value : "openai";
}

export function applyProviderPreset(
  config: ApiIntegrationConfig,
  provider: ApiLlmProvider,
  options?: { preserveSecrets?: boolean }
): ApiIntegrationConfig {
  const preset = getProviderPreset(provider);
  return {
    ...config,
    llmProvider: provider,
    openaiBaseUrl: preset.baseUrl,
    analysisModel: preset.analysisModel,
    scoreModel: preset.scoreModel,
    embeddingModel: preset.embeddingModel,
    openaiApiKey: options?.preserveSecrets ? config.openaiApiKey : ""
  };
}

export function normalizeApiIntegrationConfig(input: unknown): ApiIntegrationConfig {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const provider = normalizeProvider(source.llmProvider);
  const preset = getProviderPreset(provider);

  return {
    youtubeApiKey: normalizeString(source.youtubeApiKey),
    llmProvider: provider,
    openaiApiKey: normalizeString(source.openaiApiKey),
    openaiBaseUrl: normalizeString(source.openaiBaseUrl) || preset.baseUrl,
    analysisModel: normalizeString(source.analysisModel) || preset.analysisModel,
    scoreModel: normalizeString(source.scoreModel) || preset.scoreModel,
    embeddingModel: normalizeString(source.embeddingModel) || preset.embeddingModel,
    pineconeApiKey: normalizeString(source.pineconeApiKey),
    pineconeIndexHost: normalizeString(source.pineconeIndexHost),
    pineconeIndexName: normalizeString(source.pineconeIndexName),
    pineconeNamespace: normalizeString(source.pineconeNamespace) || "viral-library"
  };
}

export function readApiIntegrationConfigFromStorage(): ApiIntegrationConfig {
  if (typeof window === "undefined") {
    return createEmptyApiIntegrationConfig();
  }

  try {
    const raw = window.localStorage.getItem(API_INTEGRATION_STORAGE_KEY);
    if (!raw) {
      return createEmptyApiIntegrationConfig();
    }

    return normalizeApiIntegrationConfig(JSON.parse(raw));
  } catch {
    return createEmptyApiIntegrationConfig();
  }
}

export function persistApiIntegrationConfig(config: ApiIntegrationConfig) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(API_INTEGRATION_STORAGE_KEY, JSON.stringify(normalizeApiIntegrationConfig(config)));
}

export function clearApiIntegrationConfig() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(API_INTEGRATION_STORAGE_KEY);
}

export function buildApiIntegrationHeaders(config: ApiIntegrationConfig): Record<string, string> {
  const normalized = normalizeApiIntegrationConfig(config);
  const headers: Record<string, string> = {};

  if (normalized.youtubeApiKey) {
    headers[API_INTEGRATION_HEADERS.youtubeApiKey] = normalized.youtubeApiKey;
  }
  if (normalized.llmProvider) {
    headers[API_INTEGRATION_HEADERS.llmProvider] = normalized.llmProvider;
  }
  if (normalized.openaiApiKey) {
    headers[API_INTEGRATION_HEADERS.openaiApiKey] = normalized.openaiApiKey;
  }
  if (normalized.openaiBaseUrl) {
    headers[API_INTEGRATION_HEADERS.openaiBaseUrl] = normalized.openaiBaseUrl;
  }
  if (normalized.analysisModel) {
    headers[API_INTEGRATION_HEADERS.analysisModel] = normalized.analysisModel;
  }
  if (normalized.scoreModel) {
    headers[API_INTEGRATION_HEADERS.scoreModel] = normalized.scoreModel;
  }
  if (normalized.embeddingModel) {
    headers[API_INTEGRATION_HEADERS.embeddingModel] = normalized.embeddingModel;
  }
  if (normalized.pineconeApiKey) {
    headers[API_INTEGRATION_HEADERS.pineconeApiKey] = normalized.pineconeApiKey;
  }
  if (normalized.pineconeIndexHost) {
    headers[API_INTEGRATION_HEADERS.pineconeIndexHost] = normalized.pineconeIndexHost;
  }
  if (normalized.pineconeIndexName) {
    headers[API_INTEGRATION_HEADERS.pineconeIndexName] = normalized.pineconeIndexName;
  }
  if (normalized.pineconeNamespace) {
    headers[API_INTEGRATION_HEADERS.pineconeNamespace] = normalized.pineconeNamespace;
  }

  return headers;
}

export function readApiIntegrationConfigFromHeaders(headers: Headers): ApiIntegrationConfig {
  return normalizeApiIntegrationConfig({
    youtubeApiKey: headers.get(API_INTEGRATION_HEADERS.youtubeApiKey),
    llmProvider: headers.get(API_INTEGRATION_HEADERS.llmProvider),
    openaiApiKey: headers.get(API_INTEGRATION_HEADERS.openaiApiKey),
    openaiBaseUrl: headers.get(API_INTEGRATION_HEADERS.openaiBaseUrl),
    analysisModel: headers.get(API_INTEGRATION_HEADERS.analysisModel),
    scoreModel: headers.get(API_INTEGRATION_HEADERS.scoreModel),
    embeddingModel: headers.get(API_INTEGRATION_HEADERS.embeddingModel),
    pineconeApiKey: headers.get(API_INTEGRATION_HEADERS.pineconeApiKey),
    pineconeIndexHost: headers.get(API_INTEGRATION_HEADERS.pineconeIndexHost),
    pineconeIndexName: headers.get(API_INTEGRATION_HEADERS.pineconeIndexName),
    pineconeNamespace: headers.get(API_INTEGRATION_HEADERS.pineconeNamespace)
  });
}

export function maskSecret(value: string): string {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }

  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

export function hasConnectedKeys(config: ApiIntegrationConfig): boolean {
  const normalized = normalizeApiIntegrationConfig(config);
  return Boolean(normalized.youtubeApiKey || normalized.openaiApiKey || normalized.pineconeApiKey);
}

