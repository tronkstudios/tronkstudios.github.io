"use strict";

/* TronkStudios · js/team.js
   Panel del equipo: estado y respuesta de las ideas, encuestas,
   entradas del diario y borrar récords falsos.
   Solo lo ven las cuentas de la tabla team_members. Aunque alguien
   abriera el panel a la fuerza, Supabase rechaza los cambios si no
   es del equipo (ver docs/supabase/comunidad.sql).
   Se carga como script clásico (ver docs/adr/0002). */

let isTeamMember = false;
let currentTeamTab = "ideas";

/* =========================================================
   ¿ES DEL EQUIPO?
   ========================================================= */

async function checkTeamMember() {
  const button = document.getElementById("team-button");
  isTeamMember = false;

  if (communityAvailable && currentUser) {
    const { data } = await supabaseClient
      .from("team_members")
      .select("user_id")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    isTeamMember = Boolean(data);
  }

  if (button) {
    button.hidden = !isTeamMember;
  }
}

/* =========================================================
   UTILIDADES
   ========================================================= */

function teamElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function teamButton(className, iconName, text, onClick) {
  const button = teamElement("button", className);
  button.type = "button";
  setIconText(button, iconName, text);
  button.addEventListener("click", onClick);
  return button;
}

function teamMessage(text, type = "") {
  const message = document.getElementById("team-message");

  if (message) {
    message.textContent = text;
    message.className = `auth-message ${type}`.trim();
  }
}

async function teamAction(promise, okText) {
  const { error } = await promise;

  if (error) {
    console.warn("Panel del equipo:", error.message);
    teamMessage(`No se pudo hacer: ${error.message}`, "error");
    return false;
  }

  teamMessage(okText, "success");
  return true;
}

/* =========================================================
   PESTAÑAS
   ========================================================= */

const TEAM_TABS = {
  ideas: renderTeamIdeas,
  polls: renderTeamPolls,
  news: renderTeamNews,
  scores: renderTeamScores,
  releases: renderTeamReleases,
  notices: renderTeamNotices,
  projects: renderTeamProjects,
  challenges: renderTeamChallenges,
  gallery: renderTeamGallery
};

function openTeamPanel() {
  if (!isTeamMember) {
    return;
  }

  closeModal(accountModal);
  openModal(document.getElementById("team-modal"));
  teamMessage("");
  showTeamTab(currentTeamTab);
}

function showTeamTab(tab) {
  // El mensaje solo se borra al cambiar de pestaña, no al recargarla
  if (tab !== currentTeamTab) {
    teamMessage("");
  }

  currentTeamTab = tab;

  document.querySelectorAll(".team-tab").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.tab === tab));
  });

  const content = document.getElementById("team-content");
  content.replaceChildren(teamElement("p", "profile-loading", "Cargando..."));
  TEAM_TABS[tab](content);
}

/* =========================================================
   IDEAS: estado, respuesta y borrar
   ========================================================= */

async function renderTeamIdeas(content) {
  await loadSuggestions();
  content.replaceChildren();

  if (!allSuggestions.length) {
    content.appendChild(teamElement("p", "profile-empty", "Todavía no hay ideas."));
    return;
  }

  allSuggestions.forEach((suggestion) => {
    const card = teamElement("article", "team-card");

    const head = teamElement("p", "team-card-meta");
    head.textContent =
      `${suggestion.name || "Usuario"} · ${suggestion.category || "Sin categoría"} · ` +
      `${suggestion.votes || 0} ${suggestion.votes === 1 ? "voto" : "votos"}`;

    const idea = teamElement("p", "team-card-text", suggestion.idea || "");

    const status = document.createElement("select");
    status.setAttribute("aria-label", "Estado de la idea");

    Object.entries(SUGGESTION_STATUSES).forEach(([value, info]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = info.label;
      option.selected = (suggestion.status || "pending") === value;
      status.appendChild(option);
    });

    const reply = document.createElement("textarea");
    reply.rows = 2;
    reply.maxLength = 500;
    reply.placeholder = "Respuesta del equipo (opcional)";
    reply.setAttribute("aria-label", "Respuesta del equipo");
    reply.value = suggestion.team_reply || "";

    const actions = teamElement("div", "team-card-actions");
    actions.append(
      teamButton("primary-button", "check", "Guardar", async () => {
        const ok = await teamAction(
          supabaseClient.rpc("set_suggestion_status", {
            p_suggestion_id: String(suggestion.id),
            p_status: status.value,
            p_reply: reply.value
          }),
          "Idea actualizada. Su autor recibirá una notificación."
        );

        if (ok) {
          loadSuggestions();
        }
      }),
      teamButton("danger-button", "trash", "Eliminar", async () => {
        if (!window.confirm("¿Eliminar esta idea y sus votos? No se puede deshacer.")) {
          return;
        }

        const ok = await teamAction(
          supabaseClient.rpc("team_delete_suggestion", {
            p_suggestion_id: String(suggestion.id)
          }),
          "Idea eliminada."
        );

        if (ok) {
          showTeamTab("ideas");
        }
      })
    );

    card.append(head, idea, status, reply, actions);
    content.appendChild(card);
  });
}

