import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://127.0.0.1:8787", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // WebKit tracing disrupts scroll/hit testing in these animated pages.
    // Keep failure screenshots without changing the interactions under test.
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], trace: "off", screenshot: "only-on-failure" },
    },
    {
      name: "webkit-mobile",
      use: { ...devices["iPhone 13"], trace: "off", screenshot: "only-on-failure" },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "node scripts/serve-test-build.mjs",
    url: "http://127.0.0.1:8787",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
