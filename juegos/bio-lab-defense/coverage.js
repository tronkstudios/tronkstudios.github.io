import { WIDTH, HEIGHT } from "./engine.js?v=37";

// Intersect each straight section of the route with the tower's range circle.
export function routeCoverage(route, tower) {
  return routeTeamCoverage(route, [tower]);
}

export function routeTeamCoverage(route, towers) {
  let covered = 0;
  const { points, remaining } = route;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const length = Math.hypot(bx - ax, by - ay);
    if (!length) continue;
    const ux = (bx - ax) / length, uy = (by - ay) / length;
    const intervals = [];
    for (const tower of towers) {
      const dx = tower.x - ax, dy = tower.y - ay;
      const perpendicular = dx * uy - dy * ux;
      const chordSquared = tower.range ** 2 - perpendicular ** 2;
      if (chordSquared <= 0) continue;
      const projection = dx * ux + dy * uy;
      const half = Math.sqrt(chordSquared);
      const from = Math.max(0, projection - half);
      const to = Math.min(length, projection + half);
      if (to > from) intervals.push([from, to]);
    }
    intervals.sort(([a], [b]) => a - b);
    let end = 0;
    for (const [from, to] of intervals) {
      covered += Math.max(0, to - Math.max(from, end));
      end = Math.max(end, to);
    }
  }
  return remaining[0] ? Math.round(100 * covered / remaining[0]) : 0;
}


// Compare the whole defense so moving a tower into an already covered lane has less value.
export function suggestPowerRelocation(match, tower) {
  const wave = match.coverageWave;
  if (match.state !== "build" || !match.towers.includes(tower) || !match.towerOffline(tower, wave))
    return null;
  const lanes = match.routesForWave(wave).flatMap((route, lane) =>
    match.preview.lanes[lane] ? [{ route, lane, count: match.preview.lanes[lane] }] : []);
  const allies = match.towers.filter(other => other !== tower &&
    other.type !== "eco" && !match.towerOffline(other, wave));
  const attack = tower.type !== "eco";
  const baseline = lanes.map(({ route }) => routeTeamCoverage(route, allies));
  let best = null;
  const sites = match.buildSites || Array.from({ length: Math.floor((WIDTH - 140) / 20) + 1 }, (_, column) =>
    Array.from({ length: Math.floor((HEIGHT - 140) / 20) + 1 }, (_, row) => ({ x: 70 + column * 20, y: 70 + row * 20 }))).flat();
  for (const { x, y } of sites) {
    const point = { x, y, range: tower.range };
    if (match.towerOffline(point, wave) || match.checkRelocation(tower, x, y)) continue;
    const coverage = attack ? lanes.map(({ route }) => routeTeamCoverage(route, [...allies, point])) : baseline;
    const score = lanes.reduce((total, { count }, i) => total + count * coverage[i], 0);
    const nextCut = match.towerOffline(point, wave + 1);
    const distance = Math.hypot(tower.x - x, tower.y - y);
    if (best && score < best.score) continue;
    if (best && score === best.score) {
      if (nextCut && !best.nextCut) continue;
      if (nextCut === best.nextCut && distance >= best.distance) continue;
    }
    best = { x, y, coverage, score, nextCut, distance };
  }
  if (!best) return null;
  return {
    point: { x: best.x, y: best.y },
    nextCut: best.nextCut,
    lanes: attack ? lanes.map(({ lane }, i) => ({ lane, before: baseline[i], after: best.coverage[i] })) : [],
  };
}
