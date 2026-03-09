import { ApiRouteError } from "@/lib/api-response";
import { getPlanFeatures } from "@/lib/plan-features";
import type { ApiIntegrationConfig } from "@/lib/api-integrations";
import type { UserPlan } from "@/lib/types";

export function assertPlanFeature(plan: UserPlan, feature: keyof ReturnType<typeof getPlanFeatures>, message: string) {
  const features = getPlanFeatures(plan);
  if (!features[feature]) {
    throw new ApiRouteError({
      code: "PLAN_FEATURE_LOCKED",
      message,
      status: 403,
      details: {
        plan,
        feature
      }
    });
  }
}

export function assertPlanAllowsProvider(plan: UserPlan, config?: ApiIntegrationConfig) {
  void plan;
  void config;
}

