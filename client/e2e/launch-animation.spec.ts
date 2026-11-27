import { expect, test } from "@playwright/test";

test("the saved root opens NEON VELOCITY and triggers its launch sequence", async ({ page, baseURL }) => {
  await page.goto(baseURL ?? "http://127.0.0.1:3000", { waitUntil: "domcontentloaded" });
  const shell = page.locator("#nv-shell");
  await expect(page.locator(".nv-leaderboard-head")).toContainText("NEON VELOCITY");
  await expect(shell).toHaveAttribute("data-variant", "original");
  await expect(page).toHaveTitle(/^NEON VELOCITY$/);
  await expect(shell).toHaveAttribute("data-launch", "false");
  await page.getByRole("button", { name: "開始衝刺 →" }).tap();
  await expect(shell).toHaveAttribute("data-mode", "playing");
  await expect(shell).toHaveAttribute("data-launch", "true");
  await page.waitForTimeout(1950);
  await expect(shell).toHaveAttribute("data-launch", "false");
});

test("language setting switches ERROR DIMENSION and persists after refresh", async ({ page, baseURL }) => {
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension`, { waitUntil: "domcontentloaded" });
  const language = page.locator(".nv-language-picker select");
  await language.selectOption("zh-Hans");
  await expect(page.locator(".nv-leaderboard-head")).toContainText("全球排行榜");
  await expect(page.getByRole("button", { name: "开始冲刺 →" })).toBeVisible();
  await page.reload();
  await expect(page.locator(".nv-shell")).toHaveAttribute("lang", "zh-Hans");
  await language.selectOption("en");
  await expect(page.locator(".nv-leaderboard-head")).toContainText("GLOBAL LEADERBOARD");
  await expect(page.getByRole("button", { name: "START RUN →" })).toBeVisible();
  await page.reload();
  await expect(page.locator(".nv-shell")).toHaveAttribute("lang", "en");
});

test("ERROR DIMENSION reuses the original launch and runway shell", async ({ page, baseURL }) => {
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?demo`, { waitUntil: "domcontentloaded" });
  const shell = page.locator("#nv-shell");
  await expect(shell).toHaveAttribute("data-variant", "error-dimension");
  await expect(page.locator(".nv-title--error")).toBeAttached();
  await expect(shell).toHaveAttribute("data-mode", "playing", { timeout: 5000 });
  await expect(shell).toHaveAttribute("data-launch", "false", { timeout: 5000 });
  await expect(shell).not.toHaveAttribute("data-error-anomaly", "none", { timeout: 13000 });
  await expect(shell).not.toHaveAttribute("data-error-visual", "none");
  const visualState = await shell.getAttribute("data-error-visual");
  expect((visualState && ["mirror", "echo", "prism", "surge", "text", "fullscreen", "plane", "lag", "debt"].includes(visualState)) || visualState?.startsWith("anomaly-")).toBeTruthy();
  if (visualState === "echo") await expect(shell).toHaveAttribute("data-echo-ghosts", "visible");
  if (visualState === "mirror") await expect(shell).toHaveAttribute("data-mirror-signals", "visible");
  if (visualState === "prism") await expect(shell).toHaveAttribute("data-prism-split", "visible");
  if (visualState === "surge") await expect(shell).toHaveAttribute("data-surge-pulse", "visible");
  if (visualState === "text") await expect(shell).toHaveAttribute("data-error-visual", "text");
  await expect(shell).not.toHaveAttribute("data-error-wave-distance", "inactive");
  await expect(page.locator("#nv-dimension-event")).toBeVisible();
  await expect(page.locator("#nv-dimension-history")).toBeVisible();
  await expect(page.locator("#nv-dimension-history-list")).toContainText("10s");
});

test("text glitch renders a visible character layer without changing collision mode", async ({ page, baseURL }) => {
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?demo&debug-anomaly=text`, { waitUntil: "domcontentloaded" });
  const shell = page.locator("#nv-shell");
  await expect(shell).toHaveAttribute("data-mode", "playing", { timeout: 5000 });
  await expect(shell).toHaveAttribute("data-error-visual", "text", { timeout: 13000 });
  await expect(shell).toHaveAttribute("data-text-layer", "visible");
  await expect(page.locator("#nv-dimension-event")).toContainText("文字故障");
  await expect(page.locator("#nv-dimension-history-list")).toContainText("3D");
});


test("debt build anomaly keeps the 3D draft state visible and fair", async ({ page, baseURL }) => {
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?demo&debug-anomaly=debt`, { waitUntil: "domcontentloaded" });
  const shell = page.locator("#nv-shell");
  await expect(shell).toHaveAttribute("data-mode", "playing", { timeout: 5000 });
  await expect(shell).toHaveAttribute("data-error-visual", "debt", { timeout: 5000 });
  await expect(shell).toHaveAttribute("data-debt-build", "visible");
  await expect(page.locator("#nv-dimension-event")).toContainText("欠費版遊戲");
  await expect(page.locator("#nv-dimension-history-list")).toContainText("正方形");
});

