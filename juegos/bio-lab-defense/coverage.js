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
