import {
  BLUEPRINTS,
  SECTORS,
  Match,
  WIDTH,
  HEIGHT,
  upgradeCost,
  specializations,
  TARGETING,
  dailySetup,
} from "./engine.js?v=2";
import { Board } from "./board.js?v=2";
import { Profile, dayKey } from "./profile.js?v=2";
import { adMessage, createAdSenseProvider } from "/js/h5-rewards.js?v=1";

const $ = (id) => document.getElementById(id);
const panels = ["home", "campaign", "field"];
const canvas = $("board");
const board = new Board(canvas);
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
let aiming = false,
  challengeDay = null;
let atpBought,
  repaired,
  prepared = false;
let lastTick = performance.now(),
  accumulator = 0;
let selectionKey = "";
const profile = new Profile(refreshProfile);

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
  if (screen === "campaign") renderLevels();
}

function renderLevels() {
  const nodes = SECTORS.map((name, i) => {
    const level = i + 1;
    const button = makeButton("", () => start(level));
    button.className = "level";
    button.disabled = level > profile.data.unlockedLevel;
    const number = document.createElement("small");
    number.textContent = `Sector ${String(level).padStart(2, "0")}`;
    const label = document.createElement("strong");
    label.textContent = name;
    const badge = document.createElement("span");
    const stars = profile.data.stars[i];
    badge.className = `stamps${stars ? " earned" : ""}`;
    badge.textContent = button.disabled
      ? "Bloqueado"
      : stars
        ? `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`
        : "Disponible";
    button.append(number, label, badge);
    return button;
  });
  $("levels").replaceChildren(...nodes);
}

function start(level, day = null) {
  challengeDay = day;
  lastState = null;
  match = new Match(level, day ? dailySetup(day) : null);
  aiming = false;
  blueprint = BLUEPRINTS[0];
  selected = null;
  cursor = null;
  speed = 1;
  atpBought = repaired = false;
  selectionKey = "";
  $("sector").textContent = day
    ? `Reto · ${match.daily.name}`
    : `Sector ${level} · ${SECTORS[level - 1]}`;
  renderDock();
  view("field");
  message("Elige una torre y toca fuera del conducto para colocarla.");
  $("supplies").hidden = !!day;
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
      message("Pulso activado. Escudos desactivados.");
    } else message("Apunta a un enemigo dentro del círculo.", true);
    renderHUD();
    return;
  }
  const radius = Math.min(36, Math.max(22, (12 * WIDTH) / canvas.clientWidth));
  const tower = match.towers.find((t) => Math.hypot(t.x - x, t.y - y) < radius);
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
      if (match.upgrade(tower)) message(`${tower.name} mejorada a nivel 2.`);
      renderHUD();
    });
    improve.disabled = match.atp < cost;
    options.append(improve);
  } else if (tower.rank === 2) {
    for (const [choice, branch] of specializations(tower).entries()) {
      const improve = makeButton(`${branch.name} · ${cost} ATP`, () => {
        if (match.upgrade(tower, choice))
          message(`Especialización «${branch.name}» activada.`);
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
      if (match.sell(tower)) message(`${tower.name} retirada.`);
      selected = null;
      renderHUD();
    }),
  );
  panel.replaceChildren(heading, detail, options, actions);
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
  updateText(
    "combo",
    match.combo >= 5 ? `×${match.combo} Fiebre` : `×${match.combo || 1}`,
  );
  const waiting = match.state === "build";
  const boss = match.enemies.find((enemy) => enemy.boss && enemy.hp > 0);
  $("boss-status").hidden = !boss;
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
    const { count, theme, final, split, bossTip } = match.preview;
    updateText(
      "wave-preview-title",
      `${theme.name} · ${count} enemigos${split ? " · Dos entradas" : ""}${final ? " · Jefe" : ""}`,
    );
    updateText("wave-preview-tip", `${theme.tip} ${bossTip}`.trim());
  }
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
  $("next").disabled = !waiting;
  updateText(
    "next",
    waiting ? `Iniciar oleada ${match.wave + 1}` : "Oleada en curso",
  );
  $("speed").setAttribute("aria-pressed", String(speed === 2));
  updateText("speed", `Velocidad ×${speed}`);
  $("boost").hidden = !ad || !waiting || match.adUsed;
  $("boost").disabled = adBusy;
  updateText("boost", adBusy ? "Buscando anuncio…" : "Ver anuncio · +75 ATP");
  $("buy-atp").disabled = !waiting || atpBought || profile.data.atpBank < 100;
  $("heal").disabled =
    !waiting || repaired || match.hp === 100 || profile.data.bioGems < 5;
  renderSelection();
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
      else if (match.state === "build" && match.wave) message(announce());
    }
    board.draw(match, blueprint, selected, cursor, reduced.matches, aiming);
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
  if (won) {
    const earned = Math.max(0, stars - profile.data.stars[level - 1]);
    profile.data.stars[level - 1] = Math.max(
      stars,
      profile.data.stars[level - 1],
    );
    profile.data.unlockedLevel = Math.min(
      10,
      Math.max(profile.data.unlockedLevel, level + 1),
    );
    profile.data.atpBank += earned * 55;
    profile.data.bioGems += earned * 2;
    profile.commit();
  }
  const buttons =
    won && level < 10 ? [["Siguiente sector", () => start(level + 1)]] : [];
  buttons.push(
    ["Reintentar", () => start(level)],
    ["Volver a sectores", campaign],
  );
  ask(
    won ? "Contención completada" : "Brecha de contención",
    won
      ? `${"★".repeat(stars)}${"☆".repeat(3 - stars)} · Núcleo al ${match.hp}% · ${match.kills} eliminados.`
      : `El núcleo cayó en la oleada ${match.wave} de ${match.maxWaves}. Prueba a combinar ralentización y daño en área.`,
    buttons,
  );
}

