import { WIDTH, HEIGHT } from "./engine.js?v=2";

function trace(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

function circle(ctx, x, y, radius, fill, stroke, width = 1) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function polygon(ctx, sides, radius) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / sides;
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  ctx.closePath();
}

function background(map, routes) {
  const base = document.createElement("canvas");
  base.width = WIDTH;
  base.height = HEIGHT;
  const ctx = base.getContext("2d");
  const glow = ctx.createRadialGradient(530, 245, 35, 490, 270, 590);
  glow.addColorStop(0, "#153454");
  glow.addColorStop(0.65, "#0b1829");
  glow.addColorStop(1, "#060d18");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "#47709631";
  ctx.lineWidth = 1;
  for (let x = 10; x < WIDTH; x += 33) {
    for (let y = 10; y < HEIGHT; y += 33) {
      if ((x * 5 + y * 3) % 7 < 5) circle(ctx, x, y, 1.4, "#44739956");
    }
  }
  for (const [x, y, r] of [
    [102, 264, 48],
    [331, 260, 54],
    [626, 324, 34],
    [827, 84, 39],
    [790, 514, 56],
  ]) {
    circle(ctx, x, y, r, "#122338a2", "#3d6a8b70");
    circle(ctx, x, y, r * 0.68, null, "#3d6a8b69");
    circle(ctx, x, y, 4, map.accent + "55");
  }
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (routes.length > 1) {
    const points = routes[1].points;
    for (const [width, color] of [
      [56, "#060d17"],
      [47, "#8156ad"],
      [42, "#2c2248"],
    ]) {
      trace(ctx, points);
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
    trace(ctx, points);
    ctx.setLineDash([5, 13]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#c7a1ff";
    ctx.stroke();
    ctx.setLineDash([]);
    circle(ctx, 7, points[0][1], 24, "#2b2047", "#caa0ff", 3);
  }
  for (const [width, color] of [
    [58, "#060d17"],
    [50, map.accent + "65"],
    [46, "#102b42"],
    [32, "#152e49"],
  ]) {
    trace(ctx, map.points);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  trace(ctx, map.points);
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 13]);
  ctx.strokeStyle = map.accent + "80";
  ctx.stroke();
  ctx.setLineDash([]);
  const [sx, sy] = map.points[0];
  const [ex, ey] = map.points.at(-1);
  circle(ctx, sx + 6, sy, 28, "#251a38", "#e38cff", 3);
  circle(ctx, sx + 6, sy, 16, "#6b3d9e");
  circle(ctx, ex - 6, ey, 29, "#142b3a", map.accent, 3);
  circle(ctx, ex - 6, ey, 15, map.accent);
  return base;
}

function turret(ctx, tower, chosen) {
  ctx.save();
  ctx.translate(tower.x, tower.y);
  circle(ctx, 0, 3, 20, "#040c19bb");
  polygon(ctx, tower.type === "eco" ? 6 : 8, 18);
  ctx.fillStyle = "#101d32";
  ctx.fill();
  ctx.strokeStyle = tower.color;
  ctx.lineWidth = chosen ? 3 : 2;
  ctx.stroke();
  ctx.rotate(tower.angle || 0);
  const width = tower.type === "splash" ? 11 : 7;
  if (tower.type !== "eco") {
    ctx.fillStyle = tower.color;
    ctx.fillRect(5, -width / 2, tower.id === "sniper" ? 21 : 15, width);
  }
  circle(ctx, 0, 0, 10, "#283a55", tower.color, 2);
  circle(ctx, 0, 0, 4, tower.color);
  if (tower.branch) circle(ctx, 0, 0, 14, null, "#f7dfa8", 2);
  ctx.restore();
  for (let i = 0; i < tower.rank; i++)
    circle(
      ctx,
      tower.x + (i - (tower.rank - 1) / 2) * 6,
      tower.y + 24,
      2,
      tower.color,
    );
}

function target(ctx, enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  circle(ctx, 0, 3, enemy.boss ? 27 : 15, "#030811b5");
  if (enemy.shield > 0)
    circle(ctx, 0, 0, enemy.boss ? 33 : 21, "#75d3ff25", "#6bd2ff", 3);
  if (enemy.armor) circle(ctx, 0, 0, 18, null, "#ffcf81", 3);
  if (enemy.stun) circle(ctx, 0, 0, enemy.boss ? 30 : 18, null, "#e9edff", 2);
  if (enemy.slow) circle(ctx, 0, 0, enemy.boss ? 29 : 16, null, "#97e9ff", 2);
  if (enemy.burn) circle(ctx, 0, 0, enemy.boss ? 32 : 19, null, "#b4ef68", 1.5);
  ctx.save();
  ctx.rotate(enemy.angle);
  if (enemy.boss) ctx.scale(1.62, 1.62);
  if (enemy.shape === "rod") ctx.scale(1.3, 0.67);
  if (enemy.shape === "spiral") ctx.scale(1.3, 0.56);
  const sides = {
    diplo: 8,
    rod: 6,
    spiral: 4,
    phage: 3,
    cluster: 6,
    blob: 9,
    hex: 6,
    corona: 10,
  };
  polygon(ctx, sides[enemy.shape], 13);
  ctx.fillStyle = enemy.color;
  ctx.fill();
  ctx.strokeStyle = "#fceaff";
  ctx.lineWidth = 1.35;
  ctx.stroke();
  circle(ctx, 0, 0, 6, "#13182e");
  circle(ctx, 2, -2, 2.6, "#fff3fd");
  if (enemy.boss) {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      circle(ctx, Math.cos(a) * 14, Math.sin(a) * 14, 2, "#fff2ca");
    }
  }
  ctx.restore();
  const width = enemy.boss ? 52 : 25;
  const y = enemy.boss ? -37 : -22;
  ctx.fillStyle = "#030811";
  ctx.fillRect(-width / 2 - 1, y - 1, width + 2, 6);
  ctx.fillStyle = enemy.boss ? "#ffbc79" : "#8af1b7";
  ctx.fillRect(-width / 2, y, width * Math.max(0, enemy.hp / enemy.maxHp), 4);
  ctx.restore();
}

