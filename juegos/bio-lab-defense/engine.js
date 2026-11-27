import { affinityFor, towerMultiplier } from "./affinities.js?v=3";
import { CHAPTERS, MISSIONS, missionRoutes } from "./campaign.js?v=16";

import { HERO_BY_ID } from "./operations.js?v=8";

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
    damage: 10,
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
    attack: { slow: 116 },
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

export const PATHOGEN_TYPES = [
  {
    id: "pneumococcus",
    name: "Streptococcus pneumoniae",
    hp: 45,
    speed: 1.35,
    reward: 12,
    color: "#ff5555",
    shape: "diplo",
  },
  {
    id: "subtilis",
    name: "Bacillus subtilis",
    hp: 70,
    speed: 1.15,
    reward: 15,
    color: "#ffaa00",
    shape: "rod",
  },
  {
    id: "borrelia",
    name: "Borrelia burgdorferi",
    hp: 55,
    speed: 1.9,
    reward: 18,
    color: "#ff00aa",
    shape: "spiral",
  },
  {
    id: "phage-t4",
    name: "Bacteriófago T4",
    hp: 95,
    speed: 1.45,
    reward: 22,
    color: "#b537f2",
    shape: "phage",
  },
  {
    id: "staph-epi",
    name: "Staphylococcus epidermidis",
    hp: 140,
    speed: 0.95,
    reward: 26,
    color: "#fb7185",
    shape: "cluster",
  },
  {
    id: "lactobacillus",
    name: "Lactobacillus acidophilus",
    hp: 220,
    speed: 0.75,
    reward: 32,
    color: "#4ade80",
    shape: "lactobacillus",
  },
  {
    id: "adenovirus",
    name: "Adenovirus humano",
    hp: 110,
    speed: 2.1,
    reward: 28,
    color: "#38bdf8",
    shape: "hex",
  },
  {
    id: "rhinovirus",
    name: "Rinovirus humano",
    hp: 180,
    speed: 1.5,
    reward: 35,
    color: "#facc15",
    shape: "rhinovirus",
  },
  {
    id: "e-coli",
    name: "Escherichia coli",
    hp: 340,
    speed: 0.85,
    reward: 45,
    color: "#f97316",
    shape: "e-coli",
  },
  {
    id: "norovirus",
    name: "Norovirus",
    hp: 165,
    speed: 1.72,
    reward: 29,
    color: "#ff003c",
    shape: "norovirus",
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
  {
    name: "Arrecifes de extracción",
    accent: "#ffc788",
    points: [[0, 125], [175, 125], [175, 345], [360, 345], [360, 210], [625, 210], [625, 386], [900, 386]],
  },
  {
    name: "Enlace de datos",
    accent: "#8bd9ff",
    points: [[0, 415], [195, 415], [195, 105], [425, 105], [425, 332], [635, 332], [635, 218], [900, 218]],
  },
  {
    name: "Estación de retorno",
    accent: "#f3a7e4",
    points: [[0, 245], [170, 245], [170, 78], [420, 78], [420, 462], [678, 462], [678, 265], [900, 265]],
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
      detail: "Salta hasta cuatro veces. También enlaza con la torre de ataque más cercana a 175 px o menos y golpea hasta tres enemigos que crucen la línea.",
      jumps: 4,
      jumpRange: 100,
      link: true,
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
  ["support", "Nodos de apoyo"],
  ["escort", "Escoltas"],
  ["objective", "Proteger objetivo de misión"],
  ["weakness", "Enemigos débiles a esta torre"],
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
const BOSS_LOADOUTS = [
  { spec: 5, name: "Peste bubónica", shape: "plague", color: "#d8d882" },
  { spec: 8, name: "Cólera", shape: "cholera", color: "#5fd5bc" },
  { spec: 9, name: "Gripe de 1918", shape: "influenza", color: "#fa9070", stats: { hp: 650, speed: 0.7, reward: 90 } },
  { spec: 8, name: "Tuberculosis", shape: "tuberculosis", color: "#fac575", armor: 8, shield: 0.16 },
  { spec: 7, name: "Poliomielitis", shape: "polio", color: "#ccabff", speed: 0.72, hpFactor: 1.9 },
  { spec: 9, name: "Viruela", shape: "smallpox", color: "#ff83ac", stats: { hp: 650, speed: 0.7, reward: 90 } },
];
const COOLING_BOSSES = {
  runner: { name: "Sarampión", shape: "measles", color: "#ff865a" },
  guard: { name: "Difteria", shape: "diphtheria", color: "#ba9bff" },
};
export const BOSS_CATALOG = [
  ...BOSS_LOADOUTS.map(({ name, shape, color }) => ({ name, shape, color, boss: true })),
  ...Object.entries(COOLING_BOSSES).map(([coolingBoss, spec]) => ({ ...spec, coolingBoss, boss: true })),
];
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
  [[0, 455], [248, 455], [248, 295], [520, 295], [520, 386], [900, 386]],
  [[0, 170], [298, 170], [298, 278], [544, 278], [544, 218], [900, 218]],
  [[0, 460], [287, 460], [287, 320], [560, 320], [560, 265], [900, 265]],
];

const ROUTE_EVENTS = {
  11: { wave: 3, name: "Esclusa lateral", shifts: [[-50, -68], [-50, -68], [-45, -68], [-45, 0]] },
  13: { wave: 4, name: "Retorno de las bombas", shifts: [[-90, 54], [-90, 54], [75, 54], [75, 0]] },
  19: { wave: 4, name: "Desvío de emergencia", shifts: [[-56, 0], [-56, -74], [112, -74], [112, 0]], blackout: true },
};
export const VARIANT_NAMES = { escort: "Escolta", scout: "Explorador", emitter: "Emisor móvil" };
const ESCORT_RANGE = 90;
const LINK_WIDTH = 18;

const APPROACH_SCALE = 0.78;

function extendApproach(points) {
  const [endX, endY] = points.at(-1);
  const turnY = endY >= HEIGHT / 2 ? 88 : HEIGHT - 92;
  return [
    ...points.slice(0, -1).map(([x, y]) => [x * APPROACH_SCALE, y]),
    [728, endY], [728, turnY], [827, turnY], [827, endY], [endX, endY],
  ];
}

function fixedBuildSites(paths, firePads, plannedPosts = []) {
  const sites = [...firePads];
  const add = (x, y) => {
    if (sites.some(site => Math.hypot(site.x - x, site.y - y) < 58)) return;
    let distance = Infinity;
    for (const { points } of paths)
      for (let i = 1; i < points.length; i++)
        distance = Math.min(distance, segmentDistance(x, y, points[i - 1], points[i]));
    if (distance > 39 && distance < 120) sites.push({ x, y });
  };
  for (const [x, y] of plannedPosts) add(x, y);
  for (let y = 60, row = 0; y <= HEIGHT - 45; y += 82, row++)
    for (let x = 60 + 28 * (row % 2); x <= WIDTH - 45; x += 82) add(x, y);
  return sites;
}

export function route(points) {
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
    // The three original arenas keep existing daily records comparable.
    map: Math.floor(seed / rules.length) % 3,
  };
}

function nextEnemy(order, spec, lane, modifier = {}) {
  order.push({ spec, lane, ...modifier });
}

const FORMATIONS = {
  convoy: ["Columna blindada", "Escolta rápida", "Flanco"],
  cross: ["Primer empuje", "Cambio de entrada", "Asalto simultáneo"],
  surge: ["Sondeo", "Irrupción rápida", "Último empuje"],
};

function formWave(order, formation, theme, level, { pressure, veteran, archiveLane, tactics }) {
  const interval = theme === SWARM ? 24 : theme === RUSH ? 31 : 39;
  const bosses = order.filter((enemy) => enemy.boss);
  const regular = order.length - bosses.length;
  const split = order.some((enemy) => enemy.lane === 1);
  const lead = split ? order[0].lane : 0;
  const flank = split ? 1 - lead : 0;
  const groups = FORMATIONS[formation] || ["Avance continuo"];
  const boundaries = [0, Math.ceil(regular / 3), Math.ceil(regular * 2 / 3), regular];
  let elapsed = 0;
  const timeline = groups.map((defaultName, group) => {
    const directive = tactics?.groups[group];
    const name = directive?.name || defaultName;
    const species = directive?.species && PATHOGEN_TYPES.find(type => type.id === directive.species);
    const start = boundaries[group];
    const end = formation ? boundaries[group + 1] : regular;
    const lanes = [0, 0];
    let time;
    for (let i = start; i < end; i++) {
      const entry = order[i];
      const first = i === start;
      entry.delay = i === 0 ? 12 : formation && first ? 96 : interval;
      entry.groupName = name;
      if (formation === "convoy") {
        entry.lane = group === 2 ? flank : lead;
        if (group === 0 && first) {
          entry.spec = PATHOGEN_TYPES[level >= 6 ? 4 : 1];
          entry.armor = Math.max(entry.armor, 4 + level * 0.48);
        }
        if (group === 1) {
          entry.spec = PATHOGEN_TYPES[level >= 7 ? 6 : 2];
          entry.speed = Math.max(entry.speed, 1.16);
          if (!first) entry.delay = 19;
        }
      } else if (formation === "cross") {
        entry.lane = group === 0 ? lead : group === 1 ? flank : (i - start) % 2 ? flank : lead;
        if (group === 2 && !first) entry.delay = (i - start) % 2 && split ? 0 : 22;
      } else if (formation === "surge") {
        if (split) entry.lane = group === 1 ? flank : lead;
        if (group === 1) {
          entry.speed = Math.max(entry.speed, 1.15);
          if (!first) entry.delay = 13;
        }
      }
      if (pressure && split) {
        entry.lane = group === 1 && (i - start) % 3 !== 0 ? 0 : 1;
        entry.speed = entry.lane === 1 ? Math.max(entry.speed, 1.24) : 1;
      }
      if (archiveLane != null)
        entry.lane = group === 1 && i - start < 2 ? 1 - archiveLane : archiveLane;
      if (directive) {
        if (species) entry.spec = species;
        if (first && i > 0 && directive.gap) entry.delay = directive.gap;
        if (!first && directive.spacing) entry.delay = directive.spacing;
        if (directive.lane != null) entry.lane = directive.lane;
        if (directive.speed) entry.speed = Math.max(entry.speed, directive.speed);
        if (directive.armor === 0) entry.armor = 0;
        if ((i - start) % 2 === 0) {
          if (directive.armor) entry.armor = Math.max(entry.armor, directive.armor);
          if (directive.shield) entry.shield = Math.max(entry.shield, directive.shield);
        }
      }
      if (veteran) entry.delay = Math.round(entry.delay * 0.82);
      elapsed += entry.delay;
      if (first) time = elapsed;
      lanes[entry.lane]++;
    }
    return { name, time, lanes };
  });
  if (bosses.length) {
    const lanes = [0, 0];
    for (const [index, enemy] of bosses.entries()) {
        enemy.delay = index === 0 ? (veteran ? 72 : formation ? 92 : interval) : 0;
      lanes[enemy.lane]++;
    }
    const event = {
      name: bosses.map((enemy) => enemy.spec.name).join(" + "),
      time: elapsed + bosses[0].delay,
      lanes,
    };
    for (const boss of bosses) boss.groupName = event.name;
    timeline.push(event);
  }
  return timeline;
}

function nextArrivals(queue, firstDelay, interval, lanes) {
  const upcoming = [null, null];
  let ticks = Math.max(0, firstDelay);
  let found = 0;
  for (const [index, entry] of queue.entries()) {
    if (index > 0) ticks += entry.delay ?? interval;
    if (upcoming[entry.lane]) continue;
    upcoming[entry.lane] = { name: entry.groupName || entry.spec.name, ticks };
    if (++found === lanes) break;
  }
  return upcoming;
}

export function escortArmor(enemy) {
  return enemy.guard?.hp > 0 && !enemy.guard.escaped ? 9 : 0;
}

function damageThroughArmor(amount, armor, piercing) {
  return piercing ? amount : Math.max(amount * 0.35, amount - armor);
}

function resolveImpact(enemy, shield, amount, { piercing = false, shred = false }, tower, time) {
  let armor = enemy.armor + escortArmor(enemy);
  if (tower?.rank) {
    amount *= towerMultiplier(enemy, tower);
    if (enemy.variant === "emitter" && tower.id === "sniper") amount *= 2;
    if (enemy.emitter?.hp > 0 && !enemy.emitter.escaped) amount *= 0.7;
    if (enemy.signalLost && tower.type === "single") amount *= 2.4;
    if (enemy.markedUntil > time) amount *= 1.15;
    if (enemy.frozenUntil > time && tower.type === "splash") amount *= 1.2;
    if (enemy.exposedUntil > time) armor *= 0.5;
    if (enemy.moduleExposureUntil > time) amount *= 1.2;
  }
  const chill = tower?.rank && tower.type === "splash" && enemy.chilledUntil > time && !(enemy.frozenUntil > time);
  const corrosion = !piercing && tower?.id === "phagocyte" && enemy.corrodedUntil > time;
  const baseAbsorbed = Math.min(shield, amount * (piercing ? 0.45 : 1));
  const total = chill ? amount * 1.14 : amount;
  const absorbed = chill ? Math.min(shield, total * (piercing ? 0.45 : 1)) : baseAbsorbed;
  const damage = damageThroughArmor(total - absorbed, corrosion ? armor * 0.45 : armor, piercing);
  return {
    synergy: corrosion ? "corrosionDamage" : chill ? "chillDamage" : null,
    comboDamage: corrosion || chill ? damage - damageThroughArmor(amount - baseAbsorbed, armor, piercing) : 0,
    shield: Math.max(0, shield - absorbed * (shred ? 2 : 1)),
    damage,
  };
}

function reserveImpact(book, shot, time) {
  const enemy = shot.target;
  if (enemy.hp <= 0 || enemy.escaped) return;
  const pending = book.get(enemy) || { hp: enemy.hp, shield: enemy.shield };
  const impact = resolveImpact(enemy, pending.shield, shot.damage, shot.branch, shot.tower, time);
  pending.shield = impact.shield;
  pending.hp -= impact.damage;
  book.set(enemy, pending);
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

const placementOffsets = [];
for (let y = -30; y <= 30; y += 6) {
  for (let x = -30; x <= 30; x += 6) {
    const distance = x * x + y * y;
    if (distance > 0 && distance <= 30 * 30) placementOffsets.push({ x, y, distance });
  }
}
placementOffsets.sort((a, b) => a.distance - b.distance);

export function suggestPlacement(point, check) {
  for (const offset of placementOffsets) {
    const candidate = { x: point.x + offset.x, y: point.y + offset.y };
    if (!check(candidate.x, candidate.y)) return candidate;
  }
  return null;
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

export const REACTOR_FIRST_CYCLE = 105;

export function reactorProduction(tower) {
  const output = reactorOutput(tower.rank, tower.branch);
  const ticks = Math.ceil(tower.fireRate);
  return { output, ticks, perMinute: output * 3600 / ticks, charge: tower.branch?.charge || 0 };
}

export class Match {
  constructor(level, daily = null, { heroId, contract, veteran = false, legacyArchiveOrder = false, fixedLayout = false, limitedConstruction = true } = {}) {
    this.level = level;
    this.daily = daily;
    this.contract = contract || null;
    this.veteran = veteran;
    this.ranked = !!(daily || contract || veteran);
    this.fixedLayout = fixedLayout && (!this.ranked || contract?.mastery === true);
    this.mission = daily ? null : MISSIONS[level - 1];
    this.mapIndex = daily?.map ?? CHAPTERS[this.mission.chapter].map;
    const chapter = this.mission && CHAPTERS[this.mission.chapter];
    const base = chapter?.points ? { ...MAPS[this.mapIndex], points: chapter.points, accent: chapter.color, scenery: chapter.scenery } : MAPS[this.mapIndex];
    const auxiliary = chapter?.aux ?? AUXILIARY_LANES[this.mapIndex - 1];
    const layout = (points) =>
      this.mission
        ? missionRoutes(this.fixedLayout ? extendApproach(points) : points, this.mission, WIDTH, HEIGHT)
        : points;
    this.map = this.mission ? { ...base, points: layout(base.points), floor: this.mission.chapter } : base;
    this.routes = [route(this.map.points)];
    if ((daily || level >= 5) && this.mapIndex > 0)
      this.routes.push(route(layout(auxiliary)));
    this.gateRoutes =
      !daily && level === 6 ? [this.routes[1], route(layout(COOLING_SHORTCUT))] : null;
    this.gateDiverted = false;
    this.towerLimit = contract?.towerLimit ?? this.mission?.towerLimit;
    this.limitedConstruction = limitedConstruction && this.fixedLayout && !this.ranked && level >= 2 &&
      !this.mission.finale?.storyModules;
    if (this.limitedConstruction) {
      const capacity = level < 5 ? 3 : level < 12 ? 4 : 6;
      this.towerLimit = Math.min(this.towerLimit ?? capacity, capacity);
    }
    this.firePads = [];
    this.powerCuts = !this.ranked || this.fixedLayout ? this.mission.powerCuts : null;
    if (this.fixedLayout && this.powerCuts) {
      const scale = APPROACH_SCALE ** (this.mission.bend || 1);
      this.powerCuts = Object.fromEntries(Object.entries(this.powerCuts).map(([wave, cut]) =>
        [wave, { ...cut, x: cut.x * scale }]));
    }
    this.padCycle = !this.ranked || this.fixedLayout ? this.mission.padCycle : null;

    const event = !daily && ROUTE_EVENTS[this.mission?.routePattern ?? level];
    if (event) {
      const points = auxiliary.map(([x, y], i) => {
        const [dx, dy] = event.shifts[i - 1] || [0, 0];
        return [x + dx, y + dy];
      });
      const [a, b] = this.routes[0].points.slice(2, 4);
      const blackout = event.blackout
        ? { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, radius: 122 }
        : null;
      this.routeEvent = { ...event, original: this.routes[1], alternate: route(layout(points)), blackout };
    }
    if (chapter?.scenery) {
      for (const path of this.routes) {
        const [x, y] = path.points[3];
        const candidates = [52, 74, 98].flatMap(offset =>
          [-1, 1].flatMap(dx => [-1, 1].map(dy => ({ x: x + dx * offset, y: y + dy * offset }))));
        const pad = candidates.find(p => p.x >= 32 && p.x <= WIDTH - 32 && p.y >= 32 && p.y <= HEIGHT - 32 &&
          !this.routes.some(r => nearRoute(r, p.x, p.y)) &&
          !(this.routeEvent && nearRoute(this.routeEvent.alternate, p.x, p.y)) &&
          this.firePads.every(other => Math.hypot(p.x - other.x, p.y - other.y) > 64));
        if (pad) this.firePads.push(pad);
      }
    }
    this.buildSites = this.fixedLayout
      ? fixedBuildSites([...this.routes, ...(this.gateRoutes || []), ...(this.routeEvent ? [this.routeEvent.alternate] : [])], this.firePads, this.mission.fixedPosts)
      : null;
    this.hp = contract?.hp ?? 100;
    this.combatLevel = Math.min(level, 10) + Math.max(0, level - 10) * 0.44;
    this.atp = daily?.atp ?? contract?.atp ?? Math.round(180 + this.combatLevel * 12 + Math.max(0, this.combatLevel - 5) * 20);
    this.techLevel = daily ? 10 : level;
    this.wave = 0;
    this.maxWaves = daily ? 7 : this.mission.waves ?? (level < 4 ? 4 : level < 8 ? 5 : 6);
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
    this.power = !daily && (!contract || this.fixedLayout) && this.mission.objective === "power" ? { first: null } : null;
    this.archive = !daily && (!contract || this.fixedLayout) && this.mission.objective === "archive"
      ? this.routes.map((path, lane) => {
          const waypoint = this.mission.archiveWaypoints?.[lane] ?? 3;
          const [x, y] = path.points[waypoint];
          return { lane, waypoint, x, y, hp: 4, complete: false };
        })
      : null;
    if (this.archive && this.mission.archiveFirstLane === 1 && !legacyArchiveOrder) this.archive.reverse();
    this.combatCue = null;
    this.focusTarget = null;
    this.zeroNodes = [];
    this.preview = this.planWave(1);
    this.lastBuild = null;
    this.waveStart = null;
    this.debrief = null;
    this.waveLeaks = null;
    this.waveObjectiveHits = null;
    this.console = !daily && !contract && level === 2
      ? { lane: 0, waypoint: 2, x: this.routes[0].points[2][0], y: this.routes[0].points[2][1], hp: 4, complete: false }
      : null;
    this.barrier = !daily && !contract && level === 8
      ? { x: this.routes[0].points.at(-2)[0], y: this.routes[0].points.at(-2)[1], used: false, until: 0 }
      : null;
    this.mirrorOrders = [];
    this.comboNotice = null;
    const hero = !daily && (!contract || this.fixedLayout) && HERO_BY_ID.get(veteran ? "iris" : heroId);
    this.hero = hero
      ? { ...hero, x: WIDTH - 85, y: Math.max(26, Math.min(HEIGHT - 26, this.map.points.at(-1)[1] - 53)),
          cooldown: 0, abilityCooldown: 0, targeting: "first", inflicted: 0, defeated: 0 }
      : null;
  }

  activePad(wave = this.coverageWave) {
    return this.padCycle?.[wave - 1];
  }

  padBonus(tower, wave = this.coverageWave) {
    if (!tower.rank || tower.type === "eco") return 1;
    const active = this.activePad(wave);
    const boosted = this.firePads.some((pad, index) => (active == null || index === active) &&
      Math.hypot(pad.x - tower.x, pad.y - tower.y) <= 20);
    return boosted ? (active == null ? 1.25 : 1.5) : 1;
  }

  lens(wave) {
    if (!this.fixedLayout || this.level !== 28) return null;
    const lane = (wave - 1) % 2;
    return { lane, segments: lane ? [2, 4] : [1, 3] };
  }

  heroImpact() {
    if (!this.heroReport) return "";
    if (this.hero?.id === "lure")
      return `Nexo · ${this.heroReport.pulled} enemigos atraídos de vuelta al alcance de torres`;
    if (this.hero?.id !== "relay") return "";
    const entries = Object.entries(this.heroReport.relays).map(([name, shots]) => `${name} · ${shots} disparos con energía de Vatio`);
    if (this.heroReport.reactor) entries.push(`Bio-Reactor · +${this.heroReport.reactor} ATP durante el apagón`);
    return entries.join(" / ") || "Vatio · Ninguna torre reactivada produjo ATP ni disparó";
  }

  get alternateRoute() {
    return this.gateRoutes?.[Number(!this.gateDiverted)];
  }

  get coverageWave() {
    return this.state === "build" ? this.wave + 1 : this.wave;
  }

  routesForWave(wave) {
    const event = this.routeEvent;
    return event && wave >= event.wave && this.routes[1] !== event.alternate
      ? [this.routes[0], event.alternate] : this.routes;
  }

  get defenseObjective() {
    const objective = this.activeTerminal || this.console;
    return objective && !objective.complete ? objective : null;
  }

  objectiveApproach(objective = this.defenseObjective) {
    if (!objective) return null;
    const lane = this.routesForWave(this.coverageWave)[objective.lane];
    return route(lane.points.slice(0, objective.waypoint + 1));
  }

  applyRouteEvent(wave) {
    if (this.routeEvent && wave >= this.routeEvent.wave) {
      this.routes[1] = this.routeEvent.alternate;
      const terminal = this.archive?.find(device => device.lane === 1);
      if (terminal) [terminal.x, terminal.y] = this.routes[1].points[terminal.waypoint];
    }
  }

  get routeEventStatus() {
    const event = this.routeEvent;
    if (!event) return null;
    const nextWave = this.state === "build" ? this.wave + 1 : this.wave;
    if (nextWave < event.wave - 1) return null;
    return this.routes[1] !== event.alternate ? "warning"
      : nextWave === event.wave ? "active" : "rerouted";
  }

  blackoutForWave(wave) {
    const event = this.routeEvent;
    return this.powerCuts?.[wave] || (event?.wave === wave ? event.blackout : null);
  }

  towerOffline(tower, wave = this.state === "wave" ? this.wave : 0) {
    const area = this.blackoutForWave(wave);
    return !!area && !(this.state === "wave" && wave === this.wave && tower.relayUntil > this.time) &&
      Math.hypot(tower.x - area.x, tower.y - area.y) <= area.radius;
  }

  get hasAffinities() {
    return !this.daily && this.level >= 3;
  }

  get hasEnemyVariants() {
    return !this.daily && this.level >= 7;
  }

  linkPartner(tower, wave) {
    let partner;
    let closest = 175;
    for (const other of this.towers) {
      if (other === tower || other.type === "eco" || this.towerOffline(other, wave)) continue;
      const distance = Math.hypot(tower.x - other.x, tower.y - other.y);
      if (distance <= closest) {
        closest = distance;
        partner = other;
      }
    }
    return partner;
  }

  recordLeak(enemy, loss) {
    const report = this.waveLeaks;
    report.lanes[enemy.lane]++;
    if (loss > 0) {
      if (report.impact?.tick !== this.time)
        report.impact = { tick: this.time, name: enemy.name, loss: 0, count: 0, lanes: [] };
      const impact = report.impact;
      impact.loss += loss;
      impact.count++;
      if (!impact.lanes.includes(enemy.lane)) impact.lanes.push(enemy.lane);
    }
    if (loss > (report.worst?.loss || 0))
      report.worst = { name: enemy.name, loss, lane: enemy.lane };
    this.recordPassage(report, enemy);
  }

  recordPassage(report, enemy) {
    const label = enemy.variant ? `${enemy.name} · ${VARIANT_NAMES[enemy.variant]}` : enemy.name;
    const key = `${enemy.lane}:${label}`;
    const entry = report.entries.get(key) || { name: label, lane: enemy.lane, count: 0, uncovered: 0 };
    entry.count++;
    let uncovered = false;
    for (const [waypoint, samples] of (enemy.coverageGaps || []).entries()) {
      if (!(samples >= 3)) continue;
      uncovered = true;
      const gapKey = `${enemy.lane}:${waypoint}`;
      const gap = report.gaps.get(gapKey) || { lane: enemy.lane, waypoint, count: 0 };
      gap.count++;
      report.gaps.set(gapKey, gap);
    }
    if (uncovered) entry.uncovered++;
    report.entries.set(key, entry);
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

  get activeTerminal() {
    return this.archive?.[Math.max(0, this.wave - Number(this.state !== "build"))] ?? null;
  }

  isolatedLane(wave) {
    if (!this.power || this.power.first === null || wave > 4) return null;
    return wave <= 2 ? this.power.first : 1 - this.power.first;
  }

  selectPowerLine(lane) {
    if (!this.power || this.state !== "build" || this.wave !== 0 || ![0, 1].includes(lane))
      return false;
    this.power.first = lane;
    this.preview = this.planWave(1);
    return true;
  }

  get incomingGroups() {
    return this.state === "wave"
      ? nextArrivals(this.queue, this.spawnIn, this.interval, this.routes.length)
      : [null, null];
  }

  cue(kind, text, position) {
    const previous = this.combatCue;
    if (kind === "shield" && previous?.until - this.time > 34) return;
    this.combatCue = { kind, text, x: position.x, y: position.y, until: this.time + 105 };
  }

  finishMissionObjectives() {
    const terminal = this.activeTerminal;
    if (terminal && !terminal.complete) {
      terminal.complete = true;
      this.cue("objective", `Terminal ${terminal.lane ? "B" : "A"} asegurada`, terminal);
    }
    if (this.console && !this.console.complete) {
      this.console.complete = true;
      this.cue("objective", "Copia recuperada", this.console);
    }
    if (this.power && [2, 4].includes(this.wave)) {
      const point = this.routes[0].points.at(-1);
      this.cue("objective", this.wave === 2 ? "Primera línea aislada" : "Líneas aisladas",
        { x: point[0] - 28, y: point[1] });
    }
  }

  planWave(wave) {
    const level = this.level;
    const final = wave === this.maxWaves;
    let finale = final && (!this.ranked || this.fixedLayout) ? this.mission.finale : null;
    if (this.fixedLayout && finale?.storyModules) {
      const [second, third] = finale.stages;
      finale = {
        ...finale,
        tip: "Decide si priorizas cortar los refuerzos en A o abrir una ventana de daño en B.",
        stages: [
          { ...second, name: "Activación de módulos", reinforcements: null,
            detail: "El emisor de A envía refuerzos. El regulador de B sostiene el escudo. Al destruirlo, las torres infligen un 20 % más de daño al jefe durante 4,5 s." },
          { ...third, detail: "El jefe pierde el escudo y acelera. Llegan corredores por B y el emisor de A sigue enviando enemigos si está activo." },
        ],
      };
    }
    const protectingArchive = !!this.archive && wave <= 2;
    const veteranPressure = this.veteran && !protectingArchive;
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
      5 + wave * 2 + Math.floor(this.combatLevel * 0.55) + (this.daily?.extra || 0) + (veteranPressure ? 2 : 0);
    const order = [];
    const pool = Math.min(wave < 3 ? 4 : level >= 18 ? 10 : level > 10 ? 9 : 7, Math.ceil((level + wave) / 2));
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
        armor: guarded && (theme === ARMOR || veteranPressure) ? 6 + this.combatLevel * 0.65 : 0,
        shield: theme === SHIELD && guarded ? 0.42 : 0,
      });
    }
    if (final && this.gateRoutes) {
      nextEnemy(order, { ...PATHOGEN_TYPES[8], ...COOLING_BOSSES.runner }, 0, {
        boss: true,
        coolingBoss: "runner",
        speed: 1.35,
      });
      nextEnemy(order, { ...PATHOGEN_TYPES[8], ...COOLING_BOSSES.guard }, 1, {
        boss: true,
        coolingBoss: "guard",
        armor: 5,
      });
    } else if (final) {
      const { spec, name, shape, color, stats, ...loadout } = BOSS_LOADOUTS[this.mapIndex];
      const zero = this.level === 22 && !this.daily;
      nextEnemy(order, { ...PATHOGEN_TYPES[spec], ...stats, name, shape, color }, this.routes.length - 1, {
        ...loadout,
        ...(zero ? { hpFactor: 1.26, zero: true } : {}),
        boss: true,
        finale,
        mirror: !this.daily && !zero && (this.level === 10 || (this.veteran && this.routes.length > 1)),
      });
    }
    const counterTactics = this.fixedLayout ? this.mission.counterTactics?.[wave] : null;
    const tactics = !this.ranked || this.fixedLayout ? counterTactics || this.mission.tactics?.[wave] : null;
    const formation = tactics ? tactics.formation || "cross" : this.daily ? null : veteranPressure
      ? ["surge", "cross", "convoy"][(wave + level + 1) % 3]
      : this.contract?.formation ?? this.mission.formation ??
        (wave === 1 && level < 6 ? null : ["convoy", "cross", "surge"][(wave + level) % 3]);
    const timeline = formWave(order, formation, theme, this.combatLevel, {
      pressure: this.contract?.pressure,
      veteran: veteranPressure,
      archiveLane: protectingArchive ? this.archive[wave - 1].lane : null,
      tactics,
    });
    if (this.hasEnemyVariants && wave >= 2 && !protectingArchive && !counterTactics) {
      const escort = order[0];
      const scout = order.find((entry, i) => i >= 2 && entry.lane !== escort.lane && !entry.boss) || order[2];
      escort.spec = PATHOGEN_TYPES[4];
      escort.variant = "escort";
      scout.spec = PATHOGEN_TYPES[6];
      scout.variant = "scout";
    }
    if (this.fixedLayout && level === 38 && wave >= 3) {
      const lead = order[0];
      lead.variant = "emitter";
      lead.spec = PATHOGEN_TYPES[3];
      lead.speed = 0.8;
      lead.hpFactor = 0.65;
      lead.armor = lead.shield = 0;
      order[1].delay += 75;
      for (const group of timeline.slice(1)) group.time += 75;
    }
    const isolated = this.isolatedLane(wave);
    if (isolated !== null)
      for (const entry of order) entry.speed = (entry.speed || 1) * (entry.lane === isolated ? 0.8 : 1.12);
    return {
      order,
      timeline,
      tactics,
      arrivals: nextArrivals(order, order[0]?.delay ?? 0, 0, this.routes.length),
      theme,
      count: order.length,
      final,
      finale,
      lanes: this.routes.map((_, lane) =>
        order.reduce((sum, e) => sum + Number(e.lane === lane), 0),
      ),
      bossTip: !final
        ? ""
        : this.gateRoutes
          ? "El sarampión acelera por A y la difteria activa un escudo en B. Prepara lentitud en A y reserva el pulso para B."
          : this.level === 22 && !this.daily
            ? "La viruela abre dos nodos. Prioriza Nodos de apoyo en tus torres para romper su escudo, o resiste los refuerzos hasta que se agoten."
            : this.level === 10 && !this.daily
            ? this.veteran
              ? "El jefe anunciará refuerzos primero por B y después por A."
              : "El jefe anunciará refuerzos primero por A y después por B."
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
    if (hero.id === "relay") {
      const target = this.towers.filter(tower => this.towerOffline(tower) &&
        Math.hypot(hero.x - tower.x, hero.y - tower.y) <= hero.abilityRange)
        .sort((a, b) => Math.hypot(hero.x - a.x, hero.y - a.y) - Math.hypot(hero.x - b.x, hero.y - b.y))[0];
      if (!target) return false;
      hero.abilityCooldown = hero.recharge;
      target.relayUntil = this.time + 300;
      this.effect(hero.x, hero.y, hero.color, 0, target);
      this.cue("objective", `${target.name} reactivada · 5 s`, target);
      return true;
    }
    const hits = this.enemies.filter((enemy) => enemy.hp > 0 &&
      Math.hypot(hero.x - enemy.x, hero.y - enemy.y) <= hero.abilityRange);
    if (hero.id === "lure") {
      const pulled = hits.filter(enemy => !enemy.boss && !enemy.supportNode && !enemy.escaped &&
        this.anchorEnemy(enemy, hero));
      if (!pulled.length) return false;
      hero.abilityCooldown = hero.recharge;
      this.effect(hero.x, hero.y, hero.color, hero.abilityRange);
      return true;
    }
    if (!hits.length) return false;
    hero.abilityCooldown = hero.recharge;
    if (hero.id === "iris") {
      const target = hits.reduce((best, enemy) =>
        enemy.hp + enemy.shield > best.hp + best.shield ? enemy : best);
      target.markedUntil = this.time + 200;
      this.cue("objective", "Objetivo marcado por Óptix", target);
    }
    for (const enemy of hits) {
      if (hero.id === "mara") enemy.frozenUntil = this.time + 230;
      if (hero.id === "ivo") enemy.exposedUntil = this.time + 210;
      if (hero.stripShield && enemy.shield) {
        this.cue("shield", "Escudo roto", enemy);
        enemy.shield = 0;
        hero.shieldsBroken = (hero.shieldsBroken || 0) + 1;
      }
      if (hero.stun) enemy.stun = Math.max(enemy.stun, enemy.boss ? 34 : hero.stun);
      this.damage(enemy, hero.abilityDamage, hero.color, {}, hero);
    }
    this.effect(hero.x, hero.y, hero.color, hero.abilityRange);
    return true;
  }

  anchorEnemy(enemy, hero) {
    const points = enemy.path.points;
    const [x, y] = points[enemy.wp - 1];
    const [endX, endY] = points[enemy.wp];
    const dx = endX - x;
    const dy = endY - y;
    const fraction = Math.max(0, Math.min(1, ((hero.x - x) * dx + (hero.y - y) * dy) / (dx ** 2 + dy ** 2)));
    const target = { x: x + dx * fraction, y: y + dy * fraction };
    if ((enemy.x - target.x) * dx + (enemy.y - target.y) * dy <= 0) return false;
    enemy.anchor = { ...target, until: this.time + 120,
      outside: this.towers.filter(t => t.type !== "eco" && !this.towerOffline(t) &&
        Math.hypot(t.x - enemy.x, t.y - enemy.y) > t.range) };
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
      if (enemy.shield) this.cue("shield", "Escudo roto", enemy);
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

  checkPlacement(type, x, y, restoring = false) {
    if (!type || !["build", "wave"].includes(this.state))
      return "La partida está detenida.";
    if (this.towers.length >= (this.towerLimit ?? Infinity))
      return this.contract ? "Has alcanzado el máximo de torres del contrato." : "Límite de torres alcanzado. Selecciona una instalada para mejorarla.";
    if (type.unlock > this.techLevel)
      return "Esta torre se habilita en otro sector.";
    return this.checkSite(x, y, null, restoring) || (this.atp < type.cost ? "ATP insuficiente." : "");
  }

  closestBuildSite(x, y, radius = 38) {
    let closest = null;
    let distance = radius;
    for (const site of this.buildSites || []) {
      const next = Math.hypot(site.x - x, site.y - y);
      if (next > distance) continue;
      closest = site;
      distance = next;
    }
    return closest;
  }

  checkSite(x, y, ignored = null, restoring = false) {
    if (!Number.isFinite(x) || !Number.isFinite(y) ||
        x < 24 || x > WIDTH - 24 || y < 24 || y > HEIGHT - 24)
      return "Acércate al interior del tablero.";
    if (this.fixedLayout && !this.buildSites.some(site => site.x === x && site.y === y))
      return "Construye en un puesto libre.";
    if (this.routes.some((path, lane) => nearRoute(path, x, y) &&
        !(restoring && lane === 1 && this.routeEvent && path === this.routeEvent.alternate &&
          !nearRoute(this.routeEvent.original, x, y))))
      return "Deja despejado el conducto.";
    if (!restoring && this.routeEvent && this.routes[1] !== this.routeEvent.alternate &&
        nearRoute(this.routeEvent.alternate, x, y))
      return "Deja despejado el futuro desvío.";
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

  place(type, x, y, restoring = false) {
    if (this.checkPlacement(type, x, y, restoring)) return null;
    this.atp -= type.cost;
    const tower = {
      ...type,
      x,
      y,
      paid: type.cost,
      cooldown: type.type === "eco" ? REACTOR_FIRST_CYCLE : 0,
      rank: 1,
      targeting: "first",
      inflicted: 0,
      defeated: 0,
      produced: 0,
      slowTicks: 0,
      shieldsBroken: 0,
      synergyHits: 0,
      corrosionDamage: 0,
      chillDamage: 0,
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
    this.atp += tower.paid;
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
    if (this.contract?.noSell || !this.towers.includes(tower)) return false;
    this.towers.splice(this.towers.indexOf(tower), 1);
    this.atp += Math.floor(tower.paid * 0.65);
    return true;
  }

  focusFire(enemy) {
    if (this.state !== "wave" || (enemy !== null &&
        (!this.enemies.includes(enemy) || enemy.hp <= 0 || enemy.escaped))) return false;
    this.focusTarget = enemy;
    return true;
  }

  startWave() {
    if (this.state !== "build" || this.power?.first === null) return false;
    this.state = "wave";
    this.replay = [];
    this.breachEnemy = null;
    this.encounterId = 0;
    this.emitterDown = false;
    this.heroReport = { relays: {}, pulled: 0, reactor: 0 };
    this.wave++;
    this.applyRouteEvent(this.wave);
    for (const tower of this.towers) {
      tower.linkReady = 0;
      tower.relayUntil = 0;
    }
    this.lastBuild = null;
    this.waveStart = { hp: this.hp, kills: this.kills, atp: this.grossATP, reactor: 0, count: this.preview.count, corrosionDamage: 0, chillDamage: 0 };
    this.waveLeaks = { lanes: this.routes.map(() => 0), worst: null, entries: new Map(), gaps: new Map() };
    const objective = this.defenseObjective;
    this.waveObjectiveHits = objective ? {
      objective: {
        name: this.console ? "Consola" : `Terminal ${objective.lane ? "B" : "A"}`,
        lane: objective.lane,
        points: this.objectiveApproach(objective).points,
      },
      count: 0,
      entries: new Map(),
      gaps: new Map(),
    } : null;
    this.debrief = null;
    this.focusTarget = null;
    this.zeroNodes = [];
    this.queue = [...this.preview.order];
    this.interval =
      this.preview.theme === SWARM ? 24 : this.preview.theme === RUSH ? 31 : 39;
    this.preview =
      this.wave < this.maxWaves ? this.planWave(this.wave + 1) : null;
    this.spawnIn = this.queue[0]?.delay ?? 12;
    return true;
  }

  effect(x, y, color, radius, to = null) {
    this.effects.push({ x, y, color, radius, to, life: 22 });
  }

  entryDefense({ spec, boss, coolingBoss, armor = 0, shield = 0, hpFactor = 1 }, wave) {
    const scale = 0.96 + (wave - 1) * 0.14 +
      (this.combatLevel - 1) * (wave < 3 ? 0.065 : 0.105);
    const bossScale = coolingBoss ? 0.68 : boss ? 1.18 : 1;
    const veteranHealth = this.veteran && !(this.archive && wave <= 2) ? 1.09 : 1;
    const storyPressure = this.fixedLayout && wave >= 3 ? 1.15 + 0.10 * (wave - 3) : 1;
    const pressure = this.limitedConstruction && wave >= 3 ? 1.3 + 0.16 * (wave - 3) : 1;
    const hp = Math.round(spec.hp * scale * bossScale * hpFactor * veteranHealth * storyPressure * pressure);
    return {
      hp,
      affinity: this.hasAffinities ? affinityFor(spec.shape, this.fixedLayout) : undefined,
      armor: armor * (this.daily?.armor || 1),
      shield: Math.round(hp * shield),
    };
  }

  estimateImpact(tower, order, wave = this.coverageWave) {
    if (!tower.damage || this.towerOffline(tower, wave))
      return { damage: 0, shieldDamage: 0, unshieldedDamage: 0, hitsToDefeat: null };
    const enemy = { ...this.entryDefense(order, wave), variant: order.variant };
    const amount = Math.round(tower.damage * this.padBonus(tower, wave));
    const hitAtShield = shield => resolveImpact(enemy, shield, amount, tower.branch || {}, tower, this.time);
    const first = hitAtShield(enemy.shield);
    const unshielded = hitAtShield(0).damage;
    let hitsToDefeat = null;
    if (!order.boss) {
      let hpLeft = enemy.hp;
      let shield = enemy.shield;
      let shots = 0;
      while (shield > 0 && hpLeft > 0) {
        const hit = hitAtShield(shield);
        shield = hit.shield;
        hpLeft -= hit.damage;
        shots++;
      }
      hitsToDefeat = shots + Math.ceil(Math.max(0, hpLeft) / unshielded);
    }
    return {
      damage: Math.min(enemy.hp, first.damage),
      shieldDamage: enemy.shield - first.shield,
      unshieldedDamage: unshielded,
      hitsToDefeat,
    };
  }

  spawn() {
    const order = this.queue.shift();
    const { spec, lane, boss = false, speed = 1, coolingBoss, mirror = false, zero = false, variant, finale } = order;
    const defense = this.entryDefense(order, this.wave);
    const path = this.routes[lane];
    const [[x, y]] = path.points;
    this.enemies.push({
      ...spec,
      encounterId: ++this.encounterId,
      x,
      y,
      path,
      lane,
      boss,
      variant,
      ...defense,
      scoutReady: variant === "scout" ? this.time + 120 : null,
      coolingBoss,
      finale,
      mirror,
      zero,
      maxHp: defense.hp,
      speed: spec.speed * speed * (this.daily?.speed || 1),
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
    const shield = enemy.shield;
    const { shield: remainingShield, damage, comboDamage, synergy } = resolveImpact(enemy, shield, amount, { piercing, shred }, tower, this.time);
    if (comboDamage > 0) {
      const bonus = Math.min(enemy.hp, damage) - Math.min(enemy.hp, damage - comboDamage);
      tower[synergy] = (tower[synergy] || 0) + bonus;
      if (this.waveStart) this.waveStart[synergy] += bonus;
      if (bonus > 0) this.comboNotice = {
        label: synergy === "corrosionDamage" ? "Corrosión + Impacto" : "Frío + Área",
        until: this.time + 145,
      };
    }
    enemy.shield = remainingShield;
    if (enemy.variant === "scout" && (damage > 0 || remainingShield < shield))
      enemy.scoutReady = this.time + 120;
    if (tower && shield > 0) {
      tower.inflicted += shield - remainingShield;
      if (remainingShield === 0) tower.shieldsBroken = (tower.shieldsBroken || 0) + 1;
    }
    if (shield > 0 && remainingShield === 0) this.cue("shield", "Escudo roto", enemy);
    if (damage <= 0) return;
    if (tower) tower.inflicted += Math.min(enemy.hp, damage);
    enemy.hp -= damage;
    if (enemy.hp > 0) {
      if (enemy.boss) this.advanceBoss(enemy);
      return;
    }
    if (enemy.variant === "emitter") {
      this.emitterDown = true;
      this.cue("objective", "Emisor abatido · Enlace roto", enemy);
    }
    if (enemy === this.focusTarget) this.focusTarget = null;
    if (enemy.supportNode) {
      enemy.destroyed = true;
      this.resolveNodeDestruction(enemy);
      this.effect(enemy.x, enemy.y, enemy.color, 45);
      return;
    }
    if (enemy.boss)
      for (const node of this.zeroNodes)
        if (node.bossOwner === enemy) node.hp = 0;
    this.kills++;
    if (tower) tower.defeated++;
    this.combo = Math.min(10, this.combo + 1);
    this.comboTime = 210;
    this.charge = Math.min(100, this.charge + (enemy.boss ? 28 : 6));
    const bounty = this.daily && this.combo >= 5 ? 1.25 : this.fixedLayout && this.wave >= 3 ? 0.85 : 1;
    this.addATP(Math.round(enemy.reward * bounty));
    this.effects.push({
      kind: "death", x: enemy.x, y: enemy.y, color: enemy.color,
      radius: enemy.boss ? 56 : 24, boss: enemy.boss, angle: enemy.angle, life: 22,
    });
  }

  deployFinaleModules(boss, specs) {
    this.zeroNodes = specs.map(({ lane, waypoint, name, role, hp, color }) => {
      const path = this.routes[lane];
      const [x, y] = path.points[waypoint];
      return {
        supportNode: true, lane, name, role, x, y, hp, maxHp: hp, color,
        remaining: path.remaining[waypoint], bossOwner: boss, armor: 3, shield: 0,
        slow: 0, slowFactor: 1, burn: 0, stun: 0,
        expires: this.time + 570, nextPulse: role === "reinforcements" ? this.time + 130 : Infinity,
      };
    });
    this.enemies.push(...this.zeroNodes);
  }

  deployZeroNodes(boss) {
    const hp = this.veteran ? 250 : 200;
    this.zeroNodes = this.routes.map((path, lane) => {
      const index = 2;
      const [x, y] = path.points[index];
      return {
        supportNode: true, lane, x, y, hp, maxHp: hp, armor: 3, shield: 0,
        remaining: path.remaining[index], bossOwner: boss, slow: 0, slowFactor: 1, burn: 0, stun: 0,
        name: `Nodo ${lane ? "B" : "A"}`, color: lane ? "#c9a2ff" : "#8deedb",
        expires: this.time + 430, nextPulse: this.time + 105,
      };
    });
    this.enemies.push(...this.zeroNodes);
    this.cue("phase", "La viruela activa los nodos A y B", boss);
  }

  resolveNodeDestruction(node) {
    const boss = node.bossOwner;
    if (node.role) {
      if (node.role === "shield" && boss.hp > 0) {
        boss.shield = 0;
        boss.moduleExposureUntil = this.time + 270;
        this.cue("objective", "Regulador destruido · Jefe expuesto", boss);
      } else {
        this.cue("objective", "Emisor destruido · Refuerzos cortados", node);
      }
      return;
    }
    if (this.zeroNodes.every((entry) => entry.destroyed) && boss.hp > 0) {
      boss.shield = 0;
      boss.stun = Math.max(boss.stun, 170);
      this.cue("objective", "Nodos destruidos · Viruela expuesta", boss);
    } else {
      this.cue("objective", `${node.name} destruido`, node);
    }
  }

  tickZeroNodes() {
    for (const node of this.zeroNodes) {
      if (node.hp <= 0) continue;
      if (node.bossOwner.hp <= 0 || node.bossOwner.escaped || node.expires <= this.time) {
        node.hp = 0;
        continue;
      }
      if (this.time < node.nextPulse) continue;
      node.nextPulse += 150;
      const idle = !this.queue.length;
      for (let i = 0; i < 3; i++)
        nextEnemy(this.queue, PATHOGEN_TYPES[i === 0 ? 4 : 2], node.lane, {
          armor: i === 0 ? 8 : 0, speed: 1.18, delay: 16, groupName: node.role ? "Refuerzos de la reserva" : "Refuerzos de la viruela",
        });
      if (idle) this.spawnIn = 8;
    }
  }

  advanceBoss(enemy) {
    const ratio = enemy.hp / enemy.maxHp;
    const phase = ratio <= 1 / 3 ? 3 : ratio <= 2 / 3 ? 2 : 1;
    if (phase <= enemy.phase) return;
    const previousPhase = enemy.phase;
    const enteredSecondPhase = previousPhase === 1;
    enemy.phase = phase;
    if (enemy.finale && !enemy.zero && !enemy.mirror) {
      for (let next = previousPhase + 1; next <= phase; next++)
        this.advanceFinale(enemy, enemy.finale.stages[next - 2], next);
      return;
    }
    if (phase === 3) this.cue("phase", `${enemy.name} · Fase final`, enemy);
    if (enemy.zero) {
      if (enteredSecondPhase) {
        enemy.shield = Math.round(enemy.maxHp * 0.19);
        this.deployZeroNodes(enemy);
      }
      if (phase === 3) enemy.speed *= 1.28;
      return;
    }
    if (enemy.mirror) {
      if (enteredSecondPhase) {
        enemy.shield = Math.round(enemy.maxHp * 0.19);
        this.mirrorOrders.push({ lane: this.veteran ? 1 : 0, ticks: this.veteran ? 100 : 125 });
      }
      if (phase === 3) {
        this.mirrorOrders.push({ lane: this.veteran ? 0 : 1, ticks: this.veteran ? 100 : 125 });
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
    if (enteredSecondPhase) {
      enemy.shield = Math.round(enemy.maxHp * 0.19);
      const backup = this.routes.length > 1 ? 1 - enemy.lane : enemy.lane;
      for (let i = 0; i < 3; i++)
        nextEnemy(this.queue, PATHOGEN_TYPES[2], backup, { speed: 1.22, groupName: "Refuerzos del jefe" });
      if (this.queue.length === 3) this.spawnIn = 8;
    }
    if (phase === 3) enemy.speed *= 1.5;
    this.effect(enemy.x, enemy.y, phase === 2 ? "#9ddcff" : "#ffae85", 88);
  }

  advanceFinale(enemy, stage, phase) {
    const modules = this.fixedLayout && enemy.finale.storyModules;
    if (modules && phase === 2) this.deployFinaleModules(enemy, modules);
    if (stage.releasePlating) enemy.armor -= enemy.finalePlating || 0;
    if (stage.plating) {
      enemy.armor += stage.plating;
      enemy.finalePlating = stage.plating;
    }
    if (stage.shield) enemy.shield = Math.round(enemy.maxHp * stage.shield);
    if (stage.discharge) enemy.shield = 0;
    if (modules && phase === 3) {
      const regulator = this.zeroNodes.find(node => node.role === "shield");
      if (regulator) regulator.hp = 0;
    }
    if (stage.speed) enemy.speed *= stage.speed;
    if (stage.reinforcements) {
      const { delay, ...group } = stage.reinforcements;
      this.mirrorOrders.push({ speed: 1, ...group, name: stage.name, ticks: delay });
    }
    this.cue("phase", stage.name, enemy);
    this.effect(enemy.x, enemy.y, stage.shield ? "#9ddcff" : "#ffae85", 88);
  }

  hit(enemy, shot) {
    const { damage, color, type, branch, radius, tower } = shot;
    const spreadDebuff = branch.splashSlow || branch.splashBurn;
    const applyDebuff = (target) => {
      if (type === "slow") {
        const duration = branch.slow || tower?.attack?.slow || 95;
        if (this.fixedLayout && tower?.rank && target.hp > 0)
          target.chilledUntil = Math.max(target.chilledUntil || 0, this.time + duration);
        if (duration >= target.slow) target.slowTower = tower;
        target.slow = Math.max(target.slow, duration);
        target.slowFactor = Math.min(
          target.slowFactor,
          target.boss ? 0.72 : branch.slowFactor || 0.52,
        );
      }
      if (type === "dot") {
        if (this.fixedLayout && tower?.id === "toxin" && target.hp > 0)
          target.corrodedUntil = this.time + 180;
        const duration = branch.burn || 130;
        if (!target.burn) target.burnPulseIn = duration % 12 || 12;
        target.burn = Math.max(target.burn, duration);
        const burnDamage = damage * 0.115;
        if (burnDamage >= (target.burnDamage || 0)) {
          target.burnDamage = burnDamage;
          target.burnTower = tower;
        }
        target.burnPierces ||= !!branch.piercing;
      }
    };
    if (type !== "splash") {
      this.effects.push({
        kind: "impact", x: enemy.x, y: enemy.y, color,
        angle: Math.atan2(enemy.y - shot.y, enemy.x - shot.x) || 0,
        attack: type, life: 12,
      });
    }
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
        this.comboNotice = { label: `Frío + Área · ${chilled} enemigos alcanzados`, until: this.time + 145 };
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
      const { count = 4, spec = 2, speed = 1.25, armor = 0, shield = 0, lane, name = "Refuerzos" } = order;
      for (let i = 0; i < count; i++) {
        nextEnemy(this.queue, PATHOGEN_TYPES[spec], lane, { speed, armor, shield, groupName: name });
      }
      if (fresh) this.spawnIn = 7;
    }
    this.tickZeroNodes();
    if (this.comboTime > 0 && --this.comboTime === 0) this.combo = 0;
    if (this.queue.length && --this.spawnIn <= 0) {
      const pair =
        this.queue[0].coolingBoss === "runner" &&
        this.queue[1]?.coolingBoss === "guard";
      this.spawn();
      if (pair) this.spawn();
      while (this.queue[0]?.delay === 0) this.spawn();
      this.spawnIn = this.queue[0]?.delay ?? this.interval;
    }
    const terminal = this.activeTerminal;
    const defense = this.defenseObjective;
    const emitter = this.enemies.find(enemy => enemy.variant === "emitter" && enemy.hp > 0);
    const escort = this.enemies.find((enemy) => enemy.variant === "escort" && enemy.hp > 0);
    const activeTowers = this.towers.filter((tower) => !this.towerOffline(tower));
    const links = new Map();
    for (const tower of activeTowers) {
      if (!tower.branch?.link) continue;
      const partner = this.linkPartner(tower);
      if (partner) links.set(tower, partner);
    }
    const onLink = (enemy, tower, partner) =>
      segmentDistance(enemy.x, enemy.y, [tower.x, tower.y], [partner.x, partner.y]) <= LINK_WIDTH;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      if (!enemy.boss && !enemy.supportNode && enemy.variant !== "emitter") {
        enemy.emitter = emitter && enemy.lane === emitter.lane && enemy.remaining >= emitter.remaining &&
          enemy.remaining - emitter.remaining < 180 ? emitter : null;
        enemy.signalLost = this.emitterDown;
      }
      enemy.guard = escort && enemy !== escort && !enemy.boss && !enemy.supportNode &&
        enemy.lane === escort.lane && Math.hypot(enemy.x - escort.x, enemy.y - escort.y) <= ESCORT_RANGE
        ? escort : null;
      if (enemy.burn > 0) {
        enemy.burn--;
        if (--enemy.burnPulseIn === 0) {
          enemy.burnPulseIn = 12;
          this.damage(
            enemy,
            enemy.burnDamage,
            "#a3e635",
            {
              piercing: enemy.burnPierces,
            },
            enemy.burnTower,
          );
        }
        if (!enemy.burn) {
          enemy.burnDamage = 0;
          enemy.burnPierces = false;
          enemy.burnTower = null;
        }
        if (enemy.hp <= 0) continue;
      }
      if (enemy.supportNode) continue;
      if (this.time % 12 === 0 && enemy.remaining > 0 &&
          !activeTowers.some((tower) => tower.type !== "eco" &&
            (Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= tower.range ||
              (links.has(tower) && onLink(enemy, tower, links.get(tower)))))) {
        enemy.coverageGaps ||= [];
        enemy.coverageGaps[enemy.wp] = (enemy.coverageGaps[enemy.wp] || 0) + 1;
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
      if (enemy.anchor?.until > this.time) {
        const dx = enemy.anchor.x - enemy.x;
        const dy = enemy.anchor.y - enemy.y;
        const distance = Math.hypot(dx, dy);
        const advance = Math.min(distance, 0.72);
        if (distance > 0) {
          enemy.x += dx / distance * advance;
          enemy.y += dy / distance * advance;
          enemy.remaining = enemy.path.remaining[enemy.wp] + Math.hypot(x - enemy.x, y - enemy.y);
          if (!enemy.anchor.counted && enemy.anchor.outside.some(t => this.towers.includes(t) && !this.towerOffline(t) &&
              Math.hypot(t.x - enemy.x, t.y - enemy.y) <= t.range)) {
            enemy.anchor.counted = true;
            this.heroReport.pulled++;
          }
        }
        continue;
      }
      const dx = x - enemy.x,
        dy = y - enemy.y;
      const distance = Math.hypot(dx, dy);
      const sprint = enemy.variant === "scout" && this.time >= enemy.scoutReady;
      const advance = Math.min(distance, enemy.speed * enemy.slowFactor * (sprint ? 1.35 : 1));
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
        if (defense?.hp > 0 && enemy.wp === defense.waypoint + 1 && enemy.lane === defense.lane) {
          defense.hp--;
          if (!defense.hp && this.breachEnemy == null) this.breachEnemy = enemy.encounterId;
          this.waveObjectiveHits.count++;
          this.recordPassage(this.waveObjectiveHits, enemy);
        }
        if (enemy.wp === points.length) {
          enemy.escaped = true;
          const loss = Math.min(this.hp, enemy.coolingBoss ? 18 : enemy.boss ? 30 : 10);
          this.hp -= loss;
          if (loss && !this.hp && this.breachEnemy == null) this.breachEnemy = enemy.encounterId;
          this.recordLeak(enemy, loss);
        }
      } else {
        enemy.x += (dx / distance) * advance;
        enemy.y += (dy / distance) * advance;
      }
    }
    if ((!this.ranked || this.fixedLayout) && (this.time % 10 === 0 || this.breachEnemy != null)) {
      this.replay.push({
        tick: this.time,
        hero: this.hero && [this.hero.x, this.hero.y],
        towers: this.towers.filter(t => t.range && !this.towerOffline(t)).map(t => [t.x, t.y, t.range]),
        enemies: this.enemies.filter(e => e.hp > 0).map(e => [e.x, e.y, e.encounterId]),
      });
      if (this.replay.length > 31) this.replay.shift();
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0 && !e.escaped);
    if (this.focusTarget?.escaped || this.focusTarget?.hp <= 0) this.focusTarget = null;
    if (this.hp === 0 || this.console?.hp === 0 || terminal?.hp === 0) {
      this.state = "lost";
      return;
    }

    for (const [tower, partner] of links) {
      if (tower.linkReady > this.time) continue;
      const hits = this.enemies.filter((enemy) => enemy.hp > 0 && onLink(enemy, tower, partner)).slice(0, 3);
      if (!hits.length) continue;
      tower.linkReady = this.time + 48;
      this.effect(tower.x, tower.y, "#e0b0ff", 0, partner);
      for (const enemy of hits) this.damage(enemy, Math.round(tower.damage * this.padBonus(tower) * 0.55), tower.color, tower.branch, tower);
    }
    const committed = new Map();
    if (!this.daily) for (const shot of this.shots) reserveImpact(committed, shot, this.time);
    for (let index = 0; index < this.towers.length + Number(!!this.hero); index++) {
      const tower = this.towers[index] || this.hero;
      if (tower.rank && this.towerOffline(tower)) continue;
      tower.cooldown -= this.combo >= 5 ? 1.28 : 1;
      if (tower.cooldown > 0) continue;
      if (tower.type === "eco") {
        // Reactor output stops in the build phase and when no threats remain.
        if (this.enemies.length || this.queue.length) {
          const output = reactorOutput(tower.rank, tower.branch);
          tower.produced += output;
          if (tower.relayUntil > this.time) this.heroReport.reactor += output;
          this.addATP(output);
          this.waveStart.reactor += output;
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
      let bestFocus = 0;
      for (const enemy of this.enemies) {
        const pending = committed.get(enemy) || enemy;
        if (pending.hp <= 0) continue;
        if (Math.hypot(enemy.x - tower.x, enemy.y - tower.y) > tower.range)
          continue;
        const priority =
          tower.targeting === "strong"
            ? pending.hp + pending.shield
            : tower.targeting === "last"
              ? enemy.remaining
              : -enemy.remaining;
        const focus = tower.rank && enemy === this.focusTarget ? 3
          : (tower.targeting === "support" && enemy.supportNode) ||
          (tower.targeting === "escort" && enemy.variant === "escort") ||
          (tower.targeting === "objective" && defense && enemy.lane === defense.lane && enemy.wp <= defense.waypoint) ||
          (tower.targeting === "weakness" && this.fixedLayout && towerMultiplier(enemy, tower) > 1) ? 2
          : tower.rank && enemy.markedUntil > this.time ? 1 : 0;
        if (focus > bestFocus || (focus === bestFocus && priority > best)) {
          target = enemy;
          best = priority;
          bestFocus = focus;
        }
      }
      if (!target) continue;
      if (tower.relayUntil > this.time) {
        const counts = this.heroReport.relays;
        counts[tower.name] = (counts[tower.name] || 0) + 1;
      }
      const lens = this.lens(this.wave);
      const aligned = tower.id === "sniper" && lens?.lane === target.lane && lens.segments.includes(target.wp);
      tower.cooldown = tower.fireRate;
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      const shot = {
        x: tower.x,
        y: tower.y,
        target,
        tower,
        damage: Math.round(tower.damage * this.padBonus(tower) * (aligned ? 1.75 : 1)),
        type: tower.type,
        color: tower.color,
        branch: tower.branch || {},
        radius: tower.branch?.radius || (tower.id === "uv" ? 73 : 57),
      };
      tower.firedAt = this.time;
      this.shots.push(shot);
      if (!this.daily) reserveImpact(committed, shot, this.time);
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
    if (this.focusTarget?.hp <= 0) this.focusTarget = null;
    if (!this.enemies.length && !this.queue.length && !this.mirrorOrders.length) {
      this.finishMissionObjectives();
      if (this.hero?.destination) Object.assign(this.hero, {
        ...this.hero.destination, destination: null,
      });
      this.shots = [];
      const reserve = this.daily ? 0 : this.waveStart.count * 3;
      const recovery = this.daily ? 0 : Math.min(18, this.waveLeaks.lanes.reduce((a, b) => a + b, 0) * 3);
      const payout = 25 + 5 * this.wave + (this.daily ? 0 : Math.max(0, this.level - 4) * 4);
      const generated = this.grossATP - this.waveStart.atp;
      this.addATP(payout + reserve + recovery);
      this.charge = Math.min(100, this.charge + 20);
      let largestGap = null;
      for (const gap of this.waveLeaks.gaps.values()) {
        if (gap.count > (largestGap?.count || 0)) largestGap = gap;
      }
      const gap = largestGap && {
        lane: largestGap.lane,
        count: largestGap.count,
        points: this.routes[largestGap.lane].points.slice(largestGap.waypoint - 1, largestGap.waypoint + 1),
      };
      this.debrief = {
        heroImpact: this.heroImpact(),
        kills: this.kills - this.waveStart.kills,
        damage: this.waveStart.hp - this.hp,
        atp: this.grossATP - this.waveStart.atp,
        reserve,
        recovery,
        payout,
        reactor: this.waveStart.reactor,
        bounties: generated - this.waveStart.reactor,
        corrosionDamage: Math.round(this.waveStart.corrosionDamage),
        chillDamage: Math.round(this.waveStart.chillDamage),
        leaks: [...this.waveLeaks.lanes],
        worst: this.waveLeaks.worst,
        gap,
      };
      this.state = this.wave === this.maxWaves ? "won" : "build";
    }
  }
}
