import assert from "node:assert/strict";
import test from "node:test";
import { Match, BLUEPRINTS, dailySetup, suggestPlacement, reactorProduction, REACTOR_FIRST_CYCLE, upgradeCost } from "../juegos/bio-lab-defense/engine.js";
import { CONTRACTS } from "../juegos/bio-lab-defense/operations.js";
import { MISSIONS } from "../juegos/bio-lab-defense/campaign.js";
import { restoreCheckpoint } from "../juegos/bio-lab-defense/checkpoint.js";
import { normalize } from "../juegos/bio-lab-defense/profile.js";

test("legacy completion opens the next chapter with expanded profile slots", () => {
  const profile = normalize({ unlockedLevel: 10, stars: Array(10).fill(2) });
  assert.equal(MISSIONS.length, 38);
  assert.equal(profile.unlockedLevel, 11);
  assert.equal(profile.stars.length, 38);
  assert.equal(profile.medals.length, 38);
  assert.deepEqual(profile.stars.slice(0, 10), Array(10).fill(2));
});

test("the forecast reports the same timings and lanes that the engine spawns", () => {
  for (const [level, contract] of [[6, null], [22, null], ...CONTRACTS.map((c) => [c.level, c])]) {
    const match = new Match(level, null, { contract });
    match.wave = match.maxWaves - 1;
    const forecast = match.preview = match.planWave(match.maxWaves);
    assert.deepEqual(forecast.order, match.planWave(match.maxWaves).order);
    assert.equal(forecast.timeline.length, 4);
    assert.ok(forecast.order.some((entry) => entry.delay >= 90));
    assert.equal(forecast.timeline.flatMap((group) => group.lanes).reduce((a, b) => a + b), forecast.count);
    if (contract?.pressure) {
      assert.ok(forecast.lanes[1] > forecast.lanes[0]);
      assert.ok(forecast.order.filter((entry) => entry.lane === 1 && !entry.boss)
        .every((entry) => entry.speed >= 1.24));
    }
    const expected = forecast.timeline.map((group) => group.time);
    const starts = [];
    match.startWave();
    match.hp = 1000; // Measure the scheduled groups even if every early enemy leaks.
    let previous = 0;
    while (match.time < expected.at(-1) && match.state === "wave") {
      const spawned = forecast.count - match.queue.length;
      if (spawned > previous) starts.push([match.time, spawned]);
      previous = spawned;
      match.tick();
    }
    starts.push([match.time, forecast.count - match.queue.length]);
    for (const time of expected) assert.ok(starts.some(([tick]) => tick === time));
  }
  const daily = dailySetup("2026-11-23");
  assert.ok(daily.map < 3);
  assert.equal(new Match(6, daily).preview.timeline.length, 1);
});

test("signature campaign waves route and announce the configured groups without changing veteran waves", () => {
  const planned = MISSIONS.flatMap((mission, index) =>
    Object.entries(mission.tactics || {}).map(([wave, tactics]) => [index + 1, Number(wave), tactics]));
  assert.equal(planned.length, 6);
  for (const [level, wave, tactics] of planned) {
    const match = new Match(level);
    const preview = match.planWave(wave);
    assert.deepEqual(preview.tactics, tactics);
    assert.equal(new Match(level, null, { veteran: true }).planWave(wave).tactics, null);
    for (const [index, directive] of tactics.groups.entries()) {
      const group = preview.timeline[index];
      assert.equal(group.name, directive.name);
      const entries = preview.order.filter(entry => entry.groupName === directive.name);
      assert.ok(entries.length > 0);
      assert.deepEqual(group.lanes, [0, 1].map(lane => entries.filter(entry => entry.lane === lane).length));
      if (directive.lane != null) assert.ok(entries.every(entry => entry.lane === directive.lane));
      if (directive.shield) assert.ok(entries.some(entry => entry.shield >= directive.shield));
      if (directive.armor) assert.ok(entries.some(entry => entry.armor >= directive.armor));
      if (directive.speed) assert.ok(entries.every(entry => entry.speed >= directive.speed));
      if (directive.gap) assert.equal(entries[0].delay, directive.gap);
      if (directive.spacing) assert.ok(entries.slice(1).every(entry => entry.delay === directive.spacing));
    }
    match.wave = wave - 1;
    match.preview = preview;
    assert.ok(match.startWave());
    assert.deepEqual(match.queue, preview.order);
  }
});

