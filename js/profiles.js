"use strict";

/* TronkStudios · js/profiles.js
   Perfiles, lista de deseados, avisos de lanzamiento, récords en la
   cuenta, insignias y clasificación de los minijuegos.
   Usa las tablas de docs/supabase/plataforma.sql. Si todavía no se
   han creado, todo esto se esconde y el resto de la web sigue igual.
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   DATOS
   ========================================================= */

// Avatares para elegir en el perfil
const PROFILE_AVATARS = [
  "🎮", "🕹️", "👾", "🧟", "⚔️", "🛡️", "🐉", "🚀",
  "🔥", "⚡", "🌟", "🦊", "🐺", "🤖", "👑", "🎯"
];

// Minijuegos con récord en la cuenta. localKey = récord guardado
// en el navegador por cada juego (para subirlo al iniciar sesión).
const SCORE_GAMES = {
  antitronks: {
    title: "Antitronks",
    unit: "puntos",
    localKey: "antitronks-record"
  },
  "protect-mogos": {
    title: "Protect Mogos",
    unit: "puntos",
    localKey: "antininja-record"
  },
  "stick-drill": {
    title: "Stick Drill",
    unit: "s",
    localKey: "stickdrill-record"
  },
  "tronk-fight": {
    title: "Tronk Fight",
    unit: "victorias"
  }
};

// Las cuentas creadas este año reciben la insignia de Fundador
const FOUNDER_YEAR = 2026;

/*
 * Insignias. Se calculan con datos reales del perfil.
 * forOthers = false: solo se puede saber en tu propio perfil
 * (por ejemplo, tus votos no son públicos).
 */
const BADGES = [
  {
    icon: "🏅",
    name: "Fundador",
    how: `Crear la cuenta en ${FOUNDER_YEAR}`,
    test: (d) => new Date(d.profile.created_at).getFullYear() <= FOUNDER_YEAR
  },
  {
    icon: "💡",
    name: "Primera idea",
    how: "Proponer una idea en Comunidad",
    test: (d) => d.suggestions.length >= 1
  },
  {
    icon: "🧠",
    name: "Mente creativa",
    how: "Proponer 5 ideas",
    test: (d) => d.suggestions.length >= 5
  },
  {
    icon: "🔥",
    name: "Idea popular",
    how: "Que una de tus ideas llegue a 10 votos",
    test: (d) => d.suggestions.some((s) => (s.votes || 0) >= 10)
  },
  {
    icon: "👍",
    name: "Votante",
    how: "Votar una idea de la comunidad",
    forOthers: false,
    test: (d) => d.votes >= 1
  },
  {
    icon: "❤️",
    name: "Fan",
    how: "Añadir un juego a tu lista de deseados",
    test: (d) => d.wishlist.length >= 1
  },
  {
    icon: "🔔",
    name: "Atento",
    how: "Pedir aviso del lanzamiento de un juego",
    test: (d) => d.wishlist.some((w) => w.notify)
  },
  {
    icon: "🕹️",
    name: "Jugador",
    how: "Guardar un récord en un minijuego",
    test: (d) => Object.values(d.scores).some((score) => score > 0)
  },
  {
    icon: "🏆",
    name: "Todoterreno",
    how: "Tener récord en los 4 minijuegos",
    test: (d) => Object.keys(SCORE_GAMES).every((game) => d.scores[game] > 0)
  },
  {
    icon: "🥊",
    name: "Luchador",
    how: "Ganar 10 combates de Tronk Fight al bot",
    test: (d) => (d.scores["tronk-fight"] || 0) >= 10
  }
];

// true cuando las tablas de plataforma.sql existen en Supabase
let platformAvailable = false;

// Mi lista de deseados: id del juego → { notify }
let myWishlist = new Map();

// Mis récords guardados en la cuenta: juego → puntuación
let myScores = {};

let currentLeaderboardGame = "antitronks";

/* =========================================================
   UTILIDADES
   ========================================================= */

