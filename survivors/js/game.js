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
    arco:"aim", bobina:"cast", abanico:"throw", tambor:"slam", faro: "cast", tajo: "swing", mazazo: "slam", virote: "aim", estocada: "thrust", rayo: "cast", guantes: "punch", punos: "punch",
    hacha: "throw", petardo: "throw", balon: "throw", kunai: "throw", copos: "cast", colonia: "cast", meteoro: "cast", dron: "cast", tornado: "cast", discos: "cast", acido: "throw", llamas: "aim"
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
  let controlsEnabled = true;
  let touchPad = null;
  const touchOnly = () => window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches;
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
    const s = { maxHp: 0, speed: 0, might: 0, area: 0, cooldown: 0, magnet: 0, armor: 0, regen: 0, growth: 0, greed: 0, amount: 0, revive: 0, reviveSpeed: 0 };
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
      revive: s.revive, reviveRate: 1 + s.reviveSpeed
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
      techniques: {}, techCds: {}, rerolls: 3,
      combat: { dealt: 0, taken: 0, healed: 0, elites: 0 },
      streak: {count:0,best:0,until:0,flashUntil:0},
      loot: {xp:0,coins:0,healed:0,until:0},
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
    if (id !== charById(pl.charId).weapon || pl.weapons.some(w => w.id === id)) return false;
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

  function createSites(){
    if(mapId==="playa")return [];
    const kind=mapId==="cementerio"?"altar":mapId==="ciudad"?"lamp":"camp";
    return [240,680,1100].map((r,i)=>{
      const site={id:i,kind,x:0,y:0,progress:0,activated:false,used:false,activeUntil:0,guards:[]};
      for(let n=0;n<64;n++){
        const a=i*2.1+n*.4;site.x=-30+Math.cos(a)*r;site.y=Math.sin(a)*r;
        collide(site,24);
        if(terrain(site.x,site.y)!==2)break;
      }
      return site;
    });
  }

  function updateSites(){
    for(const site of st.sites){
      if(site.kind==="altar" && site.activated && !site.used){
        if(site.guards.every(id=>!st.enemies.some(e=>e.id===id && !e.dead))){
          site.used=true;st.pickups.push({kind:"cofre",x:site.x,y:site.y,t:0});
          emit("toast",{text:L("¡Altar purificado! Recoge el cofre"),kind:"site"});
        }
      }
      if(!site.activated){
        const near=alivePlayers().some(p=>dist2(p,site)<(45*U)**2);
        site.progress=near?site.progress+1:Math.max(0,site.progress-2);
        if(site.progress>=120){
          site.activated=true;
          if(site.kind==="altar"){
            for(const type of ["guardian","sanador","esqueleto"]){const e=spawnAround(type,site,80*U);e.siteId=site.id;site.guards.push(e.id);}
            emit("toast",{text:L("Altar activado: derrota a sus guardianes"),kind:"site"});
          } else {site.used=true;site.activeUntil=st.t+1200;emit("toast",{text:L("Refugio activo durante 20 segundos"),kind:"site"});}
        }
      }
      if(site.activeUntil>st.t){
        if(st.t%60===0)for(const p of alivePlayers())if(dist2(p,site)<(85*U)**2)healPlayer(p,2,true);
        if(site.kind==="lamp")for(const e of st.enemies)if(!e.dead && dist2(e,site)<(100*U)**2){e.exposedUntil=st.t+3;e.phased=false;e.slow=Math.max(e.slow,3);e.slowAmt=Math.max(e.slowAmt,.25);}
      }
    }
  }

  function start(setups, opts = {}) {
    stopDemo();
    input.ab = 0; clearInput(); controlsEnabled = true;
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
      t: 0, sites: createSites(),
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
      hordeIdx: 0, nextBreach: 120 * 60, breach: null, nextElite: 300 * 60, chests: 0,
      boss: null,
      pendingLevels: 0, rewardQueue: [], choiceKind: "level", comboTicks: {}, comboLabel:null, comboUntil:0,
      choosing: null,
      over: false,
      victory: false,
      finalPhase: false, finalRound: 0, finalPulseT: 0,
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
    return st.players.filter((p) => !p.down && !p.disconnected);
  }

  function nearestPlayer(x, y) {
    let best = null;
    let bd = Infinity;
    for (const p of st.players) {
      if (p.down || p.disconnected) continue;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  /* ---------- rejilla para buscar enemigos cerca ---------- */
  const CELL = 40;
  const grid = new Map();
  let maxEnemyRadius = 0;
  const key = (cx, cy) => (cx + 50000) * 100000 + (cy + 50000);

  function buildGrid() {
    grid.clear();
    maxEnemyRadius = 0;
    for (const e of st.enemies) {
      if (e.dead) continue;
      maxEnemyRadius = Math.max(maxEnemyRadius, e.r);
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
    near(x, y, r + maxEnemyRadius, (e) => {
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

  // El agua se puede vadear: reduce el desplazamiento, sin devolver a la orilla.
  function blockWater(ent, ox, oy) {
    ent.inWater = terrain(ox, oy) === 2 || terrain(ent.x, ent.y) === 2;
    if (!ent.inWater) return;
    ent.x = ox + (ent.x - ox) * TS.WATER_SPEED;
    ent.y = oy + (ent.y - oy) * TS.WATER_SPEED;
    if(mapId==="playa"){
      const a=Math.sin(oy/240+st.t/1800)*.8;
      ent.x+=Math.cos(a)*.45*U;ent.y+=Math.sin(a)*.45*U;
    }
  }

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
          const patch = vnoise(wx/48,wy/48)*.75+vnoise(wx/17+11,wy/17-7)*.25;
          let col = pal[Math.min(pal.length-1,Math.floor(patch*pal.length))];
          if (h>.996 && t===1) col=G.dirtEdge;
          put(i, col);
        }
      }
    }
    g.putImageData(img, 0, 0);
    // Pequeños grupos de vegetación y piedras sobre manchas suaves, sin ruido blanco.
    for(let i=0;i<12;i++) {
      const px=Math.floor(hash(cx*19+i,cy*17)*N),py=Math.floor(hash(cy*23+i,cx*31)*N);
      const wx=cx*CHUNK+px*2,wy=cy*CHUNK+py*2;
      if(terrain(wx,wy)!==0)continue;
      g.fillStyle=map.ground.grassEdge;g.globalAlpha=.65;
      g.fillRect(px,py,1,3);g.fillRect(px-2,py+1,1,2);g.fillRect(px+2,py-1,1,3);
      if(i%4===0 && mapId!=="ciudad") {
        g.globalAlpha=.9;g.fillStyle=map.ground.flowers[i%3];
        g.fillRect(px-2,py,2,2);g.fillRect(px+2,py-2,2,2);
      }
    }
    g.globalAlpha=1;
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

  const options = { numbers: true, shake: true, fx: "auto", reducedMotion: false, contrast: false, zoom: 1.25, healthBars: "damaged" };
  // Efectos reducidos: menos partículas y menos resolución (móviles lentos)
  let lowFx = false;
  let autoLow = false;
  const perf = { sum: 0, n: 0 };
  const COSMETIC = new Set(["puff", "shards", "dust", "crack", "impact", "pickup"]);

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
    if (options.shake && !options.reducedMotion) cam.shake = Math.max(cam.shake, n);
  }

  /* =======================================================
     ENEMIGOS
     ======================================================= */

  function spawnEnemy(type, x, y) {
    const d = TS.ENEMIES[type];
    const n = st.players.filter(p => !p.disconnected).length;
    const hpMul = d.prop ? 1 : st.mod ? st.mod.enemyHp : 1;
    const hpBase = d.prop ? 1 : 1 + (d.boss ? .6 : .3) * (n - 1);
    const e = {
      id: st.nextId++,
      type,
      x,
      y,
      hp: d.hp * hpMul * hpBase,
      maxHp: d.hp * hpMul * hpBase,
      speed: d.speed * U * rand(0.92, 1.08) * (d.prop ? 1 : st.mod ? st.mod.enemySpeed : 1),
      dmg: d.dmg * (st.mod ? st.mod.enemyDmg : 1),
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
    e.baseMaxHp = e.maxHp; e.baseSpeed = e.speed;
    e.baseDmg = d.dmg * (st.mod ? st.mod.enemyDmg : 1);
    scaleEnemy(e);
    st.enemies.push(e);
    if (e.boss) {
      st.boss = e;
      emit("boss", { name: L(d.name), id: type });
      sound("boss");
      Sfx.startMusic("boss");
    }
    return e;
  }

  function difficultyAt(t) {
    const m = Math.max(0, t / 3600) * 1000 / TS.RUN_SECONDS;
    return { hp: 1 + .35 * m + .06 * m * m, bossHp: 1 + .08 * m + .01 * m * m,
      dmg: 1 + .10 * m + .012 * m * m, speed: 1 + Math.min(.65, .035 * m) };
  }

  function scaleEnemy(e) {
    if (e.prop || e.baseMaxHp === undefined) return;
    const d = difficultyAt(st.t);
    const rage = e.relentless ? 1 + (e.finalRound - 1) * .22 : 1;
    const nextHp = e.baseMaxHp * (e.boss ? d.bossHp : d.hp) * rage;
    e.hp = Math.max(1, e.hp / e.maxHp * nextHp); e.maxHp = nextHp;
    e.dmg = e.baseDmg * d.dmg * rage;
    const pursuit = e.relentless ? Math.min(4, 1.25 + (st.t - st.endlessStart) / 18000) : 1;
    e.speed = e.baseSpeed * d.speed * pursuit;
  }

  function beginFinalPhase() {
    st.finalPhase = true; st.finalRound = 1; st.endless = true;
    st.endlessStart = st.t; st.endlessLoops = 0; st.finalPulseT = st.t + 180;
    const e = spawnAround(finalBossId(), pick(alivePlayers()), spawnRadius() * .75);
    e.relentless = true; e.finalRound = 1; scaleEnemy(e);
    st.finalBoss = e; st.boss = e;
    emit("finalPhase", { round: 1 });
  }

  function nextFinalRound(e) {
    e.finalRound++; st.finalRound = e.finalRound;
    if (e.finalRound === 2) { st.bossesKilled++; st.kills++; }
    st.won = true;
    e.hp = e.maxHp; scaleEnemy(e); e.hp = e.maxHp;
    e.flash = 24; e.timer = 80; e.state = 0; e.t = 0;
    e.cloned = false; e.called = false; e.splits = []; e.hops = 0;
    st.pickups.push({ x: e.x, y: e.y, kind: "cofre", t: 0 });
    for (const p of alivePlayers()) { healPlayer(p, p.stats.maxHp * .15); p.iframes = Math.max(p.iframes, 60); }
    fx({ k: "ring", x: e.x, y: e.y, r: 100, color: "#ff512f", life: 50 });
    sound("boss"); emit("finalPhase", { round: e.finalRound });
  }

  function finalPressure() {
    const e = st.finalBoss;
    if (!e || st.t < st.finalPulseT) return;
    st.finalPulseT = st.t + Math.max(110, 360 - st.finalRound * 20 - Math.floor((st.t - st.endlessStart) / 600));
    for (const p of alivePlayers()) {
      fx({ k: "warn", x: p.x, y: p.y, r: 26 * U, life: 60 });
      st.strikes.push({ x: p.x, y: p.y, t: 60, dmg: e.dmg * .8 });
    }
    if(e.tactic==="gaps")return;
    const n = Math.min(24, 8 + st.finalRound * 2);
    const offset = st.t * .013;
    for (let i = 0; i < n; i++) enemyShot(e, offset + i * TAU / n, 1.5, e.dmg * .55, { kind: "orb" });
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
    for(const [id,at,weight,cap] of [["guardian",240,1.2,8],["sanador",420,.8,3],["tirador",600,1,6]]){
      if(st.t>=at*60 && st.enemies.filter(e=>e.type===id && !e.dead).length<cap)mix[id]=(mix[id] || 0)+weight;
    }
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

    if (!st.finalPhase && sec >= TS.RUN_SECONDS) beginFinalPhase();
    // Los jefes previos siguen su calendario; el final siempre llega al minuto 25.
    const nextBoss = TS.BOSSES[st.bossIdx];
    if (!st.finalPhase && nextBoss && nextBoss.id !== "rey" && sec >= nextBoss.at * st.mod.bossTime) {
      st.bossIdx++;
      spawnAround(nextBoss.id === "rey" ? finalBossId() : nextBoss.id, pick(alive), spawnRadius() * 0.8);
    }
    // modo infinito: un jefe cada minuto y medio y una horda cada minuto
    if (st.endless && !st.finalPhase) {
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
    // Encuentro con objetivo y premio: cuatro enemigos marcados, sin jefes extra.
    if(!st.finalPhase && !st.breach && st.t>=st.nextBreach) {
      st.nextBreach=st.t+180*60;
      const types=Object.keys(currentWave().mix).filter(id=>!TS.ENEMIES[id].boss && !TS.ENEMIES[id].prop);
      const target=pick(alive),id=st.t;
      st.breach={id,total:4,remaining:4};
      for(let i=0;i<4;i++){
        const e=spawnAround(pick(types),target,spawnRadius()*.85);
        e.elite=true;e.breach=id;e.baseMaxHp*=2.2;e.baseDmg*=1.2;e.r*=1.18;
        scaleEnemy(e);
      }
      emit("toast",{text:L("¡Brecha! Derrota a los cuatro élites turquesa"),kind:"breach"});
    }
    // Élites limitados: presión reconocible, con experiencia y monedas extra.
    if (st.t >= st.nextElite) {
      st.nextElite = st.t + 90 * 60;
      if (st.enemies.filter(e => e.elite && !e.dead).length < 4) {
        const type = weightedPick(currentWave().mix);
        const def = TS.ENEMIES[type];
        if (!def.boss && !def.prop) {
          const e = spawnAround(type, pick(alive));
          e.elite = true; e.baseMaxHp *= 3; e.baseDmg *= 1.35; e.baseSpeed *= 1.12;
          e.r *= 1.18; e.hp = e.maxHp; scaleEnemy(e);
          emit("toast", { text: L("¡Élite! Busca el halo dorado"), kind: "elite" });
        }
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
    const teamSize = st.players.filter(p => !p.disconnected).length;
    st.spawnT -= (1 + 0.4 * (teamSize - 1)) * st.mod.spawn;
    if (st.spawnT <= 0) {
      // en el modo infinito salen cada vez más deprisa
      st.spawnT = st.endless ? Math.max(6, wave.every - (st.t - st.endlessStart) / 3600) : wave.every;
      const cap = wave.alive * (1 + 0.35 * (teamSize - 1)) * Math.sqrt(st.mod.spawn);
      const batch = 1 + Math.floor(sec * 600 / TS.RUN_SECONDS / 100);
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
    let sp = e.speed;

    if (target) {
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;

      switch (e.ai) {
        case "guardian":{const a=Math.atan2(dy,dx),old=e.guardAngle ?? a;e.guardAngle=old+clamp(Math.atan2(Math.sin(a-old),Math.cos(a-old)),-.035,.035);mx=ux;my=uy;break;}
        case "medic":
          if(dist>140*U){mx=ux;my=uy;}else{mx=-uy*.5;my=ux*.5;}
          if(--e.timer<=0){
            e.timer=240;
            const allies=st.enemies.filter(o=>o!==e && !o.dead && !o.prop && !o.boss && dist2(e,o)<(100*U)**2 && o.hp<o.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp).slice(0,5);
            for(const ally of allies)ally.hp=Math.min(ally.maxHp,ally.hp+ally.maxHp*.08);
            if(allies.length){fx({k:"ring",x:e.x,y:e.y,r:100*U,color:"#8be7ac",life:35});e.atk=30;}
          }break;
        case "sniper":
          if(e.state===1){
            if(--e.timer<=0){enemyShot(e,e.lockAngle,4.2,e.dmg,{kind:"bullet"});e.state=0;e.timer=180;e.atk=16;}
          } else {
            if(dist>210*U){mx=ux;my=uy;}else if(dist<120*U){mx=-ux;my=-uy;}
            if(--e.timer<=0){e.state=1;e.timer=60;e.lockAngle=Math.atan2(dy,dx);dangerLine(e.x,e.y,target.x,target.y,60);}
          }break;
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
          sp = e.sp ?? sp;
      }
    }

    if(e.siteId!==undefined){
      const home=st.sites.find(site=>site.id===e.siteId);
      if(home && dist2(e,home)>(180*U)**2){mx=home.x-e.x;my=home.y-e.y;}
    }
    if(e.exposedUntil>=st.t)e.phased=false;
    if(terrain(e.x,e.y)===2){e.wetUntil=st.t+30;e.wetBy=e.controlBy ?? -1;}
    const maxSlow = e.relentless ? Math.max(.08, .4 - (st.t - st.endlessStart) / 90000) : 1;
    if (e.slow > 0) sp *= 1 - Math.min(e.slowAmt, maxSlow);
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
  function dangerLine(x,y,tx,ty,life=60){st.zones.push({type:"dangerLine",x,y,tx,ty,t:0,life});}

  function bossTactics(e,target,ux,uy,dist){
    const phase=e.hp/e.maxHp>2/3?0:e.hp/e.maxHp>1/3?1:2;
    const pattern=TS.BOSS_PATTERNS[e.type][phase];
    if(e.tacticPhase!==phase){e.tacticPhase=phase;e.state=0;e.timer=60;e.volley=null;}
    e.tactic=pattern;e.mx=ux;e.my=uy;e.sp=e.speed;e.timer--;
    if(pattern==="charge"){
      if(e.state===0 && e.timer<=0){e.state=1;e.timer=60;e.dx=ux;e.dy=uy;dangerLine(e.x,e.y,e.x+ux*260*U,e.y+uy*260*U,60);}
      if(e.state===1){e.mx=e.my=0;if(e.timer<=0){e.state=2;e.timer=28;sound("dodge");}}
      else if(e.state===2){e.mx=e.dx;e.my=e.dy;e.sp=5.2*U;if(e.timer<=0){e.state=0;e.timer=180;}}
    } else if(pattern==="gaps"){
      if(dist<150*U){e.mx=-ux*.4;e.my=-uy*.4;}
      if(e.state===0 && e.timer<=0){e.state=1;e.timer=60;e.gap=rand(0,TAU);st.zones.push({type:"dangerRing",x:e.x,y:e.y,r:70*U,gap:e.gap,width:.6,t:0,life:60});}
      if(e.state===1){e.mx=e.my=0;if(e.timer<=0){
        for(let i=0;i<24;i++){const a=i*TAU/24;if(Math.abs(Math.atan2(Math.sin(a-e.gap),Math.cos(a-e.gap)))>.5)enemyShot(e,a,1.8,e.dmg*.55,{kind:"orb"});}
        e.state=0;e.timer=130;sound("eshot");
      }}
    } else if(pattern==="volley"){
      if(dist<160*U){e.mx=-ux*.5;e.my=-uy*.5;}
      if(e.state===0 && e.timer<=0){
        e.state=1;e.timer=60;e.volley=[];
        for(const p of alivePlayers())for(const off of [-.18,0,.18]){
          const a=Math.atan2(p.y-e.y,p.x-e.x)+off;e.volley.push(a);
          dangerLine(e.x,e.y,e.x+Math.cos(a)*320*U,e.y+Math.sin(a)*320*U,60);
        }
      }
      if(e.state===1){e.mx=e.my=0;if(e.timer<=0){for(const a of e.volley || [])enemyShot(e,a,3,e.dmg*.6,{kind:"bullet"});e.state=0;e.timer=170;}}
    } else if(pattern==="guards"){
      e.sp=e.speed*.6;
      if(e.timer<=0){
        e.timer=300;
        const count=st.enemies.filter(o=>o.summonedBy===e.id && !o.dead).length;
        for(let i=0;i<Math.min(3,6-count);i++){const a=i*TAU/3;
          st.zones.push({type:"summon",x:e.x+Math.cos(a)*50*U,y:e.y+Math.sin(a)*50*U,t:0,life:61,bossId:e.id,enemy:i===0?(e.type==="reyEsqueleto"?"sanador":"guardian"):(e.type==="reyEsqueleto"?"esqueleto":e.type==="general"?"antitronk":"zombi")});
        }
      }
    } else {
      // Slime pools and the Ninja/King's ambush share delayed ground attacks,
      // with different palettes, sizes and durations.
      if(e.timer<=0){
        e.timer=pattern==="ambush"?210:160;
        for(const p of alivePlayers())st.zones.push({type:"hazard",x:p.x,y:p.y,r:(pattern==="ambush"?38:30)*U,warn:60,t:0,life:pattern==="ambush"?105:240,dmg:e.dmg*.45,theme:pattern});
        if(pattern==="ambush" && st.enemies.filter(o=>o.summonedBy===e.id&&!o.dead).length<6)for(let i=0;i<2;i++)st.zones.push({type:"summon",x:target.x+(i?60:-60)*U,y:target.y+50*U,t:0,life:61,bossId:e.id,enemy:"ninja"});
      }
    }
  }

  function bossAI(e, target, ux, uy, dist) {
    if(TS.BOSS_PATTERNS[e.type]){bossTactics(e,target,ux,uy,dist);return;}
    e.timer--;
    e.mx = ux;
    e.my = uy;
    e.sp = e.speed;
    const hpPct = e.hp / e.maxHp;
    const shotDamage = value => value * e.dmg / (TS.ENEMIES[e.type].dmg || 1);
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
          for (let i = 0; i < n; i++) enemyShot(e, off + (i / n) * TAU, 1.7, shotDamage(7), { kind: "bullet" });
          sound("eshot");
        }
        if (e.t % (hpPct < 0.5 ? 55 : 75) === 0 && e.t > 120) {
          const a = Math.atan2(uy, ux);
          for (const s of [-0.22, 0, 0.22]) enemyShot(e, a + s, 2.1, shotDamage(7), { kind: "bullet" });
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
            for (let i = -3; i <= 3; i++) enemyShot(e, a + i * 0.22, 2.4, shotDamage(7), { kind: "star" });
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
          for (let i = 0; i < 16; i++) enemyShot(e, off + (i / 16) * TAU, 1.6, shotDamage(9), { kind: "goo" });
        }
        if (hpPct < 0.3) e.sp = e.speed * 1.6;
        break;
      case "boss_bones":
        // anillos de huesos, se teletransporta y levanta esqueletos
        if (e.t % 170 === 0) {
          const off = rand(0, TAU);
          const n = hpPct < 0.5 ? 18 : 12;
          for (let i = 0; i < n; i++) enemyShot(e, off + (i / n) * TAU, 1.8, shotDamage(8), { kind: "star" });
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
              for (let i = 0; i < 12; i++) enemyShot(e, off + (i / 12) * TAU, 1.5, shotDamage(8), { kind: "goo" });
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
          for (const k of [0, Math.PI]) enemyShot(e, a + k, 1.6, shotDamage(7), { kind: "bullet" });
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
    if (e.relentless && e.ai === "boss_general") { e.mx = ux; e.my = uy; }
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
      near(e.x, e.y, e.r + maxEnemyRadius, (o) => {
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
  function announceCombo(label){
    st.comboLabel=label;st.comboUntil=st.t+180;
    if(st.t-(st.comboTicks[label] ?? -999)>300){st.comboTicks[label]=st.t;emit("toast",{text:L(label),kind:"combo"});sound("zap",.2);}
  }

  function hitEnemy(e, dmg, pl, { kx = 0, ky = 0, kb = 0, projectile = false, slow = 0, slowFor = 0, crit = false, combo = true } = {}) {
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
    const family=pl?(TS.WEAPONS[charById(pl.charId).weapon].family || charById(pl.charId).weapon):null;
    if(pl && family==="copos"){e.wetBy=pl.id;e.wetUntil=st.t+180;}
    const conductor=combo && pl && family==="rayo" && e.wetUntil>(st?.t ?? 0) && e.wetBy!==pl.id;
    if(conductor){dmg*=1.25;}
    if(e.type==="guardian" && !(e.exposedUntil>st.t) && pl){
      const incoming=projectile && (kx || ky)?Math.atan2(-ky,-kx):Math.atan2(pl.y-e.y,pl.x-e.x);
      const front=e.guardAngle ?? Math.atan2(pl.y-e.y,pl.x-e.x);
      if(Math.cos(incoming-front)>.6){dmg*=.22;if(st.t-(e.blockTick ?? -999)>40){e.blockTick=st.t;fx({k:"text",x:e.x,y:e.y-52,text:L("Bloqueado"),color:"#a9d9ff",life:30});}}
    }
    if(e.elite){kb*=.4;slow=Math.min(slow,.25);}
    const might = pl ? pl.stats.might : 1;
    const amount = Math.max(1, Math.round(dmg * might * rand(0.9, 1.1) - (d.armor || 0)));
    if (!e.prop && pl?.combat) { pl.combat.dealt += Math.min(e.hp,amount); e.lastHit = pl.id; }
    e.hp -= amount;
    e.flash = 6;
    if (kb && !e.boss) {
      const l = Math.hypot(kx, ky) || 1;
      const k = kb * (d.heavy ? 0.3 : 1);
      e.kx += (kx / l) * k;
      e.ky += (ky / l) * k;
    }
    if (slow) {
      e.slowAmt = Math.max(e.slow > 0 ? e.slowAmt : 0, slow);
      e.slow = Math.max(e.slow, slowFor);
    }
    if (!e.prop && (R() < 0.22 || amount > 30 || e.boss)) fx({ k: "num", x: e.x + rand(-4, 4), y: e.y - 18, v: amount, big: crit || amount > 40, life: 36 });
    sound("hit", 0.04);
    if(!e.prop && st.impacts< (lowFx?3:10) && st.t-(e.impactTick ?? -99)>7){
      e.impactTick=st.t;st.impacts++;
      fx({k:"impact",x:e.x,y:e.y-14,ang:Math.atan2(ky,kx),color:conductor?"#91e9ff":amount>40?"#f0cb82":"#f8e8c8",big:amount>40,life:14});
    }
    if(conductor && st.t-(e.conductorTick ?? -999)>120){
      e.conductorTick=st.t;announceCombo("Descarga conductora");
      const links=enemiesInRadius(e.x,e.y,90*U).filter(o=>o!==e&&!o.dead&&!o.prop).slice(0,2);
      for(const o of links){st.zones.push({type:"bolt",pts:[[e.x,e.y-16],[o.x,o.y-16]],life:12,t:0});hitEnemy(o,dmg*.3,pl,{combo:false});}
    }
    if (e.hp <= 0) { if (e.relentless) nextFinalRound(e); else killEnemy(e); }
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
    if(e.breach && st.breach?.id===e.breach) {
      st.breach.remaining--;
      if(st.breach.remaining===0){
        st.pickups.push({x:e.x,y:e.y,kind:"cofre",t:0},{x:e.x+18,y:e.y,kind:"iman",t:0});
        st.breach=null;
        emit("toast",{text:L("¡Brecha cerrada! Cofre e imán"),kind:"breach"});
      }
    }
    st.kills++;
    if (!silent) registerKill(e.lastHit);
    if (!silent) sound("kill", 0.05);
    fx({ k: "puff", x: e.x, y: e.y - 16, color: e.boss ? "#ffd23f" : "#c9d1dc", life: 16, big: e.boss });
    if (e.elite) {
      if (e.lastHit !== undefined && st.players[e.lastHit]?.combat) st.players[e.lastHit].combat.elites++;
      for (let i=0;i<5;i++) st.pickups.push({x:e.x+rand(-12,12),y:e.y+rand(-8,8),kind:"moneda",t:0});
      fx({k:"text",x:e.x,y:e.y-40,text:L("¡Élite derrotado!"),color:"#f5cb79",life:60});
    }
    // gema de experiencia
    const v = d.xp * (e.elite ? 5 : 1);
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
      st.boss = st.finalPhase ? st.finalBoss : null;
      st.pickups.push({ x: e.x, y: e.y, kind: "cofre", t: 0 });
      for (let i = 0; i < 8; i++) st.pickups.push({ x: e.x + rand(-26, 26), y: e.y + rand(-26, 26), kind: "moneda", t: 0 });
      shake(10);
      sound("chest");
      Sfx.startMusic(st.finalPhase ? "boss" : "run");
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
    // Keep attracted gems attracted, without pulling unrelated gems for free.
    for(const pull of [false,true]){
      const group=far.filter(g=>!!g.pull===pull);
      if(!group.length)continue;
      st.gems.push({x:group[0].x,y:group[0].y,v:group.reduce((n,g)=>n+g.v,0),t:0,pull});
    }
  }

  /* =======================================================
     JUGADORES
     ======================================================= */

  function healPlayer(p, amount, show = false) {
    if (p.down) return 0;
    const healed = Math.max(0, Math.min(amount, p.stats.maxHp-p.hp));
    p.hp += healed;
    if (p.combat) p.combat.healed += healed;
    if (show && healed > 0) fx({k:"text",x:p.x,y:p.y-36,text:`+${Math.round(healed)}`,color:"#8aefc2",life:40});
    return healed;
  }

  function hurtPlayer(p, dmg) {
    if (p.down || p.iframes > 0) return;
    const amount = Math.max(1, Math.round(dmg - p.stats.armor));
    if (p.combat) p.combat.taken += Math.min(p.hp,amount);
    p.hp -= amount;
    if(p.streak){p.streak.count=0;p.streak.until=0;p.streak.flashUntil=0;}
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
    if (p.disconnected) return;
    if (p.down) {
      // un compañero cerca lo levanta
      const helper = st.players.filter(o => o !== p && !o.down && !o.disconnected && dist2(o,p) < (24*U)**2)
        .sort((a,b)=>(b.stats.reviveRate || 1)-(a.stats.reviveRate || 1))[0];
      p.reviver = helper ? helper.id : null;
      if (helper) {
        p.reviveT = Math.min(150,p.reviveT + (helper.stats.reviveRate || 1));
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
      const directionLength = Math.hypot(x, y) || 1;
      p.moveX = x / directionLength;
      p.moveY = y / directionLength;
      p.walkT++;
      collide(p, 7 * U);
    }
    if(!p.moving && mapId==="playa") {blockWater(p,p.x,p.y);collide(p,7*U);}
    // hacia dónde mira: hacia donde ataca (un momento) o hacia donde anda
    if (p.atk && p.atk.t > 0) {
      p.atk.t--;
      setDir(p, p.atk.ax, p.atk.ay);
    } else if (p.moving) setDir(p, x, y);
    if (p.atk && p.atk.t <= 0) p.atk = null;

    if (p.stats.regen && st.t % 60 === 0) healPlayer(p, p.stats.regen);

    if (p.abCd > 0) p.abCd--;
    if ((p.input.ab || 0) !== p.abSeen) {
      p.abSeen = p.input.ab || 0;
      if (p.abCd <= 0) useAbility(p);
    }

    p.weapons = p.weapons.filter(w => w.id === charById(p.charId).weapon);
    for (const w of p.weapons) updateWeapon(p, w);
    updateTechniques(p);
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
      case "iria": case "boro": case "vega": case "tala": {
        if(p.charId==="tala") {
          for(const ally of alivePlayers())if(dist2(ally,p)<(120*area)**2)ally.iframes=Math.max(ally.iframes,75);
        }
        techniqueAttack(p,p.charId==="boro" || p.charId==="tala"?"guard":"surge",4);
        break;
      }
      case "lumen":
        for(const ally of st.players) {
          if(ally.disconnected || dist2(ally,p)>(150*area)**2)continue;
          if(ally.down) ally.reviveT=Math.min(149,ally.reviveT+60);
          else healPlayer(ally,ally.stats.maxHp*.25,true);
        }
        fx({k:"ring",x:p.x,y:p.y,r:150*area,color:"#80e3d0",life:45});
        sound("chest");break;
      case "nix":
        for (const e of st.enemies) {
          if (e.dead || e.prop || dist2(e, p) > (160 * area) ** 2) continue;
          if (!e.boss) { e.x += (p.x - e.x) * .5; e.y += (p.y - e.y) * .5; }
          hitEnemy(e, 65 * lvl, p, { slow: .4, slowFor: 90 });
        }
        fx({ k: "ring", x: cx, y: p.y, r: 160 * area, color: "#64f5ff", life: 40 });
        sound("zap"); break;
      case "savia":
        healPlayer(p, p.stats.maxHp * .15);
        ring(6, a => st.zones.push({ type: "acid", x: cx + Math.cos(a) * 65, y: p.y + Math.sin(a) * 65,
          r: 30 * area, t: 0, warn: 15, life: 240, dmg: 14 * lvl, owner: p.id }));
        sound("ice"); break;
      case "brasa":
        ring(6, a => st.zones.push({ type: "flame", x: cx, y: cy, ang: a, len: 105 * area,
          spread: .6, t: 0, life: 42, dmg: 22 * lvl, owner: p.id, fixed: true }));
        sound("boom"); shake(5); break;
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
        healPlayer(p, p.stats.maxHp * 0.4, true);
        p.iframes = 180;
        fx({ k: "ring", x: p.x, y: p.y, r: 70, color: "#ff9fd0", life: 34 });
        for (const o of st.players) if (o !== p && !o.down && Math.hypot(o.x - p.x, o.y - p.y) < 120) healPlayer(o, o.stats.maxHp * 0.25, true);
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
        blockWater(p, ox, oy);
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
      near(p.x, p.y, maxEnemyRadius + 6 * U, (e) => {
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
    const base = TS.WEAPONS[w.id].levels[w.lvl - 1];
    const mastery = 1 + Math.min(1.5, Math.max(0, st.level - 1) * .025);
    const L = { ...base, dmg: base.dmg * mastery };
    if (!w.evo) return L;
    // arma evolucionada: mucho más fuerte
    const evolved = {
      ...L,
      dmg: L.dmg * 1.7,
      cd: L.cd ? Math.round(L.cd * 0.72) : L.cd,
      count: (L.count || 1) + 2,
      area: (L.area || 1) * 1.3,
      pierce: L.pierce ? L.pierce + 3 : L.pierce,
      dur: L.dur ? L.dur * 1.4 : L.dur,
      speed: L.speed ? L.speed * 1.15 : L.speed
    };
    if(w.path==="precision"){evolved.dmg*=1.45;evolved.area*=.85;evolved.cd*=1.18;}
    if(w.path==="dominion"){evolved.dmg*=.8;evolved.area*=1.4;evolved.count+=2;evolved.cd*=.9;}
    return evolved;
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

    if (w.id === "discos") {
      if (!w.orbs) w.orbs = [];
      while (w.orbs.length < amount) w.orbs.push({ hitT: {} });
      w.orbs.length = amount;
      for (let i = 0; i < amount; i++) {
        const orb = w.orbs[i];
        const ang = st.t * L.speed + i * TAU / amount;
        const x = cx + Math.cos(ang) * 42 * area, y = p.y + Math.sin(ang) * 42 * area;
        if (st.t % 300 === 0) orb.hitT = {};
        st.zones.push({ type: "disc", x, y, r: 8 * area, ang: st.t * .2, t: 0, life: 2, gold: !!w.evo });
        for (const e of enemiesInRadius(x, y, 9 * area)) {
          if ((orb.hitT[e.id] || 0) > st.t) continue;
          orb.hitT[e.id] = st.t + Math.max(8, L.cd * p.stats.cdMul);
          hitEnemy(e, L.dmg, p, { kx: e.x - cx, ky: e.y - p.y, kb: .8 });
        }
      }
      return;
    }
    // armas que actúan siempre
    if (w.id === "colonia") {
      w.cd--;
      if (w.cd <= 0) {
        w.cd = L.cd * p.stats.cdMul;
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
            // atraviesa a todos los de la línea, pero se corta tras el último que toca
            const reach = 240 * area;
            const hits = enemiesOnLine(dr.x, dr.y, ang, reach, 6);
            let len = Math.hypot(target.x - dr.x, target.y - 16 - dr.y);
            for (const e of hits) {
              len = Math.max(len, (e.x - dr.x) * Math.cos(ang) + (e.y - 16 - dr.y) * Math.sin(ang));
              hitEnemy(e, L.dmg, p, { kx: Math.cos(ang), ky: Math.sin(ang), kb: 1 });
            }
            st.zones.push({ type: "laser", x: dr.x, y: dr.y, ang, len: Math.min(reach, len + 12), life: 10, t: 0 });
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

  function updateTechniques(p) {
    if (!p.techniques) return;
    if (!p.techCds) p.techCds = {};
    for (const [id,lvl] of Object.entries(p.techniques)) {
      const move=(TS.TECHNIQUES[p.charId] || []).find(m=>m.id===id);
      if (!move) continue;
      p.techCds[id]=(p.techCds[id] ?? 30)-1;
      if (p.techCds[id]>0) continue;
      p.techCds[id]=move.cd*p.stats.cdMul;
      techniqueAttack(p,id,lvl);
    }
  }

  function techniqueAttack(p,id,lvl) {
    const native=charById(p.charId).weapon;
    const weapon=TS.WEAPONS[native].family || native;
    const pattern=["burst","pierce","focus"].includes(id)?"burst":"ring";
    const w=p.weapons.find(w=>w.id===native);
    if (!w) return;
    const base=levelStats(w);
    const L={...base,dmg:base.dmg*(1+.2*lvl)*(id==="focus"?1.8:id==="surge"?1.45:1),pierce:(base.pierce || 1)+lvl+(id==="pierce"?4:0)};
    const area=(L.area || 1)*p.stats.area*(1+.06*lvl)*(id==="guard"?1.25:id==="surge"?1.4:1);
    const cx=p.x,cy=p.y-18;
    if(weapon==="tornado" && ["pierce","guard","focus","surge"].includes(id)) {
      const target=nearestEnemy(cx,cy,300),[ax,ay]=dirTo(p,target),angle=Math.atan2(ay,ax);
      attackAnim(p,native,ax,ay,24);
      const count=id==="focus"?1:id==="pierce"?2+Math.floor(lvl/2):id==="guard"?3:6;
      for(let i=0;i<count;i++){
        const a=id==="pierce"?angle+(i-(count-1)/2)*.18:i*TAU/count;
        st.zones.push({type:"tornado",x:id==="focus"?(target?.x ?? cx+ax*90):cx,y:id==="focus"?(target?.y ?? p.y+ay*90):p.y,
          vx:Math.cos(a)*(id==="pierce"?3.5:2)*U,vy:Math.sin(a)*(id==="pierce"?3.5:2)*U,
          t:0,life:id==="guard"?150:210,r:(id==="focus"?34:id==="pierce"?15:24)*area,dmg:L.dmg,owner:p.id,
          stationary:id==="focus",straight:id==="pierce",orbit:id==="guard",spiral:id==="surge",a,orbitRadius:60*area});
      }
      sound("wave");return;
    }
    if(id==="guard")for(const e of enemiesInRadius(p.x,p.y,90*area))hitEnemy(e,1,p,{slow:.35,slowFor:90,kb:3,kx:e.x-p.x,ky:e.y-p.y});
    if (pattern === "burst" && !["colonia","discos","dron"].includes(weapon)) {
      fire(p,w,L,area,(L.count || 1)+p.stats.amount+lvl,cx,cy);
      return;
    }
    const n=4+lvl*2;
    const ring=make=>{for(let i=0;i<n;i++)make(i*TAU/n);};
    const damageCircle=r=>{for(const e of enemiesInRadius(cx,p.y,r))hitEnemy(e,L.dmg,p,{kx:e.x-cx,ky:e.y-p.y,kb:2});};
    const [ax,ay]=dirTo(p,nearestEnemy(cx,cy,300));
    attackAnim(p,weapon,ax,ay,22);
    switch (weapon) {
      case "faro":
        damageCircle(105*area);
        fx({k:"ring",x:cx,y:p.y,r:105*area,color:"#80e3d0",life:36});sound("zap");break;
      case "tajo":
        ring(a=>st.zones.push({type:"slash",x:cx,y:cy,ang:a,R:65*area,t:0,life:16,dirSign:1,gold:!!w.evo}));
        damageCircle(65*area);sound("slash");break;
      case "mazazo":
      case "punos":
        st.zones.push({type:"wave",x:cx,y:p.y,r:0,maxR:90*area,life:24,t:0,hit:new Set(),dmg:L.dmg,owner:p.id});
        sound(weapon==="mazazo"?"wave":"punch");break;
      case "guantes":
        ring(a=>st.zones.push({type:"punch",x:cx+Math.cos(a)*35*area,y:cy+Math.sin(a)*35*area,r:12*area,t:0,life:12,glove:true,big:true}));
        damageCircle(55*area);sound("punch");break;
      case "estocada":
        ring(a=>{
          st.zones.push({type:"thrust",x:cx,y:cy,ang:a,len:95*area,t:0,life:14});
          for(const e of enemiesOnLine(cx,cy,a,95*area,8))hitEnemy(e,L.dmg,p,{kx:Math.cos(a),ky:Math.sin(a),kb:2});
        });sound("slash");break;
      case "virote": case "kunai": case "copos": case "balon": case "hacha": {
        const type={virote:"bolt",kunai:"kunai",copos:"ice",balon:"ball",hacha:"axe"}[weapon];
        ring(a=>st.shots.push({type,x:cx,y:cy,vx:Math.cos(a)*(L.speed || 4)*U,vy:Math.sin(a)*(L.speed || 4)*U,
          ang:a,dmg:L.dmg,pierce:L.pierce || 4,life:150,r:(type==="axe"?9:5)*area,hit:new Set(),hitT:{},
          owner:p.id,target:0,out:95*area,travelled:0,back:false}));
        sound(weapon==="copos"?"ice":weapon==="hacha"?"slash":"shoot");break;
      }
      case "petardo":
        ring(a=>st.zones.push({type:"bomb",x:cx,y:cy,x0:cx,y0:cy,tx:cx+Math.cos(a)*75*area,ty:p.y+Math.sin(a)*75*area,
          r:28*area,dur:32,life:34,t:0,dmg:L.dmg,owner:p.id}));sound("shoot");break;
      case "colonia":
        if(pattern==="burst") {
          damageCircle(60*area);
          fx({k:"ring",x:cx,y:p.y,r:60*area,color:"#ff8ed1",life:35});
        } else ring(a=>st.zones.push({type:"perfume",x:cx+Math.cos(a)*42*area,y:p.y+Math.sin(a)*42*area,
          r:22*area,t:0,warn:0,life:150,dmg:L.dmg,owner:p.id}));
        sound("ice");break;
      case "meteoro":
        ring(a=>st.zones.push({type:"meteor",x:cx+Math.cos(a)*70*area,y:p.y+Math.sin(a)*70*area,
          warn:28,life:45,t:0,r:25*area,dmg:L.dmg,owner:p.id}));break;
      case "rayo":
        st.enemies.filter(e=>!e.dead&&!e.prop&&!e.phased&&dist2(e,p)<(250*area)**2).sort((a,b)=>dist2(a,p)-dist2(b,p)).slice(0,n).forEach(e=>{
          st.zones.push({type:"bolt",pts:[[e.x,e.y-180],[e.x+8,e.y-70],[e.x,e.y-14]],life:14,t:0});
          hitEnemy(e,L.dmg,p);
        });sound("zap");break;
      case "dron": {
        const dr=w.drones && w.drones[0];
        const x=dr?.x ?? cx,y=dr?.y ?? cy;
        const target=nearestEnemy(x,y,300*area);
        const angle=target?Math.atan2(target.y-16-y,target.x-x):Math.atan2(ay,ax);
        const shoot=a=>{
          st.zones.push({type:"laser",x,y,ang:a,len:260*area,life:12,t:0});
          for(const e of enemiesOnLine(x,y,a,260*area,8))hitEnemy(e,L.dmg,p);
        };
        if(pattern==="burst")shoot(angle);else ring(shoot);
        sound("laser");break;
      }
      case "tornado":
        for(let i=0;i<Math.min(4,2+lvl);i++) {
          const a=i*TAU/Math.min(4,2+lvl);
          st.zones.push({type:"tornado",x:cx,y:p.y,vx:Math.cos(a)*1.5*U,vy:Math.sin(a)*1.5*U,
            t:0,life:180,r:23*area,dmg:L.dmg,owner:p.id});
        }sound("dodge");break;
      case "discos":
        ring(a=>st.zones.push({type:"disc",orbit:true,expand:pattern==="ring",a,orbitRadius:(pattern==="ring"?65:28)*area,
          x:cx,y:p.y,r:8*area,ang:a,t:0,life:120,dmg:L.dmg,owner:p.id,gold:!!w.evo}));sound("zap");break;
      case "acido":
        ring(a=>st.zones.push({type:"acid",x:cx+Math.cos(a)*55*area,y:p.y+Math.sin(a)*55*area,
          r:22*area,t:0,warn:20,life:(L.dur || 180)+20,dmg:L.dmg,owner:p.id}));sound("shoot");break;
      case "llamas":
        for(let i=0;i<Math.min(5,2+lvl);i++)st.zones.push({type:"flame",x:cx,y:cy,ang:Math.atan2(ay,ax)+(i-(Math.min(5,2+lvl)-1)/2)*.35,
          len:90*area,spread:.32,life:32,t:0,dmg:L.dmg,owner:p.id});
        sound("boom");break;
    }
  }

  function fire(p, w, L, area, amount, cx, cy) {
    switch (TS.WEAPONS[w.id].family || w.id) {
      case "faro":
        for(const e of enemiesInRadius(cx,p.y,72*area))hitEnemy(e,L.dmg,p,{kx:e.x-cx,ky:e.y-p.y,kb:1.5});
        fx({k:"ring",x:cx,y:p.y,r:72*area,color:w.evo?"#f7dfa0":"#80e3d0",life:28});
        sound("zap");break;
      case "acido": {
        const used = new Set();
        for (let i = 0; i < amount; i++) {
          const target = nearestEnemy(cx, cy, 320, used);
          if (target) used.add(target.id);
          const a = i * TAU / amount;
          const x = target ? target.x : cx + Math.cos(a) * 80;
          const y = target ? target.y : p.y + Math.sin(a) * 80;
          st.zones.push({ type: "acid", x, y, r: 26 * area, t: 0, warn: 24, life: L.dur + 24, dmg: L.dmg, owner: p.id });
          if (i === 0) attackAnim(p, w.id, x - cx, y - cy, 20);
        }
        sound("shoot"); break;
      }
      case "llamas": {
        const [ax, ay] = dirTo(p, nearestEnemy(cx, cy, 180 * area));
        attackAnim(p, w.id, ax, ay, L.dur);
        st.zones.push({ type: "flame", x: cx, y: cy, ang: Math.atan2(ay, ax), len: 85 * area,
          spread: Math.min(1.05, .42 + (amount - 1) * .10), t: 0, life: L.dur, dmg: L.dmg, owner: p.id });
        sound("boom", .2); break;
      }
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
        if(w.evo && w.path==="precision"){
          st.zones.push({type:"tornado",x:p.x,y:p.y,vx:0,vy:0,t:0,life:L.dur,r:32*area,dmg:L.dmg,owner:p.id,orbit:true,orbitRadius:0,a:0});
          sound("wave",.2);break;
        }
        for (let i = 0; i < amount; i++) {
          const a = rand(0, TAU);
          st.zones.push({ type: "tornado", x: cx, y: cy + 8, vx: Math.cos(a) * (w.path==="dominion"?2.8:1.3) * U, vy: Math.sin(a) * (w.path==="dominion"?2.8:1.3) * U, straight:w.path==="dominion", t: 0, life: L.dur, r: 20 * area, dmg: L.dmg, owner: p.id });
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
    near(x + cx * len / 2, y + cy * len / 2, len / 2 + w + maxEnemyRadius + 16, (e) => {
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
      near(s.x, s.y + 8, s.r + maxEnemyRadius + 24, (e) => {
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
        case "summon":
          if(z.t===60 && st.enemies.some(e=>e.id===z.bossId && !e.dead)){
            const e=spawnEnemy(z.enemy,z.x,z.y);e.summonedBy=z.bossId;
          }break;
        case "hazard":
          if(z.t>=z.warn && (z.t-z.warn)%30===0)for(const p of alivePlayers())if(dist2(p,z)<=z.r*z.r)hurtPlayer(p,z.dmg);
          break;
        case "perfume":
        case "acid":
          if (z.t >= z.warn && (z.t - z.warn) % 20 === 0) {
            for (const e of enemiesInRadius(z.x, z.y, z.r)) hitEnemy(e, z.dmg, st.players[z.owner], { slow: .28, slowFor: 35 });
          }
          break;
        case "disc":
          if (z.orbit) {
            const p=st.players[z.owner]; if (!p || p.down) break;
            const a=z.a+z.t*.10, r=z.orbitRadius*(z.expand?Math.min(1,z.t/35):1);
            z.x=p.x+Math.cos(a)*r;z.y=p.y+Math.sin(a)*r;z.ang=a;
            if(z.t%12===1)for(const e of enemiesInRadius(z.x,z.y,z.r))hitEnemy(e,z.dmg,p,{kb:.6,kx:e.x-p.x,ky:e.y-p.y});
          }
          break;
        case "flame": {
          const p = st.players[z.owner];
          if (!p || p.down) break;
          if (!z.fixed) { z.x = p.x; z.y = p.y - 18; }
          if (z.t % 8 === 1) for (const e of enemiesInRadius(z.x, z.y, z.len)) {
            const dx = e.x - z.x, dy = e.y - 16 - z.y;
            const da = Math.atan2(Math.sin(Math.atan2(dy, dx) - z.ang), Math.cos(Math.atan2(dy, dx) - z.ang));
            if (Math.abs(da) <= z.spread + Math.atan2(e.r, Math.hypot(dx, dy))) hitEnemy(e, z.dmg, p);
          }
          break;
        }
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
          if(z.t%30===1){
            const fire=st.zones.find(f=>f.type==="flame" && f.owner!==z.owner && st.players[f.owner] && !st.players[f.owner].disconnected && !st.players[z.owner]?.disconnected && f.t>=0 && f.t<f.life && dist2(f,z)<(z.r+(f.len || 0)*.5)**2);
            if(fire){z.ignitedUntil=st.t+180;announceCombo("Vórtice ígneo");}
          }
          z.ignited=z.ignitedUntil>st.t;
          if(z.orbit){
            const owner=st.players[z.owner];if(!owner || owner.down){z.life=z.t;break;}
            const a=z.a+z.t*.035;z.x=owner.x+Math.cos(a)*z.orbitRadius;z.y=owner.y+Math.sin(a)*z.orbitRadius;
          } else if(!z.stationary){
            if(z.spiral){const vx=z.vx;z.vx=vx*Math.cos(.025)-z.vy*Math.sin(.025);z.vy=vx*Math.sin(.025)+z.vy*Math.cos(.025);}
            z.x += z.vx;z.y += z.vy;
            if(!z.straight && !z.spiral && z.t%40===0){const a=Math.atan2(z.vy,z.vx)+rand(-1,1);z.vx=Math.cos(a)*1.3*U;z.vy=Math.sin(a)*1.3*U;}
          }
          for (const e of enemiesInRadius(z.x, z.y, z.r * 1.8)) {
            if (!e.boss) { const pull=e.elite ? .012 : .04; e.controlBy=z.owner; e.x+=(z.x-e.x)*pull;e.y+=(z.y-e.y)*pull; }
          }
          if(z.t%14===0)for(const e of enemiesInRadius(z.x,z.y,z.r)){
            if(!e.windHits)e.windHits={};
            const windDamage=z.dmg*(z.ignited?1.3:1);
            const last=e.windHits[z.owner];
            if(last && st.t-last.t<12){
              if(windDamage<=last.dmg)continue;
              const extra=windDamage-last.dmg;last.dmg=windDamage;
              hitEnemy(e,extra,st.players[z.owner]);
            } else {
              e.windHits[z.owner]={t:st.t,dmg:windDamage};
              hitEnemy(e,windDamage,st.players[z.owner]);
            }
          }
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
    // Los objetos están anclados al suelo: usar los pies en ambos renderizadores.
    // Elegir un único receptor evita tirones opuestos en cooperativo.
    const nearest = (item, candidates=alive) => candidates.reduce((best, p) => !best || dist2(item, p) < dist2(item, best) ? p : best, null);
    const moveTowards = (item, p, speed) => {
      const d = Math.hypot(p.x - item.x, p.y - item.y);
      if (!d) return;
      const step = Math.min(d, speed);
      item.x += (p.x - item.x) / d * step;
      item.y += (p.y - item.y) / d * step;
    };
    for (const g of st.gems) {
      g.t++;
      const p = nearest(g);
      if (!p) continue;
      const radius = 12 * U;
      if (g.pull || dist2(g, p) <= p.stats.magnet ** 2 || dist2(g, p) <= radius ** 2) {
        g.pull = true;
        g.pullT = (g.pullT || 0) + .25;
        moveTowards(g, p, Math.min(9, 2 + g.t * .02 + g.pullT));
        if (dist2(g, p) <= radius ** 2) {
          g.taken = true;
          const gained=g.v * p.stats.growth * st.mod.xp;
          st.xp += gained;recordLoot(p,"xp",gained);
          sound("gem", .03);
        }
      }
    }
    st.gems = st.gems.filter((g) => !g.taken);

    for (const it of st.pickups) {
      it.t++;
      const p = nearest(it,it.kind==="bocadillo"?alive.filter(p=>p.hp<p.stats.maxHp):alive);
      if (!p) continue;
      const radius = (it.kind === "cofre" ? 21 : it.kind === "moneda" ? 12 : 17) * U;
      const reach = it.kind === "moneda" ? Math.max(radius, p.stats.magnet * .7) : radius + 18 * U;
      if (dist2(it, p) <= reach ** 2) moveTowards(it, p, 3.5 * U);
      if (dist2(it, p) <= radius ** 2) {
        it.taken = true;
        takePickup(p, it);
        if(st.pickupFx<6){st.pickupFx++;fx({k:"pickup",x:p.x,y:p.y,color:it.kind==="bocadillo"?"#8aefc2":it.kind==="iman"?"#91e9ff":"#f0cb82",life:22});}
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
    if ((st.pendingLevels > 0 || st.rewardQueue.length) && !st.choosing) nextChoice();
  }

  function recordLoot(p,kind,amount){
    if(!(amount>0))return;
    if(!p.loot || p.loot.until<=st.t)p.loot={xp:0,coins:0,healed:0,until:st.t+150};
    p.loot[kind]+=amount;
  }

  function registerKill(playerId){
    const p=st.players[playerId];
    if(!p || p.down || p.disconnected)return;
    const chain=p.streak;
    chain.count=(chain.until>=st.t?chain.count:0)+1;
    chain.best=Math.max(chain.best,chain.count);chain.until=st.t+240;
    if([10,25,50].includes(chain.count) || chain.count%100===0){
      chain.flashUntil=st.t+75;
      fx({k:"text",x:p.x,y:p.y-65,text:`${L("Racha")} ${chain.count}`,color:"#f0cb82",life:65});
      sound("streak",.3);
    }
  }

  function takePickup(p, it) {
    switch (it.kind) {
      case "moneda":
        st.coins += st.mod.coins;recordLoot(p,"coins",st.mod.coins);
        sound("coin", 0.05);
        break;
      case "bocadillo":
        recordLoot(p,"healed",healPlayer(p, 30, true));
        sound("pick");
        break;
      case "iman":
        for (const g of st.gems) g.pull = true;
        sound("chest");
        emit("toast", { text: L("¡Imán! Todas las gemas vienen a ti"), kind: "pick" });
        break;
      case "cofre": {
        st.chests = (st.chests || 0) + 1;
        sound("chest");
        st.coins += 40;recordLoot(p,"coins",40);
        st.rewardQueue.push({kind:"chest"});
        emit("chest", { lines: [L("Elige una recompensa para tu personaje")] });
        break;
      }
    }
  }

  function evolutionName(id,path){
    if(!path)return L(TS.EVOLUTIONS[id].name);
    return TS.EVOLUTION_PATHS[id]?L(TS.EVOLUTION_PATHS[id][path].name):`${L(TS.EVOLUTIONS[id].name)} · ${L(TS.EVOLUTION_PATHS[path].name)}`;
  }

  function chestOptions(pl) {
    const evo=evolvable(pl);
    if(evo){
      const paths=TS.EVOLUTION_PATHS[evo.id] || TS.EVOLUTION_PATHS;
      return ["precision","dominion"].map(path=>({kind:"evolution",id:evo.id,path,title:evolutionName(evo.id,path),desc:L(paths[path].desc),icon:evo.id}))
        .concat({kind:"supplies",title:L("Suministros"),desc:L("Recupera 40 de vida, atrae las gemas y suma 20 monedas."),icon:"iman"});
    }
    const options=buildOptions(pl,30),native=options.filter(o=>o.kind==="weapon" || o.kind==="technique");
    const support=options.filter(o=>o.kind==="passive");
    return [native[0] || {kind:"coins",title:L("Bolsa de monedas"),desc:L("+25 monedas"),icon:"moneda"},
      support.find(o=>o.synergy) || support[0] || native[1] || {kind:"heal",title:L("jensalada"),desc:L("Recupera 40 de vida"),icon:"bocadillo"},
      {kind:"supplies",title:L("Suministros"),desc:L("Recupera 40 de vida, atrae las gemas y suma 20 monedas."),icon:"iman"}];
  }

  function nextChoice() {
    if(st.choosing || st.over)return;
    if(st.rewardQueue.length){st.rewardQueue.shift();startChoosing("chest");}
    else if(st.pendingLevels>0)startChoosing("level");
    else emit("resume",{});
  }

  function buildOptions(pl, n = 3) {
    const pool = [];
    const weapon = charById(pl.charId).weapon;
    const native = pl.weapons.find(w => w.id === weapon);
    if (!native) pool.push({kind:"weapon",id:weapon,lvl:1,weight:3});
    else if (native.lvl < 6) pool.push({kind:"weapon",id:weapon,lvl:native.lvl+1,weight:3});
    for (const move of TS.TECHNIQUES[pl.charId] || []) {
      const lvl = (pl.techniques || {})[move.id] || 0;
      if (lvl < move.max && st.level >= (move.unlock || 1)+lvl*4 && st.t >= ((move.at || 0)+lvl*75)*60) pool.push({kind:"technique",id:move.id,lvl:lvl+1,weight:lvl?2:2.6});
    }
    const evolution = TS.EVOLUTIONS[weapon];
    const owned = Object.keys(pl.passives);
    for (const id of owned) if (pl.passives[id] < TS.PASSIVES[id].max) pool.push({ kind: "passive", id, lvl: pl.passives[id] + 1, weight: 2 });
    if (owned.length < TS.MAX_PASSIVES) {
      for (const id of Object.keys(TS.PASSIVES)) if (!(id in pl.passives)) pool.push({ kind: "passive", id, lvl: 1, weight: evolution?.passive === id ? 3 : 1 });
    }
    const newest=pool.filter(o=>o.kind==="technique" && o.lvl===1).sort((a,b)=>TS.TECHNIQUES[pl.charId].find(m=>m.id===b.id).unlock-TS.TECHNIQUES[pl.charId].find(m=>m.id===a.id).unlock)[0];
    const out = [];
    while (out.length < n && pool.length) {
      let total = pool.reduce((s, o) => s + o.weight, 0);
      let r = R() * total;
      let idx = 0;
      for (; idx < pool.length; idx++) { r -= pool[idx].weight; if (r <= 0) break; }
      out.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
    }
    if (native?.lvl >= 4 && !native.evo && evolution && !pl.passives[evolution.passive]) {
      const support = pool.find(o => o.kind === "passive" && o.id === evolution.passive);
      if (support && !out.some(o=>o.id===support.id && o.kind===support.kind)) out[Math.max(0,out.length-1)] = support;
    }
    if(newest && !out.some(o=>o.kind===newest.kind && o.id===newest.id))out[0]=newest;
    if (!out.length) out.push({ kind: "heal" }, { kind: "coins" });
    return out.map((o) => describe(pl, o));
  }

  function describe(pl, o) {
    if (o.kind === "heal") return { ...o, title: L("jensalada"), desc: L("Recupera 40 de vida"), icon: "bocadillo" };
    if (o.kind === "coins") return { ...o, title: L("Bolsa de monedas"), desc: L("+25 monedas"), icon: "moneda" };
    if (o.kind === "technique") {
      const d = TS.TECHNIQUES[pl.charId].find(m => m.id === o.id);
      return {...o,title:o.lvl === 1 ? L(d.name) : LT("levelOf",{name:L(d.name),lvl:o.lvl}),desc:`${L(o.id==="surge"?"Técnica definitiva":"Técnica automática")} · ${L(d.desc)} · ${L("Recarga")}: ${(d.cd/60*pl.stats.cdMul).toFixed(1)} s · ${L("Potencia")}: +${20*o.lvl}%`,icon:charById(pl.charId).weapon,isNew:o.lvl === 1};
    }
    if (o.kind === "passive") {
      const d = TS.PASSIVES[o.id];
      return { ...o, title: L(d.name), desc: L(d.desc), icon: o.id, isNew: o.lvl === 1, synergy: TS.EVOLUTIONS[charById(pl.charId).weapon]?.passive === o.id };
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
    if(o.kind==="evolution"){
      const w=evolvable(pl);
      if(!w || w.id!==o.id || !["precision","dominion"].includes(o.path))return;
      w.evo=true;w.path=o.path;st.evolutions++;
      const paths=TS.EVOLUTION_PATHS[w.id] || TS.EVOLUTION_PATHS;
      emit("evolve",{name:evolutionName(w.id,o.path),desc:L(paths[o.path].desc),player:pl.name});
      fx({k:"ring",x:pl.x,y:pl.y,r:100,color:o.path==="precision"?"#f0cb82":"#80e3d0",life:45});
    } else if(o.kind==="supplies"){
      healPlayer(pl,40,true);st.coins+=20;for(const g of st.gems)g.pull=true;
    } else if (o.kind === "weapon") {
      if (o.id !== charById(pl.charId).weapon) return;
      const w = pl.weapons.find((x) => x.id === o.id);
      if (w) w.lvl = Math.min(6, w.lvl + 1);
      else addWeapon(pl, o.id);
    } else if (o.kind === "technique") {
      const d = (TS.TECHNIQUES[pl.charId] || []).find(m => m.id === o.id);
      if (!d) return;
      if (!pl.techniques) pl.techniques = {};
      if (!pl.techCds) pl.techCds = {};
      pl.techniques[o.id] = Math.min(d.max,(pl.techniques[o.id] || 0)+1);
      pl.techCds[o.id] = Math.min(pl.techCds[o.id] ?? 30,30);
    } else if (o.kind === "passive") {
      pl.passives[o.id] = (pl.passives[o.id] || 0) + 1;
      computeStats(pl);
    } else if (o.kind === "heal") {
      healPlayer(pl, 40, true);
    } else if (o.kind === "coins") {
      st.coins += 25;
    }
  }

  function reroll(playerId) {
    if (!st || st.over || st.choiceKind==="chest" || mode === "guest" || !st.choosing?.[playerId]) return false;
    const p = st.players[playerId];
    if (!p || p.disconnected || !(p.rerolls > 0)) return false;
    p.rerolls--;
    const previous = st.choosing[playerId];
    let choices = buildOptions(p,3);
    const same = list => JSON.stringify(list.map(o=>[o.kind,o.id,o.lvl]).sort());
    for (let i=0;i<4 && same(choices)===same(previous);i++) choices=buildOptions(p,3);
    st.choosing[playerId] = choices;
    if (playerId===localId) emit("levelUp",{options:choices,level:st.level,rerolls:p.rerolls});
    if (mode === "host") emit("netChoices",{[playerId]:choices});
    return true;
  }

  function startChoosing(kind="level") {
    st.choiceKind=kind;st.choosing = {};
    for (const pl of st.players) if (!pl.disconnected) st.choosing[pl.id] = kind==="chest"?chestOptions(pl):buildOptions(pl, 3);
    emit("levelUp", { options: st.choosing[localId], kind, level: st.level, players: st.players.length, rerolls: st.players[localId].rerolls });
    if (mode === "host") emit("netChoices", st.choosing);
  }

  function choose(playerId, index) {
    if (!st || !st.choosing || !st.choosing[playerId]) return;
    if (!Number.isInteger(index) || !st.choosing[playerId][index]) return;
    const opt = st.choosing[playerId][index];
    if(!st.players[playerId].disconnected)applyChoice(st.players[playerId], opt);
    delete st.choosing[playerId];
    if (playerId === localId) emit("chosen", {});
    if (Object.keys(st.choosing).length === 0) {
      st.choosing = null;
      if(st.choiceKind!=="chest")st.pendingLevels=Math.max(0,st.pendingLevels-1);
      nextChoice();
    }
  }

  /* =======================================================
     BUCLE
     ======================================================= */

  function step() {
    if (!st || st.over) return;
    if (st.choosing || paused || st.victoryWait) return;
    for (const f of st.fx) f.t++;
    st.fx = st.fx.filter((f) => f.t < f.life);
    st.t++;st.impacts=0;st.pickupFx=0;
    if (st.t % 60 === 0) for (const e of st.enemies) if (!e.dead) scaleEnemy(e);
    if (st.finalPhase) finalPressure();
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
        if (e.boss || e.siteId!==undefined) continue;
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
    updateSites();
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
    if (!st || st.over) return;
    st.over = true;
    Sfx.stopMusic();
    Sfx.play(victory ? "win" : "die");
    const seconds = Math.floor(st.t / 60);
    const greed = st.players[localId].stats.greed;
    const coins = Math.round((st.coins + st.kills / 8 + seconds / 6 + st.bossesKilled * 60 + (victory || st.won ? 300 : 0)) * greed);
    emit("end", { victory: victory || !!st.won, finalPhase: !!st.finalPhase, finalRound: st.finalRound || 0, endless: !!st.endless && !!st.won, endlessSeconds: st.endless ? Math.floor((st.t - st.endlessStart) / 60) : 0, seconds, kills: st.kills, level: st.level, coins, bosses: st.bossesKilled, evolutions: st.evolutions, abilities: st.abilitiesUsed || 0, props: st.propsBroken, combat: st.players.map(p=>({...p.combat})), chests: st.chests || 0, charId: st.players[localId].charId, map: st.mapId, daily: st.daily, coop: st.players.length > 1 });
  }

  function readInput() {
    if (!controlsEnabled) return { x: 0, y: 0, ab: input.ab };
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
        guestSmooth(dt);
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
    clearInput(); controlsEnabled = false;
    st = null;
  }

  function evolutionInfo(p) {
    const w=p.weapons.find(w=>w.id===charById(p.charId).weapon);
    const evo=w && TS.EVOLUTIONS[w.id];
    if (!evo) return null;
    return {name:evolutionName(w.id,w.path),weapon:L(TS.WEAPONS[w.id].name),level:w.lvl,evolved:!!w.evo,
      passive:L(TS.PASSIVES[evo.passive].name),hasPassive:!!p.passives[evo.passive],
      blocked:!p.passives[evo.passive] && Object.keys(p.passives).length>=TS.MAX_PASSIVES};
  }

  function compassTarget(p) {
    const fallen=st.players.filter(o=>o.down && !o.disconnected && o.id!==p.id);
    const chests=st.pickups.filter(it=>it.kind==="cofre" && !it.taken);
    const candidates=fallen.length?fallen:chests;
    const target=candidates.reduce((best,it)=>!best || dist2(it,p)<dist2(best,p)?it:best,null);
    if (!target || p.down) return null;
    const angle=Math.atan2(target.y-p.y,target.x-p.x);
    return {label:fallen.length?L("Revivir"):L("Cofre"),arrow:["→","↘","↓","↙","←","↖","↑","↗"][(Math.round(angle/(TAU/8))+8)%8],distance:Math.round(Math.sqrt(dist2(target,p))/U)};
  }

  function hudData() {
    const p = st.players[localId];
    const site=(st.sites || []).filter(s=>!s.used || s.activeUntil>st.t).filter(s=>dist2(s,p)<(180*U)**2).sort((a,b)=>dist2(a,p)-dist2(b,p))[0];
    const abDef = TS.ABILITIES[p.charId];
    return {
      site:site?{name:L(TS.SITE_NAMES[site.kind]),kind:site.kind,progress:Math.min(100,Math.round(site.progress/120*100)),activated:site.activated,used:site.used,seconds:Math.ceil(Math.max(0,site.activeUntil-st.t)/60),guards:st.guest?site.remaining:site.guards.filter(id=>st.enemies.some(e=>e.id===id&&!e.dead)).length}:null,
      breach:st.breach?{remaining:st.breach.remaining,total:st.breach.total}:null,
      nextTechnique:(TS.TECHNIQUES[p.charId] || []).find(m=>m.unlock>st.level || m.at>st.t/60) || null,
      techniqueRanks:Object.values(p.techniques || {}).reduce((n,v)=>n+v,0),
      combo:st.comboUntil>st.t?L(st.comboLabel):null,
      streak:p.streak && p.streak.until>st.t?{...p.streak,remaining:(p.streak.until-st.t)/240,highlight:p.streak.flashUntil>st.t}:null,
      loot:p.loot?.until>st.t?p.loot:null,
      combat: p.combat || {}, chests: st.chests || 0,
      evolution: evolutionInfo(p), compass: compassTarget(p),
      inWater: terrain(p.x,p.y)===2,
      nextBossIn: st.finalPhase ? 0 : Math.ceil(Math.min(TS.RUN_SECONDS,...TS.BOSSES.filter(b=>b.id!=="rey").map(b=>b.at*(st.mod?.bossTime || 1)).filter(at=>at>st.t/60))-st.t/60),
      hp: p.hp,
      maxHp: p.stats.maxHp,
      xp: st.xp,
      xpNext: st.xpNext,
      level: st.level,
      seconds: Math.floor(st.t / 60),
      finalPhase: !!st.finalPhase, finalRound: st.finalRound || 0,
      finalIn: Math.max(0, TS.RUN_SECONDS - Math.floor(st.t / 60)),
      kills: st.kills,
      coins: st.coins,
      weapons: p.weapons.map((w) => ({ id: w.id, lvl: w.lvl, evo: !!w.evo, path:w.path || null })),
      techniques: Object.entries(p.techniques || {}).map(([id,lvl]) => {
        const move=TS.TECHNIQUES[p.charId].find(m=>m.id===id);
        return {id,lvl,name:L(move.name),icon:charById(p.charId).weapon,ready:st.guest ? p.techReady?.[id] ?? 0 : clamp(1-(p.techCds?.[id] || 0)/(move.cd*p.stats.cdMul),0,1)};
      }),
      canEvolve: !!evolvable(p),
      passives: Object.entries(p.passives).map(([id, lvl]) => ({ id, lvl })),
      boss: st.boss && TS.ENEMIES[st.boss.type] ? { name: L(TS.ENEMIES[st.boss.type].name) + (st.finalPhase ? ` · ${L("Fase")} ${st.finalRound}` : ""), pct: st.boss.hp / st.boss.maxHp, tactic:L(TS.TACTIC_NAMES[st.boss.tactic] || "") } : null,
      down: p.down,
      name: p.name,
      ability: abDef ? { name: L(abDef.name), pct: st.guest ? p.abPct ?? 1 : 1 - p.abCd / abilityMax(p) } : null,
      players: st.players.map((o) => ({ name: o.name, hp: o.hp, maxHp: o.stats.maxHp, down: o.down, charId: o.charId, disconnected:!!o.disconnected, revivePct:clamp(o.reviveT/150,0,1), reviver:o.reviver ?? null }))
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
    const k = Math.max(1, Math.round((Math.min(w, h) * (Math.min(w, h) < 600 ? 0.16 : 0.11)) / 60)) * dpr;
    view = { w: canvas.width, h: canvas.height, k: k * options.zoom, dpr };
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
    // stickmen: vienen a más resolución y se dibujan suaves
    if (img.res) {
      footY = img.foot;
      scale /= img.res;
      ctx.imageSmoothingEnabled = true;
    }
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
    ctx.imageSmoothingEnabled = false;
  }

  function personImage(set, dir, flash, moving, walkT, atk) {
    const s = set[flash ? `${dir}Flash` : dir];
    if (atk && atk.t > 0) {
      const k = 1 - atk.t / atk.total;
      const n = s.attack.length;
      return s.attack[Math.max(0, Math.min(n - 1, Math.floor(k * n)))];
    }
    if (moving) return s.walk[Math.floor(walkT / 7) % s.walk.length];
    return s.idle;
  }

  function attackOffset(p){
    if(options.reducedMotion || !p.atk || !p.atk.total)return [0,0];
    const n=Math.sin((1-p.atk.t/p.atk.total)*Math.PI)*3;
    return [(p.atk.ax || 0)*n,(p.atk.ay || 0)*n];
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
    if (!options.reducedMotion && p.iframes > 0 && p.iframes % 6 < 3 && !p.flash) ctx.globalAlpha = 0.6;
    const img = personImage(set, p.dir, !options.reducedMotion && p.flash > 6, p.moving, p.walkT, p.atk);
    const [ox,oy]=attackOffset(p);
    drawSprite(img, p.x+ox, p.y+oy, People.OY, p.face < 0);
    ctx.globalAlpha = 1;
    if (terrain(p.x,p.y) === 2) {
      ctx.strokeStyle="#b5e6ff";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.ellipse(p.x,p.y,11+Math.sin(st.t*.15)*2,3,0,0,TAU);ctx.stroke();
      if(mapId==="playa"){const a=Math.sin(p.y/240+st.t/1800)*.8;ctx.beginPath();ctx.moveTo(p.x-16,p.y+10);ctx.lineTo(p.x-16+Math.cos(a)*24,p.y+10+Math.sin(a)*24);ctx.stroke();}
    }
    const evolved=p.weapons.find(w=>w.evo);
    if(evolved && p.atk){ctx.strokeStyle=evolved.path==="dominion"?"#80e3d0":"#f0cb82";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x+(p.atk.ax || 0)*18,p.y-28+(p.atk.ay || 0)*12,8,0,TAU);ctx.stroke();}
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

  function drawEliteBadge(x,y,pct,ground = true,breach = false) {
    const color=breach?"#80e3d0":"#f5cb79";
    if(ground) {ctx.strokeStyle=color;ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(x,y,22,8,0,0,TAU);ctx.stroke();}
    ctx.fillStyle=color;ctx.font="bold 12px sans-serif";ctx.textAlign="center";ctx.fillText("◆",x,y-62);
    ctx.fillStyle="#15252b";ctx.fillRect(x-15,y-55,30,4);
    ctx.fillStyle=color;ctx.fillRect(x-15,y-55,30*clamp(pct || 0,0,1),4);
  }

  function drawEnemyHealth(e,x,y) {
    if(e.boss || e.elite || e.prop || !Number.isFinite(e.hp) || options.healthBars==="off")return;
    const pct=clamp(e.hp/e.maxHp,0,1);
    if(options.healthBars!=="always" && pct>=.999)return;
    ctx.fillStyle="#10212b";ctx.fillRect(Math.round(x-14),Math.round(y),28,5);
    ctx.fillStyle="#fff2cf";ctx.fillRect(Math.round(x-13),Math.round(y+1),26*pct,3);
    ctx.fillStyle="#df7f65";ctx.fillRect(Math.round(x-13),Math.round(y+2),26*pct,2);
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
    if(e.elite) drawEliteBadge(e.x,e.y,e.hp/e.maxHp,true,!!e.breach);
    if(e.relentless){ctx.strokeStyle="#ff512f";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x,e.y,18*(d.scale||1),7*(d.scale||1),0,0,TAU);ctx.stroke();}
    if(e.wetUntil>(st?.t ?? 0)){ctx.fillStyle="#91e9ff";ctx.beginPath();ctx.arc(e.x+12,e.y-48,3,0,TAU);ctx.fill();}
    if(e.type==="guardian"){
      const a=e.guardAngle ?? Math.atan2(e.vy || 0,e.vx || 1);ctx.strokeStyle="#9bcee7";ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(e.x,e.y-20,19,a-.9,a+.9);ctx.stroke();
    }
    if(e.type==="sanador" || e.type==="tirador"){
      ctx.fillStyle=e.type==="sanador"?"#8be7ac":"#ffb4a0";ctx.font="bold 15px sans-serif";ctx.textAlign="center";ctx.fillText(e.type==="sanador"?"+":"⌖",e.x,e.y-62);
    }
    const key = `enemy:${d.sprite || e.type}`;
    const set = Sprites.get(key);
    const scale = (d.scale || 1) * (e.elite ? 1.18 : 1);
    const relentless = !!e.relentless;
    const flash = !options.reducedMotion && (e.flash > 3 || (e.ai === "dash" && e.state === 1 && e.t % 6 < 3) || (e.ai === "kamikaze" && e.state === 1 && e.t % 6 < 3));
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
    drawEnemyHealth(e,e.x,e.y-60*scale);
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
    if(z.type==="dangerLine"){
      ctx.save();ctx.strokeStyle="#ffab97";ctx.lineWidth=3;ctx.setLineDash([8,5]);ctx.beginPath();ctx.moveTo(z.x,z.y);ctx.lineTo(z.tx,z.ty);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(z.tx,z.ty,12,0,TAU);ctx.stroke();ctx.restore();
    }
    if(z.type==="dangerRing"){
      ctx.strokeStyle="#ffab97";ctx.lineWidth=4;ctx.beginPath();ctx.arc(z.x,z.y,z.r,z.gap+z.width/2,z.gap+TAU-z.width/2);ctx.stroke();
      ctx.strokeStyle="#90e9c2";ctx.beginPath();ctx.arc(z.x,z.y,z.r,z.gap-z.width/2,z.gap+z.width/2);ctx.stroke();
    }
    if(z.type==="summon" || z.type==="hazard"){
      const ready=z.type==="hazard" && z.t>=z.warn,r=z.r || 18;
      ctx.save();ctx.globalAlpha=ready?.25:.15;ctx.fillStyle=z.theme==="pools"?"#74ae65":"#b88bdf";ctx.beginPath();ctx.arc(z.x,z.y,r,0,TAU);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle="#ff9c85";ctx.lineWidth=2;ctx.stroke();ctx.restore();
    }
    if (["acid", "perfume"].includes(z.type)) {
      const ready = z.t >= z.warn;
      ctx.save(); ctx.globalAlpha = ready ? .45 : .2;
      ctx.fillStyle = z.type === "perfume" ? "#ff8ed1" : ready ? "#8ce238" : "#caff82";
      ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * .65, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = .8; ctx.strokeStyle = z.type === "perfume" ? "#ffe1f5" : "#d2ff8b"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
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
      case "disc":
        ctx.save(); ctx.translate(z.x, z.y - 12); ctx.rotate(z.ang);
        ctx.strokeStyle = z.gold ? "#ffd23f" : "#64f5ff"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, 0, z.r, z.r * .55, 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = "#e8fbff"; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); break;
      case "flame": {
        ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(z.ang);
        const gradient = ctx.createLinearGradient(0,0,z.len,0);
        gradient.addColorStop(0,"rgba(255,240,180,.65)");
        gradient.addColorStop(.45,"rgba(255,125,35,.42)");
        gradient.addColorStop(1,"rgba(235,60,25,0)");
        ctx.fillStyle=gradient;
        for(let i=0;i<5;i++) {
          const a=(i/4-.5)*z.spread*1.7+Math.sin(z.t*.5+i)*.06;
          const len=z.len*(.78+.18*Math.sin(z.t*.7+i));
          ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(0,0);
          ctx.quadraticCurveTo(len*.6,-len*.18,len,0);
          ctx.quadraticCurveTo(len*.6,len*.18,0,0);ctx.fill();ctx.restore();
        }
        ctx.restore();break;
      }
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
          ctx.strokeStyle = `rgba(${z.ignited?"255,150,75":i % 2 ? "233,196,106" : "246,226,168"},${a * 0.85})`;
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
      case "pickup": {
        ctx.save();ctx.strokeStyle=f.color;ctx.globalAlpha=1-k;ctx.lineWidth=2;
        ctx.beginPath();ctx.ellipse(f.x,f.y-5-k*12,9+k*15,3+k*5,0,0,TAU);ctx.stroke();ctx.restore();break;
      }
      case "impact": {
        ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.ang || 0);ctx.globalAlpha=1-k;ctx.strokeStyle=f.color;ctx.lineWidth=f.big?2.5:1.5;
        const r=(f.big?14:9)*(1+k);ctx.beginPath();ctx.moveTo(-r,-r*.6);ctx.lineTo(r,r*.6);ctx.moveTo(-r,r*.6);ctx.lineTo(r,-r*.6);ctx.stroke();ctx.restore();break;
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
    if(options.contrast){ctx.fillStyle="#081820";ctx.beginPath();ctx.arc(x,y,8,0,TAU);ctx.fill();ctx.strokeStyle="#fff1ca";ctx.lineWidth=1.5;ctx.stroke();}
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

  function drawSites(){
    for(const site of st.sites || []){
      const active=site.activeUntil>st.t;
      ctx.save();ctx.strokeStyle=site.kind==="altar"?"#c9a3ef":"#f0cb82";ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(site.x,site.y,45*U,25*U,0,0,TAU);ctx.stroke();
      if(site.progress>0 && !site.activated){ctx.strokeStyle="#80e3d0";ctx.lineWidth=4;ctx.beginPath();ctx.arc(site.x,site.y,35,-Math.PI/2,-Math.PI/2+Math.min(1,site.progress/120)*TAU);ctx.stroke();}
      if(active){ctx.globalAlpha=.15;ctx.fillStyle="#f0cb82";ctx.beginPath();ctx.ellipse(site.x,site.y,85*U,50*U,0,0,TAU);ctx.fill();ctx.globalAlpha=1;}
      if(site.kind==="lamp"){
        ctx.strokeStyle="#9aadb3";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(site.x,site.y);ctx.lineTo(site.x,site.y-62);ctx.stroke();ctx.fillStyle=active?"#fff0b7":"#687b83";ctx.fillRect(site.x-9,site.y-70,18,13);
      } else if(site.kind==="altar"){
        ctx.fillStyle="#655275";ctx.fillRect(site.x-22,site.y-20,44,20);ctx.fillStyle=site.used?"#80e3d0":"#d7a1f4";ctx.beginPath();ctx.moveTo(site.x,site.y-52);ctx.lineTo(site.x+12,site.y-34);ctx.lineTo(site.x,site.y-23);ctx.lineTo(site.x-12,site.y-34);ctx.fill();
      } else {
        ctx.fillStyle="#d7af71";ctx.beginPath();ctx.moveTo(site.x-25,site.y);ctx.lineTo(site.x,site.y-36);ctx.lineTo(site.x+25,site.y);ctx.fill();ctx.fillStyle="#31494f";ctx.beginPath();ctx.moveTo(site.x-10,site.y);ctx.lineTo(site.x,site.y-22);ctx.lineTo(site.x+10,site.y);ctx.fill();
      }
      ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillStyle="#fff1c8";ctx.fillText(L(TS.SITE_NAMES[site.kind]),site.x,site.y+18);ctx.restore();
    }
  }

  function render() {
    if (!st) return;
    if (use3D) { render3D(); return; }
    const me = st.players[localId];
    const k = view.k;
    const wW = view.w / k;
    const wH = view.h / k;
    cam.x += (me.x - cam.x) * 0.15;
    cam.y += (me.y - 12 - cam.y) * 0.15;
    let sx = 0;
    let sy = 0;
    if (cam.shake > 0) {
      sx = (Math.random() * 2 - 1) * cam.shake;
      sy = (Math.random() * 2 - 1) * cam.shake;
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
    drawSites();
    for (const z of st.zones) drawZoneUnder(z);
    for (const p of st.players) drawAura(p);

    // gemas y objetos
    for (const g of st.gems) {
      if (g.x < left - 10 || g.x > left + wW + 10 || g.y < top - 10 || g.y > top + wH + 10) continue;
      const img = x2(g.v >= 10 ? "fx:gem3" : g.v >= 3 ? "fx:gem2" : "fx:gem1");
      ctx.drawImage(img, Math.round(g.x - 14), Math.round(g.y - 18 + Math.sin((g.t + g.x) * 0.08) * 2));
    }
    for (const it of st.pickups) {
      if (it.x < left-50 || it.x > left+wW+50 || it.y < top-50 || it.y > top+wH+50)continue;
      const img = x2(`icon:${it.kind}`);
      const bob = Math.round(Math.sin(it.t * 0.1) * 2);
      if (it.kind === "cofre") {
        ctx.fillStyle = `rgba(255,210,63,${0.25 + Math.sin(it.t * 0.1) * 0.15})`;
        ctx.beginPath(); ctx.arc(it.x, it.y - 12, 26, 0, TAU); ctx.fill();
        const chest=Sprites.scaled(Sprites.get("icon:cofre"),3);
        ctx.drawImage(chest,Math.round(it.x-chest.width/2),Math.round(it.y-chest.height+6+bob));
      } else ctx.drawImage(img, Math.round(it.x - 14), Math.round(it.y - 24 + bob));
      if(it.kind==="bocadillo" && dist2(it,me)<140**2){ctx.font="bold 9px sans-serif";ctx.textAlign="center";ctx.fillStyle="#c9edb2";ctx.fillText(L("jensalada"),it.x,it.y-32);}
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
    for (const f of st.fx) drawFx(f);

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
    if (input.joy && input.joy.active && !input.joy.pad) {
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
      if (!st || st.over || !controlsEnabled || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      if ((e.code === "Space" || e.code === "KeyE") && !e.repeat) input.ab++;
      input.keys.add(e.code);
    });
    window.addEventListener("keyup", (e) => input.keys.delete(e.code));
    window.addEventListener("blur", clearInput);
    document.addEventListener("visibilitychange", () => { if (document.hidden) clearInput(); });
    window.addEventListener("resize", clearInput);

    touchPad = document.getElementById("touch-pad");
    const begin = (e) => {
      if (e.pointerType === "mouse" || !st || st.over || !controlsEnabled || input.joy) return;
      e.preventDefault();
      const pad = e.currentTarget === touchPad;
      const box = pad ? touchPad.getBoundingClientRect() : null;
      input.joy = { active: true, id: e.pointerId, ox: box ? box.x + box.width / 2 : e.clientX,
        oy: box ? box.y + box.height / 2 : e.clientY, dx: 0, dy: 0, pad };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* puntero ya suelto */ }
      move(e);
    };
    const move = (e) => {
      const j = input.joy;
      if (!j || j.id !== e.pointerId) return;
      let dx = (e.clientX - j.ox) / 40, dy = (e.clientY - j.oy) / 40;
      const length = Math.hypot(dx, dy);
      if (length > 1) { dx /= length; dy /= length; }
      if (length < 0.15) { dx = 0; dy = 0; }
      j.dx = dx; j.dy = dy;
      if (touchPad && j.pad) {
        touchPad.style.setProperty("--stick-x", `${dx * 32}px`);
        touchPad.style.setProperty("--stick-y", `${dy * 32}px`);
      }
    };
    const end = (e) => { if (input.joy && input.joy.id === e.pointerId) clearInput(); };
    for (const target of [canvas, touchPad].filter(Boolean)) {
      target.addEventListener("pointerdown", begin);
      target.addEventListener("pointermove", move);
      for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) target.addEventListener(event, end);
    }
  }

  function clearInput() {
    input.keys.clear(); input.joy = null;
    if (touchPad) {
      touchPad.style.setProperty("--stick-x", "0px");
      touchPad.style.setProperty("--stick-y", "0px");
    }
  }

  function init(el) {
    canvas = el;
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    bindInput();
    // 3D (render3d.js): si el navegador no puede, se queda el dibujo en 2D
    if (!touchOnly() && typeof Render3D !== "undefined" && Render3D.init(canvas, { CHUNK, chunkCanvas, obstaclesNear, mapId: () => mapId })) use3D = true;
  }

  /* =======================================================
     DIBUJO EN 3D (render3d.js) + capa 2D por encima con los números,
     nombres, barras de vida y la flecha del jefe
     ======================================================= */
  let use3D = false;

  function actorOfPlayer(p) {
    let ang;
    if (p.atk && p.atk.t > 0 && p.atk.ax !== undefined) ang = Math.atan2(p.atk.ay, p.atk.ax);
    else if (p.moving && p.moveX !== undefined) ang = Math.atan2(p.moveY, p.moveX);
    else ang = p.ang3 ?? Render3D.angleOf(p.dir, p.face);
    p.ang3 = ang;
    const [ox,oy]=attackOffset(p);
    return { kind: "char", evolution:p.weapons.find(w=>w.evo)?.path || (p.weapons.some(w=>w.evo)?"precision":null), id: p.charId, x: p.x+ox, y: p.y+oy, ang, moving: p.moving, walkT: p.walkT, atk: p.atk, inWater: terrain(p.x,p.y) === 2, flash: !options.reducedMotion && (p.flash > 6 || (p.iframes > 0 && p.iframes % 6 < 3)) };
  }

  function actorOfEnemy(e) {
    const d = TS.ENEMIES[e.type];
    if (!d) return null;
    if (d.prop) return { prop: true, type: e.type, x: e.x, y: e.y, t: e.t, flash: e.flash > 0 };
    const sprite = d.sprite || e.type;
    const scale = (d.scale || 1) * (e.elite ? 1.18 : 1);
    const relentless = !!e.relentless;
    const flash = !options.reducedMotion && (e.flash > 3 || ((e.ai === "dash" || e.ai === "kamikaze") && e.state === 1 && e.t % 6 < 3));
    if (["slime", "slimito", "fantasma", "murcielago"].includes(sprite)) return { creature: true, type: sprite, x: e.x, y: e.y, t: e.t, flash, phased: e.phased, scale, relentless, elite:!!e.elite, breach:!!e.breach, ang: Render3D.angleOf(e.dir || "down", e.face) };
    return { kind: "enemy", role:e.type, wet:e.wetUntil>(st?.t ?? 0), relentless, elite:!!e.elite, breach:!!e.breach, id: sprite, x: e.x, y: e.y, ang: e.type==="guardian"?(e.guardAngle ?? 0):Render3D.angleOf(e.dir || "side", e.face), moving: Math.hypot(e.vx || 0, e.vy || 0) > 0.1, walkT: e.t, atk: e.atk > 0 ? { t: e.atk, total: 18 } : null, flash, scale };
  }

  function render3D() {
    const me = st.players[localId];
    cam.x += (me.x - cam.x) * 0.15;
    cam.y += (me.y - 12 - cam.y) * 0.15;
    const shakeNow = cam.shake;
    if (cam.shake > 0) { cam.shake *= 0.85; if (cam.shake < 0.3) cam.shake = 0; }
    const wH = view.h / view.k;
    const actors = [];
    const R2 = (Math.max(view.w, view.h) / view.k) ** 2;
    for (const e of st.enemies) {
      if ((e.x - cam.x) ** 2 + (e.y - cam.y) ** 2 > R2) continue;
      const a = actorOfEnemy(e);
      if (a) actors.push(a);
    }
    for (const p of st.players) if (!p.down || st.t % 20 < 14) actors.push(actorOfPlayer(p));
    const auras = [];
    const drones = [];
    for (const p of st.players) {
      if (p.down) continue;
      const col = p.weapons.find((w) => w.id === "colonia");
      if (col) auras.push({ x: p.x, y: p.y, r: 44 * TS.WEAPONS.colonia.levels[col.lvl - 1].area * p.stats.area });
      const dr = p.weapons.find((w) => w.id === "dron");
      if (dr) for (const q of dr.drones || []) if (q.x !== undefined) drones.push({ x: q.x, y: q.y + 50, h: 50 + Math.sin(st.t * 0.2) });
    }
    const visible = item => (item.x-cam.x)**2+(item.y-cam.y)**2<R2*1.5;
    Render3D.draw({
      cx: cam.x, cy: cam.y, wH, shake: shakeNow, dark: map.dark || 0, t: st.t,
      sites:st.sites, actors, gems: st.gems.filter(visible), pickups: st.pickups.filter(visible), shots: st.shots.filter((x) => !(x.delay > 0) && visible(x)), eshots: st.eshots.filter(visible),
      zones: st.zones, fx: st.fx, auras, drones, contrast: options.contrast, low: lowFx, reducedMotion:options.reducedMotion
    });
    // capa 2D: números, nombres, barras de vida, flecha del jefe y joystick
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);
    const d = view.dpr;
    const P = (x, y, h) => Render3D.project(x, y, h, view.w, view.h);
    ctx.textAlign = "center";
    for (const f of st.fx) {
      if (f.k !== "num" && f.k !== "text") continue;
      if (f.k === "num" && !options.numbers) continue;
      const k = f.t / f.life;
      const [x, y] = P(f.x, f.y + 20, 30 + k * 14);
      ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      ctx.font = `bold ${Math.round((f.k === "text" ? 13 : f.big ? 17 : 13) * d * 1.15)}px monospace`;
      const txt = f.k === "num" ? String(f.v) : f.text;
      ctx.fillStyle = "#14112b";
      ctx.fillText(txt, x + d, y + d);
      ctx.fillStyle = f.k === "text" ? f.color || "#ffffff" : f.hurt ? "#ff5a5a" : f.big ? "#ffd23f" : "#ffffff";
      ctx.fillText(txt, x, y);
    }
    ctx.globalAlpha = 1;
    for(const it of st.pickups)if(it.kind==="bocadillo" && dist2(it,me)<140**2){
      const [x,y]=P(it.x,it.y,26);ctx.font=`bold ${Math.round(10*d)}px sans-serif`;ctx.textAlign="center";ctx.fillStyle="#c9edb2";ctx.fillText(L("jensalada"),x,y);
    }
    for (const e of st.enemies) if(!e.elite) {
      const [x,y]=P(e.x,e.y,(TS.ENEMIES[e.type]?.scale || 1)*62);
      ctx.save();ctx.translate(x,y);ctx.scale(d,d);drawEnemyHealth(e,0,0);ctx.restore();
    }
    for (const e of st.enemies) if(e.elite) {
      const [x,y]=P(e.x,e.y,0);ctx.save();ctx.translate(x,y);ctx.scale(d,d);drawEliteBadge(0,0,e.hp/e.maxHp,false,!!e.breach);ctx.restore();
    }
    for (const p of st.players) {
      const [x, y] = P(p.x, p.y, 0);
      const pct = clamp(p.hp / p.stats.maxHp, 0, 1);
      ctx.fillStyle = "#14112b";
      ctx.fillRect(Math.round(x - 14 * d), Math.round(y + 6 * d), Math.round(28 * d), Math.round(5 * d));
      ctx.fillStyle = pct > 0.35 ? "#3cc24f" : "#e63946";
      ctx.fillRect(Math.round(x - 13 * d), Math.round(y + 7 * d), Math.round(26 * d * pct), Math.round(3 * d));
      if (p.down) {
        const [hx, hy] = P(p.x, p.y, 30);
        ctx.strokeStyle = "#3cc24f"; ctx.lineWidth = 3 * d;
        ctx.beginPath(); ctx.arc(hx, hy, 22 * d, -Math.PI / 2, -Math.PI / 2 + (p.reviveT / 150) * TAU); ctx.stroke();
      }
      if (st.players.length > 1) {
        const [nx, ny] = P(p.x, p.y, 62);
        ctx.font = `bold ${Math.round(12 * d)}px monospace`;
        ctx.fillStyle = "#14112b"; ctx.fillText(p.name, nx + d, ny + d);
        ctx.fillStyle = p.id === localId ? "#ffd23f" : "#ffffff"; ctx.fillText(p.name, nx, ny);
      }
    }
    if (st.boss && st.boss.x !== undefined) {
      const [bx, by] = P(st.boss.x, st.boss.y, 20);
      if (bx < 0 || by < 0 || bx > view.w || by > view.h) {
        const a = Math.atan2(by - view.h / 2, bx - view.w / 2);
        ctx.save();
        ctx.translate(clamp(bx, 30, view.w - 30), clamp(by, 80, view.h - 30));
        ctx.rotate(a);
        ctx.fillStyle = "#e63946";
        ctx.beginPath(); ctx.moveTo(14 * d, 0); ctx.lineTo(-8 * d, -9 * d); ctx.lineTo(-8 * d, 9 * d); ctx.fill();
        ctx.restore();
      }
    }
    if (input.joy && input.joy.active && !input.joy.pad) {
      const j = input.joy;
      ctx.globalAlpha = 0.35; ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(j.ox * d, j.oy * d, 46 * d, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc((j.ox + j.dx * 40) * d, (j.oy + j.dy * 40) * d, 20 * d, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
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
      p.weapons.map((w) => [w.id, w.lvl, w.evo ? 1 : 0, (w.drones || []).map((d) => [r1(d.x || 0), r1(d.y || 0)]),w.path || null]),
      Object.entries(p.passives), r1(p.stats.area), Math.round((1 - p.abCd / abilityMax(p)) * 100) / 100,
      p.moveX, p.moveY, p.atk ? p.atk.ax : null, p.atk ? p.atk.ay : null, Object.entries(p.techniques || {}), {
        rerolls:p.rerolls, combat:p.combat, streak:p.streak,loot:p.loot, disconnected:!!p.disconnected, reviver:p.reviver ?? null,
        ready:Object.fromEntries((TS.TECHNIQUES[p.charId] || []).map(m=>[m.id,clamp(1-(p.techCds?.[m.id] || 0)/(m.cd*p.stats.cdMul),0,1)]))
      }
    ]);
    const enemies = [];
    for (const e of st.enemies) {
      if (!near2(e.x, e.y)) continue;
      enemies.push([e.id, ENEMY_IDS.indexOf(e.type), r1(e.x), r1(e.y), DIRS.indexOf(e.dir || "side"), e.face, Math.hypot(e.vx, e.vy) > 0.1 ? 1 : 0, e.t & 1023, e.flash, (e.phased ? 1 : 0) | (e.state === 1 ? 2 : 0) | (e.state === 2 ? 4 : 0) | (e.relentless ? 8 : 0) | (e.elite ? 16 : 0) | (e.breach ? 32 : 0) | (e.wetUntil>(st?.t ?? 0)?64:0), e.atk, !e.prop ? Math.max(e.hp > 0 ? .01 : 0,Math.round(e.hp/e.maxHp*100)/100) : 0,{guardAngle:e.guardAngle ?? 0}]);
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
    const pickups = st.pickups.filter((it) => it.kind === "cofre" || near2(it.x, it.y)).map((it) => [r1(it.x), r1(it.y), it.kind]);
    const events = st.events.splice(0, st.events.length).slice(-120);
    return {
      t: st.t, lv: st.level, xp: Math.round(st.xp), xn: st.xpNext, k: st.kills, c: st.coins,
      b: st.boss ? [st.boss.id, st.boss.hp / st.boss.maxHp,st.boss.tactic || null,st.boss.type] : null,
      endless: !!st.endless, endlessStart: st.endlessStart || 0,
      finalPhase: !!st.finalPhase, finalRound: st.finalRound || 0,
      comboLabel:st.comboLabel,comboUntil:st.comboUntil,
      sites:st.sites.map(s=>({...s,guards:[],remaining:s.guards.filter(id=>st.enemies.some(e=>e.id===id&&!e.dead)).length})),
      breach:st.breach?{remaining:st.breach.remaining,total:st.breach.total}:null,
      chests: st.chests || 0, bossTime: st.mod?.bossTime || 1,
      frozen: !!(st.choosing || st.victoryWait || st.over || paused),
      p: players, e: enemies, s: shots, es: eshots, z: zones, g: gems, pk: pickups, ev: events
    };
  }

  // Invitado: prepara un estado vacío para ir rellenando con las fotos
  function startGuest(info) {
    stopDemo();
    enemyMap.clear();
    input.ab = 0; clearInput(); controlsEnabled = true;
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
    if (snap.t < st.t) return; // el canal de juego no garantiza el orden
    const elapsed = snap.t - st.t;
    for (const f of st.fx) f.t += elapsed;
    st.fx = st.fx.filter((f) => f.t < f.life);
    st.endless = !!snap.endless; st.endlessStart = snap.endlessStart || 0;
    st.frozen = !!snap.frozen; st.finalPhase = !!snap.finalPhase; st.finalRound = snap.finalRound || 0;
    st.comboLabel=snap.comboLabel || null;st.comboUntil=snap.comboUntil || 0;
    st.sites=snap.sites || [];
    st.breach=snap.breach || null;
    st.chests=snap.chests || 0; st.mod={bossTime:snap.bossTime || 1};
    st.t = snap.t; st.level = snap.lv; st.xp = snap.xp; st.xpNext = snap.xn; st.kills = snap.k; st.coins = snap.c;
    snap.p.forEach((a, i) => {
      const p = st.players[i];
      if (!p) return;
      if (!p.seen) { p.x = a[0]; p.y = a[1]; p.seen = true; }
      p.tx = a[0]; p.ty = a[1]; p.dir = DIRS[a[2]] || "down"; p.face = a[3]; p.moving = !!a[4]; p.walkT = a[5];
      p.atk = a[6] > 0 ? { t: a[6], total: a[7], ...(a[20] != null && a[21] != null ? { ax: a[20], ay: a[21] } : {}) } : null;
      p.moveX = a[18]; p.moveY = a[19];
      p.techniques = Object.fromEntries(a[22] || []);
      p.streak=a[23]?.streak || {count:0,best:0,until:0,flashUntil:0};p.loot=a[23]?.loot || null;
      p.reviver=a[23]?.reviver ?? null; p.disconnected=!!a[23]?.disconnected; p.rerolls=a[23]?.rerolls ?? 0; p.combat=a[23]?.combat || {}; p.techReady=a[23]?.ready || {};
      p.hp = a[8]; p.stats.maxHp = a[9]; p.down = !!a[10]; p.reviveT = a[11]; p.iframes = a[12]; p.flash = a[13];
      p.weapons = a[14].filter(([id]) => id === charById(p.charId).weapon).map(([id, lvl, evo, drones, path]) => ({ id, lvl, evo: !!evo, path, drones: drones.map(([x, y]) => ({ x, y })) }));
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
      e.wetUntil=flags&64?st.t+30:0;
      e.guardAngle=a[12]?.guardAngle ?? 0;
      e.breach=!!(flags & 32); e.elite=!!(flags & 16); e.hp=a[11] ?? 1; e.maxHp=1;
      e.relentless = !!(flags & 8); e.phased = !!(flags & 1); e.state = flags & 2 ? 1 : flags & 4 ? 2 : 0; e.atk = atk;
      seen.add(id);
      list.push(e);
    }
    for (const id of enemyMap.keys()) if (!seen.has(id)) enemyMap.delete(id);
    st.enemies = list;
    st.boss = snap.b ? { ...(enemyMap.get(snap.b[0]) || {}), type: snap.b[3] || (enemyMap.get(snap.b[0]) || {}).type || "rey", tactic:snap.b[2], hp: snap.b[1], maxHp: 1 } : null;
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
  function guestSmooth(dt) {
    const factor = 1 - Math.pow(0.65, dt / STEP);
    for (const p of st.players) { p.x += (p.tx - p.x) * factor; p.y += (p.ty - p.y) * factor; }
    for (const e of st.enemies) { e.x += (e.tx - e.x) * factor; e.y += (e.ty - e.y) * factor; }
    if (!st.frozen) for (const z of st.zones) z.t = Math.min(z.life, (z.t || 0) + dt / STEP);
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
      actors.push({ type, r: TS.ENEMIES[type].r * U, ai: TS.ENEMIES[type].ai, x: rand(-R * 1.4, R * 1.4), y: rand(-R, R), t: Math.floor(rand(0, 200)), flash: 0, vx: 0, vy: 0, dir: "side", face: 1, atk: 0, slow: 0 });
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
    if (use3D) {
      // el menú de fondo, también en 3D
      const actors = [];
      for (const a of demo.actors) {
        if (a.hero) actors.push({ kind: "char", id: a.charId, x: a.x, y: a.y, ang: Render3D.angleOf(a.dir, a.face), moving: a.moving, walkT: a.walkT, atk: a.atk });
        else { const x = actorOfEnemy(a); if (x) actors.push(x); }
      }
      Render3D.draw({ cx: demo.camX, cy: demo.camY, wH: view.h / view.k, shake: 0, dark: map.dark || 0, t: demo.t, actors, gems: [], pickups: [], shots: [], eshots: [], zones: [], fx: [], auras: [], drones: [] });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, view.w, view.h);
      return;
    }
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
    if (v) clearInput();
  }

  return {
    init,
    resize,
    reroll,
    evolutionName,
    on,
    startDemo,
    stopDemo,
    options,
    setMap,
    snapshot,
    startGuest,
    applySnapshot,
    setInput(id, inp) { if (st && st.players[id]) st.players[id].input = inp; },
    pressAbility() { if (st && !st.over && controlsEnabled) input.ab++; },
    setControlsEnabled(value) { controlsEnabled = value; if (!value) clearInput(); },
    dropPlayer(id) {
      const p = st && st.players[id];
      if (!p) return;
      p.disconnected = true; p.hp = 0; p.down = true; p.input = { x: 0, y: 0, ab: p.abSeen };
      // Resolver también su elección para que el resto pueda continuar.
      if (st.choosing && st.choosing[id]) choose(id, 0);
      p.hp = 0;
    },
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
    difficultyAt,
    terrain,
    hudData,
    loop,
    finish,
    setLocal(id, m) { localId = id; mode = m; }
  };
})();
