import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const response = await request.get("/api/test-auth/reset");
  expect(response.ok()).toBeTruthy();
});

test.afterEach(async ({ request }) => {
  const response = await request.get("/api/test-auth/reset");
  expect(response.ok()).toBeTruthy();
});

test("login -> analyze -> open report", async ({ page }) => {
  await page.goto("/login?next=%2Fdashboard");
  await expect(page.getByTestId("qa-login-button")).toBeVisible();

  await page.goto("/api/test-auth/login?next=%2Fdashboard");

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByTestId("analyze-url-input")).toBeVisible();

  await page.getByTestId("analyze-url-input").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByTestId("run-analysis-button").click();

  await expect(page.getByTestId("streaming-stages")).toBeVisible();
  await expect(page.getByTestId("analysis-notices")).toBeVisible();
  await expect(page.getByTestId("view-report-button")).toBeVisible();

  await page.getByTestId("view-report-button").click();

  await expect(page).toHaveURL(/\/report\//);
  await expect(page.getByTestId("report-tabs")).toBeVisible();
  await expect(page.getByTestId("report-notices")).toBeVisible();
});