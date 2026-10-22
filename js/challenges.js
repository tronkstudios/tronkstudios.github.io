"use strict";

/* TronkStudios · js/challenges.js
   Retos de la comunidad: «entre todos, derrotad 10.000 ninjas esta semana».
   - Barra de progreso en Minijuegos con los retos activos.
   - Los minijuegos llaman a TronkChallenges.add() al acabar una partida.
   - El equipo crea y borra retos desde su panel (pestaña «Retos»).
   Las reglas (máximo por partida, pausa entre partidas, quién puede
   crear retos) están en Supabase: docs/supabase/retos.sql.
   Se carga como script clásico (ver docs/adr/0002). */

// Qué cuenta en cada minijuego
const CHALLENGE_GAMES = {
  antitronks: { title: "Antitronks", unit: "Antitronks derribados", one: "Antitronk derribado" },
  "protect-mogos": { title: "Protect Mogos", unit: "ninjas derrotados", one: "ninja derrotado" },
  "stick-drill": { title: "Stick Drill", unit: "segundos aguantados", one: "segundo aguantado" },
  "tronk-fight": { title: "Tronk Fight", unit: "victorias", one: "victoria" },
  miente: { title: "El Juego Miente", unit: "aciertos", one: "acierto" },
  survivors: { title: "Tronk Survivors", unit: "enemigos derrotados", one: "enemigo derrotado" }
};

// Cada cuánto se actualizan las barras (ms)
const CHALLENGES_REFRESH = 60000;

// Los retos superados se siguen viendo unos días
const CHALLENGES_KEEP_DAYS = 3;

let challengesAvailable = false;
let activeChallenges = [];
let myChallengeAmounts = {};

/* =========================================================
   CARGAR
   ========================================================= */

const CHALLENGE_COLUMNS = "id, title, game, goal, progress, starts_at, ends_at, completed_at";

// Pide los retos con su descripción; si aún no se ha vuelto a ejecutar
// retos.sql (no existe la columna), los pide sin ella.
async function selectChallenges(build) {
  const withDescription = await build(`${CHALLENGE_COLUMNS}, description`);

  if (withDescription.error && /description/i.test(withDescription.error.message || "")) {
    return build(CHALLENGE_COLUMNS);
  }

  return withDescription;
}

/* Porcentaje exacto, con hasta 10 decimales (0,0333333333 %) */
function exactPercent(challenge) {
  if (!challenge.goal) {
    return 0;
  }

  return Math.min(100, (Number(challenge.progress) / Number(challenge.goal)) * 100);
}

function formatPercent(value) {
  return `${new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 10 }).format(value)}%`;
}

async function loadChallenges() {
  if (!isSupabaseConfigured()) {
    return;
  }

  const since = new Date(Date.now() - CHALLENGES_KEEP_DAYS * 86400000).toISOString();
  const now = new Date().toISOString();

  try {
    const { data, error } = await selectChallenges((columns) =>
      supabaseClient
        .from("challenges")
        .select(columns)
        .lte("starts_at", now)
        .gte("ends_at", since)
        .order("ends_at", { ascending: true })
    );

    if (error) {
      // Si no se ha ejecutado retos.sql, el bloque no aparece
      challengesAvailable = false;
      renderChallenges();
      return;
    }

    challengesAvailable = true;

    // Activos, y los superados o acabados hace poco
    activeChallenges = data || [];

    await loadMyChallengeAmounts();
    renderChallenges();
  } catch (error) {
    console.error(error);
  }
}

async function loadMyChallengeAmounts() {
  myChallengeAmounts = {};

  if (!currentUser || !activeChallenges.length) {
    return;
  }

  const { data } = await supabaseClient
    .from("challenge_contributions")
    .select("challenge_id, amount")
    .eq("user_id", currentUser.id)
    .in("challenge_id", activeChallenges.map((challenge) => challenge.id));

  (data || []).forEach((row) => {
    myChallengeAmounts[row.challenge_id] = Number(row.amount) || 0;
  });
}

/* =========================================================
   MOSTRAR
   ========================================================= */

function challengeUnit(game, amount) {
  const info = CHALLENGE_GAMES[game];
  return amount === 1 ? info.one : info.unit;
}