test("entry alerts use the first enemy actually queued for each lane", () => {
  const match = new Match(8, null, { contract: CONTRACTS.find(contract => contract.pressure) });
  const { arrivals } = match.preview;
  assert.equal(arrivals[0].name, "Cambio de entrada");
  assert.ok(arrivals[0].ticks > arrivals[1].ticks);
  match.startWave();
  assert.deepEqual(match.incomingGroups, arrivals);
  for (const [lane, arrival] of arrivals.entries()) {
    const replay = new Match(8, null, { contract: CONTRACTS.find(contract => contract.pressure) });
    replay.startWave();
    for (let tick = 1; tick < arrival.ticks; tick++) {
      replay.tick();
      assert.equal(replay.enemies.some(enemy => enemy.lane === lane), false);
    }
    replay.tick();
    assert.ok(replay.enemies.some(enemy => enemy.lane === lane));
    if (replay.queue.some(entry => entry.lane === lane))
      assert.ok(replay.incomingGroups[lane], "the alert continues through a partially spawned group");
  }
});

test("the next tower skips an enemy already covered by another shot", () => {
  const match = new Match(1);
  assert.ok(match.place(BLUEPRINTS[0], 145, 171));
  assert.ok(match.place(BLUEPRINTS[0], 150, 240));
  match.startWave();
  match.spawn();
  match.spawn();
  const [front, back] = match.enemies;
  Object.assign(front, { x: 220, y: 205, wp: 2, hp: 8 });
  Object.assign(back, { x: 220, y: 182, wp: 2 });
  match.tick();
  assert.equal(match.shots.length, 2);
  assert.equal(match.shots[0].target, front);
  assert.equal(match.shots[1].target, back);
});

test("fixed between-wave support is distinct from controlled recovery", () => {
  const match = new Match(6);
  const count = match.preview.count;
  const reactor = match.place(BLUEPRINTS[7], 50, 60);
  assert.ok(reactor);
  reactor.cooldown = 0;
  match.startWave();
  match.tick();
  assert.ok(match.sell(reactor));
  match.spawn();
  const enemy = match.enemies[0];
  match.combo = 5;
  match.damage(enemy, enemy.hp * 8, "#fff", { piercing: true });
  assert.equal(match.grossATP, enemy.reward + 13);
  match.waveLeaks.lanes[0] = 2;
  match.queue.length = 0;
  match.tick();
  assert.equal(match.debrief.reserve, count * 3);
  assert.equal(match.debrief.recovery, 6);
  assert.equal(match.debrief.reactor, 13);
  assert.equal(match.debrief.bounties, enemy.reward);
  assert.deepEqual(match.debrief.leaks, [2, 0]);
  const { atp, payout, bounties, reserve, recovery } = match.debrief;
  assert.equal(atp, payout + bounties + reserve + recovery + 13);
  assert.equal(match.state, "build");
});

