"use strict";

/* TronkStudios · js/games/protect-mogos.js
   Minijuego Protect Mogos.
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   PROTECT MOGOS - DIBUJOS (bolas ninja, rey, árboles, castillo)
   Están fuera del juego para poder reutilizarlos (por ejemplo,
   para la imagen de la tarjeta).
   ========================================================= */

const ANTININJA_TAU = Math.PI * 2;

function antininjaRandom(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function antininjaEllipse(g, x, y, rx, ry) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, ANTININJA_TAU);
  g.fill();
}

function antininjaRoundRect(g, x, y, w, h, r) {
  g.beginPath();

  if (typeof g.roundRect === "function") {
    g.roundRect(x, y, w, h, r);
  } else {
    g.rect(x, y, w, h);
  }
}

/*
 * Ninja bola clásico: bola negra, rendija de la cara con los
 * ojos y cinta en la cabeza con las colas del nudo al viento.
 *  - normal:  cinta roja (1 clic)
 *  - flipper: cinta morada (1 voltereta hacia delante, 2 clics)
 *  - tank:    cinta dorada y armadura (2 clics)
 */
function drawNinjaBall(g, x, y, r, opts = {}) {
  const type = opts.type || "normal";
  const time = opts.time || 0;
  const run = opts.run !== false;

  const band =
    type === "flipper" ? "#9b3fd1" : type === "tank" ? "#f2b90f" : "#e0262b";

  const light = type === "tank" ? "#8c93a3" : "#4a5064";
  const mid = type === "tank" ? "#4b515e" : "#252936";
  const dark = type === "tank" ? "#23262e" : "#0c0e15";

  g.save();
  g.translate(x, y);

  // Sombra en el césped.
  g.fillStyle = "rgba(0,0,0,.22)";
  antininjaEllipse(g, 0, r * 0.98, r * 0.85, r * 0.22);

  g.rotate(opts.rotation || 0);

  // Pies corriendo.
  const step = run ? Math.sin(time * 0.02) * r * 0.2 : 0;
  g.fillStyle = dark;
  antininjaEllipse(g, -r * 0.42, r * 0.86 + step, r * 0.27, r * 0.17);
  antininjaEllipse(g, r * 0.42, r * 0.86 - step, r * 0.27, r * 0.17);

  // Colas de la cinta ondeando.
  const wave = Math.sin(time * 0.012) * r * 0.12;
  g.strokeStyle = band;
  g.lineCap = "round";
  g.lineWidth = r * 0.17;
  g.beginPath();
  g.moveTo(r * 0.7, -r * 0.5);
  g.quadraticCurveTo(r * 1.1, -r * 0.8 + wave, r * 1.45, -r * 0.62 - wave);
  g.moveTo(r * 0.7, -r * 0.5);
  g.quadraticCurveTo(r * 1.05, -r * 0.45 - wave, r * 1.38, -r * 0.2 + wave);
  g.stroke();

  // Cuerpo (la bola).
  const body = g.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r);
  body.addColorStop(0, light);
  body.addColorStop(0.45, mid);
  body.addColorStop(1, dark);
  g.fillStyle = body;
  g.beginPath();
  g.arc(0, 0, r, 0, ANTININJA_TAU);
  g.fill();

  // Cinta de la cabeza (recortada a la bola).
  g.save();
  g.beginPath();
  g.arc(0, 0, r, 0, ANTININJA_TAU);
  g.clip();
  g.fillStyle = band;
  g.fillRect(-r, -r * 0.68, r * 2, r * 0.22);

  if (type === "tank") {
    // Placa metálica en la frente.
    g.fillStyle = "#c9ced8";
    antininjaRoundRect(g, -r * 0.28, -r * 0.72, r * 0.56, r * 0.3, r * 0.06);
    g.fill();
    g.strokeStyle = "#6d7380";
    g.lineWidth = Math.max(1, r * 0.05);
    g.stroke();
  }

  g.restore();

  // Nudo.
  g.fillStyle = band;
  g.beginPath();
  g.arc(r * 0.74, -r * 0.52, r * 0.13, 0, ANTININJA_TAU);
  g.fill();

  // Rendija de la cara.
  g.fillStyle = "#f2c79d";
  antininjaRoundRect(g, -r * 0.66, -r * 0.34, r * 1.32, r * 0.44, r * 0.21);
  g.fill();

  // Ojos.
  const hurt = opts.hurt;

  if (hurt) {
    g.strokeStyle = "#111";
    g.lineWidth = Math.max(1.2, r * 0.07);

    for (const ex of [-0.27, 0.27]) {
      g.beginPath();
      g.moveTo(r * (ex - 0.1), -r * 0.2);
      g.lineTo(r * (ex + 0.1), -r * 0.0);
      g.moveTo(r * (ex + 0.1), -r * 0.2);
      g.lineTo(r * (ex - 0.1), -r * 0.0);
      g.stroke();
    }
  } else {
    g.fillStyle = "#fff";
    antininjaEllipse(g, -r * 0.27, -r * 0.1, r * 0.14, r * 0.12);
    antininjaEllipse(g, r * 0.27, -r * 0.1, r * 0.14, r * 0.12);

    g.fillStyle = "#111";
    antininjaEllipse(g, -r * 0.25, -r * 0.06, r * 0.065, r * 0.075);
    antininjaEllipse(g, r * 0.25, -r * 0.06, r * 0.065, r * 0.075);

    // Cejas enfadadas.
    g.strokeStyle = "#111";
    g.lineWidth = Math.max(1.2, r * 0.07);
    g.beginPath();
    g.moveTo(-r * 0.44, -r * 0.3);
    g.lineTo(-r * 0.12, -r * 0.2);
    g.moveTo(r * 0.44, -r * 0.3);
    g.lineTo(r * 0.12, -r * 0.2);
    g.stroke();
  }

  // Grietas cuando al ninja de 2 clics ya le has dado una vez.
  if (opts.damaged) {
    g.strokeStyle = "rgba(255,255,255,.75)";
    g.lineWidth = Math.max(1, r * 0.05);
    g.beginPath();
    g.moveTo(-r * 0.5, r * 0.3);
    g.lineTo(-r * 0.25, r * 0.45);
    g.lineTo(-r * 0.32, r * 0.65);
    g.moveTo(r * 0.3, r * 0.25);
    g.lineTo(r * 0.5, r * 0.5);
    g.stroke();
  }

  // Destello blanco al recibir un golpe.
  if (opts.flash) {
    g.globalAlpha = opts.flash;
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(0, 0, r, 0, ANTININJA_TAU);
    g.fill();
    g.globalAlpha = 1;
  }

  g.restore();
}

