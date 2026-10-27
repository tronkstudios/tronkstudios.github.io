/* TronkStudios · js/mascot.js
   Mascota 3D: un robot con casco estilo Tron y cuerpo de «clanker».
   - Al pulsarlo se abre el chat de Tronker.
   - Tiene vida propia: flota, parpadea, sigue el ratón, saluda,
     mira alrededor, se duerme si no haces nada...
   - Te ve jugar: los minijuegos le avisan con TronkMascot.react()
     y comenta («¡Muy buena!», «¡Por los pelos!»...).
   Three.js está en js/vendor (se carga cuando la página ya está lista,
   para no frenar la web). Es un módulo, pero no exporta nada: los demás
   scripts usan window.TronkMascot. */

const HIDE_KEY = "tronk-mascot";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================================================
   FRASES
   ========================================================= */

const LINES = {
  hello: ["¿Qué pasa, Tronk?"],
  hover: ["¿Necesitas algo?", "Púlsame si tienes dudas."],
  wake: ["Ups, me había dormido."],
  start: ["¡Vamos!", "A ver qué tal."],
  great: ["¡Buena!", "¡Muy buena!", "¡Bien ahí!", "¡Limpio!"],
  combo: ["¡Vas fino!", "¡Menuda racha!", "¡Imparable!"],
  close: ["¡Por los pelos!", "¡Uf, casi!", "¡Qué cerca!"],
  oops: ["¡Que era un civil!", "Ese no, ese no."],
  hurt: ["¡Au!", "Tranqui, sigue."],
  lastLife: ["¡Última vida!", "Cuidado, te queda una."],
  special: ["¡Especial!", "¡Toma ya!"],
  record: ["¡Nuevo récord!"],
  gameover: ["Buena partida.", "¿Otra?", "Casi."],
  win: ["¡Victoria!", "¡Ganaste!"],
  lose: ["Casi. ¿Revancha?", "La próxima."],
  roundWin: ["¡Ronda tuya!"],
  roundLose: ["Venga, la siguiente."]
};

// Lo que comenta según la sección o tarjeta que tenga el ratón encima
const AREA_LINES = {
  hero: ["Esta es la web de TronkStudios.", "Más abajo tienes los juegos y los minijuegos."],
  desarrollo: ["Estos son los juegos que estamos haciendo.", "Pulsa una tarjeta para ver la ficha completa."],
  "project:z-tronks": ["Z Tronks: zombis, misiones y cuatro clases.", "Añádelo a deseados y te aviso cuando salga."],
  "project:the-sundered-sky": ["The Sundered Sky: islas flotantes y barcos voladores.", "Todavía no tiene fecha, pero va avanzando."],
  juegos: ["Aquí saldrán los juegos ya terminados.", "De momento está vacío, pero no por mucho tiempo."],
  roblox: ["Aquí verás los juegos de Roblox con jugadores en directo.", "Cuando salga Z Tronks, aparecerá aquí."],
  minijuegos: ["Todos se juegan aquí mismo, gratis.", "Con la sesión iniciada, tus récords salen en la clasificación."],
  "game:antitronks": ["Antitronks: ojo con los civiles.", "Disparar a la cabeza da el doble de puntos."],
  "game:antininja": ["Protect Mogos: que no lleguen al castillo.", "Cuanto más aguantas, más rápidos van."],
  "game:stickdrill": ["Stick Drill: esquiva el taladro.", "Se puede jugar contra un amigo en el mismo teclado."],
  "game:tronkfight": ["Tronk Fight: siete luchadores para elegir.", "Llena la barra y usa el ataque especial."],
  "game:miente": ["El Juego Miente: no te fíes de nada.", "Lee bien la regla antes de pulsar."],
  challenges: ["Cada partida tuya suma a la barra del reto.", "Si se supera el reto, os llega un aviso a todos."],
  leaderboard: ["A ver quién va primero.", "Solo cuentan las partidas con la sesión iniciada."],
  sugerencias: ["Aquí la comunidad propone ideas.", "Puedes votar las ideas que más te gusten."],
  suggestion: ["Si te gusta esta idea, vótala.", "El equipo responde a las ideas por aquí."],
  galeria: ["Aquí salen los dibujos de la comunidad.", "¿Dibujas? Sube el tuyo, que el equipo lo revisa."],
  polls: ["Vota en la encuesta, que el equipo la mira."],
  novedades: ["Aquí el equipo cuenta en qué está trabajando."],
  videos: ["Estos son los últimos vídeos del canal.", "Los Shorts nuevos salen aquí solos."],
  "sobre-nosotros": ["Aquí te contamos quiénes somos.", "Un poco más abajo está cómo empezó todo."],
  journey: ["Pulsa la flecha para ver la siguiente parte."],
  join: ["Si dibujas, haces música o programas, escríbenos.", "Elige lo tuyo y te sale el formulario."]
};