test("Veterano changes formations and combat tempo with a fixed nanobot", () => {
  const standard = new Match(10);
  const veteran = new Match(10, null, { veteran: true, heroId: "vega" });
  assert.equal(veteran.hero.id, "iris");
  assert.equal(veteran.ranked, true);
  assert.notDeepEqual(veteran.preview.order, standard.preview.order);
  assert.ok(veteran.preview.order[0].delay < standard.preview.order[0].delay);
  assert.equal(veteran.startWave(), true);
  const ticks = veteran.incomingGroups.find(Boolean).ticks;
  veteran.tick();
  assert.equal(veteran.incomingGroups.find(Boolean).ticks, ticks - 1);
  const profile = normalize({ stars: [2], veteranRecords: [1350] });
  assert.equal(profile.veteranRecords[0], 1350);
  assert.equal(profile.stars[0], 2);
  const end = veteran.planWave(veteran.maxWaves);
  veteran.queue = [end.order.find((entry) => entry.boss)];
  veteran.spawn();
  const boss = veteran.enemies.at(-1);
  veteran.damage(boss, boss.maxHp * 0.8, "#fff", { piercing: true });
  assert.deepEqual(veteran.mirrorOrders.map((order) => order.lane), [1, 0]);
  assert.equal(veteran.combatCue.kind, "phase");
});

test("Archive terminal A switches to B after the first defended wave", () => {
  const match = new Match(16);
  assert.equal(match.activeTerminal.lane, 0);
  assert.ok(match.preview.lanes[0] > match.preview.lanes[1]);
  match.startWave();
  match.queue = [];
  match.tick();
  assert.equal(match.state, "build");
  assert.equal(match.archive[0].complete, true);
  assert.equal(match.combatCue.kind, "objective");
  assert.equal(match.activeTerminal.lane, 1);
  assert.ok(match.preview.lanes[1] > match.preview.lanes[0]);

  match.startWave();
  const terminal = match.activeTerminal;
  const entry = match.queue.find((enemy) => enemy.lane === 1);
  match.queue = Array(4).fill(entry);
  for (let i = 0; i < 4; i++) {
    match.spawn();
    Object.assign(match.enemies.at(-1), { wp: terminal.waypoint, x: terminal.x, y: terminal.y });
  }
  match.tick();
  assert.equal(terminal.hp, 0);
  assert.equal(match.state, "lost");
  assert.equal(match.hp, 100);
});

test("Carga inversa requires a choice and reverses the effect on the third wave", () => {
  const match = new Match(20);
  const initial = match.planWave(1).order;
  assert.equal(match.startWave(), false);
  assert.equal(match.selectPowerLine(1), true);
  const power = match.preview.order;
  for (const [index, entry] of power.entries())
    assert.equal(entry.speed, initial[index].speed * (entry.lane === 1 ? 0.8 : 1.12));
  assert.equal(match.isolatedLane(3), 0);
  assert.equal(match.isolatedLane(5), null);
  assert.equal(match.startWave(), true);
  assert.equal(match.selectPowerLine(0), false);
});

test("bosses display real disease names and have distinct sprite silhouettes", () => {
  const levels = [4, 6, 8, 10, 14, 18, 22];
  const bosses = levels.flatMap((level) => {
    const match = new Match(level);
    return match.planWave(match.maxWaves).order.filter((entry) => entry.boss).map((entry) => entry.spec);
  });
  assert.deepEqual(bosses.map((spec) => spec.name), [
    "Peste bubónica", "Sarampión", "Difteria", "Cólera", "Gripe de 1918",
    "Tuberculosis", "Poliomielitis", "Viruela",
  ]);
  assert.equal(new Set(bosses.map((spec) => spec.shape)).size, 8);
  const match = new Match(22);
  const normals = match.planWave(5).order.filter((entry) => !entry.boss);
  assert.ok(normals.some((entry) => entry.spec.name === "Norovirus"));
});

function openSmallpoxNodes() {
  const match = new Match(22);
  match.wave = match.maxWaves - 1;
  match.preview = match.planWave(match.maxWaves);
  match.startWave();
  match.queue = [match.queue.find((entry) => entry.zero)];
  match.spawn();
  const boss = match.enemies[0];
  match.damage(boss, boss.hp * 0.4, "#fff", { piercing: true });
  assert.equal(boss.name, "Viruela");
  assert.ok(boss.shield > 0);
  assert.equal(match.zeroNodes.length, 2);
  return { match, boss };
}

