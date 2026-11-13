const {chromium}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,locale:'es-ES',ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const shot=async name=>{if(process.env.SCREENSHOTS_DIR){fs.mkdirSync(process.env.SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,`${name}-${mobile?'mobile':'desktop'}.png`)});}};
  await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8000'}/survivors/`);await page.waitForSelector('#menu.is-on',{timeout:90000});
  await page.evaluate(()=>{const d=Save.get();d.owned=Object.fromEntries(TS.CHARACTERS.map(ch=>[ch.id,{stars:1}]));d.selected='lumen';d.settings.reducedMotion=true;Save.persist();TronkUI.show('menu');});
  await shot('lumen-menu');await page.locator('#menu [data-go="chars"]').first().click();
  assert.equal(await page.locator('.char-card').count(),24);
  const portraits=await page.evaluate(()=>TS.CHARACTERS.map(ch=>{
    const c=Sprites.portraitCanvas(ch.id),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let edge=false;for(let x=0;x<c.width;x++)if(p[x*4+3] || p[((c.height-1)*c.width+x)*4+3])edge=true;
    for(let y=0;y<c.height;y++)if(p[(y*c.width)*4+3] || p[(y*c.width+c.width-1)*4+3])edge=true;
    return {id:ch.id,edge,detail:p.filter((_,i)=>i%4===3&&p[i]>0).length,icon:Sprites.iconUrl(ch.weapon).length};
  }));assert.ok(portraits.every(p=>!p.edge&&p.detail>1000&&p.icon>50));
  await page.locator('[data-char-id="duna"]').click();assert.match(await page.locator('.char-moves').textContent(),/Tormenta total/);await shot('duna-moves');
  await page.locator('#chars [data-go="menu"]').click();await page.locator('#menu [data-go="settings"]').click();await page.locator('#opt-bars').selectOption('always');
  await page.evaluate(()=>TronkUI.play([{charId:'lumen'},{charId:'duna'}]));await page.waitForFunction(()=>Game.state?.t>2);
  await page.evaluate(()=>{
   const st=Game.state,[p,ally]=st.players;p.stats.armor=100000;p.weapons[0].cd=9999;st.t=120*60-1;Game.step();
   const target=st.enemies.find(e=>e.breach);target.x=p.x+110;target.y=p.y+15;target.hp*=.5;
   const minion={...target,id:99999,elite:false,breach:false,x:p.x-100,y:p.y,baseSpeed:0};st.enemies.push(minion);
   ally.down=true;ally.hp=0;ally.x=p.x+10;ally.y=p.y;Game.step();Game.setPaused(true);
  });
  await page.waitForFunction(()=>document.getElementById('hud-team').textContent.includes('Reanimación'));
  assert.match(await page.locator('#hud-phase').textContent(),/Brecha 0\/4/);assert.match(await page.locator('#hud-milestone').textContent(),/Próxima técnica/);
  await shot('breach-health-revival');
  await page.locator('#hud-pause').click();await page.locator('#pause-resume').click();
  await page.evaluate(()=>{const p=Game.state.players[0];p.techniques=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,5]));Game.setPaused(true);});
  await page.waitForFunction(()=>document.querySelectorAll('#hud-slots .is-technique').length===6);
  assert.equal(await page.locator('#hud-slots [data-technique="VI"]').count(),1);await shot('six-techniques');
  await page.evaluate(()=>TronkUI.backToMenu());await page.locator('#menu [data-go="settings"]').click();await page.locator('#lang-select').selectOption('en');
  assert.equal(await page.locator('#opt-bars').locator('..').innerText(),'Enemy health bars\nWhen damaged\nAlways\nHidden');
  assert.deepEqual(errors,[]);console.log(`${mobile?'Mobile':'Desktop'}: 24 illustrations, six moves, bars, objectives and cooperative revival passed`);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
