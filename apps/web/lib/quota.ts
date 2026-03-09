import type { User } from "@/lib/types";

export const FREE_DAILY_LIMIT = 3;
export const PRO_DAILY_LIMIT = 50;

export type UsageLimitDetails = {
  plan: User["plan"];
  used_today: number;
  limit_per_day: number;
};

export class UsageLimitExceededError extends Error {
  code = "USAGE_LIMIT_EXCEEDED" as const;
  details: UsageLimitDetails;

  constructor(details: UsageLimitDetails) {
    super("Daily usage limit reached for your plan.");
    this.name = "UsageLimitExceededError";
    this.details = details;
  }
}

export function getDailyLimitByPlan(plan: User["plan"]): number {
  return plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
}

export function toUsageLimitDetails(plan: User["plan"], usedToday: number): UsageLimitDetails {
  return {
    plan,
    used_today: usedToday,
    limit_per_day: getDailyLimitByPlan(plan)
  };
}

export function assertUsageWithinLimit(plan: User["plan"], usedToday: number) {
  const details = toUsageLimitDetails(plan, usedToday);
  if (usedToday >= details.limit_per_day) {
    throw new UsageLimitExceededError(details);
  }
}
