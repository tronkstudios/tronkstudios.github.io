"use strict";

/* =========================================================
   TRONKSTUDIOS - SISTEMA DE SOPORTE
   Menú «Soporte» → chat con respuestas guiadas o formulario de correo.

   Este archivo NO contiene claves secretas y no debe
   contenerlas nunca: se publica en GitHub Pages y cualquiera
   puede leerlo. Todas las claves viven en el backend
   (Cloudflare Worker de la carpeta support-backend).
   ========================================================= */

/* =========================================================
   CONFIGURACIÓN (lo único que tienes que tocar)
   ========================================================= */

const SUPPORT_CONFIG = {
  /*
   * Dirección del backend de soporte (tu Cloudflare Worker),
   * SIN barra al final. Ejemplo:
   * "https://tronkstudios-support.tu-subdominio.workers.dev"
   *
   * Mientras esté vacía, el formulario abre la aplicación
   * de correo del usuario. (El chat no la necesita: funciona
   * con un guion fijo y no se conecta a ningún servidor.)
   */
  apiBaseUrl: "https://tronkstudios-support.tronkstudios7.workers.dev",

  /*
   * Correo de soporte PÚBLICO. Solo se usa para el plan B
   * (abrir la aplicación de correo del visitante). El correo
   * al que llegan los mensajes del formulario se configura
   * en el backend (SUPPORT_EMAIL_TO).
   */
  supportEmail: "tronkstudios7@gmail.com",

  /*
   * Clave de SITIO de Cloudflare Turnstile (anti-bots).
   * Es pública, no es secreta. Déjala vacía si no lo usas.
   */
  turnstileSiteKey: "",

  // Tiempo máximo de espera de cada petición (milisegundos)
  requestTimeoutMs: 30000
};

