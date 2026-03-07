import Stripe from "stripe";
import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import {
  getApiAuthUser,
  resolveAuthenticatedAppUser,
  unauthorizedJsonResponse
} from "@/lib/auth";
import { completeMembershipOrder, getMembershipOrderById } from "@/lib/membership-store";
import {
  extractStripeCurrentPeriodEnd,
  extractStripeId,
  getCheckoutMetadata,
  getStripeClient,
  isStripeConfigured,
  resolveBillingCycleFromStripeSubscription
} from "@/lib/stripe";
import { maybeCreateAdminSupabaseClient, maybeCreateServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const schema = z.object({
  sessionId: z.string().min(1)
});

function resolveExpandedSubscription(value: string | Stripe.Subscription | null): Stripe.Subscription | null {
  if (!value || typeof value === "string") {
    return null;
  }
  return value;
}

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
        message: "Invalid Stripe session confirmation payload."
      },
      requestId,
      422
    );
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId, {
    expand: ["subscription", "payment_intent"]
  });
  const metadata = getCheckoutMetadata(session);

  if (metadata.userId !== authUser.id) {
    return errorJsonResponse(
      {
        code: "STRIPE_SESSION_MISMATCH",
        message: "This checkout session does not belong to the current user."
      },
      requestId,
      403
    );
  }

  if (session.status !== "complete" || session.payment_status !== "paid") {
    return errorJsonResponse(
      {
        code: "STRIPE_SESSION_NOT_PAID",
        message: "Stripe has not marked this checkout session as paid yet."
      },
      requestId,
      409
    );
  }

  if (!metadata.orderId || !metadata.plan || !metadata.billingCycle) {
    return errorJsonResponse(
      {
        code: "STRIPE_METADATA_MISSING",
        message: "Stripe checkout metadata is incomplete."
      },
      requestId,
      422
    );
  }

  const supabaseClient = await maybeCreateServerSupabaseClient();
  const billingSupabaseClient = maybeCreateAdminSupabaseClient() ?? supabaseClient;
  const currentUser = await resolveAuthenticatedAppUser(authUser, { supabaseClient });
  const existingOrder = await getMembershipOrderById(metadata.orderId, { supabaseClient: billingSupabaseClient });

  if (existingOrder?.status === "paid" && currentUser.plan === "pro" && currentUser.subscriptionStatus === "active") {
    return okJsonResponse(
      {
        user: currentUser,
        order: existingOrder,
        message: "Membership is already active."
      },
      requestId
    );
  }

  const subscription = resolveExpandedSubscription(session.subscription);
  const resolvedBillingCycle = metadata.billingCycle ?? (subscription ? resolveBillingCycleFromStripeSubscription(subscription) : null);
  if (!resolvedBillingCycle) {
    return errorJsonResponse(
      {
        code: "STRIPE_BILLING_CYCLE_UNKNOWN",
        message: "Could not resolve the Stripe billing cycle."
      },
      requestId,
      422
    );
  }

  const result = await completeMembershipOrder(
    {
      orderId: metadata.orderId,
      userId: authUser.id,
      email: currentUser.email,
      plan: metadata.plan,
      billingCycle: resolvedBillingCycle,
      paymentProvider: "stripe_checkout",
      providerSessionId: session.id,
      providerCustomerId: extractStripeId(session.customer),
      providerSubscriptionId: extractStripeId(session.subscription),
      providerPaymentIntentId: extractStripeId(session.payment_intent),
      paidAt: typeof session.created === "number" ? new Date(session.created * 1000).toISOString() : new Date().toISOString(),
      planExpiresAt: subscription ? extractStripeCurrentPeriodEnd(subscription) : null
    },
    { supabaseClient: billingSupabaseClient }
  );

  return okJsonResponse(
    {
      user: result.user,
      order: result.order,
      message: "Stripe payment verified."
    },
    requestId
  );
});
