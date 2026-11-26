const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function run(char='iria', opts={}){
 const ctx=vm.createContext({console,performance,Math,Map,Set,requestAnimationFrame:()=>1,cancelAnimationFrame(){},localStorage:{getItem:()=>null,setItem(){}},Sprites:{get(){}},Sfx:new Proxy({},{get:()=>()=>{}}),L:s=>s,LT:s=>s});
 for(const file of ['data','save','game']){let code=fs.readFileSync(path.join(__dirname,`../survivors/js/${file}.js`),'utf8');if(file==='game')code=code.replace('    difficultyAt,','    _spawn:spawnEnemy,_enemy:updateEnemy,_zones:updateZones,_options:buildOptions,_describe:describe,\n    difficultyAt,');vm.runInContext(code,ctx);}
 const {Game,TS}=vm.runInContext('({Game,TS})',ctx);Game.start([{charId:char}],{seed:37,...opts});return {Game,TS,st:Game.state,p:Game.state.players[0]};
}
const key=o=>`${o.kind}:${o.id}`;
test('solo opening choices include the weapon, a technique and the evolution passive', () => {
 const {Game,TS,st,p}=run();
 st.level=2;
 const opening=Array.from(Game._options(p,3,true));
 assert.deepEqual(opening.map(option=>option.kind), ['weapon','technique','passive']);
 assert.equal(opening[2].id,TS.EVOLUTIONS[p.weapons[0].id].passive);
 assert.equal(TS.validRunSignature(st.signature),st.signature);
 for (const character of TS.CHARACTERS) {
  const game = run(character.id,{sprint:true});
  game.st.level=2;
  assert.deepEqual(Array.from(game.Game._options(game.p,3,true),option=>option.kind),
   ['weapon','technique','passive'],character.id);
 }
 assert.equal(run('iria',{veteran:true}).st.openingDraft,false);
 assert.equal(run('iria',{daily:'daily'}).st.openingDraft,false);
 const before=new Set(opening.map(key));
 assert.ok(Game._options(p,3,true,opening).every(option=>!before.has(key(option))));
});
test('reroll offers three fresh upgrades when the eligible pool allows it, without spending a level',()=>{
 const {Game,st,p}=run();st.level=10;st.t=180*60;st.choiceKind='level';st.pendingLevels=1;
 st.choosing={0:Game._options(p,3,true)};
 for(let i=0;i<3;i++){const previous=new Set(st.choosing[0].map(key));assert.equal(Game.reroll(0),true);assert.equal(st.choosing[0].length,3);assert.ok(st.choosing[0].every(o=>!previous.has(key(o))));assert.equal(new Set(st.choosing[0].map(key)).size,3);}
 assert.equal(p.rerolls,0);assert.equal(st.level,10);assert.equal(st.pendingLevels,1);assert.equal(st.t,180*60);
});
test('reroll preserves its charge and existing cards when no alternative exists',()=>{
 const {Game,TS,st,p}=run();p.weapons[0].lvl=6;p.passives=Object.fromEntries(Object.entries(TS.PASSIVES).slice(0,TS.MAX_PASSIVES).map(([id,d])=>[id,d.max]));p.techniques=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,m.max]));
 st.choosing={0:Game._options(p,3,true)};const before=st.choosing[0];assert.equal(Game.reroll(0),false);assert.equal(p.rerolls,3);assert.equal(st.choosing[0],before);assert.equal(st.choosing[0].length,2);
});
test('reroll uses the remaining new upgrade before filling from old cards in a small pool',()=>{
 const {Game,TS,st,p}=run();p.weapons[0].lvl=5;const passives=Object.entries(TS.PASSIVES).slice(0,TS.MAX_PASSIVES);p.passives=Object.fromEntries(passives.map(([id,d],i)=>[id,i<3?d.max-1:d.max]));p.techniques=Object.fromEntries(TS.TECHNIQUES[p.charId].map(m=>[m.id,m.max]));
 const all=Game._options(p,30),missing=all[3];assert.equal(all.length,4);st.choosing={0:all.slice(0,3)};assert.equal(Game.reroll(0),true);assert.ok(st.choosing[0].some(o=>key(o)===key(missing)));assert.equal(new Set(st.choosing[0].map(key)).size,3);
});
test('all 340 technique cards show their own native icon and actual cooldown',()=>{
 const chars=run().TS.CHARACTERS;
 for(const ch of chars){const {Game,TS,p}=run(ch.id);p.stats.cdMul=.65;for(const move of TS.TECHNIQUES[ch.id]){const card=Game._describe(p,{kind:'technique',id:move.id,lvl:2});assert.equal(card.icon,move.icon || ch.weapon,`${ch.id}:${move.id}`);assert.equal(card.cooldownSeconds,Math.round(move.cd*.65/60*10)/10);}}
});
test('ranged enemies expose a locked trajectory for thirty steps before firing',()=>{
 for(const minute of [0,12]){const {Game,st,p}=run();st.t=minute*3600;p.x=150;p.y=0;const e=Game._spawn('antitronk',0,0);e.timer=0;Game._enemy(e);assert.equal(st.eshots.length,0);const warnings=st.zones.filter(z=>z.type==='dangerLine');assert.equal(warnings.length,minute?3:1);const angles=warnings.map(z=>Math.atan2(z.ty-z.y,z.tx-z.x));p.x=-200;p.y=180;
  for(let i=0;i<29;i++){Game._enemy(e);Game._zones();}assert.equal(st.eshots.length,0);Game._enemy(e);Game._zones();assert.equal(st.eshots.length,angles.length);st.eshots.forEach((s,i)=>assert.ok(Math.abs(Math.atan2(s.vy,s.vx)-angles[i])<1e-8));assert.equal(st.zones.some(z=>z.type==='dangerLine'),false);
 }
});
test('aim warnings follow a displaced shooter, reach guests, and cancel when it dies or staggers',()=>{
 for(const cancel of ['dead','stagger']){const {Game,st,p}=run();p.x=150;const e=Game._spawn('antitronk',0,0);e.timer=0;Game._enemy(e);const z=st.zones.find(z=>z.sourceEnemy===e.id),dx=z.tx-z.x,dy=z.ty-z.y;e.x+=30;e.y+=8;Game._zones();assert.equal(z.x,e.x);assert.equal(z.y,e.y);assert.ok(Math.abs(z.tx-z.x-dx)<1e-8&&Math.abs(z.ty-z.y-dy)<1e-8);const snap=Game.snapshot([p]);assert.ok(snap.z.some(z=>z.type==='dangerLine'&&z.sourceEnemy===e.id));if(cancel==='dead')e.dead=true;else{e.state=0;e.staggerUntil=st.t+45;}Game._zones();assert.equal(st.zones.some(z=>z.sourceEnemy===e.id),false);assert.equal(st.eshots.length,0);}
});
