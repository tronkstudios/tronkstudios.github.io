import { BLUEPRINTS, Match, TARGETING, specializations } from "./engine.js?v=10";

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

  write(match, { atpBought, repaired, speed }) {
    if (match.ranked || match.state !== "build") return false;
    const data = {
      version,
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
      hero: match.hero ? {
        id: match.hero.id, x: match.hero.x, y: match.hero.y,
        abilityCooldown: match.hero.abilityCooldown, cooldown: match.hero.cooldown,
      } : undefined,
      barrierUsed: match.barrier?.used,

      gateDiverted: match.gateRoutes ? match.gateDiverted : undefined,
      debrief: match.debrief,
      lastBuild: match.undoable ? match.towers.indexOf(match.lastBuild) : -1,
      towers: match.towers.map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        rank: t.rank,
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
  if (!data || !integer(data.level, 1, 10)) return null;
  const match = new Match(data.level, null, { heroId: data.hero?.id });
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
    if (integer(data.hero.abilityCooldown, 0, match.hero.recharge))
      match.hero.abilityCooldown = data.hero.abilityCooldown;
    if (number(data.hero.cooldown, -100000, 2000)) match.hero.cooldown = data.hero.cooldown;
  }
  if (match.console) match.console.complete = data.wave > 0;
  if (match.barrier) match.barrier.used = data.barrierUsed === true;
  if (data.gateDiverted === true && !match.toggleGate()) return null;
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
    const tower = match.place(blueprintById.get(item.id), item.x, item.y);
    if (!tower) return null;
    if (item.rank >= 2 && !match.upgrade(tower)) return null;
    if (item.rank === 3 && !match.upgrade(tower, item.branch)) return null;
    Object.assign(tower, {
      targeting: item.targeting,
      angle: item.angle,
      cooldown: item.cooldown,
      inflicted: item.inflicted,
      defeated: item.defeated,
      produced: item.produced,
      slowTicks: integer(item.slowTicks, 0, 1000000) ? item.slowTicks : 0,
      shieldsBroken: integer(item.shieldsBroken, 0, 2000) ? item.shieldsBroken : 0,
      synergyHits: integer(item.synergyHits, 0, 200000) ? item.synergyHits : 0,
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
    match.debrief = data.debrief;
  }
  return {
    match,
    atpBought: data.atpBought === true,
    repaired: data.repaired === true,
    speed: data.speed === 2 ? 2 : 1,
  };
}