function campaign() {
  renderLevels();
  view("campaign");
}
function pointer(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * WIDTH) / rect.width,
    y: ((e.clientY - rect.top) * HEIGHT) / rect.height,
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
  if (match.startWave()) message(`Oleada ${match.wave} iniciada.`);
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
  renderHUD();
};
$("pause").onclick = () =>
  ask(
    "Partida en pausa",
    "Puedes volver a la defensa o abandonar esta partida.",
    [
      ["Continuar"],
      ["Abandonar partida", challengeDay ? () => view("home") : campaign],
    ],
  );
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
  message("Núcleo reparado.");
  renderHUD();
};
$("boost").onclick = () => {
  if (!ad || adBusy || match.daily || match.adUsed || match.state !== "build")
    return;
  const run = match;
  const canShow = () =>
    screen === "field" &&
    match === run &&
    match.state === "build" &&
    !modal.open;
  const close = (text) => {
    adBusy = false;
    let aiming = false,
      challengeDay = null;
    if (screen === "field" && match === run) {
      message(text);
      renderHUD();
    }
  };
  adBusy = true;
  renderHUD();
  void ad
    .showRewardedAd({
      placementName: "bio-lab-defense-atp_supply",
      reward: "Completa el vídeo para recibir +75 ATP en esta partida.",
      canShow,
      onReward() {
        if (screen !== "field" || match !== run || run.adUsed) return close("");
        run.adUsed = true;
        run.atp += 75;
        close("Suministro publicitario recibido: +75 ATP.");
      },
      onCancel: () => close("Anuncio cancelado. Puedes volver a intentarlo."),
      onError: (reason) => close(adMessage(reason)),
    })
    .catch(() => close("No se pudo cargar el anuncio."));
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
  $("campaign-button").disabled = $("challenge-button").disabled = false;
  refreshProfile();
});
requestAnimationFrame(frame);
