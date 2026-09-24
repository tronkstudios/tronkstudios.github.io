"use strict";

console.log("SCRIPT NUEVO CARGADO");

/* =========================================================
   CONFIGURACIÓN SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://qjjnqhbtovjcbwgcwhgl.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_YPAglgrxaxvaqU8KSS-HkQ_scyeLigm";

let supabaseClient = null;
let currentUser = null;

if (
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  typeof window.supabase !== "undefined"
) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

/* =========================================================
   ELEMENTOS
   ========================================================= */

const accountButton =
  document.getElementById("account-button");

const themeToggle =
  document.getElementById("theme-toggle");

const yearElement =
  document.getElementById("year");

const accountModal =
  document.getElementById("account-modal");

const suggestionModal =
  document.getElementById("suggestion-modal");

const loginPanel =
  document.getElementById("login-panel");

const registerPanel =
  document.getElementById("register-panel");

const loggedPanel =
  document.getElementById("logged-panel");

const loginForm =
  document.getElementById("login-form");

const registerForm =
  document.getElementById("register-form");

const showRegisterButton =
  document.getElementById("show-register");

const showLoginButton =
  document.getElementById("show-login");

const logoutButton =
  document.getElementById("logout-button");

const authMessage =
  document.getElementById("auth-message");

const accountName =
  document.getElementById("account-name");

const accountEmail =
  document.getElementById("account-email");

const newSuggestionButton =
  document.getElementById(
    "new-suggestion-button"
  );

const footerSuggestionButton =
  document.getElementById(
    "footer-suggestion-button"
  );

const suggestionForm =
  document.getElementById(
    "suggestion-form"
  );

const suggestionMessage =
  document.getElementById(
    "suggestion-message"
  );

const suggestionName =
  document.getElementById(
    "suggestion-name"
  );

const suggestionText =
  document.getElementById(
    "suggestion-text"
  );

const characterCount =
  document.getElementById(
    "character-count"
  );

const suggestionsList =
  document.getElementById(
    "suggestions-list"
  );

const suggestionSearch =
  document.getElementById(
    "suggestion-search"
  );

const suggestionCategory =
  document.getElementById(
    "suggestion-category"
  );

const suggestionTabs =
  document.querySelectorAll(
    ".suggestion-tab"
  );

/* =========================================================
   AÑO
   ========================================================= */

if (yearElement) {
  yearElement.textContent =
    new Date().getFullYear();
}

/* =========================================================
   TEMA
   ========================================================= */

function getSavedTheme() {
  try {
    return localStorage.getItem(
      "tronkstudios-theme"
    );
  } catch {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(
      "tronkstudios-theme",
      theme
    );
  } catch {}
}

function updateThemeButton(theme) {
  if (!themeToggle) {
    return;
  }

  const icon =
    themeToggle.querySelector(
      ".theme-icon"
    );

  const label =
    themeToggle.querySelector(
      ".theme-label"
    );

  if (theme === "dark") {
    if (icon) {
      icon.textContent = "☀️";
    }

    if (label) {
      label.textContent = "Claro";
    }

    themeToggle.setAttribute(
      "aria-pressed",
      "true"
    );

    themeToggle.setAttribute(
      "aria-label",
      "Cambiar a modo claro"
    );
  } else {
    if (icon) {
      icon.textContent = "🌙";
    }

    if (label) {
      label.textContent = "Oscuro";
    }

    themeToggle.setAttribute(
      "aria-pressed",
      "false"
    );

    themeToggle.setAttribute(
      "aria-label",
      "Cambiar a modo oscuro"
    );
  }
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute(
      "data-theme",
      "dark"
    );
  } else {
    document.documentElement.setAttribute(
      "data-theme",
      "light"
    );
  }

  updateThemeButton(theme);
}

function initializeTheme() {
  const savedTheme =
    getSavedTheme();

  if (
    savedTheme === "dark" ||
    savedTheme === "light"
  ) {
    applyTheme(savedTheme);
    return;
  }

  const prefersDark =
    window.matchMedia &&
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

  applyTheme(
    prefersDark
      ? "dark"
      : "light"
  );
}