/*
 * Rey bola con pelo rizado y corona.
 */
function drawKingBall(g, x, y, r, opts = {}) {
  const hurt = opts.hurt;
  const time = opts.time || 0;
  const bob = Math.sin(time * 0.004) * r * 0.04;

  g.save();
  g.translate(x, y + bob);

  // Capa roja con armiño.
  g.fillStyle = "#b3202a";
  antininjaEllipse(g, 0, r * 0.95, r * 1.15, r * 0.55);
  g.fillStyle = "#fff";
  antininjaEllipse(g, 0, r * 0.62, r * 0.95, r * 0.18);
  g.fillStyle = "#111";

  for (const dx of [-0.55, -0.2, 0.2, 0.55]) {
    antininjaEllipse(g, r * dx, r * 0.63, r * 0.035, r * 0.05);
  }

  // Pelo rizado (detrás de la cabeza).
  g.fillStyle = "#6b3a1c";

  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * 0.92 + (i / 12) * Math.PI * 1.16;
    antininjaEllipse(g, Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, r * 0.27, r * 0.27);
  }

  g.strokeStyle = "#4a2610";
  g.lineWidth = Math.max(1, r * 0.04);

  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * 0.92 + (i / 12) * Math.PI * 1.16;
    g.beginPath();
    g.arc(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, r * 0.13, 0, Math.PI * 1.4);
    g.stroke();
  }

  // Cara (la bola).
  const face = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  face.addColorStop(0, "#ffe0c2");
  face.addColorStop(1, "#e9a97a");
  g.fillStyle = face;
  g.beginPath();
  g.arc(0, 0, r, 0, ANTININJA_TAU);
  g.fill();

  // Rizos del flequillo.
  g.fillStyle = "#6b3a1c";

  for (const dx of [-0.55, -0.25, 0.05, 0.35, 0.62]) {
    antininjaEllipse(g, r * dx, -r * 0.78, r * 0.2, r * 0.17);
  }

  // Mofletes.
  g.fillStyle = "rgba(240,110,110,.45)";
  antininjaEllipse(g, -r * 0.52, r * 0.2, r * 0.16, r * 0.11);
  antininjaEllipse(g, r * 0.52, r * 0.2, r * 0.16, r * 0.11);

  g.fillStyle = "#1a1a1a";
  g.strokeStyle = "#1a1a1a";
  g.lineWidth = Math.max(1.2, r * 0.07);
  g.lineCap = "round";

  if (hurt) {
    // Ojos apretados y boca de susto.
    for (const ex of [-0.3, 0.3]) {
      g.beginPath();
      g.moveTo(r * (ex - 0.12), -r * 0.12);
      g.lineTo(r * (ex + 0.08), -r * 0.04);
      g.lineTo(r * (ex - 0.12), r * 0.04);
      g.stroke();
    }

    antininjaEllipse(g, 0, r * 0.38, r * 0.14, r * 0.17);

    g.fillStyle = "#6fc3ff";
    antininjaEllipse(g, r * 0.72, -r * 0.3, r * 0.08, r * 0.13);
  } else {
    antininjaEllipse(g, -r * 0.3, -r * 0.05, r * 0.08, r * 0.1);
    antininjaEllipse(g, r * 0.3, -r * 0.05, r * 0.08, r * 0.1);

    g.beginPath();
    g.arc(0, r * 0.2, r * 0.3, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
  }

  // Corona.
  g.fillStyle = "#f5c518";
  g.strokeStyle = "#a57d06";
  g.lineWidth = Math.max(1, r * 0.05);
  g.beginPath();
  g.moveTo(-r * 0.5, -r * 0.82);
  g.lineTo(-r * 0.55, -r * 1.35);
  g.lineTo(-r * 0.26, -r * 1.08);
  g.lineTo(0, -r * 1.45);
  g.lineTo(r * 0.26, -r * 1.08);
  g.lineTo(r * 0.55, -r * 1.35);
  g.lineTo(r * 0.5, -r * 0.82);
  g.closePath();
  g.fill();
  g.stroke();

  g.fillStyle = "#e53935";
  antininjaEllipse(g, 0, -r * 0.98, r * 0.08, r * 0.08);
  g.fillStyle = "#1e88e5";
  antininjaEllipse(g, -r * 0.33, -r * 0.93, r * 0.06, r * 0.06);
  antininjaEllipse(g, r * 0.33, -r * 0.93, r * 0.06, r * 0.06);

  g.restore();
}

