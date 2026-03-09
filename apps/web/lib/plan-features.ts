import type { UserPlan } from "@/lib/types";

export type PlanFeatures = {
  canUseAdvancedProviders: boolean;
  canUseBenchmarkRetrieval: boolean;
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
    canUseAdvancedProviders: true,
    canUseBenchmarkRetrieval: false,
    canUseShareLinks: false,
    canRerunReports: false,
    canManageRecycleBin: false,
    canCollectVirals: true,
    canExportReports: false,
    canViewTrendDetails: false,
    maxCollectionResults: 5,
  },
  pro: {
    canUseAdvancedProviders: true,
    canUseBenchmarkRetrieval: true,
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
