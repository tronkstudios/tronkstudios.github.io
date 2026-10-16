"use strict";

/* TronkStudios · js/games/results.js
   Panel de resultados de los minijuegos (en la ventana de inicio y de fin
   de partida), separado de la descripción del juego:
   - una cinta dorada «NUEVO RÉCORD» solo cuando lo consigues;
   - casillas con las cifras (puntos, récord, mejor racha...).
   Y las rachas privadas: solo se guardan en tu navegador, no salen en
   ninguna clasificación.
   Se carga como script clásico (ver docs/adr/0002). */

const TronkResults = (() => {
  /* Pinta el panel dentro de la caja del menú del juego.
     tiles: [{ label, value, gold }] · newRecord: true/false */
  function render(overlayBox, { newRecord = false, tiles = [] } = {}) {
    if (!overlayBox) {
      return;
    }

    let panel = overlayBox.querySelector(".game-result");

    if (!panel) {
      panel = document.createElement("div");
      panel.className = "game-result";

      // Va justo después de la descripción, antes de los botones
      const text = overlayBox.querySelector("p");
      if (text) {
        text.after(panel);
      } else {
        overlayBox.prepend(panel);
      }
    }

    panel.replaceChildren();

    if (newRecord) {
      const ribbon = document.createElement("div");
      ribbon.className = "game-result-record";
      ribbon.append(makeIcon("trophy", "icon"), document.createTextNode(" ¡NUEVO RÉCORD!"));
      panel.appendChild(ribbon);
    }

    const shown = tiles.filter((tile) => tile && tile.value !== undefined && tile.value !== null);

    if (shown.length) {
      const list = document.createElement("dl");
      list.className = "game-result-tiles";

      shown.forEach((tile) => {
        const item = document.createElement("div");
        item.className = tile.gold ? "game-result-tile is-gold" : "game-result-tile";

        const label = document.createElement("dt");
        label.textContent = tile.label;

        const value = document.createElement("dd");
        value.textContent = String(tile.value);

        item.append(label, value);
        list.appendChild(item);
      });

      panel.appendChild(list);
    }

    panel.hidden = !newRecord && !shown.length;
  }

  /* ----- Rachas privadas (solo en este navegador) ----- */

  function bestStreak(game) {
    try {
      return Number(localStorage.getItem(`tronk-streak:${game}`)) || 0;
    } catch {
      return 0;
    }
  }

  // Guarda la racha si es la mejor. Devuelve true si es nueva mejor racha.
  function saveStreak(game, streak) {
    if (streak <= bestStreak(game)) {
      return false;
    }

    try {
      localStorage.setItem(`tronk-streak:${game}`, String(streak));
    } catch {
      // Sin almacenamiento: dura hasta recargar
    }

    return true;
  }

  /* Contador de racha en el marcador del juego (sale a partir de 3) */
  function showStreak(hud, streak) {
    if (!hud) {
      return;
    }

    let badge = hud.querySelector(".game-streak");

    if (!badge) {
      badge = document.createElement("div");
      badge.className = "game-streak";
      hud.appendChild(badge);
    }

    if (streak >= 3) {
      const changed = badge.dataset.value !== String(streak);
      badge.dataset.value = String(streak);
      badge.textContent = `RACHA ×${streak}`;
      badge.classList.add("is-visible");

      if (changed) {
        badge.classList.remove("is-pop");
        void badge.offsetWidth;
        badge.classList.add("is-pop");
      }
    } else {
      badge.classList.remove("is-visible");
      badge.dataset.value = "";
    }
  }

  return { render, bestStreak, saveStreak, showStreak };
})();

window.TronkResults = TronkResults;