if (themeToggle) {
  themeToggle.addEventListener(
    "click",
    () => {
      const currentTheme =
        document.documentElement.getAttribute(
          "data-theme"
        ) || "light";

      const newTheme =
        currentTheme === "dark"
          ? "light"
          : "dark";

      applyTheme(newTheme);
      saveTheme(newTheme);
    }
  );
}

initializeTheme();

/* =========================================================
   MODALES
   ========================================================= */

function openModal(modal) {
  if (!modal) {
    return;
  }

  modal.classList.remove("hidden");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-open"
  );
}

function closeModal(modal) {
  if (!modal) {
    return;
  }

  modal.classList.add("hidden");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  const accountClosed =
    !accountModal ||
    accountModal.classList.contains(
      "hidden"
    );

  const suggestionClosed =
    !suggestionModal ||
    suggestionModal.classList.contains(
      "hidden"
    );

  const gameClosed =
    !document.getElementById(
      "game-details-modal"
    ) ||
    document
      .getElementById(
        "game-details-modal"
      )
      .classList.contains("hidden");

  const emailClosed =
    !document.getElementById(
      "email-confirmation-popup"
    );

  if (
    accountClosed &&
    suggestionClosed &&
    gameClosed &&
    emailClosed
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

document
  .querySelectorAll(
    "[data-close-modal]"
  )
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const modalId =
          button.getAttribute(
            "data-close-modal"
          );

        closeModal(
          document.getElementById(
            modalId
          )
        );
      }
    );
  });

document
  .querySelectorAll(
    ".modal-backdrop"
  )
  .forEach((backdrop) => {
    backdrop.addEventListener(
      "click",
      () => {
        closeModal(
          backdrop.closest(".modal")
        );
      }
    );
  });

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (
      accountModal &&
      !accountModal.classList.contains(
        "hidden"
      )
    ) {
      closeModal(accountModal);
    }

    if (
      suggestionModal &&
      !suggestionModal.classList.contains(
        "hidden"
      )
    ) {
      closeModal(
        suggestionModal
      );
    }

    const gameModal =
      document.getElementById(
        "game-details-modal"
      );

    if (
      gameModal &&
      !gameModal.classList.contains(
        "hidden"
      )
    ) {
      closeGameDetails();
    }
  }
);

/* =========================================================
   SUPABASE
   ========================================================= */

function isSupabaseConfigured() {
  return Boolean(
    supabaseClient &&
    supabaseClient.auth
  );
}

async function getCurrentUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const {
      data,
      error
    } =
      await supabaseClient.auth.getUser();

    if (error) {
      console.error(
        "Error obteniendo usuario:",
        error
      );

      return null;
    }

    return data?.user || null;
  } catch (error) {
    console.error(
      "Error obteniendo usuario:",
      error
    );

    return null;
  }
}

/* =========================================================
   MENSAJES
   ========================================================= */

function showAuthMessage(
  message,
  type = ""
) {
  if (!authMessage) {
    return;
  }

  authMessage.textContent =
    message;

  authMessage.className =
    "auth-message";

  if (type) {
    authMessage.classList.add(
      type
    );
  }
}

function showSuggestionMessage(
  message,
  type = ""
) {
  if (!suggestionMessage) {
    return;
  }

  suggestionMessage.textContent =
    message;

  suggestionMessage.className =
    "auth-message";

  if (type) {
    suggestionMessage.classList.add(
      type
    );
  }
}

/* =========================================================
   INTERFAZ CUENTA
   ========================================================= */

function showLoginPanel() {
  loginPanel?.classList.remove(
    "hidden"
  );

  registerPanel?.classList.add(
    "hidden"
  );

  loggedPanel?.classList.add(
    "hidden"
  );
}

function showRegisterPanel() {
  loginPanel?.classList.add(
    "hidden"
  );

  registerPanel?.classList.remove(
    "hidden"
  );

  loggedPanel?.classList.add(
    "hidden"
  );
}

function showLoggedPanel() {
  loginPanel?.classList.add(
    "hidden"
  );

  registerPanel?.classList.add(
    "hidden"
  );

  loggedPanel?.classList.remove(
    "hidden"
  );
}

