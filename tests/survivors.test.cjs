// Run with: node --test tests/survivors.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function engine(raw = null) {
  const context = vm.createContext({ console, performance, Math, Map, Set,
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    localStorage: { getItem: () => raw && JSON.stringify(raw), setItem() {} },
    Sfx: new Proxy({}, { get: () => () => {} }),
    Sprites: { get() {} }, L: s => s, LT: s => s });
  for (const file of ['data', 'save', 'game']) vm.runInContext(fs.readFileSync(path.join(__dirname, `../survivors/js/${file}.js`), 'utf8'), context);
  return vm.runInContext('({Game, Save, TS})', context);
}
const setup = charId => ({ charId, name: charId });
test('invalid chest counts do not alter coins, pity or free pull', () => {
  const { Save } = engine();
  const before = JSON.stringify(Save.get());
  for (const n of [-10, 0, 2, 1.5, Infinity, NaN]) assert.equal(Save.pull(n), null);
  assert.equal(JSON.stringify(Save.get()), before);
});
test('effects use simulation time and freeze during pause and choices', () => {
  const { Game } = engine(); Game.start([setup('ranjay')]);
  Game.state.fx.push({ k: 'warn', t: 0, life: 2 });
  Game.setPaused(true); Game.step(); assert.equal(Game.state.fx[0].t, 0);
  Game.setPaused(false); Game.step(); assert.equal(Game.state.fx[0].t, 1);
  Game.step(); assert.equal(Game.state.fx.length, 0);
});
test('disconnect resolves pending choice and prevents reviving an absent peer', () => {
  const { Game } = engine(); Game.start([setup('ranjay'), setup('lia')]);
  Game.state.pendingLevels = 1;
  Game.state.choosing = { 0: [{kind:'heal'}], 1: [{kind:'heal'}] };
  Game.choose(0, 0); Game.dropPlayer(1);
  assert.equal(Game.state.choosing, null);
  const p = Game.state.players[1]; p.x = Game.state.players[0].x; p.y = Game.state.players[0].y;
  for (let i=0;i<180;i++) Game.step();
  assert.equal(p.down, true); assert.equal(p.hp, 0);
});
test('guest round trip preserves attack and movement, ignores old packets, clears enemy cache', () => {
  const { Game } = engine(); Game.start([setup('ranjay')]);
  const p = Game.state.players[0]; p.moveX=-0.6; p.moveY=0.8; p.atk={t:8,total:18,ax:-0.3,ay:-0.7};
  Game.state.t=20; Game.state.endless=true; Game.state.endlessStart=10; Game.state.finalPhase=true; Game.state.finalRound=3; Game.setPaused(true);
  const snap = Game.snapshot([p]);
  const info={localId:0,players:[setup('ranjay')]};
  Game.startGuest(info); Game.applySnapshot(snap);
  assert.equal(Game.state.players[0].atk.ax, -0.3);
  assert.equal(Game.state.players[0].moveX, -0.6);
  assert.equal(Game.state.endless, true); assert.equal(Game.state.frozen,true);
  assert.equal(Game.state.finalPhase,true);assert.equal(Game.state.finalRound,3);
  Game.applySnapshot({...snap,t:19,k:999}); assert.equal(Game.state.kills, 0);
  Game.state.fx.push({t:0,life:3}); Game.applySnapshot({...snap,t:24}); assert.equal(Game.state.fx.length,0);
  // A reused enemy ID must acquire the new run's type.
  const enemy=(ti,t)=>({...snap,t,e:[[1,ti,10,20,0,1,1,t,0,0,0]]});
  Game.applySnapshot(enemy(0,25)); Game.startGuest(info); Game.applySnapshot(enemy(1,1));
  assert.equal(Game.state.enemies[0].type, Object.keys(engine().TS.ENEMIES)[1]);
});
test('every character and weapon simulates without invalid coordinates', () => {
  const { Game, TS } = engine();
  for (const ch of TS.CHARACTERS) {
    Game.start([setup(ch.id)],{seed:12345});
    const p=Game.state.players[0]; p.stats.armor=10000; p.stats.regen=100;
    p.weapons=[{id:ch.weapon,lvl:6,evo:true,cd:0,combo:0,comboT:0,drones:[]}];
    p.techniques=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,5]));p.techCds=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,0]));
    for(let i=0;i<1800;i++) {
      if(Game.state.choosing) for(const id of Object.keys(Game.state.choosing)) Game.choose(+id,0);
      Game.setInput(0,{x:Math.sin(i/100),y:Math.cos(i/100),ab:Math.floor(i/300)}); Game.step();
    }
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.hp),ch.id);
    for(const e of Game.state.enemies) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.hp),ch.id+':'+e.type);
    assert.equal(Game.state.over,false,ch.id);
  }
});
test('all maps enter a relentless final encounter at twenty-five minutes and continue after a broken health bar', () => {
  const { Game, TS } = engine();
  let result;Game.on('end',r=>{result=r;});
  for (const [map, def] of Object.entries(TS.MAPS)) {
    Game.start([setup('ranjay')],{seed:54321,map});
    const st=Game.state,p=st.players[0];p.stats.armor=10000;p.stats.might=10000;
    p.stats.area=10;p.weapons=[{id:'tajo',lvl:6,evo:true,cd:0,combo:0,comboT:0,drones:[]}];
    st.t=TS.RUN_SECONDS*60-1;st.bossIdx=TS.BOSSES.length-1;st.hordeIdx=TS.HORDES.length;
    Game.step();assert.equal(st.boss.type,def.finalBoss||'rey',map);
    assert.equal(st.finalPhase,true);assert.equal(st.finalRound,1);
    const boss=st.boss,hp=boss.maxHp;
    boss.x=p.x+10;boss.y=p.y+10;
    for(let i=0;i<80&&st.finalRound===1;i++)Game.step();
    assert.ok(st.finalRound>=2,map);assert.equal(boss.dead,undefined);
    assert.ok(boss.maxHp>hp,map);assert.equal(st.boss,boss);
    assert.equal(!!st.victoryWait,false,map);assert.equal(st.over,false,map);
    Game.finish(false);assert.equal(st.over,true,map);
    assert.equal(result.victory,true);assert.equal(result.endless,true);assert.equal(result.finalPhase,true);
  }
  Game.start([setup('ranjay')]);Game.state.t=TS.RUN_SECONDS*60-1;Game.step();
  Game.state.players[0].down=true;Game.state.players[0].hp=0;Game.step();
  assert.equal(result.finalPhase,true);assert.equal(result.victory,false);
  assert.equal(result.endless,false,'unbeaten final runs retain the account-compatible defeat format');
});

