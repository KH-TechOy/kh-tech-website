import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
const env = {
  VITE_BASE_PATH: process.env.VITE_BASE_PATH || "/kh-tech-website/",
  VITE_FIREBASE_PROJECT_ID: "demo-kh-tech-report",
  VITE_FIREBASE_API_KEY: "emulator",
  VITE_FIREBASE_APP_ID: "emulator-app",
  VITE_FIREBASE_AUTH_DOMAIN: "demo-kh-tech-report.firebaseapp.com",
  VITE_REPORT_API_URL: "http://127.0.0.1:8788",
  VITE_REPORT_EMULATORS: "1",
};
export default defineConfig({
  ...base,
  testMatch: "**/report*.playwright.ts",
  timeout: 60000,
  outputDir: ".playwright-artifacts/report/browser",
  reporter: [["list"]],
  use: { ...base.use, baseURL: "http://127.0.0.1:5188" },
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
    {
      name: "tablet",
      use: { viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
  ],
  webServer: [
    {
      command: "node scripts/report-test-server.mjs",
      url: "http://127.0.0.1:8788/__health",
      reuseExistingServer: false,
    },
    {
      command:
        "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5188 --strictPort",
      url: "http://127.0.0.1:5188" + env.VITE_BASE_PATH,
      env,
      reuseExistingServer: false,
    },
  ],
});
