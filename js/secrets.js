"use strict";

/* TronkStudios · js/secrets.js
   Logros secretos absurdos. No se dice cómo conseguirlos: al
   desbloquear uno sale un aviso (con botón para compartirlo) y en tu
   perfil aparece la lista con los que te faltan como «???».
   Se guardan en este navegador. Los minijuegos avisan con
   TronkSecrets.unlock("id") o TronkSecrets.zero("juego").
   Aquí también está el visor del CHANGELOG (el «v6» del pie de página).
   Se carga como script clásico (ver docs/adr/0002). */

const TronkSecrets = (() => {
  const KEY = "tronk-secrets";

  const LIST = [
    { id: "impaciente", icon: "refresh", name: "Impaciente", how: "Abrir la web 3 veces en menos de un minuto." },
    { id: "pacifista", icon: "heart", name: "Pacifista", how: "Perder en El Juego Miente sin pulsar ni un botón." },
    { id: "speedrun", icon: "bolt", name: "Speedrun al revés", how: "Perder una partida de El Juego Miente en menos de 6 segundos." },
    { id: "cero", icon: "target", name: "Cero patatero", how: "Sacar 0 puntos en 3 minijuegos distintos." },
    { id: "lector", icon: "edit", name: "Lector incansable", how: "Leer el CHANGELOG entero, hasta el final." },
    { id: "noctambulo", icon: "moon", name: "Noctámbulo", how: "Entrar a la web entre las 3 y las 5 de la madrugada." },
    { id: "logo", icon: "sparkles", name: "¿Hola? ¿Hay alguien?", how: "Pulsar 10 veces seguidas el logo de TronkStudios." },
    { id: "indeciso", icon: "sun", name: "Indeciso", how: "Cambiar entre tema claro y oscuro 6 veces en 20 segundos." },
    { id: "jefe", icon: "chart", name: "Que no te pillen", how: "Usar el modo jefe." },
    { id: "konami", icon: "gamepad", name: "Viejo truco", how: "Escribir ↑ ↑ ↓ ↓ ← → ← → B A." },
    { id: "poliglota", icon: "globe", name: "Políglota", how: "Cambiar el idioma de la web." },
    { id: "desconectado", icon: "wifi-off", name: "Sin cobertura", how: "Abrir la web sin conexión a internet." }
  ];

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      return {};
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Sin almacenamiento: solo dura esta visita
    }
  }

  let found = load();

  function has(id) {
    return Boolean(found[id]);
  }

  function unlock(id) {
    const secret = LIST.find((item) => item.id === id);

    if (!secret || has(id)) {
      return;
    }

    found[id] = Date.now();
    save(found);
    announce(secret);
  }

  /* Aviso con botón de compartir */
  function announce(secret) {
    let box = document.getElementById("toast-box");

    if (!box) {
      box = document.createElement("div");
      box.id = "toast-box";
      box.className = "toast-box";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }

    const toast = document.createElement("div");
    toast.className = "toast secret-toast";
    toast.append(makeIcon(secret.icon, "icon toast-icon"));

    const text = document.createElement("div");
    text.className = "secret-toast-text";
    const title = document.createElement("strong");
    title.textContent = `Logro secreto: ${secret.name}`;
    const how = document.createElement("span");
    how.textContent = secret.how;
    text.append(title, how);

    const share = document.createElement("button");
    share.type = "button";
    share.className = "secret-share";
    share.textContent = "Compartir";
    share.addEventListener("click", () => shareSecret(secret, share));

    toast.append(text, share);
    box.appendChild(toast);

    setTimeout(() => toast.classList.add("is-leaving"), 7000);
    setTimeout(() => toast.remove(), 7500);
  }

  async function shareSecret(secret, button) {
    const count = Object.keys(found).length;
    const text = `🏆 He conseguido el logro secreto «${secret.name}» en TronkStudios (${count}/${LIST.length}). ¿Encontrarás los demás?`;
    const url = "https://tronkstudios.github.io/";

    try {
      if (navigator.share) {
        await navigator.share({ title: "Logro secreto", text, url });
        return;
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      button.textContent = "¡Copiado!";
    } catch {
      window.prompt("Copia el texto:", `${text} ${url}`);
    }
  }

  /* Lista para el perfil (js/profiles.js) */
  function renderList() {
    const wrap = document.createElement("section");
    wrap.className = "secret-list";

    const head = document.createElement("h3");
    head.className = "profile-section-title";
    head.textContent = `Logros secretos · ${Object.keys(found).length}/${LIST.length}`;

    const list = document.createElement("ul");
    list.className = "badge-list";

    LIST.forEach((secret) => {
      const item = document.createElement("li");
      const unlocked = has(secret.id);
      item.className = unlocked ? "badge secret-badge" : "badge secret-badge is-locked";
      item.append(makeIcon(unlocked ? secret.icon : "lock"));
      const name = document.createElement("span");
      name.textContent = unlocked ? secret.name : "???";
      item.appendChild(name);
      item.title = unlocked ? secret.how : "Secreto. Sigue explorando la web.";
      list.appendChild(item);
    });

    const note = document.createElement("p");
    note.className = "secret-note";
    note.textContent = "Se guardan en este navegador. Pasa el ratón por encima para ver cómo se consiguen.";

    wrap.append(head, list, note);
    return wrap;
  }

  /* Un 0 en un minijuego (lo llama js/games/results.js) */
  function zero(game) {
    const zeros = JSON.parse(sessionValue("tronk-secrets-zero") || "[]");

    if (!zeros.includes(game)) {
      zeros.push(game);
      storeValue("tronk-secrets-zero", JSON.stringify(zeros));
    }

    if (zeros.length >= 3) {
      unlock("cero");
    }
  }

  function sessionValue(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function storeValue(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Nada
    }
  }

  return { unlock, has, zero, renderList, list: LIST };
})();