test("destroying both nodes exposes the smallpox boss before any reinforcements", () => {
  const { match, boss } = openSmallpoxNodes();
  for (const node of match.zeroNodes)
    match.damage(node, node.hp, "#fff", { piercing: true });
  assert.equal(boss.shield, 0);
  assert.ok(boss.stun >= 170);
  assert.equal(match.queue.length, 0);
  assert.equal(match.kills, 0);
});

test("surviving one node produces reinforcements from that lane only", () => {
  const { match, boss } = openSmallpoxNodes();
  const [left, right] = match.zeroNodes;
  match.damage(left, left.hp, "#fff", { piercing: true });
  while (match.time < right.nextPulse) {
    match.tick();
    if (match.queue.length) break;
  }
  assert.ok(match.queue.length > 0);
  assert.ok(match.queue.every((entry) => entry.lane === 1));
  assert.ok(boss.shield > 0);
  assert.equal(right.destroyed, undefined);
});

test("nanobot abilities boost the expected tower attacks", () => {
  for (const [heroId, flag, type, expected] of [
    ["iris", "markedUntil", "single", 57.5],
    ["mara", "frozenUntil", "splash", 60],
    ["ivo", "exposedUntil", "single", 45],
  ]) {
    const match = new Match(4, null, { heroId });
    match.startWave();
    match.spawn();
    const enemy = match.enemies[0];
    Object.assign(enemy, { hp: 500, x: match.hero.x, y: match.hero.y, armor: heroId === "ivo" ? 10 : 0 });
    assert.equal(match.heroAbility(), true);
    assert.ok(enemy[flag] > match.time);
    const before = enemy.hp;
    match.damage(enemy, 50, "#fff", {}, { rank: 1, type, inflicted: 0, defeated: 0 });
    assert.ok(Math.abs(before - enemy.hp - expected) < 0.001);
  }
});

test("touch snapping only suggests nearby positions that pass placement checks", () => {
  const match = new Match(1);
  const type = BLUEPRINTS[0];
  const check = (x, y) => match.checkPlacement(type, x, y);
  assert.equal(suggestPlacement({ x: 220, y: 200 }, check), null);
  const point = suggestPlacement({ x: 190, y: 200 }, check);
  assert.ok(point);
  assert.equal(check(point.x, point.y), "");
  assert.ok(Math.hypot(point.x - 190, point.y - 200) <= 30);
});

test("three sectors disclose and apply a new B route at the announced wave", () => {
  for (const [level, wave] of [[11, 3], [13, 4], [19, 4]]) {
    const match = new Match(level);
    const original = match.routes[1];
    const alternate = match.routeEvent.alternate;
    assert.notDeepEqual(alternate.points, original.points);
    assert.deepEqual(alternate.points.at(0), original.points.at(0));
    assert.deepEqual(alternate.points.at(-1), original.points.at(-1));
    assert.equal(match.routeEventStatus, null);
    match.wave = wave - 2;
    assert.equal(match.routeEventStatus, "warning");
    assert.equal(match.routes[1], original);
    assert.equal(match.routesForWave(match.coverageWave)[1], original);
    match.wave++;
    assert.equal(match.routesForWave(match.coverageWave)[1], alternate);
    assert.equal(match.routes[1], original, "preview must not open the route");
    if (match.routeEvent.blackout) {
      assert.equal(match.towerOffline(match.routeEvent.blackout, match.coverageWave), true);
      assert.equal(match.towerOffline(match.routeEvent.blackout), false);
    }
    match.preview = match.planWave(wave);
    assert.equal(match.startWave(), true);
    assert.equal(match.routes[1], alternate);
    assert.equal(match.routeEventStatus, "active");
    const { blackout } = match.routeEvent;
    if (level === 19) {
      assert.equal(match.towerOffline(blackout), true);
      assert.equal(match.towerOffline({ x: 876, y: 516 }), false);
      match.state = "build";
      assert.equal(match.towerOffline(blackout), false);
    }
    match.queue = [match.planWave(wave).order.find((entry) => entry.lane === 1)];
    match.spawn();
    assert.equal(match.enemies.at(-1).path, alternate);
  }
  assert.equal(new Match(11, dailySetup("2026-11-23")).routeEvent, undefined);
});

