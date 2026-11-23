import assert from "node:assert/strict";
import test from "node:test";
import { Match, BLUEPRINTS, dailySetup } from "../juegos/bio-lab-defense/engine.js";
import { CONTRACTS } from "../juegos/bio-lab-defense/operations.js";
import { MISSIONS } from "../juegos/bio-lab-defense/campaign.js";
import { normalize } from "../juegos/bio-lab-defense/profile.js";

test("legacy completion opens the next chapter with expanded profile slots", () => {
  const profile = normalize({ unlockedLevel: 10, stars: Array(10).fill(2) });
  assert.equal(MISSIONS.length, 22);
  assert.equal(profile.unlockedLevel, 11);
  assert.equal(profile.stars.length, 22);
  assert.equal(profile.medals.length, 22);
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
  match.startWave();
  match.spawn();
  const enemy = match.enemies[0];
  match.combo = 5;
  match.damage(enemy, enemy.hp * 8, "#fff", { piercing: true });
  assert.equal(match.grossATP, enemy.reward);
  match.waveLeaks.lanes[0] = 2;
  match.queue.length = 0;
  match.tick();
  assert.equal(match.debrief.reserve, count * 3);
  assert.equal(match.debrief.recovery, 6);
  assert.equal(match.state, "build");
});
