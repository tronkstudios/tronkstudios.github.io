import {
  BLUEPRINTS,
  Match,
  WIDTH,
  HEIGHT,
  upgradeCost,
  specializations,
  TARGETING,
  dailySetup,
} from "./engine.js?v=5";
import { Board } from "./board.js?v=6";
import { Profile, dayKey } from "./profile.js?v=3";
import { adMessage, createAdSenseProvider } from "/js/h5-rewards.js?v=3";
import { CHAPTERS, MISSIONS } from "./campaign.js?v=1";
import { sound, toggleSound, soundEnabled, unlockAudio } from "./audio.js?v=1";

import { Checkpoint, restoreCheckpoint } from "./checkpoint.js?v=1";

const $ = (id) => document.getElementById(id);
const panels = ["home", "campaign", "briefing", "field"];
const canvas = $("board");
const board = new Board(canvas);
const briefingBoard = new Board($("briefing-map"));
const modal = $("modal");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
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
  challengeDay = null;
let atpBought,
  repaired,
  prepared = false;
let lastTick = performance.now(),
  accumulator = 0;
let selectionKey = "";
let briefingLevel = 1,
  lastBoss = false;
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

function ask(title, message, buttons) {
  $("modal-title").textContent = title;
  $("modal-text").textContent = message;
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
    match.daily ||
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
  const launch = () => begin(new Match(level));
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
  blueprint = BLUEPRINTS[0];
  selected = null;
  cursor = null;
  speed = restored?.speed || 1;
  atpBought = restored?.atpBought || false;
  repaired = restored?.repaired || false;
  selectionKey = "";
  $("sector").textContent = day
    ? `Reto · ${match.daily.name}`
    : `Sector ${level} · ${match.mission.name}`;
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
      : "Elige una torre y toca fuera del conducto para colocarla.",
  );
  $("checkpoint-state").hidden = !!day;
  if (!day) persistPreparation();
  $("supplies").hidden = !!day;
  adError = "";
  if (!day) prepareAd();
  renderHUD();
  board.draw(match, blueprint, selected, cursor, reduced.matches, aiming);
}

function message(text, warn = false) {
  $("board-status").textContent = text;
  $("board-status").classList.toggle("warning", warn);
}

function renderDock() {
  $("dock").replaceChildren(
    ...BLUEPRINTS.map((type) => {
      const button = makeButton("", () => {
        blueprint = type;
        aiming = false;
        selected = null;
        selectionKey = "";
        renderSelection();
        highlightDock();
      });
      button.className = "tower";
      button.dataset.type = type.id;
      button.style.setProperty("--tower-color", type.color);
      button.disabled = type.unlock > match.techLevel;
      const name = document.createElement("strong");
      name.textContent = type.name;
      const cost = document.createElement("small");
      cost.textContent = button.disabled
        ? `Sector ${type.unlock}`
        : `${type.cost} ATP`;
      button.append(name, cost);
      return button;
    }),
  );
  highlightDock();
}

function highlightDock() {
  for (const button of $("dock").children)
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.type === blueprint?.id),
    );
}

function place(x, y) {
  if (!match || modal.open || !["build", "wave"].includes(match.state)) return;
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
  const key = selected
    ? [
        selected.x,
        selected.y,
        selected.rank,
        selected.targeting,
        match.atp >= upgradeCost(selected),
      ].join(":")
    : blueprint?.id;
  if (key === selectionKey) return;
  selectionKey = key;
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
    options.append(improve);
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
      improve.append(note);
      options.append(improve);
    }
  }
  const actions = document.createElement("div");
  actions.className = "actions";
  if (tower.type !== "eco") {
    const targeting = makeButton("", () => {
      const index = TARGETING.findIndex(([id]) => id === tower.targeting);
      tower.targeting = TARGETING[(index + 1) % TARGETING.length][0];
      persistPreparation();
      const label = TARGETING.find(([id]) => id === tower.targeting)[1];
      targeting.textContent = `Objetivo: ${label}`;
      selectionKey = null;
      renderHUD();
      $("selection").querySelector(".targeting").focus();
    });
    targeting.className = "targeting";
    targeting.textContent = `Objetivo: ${TARGETING.find(([id]) => id === tower.targeting)[1]}`;
    actions.append(targeting);
  }
  actions.append(
    makeButton(`Vender · +${Math.floor(tower.paid * 0.65)} ATP`, () => {
      if (match.sell(tower)) {
        message(`${tower.name} retirada.`);
        persistPreparation();
      }
      selected = null;
      renderHUD();
    }),
  );
  const performance = elPerformance(tower);
  panel.replaceChildren(heading, detail, performance, options, actions);
}

