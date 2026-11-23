import { BLUEPRINTS, PATHOGEN_TYPES, BOSS_CATALOG, reactorOutput, specializations, upgradeCost } from "./engine.js?v=14";
import { drawEnemyModel, drawTurretModel } from "./art.js?v=4";

const towerAdvice = {
  nanolaser: "Una buena primera torre. Colócala donde su alcance cubra dos tramos del conducto.",
  cryo: "Alarga el tiempo que pasan los enemigos bajo fuego. Combínala con Pulso Plasma en una curva.",
  phagocyte: "Su golpe fuerte pierde menos daño frente al blindaje. Colócalo junto a una curva para compensar su alcance corto.",
  plasma: "Colócalo donde los enemigos se junten. Crio-Gel ayuda a mantenerlos en el área de impacto.",
  toxin: "Aplícalo al principio de una ruta larga para que el daño siga actuando mientras avanzan.",
  tesla: "Prioriza las entradas con grupos compactos para que sus descargas encuentren objetivos cercanos.",
  sniper: "Cubre varias rutas con una sola torre. Selecciona Mayor resistencia para concentrar los disparos en los jefes.",
  ribosome: "Instálalo fuera de los mejores puntos de tiro. Empieza pronto para acumular ATP a lo largo de varias oleadas.",
  magnet: "Su cadencia ayuda a renovar la ralentización. Úsalo antes de un cruce para dar tiempo a las torres de área.",
  uv: "Su radio de impacto inicial es mayor que el de Pulso Plasma. Aprovéchalo en cruces y curvas cerradas.",
  interferon: "Mantiene fuego frecuente sobre objetivos individuales. Combínalo con una torre de área en rutas mixtas.",
  omega: "Combina impactos fuertes con daño en área. Resérvale una posición que cubra las rutas con más tráfico.",
};

const enemyAdvice = {
  diplo: ["Bacteria", "Amenaza ligera. Nano-Láser cubre bien las primeras oleadas."],
  rod: ["Bacteria", "Más resistente y lento que el neumococo. Fagocito puede aprovechar su paso por curvas cortas."],
  spiral: ["Bacteria", "Avanza deprisa y aparece como refuerzo de varios jefes. Cubre las entradas con Crio-Gel."],
  phage: ["Virus", "Combina velocidad media y más vida que los primeros enemigos. Acumula cobertura en las curvas."],
  cluster: ["Bacteria", "Avanza despacio. Si llega con blindaje como refuerzo de Viruela, usa golpes fuertes o Perforante."],
  lactobacillus: ["Bacteria", "Tiene mucha vida y avanza despacio. Aplica Ácido Lítico al inicio del recorrido."],
  hex: ["Virus", "El enemigo común más rápido. Coloca Crio-Gel o Imán Químico cerca de su entrada."],
  rhinovirus: ["Virus", "Tiene buena resistencia sin perder movilidad. Combina daño sostenido y ralentización."],
  "e-coli": ["Bacteria", "Es el enemigo común con más vida base. Enfócalo con CRISPR-Beam o varias torres en el mismo tramo."],
  norovirus: ["Virus", "Se incorpora al tramo final de la campaña. Frena su avance antes de los últimos cruces."],
};

const bossAdvice = {
  plague: ["Yersinia pestis", "Activa un escudo y llama refuerzos al perder un tercio de su vida. Reserva el pulso para el escudo."],
  cholera: ["Vibrio cholerae", "Al activar su escudo envía refuerzos por la otra entrada si hay dos. Reparte la cobertura antes de iniciar la oleada."],
  influenza: ["Virus de la gripe A (H1N1)", "En el sector 10 anuncia una entrada de refuerzos en cada cambio de fase. Vigila el aviso antes de gastar el pulso."],
  tuberculosis: ["Mycobacterium tuberculosis", "Empieza con escudo y blindaje. Combina el pulso táctico con torres de especialización Perforante."],
  polio: ["Poliovirus", "Tiene mucha vida y avanza despacio al principio. Refuerza el último tramo para cuando acelere."],
  smallpox: ["Virus variola", "En el sector 22 abre dos nodos de apoyo. Destruye ambos para romper el escudo o elimina uno y resiste los refuerzos del otro."],
  measles: ["Virus del sarampión", "En Refrigeración entra por A y acelera dos veces. Prepara ralentización y cobertura más cerca del núcleo."],
  diphtheria: ["Corynebacterium diphtheriae", "En Refrigeración entra blindada por B y activa un escudo al cambiar de fase. Reserva el pulso para ese momento."],
};