test('remote progress keeps the object used by the menus and purchases', () => {
  const { Save } = engine(); const menuSave = Save.load();
  Save.mergeRemote({savedAt:Date.now()+1000,coins:500,selected:'lia',owned:{lia:{stars:3}},shop:{},best:{},stats:{}});
  assert.equal(Save.get(),menuSave);
  assert.equal(menuSave.coins,500);assert.equal(menuSave.selected,'lia');
  Save.addCoins(10);assert.equal(menuSave.coins,510);
});
test('invalid saved characters, stars and shop levels cannot break the menu or combat', () => {
  const { Save, TS } = engine({selected:'removed',owned:{removed:{stars:900},ranjay:{stars:-3},lia:{stars:80}},shop:null,best:{wins:'bad'},coins:'bad'});
  const d=Save.load();assert.equal(d.selected,TS.STARTER);assert.equal(d.owned.ranjay.stars,1);
  assert.equal(d.owned.lia.stars,TS.GACHA.maxStars);assert.equal(d.best.wins,0);
  assert.equal(d.coins,0);assert.ok(Object.values(Save.shopStats()).every(Number.isFinite));
  Save.mergeRemote({best:null,stats:null,maps:null,owned:{lia:null},shop:{[TS.SHOP[0].id]:999}});
  assert.equal(Save.shopLevel(TS.SHOP[0].id),TS.SHOP[0].max);
});
test('large enemies are hit when their center lies outside the old broad phase', () => {
  const { Game }=engine();Game.start([setup('lia')]);const p=Game.state.players[0];
  p.weapons=[{id:'colonia',lvl:1,cd:0,drones:[]}];
  const e={id:1,type:'rey',x:80,y:-12,r:44,hp:100,maxHp:100,speed:0,dmg:0,ai:'prop',prop:false,t:0,vx:0,vy:0,kx:0,ky:0,slow:0,slowAmt:0,dodgeCd:0,atk:0};
  Game.state.enemies=[e];Game.step();assert.ok(e.hp<100);
});
test('colonia applies cooldown upgrades and expired slows do not retain their old strength', () => {
  const { Game }=engine();Game.start([setup('lia')]);const p=Game.state.players[0];
  p.weapons=[{id:'colonia',lvl:1,cd:0,drones:[]}];p.stats.cdMul=.5;
  const e={id:1,type:'zombi',x:p.x+5,y:p.y-12,r:10,hp:100,maxHp:100,speed:0,dmg:0,ai:'prop',prop:false,t:0,vx:0,vy:0,kx:0,ky:0,slow:0,slowAmt:.9,dodgeCd:0,atk:0};
  Game.state.enemies=[e];Game.step();
  assert.equal(e.slowAmt,.35);assert.ok(p.weapons[0].cd > 0 && p.weapons[0].cd < 40);
});
test('finishing an old account request does not erase the ticket for a new run', async () => {
  const deferred=[],submitted=[];
  const client={auth:{getSession:async()=>({data:{session:{user:{id:'user'}}}})},
    from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:null})}),
    rpc:(name,args)=>{
      if(name==='start_survivors_run') return new Promise(resolve=>deferred.push(resolve));
      if(name==='submit_survivors_run') submitted.push(args.p_run);
      return Promise.resolve({data:{points:1}});
    }};
  const context=vm.createContext({console,window:{supabase:{createClient:()=>client}},Save:{exportData:()=>({})},setTimeout,clearTimeout});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../survivors/js/account.js'),'utf8'),context);
  const Account=vm.runInContext('Account',context);await Account.init();
  Account.startRun();const first=Account.submitRun({seconds:1,kills:1});
  Account.startRun();deferred[0]({data:'old'});await first;
  deferred[1]({data:'new'});await Account.submitRun({seconds:1,kills:1});
  assert.deepEqual(submitted,['old','new']);
});

