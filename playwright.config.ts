import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./client/e2e",
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  },
  reporter: "line",
});
