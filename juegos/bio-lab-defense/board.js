import { WIDTH, HEIGHT, escortArmor } from "./engine.js?v=41";
import { towerAttack } from "./affinities.js?v=3";
import { drawEnemyModel, drawTurretModel, drawHeroModel } from "./art.js?v=5";

function trace(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

function drawCoverageGap(ctx, points) {
  ctx.save();
  ctx.setLineDash([11, 6]);
  trace(ctx, points);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#fff0a6";
  ctx.stroke();
  ctx.restore();
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
  { light: "#433827", dark: "#181522", grid: "#a87d6148", fixture: "#67463c" },
  { light: "#203e58", dark: "#051321", grid: "#4186964c", fixture: "#26536a" },
  { light: "#47324e", dark: "#180d24", grid: "#ae71944a", fixture: "#684366" },
  { light: "#26584b", dark: "#081d20", grid: "#47896c44", fixture: "#396858" },
  { light: "#382b58", dark: "#101224", grid: "#7164aa55", fixture: "#514675" },
  { light: "#5c3323", dark: "#21131b", grid: "#b36e5044", fixture: "#754838" },
  { light: "#16475c", dark: "#081927", grid: "#3b82905c", fixture: "#245b6c" },
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
  } else if (chapter === 3) {
    for (const [dx, dy, size] of [[-31, 13, 19], [21, 12, 27], [-3, -15, 28]]) {
      trace(ctx, [[dx - size, dy], [dx - size / 2, dy - size * 0.8],
        [dx + size / 2, dy - size * 0.65], [dx + size, dy + 7], [dx, dy + size / 2], [dx - size, dy]]);
      ctx.fill();
      ctx.stroke();
    }
  } else if (chapter === 4) {
    ctx.fillRect(-49, -26, 98, 52);
    ctx.strokeRect(-49, -26, 98, 52);
    for (const offset of [-24, 24]) {
      ctx.fillStyle = "#071c29";
      ctx.fillRect(offset - 13, -15, 26, 30);
      ctx.strokeStyle = accent + "5e";
      trace(ctx, [[offset - 20, 0], [offset - 10, 0], [offset - 3, -9], [offset + 4, 9], [offset + 11, 0], [offset + 20, 0]]);
      ctx.stroke();
    }
  } else if (chapter === 5) {
    circle(ctx, 0, 0, 41, palette.fixture + "85", palette.grid, 2);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = accent + "2f";
      ctx.fillRect(-13, -32, 26, 12);
      trace(ctx, [[-23, -16], [-23, -23], [-17, -28]]);
      ctx.stroke();
    }
    circle(ctx, 0, 0, 15, "#130e22", accent + "57", 2);
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

function scenery(ctx, map) {
  ctx.save();
  for (const [x, y, scale] of [[78, 67, 0.78], [384, 456, 1], [612, 86, 0.9], [823, 464, 1.15]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = map.accent + "9a";
    ctx.fillStyle = map.accent + "30";
    ctx.lineWidth = 3;
    if (map.scenery === "crystal") {
      for (const [dx, height] of [[-20, 31], [0, 54], [21, 39]]) {
        trace(ctx, [[dx - 10, 18], [dx - 9, 5 - height], [dx, -height], [dx + 10, 8 - height], [dx + 9, 18], [dx - 10, 18]]);
        ctx.fill(); ctx.stroke();
        trace(ctx, [[dx, -height], [dx + 2, 14]]);
        ctx.stroke();
      }
    } else if (map.scenery === "orbit") {
      circle(ctx, 0, 0, 29, "#151628", map.accent + "80", 3);
      for (const angle of [-0.7, 0.7]) {
        ctx.beginPath();
        ctx.ellipse(0, 0, 43, 12, angle, 0, Math.PI * 2);
        ctx.stroke();
      }
      circle(ctx, 0, 0, 5, map.accent);
    } else if (map.scenery === "forge") {
      ctx.fillRect(-41, -22, 82, 44);
      ctx.strokeRect(-41, -22, 82, 44);
      for (let dx = -32; dx <= 24; dx += 11) {
        trace(ctx, [[dx, 14], [dx + 7, -14]]);
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    } else {
      for (let dx = -26; dx <= 26; dx += 13) {
        ctx.beginPath();
        ctx.moveTo(dx, 23);
        ctx.bezierCurveTo(dx - 18, 0, dx + 17, -11, dx + 5, -35 + Math.abs(dx) / 2);
        ctx.stroke();
        circle(ctx, dx + 5, -35 + Math.abs(dx) / 2, 4, map.accent + "88");
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

function background(map, routes, chapter) {
  const base = document.createElement("canvas");
  base.width = WIDTH;
  base.height = HEIGHT;
  const ctx = base.getContext("2d");
  const palette = floors[map.floor ?? chapter];
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
  if (map.scenery) scenery(ctx, map);
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

function drawSupportNode(ctx, node) {
  ctx.save();
  ctx.translate(node.x, node.y);
  circle(ctx, 0, 3, 27, "#111426cc", node.color, 2);
  polygon(ctx, 6, 21);
  ctx.fillStyle = "#233049";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = node.color;
  ctx.stroke();
  circle(ctx, 0, 0, 11, node.color);
  ctx.fillStyle = "#14263b";
  ctx.font = "bold 13px system-ui";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(node.lane ? "B" : "A", 0, 0);
  if (node.role === "reinforcements") {
    ctx.beginPath();
    ctx.moveTo(-31, -7);
    ctx.lineTo(-37, 0);
    ctx.lineTo(-31, 7);
    ctx.moveTo(31, -7);
    ctx.lineTo(37, 0);
    ctx.lineTo(31, 7);
    ctx.stroke();
  } else if (node.role === "shield") {
    trace(ctx, [[-11, 26], [0, 34], [11, 26]]);
    ctx.stroke();
  }
  ctx.fillStyle = "#0a1320";
  ctx.fillRect(-24, -36, 48, 8);
  ctx.fillStyle = node.color;
  ctx.fillRect(-22, -34, 44 * Math.max(0, node.hp / node.maxHp), 4);
  ctx.restore();
}

function target(ctx, enemy, time, compact) {
  if (enemy.supportNode) {
    drawSupportNode(ctx, enemy);
    return;
  }
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  circle(ctx, 0, 3, enemy.boss ? 27 : 15, "#030811b5");
  if (enemy.shield > 0)
    circle(ctx, 0, 0, enemy.boss ? 33 : 21, "#75d3ff25", "#6bd2ff", 3);
  if (enemy.variant === "emitter") circle(ctx, 0, 0, 31, "#e6a34b33", "#ffbd67", 3);
  if (enemy.variant === "escort")
    circle(ctx, 0, 0, 90, "#e9b07d0e", "#e9b07d80", 2);
  if (enemy.variant === "scout" && time >= enemy.scoutReady) {
    ctx.save();
    ctx.rotate(enemy.angle);
    trace(ctx, [[-21, -9], [-16, 0], [-21, 9]]);
    ctx.strokeStyle = "#b9f4ff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  if (enemy.armor)
    circle(ctx, 0, 0, enemy.boss ? 31 : 18, null, "#ffcf81", 3);
  if (escortArmor(enemy)) {
    ctx.save();
    ctx.setLineDash([3, 4]);
    circle(ctx, 0, 0, 20, null, "#ffc286", 2);
    ctx.restore();
  }
  if (enemy.stun) circle(ctx, 0, 0, enemy.boss ? 30 : 18, null, "#e9edff", 2);
  if (enemy.slow) circle(ctx, 0, 0, enemy.boss ? 29 : 16, null, "#97e9ff", 2);
  if (enemy.burn) circle(ctx, 0, 0, enemy.boss ? 32 : 19, null, "#b4ef68", 1.5);
  if (enemy.corrodedUntil > time || enemy.anchor?.until > time) {
    ctx.save();
    ctx.setLineDash([5, 4]);
    circle(ctx, 0, 0, enemy.boss ? 37 : 24, null, enemy.anchor?.until > time ? "#c2b1ff" : "#c5ff81", 2);
    ctx.restore();
  }
  const marker = enemy.markedUntil > time ? "#ffe3a0"
    : enemy.frozenUntil > time ? "#9be9ff" : (enemy.exposedUntil > time || enemy.moduleExposureUntil > time) ? "#daaaff" : null;
  if (marker) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    circle(ctx, 0, 0, enemy.boss ? 37 : 24, null, marker, 2);
    ctx.restore();
  }
  ctx.save();
  ctx.rotate(enemy.angle);
  drawEnemyModel(ctx, enemy);
  ctx.restore();
  if (enemy.shield > 0)
    circle(ctx, 0, 0, enemy.boss ? 35 : 22, null, "#91dfff", 2);
  const width = enemy.boss ? 52 : compact ? 34 : 25;
  const y = enemy.boss ? -39 : compact ? -25 : -22;
  const barHeight = compact ? 7 : 5;
  const health = Math.max(0, enemy.hp / enemy.maxHp);
  ctx.fillStyle = "#030811";
  ctx.fillRect(-width / 2 - 2, y - 2, width + 4, barHeight + 4);
  ctx.fillStyle = "#354555";
  ctx.fillRect(-width / 2, y, width, barHeight);
  ctx.fillStyle = health < 0.3 ? "#ff7a70" : enemy.boss ? "#ffbc79" : "#9cf0bd";
  ctx.fillRect(-width / 2, y, width * health, barHeight);
  if (enemy.shield > 0) {
    const badgeRadius = compact ? 7 : 5;
    const badgeX = width / 2 + badgeRadius + 3;
    trace(ctx, [[badgeX - badgeRadius, y - 1], [badgeX + badgeRadius, y - 1], [badgeX + badgeRadius - 1, y + 5],
      [badgeX, y + badgeRadius + 5], [badgeX - badgeRadius + 1, y + 5]]);
    ctx.closePath();
    ctx.fillStyle = "#a8edff";
    ctx.strokeStyle = "#091627";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }
  if (enemy.armor > 0 || escortArmor(enemy)) {
    const armorWidth = compact ? 10 : 7;
    const armorX = -width / 2 - armorWidth - 5;
    ctx.fillStyle = "#091627";
    ctx.fillRect(armorX - 2, y - 2, armorWidth + 4, barHeight + 4);
    ctx.fillStyle = "#ffc47d";
    ctx.fillRect(armorX, y, armorWidth, barHeight);
  }
  ctx.restore();
}

function drawMissionEquipment(ctx, match) {
  const objective = match.defenseObjective;
  if (objective) {
    const approach = match.state === "build" ? match.objectiveApproach(objective) : null;
    ctx.save();
    if (approach) {
      trace(ctx, approach.points);
      ctx.lineWidth = 15;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#80f8c852";
      ctx.stroke();
      ctx.setLineDash([6, 10]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#9cffdc";
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const [x, y] = approach?.points.at(-1) || [objective.x, objective.y];
    ctx.translate(x, y);
    circle(ctx, 0, 0, 23, "#11282c", "#80f8c8", 2);
    ctx.fillStyle = "#07121e";
    ctx.fillRect(-12, -11, 24, 15);
    ctx.fillStyle = "#a3ffe2";
    ctx.fillRect(-9, -8, 18, 8);
    for (let i = 0; i < 4; i++)
      circle(ctx, (i - 1.5) * 6, 9, 2, i < objective.hp ? "#89fac2" : "#4a394a");
    ctx.restore();
  }
  const isolated = match.isolatedLane(match.state === "build" ? match.wave + 1 : match.wave);
  if (isolated !== null) {
    const [x, y] = match.routes[isolated].points[0];
    circle(ctx, x + 17, y, 23, "#5fcee025", "#a8efff", 2);
  }
  const barrier = match.barrier;
  if (barrier && (!barrier.used || barrier.until > match.time)) {
    const active = barrier.until > match.time;
    circle(ctx, barrier.x, barrier.y, active ? 115 : 23,
      active ? "#ffe4a02a" : "#332839", "#ffc979", active ? 3 : 2);
    ctx.strokeStyle = "#ffcf84";
    ctx.lineWidth = 4;
    trace(ctx, [[barrier.x - 17, barrier.y + 10], [barrier.x + 17, barrier.y - 10]]);
    ctx.stroke();
  }
}

function drawCircuit(ctx, tower, partner, preview = false) {
  ctx.save();
  trace(ctx, [[tower.x, tower.y], [partner.x, partner.y]]);
  ctx.lineWidth = 13;
  ctx.strokeStyle = "#a66eff36";
  ctx.stroke();
  ctx.setLineDash([8, 5]);
  ctx.lineWidth = preview ? 4 : 2;
  ctx.strokeStyle = preview ? "#f5d1ff" : "#c494ffce";
  ctx.stroke();
  ctx.restore();
}

function drawHero(ctx, hero, cursor, moving, showSkill) {
  const point = moving && cursor && cursor.x >= 19 && cursor.x <= WIDTH - 19 &&
      cursor.y >= 19 && cursor.y <= HEIGHT - 19
    ? cursor
    : hero.destination;
  if (point) {
    ctx.save();
    ctx.setLineDash([8, 7]);
    trace(ctx, [[hero.x, hero.y], [point.x, point.y]]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = hero.color;
    ctx.stroke();
    ctx.restore();
    circle(ctx, point.x, point.y, 13, "#0a1725aa", hero.color, 2);
  }
  if (moving || showSkill) {
    const center = moving && point ? point : hero;
    circle(ctx, center.x, center.y, hero.abilityRange, hero.color + "13", hero.color + "bd", 2);
  }
  ctx.save();
  ctx.translate(hero.x, hero.y);
  circle(ctx, 0, 3, 21, "#060d1ad9");
  drawHeroModel(ctx, hero);
  ctx.restore();
}

function highlightCoverage(ctx, tower, routes, range = tower.range, color = tower.color, minRange = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, range, 0, Math.PI * 2);
  if (minRange) {
    ctx.moveTo(tower.x + minRange, tower.y);
    ctx.arc(tower.x, tower.y, minRange, 0, Math.PI * 2);
  }
  ctx.clip("evenodd");
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
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
    { gatePreview, movingHero, movingTower, skillPreview, upgradePreview, snapOrigin, breach = null, reviewGap = null, routePlan = false, focusTarget = match.focusTarget, fireCoverage = null, previewPowerCut, affinityProfiles = [] } = {},
  ) {
    const ctx = this.ctx;
    const key = match.mission
      ? `${match.level}:${match.fixedLayout}:${match.gateDiverted}:${!!match.routeEvent && match.routes[1] === match.routeEvent.alternate}`
      : `reto-${match.mapIndex}`;
    if (!this.buffers.has(key)) {
      if (this.buffers.size >= 4) this.buffers.delete(this.buffers.keys().next().value);
      this.buffers.set(key, background(match.map, match.routes, match.mapIndex));
    }
    ctx.drawImage(this.buffers.get(key), 0, 0);
    if (breach !== null) {
      ctx.save();
      if (breach.objective) {
        const { lane, points } = breach.objective;
        const [x, y] = points.at(-1);
        trace(ctx, points);
        ctx.lineJoin = "round";
        ctx.lineWidth = 11;
        ctx.strokeStyle = lane ? "#f0a6ff" : "#ff826b";
        ctx.stroke();
        circle(ctx, x, y, 22, "#4c222f", "#ffb590", 4);
        trace(ctx, [[x - 7, y - 7], [x + 7, y + 7]]);
        ctx.stroke();
        trace(ctx, [[x + 7, y - 7], [x - 7, y + 7]]);
        ctx.stroke();
      } else {
        for (const [lane, count] of breach.lanes.entries()) {
          if (!count) continue;
          const { points } = match.routes[lane];
          trace(ctx, points);
          ctx.lineJoin = "round";
          ctx.lineWidth = 11;
          ctx.strokeStyle = lane ? "#f0a6ff" : "#ff826b";
          ctx.stroke();
          circle(ctx, 19, points[0][1], 13, ctx.strokeStyle, "#501f2e", 4);
        }
      }
      for (const { lane, waypoint } of breach.gaps.values()) {
        const points = breach.objective?.points || match.routes[lane].points;
        drawCoverageGap(ctx, points.slice(waypoint - 1, waypoint + 1));
      }
      ctx.restore();
      return;
    }
    const routeEvent = match.routeEvent;
    const routeStatus = match.routeEventStatus;
    if (routeEvent && (routePlan || routeStatus === "warning" || routeStatus === "active")) {
      ctx.save();
      ctx.setLineDash([12, 7]);
      if (routePlan || routeStatus === "warning") {
        trace(ctx, routeEvent.alternate.points);
        ctx.strokeStyle = "#fff0aa";
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      const area = routeEvent.blackout;
      if (area) circle(ctx, area.x, area.y, area.radius, "#d79b421c", "#ffd277c9", 4);
      ctx.restore();
    }
    const cutoff = match.powerCuts?.[match.coverageWave];
    const warning = !cutoff && match.state === "build" && match.powerCuts?.[match.coverageWave + 1];
    const powerCut = previewPowerCut || cutoff || warning;
    if (powerCut) {
      ctx.save();
      ctx.setLineDash([12, 7]);
      circle(ctx, powerCut.x, powerCut.y, powerCut.radius,
        warning && !previewPowerCut ? "#d79b421a" : "#d79b4238", "#ffd277", 4);
      ctx.restore();
    }
    const showVacantSites = movingTower || match.towerLimit == null || match.towers.length < match.towerLimit;
    for (const site of match.buildSites || []) {
      if (match.firePads.includes(site)) continue;
      ctx.save();
      ctx.translate(site.x, site.y);
      polygon(ctx, 6, 21);
      ctx.fillStyle = "#0c2630e8";
      ctx.strokeStyle = "#8ebdb6";
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();
      if (showVacantSites && !match.towers.some(tower => tower.x === site.x && tower.y === site.y)) {
        trace(ctx, [[-6, 0], [6, 0]]);
        ctx.stroke();
        trace(ctx, [[0, -6], [0, 6]]);
        ctx.stroke();
      }
      ctx.restore();
    }
    const activePad = match.activePad();
    for (const [index, pad] of match.firePads.entries()) {
      const boosted = activePad == null || activePad === index;
      const tint = boosted ? match.map.accent : "#6a7883";
      ctx.save();
      ctx.translate(pad.x, pad.y);
      polygon(ctx, 6, 26);
      ctx.fillStyle = boosted ? "#193a38" : "#141e29";
      ctx.fill();
      ctx.strokeStyle = tint;
      ctx.lineWidth = boosted ? 4 : 2;
      ctx.stroke();
      circle(ctx, 0, 0, 20, null, tint + "88", 1);
      if (activePad != null) {
        ctx.font = "bold 20px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = tint;
        ctx.fillText(index === 0 ? "A" : "B", 0, 0);
      } else {
        for (const y of [-4, 4]) {
          trace(ctx, [[-7, y + 4], [0, y - 2], [7, y + 4]]);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    drawMissionEquipment(ctx, match);
    if (reviewGap) drawCoverageGap(ctx, reviewGap);
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
    const coverageWave = match.coverageWave;
    const coverageRoutes = match.routesForWave(coverageWave);
    const lens = match.lens(coverageWave);
    if (lens) {
      const points = coverageRoutes[lens.lane].points;
      ctx.save();
      ctx.setLineDash([12, 8]);
      ctx.strokeStyle = "#d5c2ff";
      ctx.lineWidth = 5;
      for (const end of lens.segments) {
        trace(ctx, [points[end - 1], points[end]]);
        ctx.stroke();
      }
      const [start, end] = points.slice(lens.segments[0] - 1, lens.segments[0] + 1);
      const x = (start[0] + end[0]) / 2, y = (start[1] + end[1]) / 2;
      ctx.setLineDash([]);
      circle(ctx, x, y, 11, "#221b37", "#d5c2ff", 2);
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(end[1] - start[1], end[0] - start[0]));
      trace(ctx, [[-9, 0], [0, -4], [9, 0], [0, 4], [-9, 0]]);
      ctx.strokeStyle = "#f1ddff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    if (match.fixedLayout && match.state === "build") {
      const modules = match.preview?.finale?.storyModules || [];
      for (const module of modules) {
        const [x, y] = coverageRoutes[module.lane].points[module.waypoint];
        ctx.save();
        ctx.setLineDash([5, 5]);
        circle(ctx, x, y, 25, "#102338c0", module.color, 3);
        ctx.fillStyle = module.color;
        ctx.font = "bold 19px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(module.lane ? "B" : "A", x, y);
        ctx.restore();
      }
    }
    const draft = movingTower || blueprint;
    const ghost = !aiming && !hovered && cursor && draft ? { ...draft, ...cursor } : null;
    const validSpot = ghost && !(movingTower
      ? match.checkRelocation(movingTower, cursor.x, cursor.y)
      : match.checkPlacement(blueprint, cursor.x, cursor.y));
    if (movingTower?.range && validSpot && !match.towerOffline(movingTower, coverageWave)) {
      ctx.save();
      ctx.setLineDash([7, 6]);
      highlightCoverage(ctx, movingTower, coverageRoutes, movingTower.range, "#ffac91");
      ctx.restore();
    }
    if (movingTower && ghost) {
      ctx.save();
      ctx.setLineDash([8, 7]);
      trace(ctx, [[movingTower.x, movingTower.y], [cursor.x, cursor.y]]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = validSpot ? movingTower.color : "#ff8a8a";
      ctx.stroke();
      ctx.restore();
    }
    if (snapOrigin && ghost) {
      circle(ctx, snapOrigin.x, snapOrigin.y, 4, "#f6fbffa8");
      trace(ctx, [[snapOrigin.x, snapOrigin.y], [ghost.x, ghost.y]]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#b6f8df";
      ctx.stroke();
    }
    for (const [tower, valid, isGhost] of [
      [aiming || movingTower || upgradePreview ? null : hovered || selected, true, false],
      [
        ghost,
        validSpot,
        true,
      ],
    ]) {
      if (!tower) continue;
      if (tower.range && !match.towerOffline(tower, coverageWave)) {
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
        if (valid) {
          highlightCoverage(ctx, tower, coverageRoutes);
          if (!isGhost) {
            const attack = towerAttack[tower.id];
            affinityProfiles.forEach((profile, lane) => {
              const counts = profile.get(attack);
              if (!counts || counts.resist <= counts.weak) return;
              ctx.save();
              ctx.setLineDash([9, 9]);
              highlightCoverage(ctx, tower, [coverageRoutes[lane]], tower.range, "#ffd09a");
              ctx.restore();
            });
          }
        }
      }
      if (isGhost) {
        ctx.save();
        circle(ctx, tower.x, tower.y, 22, valid ? "#19352dde" : "#55232be0",
          valid ? "#a5eed3" : "#ff9a95", 2);
        ctx.translate(tower.x, tower.y);
        ctx.rotate(tower.angle || 0);
        ctx.globalAlpha = valid ? 0.85 : 0.5;
        drawTurretModel(ctx, tower);
        ctx.restore();
      }
    }
    if (upgradePreview?.range && !match.towerOffline(upgradePreview.tower, coverageWave)) {
      const { tower, range, branch } = upgradePreview;
      circle(ctx, tower.x, tower.y, range, null, "#ffd99cba", 2);
      highlightCoverage(ctx, tower, coverageRoutes, range, "#ffd99c", tower.range);
      if (branch?.link) {
        const partner = match.linkPartner(tower, coverageWave);
        if (partner) drawCircuit(ctx, tower, partner, true);
        else circle(ctx, tower.x, tower.y, 175, null, "#ca94ff", 2);
      }
    }
    for (const tower of match.towers) {
      if (!tower.branch?.link || match.towerOffline(tower, coverageWave)) continue;
      const partner = match.linkPartner(tower, coverageWave);
      if (partner) drawCircuit(ctx, tower, partner);
    }
    if (fireCoverage?.length && focusTarget) {
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffe292a8";
      for (const tower of fireCoverage) {
        trace(ctx, [[tower.x, tower.y], [focusTarget.x, focusTarget.y]]);
        ctx.stroke();
      }
      ctx.restore();
    }
    match.towers.forEach((tower) =>
      turret(ctx, tower, tower === selected || tower === hovered),
    );
    if (fireCoverage)
      for (const tower of fireCoverage)
        circle(ctx, tower.x, tower.y, 24, null, "#ffe292", 3);
    for (const tower of match.towers) {
      if (match.state === "wave" && tower.relayUntil > match.time)
        circle(ctx, tower.x, tower.y, 28, null, "#ffe394", 2);
      if (!match.towerOffline(tower, coverageWave)) continue;
      circle(ctx, tower.x, tower.y, 24, "#091024a6", "#ffd890", 2);
      trace(ctx, [[tower.x - 12, tower.y + 9], [tower.x + 12, tower.y - 9]]);
      ctx.strokeStyle = "#ffd890";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (gatePreview) {
      for (const tower of match.gateBlockers) {
        circle(ctx, tower.x, tower.y, 29, null, "#ffca7b", 3);
        circle(ctx, tower.x + 20, tower.y - 19, 5, "#ffe6a6", "#432c2c", 2);
      }
    }
    if (match.hero) drawHero(ctx, match.hero, cursor, movingHero, skillPreview);
    const cue = match.combatCue;
    if (cue?.until > match.time) {
      const markers = {
        shield: [25, "#a5eaff"], objective: [34, "#8bf9bd"], phase: [46, "#ff9a76"],
      };
      const [radius, color] = markers[cue.kind];
      circle(ctx, cue.x, cue.y, radius, null, color, 2);
      circle(ctx, cue.x, cue.y, radius + 6, null, color + "66", 2);
    }
    const compactCombat = ctx.canvas.clientWidth < 550;
    match.enemies.forEach((enemy) => target(ctx, enemy, match.time, compactCombat));
    if (focusTarget?.hp > 0 && !focusTarget.escaped) {
      ctx.save();
      ctx.translate(focusTarget.x, focusTarget.y);
      const size = focusTarget.boss ? 39 : 25;
      for (let i = 0; i < 4; i++) {
        trace(ctx, [[size - 10, -size], [size, -size], [size, 10 - size]]);
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#142235";
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffe292";
        ctx.stroke();
        ctx.rotate(Math.PI / 2);
      }
      ctx.restore();
    }
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
