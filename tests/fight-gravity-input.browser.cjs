const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const origin = "https://tronk.test";

async function loadGame(page, pathname) {
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    const file = path.join(root, decodeURIComponent(url.pathname), url.pathname.endsWith("/") ? "index.html" : "");
    if (url.pathname === "/js/games/tronk-fight.js") {
      const source = await fs.readFile(file, "utf8");
      const body = source.replace(/\}\)\(\);\s*$/, "window.testCombat = { app, step };\n})();");
      return route.fulfill({ contentType: "text/javascript", body });
    }
    try {
      await route.fulfill({ path: file });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await route.fulfill({ status: 404, body: "" });
    }
  });
  await page.goto(origin + pathname, { waitUntil: "domcontentloaded" });
}

async function checkFight(browser) {
  const page = await browser.newPage({ serviceWorkers: "block" });
  await loadGame(page, "/");
  await page.locator('[data-minigame="tronkfight"]').evaluate(card => card.click());
  for (const id of ["duo", "pick", "pick", "fight", "pause", "p-help", "help-close"]) {
    await page.locator("#tf-btn-" + id).click();
  }
  assert.ok(await page.locator("#tf-scr-pause").isVisible());

  const result = await page.evaluate(() => {
    const { app, step } = window.testCombat;
    const match = app.match;
    const [first, second] = match.f;
    const tap = code => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code }));
    };
    document.querySelector("#tf-btn-resume").click();
    match.phaseT = 149;
    tap("KeyJ");
    step(match);
    const cue = [match.banner.text, match.phase, first.state];
    match.hitstop = 2;
    tap("KeyJ");
    tap("Numpad3");
    step(match);
    step(match);
    const duringImpact = [first.state, second.state];
    step(match);
    const afterImpact = [first.state, second.state];
    tap("KeyI");
    document.querySelector("#tf-btn-pause").click();
    return { cue, duringImpact, afterImpact, pendingAfterPause: first.presses.size };
  });
  assert.deepEqual(result, {
    cue: ["¡Lucha!", "fight", "idle"],
    duringImpact: ["idle", "idle"],
    afterImpact: ["attack", "dodge"],
    pendingAfterPause: 0,
  });
  await page.locator("#tf-btn-p-select").click();
  await page.locator("#tf-btn-sel-back").click();
  await page.locator("#tf-btn-help").click();
  await page.keyboard.press("Escape");
  assert.ok(await page.locator("#tf-scr-title").isVisible());
  await page.close();
}

async function checkRunner(browser) {
  const page = await browser.newPage({
    viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, serviceWorkers: "block",
  });
  await loadGame(page, "/juegos/tronk-gravity-runners/");
  await page.waitForFunction(() => window.gravityShiftGame);
  await page.evaluate(() => {
    const game = window.gravityShiftGame;
    game.scoreMgr.saveData.settings.touchpad = true;
    game.applySavedSettings();
    game.scoreMgr.saveData.inventory.boards = 2;
    game.startNewRun({ instant: true });
    game.player.shieldTimer = 60;
  });
  for (const [direction, expected] of [[-1, -2.1], [1, 0]]) {
    const control = page.locator('[data-nudge="' + direction + '"]');
    const bounds = await control.boundingBox();
    assert.ok(bounds.height >= 44);
    await control.tap({ position: { x: 10, y: 36 }, timeout: 5000 });
    assert.equal(await page.evaluate(() => gravityShiftGame.gravitySys.targetLateralOffset), expected);
  }
  await page.locator("#btn-use-board").tap({ timeout: 5000 });
  await page.waitForFunction(() => gravityShiftGame.items.active.board > 0);
  assert.equal(await page.evaluate(() => gravityShiftGame.scoreMgr.saveData.inventory.boards), 1);
  await page.locator("#btn-pause-game").tap();
  assert.ok(await page.locator("#modal-pause").isVisible());
  await page.close();
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    await checkFight(browser);
    await checkRunner(browser);
    console.log("Verificados el inicio de ronda, los toques breves, la pausa y los mandos de Gravity Runners.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
