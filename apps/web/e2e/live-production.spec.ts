import { expect, test } from "@playwright/test";

const TEST_USER_ID = "00000000-0000-4000-8000-000000000123";
const TEST_USER_EMAIL = "live-smoke@viralbrain.ai";
const TEST_VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

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
  await expect(page.getByTestId("analysis-notices")).toHaveCount(0);

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