const categories = {
  tower: { entries: BLUEPRINTS, caption: "Costes y estadísticas de rango 1. La especialización se elige en rango 3." },
  enemy: { entries: PATHOGEN_TYPES, caption: "La vida y la velocidad cambian según el sector y la oleada. Algunas variantes llegan blindadas o escudadas." },
  boss: { entries: BOSS_CATALOG, caption: "Los jefes cambian de fase al quedarles dos tercios y un tercio de vida." },
};
const number = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function statistics(rows) {
  const list = element("dl", undefined, "codex-stats");
  for (const [label, value] of rows) {
    const stat = element("div");
    stat.append(element("dt", label), element("dd", value));
    list.append(stat);
  }
  return list;
}

function towerStats(tower) {
  const economy = tower.type === "eco";
  return [
    ["Coste", `${tower.cost} ATP`],
    [economy ? "Producción" : "Daño por impacto", economy ? `${reactorOutput(1)} ATP` : tower.damage],
    [economy ? "Ciclo" : "Tiempo entre disparos", `${number.format(tower.fireRate / 60)} s`],
    ...(economy ? [] : [["Alcance", tower.range]]),
    ["Disponible desde", `Sector ${tower.unlock}`],
  ];
}

function model(entry, tower) {
  const canvas = element("canvas", undefined, "codex-model");
  canvas.width = canvas.height = 192;
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  ctx.translate(96, 96);
  ctx.scale(tower ? 2.2 : 2.05, tower ? 2.2 : 2.05);
  if (tower) drawTurretModel(ctx, entry);
  else drawEnemyModel(ctx, entry);
  canvas.style.setProperty("--model-color", entry.color);
  return canvas;
}

export function createCodex(dialog) {
  const buttons = [...dialog.querySelectorAll("[data-codex-kind]")];
  const list = dialog.querySelector("#codex-list");
  const detail = dialog.querySelector("#codex-detail");
  const caption = dialog.querySelector("#codex-caption");
  let kind = "tower";
  let current;

  function select(entry, button) {
    current = entry;
    for (const option of list.querySelectorAll("button"))
      option.setAttribute("aria-pressed", String(option === button));

    const tower = kind === "tower";
    const [label, advice] = tower
      ? [entry.note, towerAdvice[entry.id]]
      : (kind === "enemy" ? enemyAdvice : bossAdvice)[entry.shape];
    const heading = element("h3", entry.name);
    heading.id = "codex-entry-title";
    const text = element("div");
    text.append(element("span", label, "codex-entry-type"), heading);
    const identity = element("div", undefined, "codex-identity");
    identity.append(model(entry, tower), text);
    detail.replaceChildren(identity);
    if (tower) detail.append(statistics(towerStats(entry)));
    if (kind === "enemy") detail.append(statistics([
      ["Vida base", entry.hp],
      ["Velocidad base", `${number.format(entry.speed * 60)} px/s`],
      ["Recompensa base", `${entry.reward} ATP`],
    ]));
    detail.append(element("p", advice, "codex-advice"));
    if (tower) {
      const paths = element("ul", undefined, "codex-paths");
      for (const path of specializations(entry)) {
        const item = element("li");
        item.append(element("strong", path.name), element("p", path.detail));
        paths.append(item);
      }
      detail.append(element("h4", "Especializaciones"), element("p",
        `Mejora a rango 2 por ${upgradeCost({ ...entry, rank: 1 })} ATP y elige una rama en rango 3 por ${upgradeCost({ ...entry, rank: 2 })} ATP.`), paths);
    }
  }

  function show(category, key) {
    kind = category;
    const { entries, caption: description } = categories[kind];
    caption.textContent = description;
    for (const button of buttons)
      button.setAttribute("aria-pressed", String(button.dataset.codexKind === kind));
    const selected = entries.find((entry) => (entry.shape || entry.id) === key) || entries[0];
    let selectedButton;
    list.replaceChildren(...entries.map((entry) => {
      const item = element("li");
      const button = element("button", entry.name);
      button.type = "button";
      button.onclick = () => select(entry, button);
      if (entry === selected) selectedButton = button;
      item.append(button);
      return item;
    }));
    select(selected, selectedButton);
    selectedButton.scrollIntoView({ block: "nearest" });
  }

  for (const button of buttons)
    button.onclick = () => show(button.dataset.codexKind);

  return {
    get open() { return dialog.open; },
    show(category = kind, key = current?.shape || current?.id) {
      dialog.showModal();
      show(category, key);
    },
  };
}
