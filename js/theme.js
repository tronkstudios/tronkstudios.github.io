"use strict";

/* TronkStudios · js/theme.js
   Modo claro / oscuro con preferencia guardada.
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   TEMA
   ========================================================= */

function getSavedTheme() {
  try {
    return localStorage.getItem(
      "tronkstudios-theme"
    );
  } catch {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(
      "tronkstudios-theme",
      theme
    );
  } catch {
    // LocalStorage no disponible.
  }
}

function updateThemeButton(theme) {
  if (!themeToggle) {
    return;
  }

  const icon =
    themeToggle.querySelector(".theme-icon");

  const label =
    themeToggle.querySelector(".theme-label");

  if (theme === "dark") {
    if (icon) {
      icon.textContent = "☀️";
    }

    if (label) {
      label.textContent = "Claro";
    }

    themeToggle.setAttribute(
      "aria-pressed",
      "true"
    );

    themeToggle.setAttribute(
      "aria-label",
      "Cambiar a modo claro"
    );
  } else {
    if (icon) {
      icon.textContent = "🌙";
    }

    if (label) {
      label.textContent = "Oscuro";
    }

    themeToggle.setAttribute(
      "aria-pressed",
      "false"
    );

    themeToggle.setAttribute(
      "aria-label",
      "Cambiar a modo oscuro"
    );
  }
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute(
      "data-theme",
      "dark"
    );
  } else {
    document.documentElement.setAttribute(
      "data-theme",
      "light"
    );
  }

  updateThemeButton(theme);
}

function initializeTheme() {
  const savedTheme =
    getSavedTheme();

  if (
    savedTheme === "dark" ||
    savedTheme === "light"
  ) {
    applyTheme(savedTheme);
    return;
  }

  const prefersDark =
    window.matchMedia &&
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

  applyTheme(
    prefersDark ? "dark" : "light"
  );
}

if (themeToggle) {
  themeToggle.addEventListener(
    "click",
    () => {
      const currentTheme =
        document.documentElement.getAttribute(
          "data-theme"
        ) || "light";

      const newTheme =
        currentTheme === "dark"
          ? "light"
          : "dark";

      applyTheme(newTheme);
      saveTheme(newTheme);
    }
  );
}

initializeTheme();
