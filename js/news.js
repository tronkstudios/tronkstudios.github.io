"use strict";

/* TronkStudios · js/news.js
   Diario de desarrollo: filtrar por etiqueta y «Ver entradas anteriores».
   Las entradas fijas están escritas en el index.html, así se ven aunque
   falle el JavaScript. Las que el equipo escribe desde su panel vienen
   de Supabase (tabla news) y se añaden con addNewsEntries().
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   DIARIO DE DESARROLLO
   ========================================================= */

// Entradas que se ven antes de pulsar «Ver entradas anteriores»
const NEWS_VISIBLE = 4;

const NEWS_TAGS = {
  development: "Desarrollo",
  update: "Actualización",
  announcement: "Anuncio"
};

let newsFilter = "all";
let newsExpanded = false;

function newsEntries() {
  return Array.from(document.querySelectorAll("#news-list .news-entry"));
}

function renderNews() {
  const moreButton = document.getElementById("news-more");
  const matching = newsEntries().filter(
    (entry) => newsFilter === "all" || entry.dataset.tag === newsFilter
  );

  newsEntries().forEach((entry) => {
    const position = matching.indexOf(entry);
    entry.hidden = position === -1 || (!newsExpanded && position >= NEWS_VISIBLE);
  });

  if (moreButton) {
    moreButton.hidden = newsExpanded || matching.length <= NEWS_VISIBLE;
  }
}

/* Crea el <article> de una entrada escrita desde el panel del equipo */
function createNewsEntry(row) {
  const article = document.createElement("article");
  article.className = "news-entry";
  article.dataset.tag = NEWS_TAGS[row.tag] ? row.tag : "update";
  article.dataset.newsId = String(row.id);

  const meta = document.createElement("div");
  meta.className = "news-entry-meta";

  const time = document.createElement("time");
  time.dateTime = row.published_on;
  time.textContent = new Date(`${row.published_on}T12:00:00`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const tag = document.createElement("span");
  tag.className = `news-tag news-tag-${article.dataset.tag}`;
  tag.textContent = NEWS_TAGS[article.dataset.tag];

  meta.append(time, tag);

  const title = document.createElement("h3");
  title.textContent = row.title;

  const body = document.createElement("p");
  body.textContent = row.body;

  article.append(meta, title, body);
  return article;
}

/* Añade (o sustituye) las entradas de Supabase y ordena todo por fecha */
function addNewsEntries(rows) {
  const list = document.getElementById("news-list");

  if (!list) {
    return;
  }

  list.querySelectorAll("[data-news-id]").forEach((entry) => entry.remove());
  (rows || []).forEach((row) => list.appendChild(createNewsEntry(row)));

  // Más recientes primero; con la misma fecha, las del panel van antes
  newsEntries()
    .map((entry, index) => ({
      entry,
      index,
      date: entry.querySelector("time")?.getAttribute("datetime") || "",
      fromPanel: entry.dataset.newsId ? 1 : 0
    }))
    .sort((a, b) =>
      b.date.localeCompare(a.date) || b.fromPanel - a.fromPanel || a.index - b.index
    )
    .forEach(({ entry }) => list.appendChild(entry));

  renderNews();
}

/* =========================================================
   OCULTAR / MOSTRAR EL DIARIO
   Se recuerda en este navegador.
   ========================================================= */

const NEWS_HIDDEN_KEY = "tronk-news-hidden";

function setNewsHidden(hidden) {
  const body = document.getElementById("news-body");
  const toggle = document.getElementById("news-toggle");

  if (!body || !toggle) {
    return;
  }

  body.hidden = hidden;
  toggle.setAttribute("aria-expanded", String(!hidden));
  toggle.querySelector("span").textContent = hidden ? "Mostrar diario" : "Ocultar diario";

  try {
    localStorage.setItem(NEWS_HIDDEN_KEY, hidden ? "1" : "0");
  } catch {
    // Sin localStorage no se recuerda, pero funciona igual
  }
}

function initializeNewsToggle() {
  const toggle = document.getElementById("news-toggle");

  if (!toggle) {
    return;
  }

  toggle.addEventListener("click", () => {
    setNewsHidden(toggle.getAttribute("aria-expanded") === "true");
  });

  let hidden = false;

  try {
    hidden = localStorage.getItem(NEWS_HIDDEN_KEY) === "1";
  } catch {
    hidden = false;
  }

  setNewsHidden(hidden);
}

function initializeNews() {
  initializeNewsToggle();

  const moreButton = document.getElementById("news-more");
  const filters = document.querySelectorAll(".news-filter");

  if (!document.getElementById("news-list")) {
    return;
  }

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      newsFilter = button.dataset.filter || "all";
      newsExpanded = false;

      filters.forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });

      renderNews();
    });
  });

  moreButton?.addEventListener("click", () => {
    newsExpanded = true;
    renderNews();
  });

  renderNews();
}
