// Touch/keyboard equipment inspection, rank previews and one-shot choice input.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try { for (const mobile of [false,true]) {
  const page = await browser.newPage({viewport:mobile?{width:320,height:568}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,locale:'es-ES',ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1'});
  page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',error=>errors.push(error.stack));
  if(mobile)await page.route('**/three.min.js',route=>route.abort());
  await page.route('**/game.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('    difficultyAt,','    _uiEmit:emit,_uiDescribe:describe,\n    difficultyAt,')});});
  await page.addInitScript(()=>{localStorage.setItem('tronk-lang','es');localStorage.setItem('tronk-survivors',JSON.stringify({runs:20,tutorial:true,settings:{reducedMotion:true}}));});
  await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:8769'}/survivors/`);await page.waitForSelector('#menu.is-on');
  await page.evaluate(()=>TronkUI.play([{charId:'iria'}],{seed:21}));await page.waitForFunction(()=>Game.state?.t>1);
  await page.evaluate(()=>{const st=Game.state,p=st.players[0];p.iframes=1e9;st.spawnT=st.nextElite=st.nextBreach=st.nextPressure=st.nextNest=1e12;p.techniques={burst:4,crossfire:1};p.techCds={burst:60,crossfire:120};p.passives={reloj:3};p.combat.bySkill.burst={damage:120,healing:0,control:2};});
  await page.locator('#hud-pause').click();
  assert.equal(await page.locator('#pause-build button').count(),4);
  assert.match(await page.locator('#pause-item-detail').textContent(),/Toca una pieza/);
  await page.locator('#pause-build [data-item="t:burst"]').click();
  assert.match(await page.locator('#pause-item-detail').textContent(),/Rango 4\/5/);
  assert.match(await page.locator('#pause-item-detail').textContent(),/Daño causado: 120/);
  assert.match(await page.locator('#pause-item-detail').textContent(),/Recarga:/);
  assert.equal(await page.locator('#pause-build [aria-pressed="true"]').count(),1);
  await page.locator('#pause-build [data-item="p:reloj"]').focus();await page.keyboard.press('Enter');
  assert.match(await page.locator('#pause-item-detail').textContent(),/Por rango: Las armas se recargan un 8 % antes/);
  assert.equal(await page.locator('#pause-build [aria-pressed="true"]').getAttribute('data-item'),'p:reloj');
  const fits=await page.locator('#pause-item-detail').evaluate(element=>{const r=element.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth;});assert.equal(fits,true);
  if(process.env.SCREENSHOTS_DIR){fs.mkdirSync(process.env.SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,`equipment-${mobile?'mobile':'desktop'}.png`)});}
  await page.locator('#pause-resume').click();
  // Physical keyboard presses and assistive clicks each invoke the active once.
  await page.evaluate(()=>{const press=Game.pressAbility;window.abilityPresses=0;Game.pressAbility=()=>{window.abilityPresses++;press();};});
  await page.locator('#hud-ab').focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>window.abilityPresses),1);
  await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>window.abilityPresses),2);
  await page.locator('#hud-ab').evaluate(button=>button.click());assert.equal(await page.evaluate(()=>window.abilityPresses),3);
  await page.evaluate(()=>{const p=Game.state.players[0];Game.setPaused(true);window.hostChoices={level:20,rerolls:3,options:[Game._uiDescribe(p,{kind:'technique',id:'burst',lvl:5}),Game._uiDescribe(p,{kind:'technique',id:'ring',lvl:1}),Game._uiDescribe(p,{kind:'passive',id:'reloj',lvl:4})]};Game._uiEmit('levelUp',window.hostChoices);p.techniques.burst=2;});
  await page.waitForSelector('.up-card:enabled');
  assert.match(await page.locator('.up-card').nth(0).locator('.upgrade-ranks').textContent(),/Rango 4 → 5\/5 · Rango máximo/);
  assert.equal(await page.locator('.up-card').nth(0).locator('.rank-steps .is-owned').count(),4);
  assert.equal(await page.locator('.up-card').nth(0).locator('.rank-steps .is-next').count(),1);
  assert.match(await page.locator('.up-card').nth(1).locator('.upgrade-ranks').textContent(),/Rango 0 → 1\/5/);
  assert.equal(await page.locator('.up-card').nth(1).locator('.rank-steps .is-owned').count(),0);
  // Rerender a host choice before the guest receives the corresponding rank snapshot.
  await page.evaluate(()=>{Game._uiEmit('levelUp',window.hostChoices);});
  await page.waitForSelector('.up-card:enabled');assert.match(await page.locator('.upgrade-ranks').first().textContent(),/Rango 4 → 5\/5/);assert.equal(await page.locator('.up-card').first().locator('.rank-steps .is-owned').count(),4);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(mobile){
   await page.locator('.up-card').nth(2).scrollIntoViewIfNeeded();
   const lastCardFits=await page.locator('.up-card').nth(2).evaluate(element=>{const r=element.getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth;});assert.equal(lastCardFits,true,'third choice fully reachable by scrolling');
   await page.locator('#levelup-reroll').scrollIntoViewIfNeeded();
   const rerollFits=await page.locator('#levelup-reroll').evaluate(element=>{const r=element.getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight;});assert.equal(rerollFits,true,'reroll remains reachable after three choices');
   if(process.env.SCREENSHOTS_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,'rank-choices-mobile-bottom.png')});
   await page.locator('#levelup .modal-box').evaluate(element=>element.scrollTop=0);
  }
  if(process.env.SCREENSHOTS_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,`rank-choices-${mobile?'mobile':'desktop'}.png`)});
  await page.evaluate(()=>{Game.setLocal(0,'guest');window.choiceMessages=0;TronkNet.sendChoice=()=>window.choiceMessages++;});
  await page.locator('.up-card').first().click();await page.keyboard.press('Digit1');await page.locator('.up-card').first().evaluate(button=>button.click());
  assert.equal(await page.evaluate(()=>window.choiceMessages),1);assert.equal(await page.locator('.up-card:enabled').count(),0);assert.equal(await page.locator('#levelup-reroll').isDisabled(),true);
  await page.evaluate(()=>{setLang('en');Game._uiEmit('resume',{});Game.setLocal(0,'solo');});
  await page.locator('#hud-pause').click();await page.locator('#pause-build [data-item="p:reloj"]').click();
  assert.match(await page.locator('#pause-item-detail').textContent(),/Per rank:/);
  assert.match(await page.locator('#pause-item-detail').textContent(),/Rank 3\/5/);
  assert.deepEqual(errors,[]);console.log(`${mobile?'Mobile 320px':'Desktop'}: inspect equipment, ranks, native cooldown, keyboard active, single guest choice and English passed`);await page.close();
 }} finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