function formatScore(game, score) {
  const info = SCORE_GAMES[game];
  const value = game === "stick-drill"
    ? Number(score).toFixed(1)
    : String(Math.round(Number(score)));

  return info ? `${value} ${info.unit}` : value;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

async function checkPlatformAvailable() {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { error } = await supabaseClient
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) {
      console.warn(
        "TronkStudios: perfiles desactivados (ejecuta docs/supabase/plataforma.sql).",
        error.message
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

/* Muestra u oculta todo lo de la plataforma */
function setPlatformVisible(visible) {
  document.querySelectorAll("[data-platform]").forEach((element) => {
    element.hidden = !visible;
  });
}

/* =========================================================
   RÉCORDS EN LA CUENTA
   Los minijuegos llaman a TronkScores al acabar una partida.
   ========================================================= */

const TronkScores = {
  async submit(game, value) {
    if (!platformAvailable || !currentUser || !SCORE_GAMES[game]) {
      return;
    }

    const score = Number(value);

    if (!Number.isFinite(score) || score <= 0 || score <= (myScores[game] || 0)) {
      return;
    }

    const { data, error } = await supabaseClient.rpc("submit_score", {
      p_game: game,
      p_score: score
    });

    if (error) {
      console.warn("No se pudo guardar el récord:", error.message);
      return;
    }

    myScores[game] = Number(data) || score;
    refreshLeaderboardIfShowing(game);
  },

  async addWin() {
    if (!platformAvailable || !currentUser) {
      return;
    }

    const { data, error } = await supabaseClient.rpc("add_tronk_fight_win");

    if (error) {
      console.warn("No se pudo guardar la victoria:", error.message);
      return;
    }

    myScores["tronk-fight"] = Number(data) || 0;
    refreshLeaderboardIfShowing("tronk-fight");
  }
};

window.TronkScores = TronkScores;

async function loadMyScores() {
  myScores = {};

  if (!platformAvailable || !currentUser) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("game_scores")
    .select("game, score")
    .eq("user_id", currentUser.id);

  if (error) {
    console.warn("No se pudieron cargar tus récords:", error.message);
    return;
  }

  (data || []).forEach((row) => {
    myScores[row.game] = Number(row.score);
  });
}

/* Al iniciar sesión se suben los récords que ya había en este navegador */
async function syncLocalRecords() {
  for (const [game, info] of Object.entries(SCORE_GAMES)) {
    if (!info.localKey) {
      continue;
    }

    let local = 0;

    try {
      local = parseFloat(localStorage.getItem(info.localKey)) || 0;
    } catch {
      local = 0;
    }

    if (local > (myScores[game] || 0)) {
      await TronkScores.submit(game, local);
    }
  }
}

/* =========================================================
   LISTA DE DESEADOS
   ========================================================= */

async function loadMyWishlist() {
  myWishlist = new Map();

  if (!platformAvailable || !currentUser) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("wishlist")
    .select("project_id, notify")
    .eq("user_id", currentUser.id);

  if (error) {
    console.warn("No se pudo cargar tu lista de deseados:", error.message);
    return;
  }

  (data || []).forEach((row) => {
    myWishlist.set(row.project_id, { notify: row.notify });
  });
}

/* Botones «Añadir a deseados» y «Avísame» de la ficha del juego */
async function renderWishlistButtons(projectId) {
  const box = document.getElementById("project-wishlist");
  const wishButton = document.getElementById("wishlist-toggle");
  const notifyButton = document.getElementById("notify-toggle");
  const countText = document.getElementById("wishlist-count");

  if (!box || !wishButton || !notifyButton) {
    return;
  }

  box.hidden = !platformAvailable;

  if (!platformAvailable) {
    return;
  }

  const entry = myWishlist.get(projectId);
  const project = PROJECTS[projectId];
  const released =
    project && Array.isArray(project.release) && daysUntil(project.release) <= 0;

  wishButton.setAttribute("aria-pressed", String(Boolean(entry)));
  wishButton.textContent = entry ? "❤️ En tu lista de deseados" : "🤍 Añadir a deseados";

  // Si el juego ya ha salido, no tiene sentido pedir aviso
  notifyButton.hidden = released;
  notifyButton.setAttribute("aria-pressed", String(Boolean(entry?.notify)));
  notifyButton.textContent = entry?.notify
    ? "🔔 Te avisaremos cuando salga"
    : "🔕 Avísame cuando salga";

  if (countText) {
    const { count, error } = await supabaseClient
      .from("wishlist")
      .select("project_id", { head: true, count: "exact" })
      .eq("project_id", projectId);

    countText.textContent = !error && count
      ? `${count} ${count === 1 ? "persona lo tiene" : "personas lo tienen"} en su lista de deseados`
      : "";
  }
}

function currentProjectId() {
  return document.getElementById("project-modal")?.dataset.project || "";
}

function requireAccount(message) {
  openAccountForCommunity(message);
}

async function toggleWishlist() {
  const projectId = currentProjectId();

  if (!projectId) {
    return;
  }

  if (!currentUser) {
    requireAccount("Inicia sesión para guardar juegos en tu lista de deseados.");
    return;
  }

  const button = document.getElementById("wishlist-toggle");
  button.disabled = true;

  const { error } = myWishlist.has(projectId)
    ? await supabaseClient
        .from("wishlist")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("project_id", projectId)
    : await supabaseClient
        .from("wishlist")
        .insert({ project_id: projectId, notify: false });

  button.disabled = false;

  if (error) {
    console.warn("No se pudo cambiar la lista de deseados:", error.message);
    return;
  }

  await loadMyWishlist();
  renderWishlistButtons(projectId);
}

async function toggleNotify() {
  const projectId = currentProjectId();

  if (!projectId) {
    return;
  }

  if (!currentUser) {
    requireAccount("Inicia sesión para que te avisemos cuando salga el juego.");
    return;
  }

  const button = document.getElementById("notify-toggle");
  const entry = myWishlist.get(projectId);
  button.disabled = true;

  // Pedir aviso también lo añade a deseados
  const { error } = entry
    ? await supabaseClient
        .from("wishlist")
        .update({ notify: !entry.notify })
        .eq("user_id", currentUser.id)
        .eq("project_id", projectId)
    : await supabaseClient
        .from("wishlist")
        .insert({ project_id: projectId, notify: true });

  button.disabled = false;

  if (error) {
    console.warn("No se pudo cambiar el aviso:", error.message);
    return;
  }

  await loadMyWishlist();
  renderWishlistButtons(projectId);
}

/* =========================================================
   PERFIL
   ========================================================= */

async function loadProfileData(userId) {
  const [profile, wishlist, scores, suggestions] = await Promise.all([
    supabaseClient.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabaseClient.from("wishlist").select("project_id, notify").eq("user_id", userId),
    supabaseClient.from("game_scores").select("game, score").eq("user_id", userId),
    supabaseClient.from("suggestions").select("id, votes").eq("user_id", userId)
  ]);

  if (profile.error || !profile.data) {
    return null;
  }

  const data = {
    profile: profile.data,
    wishlist: wishlist.data || [],
    scores: {},
    suggestions: suggestions.data || [],
    votes: null
  };

  (scores.data || []).forEach((row) => {
    data.scores[row.game] = Number(row.score);
  });

  // Los votos solo se pueden contar en tu propio perfil
  if (currentUser && currentUser.id === userId) {
    data.votes = myVotedSuggestions.size;
  }

  return data;
}

async function openProfile(userId) {
  const modal = document.getElementById("profile-modal");
  const content = document.getElementById("profile-content");

  if (!modal || !content || !platformAvailable || !userId) {
    return;
  }

  content.innerHTML = "";
  content.appendChild(makeElement("p", "profile-loading", "Cargando perfil..."));
  openModal(modal);

  const data = await loadProfileData(userId);

  if (!data) {
    content.innerHTML = "";
    content.appendChild(makeElement("p", "profile-loading", "No se pudo cargar este perfil."));
    return;
  }

  renderProfile(content, data);
}

function renderProfile(content, data) {
  const { profile } = data;
  const isMine = Boolean(currentUser && currentUser.id === profile.id);

  content.innerHTML = "";

  /* ---------- Cabecera ---------- */
  const head = makeElement("div", "profile-head");
  head.appendChild(makeElement("span", "profile-avatar", profile.avatar || "🎮"));

  const info = makeElement("div", "profile-info");
  const name = makeElement("h2", "profile-name", profile.display_name);
  name.id = "profile-name";
  info.appendChild(name);

  const since = new Date(profile.created_at).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric"
  });
  info.appendChild(makeElement("p", "profile-since", `Miembro desde ${since}`));

  if (profile.bio) {
    info.appendChild(makeElement("p", "profile-bio", profile.bio));
  }

  head.appendChild(info);
  content.appendChild(head);

  if (isMine) {
    const edit = makeElement("button", "secondary-button profile-edit-button", "✏️ Editar perfil");
    edit.type = "button";
    edit.addEventListener("click", () => renderProfileForm(content, data));
    content.appendChild(edit);
  }

  /* ---------- Cifras ---------- */
  const stats = makeElement("ul", "profile-stats");
  [
    [data.suggestions.length, data.suggestions.length === 1 ? "idea" : "ideas"],
    [
      data.suggestions.reduce((total, s) => total + (s.votes || 0), 0),
      "votos recibidos"
    ],
    [data.wishlist.length, data.wishlist.length === 1 ? "deseado" : "deseados"]
  ].forEach(([number, label]) => {
    const item = makeElement("li");
    item.appendChild(makeElement("strong", "", String(number)));
    item.appendChild(document.createTextNode(` ${label}`));
    stats.appendChild(item);
  });
  content.appendChild(stats);

  /* ---------- Insignias ---------- */
  content.appendChild(makeElement("h3", "profile-section-title", "Insignias"));
  const badges = makeElement("ul", "badge-list");

  BADGES.forEach((badge) => {
    if (!isMine && badge.forOthers === false) {
      return;
    }

    const earned = badge.test(data);

    // En perfiles ajenos solo se ven las conseguidas
    if (!earned && !isMine) {
      return;
    }

    const item = makeElement("li", earned ? "badge" : "badge badge-locked");
    item.title = earned ? badge.how : `Cómo conseguirla: ${badge.how}`;
    item.appendChild(makeElement("span", "badge-icon", earned ? badge.icon : "🔒"));
    item.appendChild(makeElement("span", "badge-name", badge.name));
    badges.appendChild(item);
  });

  if (!badges.children.length) {
    badges.appendChild(makeElement("li", "profile-empty", "Todavía no tiene insignias."));
  }

  content.appendChild(badges);

  /* ---------- Lista de deseados ---------- */
  content.appendChild(makeElement("h3", "profile-section-title", "Lista de deseados"));
  const wishlist = makeElement("ul", "profile-wishlist");

  data.wishlist.forEach((entry) => {
    const project = PROJECTS[entry.project_id];

    if (!project) {
      return;
    }

    const item = makeElement("li");
    const button = makeElement("button", "profile-wish");
    button.type = "button";

    const img = document.createElement("img");
    img.src = project.image;
    img.alt = "";
    img.loading = "lazy";

    button.append(img, makeElement("span", "", project.title));

    if (entry.notify) {
      button.appendChild(makeElement("span", "profile-wish-notify", "🔔"));
    }

    button.addEventListener("click", () => {
      closeModal(document.getElementById("profile-modal"));
      openProjectModal(entry.project_id);
    });
    item.appendChild(button);
    wishlist.appendChild(item);
  });

  if (!wishlist.children.length) {
    wishlist.appendChild(
      makeElement(
        "li",
        "profile-empty",
        isMine
          ? "Aún no tienes juegos. Abre la ficha de un juego y pulsa «Añadir a deseados»."
          : "Aún no tiene juegos en su lista."
      )
    );
  }

  content.appendChild(wishlist);

  /* ---------- Récords ---------- */
  content.appendChild(makeElement("h3", "profile-section-title", "Récords"));
  const records = makeElement("ul", "profile-records");

  Object.entries(SCORE_GAMES).forEach(([game, info]) => {
    const item = makeElement("li");
    item.appendChild(makeElement("span", "", info.title));
    item.appendChild(
      makeElement(
        "strong",
        "",
        data.scores[game] ? formatScore(game, data.scores[game]) : "—"
      )
    );
    records.appendChild(item);
  });

  content.appendChild(records);
}

/* Formulario para editar tu perfil */
function renderProfileForm(content, data) {
  const { profile } = data;
  content.innerHTML = "";

  const form = makeElement("form", "profile-form");
  form.appendChild(makeElement("h2", "profile-name", "Editar perfil"));

  /* Avatar */
  const avatarLabel = makeElement("p", "profile-form-label", "Avatar");
  const avatars = makeElement("div", "avatar-picker");
  avatars.setAttribute("role", "radiogroup");
  avatars.setAttribute("aria-label", "Avatar");
  let chosen = profile.avatar || "🎮";

  PROFILE_AVATARS.forEach((emoji) => {
    const option = makeElement("button", "avatar-option", emoji);
    option.type = "button";
    option.setAttribute("role", "radio");
    option.setAttribute("aria-checked", String(emoji === chosen));
    option.addEventListener("click", () => {
      chosen = emoji;
      avatars.querySelectorAll(".avatar-option").forEach((item) => {
        item.setAttribute("aria-checked", String(item === option));
      });
    });
    avatars.appendChild(option);
  });

  /* Nombre */
  const nameLabel = makeElement("label", "", "Nombre");
  nameLabel.htmlFor = "profile-name-input";
  const nameInput = document.createElement("input");
  nameInput.id = "profile-name-input";
  nameInput.required = true;
  nameInput.minLength = 2;
  nameInput.maxLength = 30;
  nameInput.value = profile.display_name;

  /* Biografía */
  const bioLabel = makeElement("label", "", "Sobre ti (máximo 160 caracteres)");
  bioLabel.htmlFor = "profile-bio-input";
  const bioInput = document.createElement("textarea");
  bioInput.id = "profile-bio-input";
  bioInput.maxLength = 160;
  bioInput.rows = 3;
  bioInput.value = profile.bio || "";

  const message = makeElement("p", "auth-message");
  message.setAttribute("aria-live", "polite");

  const actions = makeElement("div", "profile-form-actions");
  const save = makeElement("button", "primary-button", "Guardar");
  save.type = "submit";
  const cancel = makeElement("button", "secondary-button", "Cancelar");
  cancel.type = "button";
  cancel.addEventListener("click", () => renderProfile(content, data));
  actions.append(cancel, save);

  form.append(avatarLabel, avatars, nameLabel, nameInput, bioLabel, bioInput, message, actions);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const displayName = nameInput.value.trim();

    if (displayName.length < 2) {
      message.textContent = "El nombre debe tener al menos 2 caracteres.";
      message.className = "auth-message error";
      return;
    }

    save.disabled = true;
    message.textContent = "Guardando...";
    message.className = "auth-message";

    const changes = {
      display_name: displayName,
      bio: bioInput.value.trim(),
      avatar: chosen
    };

    const { error } = await supabaseClient
      .from("profiles")
      .update(changes)
      .eq("id", profile.id);

    save.disabled = false;

    if (error) {
      console.warn("No se pudo guardar el perfil:", error.message);
      message.textContent = "No se pudo guardar el perfil. Inténtalo de nuevo.";
      message.className = "auth-message error";
      return;
    }

    Object.assign(data.profile, changes);
    renderProfile(content, data);
    loadLeaderboard(currentLeaderboardGame);
  });

  content.appendChild(form);
  nameInput.focus();
}

