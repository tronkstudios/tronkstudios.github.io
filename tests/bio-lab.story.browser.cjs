const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.BASE_URL || "http://127.0.0.1:8790";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    for (const width of [320, 1280]) {
      const page = await browser.newPage({
        viewport: { width, height: 820 },
        reducedMotion: "reduce",
        hasTouch: width < 400,
        isMobile: width < 400,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route(
        (url) => !url.href.startsWith(base),
        (route) => route.abort(),
      );
      await page.route("**/juegos/bio-lab-defense/game.js?*", async (route) => {
        const response = await route.fetch();
        const script = await response.text();
        // Exercise the result and save handlers with a deterministic battle outcome.
        await route.fulfill({
          response,
          body:
            script +
            `
window.completeStoryMission = () => Object.assign(match, { hp: 100, kills: 30, state: "won" });
window.hasEnemyAtB = () => match.enemies.some((enemy) => enemy.lane === 1);
window.defeatEnemyAtB = () => match.damage(match.enemies.find((enemy) => enemy.lane === 1), 10000, "#fff");
window.matchTime = () => match.time;
window.testTowerSpot = () => {
  for (let y = 60; y < HEIGHT; y += 60) {
    for (let x = 60; x < WIDTH; x += 60) {
      if (!match.checkPlacement(blueprint, x, y)) return { x, y };
    }
  }
};
window.spawnTestBoss = () => {
  match.queue.unshift(match.planWave(match.maxWaves).order.at(-1));
  match.spawn();
};`,
        });
      });
      await page.addInitScript(() => {
        if (!localStorage.getItem("biolab_save_v1")) {
          localStorage.setItem(
            "biolab_save_v1",
            JSON.stringify({
              unlockedLevel: 2,
              atpBank: 500,
              bioGems: 25,
              stars: [2],
            }),
          );
        }
      });
      await page.goto(base + "/juegos/bio-lab-defense/");
      await page.locator("#campaign-button").click();
      assert.equal(await page.locator(".chapter").count(), 3);
      assert.equal(await page.locator(".level").count(), 10);
      assert.match(
        await page.locator("#campaign-progress").textContent(),
        /1\/10 misiones · 2 estrellas/,
      );
      assert.equal(await page.locator(".level").nth(2).isDisabled(), true);
      await page.locator("#resume-mission").click();
      await page.getByRole("heading", { name: "Muestreo" }).waitFor();
      await page.locator("#back-campaign").click();
      await page.locator(".level").first().click();
      await page.getByRole("heading", { name: "Ingreso" }).waitFor();
      assert.match(
        await page.locator("#briefing-medal").textContent(),
        /Sin fugas/,
      );
      assert.ok(
        await page
          .locator("#briefing-map")
          .evaluate(
            (canvas) =>
              canvas.getContext("2d").getImageData(450, 240, 1, 1).data[3] > 0,
          ),
      );
      await page.locator("#launch-mission").click();
      assert.match(await page.locator("#radio-text").textContent(), /Restaura/);
      assert.equal(
        await page.locator("#threat-label").textContent(),
        "Próxima oleada",
      );
      assert.ok(Number(await page.locator("#threats").textContent()) > 0);
      assert.equal(await page.locator("#lane-brief").isVisible(), false);
      const canvas = page.locator("#board");
      const dock = page.locator("#dock");
      if (width < 400) {
        assert.ok((await dock.boundingBox()).y < (await canvas.boundingBox()).y);
        assert.ok(
          await dock.evaluate((node) => node.scrollWidth > node.clientWidth),
        );
      } else {
        assert.ok((await dock.boundingBox()).x > (await canvas.boundingBox()).x);
      }
      await page.evaluate(() => completeStoryMission());
      await page.getByRole("heading", { name: "Misión completada" }).waitFor();
      assert.match(
        await page.locator("#modal-text").textContent(),
        /Insignia: Sin fugas/,
      );
      const readSave = () =>
        page.evaluate(() => JSON.parse(localStorage.getItem("biolab_save_v1")));
      const save = await readSave();
      assert.equal(save.medals[0], true);
      assert.equal(save.stars[0], 3);
      assert.equal(save.atpBank, 590);
      assert.equal(save.bioGems, 29);
      await page
        .getByRole("button", { name: "Reintentar", exact: true })
        .click();
      await page.evaluate(() => completeStoryMission());
      await page.getByRole("heading", { name: "Misión completada" }).waitFor();
      assert.deepEqual(
        await readSave(),
        save,
        "repeating a completed medal must not grant rewards again",
      );
      await page
        .getByRole("button", { name: "Siguiente sector", exact: true })
        .click();
      await page.getByRole("heading", { name: "Muestreo" }).waitFor();
      await page.locator("#sound-toggle").click();
      assert.equal(
        await page.locator("#sound-toggle").getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
      );
      await page.evaluate(() => {
        const save = JSON.parse(localStorage.getItem("biolab_save_v1"));
        localStorage.setItem(
          "biolab_save_v1",
          JSON.stringify({ ...save, unlockedLevel: 6 }),
        );
      });
      await page.reload();
      await page.locator("#campaign-button").click();
      await page.locator(".level").nth(5).click();
      await page.locator("#launch-mission").click();
      const counts = async () => {
        const labels = await page.locator("#lane-brief b").allTextContents();
        return labels.map((label) => Number(label.split(" · ").at(-1)));
      };
      const [a, b] = await counts();
      assert.ok(a > 0 && b > 0);
      const tacticalPause = page.locator("#tactical-pause");
      assert.equal(await tacticalPause.isDisabled(), true);
      const roster = await page.locator("#wave-roster li").allTextContents();
      assert.equal(
        roster.reduce((sum, entry) => sum + Number(entry.split(" × ")[0]), 0),
        a + b,
      );
      await page.locator("#next").click();
      await page.waitForFunction(() => hasEnemyAtB());
      assert.deepEqual(await counts(), [a, b]);
      await tacticalPause.click();
      const frozenAt = await page.evaluate(() => matchTime());
      await page.getByText(/Oleada detenida/).waitFor();
      const beforeBuild = Number(await page.locator("#atp").textContent());
      const { x, y } = await page.evaluate(() => testTowerSpot());
      const dimensions = await canvas.boundingBox();
      const position = {
        x: ((dimensions.width - 2) * x) / 900,
        y: ((dimensions.height - 2) * y) / 540,
      };
      if (width < 400) await canvas.tap({ position });
      else await canvas.click({ position });
      await page.getByText("Nano-Láser instalada.", { exact: true }).waitFor();
      assert.equal(Number(await page.locator("#atp").textContent()), beforeBuild - 50);
      assert.equal(await page.evaluate(() => matchTime()), frozenAt);
      await page.locator("#pause").click();
      await page.getByRole("button", { name: "Continuar", exact: true }).click();
      assert.equal(await page.evaluate(() => matchTime()), frozenAt);
      if (width < 400) await tacticalPause.tap();
      else await page.keyboard.press("p");
      await page.waitForFunction((time) => matchTime() > time, frozenAt);
      await page.evaluate(() => defeatEnemyAtB());
      await page.waitForFunction(
        (label) => document.querySelector("#lane-b").textContent === label,
        `Entrada B · ${b - 1}`,
      );
      assert.deepEqual(await counts(), [a, b - 1]);
      const boardTop = await canvas.evaluate((node) => node.offsetTop);
      await page.evaluate(() => spawnTestBoss());
      await page.locator("#boss-status").waitFor();
      assert.equal(await canvas.evaluate((node) => node.offsetTop), boardTop);
      assert.deepEqual(errors, []);
      console.log(
        `Bio-Lab campaign, wave roster, live lanes and tactical pause passed at ${width}px.`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
