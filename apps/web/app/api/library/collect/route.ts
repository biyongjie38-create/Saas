import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import {
  getApiAuthUser,
  resolveAuthenticatedAppUser,
  unauthorizedJsonResponse
} from "@/lib/auth";
import { readApiIntegrationConfigFromHeaders } from "@/lib/api-integrations";
import { syncLibraryVectors } from "@/lib/library-vector-sync";
import { assertPlanFeature } from "@/lib/plan-access";
import { getPlanFeatures } from "@/lib/plan-features";
import { buildLibraryEmbeddingKey, importLibraryItems } from "@/lib/report-store";
import { toUserFacingRuntimeMessage } from "@/lib/runtime-errors";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";
import { collectViralYoutubeItems } from "@/lib/youtube";

export const runtime = "nodejs";

const schema = z.object({
  hoursWithin: z.coerce.number().int().min(1).max(168).default(48),
  minViews: z.coerce.number().int().min(1000).max(100000000).default(100000),
  maxResults: z.coerce.number().int().min(1).max(50).default(10),
  regionCode: z.string().trim().min(2).max(8).optional(),
  autoImport: z.boolean().default(true)
});

export const POST = withApiRoute(async (request, { requestId }) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid collection payload."
      },
      requestId,
      422
    );
  }

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  assertPlanFeature(user.plan, "canCollectVirals", "Your current plan does not support viral collection.");

  const features = getPlanFeatures(user.plan);
  const providerConfig = readApiIntegrationConfigFromHeaders(request.headers);
  const maxResults = Math.min(parsed.data.maxResults, features.maxCollectionResults);

  let collected;
  try {
    collected = await collectViralYoutubeItems({
      supabaseClient,
      apiKeyOverride: providerConfig.youtubeApiKey,
      hoursWithin: parsed.data.hoursWithin,
      minViews: parsed.data.minViews,
      maxResults,
      regionCode: parsed.data.regionCode
    });
  } catch (error) {
    return errorJsonResponse(
      {
        code: "VIRAL_COLLECT_FAILED",
        message: toUserFacingRuntimeMessage(error)
      },
      requestId,
      503
    );
  }

  let libraryItems = null;
  let vectorSync;
  if (parsed.data.autoImport) {
    const importInputs = collected.map((item) => ({
      title: item.title,
      sourceUrl: item.url,
      summary: item.summary,
      tags: item.tags
    }));

    libraryItems = await importLibraryItems(
      importInputs,
      { supabaseClient }
    );

    const importedKeys = new Set(importInputs.map((item) => buildLibraryEmbeddingKey(item)));
    const syncedItems = libraryItems.filter((item) =>
      importedKeys.has(
        buildLibraryEmbeddingKey({
          title: item.title,
          sourceUrl: item.sourceUrl,
          summary: item.summary,
          tags: item.tags
        })
      )
    );
    vectorSync = await syncLibraryVectors(syncedItems, providerConfig);
  }

  return okJsonResponse(
    {
      collected,
      imported_count: parsed.data.autoImport ? collected.length : 0,
      items: libraryItems,
      vector_sync: vectorSync,
      max_results_applied: maxResults
    },
    requestId
  );
});

