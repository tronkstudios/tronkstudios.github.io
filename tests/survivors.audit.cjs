const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function run(options={}) {
  const c=vm.createContext({console,performance,Math,Map,Set,requestAnimationFrame:()=>1,cancelAnimationFrame(){},localStorage:{getItem:()=>null,setItem(){}},Sprites:{get(){}},Sfx:new Proxy({},{get:()=>()=>{}}),L:s=>s,LT:s=>s});
  for(const file of ['data','save','game']) {
    let code=fs.readFileSync(path.join(__dirname,`../survivors/js/${file}.js`),'utf8');
    if(file==='game')code=code.replace('    difficultyAt,','    _contact:contact,_zones:updateZones,_grid:buildGrid,_spawn:spawnEnemy,_player:updatePlayer,_dirTo:dirTo,_enemy:updateEnemy,_cap:fighterCap,\n    difficultyAt,');
    vm.runInContext(code,c);
  }
  const {Game,TS}=vm.runInContext('({Game,TS})',c);
  Game.start([{charId:'iria'},{charId:'ranjay'}],{seed:37,...options});
  const st=Game.state;
  for(const p of st.players){p.iframes=0;p.weapons[0].cd=1e9;}
  return {Game,TS,st,p:st.players[0],guest:st.players[1]};
}

test('hostile swept projectiles strike the first teammate in their path, independent of player order',()=>{
  const {Game,st,p,guest}=run();
  p.x=60;p.y=0;guest.x=-60;guest.y=0;
  const hostHp=p.hp,guestHp=guest.hp;
  st.eshots=[{x:-150,y:-18,vx:300,vy:0,life:20,r:4,dmg:20,source:'antitronk'}];
  Game._contact();
  assert.ok(guest.hp<guestHp,'the physically nearer guest takes the hit');
  assert.equal(p.hp,hostHp,'the rear player is protected by the first contact');
  assert.equal(st.eshots.length,0);
});

test('flames include visible torso contact at the far edge and exclude an enemy outside the cone',()=>{
  const {Game,st,p}=run();
  const edge=Game._spawn('zombi',0,63),outside=Game._spawn('zombi',70,16);
  edge.hp=edge.maxHp=outside.hp=outside.maxHp=1000;
  st.zones=[{type:'flame',x:0,y:0,ang:Math.PI/2,len:40,spread:.2,fixed:true,t:0,life:20,dmg:20,owner:p.id}];
  Game._grid();Game._zones();
  assert.ok(edge.hp<edge.maxHp,'the enemy torso visibly touching the flame receives damage');
  assert.equal(outside.hp,outside.maxHp,'the cone does not become a full-circle damage zone');
});

test('beach current contributes once per tick even when a dash uses several collision substeps',()=>{
  function drift(dash){
    const {Game,p}=run({map:'playa'});
    p.x=2500;p.y=0;p.stats.speed=6;p.input={x:0,y:1,ab:0,dash:dash?1:0};
    Game._player(p);
    return p.x-2500;
  }
  const walking=drift(false),dashing=drift(true);
  assert.ok(walking>0,'the current still moves players through deep water');
  assert.ok(Math.abs(dashing-walking)<.005,`current must not multiply during dash: walking ${walking}, dash ${dashing}`);
});

test('unopposed attacks preserve a vertical movement vector instead of adding a horizontal component',()=>{
  const {Game,p}=run();
  for(const y of [-1,1]){
    p.moveX=0;p.moveY=y;p.face=-1;
    assert.deepEqual(Array.from(Game._dirTo(p,null)),[0,y]);
  }
  p.moveX=0;p.moveY=0;p.face=-1;
  assert.deepEqual(Array.from(Game._dirTo(p,null)),[-1,0]);
});


test('summoners warn for a full second and destroying the source cancels its pending summons',()=>{
  for(const survives of [true,false]) {
    const {Game,st}=run();
    const source=Game._spawn('brujo',150,0);source.timer=0;
    Game._enemy(source);
    const warnings=st.zones.filter(z=>z.type==='summon' && z.bossId===source.id);
    assert.equal(warnings.length,3,'each reinforcement has a visible pending warning');
    assert.equal(st.enemies.filter(e=>e.summonedBy===source.id).length,0,'nothing spawns immediately');
    for(let i=0;i<59;i++)Game._zones();
    assert.equal(st.enemies.filter(e=>e.summonedBy===source.id).length,0,'no damageable enemy exists during warning');
    if(!survives)source.dead=true;
    Game._zones();
    assert.equal(st.enemies.filter(e=>e.summonedBy===source.id).length,survives?3:0);
    Game._zones();
    assert.equal(st.enemies.filter(e=>e.summonedBy===source.id).length,survives?3:0,'a resolved warning cannot spawn twice');
  }
});

test('each summoner reserves pending reinforcements and maintains at most six live minions',()=>{
  const {Game,st}=run();
  const source=Game._spawn('brujo',150,0);
  for(let i=0;i<5;i++){source.timer=0;Game._enemy(source);}
  assert.equal(st.zones.filter(z=>z.type==='summon' && z.bossId===source.id).length,6,'pending summons reserve ownership budget');
  for(let i=0;i<61;i++)Game._zones();
  const living=()=>st.enemies.filter(e=>e.summonedBy===source.id && !e.dead);
  assert.equal(living().length,6);
  source.timer=0;Game._enemy(source);
  assert.equal(st.zones.filter(z=>z.type==='summon' && z.bossId===source.id).length,0,'a full group cannot queue more minions');
  living()[0].dead=true;
  source.timer=0;Game._enemy(source);
  assert.equal(st.zones.filter(z=>z.type==='summon' && z.bossId===source.id).length,1,'a defeated minion frees exactly one place');
  for(let i=0;i<61;i++)Game._zones();
  assert.equal(living().length,6);
});

test('ordinary and boss summon warnings recheck the global enemy budget when they resolve',()=>{
  for(const kind of ['brujo','reyEsqueleto']) {
    const {Game,st}=run();
    const source=Game._spawn(kind,150,0),cap=Game._cap();
    while(st.enemies.filter(e=>!e.dead&&!e.prop).length<cap-2)Game._spawn('zombi',300,0);
    st.zones=Array.from({length:3},(_,i)=>({type:'summon',x:150+i*20,y:0,t:59,warn:60,life:61,bossId:source.id,enemy:'zombi'}));
    Game._zones();
    assert.equal(st.enemies.filter(e=>!e.dead&&!e.prop).length,cap,`${kind} must use only the two available places`);
    assert.equal(st.enemies.filter(e=>e.summonedBy===source.id).length,2);
  }
});
