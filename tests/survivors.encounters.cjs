const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup(ids, options={}) {
  const context=vm.createContext({
    console, performance, Math, Map, Set, requestAnimationFrame:()=>1, cancelAnimationFrame(){},
    localStorage:{getItem:()=>null,setItem(){}}, Sprites:{get(){}},
    Sfx:new Proxy({}, {get:()=>()=>{}}), L:text=>text, LT:text=>text
  });
  for(const file of ["data","save","game"]) {
    let code=fs.readFileSync(path.join(__dirname,"../survivors/js",file+".js"),"utf8");
    if(file==="game")code=code.replace("    difficultyAt,", `
      spawn:spawnEnemy, grid:buildGrid, hit:hitEnemy, elite:assignEliteRole, updateEnemy,
      updateZones, sites:updateSites, defenders:updateDefenders, player:updatePlayer,
      difficultyAt,`);
    vm.runInContext(code,context);
  }
  const {Game,Save}=vm.runInContext("({Game,Save})",context);
  Game.start(ids.map(charId=>({charId})), {seed:42,...options});
  const state=Game.state;
  state.nextBreach=state.nextElite=state.nextNest=state.nextPressure=state.spawnT=1e9;
  state.bossIdx=state.hordeIdx=999;
  for(const player of state.players)player.weapons[0].cd=1e6;
  return {Game,Save,state,p:state.players[0]};
}

test("manual aim steers Iria away from the auto target and a queued cast retains Duna's heading",()=>{
  for(const id of ["iria","duna"]){
    const {Game,state,p}=setup([id]);
    const enemy=Game.spawn("zombi",p.x+110,p.y);
    Game.grid();
    p.abCd=id==="duna"?5:0;
    Game.setInput(0,{x:1,y:0,ab:1,abilityAim:[0,-105]});
    Game.player(p);
    if(id==="duna"){
      // Network movement updates do not retarget a previously queued button press.
      Game.setInput(0,{x:0,y:0,ab:1,abilityAim:[0,1]});
      for(let i=0;i<5;i++){state.t++;Game.player(p);}
    }
    const attacks=id==="iria"?state.shots:state.zones.filter(zone=>zone.type==="tornado");
    assert.ok(attacks.length>0);
    assert.ok(attacks.every(attack=>attack.vy<0));
    assert.equal(enemy.dead,undefined);
    assert.equal(p.manualAim,null);
  }
});

test("elite shields open on wind-up and a broken link stops reducing ally damage",()=>{
  const {Game,state,p}=setup(["iria"]);
  p.x=0;p.y=0;
  const shield=Game.spawn("zombi",70,0);
  Game.elite(shield);
  state.t=shield.eliteActionAt;
  Game.updateEnemy(shield);
  assert.ok(shield.exposedUntil>state.t);
  assert.ok(state.zones.some(zone=>zone.type==="hazard"&&zone.eliteLink===shield.id));
  const caster=Game.spawn("brujo",p.x+120,p.y);
  Game.elite(caster);
  const follower=Game.spawn("zombi",caster.x+25,caster.y);
  follower.hp=follower.maxHp=10000;
  Game.grid();
  state.t=caster.eliteActionAt;
  Game.updateEnemy(caster);
  assert.equal(follower.linkedBy,caster.id);
  Game.hit(follower,100,p);
  const shielded=10000-follower.hp;
  follower.hp=10000;
  caster.staggerUntil=state.t+50;
  Game.hit(follower,100,p);
  assert.ok(10000-follower.hp>shielded*1.4);
  Game.updateZones();
  assert.equal(state.zones.some(zone=>zone.type==="tether"&&zone.eliteLink===caster.id),false);
  const rush=Game.spawn("zombi",p.x+130,p.y);
  Game.elite(rush);
  rush.timer=0;
  Game.updateEnemy(rush);
  assert.equal(rush.timer,45);
  assert.ok(state.zones.some(zone=>zone.type==="dangerLine"&&zone.sourceEnemy===rush.id));
});

test("camp loadout replaces one gunner with a stationary medic that heals after the refuge expires",()=>{
  const {Game,state,p}=setup(["ranjay"]);
  const site=state.sites[0];
  p.x=site.x;p.y=site.y;
  Game.setInput(p.id,{campMode:"medic"});
  site.progress=119;
  Game.sites();
  const medic=site.defenders.find(unit=>unit.type==="tronkSanitario");
  assert.ok(medic);
  assert.equal(site.defenders.filter(unit=>unit.type==="tronkAliado").length,1);
  const position=[medic.x,medic.y];
  state.t=site.activeUntil+1;
  p.hp=20;
  medic.reload=0;
  Game.defenders(site.defenders);
  assert.equal(p.hp,25);
  assert.deepEqual([medic.x,medic.y],position);
});

test("a third player covering the rescue advances the revival on posture break",()=>{
  const {Game,state,p}=setup(["sunk","lumen","iria"]);
  const helper=state.players[1], down=state.players[2];
  down.down=true;down.hp=0;down.x=80;down.y=0;down.reviver=helper.id;down.reviveT=40;
  const enemy=Game.spawn("zombi",95,0);
  enemy.hp=enemy.maxHp=10000;
  enemy.posture=95;
  Game.hit(enemy,10,p,{kb:5});
  assert.equal(down.reviveT,72);
  assert.equal(p.combat.rescueAssists,1);
});

test("quick run schedules the final at 10:00, wins on its first defeat and keeps a separate record",()=>{
  const {Game,Save,state,p}=setup(["ranjay"],{sprint:true});
  state.t=600*60-2;
  Game.step();
  assert.equal(Game.hudData().finalIn,1);
  Game.step();
  assert.equal(state.finalPhase,true);
  let result;
  Game.on("end",data=>{result=data;});
  Game.hit(state.finalBoss,1e8,p);
  assert.equal(result.victory,true);
  assert.equal(result.sprint,true);
  assert.equal(result.seconds,600);
  Save.recordRun(result);
  assert.equal(Save.get().bestSprint.time,600);
  assert.equal(Save.get().best.time,0);
});

test("mastery unlocks a cosmetic only once the matching statistic reaches its threshold",()=>{
  const {Save}=setup(["ranjay"]);
  const run={charId:"ranjay",map:"bosque",seconds:300,kills:70,level:8,coins:0};
  Save.recordRun({...run,combat:[{blocks:2,elites:5}]});
  assert.equal(Save.get().mastery.ranjay,undefined);
  Save.recordRun({...run,combat:[{blocks:3}]});
  assert.equal(Save.get().mastery.ranjay,true);
});
