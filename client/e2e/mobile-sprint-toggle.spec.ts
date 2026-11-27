import { expect, test } from "@playwright/test";

test("the 3D mobile HUD toggles sprint with one tap and toggles it off with the next", async ({ page, baseURL }) => {
  await page.goto(baseURL ?? "http://127.0.0.1:3000");
  await page.getByRole("button", { name: "開始衝刺 →" }).tap();
  const sprint = page.locator("#nv-sprint-toggle");
  await sprint.tap();
  await expect(sprint).toHaveAttribute("aria-pressed", "true");
  await expect(sprint).toHaveText("衝刺中");
  await sprint.tap();
  await expect(sprint).toHaveAttribute("aria-pressed", "false");
  await expect(sprint).toHaveText("衝刺");
});
