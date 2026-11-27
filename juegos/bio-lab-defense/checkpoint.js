import { BLUEPRINTS, HEIGHT, Match, TARGETING, WIDTH, specializations } from "./engine.js?v=43";

import { MISSIONS } from "./campaign.js?v=16";

const version = 1;
const blueprintById = new Map(BLUEPRINTS.map((type) => [type.id, type]));
const targetModes = new Set(TARGETING.map(([id]) => id));
const number = (value, min, max) =>
  Number.isFinite(value) && value >= min && value <= max;
const integer = (value, min, max) =>
  Number.isInteger(value) && number(value, min, max);

export class Checkpoint {
  constructor(owner) {
    this.key = `biolab_checkpoint:${owner || "guest"}`;
    this.raw = null;
  }

  read(maxLevel) {
    try {
      this.raw = localStorage.getItem(this.key);
      if (!this.raw || this.raw.length > 80000) return null;
      const data = JSON.parse(this.raw);
      if (data?.version !== version || !integer(data.level, 1, maxLevel))
        return null;
      return data;
    } catch {
      return null;
    }
  }

  write(match, { atpBought, repaired, speed, selected, blueprint }) {
    if (match.ranked || match.state !== "build") return false;
    const data = {
      version,
      fixedLayout: match.fixedLayout || undefined,
      limitedConstruction: match.limitedConstruction,
      level: match.level,
      wave: match.wave,
      hp: match.hp,
      atp: match.atp,
      grossATP: match.grossATP,
      charge: match.charge,
      kills: match.kills,
      pulses: match.pulses,
      specialized: match.specialized,
      combo: match.combo,
      comboTime: match.comboTime,
      adUsed: match.adUsed,
      atpBought,
      repaired,
      speed,
      selected: match.towers.indexOf(selected),
      blueprint: blueprint?.id,
      hero: match.hero ? {
        id: match.hero.id, x: match.hero.x, y: match.hero.y,
        abilityCooldown: match.hero.abilityCooldown, cooldown: match.hero.cooldown,
        inflicted: match.hero.inflicted, defeated: match.hero.defeated, shieldsBroken: match.hero.shieldsBroken,
        slowTicks: match.hero.slowTicks, synergyHits: match.hero.synergyHits,
      } : undefined,
      barrierRemaining: match.barrier && Math.max(0, match.barrier.until - match.time),
      barrierUsed: match.barrier?.used,
      powerFirst: match.power?.first,
      archiveFirstLane: match.archive?.[0].lane,

      gateDiverted: match.gateRoutes ? match.gateDiverted : undefined,
      routeDiverted: match.routeEvent ? match.routes[1] === match.routeEvent.alternate : undefined,
      debrief: match.debrief,
      lastBuild: match.undoable ? match.towers.indexOf(match.lastBuild) : -1,
      towers: match.towers.map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        rank: t.rank,
        paid: t.paid,
        branch: specializations(t).indexOf(t.branch),
        targeting: t.targeting,
        angle: t.angle || 0,
        cooldown: t.cooldown,
        inflicted: t.inflicted,
        defeated: t.defeated,
        produced: t.produced,
        slowTicks: t.slowTicks,
        shieldsBroken: t.shieldsBroken,
        synergyHits: t.synergyHits,
        corrosionDamage: t.corrosionDamage,
        chillDamage: t.chillDamage,
      })),
    };
    try {
      if (localStorage.getItem(this.key) !== this.raw) return false;
      const raw = JSON.stringify(data);
      localStorage.setItem(this.key, raw);
      this.raw = raw;
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    try {
      if (localStorage.getItem(this.key) !== this.raw) return false;
      localStorage.removeItem(this.key);
      this.raw = null;
      return true;
    } catch {
      return false;
    }
  }
}

