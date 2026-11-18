const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup(charId = "ranjay", options = {}) {
  const sandbox = vm.createContext({
    console, performance, Math, Map, Set,
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    localStorage: {getItem: () => null, setItem() {}},
    Sprites: {get() {}},
    Sfx: new Proxy({}, {get: () => () => {}}), L: text => text, LT: text => text
  });
  for (const file of ["data", "save", "game"]) {
    let source = fs.readFileSync(path.join(__dirname, "../survivors/js", file+".js"), "utf8");
    if (file === "game") source = source.replace("    difficultyAt,", `
      spawn:spawnEnemy, grid:buildGrid, sites:updateSites, defenders:updateDefenders,
      contact, hit:hitEnemy, nextFinalRound, pressure:midgamePressure, zones:updateZones,
      finalPressure, applyChoice, describeMastery, tech:techniqueAttack, heal:healPlayer,
      difficultyAt,`);
    vm.runInContext(source, sandbox);
  }
  const {Game, TS, Save} = vm.runInContext("({Game,TS,Save})", sandbox);
  Game.start([{charId}], {seed:43, ...options});
  const state = Game.state, player = state.players[0];
  state.spawnT = state.nextBreach = state.nextElite = state.nextNest = 1e9;
  state.bossIdx = state.hordeIdx = 100;
  player.weapons[0].cd = 1e6;
  return {Game, TS, Save, state, player};
}

test("camp defenders stay at their post, shoot, take hostile bullets and survive in guest snapshots", () => {
  const {Game,state,player} = setup();
  const camp = state.sites[0];
  player.x = camp.x;
  player.y = camp.y;
  camp.progress = 119;
  Game.sites();
  assert.equal(camp.defenders.length, 2);
  const guard = camp.defenders[0];
  const {x,y,hp} = guard;
  const enemy = Game.spawn("zombi", x+100, y);
  enemy.hp = enemy.maxHp = 1000;
  Game.grid();
  guard.reload = 1;
  Game.defenders(camp.defenders);
  assert.ok(enemy.hp < 1000);
  assert.ok(player.combat.bySkill.camp.damage > 0);
  assert.equal(guard.x, x);
  assert.equal(guard.y, y);
  player.x = x-300;
  player.y = y+300;
  state.activeDefenders = camp.defenders;
  state.eshots = [{x:x-40,y:y-18,vx:80,vy:0,r:4,life:20,dmg:999}];
  Game.contact();
  assert.equal(guard.hp, 0);
  assert.ok(hp > 0);
  state.t = camp.activeUntil;
  Game.sites();
  Game.sites();
  assert.equal(state.pickups.filter(item => item.kind === "cofre").length, 1);
  const snapshot = JSON.parse(JSON.stringify(Game.snapshot([player])));
  Game.startGuest({localId:0,players:[{charId:"ranjay"}]});
  Game.applySnapshot(snapshot);
  assert.equal(Game.state.sites[0].defenders.filter(defender => defender.hp > 0).length, 1);
});

test("lightning and drone lasers break unattended crates, without counting them as kills", () => {
  for (const character of ["quizo","zeta"]) {
    const {Game,state,player} = setup(character);
    const crate = Game.spawn("caja",player.x+48,player.y);
    const weapon = player.weapons[0];
    weapon.cd = 0;
    weapon.drones = [{a:0,cd:0}];
    Game.step();
    assert.equal(crate.dead, true, character);
    assert.equal(state.propsBroken, 1);
    assert.equal(state.kills, 0);
  }
});

test("short-range techniques wait for a reachable target", () => {
  const {Game,state,player} = setup();
  state.nextPressure = 1e9;
  player.techniques.burst = 1;
  player.techCds.burst = 0;
  const enemy = Game.spawn("zombi",player.x+320,player.y);
  Game.step();
  assert.ok(player.techCds.burst <= 0);
  enemy.x = player.x+42;
  enemy.y = player.y;
  Game.step();
  assert.ok(player.techCds.burst > 0);
});

test("the rank-five variant changes a technique and reaches the guest", () => {
  const {Game,player,state} = setup("duna");
  player.techniques.pierce = 4;
  const option = Game.describeMastery(player,{id:"pierce",lvl:5,kind:"technique"},"reach");
  Game.applyChoice(player,option);
  Game.grid();
  Game.tech(player,"pierce",5);
  assert.equal(player.techniques.pierce,5);
  assert.ok(state.zones.some(zone => zone.windMastery === "reach"));
  const snapshot = Game.snapshot([player]);
  Game.startGuest({localId:0,players:[{charId:"duna"}]});
  Game.applySnapshot(snapshot);
  assert.match(Game.hudData().techniques.find(move=>move.id==="pierce").name,/Cobertura/);
});