async function updateAccountUI() {
  currentUser =
    await getCurrentUser();

  if (!currentUser) {
    showLoginPanel();

    if (accountButton) {
      accountButton.textContent =
        "👤 Cuenta";
    }

    return;
  }

  /*
   * La cuenta solo puede utilizarse
   * si el email ha sido confirmado.
   */

  if (!currentUser.email_confirmed_at) {
    currentUser = null;

    showLoginPanel();

    if (accountButton) {
      accountButton.textContent =
        "👤 Cuenta";
    }

    return;
  }

  showLoggedPanel();

  const metadata =
    currentUser.user_metadata ||
    {};

  const name =
    metadata.name ||
    metadata.full_name ||
    currentUser.email?.split(
      "@"
    )[0] ||
    "Usuario";

  if (accountName) {
    accountName.textContent =
      name;
  }

  if (accountEmail) {
    accountEmail.textContent =
      currentUser.email ||
      "Sin correo";
  }

  if (accountButton) {
    accountButton.textContent =
      `👤 ${name}`;
  }
}

/* =========================================================
   BOTÓN CUENTA
   ========================================================= */

if (accountButton) {
  accountButton.addEventListener(
    "click",
    async () => {
      showAuthMessage("");

      await updateAccountUI();

      openModal(accountModal);
    }
  );
}

/* =========================================================
   LOGIN / REGISTRO
   ========================================================= */

if (showRegisterButton) {
  showRegisterButton.addEventListener(
    "click",
    () => {
      showAuthMessage("");
      showRegisterPanel();
    }
  );
}

if (showLoginButton) {
  showLoginButton.addEventListener(
    "click",
    () => {
      showAuthMessage("");
      showLoginPanel();
    }
  );
}

/* =========================================================
   LOGIN
   ========================================================= */

if (loginForm) {
  loginForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!isSupabaseConfigured()) {
        showAuthMessage(
          "La cuenta todavía no está configurada.",
          "error"
        );

        return;
      }

      const email =
        document
          .getElementById(
            "login-email"
          )
          ?.value.trim() || "";

      const password =
        document
          .getElementById(
            "login-password"
          )
          ?.value || "";

      if (!email || !password) {
        showAuthMessage(
          "Introduce tu correo y contraseña.",
          "error"
        );

        return;
      }

      showAuthMessage(
        "Iniciando sesión..."
      );

      try {
        const {
          data,
          error
        } =
          await supabaseClient.auth.signInWithPassword(
            {
              email,
              password
            }
          );

        if (error) {
          showAuthMessage(
            error.message ||
              "No se pudo iniciar sesión.",
            "error"
          );

          return;
        }

        currentUser =
          data?.user || null;

        if (
          !currentUser?.email_confirmed_at
        ) {
          await supabaseClient.auth.signOut();

          currentUser = null;

          showAuthMessage(
            "Debes confirmar tu email antes de iniciar sesión.",
            "error"
          );

          return;
        }

        showAuthMessage(
          "Has iniciado sesión correctamente.",
          "success"
        );

        await updateAccountUI();

        setTimeout(() => {
          closeModal(
            accountModal
          );
        }, 700);
      } catch (error) {
        console.error(error);

        showAuthMessage(
          "Ha ocurrido un error al iniciar sesión.",
          "error"
        );
      }
    }
  );
}

/* =========================================================
   POPUP CONFIRMACIÓN EMAIL
   ========================================================= */

function showEmailConfirmationPopup(
  email
) {
  const oldPopup =
    document.getElementById(
      "email-confirmation-popup"
    );

  if (oldPopup) {
    oldPopup.remove();
  }

  const overlay =
    document.createElement(
      "div"
    );

  overlay.id =
    "email-confirmation-popup";

  overlay.className =
    "email-confirmation-popup";

  overlay.innerHTML = `
    <div class="email-confirmation-box">

      <div class="email-confirmation-icon">
        ✉️
      </div>

      <h2>
        Confirma tu email
      </h2>

      <p>
        Hemos enviado un email de confirmación
        ${
          email
            ? `a <strong>${escapeHtml(email)}</strong>`
            : "a tu correo"
        }.
      </p>

      <p>
        Abre el mensaje y pulsa el enlace
        de confirmación para activar tu cuenta.
      </p>

      <button
        type="button"
        id="email-confirmation-ok"
      >
        OK
      </button>

    </div>
  `;

  document.body.appendChild(
    overlay
  );

  document.body.classList.add(
    "modal-open"
  );

  const okButton =
    document.getElementById(
      "email-confirmation-ok"
    );

  if (okButton) {
    okButton.addEventListener(
      "click",
      () => {
        overlay.remove();

        document.body.classList.remove(
          "modal-open"
        );
      }
    );
  }
}

