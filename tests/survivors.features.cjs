// New starters, abilities, final-phase HUD and detailed enemy geometry in both renderers.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',
    headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
  try {
    for(const fallback of [false,true]) {
      const page=await browser.newPage({ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1',viewport:{width:1280,height:800},locale:'es-ES'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      const shot=async name=>{
        if(!process.env.SCREENSHOTS_DIR)return;
        fs.mkdirSync(process.env.SCREENSHOTS_DIR,{recursive:true});
        await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,name)});
      };
      if(fallback)await page.route('**/three.min.js',r=>r.abort());
      await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8000'}/survivors/`);
      await page.waitForSelector('#menu.is-on',{timeout:90000});
      const heroIds=await page.evaluate(()=>TS.CHARACTERS.map(ch=>ch.id));
      for(const id of heroIds) {
        await page.evaluate(id=>TronkUI.play([{charId:id}],{}),id);
        await page.waitForFunction(id=>Game.state&&Game.state.players[0].charId===id&&Game.state.t>1,id);
        await page.evaluate(()=>{
          const p=Game.state.players[0];p.abCd=0;p.weapons[0].cd=0;p.weapons[0].lvl=6;p.weapons[0].evo=true;
          p.techniques=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,5]));p.techCds=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,0]));p.input={x:0,y:0,ab:1};
          Game.state.enemies=[{id:999,type:'zombi',x:p.x+80,y:p.y,r:10,hp:100000,maxHp:100000,speed:0,dmg:0,ai:'chase',prop:false,
            t:0,vx:0,vy:0,kx:0,ky:0,slow:0,slowAmt:0,dodgeCd:0,atk:0}];
          for(let i=0;i<9;i++)Game.step();Game.setPaused(true);
        });
        await page.waitForTimeout(180);
        assert.equal(await page.evaluate(()=>Game.state.abilitiesUsed),1);
        assert.equal(await page.evaluate(()=>Game.hudData().techniques.length),6);
        assert.ok(await page.evaluate(()=>Game.state.players[0].techCds.burst>0&&Game.state.players[0].techCds.ring>0));
        if(['ranjay','duna','lumen','iria','boro','vega','tala'].includes(id))await shot(`${id}-${fallback?'2d':'3d'}.png`);
      }
      await page.evaluate(()=>{
        Game.start([{charId:'ranjay'}]);Game.state.t=TS.RUN_SECONDS*60-1;Game.state.bossIdx=3;
        Game.step();Game.setPaused(true);
      });
      await page.waitForFunction(()=>document.getElementById('hud-boss-name').textContent.includes('Fase 1'),{},{timeout:10000});
      assert.equal(await page.locator('#victory').isVisible(),false);
      if(!fallback) {
        await page.evaluate(()=>{
          Game.stop();Game.stopDemo();document.getElementById('game').style.display='none';
          document.querySelectorAll('.screen,.hud,.modal,#banner,#toasts').forEach(e=>e.style.display='none');
          const ids=['zombi','casco','gordo','antitronk','ninja','esqueleto','brujo','rey'];
          Render3D.draw({cx:0,cy:10,wH:210,t:60,actors:ids.map((id,i)=>({kind:'enemy',id,
            x:(i%4-1.5)*65,y:Math.floor(i/4)*90-50,ang:Math.PI*.4,moving:false,scale:1.4})),
            gems:[],pickups:[],shots:[],eshots:[],zones:[],fx:[],auras:[],drones:[]});
        });
        await shot('enemies-closeup.png');
      }
      assert.deepEqual(errors,[]);
      console.log(`${fallback?'2D':'3D'}: 24 personal movesets, abilities, effects and minute-25 HUD passed`);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