/* =========================================================
   ENCUESTAS: crear, cerrar y borrar
   ========================================================= */

async function renderTeamPolls(content) {
  const [polls, results] = await Promise.all([
    supabaseClient
      .from("polls")
      .select("id, question, options, closed, created_at")
      .order("created_at", { ascending: false }),
    supabaseClient.rpc("poll_results")
  ]);

  content.replaceChildren();

  /* Nueva encuesta */
  const form = teamElement("form", "team-form");
  form.appendChild(teamElement("h3", "profile-section-title", "Nueva encuesta"));

  const question = document.createElement("input");
  question.required = true;
  question.maxLength = 200;
  question.placeholder = "Pregunta, por ejemplo: ¿Qué clase añadimos a Z Tronks?";
  question.setAttribute("aria-label", "Pregunta");

  const options = document.createElement("textarea");
  options.required = true;
  options.rows = 4;
  options.placeholder = "Una opción por línea (de 2 a 6)";
  options.setAttribute("aria-label", "Opciones");

  const submit = teamElement("button", "primary-button");
  submit.type = "submit";
  setIconText(submit, "chart", "Crear encuesta");

  form.append(question, options, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const list = options.value
      .split("\n")
      .map((line) => line.trim().slice(0, 80))
      .filter(Boolean);

    if (list.length < 2 || list.length > 6) {
      teamMessage("Pon entre 2 y 6 opciones, una por línea.", "error");
      return;
    }

    const ok = await teamAction(
      supabaseClient.from("polls").insert({ question: question.value.trim(), options: list }),
      "Encuesta creada."
    );

    if (ok) {
      loadPolls();
      showTeamTab("polls");
    }
  });

  content.appendChild(form);
  content.appendChild(teamElement("h3", "profile-section-title", "Encuestas"));

  const totals = {};
  (results.data || []).forEach((row) => {
    totals[row.poll_id] = (totals[row.poll_id] || 0) + Number(row.votes);
  });

  if (!polls.data || !polls.data.length) {
    content.appendChild(teamElement("p", "profile-empty", "Todavía no hay encuestas."));
    return;
  }

  polls.data.forEach((poll) => {
    const card = teamElement("article", "team-card");
    const votes = totals[poll.id] || 0;

    card.append(
      teamElement(
        "p",
        "team-card-meta",
        `${poll.closed ? "Cerrada" : "Abierta"} · ${votes} ${votes === 1 ? "voto" : "votos"}`
      ),
      teamElement("p", "team-card-text", poll.question)
    );

    const actions = teamElement("div", "team-card-actions");
    actions.append(
      teamButton(
        "secondary-button",
        poll.closed ? "refresh" : "lock",
        poll.closed ? "Reabrir" : "Cerrar",
        async () => {
          const ok = await teamAction(
            supabaseClient.from("polls").update({ closed: !poll.closed }).eq("id", poll.id),
            poll.closed ? "Encuesta reabierta." : "Encuesta cerrada."
          );

          if (ok) {
            loadPolls();
            showTeamTab("polls");
          }
        }
      ),
      teamButton("danger-button", "trash", "Eliminar", async () => {
        if (!window.confirm("¿Eliminar esta encuesta y sus votos?")) {
          return;
        }

        const ok = await teamAction(
          supabaseClient.from("polls").delete().eq("id", poll.id),
          "Encuesta eliminada."
        );

        if (ok) {
          loadPolls();
          showTeamTab("polls");
        }
      })
    );

    card.appendChild(actions);
    content.appendChild(card);
  });
}

/* =========================================================
   DIARIO: escribir y borrar entradas
   ========================================================= */

