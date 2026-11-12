// Optional browser regression: requires Playwright and a local HTTP server.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function checkSprites(page) {
  return page.evaluate(() => {
    const clipped = [];
    const sets = [
      ...TS.CHARACTERS.map(ch => [ch.id, Sprites.get(`char:${ch.id}`)]),
      ...Object.keys(Stick.ENEMIES).map(id => [id, Sprites.get(`enemy:${id}`)])
    ];
    for (const [id, frames] of sets) {
      for (const [dir, set] of Object.entries(frames)) {
        if (dir.endsWith('Flash')) continue;
        const flashSet = frames[`${dir}Flash`];
        for (const [i, canvas] of [set.idle, ...set.walk, ...set.attack].entries()) {
          const { width: w, height: h } = canvas;
          const flash = [flashSet.idle, ...flashSet.walk, ...flashSet.attack][i];
          if (flash.width !== w || flash.height !== h || flash.foot !== canvas.foot) clipped.push(`${id}:${dir}:${i}:flash-anchor`);
          const flashPixels = flash.getContext('2d').getImageData(0, 0, w, h).data;
          const pixels = canvas.getContext('2d').getImageData(0, 0, w, h).data;
          for (let px = 3; px < pixels.length; px += 4) {
            if (pixels[px] !== flashPixels[px]) { clipped.push(`${id}:${dir}:${i}:flash-alpha`); break; }
          }
          let edge = false;
          for (let x = 0; x < w; x++) {
            if (pixels[x * 4 + 3] || pixels[((h - 1) * w + x) * 4 + 3]) edge = true;
          }
          for (let y = 0; y < h; y++) {
            if (pixels[y * w * 4 + 3] || pixels[(y * w + w - 1) * 4 + 3]) edge = true;
          }
          if (edge) clipped.push(`${id}:${dir}:${i}`);
        }
      }
    }
    return clipped;
  });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader']
  });
  try {
    for (const fallback of [false, true]) {
      const page = await browser.newPage({
        ignoreHTTPSErrors: process.env.ALLOW_TEST_PROXY_CERT === '1',
        viewport: { width: 1280, height: 800 },
        locale: 'es-ES'
      });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        window.invalidDraws = [];
        for (const method of ['moveTo', 'lineTo', 'arc', 'ellipse', 'translate', 'scale', 'rotate', 'fillRect']) {
          const original = CanvasRenderingContext2D.prototype[method];
          CanvasRenderingContext2D.prototype[method] = function (...args) {
            if (args.some(n => typeof n === 'number' && !Number.isFinite(n))) {
              window.invalidDraws.push({ method, args, stack: new Error().stack });
            }
            return original.apply(this, args);
          };
        }
      });
      if (fallback) await page.route('**/three.min.js', route => route.abort());
      await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:8000'}/survivors/`);
      await page.waitForSelector('#menu.is-on', { timeout: 90000 });
      assert.equal(await page.evaluate(() => Render3D.ready), !fallback);
      assert.deepEqual(await checkSprites(page), []);
      await page.evaluate(() => TronkUI.play());
      await page.waitForFunction(() => Game.state && Game.state.t > 15, {}, { timeout: 90000 });
      const before = await page.evaluate(() => Game.state.players[0].x);
      await page.keyboard.down('d');
      await page.waitForTimeout(350);
      await page.keyboard.up('d');
      assert.ok(await page.evaluate(x => Game.state.players[0].x > x, before));
      await page.keyboard.press('Escape');
      const tick = await page.evaluate(() => Game.state.t);
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => Game.state.t), tick);
      await page.keyboard.press('Escape');

      const maps = await page.evaluate(() => Object.keys(TS.MAPS));
      for (const map of maps) {
        await page.evaluate(map => {
          Game.start(TS.CHARACTERS.map(ch => ({ charId: ch.id })), { map });
          const st = Game.state;
          st.enemies = Object.entries(TS.ENEMIES).map(([type, def], i) => ({
            id: i + 1, type, x: (i % 7) * 75 - 225, y: Math.floor(i / 7) * 65 - 120,
            dir: 'down', face: 1, t: 20, walkT: 20, vx: 1, vy: 1, r: def.r,
            hp: def.hp, maxHp: def.hp, atk: 0, prop: !!def.prop, ai: def.ai, boss: !!def.boss
          }));
          st.players.forEach((p, i) => {
            p.x = (i % 8) * 65 - 225;
            p.y = 180 + Math.floor(i / 8) * 80;
          });
          Game.setPaused(true);
        }, map);
        await page.waitForTimeout(200);
      }
      if (process.env.SCREENSHOTS_DIR) {
        fs.mkdirSync(process.env.SCREENSHOTS_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.SCREENSHOTS_DIR, `survivors-${fallback ? '2d' : '3d'}.png`) });
      }
      assert.deepEqual(await page.evaluate(() => window.invalidDraws), []);
      assert.deepEqual(errors, []);
      console.log(`${fallback ? '2D' : '3D'}: sprites, movement, pause and all maps passed`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
