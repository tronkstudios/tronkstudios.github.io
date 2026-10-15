"use strict";

/* TronkStudios · js/journey.js
   «Cómo lo hicimos»: línea temporal que se va mostrando paso a paso
   al pulsar la flecha. Sin JavaScript se ven todos los pasos.
   Se carga como script clásico (ver docs/adr/0002). */

function initializeJourney() {
  const list = document.getElementById("journey");
  const controls = document.querySelector(".journey-controls");
  const prev = document.getElementById("journey-prev");
  const next = document.getElementById("journey-next");
  const progress = document.getElementById("journey-progress");

  if (!list || !controls || !prev || !next) {
    return;
  }

  const steps = Array.from(list.querySelectorAll(".journey-step"));
  const reduceMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Pasos que se ven ahora mismo (empieza con el primero)
  let shown = 1;

  function render(revealed) {
    steps.forEach((step, index) => {
      step.hidden = index >= shown;
      step.classList.toggle("is-current", index === shown - 1);
    });

    const atEnd = shown === steps.length;

    prev.disabled = shown === 1;
    progress.textContent = `${shown} / ${steps.length}`;
    next.querySelector("span").textContent = atEnd ? "Volver a empezar" : "Siguiente";
    next.querySelector("use")?.setAttribute("href", atEnd ? "#i-refresh" : "#i-arrow-right");
    next.setAttribute(
      "aria-label",
      atEnd ? "Volver al primer paso" : "Ver el siguiente paso"
    );

    // El paso nuevo aparece con una animación y se lleva a la vista
    if (revealed) {
      revealed.classList.remove("is-new");
      void revealed.offsetWidth;
      revealed.classList.add("is-new");
      revealed.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "nearest"
      });
    }
  }

  next.addEventListener("click", () => {
    if (shown === steps.length) {
      shown = 1;
      render();
      list.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
      return;
    }

    shown += 1;
    render(steps[shown - 1]);
  });

  prev.addEventListener("click", () => {
    if (shown > 1) {
      shown -= 1;
      render();
    }
  });

  controls.hidden = false;
  list.classList.add("is-interactive");
  render();
}
