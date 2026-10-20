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
  turnstileSiteKey: "0x4AAAAAAFOXSR7FOVEePUTr",

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
    "Cuenta",
    "Error técnico",
    "Otros",
    "Trabajar con nosotros"
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
  const chatForm = document.getElementById("support-chat-form");
  const chatInput = document.getElementById("support-chat-input");
  const chatSend = document.getElementById("support-chat-send");
  const chatHint = document.getElementById("support-chat-hint");

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

  // La mascota 3D (js/mascot.js) abre el chat al pulsarla
  window.openTronkerChat = openChat;

  const mailPlaceholder = mailFields.message?.placeholder || "";

  function openMail() {
    mailFields.message.placeholder = mailPlaceholder;
    showModal(mailModal, mailFields.name);
    mailOpenedAt = Date.now();
    prepareMailForm();
  }

  /* «Trabaja con nosotros» (js/extras.js): abre el formulario ya preparado */
  window.openJoinMail = (role) => {
    openMail();
    mailFields.category.value = "Trabajar con nosotros";
    mailFields.subject.value = `Quiero ayudar: ${role}`.slice(0, 120);
    mailFields.message.placeholder =
      "Cuéntanos quién eres, qué sabes hacer y, si tienes, un enlace a tus trabajos (portfolio, YouTube, GitHub...).";
  };

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
     CHAT CON TRONKER (guion fijo: el usuario solo elige opciones)

     Cada paso tiene:
       msg:     lo que dice el asistente (texto o lista de textos)
       options: botones [texto, destino]

     El destino puede ser el nombre de otro paso o una acción:
       "@correo"   → abre el formulario de correo de soporte
       "@cuenta"   → cierra el soporte y abre la ventana de Cuenta
       "@contrasena" → cierra el soporte y abre cambiar/recuperar contraseña
       "@sugerir"  → cierra el soporte y abre «Sugerir una idea»
       "@cerrar"   → cierra el soporte
     ========================================================= */

  const GUION = {
    /* ---------- LO PRIMERO: ¿ESCRIBIENDO O POR TEMAS? ---------- */
    modo: {
      msg: [
        "¿Qué pasa, Tronk? Soy Tronker, el asistente de TronkStudios.",
        "¿Cómo prefieres hablar conmigo?"
      ],
      options: [
        ["Escribiendo mis preguntas", "@modo:escribir"],
        ["Eligiendo entre temas", "@modo:temas"]
      ]
    },
    escribir: {
      msg: "¡Genial! Escríbeme abajo lo que quieras: dudas de la web, de los juegos o de tu cuenta, o cualquier otra pregunta (deberes, curiosidades, ideas...).",
      options: []
    },

    /* ---------- TEMAS ---------- */
    inicio: {
      msg: "¿De qué tema quieres hablar?",
      options: [
        ["Mi cuenta", "tema_cuenta"],
        ["Juegos y minijuegos", "tema_juegos"],
        ["Perfil, retos y comunidad", "tema_comunidad"],
        ["La web y TronkStudios", "tema_web"],
        ["Algo no funciona", "tema_fallos"],
        ["Hablar con el equipo", "humano"],
        ["Prefiero escribir", "@modo:escribir", true]
      ]
    },
    tema_cuenta: {
      msg: "¿Qué necesitas con tu cuenta?",
      options: [
        ["No puedo iniciar sesión", "login"],
        ["Mi contraseña", "pass"],
        ["Crear una cuenta", "registro"],
        ["Borrar mi cuenta", "borrar"]
      ]
    },
    tema_juegos: {
      msg: "¿Qué quieres saber?",
      options: [
        ["Los juegos en desarrollo", "info_juegos"],
        ["Cómo se juega a los minijuegos", "info_minijuegos"],
        ["Un minijuego va mal", "juego"]
      ]
    },
    tema_comunidad: {
      msg: "¿Sobre qué tienes dudas?",
      options: [
        ["Perfil, avatar e insignias", "info_perfil"],
        ["Retos de la comunidad", "info_retos"],
        ["Lista de deseados", "info_deseados"],
        ["Notificaciones", "info_notificaciones"],
        ["Enviar una idea", "sugerencia"]
      ]
    },
    tema_web: {
      msg: "¿Qué quieres saber?",
      options: [
        ["Instalar la web como app", "info_app"],
        ["Idioma, tema, sonidos y atajos", "info_ajustes"],
        ["¿Qué es TronkStudios?", "info_estudio"],
        ["Trabajar con vosotros", "info_trabajar"]
      ]
    },
    tema_fallos: {
      msg: "Vamos a arreglarlo. ¿Qué falla?",
      options: [
        ["No puedo entrar en mi cuenta", "login"],
        ["Un minijuego no carga o va mal", "juego"],
        ["Otra cosa de la web", "bug"]
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
        ["Sí, ya entré", "resuelto"],
        ["No recuerdo la contraseña", "pass_olvido"],
        ["Creo que no tengo cuenta", "registro_nueva"]
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
        ["Sí, ya está confirmada", "resuelto"],
        ["No me llega ningún correo", "humano"]
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
        ["Sí, ya funciona", "resuelto"],
        ["No, sigue igual", "caida"]
      ]
    },
    caida: {
      msg: [
        "Entonces puede que el servidor de cuentas esté teniendo problemas en este momento.",
        "Espera unos 15 minutos y vuelve a intentarlo. Mientras tanto, los minijuegos se pueden jugar sin iniciar sesión.",
        "¿Quieres avisar al equipo igualmente?"
      ],
      options: [
        ["Sí, avisar al equipo", "@correo"],
        ["No, esperaré", "fin_pregunta"]
      ]
    },

    /* ---------- CONTRASEÑA ---------- */
    pass: {
      msg: "¿Qué necesitas?",
      options: [
        ["No recuerdo mi contraseña", "pass_olvido"],
        ["Quiero cambiarla (sé la actual)", "pass_cambiar"]
      ]
    },
    pass_olvido: {
      msg: [
        "Te ayudo a recuperarla:",
        "1. Pulsa el botón de abajo y escribe el correo de tu cuenta.\n" +
          "2. Te llegará un correo con un enlace (mira también en Spam).\n" +
          "3. Pulsa el enlace: volverás a esta web y podrás elegir tu contraseña nueva.",
        "Nunca te pediremos tu contraseña por correo ni por este chat."
      ],
      options: [
        ["Recuperar mi contraseña", "@contrasena"],
        ["No me llega el correo", "pass_nollega"],
        ["El enlace no funciona", "pass_enlace"],
        ["Ya la he cambiado", "resuelto"]
      ]
    },
    pass_cambiar: {
      msg: [
        "Para cambiarla necesitas haber iniciado sesión.",
        "Pulsa el botón de abajo, escribe la contraseña nueva dos veces y pulsa «Guardar contraseña». También lo encontrarás en «Cuenta» → «Cambiar contraseña»."
      ],
      options: [
        ["Cambiar mi contraseña", "@contrasena"],
        ["Ya la he cambiado", "resuelto"]
      ]
    },
    pass_nollega: {
      msg: [
        "Comprueba estas cosas:",
        "• Que el correo es exactamente el de tu cuenta.\n" +
          "• La carpeta de Spam y la de Promociones.\n" +
          "• Espera un par de minutos: pedirlo muchas veces seguidas lo bloquea un rato.",
        "¿Ha llegado?"
      ],
      options: [
        ["Sí, ya llegó", "pass_olvido"],
        ["No, sigue sin llegar", "humano"]
      ]
    },
    pass_enlace: {
      msg: [
        "Si al pulsar el enlace no te deja cambiarla, probablemente ha caducado o ya lo usaste.",
        "Pide un enlace nuevo y ábrelo en el mismo navegador donde lo pediste."
      ],
      options: [
        ["Pedir un enlace nuevo", "@contrasena"],
        ["Sigue sin funcionar", "humano"]
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
        "Para crear una cuenta, pulsa «Cuenta» arriba del todo y luego «Crear cuenta».",
        "Después tendrás que confirmar tu correo con el enlace que te enviaremos."
      ],
      options: [
        ["Abrir la ventana de Cuenta", "@cuenta"],
        ["Tengo otro problema", "inicio"]
      ]
    },
    reg_usado: {
      msg: [
        "Eso significa que ya existe una cuenta con ese correo. Prueba a iniciar sesión con él.",
        "¿Qué quieres hacer?"
      ],
      options: [
        ["Iniciar sesión", "@cuenta"],
        ["No recuerdo la contraseña", "pass_olvido"],
        ["Ya lo he resuelto", "resuelto"]
      ]
    },
    reg_pass: {
      msg: [
        "La contraseña necesita al menos 6 caracteres. Te recomendamos mezclar letras y números.",
        "¿Ya te deja?"
      ],
      options: [
        ["Sí, cuenta creada", "resuelto"],
        ["No, sigue sin dejarme", "humano"]
      ]
    },

    /* ---------- MINIJUEGOS ---------- */
    juego: {
      msg: "¿Qué minijuego te da problemas?",
      options: [
        ["Antitronks", "juego_tipo"],
        ["Protect Mogos", "juego_tipo"],
        ["Stick Drill", "juego_tipo"],
        ["Tronk Fight", "juego_tipo"],
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
        ["Sí, ya funciona", "resuelto"],
        ["No, sigue sin cargar", "bug"]
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
        ["Sí, mucho mejor", "resuelto"],
        ["No, sigue igual", "bug"]
      ]
    },
    juego_controles: {
      msg: [
        "Haz clic una vez dentro del juego antes de empezar, para que las teclas le lleguen al juego y no a la página.",
        "En Stick Drill, el jugador 1 usa W A S D y el jugador 2 las flechas. En móvil o tablet se juega con los joysticks de los lados.",
        "¿Ya responde?"
      ],
      options: [
        ["Sí, ya funciona", "resuelto"],
        ["No", "bug"]
      ]
    },
    juego_sonido: {
      msg: [
        "Cada minijuego tiene un botón de altavoz arriba, junto a la ×. Si ves el altavoz tachado, púlsalo para volver a activar el sonido.",
        "Comprueba también que el volumen del dispositivo está subido y que la pestaña no está silenciada.",
        "¿Ya se oye?"
      ],
      options: [
        ["Sí", "resuelto"],
        ["No", "bug"]
      ]
    },
    juego_record: {
      msg: [
        "Sin iniciar sesión, los récords se guardan solo en tu navegador. Por eso se pierden si:",
        "• Juegas en otro navegador o en otro dispositivo.\n" +
          "• Juegas en una ventana de incógnito.\n" +
          "• Borras los datos o las cookies del navegador.",
        "Si inicias sesión, tus récords se guardan también en tu cuenta: los verás en tu perfil y en la clasificación de Minijuegos, desde cualquier dispositivo."
      ],
      options: [
        ["Entendido", "fin_pregunta"],
        ["No era nada de eso", "bug"]
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
        ["Escribir al equipo", "@correo"],
        ["Tengo otro problema", "inicio"]
      ]
    },
    sugerencia: {
      msg: [
        "¡Nos encanta recibir ideas! Puedes publicarla en la sección Comunidad con el botón «Sugerir una idea».",
        "Para publicar necesitas haber iniciado sesión."
      ],
      options: [
        ["Sugerir una idea ahora", "@sugerir"],
        ["Tengo otro problema", "inicio"]
      ]
    },

    /* ---------- BORRAR CUENTA ---------- */
    borrar: {
      msg: [
        "Borrar la cuenta elimina también tus sugerencias, tu perfil, tu lista de deseados y tus récords, y no se puede deshacer.",
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
        ["Escribir al equipo", "@correo"],
        ["Tengo otro problema", "inicio"]
      ]
    },

    /* ---------- HABLAR CON EL EQUIPO ---------- */
    humano: {
      msg:
        "Te paso con el equipo. Rellena el formulario de correo contando tu problema y lo que ya has probado aquí, así te responderán más rápido.",
      options: [
        ["Escribir al equipo", "@correo"],
        ["Tengo otro problema", "inicio"]
      ]
    },

    /* ---------- DUDAS SOBRE LA WEB Y LOS JUEGOS ---------- */
    info_juegos: {
      msg: "Ahora mismo tenemos dos juegos en desarrollo. ¿Cuál te interesa?",
      options: [
        ["Z Tronks", "info_ztronks"],
        ["The Sundered Sky", "info_sundered"],
        ["Otra duda", "inicio"]
      ]
    },
    info_ztronks: {
      get msg() {
        const release = typeof PROJECTS !== "undefined" ? PROJECTS["z-tronks"]?.release : null;
        const date = Array.isArray(release) && typeof formatReleaseDate === "function"
          ? formatReleaseDate(release)
          : "";

        return [
          "Z Tronks es nuestro juego de Roblox de acción y supervivencia en un apocalipsis zombi: explora una ciudad abandonada, lucha contra zombis, completa misiones y mejora a tu personaje.",
          "Hay cuatro clases (Gunner, Warrior, Rogue y Medic) y se puede jugar en equipo con amigos.",
          date
            ? `Sale el ${date} (fecha prevista, puede cambiar). Si lo añades a tu lista de deseados y pulsas «Avisarme», te avisaremos cuando salga.`
            : "Todavía no tiene fecha. Si lo añades a tu lista de deseados y pulsas «Avisarme», te avisaremos cuando salga."
        ];
      },
      options: [
        ["Ver su ficha", "@ficha:z-tronks"],
        ["Otra duda", "inicio"]
      ]
    },
    info_sundered: {
      msg: [
        "The Sundered Sky es un RPG de fantasía y aventuras para PC en un mundo de islas flotantes hechas de cubos, que se recorre en barco volador con amigos.",
        "Todavía no tiene fecha de lanzamiento. Puedes añadirlo a tu lista de deseados para que te avisemos."
      ],
      options: [
        ["Ver su ficha", "@ficha:the-sundered-sky"],
        ["Otra duda", "inicio"]
      ]
    },
    info_minijuegos: {
      msg: "Hay cinco minijuegos gratis que se juegan aquí mismo, en el navegador. ¿De cuál quieres saber los controles?",
      options: [
        ["Antitronks", "info_antitronks"],
        ["Protect Mogos", "info_mogos"],
        ["Stick Drill", "info_stickdrill"],
        ["Tronk Fight", "info_tronkfight"],
        ["El Juego Miente", "info_miente"],
        ["Tengo un problema con uno", "juego"]
      ]
    },
    info_antitronks: {
      msg: [
        "Antitronks: dispara a los Antitronks sin dar a los civiles.",
        "Apunta con el ratón y haz clic para disparar. Gira la cámara con A y D. Tienes 3 vidas, y los disparos a la cabeza dan el doble de puntos."
      ],
      options: [
        ["Jugar ahora", "@jugar:antitronks"],
        ["Tengo un problema con este", "juego_tipo"],
        ["Otro minijuego", "info_minijuegos"]
      ]
    },
    info_mogos: {
      msg: [
        "Protect Mogos: protege el castillo del rey.",
        "Haz clic (o toca la pantalla) en los ninjas antes de que lleguen al castillo. Tienes 3 vidas."
      ],
      options: [
        ["Jugar ahora", "@jugar:antininja"],
        ["Tengo un problema con este", "juego_tipo"],
        ["Otro minijuego", "info_minijuegos"]
      ]
    },
    info_miente: {
      msg: [
        "El Juego Miente: arriba sale una regla y en el centro una palabra de color escrita en otro color.",
        "«Obedece a la palabra»: pulsa el color que dice. «Obedece al color»: pulsa el color en que está escrita. «Ni uno ni otro»: pulsa otro distinto. Si sale «¡No pulses nada!», espera. Teclas 1-4 o toca los botones. Tienes 3 vidas."
      ],
      options: [
        ["Jugar ahora", "@jugar:miente"],
        ["Tengo un problema con este", "juego_tipo"],
        ["Otro minijuego", "info_minijuegos"]
      ]
    },
    info_stickdrill: {
      msg: [
        "Stick Drill: esquiva el taladro que rebota por las paredes; pierde el que caiga primero.",
        "Contra el bot o a 2 jugadores. Jugador 1: W A S D. Jugador 2: flechas. En el móvil se juega con los joysticks. Tu récord es el tiempo que aguantas."
      ],
      options: [
        ["Jugar ahora", "@jugar:stickdrill"],
        ["Tengo un problema con este", "juego_tipo"],
        ["Otro minijuego", "info_minijuegos"]
      ]
    },
    info_tronkfight: {
      msg: [
        "Tronk Fight: duelo de stickmans con 7 luchadores, cada uno con su arma y su ataque especial.",
        "Contra el bot (3 dificultades) o a 2 jugadores en el mismo teclado o móvil. Jugador 1: W A S D para moverse y J K L I para atacar. Jugador 2: flechas y , . - y Mayús derecha."
      ],
      options: [
        ["Jugar ahora", "@jugar:tronkfight"],
        ["Tengo un problema con este", "juego_tipo"],
        ["Otro minijuego", "info_minijuegos"]
      ]
    },
    info_perfil: {
      msg: [
        "Con la sesión iniciada, pulsa «Cuenta» y luego «Mi perfil».",
        "Ahí puedes elegir tu avatar dibujado, cambiar tu nombre y escribir una biografía. También salen tus insignias, tus récords y tu lista de deseados.",
        "Las insignias se consiguen haciendo cosas: proponer ideas, votar, guardar récords, ganar combates en Tronk Fight… Solo se ven las que ya tienes, y cuando consigues una nueva te avisamos."
      ],
      options: [
        ["Abrir mi cuenta", "@cuenta"],
        ["Otra duda", "inicio"]
      ]
    },
    info_retos: {
      msg: [
        "Los retos de la comunidad están en Minijuegos. Por ejemplo: «entre todos, derrotad 10.000 ninjas esta semana».",
        "Cada partida que juegas con la sesión iniciada suma a la barra. Ahí ves cuánto falta, cuánto has aportado tú y el tiempo que queda. Si se supera, todos los que han ayudado reciben un aviso."
      ],
      options: [
        ["Ir a Minijuegos", "@seccion:minijuegos"],
        ["Otra duda", "inicio"]
      ]
    },
    info_deseados: {
      msg: [
        "Abre la ficha de un juego (pulsando su tarjeta) y pulsa «Lista de deseados». Si además pulsas «Avisarme cuando salga», recibirás un aviso cuando se publique o si cambia su fecha.",
        "Tu lista de deseados sale en tu perfil. Hace falta haber iniciado sesión."
      ],
      options: [
        ["Ver los juegos", "@seccion:desarrollo"],
        ["Otra duda", "inicio"]
      ]
    },
    info_notificaciones: {
      msg: [
        "La campana de arriba te avisa cuando votan tu idea, cuando el equipo le cambia el estado o te responde, cuando alguien te supera un récord, cuando cambia la fecha de un juego de tu lista y cuando el equipo envía un aviso.",
        "El número rojo son las que no has leído. Al abrir la campana se marcan como leídas."
      ],
      options: [
        ["Entendido", "fin_pregunta"],
        ["Otra duda", "inicio"]
      ]
    },
    info_app: {
      msg: [
        "Puedes instalar la web como una app con el botón «Instalar app» de la portada.",
        "En iPhone: abre la web en Safari, pulsa Compartir y luego «Añadir a pantalla de inicio». Instalada, los minijuegos funcionan incluso sin internet."
      ],
      options: [
        ["Entendido", "fin_pregunta"],
        ["Otra duda", "inicio"]
      ]
    },
    info_ajustes: {
      msg: [
        "Arriba a la derecha tienes los botones de tema (claro u oscuro), sonidos de la web (el altavoz) e idioma (ES / EN).",
        "En el ordenador también hay atajos de teclado: pulsa «?» para ver la lista. Por ejemplo, M te lleva a Minijuegos y S a Comunidad."
      ],
      options: [
        ["Entendido", "fin_pregunta"],
        ["Otra duda", "inicio"]
      ]
    },
    info_trabajar: {
      msg: [
        "¡Nos encantaría! Buscamos gente para arte, música y sonido, programación y pruebas.",
        "Al final de «Sobre nosotros» está «Trabaja con nosotros»: elige lo tuyo y cuéntanos quién eres y qué sabes hacer. Si tienes un portfolio o vídeos, añade el enlace."
      ],
      options: [
        ["Ver «Trabaja con nosotros»", "@seccion:trabaja-con-nosotros"],
        ["Otra duda", "inicio"]
      ]
    },
    info_estudio: {
      msg: [
        "TronkStudios es un estudio independiente de videojuegos: un equipo pequeño que diseña, programa y publica sus propios juegos.",
        "Hacemos juegos de todo tipo, desde modo historia hasta juegos sencillos para pasar un rato, y muchas ideas salen de las sugerencias de la comunidad.",
        "Queremos crear juegos que hagan disfrutar a la gente, una comunidad sana y cumplir lo que prometemos."
      ],
      options: [
        ["Ver «Sobre nosotros»", "@seccion:sobre-nosotros"],
        ["Otra duda", "inicio"]
      ]
    },

    /* ---------- CHARLA (para el sistema de frases) ---------- */
    saludo: {
      msg: "¿Qué pasa, Tronk? ¿En qué te puedo ayudar? Escríbeme tu duda.",
      options: [
        ["Ver los temas", "inicio"]
      ]
    },
    quien: {
      msg: [
        "Soy Tronker, el asistente de TronkStudios.",
        "Te ayudo con la web, los juegos, los minijuegos y tu cuenta. Si algo necesita a una persona, te paso con el equipo."
      ],
      options: [
        ["Ver los temas", "inicio"]
      ]
    },
    gracias: {
      msg: "¡De nada! ¿Puedo ayudarte con algo más?",
      options: [
        ["Sí, otra cosa", "inicio"],
        ["No, eso es todo", "despedida"]
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
      msg: "¡Gracias por jugar a los juegos de TronkStudios! Si vuelves a tener problemas, Tronker estará aquí.",
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
    typing.setAttribute("aria-label", "Tronker está escribiendo");
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
    } else if (destination === "@contrasena") {
      closeSupport();

      if (window.TronkAccount && typeof window.TronkAccount.openPasswordHelp === "function") {
        window.TronkAccount.openPasswordHelp();
      } else {
        document.getElementById("account-button")?.click();
      }
    } else if (destination === "@cuenta") {
      openFromChat("account-button");
    } else if (destination === "@sugerir") {
      openFromChat("new-suggestion-button");
    } else if (destination === "@cerrar") {
      closeSupport();
    } else if (destination.startsWith("@ficha:")) {
      closeSupport();
      document.querySelector(`[data-project="${destination.slice(7)}"]`)?.click();
    } else if (destination.startsWith("@jugar:")) {
      closeSupport();
      document.querySelector(`[data-minigame="${destination.slice(7)}"]`)?.click();
    } else if (destination.startsWith("@seccion:")) {
      closeSupport();
      document.getElementById(destination.slice(9))?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderOptions(stepName, options) {
    chatOptions.innerHTML = "";

    const list = options.slice();

    if (stepName === "escribir" || (chatMode === "write" && stepName !== "modo")) {
      list.push(["Prefiero elegir temas", "@modo:temas", true]);
    } else if (!["inicio", "despedida", "modo"].includes(stepName)) {
      list.push(["Volver a los temas", "inicio", true]);
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

        if (destination.startsWith("@modo:")) {
          addBubble(label, "from-user");
          setChatMode(destination === "@modo:escribir" ? "write" : "topics");
          goToStep(destination === "@modo:escribir" ? "escribir" : "inicio");
          return;
        }

        if (destination.startsWith("@")) {
          runAction(destination);
          return;
        }

        // Ir a los temas desde «escribiendo» cambia al modo de temas
        if (destination === "inicio" && chatMode === "write") {
          setChatMode("topics");
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

    if (activeModal === chatModal) {
      if (chatMode === "write") {
        chatInput?.focus({ preventScroll: true });
      } else if (first) {
        first.focus({ preventScroll: true });
      }
    }
  }

  /* ---------- Preguntas libres a la IA (Worker /chat) ---------- */

  // Conversación con la IA (solo en memoria, se borra al reiniciar)
  let aiHistory = [];
  let aiEnabled = false;

  // «choose» (aún no ha elegido), «write» (escribiendo) o «topics» (por temas)
  let chatMode = "choose";

  function setChatMode(mode) {
    chatMode = mode;

    if (chatForm) {
      chatForm.hidden = mode !== "write";
    }

    if (chatHint) {
      chatHint.textContent =
        mode === "write"
          ? "Escribe tu pregunta. La conversación no se guarda."
          : "Elige una opción para continuar. La conversación no se guarda.";
    }
  }

  // Sin IA (o si se acaba el uso gratis del día), Tronker entiende
  // las preguntas con el sistema de frases de js/tronker.js
  function setAiMode(enabled) {
    aiEnabled = enabled;

    chatStatus.textContent = enabled ? "En línea · Responde con IA" : "En línea · Respuestas rápidas";
  }

  // Responde sin IA: busca la conversación del guion que encaja
  async function answerWithPhrases(question, alreadyShown = false) {
    if (!alreadyShown) {
      addBubble(question, "from-user");
    }

    const found = window.TronkerPhrases?.match(question);

    if (found && GUION[found.step]) {
      await goToStep(found.step);
      return;
    }

    chatBusy = true;
    chatOptions.innerHTML = "";
    const typing = showTyping();
    await wait(600);
    typing.remove();
    chatBusy = false;

    addBubble(
      "No estoy seguro de haberte entendido. Ahora mismo estoy en modo de respuestas rápidas y solo entiendo preguntas sobre TronkStudios. Prueba con otras palabras, mira los temas o vuelve en un rato para preguntarme lo que quieras.",
      "from-ai"
    );
    renderOptions("ai", []);
  }

  // La IA escribe en texto plano, pero por si acaso se quitan marcas
  function cleanReply(text) {
    return String(text || "")
      .replace(/\[CONTACTO\]/g, "")
      .replace(/\*\*|__|^#+\s*/gm, "")
      .trim();
  }

  async function askTronker(question) {
    const run = chatRun;

    chatBusy = true;
    chatOptions.innerHTML = "";
    chatInput.value = "";
    chatInput.disabled = true;
    chatSend.disabled = true;

    addBubble(question, "from-user");
    aiHistory.push({ role: "user", content: question });

    const typing = showTyping();
    let reply = "";
    let failure = "";

    try {
      const response = await fetchWithTimeout(`${apiBase()}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: aiHistory.slice(-12) })
      });
      const data = await readJson(response);

      if (response.ok && typeof data.reply === "string") {
        reply = data.reply;
      } else {
        failure = response.status === 429 ? "rate" : "down";
      }
    } catch {
      failure = "down";
    }

    typing.remove();

    if (run !== chatRun) {
      return;
    }

    chatBusy = false;
    chatInput.disabled = false;
    chatSend.disabled = false;

    if (failure) {
      // La pregunta no ha tenido respuesta: no se queda en la conversación
      aiHistory.pop();

      // Si la IA no está (o se acabó el uso gratis del día), seguimos
      // con el sistema de frases el resto de la conversación
      if (failure === "down") {
        setAiMode(false);
      }

      await answerWithPhrases(question, true);
    } else {
      const needsTeam = reply.includes("[CONTACTO]");
      const text = cleanReply(reply) || "No he sabido qué responder. ¿Puedes preguntarlo de otra forma?";

      aiHistory.push({ role: "assistant", content: text });
      addBubble(text, "from-ai");
      renderOptions("ai", needsTeam ? [["Enviar un correo al equipo", "@correo"]] : []);
    }

    if (activeModal === chatModal) {
      chatInput.focus({ preventScroll: true });
    }
  }

  chatForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const question = chatInput.value.trim().slice(0, 1000);

    if (!question) {
      return;
    }

    // Si Tronker aún está escribiendo, la pregunta espera su turno
    const run = chatRun;

    for (let tries = 0; chatBusy && tries < 150; tries += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (chatBusy || run !== chatRun || chatInput.value.trim().slice(0, 1000) !== question) {
      return;
    }

    if (aiEnabled) {
      askTronker(question);
    } else {
      chatInput.value = "";
      answerWithPhrases(question).then(() => {
        if (activeModal === chatModal) {
          chatInput.focus({ preventScroll: true });
        }
      });
    }
  });

  // Intro envía; Mayús + Intro hace un salto de línea
  chatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  async function startChat() {
    chatStarted = true;
    chatRun += 1;
    chatBusy = false;
    aiHistory = [];
    chatMessages.innerHTML = "";
    chatOptions.innerHTML = "";
    chatStatus.classList.add("is-online");
    chatStatus.classList.remove("is-offline");

    const run = chatRun;
    const health = await checkHealth();

    if (run !== chatRun) {
      return;
    }

    setAiMode(Boolean(health && health.chat));
    setChatMode("choose");
    goToStep("modo");
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
        result.autoReply === true
          ? `Hemos recibido tu mensaje. Te hemos enviado un correo de confirmación a ${data.email} y te responderemos allí lo antes posible.`
          : `Hemos recibido tu mensaje. Te responderemos a ${data.email} lo antes posible.`
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
        label: "Usar mi aplicación de correo",
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
