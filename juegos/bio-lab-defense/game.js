import { drawSpecimen, routeThumbnail } from "./menu-art.js?v=2";
import {
  BLUEPRINTS,
  Match,
  WIDTH,
  HEIGHT,
  upgradeCost,
  upgradeStats,
  reactorOutput,
  suggestPlacement,
  specializations,
  TARGETING,
  VARIANT_NAMES,
  dailySetup,
} from "./engine.js?v=20";
import { routeCoverage } from "./coverage.js?v=1";
import { attachDrill } from "./drill.js?v=2";
import { Board } from "./board.js?v=26";
import { towerIcon, heroIcon } from "./art.js?v=4";
import { createCodex } from "./codex.js?v=8";
import { Profile, dayKey } from "./profile.js?v=11";
import { adMessage, createAdSenseProvider } from "/js/h5-rewards.js?v=6";
import { CHAPTERS, MISSIONS } from "./campaign.js?v=8";
import { sound, toggleSound, soundEnabled, unlockAudio } from "./audio.js?v=3";

import { Checkpoint, restoreCheckpoint } from "./checkpoint.js?v=16";

import { HEROES, CONTRACTS } from "./operations.js?v=7";

const $ = (id) => document.getElementById(id);
drawSpecimen($("specimen-art"));
const sectorThumbnails = new Map();
const panels = ["home", "campaign", "briefing", "operations", "field"];
const canvas = $("board");
const board = new Board(canvas);
const briefingBoard = new Board($("briefing-map"));
const lossBoard = new Board($("loss-map"));
const modal = $("modal");
const drill = $("drill");
$("run-drill").onclick = attachDrill(drill, new Board($("drill-map")), () => match, tower => {
  selected = tower;
  blueprint = null;
  movingHero = aiming = false;
  movingTower = null;
  upgradePreview = null;
  cursor = null;
  highlightDock();
  renderHUD();
  $("selection").scrollIntoView({ block: "nearest" });
  $("selection").focus({ preventScroll: true });
});
const fireOrders = $("fire-orders");
const fireMap = $("fire-map");
const fireBoard = new Board(fireMap);
let fireChoices = [];

const codex = createCodex($("codex"));
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
let lastCombatCue = null;
let movingTower = null;
let dockBudgetKey;
const profile = new Profile(refreshProfile);
let checkpoint,
  checkpointLost = false;

$("home-codex").onclick = () => codex.show();
$("field-codex").onclick = () => {
  if (adBusy) return;
  const tower = selected || blueprint;
  if (tower) codex.show("tower", tower.id);
  else codex.show();
};

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

function dialogStats(id, entries) {
  const list = $(id);
  list.hidden = entries.length === 0;
  list.replaceChildren(...entries.map(([label, value]) => {
    const tile = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    tile.append(term, description);
    return tile;
  }));
}

function combatDialog(tone, context, stats = []) {
  return { tone, context, stats: [["Núcleo", `${match.hp} %`], ...stats] };
}

