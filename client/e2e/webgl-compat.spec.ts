import { expect, test } from "@playwright/test";

test("a mobile browser without WebGL receives a playable 2D compatibility runner", async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: () => null,
    });
  });

  await page.goto(baseURL ?? "http://127.0.0.1:3000");
  await expect(page.getByRole("main", { name: "NEON VELOCITY 2D 相容模式" })).toBeVisible();
  await expect(page.getByText("此瀏覽器不支援 3D WebGL。")).toBeVisible();
  await expect(page.getByText("An unexpected error occurred.")).toHaveCount(0);

  await page.getByRole("button", { name: "開始 2D 衝刺 →" }).tap();
  await expect(page.getByRole("button", { name: "衝刺：關" })).toBeVisible();
  await page.getByRole("button", { name: "衝刺：關" }).tap();
  await expect(page.getByRole("button", { name: "衝刺：開" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "← 左線" }).tap();
  await expect(page.locator(".nv-compat-lane.is-active")).toHaveCount(1);
});