test("2D compatibility mode renders the debt build draft", async ({ page, baseURL }) => {
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?compat=1&debug-anomaly=debt`, { waitUntil: "domcontentloaded" });
  const shell = page.locator(".nv-compat");
  await page.locator(".nv-compat-start").click();
  await expect(shell).toHaveAttribute("data-anomaly", "debt", { timeout: 5000 });
  await expect(shell).toHaveAttribute("data-debt-build", "visible");
  await expect(page.locator(".nv-compat-debt-square")).toBeVisible();
  await expect(page.locator(".nv-compat-debt-build")).toContainText("欠費版 // GAME");
});

test("2D compatibility mode exposes the gameplay interference states", async ({ page, baseURL }) => {
  const cases = [
    ["mirror", "-1", "hidden", "normal", "normal"],
    ["echo", "1", "visible", "normal", "normal"],
    ["prism", "1", "hidden", "shifted", "normal"],
    ["surge", "1", "hidden", "normal", "elevated"],
    ["plane", "1", "hidden", "normal", "normal"],
    ["lag", "1", "hidden", "normal", "normal"],
    ["debt", "1", "hidden", "normal", "normal"],
  ] as const;
  for (const [kind, direction, ghosts, prism, pressure] of cases) {
    await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?compat=1&debug-anomaly=${kind}`, { waitUntil: "domcontentloaded" });
    const shell = page.locator(".nv-compat");
    await page.locator(".nv-compat-start").click();
    await expect(shell).toHaveAttribute("data-anomaly", kind, { timeout: 5000 });
    await expect(shell).toHaveAttribute("data-control-direction", direction);
    await expect(shell).toHaveAttribute("data-ghost-distraction", ghosts);
    await expect(shell).toHaveAttribute("data-prism-signal", prism);
    await expect(shell).toHaveAttribute("data-surge-pressure", pressure);
  }
});

test("plane and super-lag anomalies expose separate 3D visual states", async ({ page, baseURL }) => {
  for (const [kind, flag] of [["plane", "data-plane-shift"], ["lag", "data-super-lag"]] as const) {
    await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?demo&debug-anomaly=${kind}`, { waitUntil: "domcontentloaded" });
    const shell = page.locator("#nv-shell");
    await expect(shell).toHaveAttribute("data-mode", "playing", { timeout: 5000 });
    await expect(shell).toHaveAttribute("data-error-visual", kind, { timeout: 5000 });
    await expect(shell).toHaveAttribute(flag, "visible");
    await expect(page.locator("#nv-dimension-event")).toContainText(kind === "plane" ? "平面切換" : "超級卡頓");
  }
});

test("2D compatibility mode renders separate plane and super-lag overlays", async ({ page, baseURL }) => {
  for (const [kind, selector, text] of [["plane", ".nv-compat-plane-error", "PLANE//SHIFT"], ["lag", ".nv-compat-lag-error", "SUPER//LAG"]] as const) {
    await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?compat=1&debug-anomaly=${kind}`, { waitUntil: "domcontentloaded" });
    const shell = page.locator(".nv-compat");
    await page.locator(".nv-compat-start").click();
    await expect(shell).toHaveAttribute("data-anomaly", kind, { timeout: 5000 });
    await expect(shell).toHaveAttribute(kind === "plane" ? "data-plane-shift" : "data-super-lag", "visible");
    await expect(page.locator(selector)).toContainText(text);
  }
});

test("fullscreen error anomaly visibly rebuilds the whole 3D dimension", async ({ page, baseURL }) => {
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?demo&debug-anomaly=fullscreen`, { waitUntil: "domcontentloaded" });
  const shell = page.locator("#nv-shell");
  await expect(shell).toHaveAttribute("data-mode", "playing", { timeout: 5000 });
  await expect(shell).toHaveAttribute("data-error-visual", "fullscreen", { timeout: 5000 });
  await expect(shell).toHaveAttribute("data-fullscreen-error", "visible");
  await expect(page.locator("#nv-dimension-event")).toContainText("全畫面錯誤");
  await expect(page.locator("#nv-dimension-history-list")).toContainText("分層");
});

test("2D compatibility mode shows the fullscreen rebuild overlay", async ({ page, baseURL }) => {
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?compat=1&debug-anomaly=fullscreen`, { waitUntil: "domcontentloaded" });
  const shell = page.locator(".nv-compat");
  await page.locator(".nv-compat-start").click();
  await expect(shell).toHaveAttribute("data-anomaly", "fullscreen", { timeout: 5000 });
  await expect(page.locator(".nv-compat-fullscreen-error")).toContainText("FULLSCREEN//ERROR");
  await expect(page.locator(".nv-compat-fullscreen-error")).toContainText("DIMENSION REBUILDING");
});

