type SendEmailInput = {
  from: string;
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
};

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function isTransactionalEmailConfigured() {
  return Boolean(readEnv("RESEND_API_KEY") && readEnv("SUPPORT_FROM_EMAIL"));
}

export function getSupportInboxEmail() {
  return readEnv("SUPPORT_TO_EMAIL") || readEnv("NEXT_PUBLIC_SUPPORT_EMAIL") || "support@viralbrain.ai";
}

export function getSupportFromEmail() {
  return readEnv("SUPPORT_FROM_EMAIL");
}

export async function sendTransactionalEmail(input: SendEmailInput) {
  const apiKey = readEnv("RESEND_API_KEY");
  if (!apiKey) {
    throw new Error("RESEND_API_KEY_MISSING");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: input.from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      reply_to: input.replyTo,
      tags: input.tags
    })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {
          message?: string;
          error?: string;
          name?: string;
        }
      | null;

    throw new Error(payload?.message || payload?.error || payload?.name || `RESEND_REQUEST_FAILED_${response.status}`);
  }

  return (await response.json().catch(() => null)) as { id?: string } | null;
}
