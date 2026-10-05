"use strict";

/* TronkStudios · js/projects.js
   Tarjetas de proyectos y sus imágenes.
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   PROYECTOS
   ========================================================= */

/*
 * Datos de los juegos en desarrollo. Para añadir otro juego:
 * copia el bloque de "z-tronks", cambia los datos y pon
 * data-project="su-id" en su tarjeta del index.html.
 */
const PROJECTS = {
  "z-tronks": {
    title: "Z Tronks",
    image: "img/juegos/z-tronks.png",
    category: "Roblox",
    people: 5,
    // Año, mes (1-12), día
    release: [2027, 1, 4],
    description: [
      "Z Tronks es un juego de acción y supervivencia ambientado en un mundo devastado por un apocalipsis zombi. Los jugadores deberán explorar una ciudad abandonada, enfrentarse a diferentes tipos de zombis, completar misiones y conseguir experiencia y recursos para mejorar a su personaje.",
      "Cada jugador podrá elegir entre distintas clases, como Gunner, Warrior, Rogue y Medic, cada una con sus propias armas, habilidades y estilos de combate. A medida que avances, podrás desbloquear nuevas habilidades, conseguir mejor equipamiento y enfrentarte a enemigos cada vez más peligrosos.",
      "Forma un equipo con tus amigos, sobrevive al apocalipsis y conviértete en uno de los supervivientes más poderosos de Z Tronks."
    ]
  }
};

function formatReleaseDate([year, month, day]) {
  return new Date(year, month - 1, day).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function daysUntil([year, month, day]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(year, month - 1, day);
  return Math.round((target - today) / 86400000);
}

function openProjectModal(id) {
  const project = PROJECTS[id];
  const modal = document.getElementById("project-modal");

  if (!project || !modal) {
    return;
  }

  const days = daysUntil(project.release);

  let countdown;

  if (days > 1) {
    countdown = `¡Faltan ${days} días!`;
  } else if (days === 1) {
    countdown = "¡Sale mañana!";
  } else if (days === 0) {
    countdown = "¡Sale hoy!";
  } else {
    countdown = "¡Ya disponible!";
  }

  const image = modal.querySelector("#project-modal-image");

  if (image) {
    image.src = project.image;
    image.alt = project.title;
  }

  modal.querySelector("#project-modal-title").textContent = project.title;
  modal.querySelector("#project-modal-category").textContent = project.category;
  modal.querySelector("#project-modal-people").textContent =
    `${project.people} ${project.people === 1 ? "persona" : "personas"}`;
  modal.querySelector("#project-modal-release").textContent =
    formatReleaseDate(project.release);
  modal.querySelector("#project-modal-countdown").textContent = countdown;

  const description = modal.querySelector("#project-modal-description");
  description.innerHTML = "";

  project.description.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    description.appendChild(p);
  });

  openModal(modal);
}

function initializeProjects() {
  document
    .querySelectorAll(".dev-card[data-project]")
    .forEach((card) => {
      const id = card.dataset.project;

      card.addEventListener("click", () => openProjectModal(id));

      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProjectModal(id);
        }
      });
    });
}

function escapeHtml(
  value
) {
  const div =
    document.createElement(
      "div"
    );

  div.textContent = value;

  return div.innerHTML;
}

/* =========================================================
   IMÁGENES DE TARJETAS
   ========================================================= */

/*
 * Si una imagen de tarjeta (por ejemplo antitronks.png) no
 * carga -ruta equivocada, mayúsculas/minúsculas distintas al
 * repositorio, archivo no subido, etc.- esto evita que quede
 * un hueco roto y avisa en la consola con la ruta exacta que
 * ha fallado, para poder depurarlo fácilmente.
 */

function initializeCardImageFallbacks() {
  document
    .querySelectorAll(".dev-card-media img")
    .forEach((img) => {
      img.addEventListener(
        "error",
        () => {
          console.error(
            `TronkStudios: no se ha podido cargar la imagen "${img.getAttribute(
              "src"
            )}". Comprueba que el archivo existe en el repositorio, que el nombre coincide EXACTAMENTE (mayúsculas/minúsculas incluidas: GitHub Pages distingue entre "Antitronks.png" y "antitronks.png") y que la ruta es correcta.`
          );

          const fallback =
            document.createElement(
              "div"
            );

          fallback.className =
            "dev-card-media-fallback";

          fallback.textContent =
            `🎮 ${
              img.dataset
                .fallbackLabel ||
              img.alt ||
              "Imagen no disponible"
            }`;

          img.replaceWith(
            fallback
          );
        },
        {
          once: true
        }
      );
    });
}
