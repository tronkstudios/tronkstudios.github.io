import { WIDTH, HEIGHT } from "./engine.js?v=6";
import { drawEnemyModel, drawTurretModel } from "./art.js?v=1";

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

const floors = [
  { light: "#173958", dark: "#061322", grid: "#32648848", fixture: "#18425b" },
  { light: "#153c37", dark: "#061b20", grid: "#37776b48", fixture: "#1e5245" },
  { light: "#392c55", dark: "#120c24", grid: "#705b9a4f", fixture: "#483767" },
];

function floorTile(ctx, x, y, chapter, palette, accent) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = palette.fixture + "68";
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 2;
  if (chapter === 0) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-45, -24, 90, 48, 9);
    else ctx.rect(-45, -24, 90, 48);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#070f1c88";
    for (let i = -31; i <= 29; i += 15) ctx.fillRect(i, -14, 7, 28);
  } else if (chapter === 1) {
    circle(ctx, 0, 0, 34, palette.fixture + "85", palette.grid, 2);
    circle(ctx, 0, 0, 25, "#081826aa", accent + "44", 2);
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.ellipse(10, 9, 9, 13, -0.6, 0, Math.PI * 2);
      ctx.fillStyle = palette.fixture;
      ctx.fill();
    }
  } else {
    polygon(ctx, 6, 38);
    ctx.fill();
    ctx.stroke();
    polygon(ctx, 6, 23);
    ctx.strokeStyle = accent + "43";
    ctx.stroke();
  }
  circle(ctx, 0, 0, 3, accent + "88");
  ctx.restore();
}

function directionMarks(ctx, points, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i - 1];
    const dx = points[i][0] - x,
      dy = points[i][1] - y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    for (let step = 46; step <= length - 23; step += 82) {
      ctx.save();
      ctx.translate(x + (dx * step) / length, y + (dy * step) / length);
      ctx.rotate(angle);
      trace(ctx, [
        [-5, -6],
        [2, 0],
        [-5, 6],
      ]);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function background(map, routes, chapter) {
  const base = document.createElement("canvas");
  base.width = WIDTH;
  base.height = HEIGHT;
  const ctx = base.getContext("2d");
  const palette = floors[chapter];
  const glow = ctx.createRadialGradient(490, 240, 36, 490, 270, 595);
  glow.addColorStop(0, palette.light);
  glow.addColorStop(1, palette.dark);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.lineWidth = 1;
  for (let y = 12; y < HEIGHT; y += 96) {
    for (let x = 12; x < WIDTH; x += 144) {
      ctx.fillStyle = (x + y) % 5 ? "#07172225" : map.accent + "0c";
      ctx.fillRect(x, y, 120, 72);
      ctx.strokeStyle = palette.grid;
      ctx.strokeRect(x + 0.5, y + 0.5, 120, 72);
      ctx.fillStyle = "#a1b4bc32";
      ctx.fillRect(x + 7, y + 7, 3, 3);
      ctx.fillRect(x + 110, y + 62, 3, 3);
    }
  }
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 48) {
    trace(ctx, [
      [x, 0],
      [x, HEIGHT],
    ]);
    ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 48) {
    trace(ctx, [
      [0, y],
      [WIDTH, y],
    ]);
    ctx.stroke();
  }
  for (const [x, y] of [
    [104, 255],
    [341, 220],
    [680, 345],
    [817, 85],
    [789, 493],
  ]) {
    floorTile(ctx, x, y, chapter, palette, map.accent);
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
    directionMarks(ctx, points, "#c7a1ffa8");
    circle(ctx, 7, points[0][1], 24, "#2b2047", "#caa0ff", 3);
  }
  for (const [width, color] of [
    [58, "#060d17"],
    [50, map.accent + "65"],
    [46, "#1c3647"],
    [38, "#091b29"],
    [31, "#142e3d"],
  ]) {
    trace(ctx, map.points);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  ctx.setLineDash([2, 16]);
  trace(ctx, map.points);
  ctx.strokeStyle = map.accent + "25";
  ctx.lineWidth = 29;
  ctx.lineCap = "butt";
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = "round";
  directionMarks(ctx, map.points, map.accent + "ad");
  if (routes.length > 1) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 18px system-ui";
    for (let i = 0; i < routes.length; i++) {
      const [, y] = routes[i].points[0];
      const color = i === 0 ? map.accent : "#caa0ff";
      circle(ctx, 34, y - 35, 15, "#131d30", color, 2);
      ctx.fillStyle = color;
      ctx.fillText(i === 0 ? "A" : "B", 34, y - 35);
    }
  }
  const [sx, sy] = map.points[0];
  const [ex, ey] = map.points.at(-1);
  circle(ctx, sx + 7, sy, 28, "#12233a", map.accent, 3);
  circle(ctx, sx + 7, sy, 14, map.accent + "60");
  const core = ex - 13;
  ctx.save();
  ctx.translate(core, ey);
  polygon(ctx, 8, 41);
  ctx.fillStyle = "#101c2c";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = map.accent + "75";
  ctx.stroke();
  circle(ctx, 0, 0, 31, "#172b40", map.accent, 2);
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    circle(ctx, Math.cos(angle) * 34, Math.sin(angle) * 34, 2, "#c1d6dd");
  }
  circle(ctx, 0, 0, 25, map.accent + "36", map.accent + "66");
  polygon(ctx, 6, 17);
  ctx.fillStyle = map.accent;
  ctx.fill();
  polygon(ctx, 4, 8);
  ctx.fillStyle = "#f8fdff";
  ctx.fill();
  ctx.restore();
  return base;
}