/* =========================================================
   CREAR CUENTA
   ========================================================= */

if (registerForm) {
  registerForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!isSupabaseConfigured()) {
        showAuthMessage(
          "La cuenta todavía no está configurada.",
          "error"
        );

        return;
      }

      const name =
        document
          .getElementById(
            "register-name"
          )
          ?.value.trim() || "";

      const email =
        document
          .getElementById(
            "register-email"
          )
          ?.value.trim() || "";

      const password =
        document
          .getElementById(
            "register-password"
          )
          ?.value || "";

      if (
        !name ||
        !email ||
        !password
      ) {
        showAuthMessage(
          "Completa todos los campos.",
          "error"
        );

        return;
      }

      showAuthMessage(
        "Creando cuenta..."
      );

      try {
        const {
          data,
          error
        } =
          await supabaseClient.auth.signUp(
            {
              email,
              password,

              options: {
                data: {
                  name
                },

                emailRedirectTo:
                  "https://tronkstudios.github.io/TronkWeb/"
              }
            }
          );

        if (error) {
          showAuthMessage(
            error.message ||
              "No se pudo crear la cuenta.",
            "error"
          );

          return;
        }

        currentUser = null;

        registerForm.reset();

        showAuthMessage("");

        closeModal(
          accountModal
        );

        showEmailConfirmationPopup(
          email
        );

      } catch (error) {
        console.error(error);

        showAuthMessage(
          "Ha ocurrido un error al crear la cuenta.",
          "error"
        );
      }
    }
  );
}

/* =========================================================
   LOGOUT
   ========================================================= */

if (logoutButton) {
  logoutButton.addEventListener(
    "click",
    async () => {
      if (!isSupabaseConfigured()) {
        currentUser = null;
        showLoginPanel();
        return;
      }

      try {
        const {
          error
        } =
          await supabaseClient.auth.signOut();

        if (error) {
          showAuthMessage(
            error.message ||
              "No se pudo cerrar sesión.",
            "error"
          );

          return;
        }

        currentUser = null;

        showLoginPanel();

        showAuthMessage(
          "Sesión cerrada correctamente.",
          "success"
        );

        if (accountButton) {
          accountButton.textContent =
            "👤 Cuenta";
        }

      } catch (error) {
        console.error(error);

        showAuthMessage(
          "Ha ocurrido un error al cerrar sesión.",
          "error"
        );
      }
    }
  );
}

/* =========================================================
   AUTH STATE
   ========================================================= */

if (isSupabaseConfigured()) {
  supabaseClient.auth.onAuthStateChange(
    (event, session) => {
      currentUser =
        session?.user || null;

      updateAccountUI();
    }
  );
}

/* =========================================================
   SUGERENCIAS
   ========================================================= */

function openSuggestionModal() {
  showSuggestionMessage("");

  if (suggestionForm) {
    suggestionForm.reset();
  }

  updateCharacterCounter();

  openModal(suggestionModal);
}

if (newSuggestionButton) {
  newSuggestionButton.addEventListener(
    "click",
    openSuggestionModal
  );
}

if (footerSuggestionButton) {
  footerSuggestionButton.addEventListener(
    "click",
    openSuggestionModal
  );
}

/* =========================================================
   CONTADOR
   ========================================================= */

function updateCharacterCounter() {
  if (
    !suggestionText ||
    !characterCount
  ) {
    return;
  }

  characterCount.textContent =
    suggestionText.value.length;
}

if (suggestionText) {
  suggestionText.addEventListener(
    "input",
    updateCharacterCounter
  );
}

updateCharacterCounter();

/* =========================================================
   CARGAR SUGERENCIAS
   ========================================================= */

