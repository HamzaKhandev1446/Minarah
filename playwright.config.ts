import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.PLAYWRIGHT_PORT || 3100);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
      },
    },
    {
      name: "desktop",
      use: {
        viewport: { width: 1280, height: 900 },
        channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
      },
    },
    ...(process.env.MINARAH_CROSS_BROWSER === "1"
      ? [
          {
            name: "firefox",
            use: {
              ...devices["Desktop Firefox"],
              browserName: "firefox" as const,
              channel: undefined,
            },
          },
          {
            name: "webkit-mobile",
            use: {
              ...devices["iPhone 13"],
              browserName: "webkit" as const,
              channel: undefined,
            },
          },
        ]
      : []),
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
