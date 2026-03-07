import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import {
  getApiAuthUser,
  resolveAuthenticatedAppUser,
  unauthorizedJsonResponse
} from "@/lib/auth";
import { buildMembershipReturnUrls, buildStripeCheckoutLineItem, getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { createMembershipOrder, updateMembershipOrder } from "@/lib/membership-store";
import { maybeCreateAdminSupabaseClient, maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const schema = z.object({
  plan: z.enum(["pro"]).default("pro"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  nextPath: z.string().optional()
});

export const POST = withApiRoute(async (request, { requestId }) => {
  const authUser = await getApiAuthUser();
  if (!authUser) {
    return unauthorizedJsonResponse(requestId);
  }

  if (!isStripeConfigured()) {
    return errorJsonResponse(
      {
        code: "STRIPE_NOT_CONFIGURED",
        message: "Stripe billing is not configured on the server yet."
      },
      requestId,
      503
    );
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
  const billingSupabaseClient = maybeCreateAdminSupabaseClient() ?? supabaseClient;
  const currentUser = await resolveAuthenticatedAppUser(authUser, { supabaseClient });

  if (currentUser.plan === "pro" && currentUser.subscriptionStatus === "active") {
    return okJsonResponse(
      {
        user: currentUser,
        order: null,
        checkoutUrl: null,
        message: "Membership is already active."
      },
      requestId
    );
  }

  const order = await createMembershipOrder(
    {
      userId: authUser.id,
      plan: parsed.data.plan,
      billingCycle: parsed.data.billingCycle,
      paymentProvider: "stripe_checkout",
      status: "pending"
    },
    { supabaseClient: billingSupabaseClient }
  );

  const stripe = getStripeClient();
  const { successUrl, cancelUrl, safeNextPath } = buildMembershipReturnUrls(request, parsed.data.nextPath);
  const metadata = {
    order_id: order.id,
    user_id: authUser.id,
    plan: parsed.data.plan,
    billing_cycle: parsed.data.billingCycle,
    next_path: safeNextPath ?? ""
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: authUser.id,
      customer_email: currentUser.email,
      locale: "auto",
      allow_promotion_codes: true,
      line_items: [buildStripeCheckoutLineItem(parsed.data.plan, parsed.data.billingCycle)],
      metadata,
      subscription_data: {
        metadata
      }
    });

    await updateMembershipOrder(
      {
        orderId: order.id,
        providerSessionId: session.id
      },
      { supabaseClient: billingSupabaseClient }
    );

    if (!session.url) {
      return errorJsonResponse(
        {
          code: "STRIPE_CHECKOUT_URL_MISSING",
          message: "Stripe checkout session was created without a redirect URL."
        },
        requestId,
        502
      );
    }

    return okJsonResponse(
      {
        user: currentUser,
        order: {
          ...order,
          providerSessionId: session.id
        },
        checkoutUrl: session.url,
        message: "Stripe checkout session created."
      },
      requestId,
      201
    );
  } catch (error) {
    await updateMembershipOrder(
      {
        orderId: order.id,
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Stripe checkout failed."
      },
      { supabaseClient: billingSupabaseClient }
    );

    throw error;
  }
});
