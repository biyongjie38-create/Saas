export type ApiIntegrationConfig = {
  youtubeApiKey: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  pineconeApiKey: string;
  pineconeIndexHost: string;
  pineconeIndexName: string;
  pineconeNamespace: string;
};

export const API_INTEGRATION_STORAGE_KEY = "vb_api_integrations_v1";

export const API_INTEGRATION_HEADERS = {
  youtubeApiKey: "x-vb-youtube-api-key",
  openaiApiKey: "x-vb-openai-api-key",
  openaiBaseUrl: "x-vb-openai-base-url",
  pineconeApiKey: "x-vb-pinecone-api-key",
  pineconeIndexHost: "x-vb-pinecone-index-host",
  pineconeIndexName: "x-vb-pinecone-index-name",
  pineconeNamespace: "x-vb-pinecone-namespace"
} as const;

export function createEmptyApiIntegrationConfig(): ApiIntegrationConfig {
  return {
    youtubeApiKey: "",
    openaiApiKey: "",
    openaiBaseUrl: "",
    pineconeApiKey: "",
    pineconeIndexHost: "",
    pineconeIndexName: "",
    pineconeNamespace: "viral-library"
  };
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeApiIntegrationConfig(input: unknown): ApiIntegrationConfig {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const fallback = createEmptyApiIntegrationConfig();

  return {
    youtubeApiKey: normalizeString(source.youtubeApiKey) || fallback.youtubeApiKey,
    openaiApiKey: normalizeString(source.openaiApiKey) || fallback.openaiApiKey,
    openaiBaseUrl: normalizeString(source.openaiBaseUrl) || fallback.openaiBaseUrl,
    pineconeApiKey: normalizeString(source.pineconeApiKey) || fallback.pineconeApiKey,
    pineconeIndexHost: normalizeString(source.pineconeIndexHost) || fallback.pineconeIndexHost,
    pineconeIndexName: normalizeString(source.pineconeIndexName) || fallback.pineconeIndexName,
    pineconeNamespace: normalizeString(source.pineconeNamespace) || fallback.pineconeNamespace
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
  if (normalized.openaiApiKey) {
    headers[API_INTEGRATION_HEADERS.openaiApiKey] = normalized.openaiApiKey;
  }
  if (normalized.openaiBaseUrl) {
    headers[API_INTEGRATION_HEADERS.openaiBaseUrl] = normalized.openaiBaseUrl;
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
    openaiApiKey: headers.get(API_INTEGRATION_HEADERS.openaiApiKey),
    openaiBaseUrl: headers.get(API_INTEGRATION_HEADERS.openaiBaseUrl),
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
