export const DEFAULT_SUPPORT_EMAIL = "b2762925420@163.com";

export function buildSupportMailtoForEmail(email: string, subject?: string): string {
  const resolvedEmail = email.trim() || DEFAULT_SUPPORT_EMAIL;
  const resolvedSubject = (subject ?? "ViralBrain.ai Support").trim() || "ViralBrain.ai Support";
  return `mailto:${resolvedEmail}?subject=${encodeURIComponent(resolvedSubject)}`;
}
