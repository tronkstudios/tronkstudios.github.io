"use strict";

/* =========================================================
   TRONKSTUDIOS - SCRIPT PRINCIPAL
   ========================================================= */

console.log("TronkStudios: script cargado correctamente.");

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
   ELEMENTOS GENERALES
   ========================================================= */

const accountButton =
  document.getElementById("account-button");

const themeToggle =
  document.getElementById("theme-toggle");

const yearElement =
  document.getElementById("year");

/* =========================================================
   MODALES
   ========================================================= */

const accountModal =
  document.getElementById("account-modal");

const suggestionModal =
  document.getElementById("suggestion-modal");

/* =========================================================
   CUENTA
   ========================================================= */

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

/* =========================================================
   SUGERENCIAS
   ========================================================= */

const newSuggestionButton =
  document.getElementById("new-suggestion-button");

const footerSuggestionButton =
  document.getElementById("footer-suggestion-button");

const suggestionForm =
  document.getElementById("suggestion-form");

const suggestionMessage =
  document.getElementById("suggestion-message");

const suggestionName =
  document.getElementById("suggestion-name");

const suggestionText =
  document.getElementById("suggestion-text");

const characterCount =
  document.getElementById("character-count");

const suggestionsList =
  document.getElementById("suggestions-list");

const suggestionSearch =
  document.getElementById("suggestion-search");

const suggestionCategory =
  document.getElementById("suggestion-category");

const suggestionTabs =
  document.querySelectorAll(".suggestion-tab");

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
  } catch {
    // LocalStorage no disponible.
  }
}

function updateThemeButton(theme) {
  if (!themeToggle) {
    return;
  }

  const icon =
    themeToggle.querySelector(".theme-icon");

  const label =
    themeToggle.querySelector(".theme-label");

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
    prefersDark ? "dark" : "light"
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
   MODALES GENERALES
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

  const suggestionsClosed =
    !suggestionModal ||
    suggestionModal.classList.contains(
      "hidden"
    );

  if (
    accountClosed &&
    suggestionsClosed
  ) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

document
  .querySelectorAll("[data-close-modal]")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const modalId =
          button.getAttribute(
            "data-close-modal"
          );

        const modal =
          document.getElementById(
            modalId
          );

        closeModal(modal);
      }
    );
  });

document
  .querySelectorAll(".modal-backdrop")
  .forEach((backdrop) => {
    backdrop.addEventListener(
      "click",
      () => {
        const modal =
          backdrop.closest(".modal");

        closeModal(modal);
      }
    );
  });

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
    const result =
      await supabaseClient.auth.getUser();

    if (
      !result ||
      !result.data
    ) {
      return null;
    }

    return result.data.user || null;
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
    authMessage.classList.add(type);
  }
}

function showVerificationSentMessage(email) {
  if (!authMessage) {
    return;
  }

  authMessage.className = "verification-message";

  authMessage.innerHTML = `
    <div class="verification-card">
      <div class="verification-heading">
        <span class="verification-icon">✉️</span>
        <span>¡Revisa tu correo!</span>
      </div>

      <p>
        Te hemos enviado un correo de verificación a
        <strong>${escapeHtml(email)}</strong>.
        Confirma tu cuenta haciendo clic en el enlace
        antes de iniciar sesión.
      </p>

      <span class="verification-badge">
        Correo enviado
      </span>
    </div>
  `;
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
   PANELES DE CUENTA
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

/* =========================================================
   ACTUALIZAR CUENTA
   ========================================================= */

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

  showLoggedPanel();

  const metadata =
    currentUser.user_metadata || {};

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
   CAMBIAR LOGIN / REGISTRO
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
          "La cuenta todavía no está configurada. Primero hay que conectar Supabase.",
          "error"
        );

        return;
      }

      const emailInput =
        document.getElementById(
          "login-email"
        );

      const passwordInput =
        document.getElementById(
          "login-password"
        );

      const email =
        emailInput?.value.trim() ||
        "";

      const password =
        passwordInput?.value ||
        "";

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
   REGISTRO
   ========================================================= */

if (registerForm) {
  registerForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!isSupabaseConfigured()) {
        showAuthMessage(
          "La cuenta todavía no está configurada. Primero hay que conectar Supabase.",
          "error"
        );

        return;
      }

      const nameInput =
        document.getElementById(
          "register-name"
        );

      const emailInput =
        document.getElementById(
          "register-email"
        );

      const passwordInput =
        document.getElementById(
          "register-password"
        );

      const name =
        nameInput?.value.trim() ||
        "";

      const email =
        emailInput?.value.trim() ||
        "";

      const password =
        passwordInput?.value ||
        "";

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
                // Al confirmar el correo, vuelve a esta misma página
                // (antes Supabase mandaba a una dirección que daba 404).
                emailRedirectTo:
                  window.location.origin +
                  window.location.pathname,
                data: {
                  name
                }
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

        currentUser =
          data?.user || null;

        if (data?.session) {
          // Si el proyecto de Supabase NO exige
          // confirmación de correo, el usuario
          // queda logueado al instante.
          showAuthMessage(
            "Cuenta creada correctamente.",
            "success"
          );
        } else {
          // Caso normal: hay que verificar el
          // correo antes de poder iniciar sesión.
          showVerificationSentMessage(email);
        }

        registerForm.reset();

        await updateAccountUI();
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
   CERRAR SESIÓN
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
   CAMBIO DE ESTADO SUPABASE
   ========================================================= */

if (isSupabaseConfigured()) {
  supabaseClient.auth.onAuthStateChange(
    async (
      event,
      session
    ) => {
      currentUser =
        session?.user || null;

      await updateAccountUI();

      if (
        typeof renderSuggestions ===
        "function"
      ) {
        renderSuggestions(
          allSuggestions
        );
      }
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

  openModal(
    suggestionModal
  );
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

let allSuggestions = [];
let currentSuggestionTab =
  "all";

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
   RENDERIZAR SUGERENCIAS
   ========================================================= */

function renderSuggestions(
  suggestions
) {
  allSuggestions =
    suggestions || [];

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
      suggestionsList.appendChild(
        createSuggestionCard(
          suggestion
        )
      );
    }
  );
}

/* =========================================================
   TARJETA DE SUGERENCIA
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

  header.appendChild(
    author
  );

  header.appendChild(
    date
  );

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

  voteButton.type =
    "button";

  voteButton.className =
    "vote-button";

  voteButton.textContent =
    `👍 ${
      suggestion.votes || 0
    }`;

  voteButton.addEventListener(
    "click",
    () => {
      voteSuggestion(
        suggestion
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

      if (!isSupabaseConfigured()) {
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
   VOTAR
   ========================================================= */

async function voteSuggestion(
  suggestion
) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const newVotes =
    Number(
      suggestion.votes || 0
    ) + 1;

  try {
    const {
      error
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

    if (error) {
      console.error(
        "Error votando:",
        error
      );

      return;
    }

    await loadSuggestions();
  } catch (error) {
    console.error(error);
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
        .eq("id", id)
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
   PESTAÑAS DE SUGERENCIAS
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
   BUSCADOR
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
   PROYECTOS
   ========================================================= */

function initializeProjects() {
  const projectCards =
    document.querySelectorAll(
      ".dev-card:not(.minigame-card)"
    );

  projectCards.forEach(
    (card) => {
      card.style.cursor =
        "pointer";

      card.addEventListener(
        "click",
        () => {
          const title =
            card.querySelector(
              "h3"
            )?.textContent ||
            "Proyecto";

          const description =
            card.querySelector(
              "p:not(.dev-card-category)"
            )?.textContent ||
            "Sin descripción.";

          const existingDetails =
            card.querySelector(
              ".project-details"
            );

          if (
            existingDetails
          ) {
            existingDetails.remove();
            return;
          }

          const details =
            document.createElement(
              "div"
            );

          details.className =
            "project-details";

          details.innerHTML = `
            <p>
              <strong>Proyecto:</strong>
              ${escapeHtml(title)}
            </p>

            <p>
              <strong>Descripción:</strong>
              ${escapeHtml(description)}
            </p>

            <p>
              <strong>Lanzamiento previsto:</strong>
              Por determinar
            </p>

            <p>
              <strong>Personas trabajando:</strong>
              Por determinar
            </p>
          `;

          card.appendChild(
            details
          );
        }
      );
    }
  );
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

/* =========================================================
   SONIDO DE LOS MINIJUEGOS (música de piano + efectos)
   Todo se genera con Web Audio: no hace falta subir archivos
   de audio al repositorio.
   ========================================================= */

const TronkSound = (() => {
  const MUTE_KEY = "tronk-sound-muted";

  let ctx = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let reverb = null;
  let noiseBuffer = null;

  let muted = false;

  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }

  /* ---------------- Inicialización ---------------- */

  // Se llama al hacer clic (los navegadores no dejan sonar nada antes).
  function ensure() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;

    if (!AudioCtx) {
      return null;
    }

    if (!ctx) {
      ctx = new AudioCtx();

      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.85;
      master.connect(ctx.destination);

      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.9;
      sfxBus.connect(master);

      musicBus = ctx.createGain();
      musicBus.gain.value = 0.0;
      musicBus.connect(master);

      // Reverb suave para el piano.
      reverb = ctx.createConvolver();
      reverb.buffer = makeImpulse(2.6);
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      reverb.connect(wet);
      wet.connect(musicBus);

      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    return ctx;
  }

  function makeImpulse(seconds) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);

      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
      }
    }

    return impulse;
  }

  /* ---------------- Silenciar ---------------- */

  function setMuted(value) {
    muted = value;

    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // LocalStorage no disponible.
    }

    if (master && ctx) {
      master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05);
    }

    document.querySelectorAll(".game-sound-toggle").forEach((button) => {
      button.textContent = muted ? "🔇" : "🔊";
      button.setAttribute("aria-label", muted ? "Activar sonido" : "Silenciar");
      button.setAttribute("aria-pressed", muted ? "true" : "false");
    });
  }

  function isMuted() {
    return muted;
  }

  /* ---------------- Piezas básicas ---------------- */

  function tone({
    freq = 440,
    to = null,
    type = "sine",
    dur = 0.2,
    vol = 0.2,
    attack = 0.005,
    delay = 0,
    filter = null
  }) {
    if (!ensure()) {
      return;
    }

    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    if (to) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    }

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let node = osc;

    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filter;
      osc.connect(f);
      node = f;
    }

    node.connect(gain);
    gain.connect(sfxBus);

    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise({
    dur = 0.2,
    vol = 0.2,
    type = "lowpass",
    freq = 1000,
    to = null,
    q = 1,
    delay = 0,
    attack = 0.003
  }) {
    if (!ensure()) {
      return;
    }

    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    src.buffer = noiseBuffer;
    src.loop = true;

    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t);

    if (to) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    }

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxBus);

    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  /* ---------------- Efectos de sonido ---------------- */

  const SFX = {
    // ---- Antitronks ----
    gunshot() {
      noise({ dur: 0.14, vol: 0.55, type: "bandpass", freq: 2200, to: 500, q: 0.7 });
      tone({ freq: 160, to: 45, type: "sine", dur: 0.16, vol: 0.6 });
      noise({ dur: 0.5, vol: 0.08, type: "lowpass", freq: 900, to: 200, delay: 0.03, attack: 0.02 });
    },

    enemyShot() {
      noise({ dur: 0.2, vol: 0.35, type: "lowpass", freq: 1500, to: 300 });
      tone({ freq: 120, to: 40, dur: 0.2, vol: 0.4 });
      noise({ dur: 0.6, vol: 0.06, type: "lowpass", freq: 600, delay: 0.05, attack: 0.03 });
    },

    hitBody() {
      tone({ freq: 210, to: 80, dur: 0.14, vol: 0.4 });
      noise({ dur: 0.09, vol: 0.25, type: "lowpass", freq: 700 });
    },

    headshot() {
      SFX.hitBody();
      tone({ freq: 1320, dur: 0.35, vol: 0.12, type: "triangle", delay: 0.04 });
      tone({ freq: 1980, dur: 0.3, vol: 0.07, type: "sine", delay: 0.07 });
    },

    woodHit() {
      tone({ freq: 340, to: 170, type: "triangle", dur: 0.09, vol: 0.35 });
      noise({ dur: 0.06, vol: 0.2, type: "bandpass", freq: 1100, q: 2 });
    },

    ricochet() {
      tone({ freq: 2600, to: 900, type: "sine", dur: 0.18, vol: 0.05 });
      noise({ dur: 0.06, vol: 0.08, type: "highpass", freq: 3000 });
    },

    enemyAppear() {
      noise({ dur: 0.18, vol: 0.05, type: "bandpass", freq: 500, to: 1400, q: 1.5, attack: 0.05 });
    },

    warning() {
      tone({ freq: 880, dur: 0.07, vol: 0.08, type: "square", filter: 2000 });
    },

    playerHurt() {
      tone({ freq: 95, to: 55, type: "sawtooth", dur: 0.4, vol: 0.22, filter: 500 });
      noise({ dur: 0.25, vol: 0.2, type: "lowpass", freq: 400 });
    },

    civilian() {
      tone({ freq: 440, to: 330, type: "triangle", dur: 0.22, vol: 0.14 });
      tone({ freq: 330, to: 220, type: "triangle", dur: 0.3, vol: 0.14, delay: 0.22 });
    },

    // ---- Protect Mogos ----
    pop() {
      tone({ freq: 420, to: 1100, type: "sine", dur: 0.09, vol: 0.3 });
      noise({ dur: 0.22, vol: 0.12, type: "lowpass", freq: 1200, to: 300, delay: 0.03 });
    },

    clank() {
      tone({ freq: 820, type: "square", dur: 0.16, vol: 0.08, filter: 3000 });
      tone({ freq: 1230, type: "triangle", dur: 0.22, vol: 0.1 });
      noise({ dur: 0.05, vol: 0.15, type: "highpass", freq: 2500 });
    },

    flip() {
      noise({ dur: 0.35, vol: 0.12, type: "bandpass", freq: 400, to: 2600, q: 2, attack: 0.05 });
      tone({ freq: 260, to: 720, type: "sine", dur: 0.3, vol: 0.12 });
    },

    escaped() {
      tone({ freq: 1047, type: "triangle", dur: 0.18, vol: 0.12 });
      tone({ freq: 1319, type: "triangle", dur: 0.25, vol: 0.12, delay: 0.1 });
    },

    castleHit() {
      tone({ freq: 130, to: 45, dur: 0.45, vol: 0.55 });
      noise({ dur: 0.35, vol: 0.25, type: "lowpass", freq: 350 });
      tone({ freq: 640, to: 300, type: "triangle", dur: 0.28, vol: 0.12, delay: 0.1 });
    },

    swish() {
      noise({ dur: 0.07, vol: 0.05, type: "bandpass", freq: 2200, q: 1 });
    },

    // ---- Stick Drill ----
    drillBounce() {
      tone({ freq: 980, to: 520, type: "triangle", dur: 0.09, vol: 0.09 });
      noise({ dur: 0.05, vol: 0.1, type: "highpass", freq: 2800 });
    },

    drillWarning() {
      tone({ freq: 740, type: "square", dur: 0.1, vol: 0.06, filter: 2200 });
      tone({ freq: 740, type: "square", dur: 0.1, vol: 0.06, filter: 2200, delay: 0.2 });
      tone({ freq: 740, type: "square", dur: 0.1, vol: 0.06, filter: 2200, delay: 0.4 });
    },

    stickDeath() {
      noise({ dur: 0.5, vol: 0.35, type: "lowpass", freq: 1400, to: 150 });
      tone({ freq: 220, to: 40, dur: 0.45, vol: 0.4 });
      tone({ freq: 520, to: 180, type: "triangle", dur: 0.3, vol: 0.1, delay: 0.05 });
    },

    countdown() {
      tone({ freq: 660, type: "triangle", dur: 0.15, vol: 0.13 });
    },

    go() {
      tone({ freq: 990, type: "triangle", dur: 0.3, vol: 0.15 });
      tone({ freq: 1320, type: "sine", dur: 0.3, vol: 0.06, delay: 0.02 });
    },

    // ---- Comunes ----
    start() {
      tone({ freq: 523, type: "triangle", dur: 0.12, vol: 0.12 });
      tone({ freq: 784, type: "triangle", dur: 0.2, vol: 0.12, delay: 0.1 });
    },

    gameOver() {
      [523, 440, 349, 262].forEach((f, i) => {
        tone({ freq: f, type: "triangle", dur: 0.35, vol: 0.14, delay: i * 0.18 });
      });
    },

    record() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        tone({ freq: f, type: "triangle", dur: 0.3, vol: 0.13, delay: i * 0.1 });
      });
      tone({ freq: 2093, type: "sine", dur: 0.6, vol: 0.06, delay: 0.5 });
    }
  };

  function play(name) {
    if (muted || !SFX[name]) {
      return;
    }

    try {
      SFX[name]();
    } catch (error) {
      console.warn("TronkSound:", error);
    }
  }

  /* ---------------- Música de piano ---------------- */

  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /*
   * calm: tranquila y alegre (Protect Mogos), Do mayor.
   * night: suave y algo misteriosa (Antitronks), La menor.
   * Cada acorde: [bajo, notas del arpegio...].
   */
  const SONGS = {
    calm: {
      bpm: 72,
      volume: 0.5,
      chords: [
        [48, 60, 64, 67, 71],
        [45, 57, 60, 64, 67],
        [41, 57, 60, 64, 69],
        [43, 59, 62, 67, 71]
      ],
      pattern: [1, 2, 3, 4, 3, 2, 3, 2]
    },
    tense: {
      bpm: 92,
      volume: 0.38,
      chords: [
        [38, 57, 62, 65, 69],
        [34, 58, 62, 65, 70],
        [41, 57, 60, 65, 69],
        [36, 55, 60, 64, 67]
      ],
      pattern: [1, 2, 3, 4, 3, 2, 4, 2]
    },
    night: {
      bpm: 66,
      volume: 0.35,
      chords: [
        [45, 57, 60, 64, 69],
        [41, 57, 60, 64, 65],
        [48, 55, 60, 64, 67],
        [40, 56, 59, 62, 64]
      ],
      pattern: [1, 3, 2, 4, 1, 3, 2, 3]
    }
  };

  let song = null;
  let songTimer = null;
  let step = 0;
  let nextTime = 0;

  function pianoNote(freq, time, velocity, length) {
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2800, time);
    filter.frequency.exponentialRampToValueAtTime(900, time + length);

    out.gain.setValueAtTime(0.0001, time);
    out.gain.exponentialRampToValueAtTime(velocity, time + 0.008);
    out.gain.exponentialRampToValueAtTime(velocity * 0.35, time + 0.25);
    out.gain.exponentialRampToValueAtTime(0.0001, time + length);

    // Mezcla de parciales para que suene a piano suave.
    [
      [1, "triangle", 1],
      [2, "sine", 0.35],
      [3, "sine", 0.12],
      [1.003, "sine", 0.5]
    ].forEach(([mult, type, level]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq * mult;
      g.gain.value = level;
      osc.connect(g);
      g.connect(filter);
      osc.start(time);
      osc.stop(time + length + 0.05);
    });

    filter.connect(out);
    out.connect(musicBus);
    out.connect(reverb);
  }

  function scheduleMusic() {
    if (!song || !ctx) {
      return;
    }

    const eighth = 60 / song.bpm / 2;

    while (nextTime < ctx.currentTime + 0.3) {
      const chord = song.chords[Math.floor(step / 8) % song.chords.length];
      const inBar = step % 8;
      const human = 0.85 + Math.random() * 0.3;

      if (inBar === 0) {
        pianoNote(midi(chord[0]), nextTime, 0.22 * human, eighth * 7);
      }

      pianoNote(midi(chord[song.pattern[inBar]]), nextTime, 0.11 * human, eighth * 4);

      // De vez en cuando, una nota aguda de melodía.
      if ((inBar === 0 || inBar === 5) && Math.random() < 0.45) {
        const top = chord[1 + Math.floor(Math.random() * 4)] + 12;
        pianoNote(midi(top), nextTime + 0.01, 0.07 * human, eighth * 6);
      }

      nextTime += eighth;
      step++;
    }
  }

  function startMusic(name) {
    if (!ensure() || !SONGS[name]) {
      return;
    }

    if (song === SONGS[name] && songTimer) {
      return;
    }

    stopMusic(true);

    song = SONGS[name];
    step = 0;
    nextTime = ctx.currentTime + 0.1;

    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(song.volume, ctx.currentTime + 1.5);

    scheduleMusic();
    songTimer = setInterval(scheduleMusic, 60);
  }

  function stopMusic(immediate = false) {
    if (songTimer) {
      clearInterval(songTimer);
      songTimer = null;
    }

    song = null;

    if (ctx && musicBus) {
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setTargetAtTime(0, ctx.currentTime, immediate ? 0.02 : 0.3);
    }
  }

  // Botones de silenciar de las ventanas de juego.
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.(".game-sound-toggle");

    if (button) {
      ensure();
      setMuted(!muted);
    }
  });

  setMuted(muted);

  return { ensure, play, startMusic, stopMusic, setMuted, isMuted };
})();

