"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n-shared";
import type { UserPlan } from "@/lib/types";
import { MembershipUpgradeModal } from "@/components/membership-upgrade-modal";

type Props = {
  lang: Lang;
  plan: UserPlan;
  label: string;
  className?: string;
  title?: string;
  subtitle?: string;
};

export function MembershipModalTrigger({ lang, plan, label, className, title, subtitle }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className ?? "btn btn-primary"} onClick={() => setOpen(true)}>
        {label}
      </button>
      <MembershipUpgradeModal open={open} onClose={() => setOpen(false)} lang={lang} plan={plan} title={title} subtitle={subtitle} />
    </>
  );
}