test('enemy strength increases over time, including enemies already alive', () => {
  const {Game}=engine();Game.start([setup('ranjay')],{seed:11});Game.state.players[0].weapons=[];Game.step();
  const e=Game.state.enemies.find(e=>!e.prop);const hp=e.maxHp,speed=e.speed,dmg=e.dmg;
  e.hp*=.5;Game.state.t=45000-1;Game.step();
  assert.ok(e.maxHp>hp*4);assert.ok(e.speed>speed);assert.ok(e.dmg>dmg);
  assert.ok(Math.abs(e.hp/e.maxHp-.5)<.00001);
  for(const key of ['hp','bossHp','dmg'])assert.ok(Game.difficultyAt(72000)[key]>Game.difficultyAt(36000)[key]);
});
test('the final boss never arrives early in a daily boss modifier', () => {
  const {Game,TS}=engine();Game.start([setup('ranjay')],{mods:['jefes']});
  Game.state.t=TS.RUN_SECONDS*.55*60-1;Game.state.bossIdx=3;Game.step();assert.equal(Game.state.finalPhase,false);
  Game.state.t=TS.RUN_SECONDS*60-1;Game.step();assert.equal(Game.state.finalPhase,true);
  Game.state.finalPulseT=Game.state.t+1;Game.step();
  assert.ok(Game.state.strikes.length>0);assert.ok(Game.state.fx.some(f=>f.k==='warn'));
});
test('water is traversable and slows movement without shortening the aim vector', () => {
  const {Game,TS}=engine();Game.start([setup('ranjay')]);const p=Game.state.players[0];p.weapons=[];
  let point;
  for(let x=500;x<2200&&!point;x+=20)for(let y=500;y<2200;y+=20) {
    if([0,10,-10].every(dx=>Game.terrain(x+dx,y)===2)){point={x,y};break;}
  }
  assert.ok(point);p.x=point.x;p.y=point.y;const speed=p.stats.speed;
  Game.setInput(0,{x:1,y:0,ab:0});Game.step();
  assert.ok(Math.abs(p.x-point.x-speed*TS.WATER_SPEED)<.001);
  assert.equal(p.inWater,true);
  Game.setInput(0,{x:1,y:1,ab:0});Game.step();assert.ok(Math.abs(Math.hypot(p.moveX,p.moveY)-1)<.0001);
});
test('each new hero has a usable starter, evolution, active ability and persistent weapon effect', () => {
  const {Game,TS}=engine();
  for(const id of ['nix','savia','brasa']) {
    const ch=TS.CHARACTERS.find(c=>c.id===id);assert.equal(TS.WEAPONS[ch.weapon].levels.length,6);
    assert.ok(TS.EVOLUTIONS[ch.weapon]);assert.ok(TS.ABILITIES[id]);
    Game.start([setup(id)]);const p=Game.state.players[0];p.abCd=0;p.weapons[0].cd=0;
    Game.setInput(0,{x:0,y:0,ab:1});Game.step();
    assert.equal(Game.state.abilitiesUsed,1,id);assert.ok(p.abCd>0);
    assert.ok(Game.state.zones.length>0||Game.state.fx.length>0,id);
  }
});
test('a strong stationary build cannot remain immortal against the final encounter', () => {
  const {Game,TS}=engine();Game.start([setup('zeta')],{seed:99});
  const st=Game.state,p=st.players[0];
  p.weapons=[{id:'dron',lvl:6,evo:true,cd:0,combo:0,comboT:0,drones:[]}];
  p.techniques=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,5]));p.techCds=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,0]));
  p.passives=Object.fromEntries(Object.entries(TS.PASSIVES).map(([id,d])=>[id,d.max]));
  p.meta={maxHp:1,might:1,armor:3,regen:.5,cooldown:.2,area:.5,amount:2};
  p.stats={...p.stats,maxHp:300,might:2.5,armor:8,regen:2,area:3,cdMul:.45,amount:3,revive:1};p.hp=300;
  st.t=TS.RUN_SECONDS*60-1;st.bossIdx=3;st.hordeIdx=TS.HORDES.length;
  for(let i=0;i<18000&&!st.over;i++) {
    if(st.choosing)for(const id of Object.keys(st.choosing))Game.choose(+id,0);
    Game.step();
  }
  assert.equal(st.over,true);assert.equal(st.finalPhase,true);
});
test('the three new weapons deal damage through their distinct persistent mechanics', () => {
  const {Game}=engine();
  for(const id of ['nix','savia','brasa']) {
    Game.start([setup(id)],{seed:47});const p=Game.state.players[0];p.weapons[0].cd=0;
    const x=p.x+(id==='nix'?Math.cos(.045)*42*p.stats.area:60);
    const y=id==='nix'?p.y+Math.sin(.045)*42*p.stats.area:p.y;
    const e={id:999,type:'zombi',x,y,r:10,hp:1000,maxHp:1000,speed:0,dmg:0,ai:'chase',prop:false,t:0,vx:0,vy:0,kx:0,ky:0,slow:0,slowAmt:0,dodgeCd:0,atk:0};
    Game.state.enemies=[e];for(let i=0;i<35;i++)Game.step();
    assert.ok(e.hp<1000,id);if(id==='savia')assert.ok(e.slow>0);
  }
});
test('water slows ground enemies but does not slow flying creatures', () => {
  const {Game,TS}=engine();Game.start([setup('ranjay')],{seed:11});Game.state.players[0].weapons=[];Game.step();
  const e=Game.state.enemies[0],p=Game.state.players[0];
  let point;
  for(let x=500;x<2200&&!point;x+=20)for(let y=500;y<2200;y+=20)if(Game.terrain(x,y)===2&&Game.terrain(x+10,y)===2){point={x,y};break;}
  assert.ok(point);
  Game.state.enemies=[e];Object.assign(e,{x:point.x,y:point.y,speed:1,kx:0,ky:0,slow:0,type:'zombi',ai:'chase'});
  p.x=point.x+100;p.y=point.y;Game.step();
  assert.ok(Math.abs(e.x-point.x-TS.WATER_SPEED)<.001);
  Object.assign(e,{x:point.x,y:point.y,speed:1,kx:0,ky:0,slow:0,type:'murcielago',ai:'chase'});Game.step();
  assert.ok(Math.abs(e.x-point.x-1)<.001);
});
test('the late final boss resists permanent slows and its projectiles scale with difficulty', () => {
  const {Game,TS}=engine();Game.start([setup('frosti')],{seed:11});const st=Game.state;
  st.players[0].weapons=[];st.t=TS.RUN_SECONDS*60-1;st.bossIdx=3;Game.step();
  const boss=st.boss;boss.ai='chase';boss.x=200;boss.y=0;boss.slow=999;boss.slowAmt=.99;
  st.enemies=[boss];st.t=(TS.RUN_SECONDS+1200)*60-1;Game.step();
  assert.ok(Math.hypot(boss.vx,boss.vy)>4.675,'late pursuit exceeds even a speed build');
  boss.ai='boss_king';boss.hp=boss.maxHp*.5;boss.tacticPhase=1;boss.state=1;boss.timer=1;boss.gap=0;Game.step();
  assert.ok(st.eshots.some(s=>s.kind==='orb'&&s.dmg>9));
});
test('every character learns only its own weapon and six personal techniques, including chest rewards', () => {
  const {Game,TS}=engine();
  for(const ch of TS.CHARACTERS) {
    Game.start([setup(ch.id)],{seed:31});const p=Game.state.players[0];
    assert.equal(TS.TECHNIQUES[ch.id].length,6);
    for(let level=0;level<90;level++) {
      Game.state.t=Math.min(TS.RUN_SECONDS-1,level*25)*60;
      Game.state.xp=Game.state.xpNext;Game.step();
      const options=Game.state.choosing[0];
      for(const option of options) {
        if(option.kind==='weapon')assert.equal(option.id,ch.weapon,ch.id);
        if(option.kind==='technique')assert.ok(TS.TECHNIQUES[ch.id].some(m=>m.id===option.id),ch.id);
      }
      let index=options.findIndex(o=>o.kind==='technique');
      if(index<0)index=options.findIndex(o=>o.kind==='weapon');
      Game.choose(0,Math.max(0,index));
      assert.deepEqual(Array.from(p.weapons,w=>w.id),[ch.weapon]);
    }
    for(const move of TS.TECHNIQUES[ch.id])assert.equal(p.techniques[move.id],5,ch.id+move.id);
    Game.state.pickups.push({kind:'cofre',x:p.x,y:p.y-6,t:0});Game.step();
    assert.deepEqual(Array.from(p.weapons,w=>w.id),[ch.weapon],ch.id+' chest');
  }
});
test('foreign weapon rewards are rejected and injected foreign weapons never attack', () => {
  const {Game}=engine();Game.start([setup('ranjay')]);const p=Game.state.players[0];
  Game.state.pendingLevels=1;Game.state.choosing={0:[{kind:'weapon',id:'estocada',lvl:1}]};
  Game.choose(0,0);assert.deepEqual(Array.from(p.weapons,w=>w.id),['tajo']);
  p.weapons[0].cd=999;p.weapons.push({id:'virote',lvl:6,cd:0,drones:[]});Game.step();
  assert.deepEqual(Array.from(p.weapons,w=>w.id),['tajo']);assert.equal(Game.state.shots.length,0);
});
test('all personal techniques execute with their own weapon and survive the guest snapshot round trip', () => {
  const {Game,TS}=engine();
  for(const ch of TS.CHARACTERS) {
    Game.start([setup(ch.id)],{seed:14});const p=Game.state.players[0];
    p.weapons[0].lvl=6;p.weapons[0].evo=true;p.weapons[0].cd=999;
    p.techniques=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,5]));p.techCds=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,0]));
    Game.state.enemies=[{id:999,type:'zombi',x:p.x+80,y:p.y,r:10,hp:100000,maxHp:100000,speed:0,dmg:0,ai:'chase',prop:false,
      t:0,vx:0,vy:0,kx:0,ky:0,slow:0,slowAmt:0,dodgeCd:0,atk:0}];
    for(let i=0;i<20;i++)Game.step();
    assert.ok(p.techCds.burst>0&&p.techCds.ring>0,ch.id);
    for(const zone of Game.state.zones)for(const [key,value] of Object.entries(zone))if(typeof value==='number')assert.ok(Number.isFinite(value),ch.id+':'+key);
    const snap=Game.snapshot([p]);Game.startGuest({localId:0,players:[setup(ch.id)]});Game.applySnapshot(snap);
    assert.equal(Game.state.players[0].techniques.burst,5,ch.id);assert.equal(Game.hudData().techniques.length,6);
  }
});
test('the pre-final schedule covers twenty-five minutes without ending the increase in difficulty', () => {
  const {Game,TS}=engine();assert.equal(TS.RUN_SECONDS,1500);
  assert.equal(TS.BOSSES.at(-1).at,1500);assert.ok(TS.WAVES.at(-1).from>=1400);
  assert.ok(TS.HORDES.at(-1).at>1400);
  for(let minute=1;minute<=25;minute++) {
    assert.ok(Game.difficultyAt(minute*3600).hp>Game.difficultyAt((minute-1)*3600).hp);
    assert.ok(Game.difficultyAt(minute*3600).dmg>Game.difficultyAt((minute-1)*3600).dmg);
  }
});
test('sword and spear characters produce only attacks from their own weapon family', () => {
  const {Game,TS}=engine();
  for(const [id,type] of [['ranjay','slash'],['yant','thrust']]) {
    Game.start([setup(id)]);const p=Game.state.players[0];
    p.weapons[0].cd=0;p.techniques=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,5]));p.techCds=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,0]));p.abCd=0;
    Game.setInput(0,{x:0,y:0,ab:1});Game.step();
    assert.ok(Game.state.zones.length>0,id);
    assert.ok(Game.state.zones.every(z=>z.type===type),id);
    assert.equal(Game.state.shots.length,0,id);
  }
});

