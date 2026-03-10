import "server-only";

import { buildSupportMailtoForEmail, DEFAULT_SUPPORT_EMAIL } from "@/lib/support-contact";

export function getPublicSupportEmail(): string {
  return (process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "").trim() || DEFAULT_SUPPORT_EMAIL;
}

export function buildPublicSupportMailto(subject?: string): string {
  return buildSupportMailtoForEmail(getPublicSupportEmail(), subject);
}
