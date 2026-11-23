// Sprites are rasterized once. The board and tower selector share the same models.
const size = 76;
const sprites = new Map();

const towerModels = {
  nanolaser: ["M-14-9H8L14-5H29V5H14L8 9H-14Z", "M-7 0H25 M15-4V4"],
  cryo: ["M-13-11H8L20-14H25V-6L14-3V3L25 6V14H20L8 11H-13Z", "M-6 0H8 M14-7L22-10 M14 7L22 10"],
  phagocyte: ["M-16-8L-7-14H6L15-10L25-11L27-5L18 0L27 5L25 11L15 10L6 14H-7L-16 8Z", "M-10-6H7L14-4 M-10 6H7L14 4 M-6 0H12"],
  plasma: ["M-13-10L-5-15H12L23-11L27-5V5L23 11L12 15H-5L-13 10Z", "M14-10L19-6V6L14 10 M23-5V5 M-8 0H10"],
  toxin: ["M-12-14H4L17-8L28-4V4L17 8L4 14H-12L-16 8V-8Z", "M-9-8H3L10-4 M-9 8H3L10 4 M15 0H25"],
  tesla: ["M-12-11L-4-16H10L15-10H24L27-6L23-2L15-5V5L23 2L27 6L24 10H15L10 16H-4L-12 11Z", "M-8 2L-1-5L4 4L12-3 M24-6V6"],
  sniper: ["M-16-6L-6-11H11L16-4H34V4H16L11 11H-6L-16 6Z", "M-10 0H31 M18-4V4 M23-4V4"],
  ribosome: ["M-16-10L-10-16H10L16-10V10L10 16H-10L-16 10Z", "M-11-4H-7V-10 M11-4H7V-10 M-11 4H-7V10 M11 4H7V10"],
  magnet: ["M-15-9L-8-15H13L25-12V-6H12L6 0L12 6H25V12L13 15H-8L-15 9Z", "M14-10H22 M14 10H22 M-9 0H2"],
  uv: ["M-13-10L-6-14H11L23-18L27-12V12L23 18L11 14H-6L-13 10Z", "M17-11V11 M22-13V13 M-9 0H10"],
  interferon: ["M-16-10L-9-15H5L17-9L27-2V2L17 9L5 15H-9L-16 10Z", "M-9-8L8 0L-9 8 M12-5L23 0L12 5"],
  omega: ["M-15-12L-5-18L8-15L16-11L27-14L31-7L23 0L31 7L27 14L16 11L8 15L-5 18L-15 12Z", "M-10-8L2-13L14-6 M-10 8L2 13L14 6 M20 0H26"],
};

const enemyModels = {
  diplo: ["M-4-12C3-16 13-11 16-3C20 7 12 13 4 10C0 16-12 14-16 6C-22-4-15-13-4-12Z", [-7, 5], [8, -3]],
  rod: ["M-16-9H9C24-9 24 9 9 9H-16C-24 9-24-9-16-9Z", [-11, 0], [0, 1], [11, -1]],
  spiral: ["M-23 3C-16-19-10-18-2-2S9 13 17-9L24-5C18 17 10 21 1 6S-11-11-16 9Z", [-15, -5], [3, 7], [17, 0]],
  phage: ["M-19-6L-10-15H2L9-7L14-4L23-12L24-8L17 0L24 8L23 12L14 4L9 7L2 15H-10L-19 6Z", [-7, 0], [12, 0]],
  cluster: ["M-20-2Q-22-10-12-13Q-7-20 0-15Q7-20 12-13Q22-11 20-2Q25 5 16 11Q11 18 3 14Q-5 21-12 14Q-21 12-20 5Z", [-13, 0], [-5, -8], [-3, 7], [7, -5], [12, 6]],
  lactobacillus: ["M-25-3L-19-10H-4L2-6H17Q26-6 26 1Q26 9 17 9H1L-5 5H-19Q-25 5-25-3Z", [-16,-3], [-7,-2], [5,1], [16,2]],
  hex: ["M-21 0L-11-16H9L21 0L9 16H-11Z", [-12,0], [0,-8], [10,0], [0,8]],
  rhinovirus: ["M-20-6L-13-16L0-19L12-15L20-5L18 8L8 17H-7L-18 8Z", [-12,-4], [0,-10], [12,-4], [8,8], [-8,8]],
  "e-coli": ["M-22-6Q-17-15-5-13L15-8Q24-4 23 5Q22 13 12 13L-12 9Q-22 6-22-6Z M15 6Q25 2 28-9Q32-15 34-12", [-13,-4], [0,0], [13,3]],
  norovirus: ["M0-19L12-17L13-12L21-7L16 0L20 9L12 13L8 19L0 15L-9 19L-12 12L-20 7L-16 0L-21-7L-13-12L-11-17Z", [-9,-7], [9,-7], [0,0], [-8,9], [8,9]],
  plague: ["M-24-6Q-23-16-11-17Q1-16 2-8Q5-1 0 6Q-5 15-16 12Q-24 10-24-6Z M4-5Q10-14 19-10Q29-6 26 5Q23 15 13 15Q3 13 4-5Z", [-17,-8], [-5,2], [12,-5], [20,6]],
  cholera: ["M-26 3Q-22-17-2-18Q18-19 23-6Q27 7 12 13Q4 15-1 8L3 3Q10 1 12-5Q3-11-10-5L-18 7Z M14 12Q28 9 30 21", [-17,-3], [-7,-10], [6,-11], [17,2]],
  influenza: ["M-25-5L-19-8L-21-16L-11-15L-8-24L0-17L8-23L11-15L20-18L20-9L27-5L21 2L26 9L17 12L15 21L7 16L0 23L-6 17L-15 20L-17 11L-25 9L-20 2Z", [-11,-8], [7,-10], [13,2], [-7,7], [4,12]],
  tuberculosis: ["M-26-5Q-22-17-11-16L19-2Q27 3 25 11Q20 20 10 17L-18 5Q-26 3-26-5Z", [-17,-6], [-9,-1], [0,3], [8,6], [17,12]],
  polio: ["M0-24L20-14L26 7L13 22H-13L-26 7L-20-14Z", [0,-14], [13,-7], [12,8], [0,14], [-12,8], [-13,-7]],
  smallpox: ["M-25-12Q-24-22-13-22H13Q25-22 25-11V12Q25 22 13 22H-13Q-25 22-25 11Z", [-15,-12], [15,-12], [-15,12], [15,12], [-7,0], [7,0]],
  measles: ["M-24-7Q-26-18-13-18L-6-24L0-18L9-24L15-17Q28-20 24-7L29 1L24 8Q26 21 13 18L7 24L0 19L-7 24L-13 18Q-26 21-24 8L-29 1Z", [-13,-9], [7,-11], [14,3], [-9,10], [5,13]],
  diphtheria: ["M-24-4Q-20-12-13-8L-1 4L11-18Q17-26 23-19Q27-14 17-3L4 14Q0 21-7 16L-22 4Q-26 1-24-4Z", [-16,-3], [-7,6], [0,10], [11,-5], [18,-15]],
};