// De lo más concreto (una tarjeta) a lo más general (la sección)
const AREA_SELECTORS = [
  ["[data-minigame]", (el) => `game:${el.dataset.minigame}`],
  ["[data-project]", (el) => `project:${el.dataset.project}`],
  [".challenge-card, #challenges", () => "challenges"],
  [".leaderboard", () => "leaderboard"],
  [".poll-card, #polls", () => "polls"],
  [".suggestion-card", () => "suggestion"],
  [".join, .join-card", () => "join"],
  ["#videos, #shorts", () => "videos"],
  [".journey, #journey", () => "journey"],
  [".hero", () => "hero"],
  ["main .section[id]", (el) => el.id]
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Qué hace el robot con cada cosa que pasa en un juego
const REACTIONS = {
  start: { mood: "happy", act: "wave", time: 1800 },
  great: { mood: "happy", act: "jump", time: 1400 },
  combo: { mood: "excited", act: "spin", time: 1800 },
  close: { mood: "worried", act: "shake", time: 1600 },
  oops: { mood: "surprised", act: "shake", time: 1600 },
  hurt: { mood: "worried", act: "nod", time: 1400 },
  lastLife: { mood: "worried", act: "shake", time: 1800, priority: true },
  special: { mood: "excited", act: "cheer", time: 1400 },
  record: { mood: "excited", act: "cheer", time: 3200, priority: true },
  gameover: { mood: "sad", act: "nod", time: 2600, priority: true },
  win: { mood: "excited", act: "cheer", time: 3200, priority: true },
  lose: { mood: "sad", act: "nod", time: 2600, priority: true },
  roundWin: { mood: "happy", act: "jump", time: 1800, priority: true },
  roundLose: { mood: "worried", act: "nod", time: 1800, priority: true }
};

/* =========================================================
   DOM: contenedor, lienzo y bocadillo
   ========================================================= */

// El robot ya viene en index.html (con su imagen), para que salga al
// instante; aquí solo se le añade el lienzo 3D.
const root = document.getElementById("mascot");
const button = root.querySelector(".mascot-button");
const bubble = root.querySelector(".mascot-bubble");
const hideButton = root.querySelector(".mascot-hide");

const canvas = document.createElement("canvas");
canvas.className = "mascot-canvas";
canvas.setAttribute("aria-hidden", "true");
button.appendChild(canvas);

/* =========================================================
   ESTADO
   ========================================================= */

const state = {
  ready: false,
  hidden: false,
  inGame: false,
  mood: "normal",
  moodUntil: 0,
  actions: [],
  sleeping: false,
  lastInput: performance.now(),
  nextIdle: performance.now() + 6000,
  nextBlink: performance.now() + 2500,
  blinkStart: -1,
  lastBubble: -Infinity,
  pointer: { x: 0, y: 0, has: false },
  look: { x: 0, y: 0 },
  combo: 0
};

let bubbleTimer = 0;

function say(text, ms = 2600) {
  if (!text || state.hidden) {
    return;
  }

  bubble.textContent = text;
  bubble.classList.remove("is-visible");
  // Reinicia la animación de entrada
  void bubble.offsetWidth;
  bubble.classList.add("is-visible");
  state.lastBubble = performance.now();

  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove("is-visible"), ms);
}

function setMood(mood, ms = 1600) {
  state.mood = mood;
  state.moodUntil = performance.now() + ms;
}

function act(name) {
  if (reduceMotion && ["spin", "jump", "flip", "boost", "dance"].includes(name)) {
    name = "nod";
  }

  const durations = {
    wave: 1600, jump: 750, spin: 1100, shake: 700, cheer: 1300, nod: 700, look: 2600, stretch: 1600,
    dance: 2600, flip: 1150, think: 2400, shrug: 1200, salute: 1500, boost: 1500, wiggle: 900,
    scan: 1300, point: 2200, peek: 1800
  };
  state.actions.push({ name, start: performance.now(), dur: durations[name] || 1000 });
}

function touch() {
  state.lastInput = performance.now();

  if (state.sleeping) {
    state.sleeping = false;
    setMood("surprised", 1200);
    act("jump");

    if (!state.inGame && Math.random() < 0.6) {
      say(pick(LINES.wake));
    }
  }
}

/* =========================================================
   API PARA EL RESTO DE LA WEB
   ========================================================= */

let lastReaction = -Infinity;

const TronkMascot = {
  say,

  // Para probar una animación: TronkMascot.act("dance")
  act,

  // Lo llaman los minijuegos: react("great"), react("close"), react("record")...
  react(type, text) {
    const reaction = REACTIONS[type];

    if (!reaction || state.hidden) {
      return;
    }

    const now = performance.now();

    // Que no hable sin parar: entre comentarios normales hay una pausa
    if (!reaction.priority && now - lastReaction < 2600) {
      return;
    }

    lastReaction = now;
    touch();
    setMood(reaction.mood, reaction.time);
    act(reaction.act);
    say(text || pick(LINES[type]), Math.max(1600, reaction.time));
  }
};

window.TronkMascot = TronkMascot;

/* =========================================================
   MOSTRAR / OCULTAR
   ========================================================= */

function footerToggle() {
  let link = document.getElementById("mascot-show");

  if (!link) {
    const footer = document.querySelector(".footer-actions");

    if (!footer) {
      return;
    }

    link = document.createElement("button");
    link.type = "button";
    link.id = "mascot-show";
    link.className = "shortcuts-hint";
    link.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-bot"></use></svg> <span>Mostrar a Tronker</span>';
    link.addEventListener("click", () => setHidden(false));
    footer.prepend(link);
  }

  link.hidden = !state.hidden;
}

function setHidden(hidden) {
  state.hidden = hidden;
  root.hidden = hidden;

  try {
    localStorage.setItem(HIDE_KEY, hidden ? "off" : "on");
  } catch {
    // Sin almacenamiento: dura hasta recargar
  }

  footerToggle();

  if (!hidden) {
    setMood("happy", 1500);
    act("wave");
    say("¿Qué pasa, Tronk?");
  }
}

try {
  state.hidden = localStorage.getItem(HIDE_KEY) === "off";
} catch {
  state.hidden = false;
}

root.hidden = state.hidden;

/* =========================================================
   EVENTOS
   ========================================================= */

button.addEventListener("click", () => {
  if (state.inGame) {
    return;
  }

  touch();
  setMood("happy", 1200);
  act(pick(["jump", "jump", "flip", "wiggle"]));

  if (typeof window.openTronkerChat === "function") {
    window.openTronkerChat();
  }
});

let lastHoverLine = -Infinity;

button.addEventListener("pointerenter", (event) => {
  if (event.pointerType !== "mouse" || state.inGame) {
    return;
  }

  touch();
  act("wave");
  setMood("happy", 1600);

  if (performance.now() - lastHoverLine > 20000) {
    lastHoverLine = performance.now();
    say(pick(LINES.hover));
  }
});

hideButton.addEventListener("click", (event) => {
  event.stopPropagation();
  setHidden(true);
});

window.addEventListener("pointermove", (event) => {
  state.pointer.x = event.clientX;
  state.pointer.y = event.clientY;
  state.pointer.has = true;

  if (performance.now() - state.lastInput > 400) {
    touch();
  }
}, { passive: true });

["keydown", "scroll", "touchstart"].forEach((name) => {
  window.addEventListener(name, touch, { passive: true });
});

