// Specialization choices, real stat comparisons and build summary on desktop/mobile.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,locale:'es-ES',ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1'});page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));
  if(mobile)await page.route('**/three.min.js',r=>r.abort());
  await page.addInitScript(()=>localStorage.setItem('tronk-survivors',JSON.stringify({runs:1,tutorial:true,settings:{lang:'es',reducedMotion:true}})));
  await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8000'}/survivors/`);await page.waitForSelector('#menu.is-on',{timeout:90000});
  await page.evaluate(()=>TronkUI.play([{charId:'ranjay'}],{mode:'solo',map:'bosque',seed:42}));await page.waitForFunction(()=>Game.state?.t>1);
  await page.evaluate(()=>{const st=Game.state,p=st.players[0];p.iframes=999999;p.weapons[0].cd=999999;st.level=14;st.t=300*60;st.xp=st.xpNext;Game.step();});
  await page.waitForSelector('.up-card.is-talent:enabled');assert.equal(await page.locator('.up-card.is-talent').count(),3);assert.match(await page.locator('#levelup-title').textContent(),/Define tu especialización/);assert.equal(await page.locator('#levelup-reroll').isVisible(),false);
  for(const card of await page.locator('.up-card').all()){assert.equal(await card.locator('.is-gain').count(),1);assert.equal(await card.locator('.is-loss').count(),1);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(process.env.SCREENSHOTS_DIR){fs.mkdirSync(process.env.SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,`specialization-${mobile?'mobile':'desktop'}.png`)});}
  await page.locator('.up-card').nth(1).click();await page.waitForSelector('#levelup[hidden]',{state:'attached'});assert.equal(await page.evaluate(()=>Game.state.players[0].talents[0]),'reach');
  await page.locator('#hud-pause').click();assert.match(await page.locator('#pause-talents').textContent(),/Cobertura/);assert.match(await page.locator('#pause-talents').textContent(),/Nivel 30 · 12:00/);
  await page.locator('#pause-resume').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.tagName),'SUMMARY');await page.keyboard.press('Space');assert.match(await page.locator('#pause-stats').textContent(),/120%/);assert.match(await page.locator('#pause-stats').textContent(),/106%/);assert.equal(await page.locator('#pause-stats dd').count(),11);await page.locator('#pause-resume').click();
  await page.evaluate(()=>{Game.state.xp=Game.state.xpNext;Game.step();});await page.waitForSelector('.up-card:enabled');assert.equal(await page.locator('.up-card.is-talent').count(),0);assert.ok(await page.locator('.choice-stats').count()>0);await page.locator('.up-card').first().click();
  await page.evaluate(()=>Game.finish(false));await page.waitForSelector('#end:not([hidden])');assert.match(await page.locator('#end-talents').textContent(),/Cobertura/);
  if(!mobile){
   await page.evaluate(()=>{setLang('en');TronkUI.play([{charId:'iria'}],{mode:'solo',seed:7});});await page.waitForFunction(()=>Game.state?.players[0].charId==='iria'&&Game.state.t>1);
   await page.evaluate(()=>{const st=Game.state;st.players[0].iframes=999999;st.level=14;st.t=300*60;st.xp=st.xpNext;Game.step();});await page.waitForSelector('.up-card.is-talent:enabled');
   assert.match(await page.locator('#levelup-title').textContent(),/Choose your specialization/);assert.match(await page.locator('.up-card').first().textContent(),/Weapon mastery/);assert.match(await page.locator('.choice-stats').first().textContent(),/Power/);
  }
  assert.deepEqual(errors,[]);console.log(`${mobile?'Mobile':'Desktop'}: specializations, tradeoff comparisons, native weapons, pause stats and final build passed`);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
