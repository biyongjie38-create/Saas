import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { readApiIntegrationConfigFromHeaders } from "@/lib/api-integrations";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import { deleteLibraryVectors, syncLibraryVectors } from "@/lib/library-vector-sync";
import {
  deleteLibraryItem,
  getLibraryItemById,
  purgeLibraryItem,
  restoreLibraryItem,
  updateLibraryItemFolder
} from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const paramsSchema = z.object({
  id: z.string().min(1)
});

const actionSchema = z.object({
  action: z.enum(["restore", "purge"])
});

const patchSchema = z.object({
  folder: z.string().trim().max(60).nullable()
});

export const DELETE = withApiRoute<Params>(async (request, { requestId }, context) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid library item id."
      },
      requestId,
      422
    );
  }

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const existing = await getLibraryItemById(parsedParams.data.id, { supabaseClient });
  const deleted = await deleteLibraryItem(parsedParams.data.id, { supabaseClient });

  if (!deleted) {
    return errorJsonResponse(
      {
        code: "LIBRARY_ITEM_NOT_FOUND",
        message: "Library item not found."
      },
      requestId,
      404
    );
  }

  const providerConfig = readApiIntegrationConfigFromHeaders(request.headers);
  const vectorSync = existing
    ? await deleteLibraryVectors([existing.id], providerConfig)
    : { ok: true, message: "No vector deletion was needed." };

  return okJsonResponse(
    {
      deleted: true,
      id: parsedParams.data.id,
      vector_sync: vectorSync
    },
    requestId
  );
});

export const POST = withApiRoute<Params>(async (request, { requestId }, context) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid library item id."
      },
      requestId,
      422
    );
  }

  const parsedAction = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsedAction.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid library action."
      },
      requestId,
      422
    );
  }

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const providerConfig = readApiIntegrationConfigFromHeaders(request.headers);
  const existing = await getLibraryItemById(parsedParams.data.id, { supabaseClient });

  const success = parsedAction.data.action === "restore"
    ? await restoreLibraryItem(parsedParams.data.id, { supabaseClient })
    : await purgeLibraryItem(parsedParams.data.id, { supabaseClient });

  if (!success) {
    return errorJsonResponse(
      {
        code: "LIBRARY_ITEM_NOT_FOUND",
        message: "Library item not found."
      },
      requestId,
      404
    );
  }

  const restoredItem = parsedAction.data.action === "restore"
    ? await getLibraryItemById(parsedParams.data.id, { supabaseClient })
    : null;
  const vectorSync = parsedAction.data.action === "restore"
    ? await syncLibraryVectors(restoredItem ? [restoredItem] : [], providerConfig)
    : await deleteLibraryVectors(existing ? [existing.id] : [], providerConfig);

  return okJsonResponse(
    {
      id: parsedParams.data.id,
      action: parsedAction.data.action,
      success: true,
      vector_sync: vectorSync
    },
    requestId
  );
});

export const PATCH = withApiRoute<Params>(async (request, { requestId }, context) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid library item id."
      },
      requestId,
      422
    );
  }

  const parsedBody = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid library update payload."
      },
      requestId,
      422
    );
  }

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const updated = await updateLibraryItemFolder(parsedParams.data.id, parsedBody.data.folder, {
    supabaseClient
  });

  if (!updated) {
    return errorJsonResponse(
      {
        code: "LIBRARY_ITEM_NOT_FOUND",
        message: "Library item not found."
      },
      requestId,
      404
    );
  }

  return okJsonResponse(
    {
      item: updated
    },
    requestId
  );
});
