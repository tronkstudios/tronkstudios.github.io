"use strict";

/* TronkStudios · js/games/stick-drill.js
   Minijuego Stick Drill.
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   STICK DRILL - DIBUJOS (stickman y taladro)
   ========================================================= */

function drawStickman(g, x, y, h, color, opts = {}) {
  const dead = opts.dead;
  const phase = opts.phase || 0;
  const facing = opts.facing || 1;
  const lw = Math.max(2, h * 0.075);

  g.save();
  g.translate(x, y);

  // Sombra.
  g.fillStyle = "rgba(0,0,0,.3)";
  g.beginPath();
  g.ellipse(0, h * 0.44, h * 0.22, h * 0.06, 0, 0, Math.PI * 2);
  g.fill();

  if (dead) {
    // Tumbado en el suelo.
    g.rotate(Math.PI / 2 * facing);
    g.globalAlpha = 0.65;
  }

  g.strokeStyle = dead ? "#9aa0a6" : color;
  g.lineWidth = lw;
  g.lineCap = "round";
  g.lineJoin = "round";

  const swing = dead ? 0.3 : Math.sin(phase) * 0.55;
  const hip = h * 0.1;
  const neck = -h * 0.22;
  const leg = h * 0.32;
  const arm = h * 0.24;

  // Piernas.
  g.beginPath();
  g.moveTo(0, hip);
  g.lineTo(Math.sin(swing) * leg, hip + Math.cos(swing) * leg);
  g.moveTo(0, hip);
  g.lineTo(Math.sin(-swing) * leg, hip + Math.cos(-swing) * leg);

  // Cuerpo.
  g.moveTo(0, hip);
  g.lineTo(0, neck);

  // Brazos.
  const shoulder = neck + h * 0.05;
  g.moveTo(0, shoulder);
  g.lineTo(Math.sin(-swing) * arm, shoulder + Math.cos(-swing) * arm);
  g.moveTo(0, shoulder);
  g.lineTo(Math.sin(swing) * arm, shoulder + Math.cos(swing) * arm);
  g.stroke();

  // Cabeza.
  const headR = h * 0.14;
  const headY = neck - headR * 0.95;
  g.fillStyle = dead ? "#c9ccd0" : "#fff";
  g.beginPath();
  g.arc(0, headY, headR, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // Ojos.
  g.strokeStyle = "#111";
  g.fillStyle = "#111";
  g.lineWidth = Math.max(1, h * 0.03);

  if (dead) {
    for (const ex of [-0.35, 0.35]) {
      const cx = ex * headR;
      const cy = headY - headR * 0.1;
      const s = headR * 0.2;
      g.beginPath();
      g.moveTo(cx - s, cy - s);
      g.lineTo(cx + s, cy + s);
      g.moveTo(cx + s, cy - s);
      g.lineTo(cx - s, cy + s);
      g.stroke();
    }
  } else {
    for (const ex of [-0.3, 0.3]) {
      g.beginPath();
      g.arc(ex * headR + facing * headR * 0.15, headY - headR * 0.1, Math.max(1, headR * 0.14), 0, Math.PI * 2);
      g.fill();
    }
  }

  g.restore();
}

/*
 * Taladro cónico con espiral giratoria (diseño propio).
 * angle = hacia dónde apunta la punta.
 */
function drawDrill(g, x, y, angle, len, wid, spin) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);

  const back = -len * 0.45;
  const tip = len * 0.55;
  const half = wid / 2;

  // Cono.
  g.beginPath();
  g.moveTo(back, -half);
  g.lineTo(tip, 0);
  g.lineTo(back, half);
  g.closePath();

  const body = g.createLinearGradient(0, -half, 0, half);
  body.addColorStop(0, "#fff1a8");
  body.addColorStop(0.35, "#f5c21b");
  body.addColorStop(1, "#a86b00");
  g.fillStyle = body;
  g.fill();

  // Espiral: franjas diagonales que se desplazan al girar.
  g.save();
  g.clip();
  g.strokeStyle = "rgba(90,50,0,.65)";
  g.lineWidth = Math.max(1.5, wid * 0.09);
  const step = len * 0.16;
  const offset = ((spin % 1) + 1) % 1 * step;

  for (let sx = back - step * 2 + offset; sx < tip + step; sx += step) {
    g.beginPath();
    g.moveTo(sx, -half);
    g.lineTo(sx + step * 0.9, half);
    g.stroke();
  }

  g.restore();

  g.strokeStyle = "#6b4300";
  g.lineWidth = Math.max(1, wid * 0.05);
  g.beginPath();
  g.moveTo(back, -half);
  g.lineTo(tip, 0);
  g.lineTo(back, half);
  g.stroke();

  // Base del taladro.
  g.fillStyle = "#c2410c";
  g.strokeStyle = "#5c1d05";
  g.beginPath();

  if (typeof g.roundRect === "function") {
    g.roundRect(back - len * 0.12, -half * 1.05, len * 0.14, half * 2.1, wid * 0.12);
  } else {
    g.rect(back - len * 0.12, -half * 1.05, len * 0.14, half * 2.1);
  }

  g.fill();
  g.stroke();

  // Brillo en la punta.
  g.fillStyle = "rgba(255,255,255,.9)";
  g.beginPath();
  g.arc(tip - len * 0.05, 0, Math.max(1.5, wid * 0.06), 0, Math.PI * 2);
  g.fill();

  g.restore();
}

