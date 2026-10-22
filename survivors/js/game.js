"use strict";

/* TronkStudios · survivors/js/game.js
   Motor de Tronk Survivors: simulación a 60 pasos por segundo y dibujo.
   - El estado de la partida (st) tiene jugadores, enemigos, disparos,
     zonas de daño, gemas y objetos. En el modo online solo lo simula
     el anfitrión; los invitados reciben fotos del estado (net.js).
   - La interfaz (ui.js) escucha los avisos de Game.on(...).
   Scripts clásicos (ver docs/adr/0002). */

const Game = (() => {
  const TAU = Math.PI * 2;
  // Escala del mundo: los sprites miden unos 60 píxeles, así que las
  // distancias del juego (velocidades, alcances, radios) se multiplican por U
  const U = 1.7;
  const STEP = 1000 / 60;
  // Azar: normal, o con semilla en el reto diario (todos juegan igual)
  let seed = 0;
  function R() {
    if (!seed) return Math.random();
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return ((seed >>> 0) % 1000000) / 1000000;
  }
  const rand = (a, b) => a + R() * (b - a);
  const pick = (list) => list[Math.floor(R() * list.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  const charById = (id) => TS.CHARACTERS.find((c) => c.id === id) || TS.CHARACTERS[0];
  const STYLE_OF = {
    tajo: "swing", mazazo: "slam", virote: "aim", estocada: "thrust", rayo: "cast", guantes: "punch", punos: "punch",
    hacha: "throw", petardo: "throw", balon: "throw", kunai: "throw", copos: "cast", colonia: "cast", meteoro: "cast", dron: "cast", tornado: "cast"
  };

  let canvas = null;
  let ctx = null;
  let st = null;
  let mode = "solo"; // solo | host | guest
  let localId = 0;
  let view = { w: 640, h: 360, k: 2, dpr: 1 };
  let cam = { x: 0, y: 0, shake: 0 };
  const listeners = {};
  const input = { keys: new Set(), joy: null, x: 0, y: 0, ab: 0 };
  let paused = false;
  let rafId = 0;
  let lastTime = 0;
  let acc = 0;
  let hudTimer = 0;

  function on(name, fn) {
    (listeners[name] = listeners[name] || []).push(fn);
  }
  function emit(name, data) {
    for (const fn of listeners[name] || []) fn(data);
  }

  /* =======================================================
     ESTADÍSTICAS DEL JUGADOR
     ======================================================= */

  function computeStats(pl) {
    const ch = charById(pl.charId);
    const s = { maxHp: 0, speed: 0, might: 0, area: 0, cooldown: 0, magnet: 0, armor: 0, regen: 0, growth: 0, greed: 0, amount: 0, revive: 0 };
    const add = (obj) => { for (const [k, v] of Object.entries(obj || {})) if (k in s) s[k] += v; };
    add(pl.meta);
    add(ch.perk);
    const stars = Math.max(1, pl.stars || 1) - 1;
    s.might += stars * 0.05;
    s.maxHp += stars * 0.05;
    for (const [id, lvl] of Object.entries(pl.passives)) {
      const def = TS.PASSIVES[id];
      if (def) s[def.stat] += def.per * lvl;
    }
    const before = pl.stats ? pl.stats.maxHp : 0;
    pl.stats = {
      maxHp: Math.round(100 * (1 + s.maxHp)),
      speed: 1.25 * U * (1 + s.speed),
      might: 1 + s.might,
      area: (1 + s.area) * U,
      cdMul: Math.max(0.45, 1 - s.cooldown),
      magnet: 62 * U * (1 + s.magnet),
      armor: s.armor,
      regen: s.regen,
      growth: 1 + s.growth,
      greed: 1 + s.greed,
      amount: s.amount,
      revive: s.revive
    };
    if (before && pl.stats.maxHp > before) pl.hp += pl.stats.maxHp - before;
    pl.hp = Math.min(pl.hp, pl.stats.maxHp);
  }

  function newPlayer(id, setup) {
    const ch = charById(setup.charId);
    const pl = {
      id,
      name: setup.name || ch.name,
      charId: ch.id,
      stars: setup.stars || 1,
      meta: setup.meta || {},
      x: id * 24 - 30,
      y: 0,
      face: 1,
      dir: "down",
      aimX: 1,
      aimY: 0,
      moveX: 0,
      moveY: 1,
      moving: false,
      walkT: 0,
      atk: null,
      hp: 100,
      stats: null,
      weapons: [],
      passives: {},
      iframes: 0,
      down: false,
      reviveT: 0,
      usedRevive: false,
      input: { x: 0, y: 0, ab: 0 },
      abCd: 300, // la habilidad está lista a los 5 segundos de empezar
      abSeen: 0,
      flash: 0
    };
    computeStats(pl);
    pl.hp = pl.stats.maxHp;
    addWeapon(pl, ch.weapon);
    return pl;
  }

  function addWeapon(pl, id) {
    pl.weapons.push({ id, lvl: 1, cd: 30 + R() * 20, combo: 0, comboT: 0, drones: [] });
  }

  /* =======================================================
     PARTIDA
     ======================================================= */

  let map = TS.MAPS.bosque;
  let mapId = "bosque";

  function setMap(id) {
    if (mapId === id && map) return;
    mapId = TS.MAPS[id] ? id : "bosque";
    map = TS.MAPS[mapId];
    chunks.clear();
    obstacles.clear();
  }

  function start(setups, opts = {}) {
    stopDemo();
    mode = opts.mode || "solo";
    localId = opts.localId || 0;
    setMap(opts.map || "bosque");
    seed = opts.seed ? opts.seed >>> 0 || 1 : 0;
    const mods = opts.mods || [];
    st = {
      mapId,
      mods,
      daily: opts.daily || null,
      evolutions: 0,
      propsBroken: 0,
      t: 0,
      players: setups.map((s, i) => newPlayer(i, s)),
      enemies: [],
      strikes: [],
      shots: [],
      eshots: [],
      zones: [],
      gems: [],
      pickups: [],
      fx: [],
      events: [],
      xp: 0,
      level: 1,
      xpNext: 0,
      kills: 0,
      coins: 0,
      bossesKilled: 0,
      nextId: 1,
      spawnT: 0,
      bossIdx: 0,
      hordeIdx: 0,
      boss: null,
      pendingLevels: 0,
      choosing: null,
      over: false,
      victory: false,
      endT: 0
    };
    st.xpNext = xpFor(1);
    // Reglas del reto diario
    st.mod = {
      enemySpeed: mods.includes("turbo") ? 1.35 : 1,
      enemyHp: mods.includes("gigantes") ? 1.7 : 1,
      xp: (mods.includes("gigantes") ? 1.7 : 1) * (mods.includes("horda") ? 1.25 : 1),
      spawn: mods.includes("horda") ? 1.6 : 1,
      coins: mods.includes("oro") ? 3 : 1,
      bossTime: mods.includes("jefes") ? 0.55 : 1,
      // ayuda en las primeras partidas: los enemigos pegan menos
      enemyDmg: opts.easy ? 0.75 : 1
    };
    for (const p of st.players) {
      if (mods.includes("cristal")) { p.meta = { ...p.meta, maxHp: (p.meta.maxHp || 0) - 0.5, might: (p.meta.might || 0) + 0.6 }; }
      if (mods.includes("rapido")) p.meta = { ...p.meta, speed: (p.meta.speed || 0) + 0.3 };
      if (mods.includes("iman")) p.meta = { ...p.meta, magnet: (p.meta.magnet || 0) + 2 };
      p.stats = null;
      computeStats(p);
      p.hp = p.stats.maxHp;
    }
    cam.x = st.players[localId].x;
    cam.y = st.players[localId].y;
    paused = false;
    Sfx.startMusic("run");
    emit("start", st);
    loop();
  }

  function xpFor(level) {
    const base = level < 20 ? 5 + level * 5 : level < 40 ? 10 * level - 45 : 14 * level - 200;
    return Math.round(base * (1 + 0.45 * (st.players.length - 1)));
  }

  function alivePlayers() {
    return st.players.filter((p) => !p.down);
  }

  function nearestPlayer(x, y) {
    let best = null;
    let bd = Infinity;
    for (const p of st.players) {
      if (p.down) continue;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  /* ---------- rejilla para buscar enemigos cerca ---------- */
  const CELL = 40;
  const grid = new Map();
  const key = (cx, cy) => (cx + 50000) * 100000 + (cy + 50000);

  function buildGrid() {
    grid.clear();
    for (const e of st.enemies) {
      const k = key(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      let cell = grid.get(k);
      if (!cell) grid.set(k, (cell = []));
      cell.push(e);
    }
  }

  function near(x, y, r, fn) {
    const x0 = Math.floor((x - r) / CELL);
    const x1 = Math.floor((x + r) / CELL);
    const y0 = Math.floor((y - r) / CELL);
    const y1 = Math.floor((y + r) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const cell = grid.get(key(cx, cy));
        if (cell) for (const e of cell) if (!e.dead) fn(e);
      }
    }
  }

  function nearestEnemy(x, y, maxR, skip) {
    let best = null;
    let bd = maxR * maxR;
    near(x, y, maxR, (e) => {
      if (skip && skip.has(e.id)) return;
      if (e.phased || e.prop) return;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) { bd = d; best = e; }
    });
    return best;
  }

  function enemiesInRadius(x, y, r) {
    const out = [];
    near(x, y, r + 24, (e) => {
      const rr = r + e.r;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 <= rr * rr) out.push(e);
    });
    return out;
  }

  /* =======================================================
     MAPA: árboles, rocas, troncos y arbustos con colisión.
     Salen siempre en el mismo sitio (dependen de la casilla).
     ======================================================= */

  /* ---------- terreno: hierba, tierra y agua (ruido suave) ---------- */
  function vnoise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const sm = (t) => t * t * (3 - 2 * t);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    const u = sm(xf);
    return (a + (b - a) * u) * (1 - sm(yf)) + (c + (d - c) * u) * sm(yf);
  }
  function dirtV(x, y) { return vnoise(x / 260, y / 260) * 0.65 + vnoise(x / 70 + 50, y / 70 - 30) * 0.35; }
  function waterV(x, y) { return vnoise(x / 420 + 200, y / 420 + 100) * 0.75 + vnoise(x / 110 - 70, y / 110 + 20) * 0.25; }
  // 0 hierba, 1 tierra, 2 agua
  function terrain(x, y) {
    if (waterV(x, y) > map.water && x * x + y * y > 400 * 400) return 2;
    if (map.roads && (((x % 640) + 640) % 640 < 84 || ((y % 640) + 640) % 640 < 84)) return 3; // calles
    return dirtV(x, y) > map.dirt ? 1 : 0;
  }

  // Si algo se mete en el agua, vuelve atrás (resbala por la orilla)
  function blockWater(ent, ox, oy) {
    if (terrain(ent.x, ent.y) !== 2) return;
    if (terrain(ent.x, oy) !== 2) ent.y = oy;
    else if (terrain(ox, ent.y) !== 2) ent.x = ox;
    else { ent.x = ox; ent.y = oy; }
  }

  // El suelo se dibuja por trozos de 256 × 256 a la mitad de resolución
  // (píxeles el doble de grandes, como en PokeSurvivor)
  const CHUNK = 256;
  const chunks = new Map();

  function chunkCanvas(cx, cy) {
    const key = `${cx},${cy}`;
    if (chunks.has(key)) return chunks.get(key);
    const N = CHUNK / 2;
    const c = document.createElement("canvas");
    c.width = N;
    c.height = N;
    const g = c.getContext("2d");
    const img = g.createImageData(N, N);
    const put = (i, hex) => {
      const v = parseInt(hex.slice(1), 16);
      img.data[i * 4] = v >> 16; img.data[i * 4 + 1] = (v >> 8) & 255; img.data[i * 4 + 2] = v & 255; img.data[i * 4 + 3] = 255;
    };
    for (let py = 0; py < N; py++) {
      for (let px = 0; px < N; px++) {
        const wx = cx * CHUNK + px * 2 + 1;
        const wy = cy * CHUNK + py * 2 + 1;
        const t = terrain(wx, wy);
        const h = hash(wx >> 1, wy >> 1);
        const i = py * N + px;
        const G = map.ground;
        if (t === 3) {
          // calle: asfalto con raya amarilla discontinua en el centro
          const mx = ((wx % 640) + 640) % 640;
          const my = ((wy % 640) + 640) % 640;
          const vert = mx < 84;
          const along = vert ? wy : wx;
          const across = vert ? mx : my;
          const dash = Math.abs(across - 42) < 2 && Math.floor(along / 24) % 2 === 0;
          const curb = across < 4 || across > 80;
          put(i, dash ? "#e9c46a" : curb ? "#8a8d96" : h > 0.5 ? "#2e3139" : "#34373f");
          continue;
        }
        if (t === 2) {
          const shore = terrain(wx, wy - 4) !== 2 || terrain(wx - 4, wy) !== 2 || terrain(wx + 4, wy) !== 2;
          const wave = (Math.floor(wx / 6) + Math.floor(wy / 4)) % 9 === 0 && h > 0.5;
          put(i, shore ? G.foam : wave ? G.wave : G.water[Math.floor(h * 3)]);
        } else {
          const nearWater = terrain(wx, wy + 4) === 2 || terrain(wx, wy - 4) === 2 || terrain(wx + 4, wy) === 2 || terrain(wx - 4, wy) === 2;
          if (nearWater) { put(i, G.shore[h > 0.5 ? 0 : 1]); continue; }
          const pal = t === 1 ? G.dirt : G.grass;
          // borde irregular entre hierba y tierra
          const edge = terrain(wx + 3, wy) !== t || terrain(wx, wy + 3) !== t;
          if (edge && t === 0) { put(i, h > 0.4 ? G.grassEdge : G.grass[0]); continue; }
          if (edge && t === 1) { put(i, h > 0.5 ? G.dirtEdge : G.dirt[1]); continue; }
          let col = pal[Math.floor(h * 4.6)] || pal[0];
          if (t === 0 && h > 0.996) col = G.flowers[Math.floor(hash(wy, wx) * 3)];
          if (t === 1 && h > 0.975) col = "#a08a6a";
          put(i, col);
        }
      }
    }
    g.putImageData(img, 0, 0);
    chunks.set(key, c);
    if (chunks.size > 70) chunks.delete(chunks.keys().next().value);
    return c;
  }

  const OCELL = 150;
  const obstacles = new Map();
  // Radio con el que chocan (0 = no chocan); line = tronco tumbado; oy = pies en la imagen
  const OB_DEF = {
    arbol: { r: 15, oy: 112 }, pino: { r: 13, oy: 112 }, roca: { r: 18, oy: 50 }, rocaGrande: { r: 28, oy: 50 },
    tronco: { r: 0, line: 24, oy: 32 }, arbusto: { r: 0, oy: 36 }, hierba: { r: 0, oy: 0 },
    tumba: { r: 13, oy: 54 }, cruz: { r: 6, oy: 56 }, arbolMuerto: { r: 9, oy: 112 }, palmera: { r: 8, oy: 112 },
    sombrilla: { r: 3, oy: 70 }, farola: { r: 5, oy: 92 }, contenedor: { r: 20, oy: 46 }, coche: { r: 0, line: 22, oy: 50 }, banco: { r: 0, line: 18, oy: 36 }
  };
  const obstacleImg = {};

  function obstacleAt(cx, cy) {
    const key = (cx + 50000) * 100000 + (cy + 50000);
    if (obstacles.has(key)) return obstacles.get(key);
    let ob = null;
    const r = hash(cx * 3 + 11, cy * 5 - 7);
    // zona libre alrededor del inicio
    const ox0 = cx * OCELL + 75;
    const oy0 = cy * OCELL + 75;
    if (r < 0.42 && Math.hypot(cx * OCELL, cy * OCELL) > 260 && terrain(ox0, oy0) !== 2 && terrain(ox0, oy0) !== 3) {
      const kinds = Object.entries(map.obstacles);
      const total = kinds.reduce((s, [, w]) => s + w, 0);
      let pickR = hash(cy + 91, cx - 33) * total;
      let kind = kinds[0][0];
      for (const [k, w] of kinds) { pickR -= w; if (pickR <= 0) { kind = k; break; } }
      const def = { kind, ...OB_DEF[kind] };
      const variant = Math.floor(hash(cx - 5, cy + 5) * 3);
      ob = {
        tufts: def.kind === "hierba" ? Array.from({ length: 4 + Math.floor(hash(cx * 9, cy * 9) * 6) }, (_, i) => [Math.round((hash(cx + i, cy - i) - 0.5) * 60), Math.round((hash(cy + i * 3, cx) - 0.5) * 36)]) : null,
        kind: def.kind,
        variant,
        x: cx * OCELL + 30 + hash(cx + 7, cy) * (OCELL - 60),
        y: cy * OCELL + 30 + hash(cx, cy + 7) * (OCELL - 60),
        r: def.r,
        line: def.line || 0,
        solid: def.r > 0 || !!def.line
      };
    }
    obstacles.set(key, ob);
    if (obstacles.size > 6000) obstacles.clear();
    return ob;
  }

  function obstaclesNear(x, y, r, fn) {
    for (let cx = Math.floor((x - r) / OCELL); cx <= Math.floor((x + r) / OCELL); cx++) {
      for (let cy = Math.floor((y - r) / OCELL); cy <= Math.floor((y + r) / OCELL); cy++) {
        const ob = obstacleAt(cx, cy);
        if (ob) fn(ob);
      }
    }
  }

  // Empuja un círculo (x, y, radio) fuera de los obstáculos
  function collide(ent, rad) {
    obstaclesNear(ent.x, ent.y, rad + 50, (ob) => {
      if (!ob.solid) return;
      let px = ob.x;
      let py = ob.y;
      if (ob.line) px = clamp(ent.x, ob.x - ob.line, ob.x + ob.line); // tronco tumbado
      const rr = (ob.line ? 7 : ob.r) + rad;
      const dx = ent.x - px;
      const dy = ent.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.01;
        ent.x = px + (dx / d) * rr;
        ent.y = py + (dy / d) * rr;
      }
    });
  }

  function obstacleImage(ob) {
    const key = `${ob.kind}:${ob.variant}`;
    if (!obstacleImg[key]) obstacleImg[key] = Sprites.scaled(ob.kind === "hierba" ? Sprites.get("tuft") : People.sceneryFrame(ob.kind, ob.variant + 1), 2);
    return obstacleImg[key];
  }

  /* =======================================================
     EFECTOS (también se mandan a los invitados)
     ======================================================= */

  function fx(f) {
    if (lowFx && (COSMETIC.has(f.k) ? st.fx.length > 30 : f.k === "num" && !f.big && !f.hurt)) return;
    f.t = 0;
    st.fx.push(f);
    if (st.fx.length > 260) st.fx.splice(0, st.fx.length - 260);
    if (mode === "host") st.events.push(f);
  }

  function sound(name, gap) {
    Sfx.play(name, gap);
    if (mode === "host") st.events.push({ k: "snd", n: name });
  }

  const options = { numbers: true, shake: true, fx: "auto" };
  // Efectos reducidos: menos partículas y menos resolución (móviles lentos)
  let lowFx = false;
  let autoLow = false;
  const perf = { sum: 0, n: 0 };
  const COSMETIC = new Set(["puff", "shards", "dust", "crack"]);

  function wantLow() {
    return options.fx === "low" || (options.fx === "auto" && autoLow);
  }

  function checkLowFx() {
    if (wantLow() !== lowFx) {
      lowFx = wantLow();
      resize();
    }
  }

  function shake(n) {
    if (options.shake) cam.shake = Math.max(cam.shake, n);
  }

  /* =======================================================
     ENEMIGOS
     ======================================================= */

  function spawnEnemy(type, x, y) {
    const d = TS.ENEMIES[type];
    const minutes = st.t / 3600;
    const n = st.players.length;
    const hpMul = (d.prop ? 1 : st.mod ? st.mod.enemyHp : 1) * (d.prop ? 1 : 1) * 1;
    const hpBase = d.prop ? 1 : d.boss ? (1 + 0.6 * (n - 1)) * (st.endless ? 1 + 0.5 * st.endlessLoops : 1) : (1 + minutes * 0.22) * (1 + 0.3 * (n - 1));
    const e = {
      id: st.nextId++,
      type,
      x,
      y,
      hp: d.hp * hpMul * hpBase,
      maxHp: d.hp * hpMul * hpBase,
      speed: d.speed * U * rand(0.92, 1.08) * (d.prop ? 1 : st.mod ? st.mod.enemySpeed : 1),
      // los primeros minutos pegan menos, para aprender a moverse
      dmg: d.dmg * (1 + minutes * 0.07) * (d.boss ? 1 : 0.65 + 0.35 * Math.min(1, minutes / 5)) * (st.mod ? st.mod.enemyDmg : 1),
      r: d.r * U,
      ai: d.ai,
      boss: !!d.boss,
      t: Math.floor(rand(0, 200)),
      flash: 0,
      slow: 0,
      slowAmt: 0,
      kx: 0,
      ky: 0,
      vx: 0,
      vy: 0,
      face: 1,
      hits: {},
      state: 0,
      timer: rand(60, 160),
      dodgeCd: 0,
      phased: false,
      atk: 0,
      prop: !!d.prop
    };
    st.enemies.push(e);
    if (e.boss) {
      st.boss = e;
      emit("boss", { name: L(d.name), id: type });
      sound("boss");
      Sfx.startMusic("boss");
    }
    return e;
  }

  function finalBossId() {
    return map.finalBoss || "rey";
  }

  function spawnRadius() {
    return Math.min(1100, Math.hypot(view.w / view.k, view.h / view.k) / 2 + 50);
  }

  function spawnAround(type, target, distance) {
    const a = rand(0, TAU);
    const r = distance || spawnRadius();
    let x = target.x + Math.cos(a) * r;
    let y = target.y + Math.sin(a) * r;
    for (let i = 1; i < 8 && terrain(x, y) === 2 && !TS.ENEMIES[type].flying; i++) {
      x = target.x + Math.cos(a + i * 0.8) * r;
      y = target.y + Math.sin(a + i * 0.8) * r;
    }
    const e = spawnEnemy(type, x, y);
    collide(e, e.r);
    return e;
  }

  function currentWave() {
    const sec = st.t / 60;
    let w = TS.WAVES[0];
    for (const wave of TS.WAVES) if (sec >= wave.from) w = wave;
    return w;
  }

  function weightedPick(base) {
    // cada mapa cambia qué enemigos salen más
    const mix = { ...base };
    for (const [id, k] of Object.entries(map.mix || {})) if (id in mix || st.t > 60 * 60) mix[id] = (mix[id] || 1) * k;
    const entries = Object.entries(mix).filter(([, w]) => w > 0);
    let total = 0;
    for (const [, w] of entries) total += w;
    let r = R() * total;
    for (const [id, w] of entries) {
      r -= w;
      if (r < 0) return id;
    }
    return entries[0][0];
  }

  function spawning() {
    const sec = st.t / 60;
    const alive = alivePlayers();
    if (!alive.length) return;

    // jefes
    const nextBoss = TS.BOSSES[st.bossIdx];
    if (nextBoss && sec >= nextBoss.at * st.mod.bossTime) {
      st.bossIdx++;
      spawnAround(nextBoss.id === "rey" ? finalBossId() : nextBoss.id, pick(alive), spawnRadius() * 0.8);
    }
    // modo infinito: un jefe cada minuto y medio y una horda cada minuto
    if (st.endless) {
      if (st.t >= st.endlessBossT) {
        st.endlessBossT = st.t + 90 * 60;
        st.endlessLoops++;
        const ids = ["gigante", "supremo", "maestro", "rey", "reyEsqueleto", "mocoRey", "general"];
        spawnAround(ids[Math.floor(R() * ids.length)], pick(alive), spawnRadius() * 0.8);
      }
      if (st.t >= st.endlessHordeT) {
        st.endlessHordeT = st.t + 60 * 60;
        const h = TS.HORDES[Math.floor(R() * TS.HORDES.length)];
        const target = pick(alive);
        const r = spawnRadius() * 0.85;
        const count = Math.round(h.count * 1.4);
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU;
          spawnEnemy(h.id, target.x + Math.cos(a) * r, target.y + Math.sin(a) * r);
        }
        emit("toast", { text: L("¡Que vienen!"), kind: "horde" });
      }
    }
    // hordas en círculo
    const horde = TS.HORDES[st.hordeIdx];
    if (horde && sec >= horde.at) {
      st.hordeIdx++;
      const target = pick(alive);
      const r = spawnRadius() * 0.85;
      for (let i = 0; i < horde.count; i++) {
        const a = (i / horde.count) * TAU;
        spawnEnemy(horde.id, target.x + Math.cos(a) * r, target.y + Math.sin(a) * r);
      }
      emit("toast", { text: L("¡Que vienen!"), kind: "horde" });
    }

    // objetos que se rompen repartidos por el mapa
    if (st.t % 90 === 0) {
      for (const p of alive) {
        let nearProps = 0;
        for (const e of st.enemies) if (e.prop && Math.hypot(e.x - p.x, e.y - p.y) < spawnRadius() * 1.6) nearProps++;
        if (nearProps < 7) {
          const a = rand(0, TAU);
          const r = spawnRadius() * rand(0.9, 1.4);
          const px = p.x + Math.cos(a) * r;
          const py = p.y + Math.sin(a) * r;
          if (terrain(px, py) !== 2) spawnEnemy(pick(["barril", "caja", "jarron", "brasero"]), px, py);
        }
      }
    }

    const wave = currentWave();
    st.spawnT -= (1 + 0.4 * (st.players.length - 1)) * st.mod.spawn;
    if (st.spawnT <= 0) {
      // en el modo infinito salen cada vez más deprisa
      st.spawnT = st.endless ? Math.max(6, wave.every - (st.t - st.endlessStart) / 3600) : wave.every;
      const cap = wave.alive * (1 + 0.35 * (st.players.length - 1)) * Math.sqrt(st.mod.spawn);
      const batch = 1 + Math.floor(sec / 100);
      const fighters = st.enemies.reduce((n, e) => n + (e.prop ? 0 : 1), 0);
      for (let i = 0; i < batch && fighters + i < cap; i++) spawnAround(weightedPick(wave.mix), pick(alive));
    }
  }

  function enemyShot(e, angle, speed, dmg, extra = {}) {
    st.eshots.push({ x: e.x, y: e.y - 14, vx: Math.cos(angle) * speed * U, vy: Math.sin(angle) * speed * U, dmg, r: 4, life: 300, kind: extra.kind || "orb" });
  }

  function updateEnemy(e) {
    const d = TS.ENEMIES[e.type];
    e.t++;
    if (e.flash > 0) e.flash--;
    if (e.prop) return;
    if (e.slow > 0) e.slow--;
    if (e.dodgeCd > 0) e.dodgeCd--;
    if (e.atk > 0) e.atk--;
    const target = nearestPlayer(e.x, e.y);
    let mx = 0;
    let my = 0;
    let sp = e.speed * (e.slow > 0 ? 1 - e.slowAmt : 1);

    if (target) {
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;

      switch (e.ai) {
        case "chase":
          mx = ux; my = uy;
          break;
        case "erratic":
          mx = ux + Math.cos(e.t * 0.12 + e.id) * 0.9;
          my = uy + Math.sin(e.t * 0.1 + e.id) * 0.9;
          break;
        case "hop":
          if (e.t % 54 < 22) { mx = ux; my = uy; sp *= 2.2; }
          break;
        case "ranged": {
          const range = d.range;
          if (dist > range * U) { mx = ux; my = uy; } else if (dist < range * U * 0.65) { mx = -ux; my = -uy; } else { mx = -uy * 0.4; my = ux * 0.4; }
          e.timer--;
          if (e.timer <= 0 && dist < range * U * 1.6) {
            e.timer = d.shot.cd * rand(0.8, 1.2);
            e.atk = 18;
            enemyShot(e, Math.atan2(dy, dx), d.shot.speed, d.shot.dmg * (e.dmg / d.dmg), { kind: "bullet" });
            sound("eshot", 0.08);
          }
          break;
        }
        case "dash":
          if (e.state === 0) {
            mx = ux; my = uy;
            e.timer--;
            if (e.timer <= 0 && dist < 150 * U) { e.state = 1; e.timer = 26; e.dx = ux; e.dy = uy; }
          } else if (e.state === 1) {
            e.timer--; // se prepara (parpadea)
            if (e.timer <= 0) { e.state = 2; e.timer = 16; sound("dodge", 0.1); }
          } else {
            mx = e.dx; my = e.dy; sp = 4.6 * U;
            e.timer--;
            if (e.timer <= 0) { e.state = 0; e.timer = rand(110, 180); }
          }
          break;
        case "kamikaze":
          if (e.state === 0) {
            mx = ux; my = uy;
            if (dist < 22 * U) { e.state = 1; e.timer = 34; }
          } else {
            e.timer--;
            if (e.timer <= 0) explodeKamikaze(e);
          }
          break;
        case "phase":
          mx = ux; my = uy;
          e.phased = e.t % 200 > 140;
          break;
        case "summoner": {
          const range = d.range;
          if (dist > range * U) { mx = ux; my = uy; } else if (dist < range * U * 0.6) { mx = -ux; my = -uy; }
          e.timer--;
          if (e.timer <= 0) {
            e.timer = 300;
            e.atk = 30;
            for (let i = 0; i < 3; i++) {
              const a = rand(0, TAU);
              spawnEnemy("zombi", e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20);
            }
            fx({ k: "ring", x: e.x, y: e.y, r: 26, color: "#b05cff", life: 24 });
          }
          break;
        }
        default:
          bossAI(e, target, ux, uy, dist);
          mx = e.mx || 0;
          my = e.my || 0;
          sp = e.sp || sp;
      }
    }

    const ml = Math.hypot(mx, my);
    if (ml > 0) { mx /= ml; my /= ml; }
    e.vx = mx * sp;
    e.vy = my * sp;
    const ox = e.x;
    const oy = e.y;
    e.x += e.vx + e.kx;
    e.y += e.vy + e.ky;
    if (!d.flying) blockWater(e, ox, oy);
    e.kx *= 0.82;
    e.ky *= 0.82;
    if (!d.flying && !e.boss && (e.vx || e.vy || e.kx || e.ky)) collide(e, e.r * 0.8);
    if (Math.abs(e.vx) > 0.05) e.face = e.vx > 0 ? 1 : -1;
    if (target) {
      const [dir, face] = dirOf(target.x - e.x, target.y - e.y);
      e.dir = dir;
      e.face = face;
    }
  }

  /* ---------- jefes ---------- */
  function bossAI(e, target, ux, uy, dist) {
    e.timer--;
    e.mx = ux;
    e.my = uy;
    e.sp = e.speed;
    const hpPct = e.hp / e.maxHp;
    switch (e.ai) {
      case "boss_stomp":
        if (e.state === 1) {
          e.mx = 0; e.my = 0;
          if (e.timer <= 0) {
            e.state = 0;
            e.timer = 200;
            fx({ k: "ring", x: e.x, y: e.y, r: 80 * U, color: "#c9a27c", life: 26 });
            fx({ k: "crack", x: e.x, y: e.y, r: 34, life: 70 });
            shake(8);
            sound("wave");
            for (const p of alivePlayers()) if (Math.hypot(p.x - e.x, p.y - e.y) < 80 * U) hurtPlayer(p, e.dmg * 1.2);
            for (let i = 0; i < 4; i++) spawnAround("zombi", e, 30);
          }
        } else if (e.timer <= 0) {
          e.state = 1;
          e.timer = 50;
          e.atk = 50;
        }
        break;
      case "boss_bullets":
        if (dist < 140 * U) { e.mx = -ux * 0.6; e.my = -uy * 0.6; }
        if (e.timer <= 0) {
          e.timer = hpPct < 0.5 ? 90 : 130;
          e.atk = 24;
          const n = hpPct < 0.5 ? 20 : 14;
          const off = rand(0, TAU);
          for (let i = 0; i < n; i++) enemyShot(e, off + (i / n) * TAU, 1.7, 7, { kind: "bullet" });
          sound("eshot");
        }
        if (e.t % (hpPct < 0.5 ? 55 : 75) === 0 && e.t > 120) {
          const a = Math.atan2(uy, ux);
          for (const s of [-0.22, 0, 0.22]) enemyShot(e, a + s, 2.1, 7, { kind: "bullet" });
        }
        break;
      case "boss_ninja":
        if (e.state === 0) {
          if (e.timer <= 0) { e.state = 1; e.timer = 30; e.dx = ux; e.dy = uy; }
        } else if (e.state === 1) {
          e.mx = 0; e.my = 0;
          if (e.timer <= 0) { e.state = 2; e.timer = 20; sound("dodge"); }
        } else {
          e.mx = e.dx; e.my = e.dy; e.sp = 5.5 * U;
          if (e.timer <= 0) {
            e.state = 0;
            e.timer = hpPct < 0.5 ? 70 : 110;
            // abanico de shurikens
            const a = Math.atan2(uy, ux);
            for (let i = -3; i <= 3; i++) enemyShot(e, a + i * 0.22, 2.4, 7, { kind: "star" });
            if (R() < 0.35 && target) {
              // se teletransporta detrás del jugador
              fx({ k: "puff", x: e.x, y: e.y - 10, color: "#3b1f5c", life: 20 });
              e.x = target.x - ux * 70 * U;
              e.y = target.y - uy * 70 * U;
              fx({ k: "puff", x: e.x, y: e.y - 10, color: "#3b1f5c", life: 20 });
            }
          }
        }
        if (!e.cloned && hpPct < 0.5) {
          e.cloned = true;
          for (let i = 0; i < 4; i++) spawnAround("ninja", e, 30);
          emit("toast", { text: L("¡El Maestro Ninja llama a su clan!"), kind: "boss" });
        }
        break;
      case "boss_king":
        if (e.timer <= 0) {
          e.timer = hpPct < 0.3 ? 220 : 320;
          e.atk = 40;
          const r = 60;
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU;
            spawnEnemy(R() < 0.3 ? "corredor" : "zombi", e.x + Math.cos(a) * r, e.y + Math.sin(a) * r);
          }
          fx({ k: "ring", x: e.x, y: e.y, r: 70, color: "#7cff6b", life: 30 });
          sound("boss", 1);
        }
        if (e.t % 150 === 0) {
          const off = rand(0, TAU);
          for (let i = 0; i < 16; i++) enemyShot(e, off + (i / 16) * TAU, 1.6, 9, { kind: "goo" });
        }
        if (hpPct < 0.3) e.sp = e.speed * 1.6;
        break;
      case "boss_bones":
        // anillos de huesos, se teletransporta y levanta esqueletos
        if (e.t % 170 === 0) {
          const off = rand(0, TAU);
          const n = hpPct < 0.5 ? 18 : 12;
          for (let i = 0; i < n; i++) enemyShot(e, off + (i / n) * TAU, 1.8, 8, { kind: "star" });
          e.atk = 24;
          sound("eshot");
        }
        if (e.timer <= 0) {
          e.timer = hpPct < 0.5 ? 300 : 420;
          if (target) {
            fx({ k: "puff", x: e.x, y: e.y - 20, color: "#4a148c", life: 24, big: true });
            const a = rand(0, TAU);
            e.x = target.x + Math.cos(a) * 110 * U;
            e.y = target.y + Math.sin(a) * 110 * U;
            fx({ k: "puff", x: e.x, y: e.y - 20, color: "#4a148c", life: 24, big: true });
          }
          for (let i = 0; i < 6; i++) spawnAround("esqueleto", e, 40);
          sound("boss", 1);
        }
        break;
      case "boss_slime":
        // saltos enormes: al caer hace temblar el suelo
        if (e.state === 0) {
          e.mx = 0; e.my = 0;
          if (e.timer <= 0) { e.state = 1; e.timer = 34; e.dx = ux; e.dy = uy; e.atk = 34; }
        } else {
          e.mx = e.dx; e.my = e.dy; e.sp = e.speed * 5;
          if (e.timer <= 0) {
            e.state = 0;
            e.timer = hpPct < 0.5 ? 60 : 90;
            e.hops = (e.hops || 0) + 1;
            fx({ k: "ring", x: e.x, y: e.y, r: 70 * U, color: "#7cff6b", life: 26 });
            shake(7);
            sound("wave");
            for (const p of alivePlayers()) if (Math.hypot(p.x - e.x, p.y - e.y) < 70 * U) hurtPlayer(p, e.dmg);
            if (e.hops % 3 === 0) {
              const off = rand(0, TAU);
              for (let i = 0; i < 12; i++) enemyShot(e, off + (i / 12) * TAU, 1.5, 8, { kind: "goo" });
            }
          }
        }
        for (const cut of [0.66, 0.33]) {
          if (hpPct < cut && !(e.splits || []).includes(cut)) {
            e.splits = [...(e.splits || []), cut];
            for (let i = 0; i < 8; i++) spawnAround("slime", e, 50);
            emit("toast", { text: L("¡El Moco Rey se divide!"), kind: "boss" });
          }
        }
        break;
      case "boss_general":
        // guarda la distancia, dispara en espiral y pide bombardeos
        if (dist < 160 * U) { e.mx = -ux * 0.7; e.my = -uy * 0.7; } else if (dist < 220 * U) { e.mx = -uy * 0.5; e.my = ux * 0.5; }
        if (e.t % (hpPct < 0.5 ? 8 : 12) === 0) {
          const a = e.t * 0.09;
          for (const k of [0, Math.PI]) enemyShot(e, a + k, 1.6, 7, { kind: "bullet" });
        }
        if (e.timer <= 0) {
          e.timer = hpPct < 0.5 ? 220 : 320;
          e.atk = 30;
          for (const p of alivePlayers()) {
            for (let i = 0; i < 4; i++) {
              const x = p.x + rand(-60, 60) * U;
              const y = p.y + rand(-60, 60) * U;
              st.strikes.push({ x, y, t: 70, dmg: e.dmg });
              fx({ k: "warn", x, y, r: 26 * U, life: 70 });
            }
          }
          sound("boss", 1);
        }
        if (!e.called && hpPct < 0.5) {
          e.called = true;
          for (let i = 0; i < 8; i++) spawnAround("antitronk", e, 60);
          emit("toast", { text: L("¡El General pide refuerzos!"), kind: "boss" });
        }
        break;
    }
  }

  // Bombardeos del General: avisan con un círculo rojo y luego explotan
  function updateStrikes() {
    for (const k of st.strikes) {
      k.t--;
      if (k.t === 0) {
        fx({ k: "boom", x: k.x, y: k.y - 4, r: 26 * U, life: 18 });
        sound("boom", 0.08);
        for (const p of alivePlayers()) if (Math.hypot(p.x - k.x, p.y - k.y) < 26 * U) hurtPlayer(p, k.dmg);
      }
    }
    st.strikes = st.strikes.filter((k) => k.t > 0);
  }

  function explodeKamikaze(e) {
    if (e.dead) return;
    fx({ k: "boom", x: e.x, y: e.y - 6, r: 34 * U, life: 18 });
    sound("boom");
    shake(4);
    for (const p of alivePlayers()) if (Math.hypot(p.x - e.x, p.y - e.y) < 34 * U) hurtPlayer(p, e.dmg);
    // también daña a los enemigos cercanos
    for (const o of enemiesInRadius(e.x, e.y, 34 * U)) if (o !== e) hitEnemy(o, 20, null, { kx: o.x - e.x, ky: o.y - e.y, kb: 2 });
    killEnemy(e, true);
  }

  function separate() {
    for (const e of st.enemies) {
      if (e.dead || TS.ENEMIES[e.type].flying) continue;
      near(e.x, e.y, e.r + 12, (o) => {
        if (o === e || o.id < e.id || TS.ENEMIES[o.type].flying) return;
        const dx = o.x - e.x;
        const dy = o.y - e.y;
        const min = (e.r + o.r) * 0.85;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < min * min) {
          const d = Math.sqrt(d2);
          const push = (min - d) / 2;
          const wa = e.prop ? 0 : o.prop ? 1 : e.boss ? 0.1 : o.boss ? 0.9 : 0.5;
          e.x -= (dx / d) * push * wa * 2;
          e.y -= (dy / d) * push * wa * 2;
          o.x += (dx / d) * push * (1 - wa) * 2;
          o.y += (dy / d) * push * (1 - wa) * 2;
        }
      });
    }
  }

  /* ---------- daño a enemigos ---------- */
  function hitEnemy(e, dmg, pl, { kx = 0, ky = 0, kb = 0, projectile = false, slow = 0, slowFor = 0, crit = false } = {}) {
    if (e.dead || e.phased) return false;
    const d = TS.ENEMIES[e.type];
    if (projectile && d.dodge && e.dodgeCd <= 0 && R() < d.dodge) {
      // el ninja esquiva
      e.dodgeCd = 120;
      fx({ k: "puff", x: e.x, y: e.y - 10, color: "#7d5ab0", life: 18 });
      const a = rand(0, TAU);
      e.x += Math.cos(a) * 26;
      e.y += Math.sin(a) * 26;
      sound("dodge", 0.08);
      fx({ k: "text", x: e.x, y: e.y - 26, text: L("¡Esquivado!"), color: "#d8b4ff", life: 40 });
      return false;
    }
    const might = pl ? pl.stats.might : 1;
    const amount = Math.max(1, Math.round(dmg * might * rand(0.9, 1.1) - (d.armor || 0)));
    e.hp -= amount;
    e.flash = 6;
    if (kb && !e.boss) {
      const l = Math.hypot(kx, ky) || 1;
      const k = kb * (d.heavy ? 0.3 : 1);
      e.kx += (kx / l) * k;
      e.ky += (ky / l) * k;
    }
    if (slow) { e.slow = Math.max(e.slow, slowFor); e.slowAmt = Math.max(e.slow > 0 ? e.slowAmt : 0, slow); }
    if (!e.prop && (R() < 0.22 || amount > 30 || e.boss)) fx({ k: "num", x: e.x + rand(-4, 4), y: e.y - 18, v: amount, big: crit || amount > 40, life: 36 });
    sound("hit", 0.04);
    if (e.hp <= 0) killEnemy(e);
    return true;
  }

  function killEnemy(e, silent) {
    if (e.dead) return;
    e.dead = true;
    const d = TS.ENEMIES[e.type];
    if (e.prop) {
      sound("hit");
      fx({ k: "shards", x: e.x, y: e.y - 10, color: { barril: "#8a5a2b", caja: "#c9a27c", jarron: "#c97a4a", brasero: "#ffb03b" }[e.type], life: 22 });
      const r = R();
      st.propsBroken++;
      const kind = r < 0.03 ? "cofre" : r < 0.3 ? "bocadillo" : r < 0.42 ? "iman" : r < 0.75 ? "moneda" : "gema";
      if (kind === "gema") st.gems.push({ x: e.x, y: e.y, v: 10 + Math.floor(st.t / 3600) * 5, t: 0, pull: false });
      else if (kind === "moneda") for (let i = 0; i < 3; i++) st.pickups.push({ x: e.x + rand(-8, 8), y: e.y + rand(-6, 6), kind: "moneda", t: 0 });
      else st.pickups.push({ x: e.x, y: e.y, kind, t: 0 });
      return;
    }
    st.kills++;
    if (!silent) sound("kill", 0.05);
    fx({ k: "puff", x: e.x, y: e.y - 16, color: e.boss ? "#ffd23f" : "#c9d1dc", life: 16, big: e.boss });
    // gema de experiencia
    const v = d.xp;
    st.gems.push({ x: e.x, y: e.y, v, t: 0, pull: false });
    if (st.gems.length > 420) mergeGems();
    // otros premios
    const r = R();
    if (r < 0.025) st.pickups.push({ x: e.x + 4, y: e.y, kind: "moneda", t: 0 });
    else if (r < 0.035) st.pickups.push({ x: e.x, y: e.y, kind: "bocadillo", t: 0 });
    else if (r < 0.0365) st.pickups.push({ x: e.x, y: e.y, kind: "iman", t: 0 });
    if (d.split) for (let i = 0; i < 2; i++) spawnEnemy(d.split, e.x + rand(-8, 8), e.y + rand(-8, 8));
    if (e.ai === "kamikaze" && !silent) explodeKamikaze({ ...e, dead: false, x: e.x, y: e.y, dmg: e.dmg * 0.6 });
    if (e.boss) {
      st.bossesKilled++;
      st.boss = null;
      st.pickups.push({ x: e.x, y: e.y, kind: "cofre", t: 0 });
      for (let i = 0; i < 8; i++) st.pickups.push({ x: e.x + rand(-26, 26), y: e.y + rand(-26, 26), kind: "moneda", t: 0 });
      shake(10);
      sound("chest");
      Sfx.startMusic("run");
      emit("bossDown", { name: L(d.name) });
      if (e.type === finalBossId() && !st.endless) {
        st.victory = true;
        st.won = true;
        st.endT = 150;
      }
    }
  }

  function mergeGems() {
    // junta las gemas lejanas en una grande para no ir lentos
    const p = st.players[0];
    st.gems.sort((a, b) => dist2(b, p) - dist2(a, p));
    const far = st.gems.splice(0, 120);
    const total = far.reduce((s, g) => s + g.v, 0);
    st.gems.push({ x: far[0].x, y: far[0].y, v: total, t: 0, pull: false });
  }

  /* =======================================================
     JUGADORES
     ======================================================= */

  function hurtPlayer(p, dmg) {
    if (p.down || p.iframes > 0) return;
    const amount = Math.max(1, Math.round(dmg - p.stats.armor));
    p.hp -= amount;
    p.iframes = 36;
    p.flash = 10;
    if (p.id === localId) { shake(3); emit("hurt", {}); }
    sound("hurt", 0.1);
    fx({ k: "num", x: p.x, y: p.y - 34, v: amount, hurt: true, life: 40 });
    if (p.hp <= 0) {
      if (p.stats.revive && !p.usedRevive) {
        p.usedRevive = true;
        p.hp = Math.round(p.stats.maxHp / 2);
        p.iframes = 150;
        fx({ k: "ring", x: p.x, y: p.y, r: 60, color: "#ffd23f", life: 30 });
        emit("toast", { text: LT("secondLife", { name: p.name }), kind: "revive" });
        // empuja a todos los enemigos cercanos
        for (const e of enemiesInRadius(p.x, p.y, 70)) hitEnemy(e, 30, p, { kx: e.x - p.x, ky: e.y - p.y, kb: 8 });
        return;
      }
      p.hp = 0;
      p.down = true;
      p.reviveT = 0;
      sound("die");
      emit("down", { id: p.id, name: p.name });
    }
  }

  function updatePlayer(p) {
    if (p.flash > 0) p.flash--;
    if (p.iframes > 0) p.iframes--;
    if (p.down) {
      // un compañero cerca lo levanta
      const helper = st.players.find((o) => o !== p && !o.down && Math.hypot(o.x - p.x, o.y - p.y) < 22);
      if (helper) {
        p.reviveT++;
        if (p.reviveT >= 150) {
          p.down = false;
          p.hp = Math.round(p.stats.maxHp * 0.4);
          p.iframes = 120;
          fx({ k: "ring", x: p.x, y: p.y, r: 40, color: "#3cc24f", life: 26 });
          emit("toast", { text: LT("revived", { a: helper.name, b: p.name }), kind: "revive" });
        }
      } else p.reviveT = Math.max(0, p.reviveT - 2);
      return;
    }

    let { x, y } = p.input;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    p.moving = l > 0.1;
    if (p.moving) {
      const ox = p.x;
      const oy = p.y;
      p.x += x * p.stats.speed;
      p.y += y * p.stats.speed;
      blockWater(p, ox, oy);
      p.moveX = x / (l || 1);
      p.moveY = y / (l || 1);
      p.walkT++;
      collide(p, 7 * U);
    }
    // hacia dónde mira: hacia donde ataca (un momento) o hacia donde anda
    if (p.atk && p.atk.t > 0) {
      p.atk.t--;
      setDir(p, p.atk.ax, p.atk.ay);
    } else if (p.moving) setDir(p, x, y);
    if (p.atk && p.atk.t <= 0) p.atk = null;

    if (p.stats.regen && st.t % 60 === 0) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.regen);

    if (p.abCd > 0) p.abCd--;
    if ((p.input.ab || 0) !== p.abSeen) {
      p.abSeen = p.input.ab || 0;
      if (p.abCd <= 0) useAbility(p);
    }

    for (const w of p.weapons) updateWeapon(p, w);
  }

  /* ---------- habilidades especiales ---------- */
  function abilityMax(p) {
    const a = TS.ABILITIES[p.charId];
    return Math.round((a ? a.cd : 20) * 60 * p.stats.cdMul);
  }

  function useAbility(p) {
    const ab = TS.ABILITIES[p.charId];
    if (!ab) return;
    p.abCd = abilityMax(p);
    if (p.id === localId) st.abilitiesUsed = (st.abilitiesUsed || 0) + 1;
    const area = p.stats.area;
    const lvl = 1 + st.level * 0.06; // crece con el nivel de la partida
    const cx = p.x;
    const cy = p.y - 16;
    const [ax, ay] = p.moving ? [p.moveX, p.moveY] : [p.aimX || p.face, p.aimY || 0];
    attackAnim(p, p.weapons[0] ? p.weapons[0].id : "tajo", ax, ay, 24);
    fx({ k: "text", x: p.x, y: p.y - 46, text: L(ab.name), color: "#ffd23f", life: 60 });
    emit("ability", { id: p.id, name: L(ab.name) });
    const ring = (n, make) => { const off = rand(0, TAU); for (let i = 0; i < n; i++) make(off + (i / n) * TAU); };
    const near = (n, r) => st.enemies.filter((e) => !e.prop && !e.dead && Math.hypot(e.x - p.x, e.y - p.y) < r).sort((a, b) => dist2(a, p) - dist2(b, p)).slice(0, n);
    switch (p.charId) {
      case "ranjay":
        for (let i = 0; i < 4; i++) st.zones.push({ type: "slash", x: cx, y: cy, ang: (i / 4) * TAU, R: 80 * area, life: 16, t: 0, dirSign: 1, owner: p.id, gold: true });
        for (const e of enemiesInRadius(cx, cy, 80 * area)) hitEnemy(e, 60 * lvl, p, { kx: e.x - cx, ky: e.y - cy, kb: 6, crit: true });
        sound("slash"); shake(5);
        break;
      case "bruno":
        fx({ k: "boom", x: p.x, y: p.y - 6, r: 90 * area, life: 26, fire: true });
        for (const e of enemiesInRadius(p.x, p.y, 90 * area)) hitEnemy(e, 70 * lvl, p, { kx: e.x - p.x, ky: e.y - p.y, kb: 8, crit: true });
        sound("boom"); shake(9);
        break;
      case "lia":
        p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * 0.4);
        p.iframes = 180;
        fx({ k: "ring", x: p.x, y: p.y, r: 70, color: "#ff9fd0", life: 34 });
        for (const o of st.players) if (o !== p && !o.down && Math.hypot(o.x - p.x, o.y - p.y) < 120) o.hp = Math.min(o.stats.maxHp, o.hp + o.stats.maxHp * 0.25);
        sound("levelUp");
        break;
      case "toto":
        ring(12, (a) => st.shots.push({ type: "ball", x: cx, y: cy, vx: Math.cos(a) * 3.4 * U, vy: Math.sin(a) * 3.4 * U, ang: 0, dmg: 26 * lvl, pierce: 6, life: 200, r: 6, hit: new Set(), owner: p.id, target: 0 }));
        sound("punch");
        break;
      case "omogos":
        ring(24, (a) => st.shots.push({ type: "bolt", x: cx, y: cy, vx: Math.cos(a) * 6 * U, vy: Math.sin(a) * 6 * U, ang: a, dmg: 30 * lvl, pierce: 4, life: 70, r: 4, hit: new Set(), owner: p.id }));
        sound("shoot");
        break;
      case "finillos":
        st.zones.push({ type: "wave", x: p.x, y: p.y, r: 0, maxR: 160 * area, life: 30, t: 0, hit: new Set(), dmg: 55 * lvl, owner: p.id });
        shake(10);
        break;
      case "chambas":
        ring(8, (a) => st.shots.push({ type: "axe", x: cx, y: cy, vx: Math.cos(a) * 4 * U, vy: Math.sin(a) * 4 * U, ang: 0, dmg: 34 * lvl, pierce: 999, life: 200, r: 9 * area, hit: new Set(), hitT: {}, owner: p.id, out: 130 * area, travelled: 0, back: false }));
        sound("slash");
        break;
      case "frosti":
        for (const e of st.enemies) {
          if (e.prop || Math.hypot(e.x - p.x, e.y - p.y) > 420) continue;
          e.slow = Math.max(e.slow, e.boss ? 120 : 240);
          e.slowAmt = e.boss ? 0.6 : 0.97;
          hitEnemy(e, 15 * lvl, p, {});
        }
        fx({ k: "ring", x: p.x, y: p.y, r: 200, color: "#bfe9ff", life: 34 });
        sound("ice");
        break;
      case "yant":
      case "kaito": {
        const len = (p.charId === "kaito" ? 150 : 120) * U;
        const ang = Math.atan2(ay, ax);
        for (const e of enemiesOnLine(cx, cy, ang, len, 16 * area)) hitEnemy(e, (p.charId === "kaito" ? 55 : 65) * lvl, p, { kx: ax, ky: ay, kb: 5, crit: true });
        st.zones.push({ type: "thrust", x: cx, y: cy, ang, len, life: 14, t: 0 });
        fx({ k: "puff", x: p.x, y: p.y - 10, color: p.charId === "kaito" ? "#3b1f5c" : "#ffe9a8", life: 18 });
        const ox = p.x;
        const oy = p.y;
        p.x += ax * len * 0.9;
        p.y += ay * len * 0.9;
        collide(p, 7 * U);
        if (terrain(p.x, p.y) === 2) { p.x = ox; p.y = oy; }
        p.iframes = Math.max(p.iframes, 40);
        sound("dodge");
        break;
      }
      case "eledemak":
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU;
          st.zones.push({ type: "punch", x: cx + Math.cos(a) * 34, y: cy + Math.sin(a) * 24, r: 14 * area, life: 9 + i, t: -i * 2, big: true, glove: true });
        }
        for (const e of enemiesInRadius(cx, cy, 60 * area)) hitEnemy(e, 50 * lvl, p, { kx: e.x - cx, ky: e.y - cy, kb: 12 });
        sound("punch"); shake(5);
        break;
      case "nova":
        near(10, 380).forEach((e, i) => st.zones.push({ type: "meteor", x: e.x, y: e.y, t: -i * 6, warn: 30, life: 46, r: 34 * area, dmg: 60 * lvl, owner: p.id }));
        break;
      case "sunk":
        st.zones.push({ type: "wave", x: p.x, y: p.y, r: 0, maxR: 120 * area, life: 22, t: 0, hit: new Set(), dmg: 80 * lvl, owner: p.id });
        st.zones.push({ type: "punch", x: cx + ax * 14, y: cy + ay * 10, r: 22, life: 12, t: 0, big: true });
        shake(8);
        break;
      case "quizo":
        for (const e of near(14, 400)) {
          st.zones.push({ type: "bolt", pts: [[e.x + rand(-20, 20), e.y - 220], [e.x + rand(-8, 8), e.y - 110], [e.x, e.y - 14]], life: 14, t: 0 });
          hitEnemy(e, 55 * lvl, p, { kb: 2, kx: e.x - p.x, ky: e.y - p.y, crit: true });
        }
        sound("zap"); shake(4);
        break;
      case "zeta": {
        const ang = Math.atan2(ay, ax);
        for (const s of [-0.5, 0, 0.5]) {
          st.zones.push({ type: "laser", x: cx, y: cy, ang: ang + s, len: 260, life: 18, t: 0 });
          for (const e of enemiesOnLine(cx, cy, ang + s, 260, 12)) hitEnemy(e, 50 * lvl, p, { kx: Math.cos(ang), ky: Math.sin(ang), kb: 2 });
        }
        sound("laser");
        break;
      }
      case "duna":
        ring(4, (a) => st.zones.push({ type: "tornado", x: cx, y: cy + 8, vx: Math.cos(a) * 1.6 * U, vy: Math.sin(a) * 1.6 * U, t: 0, life: 300, r: 28 * area, dmg: 18 * lvl, owner: p.id }));
        sound("dodge");
        break;
    }
  }

  // 8 direcciones: 5 dibujos y las de la izquierda son el espejo
  const OCTANTS = { 0: ["side", 1], 1: ["downSide", 1], 2: ["down", 1], 3: ["downSide", -1], 4: ["side", -1], "-4": ["side", -1], "-3": ["upSide", -1], "-2": ["up", 1], "-1": ["upSide", 1] };
  function dirOf(x, y) {
    return OCTANTS[Math.round(Math.atan2(y, x) / (Math.PI / 4))] || OCTANTS[0];
  }
  function setDir(p, x, y) {
    if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) return;
    const [dir, face] = dirOf(x, y);
    p.dir = dir;
    p.face = face;
  }

  function attackAnim(p, weaponId, ax, ay, frames = 18) {
    const l = Math.hypot(ax, ay) || 1;
    p.atk = { t: frames, total: frames, ax: ax / l, ay: ay / l, style: STYLE_OF[weaponId] || "cast" };
    p.aimX = ax / l;
    p.aimY = ay / l;
  }

  function contact() {
    for (const p of st.players) {
      if (p.down) continue;
      near(p.x, p.y, 30 * U, (e) => {
        if (e.phased || e.prop) return;
        const rr = e.r + 6 * U;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < rr * rr) {
          if (e.ai === "dash" && e.state === 2) hurtPlayer(p, e.dmg * 0.9);
          else hurtPlayer(p, e.dmg * 0.6);
        }
      });
    }
    for (const s of st.eshots) {
      s.x += s.vx;
      s.y += s.vy;
      s.life--;
      for (const p of st.players) {
        if (p.down) continue;
        if ((s.x - p.x) ** 2 + (s.y - (p.y - 18)) ** 2 < (s.r + 9) ** 2) {
          hurtPlayer(p, s.dmg);
          s.life = 0;
        }
      }
    }
    st.eshots = st.eshots.filter((s) => s.life > 0);
  }

  /* =======================================================
     ARMAS
     ======================================================= */

  function levelStats(w) {
    const L = TS.WEAPONS[w.id].levels[w.lvl - 1];
    if (!w.evo) return L;
    // arma evolucionada: mucho más fuerte
    return {
      ...L,
      dmg: L.dmg * 1.7,
      cd: L.cd ? Math.round(L.cd * 0.72) : L.cd,
      count: (L.count || 1) + 2,
      area: (L.area || 1) * 1.3,
      pierce: L.pierce ? L.pierce + 3 : L.pierce,
      dur: L.dur ? L.dur * 1.4 : L.dur,
      speed: L.speed ? L.speed * 1.15 : L.speed
    };
  }

  function evolvable(pl) {
    return pl.weapons.find((w) => !w.evo && w.lvl >= 6 && TS.EVOLUTIONS[w.id] && pl.passives[TS.EVOLUTIONS[w.id].passive]);
  }

  function dirTo(p, e) {
    if (!e) return [p.moveX || p.face, p.moveY || 0];
    const dx = e.x - p.x;
    const dy = e.y - (p.y - 16);
    const l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }

  function updateWeapon(p, w) {
    const L = levelStats(w);
    const area = (L.area || 1) * p.stats.area;
    const amount = (L.count || 1) + p.stats.amount;
    const cx = p.x;
    const cy = p.y - 18;

    // armas que actúan siempre
    if (w.id === "colonia") {
      w.cd--;
      if (w.cd <= 0) {
        w.cd = L.cd;
        for (const e of enemiesInRadius(cx, cy + 6, 44 * area)) hitEnemy(e, L.dmg, p, { kx: e.x - cx, ky: e.y - cy, kb: 0.6, slow: 0.35, slowFor: 30 });
      }
      return;
    }
    if (w.id === "dron") {
      while (w.drones.length < amount) w.drones.push({ a: rand(0, TAU), cd: rand(0, L.cd) });
      w.drones.length = amount;
      for (const [i, dr] of w.drones.entries()) {
        dr.a += 0.025;
        dr.x = p.x + Math.cos(dr.a + (i / amount) * TAU) * 34;
        dr.y = p.y - 50 + Math.sin(dr.a + (i / amount) * TAU) * 14;
        dr.cd--;
        if (dr.cd <= 0) {
          const target = nearestEnemy(dr.x, dr.y, 230);
          if (target) {
            dr.cd = L.cd * p.stats.cdMul;
            const ang = Math.atan2(target.y - 16 - dr.y, target.x - dr.x);
            const len = 240 * area;
            st.zones.push({ type: "laser", x: dr.x, y: dr.y, ang, len, life: 10, t: 0 });
            for (const e of enemiesOnLine(dr.x, dr.y, ang, len, 6)) hitEnemy(e, L.dmg, p, { kx: Math.cos(ang), ky: Math.sin(ang), kb: 1 });
            sound("laser", 0.06);
            if (i === 0) attackAnim(p, "dron", Math.cos(ang), Math.sin(ang), 12);
          } else dr.cd = 10;
        }
      }
      return;
    }

    // combos de puñetazos en curso
    if (w.combo > 0) {
      w.comboT--;
      if (w.comboT <= 0) {
        w.combo--;
        w.comboT = 9;
        punch(p, w, L, area, w.combo === 0);
      }
      return;
    }

    w.cd--;
    if (w.cd > 0) return;
    w.cd = L.cd * p.stats.cdMul;
    fire(p, w, L, area, amount, cx, cy);
  }

  function punch(p, w, L, area, last) {
    const target = nearestEnemy(p.x, p.y - 8, 70 * area);
    const [ax, ay] = dirTo(p, target);
    attackAnim(p, w.id, ax, ay, 10);
    const reach = (w.id === "punos" ? 22 : 18) * area;
    const hx = p.x + ax * reach;
    const hy = p.y - 10 + ay * reach;
    const big = last;
    st.zones.push({ type: "punch", x: hx, y: hy, r: (big ? 14 : 10) * area, life: 9, t: 0, big, glove: w.id === "guantes" });
    for (const e of enemiesInRadius(hx, hy, (big ? 15 : 11) * area)) hitEnemy(e, L.dmg * (big ? 1.7 : 1), p, { kx: ax, ky: ay, kb: big ? 7 : 2.5 });
    sound("punch", 0.05);
    if (w.id === "punos" && big) {
      // la onda del puñetazo de Sunk sale hacia delante y lo atraviesa todo
      st.shots.push({ type: "onda", x: hx, y: hy, vx: ax * L.speed * U, vy: ay * L.speed * U, ang: Math.atan2(ay, ax), dmg: L.dmg * 0.9, pierce: 99, life: 45, r: 9 * area, hit: new Set(), owner: p.id });
      shake(2);
    }
  }

  function fire(p, w, L, area, amount, cx, cy) {
    switch (w.id) {
      case "tajo": { // barrido de espada
        const target = nearestEnemy(cx, cy, 90 * area);
        const [ax, ay] = target ? dirTo(p, target) : [p.face, 0];
        attackAnim(p, w.id, ax, ay, 18);
        const base = Math.atan2(ay, ax);
        const R = 40 * area;
        const sweeps = Math.min(4, (L.count || 1) + p.stats.amount);
        for (let i = 0; i < sweeps; i++) {
          const ang = base + [0, Math.PI, Math.PI / 2, -Math.PI / 2][i];
          st.zones.push({ type: "slash", x: cx, y: cy, ang, R, life: 14, t: 0, dirSign: i % 2 ? -1 : 1, owner: p.id, gold: !!w.evo });
          for (const e of enemiesInRadius(cx, cy, R)) {
            let da = Math.atan2(e.y - 16 - cy, e.x - cx) - ang;
            da = Math.atan2(Math.sin(da), Math.cos(da));
            if (Math.abs(da) < 1.35) hitEnemy(e, L.dmg, p, { kx: Math.cos(ang), ky: Math.sin(ang), kb: 3 });
          }
        }
        sound("slash");
        break;
      }
      case "virote": { // ballesta: apunta, dispara y retrocede
        const used = new Set();
        let first = null;
        for (let i = 0; i < amount; i++) {
          const target = nearestEnemy(cx, cy, 300, used);
          if (target) used.add(target.id);
          const [ax, ay] = target ? dirTo(p, target) : [p.face, 0];
          if (!first) first = [ax, ay];
          const ang = Math.atan2(ay, ax) + (target ? 0 : (i - (amount - 1) / 2) * 0.15);
          st.shots.push({ type: "bolt", x: cx + Math.cos(ang) * 10, y: cy + 2 + Math.sin(ang) * 10, vx: Math.cos(ang) * L.speed * U, vy: Math.sin(ang) * L.speed * U, ang, dmg: L.dmg, pierce: L.pierce, life: 90, r: 4, hit: new Set(), owner: p.id, delay: i * 5 });
        }
        attackAnim(p, w.id, first[0], first[1], 16);
        fx({ k: "flash", x: cx + first[0] * 13, y: cy + 2 + first[1] * 13, life: 6 });
        sound("shoot");
        break;
      }
      case "mazazo": { // golpe al suelo en círculo
        const target = nearestEnemy(cx, cy, 90);
        const [ax, ay] = target ? dirTo(p, target) : [p.face, 0];
        attackAnim(p, w.id, ax, ay, 20);
        const waves = 1 + Math.min(2, p.stats.amount);
        for (let i = 0; i < waves; i++) st.zones.push({ type: "wave", x: p.x + ax * 10, y: p.y + ay * 6, r: 0, maxR: 62 * area, life: 24, t: -12 - i * 14, hit: new Set(), dmg: L.dmg, owner: p.id });
        break;
      }
      case "estocada": { // lanza
        const target = nearestEnemy(cx, cy, 160);
        const [ax, ay] = dirTo(p, target);
        attackAnim(p, w.id, ax, ay, 16);
        const base = Math.atan2(ay, ax);
        const len = 86 * area;
        for (let i = 0; i < amount; i++) {
          const ang = base + [0, -0.4, 0.4, -0.8, 0.8][i % 5];
          st.zones.push({ type: "thrust", x: cx, y: cy, ang, len, life: 12, t: 0 });
          for (const e of enemiesOnLine(cx, cy, ang, len, 7)) hitEnemy(e, L.dmg, p, { kx: Math.cos(ang), ky: Math.sin(ang), kb: 2 });
        }
        sound("slash");
        break;
      }
      case "guantes":
      case "punos":
        w.combo = amount;
        w.comboT = 0;
        break;
      case "hacha": {
        const used = new Set();
        for (let i = 0; i < amount; i++) {
          const target = nearestEnemy(cx, cy, 200, used);
          if (target) used.add(target.id);
          const [ax, ay] = target ? dirTo(p, target) : [Math.cos(i * 2), Math.sin(i * 2)];
          if (i === 0) attackAnim(p, w.id, ax, ay, 14);
          st.shots.push({ type: "axe", x: cx, y: cy, vx: ax * 4 * U, vy: ay * 4 * U, ang: 0, dmg: L.dmg, pierce: 999, life: 200, r: 8 * area, hit: new Set(), hitT: {}, owner: p.id, out: 110 * area, travelled: 0, back: false });
        }
        sound("slash");
        break;
      }
      case "rayo": { // el tridente lanza rayos que saltan
        const first = nearestEnemy(cx, cy, 190);
        if (!first) { w.cd = 20; return; }
        const [ax, ay] = dirTo(p, first);
        attackAnim(p, w.id, ax, ay, 16);
        const tipX = cx + ax * 6;
        const tipY = cy - 14;
        const pts = [[tipX, tipY]];
        const hit = new Set();
        let cur = first;
        const jumps = L.count + p.stats.amount * 2;
        for (let i = 0; i < jumps && cur; i++) {
          hit.add(cur.id);
          pts.push([cur.x, cur.y - 10]);
          hitEnemy(cur, L.dmg * (i === 0 ? 1.2 : 1), p, { kx: 0, ky: 0, kb: 0 });
          fx({ k: "spark", x: cur.x, y: cur.y - 10, life: 10 });
          cur = nearestEnemy(cur.x, cur.y, 90, hit);
        }
        st.zones.push({ type: "bolt", pts, life: 12, t: 0 });
        sound("zap");
        break;
      }
      case "petardo": {
        for (let i = 0; i < amount; i++) {
          const target = nearestEnemy(cx, cy, 220);
          const tx = target ? target.x + rand(-20, 20) : cx + rand(-100, 100);
          const ty = target ? target.y + rand(-20, 20) : cy + rand(-80, 80);
          if (i === 0) attackAnim(p, w.id, tx - cx, ty - cy, 14);
          st.zones.push({ type: "bomb", x0: cx, y0: cy, x: cx, y: cy, tx, ty, t: -i * 6, life: 36 + 16, dur: 36, r: 32 * area, dmg: L.dmg, owner: p.id });
        }
        break;
      }
      case "balon": {
        for (let i = 0; i < amount; i++) {
          const target = nearestEnemy(cx, cy, 240);
          const [ax, ay] = dirTo(p, target);
          if (i === 0) attackAnim(p, w.id, ax, ay, 14);
          st.shots.push({ type: "ball", x: cx, y: cy, vx: ax * L.speed * U, vy: ay * L.speed * U, ang: 0, dmg: L.dmg, pierce: L.pierce, life: 260, r: 6, hit: new Set(), owner: p.id, target: target ? target.id : 0, delay: i * 10 });
        }
        sound("pick", 0.05);
        break;
      }
      case "copos": {
        const n = L.count + p.stats.amount * 2;
        const off = rand(0, TAU);
        attackAnim(p, w.id, p.face, 0, 14);
        for (let i = 0; i < n; i++) {
          const ang = off + (i / n) * TAU;
          st.shots.push({ type: "ice", x: cx, y: cy, vx: Math.cos(ang) * L.speed * U, vy: Math.sin(ang) * L.speed * U, ang, dmg: L.dmg, pierce: 1, life: 60, r: 4, hit: new Set(), owner: p.id });
        }
        sound("ice");
        break;
      }
      case "kunai": {
        const target = nearestEnemy(cx, cy, 220);
        const [ax, ay] = p.moving ? [p.moveX, p.moveY] : dirTo(p, target);
        attackAnim(p, w.id, ax, ay, 10);
        const base = Math.atan2(ay, ax);
        for (let i = 0; i < amount; i++) {
          const ang = base + (i - (amount - 1) / 2) * 0.12;
          st.shots.push({ type: "kunai", x: cx, y: cy, vx: Math.cos(ang) * L.speed * U, vy: Math.sin(ang) * L.speed * U, ang, dmg: L.dmg, pierce: L.pierce, life: 60, r: 4, hit: new Set(), owner: p.id, delay: i * 3 });
        }
        sound("shoot", 0.05);
        break;
      }
      case "meteoro": {
        attackAnim(p, w.id, p.face, -0.3, 18);
        for (let i = 0; i < amount; i++) {
          const target = nearestEnemy(cx + rand(-120, 120), cy + rand(-90, 90), 160);
          const x = target ? target.x : cx + rand(-120, 120);
          const y = target ? target.y : cy + rand(-90, 90);
          st.zones.push({ type: "meteor", x, y, t: -i * 10, warn: 40, life: 56, r: 30 * area, dmg: L.dmg, owner: p.id });
        }
        break;
      }
      case "tornado": {
        attackAnim(p, w.id, p.face, 0, 16);
        for (let i = 0; i < amount; i++) {
          const a = rand(0, TAU);
          st.zones.push({ type: "tornado", x: cx, y: cy + 8, vx: Math.cos(a) * 1.3 * U, vy: Math.sin(a) * 1.3 * U, t: 0, life: L.dur, r: 20 * area, dmg: L.dmg, owner: p.id });
        }
        sound("wave", 0.2);
        break;
      }
    }
  }

  function enemiesOnLine(x, y, ang, len, w) {
    const out = [];
    const cx = Math.cos(ang);
    const cy = Math.sin(ang);
    near(x + cx * len / 2, y + cy * len / 2, len / 2 + 20, (e) => {
      const ex = e.x - x;
      const ey = e.y - 16 - y;
      const t = ex * cx + ey * cy;
      if (t < 0 || t > len) return;
      const perp = Math.abs(ex * -cy + ey * cx);
      if (perp < w + e.r) out.push(e);
    });
    return out;
  }

  function updateShots() {
    for (const s of st.shots) {
      if (s.delay > 0) { s.delay--; continue; }
      const owner = st.players[s.owner];
      if (s.type === "axe") {
        s.ang += 0.35;
        if (!s.back) {
          s.travelled += Math.hypot(s.vx, s.vy);
          if (s.travelled > s.out) s.back = true;
        } else if (owner) {
          const dx = owner.x - s.x;
          const dy = owner.y - 10 - s.y;
          const l = Math.hypot(dx, dy) || 1;
          s.vx += (dx / l) * 0.35 * U;
          s.vy += (dy / l) * 0.35 * U;
          const sp = Math.hypot(s.vx, s.vy);
          if (sp > 5 * U) { s.vx *= (5 * U) / sp; s.vy *= (5 * U) / sp; }
          if (l < 12) s.life = 0;
        }
      } else if (s.type === "ball") {
        s.ang += 0.2;
        const target = st.enemies.find((e) => e.id === s.target && !e.dead);
        if (target) {
          const dx = target.x - s.x;
          const dy = target.y - 16 - s.y;
          const l = Math.hypot(dx, dy) || 1;
          const sp = Math.hypot(s.vx, s.vy) || 4;
          s.vx = s.vx * 0.8 + (dx / l) * sp * 0.2;
          s.vy = s.vy * 0.8 + (dy / l) * sp * 0.2;
        }
      }
      s.x += s.vx;
      s.y += s.vy;
      s.life--;
      near(s.x, s.y + 8, s.r + 20, (e) => {
        if (s.life <= 0) return;
        const rr = s.r + e.r;
        if ((e.x - s.x) ** 2 + (e.y - 16 - s.y) ** 2 > rr * rr) return;
        if (s.type === "axe") {
          if ((s.hitT[e.id] || 0) > st.t) return;
          s.hitT[e.id] = st.t + 20;
        } else if (s.hit.has(e.id)) return;
        s.hit.add(e.id);
        const slow = s.type === "ice" ? 0.6 : 0;
        const ok = hitEnemy(e, s.dmg, owner, { kx: s.vx, ky: s.vy, kb: s.type === "onda" ? 4 : 1.4, projectile: s.type !== "onda", slow, slowFor: slow ? 70 : 0 });
        if (!ok) return;
        if (s.type === "ice") fx({ k: "spark", x: e.x, y: e.y - 16, color: "#bfefff", life: 10 });
        if (s.type === "ball") {
          const next = nearestEnemy(e.x, e.y, 130, s.hit);
          s.target = next ? next.id : 0;
          sound("pick", 0.05);
        }
        s.pierce--;
        if (s.pierce <= 0) s.life = 0;
      });
    }
    st.shots = st.shots.filter((s) => s.life > 0);
  }

  function updateZones() {
    for (const z of st.zones) {
      z.t++;
      if (z.t < 0) continue;
      switch (z.type) {
        case "wave": {
          if (z.t === 1) {
            sound("wave");
            shake(5);
            fx({ k: "crack", x: z.x, y: z.y, r: 22, life: 60 });
            fx({ k: "dust", x: z.x, y: z.y, r: z.maxR, life: 26 });
          }
          z.r = z.maxR * Math.min(1, Math.sin((z.t / z.life) * Math.PI * 0.5));
          const owner = st.players[z.owner];
          for (const e of enemiesInRadius(z.x, z.y, z.r)) {
            if (z.hit.has(e.id)) continue;
            z.hit.add(e.id);
            hitEnemy(e, z.dmg, owner, { kx: e.x - z.x, ky: e.y - z.y, kb: 6 });
          }
          break;
        }
        case "bomb": {
          const k = Math.min(1, z.t / z.dur);
          z.x = z.x0 + (z.tx - z.x0) * k;
          z.y = z.y0 + (z.ty - z.y0) * k;
          if (z.t === z.dur) {
            fx({ k: "boom", x: z.tx, y: z.ty, r: z.r, life: 18 });
            sound("boom", 0.05);
            shake(3);
            for (const e of enemiesInRadius(z.tx, z.ty, z.r)) hitEnemy(e, z.dmg, st.players[z.owner], { kx: e.x - z.tx, ky: e.y - z.ty, kb: 4 });
          }
          break;
        }
        case "meteor":
          if (z.t === z.warn) {
            fx({ k: "boom", x: z.x, y: z.y, r: z.r, life: 20, fire: true });
            fx({ k: "crack", x: z.x, y: z.y, r: z.r * 0.6, life: 60 });
            sound("boom", 0.05);
            shake(4);
            for (const e of enemiesInRadius(z.x, z.y, z.r)) hitEnemy(e, z.dmg, st.players[z.owner], { kx: e.x - z.x, ky: e.y - z.y, kb: 5 });
          }
          break;
        case "tornado": {
          z.x += z.vx;
          z.y += z.vy;
          if (z.t % 40 === 0) { const a = Math.atan2(z.vy, z.vx) + rand(-1, 1); z.vx = Math.cos(a) * 1.3 * U; z.vy = Math.sin(a) * 1.3 * U; }
          for (const e of enemiesInRadius(z.x, z.y, z.r * 1.8)) {
            if (!e.boss) { e.x += (z.x - e.x) * 0.04; e.y += (z.y - e.y) * 0.04; }
          }
          if (z.t % 14 === 0) for (const e of enemiesInRadius(z.x, z.y, z.r)) hitEnemy(e, z.dmg, st.players[z.owner]);
          break;
        }
      }
    }
    st.zones = st.zones.filter((z) => z.t < z.life);
  }

  /* =======================================================
     GEMAS, OBJETOS Y SUBIDAS DE NIVEL
     ======================================================= */

  function updatePickups() {
    const alive = alivePlayers();
    for (const g of st.gems) {
      g.t++;
      let best = null;
      let bd = Infinity;
      for (const p of alive) {
        const d = (p.x - g.x) ** 2 + (p.y - 6 - g.y) ** 2;
        if (d < bd) { bd = d; best = p; }
      }
      if (!best) continue;
      if (g.pull || bd < best.stats.magnet ** 2) {
        g.pull = true;
        const d = Math.sqrt(bd) || 1;
        const sp = Math.min(9, 2 + g.t * 0.02 + (g.pullT = (g.pullT || 0) + 0.25));
        g.x += ((best.x - g.x) / d) * sp;
        g.y += ((best.y - 6 - g.y) / d) * sp;
        if (d < 8) {
          g.taken = true;
          st.xp += g.v * best.stats.growth * st.mod.xp;
          sound("gem", 0.03);
        }
      }
    }
    st.gems = st.gems.filter((g) => !g.taken);

    for (const it of st.pickups) {
      it.t++;
      for (const p of alive) {
        const d = Math.hypot(p.x - it.x, p.y - 6 - it.y);
        const reach = it.kind === "moneda" ? p.stats.magnet * 0.7 : 14;
        if (d < reach && it.kind === "moneda" && d > 8) {
          it.x += ((p.x - it.x) / d) * 3.5;
          it.y += ((p.y - 6 - it.y) / d) * 3.5;
        }
        if (d < 10 && !it.taken) {
          it.taken = true;
          takePickup(p, it);
        }
      }
    }
    st.pickups = st.pickups.filter((it) => !it.taken);

    while (st.xp >= st.xpNext) {
      st.xp -= st.xpNext;
      st.level++;
      st.xpNext = xpFor(st.level);
      st.pendingLevels++;
      sound("levelUp");
      fx({ k: "ring", x: st.players[localId].x, y: st.players[localId].y, r: 40, color: "#7fdcff", life: 24 });
    }
    if (st.pendingLevels > 0 && !st.choosing) startChoosing();
  }

  function takePickup(p, it) {
    switch (it.kind) {
      case "moneda":
        st.coins += st.mod.coins;
        sound("coin", 0.05);
        break;
      case "bocadillo":
        p.hp = Math.min(p.stats.maxHp, p.hp + 30);
        fx({ k: "text", x: p.x, y: p.y - 36, text: "+30", color: "#7fff8a", life: 40 });
        sound("pick");
        break;
      case "iman":
        for (const g of st.gems) g.pull = true;
        sound("chest");
        emit("toast", { text: L("¡Imán! Todas las gemas vienen a ti"), kind: "pick" });
        break;
      case "cofre": {
        sound("chest");
        st.coins += 40;
        const got = [];
        for (const pl of st.players) {
          const evo = evolvable(pl);
          if (evo) {
            evo.evo = true;
            st.evolutions++;
            const e = TS.EVOLUTIONS[evo.id];
            got.push(LT("chestEvo", { player: pl.name, from: L(TS.WEAPONS[evo.id].name), to: L(e.name) }));
            fx({ k: "ring", x: pl.x, y: pl.y, r: 90, color: "#ffd23f", life: 40 });
            emit("evolve", { name: e.name, desc: e.desc, player: pl.name });
            continue;
          }
          const opt = pick(buildOptions(pl, 6).filter((o) => o.kind !== "heal" && o.kind !== "coins"));
          if (opt) { applyChoice(pl, opt); got.push(`${pl.name}: ${opt.title}`); }
        }
        emit("chest", { lines: got });
        break;
      }
    }
  }

  function buildOptions(pl, n = 3) {
    const pool = [];
    for (const w of pl.weapons) if (w.lvl < 6) pool.push({ kind: "weapon", id: w.id, lvl: w.lvl + 1, weight: 3 });
    if (pl.weapons.length < TS.MAX_WEAPONS) {
      for (const id of Object.keys(TS.WEAPONS)) if (!pl.weapons.some((w) => w.id === id)) pool.push({ kind: "weapon", id, lvl: 1, weight: 1.2 });
    }
    const owned = Object.keys(pl.passives);
    for (const id of owned) if (pl.passives[id] < TS.PASSIVES[id].max) pool.push({ kind: "passive", id, lvl: pl.passives[id] + 1, weight: 2 });
    if (owned.length < TS.MAX_PASSIVES) {
      for (const id of Object.keys(TS.PASSIVES)) if (!(id in pl.passives)) pool.push({ kind: "passive", id, lvl: 1, weight: 1 });
    }
    const out = [];
    while (out.length < n && pool.length) {
      let total = pool.reduce((s, o) => s + o.weight, 0);
      let r = R() * total;
      let idx = 0;
      for (; idx < pool.length; idx++) { r -= pool[idx].weight; if (r <= 0) break; }
      out.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
    }
    if (!out.length) out.push({ kind: "heal" }, { kind: "coins" });
    return out.map((o) => describe(pl, o));
  }

  function describe(pl, o) {
    if (o.kind === "heal") return { ...o, title: L("Bocadillo"), desc: L("Recupera 40 de vida"), icon: "bocadillo" };
    if (o.kind === "coins") return { ...o, title: L("Bolsa de monedas"), desc: L("+25 monedas"), icon: "moneda" };
    if (o.kind === "passive") {
      const d = TS.PASSIVES[o.id];
      return { ...o, title: L(d.name), desc: L(d.desc), icon: o.id, isNew: o.lvl === 1 };
    }
    const d = TS.WEAPONS[o.id];
    if (o.lvl === 1) return { ...o, title: L(d.name), desc: L(d.desc), icon: o.id, isNew: true };
    const a = d.levels[o.lvl - 2];
    const b = d.levels[o.lvl - 1];
    const parts = [];
    if (b.dmg !== a.dmg) parts.push(LT("dmg", { a: a.dmg, b: b.dmg }));
    if (b.count && b.count !== a.count) parts.push(LT(o.id === "rayo" ? "jumps" : "more", { n: b.count - a.count }));
    if (b.area && b.area !== a.area) parts.push(LT("areaUp", { n: Math.round((b.area / a.area - 1) * 100) }));
    if (b.pierce && b.pierce !== a.pierce) parts.push(LT("pierceUp"));
    if (b.cd && b.cd < a.cd) parts.push(LT("faster"));
    return { ...o, title: LT("levelOf", { name: L(d.name), lvl: o.lvl }), desc: parts.join(" · "), icon: o.id };
  }

  function applyChoice(pl, o) {
    if (o.kind === "weapon") {
      const w = pl.weapons.find((x) => x.id === o.id);
      if (w) w.lvl = Math.min(6, w.lvl + 1);
      else addWeapon(pl, o.id);
    } else if (o.kind === "passive") {
      pl.passives[o.id] = (pl.passives[o.id] || 0) + 1;
      computeStats(pl);
    } else if (o.kind === "heal") {
      pl.hp = Math.min(pl.stats.maxHp, pl.hp + 40);
    } else if (o.kind === "coins") {
      st.coins += 25;
    }
  }

  function startChoosing() {
    st.choosing = {};
    for (const pl of st.players) st.choosing[pl.id] = buildOptions(pl, 3);
    emit("levelUp", { options: st.choosing[localId], level: st.level, players: st.players.length });
    if (mode === "host") emit("netChoices", st.choosing);
  }

  function choose(playerId, index) {
    if (!st || !st.choosing || !st.choosing[playerId]) return;
    const opt = st.choosing[playerId][index] || st.choosing[playerId][0];
    applyChoice(st.players[playerId], opt);
    delete st.choosing[playerId];
    if (playerId === localId) emit("chosen", {});
    if (Object.keys(st.choosing).length === 0) {
      st.choosing = null;
      st.pendingLevels--;
      if (st.pendingLevels > 0) startChoosing();
      else emit("resume", {});
    }
  }

  /* =======================================================
     BUCLE
     ======================================================= */

  function step() {
    if (!st || st.over) return;
    if (st.choosing || paused || st.victoryWait) return;
    st.t++;
    buildGrid();
    for (const p of st.players) updatePlayer(p);
    spawning();
    for (const e of st.enemies) if (!e.dead) updateEnemy(e);
    separate();
    st.enemies = st.enemies.filter((e) => !e.dead);
    // los enemigos que se quedan muy lejos vuelven a aparecer cerca
    const alive = alivePlayers();
    if (alive.length && st.t % 30 === 0) {
      const far = spawnRadius() * 1.8;
      for (const e of st.enemies) {
        if (e.boss) continue;
        const p = nearestPlayer(e.x, e.y);
        if (e.prop) { if (p && Math.hypot(p.x - e.x, p.y - e.y) > far * 1.5) e.dead = true; continue; }
        if (p && Math.hypot(p.x - e.x, p.y - e.y) > far) {
          const a = rand(0, TAU);
          e.x = p.x + Math.cos(a) * spawnRadius();
          e.y = p.y + Math.sin(a) * spawnRadius();
        }
      }
    }
    buildGrid();
    updateShots();
    updateZones();
    contact();
    updateStrikes();
    updatePickups();

    if (st.victory) {
      st.endT--;
      // se pregunta si seguir en modo infinito (con amigos decide el anfitrión)
      if (st.endT <= 0) { st.victory = false; st.victoryWait = true; emit("victory", {}); }
    } else if (!alivePlayers().length) {
      finish(false);
    }
  }

  function finish(victory) {
    if (st.over) return;
    st.over = true;
    Sfx.stopMusic();
    Sfx.play(victory ? "win" : "die");
    const seconds = Math.floor(st.t / 60);
    const greed = st.players[localId].stats.greed;
    const coins = Math.round((st.coins + st.kills / 8 + seconds / 6 + st.bossesKilled * 60 + (victory || st.won ? 300 : 0)) * greed);
    emit("end", { victory: victory || !!st.won, endless: !!st.endless, endlessSeconds: st.endless ? Math.floor((st.t - st.endlessStart) / 60) : 0, seconds, kills: st.kills, level: st.level, coins, bosses: st.bossesKilled, evolutions: st.evolutions, abilities: st.abilitiesUsed || 0, props: st.propsBroken, charId: st.players[localId].charId, map: st.mapId, daily: st.daily, coop: st.players.length > 1 });
  }

  function readInput() {
    let x = 0;
    let y = 0;
    const k = input.keys;
    if (k.has("ArrowLeft") || k.has("KeyA")) x -= 1;
    if (k.has("ArrowRight") || k.has("KeyD")) x += 1;
    if (k.has("ArrowUp") || k.has("KeyW")) y -= 1;
    if (k.has("ArrowDown") || k.has("KeyS")) y += 1;
    if (input.joy && input.joy.active) {
      x = input.joy.dx;
      y = input.joy.dy;
    }
    input.x = x;
    input.y = y;
    return { x, y, ab: input.ab };
  }

  function loop() {
    cancelAnimationFrame(rafId);
    lastTime = performance.now();
    acc = 0;
    const frame = (now) => {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min(100, now - lastTime);
      lastTime = now;
      if (!st) return;
      // si va a menos de unos 40 fotogramas por segundo, se reducen los efectos
      perf.sum += dt;
      perf.n++;
      if (perf.n >= 150) {
        if (options.fx === "auto" && !autoLow && perf.sum / perf.n > 25 && !paused && !st.choosing) {
          autoLow = true;
          emit("lowFx", {}); // solo en esta pantalla (no se manda a los amigos)
        }
        perf.sum = 0;
        perf.n = 0;
      }
      checkLowFx();
      const local = readInput();
      if (mode !== "guest") {
        if (st.players[localId]) st.players[localId].input = local;
        acc += dt;
        let n = 0;
        while (acc >= STEP && n < 5) {
          step();
          acc -= STEP;
          n++;
        }
        if (n === 5) acc = 0;
      } else {
        emit("guestInput", local);
        guestSmooth();
      }
      render(dt);
      hudTimer += dt;
      if (hudTimer > 100) {
        hudTimer = 0;
        emit("hud", hudData());
      }
    };
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(rafId);
    st = null;
  }

  function hudData() {
    const p = st.players[localId];
    const abDef = TS.ABILITIES[p.charId];
    return {
      hp: p.hp,
      maxHp: p.stats.maxHp,
      xp: st.xp,
      xpNext: st.xpNext,
      level: st.level,
      seconds: Math.floor(st.t / 60),
      kills: st.kills,
      coins: st.coins,
      weapons: p.weapons.map((w) => ({ id: w.id, lvl: w.lvl, evo: !!w.evo })),
      canEvolve: !st.guest && !!evolvable(p),
      passives: Object.entries(p.passives).map(([id, lvl]) => ({ id, lvl })),
      boss: st.boss && TS.ENEMIES[st.boss.type] ? { name: L(TS.ENEMIES[st.boss.type].name), pct: st.boss.hp / st.boss.maxHp } : null,
      down: p.down,
      name: p.name,
      ability: abDef ? { name: L(abDef.name), pct: st.guest ? p.abPct ?? 1 : 1 - p.abCd / abilityMax(p) } : null,
      players: st.players.map((o) => ({ name: o.name, hp: o.hp, maxHp: o.stats.maxHp, down: o.down, charId: o.charId }))
    };
  }

  /* =======================================================
     DIBUJO
     ======================================================= */

  function resize() {
    if (!canvas) return;
    const dpr = lowFx ? 1 : Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    // tamaño de cada píxel del juego: se ve más o menos lo mismo en todas las pantallas
    // el personaje ocupa más o menos una décima parte de la pantalla
    // (en el móvil, algo más, para que se vea bien con el dedo encima)
    const k = Math.max(1, Math.round((Math.min(canvas.width, canvas.height) * (Math.min(w, h) < 600 ? 0.16 : 0.11)) / 60));
    view = { w: canvas.width, h: canvas.height, k, dpr };
    ctx.imageSmoothingEnabled = false;
  }

  // Los objetos pequeños se dibujan al doble para ir a juego con los personajes
  const big = {};
  function x2(key) {
    if (!big[key]) big[key] = Sprites.scaled(Sprites.get(key), 2);
    return big[key];
  }

  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  function drawGround(left, top, wW, wH) {
    for (let cx = Math.floor(left / CHUNK); cx <= Math.floor((left + wW) / CHUNK); cx++) {
      for (let cy = Math.floor(top / CHUNK); cy <= Math.floor((top + wH) / CHUNK); cy++) {
        ctx.drawImage(chunkCanvas(cx, cy), cx * CHUNK, cy * CHUNK, CHUNK, CHUNK);
      }
    }
  }

  function shadow(x, y, w) {
    ctx.fillStyle = "rgba(10,20,10,.32)";
    if (lowFx) { ctx.fillRect(Math.round(x - w), Math.round(y - w * 0.3), Math.round(w * 2), Math.max(2, Math.round(w * 0.6))); return; }
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y), w, w * 0.4, 0, 0, TAU);
    ctx.fill();
  }

  // Dibuja una imagen con los pies en (x, y), girada si mira a la izquierda
  function drawSprite(img, x, y, footY, flip, scale = 1) {
    const w = img.width * scale;
    const h = img.height * scale;
    const dx = Math.round(x - w / 2);
    const dy = Math.round(y - footY * scale);
    if (flip) {
      ctx.save();
      ctx.translate(dx + w, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    } else ctx.drawImage(img, dx, dy, w, h);
  }

  function personImage(set, dir, flash, moving, walkT, atk) {
    const s = set[flash ? `${dir}Flash` : dir];
    if (atk && atk.t > 0) {
      const k = 1 - atk.t / atk.total;
      return s.attack[Math.max(0, Math.min(2, Math.floor(k * 3)))];
    }
    if (moving) return s.walk[Math.floor(walkT / 7) % 4];
    return s.idle;
  }

  function drawPlayer(p) {
    const set = Sprites.get(`char:${p.charId}`);
    shadow(p.x, p.y, 11);
    if (p.down) {
      ctx.globalAlpha = 0.55;
      drawSprite(set.down.idle, p.x, p.y, People.OY, false);
      ctx.globalAlpha = 1;
      // círculo de revivir
      ctx.strokeStyle = "#3cc24f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 26, 22, -Math.PI / 2, -Math.PI / 2 + (p.reviveT / 150) * TAU);
      ctx.stroke();
      return;
    }
    if (p.iframes > 0 && p.iframes % 6 < 3 && !p.flash) ctx.globalAlpha = 0.6;
    const img = personImage(set, p.dir, p.flash > 6, p.moving, p.walkT, p.atk);
    drawSprite(img, p.x, p.y, People.OY, p.face < 0);
    ctx.globalAlpha = 1;
    // barra de vida debajo
    const pct = clamp(p.hp / p.stats.maxHp, 0, 1);
    ctx.fillStyle = "#14112b";
    ctx.fillRect(Math.round(p.x - 13), Math.round(p.y + 4), 26, 4);
    ctx.fillStyle = pct > 0.35 ? "#3cc24f" : "#e63946";
    ctx.fillRect(Math.round(p.x - 12), Math.round(p.y + 5), Math.round(24 * pct), 2);
    if (st.players.length > 1) {
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#14112b";
      ctx.fillText(p.name, Math.round(p.x) + 1, Math.round(p.y - 62) + 1);
      ctx.fillStyle = p.id === localId ? "#ffd23f" : "#ffffff";
      ctx.fillText(p.name, Math.round(p.x), Math.round(p.y - 62));
    }
  }

  function drawEnemy(e) {
    const d = TS.ENEMIES[e.type];
    if (e.prop) {
      const img = x2(`prop:${e.type}`);
      shadow(e.x, e.y, 16);
      drawSprite(e.flash > 0 ? Sprites.silhouette(img) : img, e.x, e.y, img.height - 2, false);
      if (e.type === "brasero") {
        const f = Math.floor(e.t / 6) % 3;
        ctx.fillStyle = ["#ffd23f", "#ff8a1f", "#fff6c2"][f];
        ctx.fillRect(Math.round(e.x - 4), Math.round(e.y - img.height + 4 - f * 2), 8, 5 + f * 2);
      }
      return;
    }
    const key = `enemy:${d.sprite || e.type}`;
    const set = Sprites.get(key);
    const scale = d.scale || 1;
    const flash = e.flash > 3 || (e.ai === "dash" && e.state === 1 && e.t % 6 < 3) || (e.ai === "kamikaze" && e.state === 1 && e.t % 6 < 3);
    if (!d.flying) shadow(e.x, e.y, e.r * 1.1);
    if (e.phased) ctx.globalAlpha = 0.3;
    else if (e.type === "fantasma") ctx.globalAlpha = 0.85;
    if (set.frames) {
      const img = (flash ? set.flash : set.frames)[Math.floor(e.t / 10) % 2];
      const float = d.flying ? Math.sin(e.t * 0.1) * 3 : 0;
      drawSprite(img, e.x, e.y + float, People.OY, e.face < 0, scale);
    } else {
      const atk = e.atk > 0 ? { t: e.atk, total: 18 } : null;
      const img = personImage(set, e.dir || "side", flash, Math.hypot(e.vx, e.vy) > 0.1, e.t, atk);
      drawSprite(img, e.x, e.y, People.OY, e.face < 0, scale);
    }
    ctx.globalAlpha = 1;
    if (e.ai === "kamikaze" && e.state === 1) {
      ctx.fillStyle = e.t % 6 < 3 ? "#ff3b3b" : "#ffd23f";
      ctx.fillRect(Math.round(e.x) - 1, Math.round(e.y - 34), 3, 3);
    }
    if (e.boss && e.state === 1 && e.ai === "boss_stomp") {
      ctx.strokeStyle = "rgba(255,80,80,.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 80, 0, TAU);
      ctx.stroke();
    }
  }

  function drawObstacle(ob, me) {
    const img = obstacleImage(ob);
    if (ob.kind === "hierba") {
      for (const [dx, dy] of ob.tufts) ctx.drawImage(img, Math.round(ob.x + dx - img.width / 2), Math.round(ob.y + dy - img.height + 4));
      return;
    }
    const oy = OB_DEF[ob.kind].oy;
    const x = Math.round(ob.x - img.width / 2);
    const y = Math.round(ob.y - oy);
    shadow(ob.x, ob.y, ob.kind === "rocaGrande" || ob.kind === "coche" ? 34 : ob.kind === "tronco" || ob.kind === "contenedor" ? 30 : ob.kind === "cruz" || ob.kind === "farola" ? 10 : 20);
    // si el jugador queda detrás de la copa, se ve a través
    const tall = oy > 80;
    const behind = me && tall && me.y < ob.y && me.y > ob.y - oy && Math.abs(me.x - ob.x) < img.width * 0.4;
    if (behind) ctx.globalAlpha = 0.5;
    ctx.drawImage(img, x, y);
    ctx.globalAlpha = 1;
  }

  function drawShot(s) {
    if (s.delay > 0) return;
    const x = Math.round(s.x);
    const y = Math.round(s.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(2, 2);
    switch (s.type) {
      case "bolt":
        ctx.rotate(s.ang);
        ctx.fillStyle = "#8a5a2b"; ctx.fillRect(-7, -1, 10, 2);
        ctx.fillStyle = "#e6edf5"; ctx.fillRect(3, -1, 3, 2); ctx.fillRect(6, 0, 1, 1);
        ctx.fillStyle = "#e63946"; ctx.fillRect(-8, -2, 2, 1); ctx.fillRect(-8, 1, 2, 1);
        break;
      case "kunai":
        ctx.rotate(s.ang);
        ctx.fillStyle = "#e6edf5"; ctx.fillRect(-2, -1, 7, 2);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(5, -1, 1, 1);
        ctx.fillStyle = "#e63946"; ctx.fillRect(-5, -1, 3, 2);
        break;
      case "ice":
        ctx.rotate(s.ang);
        ctx.fillStyle = "#bfefff"; ctx.fillRect(-3, -1, 6, 2);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(1, -1, 2, 1);
        ctx.fillStyle = "rgba(191,239,255,.4)"; ctx.fillRect(-8, -1, 5, 2);
        break;
      case "axe":
        ctx.rotate(s.ang);
        ctx.fillStyle = "#8a5a2b"; ctx.fillRect(-1, -6, 2, 12);
        ctx.fillStyle = "#cfd8e3"; ctx.fillRect(1, -6, 4, 5);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(4, -6, 1, 5);
        break;
      case "ball":
        ctx.rotate(s.ang);
        ctx.fillStyle = "#14112b"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#f4f4f4"; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = "#2a2a35"; ctx.fillRect(-1, -1, 2, 2); ctx.fillRect(2, -3, 1, 2); ctx.fillRect(-3, 2, 2, 1);
        break;
      case "onda": {
        ctx.rotate(s.ang);
        const a = Math.min(1, s.life / 20);
        ctx.strokeStyle = `rgba(255,230,140,${a})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(-4, 0, s.r, -1, 1); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(-4, 0, s.r - 2, -0.8, 0.8); ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  function drawZoneUnder(z) {
    if (z.t < 0) return;
    if (z.type === "meteor" && z.t < z.warn) {
      const k = z.t / z.warn;
      ctx.fillStyle = `rgba(255,80,40,${0.15 + k * 0.25})`;
      ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r * k, z.r * k * 0.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,120,60,.7)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.5, 0, 0, TAU); ctx.stroke();
    }
    if (z.type === "bomb") shadow(z.x, z.y + 8, 4);
    if (z.type === "wave") {
      const a = 1 - z.t / z.life;
      ctx.strokeStyle = `rgba(230,210,170,${a})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.55, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${a * 0.8})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r * 0.92, z.r * 0.5, 0, 0, TAU); ctx.stroke();
    }
  }

  function drawZoneOver(z) {
    if (z.t < 0) return;
    switch (z.type) {
      case "slash": { // estela del barrido
        const k = z.t / z.life;
        const sweep = 2.7;
        const startA = z.ang - (sweep / 2) * z.dirSign;
        const endA = startA + sweep * Math.min(1, k * 2.2) * z.dirSign;
        const alpha = 1 - Math.max(0, (k - 0.45) / 0.55);
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.scale(1, 0.75);
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = z.gold
            ? (i === 0 ? `rgba(255,250,220,${alpha})` : i === 1 ? `rgba(255,214,90,${alpha * 0.8})` : `rgba(255,160,40,${alpha * 0.5})`)
            : (i === 0 ? `rgba(255,255,255,${alpha})` : i === 1 ? `rgba(200,235,255,${alpha * 0.7})` : `rgba(120,190,255,${alpha * 0.4})`);
          ctx.lineWidth = [3, 5, 8][i];
          ctx.beginPath();
          const a0 = Math.min(startA, endA);
          const a1 = Math.max(startA, endA);
          ctx.arc(0, 0, z.R - i * 3, a0, a1);
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case "thrust": {
        const k = z.t / z.life;
        const len = z.len * Math.min(1, k * 2.5);
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.rotate(z.ang);
        ctx.fillStyle = `rgba(255,255,255,${1 - k})`;
        ctx.fillRect(0, -1, len, 2);
        ctx.fillStyle = `rgba(160,220,255,${(1 - k) * 0.6})`;
        ctx.fillRect(0, -3, len * 0.8, 6);
        ctx.restore();
        break;
      }
      case "punch": {
        const k = z.t / z.life;
        ctx.strokeStyle = z.glove ? `rgba(255,120,120,${1 - k})` : `rgba(255,230,140,${1 - k})`;
        ctx.lineWidth = z.big ? 3 : 2;
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.4 + k * 0.8), 0, TAU); ctx.stroke();
        if (z.big) {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU + k;
            ctx.fillStyle = `rgba(255,255,255,${1 - k})`;
            ctx.fillRect(Math.round(z.x + Math.cos(a) * z.r * (0.6 + k)), Math.round(z.y + Math.sin(a) * z.r * (0.6 + k)), 2, 2);
          }
        }
        break;
      }
      case "bolt": { // rayo del tridente
        const a = 1 - z.t / z.life;
        for (const [w, color] of [[4, `rgba(120,180,255,${a * 0.5})`], [2, `rgba(220,240,255,${a})`], [1, `rgba(255,255,255,${a})`]]) {
          ctx.strokeStyle = color;
          ctx.lineWidth = w;
          ctx.beginPath();
          for (let i = 0; i < z.pts.length - 1; i++) {
            const [x0, y0] = z.pts[i];
            const [x1, y1] = z.pts[i + 1];
            ctx.moveTo(x0, y0);
            const segs = 4;
            for (let s = 1; s <= segs; s++) {
              const t = s / segs;
              const jx = s < segs ? (hash(i * 10 + s, z.t >> 1) - 0.5) * 10 : 0;
              const jy = s < segs ? (hash(z.t >> 1, i * 10 + s) - 0.5) * 10 : 0;
              ctx.lineTo(x0 + (x1 - x0) * t + jx, y0 + (y1 - y0) * t + jy);
            }
          }
          ctx.stroke();
        }
        break;
      }
      case "laser": {
        const a = 1 - z.t / z.life;
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.rotate(z.ang);
        ctx.fillStyle = `rgba(255,59,107,${a * 0.5})`; ctx.fillRect(0, -3, z.len, 6);
        ctx.fillStyle = `rgba(255,220,230,${a})`; ctx.fillRect(0, -1, z.len, 2);
        ctx.restore();
        break;
      }
      case "bomb": {
        const k = Math.min(1, z.t / z.dur);
        if (k >= 1) break;
        const h = Math.sin(k * Math.PI) * 30;
        ctx.save();
        ctx.translate(Math.round(z.x), Math.round(z.y - h));
        ctx.rotate(z.t * 0.3);
        ctx.fillStyle = "#d62828"; ctx.fillRect(-2, -3, 4, 6);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(-2, -1, 4, 1);
        ctx.fillStyle = z.t % 4 < 2 ? "#ffe066" : "#ff8a1f"; ctx.fillRect(1, -5, 2, 2);
        ctx.restore();
        break;
      }
      case "meteor":
        if (z.t < z.warn) {
          const k = z.t / z.warn;
          const mx = z.x + (1 - k) * 80;
          const my = z.y - (1 - k) * 160;
          ctx.fillStyle = "#ff8a1f";
          ctx.beginPath(); ctx.arc(mx, my, 6, 0, TAU); ctx.fill();
          ctx.fillStyle = "#ffd23f";
          ctx.beginPath(); ctx.arc(mx - 1, my - 1, 4, 0, TAU); ctx.fill();
          ctx.strokeStyle = "rgba(255,150,60,.6)";
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 18, my - 34); ctx.stroke();
        }
        break;
      case "tornado": {
        const a = Math.min(1, (z.life - z.t) / 30);
        for (let i = 0; i < 6; i++) {
          const yy = z.y - i * 5;
          const w = z.r * (0.4 + i * 0.13);
          const off = Math.sin(z.t * 0.3 + i) * 3;
          ctx.strokeStyle = `rgba(${i % 2 ? "233,196,106" : "246,226,168"},${a * 0.85})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(z.x + off, yy, w, w * 0.3, 0, 0, TAU); ctx.stroke();
        }
        break;
      }
    }
  }

  function drawFx(f) {
    const k = f.t / f.life;
    switch (f.k) {
      case "warn": {
        ctx.strokeStyle = "rgba(255,60,60,.9)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.6, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = `rgba(255,60,60,${0.12 + k * 0.3})`;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * k, f.r * 0.6 * k, 0, 0, TAU); ctx.fill();
        break;
      }
      case "num": {
        if (!options.numbers) break;
        const y = f.y - k * 14;
        ctx.font = `bold ${f.big ? 17 : 13}px monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#14112b";
        ctx.fillText(String(f.v), Math.round(f.x) + 1, Math.round(y) + 1);
        ctx.fillStyle = f.hurt ? "#ff5a5a" : f.big ? "#ffd23f" : "#ffffff";
        ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
        ctx.fillText(String(f.v), Math.round(f.x), Math.round(y));
        ctx.globalAlpha = 1;
        break;
      }
      case "text": {
        const y = f.y - k * 12;
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#14112b";
        ctx.fillText(f.text, Math.round(f.x) + 1, Math.round(y) + 1);
        ctx.fillStyle = f.color || "#ffffff";
        ctx.fillText(f.text, Math.round(f.x), Math.round(y));
        break;
      }
      case "puff":
        for (let i = 0; i < (f.big ? 14 : 6); i++) {
          const a = (i / (f.big ? 14 : 6)) * TAU + f.x;
          const r = (f.big ? 50 : 18) * k;
          ctx.fillStyle = f.color || "#c9d1dc";
          ctx.globalAlpha = 1 - k;
          const s = Math.max(2, Math.round((1 - k) * 6));
          ctx.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r * 0.7), s, s);
        }
        ctx.globalAlpha = 1;
        break;
      case "shards":
        ctx.fillStyle = f.color;
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU + f.x;
          ctx.fillRect(Math.round(f.x + Math.cos(a) * 18 * k), Math.round(f.y + Math.sin(a) * 10 * k + k * k * 14), 3, 3);
        }
        ctx.globalAlpha = 1;
        break;
      case "spark":
        ctx.fillStyle = f.color || "#e8f4ff";
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 4; i++) {
          const a = i * 1.57 + k;
          ctx.fillRect(Math.round(f.x + Math.cos(a) * 6 * k), Math.round(f.y + Math.sin(a) * 6 * k), 2, 2);
        }
        ctx.globalAlpha = 1;
        break;
      case "flash":
        ctx.fillStyle = `rgba(255,240,180,${1 - k})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, 5 * (1 - k) + 2, 0, TAU); ctx.fill();
        break;
      case "ring":
        ctx.strokeStyle = f.color || "#ffffff";
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * k, f.r * k * 0.55, 0, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      case "boom": {
        const r = f.r * (0.4 + k * 0.6);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = f.fire ? "#ff6b3b" : "#ff8a1f";
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, TAU); ctx.fill();
        ctx.fillStyle = "#ffd23f";
        ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.65, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff6c2";
        ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.3, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case "dust":
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.fillStyle = "#d9c7a0";
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU;
          const r = f.r * (0.3 + k * 0.8);
          ctx.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r * 0.55), 3, 2);
        }
        ctx.globalAlpha = 1;
        break;
      case "crack":
        ctx.globalAlpha = Math.min(1, (1 - k) * 2) * 0.7;
        ctx.strokeStyle = "#2a2018";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + f.x;
          ctx.moveTo(f.x, f.y);
          ctx.lineTo(f.x + Math.cos(a) * f.r * 0.5, f.y + Math.sin(a) * f.r * 0.3);
          ctx.lineTo(f.x + Math.cos(a + 0.3) * f.r, f.y + Math.sin(a + 0.3) * f.r * 0.55);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
    }
  }

  function drawAura(p) {
    const w = p.weapons.find((x) => x.id === "colonia");
    if (!w || p.down) return;
    const r = 44 * (TS.WEAPONS.colonia.levels[w.lvl - 1].area) * p.stats.area;
    ctx.fillStyle = "rgba(183,242,123,.12)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 4, r, r * 0.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(183,242,123,.5)";
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + st.t * 0.01;
      ctx.fillRect(Math.round(p.x + Math.cos(a) * r * 0.8), Math.round(p.y - 4 + Math.sin(a) * r * 0.48 - ((st.t + i * 9) % 20) * 0.3), 2, 2);
    }
  }

  function drawDrones(p) {
    const w = p.weapons.find((x) => x.id === "dron");
    if (!w || p.down) return;
    for (const dr of w.drones) {
      if (dr.x === undefined) continue;
      const x = Math.round(dr.x);
      const y = Math.round(dr.y + Math.sin(st.t * 0.2) * 1);
      ctx.fillStyle = "#14112b"; ctx.fillRect(x - 6, y - 2, 12, 5);
      ctx.fillStyle = "#3d4451"; ctx.fillRect(x - 5, y - 1, 10, 3);
      ctx.fillStyle = "#00e5ff"; ctx.fillRect(x - 1, y, 2, 1);
      ctx.fillStyle = "#9aa3b0";
      const blade = st.t % 4 < 2 ? 4 : 2;
      ctx.fillRect(x - 6 - blade / 2, y - 3, blade, 1);
      ctx.fillRect(x + 6 - blade / 2, y - 3, blade, 1);
    }
  }

  function drawEnemyShot(s) {
    ctx.save();
    ctx.translate(Math.round(s.x), Math.round(s.y));
    ctx.scale(2, 2);
    drawEnemyShotAt(s, 0, 0);
    ctx.restore();
  }

  function drawEnemyShotAt(s, x, y) {
    if (s.kind === "bullet") {
      ctx.fillStyle = "#14112b"; ctx.fillRect(x - 2, y - 2, 5, 5);
      ctx.fillStyle = "#ffd23f"; ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = "#fff6c2"; ctx.fillRect(x - 1, y - 1, 1, 1);
    } else if (s.kind === "star") {
      ctx.fillStyle = "#cfd8e3";
      ctx.fillRect(x - 3, y, 7, 1); ctx.fillRect(x, y - 3, 1, 7);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, 1, 1);
    } else if (s.kind === "goo") {
      ctx.fillStyle = "#14112b"; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = "#7cff6b"; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
    } else {
      ctx.drawImage(Sprites.get("fx:enemyShot"), x - 7, y - 7);
    }
  }

  function render() {
    if (!st) return;
    const me = st.players[localId];
    const k = view.k;
    const wW = view.w / k;
    const wH = view.h / k;
    cam.x += (me.x - cam.x) * 0.15;
    cam.y += (me.y - 12 - cam.y) * 0.15;
    let sx = 0;
    let sy = 0;
    if (cam.shake > 0) {
      sx = rand(-cam.shake, cam.shake);
      sy = rand(-cam.shake, cam.shake);
      cam.shake *= 0.85;
      if (cam.shake < 0.3) cam.shake = 0;
    }
    const left = Math.round(cam.x - wW / 2 + sx);
    const top = Math.round(cam.y - wH / 2 + sy);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#4a8a3a";
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.setTransform(k, 0, 0, k, -left * k, -top * k);

    drawGround(left, top, wW, wH);
    for (const z of st.zones) drawZoneUnder(z);
    for (const p of st.players) drawAura(p);

    // gemas y objetos
    for (const g of st.gems) {
      if (g.x < left - 10 || g.x > left + wW + 10 || g.y < top - 10 || g.y > top + wH + 10) continue;
      const img = x2(g.v >= 10 ? "fx:gem3" : g.v >= 3 ? "fx:gem2" : "fx:gem1");
      ctx.drawImage(img, Math.round(g.x - 14), Math.round(g.y - 18 + Math.sin((g.t + g.x) * 0.08) * 2));
    }
    for (const it of st.pickups) {
      const img = x2(`icon:${it.kind}`);
      const bob = Math.round(Math.sin(it.t * 0.1) * 2);
      if (it.kind === "cofre") {
        ctx.fillStyle = `rgba(255,210,63,${0.25 + Math.sin(it.t * 0.1) * 0.15})`;
        ctx.beginPath(); ctx.arc(it.x, it.y - 12, 26, 0, TAU); ctx.fill();
        ctx.drawImage(Sprites.scaled(img, 3), Math.round(it.x - 21), Math.round(it.y - 40 + bob));
      } else ctx.drawImage(img, Math.round(it.x - 14), Math.round(it.y - 24 + bob));
    }

    // personajes y enemigos ordenados por altura
    const actors = [];
    for (const e of st.enemies) {
      if (e.x < left - 60 || e.x > left + wW + 60 || e.y < top - 20 || e.y > top + wH + 90) continue;
      actors.push({ y: e.y, e });
    }
    for (const p of st.players) actors.push({ y: p.y, p });
    obstaclesNear(left + wW / 2, top + wH / 2, Math.max(wW, wH) / 2 + 140, (ob) => {
      if (ob.x < left - 80 || ob.x > left + wW + 80 || ob.y < top - 20 || ob.y > top + wH + 140) return;
      actors.push({ y: ob.y, ob });
    });
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) {
      if (a.e) drawEnemy(a.e);
      else if (a.p) drawPlayer(a.p);
      else drawObstacle(a.ob, me);
    }

    for (const s of st.shots) drawShot(s);
    for (const z of st.zones) drawZoneOver(z);
    for (const p of st.players) drawDrones(p);
    for (const s of st.eshots) drawEnemyShot(s);
    for (const f of st.fx) {
      f.t++;
      drawFx(f);
    }
    st.fx = st.fx.filter((f) => f.t < f.life);

    // noche: oscuro con luz alrededor del jugador
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (map.dark) {
      const px = (me.x - left) * k;
      const py = (me.y - 20 - top) * k;
      const grad = ctx.createRadialGradient(px, py, 70 * k, px, py, Math.max(view.w, view.h) * 0.6);
      grad.addColorStop(0, "rgba(8,6,28,0)");
      grad.addColorStop(1, `rgba(8,6,28,${map.dark + 0.35})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, view.w, view.h);
    }

    // flecha hacia el jefe si está fuera de la pantalla
    if (st.boss) {
      const bx = (st.boss.x - left) * k;
      const by = (st.boss.y - top) * k;
      if (bx < 0 || by < 0 || bx > view.w || by > view.h) {
        const a = Math.atan2(by - view.h / 2, bx - view.w / 2);
        const ex = clamp(bx, 30, view.w - 30);
        const ey = clamp(by, 80, view.h - 30);
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(a);
        ctx.fillStyle = "#e63946";
        ctx.beginPath(); ctx.moveTo(14 * view.dpr, 0); ctx.lineTo(-8 * view.dpr, -9 * view.dpr); ctx.lineTo(-8 * view.dpr, 9 * view.dpr); ctx.fill();
        ctx.restore();
      }
    }

    // joystick táctil
    if (input.joy && input.joy.active) {
      const j = input.joy;
      const d = view.dpr;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(j.ox * d, j.oy * d, 46 * d, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc((j.ox + j.dx * 40) * d, (j.oy + j.dy * 40) * d, 20 * d, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /* =======================================================
     CONTROLES
     ======================================================= */

  function bindInput() {
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      if ((e.code === "Space" || e.code === "KeyE") && !e.repeat) input.ab++;
      input.keys.add(e.code);
    });
    window.addEventListener("keyup", (e) => input.keys.delete(e.code));
    window.addEventListener("blur", () => input.keys.clear());

    canvas.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      input.joy = { active: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 };
      try { canvas.setPointerCapture(e.pointerId); } catch { /* puntero ya suelto */ }
    });
    canvas.addEventListener("pointermove", (e) => {
      const j = input.joy;
      if (!j || !j.active || j.id !== e.pointerId) return;
      let dx = (e.clientX - j.ox) / 40;
      let dy = (e.clientY - j.oy) / 40;
      const l = Math.hypot(dx, dy);
      if (l > 1) { dx /= l; dy /= l; }
      if (l < 0.15) { dx = 0; dy = 0; }
      j.dx = dx;
      j.dy = dy;
    });
    const end = (e) => { if (input.joy && input.joy.id === e.pointerId) input.joy = null; };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  function init(el) {
    canvas = el;
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    bindInput();
  }

  // Vista previa de un mapa (para elegirlo): un trozo del terreno con sus objetos
  function mapPreview(id, w = 320, h = 180) {
    const keep = mapId;
    setMap(id);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    const ox = 900;
    const oy = 600;
    for (let cx = Math.floor(ox / CHUNK); cx <= Math.floor((ox + w * 2) / CHUNK); cx++) {
      for (let cy = Math.floor(oy / CHUNK); cy <= Math.floor((oy + h * 2) / CHUNK); cy++) {
        g.drawImage(chunkCanvas(cx, cy), (cx * CHUNK - ox) / 2, (cy * CHUNK - oy) / 2, CHUNK / 2, CHUNK / 2);
      }
    }
    const list = [];
    obstaclesNear(ox + w, oy + h, Math.max(w, h) + 100, (ob) => list.push(ob));
    list.sort((a, b) => a.y - b.y);
    for (const ob of list) {
      if (ob.kind === "hierba") continue;
      const img = obstacleImage(ob);
      g.drawImage(img, Math.round((ob.x - ox) / 2 - img.width / 4), Math.round((ob.y - oy - OB_DEF[ob.kind].oy) / 2), img.width / 2, img.height / 2);
    }
    if (TS.MAPS[id].dark) { g.fillStyle = `rgba(8,6,28,${TS.MAPS[id].dark * 0.8})`; g.fillRect(0, 0, w, h); }
    setMap(keep);
    return c;
  }

  /* =======================================================
     MODO ONLINE: fotos del estado para los invitados
     El anfitrión simula y manda snapshot() unas 15 veces por segundo;
     los invitados las reciben con applySnapshot() y solo dibujan.
     ======================================================= */

  const DIRS = ["down", "downSide", "side", "upSide", "up"];
  const ENEMY_IDS = Object.keys(TS.ENEMIES);
  const r1 = (v) => Math.round(v * 10) / 10;

  function snapshot(viewers) {
    // solo lo que está cerca de algún jugador
    const near2 = (x, y) => viewers.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < 1100 * 1100);
    const players = st.players.map((p) => [
      r1(p.x), r1(p.y), DIRS.indexOf(p.dir), p.face, p.moving ? 1 : 0, p.walkT, p.atk ? p.atk.t : 0, p.atk ? p.atk.total : 0,
      Math.round(p.hp), p.stats.maxHp, p.down ? 1 : 0, p.reviveT, p.iframes, p.flash,
      p.weapons.map((w) => [w.id, w.lvl, w.evo ? 1 : 0, (w.drones || []).map((d) => [r1(d.x || 0), r1(d.y || 0)])]),
      Object.entries(p.passives), r1(p.stats.area), Math.round((1 - p.abCd / abilityMax(p)) * 100) / 100
    ]);
    const enemies = [];
    for (const e of st.enemies) {
      if (!near2(e.x, e.y)) continue;
      enemies.push([e.id, ENEMY_IDS.indexOf(e.type), r1(e.x), r1(e.y), DIRS.indexOf(e.dir || "side"), e.face, Math.hypot(e.vx, e.vy) > 0.1 ? 1 : 0, e.t & 1023, e.flash, (e.phased ? 1 : 0) | (e.state === 1 ? 2 : 0) | (e.state === 2 ? 4 : 0), e.atk]);
    }
    const shots = st.shots.filter((x) => near2(x.x, x.y) && !(x.delay > 0)).map((x) => [x.type, r1(x.x), r1(x.y), r1(x.ang || 0), r1(x.r), x.life]);
    const eshots = st.eshots.filter((x) => near2(x.x, x.y)).map((x) => [r1(x.x), r1(x.y), x.kind]);
    const zones = st.zones.filter((z) => z.t >= 0).map((z) => {
      const out = { ...z };
      delete out.hit; delete out.hitT; delete out.owner; delete out.dmg;
      for (const k of Object.keys(out)) if (typeof out[k] === "number") out[k] = r1(out[k]);
      return out;
    });
    const gems = st.gems.filter((g) => near2(g.x, g.y)).slice(0, 500).map((g) => [r1(g.x), r1(g.y), g.v]);
    const pickups = st.pickups.filter((it) => near2(it.x, it.y)).map((it) => [r1(it.x), r1(it.y), it.kind]);
    const events = st.events.splice(0, st.events.length).slice(-120);
    return {
      t: st.t, lv: st.level, xp: Math.round(st.xp), xn: st.xpNext, k: st.kills, c: st.coins,
      b: st.boss ? [st.boss.id, st.boss.hp / st.boss.maxHp] : null,
      p: players, e: enemies, s: shots, es: eshots, z: zones, g: gems, pk: pickups, ev: events
    };
  }

  // Invitado: prepara un estado vacío para ir rellenando con las fotos
  function startGuest(info) {
    stopDemo();
    mode = "guest";
    localId = info.localId;
    setMap(info.map || "bosque");
    seed = 0;
    st = {
      guest: true, mapId, t: 0, level: 1, xp: 0, xpNext: 10, kills: 0, coins: 0, boss: null, over: false,
      players: info.players.map((pl, i) => ({ id: i, name: pl.name, charId: pl.charId, x: 0, y: 0, dir: "down", face: 1, moving: false, walkT: 0, atk: null, hp: 100, stats: { maxHp: 100, area: 1, magnet: 0 }, weapons: [], passives: {}, down: false, reviveT: 0, iframes: 0, flash: 0, tx: 0, ty: 0 })),
      enemies: [], shots: [], eshots: [], zones: [], gems: [], pickups: [], fx: [], events: [], mod: { coins: 1, xp: 1 }
    };
    for (const pl of info.players) Sprites.get(`char:${pl.charId}`);
    Sfx.startMusic("run");
    loop();
  }

  const enemyMap = new Map();

  function applySnapshot(snap) {
    if (!st || !st.guest) return;
    st.t = snap.t; st.level = snap.lv; st.xp = snap.xp; st.xpNext = snap.xn; st.kills = snap.k; st.coins = snap.c;
    snap.p.forEach((a, i) => {
      const p = st.players[i];
      if (!p) return;
      if (!p.seen) { p.x = a[0]; p.y = a[1]; p.seen = true; }
      p.tx = a[0]; p.ty = a[1]; p.dir = DIRS[a[2]] || "down"; p.face = a[3]; p.moving = !!a[4]; p.walkT = a[5];
      p.atk = a[6] > 0 ? { t: a[6], total: a[7] } : null;
      p.hp = a[8]; p.stats.maxHp = a[9]; p.down = !!a[10]; p.reviveT = a[11]; p.iframes = a[12]; p.flash = a[13];
      p.weapons = a[14].map(([id, lvl, evo, drones]) => ({ id, lvl, evo: !!evo, drones: drones.map(([x, y]) => ({ x, y })) }));
      p.passives = Object.fromEntries(a[15]);
      p.stats.area = a[16];
      p.abPct = a[17];
    });
    const seen = new Set();
    const list = [];
    for (const a of snap.e) {
      const [id, ti, x, y, di, face, moving, t, flash, flags, atk] = a;
      let e = enemyMap.get(id);
      if (!e) {
        const type = ENEMY_IDS[ti];
        const d = TS.ENEMIES[type];
        e = { id, type, x, y, tx: x, ty: y, r: d.r * U, boss: !!d.boss, ai: d.ai, prop: !!d.prop, vx: 0, vy: 0, state: 0 };
        enemyMap.set(id, e);
      }
      e.tx = x; e.ty = y; e.dir = DIRS[di] || "side"; e.face = face; e.vx = moving ? 1 : 0; e.vy = 0; e.t = t; e.flash = flash;
      e.phased = !!(flags & 1); e.state = flags & 2 ? 1 : flags & 4 ? 2 : 0; e.atk = atk;
      seen.add(id);
      list.push(e);
    }
    for (const id of enemyMap.keys()) if (!seen.has(id)) enemyMap.delete(id);
    st.enemies = list;
    st.boss = snap.b ? { ...(enemyMap.get(snap.b[0]) || {}), type: (enemyMap.get(snap.b[0]) || {}).type || "rey", hp: snap.b[1], maxHp: 1 } : null;
    st.shots = snap.s.map(([type, x, y, ang, r, life]) => ({ type, x, y, ang, r, life }));
    st.eshots = snap.es.map(([x, y, kind]) => ({ x, y, kind }));
    st.zones = snap.z;
    st.gems = snap.g.map(([x, y, v]) => ({ x, y, v, t: 0 }));
    st.pickups = snap.pk.map(([x, y, kind]) => ({ x, y, kind, t: 0 }));
    for (const ev of snap.ev) {
      if (ev.k === "snd") Sfx.play(ev.n);
      else { ev.t = 0; st.fx.push(ev); }
    }
  }

  // Entre foto y foto, los invitados mueven todo suavemente
  function guestSmooth() {
    for (const p of st.players) { p.x += (p.tx - p.x) * 0.35; p.y += (p.ty - p.y) * 0.35; }
    for (const e of st.enemies) { e.x += (e.tx - e.x) * 0.35; e.y += (e.ty - e.y) * 0.35; }
    for (const z of st.zones) z.t = (z.t || 0) + 0.25;
  }

  /* =======================================================
     FONDO DEL MENÚ: los personajes pasean y pelean por el mapa
     ======================================================= */

  let demo = null;

  function startDemo(heroIds) {
    cancelAnimationFrame(rafId);
    st = null;
    const R = 300;
    const actors = [];
    heroIds.forEach((id, i) => {
      const a = (i / heroIds.length) * TAU;
      actors.push({ hero: true, charId: id, x: Math.cos(a) * R * rand(0.4, 1), y: Math.sin(a) * R * 0.6 * rand(0.4, 1), tx: 0, ty: 0, t: rand(0, 200), walkT: 0, dir: "down", face: 1, atk: null, moving: false });
    });
    for (let i = 0; i < 10; i++) {
      const type = pick(["zombi", "zombi", "corredor", "antitronk", "ninja", "esqueleto", "murcielago", "slime"]);
      actors.push({ type, x: rand(-R * 1.4, R * 1.4), y: rand(-R, R), t: Math.floor(rand(0, 200)), flash: 0, vx: 0, vy: 0, dir: "side", face: 1, atk: 0, slow: 0 });
    }
    demo = { t: 0, actors, camX: 0, camY: 0 };
    const frame = () => {
      if (!demo) return;
      rafId = requestAnimationFrame(frame);
      demoStep();
      renderDemo();
    };
    rafId = requestAnimationFrame(frame);
  }

  function stopDemo() {
    demo = null;
    cancelAnimationFrame(rafId);
  }

  function demoStep() {
    demo.t++;
    demo.camX += 0.25;
    const heroes = demo.actors.filter((a) => a.hero);
    for (const a of demo.actors) {
      a.t++;
      if (a.hero) {
        if (a.atk) { a.atk.t--; if (a.atk.t <= 0) a.atk = null; }
        if (!a.moving || Math.hypot(a.tx - a.x, a.ty - a.y) < 8) {
          if (R() < 0.01) {
            // pasean por los lados (el centro lo tapa el menú)
            const halfW = view.w / view.k / 2;
            const side = R() < 0.5 ? -1 : 1;
            a.tx = demo.camX + side * rand(Math.min(halfW * 0.45, 260), halfW - 30);
            a.ty = demo.camY + rand(-view.h / view.k / 2 + 60, view.h / view.k / 2 - 20);
            a.moving = true;
          } else a.moving = false;
        }
        if (a.moving) {
          const dx = a.tx - a.x;
          const dy = a.ty - a.y;
          const l = Math.hypot(dx, dy) || 1;
          a.x += (dx / l) * 1.3;
          a.y += (dy / l) * 1.3;
          a.walkT++;
          setDir(a, dx, dy);
        }
        // ataca a ratos hacia el enemigo más cercano
        if (!a.atk && R() < 0.012) {
          const foe = demo.actors.filter((o) => !o.hero).sort((p, q) => dist2(p, a) - dist2(q, a))[0];
          if (foe) {
            const dx = foe.x - a.x;
            const dy = foe.y - a.y;
            setDir(a, dx, dy);
            a.atk = { t: 18, total: 18 };
          }
        }
      } else {
        if (a.flash > 0) a.flash--;
        const h = heroes.sort((p, q) => dist2(p, a) - dist2(q, a))[0];
        if (h) {
          const dx = h.x - a.x;
          const dy = h.y - a.y;
          const l = Math.hypot(dx, dy) || 1;
          const sp = 0.5 * U * (TS.ENEMIES[a.type].speed / 0.6);
          a.vx = l > 40 ? (dx / l) * sp : 0;
          a.vy = l > 40 ? (dy / l) * sp : 0;
          a.x += a.vx;
          a.y += a.vy;
          const [dir, face] = dirOf(dx, dy);
          a.dir = dir;
          a.face = face;
          if (l < 60 && R() < 0.01) a.flash = 6;
        }
        // si se queda fuera de la vista, vuelve por un lado
        if (a.x < demo.camX - 700) { a.x = demo.camX + 700; a.y = demo.camY + rand(-300, 300); }
      }
      collide(a, 10);
    }
  }

  function renderDemo() {
    const k = view.k;
    const wW = view.w / k;
    const wH = view.h / k;
    const left = Math.round(demo.camX - wW / 2);
    const top = Math.round(demo.camY - wH / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#4a8a3a";
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.setTransform(k, 0, 0, k, -left * k, -top * k);
    drawGround(left, top, wW, wH);
    const list = demo.actors.map((a) => ({ y: a.y, a }));
    obstaclesNear(left + wW / 2, top + wH / 2, Math.max(wW, wH) / 2 + 140, (ob) => list.push({ y: ob.y, ob }));
    list.sort((p, q) => p.y - q.y);
    for (const it of list) {
      if (it.ob) { drawObstacle(it.ob, null); continue; }
      const a = it.a;
      if (a.hero) {
        const set = Sprites.get(`char:${a.charId}`);
        shadow(a.x, a.y, 11);
        drawSprite(personImage(set, a.dir, false, a.moving, a.walkT, a.atk), a.x, a.y, People.OY, a.face < 0);
      } else drawEnemy(a);
    }
  }

  function setPaused(v) {
    paused = v;
  }

  return {
    init,
    on,
    startDemo,
    stopDemo,
    options,
    setMap,
    snapshot,
    startGuest,
    applySnapshot,
    setInput(id, inp) { if (st && st.players[id]) st.players[id].input = inp; },
    pressAbility() { input.ab++; },
    dropPlayer(id) { if (st && st.players[id] && !st.players[id].down) { st.players[id].hp = 0; st.players[id].down = true; } },
    get mapId() { return mapId; },
    mapPreview,
    start,
    stop,
    choose,
    setPaused,
    // tras ganar: seguir en modo infinito o terminar
    continueEndless() {
      if (!st || !st.victoryWait) return;
      st.victoryWait = false;
      st.endless = true;
      st.endlessStart = st.t;
      st.endlessLoops = 0;
      st.endlessBossT = st.t + 90 * 60;
      st.endlessHordeT = st.t + 30 * 60;
      Sfx.startMusic("boss");
      emit("endless", {});
    },
    endWin() {
      if (!st || !st.victoryWait) return;
      st.victoryWait = false;
      finish(true);
    },
    get state() { return st; },
    set state(v) { st = v; },
    get mode() { return mode; },
    get localId() { return localId; },
    get view() { return view; },
    step,
    hudData,
    loop,
    finish,
    setLocal(id, m) { localId = id; mode = m; }
  };
})();
