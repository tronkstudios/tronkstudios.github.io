// Hostile shapes, torso-space placement and reduced-motion visual regressions.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  for(const mobile of process.env.THREATS_DESKTOP_ONLY==='1'?[false]:[false,true]){
   const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,locale:'es-ES',ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1'});
   const errors=[];page.on('pageerror',e=>errors.push(e.stack));
   if(mobile)await page.route('**/three.min.js',route=>route.abort());
   else await page.route('**/render3d.js*',async route=>{
    const response=await route.fetch();
    const source=(await response.text()).replace('    draw,','    _threatProbe(name){const p=pools[name];return {count:p.count,matrices:Array.from(p.instanceMatrix.array.slice(0,p.count*16)),colors:Array.from(p.instanceColor.array.slice(0,p.count*3))};},\n    draw,');
    await route.fulfill({response,body:source+'\n{const render=Render3D.draw;Render3D.draw=d=>{window.threatFrame=d;return render(window.threatFixture||d);};}'});
   });
   await page.addInitScript(()=>{localStorage.setItem('tronk-lang','es');localStorage.setItem('tronk-survivors',JSON.stringify({runs:20,tutorial:true,settings:{fx:'high'}}));});
   await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8769'}/survivors/`);
   await page.waitForSelector('#menu.is-on',{timeout:90000});
   const icons=await page.evaluate(()=>{
    const kinds=['bullet','star','goo','orb'];
    return kinds.map(kind=>{const c=Sprites.enemyShot(kind),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let edge=0,filled=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=data[(y*c.width+x)*4+3];if(a)filled++;if((x===0||y===0||x===c.width-1||y===c.height-1)&&a)edge++;}return {kind,url:c.toDataURL(),w:c.width,h:c.height,edge,filled};});
   });
   assert.equal(new Set(icons.map(i=>i.url)).size,4,'hostile families have distinct silhouettes');
   for(const icon of icons){assert.equal(icon.w,14);assert.equal(icon.h,14);assert.equal(icon.edge,0,`${icon.kind} has no clipped outline`);assert.ok(icon.filled>20);}
   assert.equal(await page.evaluate(()=>Sprites.enemyShot('unknown')===Sprites.enemyShot('orb')),true);
   await page.evaluate(()=>TronkUI.play([{charId:'ranjay'}],{seed:43}));
   await page.waitForFunction(()=>Game.state?.t>2);
   await page.evaluate(()=>{Game.setPaused(true);Game.state.enemies=[];});
   if(!mobile){
    await page.waitForFunction(()=>window.threatFrame);
    const result=await page.evaluate(()=>{
     const base={...threatFrame,actors:[],sites:[],gems:[],pickups:[],shots:[],eshots:[],zones:[],fx:[],auras:[],drones:[],shake:0,t:0,reducedMotion:true};
     const sample=(extra,name)=>{Render3D.draw({...base,...extra});return Render3D._threatProbe(name);};
     const gem={x:0,y:0,v:3};
     const gemA=sample({gems:[gem],t:1},'octa'),gemB=sample({gems:[gem],t:150},'octa');
     const bolt={type:'bolt',pts:[[20,-80],[0,0]],t:1,life:30};
     const boltA=sample({zones:[bolt]},'glowCyl'),boltB=sample({zones:[bolt]},'glowCyl');
     const x=12,y=34,normal=sample({eshots:[{kind:'bullet',x,y}]},'glow');
     const contrast=sample({eshots:[{kind:'bullet',x,y}],contrast:true},'glow');
     const warning=sample({zones:[{type:'hazard',x:0,y:0,r:45,warn:60,t:15,life:240}]},'warningCyl');
     const nearing=sample({zones:[{type:'hazard',x:0,y:0,r:45,warn:60,t:45,life:240}]},'warningCyl');
     const active=sample({zones:[{type:'hazard',x:0,y:0,r:45,warn:60,t:65,life:240}]},'glowCyl');
     const activeProjected=[0,1].map(i=>{
      const m=active.matrices.slice(i*16,(i+1)*16);
      return [-.5,.5].map(v=>Render3D.project(m[12]+m[4]*v,m[14]+m[6]*v,m[13]+m[5]*v,1280,800));
     });
     const crowded=Array.from({length:100},(_,i)=>({type:'dangerLine',x:i,y:0,tx:i,ty:200,t:0,life:60}));
     const crowdedLines=sample({zones:[...crowded,bolt]},'glowCyl');
     const crowdedClocks=Render3D._threatProbe('warningCyl');
     Render3D.draw(threatFrame);
     return {gemA,gemB,boltA,boltB,normal,contrast,warning,nearing,active,activeProjected,crowdedLines,crowdedClocks};
    });
    assert.deepEqual(result.gemA,result.gemB,'reduced motion keeps gems still');
    assert.deepEqual(result.boltA,result.boltB,'reduced motion keeps lightning stable');
    assert.equal(result.normal.matrices[12],12);assert.equal(result.normal.matrices[13],18);assert.equal(result.normal.matrices[14],50,'torso-space shot is restored to ground depth');
    assert.deepEqual(result.contrast.matrices.slice(-48),result.normal.matrices,'contrast halo preserves projectile placement');
    assert.ok(result.warning.count>result.nearing.count,'countdown arc visibly decreases');assert.equal(result.active.count,2,'active hazard replaces countdown with a cross');
    const slopes=result.activeProjected.map(([a,b])=>{const dx=b[0]-a[0],dy=b[1]-a[1];assert.ok(Math.abs(dx)>2 && Math.abs(dy)>2,'active hazard arms project diagonally, not as a healing plus');return dx*dy;});
    assert.ok(slopes[0]*slopes[1]<0,'diagonal arms cross as an X on screen');
    assert.equal(result.crowdedClocks.count,600,'countdown budget stays bounded');
    assert.equal(result.crowdedLines.count,101,'all 100 threat lines and lightning remain visible when countdown budget fills');
    const matrices=[...result.warning.matrices,...result.nearing.matrices,...result.active.matrices];assert.ok(matrices.every(Number.isFinite));
   }
   await page.evaluate(()=>{
    const st=Game.state,p=st.players[0];p.weapons[0].cd=99999;
    st.zones=[{type:'dangerLine',x:p.x-100,y:p.y-80,tx:p.x+70,ty:p.y+30,t:15,life:60},{type:'hazard',x:p.x-85,y:p.y+70,r:45,t:15,warn:60,life:240,theme:'pools'},{type:'hazard',x:p.x+85,y:p.y+70,r:45,t:65,warn:60,life:240,theme:'pools'}];
    st.eshots=['bullet','star','goo','orb'].map((kind,i)=>({kind,x:p.x-75+i*50,y:p.y-90}));
   });
   await page.waitForTimeout(120);
   if(process.env.SCREENSHOTS_DIR){fs.mkdirSync(process.env.SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,`threats-${mobile?'mobile':'desktop'}.png`)});}
   assert.deepEqual(errors,[]);console.log(`${mobile?'Mobile 2D':'Desktop 3D'}: four hostile silhouettes, unclipped sprites${mobile?'':', warning countdown, active hazards and reduced motion'} passed`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