function drawDrillArena(g, S, m) {
  // Suelo metálico.
  const floor = g.createLinearGradient(0, 0, S, S);
  floor.addColorStop(0, "#2b3240");
  floor.addColorStop(1, "#1b202b");
  g.fillStyle = floor;
  g.fillRect(0, 0, S, S);

  // Cuadrícula.
  g.strokeStyle = "rgba(255,255,255,.05)";
  g.lineWidth = 1;
  const cells = 12;
  const inner = S - m * 2;

  for (let i = 0; i <= cells; i++) {
    const p = m + (inner * i) / cells;
    g.beginPath();
    g.moveTo(p, m);
    g.lineTo(p, S - m);
    g.moveTo(m, p);
    g.lineTo(S - m, p);
    g.stroke();
  }

  // Círculo central.
  g.strokeStyle = "rgba(255,255,255,.08)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(S / 2, S / 2, inner * 0.14, 0, Math.PI * 2);
  g.stroke();

  // Muros con franjas de peligro.
  g.save();
  g.beginPath();
  g.rect(0, 0, S, S);
  g.rect(m, m, inner, inner);
  g.clip("evenodd");
  g.fillStyle = "#f2b90f";
  g.fillRect(0, 0, S, S);
  g.strokeStyle = "#1a1a1a";
  g.lineWidth = m * 0.8;

  for (let k = -S; k < S * 2; k += m * 2.2) {
    g.beginPath();
    g.moveTo(k, 0);
    g.lineTo(k + S, S);
    g.stroke();
  }

  g.restore();

  g.strokeStyle = "rgba(0,0,0,.6)";
  g.lineWidth = 2;
  g.strokeRect(m, m, inner, inner);
}

/* =========================================================
   STICK DRILL - JUEGO
   ========================================================= */