/* ----- Dentro de los minijuegos: se hace pequeño y mira ----- */

function updateGameMode() {
  const open = document.querySelector(".antitronks-modal:not(.hidden)");
  const wasInGame = state.inGame;
  state.inGame = Boolean(open);
  root.classList.toggle("in-game", state.inGame);
  // Cada juego puede ponerlo en un sitio distinto (ver css: .mascot[data-game])
  root.dataset.game = open ? open.id.replace("-modal", "") : "";

  // A pantalla completa solo se ve lo de dentro del juego: el robot se mete dentro
  const full = document.fullscreenElement || document.webkitFullscreenElement;
  const parent = full && full.contains(open || full) ? full : document.body;

  if (root.parentElement !== parent) {
    parent.appendChild(root);
  }

  if (state.inGame && !wasInGame) {
    state.combo = 0;
    setTimeout(() => TronkMascot.react("start"), 600);
  }

  resize();
}

function watchGame(modal) {
  new MutationObserver(updateGameMode).observe(modal, { attributes: true, attributeFilter: ["class"] });
}

function watchGames() {
  document.querySelectorAll(".antitronks-modal").forEach(watchGame);
  // Los minijuegos se cargan al abrirlos (js/games/loader.js)
  document.addEventListener("tronk:game-added", (event) => {
    event.detail.root.querySelectorAll(".antitronks-modal").forEach(watchGame);
  });

  document.addEventListener("fullscreenchange", updateGameMode);
  document.addEventListener("webkitfullscreenchange", updateGameMode);
}

/* ----- Comentarios según la sección que tiene el ratón ----- */

const area = { key: "", since: 0, rolled: false };
const usedLines = new Set();

function areaAt(element) {
  if (!element || !element.closest || root.contains(element)) {
    return "";
  }

  for (const [selector, key] of AREA_SELECTORS) {
    const found = element.closest(selector);

    if (found) {
      return key(found);
    }
  }

  return "";
}

function watchAreas() {
  let lastCheck = 0;

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || performance.now() - lastCheck < 200) {
      return;
    }

    lastCheck = performance.now();
    const key = areaAt(event.target);

    if (key !== area.key) {
      area.key = key;
      area.since = performance.now();
      area.rolled = false;
    }
  }, { passive: true });

  // Si el ratón se queda un rato en el mismo sitio, hay una probabilidad de que hable
  setInterval(() => {
    const now = performance.now();

    if (
      !area.key || area.rolled || now - area.since < 1300 ||
      state.inGame || state.hidden || state.sleeping ||
      document.querySelector(".modal:not(.hidden)") ||
      now - state.lastBubble < 14000
    ) {
      return;
    }

    area.rolled = true;
    const lines = (AREA_LINES[area.key] || []).filter((line) => !usedLines.has(line));

    if (!lines.length || Math.random() > 0.4) {
      return;
    }

    const line = pick(lines);
    usedLines.add(line);
    setMood("happy", 1800);
    act("point");
    say(line, 3200);
  }, 500);
}

/* =========================================================
   ESCENA 3D
   ========================================================= */

let THREE = null;
let renderer = null;
let scene = null;
let camera = null;
let parts = null;

function resize() {
  if (!renderer) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, state.inGame ? 1.5 : 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// Caja con bordes redondeados (para el pecho y la cadera)
function roundedBox(width, height, depth, radius, material) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  const bevel = Math.min(radius, depth / 2) * 0.6;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 10
  });

  geometry.center();
  return new THREE.Mesh(geometry, material);
}