window.TronkSecrets = TronkSecrets;

/* =========================================================
   CÓMO SE CONSIGUEN (los que no dependen de un minijuego)
   ========================================================= */

function initializeSecrets() {
  // Impaciente: 3 visitas en un minuto
  try {
    const now = Date.now();
    const visits = (JSON.parse(localStorage.getItem("tronk-secrets-visits")) || []).filter((t) => now - t < 60000);
    visits.push(now);
    localStorage.setItem("tronk-secrets-visits", JSON.stringify(visits.slice(-5)));

    if (visits.length >= 3) {
      setTimeout(() => TronkSecrets.unlock("impaciente"), 1500);
    }
  } catch {
    // Sin almacenamiento
  }

  // Noctámbulo: de 3:00 a 4:59
  const hour = new Date().getHours();

  if (hour >= 3 && hour < 5) {
    setTimeout(() => TronkSecrets.unlock("noctambulo"), 2500);
  }

  // Sin cobertura
  if (!navigator.onLine) {
    setTimeout(() => TronkSecrets.unlock("desconectado"), 2000);
  }

  window.addEventListener("offline", () => TronkSecrets.unlock("desconectado"));

  // Logo: 10 clics seguidos (sin parar más de 1,5 s)
  let logoClicks = 0;
  let logoTimer = null;

  document.querySelector(".brand-link")?.addEventListener("click", () => {
    logoClicks++;
    clearTimeout(logoTimer);
    logoTimer = setTimeout(() => (logoClicks = 0), 1500);

    if (logoClicks >= 10) {
      TronkSecrets.unlock("logo");
    }
  });

  // Indeciso: 6 cambios de tema en 20 s
  let themeChanges = [];

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const now = Date.now();
    themeChanges = themeChanges.filter((t) => now - t < 20000);
    themeChanges.push(now);

    if (themeChanges.length >= 6) {
      TronkSecrets.unlock("indeciso");
    }
  });

  // Políglota
  document.getElementById("lang-toggle")?.addEventListener("click", () => {
    TronkSecrets.unlock("poliglota");
  });

  // Modo jefe (js/boss.js)
  window.addEventListener("tronk:boss", (event) => {
    if (event.detail && event.detail.on) {
      TronkSecrets.unlock("jefe");
    }
  });

  // Konami: ↑ ↑ ↓ ↓ ← → ← → B A. Se escucha antes que el modo jefe para
  // que la B del código no lo active.
  const CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  let progress = 0;

  window.addEventListener(
    "keydown",
    (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === CODE[progress]) {
        progress++;

        if (key === "b") {
          event.stopImmediatePropagation();
        }

        if (progress === CODE.length) {
          progress = 0;
          TronkSecrets.unlock("konami");
        }
      } else {
        progress = key === CODE[0] ? 1 : 0;
      }
    },
    true
  );

  initializeChangelogViewer();
}

/* =========================================================
   VISOR DEL CHANGELOG (el «v6» del pie de página)
   ========================================================= */

function changelogInline(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

// Markdown sencillo: títulos, listas y párrafos
function changelogToHtml(markdown) {
  const out = [];
  let list = null;
  let paragraph = null;

  const flush = () => {
    if (paragraph) {
      out.push(`<p>${changelogInline(paragraph)}</p>`);
      paragraph = null;
    }

    if (list) {
      out.push(`<ul>${list.map((item) => `<li>${changelogInline(item)}</li>`).join("")}</ul>`);
      list = null;
    }
  };

  markdown.split(/\r?\n/).forEach((line) => {
    const heading = line.match(/^(#{1,4})\s+(.*)$/);

    if (heading) {
      flush();
      const level = Math.min(heading[1].length + 1, 5);
      out.push(`<h${level}>${changelogInline(heading[2])}</h${level}>`);
      return;
    }

    if (/^\s*-\s+/.test(line)) {
      if (paragraph) {
        flush();
      }

      list = list || [];
      list.push(line.replace(/^\s*-\s+/, ""));
      return;
    }

    if (!line.trim()) {
      flush();
      return;
    }

    // Línea que sigue a un punto de la lista (va con sangría)
    if (list && /^\s+/.test(line)) {
      list[list.length - 1] += ` ${line.trim()}`;
      return;
    }

    if (list) {
      flush();
    }

    paragraph = paragraph ? `${paragraph} ${line.trim()}` : line.trim();
  });

  flush();
  return out.join("");
}

function initializeChangelogViewer() {
  const trigger = document.querySelector(".footer-version");

  if (!trigger) {
    return;
  }

  trigger.setAttribute("role", "button");
  trigger.tabIndex = 0;

  const open = async () => {
    let html = "<p>Cargando…</p>";

    try {
      const response = await fetch("CHANGELOG.md", { cache: "no-cache" });
      html = changelogToHtml(await response.text());
    } catch {
      html = "<p>No se pudo cargar el historial de cambios.</p>";
    }

    openListModal("changelog", "Historial de cambios", "Todo lo que ha cambiado en la web", (content) => {
      const box = document.createElement("div");
      box.className = "changelog-view";
      box.setAttribute("data-no-translate", "");
      box.innerHTML = html;
      content.appendChild(box);
    });

    // Lector incansable: llegar al final
    const content = document.getElementById("list-modal-content");

    const check = () => {
      if (content.scrollTop + content.clientHeight >= content.scrollHeight - 30) {
        TronkSecrets.unlock("lector");
        content.removeEventListener("scroll", check);
      }
    };

    content.addEventListener("scroll", check);
  };

  trigger.addEventListener("click", open);
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
}

initializeSecrets();
