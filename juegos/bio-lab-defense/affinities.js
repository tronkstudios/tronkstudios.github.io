// Combat properties for the game's enemy models.
export const towerAttack = {
  nanolaser: "Láser", sniper: "Láser", interferon: "Láser",
  plasma: "Térmico", uv: "Térmico", omega: "Térmico",
  cryo: "Control", magnet: "Control", toxin: "Corrosión", tesla: "Eléctrico", phagocyte: "Impacto",
};

const enemyTypes = {
  rod: { weak: "Térmico", resist: "Láser" },
  spiral: { weak: "Control", resist: "Impacto" },
  phage: { weak: "Láser", resist: "Térmico" },
  cluster: { weak: "Impacto", resist: "Control" },
  lactobacillus: { weak: "Corrosión", resist: "Térmico" },
  hex: { weak: "Eléctrico", resist: "Láser" },
  rhinovirus: { weak: "Láser", resist: "Eléctrico" },
  "e-coli": { weak: "Térmico", resist: "Corrosión" },
  norovirus: { weak: "Control", resist: "Eléctrico" },
  smallpox: { weak: "Eléctrico", resist: "Control" },
};
export const WEAKNESS = 1.25;
export const RESISTANCE = 0.75;
export const STORY_WEAKNESS = 1.5;
export const STORY_RESISTANCE = 0.5;

export function affinityFor(shape, story = false) {
  const affinity = enemyTypes[shape];
  if (!story || !affinity) return affinity;
  return { ...affinity, weakness: STORY_WEAKNESS, resistance: STORY_RESISTANCE };
}

export const damagePercent = multiplier => Math.round(Math.abs(multiplier - 1) * 100);

export function towerMultiplier(enemy, tower) {
  if (!enemy.affinity || !tower?.rank) return 1;
  const attack = towerAttack[tower.id];
  if (attack === enemy.affinity.weak) return enemy.affinity.weakness ?? WEAKNESS;
  if (attack === enemy.affinity.resist) return enemy.affinity.resistance ?? RESISTANCE;
  return 1;
}

export function waveAffinities(order, laneCount) {
  const lanes = Array.from({ length: laneCount }, () => new Map());
  for (const { lane, spec } of order) {
    const affinity = affinityFor(spec.shape);
    if (!affinity) continue;
    for (const [kind, attack] of Object.entries(affinity)) {
      const counts = lanes[lane].get(attack) || { weak: 0, resist: 0 };
      counts[kind]++;
      lanes[lane].set(attack, counts);
    }
  }
  return lanes;
}
