const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.BASE_URL || "http://127.0.0.1:8789";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-background-timer-throttling",
    ],
  });
  try {
    const routes = [
      "/juegos/bio-lab-defense/",
      "/survivors/",
      "/juegos/tronk-gravity-runners/",
    ];
    // Keep the game under test in the foreground while its sprites initialize.
    for (const path of routes) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        locale: "es-ES",
        reducedMotion: "reduce",
      });
      try {
        await context.route(
          (url) =>
            !url.href.startsWith(base) && !url.href.includes("adsbygoogle"),
          (r) => r.abort(),
        );
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        let requests = 0;
        await context.route("**/adsbygoogle.js?*", (route) => {
          requests++;
          assert.match(
            route.request().url(),
            /client=ca-pub-6088460231287739$/,
          );
          return route.fulfill({
            contentType: "application/javascript",
            body: `
      if(document.currentScript.dataset.adClient !== "ca-pub-6088460231287739") throw new Error("Missing H5 publisher");
      const queue=window.adsbygoogle;
      window.visibleAds=0;
      window.configCalls=0;
      window.preloadCalls=0;
      function handle(config){
        if(config.onReady){
          if(config.preloadAdBreaks === "on") window.preloadCalls++;
          if(++window.configCalls > 1) setTimeout(config.onReady,10);
          return;
        }
        if(config.type!=="reward")throw new Error("Unexpected ad placement");
        if(window.ignorePlacement) return;
        function offer(){
           if(window.noFill){config.adBreakDone({breakStatus:"noAdPreloaded"});return;}
           config.beforeReward(()=>{
              if(!navigator.userActivation.isActive) throw new Error("The ad must be opened by a direct click");
              window.visibleAds++;
              config.beforeAd();
              window.finishAd=(ok)=>{
                if(ok && window.lateView){
                  config.afterAd();
                  setTimeout(()=>{config.adViewed();config.adViewed();},100);
                  return;
                }
                if(ok){config.adViewed();config.adViewed();}
                else config.adDismissed();
                config.afterAd();
                config.adBreakDone({breakStatus:ok?"viewed":"dismissed"});
                config.adBreakDone({breakStatus:ok?"viewed":"dismissed"});
              };
           });
        }
        if(window.delayedOffer) setTimeout(offer,25);
        else offer();
      }
      queue.push=handle;queue.forEach(handle);
    `,
          });
        });
        await page.goto(base + path);
        assert.equal(requests, 0, "no ad on the home screen");
        let button, balance, verify;
        if (path.includes("bio-lab")) {
          await page.locator("#campaign-button").tap();
          await page.locator(".level").first().tap();
          await page.locator("#launch-mission").tap();
          assert.match(
            await page.locator("#wave-preview-title").textContent(),
            /enemigos/,
          );
          button = page.locator("#boost");
          balance = () => page.locator("#atp").textContent().then(Number);
          verify = async (initial) =>
            assert.equal(await balance(), initial + 75);
        } else if (path === "/survivors/") {
          await page.waitForSelector("#menu.is-on", { timeout: 90000 });
          await page.evaluate(() => TronkUI.show("chars"));
          assert.equal(
            await page.locator(".profile-stat-track[role=meter]").count(),
            11,
          );
          assert.equal(
            (await page.locator(".profile-stats").textContent()).includes("%"),
            false,
          );
          await page.evaluate(() => TronkUI.show("gacha"));
          button = page.getByRole("button", {
            name: "Ver anuncio · +50 monedas",
            exact: true,
          });
          balance = () => page.evaluate(() => Save.get().coins);
          verify = async (initial) =>
            assert.equal(await balance(), initial + 50);
        } else {
          await page.waitForFunction(() => window.gravityShiftGame?.modelReady);
          await page.evaluate(() => {
            const g = window.gravityShiftGame;
            g.startNewRun({ instant: true, mode: "normal" });
            g.handleGameOver();
          });
          button = page.locator("#btn-reward-continue");
          balance = () =>
            page.evaluate(() =>
              Number(gravityShiftGame.scoreMgr.reviveUsed || false),
            );
          verify = async () =>
            await page.waitForFunction(
              () => gravityShiftGame.scoreMgr.reviveUsed,
            );
        }
        const initial = await balance();
        const retry = page.getByRole("button", { name: /^reintentar preparación$/i }).first();
        await retry.tap();
        const readyLabel =
          /Ver anuncio · \+75 ATP|Ver anuncio · \+50 monedas|VER ANUNCIO · CONTINUAR UNA VEZ/;
        await page.waitForFunction(
          (source) =>
            [...document.querySelectorAll("button")].some(
              (b) =>
                !b.disabled &&
                b.getClientRects().length &&
                new RegExp(source).test(b.textContent),
            ),
          readyLabel.source,
        );
        assert.equal(
          requests,
          1,
          "retry readiness without loading the SDK again",
        );
        assert.equal(await page.evaluate(() => configCalls), 2);
        assert.equal(await page.evaluate(() => preloadCalls), 1);
        assert.equal(await page.evaluate(() => visibleAds), 0);
        await page.evaluate(() => { window.ignorePlacement = true; });
        await button.tap();
        await button.and(page.getByRole("button", { name: readyLabel })).and(page.locator(":enabled")).waitFor();
        assert.equal(await balance(), initial, "a stalled placement gives no reward");
        await page.evaluate(() => {
          window.ignorePlacement = false;
          window.noFill = true;
        });
        await button.tap();
        await page.waitForFunction(
          (source) =>
            [...document.querySelectorAll("button")].some(
              (b) =>
                !b.disabled &&
                b.getClientRects().length &&
                new RegExp(source).test(b.textContent),
            ),
          readyLabel.source,
        );
        assert.equal(await balance(), initial);

        await page.evaluate(() => {
          window.noFill = false;
          window.delayedOffer = true;
        });
        await button.tap();
        await page.waitForFunction(() => visibleAds === 1);
        await page.evaluate(() => finishAd(false));
        assert.equal(await balance(), initial);

        await page.evaluate(() => {
          window.delayedOffer = false;
        });
        await button.tap();
        await page.waitForFunction(() => visibleAds === 2);
        assert.equal(
          await page.locator(".tronk-ad-offer").count(),
          0,
          "no second confirmation",
        );
        await page.evaluate(() => finishAd(false));
        assert.equal(await balance(), initial);

        await button.tap();
        await page.waitForFunction(() => visibleAds === 3);
        const lateView = path.includes("bio-lab");
        await page.evaluate(late => { window.lateView = late; finishAd(true); }, lateView);
        if (lateView) {
          await page.waitForFunction(
            amount => Number(document.querySelector("#atp").textContent) === amount,
            initial + 75,
          );
        }
        await verify(initial);
        assert.equal(requests, 1, "load the SDK once per game page");
        if (path.includes("bio-lab")) {
          const canvas = page.locator("#board"),
            bounds = await canvas.boundingBox();
          const pos = {
            x: (bounds.width * 170) / 900,
            y: (bounds.height * 170) / 540,
          };
          const balanceAfterReward = await balance();
          await canvas.tap({ position: pos });
          await page.locator("#undo-build").tap();
          assert.equal(
            await balance(),
            balanceAfterReward,
            "undo refunds the full purchase",
          );
          await canvas.tap({ position: pos });
          await canvas.tap({ position: pos });
          await page.getByRole("button", { name: /^Mejorar/ }).tap();
          await page.getByRole("button", { name: /^Perforante/ }).tap();
          await page.getByText("Nano-Láser · Nivel 3 · Perforante").waitFor();
          const targeting = page.getByLabel("Prioridad de objetivo");
          await targeting.selectOption("last");
          assert.equal(await targeting.inputValue(), "last");
          await page.locator("#pause").tap();
          await page.getByRole("button", { name: "Abandonar partida" }).tap();
          await page.locator("#back-home").tap();
          await page.locator("#challenge-button").tap();
          await page.getByRole("button", { name: "Jugar reto" }).tap();
          assert.equal(await page.locator("#supplies").isVisible(), false);
          assert.equal(
            await page.locator("[data-type=omega]").isEnabled(),
            true,
          );
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          );
        }
        assert.deepEqual(errors, []);
        console.log(path + " passed");
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
