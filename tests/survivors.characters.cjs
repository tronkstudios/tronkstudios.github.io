// Character palette, grounding, head direction and consistent portrait framing.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1'});
  await page.route('**/three.min.js',r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8000'}/survivors/`);await page.waitForSelector('#menu.is-on',{timeout:90000});
  const result=await page.evaluate(()=>{
   const failures=[],views={down:0,downSide:Math.PI/4,side:Math.PI/2,upSide:Math.PI*3/4,up:Math.PI};let frames=0;
   const hasColor=(canvas,hex)=>{const n=parseInt(hex.slice(1),16),d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;for(let i=0;i<d.length;i+=4)if(d[i]===(n>>16)&&d[i+1]===((n>>8)&255)&&d[i+2]===(n&255)&&d[i+3]===255)return true;return false;};
   for(const ch of TS.CHARACTERS){
    const o=Stick.characterOptions(ch),set=Sprites.get(`char:${ch.id}`),portrait=Sprites.portraitCanvas(ch.id);
    if(o.weapon!==ch.weapon||o.legs!==ch.pants)failures.push(`${ch.id}: outfit data mismatch`);
    if(!hasColor(set.down.idle,ch.pants)||!hasColor(portrait,ch.pants))failures.push(`${ch.id}: trousers disappear between menu and game`);
    for(const [view,group] of Object.entries(set)){
     if(view.endsWith('Flash'))continue;
     for(const [index,c] of [group.idle,...group.walk,...group.attack].entries()){
      frames++;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let bottom=null;const shoe=parseInt(o.shoes.slice(1),16);
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4]===(shoe>>16)&&d[(y*c.width+x)*4+1]===((shoe>>8)&255)&&d[(y*c.width+x)*4+2]===(shoe&255)&&d[(y*c.width+x)*4+3]===255)bottom=y;
      if(bottom!==null&&Math.abs((bottom-c.foot)/c.res)>1.5)failures.push(`${ch.id}:${view}:${index}: foot contact drifts ${(bottom-c.foot)/c.res}`);
     }
    }
   }
   // The maul head must stay above ground throughout the attack, not sink
   // beneath the feet when the wrist folds down at the impact frame.
   for(let i=0;i<6;i++){
    const pose=Stick.rig.pose('smash','attack',i,6),J=Stick.rig.joints(pose);
    if(J.fHand[1]+Math.cos(pose.w*Math.PI/180)*63+24>3)failures.push(`maul: ground penetration in frame ${i}`);
   }
   for(const view of Object.keys(views)){
    let foot=null;
    for(const ch of TS.CHARACTERS){
     const c=Stick.illustration(ch,view),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
     if(foot===null)foot=c.foot;if(Math.abs(c.foot-foot)>.01)failures.push(`${ch.id}:${view}: portrait camera changes`);
     for(let x=0;x<c.width;x++)if(d[x*4+3]||d[((c.height-1)*c.width+x)*4+3])failures.push(`${ch.id}:${view}: portrait vertical crop`);
     for(let y=0;y<c.height;y++)if(d[y*c.width*4+3]||d[(y*c.width+c.width-1)*4+3])failures.push(`${ch.id}:${view}: portrait horizontal crop`);
    }
   }
   // Inspect the face itself, excluding carried weapons and hats/antennae.
   const faceColor=(id,view,hex)=>{
    const ch=TS.CHARACTERS.find(ch=>ch.id===id),o=Stick.characterOptions(ch),c=Sprites.get(`char:${id}`)[view].idle;
    const J=Stick.rig.joints(Stick.rig.pose(Stick.rig.styleOf(o),'idle')),yaw=views[view],cy=Math.cos(yaw),sy=Math.sin(yaw);
    const project=(pt,lat=0)=>[pt[0]*sy-lat*cy,pt[1]+(pt[0]*cy+lat*sy)*.28];
    const floor=Math.max(project(J.fFoot,8)[1],project(J.bFoot,-8)[1])+3,head=project(J.head),scale=.33*c.res;
    const x=Math.round(c.width/2+head[0]*scale),y=Math.round(c.foot+(head[1]-floor)*scale),rx=Math.ceil(4*c.res),ry=Math.ceil(1.8*c.res);
    const d=c.getContext('2d').getImageData(x-rx,y-ry,rx*2,ry*2).data,n=parseInt(hex.slice(1),16);let count=0;
    for(let i=0;i<d.length;i+=4)if(d[i]===(n>>16)&&d[i+1]===((n>>8)&255)&&d[i+2]===(n&255)&&d[i+3]===255)count++;
    return count;
   };
   const front=faceColor('boro','down','#7ce8ff'),rear=faceColor('boro','up','#7ce8ff');
   if(front<5||rear>0)failures.push(`Boro: visor front=${front}, rear=${rear}`);
   for(const id of ['nix','brasa'])if(faceColor(id,'down','#14112b')>0)failures.push(`${id}: duplicate eyes over mask`);
   return {failures,frames};
  });assert.deepEqual(result.failures,[]);assert.equal(result.frames,24*5*15);assert.deepEqual(errors,[]);
  if(process.env.SCREENSHOTS_DIR){fs.mkdirSync(process.env.SCREENSHOTS_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS_DIR,`characters-menu-${mobile?'mobile':'desktop'}.png`)});}
  console.log(`${mobile?'Mobile':'Desktop'}: ${result.frames} character frames, palettes, foot contact, five-view portraits and mask direction passed`);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