test("escorts protect their lane and scout acceleration stops when hit", () => {
  const match = new Match(11);
  const preview = match.planWave(2);
  const escort = preview.order.find((entry) => entry.variant === "escort");
  const scout = preview.order.find((entry) => entry.variant === "scout");
  const other = preview.order.find((entry) => entry.lane === escort.lane && !entry.variant);
  assert.notEqual(escort.lane, scout.lane);
  match.preview = preview;
  match.startWave();
  match.queue = [escort, other, scout];
  match.spawn();
  match.spawn();
  match.spawn();
  const [guard, ally, runner] = match.enemies;
  ally.shield = 0;
  ally.armor = 0;
  match.tick();
  const hp = ally.hp;
  match.damage(ally, 20, "#fff");
  assert.equal(hp - ally.hp, 11);
  match.damage(guard, guard.hp * 5, "#fff", { piercing: true });
  match.damage(ally, 20, "#fff");
  assert.equal(hp - ally.hp, 31);

  match.time = runner.scoutReady;
  const fastX = runner.x;
  match.tick();
  assert.ok(Math.abs(runner.x - fastX - runner.speed * 1.35) < 1e-6);
  match.damage(runner, 1, "#fff");
  const regularX = runner.x;
  match.tick();
  assert.ok(Math.abs(runner.x - regularX - runner.speed) < 1e-6);
});

test("the conductive line hits a crossing enemy and reconnects after selling its partner", () => {
  const match = new Match(3);
  const coil = { ...BLUEPRINTS[5], x: 100, y: 100, rank: 3, cooldown: 99,
    branch: { link: true }, targeting: "first", inflicted: 0, defeated: 0, paid: 100 };
  const near = { ...BLUEPRINTS[0], x: 257, y: 100, rank: 1, cooldown: 99, paid: 50 };
  const far = { ...BLUEPRINTS[0], x: 260, y: 152, rank: 1, cooldown: 99, paid: 50 };
  match.towers.push(coil, near, far);
  match.startWave();
  match.spawn();
  const enemy = match.enemies.at(-1);
  Object.assign(enemy, { x: 168, y: 100, hp: 100, shield: 0, armor: 0, stun: 3 });
  assert.equal(match.linkPartner(coil), near);
  match.tick();
  const hp = 100 - Math.round(coil.damage * 0.55);
  assert.equal(enemy.hp, hp);
  match.tick();
  assert.equal(enemy.hp, hp);
  match.sell(near);
  assert.equal(match.linkPartner(coil), far);
});

test("the loss report distinguishes a repeated coverage gap from a brief uncovered moment", () => {
  const match = new Match(11);
  match.startWave();
  match.spawn();
  const enemy = match.enemies.at(-1);
  enemy.coverageGaps = [, 6, 2];
  match.recordLeak(enemy, 10);
  match.recordLeak({ ...enemy, lane: 1 - enemy.lane, coverageGaps: [, 2] }, 10);
  assert.equal(match.waveLeaks.impact.loss, 20);
  assert.ok(match.waveLeaks.impact.lanes.includes(0) && match.waveLeaks.impact.lanes.includes(1));
  assert.deepEqual(match.waveLeaks.lanes, [1, 1]);
  assert.deepEqual([...match.waveLeaks.entries.values()].map(({ uncovered }) => uncovered), [1, 0]);
  assert.deepEqual([...match.waveLeaks.gaps.values()], [{ lane: enemy.lane, waypoint: 1, count: 1 }]);
});

