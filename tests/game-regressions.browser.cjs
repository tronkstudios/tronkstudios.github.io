const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8789";

async function survivor(page) {
  await page.goto(base + "/survivors/");
  await page.locator("#menu.is-on").waitFor();
  const day = new Date().toISOString().slice(0, 10);
  await page.evaluate(day => {
    Save.mergeRemote({ dailyDone: day, coins: 100, savedAt: Date.now() + 1000 });
    // Complete an already rewarded daily on a second device.
    TronkUI.play(null, { daily: day, seed: 1 });
  }, day);
  await page.waitForFunction(() => Game.state?.t > 0);
  const extra = await page.evaluate(() => {
    const before = Save.get().stats.coinsEarned;
    Game.finish(false);
    return Save.get().stats.coinsEarned - before;
  });
  assert.ok(extra < 100, "the second device must not receive the daily bonus again");
  await page.locator("#end-menu").click();
  await page.evaluate(() => {
    Save.get().runs = 2;
    TronkUI.play(null, { map: "bosque" });
  });
  await page.waitForFunction(() => Game.state?.t > 0 && !Game.state.over);
  assert.equal(await page.evaluate(() => JSON.parse(Game.state.signature).rules.easy), true);
  await page.evaluate(() => Game.finish(false));
  await page.locator("#end-again").click();
  await page.waitForFunction(() => Game.state?.t > 0 && !Game.state.over);
  assert.equal(await page.evaluate(() => JSON.parse(Game.state.signature).rules.easy), false);
}

async function gravity(page) {
  await page.goto(base + "/juegos/tronk-gravity-runners/");
  await page.waitForFunction(() => window.gravityShiftGame);
  const result = await page.evaluate(async () => {
    let copied = false;
    Object.defineProperty(navigator, "share", { value: async () => { throw new DOMException("Cancelled", "AbortError"); } });
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { copied = true; } } });
    await gravityShiftGame.ui.shareDaily();
    return { copied, closed: document.querySelector("#share-panel").hidden, inert: document.querySelector(".ui-layer").inert };
  });
  assert.deepEqual(result, { copied: false, closed: true, inert: false });
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--enable-unsafe-swiftshader"] });
  try {
    const page = await browser.newPage({ serviceWorkers: "block" });
    await page.route(url => url.origin !== new URL(base).origin, route => route.abort());
    await survivor(page);
    await gravity(page);
    console.log("Daily sync, fourth-run difficulty and cancelled sharing passed.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
