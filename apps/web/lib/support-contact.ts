export const SUPPORT_EMAIL = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@viralbrain.ai").trim() || "support@viralbrain.ai";

export function buildSupportMailto(subject?: string): string {
  const resolvedSubject = (subject ?? "ViralBrain.ai Support").trim() || "ViralBrain.ai Support";
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(resolvedSubject)}`;
}
