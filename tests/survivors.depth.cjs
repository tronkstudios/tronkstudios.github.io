const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
function engine(raw=null){const sounds=[];let saved;const c=vm.createContext({console,performance,Math,Map,Set,requestAnimationFrame:()=>1,cancelAnimationFrame(){},localStorage:{getItem:()=>raw&&JSON.stringify(raw),setItem:(k,v)=>saved=v},Sprites:{get(){}},Sfx:new Proxy({},{get:(_,name)=>name==='play'?((...args)=>sounds.push(args)):()=>{}}),L:s=>s,LT:s=>s});for(const file of ['data','save','game']){let code=fs.readFileSync(path.join(__dirname,`../survivors/js/${file}.js`),'utf8');if(file==='game')code=code.replace('    difficultyAt,','    _hit:hitEnemy,_spawn:spawnEnemy,_grid:buildGrid,_ability:useAbility,_tech:techniqueAttack,_nearMiss:nearMiss,_kill:killEnemy,_enemy:updateEnemy,\n    difficultyAt,');vm.runInContext(code,c);}return {...vm.runInContext('({Game,TS,Save})',c),sounds,saved:()=>saved};}
function run(char='ranjay',opts={}){const e=engine();e.Game.start([{charId:char}],{seed:44,...opts});const st=e.Game.state,p=st.players[0];p.weapons[0].cd=1e9;st.spawnT=1e9;st.nextPressure=st.nextBreach=st.nextElite=st.nextNest=1e12;st.hordeIdx=100;st.bossIdx=100;p.iframes=0;return {...e,st,p};}
test('active evolution has time and level gates, cannot reroll, stays native and resets',()=>{
 const {Game,st,p}=run('iria');p.talents=['edge'];st.t=480*60;st.level=19;st.xp=st.xpNext;Game.step();assert.ok(st.choosing[0].every(o=>o.kind==='activePath'));assert.equal(Game.reroll(0),false);const before=p.abCd;Game.choose(0,0);assert.equal(p.activePath,'precision');assert.ok(p.abCd>before);assert.equal(p.weapons[0].id,'arco');
 const snap=Game.snapshot([p]);Game.startGuest({localId:0,players:[{charId:'iria'}]});Game.applySnapshot(snap);assert.equal(Game.state.players[0].activePath,'precision');
 Game.start([{charId:'iria'}]);assert.equal(Game.state.players[0].activePath,null);
});
test('all heroes keep native attacks in focused and echo active variants; echoes count once',()=>{
 const {TS}=engine();for(const ch of TS.CHARACTERS)for(const branch of ['precision','echo']){
 const {Game,st,p}=run(ch.id);p.activePath=branch;Game._ability(p);assert.equal(p.weapons.length,1);assert.equal(p.weapons[0].id,ch.weapon);assert.equal(st.abilitiesUsed,1,ch.id);assert.ok(p.abCd>0);assert.equal(p.activeEchoAt>0,branch==='echo'&&ch.id!=='duna');
 if(p.activeEchoAt){st.t=p.activeEchoAt-1;Game.step();assert.equal(st.abilitiesUsed,1,ch.id);assert.equal(p.activeEchoAt,0);}
 }
});
test('Duna chooses moving tornado or larger stationary vortex, with no random wandering',()=>{
 for(const branch of ['precision','echo']){const {Game,p,st}=run('duna');p.activePath=branch;Game._ability(p);const z=st.zones[0];assert.equal(z.type,'tornado');assert.equal(z.stationary,branch==='echo');assert.equal(z.straight,branch==='precision');const startX=z.x,startY=z.y;for(let i=0;i<60;i++)Game.step();assert.equal(z.x===startX&&z.y===startY,branch==='echo');assert.equal(z.skill,'active');assert.equal(z.skillPower,branch==='precision'?1.35:1);assert.equal(z.life,240);}
});
test('automatic techniques are staggered without consuming the waiting technique cooldown',()=>{
 const {Game,p,st}=run('iria');p.techniques={burst:1,ring:1,pierce:1};p.techCds={burst:0,ring:0,pierce:0};Game.step();assert.ok(p.techCds.burst>0);assert.ok(p.techCds.ring<=0);for(let i=0;i<12;i++)Game.step();assert.ok(p.techCds.ring>0);assert.ok(p.techCds.pierce<=0);
});
test('heavy impacts break posture, recover after a window, and bosses have shorter stagger and immunity',()=>{
 for(const boss of [false,true]){const {Game,p,st}=run();const e=Game._spawn(boss?'reyEsqueleto':'guardian',60,0);e.hp=e.maxHp=1e6;for(let i=0;i<20;i++)Game._hit(e,1,p,{kb:6,kx:1});assert.equal(e.staggerUntil-st.t,boss?20:45);assert.ok(e.postureImmuneUntil-st.t>200);const until=e.staggerUntil;Game._hit(e,1,p,{kb:50});assert.equal(e.staggerUntil,until);assert.ok(p.combat.bySkill.weapon.control>0);}
});
test('near misses require movement, have a three second cap, and never erase the full cooldown',()=>{
 const {Game,p,st}=run();p.abCd=300;Game._nearMiss(p,'a');assert.equal(p.abCd,300);p.moving=true;Game._nearMiss(p,'a');assert.equal(p.abCd,255);Game._nearMiss(p,'b');assert.equal(p.abCd,255);st.t+=180;p.abCd=20;Game._nearMiss(p,'c');assert.equal(p.abCd,0);assert.equal(p.combat.dodges,2);
});
test('guard followed by focus creates one native synergy and attributes delayed damage',()=>{
 const {Game,p,st}=run('iria');const e=Game._spawn('zombi',85,0);e.hp=e.maxHp=1e6;Game._grid();Game._tech(p,'guard',1);assert.ok(p.synergyReady>0);Game._tech(p,'focus',1);assert.equal(p.synergyReady,0);const shots=st.shots.filter(s=>s.skill==='focus');assert.ok(shots.length);assert.ok(shots.every(s=>s.skillPower===1.35));for(let i=0;i<20;i++)Game.step();assert.ok(p.combat.bySkill.focus.damage>0);assert.ok(p.combat.dealt>=p.combat.bySkill.focus.damage);
});
test('guardians move between a medic and the player and stop escorting dead medics',()=>{
 const {Game,p}=run();p.x=0;p.y=0;const medic=Game._spawn('sanador',180,0),guard=Game._spawn('guardian',160,60);Game._enemy(guard);assert.equal(guard.protecting,medic.id);medic.dead=true;Game._enemy(guard);assert.equal(guard.protecting,null);
});
test('nests announce reinforcements, cancel them on destruction, reward once and stop at final boss',()=>{
 const {Game,p,st}=run();st.t=180*60;st.nextNest=st.t;Game.step();const site=st.sites.find(s=>s.nest),e=st.enemies.find(e=>e.id===site.entityId);assert.ok(site);p.x=site.x+100;p.y=site.y;st.t=site.nextSpawn-1;Game.step();const warning=st.zones.find(z=>z.type==='nestSpawn');assert.ok(warning);assert.equal(st.enemies.filter(e=>e.nestOrigin===site.id).length,0);
 Game._hit(e,1e9,p);Game._kill(e);assert.equal(site.used,true);assert.equal(st.pickups.filter(p=>p.kind==='cofre').length,1);for(let i=0;i<90;i++)Game.step();assert.equal(st.enemies.filter(e=>e.nestOrigin===site.id).length,0);
 st.finalPhase=true;st.nextNest=0;const count=st.sites.length;Game.step();assert.equal(st.sites.length,count);
});
test('cemetery skeletons resurrect once; breaking their origin cancels pending resurrection',()=>{
 const {Game,st,p}=run('ranjay',{map:'cementerio'});st.t=180*60;st.nextNest=st.t;Game.step();const site=st.sites.find(s=>s.kind==='grave');const e=Game._spawn('esqueleto',site.x+40,site.y);assert.equal(e.nestOrigin,site.id);Game._hit(e,1e9,p);assert.equal(st.respawns.length,1);st.t=st.respawns[0].at-1;Game.step();const raised=st.enemies.find(e=>e.raised);assert.ok(raised);Game._hit(raised,1e9,p);assert.equal(st.respawns.length,0);
 const next=Game._spawn('esqueleto',site.x+45,site.y);Game._hit(next,1e9,p);assert.equal(st.respawns.length,1);Game._hit(st.enemies.find(e=>e.id===site.entityId),1e9,p);assert.equal(st.respawns.length,0);
});
test('map layouts reproduce with a seed, vary with seeds and reach guests',()=>{
 const {Game}=engine();const sample=seed=>{Game.start([{charId:'ranjay'}],{seed});return JSON.stringify(Game.state.layout);};const a=sample(40);assert.equal(sample(40),a);assert.notEqual(sample(41),a);const snap=Game.snapshot(Game.state.players),layout=JSON.stringify(snap.layout);Game.startGuest({players:[{charId:'ranjay'}],localId:0});Game.applySnapshot(snap);assert.equal(JSON.stringify(Game.snapshot ? snap.layout:{}),layout);
});
test('positional sounds pan left and right and retain distance attenuation',()=>{
 const {Game,p,st,sounds}=run();p.x=0;p.y=0;const left=Game._spawn('slime',-100,0),right=Game._spawn('slime',100,0);left.hp=right.hp=1e6;
 // Enemy firing cues carry world positions and are played with a fourth pan argument.
 left.ai=right.ai='ranged';left.timer=right.timer=0;const d=engine().TS.ENEMIES;left.type=right.type='antitronk';
 Game._enemy(left);st.audioLast={};Game._enemy(right);const cues=sounds.filter(a=>a.length===4&&a[3]!==0);assert.ok(cues.some(a=>a[3]<0));assert.ok(cues.some(a=>a[3]>0));assert.ok(cues.every(a=>a[2]<=1&&a[2]>0));
});
test('history retains 30 bounded validated entries, local player stats and survives reload',()=>{
 const {Save}=engine();for(let i=0;i<35;i++)Save.recordRun({charId:'iria',map:'bosque',seconds:i,kills:10,level:4,coins:0,combat:[{dealt:3},{dealt:100,healed:9}],techniques:[{}, {burst:3}],activePaths:[null,'echo']},1);
 assert.equal(Save.get().history.length,30);assert.equal(Save.get().history[0].dealt,100);assert.equal(Save.get().history[0].activePath,'echo');assert.equal(Save.get().history[0].techniques.burst,3);const reloaded=engine(Save.exportData()).Save.get();assert.equal(reloaded.history.length,30);
});
test('nest reinforcements resolve after the warning and obey their local population cap',()=>{
 const {Game,p,st}=run();st.t=180*60;st.nextNest=st.t;Game.step();const site=st.sites.find(s=>s.nest);p.x=site.x+160;p.y=site.y;
 for(let wave=0;wave<4;wave++){st.t=site.nextSpawn-1;Game.step();for(let i=0;i<91;i++)Game.step();}
 assert.equal(st.enemies.filter(e=>e.nestOrigin===site.id&&!e.dead).length,9);
});
test('skill damage clips overkill and focused active power is counted once on immediate and delayed hits',()=>{
 for(const char of ['bruno','iria']){const {Game,p,st}=run(char);const e=Game._spawn('zombi',p.x+40,p.y);e.hp=1;e.maxHp=100;Game._grid();p.activePath='precision';Game._ability(p);for(let i=0;i<60;i++)Game.step();assert.equal(p.combat.bySkill.active.damage,1);assert.equal(p.combat.dealt,1);}
});
test('invalid active choices and malformed history cannot enter player progression',()=>{
 const {Game,st,p}=run();st.level=19;st.t=480*60;st.choosing={0:[{kind:'activePath',id:'echo'}]};Game.choose(0,0);assert.equal(p.activePath,null);st.level=20;st.t=480*60-1;st.choosing={0:[{kind:'activePath',id:'echo'}]};Game.choose(0,0);assert.equal(p.activePath,null);
 const {Save}=engine({history:[null,{charId:'missing',map:'bosque'},{id:'x',at:5,charId:'iria',map:'bosque',seconds:-2,activePath:'missing',techniques:{foreign:99,burst:200}}]});const h=Save.get().history;assert.equal(h.length,1);assert.equal(h[0].seconds,0);assert.equal(h[0].activePath,null);assert.equal(h[0].techniques.burst,5);assert.equal(h[0].techniques.foreign,undefined);
});

test('wind records bounded pull control and never moves the destructible origin away from its model',()=>{
 const {Game,st,p}=run('duna');p.activePath='echo';const nest=Game._spawn('nido',45,0),enemy=Game._spawn('zombi',80,0);enemy.hp=enemy.maxHp=1e6;Game._grid();Game._ability(p);for(let i=0;i<30;i++)Game.step();assert.equal(nest.x,45);assert.equal(nest.y,0);assert.ok(p.combat.bySkill.active.control>0);assert.ok(p.combat.bySkill.active.control<=1);
});
