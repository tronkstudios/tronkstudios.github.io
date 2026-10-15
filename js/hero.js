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

  resize();
  start();
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
