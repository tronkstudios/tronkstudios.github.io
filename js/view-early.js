"use strict";

/* TronkStudios · js/view-early.js
   Se carga en el <head> (sin defer) para que no parpadee nada:
   - ?vista=galeria → la web enseña solo la Galería de fans (su propia
     página, que el menú abre en una pestaña nueva).
   - Los enlaces antiguos a #galeria (avisos, notificaciones push...)
     llevan a esa página. */

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

/* Los enlaces a la galería se abren en una PESTAÑA del navegador, también
   con la web instalada como app. Chrome mete en la app los enlaces y las
   ventanas nuevas que van a la web, así que primero se abre una pestaña
   vacía y luego se lleva a la galería: como ya es una pestaña del
   navegador, se queda en el navegador. */
function openGalleryTab(href) {
  const url = new URL(href || "?vista=galeria", location.href).href;
  const tab = window.open("about:blank", "_blank");

  if (!tab) {
    // Ventanas emergentes bloqueadas: se abre aquí mismo
    location.href = url;
    return;
  }

  try {
    tab.opener = null;
  } catch {
    // Nada
  }

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