function paint(ctx, outline, fill, stroke, width = 1) {
  const path = new Path2D(outline);
  ctx.fillStyle = fill;
  ctx.fill(path);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke(path);
}

function line(ctx, path, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke(new Path2D(path));
}

function glow(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function sprite(key, draw) {
  if (!sprites.has(key)) {
    const surface = document.createElement("canvas");
    surface.width = surface.height = size * 2;
    const ctx = surface.getContext("2d");
    ctx.scale(2, 2);
    ctx.translate(size / 2, size / 2);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    draw(ctx);
    sprites.set(key, surface);
  }
  return sprites.get(key);
}

function turretModel(tower) {
  return sprite(`tower:${tower.id}`, (ctx) => {
    const [body, wires] = towerModels[tower.id];
    const plate = ctx.createLinearGradient(0, -18, 0, 20);
    plate.addColorStop(0, "#405c70");
    plate.addColorStop(1, "#13202d");
    paint(ctx, "M-13-20H13L20-13V13L13 20H-13L-20 13V-13Z", plate, "#061018", 3);
    for (const y of [-16, 16]) {
      line(ctx, `M-10 ${y}H10`, tower.color + "91", 2);
      for (const x of [-13, 13]) glow(ctx, x, y * 0.78, 2, "#8197a3");
    }
    const chassis = ctx.createLinearGradient(0, -15, 0, 16);
    chassis.addColorStop(0, "#879baa");
    chassis.addColorStop(0.34, "#334956");
    chassis.addColorStop(1, "#101926");
    paint(ctx, body, chassis, "#060d17", 3);
    line(ctx, wires, "#061321", 4);
    line(ctx, wires, tower.color, 1.9);
    glow(ctx, -3, 0, 6, "#0a1422");
    glow(ctx, -3, 0, 4, tower.color);
    glow(ctx, -4, -1, 1.6, "#edfcff");
  });
}

export function towerIcon(tower) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 72;
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "tower-art";
  canvas.getContext("2d").drawImage(turretModel(tower), -11, -11, 94, 94);
  return canvas;
}

export function drawTurretModel(ctx, tower) {
  ctx.drawImage(turretModel(tower), -size / 2, -size / 2, size, size);
}