/* =========================================================
   CLASIFICACIÓN DE LOS MINIJUEGOS
   ========================================================= */

async function loadLeaderboard(game) {
  const list = document.getElementById("leaderboard-list");

  if (!list || !platformAvailable) {
    return;
  }

  currentLeaderboardGame = game;

  document.querySelectorAll(".leaderboard-tab").forEach((tab) => {
    tab.setAttribute("aria-pressed", String(tab.dataset.game === game));
  });

  const { data, error } = await supabaseClient
    .from("game_scores")
    .select("user_id, score, profiles(display_name, avatar)")
    .eq("game", game)
    .gt("score", 0)
    .order("score", { ascending: false })
    .order("updated_at", { ascending: true })
    .limit(10);

  // Si mientras cargaba se ha pulsado otra pestaña, no se pinta
  if (game !== currentLeaderboardGame) {
    return;
  }

  list.innerHTML = "";

  if (error) {
    console.warn("No se pudo cargar la clasificación:", error.message);
    list.appendChild(makeElement("li", "leaderboard-empty", "No se pudo cargar la clasificación."));
    return;
  }

  if (!data || !data.length) {
    list.appendChild(
      makeElement("li", "leaderboard-empty", "Nadie tiene récord todavía. ¡Sé el primero!")
    );
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];

  data.forEach((row, index) => {
    const item = makeElement("li", "leaderboard-row");

    if (currentUser && row.user_id === currentUser.id) {
      item.classList.add("is-me");
    }

    item.appendChild(makeElement("span", "leaderboard-pos", medals[index] || String(index + 1)));

    const player = makeElement("button", "leaderboard-player profile-link");
    player.type = "button";
    player.title = "Ver perfil";
    player.append(
      makeElement("span", "leaderboard-avatar", row.profiles?.avatar || "🎮"),
      makeElement("span", "", row.profiles?.display_name || "Tronker")
    );
    player.addEventListener("click", () => openProfile(row.user_id));

    item.appendChild(player);
    item.appendChild(makeElement("strong", "leaderboard-score", formatScore(game, row.score)));
    list.appendChild(item);
  });
}