test("expansion sectors have two buildable fire pads and preserve previous completions", () => {
  assert.equal(normalize({ unlockedLevel: 22, stars: Array(22).fill(2) }).unlockedLevel, 23);
  for (let level = 23; level <= MISSIONS.length; level++) {
    const match = new Match(level);
    assert.equal(match.firePads.length, 2);
    for (const pad of match.firePads) {
      const tower = match.place(BLUEPRINTS[0], pad.x, pad.y);
      assert.ok(tower);
      assert.equal(match.padBonus(tower), 1.25);
      assert.equal(match.padBonus({ ...tower, type: "eco" }), 1);
      assert.equal(match.padBonus({ ...tower, x: -100 }), 1);
    }
  }
});

test("coverage clips at endpoints and counts both arms of a bend", async () => {
  const { routeCoverage } = await import("../juegos/bio-lab-defense/coverage.js");
  const route = { points: [[0, 0], [100, 0], [100, 100]], remaining: [200, 100, 0] };
  assert.equal(routeCoverage(route, { x: 100, y: 0, range: 30 }), 30);
  assert.equal(routeCoverage(route, { x: 0, y: 0, range: 30 }), 15);
  assert.equal(routeCoverage(route, { x: 30, y: -30, range: 30 }), 0);
  assert.equal(routeCoverage(route, { x: 0, y: 0, range: 200 }), 100);
});

test("objective approach coverage combines overlapping ranges and stops at the defended device", async () => {
  const { routeTeamCoverage } = await import("../juegos/bio-lab-defense/coverage.js");
  const lane = { points: [[0, 0], [100, 0]], remaining: [100, 0] };
  assert.equal(routeTeamCoverage(lane, [{ x: 20, y: 0, range: 30 }, { x: 60, y: 0, range: 20 }]), 80);
  assert.equal(routeTeamCoverage(lane, []), 0);
  const match = new Match(2);
  const objective = match.defenseObjective;
  assert.deepEqual(match.objectiveApproach().points.at(-1), [objective.x, objective.y]);
  match.console.complete = true;
  assert.equal(match.objectiveApproach(), null);
});

test("late archive sectors vary the defense order and restore existing checkpoints safely", () => {
  const levelOf = name => MISSIONS.findIndex(mission => mission.name === name) + 1;
  const foundry = new Match(levelOf("Crisol doble"));
  assert.deepEqual(foundry.archive.map(device => device.waypoint), [4, 3]);
  const garden = new Match(levelOf("Semillas de memoria"));
  assert.deepEqual(garden.archive.map(device => device.lane), [1, 0]);
  assert.ok(garden.preview.lanes[1] > garden.preview.lanes[0]);
  const saved = { ...garden, wave: 1 };
  const resumed = restoreCheckpoint({ ...saved, archiveFirstLane: 1 });
  assert.equal(resumed.match.activeTerminal.lane, 0);
  assert.ok(resumed.match.archive[0].complete);
  const legacy = restoreCheckpoint(saved);
  assert.equal(legacy.match.activeTerminal.lane, 1);
  assert.ok(legacy.match.archive[0].complete);
});

test("objective targeting prefers an approaching enemy while manual focus overrides it", () => {
  for (const [mode, manual, expected] of [["first", false, "passed"], ["objective", false, "approach"], ["objective", true, "passed"]]) {
    const match = new Match(2);
    const tower = match.place(BLUEPRINTS[0], 265, 195);
    assert.ok(tower);
    tower.targeting = mode;
    match.startWave();
    match.spawn();
    match.spawn();
    const [approach, passed] = match.enemies;
    Object.assign(approach, { x: 220, y: 185, wp: 2 });
    Object.assign(passed, { x: 240, y: 150, wp: 3 });
    if (manual) match.focusFire(passed);
    match.tick();
    assert.equal(match.shots[0].target, expected === "passed" ? passed : approach);
  }
});

