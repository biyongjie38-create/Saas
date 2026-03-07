import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import {
  getApiAuthUser,
  resolveAuthenticatedAppUser,
  unauthorizedJsonResponse
} from "@/lib/auth";
import { activateMembershipPlan } from "@/lib/membership-store";
import { maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const schema = z.object({
  plan: z.enum(["pro"]).default("pro"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly")
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
        message: "Invalid membership checkout payload."
      },
      requestId,
      422
    );
  }

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const currentUser = await resolveAuthenticatedAppUser(authUser, { supabaseClient });

  if (currentUser.plan === "pro" && currentUser.subscriptionStatus === "active") {
    return okJsonResponse(
      {
        user: currentUser,
        order: null,
        message: "Membership is already active."
      },
      requestId
    );
  }

  try {
    const result = await activateMembershipPlan(
      {
        userId: authUser.id,
        email: authUser.email ?? currentUser.email,
        plan: parsed.data.plan,
        billingCycle: parsed.data.billingCycle
      },
      { supabaseClient }
    );

    return okJsonResponse(
      {
        user: result.user,
        order: result.order,
        message: "Membership activated."
      },
      requestId,
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Membership checkout failed.";
    if (message.includes("SUPABASE_MEMBERSHIP_SCHEMA_MISSING")) {
      return errorJsonResponse(
        {
          code: "MEMBERSHIP_SCHEMA_MISSING",
          message: "Run the latest Supabase schema.sql before enabling membership checkout."
        },
        requestId,
        503
      );
    }
    throw error;
  }
});