// Sombra suave en el suelo (degradado dibujado en un lienzo)
function shadowTexture() {
  const size = 128;
  const paint = document.createElement("canvas");
  paint.width = size;
  paint.height = size;

  const ctx = paint.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(0,0,0,0.55)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(paint);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildRobot() {
  const NEON = 0x37e6ff;

  const mat = {
    helmet: new THREE.MeshStandardMaterial({ color: 0x1b2638, metalness: 0.6, roughness: 0.24 }),
    visor: new THREE.MeshStandardMaterial({ color: 0x02050b, metalness: 0.9, roughness: 0.08 }),
    neon: new THREE.MeshBasicMaterial({ color: NEON }),
    eye: new THREE.MeshBasicMaterial({ color: NEON }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8e98a8, metalness: 0.8, roughness: 0.32 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x3a4250, metalness: 0.75, roughness: 0.38 }),
    plate: new THREE.MeshStandardMaterial({ color: 0xb6bfcc, metalness: 0.7, roughness: 0.28 }),
    rivet: new THREE.MeshStandardMaterial({ color: 0x5b6474, metalness: 0.9, roughness: 0.25 }),
    jet: new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
  };

  const robot = new THREE.Group();

  /* ---------- Cabeza estilo Tron ---------- */
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.62, 0);
  robot.add(headPivot);

  const head = new THREE.Group();
  head.position.y = 0.46;
  headPivot.add(head);

  const R = 0.5;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), mat.helmet);
  helmet.scale.set(1.08, 0.94, 1);
  head.add(helmet);

  // Visor: media esfera negra brillante por delante
  // (phi = π/2 es el frente; theta va de arriba a abajo)
  const VISOR_TOP = Math.PI * 0.3;
  const VISOR_BOTTOM = Math.PI * 0.66;
  const VISOR_WIDE = Math.PI * 0.72;
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.012, 48, 20, Math.PI / 2 - VISOR_WIDE / 2, VISOR_WIDE, VISOR_TOP, VISOR_BOTTOM - VISOR_TOP),
    mat.visor
  );
  visor.scale.copy(helmet.scale);
  head.add(visor);

  // Líneas de neón: bordes de arriba y abajo del visor...
  [VISOR_TOP, VISOR_BOTTOM].forEach((theta) => {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(R * 1.02 * Math.sin(theta), 0.013, 8, 48, VISOR_WIDE),
      mat.neon
    );
    rim.scale.set(helmet.scale.x, 1, helmet.scale.z);
    rim.rotation.set(Math.PI / 2, 0, Math.PI / 2 - VISOR_WIDE / 2);
    rim.position.y = R * 1.02 * Math.cos(theta) * helmet.scale.y;
    head.add(rim);
  });

  // ...y cresta: de la frente (encima del visor) hacia la nuca
  const CREST_START = -0.25;
  const CREST_END = Math.PI - VISOR_TOP * 1.15;
  const crest = new THREE.Mesh(new THREE.TorusGeometry(R * 1.025, 0.016, 8, 64, CREST_END - CREST_START), mat.neon);
  crest.scale.copy(helmet.scale);
  crest.rotation.set(0, Math.PI / 2, CREST_START);
  head.add(crest);

  const lowerRing = new THREE.Mesh(new THREE.TorusGeometry(R * 0.84, 0.012, 8, 48), mat.neon);
  lowerRing.rotation.x = Math.PI / 2;
  lowerRing.position.y = -0.28;
  head.add(lowerRing);

  // Orejas: discos con un anillo de luz
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 28), mat.darkMetal);
    ear.rotation.z = Math.PI / 2;
    ear.position.set(side * R * 1.07, -0.02, 0);
    head.add(ear);

    const earRing = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 28), mat.neon);
    earRing.rotation.y = Math.PI / 2;
    earRing.position.set(side * (R * 1.07 + 0.052), -0.02, 0);
    head.add(earRing);
  });

  // Ojos (normales, felices ^ ^ y cerrados), en el visor
  const face = new THREE.Group();
  face.position.set(0, 0.02, R * 0.985);
  head.add(face);

  const eyes = [];
  const happyEyes = [];

  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.12, 6, 12), mat.eye);
    eye.rotation.z = Math.PI / 2;
    eye.position.set(side * 0.17, 0.02, 0);
    face.add(eye);
    eyes.push(eye);

    const happy = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 20, Math.PI), mat.eye);
    happy.position.set(side * 0.17, 0.0, 0);
    happy.visible = false;
    face.add(happy);
    happyEyes.push(happy);
  });

  // Boca de luz: sonrisa, recta u «o»
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 20, Math.PI), mat.eye);
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.12, -0.02);
  face.add(smile);

  const mouthO = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 8, 20), mat.eye);
  mouthO.position.set(0, -0.15, -0.02);
  mouthO.visible = false;
  face.add(mouthO);

  const flat = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.1, 4, 8), mat.eye);
  flat.rotation.z = Math.PI / 2;
  flat.position.set(0, -0.15, -0.02);
  flat.visible = false;
  face.add(flat);

  // Barra del escáner (efecto Tron): barre el visor de lado a lado
  const scanBar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.34, 0.01), mat.neon);
  scanBar.position.set(0, 0.02, 0.01);
  scanBar.visible = false;
  face.add(scanBar);

  // Antena con luz, en un pivote para que rebote al mover la cabeza
  const antennaPivot = new THREE.Group();
  antennaPivot.position.set(0.17, R * 0.9, -0.05);
  antennaPivot.rotation.z = -0.25;
  head.add(antennaPivot);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.26, 10), mat.darkMetal);
  antenna.position.y = 0.13;
  antennaPivot.add(antenna);

  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: NEON }));
  antennaTip.position.y = 0.28;
  antennaPivot.add(antennaTip);

  // Cuello de anillos
  for (let i = 0; i < 3; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12 - i * 0.008, 0.035, 10, 24), i % 2 ? mat.darkMetal : mat.metal);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.04 + i * 0.06;
    headPivot.add(ring);
  }

  /* ---------- Cuerpo de clanker ---------- */
  const torso = new THREE.Group();
  robot.add(torso);

  const chest = roundedBox(0.95, 0.78, 0.6, 0.14, mat.metal);
  chest.position.y = 0.24;
  torso.add(chest);

  const plate = roundedBox(0.62, 0.46, 0.06, 0.08, mat.plate);
  plate.position.set(0, 0.27, 0.31);
  torso.add(plate);

  // Logo «T» de luz en el pecho
  const tTop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.02), mat.neon);
  tTop.position.set(0, 0.37, 0.35);
  const tStem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.02), mat.neon);
  tStem.position.set(0, 0.24, 0.35);
  torso.add(tTop, tStem);

  // Remaches
  [[-0.38, 0.55], [0.38, 0.55], [-0.38, -0.07], [0.38, -0.07]].forEach(([x, y]) => {
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat.rivet);
    rivet.position.set(x, y, 0.3);
    torso.add(rivet);
  });

  // Rejilla de ventilación en los lados
  [-1, 1].forEach((side) => {
    for (let i = 0; i < 3; i += 1) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.36), mat.darkMetal);
      slot.position.set(side * 0.485, 0.14 + i * 0.1, 0);
      torso.add(slot);
    }
  });

  // Cintura de anillos (acordeón) y cadera
  for (let i = 0; i < 3; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24 - i * 0.02, 0.05, 10, 28), i % 2 ? mat.metal : mat.darkMetal);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.2 - i * 0.07;
    torso.add(ring);
  }

  const hips = roundedBox(0.62, 0.22, 0.46, 0.08, mat.darkMetal);
  hips.position.y = -0.46;
  torso.add(hips);

  const hipLine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.02), mat.neon);
  hipLine.position.set(0, -0.46, 0.235);
  torso.add(hipLine);

  // Propulsor: tobera y llama de luz
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.14, 24, 1, true), mat.darkMetal);
  nozzle.position.y = -0.63;
  torso.add(nozzle);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 20, 1, true), mat.jet);
  flame.rotation.x = Math.PI;
  flame.position.y = -0.9;
  torso.add(flame);

  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xe8fdff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  flameCore.rotation.x = Math.PI;
  flameCore.position.y = -0.82;
  torso.add(flameCore);

  /* ---------- Brazos articulados con pinzas ---------- */
  const arms = [];

  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.58, 0.48, 0);
    torso.add(shoulder);

    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), mat.darkMetal);
    shoulder.add(joint);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.3, 14), mat.metal);
    upper.position.y = -0.2;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.37;
    shoulder.add(elbow);

    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), mat.darkMetal);
    elbow.add(elbowJoint);

    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.26, 14), mat.metal);
    fore.position.y = -0.16;
    elbow.add(fore);

    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 20), mat.neon);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.26;
    elbow.add(cuff);

    const hand = new THREE.Group();
    hand.position.y = -0.33;
    elbow.add(hand);

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.1), mat.darkMetal);
    hand.add(palm);

    [-1, 1].forEach((f) => {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.05), mat.metal);
      finger.position.set(f * 0.045, -0.09, 0);
      finger.rotation.z = f * 0.18;
      hand.add(finger);
    });

    arms.push({ shoulder, elbow, side });
  });

  /* ---------- Sombra ---------- */
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.4),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.32;

  scene.add(robot, shadow);

  return {
    robot, headPivot, head, eyes, happyEyes, smile, mouthO, flat, face,
    antennaTip, antennaPivot, torso, flame, flameCore, arms, shadow, mat, NEON, scanBar
  };
}