async function loadSuggestions() {
  if (!suggestionsList) {
    return;
  }

  if (!isSupabaseConfigured()) {
    suggestionsList.innerHTML = `
      <div class="suggestions-loading">
        Configura Supabase para mostrar las sugerencias.
      </div>
    `;

    return;
  }

  suggestionsList.innerHTML = `
    <div class="suggestions-loading">
      Cargando sugerencias...
    </div>
  `;

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("suggestions")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {
      console.error(
        "Error cargando sugerencias:",
        error
      );

      suggestionsList.innerHTML = `
        <div class="suggestions-loading">
          No se pudieron cargar las sugerencias.
        </div>
      `;

      return;
    }

    renderSuggestions(
      data || []
    );

  } catch (error) {
    console.error(error);

    suggestionsList.innerHTML = `
      <div class="suggestions-loading">
        No se pudieron cargar las sugerencias.
      </div>
    `;
  }
}

/* =========================================================
   RENDER SUGERENCIAS
   ========================================================= */

let allSuggestions = [];
let currentSuggestionTab =
  "all";

function renderSuggestions(
  suggestions
) {
  allSuggestions =
    suggestions;

  if (!suggestionsList) {
    return;
  }

  let filtered = [
    ...allSuggestions
  ];

  const search =
    suggestionSearch?.value
      .trim()
      .toLowerCase() || "";

  const category =
    suggestionCategory?.value ||
    "Todas";

  if (
    currentSuggestionTab ===
    "mine"
  ) {
    if (!currentUser) {
      filtered = [];
    } else {
      filtered =
        filtered.filter(
          (suggestion) =>
            suggestion.user_id ===
            currentUser.id
        );
    }
  }

  if (
    category !== "Todas"
  ) {
    filtered =
      filtered.filter(
        (suggestion) =>
          suggestion.category ===
          category
      );
  }

  if (search) {
    filtered =
      filtered.filter(
        (suggestion) => {
          const text =
            `${suggestion.name || ""} ${
              suggestion.idea || ""
            } ${
              suggestion.category ||
              ""
            }`.toLowerCase();

          return text.includes(
            search
          );
        }
      );
  }

  if (
    filtered.length === 0
  ) {
    suggestionsList.innerHTML = `
      <div class="suggestions-loading">
        No hay sugerencias para mostrar.
      </div>
    `;

    return;
  }

  suggestionsList.innerHTML =
    "";

  filtered.forEach(
    (suggestion) => {
      const card =
        createSuggestionCard(
          suggestion
        );

      suggestionsList.appendChild(
        card
      );
    }
  );
}

/* =========================================================
   TARJETA SUGERENCIA
   ========================================================= */

function createSuggestionCard(
  suggestion
) {
  const article =
    document.createElement(
      "article"
    );

  article.className =
    "suggestion-card";

  const header =
    document.createElement(
      "div"
    );

  header.className =
    "suggestion-header";

  const author =
    document.createElement(
      "strong"
    );

  author.className =
    "suggestion-author";

  author.textContent =
    suggestion.name ||
    "Usuario";

  const date =
    document.createElement(
      "span"
    );

  date.className =
    "suggestion-date";

  date.textContent =
    formatDate(
      suggestion.created_at
    );

  header.appendChild(author);
  header.appendChild(date);

  const category =
    document.createElement(
      "span"
    );

  category.className =
    "suggestion-category-badge";

  category.textContent =
    suggestion.category ||
    "Sin categoría";

  const text =
    document.createElement(
      "p"
    );

  text.className =
    "suggestion-text";

  text.textContent =
    suggestion.idea || "";

  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "suggestion-actions";

  const voteButton =
    document.createElement(
      "button"
    );

  voteButton.type = "button";

  voteButton.className =
    "vote-button";

  voteButton.textContent =
    `👍 ${Number(
      suggestion.votes || 0
    )}`;

  voteButton.addEventListener(
    "click",
    () => {
      voteSuggestion(
        suggestion,
        voteButton
      );
    }
  );

  actions.appendChild(
    voteButton
  );

  if (
    currentUser &&
    suggestion.user_id ===
      currentUser.id
  ) {
    const deleteButton =
      document.createElement(
        "button"
      );

    deleteButton.type =
      "button";

    deleteButton.className =
      "delete-suggestion-button";

    deleteButton.textContent =
      "Eliminar";

    deleteButton.addEventListener(
      "click",
      () => {
        deleteSuggestion(
          suggestion.id
        );
      }
    );

    actions.appendChild(
      deleteButton
    );
  }

  article.appendChild(
    header
  );

  article.appendChild(
    category
  );

  article.appendChild(
    text
  );

  article.appendChild(
    actions
  );

  return article;
}