async function renderTeamNews(content) {
  const { data } = await supabaseClient
    .from("news")
    .select("id, published_on, tag, title, body")
    .order("published_on", { ascending: false });

  content.replaceChildren();

  const form = teamElement("form", "team-form");
  form.appendChild(teamElement("h3", "profile-section-title", "Nueva entrada del diario"));

  const tag = document.createElement("select");
  tag.setAttribute("aria-label", "Etiqueta");

  Object.entries(NEWS_TAGS).forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    tag.appendChild(option);
  });

  const title = document.createElement("input");
  title.required = true;
  title.maxLength = 100;
  title.placeholder = "Título";
  title.setAttribute("aria-label", "Título");

  const body = document.createElement("textarea");
  body.required = true;
  body.rows = 4;
  body.maxLength = 600;
  body.placeholder = "Qué ha pasado (máximo 600 caracteres)";
  body.setAttribute("aria-label", "Texto");

  const submit = teamElement("button", "primary-button");
  submit.type = "submit";
  setIconText(submit, "megaphone", "Publicar");

  form.append(tag, title, body, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const ok = await teamAction(
      supabaseClient.from("news").insert({
        tag: tag.value,
        title: title.value.trim(),
        body: body.value.trim()
      }),
      "Entrada publicada en el diario."
    );

    if (ok) {
      loadDatabaseNews();
      showTeamTab("news");
    }
  });

  content.appendChild(form);
  content.appendChild(teamElement("h3", "profile-section-title", "Entradas publicadas desde el panel"));

  if (!data || !data.length) {
    content.appendChild(
      teamElement(
        "p",
        "profile-empty",
        "Todavía no hay ninguna. Las entradas antiguas están escritas en index.html."
      )
    );
    return;
  }

  data.forEach((entry) => {
    const card = teamElement("article", "team-card");
    card.append(
      teamElement("p", "team-card-meta", `${entry.published_on} · ${NEWS_TAGS[entry.tag] || entry.tag}`),
      teamElement("p", "team-card-text", entry.title)
    );

    const actions = teamElement("div", "team-card-actions");
    actions.appendChild(
      teamButton("danger-button", "trash", "Eliminar", async () => {
        if (!window.confirm("¿Eliminar esta entrada del diario?")) {
          return;
        }

        const ok = await teamAction(
          supabaseClient.from("news").delete().eq("id", entry.id),
          "Entrada eliminada."
        );

        if (ok) {
          loadDatabaseNews();
          showTeamTab("news");
        }
      })
    );

    card.appendChild(actions);
    content.appendChild(card);
  });
}

/* =========================================================
   RÉCORDS: borrar los falsos
   ========================================================= */

let teamScoresGame = "antitronks";

async function renderTeamScores(content) {
  const { data } = await supabaseClient
    .from("game_scores")
    .select("user_id, score, updated_at, profiles(display_name)")
    .eq("game", teamScoresGame)
    .order("score", { ascending: false })
    .limit(50);

  content.replaceChildren();

  const select = document.createElement("select");
  select.setAttribute("aria-label", "Minijuego");

  Object.entries(SCORE_GAMES).forEach(([value, info]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = info.title;
    option.selected = value === teamScoresGame;
    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    teamScoresGame = select.value;
    showTeamTab("scores");
  });

  content.append(
    select,
    teamElement(
      "p",
      "profile-empty",
      "Si un récord es imposible, bórralo. Esa persona podrá volver a jugar y guardar uno real."
    )
  );

  if (!data || !data.length) {
    content.appendChild(teamElement("p", "profile-empty", "Nadie tiene récord en este juego."));
    return;
  }

  data.forEach((row, index) => {
    const card = teamElement("article", "team-card team-score");
    card.append(
      teamElement("span", "team-score-pos", String(index + 1)),
      teamElement("span", "team-score-name", row.profiles?.display_name || "Tronker"),
      teamElement("strong", "", formatScore(teamScoresGame, row.score)),
      teamButton("danger-button", "trash", "Borrar", async () => {
        if (!window.confirm("¿Borrar este récord?")) {
          return;
        }

        const ok = await teamAction(
          supabaseClient.rpc("team_delete_score", {
            p_user: row.user_id,
            p_game: teamScoresGame
          }),
          "Récord borrado."
        );

        if (ok) {
          loadLeaderboard(currentLeaderboardGame);
          showTeamTab("scores");
        }
      })
    );
    content.appendChild(card);
  });
}

