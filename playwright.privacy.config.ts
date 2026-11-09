import { defineConfig } from "@playwright/test";
import websiteConfig from "./playwright.website.config";

const production = process.env.WEBSITE_PRODUCTION === "1";
const base = process.env.VITE_BASE_PATH || "/";
const variant = production ? (base === "/" ? "root" : "pages") : "development";
export default defineConfig({
  ...websiteConfig,
  testMatch: "**/privacy.playwright.ts",
  outputDir: ".playwright-artifacts/privacy",
  reporter: [["list"], ["json", { outputFile: `${process.env.PRIVACY_CHECKS || "docs/website25-checks"}/privacy-${variant}.json` }]],
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
  ],
  use: { ...websiteConfig.use, baseURL: "http://127.0.0.1:5186" },
  webServer: {
    command: `node node_modules/vite/bin/vite.js ${production ? "preview" : ""} --host 127.0.0.1 --port 5186 --strictPort`,
    url: "http://127.0.0.1:5186" + base,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
