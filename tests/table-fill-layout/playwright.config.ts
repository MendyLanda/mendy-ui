import { defineConfig, devices } from "@playwright/test";

process.env.TABLE_FILL_BASE_URL = "http://127.0.0.1:8798";

export default defineConfig({
  testDir: "..",
  testMatch: "table-fill-layout.spec.ts",
  fullyParallel: true,
  outputDir: "../../artifacts/table-fill-layout-results",
  reporter: "list",
  use: { baseURL: process.env.TABLE_FILL_BASE_URL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"], trace: "off" } },
    { name: "webkit-mobile", use: { ...devices["iPhone 13"], trace: "off" } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "node tests/table-fill-layout/serve.mjs",
    cwd: "../..",
    url: process.env.TABLE_FILL_BASE_URL,
    reuseExistingServer: false,
    timeout: 60000,
  },
});
