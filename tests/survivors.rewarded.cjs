// Exercise the reward flow with GPT events supplied by a test fixture.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"]
  });
  try {
    const page = await browser.newPage({ ignoreHTTPSErrors: true, locale: "es-ES", viewport: { width: 390, height: 844 }, hasTouch: true });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/three.min.js", route => route.abort());
    await page.route("**/survivors/", async route => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        'name="rewarded-ad-unit" content=""',
        'name="rewarded-ad-unit" content="/123/test-rewarded"'
      );
      await route.fulfill({ response, body: html });
    });
    await page.route("https://securepubads.g.doubleclick.net/tag/js/gpt.js", route => route.fulfill({
      contentType: "application/javascript",
      body: `
        const queue = googletag.cmd;
        const listeners = new Map();
        const service = {
          addEventListener: (name, fn) => listeners.set(name, fn),
          removeEventListener: name => listeners.delete(name)
        };
        const fire = (name, slot, extra) => listeners.get(name)?.({slot, ...extra});
        Object.assign(googletag, {
          enums: {OutOfPageFormat: {REWARDED: 1}},
          pubads: () => service,
          enableServices() {},
          defineOutOfPageSlot: () => ({addService() {}}),
          destroySlots() {},
          display(slot) {
            window.requests = (window.requests || 0) + 1;
            window.finishAd = (complete) => {
              fire("rewardedSlotReady", slot, {makeRewardedVisible: () => true});
              if (complete) {
                fire("rewardedSlotGranted", slot);
                fire("rewardedSlotGranted", slot);
              }
              fire("rewardedSlotClosed", slot);
            };
          }
        });
        queue.forEach(fn => fn());
      `
    }));
    await page.goto((process.env.BASE_URL || "http://127.0.0.1:8771") + "/survivors/");
    await page.waitForSelector("#menu.is-on", { timeout: 90000 });
    await page.evaluate(() => TronkUI.show("gacha"));
    const button = page.getByRole("button", { name: "Ver anuncio · +50 monedas", exact: true });
    const coins = await page.evaluate(() => Save.get().coins);
    assert.equal(await page.evaluate(() => !!window.googletag), false);
    await button.click();
    await page.waitForFunction(() => window.requests === 1);
    assert.equal(await page.getByRole("button", { name: "Buscando anuncio…" }).isDisabled(), true);
    await page.evaluate(() => finishAd(false));
    await page.waitForFunction(() => !RewardedAds.pending);
    assert.equal(await page.evaluate(() => Save.get().coins), coins);
    await button.click();
    await page.waitForFunction(() => window.requests === 2);
    await page.evaluate(() => finishAd(true));
    await page.waitForFunction(expected => Save.get().coins === expected, coins + 50);
    assert.equal(await page.getByRole("button", { name: "Vuelve más tarde para ganar monedas" }).isDisabled(), true);
    const chestButton = page.getByRole("button", { name: "Ver anuncio · 5 aperturas gratis", exact: true });
    await chestButton.click();
    await page.waitForFunction(() => window.requests === 3);
    await page.evaluate(() => finishAd(true));
    await page.waitForFunction(() => Save.hasAdPulls());
    const unusedReward = await page.evaluate(() => Save.exportData());
    await page.reload();
    await page.waitForSelector("#menu.is-on", { timeout: 90000 });
    await page.evaluate(() => {
      Game.options.reducedMotion = true;
      TronkUI.show("gacha");
    });
    const pulls = await page.evaluate(() => Save.get().pulls);
    const firstFree = await page.evaluate(() => Save.get().freePull);
    // Keep Tesia locked through the random batch so the next test always exercises her ad route.
    await page.evaluate(() => {
      window.originalRandom = Math.random;
      Math.random = () => 0;
    });
    await page.getByRole("button", { name: "Abrir 5 gratis" }).click();
    await page.waitForFunction(() => document.querySelectorAll("#reveal-cards .reveal-card").length === 5);
    await page.evaluate(() => { Math.random = window.originalRandom; });
    assert.equal(await page.evaluate(() => Save.get().pulls), pulls + 5);
    assert.equal(await page.evaluate(() => Save.get().freePull), firstFree);
    assert.ok(await page.evaluate(expected => Save.get().coins >= expected, coins + 50));
    assert.equal(await page.evaluate(() => Save.pull(5)), null);
    await page.evaluate(snapshot => Save.mergeRemote(snapshot), unusedReward);
    assert.equal(await page.evaluate(() => Save.hasAdPulls()), false, "sync must not restore a redeemed batch");
    await page.locator("#reveal-ok").click();
    await page.evaluate(() => TronkUI.show("chars"));
    await page.locator('[data-char-id="tesia"]').click();
    await page.locator(".profile-stats").waitFor();
    assert.equal(await page.locator(".ad-unlock-progress").getAttribute("max"), "3");
    assert.equal(await page.locator(".profile-stats").evaluate(e => e.scrollWidth <= e.clientWidth), true);
    const unlock = page.getByRole("button", { name: "Ver anuncio para desbloquear a Tesia" });
    for (let count = 1; count <= 3; count++) {
      await unlock.click();
      await page.waitForFunction(expected => window.requests === expected, count);
      await page.evaluate(() => finishAd(true));
      await page.waitForFunction(expected => Save.adUnlockProgress("tesia").count === expected, count);
      assert.equal(await page.evaluate(() => !!Save.get().owned.tesia), count === 3);
    }
    await page.reload();
    await page.waitForSelector("#menu.is-on", { timeout: 90000 });
    assert.equal(await page.evaluate(() => Save.get().owned.tesia.stars), 1);
    assert.equal(await page.evaluate(() => Save.adUnlockProgress("tesia").count), 3);
    const costs = await page.evaluate(() => TS.RARITY_ORDER.map(rarity => {
      const ch = TS.CHARACTERS.find(character => character.rarity === rarity);
      return Save.adUnlockProgress(ch.id).total;
    }));
    assert.deepEqual(costs, [1, 2, 3, 5]);
    assert.deepEqual(errors, []);
    console.log("Rewarded ad flow passed: opt-in, cancellation, duplicate event, cooldown, persisted five-pull batch, rarity progress and unlock.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
