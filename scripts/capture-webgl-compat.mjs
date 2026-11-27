import { chromium } from "@playwright/test";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
await page.addInitScript(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: () => null,
  });
});
await page.goto("http://127.0.0.1:3000", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "開始 2D 衝刺 →" }).tap();
await page.screenshot({ path: "/home/ubuntu/webgl-compat-preview.png", fullPage: true });
await browser.close();
