import { CHAPTERS, MISSIONS, missionRoutes } from "./campaign.js?v=3";

import { HERO_BY_ID } from "./operations.js?v=2";

export const TOWER_TYPES = [
  {
    id: "nanolaser",
    name: "Nano-Láser",
    cost: 50,
    range: 120,
    damage: 14,
    fireRate: 28,
    color: "#00f3ff",
    type: "single",
  },
  {
    id: "cryo",
    name: "Crio-Gel",
    cost: 65,
    range: 105,
    damage: 6,
    fireRate: 35,
    color: "#7dd3fc",
    type: "slow",
  },
  {
    id: "phagocyte",
    name: "Fagocito",
    cost: 80,
    range: 90,
    damage: 26,
    fireRate: 45,
    color: "#00ff88",
    type: "single",
  },
  {
    id: "plasma",
    name: "Pulso Plasma",
    cost: 100,
    range: 115,
    damage: 18,
    fireRate: 50,
    color: "#ff007f",
    type: "splash",
  },
  {
    id: "toxin",
    name: "Ácido Lítico",
    cost: 90,
    range: 110,
    damage: 8,
    fireRate: 30,
    color: "#a3e635",
    type: "dot",
  },
  {
    id: "tesla",
    name: "Arco Iónico",
    cost: 120,
    range: 130,
    damage: 22,
    fireRate: 42,
    color: "#c084fc",
    type: "chain",
  },
  {
    id: "sniper",
    name: "CRISPR-Beam",
    cost: 140,
    range: 210,
    damage: 65,
    fireRate: 85,
    color: "#ffe600",
    type: "single",
  },
  {
    id: "ribosome",
    name: "Bio-Reactor",
    cost: 110,
    range: 0,
    damage: 0,
    fireRate: 180,
    color: "#fb923c",
    type: "eco",
  },
  {
    id: "magnet",
    name: "Imán Químico",
    cost: 95,
    range: 125,
    damage: 10,
    fireRate: 25,
    color: "#38bdf8",
    type: "slow",
  },
  {
    id: "uv",
    name: "Emisor UV-C",
    cost: 150,
    range: 100,
    damage: 24,
    fireRate: 38,
    color: "#e879f9",
    type: "splash",
  },
  {
    id: "interferon",
    name: "Interferón",
    cost: 165,
    range: 140,
    damage: 32,
    fireRate: 32,
    color: "#2dd4bf",
    type: "single",
  },
  {
    id: "omega",
    name: "Núcleo Omega",
    cost: 220,
    range: 160,
    damage: 55,
    fireRate: 26,
    color: "#f43f5e",
    type: "splash",
  },
];

const PATHOGEN_TYPES = [
  {
    id: "diplococcus",
    name: "Diplococo",
    hp: 45,
    speed: 1.35,
    reward: 12,
    color: "#ff5555",
    shape: "diplo",
  },
  {
    id: "bacillus",
    name: "Bacilo",
    hp: 70,
    speed: 1.15,
    reward: 15,
    color: "#ffaa00",
    shape: "rod",
  },
  {
    id: "spirochete",
    name: "Espiroqueta",
    hp: 55,
    speed: 1.9,
    reward: 18,
    color: "#ff00aa",
    shape: "spiral",
  },
  {
    id: "phage",
    name: "Bacteriófago",
    hp: 95,
    speed: 1.45,
    reward: 22,
    color: "#b537f2",
    shape: "phage",
  },
  {
    id: "staph",
    name: "Estafilococo",
    hp: 140,
    speed: 0.95,
    reward: 26,
    color: "#fb7185",
    shape: "cluster",
  },
  {
    id: "amoeba",
    name: "Ameba Mutante",
    hp: 220,
    speed: 0.75,
    reward: 32,
    color: "#4ade80",
    shape: "blob",
  },
  {
    id: "retrovirus",
    name: "Retrovirus",
    hp: 110,
    speed: 2.1,
    reward: 28,
    color: "#38bdf8",
    shape: "hex",
  },
  {
    id: "prion",
    name: "Prión Tóxico",
    hp: 180,
    speed: 1.5,
    reward: 35,
    color: "#facc15",
    shape: "diplo",
  },
  {
    id: "superbug",
    name: "Superbacteria",
    hp: 340,
    speed: 0.85,
    reward: 45,
    color: "#f97316",
    shape: "rod",
  },
  {
    id: "coronaviridae",
    name: "Coronaviridae",
    hp: 650,
    speed: 0.7,
    reward: 90,
    color: "#ff003c",
    shape: "corona",
  },
];