/* =========================================================
   LANZAMIENTOS: cambiar la fecha de estreno
   Quien tiene el juego en su lista de deseados recibe un aviso.
   ========================================================= */

function releaseToInput(release) {
  if (!Array.isArray(release)) {
    return "";
  }

  const [year, month, day] = release;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function renderTeamReleases(content) {
  await loadReleaseDates();
  content.replaceChildren(
    teamElement(
      "p",
      "profile-empty",
      "Al guardar una fecha nueva, quien tenga el juego en su lista de deseados recibe una notificación."
    )
  );

  Object.entries(PROJECTS).forEach(([id, project]) => {
    const card = teamElement("article", "team-card");

    card.append(
      teamElement(
        "p",
        "team-card-meta",
        Array.isArray(project.release)
          ? `Ahora: ${formatReleaseDate(project.release)}`
          : "Ahora: sin fecha"
      ),
      teamElement("p", "team-card-text", project.title)
    );

    const row = teamElement("div", "team-release-row");

    const date = document.createElement("input");
    date.type = "date";
    date.value = releaseToInput(project.release);
    date.setAttribute("aria-label", `Fecha de lanzamiento de ${project.title}`);

    const noDateLabel = teamElement("label", "team-check");
    const noDate = document.createElement("input");
    noDate.type = "checkbox";
    noDate.checked = !Array.isArray(project.release);
    date.disabled = noDate.checked;
    noDate.addEventListener("change", () => {
      date.disabled = noDate.checked;
    });
    noDateLabel.append(noDate, document.createTextNode(" Sin fecha"));

    row.append(date, noDateLabel);

    const actions = teamElement("div", "team-card-actions");
    actions.appendChild(
      teamButton("primary-button", "calendar", "Guardar fecha", async () => {
        if (!noDate.checked && !date.value) {
          teamMessage("Elige una fecha o marca «Sin fecha».", "error");
          return;
        }

        const ok = await teamAction(
          supabaseClient.rpc("set_release_date", {
            p_project: id,
            p_title: project.title,
            p_date: noDate.checked ? null : date.value
          }),
          `Fecha de ${project.title} guardada. Se ha avisado a quien lo tiene en deseados.`
        );

        if (ok) {
          showTeamTab("releases");
        }
      })
    );

    card.append(row, actions);
    content.appendChild(card);
  });
}

/* =========================================================
   AVISOS: enviar una notificación a los usuarios
   ========================================================= */

function renderTeamNotices(content) {
  content.replaceChildren();

  const form = teamElement("form", "team-form");
  form.appendChild(teamElement("h3", "profile-section-title", "Enviar un aviso a todos"));

  const message = document.createElement("textarea");
  message.required = true;
  message.rows = 3;
  message.maxLength = 200;
  message.placeholder = "Escribe el aviso (máximo 200 caracteres)";
  message.setAttribute("aria-label", "Texto del aviso");

  const counter = teamElement("p", "team-counter", "0 / 200");
  message.addEventListener("input", () => {
    counter.textContent = `${message.value.length} / 200`;
  });

  const submit = teamElement("button", "primary-button");
  submit.type = "submit";
  setIconText(submit, "megaphone", "Enviar aviso");

  form.append(message, counter, submit);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = message.value.trim();

    if (text.length < 3) {
      teamMessage("El aviso debe tener al menos 3 caracteres.", "error");
      return;
    }

    if (!window.confirm(`¿Enviar este aviso a todos los usuarios?\n\n«${text}»`)) {
      return;
    }

    submit.disabled = true;

    const { data, error } = await supabaseClient.rpc("team_broadcast", {
      p_message: text,
      p_link: "",
      p_project: null
    });

    submit.disabled = false;

    if (error) {
      console.warn("Panel del equipo:", error.message);
      teamMessage(`No se pudo enviar: ${error.message}`, "error");
      return;
    }

    const sent = Number(data) || 0;
    teamMessage(
      `Aviso enviado a ${sent} ${sent === 1 ? "persona" : "personas"}.`,
      "success"
    );
    form.reset();
    counter.textContent = "0 / 200";
    loadNotifications();
  });

  content.appendChild(form);
}

/* =========================================================
   ARRANQUE
   ========================================================= */

function initializeTeamPanel() {
  document.getElementById("team-button")?.addEventListener("click", openTeamPanel);

  document.querySelectorAll(".team-tab").forEach((button) => {
    button.addEventListener("click", () => showTeamTab(button.dataset.tab));
  });
}