/* =========================================================
   FECHA
   ========================================================= */

function formatDate(
  dateString
) {
  if (!dateString) {
    return "";
  }

  const date =
    new Date(dateString);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleDateString(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  );
}

/* =========================================================
   ENVIAR SUGERENCIA
   ========================================================= */

if (suggestionForm) {
  suggestionForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (
        !isSupabaseConfigured()
      ) {
        showSuggestionMessage(
          "Las sugerencias todavía no están configuradas porque falta conectar Supabase.",
          "error"
        );

        return;
      }

      const user =
        await getCurrentUser();

      if (!user) {
        showSuggestionMessage(
          "Necesitas iniciar sesión para enviar una sugerencia.",
          "error"
        );

        return;
      }

      const name =
        suggestionName?.value.trim() ||
        "";

      const categoryInput =
        document.getElementById(
          "suggestion-category-input"
        );

      const category =
        categoryInput?.value ||
        "Juego";

      const idea =
        suggestionText?.value.trim() ||
        "";

      if (!name || !idea) {
        showSuggestionMessage(
          "Completa todos los campos.",
          "error"
        );

        return;
      }

      showSuggestionMessage(
        "Enviando sugerencia..."
      );

      try {
        const {
          error
        } =
          await supabaseClient
            .from("suggestions")
            .insert({
              user_id: user.id,
              name,
              category,
              idea,
              votes: 0
            });

        if (error) {
          console.error(error);

          showSuggestionMessage(
            error.message ||
              "No se pudo enviar la sugerencia.",
            "error"
          );

          return;
        }

        showSuggestionMessage(
          "¡Sugerencia enviada correctamente!",
          "success"
        );

        suggestionForm.reset();

        updateCharacterCounter();

        await loadSuggestions();

        setTimeout(() => {
          closeModal(
            suggestionModal
          );
        }, 800);

      } catch (error) {
        console.error(error);

        showSuggestionMessage(
          "Ha ocurrido un error al enviar la sugerencia.",
          "error"
        );
      }
    }
  );
}

/* =========================================================
   VOTOS / LIKES
   ========================================================= */

async function voteSuggestion(
  suggestion,
  voteButton
) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const user =
    await getCurrentUser();

  if (!user) {
    alert(
      "Necesitas iniciar sesión para votar."
    );

    return;
  }

  if (voteButton) {
    voteButton.disabled = true;
  }

  try {
    const {
      data: existingLike,
      error: checkError
    } =
      await supabaseClient
        .from("Likes")
        .select("id")
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "project_id",
          suggestion.id
        )
        .maybeSingle();

    if (checkError) {
      console.error(
        "Error comprobando el voto:",
        checkError
      );

      alert(
        "No se ha podido comprobar tu voto."
      );

      return;
    }

    if (existingLike) {
      alert(
        "Ya has votado esta sugerencia."
      );

      return;
    }

    const {
      error: likeError
    } =
      await supabaseClient
        .from("Likes")
        .insert({
          user_id: user.id,
          project_id:
            suggestion.id
        });

    if (likeError) {
      console.error(
        "Error creando el voto:",
        likeError
      );

      if (
        likeError.code ===
        "23505"
      ) {
        alert(
          "Ya has votado esta sugerencia."
        );
      } else {
        alert(
          "No se ha podido registrar tu voto."
        );
      }

      return;
    }

    const newVotes =
      Number(
        suggestion.votes || 0
      ) + 1;

    const {
      error: updateError
    } =
      await supabaseClient
        .from("suggestions")
        .update({
          votes: newVotes
        })
        .eq(
          "id",
          suggestion.id
        );

    if (updateError) {
      console.error(
        "Error actualizando los votos:",
        updateError
      );

      return;
    }

    await loadSuggestions();

  } catch (error) {
    console.error(
      "Error votando:",
      error
    );

  } finally {
    if (voteButton) {
      voteButton.disabled = false;
    }
  }
}

/* =========================================================
   ELIMINAR SUGERENCIA
   ========================================================= */

