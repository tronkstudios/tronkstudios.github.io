"use strict";

/* TronkStudios · js/games/results.js
   Panel de resultados de los minijuegos (en la ventana de inicio y de fin
   de partida), separado de la descripción del juego:
   - una cinta dorada «NUEVO RÉCORD» solo cuando lo consigues;
   - casillas con las cifras (puntos, récord, mejor racha...).
   Y las rachas privadas: solo se guardan en tu navegador, no salen en
   ninguna clasificación.
   Y «Retar a un amigo»: un enlace como «Supera mis 850 puntos en
   Protect Mogos» que, al abrirlo, propone el reto a quien lo recibe.
   Se carga como script clásico (ver docs/adr/0002). */

const TronkResults = (() => {
  /* Pinta el panel dentro de la caja del menú del juego.
     tiles: [{ label, value, gold }] · newRecord: true/false
     duel: { game, score } → reto de un amigo y botón «Retar a un amigo»
     (sin score, solo recuerda el reto pendiente al empezar). */
  function render(overlayBox, { newRecord = false, tiles = [], duel = null } = {}) {
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

    // Un 0 cuenta para el logro secreto «Cero patatero» (js/secrets.js)
    if (duel && duel.score === 0) {
      window.TronkSecrets?.zero(duel.game);
    }

    const duelBox = duel ? renderDuel(duel) : null;

    if (duelBox) {
      panel.appendChild(duelBox);
    }

    // En la pantalla de inicio: podio con los 3 mejores (js/profiles.js)
    if (duel && duel.score === undefined && window.TronkPodium) {
      const podium = document.createElement("div");
      podium.className = "game-podium";
      panel.appendChild(podium);
      window.TronkPodium.fill(podium, duel.game).then(() => {
        panel.hidden = !panel.children.length;
      });
    }

    panel.hidden = !newRecord && !shown.length && !duelBox;
  }

  /* ----- Retar a un amigo ----- */

  const DUEL_GAMES = {
    antitronks: { title: "Antitronks", card: "antitronks", unit: "puntos", emoji: "🎯" },
    "protect-mogos": { title: "Protect Mogos", card: "antininja", unit: "puntos", emoji: "🥷" },
    "stick-drill": { title: "Stick Drill", card: "stickdrill", unit: "segundos", emoji: "🌀" },
    miente: { title: "El Juego Miente", card: "miente", unit: "aciertos", emoji: "🤥" }
  };

  // Reto recibido por enlace (?reta=juego&p=puntos&de=nombre)
  let incoming = readIncomingDuel();

  function cleanName(value) {
    return String(value || "")
      .replace(/[\u0000-\u001f\u007f<>]/g, "")
      .trim()
      .slice(0, 24);
  }

  function readIncomingDuel() {
    try {
      const params = new URLSearchParams(location.search);
      const game = params.get("reta");
      const score = Number(params.get("p"));

      if (!DUEL_GAMES[game] || !Number.isFinite(score) || score <= 0 || score > 1e7) {
        return null;
      }

      return { game, score, from: cleanName(params.get("de")) };
    } catch {
      return null;
    }
  }

  function scoreText(game, score) {
    const value = game === "stick-drill" ? Number(score).toFixed(1) : String(Math.round(score));
    return `${value} ${DUEL_GAMES[game].unit}`;
  }

  function renderDuel({ game, score }) {
    if (!DUEL_GAMES[game]) {
      return null;
    }

    const box = document.createElement("div");
    box.className = "game-duel";

    // Reto de un amigo para este juego
    if (incoming && incoming.game === game) {
      const who = incoming.from || "Tu amigo";
      const line = document.createElement("p");
      line.className = "game-duel-line";

      if (score === undefined) {
        line.textContent = `Reto de ${who}: supera ${scoreText(game, incoming.score)}`;
      } else if (score > incoming.score) {
        line.classList.add("is-won");
        line.textContent = `¡Reto superado! Has ganado a ${who}`;
      } else {
        line.textContent = `Te faltan ${scoreText(game, incoming.score - score)} para superar a ${who}`;
      }

      box.appendChild(line);
    }

    if (score > 0) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "game-duel-button";
      button.append(makeIcon("swords"), document.createTextNode(" Retar a un amigo"));
      button.addEventListener("click", () => shareDuel(game, score, button));
      box.appendChild(button);
    }

    return box.children.length ? box : null;
  }

  async function myName() {
    try {
      // currentUser y supabaseClient son «let» globales (js/core.js)
      if (typeof currentUser === "undefined" || !currentUser || !supabaseClient) {
        return "";
      }

      const { data } = await supabaseClient
        .from("profiles")
        .select("display_name")
        .eq("id", currentUser.id)
        .maybeSingle();

      return cleanName(data?.display_name);
    } catch {
      return "";
    }
  }

  async function shareDuel(game, score, button) {
    const info = DUEL_GAMES[game];
    const name = await myName();
    const url = new URL(location.origin + location.pathname);

    url.searchParams.set("reta", game);
    url.searchParams.set("p", game === "stick-drill" ? Number(score).toFixed(1) : String(Math.round(score)));

    if (name) {
      url.searchParams.set("de", name);
    }

    url.hash = "minijuegos";

    const text = `¡Te reto! Supera mis ${scoreText(game, score)} en ${info.title} ${info.emoji}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "Reto de TronkStudios", text, url: url.href });
        return;
      }
    } catch (error) {
      // Si se cancela el menú de compartir, no se hace nada más
      if (error && error.name === "AbortError") {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${text} ${url.href}`);
      const old = button.lastChild.textContent;
      button.lastChild.textContent = " ¡Enlace copiado! Pégalo a tu amigo";
      button.classList.add("is-done");
      setTimeout(() => {
        button.lastChild.textContent = old;
        button.classList.remove("is-done");
      }, 2600);
    } catch {
      window.prompt("Copia este enlace y mándaselo a tu amigo:", `${text} ${url.href}`);
    }
  }

  /* Aviso al entrar con un enlace de reto */
  function showIncomingDuel() {
    if (!incoming) {
      return;
    }

    const info = DUEL_GAMES[incoming.game];
    const card = document.createElement("div");
    card.className = "duel-invite";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "Reto de un amigo");

    const icon = document.createElement("span");
    icon.className = "duel-invite-icon";
    icon.appendChild(makeIcon("swords"));

    const text = document.createElement("div");
    text.className = "duel-invite-text";
    const title = document.createElement("strong");
    title.textContent = `${incoming.from || "Un amigo"} te reta en ${info.title}`;
    const sub = document.createElement("span");
    sub.textContent = `Supera sus ${scoreText(incoming.game, incoming.score)}`;
    text.append(title, sub);

    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "primary-button";
    accept.textContent = "Aceptar reto";
    accept.addEventListener("click", () => {
      card.remove();
      document.getElementById("minijuegos")?.scrollIntoView({ behavior: "smooth" });
      document.querySelector(`[data-minigame="${info.card}"]`)?.click();
    });

    const close = document.createElement("button");
    close.type = "button";
    close.className = "duel-invite-close";
    close.setAttribute("aria-label", "Cerrar");
    close.appendChild(makeIcon("close"));
    close.addEventListener("click", () => card.remove());

    card.append(icon, text, accept, close);
    document.body.appendChild(card);

    // Se quita el reto de la dirección (sigue activo hasta recargar)
    try {
      const clean = new URL(location.href);
      ["reta", "p", "de"].forEach((key) => clean.searchParams.delete(key));
      history.replaceState(history.state, "", clean.pathname + clean.search + clean.hash);
    } catch {
      // Sin history: no pasa nada
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showIncomingDuel);
  } else {
    showIncomingDuel();
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
