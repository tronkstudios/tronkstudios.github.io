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

const root = document.createElement("div");
root.className = "mascot is-loading";
root.id = "mascot";

const button = document.createElement("button");
button.type = "button";
button.className = "mascot-button";
button.setAttribute("aria-label", "Hablar con Tronker");
button.title = "Hablar con Tronker";

const canvas = document.createElement("canvas");
canvas.className = "mascot-canvas";
canvas.setAttribute("aria-hidden", "true");
button.appendChild(canvas);

const bubble = document.createElement("div");
bubble.className = "mascot-bubble";
bubble.setAttribute("aria-hidden", "true");

const hideButton = document.createElement("button");
hideButton.type = "button";
hideButton.className = "mascot-hide";
hideButton.setAttribute("aria-label", "Ocultar a Tronker");
hideButton.title = "Ocultar a Tronker";
hideButton.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-close"></use></svg>';

root.append(bubble, button, hideButton);

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
  lastBubble: 0,
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
  if (reduceMotion && (name === "spin" || name === "jump")) {
    name = "nod";
  }

  const durations = { wave: 1600, jump: 750, spin: 1100, shake: 700, cheer: 1300, nod: 700, look: 2600, stretch: 1600 };
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

let lastReaction = 0;

const TronkMascot = {
  say,

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
  act("jump");

  if (typeof window.openTronkerChat === "function") {
    window.openTronkerChat();
  }
});

let lastHoverLine = 0;

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

function watchGames() {
  document.querySelectorAll(".antitronks-modal").forEach((modal) => {
    new MutationObserver(updateGameMode).observe(modal, { attributes: true, attributeFilter: ["class"] });
  });

  document.addEventListener("fullscreenchange", updateGameMode);
  document.addEventListener("webkitfullscreenchange", updateGameMode);
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

  // Antena con luz
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.26, 10), mat.darkMetal);
  antenna.position.set(0.2, R * 0.92 + 0.08, -0.05);
  antenna.rotation.z = -0.25;
  head.add(antenna);

  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: NEON }));
  antennaTip.position.set(0.235, R * 0.92 + 0.22, -0.05);
  head.add(antennaTip);

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
    antennaTip, torso, flame, flameCore, arms, shadow, mat, NEON
  };
}

