const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.BASE_URL || "http://127.0.0.1:8818";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true, isMobile: true, reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route((url) => !url.href.startsWith(base) && !url.href.includes("adsbygoogle"), (route) => route.abort());
    await page.route("**/adsbygoogle.js?*", (route) => route.fulfill({
      contentType: "application/javascript",
      body: `
const queue = window.adsbygoogle;
function handle(option) {
  if (option.onReady) return option.onReady();
  option.beforeReward(() => {
    if (!navigator.userActivation.isActive) throw new Error("Expected one tap");
    option.beforeAd();
    window.finishTestAd = (viewed) => {
      if (viewed) option.adViewed();
      else option.adDismissed();
      option.afterAd();
      option.adBreakDone({ breakStatus: viewed ? "viewed" : "dismissed" });
    };
    window.testAds = (window.testAds || 0) + 1;
  });
}
queue.push = handle;
queue.forEach(handle);
`,
    }));
    await page.route("**/juegos/bio-lab-defense/game.js?*", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body: (await response.text()) + `
window.testRun = {
  get state() { return { state: match.state, wave: match.wave, hero: match.hero?.id,
    cooldown: match.hero?.abilityCooldown, x: match.hero?.x, y: match.hero?.y, hp: match.hp }; },
  spawnNearHero() {
    match.spawn();
    Object.assign(match.enemies.at(-1), { x: match.hero.x + 15, y: match.hero.y });
  },
  winContract() { match.kills = 15; match.state = "won"; },
  towerCap() {
    const type = BLUEPRINTS[0];
    for (let y = 24; y < HEIGHT - 24; y += 38) {
      for (let x = 24; x < WIDTH - 24; x += 38) {
        if (match.towers.length === 4) return match.checkPlacement(type, x, y);
        if (!match.checkPlacement(type, x, y)) match.place(type, x, y);
      }
    }
  },
  loseConsole() {
    for (let i = 0; i < 4; i++) {
      match.spawn();
      Object.assign(match.enemies.at(-1), { x: match.console.x, y: match.console.y, wp: 2 });
    }
  },
  mirrorPhase() {
    match.queue.unshift(match.planWave(match.maxWaves).order.find((entry) => entry.mirror));
    match.spawn();
    const boss = match.enemies.at(-1);
    match.damage(boss, boss.maxHp * 0.8, "#fff", { piercing: true });
  },
  previewFinalWave() {
    match.wave = match.maxWaves - 1;
    match.preview = match.planWave(match.maxWaves);
  },
  barrierActive() { return match.barrier.until > match.time; },
};`,
      });
    });
    await page.addInitScript(() => {
      if (!localStorage.getItem("biolab_save_v1"))
        localStorage.setItem("biolab_save_v1", JSON.stringify({
          unlockedLevel: 10, bioGems: 61, stars: Array(10).fill(1),
        }));
    });
    await page.goto(base + "/juegos/bio-lab-defense/");
    await page.locator("#operations-button").tap();
    await page.getByRole("heading", { name: "Nanobots de campaña" }).waitFor();
    assert.deepEqual(await page.locator("#heroes h3").allTextContents(), [
      "Óptix · Reconocimiento", "Crión · Control térmico", "Volt · Antiescudos", "Helio · Asalto",
    ]);
    assert.equal(await page.locator(".hero-art").count(), 4);
    await page.locator('[data-operation="buy-vega"]').tap();
    await page.locator('[data-operation="equip-vega"]').tap();
    assert.match(await page.locator("#operations-balance").textContent(), /6 biogemas/);
    const ad = page.locator('[data-operation="ad-mara"]');
    for (const [index, viewed] of [false, true, true].entries()) {
      await ad.tap();
      await page.waitForFunction((n) => window.testAds === n, index + 1);
      await page.evaluate((it) => finishTestAd(it), viewed);
      if (index === 0) assert.match(await ad.textContent(), /0\/2/);
      if (index === 1) assert.match(await ad.textContent(), /1\/2/);
    }
    await page.locator('[data-operation="equip-mara"]').waitFor();
    await page.reload();
    await page.locator("#operations-button").tap();
    assert.equal(await page.locator('[data-operation="equip-vega"]').isDisabled(), true);
    await page.locator('[data-operation="equip-mara"]').waitFor();
    await page.locator('[data-operation="contract-guardia"]').tap();
    assert.equal(await page.locator("#supplies").isVisible(), false);
    assert.equal(await page.locator("#field-specials").isVisible(), false);
    assert.match(await page.evaluate(() => testRun.towerCap()), /máximo de torres/);
    await page.getByText("4/4 instaladas", { exact: true }).waitFor();
    assert.match(await page.locator('[data-type="nanolaser"]').textContent(), /Límite/);
    await page.locator("#entry-start-a").tap();
    await page.evaluate(() => testRun.winContract());
    await page.getByRole("heading", { name: "Nuevo récord de élite" }).waitFor();
    await page.getByRole("button", { name: "Volver a contratos" }).tap();
    await page.getByText(/Récord personal · \d/).waitFor();
    await page.locator("#back-operations").tap();

    const launch = async (index) => {
      await page.locator("#campaign-button").tap();
      await page.locator(".level").nth(index).tap();
      await page.locator("#launch-mission").tap();
      const replace = page.getByRole("button", { name: "Empezar y reemplazar" });
      if (await replace.isVisible()) await replace.tap();
    };
    await launch(1);
    await page.getByText(/Protege la consola · Integridad 4\/4/).waitFor();
    const board = page.locator("#board");
    await board.scrollIntoViewIfNeeded();
    const screenPoint = async (x, y) => {
      const bounds = await board.boundingBox();
      return {
        x: bounds.x + 1 + ((bounds.width - 2) * x) / 900,
        y: bounds.y + 1 + ((bounds.height - 2) * y) / 540,
      };
    };
    const devtools = await page.context().newCDPSession(page);
    const atpBeforeDrag = Number(await page.locator("#atp").textContent());
    await devtools.send("Input.dispatchTouchEvent", {
      type: "touchStart", touchPoints: [await screenPoint(220, 240)],
    });
    await page.getByText("Deja despejado el conducto.", { exact: true }).waitFor();
    await devtools.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [await screenPoint(120, 215)],
    });
    await page.getByText("Suelta para instalar · 50 ATP", { exact: true }).waitFor();
    assert.equal(Number(await page.locator("#atp").textContent()), atpBeforeDrag);
    await devtools.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.getByText("Nano-Láser instalada.", { exact: true }).waitFor();
    assert.equal(Number(await page.locator("#atp").textContent()), atpBeforeDrag - 50);
    await devtools.detach();
    const { x, y } = await page.evaluate(() => testRun.state);
    const bounds = await board.boundingBox();
    await board.tap({ position: {
      x: ((bounds.width - 2) * x) / 900,
      y: ((bounds.height - 2) * y) / 540,
    } });
    assert.equal(await page.locator("#move-hero").getAttribute("aria-pressed"), "true");
    await board.tap({ position: { x: 125, y: 83 } });
    const heroPosition = await page.evaluate(() => testRun.state.x);
    assert.ok(heroPosition < 400);
    await page.reload();
    await page.locator("#home-resume-run").tap();
    assert.equal(await page.evaluate(() => testRun.state.hero), "vega");
    assert.equal(await page.evaluate(() => testRun.state.x), heroPosition);
    await page.getByRole("button", { name: "Mover a Helio" }).waitFor();
    await page.locator("#entry-start-a").tap();
    await page.evaluate(() => testRun.spawnNearHero());
    await page.locator("#hero-ability").tap();
    assert.ok(await page.evaluate(() => testRun.state.cooldown) > 0);
    await page.evaluate(() => testRun.loseConsole());
    await page.getByText(/La consola de Muestreo fue destruida/).waitFor();
    await page.getByRole("button", { name: "Repreparar la oleada" }).tap();
    await page.getByText(/Protege la consola · Integridad 4\/4/).waitFor();
    await page.locator("#pause").tap();
    await page.getByRole("button", { name: "Abandonar partida" }).tap();
    await page.locator(".level").nth(7).tap();
    await page.locator("#launch-mission").tap();
    await page.locator("#entry-start-b").tap();
    await page.locator("#barrier-action").tap();
    assert.ok(await page.evaluate(() => testRun.barrierActive()));
    assert.equal(await page.locator("#barrier-action").isDisabled(), true);
    await page.locator("#pause").tap();
    await page.getByRole("button", { name: "Abandonar partida" }).tap();
    await page.locator(".level").nth(9).tap();
    await page.locator("#launch-mission").tap();
    await page.evaluate(() => testRun.previewFinalWave());
    const bossBeacon = page.getByRole("button", {
      name: /Iniciar oleada .* completa\. Entrada B: .* incluye jefe/,
    });
    await bossBeacon.waitFor();
    await page.locator("#entry-start-a").tap();
    await page.evaluate(() => testRun.mirrorPhase());
    await page.getByText("Refuerzos · A", { exact: true }).waitFor();
    await page.getByText("Refuerzos · B", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(errors, []);
    console.log("Bio-Lab map beacons, hero payment and ads, contracts, equipment and Mirror warnings passed.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
