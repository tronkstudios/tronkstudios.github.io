import {
  BLUEPRINTS,
  Match,
  WIDTH,
  HEIGHT,
  upgradeCost,
  upgradeStats,
  reactorOutput,
  specializations,
  TARGETING,
  dailySetup,
} from "./engine.js?v=10";
import { Board } from "./board.js?v=13";
import { towerIcon, heroIcon } from "./art.js?v=3";
import { Profile, dayKey } from "./profile.js?v=5";
import { adMessage, createAdSenseProvider } from "/js/h5-rewards.js?v=3";
import { CHAPTERS, MISSIONS } from "./campaign.js?v=3";
import { sound, toggleSound, soundEnabled, unlockAudio } from "./audio.js?v=2";

import { Checkpoint, restoreCheckpoint } from "./checkpoint.js?v=6";

import { HEROES, CONTRACTS } from "./operations.js?v=2";

const $ = (id) => document.getElementById(id);
const panels = ["home", "campaign", "briefing", "operations", "field"];
const canvas = $("board");
const board = new Board(canvas);
const briefingBoard = new Board($("briefing-map"));
const lossBoard = new Board($("loss-map"));
const modal = $("modal");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const compactField = matchMedia("(max-width: 760px)");
const ad = createAdSenseProvider(
  document.querySelector('meta[name="rewarded-adsense-client"]')?.content,
);
let match,
  blueprint,
  selected,
  cursor,
  speed,
  screen,
  adBusy = false;
let adPreparing = false,
  adError = "";
let aiming = false,
  challengeDay = null,
  tacticalPaused = false,
  gatePreview = false,
  movingHero = false;
let atpBought,
  repaired,
  prepared = false;
let lastTick = performance.now(),
  accumulator = 0;
let selectionKey = "";
let briefingLevel = 1,
  lastBoss = false,
  lastPreview,
  lastPulseReady = false,
  lastMirrorOrder = null;
let operationsMessage = "";
let boardPointer = null;
let upgradePreview = null;
let abilityPreview = false;
let movingTower = null;
let dockBudgetKey;
const profile = new Profile(refreshProfile);
let checkpoint,
  checkpointLost = false;

function makeButton(text, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.onclick = handler;
  return button;
}