test('rerolls are per-player, bounded and do not advance time or resolve a choice',()=>{
  const {Game}=engine();Game.start([setup('ranjay'),setup('lia')],{mode:'host',seed:42});
  const st=Game.state;st.xp=st.xpNext;Game.step();
  const tick=st.t;let deliveries=0;Game.on('netChoices',m=>{if(m[1])deliveries++;});
  assert.equal(Game.reroll(99),false);
  for(let i=0;i<3;i++)assert.equal(Game.reroll(1),true);
  assert.equal(Game.reroll(1),false);assert.equal(st.players[1].rerolls,0);assert.equal(st.players[0].rerolls,3);
  assert.equal(deliveries,3);assert.equal(st.t,tick);assert.ok(st.choosing[0] && st.choosing[1]);
  Game.choose(1,-1);Game.choose(1,99);assert.ok(st.choosing[1]);
  Game.choose(1,0);assert.equal(Game.reroll(1),false);assert.ok(st.choosing[0]);
  Game.choose(0,0);assert.equal(st.choosing,null);
  Game.start([setup('ranjay')]);assert.equal(Game.state.players[0].rerolls,3);
});
test('level four native weapons offer their evolution passive before filling inventory',()=>{
  const {Game,TS}=engine();
  for(const ch of TS.CHARACTERS){
    Game.start([setup(ch.id)],{seed:34});const st=Game.state,p=st.players[0];p.weapons[0].lvl=4;
    st.xp=st.xpNext;Game.step();
    const support=st.choosing[0].find(o=>o.kind==='passive' && o.id===TS.EVOLUTIONS[ch.weapon].passive);
    assert.ok(support,ch.id);assert.equal(support.synergy,true);
    assert.ok(st.choosing[0].filter(o=>o.kind==='weapon').every(o=>o.id===ch.weapon));
  }
});
test('elites start at minute five, scale independently and have a bounded population',()=>{
  const {Game}=engine();Game.start([setup('ranjay')],{seed:55});const st=Game.state,p=st.players[0];
  p.stats.armor=100000;p.weapons[0].cd=100000;st.nextBreach=Infinity;
  st.t=300*60-2;Game.step();assert.equal(st.enemies.filter(e=>e.elite).length,0);
  Game.step();const first=st.enemies.find(e=>e.elite);assert.ok(first);
  const def=engine().TS.ENEMIES[first.type];assert.equal(first.baseMaxHp,def.hp*3);assert.equal(first.baseDmg,def.dmg*1.35);
  const hp=first.maxHp;st.t=600*60-1;Game.step();assert.ok(first.maxHp>hp);
  for(let i=0;i<9;i++){st.t=st.nextElite-1;Game.step();}
  assert.equal(st.enemies.filter(e=>e.elite && !e.dead).length,4);
});
test('elite kills grant five times XP, extra coins and actual damage rather than overkill',()=>{
  const {Game,TS}=engine();Game.start([setup('lia')],{seed:44});const st=Game.state,p=st.players[0];
  st.t=300*60-1;Game.step();const elite=st.enemies.find(e=>e.elite);
  st.enemies=[elite];elite.x=p.x+22;elite.y=p.y;elite.hp=3;elite.speed=0;elite.baseSpeed=0;elite.dmg=0;
  st.xpNext=1e9;p.weapons[0].cd=0;p.stats.might=10000;Game.step();
  assert.equal(p.combat.elites,1);assert.equal(p.combat.dealt,3);assert.equal(st.kills,1);
  assert.equal(st.xp/(p.stats.growth*st.mod.xp)+st.gems.reduce((n,g)=>n+g.v,0),TS.ENEMIES[elite.type].xp*5);
  assert.ok(st.coins+st.pickups.filter(it=>it.kind==='moneda').length>=5);
});
test('healing records only recovered HP and cannot silently revive a downed player',()=>{
  const {Game}=engine();Game.start([setup('ranjay'),setup('lia')]);const st=Game.state,p=st.players[0];
  p.hp=93;st.pickups=[{kind:'bocadillo',x:p.x,y:p.y-6,t:0}];Game.step();
  assert.equal(p.hp,100);assert.equal(p.combat.healed,7);
  st.pickups=[{kind:'bocadillo',x:p.x,y:p.y-6,t:0}];Game.step();assert.equal(p.combat.healed,7);
  p.down=true;p.hp=0;st.players[1].x=500;st.players[1].y=500;
  st.pendingLevels=1;st.choosing={0:[{kind:'heal'}]};Game.choose(0,0);assert.equal(p.down,true);assert.equal(p.hp,0);
});
test('compass prioritizes reviving teammates, ignores disconnected players and tracks chests',()=>{
  const {Game}=engine();Game.start([setup('ranjay'),setup('lia')]);const st=Game.state,p=st.players[0],ally=st.players[1];
  st.pickups=[{kind:'cofre',x:p.x+170,y:p.y,t:0}];
  assert.equal(Game.hudData().compass.arrow,'→');assert.equal(Game.hudData().compass.distance,100);
  ally.down=true;ally.x=p.x;ally.y=p.y-170;
  assert.equal(Game.hudData().compass.label,'Revivir');assert.equal(Game.hudData().compass.arrow,'↑');
  ally.disconnected=true;assert.equal(Game.hudData().compass.label,'Cofre');
  st.pickups=[];assert.equal(Game.hudData().compass,null);
});
test('snapshots preserve elite markers, cooldown progress, counters and distant chests',()=>{
  const {Game}=engine();Game.start([setup('nix'),setup('lia')],{seed:92});const st=Game.state,p=st.players[0];
  st.t=300*60-1;Game.step();const elite=st.enemies.find(e=>e.elite);elite.x=100;elite.y=0;
  p.techniques={burst:1};p.techCds={burst:120};p.rerolls=1;p.combat.dealt=321;
  st.pickups.push({kind:'cofre',x:5000,y:5000,t:0});
  Game.dropPlayer(1);
  const before=Game.hudData().techniques[0].ready,snap=Game.snapshot([p]);
  Game.startGuest({localId:0,players:[setup('nix'),setup('lia')]});Game.applySnapshot(snap);
  const d=Game.hudData();assert.equal(d.techniques[0].ready,before);assert.equal(d.combat.dealt,321);
  assert.equal(Game.state.players[0].rerolls,1);assert.ok(Game.state.enemies.some(e=>e.elite));
  assert.ok(Game.state.pickups.some(it=>it.x===5000));assert.equal(Game.reroll(0),false);
  assert.equal(Game.state.players[1].disconnected,true);assert.equal(d.compass.label,'Cofre');
});
test('chest rewards skip disconnected peers and results include individual combat metrics',()=>{
  const {Game}=engine();let result;Game.on('end',r=>{result=r;});Game.start([setup('ranjay'),setup('lia')]);
  const st=Game.state;Game.dropPlayer(1);const ghost=JSON.stringify(st.players[1].weapons);
  st.pickups=[{kind:'cofre',x:st.players[0].x,y:st.players[0].y-6,t:0}];Game.step();
  assert.equal(st.chests,1);assert.equal(JSON.stringify(st.players[1].weapons),ghost);
  Game.finish(false);assert.equal(result.chests,1);assert.equal(result.combat.length,2);assert.equal(result.combat[0].taken,0);
});

