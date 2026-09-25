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

    const m = getMuzzle();
    tracers.push({ x0: m.x, y0: m.y, x1: sx, y1: sy, life: 80, max: 80 });

    const hit = pickAt(sx, sy);

    if (!hit) {
      spawnParticles(sx, sy, "#a39d92", 6, 0.6);
      return;
    }

    if (hit.kind === "box") {
      spawnParticles(sx, sy, "#d2a46a", 9, 0.8);
      return;
    }

    const t = hit.target;
    setState(t, "dying");
    t.fallDir = Math.random() < 0.5 ? -1 : 1;
    t.hit = null;

    spawnParticles(sx, sy, "#b3121b", 16, 1.1);

    if (t.type === "enemy") {
      const headshot = hit.part === "head";
      score += headshot ? 2 : 1;
      updateHud();
      addFloater(sx, sy - 14, headshot ? "¡A LA CABEZA! +2" : "+1", headshot ? "#ffd24a" : "#ffffff");
      showMessage(headshot ? "¡DISPARO A LA CABEZA!" : "ENEMIGO ELIMINADO", 450);
    } else {
      addFloater(sx, sy - 14, "¡CIVIL!", "#ff5252");
      damagePlayer("¡HAS DISPARADO A UN CIVIL!");
    }
  }

  /* =======================================================
     DAÑO / GAME OVER
     ======================================================= */

  function damagePlayer(reason) {
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

      if (t.state === "rising" && t.stateTime >= RISE_TIME) {
        setState(t, "up");
      } else if (t.state === "up" && t.stateTime >= t.reaction) {
        if (t.type === "enemy") {
          setState(t, "firing");
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

initializeAntitronksGame();

console.log(
  "TronkStudios: inicialización completada."
);