/* =========================================================
   ANTITRONKS
   ========================================================= */

function initializeAntitronksGame() {
  const card = document.querySelector('[data-minigame="antitronks"]');
  const modal = document.getElementById("antitronks-modal");
  const closeButton = document.getElementById("antitronks-close");
  const backdrop = modal?.querySelector(".antitronks-backdrop");
  const game = document.getElementById("antitronks-game");
  const canvas = document.getElementById("antitronks-canvas");
  const ctx = canvas?.getContext("2d");
  const startButton = document.getElementById("antitronks-start");
  const overlay = document.getElementById("antitronks-overlay");
  const overlayTitle = document.getElementById("antitronks-overlay-title");
  const overlayText = document.getElementById("antitronks-overlay-text");
  const scoreElement = document.getElementById("antitronks-score");
  const livesElement = document.getElementById("antitronks-lives");
  const recordElement = document.getElementById("antitronks-record");
  const flash = document.getElementById("antitronks-hit-flash");
  const message = document.getElementById("antitronks-message");
  const messageText = document.getElementById("antitronks-message-text");

  if (!card || !modal || !game || !canvas || !ctx) {
    return;
  }

  /* =======================================================
     CONFIGURACIÓN
     ======================================================= */

  const TAU = Math.PI * 2;
  const FOV = (78 * Math.PI) / 180;

  // Altura de la línea del horizonte en pantalla (0 = arriba, 1 = abajo).
  const HORIZON_Y = 0.42;

  // Altura de los ojos del jugador (metros).
  const CAM_H = 1.6;

  // Plano de recorte cercano: nada con profundidad menor se dibuja.
  const NEAR = 0.15;

  // Cuánto puede girar la cámara a cada lado (radianes, ~35°).
  const CAMERA_LIMIT = 0.62;

  // Velocidad de giro con A / D (radianes por segundo).
  const KEY_TURN_SPEED = 2.8;

  const PERSON_H = 1.85;
  const RISE_TIME = 200;
  const HIDE_TIME = 200;
  const FIRE_TIME = 160;
  const DEATH_TIME = 550;

  // Distribución de la calle (Z = distancia hacia delante).
  const NEAR_CURB_Z = 3.6;
  const FAR_CURB_Z = 22;
  const FACADE_Z = 27;

  const INTRO_TEXT =
    "Apunta con el ratón y haz clic para disparar. Gira la cámara con A (izquierda) y D (derecha). ¡No dispares a los civiles (manos arriba)!";

  const RECORD_KEY = "antitronks-record";

  /*
   * Cajas: más pequeñas que antes y de tamaños distintos.
   * Todas son más bajas que los ojos del jugador, así que los
   * enemigos se esconden detrás y "asoman" por encima.
   */
  const BOXES = [
    { x: -12.5, z: 10.2, w: 1.7, h: 1.1, d: 1.4, style: 0 },
    { x: -8.6, z: 7.6, w: 1.1, h: 0.8, d: 1.0, style: 1 },
    { x: -4.8, z: 12.6, w: 2.4, h: 1.15, d: 1.6, style: 2 },
    { x: -1.4, z: 8.8, w: 1.3, h: 0.95, d: 1.2, style: 0 },
    { x: 2.4, z: 13.8, w: 1.6, h: 1.05, d: 1.3, style: 1 },
    { x: 5.4, z: 8.2, w: 1.0, h: 0.75, d: 0.95, style: 2 },
    { x: 9.0, z: 11.2, w: 2.1, h: 1.12, d: 1.6, style: 0 },
    { x: 13.2, z: 9.0, w: 1.35, h: 0.9, d: 1.2, style: 1 }
  ];

  const BOX_STYLES = [
    { front: "#9b6b3d", side: "#74502c", top: "#b8864f", line: "#4a2f18" },
    { front: "#7d6a45", side: "#5c4e33", top: "#978158", line: "#3b3020" },
    { front: "#5d6b3b", side: "#45502c", top: "#72824a", line: "#2b3319" }
  ];

  const SHIRTS = ["#e74c3c", "#3498db", "#f1c40f", "#9b59b6", "#1abc9c", "#e67e22", "#ecf0f1"];
  const PANTS = ["#34495e", "#3b5b8a", "#5d4037", "#2c3e50"];
  const SKINS = ["#f1c7a5", "#d9a47c", "#b98a6a", "#8d5a3b", "#6b4430"];
  const HAIRS = ["#2b1b12", "#5a3a22", "#c9a15a", "#111111", "#7a2e1c"];

  /* =======================================================
     CIUDAD (generada una vez, siempre igual)
     ======================================================= */

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildCity() {
    const rnd = mulberry32(1337);

    const palette = [
      { wall: "#8e4b3a", trim: "#5e2f24" },
      { wall: "#c9b48f", trim: "#8a7657" },
      { wall: "#6f7f8f", trim: "#46525e" },
      { wall: "#b86f4b", trim: "#7a452d" },
      { wall: "#d9cfc0", trim: "#9d9383" },
      { wall: "#556b5d", trim: "#364539" },
      { wall: "#a3564f", trim: "#6b3530" },
      { wall: "#d8b25a", trim: "#8f7431" }
    ];

    const awnings = ["#c0392b", "#2e86c1", "#27ae60", "#d68910", "#8e44ad", "#16a085"];

    const facades = [];
    let x = -120;

    while (x < 120) {
      const w = 7 + rnd() * 7;
      const h = 8 + rnd() * 14;
      const cols = Math.max(2, Math.floor(w / 2.3));
      const lit = [];

      for (let i = 0; i < 40; i++) {
        lit.push(rnd() < 0.35);
      }

      facades.push({
        x0: x,
        x1: x + w,
        h,
        cols,
        lit,
        colors: palette[Math.floor(rnd() * palette.length)],
        awning: awnings[Math.floor(rnd() * awnings.length)]
      });

      x += w + (rnd() < 0.25 ? 1.2 : 0);
    }

    const sky = [];
    let a = -1.95;

    while (a < 1.95) {
      const aw = 0.05 + rnd() * 0.09;
      const elev = 0.1 + rnd() * 0.3;
      const cols = 3 + Math.floor(rnd() * 4);
      const rows = 8 + Math.floor(elev * 50);
      const windows = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rnd() < 0.22) {
            windows.push([c / cols, r / rows, 1 / cols, 1 / rows]);
          }
        }
      }

      sky.push({
        a0: a,
        a1: a + aw,
        elev,
        antenna: rnd() < 0.25,
        color: rnd() < 0.5 ? "#2a3650" : "#34425c",
        windows
      });

      a += aw + rnd() * 0.02;
    }

    const lamps = [];

    for (let lx = -64; lx <= 64; lx += 16) {
      lamps.push(lx);
    }

    return { facades, sky, lamps };
  }

  const CITY = buildCity();

  /* =======================================================
     ESTADO
     ======================================================= */

  let width = 1;
  let height = 1;
  let dpr = 1;
  let focal = 1;

  let camCos = 1;
  let camSin = 0;

  let running = false;
  let animationFrame = 0;
  let lastTime = 0;
  let gameTime = 0;

  let score = 0;
  let lives = 3;
  let record = loadRecord();

  let cameraAngle = 0;

  let spawnTimer = 0;
  let nextSpawn = 600;

  let targets = [];
  let particles = [];
  let floaters = [];
  let tracers = [];
  let indicators = [];

  const keys = new Set();

  let mouseX = 0;
  let mouseY = 0;
  let mouseInside = false;

  let recoil = 0;
  let muzzleFlash = 0;

  let flashTimer = 0;
  let messageTimer = 0;

  let touchInfo = null;

  /* =======================================================
     UTILIDADES
     ======================================================= */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function easeOut(t) {
    t = clamp(t, 0, 1);
    return 1 - (1 - t) * (1 - t);
  }

  /*
   * Dificultad: sube poco a poco.
   * - Tiempo hasta que el enemigo dispara: 2,6 s al empezar,
   *   2,0 s con 30 puntos y nunca menos de 1,3 s.
   * - Nuevo enemigo: cada 1,4 s al empezar, 1,04 s con 30 puntos
   *   y nunca menos de 0,65 s.
   * - Enemigos a la vez: 2 al empezar, 3 desde 15 puntos,
   *   4 como máximo desde 30.
   */
  function getSpawnInterval() {
    return Math.max(650, 1400 - score * 12);
  }

  function getReactionTime() {
    return Math.max(1300, 2600 - score * 20);
  }

  function getMaxTargets() {
    return Math.min(4, 2 + Math.floor(score / 15));
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();

    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  /* =======================================================
     PROYECCIÓN 3D
     ======================================================= */

  function toCam(x, y, z) {
    return {
      rx: x * camCos - z * camSin,
      ry: y - CAM_H,
      rz: x * camSin + z * camCos
    };
  }

  function camToScreen(p) {
    return {
      x: width / 2 + (p.rx / p.rz) * focal,
      y: height * HORIZON_Y - (p.ry / p.rz) * focal
    };
  }

  function project(x, y, z) {
    const p = toCam(x, y, z);

    if (p.rz < NEAR) {
      return null;
    }

    const s = camToScreen(p);
    s.rz = p.rz;
    return s;
  }

  // Recorta un polígono contra el plano cercano para que nada
  // "detrás de la cámara" se dibuje deformado.
  function clipNear(poly) {
    const out = [];

    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const aIn = a.rz >= NEAR;
      const bIn = b.rz >= NEAR;

      if (aIn) {
        out.push(a);
      }

      if (aIn !== bIn) {
        const t = (NEAR - a.rz) / (b.rz - a.rz);

        out.push({
          rx: a.rx + (b.rx - a.rx) * t,
          ry: a.ry + (b.ry - a.ry) * t,
          rz: NEAR
        });
      }
    }

    return out;
  }

  function projectPoly(points) {
    const cam = points.map((p) => toCam(p[0], p[1], p[2]));
    const clipped = clipNear(cam);

    if (clipped.length < 3) {
      return null;
    }

    return clipped.map(camToScreen);
  }

  function fillPoly(poly, fill, stroke, lineWidth) {
    if (!poly) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);

    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i].x, poly[i].y);
    }

    ctx.closePath();

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }

    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth || 1;
      ctx.stroke();
    }
  }

  function polyOnScreen(poly) {
    if (!poly) {
      return false;
    }

    let minX = Infinity;
    let maxX = -Infinity;

    for (const p of poly) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
    }

    return maxX >= 0 && minX <= width;
  }

  function groundQuad(x0, x1, z0, z1, color, y = 0) {
    fillPoly(
      projectPoly([
        [x0, y, z0],
        [x1, y, z0],
        [x1, y, z1],
        [x0, y, z1]
      ]),
      color
    );
  }

  function wallQuad(x0, x1, y0, y1, z, color, stroke) {
    const poly = projectPoly([
      [x0, y0, z],
      [x1, y0, z],
      [x1, y1, z],
      [x0, y1, z]
    ]);

    if (polyOnScreen(poly)) {
      fillPoly(poly, color, stroke, 1);
    }

    return poly;
  }

  function pointInPoly(x, y, poly) {
    let inside = false;

    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x;
      const yi = poly[i].y;
      const xj = poly[j].x;
      const yj = poly[j].y;

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  /* =======================================================
     RESIZE
     ======================================================= */

  function resize() {
    const rect = game.getBoundingClientRect();

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // En pantallas verticales (móvil) evitamos que todo se vea diminuto.
    focal = Math.max(width, height * 1.3) / (2 * Math.tan(FOV / 2));
  }

  /* =======================================================
     HUD
     ======================================================= */

  /* =======================================================
     RÉCORD (se guarda en este navegador)
     ======================================================= */

  function loadRecord() {
    try {
      return Math.max(0, parseInt(localStorage.getItem(RECORD_KEY), 10) || 0);
    } catch {
      return 0;
    }
  }

  function saveRecord(value) {
    try {
      localStorage.setItem(RECORD_KEY, String(value));
    } catch {
      // LocalStorage no disponible.
    }
  }

  function updateHud() {
    if (recordElement) {
      recordElement.textContent = `RÉCORD: ${Math.max(record, score)}`;
    }

    if (scoreElement) {
      scoreElement.textContent = `PUNTOS: ${score}`;
    }

    if (livesElement) {
      livesElement.textContent = `VIDAS: ${lives}`;
    }
  }

  function showMessage(text, duration = 400) {
    if (!message || !messageText) {
      return;
    }

    messageText.textContent = text;
    message.classList.add("visible");
    messageTimer = duration;
  }

  function damageFlash() {
    if (!flash) {
      return;
    }

    flash.classList.add("active");
    flashTimer = 180;
  }

  /* =======================================================
     FONDO: CIELO + CIUDAD
     ======================================================= */

  function drawSky() {
    const hy = height * HORIZON_Y;

    const sky = ctx.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, "#1c2a4a");
    sky.addColorStop(0.55, "#5a6f95");
    sky.addColorStop(1, "#f0a868");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, hy + 1);

    // Sol del atardecer.
    const rel = 0.3 - cameraAngle;

    if (Math.abs(rel) < 1.2) {
      const sx = width / 2 + Math.tan(rel) * focal;
      const sy = hy - Math.tan(0.09) * focal;
      const r = focal * 0.28;

      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      glow.addColorStop(0, "rgba(255,236,190,.95)");
      glow.addColorStop(0.12, "rgba(255,200,130,.75)");
      glow.addColorStop(1, "rgba(255,160,90,0)");

      ctx.fillStyle = glow;
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
  }

  function drawSkyline() {
    const hy = height * HORIZON_Y;

    for (const b of CITY.sky) {
      const r0 = b.a0 - cameraAngle;
      const r1 = b.a1 - cameraAngle;

      if (r1 < -1.35 || r0 > 1.35) {
        continue;
      }

      const x0 = width / 2 + Math.tan(clamp(r0, -1.4, 1.4)) * focal;
      const x1 = width / 2 + Math.tan(clamp(r1, -1.4, 1.4)) * focal;
      const top = hy - Math.tan(b.elev) * focal;
      const bw = x1 - x0;
      const bh = hy - top;

      ctx.fillStyle = b.color;
      ctx.fillRect(x0, top, bw, bh + 2);

      if (b.antenna) {
        ctx.fillRect(x0 + bw * 0.48, top - bh * 0.12, Math.max(1, bw * 0.04), bh * 0.12);
      }

      ctx.fillStyle = "rgba(255,214,130,.55)";

      for (const w of b.windows) {
        ctx.fillRect(
          x0 + (w[0] + w[2] * 0.25) * bw,
          top + (w[1] + w[3] * 0.3) * bh,
          Math.max(1, w[2] * bw * 0.5),
          Math.max(1, w[3] * bh * 0.4)
        );
      }
    }

    // Neblina sobre el horizonte.
    const haze = ctx.createLinearGradient(0, hy - focal * 0.12, 0, hy);
    haze.addColorStop(0, "rgba(240,168,104,0)");
    haze.addColorStop(1, "rgba(240,168,104,.35)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, hy - focal * 0.12, width, focal * 0.12);
  }

  function drawGround() {
    const hy = height * HORIZON_Y;

    // Asfalto.
    ctx.fillStyle = "#2d2f34";
    ctx.fillRect(0, hy, width, height - hy);

    // Acera del fondo + bordillo.
    groundQuad(-140, 140, FAR_CURB_Z, FACADE_Z, "#8a857c");
    groundQuad(-140, 140, FAR_CURB_Z - 0.25, FAR_CURB_Z, "#bdb7aa");

    // Baldosas de la acera.
    ctx.lineWidth = 1;

    for (let x = -60; x <= 60; x += 2) {
      const a = project(x, 0.01, FAR_CURB_Z);
      const b = project(x, 0.01, FACADE_Z);

      if (a && b && a.x > -20 && a.x < width + 20) {
        ctx.strokeStyle = "rgba(0,0,0,.12)";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Acera cercana (donde está el jugador).
    groundQuad(-140, 140, 0.2, NEAR_CURB_Z, "#8a857c");
    groundQuad(-140, 140, NEAR_CURB_Z, NEAR_CURB_Z + 0.25, "#bdb7aa");

    // Líneas laterales de la calzada.
    groundQuad(-140, 140, NEAR_CURB_Z + 0.6, NEAR_CURB_Z + 0.72, "rgba(235,235,235,.55)", 0.01);
    groundQuad(-140, 140, FAR_CURB_Z - 0.72, FAR_CURB_Z - 0.6, "rgba(235,235,235,.55)", 0.01);

    // Línea central discontinua.
    const midZ = (NEAR_CURB_Z + FAR_CURB_Z) / 2;

    for (let x = -80; x < 80; x += 7) {
      groundQuad(x, x + 3.5, midZ - 0.09, midZ + 0.09, "#e9e2c4", 0.01);
    }

    // Paso de cebra.
    for (let z = NEAR_CURB_Z + 1; z < FAR_CURB_Z - 1; z += 1.1) {
      groundQuad(17, 21.5, z, z + 0.55, "rgba(240,240,240,.8)", 0.01);
    }
  }

  function drawFacades() {
    const z = FACADE_Z;

    for (const f of CITY.facades) {
      const poly = projectPoly([
        [f.x0, 0, z],
        [f.x1, 0, z],
        [f.x1, f.h, z],
        [f.x0, f.h, z]
      ]);

      if (!polyOnScreen(poly)) {
        continue;
      }

      fillPoly(poly, f.colors.wall, "rgba(0,0,0,.35)", 1);

      // Cornisa.
      wallQuad(f.x0, f.x1, f.h - 0.6, f.h, z, f.colors.trim);

      // Escaparate de la planta baja.
      wallQuad(f.x0 + 0.6, f.x1 - 0.6, 0.3, 2.7, z, "#26333f", f.colors.trim);
      wallQuad(f.x0 + 1.2, f.x0 + 2.2, 0.3, 2.5, z, "#3a2a1e", f.colors.trim);

      // Toldo.
      wallQuad(f.x0 + 0.4, f.x1 - 0.4, 2.75, 3.35, z, f.awning);

      // Ventanas.
      const colW = (f.x1 - f.x0) / f.cols;
      let index = 0;

      for (let wy = 4; wy + 1.7 <= f.h - 0.9; wy += 3) {
        for (let c = 0; c < f.cols; c++) {
          const wx0 = f.x0 + c * colW + colW * 0.25;
          const lit = f.lit[index % f.lit.length];
          index++;

          wallQuad(wx0, wx0 + colW * 0.5, wy, wy + 1.7, z, lit ? "#f5d67a" : "#2c3a48", f.colors.trim);
        }
      }
    }
  }

  function drawLamps() {
    const lz = FAR_CURB_Z + 0.6;

    for (const lx of CITY.lamps) {
      const base = project(lx, 0, lz);
      const top = project(lx, 5.4, lz);
      const head = project(lx, 5.3, lz - 1.2);

      if (!base || !top || !head || base.x < -60 || base.x > width + 60) {
        continue;
      }

      const s = focal / base.rz;

      ctx.strokeStyle = "#1f2327";
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(1.5, 0.14 * s);
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(top.x, top.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();

      const r = Math.max(3, 0.35 * s);
      const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, r * 3);
      glow.addColorStop(0, "rgba(255,240,190,.9)");
      glow.addColorStop(1, "rgba(255,220,150,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(head.x - r * 3, head.y - r * 3, r * 6, r * 6);
    }
  }

  /* =======================================================
     CAJAS 3D
     ======================================================= */

  function worldLine(a, b, color, lw) {
    const p = project(a[0], a[1], a[2]);
    const q = project(b[0], b[1], b[2]);

    if (!p || !q) {
      return;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }

  function drawBox(b) {
    const st = BOX_STYLES[b.style];
    const x0 = b.x - b.w / 2;
    const x1 = b.x + b.w / 2;
    const z0 = b.z - b.d / 2;
    const z1 = b.z + b.d / 2;
    const h = b.h;

    b.faces = [];

    const front = toCam(b.x, h / 2, z0);
    b.depth = front.rz;

    if (front.rz < NEAR) {
      return;
    }

    const s = focal / front.rz;
    const edge = Math.max(1, s * 0.025);

    const faces = [];

    // Caras laterales: solo la que mira hacia el jugador.
    if (x0 > 0) {
      faces.push({ pts: [[x0, 0, z1], [x0, 0, z0], [x0, h, z0], [x0, h, z1]], color: st.side });
    }

    if (x1 < 0) {
      faces.push({ pts: [[x1, 0, z0], [x1, 0, z1], [x1, h, z1], [x1, h, z0]], color: st.side });
    }

    faces.push({ pts: [[x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1]], color: st.top });
    faces.push({ pts: [[x0, 0, z0], [x1, 0, z0], [x1, h, z0], [x0, h, z0]], color: st.front });

    // Sombra en el suelo.
    fillPoly(
      projectPoly([
        [x0 - 0.15, 0.005, z0 - 0.1],
        [x1 + 0.15, 0.005, z0 - 0.1],
        [x1 + 0.15, 0.005, z1 + 0.1],
        [x0 - 0.15, 0.005, z1 + 0.1]
      ]),
      "rgba(0,0,0,.35)"
    );

    for (const face of faces) {
      const poly = projectPoly(face.pts);

      if (poly) {
        fillPoly(poly, face.color, st.line, edge);
        b.faces.push(poly);
      }
    }

    // Detalles de la cara frontal: marco, tablones y refuerzo en X.
    const zf = z0 - 0.005;
    const m = Math.min(b.w, h) * 0.1;
    const lw = Math.max(1, s * 0.03);

    worldLine([x0 + m, m, zf], [x1 - m, m, zf], st.line, lw);
    worldLine([x0 + m, h - m, zf], [x1 - m, h - m, zf], st.line, lw);
    worldLine([x0 + m, m, zf], [x0 + m, h - m, zf], st.line, lw);
    worldLine([x1 - m, m, zf], [x1 - m, h - m, zf], st.line, lw);
    worldLine([x0 + m, m, zf], [x1 - m, h - m, zf], st.line, lw);

    for (let i = 1; i < 3; i++) {
      const yy = (h * i) / 3;
      worldLine([x0 + m, yy, zf], [x1 - m, yy, zf], "rgba(0,0,0,.25)", Math.max(1, lw * 0.6));
    }
  }

  /* =======================================================
     PERSONAS
     ======================================================= */

  function getRise(t) {
    if (t.state === "rising") {
      return easeOut(t.stateTime / RISE_TIME);
    }

    if (t.state === "hiding") {
      return 1 - easeOut(t.stateTime / HIDE_TIME);
    }

    return 1;
  }

  function drawEnemyFigure(t, u) {
    const jacket = "#3a4232";

    // Piernas.
    ctx.fillStyle = "#2a2f25";
    roundRect(-u * 0.14, -u * 0.49, u * 0.12, u * 0.47, u * 0.03);
    ctx.fill();
    roundRect(u * 0.02, -u * 0.49, u * 0.12, u * 0.47, u * 0.03);
    ctx.fill();

    // Botas.
    ctx.fillStyle = "#111";
    ctx.fillRect(-u * 0.16, -u * 0.05, u * 0.15, u * 0.05);
    ctx.fillRect(u * 0.01, -u * 0.05, u * 0.15, u * 0.05);

    // Torso.
    ctx.fillStyle = jacket;
    roundRect(-u * 0.18, -u * 0.83, u * 0.36, u * 0.37, u * 0.05);
    ctx.fill();

    // Chaleco + bolsillos.
    ctx.fillStyle = "#23281f";
    ctx.fillRect(-u * 0.13, -u * 0.8, u * 0.26, u * 0.26);
    ctx.fillStyle = "#4a5240";
    ctx.fillRect(-u * 0.11, -u * 0.64, u * 0.06, u * 0.07);
    ctx.fillRect(-u * 0.03, -u * 0.64, u * 0.06, u * 0.07);
    ctx.fillRect(u * 0.05, -u * 0.64, u * 0.06, u * 0.07);

    // Cinturón.
    ctx.fillStyle = "#151515";
    ctx.fillRect(-u * 0.18, -u * 0.5, u * 0.36, u * 0.035);

    // Brazos sujetando el fusil.
    ctx.strokeStyle = jacket;
    ctx.lineCap = "round";
    ctx.lineWidth = u * 0.08;
    ctx.beginPath();
    ctx.moveTo(-u * 0.17, -u * 0.79);
    ctx.lineTo(-u * 0.08, -u * 0.66);
    ctx.moveTo(u * 0.17, -u * 0.79);
    ctx.lineTo(u * 0.12, -u * 0.7);
    ctx.stroke();

    // Fusil apuntando al jugador.
    ctx.save();
    ctx.translate(u * 0.04, -u * 0.7);
    ctx.rotate(-0.35);
    ctx.fillStyle = "#141414";
    ctx.fillRect(-u * 0.14, -u * 0.035, u * 0.28, u * 0.07);
    ctx.fillRect(u * 0.02, -u * 0.08, u * 0.05, u * 0.05);
    ctx.restore();

    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.arc(-u * 0.09, -u * 0.655, u * 0.04, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(-u * 0.09, -u * 0.655, u * 0.018, 0, TAU);
    ctx.fill();

    // Guantes.
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(-u * 0.07, -u * 0.66, u * 0.035, 0, TAU);
    ctx.arc(u * 0.12, -u * 0.71, u * 0.035, 0, TAU);
    ctx.fill();

    // Aviso: está a punto de disparar (brillo rojo en el cañón).
    if (t.state === "up") {
      const left = t.reaction - t.stateTime;

      if (left < 500 && Math.floor(gameTime / 80) % 2 === 0) {
        ctx.fillStyle = "rgba(255,40,40,.9)";
        ctx.beginPath();
        ctx.arc(-u * 0.09, -u * 0.655, u * 0.03, 0, TAU);
        ctx.fill();
      }
    }

    // Fogonazo al disparar.
    if (t.state === "firing") {
      drawMuzzleFlash(-u * 0.09, -u * 0.655, u * 0.2);
    }

    // Cuello y cabeza con pasamontañas.
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(-u * 0.04, -u * 0.86, u * 0.08, u * 0.05);
    ctx.beginPath();
    ctx.arc(0, -u * 0.9, u * 0.075, 0, TAU);
    ctx.fill();

    ctx.fillStyle = t.skin;
    ctx.fillRect(-u * 0.05, -u * 0.915, u * 0.1, u * 0.025);
    ctx.fillStyle = "#111";
    ctx.fillRect(-u * 0.035, -u * 0.91, u * 0.015, u * 0.015);
    ctx.fillRect(u * 0.02, -u * 0.91, u * 0.015, u * 0.015);

    // Casco.
    ctx.fillStyle = "#4b5540";
    ctx.beginPath();
    ctx.arc(0, -u * 0.925, u * 0.085, Math.PI, TAU);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-u * 0.095, -u * 0.93, u * 0.19, u * 0.02);
  }

  function drawCivilianFigure(t, u) {
    // Piernas.
    ctx.fillStyle = t.pants;
    roundRect(-u * 0.13, -u * 0.49, u * 0.11, u * 0.47, u * 0.03);
    ctx.fill();
    roundRect(u * 0.02, -u * 0.49, u * 0.11, u * 0.47, u * 0.03);
    ctx.fill();

    ctx.fillStyle = "#eee";
    ctx.fillRect(-u * 0.15, -u * 0.04, u * 0.14, u * 0.04);
    ctx.fillRect(u * 0.01, -u * 0.04, u * 0.14, u * 0.04);

    // Camiseta.
    ctx.fillStyle = t.shirt;
    roundRect(-u * 0.16, -u * 0.83, u * 0.32, u * 0.37, u * 0.05);
    ctx.fill();

    // Brazos arriba (se rinde).
    ctx.strokeStyle = t.shirt;
    ctx.lineCap = "round";
    ctx.lineWidth = u * 0.07;
    ctx.beginPath();
    ctx.moveTo(-u * 0.15, -u * 0.79);
    ctx.lineTo(-u * 0.19, -u * 0.95);
    ctx.lineTo(-u * 0.14, -u * 1.06);
    ctx.moveTo(u * 0.15, -u * 0.79);
    ctx.lineTo(u * 0.19, -u * 0.95);
    ctx.lineTo(u * 0.14, -u * 1.06);
    ctx.stroke();

    ctx.fillStyle = t.skin;
    ctx.beginPath();
    ctx.arc(-u * 0.14, -u * 1.08, u * 0.035, 0, TAU);
    ctx.arc(u * 0.14, -u * 1.08, u * 0.035, 0, TAU);
    ctx.fill();

    // Cabeza.
    ctx.fillRect(-u * 0.035, -u * 0.86, u * 0.07, u * 0.05);
    ctx.beginPath();
    ctx.arc(0, -u * 0.9, u * 0.075, 0, TAU);
    ctx.fill();

    ctx.fillStyle = t.hair;
    ctx.beginPath();
    ctx.arc(0, -u * 0.915, u * 0.078, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath();
    ctx.fill();

    // Cara asustada.
    ctx.fillStyle = "#111";
    ctx.fillRect(-u * 0.035, -u * 0.915, u * 0.015, u * 0.015);
    ctx.fillRect(u * 0.02, -u * 0.915, u * 0.015, u * 0.015);
    ctx.beginPath();
    ctx.arc(0, -u * 0.87, u * 0.015, 0, TAU);
    ctx.fill();
  }

  function drawMuzzleFlash(x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(255,190,60,.95)";
    ctx.beginPath();

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const rr = i % 2 === 0 ? r : r * 0.4;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }

    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,230,.95)";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawPerson(t) {
    t.hit = null;

    const rise = getRise(t);
    const h0 = PERSON_H * t.scale;
    const baseY = -h0 * (1 - rise);

    const feet = project(t.x, baseY, t.z);
    const ground = project(t.x, 0, t.z);

    if (!feet || !ground) {
      return;
    }

    const u = h0 * (focal / feet.rz);

    if (feet.x < -u || feet.x > width + u) {
      return;
    }

    const clipY = ground.y;

    ctx.save();

    // Todo lo que esté "bajo el suelo" no se ve: así parece que
    // el enemigo se levanta desde detrás de la caja.
    ctx.beginPath();
    ctx.rect(0, 0, width, clipY);
    ctx.clip();

    ctx.translate(feet.x, feet.y);

    if (t.state === "dying") {
      const k = t.stateTime / DEATH_TIME;
      ctx.rotate(t.fallDir * Math.min(1, k * 1.8) * 1.3);
      ctx.globalAlpha = 1 - Math.max(0, (k - 0.55) / 0.45);
    }

    if (t.type === "enemy") {
      drawEnemyFigure(t, u);
    } else {
      drawCivilianFigure(t, u);
    }

    ctx.restore();

    if (t.state === "dying") {
      return;
    }

    // Zonas de impacto en pantalla (se usan al disparar).
    t.hit = {
      head: { x: feet.x, y: feet.y - u * 0.9, r: u * 0.1 },
      body: {
        x0: feet.x - u * 0.2,
        x1: feet.x + u * 0.2,
        y0: feet.y - u * 0.84,
        y1: feet.y
      },
      clipY,
      depth: feet.rz
    };

    if (t.type === "enemy" && (t.state === "up" || t.state === "rising")) {
      const left = t.state === "up" ? 1 - t.stateTime / t.reaction : 1;

      indicators.push({
        x: feet.x,
        y: feet.y - u * 1.05,
        w: Math.max(26, u * 0.35),
        left
      });
    }
  }

  function drawIndicators() {
    for (const ind of indicators) {
      const x = ind.x - ind.w / 2;
      const y = ind.y - 10;

      ctx.fillStyle = "rgba(0,0,0,.6)";
      ctx.fillRect(x - 1, y - 1, ind.w + 2, 7);

      ctx.fillStyle = ind.left > 0.5 ? "#ffd24a" : ind.left > 0.25 ? "#ff8a2a" : "#ff2d2d";
      ctx.fillRect(x, y, ind.w * clamp(ind.left, 0, 1), 5);
    }
  }

  /* =======================================================
     OBJETOS ORDENADOS POR PROFUNDIDAD
     ======================================================= */

  function drawObjects() {
    const items = [];

    for (const b of BOXES) {
      items.push({ d: Math.hypot(b.x, b.z), draw: () => drawBox(b) });
    }

    for (const t of targets) {
      items.push({ d: Math.hypot(t.x, t.z), draw: () => drawPerson(t) });
    }

    items.sort((a, b) => b.d - a.d);
    items.forEach((item) => item.draw());
  }

  /* =======================================================
     QUÉ HAY BAJO EL RATÓN
     ======================================================= */

  function pickAt(sx, sy) {
    let best = null;

    for (const t of targets) {
      const h = t.hit;

      if (!h || sy > h.clipY) {
        continue;
      }

      let part = null;

      if (Math.hypot(sx - h.head.x, sy - h.head.y) <= h.head.r) {
        part = "head";
      } else if (sx >= h.body.x0 && sx <= h.body.x1 && sy >= h.body.y0 && sy <= h.body.y1) {
        part = "body";
      }

      if (part && (!best || h.depth < best.depth)) {
        best = { kind: "target", target: t, part, depth: h.depth };
      }
    }

    // Si una caja está delante, la caja para la bala.
    for (const b of BOXES) {
      if (!b.faces || !b.faces.length) {
        continue;
      }

      if (b.faces.some((f) => pointInPoly(sx, sy, f)) && (!best || b.depth < best.depth)) {
        best = { kind: "box", box: b, depth: b.depth };
      }
    }

    return best;
  }

  /* =======================================================
     EFECTOS
     ======================================================= */

  function spawnParticles(x, y, color, count, power) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: rand(-0.3, 0.3) * power,
        vy: rand(-0.4, 0.05) * power,
        life: 0,
        max: rand(300, 600),
        color,
        size: rand(2, 4.5)
      });
    }
  }

  function addFloater(x, y, text, color) {
    floaters.push({ x, y, text, color, life: 0, max: 900 });
  }

  function updateEffects(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += delta;
      p.vy += 0.0015 * delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;

      if (p.life >= p.max) {
        particles.splice(i, 1);
      }
    }

    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life += delta;
      f.y -= 0.05 * delta;

      if (f.life >= f.max) {
        floaters.splice(i, 1);
      }
    }

    for (let i = tracers.length - 1; i >= 0; i--) {
      tracers[i].life -= delta;

      if (tracers[i].life <= 0) {
        tracers.splice(i, 1);
      }
    }

    recoil = Math.max(0, recoil - delta * 0.008);
    muzzleFlash = Math.max(0, muzzleFlash - delta);
  }

  function drawEffects() {
    for (const tr of tracers) {
      ctx.strokeStyle = `rgba(255,230,140,${(tr.life / tr.max) * 0.9})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tr.x0, tr.y0);
      ctx.lineTo(tr.x1, tr.y1);
      ctx.stroke();
    }

    for (const p of particles) {
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.font = "900 20px system-ui, sans-serif";

    for (const f of floaters) {
      ctx.globalAlpha = 1 - f.life / f.max;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,.8)";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }

    ctx.globalAlpha = 1;
  }

  /* =======================================================
     FLECHAS DE ENEMIGOS FUERA DE PANTALLA
     ======================================================= */

  function drawOffscreenArrows() {
    const pulse = 0.6 + 0.4 * Math.sin(gameTime * 0.012);
    const count = { left: 0, right: 0 };

    for (const t of targets) {
      if (t.type !== "enemy" || t.state === "dying" || t.state === "hiding") {
        continue;
      }

      const c = toCam(t.x, 1.2, t.z);
      let side = 0;

      if (c.rz < NEAR) {
        side = c.rx < 0 ? -1 : 1;
      } else {
        const sx = width / 2 + (c.rx / c.rz) * focal;

        if (sx < 0) {
          side = -1;
        } else if (sx > width) {
          side = 1;
        }
      }

      if (!side) {
        continue;
      }

      const key = side < 0 ? "left" : "right";
      const x = side < 0 ? 26 : width - 26;
      const y = height * 0.45 + count[key] * 40;
      count[key]++;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(side, 1);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#ff3b30";
      ctx.strokeStyle = "rgba(0,0,0,.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(6, -14);
      ctx.lineTo(6, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  /* =======================================================
     ARMA DEL JUGADOR (apunta hacia el ratón)
     ======================================================= */

  function getWeaponPose() {
    const s = clamp(height / 700, 0.6, 1.4);
    const px = width * 0.64;
    const py = height + 40 * s;
    const tx = mouseInside ? mouseX : width / 2;
    const ty = mouseInside ? mouseY : height * HORIZON_Y;

    let ang = Math.atan2(ty - py, tx - px);
    ang = clamp(ang, -Math.PI * 0.92, -Math.PI * 0.08);

    return { s, px, py, ang };
  }

  function getMuzzle() {
    const w = getWeaponPose();
    const len = 265 * w.s - recoil * 18 * w.s;

    return {
      x: w.px + Math.cos(w.ang) * len,
      y: w.py + Math.sin(w.ang) * len
    };
  }

  function drawPlayerWeapon() {
    const { s, px, py, ang } = getWeaponPose();

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang + Math.PI / 2);
    ctx.translate(0, recoil * 18 * s);

    // Brazos.
    ctx.strokeStyle = "#2b3326";
    ctx.lineCap = "round";
    ctx.lineWidth = 34 * s;
    ctx.beginPath();
    ctx.moveTo(-160 * s, 110 * s);
    ctx.lineTo(-10 * s, -165 * s);
    ctx.moveTo(130 * s, 120 * s);
    ctx.lineTo(10 * s, -60 * s);
    ctx.stroke();

    // Culata.
    ctx.fillStyle = "#1d2023";
    ctx.fillRect(-17 * s, -25 * s, 34 * s, 70 * s);

    // Cuerpo.
    ctx.fillStyle = "#2a2e31";
    ctx.strokeStyle = "#0d0f10";
    ctx.lineWidth = 2 * s;
    ctx.fillRect(-20 * s, -135 * s, 40 * s, 115 * s);
    ctx.strokeRect(-20 * s, -135 * s, 40 * s, 115 * s);

    // Guardamanos.
    ctx.fillStyle = "#23272a";
    ctx.fillRect(-14 * s, -212 * s, 28 * s, 80 * s);

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2 * s;

    for (let i = 0; i < 4; i++) {
      const y = -200 * s + i * 17 * s;
      ctx.beginPath();
      ctx.moveTo(-9 * s, y);
      ctx.lineTo(9 * s, y);
      ctx.stroke();
    }

    // Cañón.
    ctx.fillStyle = "#121416";
    ctx.fillRect(-5 * s, -265 * s, 10 * s, 56 * s);

    // Mira óptica.
    ctx.fillStyle = "#111";
    ctx.fillRect(-11 * s, -160 * s, 22 * s, 42 * s);
    ctx.fillStyle = "#4aa3ff";
    ctx.fillRect(-6 * s, -156 * s, 12 * s, 6 * s);

    // Guantes.
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(-10 * s, -170 * s, 19 * s, 0, TAU);
    ctx.arc(10 * s, -62 * s, 18 * s, 0, TAU);
    ctx.fill();

    if (muzzleFlash > 0) {
      drawMuzzleFlash(0, -275 * s, 34 * s);
    }

    ctx.restore();
  }

  /* =======================================================
     MIRA = RATÓN
     ======================================================= */

  function drawCrosshair() {
    if (!running || !mouseInside) {
      return;
    }

    const hover = pickAt(mouseX, mouseY);
    let color = "#ffffff";

    if (hover && hover.kind === "target") {
      color = hover.target.type === "enemy" ? "#ff3b30" : "#ffd24a";
    }

    ctx.save();
    ctx.translate(mouseX, mouseY);

    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass === 0 ? "rgba(0,0,0,.85)" : color;
      ctx.lineWidth = pass === 0 ? 4 : 2;

      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, TAU);
      ctx.moveTo(0, -20);
      ctx.lineTo(0, -6);
      ctx.moveTo(0, 6);
      ctx.lineTo(0, 20);
      ctx.moveTo(-20, 0);
      ctx.lineTo(-6, 0);
      ctx.moveTo(6, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* =======================================================
     GENERAR ENEMIGOS (SIEMPRE DETRÁS DE UNA CAJA)
     ======================================================= */

  function clearTargets() {
    targets = [];
    particles = [];
    floaters = [];
    tracers = [];
    indicators = [];
  }

  function aliveCount() {
    return targets.filter((t) => t.state !== "dying").length;
  }

  function spawnTarget() {
    if (!running || aliveCount() >= getMaxTargets()) {
      return;
    }

    const free = BOXES.filter((b) => !targets.some((t) => t.box === b));

    if (!free.length) {
      return;
    }

    const box = pick(free);
    const type = Math.random() < 0.84 ? "enemy" : "civilian";
    const spread = Math.max(0, box.w / 2 - 0.45);

    TronkSound.play("enemyAppear");

    targets.push({
      box,
      type,
      x: box.x + rand(-spread, spread),
      z: box.z + box.d / 2 + 0.35,
      scale: rand(0.97, 1.04),
      state: "rising",
      stateTime: 0,
      reaction: type === "enemy" ? getReactionTime() * rand(0.85, 1.15) : rand(1700, 2500),
      fallDir: 1,
      shirt: pick(SHIRTS),
      pants: pick(PANTS),
      skin: pick(SKINS),
      hair: pick(HAIRS),
      hit: null
    });
  }

  function setState(t, state) {
    t.state = state;
    t.stateTime = 0;
  }

  /* =======================================================
     DISPARAR (donde está el ratón)
     ======================================================= */

  function shootAt(sx, sy) {
    if (!running) {
      return;
    }

    recoil = 1;
    muzzleFlash = 60;
    TronkSound.play("gunshot");

    const m = getMuzzle();
    tracers.push({ x0: m.x, y0: m.y, x1: sx, y1: sy, life: 80, max: 80 });

    const hit = pickAt(sx, sy);

    if (!hit) {
      spawnParticles(sx, sy, "#a39d92", 6, 0.6);
      TronkSound.play("ricochet");
      return;
    }

    if (hit.kind === "box") {
      spawnParticles(sx, sy, "#d2a46a", 9, 0.8);
      TronkSound.play("woodHit");
      return;
    }

    const t = hit.target;
    setState(t, "dying");
    t.fallDir = Math.random() < 0.5 ? -1 : 1;
    t.hit = null;

    spawnParticles(sx, sy, "#b3121b", 16, 1.1);

    if (t.type === "enemy") {
      const headshot = hit.part === "head";
      TronkSound.play(headshot ? "headshot" : "hitBody");
      score += headshot ? 2 : 1;
      updateHud();
      addFloater(sx, sy - 14, headshot ? "¡A LA CABEZA! +2" : "+1", headshot ? "#ffd24a" : "#ffffff");
      showMessage(headshot ? "¡DISPARO A LA CABEZA!" : "ENEMIGO ELIMINADO", 450);
    } else {
      addFloater(sx, sy - 14, "¡CIVIL!", "#ff5252");
      TronkSound.play("civilian");
      damagePlayer("¡HAS DISPARADO A UN CIVIL!");
    }
  }

  /* =======================================================
     DAÑO / GAME OVER
     ======================================================= */

  function damagePlayer(reason) {
    TronkSound.play("playerHurt");
    lives -= 1;
    updateHud();
    damageFlash();
    showMessage(reason, 650);

    if (lives <= 0) {
      gameOver();
    }
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(animationFrame);
    clearTargets();

    // Quitamos el destello rojo y el mensaje para que no se queden fijos.
    flashTimer = 0;
    messageTimer = 0;
    flash?.classList.remove("active");
    message?.classList.remove("visible");

    overlay?.classList.remove("hidden");

    if (overlayTitle) {
      overlayTitle.textContent = "GAME OVER";
    }

    const newRecord = score > record;

    if (newRecord) {
      record = score;
      saveRecord(record);
    }

    TronkSound.play(newRecord ? "record" : "gameOver");

    updateHud();

    if (overlayTitle && newRecord) {
      overlayTitle.textContent = "¡NUEVO RÉCORD!";
    }

    if (overlayText) {
      overlayText.textContent = newRecord
        ? `Has conseguido ${score} punto${score === 1 ? "" : "s"}. ¡Es tu mejor marca!`
        : `Has conseguido ${score} punto${score === 1 ? "" : "s"}. Tu récord es ${record}.`;
    }

    if (startButton) {
      startButton.textContent = "REINTENTAR";
    }

    draw();
  }

  /* =======================================================
     REINICIAR / INICIAR
     ======================================================= */

  function resetGame() {
    running = false;
    cancelAnimationFrame(animationFrame);

    score = 0;
    lives = 3;
    cameraAngle = 0;
    spawnTimer = 0;
    nextSpawn = 600;
    lastTime = 0;

    clearTargets();
    updateHud();

    overlay?.classList.remove("hidden");

    if (overlayTitle) {
      overlayTitle.textContent = "ANTITRONKS";
    }

    if (overlayText) {
      overlayText.textContent = record > 0 ? `${INTRO_TEXT} Tu récord: ${record} puntos.` : INTRO_TEXT;
    }

    if (startButton) {
      startButton.textContent = "JUGAR";
    }

    message?.classList.remove("visible");
    flash?.classList.remove("active");
    flashTimer = 0;

    resize();
    draw();
  }

  function startGame() {
    score = 0;
    lives = 3;
    cameraAngle = 0;
    spawnTimer = 0;
    nextSpawn = 500;

    clearTargets();
    updateHud();

    running = true;
    overlay?.classList.add("hidden");
    TronkSound.play("start");

    lastTime = performance.now();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(loop);
  }

  /* =======================================================
     ABRIR / CERRAR
     ======================================================= */

  function openGame() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("antitronks-open");

    TronkSound.startMusic("night");

    resize();
    resetGame();
  }

  function closeGame() {
    running = false;
    cancelAnimationFrame(animationFrame);
    clearTargets();

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("antitronks-open");

    keys.clear();
    mouseInside = false;

    TronkSound.stopMusic();
  }

  /* =======================================================
     ACTUALIZACIÓN
     ======================================================= */

  function update(delta) {
    gameTime += delta;

    /*
     * Giro de cámara con A / D: rápido y directo (sin retraso).
     */
    let turn = 0;

    // La cámara solo gira con A (izquierda) y D (derecha).
    if (keys.has("a")) {
      turn -= KEY_TURN_SPEED;
    }

    if (keys.has("d")) {
      turn += KEY_TURN_SPEED;
    }

    cameraAngle = clamp(cameraAngle + (turn * delta) / 1000, -CAMERA_LIMIT, CAMERA_LIMIT);

    /*
     * Aparición de enemigos.
     */
    spawnTimer += delta;

    if (spawnTimer >= nextSpawn) {
      spawnTarget();
      spawnTimer = 0;
      nextSpawn = getSpawnInterval() * rand(0.75, 1.15);
    }

    /*
     * Enemigos y civiles.
     */
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i];
      t.stateTime += delta;

      // Pitido de aviso justo antes de que el enemigo dispare.
      if (t.type === "enemy" && t.state === "up" && !t.warned && t.reaction - t.stateTime < 500) {
        t.warned = true;
        TronkSound.play("warning");
      }

      if (t.state === "rising" && t.stateTime >= RISE_TIME) {
        setState(t, "up");
      } else if (t.state === "up" && t.stateTime >= t.reaction) {
        if (t.type === "enemy") {
          setState(t, "firing");
          TronkSound.play("enemyShot");
          damagePlayer("¡TE HAN DISPARADO!");

          if (!running) {
            return;
          }
        } else {
          setState(t, "hiding");
        }
      } else if (t.state === "firing" && t.stateTime >= FIRE_TIME) {
        setState(t, "hiding");
      } else if (t.state === "hiding" && t.stateTime >= HIDE_TIME) {
        targets.splice(i, 1);
      } else if (t.state === "dying" && t.stateTime >= DEATH_TIME) {
        targets.splice(i, 1);
      }
    }

    updateEffects(delta);

    if (flashTimer > 0) {
      flashTimer -= delta;

      if (flashTimer <= 0) {
        flash?.classList.remove("active");
      }
    }

    if (messageTimer > 0) {
      messageTimer -= delta;

      if (messageTimer <= 0) {
        message?.classList.remove("visible");
      }
    }
  }

  /* =======================================================
     DIBUJAR TODO
     ======================================================= */

  function draw() {
    if (width <= 1 || height <= 1) {
      return;
    }

    camCos = Math.cos(cameraAngle);
    camSin = Math.sin(cameraAngle);
    indicators = [];

    ctx.clearRect(0, 0, width, height);

    drawSky();
    drawSkyline();
    drawGround();
    drawFacades();
    drawLamps();
    drawObjects();
    drawIndicators();
    drawEffects();
    drawPlayerWeapon();
    drawOffscreenArrows();
    drawCrosshair();
  }

  function loop(now) {
    if (!running) {
      draw();
      return;
    }

    const delta = Math.min(40, now - lastTime || 16);
    lastTime = now;

    update(delta);
    draw();

    if (running) {
      animationFrame = requestAnimationFrame(loop);
    }
  }

  /* =======================================================
     CONTROLES
     ======================================================= */

  function localPoint(clientX, clientY) {
    const rect = game.getBoundingClientRect();

    return {
      x: clamp(clientX - rect.left, 0, rect.width),
      y: clamp(clientY - rect.top, 0, rect.height)
    };
  }

  card.addEventListener("click", openGame);

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openGame();
    }
  });

  closeButton?.addEventListener("click", closeGame);
  backdrop?.addEventListener("click", closeGame);
  startButton?.addEventListener("click", startGame);

  // Ratón: la mira sigue al ratón.
  game.addEventListener("mousemove", (event) => {
    const p = localPoint(event.clientX, event.clientY);
    mouseX = p.x;
    mouseY = p.y;
    mouseInside = true;
  });

  game.addEventListener("mouseleave", () => {
    mouseInside = false;
  });

  // Clic: dispara exactamente donde está el ratón.
  game.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || !running) {
      return;
    }

    event.preventDefault();

    const p = localPoint(event.clientX, event.clientY);
    mouseX = p.x;
    mouseY = p.y;
    mouseInside = true;

    shootAt(p.x, p.y);
  });

  // Táctil: tocar = disparar ahí; arrastrar = girar la cámara.
  game.addEventListener(
    "touchstart",
    (event) => {
      if (!running) {
        return;
      }

      const touch = event.changedTouches[0];

      if (!touch) {
        return;
      }

      const p = localPoint(touch.clientX, touch.clientY);
      touchInfo = { startX: p.x, lastX: p.x, moved: false };
    },
    { passive: true }
  );

  game.addEventListener(
    "touchmove",
    (event) => {
      const touch = event.changedTouches[0];

      if (!touch || !touchInfo) {
        return;
      }

      const p = localPoint(touch.clientX, touch.clientY);
      const dx = p.x - touchInfo.lastX;
      touchInfo.lastX = p.x;

      if (Math.abs(p.x - touchInfo.startX) > 12) {
        touchInfo.moved = true;
      }

      if (touchInfo.moved) {
        cameraAngle = clamp(cameraAngle - (dx / focal) * 1.3, -CAMERA_LIMIT, CAMERA_LIMIT);
      }
    },
    { passive: true }
  );

  game.addEventListener(
    "touchend",
    (event) => {
      const touch = event.changedTouches[0];

      if (touch && touchInfo && !touchInfo.moved && running) {
        const p = localPoint(touch.clientX, touch.clientY);
        mouseX = p.x;
        mouseY = p.y;
        shootAt(p.x, p.y);
      }

      touchInfo = null;
    },
    { passive: true }
  );

  // Teclado.
  window.addEventListener("keydown", (event) => {
    if (modal.classList.contains("hidden")) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === "a" || key === "d") {
      keys.add(key);
      event.preventDefault();
    }

    if (key === "escape") {
      closeGame();
    }

    if (event.code === "Space" && running) {
      event.preventDefault();

      if (!event.repeat) {
        shootAt(mouseInside ? mouseX : width / 2, mouseInside ? mouseY : height * HORIZON_Y);
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  window.addEventListener("resize", () => {
    if (modal.classList.contains("hidden")) {
      return;
    }

    resize();

    if (!running) {
      draw();
    }
  });

  resetGame();
}

/* =========================================================
   PROTECT MOGOS - DIBUJOS (bolas ninja, rey, árboles, castillo)
   Están fuera del juego para poder reutilizarlos (por ejemplo,
   para la imagen de la tarjeta).
   ========================================================= */

const ANTININJA_TAU = Math.PI * 2;

function antininjaRandom(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function antininjaEllipse(g, x, y, rx, ry) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, ANTININJA_TAU);
  g.fill();
}

function antininjaRoundRect(g, x, y, w, h, r) {
  g.beginPath();

  if (typeof g.roundRect === "function") {
    g.roundRect(x, y, w, h, r);
  } else {
    g.rect(x, y, w, h);
  }
}

/*
 * Ninja bola clásico: bola negra, rendija de la cara con los
 * ojos y cinta en la cabeza con las colas del nudo al viento.
 *  - normal:  cinta roja (1 clic)
 *  - flipper: cinta morada (1 voltereta hacia delante, 2 clics)
 *  - tank:    cinta dorada y armadura (2 clics)
 */
function drawNinjaBall(g, x, y, r, opts = {}) {
  const type = opts.type || "normal";
  const time = opts.time || 0;
  const run = opts.run !== false;

  const band =
    type === "flipper" ? "#9b3fd1" : type === "tank" ? "#f2b90f" : "#e0262b";

  const light = type === "tank" ? "#8c93a3" : "#4a5064";
  const mid = type === "tank" ? "#4b515e" : "#252936";
  const dark = type === "tank" ? "#23262e" : "#0c0e15";

  g.save();
  g.translate(x, y);

  // Sombra en el césped.
  g.fillStyle = "rgba(0,0,0,.22)";
  antininjaEllipse(g, 0, r * 0.98, r * 0.85, r * 0.22);

  g.rotate(opts.rotation || 0);

  // Pies corriendo.
  const step = run ? Math.sin(time * 0.02) * r * 0.2 : 0;
  g.fillStyle = dark;
  antininjaEllipse(g, -r * 0.42, r * 0.86 + step, r * 0.27, r * 0.17);
  antininjaEllipse(g, r * 0.42, r * 0.86 - step, r * 0.27, r * 0.17);

  // Colas de la cinta ondeando.
  const wave = Math.sin(time * 0.012) * r * 0.12;
  g.strokeStyle = band;
  g.lineCap = "round";
  g.lineWidth = r * 0.17;
  g.beginPath();
  g.moveTo(r * 0.7, -r * 0.5);
  g.quadraticCurveTo(r * 1.1, -r * 0.8 + wave, r * 1.45, -r * 0.62 - wave);
  g.moveTo(r * 0.7, -r * 0.5);
  g.quadraticCurveTo(r * 1.05, -r * 0.45 - wave, r * 1.38, -r * 0.2 + wave);
  g.stroke();

  // Cuerpo (la bola).
  const body = g.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r);
  body.addColorStop(0, light);
  body.addColorStop(0.45, mid);
  body.addColorStop(1, dark);
  g.fillStyle = body;
  g.beginPath();
  g.arc(0, 0, r, 0, ANTININJA_TAU);
  g.fill();

  // Cinta de la cabeza (recortada a la bola).
  g.save();
  g.beginPath();
  g.arc(0, 0, r, 0, ANTININJA_TAU);
  g.clip();
  g.fillStyle = band;
  g.fillRect(-r, -r * 0.68, r * 2, r * 0.22);

  if (type === "tank") {
    // Placa metálica en la frente.
    g.fillStyle = "#c9ced8";
    antininjaRoundRect(g, -r * 0.28, -r * 0.72, r * 0.56, r * 0.3, r * 0.06);
    g.fill();
    g.strokeStyle = "#6d7380";
    g.lineWidth = Math.max(1, r * 0.05);
    g.stroke();
  }

  g.restore();

  // Nudo.
  g.fillStyle = band;
  g.beginPath();
  g.arc(r * 0.74, -r * 0.52, r * 0.13, 0, ANTININJA_TAU);
  g.fill();

  // Rendija de la cara.
  g.fillStyle = "#f2c79d";
  antininjaRoundRect(g, -r * 0.66, -r * 0.34, r * 1.32, r * 0.44, r * 0.21);
  g.fill();

  // Ojos.
  const hurt = opts.hurt;

  if (hurt) {
    g.strokeStyle = "#111";
    g.lineWidth = Math.max(1.2, r * 0.07);

    for (const ex of [-0.27, 0.27]) {
      g.beginPath();
      g.moveTo(r * (ex - 0.1), -r * 0.2);
      g.lineTo(r * (ex + 0.1), -r * 0.0);
      g.moveTo(r * (ex + 0.1), -r * 0.2);
      g.lineTo(r * (ex - 0.1), -r * 0.0);
      g.stroke();
    }
  } else {
    g.fillStyle = "#fff";
    antininjaEllipse(g, -r * 0.27, -r * 0.1, r * 0.14, r * 0.12);
    antininjaEllipse(g, r * 0.27, -r * 0.1, r * 0.14, r * 0.12);

    g.fillStyle = "#111";
    antininjaEllipse(g, -r * 0.25, -r * 0.06, r * 0.065, r * 0.075);
    antininjaEllipse(g, r * 0.25, -r * 0.06, r * 0.065, r * 0.075);

    // Cejas enfadadas.
    g.strokeStyle = "#111";
    g.lineWidth = Math.max(1.2, r * 0.07);
    g.beginPath();
    g.moveTo(-r * 0.44, -r * 0.3);
    g.lineTo(-r * 0.12, -r * 0.2);
    g.moveTo(r * 0.44, -r * 0.3);
    g.lineTo(r * 0.12, -r * 0.2);
    g.stroke();
  }

  // Grietas cuando al ninja de 2 clics ya le has dado una vez.
  if (opts.damaged) {
    g.strokeStyle = "rgba(255,255,255,.75)";
    g.lineWidth = Math.max(1, r * 0.05);
    g.beginPath();
    g.moveTo(-r * 0.5, r * 0.3);
    g.lineTo(-r * 0.25, r * 0.45);
    g.lineTo(-r * 0.32, r * 0.65);
    g.moveTo(r * 0.3, r * 0.25);
    g.lineTo(r * 0.5, r * 0.5);
    g.stroke();
  }

  // Destello blanco al recibir un golpe.
  if (opts.flash) {
    g.globalAlpha = opts.flash;
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(0, 0, r, 0, ANTININJA_TAU);
    g.fill();
    g.globalAlpha = 1;
  }

  g.restore();
}

/*
 * Rey bola con pelo rizado y corona.
 */
function drawKingBall(g, x, y, r, opts = {}) {
  const hurt = opts.hurt;
  const time = opts.time || 0;
  const bob = Math.sin(time * 0.004) * r * 0.04;

  g.save();
  g.translate(x, y + bob);

  // Capa roja con armiño.
  g.fillStyle = "#b3202a";
  antininjaEllipse(g, 0, r * 0.95, r * 1.15, r * 0.55);
  g.fillStyle = "#fff";
  antininjaEllipse(g, 0, r * 0.62, r * 0.95, r * 0.18);
  g.fillStyle = "#111";

  for (const dx of [-0.55, -0.2, 0.2, 0.55]) {
    antininjaEllipse(g, r * dx, r * 0.63, r * 0.035, r * 0.05);
  }

  // Pelo rizado (detrás de la cabeza).
  g.fillStyle = "#6b3a1c";

  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * 0.92 + (i / 12) * Math.PI * 1.16;
    antininjaEllipse(g, Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, r * 0.27, r * 0.27);
  }

  g.strokeStyle = "#4a2610";
  g.lineWidth = Math.max(1, r * 0.04);

  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * 0.92 + (i / 12) * Math.PI * 1.16;
    g.beginPath();
    g.arc(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93, r * 0.13, 0, Math.PI * 1.4);
    g.stroke();
  }

  // Cara (la bola).
  const face = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  face.addColorStop(0, "#ffe0c2");
  face.addColorStop(1, "#e9a97a");
  g.fillStyle = face;
  g.beginPath();
  g.arc(0, 0, r, 0, ANTININJA_TAU);
  g.fill();

  // Rizos del flequillo.
  g.fillStyle = "#6b3a1c";

  for (const dx of [-0.55, -0.25, 0.05, 0.35, 0.62]) {
    antininjaEllipse(g, r * dx, -r * 0.78, r * 0.2, r * 0.17);
  }

  // Mofletes.
  g.fillStyle = "rgba(240,110,110,.45)";
  antininjaEllipse(g, -r * 0.52, r * 0.2, r * 0.16, r * 0.11);
  antininjaEllipse(g, r * 0.52, r * 0.2, r * 0.16, r * 0.11);

  g.fillStyle = "#1a1a1a";
  g.strokeStyle = "#1a1a1a";
  g.lineWidth = Math.max(1.2, r * 0.07);
  g.lineCap = "round";

  if (hurt) {
    // Ojos apretados y boca de susto.
    for (const ex of [-0.3, 0.3]) {
      g.beginPath();
      g.moveTo(r * (ex - 0.12), -r * 0.12);
      g.lineTo(r * (ex + 0.08), -r * 0.04);
      g.lineTo(r * (ex - 0.12), r * 0.04);
      g.stroke();
    }

    antininjaEllipse(g, 0, r * 0.38, r * 0.14, r * 0.17);

    g.fillStyle = "#6fc3ff";
    antininjaEllipse(g, r * 0.72, -r * 0.3, r * 0.08, r * 0.13);
  } else {
    antininjaEllipse(g, -r * 0.3, -r * 0.05, r * 0.08, r * 0.1);
    antininjaEllipse(g, r * 0.3, -r * 0.05, r * 0.08, r * 0.1);

    g.beginPath();
    g.arc(0, r * 0.2, r * 0.3, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
  }

  // Corona.
  g.fillStyle = "#f5c518";
  g.strokeStyle = "#a57d06";
  g.lineWidth = Math.max(1, r * 0.05);
  g.beginPath();
  g.moveTo(-r * 0.5, -r * 0.82);
  g.lineTo(-r * 0.55, -r * 1.35);
  g.lineTo(-r * 0.26, -r * 1.08);
  g.lineTo(0, -r * 1.45);
  g.lineTo(r * 0.26, -r * 1.08);
  g.lineTo(r * 0.55, -r * 1.35);
  g.lineTo(r * 0.5, -r * 0.82);
  g.closePath();
  g.fill();
  g.stroke();

  g.fillStyle = "#e53935";
  antininjaEllipse(g, 0, -r * 0.98, r * 0.08, r * 0.08);
  g.fillStyle = "#1e88e5";
  antininjaEllipse(g, -r * 0.33, -r * 0.93, r * 0.06, r * 0.06);
  antininjaEllipse(g, r * 0.33, -r * 0.93, r * 0.06, r * 0.06);

  g.restore();
}

function drawTreeBall(g, x, y, r, shade = 0) {
  const greens = [
    ["#3f8f3a", "#1f5a24"],
    ["#4c9c3c", "#276329"],
    ["#35803a", "#1a4d22"]
  ];
  const c = greens[shade % greens.length];

  g.fillStyle = "#5a3a1e";
  g.fillRect(x - r * 0.14, y + r * 0.4, r * 0.28, r * 0.75);

  g.fillStyle = "rgba(0,0,0,.2)";
  antininjaEllipse(g, x + r * 0.1, y + r * 1.1, r * 0.8, r * 0.2);

  for (const [dx, dy, k] of [
    [-0.45, 0.15, 0.7],
    [0.45, 0.15, 0.7],
    [0, -0.1, 0.95]
  ]) {
    const cx = x + dx * r;
    const cy = y + dy * r;
    const rr = r * k;
    const grad = g.createRadialGradient(cx - rr * 0.35, cy - rr * 0.4, rr * 0.1, cx, cy, rr);
    grad.addColorStop(0, c[0]);
    grad.addColorStop(1, c[1]);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, rr, 0, ANTININJA_TAU);
    g.fill();
  }
}

function drawForestGrass(g, w, h, seed = 7) {
  const rnd = antininjaRandom(seed);

  const grass = g.createLinearGradient(0, 0, 0, h);
  grass.addColorStop(0, "#3d8a32");
  grass.addColorStop(1, "#5aab43");
  g.fillStyle = grass;
  g.fillRect(0, 0, w, h);

  // Manchas de césped más claro y más oscuro.
  for (let i = 0; i < 26; i++) {
    g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.06)";
    antininjaEllipse(g, rnd() * w, rnd() * h, 20 + rnd() * 60, 10 + rnd() * 30);
  }

  // Briznas.
  g.lineWidth = 1.4;
  g.lineCap = "round";
  const count = Math.floor((w * h) / 900);

  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const s = 3 + rnd() * 4;
    g.strokeStyle = rnd() < 0.5 ? "rgba(30,90,25,.55)" : "rgba(140,210,100,.45)";
    g.beginPath();
    g.moveTo(x - s * 0.5, y - s);
    g.lineTo(x, y);
    g.lineTo(x + s * 0.5, y - s);
    g.stroke();
  }

  // Florecillas.
  const flowers = ["#fff", "#ffe066", "#ff8fb1", "#b39cff"];

  for (let i = 0; i < Math.floor(count / 14); i++) {
    g.fillStyle = flowers[Math.floor(rnd() * flowers.length)];
    antininjaEllipse(g, rnd() * w, rnd() * h, 2, 2);
  }
}

function drawForestSides(g, w, h, seed = 11) {
  const rnd = antininjaRandom(seed);
  const r = Math.max(22, w * 0.075);

  for (const side of [-1, 1]) {
    for (let y = r * 0.6; y < h + r; y += r * 1.25) {
      const x = side < 0 ? rnd() * r * 0.5 : w - rnd() * r * 0.5;
      drawTreeBall(g, x, y, r * (0.85 + rnd() * 0.3), Math.floor(rnd() * 3));
    }
  }
}

function drawForestTop(g, w, seed = 23) {
  const rnd = antininjaRandom(seed);
  const r = Math.max(22, w * 0.075);

  for (let x = -r * 0.3; x < w + r; x += r * 1.15) {
    drawTreeBall(g, x + rnd() * r * 0.3, -r * 0.35 + rnd() * r * 0.3, r * (0.9 + rnd() * 0.3), Math.floor(rnd() * 3));
  }
}

function drawNinjaCastle(g, w, h, top) {
  const stone = "#a3a8ae";
  const stoneDark = "#7d838a";
  const wallH = h - top;
  const merlonW = w / 15;
  const merlonH = Math.max(10, wallH * 0.16);

  // Muralla.
  const wall = g.createLinearGradient(0, top, 0, h);
  wall.addColorStop(0, "#b4b9bf");
  wall.addColorStop(1, "#8a9097");
  g.fillStyle = wall;
  g.fillRect(0, top, w, wallH);

  // Almenas.
  g.fillStyle = stone;

  for (let x = 0; x < w; x += merlonW * 2) {
    g.fillRect(x, top - merlonH, merlonW, merlonH);
  }

  // Ladrillos.
  g.strokeStyle = "rgba(60,64,70,.35)";
  g.lineWidth = 1;
  const brickH = Math.max(8, wallH / 7);
  const brickW = brickH * 2.2;

  for (let row = 0, y = top; y < h; row++, y += brickH) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();

    for (let x = row % 2 ? brickW / 2 : 0; x < w; x += brickW) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, Math.min(h, y + brickH));
      g.stroke();
    }
  }

  // Puerta.
  const doorW = w * 0.18;
  const doorH = wallH * 0.58;
  const dx = w / 2 - doorW / 2;
  const dy = h - doorH;

  g.fillStyle = "#5b3a1f";
  g.beginPath();
  g.moveTo(dx, h);
  g.lineTo(dx, dy + doorW / 2);
  g.arc(w / 2, dy + doorW / 2, doorW / 2, Math.PI, 0);
  g.lineTo(dx + doorW, h);
  g.closePath();
  g.fill();
  g.strokeStyle = "#3a2410";
  g.lineWidth = 2;
  g.stroke();

  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo(dx + (doorW * i) / 4, dy + doorW * 0.2);
    g.lineTo(dx + (doorW * i) / 4, h);
    g.stroke();
  }

  // Torres.
  const towerW = w * 0.18;

  for (const tx of [0, w - towerW]) {
    const tTop = top - wallH * 0.45;
    g.fillStyle = stoneDark;
    g.fillRect(tx, tTop, towerW, h - tTop);

    g.fillStyle = "#8f959c";

    for (let i = 0; i < 3; i++) {
      g.fillRect(tx + (towerW / 5) * i * 2, tTop - merlonH, towerW / 5, merlonH);
    }

    // Aspillera.
    g.fillStyle = "#2b2f35";
    g.fillRect(tx + towerW / 2 - 3, tTop + wallH * 0.2, 6, wallH * 0.3);

    // Bandera.
    const fx = tx + towerW / 2;
    const fy = tTop - merlonH;
    g.strokeStyle = "#3a3a3a";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(fx, fy);
    g.lineTo(fx, fy - wallH * 0.5);
    g.stroke();
    g.fillStyle = "#d32f2f";
    g.beginPath();
    g.moveTo(fx, fy - wallH * 0.5);
    g.lineTo(fx + towerW * 0.4, fy - wallH * 0.4);
    g.lineTo(fx, fy - wallH * 0.3);
    g.closePath();
    g.fill();
  }
}

/* =========================================================
   PROTECT MOGOS - JUEGO
   ========================================================= */

function initializeAntininjaGame() {
  const card = document.querySelector('[data-minigame="antininja"]');
  const modal = document.getElementById("antininja-modal");
  const closeButton = document.getElementById("antininja-close");
  const backdrop = modal?.querySelector(".antitronks-backdrop");
  const game = document.getElementById("antininja-game");
  const canvas = document.getElementById("antininja-canvas");
  const ctx = canvas?.getContext("2d");
  const startButton = document.getElementById("antininja-start");
  const overlay = document.getElementById("antininja-overlay");
  const overlayTitle = document.getElementById("antininja-overlay-title");
  const overlayText = document.getElementById("antininja-overlay-text");
  const scoreElement = document.getElementById("antininja-score");
  const recordElement = document.getElementById("antininja-record");
  const livesElement = document.getElementById("antininja-lives");
  const flash = document.getElementById("antininja-hit-flash");
  const message = document.getElementById("antininja-message");
  const messageText = document.getElementById("antininja-message-text");

  if (!card || !modal || !game || !canvas || !ctx) {
    return;
  }

  /* =======================================================
     CONFIGURACIÓN
     ======================================================= */

  const TAU = ANTININJA_TAU;
  const RECORD_KEY = "antininja-record";

  // A partir de aquí (en % de la altura) empieza el castillo.
  const CASTLE_TOP = 0.8;

  const FLIP_TIME = 520;
  // Cuánto avanza hacia el castillo el ninja morado en cada voltereta.
  const FLIP_PUSH = 0.05;
  const FLIPPER_HP = 2;
  const DEATH_TIME = 380;

  const INTRO_TEXT =
    "Haz clic en los ninjas antes de que lleguen al castillo del rey. Cinta roja: 1 clic. Cinta dorada: 2 clics. Cinta morada: 2 clics, ¡pero con el primero da una voltereta hacia delante y se acerca al castillo!";

  /* =======================================================
     ESTADO
     ======================================================= */

  let width = 1;
  let height = 1;
  let dpr = 1;

  let bgLayer = null;
  let topLayer = null;
  let castleLayer = null;

  let running = false;
  let animationFrame = 0;
  let lastTime = 0;
  let gameTime = 0;

  let score = 0;
  let lives = 3;
  let record = loadRecord();

  let spawnTimer = 0;
  let nextSpawn = 700;

  let ninjas = [];
  let particles = [];
  let floaters = [];

  let kingHurt = 0;
  let shake = 0;
  let flashTimer = 0;
  let messageTimer = 0;

  /* =======================================================
     UTILIDADES
     ======================================================= */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function easeOut(t) {
    t = clamp(t, 0, 1);
    return 1 - (1 - t) * (1 - t);
  }

  function fieldHeight() {
    return height * CASTLE_TOP;
  }

  function baseRadius() {
    return clamp(width * 0.055, 16, 34);
  }

  function ninjaRadius(n) {
    return baseRadius() * (n.type === "tank" ? 1.22 : 1);
  }

  function ninjaPos(n) {
    return {
      x: (n.x + Math.sin(n.phase + gameTime * 0.002) * 0.02) * width,
      y: n.y * fieldHeight()
    };
  }

  /*
   * Dificultad: mismo sistema que Antitronks, sube poco a poco.
   * - Velocidad: cruza el bosque en ~7 s al empezar,
   *   ~5 s con 30 puntos y nunca en menos de ~3,5 s.
   * - Nuevo ninja: cada 1,5 s al empezar, 1,08 s con 30 puntos
   *   y nunca menos de 0,5 s.
   * - Ninjas a la vez: 3 al empezar y 1 más cada 5 puntos (máx. 12).
   * - Salen en grupos: 1 ninja al empezar, 2 a la vez desde 10 puntos,
   *   3 desde 20 y 4 desde 30.
   */
  function getSpeed() {
    return Math.min(0.28, 0.14 + score * 0.002);
  }

  function getSpawnInterval() {
    return Math.max(500, 1500 - score * 14);
  }

  function getMaxNinjas() {
    return Math.min(12, 3 + Math.floor(score / 5));
  }

  function getGroupSize() {
    return Math.min(4, 1 + Math.floor(score / 10));
  }

  /* =======================================================
     RÉCORD
     ======================================================= */

  function loadRecord() {
    try {
      return Math.max(0, parseInt(localStorage.getItem(RECORD_KEY), 10) || 0);
    } catch {
      return 0;
    }
  }

  function saveRecord(value) {
    try {
      localStorage.setItem(RECORD_KEY, String(value));
    } catch {
      // LocalStorage no disponible.
    }
  }

  /* =======================================================
     HUD
     ======================================================= */

  function updateHud() {
    if (scoreElement) {
      scoreElement.textContent = `PUNTOS: ${score}`;
    }

    if (recordElement) {
      recordElement.textContent = `RÉCORD: ${Math.max(record, score)}`;
    }

    if (livesElement) {
      livesElement.textContent = `VIDAS: ${lives}`;
    }
  }

  function showMessage(text, duration = 500) {
    if (!message || !messageText) {
      return;
    }

    messageText.textContent = text;
    message.classList.add("visible");
    messageTimer = duration;
  }

  /* =======================================================
     RESIZE + CAPAS DEL FONDO
     ======================================================= */

  function makeLayer(drawFn) {
    const layer = document.createElement("canvas");
    layer.width = Math.floor(width * dpr);
    layer.height = Math.floor(height * dpr);
    const g = layer.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFn(g);
    return layer;
  }

  function resize() {
    const rect = game.getBoundingClientRect();

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (width <= 1 || height <= 1) {
      return;
    }

    const fh = fieldHeight();

    bgLayer = makeLayer((g) => {
      drawForestGrass(g, width, fh + 20);
      drawForestSides(g, width, fh);
    });

    topLayer = makeLayer((g) => {
      drawForestTop(g, width);
    });

    castleLayer = makeLayer((g) => {
      drawNinjaCastle(g, width, height, fh);
    });
  }

  /* =======================================================
     NINJAS
     ======================================================= */

  function aliveCount() {
    return ninjas.filter((n) => n.state !== "dying").length;
  }

  function pickType() {
    if (score < 3) {
      return "normal";
    }

    const r = Math.random();

    if (r < 0.2) {
      return "flipper";
    }

    if (r < 0.4) {
      return "tank";
    }

    return "normal";
  }

  function spawnNinja(x = rand(0.18, 0.82), y = -0.02) {
    if (!running || aliveCount() >= getMaxNinjas()) {
      return;
    }

    const type = pickType();

    ninjas.push({
      type,
      x,
      y,
      hp: type === "tank" ? 2 : type === "flipper" ? FLIPPER_HP : 1,
      state: "run",
      stateTime: 0,
      phase: rand(0, TAU),
      speedMul: rand(0.9, 1.1) * (type === "tank" ? 0.8 : type === "flipper" ? 1.1 : 1),
      flash: 0,
      damaged: false,
      rotation: 0,
      flipFrom: 0,
      flipTo: 0,
      fallDir: 1
    });
  }

  function setState(n, state) {
    n.state = state;
    n.stateTime = 0;
  }

  function pickNinja(px, py) {
    let best = null;

    for (const n of ninjas) {
      if (n.state === "dying") {
        continue;
      }

      const p = ninjaPos(n);
      const r = ninjaRadius(n) * 1.15;

      if (Math.hypot(px - p.x, py - p.y) <= r && (!best || n.y > best.y)) {
        best = n;
      }
    }

    return best;
  }

  /* =======================================================
     EFECTOS
     ======================================================= */

  function spawnParticles(x, y, color, count, power, size = 4) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: rand(-0.25, 0.25) * power,
        vy: rand(-0.3, 0.1) * power,
        life: 0,
        max: rand(300, 600),
        color,
        size: rand(size * 0.5, size)
      });
    }
  }

  function addFloater(x, y, text, color) {
    floaters.push({ x, y, text, color, life: 0, max: 850 });
  }

  /* =======================================================
     CLIC
     ======================================================= */

  function kill(n, points, p) {
    setState(n, "dying");
    n.fallDir = Math.random() < 0.5 ? -1 : 1;

    score += points;
    updateHud();

    spawnParticles(p.x, p.y, "#e8e8e8", 12, 0.9, 7);
    spawnParticles(p.x, p.y, "#ffd24a", 6, 1.2, 4);
    addFloater(p.x, p.y - 20, `+${points}`, points > 1 ? "#ffd24a" : "#ffffff");
  }

  function clickAt(px, py) {
    if (!running) {
      return;
    }

    const n = pickNinja(px, py);

    if (!n) {
      spawnParticles(px, py, "#2f6b27", 5, 0.5, 3);
      TronkSound.play("swish");
      return;
    }

    // Mientras hace la voltereta no se le puede tocar.
    if (n.state === "flipping") {
      return;
    }

    const p = ninjaPos(n);

    if (n.type === "normal") {
      TronkSound.play("pop");
      kill(n, 1, p);
      return;
    }

    if (n.type === "tank") {
      n.hp -= 1;
      TronkSound.play("clank");

      if (n.hp <= 0) {
        TronkSound.play("pop");
        kill(n, 2, p);
      } else {
        n.flash = 1;
        n.damaged = true;
        n.y = Math.max(-0.02, n.y - 0.035);
        spawnParticles(p.x, p.y, "#cfd4dc", 8, 0.9, 4);
        addFloater(p.x, p.y - 22, "¡OTRA VEZ!", "#ffd24a");
      }

      return;
    }

    // Ninja morado: 2 clics. Con el primero da UNA voltereta corta
    // HACIA DELANTE y se acerca al castillo; con el segundo muere.
    n.hp -= 1;

    if (n.hp <= 0) {
      TronkSound.play("pop");
      kill(n, 2, p);
      return;
    }

    n.flipFrom = n.y;
    n.flipTo = n.y + FLIP_PUSH;
    setState(n, "flipping");
    TronkSound.play("flip");
    spawnParticles(p.x, p.y + ninjaRadius(n), "#8fcf6a", 6, 0.7, 4);
    addFloater(p.x, p.y - 22, "¡VOLTERETA!", "#d9a6ff");
  }

  /* =======================================================
     DAÑO / GAME OVER
     ======================================================= */

  function ninjaReachedCastle(n) {
    const p = ninjaPos(n);

    lives -= 1;
    updateHud();
    TronkSound.play("castleHit");

    kingHurt = 900;
    shake = 280;

    spawnParticles(p.x, fieldHeight(), "#9da3aa", 14, 1, 6);

    flash?.classList.add("active");
    flashTimer = 180;
    showMessage("¡UN NINJA HA LLEGADO AL CASTILLO!", 900);

    if (lives <= 0) {
      gameOver();
    }
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(animationFrame);

    ninjas = [];
    particles = [];
    floaters = [];
    shake = 0;
    flashTimer = 0;
    messageTimer = 0;
    flash?.classList.remove("active");
    message?.classList.remove("visible");

    const newRecord = score > record;

    if (newRecord) {
      record = score;
      saveRecord(record);
    }

    TronkSound.play(newRecord ? "record" : "gameOver");

    updateHud();

    overlay?.classList.remove("hidden");

    if (overlayTitle) {
      overlayTitle.textContent = newRecord ? "¡NUEVO RÉCORD!" : "GAME OVER";
    }

    if (overlayText) {
      overlayText.textContent = newRecord
        ? `Has conseguido ${score} punto${score === 1 ? "" : "s"}. ¡Es tu mejor marca!`
        : `Has conseguido ${score} punto${score === 1 ? "" : "s"}. Tu récord es ${record}.`;
    }

    if (startButton) {
      startButton.textContent = "REINTENTAR";
    }

    draw();
  }

  /* =======================================================
     REINICIAR / INICIAR / ABRIR / CERRAR
     ======================================================= */

  function resetGame() {
    running = false;
    cancelAnimationFrame(animationFrame);

    score = 0;
    lives = 3;
    spawnTimer = 0;
    nextSpawn = 700;
    ninjas = [];
    particles = [];
    floaters = [];
    kingHurt = 0;
    shake = 0;
    flashTimer = 0;
    flash?.classList.remove("active");
    message?.classList.remove("visible");

    updateHud();

    overlay?.classList.remove("hidden");

    if (overlayTitle) {
      overlayTitle.textContent = "PROTECT MOGOS";
    }

    if (overlayText) {
      overlayText.textContent = record > 0 ? `${INTRO_TEXT} Tu récord: ${record} puntos.` : INTRO_TEXT;
    }

    if (startButton) {
      startButton.textContent = "JUGAR";
    }

    resize();
    draw();
  }

  function startGame() {
    score = 0;
    lives = 3;
    spawnTimer = 0;
    nextSpawn = 500;
    ninjas = [];
    particles = [];
    floaters = [];
    kingHurt = 0;

    updateHud();

    running = true;
    overlay?.classList.add("hidden");
    TronkSound.play("start");

    lastTime = performance.now();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(loop);
  }

  function openGame() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("antitronks-open");

    TronkSound.startMusic("calm");

    resetGame();
  }

  function closeGame() {
    running = false;
    cancelAnimationFrame(animationFrame);
    ninjas = [];

    TronkSound.stopMusic();

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("antitronks-open");
  }

  /* =======================================================
     ACTUALIZACIÓN
     ======================================================= */

  function update(delta) {
    gameTime += delta;

    spawnTimer += delta;

    if (spawnTimer >= nextSpawn) {
      // Cuantos más puntos, más ninjas salen a la vez (en grupo).
      const group = getGroupSize();

      for (let k = 0; k < group; k++) {
        const x = group === 1 ? rand(0.18, 0.82) : 0.18 + ((k + rand(0.15, 0.85)) / group) * 0.64;
        spawnNinja(x, -0.02 - k * 0.03);
      }

      spawnTimer = 0;
      nextSpawn = getSpawnInterval() * rand(0.75, 1.2);
    }

    const speed = getSpeed();
    const fh = fieldHeight();

    for (let i = ninjas.length - 1; i >= 0; i--) {
      const n = ninjas[i];
      n.stateTime += delta;
      n.flash = Math.max(0, n.flash - delta / 150);

      if (n.state === "run") {
        n.y += (speed * n.speedMul * delta) / 1000;

        if (n.y * fh + ninjaRadius(n) * 0.9 >= fh) {
          ninjas.splice(i, 1);
          ninjaReachedCastle(n);

          if (!running) {
            return;
          }
        }
      } else if (n.state === "flipping") {
        const t = n.stateTime / FLIP_TIME;
        n.y = n.flipFrom + (n.flipTo - n.flipFrom) * easeOut(t);
        // Voltereta hacia delante (gira hacia el castillo).
        n.rotation = TAU * clamp(t, 0, 1);

        if (t >= 1) {
          n.rotation = 0;
          setState(n, "run");
        }

        // Si la voltereta le lleva hasta el castillo, cuenta como que ha llegado.
        if (n.y * fh + ninjaRadius(n) * 0.9 >= fh) {
          ninjas.splice(i, 1);
          ninjaReachedCastle(n);

          if (!running) {
            return;
          }
        }
      } else if (n.state === "dying" && n.stateTime >= DEATH_TIME) {
        ninjas.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += delta;
      p.vy += 0.0012 * delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;

      if (p.life >= p.max) {
        particles.splice(i, 1);
      }
    }

    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life += delta;
      f.y -= 0.05 * delta;

      if (f.life >= f.max) {
        floaters.splice(i, 1);
      }
    }

    kingHurt = Math.max(0, kingHurt - delta);
    shake = Math.max(0, shake - delta);

    if (flashTimer > 0) {
      flashTimer -= delta;

      if (flashTimer <= 0) {
        flash?.classList.remove("active");
      }
    }

    if (messageTimer > 0) {
      messageTimer -= delta;

      if (messageTimer <= 0) {
        message?.classList.remove("visible");
      }
    }
  }

  /* =======================================================
     DIBUJAR
     ======================================================= */

  function drawNinja(n) {
    const p = ninjaPos(n);
    const r = ninjaRadius(n);

    if (n.state === "dying") {
      const k = n.stateTime / DEATH_TIME;

      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.translate(p.x, p.y);
      ctx.scale(1 + k * 0.4, 1 + k * 0.4);
      drawNinjaBall(ctx, 0, 0, r, {
        type: n.type,
        time: gameTime,
        run: false,
        hurt: true,
        rotation: n.fallDir * k * 1.5
      });
      ctx.restore();
      return;
    }

    drawNinjaBall(ctx, p.x, p.y, r, {
      type: n.type,
      time: gameTime + n.phase * 300,
      run: n.state === "run",
      rotation: n.rotation,
      damaged: n.damaged,
      flash: n.flash
    });

    // Puntos de vida de los ninjas de varios clics.
    if (n.type === "tank" || n.type === "flipper") {
      const max = n.type === "tank" ? 2 : FLIPPER_HP;
      const color = n.type === "tank" ? "#ffd24a" : "#d9a6ff";

      for (let i = 0; i < max; i++) {
        ctx.fillStyle = i < n.hp ? color : "rgba(0,0,0,.4)";
        ctx.beginPath();
        ctx.arc(p.x - ((max - 1) * 12) / 2 + i * 12, p.y - r - 12, 4, 0, TAU);
        ctx.fill();
      }
    }
  }

  function draw() {
    if (width <= 1 || height <= 1) {
      return;
    }

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    if (shake > 0) {
      const s = (shake / 280) * 6;
      ctx.translate(rand(-s, s), rand(-s, s));
    }

    if (bgLayer) {
      ctx.drawImage(bgLayer, 0, 0, width, height);
    }

    [...ninjas].sort((a, b) => a.y - b.y).forEach(drawNinja);

    if (topLayer) {
      ctx.drawImage(topLayer, 0, 0, width, height);
    }

    const fh = fieldHeight();
    const kingR = clamp(width * 0.085, 26, 46);
    // El rey asoma por encima de las almenas (su altura = la de drawNinjaCastle).
    const merlonH = Math.max(10, (height - fh) * 0.16);
    drawKingBall(ctx, width / 2, fh - merlonH - kingR * 0.7, kingR, {
      hurt: kingHurt > 0,
      time: gameTime
    });

    if (castleLayer) {
      ctx.drawImage(castleLayer, 0, 0, width, height);
    }

    for (const p of particles) {
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.font = "900 18px system-ui, sans-serif";

    for (const f of floaters) {
      ctx.globalAlpha = 1 - f.life / f.max;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,.8)";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function loop(now) {
    if (!running) {
      draw();
      return;
    }

    const delta = Math.min(40, now - lastTime || 16);
    lastTime = now;

    update(delta);
    draw();

    if (running) {
      animationFrame = requestAnimationFrame(loop);
    }
  }

  /* =======================================================
     CONTROLES
     ======================================================= */

  card.addEventListener("click", openGame);

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openGame();
    }
  });

  closeButton?.addEventListener("click", closeGame);
  backdrop?.addEventListener("click", closeGame);
  startButton?.addEventListener("click", startGame);

  // Ratón y táctil: clic / toque sobre el ninja.
  game.addEventListener("pointerdown", (event) => {
    if (!running || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    const rect = game.getBoundingClientRect();
    clickAt(event.clientX - rect.left, event.clientY - rect.top);
  });

  window.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("hidden") && event.key === "Escape") {
      closeGame();
    }
  });

  window.addEventListener("resize", () => {
    if (modal.classList.contains("hidden")) {
      return;
    }

    resize();

    if (!running) {
      draw();
    }
  });

  resetGame();
}

/* =========================================================
   STICK DRILL - DIBUJOS (stickman y taladro)
   ========================================================= */

function drawStickman(g, x, y, h, color, opts = {}) {
  const dead = opts.dead;
  const phase = opts.phase || 0;
  const facing = opts.facing || 1;
  const lw = Math.max(2, h * 0.075);

  g.save();
  g.translate(x, y);

  // Sombra.
  g.fillStyle = "rgba(0,0,0,.3)";
  g.beginPath();
  g.ellipse(0, h * 0.44, h * 0.22, h * 0.06, 0, 0, Math.PI * 2);
  g.fill();

  if (dead) {
    // Tumbado en el suelo.
    g.rotate(Math.PI / 2 * facing);
    g.globalAlpha = 0.65;
  }

  g.strokeStyle = dead ? "#9aa0a6" : color;
  g.lineWidth = lw;
  g.lineCap = "round";
  g.lineJoin = "round";

  const swing = dead ? 0.3 : Math.sin(phase) * 0.55;
  const hip = h * 0.1;
  const neck = -h * 0.22;
  const leg = h * 0.32;
  const arm = h * 0.24;

  // Piernas.
  g.beginPath();
  g.moveTo(0, hip);
  g.lineTo(Math.sin(swing) * leg, hip + Math.cos(swing) * leg);
  g.moveTo(0, hip);
  g.lineTo(Math.sin(-swing) * leg, hip + Math.cos(-swing) * leg);

  // Cuerpo.
  g.moveTo(0, hip);
  g.lineTo(0, neck);

  // Brazos.
  const shoulder = neck + h * 0.05;
  g.moveTo(0, shoulder);
  g.lineTo(Math.sin(-swing) * arm, shoulder + Math.cos(-swing) * arm);
  g.moveTo(0, shoulder);
  g.lineTo(Math.sin(swing) * arm, shoulder + Math.cos(swing) * arm);
  g.stroke();

  // Cabeza.
  const headR = h * 0.14;
  const headY = neck - headR * 0.95;
  g.fillStyle = dead ? "#c9ccd0" : "#fff";
  g.beginPath();
  g.arc(0, headY, headR, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // Ojos.
  g.strokeStyle = "#111";
  g.fillStyle = "#111";
  g.lineWidth = Math.max(1, h * 0.03);

  if (dead) {
    for (const ex of [-0.35, 0.35]) {
      const cx = ex * headR;
      const cy = headY - headR * 0.1;
      const s = headR * 0.2;
      g.beginPath();
      g.moveTo(cx - s, cy - s);
      g.lineTo(cx + s, cy + s);
      g.moveTo(cx + s, cy - s);
      g.lineTo(cx - s, cy + s);
      g.stroke();
    }
  } else {
    for (const ex of [-0.3, 0.3]) {
      g.beginPath();
      g.arc(ex * headR + facing * headR * 0.15, headY - headR * 0.1, Math.max(1, headR * 0.14), 0, Math.PI * 2);
      g.fill();
    }
  }

  g.restore();
}

/*
 * Taladro cónico con espiral giratoria (diseño propio).
 * angle = hacia dónde apunta la punta.
 */
function drawDrill(g, x, y, angle, len, wid, spin) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);

  const back = -len * 0.45;
  const tip = len * 0.55;
  const half = wid / 2;

  // Cono.
  g.beginPath();
  g.moveTo(back, -half);
  g.lineTo(tip, 0);
  g.lineTo(back, half);
  g.closePath();

  const body = g.createLinearGradient(0, -half, 0, half);
  body.addColorStop(0, "#fff1a8");
  body.addColorStop(0.35, "#f5c21b");
  body.addColorStop(1, "#a86b00");
  g.fillStyle = body;
  g.fill();

  // Espiral: franjas diagonales que se desplazan al girar.
  g.save();
  g.clip();
  g.strokeStyle = "rgba(90,50,0,.65)";
  g.lineWidth = Math.max(1.5, wid * 0.09);
  const step = len * 0.16;
  const offset = ((spin % 1) + 1) % 1 * step;

  for (let sx = back - step * 2 + offset; sx < tip + step; sx += step) {
    g.beginPath();
    g.moveTo(sx, -half);
    g.lineTo(sx + step * 0.9, half);
    g.stroke();
  }

  g.restore();

  g.strokeStyle = "#6b4300";
  g.lineWidth = Math.max(1, wid * 0.05);
  g.beginPath();
  g.moveTo(back, -half);
  g.lineTo(tip, 0);
  g.lineTo(back, half);
  g.stroke();

  // Base del taladro.
  g.fillStyle = "#c2410c";
  g.strokeStyle = "#5c1d05";
  g.beginPath();

  if (typeof g.roundRect === "function") {
    g.roundRect(back - len * 0.12, -half * 1.05, len * 0.14, half * 2.1, wid * 0.12);
  } else {
    g.rect(back - len * 0.12, -half * 1.05, len * 0.14, half * 2.1);
  }

  g.fill();
  g.stroke();

  // Brillo en la punta.
  g.fillStyle = "rgba(255,255,255,.9)";
  g.beginPath();
  g.arc(tip - len * 0.05, 0, Math.max(1.5, wid * 0.06), 0, Math.PI * 2);
  g.fill();

  g.restore();
}

function drawDrillArena(g, S, m) {
  // Suelo metálico.
  const floor = g.createLinearGradient(0, 0, S, S);
  floor.addColorStop(0, "#2b3240");
  floor.addColorStop(1, "#1b202b");
  g.fillStyle = floor;
  g.fillRect(0, 0, S, S);

  // Cuadrícula.
  g.strokeStyle = "rgba(255,255,255,.05)";
  g.lineWidth = 1;
  const cells = 12;
  const inner = S - m * 2;

  for (let i = 0; i <= cells; i++) {
    const p = m + (inner * i) / cells;
    g.beginPath();
    g.moveTo(p, m);
    g.lineTo(p, S - m);
    g.moveTo(m, p);
    g.lineTo(S - m, p);
    g.stroke();
  }

  // Círculo central.
  g.strokeStyle = "rgba(255,255,255,.08)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(S / 2, S / 2, inner * 0.14, 0, Math.PI * 2);
  g.stroke();

  // Muros con franjas de peligro.
  g.save();
  g.beginPath();
  g.rect(0, 0, S, S);
  g.rect(m, m, inner, inner);
  g.clip("evenodd");
  g.fillStyle = "#f2b90f";
  g.fillRect(0, 0, S, S);
  g.strokeStyle = "#1a1a1a";
  g.lineWidth = m * 0.8;

  for (let k = -S; k < S * 2; k += m * 2.2) {
    g.beginPath();
    g.moveTo(k, 0);
    g.lineTo(k + S, S);
    g.stroke();
  }

  g.restore();

  g.strokeStyle = "rgba(0,0,0,.6)";
  g.lineWidth = 2;
  g.strokeRect(m, m, inner, inner);
}

/* =========================================================
   STICK DRILL - JUEGO
   ========================================================= */

function initializeStickDrillGame() {
  const card = document.querySelector('[data-minigame="stickdrill"]');
  const modal = document.getElementById("stickdrill-modal");
  const closeButton = document.getElementById("stickdrill-close");
  const backdrop = modal?.querySelector(".antitronks-backdrop");
  const game = document.getElementById("stickdrill-game");
  const canvas = document.getElementById("stickdrill-canvas");
  const ctx = canvas?.getContext("2d");
  const overlay = document.getElementById("stickdrill-overlay");
  const overlayTitle = document.getElementById("stickdrill-overlay-title");
  const overlayText = document.getElementById("stickdrill-overlay-text");
  const botButton = document.getElementById("stickdrill-bot");
  const duoButton = document.getElementById("stickdrill-2p");
  const p1Element = document.getElementById("stickdrill-p1");
  const p2Element = document.getElementById("stickdrill-p2");
  const timeElement = document.getElementById("stickdrill-time");
  const recordElement = document.getElementById("stickdrill-record");
  const flash = document.getElementById("stickdrill-hit-flash");
  const message = document.getElementById("stickdrill-message");
  const messageText = document.getElementById("stickdrill-message-text");

  if (!card || !modal || !game || !canvas || !ctx) {
    return;
  }

  /* =======================================================
     CONFIGURACIÓN
     ======================================================= */

  const TAU = Math.PI * 2;
  const RECORD_KEY = "stickdrill-record";

  const PLAYER_SPEED = 0.42;
  const PLAYER_R = 0.022;
  // Bot: algo más lento que un jugador, mira poco hacia delante
  // y a veces se "despista" un momento, para que se le pueda ganar.
  const BOT_SPEED_MUL = 0.88;
  const BOT_THINK_EVERY = 0.17;
  const BOT_LOOKAHEAD = 0.4;

  const DRILL_LEN = 0.13;
  const DRILL_WID = 0.075;
  const DRILL_BOUNCE_R = 0.05;

  // Momentos (segundos) en los que aparece un taladro más.
  const EXTRA_DRILLS_AT = [15, 35, 60, 90];
  const WARN_TIME = 1.3;

  const INTRO_TEXT =
    "Esquiva el taladro que rebota por las paredes. El que caiga primero pierde. Jugador 1 (azul): W A S D. Jugador 2 (rojo): flechas.";

  /* =======================================================
     ESTADO
     ======================================================= */

  let width = 1;
  let height = 1;
  let dpr = 1;
  let S = 1;
  let margin = 1;
  let offX = 0;
  let offY = 0;
  let arenaLayer = null;

  let mode = "bot";
  let state = "menu";
  let animationFrame = 0;
  let lastTime = 0;

  let time = 0;
  let countdown = 0;
  let lastCount = 0;

  let players = [];
  let drills = [];
  let pending = [];
  let extraIndex = 0;
  let particles = [];
  let firstDead = null;

  let record = loadRecord();

  let shake = 0;
  let flashTimer = 0;
  let messageTimer = 0;

  const keys = new Set();

  /* =======================================================
     UTILIDADES
     ======================================================= */

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function fmt(seconds) {
    return `${seconds.toFixed(1)} s`;
  }

  // Coordenadas del campo (0..1) a píxeles.
  function sx(x) {
    return offX + margin + x * (S - margin * 2);
  }

  function sy(y) {
    return offY + margin + y * (S - margin * 2);
  }

  function unit() {
    return S - margin * 2;
  }

  // Refleja una posición dentro de [lo, hi] (rebotes).
  function fold(v, lo, hi) {
    const range = hi - lo;
    const period = range * 2;
    let t = (v - lo) % period;

    if (t < 0) {
      t += period;
    }

    return lo + (t > range ? period - t : t);
  }

  function drillSpeed() {
    return Math.min(0.95, 0.33 + time * 0.012);
  }

  /* =======================================================
     RÉCORD (por tiempo)
     ======================================================= */

  function loadRecord() {
    try {
      return Math.max(0, parseFloat(localStorage.getItem(RECORD_KEY)) || 0);
    } catch {
      return 0;
    }
  }

  function saveRecord(value) {
    try {
      localStorage.setItem(RECORD_KEY, String(value));
    } catch {
      // LocalStorage no disponible.
    }
  }

  /* =======================================================
     HUD
     ======================================================= */

  function updateHud() {
    if (timeElement) {
      timeElement.textContent = `TIEMPO: ${fmt(time)}`;
    }

    if (recordElement) {
      recordElement.textContent = `RÉCORD: ${fmt(record)}`;
    }

    const [p1, p2] = players;

    if (p1Element) {
      p1Element.textContent = p1 ? `${p1.label}: ${p1.alive ? "VIVO" : fmt(p1.deathTime)}` : "J1";
    }

    if (p2Element) {
      p2Element.textContent = p2 ? `${p2.label}: ${p2.alive ? "VIVO" : fmt(p2.deathTime)}` : "J2";
    }
  }

  function showMessage(text, duration = 1200) {
    if (!message || !messageText) {
      return;
    }

    messageText.textContent = text;
    message.classList.add("visible");
    messageTimer = duration;
  }

  /* =======================================================
     RESIZE
     ======================================================= */

  function resize() {
    const rect = game.getBoundingClientRect();

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    S = Math.min(width, height);
    margin = S * 0.03;
    offX = (width - S) / 2;
    offY = (height - S) / 2;

    if (S <= 1) {
      return;
    }

    arenaLayer = document.createElement("canvas");
    arenaLayer.width = Math.floor(S * dpr);
    arenaLayer.height = Math.floor(S * dpr);
    const g = arenaLayer.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawDrillArena(g, S, margin);
  }

  /* =======================================================
     PREPARAR PARTIDA
     ======================================================= */

  function makeDrill(x, y) {
    const a = rand(0, TAU);

    return {
      x,
      y,
      vx: Math.cos(a),
      vy: Math.sin(a),
      spin: 0,
      bounceCooldown: 0
    };
  }

  function setupRound() {
    time = 0;
    extraIndex = 0;
    particles = [];
    pending = [];
    firstDead = null;
    shake = 0;

    players = [
      {
        id: 1,
        label: "J1",
        color: "#3b82f6",
        x: 0.2,
        y: 0.5,
        alive: true,
        deathTime: 0,
        isBot: false,
        up: "w",
        down: "s",
        left: "a",
        right: "d",
        facing: 1,
        phase: 0,
        moving: false,
        dirX: 0,
        dirY: 0,
        thinkTimer: 0
      },
      {
        id: 2,
        label: mode === "bot" ? "BOT" : "J2",
        color: "#ef4444",
        x: 0.8,
        y: 0.5,
        alive: true,
        deathTime: 0,
        isBot: mode === "bot",
        up: "arrowup",
        down: "arrowdown",
        left: "arrowleft",
        right: "arrowright",
        facing: -1,
        phase: 0,
        moving: false,
        dirX: 0,
        dirY: 0,
        thinkTimer: 0
      }
    ];

    // Primer taladro en el centro, apuntando arriba o abajo
    // (nunca directo hacia un jugador).
    const d = makeDrill(0.5, 0.5);
    const a = (Math.random() < 0.5 ? -1 : 1) * rand(Math.PI * 0.3, Math.PI * 0.7);
    d.vx = Math.cos(a);
    d.vy = Math.sin(a);
    drills = [d];

    updateHud();
  }

  function startRound(selectedMode) {
    mode = selectedMode;

    TronkSound.ensure();
    setupRound();

    overlay?.classList.add("hidden");
    message?.classList.remove("visible");

    state = "countdown";
    countdown = 3;
    lastCount = 4;

    lastTime = performance.now();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(loop);
  }

  function showMenu() {
    state = "menu";
    cancelAnimationFrame(animationFrame);
    setupRound();

    overlay?.classList.remove("hidden");

    if (overlayTitle) {
      overlayTitle.textContent = "STICK DRILL";
    }

    if (overlayText) {
      overlayText.textContent = record > 0 ? `${INTRO_TEXT} Récord: ${fmt(record)}.` : INTRO_TEXT;
    }

    flash?.classList.remove("active");
    message?.classList.remove("visible");

    resize();
    draw();
  }

  /* =======================================================
     IA DEL BOT
     ======================================================= */

  function predictDrill(d, tau) {
    const sp = drillSpeed();

    return {
      x: fold(d.x + d.vx * sp * tau, DRILL_BOUNCE_R, 1 - DRILL_BOUNCE_R),
      y: fold(d.y + d.vy * sp * tau, DRILL_BOUNCE_R, 1 - DRILL_BOUNCE_R)
    };
  }

  function botThink(p) {
    const speed = PLAYER_SPEED * BOT_SPEED_MUL;
    const options = [[0, 0]];

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      options.push([Math.cos(a), Math.sin(a)]);
    }

    let best = options[0];
    let bestScore = -Infinity;

    for (const [dx, dy] of options) {
      let score = Infinity;

      for (let tau = 0.1; tau <= BOT_LOOKAHEAD + 0.01; tau += 0.1) {
        const px = clamp(p.x + dx * speed * tau, PLAYER_R, 1 - PLAYER_R);
        const py = clamp(p.y + dy * speed * tau, PLAYER_R, 1 - PLAYER_R);

        for (const d of drills) {
          const q = predictDrill(d, tau);
          // Los peligros cercanos en el tiempo pesan más.
          const dist = Math.hypot(px - q.x, py - q.y) - DRILL_BOUNCE_R;
          score = Math.min(score, dist + tau * 0.05);
        }

        for (const w of pending) {
          score = Math.min(score, Math.hypot(px - w.x, py - w.y) - 0.09);
        }
      }

      const fx = clamp(p.x + dx * speed * 0.4, 0, 1);
      const fy = clamp(p.y + dy * speed * 0.4, 0, 1);

      // Evitar esquinas y paredes, y quedarse más o menos por el centro.
      const wall = Math.min(fx, fy, 1 - fx, 1 - fy);

      if (wall < 0.15) {
        score -= (0.15 - wall) * 0.9;
      }

      score -= Math.hypot(fx - 0.5, fy - 0.5) * 0.06;

      // Un poco de imprecisión para que se le pueda ganar.
      score += rand(-0.03, 0.03);

      if (score > bestScore) {
        bestScore = score;
        best = [dx, dy];
      }
    }

    p.dirX = best[0];
    p.dirY = best[1];
  }

  /* =======================================================
     EFECTOS
     ======================================================= */

  function burst(x, y, color, count, power) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const v = rand(0.05, 0.3) * power;

      particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0,
        max: rand(300, 700),
        color,
        size: rand(2, 5)
      });
    }
  }

  /* =======================================================
     MUERTE Y FIN DE PARTIDA
     ======================================================= */

  function killPlayer(p) {
    p.alive = false;
    p.deathTime = time;

    burst(sx(p.x), sy(p.y), p.color, 26, 1.3);
    burst(sx(p.x), sy(p.y), "#ffd24a", 12, 1);
    TronkSound.play("stickDeath");

    shake = 300;
    flash?.classList.add("active");
    flashTimer = 160;

    if (!firstDead) {
      firstDead = p;
    }

    const other = players.find((q) => q !== p);

    if (other.alive) {
      if (other.isBot) {
        // Si caes tú contra el bot, se acaba ya.
        endRound();
      } else {
        showMessage(`¡${other.id === 1 ? "JUGADOR 1" : "JUGADOR 2"} GANA! Sigue aguantando para el récord`, 2200);
      }
    } else {
      endRound();
    }

    updateHud();
  }

  function endRound() {
    state = "over";
    shake = 0;
    flash?.classList.remove("active");
    message?.classList.remove("visible");

    // El récord solo cuenta a los jugadores humanos.
    const humanTimes = players.filter((p) => !p.isBot).map((p) => (p.alive ? time : p.deathTime));
    const best = humanTimes.length ? Math.max(...humanTimes) : 0;
    const newRecord = best > record;

    if (newRecord) {
      record = best;
      saveRecord(record);
    }

    const [p1, p2] = players;
    let title;

    if (p1.alive === p2.alive && p1.deathTime === p2.deathTime) {
      title = "¡EMPATE!";
    } else {
      const winner = firstDead === p1 ? p2 : p1;
      title = winner.isBot ? "¡GANA EL BOT!" : `¡GANA EL JUGADOR ${winner.id}!`;
    }

    TronkSound.play(newRecord ? "record" : "gameOver");

    overlay?.classList.remove("hidden");

    if (overlayTitle) {
      overlayTitle.textContent = newRecord ? `${title} ¡NUEVO RÉCORD!` : title;
    }

    if (overlayText) {
      const t1 = p1.alive ? time : p1.deathTime;
      const t2 = p2.alive ? time : p2.deathTime;
      overlayText.textContent = `${p1.label}: ${fmt(t1)} · ${p2.label}: ${fmt(t2)}. Récord: ${fmt(record)}.`;
    }

    updateHud();
    draw();
  }

  /* =======================================================
     ACTUALIZACIÓN
     ======================================================= */

  function updatePlayer(p, dt) {
    if (!p.alive) {
      return;
    }

    let dx = 0;
    let dy = 0;
    let speed = PLAYER_SPEED;

    if (p.isBot) {
      p.thinkTimer -= dt;

      if (p.thinkTimer <= 0) {
        botThink(p);
        p.thinkTimer = BOT_THINK_EVERY;

        // De vez en cuando se despista y tarda más en reaccionar.
        if (Math.random() < 0.08) {
          p.thinkTimer += rand(0.25, 0.5);
        }
      }

      dx = p.dirX;
      dy = p.dirY;
      speed *= BOT_SPEED_MUL;
    } else {
      if (keys.has(p.left)) dx -= 1;
      if (keys.has(p.right)) dx += 1;
      if (keys.has(p.up)) dy -= 1;
      if (keys.has(p.down)) dy += 1;
    }

    const len = Math.hypot(dx, dy);
    p.moving = len > 0.01;

    if (p.moving) {
      dx /= len;
      dy /= len;
      p.x = clamp(p.x + dx * speed * dt, PLAYER_R, 1 - PLAYER_R);
      p.y = clamp(p.y + dy * speed * dt, PLAYER_R, 1 - PLAYER_R);
      p.phase += dt * 14;

      if (Math.abs(dx) > 0.2) {
        p.facing = dx > 0 ? 1 : -1;
      }
    } else {
      p.phase *= 0.8;
    }
  }

  function drillHitsPlayer(d, p) {
    const a = Math.atan2(d.vy, d.vx);
    const c = Math.cos(a);
    const s = Math.sin(a);

    // El cono se aproxima con 3 círculos: punta, centro y base.
    const parts = [
      [DRILL_LEN * 0.3, DRILL_WID * 0.18],
      [0, DRILL_WID * 0.36],
      [-DRILL_LEN * 0.28, DRILL_WID * 0.46]
    ];

    return parts.some(([off, r]) => Math.hypot(p.x - (d.x + c * off), p.y - (d.y + s * off)) < r + PLAYER_R);
  }

  function update(dt) {
    if (state === "countdown") {
      countdown -= dt;
      const n = Math.ceil(countdown);

      if (n !== lastCount && n > 0) {
        lastCount = n;
        TronkSound.play("countdown");
      }

      if (countdown <= 0) {
        state = "playing";
        TronkSound.play("go");
      }

      return;
    }

    if (state !== "playing") {
      return;
    }

    time += dt;

    // Nuevos taladros con el tiempo (primero aparece un aviso).
    if (extraIndex < EXTRA_DRILLS_AT.length && time >= EXTRA_DRILLS_AT[extraIndex]) {
      extraIndex++;

      let best = { x: 0.5, y: 0.5 };
      let bestDist = -1;

      for (let i = 0; i < 25; i++) {
        const c = { x: rand(0.15, 0.85), y: rand(0.15, 0.85) };
        const dist = Math.min(...players.filter((p) => p.alive).map((p) => Math.hypot(p.x - c.x, p.y - c.y)), 9);

        if (dist > bestDist) {
          bestDist = dist;
          best = c;
        }
      }

      pending.push({ x: best.x, y: best.y, timer: WARN_TIME });
      TronkSound.play("drillWarning");
      showMessage("¡CUIDADO! ¡OTRO TALADRO!", 1300);
    }

    for (let i = pending.length - 1; i >= 0; i--) {
      pending[i].timer -= dt;

      if (pending[i].timer <= 0) {
        drills.push(makeDrill(pending[i].x, pending[i].y));
        pending.splice(i, 1);
      }
    }

    // Taladros.
    const sp = drillSpeed();

    for (const d of drills) {
      d.x += d.vx * sp * dt;
      d.y += d.vy * sp * dt;
      d.spin += dt * (4 + sp * 6);
      d.bounceCooldown -= dt;

      let bounced = false;

      if (d.x < DRILL_BOUNCE_R) {
        d.x = DRILL_BOUNCE_R;
        d.vx = Math.abs(d.vx);
        bounced = true;
      } else if (d.x > 1 - DRILL_BOUNCE_R) {
        d.x = 1 - DRILL_BOUNCE_R;
        d.vx = -Math.abs(d.vx);
        bounced = true;
      }

      if (d.y < DRILL_BOUNCE_R) {
        d.y = DRILL_BOUNCE_R;
        d.vy = Math.abs(d.vy);
        bounced = true;
      } else if (d.y > 1 - DRILL_BOUNCE_R) {
        d.y = 1 - DRILL_BOUNCE_R;
        d.vy = -Math.abs(d.vy);
        bounced = true;
      }

      if (bounced) {
        // Pequeña variación del ángulo para que no repita siempre el mismo camino.
        const a = Math.atan2(d.vy, d.vx) + rand(-0.12, 0.12);
        d.vx = Math.cos(a);
        d.vy = Math.sin(a);

        // Evitar que quede casi horizontal o vertical (se atasca en línea recta).
        if (Math.abs(d.vx) < 0.25) d.vx = 0.25 * Math.sign(d.vx || 1);
        if (Math.abs(d.vy) < 0.25) d.vy = 0.25 * Math.sign(d.vy || 1);
        const n = Math.hypot(d.vx, d.vy);
        d.vx /= n;
        d.vy /= n;

        burst(sx(d.x - d.vx * 0.03), sy(d.y - d.vy * 0.03), "#ffd24a", 8, 0.8);

        if (d.bounceCooldown <= 0) {
          TronkSound.play("drillBounce");
          d.bounceCooldown = 0.08;
        }
      }
    }

    // Jugadores.
    for (const p of players) {
      updatePlayer(p, dt);
    }

    for (const p of players) {
      if (!p.alive) {
        continue;
      }

      if (drills.some((d) => drillHitsPlayer(d, p))) {
        killPlayer(p);

        if (state !== "playing") {
          return;
        }
      }
    }

    updateHud();
  }

  function updateEffects(ms) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += ms;
      p.x += p.vx * ms;
      p.y += p.vy * ms;
      p.vx *= 0.97;
      p.vy *= 0.97;

      if (p.life >= p.max) {
        particles.splice(i, 1);
      }
    }

    shake = Math.max(0, shake - ms);

    if (flashTimer > 0) {
      flashTimer -= ms;

      if (flashTimer <= 0) {
        flash?.classList.remove("active");
      }
    }

    if (messageTimer > 0) {
      messageTimer -= ms;

      if (messageTimer <= 0) {
        message?.classList.remove("visible");
      }
    }
  }

  /* =======================================================
     DIBUJAR
     ======================================================= */

  function draw() {
    if (S <= 1) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);

    if (shake > 0) {
      const k = (shake / 300) * 7;
      ctx.translate(rand(-k, k), rand(-k, k));
    }

    if (arenaLayer) {
      ctx.drawImage(arenaLayer, offX, offY, S, S);
    }

    const u = unit();

    // Avisos de taladro nuevo.
    for (const w of pending) {
      const pulse = 0.5 + 0.5 * Math.sin(w.timer * 18);
      ctx.fillStyle = `rgba(239,68,68,${0.15 + pulse * 0.25})`;
      ctx.strokeStyle = "rgba(239,68,68,.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx(w.x), sy(w.y), u * 0.07, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `900 ${Math.round(u * 0.06)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", sx(w.x), sy(w.y));
    }

    // Jugadores (los muertos primero, debajo).
    const ordered = [...players].sort((a, b) => (a.alive === b.alive ? a.y - b.y : a.alive ? 1 : -1));

    for (const p of ordered) {
      const h = u * 0.085;
      const x = sx(p.x);
      const y = sy(p.y) - h * 0.1;

      drawStickman(ctx, x, y, h, p.color, { dead: !p.alive, phase: p.phase, facing: p.facing });

      // Etiqueta encima.
      ctx.font = `800 ${Math.max(10, Math.round(u * 0.024))}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,.8)";
      ctx.strokeText(p.label, x, y - h * 0.62);
      ctx.fillStyle = p.alive ? p.color : "#9aa0a6";
      ctx.fillText(p.label, x, y - h * 0.62);
    }

    // Taladros.
    for (const d of drills) {
      const a = Math.atan2(d.vy, d.vx);

      // Estela.
      ctx.strokeStyle = "rgba(255,210,74,.18)";
      ctx.lineWidth = u * DRILL_WID * 0.7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx(d.x), sy(d.y));
      ctx.lineTo(sx(d.x - d.vx * 0.1), sy(d.y - d.vy * 0.1));
      ctx.stroke();

      drawDrill(ctx, sx(d.x), sy(d.y), a, u * DRILL_LEN, u * DRILL_WID, d.spin);
    }

    // Partículas.
    for (const p of particles) {
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Cuenta atrás.
    if (state === "countdown") {
      const n = Math.max(1, Math.ceil(countdown));
      const k = countdown - Math.floor(countdown);
      ctx.font = `900 ${Math.round(u * (0.2 + k * 0.08))}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(0,0,0,.8)";
      ctx.strokeText(String(n), width / 2, height / 2);
      ctx.fillStyle = "#fff";
      ctx.fillText(String(n), width / 2, height / 2);
    }

    ctx.restore();
  }

  function loop(now) {
    const ms = Math.min(40, now - lastTime || 16);
    lastTime = now;

    update(ms / 1000);
    updateEffects(ms);
    draw();

    if (state === "countdown" || state === "playing" || particles.length) {
      animationFrame = requestAnimationFrame(loop);
    }
  }

  /* =======================================================
     ABRIR / CERRAR
     ======================================================= */

  function openGame() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("antitronks-open");

    TronkSound.startMusic("tense");

    showMenu();
  }

  function closeGame() {
    state = "menu";
    cancelAnimationFrame(animationFrame);
    keys.clear();

    TronkSound.stopMusic();

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("antitronks-open");
  }

  /* =======================================================
     CONTROLES
     ======================================================= */

  card.addEventListener("click", openGame);

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openGame();
    }
  });

  closeButton?.addEventListener("click", closeGame);
  backdrop?.addEventListener("click", closeGame);
  botButton?.addEventListener("click", () => startRound("bot"));
  duoButton?.addEventListener("click", () => startRound("duo"));

  const GAME_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

  window.addEventListener("keydown", (event) => {
    if (modal.classList.contains("hidden")) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === "escape") {
      closeGame();
      return;
    }

    if (GAME_KEYS.includes(key)) {
      keys.add(key);
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  window.addEventListener("blur", () => keys.clear());

  window.addEventListener("resize", () => {
    if (modal.classList.contains("hidden")) {
      return;
    }

    resize();
    draw();
  });

  showMenu();
}

/* =========================================================
   VUELTA DESDE EL CORREO DE VERIFICACIÓN
   ========================================================= */

/*
 * Cuando alguien pulsa el enlace del correo, Supabase le trae de
 * vuelta a la web con datos en la dirección (#access_token=...&type=signup
 * o ?error_description=...). Aquí mostramos un mensaje bonito y
 * limpiamos la dirección.
 */
function handleAuthRedirect() {
  const hash = new URLSearchParams(
    window.location.hash.replace(/^#/, "")
  );

  const query = new URLSearchParams(
    window.location.search
  );

  const type =
    hash.get("type") || query.get("type");

  const error =
    hash.get("error_description") ||
    query.get("error_description");

  const hasCode =
    query.has("code") || hash.has("access_token");

  if (!type && !error && !hasCode) {
    return;
  }

  // Esperamos un poco para que Supabase lea los datos de la dirección.
  setTimeout(async () => {
    await updateAccountUI();

    openModal(accountModal);

    if (error) {
      showAuthMessage(
        `No se pudo verificar la cuenta: ${error.replace(/\+/g, " ")}. Si el enlace ha caducado, vuelve a registrarte o inicia sesión.`,
        "error"
      );
    } else {
      showAuthMessage(
        "¡Cuenta verificada! Ya puedes participar en la comunidad.",
        "success"
      );
    }

    window.history.replaceState(
      null,
      "",
      window.location.origin +
        window.location.pathname
    );
  }, 1200);
}

/* =========================================================
   ESCAPE PARA MODALES GENERALES
   ========================================================= */

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key !==
      "Escape"
    ) {
      return;
    }

    if (
      accountModal &&
      !accountModal.classList.contains(
        "hidden"
      )
    ) {
      closeModal(
        accountModal
      );
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
  }
);

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

initializeProjects();

initializeCardImageFallbacks();

loadSuggestions();

updateAccountUI();

handleAuthRedirect();

initializeAntitronksGame();

initializeAntininjaGame();

initializeStickDrillGame();

console.log(
  "TronkStudios: inicialización completada."
);
