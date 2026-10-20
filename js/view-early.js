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
