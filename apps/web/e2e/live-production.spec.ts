import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const TEST_USER_ID = "00000000-0000-4000-8000-000000000123";
const TEST_USER_EMAIL = "live-smoke@viralbrain.ai";
const TEST_VIDEO_ID = "dQw4w9WgXcQ";
const TEST_VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const API_INTEGRATION_STORAGE_KEY = "vb_api_integrations_v2";

type ApiIntegrationConfig = {
  youtubeApiKey: string;
  llmProvider: "openai";
  openaiApiKey: string;
  openaiBaseUrl: string;
  analysisModel: string;
  scoreModel: string;
  embeddingModel: string;
  pineconeApiKey: string;
  pineconeIndexHost: string;
  pineconeIndexName: string;
  pineconeNamespace: string;
};

type LivePreflightResult =
  | { ok: true }
  | { ok: false; reason: string };

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const env: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function resolveLiveApiConfig(): ApiIntegrationConfig {
  const webEnv = loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  const aiEnv = loadEnvFile(path.resolve(process.cwd(), "..", "ai-service", ".env"));

  return {
    youtubeApiKey: webEnv.YOUTUBE_API_KEY ?? "",
    llmProvider: "openai",
    openaiApiKey: aiEnv.OPENAI_API_KEY ?? "",
    openaiBaseUrl: aiEnv.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    analysisModel: aiEnv.OPENAI_ANALYSIS_MODEL ?? "gpt-4o-mini",
    scoreModel: aiEnv.OPENAI_SCORE_MODEL ?? aiEnv.OPENAI_ANALYSIS_MODEL ?? "gpt-4o-mini",
    embeddingModel: aiEnv.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    pineconeApiKey: aiEnv.PINECONE_API_KEY ?? "",
    pineconeIndexHost: aiEnv.PINECONE_INDEX_HOST ?? "",
    pineconeIndexName: aiEnv.PINECONE_INDEX_NAME ?? "",
    pineconeNamespace: aiEnv.PINECONE_NAMESPACE ?? "viral-library"
  };
}

function getMissingLivePrerequisites(config: ApiIntegrationConfig): string[] {
  const missing: string[] = [];

  if (!config.youtubeApiKey) {
    missing.push("YOUTUBE_API_KEY");
  }
  if (!config.openaiApiKey) {
    missing.push("OPENAI_API_KEY");
  }
  if (!config.pineconeApiKey) {
    missing.push("PINECONE_API_KEY");
  }
  if (!config.pineconeIndexHost && !config.pineconeIndexName) {
    missing.push("PINECONE_INDEX_HOST or PINECONE_INDEX_NAME");
  }

  return missing;
}

async function probeYoutubeLiveAccess(apiKey: string): Promise<LivePreflightResult> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "id");
  url.searchParams.set("id", TEST_VIDEO_ID);
  url.searchParams.set("key", apiKey);

  try {
    await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(8_000),
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      reason: `Live smoke requires outbound access to YouTube Data API: ${message}`,
    };
  }
}

async function verifyLivePreflight(): Promise<LivePreflightResult> {
  const config = resolveLiveApiConfig();
  const missing = getMissingLivePrerequisites(config);

  if (missing.length > 0) {
    return {
      ok: false,
      reason: `Live smoke prerequisites are missing: ${missing.join(", ")}`,
    };
  }

  return probeYoutubeLiveAccess(config.youtubeApiKey);
}

async function seedLiveApiConfig(page: import("@playwright/test").Page) {
  const config = resolveLiveApiConfig();
  await page.addInitScript(
    ([storageKey, value]) => {
      window.localStorage.setItem(storageKey, value);
    },
    [API_INTEGRATION_STORAGE_KEY, JSON.stringify(config)] as const
  );
}

async function loginWithBypass(page: import("@playwright/test").Page, href: string) {
  await page.goto("/login?next=%2Fdashboard");
  await page.evaluate(async (target) => {
    await fetch(target, {
      method: "GET",
      credentials: "include",
      redirect: "follow"
    });
  }, href);
  await page.goto("/dashboard");
}

test("production mode uses real services instead of mock fallback", async ({ page }) => {
  const preflight = await verifyLivePreflight();
  test.skip(!preflight.ok, preflight.ok ? "" : preflight.reason);

  await seedLiveApiConfig(page);
  await loginWithBypass(
    page,
    `/api/test-auth/login?user_id=${TEST_USER_ID}&email=${encodeURIComponent(TEST_USER_EMAIL)}&plan=pro&next=%2Fdashboard`
  );

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByTestId("analyze-url-input")).toBeVisible();

  await page.getByTestId("analyze-url-input").fill(TEST_VIDEO_URL);
  await page.getByTestId("run-analysis-button").click();

  const reportButton = page.getByTestId("view-report-button");
  const errorMessage = page.getByTestId("analysis-error");

  await Promise.race([
    reportButton.waitFor({ state: "visible", timeout: 90_000 }),
    errorMessage.waitFor({ state: "visible", timeout: 90_000 })
  ]).catch(() => null);

  if (await errorMessage.isVisible().catch(() => false)) {
    const text = (await errorMessage.innerText()).trim();
    test.info().annotations.push({ type: "production-error", description: text });
    throw new Error(`Production smoke failed before report creation: ${text}`);
  }

  await expect(reportButton).toBeVisible();
  const analysisNotices = page.getByTestId("analysis-notices");
  if (await analysisNotices.isVisible().catch(() => false)) {
    await expect(analysisNotices).not.toContainText(/mock|fallback|preview/i);
  }

  await reportButton.click();
  await expect(page).toHaveURL(/\/report\//);
  await expect(page.getByTestId("report-tabs")).toBeVisible();
  await expect(page.getByTestId("report-notices")).toHaveCount(0);
  await expect(page.getByText(/Source: Live API|来源: 实时 API/)).toBeVisible();

  await page.getByRole("button", { name: /Playbook|方案/ }).click();
  await expect(page.getByText(/Provider: local|提供方: local/)).toHaveCount(0);
  await expect(page.getByText(/Fallback: Yes|兜底: 是/)).toHaveCount(0);

  await page.goto("/dashboard/trends");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/Fallback preview feed|鏍蜂緥鍥為€€鏁版嵁/)).toHaveCount(0);
});
