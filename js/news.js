"use strict";

/* TronkStudios · js/news.js
   Diario de desarrollo: filtrar por etiqueta y «Ver entradas anteriores».
   Las entradas están escritas en el index.html, así se ven aunque
   falle el JavaScript. Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   DIARIO DE DESARROLLO
   ========================================================= */

// Entradas que se ven antes de pulsar «Ver entradas anteriores»
const NEWS_VISIBLE = 4;

function initializeNews() {
  const list = document.getElementById("news-list");
  const moreButton = document.getElementById("news-more");
  const filters = document.querySelectorAll(".news-filter");

  if (!list) {
    return;
  }

  const entries = Array.from(list.querySelectorAll(".news-entry"));
  let filter = "all";
  let expanded = false;

  function render() {
    const matching = entries.filter(
      (entry) => filter === "all" || entry.dataset.tag === filter
    );

    entries.forEach((entry) => {
      const position = matching.indexOf(entry);
      entry.hidden = position === -1 || (!expanded && position >= NEWS_VISIBLE);
    });

    if (moreButton) {
      moreButton.hidden = expanded || matching.length <= NEWS_VISIBLE;
    }
  }

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      filter = button.dataset.filter || "all";
      expanded = false;

      filters.forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });

      render();
    });
  });

  moreButton?.addEventListener("click", () => {
    expanded = true;
    render();
  });

  render();
}
