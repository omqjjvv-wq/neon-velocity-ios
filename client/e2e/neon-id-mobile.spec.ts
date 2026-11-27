import { expect, test } from "@playwright/test";

test("mobile player can tap, fill, create and reopen a NEON ID", async ({ browser, baseURL }) => {
  const displayName = `手機測試${Date.now()}`;
  const gameCode = "240618";

  const firstContext = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const firstPage = await firstContext.newPage();
  await firstPage.goto(baseURL ?? "http://127.0.0.1:3000");
  await firstPage.getByRole("button", { name: "用 NEON ID 加入排行榜 →" }).tap();

  const createDialog = firstPage.getByRole("dialog", { name: "建立 NEON ID" });
  const nameInput = createDialog.getByRole("textbox", { name: "NEON ID" });
  const codeInput = createDialog.getByRole("textbox", { name: "六位遊戲碼" });
  await nameInput.tap();
  await expect(nameInput).toBeFocused();
  await nameInput.fill(displayName);
  await codeInput.tap();
  await expect(codeInput).toBeFocused();
  await codeInput.fill(gameCode);
  await firstPage.getByRole("button", { name: "建立並加入排行榜 →" }).tap();
  await expect(firstPage.locator(".nv-neon-access span")).toContainText(displayName);
  await firstContext.close();

  const secondContext = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const secondPage = await secondContext.newPage();
  await secondPage.goto(baseURL ?? "http://127.0.0.1:3000");
  await secondPage.getByRole("button", { name: "用 NEON ID 加入排行榜 →" }).tap();
  await secondPage.getByRole("button", { name: "已有 NEON ID？開啟我的紀錄 →" }).tap();
  const loginDialog = secondPage.getByRole("dialog", { name: "開啟 NEON ID" });
  await loginDialog.getByRole("textbox", { name: "NEON ID" }).fill(displayName);
  await loginDialog.getByRole("textbox", { name: "六位遊戲碼" }).fill(gameCode);
  await loginDialog.getByRole("button", { name: "開啟我的排行榜 →" }).tap();
  await expect(secondPage.locator(".nv-neon-access span")).toContainText(displayName);
  await secondContext.close();
});
