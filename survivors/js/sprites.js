"use strict";

/* TronkStudios · survivors/js/sprites.js
   Todo el pixel art de Tronk Survivors se dibuja aquí, píxel a píxel.
   - Cada parte del cuerpo (piernas, tronco, brazos, cabeza, pelo, arma)
     se pinta en su propia capa con sombreado de volumen (luz arriba a
     la izquierda) y un contorno de color (un tono oscuro de su propio
     color, no negro). Luego las capas se juntan en orden.
   - Las personas se dibujan en people.js (muñeco 3D → pixel art).
   Scripts clásicos (ver docs/adr/0002). */

const Sprites = (() => {
  const W = 32;
  const H = 40;
  const INK = "#120c24";
  const COOL = "#2b1d52";
  const WARM = "#fff4d6";

  /* ---------- color ---------- */
  function rgb(hex) {
    if (hex.startsWith("rgb")) return hex.match(/\d+/g).slice(0, 3).map(Number);
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  function mix(a, b, t) {
    const A = rgb(a);
    const B = rgb(b);
    return "#" + A.map((c, i) => Math.round(c + (B[i] - c) * t).toString(16).padStart(2, "0")).join("");
  }
  // Rampa de 5 tonos: la sombra tira a morado y la luz a amarillo
  function ramp(base) {
    return {
      hl: mix(base, WARM, 0.42),
      lt: mix(base, WARM, 0.18),
      base,
      mid: mix(base, COOL, 0.22),
      sh: mix(base, COOL, 0.44)
    };
  }
  // Rampa del pelo: brillos más suaves y sombras más hondas
  function hairRamp(base) {
    return {
      hl: mix(base, "#d8b48a", 0.34),
      lt: mix(base, "#d8b48a", 0.15),
      base,
      mid: mix(base, INK, 0.25),
      sh: mix(base, INK, 0.5)
    };
  }
  function tone(r, i) {
    return i > 0.82 ? r.hl : i > 0.6 ? r.lt : i > 0.36 ? r.base : i > 0.16 ? r.mid : r.sh;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Luz de una esfera / elipse
  function sphereI(x, y, cx, cy, rx, ry) {
    const nx = (x + 0.5 - cx) / rx;
    const ny = (y + 0.5 - cy) / ry;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    return clamp(0.42 - 0.42 * nx - 0.5 * ny + 0.32 * nz, 0, 1);
  }

  /* ---------- lienzos ---------- */
  function canvas(w = W, h = H) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function painter(c) {
    const g = c.getContext("2d", { willReadFrequently: true });
    const P = (x, y, color) => {
      if (!color) return;
      g.fillStyle = color;
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    };
    const rect = (x, y, w, h, color) => {
      g.fillStyle = color;
      g.fillRect(Math.round(x), Math.round(y), w, h);
    };
    const filled = (x, y) => g.getImageData(Math.round(x), Math.round(y), 1, 1).data[3] > 0;
    const inE = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
    // Elipse con color por píxel (fn) y condición (when)
    const ell = (cx, cy, rx, ry, color, when) => {
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
        for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
          if (inE(x, y, cx, cy, rx, ry) && (!when || when(x, y))) P(x, y, typeof color === "function" ? color(x, y) : color);
        }
      }
    };
    const line = (x0, y0, x1, y1, color) => {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      for (let i = 0; i <= steps; i++) P(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, color);
    };
    // Barra gruesa con sombreado de cilindro (brazos, piernas, mangos)
    const limb = (x0, y0, x1, y1, w, r, rampAt) => {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len2 = dx * dx + dy * dy || 1;
      const len = Math.sqrt(len2);
      let nx = -dy / len;
      let ny = dx / len;
      if (nx * -0.6 + ny * -0.8 < 0) { nx = -nx; ny = -ny; } // normal hacia la luz
      const half = w / 2;
      for (let y = Math.floor(Math.min(y0, y1) - half - 1); y <= Math.max(y0, y1) + half + 1; y++) {
        for (let x = Math.floor(Math.min(x0, x1) - half - 1); x <= Math.max(x0, x1) + half + 1; x++) {
          const px = x + 0.5 - x0;
          const py = y + 0.5 - y0;
          const t = clamp((px * dx + py * dy) / len2, 0, 1);
          const ox = px - dx * t;
          const oy = py - dy * t;
          if (Math.hypot(ox, oy) <= half) {
            const side = (ox * nx + oy * ny) / half;
            const c = rampAt ? rampAt(t, x, y) : r;
            P(x, y, tone(c, clamp(0.45 + side * 0.4, 0, 1)));
          }
        }
      }
    };
    return { g, P, rect, ell, line, limb, inE, filled };
  }

  // Contorno de color: un tono muy oscuro del píxel vecino
  function ink(c, strength = 0.72) {
    const g = c.getContext("2d", { willReadFrequently: true });
    const { width: w, height: h } = c;
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    const out = g.createImageData(w, h);
    out.data.set(d);
    const dark = rgb(INK);
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : (y * w + x) * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = at(x, y);
        if (d[i + 3] > 20) continue;
        let n = -1;
        for (const [ax, ay] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
          const j = at(x + ax, y + ay);
          if (j >= 0 && d[j + 3] > 20) { n = j; break; }
        }
        if (n < 0) continue;
        for (let k = 0; k < 3; k++) out.data[i + k] = Math.round(d[n + k] + (dark[k] - d[n + k]) * strength);
        out.data[i + 3] = 255;
      }
    }
    g.putImageData(out, 0, 0);
    return c;
  }

  function layer(draw) {
    const c = canvas();
    draw(painter(c));
    return ink(c);
  }

  function compose(layers, w = W, h = H) {
    const c = canvas(w, h);
    const g = c.getContext("2d");
    for (const l of layers) if (l) g.drawImage(l, 0, 0);
    return c;
  }

  function silhouette(c, color = "#ffffff") {
    const s = canvas(c.width, c.height);
    s.res = c.res;
    s.foot = c.foot;
    const g = s.getContext("2d");
    g.drawImage(c, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, s.width, s.height);
    return s;
  }

  function scaled(c, k) {
    // los stickmen vienen dibujados a más resolución (res): se dejan al mismo tamaño
    const r = c.res || 1;
    const s = canvas(Math.round((c.width / r) * k), Math.round((c.height / r) * k));
    const g = s.getContext("2d");
    g.imageSmoothingEnabled = r > 1;
    g.drawImage(c, 0, 0, s.width, s.height);
    return s;
  }

  // Giro exacto de 90° (sin perder píxeles)
  function rotate(c, quarter) {
    let src = c;
    for (let q = 0; q < quarter; q++) {
      const s = canvas(src.height, src.width);
      const g = s.getContext("2d");
      g.translate(s.width, 0);
      g.rotate(Math.PI / 2);
      g.drawImage(src, 0, 0);
      src = s;
    }
    return src;
  }

  const SKINS = { light: ramp("#f2c3a0"), zombie: ramp("#8db56a"), bone: ramp("#ece4cf") };

  /* =======================================================
     ENEMIGOS SIN FORMA HUMANA (2 imágenes, mirando a la derecha)
     ======================================================= */

  function bat(frame) {
    const c = canvas(22, 16);
    const p = painter(c);
    const body = ramp("#4a3360");
    const wing = ramp("#6b4a8a");
    const up = frame === 0;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 8; i++) {
        const x = 11 + s * (3 + i);
        const yTop = up ? 6 - i * 0.6 : 7 + i * 0.4;
        const len = 4 - Math.abs(i - 3) * 0.6 + (i === 7 ? -1 : 0);
        for (let k = 0; k < len; k++) p.P(x, yTop + k, k === 0 ? wing.lt : i % 3 === 2 && k === Math.ceil(len) - 1 ? null : wing.mid);
      }
    }
    p.ell(11, 8, 3.4, 3.2, (x, y) => tone(body, sphereI(x, y, 10, 7, 3.4, 3.2)));
    p.P(9, 4, body.base); p.P(13, 4, body.base); p.P(9, 5, body.lt); p.P(13, 5, body.mid);
    p.P(10, 8, "#ff3b3b"); p.P(12, 8, "#ff3b3b"); p.P(11, 10, "#ffffff");
    return ink(c);
  }

  function slime(frame, small) {
    const c = canvas(22, 18);
    const p = painter(c);
    const r = ramp(small ? "#a6e36b" : "#5fd16b");
    const sq = frame === 1 ? 0.8 : 1;
    const ry = 6 * sq;
    const rx = 8 / Math.sqrt(sq);
    const cy = 16 - ry;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 22; x++) {
      const inside = ((x + 0.5 - 11) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 || (y + 0.5 > cy && y < 16 && Math.abs((x + 0.5 - 11) / rx) <= 1);
      if (inside) p.P(x, y, tone(r, sphereI(x, y, 9, cy - 2, rx, ry + 2)));
    }
    p.ell(8, cy - ry * 0.45, 1.6, 1.2, "#f4ffe8");
    p.P(13, cy, "#ffffff"); p.P(14, cy, "#14112b"); p.P(16, cy, "#ffffff"); p.P(17, cy, "#14112b");
    p.P(14, cy + 2.5, r.sh); p.P(15, cy + 3, r.sh); p.P(16, cy + 2.5, r.sh);
    return ink(c);
  }

  function ghost(frame) {
    const c = canvas(22, 24);
    const p = painter(c);
    const r = ramp("#eef4ff");
    p.ell(11, 9, 7, 7, (x, y) => tone(r, sphereI(x, y, 9, 6, 7, 8)));
    for (let y = 9; y < 19; y++) for (let x = 4; x < 18; x++) {
      if (y > 16 && (x + frame * 2) % 4 > 1) continue;
      p.P(x, y, tone(r, sphereI(x, y, 9, 6, 7.5, 12)));
    }
    p.rect(12, 7, 2, 3, "#1a1630"); p.rect(15, 7, 2, 3, "#1a1630"); p.P(12, 7, "#5a5a8a");
    p.ell(14.5, 12.5, 1.4, 1.8, "#1a1630");
    return ink(c);
  }

  function fatZombie(frame) {
    const c = canvas(36, 38);
    const p = painter(c);
    const s = SKINS.zombie;
    const pants = ramp("#3d3b4f");
    const lx = frame === 0 ? [11, 23] : [13, 21];
    p.limb(13, 26, lx[0], 33, 5, pants); p.limb(22, 26, lx[1], 33, 5, pants);
    for (const fx of lx) p.ell(fx + 1, 34, 3, 1.6, (x, y) => tone(ramp("#2a2630"), sphereI(x, y, fx, 33, 3, 2)));
    p.ell(18, 20, 11, 10, (x, y) => tone(s, sphereI(x, y, 15, 16, 11, 10)));
    p.ell(18, 15, 10.5, 5, (x, y) => tone(ramp("#8a6f5a"), sphereI(x, y, 15, 13, 10.5, 5)), (x, y) => y < 19);
    p.P(18, 22, s.sh); p.P(19, 22, s.sh); p.P(14, 24, s.mid); p.P(22, 18, s.mid);
    p.ell(19, 7, 5, 4.6, (x, y) => tone(s, sphereI(x, y, 18, 6, 5, 4.6)));
    p.P(21, 6, "#ff3b3b"); p.P(23, 6, "#ff3b3b"); p.P(21, 9, "#2a1a1a"); p.P(22, 9, "#f2f2f2"); p.P(23, 9, "#2a1a1a");
    p.limb(28, 15, 33, 14, 4, s); p.limb(8, 16, 4, 20, 4, s);
    return ink(c);
  }

  /* =======================================================
     ICONOS (14 × 14) de armas y objetos
     ======================================================= */

  function icon(draw) {
    const c = canvas(14, 14);
    draw(painter(c));
    return ink(c, 0.8);
  }

  const ICONS = {
    tajo: (p) => { p.line(2, 11, 10, 3, "#e6edf5"); p.line(3, 11, 11, 3, "#8a96a8"); p.P(11, 2, "#ffffff"); p.line(1, 9, 4, 12, "#f2c14e"); p.P(1, 12, "#8a5a2b"); },
    virote: (p) => { p.line(1, 11, 10, 2, "#8a5a2b"); p.P(11, 1, "#e6edf5"); p.P(10, 1, "#e6edf5"); p.P(11, 2, "#e6edf5"); p.P(1, 10, "#e63946"); p.P(2, 12, "#e63946"); },
    mazazo: (p) => { p.line(4, 12, 8, 6, "#8a5a2b"); p.rect(4, 1, 8, 5, "#6b7380"); p.rect(4, 1, 8, 1, "#9aa3b0"); },
    estocada: (p) => { p.line(1, 12, 10, 3, "#8a5a2b"); p.P(11, 2, "#e6edf5"); p.P(12, 1, "#ffffff"); p.P(10, 2, "#e6edf5"); p.P(11, 3, "#8a96a8"); },
    guantes: (p) => { p.ell(7, 6, 5, 4.6, (x, y) => tone(ramp("#d62828"), sphereI(x, y, 5, 4, 5, 4.6))); p.rect(4, 10, 6, 2, "#f2f2f2"); },
    punos: (p) => { p.ell(7, 7, 4.6, 4.2, (x, y) => tone(SKINS.light, sphereI(x, y, 5, 5, 4.6, 4.2))); for (const x of [4, 6, 8, 10]) p.P(x, 4, "#c48a6a"); p.P(1, 6, "#ffe066"); p.P(1, 9, "#ffe066"); p.P(0, 7, "#fff6c2"); },
    hacha: (p) => { p.line(3, 12, 7, 3, "#8a5a2b"); p.rect(7, 1, 4, 5, "#9aa3b0"); p.rect(11, 2, 1, 3, "#e6edf5"); },
    rayo: (p) => { p.line(8, 0, 3, 6, "#ffe066"); p.line(3, 6, 9, 6, "#ffe066"); p.line(9, 6, 4, 13, "#ffe066"); p.P(6, 6, "#ffffff"); },
    petardo: (p) => { p.rect(3, 4, 5, 8, "#d62828"); p.rect(3, 4, 1, 8, "#ff6b6b"); p.rect(3, 7, 5, 1, "#f2f2f2"); p.line(6, 3, 8, 1, "#3a2a1c"); p.P(9, 0, "#ffd23f"); },
    colonia: (p) => { p.ell(6, 8, 4, 4.4, (x, y) => tone(ramp("#ff8fc8"), sphereI(x, y, 5, 6, 4, 4.4))); p.rect(5, 2, 3, 2, "#f2c14e"); p.P(10, 1, "#b7f27b"); p.P(11, 3, "#b7f27b"); },
    balon: (p) => { p.ell(7, 7, 5.4, 5.4, (x, y) => ((x * 2 + y) % 5 === 0 ? "#2a2a35" : tone(ramp("#f4f4f4"), sphereI(x, y, 5, 5, 5.4, 5.4)))); },
    copos: (p) => { p.line(7, 1, 7, 13, "#c8f2ff"); p.line(1, 7, 13, 7, "#c8f2ff"); p.line(2, 2, 12, 12, "#7fdcff"); p.line(12, 2, 2, 12, "#7fdcff"); p.P(7, 7, "#ffffff"); },
    kunai: (p) => { p.line(2, 11, 9, 4, "#e6edf5"); p.line(3, 11, 10, 4, "#8a96a8"); p.P(10, 3, "#ffffff"); p.P(1, 12, "#e63946"); p.P(2, 12, "#e63946"); },
    meteoro: (p) => { p.ell(9, 5, 3.6, 3.6, (x, y) => tone(ramp("#ff8a1f"), sphereI(x, y, 8, 4, 3.6, 3.6))); p.line(1, 12, 6, 7, "#ff6b3b"); p.line(2, 12, 7, 7, "#ffd23f"); },
    dron: (p) => { p.rect(4, 6, 6, 3, "#2b2f38"); p.P(6, 7, "#00e5ff"); p.P(7, 7, "#00e5ff"); p.rect(1, 4, 4, 1, "#9aa3b0"); p.rect(9, 4, 4, 1, "#9aa3b0"); p.line(10, 9, 12, 12, "#ff3b6b"); },
    tornado: (p) => { for (let i = 0; i < 5; i++) p.rect(2 + i, 1 + i * 2.3, 10 - i * 2, 2, i % 2 ? "#e9c46a" : "#f6e2a8"); },
    corazon: (p) => { p.ell(4.5, 5, 3, 3, "#e63946"); p.ell(9.5, 5, 3, 3, "#e63946"); for (let y = 6; y < 13; y++) for (let x = y - 5; x <= 18 - y; x++) p.P(x, y, "#e63946"); p.P(3, 3, "#ff9aa2"); p.P(4, 3, "#ff9aa2"); },
    zapatillas: (p) => { p.rect(2, 6, 7, 4, "#f1f1f1"); p.rect(2, 9, 11, 2, "#3b8bff"); p.rect(9, 8, 3, 1, "#f1f1f1"); p.P(4, 7, "#e63946"); p.P(5, 7, "#e63946"); },
    iman: (p) => { p.rect(2, 2, 3, 8, "#e63946"); p.rect(9, 2, 3, 8, "#e63946"); p.rect(2, 9, 10, 3, "#e63946"); p.rect(2, 1, 3, 2, "#e6edf5"); p.rect(9, 1, 3, 2, "#e6edf5"); },
    musculo: (p) => { p.rect(2, 6, 10, 2, "#6b7380"); p.rect(0, 3, 3, 8, "#2b2f38"); p.rect(11, 3, 3, 8, "#2b2f38"); },
    reloj: (p) => { p.ell(7, 7, 5.6, 5.6, (x, y) => (Math.hypot(x - 6.5, y - 6.5) > 4.2 ? "#f2c14e" : "#fff6e0")); p.line(7, 7, 7, 3, "#14112b"); p.line(7, 7, 10, 7, "#14112b"); },
    escudo: (p) => { for (let y = 1; y < 13; y++) { const half = y < 7 ? 5.5 : 12.5 - y; for (let x = Math.round(7 - half); x < 7 + half; x++) p.P(x, y, x < 7 ? "#3b8bff" : "#2a63c2"); } p.P(5, 4, "#ffffff"); },
    tirita: (p) => { p.rect(1, 5, 12, 4, "#f4c7a1"); p.rect(5, 5, 4, 4, "#e9b48a"); p.P(6, 6, "#c48a5e"); p.P(7, 7, "#c48a5e"); },
    lupa: (p) => { p.ell(5.5, 5.5, 4, 4, (x, y) => (Math.hypot(x - 5, y - 5) > 2.6 ? "#6b7380" : "#bfefff")); p.line(9, 9, 12, 12, "#8a5a2b"); },
    trebol: (p) => { for (const [x, y] of [[7, 3.5], [3.5, 7], [10.5, 7], [7, 7]]) p.ell(x, y, 2.6, 2.6, "#3cc24f"); p.line(7, 9, 8, 13, "#2a8a3a"); },
    libro: (p) => { p.rect(2, 2, 9, 10, "#8c1c2b"); p.rect(3, 3, 7, 8, "#b5313f"); p.rect(11, 3, 1, 9, "#f2ecdc"); p.rect(4, 5, 5, 1, "#f2c14e"); },
    clon: (p) => { p.rect(1, 3, 7, 8, "#e6edf5"); p.rect(5, 1, 7, 8, "#ffffff"); p.rect(6, 3, 5, 1, "#8a96a8"); p.rect(6, 5, 5, 1, "#8a96a8"); },
    calavera: (p) => { p.ell(7, 6, 5, 4.6, (x, y) => tone(SKINS.bone, sphereI(x, y, 5, 4, 5, 4.6))); p.rect(4, 9, 6, 3, SKINS.bone.mid); p.rect(4, 5, 2, 2, "#1a1020"); p.rect(8, 5, 2, 2, "#1a1020"); p.P(5, 11, "#1a1020"); p.P(7, 11, "#1a1020"); },
    moneda: (p) => { p.ell(7, 7, 5.6, 5.6, (x, y) => (Math.hypot(x - 6.5, y - 6.5) > 4.4 ? "#c98a12" : "#ffd23f")); p.rect(6, 4, 2, 6, "#c98a12"); p.P(4, 4, "#fff6c2"); },
    cofre: (p) => { p.rect(1, 5, 12, 7, "#8a5a2b"); p.rect(1, 2, 12, 4, "#a8702f"); p.rect(1, 6, 12, 1, "#f2c14e"); p.rect(6, 5, 3, 3, "#f2c14e"); },
    bocadillo: (p) => { p.rect(1, 4, 12, 2, "#e9b45a"); p.rect(1, 6, 12, 1, "#e63946"); p.rect(1, 7, 12, 1, "#7fd16b"); p.rect(1, 8, 12, 2, "#e9b45a"); }
  };

  /* =======================================================
     SUELO Y DECORADO
     ======================================================= */

  function seeded(seed) {
    let x = seed >>> 0 || 1;
    return () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return ((x >>> 0) % 10000) / 10000;
    };
  }

  function groundTile(seed = 7, base = "#3f6b3a", light = "#4a7a41", dark = "#375f33", flowers = 6, dirt = false) {
    const c = canvas(64, 64);
    const p = painter(c);
    const rnd = seeded(seed);
    p.rect(0, 0, 64, 64, base);
    if (dirt) for (let i = 0; i < 9; i++) p.ell(rnd() * 64, rnd() * 64, 4 + rnd() * 6, 2 + rnd() * 3, rnd() < 0.5 ? "#6b5a3a" : "#5e4f33");
    for (let i = 0; i < 300; i++) p.P(Math.floor(rnd() * 64), Math.floor(rnd() * 64), rnd() < 0.5 ? light : dark);
    for (let i = 0; i < 34; i++) {
      const x = Math.floor(rnd() * 62);
      const y = Math.floor(rnd() * 61) + 2;
      p.P(x, y, "#5c9150"); p.P(x + 1, y - 1, "#6fa35d"); p.P(x + 2, y, "#5c9150"); p.P(x + 1, y + 1, "#2f5a2c");
    }
    for (let i = 0; i < flowers; i++) {
      const x = Math.floor(rnd() * 60) + 2;
      const y = Math.floor(rnd() * 60) + 2;
      const col = ["#f2e86d", "#ffffff", "#ff9fd0", "#9fd0ff"][i % 4];
      p.P(x, y, col); p.P(x - 1, y, col); p.P(x + 1, y, col); p.P(x, y - 1, col); p.P(x, y, "#ffd23f");
    }
    return c;
  }

  // Manchas grandes del suelo con borde irregular (hierba clara, tierra, flores)
  function patch(seed, colors, w = 180, h = 110) {
    const c = canvas(w, h);
    const p = painter(c);
    const rnd = seeded(seed);
    const blobs = [];
    for (let i = 0; i < 7; i++) blobs.push([w / 2 + (rnd() - 0.5) * w * 0.55, h / 2 + (rnd() - 0.5) * h * 0.45, w * (0.16 + rnd() * 0.14), h * (0.18 + rnd() * 0.16)]);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = 0;
        for (const [bx, by, rx, ry] of blobs) v = Math.max(v, 1 - ((x - bx) / rx) ** 2 - ((y - by) / ry) ** 2);
        // borde difuminado a cuadros
        if (v > 0.18 || (v > 0 && (x + y) % 2 === 0 && v > 0.05)) p.P(x, y, colors[(Math.floor(rnd() * 100) % 7 === 0 ? 1 : 0) + (v > 0.5 && rnd() < 0.08 ? 2 : 0)] || colors[0]);
      }
    }
    return c;
  }

  const DECOR = {
    tumba: () => { const c = canvas(16, 18); const p = painter(c); const st = ramp("#8f96a3"); p.ell(7.5, 6, 5, 5, (x, y) => tone(st, sphereI(x, y, 6, 4, 5, 6)), (x, y) => y < 6); p.rect(3, 5, 10, 9, st.base); p.rect(11, 5, 2, 9, st.mid); p.rect(3, 5, 1, 9, st.lt); p.rect(6, 6, 4, 1, st.sh); p.rect(7, 5, 2, 5, st.sh); p.rect(1, 14, 14, 2, "#4a3a2a"); return ink(c); },
    cruz: () => { const c = canvas(14, 18); const p = painter(c); const w = ramp("#7a5a3a"); p.limb(7, 2, 7, 14, 2, w); p.limb(3, 6, 11, 6, 2, w); p.rect(3, 14, 8, 2, "#4a3a2a"); return ink(c); },
    arbusto: () => { const c = canvas(20, 15); const p = painter(c); const g = ramp("#4f8a45"); for (const [x, y, r] of [[6, 8, 4.4], [11, 6, 5], [14.5, 9, 3.8]]) p.ell(x, y, r, r, (xx, yy) => tone(g, sphereI(xx, yy, x - 1.5, y - 2, r, r))); p.P(10, 4, "#e63946"); p.P(6, 6, "#e63946"); return ink(c); },
    roca: () => { const c = canvas(16, 12); const p = painter(c); const r = ramp("#9aa1ac"); p.ell(8, 7, 6, 5, (x, y) => tone(r, sphereI(x, y, 6, 5, 6, 5)), (x, y) => y < 10); return ink(c); },
    huesos: () => { const c = canvas(16, 10); const p = painter(c); const b = SKINS.bone; p.limb(2, 6, 11, 3, 2, b); p.ell(11, 5, 2.4, 2.2, (x, y) => tone(b, sphereI(x, y, 10, 4, 2.4, 2.2))); p.P(11, 5, "#1a1020"); return ink(c); },
    tocon: () => { const c = canvas(16, 13); const p = painter(c); const w = ramp("#7a5a3a"); for (let x = 2; x < 13; x++) for (let y = 4; y < 11; y++) p.P(x, y, tone(w, 0.7 - (x - 2) * 0.06)); p.ell(7.5, 4, 5.5, 1.8, "#c9a27c"); p.P(7, 4, "#8a6a4a"); return ink(c); },
    farola: () => { const c = canvas(12, 30); const p = painter(c); const m = ramp("#3a3f4a"); p.limb(6, 6, 6, 27, 2, m); p.rect(3, 2, 7, 4, m.base); p.rect(4, 3, 5, 2, "#ffe9a3"); p.rect(3, 26, 7, 2, m.mid); return ink(c); }
  };

  /* ---------- objetos que se rompen ---------- */
  const PROPS = {
    barril: () => { const c = canvas(22, 26); const p = painter(c); const w = ramp("#8a5a2b"); for (let y = 2; y < 24; y++) { const half = 8 + Math.sin(((y - 2) / 22) * Math.PI) * 2; for (let x = Math.round(11 - half); x < 11 + half; x++) p.P(x, y, tone(w, 0.75 - (x - 11 + half) / (half * 2) * 0.6 + ((x + 1) % 4 === 0 ? -0.12 : 0))); } for (const y of [5, 12, 19]) for (let x = 2; x < 20; x++) if (p.filled(x, y)) p.P(x, y, x < 10 ? "#9aa3b0" : "#6b7380"); p.ell(11, 2.5, 8, 1.6, "#a8702f"); return ink(c); },
    caja: () => { const c = canvas(24, 24); const p = painter(c); const w = ramp("#c9a27c"); p.rect(2, 4, 20, 18, w.base); p.rect(2, 4, 20, 3, w.lt); p.rect(18, 4, 4, 18, w.mid); p.rect(2, 12, 20, 2, w.mid); p.line(3, 8, 17, 20, w.sh); p.line(4, 8, 18, 20, w.mid); for (const [x, y] of [[3, 5], [19, 5], [3, 20], [19, 20]]) p.P(x, y, "#5a4030"); return ink(c); },
    jarron: () => { const c = canvas(18, 24); const p = painter(c); const r = ramp("#c97a4a"); p.ell(9, 14, 7, 8, (x, y) => tone(r, sphereI(x, y, 7, 11, 7, 8))); p.rect(6, 3, 6, 4, r.base); p.rect(5, 2, 8, 2, r.lt); p.rect(4, 13, 10, 1, "#7a3a22"); p.P(6, 11, r.hl); return ink(c); },
    brasero: () => { const c = canvas(18, 26); const p = painter(c); const m = ramp("#4a4f5a"); p.limb(9, 8, 9, 23, 2, m); p.limb(5, 23, 13, 23, 2, m); p.ell(9, 7, 7, 3, (x, y) => tone(m, sphereI(x, y, 7, 5, 7, 3))); p.rect(4, 4, 10, 2, "#ff8a1f"); p.P(8, 3, "#ffd23f"); return ink(c); }
  };

  /* =======================================================
     CREACIÓN Y CACHÉ
     ======================================================= */

  const cache = {};

  function pairFrames(make) {
    const frames = [make(0), make(1)];
    return { frames, flash: frames.map((f) => silhouette(f)) };
  }

  function build() {
    if (cache.ground) return;

    for (const [id, draw] of Object.entries(ICONS)) cache[`icon:${id}`] = icon(draw);

    cache["fx:gem1"] = icon((p) => { p.P(6, 3, "#d8f6ff"); p.rect(5, 4, 4, 4, "#3bb5ff"); p.P(5, 4, "#d8f6ff"); p.rect(8, 5, 1, 3, "#1f6fd1"); p.P(6, 8, "#1f6fd1"); p.P(7, 8, "#1f6fd1"); });
    cache["fx:gem2"] = icon((p) => { p.P(6, 2, "#e8ffe4"); p.rect(5, 3, 4, 5, "#3cc24f"); p.P(5, 3, "#e8ffe4"); p.rect(8, 4, 1, 4, "#1f8a3a"); p.P(6, 8, "#1f8a3a"); });
    cache["fx:gem3"] = icon((p) => { p.P(6, 2, "#ffe0e0"); p.rect(4, 3, 6, 5, "#e63946"); p.P(4, 3, "#ffe0e0"); p.rect(9, 4, 1, 4, "#a61b1b"); p.rect(5, 8, 4, 1, "#a61b1b"); });
    cache["fx:enemyShot"] = icon((p) => { p.ell(7, 7, 3, 3, (x, y) => ((x + y) % 2 ? "#ff3b6b" : "#ffb0c8")); });
    cache.ground = groundTile();
    cache.tuft = (() => { const c = canvas(14, 16); const p = painter(c); const g = ["#2f6b2a", "#3a7a30", "#4a8a3a", "#5a9a44"]; for (const [bx, h, lean] of [[2, 11, -1], [4, 14, 0], [6, 12, 1], [8, 15, 0], [10, 11, 1], [11, 13, -1]]) for (let k = 0; k < h; k++) p.P(bx + Math.round((lean * k) / 6), 15 - k, g[Math.min(3, Math.floor((k / h) * 4))]); return ink(c); })();
    cache["patch:0"] = patch(3, ["#4a8044", "#55904c", "#ffe066", "#ffffff"]);
    cache["patch:1"] = patch(5, ["#6b5a3a", "#5e4f33", "#7a6a48"]);
    cache["patch:2"] = patch(8, ["#36603a", "#2f5634", "#4a7a41"]);
    cache["patch:3"] = patch(13, ["#4a8044", "#ff9fd0", "#ffffff", "#ffe066"]);
    for (const [id, make] of Object.entries(PROPS)) cache[`prop:${id}`] = make();
    for (const [id, make] of Object.entries(DECOR)) cache[`decor:${id}`] = make();
  }

  // Personas: se dibujan la primera vez que se piden (people.js)
  function get(key) {
    if (cache[key]) return cache[key];
    const [kind, id] = key.split(":");
    if (kind === "char") {
      // los personajes son stickmen como en Tronk Fight (stick.js)
      const ch = TS.CHARACTERS.find((c) => c.id === id);
      if (ch) cache[key] = Stick.set(Stick.characterOptions(ch));
    } else if (kind === "enemy" && Stick.ENEMIES[id]) {
      cache[key] = Stick.set(Stick.ENEMIES[id]);
    } else if (kind === "enemy" && People.ENEMIES[id]) {
      cache[key] = People.personSet(People.ENEMIES[id]);
    } else if (kind === "enemy" && ["slime", "slimito", "fantasma", "murcielago"].includes(id)) {
      cache[key] = People.creatureSet(id);
    }
    return cache[key];
  }

  // Imagen (dataURL) para las tarjetas del menú (solo la vista de frente)
  const portraits = {};
  function portraitCanvas(id) {
    if (!portraits[id]) {
      const ch = TS.CHARACTERS.find((c) => c.id === id);
      portraits[id] = ch ? Stick.portrait(get(`char:${id}`).down.idle) : null;
    }
    return portraits[id];
  }
  function portrait(id, k = 4) {
    return scaled(portraitCanvas(id), k).toDataURL();
  }
  function silhouettePortrait(id, k = 4) {
    return scaled(silhouette(portraitCanvas(id), "#2a2350"), k).toDataURL();
  }
  function iconUrl(id, k = 3) {
    const s = cache[`icon:${id}`];
    return s ? scaled(s, k).toDataURL() : "";
  }

  return { build, get, portrait, portraitCanvas, silhouettePortrait, iconUrl, scaled, silhouette, ramp, mix, DECOR_IDS: Object.keys(DECOR) };
})();