test('ground pickups collect at player feet from every approach and trigger only once',()=>{
  const {Game}=engine();
  for(const kind of ['moneda','bocadillo','iman','cofre'])for(const [dx,dy] of [[25,0],[-25,0],[0,25],[0,-25]]){
    Game.start([setup('ranjay')],{seed:24});const st=Game.state,p=st.players[0];p.hp=50;
    st.pickups=[{kind,x:p.x+dx,y:p.y+dy,t:0}];
    Game.step();assert.equal(st.pickups.length,0,`${kind}: ${dx},${dy}`);
    if(kind==='cofre')assert.equal(st.chests,1);
    if(kind==='bocadillo')assert.equal(p.hp,80);
    const coins=st.coins;Game.step();assert.equal(st.coins,coins);
  }
});
test('objects within attraction range are rescued from positions too far for the old collection radius',()=>{
  const {Game}=engine();
  for(const kind of ['bocadillo','iman','cofre']){
    Game.start([setup('ranjay')]);const st=Game.state,p=st.players[0];p.hp=50;
    st.pickups=[{kind,x:p.x+50,y:p.y,t:0}];
    for(let i=0;i<8;i++)Game.step();
    assert.equal(st.pickups.length,0,kind);
    if(kind==='cofre')assert.equal(st.chests,1);
  }
});
test('a shared object goes to the nearest living player and is never pulled twice',()=>{
  const {Game}=engine();Game.start([setup('ranjay'),setup('lia')]);const st=Game.state,[a,b]=st.players;
  a.x=0;a.y=0;b.x=50;b.y=0;a.hp=b.hp=30;
  st.pickups=[{kind:'bocadillo',x:40,y:0,t:0}];Game.step();
  assert.equal(a.hp,30);assert.equal(b.hp,60);assert.equal(st.pickups.length,0);
  st.pickups=[{kind:'moneda',x:25,y:0,t:0}];Game.step();assert.equal(st.coins,1);
  Game.dropPlayer(1);a.hp=30;st.pickups=[{kind:'bocadillo',x:15,y:0,t:0}];Game.step();
  assert.equal(a.hp,60);assert.equal(b.hp,0);
});
test('gem attraction cannot overshoot the player and keeps all experience',()=>{
  const {Game}=engine();Game.start([setup('ranjay')]);const st=Game.state,p=st.players[0];st.xpNext=1e9;
  st.gems=[{x:p.x+1,y:p.y,v:7,t:10000,pull:true},{x:p.x,y:p.y-18,v:3,t:0,pull:false}];
  Game.step();assert.equal(st.gems.length,0);assert.equal(st.xp,10);
});

