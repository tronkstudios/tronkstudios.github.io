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

export const SECTORS = [
  "Ingreso",
  "Muestreo",
  "Depósito",
  "Conductos",
  "Filtrado",
  "Refrigeración",
  "Cámara fría",
  "Sellado",
  "Cámara central",
  "Protocolo final",
];
export const WIDTH = 900;
export const HEIGHT = 540;

function segmentDistance(x, y, [ax, ay], [bx, by]) {
  const dx = bx - ax,
    dy = by - ay;
  const f = Math.max(
    0,
    Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(x - ax - f * dx, y - ay - f * dy);
}

export function upgradeCost(tower) {
  return Math.ceil(tower.cost * (tower.rank === 1 ? 0.7 : 1.05));
}

export class Match {
  constructor(level) {
    this.level = level;
    this.map = MAPS[Math.floor((level - 1) / 4)];
    this.hp = 100;
    this.atp = 180 + level * 12;
    this.wave = 0;
    this.maxWaves = level < 4 ? 4 : level < 8 ? 5 : 6;
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
  }

  checkPlacement(type, x, y) {
    if (!type || !["build", "wave"].includes(this.state))
      return "La partida está detenida.";
    if (type.unlock > this.level)
      return "Esta torre se habilita en otro sector.";
    if (x < 24 || x > WIDTH - 24 || y < 24 || y > HEIGHT - 24)
      return "Acércate al interior del tablero.";
    const points = this.map.points;
    if (
      points
        .slice(1)
        .some((point, i) => segmentDistance(x, y, points[i], point) < 39)
    )
      return "Deja despejado el conducto.";
    if (this.towers.some((t) => Math.hypot(t.x - x, t.y - y) < 40))
      return "Hay otra torre demasiado cerca.";
    return this.atp < type.cost ? "ATP insuficiente." : "";
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
    };
    this.towers.push(tower);
    this.effect(x, y, type.color, 32);
    return tower;
  }

  upgrade(tower) {
    const cost = upgradeCost(tower);
    if (!this.towers.includes(tower) || tower.rank >= 3 || this.atp < cost)
      return false;
    this.atp -= cost;
    tower.paid += cost;
    tower.rank++;
    tower.damage = Math.round(tower.damage * 1.42);
    if (tower.range) tower.range += 13;
    tower.fireRate *= 0.92;
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
    const count = 5 + this.wave * 2 + Math.floor(this.level * 0.75);
    const pool = Math.min(
      PATHOGEN_TYPES.length - 1,
      1 + Math.floor((this.wave + this.level) / 2),
    );
    for (let n = 0; n < count; n++)
      this.queue.push(PATHOGEN_TYPES[(n * 7 + this.wave + this.level) % pool]);
    if (this.wave === this.maxWaves)
      this.queue.push(
        PATHOGEN_TYPES[this.level >= 8 ? 9 : this.level >= 4 ? 8 : 5],
      );
    this.spawnIn = 12;
    return true;
  }

  effect(x, y, color, radius, to = null) {
    this.effects.push({ x, y, color, radius, to, life: 22 });
  }

  spawn() {
    const boss = this.queue.length === 1 && this.wave === this.maxWaves;
    const spec = this.queue.shift();
    const scale = 0.96 + (this.wave - 1) * 0.12 + (this.level - 1) * 0.105;
    const hp = Math.round(spec.hp * scale);
    const [[x, y]] = this.map.points;
    this.enemies.push({
      ...spec,
      x,
      y,
      boss,
      hp,
      maxHp: hp,
      wp: 1,
      progress: 0,
      slow: 0,
      burn: 0,
      angle: 0,
    });
  }

  damage(enemy, amount, color) {
    if (enemy.hp <= 0) return;
    enemy.hp -= amount;
    if (enemy.hp > 0) return;
    this.kills++;
    this.combo = Math.min(10, this.combo + 1);
    this.comboTime = 210;
    this.atp += Math.round(enemy.reward * (this.combo >= 5 ? 1.25 : 1));
    this.effect(enemy.x, enemy.y, color, enemy.boss ? 56 : 27);
  }

  hit(enemy, shot) {
    this.damage(enemy, shot.damage, shot.color);
    if (shot.type === "slow") enemy.slow = Math.max(enemy.slow, 95);
    if (shot.type === "dot") {
      enemy.burn = 130;
      enemy.burnDamage = Math.max(enemy.burnDamage || 0, shot.damage * 0.115);
    }
    if (shot.type === "splash") {
      const radius = shot.radius;
      this.effect(enemy.x, enemy.y, shot.color, radius);
      for (const nearby of this.enemies) {
        if (
          nearby !== enemy &&
          Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) < radius
        ) {
          this.damage(nearby, Math.round(shot.damage * 0.62), shot.color);
        }
      }
    }
    if (shot.type === "chain") {
      let previous = enemy;
      const hit = new Set([enemy]);
      for (let i = 1; i <= 2; i++) {
        const next = this.enemies.find(
          (e) =>
            e.hp > 0 &&
            !hit.has(e) &&
            Math.hypot(e.x - previous.x, e.y - previous.y) < 74,
        );
        if (!next) break;
        this.effect(previous.x, previous.y, shot.color, 0, {
          x: next.x,
          y: next.y,
        });
        this.damage(next, Math.round(shot.damage * 0.65 ** i), shot.color);
        hit.add(next);
        previous = next;
      }
    }
  }

  tick() {
    this.time++;
    for (const effect of this.effects) effect.life--;
    this.effects = this.effects.filter((e) => e.life > 0);
    if (this.state !== "wave") return;
    if (this.comboTime > 0 && --this.comboTime === 0) this.combo = 0;
    if (this.queue.length && --this.spawnIn <= 0) {
      this.spawn();
      this.spawnIn = Math.max(
        20,
        48 - this.wave * 3 - Math.floor(this.level / 2),
      );
    }
    const points = this.map.points;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      if (enemy.burn > 0) {
        enemy.burn--;
        if (enemy.burn % 12 === 0)
          this.damage(enemy, enemy.burnDamage, "#a3e635");
        if (enemy.hp <= 0) continue;
      }
      const [x, y] = points[enemy.wp];
      const dx = x - enemy.x,
        dy = y - enemy.y;
      const distance = Math.hypot(dx, dy);
      const advance = Math.min(
        distance,
        enemy.speed * (enemy.slow > 0 ? (enemy.boss ? 0.76 : 0.52) : 1),
      );
      if (enemy.slow > 0) enemy.slow--;
      enemy.angle = Math.atan2(dy, dx);
      enemy.progress += advance;
      if (advance >= distance) {
        enemy.x = x;
        enemy.y = y;
        if (++enemy.wp === points.length) {
          enemy.escaped = true;
          this.hp = Math.max(0, this.hp - (enemy.boss ? 30 : 10));
        }
      } else {
        enemy.x += (dx / distance) * advance;
        enemy.y += (dy / distance) * advance;
      }
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0 && !e.escaped);
    if (this.hp === 0) {
      this.state = "lost";
      return;
    }

    for (const tower of this.towers) {
      tower.cooldown -= this.combo >= 5 ? 1.28 : 1;
      if (tower.cooldown > 0) continue;
      if (tower.type === "eco") {
        // Reactor output stops in the build phase and when no threats remain.
        if (this.enemies.length || this.queue.length) {
          this.atp += 9 + 4 * tower.rank;
          tower.cooldown = tower.fireRate;
          this.effect(tower.x, tower.y, tower.color, 29);
        }
        continue;
      }
      let target;
      for (const enemy of this.enemies) {
        if (
          (!target || enemy.progress > target.progress) &&
          Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= tower.range
        )
          target = enemy;
      }
      if (!target) continue;
      tower.cooldown = tower.fireRate;
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      this.shots.push({
        x: tower.x,
        y: tower.y,
        target,
        damage: tower.damage,
        type: tower.type,
        color: tower.color,
        radius: tower.id === "uv" ? 73 : 57,
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
    if (!this.enemies.length && !this.queue.length) {
      this.shots = [];
      this.atp += 24 + 4 * this.wave;
      this.state = this.wave === this.maxWaves ? "won" : "build";
    }
  }
}
