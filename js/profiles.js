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

// Avatares dibujados para elegir en el perfil (img/avatars/<id>.svg)
const PROFILE_AVATARS = [
  { id: "tronk", name: "Tronk" },
  { id: "robot", name: "Robot" },
  { id: "zombie", name: "Zombi" },
  { id: "ninja", name: "Ninja" },
  { id: "knight", name: "Caballero" },
  { id: "wizard", name: "Mago" },
  { id: "astronaut", name: "Astronauta" },
  { id: "alien", name: "Alien" },
  { id: "fox", name: "Zorro" },
  { id: "ghost", name: "Fantasma" },
  { id: "pirate", name: "Pirata" },
  { id: "slime", name: "Slime" }
];

/* Imagen del avatar. Si el valor no es uno de la lista, sale el de Tronk. */
function avatarImage(id, className = "avatar-img") {
  const known = PROFILE_AVATARS.some((avatar) => avatar.id === id);
  const img = document.createElement("img");
  img.className = className;
  img.src = `img/avatars/${known ? id : "tronk"}.svg`;
  img.alt = "";
  img.width = 64;
  img.height = 64;
  return img;
}

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
    icon: "medal",
    name: "Fundador",
    how: `Crear la cuenta en ${FOUNDER_YEAR}`,
    test: (d) => new Date(d.profile.created_at).getFullYear() <= FOUNDER_YEAR
  },
  {
    icon: "bulb",
    name: "Primera idea",
    how: "Proponer una idea en Comunidad",
    test: (d) => d.suggestions.length >= 1
  },
  {
    icon: "sparkles",
    name: "Mente creativa",
    how: "Proponer 5 ideas",
    test: (d) => d.suggestions.length >= 5
  },
  {
    icon: "flame",
    name: "Idea popular",
    how: "Que una de tus ideas llegue a 10 votos",
    test: (d) => d.suggestions.some((s) => (s.votes || 0) >= 10)
  },
  {
    icon: "thumb",
    name: "Votante",
    how: "Votar una idea de la comunidad",
    forOthers: false,
    test: (d) => d.votes >= 1
  },
  {
    icon: "heart-fill",
    name: "Fan",
    how: "Añadir un juego a tu lista de deseados",
    test: (d) => d.wishlist.length >= 1
  },
  {
    icon: "bell",
    name: "Atento",
    how: "Pedir aviso del lanzamiento de un juego",
    test: (d) => d.wishlist.some((w) => w.notify)
  },
  {
    icon: "gamepad",
    name: "Jugador",
    how: "Guardar un récord en un minijuego",
    test: (d) => Object.values(d.scores).some((score) => score > 0)
  },
  {
    icon: "trophy",
    name: "Todoterreno",
    how: "Tener récord en los 4 minijuegos",
    test: (d) => Object.keys(SCORE_GAMES).every((game) => d.scores[game] > 0)
  },
  {
    icon: "swords",
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
    window.dispatchEvent(new Event("tronk:activity"));
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
    window.dispatchEvent(new Event("tronk:activity"));
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
  setIconText(
    wishButton,
    entry ? "heart-fill" : "heart",
    entry ? "En tu lista de deseados" : "Añadir a deseados"
  );

  // Si el juego ya ha salido, no tiene sentido pedir aviso
  notifyButton.hidden = released;
  notifyButton.setAttribute("aria-pressed", String(Boolean(entry?.notify)));
  setIconText(
    notifyButton,
    entry?.notify ? "bell" : "bell-off",
    entry?.notify ? "Te avisaremos cuando salga" : "Avísame cuando salga"
  );

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
  window.dispatchEvent(new Event("tronk:activity"));
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
  window.dispatchEvent(new Event("tronk:activity"));
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
  head.appendChild(avatarImage(profile.avatar, "profile-avatar"));

  const info = makeElement("div", "profile-info");
  const name = makeElement("h2", "profile-name", profile.display_name);
  name.id = "profile-name";
  info.appendChild(name);

  const since = new Date(profile.created_at).toLocaleDateString(currentLocale(), {
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
    const edit = makeElement("button", "secondary-button profile-edit-button");
    setIconText(edit, "edit", "Editar perfil");
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

    // Solo se ven las insignias conseguidas
    if (!badge.test(data)) {
      return;
    }

    const item = makeElement("li", "badge");
    item.title = badge.how;
    item.appendChild(makeIcon(badge.icon, "icon badge-icon"));
    item.appendChild(makeElement("span", "badge-name", badge.name));
    badges.appendChild(item);
  });

  if (!badges.children.length) {
    badges.appendChild(
      makeElement(
        "li",
        "profile-empty",
        isMine ? "Todavía no tienes insignias." : "Todavía no tiene insignias."
      )
    );
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
      button.appendChild(makeIcon("bell", "icon profile-wish-notify"));
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
  let chosen = PROFILE_AVATARS.some((avatar) => avatar.id === profile.avatar)
    ? profile.avatar
    : "tronk";

  PROFILE_AVATARS.forEach((avatar) => {
    const option = makeElement("button", "avatar-option");
    option.type = "button";
    option.title = avatar.name;
    option.setAttribute("role", "radio");
    option.setAttribute("aria-label", avatar.name);
    option.setAttribute("aria-checked", String(avatar.id === chosen));
    option.appendChild(avatarImage(avatar.id));
    option.addEventListener("click", () => {
      chosen = avatar.id;
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
    loadSuggestions();
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


  data.forEach((row, index) => {
    const item = makeElement("li", "leaderboard-row");

    if (currentUser && row.user_id === currentUser.id) {
      item.classList.add("is-me");
    }

    // Los tres primeros llevan copa de oro, plata y bronce
    const position = makeElement("span", "leaderboard-pos");

    if (index < 3) {
      position.appendChild(makeIcon("trophy", `icon medal medal-${index + 1}`));
      position.setAttribute("aria-label", `Puesto ${index + 1}`);
    } else {
      position.textContent = String(index + 1);
    }

    item.appendChild(position);

    const player = makeElement("button", "leaderboard-player profile-link");
    player.type = "button";
    player.title = "Ver perfil";
    player.append(
      avatarImage(row.profiles?.avatar, "leaderboard-avatar"),
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
   FECHAS DE LANZAMIENTO
   La tabla game_releases es la fecha oficial (el equipo la cambia
   desde su panel). Si existe, manda sobre la de js/projects.js.
   ========================================================= */

async function loadReleaseDates() {
  if (!platformAvailable) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("game_releases")
    .select("project_id, release_date");

  if (error || !data) {
    return;
  }

  data.forEach((row) => {
    if (PROJECTS[row.project_id]) {
      PROJECTS[row.project_id].release = row.release_date
        ? row.release_date.split("-").map(Number)
        : null;
    }
  });
}

/* =========================================================
   AVISO DE LANZAMIENTO DENTRO DE LA WEB
   Si pediste «Avísame cuando salga» y el juego ya ha salido
   (fecha de js/projects.js), al entrar sale un aviso arriba.
   Al cerrarlo no vuelve a salir en este navegador.
   ========================================================= */

function launchSeenKey(projectId) {
  return `tronk-launch-seen:${projectId}`;
}

function showLaunchNotices() {
  document.querySelectorAll(".launch-notice").forEach((notice) => notice.remove());

  if (!currentUser) {
    return;
  }

  myWishlist.forEach((entry, projectId) => {
    const project = PROJECTS[projectId];

    if (
      !entry.notify ||
      !project ||
      !Array.isArray(project.release) ||
      daysUntil(project.release) > 0
    ) {
      return;
    }

    try {
      if (localStorage.getItem(launchSeenKey(projectId))) {
        return;
      }
    } catch {
      // Sin localStorage se muestra igualmente
    }

    const notice = makeElement("div", "launch-notice");
    notice.setAttribute("role", "status");

    const text = makeElement("p", "launch-notice-text");
    text.append(
      makeIcon("sparkles", "icon launch-notice-icon"),
      makeElement("strong", "", ` ¡${project.title} ya ha salido!`),
      document.createTextNode(" Pediste que te avisáramos cuando saliera.")
    );

    const dismiss = () => {
      try {
        localStorage.setItem(launchSeenKey(projectId), "1");
      } catch {
        // Sin localStorage volverá a salir la próxima vez
      }

      notice.remove();
    };

    const open = makeElement("button", "primary-button", "Ver ficha");
    open.type = "button";
    open.addEventListener("click", () => {
      dismiss();
      openProjectModal(projectId);
    });

    const close = makeElement("button", "launch-notice-close");
    close.appendChild(makeIcon("close"));
    close.type = "button";
    close.setAttribute("aria-label", "Cerrar aviso");
    close.addEventListener("click", dismiss);

    notice.append(text, open, close);
    document.querySelector("main")?.prepend(notice);
  });
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

  showLaunchNotices();

  const projectId = currentProjectId();

  if (projectId) {
    renderWishlistButtons(projectId);
  }

  loadLeaderboard(currentLeaderboardGame);

  // Tu aporte a los retos (js/challenges.js)
  loadChallenges();

  // ¿Insignias nuevas? (js/extras.js)
  window.dispatchEvent(new Event("tronk:activity"));
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

  await loadReleaseDates();

  // Los nombres de las sugerencias pasan a abrir perfiles
  if (typeof renderSuggestions === "function" && allSuggestions.length) {
    renderSuggestions(allSuggestions);
  }

  if (!currentUser) {
    currentUser = await getCurrentUser();
  }

  await onPlatformAuthChange();
}
