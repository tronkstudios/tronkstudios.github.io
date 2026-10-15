"use strict";

/* TronkStudios · js/pwa.js
   Web instalable (PWA): registra el service worker (sw.js), enseña el
   botón «Instalar app» cuando el navegador lo permite y avisa si no
   hay conexión. Se carga como script clásico (ver docs/adr/0002). */

function initializePwa() {
  // El service worker solo funciona con https (o en local)
  if (
    "serviceWorker" in navigator &&
    (location.protocol === "https:" || location.hostname === "localhost")
  ) {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.warn("TronkStudios: no se pudo activar el modo sin conexión.", error);
    });
  }

  /* ---------- Botón «Instalar app» ---------- */

  const installButton = document.getElementById("install-button");
  let installPrompt = null;

  // Chrome, Edge y Android avisan de que la web se puede instalar
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;

    if (installButton) {
      installButton.hidden = false;
    }
  });

  installButton?.addEventListener("click", async () => {
    if (!installPrompt) {
      return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    if (installButton) {
      installButton.hidden = true;
    }
  });

  /* ---------- Aviso sin conexión ---------- */

  const offline = document.getElementById("offline-notice");

  function updateConnection() {
    if (offline) {
      offline.hidden = navigator.onLine;
    }
  }

  window.addEventListener("online", updateConnection);
  window.addEventListener("offline", updateConnection);
  updateConnection();
}
