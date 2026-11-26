const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"]
  });
  try {
    for (const mobile of [false, true]) {
      const page = await browser.newPage({
        locale: "es-ES", hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1,
        viewport: mobile ? {width:390,height:844} : {width:1150,height:730},
        ignoreHTTPSErrors: process.env.ALLOW_TEST_PROXY_CERT === "1"
      });
      if (mobile) await page.route("**/three.min.js", route => route.abort());
      await page.route("**/*supabase-js*", route => route.abort());
      await page.route("**/game.js*", async route => {
        const response = await route.fetch();
        const source = (await response.text()).replace("    difficultyAt,", "    _spawn:spawnEnemy,\n    difficultyAt,");
        await route.fulfill({response,body:source});
      });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto((process.env.BASE_URL || "http://127.0.0.1:8771") + "/survivors/");
      await page.waitForSelector("#menu.is-on", {timeout:90000});
      const runs = await page.evaluate(() => Save.get().runs);
      await page.evaluate(() => TronkUI.show("chars"));
      await page.locator('[data-char-id="iria"]').click();
      await page.getByRole("combobox",{name:"Objetivo de práctica"}).selectOption("shield");
      await page.getByRole("combobox",{name:"Equipo de prueba"}).selectOption("max");
      await page.getByRole("button",{name:"Campo de pruebas"}).click();
      await page.waitForFunction(() => Game.state?.training === "shield");
      assert.equal(await page.evaluate(() => Game.state.enemies[0].type),"guardian");
      assert.equal(await page.evaluate(() => Game.state.players[0].weapons[0].lvl),6);
      await page.waitForFunction(() => Game.state.players[0].combat.dealt > 0);
      await page.waitForFunction(() => document.getElementById("hud-world").textContent.includes("Prueba de 20 s"));
      await page.locator("#hud-pause").click();
      await page.locator("#training-preset").selectOption("base");
      await page.locator("#pause-retry-training").click();
      await page.waitForFunction(() => Game.state?.trainingPreset === "base" && Game.state.t > 0);
      assert.equal(await page.evaluate(() => Game.state.players[0].weapons[0].lvl), 1);
      assert.equal(await page.evaluate(() => Object.keys(Game.state.players[0].techniques).length), 0);
      await page.evaluate(() => {
        while (Game.state.t < 1200) Game.step();
      });
      const damage = await page.evaluate(() => Game.state.trainingSample);
      assert.ok(damage > 0);
      await page.waitForFunction(() => document.getElementById("hud-world").textContent.includes("DPS"));
      await page.evaluate(() => { for (let i = 0; i < 300; i++) Game.step(); });
      assert.equal(await page.evaluate(() => Game.state.trainingSample), damage);
      await page.locator("#hud-pause").click();
      await page.locator("#training-preset").selectOption("max");
      await page.locator("#pause-retry-training").click();
      await page.waitForFunction(() => Game.state?.trainingPreset === "max" && Game.state.t > 0);
      assert.equal(await page.evaluate(() => Game.state.players[0].weapons[0].lvl), 6);
      await page.evaluate(() => { while (Game.state.t < 1200) Game.step(); });
      await page.locator("#hud-pause").click();
      assert.match(await page.locator("#training-comparison").textContent(), /Frente a la prueba anterior/);
      await page.getByRole("button",{name:"Salir del campo de pruebas"}).click();
      await page.waitForSelector("#chars.is-on");
      assert.equal(await page.evaluate(() => Save.get().runs),runs);
      await page.evaluate(() => TronkUI.show("settings"));
      await page.locator("#opt-soft-attacks").check();
      assert.equal(await page.evaluate(() => Game.options.softAttacks),true);
      await page.evaluate(() => TronkUI.show("maps"));
      await page.locator("#run-veteran").check();
      await page.locator("#maps-grid .map-card").first().click();
      await page.waitForFunction(() => Game.state?.mods.includes("veterano") && Game.state.t > 2);
      const guards = await page.evaluate(() => {
        const state = Game.state, camp = state.sites[0], player = state.players[0];
        player.x = camp.x;
        player.y = camp.y;
        state.enemies = [];
        state.spawnT = 1e9;
        camp.progress = 119;
        Game.step();
        const [guard] = camp.defenders;
        const target = Game._spawn("zombi", guard.x + 100,guard.y);
        target.speed = 0;
        target.hp = target.maxHp = 1e5;
        return camp.defenders.length;
      });
      assert.equal(guards,2);
      await page.waitForFunction(() => Game.state.players[0].combat.bySkill.camp?.damage > 0);
      await page.waitForFunction(() => document.getElementById("hud-world").textContent.includes("Defensores"));
      assert.deepEqual(errors,[]);
      console.log((mobile?"Mobile 2D":"Desktop 3D") + ": training, Veteran, display setting and camp guards passed");
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
