// Result recaps, meaningful records, encounter planning and modal lifecycle.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,locale:'es-ES',ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1'});const errors=[];page.on('pageerror',e=>errors.push(e.stack));
  if(mobile)await page.route('**/three.min.js',r=>r.abort());
  await page.route('**/render3d.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\n{const init=Render3D.init;Render3D.init=(el,api)=>{window.insightsWorld=api;return init(el,api);};}'});});
  await page.addInitScript(()=>localStorage.setItem('tronk-survivors',JSON.stringify({runs:1,tutorial:true,best:{time:1,kills:1,level:1,wins:0,streak:3},settings:{lang:'es',reducedMotion:true}})));
  await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8000'}/survivors/`);await page.waitForSelector('#menu.is-on',{timeout:90000});
  const oldMap=await page.evaluate(()=>Game.mapId);await page.locator('#menu [data-go="maps"]').click();
  const preview=await page.locator('#maps-grid canvas').nth(2).evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let sand=0,sea=0;for(let i=0;i<d.length;i+=4){if(d[i]>150&&d[i+1]>130&&d[i+2]<200)sand++;if(d[i]<100&&d[i+2]>d[i+1]&&d[i+1]>90)sea++;}return {sand:sand/(d.length/4),sea:sea/(d.length/4)};});assert.ok(preview.sand>.2&&preview.sea>.15);assert.equal(await page.evaluate(()=>Game.mapId),oldMap);
  const play=async mode=>{await page.evaluate(mode=>{window.previousState=Game.state;TronkUI.play([{charId:'ranjay'}],{mode,map:'bosque',seed:42});},mode);await page.waitForFunction(()=>Game.state&&Game.state!==window.previousState&&Game.state.t>1);};
  await play('solo');
  if(!mobile){const collisions=await page.evaluate(()=>{
   const props=[];insightsWorld.obstaclesNear(0,0,1800,ob=>{if(ob.solid)props.push(ob);});const checks=[];
   for(const ob of [props.find(o=>o.r>=15),props.find(o=>o.line)]){
    if(!ob)throw Error('missing collision fixture');const p=Game.state.players[0];p.iframes=99999;p.weapons[0].cd=99999;p.x=ob.x-p.stats.speed;p.y=ob.y;Game.state.enemies=[];
    Game.setPaused(false);Game.setInput(0,{x:1,y:0,ab:0});Game.step();Game.setPaused(true);
    const px=ob.line?Math.max(ob.x-ob.line,Math.min(ob.x+ob.line,p.x)):ob.x;
    checks.push(Math.hypot(p.x-px,p.y-ob.y)>=(ob.line?7:ob.r)+7*1.7-.01);
   }return checks;
  });assert.deepEqual(collisions,[true,true]);}
  await play('solo');await page.evaluate(()=>{Game.setPaused(true);const p=Game.state.players[0];p.streak.best=22;p.combat.revives=2;});await page.locator('#hud-pause').click();
  assert.match(await page.locator('#pause-metrics').textContent(),/22/);assert.match(await page.locator('#pause-metrics').textContent(),/Reanimaciones/);assert.ok(await page.locator('#pause-encounters li').count());assert.equal(await page.locator('#pause-live').isVisible(),false);await page.locator('#pause-resume').click();
  await play('host');await page.locator('#hud-pause').click();assert.equal(await page.locator('#pause-live').isVisible(),true);assert.match(await page.locator('#pause-quit').textContent(),/para todos/);const tick=await page.evaluate(()=>Game.state.t);await page.waitForFunction(t=>Game.state.t>t,tick);await page.locator('#pause-resume').click();
  await play('solo');await page.evaluate(()=>{const st=Game.state,p=st.players[0];p.streak.best=22;p.combat.revives=2;p.hp=12;p.iframes=0;p.weapons[0].cd=99999;st.enemies=[];st.eshots=[{x:p.x,y:p.y-18,vx:0,vy:0,dmg:50,r:4,life:10,source:'tirador'}];Game.step();});await page.waitForSelector('#end:not([hidden])');
  assert.equal(await page.locator('#end-recap').isVisible(),true);assert.match(await page.locator('#recap-hits').textContent(),/Tirador de precisión/);assert.match(await page.locator('#recap-hits').textContent(),/−12/);assert.match(await page.locator('#recap-advice').textContent(),/proyectiles/);assert.match(await page.locator('#end-records').textContent(),/Mejor racha/);assert.equal(await page.evaluate(()=>Save.get().best.streak),22);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'end-title');assert.equal(await page.locator('#end .modal-box').evaluate(el=>el.scrollTop),0);
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'end-menu');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'end-again');
  if(process.env.SCREENSHOTS_DIR){fs.mkdirSync(process.env.SCREENSHOTS_DIR,{recursive:true});await page.locator('#end-title').focus();await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,`recap-${mobile?'mobile':'desktop'}.png`)});}
  // A finished run cannot reopen its modal over a newly entered menu.
  await play('solo');await page.evaluate(()=>{Game.finish(false);TronkUI.backToMenu();});await page.waitForTimeout(1050);assert.equal(await page.locator('#end').isVisible(),false);assert.equal(await page.locator('#menu').evaluate(el=>el.classList.contains('is-on')),true);
  // A pending load cannot resurrect a game after going back to the menu.
  await page.evaluate(()=>{TronkUI.play([{charId:'ranjay'}]);TronkUI.backToMenu();});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>Game.state),null);
  await page.evaluate(()=>TronkUI.playGuest({localId:1,map:'bosque',players:[{charId:'ranjay',name:'Host'},{charId:'lia',name:'Guest'}]}));await page.waitForFunction(()=>Game.mode==='guest'&&Game.state);
  await page.evaluate(()=>{
   Game.state.over=true;window.submittedResult=null;Account.submitRun=r=>{window.submittedResult=r;return Promise.resolve(null);};
   TronkUI.showEnd({victory:false,seconds:30,kills:2,level:2,coins:3,bosses:0,map:'bosque',charId:'ranjay',bestStreak:45,combat:[{bestStreak:45},{bestStreak:9,revives:1}],recaps:[{fatal:{source:'zombi',kind:'contact'},hits:[{source:'zombi',kind:'contact',amount:20,at:100}]},{fatal:{source:'general',kind:'projectile'},hits:[{source:'general',kind:'projectile',amount:10,at:100}]}]});
  });await page.waitForSelector('#end:not([hidden])');assert.match(await page.locator('#recap-hits').textContent(),/General Antitronk/);assert.doesNotMatch(await page.locator('#recap-hits').textContent(),/Zombi/);assert.equal(await page.evaluate(()=>submittedResult.charId),'lia');assert.equal(await page.evaluate(()=>submittedResult.bestStreak),9);assert.equal(await page.evaluate(()=>Save.get().best.streak),22);
  assert.deepEqual(errors,[]);console.log(`${mobile?'Mobile':'Desktop'}: map preview, records, death recap, encounters, live co-op menu, focus and lifecycle passed`);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