function timeLeftText(endsAt) {
  const ms = new Date(endsAt) - Date.now();

  if (ms <= 0) {
    return "Terminado";
  }

  const hours = Math.floor(ms / 3600000);

  if (hours >= 48) {
    return `Quedan ${Math.round(ms / 86400000)} días`;
  }

  if (hours >= 1) {
    return `Quedan ${hours} ${hours === 1 ? "hora" : "horas"}`;
  }

  return "Queda menos de 1 hora";
}

function createChallengeCard(challenge) {
  const done = Boolean(challenge.completed_at) || challenge.progress >= challenge.goal;
  const percent = exactPercent(challenge);
  const ended = !done && new Date(challenge.ends_at) < new Date();

  const card = document.createElement("article");
  card.className = done ? "challenge-card is-done" : ended ? "challenge-card is-ended" : "challenge-card";

  const head = document.createElement("div");
  head.className = "challenge-head";

  const game = document.createElement("span");
  game.className = "challenge-game";
  game.textContent = CHALLENGE_GAMES[challenge.game]?.title || challenge.game;

  const time = document.createElement("span");
  time.className = "challenge-time";

  if (done) {
    setIconText(time, "check", "¡Superado!");
  } else {
    setIconText(time, "calendar", ended ? "No se consiguió" : timeLeftText(challenge.ends_at));
  }

  head.append(game, time);

  const title = document.createElement("h4");
  title.className = "challenge-title";
  title.dataset.noTranslate = "";
  title.textContent = challenge.title;

  const bar = document.createElement("div");
  bar.className = "challenge-bar";
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", String(challenge.goal));
  bar.setAttribute("aria-valuenow", String(Math.min(challenge.progress, challenge.goal)));
  bar.setAttribute("aria-label", `Progreso: ${formatPercent(percent)}`);

  const fill = document.createElement("span");
  fill.className = "challenge-fill";
  fill.style.width = `${percent}%`;
  bar.appendChild(fill);

  const numbers = document.createElement("p");
  numbers.className = "challenge-numbers";

  const progress = document.createElement("strong");
  progress.textContent = `${formatNumber(challenge.progress, false)} / ${formatNumber(challenge.goal, false)}`;

  const unit = document.createElement("span");
  unit.textContent = ` ${challengeUnit(challenge.game, challenge.goal)} · ${formatPercent(percent)}`;

  numbers.append(progress, unit);

  const mine = document.createElement("p");
  mine.className = "challenge-mine";

  const amount = myChallengeAmounts[challenge.id] || 0;

  if (done || ended) {
    mine.textContent = amount
      ? `Ayudaste con ${formatNumber(amount, false)} ${challengeUnit(challenge.game, amount)}. ¡Gracias!`
      : "";
  } else if (!currentUser) {
    mine.textContent = "Inicia sesión para que tus partidas cuenten.";
  } else {
    mine.textContent = amount
      ? `Tu aporte: ${formatNumber(amount, false)} ${challengeUnit(challenge.game, amount)}`
      : "Juega una partida para ayudar.";
  }

  card.append(head, title, bar, numbers);

  if (mine.textContent) {
    card.appendChild(mine);
  }

  // Al pulsar se abre el minijuego del reto
  if (!done && !ended) {
    const play = document.createElement("button");
    play.type = "button";
    play.className = "secondary-button challenge-play";
    setIconText(play, "play", "Jugar");
    play.addEventListener("click", (event) => {
      event.stopPropagation();
      playChallenge(challenge);
    });
    card.appendChild(play);
  }

  // Al pulsar la tarjeta se abre la ficha del reto
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Ver el reto: ${challenge.title}`);
  card.addEventListener("click", () => openChallenge(challenge));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openChallenge(challenge);
    }
  });

  return card;
}

function playChallenge(challenge) {
  const key = challenge.game === "protect-mogos" ? "antininja" : challenge.game.replace("-", "");
  closeModal(document.getElementById("challenge-modal"));
  document.querySelector(`[data-minigame="${key}"]`)?.click();
}

/* =========================================================
   FICHA DEL RETO (como las de los juegos en desarrollo)
   ========================================================= */

function challengeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function formatDay(value) {
  return new Date(value).toLocaleDateString(currentLocale(), { day: "numeric", month: "long", year: "numeric" });
}

async function openChallenge(challenge) {
  const modal = document.getElementById("challenge-modal");
  const content = document.getElementById("challenge-content");

  if (!modal || !content) {
    return;
  }

  const done = Boolean(challenge.completed_at) || challenge.progress >= challenge.goal;
  const ended = !done && new Date(challenge.ends_at) < new Date();
  const percent = exactPercent(challenge);
  const info = CHALLENGE_GAMES[challenge.game] || { title: challenge.game };

  content.replaceChildren();

  // Cabecera: juego, estado y título
  const head = challengeElement("div", "challenge-modal-head");
  head.append(challengeElement("span", "challenge-game", info.title));

  const state = challengeElement("span", "challenge-time");
  if (done) {
    setIconText(state, "check", "¡Superado!");
  } else {
    setIconText(state, "calendar", ended ? "No se consiguió" : timeLeftText(challenge.ends_at));
  }
  head.appendChild(state);

  const title = challengeElement("h2", "challenge-modal-title", challenge.title);
  title.id = "challenge-modal-title";
  title.dataset.noTranslate = "";

  content.append(head, title);

  // Descripción
  const description = challengeElement(
    "p",
    challenge.description ? "challenge-modal-text" : "challenge-modal-text is-empty",
    challenge.description || "Este reto no tiene descripción."
  );
  if (challenge.description) {
    description.dataset.noTranslate = "";
  }
  content.appendChild(description);

  // Progreso exacto
  const progress = challengeElement("div", done ? "challenge-modal-progress is-done" : "challenge-modal-progress");
  progress.appendChild(challengeElement("strong", "challenge-modal-percent", formatPercent(percent)));

  const bar = challengeElement("div", "challenge-bar");
  const fill = challengeElement("span", "challenge-fill");
  fill.style.width = `${percent}%`;
  bar.appendChild(fill);
  progress.appendChild(bar);

  const remaining = Math.max(0, challenge.goal - challenge.progress);
  progress.appendChild(
    challengeElement(
      "p",
      "challenge-numbers",
      `${formatNumber(challenge.progress, false)} / ${formatNumber(challenge.goal, false)} ${challengeUnit(challenge.game, challenge.goal)}` +
        (remaining && !done ? ` · faltan ${formatNumber(remaining, false)}` : "")
    )
  );
  content.appendChild(progress);

  // Datos
  const facts = challengeElement("dl", "challenge-modal-facts");
  [
    ["Minijuego", info.title],
    ["Empezó", formatDay(challenge.starts_at)],
    [done || ended ? "Terminó" : "Termina", formatDay(challenge.completed_at || challenge.ends_at)],
    ["Tu aporte", currentUser
      ? `${formatNumber(myChallengeAmounts[challenge.id] || 0, false)} ${challengeUnit(challenge.game, myChallengeAmounts[challenge.id] || 0)}`
      : "Inicia sesión para que cuenten tus partidas"]
  ].forEach(([label, value]) => {
    const item = challengeElement("div");
    item.append(challengeElement("dt", "", label), challengeElement("dd", "", value));
    facts.appendChild(item);
  });
  content.appendChild(facts);

  // Mejores contribuidores
  content.appendChild(challengeElement("h3", "profile-section-title", "Mejores contribuidores"));
  const list = challengeElement("ol", "challenge-top");
  list.appendChild(challengeElement("li", "profile-loading", "Cargando..."));
  content.appendChild(list);

  if (!done && !ended) {
    const play = challengeElement("button", "primary-button challenge-modal-play");
    play.type = "button";
    setIconText(play, "play", `Jugar a ${info.title}`);
    play.addEventListener("click", () => playChallenge(challenge));
    content.appendChild(play);
  }

  openModal(modal);
  modal.querySelector(".modal-close")?.focus();

  renderTopContributors(list, challenge);
}

async function renderTopContributors(list, challenge) {
  try {
    const { data, error, count } = await supabaseClient
      .from("challenge_contributions")
      .select("user_id, amount", { count: "exact" })
      .eq("challenge_id", challenge.id)
      .order("amount", { ascending: false })
      .limit(5);

    list.replaceChildren();

    if (error || !data || !data.length) {
      list.appendChild(challengeElement("li", "profile-empty", "Todavía nadie ha aportado. ¡Sé el primero!"));
      return;
    }

    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("id, display_name, avatar")
      .in("id", data.map((row) => row.user_id));

    const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));

    data.forEach((row, index) => {
      const profile = byId.get(row.user_id);
      const item = challengeElement("li", row.user_id === currentUser?.id ? "challenge-top-row is-me" : "challenge-top-row");

      const position = challengeElement("span", "challenge-top-pos");
      if (index < 3) {
        position.appendChild(makeIcon("medal", `icon medal medal-${index + 1}`));
      } else {
        position.textContent = String(index + 1);
      }

      const name = challengeElement("button", "challenge-top-name profile-link");
      name.type = "button";
      name.append(
        typeof avatarImage === "function" ? avatarImage(profile?.avatar, "leaderboard-avatar") : document.createTextNode(""),
        challengeElement("span", "", profile?.display_name || "Tronker")
      );
      name.addEventListener("click", () => {
        closeModal(document.getElementById("challenge-modal"));
        openProfile(row.user_id);
      });

      const amount = Number(row.amount) || 0;
      const share = challenge.progress ? (amount / challenge.progress) * 100 : 0;
      const value = challengeElement(
        "span",
        "challenge-top-amount",
        `${formatNumber(amount, false)} · ${formatPercent(share)}`
      );

      item.append(position, name, value);
      list.appendChild(item);
    });

    if (count > data.length) {
      list.appendChild(
        challengeElement("li", "challenge-top-more", `Y ${count - data.length} ${count - data.length === 1 ? "persona más" : "personas más"} ayudando`)
      );
    }
  } catch (error) {
    console.error(error);
    list.replaceChildren(challengeElement("li", "profile-empty", "No se pudieron cargar los contribuidores."));
  }
}

function renderChallenges() {
  const box = document.getElementById("challenges");
  const list = document.getElementById("challenges-list");

  if (!box || !list) {
    return;
  }

  box.hidden = !challengesAvailable || !activeChallenges.length;
  list.replaceChildren(...activeChallenges.map(createChallengeCard));
}

/* =========================================================
   SUMAR UNA PARTIDA (lo llaman los minijuegos)
   ========================================================= */

const TronkChallenges = {
  async add(game, amount) {
    const value = Math.floor(Number(amount));

    if (
      !challengesAvailable ||
      !currentUser ||
      !CHALLENGE_GAMES[game] ||
      !Number.isFinite(value) ||
      value <= 0 ||
      !activeChallenges.some((challenge) => challenge.game === game && !challenge.completed_at)
    ) {
      return;
    }

    const { error } = await supabaseClient.rpc("add_challenge_progress", {
      p_game: game,
      p_amount: value
    });

    if (error) {
      console.warn("No se pudo sumar al reto:", error.message);
      return;
    }

    loadChallenges();
  }
};

window.TronkChallenges = TronkChallenges;

/* =========================================================
   PANEL DEL EQUIPO: pestaña «Retos» (js/team.js)
   ========================================================= */

async function renderTeamChallenges(content) {
  const { data, error } = await selectChallenges((columns) =>
    supabaseClient
      .from("challenges")
      .select(columns)
      .order("created_at", { ascending: false })
      .limit(30)
  );

  content.replaceChildren();

  if (error) {
    content.appendChild(
      teamElement("p", "profile-empty", "Ejecuta docs/supabase/retos.sql en Supabase para usar los retos.")
    );
    return;
  }

  const form = teamElement("form", "team-form");
  form.appendChild(teamElement("h3", "profile-section-title", "Nuevo reto"));

  const title = document.createElement("input");
  title.required = true;
  title.maxLength = 80;
  title.placeholder = "Ej.: Entre todos, derrotad 10.000 ninjas esta semana";
  title.setAttribute("aria-label", "Título del reto");

  const game = document.createElement("select");
  game.setAttribute("aria-label", "Minijuego");
  Object.entries(CHALLENGE_GAMES).forEach(([id, info]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `${info.title} (${info.unit})`;
    game.appendChild(option);
  });
  game.value = "protect-mogos";

  const row = teamElement("div", "team-form-row");

  const goalLabel = teamElement("label", "team-field", "Objetivo");
  const goal = document.createElement("input");
  goal.type = "number";
  goal.required = true;
  goal.min = "1";
  goal.max = "10000000";
  goal.value = "10000";
  goalLabel.appendChild(goal);

  const daysLabel = teamElement("label", "team-field", "Duración (días)");
  const days = document.createElement("input");
  days.type = "number";
  days.required = true;
  days.min = "1";
  days.max = "60";
  days.value = "7";
  daysLabel.appendChild(days);

  row.append(goalLabel, daysLabel);

  const submit = teamElement("button", "primary-button");
  submit.type = "submit";
  setIconText(submit, "target", "Crear reto");

  const description = document.createElement("textarea");
  description.rows = 3;
  description.maxLength = 500;
  description.placeholder = "Descripción (opcional): qué hay que hacer, premio, curiosidades...";
  description.setAttribute("aria-label", "Descripción del reto");

  form.append(title, description, game, row, submit);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const goalValue = Math.floor(Number(goal.value));
    const daysValue = Math.floor(Number(days.value));

    if (title.value.trim().length < 3 || !(goalValue >= 1) || !(daysValue >= 1 && daysValue <= 60)) {
      teamMessage("Revisa el título, el objetivo y la duración (1 a 60 días).", "error");
      return;
    }

    const ends = new Date(Date.now() + daysValue * 86400000);
    const newChallenge = {
      title: title.value.trim(),
      description: description.value.trim(),
      game: game.value,
      goal: goalValue,
      starts_at: new Date().toISOString(),
      ends_at: ends.toISOString()
    };

    let insert = await supabaseClient.from("challenges").insert(newChallenge);
    let note = "Reto creado. Ya sale en Minijuegos.";

    // Sin la columna «description» (retos.sql antiguo) se crea sin ella
    if (insert.error && /description/i.test(insert.error.message || "")) {
      delete newChallenge.description;
      insert = await supabaseClient.from("challenges").insert(newChallenge);
      note = "Reto creado sin descripción: vuelve a ejecutar docs/supabase/retos.sql para poder añadirla.";
    }

    if (insert.error) {
      console.warn("Panel del equipo:", insert.error.message);
      teamMessage(`No se pudo hacer: ${insert.error.message}`, "error");
      return;
    }

    teamMessage(note, newChallenge.description === undefined ? "error" : "success");
    loadChallenges();
    showTeamTab("challenges");
  });

  content.appendChild(form);
  content.appendChild(teamElement("h3", "profile-section-title", "Retos"));

  if (!data.length) {
    content.appendChild(teamElement("p", "profile-empty", "Todavía no hay retos."));
    return;
  }

  data.forEach((challenge) => {
    const card = teamElement("article", "team-card");
    const done = Boolean(challenge.completed_at);
    const ended = new Date(challenge.ends_at) < new Date();
    const state = done ? "Superado" : ended ? "Terminado" : timeLeftText(challenge.ends_at);

    card.append(
      teamElement(
        "p",
        "team-card-meta",
        `${CHALLENGE_GAMES[challenge.game]?.title || challenge.game} · ${state} · ` +
          `${formatNumber(challenge.progress, false)} / ${formatNumber(challenge.goal, false)}`
      ),
      teamElement("p", "team-card-text", challenge.title)
    );

    const actions = teamElement("div", "team-card-actions");
    actions.appendChild(
      teamButton("danger-button", "trash", "Eliminar", async () => {
        if (!window.confirm("¿Eliminar este reto y todo su progreso?")) {
          return;
        }

        const ok = await teamAction(
          supabaseClient.from("challenges").delete().eq("id", challenge.id),
          "Reto eliminado."
        );

        if (ok) {
          loadChallenges();
          showTeamTab("challenges");
        }
      })
    );

    card.appendChild(actions);
    content.appendChild(card);
  });
}

/* =========================================================
   ARRANQUE
   ========================================================= */

function initializeChallenges() {
  loadChallenges();

  // Escape cierra la ficha del reto
  document.addEventListener("keydown", (event) => {
    const modal = document.getElementById("challenge-modal");

    if (event.key === "Escape" && modal && !modal.classList.contains("hidden")) {
      closeModal(modal);
    }
  });

  setInterval(() => {
    if (!document.hidden && challengesAvailable) {
      loadChallenges();
    }
  }, CHALLENGES_REFRESH);
}
