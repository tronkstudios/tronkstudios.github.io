"use strict";

/* TronkStudios · js/extras.js
   Detalles de la web:
   - Pantalla completa al jugar a los minijuegos en el móvil.
   - Atajos de teclado en el ordenador (pulsa «?» para verlos).
   - Sonidos de la interfaz (con botón para apagarlos).
   - Aviso al conseguir una insignia nueva.
   - «Trabaja con nosotros»: abre el formulario de soporte preparado.
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   SONIDOS DE LA INTERFAZ (Web Audio, sin archivos)
   ========================================================= */

const UI_SOUND_KEY = "tronk-ui-sounds";

const TronkUISound = (() => {
  let ctx = null;
  let enabled = true;

  try {
    enabled = localStorage.getItem(UI_SOUND_KEY) !== "off";
  } catch {
    enabled = true;
  }

  function ensure() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;

    if (!AudioCtx) {
      return null;
    }

    if (!ctx) {
      ctx = new AudioCtx();
    }

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    return ctx;
  }

  // Una nota corta y suave
  function note(freq, start, length, volume, type = "sine") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const time = ctx.currentTime + start;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);

    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + length + 0.02);
  }

  const SOUNDS = {
    click: () => note(880, 0, 0.06, 0.035, "triangle"),
    open: () => {
      note(660, 0, 0.08, 0.03, "triangle");
      note(990, 0.05, 0.1, 0.025, "triangle");
    },
    success: () => {
      note(784, 0, 0.12, 0.04);
      note(1175, 0.08, 0.18, 0.04);
    },
    badge: () => {
      [784, 988, 1175, 1568].forEach((freq, index) => note(freq, index * 0.09, 0.25, 0.045));
    }
  };

  function play(name) {
    if (!enabled || !SOUNDS[name] || !ensure()) {
      return;
    }

    try {
      SOUNDS[name]();
    } catch {
      // Si el navegador no deja sonar, no pasa nada
    }
  }

  function setEnabled(value) {
    enabled = value;

    try {
      localStorage.setItem(UI_SOUND_KEY, value ? "on" : "off");
    } catch {
      // Sin almacenamiento: dura hasta recargar
    }

    updateUISoundButton();
  }

  return {
    play,
    setEnabled,
    isEnabled: () => enabled
  };
})();

window.TronkUISound = TronkUISound;

function updateUISoundButton() {
  const button = document.getElementById("ui-sound-toggle");

  if (!button) {
    return;
  }

  const on = TronkUISound.isEnabled();
  button.replaceChildren(makeIcon(on ? "volume" : "volume-off"));
  button.setAttribute("aria-pressed", String(on));
  button.setAttribute("aria-label", on ? "Sonidos de la web: activados" : "Sonidos de la web: desactivados");
}

// Dentro de los minijuegos no: ya tienen sus propios sonidos
function isInsideGame(element) {
  return Boolean(element.closest(".antitronks-modal, #tf-root"));
}

function initializeUISounds() {
  const button = document.getElementById("ui-sound-toggle");

  button?.addEventListener("click", () => {
    const on = !TronkUISound.isEnabled();
    TronkUISound.setEnabled(on);

    if (on) {
      TronkUISound.play("success");
    }
  });

  updateUISoundButton();

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button, a, [role='button']");

    if (!target || target === button || isInsideGame(target) || target.disabled) {
      return;
    }

    const opensSomething =
      target.matches(".minigame-card, .project-card, [data-open-support], #account-button, #notifications-button") ||
      target.hasAttribute("aria-haspopup");

    TronkUISound.play(opensSomething ? "open" : "click");
  });
}

/* =========================================================
   AVISOS FLOTANTES E INSIGNIAS NUEVAS
   ========================================================= */

