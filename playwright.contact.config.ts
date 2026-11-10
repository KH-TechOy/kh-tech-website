import { defineConfig } from "@playwright/test";
import existing from "./playwright.config";
const production = process.env.CONTACT_UI_PRODUCTION === "1";
export default defineConfig({
  ...existing, testMatch: "**/contact.playwright.ts", timeout: 60_000,
  outputDir: ".playwright-artifacts/contact31-ui",
  reporter: [["list"], ["json", { outputFile: (process.env.CONTACT_CHECKS || "docs/contact31-checks") + "/ui-" + (process.env.VITE_BASE_PATH === "/kh-tech-website/" ? "pages" : "root") + ".json" }]],
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
  ],
  use: { ...existing.use, baseURL: "http://127.0.0.1:5187" },
  webServer: {
    command: `node node_modules/vite/bin/vite.js ${production ? "preview" : ""} --host 127.0.0.1 --port 5187 --strictPort`,
    url: "http://127.0.0.1:5187" + (process.env.VITE_BASE_PATH || "/"), reuseExistingServer: false,
    // These fixture addresses exist only in the isolated browser test process, never a production build.
    env: { VITE_CONTACT_API_URL: "https://contact-api.example.test/contact", VITE_TURNSTILE_SITE_KEY: "browser-fixture-site-key" },
  },
});
