// Run against python3 -m http.server 8000; Playwright and Chromium required.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
      isMobile: true, hasTouch: true, locale: 'es-ES', ignoreHTTPSErrors: process.env.ALLOW_TEST_PROXY_CERT === '1' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:8000'}/survivors/`);
    await page.waitForSelector('#menu.is-on', { timeout: 90000 });
    assert.equal(await page.locator('#mobile-block').count(), 0);
    assert.equal(await page.evaluate(() => Render3D.ready), false);
    await page.locator('#menu [data-go="maps"]').tap();
    await page.locator('.map-card:not([disabled])').first().tap();
    await page.waitForFunction(() => Game.state && Game.state.t > 5);
    await page.evaluate(() => { const p = Game.state.players[0]; p.stats.armor = 10000; p.abCd = 0; });
    const center = async selector => {
      const box = await page.locator(selector).boundingBox();
      assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 391 && box.y + box.height <= 845, selector);
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const scale = await page.evaluate(()=>[Game.view.w/Game.view.k,Game.view.h/Game.view.k]);
    await page.evaluate(()=>{Game.options.fx='low';});await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(()=>[Game.view.w/Game.view.k,Game.view.h/Game.view.k]),scale,'quality changes preserve world scale');
    const pad = await center('#touch-pad');
    const ability = await center('#hud-ab');
    const cdp = await context.newCDPSession(page);
    const finger = { id: 1, ...pad };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] });
    const before = await page.evaluate(() => Game.state.players[0].x);
    finger.x += 34;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [finger] });
    // A second finger on the field must not steal the movement stick.
    const neutral = { id: 2, x: 200, y: 350 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger, neutral] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger, neutral, { id: 3, ...ability }] });
    await page.waitForTimeout(400);
    assert.ok(await page.evaluate(x => Game.state.players[0].x > x + 3, before), 'movement continues with multiple fingers');
    assert.ok(await page.evaluate(() => Game.state.abilitiesUsed > 0), 'ability while moving');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(100);
    const released = await page.evaluate(() => Game.state.players[0].x);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => Game.state.players[0].x), released, 'release stops movement');
    await page.locator('#hud-pause').tap();
    const tick = await page.evaluate(() => Game.state.t);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => Game.state.t), tick);
    await page.locator('#pause-resume').tap();
    await page.evaluate(() => { Game.state.pendingLevels = 1; Game.state.choosing = {0:[{kind:'heal'}]};
      TronkUI.showLevelUp({level:2,options:[{kind:'heal',title:'Curación',desc:'Recupera vida',icon:'bocadillo'}]}); });
    await page.locator('.up-card').first().tap();
    assert.equal(await page.locator('#levelup').isVisible(), false);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(200);
    for (const selector of ['#touch-pad', '#hud-ab', '#hud-pause']) {
      const box = await page.locator(selector).boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 845 && box.y + box.height <= 391, selector + ' landscape');
    }
    await page.evaluate(() => {
      const p=Game.state.players[0];
      p.weapons=Object.keys(TS.WEAPONS).slice(0,6).map(id=>({id,lvl:1,cd:100,drones:[]}));
      p.passives=Object.fromEntries(Object.keys(TS.PASSIVES).slice(0,6).map(id=>[id,1]));
    });
    await page.waitForTimeout(200);
    const layout = await page.evaluate(() => {
      const slots=document.getElementById('hud-slots').getBoundingClientRect();
      const pad=document.getElementById('touch-pad').getBoundingClientRect();
      const ability=document.getElementById('hud-ab').getBoundingClientRect();
      return {slots:slots.toJSON(),pad:pad.toJSON(),ability:ability.toJSON()};
    });
    assert.ok(layout.slots.left > layout.pad.right && layout.slots.right < layout.ability.left, 'full build does not cover touch controls');
    await page.evaluate(() => Game.finish(false));
    await page.waitForSelector('#end:not([hidden])');
    await page.locator('#end-again').tap();
    await page.waitForFunction(() => Game.state && !Game.state.over && Game.state.t > 5);
    // Verify a narrow phone and a small landscape viewport with a full build,
    // a boss and a four-player HUD, without running extra combat scenarios.
    await page.evaluate(()=>{
      const p=Game.state.players[0];
      p.weapons=Object.keys(TS.WEAPONS).slice(0,6).map(id=>({id,lvl:1,cd:100,drones:[]}));
      p.passives=Object.fromEntries(Object.keys(TS.PASSIVES).slice(0,6).map(id=>[id,1]));
      Game.state.players=[p,...[1,2,3].map(id=>({...p,id,name:`Tronker ${id}`}))];
      Game.state.boss={type:'rey',hp:100,maxHp:100,x:0,y:0};
      Game.setPaused(true);
    });
    for (const viewport of [{width:320,height:568},{width:568,height:320},{width:390,height:844},{width:844,height:390}]) {
      await page.setViewportSize(viewport);await page.waitForTimeout(180);
      for (const selector of ['#touch-pad','#hud-ab','#hud-pause','#hud-slots','#hud-boss']) {
        const box=await page.locator(selector).boundingBox();
        assert.ok(box && box.x>=0 && box.y>=0 && box.x+box.width<=viewport.width+1 && box.y+box.height<=viewport.height+1,`${selector} ${viewport.width}x${viewport.height}`);
      }
    }
    assert.deepEqual(errors, []);
    if (process.env.SCREENSHOTS_DIR) {
      fs.mkdirSync(process.env.SCREENSHOTS_DIR, { recursive: true });
      await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,'survivors-mobile-landscape.png')});
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,'survivors-mobile-portrait.png')});
    }
    console.log('Mobile: portrait, landscape, multitouch, ability, pause, level up, full build and restart passed');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
