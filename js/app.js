"use strict";

/* TronkStudios · js/app.js
   Arranque de la web, menú móvil y navegación.
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   VUELTA DESDE EL CORREO DE VERIFICACIÓN
   ========================================================= */

/*
 * Cuando alguien pulsa el enlace del correo, Supabase le trae de
 * vuelta a la web con datos en la dirección (#access_token=...&type=signup
 * o ?error_description=...). Aquí mostramos un mensaje bonito y
 * limpiamos la dirección.
 */
function handleAuthRedirect() {
  const hash = new URLSearchParams(
    window.location.hash.replace(/^#/, "")
  );

  const query = new URLSearchParams(
    window.location.search
  );

  const type =
    hash.get("type") || query.get("type");

  const error =
    hash.get("error_description") ||
    query.get("error_description");

  const hasCode =
    query.has("code") || hash.has("access_token");

  if (!type && !error && !hasCode) {
    return;
  }

  // Esperamos un poco para que Supabase lea los datos de la dirección.
  setTimeout(async () => {
    await updateAccountUI();

    openModal(accountModal);

    if (error) {
      showAuthMessage(
        `No se pudo verificar la cuenta: ${error.replace(/\+/g, " ")}. Si el enlace ha caducado, vuelve a registrarte o inicia sesión.`,
        "error"
      );
    } else {
      showAuthMessage(
        "¡Cuenta verificada! Ya puedes participar en la comunidad.",
        "success"
      );
    }

    window.history.replaceState(
      null,
      "",
      window.location.origin +
        window.location.pathname
    );
  }, 1200);
}

/* =========================================================
   ESCAPE PARA MODALES GENERALES
   ========================================================= */

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key !==
      "Escape"
    ) {
      return;
    }

    if (
      accountModal &&
      !accountModal.classList.contains(
        "hidden"
      )
    ) {
      closeModal(
        accountModal
      );
    }

    if (
      suggestionModal &&
      !suggestionModal.classList.contains(
        "hidden"
      )
    ) {
      closeModal(
        suggestionModal
      );
    }

    const projectModal =
      document.getElementById("project-modal");

    if (
      projectModal &&
      !projectModal.classList.contains("hidden")
    ) {
      closeModal(projectModal);
    }
  }
);

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

initializeProjects();

initializeCardImageFallbacks();

loadSuggestions();

updateAccountUI();

handleAuthRedirect();

initializeAntitronksGame();

initializeAntininjaGame();

initializeStickDrillGame();

console.log(
  "TronkStudios: inicialización completada."
);
/* =========================================================
   MENÚ DESPLEGABLE EN MÓVIL (botón ☰)
   ========================================================= */

const siteMenu =
  document.getElementById("site-menu");

const menuToggle =
  document.getElementById("menu-toggle");

const mobileMenuQuery =
  window.matchMedia("(max-width: 700px)");

function setSiteMenu(open) {
  if (!siteMenu || !menuToggle) {
    return;
  }

  siteMenu.classList.toggle("is-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute(
    "aria-label",
    open ? "Cerrar menú" : "Abrir menú"
  );
}

function closeSiteMenu() {
  setSiteMenu(false);
}

if (siteMenu && menuToggle) {
  menuToggle.addEventListener("click", () => {
    setSiteMenu(!siteMenu.classList.contains("is-open"));
  });

  // Al abrir Soporte o Cuenta, el menú se cierra
  siteMenu
    .querySelectorAll("#support-button, #account-button")
    .forEach((button) => {
      button.addEventListener("click", closeSiteMenu);
    });

  // Tocar fuera del menú lo cierra
  document.addEventListener("click", (event) => {
    if (
      siteMenu.classList.contains("is-open") &&
      !siteMenu.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      closeSiteMenu();
    }
  });

  // Escape lo cierra y devuelve el foco al botón
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      siteMenu.classList.contains("is-open")
    ) {
      closeSiteMenu();
      menuToggle.focus();
    }
  });

  // Al pasar a pantalla grande, se cierra
  mobileMenuQuery.addEventListener("change", (event) => {
    if (!event.matches) {
      closeSiteMenu();
    }
  });
}

// Pulsar el logo vuelve arriba del todo
document.querySelector(".brand-link")?.addEventListener("click", (event) => {
  event.preventDefault();
  closeSiteMenu();

  if (history.replaceState) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
  });
});

/* =========================================================
   BARRA DE NAVEGACIÓN: ir a la sección, centrarla
   y marcarla con destellos
   ========================================================= */

