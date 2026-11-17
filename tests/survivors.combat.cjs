// Distinct native kits, matching sword poses, relic rewards and announced midgame formations.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,locale:'es-ES',ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1'});page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));if(mobile)await page.route('**/three.min.js',r=>r.abort());
  await page.addInitScript(()=>localStorage.setItem('tronk-survivors',JSON.stringify({runs:4,tutorial:true,settings:{lang:'es',reducedMotion:true},owned:{ranjay:{stars:1},iria:{stars:1},duna:{stars:1}}})));
  await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8000'}/survivors/`);await page.waitForSelector('#menu.is-on',{timeout:90000});
  const shot=async name=>{if(process.env.SCREENSHOTS_DIR){fs.mkdirSync(process.env.SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,`${name}-${mobile?'mobile':'desktop'}.png`)});}};
  const geometry=await page.evaluate(()=>{
   const out=[],set=Sprites.get('char:ranjay');for(const dir of ['down','downSide','side','upSide','up'])for(let i=0;i<6;i++){
    const c=set[dir].thrust[i],f=set[dir+'Flash'].thrust[i],d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let edge=false;for(let x=0;x<c.width;x++)if(d[x*4+3]||d[((c.height-1)*c.width+x)*4+3])edge=true;for(let y=0;y<c.height;y++)if(d[(y*c.width)*4+3]||d[(y*c.width+c.width-1)*4+3])edge=true;
    if(edge||c.width!==f.width||c.height!==f.height||c.foot!==f.foot)out.push(`${dir}:${i}`);
   }return out;
  });assert.deepEqual(geometry,[]);
  await page.locator('#menu [data-go="chars"]').first().click();for(const id of ['ranjay','iria','duna']){await page.locator(`[data-char-id="${id}"]`).click();assert.equal(await page.locator('.char-moves .move-icon').count(),10);assert.equal(await page.locator('.char-moves .move-icon').evaluateAll(imgs=>new Set(imgs.map(i=>i.src)).size),10);assert.equal(await page.locator('.char-moves').evaluate(el=>el.scrollWidth>el.clientWidth),false);}await shot('distinct-guide');
  const play=async charId=>{await page.evaluate(charId=>{window.oldCombatState=Game.state;TronkUI.play([{charId}],{seed:41});},charId);await page.waitForFunction(()=>Game.state&&Game.state!==window.oldCombatState&&Game.state.t>2);};
  for(const charId of ['ranjay','iria','duna']){
   await play(charId);await page.evaluate(charId=>{
    const st=Game.state,p=st.players[0];st.sites=[];st.xpNext=1e9;st.bossIdx=3;st.hordeIdx=99;st.spawnT=1e9;st.nextBreach=st.nextElite=st.nextPressure=1e12;p.iframes=1e9;p.weapons[0].cd=1e9;
    p.techniques={pierce:3};p.techCds={pierce:0};st.enemies=[{id:999,type:'zombi',x:p.x+180,y:p.y,r:10,hp:100000,maxHp:100000,speed:0,dmg:0,ai:'chase',prop:false,t:0,vx:0,vy:0,kx:0,ky:0,slow:0,slowAmt:0,dodgeCd:0,atk:0,timer:999999}];Game.setPaused(false);Game.step();Game.setPaused(true);
   },charId);await page.waitForFunction(()=>document.querySelectorAll('#hud-slots .is-technique').length===1);assert.ok(await page.locator('#hud-slots .is-technique img').getAttribute('src'));await shot(`native-${charId}`);
  }
  await play('iria');await page.evaluate(()=>{const st=Game.state,p=st.players[0];p.iframes=1e9;p.weapons[0].cd=1e9;p.weapons[0].lvl=6;p.weapons[0].evo=true;p.passives[TS.EVOLUTIONS.arco.passive]=1;st.chests=1;st.pickups=[{kind:'cofre',x:p.x,y:p.y,t:0}];Game.step();});
  await page.waitForSelector('.up-card.is-relic:enabled');assert.match(await page.locator('.up-card.is-relic').textContent(),/Reliquia/);await shot('relic-choice');
  await page.evaluate(()=>{setLang('en');TronkUI.showLevelUp({kind:'chest',level:Game.state.level,options:Game.state.choosing[0],rerolls:0});});await page.waitForSelector('.up-card.is-relic:enabled');assert.match(await page.locator('.up-card.is-relic').textContent(),/Relic/);assert.match(await page.locator('.up-card.is-technique small').textContent(),/Cooldown/);await page.locator('.up-card.is-relic').click();await page.waitForSelector('#levelup[hidden]',{state:'attached'});assert.equal(await page.evaluate(()=>Game.hudData().relics.length),1);
  await page.locator('#hud-pause').click();assert.match(await page.locator('#pause-relics').textContent(),/1\/2/);assert.equal(await page.locator('#pause-relics img').count(),1);await shot('relic-pause');await page.locator('#pause-resume').click();
  await page.evaluate(()=>{const st=Game.state;st.t=600*60;st.nextPressure=st.t;st.nextBreach=st.nextElite=1e12;st.bossIdx=3;st.boss=null;st.hordeIdx=99;st.spawnT=1e9;st.enemies=[];st.zones=[];Game.step();Game.setPaused(true);});assert.equal(await page.evaluate(()=>Game.state.zones.some(z=>z.type==='pincer')),true);await shot('pincer-warning');
  await page.evaluate(()=>{setLang('en');Game.finish(false);});await page.waitForSelector('#end:not([hidden])');assert.match(await page.locator('#end-relics').textContent(),/Relic:/);assert.doesNotMatch(await page.locator('#end-relics').textContent(),/undefined/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log(`${mobile?'Mobile 2D':'Desktop 3D'}: 30 native technique icons, 30 sword thrust frames, relic rewards, local build and pincer warnings passed`);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
