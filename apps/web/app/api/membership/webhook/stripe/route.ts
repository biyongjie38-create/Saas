import Stripe from "stripe";
import {
  completeMembershipOrder,
  markMembershipOrderByProviderSession,
  syncMembershipSubscriptionState,
  updateMembershipOrder
} from "@/lib/membership-store";
import { useSupabaseBackend } from "@/lib/supabase";
import { maybeCreateAdminSupabaseClient } from "@/lib/supabase-server";
import {
  extractStripeCurrentPeriodEnd,
  extractStripeId,
  getCheckoutMetadata,
  getStripeClient,
  getStripeWebhookSecret,
  getSubscriptionMetadata,
  isStripeConfigured,
  mapStripeSubscriptionStatus,
  resolveBillingCycleFromStripeSubscription
} from "@/lib/stripe";

export const runtime = "nodejs";

async function resolveWebhookSubscription(stripe: Stripe, value: string | Stripe.Subscription | null) {
  if (!value) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  return stripe.subscriptions.retrieve(value);
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return new Response("Stripe billing is not configured.", { status: 503 });
  }

  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return new Response("STRIPE_WEBHOOK_SECRET is missing.", { status: 503 });
  }

  const adminSupabaseClient = maybeCreateAdminSupabaseClient();
  if (useSupabaseBackend() && !adminSupabaseClient) {
    return new Response("Supabase admin client is required for Stripe webhooks.", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header.", { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe signature.";
    return new Response(message, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = getCheckoutMetadata(session);

        if (!metadata.orderId || !metadata.userId || !metadata.plan || !metadata.billingCycle) {
          break;
        }

        const subscription = await resolveWebhookSubscription(stripe, session.subscription);
        if (session.payment_status === "paid") {
          await completeMembershipOrder(
            {
              orderId: metadata.orderId,
              userId: metadata.userId,
              email: session.customer_details?.email ?? "unknown@viralbrain.ai",
              plan: metadata.plan,
              billingCycle: metadata.billingCycle,
              paymentProvider: "stripe_checkout",
              providerSessionId: session.id,
              providerCustomerId: extractStripeId(session.customer),
              providerSubscriptionId: extractStripeId(session.subscription),
              providerPaymentIntentId: extractStripeId(session.payment_intent),
              paidAt: typeof session.created === "number" ? new Date(session.created * 1000).toISOString() : new Date().toISOString(),
              planExpiresAt: subscription ? extractStripeCurrentPeriodEnd(subscription) : null
            },
            { supabaseClient: adminSupabaseClient }
          );
        } else {
          await updateMembershipOrder(
            {
              orderId: metadata.orderId,
              providerSessionId: session.id,
              providerCustomerId: extractStripeId(session.customer),
              providerSubscriptionId: extractStripeId(session.subscription),
              providerPaymentIntentId: extractStripeId(session.payment_intent)
            },
            { supabaseClient: adminSupabaseClient }
          );
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await markMembershipOrderByProviderSession(
          session.id,
          "failed",
          "Stripe reported an asynchronous payment failure.",
          { supabaseClient: adminSupabaseClient }
        );
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await markMembershipOrderByProviderSession(
          session.id,
          "canceled",
          "Stripe checkout session expired.",
          { supabaseClient: adminSupabaseClient }
        );
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const metadata = getSubscriptionMetadata(subscription);
        await syncMembershipSubscriptionState(
          {
            orderId: metadata.orderId,
            providerSubscriptionId: subscription.id,
            providerCustomerId: extractStripeId(subscription.customer),
            userId: metadata.userId,
            plan: metadata.plan ?? "pro",
            billingCycle: metadata.billingCycle ?? resolveBillingCycleFromStripeSubscription(subscription),
            subscriptionStatus: mapStripeSubscriptionStatus(subscription.status),
            planStartedAt: typeof subscription.start_date === "number" ? new Date(subscription.start_date * 1000).toISOString() : null,
            planExpiresAt: extractStripeCurrentPeriodEnd(subscription)
          },
          { supabaseClient: adminSupabaseClient }
        );
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    });
  } catch (error) {
    console.error("[stripe-webhook] handler failed", error);
    return new Response("Stripe webhook handler failed.", { status: 500 });
  }
}