async function deleteSuggestion(
  id
) {
  if (!isSupabaseConfigured()) {
    return;
  }

  if (!currentUser) {
    return;
  }

  const confirmed =
    window.confirm(
      "¿Seguro que quieres eliminar esta sugerencia?"
    );

  if (!confirmed) {
    return;
  }

  try {
    const {
      error
    } =
      await supabaseClient
        .from("suggestions")
        .delete()
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          currentUser.id
        );

    if (error) {
      console.error(error);
      return;
    }

    await loadSuggestions();

  } catch (error) {
    console.error(error);
  }
}

/* =========================================================
   PESTAÑAS SUGERENCIAS
   ========================================================= */

suggestionTabs.forEach(
  (tab) => {
    tab.addEventListener(
      "click",
      () => {
        suggestionTabs.forEach(
          (item) => {
            item.classList.remove(
              "active"
            );
          }
        );

        tab.classList.add(
          "active"
        );

        currentSuggestionTab =
          tab.dataset.tab ||
          "all";

        renderSuggestions(
          allSuggestions
        );
      }
    );
  }
);

/* =========================================================
   BUSCAR
   ========================================================= */

if (suggestionSearch) {
  suggestionSearch.addEventListener(
    "input",
    () => {
      renderSuggestions(
        allSuggestions
      );
    }
  );
}

/* =========================================================
   FILTRO
   ========================================================= */

if (suggestionCategory) {
  suggestionCategory.addEventListener(
    "change",
    () => {
      renderSuggestions(
        allSuggestions
      );
    }
  );
}

/* =========================================================
   INFORMACIÓN DE Z TRONKS
   ========================================================= */

const zTronksGame = {
  id: "z-tronks",

  name: "Z Tronks",

  category: "Roblox",

  image: "z-tronks.png",

  releaseDate: "4 de enero de 2027",

  peopleWorking: 5,

  description: `
    <p>
      <strong>Z Tronks</strong> es un juego de acción y supervivencia
      ambientado en un mundo devastado por un apocalipsis zombi.
      Los jugadores deberán explorar una ciudad abandonada,
      enfrentarse a diferentes tipos de zombis, completar misiones
      y conseguir experiencia y recursos para mejorar a su personaje.
    </p>

    <p>
      Cada jugador podrá elegir entre distintas clases, como
      <strong>Gunner, Warrior, Rogue y Medic</strong>, cada una con
      sus propias armas, habilidades y estilos de combate.
      A medida que avances, podrás desbloquear nuevas habilidades,
      conseguir mejor equipamiento y enfrentarte a enemigos cada
      vez más peligrosos.
    </p>

    <p>
      <strong>
        Forma un equipo con tus amigos, sobrevive al apocalipsis
        y conviértete en uno de los supervivientes más poderosos
        de Z Tronks.
      </strong>
    </p>
  `
};

/* =========================================================
   CREAR MODAL DE JUEGO
   ========================================================= */

function createGameDetailsModal() {
  if (
    document.getElementById(
      "game-details-modal"
    )
  ) {
    return;
  }

  const modal =
    document.createElement(
      "div"
    );

  modal.id =
    "game-details-modal";

  modal.className =
    "game-details-modal hidden";

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  modal.innerHTML = `
    <div
      class="game-details-backdrop"
      data-game-close
    ></div>

    <div
      class="game-details-box"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-details-title"
    >

      <button
        type="button"
        class="game-details-close"
        id="game-details-close"
        aria-label="Cerrar"
      >
        ×
      </button>

      <div
        class="game-details-image-container"
      >
        <img
          id="game-details-image"
          src=""
          alt=""
        >
      </div>

      <div
        class="game-details-content"
      >

        <span
          id="game-details-category"
          class="game-details-category"
        ></span>

        <h2
          id="game-details-title"
        ></h2>

        <div
          class="game-details-info"
        >

          <div>
            <span>
              Fecha de salida
            </span>

            <strong
              id="game-details-release"
            ></strong>
          </div>

          <div>
            <span>
              Personas trabajando
            </span>

            <strong
              id="game-details-team"
            ></strong>
          </div>

        </div>

        <div
          id="game-details-description"
          class="game-details-description"
        ></div>

      </div>

    </div>
  `;

  document.body.appendChild(
    modal
  );

  const closeButton =
    document.getElementById(
      "game-details-close"
    );

  if (closeButton) {
    closeButton.addEventListener(
      "click",
      closeGameDetails
    );
  }

  const backdrop =
    modal.querySelector(
      "[data-game-close]"
    );

  if (backdrop) {
    backdrop.addEventListener(
      "click",
      closeGameDetails
    );
  }
}

