// Run with: node --test tests/survivors.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function engine() {
  const context = vm.createContext({ console, performance, Math, Map, Set,
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    localStorage: { getItem: () => null, setItem() {} },
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
  Game.state.t=20; Game.state.endless=true; Game.state.endlessStart=10;
  const snap = Game.snapshot([p]);
  const info={localId:0,players:[setup('ranjay')]};
  Game.startGuest(info); Game.applySnapshot(snap);
  assert.equal(Game.state.players[0].atk.ax, -0.3);
  assert.equal(Game.state.players[0].moveX, -0.6);
  assert.equal(Game.state.endless, true);
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
    p.weapons=Object.keys(TS.WEAPONS).map(id=>({id,lvl:6,evo:true,cd:0,combo:0,comboT:0,drones:[]}));
    for(let i=0;i<1800;i++) {
      if(Game.state.choosing) for(const id of Object.keys(Game.state.choosing)) Game.choose(+id,0);
      Game.setInput(0,{x:Math.sin(i/100),y:Math.cos(i/100),ab:Math.floor(i/300)}); Game.step();
    }
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.hp),ch.id);
    for(const e of Game.state.enemies) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.hp),ch.id+':'+e.type);
    assert.equal(Game.state.over,false,ch.id);
  }
});
test('all maps reach their final boss and can continue in endless mode', () => {
  const { Game, TS } = engine();
  for (const [map, def] of Object.entries(TS.MAPS)) {
    Game.start([setup('ranjay')],{seed:54321,map});
    const st=Game.state,p=st.players[0]; p.stats.armor=10000;p.stats.might=1000;
    p.stats.area=10; p.weapons=[{id:'colonia',lvl:6,evo:true,cd:0,combo:0,comboT:0,drones:[]}];
    // Exercise the late wave and each final boss without waiting ten real minutes.
    st.t=TS.RUN_SECONDS*60-1;st.bossIdx=TS.BOSSES.length-1;st.hordeIdx=TS.HORDES.length;
    Game.step(); assert.equal(st.boss.type,def.finalBoss||'rey',map);
    st.boss.x=p.x+10;st.boss.y=p.y+10;
    for(let i=0;i<900&&!st.victoryWait;i++) {
      if(st.choosing) for(const id of Object.keys(st.choosing)) Game.choose(+id,0);
      Game.step();
    }
    assert.equal(st.victoryWait,true,map);
    Game.continueEndless(); assert.equal(st.endless,true,map);
    st.t=st.endlessBossT-1;Game.step(); assert.equal(st.endlessLoops,1,map);
    Game.finish(false);assert.equal(st.over,true,map);
  }
});
