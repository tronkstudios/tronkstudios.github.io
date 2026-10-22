"use strict";

/* TronkStudios · survivors/js/people.js
   Personajes en pixel art a partir de un muñeco 3D muy sencillo:
   cabeza, pelo, tronco, brazos, piernas, zapatos y arma son figuras
   (elipsoides, cápsulas y cajas). Para cada píxel se mira qué figura
   queda delante, se ilumina con 5 tonos y se le pone contorno.
   Así el pelo, las gafas y las armas se ven igual de bien desde las
   8 direcciones, y las animaciones (andar, barrido, golpe al suelo,
   apuntar...) funcionan en todas.
   Scripts clásicos (ver docs/adr/0002). */

const People = (() => {
  const { ramp, mix } = Sprites;
  const INK = "#120c24";
  let SC = 1.3; // píxeles por unidad: más alto = sprites más grandes y con más detalle
  const FW = 54; // ancho de cada imagen
  const FH = 64; // alto
  const OX = 27; // pies en (OX, OY)
  const OY = 60;
  const FW0 = FW;
  const FH0 = FH;
  const OX0 = OX;
  const OY0 = OY;
  const TILT = 0.22; // la cámara mira un poco desde arriba
  const CT = Math.cos(TILT);
  const SN = Math.sin(TILT);

  /* ---------- vectores ---------- */
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const vlerp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  const TOWARD = [0, SN, CT]; // hacia la cámara
  const DOWN = [0, -CT, SN]; // hacia abajo en la pantalla
  const LIGHT = norm([-0.55, 0.8, 0.55]);

  function tone(r, i) {
    // Sombreado plano de dibujo animado: brillo, color y sombra
    return i > 0.86 ? r.lt : i > 0.42 ? r.base : i > 0.1 ? r.mid : r.sh;
  }

  // Rampa para pelo: brillos suaves, sombras hondas
  function hairRamp(base) {
    return { hl: mix(base, "#d8b48a", 0.34), lt: mix(base, "#d8b48a", 0.15), base, mid: mix(base, INK, 0.25), sh: mix(base, INK, 0.5) };
  }

  const SKINS = {
    light: ramp("#f2c3a0"),
    dark: ramp("#8a5a3c"),
    zombie: ramp("#8db56a"),
    zombie2: ramp("#a6c96a"),
    bone: ramp("#ece4cf"),
    mask: ramp("#26232c")
  };

  /* =======================================================
     ESCENA: figuras en el espacio del personaje
     (x = su derecha, y = arriba, z = hacia donde mira)
     ======================================================= */

  function basis(yaw) {
    return { R: [-Math.cos(yaw), 0, Math.sin(yaw)], U: [0, 1, 0], F: [Math.sin(yaw), 0, Math.cos(yaw)] };
  }

  function makeScene(yaw) {
    const B = basis(yaw);
    const W = (l) => add(add(mul(B.R, l[0]), mul(B.U, l[1])), mul(B.F, l[2]));
    const prims = [];
    const S = {
      B,
      W,
      prims,
      // Elipsoide con ejes del personaje (o girados con axes)
      ell(c, r, mat, extra = {}) {
        const axes = extra.axes ? extra.axes.map((a) => norm(W(a))) : [B.R, B.U, B.F];
        prims.push({ k: "e", c: W(c), r, axes, mat, mask: extra.mask, lc: c });
      },
      cap(a, b, r, mat, extra = {}) {
        prims.push({ k: "c", a: W(a), b: W(b), r, mat, r2: extra.r2 });
      },
      box(c, axes, h, mat) {
        prims.push({ k: "b", c: W(c), axes: axes.map((a) => norm(W(a))), h, mat });
      }
    };
    return S;
  }

  /* ---------- intersecciones (rayo desde la cámara) ---------- */

  function hitEll(p, O, D) {
    const q = sub(O, p.c);
    const o = [dot(q, p.axes[0]) / p.r[0], dot(q, p.axes[1]) / p.r[1], dot(q, p.axes[2]) / p.r[2]];
    const d = [dot(D, p.axes[0]) / p.r[0], dot(D, p.axes[1]) / p.r[1], dot(D, p.axes[2]) / p.r[2]];
    const A = dot(d, d);
    const Bq = 2 * dot(o, d);
    const C = dot(o, o) - 1;
    const disc = Bq * Bq - 4 * A * C;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    const roots = [(-Bq - sq) / (2 * A), (-Bq + sq) / (2 * A)];
    for (const s of roots) {
      if (s < 0) continue;
      const lp = add(o, mul(d, s));
      if (p.mask && !p.mask(lp, s === roots[1])) continue;
      const n = norm(add(add(mul(p.axes[0], lp[0] / p.r[0]), mul(p.axes[1], lp[1] / p.r[1])), mul(p.axes[2], lp[2] / p.r[2])));
      return { s, n: s === roots[1] ? mul(n, -1) : n, lp, inner: s === roots[1] };
    }
    return null;
  }

  function hitCap(p, ro, rd) {
    const ba = sub(p.b, p.a);
    const oa = sub(ro, p.a);
    const baba = dot(ba, ba);
    const bard = dot(ba, rd);
    const baoa = dot(ba, oa);
    const rdoa = dot(rd, oa);
    const oaoa = dot(oa, oa);
    const r = p.r;
    let t = -1;
    const a = baba - bard * bard;
    if (a > 1e-6) {
      const b = baba * rdoa - baoa * bard;
      const c = baba * oaoa - baoa * baoa - r * r * baba;
      const h = b * b - a * c;
      if (h >= 0) {
        const tt = (-b - Math.sqrt(h)) / a;
        const y = baoa + tt * bard;
        if (y > 0 && y < baba) t = tt;
      }
    }
    if (t < 0) {
      for (const end of [p.a, p.b]) {
        const oc = sub(ro, end);
        const b = dot(rd, oc);
        const c = dot(oc, oc) - r * r;
        const h = b * b - c;
        if (h > 0) {
          const tt = -b - Math.sqrt(h);
          if (tt > 0 && (t < 0 || tt < t)) t = tt;
        }
      }
    }
    if (t < 0) return null;
    const pos = add(ro, mul(rd, t));
    const hh = clamp(dot(sub(pos, p.a), ba) / baba, 0, 1);
    const n = norm(sub(pos, add(p.a, mul(ba, hh))));
    return { s: t, n, t: hh, pos, lp: n };
  }

  function hitBox(p, O, D) {
    let tN = -Infinity;
    let tF = Infinity;
    let nAxis = 0;
    let nSign = 1;
    const o = sub(O, p.c);
    for (let i = 0; i < 3; i++) {
      const ax = p.axes[i];
      const oo = dot(o, ax);
      const dd = dot(D, ax);
      if (Math.abs(dd) < 1e-8) {
        if (Math.abs(oo) > p.h[i]) return null;
        continue;
      }
      let t1 = (-p.h[i] - oo) / dd;
      let t2 = (p.h[i] - oo) / dd;
      let sign = -1;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; sign = 1; }
      if (t1 > tN) { tN = t1; nAxis = i; nSign = sign * Math.sign(dd) * -1 * -1; }
      tF = Math.min(tF, t2);
      if (tN > tF) return null;
    }
    if (tF < 0 || tN < 0) return null;
    const pos = add(O, mul(D, tN));
    const q = sub(pos, p.c);
    const lp = [dot(q, p.axes[0]) / p.h[0], dot(q, p.axes[1]) / p.h[1], dot(q, p.axes[2]) / p.h[2]];
    const n = mul(p.axes[nAxis], lp[nAxis] > 0 ? 1 : -1);
    return { s: tN, n, lp, nSign };
  }

  /* ---------- dibujar la escena ---------- */

  function renderScene(S, dims) {
    const FW = dims ? dims.w : FW0;
    const FH = dims ? dims.h : FH0;
    const OX = dims ? dims.ox : OX0;
    const OY = dims ? dims.oy : OY0;
    const col = new Array(FW * FH).fill(null);
    const dep = new Float32Array(FW * FH).fill(-1e9);
    const grp = new Int16Array(FW * FH).fill(-1);
    const tag = new Int8Array(FW * FH);
    const D = mul(TOWARD, -1);
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        const base = add(mul([1, 0, 0], (x + 0.5 - OX) / SC), mul(DOWN, (y + 0.5 - OY) / SC));
        const O = add(base, mul(TOWARD, 200));
        let best = null;
        let bp = null;
        for (const p of S.prims) {
          const h = p.k === "e" ? hitEll(p, O, D) : p.k === "c" ? hitCap(p, O, D) : hitBox(p, O, D);
          if (!h) continue;
          // En reposo, la cara va siempre por delante del arma
          const pri = S.headFirst && best && ((p.mat.group === G.weapon && bp.mat.group === G.head) || (p.mat.group === G.head && bp.mat.group === G.weapon));
          if (pri) { if (p.mat.group !== G.weapon) { best = h; bp = p; } continue; }
          if (!best || h.s < best.s) { best = h; bp = p; }
        }
        if (!best) continue;
        const i = y * FW + x;
        const out = bp.mat.paint ? bp.mat.paint(best, bp) : { r: bp.mat.r };
        if (!out) continue;
        let light = 0.28 + 0.72 * Math.max(0, dot(best.n, LIGHT));
        if (best.inner) light *= 0.55;
        col[i] = out.c || tone(out.r, clamp(light + (out.bias || 0), 0, 1));
        dep[i] = 200 - best.s;
        grp[i] = bp.mat.group;
        if (out.tag) tag[i] = out.tag;
      }
    }
    // Contornos: por fuera y entre piezas a distinta profundidad
    const outCol = col.slice();
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        const i = y * FW + x;
        const nb = [[0, 1], [-1, 0], [1, 0], [0, -1]];
        if (!col[i]) {
          for (const [dx, dy] of nb) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= FW || yy >= FH) continue;
            const j = yy * FW + xx;
            if (col[j]) { outCol[i] = "#0e0a16"; break; }
          }
          continue;
        }
        for (const [dx, dy] of nb) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= FW || yy >= FH) continue;
          const j = yy * FW + xx;
          if (col[j] && grp[j] !== grp[i] && dep[j] > dep[i] + 1.6) { outCol[i] = mix(col[i], INK, 0.78); break; }
        }
      }
    }
    if (S.glasses) drawGlasses(outCol, tag, S.facing, FW, FH);
    const c = document.createElement("canvas");
    c.width = FW;
    c.height = FH;
    const g = c.getContext("2d");
    const img = g.createImageData(FW, FH);
    for (let i = 0; i < FW * FH; i++) {
      const v = outCol[i];
      if (!v) continue;
      const n = parseInt(v.slice(1), 16);
      img.data[i * 4] = (n >> 16) & 255;
      img.data[i * 4 + 1] = (n >> 8) & 255;
      img.data[i * 4 + 2] = n & 255;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /* Gafas en pixel art dibujadas a mano alrededor de los ojos que se ven:
     montura oscura arriba con puente, lados de 1 píxel, aro de abajo más
     claro, brillo en el cristal y patilla hacia la oreja. */
  function drawGlasses(col, tag, facing, FW, FH) {
    const frame = "#1a1214";
    const lower = "#9a8a88";
    const boxes = [];
    for (const t of [1, 2]) {
      let x0 = FW, x1 = -1, y0 = FH, y1 = -1;
      for (let i = 0; i < FW * FH; i++) {
        if (tag[i] !== t) continue;
        const x = i % FW;
        const y = Math.floor(i / FW);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      if (x1 >= 0) boxes.push({ x0: x0 - 1, x1: x1 + 1, y0, y1: y1 + 1 });
    }
    if (!boxes.length) return;
    const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < FW && y < FH && col[y * FW + x]) col[y * FW + x] = c; };
    const top = Math.min(...boxes.map((b) => b.y0));
    for (const b of boxes) {
      for (let x = b.x0; x <= b.x1; x++) { put(x, top, frame); put(x, b.y1, lower); }
      for (let y = top + 1; y <= b.y1; y++) { put(b.x0, y, lower); put(b.x1, y, lower); }
      put(b.x0 + 1, top + 1, "#f4fdff"); // brillo
    }
    boxes.sort((a, b) => a.x0 - b.x0);
    if (boxes.length === 2) for (let x = boxes[0].x1; x <= boxes[1].x0; x++) put(x, top, frame); // puente
    // patilla hacia atrás (en las vistas de lado y en diagonal)
    if (facing !== 0) {
      const back = facing > 0 ? boxes[0] : boxes[boxes.length - 1];
      const dir = facing > 0 ? -1 : 1;
      const from = facing > 0 ? back.x0 : back.x1;
      for (let k = 1; k <= 3; k++) put(from + dir * k, top, frame);
    }
  }

  /* =======================================================
     MATERIALES
     ======================================================= */

  let groupSeq = 0;
  const G = { body: 1, head: 2, hair: 3, armR: 4, armL: 5, legR: 6, legL: 7, weapon: 8, acc: 9, cape: 10 };
  const mat = (r, group, paint) => ({ r, group, paint });

  const hash = (a, b, c = 0) => {
    let h = (Math.floor(a * 97) * 374761393 + Math.floor(b * 97) * 668265263 + Math.floor(c * 97) * 2147483647) ^ 0x5bf03635;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };

  /* ---------- cabeza y cara ---------- */

  function headMat(o) {
    const s = o.skinR;
    const lash = o.eye || "#2a1d1a";
    const iris = o.iris || "#6a4428";
    const pupil = mix(iris, INK, 0.62);
    const brow = mix(o.hairColor || "#2a1d1a", INK, 0.2);
    const lip = mix(s.mid, "#b0484a", 0.4);
    const blush = mix(s.base, "#ff8a7a", 0.25);
    const frame = "#4a3226";
    return mat(s, G.head, (h) => {
      const [x, y, z] = h.lp;
      if (o.face === "skull") {
        if (z > 0.3) {
          for (const ex of [0.36, -0.36]) if (Math.abs(x - ex) < 0.2 && y > -0.18 && y < 0.18) return { c: Math.abs(x - ex) < 0.08 && y < 0.05 ? "#ff6b3b" : "#1a1020" };
          if (Math.abs(x) < 0.09 && y < -0.2 && y > -0.36) return { c: "#1a1020" };
          if (Math.abs(x) < 0.34 && y < -0.48 && y > -0.62) return { c: Math.floor((x + 1) * 9) % 2 ? "#1a1020" : null, r: s, bias: 0.15 };
        }
        return { r: s };
      }
      if (o.face === "shadow") {
        if (z > 0.3) for (const ex of [0.3, -0.3]) if (Math.abs(x - ex) < 0.12 && Math.abs(y) < 0.1) return { c: "#ff2bd6" };
        return { r: SKINS.mask, bias: -0.3 };
      }
      if (o.face === "mask" || o.face === "wrap") {
        const slit = z > 0.35 && y > -0.2 && y < 0.17 && Math.abs(x) < 0.82;
        if (!slit) return { r: o.face === "wrap" ? ramp(o.shirt) : SKINS.mask };
        for (const ex of [0.36, -0.36]) {
          if (Math.abs(x - ex) < 0.13 && y > -0.12 && y < 0.1) {
            const outer = ex > 0 ? x > ex : x < ex;
            return { c: outer ? "#f4f0e8" : o.eye || "#1a1a1a" };
          }
        }
        return { r: s };
      }
      // Rasgos colocados por ángulo alrededor de la cabeza (az): así se ven
      // de frente, en diagonal y de perfil
      const az = Math.atan2(x, z);
      if (z > -0.1 && !o.noFace) {
        for (const ea of [0.53, -0.53]) {
          const da = az - ea;
          const ad = Math.abs(da);
          const dy = y + 0.04;
          // ojo al estilo Pokémon: pupila oscura de 1 × 2 y un brillo blanco al lado
          if (ad < 0.25 && dy > -0.24 && dy < 0.12) {
            const tag = ea > 0 ? 1 : 2;
            const k = ea > 0 ? da : -da; // > 0 hacia fuera de la cara
            if (k > 0.06) return dy > -0.06 ? { c: "#ffffff", tag } : { r: s, tag };
            return { c: dy > -0.06 ? pupil : mix(pupil, iris, 0.5), tag };
          }
          if (ad < 0.24 && dy > 0.26 && dy < 0.37) return { c: brow };
        }
        if (Math.abs(az) < 0.17 && y > -0.53 && y < -0.42 && z > 0.5) return { c: lip };
        if (!o.beard && !o.stubble && Math.abs(Math.abs(az) - 0.8) < 0.14 && y > -0.38 && y < -0.24) return { c: blush };
      }
      if (o.beard && y < -0.16 && z > -0.25) {
        const mouth = Math.abs(az) < 0.24 && y > -0.58 && y < -0.38;
        if (!mouth) return { r: hairRamp(o.hairColor), bias: hash(x * 3, y * 3, z * 3) > 0.6 ? -0.2 : 0 };
      }
      if (o.stubble && z > -0.2) {
        const chin = y < -0.6 && Math.abs(az) < 0.9;
        const tache = y > -0.42 && y < -0.33 && Math.abs(az) < 0.24;
        const jaw = Math.abs(az) > 0.95 && Math.abs(az) < 1.6 && y < -0.2;
        if (chin || tache || jaw) return { r: ramp(mix(s.base, o.hairColor, hash(x * 9, y * 9, z * 9) > 0.5 ? 0.38 : 0.26)) };
      }
      return { r: s };
    });
  }

  /* ---------- peinados ----------
     Una «concha» de pelo alrededor de la cabeza. En sus coordenadas
     (x a la derecha, y arriba, z hacia la cara, todo entre -1 y 1) se
     decide qué parte tapa: F = línea de la frente, S = a los lados,
     B = por detrás. jag = flequillo a picos; fade = laterales rapados. */
  const HAIR = {
    taper: { k: 1.1, up: 0.05, F: 0.38, S: 0.12, B: -0.62, fade: 0.32, tex: "straight", jag: 0.06 },
    taperLong: { k: 1.1, up: 0.05, F: 0.36, S: 0.12, B: -0.62, fade: 0.32, tex: "straight", quiff: true },
    curly: { k: 1.22, up: 0.1, F: 0.42, S: -0.15, B: -0.55, tex: "curly" },
    longCurly: { k: 1.24, up: 0.1, F: 0.4, S: -0.7, B: -0.95, tex: "curly", mane: true, fe: 0.35 },
    combover: { k: 1.12, up: 0.08, F: 0.5, S: 0.05, B: -0.62, tex: "straight", part: true, swoop: true },
    mullet: { k: 1.16, up: 0.1, F: 0.28, jag: 0.12, S: 0.12, B: -0.5, fade: 0.28, tex: "curly", tail: true },
    spiky: { k: 1.08, up: 0.05, F: 0.42, S: 0.1, B: -0.6, fade: 0.3, tex: "straight", spikes: true },
    mane: { k: 1.3, up: 0.12, F: 0.38, S: -0.62, B: -0.95, tex: "curly", mane: true, fe: 0.35 },
    fluffy: { k: 1.24, up: 0.14, F: 0.2, jag: 0.16, S: 0.24, B: -0.55, fade: 0.36, tex: "curly" },
    ponytail: { k: 1.12, up: 0.05, F: 0.3, jag: 0.08, S: -0.2, B: -0.45, tex: "straight", pony: true },
    afro: { k: 1.5, up: 0.34, F: 0.38, S: -0.05, B: -0.4, tex: "curly" },
    bob: { k: 1.18, up: 0.05, F: 0.24, S: -0.62, B: -0.66, tex: "straight", clip: true, fe: 0.3 },
    ninja: { k: 1.08, up: 0.05, F: 0.42, S: 0.1, B: -0.4, tex: "straight", spikes: true },
    capBack: { k: 1.06, up: 0.02, F: 0.3, S: 0.0, B: -0.6, fade: 0.3, tex: "straight" },
    beanie: { k: 1.07, up: 0.02, F: 0.16, jag: 0.1, S: -0.2, B: -0.45, tex: "straight" },
    hood: { k: 1.08, up: 0.02, F: 0.32, jag: 0.1, S: 0.2, B: 0.2, tex: "straight" },
    zombie: { k: 1.05, up: 0.02, F: 0.48, S: 0.25, B: -0.3, tex: "patchy" }
  };

  function hairLine(h, x, z) {
    const jag = h.jag ? h.jag * (Math.abs(((x * 7.3) % 1 + 1) % 1 - 0.5) * 2) : 0;
    if (z >= 0) return lerp(h.S, h.F - jag, Math.pow(z, h.fe || 0.8));
    return lerp(h.S, h.B, Math.pow(-z, 0.9));
  }

  function hairMat(o, h) {
    const r = hairRamp(o.hairColor);
    const skinMix = ramp(mix(o.hairColor, o.skinR.mid, 0.3));
    return mat(r, G.hair, (hit) => {
      const [x, y, z] = hit.lp;
      let bias = 0;
      if (h.tex === "curly") bias += hash(x * 2.6, y * 2.6, z * 2.6) > 0.62 ? -0.22 : hash(y * 2.6, z * 2.6, x * 2.6) > 0.8 ? 0.18 : 0;
      else if (h.tex === "straight") bias += Math.floor((Math.atan2(x, z) + 4) * 5.5) % 3 === 0 ? -0.16 : 0;
      if (h.part && z > 0 && Math.abs(x + 0.34) < 0.06 && y > 0.4) return { r, bias: 0.4 };
      // laterales rapados (degradado)
      if (h.fade && y < hairLine(h, x, z) + h.fade * 0.6 && (Math.abs(x) > 0.6 || z < -0.3)) return { r: skinMix, bias: bias - 0.05 };
      return { r, bias };
    });
  }

  function hairMask(h) {
    return (lp) => {
      const [x, y, z] = lp;
      if (h.tex === "patchy" && hash(x * 3, y * 3, z * 3) > 0.55) return false;
      return y > hairLine(h, x, z);
    };
  }

  function addHead(S, o, hp) {
    const hc = hp.head; // centro de la cabeza
    const rx = 7.5;
    const ry = 7.1;
    const rz = 7.2;
    S.ell(hc, [rx, ry, rz], headMat(o));
    if (o.face !== "skull") {
      // orejas y nariz
      const ear = mat(o.skinR, G.head);
      S.ell(add(hc, [rx * 0.96, -0.4, -0.4]), [1, 1.6, 1.3], ear);
      S.ell(add(hc, [-rx * 0.96, -0.4, -0.4]), [1, 1.6, 1.3], ear);
      if (!o.noFace && o.face !== "mask" && o.face !== "wrap") S.ell(add(hc, [0, -0.9, rz * 0.96]), [0.8, 1, 0.8], ear);
    }
    const h = HAIR[o.hair];
    if (h) {
      const k = h.k;
      S.ell(add(hc, [0, ry * h.up, 0]), [rx * k, ry * k, rz * k], hairMat(o, h), { mask: hairMask(h) });
      const hm = mat(hairRamp(o.hairColor), G.hair, hairMat(o, { tex: h.tex }).paint);
      if (h.quiff) S.ell(add(hc, [0.4, ry * 0.95, rz * 0.45]), [rx * 0.62, ry * 0.38, rz * 0.5], hm);
      if (h.swoop) S.ell(add(hc, [-1.2, ry * 0.85, rz * 0.5]), [rx * 0.72, ry * 0.36, rz * 0.5], hm);
      if (h.tail) S.ell(add(hc, [0, -ry * 0.75, -rz * 0.72]), [rx * 0.6, ry * 0.75, rz * 0.32], hm);
      if (h.mane) {
        S.ell(add(hc, [0, -ry * 0.9, -rz * 0.62]), [rx * 1.05, ry * 1.15, rz * 0.5], hm);
        for (const sx of [1, -1]) S.cap(add(hc, [sx * rx * 0.86, -ry * 0.1, -rz * 0.35]), add(hc, [sx * rx * 0.9, -ry * 1.35, -rz * 0.45]), 1.8, hm);
      }
      if (h.pony) {
        S.cap(add(hc, [0, ry * 0.25, -rz * 1.05]), add(hc, [0, -ry * 0.95, -rz * 1.45]), 2.1, hm);
        S.ell(add(hc, [0, ry * 0.25, -rz * 1.05]), [1.5, 1.5, 1.5], mat(ramp(o.acc || "#ffd23f"), G.acc));
      }
      if (h.spikes) {
        const sp = [[0, 1], [0.55, 0.85], [-0.55, 0.85], [0.3, 0.6], [-0.3, 0.6], [0, 0.35]];
        for (const [sx, sz] of sp) {
          const base = add(hc, [sx * rx * 0.6, ry * 0.75, (sz - 0.55) * rz * 0.9]);
          const tip = add(hc, [sx * rx * 0.95, ry * 1.38, (sz - 0.55) * rz * 1.3]);
          S.cap(base, vlerp(base, tip, 0.5), 1.7, hm);
          S.cap(vlerp(base, tip, 0.5), tip, 0.9, hm);
        }
      }
      if (h.clip) S.ell(add(hc, [-rx * 0.62, ry * 0.55, rz * 0.62]), [1.2, 1.2, 0.8], mat({ hl: "#fff6c2", lt: "#ffe066", base: "#ffd23f", mid: "#e0a82e", sh: "#b07a1a" }, G.acc));
    }
    addHeadgear(S, o, hc, rx, ry, rz);
  }

  function addHeadgear(S, o, hc, rx, ry, rz) {
    const acc = ramp(o.acc || "#ffffff");
    const shell = (k, up, maskFn, paint, r = acc) => S.ell(add(hc, [0, ry * up, 0]), [rx * k, ry * k, rz * k], mat(r, G.acc, paint ? (h) => paint(h.lp) : null), { mask: maskFn });
    switch (o.hair) {
      case "capBack":
        shell(1.14, 0.03, ([, y]) => y > 0.22, ([x, y, z]) => (z > 0.6 && Math.abs(x) < 0.2 && y > 0.4 && y < 0.62 ? { c: "#ffffff" } : { r: acc, bias: y < 0.32 ? -0.25 : 0 }));
        S.box(add(hc, [0, ry * 0.25, -rz * 1.2]), [[1, 0, 0], [0, 1, 0.15], [0, -0.15, 1]], [3.4, 0.35, 2.6], mat(ramp(mix(o.acc, "#000000", 0.15)), G.acc));
        S.ell(add(hc, [0, ry * 1.17, 0]), [0.8, 0.5, 0.8], mat(acc, G.acc));
        break;
      case "beanie":
        shell(1.17, 0.04, ([, y]) => y > 0.12, ([x, y, z]) => ({ r: acc, bias: y < 0.34 ? (Math.floor((Math.atan2(x, z) + 4) * 6) % 2 ? -0.28 : -0.14) : Math.floor((Math.atan2(x, z) + 4) * 6) % 2 ? -0.08 : 0 }));
        S.ell(add(hc, [0, ry * 1.32, -0.5]), [2, 2, 2], mat(ramp("#f4f8ff"), G.acc, (h) => ({ r: ramp("#f4f8ff"), bias: hash(h.lp[0] * 3, h.lp[1] * 3, h.lp[2] * 3) > 0.6 ? -0.15 : 0 })));
        break;
      case "ninja":
        shell(1.13, 0.02, ([, y]) => y > 0.36 && y < 0.58, ([x, y, z]) => (z > 0.72 && Math.abs(x) < 0.34 ? { r: ramp("#b8c2cf") } : { r: acc }));
        for (const sx of [0.5, -0.5]) S.cap(add(hc, [sx * 0.6, ry * 0.46, -rz * 1.08]), add(hc, [sx * 3.4, -ry * 0.5, -rz * 1.6]), 0.8, mat(acc, G.acc));
        break;
      case "helmet": {
        const body = ramp(o.hairColor);
        const glow = { hl: "#e8ffff", lt: "#9ff8ff", base: o.acc || "#00e5ff", mid: mix(o.acc || "#00e5ff", "#003a4a", 0.3), sh: mix(o.acc || "#00e5ff", "#003a4a", 0.55) };
        shell(1.16, 0.0, ([x, y, z]) => !(z > 0.42 && y < 0.36 && y > -0.72 && Math.abs(x) < 0.72), ([x, y, z]) => (z > 0.36 && y > -0.12 && y < 0.38 && Math.abs(x) < 0.8 ? { r: glow, bias: 0.15 } : { r: body }), body);
        S.ell(add(hc, [0, -0.2, rz * 0.95]), [rx * 0.82, ry * 0.2, 1.2], mat(glow, G.acc, () => ({ r: glow, bias: 0.25 })));
        S.cap(add(hc, [-1.5, ry * 1.1, -1]), add(hc, [-1.8, ry * 1.6, -1.2]), 0.5, mat(ramp("#9aa3b0"), G.acc));
        S.ell(add(hc, [-1.8, ry * 1.65, -1.2]), [0.8, 0.8, 0.8], mat(glow, G.acc));
        break;
      }
      case "hood": {
        const hr = ramp(o.hairColor);
        shell(1.24, 0.02, ([x, y, z]) => !(z > 0.25 && y < 0.42 && Math.abs(x) < 0.8), ([x, y, z]) => ({ r: hr, bias: z > 0.4 && y > 0.3 ? 0.1 : z < -0.3 ? -0.1 : 0 }), hr);
        S.cap(add(hc, [0, -ry * 0.4, -rz * 0.8]), add(hc, [0, -ry * 1.5, -rz * 0.7]), 4.2, mat(hr, G.acc));
        if (o.face === "shadow") S.ell(add(hc, [0, -0.6, rz * 0.4]), [rx * 0.7, ry * 0.65, rz * 0.66], mat(SKINS.mask, G.acc));
        break;
      }
      case "balaclava":
        shell(1.12, 0.03, ([, y]) => y > 0.24, ([, y]) => ({ r: acc, bias: y < 0.34 ? -0.3 : 0 }));
        if (o.beret) S.ell(add(hc, [-0.8, ry * 1.08, -0.4]), [rx * 0.95, ry * 0.32, rz * 0.95], mat(ramp(o.beret), G.acc));
        break;
      case "wrap":
        shell(1.04, 0.0, ([, y]) => y > 0.24 && y < 0.42, () => ({ r: acc }));
        for (const sx of [0.5, -0.5]) S.cap(add(hc, [sx * 0.6, ry * 0.32, -rz * 1.02]), add(hc, [sx * 3.4, -ry * 0.5, -rz * 1.55]), 0.8, mat(acc, G.acc));
        break;
    }
    if (o.crown) {
      const gold = ramp("#ffd23f");
      S.ell(add(hc, [0, ry * 0.98, 0]), [rx * 0.66, ry * 0.2, rz * 0.66], mat(gold, G.acc));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        S.ell(add(hc, [Math.cos(a) * rx * 0.55, ry * 1.25, Math.sin(a) * rz * 0.55]), [0.9, 1.3, 0.9], mat(gold, G.acc));
      }
      S.ell(add(hc, [0, ry * 1.02, rz * 0.66]), [0.8, 0.8, 0.5], mat(ramp("#e63946"), G.acc));
    }
  }

  /* ---------- tronco ---------- */

  function shirtMat(o) {
    let part = "chest";
    const s = o.skinR;
    const c = ramp(o.shirt);
    const white = ramp("#f4f4f4");
    return mat(o.shirtless ? s : c, G.body, (h) => {
      const [x, yy, z] = h.lp;
      // la parte de arriba (pecho) y la de abajo (barriga) en sus propias coordenadas
      part = yy > -0.1 ? "chest" : "belly";
      const y = part === "chest" ? (yy - 0.45) / 0.55 : (yy + 0.55) / 0.45;
      if (o.shirtless) {
        // pecho, abdominales y ombligo
        if (part === "chest") {
          if (z > 0.2 && y < -0.05 && y > -0.35 && Math.abs(x) > 0.12 && Math.abs(x) < 0.8) return { r: s, bias: -0.22 };
          if (z > 0.3 && Math.abs(x) < 0.07) return { r: s, bias: -0.18 };
          if (z < -0.3 && Math.abs(x) < 0.06) return { r: s, bias: -0.2 };
        } else {
          if (z > 0.3 && Math.abs(x) < 0.06) return { r: s, bias: -0.22 };
          if (z > 0.3 && Math.abs(x) < 0.5 && (Math.abs(y - 0.35) < 0.08 || Math.abs(y + 0.05) < 0.08)) return { r: s, bias: -0.2 };
          if (z > 0.5 && Math.abs(x) < 0.1 && Math.abs(y + 0.45) < 0.1) return { r: s, bias: -0.4 };
          if (y < -0.72) return { r: ramp("#cfd3d8") }; // goma del calzoncillo
        }
        return { r: s };
      }
      if (o.sleeveless && part === "chest" && Math.abs(x) > 0.72 && y > 0.15) return { r: s };
      // cuello de la camiseta
      if (part === "chest" && y > 0.72 && z > 0.1 && Math.abs(x) < 0.32) return { r: s, bias: -0.1 };
      switch (o.id) {
        case "ranjay":
          if (part === "chest" && z > 0.4 && Math.abs(Math.abs(x) - 0.18) < 0.06 && y > 0.1) return { r: white };
          if (part === "belly" && z > 0.4 && Math.abs(x) < 0.55 && Math.abs(y - 0.1) < 0.1) return { r: c, bias: -0.2 };
          break;
        case "yant":
          if (z > 0.3 && Math.abs(x) < 0.17 && (part === "chest" || y > -0.2)) return { r: ramp("#d62828") };
          if (part === "chest" && y > 0.55 && z > 0.1 && Math.abs(x) < 0.45) return { r: white };
          break;
        case "toto":
          if (z < -0.35 && part === "chest" && y < 0.55 && y > -0.6) {
            const u = (x + 0.6) * 6;
            const v = (0.55 - y) * 4.4;
            const one = Math.abs(u - 1.5) < 0.6 && v > 0 && v < 5;
            const zero = u > 3 && u < 6 && v > 0 && v < 5 && !(u > 3.8 && u < 5.2 && v > 1 && v < 4);
            if (one || zero) return { r: white };
          }
          if (part === "chest" && y > 0.6) return { r: white };
          break;
        case "bruno":
          if (z > 0.5 && part === "chest" && Math.hypot(x, y + 0.1) < 0.28) return { r: ramp("#d62828") };
          break;
        case "lia":
          if (z > 0.5 && part === "chest" && Math.abs(x) < 0.25 && y < 0.1 && y > -0.35) return { r: white };
          break;
        case "frosti":
          if (Math.abs(y % 0.5) < 0.07) return { r: c, bias: -0.22 };
          if (z > 0.6 && Math.abs(x) < 0.05) return { r: ramp("#5a6b7a") };
          break;
        case "kaito":
          if (part === "chest" && z > 0.4 && Math.abs(x - (0.55 - y) * 0.45) < 0.1) return { r: c, bias: 0.3 };
          if (part === "belly" && y < -0.2 && y > -0.55) return { r: ramp("#e63946") };
          break;
        case "nova":
          if (hash(Math.floor(x * 5), Math.floor(y * 5), Math.floor(z * 5)) > 0.86) return { r: ramp("#ffe066") };
          break;
        case "quizo":
          if (Math.abs(x - y * 0.8) < 0.14) return { r: ramp(o.acc) };
          break;
        case "zeta":
          if ((Math.abs(x) < 0.05 && z > 0) || Math.abs(y + 0.2) < 0.05) return { r: { hl: "#e8ffff", lt: "#9ff8ff", base: "#00e5ff", mid: "#00a6c2", sh: "#006a80" } };
          break;
        case "duna":
          if (part === "belly" && y < -0.2 && y > -0.6) return { r: ramp(o.acc) };
          break;
        case "chambas":
          if (part === "chest" && Math.abs(y + 0.1) < 0.12) return { r: ramp("#1e2a1e") };
          break;
        case "finillos":
          if ((Math.floor((Math.atan2(x, z) + 4) * 7) + Math.floor(y * 6)) % 2 === 0) return { r: c, bias: -0.1 };
          break;
        case "omogos":
          if (part === "chest" && z > 0.5 && Math.abs(x) < 0.05) return { r: white, bias: -0.1 };
          break;
        case "antitronk":
          if (z > 0.35 && Math.abs(x) < 0.62 && part === "chest") return { r: ramp(mix(o.shirt, "#000000", 0.35)), bias: Math.abs(y + 0.2) < 0.12 && Math.abs(x) > 0.15 ? 0.3 : 0 };
          if (o.medals && part === "chest" && z > 0.5 && x > 0.2 && x < 0.55 && y > 0.2 && y < 0.4) return { r: ramp(["#ffd23f", "#e63946", "#3b8bff"][Math.floor((x - 0.2) * 9) % 3]) };
          if (part === "belly" && y < -0.55) return { r: ramp("#151515") };
          break;
        case "zombie":
          if (hash(x * 2, y * 2, z * 2) > 0.78) return { r: s };
          if (hash(y * 3, x * 3, z) > 0.85) return { r: c, bias: -0.3 };
          break;
        case "ninja":
          if (part === "belly" && y < -0.2 && y > -0.55) return { r: ramp(o.acc) };
          break;
      }
      return { r: c };
    });
  }

  function addTorso(S, o, hp) {
    const m = o.muscular ? 1 : 0;
    const t = hp.torso;
    if (o.skeleton) {
      const bone = mat(SKINS.bone, G.body);
      S.cap(add(t, [0, -4, -0.5]), add(t, [0, 4, -0.5]), 0.9, bone);
      for (let i = 0; i < 4; i++) {
        const y = 3 - i * 1.9;
        const w = 4.2 - (i > 2 ? 1 : 0);
        S.ell(add(t, [0, y, 0]), [w, 0.55, 2.8], bone, { mask: ([, , z]) => z > -0.6 });
      }
      S.ell(add(t, [0, -4.6, 0]), [3.4, 1.2, 2.2], bone);
      return;
    }
    if (o.fat) S.ell(add(t, [0, -1, 1]), [8, 7.4, 6.6], shirtMat(o, "torso"));
    else S.ell(add(t, [0, 0, 0]), [5 + m, 5.4, 3 + m * 0.3], shirtMat(o, "torso"));
    S.cap(add(hp.head, [0, -6.5, -0.5]), add(t, [0, 3.5, 0]), 1.6, mat(o.skinR, G.body));
    // cadera
    S.ell(add(t, [0, -5.2, 0]), [4.2 + m * 0.3, 2.2, 2.7], mat(ramp(o.pants), G.body));
    if (o.hoodie) S.ell(add(hp.head, [0, -6.5, -3.4]), [4.2, 1.8, 1.6], mat(ramp(o.shirt), G.body));
    if (o.cape) {
      const cr = ramp(o.cape);
      S.box(add(t, [0, -2.5, -3.6]), [[1, 0, 0], [0, 1, 0.12], [0, -0.12, 1]], [5.6, 8.5, 0.5], mat(cr, G.cape, (h) => ({ r: cr, bias: Math.floor((h.lp[0] + 1) * 3) % 2 ? -0.1 : 0 })));
    }
    if (o.robe) {
      const rr = ramp(o.shirt);
      S.ell(add(t, [0, -8, 0]), [5.6, 8.4, 4.4], mat(rr, G.body, (h) => ({ r: rr, bias: Math.floor((Math.atan2(h.lp[0], h.lp[2]) + 4) * 4) % 2 ? -0.12 : 0 })), { mask: ([, y]) => y < 0.6 });
    }
    if (o.id === "duna") {
      const rr = ramp(o.shirt);
      S.ell(add(t, [0, -6.4, 0]), [4.8, 4.6, 3.4], mat(rr, G.body), { mask: ([, y]) => y < 0.5 });
    }
  }

  /* ---------- brazos y piernas ---------- */

  function addArm(S, o, side, shoulder, hand, grp) {
    const m = o.muscular ? 1 : 0;
    const r = o.skeleton ? 0.75 : 1.3 + m * 0.45;
    const sleeve = o.shirtless || o.sleeveless || o.skeleton ? null : ramp(o.shirt);
    const skin = o.skeleton ? SKINS.bone : o.skinR;
    // codo: un poco hacia fuera y atrás
    const mid = vlerp(shoulder, hand, 0.5);
    const elbow = add(mid, [side * 0.8, 0, -0.8]);
    const upper = sleeve ? mat(sleeve, grp) : mat(skin, grp);
    const lower = sleeve && !o.shortSleeve ? mat(sleeve, grp) : mat(skin, grp);
    S.cap(shoulder, elbow, r + 0.15, upper);
    S.cap(elbow, hand, r, lower);
    if (o.weapon === "guantes" && !o.enemy) {
      const gl = ramp("#d62828");
      S.ell(hand, [2.2, 2.2, 2.4], mat(gl, grp, (h) => (h.lp[1] < -0.55 ? { r: ramp("#f4f4f4") } : { r: gl })));
    } else {
      const k = o.weapon === "punos" ? 1.7 : 1.3;
      S.ell(hand, [k, k, k], mat(skin, grp));
    }
  }

  function addLeg(S, o, hip, foot, grp, lift) {
    const pants = ramp(o.pants);
    const skin = o.skeleton ? SKINS.bone : o.skinR;
    const knee = add(vlerp(hip, foot, 0.5), [0, 0.4 + lift * 0.8, 0.9 + lift * 1.6]);
    const ankle = add(foot, [0, 1.2, -0.3]);
    if (o.skeleton) {
      S.cap(hip, knee, 0.8, mat(skin, grp));
      S.cap(knee, ankle, 0.8, mat(skin, grp));
    } else if (!o.robe) {
      const rr = o.baggy ? 2.3 : 1.75;
      if (o.shorts) {
        S.cap(hip, knee, 2, mat(pants, grp));
        S.cap(knee, ankle, 1.3, mat(skin, grp, (h) => (h.t > 0.55 ? { r: ramp("#f4d35e") } : { r: skin })));
      } else {
        S.cap(hip, knee, rr, mat(pants, grp));
        S.cap(knee, ankle, o.baggy ? 2.5 : 1.6, mat(pants, grp, (h) => ({ r: pants, bias: o.baggy && Math.floor(h.t * 4) % 2 ? -0.12 : 0 })));
      }
    }
    // zapato (o calcetín)
    const shoe = ramp(o.shoes || "#2a2630");
    const sole = ramp(mix(o.shoes || "#2a2630", "#ffffff", 0.55));
    S.ell(add(foot, [0, 0.4, 1]), [1.7, 1.1, 2.5], mat(shoe, grp, (h) => (h.lp[1] < -0.45 && !o.baggy && !o.skeleton ? { r: sole } : { r: shoe })));
  }

  /* =======================================================
     ARMAS en 3D, colgando de la mano (h) con dirección d
     ======================================================= */

  function frameOf(d) {
    const dd = norm(d);
    const ref = Math.abs(dd[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = norm(cross(ref, dd));
    const w = norm(cross(dd, u));
    return { d: dd, u, w };
  }

  function addWeapon(S, id, hand, dir, side = 1) {
    if (!id) return;
    const { d, u, w } = frameOf(dir);
    const P = (a, b = 0, c = 0) => add(add(add(hand, mul(d, a)), mul(u, b)), mul(w, c));
    const M = (hex) => mat(ramp(hex), G.weapon);
    const steel = M("#cfd8e3");
    const wood = M("#8a5a2b");
    const gold = M("#f2c14e");
    const dark = M("#3a3f4a");
    const box = (c, hd, hu, hw, m) => S.box(c, [d, u, w], [hd, hu, hw], m);
    switch (id) {
      case "tajo":
        S.cap(P(-1.6), P(1.4), 0.7, wood);
        box(P(1.9), 0.4, 2.2, 0.6, gold);
        box(P(7.8), 5.6, 0.75, 0.3, mat(ramp("#dfe6ee"), G.weapon, (h) => ({ r: ramp("#dfe6ee"), bias: h.lp[1] > 0.3 ? 0.3 : 0 })));
        break;
      case "katana":
        S.cap(P(-2), P(1.4), 0.6, M("#2a2a35"));
        box(P(1.8), 0.3, 1.5, 1.5, gold);
        box(P(8.6), 6.6, 0.55, 0.28, steel);
        break;
      case "virote": {
        box(P(1.6), 4.6, 0.8, 0.8, wood);
        const bow = M("#3a2a1c");
        for (const sgn of [1, -1]) {
          S.cap(P(5.6), P(5, sgn * 2.8), 0.55, bow);
          S.cap(P(5, sgn * 2.8), P(3.7, sgn * 5), 0.45, bow);
          S.cap(P(3.7, sgn * 5), P(2.2, 0), 0.2, M("#e9e2cf"));
        }
        S.cap(P(2.2), P(7.2), 0.3, M("#8a5a2b"));
        S.cap(P(7.2), P(8.2), 0.4, steel);
        break;
      }
      case "rifle":
        box(P(3.6), 6.6, 0.75, 0.8, dark);
        box(P(-2.4), 1.8, 0.9, 1.4, M("#5a3e2b"));
        box(P(1.5, 0, -1.3), 0.6, 0.6, 1, dark);
        break;
      case "mazazo":
        S.cap(P(-2), P(9.5), 0.7, wood);
        box(P(10.8), 1.6, 3.4, 1.8, mat(ramp("#7a828f"), G.weapon, (h) => ({ r: ramp("#7a828f"), bias: Math.abs(h.lp[1]) > 0.8 ? -0.15 : 0 })));
        break;
      case "estocada":
        S.cap(P(-8), P(13), 0.6, wood);
        box(P(10.8), 0.4, 0.8, 0.8, M("#c1121f"));
        S.cap(P(13), P(16.6), 0.9, steel);
        S.cap(P(16.6), P(18), 0.4, M("#ffffff"));
        break;
      case "rayo":
        S.cap(P(-6), P(10.5), 0.6, M("#2f8c8c"));
        box(P(10.8), 0.45, 3.2, 0.6, gold);
        for (const s of [-2.8, 0, 2.8]) S.cap(P(11, s), P(s === 0 ? 15.5 : 14.2, s), 0.5, gold);
        break;
      case "hacha":
        S.cap(P(-2), P(8.5), 0.7, wood);
        box(P(7.6, 1.8), 1.7, 2, 0.4, mat(ramp("#a8b2bf"), G.weapon, (h) => ({ r: ramp("#a8b2bf"), bias: h.lp[1] > 0.6 ? 0.4 : 0 })));
        break;
      case "petardo":
        box(P(2.2), 2.2, 1.1, 1.1, mat(ramp("#d62828"), G.weapon, (h) => (Math.abs(h.lp[0]) < 0.25 ? { r: ramp("#f1f1f1") } : { r: ramp("#d62828") })));
        S.cap(P(4.4), P(5.6, 0.6), 0.25, M("#5a4030"));
        S.ell(P(5.9, 0.8), [0.6, 0.6, 0.6], M("#ffe066"));
        break;
      case "colonia":
        S.ell(P(2.2), [1.9, 1.9, 1.9], M("#ff8fc8"));
        S.cap(P(3.8), P(4.6), 0.8, gold);
        break;
      case "balon":
        S.ell(P(0.6, 0, 1.2), [2.6, 2.6, 2.6], mat(ramp("#f4f4f4"), G.weapon, (h) => (hash(Math.round(h.lp[0] * 2.4), Math.round(h.lp[1] * 2.4), Math.round(h.lp[2] * 2.4)) > 0.7 ? { r: ramp("#2a2a35") } : { r: ramp("#f4f4f4") })));
        break;
      case "copos":
        S.cap(P(-1), P(7), 0.5, M("#cfe9ff"));
        S.ell(P(8.4), [1.4, 2.2, 1.4], mat(ramp("#7fdcff"), G.weapon, () => ({ r: ramp("#7fdcff"), bias: 0.15 })), { axes: [u, d, w].map((v) => v) });
        break;
      case "kunai":
        box(P(3.4), 2.4, 0.6, 0.25, steel);
        S.cap(P(-0.8), P(1), 0.45, M("#3a3a48"));
        break;
      case "meteoro":
        S.cap(P(-6), P(9.5), 0.6, M("#4a3a6a"));
        S.ell(P(10.8), [1.8, 1.8, 1.8], mat({ hl: "#ffffff", lt: "#fff6c2", base: "#ffe066", mid: "#ffd23f", sh: "#e0a82e" }, G.weapon, () => ({ r: { hl: "#ffffff", lt: "#fff6c2", base: "#ffe066", mid: "#ffd23f", sh: "#e0a82e" }, bias: 0.2 })));
        break;
      case "dron":
        box(P(0.6), 1.4, 1.8, 0.7, dark);
        S.cap(P(1.2, 1.2), P(4, 1.4), 0.25, M("#9aa3b0"));
        break;
      case "tornado": { // báculo del viento: madera oscura y un orbe turquesa con remolinos
        S.cap(P(-6), P(9.5), 0.6, M("#4a2e1a"));
        S.cap(P(9.5, -1.2), P(10.5, -1.6), 0.4, M("#4a2e1a"));
        S.cap(P(9.5, 1.2), P(10.5, 1.6), 0.4, M("#4a2e1a"));
        const wind = { hl: "#ffffff", lt: "#d8fff8", base: "#7fe8d8", mid: "#3cbfb0", sh: "#1f8a80" };
        S.ell(P(11.6), [1.9, 1.9, 1.9], mat(wind, G.weapon, (h) => ({ r: wind, bias: Math.floor((Math.atan2(h.lp[0], h.lp[2]) + h.lp[1] * 2 + 4) * 2.2) % 2 ? 0.25 : -0.1 })));
        break;
      }
      case "tnt":
        for (const s of [-1.2, 0, 1.2]) S.cap(P(-1.5, s, 1.4), P(1.5, s, 1.4), 0.65, mat(ramp("#c1121f"), G.weapon));
        S.ell(P(1.9, 0, 1.6), [0.5, 0.5, 0.5], M("#ffe066"));
        break;
      case "baston":
        S.cap(P(-10), P(10), 0.55, M("#6b4b2b"));
        S.ell(P(11.6), [1.7, 1.7, 1.7], mat({ hl: "#e9ffe0", lt: "#c6ffb8", base: "#7cff6b", mid: "#4ad13a", sh: "#2a9a20" }, G.weapon, () => ({ r: { hl: "#e9ffe0", lt: "#c6ffb8", base: "#7cff6b", mid: "#4ad13a", sh: "#2a9a20" }, bias: 0.2 })));
        break;
    }
  }

  /* =======================================================
     POSTURAS (en el espacio del personaje)
     ======================================================= */

  // Cómo se sujeta el arma al estar quieto o andando
  const HOLD = {
    tajo: { h: [6.6, 13, 2.4], d: [0.15, 0.55, 0.82] },
    katana: { h: [6.6, 13, 2.4], d: [0.15, 0.55, 0.82] },
    virote: { h: [1.4, 17.5, 6], o: [-1.4, 17, 3.6], d: [0, 0, 1], aim: true },
    rifle: { h: [1.4, 17.5, 6], o: [-1.4, 17, 3.2], d: [0, 0, 1], aim: true },
    mazazo: { h: [5.6, 20, 1.6], d: [0.12, 0.55, -0.83] },
    // armas largas apoyadas en el hombro, hacia atrás: no tapan la cara desde ningún lado
    estocada: { h: [8.2, 13.5, -3.4], d: [0.12, 0.99, 0] },
    rayo: { h: [8.2, 13.5, -3.4], d: [0.12, 0.99, 0] },
    meteoro: { h: [8.2, 13.5, -3.4], d: [0.12, 0.99, 0] },
    baston: { h: [8.2, 13.5, -3.4], d: [0.1, 0.99, 0] },
    hacha: { h: [6.4, 13, 1.6], d: [0.1, 0.6, 0.8] },
    copos: { h: [6.4, 13.5, 2], d: [0.1, 0.7, 0.7] },
    petardo: { h: [6.4, 13.2, 1.6], d: [0, 1, 0.2] },
    colonia: { h: [6.4, 13.2, 1.8], d: [0, 1, 0.1] },
    balon: { h: [6.4, 13.2, 1.2], d: [0, 1, 0] },
    kunai: { h: [6.4, 13.2, 1.6], d: [0, -0.4, 0.9] },
    dron: { h: [6.4, 13.6, 2.4], d: [0, 0.3, 1] },
    tornado: { h: [8.2, 13.5, -3.4], d: [0.12, 0.99, 0] },
    tnt: { h: [2, 15.5, 6], o: [-2, 15.5, 6], d: [0, 1, 0] },
    guantes: { h: [5.4, 18.5, 4.6], o: [-5.4, 18.5, 4.6], guard: true },
    punos: { h: [6.4, 12.8, 1.4], o: [-6.4, 12.8, 1.4] }
  };

  /* Ataques: 3 posturas con mano derecha (h), izquierda (o), dirección
     del arma (d) y si ya se ha lanzado (hide). */
  const STYLE = {
    tajo: "swing", katana: "swing", hacha: "throw", mazazo: "slam", virote: "aim", rifle: "aim", estocada: "thrust",
    rayo: "cast", guantes: "punch", punos: "punch", meteoro: "cast", copos: "cast", colonia: "cast", tornado: "cast",
    dron: "cast", baston: "cast", petardo: "throw", balon: "throw", kunai: "throw", tnt: "throw"
  };
  const ATTACK = {
    swing: [
      { h: [6.2, 25, -2.6], d: [0.35, 0.75, -0.55] },
      { h: [3.4, 19, 7], d: [-0.75, 0.05, 0.66] },
      { h: [-4.4, 14, 5.2], d: [-0.65, -0.45, 0.6] }
    ],
    slam: [
      { h: [0.9, 30, -1.2], o: [-0.9, 30, -1.2], d: [0, 0.4, -0.92] },
      { h: [0.9, 26, 4.5], o: [-0.9, 26, 4.5], d: [0, 0.78, 0.62] },
      { h: [0.9, 13, 6.5], o: [-0.9, 13, 6.5], d: [0, -0.62, 0.78] }
    ],
    aim: [
      { h: [1.4, 17.5, 6], o: [-1.4, 17, 3.6], d: [0, 0, 1] },
      { h: [1.4, 17.8, 4.6], o: [-1.4, 17.3, 2.4], d: [0, 0.14, 1] },
      { h: [1.4, 17.5, 5.6], o: [-1.4, 17, 3.2], d: [0, 0.05, 1] }
    ],
    thrust: [
      { h: [4.6, 17, -2.4], d: [0, 0.05, 1] },
      { h: [2, 17, 8.6], d: [0, 0, 1] },
      { h: [3, 17, 5], d: [0, 0, 1] }
    ],
    punch: [
      { h: [3, 20.5, 4.6], o: [-3, 20.5, 4.6] },
      { h: [1, 19.5, 10.5], o: [-3.4, 20.5, 3.6] },
      { h: [3.4, 20.5, 3.6], o: [-1, 19.5, 10.5] }
    ],
    cast: [
      { h: [5.6, 30, 1.2], d: [0, 1, 0.15] },
      { h: [4, 22, 7.6], d: [0, 0.55, 0.84] },
      { h: [5.4, 28, 2.6], d: [0, 0.95, 0.3] }
    ],
    throw: [
      { h: [5.8, 25, -4], d: [0, 1, -0.2] },
      { h: [3, 22, 8], d: [0, 0.3, 1], hide: true },
      { h: [-1, 15, 6], d: [0, -0.5, 1], hide: true }
    ]
  };

  function pose(o, kind, i) {
    const m = o.muscular ? 1 : 0;
    const ph = kind === "walk" ? (i / 4) * Math.PI * 2 : 0;
    const walking = kind === "walk";
    const bob = walking ? Math.abs(Math.cos(ph)) * 0.8 : 0;
    const P = {
      head: [0, 28.2 + bob, 0.2],
      torso: [0, 16.4 + bob, 0],
      shoulderR: [5.2 + m, 19.6 + bob, -0.2],
      shoulderL: [-5.2 - m, 19.6 + bob, -0.2],
      hipR: [2.1, 11 + bob, 0],
      hipL: [-2.1, 11 + bob, 0],
      footR: [2.3, 0.5, 0],
      footL: [-2.3, 0.5, 0],
      liftR: 0,
      liftL: 0,
      handR: [6 + m, 12.6 + bob, 0.8],
      handL: [-6 - m, 12.6 + bob, 0.8],
      weapon: null
    };
    if (walking) {
      const sw = Math.sin(ph);
      P.footR = [2.3, 0.5 + Math.max(0, Math.cos(ph)) * 1.8, sw * 3.6];
      P.footL = [-2.3, 0.5 + Math.max(0, -Math.cos(ph)) * 1.8, -sw * 3.6];
      P.liftR = Math.max(0, Math.cos(ph));
      P.liftL = Math.max(0, -Math.cos(ph));
      P.handR = [6 + m, 12.8 + bob, 0.8 - sw * 2.6];
      P.handL = [-6 - m, 12.8 + bob, 0.8 + sw * 2.6];
    }
    if (o.armsForward) {
      P.handR = [2.4, 18.4 + bob, 9];
      P.handL = [-2.4, 18 + bob, 8.6];
      return P;
    }
    const hold = HOLD[o.weapon];
    const style = STYLE[o.weapon];
    const up = (v) => [v[0], v[1] + bob, v[2]];
    if (kind === "attack" && style) {
      const a = ATTACK[style][i];
      P.handR = a.h;
      if (a.o) P.handL = a.o;
      if (!a.hide && a.d) P.weapon = { hand: a.h, d: a.d };
      if (style === "punch") P.weapon = null;
      return P;
    }
    if (hold) {
      P.handR = up(hold.h);
      if (hold.o) P.handL = up(hold.o);
      if (hold.d) P.weapon = { hand: P.handR, d: hold.d };
    }
    return P;
  }

  function personFrame(o, yaw, kind, i) {
    const S = makeScene(yaw);
    S.glasses = !!o.glasses;
    S.facing = yaw < 0.1 ? 0 : 1;
    S.headFirst = false;
    const P = pose(o, kind, i);
    addLeg(S, o, P.hipR, P.footR, G.legR, P.liftR);
    addLeg(S, o, P.hipL, P.footL, G.legL, P.liftL);
    addTorso(S, o, P);
    addArm(S, o, 1, P.shoulderR, P.handR, G.armR);
    addArm(S, o, -1, P.shoulderL, P.handL, G.armL);
    addHead(S, o, P);
    if (P.weapon) addWeapon(S, o.weapon, P.weapon.hand, P.weapon.d);
    return renderScene(S);
  }

  /* =======================================================
     JUEGOS COMPLETOS
     ======================================================= */

  // 5 vistas; las de la izquierda son el espejo de las de la derecha
  const VIEWS = { down: 0, downSide: Math.PI / 4, side: Math.PI / 2, upSide: (Math.PI * 3) / 4, up: Math.PI };

  function silhouette(c) {
    return Sprites.silhouette(c);
  }

  function personSet(o) {
    const set = {};
    for (const [name, yaw] of Object.entries(VIEWS)) {
      const idle = personFrame(o, yaw, "idle", 0);
      const walk = [0, 1, 2, 3].map((i) => personFrame(o, yaw, "walk", i));
      const attack = [0, 1, 2].map((i) => personFrame(o, yaw, "attack", i));
      set[name] = { idle, walk, attack };
      set[`${name}Flash`] = { idle: silhouette(idle), walk: walk.map(silhouette), attack: attack.map(silhouette) };
    }
    return set;
  }

  function characterOptions(ch) {
    return {
      ...ch,
      skinR: SKINS[ch.skin] || SKINS.light,
      sleeveless: ch.id === "eledemak",
      shortSleeve: ["bruno", "chambas", "toto", "lia", "omogos"].includes(ch.id),
      shorts: ch.id === "toto",
      hoodie: ch.id === "ranjay",
      cape: ch.id === "quizo" ? ch.acc : null,
      iris: { lia: "#2a7a4a", frosti: "#2a6fb8", nova: "#7a3ab8", yant: "#3a6aa8" }[ch.id]
    };
  }

  const ENEMIES = {
    zombi: { id: "zombie", enemy: true, skinR: SKINS.zombie, hair: "zombie", hairColor: "#2a2a22", shirt: "#5c6b73", pants: "#3d3b4f", shoes: "#2a2630", eye: "#7a1010", iris: "#ff3b3b", armsForward: true, shortSleeve: true },
    corredor: { id: "zombie", enemy: true, skinR: SKINS.zombie2, hair: "zombie", hairColor: "#3a2a1c", shirt: "#c44536", pants: "#34324a", shoes: "#2a2630", eye: "#7a1010", iris: "#ff3b3b", armsForward: true, sleeveless: true },
    casco: { id: "zombie", enemy: true, skinR: SKINS.zombie, hair: "capBack", hairColor: "#2a2a22", acc: "#f2c14e", shirt: "#e07a1f", pants: "#2f3b55", shoes: "#3a2a1c", eye: "#7a1010", iris: "#ff3b3b", armsForward: true },
    bomba: { id: "zombie", enemy: true, skinR: SKINS.zombie, hair: "zombie", hairColor: "#2a2a22", shirt: "#3a3a3a", pants: "#2a2a35", shoes: "#2a2630", eye: "#7a1010", iris: "#ff3b3b", weapon: "tnt", shortSleeve: true },
    antitronk: { id: "antitronk", enemy: true, skinR: SKINS.light, face: "mask", hair: "balaclava", hairColor: "#26232c", acc: "#4b5540", shirt: "#3a4232", pants: "#2a2f25", shoes: "#141414", weapon: "rifle" },
    supremo: { id: "antitronk", enemy: true, skinR: SKINS.light, face: "mask", hair: "balaclava", hairColor: "#26232c", acc: "#3a1a1a", beret: "#a61b1b", medals: true, shirt: "#2b2f3a", pants: "#1f2228", shoes: "#141414", weapon: "rifle" },
    ninja: { id: "ninja", enemy: true, skinR: SKINS.light, face: "wrap", hair: "wrap", hairColor: "#3b1f5c", acc: "#e63946", shirt: "#3b1f5c", pants: "#311a4d", shoes: "#141414", weapon: "katana" },
    maestro: { id: "ninja", enemy: true, skinR: SKINS.light, face: "wrap", hair: "wrap", hairColor: "#151515", acc: "#ffd23f", shirt: "#1a1a1f", pants: "#141418", shoes: "#0d0d0d", weapon: "katana", eye: "#c1121f" },
    esqueleto: { id: "skeleton", enemy: true, skinR: SKINS.bone, face: "skull", hair: null, hairColor: "#ece4cf", shirt: "#ece4cf", pants: "#ece4cf", shoes: "#d9d2bd", skeleton: true, weapon: "tajo" },
    brujo: { id: "brujo", enemy: true, skinR: SKINS.mask, face: "shadow", noFace: true, hair: "hood", hairColor: "#4a148c", acc: "#2a0a5a", shirt: "#4a148c", pants: "#2a0a5a", shoes: "#1a1a22", robe: true, weapon: "baston" },
    gordo: { id: "zombie", enemy: true, fat: true, muscular: true, skinR: SKINS.zombie, hair: "zombie", hairColor: "#2a2a22", shirt: "#8a6f5a", pants: "#3d3b4f", shoes: "#2a2630", eye: "#7a1010", iris: "#ff3b3b", armsForward: true, sleeveless: true },
    rey: { id: "zombie", enemy: true, skinR: SKINS.zombie, hair: "zombie", hairColor: "#2a2a22", crown: true, cape: "#a61b1b", shirt: "#5a1a2a", pants: "#2a1f3a", shoes: "#2a2630", eye: "#a07a00", iris: "#ffd23f", armsForward: true }
  };

  /* ---------- criaturas (moco, fantasma, murciélago) ---------- */
  function eyesPaint(r, eye = "#14112b", gap = 0.42, size = 0.17) {
    return (h) => {
      const [x, y, z] = h.lp;
      if (z > 0.3) for (const ex of [gap, -gap]) {
        if (Math.abs(x - ex) < size && Math.abs(y - 0.15) < size * 1.6) return { c: Math.abs(x - ex) < size * 0.45 && y > 0.2 ? "#ffffff" : eye };
      }
      return { r };
    };
  }

  function creatureFrame(kind, f) {
    const S = makeScene(Math.PI / 4);
    if (kind === "slime" || kind === "slimito") {
      const k = kind === "slime" ? 1 : 0.62;
      const sq = f ? 0.78 : 1;
      const r = ramp(kind === "slime" ? "#5fd16b" : "#a6e36b");
      S.ell([0, 6.2 * k * sq, 0], [9.5 * k / Math.sqrt(sq), 7 * k * sq, 8.5 * k / Math.sqrt(sq)], mat(r, G.body, eyesPaint(r)));
      S.ell([-3 * k, 10.5 * k * sq, 2 * k], [1.6 * k, 1.2 * k, 1 * k], mat(ramp("#f4ffe8"), G.acc));
    } else if (kind === "fantasma") {
      const r = ramp("#eef4ff");
      S.ell([0, 22, 0], [8.5, 9, 7.5], mat(r, G.body, eyesPaint(r, "#1a1630", 0.36, 0.2)));
      S.ell([0, 13, -0.5], [8, 9, 7], mat(r, G.body), { mask: ([x, y, z]) => y > -0.5 - (Math.floor((Math.atan2(x, z) + 4) * 2.5 + f) % 2) * 0.35 });
    } else if (kind === "murcielago") {
      const r = ramp("#4a3360");
      const wing = ramp("#6b4a8a");
      S.ell([0, 22, 0], [3.8, 3.8, 3.4], mat(r, G.body, eyesPaint(r, "#ff3b3b", 0.4, 0.2)));
      for (const sx of [1, -1]) {
        S.ell([sx * 2, 26.4, -0.4], [0.9, 1.6, 0.8], mat(r, G.body));
        const up = f ? -0.6 : 0.5;
        S.box([sx * 7, 22 + up * 4, -0.5], [[1, up * sx, 0], [-up * sx, 1, 0], [0, 0, 1]], [5, 0.5, 2.6], mat(wing, G.acc, (h) => ({ r: wing, bias: Math.abs(h.lp[2]) > 0.6 ? -0.2 : 0 })));
      }
    }
    return renderScene(S);
  }

  /* ---------- árboles, rocas y troncos del mapa ---------- */
  function sceneryFrame(kind, seed = 1) {
    const S = makeScene(0);
    const rnd = (i) => hash(seed * 7.1 + i, seed * 3.3 - i, i * 1.7);
    const leaf = (base) => {
      const r = ramp(base);
      return mat(r, G.body, (h) => ({ r, bias: hash(h.lp[0] * 3.2, h.lp[1] * 3.2, h.lp[2] * 3.2) > 0.6 ? -0.25 : hash(h.lp[1] * 4, h.lp[2] * 4, h.lp[0] * 4) > 0.85 ? 0.2 : 0 }));
    };
    const bark = mat(ramp("#7a5232"), G.legR, (h) => ({ r: ramp("#7a5232"), bias: Math.floor((Math.atan2(h.lp[0], h.lp[2]) + 4) * 3) % 2 ? -0.15 : 0 }));
    let dims = { w: 96, h: 120, ox: 48, oy: 112 };
    if (kind === "arbol" || kind === "pino") {
      S.cap([0, 0, 0], [0, 20, 0], 4.2, bark);
      S.ell([0, 1, 0], [6, 2, 5], bark);
      if (kind === "arbol") {
        const green = ["#3f8a3a", "#4a9a40", "#357a35"][Math.floor(rnd(1) * 3)];
        S.ell([0, 36, 0], [20, 15, 18], leaf(green));
        S.ell([-12, 30, 4], [11, 10, 10], leaf(green));
        S.ell([12, 30, 3], [11, 10, 10], leaf(green));
        S.ell([3, 46, -2], [12, 9, 11], leaf(green));
        if (rnd(2) > 0.5) for (let i = 0; i < 4; i++) S.ell([(rnd(10 + i) - 0.5) * 30, 28 + rnd(20 + i) * 18, 14], [1.4, 1.4, 1.2], mat(ramp("#e63946"), G.acc)); // manzanas
      } else {
        const green = "#2f6b3a";
        for (let i = 0; i < 4; i++) S.ell([0, 18 + i * 9, 0], [17 - i * 3.6, 6.5, 15 - i * 3.2], leaf(green));
        S.ell([0, 56, 0], [3, 5, 3], leaf(green));
      }
    } else if (kind === "roca" || kind === "rocaGrande") {
      const big = kind === "rocaGrande";
      const r = ramp(["#8f96a3", "#9a9286", "#7f8794"][Math.floor(rnd(3) * 3)]);
      const m = mat(r, G.body, (h) => ({ r, bias: hash(h.lp[0] * 2.5, h.lp[1] * 2.5, h.lp[2] * 2.5) > 0.72 ? -0.25 : 0 }));
      const k = big ? 1.6 : 1;
      S.ell([0, 6 * k, 0], [12 * k, 8 * k, 10 * k], m);
      S.ell([6 * k, 4 * k, 5 * k], [7 * k, 5 * k, 6 * k], m);
      S.ell([-7 * k, 3 * k, 3 * k], [6 * k, 4 * k, 5 * k], m);
      if (rnd(4) > 0.5) S.ell([-2 * k, 12 * k, 2 * k], [6 * k, 2.2 * k, 5 * k], leaf("#4a8a3a")); // musgo
      dims = { w: 80, h: 60, ox: 40, oy: 50 };
    } else if (kind === "tronco") {
      S.cap([-14, 4, 0], [14, 4, 0], 4.4, bark);
      S.ell([14, 4, 0], [1.2, 4.2, 4.2], mat(ramp("#c9a27c"), G.acc));
      S.ell([-3, 9, 1], [2.4, 1.2, 2], leaf("#4a9a40"));
      dims = { w: 80, h: 40, ox: 40, oy: 32 };
    } else if (kind === "tumba") {
      const st = ramp(["#8f96a3", "#9a9690", "#828a96"][Math.floor(rnd(5) * 3)]);
      const m = mat(st, G.body, (h) => ({ r: st, bias: hash(h.lp[0] * 3, h.lp[1] * 3, h.lp[2] * 3) > 0.75 ? -0.25 : 0 }));
      S.box([0, 11, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [8, 10, 2.4], m);
      S.ell([0, 21, 0], [8, 4, 2.4], m, { mask: ([, y]) => y > 0 });
      S.box([0, 15, 2.5], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [1, 4.5, 0.3], mat(ramp("#5d6370"), G.acc));
      S.box([0, 16.5, 2.5], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [3.4, 1, 0.3], mat(ramp("#5d6370"), G.acc));
      S.box([0, 0.6, 3], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [10, 0.8, 4], mat(ramp("#5a4a3a"), G.legR));
      dims = { w: 50, h: 64, ox: 25, oy: 54 };
    } else if (kind === "cruz") {
      const w = mat(ramp("#7a5a3a"), G.body);
      S.box([0, 12, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [1.6, 12, 1.6], w);
      S.box([0, 17, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [7, 1.6, 1.6], w);
      S.ell([0, 0.5, 1], [5, 1.2, 3], mat(ramp("#5a4a3a"), G.legR));
      dims = { w: 40, h: 64, ox: 20, oy: 56 };
    } else if (kind === "arbolMuerto") {
      const dead = mat(ramp("#5a4636"), G.body, (h) => ({ r: ramp("#5a4636"), bias: Math.floor((Math.atan2(h.lp[0], h.lp[2]) + 4) * 3) % 2 ? -0.15 : 0 }));
      S.cap([0, 0, 0], [0, 26, 0], 3.6, dead);
      S.cap([0, 18, 0], [-11, 30, 2], 1.8, dead);
      S.cap([0, 22, 0], [10, 34, -2], 1.6, dead);
      S.cap([-11, 30, 2], [-15, 36, 2], 1, dead);
      S.cap([10, 34, -2], [13, 40, -1], 0.9, dead);
      S.cap([0, 26, 0], [2, 40, 1], 1.4, dead);
    } else if (kind === "palmera") {
      const trunk = mat(ramp("#a8824a"), G.legR, (h) => ({ r: ramp("#a8824a"), bias: Math.floor(h.t * 8) % 2 ? -0.18 : 0 }));
      S.cap([0, 0, 0], [3, 18, 0], 3, trunk);
      S.cap([3, 18, 0], [6, 36, 0], 2.6, trunk);
      const leafM = (base) => mat(ramp(base), G.body, (h) => ({ r: ramp(base), bias: Math.abs(h.lp[2]) > 0.5 ? -0.2 : 0 }));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        S.cap([6, 37, 0], [6 + Math.cos(a) * 14, 33, Math.sin(a) * 12], 2.2, leafM(i % 2 ? "#3f9a3a" : "#4aaa44"));
        S.cap([6 + Math.cos(a) * 14, 33, Math.sin(a) * 12], [6 + Math.cos(a) * 19, 27, Math.sin(a) * 16], 1.4, leafM("#3f9a3a"));
      }
      for (const [x, z] of [[4, 2], [7, 2], [6, -1]]) S.ell([x, 34.5, z], [1.5, 1.5, 1.5], mat(ramp("#6b4a2a"), G.acc));
    } else if (kind === "sombrilla") {
      S.cap([0, 0, 0], [0, 24, 0], 0.8, mat(ramp("#f4f4f4"), G.legR));
      const um = mat(ramp("#e63946"), G.body, (h) => ({ r: ramp(Math.floor((Math.atan2(h.lp[0], h.lp[2]) + 4) * 1.9) % 2 ? "#e63946" : "#f4f4f4") }));
      S.ell([0, 24, 0], [15, 5, 15], um, { mask: ([, y]) => y > -0.1 });
      dims = { w: 80, h: 80, ox: 40, oy: 70 };
    } else if (kind === "farola") {
      const metal = mat(ramp("#3a3f4a"), G.body);
      S.cap([0, 0, 0], [0, 34, 0], 1.2, metal);
      S.cap([0, 34, 0], [5, 37, 0], 1, metal);
      S.ell([5, 36, 0], [2.6, 1.6, 2.6], mat({ hl: "#ffffff", lt: "#fff6c2", base: "#ffe9a3", mid: "#ffd66b", sh: "#e0b040" }, G.acc, () => ({ r: { hl: "#ffffff", lt: "#fff6c2", base: "#ffe9a3", mid: "#ffd66b", sh: "#e0b040" }, bias: 0.3 })));
      S.ell([0, 1, 0], [3, 1.4, 3], metal);
      dims = { w: 50, h: 100, ox: 25, oy: 92 };
    } else if (kind === "contenedor") {
      const g = ["#2f7a3a", "#3b5a9a", "#9a6a2a"][Math.floor(rnd(7) * 3)];
      S.box([0, 8, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [11, 8, 7], mat(ramp(g), G.body, (h) => ({ r: ramp(g), bias: Math.floor((h.lp[0] + 1) * 5) % 2 ? -0.1 : 0 })));
      S.box([0, 16.5, -0.5], [[1, 0, 0], [0, 1, 0.25], [0, -0.25, 1]], [11.5, 0.8, 7.5], mat(ramp(g), G.acc));
      dims = { w: 72, h: 56, ox: 36, oy: 46 };
    } else if (kind === "coche") {
      const g = ["#c1121f", "#2a63c2", "#e9c46a", "#f4f4f4"][Math.floor(rnd(8) * 4)];
      const body = mat(ramp(g), G.body);
      S.box([0, 6, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [18, 4, 8], body);
      S.box([-1, 12, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [10, 3, 7], mat(ramp("#9fd8ff"), G.acc, (h) => (Math.abs(h.lp[0]) > 0.86 || Math.abs(h.lp[2]) > 0.86 ? { r: ramp(g) } : { r: ramp("#9fd8ff") })));
      for (const [x, z] of [[-11, 8], [11, 8], [-11, -8], [11, -8]]) S.ell([x, 2.6, z], [3, 3, 1.4], mat(ramp("#1a1a22"), G.legR), { axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] });
      S.ell([18, 6, 5], [0.5, 1.2, 1.4], mat(ramp("#fff6c2"), G.acc));
      S.ell([18, 6, -5], [0.5, 1.2, 1.4], mat(ramp("#fff6c2"), G.acc));
      dims = { w: 110, h: 60, ox: 55, oy: 50 };
    } else if (kind === "banco") {
      const wood = mat(ramp("#9a6a3a"), G.body, (h) => ({ r: ramp("#9a6a3a"), bias: Math.floor((h.lp[2] + 1) * 3) % 2 ? -0.12 : 0 }));
      const metal = mat(ramp("#3a3f4a"), G.legR);
      S.box([0, 6, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [14, 0.8, 4], wood);
      S.box([0, 11, -3.6], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [14, 3, 0.6], wood);
      for (const x of [-12, 12]) { S.box([x, 3, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0.8, 3, 3.6], metal); }
      dims = { w: 80, h: 44, ox: 40, oy: 36 };
    } else if (kind === "arbusto") {
      S.ell([0, 7, 0], [12, 8, 10], leaf("#4a9a40"));
      S.ell([-8, 5, 3], [7, 6, 6], leaf("#3f8a3a"));
      S.ell([8, 5, 2], [7, 6, 6], leaf("#3f8a3a"));
      for (let i = 0; i < 3; i++) S.ell([(rnd(30 + i) - 0.5) * 18, 6 + rnd(40 + i) * 8, 9], [1.2, 1.2, 1], mat(ramp(rnd(50) > 0.5 ? "#ff7eb6" : "#ffe066"), G.acc));
      dims = { w: 64, h: 44, ox: 32, oy: 36 };
    }
    // el mapa va con píxeles el doble de grandes (estilo PokeSurvivor)
    const k = 0.5;
    const keep = SC;
    SC = keep * k;
    const out = renderScene(S, { w: Math.ceil(dims.w * k), h: Math.ceil(dims.h * k), ox: Math.round(dims.ox * k), oy: Math.round(dims.oy * k) });
    SC = keep;
    return out;
  }

  function creatureSet(kind) {
    const frames = [creatureFrame(kind, 0), creatureFrame(kind, 1)];
    return { frames, flash: frames.map(silhouette) };
  }

  return { sceneryFrame, creatureSet, personSet, personFrame, characterOptions, ENEMIES, VIEWS, FW, FH, OX, OY, STYLE };
})();