export class Board {
  constructor(canvas) {
    this.ctx = canvas.getContext("2d");
    this.buffers = new Map();
  }

  draw(match, blueprint, selected, cursor, reduced, aiming) {
    const ctx = this.ctx;
    const key = match.mapIndex * 2 + match.routes.length - 1;
    if (!this.buffers.has(key))
      this.buffers.set(key, background(match.map, match.routes));
    ctx.drawImage(this.buffers.get(key), 0, 0);
    if (aiming && cursor) {
      circle(ctx, cursor.x, cursor.y, 108, "#71e9ff29", "#89f1ff", 3);
      circle(ctx, cursor.x, cursor.y, 5, "#c8faff");
    }
    for (const [tower, valid, ghost] of [
      [aiming ? null : selected, true, false],
      [
        !aiming && cursor && blueprint ? { ...blueprint, ...cursor } : null,
        cursor && !match.checkPlacement(blueprint, cursor.x, cursor.y),
        true,
      ],
    ]) {
      if (!tower) continue;
      if (tower.range) {
        const color = valid ? tower.color : "#ff8a8a";
        circle(
          ctx,
          tower.x,
          tower.y,
          tower.range,
          color + "19",
          color + "b0",
          2,
        );
      }
      if (ghost)
        circle(
          ctx,
          tower.x,
          tower.y,
          16,
          valid ? "#bbf7e35c" : "#f69d9d5c",
          "#f1f7ff",
          2,
        );
    }
    match.towers.forEach((tower) => turret(ctx, tower, tower === selected));
    match.enemies.forEach((enemy) => target(ctx, enemy));
    match.shots.forEach((shot) => {
      circle(ctx, shot.x, shot.y, 7, shot.color + "48");
      circle(ctx, shot.x, shot.y, 3.5, shot.color);
    });
    if (reduced) return;
    for (const fx of match.effects) {
      ctx.globalAlpha = fx.life / 25;
      if (fx.to) {
        trace(ctx, [
          [fx.x, fx.y],
          [fx.to.x, fx.to.y],
        ]);
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else
        circle(
          ctx,
          fx.x,
          fx.y,
          5 + fx.radius * (1 - fx.life / 22),
          null,
          fx.color,
          2,
        );
    }
    ctx.globalAlpha = 1;
  }
}