const TOWER_NOTES = [
  ["Daño preciso", 1, "laser"],
  ["Frena a los enemigos", 1, "slow"],
  ["Golpe concentrado", 1, "heavy"],
  ["Daño en área", 1, "burst"],
  ["Daño prolongado", 2, "dot"],
  ["Salta entre enemigos", 3, "chain"],
  ["Alcance extremo", 4, "laser"],
  ["Genera ATP en combate", 1, "eco"],
  ["Ralentiza con cada impacto", 5, "slow"],
  ["Área amplia", 6, "burst"],
  ["Ataque rápido", 7, "laser"],
  ["Explosión de alto daño", 8, "burst"],
];
export const BLUEPRINTS = TOWER_TYPES.map((tower, i) => {
  const [note, unlock, icon] = TOWER_NOTES[i];
  return { ...tower, note, unlock, icon };
});

export const MAPS = [
  {
    name: "Circuito de muestras",
    accent: "#54d6fd",
    points: [
      [0, 110],
      [220, 110],
      [220, 390],
      [520, 390],
      [520, 160],
      [760, 160],
      [760, 430],
      [900, 430],
    ],
  },
  {
    name: "Galería de filtros",
    accent: "#6cf2b8",
    points: [
      [0, 400],
      [145, 400],
      [145, 125],
      [400, 125],
      [400, 305],
      [640, 305],
      [640, 195],
      [900, 195],
    ],
  },
  {
    name: "Núcleo de contención",
    accent: "#ba9bff",
    points: [
      [0, 255],
      [160, 255],
      [160, 100],
      [435, 100],
      [435, 430],
      [680, 430],
      [680, 200],
      [900, 200],
    ],
  },
];

export const WIDTH = 900;
export const HEIGHT = 540;

const UPGRADES = {
  single: [
    {
      name: "Perforante",
      detail: "Más daño. Atraviesa parte del escudo y supera el blindaje.",
      damage: 1.65,
      piercing: true,
    },
    {
      name: "Cadencia",
      detail: "Dispara más rápido y gana alcance.",
      rate: 0.66,
      range: 25,
    },
  ],
  slow: [
    {
      name: "Congelación",
      detail: "Ralentiza más y durante más tiempo.",
      slow: 148,
      slowFactor: 0.38,
    },
    {
      name: "Neblina fría",
      detail: "Ralentiza también a los enemigos junto al objetivo.",
      slow: 85,
      splashSlow: true,
    },
  ],
  splash: [
    {
      name: "Onda expansiva",
      detail: "Amplía el área de impacto y su daño secundario.",
      radius: 96,
      splash: 0.78,
    },
    {
      name: "Foco térmico",
      detail: "Concentra el golpe y atraviesa parte del escudo.",
      damage: 1.72,
      piercing: true,
    },
  ],
  dot: [
    {
      name: "Residuo corrosivo",
      detail: "El daño prolongado dura más y ignora el blindaje.",
      burn: 210,
      piercing: true,
    },
    {
      name: "Nube lítica",
      detail: "Contagia el efecto a los enemigos cercanos al impacto.",
      splashBurn: true,
    },
  ],
  chain: [
    {
      name: "Red conductora",
      detail: "Salta hasta cuatro veces con más alcance entre enemigos.",
      jumps: 4,
      jumpRange: 100,
    },
    {
      name: "Cortocircuito",
      detail: "Inflige más daño y consume el doble de escudo.",
      damage: 1.3,
      shred: true,
    },
  ],
  eco: [
    {
      name: "Estabilizador",
      detail: "Genera más ATP con cada ciclo.",
      output: 28,
    },
    {
      name: "Pulso industrial",
      detail: "Genera ATP más a menudo y recarga el pulso táctico.",
      rate: 0.61,
      charge: 4,
    },
  ],
};

export const TARGETING = [
  ["first", "Más cerca del núcleo"],
  ["last", "Más lejos del núcleo"],
  ["strong", "Mayor resistencia"],
];

export function specializations(tower) {
  return UPGRADES[tower.type];
}

const ARMOR = {
  name: "Blindados",
  tip: "Los golpes débiles pierden eficacia. Usa Plasma o una torre perforante.",
};
const SHIELD = {
  name: "Escudados",
  tip: "Absorben los primeros impactos. El pulso táctico elimina su escudo.",
};
const RUSH = {
  name: "Corrida veloz",
  tip: "Crio-Gel o Imán Químico pueden frenarla.",
};
const SWARM = {
  name: "Enjambre",
  tip: "El daño en área y el Arco Iónico aprovechan los grupos.",
};
const BOSS_TIP = "El jefe cambia de fase al 66 % y al 33 % de vida.";
const BOSS_NAMES = [
  "Custodio Ámbar",
  "Centinela de la Galería",
  "Núcleo Espejo",
];
const COOLING_BOSSES = {
  runner: "Impulsor",
  guard: "Blindaje",
};
const COOLING_SHORTCUT = [
  [0, 469],
  [310, 469],
  [480, 305],
  [640, 305],
  [640, 195],
  [900, 195],
];
const AUXILIARY_LANES = [
  [
    [0, 469],
    [310, 469],
    [310, 335],
    [555, 335],
    [555, 195],
    [900, 195],
  ],
  [
    [0, 405],
    [287, 405],
    [287, 272],
    [580, 272],
    [580, 200],
    [900, 200],
  ],
];

