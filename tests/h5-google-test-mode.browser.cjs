const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const origin = "http://127.0.0.1:8789";

async function checkReward(browser, survivor) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
    locale: "en-US", serviceWorkers: "block",
    ignoreHTTPSErrors: process.env.ALLOW_TEST_PROXY_CERT === "1",
  });
  try {
    const violations = [];
    await page.exposeFunction("recordAdBlock", directive => violations.push(directive));
    await page.addInitScript(() => {
      localStorage.setItem("tronk-lang", "es");
      document.addEventListener("securitypolicyviolation", e => {
        if (/adtrafficquality\.google|googlesyndication\.com|doubleclick\.net/.test(e.blockedURI))
          window.recordAdBlock(e.effectiveDirective + " " + new URL(e.blockedURI).hostname);
      });
    });
    // Never fetch the vendor SDK unless the page requested official test ads.
    await page.route("**/adsbygoogle.js?*", async route => {
      const testMode = await page.locator("script[data-adbreak-test=on]").count();
      if (testMode) await route.continue();
      else await route.abort();
    });
    await page.route("**/*supabase-js*", route => route.abort());
    await page.route("**/three.min.js", route => route.abort());
    const path = survivor ? "/survivors/" : "/juegos/tronk-gravity-runners/";
    await page.goto(origin + path + "?ads=test", { waitUntil: "domcontentloaded" });
    let before;
    if (survivor) {
      await page.locator("#menu.is-on [data-go=gacha]").first().tap();
      before = await page.evaluate(() => Save.get().coins);
      await page.getByRole("button", { name: "Ver anuncio · +50 monedas", exact: true }).tap();
    } else {
      await page.waitForFunction(() => window.gravityShiftGame);
      await page.evaluate(() => {
        gravityShiftGame.startNewRun({ instant: true });
        gravityShiftGame.handleGameOver();
      });
      await page.locator("#btn-reward-continue").tap();
    }
    // Google's example creative lives in a same-origin frame in test mode.
    await page.waitForFunction(() => Array.from(document.querySelectorAll("iframe"))
      .some(f => f.contentDocument?.body?.innerText.includes("Rewarded ad example")));
    let example;
    for (const frame of page.frames()) {
      if (await frame.getByText("Rewarded ad example", { exact: true }).isVisible()) {
        example = frame;
        break;
      }
    }
    assert.ok(example, "Expected the Google test creative");
    const countdown = example.getByText(/^Reward in \d/);
    await countdown.waitFor();
    await countdown.waitFor({ state: "hidden" });
    await example.locator("#dismiss-button-element").tap();
    if (survivor) await page.waitForFunction(n => Save.get().coins === n + 50, before);
    else await page.waitForFunction(() => gravityShiftGame.scoreMgr.reviveUsed && gravityShiftGame.state === "PLAYING");
    assert.deepEqual(violations, []);
    console.log(path + " completed the official Google test ad and granted the reward");
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    await checkReward(browser, true);
    await checkReward(browser, false);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