function initializeStickDrillGame() {
  const card = document.querySelector('[data-minigame="stickdrill"]');
  const modal = document.getElementById("stickdrill-modal");
  const closeButton = document.getElementById("stickdrill-close");
  const backdrop = modal?.querySelector(".antitronks-backdrop");
  const game = document.getElementById("stickdrill-game");
  const canvas = document.getElementById("stickdrill-canvas");
  const ctx = canvas?.getContext("2d");
  const overlay = document.getElementById("stickdrill-overlay");
  const overlayTitle = document.getElementById("stickdrill-overlay-title");
  const overlayText = document.getElementById("stickdrill-overlay-text");
  const botButton = document.getElementById("stickdrill-bot");
  const duoButton = document.getElementById("stickdrill-2p");
  const p1Element = document.getElementById("stickdrill-p1");
  const p2Element = document.getElementById("stickdrill-p2");
  const timeElement = document.getElementById("stickdrill-time");
  const recordElement = document.getElementById("stickdrill-record");
  const flash = document.getElementById("stickdrill-hit-flash");
  const message = document.getElementById("stickdrill-message");
  const messageText = document.getElementById("stickdrill-message-text");

  if (!card || !modal || !game || !canvas || !ctx) {
    return;
  }

  /* =======================================================
     CONFIGURACIÓN
     ======================================================= */

  const TAU = Math.PI * 2;
  const RECORD_KEY = "stickdrill-record";

  const PLAYER_SPEED = 0.42;
  const PLAYER_R = 0.022;
  // Bot: algo más lento que un jugador, mira poco hacia delante
  // y a veces se "despista" un momento, para que se le pueda ganar.
  const BOT_SPEED_MUL = 0.88;
  const BOT_THINK_EVERY = 0.17;
  const BOT_LOOKAHEAD = 0.4;

  const DRILL_LEN = 0.13;
  const DRILL_WID = 0.075;
  const DRILL_BOUNCE_R = 0.05;

  // Momentos (segundos) en los que aparece un taladro más.
  const EXTRA_DRILLS_AT = [15, 35, 60, 90];
  const WARN_TIME = 1.3;

  const INTRO_TEXT =
    "Esquiva el taladro que rebota por las paredes. El que caiga primero pierde. Jugador 1 (azul): W A S D. Jugador 2 (rojo): flechas.";

  const TOUCH_INTRO_TEXT =
    "Esquiva el taladro que rebota por las paredes. El que caiga primero pierde. Mueve a tu stickman con el joystick: J1 (azul) a la izquierda, J2 (rojo) a la derecha.";

  // Joystick: por debajo de esta inclinación (0..1) no se mueve.
  const STICK_DEADZONE = 0.2;

  /* =======================================================
     ESTADO
     ======================================================= */

  let width = 1;
  let height = 1;
  let dpr = 1;
  let S = 1;
  let margin = 1;
  let offX = 0;
  let offY = 0;
  let arenaLayer = null;

  let mode = "bot";
  let state = "menu";
  let animationFrame = 0;
  let lastTime = 0;

  let time = 0;
  let countdown = 0;
  let lastCount = 0;

  let players = [];
  let drills = [];
  let pending = [];
  let extraIndex = 0;
  let particles = [];
  let firstDead = null;

  let record = loadRecord();

  let shake = 0;
  let flashTimer = 0;
  let messageTimer = 0;

  const keys = new Set();

  // Dirección de cada joystick táctil (J1 y J2), de -1 a 1.
  const sticks = {
    1: { x: 0, y: 0 },
    2: { x: 0, y: 0 }
  };

  let touchMode = false;

  /* =======================================================
     UTILIDADES
     ======================================================= */

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function fmt(seconds) {
    return `${seconds.toFixed(1)} s`;
  }

  // Coordenadas del campo (0..1) a píxeles.
  function sx(x) {
    return offX + margin + x * (S - margin * 2);
  }

  function sy(y) {
    return offY + margin + y * (S - margin * 2);
  }

  function unit() {
    return S - margin * 2;
  }

  // Refleja una posición dentro de [lo, hi] (rebotes).
  function fold(v, lo, hi) {
    const range = hi - lo;
    const period = range * 2;
    let t = (v - lo) % period;

    if (t < 0) {
      t += period;
    }

    return lo + (t > range ? period - t : t);
  }

  function drillSpeed() {
    return Math.min(0.95, 0.33 + time * 0.012);
  }

  function introWithRecord() {
    const intro = touchMode ? TOUCH_INTRO_TEXT : INTRO_TEXT;
    return record > 0 ? `${intro} Récord: ${fmt(record)}.` : intro;
  }

  /* =======================================================
     RÉCORD (por tiempo)
     ======================================================= */

  function loadRecord() {
    try {
      return Math.max(0, parseFloat(localStorage.getItem(RECORD_KEY)) || 0);
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
    if (timeElement) {
      timeElement.textContent = `TIEMPO: ${fmt(time)}`;
    }

    if (recordElement) {
      recordElement.textContent = `RÉCORD: ${fmt(record)}`;
    }

    const [p1, p2] = players;

    if (p1Element) {
      p1Element.textContent = p1 ? `${p1.label}: ${p1.alive ? "VIVO" : fmt(p1.deathTime)}` : "J1";
    }

    if (p2Element) {
      p2Element.textContent = p2 ? `${p2.label}: ${p2.alive ? "VIVO" : fmt(p2.deathTime)}` : "J2";
    }
  }

  function showMessage(text, duration = 1200) {
    if (!message || !messageText) {
      return;
    }

    messageText.textContent = text;
    message.classList.add("visible");
    messageTimer = duration;
  }

  /* =======================================================
     RESIZE
     ======================================================= */

  function resize() {
    const rect = game.getBoundingClientRect();

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    S = Math.min(width, height);
    margin = S * 0.03;
    offX = (width - S) / 2;
    offY = (height - S) / 2;

    if (S <= 1) {
      return;
    }

    arenaLayer = document.createElement("canvas");
    arenaLayer.width = Math.floor(S * dpr);
    arenaLayer.height = Math.floor(S * dpr);
    const g = arenaLayer.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawDrillArena(g, S, margin);
  }

  /* =======================================================
     PREPARAR PARTIDA
     ======================================================= */

  function makeDrill(x, y) {
    const a = rand(0, TAU);

    return {
      x,
      y,
      vx: Math.cos(a),
      vy: Math.sin(a),
      spin: 0,
      bounceCooldown: 0
    };
  }

  function setupRound() {
    modal.dataset.mode = mode;
    time = 0;
    extraIndex = 0;
    particles = [];
    pending = [];
    firstDead = null;
    shake = 0;

    players = [
      {
        id: 1,
        label: "J1",
        color: "#3b82f6",
        x: 0.2,
        y: 0.5,
        alive: true,
        deathTime: 0,
        isBot: false,
        up: "w",
        down: "s",
        left: "a",
        right: "d",
        facing: 1,
        phase: 0,
        moving: false,
        dirX: 0,
        dirY: 0,
        thinkTimer: 0
      },
      {
        id: 2,
        label: mode === "bot" ? "BOT" : "J2",
        color: "#ef4444",
        x: 0.8,
        y: 0.5,
        alive: true,
        deathTime: 0,
        isBot: mode === "bot",
        up: "arrowup",
        down: "arrowdown",
        left: "arrowleft",
        right: "arrowright",
        facing: -1,
        phase: 0,
        moving: false,
        dirX: 0,
        dirY: 0,
        thinkTimer: 0
      }
    ];

    // Primer taladro en el centro, apuntando arriba o abajo
    // (nunca directo hacia un jugador).
    const d = makeDrill(0.5, 0.5);
    const a = (Math.random() < 0.5 ? -1 : 1) * rand(Math.PI * 0.3, Math.PI * 0.7);
    d.vx = Math.cos(a);
    d.vy = Math.sin(a);
    drills = [d];

    updateHud();
  }

  function startRound(selectedMode) {
    mode = selectedMode;

    TronkSound.ensure();
    setupRound();

    overlay?.classList.add("hidden");
    message?.classList.remove("visible");

    state = "countdown";
    countdown = 3;
    lastCount = 4;

    lastTime = performance.now();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(loop);
  }

  function showMenu() {
    state = "menu";
    cancelAnimationFrame(animationFrame);
    setupRound();

    overlay?.classList.remove("hidden");

    if (overlayTitle) {
      overlayTitle.textContent = "STICK DRILL";
    }

    if (overlayText) {
      overlayText.textContent = introWithRecord();
    }

    flash?.classList.remove("active");
    message?.classList.remove("visible");

    resize();
    draw();
  }

  /* =======================================================
     IA DEL BOT
     ======================================================= */

  function predictDrill(d, tau) {
    const sp = drillSpeed();

    return {
      x: fold(d.x + d.vx * sp * tau, DRILL_BOUNCE_R, 1 - DRILL_BOUNCE_R),
      y: fold(d.y + d.vy * sp * tau, DRILL_BOUNCE_R, 1 - DRILL_BOUNCE_R)
    };
  }

  function botThink(p) {
    const speed = PLAYER_SPEED * BOT_SPEED_MUL;
    const options = [[0, 0]];

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      options.push([Math.cos(a), Math.sin(a)]);
    }

    let best = options[0];
    let bestScore = -Infinity;

    for (const [dx, dy] of options) {
      let score = Infinity;

      for (let tau = 0.1; tau <= BOT_LOOKAHEAD + 0.01; tau += 0.1) {
        const px = clamp(p.x + dx * speed * tau, PLAYER_R, 1 - PLAYER_R);
        const py = clamp(p.y + dy * speed * tau, PLAYER_R, 1 - PLAYER_R);

        for (const d of drills) {
          const q = predictDrill(d, tau);
          // Los peligros cercanos en el tiempo pesan más.
          const dist = Math.hypot(px - q.x, py - q.y) - DRILL_BOUNCE_R;
          score = Math.min(score, dist + tau * 0.05);
        }

        for (const w of pending) {
          score = Math.min(score, Math.hypot(px - w.x, py - w.y) - 0.09);
        }
      }

      const fx = clamp(p.x + dx * speed * 0.4, 0, 1);
      const fy = clamp(p.y + dy * speed * 0.4, 0, 1);

      // Evitar esquinas y paredes, y quedarse más o menos por el centro.
      const wall = Math.min(fx, fy, 1 - fx, 1 - fy);

      if (wall < 0.15) {
        score -= (0.15 - wall) * 0.9;
      }

      score -= Math.hypot(fx - 0.5, fy - 0.5) * 0.06;

      // Un poco de imprecisión para que se le pueda ganar.
      score += rand(-0.03, 0.03);

      if (score > bestScore) {
        bestScore = score;
        best = [dx, dy];
      }
    }

    p.dirX = best[0];
    p.dirY = best[1];
  }

  /* =======================================================
     EFECTOS
     ======================================================= */

  function burst(x, y, color, count, power) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const v = rand(0.05, 0.3) * power;

      particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0,
        max: rand(300, 700),
        color,
        size: rand(2, 5)
      });
    }
  }

  /* =======================================================
     MUERTE Y FIN DE PARTIDA
     ======================================================= */

  function killPlayer(p) {
    p.alive = false;
    p.deathTime = time;

    burst(sx(p.x), sy(p.y), p.color, 26, 1.3);
    burst(sx(p.x), sy(p.y), "#ffd24a", 12, 1);
    TronkSound.play("stickDeath");

    shake = 300;
    flash?.classList.add("active");
    flashTimer = 160;

    if (!firstDead) {
      firstDead = p;
    }

    const other = players.find((q) => q !== p);

    if (other.alive) {
      if (other.isBot) {
        // Si caes tú contra el bot, se acaba ya.
        endRound();
      } else {
        showMessage(`¡${other.id === 1 ? "JUGADOR 1" : "JUGADOR 2"} GANA! Sigue aguantando para el récord`, 2200);
      }
    } else {
      endRound();
    }

    updateHud();
  }

  function endRound() {
    state = "over";
    shake = 0;
    flash?.classList.remove("active");
    message?.classList.remove("visible");

    // El récord solo cuenta a los jugadores humanos.
    const humanTimes = players.filter((p) => !p.isBot).map((p) => (p.alive ? time : p.deathTime));
    const best = humanTimes.length ? Math.max(...humanTimes) : 0;
    const newRecord = best > record;

    if (newRecord) {
      record = best;
      saveRecord(record);
    }

    const [p1, p2] = players;
    let title;

    if (p1.alive === p2.alive && p1.deathTime === p2.deathTime) {
      title = "¡EMPATE!";
    } else {
      const winner = firstDead === p1 ? p2 : p1;
      title = winner.isBot ? "¡GANA EL BOT!" : `¡GANA EL JUGADOR ${winner.id}!`;
    }

    TronkSound.play(newRecord ? "record" : "gameOver");

    overlay?.classList.remove("hidden");

    if (overlayTitle) {
      overlayTitle.textContent = newRecord ? `${title} ¡NUEVO RÉCORD!` : title;
    }

    if (overlayText) {
      const t1 = p1.alive ? time : p1.deathTime;
      const t2 = p2.alive ? time : p2.deathTime;
      overlayText.textContent = `${p1.label}: ${fmt(t1)} · ${p2.label}: ${fmt(t2)}. Récord: ${fmt(record)}.`;
    }

    updateHud();
    draw();
  }

  /* =======================================================
     ACTUALIZACIÓN
     ======================================================= */

  function updatePlayer(p, dt) {
    if (!p.alive) {
      return;
    }

    let dx = 0;
    let dy = 0;
    let speed = PLAYER_SPEED;

    if (p.isBot) {
      p.thinkTimer -= dt;

      if (p.thinkTimer <= 0) {
        botThink(p);
        p.thinkTimer = BOT_THINK_EVERY;

        // De vez en cuando se despista y tarda más en reaccionar.
        if (Math.random() < 0.08) {
          p.thinkTimer += rand(0.25, 0.5);
        }
      }

      dx = p.dirX;
      dy = p.dirY;
      speed *= BOT_SPEED_MUL;
    } else {
      if (keys.has(p.left)) dx -= 1;
      if (keys.has(p.right)) dx += 1;
      if (keys.has(p.up)) dy -= 1;
      if (keys.has(p.down)) dy += 1;

      // Joystick táctil: misma velocidad que el teclado,
      // solo aporta la dirección.
      const stick = sticks[p.id];

      if (stick) {
        dx += stick.x;
        dy += stick.y;
      }
    }

    const len = Math.hypot(dx, dy);
    p.moving = len > 0.01;

    if (p.moving) {
      dx /= len;
      dy /= len;
      p.x = clamp(p.x + dx * speed * dt, PLAYER_R, 1 - PLAYER_R);
      p.y = clamp(p.y + dy * speed * dt, PLAYER_R, 1 - PLAYER_R);
      p.phase += dt * 14;

      if (Math.abs(dx) > 0.2) {
        p.facing = dx > 0 ? 1 : -1;
      }
    } else {
      p.phase *= 0.8;
    }
  }

  function drillHitsPlayer(d, p) {
    const a = Math.atan2(d.vy, d.vx);
    const c = Math.cos(a);
    const s = Math.sin(a);

    // El cono se aproxima con 3 círculos: punta, centro y base.
    const parts = [
      [DRILL_LEN * 0.3, DRILL_WID * 0.18],
      [0, DRILL_WID * 0.36],
      [-DRILL_LEN * 0.28, DRILL_WID * 0.46]
    ];

    return parts.some(([off, r]) => Math.hypot(p.x - (d.x + c * off), p.y - (d.y + s * off)) < r + PLAYER_R);
  }

  function update(dt) {
    if (state === "countdown") {
      countdown -= dt;
      const n = Math.ceil(countdown);

      if (n !== lastCount && n > 0) {
        lastCount = n;
        TronkSound.play("countdown");
      }

      if (countdown <= 0) {
        state = "playing";
        TronkSound.play("go");
      }

      return;
    }

    if (state !== "playing") {
      return;
    }

    time += dt;

    // Nuevos taladros con el tiempo (primero aparece un aviso).
    if (extraIndex < EXTRA_DRILLS_AT.length && time >= EXTRA_DRILLS_AT[extraIndex]) {
      extraIndex++;

      let best = { x: 0.5, y: 0.5 };
      let bestDist = -1;

      for (let i = 0; i < 25; i++) {
        const c = { x: rand(0.15, 0.85), y: rand(0.15, 0.85) };
        const dist = Math.min(...players.filter((p) => p.alive).map((p) => Math.hypot(p.x - c.x, p.y - c.y)), 9);

        if (dist > bestDist) {
          bestDist = dist;
          best = c;
        }
      }

      pending.push({ x: best.x, y: best.y, timer: WARN_TIME });
      TronkSound.play("drillWarning");
      showMessage("¡CUIDADO! ¡OTRO TALADRO!", 1300);
    }

    for (let i = pending.length - 1; i >= 0; i--) {
      pending[i].timer -= dt;

      if (pending[i].timer <= 0) {
        drills.push(makeDrill(pending[i].x, pending[i].y));
        pending.splice(i, 1);
      }
    }

    // Taladros.
    const sp = drillSpeed();

    for (const d of drills) {
      d.x += d.vx * sp * dt;
      d.y += d.vy * sp * dt;
      d.spin += dt * (4 + sp * 6);
      d.bounceCooldown -= dt;

      let bounced = false;

      if (d.x < DRILL_BOUNCE_R) {
        d.x = DRILL_BOUNCE_R;
        d.vx = Math.abs(d.vx);
        bounced = true;
      } else if (d.x > 1 - DRILL_BOUNCE_R) {
        d.x = 1 - DRILL_BOUNCE_R;
        d.vx = -Math.abs(d.vx);
        bounced = true;
      }

      if (d.y < DRILL_BOUNCE_R) {
        d.y = DRILL_BOUNCE_R;
        d.vy = Math.abs(d.vy);
        bounced = true;
      } else if (d.y > 1 - DRILL_BOUNCE_R) {
        d.y = 1 - DRILL_BOUNCE_R;
        d.vy = -Math.abs(d.vy);
        bounced = true;
      }

      if (bounced) {
        // Pequeña variación del ángulo para que no repita siempre el mismo camino.
        const a = Math.atan2(d.vy, d.vx) + rand(-0.12, 0.12);
        d.vx = Math.cos(a);
        d.vy = Math.sin(a);

        // Evitar que quede casi horizontal o vertical (se atasca en línea recta).
        if (Math.abs(d.vx) < 0.25) d.vx = 0.25 * Math.sign(d.vx || 1);
        if (Math.abs(d.vy) < 0.25) d.vy = 0.25 * Math.sign(d.vy || 1);
        const n = Math.hypot(d.vx, d.vy);
        d.vx /= n;
        d.vy /= n;

        burst(sx(d.x - d.vx * 0.03), sy(d.y - d.vy * 0.03), "#ffd24a", 8, 0.8);

        if (d.bounceCooldown <= 0) {
          TronkSound.play("drillBounce");
          d.bounceCooldown = 0.08;
        }
      }
    }

    // Jugadores.
    for (const p of players) {
      updatePlayer(p, dt);
    }

    for (const p of players) {
      if (!p.alive) {
        continue;
      }

      if (drills.some((d) => drillHitsPlayer(d, p))) {
        killPlayer(p);

        if (state !== "playing") {
          return;
        }
      }
    }

    updateHud();
  }

  function updateEffects(ms) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += ms;
      p.x += p.vx * ms;
      p.y += p.vy * ms;
      p.vx *= 0.97;
      p.vy *= 0.97;

      if (p.life >= p.max) {
        particles.splice(i, 1);
      }
    }

    shake = Math.max(0, shake - ms);

    if (flashTimer > 0) {
      flashTimer -= ms;

      if (flashTimer <= 0) {
        flash?.classList.remove("active");
      }
    }

    if (messageTimer > 0) {
      messageTimer -= ms;

      if (messageTimer <= 0) {
        message?.classList.remove("visible");
      }
    }
  }

  /* =======================================================
     DIBUJAR
     ======================================================= */

  function draw() {
    if (S <= 1) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);

    if (shake > 0) {
      const k = (shake / 300) * 7;
      ctx.translate(rand(-k, k), rand(-k, k));
    }

    if (arenaLayer) {
      ctx.drawImage(arenaLayer, offX, offY, S, S);
    }

    const u = unit();

    // Avisos de taladro nuevo.
    for (const w of pending) {
      const pulse = 0.5 + 0.5 * Math.sin(w.timer * 18);
      ctx.fillStyle = `rgba(239,68,68,${0.15 + pulse * 0.25})`;
      ctx.strokeStyle = "rgba(239,68,68,.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx(w.x), sy(w.y), u * 0.07, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `900 ${Math.round(u * 0.06)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", sx(w.x), sy(w.y));
    }

    // Jugadores (los muertos primero, debajo).
    const ordered = [...players].sort((a, b) => (a.alive === b.alive ? a.y - b.y : a.alive ? 1 : -1));

    for (const p of ordered) {
      const h = u * 0.085;
      const x = sx(p.x);
      const y = sy(p.y) - h * 0.1;

      drawStickman(ctx, x, y, h, p.color, { dead: !p.alive, phase: p.phase, facing: p.facing });

      // Etiqueta encima.
      ctx.font = `800 ${Math.max(10, Math.round(u * 0.024))}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,.8)";
      ctx.strokeText(p.label, x, y - h * 0.62);
      ctx.fillStyle = p.alive ? p.color : "#9aa0a6";
      ctx.fillText(p.label, x, y - h * 0.62);
    }

    // Taladros.
    for (const d of drills) {
      const a = Math.atan2(d.vy, d.vx);

      // Estela.
      ctx.strokeStyle = "rgba(255,210,74,.18)";
      ctx.lineWidth = u * DRILL_WID * 0.7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx(d.x), sy(d.y));
      ctx.lineTo(sx(d.x - d.vx * 0.1), sy(d.y - d.vy * 0.1));
      ctx.stroke();

      drawDrill(ctx, sx(d.x), sy(d.y), a, u * DRILL_LEN, u * DRILL_WID, d.spin);
    }

    // Partículas.
    for (const p of particles) {
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Cuenta atrás.
    if (state === "countdown") {
      const n = Math.max(1, Math.ceil(countdown));
      const k = countdown - Math.floor(countdown);
      ctx.font = `900 ${Math.round(u * (0.2 + k * 0.08))}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(0,0,0,.8)";
      ctx.strokeText(String(n), width / 2, height / 2);
      ctx.fillStyle = "#fff";
      ctx.fillText(String(n), width / 2, height / 2);
    }

    ctx.restore();
  }

  function loop(now) {
    const ms = Math.min(40, now - lastTime || 16);
    lastTime = now;

    update(ms / 1000);
    updateEffects(ms);
    draw();

    if (state === "countdown" || state === "playing" || particles.length) {
      animationFrame = requestAnimationFrame(loop);
    }
  }

  /* =======================================================
     ABRIR / CERRAR
     ======================================================= */

  function openGame() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("antitronks-open");

    TronkSound.startMusic("tense");

    showMenu();
  }

  function closeGame() {
    state = "menu";
    cancelAnimationFrame(animationFrame);
    keys.clear();
    resetSticks();

    TronkSound.stopMusic();

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("antitronks-open");
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
  botButton?.addEventListener("click", () => startRound("bot"));
  duoButton?.addEventListener("click", () => startRound("duo"));

  const GAME_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

  window.addEventListener("keydown", (event) => {
    if (modal.classList.contains("hidden")) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === "escape") {
      closeGame();
      return;
    }

    if (GAME_KEYS.includes(key)) {
      keys.add(key);
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  window.addEventListener("blur", () => {
    keys.clear();
    resetSticks();
  });

  // Si cambias de app o de pestaña, nada se queda pulsado.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      keys.clear();
      resetSticks();
    }
  });

  window.addEventListener("resize", () => {
    if (modal.classList.contains("hidden")) {
      return;
    }

    resize();
    draw();
  });

  /* =======================================================
     CONTROLES TÁCTILES (joysticks)
     ======================================================= */

  const pads = Array.from(modal.querySelectorAll(".stickdrill-pad"));
  const padPointers = { 1: null, 2: null };
  const coarseQuery = window.matchMedia
    ? window.matchMedia("(hover: none) and (pointer: coarse)")
    : null;

  function setTouchMode(on) {
    if (touchMode === on) {
      return;
    }

    touchMode = on;
    modal.classList.toggle("stickdrill-touch-mode", on);

    if (!on) {
      resetSticks();
    }

    // Actualiza el texto del menú si está a la vista.
    if (state === "menu" && overlayText) {
      overlayText.textContent = introWithRecord();
    }

    // El campo cambia de tamaño: se recalcula tras aplicar el CSS.
    requestAnimationFrame(() => {
      if (!modal.classList.contains("hidden")) {
        resize();
        draw();
      }
    });
  }

  function setKnob(pad, px, py) {
    const knob = pad.querySelector(".stickdrill-knob");

    if (knob) {
      knob.style.setProperty("--kx", `${px}px`);
      knob.style.setProperty("--ky", `${py}px`);
    }
  }

  function moveStick(pad, player, clientX, clientY) {
    const rect = pad.getBoundingClientRect();
    const r = rect.width / 2;

    if (r <= 0) {
      return;
    }

    let x = (clientX - (rect.left + r)) / r;
    let y = (clientY - (rect.top + rect.height / 2)) / r;
    const len = Math.hypot(x, y);

    if (len > 1) {
      x /= len;
      y /= len;
    }

    setKnob(pad, x * r * 0.56, y * r * 0.56);

    const active = Math.hypot(x, y) >= STICK_DEADZONE;
    sticks[player].x = active ? x : 0;
    sticks[player].y = active ? y : 0;
  }

  function releaseStick(pad, player) {
    const id = padPointers[player];
    padPointers[player] = null;

    sticks[player].x = 0;
    sticks[player].y = 0;
    pad.classList.remove("active");
    setKnob(pad, 0, 0);

    if (id !== null) {
      try {
        pad.releasePointerCapture(id);
      } catch {
        // El dedo ya no estaba capturado.
      }
    }
  }

  function resetSticks() {
    for (const pad of pads) {
      releaseStick(pad, Number(pad.dataset.player));
    }
  }

  for (const pad of pads) {
    const player = Number(pad.dataset.player);

    if (!sticks[player]) {
      continue;
    }

    pad.addEventListener("pointerdown", (event) => {
      // Un solo dedo por joystick; los demás dedos van al otro.
      if (padPointers[player] !== null) {
        return;
      }

      event.preventDefault();
      padPointers[player] = event.pointerId;

      try {
        // Sigue funcionando aunque el dedo salga del círculo.
        pad.setPointerCapture(event.pointerId);
      } catch {
        // Navegador sin captura de puntero.
      }

      pad.classList.add("active");
      moveStick(pad, player, event.clientX, event.clientY);
    });

    pad.addEventListener("pointermove", (event) => {
      if (event.pointerId !== padPointers[player]) {
        return;
      }

      event.preventDefault();
      moveStick(pad, player, event.clientX, event.clientY);
    });

    const end = (event) => {
      if (event.pointerId !== padPointers[player]) {
        return;
      }

      releaseStick(pad, player);
    };

    pad.addEventListener("pointerup", end);
    pad.addEventListener("pointercancel", end);
    pad.addEventListener("lostpointercapture", end);
    pad.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  // Detecta si se está jugando con el dedo o con ratón.
  const detectPointer = (event) => {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      setTouchMode(true);
    } else if (event.pointerType === "mouse") {
      setTouchMode(Boolean(coarseQuery && coarseQuery.matches));
    }
  };

  card.addEventListener("pointerdown", detectPointer);
  modal.addEventListener("pointerdown", detectPointer, true);

  // Safari (iOS): evita el zoom con dos dedos dentro del juego.
  modal.addEventListener("gesturestart", (event) => event.preventDefault());

  // Recalcula el campo al girar el móvil o al mostrar la barra del navegador.
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (modal.classList.contains("hidden")) {
        return;
      }

      resize();
      draw();
    }).observe(game);
  }

  setTouchMode(Boolean(coarseQuery && coarseQuery.matches));

  showMenu();
}