test("early formations warn before spawning and Veteran pressure starts sooner", () => {
  for (const veteran of [false,true]) {
    const {Game,state} = setup("ranjay",{veteran});
    assert.equal(state.nextPressure, (veteran?145:180)*60);
    state.t = state.nextPressure;
    Game.pressure();
    const warning = state.zones.find(zone=>zone.type==="pincer");
    assert.equal(warning.formation,"escort");
    assert.equal(state.enemies.length,0);
    for(let frame=0;frame<90;frame++)Game.zones();
    assert.ok(state.enemies.some(enemy=>enemy.type==="guardian"));
    assert.ok(state.enemies.some(enemy=>enemy.type==="sanador"));
  }
});

test("the skeleton king summons destructible obelisks and is exposed after the last one falls", () => {
  const {Game,state,player} = setup("ranjay",{map:"cementerio"});
  const boss = Game.spawn("reyEsqueleto",player.x+180,player.y);
  boss.relentless = true;
  boss.finalRound = 1;
  state.finalPhase = true;
  state.finalBoss = boss;
  Game.nextFinalRound(boss);
  const obelisks = state.enemies.filter(enemy=>enemy.phaseObelisk===boss.id);
  assert.equal(obelisks.length,2);
  for(const obelisk of obelisks)Game.hit(obelisk,1e6,player);
  assert.ok(obelisks.every(obelisk=>obelisk.dead));
  assert.ok(boss.staggerUntil>state.t);
});

test("practice runs never emit a normal game result and Veteran records stay separate", () => {
  const {Game,Save,state,player} = setup("iria",{training:"shield"});
  let finished = false, results = 0;
  Game.on("trainingEnd", () => { finished = true; });
  Game.on("end", () => { results++; });
  assert.equal(state.enemies[0].type,"guardian");
  const start = player.x;
  Game.setInput(0,{x:1,y:0,dash:1});
  Game.step();
  assert.ok(player.x > start);
  Game.finish(false);
  assert.equal(finished,true);
  assert.equal(results,0);
  Save.recordRun({charId:"iria",map:"bosque",veteran:true,seconds:300,kills:90,level:9,coins:12});
  assert.equal(Save.get().bestVeteran.time,300);
  assert.equal(Save.get().best.time,0);
});

test("rank five offers both variants through a real level-up choice", () => {
  const {Game,TS,state,player} = setup("duna");
  player.talents = ["edge","tempo","resolve"];
  player.activePath = "precision";
  const weapon = player.weapons[0];
  weapon.lvl = 6;
  weapon.evo = true;
  player.passives = Object.fromEntries(Object.entries(TS.PASSIVES).slice(0,TS.MAX_PASSIVES).map(([id,def])=>[id,def.max]));
  player.techniques = Object.fromEntries(TS.TECHNIQUES.duna.map(move=>[move.id,5]));
  player.techniques.pierce = 4;
  state.level = 45;
  state.t = 11*3600;
  state.nextPressure = 1e9;
  state.xp = state.xpNext;
  Game.step();
  const options = state.choosing[0];
  assert.deepEqual(Array.from(options, option=>option.variant), ["power","reach"]);
  Game.choose(0,0);
  assert.equal(player.techniquePaths.pierce,"power");
  assert.equal(player.techniques.pierce,5);
});

test("city refuge pays once for eight kills and beach supply expires", () => {
  for (const map of ["ciudad","playa"]) {
    const {Game,state,player} = setup("ranjay",{map});
    const site = state.sites[0];
    player.x = site.x;
    player.y = site.y;
    site.progress = 119;
    Game.sites();
    if (map === "ciudad") {
      for(let i=0;i<8;i++)Game.hit(Game.spawn("zombi",site.x+15,site.y),1e5,player);
      assert.equal(site.lampKills,8);
    }
    state.t = site.activeUntil;
    Game.sites();
    assert.equal(state.pickups.filter(item=>item.kind==="cofre" && item.x===site.x && item.y===site.y).length,1);
    if (map === "playa") {
      const supply = state.pickups.find(item=>item.expires);
      assert.equal(supply.expires-state.t,720);
      state.t = supply.expires;
      state.nextPressure = 1e9;
      Game.step();
      assert.equal(state.pickups.includes(supply),false);
    }
  }
});

test("the General's warned lanes hurt along the line after the countdown", () => {
  const {Game,state,player} = setup("ranjay",{map:"ciudad"});
  const boss = Game.spawn("general",player.x+250,player.y);
  state.finalBoss = boss;
  state.finalRound = 2;
  state.finalPulseT = 0;
  state.t = 120;
  player.iframes = 0;
  Game.finalPressure();
  const lanes = state.zones.filter(zone=>zone.barrageDamage);
  assert.equal(lanes.length,2);
  player.x = (lanes[0].x + lanes[0].tx)/2;
  player.y = (lanes[0].y + lanes[0].ty)/2;
  const initial = player.hp;
  for(let i=0;i<59;i++)Game.zones();
  assert.equal(player.hp,initial);
  Game.zones();
  assert.ok(player.hp < initial);
});
