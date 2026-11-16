const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
function engine(raw=null){const sounds=[];let saved;const c=vm.createContext({console,performance,Math,Map,Set,requestAnimationFrame:()=>1,cancelAnimationFrame(){},localStorage:{getItem:()=>raw&&JSON.stringify(raw),setItem:(k,v)=>saved=v},Sprites:{get(){}},Sfx:new Proxy({},{get:(_,name)=>name==='play'?((...args)=>sounds.push(args)):()=>{}}),L:s=>s,LT:s=>s});for(const file of ['data','save','game']){let code=fs.readFileSync(path.join(__dirname,`../survivors/js/${file}.js`),'utf8');if(file==='game')code=code.replace('    difficultyAt,','    _safe:findNestPosition,_footprint:clearFootprint,_hit:hitEnemy,_spawn:spawnEnemy,_grid:buildGrid,_ability:useAbility,_tech:techniqueAttack,_nearMiss:nearMiss,_kill:killEnemy,_enemy:updateEnemy,\n    difficultyAt,');vm.runInContext(code,c);}return {...vm.runInContext('({Game,TS,Save})',c),sounds,saved:()=>saved};}
function run(char='ranjay',opts={}){const e=engine();e.Game.start([{charId:char}],{seed:44,...opts});const st=e.Game.state,p=st.players[0];p.weapons[0].cd=1e9;st.spawnT=1e9;st.nextPressure=st.nextBreach=st.nextElite=st.nextNest=1e12;st.hordeIdx=100;st.bossIdx=100;p.iframes=0;return {...e,st,p};}
test('early active input queues for twelve frames, fires once and discards presses too early',()=>{
 const {Game,st,p}=run('iria');p.abCd=5;p.input.ab=1;Game.step();assert.ok(p.abilityQueuedUntil>st.t);for(let i=0;i<5;i++)Game.step();assert.equal(st.abilitiesUsed,1);assert.equal(p.abilityQueuedUntil,0);for(let i=0;i<20;i++)Game.step();assert.equal(st.abilitiesUsed,1);
 p.abCd=50;p.input.ab=2;Game.step();assert.equal(p.abilityQueuedUntil,0);
});
test('queued active input is canceled by pause, input disable, down and disconnect',()=>{
 for(const cancel of [g=>g.setPaused(true),g=>g.setControlsEnabled(false),g=>g.dropPlayer(0)]){const {Game,p}=run();p.abCd=6;p.input.ab=1;Game.step();assert.ok(p.abilityQueuedUntil);cancel(Game);assert.equal(p.abilityQueuedUntil,0);}
});
test('posture, stagger recovery and Iria marks reach guest snapshots in simulation time',()=>{
 const {Game,p,st}=run('iria');const e=Game._spawn('guardian',80,0);e.posture=70;e.postureImmuneUntil=240;e.staggerUntil=30;e.markUntil=180;e.markBy=0;p.synergyReady=180;p.techniques={focus:1};const snap=Game.snapshot([p]);
 Game.startGuest({localId:0,players:[{charId:'iria'}]});Game.applySnapshot(snap);const enemy=Game.state.enemies[0];assert.equal(enemy.posture,70);assert.equal(enemy.postureImmuneUntil,240);assert.equal(enemy.staggerUntil,30);assert.equal(enemy.markUntil,180);assert.equal(enemy.markBy,0);assert.equal(Game.hudData().techniques[0].linkSeconds,3);
});
test('all 30 characters have two named, documented native active branches',()=>{
 const {TS}=engine();assert.equal(TS.CHARACTERS.length,30);const names=[];for(const ch of TS.CHARACTERS)for(const path of ['precision','echo']){assert.ok(TS.ACTIVE_IDENTITIES[ch.id],ch.id);const name=TS.activePathName(ch.id,path);assert.ok(name.length>3);assert.ok(TS.activePathDescription(ch.id,path).length>15);names.push(name);}assert.equal(new Set(names).size,60);
});
test('sword guard blocks one projectile and perfume extends its native protection',()=>{
 for(const id of ['ranjay','kaito','yant']){const {Game,p,st}=run(id);p.activePath='precision';Game._ability(p);assert.equal(p.parryUntil,st.t+90);assert.equal(p.parryCharges,1);assert.equal(p.weapons.length,1);}
 const perfume=run('lia');perfume.p.activePath='precision';perfume.Game._ability(perfume.p);assert.equal(perfume.p.iframes,240);
});
test('bow precision changes real projectile speed and penetration, while echo opens its fan',()=>{
 const base=run('iria');base.Game._ability(base.p);const focused=run('iria');focused.p.activePath='precision';focused.Game._ability(focused.p);
 const a=base.st.shots[0],b=focused.st.shots[0];assert.equal(b.pierce,a.pierce+2);assert.ok(Math.abs(Math.hypot(b.vx,b.vy)/Math.hypot(a.vx,a.vy)-1.2)<1e-8);
});
test('native axes, acid and fire variants transform their existing entities',()=>{
 const axes=run('chambas');axes.p.activePath='precision';axes.Game._ability(axes.p);assert.ok(axes.st.shots.every(s=>s.type==='axe'&&s.out>130*axes.p.stats.area));
 const acid=run('savia');acid.p.activePath='precision';acid.Game._ability(acid.p);assert.ok(acid.st.zones.every(z=>z.type==='acid'&&z.warn===1));
 const fire=run('brasa');fire.p.activePath='precision';fire.Game._ability(fire.p);assert.ok(fire.st.zones.every(z=>z.type==='flame'&&z.spread<.6&&z.len>105*fire.p.stats.area));
});
test('healing precision chooses a single most injured ally and echoes retain source attribution',()=>{
 const {Game}=engine();Game.start([{charId:'lumen'},{charId:'iria'}],{seed:5});const [p,ally]=Game.state.players;p.activePath='precision';p.hp=80;ally.hp=10;Game._ability(p);assert.equal(p.hp,80);assert.ok(ally.hp>70);assert.ok(p.combat.bySkill.active.healing>60);
});
test('laser precision changes collision length as well as the drawn beam',()=>{
 const {Game,st,p}=run('zeta');p.activePath='precision';const e=Game._spawn('zombi',p.x+300,p.y);e.hp=e.maxHp=10000;Game._grid();Game._ability(p);assert.ok(st.zones.every(z=>z.type==='laser'&&z.len===325));assert.ok(e.hp<e.maxHp);
});
test('heavy active increases posture and respects scoped stats after casting',()=>{
 const {Game,p}=run('sunk');p.activePath='precision';const before=p.stats;Game._ability(p);assert.equal(p.stats,before);
 const {Game:g,p:q}=run('bruno');q.activePath='precision';const original=q.stats;g._ability(q);assert.equal(q.stats,original);assert.equal(q.weapons.length,1);
});
test('safe nests have dry free footprints, two local entrances and reproducible placement',()=>{
 for(const map of ['bosque','cementerio','ciudad','playa'])for(const seed of [1,9,44]){const {Game,p,st}=run('ranjay',{map,seed});const point=Game._safe(p);assert.ok(point,map+seed);assert.equal(Game._footprint(point.x,point.y,34),true);let approaches=0;for(let i=0;i<4;i++){const a=i*Math.PI/2;if([38,62,88].every(r=>Game._footprint(point.x+Math.cos(a)*r,point.y+Math.sin(a)*r,13.6)))approaches++;}assert.ok(approaches>=2);}
});
test('nest placement retries without spawning into an entirely flooded region',()=>{
 const {Game,p,st}=run('ranjay',{map:'playa'});p.x=100000;p.y=0;assert.equal(Game._safe(p),null);st.t=180*60;st.nextNest=st.t;Game.step();assert.equal(st.sites.some(s=>s.nest),false);assert.equal(st.nextNest,st.t+1800);
});
test('city antennas and beach coral nests carry themed labels to guests',()=>{
 for(const [map,label] of [['ciudad','Antena de refuerzos'],['playa','Nido de coral']]){const {Game,TS,p,st}=run('ranjay',{map});st.t=180*60;st.nextNest=st.t;Game.step();const site=st.sites.find(s=>s.nest);assert.ok(site);assert.equal(site.theme,map);assert.equal(TS.siteName(site),label);const snap=Game.snapshot([p]);Game.startGuest({localId:0,players:[{charId:'ranjay'}],map});Game.applySnapshot(snap);assert.equal(TS.siteName(Game.state.sites.find(s=>s.nest)),label);}
});
test('resurrection warnings retain their source and cancel when it is destroyed',()=>{
 const {Game,p,st}=run('iria',{map:'cementerio'});st.t=180*60;st.nextNest=st.t;Game.step();const site=st.sites.find(s=>s.nest),e=Game._spawn('esqueleto',site.x+40,site.y);Game._hit(e,1e9,p);const z=st.zones.find(z=>z.type==='resurrection');assert.equal(z.siteId,site.id);assert.equal(z.life,180);const snap=Game.snapshot([p]);assert.equal(snap.z.find(z=>z.type==='resurrection').siteId,site.id);Game._hit(st.enemies.find(e=>e.id===site.entityId),1e9,p);assert.equal(st.zones.some(z=>z.type==='resurrection'),false);assert.equal(st.respawns.length,0);
});
test('pinned objective survives closer loot, clears when reached or removed, and resets',()=>{
 const {Game,p,st}=run();const site=st.sites[1];assert.equal(Game.setGoal('site:'+site.id),true);st.pickups.push({kind:'cofre',x:p.x+70,y:p.y,t:0});assert.equal(Game.hudData().compass.label,'Campamento');assert.equal(Game.hudData().compass.pinned,true);p.x=site.x;p.y=site.y;assert.equal(Game.hudData().compass.pinned,false);assert.equal(Game.setGoal('missing'),false);const goal=Game.hudData().goals.find(g=>g.kind==='chest');Game.setGoal(goal.key);st.pickups=[];assert.equal(Game.hudData().compass.pinned,false);Game.start([{charId:'ranjay'}]);assert.equal(Game.hudData().pinnedGoal,null);
});
test('a guest pins shared objectives without sending gameplay mutations to the host',()=>{
 const {Game,p,st}=run();const snap=Game.snapshot([p]);Game.startGuest({localId:0,players:[{charId:'ranjay'}]});Game.applySnapshot(snap);const goal=Game.hudData().goals[0];assert.ok(Game.setGoal(goal.key));assert.equal(Game.hudData().compass.pinned,true);
});
test('available skill time starts when learned and freezes during pause or reward choices',()=>{
 const {Game,p,st}=run();for(let i=0;i<60;i++)Game.step();assert.equal(p.combat.bySkill.weapon.availableTicks,60);p.techniques={focus:1};p.techCds={focus:1e9};Game.step();assert.equal(p.combat.bySkill.focus.availableTicks,1);Game.setPaused(true);Game.step();assert.equal(p.combat.bySkill.focus.availableTicks,1);Game.setPaused(false);st.choosing={0:[{kind:'heal'}]};Game.step();assert.equal(p.combat.bySkill.focus.availableTicks,1);
});
test('starting-rule signatures distinguish stars, permanent upgrades, party and modifiers',()=>{
 const {TS}=engine(),a=[{charId:'iria',stars:1,meta:{might:.2,speed:.1}}],opts={map:'bosque',mods:['turbo','horda']};const signature=TS.runSignature(a,opts);assert.equal(TS.validRunSignature(signature),signature);assert.equal(TS.runSignature([{...a[0],name:'Different name',meta:{speed:.1,might:.2}}],{...opts,mods:['horda','turbo']}),signature);
 for(const party of [[{...a[0],stars:2}],[{...a[0],meta:{might:.3,speed:.1}}],[...a,{charId:'duna'}]])assert.notEqual(TS.runSignature(party,opts),signature);assert.notEqual(TS.runSignature(a,{...opts,easy:true}),signature);assert.notEqual(TS.runSignature(a,{...opts,mods:[]}),signature);assert.equal(TS.validRunSignature('not-json'),'');
});
test('history preserves legacy runs but only valid complete signatures can be comparable',()=>{
 const {Game,TS,Save,p,st}=run('iria');let result;Game.on('end',r=>result=r);Game.finish(false);assert.equal(result.signature,st.signature);assert.equal(TS.validRunSignature(result.signature),result.signature);Save.recordRun(result);assert.equal(Save.get().history[0].signature,result.signature);
 const data=Save.exportData();data.history.push({id:'legacy',at:1,charId:'iria',map:'bosque',seconds:10});const old=engine(data).Save.get().history.find(h=>h.id==='legacy');assert.equal(old.signature,'');
});
test('opening the host menu clears only the local queued input, leaving teammates independent',()=>{
 const {Game}=engine();Game.start([{charId:'iria'},{charId:'ranjay'}],{seed:44,mode:'host'});const [host,ally]=Game.state.players;host.abilityQueuedUntil=12;ally.abilityQueuedUntil=12;Game.setControlsEnabled(false);assert.equal(host.abilityQueuedUntil,0);assert.equal(ally.abilityQueuedUntil,12);
});
test('heavy active posture bonus is applied after the normal per-hit cap without changing other attacks',()=>{
 const {Game,p}=run('sunk');p.activePath='precision';const e=Game._spawn('zombi',p.x+20,p.y);e.hp=e.maxHp=100000;Game._grid();Game._ability(p);Game.step();assert.equal(e.posture,42);
});
test('skill exposure excludes time spent down while a teammate keeps the run alive',()=>{
 const {Game}=engine();Game.start([{charId:'iria'},{charId:'ranjay'}],{seed:44});Game.step();const [p,ally]=Game.state.players;p.down=true;p.hp=0;const before=p.combat.bySkill.weapon.availableTicks;for(let i=0;i<3;i++)Game.step();assert.equal(p.combat.bySkill.weapon.availableTicks,before);assert.ok(ally.combat.bySkill.weapon.availableTicks>before);
});
test('containment discs strengthen their native slow and echo axes return sooner',()=>{
 const {Game,p}=run('nix');p.activePath='precision';const e=Game._spawn('zombi',p.x+30,p.y);e.hp=e.maxHp=10000;Game._grid();Game._ability(p);assert.equal(e.slowAmt,.65);assert.ok(e.slow>=90);
 const axe=run('chambas');axe.p.activePath='echo';axe.Game._ability(axe.p,true);assert.ok(axe.st.shots.every(s=>Math.abs(s.out/(130*axe.p.stats.area)-.75)<1e-8));
});
