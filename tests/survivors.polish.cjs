// Visual polish, navigation, accessibility, rerolls and combat HUD.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
  try {
    for(const mode of ['3d','2d','mobile']) {
      const page=await browser.newPage({viewport:mode==='mobile'?{width:390,height:844}:{width:1280,height:800},
        isMobile:mode==='mobile',hasTouch:mode==='mobile',locale:'es-ES',ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1'});
      if(mode==='2d')await page.route('**/three.min.js',r=>r.abort());
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      const shot=async name=>{if(process.env.SCREENSHOTS_DIR){fs.mkdirSync(process.env.SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,`${name}-${mode}.png`)});}};
      await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8000'}/survivors/`);
      await page.waitForSelector('#menu.is-on',{timeout:90000});
      await shot('menu');
      assert.equal(await page.locator('.menu-intro').textContent(),'Domina tu arma. Resiste la horda.');
      assert.ok(await page.locator('#menu [data-go="maps"]').isVisible());
      await page.locator('#menu [data-go="settings"]').click();
      await page.locator('#opt-motion').check();await page.locator('#opt-contrast').check();await page.locator('#opt-zoom').selectOption('1.5');
      assert.ok(await page.evaluate(()=>Game.options.reducedMotion && Game.options.contrast && Game.options.zoom===1.5));
      await page.reload();await page.waitForSelector('#menu.is-on',{timeout:90000});
      assert.ok(await page.evaluate(()=>Game.options.reducedMotion && Game.options.contrast && Game.options.zoom===1.5));
      await page.evaluate(()=>TronkUI.play([{charId:'ranjay'}]));
      await page.waitForFunction(()=>Game.state?.t>1);
      await page.evaluate(()=>{
        const st=Game.state,p=st.players[0];p.stats.armor=100000;p.weapons[0].cd=100000;
        st.t=300*60-1;Game.step();const e=st.enemies.find(e=>e.elite);st.enemies=[e];
        e.x=p.x+100;e.y=p.y+30;e.baseSpeed=0;e.speed=0;
        p.techniques={burst:1,ring:1};p.techCds={burst:200,ring:300};
        st.pickups=[{kind:'cofre',x:p.x+400,y:p.y-80,t:0}];
        st.eshots=[{x:p.x+50,y:p.y+45,kind:'bullet',vx:0,vy:0,dmg:0,life:600}];
        p.combat={dealt:1234,taken:20,healed:7,elites:2};
        Game.setPaused(true);
      });
      await page.waitForFunction(()=>document.querySelectorAll('#hud-slots .is-technique').length===2);
      assert.match(await page.locator('#hud-compass').textContent(),/Cofre/);
      assert.ok(await page.locator('.tech-cooldown').first().evaluate(e=>parseFloat(e.style.height)>0));
      await shot('combat');
      await page.locator('#hud-pause').click();
      assert.match(await page.locator('#pause-evolution').textContent(),/Excalibur/);
      assert.match(await page.locator('#pause-metrics').textContent(),/1[., ]?234/);
      await page.locator('#pause-resume').focus();await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'pause-quit');
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'pause-resume');
      await shot('pause');
      await page.locator('#pause-resume').click();
      await page.evaluate(()=>{Game.state.xp=Game.state.xpNext;Game.step();});
      await page.waitForSelector('#levelup:not([hidden])');
      await page.locator('#levelup-reroll').click();
      assert.match(await page.locator('#levelup-reroll').textContent(),/2\/3/);
      assert.equal(await page.locator('.up-card').count(),3);await shot('upgrades');
      await page.locator('.up-card').first().click();
      await page.waitForSelector('#levelup[hidden]',{state:'attached'});
      // Focusing away freezes solo combat until an explicit resume.
      await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
      assert.ok(await page.locator('#pause').isVisible());
      const tick=await page.evaluate(()=>Game.state.t);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>Game.state.t),tick);
      await page.locator('#pause-resume').click();
      await page.evaluate(()=>{Game.options.fx='low';Game.setPaused(true);});await page.waitForTimeout(250);
      await shot('low-quality');
      await page.evaluate(()=>Game.finish(false));await page.waitForSelector('#end:not([hidden])');
      assert.match(await page.locator('#end-stats').textContent(),/Daño causado/);
      await shot('results');
      await page.locator('#end-menu').click();await page.locator('#menu [data-go="settings"]').click();
      await page.locator('#lang-select').selectOption('en');
      assert.equal(await page.locator('#opt-motion').locator('..').innerText(),'Reduce motion and flashes');
      await page.locator('#settings [data-go="menu"]').click();
      assert.equal(await page.locator('.menu-intro').textContent(),'Master your weapon. Hold back the horde.');
      await page.evaluate(()=>TronkUI.play([{charId:'ranjay'}]));await page.waitForFunction(()=>Game.state?.t>1);
      await page.locator('#hud-pause').click();
      assert.match(await page.locator('#pause-evolution').textContent(),/Meet both requirements/);
      assert.deepEqual(errors,[]);console.log(`${mode}: design, persisted accessibility/zoom, elite HUD, compass, metrics, focus, reroll and auto-pause passed`);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
