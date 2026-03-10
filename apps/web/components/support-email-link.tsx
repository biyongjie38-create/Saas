"use client";

import { buildSupportMailtoForEmail } from "@/lib/support-contact";
import { useRuntimeSupportEmail } from "@/lib/use-runtime-support-email";

type Props = {
  className?: string;
  subject?: string;
  label?: string;
  target?: string;
  rel?: string;
  initialEmail?: string;
};

export function SupportEmailLink({ className, subject, label, target, rel, initialEmail }: Props) {
  const supportEmail = useRuntimeSupportEmail(initialEmail);

  return (
    <a className={className} href={buildSupportMailtoForEmail(supportEmail, subject)} target={target} rel={rel}>
      {label ?? supportEmail}
    </a>
  );
}