function towerReport(tower) {
  if (tower.type === "eco")
    return `ATP generado · ${tower.produced.toLocaleString("es-ES")}`;
  return `Daño infligido · ${Math.round(tower.inflicted).toLocaleString("es-ES")} · Bajas ${tower.defeated}`;
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

function renderHUD() {
  updateText("hp", `${match.hp}%`);
  $("integrity").value = match.hp;
  updateText("atp", match.atp);
  updateText("wave", `${match.wave}/${match.maxWaves}`);
  const waiting = match.state === "build";
  updateText("threat-label", waiting ? "Próxima oleada" : "Quedan");
  updateText(
    "threats",
    waiting ? match.preview.count : match.enemies.length + match.queue.length,
  );
  updateText(
    "combo",
    match.combo >= 5 ? `×${match.combo} Fiebre` : `×${match.combo || 1}`,
  );
  const boss = match.enemies.find((enemy) => enemy.boss && enemy.hp > 0);
  $("boss-status").hidden = !boss;
  if (boss && !lastBoss) sound("boss");
  lastBoss = !!boss;
  if (boss) {
    updateText("boss-name", boss.name);
    updateText(
      "boss-phase",
      boss.phase === 3
        ? "Fase 3 · Acelerado"
        : boss.shield
          ? "Fase 2 · Escudo activo"
          : `Fase ${boss.phase}/3`,
    );
    $("boss-health").value = Math.ceil((100 * boss.hp) / boss.maxHp);
  }
  $("wave-preview").hidden = !waiting;
  if (waiting) {
    const { count, theme, final, lanes, bossTip } = match.preview;
    const split = lanes[1] > 0;
    $("lane-brief").hidden = !split;
    if (split) {
      updateText("lane-a", `Entrada A · ${lanes[0]}`);
      updateText("lane-b", `Entrada B · ${lanes[1]}`);
    }
    updateText(
      "wave-preview-title",
      `${theme.name} · ${count} enemigos${split ? " · Dos entradas" : ""}${final ? " · Jefe" : ""}`,
    );
    updateText("wave-preview-tip", `${theme.tip} ${bossTip}`.trim());
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
  if (match.state !== "wave") aiming = false;
  $("pulse").disabled = match.state !== "wave" || match.charge < 100;
  $("pulse").setAttribute("aria-pressed", String(aiming));
  updateText("pulse", aiming ? "Cancelar pulso" : `Pulso · ${match.charge}%`);
  const phase = waiting
    ? "Preparación"
    : match.state === "wave"
      ? match.enemies.some((enemy) => enemy.boss)
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
  const canRequestAd = ad && waiting && !match.daily && !match.adUsed;
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
    accumulator += elapsed;
    while (accumulator >= 1000 / 60) {
      for (let i = 0; i < speed; i++) match.tick();
      accumulator -= 1000 / 60;
    }
    if (lastState !== match.state) {
      lastState = match.state;
      if (match.state === "won" || match.state === "lost") finish();
      else if (match.state === "build" && match.wave) {
        persistPreparation();
        message(announce());
      }
    }
    const hovered = cursor && !aiming ? towerAt(cursor.x, cursor.y) : null;
    board.draw(
      match,
      blueprint,
      selected,
      cursor,
      reduced.matches,
      aiming,
      hovered,
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
  checkpoint?.clear();
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
  buttons.push(
    ["Reintentar", () => start(level)],
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
    : `El núcleo cayó en la oleada ${match.wave} de ${match.maxWaves}.

${mission.cue}`;
  ask(
    won
      ? level === MISSIONS.length
        ? "Laboratorio recuperado"
        : "Misión completada"
      : "Brecha de contención",
    summary,
    buttons,
  );
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
canvas.onclick = (e) => {
  const { x, y } = pointer(e);
  place(x, y);
};
canvas.onpointermove = (e) => {
  if (e.pointerType !== "touch") cursor = pointer(e);
};
canvas.onpointerleave = () => {
  if (document.activeElement !== canvas) cursor = null;
};
canvas.onblur = () => {
  cursor = null;
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
$("next").onclick = () => {
  if (adBusy) return;
  if (match.startWave()) {
    sound("wave", true);
    if (match.mission && match.wave === 2)
      updateText("radio-text", match.mission.transmission);
    message(`Oleada ${match.wave} iniciada.`);
  }
  renderHUD();
};
$("undo-build").onclick = () => {
  const tower = match.undoPlacement();
  if (!tower) return;
  if (selected === tower) {
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
$("pause").onclick = () => {
  const actions = [["Continuar"]];
  if (!match.daily && !checkpointLost && checkpoint?.raw)
    actions.push(["Volver con guardado", campaign]);
  actions.push([
    "Abandonar partida",
    () => {
      if (match.daily) view("home");
      else {
        checkpoint?.clear();
        campaign();
      }
    },
  ]);
  ask(
    "Partida en pausa",
    match.daily
      ? "Puedes continuar el reto o abandonarlo."
      : "Puedes retomar la misión desde la última preparación guardada. Abandonar descarta el punto de esta partida.",
    actions,
  );
};
$("buy-atp").onclick = () => {
  if (
    match.daily ||
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
    match.daily ||
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
    });
}

$("boost").onclick = () => {
  if (
    !ad ||
    adBusy ||
    adPreparing ||
    match.daily ||
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
  $("campaign-button").disabled = $("challenge-button").disabled = false;
  refreshProfile();
});
requestAnimationFrame(frame);