function view(name) {
  screen = name;
  for (const panel of panels) $(panel).hidden = panel !== name;
  window.scrollTo(0, 0);
  if (name === "home" || name === "campaign") refreshCheckpoint();
  if (name !== "home") {
    const heading = $(name).querySelector("h1");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

function ask(title, message, buttons, breach = null) {
  $("modal-title").textContent = title;
  $("modal-text").textContent = message;
  $("loss-map").hidden = breach === null;
  if (breach !== null) {
    $("loss-map").setAttribute("aria-label", `Recorrido de la fuga por la entrada ${breach ? "B" : "A"}`);
    lossBoard.draw(match, null, null, null, true, false, null, { breach });
  }
  $("modal-actions").replaceChildren(
    ...buttons.map(([label, action], i) => {
      const button = makeButton(label, () => {
        modal.close();
        action?.();
      });
      if (i === 0) button.className = "primary";
      return button;
    }),
  );
  if (!modal.open) modal.showModal();
}

function refreshProfile() {
  $("account-status").textContent = profile.status;
  $("profile-balance").textContent =
    `Reserva: ${profile.data.atpBank} ATP · ${profile.data.bioGems} biogemas`;
  $("daily-button").disabled = !prepared;
  const complete = profile.data.stars.filter(Boolean).length;
  const medals = profile.data.medals.filter(Boolean).length;
  updateText(
    "home-progress",
    `${complete}/${MISSIONS.length} misiones · ${medals} insignias`,
  );
  if (screen === "campaign") renderLevels();
  if (screen === "operations") renderOperations();
}

function openOperations() {
  if (!prepared || adBusy) return;
  operationsMessage = "";
  view("operations");
  if (HEROES.some((hero) => !profile.data.heroOwned[hero.id])) prepareAd();
  renderOperations();
}

function renderOperations() {
  updateText("operations-balance", `${profile.data.bioGems} biogemas`);
  updateText("operations-status", operationsMessage || adError);
  const focusedAction = document.activeElement?.dataset.operation;
  const card = (title, detail) => {
    const tile = document.createElement("article");
    tile.className = "operation-card";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const text = document.createElement("p");
    text.textContent = detail;
    tile.append(heading, text);
    return tile;
  };
  const action = (id, label, handler, disabled = false) => {
    const button = makeButton(label, handler);
    button.dataset.operation = id;
    button.disabled = disabled;
    return button;
  };
  $("heroes").replaceChildren(...HEROES.map((hero) => {
    const tile = card(`${hero.name} · ${hero.role}`, `${hero.ability}. ${hero.detail}`);
    tile.style.setProperty("--operation-color", hero.color);
    tile.prepend(heroIcon(hero));
    const stats = document.createElement("p");
    stats.textContent = `${hero.damage} daño · Alcance ${hero.range} · Recarga ${Math.ceil(hero.recharge / 60)} s`;
    tile.append(stats);
    if (profile.data.heroOwned[hero.id]) {
      const equipped = profile.data.heroEquipped === hero.id;
      tile.append(action(`equip-${hero.id}`, equipped ? "En el equipo" : "Equipar",
        () => profile.equipHero(hero.id), equipped || adBusy));
    } else {
      const count = profile.data.heroAds[hero.id];
      const label = adPreparing ? "Preparando anuncio…"
        : ad?.prepared ? `Ver anuncio · ${count}/${hero.ads}`
        : `Preparar anuncio · ${count}/${hero.ads}`;
      tile.append(
        action(`buy-${hero.id}`, `Desbloquear · ${hero.cost} biogemas`, () => {
          if (profile.buyHero(hero.id)) {
            operationsMessage = `${hero.name} ya está disponible.`;
            renderOperations();
          }
        }, adBusy || profile.data.bioGems < hero.cost),
        action(`ad-${hero.id}`, label, () => requestHeroAd(hero), !ad || adBusy || adPreparing),
      );
    }
    return tile;
  }));
  $("contracts").replaceChildren(...CONTRACTS.map((contract) => {
    const score = profile.data.contracts[contract.id];
    const unlocked = profile.data.stars[contract.level - 1] > 0;
    const tile = card(contract.name, contract.detail);
    const record = document.createElement("p");
    record.textContent = score ? `Récord personal · ${score.toLocaleString("es-ES")}` : "Récord personal · —";
    tile.append(record, action(`contract-${contract.id}`, unlocked ? "Jugar contrato" : `Supera el sector ${contract.level}`,
      () => startContract(contract), !unlocked || adBusy));
    return tile;
  }));
  if (focusedAction) $("operations").querySelector(`[data-operation="${focusedAction}"]:enabled`)?.focus({preventScroll:true});
}

function startContract(contract) {
  if (adBusy || !profile.data.stars[contract.level - 1]) return;
  begin(new Match(contract.level, null, { contract }));
}

function requestHeroAd(hero) {
  if (!ad || adBusy || adPreparing || profile.data.heroOwned[hero.id]) return;
  operationsMessage = "";
  if (!ad.prepared) {
    prepareAd();
    renderOperations();
    return;
  }
  const close = (text) => {
    adBusy = false;
    $("operations").inert = false;
    operationsMessage = text;
    if (screen === "operations") renderOperations();
  };
  adBusy = true;
  adError = "";
  operationsMessage = "Buscando anuncio…";
  renderOperations();
  ad.showPreparedReward({
    placementName: `bio-lab-hero-${hero.id}`,
    canShow: () => screen === "operations" && !modal.open,
    onShow() { $("operations").inert = true; },
    onReward() {
      profile.recordHeroAd(hero.id);
      close(profile.data.heroOwned[hero.id]
        ? `${hero.name} desbloqueado.`
        : `${hero.name} · ${profile.data.heroAds[hero.id]}/${hero.ads} anuncios completados.`);
    },
    onCancel: () => close("Anuncio cancelado."),
    onError: (reason) => close(adMessage(reason)),
  });
}

function renderLevels() {
  const complete = profile.data.stars.filter(Boolean).length;
  const totalStars = profile.data.stars.reduce((a, b) => a + b, 0);
  const medals = profile.data.medals.filter(Boolean).length;
  updateText(
    "campaign-progress-title",
    complete === MISSIONS.length
      ? "Laboratorio recuperado"
      : "Progreso de la operación",
  );
  updateText(
    "campaign-progress",
    `${complete}/${MISSIONS.length} misiones · ${totalStars} estrellas · ${medals} insignias`,
  );
  const active = profile.data.unlockedLevel;
  const chapters = CHAPTERS.map((chapter, index) => {
    const section = document.createElement("section");
    section.className = "chapter";
    section.style.setProperty("--chapter", chapter.color);
    const header = document.createElement("header");
    const title = document.createElement("h2");
    title.textContent = `Capítulo ${index + 1} · ${chapter.name}`;
    const location = document.createElement("p");
    location.textContent = chapter.location;
    header.append(title, location);
    const sectors = document.createElement("div");
    sectors.className = "chapter-sectors";
    for (const [i, mission] of MISSIONS.entries()) {
      if (mission.chapter !== index) continue;
      const level = i + 1;
      const button = makeButton("", () => briefing(level));
      button.className = "level";
      button.classList.toggle(
        "level-current",
        level === active && !profile.data.stars[i],
      );
      button.disabled = level > active;
      const number = document.createElement("small");
      number.textContent = `Sector ${String(level).padStart(2, "0")}`;
      const label = document.createElement("strong");
      label.textContent = mission.name;
      const badge = document.createElement("span");
      const stars = profile.data.stars[i];
      badge.className = `stamps${stars ? " earned" : ""}`;
      badge.textContent = button.disabled
        ? "Bloqueado"
        : stars
          ? `${"★".repeat(stars)}${"☆".repeat(3 - stars)}${profile.data.medals[i] ? " · Insignia" : ""}`
          : "Disponible";
      button.append(number, label, badge);
      sectors.append(button);
    }
    section.append(header, sectors);
    return section;
  });
  $("levels").replaceChildren(...chapters);
}

function briefing(level) {
  if (level > profile.data.unlockedLevel) return;
  briefingLevel = level;
  const mission = MISSIONS[level - 1];
  const chapter = CHAPTERS[mission.chapter];
  const preview = new Match(level);
  $("briefing").style.setProperty("--chapter", chapter.color);
  updateText(
    "briefing-chapter",
    `Capítulo ${mission.chapter + 1} · ${chapter.name}`,
  );
  updateText("briefing-title", mission.name);
  updateText("briefing-task", mission.task);
  updateText("briefing-speaker", mission.speaker);
  updateText("briefing-voice", mission.briefing);
  updateText("briefing-tip", mission.cue);
  updateText(
    "briefing-medal",
    profile.data.medals[level - 1]
      ? `Insignia obtenida · ${mission.medal.title}`
      : `Insignia · ${mission.medal.title}`,
  );
  updateText("briefing-medal-note", mission.medal.text);
  updateText(
    "briefing-waves",
    `${preview.maxWaves} oleadas · ${preview.routes.length === 2 ? "Dos entradas" : "Una entrada"}`,
  );
  view("briefing");
  briefingBoard.draw(preview, null, null, null, true, false);
}

function savedPreparation() {
  return checkpoint
    ? restoreCheckpoint(checkpoint.read(profile.data.unlockedLevel))
    : null;
}

function refreshCheckpoint() {
  const saved = savedPreparation();
  $("home-resume-run").hidden = !saved;
  $("campaign-checkpoint").hidden = !saved;
  if (saved)
    updateText(
      "saved-sector",
      `${saved.match.mission.name} · Oleada ${saved.match.wave + 1}/${saved.match.maxWaves} · Núcleo ${saved.match.hp} % · ${saved.match.atp} ATP`,
    );
}

function persistPreparation() {
  if (
    !checkpoint ||
    checkpointLost ||
    !match ||
    match.ranked ||
    match.state !== "build"
  )
    return;
  if (!checkpoint.write(match, { atpBought, repaired, speed })) {
    checkpointLost = true;
    updateText(
      "checkpoint-state",
      "No se pudo actualizar el punto de guardado.",
    );
    return;
  }
  updateText("checkpoint-state", `Punto guardado · Oleada ${match.wave + 1}`);
}

function resumePreparation() {
  const saved = savedPreparation();
  if (saved) begin(saved.match, null, saved);
  else refreshCheckpoint();
}

function start(level, day = null) {
  if (day) return begin(new Match(level, dailySetup(day)), day);
  const saved = savedPreparation();
  const launch = () => begin(new Match(level, null, { heroId: profile.data.heroEquipped }));
  if (!saved) return launch();
  ask(
    "Hay una partida guardada",
    `Si empiezas otra misión, se reemplazará el punto guardado de ${saved.match.mission.name}.`,
    [
      ["Retomar partida", resumePreparation],
      ["Empezar y reemplazar", launch],
      ["Volver"],
    ],
  );
}

function begin(next, day = null, restored = null) {
  challengeDay = day;
  lastState = next.state;
  lastBoss = false;
  match = next;
  const level = match.level;
  checkpointLost = false;
  aiming = false;
  tacticalPaused = false;
  gatePreview = false;
  movingHero = false;
  movingTower = null;
  lastPulseReady = false;
  lastMirrorOrder = null;
  blueprint = BLUEPRINTS[0];
  selected = null;
  cursor = null;
  boardPointer = null;
  upgradePreview = null;
  abilityPreview = false;
  speed = restored?.speed || 1;
  atpBought = restored?.atpBought || false;
  repaired = restored?.repaired || false;
  selectionKey = "";
  $("sector").textContent = day
    ? `Reto · ${match.daily.name}`
    : match.contract ? match.contract.name : `Sector ${level} · ${match.mission.name}`;
  unlockAudio();
  $("radio-log").hidden = !match.mission;
  if (match.mission) {
    updateText("radio-speaker", match.mission.speaker);
    updateText(
      "radio-text",
      match.wave >= 2 ? match.mission.transmission : match.mission.task,
    );
  }
  renderDock();
  view("field");
  message(
    restored
      ? `Partida retomada. Prepara la oleada ${match.wave + 1}.`
      : matchMedia("(any-pointer: coarse)").matches
        ? "Elige una torre. Mantén pulsado y desliza para previsualizar su posición."
        : "Elige una torre y haz clic fuera del conducto para colocarla.",
  );
  $("checkpoint-state").hidden = match.ranked;
  if (!match.ranked) persistPreparation();
  $("supplies").hidden = match.ranked;
  adError = "";
  if (!match.ranked) prepareAd();
  positionMapControls();
  renderHUD();
  board.draw(match, blueprint, selected, cursor, reduced.matches, aiming);
}

function message(text, warn = false) {
  $("board-status").textContent = text;
  $("board-status").classList.toggle("warning", warn);
}

function arrangeTowerPanel() {
  const panel = $("selection");
  const focused = panel.contains(document.activeElement) ? document.activeElement : null;
  if (compactField.matches) $("near-board-selection").append(panel);
  else $("supply-panel").prepend(panel);
  $("near-board-selection").hidden = !compactField.matches || !selected;
  focused?.focus({ preventScroll: true });
}
compactField.addEventListener("change", arrangeTowerPanel);
arrangeTowerPanel();

function renderDock() {
  dockBudgetKey = null;
  $("dock").replaceChildren(
    ...BLUEPRINTS.map((type) => {
      const button = makeButton("", () => {
        blueprint = type;
        aiming = false;
        movingHero = false;
        movingTower = null;
        selected = null;
        selectionKey = "";
        renderSelection();
        highlightDock();
      });
      button.className = "tower";
      button.dataset.type = type.id;
      button.style.setProperty("--tower-color", type.color);
      button.disabled = type.unlock > match.techLevel;
      button.dataset.cost = type.cost;
      const name = document.createElement("strong");
      name.textContent = type.name;
      const cost = document.createElement("small");
      cost.className = "tower-price";
      cost.textContent = button.disabled
        ? `Sector ${type.unlock}`
        : `${type.cost} ATP`;
      const label = document.createElement("span");
      label.className = "tower-label";
      label.append(name, cost);
      button.append(towerIcon(type), label);
      return button;
    }),
  );
  $("dock").scrollLeft = 0;
  highlightDock();
}

function highlightDock() {
  for (const button of $("dock").children)
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.type === blueprint?.id),
    );
}