(function initializeSectionNavigation() {
  const header =
    document.querySelector(".site-header");

  const navLinks =
    document.querySelectorAll('.main-nav a[href^="#"]');

  if (!navLinks.length) {
    return;
  }

  const reduceMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Duración del destello si nadie se desplaza (ms)
  const HIGHLIGHT_DURATION = 2600;
  const SPARKLE_EVERY = 170;

  // Estado del destello activo
  let active = null;

  // Estado del desplazamiento automático en curso
  let pendingScroll = null;

  function headerHeight() {
    return header
      ? header.getBoundingClientRect().height
      : 0;
  }

  // Lo que se marca: el contenido de la sección (título + contenido)
  function targetBox(section) {
    return (
      section.querySelector(":scope > .container") ||
      section
    );
  }

  // Posición para que la sección quede centrada en la parte visible
  // (debajo de la barra). Si es más alta que la pantalla, se alinea
  // su parte de arriba justo debajo de la barra.
  function scrollPositionFor(box) {
    const top = headerHeight();
    const visible = window.innerHeight - top;
    const rect = box.getBoundingClientRect();
    const boxTop = rect.top + window.scrollY;
    const margin = 24;

    let target;

    if (rect.height + margin * 2 <= visible) {
      target = boxTop - top - (visible - rect.height) / 2;
    } else {
      target = boxTop - top - margin;
    }

    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;

    return Math.max(0, Math.min(target, maxScroll));
  }

  /* ---------- Destellos ---------- */

  function addSparkle(state) {
    const width = state.box.offsetWidth;
    const height = state.box.offsetHeight;
    const sparkle = document.createElement("span");
    const size = 14 + Math.random() * 14;

    // Posición aleatoria sobre el borde del recuadro
    const perimeter = 2 * (width + height);
    let point = Math.random() * perimeter;
    let x;
    let y;

    if (point < width) {
      x = point;
      y = 0;
    } else if ((point -= width) < height) {
      x = width;
      y = point;
    } else if ((point -= height) < width) {
      x = width - point;
      y = height;
    } else {
      point -= width;
      x = 0;
      y = height - point;
    }

    sparkle.className = "nav-sparkle";
    sparkle.style.width = `${size}px`;
    sparkle.style.height = `${size}px`;
    sparkle.style.left = `${x - size / 2}px`;
    sparkle.style.top = `${y - size / 2}px`;
    sparkle.style.animationDelay = `${Math.random() * 80}ms`;

    sparkle.addEventListener("animationend", () => sparkle.remove());

    state.layer.appendChild(sparkle);
  }

  function startHighlight(box) {
    endHighlight(true);

    const layer = document.createElement("div");
    layer.className = "nav-highlight";
    layer.setAttribute("aria-hidden", "true");

    box.classList.add("nav-highlight-host");
    box.appendChild(layer);

    const state = {
      box,
      layer,
      startScrollY: window.scrollY,
      sparkleTimer: null,
      endTimer: null
    };

    active = state;

    // Aparece el brillo del borde
    requestAnimationFrame(() => layer.classList.add("is-on"));

    if (!reduceMotion) {
      for (let i = 0; i < 6; i += 1) {
        addSparkle(state);
      }

      state.sparkleTimer = setInterval(
        () => addSparkle(state),
        SPARKLE_EVERY
      );
    }

    state.endTimer = setTimeout(
      () => endHighlight(false),
      HIGHLIGHT_DURATION
    );
  }

  // quick = true: se quita enseguida (al pulsar otra sección)
  // quick = false: se desvanece suavemente
  function endHighlight(quick) {
    const state = active;

    if (!state) {
      return;
    }

    active = null;

    // Dejan de aparecer destellos nuevos al momento
    clearInterval(state.sparkleTimer);
    clearTimeout(state.endTimer);

    const cleanUp = () => {
      state.layer.remove();

      if (!state.box.querySelector(".nav-highlight")) {
        state.box.classList.remove("nav-highlight-host");
      }
    };

    if (quick) {
      cleanUp();
      return;
    }

    // Lo que ya está brillando se desvanece
    state.layer.classList.remove("is-on");
    state.layer.classList.add("is-fading");
    setTimeout(cleanUp, 600);
  }

  // Si la persona se desplaza mientras hay destello, se desvanece
  window.addEventListener(
    "scroll",
    () => {
      if (
        active &&
        !pendingScroll &&
        Math.abs(window.scrollY - active.startScrollY) > 4
      ) {
        endHighlight(false);
      }
    },
    { passive: true }
  );

  /* ---------- Desplazamiento ---------- */

  function cancelPendingScroll() {
    if (!pendingScroll) {
      return;
    }

    clearInterval(pendingScroll.watch);
    pendingScroll = null;
  }

  // Si la persona mueve la página ella misma durante el
  // desplazamiento automático, no se muestra el destello
  ["wheel", "touchstart", "keydown"].forEach((type) => {
    window.addEventListener(
      type,
      (event) => {
        if (type === "keydown" && event.key === "Tab") {
          return;
        }

        cancelPendingScroll();
      },
      { passive: true }
    );
  });

  function goToSection(section) {
    const box = targetBox(section);
    const target = scrollPositionFor(box);

    cancelPendingScroll();
    endHighlight(true);

    window.scrollTo({
      top: target,
      behavior: reduceMotion ? "auto" : "smooth"
    });

    // Espera a que termine el desplazamiento para encender el destello
    let lastY = -1;
    let stillFor = 0;
    const startedAt = Date.now();

    pendingScroll = {
      watch: setInterval(() => {
        const y = window.scrollY;

        if (Math.abs(y - lastY) < 1) {
          stillFor += 50;
        } else {
          stillFor = 0;
          lastY = y;
        }

        const arrived = Math.abs(y - target) < 3;
        const settled = stillFor >= 150;
        const tooLong = Date.now() - startedAt > 2500;

        if ((arrived && stillFor >= 50) || settled || tooLong) {
          cancelPendingScroll();
          startHighlight(box);
        }
      }, 50)
    };

    // Accesibilidad: el foco pasa al título de la sección
    const heading = section.querySelector("h2");

    if (heading) {
      if (!heading.hasAttribute("tabindex")) {
        heading.setAttribute("tabindex", "-1");
      }

      heading.focus({ preventScroll: true });
    }
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href").slice(1);
      const section = id && document.getElementById(id);

      if (!section) {
        return;
      }

      event.preventDefault();

      // En móvil se cierra el menú antes de calcular la posición,
      // porque al cerrarse la barra de arriba se hace más pequeña
      closeSiteMenu();

      if (history.replaceState) {
        history.replaceState(null, "", `#${id}`);
      }

      goToSection(section);
    });
  });
})();