test('all 24 characters have a native weapon, six staged techniques and an active ability',()=>{
  const {TS,Game}=engine();assert.equal(TS.CHARACTERS.length,24);
  for(const ch of TS.CHARACTERS){
    assert.ok(TS.WEAPONS[ch.weapon] && TS.EVOLUTIONS[ch.weapon] && TS.ABILITIES[ch.id],ch.id);
    const moves=TS.TECHNIQUES[ch.id];assert.equal(moves.length,6);assert.equal(new Set(moves.map(m=>m.id)).size,6);
    assert.equal(moves.at(-1).unlock,48);assert.ok(moves.every(m=>m.max===5));
    Game.start([setup(ch.id)],{seed:48});Game.state.xp=Game.state.xpNext;Game.step();
    assert.ok(Game.state.choosing[0].filter(o=>o.kind==='technique').every(o=>moves.find(m=>m.id===o.id).unlock<=2));
  }
});
test('Duna keeps unlocking new moves later and gains four distinct tornado patterns',()=>{
  const {Game}=engine();const patterns={pierce:'straight',guard:'orbit',focus:'stationary',surge:'spiral'};
  for(const [id,flag] of Object.entries(patterns)){
    Game.start([setup('duna')],{seed:1});const p=Game.state.players[0];p.weapons[0].cd=999;
    p.techniques={[id]:4};p.techCds={[id]:0};Game.step();
    assert.ok(Game.state.zones.length>0,id);assert.ok(Game.state.zones.every(z=>z.type==='tornado'&&z[flag]),id);
    assert.equal(p.weapons.length,1);assert.equal(p.weapons[0].id,'tornado');
  }
  Game.start([setup('duna')]);const st=Game.state,p=st.players[0];p.techniques={burst:5,ring:5,pierce:5,guard:5,focus:5};
  st.level=47;st.t=1080*60;st.xp=st.xpNext;Game.step();assert.ok(st.choosing[0].some(o=>o.id==='surge'));
  Game.choose(0,st.choosing[0].findIndex(o=>o.id==='surge'));st.xp=st.xpNext;Game.step();
  assert.equal(st.choosing[0].some(o=>o.id==='surge'),false,'next rank waits until level 52 and another 75 seconds');
  Game.start([setup('duna')]);Game.state.level=99;Game.state.t=900*60;Game.state.xp=Game.state.xpNext;Game.step();
  assert.equal(Game.state.choosing[0].some(o=>o.id==='surge'),false,'the final technique remains locked at minute 15 even with a high level');
});
test('breach objective pays a chest and magnet only after its four marked enemies die',()=>{
  const {Game}=engine();Game.start([setup('lia')],{seed:8});const st=Game.state,p=st.players[0];
  p.weapons[0].cd=99999;p.stats.might=1e6;p.stats.armor=100000;st.t=120*60-1;Game.step();
  assert.equal(st.breach.remaining,4);const targets=st.enemies.filter(e=>e.breach);assert.equal(targets.length,4);
  for(const e of targets){e.x=p.x+20;e.y=p.y;e.baseSpeed=0;e.speed=0;}
  p.weapons[0].cd=0;Game.step();assert.equal(st.breach,null);
  assert.equal(st.chests,1,'the nearby chest is collected once');assert.equal(st.pickups.filter(it=>it.kind==='cofre').length,0);
  assert.ok(st.nextBreach>st.t);const chests=st.chests;Game.step();assert.equal(st.chests,chests);
});
test('Lumen heals allies, accelerates a nearby revival and never revives disconnected peers',()=>{
  const {Game}=engine();Game.start([setup('lumen'),setup('ranjay'),setup('lia')]);const st=Game.state,[p,a,b]=st.players;
  a.hp=50;p.hp=50;b.down=true;b.hp=0;b.x=20;b.y=0;p.x=0;p.y=0;p.abCd=0;
  Game.setInput(0,{x:0,y:0,ab:1});Game.step();assert.equal(a.hp,75);assert.equal(p.hp,75);assert.ok(b.reviveT>=60);
  const progress=b.reviveT;Game.step();assert.equal(b.reviveT-progress,1.5);
  const d=Game.hudData();assert.ok(d.players[2].revivePct>0);assert.equal(d.players[2].reviver,0);
  Game.dropPlayer(2);p.abCd=0;Game.setInput(0,{x:0,y:0,ab:2});Game.step();assert.equal(b.down,true);assert.equal(b.hp,0);
});
test('enemy health, breach progress and reviver identity round trip in guest snapshots',()=>{
  const {Game}=engine();Game.start([setup('lumen'),setup('ranjay')],{seed:3});const st=Game.state,p=st.players[0];
  st.t=120*60-1;Game.step();const e=st.enemies.find(e=>e.breach);e.x=p.x+80;e.y=p.y;e.hp=e.maxHp*.45;
  const ally=st.players[1];ally.down=true;ally.hp=0;ally.x=p.x;ally.y=p.y;Game.step();
  const snap=Game.snapshot([p]),id=e.id;Game.startGuest({localId:0,players:[setup('lumen'),setup('ranjay')]});Game.applySnapshot(snap);
  assert.equal(Game.state.enemies.find(e=>e.id===id).hp,.45);assert.equal(Game.hudData().breach.remaining,4);
  assert.equal(Game.hudData().players[1].reviver,0);assert.ok(Game.hudData().players[1].revivePct>0);
});

test('overlapping Duna tornadoes share damage windows while different players still contribute',()=>{
 const damage=(zones,owners=1)=>{
  const {Game}=engine();Game.start(Array.from({length:owners},()=>setup('duna')),{seed:42});
  const st=Game.state;st.players.forEach(p=>p.weapons[0].cd=9999);
  const p=st.players[0];const e={id:999,type:'zombi',x:p.x+90,y:p.y,r:10,hp:1000,maxHp:1000,speed:0,dmg:0,ai:'chase',t:0,vx:0,vy:0,kx:0,ky:0,slow:0,slowAmt:0,atk:0};
  st.enemies=[e];st.zones=Array.from({length:zones},(_,i)=>({type:'tornado',x:e.x,y:e.y,vx:0,vy:0,t:13,life:100,r:25,dmg:20,owner:i%owners,stationary:true}));
  Game.step();return 1000-e.hp;
 };
 assert.equal(damage(20),damage(1),'20 overlapping tornadoes do not multiply one player damage by 20');
 assert.ok(damage(2,2)>damage(1),'cooperative players both deal damage');
});