function updateDockBudget() {
  const limit = match.contract?.towerLimit;
  const full = limit != null && match.towers.length >= limit;
  const budgetKey = `${match.atp}:${limit ?? ""}:${match.towers.length}`;
  if (dockBudgetKey === budgetKey) return;
  dockBudgetKey = budgetKey;
  $("tower-limit").hidden = limit == null;
  if (limit != null) updateText("tower-limit", `${match.towers.length}/${limit} instaladas`);
  for (const button of $("dock").children) {
    if (button.disabled) continue;
    const cost = Number(button.dataset.cost);
    const blocked = full || match.atp < cost;
    button.classList.toggle("tower-unaffordable", blocked);
    const label = full ? `${cost} ATP · Límite` : match.atp < cost
      ? `Faltan ${cost - match.atp} ATP` : `${cost} ATP`;
    button.querySelector(".tower-price").textContent = label;
  }
}

function toggleTowerMove(tower) {
  if (match.state !== "build") return;
  movingTower = movingTower === tower ? null : tower;
  movingHero = false;
  aiming = false;
  renderHUD();
  message(movingTower ? "Marca una nueva posición para la torre." : "Movimiento cancelado.");
}

function toggleBotMove() {
  movingTower = null;
  movingHero = !movingHero;
  aiming = false;
  upgradePreview = null;
  message(movingHero ? "Marca en el tablero el destino del nanobot." : "Movimiento cancelado.");
  renderHUD();
}

function place(x, y) {
  if (!match || modal.open || !["build", "wave"].includes(match.state)) return;
  if (movingTower) {
    const problem = match.checkRelocation(movingTower, x, y);
    if (problem) return message(problem, true);
    match.relocate(movingTower, x, y);
    message(`${movingTower.name} reubicada.`);
    movingTower = null;
    persistPreparation();
    renderHUD();
    return;
  }
  if (movingHero) {
    if (!match.moveHero(x, y)) return message("Elige un punto dentro del tablero.", true);
    movingHero = false;
    message(match.state === "wave" ? `${match.hero.name} en movimiento.` : `${match.hero.name} en posición.`);
    persistPreparation();
    renderHUD();
    return;
  }
  if (aiming) {
    if (match.activatePulse(x, y)) {
      aiming = false;
      sound("pulse", true);
      message("Pulso activado. Escudos desactivados.");
    } else message("Apunta a un enemigo dentro del círculo.", true);
    renderHUD();
    return;
  }
  const tower = towerAt(x, y);
  if (botAt(x, y, tower)) {
    toggleBotMove();
    return;
  }
  if (tower) {
    selected = tower;
    blueprint = null;
    message("Torre seleccionada. Puedes mejorarla o venderla.");
  } else {
    const problem = match.checkPlacement(blueprint, x, y);
    if (problem)
      return message(
        blueprint ? problem : "Selecciona una torre en el panel.",
        true,
      );
    match.place(blueprint, x, y);
    sound("build", true);
    persistPreparation();
    message(`${blueprint.name} instalada.`);
  }
  highlightDock();
  renderHUD();
}

