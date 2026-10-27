"use strict";

/* TronkStudios · js/i18n.js
   Versión en inglés de la web.

   Cómo funciona: la web está escrita en español. Si el idioma es inglés,
   este archivo recorre la página y cambia cada texto (y los atributos
   placeholder, aria-label, title y alt) por su traducción de I18N_EN.
   Un MutationObserver traduce también lo que se añade después desde
   JavaScript (chat de soporte, perfiles, notificaciones...).

   - Para traducir un texto nuevo: añade "texto en español": "English"
     a I18N_EN. Si lleva números o nombres, añade una regla a I18N_PATTERNS.
   - Lo que escriben los usuarios (ideas, nombres, biografías) no se traduce.
   - El idioma se elige con el botón ES / EN de la cabecera y se recuerda.
     La primera vez se usa el idioma del navegador.

   Se carga SIN defer al final del <body>, antes que el resto de scripts,
   para que no se vea la web en español un instante. */

/* =========================================================
   IDIOMA ACTUAL
   ========================================================= */

const LANG_KEY = "tronk-lang";

const LANG = (() => {
  try {
    const saved = localStorage.getItem(LANG_KEY);

    if (saved === "es" || saved === "en") {
      return saved;
    }
  } catch {
    // Sin localStorage se usa el idioma del navegador
  }

  return (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
})();

/* Formato de fechas según el idioma */
function currentLocale() {
  return LANG === "en" ? "en-US" : "es-ES";
}

function setLanguage(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Si no se puede guardar, solo cambia en esta visita
  }

  window.location.reload();
}

/* =========================================================
   DICCIONARIO ESPAÑOL → INGLÉS
   Está en js/i18n-en.js (Object.assign(I18N_EN, ...) y
   I18N_PATTERNS.push(...)). Solo se descarga si la web va en inglés.
   ========================================================= */

const I18N_EN = {};
const I18N_PATTERNS = [];


/* =========================================================
   TRADUCTOR
   ========================================================= */

function translateKey(key) {
  if (Object.prototype.hasOwnProperty.call(I18N_EN, key)) {
    return I18N_EN[key];
  }

  for (const [pattern, build] of I18N_PATTERNS) {
    const match = key.match(pattern);
    const result = match ? build(...match) : undefined;

    if (result !== undefined) {
      return result;
    }
  }

  return undefined;
}

/* Devuelve el texto en el idioma actual (si no hay traducción, igual) */
function t(text) {
  if (LANG !== "en" || typeof text !== "string" || !text.trim()) {
    return text;
  }

  const key = text.replace(/\s+/g, " ").trim();
  let out = translateKey(key);

  // Textos de varias líneas (chat de soporte): línea a línea
  if (out === undefined && text.includes("\n")) {
    const lines = text.split("\n").map((line) => (line.trim() ? t(line) : line));
    const joined = lines.join("\n");
    return joined === text ? text : joined;
  }

  if (out === undefined) {
    return text;
  }

  const lead = text.match(/^\s*/)[0];
  const trail = text.match(/\s*$/)[0];
  return lead + out + trail;
}

/* =========================================================
   TRADUCIR LA PÁGINA
   ========================================================= */

const I18N_ATTRIBUTES = ["placeholder", "aria-label", "title", "alt"];

// Dentro de estos no se traduce (código o lo que escriben los usuarios)
const I18N_SKIP = "script, style, textarea, [data-no-translate]";

function translateElementAttributes(element) {
  if (element.closest("[data-no-translate]")) {
    return;
  }

  // Imágenes con versión en inglés (por ejemplo, la miniatura de un juego)
  const englishSrc = element.getAttribute("data-src-en");

  if (englishSrc && element.getAttribute("src") !== englishSrc) {
    element.setAttribute("src", englishSrc);
  }

  I18N_ATTRIBUTES.forEach((name) => {
    const value = element.getAttribute(name);

    if (value) {
      const translated = t(value);

      if (translated !== value) {
        element.setAttribute(name, translated);
      }
    }
  });
}

function translateTextNode(node) {
  const parent = node.parentElement;

  if (!parent || parent.closest(I18N_SKIP)) {
    return;
  }

  const translated = t(node.nodeValue);

  if (translated !== node.nodeValue) {
    node.nodeValue = translated;
  }
}

function translateTree(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE || root.closest(I18N_SKIP)) {
    return;
  }

  translateElementAttributes(root);
  root.querySelectorAll("*").forEach(translateElementAttributes);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;

  while ((node = walker.nextNode())) {
    translateTextNode(node);
  }
}

function initializeI18n() {
  document.documentElement.lang = LANG;
  // Ya se puede enseñar la página (ver js/view-early.js)
  document.documentElement.classList.remove("i18n-wait");

  // Botón ES / EN de la cabecera
  const toggle = document.getElementById("lang-toggle");

  if (toggle) {
    toggle.dataset.noTranslate = "";
    toggle.querySelector(".lang-label").textContent = LANG === "en" ? "ES" : "EN";
    toggle.setAttribute(
      "aria-label",
      LANG === "en" ? "Ver la web en español" : "View the website in English"
    );
    toggle.title = toggle.getAttribute("aria-label");
    toggle.addEventListener("click", () => setLanguage(LANG === "en" ? "es" : "en"));
  }

  if (LANG !== "en") {
    return;
  }

  document.title = t(document.title);
  translateTree(document.body);

  // Lo que se añade o cambia después también se traduce
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        translateTextNode(mutation.target);
      } else if (mutation.type === "attributes") {
        translateElementAttributes(mutation.target);
      } else {
        mutation.addedNodes.forEach(translateTree);
      }
    });
  }).observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: I18N_ATTRIBUTES
  });

  // Textos dibujados en los minijuegos y ventanas del navegador
  ["fillText", "strokeText"].forEach((method) => {
    const original = CanvasRenderingContext2D.prototype[method];

    CanvasRenderingContext2D.prototype[method] = function (text, ...rest) {
      return original.call(this, typeof text === "string" ? t(text) : text, ...rest);
    };
  });

  const originalConfirm = window.confirm.bind(window);
  window.confirm = (message) => originalConfirm(t(String(message)));
}

if (LANG === "en") {
  // El diccionario (js/i18n-en.js) traduce la página en cuanto llega; mientras,
  // la página está oculta (clase i18n-wait, que pone js/view-early.js)
  const dictionary = document.createElement("script");
  dictionary.src = "js/i18n-en.js?v=1";
  dictionary.onerror = () => initializeI18n();
  document.body.appendChild(dictionary);
} else {
  initializeI18n();
}
