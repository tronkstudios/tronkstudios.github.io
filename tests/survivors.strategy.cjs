const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{for(const mode of ['3d','2d','mobile']){
  const page=await browser.newPage({viewport:mode==='mobile'?{width:390,height:844}:{width:1280,height:800},isMobile:mode==='mobile',hasTouch:mode==='mobile',locale:'es-ES',ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1'});
  if(mode==='2d')await page.route('**/three.min.js',r=>r.abort());
  const errors=[];page.on('pageerror',e=>errors.push(e.stack));
  await page.addInitScript(()=>{localStorage.setItem('tronk-survivors',JSON.stringify({settings:{reducedMotion:true},tutorial:true}));});
  const shot=async name=>{if(process.env.SCREENSHOTS_DIR){fs.mkdirSync(process.env.SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,`${name}-${mode}.png`)});}};
  await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8000'}/survivors/`);await page.waitForSelector('#menu.is-on',{timeout:90000});
  await page.evaluate(()=>TronkUI.play([{charId:'duna'},{charId:'brasa'}],{mode:'host'}));await page.waitForFunction(()=>Game.state?.t>2);
  await page.evaluate(()=>{const st=Game.state;for(const p of st.players){p.stats.armor=100000;p.weapons[0].lvl=6;p.weapons[0].cd=99999;p.passives[TS.EVOLUTIONS[p.weapons[0].id].passive]=1;}const p=st.players[0];st.pickups=[{kind:'cofre',x:p.x,y:p.y,t:0}];Game.step();});
  await page.waitForFunction(()=>document.getElementById('levelup-title').textContent==='Elige tu recompensa');
  assert.equal(await page.locator('.up-card').count(),3);assert.match(await page.locator('.up-card').first().textContent(),/Ojo del huracán/);
  assert.equal(await page.locator('#levelup-reroll').isVisible(),false);await shot('evolution-choice');
  await page.locator('.up-card').first().click();assert.equal(await page.evaluate(()=>Game.state.players[0].weapons[0].path),'precision');
  await page.evaluate(()=>Game.choose(1,2));await page.waitForSelector('#levelup[hidden]',{state:'attached'});
  await page.evaluate(()=>{
   const st=Game.state,p=st.players[0];p.weapons[0].cd=99999;const x=p.x,y=p.y;
   st.enemies=['guardian','sanador','tirador'].map((type,i)=>({id:990+i,type,x:x+(i-1)*90,y:y-80,hp:100,maxHp:100,r:14,ai:TS.ENEMIES[type].ai,t:0,flash:0,guardAngle:Math.PI/2,face:1,dir:'down',vx:0,vy:0,state:0,atk:0}));
   st.zones=[{type:'dangerLine',x:x+90,y:y-80,tx:x,ty:y+90,t:20,life:60},{type:'dangerRing',x:x-120,y:y-30,r:60,gap:1,width:.6,t:25,life:60},
    {type:'hazard',x:x+100,y:y+100,r:35,warn:60,t:20,life:240,theme:'pools'},
    {type:'tornado',x:x-80,y:y+30,r:26,t:30,life:240,vx:0,vy:0,ignited:true},{type:'flame',x:x-80,y:y+30,ang:0,len:90,spread:.5,t:10,life:40}];
   st.pickups=[{kind:'bocadillo',x:x+85,y:y+20,t:0}];Game.setPaused(true);
  });await page.waitForTimeout(300);await shot('roles-warnings-combo-jensalada');
  if(mode==='3d')await page.evaluate(()=>{window.equipmentColors=new Set();const setColor=THREE.InstancedMesh.prototype.setColorAt;THREE.InstancedMesh.prototype.setColorAt=function(i,c){window.equipmentColors.add(c.getHex());return setColor.call(this,i,c);};});
  await page.evaluate(()=>{
   const st=Game.state,p=st.players[0];p.streak={count:50,best:50,until:st.t+240,flashUntil:st.t+70};p.loot={xp:120,coins:8,healed:20,until:st.t+150};st.zones=[];
   st.pickups=['cofre','moneda','iman','bocadillo'].map((kind,i)=>({kind,x:p.x-120+i*80,y:p.y+85,t:0}));
   st.enemies.push(...['barril','caja','jarron','brasero'].map((type,i)=>({id:1200+i,type,x:p.x-120+i*80,y:p.y+165,hp:20,maxHp:20,r:12,prop:true,t:0,vx:0,vy:0,flash:0})));
   st.boss={...st.enemies[0],tactic:'gaps'};
  });await page.waitForTimeout(300);
  if(mode==='3d'){const colors=await page.evaluate(()=>[...window.equipmentColors]);assert.ok(colors.includes(0x527b95),'guardian shield is rendered');assert.ok(colors.includes(0x8be7ac),'medic sign is rendered');}
  assert.equal(await page.locator('#hud-streak').isVisible(),true);assert.match(await page.locator('#hud-streak').textContent(),/50/);assert.match(await page.locator('#hud-loot').textContent(),/120 XP/);
  const hudBounds=await page.evaluate(()=>{
   const chain=document.getElementById('hud-streak').getBoundingClientRect(),boss=document.getElementById('hud-boss').getBoundingClientRect(),compass=document.getElementById('hud-compass').getBoundingClientRect(),toasts=document.getElementById('toasts').getBoundingClientRect();
   return {inView:chain.left>=0&&chain.right<=innerWidth&&chain.bottom<=innerHeight,toastOverlap:chain.left<toasts.right&&chain.right>toasts.left&&chain.top<toasts.bottom&&chain.bottom>toasts.top,compassOverlap:chain.left<compass.right&&chain.right>compass.left&&chain.top<compass.bottom&&chain.bottom>compass.top,overlap:chain.left<boss.right&&chain.right>boss.left&&chain.top<boss.bottom&&chain.bottom>boss.top};
  });assert.ok(hudBounds.inView);assert.equal(hudBounds.overlap,false);assert.equal(hudBounds.compassOverlap,false);assert.equal(hudBounds.toastOverlap,false);
  await page.waitForFunction(()=>document.getElementById('banner').hidden&&!document.getElementById('toasts').children.length);await shot('reward-feedback-and-objects');
  if(mode==='mobile'){await page.setViewportSize({width:844,height:390});await page.waitForTimeout(250);const fits=await page.evaluate(()=>{const a=document.getElementById('hud-streak').getBoundingClientRect(),b=document.getElementById('hud-ab').getBoundingClientRect();return a.right<=innerWidth&&a.bottom<=innerHeight&&!(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);});assert.ok(fits);await shot('reward-feedback-landscape');await page.setViewportSize({width:390,height:844});}
  if(mode==='3d'){await page.evaluate(()=>{window.testZoom=Game.options.zoom;Game.options.zoom=2.5;Game.resize();Game.state.players[0].y-=70;});await page.waitForTimeout(400);await shot('enemy-equipment-close');await page.evaluate(()=>{Game.options.zoom=window.testZoom;Game.resize();});}
  for(const map of ['bosque','cementerio','ciudad','playa']){
   await page.evaluate(map=>TronkUI.play([{charId:'ranjay'}],{map}),map);await page.waitForFunction(map=>Game.state?.mapId===map && Game.state.t>1,map);
   await page.evaluate(()=>{const st=Game.state,p=st.players[0];p.stats.armor=100000;p.weapons[0].cd=99999;const site=st.sites[0];
    if(site){p.x=site.x;p.y=site.y;for(let i=0;i<120;i++)Game.step();}
    else {let spot;for(let x=500;x<3000&&!spot;x+=100)for(let y=500;y<3000;y+=100)if(Game.terrain(x,y)===2){spot={x,y};break;}if(spot){p.x=spot.x;p.y=spot.y;Game.step();}}
    Game.setPaused(true);
   });await page.waitForTimeout(250);await shot(`map-${map}`);
  }
  await page.evaluate(()=>TronkUI.backToMenu());await page.locator('#menu [data-go="settings"]').click();await page.locator('#lang-select').selectOption('en');
  await page.evaluate(()=>TronkUI.play([{charId:'duna'}]));await page.waitForFunction(()=>Game.state?.t>1);
  await page.evaluate(()=>{const st=Game.state,p=st.players[0];p.weapons[0].lvl=6;p.passives.zapatillas=1;st.pickups=[{kind:'cofre',x:p.x,y:p.y,t:0}];Game.step();});
  await page.waitForFunction(()=>document.getElementById('levelup-title').textContent==='Choose your reward');
  assert.match(await page.locator('.up-card').first().textContent(),/Eye of the Hurricane/);await page.locator('.up-card').nth(2).click();
  assert.deepEqual(errors,[]);console.log(`${mode}: chest choices, evolution paths, roles, equipment, reward HUD, warnings, combos, all four maps and jensalada passed`);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