async function init3d() {
  try {
    THREE = await import("./vendor/three.module.min.js");
  } catch (error) {
    console.warn("TronkStudios: no se pudo cargar la mascota 3D; se queda la imagen.", error);
    root.classList.add("is-still");
    return;
  }

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  } catch {
    // Sin WebGL se queda la imagen del robot
    root.classList.add("is-still");
    return;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 0.45, 7.1);
  camera.lookAt(0, 0.32, 0);

  scene.add(new THREE.HemisphereLight(0xdbe8ff, 0x10182a, 1.4));

  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(2.5, 3.5, 4);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x37c8ff, 3.2);
  rim.position.set(-3, 1.5, -2.5);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0x9fb6ff, 0.8);
  fill.position.set(-2, -1, 3);
  scene.add(fill);

  parts = buildRobot();

  resize();
  new ResizeObserver(resize).observe(canvas);

  state.ready = true;
  root.classList.remove("is-loading");
  requestAnimationFrame(loop);

  // Saludo la primera vez en esta sesión
  try {
    if (!sessionStorage.getItem("tronk-mascot-hello")) {
      sessionStorage.setItem("tronk-mascot-hello", "1");
      setTimeout(() => {
        if (!state.inGame) {
          setMood("happy", 2000);
          act("wave");
          say(pick(LINES.hello), 3200);
        }
      }, 1800);
    }
  } catch {
    // Nada
  }
}

/* =========================================================
   ANIMACIÓN
   ========================================================= */

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// Acerca «current» a «target» de forma suave, igual a cualquier velocidad de pantalla
const damp = (current, target, speed, dt) => current + (target - current) * (1 - Math.exp(-speed * dt));

// Fotogramas clave: kf(p, [[0, 0], [0.3, 1], [1, 0]]) con transiciones suaves
function kf(p, keys) {
  if (p <= keys[0][0]) {
    return keys[0][1];
  }

  for (let i = 0; i < keys.length - 1; i += 1) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];

    if (p <= t1) {
      const local = (p - t0) / (t1 - t0 || 1);
      return lerp(v0, v1, 0.5 - 0.5 * Math.cos(Math.PI * local));
    }
  }

  return keys[keys.length - 1][1];
}

// Entra, se mantiene y sale (para mezclar un gesto con la postura normal)
const hold = (p, inEnd = 0.2, outStart = 0.8) => kf(p, [[0, 0], [inEnd, 1], [outStart, 1], [1, 0]]);
const TAU = Math.PI * 2;

/* Cada animación devuelve cuánto se mueve el cuerpo y la cabeza y a qué
   postura van los brazos (L = izquierda de la pantalla, R = derecha). */