(function initializeSupport() {
  /* =========================================================
     CONSTANTES
     ========================================================= */

  const MAIL_LIMITS = {
    name: [2, 60],
    subject: [3, 120],
    message: [20, 4000]
  };
  const MAIL_CATEGORIES = [
    "Juegos",
    "Aplicaciones",
    "Cuenta",
    "Error técnico",
    "Otros"
  ];
  const MIN_FILL_TIME_MS = 3000;
  const MAIL_COOLDOWN_MS = 60000;

  /* =========================================================
     ELEMENTOS
     ========================================================= */

  const menuModal = document.getElementById("support-menu-modal");
  const chatModal = document.getElementById("support-chat-modal");
  const mailModal = document.getElementById("support-mail-modal");

  if (!menuModal || !chatModal || !mailModal) {
    console.warn("TronkStudios soporte: faltan los paneles en index.html.");
    return;
  }

  const chatMessages = document.getElementById("support-chat-messages");
  const chatOptions = document.getElementById("support-chat-options");
  const chatStatus = document.getElementById("support-chat-status");
  const chatReset = document.getElementById("support-chat-reset");

  const mailForm = document.getElementById("support-mail-form");
  const mailNotice = document.getElementById("support-mail-notice");
  const mailResult = document.getElementById("support-mail-result");
  const mailSubmit = document.getElementById("support-mail-submit");
  const mailCount = document.getElementById("support-mail-count");
  const mailFields = {
    name: document.getElementById("support-mail-name"),
    email: document.getElementById("support-mail-email"),
    subject: document.getElementById("support-mail-subject"),
    category: document.getElementById("support-mail-category"),
    message: document.getElementById("support-mail-message"),
    website: document.getElementById("support-mail-website")
  };
  const turnstileBox = document.getElementById("support-turnstile");

  /* =========================================================
     ESTADO (solo en memoria: se pierde al recargar la página)
     ========================================================= */

  let activeModal = null;
  let lastOpener = null;

  // Estado del chat. No se guarda en ningún sitio.
  let chatBusy = false;
  let chatStarted = false;

  let healthPromise = null;
  let healthResult = null;

  let mailOpenedAt = 0;
  let mailBusy = false;
  let mailCooldownUntil = 0;

  let turnstileLoading = null;
  let turnstileWidgetId = null;
  let turnstileToken = "";

  /* =========================================================
     UTILIDADES
     ========================================================= */

  function apiBase() {
    return String(SUPPORT_CONFIG.apiBaseUrl || "").trim().replace(/\/+$/, "");
  }

  function isApiConfigured() {
    return /^https:\/\//i.test(apiBase());
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUPPORT_CONFIG.requestTimeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  // Comprueba qué partes del backend están activas (se hace una sola vez)
  function checkHealth() {
    if (!isApiConfigured()) {
      healthResult = { reachable: false, configured: false, chat: false, contact: false };
      return Promise.resolve(healthResult);
    }

    if (healthPromise) {
      return healthPromise;
    }

    healthPromise = fetchWithTimeout(`${apiBase()}/health`, { method: "GET" })
      .then(async (response) => {
        const data = await readJson(response);

        healthResult = {
          reachable: response.ok,
          configured: true,
          chat: response.ok && data.chat === true,
          contact: response.ok && data.contact === true,
          turnstile: response.ok && data.turnstile === true
        };

        return healthResult;
      })
      .catch(() => {
        healthResult = { reachable: false, configured: true, chat: false, contact: false };
        // Permite volver a intentarlo la próxima vez que se abra un panel
        healthPromise = null;
        return healthResult;
      });

    return healthPromise;
  }

  /* =========================================================
     ABRIR Y CERRAR PANELES
     ========================================================= */

  function getFocusable(container) {
    return Array.from(
      container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element.offsetParent !== null);
  }

  function showModal(modal, focusTarget) {
    if (activeModal && activeModal !== modal) {
      hideModal(activeModal);
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("support-open");
    activeModal = modal;

    requestAnimationFrame(() => {
      const target = focusTarget || getFocusable(modal)[0];

      if (target) {
        target.focus();
      }
    });
  }

  function hideModal(modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");

    if (activeModal === modal) {
      activeModal = null;
    }
  }

  function closeSupport() {
    if (activeModal) {
      hideModal(activeModal);
    }

    document.body.classList.remove("support-open");

    if (lastOpener && document.body.contains(lastOpener)) {
      lastOpener.focus();
    }
  }

  function openMenu(opener) {
    if (opener) {
      lastOpener = opener;
    }

    showModal(menuModal);
  }

  function openChat() {
    showModal(chatModal, chatOptions.querySelector("button"));

    if (!chatStarted) {
      startChat();
    }

    scrollChatToBottom();
  }

  function openMail() {
    showModal(mailModal, mailFields.name);
    mailOpenedAt = Date.now();
    prepareMailForm();
  }

  // Botones «Soporte» (navegación y pie de página)
  document.querySelectorAll("[data-open-support]").forEach((button) => {
    button.addEventListener("click", () => openMenu(button));
  });

  document.getElementById("support-option-chat")?.addEventListener("click", openChat);
  document.getElementById("support-option-mail")?.addEventListener("click", openMail);

  document.querySelectorAll("[data-support-close]").forEach((element) => {
    element.addEventListener("click", closeSupport);
  });

  document.querySelectorAll("[data-support-back]").forEach((button) => {
    button.addEventListener("click", () => openMenu());
  });

  document.querySelectorAll('[data-support-goto="mail"]').forEach((button) => {
    button.addEventListener("click", openMail);
  });

  // Escape cierra y Tab no se escapa del panel abierto
  document.addEventListener("keydown", (event) => {
    if (!activeModal) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeSupport();
      return;
    }

    if (event.key === "Tab") {
      const focusable = getFocusable(activeModal);

      if (!focusable.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* =========================================================
     CHAT CON IA (guion fijo: el usuario solo elige opciones)

     Cada paso tiene:
       msg:     lo que dice el asistente (texto o lista de textos)
       options: botones [texto, destino]

     El destino puede ser el nombre de otro paso o una acción:
       "@correo"   → abre el formulario de correo de soporte
       "@cuenta"   → cierra el soporte y abre la ventana de Cuenta
       "@sugerir"  → cierra el soporte y abre «Sugerir una idea»
       "@cerrar"   → cierra el soporte
     ========================================================= */

  const GUION = {
    inicio: {
      msg: [
        "¡Hola! Soy el asistente de soporte de TronkStudios.",
        "Elige la opción que describe tu problema."
      ],
      options: [
        ["🔑 No puedo iniciar sesión", "login"],
        ["🔒 Olvidé mi contraseña", "pass"],
        ["👤 No puedo crear una cuenta", "registro"],
        ["🎮 Un minijuego no carga o va mal", "juego"],
        ["🐞 Quiero reportar un fallo", "bug"],
        ["💡 Quiero enviar una sugerencia", "sugerencia"],
        ["🗑️ Quiero borrar mi cuenta", "borrar"],
        ["🙋 Hablar con el equipo", "humano"]
      ]
    },

    /* ---------- INICIO DE SESIÓN ---------- */
    login: {
      msg: "Vamos a arreglarlo. ¿Qué mensaje te sale al intentar entrar?",
      options: [
        ["«Invalid login credentials»", "login_pass"],
        ["«Email not confirmed»", "login_confirm"],
        ["«Ha ocurrido un error al iniciar sesión»", "login_carga"],
        ["No pasa nada o se queda en «Iniciando sesión...»", "login_carga"]
      ]
    },
    login_pass: {
      msg: [
        "Ese mensaje significa que el correo o la contraseña no coinciden. Prueba esto, en orden:",
        "1. Revisa que no tengas el bloqueo de mayúsculas activado.\n" +
          "2. Comprueba que el correo esté bien escrito, sin espacios al final.\n" +
          "3. Asegúrate de que usas el mismo correo con el que creaste la cuenta.\n" +
          "4. Si nunca llegaste a crear la cuenta, créala primero.",
        "¿Has podido entrar?"
      ],
      options: [
        ["✅ Sí, ya entré", "resuelto"],
        ["🔒 No recuerdo la contraseña", "pass"],
        ["👤 Creo que no tengo cuenta", "registro_nueva"]
      ]
    },
    login_confirm: {
      msg: [
        "Al crear la cuenta te enviamos un correo de confirmación. Tienes que pulsar el enlace de ese correo antes de poder entrar.",
        "1. Busca en tu bandeja de entrada un correo de confirmación.\n" +
          "2. Mira también en Spam y en Promociones.\n" +
          "3. Pulsa el enlace: te devolverá a esta web y ya podrás iniciar sesión.",
        "¿Lo has encontrado?"
      ],
      options: [
        ["✅ Sí, ya está confirmada", "resuelto"],
        ["📭 No me llega ningún correo", "humano"]
      ]
    },
    login_carga: {
      msg: [
        "Suele ser cosa del navegador. Prueba:",
        "1. Recarga la página con Ctrl + F5 (o Cmd + Mayús + R en Mac).\n" +
          "2. Abre la web en una ventana de incógnito.\n" +
          "3. Desactiva un momento los bloqueadores de anuncios.\n" +
          "4. Prueba con otro navegador (Chrome, Firefox o Edge).",
        "¿Ha funcionado?"
      ],
      options: [
        ["✅ Sí, ya funciona", "resuelto"],
        ["❌ No, sigue igual", "caida"]
      ]
    },
    caida: {
      msg: [
        "Entonces puede que el servidor de cuentas esté teniendo problemas en este momento.",
        "Espera unos 15 minutos y vuelve a intentarlo. Mientras tanto, los minijuegos se pueden jugar sin iniciar sesión.",
        "¿Quieres avisar al equipo igualmente?"
      ],
      options: [
        ["✉️ Sí, avisar al equipo", "@correo"],
        ["No, esperaré", "fin_pregunta"]
      ]
    },

    /* ---------- CONTRASEÑA ---------- */
    pass: {
      msg: [
        "Ahora mismo la web no tiene un botón para cambiar la contraseña tú mismo.",
        "Escríbenos desde el formulario de correo con la categoría «Cuenta», usando el mismo correo de tu cuenta, y el equipo te ayudará a recuperarla.",
        "Nunca te pediremos tu contraseña: no la escribas en el mensaje."
      ],
      options: [
        ["✉️ Escribir al equipo", "@correo"],
        ["✅ La he recordado", "resuelto"]
      ]
    },

    /* ---------- REGISTRO ---------- */
    registro: {
      msg: "¿Qué pasa al intentar crear la cuenta?",
      options: [
        ["«User already registered»", "reg_usado"],
        ["Me dice algo de la contraseña", "reg_pass"],
        ["Me dice que revise mi correo", "login_confirm"],
        ["No pasa nada o sale un error", "login_carga"]
      ]
    },
    registro_nueva: {
      msg: [
        "Para crear una cuenta, pulsa «👤 Cuenta» arriba del todo y luego «Crear cuenta».",
        "Después tendrás que confirmar tu correo con el enlace que te enviaremos."
      ],
      options: [
        ["👤 Abrir la ventana de Cuenta", "@cuenta"],
        ["Tengo otro problema", "inicio"]
      ]
    },
    reg_usado: {
      msg: [
        "Eso significa que ya existe una cuenta con ese correo. Prueba a iniciar sesión con él.",
        "¿Qué quieres hacer?"
      ],
      options: [
        ["👤 Iniciar sesión", "@cuenta"],
        ["🔒 No recuerdo la contraseña", "pass"],
        ["✅ Ya lo he resuelto", "resuelto"]
      ]
    },
    reg_pass: {
      msg: [
        "La contraseña necesita al menos 6 caracteres. Te recomendamos mezclar letras y números.",
        "¿Ya te deja?"
      ],
      options: [
        ["✅ Sí, cuenta creada", "resuelto"],
        ["❌ No, sigue sin dejarme", "humano"]
      ]
    },

    /* ---------- MINIJUEGOS ---------- */
    juego: {
      msg: "¿Qué minijuego te da problemas?",
      options: [
        ["Antitronks", "juego_tipo"],
        ["Protect Mogos", "juego_tipo"],
        ["Stick Drill", "juego_tipo"],
        ["Todos", "juego_tipo"]
      ]
    },
    juego_tipo: {
      msg: "¿Qué le pasa exactamente?",
      options: [
        ["No carga o se queda en blanco/negro", "juego_nocarga"],
        ["Va lento o a tirones", "juego_lento"],
        ["Los controles no responden", "juego_controles"],
        ["No hay sonido", "juego_sonido"],
        ["Se ha borrado mi récord", "juego_record"]
      ]
    },
    juego_nocarga: {
      msg: [
        "Prueba esto:",
        "1. Recarga la página con Ctrl + F5.\n" +
          "2. Asegúrate de que tu navegador está actualizado.\n" +
          "3. Desactiva un momento las extensiones o bloqueadores.\n" +
          "4. Si estás en el móvil, prueba en un ordenador.",
        "¿Ya carga?"
      ],
      options: [
        ["✅ Sí, ya funciona", "resuelto"],
        ["❌ No, sigue sin cargar", "bug"]
      ]
    },
    juego_lento: {
      msg: [
        "Para que vaya más fluido:",
        "1. Cierra otras pestañas y programas abiertos.\n" +
          "2. Si usas un portátil, enchúfalo al cargador.\n" +
          "3. En Chrome, activa «Usar aceleración de hardware» en Configuración > Sistema.",
        "¿Va mejor?"
      ],
      options: [
        ["✅ Sí, mucho mejor", "resuelto"],
        ["❌ No, sigue igual", "bug"]
      ]
    },
    juego_controles: {
      msg: [
        "Haz clic una vez dentro del juego antes de empezar, para que las teclas le lleguen al juego y no a la página.",
        "En Stick Drill, el jugador 1 usa W A S D y el jugador 2 las flechas. En móvil o tablet se juega con los joysticks de los lados.",
        "¿Ya responde?"
      ],
      options: [
        ["✅ Sí, ya funciona", "resuelto"],
        ["❌ No", "bug"]
      ]
    },
    juego_sonido: {
      msg: [
        "Cada minijuego tiene un botón de altavoz arriba, junto a la ×. Si ves 🔇, púlsalo para volver a activar el sonido.",
        "Comprueba también que el volumen del dispositivo está subido y que la pestaña no está silenciada.",
        "¿Ya se oye?"
      ],
      options: [
        ["✅ Sí", "resuelto"],
        ["❌ No", "bug"]
      ]
    },
    juego_record: {
      msg: [
        "Los récords se guardan en tu navegador, no en tu cuenta. Por eso se pierden si:",
        "• Juegas en otro navegador o en otro dispositivo.\n" +
          "• Juegas en una ventana de incógnito.\n" +
          "• Borras los datos o las cookies del navegador.",
        "Si juegas siempre en el mismo navegador y sin borrar datos, tu récord se mantendrá."
      ],
      options: [
        ["👍 Entendido", "fin_pregunta"],
        ["🐞 No era nada de eso", "bug"]
      ]
    },

    /* ---------- FALLOS Y SUGERENCIAS ---------- */
    bug: {
      msg: [
        "Gracias por avisar. Envía un correo al equipo con la categoría «Error técnico» y cuenta:",
        "• Qué juego o parte de la web falla.\n" +
          "• Qué estabas haciendo cuando pasó.\n" +
          "• Qué navegador y dispositivo usas."
      ],
      options: [
        ["✉️ Escribir al equipo", "@correo"],
        ["Tengo otro problema", "inicio"]
      ]
    },
    sugerencia: {
      msg: [
        "¡Nos encanta recibir ideas! Puedes publicarla en la sección Comunidad con el botón «💡 Sugerir una idea».",
        "Para publicar necesitas haber iniciado sesión."
      ],
      options: [
        ["💡 Sugerir una idea ahora", "@sugerir"],
        ["Tengo otro problema", "inicio"]
      ]
    },

    /* ---------- BORRAR CUENTA ---------- */
    borrar: {
      msg: [
        "Borrar la cuenta elimina también tus sugerencias, y no se puede deshacer.",
        "¿Seguro que quieres seguir?"
      ],
      options: [
        ["Sí, quiero borrarla", "borrar_si"],
        ["No, mejor no", "fin_pregunta"]
      ]
    },
    borrar_si: {
      msg:
        "Envía un correo al equipo con la categoría «Cuenta», desde el mismo correo de tu cuenta y con el asunto «Borrar cuenta». El equipo la eliminará y te avisará.",
      options: [
        ["✉️ Escribir al equipo", "@correo"],
        ["Tengo otro problema", "inicio"]
      ]
    },

    /* ---------- HABLAR CON EL EQUIPO ---------- */
    humano: {
      msg:
        "Te paso con el equipo. Rellena el formulario de correo contando tu problema y lo que ya has probado aquí, así te responderán más rápido.",
      options: [
        ["✉️ Escribir al equipo", "@correo"],
        ["Tengo otro problema", "inicio"]
      ]
    },

    /* ---------- CIERRES ---------- */
    resuelto: {
      msg: "¡Genial, me alegro de que esté solucionado! ¿Puedo ayudarte con algo más?",
      options: [
        ["Sí, otra cosa", "inicio"],
        ["No, eso es todo", "despedida"]
      ]
    },
    fin_pregunta: {
      msg: "De acuerdo. ¿Puedo ayudarte con algo más?",
      options: [
        ["Sí, otra cosa", "inicio"],
        ["No, eso es todo", "despedida"]
      ]
    },
    despedida: {
      msg: "¡Gracias por jugar a los juegos de TronkStudios! Si vuelves a tener problemas, aquí estaré.",
      options: [
        ["Tengo otro problema", "inicio"],
        ["Cerrar el chat", "@cerrar"]
      ]
    }
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : ms));

  // Cambia cada vez que se reinicia el chat, para que los mensajes
  // que aún se estaban «escribiendo» no se mezclen con los nuevos.
  let chatRun = 0;

  function scrollChatToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addBubble(text, type) {
    const bubble = document.createElement("div");
    bubble.className = `support-bubble ${type}`;
    // textContent: nunca se interpreta como HTML
    bubble.textContent = text;
    chatMessages.appendChild(bubble);
    scrollChatToBottom();
    return bubble;
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.className = "support-typing";
    typing.setAttribute("aria-label", "El asistente está escribiendo");
    typing.innerHTML = "<span></span><span></span><span></span>";
    chatMessages.appendChild(typing);
    scrollChatToBottom();
    return typing;
  }

  // Cierra el soporte y pulsa un botón de la propia web (Cuenta, Sugerir...)
  function openFromChat(buttonId) {
    closeSupport();
    document.getElementById(buttonId)?.click();
  }

  function runAction(destination) {
    if (destination === "@correo") {
      openMail();
    } else if (destination === "@cuenta") {
      openFromChat("account-button");
    } else if (destination === "@sugerir") {
      openFromChat("new-suggestion-button");
    } else if (destination === "@cerrar") {
      closeSupport();
    }
  }

  function renderOptions(stepName, options) {
    chatOptions.innerHTML = "";

    const list = options.slice();

    if (stepName !== "inicio" && stepName !== "despedida") {
      list.push(["↩ Volver al menú", "inicio", true]);
    }

    list.forEach(([label, destination, secondary]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = secondary ? "support-chat-option is-secondary" : "support-chat-option";
      button.textContent = label;

      button.addEventListener("click", () => {
        if (chatBusy) {
          return;
        }

        if (destination.startsWith("@")) {
          runAction(destination);
          return;
        }

        addBubble(label, "from-user");
        goToStep(destination);
      });

      chatOptions.appendChild(button);
    });
  }

  async function goToStep(stepName) {
    const step = GUION[stepName] || GUION.inicio;
    const run = chatRun;
    const messages = Array.isArray(step.msg) ? step.msg : [step.msg];

    chatBusy = true;
    chatOptions.innerHTML = "";

    for (const text of messages) {
      const typing = showTyping();
      await wait(Math.min(350 + text.length * 10, 1200));
      typing.remove();

      if (run !== chatRun) {
        return;
      }

      addBubble(text, "from-ai");
    }

    chatBusy = false;
    renderOptions(stepName, step.options);
    scrollChatToBottom();

    const first = chatOptions.querySelector("button");

    if (first && activeModal === chatModal) {
      first.focus({ preventScroll: true });
    }
  }

  function startChat() {
    chatStarted = true;
    chatRun += 1;
    chatBusy = false;
    chatMessages.innerHTML = "";
    chatOptions.innerHTML = "";
    chatStatus.textContent = "Asistente automático";
    chatStatus.classList.add("is-online");
    chatStatus.classList.remove("is-offline");
    goToStep("inicio");
  }

  chatReset.addEventListener("click", startChat);

  /* =========================================================
     FORMULARIO DE CORREO
     ========================================================= */

  function usesMailFallback() {
    return !isApiConfigured() || (healthResult && healthResult.reachable && !healthResult.contact);
  }

  function showMailNotice(text) {
    if (text) {
      mailNotice.textContent = text;
      mailNotice.classList.remove("hidden");
    } else {
      mailNotice.textContent = "";
      mailNotice.classList.add("hidden");
    }
  }

  function showMailResult(type, title, text, extraAction) {
    mailResult.className = `support-result is-${type}`;
    mailResult.innerHTML = "";

    const strong = document.createElement("strong");
    strong.textContent = title;
    mailResult.appendChild(strong);

    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    mailResult.appendChild(paragraph);

    if (extraAction) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "support-bubble-action";
      button.textContent = extraAction.label;
      button.addEventListener("click", extraAction.onClick);
      mailResult.appendChild(button);
    }

    mailResult.classList.remove("hidden");
    mailResult.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function clearMailResult() {
    mailResult.classList.add("hidden");
    mailResult.innerHTML = "";
  }

  async function prepareMailForm() {
    clearMailResult();

    if (!isApiConfigured()) {
      showMailNotice(
        "El envío automático todavía no está activado. Al pulsar «Enviar mensaje» se abrirá tu aplicación de correo " +
          "con el mensaje preparado, y tendrás que enviarlo tú desde allí."
      );
      return;
    }

    showMailNotice("");

    const health = await checkHealth();

    if (health.reachable && !health.contact) {
      showMailNotice(
        "El envío automático todavía no está activado. Al pulsar «Enviar mensaje» se abrirá tu aplicación de correo " +
          "con el mensaje preparado, y tendrás que enviarlo tú desde allí."
      );
      return;
    }

    if (SUPPORT_CONFIG.turnstileSiteKey) {
      loadTurnstile();
    }
  }

  function updateMailCounter() {
    mailCount.textContent = String(mailFields.message.value.length);
  }

  mailFields.message.addEventListener("input", updateMailCounter);

  Object.values(mailFields).forEach((field) => {
    field?.addEventListener("input", () => field.classList.remove("support-field-error"));
    field?.addEventListener("change", () => field.classList.remove("support-field-error"));
  });

  function cleanSingleLine(value) {
    return String(value || "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function cleanMultiline(value) {
    return String(value || "")
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
      .trim();
  }

  function isValidEmail(value) {
    return value.length <= 254 && /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[a-z]{2,}$/i.test(value);
  }

  function collectMailData() {
    return {
      name: cleanSingleLine(mailFields.name.value),
      email: cleanSingleLine(mailFields.email.value),
      subject: cleanSingleLine(mailFields.subject.value),
      category: mailFields.category.value,
      message: cleanMultiline(mailFields.message.value),
      website: mailFields.website.value
    };
  }

  function validateMailData(data) {
    const errors = [];

    const checkLength = (key, label) => {
      const [min, max] = MAIL_LIMITS[key];

      if (data[key].length < min || data[key].length > max) {
        errors.push({ field: key, text: `${label}: entre ${min} y ${max} caracteres.` });
      }
    };

    checkLength("name", "Nombre");

    if (!isValidEmail(data.email)) {
      errors.push({ field: "email", text: "Correo electrónico: escribe una dirección válida." });
    }

    checkLength("subject", "Asunto");

    if (!MAIL_CATEGORIES.includes(data.category)) {
      errors.push({ field: "category", text: "Categoría: elige una de la lista." });
    }

    checkLength("message", "Descripción");

    return errors;
  }

  function buildMailtoUrl(data) {
    const subject = `[Soporte TronkStudios] [${data.category}] ${data.subject}`;
    let body =
      `Nombre: ${data.name}\n` +
      `Correo: ${data.email}\n` +
      `Categoría: ${data.category}\n\n` +
      data.message;

    // Algunos programas de correo no aceptan enlaces muy largos
    if (body.length > 1500) {
      body = `${body.slice(0, 1500)}\n\n[El mensaje se ha recortado: pega aquí el resto si hace falta]`;
    }

    return `mailto:${encodeURIComponent(SUPPORT_CONFIG.supportEmail)}` +
      `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function openMailClient(data) {
    window.location.href = buildMailtoUrl(data);

    showMailResult(
      "info",
      "Se ha abierto tu aplicación de correo",
      "El mensaje todavía NO se ha enviado: revísalo y pulsa «Enviar» en tu aplicación de correo. " +
        `Si no se ha abierto nada, escríbenos directamente a ${SUPPORT_CONFIG.supportEmail}.`
    );
  }

  function setMailBusy(busy) {
    mailBusy = busy;
    mailSubmit.disabled = busy;
    mailSubmit.textContent = busy ? "Enviando..." : "Enviar mensaje";
  }

  function mailErrorText(status, data) {
    if (status === 429) {
      return "Has enviado demasiados mensajes seguidos. Espera unos minutos antes de volver a intentarlo.";
    }

    if (status === 400 && data && data.error === "captcha") {
      return "No se ha podido completar la verificación anti-bots. Márcala de nuevo y vuelve a enviar.";
    }

    if (status === 400) {
      return "Algún campo no es válido. Revisa el formulario y vuelve a intentarlo.";
    }

    return "El servidor de correo no ha podido enviar el mensaje. Inténtalo más tarde o usa tu aplicación de correo.";
  }

  mailForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (mailBusy) {
      return;
    }

    clearMailResult();

    const data = collectMailData();
    const errors = validateMailData(data);

    Object.values(mailFields).forEach((field) => field?.classList.remove("support-field-error"));

    if (errors.length) {
      errors.forEach((error) => mailFields[error.field]?.classList.add("support-field-error"));
      mailFields[errors[0].field]?.focus();
      showMailResult("error", "Revisa el formulario", errors.map((error) => error.text).join(" "));
      return;
    }

    // Plan B: sin backend de correo → abrir la aplicación de correo del usuario
    if (usesMailFallback()) {
      openMailClient(data);
      return;
    }

    if (Date.now() < mailCooldownUntil) {
      const seconds = Math.ceil((mailCooldownUntil - Date.now()) / 1000);
      showMailResult("error", "Espera un momento", `Podrás enviar otro mensaje dentro de ${seconds} segundos.`);
      return;
    }

    if (SUPPORT_CONFIG.turnstileSiteKey && healthResult && healthResult.turnstile && !turnstileToken) {
      showMailResult("error", "Falta la verificación", "Completa la verificación anti-bots antes de enviar.");
      return;
    }

    setMailBusy(true);

    try {
      const response = await fetchWithTimeout(`${apiBase()}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          elapsedMs: Math.max(0, Date.now() - mailOpenedAt),
          turnstileToken
        })
      });

      const result = await readJson(response);

      if (!response.ok || result.ok !== true) {
        throw Object.assign(new Error("mail_failed"), { status: response.status, data: result });
      }

      // Solo llegamos aquí si el backend confirma que el correo se ha entregado al servicio de envío
      showMailResult(
        "success",
        "Mensaje enviado",
        `Hemos recibido tu mensaje. Te responderemos a ${data.email} lo antes posible.`
      );

      mailForm.reset();
      updateMailCounter();
      mailCooldownUntil = Date.now() + MAIL_COOLDOWN_MS;
    } catch (error) {
      const status = error && error.status;
      const text = error && error.name === "AbortError"
        ? "El servidor ha tardado demasiado en responder. Es posible que el mensaje no se haya enviado."
        : mailErrorText(status, error && error.data);

      showMailResult("error", "No se ha podido enviar", text, {
        label: "✉️ Usar mi aplicación de correo",
        onClick: () => openMailClient(data)
      });
    } finally {
      setMailBusy(false);
      resetTurnstile();
    }
  });

  /* =========================================================
     CLOUDFLARE TURNSTILE (opcional, anti-bots)
     ========================================================= */

  function loadTurnstile() {
    if (!SUPPORT_CONFIG.turnstileSiteKey || !turnstileBox) {
      return;
    }

    if (!turnstileLoading) {
      turnstileLoading = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    turnstileLoading
      .then(() => {
        if (turnstileWidgetId !== null || !window.turnstile) {
          return;
        }

        const isDark =
          document.documentElement.getAttribute("data-theme") === "dark" ||
          (!document.documentElement.getAttribute("data-theme") &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);

        turnstileWidgetId = window.turnstile.render(turnstileBox, {
          sitekey: SUPPORT_CONFIG.turnstileSiteKey,
          theme: isDark ? "dark" : "light",
          language: "es",
          callback: (token) => {
            turnstileToken = token;
          },
          "expired-callback": () => {
            turnstileToken = "";
          },
          "error-callback": () => {
            turnstileToken = "";
          }
        });
      })
      .catch(() => {
        turnstileLoading = null;
      });
  }

  function resetTurnstile() {
    turnstileToken = "";

    if (window.turnstile && turnstileWidgetId !== null) {
      window.turnstile.reset(turnstileWidgetId);
    }
  }

  console.log("TronkStudios: sistema de soporte listo.");
})();
