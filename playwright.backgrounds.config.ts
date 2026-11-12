import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "**/backgrounds.playwright.ts",
  timeout: 60000,
  outputDir: ".playwright-artifacts/background-cache/browser",
  reporter: [["list"]],
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  use: { ...base.use, baseURL: "http://127.0.0.1:5191" },
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5191 --strictPort",
    url: "http://127.0.0.1:5191" + (process.env.VITE_BASE_PATH || "/"),
    reuseExistingServer: false,
  },
});
