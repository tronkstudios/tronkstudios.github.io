"use strict";

/* TronkStudios · js/hero.js
   Fondo de partículas de la portada.
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   PARTÍCULAS DE LA PORTADA
   ========================================================= */

/*
 * Puntos azules que flotan despacio y se unen con líneas finas
 * cuando están cerca, como el logo. Para no gastar batería:
 * - el número de puntos depende del tamaño de la portada,
 * - solo se anima mientras la portada se ve en pantalla y la
 *   pestaña está abierta,
 * - con «reducir movimiento» se dibuja una vez, sin animación.
 */
function initializeHeroParticles() {
  const canvas = document.querySelector(".hero-particles");
  const hero = canvas && canvas.closest(".hero");

  if (!canvas || !hero || !canvas.getContext) {
    return;
  }

  const context = canvas.getContext("2d");
  const reduceMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LINK_DISTANCE = 120;
  let particles = [];
  let width = 0;
  let height = 0;
  let frame = null;
  let visible = true;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = hero.getBoundingClientRect();

    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Un punto cada ~14.000 px², entre 18 y 70
    const count = Math.max(18, Math.min(70, Math.round((width * height) / 14000)));

    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 1 + Math.random() * 1.8
    }));

    // Velocidad «tranquila» a la que vuelven después de un empujón
    particles.forEach((p) => {
      p.bx = p.vx;
      p.by = p.vy;
    });

    draw();
  }

  function draw() {
    context.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i];

      for (let j = i + 1; j < particles.length; j += 1) {
        const b = particles[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);

        if (distance < LINK_DISTANCE) {
          context.strokeStyle =
            `rgba(31, 120, 255, ${0.22 * (1 - distance / LINK_DISTANCE)})`;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }

      context.fillStyle = "rgba(0, 180, 255, 0.75)";
      context.beginPath();
      context.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      context.fill();
    }
  }

  function step() {
    particles.forEach((p) => {
      p.vx += (p.bx - p.vx) * 0.03;
      p.vy += (p.by - p.vy) * 0.03;
      p.x += p.vx;
      p.y += p.vy;

      // Al salir por un lado, vuelve a entrar por el otro
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;
    });

    draw();
    frame = requestAnimationFrame(step);
  }

  function start() {
    if (reduceMotion || frame || !visible || document.hidden) {
      return;
    }

    frame = requestAnimationFrame(step);
  }

  function stop() {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }

  let resizeTimer = null;

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;

      if (visible) {
        start();
      } else {
        stop();
      }
    }).observe(hero);
  }

  /* Empuja hacia fuera las partículas cercanas a un punto (el logo) */
  pushHeroParticles = (clientX, clientY) => {
    if (reduceMotion) {
      return;
    }

    const rect = hero.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    particles.forEach((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      const distance = Math.hypot(dx, dy) || 1;

      if (distance < 420) {
        const force = (1 - distance / 420) * 7;
        p.vx += (dx / distance) * force;
        p.vy += (dy / distance) * force;
      }
    });
  };

  resize();
  start();
}

// La define initializeHeroParticles; la usa el logo al pulsarlo
let pushHeroParticles = () => {};

/* =========================================================
   LOGO QUE REACCIONA AL PULSARLO
   ========================================================= */

const HERO_LOGO_MOVES = ["spin", "jump", "wobble"];

function initializeHeroLogo() {
  const logo = document.querySelector(".hero-logo-react");
  const motion = logo?.querySelector(".hero-logo-motion");

  if (!logo || !motion) {
    return;
  }

  const reduceMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sparks(x, y) {
    const count = reduceMotion ? 0 : 14;

    for (let i = 0; i < count; i += 1) {
      const spark = document.createElement("span");
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const distance = 60 + Math.random() * 70;

      spark.className = "logo-spark";
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      spark.style.setProperty("--size", `${4 + Math.random() * 6}px`);
      spark.addEventListener("animationend", () => spark.remove());
      logo.appendChild(spark);
    }
  }

  function react(clientX, clientY) {
    const rect = logo.getBoundingClientRect();
    const x = clientX ?? rect.left + rect.width / 2;
    const y = clientY ?? rect.top + rect.height / 2;

    // Animación al azar (se reinicia si se pulsa durante otra)
    HERO_LOGO_MOVES.forEach((move) => motion.classList.remove(`is-${move}`));
    void motion.offsetWidth;
    motion.classList.add(
      `is-${HERO_LOGO_MOVES[Math.floor(Math.random() * HERO_LOGO_MOVES.length)]}`
    );

    sparks(x - rect.left, y - rect.top);
    pushHeroParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  logo.addEventListener("click", (event) => {
    // Con el teclado no hay posición del ratón: sale del centro
    react(event.detail ? event.clientX : undefined, event.detail ? event.clientY : undefined);
  });

  logo.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      react();
    }
  });

  motion.addEventListener("animationend", (event) => {
    if (event.target === motion) {
      HERO_LOGO_MOVES.forEach((move) => motion.classList.remove(`is-${move}`));
    }
  });
}

/* =========================================================
   CIFRAS DE LA PORTADA
   Se cuentan las tarjetas que hay de verdad en la página, así
   el número cambia solo al añadir o quitar un juego:
   - juegos finalizados: tarjetas de «Nuestros Juegos» (#juegos)
   - juegos en desarrollo: tarjetas de «Juegos en desarrollo»
   ========================================================= */

function initializeHeroCounts() {
  const counts = {
    created: {
      total: document.querySelectorAll("#juegos .card").length,
      one: "juego finalizado",
      many: "juegos finalizados"
    },
    development: {
      total: document.querySelectorAll("#desarrollo .dev-card[data-project]").length,
      one: "juego en desarrollo",
      many: "juegos en desarrollo"
    }
  };

  Object.entries(counts).forEach(([key, { total, one, many }]) => {
    const number = document.querySelector(`[data-count="${key}"]`);
    const label = document.querySelector(`[data-count-label="${key}"]`);

    if (number) {
      number.textContent = String(total);
    }

    if (label) {
      label.textContent = total === 1 ? one : many;
    }
  });
}