function ask(title, message, buttons, breach = null, presentation = {}) {
  const { tone = "generic", context, stats = [], stars, reward = [], medal } = presentation;
  modal.dataset.tone = tone;
  $("modal-context").hidden = !context;
  updateText("modal-context", context || "");
  $("modal-stars").hidden = stars == null;
  if (stars != null) {
    updateText("modal-stars", "★".repeat(stars) + "☆".repeat(3 - stars));
    $("modal-stars").setAttribute("aria-label", `${stars} de 3 estrellas`);
  }
  dialogStats("modal-stats", stats);
  $("modal-rewards").hidden = !reward.length;
  $("modal-medal").hidden = !medal;
  updateText("modal-medal", medal ? `Insignia: ${medal}` : "");
  dialogStats("modal-reward-stats", reward);
  $("modal-title").textContent = title;
  $("modal-text").hidden = !message;
  $("modal-text").textContent = message;
  $("loss-map").hidden = breach === null;
  $("loss-coverage").hidden = breach === null;
  if (breach !== null) {
    const lanes = breach.lanes.flatMap((count, lane) => count ? [lane ? "B" : "A"] : []);
    $("loss-map").setAttribute("aria-label",
      lanes.length === 1 ? `Recorrido de la fuga por la entrada ${lanes[0]}` : "Recorridos de las fugas por las entradas A y B");
    lossBoard.draw(match, null, null, null, true, false, null, { breach });
    $("loss-entries").replaceChildren(...Array.from(breach.entries.values(), ({ name, count, lane, uncovered }) => {
      const item = document.createElement("li");
      item.textContent = `Entrada ${lane ? "B" : "A"} · ${count} × ${name}${uncovered
        ? ` · ${uncovered} ${uncovered === 1 ? "pasó" : "pasaron"} por un tramo sin cobertura` : ""}`;
      return item;
    }));
    updateText("loss-gap-summary", breach.gaps.size
      ? "Los trazos amarillos marcan los tramos donde estos enemigos avanzaron sin cobertura de torres."
      : "Las fugas ocurrieron sin que se detectaran tramos prolongados fuera del alcance de las torres.");
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
  const campaignMeter = $("home-progress-meter");
  campaignMeter.max = MISSIONS.length;
  campaignMeter.value = complete;
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
  const deployed = HEROES.find(hero => hero.id === profile.data.heroEquipped);
  updateText("fielded-hero", `En campaña · ${deployed.name} · ${deployed.role}`);
  const ready = CONTRACTS.filter(contract => profile.data.stars[contract.level - 1]).length;
  updateText("contract-readiness", `${ready}/${CONTRACTS.length} contratos disponibles`);
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
    const owned = profile.data.heroOwned[hero.id];
    const equipped = profile.data.heroEquipped === hero.id;
    const tile = card(`${hero.name} · ${hero.role}`, hero.detail);
    tile.style.setProperty("--operation-color", hero.color);
    tile.classList.toggle("hero-equipped", equipped);
    const header = document.createElement("header");
    header.className = "hero-profile";
    const identity = document.createElement("div");
    const state = document.createElement("p");
    state.textContent = `${hero.rarity} · ${equipped ? "En el equipo" : owned ? "Disponible" : "Bloqueado"}`;
    identity.append(tile.querySelector("h3"), state);
    header.append(heroIcon(hero), identity);
    tile.prepend(header);
    const ability = document.createElement("strong");
    ability.className = "hero-ability-label";
    ability.textContent = hero.ability;
    header.after(ability);
    const stats = document.createElement("dl");
    stats.className = "hero-stats";
    for (const [label, value] of [
      ["Daño base", hero.damage],
      ["Alcance", hero.range],
      ["Recarga", `${Math.ceil(hero.recharge / 60)} s`],
    ]) {
      const stat = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      stat.append(term, description);
      stats.append(stat);
    }
    tile.append(stats);
    if (owned) {
      tile.append(action(`equip-${hero.id}`, equipped ? "En el equipo" : "Equipar",
        () => profile.equipHero(hero.id), equipped || adBusy));
    } else {
      const count = profile.data.heroAds[hero.id];
      const progress = document.createElement("progress");
      progress.max = hero.ads;
      progress.value = count;
      progress.setAttribute("aria-label", `Anuncios completados para desbloquear a ${hero.name}`);
      tile.append(progress);
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

const starThresholds = [0, 55, 90];
function victoryStars(hp) {
  return starThresholds.filter(threshold => hp >= threshold).length;
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
  const jump = $("chapter-jump");
  const preferredChapter = jump.value || String(MISSIONS[active - 1].chapter);
  const filter = $("sector-filter").value;
  const options = [];
  let shown = 0;
  const chapters = CHAPTERS.map((chapter, index) => {
    const section = document.createElement("section");
    section.className = "chapter";
    section.id = `campaign-chapter-${index}`;
    section.style.setProperty("--chapter", chapter.color);
    const header = document.createElement("header");
    const title = document.createElement("h2");
    title.tabIndex = -1;
    title.textContent = `Capítulo ${index + 1} · ${chapter.name}`;
    const location = document.createElement("p");
    location.textContent = chapter.location;
    header.append(title, location);
    const sectors = document.createElement("div");
    sectors.className = "chapter-sectors";
    for (const [i, mission] of MISSIONS.entries()) {
      if (mission.chapter !== index) continue;
      const level = i + 1;
      const stars = profile.data.stars[i];
      if (filter !== "all" && level > active) continue;
      if (filter === "new" && stars) continue;
      if (filter === "stars" && (stars === 0 || stars === 3)) continue;
      if (filter === "medal" && profile.data.medals[i]) continue;
      shown++;
      const button = makeButton("", () => briefing(level));
      button.className = "level";
      button.id = `campaign-sector-${level}`;
      button.classList.toggle(
        "level-current",
        level === active && !profile.data.stars[i],
      );
      button.disabled = level > active;
      button.dataset.sectorState = button.disabled ? "locked" : stars ? "cleared" : level === active ? "current" : "ready";
      const number = document.createElement("small");
      number.textContent = `Sector ${String(level).padStart(2, "0")}`;
      const label = document.createElement("strong");
      label.textContent = mission.name;
      const badge = document.createElement("span");
      badge.className = `stamps${stars ? " earned" : ""}`;
      badge.textContent = button.disabled
        ? "Bloqueado"
        : stars
          ? `${"★".repeat(stars)}${"☆".repeat(3 - stars)}${profile.data.medals[i] ? " · Insignia" : ""}`
          : level === active ? "Siguiente misión" : "Disponible";
      if (!sectorThumbnails.has(level))
        sectorThumbnails.set(level, routeThumbnail(new Match(level).routes, chapter.color));
      button.append(number, sectorThumbnails.get(level), label);
      if (chapter.scenery) {
        const objective = document.createElement("small");
        objective.textContent = mission.objective === "archive" ? "Proteger terminales"
          : mission.objective === "power" ? "Aislar una línea"
          : mission.routePattern === 19 ? "Apagón programado"
          : mission.routePattern ? "Desvío programado" : `${mission.towerLimit} puestos de defensa`;
        button.append(objective);
      }
      if (filter === "medal") {
        const goal = document.createElement("small");
        goal.textContent = mission.medal.text;
        button.append(goal);
      }
      button.append(badge);
      sectors.append(button);
    }
    const indices = MISSIONS.map((m, i) => m.chapter === index ? i : -1).filter(i => i >= 0);
    const starsHere = indices.reduce((sum, i) => sum + profile.data.stars[i], 0);
    const medalsHere = indices.filter(i => profile.data.medals[i]).length;
    location.textContent += ` · ${starsHere}/${indices.length * 3} estrellas · ${medalsHere}/${indices.length} insignias`;
    if (sectors.childElementCount === 0) return null;
    options.push(new Option(`${index + 1} · ${chapter.name}`, index));
    const progress = document.createElement("meter");
    progress.className = "chapter-progress";
    progress.max = indices.length;
    progress.value = indices.filter(i => profile.data.stars[i]).length;
    progress.setAttribute("aria-label", `${progress.value} de ${progress.max} sectores completados`);
    section.append(header, progress, sectors);
    return section;
  });
  $("levels").replaceChildren(...chapters.filter(Boolean));
  jump.replaceChildren(...options);
  if (options.some(option => option.value === preferredChapter)) jump.value = preferredChapter;
  jump.disabled = $("go-chapter").disabled = shown === 0;
  $("sector-filter-result").hidden = filter === "all";
  updateText("sector-filter-result", shown ? `${shown} ${shown === 1 ? "sector disponible" : "sectores disponibles"} con este filtro.` : "No quedan sectores disponibles con este filtro.");
  $("reset-sector-filter").hidden = shown !== 0;
}

function briefing(level) {
  if (level > profile.data.unlockedLevel) return;
  briefingLevel = level;
  const mission = MISSIONS[level - 1];
  const chapter = CHAPTERS[mission.chapter];
  const preview = new Match(level);
  const veteran = profile.data.stars[level - 1] > 0;
  const record = profile.data.veteranRecords[level - 1];
  $("veteran-briefing").hidden = !veteran;
  updateText("veteran-record", record ? `Récord Veterano · ${record.toLocaleString("es-ES")}` : "Veterano con Óptix · Récord pendiente");
  $("briefing").style.setProperty("--chapter", chapter.color);
  updateText(
    "briefing-chapter",
    `Capítulo ${mission.chapter + 1} · ${chapter.name}`,
  );
  updateText("briefing-title", mission.name);
  updateText("briefing-task", mission.task);
  updateText("briefing-speaker", mission.speaker);
  updateText("briefing-voice", mission.briefing);
  updateText("briefing-tip", [mission.cue, preview.firePads.length ? "Las plataformas iluminadas dan +25 % de daño a las torres de ataque." : "", preview.towerLimit ? `Dispones de ${preview.towerLimit} puestos.` : ""].filter(Boolean).join(" "));
  updateText(
    "briefing-medal",
    profile.data.medals[level - 1]
      ? `Insignia obtenida · ${mission.medal.title}`
      : `Insignia · ${mission.medal.title}`,
  );
  updateText("briefing-medal-note", mission.medal.text);
  const best = profile.data.stars[level - 1];
  updateText("briefing-best", best === 3 ? "Mejor resultado · ★★★" :
    `${best ? "Mejor resultado · " + "★".repeat(best) + "☆".repeat(3 - best) : "Primera victoria pendiente"} · Para tres estrellas, termina con al menos ${starThresholds[2]} % de núcleo.`);
  updateText(
    "briefing-waves",
    `${preview.maxWaves} oleadas · ${preview.routes.length === 2 ? "Dos entradas" : "Una entrada"}`,
  );
  $("briefing-route-event").hidden = !preview.routeEvent;
  if (preview.routeEvent) updateText("briefing-route-event", describeRouteEvent(preview.routeEvent));
  view("briefing");
  briefingBoard.draw(preview, null, null, null, true, false, null, { routePlan: true });
}

function describeRouteEvent(event, phase = "warning") {
  const prefix = phase === "warning" ? `Oleada ${event.wave} · ${event.name}` : event.name;
  if (phase === "rerouted") return `${prefix} · Sigue activa la nueva ruta de la entrada B.`;
  if (phase === "active") return `${prefix} · La entrada B ya usa la nueva ruta.${event.blackout ? " Torres en la zona ámbar sin energía hasta el final de esta oleada." : ""}`;
  return `${prefix} · La entrada B se desviará por el trazado punteado.${event.blackout ? " Las torres de la zona ámbar se apagarán durante esa oleada." : ""}`;
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
    return false;
  if (!checkpoint.write(match, { atpBought, repaired, speed })) {
    checkpointLost = true;
    updateText(
      "checkpoint-state",
      "No se pudo actualizar el punto de guardado.",
    );
    return false;
  }
  updateText("checkpoint-state", `Punto guardado · Oleada ${match.wave + 1}`);
  return true;
}

function resumePreparation() {
  const saved = savedPreparation();
  if (saved) begin(saved.match, null, saved);
  else refreshCheckpoint();
}

function start(level, day = null, checkpointChanged = false) {
  if (day) return begin(new Match(level, dailySetup(day)), day);
  const saved = savedPreparation();
  const launch = () => begin(new Match(level, null, { heroId: profile.data.heroEquipped }));
  if (!saved) return launch();
  const confirmedCheckpoint = checkpoint.raw;
  ask(
    "Hay una partida guardada",
    checkpointChanged
      ? `El guardado cambió desde que abriste este menú. Si sigues, se reemplazará el punto actual de ${saved.match.mission.name}.`
      : `Si empiezas otra misión, se reemplazará el punto guardado de ${saved.match.mission.name}.`,
    [
      ["Retomar partida", resumePreparation],
      ["Empezar y reemplazar", () => {
        savedPreparation();
        if (checkpoint.raw !== confirmedCheckpoint) return start(level, null, true);
        launch();
      }],
      ["Volver"],
    ],
  );
}

function startVeteran(level) {
  if (!profile.data.stars[level - 1] || adBusy) return;
  begin(new Match(level, null, { veteran: true }));
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
  lastCombatCue = null;
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
    : match.contract ? match.contract.name
      : match.veteran ? `Veterano · ${match.mission.name}` : `Sector ${level} · ${match.mission.name}`;
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
  const limit = match.towerLimit;
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

function place(x, y, draftOnly = false) {
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
  const tower = draftOnly ? null : towerAt(x, y);
  if (!draftOnly && botAt(x, y, tower)) {
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
  if (match.padBonus(tower) > 1) detail.textContent += " · Plataforma de tiro +25 %";
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
    for (const [id, name] of TARGETING) {
      if (id === "support" && (match.level !== 22 || match.daily)) continue;
      if (id === "escort" && !match.hasEnemyVariants) continue;
      targeting.add(new Option(name, id));
    }
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
  const economy = tower.type === "eco";
  const row = document.createElement("div");
  row.className = "upgrade-row";
  const preview = { tower, range, branch, candidate: { ...tower, ...upgradeStats(tower, branch), branch, rank: tower.rank + 1 } };
  const label = economy ? "Ver producción" : "Ver alcance";
  const toggle = makeButton(label, () => {
    const active = upgradePreview !== preview;
    upgradePreview = active ? preview : null;
    for (const control of row.parentNode.querySelectorAll(".range-preview"))
      control.setAttribute("aria-pressed", String(active && control === toggle));
  });
  toggle.className = "range-preview";
  toggle.disabled = movingTower === tower;
  if (branch) toggle.setAttribute("aria-label", `${label} · ${branch.name}`);
  toggle.setAttribute("aria-pressed", "false");
  row.append(purchase, toggle);
  return row;
}

const cadence = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
function placementForecast(tower, point, original = null, action = "") {
  const panel = $("placement-analysis");
  panel.hidden = !tower;
  if (!tower) return;
  const candidate = { ...tower, ...point, rank: tower.rank || 1 };
  const event = match.routeEvent;
  const phase = match.routeEventStatus;
  const key = [candidate.id, candidate.rank, candidate.damage, candidate.range, candidate.x, candidate.y,
    candidate.branch?.name, candidate.fireRate, original?.x, original?.y, original?.rank, action,
    match.level, match.mapIndex, match.gateDiverted, phase, match.state, match.wave].join("|");
  if (panel.dataset.key === key) return;
  panel.dataset.key = key;
  const lines = [];
  const compare = (read) => {
    const after = read(candidate);
    if (!original) return after;
    const before = read(original);
    return before === after ? after : `${before} → ${after}`;
  };
  if (candidate.type === "eco") {
    lines.push(`${compare(t => reactorOutput(t.rank, t.branch))} ATP por ciclo`);
  } else {
    const damage = compare(t => Math.round(t.damage * match.padBonus(t)));
    lines.push(`${damage} de daño por impacto${match.padBonus(candidate) > 1 ? " · Plataforma +25 %" : ""}`);
    if (action === "Traslado") lines.push("Trazo discontinuo · cobertura que pierdes");
    const lanes = match.routes.map((route, index) =>
      `${index ? "B" : "A"} ${compare(t => routeCoverage(route, t))} %`);
    lines.push(`Recorrido al alcance · ${lanes.join(" / ")}`);
    if (phase === "warning") lines.push(`B tras el desvío · ${compare(t => routeCoverage(event.alternate, t))} %`);
  }
  if (original && candidate.fireRate !== original.fireRate)
    lines.push(`${compare(t => cadence.format(t.fireRate / 60))} s por ${candidate.type === "eco" ? "ciclo" : "disparo"}`);
  if (match.towerOffline(candidate)) lines.push("Sin energía hasta el final de la oleada");
  else if (event?.blackout && phase === "warning" &&
      Math.hypot(candidate.x - event.blackout.x, candidate.y - event.blackout.y) <= event.blackout.radius)
    lines.push(`Apagón aquí en la oleada ${event.wave}`);
  panel.replaceChildren(...[action ? `${candidate.name} · ${action}` : candidate.name, ...lines].map((value, i) => {
    const text = document.createElement(i ? "span" : "strong");
    text.textContent = value;
    return text;
  }));
}

function upgradeForecast(tower, branch) {
  const next = upgradeStats(tower, branch);
  const interval = (ticks) => cadence.format(ticks / 60);
  const stats = tower.type === "eco"
    ? `ATP por ciclo ${reactorOutput(tower.rank, tower.branch)} → ${reactorOutput(tower.rank + 1, branch)}`
    : `Daño ${Math.round(tower.damage * match.padBonus(tower))} → ${Math.round(next.damage * match.padBonus(tower))} · Alcance ${tower.range} → ${next.range}`;
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
  const { count, theme, final, lanes, bossTip, order, timeline } = preview;
  const finale = match.gateRoutes ? " · Dos jefes" : " · Jefe";
  updateText(
    "wave-preview-title",
    `${theme.name} · ${count} enemigos${lanes[1] ? " · Dos entradas" : ""}${final ? finale : ""}`,
  );
  updateText("wave-preview-tip", `${theme.tip} ${bossTip}`.trim());
  $("wave-timeline").replaceChildren(...timeline.map((group) => {
    const item = document.createElement("li");
    const when = document.createElement("time");
    when.textContent = group.time < 60 ? "Inicio" : `+${Math.round(group.time / 60)} s`;
    const directions = group.lanes.flatMap((n, lane) => n ? [`${lane ? "B" : "A"} · ${n}`] : []);
    const detail = document.createElement("span");
    detail.textContent = `${group.name} · ${directions.join(" / ")}`;
    item.append(when, detail);
    return item;
  }));
  const groups = new Map();
  for (const { spec, boss, armor, shield, variant } of order) {
    const label = boss
      ? `Jefe · ${spec.name}`
      : spec.name + (variant ? ` · ${VARIANT_NAMES[variant]}` : "") +
        (armor ? " con blindaje" : shield ? " con escudo" : "");
    const group = groups.get(label);
    if (group) group.count++;
    else groups.set(label, { count: 1, shape: spec.shape, boss });
  }
  $("wave-roster").replaceChildren(
    ...Array.from(groups, ([label, { count, shape, boss }]) => {
      const item = document.createElement("li");
      const button = makeButton(`${count} × ${label}`, () => codex.show(boss ? "boss" : "enemy", shape));
      button.setAttribute("aria-haspopup", "dialog");
      item.append(button);
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
  for (const [lane, path] of match.routes.entries())
    positionMapControl($(lane ? "next-group-b" : "next-group-a"), path.points[0]);
  positionMapControl($("core-warning"), match.routes[0].points.at(-1));
}

function renderFieldControls(waiting) {
  for (const [lane, id] of ["entry-start-a", "entry-start-b"].entries()) {
    const beacon = $(id);
    const active = waiting && match.preview.lanes[lane] > 0;
    beacon.hidden = !active;
    beacon.disabled = adBusy || match.power?.first === null;
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
  const groups = match.incomingGroups;
  for (const [lane, group] of groups.entries()) {
    const id = lane ? "next-group-b" : "next-group-a";
    $(id).hidden = !group || group.ticks > 270 || match.mirrorOrders[0]?.lane === lane;
    if (!$(id).hidden)
      updateText(id, `${lane ? "B" : "A"} · ${group.name} en ${Math.max(1, Math.ceil(group.ticks / (speed * 60)))} s`);
  }
  $("zero-nodes").hidden = !live || !match.zeroNodes.some((node) => node.bossOwner.hp > 0);
  for (const node of match.zeroNodes) {
    const seconds = Math.max(1, Math.ceil((node.nextPulse - match.time) / (speed * 60)));
    const state = node.destroyed ? "Destruido" : node.hp <= 0 ? "Agotado"
      : node.nextPulse >= node.expires ? "Se agota pronto" : `Refuerzos en ${seconds} s`;
    const suffix = node.lane ? "b" : "a";
    updateText(`zero-state-${suffix}`, state);
    $(`zero-hp-${suffix}`).value = Math.ceil(Math.max(0, node.hp) / node.maxHp * 100);
  }
  const cue = match.combatCue;
  $("combat-cue").hidden = !cue || cue.until <= match.time;
  if (!$("combat-cue").hidden && cue !== lastCombatCue) {
    $("combat-cue").dataset.kind = cue.kind;
    updateText("combat-cue", cue.text);
    sound(cue.kind);
  }
  lastCombatCue = cue;
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
  const terminal = match.activeTerminal;
  const objective = match.console || match.archive;
  const power = match.power;
  $("power-lines").hidden = !power;
  if (power) {
    const isolated = match.isolatedLane(waiting ? match.wave + 1 : match.wave);
    updateText("power-state", power.first === null ? "Elige qué línea aislar primero."
      : isolated === null ? "Las dos líneas están aisladas."
      : `Línea ${isolated ? "B" : "A"} aislada · Enemigos más lentos.`);
    for (const [lane, id] of ["cut-a", "cut-b"].entries()) {
      $(id).hidden = !waiting || match.wave !== 0;
      $(id).setAttribute("aria-pressed", String(power.first === lane));
    }
  }
  const combo = live && match.comboNotice?.until > match.time;
  $("field-alerts").hidden = !objective && !combo;
  $("mission-objective").hidden = !objective;
  $("battle-notice").hidden = !combo;
  if (match.archive)
    updateText("mission-objective", terminal
      ? `Protege la terminal ${terminal.lane ? "B" : "A"} · Integridad ${terminal.hp}/4`
      : "Las dos terminales están aseguradas.");
  else if (match.console)
    updateText("mission-objective", match.console.complete ? "Copia recuperada" : `Protege la consola · Integridad ${match.console.hp}/4`);
  if (combo)
    updateText("battle-notice", `Combo de torres · ${match.comboNotice.count} enemigos ralentizados alcanzados`);
}

let displayedDebrief;
function renderWaveDebrief(waiting) {
  const report = $("wave-debrief");
  const data = waiting ? match.debrief : null;
  report.hidden = !data;
  if (displayedDebrief === data) return;
  displayedDebrief = data;
  report.open = false;
  if (!data) return;

  const core = data.damage ? `Núcleo −${data.damage} %` : "Núcleo intacto";
  updateText("wave-debrief-title", `Oleada ${match.wave} · ${data.kills} abatidos · +${data.atp} ATP · ${core}`);
  const leaks = $("wave-debrief-leaks");
  leaks.hidden = !data.leaks;
  if (data.leaks) {
    const counts = data.leaks.map((count, lane) => `Entrada ${lane ? "B" : "A"} · ${count} ${count === 1 ? "fuga" : "fugas"}`);
    leaks.textContent = counts.join(" / ");
  }
  const sources = [
    ["Enemigos abatidos", data.bounties], ["Bio-Reactores", data.reactor],
    ["Cierre de oleada", data.payout], ["Refuerzo", data.reserve], ["Compensación por fugas", data.recovery],
  ].filter(([, amount]) => amount > 0);
  if (data.payout == null)
    sources.unshift(["ATP de combate y cierre", data.atp - (data.reserve || 0) - (data.recovery || 0)]);
  $("wave-debrief-atp").replaceChildren(...sources.map(([label, amount]) => {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const value = document.createElement("dd");
    term.textContent = label;
    value.textContent = `+${amount} ATP`;
    row.append(term, value);
    return row;
  }));
}

function renderHUD() {
  const focused = match.state === "wave" && match.focusTarget;
  $("focused-vitals").hidden = !focused;
  if (focused) {
    const hp = Math.ceil(focused.hp);
    const meter = $("focused-hp");
    if (meter.max !== focused.maxHp) meter.max = focused.maxHp;
    if (meter.value !== hp) meter.value = hp;
    updateText("focused-values", `${hp} / ${focused.maxHp}${focused.shield ? ` · Escudo ${Math.ceil(focused.shield)}` : ""}`);
  }
  $("focus-fire").hidden = match.state !== "wave";
  $("focus-fire").disabled = !match.enemies.some(enemy => enemy.hp > 0 && !enemy.escaped);
  updateText("focus-fire", match.focusTarget ? `Objetivo · ${match.focusTarget.name}` : "Concentrar fuego");
  updateText("hp", `${match.hp}%`);
  $("integrity").value = match.hp;
  updateText("atp", match.atp);
  updateText("wave", `${match.wave}/${match.maxWaves}`);
  const waiting = match.state === "build";
  const targets = $("mission-targets");
  targets.hidden = match.ranked || !["build", "wave"].includes(match.state);
  if (!targets.hidden && targets.open) {
    const medal = match.mission.medal;
    const stars = victoryStars(match.hp);
    const nextStar = stars < 3 ? ` · Siguiente estrella al ${starThresholds[stars]} %` : "";
    updateText("star-pace", `Si ganas con ${match.hp} % de núcleo · ${"★".repeat(stars)}${"☆".repeat(3 - stars)}${nextStar}`);
    updateText("medal-pace", profile.data.medals[match.level - 1] ? `Insignia obtenida · ${medal.title}` :
      `${medal.title} · ${medal.test(match) ? "Cumples la condición ahora" : "Condición pendiente"}. ${medal.text} · ${medal.progress(match)}`);
  }
  const routeStatus = match.routeEventStatus;
  $("route-event").hidden = !routeStatus;
  if (routeStatus) updateText("route-event", describeRouteEvent(match.routeEvent, routeStatus));
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
  $("run-drill").disabled = match.power?.first === null || adBusy;
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
  renderWaveDebrief(waiting);
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
  $("next").disabled = !waiting || adBusy || match.power?.first === null;
  updateText(
    "next",
    waiting ? match.power?.first === null ? "Elige una línea" : `Iniciar oleada ${match.wave + 1}` : "Oleada en curso",
  );
  $("speed").setAttribute("aria-pressed", String(speed === 2));
  updateText("speed", `Velocidad ×${speed}`);
  $("tactical-pause").disabled = match.state !== "wave";
  $("tactical-pause").classList.toggle("engaged", tacticalPaused);
  $("tactical-pause").setAttribute("aria-pressed", String(tacticalPaused));
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
  $("buy-atp").disabled = !waiting || checkpointLost || atpBought || profile.data.atpBank < 100;
  $("heal").disabled =
    !waiting || checkpointLost || repaired || match.hp === 100 || profile.data.bioGems < 5;
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
function touchDraft(point, dragging) {
  const check = movingTower
    ? (x, y) => match.checkRelocation(movingTower, x, y)
    : (x, y) => match.checkPlacement(blueprint, x, y);
  const reason = check(point.x, point.y);
  const geometry = ["Acércate al interior del tablero.", "Deja despejado el conducto.", "Deja despejado el futuro desvío.", "Hay otra torre demasiado cerca."];
  const canSuggest = dragging && geometry.includes(reason) &&
    point.x >= 0 && point.x <= WIDTH && point.y >= 0 && point.y <= HEIGHT;
  const suggestion = canSuggest ? suggestPlacement(point, check) : null;
  return { point: suggestion || point, reason: suggestion ? "" : reason, snapped: !!suggestion };
}

function resetFrameClock() {
  lastTick = performance.now();
  accumulator = 0;
}

document.addEventListener("visibilitychange", () => {
  resetFrameClock();
  if (!document.hidden || screen !== "field" || match.state !== "wave") return;
  boardPointer = null;
  cursor = null;
  // Keep the battle paused when the player returns, including after a long suspension.
  if (tacticalPaused) return;
  tacticalPaused = true;
  aiming = false;
  message("La partida se pausó al salir. Pulsa Reanudar cuando estés listo.");
  renderHUD();
});

modal.addEventListener("cancel", event => {
  if (screen === "field" && ["lost", "won"].includes(match.state))
    event.preventDefault();
});

function frame(now) {
  const elapsed = Math.max(0, Math.min(100, now - lastTick));
  lastTick = now;
  if (screen === "field" && !modal.open && !codex.open && !fireOrders.open && !drill.open && !document.hidden) {
    accumulator = tacticalPaused ? 0 : accumulator + elapsed;
    while (accumulator >= 1000 / 60) {
      for (let i = 0; i < speed && match.state !== "lost" && match.state !== "won"; i++) match.tick();
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
    const dragging = boardPointer?.type === "touch" && boardPointer.dragging && (blueprint || movingTower)
      && !aiming && !movingHero;
    const canHover = cursor && !aiming && !movingHero && !movingTower && !dragging;
    const hoverTower = canHover ? towerAt(cursor.x, cursor.y) : null;
    const hoverBot = canHover && botAt(cursor.x, cursor.y, hoverTower);
    const hovered = hoverBot ? null : hoverTower;
    const touchPreview = boardPointer?.type === "touch" && cursor && (blueprint || movingTower) && !aiming && !movingHero && !hovered && !hoverBot;
    $("placement-preview").hidden = !touchPreview;
    const draft = touchPreview ? touchDraft(cursor, dragging) : null;
    if (draft) {
      const hint = movingTower ? "Suelta para reubicar" : `Suelta para instalar · ${blueprint.cost} ATP`;
      updateText("placement-preview", draft.reason || (draft.snapped ? `Punto sugerido · s${hint.slice(1)}` : hint));
      $("placement-preview").classList.toggle("invalid", !!draft.reason);
    }
    const point = draft?.point || cursor;
    const planned = !aiming && !movingHero && !hoverBot && !hovered && !upgradePreview && point && (movingTower || blueprint);
    const validPlan = planned && !(movingTower ? match.checkRelocation(movingTower, point.x, point.y)
      : match.checkPlacement(planned, point.x, point.y));
    if (upgradePreview) {
      placementForecast(upgradePreview.candidate, null, upgradePreview.tower,
        upgradePreview.branch?.name || `Rango ${upgradePreview.candidate.rank}`);
    } else {
      const relocating = validPlan && movingTower;
      placementForecast(validPlan ? planned : !planned && (hovered || selected), validPlan ? point : null,
        relocating || null, relocating ? "Traslado" : "");
    }
    board.draw(
      match,
      movingHero || hoverBot || upgradePreview ? null : blueprint,
      movingHero ? null : selected,
      draft?.point || cursor,
      reduced.matches,
      aiming,
      hovered,
      { gatePreview, movingHero, movingTower, skillPreview: abilityPreview || hoverBot, upgradePreview, snapOrigin: draft?.snapped ? cursor : null },
    );
    renderHUD();
  } else {
    accumulator = 0;
  }
  requestAnimationFrame(frame);
}

function finish() {
  const won = match.state === "won";
  const stars = won ? victoryStars(match.hp) : 0;
  const { level } = match;
  const breach = !won && match.waveLeaks?.worst ? match.waveLeaks : null;
  const tone = won ? "victory" : "defeat";
  const outcomeStats = [["Oleadas", `${match.wave}/${match.maxWaves}`], ["Bajas", match.kills]];
  const diagnostics = breach ? `\n\n${lossReport()}` : "";
  sound(won ? "victory" : "defeat");
  if (match.veteran) {
    const score = match.score();
    const record = won && profile.recordVeteran(level, score);
    ask(record ? "Nuevo récord Veterano" : won ? "Sector Veterano superado" : "Intento Veterano terminado",
      diagnostics.trim(),
      [["Reintentar", () => startVeteran(level)], ["Volver al sector", () => briefing(level)]], breach,
      combatDialog(tone, match.mission.name, [...outcomeStats, ["Puntos", score.toLocaleString("es-ES")]]));
    return;
  }
  if (match.contract) {
    const contract = match.contract;
    const score = match.score();
    const record = won && profile.recordContract(contract.id, score);
    ask(record ? "Nuevo récord de élite" : won ? "Contrato completado" : "Contrato fallido",
      diagnostics.trim(),
      [["Reintentar", () => startContract(contract)], ["Volver a contratos", openOperations]], breach,
      combatDialog(tone, contract.name, [...outcomeStats, ["Puntos", score.toLocaleString("es-ES")]]));
    return;
  }
  if (challengeDay) {
    const score = match.score();
    const record = profile.recordDaily(challengeDay, score);
    ask(
      record ? "Nuevo récord diario" : "Reto terminado",
      diagnostics.trim(),
      [
        ["Reintentar", () => start(level, challengeDay)],
        ["Volver al menú", () => view("home")],
      ],
      breach,
      combatDialog(tone, match.daily.name, [...outcomeStats, ["Puntos", score.toLocaleString("es-ES")]]),
    );
    return;
  }
  if (won) checkpoint?.clear();
  const mission = match.mission;
  let earnedMedal = false;
  let earnedATP = 0;
  let earnedGems = 0;
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
      earnedATP = earnedStars * 55 + (earnedMedal ? 35 : 0);
      earnedGems = earnedStars * 2 + (earnedMedal ? 2 : 0);
      profile.data.atpBank += earnedATP;
      profile.data.bioGems += earnedGems;
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
    ? mission.end
    : `${match.activeTerminal?.hp === 0 ? "La terminal activa fue destruida." : match.console?.hp === 0 ? "La consola de Muestreo fue destruida." : `El núcleo cayó en la oleada ${match.wave} de ${match.maxWaves}.`}

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
    breach,
    {
      ...combatDialog(tone, `Sector ${level} · ${mission.name}`, outcomeStats),
      stars: won ? stars : null,
      reward: earnedATP ? [["ATP de reserva", `+${earnedATP}`], ["Biogemas", `+${earnedGems}`]] : [],
      medal: earnedMedal ? mission.medal.title : null,
    },
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
  boardPointer = { id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY, dragging: false };
  cursor = pointer(event);
  if (event.pointerType === "touch") canvas.setPointerCapture(event.pointerId);
};
canvas.onpointermove = (event) => {
  if (boardPointer?.id === event.pointerId && event.pointerType === "touch" &&
      Math.hypot(event.clientX - boardPointer.x, event.clientY - boardPointer.y) >= 7)
    boardPointer.dragging = true;
  if (boardPointer?.id === event.pointerId || event.pointerType !== "touch")
    cursor = pointer(event);
};
canvas.onpointerup = (event) => {
  if (boardPointer?.id !== event.pointerId) return;
  const point = pointer(event);
  const dragging = event.pointerType === "touch" && boardPointer.dragging &&
    (blueprint || movingTower) && !movingHero && !aiming;
  boardPointer = null;
  if (event.pointerType === "touch") {
    cursor = null;
    $("placement-preview").hidden = true;
  }
  if (point.x < 0 || point.x > WIDTH || point.y < 0 || point.y > HEIGHT) return;
  const destination = dragging ? touchDraft(point, true).point : point;
  place(destination.x, destination.y, !!dragging);
};
canvas.onpointercancel = (event) => {
  if (boardPointer?.id === event.pointerId) {
    boardPointer = null;
    cursor = null;
    $("placement-preview").hidden = true;
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
$("sector-filter").onchange = renderLevels;
$("reset-sector-filter").onclick = () => {
  $("sector-filter").value = "all";
  renderLevels();
  $("sector-filter").focus();
};
$("go-chapter").onclick = () => {
  const heading = $(`campaign-chapter-${$("chapter-jump").value}`).querySelector("h2");
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ block: "start" });
};
$("resume-mission").onclick = () => briefing(profile.data.unlockedLevel);
$("home-resume-run").onclick = resumePreparation;
$("campaign-resume-run").onclick = resumePreparation;
$("back-campaign").onclick = () => {
  campaign();
  if (!$(`campaign-sector-${briefingLevel}`)) {
    $("sector-filter").value = "all";
    renderLevels();
  }
  const sector = $(`campaign-sector-${briefingLevel}`);
  $("chapter-jump").value = String(MISSIONS[briefingLevel - 1].chapter);
  sector.focus({ preventScroll: true });
  sector.scrollIntoView({ block: "nearest" });
};
$("launch-mission").onclick = () => start(briefingLevel);
$("launch-veteran").onclick = () => startVeteran(briefingLevel);
for (const [lane, id] of ["cut-a", "cut-b"].entries()) $(id).onclick = () => {
  if (!match.selectPowerLine(lane)) return;
  persistPreparation();
  renderHUD();
};
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
    movingHero = false;
    boardPointer = null;
    cursor = null;
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
function inspectFireTarget() {
  const enemy = fireChoices[$("fire-choice").selectedIndex];
  if (!enemy) return;
  fireBoard.draw(match, null, null, null, true, false, null, { focusTarget: enemy });
  const towers = match.towers.filter(tower => tower.type !== "eco" && !match.towerOffline(tower) &&
    Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= tower.range).length;
  const stats = [`Vida ${Math.ceil(enemy.hp)} / ${enemy.maxHp}`];
  if (enemy.shield > 0) stats.push(`Escudo ${Math.ceil(enemy.shield)}`);
  if (enemy.armor > 0) stats.push(`Blindaje ${Math.ceil(enemy.armor)}`);
  stats.push(`${towers} ${towers === 1 ? "torre con alcance" : "torres con alcance"}`);
  updateText("fire-details", stats.join(" · "));
}
$("focus-fire").onclick = () => {
  fireChoices = match.enemies.filter(enemy => enemy.hp > 0 && !enemy.escaped)
    .sort((a, b) => a.remaining - b.remaining);
  if (!fireChoices.length || match.state !== "wave") return;
  const select = $("fire-choice");
  select.replaceChildren(...fireChoices.map((enemy, index) => {
    const role = enemy.boss ? "Jefe" : VARIANT_NAMES[enemy.variant];
    const position = enemy.supportNode ? "Nodo fijo" : `${Math.round(enemy.remaining)} px al núcleo`;
    return new Option(`${enemy.name}${role ? " · " + role : ""} · Entrada ${enemy.lane ? "B" : "A"} · ${position}`, index);
  }));
  select.selectedIndex = Math.max(0, fireChoices.indexOf(match.focusTarget));
  $("fire-clear").hidden = !match.focusTarget;
  fireOrders.showModal();
  inspectFireTarget();
};
$("fire-choice").onchange = inspectFireTarget;
fireMap.onclick = event => {
  const bounds = fireMap.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * WIDTH / bounds.width;
  const y = (event.clientY - bounds.top) * HEIGHT / bounds.height;
  let closest = Math.max(28, 22 * WIDTH / bounds.width);
  let index = -1;
  for (const [i, enemy] of fireChoices.entries()) {
    const distance = Math.hypot(x - enemy.x, y - enemy.y);
    if (distance <= closest) { closest = distance; index = i; }
  }
  if (index < 0) return;
  $("fire-choice").selectedIndex = index;
  inspectFireTarget();
};
$("fire-confirm").onclick = () => {
  match.focusFire(fireChoices[$("fire-choice").selectedIndex]);
  fireOrders.close();
  renderHUD();
};
$("fire-clear").onclick = () => {
  match.focusFire(null);
  fireOrders.close();
  renderHUD();
};
fireOrders.onclose = () => { fireChoices = []; };
$("speed").onclick = () => {
  speed = speed === 1 ? 2 : 1;
  persistPreparation();
  renderHUD();
};
$("tactical-pause").onclick = () => {
  if (match.state !== "wave" || modal.open) return;
  tacticalPaused = !tacticalPaused;
  if (tacticalPaused) aiming = false;
  resetFrameClock();
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
    codex.open || fireOrders.open || drill.open ||
    event.defaultPrevented ||
    event.repeat ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey
  )
    return;
  if (event.key === "Escape") {
    if (movingTower) toggleTowerMove(movingTower);
    else if (upgradePreview) $("selection").querySelector('.range-preview[aria-pressed="true"]')?.click();
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
      else if (match.veteran) briefing(match.level);
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
    null,
    combatDialog("pause", $("sector").textContent,
      [["Oleadas", `${match.wave}/${match.maxWaves}`], ["ATP", match.atp]]),
  );
};
$("buy-atp").onclick = () => {
  if (
    match.ranked ||
    match.state !== "build" ||
    checkpointLost ||
    atpBought ||
    profile.data.atpBank < 100
  )
    return;
  atpBought = true;
  match.atp += 60;
  if (!persistPreparation()) {
    atpBought = false;
    match.atp -= 60;
    message("El guardado no está disponible. Conservas tu reserva.", true);
    renderHUD();
    return;
  }
  profile.data.atpBank -= 100;
  profile.commit();
  message("Suministro de reserva entregado.");
  renderHUD();
};
$("heal").onclick = () => {
  if (
    match.ranked ||
    match.state !== "build" ||
    checkpointLost ||
    repaired ||
    match.hp === 100 ||
    profile.data.bioGems < 5
  )
    return;
  repaired = true;
  const previousHP = match.hp;
  match.hp = Math.min(100, match.hp + 25);
  if (!persistPreparation()) {
    repaired = false;
    match.hp = previousHP;
    message("El guardado no está disponible. Conservas tus biogemas.", true);
    renderHUD();
    return;
  }
  profile.data.bioGems -= 5;
  profile.commit();
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