export function restoreCheckpoint(data) {
  if (!data || !integer(data.level, 1, MISSIONS.length)) return null;
  const match = new Match(data.level, null, {
    heroId: data.hero?.id,
    fixedLayout: data.fixedLayout === true,
    limitedConstruction: data.limitedConstruction === true,
    legacyArchiveOrder: data.wave > 0 && data.archiveFirstLane !== 1,
  });
  if (
    !integer(data.wave, 0, match.maxWaves - 1) ||
    !integer(data.hp, 1, 100) ||
    !integer(data.atp, 0, 100000) ||
    !integer(data.grossATP, 0, 100000) ||
    !integer(data.kills, 0, 2000) ||
    !integer(data.charge, 0, 100) ||
    !integer(data.pulses, 0, 200) ||
    !integer(data.specialized, 0, 400) ||
    !integer(data.combo, 0, 10) ||
    !integer(data.comboTime, 0, 210) ||
    !Array.isArray(data.towers) ||
    data.towers.length > 256
  )
    return null;
  if (match.hero && number(data.hero.x, 19, 881) && number(data.hero.y, 19, 521)) {
    match.moveHero(data.hero.x, data.hero.y);
    if (number(data.hero.inflicted, 0, Number.MAX_SAFE_INTEGER)) match.hero.inflicted = data.hero.inflicted;
    for (const stat of ["defeated", "shieldsBroken", "slowTicks", "synergyHits"]) {
      if (integer(data.hero[stat], 0, Number.MAX_SAFE_INTEGER)) match.hero[stat] = data.hero[stat];
    }
    if (integer(data.hero.abilityCooldown, 0, match.hero.recharge))
      match.hero.abilityCooldown = data.hero.abilityCooldown;
    if (number(data.hero.cooldown, -100000, 2000)) match.hero.cooldown = data.hero.cooldown;
  }
  if (match.console) match.console.complete = data.wave > 0;
  if (match.barrier) {
    match.barrier.used = data.barrierUsed === true;
    if (match.barrier.used && integer(data.barrierRemaining, 0, 240))
      match.barrier.until = match.time + data.barrierRemaining;
  }
  if (match.archive)
    for (const [index, terminal] of match.archive.entries()) terminal.complete = data.wave > index;
  if (match.power) {
    // Older saves for this sector can already be between the planned cuts.
    match.power.first = [0, 1].includes(data.powerFirst) ? data.powerFirst : data.wave > 0 ? 0 : null;
  }
  if (data.gateDiverted === true && !match.toggleGate()) return null;
  if (data.routeDiverted === true) match.applyRouteEvent(data.wave);
  match.atp = 100000;
  for (const item of data.towers) {
    if (
      !item ||
      !number(item.x, 24, 876) ||
      !number(item.y, 24, 516) ||
      !integer(item.rank, 1, 3) ||
      !targetModes.has(item.targeting) ||
      !number(item.angle, -Math.PI, Math.PI) ||
      !number(item.cooldown, -100000, 2000) ||
      !number(item.inflicted, 0, 1000000) ||
      !integer(item.defeated, 0, 2000) ||
      !integer(item.produced, 0, 100000)
    )
      return null;
    const type = blueprintById.get(item.id);
    const tower = match.place(type, item.x, item.y, true);
    if (!tower) return null;
    if (item.rank >= 2 && !match.upgrade(tower)) return null;
    if (item.rank === 3 && !match.upgrade(tower, item.branch)) return null;
    Object.assign(tower, {
      paid: integer(item.paid, 1, 100000) ? item.paid : tower.paid,
      targeting: item.targeting,
      angle: item.angle,
      cooldown: item.cooldown,
      inflicted: item.inflicted,
      defeated: item.defeated,
      produced: item.produced,
      slowTicks: integer(item.slowTicks, 0, 1000000) ? item.slowTicks : 0,
      shieldsBroken: integer(item.shieldsBroken, 0, 2000) ? item.shieldsBroken : 0,
      synergyHits: integer(item.synergyHits, 0, 200000) ? item.synergyHits : 0,
      corrosionDamage: number(item.corrosionDamage, 0, 1000000) ? item.corrosionDamage : 0,
      chillDamage: number(item.chillDamage, 0, 1000000) ? item.chillDamage : 0,
    });
  }
  for (const key of [
    "wave",
    "hp",
    "atp",
    "grossATP",
    "charge",
    "kills",
    "pulses",
    "specialized",
    "combo",
    "comboTime",
  ]) {
    match[key] = data[key];
  }
  match.adUsed = data.adUsed === true;
  const last = match.towers[data.lastBuild];
  match.lastBuild = last?.rank === 1 ? last : null;
  match.preview = match.planWave(data.wave + 1);
  match.effects = [];
  if (
    number(data.debrief?.damage, 0, 100) &&
    integer(data.debrief?.kills, 0, 2000) &&
    integer(data.debrief?.atp, 0, 100000)
  ) {
    const { damage, kills, atp, payout, reserve, recovery, reactor, bounties, leaks, worst, gap } = data.debrief;
    match.debrief = { damage, kills, atp, reserve: integer(reserve, 0, atp) ? reserve : 0,
      recovery: integer(recovery, 0, atp) ? recovery : 0 };
    if (typeof data.debrief.heroImpact === "string") match.debrief.heroImpact = data.debrief.heroImpact.slice(0, 600);
    for (const stat of ["corrosionDamage", "chillDamage"])
      if (integer(data.debrief[stat], 0, 1000000)) match.debrief[stat] = data.debrief[stat];
    if ([payout, reserve, recovery, reactor, bounties].every(amount => integer(amount, 0, atp)) &&
        payout + reserve + recovery + reactor + bounties === atp)
      Object.assign(match.debrief, { payout, reactor, bounties });
    if (Array.isArray(leaks) && leaks.length === match.routes.length &&
        leaks.every(count => integer(count, 0, 2000))) {
      match.debrief.leaks = leaks;
      if (integer(worst?.lane, 0, leaks.length - 1) && leaks[worst.lane] &&
          number(worst.loss, 1, damage) && typeof worst.name === "string" && worst.name.length <= 120)
        match.debrief.worst = worst;
      if (integer(gap?.lane, 0, leaks.length - 1) && integer(gap.count, 1, leaks[gap.lane]) &&
          Array.isArray(gap.points) && gap.points.length === 2 &&
          gap.points.every(point => Array.isArray(point) && point.length === 2 &&
            number(point[0], 0, WIDTH) && number(point[1], 0, HEIGHT)))
        match.debrief.gap = gap;
    }
  }
  const selected = integer(data.selected, 0, match.towers.length - 1) ? match.towers[data.selected] : null;
  const blueprint = blueprintById.get(data.blueprint);
  return {
    match,
    selected,
    blueprint: blueprint?.unlock <= match.techLevel ? blueprint : BLUEPRINTS[0],
    atpBought: data.atpBought === true,
    repaired: data.repaired === true,
    speed: data.speed === 2 ? 2 : 1,
  };
}
