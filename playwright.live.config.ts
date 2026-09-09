import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const required = [
  "MINARAH_E2E_BASE_URL",
  "MINARAH_E2E_MEMBER_EMAIL",
  "MINARAH_E2E_MEMBER_PASSWORD",
  "MINARAH_E2E_PLATFORM_EMAIL",
  "MINARAH_E2E_PLATFORM_PASSWORD",
];
const missing = required.filter((name) => !process.env[name]);
if (process.env.MINARAH_E2E_STAGING !== "1" || missing.length)
  throw new Error(
    `Live acceptance requires MINARAH_E2E_STAGING=1 and dedicated staging identities. Missing: ${missing.join(", ") || "staging acknowledgement"}.`,
  );
if (
  process.env.MINARAH_E2E_MEMBER_EMAIL ===
  process.env.MINARAH_E2E_PLATFORM_EMAIL
)
  throw new Error("Member and platform test identities must be different.");
export default defineConfig({
  outputDir: ".tools/live-results",
  testDir: "./tests/live",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 180000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.MINARAH_E2E_BASE_URL,
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    // No session traces/screenshots. Failure diagnostics stay in ignored .tools.
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
