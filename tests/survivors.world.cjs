// Shared map rendering/collision data and real synthesized sound buffers.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800},locale:'es-ES',ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1'});const errors=[];page.on('pageerror',e=>errors.push(e.stack));
  await page.route('**/three.min.js',r=>r.abort());
  await page.route('**/render3d.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\n{ const init=Render3D.init;Render3D.init=(el,api)=>{window.worldProbe=api;return init(el,api);}; }'});});
  await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8000'}/survivors/`);await page.waitForSelector('#menu.is-on',{timeout:90000});
  await page.locator('#menu [data-go="settings"]').click();
  await page.evaluate(()=>{window.previewNames=[];window.originalPlay=Sfx.play;Sfx.play=(...a)=>{previewNames.push(a[0]);originalPlay(...a);};});
  for(const cue of ['bow','growl','enemyMagic']){await page.selectOption('#sfx-sample',cue);await page.locator('#sfx-preview').click();assert.equal(await page.evaluate(()=>previewNames.at(-1)),cue);}
  await page.evaluate(()=>{const el=document.getElementById('vol-sfx');el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));previewNames.length=0;});await page.locator('#sfx-preview').click();assert.equal(await page.evaluate(()=>previewNames.length),0);
  await page.evaluate(()=>{const el=document.getElementById('vol-sfx');el.value='90';el.dispatchEvent(new Event('input',{bubbles:true}));Sfx.play=originalPlay;});
  await page.locator('#lang-select').selectOption('en');assert.equal(await page.locator('#sfx-preview').textContent(),'Listen');await page.locator('#lang-select').selectOption('es');await page.locator('#settings [data-go="menu"]').click();
  for(const map of ['bosque','cementerio','ciudad','playa']){
   await page.evaluate(map=>TronkUI.play([{charId:'iria'}],{map,seed:42}),map);await page.waitForFunction(()=>Game.state?.t>1);
   const result=await page.evaluate(()=>{
    Game.setPaused(true);const found=[],problems=[];worldProbe.obstaclesNear(0,0,1400,ob=>found.push(ob));
    for(const ob of found){const r=(ob.r||ob.line||8)+8;
     if([[0,0],[r,0],[-r,0],[0,r],[0,-r]].some(([x,y])=>Game.terrain(ob.x+x,ob.y+y)===2))problems.push(`${ob.kind} in water`);
     if(ob.solid&&Game.mapId!=='ciudad'&&Game.terrain(ob.x,ob.y)===1)problems.push(`${ob.kind} on path`);
    }
    const again=[];worldProbe.obstaclesNear(0,0,1400,ob=>again.push(ob));
    if(JSON.stringify(found)!==JSON.stringify(again))problems.push('scenery changes between draws');
    // Both renderers receive these exact textures, including negative chunks.
    for(const [x,y] of [[-1,-1],[0,0],[1,1]]){const c=worldProbe.chunkCanvas(x,y),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;if(d.some((v,i)=>i%4===3&&v!==255))problems.push('transparent terrain seam');}
    const p=Game.state.players[0];p.x=Game.mapId==='playa'?250:240;p.y=Game.mapId==='ciudad'?80:240;p.weapons[0].cd=99999;Game.state.enemies=[];
    return {count:found.length,problems};
   });assert.ok(result.count>10,`${map}: scenery remains populated`);assert.deepEqual(result.problems,[]);
   await page.waitForTimeout(400);if(process.env.SCREENSHOTS_DIR){fs.mkdirSync(process.env.SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,`world-${map}-2d.png`)});}
  }
  assert.deepEqual(errors,[]);console.log('World: four maps, negative chunks, opaque terrain and dry, repeatable scenery passed');await page.close();
  const audioSource=fs.readFileSync(path.join(__dirname,'../survivors/js/audio.js'),'utf8');
  const cues=['bow','drum','chime','coil','fan','vial','flame','growl','bones','ghost','bat','slime','radio','roar','guard','enemyHeal','enemyAim','enemyMagic','fuse'];
  const sample=async(name,{gain=1,mute=false,repeat=1}={})=>{
   const p=await browser.newPage();await p.setContent('<html></html>');
   await p.evaluate(()=>{const Offline=window.OfflineAudioContext;window.AudioContext=class extends Offline{constructor(){super(1,96000,48000);window.audioProbe=this;window.audioNodes=0;}resume(){return Promise.resolve();}createOscillator(){window.audioNodes++;return super.createOscillator();}createBufferSource(){window.audioNodes++;return super.createBufferSource();}};});
   await p.addScriptTag({content:audioSource+'\nwindow.testSfx=Sfx;'});
   const result=await p.evaluate(async({name,gain,mute,repeat})=>{testSfx.init();testSfx.setEnabled('sfx',!mute);for(let i=0;i<repeat;i++)testSfx.play(name,.1,gain);const buffer=await audioProbe.startRendering(),d=buffer.getChannelData(0);let sum=0,peak=0;for(const v of d){sum+=v*v;peak=Math.max(peak,Math.abs(v));}return {rms:Math.sqrt(sum/d.length),peak,nodes:audioNodes};},{name,gain,mute,repeat});await p.close();return result;
  };
  for(const cue of cues){const r=await sample(cue);assert.ok(r.rms>0.00001,`${cue}: audible signal`);assert.ok(Number.isFinite(r.peak)&&r.peak<1,`${cue}: bounded signal`);}
  assert.equal((await sample('bow',{mute:true})).rms,0);
  const normal=await sample('bow'),quiet=await sample('bow',{gain:.2}),repeated=await sample('bow',{repeat:10});
  assert.ok(quiet.rms<normal.rms*.5);assert.equal(repeated.nodes,normal.nodes,'same cue does not stack at time zero');
  console.log('Audio: 19 synthesized cues, mute, distance gain, finite output and repetition limits passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
