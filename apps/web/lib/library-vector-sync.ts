import {
  buildApiIntegrationHeaders,
  createEmptyApiIntegrationConfig,
  type ApiIntegrationConfig
} from "@/lib/api-integrations";
import type { ViralLibraryItem } from "@/lib/types";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";

type SyncResult = {
  ok: boolean;
  message: string;
  detail?: string;
};

function resolveConfig(config?: ApiIntegrationConfig): ApiIntegrationConfig {
  return config ?? createEmptyApiIntegrationConfig();
}

export async function syncLibraryVectors(
  items: ViralLibraryItem[],
  providerConfig?: ApiIntegrationConfig
): Promise<SyncResult> {
  if (!items.length) {
    return { ok: true, message: "No vector updates were needed." };
  }

  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/rag/index`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildApiIntegrationHeaders(resolveConfig(providerConfig))
      },
      body: JSON.stringify({
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          source_url: item.sourceUrl,
          tags: {
            hook_type: item.tags.hookType,
            topic: item.tags.topic,
            duration_bucket: item.tags.durationBucket
          }
        }))
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        message: "Vector sync skipped because the embedding service is unavailable.",
        detail
      };
    }

    const payload = (await response.json()) as {
      upserted?: number;
      namespace?: string;
      model?: string;
    };

    return {
      ok: true,
      message: `Synced ${payload.upserted ?? items.length} vectors.`,
      detail: [payload.namespace, payload.model].filter(Boolean).join(" · ")
    };
  } catch (error) {
    return {
      ok: false,
      message: "Vector sync skipped because the embedding service could not be reached.",
      detail: error instanceof Error ? error.message : undefined
    };
  }
}

export async function deleteLibraryVectors(
  ids: string[],
  providerConfig?: ApiIntegrationConfig
): Promise<SyncResult> {
  const resolvedIds = ids.filter(Boolean);
  if (!resolvedIds.length) {
    return { ok: true, message: "No vector deletions were needed." };
  }

  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/rag/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildApiIntegrationHeaders(resolveConfig(providerConfig))
      },
      body: JSON.stringify({ ids: resolvedIds }),
      cache: "no-store"
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        message: "Vector deletion skipped because the embedding service is unavailable.",
        detail
      };
    }

    const payload = (await response.json()) as {
      deleted?: number;
      namespace?: string;
      provider?: string;
    };

    return {
      ok: true,
      message: `Deleted ${payload.deleted ?? resolvedIds.length} vectors.`,
      detail: [payload.namespace, payload.provider].filter(Boolean).join(" · ")
    };
  } catch (error) {
    return {
      ok: false,
      message: "Vector deletion skipped because the embedding service could not be reached.",
      detail: error instanceof Error ? error.message : undefined
    };
  }
}
