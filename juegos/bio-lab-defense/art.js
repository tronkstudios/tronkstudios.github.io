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
  blob: ["M-22 4Q-21-9-10-12Q-7-20 3-15Q10-18 16-8Q27-5 20 5Q25 15 12 14Q4 22-6 15Q-18 17-22 4Z", [-10, 4], [2, -4], [12, 4]],
  hex: ["M-21 0L-11-16H9L21 0L9 16H-11Z", [-12, 0], [0, -8], [10, 0], [0, 8]],
  prion: ["M-22-3L-12-12L-1-7L9-17L22-7L14 4L21 12L9 17L0 9L-13 16L-22 9L-15 3Z", [-14, -4], [4, -7], [12, 7]],
  superbug: ["M-21-6L-14-13H-6L-2-16H8L13-12H19L24-6V6L19 12H13L8 16H-2L-6 13H-14L-21 6Z", [-13, 0], [0, 0], [13, 0]],
  corona: ["M-24-3L-17-5L-20-13L-13-13L-11-20L-4-17L0-24L5-17L12-20L13-13L21-14L18-6L25-3L20 3L24 9L16 10L16 17L9 15L4 23L0 17L-7 21L-9 14L-15 17L-16 9L-23 8L-19 2Z", [-9, -5], [7, -7], [7, 8], [-7, 8], [0, 0]],
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
  const shape = enemy.coolingBoss === "runner"
    ? enemy.shape
    : enemyModels[enemy.id] ? enemy.id : enemy.shape;
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
    if (shape === "rod" || shape === "superbug") {
      line(art, "M-12-6V6 M-3-7V7 M6-7V7 M14-5V5", "#20143383", 2);
    }
    for (const [x, y] of nodes) {
      glow(art, x, y, enemy.boss ? 4.2 : 3.6, "#281938");
      glow(art, x - 1, y - 1, 1.7, "#fff0d0");
    }
  });
  const width = enemy.boss ? size * 1.1 : size * 0.76;
  ctx.drawImage(model, -width / 2, -width / 2, width, width);
}

const heroModels = {
  iris: ["M-12-8L-16-2V9L-9 15H8L13 8V-5L8-12H-7Z", "M-17 6L-9 0 M11 2L20-6V-11 M-5 5H6"],
  mara: ["M-15-8L-20 0L-13 13H13L20 0L15-8L8-13H-8Z", "M-17 0L-10 6 M17 0L10 6 M-7 6H7 M0 1V11"],
  ivo: ["M-14-10L-19-4V7L-12 14H12L19 7V-4L14-10L5-14H-5Z", "M-19-4L-23-10 M19-4L23-10 M-12 7L-6 3L0 8L6 3L12 7"],
  vega: ["M-17-9L-13-13H13L17-9L22 3L14 15H-14L-22 3Z", "M-19 3L-11 8 M19 3L11 8 M-7 6L0 11L7 6"],
};

function heroModel(hero) {
  return sprite(`hero:${hero.id}`, (ctx) => {
    const [armor, trim] = heroModels[hero.id];
    paint(ctx, "M0-29L27-12V13L0 29L-27 13V-12Z", "#102135", hero.color, 2);
    const metal = ctx.createLinearGradient(0, -16, 0, 17);
    metal.addColorStop(0, "#8197aa");
    metal.addColorStop(0.55, "#354e68");
    metal.addColorStop(1, "#192535");
    paint(ctx, armor, metal, "#08111d", 2.5);
    paint(ctx, "M-10-9L-7-16H7L10-9L8 0L4 4H-4L-8 0Z", "#283f56", "#091523", 2);
    line(ctx, "M-6-7H6", hero.color, 3.5);
    line(ctx, trim, hero.color, 2);
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
