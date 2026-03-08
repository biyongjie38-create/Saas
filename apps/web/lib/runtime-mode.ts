export type AppRuntimeMode = "preview" | "production";

function normalizeRuntimeMode(value: string | undefined): AppRuntimeMode {
  return value?.trim().toLowerCase() === "production" ? "production" : "preview";
}

export function getAppRuntimeMode(): AppRuntimeMode {
  return normalizeRuntimeMode(process.env.NEXT_PUBLIC_APP_RUNTIME_MODE ?? process.env.APP_RUNTIME_MODE);
}

export function isProductionRuntimeMode(): boolean {
  return getAppRuntimeMode() === "production";
}

export function allowPreviewFallbacks(): boolean {
  return !isProductionRuntimeMode();
}