function refreshLeaderboardIfShowing(game) {
  if (game === currentLeaderboardGame) {
    loadLeaderboard(game);
  }
}

function updateLeaderboardHint() {
  const hint = document.getElementById("leaderboard-hint");

  if (hint) {
    hint.textContent = currentUser
      ? "Tus récords se guardan en tu cuenta al acabar cada partida."
      : "Inicia sesión para guardar tus récords y salir en la clasificación.";
  }
}

/* =========================================================
   ARRANQUE Y CAMBIOS DE SESIÓN
   ========================================================= */

/*
 * Lo llama js/auth.js al iniciar o cerrar sesión. Las llamadas van
 * en fila, una detrás de otra, para no subir dos veces el mismo récord.
 */
let platformSyncQueue = Promise.resolve();

function onPlatformAuthChange() {
  platformSyncQueue = platformSyncQueue
    .then(syncPlatformWithAccount)
    .catch((error) => console.error(error));

  return platformSyncQueue;
}

async function syncPlatformWithAccount() {
  if (!platformAvailable) {
    return;
  }

  updateLeaderboardHint();

  await Promise.all([loadMyWishlist(), loadMyScores()]);

  if (currentUser) {
    await syncLocalRecords();
  }

  const projectId = currentProjectId();

  if (projectId) {
    renderWishlistButtons(projectId);
  }

  loadLeaderboard(currentLeaderboardGame);
}

async function initializePlatform() {
  setPlatformVisible(false);

  document
    .getElementById("wishlist-toggle")
    ?.addEventListener("click", toggleWishlist);

  document
    .getElementById("notify-toggle")
    ?.addEventListener("click", toggleNotify);

  document
    .getElementById("my-profile-button")
    ?.addEventListener("click", () => {
      if (currentUser) {
        closeModal(accountModal);
        openProfile(currentUser.id);
      }
    });

  document.querySelectorAll(".leaderboard-tab").forEach((tab) => {
    tab.addEventListener("click", () => loadLeaderboard(tab.dataset.game));
  });

  platformAvailable = await checkPlatformAvailable();
  setPlatformVisible(platformAvailable);

  if (!platformAvailable) {
    return;
  }

  // Los nombres de las sugerencias pasan a abrir perfiles
  if (typeof renderSuggestions === "function" && allSuggestions.length) {
    renderSuggestions(allSuggestions);
  }

  if (!currentUser) {
    currentUser = await getCurrentUser();
  }

  await onPlatformAuthChange();
}
