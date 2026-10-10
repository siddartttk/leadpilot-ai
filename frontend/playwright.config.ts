import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3000",
    channel: process.env.CI ? undefined : "chrome",
    headless: true,
    viewport: { width: 1440, height: 1100 },
    trace: "retain-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
