import { z } from "zod";
import { errorJsonResponse, okJsonResponse, withApiRoute } from "@/lib/api-response";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getSupportFromEmail,
  getSupportInboxEmail,
  isTransactionalEmailConfigured,
  sendTransactionalEmail
} from "@/lib/mailer";

export const runtime = "nodejs";

const supportContactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  message: z.string().trim().min(10).max(4000),
  page: z.string().trim().max(300).optional().default("/support")
});

function buildSupportMessage(input: z.infer<typeof supportContactSchema>) {
  return [
    "New ViralBrain support request",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Page: ${input.page}`,
    "",
    "Message:",
    input.message
  ].join("\n");
}

function buildConfirmationMessage(input: z.infer<typeof supportContactSchema>) {
  return [
    `Hi ${input.name},`,
    "",
    "We received your support request for ViralBrain.ai.",
    "Our team will review it and reply as soon as possible.",
    "",
    "Your message:",
    input.message,
    "",
    "If your issue is urgent, reply directly to this email."
  ].join("\n");
}

export const POST = withApiRoute(async (request, { requestId }) => {
  const rateLimitDecision = await enforceRateLimit({
    request,
    requestId,
    namespace: "support-contact",
    maxRequests: 5,
    window: {
      label: "15 m",
      ms: 15 * 60 * 1000
    },
    message: "Too many support requests. Please wait a few minutes before sending another message."
  });

  if (!rateLimitDecision.allowed) {
    return rateLimitDecision.response;
  }

  if (!isTransactionalEmailConfigured()) {
    return errorJsonResponse(
      {
        code: "EMAIL_NOT_CONFIGURED",
        message: "Transactional email is not configured yet. Please use the support email address directly."
      },
      requestId,
      503
    );
  }

  const parsed = supportContactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return errorJsonResponse(
      {
        code: "SCHEMA_INVALID",
        message: "Invalid support form payload."
      },
      requestId,
      422
    );
  }

  const payload = parsed.data;
  const from = getSupportFromEmail();
  const supportInbox = getSupportInboxEmail();

  if (!from) {
    return errorJsonResponse(
      {
        code: "EMAIL_FROM_MISSING",
        message: "SUPPORT_FROM_EMAIL is missing."
      },
      requestId,
      503
    );
  }

  await sendTransactionalEmail({
    from,
    to: supportInbox,
    subject: `[Support] ${payload.name} from ViralBrain.ai`,
    text: buildSupportMessage(payload),
    replyTo: payload.email,
    tags: [
      { name: "category", value: "support" },
      { name: "source", value: "web_form" }
    ]
  });

  let confirmationSent = true;

  try {
    await sendTransactionalEmail({
      from,
      to: payload.email,
      subject: "We received your ViralBrain.ai support request",
      text: buildConfirmationMessage(payload),
      replyTo: supportInbox,
      tags: [
        { name: "category", value: "support_confirmation" },
        { name: "source", value: "web_form" }
      ]
    });
  } catch (error) {
    confirmationSent = false;
    console.error("[support-contact] confirmation email failed", error);
  }

  return okJsonResponse(
    {
      message: confirmationSent ? "Support request sent." : "Support request sent, but confirmation email failed.",
      confirmation_sent: confirmationSent
    },
    requestId
  );
});