export function drawEnemyModel(ctx, enemy) {
  const shape = enemy.shape;
  const key = `enemy:${shape}:${enemy.color}:${enemy.coolingBoss || !!enemy.boss}`;
  const model = sprite(key, (art) => {
    const [outline, ...nodes] = enemyModels[shape];
    if (enemy.boss) {
      const armor = enemy.coolingBoss === "runner"
        ? "M-28 0L-13-16L6-12L28-21L20 0L28 21L6 12L-13 16Z"
        : "M-24-12L-12-24L10-24L25-12V12L10 24H-12L-24 12Z";
      paint(art, armor, "#151737", enemy.color, 2);
      line(art, "M-13-18L-19-9 M-13 18L-19 9 M8-17L16-12 M8 17L16 12", "#ffe9b3", 2);
    }
    const membrane = art.createRadialGradient(-8, -9, 2, 0, 0, 26);
    membrane.addColorStop(0, "#fff4df");
    membrane.addColorStop(0.4, enemy.color);
    membrane.addColorStop(1, "#1b1130");
    paint(art, outline, membrane, "#0c1020", 3);
    line(art, outline, enemy.color, 1.35);
    if (["rod", "e-coli", "lactobacillus"].includes(shape)) {
      line(art, "M-12-6V6 M-3-7V7 M6-7V7 M14-5V5", "#20143383", 2);
    }
    if (shape === "smallpox") {
      paint(art, "M-12-11Q0-7 12-11V11Q0 6-12 11Z", "#321737", "#ffd3e3", 1.8);
      line(art, "M-6-7V7 M0-5V5 M6-7V7", "#ed91bc", 1.5);
    }
    if (shape === "polio")
      line(art, "M0-24L0 0L20-14 M0 0L26 7 M0 0L13 22 M0 0L-13 22 M0 0L-26 7 M0 0L-20-14", "#523667", 2);
    for (const [x, y] of nodes) {
      glow(art, x, y, enemy.boss ? 4.2 : 3.6, "#281938");
      glow(art, x - 1, y - 1, 1.7, "#fff0d0");
    }
  });
  const width = enemy.boss ? size * 1.1 : size * 0.76;
  ctx.drawImage(model, -width / 2, -width / 2, width, width);
}

const botModels = {
  iris: {
    chassis: "M-24-12H-12L-6-6H7L15-22L29 0L15 22L7 6H-6L-12 12H-24L-30 5V-5Z",
    circuits: "M-22-7L-17-2H-8 M-22 7L-17 2H-8 M12-8L18-13L24 0L18 13L12 8",
    ports: [[-22, -6], [-22, 6], [21, 0]],
  },
  mara: {
    chassis: "M-7-29H7V-17L13-12L24-17L30-7L19-1V1L30 7L24 17L13 12L7 17V29H-7V17L-13 12L-24 17L-30 7L-19 1V-1L-30-7L-24-17L-13-12L-7-17Z",
    circuits: "M0-23V-11 M0 11V23 M-24-10L-11-4 M11 4L24 10 M-24 10L-11 4 M11-4L24-10",
    ports: [[0, -23], [0, 23], [-22, -10], [22, 10], [-22, 10], [22, -10]],
  },
  ivo: {
    chassis: "M-9-27H9V-18L18-12V-17H29V17H18V12L9 18V27H-9V18L-18 12V17H-29V-17H-18V-12L-9-18Z",
    circuits: "M-24-10V10 M-19-9V9 M19-9V9 M24-10V10 M0-20V-10 M0 10V20",
    ports: [[-24, 0], [24, 0], [0, -20], [0, 20]],
  },
  vega: {
    chassis: "M-11-28H11L15-19L25-17L31-7L25 0L31 7L25 17L15 19L11 28H-11L-15 19L-25 17L-31 7L-25 0L-31-7L-25-17L-15-19Z",
    circuits: "M-9-21H9 M-9 21H9 M-24-9L-14-5 M14-5L24-9 M-24 9L-14 5 M14 5L24 9",
    ports: [[0, -21], [0, 21], [-22, -9], [22, -9], [-22, 9], [22, 9]],
  },
};

function heroModel(hero) {
  return sprite(`bot:${hero.id}`, (ctx) => {
    const { chassis, circuits, ports } = botModels[hero.id];
    const metal = ctx.createLinearGradient(0, -28, 0, 28);
    metal.addColorStop(0, "#88a4b6");
    metal.addColorStop(0.45, "#3b5367");
    metal.addColorStop(1, "#122435");
    paint(ctx, chassis, metal, "#08111d", 5);
    line(ctx, chassis, hero.color, 1.5);
    line(ctx, circuits, "#07141f", 5);
    line(ctx, circuits, hero.color, 2);
    for (const [x, y] of ports) {
      glow(ctx, x, y, 3.8, "#07141f");
      glow(ctx, x, y, 2.2, hero.color);
    }
    const reactor = ctx.createRadialGradient(-2, -2, 0, 0, 0, 9);
    reactor.addColorStop(0, "#f0fbff");
    reactor.addColorStop(0.35, hero.color);
    reactor.addColorStop(1, "#142835");
    glow(ctx, 0, 0, 12, "#07141f");
    glow(ctx, 0, 0, 9, reactor);
  });
}

export function heroIcon(hero) {
  const icon = document.createElement("canvas");
  icon.width = icon.height = 76;
  icon.className = "hero-art";
  icon.setAttribute("aria-hidden", "true");
  icon.getContext("2d").drawImage(heroModel(hero), 0, 0, 76, 76);
  return icon;
}

export function drawHeroModel(ctx, hero) {
  ctx.drawImage(heroModel(hero), -31, -31, 62, 62);
}
