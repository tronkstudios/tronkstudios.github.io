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
    cooldown: match.hero?.abilityCooldown, x: match.hero?.x, y: match.hero?.y, hp: match.hp, time: match.time }; },
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
  awakenViruela() {
    match.queue = [match.planWave(match.maxWaves).order.find((entry) => entry.zero)];
    match.spawn();
    const boss = match.enemies.at(-1);
    match.damage(boss, boss.maxHp * 0.4, "#fff", { piercing: true });
  },
  breakViruelaNodes() {
    for (const node of match.zeroNodes) match.damage(node, node.hp, "#fff", { piercing: true });
  },
  finishCurrentWave() {
    match.enemies = [];
    match.queue = [];
    match.shots = [];
    match.mirrorOrders = [];
    match.tick();
  },
  breakTestShield() {
    match.spawn();
    const target = match.enemies.at(-1);
    target.shield = 8;
    match.damage(target, 8, "#fff");
  },
  barrierActive() { return match.barrier.until > match.time; },
  prepareBlackout() {
    const { x, y } = match.routeEvent.blackout;
    selected = match.place(BLUEPRINTS[0], x, y + 56) || match.place(BLUEPRINTS[0], x, y - 56);
    blueprint = null;
    match.wave = match.routeEvent.wave - 2;
    match.preview = match.planWave(match.wave + 1);
    return !!selected;
  },
  nextPreparation() {
    match.wave++;
    match.preview = match.planWave(match.wave + 1);
  },
};`,
      });
    });
    await page.addInitScript(() => {
      if (!localStorage.getItem("biolab_save_v1"))
        localStorage.setItem("biolab_save_v1", JSON.stringify({
          unlockedLevel: 22, bioGems: 61, stars: Array(22).fill(1),
        }));
    });
    await page.goto(base + "/juegos/bio-lab-defense/");
    const codex = page.getByRole("dialog", { name: "Enciclopedia del laboratorio" });
    await page.locator("#home-codex").tap();
    const sprites = new Set();
    for (const [category, total] of [["Torres", 12], ["Enemigos", 10], ["Jefes", 8]]) {
      await codex.getByRole("button", { name: category, exact: true }).tap();
      const entries = codex.locator("#codex-list button");
      assert.equal(await entries.count(), total);
      for (const entry of await entries.all()) {
        await entry.tap();
        assert.equal(await codex.locator("h3").textContent(), await entry.textContent());
        const sprite = await codex.locator("canvas").evaluate((canvas) => {
          const hasPixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
            .data.some((pixel, index) => index % 4 === 3 && pixel > 0);
          return hasPixels ? canvas.toDataURL() : null;
        });
        assert.ok(sprite);
        sprites.add(sprite);
      }
    }
    assert.equal(sprites.size, 30);
    await codex.getByRole("button", { name: "Enemigos", exact: true }).tap();
    const search = codex.getByRole("searchbox", { name: "Buscar en esta categoría" });
    await search.fill("bacteriofago");
    assert.equal(await codex.locator("#codex-list button").count(), 1);
    await codex.getByRole("heading", { name: "Bacteriófago T4" }).waitFor();
    await search.fill("sin coincidencias");
    await codex.getByText("No hay fichas que coincidan.").waitFor();
    assert.equal(await codex.locator("#codex-detail").isVisible(), false);
    await codex.getByRole("button", { name: "Torres", exact: true }).tap();
    assert.equal(await search.inputValue(), "");
    await search.fill("bio-reactor");
    await codex.getByText("260 ATP/min", { exact: true }).waitFor();
    await codex.getByText("1,75 s", { exact: true }).waitFor();
    await codex.getByRole("button", { name: "Cerrar" }).tap();
    await page.locator("#operations-button").tap();
    await page.getByRole("heading", { name: "Nanobots de campaña" }).waitFor();
    assert.deepEqual(await page.locator("#heroes h3").allTextContents(), [
      "Óptix · Reconocimiento", "Crión · Control térmico", "Volt · Antiescudos", "Helio · Asalto",
    ]);
    assert.equal(await page.locator(".hero-art").count(), 4);
    assert.match(await page.locator("#fielded-hero").textContent(), /Óptix/);
    await page.locator('[data-operation="buy-vega"]').tap();
    await page.locator('[data-operation="equip-vega"]').tap();
    assert.match(await page.locator("#operations-balance").textContent(), /6 biogemas/);
    assert.match(await page.locator("#fielded-hero").textContent(), /Helio/);
    const cryoProgress = page.getByRole("progressbar", { name: "Anuncios completados para desbloquear a Crión" });
    assert.equal(await cryoProgress.getAttribute("max"), "2");
    const ad = page.locator('[data-operation="ad-mara"]');
    for (const [index, viewed] of [false, true, true].entries()) {
      await ad.tap();
      await page.waitForFunction((n) => window.testAds === n, index + 1);
      await page.evaluate((it) => finishTestAd(it), viewed);
      if (index === 0) assert.match(await ad.textContent(), /0\/2/);
      if (index === 1) {
        assert.match(await ad.textContent(), /1\/2/);
        assert.equal(await cryoProgress.getAttribute("value"), "1");
      }
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
    await page.locator("#field-codex").tap();
    await codex.getByRole("heading", { name: "Nano-Láser" }).waitFor();
    const guidePausedAt = await page.evaluate(() => testRun.state.time);
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    assert.equal(await page.evaluate(() => testRun.state.time), guidePausedAt);
    await page.keyboard.press("Escape");
    await codex.waitFor({ state: "hidden" });
    await page.waitForFunction((time) => testRun.state.time > time, guidePausedAt);
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
    await page.locator("#placement-analysis").getByText(/Recorrido al alcance · A/).waitFor();
    assert.match(await page.locator("#placement-analysis").textContent(), /14 de daño por impacto/);
    await devtools.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [await screenPoint(190, 215)],
    });
    await page.getByText("Punto sugerido · suelta para instalar · 50 ATP", { exact: true }).waitFor();
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
    await page.locator("#focus-fire").tap();
    await page.getByRole("dialog", { name: "Concentrar fuego" }).waitFor();
    const stopped = await page.evaluate(() => testRun.state.time);
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    assert.equal(await page.evaluate(() => testRun.state.time), stopped);
    await page.locator("#fire-details").getByText(/Vida .* con alcance/).waitFor();
    await page.locator("#fire-confirm").tap();
    await page.locator("#focus-fire").getByText(/Objetivo ·/).waitFor();
    await page.locator("#focus-fire").tap();
    await page.locator("#fire-clear").tap();
    await page.locator("#focus-fire").getByText("Concentrar fuego").waitFor();
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
    await page.locator("#wave-roster").getByRole("button", { name: /Jefe · Gripe de 1918/ }).tap();
    await codex.getByRole("heading", { name: "Gripe de 1918", exact: true }).waitFor();
    await codex.getByText("Virus de la gripe A (H1N1)", { exact: true }).waitFor();
    await codex.getByRole("button", { name: "Cerrar" }).tap();
    const bossBeacon = page.getByRole("button", {
      name: /Iniciar oleada .* completa\. Entrada B: .* incluye jefe/,
    });
    await bossBeacon.waitFor();
    await page.locator("#entry-start-a").tap();
    await page.evaluate(() => testRun.mirrorPhase());
    await page.locator("#combat-cue").getByText(/Fase final/).waitFor();
    await page.getByText("Refuerzos · A", { exact: true }).waitFor();
    await page.getByText("Refuerzos · B", { exact: true }).waitFor();
    await page.locator("#pause").tap();
    await page.getByRole("button", { name: "Abandonar partida" }).tap();
    await page.locator(".level").nth(15).tap();
    await page.locator("#launch-mission").tap();
    await page.getByText("Protege la terminal A · Integridad 4/4").waitFor();
    await page.locator("#next").tap();
    await page.waitForFunction(() =>
      !document.querySelector("#next-group-a").hidden ||
      !document.querySelector("#next-group-b").hidden);
    await page.evaluate(() => testRun.breakTestShield());
    await page.locator("#combat-cue").getByText("Escudo roto").waitFor();
    await page.evaluate(() => testRun.finishCurrentWave());
    await page.locator("#combat-cue").getByText("Terminal A asegurada").waitFor();
    await page.getByText("Protege la terminal B · Integridad 4/4").waitFor();
    await page.locator("#wave-debrief-title").tap();
    await page.getByText("Entrada A · 0 fugas / Entrada B · 0 fugas").waitFor();
    const payout = await page.locator("#wave-debrief-atp").textContent();
    assert.match(payout, /Cierre de oleada.*Refuerzo/);
    await page.reload();
    await page.locator("#home-resume-run").tap();
    await page.getByText("Protege la terminal B · Integridad 4/4").waitFor();
    await page.locator("#wave-debrief-title").tap();
    assert.equal(await page.locator("#wave-debrief-atp").textContent(), payout);
    await page.locator("#pause").tap();
    await page.getByRole("button", { name: "Volver con guardado" }).tap();
    await page.locator(".level").nth(19).tap();
    await page.locator("#launch-veteran").tap();
    await page.getByRole("heading", { name: "Veterano · Carga inversa" }).waitFor();
    assert.equal(await page.locator("#next").isDisabled(), true);
    assert.equal(await page.locator("#supplies").isVisible(), false);
    assert.equal(await page.evaluate(() => testRun.state.hero), "iris");
    await page.locator("#cut-b").tap();
    await page.getByText("Línea B aislada · Enemigos más lentos.").waitFor();
    await page.locator("#next").tap();
    await page.evaluate(() => testRun.winContract());
    await page.getByRole("heading", { name: "Nuevo récord Veterano" }).waitFor();
    await page.getByRole("button", { name: "Volver al sector" }).tap();
    await page.getByText(/Récord Veterano · \d/).waitFor();
    await page.reload();
    await page.locator("#home-resume-run").tap();
    await page.getByText("Protege la terminal B · Integridad 4/4").waitFor();
    await page.locator("#pause").tap();
    await page.getByRole("button", { name: "Abandonar partida" }).tap();
    await page.locator(".level").nth(19).tap();
    await page.locator("#launch-mission").tap();
    await page.locator("#cut-b").tap();
    await page.reload();
    await page.locator("#home-resume-run").tap();
    assert.equal(await page.locator("#cut-b").getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#next").isDisabled(), false);
    await page.locator("#pause").tap();
    await page.getByRole("button", { name: "Abandonar partida" }).tap();
    await page.locator(".level").nth(18).tap();
    await page.locator("#launch-mission").tap();
    assert.equal(await page.evaluate(() => testRun.prepareBlackout()), true);
    const forecast = page.locator("#placement-analysis");
    await forecast.getByText("Apagón aquí en la oleada 4").waitFor();
    await page.evaluate(() => testRun.nextPreparation());
    await forecast.getByText("Sin energía en la oleada 4").waitFor();
    await forecast.getByText("Recorrido al alcance · A 0 % / B 0 %").waitFor();
    await page.locator("#next").tap();
    await forecast.getByText("Sin energía hasta el final de la oleada").waitFor();
    await page.locator("#pause").tap();
    await page.getByRole("button", { name: "Abandonar partida" }).tap();
    await page.locator(".level").nth(21).tap();
    await page.locator("#launch-mission").tap();
    await page.evaluate(() => testRun.previewFinalWave());
    await page.locator("#wave-roster").getByText(/Jefe · Viruela/).waitFor();
    await page.locator("#entry-start-b").tap();
    await page.evaluate(() => testRun.awakenViruela());
    await page.locator("#boss-name").getByText("Viruela", { exact: true }).waitFor();
    await page.getByRole("region", { name: "Nodos de la viruela" }).waitFor();
    await page.evaluate(() => testRun.breakViruelaNodes());
    await page.getByText("Nodos destruidos · Viruela expuesta").waitFor();
    assert.equal(await page.locator("#zero-state-a").textContent(), "Destruido");
    assert.equal(await page.locator("#zero-state-b").textContent(), "Destruido");
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
