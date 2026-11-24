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
export const affinityFor = shape => enemyTypes[shape];

export function towerMultiplier(enemy, tower) {
  if (!enemy.affinity || !tower?.rank) return 1;
  const attack = towerAttack[tower.id];
  if (attack === enemy.affinity.weak) return WEAKNESS;
  if (attack === enemy.affinity.resist) return RESISTANCE;
  return 1;
}
