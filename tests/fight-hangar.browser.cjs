const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8000";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      serviceWorkers: "block",
    });
    await page.route(url => url.origin !== new URL(base).origin, route => route.abort());
    await page.goto(base + "/juegos/tronk-gravity-runners/", {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => window.gravityShiftGame);
    const open = page.locator("#btn-open-shop");
    await open.click();
    for (const filter of ["SPECIAL", "EPIC", "UNLOCKED"]) {
      await page.locator(`[data-filter="${filter}"]`).click();
      const selected = page.locator('#skins-container [aria-pressed="true"]');
      assert.equal(await selected.count(), 1);
      assert.equal(await selected.getAttribute("data-skin-id"),
        await page.evaluate(() => gravityShiftGame.ui.selectedShopSkinId));
    }
    await page.locator("#btn-close-shop").focus();
    await page.keyboard.press("Shift+Tab");
    assert.ok(await page.locator("#skins-container :focus").count());
    await page.keyboard.press("Tab");
    assert.ok(await page.locator("#btn-close-shop").evaluate(el => el === document.activeElement));
    await page.keyboard.press("Escape");
    await page.locator("#modal-shop").waitFor({state: "hidden"});
    assert.ok(await open.evaluate(el => el === document.activeElement));

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(base, {waitUntil: "domcontentloaded"});
    await page.evaluate(() => {
      localStorage.setItem("tronkfight:stage", "99");
      localStorage.setItem("tronkfight:p1", "-20");
      localStorage.setItem("tronkfight:diff", '"invalid"');
    });
    await page.locator('[data-minigame="tronkfight"]').evaluate(el => el.click());
    await page.locator("#tf-btn-play").click();
    await page.locator("#tf-btn-pick").click();
    await page.locator("#tf-btn-pick").click();
    await page.locator("#tf-btn-fight").click();
    await page.keyboard.press("p");
    await page.locator("#tf-opt-fs").check();
    await page.waitForFunction(() => !!document.fullscreenElement);
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => !document.querySelector("#tf-opt-fs").checked);
    await page.locator("#tf-btn-resume").click();
    await page.locator("#tf-btn-pause").waitFor();
    console.log("Hangar filters and keyboard navigation, saved fight settings and fullscreen passed.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
