"use strict";

/* =========================================================
   TRONKSTUDIOS - SISTEMA DE SOPORTE
   Menú «Soporte» → chat con IA o formulario de correo.

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
   * Mientras esté vacía:
   *  - el chat muestra que el servicio no está configurado;
   *  - el formulario abre la aplicación de correo del usuario.
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

  const MAX_CHAT_MESSAGE = 1000;
  const MAX_HISTORY_SENT = 12;
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
  const CONTACT_MARKER = "[CONTACTO]";

  const WELCOME_TEXT =
    "¡Hola! Soy el asistente de soporte de TronkStudios. " +
    "Puedo ayudarte con problemas en los juegos y minijuegos, errores técnicos, " +
    "tu cuenta, las sugerencias o cualquier duda sobre la web.\n\n" +
    "Soy una IA y puedo equivocarme. Si no sé resolver algo, " +
    "te propondré escribir al equipo por correo.";

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
  const chatForm = document.getElementById("support-chat-form");
  const chatInput = document.getElementById("support-chat-input");
  const chatSend = document.getElementById("support-chat-send");
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

  // Historial del chat. No se guarda en localStorage ni en ningún servidor.
  let chatHistory = [];
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

  // Oculta cosas que parecen contraseñas, tokens o claves antes de enviarlas a la IA
  function redactSecrets(text) {
    return String(text)
      .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, "[dato ocultado]")
      .replace(/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]{8,}/gi, "[dato ocultado]")
      .replace(/\b(?:sk|pk|rk)[-_][A-Za-z0-9_-]{16,}/g, "[dato ocultado]")
      .replace(/((?:contraseña|contrasena|password|passwd|clave|pass)\s*(?:es|:|=)\s*)\S+/gi, "$1[dato ocultado]");
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
    showModal(chatModal, chatInput.disabled ? null : chatInput);

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
     CHAT CON IA
     ========================================================= */

  function scrollChatToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addBubble(text, type) {
    const bubble = document.createElement("div");
    bubble.className = `support-bubble ${type}`;
    // textContent: nunca se interpreta como HTML (evita inyecciones)
    bubble.textContent = text;
    chatMessages.appendChild(bubble);
    scrollChatToBottom();
    return bubble;
  }

  function addEmailAction(bubble) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "support-bubble-action";
    action.textContent = "✉️ Enviar un correo";
    action.addEventListener("click", openMail);
    bubble.appendChild(document.createElement("br"));
    bubble.appendChild(action);
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

  function setChatStatus(text, state) {
    chatStatus.textContent = text;
    chatStatus.classList.toggle("is-online", state === "online");
    chatStatus.classList.toggle("is-offline", state === "offline");
  }

  function setChatEnabled(enabled) {
    chatInput.disabled = !enabled;
    chatSend.disabled = !enabled || chatBusy;
  }

  function showNotConfigured() {
    setChatStatus("Servicio no configurado", "offline");
    setChatEnabled(false);

    const info = addBubble(
      "El chat con IA todavía no está conectado a ningún servicio de inteligencia artificial, " +
        "así que ahora mismo no puede responder. Mientras tanto, puedes escribirnos por correo.",
      "is-info"
    );

    addEmailAction(info);
  }

  async function startChat() {
    chatStarted = true;
    chatMessages.innerHTML = "";
    chatHistory = [];

    addBubble(WELCOME_TEXT, "from-ai");

    if (!isApiConfigured()) {
      showNotConfigured();
      return;
    }

    setChatStatus("Comprobando conexión...", null);
    setChatEnabled(false);

    const health = await checkHealth();

    if (!health.reachable) {
      setChatStatus("Sin conexión con el servicio", "offline");
      setChatEnabled(true);
      addBubble(
        "No se ha podido conectar con el servicio de soporte. Puedes intentar escribir igualmente " +
          "o enviarnos un correo.",
        "is-info"
      );
      return;
    }

    if (!health.chat) {
      showNotConfigured();
      return;
    }

    setChatStatus("En línea · Asistente con IA", "online");
    setChatEnabled(true);
    chatInput.focus();
  }

  function autoResizeChatInput() {
    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
  }

  chatInput.addEventListener("input", autoResizeChatInput);

  // Enter envía; Mayús + Enter hace salto de línea
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  chatReset.addEventListener("click", () => {
    if (chatBusy) {
      return;
    }

    chatInput.value = "";
    autoResizeChatInput();
    startChat();
  });

  function chatErrorMessage(status, data) {
    if (data && data.error === "not_configured") {
      return "not_configured";
    }

    if (status === 429) {
      return "Has enviado muchos mensajes seguidos. Espera un minuto y vuelve a intentarlo.";
    }

    if (status === 400 || status === 413) {
      return "No se ha podido procesar el mensaje. Prueba a escribirlo más corto.";
    }

    return "El asistente no ha podido responder ahora mismo. Inténtalo de nuevo en unos minutos o envíanos un correo.";
  }

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (chatBusy || chatInput.disabled) {
      return;
    }

    const original = chatInput.value.trim();

    if (!original) {
      return;
    }

    if (original.length > MAX_CHAT_MESSAGE) {
      addBubble(`El mensaje es demasiado largo (máximo ${MAX_CHAT_MESSAGE} caracteres).`, "is-error");
      return;
    }

    const text = redactSecrets(original);

    addBubble(text, "from-user");

    if (text !== original) {
      addBubble(
        "He ocultado algo que parecía una contraseña o una clave. No hace falta que las compartas: el asistente nunca las necesita.",
        "is-info"
      );
    }

    chatInput.value = "";
    autoResizeChatInput();

    chatHistory.push({ role: "user", content: text });

    chatBusy = true;
    setChatEnabled(true);
    const typing = showTyping();

    try {
      const response = await fetchWithTimeout(`${apiBase()}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory.slice(-MAX_HISTORY_SENT) })
      });

      const data = await readJson(response);

      typing.remove();

      if (!response.ok || typeof data.reply !== "string" || !data.reply.trim()) {
        throw Object.assign(new Error("chat_failed"), { status: response.status, data });
      }

      let reply = data.reply.trim();
      const suggestsEmail = reply.includes(CONTACT_MARKER);
      reply = reply.split(CONTACT_MARKER).join("").trim();

      chatHistory.push({ role: "assistant", content: reply });

      const bubble = addBubble(reply, "from-ai");

      if (suggestsEmail) {
        addEmailAction(bubble);
      }

      setChatStatus("En línea · Asistente con IA", "online");
    } catch (error) {
      typing.remove();

      // Quitamos la pregunta fallida del historial para no desordenar la conversación
      chatHistory.pop();

      const message = error && error.name === "AbortError"
        ? "El asistente ha tardado demasiado en responder. Inténtalo de nuevo."
        : chatErrorMessage(error && error.status, error && error.data);

      if (message === "not_configured") {
        showNotConfigured();
      } else {
        const bubble = addBubble(message, "is-error");

        if (!error || !error.status || error.status >= 500) {
          addEmailAction(bubble);
        }
      }

      // Devolvemos el texto al campo para que no tenga que reescribirlo
      if (!chatInput.value && !chatInput.disabled) {
        chatInput.value = original;
        autoResizeChatInput();
      }
    } finally {
      chatBusy = false;
      setChatEnabled(!chatInput.disabled);

      if (!chatInput.disabled) {
        chatInput.focus();
      }
    }
  });

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
