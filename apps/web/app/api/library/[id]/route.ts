import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { getApiAuthUser, unauthorizedJsonResponse } from "@/lib/auth";
import { deleteLibraryItem } from "@/lib/report-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const paramsSchema = z.object({
  id: z.string().min(1)
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