/* =========================================================
   ABRIR INFORMACIÓN DEL JUEGO
   ========================================================= */

function openGameDetails(
  game
) {
  createGameDetailsModal();

  const modal =
    document.getElementById(
      "game-details-modal"
    );

  const image =
    document.getElementById(
      "game-details-image"
    );

  const title =
    document.getElementById(
      "game-details-title"
    );

  const category =
    document.getElementById(
      "game-details-category"
    );

  const release =
    document.getElementById(
      "game-details-release"
    );

  const team =
    document.getElementById(
      "game-details-team"
    );

  const description =
    document.getElementById(
      "game-details-description"
    );

  if (!modal) {
    return;
  }

  if (image) {
    image.src = game.image;

    image.alt =
      `${game.name} - ${game.category}`;
  }

  if (title) {
    title.textContent =
      game.name;
  }

  if (category) {
    category.textContent =
      game.category;
  }

  if (release) {
    release.textContent =
      game.releaseDate;
  }

  if (team) {
    team.textContent =
      `${game.peopleWorking} personas`;
  }

  if (description) {
    description.innerHTML =
      game.description;
  }

  modal.classList.remove(
    "hidden"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-open"
  );
}

/* =========================================================
   CERRAR INFORMACIÓN DEL JUEGO
   ========================================================= */

function closeGameDetails() {
  const modal =
    document.getElementById(
      "game-details-modal"
    );

  if (!modal) {
    return;
  }

  modal.classList.add(
    "hidden"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  const accountClosed =
    !accountModal ||
    accountModal.classList.contains(
      "hidden"
    );

  const suggestionClosed =
    !suggestionModal ||
    suggestionModal.classList.contains(
      "hidden"
    );

  const emailClosed =
    !document.getElementById(
      "email-confirmation-popup"
    );

  if (
    accountClosed &&
    suggestionClosed &&
    emailClosed
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

/* =========================================================
   ACTIVAR TARJETA Z TRONKS
   ========================================================= */

function initializeZTronksCard() {
  const cards =
    document.querySelectorAll(
      ".dev-card"
    );

  cards.forEach((card) => {
    const title =
      card.querySelector("h3");

    if (
      !title ||
      title.textContent.trim() !==
        "Z Tronks"
    ) {
      return;
    }

    /*
     * La descripción no se muestra
     * directamente en la tarjeta.
     * La información completa aparece
     * únicamente al hacer clic.
     */

    const description =
      card.querySelector(
        ".dev-card-description"
      );

    if (description) {
      description.remove();
    }

    card.setAttribute(
      "role",
      "button"
    );

    card.setAttribute(
      "tabindex",
      "0"
    );

    card.setAttribute(
      "aria-label",
      "Ver información de Z Tronks"
    );

    card.addEventListener(
      "click",
      () => {
        openGameDetails(
          zTronksGame
        );
      }
    );

    card.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();

          openGameDetails(
            zTronksGame
          );
        }
      }
    );
  });
}

/* =========================================================
   MINIJUEGOS
   ========================================================= */

function initializeMinigames() {
  /*
   * La sección de Minijuegos se mantiene
   * vacía hasta que haya minijuegos disponibles.
   *
   * Z Tronks NO se añade aquí porque es un
   * juego en desarrollo.
   */

  const gamesSection =
    document.getElementById(
      "minijuegos"
    );

  if (!gamesSection) {
    return;
  }

  const gamesGrid =
    gamesSection.querySelector(
      ".games-grid"
    );

  if (!gamesGrid) {
    return;
  }

  gamesGrid.innerHTML = "";
}

/* =========================================================
   PROYECTOS
   ========================================================= */

function initializeProjects() {
  initializeZTronksCard();
}

/* =========================================================
   ESCAPAR HTML
   ========================================================= */

function escapeHtml(
  value
) {
  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    value;

  return div.innerHTML;
}

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

createGameDetailsModal();

initializeProjects();

initializeMinigames();

loadSuggestions();

updateAccountUI();

console.log(
  "TronkStudios: script cargado correctamente."
);