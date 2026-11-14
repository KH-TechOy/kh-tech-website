import { defineConfig } from "@playwright/test";
import base from "./playwright.report.config";
export default defineConfig({
  ...base,
  testMatch: "**/reportStabilization.playwright.ts",
  projects: [
    ...base.projects!,
    {
      name: "landscape",
      use: {
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