function renderSelection() {
  const panel = $("selection");
  $("near-board-selection").hidden = !compactField.matches || !selected;
  const key = selected
    ? [
        selected.x,
        selected.y,
        selected.rank,
        selected.targeting,
        match.state,
        movingTower === selected,
        match.atp >= upgradeCost(selected),
      ].join(":")
    : blueprint?.id;
  if (key === selectionKey) return;
  selectionKey = key;
  upgradePreview = null;
  const heading = document.createElement("strong");
  const detail = document.createElement("p");
  if (!selected) {
    heading.textContent = blueprint?.name || "Elige una torre";
    detail.textContent =
      blueprint?.note || "Toca una torre instalada para gestionarla.";
    panel.replaceChildren(heading, detail);
    return;
  }
  const tower = selected;
  heading.textContent = `${tower.name} · Nivel ${tower.rank}`;
  detail.textContent =
    tower.branch?.detail ||
    (tower.type === "eco"
      ? tower.note
      : `${tower.note} · ${tower.damage} daño · ${tower.range} alcance`);
  if (tower.branch) heading.textContent += ` · ${tower.branch.name}`;
  const cost = upgradeCost(tower);
  const options = document.createElement("div");
  options.className = "upgrade-options";
  if (tower.rank === 1) {
    const improve = makeButton(`Mejorar · ${cost} ATP`, () => {
      if (match.upgrade(tower)) {
        message(`${tower.name} mejorada a nivel 2.`);
        persistPreparation();
      }
      renderHUD();
    });
    improve.disabled = match.atp < cost;
    improve.append(upgradeForecast(tower));
    options.append(upgradeRow(tower, improve));
  } else if (tower.rank === 2) {
    for (const [choice, branch] of specializations(tower).entries()) {
      const improve = makeButton(`${branch.name} · ${cost} ATP`, () => {
        if (match.upgrade(tower, choice)) {
          message(`Especialización «${branch.name}» activada.`);
          persistPreparation();
        }
        renderHUD();
      });
      improve.disabled = match.atp < cost;
      const note = document.createElement("small");
      note.textContent = branch.detail;
      improve.append(note, upgradeForecast(tower, branch));
      options.append(upgradeRow(tower, improve, branch));
    }
  }
  const actions = document.createElement("div");
  actions.className = "actions";
  if (match.state === "build") {
    const moving = movingTower === tower;
    const relocate = makeButton(moving ? "Cancelar traslado" : "Reubicar gratis", () => {
      toggleTowerMove(tower);
      $("relocate-tower")?.focus({ preventScroll: true });
    });
    relocate.id = "relocate-tower";
    actions.append(relocate);
  }
  if (tower.type !== "eco") {
    const label = document.createElement("label");
    label.className = "tower-targeting";
    label.textContent = "Prioridad de objetivo";
    const targeting = document.createElement("select");
    targeting.id = "tower-targeting";
    for (const [id, name] of TARGETING) targeting.add(new Option(name, id));
    targeting.value = tower.targeting;
    targeting.onchange = () => {
      tower.targeting = targeting.value;
      persistPreparation();
      renderHUD();
      $("tower-targeting")?.focus({ preventScroll: true });
    };
    label.append(targeting);
    actions.append(label);
  }
  actions.append(
    makeButton(`Vender · +${Math.floor(tower.paid * 0.65)} ATP`, () => {
      if (match.sell(tower)) {
        message(`${tower.name} retirada.`);
        persistPreparation();
      }
      selected = null;
      movingTower = null;
      renderHUD();
    }),
  );
  const performance = elPerformance(tower);
  panel.replaceChildren(heading, detail, performance, options, actions);
}

function upgradeRow(tower, purchase, branch) {
  const range = upgradeStats(tower, branch).range;
  if (range <= tower.range) return purchase;
  const row = document.createElement("div");
  row.className = "upgrade-row";
  const preview = { tower, range };
  const toggle = makeButton("Ver alcance", () => {
    const active = upgradePreview !== preview;
    upgradePreview = active ? preview : null;
    for (const control of row.parentNode.querySelectorAll(".range-preview"))
      control.setAttribute("aria-pressed", String(active && control === toggle));
  });
  toggle.className = "range-preview";
  toggle.disabled = movingTower === tower;
  if (branch) toggle.setAttribute("aria-label", `Ver alcance · ${branch.name}`);
  toggle.setAttribute("aria-pressed", "false");
  row.append(purchase, toggle);
  return row;
}

const cadence = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
function upgradeForecast(tower, branch) {
  const next = upgradeStats(tower, branch);
  const interval = (ticks) => cadence.format(ticks / 60);
  const stats = tower.type === "eco"
    ? `ATP por ciclo ${reactorOutput(tower.rank, tower.branch)} → ${reactorOutput(tower.rank + 1, branch)}`
    : `Daño ${tower.damage} → ${next.damage} · Alcance ${tower.range} → ${next.range}`;
  const preview = document.createElement("small");
  preview.className = "upgrade-forecast";
  const action = tower.type === "eco" ? "ciclo" : "disparo";
  preview.textContent = `${stats} · ${interval(tower.fireRate)} → ${interval(next.fireRate)} s por ${action}`;
  return preview;
}

function towerReport(tower) {
  if (tower.type === "eco")
    return `ATP generado · ${tower.produced.toLocaleString("es-ES")}`;
  const basic = `Daño infligido · ${Math.round(tower.inflicted).toLocaleString("es-ES")} · Bajas ${tower.defeated}`;
  const extras = [];
  if (tower.slowTicks) extras.push(`${cadence.format(tower.slowTicks / 60)} s de ralentización acumulada`);
  if (tower.shieldsBroken) extras.push(`Escudos rotos ${tower.shieldsBroken}`);
  if (tower.synergyHits) extras.push(`Impactos sobre ralentizados ${tower.synergyHits}`);
  return [basic, ...extras].join(" · ");
}

function elPerformance(tower) {
  const performance = document.createElement("p");
  performance.id = "tower-performance";
  performance.className = "tower-performance";
  performance.textContent = towerReport(tower);
  return performance;
}

function updateText(id, value) {
  const node = $(id);
  if (node.textContent !== String(value)) node.textContent = value;
}

function renderWavePreview(preview) {
  if (preview === lastPreview) return;
  lastPreview = preview;
  const { count, theme, final, lanes, bossTip, order } = preview;
  const finale = match.gateRoutes ? " · Gemelos térmicos" : " · Jefe";
  updateText(
    "wave-preview-title",
    `${theme.name} · ${count} enemigos${lanes[1] ? " · Dos entradas" : ""}${final ? finale : ""}`,
  );
  updateText("wave-preview-tip", `${theme.tip} ${bossTip}`.trim());
  const groups = new Map();
  for (const { spec, boss, armor, shield } of order) {
    const label = boss
      ? "Jefe"
      : spec.name + (armor ? " con blindaje" : shield ? " con escudo" : "");
    groups.set(label, (groups.get(label) || 0) + 1);
  }
  $("wave-roster").replaceChildren(
    ...Array.from(groups, ([label, n]) => {
      const item = document.createElement("li");
      item.textContent = `${n} × ${label}`;
      return item;
    }),
  );
}

function renderBoss(boss, suffix = "") {
  $(`boss-status${suffix}`).hidden = !boss;
  if (!boss) return;
  const name = boss.coolingBoss
    ? `${boss.name} · Entrada ${boss.lane === 0 ? "A" : "B"}`
    : boss.name;
  const accelerated = boss.coolingBoss === "runner"
    ? boss.phase >= 2
    : !boss.coolingBoss && boss.phase === 3;
  updateText(`boss-name${suffix}`, name);
  updateText(
    `boss-phase${suffix}`,
    boss.shield
      ? "Escudo activo"
      : accelerated
        ? "Acelerado"
        : `Fase ${boss.phase}/3`,
  );
  $(`boss-health${suffix}`).value = Math.ceil((100 * boss.hp) / boss.maxHp);
}

