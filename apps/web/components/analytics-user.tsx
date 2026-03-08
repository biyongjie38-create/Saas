"use client";

import { useEffect } from "react";
import { identifyAnalyticsUser, type AnalyticsUser as AnalyticsIdentity } from "@/lib/analytics";

type Props = {
  user: AnalyticsIdentity | null;
};

export function AnalyticsUser({ user }: Props) {
  useEffect(() => {
    identifyAnalyticsUser(user);
  }, [user]);

  return null;
}