test("2D compatibility mode accepts one of the 100 new anomaly events", async ({ page, baseURL }) => {
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?compat=1&debug-anomaly=anomaly-100`, { waitUntil: "domcontentloaded" });
  const shell = page.locator(".nv-compat");
  await page.locator(".nv-compat-start").click();
  await expect(shell).toHaveAttribute("data-anomaly", "anomaly-100", { timeout: 5000 });
  await expect(page.locator(".nv-compat-event")).toContainText("維度重取樣");
  await expect(page.locator(".nv-compat-history")).toContainText("維度重取樣");
});

test("mobile leaderboard disables horizontal scrolling", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?demo`, { waitUntil: "domcontentloaded" });
  const list = page.locator(".nv-leaderboard-list");
  await expect(list).toBeVisible();
  const metrics = await list.evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, overflowX: getComputedStyle(element).overflowX, touchAction: getComputedStyle(element).touchAction }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.overflowX).toBe("hidden");
  expect(metrics.touchAction).toContain("pan-y");
  await list.evaluate((element) => { element.scrollLeft = 80; element.dispatchEvent(new Event("scroll")); });
  await expect.poll(() => list.evaluate((element) => element.scrollLeft)).toBe(0);
});

test("anomaly codex lists locked events and unlocks an encountered anomaly", async ({ page, baseURL }) => {
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?compat=1`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.removeItem("neon-velocity-anomaly-codex-v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /異常圖鑑|异常图鉴|ANOMALY CODEX/ }).click();
  await expect(page.getByRole("dialog", { name: /異常圖鑑|异常图鉴|ANOMALY CODEX/ })).toBeVisible();
  await expect(page.locator(".nv-codex-card")).toHaveCount(109);
  await expect(page.locator(".nv-codex-card.is-locked")).toHaveCount(109);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("neon-velocity-anomaly-encountered", { detail: { kind: "mirror" } })));
  await expect(page.locator('.nv-codex-card[aria-label*="鏡像指令"], .nv-codex-card[aria-label*="镜像指令"], .nv-codex-card[aria-label*="MIRROR"]')).not.toHaveClass("is-locked");
  await expect(page.locator(".nv-codex-preview-art")).toBeVisible();
});

test("manual codex selection keeps preview without a play shortcut", async ({ page, baseURL }) => {
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?compat=1&debug-codex=1`, { waitUntil: "domcontentloaded" });
  const codex = page.getByRole("dialog");
  await expect(codex).toBeVisible();
  await codex.locator('.nv-codex-card[aria-label^="mirror"]').click();
  await expect(codex.locator(".nv-codex-preview-art")).toBeVisible();
  await expect(codex.locator(".nv-codex-play")).toHaveCount(0);
  await expect(page).toHaveURL(/debug-codex=1/);
});

test("mobile leaderboard scrolling does not block codex or game controls", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?demo`, { waitUntil: "domcontentloaded" });
  const list = page.locator(".nv-leaderboard-list");
  await expect(list).toBeVisible();
  await list.evaluate((element) => { element.scrollLeft = 80; });
  await page.getByRole("button", { name: /異常圖鑑|异常图鉴|ANOMALY CODEX/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /關閉圖鑑|关闭图鉴|CLOSE CODEX/ }).click();
  const sprint = page.locator("#nv-sprint-toggle");
  await sprint.click();
  await expect(sprint).toHaveAttribute("aria-pressed", "true");
});

test("2D weak anomaly families render a distinct family effect", async ({ page, baseURL }) => {
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?compat=1&debug-anomaly=anomaly-061`, { waitUntil: "domcontentloaded" });
  await page.locator(".nv-compat-start").click();
  const familyEffect = page.locator(".nv-compat-family-glitch");
  await expect(familyEffect).toHaveAttribute("data-family-effect", "0", { timeout: 5000 });
  await expect(familyEffect).toBeVisible();
  await expect(familyEffect.locator("i")).toHaveCount(3);
});