const ACTIONS = {
  wave(p) {
    const w = hold(p, 0.15, 0.82);
    return {
      R: { z: 2.25, fwd: 0.3, bend: 0.45, swing: Math.sin(p * Math.PI * 9) * 0.55 * w, w },
      hz: 0.12 * w,
      hy: 0.12 * w,
      rz: -0.05 * w
    };
  },

  jump(p, { motion }) {
    const arms = { z: kf(p, [[0, 0.22], [0.18, 0.1], [0.42, 1.4], [0.78, 0.7], [1, 0.22]]), bend: 0.35, w: hold(p, 0.08, 0.9) };
    return {
      y: kf(p, [[0, 0], [0.18, -0.08], [0.45, 0.45 * motion], [0.78, 0.04], [0.86, -0.06], [1, 0]]),
      sq: kf(p, [[0, 0], [0.18, -0.13], [0.3, 0.1], [0.6, 0.02], [0.86, -0.11], [0.95, 0.02], [1, 0]]),
      hx: kf(p, [[0, 0], [0.18, 0.14], [0.45, -0.14], [0.86, 0.12], [1, 0]]),
      L: arms,
      R: arms
    };
  },

  spin(p) {
    const arms = { z: 1.15, bend: 0.2, w: hold(p, 0.2, 0.8) };
    return {
      spinY: kf(p, [[0, 0], [0.15, -0.35], [0.85, TAU + 0.12], [1, TAU]]),
      y: kf(p, [[0, 0], [0.15, -0.04], [0.5, 0.22], [0.85, 0], [1, 0]]),
      sq: kf(p, [[0, 0], [0.15, -0.06], [0.5, 0.04], [0.88, -0.06], [1, 0]]),
      L: arms,
      R: arms
    };
  },

  shake(p) {
    const decay = 1 - p;
    return {
      hy: Math.sin(p * Math.PI * 6) * 0.5 * decay,
      hz: Math.sin(p * Math.PI * 6 + 1) * 0.1 * decay,
      rz: Math.sin(p * Math.PI * 6) * 0.05 * decay
    };
  },

  cheer(p, { motion }) {
    const w = hold(p, 0.15, 0.85);
    const pump = 0.25 + Math.abs(Math.sin(p * Math.PI * 4)) * 0.7;
    const arms = { z: 2.65, fwd: 0.15, bend: pump, w };
    const hop = Math.abs(Math.sin(p * Math.PI * 4));
    return {
      y: hop * 0.24 * motion * w,
      sq: (hop < 0.25 ? -0.08 : 0.04) * w,
      hx: -0.15 * w,
      L: arms,
      R: arms
    };
  },

  nod(p) {
    return { hx: kf(p, [[0, 0], [0.2, 0.32], [0.4, -0.06], [0.6, 0.26], [0.8, -0.04], [1, 0]]) };
  },

  look(p) {
    const hy = kf(p, [[0, 0], [0.15, 0.75], [0.4, 0.75], [0.58, -0.75], [0.82, -0.75], [1, 0]]);
    return { hy, ry: hy * 0.25, hx: -0.08 * hold(p, 0.15, 0.85) };
  },

  stretch(p) {
    const w = hold(p, 0.3, 0.72);
    const arms = { z: 2.95, fwd: 0.1, bend: 0.05, w };
    return { y: 0.14 * w, sq: 0.07 * w, hx: -0.32 * w, L: arms, R: arms };
  },

  dance(p, { motion }) {
    const w = hold(p, 0.1, 0.9);
    const beat = p * 8;
    const bounce = Math.abs(Math.sin(beat * Math.PI));
    const side = Math.sin(beat * Math.PI);
    return {
      y: bounce * 0.12 * motion * w,
      sq: (bounce - 0.5) * 0.06 * w,
      rz: side * 0.13 * w,
      ry: Math.sin(beat * Math.PI / 2) * 0.45 * w,
      hz: -side * 0.16 * w,
      hx: bounce * 0.1 * w,
      L: { z: 1.05 + side * 0.85, fwd: 0.35, bend: 1.15 - side * 0.5, w },
      R: { z: 1.05 - side * 0.85, fwd: 0.35, bend: 1.15 + side * 0.5, w }
    };
  },

  flip(p, { motion }) {
    const arms = {
      z: kf(p, [[0, 0.22], [0.15, 0.05], [0.3, 2.4], [0.55, 1.2], [0.85, 1.6], [1, 0.22]]),
      bend: kf(p, [[0, 0.3], [0.35, 0.4], [0.55, 1.6], [0.8, 0.4], [1, 0.3]]),
      w: hold(p, 0.08, 0.92)
    };
    return {
      y: kf(p, [[0, 0], [0.15, -0.1], [0.5, 0.5 * motion], [0.85, 0.04], [0.92, -0.07], [1, 0]]),
      spinX: -TAU * ease(clamp01((p - 0.18) / 0.62)),
      sq: kf(p, [[0, 0], [0.15, -0.15], [0.25, 0.1], [0.82, 0], [0.92, -0.13], [1, 0]]),
      boost: kf(p, [[0, 0], [0.2, 1.3], [0.45, 0.4], [1, 0]]),
      L: arms,
      R: arms
    };
  },

  think(p) {
    const w = hold(p, 0.2, 0.85);
    return {
      // Mano en la mandíbula (con golpecitos), con el codo por delante
      // del pecho; el otro brazo recogido delante de la tripa.
      R: { z: -0.2, fwd: 1.5, bend: 0.85 + Math.sin(p * Math.PI * 7) * 0.08 * w, swing: -0.6, w },
      L: { z: -0.35, fwd: 0.75, bend: 1.3, swing: 0, w: w * 0.7 },
      hz: -0.18 * w,
      hy: 0.25 * w,
      hx: -0.14 * w,
      ry: -0.12 * w
    };
  },

  shrug(p) {
    const w = kf(p, [[0, 0], [0.22, 1], [0.32, 0.92], [0.72, 1], [1, 0]]);
    const arms = { z: 0.85, fwd: 0.15, bend: 1.4, swing: 0.2, w };
    return { y: 0.05 * w, sq: 0.03 * w, hz: 0.25 * w, hx: 0.05 * w, L: arms, R: arms };
  },

  salute(p) {
    const w = kf(p, [[0, 0], [0.16, 1.05], [0.24, 1], [0.8, 1], [1, 0]]);
    return {
      // Codo arriba y fuera, mano en la sien
      R: { z: 2.55, fwd: -0.3, bend: 1.3, swing: 1.2, w: Math.min(1, w) },
      y: kf(p, [[0, 0], [0.16, 0.06], [0.3, 0], [1, 0]]),
      hx: -0.06 * Math.min(1, w),
      rz: 0
    };
  },

  boost(p, { motion }) {
    const w = hold(p, 0.15, 0.85);
    const arms = { z: 0.5, fwd: -0.5, bend: 0.2, w };
    return {
      y: kf(p, [[0, 0], [0.15, -0.08], [0.45, 0.42 * motion], [0.7, 0.38 * motion], [1, 0]]),
      boost: kf(p, [[0, 0], [0.15, 0.3], [0.3, 1.9], [0.6, 1.1], [0.85, 0.5], [1, 0]]),
      sq: kf(p, [[0, 0], [0.15, -0.1], [0.3, 0.08], [0.85, 0], [0.93, -0.06], [1, 0]]),
      hx: 0.18 * w,
      L: arms,
      R: arms
    };
  },

  wiggle(p) {
    const decay = 1 - p;
    const rz = Math.sin(p * Math.PI * 10) * 0.16 * decay;
    return { rz, hz: -rz * 1.3, sq: Math.sin(p * Math.PI * 10 + 1) * 0.05 * decay };
  },

  scan(p) {
    return { scan: Math.sin(p * Math.PI * 3 - Math.PI / 2) * 0.3, hx: -0.06 * hold(p) };
  },

  point(p, { cx, cy }) {
    // Señala al ratón con el brazo de la izquierda de la pantalla
    const dx = state.pointer.x - cx;
    const dy = cy - state.pointer.y;
    const angle = Math.max(0.4, Math.min(3.0, -Math.atan2(dx, -dy)));
    const w = hold(p, 0.18, 0.85);
    return { L: { z: angle, fwd: 0.25, bend: 0.1, w }, hz: 0.08 * w, rz: 0.04 * w };
  },

  peek(p) {
    // Se inclina hacia delante desde la cintura para mirarte de cerca:
    // brazos hacia atrás para equilibrarse y la cabeza levantada hacia ti
    const lean = hold(p, 0.3, 0.75);
    const arms = { z: 0.4, fwd: -0.35, bend: 0.25, w: lean };
    return {
      rx: 0.4 * lean,
      y: -0.05 * lean,
      hx: -0.3 * lean,
      hz: kf(p, [[0, 0], [0.35, 0.22], [0.55, -0.18], [0.75, 0.18], [1, 0]]),
      L: arms,
      R: arms
    };
  }
};
const MOOD_COLORS = { normal: 0x37e6ff, happy: 0x5dffb0, excited: 0xff6ad5, worried: 0xffc24a, surprised: 0xffffff, sad: 0x6aa0ff, sleep: 0x2d6b80 };