function renderGate(waiting) {
  $("gate-panel").hidden = !match.gateRoutes || !waiting;
  if ($("gate-panel").hidden) return;
  const blockers = gatePreview ? match.gateBlockers : [];
  $("gate-preview").setAttribute("aria-pressed", String(gatePreview));
  $("gate-apply").hidden = !gatePreview;
  $("gate-apply").disabled = blockers.length > 0;
  let status = match.gateDiverted ? "Atajo activo" : "Conducto largo activo";
  if (blockers.length) {
    const names = blockers.map((tower) => tower.name).join(", ");
    status = blockers.length === 1
      ? `Una torre ocupa el trazado amarillo. Marcada en el mapa: ${names}.`
      : `Torres marcadas que bloquean el trazado: ${names}.`;
  } else if (gatePreview) {
    status = match.gateDiverted
      ? "Trazado amarillo: conducto largo. Da más tiempo para frenar la entrada B."
      : "Trazado amarillo: atajo. Junta las entradas antes y reduce el tiempo hasta el núcleo.";
  }
  updateText("gate-status", status);
}

function positionMapControl(node, point) {
  node.style.setProperty("--map-y", `${point[1] * 100 / HEIGHT}%`);
}

function positionMapControls() {
  for (const [index, path] of match.routes.entries()) {
    positionMapControl($(index ? "entry-start-b" : "entry-start-a"), path.points[0]);
  }
  positionMapControl($("core-warning"), match.routes[0].points.at(-1));
}

function renderFieldControls(waiting) {
  for (const [lane, id] of ["entry-start-a", "entry-start-b"].entries()) {
    const beacon = $(id);
    const active = waiting && match.preview.lanes[lane] > 0;
    beacon.hidden = !active;
    beacon.disabled = adBusy;
    if (active) {
      const letter = lane ? "B" : "A";
      const count = match.preview.lanes[lane];
      const boss = match.preview.order.some((entry) => entry.lane === lane && entry.boss);
      updateText(id, `${letter} · ${count}${boss ? " ★" : ""}`);
      beacon.classList.toggle("wave-beacon-boss", boss);
      const label = `Iniciar oleada ${match.wave + 1} completa. Entrada ${letter}: ${count} enemigos${boss ? ", incluye jefe" : ""}.`;
      if (beacon.getAttribute("aria-label") !== label)
        beacon.setAttribute("aria-label", label);
    }
  }
  $("wave-beacon-hint").hidden = !waiting;
  if (waiting)
    updateText("wave-beacon-hint", match.preview.final
      ? "Cualquier baliza inicia la oleada completa. ★ Jefe"
      : "Cualquier baliza inicia la oleada completa.");
  const live = match.state === "wave";
  const order = live ? match.mirrorOrders[0] : null;
  $("entry-warning").hidden = !order;
  if (order && order !== lastMirrorOrder) {
    positionMapControl($("entry-warning"), match.routes[order.lane].points[0]);
    updateText("entry-warning", `Refuerzos · ${order.lane ? "B" : "A"}`);
    sound("alert");
  }
  lastMirrorOrder = order;
  $("core-warning").hidden = !live || !match.enemies.some((enemy) => enemy.hp > 0 && enemy.remaining < 105);
  const pulseReady = live && match.charge >= 100;
  if (pulseReady && !lastPulseReady) sound("ready");
  lastPulseReady = pulseReady;
  $("pulse").classList.toggle("pulse-ready", pulseReady);
  const hero = match.hero;
  $("field-specials").hidden = !hero && !match.barrier;
  $("move-hero").hidden = $("hero-ability").hidden = !hero;
  if (hero) {
    $("move-hero").disabled = !waiting && !live;
    $("move-hero").setAttribute("aria-pressed", String(movingHero));
    updateText("move-hero", movingHero ? "Cancelar movimiento" : `Mover a ${hero.name}`);
    $("hero-ability").disabled = !live || tacticalPaused || hero.abilityCooldown > 0;
    const cooldown = hero.abilityCooldown ? ` · ${Math.ceil(hero.abilityCooldown / 60)} s` : "";
    updateText("hero-ability", hero.ability + cooldown);
  }
  const barrier = match.barrier;
  $("barrier-action").hidden = !barrier;
  if (barrier) {
    $("barrier-action").disabled = !live || tacticalPaused || barrier.used;
    updateText("barrier-action", barrier.used ? "Barrera utilizada" : "Cerrar barrera · 4 s");
  }
  const objective = match.console;
  const combo = live && match.comboNotice?.until > match.time;
  $("field-alerts").hidden = !objective && !combo;
  $("mission-objective").hidden = !objective;
  $("battle-notice").hidden = !combo;
  if (objective)
    updateText("mission-objective", objective.complete ? "Copia recuperada" : `Protege la consola · Integridad ${objective.hp}/4`);
  if (combo)
    updateText("battle-notice", `Combo de torres · ${match.comboNotice.count} enemigos ralentizados alcanzados`);
}

function renderHUD() {
  updateText("hp", `${match.hp}%`);
  $("integrity").value = match.hp;
  updateText("atp", match.atp);
  updateText("wave", `${match.wave}/${match.maxWaves}`);
  const waiting = match.state === "build";
  updateText("threat-label", waiting ? "Próxima oleada" : "Quedan");
  const remaining = match.enemies.length + match.queue.length;
  updateText("threats", waiting ? match.preview.count : remaining);
  updateText(
    "combo",
    match.combo >= 5 ? `×${match.combo} Fiebre` : `×${match.combo || 1}`,
  );
  const firstBoss = match.enemies.find(
    (enemy) => enemy.boss && enemy.coolingBoss !== "guard" && enemy.hp > 0,
  );
  const secondBoss = match.enemies.find(
    (enemy) => enemy.coolingBoss === "guard" && enemy.hp > 0,
  );
  const boss = firstBoss || secondBoss;
  if (boss && !lastBoss) sound("boss");
  lastBoss = !!boss;
  renderBoss(firstBoss);
  renderBoss(secondBoss, "-b");
  renderGate(waiting);
  $("wave-preview").hidden = !waiting;
  if (waiting) renderWavePreview(match.preview);
  const split = match.routes.length > 1 && (waiting || match.state === "wave");
  $("lane-brief").hidden = !split;
  if (split) {
    let a, b;
    if (waiting) {
      [a, b] = match.preview.lanes;
    } else {
      // Count both enemies on the board and those waiting to spawn.
      b = 0;
      for (const enemy of match.enemies) b += Number(enemy.lane === 1);
      for (const enemy of match.queue) b += Number(enemy.lane === 1);
      a = remaining - b;
    }
    updateText("lane-a", `Entrada A · ${a}`);
    updateText("lane-b", `Entrada B · ${b}`);
  }
  const { debrief } = match;
  $("wave-debrief").hidden = !waiting || !debrief;
  if (waiting && debrief) {
    const core = debrief.damage
      ? `núcleo −${debrief.damage} %`
      : "núcleo intacto";
    updateText(
      "wave-debrief",
      `Oleada ${match.wave}: ${debrief.kills} abatidos · +${debrief.atp} ATP · ${core}.`,
    );
  }
  $("undo-build").hidden = !match.undoable;
  $("supply-panel").hidden = compactField.matches && match.ranked && !match.undoable;
  if (match.state !== "wave") aiming = false;
  $("pulse").disabled =
    match.state !== "wave" || match.charge < 100 || tacticalPaused;
  $("pulse").setAttribute("aria-pressed", String(aiming));
  updateText("pulse", aiming ? "Cancelar pulso" : `Pulso · ${match.charge}%`);
  const phase = waiting
    ? "Preparación"
    : tacticalPaused
      ? "Pausa táctica"
      : match.state === "wave"
        ? boss
          ? "Jefe en el conducto"
          : "Oleada en curso"
        : "Partida terminada";
  updateText("phase", `${match.map.name} · ${phase}`);
  $("next").disabled = !waiting || adBusy;
  updateText(
    "next",
    waiting ? `Iniciar oleada ${match.wave + 1}` : "Oleada en curso",
  );
  $("speed").setAttribute("aria-pressed", String(speed === 2));
  updateText("speed", `Velocidad ×${speed}`);
  $("tactical-pause").disabled = match.state !== "wave";
  $("tactical-pause").classList.toggle("engaged", tacticalPaused);
  updateText("tactical-pause", tacticalPaused ? "Reanudar" : "Pausa táctica");
  renderFieldControls(waiting);
  updateDockBudget();
  const canRequestAd = ad && waiting && !match.ranked && !match.adUsed;
  $("boost").hidden = !canRequestAd;
  $("boost").disabled = adBusy || adPreparing;
  updateText(
    "boost",
    adBusy
      ? "Abriendo anuncio…"
      : adPreparing && !ad.prepared
        ? "Preparando anuncio…"
        : ad.prepared
          ? "Ver anuncio · +75 ATP"
          : "Reintentar preparación",
  );
  $("boost-status").hidden = !canRequestAd || !adError;
  updateText("boost-status", adError);
  $("buy-atp").disabled = !waiting || atpBought || profile.data.atpBank < 100;
  $("heal").disabled =
    !waiting || repaired || match.hp === 100 || profile.data.bioGems < 5;
  renderSelection();
  if (selected && $("tower-performance"))
    updateText("tower-performance", towerReport(selected));
}

