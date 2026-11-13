// Real chest rewards, reduced-motion reveal, rarity ordering and pickup contacts.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
  try{
    for(const mobile of [false,true])for(const reduced of [false,true]){
      const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,locale:'es-ES',ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      if(mobile)await page.route('**/three.min.js',r=>r.abort());
      await page.addInitScript(reduced=>localStorage.setItem('tronk-survivors',JSON.stringify({coins:20000,settings:{reducedMotion:reduced},owned:{ranjay:{stars:1}}})),reduced);
      await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8000'}/survivors/`);await page.waitForSelector('#menu.is-on',{timeout:90000});
      await page.evaluate(()=>{const pull=Save.pull;Save.pull=n=>{const result=pull(n);window.lastRewards=result;return result;};window.originalHeroOrder=TS.CHARACTERS.map(ch=>ch.id);});
      await page.locator('#menu [data-go="chars"]').first().click();
      const rarity=await page.locator('.char-card').evaluateAll(cards=>cards.map(c=>c.dataset.rarity));
      assert.deepEqual(rarity,[...rarity].sort((a,b)=>['comun','raro','epico','legendario'].indexOf(a)-['comun','raro','epico','legendario'].indexOf(b)));
      assert.deepEqual(await page.evaluate(()=>TS.CHARACTERS.map(ch=>ch.id)),await page.evaluate(()=>window.originalHeroOrder));
      await page.locator('#chars [data-go="menu"]').click();await page.locator('#menu [data-go="gacha"]').click();
      for(const count of [1,10]){
        const pulls=await page.evaluate(()=>Save.get().pulls);
        await page.evaluate(count=>{document.getElementById(`pull-${count}`).click();document.getElementById(`pull-${count}`).click();},count);
        assert.equal(await page.evaluate(()=>Save.get().pulls),pulls+count,'rapid clicks spend once');
        if(!reduced){await page.evaluate(()=>document.querySelector('#gacha [data-go="menu"]').click());assert.ok(await page.locator('#gacha.is-on').count());}
        await page.waitForSelector('#gacha-reveal:not([hidden])');
        await page.waitForFunction(()=>[...document.querySelectorAll('.reveal-card')].every(c=>Number(getComputedStyle(c).opacity)>.99 && (getComputedStyle(c).transform==='none' || new DOMMatrixReadOnly(getComputedStyle(c).transform).isIdentity)),{},{timeout:10000}).catch(async error=>{
          console.error(await page.locator('.reveal-card').evaluateAll(cards=>cards.map(c=>({opacity:getComputedStyle(c).opacity,transform:getComputedStyle(c).transform}))));throw error;
        });
        assert.equal(await page.locator('.reveal-card').count(),count);
        assert.deepEqual(await page.locator('.reveal-card b').allTextContents(),await page.evaluate(()=>window.lastRewards.map(r=>r.ch.name)));
        await page.waitForFunction(()=>[...document.querySelectorAll('.reveal-card img')].every(img=>img.complete&&img.naturalWidth>0));
        await page.locator('#reveal-ok').scrollIntoViewIfNeeded();assert.ok(await page.locator('#reveal-ok').isVisible());
        await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'reveal-ok');
        if(process.env.SCREENSHOTS_DIR){fs.mkdirSync(process.env.SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,`chest-${mobile?'mobile':'desktop'}-${reduced?'reduced':'animated'}-${count}.png`)});}
        await page.locator('#reveal-ok').click();assert.equal(await page.locator('#gacha-reveal').isVisible(),false);
      }
      await page.locator('#gacha [data-go="menu"]').click();await page.evaluate(()=>TronkUI.play([{charId:'ranjay'}]));await page.waitForFunction(()=>Game.state?.t>1);
      for(const [dx,dy] of [[25,0],[-25,0],[0,25],[0,-25]]){
        const collected=await page.evaluate(({dx,dy})=>{const st=Game.state,p=st.players[0];Game.setPaused(false);p.hp=50;st.pickups=[{kind:'bocadillo',x:p.x+dx,y:p.y+dy,t:0}];Game.step();Game.setPaused(true);return p.hp;},{dx,dy});
        assert.equal(collected,80);
      }
      assert.deepEqual(errors,[]);console.log(`${mobile?'mobile 2D':'desktop 3D'} / ${reduced?'reduced':'animated'}: chest 1/10 visible, no double spend, rarity and pickups passed`);await page.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
