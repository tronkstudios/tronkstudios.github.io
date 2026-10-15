"use strict";

/* TronkStudios · js/apis.js
   Datos en directo de YouTube (últimos vídeos del canal) y de Roblox
   (jugadores ahora, visitas, favoritos y «me gusta» de nuestros juegos).
   Los pide al Worker de Cloudflare (index.js de la raíz, rutas /youtube
   y /roblox), que es quien habla con YouTube y Roblox.
   Si algo falla, esos bloques simplemente no se muestran.
   Se carga como script clásico (ver docs/adr/0002). */

const WORKER_URL = "https://tronkstudios-support.tronkstudios7.workers.dev";

// Cada cuánto se actualizan los datos de Roblox (ms)
const ROBLOX_REFRESH = 60000;

// Últimos datos de Roblox por juego (id de PROJECTS → datos)
const ROBLOX_STATS = {};

async function workerJson(path) {
  const response = await fetch(`${WORKER_URL}${path}`);

  if (!response.ok) {
    throw new Error(`${path} ${response.status}`);
  }

  return response.json();
}

function formatNumber(value, compact = true) {
  return new Intl.NumberFormat(currentLocale(), {
    notation: compact && value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(value);
}

/* =========================================================
   YOUTUBE: ÚLTIMOS VÍDEOS
   ========================================================= */

function createVideoCard(video) {
  const card = document.createElement("a");
  card.className = "video-card";
  card.href = video.url;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.setAttribute("aria-label", `${video.title} (se abre en otra pestaña)`);

  const media = document.createElement("div");
  media.className = "video-media";

  const img = document.createElement("img");
  img.src = video.thumbnail;
  img.alt = "";
  img.loading = "lazy";

  media.append(img, makeIcon("play", "icon video-play"));

  const title = document.createElement("p");
  title.className = "video-title";
  title.dataset.noTranslate = "";
  title.textContent = video.title;

  const meta = document.createElement("p");
  meta.className = "video-meta";

  const date = new Date(video.published).toLocaleDateString(currentLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  meta.textContent = video.views
    ? `${date} · ${formatNumber(video.views)} ${video.views === 1 ? "visualización" : "visualizaciones"}`
    : date;

  card.append(media, title, meta);
  return card;
}

async function loadYoutubeVideos() {
  const box = document.getElementById("videos");
  const list = document.getElementById("videos-list");

  if (!box || !list) {
    return;
  }

  try {
    const { videos } = await workerJson("/youtube");

    if (!videos || !videos.length) {
      return;
    }

    list.replaceChildren(...videos.slice(0, 3).map(createVideoCard));
    box.hidden = false;
  } catch (error) {
    console.warn("TronkStudios: no se pudieron cargar los vídeos de YouTube.", error.message);
  }
}

/* =========================================================
   ROBLOX: ESTADÍSTICAS EN DIRECTO
   ========================================================= */

function robloxProjects() {
  return Object.entries(PROJECTS).filter(
    ([, project]) => project.roblox && /^\d+$/.test(project.roblox.placeId || "")
  );
}

/* Cuatro cifras + botón «Jugar en Roblox» */
function createRobloxStats(game) {
  const box = document.createElement("div");
  box.className = "roblox-stats";

  const total = game.likes + game.dislikes;
  const items = [
    ["users", formatNumber(game.playing, false), "Jugando ahora", true],
    ["rocket", formatNumber(game.visits), "Visitas"],
    ["star", formatNumber(game.favorites), "Favoritos"],
    ["thumb", total ? `${Math.round((game.likes / total) * 100)}%` : "—", "Me gusta"]
  ];

  const list = document.createElement("ul");
  list.className = "roblox-stat-list";

  items.forEach(([icon, value, label, live]) => {
    const item = document.createElement("li");
    item.className = live ? "roblox-stat is-live" : "roblox-stat";

    const number = document.createElement("strong");
    number.textContent = value;

    const text = document.createElement("span");
    text.textContent = label;

    item.append(makeIcon(icon), number, text);
    list.appendChild(item);
  });

  const play = document.createElement("a");
  play.className = "primary-button roblox-play";
  play.href = game.url;
  play.target = "_blank";
  play.rel = "noopener noreferrer";
  setIconText(play, "play", "Jugar en Roblox");

  box.append(list, play);
  return box;
}

/* Tarjetas de la sección Roblox */
function renderRobloxSection() {
  const list = document.getElementById("roblox-games");
  const empty = document.querySelector("#roblox .empty-state");

  if (!list) {
    return;
  }

  const games = robloxProjects().filter(([id]) => ROBLOX_STATS[id]);

  list.replaceChildren();

  games.forEach(([id, project]) => {
    const game = ROBLOX_STATS[id];
    const card = document.createElement("article");
    card.className = "roblox-card";

    const head = document.createElement("div");
    head.className = "roblox-card-head";

    const icon = document.createElement("img");
    icon.src = game.icon || project.image;
    icon.alt = "";
    icon.loading = "lazy";

    const title = document.createElement("h3");
    title.textContent = project.title;

    const live = document.createElement("span");
    live.className = "roblox-live";
    live.textContent = "En directo";

    head.append(icon, title, live);
    card.append(head, createRobloxStats(game));
    list.appendChild(card);
  });

  list.hidden = !games.length;

  if (empty) {
    empty.hidden = games.length > 0;
  }
}

/* Cifras dentro de la ficha del juego (si está abierta) */
function renderProjectRoblox(projectId) {
  const box = document.getElementById("project-roblox");

  if (!box) {
    return;
  }

  const game = ROBLOX_STATS[projectId];
  box.replaceChildren();
  box.hidden = !game;

  if (game) {
    box.appendChild(createRobloxStats(game));
  }
}

async function loadRobloxStats() {
  const projects = robloxProjects();

  if (!projects.length) {
    return;
  }

  await Promise.all(
    projects.map(async ([id, project]) => {
      try {
        const { game } = await workerJson(`/roblox?place=${project.roblox.placeId}`);
        ROBLOX_STATS[id] = game;
      } catch (error) {
        console.warn(`TronkStudios: sin datos de Roblox para ${project.title}.`, error.message);
      }
    })
  );

  renderRobloxSection();

  const openProject = document.getElementById("project-modal")?.dataset.project;

  if (openProject) {
    renderProjectRoblox(openProject);
  }
}

/* =========================================================
   ARRANQUE
   ========================================================= */

function initializeApis() {
  loadYoutubeVideos();

  if (robloxProjects().length) {
    loadRobloxStats();

    // Se actualiza cada minuto mientras la pestaña está visible
    setInterval(() => {
      if (!document.hidden) {
        loadRobloxStats();
      }
    }, ROBLOX_REFRESH);
  }
}