function showTronkToast(iconName, text) {
  let box = document.getElementById("toast-box");

  if (!box) {
    box = document.createElement("div");
    box.id = "toast-box";
    box.className = "toast-box";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    document.body.appendChild(box);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.append(makeIcon(iconName, "icon toast-icon"));

  const label = document.createElement("span");
  label.textContent = text;
  toast.appendChild(label);

  box.appendChild(toast);

  setTimeout(() => toast.classList.add("is-leaving"), 4200);
  setTimeout(() => toast.remove(), 4700);
}

window.showTronkToast = showTronkToast;

function badgesSeenKey() {
  return `tronk-badges:${currentUser?.id || ""}`;
}

let badgeCheckTimer = null;

/* Mira si tienes insignias nuevas. La primera vez solo las apunta,
   para no avisar de las que ya tenías. */
async function checkNewBadges() {
  if (!currentUser || !platformAvailable || typeof loadProfileData !== "function") {
    return;
  }

  const data = await loadProfileData(currentUser.id);

  if (!data) {
    return;
  }

  const earned = BADGES.filter((badge) => {
    try {
      return badge.test(data);
    } catch {
      return false;
    }
  }).map((badge) => badge.name);

  let seen = null;

  try {
    seen = JSON.parse(localStorage.getItem(badgesSeenKey()) || "null");
  } catch {
    seen = null;
  }

  if (Array.isArray(seen)) {
    const fresh = earned.filter((name) => !seen.includes(name));

    fresh.forEach((name, index) => {
      const badge = BADGES.find((item) => item.name === name);

      setTimeout(() => {
        TronkUISound.play("badge");
        showTronkToast(badge.icon, `¡Nueva insignia: ${name}!`);
      }, index * 900);
    });
  }

  try {
    localStorage.setItem(badgesSeenKey(), JSON.stringify(earned));
  } catch {
    // Sin almacenamiento no se avisa, pero la insignia sigue en el perfil
  }
}

/* Los módulos avisan con «tronk:activity» cuando haces algo
   que puede dar una insignia (votar, proponer, jugar...). */
function scheduleBadgeCheck() {
  clearTimeout(badgeCheckTimer);
  badgeCheckTimer = setTimeout(checkNewBadges, 1500);
}

window.addEventListener("tronk:activity", scheduleBadgeCheck);

/* =========================================================
   PANTALLA COMPLETA EN LOS MINIJUEGOS
   ========================================================= */

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function canFullscreen() {
  return Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
}

function enterFullscreen(element) {
  const request = element.requestFullscreen || element.webkitRequestFullscreen;

  if (!request) {
    return;
  }

  try {
    const result = request.call(element, { navigationUI: "hide" });
    result?.catch?.(() => {});
  } catch {
    // Algunos navegadores no lo permiten: se juega igual
  }
}

function exitFullscreen() {
  if (!fullscreenElement()) {
    return;
  }

  const exit = document.exitFullscreen || document.webkitExitFullscreen;

  try {
    exit?.call(document)?.catch?.(() => {});
  } catch {
    // Nada
  }
}

// En móviles y tablets se pone sola al abrir un minijuego
function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function updateFullscreenButtons() {
  const current = fullscreenElement();

  document.querySelectorAll(".game-fullscreen-toggle").forEach((button) => {
    const on = current === button.closest(".antitronks-modal");
    button.replaceChildren(makeIcon(on ? "shrink" : "expand"));
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Salir de pantalla completa" : "Pantalla completa");
  });

  document.body.classList.toggle("game-fullscreen", Boolean(current));
}

function initializeGameFullscreen() {
  const modals = document.querySelectorAll(".antitronks-modal");

  modals.forEach((modal) => {
    // Al hacer clic y arrastrar en un juego, el navegador no debe arrastrar
    // la imagen ni seleccionar texto (pasaba en Safari y Firefox)
    ["dragstart", "selectstart"].forEach((name) => {
      modal.addEventListener(name, (event) => event.preventDefault());
    });

    const header = modal.querySelector(".antitronks-header");
    const close = header?.querySelector(".antitronks-close");

    if (canFullscreen() && header && close) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "antitronks-sound game-fullscreen-toggle";
      button.addEventListener("click", () => {
        if (fullscreenElement() === modal) {
          exitFullscreen();
        } else {
          enterFullscreen(modal);
        }
      });
      header.insertBefore(button, close);
    }

    // Al abrirse (se quita «hidden») en móvil, pantalla completa;
    // al cerrarse, se sale.
    let wasOpen = !modal.classList.contains("hidden");

    new MutationObserver(() => {
      const open = !modal.classList.contains("hidden");

      if (open === wasOpen) {
        return;
      }

      wasOpen = open;

      if (open) {
        document.body.classList.add("game-focus");

        if (isTouchDevice() && canFullscreen()) {
          enterFullscreen(modal);
        }
      } else {
        document.body.classList.remove("game-focus");

        if (fullscreenElement() === modal) {
          exitFullscreen();
        }
      }
    }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  });

  document.addEventListener("fullscreenchange", updateFullscreenButtons);
  document.addEventListener("webkitfullscreenchange", updateFullscreenButtons);
  updateFullscreenButtons();
}

/* =========================================================
   ATAJOS DE TECLADO
   ========================================================= */

const SHORTCUTS = [
  { key: "d", label: "En desarrollo", target: "#desarrollo" },
  { key: "j", label: "Nuestros juegos", target: "#juegos" },
  { key: "r", label: "Roblox", target: "#roblox" },
  { key: "m", label: "Minijuegos", target: "#minijuegos" },
  { key: "s", label: "Sugerencias y comunidad", target: "#sugerencias" },
  { key: "n", label: "Novedades", target: "#novedades" },
  { key: "a", label: "Sobre nosotros", target: "#sobre-nosotros" },
  { key: "i", label: "Volver al inicio", action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
  { key: "c", label: "Cuenta", action: () => document.getElementById("account-button")?.click() },
  { key: "t", label: "Cambiar tema claro / oscuro", action: () => document.getElementById("theme-toggle")?.click() },
  { key: "?", label: "Ver estos atajos", action: () => openShortcuts() }
];

function isTyping(element) {
  return Boolean(
    element &&
      (element.isContentEditable ||
        /^(input|textarea|select)$/i.test(element.tagName))
  );
}

// Con una ventana o un minijuego abierto, los atajos no hacen nada
function somethingOpen() {
  return Boolean(
    document.querySelector(
      ".modal:not(.hidden), .antitronks-modal:not(.hidden), .site-menu.is-open"
    )
  );
}

function goToSection(selector) {
  const section = document.querySelector(selector);

  if (!section) {
    return;
  }

  section.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", selector);
}

function openShortcuts() {
  const modal = document.getElementById("shortcuts-modal");
  const list = document.getElementById("shortcuts-list");

  if (!modal || !list) {
    return;
  }

  list.replaceChildren(
    ...SHORTCUTS.map((shortcut) => {
      const item = document.createElement("li");
      const key = document.createElement("kbd");
      key.textContent = shortcut.key.toUpperCase();
      const label = document.createElement("span");
      label.textContent = shortcut.label;
      item.append(key, label);
      return item;
    })
  );

  openModal(modal);
  modal.querySelector(".modal-close")?.focus();
}

function initializeShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const modal = document.getElementById("shortcuts-modal");

      if (modal && !modal.classList.contains("hidden")) {
        closeModal(modal);
      }

      return;
    }

    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat ||
      isTyping(event.target) ||
      somethingOpen()
    ) {
      return;
    }

    const shortcut = SHORTCUTS.find((item) => item.key === event.key.toLowerCase());

    if (!shortcut) {
      return;
    }

    event.preventDefault();

    if (shortcut.target) {
      goToSection(shortcut.target);
    } else {
      shortcut.action();
    }
  });

  // Aviso pequeño en el pie, solo en ordenador
  if (window.matchMedia("(pointer: fine)").matches) {
    const footer = document.querySelector(".footer-actions");

    if (footer) {
      const hint = document.createElement("button");
      hint.type = "button";
      hint.className = "shortcuts-hint";
      setIconText(hint, "keyboard", "Atajos de teclado (?)");
      hint.addEventListener("click", openShortcuts);
      footer.prepend(hint);
    }
  }
}

/* =========================================================
   TRABAJA CON NOSOTROS
   ========================================================= */

function initializeJoin() {
  document.querySelectorAll("[data-join-role]").forEach((button) => {
    button.addEventListener("click", () => {
      if (typeof window.openJoinMail === "function") {
        window.openJoinMail(button.dataset.joinRole);
      }
    });
  });
}

/* =========================================================
   FONDOS ANIMADOS: solo se mueven cuando la sección se ve
   ========================================================= */

function initializeSectionBackgrounds() {
  const sections = document.querySelectorAll("main .section[id]");

  sections.forEach((section) => {
    section.classList.add("has-anim-bg");
  });

  if (!("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("bg-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("bg-visible", entry.isIntersecting);
    });
  }, { rootMargin: "100px" });

  sections.forEach((section) => observer.observe(section));
}

/* =========================================================
   ARRANQUE
   ========================================================= */

function initializeExtras() {
  initializeUISounds();
  initializeGameFullscreen();
  initializeShortcuts();
  initializeJoin();
  initializeSectionBackgrounds();
}
