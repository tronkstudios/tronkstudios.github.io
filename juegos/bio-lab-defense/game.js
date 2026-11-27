import { affinityFor, damagePercent, towerAttack, waveAffinities, WEAKNESS, RESISTANCE } from "./affinities.js?v=3";
import { drawSpecimen, routeThumbnail } from "./menu-art.js?v=3";
import {
  BLUEPRINTS,
  Match,
  WIDTH,
  HEIGHT,
  upgradeCost,
  upgradeStats,
  reactorProduction,
  route,
  REACTOR_FIRST_CYCLE,
  suggestPlacement,
  specializations,
  TARGETING,
  VARIANT_NAMES,
  escortArmor,
  dailySetup,
} from "./engine.js?v=41";
import { routeCoverage, routeTeamCoverage, suggestPowerRelocation } from "./coverage.js?v=12";
import { attachDrill } from "./drill.js?v=15";
import { Board } from "./board.js?v=49";
import { towerIcon, heroIcon } from "./art.js?v=5";
import { createCodex } from "./codex.js?v=29";
import { Profile, dayKey } from "./profile.js?v=21";
import { adMessage, createAdSenseProvider } from "/js/h5-rewards.js?v=7";
import { CHAPTERS, MISSIONS } from "./campaign.js?v=17";
import { sound, toggleSound, soundEnabled, unlockAudio } from "./audio.js?v=3";

import { Checkpoint, restoreCheckpoint } from "./checkpoint.js?v=38";

import { HEROES, CONTRACTS, MASTERY } from "./operations.js?v=8";

const $ = (id) => document.getElementById(id);
drawSpecimen($("specimen-art"));
const sectorPreviews = new Map();
const panels = ["home", "campaign", "briefing", "operations", "field"];
const canvas = $("board");
const board = new Board(canvas);
const briefingBoard = new Board($("briefing-map"));
const lossBoard = new Board($("loss-map"));
const modal = $("modal");
const drill = $("drill");
const openDrill = attachDrill(drill, new Board($("drill-map")), () => match, tower => {
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
  persistPreparation();
}, (tower, position) => {
  if (match.relocate(tower, position.x, position.y)) {
    message(`${tower.name} reubicada.`);
    persistPreparation();
  }
  renderHUD();
});
$("run-drill").onclick = () => openDrill();
const fireOrders = $("fire-orders");
const fireMap = $("fire-map");
const fireBoard = new Board(fireMap);
let fireChoices = [];

const codex = createCodex($("codex"), () => screen === "field" && match?.fixedLayout);
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
let objectiveCoverageKey;
let laneCoverageKey;
let guideDismissed;
let guideSite;
let powerRelocation = null;
let retryReview = null;
const profile = new Profile(refreshProfile);
let checkpoint,
  checkpointLost = false;

$("home-codex").onclick = () => codex.show();
$("field-quick-plan").onclick = () => {
  $("wave-preview").scrollIntoView({ block: "start" });
  $("wave-preview-title").focus({ preventScroll: true });
};
$("field-quick-intel").onclick = () => {
  if (match.state === "wave" && match.enemies.some(enemy => enemy.hp > 0 && !enemy.escaped)) $("focus-fire").click();
  else $("field-codex").click();
};
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

