import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Intentionally never starts or restarts an application process.
export default defineConfig({
  ...base,
  webServer: undefined,
  use: {
    ...base.use,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
  },
});