const fixtureEnemy=(TS,type,x,y,extra={})=>({id:999,type,x,y,hp:1000,maxHp:1000,speed:0,dmg:0,r:TS.ENEMIES[type].r*1.7,ai:TS.ENEMIES[type].ai,boss:!!TS.ENEMIES[type].boss,prop:false,t:0,vx:0,vy:0,kx:0,ky:0,slow:0,slowAmt:0,dodgeCd:0,atk:0,state:0,timer:100,...extra});
test('chests offer two exclusive native evolution paths for all 24 characters',()=>{
 const {Game,TS}=engine();for(const ch of TS.CHARACTERS){
  Game.start([setup(ch.id)],{seed:1});const st=Game.state,p=st.players[0];p.weapons[0].lvl=6;p.weapons[0].cd=9999;p.passives[TS.EVOLUTIONS[ch.weapon].passive]=1;
  st.pickups=[{kind:'cofre',x:p.x,y:p.y,t:0}];Game.step();
  assert.equal(st.choiceKind,'chest');assert.equal(st.evolutions,0);
  assert.deepEqual(Array.from(st.choosing[0].filter(o=>o.kind==='evolution'),o=>o.path),['precision','dominion']);
  assert.equal(Game.reroll(0),false);Game.choose(0,1);assert.equal(p.weapons[0].path,'dominion');assert.equal(st.evolutions,1);
  st.pendingLevels=1;st.choosing={0:[{kind:'evolution',id:ch.weapon,path:'precision'}]};Game.choose(0,0);assert.equal(p.weapons[0].path,'dominion');
 }
});
test('chest rewards preserve queued levels and resolve all cooperative choices once',()=>{
 const {Game}=engine();Game.start([setup('ranjay'),setup('lia')]);const st=Game.state,p=st.players[0];
 st.xp=st.xpNext;st.pickups=[{kind:'cofre',x:p.x,y:p.y,t:0}];Game.step();
 assert.equal(st.choiceKind,'chest');assert.equal(st.pendingLevels,1);Game.choose(0,2);const coins=st.coins;Game.choose(0,2);assert.equal(st.coins,coins);
 Game.choose(1,2);assert.equal(st.choiceKind,'level');assert.equal(st.pendingLevels,1);Game.choose(0,0);Game.dropPlayer(1);assert.equal(st.choosing,null);assert.equal(st.pendingLevels,0);
});
test('Duna evolution paths create a following hurricane or fast travelling tornadoes',()=>{
 const {Game}=engine();for(const path of ['precision','dominion']){
  Game.start([setup('duna')]);const p=Game.state.players[0];p.weapons[0]={id:'tornado',lvl:6,evo:true,path,cd:0};Game.step();
  const winds=Game.state.zones.filter(z=>z.type==='tornado');assert.ok(winds.length);
  if(path==='precision'){assert.equal(winds.length,1);assert.equal(winds[0].orbitRadius,0);assert.equal(winds[0].orbit,true);}
  else {assert.ok(winds.length>1);assert.ok(winds.every(z=>z.straight&&Math.hypot(z.vx,z.vy)>4));}
  const snap=Game.snapshot([p]);Game.startGuest({localId:0,players:[setup('duna')]});Game.applySnapshot(snap);assert.equal(Game.state.players[0].weapons[0].path,path);
 }
});
test('guardian shields block the front but can be flanked',()=>{
 const damage=front=>{const {Game,TS}=engine();Game.start([setup('lia')],{seed:42});const p=Game.state.players[0];p.x=0;p.y=0;p.weapons[0].cd=0;const e=fixtureEnemy(TS,'guardian',40,0,{guardAngle:front?Math.PI:0});Game.state.enemies=[e];Game.step();return 1000-e.hp;};
 assert.ok(damage(false)>damage(true)*3);
});
test('horde medics restore nearby enemies without reviving dead ones or healing bosses',()=>{
 const {Game,TS}=engine();Game.start([setup('ranjay')]);Game.state.players[0].weapons[0].cd=9999;
 const healer=fixtureEnemy(TS,'sanador',100,0,{timer:1}),ally=fixtureEnemy(TS,'guardian',110,0,{id:1000,hp:50,maxHp:100}),boss=fixtureEnemy(TS,'rey',120,0,{id:1001,hp:50,maxHp:100});
 Game.state.enemies=[healer,ally,boss];Game.step();assert.equal(ally.hp,58);assert.equal(boss.hp,50);
});
test('snipers mark a fixed shot before firing and do not track the player during the warning',()=>{
 const {Game,TS}=engine();Game.start([setup('ranjay')]);const st=Game.state,p=st.players[0];p.weapons[0].cd=9999;p.x=0;p.y=0;
 const e=fixtureEnemy(TS,'tirador',130,0,{timer:1,dmg:12});st.enemies=[e];Game.step();assert.equal(st.eshots.length,0);assert.equal(st.zones[0].type,'dangerLine');
 p.x=50;p.y=100;for(let i=0;i<60;i++)Game.step();assert.ok(st.eshots.some(s=>s.vx<0 && Math.abs(s.vy)<.001));
});
test('all seven bosses change tactics with health and gapped rings leave a warned opening',()=>{
 const {Game,TS}=engine();for(const [id,patterns] of Object.entries(TS.BOSS_PATTERNS)){
  Game.start([setup('ranjay')]);const p=Game.state.players[0];p.weapons[0].cd=9999;
  const boss=fixtureEnemy(TS,id,250,0,{boss:true});Game.state.enemies=[boss];
  for(const [index,hp] of [900,500,200].entries()){boss.hp=hp;Game.step();assert.equal(boss.tactic,patterns[index],id);}
 }
 Game.start([setup('ranjay')],{seed:42});const st=Game.state;st.players[0].weapons[0].cd=9999;
 const boss=fixtureEnemy(TS,'rey',300,0,{boss:true,hp:500,tacticPhase:1,timer:0,dmg:15});st.enemies=[boss];Game.step();assert.equal(st.zones[0].type,'dangerRing');assert.equal(st.eshots.length,0);
 for(let i=0;i<60;i++)Game.step();assert.ok(st.eshots.length>0&&st.eshots.length<24);
 assert.ok(st.eshots.every(s=>Math.abs(Math.atan2(Math.sin(Math.atan2(s.vy,s.vx)-boss.gap),Math.cos(Math.atan2(s.vy,s.vx)-boss.gap)))>.5));
});
test('forest shelters activate once and heal only during their limited duration',()=>{
 const {Game}=engine();Game.start([setup('ranjay')],{seed:42});const st=Game.state,p=st.players[0],site=st.sites[0];p.x=site.x;p.y=site.y;p.hp=50;p.iframes=10000;p.weapons[0].cd=99999;
 for(let i=0;i<120;i++)Game.step();assert.equal(site.activated,true);assert.equal(site.used,true);assert.equal(p.hp,52);const until=site.activeUntil;
 for(let i=0;i<60;i++)Game.step();assert.equal(p.hp,54);assert.equal(site.activeUntil,until);
 st.t=until-1;st.enemies=[];Game.step();assert.equal(p.hp,54,'expired shelters no longer heal');
});
test('cemetery altars reward a cleared challenge once and city lamps expose shields',()=>{
 const {Game,TS}=engine();Game.start([setup('ranjay')],{map:'cementerio'});let st=Game.state,p=st.players[0],site=st.sites[0];p.x=site.x;p.y=site.y;p.weapons[0].cd=99999;p.stats.armor=9999;
 for(let i=0;i<120;i++)Game.step();assert.equal(site.guards.length,3);assert.equal(site.used,false);
 st.enemies.filter(e=>site.guards.includes(e.id)).forEach(e=>e.dead=true);Game.step();assert.equal(site.used,true);assert.equal(st.chests,1);Game.choose(0,2);Game.step();assert.equal(st.chests,1);
 Game.start([setup('ranjay')],{map:'ciudad'});st=Game.state;p=st.players[0];site=st.sites[0];p.x=site.x;p.y=site.y;p.weapons[0].cd=99999;
 const guard=fixtureEnemy(TS,'guardian',p.x+30,p.y);st.enemies=[guard];for(let i=0;i<120;i++)Game.step();assert.ok(guard.exposedUntil>st.t);
});
test('beach currents move grounded players in water and remain weak enough to oppose',()=>{
 const {Game}=engine();Game.start([setup('ranjay')],{map:'playa'});const p=Game.state.players[0];
 let spot;for(let x=500;x<4000&&!spot;x+=100)for(let y=500;y<4000;y+=100)if([[0,0],[80,0],[-80,0],[0,80],[0,-80]].every(([dx,dy])=>Game.terrain(x+dx,y+dy)===2)){spot={x,y};break;}
 assert.ok(spot);p.x=spot.x;p.y=spot.y;p.weapons[0].cd=99999;Game.step();assert.ok(p.x>spot.x);
 const before=p.x;Game.setInput(0,{x:-1,y:0,ab:0});Game.step();assert.ok(p.x<before);
});
test('cooperative wind and fire ignite a vortex while same-owner effects do not',()=>{
 for(const same of [false,true]){const {Game}=engine();Game.start([setup('duna'),setup('brasa')]);const st=Game.state;st.players.forEach(p=>p.weapons[0].cd=9999);
  const wind={type:'tornado',x:100,y:0,vx:0,vy:0,t:0,life:300,r:30,dmg:10,owner:0,stationary:true};st.zones=[wind,{type:'flame',x:100,y:0,ang:0,len:90,spread:.5,t:0,life:40,dmg:1,owner:same?0:1,fixed:true}];Game.step();assert.equal(wind.ignited,!same);
 }
});
test('ice from a teammate makes electric attacks conduct to nearby enemies',()=>{
 const {Game,TS}=engine();Game.start([setup('frosti'),setup('quizo')]);const st=Game.state;st.players.forEach(p=>p.weapons[0].cd=9999);
 const a=fixtureEnemy(TS,'zombi',70,0),b=fixtureEnemy(TS,'zombi',110,0,{id:1000});st.enemies=[a,b];
 st.shots=[{type:'ice',x:a.x,y:a.y-16,vx:0,vy:0,life:100,r:5,dmg:1,pierce:1,owner:0,hit:new Set()}];Game.step();assert.equal(a.wetBy,0);
 st.players[1].weapons[0].cd=0;Game.step();assert.equal(st.comboLabel,'Descarga conductora');assert.ok(st.zones.some(z=>z.type==='bolt'));
});

