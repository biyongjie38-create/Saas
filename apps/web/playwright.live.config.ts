import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  use: {
    baseURL: "http://localhost:3200",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/qa-live.mjs",
    url: "http://localhost:3200/login",
    reuseExistingServer: false,
    timeout: 180_000,
    cwd: __dirname,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