function announce() {
  if (match.hp === 0) return "El núcleo ha perdido toda la integridad.";
  if (match.state === "build")
    return match.wave
      ? "Oleada superada. Refuerza tus defensas."
      : "Prepara tus defensas antes de la primera oleada.";
}

let lastState;
function frame(now) {
  const elapsed = Math.min(100, now - lastTick);
  lastTick = now;
  if (screen === "field" && !modal.open && !document.hidden) {
    accumulator = tacticalPaused ? 0 : accumulator + elapsed;
    while (accumulator >= 1000 / 60) {
      for (let i = 0; i < speed; i++) match.tick();
      accumulator -= 1000 / 60;
    }
    if (lastState !== match.state) {
      tacticalPaused = false;
      lastState = match.state;
      if (match.state === "won" || match.state === "lost") finish();
      else if (match.state === "build" && match.wave) {
        persistPreparation();
        message(announce());
      }
    }
    const hoverTower = cursor && !aiming && !movingHero && !movingTower ? towerAt(cursor.x, cursor.y) : null;
    const hoverBot = cursor && !aiming && !movingHero && !movingTower && botAt(cursor.x, cursor.y, hoverTower);
    const hovered = hoverBot ? null : hoverTower;
    const touchPreview = boardPointer?.type === "touch" && cursor && (blueprint || movingTower) && !aiming && !movingHero && !hovered && !hoverBot;
    $("placement-preview").hidden = !touchPreview;
    if (touchPreview) {
      const reason = movingTower
        ? match.checkRelocation(movingTower, cursor.x, cursor.y)
        : match.checkPlacement(blueprint, cursor.x, cursor.y);
      const hint = movingTower ? "Suelta para reubicar" : `Suelta para instalar · ${blueprint.cost} ATP`;
      updateText("placement-preview", reason || hint);
      $("placement-preview").classList.toggle("invalid", !!reason);
    }
    board.draw(
      match,
      movingHero || hoverBot || upgradePreview ? null : blueprint,
      movingHero ? null : selected,
      cursor,
      reduced.matches,
      aiming,
      hovered,
      { gatePreview, movingHero, movingTower, skillPreview: abilityPreview || hoverBot, upgradePreview },
    );
    renderHUD();
  } else {
    accumulator = 0;
  }
  requestAnimationFrame(frame);
}

function finish() {
  const won = match.state === "won";
  const stars = won ? (match.hp >= 90 ? 3 : match.hp >= 55 ? 2 : 1) : 0;
  const { level } = match;
  sound(won ? "victory" : "defeat");
  if (match.contract) {
    const contract = match.contract;
    const score = match.score();
    const record = won && profile.recordContract(contract.id, score);
    ask(record ? "Nuevo récord de élite" : won ? "Contrato completado" : "Contrato fallido",
      `${contract.name} · ${score.toLocaleString("es-ES")} puntos · Núcleo ${match.hp} %.`,
      [["Reintentar", () => startContract(contract)], ["Volver a contratos", openOperations]]);
    return;
  }
  if (challengeDay) {
    const score = match.score();
    const record = profile.recordDaily(challengeDay, score);
    ask(
      record ? "Nuevo récord diario" : "Reto terminado",
      `${score.toLocaleString("es-ES")} puntos · ${match.kills} eliminados · ${match.wave}/${match.maxWaves} oleadas.`,
      [
        ["Reintentar", () => start(level, challengeDay)],
        ["Volver al menú", () => view("home")],
      ],
    );
    return;
  }
  if (won) checkpoint?.clear();
  const mission = match.mission;
  let earnedMedal = false;
  if (won) {
    const earnedStars = Math.max(0, stars - profile.data.stars[level - 1]);
    const unlock = Math.min(
      MISSIONS.length,
      Math.max(profile.data.unlockedLevel, level + 1),
    );
    earnedMedal = !profile.data.medals[level - 1] && mission.medal.test(match);
    if (earnedStars || earnedMedal || unlock !== profile.data.unlockedLevel) {
      profile.data.stars[level - 1] = Math.max(
        stars,
        profile.data.stars[level - 1],
      );
      profile.data.unlockedLevel = unlock;
      if (earnedMedal) profile.data.medals[level - 1] = true;
      profile.data.atpBank += earnedStars * 55 + (earnedMedal ? 35 : 0);
      profile.data.bioGems += earnedStars * 2 + (earnedMedal ? 2 : 0);
      profile.commit();
    }
  }
  const buttons =
    won && level < MISSIONS.length
      ? [["Siguiente sector", () => briefing(level + 1)]]
      : [];
  if (!won && !checkpointLost && checkpoint?.raw) {
    const expected = checkpoint.raw;
    buttons.push(["Repreparar la oleada", () => {
      const saved = savedPreparation();
      if (checkpoint.raw === expected && saved) begin(saved.match, null, saved);
      else campaign();
    }]);
  }
  buttons.push(
    [won ? "Reintentar" : "Reiniciar misión", () => {
      if (!won) checkpoint?.clear();
      start(level);
    }],
    ["Volver a sectores", campaign],
  );
  const summary = won
    ? `${"★".repeat(stars)}${"☆".repeat(3 - stars)} · Núcleo al ${match.hp}% · ${match.kills} eliminados.

${mission.end}${
        earnedMedal
          ? `

Insignia: ${mission.medal.title}. +35 ATP de reserva y +2 biogemas.`
          : ""
      }`
    : `${match.console?.hp === 0 ? "La consola de Muestreo fue destruida." : `El núcleo cayó en la oleada ${match.wave} de ${match.maxWaves}.`}

${lossReport()}

${mission.cue}`;
  ask(
    won
      ? level === MISSIONS.length
        ? "Laboratorio recuperado"
        : "Misión completada"
      : "Brecha de contención",
    summary,
    buttons,
    won ? null : match.waveLeaks?.worst?.lane ?? null,
  );
}