function applyMood(now) {
  if (state.mood !== "normal" && now > state.moodUntil) {
    state.mood = "normal";
  }

  const mood = state.sleeping ? "sleep" : state.mood;
  const { eyes, happyEyes, smile, mouthO, flat, mat, antennaTip } = parts;

  const happy = mood === "happy" || mood === "excited";
  eyes.forEach((eye) => (eye.visible = !happy));
  happyEyes.forEach((eye) => (eye.visible = happy));

  smile.visible = mood === "normal" || happy;
  mouthO.visible = mood === "surprised" || mood === "worried";
  flat.visible = mood === "sad" || mood === "sleep";

  const color = MOOD_COLORS[mood] || MOOD_COLORS.normal;
  mat.eye.color.setHex(color);
  antennaTip.material.color.setHex(color);

  // Ojos: parpadeo, dormido, preocupado...
  let eyeScaleY = 1;

  if (state.blinkStart >= 0) {
    const p = (now - state.blinkStart) / 150;

    if (p >= 1) {
      state.blinkStart = -1;
    } else {
      eyeScaleY = Math.abs(1 - 2 * p) * 0.9 + 0.1;
    }
  }

  if (mood === "sleep") {
    eyeScaleY = 0.15;
  }

  const big = mood === "surprised" ? 1.35 : mood === "worried" ? 0.85 : 1;

  eyes.forEach((eye, index) => {
    eye.scale.set(big, eyeScaleY * big, big);
    eye.rotation.y = 0;
    eye.rotation.x = 0;
    // Cejas «preocupadas»: los ojos se inclinan
    eye.rotation.z = Math.PI / 2 + (mood === "worried" || mood === "sad" ? (index ? -0.35 : 0.35) : 0);
  });
}

let frame = 0;

