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
            '\nwindow.completeStoryMission = () => Object.assign(match, { hp: 100, kills: 30, state: "won" });',
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
      assert.equal(await page.locator("#threats").textContent(), "0");
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
      assert.deepEqual(errors, []);
      console.log(
        `Bio-Lab campaign, mission briefing, legacy saves and one-time medals passed at ${width}px.`,
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