function lossReport() {
  const leaks = match.waveLeaks;
  if (!leaks?.worst) return "";
  const routes = leaks.lanes.map((count, lane) =>
    `Entrada ${lane === 0 ? "A" : "B"}: ${count}`,
  );
  const idle = match.towers.filter(
    (tower) => tower.type !== "eco" && tower.inflicted === 0,
  ).length;
  const details = [
    `Fugas de esta oleada · ${routes.join(" · ")}`,
    `Mayor golpe al núcleo · ${leaks.worst.name} (−${leaks.worst.loss} %) · Entrada ${leaks.worst.lane ? "B" : "A"}`,
  ];
  if (idle) details.push(`Torres sin daño registrado en la misión · ${idle}`);
  return details.join("\n");
}

function campaign() {
  renderLevels();
  view("campaign");
}
function towerAt(x, y) {
  let nearest = null;
  let limit = Math.min(36, Math.max(22, (12 * WIDTH) / canvas.clientWidth));
  for (const tower of match.towers) {
    const distance = Math.hypot(tower.x - x, tower.y - y);
    if (distance < limit) {
      nearest = tower;
      limit = distance;
    }
  }
  return nearest;
}

function botAt(x, y, tower) {
  const bot = match.hero;
  if (!bot) return false;
  const distance = Math.hypot(bot.x - x, bot.y - y);
  return distance <= 29 && (!tower || distance <= Math.hypot(tower.x - x, tower.y - y));
}

function pointer(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.offsetWidth;
  const scaleY = rect.height / canvas.offsetHeight;
  return {
    x:
      ((e.clientX - rect.left - canvas.clientLeft * scaleX) * WIDTH) /
      (canvas.clientWidth * scaleX),
    y:
      ((e.clientY - rect.top - canvas.clientTop * scaleY) * HEIGHT) /
      (canvas.clientHeight * scaleY),
  };
}
canvas.onpointerdown = (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  boardPointer = { id: event.pointerId, type: event.pointerType };
  cursor = pointer(event);
  if (event.pointerType === "touch") canvas.setPointerCapture(event.pointerId);
};
canvas.onpointermove = (event) => {
  if (boardPointer?.id === event.pointerId || event.pointerType !== "touch")
    cursor = pointer(event);
};
canvas.onpointerup = (event) => {
  if (boardPointer?.id !== event.pointerId) return;
  const point = pointer(event);
  boardPointer = null;
  if (event.pointerType === "touch") cursor = null;
  if (point.x < 0 || point.x > WIDTH || point.y < 0 || point.y > HEIGHT) return;
  place(point.x, point.y);
};
canvas.onpointercancel = (event) => {
  if (boardPointer?.id === event.pointerId) {
    boardPointer = null;
    cursor = null;
  }
};
canvas.onpointerleave = () => {
  if (!boardPointer || boardPointer.type !== "touch") {
    boardPointer = null;
    if (document.activeElement !== canvas) cursor = null;
  }
};
canvas.onblur = () => {
  if (!boardPointer) cursor = null;
};
canvas.onkeydown = (e) => {
  const delta = {
    ArrowLeft: [-12, 0],
    ArrowRight: [12, 0],
    ArrowUp: [0, -12],
    ArrowDown: [0, 12],
  }[e.key];
  if (e.code !== "Space" && e.key !== "Enter" && !delta) return;
  e.preventDefault();
  cursor ||= { x: WIDTH / 2, y: HEIGHT / 2 };
  if (delta) {
    cursor.x = Math.max(25, Math.min(WIDTH - 25, cursor.x + delta[0]));
    cursor.y = Math.max(25, Math.min(HEIGHT - 25, cursor.y + delta[1]));
  } else place(cursor.x, cursor.y);
};