function turret(ctx, tower, chosen) {
  ctx.save();
  ctx.translate(tower.x, tower.y);
  circle(ctx, 0, 3, 20, "#040c19bb");
  if (chosen) circle(ctx, 0, 0, 26, null, "#d3f7ff", 2);
  if (tower.branch) circle(ctx, 0, 0, 23, null, "#f7d494", 2);
  ctx.rotate(tower.angle || 0);
  drawTurretModel(ctx, tower);
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
  if (enemy.armor)
    circle(ctx, 0, 0, enemy.boss ? 31 : 18, null, "#ffcf81", 3);
  if (enemy.stun) circle(ctx, 0, 0, enemy.boss ? 30 : 18, null, "#e9edff", 2);
  if (enemy.slow) circle(ctx, 0, 0, enemy.boss ? 29 : 16, null, "#97e9ff", 2);
  if (enemy.burn) circle(ctx, 0, 0, enemy.boss ? 32 : 19, null, "#b4ef68", 1.5);
  ctx.save();
  ctx.rotate(enemy.angle);
  drawEnemyModel(ctx, enemy);
  ctx.restore();
  if (enemy.shield > 0)
    circle(ctx, 0, 0, enemy.boss ? 35 : 22, null, "#91dfff", 2);
  const width = enemy.boss ? 52 : 25;
  const y = enemy.boss ? -39 : -22;
  const health = Math.max(0, enemy.hp / enemy.maxHp);
  ctx.fillStyle = "#030811";
  ctx.fillRect(-width / 2 - 1, y - 1, width + 2, 7);
  ctx.fillStyle = "#354555";
  ctx.fillRect(-width / 2, y, width, 5);
  ctx.fillStyle = health < 0.3 ? "#ff7a70" : enemy.boss ? "#ffbc79" : "#9cf0bd";
  ctx.fillRect(-width / 2, y, width * health, 5);
  ctx.restore();
}

function highlightCoverage(ctx, tower, routes) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
  ctx.clip();
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = tower.color;
  for (const { points } of routes) {
    trace(ctx, points);
    ctx.stroke();
  }
  ctx.restore();
}

export class Board {
  constructor(canvas) {
    this.ctx = canvas.getContext("2d");
    this.buffers = new Map();
  }

  draw(
    match,
    blueprint,
    selected,
    cursor,
    reduced,
    aiming,
    hovered = null,
    gatePreview = false,
  ) {
    const ctx = this.ctx;
    const key = match.mission
      ? `${match.level}:${match.gateDiverted}`
      : `reto-${match.mapIndex}`;
    if (!this.buffers.has(key))
      this.buffers.set(
        key,
        background(match.map, match.routes, match.mapIndex),
      );
    ctx.drawImage(this.buffers.get(key), 0, 0);
    if (gatePreview && match.alternateRoute) {
      ctx.save();
      trace(ctx, match.alternateRoute.points);
      ctx.lineWidth = 8;
      ctx.lineJoin = "round";
      ctx.setLineDash([14, 11]);
      ctx.strokeStyle = "#ffe19e";
      ctx.stroke();
      ctx.restore();
    }
    if (aiming && cursor) {
      circle(ctx, cursor.x, cursor.y, 108, "#71e9ff29", "#89f1ff", 3);
      circle(ctx, cursor.x, cursor.y, 5, "#c8faff");
    }
    for (const [tower, valid, ghost] of [
      [aiming ? null : hovered || selected, true, false],
      [
        !aiming && !hovered && cursor && blueprint
          ? { ...blueprint, ...cursor }
          : null,
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
        if (valid) highlightCoverage(ctx, tower, match.routes);
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
    match.towers.forEach((tower) =>
      turret(ctx, tower, tower === selected || tower === hovered),
    );
    match.enemies.forEach((enemy) => target(ctx, enemy));
    match.shots.forEach((shot) => {
      if (!reduced) {
        const angle = Math.atan2(shot.target.y - shot.y, shot.target.x - shot.x);
        const length = shot.tower.id === "sniper" ? 25 : 13;
        trace(ctx, [
          [shot.x - Math.cos(angle) * length, shot.y - Math.sin(angle) * length],
          [shot.x, shot.y],
        ]);
        ctx.strokeStyle = shot.color + "a0";
        ctx.lineWidth = shot.type === "splash" ? 4 : 2.5;
        ctx.stroke();
      }
      circle(ctx, shot.x, shot.y, 7, shot.color + "48");
      circle(ctx, shot.x, shot.y, shot.type === "splash" ? 4.5 : 3, shot.color);
      circle(ctx, shot.x, shot.y, 1.5, "#f0fbff");
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