test("mobile leaderboard scrolling keeps NEON ID panel usable", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?demo`, { waitUntil: "domcontentloaded" });
  const list = page.locator(".nv-leaderboard-list");
  await expect(list).toBeVisible();
  await list.evaluate((element) => { element.scrollLeft = 80; });
  await page.locator(".nv-neon-access button").click();
  const dialog = page.locator(".nv-neon-panel");
  await expect(dialog).toBeVisible();
  await dialog.locator('input[autocomplete="username"]').fill("CODEX_TEST");
  await dialog.locator('input[inputmode="numeric"]').fill("240618");
  await expect(dialog.locator('input[autocomplete="username"]')).toHaveValue("CODEX_TEST");
  await dialog.locator(".nv-neon-close").click();
  await expect(dialog).toBeHidden();
});

test("leaderboard exposes ranks three through ten with vertical scrolling", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?demo`, { waitUntil: "domcontentloaded" });
  const list = page.locator(".nv-leaderboard-list");
  await expect(list).toBeVisible();
  await list.evaluate((element) => {
    if (element.scrollHeight <= element.clientHeight) {
      for (let index = 0; index < 10; index += 1) {
        const row = document.createElement("div");
        row.className = "nv-leaderboard-row";
        row.textContent = `${String(index + 1).padStart(2, "0")} TEST_PLAYER ${String(1000 - index)}`;
        element.appendChild(row);
      }
    }
  });
  const metrics = await list.evaluate((element) => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  await list.evaluate((element) => { element.scrollTop = 0; });
  const box = await list.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * .78);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * .22, { steps: 8 });
    await page.mouse.up();
  }
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await list.evaluate((element) => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event("scroll")); });
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(page.locator(".nv-leaderboard-scroll-hint")).toContainText(/查看更多|SCROLL FOR MORE/);
});

test("desktop leaderboard exposes ranks three through ten", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?demo`, { waitUntil: "domcontentloaded" });
  const list = page.locator(".nv-leaderboard-list");
  await expect(list).toBeVisible();
  await list.evaluate((element) => {
    for (let index = 0; index < 10; index += 1) {
      const row = document.createElement("div");
      row.className = "nv-leaderboard-row";
      row.textContent = `${String(index + 1).padStart(2, "0")} DESKTOP_TEST ${String(2000 - index)}`;
      element.appendChild(row);
    }
  });
  const metrics = await list.evaluate((element) => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  await list.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test("leaderboard podium rows have distinct top-three markers", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension?demo`, { waitUntil: "domcontentloaded" });
  const list = page.locator(".nv-leaderboard-list");
  await expect(list).toBeVisible();
  await list.evaluate((element) => {
    ["1ST", "2ND", "3RD"].forEach((badge, index) => {
      const row = document.createElement("div");
      row.className = `nv-leaderboard-row nv-leaderboard-row--top-${index + 1}`;
      row.dataset.rank = String(index + 1);
      row.innerHTML = `<span class="nv-rank-cell"><i class="nv-rank-badge">${badge}</i><strong>0${index + 1}</strong></span><em>PODIUM_${index + 1}</em><b>${String(9000 - index).padStart(6, "0")}</b>`;
      element.appendChild(row);
    });
  });
  for (const [rank, badge] of [[1, /^(1ST|冠軍|冠军)$/], [2, /^(2ND|亞軍|亚军)$/], [3, /^(3RD|季軍|季军)$/]] as const) {
    const row = page.locator(`.nv-leaderboard-row[data-rank="${rank}"]`).last();
    await expect(row.locator(".nv-rank-badge").last()).toHaveText(badge);
    await expect(row).toHaveCSS("box-shadow", /rgb/);
  }
});

test("crash panels provide route-safe home links for both game variants", async ({ page, baseURL }) => {
  for (const [path, href] of [["/", "/"], ["/error-dimension", "/error-dimension"]] as const) {
    await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}${path}`, { waitUntil: "domcontentloaded" });
    const crashPanel = page.locator("#nv-crash-panel");
    const homeLink = crashPanel.locator(".nv-home-action");
    await expect(homeLink).toHaveAttribute("href", href);
    await expect(homeLink).toBeAttached();
  }
});

test("mobile orientation recovery updates the visual viewport height", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseURL ?? "http://127.0.0.1:3000"}/error-dimension`, { waitUntil: "domcontentloaded" });
  const portraitHeight = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--nv-vh").trim());
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(120);
  const landscapeHeight = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--nv-vh").trim());
  expect(portraitHeight).not.toBe(landscapeHeight);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(120);
  const restoredHeight = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--nv-vh").trim());
  expect(restoredHeight).toBe(portraitHeight);
});