function loop(now) {
  requestAnimationFrame(loop);

  if (document.hidden || state.hidden || !parts) {
    return;
  }

  // Jugando, a 30 imágenes por segundo: así el juego tiene toda la potencia
  frame += 1;

  if (state.inGame && frame % 2) {
    return;
  }

  const t = now / 1000;
  const { robot, headPivot, head, arms, flame, flameCore, shadow, face, torso } = parts;

  /* ----- Comportamiento ----- */
  if (!state.inGame && !state.sleeping && !state.yawned && now - state.lastInput > 38000) {
    // Antes de dormirse, bosteza y se estira
    state.yawned = true;
    setMood("surprised", 1400);
    act("stretch");
  }

  if (!state.inGame && !state.sleeping && now - state.lastInput > 45000) {
    state.sleeping = true;
  }

  if (now - state.lastInput < 1000) {
    state.yawned = false;
  }

  if (now > state.nextBlink && !state.sleeping) {
    state.blinkStart = now;
    state.nextBlink = now + 2200 + Math.random() * 3800;

    // A veces, doble parpadeo
    if (Math.random() < 0.2) {
      setTimeout(() => (state.blinkStart = performance.now()), 260);
    }
  }

  if (now > state.nextIdle && !state.sleeping && !state.actions.length) {
    state.nextIdle = now + 6000 + Math.random() * 9000;
    const options = state.inGame
      ? ["look", "nod", "scan"]
      : ["look", "look", "scan", "wave", "nod", "stretch", "spin", "dance", "think", "shrug", "salute", "boost", "wiggle", "flip", "peek"];
    const choice = pick(options);
    act(choice);

    const moods = { spin: "excited", dance: "happy", flip: "excited", boost: "excited", salute: "happy", think: "normal", shrug: "worried" };

    if (moods[choice]) {
      setMood(moods[choice], 1600);
    }
  }

  applyMood(now);

  /* ----- Postura base: flotar, respirar, mirar al ratón ----- */
  const dt = Math.min(0.05, Math.max(0.001, (now - (state.lastFrame || now)) / 1000)) || 0.016;
  state.lastFrame = now;

  const motion = reduceMotion ? 0.35 : 1;
  const sleepy = state.sleeping ? 1 : 0;

  // Pose objetivo. Los brazos: z = abrir hacia fuera, fwd = levantar hacia
  // delante, bend = doblar el codo hacia delante, swing = girar el antebrazo.
  const pose = {
    y: Math.sin(t * 2.1) * 0.07 * motion - sleepy * 0.08,
    ry: Math.sin(t * 0.7) * 0.12 * motion,
    rz: Math.sin(t * 1.3) * 0.03 * motion,
    hx: 0,
    hy: 0,
    hz: sleepy * 0.28,
    sq: 0,
    rx: sleepy * 0.08,
    boost: 0,
    arms: arms.map(({ side }) => ({
      z: 0.22 + Math.sin(t * 2.1 + side) * 0.04 * motion - sleepy * 0.1,
      fwd: 0.08 + Math.sin(t * 1.6 + side) * 0.05 * motion,
      bend: 0.3 + sleepy * 0.25,
      swing: 0
    }))
  };

  // Giros completos (voltereta, vuelta): van aparte para no «desenrollarse»
  let spinY = 0;
  let spinX = 0;

  const breath = 1 + Math.sin(t * 2.1 + 1) * 0.015 * motion;
  torso.scale.set(1, breath, 1);

  // Hacia dónde mira: el ratón (o al centro de la pantalla jugando)
  const rect = canvas.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height * 0.35;
  let targetX = 0;
  let targetY = 0;

  if (state.inGame) {
    targetX = (window.innerWidth / 2 - cx) / window.innerWidth;
    targetY = (window.innerHeight / 2 - cy) / window.innerHeight;
  } else if (state.pointer.has) {
    targetX = (state.pointer.x - cx) / window.innerWidth;
    targetY = (state.pointer.y - cy) / window.innerHeight;
  }

  state.look.x = damp(state.look.x, Math.max(-1, Math.min(1, targetX * 2.2)), 5, dt);
  state.look.y = damp(state.look.y, Math.max(-1, Math.min(1, targetY * 2.2)), 5, dt);

  if (!state.sleeping) {
    pose.hy = state.look.x * 0.75;
    pose.hx = state.look.y * 0.4;
    // El cuerpo acompaña un poco la mirada
    pose.ry += state.look.x * 0.18;
  }

  face.position.x = state.look.x * 0.035;
  parts.scanBar.visible = false;

  /* ----- Acciones: cada una con sus fotogramas clave ----- */
  state.actions = state.actions.filter((action) => {
    const p = Math.min(1, (now - action.start) / action.dur);
    const anim = ACTIONS[action.name];

    if (anim) {
      const out = anim(p, { motion, cx, cy });

      ["y", "ry", "rz", "rx", "hx", "hy", "hz", "sq", "boost"].forEach((key) => {
        if (out[key]) {
          pose[key] += out[key];
        }
      });

      spinY += out.spinY || 0;
      spinX += out.spinX || 0;

      ["L", "R"].forEach((name, index) => {
        const arm = out[name];

        if (!arm) {
          return;
        }

        const target = pose.arms[index];
        const w = arm.w === undefined ? 1 : arm.w;
        ["z", "fwd", "bend", "swing"].forEach((key) => {
          if (arm[key] !== undefined) {
            target[key] = lerp(target[key], arm[key], w);
          }
        });
      });

      if (out.scan !== undefined) {
        parts.scanBar.visible = true;
        parts.scanBar.position.x = out.scan;
      }
    }

    return p < 1;
  });

  /* ----- Aplicar con suavizado (igual de fluido a 30 que a 120 fps) ----- */
  state.body = state.body || { y: 0, ry: 0, rz: 0, rx: 0, sq: 0, boost: 0 };
  const body = state.body;
  body.y = damp(body.y, pose.y, 22, dt);
  body.ry = damp(body.ry, pose.ry, 10, dt);
  body.rz = damp(body.rz, pose.rz, 12, dt);
  body.sq = damp(body.sq, pose.sq, 26, dt);
  body.rx = damp(body.rx, pose.rx, 9, dt);
  body.boost = damp(body.boost, pose.boost, 10, dt);

  robot.position.y = body.y;
  robot.rotation.set(spinX + body.rx, body.ry + spinY, body.rz);

  // Aplastar y estirar sin cambiar el volumen
  const sy = 1 + body.sq;
  const sxz = 1 / Math.sqrt(Math.max(0.5, sy));
  robot.scale.set(sxz, sy, sxz);

  const prevHy = headPivot.rotation.y;
  const prevHz = headPivot.rotation.z;
  headPivot.rotation.x = damp(headPivot.rotation.x, pose.hx, 12, dt);
  headPivot.rotation.y = damp(headPivot.rotation.y, pose.hy, 12, dt);
  headPivot.rotation.z = damp(headPivot.rotation.z, pose.hz, 12, dt);
  head.position.y = 0.46 + Math.sin(t * 2.1 + 0.6) * 0.012 * motion;

  arms.forEach((arm, index) => {
    const target = pose.arms[index];
    arm.shoulder.rotation.z = damp(arm.shoulder.rotation.z, arm.side * target.z, 14, dt);
    arm.shoulder.rotation.x = damp(arm.shoulder.rotation.x, -target.fwd, 14, dt);
    arm.elbow.rotation.x = damp(arm.elbow.rotation.x, -target.bend, 16, dt);
    arm.elbow.rotation.z = damp(arm.elbow.rotation.z, arm.side * target.swing, 16, dt);
  });

  // La antena rebota como un muelle cuando la cabeza o el cuerpo se mueven
  state.antenna = state.antenna || { a: 0, v: 0 };
  const antennaSpring = state.antenna;
  const headKick = (headPivot.rotation.z - prevHz) + (headPivot.rotation.y - prevHy) * 0.4;
  antennaSpring.v += (-antennaSpring.a * 170 - antennaSpring.v * 8) * dt - headKick * 9;
  antennaSpring.a += antennaSpring.v * dt;
  antennaSpring.a = Math.max(-0.7, Math.min(0.7, antennaSpring.a));
  parts.antennaPivot.rotation.z = -0.25 + antennaSpring.a;

  const boost = body.boost;

  // Llama del propulsor que tiembla; sombra que cambia con la altura
  const flicker = 0.85 + Math.random() * 0.3;
  flame.scale.set(1 + boost * 0.3, flicker * (state.sleeping ? 0.6 : 1) * (1 + boost), 1 + boost * 0.3);
  flameCore.scale.set(1, 0.9 + Math.random() * 0.2, 1);
  flame.material.opacity = 0.45 + Math.random() * 0.2;

  const height = robot.position.y;
  const shadowScale = 1 - height * 0.5;
  shadow.scale.set(shadowScale, shadowScale, 1);
  shadow.material.opacity = Math.max(0.25, 0.9 - height * 0.8);

  renderer.render(scene, camera);
}

/* =========================================================
   ARRANQUE: cuando la página ya está cargada y libre
   ========================================================= */

function start() {
  footerToggle();
  watchGames();
  watchAreas();

  // Three.js pesa mucho: mientras tanto se ve la imagen del robot y el 3D se
  // carga cuando el visitante hace algo (o a los 12 s), así la página sale antes
  let started = false;
  const events = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel", "scroll"];
  const go = () => {
    if (started) return;
    started = true;
    events.forEach((name) => window.removeEventListener(name, go));
    clearTimeout(timer);
    if ("requestIdleCallback" in window) requestIdleCallback(() => init3d(), { timeout: 800 });
    else setTimeout(init3d, 200);
  };
  events.forEach((name) => window.addEventListener(name, go, { passive: true }));
  const timer = setTimeout(go, 12000);
}

// Los módulos se ejecutan cuando el HTML ya está leído: el robot sale ya
start();