function route(points) {
  const remaining = Array(points.length).fill(0);
  for (let i = points.length - 2; i >= 0; i--) {
    remaining[i] =
      remaining[i + 1] +
      Math.hypot(
        points[i + 1][0] - points[i][0],
        points[i + 1][1] - points[i][1],
      );
  }
  return { points, remaining };
}

export function dailySetup(day) {
  const seed = Number(day.replaceAll("-", "")) >>> 0;
  const rules = [
    {
      name: "Sin reservas",
      text: "Más enemigos por oleada. Empiezas con 285 ATP.",
      atp: 285,
      extra: 4,
      armor: 1,
    },
    {
      name: "Carcasas reforzadas",
      text: "Blindados con más resistencia. Empiezas con 310 ATP.",
      atp: 310,
      extra: 0,
      armor: 1.55,
    },
    {
      name: "Conductos rápidos",
      text: "Enemigos más veloces. Empiezas con 290 ATP.",
      atp: 290,
      extra: 1,
      speed: 1.18,
      armor: 1,
    },
  ];
  return {
    ...rules[seed % rules.length],
    seed,
    map: Math.floor(seed / rules.length) % MAPS.length,
  };
}

function nextEnemy(order, spec, lane, modifier = {}) {
  order.push({ spec, lane, ...modifier });
}