$("campaign-button").onclick = campaign;
$("back-home").onclick = () => view("home");
$("resume-mission").onclick = () => briefing(profile.data.unlockedLevel);
$("home-resume-run").onclick = resumePreparation;
$("campaign-resume-run").onclick = resumePreparation;
$("back-campaign").onclick = campaign;
$("launch-mission").onclick = () => start(briefingLevel);
function showSoundState(enabled) {
  $("sound-toggle").setAttribute("aria-pressed", String(enabled));
  $("sound-toggle").setAttribute(
    "aria-label",
    enabled ? "Silenciar sonido" : "Activar sonido",
  );
  updateText("sound-toggle", enabled ? "Sonido sí" : "Sonido no");
}
showSoundState(soundEnabled());
$("sound-toggle").onclick = () => showSoundState(toggleSound());
$("operations-button").onclick = openOperations;
$("back-operations").onclick = () => {
  if (!adBusy) view("home");
};
$("move-hero").onclick = toggleBotMove;
$("hero-ability").onpointerenter = $("hero-ability").onfocus = () => { abilityPreview = true; };
$("hero-ability").onpointerleave = $("hero-ability").onblur = () => { abilityPreview = false; };
$("hero-ability").onclick = () => {
  if (tacticalPaused) return;
  if (match.heroAbility()) {
    sound("pulse", true);
    message(`${match.hero.ability} activada.`);
  } else message("Acerca el nanobot a los enemigos para usar su habilidad.", true);
  renderHUD();
};
$("barrier-action").onclick = () => {
  if (tacticalPaused || !match.closeBarrier()) return;
  sound("pulse", true);
  message("Barrera cerrada durante cuatro segundos.");
  renderHUD();
};
$("challenge-button").onclick = () => {
  if (!prepared) return;
  const day = dayKey();
  const rule = dailySetup(day);
  const best = profile.data.dailyRecords[day] || 0;
  ask(
    rule.name,
    `${rule.text} Récord de hoy: ${best.toLocaleString("es-ES")} puntos.`,
    [["Jugar reto", () => start(6, day)], ["Volver"]],
  );
};
$("daily-button").onclick = () => {
  if (profile.data.lastDaily >= dayKey())
    return ask(
      "Suministro diario",
      "Ya has recogido el de hoy. El próximo llega a medianoche, hora de Madrid.",
      [["Cerrar"]],
    );
  ask("Suministro diario", "+250 ATP para la reserva y +10 biogemas.", [
    [
      "Reclamar",
      () => {
        profile.data.lastDaily = dayKey();
        profile.data.atpBank = Math.min(99999, profile.data.atpBank + 250);
        profile.data.bioGems = Math.min(9999, profile.data.bioGems + 10);
        profile.commit();
        updateText("home-status", "Suministro añadido a tu reserva.");
      },
    ],
    ["Volver"],
  ]);
};
function startNextWave() {
  if (adBusy) return;
  if (match.startWave()) {
    gatePreview = false;
    movingTower = null;
    upgradePreview = null;
    sound("wave", true);
    if (match.mission && match.wave === 2)
      updateText("radio-text", match.mission.transmission);
    message(`Oleada ${match.wave} iniciada.`);
  }
  renderHUD();
}
$("next").onclick = startNextWave;
for (const id of ["entry-start-a", "entry-start-b"]) $(id).onclick = () => {
  startNextWave();
  canvas.focus({ preventScroll: true });
};
$("gate-preview").onclick = () => {
  gatePreview = !gatePreview;
  renderGate(match.state === "build");
};
$("gate-apply").onclick = () => {
  if (!match.toggleGate()) return;
  gatePreview = false;
  persistPreparation();
  renderGate(true);
  $("gate-preview").focus({ preventScroll: true });
  message(match.gateDiverted ? "Atajo de la entrada B activado." : "Entrada B devuelta al conducto largo.");
};
$("undo-build").onclick = () => {
  const tower = match.undoPlacement();
  if (!tower) return;
  if (selected === tower) {
    movingTower = null;
    selected = null;
    blueprint = BLUEPRINTS.find((type) => type.id === tower.id);
    highlightDock();
  }
  message(`${tower.name} retirada. Recuperas ${tower.cost} ATP.`);
  persistPreparation();
  renderHUD();
};
$("pulse").onclick = () => {
  if (match.charge !== 100 || match.state !== "wave") return;
  movingHero = false;
  movingTower = null;
  aiming = !aiming;
  message(
    aiming
      ? "Toca un grupo de enemigos para romper su escudo y aturdirlo."
      : "Pulso cancelado.",
  );
  renderHUD();
};
$("speed").onclick = () => {
  speed = speed === 1 ? 2 : 1;
  persistPreparation();
  renderHUD();
};
$("tactical-pause").onclick = () => {
  if (match.state !== "wave" || modal.open) return;
  tacticalPaused = !tacticalPaused;
  if (tacticalPaused) aiming = false;
  accumulator = 0;
  lastTick = performance.now();
  message(
    tacticalPaused
      ? "Oleada detenida. Puedes construir, mejorar y cambiar objetivos."
      : "Combate reanudado.",
  );
  renderHUD();
};
document.addEventListener("keydown", (event) => {
  if (
    screen !== "field" ||
    modal.open ||
    event.defaultPrevented ||
    event.repeat ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey
  )
    return;
  if (event.key === "Escape") {
    if (movingTower) toggleTowerMove(movingTower);
    else if (movingHero) toggleBotMove();
    else if (aiming) $("pulse").click();
    else return;
    event.preventDefault();
  } else if (event.key.toLowerCase() === "p") $("tactical-pause").click();
});
$("pause").onclick = () => {
  const actions = [["Continuar"]];
  if (!match.ranked && !checkpointLost && checkpoint?.raw)
    actions.push(["Volver con guardado", campaign]);
  actions.push([
    "Abandonar partida",
    () => {
      if (match.contract) openOperations();
      else if (match.daily) view("home");
      else {
        checkpoint?.clear();
        campaign();
      }
    },
  ]);
  ask(
    "Partida en pausa",
    match.ranked
      ? "Puedes continuar la partida o abandonarla."
      : "Puedes retomar la misión desde la última preparación guardada. Abandonar descarta el punto de esta partida.",
    actions,
  );
};
$("buy-atp").onclick = () => {
  if (
    match.ranked ||
    match.state !== "build" ||
    atpBought ||
    profile.data.atpBank < 100
  )
    return;
  atpBought = true;
  profile.data.atpBank -= 100;
  match.atp += 60;
  profile.commit();
  persistPreparation();
  message("Suministro de reserva entregado.");
  renderHUD();
};
$("heal").onclick = () => {
  if (
    match.ranked ||
    match.state !== "build" ||
    repaired ||
    match.hp === 100 ||
    profile.data.bioGems < 5
  )
    return;
  repaired = true;
  profile.data.bioGems -= 5;
  match.hp = Math.min(100, match.hp + 25);
  profile.commit();
  persistPreparation();
  message("Núcleo reparado.");
  renderHUD();
};
function prepareAd() {
  if (!ad || adPreparing || ad.prepared) return;
  adPreparing = true;
  adError = "";
  void ad
    .prepare()
    .catch((reason) => {
      adError = adMessage(reason);
    })
    .finally(() => {
      adPreparing = false;
      if (screen === "field") renderHUD();
      else if (screen === "operations") renderOperations();
    });
}

$("boost").onclick = () => {
  if (
    !ad ||
    adBusy ||
    adPreparing ||
    match.ranked ||
    match.adUsed ||
    match.state !== "build"
  )
    return;
  if (!ad.prepared) {
    prepareAd();
    renderHUD();
    return;
  }
  if ($("boost").textContent !== "Ver anuncio · +75 ATP") {
    renderHUD();
    return;
  }
  const run = match;
  const canShow = () =>
    screen === "field" && match === run && run.state === "build" && !modal.open;
  const close = (reason = "") => {
    adBusy = false;
    $("field").inert = false;
    if (screen === "field" && match === run) {
      adError = reason;
      renderHUD();
    }
  };
  adBusy = true;
  adError = "";
  renderHUD();
  ad.showPreparedReward({
    placementName: "bio-lab-defense-atp_supply",
    canShow,
    onShow() {
      $("field").inert = true;
    },
    onReward() {
      if (screen !== "field" || match !== run || run.adUsed) return close();
      run.adUsed = true;
      run.atp += 75;
      persistPreparation();
      message("Suministro publicitario recibido: +75 ATP.");
      close();
    },
    onCancel: () => close("Anuncio cancelado. Puedes volver a intentarlo."),
    onError: (reason) => close(adMessage(reason)),
  });
};
modal.addEventListener("cancel", (e) => {
  if (screen === "field" && ["won", "lost"].includes(match.state))
    e.preventDefault();
});
window.addEventListener("online", () => {
  void profile.flush();
});
window.addEventListener("focus", () => {
  void profile.flush();
});
$("campaign-button").disabled =
  $("daily-button").disabled =
  $("challenge-button").disabled =
    true;
view("home");
void profile.init().finally(() => {
  prepared = true;
  checkpoint = new Checkpoint(profile.user);
  refreshCheckpoint();
  $("campaign-button").disabled = $("challenge-button").disabled = $("operations-button").disabled = false;
  refreshProfile();
});
requestAnimationFrame(frame);