function drawTreeBall(g, x, y, r, shade = 0) {
  const greens = [
    ["#3f8f3a", "#1f5a24"],
    ["#4c9c3c", "#276329"],
    ["#35803a", "#1a4d22"]
  ];
  const c = greens[shade % greens.length];

  g.fillStyle = "#5a3a1e";
  g.fillRect(x - r * 0.14, y + r * 0.4, r * 0.28, r * 0.75);

  g.fillStyle = "rgba(0,0,0,.2)";
  antininjaEllipse(g, x + r * 0.1, y + r * 1.1, r * 0.8, r * 0.2);

  for (const [dx, dy, k] of [
    [-0.45, 0.15, 0.7],
    [0.45, 0.15, 0.7],
    [0, -0.1, 0.95]
  ]) {
    const cx = x + dx * r;
    const cy = y + dy * r;
    const rr = r * k;
    const grad = g.createRadialGradient(cx - rr * 0.35, cy - rr * 0.4, rr * 0.1, cx, cy, rr);
    grad.addColorStop(0, c[0]);
    grad.addColorStop(1, c[1]);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, rr, 0, ANTININJA_TAU);
    g.fill();
  }
}

function drawForestGrass(g, w, h, seed = 7) {
  const rnd = antininjaRandom(seed);

  const grass = g.createLinearGradient(0, 0, 0, h);
  grass.addColorStop(0, "#3d8a32");
  grass.addColorStop(1, "#5aab43");
  g.fillStyle = grass;
  g.fillRect(0, 0, w, h);

  // Manchas de césped más claro y más oscuro.
  for (let i = 0; i < 26; i++) {
    g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.06)";
    antininjaEllipse(g, rnd() * w, rnd() * h, 20 + rnd() * 60, 10 + rnd() * 30);
  }

  // Briznas.
  g.lineWidth = 1.4;
  g.lineCap = "round";
  const count = Math.floor((w * h) / 900);

  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const s = 3 + rnd() * 4;
    g.strokeStyle = rnd() < 0.5 ? "rgba(30,90,25,.55)" : "rgba(140,210,100,.45)";
    g.beginPath();
    g.moveTo(x - s * 0.5, y - s);
    g.lineTo(x, y);
    g.lineTo(x + s * 0.5, y - s);
    g.stroke();
  }

  // Florecillas.
  const flowers = ["#fff", "#ffe066", "#ff8fb1", "#b39cff"];

  for (let i = 0; i < Math.floor(count / 14); i++) {
    g.fillStyle = flowers[Math.floor(rnd() * flowers.length)];
    antininjaEllipse(g, rnd() * w, rnd() * h, 2, 2);
  }
}

function drawForestSides(g, w, h, seed = 11) {
  const rnd = antininjaRandom(seed);
  const r = Math.max(22, w * 0.075);

  for (const side of [-1, 1]) {
    for (let y = r * 0.6; y < h + r; y += r * 1.25) {
      const x = side < 0 ? rnd() * r * 0.5 : w - rnd() * r * 0.5;
      drawTreeBall(g, x, y, r * (0.85 + rnd() * 0.3), Math.floor(rnd() * 3));
    }
  }
}