function segmentDistance(x, y, [ax, ay], [bx, by]) {
  const dx = bx - ax,
    dy = by - ay;
  const f = Math.max(
    0,
    Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(x - ax - f * dx, y - ay - f * dy);
}

function nearRoute({ points }, x, y) {
  return points
    .slice(1)
    .some((point, i) => segmentDistance(x, y, points[i], point) < 39);
}

export function upgradeCost(tower) {
  return Math.ceil(tower.cost * (tower.rank === 1 ? 0.7 : 1.05));
}

export function upgradeStats(tower, branch) {
  return {
    damage: Math.round(Math.round(tower.damage * 1.42) * (branch?.damage || 1)),
    range: tower.range + (tower.range ? 13 : 0) + (branch?.range || 0),
    fireRate: tower.fireRate * 0.92 * (branch?.rate || 1),
  };
}

export function reactorOutput(rank, branch) {
  return branch?.output ?? 9 + 4 * rank;
}

export class Match {
  constructor(level, daily = null, { heroId, contract } = {}) {
    this.level = level;
    this.daily = daily;
    this.contract = contract || null;
    this.ranked = !!(daily || contract);
    this.mission = daily ? null : MISSIONS[level - 1];
    this.mapIndex = daily?.map ?? CHAPTERS[this.mission.chapter].map;
    const base = MAPS[this.mapIndex];
    const layout = (points) =>
      this.mission
        ? missionRoutes(points, this.mission, WIDTH, HEIGHT)
        : points;
    this.map = this.mission ? { ...base, points: layout(base.points) } : base;
    this.routes = [route(this.map.points)];
    if ((daily || level >= 5) && this.mapIndex > 0)
      this.routes.push(route(layout(AUXILIARY_LANES[this.mapIndex - 1])));
    this.gateRoutes =
      !daily && level === 6 ? [this.routes[1], route(layout(COOLING_SHORTCUT))] : null;
    this.gateDiverted = false;
    this.hp = contract?.hp ?? 100;
    this.atp = daily?.atp ?? 180 + level * 12 + Math.max(0, level - 5) * 20;
    this.techLevel = daily ? 10 : level;
    this.wave = 0;
    this.maxWaves = daily ? 7 : level < 4 ? 4 : level < 8 ? 5 : 6;
    this.state = "build";
    this.towers = [];
    this.enemies = [];
    this.shots = [];
    this.effects = [];
    this.queue = [];
    this.spawnIn = 0;
    this.combo = 0;
    this.comboTime = 0;
    this.adUsed = false;
    this.kills = 0;
    this.time = 0;
    this.charge = 43;
    this.pulses = 0;
    this.specialized = 0;
    this.grossATP = 0;
    this.preview = this.planWave(1);
    this.lastBuild = null;
    this.waveStart = null;
    this.debrief = null;
    this.waveLeaks = null;
    this.console = !this.ranked && level === 2
      ? { x: this.routes[0].points[2][0], y: this.routes[0].points[2][1], hp: 4, complete: false }
      : null;
    this.barrier = !this.ranked && level === 8
      ? { x: this.routes[0].points.at(-2)[0], y: this.routes[0].points.at(-2)[1], used: false, until: 0 }
      : null;
    this.mirrorOrders = [];
    this.comboNotice = null;
    const hero = !this.ranked && HERO_BY_ID.get(heroId);
    this.hero = hero
      ? { ...hero, x: WIDTH - 85, y: Math.max(26, Math.min(HEIGHT - 26, this.map.points.at(-1)[1] - 53)),
          cooldown: 0, abilityCooldown: 0, targeting: "first", inflicted: 0, defeated: 0 }
      : null;
  }

  get alternateRoute() {
    return this.gateRoutes?.[Number(!this.gateDiverted)];
  }

  get gateBlockers() {
    const next = this.alternateRoute;
    return next ? this.towers.filter(({ x, y }) => nearRoute(next, x, y)) : [];
  }

  toggleGate() {
    if (!this.gateRoutes || this.state !== "build" || this.gateBlockers.length)
      return false;
    this.routes[1] = this.alternateRoute;
    this.gateDiverted = !this.gateDiverted;
    return true;
  }

  planWave(wave) {
    const level = this.level;
    const final = wave === this.maxWaves;
    const pattern =
      level === 1 && wave === 1
        ? 0
        : (wave + level + (this.daily?.seed || 0)) % 4;
    const canShield = level >= 3 && wave >= 2;
    const canArmor = level >= 2 && wave >= 2;
    const theme =
      pattern === 1
        ? RUSH
        : pattern === 2 && canArmor
          ? ARMOR
          : pattern === 3 && canShield
            ? SHIELD
            : SWARM;
    const count =
      5 + wave * 2 + Math.floor(level * 0.55) + (this.daily?.extra || 0);
    const order = [];
    const pool = Math.min(wave < 3 ? 4 : 7, Math.ceil((level + wave) / 2));
    for (let n = 0; n < count; n++) {
      const lane =
        this.routes.length > 1 &&
        (wave > 1 || level > 5 || this.daily) &&
        (this.contract?.pressure ? n % 5 !== 0 : (n + wave) % 3 !== 0)
          ? 1
          : 0;
      const id =
        theme === RUSH && n % 2 === 0
          ? level >= 6
            ? 6
            : 2
          : (n * 5 + wave + level + Math.floor(n / pool)) % pool;
      const guarded = n % 3 === 1;
      nextEnemy(order, PATHOGEN_TYPES[id], lane, {
        speed: this.contract?.pressure && lane === 1 ? 1.24 : theme === RUSH ? 1.13 : 1,
        armor: theme === ARMOR && guarded ? 6 + level * 0.65 : 0,
        shield: theme === SHIELD && guarded ? 0.42 : 0,
      });
    }
    if (final && this.gateRoutes) {
      nextEnemy(order, PATHOGEN_TYPES[8], 0, {
        boss: true,
        coolingBoss: "runner",
        speed: 1.35,
      });
      nextEnemy(order, PATHOGEN_TYPES[8], 1, {
        boss: true,
        coolingBoss: "guard",
        armor: 5,
      });
    } else if (final)
      nextEnemy(
        order,
        PATHOGEN_TYPES[this.mapIndex === 0 ? 5 : this.mapIndex === 1 ? 8 : 9],
        this.routes.length - 1,
        { boss: true, mirror: !this.daily && this.level === 10 },
      );
    return {
      order,
      theme,
      count: order.length,
      final,
      lanes: this.routes.map((_, lane) =>
        order.reduce((sum, e) => sum + Number(e.lane === lane), 0),
      ),
      bossTip: !final
        ? ""
        : this.gateRoutes
          ? "Gemelos térmicos. El Impulsor acelera por A y el Blindaje activa un escudo en B. Prepara lentitud en A y reserva el pulso para B."
          : this.mission && this.level === 10
            ? "El Núcleo Espejo anunciará refuerzos primero por A y después por B."
            : BOSS_TIP,
    };
  }

  addATP(amount) {
    this.atp += amount;
    this.grossATP += amount;
  }

  moveHero(x, y) {
    if (!this.hero || !["build", "wave"].includes(this.state) ||
        x < 19 || x > WIDTH - 19 || y < 19 || y > HEIGHT - 19)
      return false;
    if (this.state === "wave") this.hero.destination = { x, y };
    else Object.assign(this.hero, { x, y, destination: null });
    return true;
  }

  heroAbility() {
    const hero = this.hero;
    if (!hero || this.state !== "wave" || hero.abilityCooldown) return false;
    const hits = this.enemies.filter((enemy) => enemy.hp > 0 &&
      Math.hypot(hero.x - enemy.x, hero.y - enemy.y) <= hero.abilityRange);
    if (!hits.length) return false;
    hero.abilityCooldown = hero.recharge;
    for (const enemy of hits) {
      if (hero.stripShield && enemy.shield) {
        enemy.shield = 0;
        hero.shieldsBroken = (hero.shieldsBroken || 0) + 1;
      }
      if (hero.stun) enemy.stun = Math.max(enemy.stun, enemy.boss ? 34 : hero.stun);
      this.damage(enemy, hero.abilityDamage, hero.color, {}, hero);
    }
    this.effect(hero.x, hero.y, hero.color, hero.abilityRange);
    return true;
  }

  closeBarrier() {
    if (!this.barrier || this.barrier.used || this.state !== "wave") return false;
    this.barrier.used = true;
    this.barrier.until = this.time + 240;
    this.effect(this.barrier.x, this.barrier.y, "#ffcf84", 115);
    return true;
  }

  activatePulse(x, y) {
    if (this.state !== "wave" || this.charge < 100) return false;
    const targets = this.enemies.filter(
      (enemy) => enemy.hp > 0 && Math.hypot(enemy.x - x, enemy.y - y) <= 108,
    );
    if (!targets.length) return false;
    this.charge = 0;
    this.pulses++;
    this.effect(x, y, "#8cf7ff", 108);
    for (const enemy of targets) {
      enemy.shield = 0;
      enemy.stun = enemy.boss ? 52 : 140;
      this.damage(enemy, 46 + this.level * 6, "#8cf7ff", { piercing: true });
    }
    return true;
  }

  score() {
    return (
      this.kills * 45 +
      this.wave * 150 +
      (this.state === "won" ? this.hp * 9 + 350 : 0) +
      Math.floor(this.grossATP / 3)
    );
  }

  checkPlacement(type, x, y) {
    if (!type || !["build", "wave"].includes(this.state))
      return "La partida está detenida.";
    if (this.towers.length >= (this.contract?.towerLimit ?? Infinity))
      return "Has alcanzado el máximo de torres del contrato.";
    if (type.unlock > this.techLevel)
      return "Esta torre se habilita en otro sector.";
    return this.checkSite(x, y) || (this.atp < type.cost ? "ATP insuficiente." : "");
  }

  checkSite(x, y, ignored = null) {
    if (!Number.isFinite(x) || !Number.isFinite(y) ||
        x < 24 || x > WIDTH - 24 || y < 24 || y > HEIGHT - 24)
      return "Acércate al interior del tablero.";
    if (this.routes.some((path) => nearRoute(path, x, y)))
      return "Deja despejado el conducto.";
    if (this.towers.some((tower) => tower !== ignored && Math.hypot(tower.x - x, tower.y - y) < 40))
      return "Hay otra torre demasiado cerca.";
    return "";
  }

  checkRelocation(tower, x, y) {
    if (this.state !== "build" || !this.towers.includes(tower))
      return "Reubica las torres entre oleadas.";
    return this.checkSite(x, y, tower);
  }

  relocate(tower, x, y) {
    if (this.checkRelocation(tower, x, y)) return false;
    Object.assign(tower, { x, y });
    return true;
  }

  place(type, x, y) {
    if (this.checkPlacement(type, x, y)) return null;
    this.atp -= type.cost;
    const tower = {
      ...type,
      x,
      y,
      paid: type.cost,
      cooldown: type.type === "eco" ? 105 : 0,
      rank: 1,
      targeting: "first",
      inflicted: 0,
      defeated: 0,
      produced: 0,
      slowTicks: 0,
      shieldsBroken: 0,
      synergyHits: 0,
    };
    this.towers.push(tower);
    if (this.state === "build") this.lastBuild = tower;
    this.effect(x, y, type.color, 32);
    return tower;
  }

  get undoable() {
    return (
      this.state === "build" &&
      this.lastBuild?.rank === 1 &&
      this.towers.includes(this.lastBuild)
    );
  }

  undoPlacement() {
    if (!this.undoable) return null;
    const tower = this.lastBuild;
    this.towers.splice(this.towers.indexOf(tower), 1);
    this.atp += tower.cost;
    this.lastBuild = null;
    return tower;
  }

  upgrade(tower, choice) {
    const cost = upgradeCost(tower);
    if (!this.towers.includes(tower) || tower.rank >= 3 || this.atp < cost)
      return false;
    const branch = tower.rank === 2 ? specializations(tower)[choice] : null;
    if (tower.rank === 2 && !branch) return false;
    this.atp -= cost;
    tower.paid += cost;
    tower.rank++;
    Object.assign(tower, upgradeStats(tower, branch));
    if (branch) {
      tower.branch = branch;
      this.specialized++;
    }
    this.effect(tower.x, tower.y, tower.color, 42);
    return true;
  }

  sell(tower) {
    if (!this.towers.includes(tower)) return false;
    this.towers.splice(this.towers.indexOf(tower), 1);
    this.atp += Math.floor(tower.paid * 0.65);
    return true;
  }

  startWave() {
    if (this.state !== "build") return false;
    this.state = "wave";
    this.wave++;
    this.lastBuild = null;
    this.waveStart = { hp: this.hp, kills: this.kills, atp: this.grossATP };
    this.waveLeaks = { lanes: this.routes.map(() => 0), worst: null };
    this.debrief = null;
    this.queue = [...this.preview.order];
    this.interval =
      this.preview.theme === SWARM ? 24 : this.preview.theme === RUSH ? 31 : 39;
    this.preview =
      this.wave < this.maxWaves ? this.planWave(this.wave + 1) : null;
    this.spawnIn = 12;
    return true;
  }

  effect(x, y, color, radius, to = null) {
    this.effects.push({ x, y, color, radius, to, life: 22 });
  }

  spawn() {
    const order = this.queue.shift();
    const {
      spec,
      lane,
      boss = false,
      armor = 0,
      shield = 0,
      speed = 1,
      coolingBoss,
      mirror = false,
    } = order;
    const scale =
      0.96 +
      (this.wave - 1) * 0.14 +
      (this.level - 1) * (this.wave < 3 ? 0.065 : 0.105);
    const bossScale = coolingBoss ? 0.68 : boss ? 1.18 : 1;
    const hp = Math.round(spec.hp * scale * bossScale);
    const path = this.routes[lane];
    const [[x, y]] = path.points;
    const bossName =
      this.mission && ![4, 8, 10].includes(this.level)
        ? ["Custodio de sector", "Centinela auxiliar", "Eco del Espejo"][this.mapIndex]
        : BOSS_NAMES[this.mapIndex];
    const color = coolingBoss === "runner"
      ? "#ff865a"
      : coolingBoss === "guard" ? "#ba9bff" : spec.color;
    this.enemies.push({
      ...spec,
      color,
      shape: coolingBoss === "runner" ? "spiral" : spec.shape,
      name: boss ? (COOLING_BOSSES[coolingBoss] || bossName) : spec.name,
      x,
      y,
      path,
      lane,
      boss,
      coolingBoss,
      mirror,
      hp,
      maxHp: hp,
      speed: spec.speed * speed * (this.daily?.speed || 1),
      armor: armor * (this.daily?.armor || 1),
      shield: Math.round(hp * shield),
      wp: 1,
      remaining: path.remaining[0],
      slow: 0,
      slowFactor: 1,
      burn: 0,
      stun: 0,
      angle: 0,
      phase: 1,
    });
  }

  damage(
    enemy,
    amount,
    color,
    { piercing = false, shred = false } = {},
    tower = null,
  ) {
    if (enemy.hp <= 0) return;
    if (enemy.shield > 0) {
      const shield = enemy.shield;
      const absorbed = Math.min(shield, amount * (piercing ? 0.45 : 1));
      enemy.shield = Math.max(0, enemy.shield - absorbed * (shred ? 2 : 1));
      if (tower) {
        tower.inflicted += shield - enemy.shield;
        if (enemy.shield === 0) tower.shieldsBroken = (tower.shieldsBroken || 0) + 1;
      }
      amount -= absorbed;
    }
    if (amount <= 0) return;
    const damage = piercing
      ? amount
      : Math.max(amount * 0.35, amount - enemy.armor);
    if (tower) tower.inflicted += Math.min(enemy.hp, damage);
    enemy.hp -= damage;
    if (enemy.hp > 0) {
      if (enemy.boss) this.advanceBoss(enemy);
      return;
    }
    this.kills++;
    if (tower) tower.defeated++;
    this.combo = Math.min(10, this.combo + 1);
    this.comboTime = 210;
    this.charge = Math.min(100, this.charge + (enemy.boss ? 28 : 6));
    this.addATP(Math.round(enemy.reward * (this.combo >= 5 ? 1.25 : 1)));
    this.effect(enemy.x, enemy.y, color, enemy.boss ? 56 : 27);
  }

  advanceBoss(enemy) {
    const ratio = enemy.hp / enemy.maxHp;
    const phase = ratio <= 1 / 3 ? 3 : ratio <= 2 / 3 ? 2 : 1;
    if (phase <= enemy.phase) return;
    const enteredSecondPhase = enemy.phase === 1;
    enemy.phase = phase;
    if (enemy.mirror) {
      if (enteredSecondPhase) {
        enemy.shield = Math.round(enemy.maxHp * 0.19);
        this.mirrorOrders.push({ lane: 0, ticks: 125 });
      }
      if (phase === 3) {
        this.mirrorOrders.push({ lane: 1, ticks: 125 });
        enemy.speed *= 1.28;
      }
      return;
    }
    if (enemy.coolingBoss) {
      if (enemy.coolingBoss === "runner") {
        if (enteredSecondPhase) enemy.speed *= 1.25;
        if (phase === 3) enemy.speed *= 1.22;
      } else if (enteredSecondPhase) {
        enemy.shield = Math.round(enemy.maxHp * 0.29);
      }
      this.effect(enemy.x, enemy.y, enemy.coolingBoss === "runner" ? "#ffae85" : "#9ddcff", 88);
      return;
    }
    if (phase === 2) {
      enemy.shield = Math.round(enemy.maxHp * 0.19);
      const backup = this.routes.length > 1 ? 1 - enemy.lane : enemy.lane;
      for (let i = 0; i < 3; i++)
        nextEnemy(this.queue, PATHOGEN_TYPES[2], backup, { speed: 1.22 });
      if (this.queue.length === 3) this.spawnIn = 8;
    } else {
      enemy.speed *= 1.5;
    }
    this.effect(enemy.x, enemy.y, phase === 2 ? "#9ddcff" : "#ffae85", 88);
  }

  hit(enemy, shot) {
    const { damage, color, type, branch, radius, tower } = shot;
    const spreadDebuff = branch.splashSlow || branch.splashBurn;
    const applyDebuff = (target) => {
      if (type === "slow") {
        const duration = branch.slow || 95;
        if (duration >= target.slow) target.slowTower = tower;
        target.slow = Math.max(target.slow, duration);
        target.slowFactor = Math.min(
          target.slowFactor,
          target.boss ? 0.72 : branch.slowFactor || 0.52,
        );
      }
      if (type === "dot") {
        target.burn = Math.max(target.burn, branch.burn || 130);
        const burnDamage = damage * 0.115;
        if (burnDamage >= (target.burnDamage || 0)) {
          target.burnDamage = burnDamage;
          target.burnTower = tower;
        }
        target.burnPierces ||= !!branch.piercing;
      }
    };
    let chilled = Number(type === "splash" && enemy.slow > 0 && enemy.hp > 0);
    this.damage(enemy, damage, color, branch, tower);
    applyDebuff(enemy);
    if (type === "splash" || spreadDebuff) {
      this.effect(enemy.x, enemy.y, color, radius);
      for (const other of this.enemies) {
        if (
          other === enemy ||
          Math.hypot(other.x - enemy.x, other.y - enemy.y) >= radius
        )
          continue;
        if (type === "splash") {
          if (other.hp > 0 && other.slow > 0) chilled++;
          this.damage(
            other,
            Math.round(damage * (branch.splash || 0.62)),
            color,
            branch,
            tower,
          );
        }
        if (spreadDebuff) applyDebuff(other);
      }
    }
    if (chilled && tower) {
      tower.synergyHits = (tower.synergyHits || 0) + chilled;
      if (chilled >= 2)
        this.comboNotice = { count: chilled, until: this.time + 145 };
    }
    if (type !== "chain") return;
    let previous = enemy;
    const hit = new Set([enemy]);
    for (let i = 1; i <= (branch.jumps || 2); i++) {
      const next = this.enemies.find(
        (e) =>
          e.hp > 0 &&
          !hit.has(e) &&
          Math.hypot(e.x - previous.x, e.y - previous.y) <
            (branch.jumpRange || 74),
      );
      if (!next) break;
      this.effect(previous.x, previous.y, color, 0, { x: next.x, y: next.y });
      this.damage(next, Math.round(damage * 0.72 ** i), color, branch, tower);
      hit.add(next);
      previous = next;
    }
  }

  tick() {
    this.time++;
    for (const effect of this.effects) effect.life--;
    this.effects = this.effects.filter((e) => e.life > 0);
    if (this.state !== "wave") return;
    if (this.hero) {
      if (this.hero.abilityCooldown > 0) this.hero.abilityCooldown--;
      const goal = this.hero.destination;
      if (goal) {
        const dx = goal.x - this.hero.x;
        const dy = goal.y - this.hero.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= 4) Object.assign(this.hero, { ...goal, destination: null });
        else {
          this.hero.x += dx / distance * 4;
          this.hero.y += dy / distance * 4;
        }
      }
    }
    const order = this.mirrorOrders[0];
    if (order && --order.ticks <= 0) {
      this.mirrorOrders.shift();
      const fresh = !this.queue.length;
      for (let i = 0; i < 4; i++) nextEnemy(this.queue, PATHOGEN_TYPES[2], order.lane, { speed: 1.25 });
      if (fresh) this.spawnIn = 7;
    }
    if (this.comboTime > 0 && --this.comboTime === 0) this.combo = 0;
    if (this.queue.length && --this.spawnIn <= 0) {
      const pair =
        this.queue[0].coolingBoss === "runner" &&
        this.queue[1]?.coolingBoss === "guard";
      this.spawn();
      if (pair) this.spawn();
      this.spawnIn = this.interval;
    }
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      if (enemy.burn > 0) {
        enemy.burn--;
        if (enemy.burn % 12 === 0)
          this.damage(
            enemy,
            enemy.burnDamage,
            "#a3e635",
            {
              piercing: enemy.burnPierces,
            },
            enemy.burnTower,
          );
        if (!enemy.burn) {
          enemy.burnDamage = 0;
          enemy.burnPierces = false;
          enemy.burnTower = null;
        }
        if (enemy.hp <= 0) continue;
      }
      if (this.barrier?.until > this.time &&
          Math.hypot(enemy.x - this.barrier.x, enemy.y - this.barrier.y) < 115)
        continue;
      if (enemy.stun > 0) {
        enemy.stun--;
        continue;
      }
      const points = enemy.path.points;
      const [x, y] = points[enemy.wp];
      const dx = x - enemy.x,
        dy = y - enemy.y;
      const distance = Math.hypot(dx, dy);
      const advance = Math.min(distance, enemy.speed * enemy.slowFactor);
      if (enemy.slow > 0) {
        if (enemy.slowTower)
          enemy.slowTower.slowTicks = (enemy.slowTower.slowTicks || 0) + 1;
        if (--enemy.slow === 0) {
          enemy.slowFactor = 1;
          enemy.slowTower = null;
        }
      }
      enemy.angle = Math.atan2(dy, dx);
      enemy.remaining = enemy.path.remaining[enemy.wp] + distance - advance;
      if (advance >= distance) {
        enemy.x = x;
        enemy.y = y;
        enemy.wp++;
        if (this.console && !this.console.complete && enemy.wp === 3)
          this.console.hp = Math.max(0, this.console.hp - 1);
        if (enemy.wp === points.length) {
          enemy.escaped = true;
          const loss = Math.min(this.hp, enemy.coolingBoss ? 18 : enemy.boss ? 30 : 10);
          this.hp -= loss;
          this.waveLeaks.lanes[enemy.lane]++;
          if (loss > (this.waveLeaks.worst?.loss || 0))
            this.waveLeaks.worst = { name: enemy.name, loss, lane: enemy.lane };
        }
      } else {
        enemy.x += (dx / distance) * advance;
        enemy.y += (dy / distance) * advance;
      }
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0 && !e.escaped);
    if (this.hp === 0 || this.console?.hp === 0) {
      this.state = "lost";
      return;
    }

    for (let index = 0; index < this.towers.length + Number(!!this.hero); index++) {
      const tower = this.towers[index] || this.hero;
      tower.cooldown -= this.combo >= 5 ? 1.28 : 1;
      if (tower.cooldown > 0) continue;
      if (tower.type === "eco") {
        // Reactor output stops in the build phase and when no threats remain.
        if (this.enemies.length || this.queue.length) {
          const output = reactorOutput(tower.rank, tower.branch);
          tower.produced += output;
          this.addATP(output);
          this.charge = Math.min(
            100,
            this.charge + (tower.branch?.charge || 0),
          );
          tower.cooldown = tower.fireRate;
          this.effect(tower.x, tower.y, tower.color, 29);
        }
        continue;
      }
      let target;
      let best = -Infinity;
      for (const enemy of this.enemies) {
        if (Math.hypot(enemy.x - tower.x, enemy.y - tower.y) > tower.range)
          continue;
        const priority =
          tower.targeting === "strong"
            ? enemy.hp + enemy.shield
            : tower.targeting === "last"
              ? enemy.remaining
              : -enemy.remaining;
        if (priority > best) {
          target = enemy;
          best = priority;
        }
      }
      if (!target) continue;
      tower.cooldown = tower.fireRate;
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      this.shots.push({
        x: tower.x,
        y: tower.y,
        target,
        tower,
        damage: tower.damage,
        type: tower.type,
        color: tower.color,
        branch: tower.branch || {},
        radius: tower.branch?.radius || (tower.id === "uv" ? 73 : 57),
      });
    }

    this.shots = this.shots.filter((shot) => {
      const target = shot.target;
      if (target.hp <= 0 || target.escaped) return false;
      const dx = target.x - shot.x,
        dy = target.y - shot.y,
        distance = Math.hypot(dx, dy);
      if (distance <= 10) {
        this.hit(target, shot);
        return false;
      }
      shot.x += (dx / distance) * 10;
      shot.y += (dy / distance) * 10;
      return true;
    });
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    if (!this.enemies.length && !this.queue.length && !this.mirrorOrders.length) {
      if (this.console) this.console.complete = true;
      if (this.hero?.destination) Object.assign(this.hero, {
        ...this.hero.destination, destination: null,
      });
      this.shots = [];
      this.addATP(
        25 + 5 * this.wave + (this.daily ? 0 : Math.max(0, this.level - 4) * 4),
      );
      this.charge = Math.min(100, this.charge + 20);
      this.debrief = {
        kills: this.kills - this.waveStart.kills,
        damage: this.waveStart.hp - this.hp,
        atp: this.grossATP - this.waveStart.atp,
      };
      this.state = this.wave === this.maxWaves ? "won" : "build";
    }
  }
}
