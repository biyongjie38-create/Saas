import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import {
  getApiAuthUser,
  resolveAuthenticatedAppUser,
  unauthorizedJsonResponse
} from "@/lib/auth";
import { assertPlanFeature } from "@/lib/plan-access";
import {
  deleteLibraryItem,
  purgeLibraryItem,
  restoreLibraryItem
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

export const DELETE = withApiRoute<Params>(async (_request, { requestId }, context) => {
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

  return okJsonResponse(
    {
      deleted: true,
      id: parsedParams.data.id
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
  const user = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  assertPlanFeature(user.plan, "canManageRecycleBin", "Upgrade to Pro to manage the recycle bin.");

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

  return okJsonResponse(
    {
      id: parsedParams.data.id,
      action: parsedAction.data.action,
      success: true
    },
    requestId
  );
});

