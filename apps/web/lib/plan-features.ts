import type { UserPlan } from "@/lib/types";

export type PlanFeatures = {
  canUseAdvancedProviders: boolean;
  canUseShareLinks: boolean;
  canRerunReports: boolean;
  canManageRecycleBin: boolean;
  canCollectVirals: boolean;
  canExportReports: boolean;
  canViewTrendDetails: boolean;
  maxCollectionResults: number;
};

const FEATURES: Record<UserPlan, PlanFeatures> = {
  free: {
    canUseAdvancedProviders: false,
    canUseShareLinks: false,
    canRerunReports: false,
    canManageRecycleBin: false,
    canCollectVirals: true,
    canExportReports: false,
    canViewTrendDetails: false,
    maxCollectionResults: 10,
  },
  pro: {
    canUseAdvancedProviders: true,
    canUseShareLinks: true,
    canRerunReports: true,
    canManageRecycleBin: true,
    canCollectVirals: true,
    canExportReports: true,
    canViewTrendDetails: true,
    maxCollectionResults: 30,
  },
};

export function getPlanFeatures(plan: UserPlan): PlanFeatures {
  return FEATURES[plan] ?? FEATURES.free;
}
