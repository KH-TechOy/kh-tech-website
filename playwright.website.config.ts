import { defineConfig } from "@playwright/test";
import gameConfig from "./playwright.config";
const production = process.env.WEBSITE_PRODUCTION === "1",
  port = production ? 5183 : 5174;
export default defineConfig({
  ...gameConfig,
  testMatch: "**/website.playwright.ts",
  timeout: 90000,
  outputDir: ".playwright-artifacts/website",
  reporter: [["list"], ["./scripts/website-test-reporter.mjs"]],
  use: { ...gameConfig.use, baseURL: "http://127.0.0.1:" + port },
  webServer: {
    command: `node node_modules/vite/bin/vite.js ${production ? "preview" : ""} --host 127.0.0.1 --port ${port} --strictPort`,
    url: "http://127.0.0.1:" + port + (process.env.VITE_BASE_PATH || "/"),
    reuseExistingServer: false,
    timeout: 120000,
  },
});