let replayTimer;
function playBreach(run, breach) {
  clearTimeout(replayTimer);
  const frames = run.replay;
  const ctx = $("loss-map").getContext("2d");
  function draw(index) {
    if (!modal.open || match !== run) return;
    const frame = frames[index];
    lossBoard.draw(run, null, null, null, true, false, null, { breach });
    const dot = (x, y, radius, color) => {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    };
    const culprit = frame.enemies.find(e => e[2] === run.breachEnemy);
    for (const [x, y, range] of frame.towers) {
      dot(x, y, 8, "#80d9b1");
      if (culprit && Math.hypot(x - culprit[0], y - culprit[1]) <= range) {
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(culprit[0],culprit[1]);
        ctx.strokeStyle = "#8cffbe"; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    if (frame.hero) dot(...frame.hero, 10, "#63ddff");
    for (const [x,y,id] of frame.enemies) dot(x,y,id === run.breachEnemy ? 13 : 5,id === run.breachEnemy ? "#ff935c" : "#e0c5cc");
    $("loss-replay").textContent = index === frames.length - 1 ? "Repetir la jugada" : "Reproduciendo · Naranja: fuga · Azul: nanobot";
    if (index + 1 < frames.length) replayTimer = setTimeout(() => draw(index + 1), (frames[index+1].tick-frame.tick)*1000/60);
  }
  draw(0);
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
  clearTimeout(replayTimer);
  const replayButton = $("loss-replay");
  replayButton.hidden = !(breach && match.replay?.length);
  replayButton.textContent = breach?.objective ? "Ver cómo cayó el objetivo" : "Ver la última fuga";
  replayButton.onclick = () => playBreach(match, breach);
  $("loss-map").hidden = breach === null;
  $("loss-coverage").hidden = breach === null;
  if (breach !== null) {
    const objective = breach.objective;
    updateText("loss-coverage-title", objective ? `Enemigos que alcanzaron el objetivo · ${objective.name}` : "Enemigos que llegaron al núcleo");
    if (objective) {
      $("loss-map").setAttribute("aria-label", `Tramo hasta el objetivo · ${objective.name} · Entrada ${objective.lane ? "B" : "A"}`);
    } else {
      const lanes = breach.lanes.flatMap((count, lane) => count ? [lane ? "B" : "A"] : []);
      $("loss-map").setAttribute("aria-label",
        lanes.length === 1 ? `Recorrido de la fuga por la entrada ${lanes[0]}` : "Recorridos de las fugas por las entradas A y B");
    }
    lossBoard.draw(match, null, null, null, true, false, null, { breach });
    $("loss-entries").replaceChildren(...Array.from(breach.entries.values(), ({ name, count, lane, uncovered }) => {
      const item = document.createElement("li");
      item.textContent = `Entrada ${lane ? "B" : "A"} · ${count} × ${name}${uncovered
        ? ` · ${uncovered} ${uncovered === 1 ? "pasó" : "pasaron"} por un tramo sin cobertura` : ""}`;
      return item;
    }));
    updateText("loss-gap-summary", breach.gaps.size
      ? "Los trazos amarillos marcan los tramos donde estos enemigos avanzaron sin cobertura de torres."
      : objective
        ? "El marcador naranja señala dónde debes detener a los enemigos."
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
  const next = profile.data.unlockedLevel;
  updateText("home-story-sector", complete === MISSIONS.length
    ? "Campaña completada"
    : `Sector ${next} · ${MISSIONS[next - 1].name}`);
  updateText("home-supply-status", profile.data.lastDaily >= dayKey()
    ? "Ya recogido hoy"
    : "+250 ATP y +10 biogemas");
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

for (const id of ["hero-filter", "contract-filter"])
  $(id).onchange = renderOperations;

function focusHeroAction(hero, action) {
  const button = $("heroes").querySelector(`[data-operation="${action}-${hero.id}"]:enabled`);
  (button || $(`hero-${hero.id}-title`) || $("hero-filter")).focus({ preventScroll: true });
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
  const heroFilter = $("hero-filter").value;
  const heroes = HEROES.filter(hero => heroFilter === "all" ||
    heroFilter === (profile.data.heroOwned[hero.id] ? "owned" : "locked"));
  $("heroes-empty").hidden = heroes.length !== 0;
  $("heroes").replaceChildren(...heroes.map((hero) => {
    const owned = profile.data.heroOwned[hero.id];
    const equipped = profile.data.heroEquipped === hero.id;
    const tile = card(`${hero.name} · ${hero.role}`, hero.detail);
    tile.style.setProperty("--operation-color", hero.color);
    tile.classList.toggle("hero-equipped", equipped);
    tile.classList.add("hero-card");
    const header = document.createElement("header");
    header.className = "hero-profile";
    const identity = document.createElement("div");
    const state = document.createElement("div");
    state.className = "operation-tags";
    const rarity = document.createElement("span");
    rarity.textContent = hero.rarity;
    const availability = document.createElement("span");
    availability.textContent = equipped ? "Equipado" : owned ? "Desbloqueado" : "Bloqueado";
    availability.classList.toggle("operation-ready", equipped || owned);
    state.append(rarity, availability);
    const heading = tile.querySelector("h3");
    heading.id = `hero-${hero.id}-title`;
    heading.tabIndex = -1;
    identity.append(heading, state);
    header.append(heroIcon(hero), identity);
    tile.prepend(header);
    const ability = document.createElement("strong");
    ability.className = "hero-ability-label";
    ability.textContent = hero.ability;
    const abilityPanel = document.createElement("div");
    abilityPanel.className = "hero-ability";
    abilityPanel.append(ability, tile.querySelector("p"));
    const stats = document.createElement("dl");
    stats.className = "hero-stats";
    for (const [label, value] of [
      ["Daño base", hero.damage],
      ["Alcance", hero.range],
      ["Entre disparos", `${cadence.format(hero.fireRate / 60)} s`],
    ]) {
      const stat = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      stat.append(term, description);
      stats.append(stat);
    }
    const cooldown = document.createElement("span");
    cooldown.className = "ability-cooldown";
    cooldown.textContent = `Recarga · ${Math.ceil(hero.recharge / 60)} s`;
    abilityPanel.append(cooldown);
    const actions = document.createElement("div");
    actions.className = "operation-actions";
    tile.append(stats, abilityPanel, actions);
    if (owned) {
      actions.append(action(`equip-${hero.id}`, equipped ? "En el equipo" : "Equipar",
        () => {
          if (profile.equipHero(hero.id)) focusHeroAction(hero, "equip");
        }, equipped || adBusy));
    } else {
      const missing = Math.max(0, hero.cost - profile.data.bioGems);
      const purchaseLabel = missing ? `Faltan ${missing} biogemas · Coste ${hero.cost}`
        : `Desbloquear · ${hero.cost} biogemas`;
      const purchase = action(`buy-${hero.id}`, purchaseLabel, () => {
        if (profile.buyHero(hero.id)) {
          operationsMessage = `${hero.name} ya está disponible.`;
          renderOperations();
          focusHeroAction(hero, "equip");
        }
      }, adBusy || missing > 0);
      actions.append(purchase);
      if (!ad) return tile;
      const count = profile.data.heroAds[hero.id];
      const progress = document.createElement("progress");
      progress.max = hero.ads;
      progress.value = count;
      progress.setAttribute("aria-label", `Anuncios completados para desbloquear a ${hero.name}`);
      const rewardProgress = document.createElement("div");
      rewardProgress.className = "hero-ad-progress";
      const progressLabel = document.createElement("span");
      progressLabel.textContent = `${count}/${hero.ads} anuncios completados`;
      rewardProgress.append(progressLabel, progress);
      const label = adPreparing ? "Preparando anuncio…"
        : ad.prepared ? "Ver anuncio" : "Preparar anuncio";
      actions.append(rewardProgress,
        action(`ad-${hero.id}`, label, () => requestHeroAd(hero), adBusy || adPreparing));
    }
    return tile;
  }));
  const activeOnly = $("contract-filter").value === "ready";
  for (const [id, catalog] of [["contracts", CONTRACTS], ["mastery", MASTERY]]) {
    const contracts = catalog.filter(contract => !activeOnly || contractUnlocked(contract));
    $(`${id}-empty`).hidden = contracts.length !== 0;
    if (id === "contracts" && !contracts.length) {
      const first = CONTRACTS[0];
      updateText("contracts-empty", `Completa el sector ${first.level} · ${MISSIONS[first.level - 1].name} para jugar tu primer contrato.`);
    }
    $(id).replaceChildren(...contracts.map((contract) => {
      const score = profile.data.contracts[contract.id];
      const unlocked = contractUnlocked(contract);
      const title = contract.mastery ? CHAPTERS[contract.chapter].name : `Sector ${contract.level}`;
      const unlock = contract.mastery ? `Completa el capítulo ${contract.chapter + 1}` : `Supera el sector ${contract.level}`;
      const tile = card(contract.name, contract.detail);
      tile.classList.add("contract-card");
      const availability = document.createElement("div");
      availability.className = "operation-tags";
      const sector = document.createElement("span");
      sector.textContent = title;
      const state = document.createElement("span");
      state.classList.toggle("operation-ready", unlocked);
      state.textContent = unlocked ? "Listo para jugar" : "Bloqueado";
      availability.append(sector, state);
      tile.querySelector("h3").after(availability);
      const record = document.createElement("p");
      record.className = "contract-record";
      record.textContent = score ? `Récord personal · ${score.toLocaleString("es-ES")}` : "Sin récord personal";
      tile.append(record);
      if (contract.mastery) {
        const medal = document.createElement("p");
        medal.className = "contract-record";
        medal.textContent = profile.data.masteryMedals[contract.id]
          ? "Medalla de maestría obtenida" : "Medalla · Victoria con al menos 90 % de núcleo";
        tile.append(medal);
      }
      tile.append(action(`contract-${contract.id}`, unlocked
        ? contract.mastery ? "Jugar desafío" : "Jugar contrato" : unlock,
        () => startContract(contract), !unlocked || adBusy));
      return tile;
    }));
  }
  if (focusedAction) $("operations").querySelector(`[data-operation="${focusedAction}"]:enabled`)?.focus({preventScroll:true});
}

function openMastery(contract) {
  openOperations();
  const control = contract && $("mastery").querySelector(`[data-operation="contract-${contract.id}"]`);
  (control || $("operations-mastery")).focus();
}

function contractUnlocked(contract) {
  if (!contract.mastery) return profile.data.stars[contract.level - 1] > 0;
  return MISSIONS.every((mission, i) => mission.chapter !== contract.chapter || profile.data.stars[i] > 0);
}

function startContract(contract) {
  if (adBusy || !contractUnlocked(contract)) return;
  begin(new Match(contract.level, null, {
    contract, fixedLayout: contract.mastery, heroId: profile.data.heroEquipped,
  }));
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
    if (screen === "operations") {
      renderOperations();
      focusHeroAction(hero, profile.data.heroOwned[hero.id] ? "equip" : "ad");
    }
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
  const meter = $("campaign-progress-meter");
  meter.max = MISSIONS.length;
  meter.value = complete;
  updateText("campaign-next-action", complete === MISSIONS.length ? "Repetir último sector" : "Continuar historia");
  updateText("campaign-next-sector", `Sector ${active} · ${MISSIONS[active - 1].name}`);
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
      if (!sectorPreviews.has(level)) {
        const preview = new Match(level, null, { fixedLayout: true });
        sectorPreviews.set(level, { thumbnail: routeThumbnail(preview.routes, chapter.color), limit: preview.towerLimit });
      }
      const { thumbnail, limit } = sectorPreviews.get(level);
      button.append(number, thumbnail, label);
      if (chapter.scenery) {
        const objective = document.createElement("small");
        objective.textContent = mission.objective === "archive" ? "Proteger terminales"
          : mission.objective === "power" ? "Aislar una línea"
          : mission.routePattern === 19 ? "Apagón programado"
          : mission.routePattern ? "Desvío programado" : limit ? `Máximo de ${limit} torres` : "Defender el núcleo";
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
  const preview = new Match(level, null, { fixedLayout: true });
  const veteran = profile.data.stars[level - 1] > 0;
  const record = profile.data.veteranRecords[level - 1];
  $("veteran-briefing").hidden = !veteran;
  updateText("veteran-record", record ? `Récord Veterano · ${record.toLocaleString("es-ES")}` : "Veterano con Óptix · Récord pendiente");
  $("briefing").style.setProperty("--chapter", chapter.color);
  updateText(
    "briefing-chapter",
    `Sector ${level} · ${chapter.name}`,
  );
  updateText("briefing-title", mission.name);
  updateText("briefing-task", mission.task);
  updateText("briefing-speaker", mission.speaker);
  updateText("briefing-voice", mission.briefing);
  updateText("briefing-tip", [mission.cue, preview.firePads.length && !preview.padCycle ? "Las plataformas iluminadas dan +25 % de daño a las torres de ataque." : "", preview.limitedConstruction ? `Desde la tercera oleada llegan enemigos más resistentes. Reserva ATP para mejorar.` : preview.towerLimit ? `Dispones de ${preview.towerLimit} puestos.` : ""].filter(Boolean).join(" "));
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
  updateText("briefing-waves", `${preview.maxWaves} oleadas`);
  updateText("briefing-entries", preview.routes.length === 2 ? "2 entradas" : "1 entrada");
  $("briefing-build-sites").hidden = !preview.fixedLayout;
  if (preview.fixedLayout) {
    const sites = preview.buildSites.length;
    const capacity = preview.towerLimit != null && preview.towerLimit < sites ? `Puedes ocupar hasta ${preview.towerLimit} a la vez.` : "Puedes ocuparlos todos.";
    updateText("briefing-build-sites", `${sites} puestos de construcción. ${capacity}`);
  }
  $("briefing-finale").hidden = !mission.finale;
  if (mission.finale) {
    const finale = preview.planWave(preview.maxWaves).finale;
    updateText("briefing-finale", `Final del capítulo · ${finale.name}. ${finale.tip}`);
  }
  $("briefing-power-pads").hidden = !preview.padCycle;
  if (preview.padCycle)
    updateText("briefing-power-pads", `Plataforma ${padLetter(preview.activePad(1))} activa en la primera oleada · +50 % de daño. El tablero indica cuándo cambia la alimentación.`);
  const tacticalWaves = Object.entries({ ...mission.tactics, ...mission.counterTactics });
  $("briefing-tactics").hidden = !tacticalWaves.length;
  if (tacticalWaves.length)
    updateText("briefing-tactics", tacticalWaves.map(([wave, plan]) => `Oleada ${wave} · ${plan.name}`).join(" / "));
  $("briefing-approach").hidden = !preview.defenseObjective;
  if (preview.defenseObjective) {
    const lane = preview.defenseObjective.lane;
    updateText("briefing-approach", preview.console
      ? "Ruta a la consola · Intercepta a los enemigos en el tramo marcado."
      : `Ruta a la terminal ${lane ? "B" : "A"} · En la segunda oleada defenderás ${lane ? "A" : "B"}.`);
  }
  $("briefing-route-event").hidden = !preview.routeEvent;
  if (preview.routeEvent) updateText("briefing-route-event", describeRouteEvent(preview.routeEvent));
  const cuts = Object.entries(preview.powerCuts || {});
  $("briefing-power").hidden = !cuts.length;
  const powerSelect = $("briefing-power-wave");
  powerSelect.replaceChildren(...cuts.map(([wave, cut]) => new Option(`Oleada ${wave} · ${cut.name}`, wave)));
  powerSelect.onchange = () => briefingBoard.draw(preview, null, null, null, true, false, null, {
    routePlan: true,
    previewPowerCut: preview.powerCuts?.[powerSelect.value],
  });
  view("briefing");
  powerSelect.onchange();
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
  if (!saved) return;
  const { match } = saved;
  const sector = `Sector ${match.level} · ${match.mission.name}`;
  const wave = `Oleada ${match.wave + 1}/${match.maxWaves}`;
  updateText("home-saved-run", `${sector} · ${wave}`);
  updateText("saved-sector", `${sector} · ${wave}`);
  updateText("saved-resources", `Núcleo ${match.hp} % · ${match.atp} ATP`);
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
  if (!checkpoint.write(match, { atpBought, repaired, speed, selected, blueprint })) {
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
  const launch = () => begin(new Match(level, null, { heroId: profile.data.heroEquipped, fixedLayout: true }));
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
  objectiveCoverageKey = null;
  laneCoverageKey = null;
  guideDismissed = false;
  guideSite = null;
  powerRelocation = null;
  retryReview = null;
  $("wave-impact-choice").value = "";
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
  selected = restored?.selected || null;
  blueprint = selected ? null : restored?.blueprint || BLUEPRINTS[0];
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
  canvas.setAttribute("aria-label", match.fixedLayout
    ? "Tablero. Usa las flechas para saltar entre puestos y Espacio para construir o seleccionar una torre."
    : "Tablero. Flechas para mover el cursor y Espacio para colocar o elegir torre.");
  message(
    restored
      ? `Partida retomada. Prepara la oleada ${match.wave + 1}.`
      : match.fixedLayout ? "Selecciona una torre y toca un puesto libre marcado con +."
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
function arrangeBoardAlerts() {
  const beacons = [$("entry-start-a"), $("entry-start-b")];
  const focused = beacons.find(button => button === document.activeElement);
  const holder = compactField.matches ? $("compact-wave-beacons") : canvas.parentElement;
  holder.append(...beacons);
  const incoming = compactField.matches ? $("compact-incoming") : canvas.parentElement;
  incoming.append($("next-group-a"), $("next-group-b"), $("entry-warning"));
  focused?.focus({ preventScroll: true });
}
compactField.addEventListener("change", arrangeBoardAlerts);
arrangeBoardAlerts();
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
        persistPreparation();
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
  const limit = match.towerLimit ?? match.buildSites?.length;
  const full = limit != null && match.towers.length >= limit;
  const budgetKey = `${match.atp}:${limit ?? ""}:${match.towers.length}`;
  if (dockBudgetKey === budgetKey) return;
  dockBudgetKey = budgetKey;
  $("tower-limit").hidden = limit == null;
  if (limit != null) updateText("tower-limit", match.fixedLayout && match.towerLimit == null
    ? `${limit - match.towers.length} puestos libres`
    : `${match.towers.length}/${limit} instaladas`);
  for (const button of $("wave-counter-list").querySelectorAll("button[data-cost]")) {
    const shortfall = Number(button.dataset.cost) - match.atp;
    button.disabled = full || shortfall > 0;
    button.textContent = full ? "Límite de torres alcanzado" : shortfall > 0 ? `Faltan ${shortfall} ATP` : button.dataset.price;
    if (button.disabled) button.removeAttribute("aria-label");
    else button.setAttribute("aria-label", button.dataset.action);
  }
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
    ({ x, y } = match.closestBuildSite(x, y) || { x, y });
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
    persistPreparation();
  } else {
    ({ x, y } = match.closestBuildSite(x, y) || { x, y });
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
        match.activePad(),
        movingTower === selected,
        match.atp >= upgradeCost(selected),
        match.power?.first === null,
        !!match.defenseObjective,
        adBusy,
      ].join(":")
    : blueprint?.id;
  if (key === selectionKey) return;
  selectionKey = key;
  upgradePreview = null;
  panel.classList.toggle("installed-tower", !!selected);
  const heading = document.createElement("strong");
  const detail = document.createElement("p");
  if (!selected) {
    heading.textContent = blueprint?.name || "Elige una torre";
    detail.textContent =
      blueprint ? [blueprint.note, towerAttack[blueprint.id]].filter(Boolean).join(" · ")
        : "Toca una torre instalada para gestionarla.";
    panel.replaceChildren(heading, detail);
    return;
  }
  const tower = selected;
  heading.textContent = tower.name;
  const rank = document.createElement("span");
  rank.className = "tower-rank";
  rank.textContent = `Nivel ${tower.rank}${tower.branch ? " · " + tower.branch.name : ""}`;
  heading.append(rank);
  detail.textContent =
    tower.branch?.detail ||
    (tower.type === "eco"
      ? tower.note
      : `${tower.note} · ${tower.damage} daño · ${tower.range} alcance`);
  if (towerAttack[tower.id]) detail.textContent += ` · ${towerAttack[tower.id]}`;
  const padBonus = match.padBonus(tower);
  if (padBonus > 1) detail.textContent += ` · Plataforma de tiro +${Math.round((padBonus - 1) * 100)} %`;

  const cost = upgradeCost(tower);
  const options = document.createElement("div");
  options.className = "upgrade-options";
  if (tower.rank < 3 && match.atp < cost) {
    const budget = document.createElement("p");
    budget.id = "upgrade-shortfall";
    options.append(budget);
  }
  if (tower.rank === 1) {
    const improve = makeButton(`Mejorar · ${cost} ATP`, () => {
      if (match.upgrade(tower)) {
        rememberUpgrade();
        message(`${tower.name} mejorada a nivel 2.`);
        persistPreparation();
      }
      renderHUD();
    });
    improve.disabled = match.atp < cost;
    options.append(upgradeRow(tower, improve));
  } else if (tower.rank === 2) {
    for (const [choice, branch] of specializations(tower).entries()) {
      const improve = makeButton(`${branch.name} · ${cost} ATP`, () => {
        if (match.upgrade(tower, choice)) {
          rememberUpgrade();
          message(`Especialización «${branch.name}» activada.`);
          persistPreparation();
        }
        renderHUD();
      });
      improve.disabled = match.atp < cost;
      options.append(upgradeRow(tower, improve, branch));
    }
  }
  if (match.state === "build" && tower.rank < 3) {
    const compare = makeButton("Ensayar mejoras", () => openDrill(tower));
    compare.className = "upgrade-drill";
    compare.setAttribute("aria-haspopup", "dialog");
    compare.disabled = match.atp < cost || match.power?.first === null || adBusy;
    options.append(compare);
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
  if (match.state === "build" && match.fixedLayout && tower.type !== "eco") {
    const compare = makeButton("Ensayar traslado", () => {
      const point = rehearsalPosition(tower);
      if (point) openDrill(tower, point);
      else message("No hay otro puesto operativo para ensayar el traslado.", true);
    });
    compare.disabled = match.power?.first === null || adBusy;
    actions.append(compare);
  }
  if (tower.type !== "eco") {
    const label = document.createElement("label");
    label.className = "tower-targeting";
    label.textContent = "Prioridad de objetivo";
    const targeting = document.createElement("select");
    targeting.id = "tower-targeting";
    for (const [id, name] of TARGETING) {
      if (id === "support" && !hasBossModules(match)) continue;
      if (id === "escort" && !match.hasEnemyVariants) continue;
      if (id === "objective" && !match.defenseObjective) continue;
      if (id === "weakness" && !(match.fixedLayout && match.hasAffinities)) continue;
      targeting.add(new Option(name, id));
    }
    targeting.value = tower.targeting;
    if (!targeting.value) targeting.value = "first";
    targeting.onchange = () => {
      tower.targeting = targeting.value;
      persistPreparation();
      renderHUD();
      $("tower-targeting")?.focus({ preventScroll: true });
    };
    label.append(targeting);
    actions.prepend(label);
  }
  if (!match.contract?.noSell) {
    const sell = makeButton(`Vender · +${Math.floor(tower.paid * 0.65)} ATP`, () => {
      if (match.sell(tower)) {
        message(`${tower.name} retirada.`);
      }
      selected = null;
      movingTower = null;
      persistPreparation();
      renderHUD();
    });
    sell.className = "sell-tower";
    actions.append(sell);
  }
  const identity = document.createElement("header");
  identity.className = "tower-identity";
  identity.append(towerIcon(tower), heading);
  panel.style.setProperty("--tower-accent", tower.color);
  panel.replaceChildren(identity, detail, elPerformance(tower), options, actions);
}

function rehearsalPosition(tower) {
  const wave = match.coverageWave;
  const gap = retryReview?.points || reviewGap;
  const focus = gap ? route(gap) : match.objectiveApproach();
  const routes = match.routesForWave(wave);
  const pointScore = point => routes.reduce((score, path, lane) =>
    score + routeCoverage(path, point) * (match.preview.lanes[lane] || 0), 0) +
    (focus ? routeCoverage(focus, point) * match.preview.count : 0);
  let best;
  let score = -1;
  for (const point of match.buildSites) {
    if (point.x === tower.x && point.y === tower.y || match.checkRelocation(tower, point.x, point.y) ||
        match.towerOffline(point, wave)) continue;
    const candidate = pointScore({ ...point, range: tower.range });
    if (candidate > score) {
      score = candidate;
      best = point;
    }
  }
  return best;
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
  const title = document.createElement("strong");
  title.textContent = branch?.name || "Nivel 2";
  const description = document.createElement("p");
  description.textContent = branch?.detail || "";
  const accessibleName = purchase.textContent;
  purchase.textContent = `${branch ? "Elegir" : "Mejorar"} · ${upgradeCost(tower)} ATP`;
  purchase.setAttribute("aria-label", accessibleName);
  const controls = document.createElement("div");
  controls.className = "upgrade-controls";
  controls.append(purchase, toggle);
  row.append(title);
  if (branch) row.append(description);
  row.append(upgradeForecast(tower, branch), controls);
  return row;
}

const cadence = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
function placementForecast(tower, point, original = null, action = "") {
  const panel = $("placement-analysis");
  const resultStatus = $("wave-impact-result");
  panel.hidden = !tower;
  if (!tower) {
    resultStatus.hidden = true;
    delete panel.dataset.key;
    return;
  }
  const candidate = { ...tower, ...point, rank: tower.rank || 1 };
  const event = match.routeEvent;
  const phase = match.routeEventStatus;
  const wave = match.coverageWave;
  const routes = match.routesForWave(wave);
  const offline = match.towerOffline(candidate, wave);
  const impactChoice = $("wave-impact-choice");
  const targetIndex = Number(impactChoice.value);
  const target = match.state === "build" && impactChoice.value !== "" ? match.preview.order[targetIndex] : null;
  const hasPosition = Number.isFinite(candidate.x) && Number.isFinite(candidate.y);
  const key = [candidate.id, candidate.rank, candidate.damage, candidate.range, candidate.x, candidate.y,
    candidate.branch?.name, candidate.fireRate, original?.x, original?.y, original?.rank, action,
    match.level, match.mapIndex, match.gateDiverted, phase, match.state, match.wave, match.preview === lastPreview, impactChoice.value].join("|");
  if (panel.dataset.key === key) return;
  panel.dataset.key = key;
  resultStatus.hidden = !target || candidate.type === "eco";
  const lines = [];
  const compare = (read) => {
    const after = read(candidate);
    if (!original) return after;
    const before = read(original);
    return before === after ? after : `${before} → ${after}`;
  };
  const compareCoverage = route => compare(t => match.towerOffline(t, wave) ? 0 : routeCoverage(route, t));
  if (offline) lines.push(match.state === "wave" ? "Sin energía hasta el final de la oleada" : `Sin energía en la oleada ${wave}`);
  if (candidate.type === "eco") {
    const production = t => reactorProduction(t);
    const effective = (t, key) => match.towerOffline(t, wave) ? 0 : production(t)[key];
    lines.push(`${compare(t => effective(t, "output"))} ATP por ciclo`);
    if (!offline || original) {
      lines.push(`${compare(t => cadence.format(production(t).ticks / 60))} s por ciclo · Ritmo base`);
      lines.push(`${compare(t => Math.round(effective(t, "perMinute")))} ATP/min en combate continuo`);
    }
    const charge = compare(t => effective(t, "charge"));
    if (charge) lines.push(`${charge} puntos de pulso por ciclo`);
    if (point && !original && !offline)
      lines.push(`Primer ciclo en ${cadence.format(REACTOR_FIRST_CYCLE / 60)} s de combate`);
  } else {
    const damage = compare(t => match.towerOffline(t, wave) ? 0 : Math.round(t.damage * match.padBonus(t, wave)));
    const bonus = match.padBonus(candidate, wave);
    lines.push(`${damage} de daño por impacto${!offline && bonus > 1 ? ` · Plataforma +${Math.round((bonus - 1) * 100)} %` : ""}`);
    if (action === "Traslado" && original && !match.towerOffline(original, wave))
      lines.push("Trazo discontinuo · cobertura que pierdes");
    if (hasPosition) {
      const lanes = routes.map((route, index) => `${index ? "B" : "A"} ${compareCoverage(route)} %`);
      lines.push(`Recorrido al alcance · ${lanes.join(" / ")}`);
      const approach = match.objectiveApproach();
      if (approach) lines.push(`Antes del objetivo · ${compareCoverage(approach)} % al alcance`);
    }
    if (target) {
      const after = match.estimateImpact(candidate, target, wave);
      const before = original ? match.estimateImpact(original, target, wave) : null;
      const change = read => {
        const current = read(after);
        const previous = before && read(before);
        return before && previous !== current ? `${previous} → ${current}` : current;
      };
      const hits = change(result => `${cadence.format(result.damage)} de vida${result.shieldDamage ? ` + ${cadence.format(result.shieldDamage)} de escudo` : ""}`);
      const impact = `Contra ${target.spec.name} · ${hits} en el primer impacto`;
      lines.push(impact);
      const detail = [];
      if (target.shield) detail.push(`Sin escudo · ${change(result => cadence.format(result.unshieldedDamage))} de daño por impacto`);
      if (after.hitsToDefeat !== null || before?.hitsToDefeat != null)
        detail.push(`Impactos directos para abatir · ${change(result => result.hitsToDefeat ?? "—")}`);
      else if (target.boss) detail.push("Los cambios de fase pueden alterar el resultado.");
      lines.push(...detail);
      updateText("wave-impact-result", [candidate.name, impact, ...detail].join(" · "));
      if (hasPosition && !offline && !routeCoverage(routes[target.lane], candidate))
        lines.push(`La entrada ${target.lane ? "B" : "A"} queda fuera de alcance`);
    }
    if (hasPosition && match.state === "build" && !offline && match.preview === lastPreview) {
      const against = waveCounterProfiles.flatMap((profile, lane) => {
        const counts = profile.get(towerAttack[candidate.id]);
        if (!counts || !routeCoverage(routes[lane], candidate)) return [];
        return [`${lane ? "B" : "A"} ${counts.weak} ${counts.weak === 1 ? "débil" : "débiles"} / ${counts.resist} ${counts.resist === 1 ? "resistente" : "resistentes"}`];
      });
      if (against.length) lines.push(`Afinidades en ruta · ${against.join(" · ")}`);
    }
    if (hasPosition && phase === "warning" && wave < event.wave)
      lines.push(`B tras el desvío · ${compare(t => match.towerOffline(t, event.wave) ? 0 : routeCoverage(event.alternate, t))} %`);
  }
  if (candidate.type !== "eco" && original && candidate.fireRate !== original.fireRate)
    lines.push(`${compare(t => cadence.format(t.fireRate / 60))} s por disparo`);
  if (!offline && phase === "warning" && match.towerOffline(candidate, event.wave))
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
  const preview = document.createElement("dl");
  preview.className = "upgrade-metrics";
  const add = (name, before, after) => {
    const metric = document.createElement("div");
    const label = document.createElement("dt");
    label.textContent = name;
    const values = document.createElement("dd");
    values.textContent = before === after ? String(after) : `${before} → ${after}`;
    metric.append(label, values);
    preview.append(metric);
  };
  if (tower.type === "eco") {
    const before = reactorProduction(tower);
    const after = reactorProduction({ ...tower, ...next, rank: tower.rank + 1, branch });
    add("ATP/ciclo", before.output, after.output);
    add("Ciclo (s)", interval(before.ticks), interval(after.ticks));
    add("ATP/min", Math.round(before.perMinute), Math.round(after.perMinute));
    if (after.charge) add("Pulso/ciclo", before.charge, after.charge);
  } else {
    const bonus = match.padBonus(tower);
    add("Daño", Math.round(tower.damage * bonus), Math.round(next.damage * bonus));
    add("Alcance", tower.range, next.range);
    add("Disparo (s)", interval(tower.fireRate), interval(next.fireRate));
  }
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
  if (tower.corrosionDamage) extras.push(`Corrosión + Impacto · +${Math.round(tower.corrosionDamage)} de daño`);
  if (tower.chillDamage) extras.push(`Frío + Área · +${Math.round(tower.chillDamage)} de daño`);
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

let waveCounterProfiles = [];
function renderCounterSuggestions(preview) {
  const panel = $("wave-counters");
  waveCounterProfiles = match.hasAffinities ? waveAffinities(preview.order, match.routes.length) : [];
  const rows = waveCounterProfiles.flatMap((profile, lane) => {
    const options = [...profile.entries()].filter(([, counts]) => counts.weak > 0 && counts.weak >= counts.resist);
    options.sort(([, a], [, b]) => (b.weak - b.resist) - (a.weak - a.resist) || b.weak - a.weak);
    const [type, counts] = options.find(([attack]) =>
      BLUEPRINTS.some(tower => towerAttack[tower.id] === attack && tower.unlock <= match.techLevel)) || options[0] || [];
    if (!type) return [];
    const tower = BLUEPRINTS.filter(item => item.unlock <= match.techLevel && towerAttack[item.id] === type)
      .sort((a, b) => a.cost - b.cost)[0];
    const card = document.createElement("li");
    const text = document.createElement("div");
    const label = document.createElement("strong");
    label.textContent = `Entrada ${lane ? "B" : "A"} · ${type}`;
    const detail = document.createElement("small");
    const weak = counts.weak === 1 ? "1 débil" : `${counts.weak} débiles`;
    const resist = counts.resist === 1 ? "1 resistente" : `${counts.resist} resistentes`;
    detail.textContent = `${weak}${counts.resist ? " · " + resist : ""}`;
    text.append(label, detail);
    if (match.fixedLayout) {
      const resisted = [...profile.entries()]
        .filter(([, count]) => count.resist > count.weak)
        .sort(([, a], [, b]) => (b.resist - b.weak) - (a.resist - a.weak))[0];
      if (resisted) {
        const [attack, { resist }] = resisted;
        const warning = document.createElement("small");
        warning.textContent = `Evita ${attack} · ${resist} ${resist === 1 ? "resistente" : "resistentes"}`;
        text.append(warning);
      }
    }
    card.append(text);
    if (tower) {
      const choose = makeButton(`${tower.name} · ${tower.cost} ATP`, () => {
        $("dock").querySelector(`[data-type="${tower.id}"]`).click();
        canvas.focus({ preventScroll: true });
        canvas.scrollIntoView({ block: "nearest" });
        message(`${tower.name} seleccionada. Busca cobertura en la entrada ${lane ? "B" : "A"}.`);
      });
      choose.dataset.cost = tower.cost;
      choose.dataset.price = choose.textContent;
      choose.dataset.action = `Elegir ${tower.name} para la entrada ${lane ? "B" : "A"} por ${tower.cost} ATP`;
      card.append(choose);
    } else {
      const status = document.createElement("small");
      status.textContent = "Tipo aún bloqueado";
      card.append(status);
    }
    return [card];
  });
  panel.hidden = rows.length === 0;
  $("wave-counter-list").replaceChildren(...rows);
  dockBudgetKey = null;
}

function affinityHints({ weak, resist, weakness = WEAKNESS, resistance = RESISTANCE }) {
  return [`Débil a ${weak} (+${damagePercent(weakness)} %)`,
    `Resiste ${resist} (−${damagePercent(resistance)} %)`];
}

function renderWavePreview(preview) {
  if (preview === lastPreview) return;
  lastPreview = preview;
  const wave = match.coverageWave;
  const following = wave < match.maxWaves ? match.planWave(wave + 1) : null;
  const hints = [];
  if (following) {
    const arrivals = following.lanes.flatMap((count, lane) => {
      if (!count) return [];
      const entries = following.order.filter(e => e.lane === lane);
      const armored = entries.filter(e => e.armor > 0).length;
      const shielded = entries.filter(e => e.shield > 0).length;
      return [`${lane ? "B" : "A"} · ${count}${armored ? `, ${armored} blindados` : ""}${shielded ? `, ${shielded} con escudo` : ""}`];
    });
    hints.push(`Después · Oleada ${wave + 1}${following.final ? " con jefe" : ""} · ${arrivals.join(" / ")}`);
  }
  const lens = match.lens(wave);
  if (lens) hints.push(`Lente en ${lens.lane ? "B" : "A"} · CRISPR-Beam inflige +75 % en los dos tramos iluminados. La lente alterna de entrada en cada oleada.`);
  if (preview.order.some(e => e.variant === "emitter"))
    hints.push("El emisor móvil llega primero y protege a los seguidores cercanos. CRISPR-Beam le causa el doble de daño. Al abatirlo, los disparos individuales infligen ×2,4 a las tropas normales durante el resto de la oleada.");
  $("following-wave").textContent = hints.join(" · ");
  $("following-wave").hidden = !hints.length;
  renderCounterSuggestions(preview);
  const { count, theme, final, lanes, bossTip, order, timeline, tactics, finale } = preview;
  $("wave-finale").hidden = !finale;
  if (finale) {
    updateText("wave-finale-title", finale.name);
    $("wave-finale-stages").replaceChildren(...finale.stages.map(stage => {
      const item = document.createElement("li");
      const name = document.createElement("strong");
      name.textContent = stage.name;
      item.append(name, ` · ${stage.detail}`);
      return item;
    }));
  }
  $("wave-tactics").hidden = !tactics;
  if (tactics) {
    updateText("wave-tactics-title", tactics.name);
    updateText("wave-tactics-tip", tactics.tip);
  }
  const bossLabel = match.gateRoutes ? " · Dos jefes" : " · Jefe";
  updateText(
    "wave-preview-title",
    `${theme.name} · ${count} enemigos${lanes[1] ? " · Dos entradas" : ""}${final ? bossLabel : ""}`,
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
  const impactChoice = $("wave-impact-choice");
  const selectedName = impactChoice.selectedOptions[0]?.textContent;
  const impactLabels = new Map();
  for (const [index, entry] of order.entries()) {
    const { armor, shield } = match.entryDefense(entry, match.coverageWave);
    const variant = VARIANT_NAMES[entry.variant];
    const label = [entry.spec.name, variant, entry.lane ? "B" : "A",
      armor ? `Blindaje ${cadence.format(armor)}` : "", shield ? `Escudo ${shield}` : ""].filter(Boolean).join(" · ");
    if (!impactLabels.has(label)) impactLabels.set(label, index);
  }
  impactChoice.replaceChildren(new Option("Elegir un enemigo", ""),
    ...Array.from(impactLabels, ([label, index]) => new Option(label, index)));
  if (impactLabels.has(selectedName)) impactChoice.value = String(impactLabels.get(selectedName));
  $("wave-roster").replaceChildren(
    ...Array.from(groups, ([label, { count, shape, boss }]) => {
      const item = document.createElement("li");
      const button = makeButton(`${count} × ${label}`, () => codex.show(boss ? "boss" : "enemy", shape));
      button.setAttribute("aria-haspopup", "dialog");
      item.append(button);
      const affinity = match.hasAffinities && affinityFor(shape, match.fixedLayout);
      if (affinity) {
        const hint = document.createElement("small");
        hint.className = "roster-affinity";
        hint.textContent = affinityHints(affinity).join(" · ");
        item.append(hint);
      }
      return item;
    }),
  );
}

function hasBossModules(run) {
  return !run.daily && (run.level === 22 || run.fixedLayout && !!run.mission.finale?.storyModules);
}

function renderBoss(boss, suffix = "") {
  $(`boss-status${suffix}`).hidden = !boss;
  if (!boss) return;
  if (!suffix) {
    const stage = boss.finale?.stages[boss.phase - 2];
    $("boss-finale").hidden = !stage;
    if (stage) updateText("boss-finale", `${stage.name} · ${stage.detail}`);
    const modules = match.zeroNodes.filter(node => node.role && node.bossOwner === boss);
    $("boss-modules").hidden = !modules.length;
    if (modules.length) updateText("boss-modules", modules.map(node =>
      `${node.lane ? "B" : "A"} · ${node.name} · ${node.destroyed ? "Destruido" : node.hp <= 0 ? "Desactivado" : `${Math.ceil(node.hp)} PV`}`).join(" / "));
  }
  const name = boss.coolingBoss
    ? `${boss.name} · Entrada ${boss.lane === 0 ? "A" : "B"}`
    : boss.name;
  const accelerated = boss.coolingBoss === "runner"
    ? boss.phase >= 2
    : !boss.coolingBoss && boss.phase === 3;
  const shielded = boss.shield > 0;
  const phase = `Fase ${boss.phase}/3`;
  updateText(`boss-name${suffix}`, name);
  $(`boss-stage${suffix}`).hidden = !shielded && !accelerated;
  if (shielded || accelerated) updateText(`boss-stage${suffix}`, phase);
  updateText(`boss-phase${suffix}`, shielded ? "Escudo activo" : accelerated ? "Acelerado" : phase);
  $(`boss-health${suffix}`).value = Math.ceil(100 * boss.hp / boss.maxHp);
  updateText(`boss-vitals${suffix}`, `Vida ${Math.ceil(boss.hp)} / ${boss.maxHp}${shielded ? ` · Escudo ${Math.ceil(boss.shield)}` : ""}`);
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
      updateText(id, `${compactField.matches ? "Entrada " : ""}${letter} · ${count}${boss ? " ★" : ""}`);
      beacon.classList.toggle("wave-beacon-boss", boss);
      const label = `Iniciar oleada ${match.wave + 1} completa. Entrada ${letter}: ${count} enemigos${boss ? ", incluye jefe" : ""}.`;
      if (beacon.getAttribute("aria-label") !== label)
        beacon.setAttribute("aria-label", label);
    }
  }
  $("wave-beacon-hint").hidden = !waiting;
  if (waiting) {
    const arrivals = match.preview.arrivals.flatMap((arrival, lane) => {
      if (!arrival) return [];
      const delay = arrival.ticks / (speed * 60);
      return [`${lane ? "B" : "A"} ${delay < 1 ? "al inicio" : `a los ${cadence.format(Math.round(delay * 10) / 10)} s`}`];
    });
    const startHint = reviewGap ? "" : " Cualquier baliza inicia la oleada completa.";
    updateText("wave-beacon-hint",
      `Primera llegada · ${arrivals.join(" / ")}.${startHint}${match.preview.final ? " ★ Jefe" : ""}`);
  }
  const live = match.state === "wave";
  const groups = match.incomingGroups;
  for (const [lane, group] of groups.entries()) {
    const id = lane ? "next-group-b" : "next-group-a";
    $(id).hidden = !group || group.ticks > 270 || match.mirrorOrders[0]?.lane === lane;
    if (!$(id).hidden) {
      const delay = group.ticks / (speed * 60);
      updateText(id, `${lane ? "B" : "A"} · ${group.name} · ${delay < 1 ? "<1 s" : `${Math.ceil(delay)} s`}`);
    }
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
  if (order?.name) {
    const seconds = Math.ceil(order.ticks / (speed * 60));
    updateText("entry-warning", `${order.name} · Entrada ${order.lane ? "B" : "A"} · ${seconds} s`);
  }
  lastMirrorOrder = order;
  const hit = match.waveLeaks?.impact;
  const recentHit = live && hit && match.time - hit.tick < 150;
  const danger = live && match.enemies.some((enemy) => enemy.hp > 0 && !enemy.supportNode && enemy.remaining < 105);
  $("core-warning").hidden = !danger || !!recentHit;
  $("core-impact").hidden = !recentHit;
  if (recentHit) {
    const lanes = hit.lanes.map(lane => lane ? "B" : "A").join(" y ");
    const enemies = hit.count === 1 ? hit.name : `${hit.count} enemigos`;
    updateText("core-impact", `Núcleo −${hit.loss} % · ${enemies} · ${hit.lanes.length > 1 ? "Entradas" : "Entrada"} ${lanes}`);
  }
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
    updateText("battle-notice", match.comboNotice.label);
}

let displayedDebrief;
let reviewGap = null;
const reviewGapButton = $("wave-debrief-map");
reviewGapButton.onclick = () => {
  if (match.state !== "build" || !match.debrief?.gap) return;
  retryReview = null;
  reviewGap = reviewGap ? null : match.debrief.gap.points;
  reviewGapButton.setAttribute("aria-pressed", String(!!reviewGap));
  if (reviewGap) canvas.scrollIntoView({ block: "nearest" });
};

function renderWaveDebrief(waiting) {
  const report = $("wave-debrief");
  const data = waiting ? match.debrief : null;
  report.hidden = !data;
  if (displayedDebrief === data) return;
  displayedDebrief = data;
  reviewGap = null;
  reviewGapButton.setAttribute("aria-pressed", "false");
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
  const synergies = [
    data.corrosionDamage && `Corrosión + Impacto +${data.corrosionDamage}`,
    data.chillDamage && `Frío + Área +${data.chillDamage}`,
  ].filter(Boolean);
  $("wave-debrief-synergies").hidden = !synergies.length;
  if (synergies.length) updateText("wave-debrief-synergies", `${synergies.join(" · ")} de daño`);
  updateText("hero-impact", data.heroImpact || "");
  $("hero-impact").hidden = !data.heroImpact;
  const worst = $("wave-debrief-worst");
  worst.hidden = !data.worst;
  if (data.worst) {
    const { name, loss, lane } = data.worst;
    updateText("wave-debrief-worst", `Mayor golpe al núcleo · −${loss} % · ${name} · Entrada ${lane ? "B" : "A"}`);
  }
  const gap = $("wave-debrief-gap");
  gap.hidden = !data.gap;
  if (data.gap) {
    const { count, lane } = data.gap;
    const enemies = count === 1 ? "1 enemigo que llegó al núcleo" : `${count} enemigos que llegaron al núcleo`;
    updateText("wave-debrief-gap-text", `Entrada ${lane ? "B" : "A"} · Faltó cobertura en este tramo durante el paso de ${enemies}.`);
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

function rememberUpgrade() {
  if (match.ranked || profile.data.learnedUpgrade) return;
  profile.data.learnedUpgrade = true;
  profile.commit();
}

function introductoryTower() {
  return match.towers.find(tower => tower.rank === 1 && tower.type !== "eco");
}

$("field-guide-upgrade").onclick = () => {
  if (match.state !== "build" || adBusy) return;
  const tower = introductoryTower();
  if (!tower) return;
  selected = tower;
  blueprint = movingTower = null;
  aiming = movingHero = false;
  highlightDock();
  renderHUD();
  persistPreparation();
  const panel = $("selection");
  panel.scrollIntoView({ block: "center" });
  (panel.querySelector(".upgrade-controls button:not(:disabled)") || panel).focus({ preventScroll: true });
};

function renderFieldGuide(waiting) {
  const canTeach = waiting && !match.ranked && !guideDismissed;
  const tower = canTeach && !profile.data.learnedUpgrade && introductoryTower();
  const intro = canTeach && match.level === 1 && !profile.data.stars[0] && match.wave < 2;
  const visible = intro || !!tower;
  $("field-guide-upgrade").hidden = !tower;
  if (tower) updateText("field-guide-upgrade", `Ver mejora de ${tower.name} · ${upgradeCost(tower)} ATP`);
  const showPreview = visible && match.wave === 0 && match.towers.length === 0 &&
    match.atp >= BLUEPRINTS[0].cost && !adBusy;
  $("field-guide").hidden = !visible;
  $("field-guide-preview").hidden = !showPreview;
  if (!showPreview || blueprint !== BLUEPRINTS[0] || movingTower || movingHero || aiming)
    guideSite = null;
  $("field-guide-site").hidden = !guideSite;
  if (showPreview) updateText("field-guide-preview", guideSite ? "Quitar marcador" : "Ver posición sugerida");
  if (!visible) return;
  if (tower) {
    const next = upgradeStats(tower);
    updateText("field-guide-title", intro && match.wave === 0 ? "Lanza tu primera oleada" : "Mejora una torre instalada");
    updateText("field-guide-text", `Tu ${tower.name} puede subir a nivel 2. Daño ${tower.damage} → ${next.damage} y alcance ${tower.range} → ${next.range} desde el mismo puesto. Toca la torre para elegir la mejora.`);
  } else if (match.wave === 1) {
    updateText("field-guide-title", "Refuerza la defensa");
    updateText("field-guide-text", match.towers.length
      ? "Selecciona una torre instalada para ver cuánto ganan su daño y su alcance al mejorarla."
      : "Instala una torre junto a una curva para cubrir varios tramos del conducto.");
  } else if (match.towers.length) {
    updateText("field-guide-title", "Lanza tu primera oleada");
    updateText("field-guide-text", "Si quieres reforzar la defensa, instala una segunda torre. Pulsa Iniciar oleada 1 o la baliza A cuando estés listo.");
  } else {
    updateText("field-guide-title", "Instala tu primera torre");
    updateText("field-guide-text", guideSite
      ? `El círculo marca el alcance. Pulsa el + del tablero para instalar el Nano-Láser por ${BLUEPRINTS[0].cost} ATP.`
      : "Coloca el Nano-Láser junto al conducto o prueba la posición sugerida.");
  }
}

$("field-guide-preview").onclick = () => {
  if (guideSite) {
    guideSite = null;
    renderFieldGuide(true);
    return;
  }
  const type = BLUEPRINTS[0];
  let best = null;
  let coverage = 0;
  // Keep the marker clear of the entrance beacon and core on narrow screens.
  const sites = match.buildSites || Array.from({ length: Math.floor((WIDTH - 400) / 20) + 1 }, (_, column) =>
    Array.from({ length: Math.ceil((HEIGHT - 80) / 20) }, (_, row) => ({ x: 240 + column * 20, y: 40 + row * 20 }))).flat();
  for (const { x, y } of sites) {
    if (x < 240 || x > WIDTH - 160 || match.checkPlacement(type, x, y) || botAt(x, y, null)) continue;
    const score = routeCoverage(match.routes[0], { x, y, range: type.range });
    if (score <= coverage) continue;
    best = { x, y };
    coverage = score;
  }
  if (!best) return;
  $("dock").querySelector(`[data-type="${type.id}"]`).click();
  guideSite = best;
  const marker = $("field-guide-site");
  marker.style.setProperty("--site-x", `${best.x * 100 / WIDTH}%`);
  marker.style.setProperty("--site-y", `${best.y * 100 / HEIGHT}%`);
  renderFieldGuide(true);
  marker.focus();
};

$("field-guide-site").onclick = () => {
  if (!guideSite) return;
  const point = guideSite;
  place(point.x, point.y);
  if (!guideSite) canvas.focus({ preventScroll: true });
};

$("field-guide-dismiss").onclick = () => {
  guideDismissed = true;
  renderFieldGuide(match.state === "build");
  canvas.focus({ preventScroll: true });
};

$("power-cut-site").onclick = () => {
  const plan = powerRelocation;
  if (!plan || plan.tower !== movingTower || plan.wave !== match.coverageWave || adBusy ||
      match.towerOffline(plan.point, plan.wave)) return;
  place(plan.point.x, plan.point.y);
  if (!powerRelocation) canvas.focus({ preventScroll: true });
};

$("power-cut-relocate").onclick = () => {
  if (match.state !== "build" || adBusy) return;
  const tower = match.towers.find(tower => match.towerOffline(tower, match.coverageWave));
  if (!tower) return;
  blueprint = null;
  selected = tower;
  movingTower = null;
  upgradePreview = null;
  highlightDock();
  cursor = null;
  toggleTowerMove(tower);
  message("Elige una posición fuera de la zona ámbar.");
  const site = suggestPowerRelocation(match, tower);
  if (site) {
    powerRelocation = { ...site, tower, wave: match.coverageWave };
    const marker = $("power-cut-site");
    marker.style.setProperty("--site-x", `${site.point.x * 100 / WIDTH}%`);
    marker.style.setProperty("--site-y", `${site.point.y * 100 / HEIGHT}%`);
    renderPowerCut(true);
    marker.focus();
  } else {
    canvas.scrollIntoView({ block: "nearest" });
    canvas.focus({ preventScroll: true });
  }
  persistPreparation();
};

function renderPowerCut(waiting) {
  const wave = match.coverageWave;
  const current = match.powerCuts?.[wave];
  const upcoming = waiting && match.powerCuts?.[wave + 1];
  const cut = current || upcoming;
  const visible = cut && (waiting || match.state === "wave");
  if (!waiting || !current || powerRelocation?.tower !== movingTower || powerRelocation?.wave !== wave)
    powerRelocation = null;
  $("power-cut-site").hidden = $("power-cut-suggestion").hidden = !powerRelocation;
  $("power-cut").hidden = !visible;
  if (!visible) return;
  const cutWave = current ? wave : wave + 1;
  const affected = match.towers.filter(tower => match.towerOffline(tower, cutWave)).length;
  $("power-cut-relocate").hidden = !waiting || !current || !affected;
  updateText("power-cut-title", `Oleada ${cutWave} · ${cut.name}`);
  const towers = affected === 1 ? "1 torre afectada" : `${affected} torres afectadas`;
  updateText("power-cut-detail", current
    ? `${towers} en la zona ámbar.${waiting ? " Puedes reubicar torres gratis antes de iniciar." : " Este corte dura toda la oleada."}`
    : `Corte anunciado. ${towers} con la distribución actual.`);
  if (powerRelocation) {
    const coverage = powerRelocation.lanes.map(({ lane, before, after }) =>
      `${lane ? "B" : "A"} ${before === after ? after : `${before} → ${after}`} %`).join(" / ");
    updateText("power-cut-suggestion", [
      coverage ? `Cobertura total prevista con este traslado · ${coverage}.` : "Posición fuera del corte.",
      powerRelocation.nextCut ? "Esta posición se apagará en la siguiente oleada." : "",
      "Pulsa el marcador para confirmar.",
    ].filter(Boolean).join(" "));
  }
}

const padLetter = index => index === 0 ? "A" : "B";

function renderPowerPads(waiting) {
  const wave = match.coverageWave;
  const active = match.activePad(wave);
  const visible = active != null && (waiting || match.state === "wave");
  $("power-pads").hidden = !visible;
  if (!visible) return;
  const next = match.activePad(wave + 1);
  updateText("power-pads-title", `Oleada ${wave} · Plataforma ${padLetter(active)} activa · +50 % de daño`);
  $("power-pads-next").hidden = next == null;
  if (next != null) updateText("power-pads-next", `Oleada ${wave + 1} · ${padLetter(next)} ${next === active ? "sigue activa" : "recibe la energía"}`);
}

function renderLaneCoverage() {
  const { lanes } = match.preview;
  $("wave-lane-coverage").hidden = !lanes.every(Boolean) || lanes.length < 2;
  if ($("wave-lane-coverage").hidden) return;
  const wave = match.coverageWave;
  const towers = match.towers.filter(tower => tower.type !== "eco" && !match.towerOffline(tower, wave));
  const key = [wave, match.gateDiverted, ...towers.map(tower => `${tower.x},${tower.y},${tower.range}`)].join("|");
  if (laneCoverageKey === key) return;
  laneCoverageKey = key;
  const coverage = match.routesForWave(wave).map(route => routeTeamCoverage(route, towers));
  updateText("wave-lane-coverage", `Cobertura de torres · A ${coverage[0]} % / B ${coverage[1]} %`);
}

$("retry-hide-mark").onclick = () => {
  retryReview = null;
  $("retry-review").hidden = true;
  canvas.focus({ preventScroll: true });
};

function retryPlan(report) {
  if (!report) return null;
  let largest = null;
  for (const gap of report.gaps.values()) {
    if (gap.count > (largest?.count || 0)) largest = gap;
  }
  const objective = report.objective;
  if (!largest && !objective) return null;
  const lane = largest?.lane ?? objective.lane;
  const points = largest
    ? match.routes[lane].points.slice(largest.waypoint - 1, largest.waypoint + 1)
    : objective.points;
  const location = `Entrada ${lane ? "B" : "A"}`;
  const text = largest
    ? `${location} · ${largest.count === 1 ? "Pasó 1 enemigo" : `Pasaron ${largest.count} enemigos`} fuera del alcance de tus torres por este tramo.`
    : `${objective.name} · ${location}. El trazo marca dónde debes interceptar a los enemigos.`;
  return { points, text };
}

function renderObjectiveCoverage(waiting) {
  const objective = waiting ? match.defenseObjective : null;
  $("objective-coverage").hidden = !objective;
  if (!objective) return;
  const wave = match.coverageWave;
  const towers = match.towers.filter(tower => tower.type !== "eco" && !match.towerOffline(tower, wave));
  const key = [wave, ...towers.map(tower => `${tower.x},${tower.y},${tower.range}`)].join("|");
  if (objectiveCoverageKey === key) return;
  objectiveCoverageKey = key;
  const coverage = routeTeamCoverage(match.objectiveApproach(objective), towers);
  const name = match.console ? "Consola" : `Terminal ${objective.lane ? "B" : "A"}`;
  updateText("objective-coverage-title", `${name} · ${coverage} % del acceso cubierto`);
  updateText("objective-coverage-tip", coverage
    ? "La línea verde marca la ruta hasta el objetivo. Puedes asignar «Proteger objetivo de misión» al seleccionar una torre."
    : "Coloca una torre junto a la línea verde para interceptar a los enemigos antes de que lleguen.");
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
  updateText("field-quick-stats", `Oleada ${waiting ? match.wave + 1 : match.wave}/${match.maxWaves} · ${match.atp} ATP`);
  const defended = match.defenseObjective;
  const goal = defended ? `${match.console ? "Consola" : `Terminal ${defended.lane ? "B" : "A"}`} · ${defended.hp}/4`
    : `Núcleo · ${match.hp} %`;
  updateText("field-quick-objective", goal);
  $("field-quick-plan").hidden = !waiting;
  $("field-quick-intel").disabled = adBusy;
  renderFieldGuide(waiting);
  renderPowerCut(waiting);
  renderPowerPads(waiting);
  if (!waiting) retryReview = null;
  $("retry-review").hidden = !retryReview;
  if (retryReview) updateText("retry-review-text", retryReview.text);
  $("combat-legend").hidden = match.state !== "wave";
  renderObjectiveCoverage(waiting);
  const selectedAttack = selected && towerAttack[selected.id];
  if (waiting) renderWavePreview(match.preview);
  const selectedProfiles = waiting && selectedAttack && match.hasAffinities ? waveCounterProfiles : [];
  const laneReport = selectedProfiles.flatMap((profile, lane) => {
    const counts = profile.get(selectedAttack);
    if (!counts?.resist && !counts?.weak) return [];
    return [`${lane ? "B" : "A"} · ${counts.weak} débiles, ${counts.resist} resistentes`];
  });
  $("tower-coverage-affinity").hidden = !laneReport.length;
  if (laneReport.length) updateText("tower-coverage-affinity", `${selected.name} · ${laneReport.join(" / ")}. Tramo discontinuo si predominan resistencias.`);
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
  if (waiting) {
    renderLaneCoverage();
  }
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
  if (selected && $("upgrade-shortfall"))
    updateText("upgrade-shortfall", `Faltan ${upgradeCost(selected) - match.atp} ATP para mejorar`);
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
  if (match.fixedLayout) {
    const site = match.closestBuildSite(point.x, point.y);
    return { point: site || point, reason: site ? check(site.x, site.y) : "Construye en un puesto libre.", snapped: false };
  }
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
    const rawPoint = cursor || guideSite || powerRelocation?.point;
    const site = rawPoint && (blueprint || movingTower) && !aiming && !movingHero &&
      match.closestBuildSite(rawPoint.x, rawPoint.y);
    const point = draft?.point || site || rawPoint;
    const planned = !aiming && !movingHero && !hoverBot && !hovered && !upgradePreview && point && (movingTower || blueprint);
    const validPlan = planned && !(movingTower ? match.checkRelocation(movingTower, point.x, point.y)
      : match.checkPlacement(planned, point.x, point.y));
    if (upgradePreview) {
      placementForecast(upgradePreview.candidate, null, upgradePreview.tower,
        upgradePreview.branch?.name || `Rango ${upgradePreview.candidate.rank}`);
    } else {
      const relocating = validPlan && movingTower;
      const testing = match.state === "build" && $("wave-impact-choice").value !== "";
      const inspected = hovered || selected || (testing ? blueprint : null);
      placementForecast(validPlan ? planned : !planned && inspected, validPlan ? point : null,
        relocating || null, relocating ? "Traslado" : "");
    }
    board.draw(
      match,
      movingHero || hoverBot || upgradePreview ? null : blueprint,
      movingHero ? null : selected,
      point,
      reduced.matches,
      aiming,
      hovered,
      { gatePreview, movingHero, movingTower, skillPreview: abilityPreview || hoverBot, upgradePreview, snapOrigin: draft?.snapped ? cursor : null, reviewGap: match.state === "build" ? retryReview?.points || reviewGap : null,
        affinityProfiles: match.state === "build" && match.fixedLayout ? waveCounterProfiles : [] },
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
  const objectiveLost = match.console?.hp === 0 || match.activeTerminal?.hp === 0;
  const breach = won ? null : objectiveLost ? match.waveObjectiveHits
    : match.waveLeaks?.worst ? match.waveLeaks : null;
  const tone = won ? "victory" : "defeat";
  const outcomeStats = [["Oleadas", `${match.wave}/${match.maxWaves}`], ["Bajas", match.kills]];
  const heroImpact = match.heroImpact();
  if (heroImpact) outcomeStats.push(["Nanobot", heroImpact]);
  const diagnostics = breach ? `\n\n${lossReport(breach)}` : "";
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
    const medal = contract.mastery && won && match.hp >= 90;
    const record = won && profile.recordContract(contract.id, score, medal);
    ask(record ? contract.mastery ? "Nuevo récord de maestría" : "Nuevo récord de élite"
      : won ? contract.mastery ? "Desafío superado" : "Contrato completado"
        : contract.mastery ? "Desafío fallido" : "Contrato fallido",
      diagnostics.trim(),
      [["Reintentar", () => startContract(contract)], [contract.mastery ? "Volver a maestría" : "Volver a contratos",
        () => contract.mastery ? openMastery() : openOperations()]], breach,
      { ...combatDialog(tone, contract.name, [...outcomeStats, ["Puntos", score.toLocaleString("es-ES")]]),
        medal: medal ? "Maestría" : null });
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
  const nextMission = MISSIONS[level];
  const chapterFinished = won && mission.chapter !== nextMission?.chapter;
  const chapter = CHAPTERS[mission.chapter];
  if (chapterFinished) {
    const sectors = MISSIONS.flatMap((entry, index) => entry.chapter === mission.chapter ? [index] : []);
    const cleared = sectors.filter(index => profile.data.stars[index]).length;
    outcomeStats.push(["Sectores del capítulo", `${cleared}/${sectors.length}`]);
  }
  const buttons = won && nextMission
    ? [[chapterFinished ? "Siguiente capítulo" : "Siguiente sector", () => briefing(level + 1)]]
    : [];
  if (chapterFinished) {
    const entry = MASTERY.find(contract => contract.chapter === mission.chapter);
    if (entry && contractUnlocked(entry)) buttons.push(["Desafío de maestría", () => openMastery(entry)]);
  }
  if (!won && !checkpointLost && checkpoint?.raw) {
    const expected = checkpoint.raw;
    const failedWave = match.wave;
    const review = retryPlan(breach);
    buttons.push(["Repreparar la oleada", () => {
      const saved = savedPreparation();
      if (checkpoint.raw !== expected || !saved) return campaign();
      begin(saved.match, null, saved);
      if (saved.match.level === level && saved.match.wave + 1 === failedWave) {
        retryReview = review ? { ...review, text: `${review.text} Selecciona una torre para ensayar un traslado.` } : { text: "Prueba otro reparto de torres y compara la defensa en el ensayo de oleada." };
        renderHUD();
        canvas.scrollIntoView({ block: "nearest" });
        canvas.focus({ preventScroll: true });
      }
    }]);
  }
  buttons.push(
    [won ? "Reintentar" : "Reiniciar misión", () => {
      if (!won) checkpoint?.clear();
      start(level);
    }],
    ["Volver a sectores", campaign],
  );
  const failure = match.activeTerminal?.hp === 0 ? "La terminal activa fue destruida."
    : match.console?.hp === 0 ? "La consola de Muestreo fue destruida."
    : `El núcleo cayó en la oleada ${match.wave} de ${match.maxWaves}.`;
  const summary = (won
    ? [mission.end, chapterFinished && nextMission ? `Siguiente destino · ${CHAPTERS[nextMission.chapter].location}.` : ""]
    : [failure, lossReport(breach), objectiveLost ? "" : mission.cue]
  ).filter(Boolean).join("\n\n");
  ask(
    won
      ? level === MISSIONS.length
        ? "Laboratorio recuperado"
        : chapterFinished ? "Final de capítulo superado" : "Misión completada"
      : "Brecha de contención",
    summary,
    buttons,
    breach,
    {
      ...combatDialog(tone, chapterFinished ? `Capítulo ${mission.chapter + 1} · ${chapter.name}` : `Sector ${level} · ${mission.name}`, outcomeStats),
      stars: won ? stars : null,
      reward: earnedATP ? [["ATP de reserva", `+${earnedATP}`], ["Biogemas", `+${earnedGems}`]] : [],
      medal: earnedMedal ? mission.medal.title : null,
    },
  );
}

function lossReport(leaks) {
  if (leaks?.objective) {
    const { name, lane } = leaks.objective;
    return `${name} · Entrada ${lane ? "B" : "A"} · ${leaks.count} ${leaks.count === 1 ? "enemigo alcanzó" : "enemigos alcanzaron"} el objetivo.`;
  }
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
  // Keep the installation selectable when the nanobot stands on its base.
  if (tower && Math.hypot(bot.x - tower.x, bot.y - tower.y) < 12) return false;
  const distance = Math.hypot(bot.x - x, bot.y - y);
  return distance <= 29 && (!tower || distance < Math.hypot(tower.x - x, tower.y - y));
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
  const suggested = guideSite || powerRelocation?.point;
  cursor ||= suggested ? { x: suggested.x, y: suggested.y } : { x: WIDTH / 2, y: HEIGHT / 2 };
  if (match.fixedLayout && !aiming && !movingHero) {
    const current = match.closestBuildSite(cursor.x, cursor.y, Infinity);
    if (delta) {
      let next = current;
      let best = Infinity;
      for (const site of match.buildSites) {
        const x = site.x - current.x;
        const y = site.y - current.y;
        const forward = (x * delta[0] + y * delta[1]) / 12;
        if (forward <= 0) continue;
        const sideways = Math.abs(x * delta[1] - y * delta[0]) / 12;
        const score = forward + sideways * 1.8;
        if (score < best) {
          next = site;
          best = score;
        }
      }
      cursor = { ...next };
    } else {
      cursor = { ...current };
      place(current.x, current.y);
    }
    return;
  }
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
  } else {
    const guidance = match.hero.id === "relay" ? "Acerca a Vatio a una torre apagada."
      : match.hero.id === "lure" ? "Coloca a Nexo detrás de los enemigos para atraerlos hacia atrás."
        : "Acerca el nanobot a los enemigos para usar su habilidad.";
    message(guidance, true);
  }
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
  if (adBusy || match.state !== "build" || match.power?.first === null) return;
  persistPreparation();
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
  message(`${tower.name} retirada. Recuperas ${tower.paid} ATP.`);
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
  const inRange = match.towers.filter(tower => tower.type !== "eco" &&
    Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= tower.range);
  const available = inRange.filter(tower => !match.towerOffline(tower));
  fireBoard.draw(match, null, null, null, true, false, null, {
    focusTarget: enemy,
    fireCoverage: available,
  });
  const stats = [`Vida ${Math.ceil(enemy.hp)} / ${enemy.maxHp}`];
  if (enemy.shield > 0) stats.push(`Escudo ${Math.ceil(enemy.shield)}`);
  if (enemy.armor > 0) stats.push(`Blindaje ${Math.ceil(enemy.armor)}`);
  if (enemy.affinity) stats.push(...affinityHints(enemy.affinity));
  if (enemy.moduleExposureUntil > match.time) stats.push("Expuesto · +20 % de daño de torres");
  const extraArmor = escortArmor(enemy);
  if (extraArmor) stats.push(`Escolta +${extraArmor} de blindaje`);
  updateText("fire-details", stats.join(" · "));
  updateText("fire-coverage-title", available.length === 1
    ? "1 torre operativa con alcance"
    : `${available.length} torres operativas con alcance`);
  const names = new Map();
  for (const tower of available) names.set(tower.name, (names.get(tower.name) || 0) + 1);
  const offline = inRange.length - available.length;
  const detail = offline ? [`${offline} ${offline === 1 ? "torre sin energía" : "torres sin energía"}`] : [];
  if (available.length) {
    detail.unshift(...Array.from(names, ([name, count]) => count === 1 ? name : `${count} × ${name}`));
  } else {
    detail.push("La orden queda activa hasta que alguna torre pueda alcanzarlo.");
  }
  updateText("fire-coverage-detail", detail.join(" · "));
  $("fire-coverage").classList.toggle("fire-ready", available.length > 0);
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
  const x = (event.clientX - bounds.left - fireMap.clientLeft) * WIDTH / fireMap.clientWidth;
  const y = (event.clientY - bounds.top - fireMap.clientTop) * HEIGHT / fireMap.clientHeight;
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
    if (movingTower) {
      const suggested = !!powerRelocation;
      toggleTowerMove(movingTower);
      if (suggested) $("power-cut-relocate").focus({ preventScroll: true });
    }
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
  if (prepared) void profile.flush();
});
window.addEventListener("focus", () => {
  if (prepared) void profile.flush();
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
