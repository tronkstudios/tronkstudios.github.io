"use strict";

/* TronkStudios · survivors/js/stick.js
   Los personajes y enemigos de Tronk Survivors son stickmen, con el mismo
   dibujo que los luchadores de Tronk Fight (js/games/tronk-fight.js):
   huesos de color con contorno oscuro, cabeza redonda con su peinado y su
   arma. Se ven de lado y se giran en espejo; las posturas de andar y de
   atacar salen del mismo esqueleto que en Tronk Fight.
   Los fotogramas se dibujan a 3 veces el tamaño del juego (RES) para que
   las líneas queden suaves.
   Scripts clásicos (ver docs/adr/0002). */

const Stick = (() => {
  const RES = 3;
  // lienzo amplio para que quepan las armas levantadas; pies en (OX, OY)
  const FW = 84 * RES;
  const FH = 96 * RES;
  const OX = 42 * RES;
  const OY = 90 * RES;
  const SCALE = 0.33 * RES; // unidades de Tronk Fight → píxeles del fotograma
  const LINE = 1.3; // líneas algo más gruesas que en Tronk Fight (aquí se ven más pequeños)
  const INK = "rgba(8,6,20,.9)";
  const rad = (a) => (a * Math.PI) / 180;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => t * t * (3 - 2 * t);

  function shade(hex, amt) {
    const c = parseInt(hex.slice(1), 16);
    let r = c >> 16, g = (c >> 8) & 255, b = c & 255;
    if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; } else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }

  /* ---------- esqueleto (igual que en Tronk Fight) ---------- */
  const KEYS = ["lean", "fu", "ff", "bu", "bf", "ful", "fll", "bul", "bll", "w"];
  const BASE = {
    slash: { lean: 6, fu: 35, ff: 80, bu: -25, bf: 15, ful: 20, fll: 6, bul: -18, bll: -10, w: 135 },
    thrust: { lean: 5, fu: 40, ff: 85, bu: 30, bf: 80, ful: 20, fll: 6, bul: -18, bll: -10, w: 96 },
    smash: { lean: 8, fu: 30, ff: 150, bu: -20, bf: 20, ful: 22, fll: 6, bul: -18, bll: -10, w: 205 },
    shoot: { lean: 4, fu: 60, ff: 88, bu: 45, bf: 85, ful: 18, fll: 6, bul: -16, bll: -10, w: 92 },
    // nuevos para Survivors
    punch: { lean: 8, fu: 55, ff: 160, bu: 40, bf: 150, ful: 22, fll: 6, bul: -18, bll: -10, w: 0 },
    cast: { lean: 4, fu: 40, ff: 95, bu: -20, bf: 20, ful: 20, fll: 6, bul: -18, bll: -10, w: 160 },
    throw: { lean: 5, fu: 30, ff: 70, bu: -25, bf: 15, ful: 20, fll: 6, bul: -18, bll: -10, w: 170 },
    zombie: { lean: 14, fu: 88, ff: 92, bu: 80, bf: 86, ful: 18, fll: 6, bul: -16, bll: -10, w: 0 },
    robe: { lean: 3, fu: 40, ff: 95, bu: -15, bf: 20, ful: 10, fll: 4, bul: -10, bll: -6, w: 175 }
  };
  const ATK = {
    slash: [{ lean: -8, fu: 160, ff: 200, bu: -40, bf: -10, w: 215, ful: 14, fll: 4, bul: -22, bll: -12 }, { lean: 22, fu: 65, ff: 75, bu: -50, bf: -30, w: 40, ful: 38, fll: 12, bul: -34, bll: -14 }],
    thrust: [{ lean: -10, fu: -5, ff: 40, bu: -10, bf: 50, w: 92, ful: 12, fll: 2, bul: -26, bll: -14 }, { lean: 16, fu: 88, ff: 92, bu: 70, bf: 90, w: 92, ful: 40, fll: 14, bul: -36, bll: -18 }],
    smash: [{ lean: -16, fu: 175, ff: 195, bu: 150, bf: 190, w: 205, ful: 12, fll: 2, bul: -24, bll: -12 }, { lean: 30, fu: 60, ff: 35, bu: 55, bf: 40, w: 15, ful: 42, fll: 16, bul: -38, bll: -18 }],
    shoot: [{ lean: 2, fu: 88, ff: 90, bu: 70, bf: 92, w: 90 }, { lean: -8, fu: 80, ff: 102, bu: 60, bf: 100, w: 106 }],
    punch: [{ lean: -4, fu: 40, ff: 150, bu: 45, bf: 160 }, { lean: 18, fu: 90, ff: 90, bu: 35, bf: 150, ful: 38, fll: 12, bul: -32, bll: -14 }],
    cast: [{ lean: -6, fu: 150, ff: 170, bu: -30, bf: 0, w: 190 }, { lean: 12, fu: 92, ff: 92, bu: -40, bf: -10, w: 95, ful: 30, fll: 10, bul: -28, bll: -12 }],
    throw: [{ lean: -12, fu: 175, ff: 230, bu: 40, bf: 70, w: 230 }, { lean: 20, fu: 70, ff: 55, bu: -50, bf: -30, w: 60, ful: 38, fll: 12, bul: -34, bll: -14 }],
    zombie: [{ lean: 4, fu: 120, ff: 130, bu: 110, bf: 125 }, { lean: 26, fu: 92, ff: 92, bu: 86, bf: 88, ful: 34, fll: 10, bul: -30, bll: -12 }],
    robe: [{ lean: -6, fu: 160, ff: 175, bu: -30, bf: 0, w: 185 }, { lean: 10, fu: 95, ff: 95, bu: -30, bf: -10, w: 100 }]
  };
  const mix = (a, b, t) => { const o = {}; for (const k of KEYS) o[k] = lerp(a[k] ?? 0, b[k] ?? a[k] ?? 0, t); return o; };
  const over = (a, b) => ({ ...a, ...b });
  const V = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];

  function joints(P) {
    const TH = 34, SH = 34;
    const fk = V(P.ful), fs = V(P.fll), bk = V(P.bul), bs = V(P.bll);
    const drop = Math.max(fk[1] * TH + fs[1] * SH, bk[1] * TH + bs[1] * SH, 30);
    const hip = [0, -drop];
    const fKnee = [hip[0] + fk[0] * TH, hip[1] + fk[1] * TH], fFoot = [fKnee[0] + fs[0] * SH, fKnee[1] + fs[1] * SH];
    const bKnee = [hip[0] + bk[0] * TH, hip[1] + bk[1] * TH], bFoot = [bKnee[0] + bs[0] * SH, bKnee[1] + bs[1] * SH];
    const td = [Math.sin(rad(P.lean)), -Math.cos(rad(P.lean))];
    const sh = [hip[0] + td[0] * 46, hip[1] + td[1] * 46];
    const neck = [hip[0] + td[0] * 54, hip[1] + td[1] * 54];
    const head = [hip[0] + td[0] * 72, hip[1] + td[1] * 72];
    const fu = V(P.fu), ff = V(P.ff), bu = V(P.bu), bf = V(P.bf);
    const fEl = [sh[0] + fu[0] * 27, sh[1] + fu[1] * 27], fHand = [fEl[0] + ff[0] * 26, fEl[1] + ff[1] * 26];
    const bEl = [sh[0] + bu[0] * 27, sh[1] + bu[1] * 27], bHand = [bEl[0] + bf[0] * 26, bEl[1] + bf[1] * 26];
    return { hip, fKnee, fFoot, bKnee, bFoot, sh, neck, head, fEl, fHand, bEl, bHand, td };
  }

  // Postura de un fotograma: quieto, andar (8) o atacar (6)
  function pose(style, kind, i, n) {
    const base = { ...BASE[style] };
    if (kind === "walk") {
      const p = (i / n) * Math.PI * 2;
      const fl = 26 * Math.sin(p), bl = -26 * Math.sin(p);
      const armSwing = style === "zombie" ? 0.2 : 1;
      return over(base, {
        ful: fl, fll: fl - 24 * (0.5 + 0.5 * Math.sin(p - 1.3)),
        bul: bl, bll: bl - 24 * (0.5 + 0.5 * Math.sin(p + Math.PI - 1.3)),
        bu: base.bu - 16 * Math.sin(p) * armSwing, fu: base.fu + 6 * Math.sin(p) * armSwing, w: base.w + 3 * Math.sin(p),
        lean: base.lean + 4 + Math.abs(Math.sin(p)) * 2
      });
    }
    if (kind === "attack") {
      // preparación, golpe rápido y vuelta (como attackPose de Tronk Fight)
      const [k0, k1] = ATK[style];
      const K0 = over(base, k0), K1 = over(base, k1);
      const t = i / (n - 1);
      if (t < 0.34) return mix(base, K0, ease(t / 0.34));
      if (t < 0.6) return mix(K0, K1, 1 - Math.pow(1 - (t - 0.34) / 0.26, 3));
      return mix(K1, base, ease((t - 0.6) / 0.4) * 0.6);
    }
    return base;
  }

  /* ---------- dibujo ---------- */
  function bone(ctx, pts, color, w) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineWidth = w * LINE + 4.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = w * LINE; ctx.strokeStyle = color; ctx.stroke();
  }
  const blob = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const poly = (ctx, r, pts, fill) => { ctx.beginPath(); ctx.moveTo(pts[0][0] * r, pts[0][1] * r); for (const [x, y] of pts.slice(1)) ctx.lineTo(x * r, y * r); ctx.closePath(); if (fill) { ctx.fillStyle = fill; } ctx.fill(); };

  /* Peinados y cascos. Cabeza: centro (0,0), radio r, la cara mira a +x.
     Los de Tronk Fight son los mismos trazos; los nuevos siguen su estilo. */
  function drawHair(ctx, o, r, layer) {
    const hc = o.hairColor || "#2a1d1a";
    ctx.fillStyle = hc;
    const fade = () => {
      const g = ctx.createLinearGradient(0, -r * 0.75, 0, r * 0.05);
      g.addColorStop(0, hc); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = 0.6; ctx.fillStyle = g; ctx.fillRect(-r * 1.05, -r * 0.8, r * 1.35, r * 0.85); ctx.restore();
      ctx.fillStyle = hc;
    };
    const front = layer === "front";
    switch (o.hair) {
      case "taper":
        if (front) { fade(); ctx.beginPath(); ctx.moveTo(-r * 0.98, -r * 0.2); ctx.quadraticCurveTo(-r * 1.02, -r * 1.12, 0, -r * 1.18); ctx.quadraticCurveTo(r * 0.98, -r * 1.12, r * 0.95, -r * 0.42); ctx.quadraticCurveTo(r * 0.3, -r * 0.72, -r * 0.6, -r * 0.42); ctx.closePath(); ctx.fill(); }
        break;
      case "taperLong":
        if (front) { fade(); ctx.beginPath(); ctx.moveTo(-r * 0.98, -r * 0.2); ctx.quadraticCurveTo(-r * 1.05, -r * 1.35, -r * 0.1, -r * 1.48); ctx.quadraticCurveTo(r * 0.9, -r * 1.62, r * 1.18, -r * 1.05); ctx.quadraticCurveTo(r * 1.02, -r * 0.55, r * 0.92, -r * 0.42); ctx.quadraticCurveTo(r * 0.3, -r * 0.75, -r * 0.6, -r * 0.42); ctx.closePath(); ctx.fill(); }
        break;
      case "longCurly":
      case "curly":
        if (!front) { for (const [x, y] of [[-0.2, -1.05], [-0.65, -0.9], [-1.0, -0.5], [-1.15, 0], [-1.15, 0.5], [-1.05, 1.0], [-0.85, 1.45], [-0.5, 1.6], [0.2, -1.12], [0.65, -0.95], [-0.95, 1.8]]) blob(ctx, x * r, y * r, r * 0.46); }
        else {
          for (const [x, y] of [[-0.55, -0.85], [-0.1, -1.0], [0.38, -0.92], [0.78, -0.62]]) blob(ctx, x * r, y * r, r * 0.4);
          if (o.beard) for (const [x, y] of [[-0.1, 0.62], [0.25, 0.82], [0.62, 0.68], [0.88, 0.32], [0.45, 1.02], [0.05, 0.98]]) blob(ctx, x * r, y * r, r * 0.36);
        }
        break;
      case "mullet":
        if (!front) { ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.6); ctx.quadraticCurveTo(-r * 1.25, -r * 0.2, -r * 1.2, r * 1.0); ctx.quadraticCurveTo(-r * 1.25, r * 1.75, -r * 0.7, r * 1.95); ctx.quadraticCurveTo(-r * 0.6, r * 1.2, -r * 0.2, r * 0.4); ctx.closePath(); ctx.fill(); }
        else {
          ctx.beginPath(); ctx.moveTo(-r * 0.98, -r * 0.1); ctx.quadraticCurveTo(-r * 1.0, -r * 1.12, 0, -r * 1.2); ctx.quadraticCurveTo(r * 0.85, -r * 1.2, r * 1.02, -r * 0.55);
          ctx.lineTo(r * 0.7, -r * 0.62); ctx.lineTo(r * 0.55, -r * 0.42); ctx.lineTo(r * 0.3, -r * 0.6); ctx.quadraticCurveTo(-r * 0.3, -r * 0.6, -r * 0.62, -r * 0.2); ctx.closePath(); ctx.fill();
          if (o.fringe) {
            // flequillo moderno: mechones que caen sobre la frente
            for (const [x0, x1, y1] of [[0.25, 0.42, -0.18], [0.5, 0.68, -0.22], [0.72, 0.95, -0.3]]) {
              ctx.beginPath(); ctx.moveTo(x0 * r - r * 0.12, -r * 0.62); ctx.lineTo(x1 * r, y1 * r); ctx.lineTo(x0 * r + r * 0.16, -r * 0.62); ctx.closePath(); ctx.fill();
            }
          }
        }
        break;
      case "spiky":
        if (front) { ctx.beginPath(); ctx.moveTo(-r * 0.98, -r * 0.15); for (const [bx, by, tx, ty] of [[-1.05, -0.75, -1.55, -1.05], [-0.65, -1.0, -0.85, -1.85], [-0.15, -1.1, -0.1, -2.0], [0.35, -1.05, 0.65, -1.85], [0.8, -0.8, 1.45, -1.25], [1.0, -0.45, 1.35, -0.4]]) { ctx.lineTo(bx * r, by * r); ctx.lineTo(tx * r, ty * r); } ctx.lineTo(r * 0.92, -r * 0.35); ctx.quadraticCurveTo(r * 0.2, -r * 0.65, -r * 0.6, -r * 0.4); ctx.closePath(); ctx.fill(); }
        break;
      case "mane":
        if (!front) { ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 1.0); ctx.quadraticCurveTo(-r * 1.0, -r * 1.25, -r * 1.2, 0); ctx.quadraticCurveTo(-r * 1.3, r * 1.3, -r * 1.05, r * 2.0); ctx.lineTo(-r * 0.2, r * 1.85); ctx.quadraticCurveTo(-r * 0.2, r * 0.8, 0, r * 0.1); ctx.closePath(); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(-r * 0.95, r * 0.2); ctx.quadraticCurveTo(-r * 1.1, -r * 1.2, r * 0.1, -r * 1.15); ctx.quadraticCurveTo(r * 1.1, -r * 1.05, r * 1.0, -r * 0.2); ctx.quadraticCurveTo(r * 0.75, -r * 0.55, r * 0.45, -r * 0.5); ctx.quadraticCurveTo(-r * 0.2, -r * 0.6, -r * 0.55, r * 0.2); ctx.closePath(); ctx.fill(); }
        break;
      case "combover":
        if (front) {
          ctx.beginPath(); ctx.moveTo(-r * 0.98, -r * 0.1); ctx.quadraticCurveTo(-r * 1.0, -r * 1.05, -r * 0.25, -r * 1.2); ctx.quadraticCurveTo(r * 0.85, -r * 1.42, r * 1.2, -r * 0.82); ctx.quadraticCurveTo(r * 1.15, -r * 0.42, r * 0.85, -r * 0.42); ctx.quadraticCurveTo(r * 0.75, -r * 0.75, r * 0.1, -r * 0.68); ctx.quadraticCurveTo(-r * 0.4, -r * 0.6, -r * 0.62, -r * 0.15); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.95); ctx.quadraticCurveTo(r * 0.3, -r * 1.2, r * 0.95, -r * 0.85); ctx.stroke();
        }
        break;
      case "capBack":
        if (front) {
          fade();
          ctx.fillStyle = o.acc || "#d62828";
          ctx.beginPath(); ctx.arc(0, -r * 0.08, r * 1.04, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
          ctx.fillRect(-r * 1.75, -r * 0.3, r * 0.85, r * 0.26); // visera hacia atrás
          ctx.fillStyle = "#ffffff"; blob(ctx, r * 0.1, -r * 0.72, r * 0.16);
        }
        break;
      case "ponytail":
        if (!front) { ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.7); ctx.quadraticCurveTo(-r * 1.9, -r * 0.6, -r * 1.7, r * 0.9); ctx.quadraticCurveTo(-r * 1.3, r * 0.2, -r * 0.8, -r * 0.1); ctx.closePath(); ctx.fill(); ctx.fillStyle = o.acc || "#ffd23f"; blob(ctx, -r * 0.92, -r * 0.62, r * 0.2); }
        else { ctx.beginPath(); ctx.moveTo(-r * 1.0, r * 0.1); ctx.quadraticCurveTo(-r * 1.05, -r * 1.15, 0, -r * 1.16); ctx.quadraticCurveTo(r * 1.0, -r * 1.1, r * 1.02, -r * 0.2); ctx.quadraticCurveTo(r * 0.6, -r * 0.55, r * 0.2, -r * 0.5); ctx.quadraticCurveTo(-r * 0.5, -r * 0.55, -r * 0.7, r * 0.1); ctx.closePath(); ctx.fill(); }
        break;
      case "afro":
        if (!front) for (const [x, y, k] of [[-0.3, -0.75, 0.9], [0.35, -0.75, 0.8], [-0.85, -0.15, 0.75], [-0.75, 0.45, 0.6], [0.1, -1.1, 0.7]]) blob(ctx, x * r, y * r, r * k);
        else for (const [x, y] of [[-0.4, -1.1], [0.2, -1.25], [0.75, -0.95], [1.02, -0.5]]) blob(ctx, x * r, y * r, r * 0.42);
        break;
      case "beanie":
        if (front) {
          ctx.fillStyle = o.acc || "#3a86ff";
          ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 1.06, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = shade(o.acc || "#3a86ff", -0.25); ctx.fillRect(-r * 1.08, -r * 0.3, r * 2.16, r * 0.34);
          ctx.fillStyle = "#f4f8ff"; blob(ctx, -r * 0.1, -r * 1.2, r * 0.3);
          ctx.fillStyle = hc; blob(ctx, r * 0.8, -r * 0.05, r * 0.25);
        }
        break;
      case "ninja":
        if (!front) { ctx.strokeStyle = o.acc || "#e63946"; ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.45); ctx.quadraticCurveTo(-r * 1.6, -r * 0.1, -r * 2.0, r * 0.4); ctx.moveTo(-r * 0.9, -r * 0.4); ctx.quadraticCurveTo(-r * 1.5, r * 0.2, -r * 1.7, r * 0.8); ctx.stroke(); }
        else {
          for (const [x, y] of [[-0.6, -0.9], [-0.1, -1.1], [0.4, -1.0], [0.8, -0.7]]) blob(ctx, x * r, y * r, r * 0.38);
          ctx.fillStyle = o.acc || "#e63946"; ctx.fillRect(-r * 1.0, -r * 0.6, r * 2.0, r * 0.26);
          ctx.fillStyle = "#1b1b2f"; ctx.beginPath(); ctx.arc(0, 0, r, 0.05, Math.PI * 0.95); ctx.closePath(); ctx.fill(); // tapabocas
        }
        break;
      case "bob":
        if (!front) { ctx.beginPath(); ctx.ellipse(-r * 0.25, r * 0.05, r * 1.05, r * 1.15, 0, 0, Math.PI * 2); ctx.fill(); }
        else {
          ctx.beginPath(); ctx.moveTo(-r * 1.0, r * 0.3); ctx.quadraticCurveTo(-r * 1.1, -r * 1.2, r * 0.1, -r * 1.15); ctx.quadraticCurveTo(r * 1.15, -r * 1.0, r * 1.05, r * 0.1); ctx.lineTo(r * 0.8, -r * 0.35); ctx.quadraticCurveTo(r * 0.2, -r * 0.6, -r * 0.5, -r * 0.3); ctx.closePath(); ctx.fill();
          ctx.fillStyle = o.acc || "#ffe066"; star(ctx, r * 0.45, -r * 0.78, r * 0.26);
        }
        break;
      case "fluffy":
        if (front) for (const [x, y] of [[-0.7, -0.7], [-0.25, -1.05], [0.25, -1.08], [0.7, -0.85], [0.98, -0.45]]) blob(ctx, x * r, y * r, r * 0.42);
        break;
      case "helmet":
        if (front) {
          ctx.fillStyle = o.hairColor || "#3d4451"; ctx.beginPath(); ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
          ctx.fillStyle = o.acc || "#00e5ff"; ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 0.45); ctx.lineTo(r * 1.1, -r * 0.4); ctx.lineTo(r * 1.05, r * 0.15); ctx.lineTo(r * 0.25, r * 0.1); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(r * 0.4, -r * 0.35, r * 0.4, r * 0.12);
        }
        break;
      case "hood":
        ctx.fillStyle = o.hairColor || "#e9c46a";
        if (!front) { ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 1.25); ctx.quadraticCurveTo(-r * 1.6, -r * 1.2, -r * 1.5, r * 1.2); ctx.lineTo(-r * 0.2, r * 1.2); ctx.closePath(); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(0, 0, r * 1.18, Math.PI * 0.62, Math.PI * 1.9); ctx.quadraticCurveTo(r * 0.4, -r * 0.6, r * 0.2, r * 0.3); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#f2d28a"; blob(ctx, r * 0.75, -r * 0.7, r * 0.18); }
        break;
      case "zombie":
        if (front) { ctx.strokeStyle = hc; ctx.lineWidth = r * 0.18; ctx.beginPath(); for (const [x, y, x2, y2] of [[-0.5, -0.85, -0.7, -1.35], [0, -1.0, 0.1, -1.45], [0.45, -0.9, 0.75, -1.3]]) { ctx.moveTo(x * r, y * r); ctx.lineTo(x2 * r, y2 * r); } ctx.stroke(); }
        break;
      case "hardhat":
        if (front) { ctx.fillStyle = o.acc || "#f2c14e"; ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 1.02, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.fillRect(-r * 1.25, -r * 0.28, r * 2.6, r * 0.26); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
        break;
      case "balaclava":
        if (front) {
          ctx.fillStyle = "#151319"; ctx.beginPath(); ctx.arc(0, 0, r * 1.02, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = o.skin || "#e8b896"; ctx.fillRect(r * 0.2, -r * 0.32, r * 0.82, r * 0.3);
          ctx.fillStyle = "#14112b"; blob(ctx, r * 0.55, -r * 0.17, r * 0.12);
          if (o.beret) { ctx.fillStyle = o.beret; ctx.beginPath(); ctx.ellipse(-r * 0.15, -r * 0.92, r * 1.0, r * 0.38, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ffd23f"; blob(ctx, r * 0.45, -r * 0.92, r * 0.16); }
        }
        break;
      case "wrapNinja":
        if (!front) { ctx.strokeStyle = o.acc || "#e63946"; ctx.lineWidth = r * 0.2; ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.3); ctx.quadraticCurveTo(-r * 1.6, 0, -r * 1.9, r * 0.6); ctx.stroke(); }
        else { ctx.fillStyle = o.hairColor || "#3b1f5c"; ctx.beginPath(); ctx.arc(0, 0, r * 1.02, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#f2c3a0"; ctx.fillRect(r * 0.25, -r * 0.3, r * 0.78, r * 0.28); ctx.fillStyle = o.eye || "#14112b"; blob(ctx, r * 0.58, -r * 0.16, r * 0.12); }
        break;
      case "skull":
        if (front) { ctx.fillStyle = "#1a1020"; blob(ctx, r * 0.5, -r * 0.15, r * 0.24); ctx.fillRect(r * 0.35, r * 0.4, r * 0.6, r * 0.12); ctx.fillStyle = o.eye || "#ff6b3b"; blob(ctx, r * 0.5, -r * 0.15, r * 0.08); }
        break;
      case "hoodShadow":
        if (front) { ctx.fillStyle = o.hairColor || "#4a148c"; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, Math.PI * 0.55, Math.PI * 2.05); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#14101c"; ctx.beginPath(); ctx.arc(r * 0.25, r * 0.05, r * 0.75, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ff2bd6"; blob(ctx, r * 0.55, -r * 0.1, r * 0.13); }
        break;
    }
    if (front && o.crown) {
      ctx.fillStyle = "#ffd23f";
      ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.8); ctx.lineTo(-r * 0.7, -r * 1.45); ctx.lineTo(-r * 0.35, -r * 1.1); ctx.lineTo(0, -r * 1.6); ctx.lineTo(r * 0.35, -r * 1.1); ctx.lineTo(r * 0.7, -r * 1.45); ctx.lineTo(r * 0.7, -r * 0.8); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = "#e63946"; blob(ctx, 0, -r * 1.0, r * 0.14);
    }
  }

  function star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }

  /* Cabeza según desde dónde se mire (yaw: 0 de frente, π/2 de lado, π de espaldas).
     De lado es exactamente la de Tronk Fight; de frente el peinado se dibuja
     por los dos lados y se ven los dos ojos; de espaldas, solo pelo. */
  function drawHead(ctx, o, r, yaw = Math.PI / 2) {
    const side = Math.sin(yaw); // 1 de lado, 0 de frente o de espaldas
    const facing = Math.cos(yaw); // 1 de frente, -1 de espaldas
    const both = (layer) => {
      // peinado por los dos lados (de frente y de espaldas): el de perfil y su espejo
      drawHair(ctx, o, r, layer);
      ctx.save(); ctx.scale(-1, 1); drawHair(ctx, o, r, layer); ctx.restore();
    };
    const profile = side > 0.55;
    // pelo de detrás
    if (profile) drawHair(ctx, o, r, "back"); else both("back");
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = o.head || o.color; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(8,6,20,.85)"; ctx.stroke();
    // ojos: se mueven hacia donde mira la cara
    if (!o.noEye && facing > -0.3) {
      ctx.fillStyle = o.eye || "#14112b";
      const eyes = profile ? (facing > 0.3 ? [0.5, -0.02] : [0.5]) : [0.32, -0.32];
      for (const ex of eyes) { ctx.beginPath(); ctx.arc(r * ex, -r * 0.12, r * 0.13, 0, Math.PI * 2); ctx.fill(); }
    }
    // de espaldas el pelo tapa casi toda la cabeza
    const bald = ["skull", "helmet", "balaclava", "wrapNinja", "hoodShadow", "zombie", "hardhat", "beanie", "capBack"].includes(o.hair) || !o.hair;
    if (facing < -0.3 && !bald) {
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = o.hairColor || "#2a1d1a"; ctx.fillRect(-r, -r, r * 2, r * (facing < -0.8 ? 1.45 : 1.25)); ctx.restore();
    }
    if (profile) drawHair(ctx, o, r, "front"); else both("front");
    if (o.glasses && facing > -0.3) {
      ctx.strokeStyle = "#14112b"; ctx.lineWidth = 2.4; ctx.fillStyle = "rgba(255,255,255,.35)";
      if (profile) {
        ctx.beginPath(); ctx.rect(r * 0.22, -r * 0.38, r * 0.62, r * 0.46); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * 0.22, -r * 0.22); ctx.lineTo(-r * 0.35, -r * 0.28); ctx.stroke();
      } else {
        for (const ex of [0.32, -0.32]) { ctx.beginPath(); ctx.rect(r * (ex - 0.27), -r * 0.36, r * 0.54, r * 0.44); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.2); ctx.lineTo(r * 0.05, -r * 0.2); ctx.stroke();
      }
    }
  }

  /* Armas: el arma sale de la mano hacia +y (como en Tronk Fight) */
  const GRIP = { lanza: 0.32, tridente: 0.3, mazo: 0.1, hacha: 0.12, espada: 0, ballesta: 0.15, rifle: 0.3, baston: 0.25, katana: 0 };
  function drawWeapon(ctx, type, len) {
    const back = -len * (GRIP[type] || 0), tip = len + back;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const wood = "#7a4a26", steel = "#dfe6f0", steelDk = "#5b6b80";
    switch (type) {
      case "espada":
      case "katana": {
        ctx.fillStyle = "#3a2516"; ctx.fillRect(-3, -10, 6, 16);
        ctx.fillStyle = type === "katana" ? "#2a2a35" : "#e0b84a"; ctx.fillRect(-11, 5, 22, 5);
        ctx.beginPath(); ctx.moveTo(-4.5, 10); ctx.lineTo(4.5, 10); ctx.lineTo(3.5, len - 10); ctx.lineTo(0, len); ctx.lineTo(-3.5, len - 10); ctx.closePath();
        ctx.fillStyle = type === "rusty" ? "#a88a6a" : steel; ctx.fill(); ctx.strokeStyle = steelDk; ctx.lineWidth = 1.5; ctx.stroke();
        break;
      }
      case "ballesta":
        ctx.strokeStyle = wood; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, back); ctx.lineTo(0, tip); ctx.stroke();
        ctx.strokeStyle = "#2a2a35"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-22, tip - 12); ctx.quadraticCurveTo(0, tip + 6, 22, tip - 12); ctx.stroke();
        ctx.strokeStyle = "#e9e3d0"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-22, tip - 12); ctx.lineTo(0, tip - 26); ctx.lineTo(22, tip - 12); ctx.stroke();
        ctx.strokeStyle = "#cfd6e0"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, tip - 26); ctx.lineTo(0, tip + 8); ctx.stroke();
        break;
      case "mazo":
        ctx.strokeStyle = wood; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, back); ctx.lineTo(0, tip - 12); ctx.stroke();
        ctx.fillStyle = "#3d3f4a";
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.25) * 14, tip + Math.sin(a - 0.25) * 14); ctx.lineTo(Math.cos(a) * 24, tip + Math.sin(a) * 24); ctx.lineTo(Math.cos(a + 0.25) * 14, tip + Math.sin(a + 0.25) * 14); ctx.fill(); }
        ctx.beginPath(); ctx.arc(0, tip, 16, 0, Math.PI * 2); ctx.fillStyle = "#565a68"; ctx.fill();
        ctx.beginPath(); ctx.arc(-5, tip - 5, 5, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fill();
        break;
      case "lanza":
        ctx.strokeStyle = wood; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, back); ctx.lineTo(0, tip - 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, tip + 26); ctx.lineTo(7, tip + 4); ctx.lineTo(0, tip - 4); ctx.lineTo(-7, tip + 4); ctx.closePath();
        ctx.fillStyle = steel; ctx.fill(); ctx.strokeStyle = steelDk; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = "#d8322f"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-2, tip - 6); ctx.lineTo(-7, tip - 18); ctx.moveTo(2, tip - 6); ctx.lineTo(5, tip - 19); ctx.stroke();
        break;
      case "hacha":
        ctx.strokeStyle = wood; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, back); ctx.lineTo(0, tip + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2, tip - 20); ctx.lineTo(-14, tip - 26); ctx.quadraticCurveTo(-30, tip - 10, -14, tip + 8); ctx.lineTo(2, tip + 2); ctx.closePath();
        ctx.fillStyle = steel; ctx.fill(); ctx.strokeStyle = steelDk; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#5b6b80"; ctx.fillRect(1, tip - 16, 7, 14);
        break;
      case "tridente":
        ctx.strokeStyle = "#2f8c8c"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, back); ctx.lineTo(0, tip); ctx.stroke();
        ctx.strokeStyle = "#e0b84a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-13, tip); ctx.lineTo(13, tip);
        for (const x of [-13, 0, 13]) { ctx.moveTo(x, tip); ctx.lineTo(x, tip + (x ? 20 : 26)); }
        ctx.stroke(); ctx.fillStyle = "#e0b84a";
        for (const x of [-13, 0, 13]) { const e = tip + (x ? 20 : 26); ctx.beginPath(); ctx.moveTo(x - 4, e - 4); ctx.lineTo(x, e + 7); ctx.lineTo(x + 4, e - 4); ctx.fill(); }
        break;
      case "rifle":
        ctx.fillStyle = "#2a2a30"; ctx.fillRect(-4, back, 8, len); ctx.fillStyle = "#5a4630"; ctx.fillRect(-5, back - 4, 10, 18); ctx.fillStyle = "#14141a"; ctx.fillRect(-2, tip - 6, 4, 16);
        break;
      case "baston":
        ctx.strokeStyle = wood; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, back); ctx.lineTo(0, tip); ctx.stroke();
        ctx.strokeStyle = "rgba(233,196,106,.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, tip + 8, 10, 0, Math.PI * 1.6); ctx.stroke();
        break;
      case "petardo":
        ctx.fillStyle = "#d62828"; ctx.fillRect(-5, 0, 10, 24); ctx.fillStyle = "#f4f4f4"; ctx.fillRect(-5, 8, 10, 4);
        ctx.strokeStyle = "#5a4630"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(3, 31); ctx.stroke();
        ctx.fillStyle = "#ffd23f"; star(ctx, 3, 33, 6);
        break;
      case "perfume":
        ctx.fillStyle = "#ff7eb6"; ctx.beginPath(); ctx.ellipse(0, 12, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffd23f"; ctx.fillRect(-4, -2, 8, 6); ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(-5, 6, 3, 8);
        break;
      case "balon":
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 12, 12, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
        ctx.fillStyle = "#14112b"; star(ctx, 0, 12, 5);
        break;
      case "hielo":
        ctx.fillStyle = "rgba(160,220,255,.55)"; ctx.beginPath(); ctx.arc(0, 10, 13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#e8f8ff"; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; ctx.moveTo(Math.cos(a) * 9, 10 + Math.sin(a) * 9); ctx.lineTo(-Math.cos(a) * 9, 10 - Math.sin(a) * 9); }
        ctx.stroke();
        break;
      case "kunai":
        ctx.fillStyle = "#2a2a35"; ctx.fillRect(-2, -4, 4, 12); ctx.fillStyle = steel;
        ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(5, 8); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill(); ctx.strokeStyle = steelDk; ctx.lineWidth = 1.5; ctx.stroke();
        break;
      case "estrella":
        ctx.strokeStyle = "#e0b84a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 26); ctx.stroke();
        ctx.fillStyle = "#ffe066"; star(ctx, 0, 34, 12);
        break;
      case "tnt":
        ctx.fillStyle = "#c1121f"; for (const x of [-9, 0, 9]) ctx.fillRect(x - 4, 0, 8, 26); ctx.fillStyle = "#14112b"; ctx.fillRect(-13, 10, 26, 4);
        ctx.fillStyle = "#ffd23f"; star(ctx, 0, -4, 6);
        break;
    }
  }

  // Arma de Survivors → cómo se dibuja y cómo se mueve
  const WEAPON = {
    tajo: ["espada", 74, "slash"], virote: ["ballesta", 46, "shoot"], mazazo: ["mazo", 70, "smash"], estocada: ["lanza", 132, "thrust"],
    hacha: ["hacha", 78, "slash"], rayo: ["tridente", 116, "thrust"], guantes: [null, 0, "punch", "gloves"], punos: [null, 0, "punch", "fists"],
    petardo: ["petardo", 0, "throw"], colonia: ["perfume", 0, "cast"], balon: ["balon", 0, "throw"], copos: ["hielo", 0, "cast"],
    kunai: ["kunai", 0, "throw"], meteoro: ["estrella", 0, "cast"], dron: [null, 0, "cast", "drone"], tornado: ["baston", 110, "cast"],
    // enemigos
    katana: ["katana", 70, "slash"], rifle: ["rifle", 60, "shoot"], rusty: ["espada", 60, "slash"], baston: ["baston", 100, "robe"], tnt: ["tnt", 0, "zombie"], none: [null, 0, "zombie"]
  };

  /* El esqueleto de Tronk Fight es de perfil (x hacia delante, y hacia abajo).
     Aquí se le da profundidad: el brazo y la pierna «de delante» van por el
     lado derecho del cuerpo y los otros por el izquierdo, y se gira todo
     según la vista. Se dibuja de lo más lejano a lo más cercano. */
  const LAT = { hip: 0, neck: 0, head: 0, sh: 0, fKnee: 8, fFoot: 8, bKnee: -8, bFoot: -8, fEl: 15, fHand: 17, bEl: -15, bHand: -17, hipF: 6, hipB: -6, shF: 12, shB: -12 };
  const TILT = 0.28; // lo cerca de la cámara se ve un poco más abajo

  function drawFigure(ctx, o, P, flash, yaw = Math.PI / 2) {
    const J = joints(P);
    J.hipF = J.hipB = J.hip;
    J.shF = J.shB = J.sh;
    const sy = Math.sin(yaw), cy = Math.cos(yaw);
    const k = o.thick || 1;
    const lat = (n) => LAT[n] * (n.startsWith("f") || n.endsWith("F") ? 1 : 1) * (o.thick ? 0.7 + 0.3 * o.thick : 1);
    // proyección: (delante, arriba, derecha) → pantalla y profundidad
    const P3 = (n, pt = J[n], l = lat(n)) => {
      const f = pt[0], u = -pt[1];
      const depth = f * cy + l * sy;
      return [f * sy - l * cy, -u + depth * TILT, depth];
    };
    const col = flash ? "#ffffff" : o.color;
    const dark = flash ? "#e8e8ff" : shade(o.color, -0.38);
    const legs = flash ? "#ffffff" : o.legs || o.color;
    const legsDark = flash ? "#e8e8ff" : shade(o.legs || o.color, -0.38);
    const [type, len, , hands] = WEAPON[o.weapon] || WEAPON.none;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const parts = [];
    const add = (depth, draw) => parts.push({ depth, draw });
    const limb = (names, color, w) => {
      const pts = names.map((n) => P3(n));
      add(pts.reduce((a, p) => a + p[2], 0) / pts.length, () => bone(ctx, pts, color, w));
      return pts;
    };
    // la mano izquierda es la «de atrás» de Tronk Fight
    limb(["hipB", "bKnee", "bFoot"], legsDark, 7 * k);
    if (!o.robe) limb(["hipF", "fKnee", "fFoot"], legs, 7 * k);
    const bArm = limb(["shB", "bEl", "bHand"], dark, 6.5 * k);
    const fArm = limb(["shF", "fEl", "fHand"], col, 7 * k);
    const hip = P3("hip"), neck = P3("neck"), sh = P3("sh"), hd = P3("head");
    const glove = (pt, front) => add(pt[2] + 0.5, () => {
      ctx.fillStyle = flash ? "#ffffff" : hands === "gloves" ? (front ? "#e53935" : "#b71c1c") : o.color; ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pt[0], pt[1], hands === "gloves" ? 10 : 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (hands === "gloves") { ctx.fillStyle = "#f4f4f4"; ctx.fillRect(pt[0] - 6, pt[1] + 6, 12, 4); }
    });
    if (hands) { glove(fArm[2], true); if (hands === "gloves") glove(bArm[2], false); }
    // tronco (o túnica)
    if (o.robe) {
      const rl = [P3("x", [J.sh[0], J.sh[1]], 9), P3("x", [J.sh[0], J.sh[1]], -9), P3("x", [J.hip[0], -2], -26), P3("x", [J.hip[0], -2], 26)];
      add(hip[2], () => { ctx.fillStyle = flash ? "#ffffff" : o.robe; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); rl.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); ctx.stroke(); });
    } else {
      add(hip[2] + 0.1, () => {
        bone(ctx, [hip, neck], col, 8 * k * (o.torso || 1));
        if (o.abs && !flash && cy > 0) {
          ctx.strokeStyle = shade(o.color, -0.3); ctx.lineWidth = 1.5;
          for (const t of [0.25, 0.45, 0.65]) { const x = lerp(hip[0], neck[0], t), y = lerp(hip[1], neck[1], t); ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.stroke(); }
        }
      });
    }
    // capa: cuelga por detrás de la espalda
    if (o.cape) {
      const back = (pt, d) => P3("x", [pt[0] - d, pt[1]], 0);
      const c0 = back(J.neck, 3), c1 = back([J.hip[0], J.hip[1] + 44], 30), w = 12;
      const sideV = [cy, sy * TILT]; // hacia la derecha del personaje en pantalla
      add(c1[2] - 1, () => {
        ctx.fillStyle = flash ? "#ffffff" : o.cape; ctx.strokeStyle = INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(c0[0] - sideV[0] * 9, c0[1]); ctx.lineTo(c0[0] + sideV[0] * 9, c0[1]);
        ctx.lineTo(c1[0] + sideV[0] * w * 1.6 + 6 * sy, c1[1]); ctx.lineTo(c1[0] - sideV[0] * w * 1.6 - 6 * sy, c1[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
    }
    // cabeza
    add(hd[2] + 2, () => {
      ctx.save(); ctx.translate(hd[0], hd[1]);
      const flip = sy < -0.01;
      ctx.rotate(rad(P.lean) * 0.6 * sy);
      drawHead(ctx, flash ? { ...o, color: "#ffffff", head: "#ffffff" } : o, 17 * (o.headK || 1), yaw);
      ctx.restore();
    });
    // arma: sale de la mano en la dirección de Tronk Fight, girada con la vista
    if (type) {
      const hand = fArm[2];
      const dir = [Math.sin(rad(P.w)), Math.cos(rad(P.w))]; // en el plano de perfil (x delante, y abajo)
      const f = dir[0], u = -dir[1];
      const sx = f * sy, syy = -u + f * cy * TILT, dz = f * cy;
      const shrink = Math.max(0.25, Math.hypot(sx, syy));
      add(hand[2] + dz * 20 + 0.3, () => {
        ctx.save(); ctx.translate(hand[0], hand[1]);
        ctx.rotate(Math.atan2(syy, sx) - Math.PI / 2);
        ctx.scale(1, shrink);
        drawWeapon(ctx, type, len);
        ctx.restore();
      });
    }
    // dron de Zeta flotando junto al hombro
    if (o.drone && !flash) {
      const d = P3("x", [J.sh[0] - 26, J.sh[1] - 34], -14);
      add(d[2], () => {
        ctx.fillStyle = "#3d4451"; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(d[0], d[1], 14, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#00e5ff"; ctx.beginPath(); ctx.arc(d[0] + 6 * sy, d[1], 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#9aa3b0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d[0] - 16, d[1] - 9); ctx.lineTo(d[0] - 4, d[1] - 9); ctx.moveTo(d[0] + 4, d[1] - 9); ctx.lineTo(d[0] + 16, d[1] - 9); ctx.stroke();
      });
    }
    parts.sort((a, b) => a.depth - b.depth);
    for (const p of parts) p.draw();
  }

  function frame(o, P, flash, yaw) {
    const c = document.createElement("canvas");
    c.width = FW;
    c.height = FH;
    c.res = RES; // lo usa el juego para dibujarlo a su tamaño
    c.foot = OY; // dónde están los pies (en píxeles del lienzo)
    const g = c.getContext("2d");
    g.translate(OX, OY);
    g.scale(SCALE * (o.size || 1), SCALE * (o.size || 1));
    drawFigure(g, o, P, flash, yaw);
    return c;
  }

  // Juego completo de fotogramas con el formato de people.js: 5 vistas
  // (las de la izquierda las saca el juego en espejo)
  const VIEWS = { down: 0, downSide: Math.PI / 4, side: Math.PI / 2, upSide: (Math.PI * 3) / 4, up: Math.PI };
  function set(o) {
    const style = (WEAPON[o.weapon] || WEAPON.none)[2];
    const out = {};
    for (const [v, yaw] of Object.entries(VIEWS)) {
      const make = (flash) => ({
        idle: frame(o, pose(style, "idle"), flash, yaw),
        walk: Array.from({ length: 8 }, (_, i) => frame(o, pose(style, "walk", i, 8), flash, yaw)),
        attack: Array.from({ length: 6 }, (_, i) => frame(o, pose(style, "attack", i, 6), flash, yaw))
      });
      out[v] = make(false);
      out[`${v}Flash`] = make(true);
    }
    return out;
  }

  /* ---------- personajes (de data.js) ---------- */
  function characterOptions(ch) {
    const o = { color: ch.shirt, hair: ch.hair, hairColor: ch.hairColor, acc: ch.acc, weapon: ch.weapon, glasses: ch.glasses };
    if (ch.id === "omogos") Object.assign(o, { hair: "curly", beard: true });
    if (ch.id === "eledemak") Object.assign(o, { fringe: true }); // mullet con flequillo
    if (ch.id === "sunk") Object.assign(o, { color: "#f0c8a0", legs: "#9e9a92", thick: 1.25, torso: 1.35, abs: true });
    if (ch.id === "finillos") Object.assign(o, { thick: 1.15 });
    if (ch.id === "quizo") Object.assign(o, { cape: ch.acc || "#6b2fa0" });
    if (ch.id === "zeta") Object.assign(o, { drone: true, eye: null, noEye: true });
    if (ch.id === "kaito") Object.assign(o, { eye: "#14112b" });
    return o;
  }

  /* ---------- enemigos (mismo nombre que su «sprite» en data.js) ---------- */
  const Z = "#8db56a";
  const ENEMIES = {
    zombi: { color: "#5c6b73", head: Z, hair: "zombie", hairColor: "#2a2a22", eye: "#c1121f", weapon: "none" },
    corredor: { color: "#c44536", head: "#a6c96a", hair: "zombie", hairColor: "#3a2a1c", eye: "#c1121f", weapon: "none" },
    casco: { color: "#e07a1f", head: Z, hair: "hardhat", acc: "#f2c14e", eye: "#c1121f", weapon: "none" },
    bomba: { color: "#3a3a3a", head: Z, hair: "zombie", hairColor: "#2a2a22", eye: "#c1121f", weapon: "tnt" },
    gordo: { color: "#8a6f5a", head: Z, hair: "zombie", hairColor: "#2a2a22", eye: "#c1121f", weapon: "none", thick: 1.9, torso: 1.4, headK: 1.15 },
    antitronk: { color: "#3a4232", hair: "balaclava", weapon: "rifle", noEye: true },
    supremo: { color: "#2b2f3a", hair: "balaclava", beret: "#a61b1b", weapon: "rifle", noEye: true },
    general: { color: "#3a4232", hair: "balaclava", beret: "#1a1a1f", weapon: "rifle", cape: "#1a1a1f", noEye: true },
    ninja: { color: "#3b1f5c", hair: "wrapNinja", hairColor: "#3b1f5c", acc: "#e63946", weapon: "katana", noEye: true },
    maestro: { color: "#1a1a1f", hair: "wrapNinja", hairColor: "#151515", acc: "#ffd23f", eye: "#c1121f", weapon: "katana", noEye: true },
    esqueleto: { color: "#ece4cf", hair: "skull", weapon: "rusty", thick: 0.65, noEye: true },
    reyEsqueleto: { color: "#ece4cf", hair: "skull", weapon: "rusty", thick: 0.7, crown: true, cape: "#4a148c", noEye: true },
    brujo: { color: "#4a148c", hair: "hoodShadow", hairColor: "#4a148c", robe: "#4a148c", weapon: "baston", noEye: true },
    rey: { color: "#5a1a2a", head: Z, hair: "zombie", hairColor: "#2a2a22", eye: "#ffd23f", weapon: "none", crown: true, cape: "#a61b1b" }
  };

  // Recorte para los retratos del menú: el cuerpo, sin el margen para las armas
  function portrait(c) {
    const w = 60 * RES, h = 70 * RES;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    out.res = RES;
    out.foot = h - 4 * RES;
    out.getContext("2d").drawImage(c, OX - w / 2, OY - out.foot, w, h, 0, 0, w, h);
    return out;
  }

  // El esqueleto, para el motor 3D (render3d.js)
  const rig = { pose, joints, LAT, WEAPON, styleOf: (o) => (WEAPON[o.weapon] || WEAPON.none)[2] };

  return { set, portrait, characterOptions, ENEMIES, RES, rig };
})();