function drawForestTop(g, w, seed = 23) {
  const rnd = antininjaRandom(seed);
  const r = Math.max(22, w * 0.075);

  for (let x = -r * 0.3; x < w + r; x += r * 1.15) {
    drawTreeBall(g, x + rnd() * r * 0.3, -r * 0.35 + rnd() * r * 0.3, r * (0.9 + rnd() * 0.3), Math.floor(rnd() * 3));
  }
}

function drawNinjaCastle(g, w, h, top) {
  const stone = "#a3a8ae";
  const stoneDark = "#7d838a";
  const wallH = h - top;
  const merlonW = w / 15;
  const merlonH = Math.max(10, wallH * 0.16);

  // Muralla.
  const wall = g.createLinearGradient(0, top, 0, h);
  wall.addColorStop(0, "#b4b9bf");
  wall.addColorStop(1, "#8a9097");
  g.fillStyle = wall;
  g.fillRect(0, top, w, wallH);

  // Almenas.
  g.fillStyle = stone;

  for (let x = 0; x < w; x += merlonW * 2) {
    g.fillRect(x, top - merlonH, merlonW, merlonH);
  }

  // Ladrillos.
  g.strokeStyle = "rgba(60,64,70,.35)";
  g.lineWidth = 1;
  const brickH = Math.max(8, wallH / 7);
  const brickW = brickH * 2.2;

  for (let row = 0, y = top; y < h; row++, y += brickH) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();

    for (let x = row % 2 ? brickW / 2 : 0; x < w; x += brickW) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, Math.min(h, y + brickH));
      g.stroke();
    }
  }

  // Puerta.
  const doorW = w * 0.18;
  const doorH = wallH * 0.58;
  const dx = w / 2 - doorW / 2;
  const dy = h - doorH;

  g.fillStyle = "#5b3a1f";
  g.beginPath();
  g.moveTo(dx, h);
  g.lineTo(dx, dy + doorW / 2);
  g.arc(w / 2, dy + doorW / 2, doorW / 2, Math.PI, 0);
  g.lineTo(dx + doorW, h);
  g.closePath();
  g.fill();
  g.strokeStyle = "#3a2410";
  g.lineWidth = 2;
  g.stroke();

  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(dx + (doorW * i) / 4, dy + doorW * 0.2);
    g.lineTo(dx + (doorW * i) / 4, h);
    g.stroke();
  }

  // Torres.
  const towerW = w * 0.18;

  for (const tx of [0, w - towerW]) {
    const tTop = top - wallH * 0.45;
    g.fillStyle = stoneDark;
    g.fillRect(tx, tTop, towerW, h - tTop);

    g.fillStyle = "#8f959c";

    for (let i = 0; i < 3; i++) {
      g.fillRect(tx + (towerW / 5) * i * 2, tTop - merlonH, towerW / 5, merlonH);
    }

    // Aspillera.
    g.fillStyle = "#2b2f35";
    g.fillRect(tx + towerW / 2 - 3, tTop + wallH * 0.2, 6, wallH * 0.3);

    // Bandera.
    const fx = tx + towerW / 2;
    const fy = tTop - merlonH;
    g.strokeStyle = "#3a3a3a";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(fx, fy);
    g.lineTo(fx, fy - wallH * 0.5);
    g.stroke();
    g.fillStyle = "#d32f2f";
    g.beginPath();
    g.moveTo(fx, fy - wallH * 0.5);
    g.lineTo(fx + towerW * 0.4, fy - wallH * 0.4);
    g.lineTo(fx, fy - wallH * 0.3);
    g.closePath();
    g.fill();
  }
}

/* =========================================================
   PROTECT MOGOS - JUEGO
   ========================================================= */