test('healing stays on the ground at full health and goes to a wounded nearby teammate',()=>{
 const {Game}=engine();Game.start([setup('ranjay'),setup('lia')]);const st=Game.state,[a,b]=st.players;
 st.players.forEach(p=>{p.weapons[0].cd=99999;p.stats.regen=0;});a.x=0;a.y=0;b.x=25;b.y=0;
 st.pickups=[{kind:'bocadillo',x:0,y:0,t:0}];Game.step();assert.equal(st.pickups.length,1);
 b.hp=50;Game.step();assert.equal(b.hp,80);assert.equal(a.hp,a.stats.maxHp);assert.equal(st.pickups.length,0);
 assert.equal(b.loot.healed,30);assert.equal(a.loot.healed,0);
});
test('gem compaction conserves XP and the magnet state without attracting other gems',()=>{
 const {Game,TS}=engine();Game.start([setup('ranjay')],{seed:42});const st=Game.state,p=st.players[0];p.weapons[0].cd=99999;st.xpNext=1e9;
 st.gems=Array.from({length:421},(_,i)=>({x:1500+i,y:0,v:2,t:0,pull:i>=400}));
 const expected=st.gems.reduce((sum,g)=>sum+g.v,0)+TS.ENEMIES.zombi.xp,pulled=st.gems.filter(g=>g.pull).reduce((sum,g)=>sum+g.v,0);
 st.enemies=[fixtureEnemy(TS,'zombi',p.x+200,p.y,{hp:1,maxHp:1})];
 st.zones=[{type:'acid',x:p.x+200,y:p.y,r:50,dmg:100,owner:0,t:19,warn:0,life:100}];Game.step();
 assert.ok(st.gems.length<421);assert.equal(st.gems.reduce((sum,g)=>sum+g.v,0),expected);
 assert.equal(st.gems.filter(g=>g.pull).reduce((sum,g)=>sum+g.v,0),pulled);
});
test('altar guardians return home and are never teleported to a distant player',()=>{
 const {Game}=engine();Game.start([setup('ranjay')],{map:'cementerio',seed:2});const st=Game.state,p=st.players[0],site=st.sites[0];p.weapons[0].cd=99999;p.stats.armor=9999;p.x=site.x;p.y=site.y;
 for(let i=0;i<120;i++)Game.step();const guard=st.enemies.find(e=>e.id===site.guards[0]);assert.equal(guard.siteId,site.id);
 guard.x=site.x+400;guard.y=site.y;p.x=site.x+6000;p.y=site.y+6000;st.t=299;
 const before=Math.hypot(guard.x-site.x,guard.y-site.y);Game.step();
 assert.ok(Math.hypot(guard.x-site.x,guard.y-site.y)<=before);assert.ok(Math.hypot(guard.x-p.x,guard.y-p.y)>5000);assert.equal(site.used,false);
});
test('streaks credit the attacker, expire, break on damage and retain their best in guest snapshots',()=>{
 const {Game,TS}=engine();Game.start([setup('ranjay'),setup('lia')],{seed:42});const st=Game.state,[p,other]=st.players;st.xpNext=1e9;
 st.players.forEach(p=>p.weapons[0].cd=99999);p.stats.armor=9999;
 for(let i=0;i<10;i++){
  st.enemies=[fixtureEnemy(TS,'zombi',p.x+90,p.y,{hp:1,maxHp:1})];st.zones=[{type:'acid',x:p.x+90,y:p.y,r:40,dmg:100,owner:0,t:19,warn:0,life:100}];Game.step();
 }
 assert.equal(p.streak.count,10);assert.equal(other.streak.count,0);assert.ok(p.streak.flashUntil>st.t);assert.equal(p.streak.best,10);
 const snap=Game.snapshot([p]);Game.startGuest({localId:0,players:[setup('ranjay'),setup('lia')]});Game.applySnapshot(snap);assert.equal(Game.hudData().streak.count,10);
 Game.start([setup('ranjay')]);const next=Game.state,q=next.players[0];q.weapons[0].cd=99999;q.streak={count:12,best:12,until:999,flashUntil:0};q.iframes=0;
 next.enemies=[fixtureEnemy(TS,'zombi',q.x,q.y,{dmg:5})];Game.step();assert.equal(q.streak.count,0);assert.equal(q.streak.best,12);
 next.enemies=[];q.streak={count:3,best:12,until:next.t+1,flashUntil:0};Game.step();assert.equal(Game.hudData().streak,null);
});
test('loot feedback reports actual XP and currency and expires with simulation time',()=>{
 const {Game}=engine();Game.start([setup('ranjay')]);const st=Game.state,p=st.players[0];p.weapons[0].cd=99999;st.xpNext=1e9;
 st.gems=[{x:p.x,y:p.y,v:3,t:0,pull:false}];st.pickups=[{kind:'moneda',x:p.x,y:p.y,t:0}];Game.step();
 assert.equal(p.loot.xp,3*p.stats.growth*st.mod.xp);assert.equal(p.loot.coins,st.mod.coins);assert.equal(p.loot.healed,0);
 const snap=Game.snapshot([p]);Game.startGuest({localId:0,players:[setup('ranjay')]});Game.applySnapshot(snap);assert.equal(Game.hudData().loot.xp,p.loot.xp);
 const until=Game.state.players[0].loot.until;Game.applySnapshot({...snap,t:until+1});assert.equal(Game.hudData().loot,null);
});
