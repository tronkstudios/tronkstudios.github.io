"use strict";

/* TronkStudios · js/view-early.js
   Se carga en el <head> (sin defer) para que no parpadee nada:
   - ?vista=galeria → la web enseña solo la Galería de fans (su propia
     página, que el menú abre en una pestaña nueva).
   - Los enlaces antiguos a #galeria (avisos, notificaciones push...)
     llevan a esa página. */

/* En inglés, el diccionario (js/i18n-en.js) se empieza a bajar ya y la
   página espera oculta a estar traducida, para no verla un momento en
   español. Mismo criterio de idioma que js/i18n.js. */
(() => {
  let lang = "";

  try {
    lang = localStorage.getItem("tronk-lang") || "";
  } catch {
    // Sin localStorage se usa el idioma del navegador
  }

  if (lang !== "es" && lang !== "en") {
    lang = (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
  }

  if (lang === "en") {
    const root = document.documentElement;
    root.classList.add("i18n-wait");
    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "script";
    preload.href = "js/i18n-en.js?v=1";
    document.head.appendChild(preload);
    // Por si algo falla, la página nunca se queda oculta
    setTimeout(() => root.classList.remove("i18n-wait"), 4000);
  }
})();

(() => {
  const params = new URLSearchParams(location.search);

  if (params.get("vista") === "galeria") {
    document.documentElement.classList.add("view-gallery");
    return;
  }

  const toGallery = () => {
    if (location.hash === "#galeria") {
      location.replace(`${location.pathname}?vista=galeria`);
    }
  };

  toGallery();
  window.addEventListener("hashchange", toGallery);
})();

/* Desde el navegador, los enlaces a la galería se abren en una PESTAÑA del
   navegador (aunque la web esté instalada como app); desde la app, dentro
   de la app. Chrome mete en la app los enlaces y las
   ventanas nuevas que van a la web, así que primero se abre una pestaña
   vacía y luego se lleva a la galería: como ya es una pestaña del
   navegador, se queda en el navegador. */
// ¿Estamos dentro de la app instalada (no en una pestaña del navegador)?
function isInstalledApp() {
  return (
    ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"].some(
      (mode) => window.matchMedia(`(display-mode: ${mode})`).matches
    ) || navigator.standalone === true
  );
}

function openGalleryTab(href) {
  const url = new URL(href || "?vista=galeria", location.href).href;

  // Desde la app: la galería se abre dentro de la propia app
  if (isInstalledApp()) {
    location.href = url;
    return;
  }

  // Desde el navegador: siempre en una pestaña nueva del navegador
  const tab = window.open("about:blank", "_blank");

  if (!tab) {
    // Ventanas emergentes bloqueadas: se abre aquí mismo
    location.href = url;
    return;
  }

  // Se mantiene la relación con esta pestaña (es nuestra propia web): así
  // la galería puede cerrarse al pulsar «Volver» y devolverte aquí.
  tab.location.replace(url);
}

window.openGalleryTab = openGalleryTab;

document.addEventListener(
  "click",
  (event) => {
    const link = event.target.closest?.('a[href="?vista=galeria"]');

    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    event.preventDefault();
    openGalleryTab(link.getAttribute("href"));
  },
  true
);

/* «← Volver a TronkStudios» en la página de la galería:
   - en el navegador, cierra la pestaña de la galería (se vuelve a la web
     que la abrió); si el navegador no deja cerrarla, va a la portada;
   - en la app, vuelve a la portada dentro de la app. */
document.addEventListener(
  "click",
  (event) => {
    const back = event.target.closest?.(".nav-back");

    if (!back || !document.documentElement.classList.contains("view-gallery") || isInstalledApp()) {
      return;
    }

    event.preventDefault();

    // Se pone delante la pestaña de la que vienes y se cierra esta
    let opener = null;

    try {
      opener = window.opener && !window.opener.closed && window.opener.location.origin === location.origin ? window.opener : null;
    } catch {
      opener = null;
    }

    if (opener) {
      try {
        opener.focus();
      } catch {
        // Nada
      }
    }

    window.close();

    // Si el navegador no deja cerrarla (se entró escribiendo la dirección,
    // desde un aviso...), se va a la portada en esta misma pestaña
    setTimeout(() => {
      if (!window.closed) {
        location.href = back.href;
      }
    }, 400);
  },
  true
);
