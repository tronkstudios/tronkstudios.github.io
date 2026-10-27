"use strict";

/* TronkStudios · js/games/loader.js
   Los minijuegos se cargan al abrirlos, no con la página.

   Cada juego son ~50-130 KB de JavaScript, su ventana (partials/<juego>.html)
   y sus estilos. Antes iba todo en la portada aunque nadie jugara; ahora,
   la primera vez que se pulsa una tarjeta [data-minigame]:
   1. se descargan la ventana, los estilos y el código del juego,
   2. se mete la ventana en la página y se arranca el juego,
   3. se repite el clic, que ya lo recibe el propio juego.
   Al pasar el ratón por encima de la tarjeta ya se empieza a descargar,
   así casi siempre se abre al instante.

   Cuando se añade una ventana se avisa con el evento «tronk:game-added»
   (lo escuchan js/extras.js y js/mascot.js).
   Se carga como script clásico (ver docs/adr/0002). */

const TronkGames = (() => {
  const COMMON = {
    css: ["css/minijuegos.css?v=1"],
    scripts: ["js/games/audio.js?v=24"]
  };

  // data-minigame → ventana, código y función que arranca el juego
  const GAMES = {
    antitronks: { html: "partials/antitronks.html?v=1", scripts: ["js/games/antitronks.js?v=27"], init: "initializeAntitronksGame" },
    antininja: { html: "partials/protect-mogos.html?v=1", scripts: ["js/games/protect-mogos.js?v=27"], init: "initializeAntininjaGame" },
    miente: { html: "partials/miente.html?v=1", scripts: ["js/games/miente.js?v=3"], init: "initializeMienteGame" },
    stickdrill: { html: "partials/stick-drill.html?v=1", scripts: ["js/games/stick-drill.js?v=28"], init: "initializeStickDrillGame" },
    // Tronk Fight se arranca solo al cargarse
    tronkfight: { html: "partials/tronk-fight.html?v=1", css: ["css/tronk-fight.css?v=4"], scripts: ["js/games/tronk-fight.js?v=11"] }
  };

  const files = {};
  const games = {};
  const ready = {};

  // Cada archivo se pide una sola vez, aunque lo usen varios juegos
  function once(url, make) {
    if (!files[url]) {
      files[url] = make().catch((error) => {
        delete files[url];
        throw error;
      });
    }

    return files[url];
  }

  function script(src) {
    return once(src, () => new Promise((resolve, reject) => {
      const element = document.createElement("script");
      element.src = src;
      element.onload = resolve;
      element.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
      document.head.appendChild(element);
    }));
  }

  function style(href) {
    return once(href, () => new Promise((resolve, reject) => {
      const element = document.createElement("link");
      element.rel = "stylesheet";
      element.href = href;
      element.onload = resolve;
      element.onerror = () => reject(new Error(`No se pudo cargar ${href}`));
      document.head.appendChild(element);
    }));
  }

  function partial(url) {
    return once(url, () => fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar ${url}`);
      }

      return response.text();
    }));
  }

  function load(key) {
    const game = GAMES[key];

    if (!game) {
      return Promise.reject(new Error(`No existe el minijuego ${key}`));
    }

    if (!games[key]) {
      games[key] = (async () => {
        const css = [...COMMON.css, ...(game.css || [])].map(style);
        const html = await partial(game.html);
        await Promise.all(css);

        // La ventana va al final de la página, como estaba en index.html
        const host = document.createElement("div");
        host.className = "game-host";
        host.dataset.game = key;
        const template = document.createElement("template");
        template.innerHTML = html;
        host.appendChild(template.content);
        document.body.insertBefore(host, document.getElementById("mascot"));

        // En orden: el sonido primero y luego el juego
        for (const src of [...COMMON.scripts, ...game.scripts]) {
          await script(src);
        }

        if (game.init) {
          window[game.init]();
        }

        // Los botones de silenciar nuevos con el estado de siempre
        window.TronkSound?.setMuted(window.TronkSound.isMuted());
        ready[key] = true;
        document.dispatchEvent(new CustomEvent("tronk:game-added", { detail: { key, root: host } }));
      })().catch((error) => {
        delete games[key];
        throw error;
      });
    }

    return games[key];
  }

  // Clic (o Intro / espacio) en una tarjeta cuyo juego aún no está cargado
  function intercept(event) {
    const card = event.target.closest?.("[data-minigame]");
    const key = card?.dataset.minigame;

    if (!key || !GAMES[key] || ready[key]) {
      return;
    }

    if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (card.getAttribute("aria-busy") === "true") {
      return;
    }

    card.setAttribute("aria-busy", "true");
    card.classList.add("is-loading-game");

    load(key)
      .then(() => card.click())
      .catch((error) => {
        console.error("TronkStudios:", error);
        const message = "No se pudo abrir el minijuego. Revisa la conexión e inténtalo de nuevo.";
        window.alert(typeof t === "function" ? t(message) : message);
      })
      .finally(() => {
        card.removeAttribute("aria-busy");
        card.classList.remove("is-loading-game");
      });
  }

  document.addEventListener("click", intercept, true);
  document.addEventListener("keydown", intercept, true);

  // Al acercarse a la tarjeta se va descargando
  const warm = (event) => {
    const key = event.target.closest?.("[data-minigame]")?.dataset.minigame;

    if (key && GAMES[key]) {
      load(key).catch(() => {});
    }
  };

  document.addEventListener("pointerover", warm, { passive: true });
  document.addEventListener("focusin", warm);

  return { load, isReady: (key) => Boolean(ready[key]) };
})();

window.TronkGames = TronkGames;
