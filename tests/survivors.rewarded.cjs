// Exercise the reward flow with GPT events supplied by a test fixture.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"]
  });
  try {
    const page = await browser.newPage({ ignoreHTTPSErrors: true, locale: "es-ES" });
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
    const button = page.locator("#gacha-rewarded button");
    const coins = await page.evaluate(() => Save.get().coins);
    assert.equal(await page.evaluate(() => !!window.googletag), false);
    await button.click();
    await page.waitForFunction(() => window.requests === 1);
    assert.equal(await button.isDisabled(), true);
    await page.evaluate(() => finishAd(false));
    await page.waitForFunction(() => !RewardedAds.pending);
    assert.equal(await page.evaluate(() => Save.get().coins), coins);
    await button.click();
    await page.waitForFunction(() => window.requests === 2);
    await page.evaluate(() => finishAd(true));
    await page.waitForFunction(expected => Save.get().coins === expected, coins + 50);
    assert.equal(await button.isDisabled(), true);
    await page.evaluate(() => TronkUI.show("chars"));
    await page.locator('[data-char-id="tesia"]').click();
    await page.getByRole("button", { name: "Ver anuncio para desbloquear a Tesia" }).click();
    await page.waitForFunction(() => window.requests === 3);
    await page.evaluate(() => finishAd(true));
    await page.waitForFunction(() => Save.get().owned.tesia?.stars === 1);
    await page.reload();
    await page.waitForSelector("#menu.is-on", { timeout: 90000 });
    assert.equal(await page.evaluate(() => Save.get().owned.tesia.stars), 1);
    assert.equal(await page.evaluate(() => Save.get().coins), coins + 50);
    assert.deepEqual(errors, []);
    console.log("Rewarded ad flow passed: opt-in, cancellation, duplicate event, cooldown and persisted unlock.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