test("focus fire overrides route priority in range and releases a defeated target", () => {
  const match = new Match(1);
  const tower = match.place(BLUEPRINTS[0], 145, 171);
  assert.equal(match.focusFire({}), false);
  match.startWave();
  match.spawn();
  match.spawn();
  const [front, back] = match.enemies;
  Object.assign(front, { x: 220, y: 205, wp: 2 });
  Object.assign(back, { x: 220, y: 182, wp: 2 });
  assert.equal(match.focusFire(back), true);
  match.tick();
  assert.equal(match.shots[0].target, back);
  Object.assign(back, { x: 510, y: 182 });
  tower.cooldown = 0;
  match.tick();
  assert.equal(match.shots.at(-1).target, front);
  match.damage(back, 10000, "#fff");
  match.tick();
  assert.equal(match.focusTarget, null);
  assert.equal(match.focusFire(back), false);
});

test("a rehearsal reproduces an unattended wave without changing the prepared defense", async () => {
  const { startDrill } = await import("../juegos/bio-lab-defense/drill.js");
  for (const level of [1, 2, 11, 19, 22, 38]) {
    const match = new Match(level, null, { heroId: "iris" });
    if (level === 22) match.wave = match.maxWaves - 1;
    if (match.routeEvent) match.wave = match.routeEvent.wave - 1;
    match.preview = match.planWave(match.wave + 1);
    const pad = match.firePads[0];
    if (pad) match.place(BLUEPRINTS[0], pad.x, pad.y);
    const before = JSON.stringify(match);
    const sim = startDrill(match);
    while (sim.state === "wave") sim.tick();
    assert.equal(JSON.stringify(match), before);
    match.startWave();
    while (match.state === "wave") match.tick();
    assert.deepEqual([sim.hp, sim.kills, sim.state, sim.waveLeaks], [match.hp, match.kills, match.state, match.waveLeaks]);
  }
  assert.equal(startDrill(new Match(20)), null);
});

test("upgrade rehearsals match a purchased specialization and leave the original defense intact", async () => {
  const { startDrill } = await import("../juegos/bio-lab-defense/drill.js");
  const match = new Match(1);
  const tower = match.place(BLUEPRINTS[0], 145, 171);
  assert.ok(match.upgrade(tower));
  const before = JSON.stringify(match);
  const rehearsals = [0, 1].map(choice => startDrill(match, { towerIndex: 0, choice }));
  assert.notEqual(rehearsals[0].towers[0].branch.name, rehearsals[1].towers[0].branch.name);
  for (const sim of rehearsals) {
    assert.equal(sim.towers[0].rank, 3);
    assert.equal(sim.atp, match.atp - upgradeCost(tower));
    while (sim.state === "wave") sim.tick();
  }
  assert.equal(JSON.stringify(match), before);
  assert.equal(startDrill(match, { towerIndex: 9, choice: 0 }), null);
  assert.ok(match.upgrade(tower, 0));
  match.startWave();
  while (match.state === "wave") match.tick();
  const result = sim => [sim.hp, sim.atp, sim.kills, sim.state, sim.waveLeaks];
  assert.deepEqual(result(rehearsals[0]), result(match));
});

test("restored towers keep their investment and legacy saves keep the catalog price", () => {
  const match = new Match(1);
  const tower = match.place(BLUEPRINTS[0], 145, 171);
  const data = { ...match, towers: [{ ...tower, branch: -1, angle: 0, paid: 42 }], selected: 0, lastBuild: 0 };
  const restored = restoreCheckpoint(data);
  assert.equal(restored.selected, restored.match.towers[0]);
  assert.equal(restored.match.undoPlacement().paid, 42);
  assert.equal(restored.match.atp, match.atp + 42);

  delete data.towers[0].paid;
  delete data.selected;
  const legacy = restoreCheckpoint(data);
  assert.equal(legacy.selected, null);
  assert.equal(legacy.match.towers[0].paid, tower.cost);
});

