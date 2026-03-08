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
    reportButton.waitFor({ state: "visible", timeout: 90_000 }).catch(() => null),
    errorMessage.waitFor({ state: "visible", timeout: 90_000 }).catch(() => null),
  ]);

  if (await errorMessage.isVisible().catch(() => false)) {
    const text = (await errorMessage.innerText()).trim();
    test.info().annotations.push({ type: "production-error", description: text });
    expect(text).not.toMatch(/mock|fallback|local::|演示数据|兜底/i);
  } else {
    await expect(reportButton).toBeVisible();

    const notices = page.getByTestId("analysis-notices");
    if (await notices.isVisible().catch(() => false)) {
      const text = await notices.innerText();
      expect(text).not.toMatch(/mock|fallback|演示数据|兜底/i);
    }
  }

  await page.goto("/dashboard/trends");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/Fallback preview feed|样例回退数据/)).toHaveCount(0);
});
