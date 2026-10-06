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
    // ID del vídeo de YouTube del tráiler (lo que va después de youtu.be/).
    // Déjalo vacío ("") si un juego no tiene tráiler.
    trailer: "VrHyQbwUtrY",
    // Año, mes (1-12), día
    release: [2027, 1, 4],
    description: [
      "Z Tronks es un juego de acción y supervivencia ambientado en un mundo devastado por un apocalipsis zombi. Los jugadores deberán explorar una ciudad abandonada, enfrentarse a diferentes tipos de zombis, completar misiones y conseguir experiencia y recursos para mejorar a su personaje.",
      "Cada jugador podrá elegir entre distintas clases, como Gunner, Warrior, Rogue y Medic, cada una con sus propias armas, habilidades y estilos de combate. A medida que avances, podrás desbloquear nuevas habilidades, conseguir mejor equipamiento y enfrentarte a enemigos cada vez más peligrosos.",
      "Forma un equipo con tus amigos, sobrevive al apocalipsis y conviértete en uno de los supervivientes más poderosos de Z Tronks."
    ]
  },

  "the-sundered-sky": {
    title: "The Sundered Sky",
    image: "img/juegos/the-sundered-sky.png",
    category: "Juego",
    people: 1,
    trailer: "",
    // null = todavía no tiene fecha de lanzamiento
    release: null,
    description: [
      "The Sundered Sky es un RPG de fantasía y aventuras en un mundo hecho de cubos. Hace siglos, un gran cataclismo conocido como la Ruptura partió el antiguo continente en pedazos, y hoy sus restos flotan como islas sobre un inmenso mar de nubes.",
      "Junto a tus amigos viajarás en un barco volador por un archipiélago que se genera al azar en cada partida. Explora biomas muy distintos, descubre criaturas nunca vistas, visita ciudades de razas y facciones con sus propias ideas, y adéntrate en mazmorras llenas de tesoros. Elige tu clase, consigue armas y armaduras, fabrica equipo, doma mascotas y mejora tu barco para llegar cada vez más lejos.",
      "Cada pueblo habla su propia lengua. Aprende sus palabras poco a poco para leer libros antiguos, desvelar los secretos de la Ruptura y enfrentarte a jefes legendarios. Un mundo de aventuras para todas las edades, pensado para disfrutarlo en compañía."
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

  // Sin fecha: se muestra "Sin fecha todavía" y no hay cuenta atrás.
  const hasRelease = Array.isArray(project.release);
  const days = hasRelease ? daysUntil(project.release) : null;

  let countdown;

  if (!hasRelease) {
    countdown = "";
  } else if (days > 1) {
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
  modal.querySelector("#project-modal-release").textContent = hasRelease
    ? formatReleaseDate(project.release)
    : "Sin fecha todavía";

  const countdownElement = modal.querySelector("#project-modal-countdown");
  countdownElement.textContent = countdown;
  countdownElement.hidden = !countdown;

  const description = modal.querySelector("#project-modal-description");
  description.innerHTML = "";

  project.description.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    description.appendChild(p);
  });

  // El tráiler va SIEMPRE al final de la descripción.
  if (project.trailer) {
    description.appendChild(createTrailer(project));
  }

  openModal(modal);
}

/* =========================================================
   TRÁILER DE YOUTUBE DENTRO DE LA FICHA
   Se usa youtube-nocookie.com (no guarda cookies hasta que se
   reproduce). El reproductor de YouTube ya trae volumen y
   pantalla completa; "allowfullscreen" es lo que permite
   ponerlo en grande. Este dominio está permitido en la CSP
   (frame-src) de index.html.
   ========================================================= */

/* Crea el <iframe> del tráiler (se usa en la ficha y en la tarjeta). */
function createTrailerFrame(project) {
  const frame = document.createElement("div");
  frame.className = "video-frame";

  const iframe = document.createElement("iframe");
  iframe.src =
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(project.trailer)}?rel=0`;
  iframe.title = `Tráiler de ${project.title}`;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allow = "encrypted-media; picture-in-picture; fullscreen";
  iframe.allowFullscreen = true;

  frame.appendChild(iframe);
  return frame;
}

function createTrailer(project) {
  const wrapper = document.createElement("section");
  wrapper.className = "project-trailer";
  wrapper.setAttribute("aria-labelledby", "project-trailer-title");

  const title = document.createElement("h3");
  title.id = "project-trailer-title";
  title.className = "project-trailer-title";
  title.textContent = "Ver Trailer";

  const frame = createTrailerFrame(project);
  frame.classList.add("project-trailer-frame");
  wrapper.append(title, frame);

  return wrapper;
}

/*
 * Al cerrar la ficha (con la ×, con Escape o pulsando fuera)
 * se quita el vídeo, para que el tráiler no siga sonando
 * con la ventana cerrada.
 */
function stopTrailerWhenModalCloses() {
  const modal = document.getElementById("project-modal");

  if (!modal) {
    return;
  }

  new MutationObserver(() => {
    if (modal.classList.contains("hidden")) {
      modal
        .querySelectorAll(".project-trailer")
        .forEach((trailer) => trailer.remove());
    }
  }).observe(modal, { attributes: true, attributeFilter: ["class"] });
}

/*
 * Tráiler también en la TARJETA del juego (sección "Juegos en
 * desarrollo"), debajo de la categoría y con "Ver trailer" encima.
 * La tarjeta entera abre la ficha al pulsarla, así que los clics
 * y teclas dentro del bloque del tráiler NO se pasan a la tarjeta:
 * pulsar "Ver trailer" no abre la ficha por error.
 */
function addCardTrailer(card, project) {
  const wrapper = document.createElement("div");
  wrapper.className = "card-trailer";

  const title = document.createElement("p");
  title.className = "card-trailer-title";
  title.textContent = "Ver trailer";

  wrapper.append(title, createTrailerFrame(project));

  ["click", "keydown"].forEach((type) => {
    wrapper.addEventListener(type, (event) => event.stopPropagation());
  });

  card.appendChild(wrapper);
}

function initializeProjects() {
  stopTrailerWhenModalCloses();

  document
    .querySelectorAll(".dev-card[data-project]")
    .forEach((card) => {
      const id = card.dataset.project;

      if (PROJECTS[id] && PROJECTS[id].trailer) {
        addCardTrailer(card, PROJECTS[id]);
      }

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
