const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.BASE_URL || "http://127.0.0.1:8788";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const routes = [
      "/juegos/bio-lab-defense/",
      "/survivors/",
      "/juegos/tronk-gravity-runners/",
    ];
    await Promise.all(
      routes.map(async (path) => {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
          hasTouch: true,
          isMobile: true,
          locale: "es-ES",
          reducedMotion: "reduce",
        });
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
      const queue=window.adsbygoogle;
      window.visibleAds=0;
      function handle(config){
        if(config.onReady){setTimeout(config.onReady,10);return;}
        if(config.type!=="reward")throw new Error("Unexpected ad placement");
        setTimeout(()=>{
           if(window.noFill){config.adBreakDone({breakStatus:"noAdPreloaded"});return;}
           config.beforeReward(()=>{
              if(!navigator.userActivation.isActive) throw new Error("The ad must be opened by a direct click");
              window.visibleAds++;
              config.beforeAd();
              window.finishAd=(ok)=>{
                if(ok){config.adViewed();config.adViewed();}
                else config.adDismissed();
                config.afterAd();
                config.adBreakDone({breakStatus:ok?"viewed":"dismissed"});
                config.adBreakDone({breakStatus:ok?"viewed":"dismissed"});
              };
           });
        },25);
      }
      queue.push=handle;queue.forEach(handle);
    `,
          });
        });
        await page.goto(base + path);
        let button, balance, verify;
        if (path.includes("bio-lab")) {
          await page.locator("#campaign-button").tap();
          await page.locator(".level").first().tap();
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
        const initial = await balance(),
          dialog = page.getByRole("dialog", { name: "Anuncio con recompensa" });
        assert.equal(requests, 0);
        await button.tap();
        await dialog.waitFor();
        assert.equal(await page.evaluate(() => visibleAds), 0);
        await dialog.getByRole("button", { name: "Ahora no" }).tap();
        await dialog.waitFor({ state: "hidden" });
        assert.equal(await balance(), initial);
        await page.evaluate(() => {
          window.noFill = true;
        });
        await button.tap();
        await button.waitFor({ state: "visible" });
        await page.waitForFunction(
          () =>
            !document.querySelector(".tronk-ad-offer") &&
            Boolean(
              [...document.querySelectorAll("button")].find(
                (b) =>
                  !b.disabled &&
                  b.getClientRects().length &&
                  /Ver anuncio · \+75 ATP|Ver anuncio · \+50 monedas|VER ANUNCIO · CONTINUAR UNA VEZ/.test(
                    b.textContent,
                  ),
              ),
            ),
        );
        assert.equal(await balance(), initial);
        await page.evaluate(() => {
          window.noFill = false;
        });
        await button.tap();
        await dialog.waitFor();
        await dialog.getByRole("button", { name: "Ver vídeo" }).tap();
        await page.waitForFunction(() => visibleAds === 1);
        await page.evaluate(() => finishAd(false));
        assert.equal(await balance(), initial);
        await button.tap();
        await dialog.waitFor();
        await dialog.getByRole("button", { name: "Ver vídeo" }).tap();
        await page.waitForFunction(() => visibleAds === 2);
        await page.evaluate(() => finishAd(true));
        await verify(initial);
        assert.equal(requests, 1, "load the SDK once per game page");
        if (path.includes("bio-lab")) {
          const canvas = page.locator("#board"),
            bounds = await canvas.boundingBox();
          const pos = {
            x: (bounds.width * 170) / 900,
            y: (bounds.height * 170) / 540,
          };
          await canvas.tap({ position: pos });
          await canvas.tap({ position: pos });
          await page.getByRole("button", { name: /^Mejorar/ }).tap();
          await page.getByRole("button", { name: /^Perforante/ }).tap();
          await page.getByText("Nano-Láser · Nivel 3 · Perforante").waitFor();
          await page.getByRole("button", { name: /^Objetivo/ }).tap();
          await page
            .getByRole("button", { name: /Más lejos del núcleo/ })
            .waitFor();
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
        await context.close();
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
