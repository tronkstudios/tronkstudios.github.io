const {chromium}=require("playwright");
const assert=require("node:assert/strict");

(async()=>{
  const browser=await chromium.launch({
    executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",
    args:["--no-sandbox","--enable-unsafe-swiftshader"]
  });
  try{
    for(const mobile of [false,true]){
      const page=await browser.newPage({
        viewport:mobile?{width:390,height:844}:{width:1150,height:730},
        isMobile:mobile,hasTouch:mobile,locale:"es-ES",ignoreHTTPSErrors:true
      });
      const errors=[];
      page.on("pageerror",error=>errors.push(error.stack));
      if(mobile)await page.route("**/three.min.js",route=>route.abort());
      await page.route("**/*supabase-js*",route=>route.abort());
      await page.addInitScript(()=>{
        localStorage.setItem("tronk-lang","es");
        localStorage.setItem("tronk-survivors",JSON.stringify({
          runs:4,tutorial:true,selected:"iria",owned:{ranjay:{stars:1},iria:{stars:1}},
          mastery:{iria:true}
        }));
      });
      await page.goto((process.env.BASE_URL||"http://127.0.0.1:8771")+"/survivors/");
      await page.waitForSelector("#menu.is-on",{timeout:90000});
      await page.evaluate(()=>TronkUI.show("chars"));
      await page.locator('[data-char-id="iria"]').click();
      assert.match(await page.locator(".profile-mastery").textContent(),/Dominio conseguido/);
      await page.evaluate(()=>TronkUI.show("maps"));
      await page.locator("#run-sprint").check();
      await page.locator("#maps-grid .map-card").first().click();
      await page.waitForFunction(()=>Game.state?.sprint && Game.state.t>2);
      assert.equal(await page.evaluate(()=>Game.hudData().runSeconds),600);
      await page.evaluate(()=>{
        const state=Game.state,player=state.players[0];
        state.enemies=[];
        state.spawnT=1e9;
        player.abCd=0;
        player.weapons[0].cd=1e9;
      });
      const box=await page.locator("#hud-ab").boundingBox();
      const x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
      if(mobile){
        const cdp=await page.context().newCDPSession(page);
        const point=(target)=>[{x,y:target,id:1}];
        await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:point(y)});
        await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:point(y-66)});
        await page.locator("#ability-aim").waitFor({state:"visible"});
        await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
      }else{
        await page.mouse.move(x,y);
        await page.mouse.down();
        await page.mouse.move(x,y-66,{steps:4});
        await page.locator("#ability-aim").waitFor({state:"visible"});
        await page.mouse.up();
      }
      await page.waitForFunction(()=>Game.state.abilitiesUsed===1);
      assert.equal(await page.evaluate(()=>Game.state.shots.every(shot=>shot.vy<0)),true);
      assert.equal(await page.locator("#ability-aim").isHidden(),true);
      await page.evaluate(()=>{
        const state=Game.state, player=state.players[0], camp=state.sites[0];
        player.x=camp.x-90;player.y=camp.y;
      });
      await page.locator("#camp-medic").click();
      await page.evaluate(()=>{
        const state=Game.state, player=state.players[0], camp=state.sites[0];
        player.x=camp.x;player.y=camp.y;camp.progress=119;
      });
      await page.waitForFunction(()=>Game.state.sites[0].defenders?.some(unit=>unit.type==="tronkSanitario"));
      assert.deepEqual(errors,[]);
      console.log((mobile?"Móvil 2D":"Escritorio 3D")+": arrastre, destello de dominio, partida rápida y selección del sanitario aprobados.");
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