function initializeAntininjaGame() {
  const card = document.querySelector('[data-minigame="antininja"]');
  const modal = document.getElementById("antininja-modal");
  const closeButton = document.getElementById("antininja-close");
  const backdrop = modal?.querySelector(".antitronks-backdrop");
  const game = document.getElementById("antininja-game");
  const canvas = document.getElementById("antininja-canvas");
  const ctx = canvas?.getContext("2d");
  const startButton = document.getElementById("antininja-start");
  const overlay = document.getElementById("antininja-overlay");
  const overlayTitle = document.getElementById("antininja-overlay-title");
  const overlayText = document.getElementById("antininja-overlay-text");
  const scoreElement = document.getElementById("antininja-score");
  const recordElement = document.getElementById("antininja-record");
  const livesElement = document.getElementById("antininja-lives");
  const flash = document.getElementById("antininja-hit-flash");
  const message = document.getElementById("antininja-message");
  const messageText = document.getElementById("antininja-message-text");

  if (!card || !modal || !game || !canvas || !ctx) {
    return;
  }

  /* =======================================================
     CONFIGURACIÓN
     ======================================================= */

  const TAU = ANTININJA_TAU;
  const RECORD_KEY = "antininja-record";

  // A partir de aquí (en % de la altura) empieza el castillo.
  const CASTLE_TOP = 0.8;

  const FLIP_TIME = 520;
  // Cuánto avanza hacia el castillo el ninja morado en cada voltereta.
  const FLIP_PUSH = 0.05;
  const FLIPPER_HP = 2;
  const DEATH_TIME = 380;

  const INTRO_TEXT =
    "Haz clic en los ninjas antes de que lleguen al castillo del rey. Cinta roja: 1 clic. Cinta dorada: 2 clics. Cinta morada: 2 clics, ¡pero con el primero da una voltereta hacia delante y se acerca al castillo!";

  /* =======================================================
     ESTADO
     ======================================================= */

  let width = 1;
  let height = 1;
  let dpr = 1;

  let bgLayer = null;
  let topLayer = null;
  let castleLayer = null;

  let running = false;
  let animationFrame = 0;
  let lastTime = 0;
  let gameTime = 0;

  let score = 0;
  let lives = 3;
  let record = loadRecord();

  let spawnTimer = 0;
  let nextSpawn = 700;

  let ninjas = [];
  let particles = [];
  let floaters = [];

  let kingHurt = 0;
  let shake = 0;
  let flashTimer = 0;
  let messageTimer = 0;

  /* =======================================================
     UTILIDADES
     ======================================================= */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function easeOut(t) {
    t = clamp(t, 0, 1);
    return 1 - (1 - t) * (1 - t);
  }

  function fieldHeight() {
    return height * CASTLE_TOP;
  }

  function baseRadius() {
    return clamp(width * 0.055, 16, 34);
  }

  function ninjaRadius(n) {
    return baseRadius() * (n.type === "tank" ? 1.22 : 1);
  }

  function ninjaPos(n) {
    return {
      x: (n.x + Math.sin(n.phase + gameTime * 0.002) * 0.02) * width,
      y: n.y * fieldHeight()
    };
  }

  /*
   * Dificultad: mismo sistema que Antitronks, sube poco a poco
   * hasta 50 puntos y ahí se queda. Difícil, pero nunca imposible.
   * - Velocidad: cruza el bosque en ~7 s al empezar
   *   y nunca en menos de ~4,5 s.
   * - Nuevo ninja: cada 1,5 s al empezar y nunca menos de 0,85 s.
   * - Ninjas a la vez: 3 al empezar y 1 más cada 8 puntos (máx. 7).
   * - Salen en grupos: 1 ninja al empezar, 2 a la vez desde 15 puntos
   *   y 3 como máximo desde 30.
   */
  function getSpeed() {
    return Math.min(0.22, 0.14 + score * 0.0016);
  }

  function getSpawnInterval() {
    return Math.max(850, 1500 - score * 13);
  }

  function getMaxNinjas() {
    return Math.min(7, 3 + Math.floor(score / 8));
  }

  function getGroupSize() {
    return Math.min(3, 1 + Math.floor(score / 15));
  }

  /* =======================================================
     RÉCORD
     ======================================================= */

  function loadRecord() {
    try {
      return Math.max(0, parseInt(localStorage.getItem(RECORD_KEY), 10) || 0);
    } catch {
      return 0;
    }
  }

  function saveRecord(value) {
    try {
      localStorage.setItem(RECORD_KEY, String(value));
    } catch {
      // LocalStorage no disponible.
    }
  }

  /* =======================================================
     HUD
     ======================================================= */

  function updateHud() {
    if (scoreElement) {
      scoreElement.textContent = `PUNTOS: ${score}`;
    }

    if (recordElement) {
      recordElement.textContent = `RÉCORD: ${Math.max(record, score)}`;
    }

    if (livesElement) {
      livesElement.textContent = `VIDAS: ${lives}`;
    }
  }

  function showMessage(text, duration = 500) {
    if (!message || !messageText) {
      return;
    }

    messageText.textContent = text;
    message.classList.add("visible");
    messageTimer = duration;
  }

  /* =======================================================
     RESIZE + CAPAS DEL FONDO
     ======================================================= */

  function makeLayer(drawFn) {
    const layer = document.createElement("canvas");
    layer.width = Math.floor(width * dpr);
    layer.height = Math.floor(height * dpr);
    const g = layer.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFn(g);
    return layer;
  }

  function resize() {
    const rect = game.getBoundingClientRect();

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (width <= 1 || height <= 1) {
      return;
    }

    const fh = fieldHeight();

    bgLayer = makeLayer((g) => {
      drawForestGrass(g, width, fh + 20);
      drawForestSides(g, width, fh);
    });

    topLayer = makeLayer((g) => {
      drawForestTop(g, width);
    });

    castleLayer = makeLayer((g) => {
      drawNinjaCastle(g, width, height, fh);
    });
  }

  /* =======================================================
     NINJAS
     ======================================================= */

  function aliveCount() {
    return ninjas.filter((n) => n.state !== "dying").length;
  }

  function pickType() {
    if (score < 3) {
      return "normal";
    }

    const r = Math.random();

    if (r < 0.2) {
      return "flipper";
    }

    if (r < 0.4) {
      return "tank";
    }

    return "normal";
  }

  function spawnNinja(x = rand(0.18, 0.82), y = -0.02) {
    if (!running || aliveCount() >= getMaxNinjas()) {
      return;
    }

    const type = pickType();

    ninjas.push({
      type,
      x,
      y,
      hp: type === "tank" ? 2 : type === "flipper" ? FLIPPER_HP : 1,
      state: "run",
      stateTime: 0,
      phase: rand(0, TAU),
      speedMul: rand(0.9, 1.1) * (type === "tank" ? 0.8 : type === "flipper" ? 1.1 : 1),
      flash: 0,
      damaged: false,
      rotation: 0,
      flipFrom: 0,
      flipTo: 0,
      fallDir: 1
    });
  }

  function setState(n, state) {
    n.state = state;
    n.stateTime = 0;
  }

  function pickNinja(px, py) {
    let best = null;

    for (const n of ninjas) {
      if (n.state === "dying") {
        continue;
      }

      const p = ninjaPos(n);
      const r = ninjaRadius(n) * 1.15;

      if (Math.hypot(px - p.x, py - p.y) <= r && (!best || n.y > best.y)) {
        best = n;
      }
    }

    return best;
  }

  /* =======================================================
     EFECTOS
     ======================================================= */

  function spawnParticles(x, y, color, count, power, size = 4) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: rand(-0.25, 0.25) * power,
        vy: rand(-0.3, 0.1) * power,
        life: 0,
        max: rand(300, 600),
        color,
        size: rand(size * 0.5, size)
      });
    }
  }

  function addFloater(x, y, text, color) {
    floaters.push({ x, y, text, color, life: 0, max: 850 });
  }

  /* =======================================================
     CLIC
     ======================================================= */

  function kill(n, points, p) {
    setState(n, "dying");
    n.fallDir = Math.random() < 0.5 ? -1 : 1;

    score += points;
    updateHud();

    spawnParticles(p.x, p.y, "#e8e8e8", 12, 0.9, 7);
    spawnParticles(p.x, p.y, "#ffd24a", 6, 1.2, 4);
    addFloater(p.x, p.y - 20, `+${points}`, points > 1 ? "#ffd24a" : "#ffffff");
  }

  function clickAt(px, py) {
    if (!running) {
      return;
    }

    const n = pickNinja(px, py);

    if (!n) {
      spawnParticles(px, py, "#2f6b27", 5, 0.5, 3);
      TronkSound.play("swish");
      return;
    }

    // Mientras hace la voltereta no se le puede tocar.
    if (n.state === "flipping") {
      return;
    }

    const p = ninjaPos(n);

    if (n.type === "normal") {
      TronkSound.play("pop");
      kill(n, 1, p);
      return;
    }

    if (n.type === "tank") {
      n.hp -= 1;
      TronkSound.play("clank");

      if (n.hp <= 0) {
        TronkSound.play("pop");
        kill(n, 2, p);
      } else {
        n.flash = 1;
        n.damaged = true;
        n.y = Math.max(-0.02, n.y - 0.035);
        spawnParticles(p.x, p.y, "#cfd4dc", 8, 0.9, 4);
        addFloater(p.x, p.y - 22, "¡OTRA VEZ!", "#ffd24a");
      }

      return;
    }

    // Ninja morado: 2 clics. Con el primero da UNA voltereta corta
    // HACIA DELANTE y se acerca al castillo; con el segundo muere.
    n.hp -= 1;

    if (n.hp <= 0) {
      TronkSound.play("pop");
      kill(n, 2, p);
      return;
    }

    n.flipFrom = n.y;
    n.flipTo = n.y + FLIP_PUSH;
    setState(n, "flipping");
    TronkSound.play("flip");
    spawnParticles(p.x, p.y + ninjaRadius(n), "#8fcf6a", 6, 0.7, 4);
    addFloater(p.x, p.y - 22, "¡VOLTERETA!", "#d9a6ff");
  }

  /* =======================================================
     DAÑO / GAME OVER
     ======================================================= */

  function ninjaReachedCastle(n) {
    const p = ninjaPos(n);

    lives -= 1;
    updateHud();
    TronkSound.play("castleHit");

    kingHurt = 900;
    shake = 280;

    spawnParticles(p.x, fieldHeight(), "#9da3aa", 14, 1, 6);

    flash?.classList.add("active");
    flashTimer = 180;
    showMessage("¡UN NINJA HA LLEGADO AL CASTILLO!", 900);

    if (lives <= 0) {
      gameOver();
    }
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(animationFrame);

    ninjas = [];
    particles = [];
    floaters = [];
    shake = 0;
    flashTimer = 0;
    messageTimer = 0;
    flash?.classList.remove("active");
    message?.classList.remove("visible");

    const newRecord = score > record;

    if (newRecord) {
      record = score;
      saveRecord(record);
    }

    TronkSound.play(newRecord ? "record" : "gameOver");

    updateHud();

    overlay?.classList.remove("hidden");

    if (overlayTitle) {
      overlayTitle.textContent = newRecord ? "¡NUEVO RÉCORD!" : "GAME OVER";
    }

    if (overlayText) {
      overlayText.textContent = newRecord
        ? `Has conseguido ${score} punto${score === 1 ? "" : "s"}. ¡Es tu mejor marca!`
        : `Has conseguido ${score} punto${score === 1 ? "" : "s"}. Tu récord es ${record}.`;
    }

    if (startButton) {
      startButton.textContent = "REINTENTAR";
    }

    draw();
  }

  /* =======================================================
     REINICIAR / INICIAR / ABRIR / CERRAR
     ======================================================= */

  function resetGame() {
    running = false;
    cancelAnimationFrame(animationFrame);

    score = 0;
    lives = 3;
    spawnTimer = 0;
    nextSpawn = 700;
    ninjas = [];
    particles = [];
    floaters = [];
    kingHurt = 0;
    shake = 0;
    flashTimer = 0;
    flash?.classList.remove("active");
    message?.classList.remove("visible");

    updateHud();

    overlay?.classList.remove("hidden");

    if (overlayTitle) {
      overlayTitle.textContent = "PROTECT MOGOS";
    }

    if (overlayText) {
      overlayText.textContent = record > 0 ? `${INTRO_TEXT} Tu récord: ${record} puntos.` : INTRO_TEXT;
    }

    if (startButton) {
      startButton.textContent = "JUGAR";
    }

    resize();
    draw();
  }

  function startGame() {
    score = 0;
    lives = 3;
    spawnTimer = 0;
    nextSpawn = 500;
    ninjas = [];
    particles = [];
    floaters = [];
    kingHurt = 0;

    updateHud();

    running = true;
    overlay?.classList.add("hidden");
    TronkSound.play("start");

    lastTime = performance.now();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(loop);
  }

  function openGame() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("antitronks-open");

    TronkSound.startMusic("calm");

    resetGame();
  }

  function closeGame() {
    running = false;
    cancelAnimationFrame(animationFrame);
    ninjas = [];

    TronkSound.stopMusic();

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("antitronks-open");
  }

  /* =======================================================
     ACTUALIZACIÓN
     ======================================================= */

  function update(delta) {
    gameTime += delta;

    spawnTimer += delta;

    if (spawnTimer >= nextSpawn) {
      // Cuantos más puntos, más ninjas salen a la vez (en grupo).
      const group = getGroupSize();

      for (let k = 0; k < group; k++) {
        const x = group === 1 ? rand(0.18, 0.82) : 0.18 + ((k + rand(0.15, 0.85)) / group) * 0.64;
        spawnNinja(x, -0.02 - k * 0.03);
      }

      spawnTimer = 0;
      nextSpawn = getSpawnInterval() * rand(0.75, 1.2);
    }

    const speed = getSpeed();
    const fh = fieldHeight();

    for (let i = ninjas.length - 1; i >= 0; i--) {
      const n = ninjas[i];
      n.stateTime += delta;
      n.flash = Math.max(0, n.flash - delta / 150);

      if (n.state === "run") {
        n.y += (speed * n.speedMul * delta) / 1000;

        if (n.y * fh + ninjaRadius(n) * 0.9 >= fh) {
          ninjas.splice(i, 1);
          ninjaReachedCastle(n);

          if (!running) {
            return;
          }
        }
      } else if (n.state === "flipping") {
        const t = n.stateTime / FLIP_TIME;
        n.y = n.flipFrom + (n.flipTo - n.flipFrom) * easeOut(t);
        // Voltereta hacia delante (gira hacia el castillo).
        n.rotation = TAU * clamp(t, 0, 1);

        if (t >= 1) {
          n.rotation = 0;
          setState(n, "run");
        }

        // Si la voltereta le lleva hasta el castillo, cuenta como que ha llegado.
        if (n.y * fh + ninjaRadius(n) * 0.9 >= fh) {
          ninjas.splice(i, 1);
          ninjaReachedCastle(n);

          if (!running) {
            return;
          }
        }
      } else if (n.state === "dying" && n.stateTime >= DEATH_TIME) {
        ninjas.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += delta;
      p.vy += 0.0012 * delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;

      if (p.life >= p.max) {
        particles.splice(i, 1);
      }
    }

    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life += delta;
      f.y -= 0.05 * delta;

      if (f.life >= f.max) {
        floaters.splice(i, 1);
      }
    }

    kingHurt = Math.max(0, kingHurt - delta);
    shake = Math.max(0, shake - delta);

    if (flashTimer > 0) {
      flashTimer -= delta;

      if (flashTimer <= 0) {
        flash?.classList.remove("active");
      }
    }

    if (messageTimer > 0) {
      messageTimer -= delta;

      if (messageTimer <= 0) {
        message?.classList.remove("visible");
      }
    }
  }

  /* =======================================================
     DIBUJAR
     ======================================================= */

  function drawNinja(n) {
    const p = ninjaPos(n);
    const r = ninjaRadius(n);

    if (n.state === "dying") {
      const k = n.stateTime / DEATH_TIME;

      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.translate(p.x, p.y);
      ctx.scale(1 + k * 0.4, 1 + k * 0.4);
      drawNinjaBall(ctx, 0, 0, r, {
        type: n.type,
        time: gameTime,
        run: false,
        hurt: true,
        rotation: n.fallDir * k * 1.5
      });
      ctx.restore();
      return;
    }

    drawNinjaBall(ctx, p.x, p.y, r, {
      type: n.type,
      time: gameTime + n.phase * 300,
      run: n.state === "run",
      rotation: n.rotation,
      damaged: n.damaged,
      flash: n.flash
    });

    // Puntos de vida de los ninjas de varios clics.
    if (n.type === "tank" || n.type === "flipper") {
      const max = n.type === "tank" ? 2 : FLIPPER_HP;
      const color = n.type === "tank" ? "#ffd24a" : "#d9a6ff";

      for (let i = 0; i < max; i++) {
        ctx.fillStyle = i < n.hp ? color : "rgba(0,0,0,.4)";
        ctx.beginPath();
        ctx.arc(p.x - ((max - 1) * 12) / 2 + i * 12, p.y - r - 12, 4, 0, TAU);
        ctx.fill();
      }
    }
  }

  function draw() {
    if (width <= 1 || height <= 1) {
      return;
    }

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    if (shake > 0) {
      const s = (shake / 280) * 6;
      ctx.translate(rand(-s, s), rand(-s, s));
    }

    if (bgLayer) {
      ctx.drawImage(bgLayer, 0, 0, width, height);
    }

    [...ninjas].sort((a, b) => a.y - b.y).forEach(drawNinja);

    if (topLayer) {
      ctx.drawImage(topLayer, 0, 0, width, height);
    }

    const fh = fieldHeight();
    const kingR = clamp(width * 0.085, 26, 46);
    // El rey asoma por encima de las almenas (su altura = la de drawNinjaCastle).
    const merlonH = Math.max(10, (height - fh) * 0.16);
    drawKingBall(ctx, width / 2, fh - merlonH - kingR * 0.7, kingR, {
      hurt: kingHurt > 0,
      time: gameTime
    });

    if (castleLayer) {
      ctx.drawImage(castleLayer, 0, 0, width, height);
    }

    for (const p of particles) {
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.font = "900 18px system-ui, sans-serif";

    for (const f of floaters) {
      ctx.globalAlpha = 1 - f.life / f.max;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,.8)";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function loop(now) {
    if (!running) {
      draw();
      return;
    }

    const delta = Math.min(40, now - lastTime || 16);
    lastTime = now;

    update(delta);
    draw();

    if (running) {
      animationFrame = requestAnimationFrame(loop);
    }
  }

  /* =======================================================
     CONTROLES
     ======================================================= */

  card.addEventListener("click", openGame);

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openGame();
    }
  });

  closeButton?.addEventListener("click", closeGame);
  backdrop?.addEventListener("click", closeGame);
  startButton?.addEventListener("click", startGame);

  // Ratón y táctil: clic / toque sobre el ninja.
  game.addEventListener("pointerdown", (event) => {
    if (!running || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    const rect = game.getBoundingClientRect();
    clickAt(event.clientX - rect.left, event.clientY - rect.top);
  });

  window.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("hidden") && event.key === "Escape") {
      closeGame();
    }
  });

  window.addEventListener("resize", () => {
    if (modal.classList.contains("hidden")) {
      return;
    }

    resize();

    if (!running) {
      draw();
    }
  });

  resetGame();
}