async function init3d() {
  try {
    THREE = await import("./vendor/three.module.min.js");
  } catch (error) {
    console.warn("TronkStudios: no se pudo cargar la mascota 3D.", error);
    root.remove();
    return;
  }

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  } catch {
    // Sin WebGL no hay mascota (la web sigue igual)
    root.remove();
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
  if (!state.inGame && !state.sleeping && now - state.lastInput > 45000) {
    state.sleeping = true;
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
    const options = state.inGame ? ["look", "nod"] : ["look", "look", "wave", "nod", "stretch", "spin"];
    const choice = pick(options);
    act(choice);

    if (choice === "spin") {
      setMood("excited", 1200);
    }
  }

  applyMood(now);

  /* ----- Postura base: flotar, respirar, mirar al ratón ----- */
  const motion = reduceMotion ? 0.35 : 1;
  const sleepy = state.sleeping ? 1 : 0;

  let y = Math.sin(t * 2.1) * 0.07 * motion - sleepy * 0.08;
  let rotY = Math.sin(t * 0.7) * 0.12 * motion;
  let rotZ = Math.sin(t * 1.3) * 0.03 * motion;
  let headX = 0;
  let headY = 0;
  let headZ = sleepy * 0.28;
  let squash = 1;

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

  state.look.x = lerp(state.look.x, Math.max(-1, Math.min(1, targetX * 2.2)), 0.08);
  state.look.y = lerp(state.look.y, Math.max(-1, Math.min(1, targetY * 2.2)), 0.08);

  if (!state.sleeping) {
    headY = state.look.x * 0.75;
    headX = state.look.y * 0.4;
  }

  face.position.x = state.look.x * 0.035;

  // Brazos en reposo
  const armPose = arms.map(({ side }) => ({
    z: side * (0.22 + Math.sin(t * 2.1) * 0.04 * motion) + sleepy * side * -0.1,
    x: Math.sin(t * 1.6 + side) * 0.06 * motion,
    elbow: -0.25 - sleepy * 0.2
  }));

  /* ----- Acciones (se suman a la postura base) ----- */
  state.actions = state.actions.filter((action) => {
    const p = Math.min(1, (now - action.start) / action.dur);
    const env = Math.sin(p * Math.PI);

    switch (action.name) {
      case "wave": {
        // El brazo de la derecha de la pantalla, arriba y saludando
        const right = armPose[1];
        right.z = lerp(right.z, 2.5, Math.min(1, env * 1.6));
        right.elbow = lerp(right.elbow, -0.6 + Math.sin(p * Math.PI * 7) * 0.5, Math.min(1, env * 1.6));
        headZ += env * 0.12;
        break;
      }
      case "jump": {
        y += Math.sin(p * Math.PI) * 0.5 * motion;
        squash = p < 0.15 ? 1 - Math.sin((p / 0.15) * Math.PI) * 0.12 : p > 0.85 ? 1 - Math.sin(((p - 0.85) / 0.15) * Math.PI) * 0.1 : 1.04;
        armPose.forEach((arm) => (arm.z += arm.z > 0 ? env * 0.7 : -env * 0.7));
        break;
      }
      case "spin":
        rotY += ease(p) * Math.PI * 2;
        y += env * 0.2 * motion;
        break;
      case "shake":
        headZ += Math.sin(p * Math.PI * 8) * 0.28 * (1 - p);
        rotZ += Math.sin(p * Math.PI * 8) * 0.06 * (1 - p);
        break;
      case "cheer":
        armPose.forEach((arm, index) => {
          arm.z = lerp(arm.z, (index ? 1 : -1) * (2.6 + Math.sin(p * Math.PI * 8) * 0.25), Math.min(1, env * 1.8));
          arm.elbow = lerp(arm.elbow, -0.2, env);
        });
        y += Math.abs(Math.sin(p * Math.PI * 3)) * 0.22 * motion;
        break;
      case "nod":
        headX += Math.sin(p * Math.PI * 3) * 0.22 * (1 - p * 0.5);
        break;
      case "look":
        headY += Math.sin(p * Math.PI * 2) * 0.7 * env;
        headX += Math.sin(p * Math.PI) * -0.12;
        break;
      case "stretch":
        armPose.forEach((arm, index) => {
          arm.z = lerp(arm.z, (index ? 1 : -1) * 2.9, env);
          arm.elbow = lerp(arm.elbow, 0, env);
        });
        y += env * 0.12;
        headX -= env * 0.25;
        break;
      default:
        break;
    }

    return p < 1;
  });

  /* ----- Aplicar ----- */
  robot.position.y = lerp(robot.position.y, y, 0.25);
  robot.rotation.y = rotY;
  robot.rotation.z = rotZ;
  robot.scale.set(1 + (1 - squash) * 0.5, squash, 1 + (1 - squash) * 0.5);

  headPivot.rotation.y = lerp(headPivot.rotation.y, headY, 0.18);
  headPivot.rotation.x = lerp(headPivot.rotation.x, headX, 0.18);
  headPivot.rotation.z = lerp(headPivot.rotation.z, headZ, 0.18);
  head.position.y = 0.46 + Math.sin(t * 2.1 + 0.6) * 0.012 * motion;

  arms.forEach((arm, index) => {
    const pose = armPose[index];
    arm.shoulder.rotation.z = lerp(arm.shoulder.rotation.z, pose.z, 0.2);
    arm.shoulder.rotation.x = lerp(arm.shoulder.rotation.x, pose.x, 0.2);
    arm.elbow.rotation.z = lerp(arm.elbow.rotation.z, pose.elbow * arm.side * -1, 0.2);
  });

  // Llama del propulsor que tiembla; sombra que cambia con la altura
  const flicker = 0.85 + Math.random() * 0.3;
  flame.scale.set(1, flicker * (state.sleeping ? 0.6 : 1), 1);
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
  document.body.appendChild(root);
  footerToggle();
  watchGames();

  const go = () => init3d();

  if ("requestIdleCallback" in window) {
    requestIdleCallback(go, { timeout: 2500 });
  } else {
    setTimeout(go, 1200);
  }
}

if (document.readyState === "complete") {
  start();
} else {
  window.addEventListener("load", start, { once: true });
}