test("reactor production forecasts match the first cycle and both specialization intervals", () => {
  for (const branch of [null, 0, 1]) {
    const match = new Match(1);
    match.atp = 400;
    const reactor = match.place(BLUEPRINTS[7], 50, 60);
    assert.ok(reactor);
    if (branch !== null) {
      assert.ok(match.upgrade(reactor));
      assert.ok(match.upgrade(reactor, branch));
    }
    const forecast = reactorProduction(reactor);
    const initialCharge = match.charge;
    match.startWave();
    for (let tick = 1; tick < REACTOR_FIRST_CYCLE; tick++) match.tick();
    assert.equal(reactor.produced, 0);
    match.tick();
    assert.equal(reactor.produced, forecast.output);
    assert.equal(match.charge, initialCharge + forecast.charge);
    for (let tick = 1; tick < forecast.ticks; tick++) match.tick();
    assert.equal(reactor.produced, forecast.output);
    match.tick();
    assert.equal(reactor.produced, 2 * forecast.output);
  }
});

test("campaign affinities modify tower damage without changing nanobot damage", () => {
  const match = new Match(6);
  match.startWave();
  const phage = match.preview.order.find(entry => entry.spec.shape === "phage");
  assert.ok(phage);
  match.queue.unshift(phage);
  match.spawn();
  const enemy = match.enemies.at(-1);
  assert.deepEqual(enemy.affinity, { weak: "Láser", resist: "Térmico" });
  const tower = { rank: 1, inflicted: 0 };
  for (const [id, expected] of [["nanolaser", 25], ["plasma", 15], ["tesla", 20], ["iris", 20]]) {
    Object.assign(enemy, { hp: 100, armor: 0, shield: 0 });
    const source = id === "iris" ? { id, inflicted: 0 } : { ...tower, id };
    match.damage(enemy, 20, "#fff", {}, source);
    assert.equal(enemy.hp, 100 - expected);
  }
  assert.equal(new Match(2).hasAffinities, false);
  assert.equal(new Match(6, dailySetup("2026-11-24")).hasAffinities, false);
});

test("the first hit forecast matches affinity, armor, shields and specialization", () => {
  const match = new Match(6);
  const tower = match.place(BLUEPRINTS[0], 50, 60);
  match.atp = 1000;
  assert.ok(match.upgrade(tower));
  assert.ok(match.upgrade(tower, 0)); // Partial shield bypass.
  const sample = match.planWave(2).order.find(entry => entry.spec.shape === "phage");
  assert.ok(sample);
  const entry = { ...sample, shield: 0.42, armor: 8 };
  match.wave = 1;
  match.preview = match.planWave(2);
  const preview = match.estimateImpact(tower, entry);
  match.startWave();
  match.queue.unshift(entry);
  match.spawn();
  const enemy = match.enemies.at(-1);
  const shield = enemy.shield;
  const hp = enemy.hp;
  match.hit(enemy, { tower, type: tower.type, damage: tower.damage, color: tower.color, branch: tower.branch });
  assert.ok(preview.damage > 0 && preview.shieldDamage > 0);
  assert.ok(Math.abs(preview.damage - (hp - enemy.hp)) < 1e-8);
  assert.equal(preview.shieldDamage, shield - enemy.shield);
  assert.ok(preview.unshieldedDamage > preview.damage);
  let shots = 1;
  while (enemy.hp > 0 && shots < 100) {
    match.hit(enemy, { tower, type: tower.type, damage: tower.damage, color: tower.color, branch: tower.branch });
    shots++;
  }
  assert.equal(shots, preview.hitsToDefeat);
  const boss = match.planWave(match.maxWaves).order.find(item => item.boss);
  assert.equal(match.estimateImpact(tower, boss, match.maxWaves).hitsToDefeat, null);
});
