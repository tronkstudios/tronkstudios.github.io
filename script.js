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
  const card =
    document.querySelector(
      '[data-minigame="antitronks"]'
    );

  const modal =
    document.getElementById(
      "antitronks-modal"
    );

  const closeButton =
    document.getElementById(
      "antitronks-close"
    );

  const backdrop =
    modal?.querySelector(
      ".antitronks-backdrop"
    );

  const game =
    document.getElementById(
      "antitronks-game"
    );

  const canvas =
    document.getElementById(
      "antitronks-canvas"
    );

  const ctx =
    canvas?.getContext(
      "2d"
    );

  const startButton =
    document.getElementById(
      "antitronks-start"
    );

  const overlay =
    document.getElementById(
      "antitronks-overlay"
    );

  const overlayTitle =
    document.getElementById(
      "antitronks-overlay-title"
    );

  const overlayText =
    document.getElementById(
      "antitronks-overlay-text"
    );

  const scoreElement =
    document.getElementById(
      "antitronks-score"
    );

  const livesElement =
    document.getElementById(
      "antitronks-lives"
    );

  const arrowContainer =
    document.getElementById(
      "antitronks-offscreen-enemies"
    );

  const flash =
    document.getElementById(
      "antitronks-hit-flash"
    );

  const message =
    document.getElementById(
      "antitronks-message"
    );

  const messageText =
    document.getElementById(
      "antitronks-message-text"
    );

  if (
    !card ||
    !modal ||
    !game ||
    !canvas ||
    !ctx
  ) {
    return;
  }

  /* =======================================================
     CONFIGURACIÓN DEL JUEGO
     ======================================================= */

  const TAU =
    Math.PI * 2;

  /*
   * FOV de ~92°. Antes era ~140°, lo que
   * obligaba a un mapa enorme para que
   * tuviera sentido.
   */
  const FOV =
    Math.PI * 0.51;

  /*
   * Medio-ángulo máximo que el jugador
   * puede girar la cámara hacia cada
   * lado. Combinado con el FOV, esto es
   * lo que limita el campo de combate a
   * ~90° por delante del jugador en vez
   * de casi 360°.
   */
  const CAMERA_TURN_LIMIT =
    Math.PI * 0.22;

  /*
   * Fracción vertical de la pantalla que
   * actúa como "línea de mira". Se usa
   * EN LOS TRES SITIOS que deben
   * coincidir: la proyección 3D
   * (dónde se dibuja todo), el disparo
   * (qué se considera "apuntado") y la
   * mira visual (ver antitronks-crosshair
   * en styles.css, colocada al mismo
   * 53%). Si alguno de los tres usa un
   * valor distinto, la mira deja de
   * coincidir con lo que realmente se
   * dispara.
   */
  const HORIZON_Y =
    0.53;

  const MAX_DISTANCE =
    26;

  const PLAYER_HEIGHT =
    1.65;

  /*
   * La calle utiliza X como eje largo.
   * Z representa el ancho de la calle.
   */
  /*
   * IMPORTANTE: todas las cajas tienen
   * "z" POSITIVA (delante del jugador).
   * En este motor, "z" negativa
   * significa "detrás de la cámara", así
   * que mezclar signos -como antes- es
   * lo que obligaba a girar la cámara
   * casi 180° para llegar a algunas
   * cajas. Con "z" siempre positiva, las
   * 7 cajas quedan repartidas en un
   * único arco compacto delante del
   * jugador, tal y como en el dibujo de
   * referencia (calle horizontal con
   * cobertura a lo largo).
   */
  const BOXES = [
    {
      x: -9,
      z: 6.4,
      w: 2.1,
      h: 1.9,
      d: 2.0
    },
    {
      x: -6,
      z: 4.8,
      w: 1.9,
      h: 1.7,
      d: 1.9
    },
    {
      x: -3,
      z: 6.2,
      w: 2.2,
      h: 2.0,
      d: 2.1
    },
    {
      x: 0,
      z: 4.6,
      w: 2.0,
      h: 1.8,
      d: 2.0
    },
    {
      x: 3,
      z: 6.3,
      w: 2.1,
      h: 1.9,
      d: 2.0
    },
    {
      x: 6,
      z: 4.7,
      w: 1.9,
      h: 1.7,
      d: 1.9
    },
    {
      x: 9,
      z: 6.1,
      w: 2.2,
      h: 2.0,
      d: 2.1
    }
  ];

  let width = 1;
  let height = 1;
  let dpr = 1;

  let running = false;
  let animationFrame = 0;
  let lastTime = 0;

  let score = 0;
  let lives = 3;

  let cameraAngle = 0;
  let cameraTargetAngle = 0;

  let spawnTimer = 0;
  let nextSpawn = 800;

  let targets = [];

  let keys = new Set();

  let mouseX = 0.5;

  let flashTimer = 0;
  let messageTimer = 0;

  /* =======================================================
     UTILIDADES
     ======================================================= */

  function clamp(
    value,
    min,
    max
  ) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  function rand(
    min,
    max
  ) {
    return (
      min +
      Math.random() *
        (max - min)
    );
  }

  function normalizeAngle(
    angle
  ) {
    while (
      angle > Math.PI
    ) {
      angle -= TAU;
    }

    while (
      angle < -Math.PI
    ) {
      angle += TAU;
    }

    return angle;
  }

  function getSpawnInterval() {
    return Math.max(
      360,
      1450 -
        score * 42
    );
  }

  function getReactionTime() {
    return Math.max(
      620,
      2700 -
        score * 48
    );
  }

  function getMaxTargets() {
    return Math.min(
      5,
      2 +
        Math.floor(
          score / 5
        )
    );
  }

  /* =======================================================
     RESIZE
     ======================================================= */

  function resize() {
    const rect =
      game.getBoundingClientRect();

    width =
      Math.max(
        1,
        rect.width
      );

    height =
      Math.max(
        1,
        rect.height
      );

    dpr =
      Math.min(
        window.devicePixelRatio ||
          1,
        2
      );

    canvas.width =
      Math.floor(
        width * dpr
      );

    canvas.height =
      Math.floor(
        height * dpr
      );

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );
  }

  /* =======================================================
     HUD
     ======================================================= */

  function updateHud() {
    if (scoreElement) {
      scoreElement.textContent =
        `PUNTOS: ${score}`;
    }

    if (livesElement) {
      livesElement.textContent =
        `VIDAS: ${lives}`;
    }
  }

  function showMessage(
    text,
    duration = 400
  ) {
    if (
      !message ||
      !messageText
    ) {
      return;
    }

    messageText.textContent =
      text;

    message.classList.add(
      "visible"
    );

    messageTimer =
      duration;
  }

  function damageFlash() {
    if (!flash) {
      return;
    }

    flash.classList.add(
      "active"
    );

    flashTimer = 160;
  }

  /* =======================================================
     TARGETS
     ======================================================= */

  function clearTargets() {
    targets = [];

    if (arrowContainer) {
      arrowContainer.innerHTML =
        "";
    }
  }

  function spawnTarget() {
    if (
      !running ||
      targets.length >=
        getMaxTargets()
    ) {
      return;
    }

    const availableBoxes =
      BOXES.filter(
        (box) =>
          !targets.some(
            (target) =>
              target.box === box
          )
      );

    if (
      availableBoxes.length ===
      0
    ) {
      return;
    }

    const box =
      availableBoxes[
        Math.floor(
          Math.random() *
            availableBoxes.length
        )
      ];

    /*
     * 82% enemigos
     * 18% civiles
     */
    const type =
      Math.random() < 0.82
        ? "enemy"
        : "civilian";

    const target = {
      id:
        `${Date.now()}-${Math.random()}`,

      box,

      x:
        box.x +
        rand(
          -box.w * 0.22,
          box.w * 0.22
        ),

      z:
        box.z +
        (
          box.z < 0
            ? box.d * 0.58
            : -box.d * 0.58
        ),

      type,

      born:
        performance.now(),

      reaction:
        type === "enemy"
          ? getReactionTime() +
            rand(
              -170,
              180
            )
          : rand(
              2400,
              3900
            ),

      scale:
        rand(
          0.94,
          1.08
        ),

      animation:
        Math.random() *
        TAU
    };

    targets.push(
      target
    );
  }

  /* =======================================================
     PROYECCIÓN 3D
     ======================================================= */

  function projectPoint(
    worldX,
    worldZ,
    worldY = 0
  ) {
    /*
     * La cámara está en el origen.
     *
     * X = dirección de la calle.
     * Z = anchura de la calle.
     */

    const dx =
      worldX;

    const dz =
      worldZ;

    const cos =
      Math.cos(
        cameraAngle
      );

    const sin =
      Math.sin(
        cameraAngle
      );

    const side =
      dx * cos -
      dz * sin;

    const depth =
      dx * sin +
      dz * cos;

    if (
      depth <= 0.25
    ) {
      return {
        visible: false,
        behind: true,
        depth,
        x: width / 2,
        y: height / 2,
        scale: 0
      };
    }

    const focal =
      width /
      (
        2 *
        Math.tan(
          FOV / 2
        )
      );

    const screenX =
      width / 2 +
      (
        side /
        depth
      ) *
        focal;

    const screenY =
      height * HORIZON_Y -
      (
        (
          worldY -
          PLAYER_HEIGHT *
            0.45
        ) /
        depth
      ) *
        focal;

    return {
      visible:
        screenX >
          -width * 0.15 &&
        screenX <
          width * 1.15 &&
        depth <
          MAX_DISTANCE,

      behind: false,

      depth,

      x: screenX,

      y: screenY,

      scale:
        focal /
        depth
    };
  }

  /* =======================================================
     CIELO Y CALLE
     ======================================================= */

  function drawEnvironment() {
    const horizon =
      height * 0.47;

    /*
     * Cielo
     */

    const sky =
      ctx.createLinearGradient(
        0,
        0,
        0,
        horizon
      );

    sky.addColorStop(
      0,
      "#53687d"
    );

    sky.addColorStop(
      1,
      "#c4bba9"
    );

    ctx.fillStyle =
      sky;

    ctx.fillRect(
      0,
      0,
      width,
      horizon
    );

    /*
     * Suelo
     */

    const ground =
      ctx.createLinearGradient(
        0,
        horizon,
        0,
        height
      );

    ground.addColorStop(
      0,
      "#555555"
    );

    ground.addColorStop(
      1,
      "#1d1d1d"
    );

    ctx.fillStyle =
      ground;

    ctx.fillRect(
      0,
      horizon,
      width,
      height -
        horizon
    );

    /*
     * CALLE HORIZONTAL
     */

    const roadLeftFar =
      projectPoint(
        -70,
        -8.5,
        0
      );

    const roadRightFar =
      projectPoint(
        70,
        -8.5,
        0
      );

    const roadRightNear =
      projectPoint(
        70,
        8.5,
        0
      );

    const roadLeftNear =
      projectPoint(
        -70,
        8.5,
        0
      );

    ctx.beginPath();

    ctx.moveTo(
      roadLeftFar.x,
      roadLeftFar.y
    );

    ctx.lineTo(
      roadRightFar.x,
      roadRightFar.y
    );

    ctx.lineTo(
      roadRightNear.x,
      roadRightNear.y
    );

    ctx.lineTo(
      roadLeftNear.x,
      roadLeftNear.y
    );

    ctx.closePath();

    ctx.fillStyle =
      "#494949";

    ctx.fill();

    /*
     * Aceras.
     */

    for (
      const side of [-1, 1]
    ) {
      const zOuter =
        side * 15;

      const zInner =
        side * 8.5;

      const a =
        projectPoint(
          -70,
          zOuter,
          0
        );

      const b =
        projectPoint(
          70,
          zOuter,
          0
        );

      const c =
        projectPoint(
          70,
          zInner,
          0
        );

      const d =
        projectPoint(
          -70,
          zInner,
          0
        );

      ctx.beginPath();

      ctx.moveTo(
        a.x,
        a.y
      );

      ctx.lineTo(
        b.x,
        b.y
      );

      ctx.lineTo(
        c.x,
        c.y
      );

      ctx.lineTo(
        d.x,
        d.y
      );

      ctx.closePath();

      ctx.fillStyle =
        "#3b3b3b";

      ctx.fill();
    }

    /*
     * Línea central.
     */

    for (
      let x = -70;
      x < 70;
      x += 9
    ) {
      const a =
        projectPoint(
          x,
          0,
          0.04
        );

      const b =
        projectPoint(
          x + 4.5,
          0,
          0.04
        );

      if (
        a.depth <= 0 ||
        b.depth <= 0
      ) {
        continue;
      }

      ctx.strokeStyle =
        "rgba(240,240,240,.78)";

      ctx.lineWidth =
        3;

      ctx.beginPath();

      ctx.moveTo(
        a.x,
        a.y
      );

      ctx.lineTo(
        b.x,
        b.y
      );

      ctx.stroke();
    }

    /*
     * Edificios al fondo.
     */

    for (
      const side of [-1, 1]
    ) {
      const baseZ =
        side * 16;

      for (
        let x = -70;
        x < 70;
        x += 18
      ) {
        const heightBuilding =
          5 +
          (
            Math.abs(x) %
            12
          ) *
            0.12;

        const p1 =
          projectPoint(
            x,
            baseZ,
            0
          );

        const p2 =
          projectPoint(
            x + 14,
            baseZ,
            0
          );

        const p3 =
          projectPoint(
            x + 14,
            baseZ,
            heightBuilding
          );

        const p4 =
          projectPoint(
            x,
            baseZ,
            heightBuilding
          );

        if (
          p1.depth <= 0 &&
          p2.depth <= 0
        ) {
          continue;
        }

        ctx.beginPath();

        ctx.moveTo(
          p1.x,
          p1.y
        );

        ctx.lineTo(
          p2.x,
          p2.y
        );

        ctx.lineTo(
          p3.x,
          p3.y
        );

        ctx.lineTo(
          p4.x,
          p4.y
        );

        ctx.closePath();

        ctx.fillStyle =
          side < 0
            ? "#484a4d"
            : "#55575a";

        ctx.fill();

        ctx.strokeStyle =
          "rgba(0,0,0,.3)";

        ctx.stroke();
      }
    }
  }

  /* =======================================================
     CAJAS 3D
     ======================================================= */

  function drawBox(
    box
  ) {
    const projection =
      projectPoint(
        box.x,
        box.z,
        box.h * 0.5
      );

    if (
      !projection.visible
    ) {
      return;
    }

    const focal =
      width /
      (
        2 *
        Math.tan(
          FOV / 2
        )
      );

    const scale =
      focal /
      projection.depth;

    const boxWidth =
      box.w *
      scale;

    const boxHeight =
      box.h *
      scale;

    const x =
      projection.x;

    const y =
      projection.y;

    if (
      x <
        -boxWidth * 2 ||
      x >
        width +
          boxWidth * 2
    ) {
      return;
    }

    ctx.save();

    ctx.translate(
      x,
      y
    );

    /*
     * Sombra
     */

    ctx.fillStyle =
      "rgba(0,0,0,.38)";

    ctx.beginPath();

    ctx.ellipse(
      0,
      boxHeight *
        0.55,
      boxWidth *
        0.7,
      Math.max(
        2,
        boxHeight *
          0.11
      ),
      0,
      0,
      TAU
    );

    ctx.fill();

    /*
     * Cara derecha
     */

    ctx.beginPath();

    ctx.moveTo(
      boxWidth *
        0.5,
      -boxHeight *
        0.5
    );

    ctx.lineTo(
      boxWidth *
        0.78,
      -boxHeight *
        0.38
    );

    ctx.lineTo(
      boxWidth *
        0.78,
      boxHeight *
        0.48
    );

    ctx.lineTo(
      boxWidth *
        0.5,
      boxHeight *
        0.5
    );

    ctx.closePath();

    ctx.fillStyle =
      "#715033";

    ctx.fill();

    /*
     * Parte superior
     */

    ctx.beginPath();

    ctx.moveTo(
      -boxWidth *
        0.5,
      -boxHeight *
        0.5
    );

    ctx.lineTo(
      -boxWidth *
        0.2,
      -boxHeight *
        0.64
    );

    ctx.lineTo(
      boxWidth *
        0.78,
      -boxHeight *
        0.38
    );

    ctx.lineTo(
      boxWidth *
        0.5,
      -boxHeight *
        0.5
    );

    ctx.closePath();

    ctx.fillStyle =
      "#9a7048";

    ctx.fill();

    /*
     * Cara frontal
     */

    ctx.beginPath();

    ctx.rect(
      -boxWidth *
        0.5,
      -boxHeight *
        0.5,
      boxWidth,
      boxHeight
    );

    ctx.fillStyle =
      "#8a633f";

    ctx.fill();

    ctx.strokeStyle =
      "#2b1b10";

    ctx.lineWidth =
      Math.max(
        1,
        scale *
          0.035
      );

    ctx.stroke();

    /*
     * Tablones
     */

    ctx.strokeStyle =
      "rgba(50,28,15,.5)";

    ctx.lineWidth =
      Math.max(
        1,
        scale *
          0.025
      );

    for (
      let i = 1;
      i < 5;
      i++
    ) {
      const yy =
        -boxHeight *
          0.5 +
        boxHeight *
          i /
          5;

      ctx.beginPath();

      ctx.moveTo(
        -boxWidth *
          0.47,
        yy
      );

      ctx.lineTo(
        boxWidth *
          0.47,
        yy
      );

      ctx.stroke();
    }

    /*
     * Separación vertical
     */

    ctx.beginPath();

    ctx.moveTo(
      0,
      -boxHeight *
        0.48
    );

    ctx.lineTo(
      0,
      boxHeight *
        0.48
    );

    ctx.stroke();

    /*
     * Bandas metálicas
     */

    ctx.strokeStyle =
      "rgba(25,25,25,.8)";

    ctx.lineWidth =
      Math.max(
        1.5,
        scale *
          0.045
      );

    ctx.strokeRect(
      -boxWidth *
        0.46,
      -boxHeight *
        0.46,
      boxWidth *
        0.92,
      boxHeight *
        0.92
    );

    ctx.restore();
  }

  /* =======================================================
     ENEMIGO / CIVIL
     ======================================================= */

  function drawPerson(
    target,
    projection
  ) {
    if (
      !projection.visible
    ) {
      return;
    }

    const focal =
      width /
      (
        2 *
        Math.tan(
          FOV / 2
        )
      );

    const scale =
      focal /
      projection.depth *
      target.scale;

    const personHeight =
      clamp(
        4.9 * scale,
        16,
        height *
          0.9
      );

    const personWidth =
      personHeight *
      0.34;

    const x =
      projection.x;

    const y =
      projection.y +
      personHeight *
        0.42;

    if (
      x <
        -personWidth * 2 ||
      x >
        width +
          personWidth * 2
    ) {
      return;
    }

    ctx.save();

    ctx.translate(
      x,
      y
    );

    /*
     * Sombra
     */

    ctx.fillStyle =
      "rgba(0,0,0,.42)";

    ctx.beginPath();

    ctx.ellipse(
      0,
      personHeight *
        0.53,
      personWidth *
        0.7,
      personHeight *
        0.12,
      0,
      0,
      TAU
    );

    ctx.fill();

    const headRadius =
      personHeight *
      0.105;

    const headY =
      -personHeight *
      0.36;

    const bodyTop =
      -personHeight *
      0.23;

    const bodyBottom =
      personHeight *
      0.2;

    /*
     * Piernas
     */

    ctx.strokeStyle =
      target.type ===
      "enemy"
        ? "#17191b"
        : "#444";

    ctx.lineWidth =
      Math.max(
        2,
        personWidth *
          0.23
      );

    ctx.lineCap =
      "round";

    ctx.beginPath();

    ctx.moveTo(
      -personWidth *
        0.14,
      bodyBottom
    );

    ctx.lineTo(
      -personWidth *
        0.28,
      personHeight *
        0.48
    );

    ctx.moveTo(
      personWidth *
        0.14,
      bodyBottom
    );

    ctx.lineTo(
      personWidth *
        0.28,
      personHeight *
        0.48
    );

    ctx.stroke();

    /*
     * Botas
     */

    ctx.strokeStyle =
      "#101010";

    ctx.lineWidth =
      Math.max(
        2,
        personWidth *
          0.26
      );

    ctx.beginPath();

    ctx.moveTo(
      -personWidth *
        0.28,
      personHeight *
        0.48
    );

    ctx.lineTo(
      -personWidth *
        0.4,
      personHeight *
        0.5
    );

    ctx.moveTo(
      personWidth *
        0.28,
      personHeight *
        0.48
    );

    ctx.lineTo(
      personWidth *
        0.4,
      personHeight *
        0.5
    );

    ctx.stroke();

    /*
     * Torso
     */

    ctx.fillStyle =
      target.type ===
      "enemy"
        ? "#252a2e"
        : "#6b6b6b";

    ctx.strokeStyle =
      "#101214";

    ctx.lineWidth =
      Math.max(
        1,
        personWidth *
          0.055
      );

    ctx.beginPath();

    ctx.roundRect(
      -personWidth *
        0.43,
      bodyTop,
      personWidth *
        0.86,
      bodyBottom -
        bodyTop,
      personWidth *
        0.13
    );

    ctx.fill();

    ctx.stroke();

    /*
     * Chaleco táctico
     */

    if (
      target.type ===
      "enemy"
    ) {
      ctx.fillStyle =
        "#394147";

      ctx.fillRect(
        -personWidth *
          0.31,
        bodyTop +
          personHeight *
            0.035,
        personWidth *
          0.62,
        personHeight *
          0.18
      );

      ctx.strokeStyle =
        "#16191b";

      ctx.lineWidth =
        Math.max(
          1,
          personWidth *
            0.035
        );

      ctx.strokeRect(
        -personWidth *
          0.31,
        bodyTop +
          personHeight *
            0.035,
        personWidth *
          0.62,
        personHeight *
          0.18
      );

      /*
       * Bolsillos
       */

      ctx.fillStyle =
        "#17191b";

      ctx.fillRect(
        -personWidth *
          0.25,
        bodyTop +
          personHeight *
            0.065,
        personWidth *
          0.14,
        personHeight *
          0.08
      );

      ctx.fillRect(
        personWidth *
          0.11,
        bodyTop +
          personHeight *
            0.065,
        personWidth *
          0.14,
        personHeight *
          0.08
      );
    }

    /*
     * Brazos
     */

    ctx.strokeStyle =
      target.type ===
      "enemy"
        ? "#30363a"
        : "#686868";

    ctx.lineWidth =
      Math.max(
        2,
        personWidth *
          0.18
      );

    ctx.beginPath();

    ctx.moveTo(
      -personWidth *
        0.34,
      bodyTop +
        personHeight *
          0.04
    );

    ctx.lineTo(
      -personWidth *
        0.62,
      bodyTop +
        personHeight *
          0.23
    );

    ctx.moveTo(
      personWidth *
        0.34,
      bodyTop +
        personHeight *
          0.04
    );

    ctx.lineTo(
      personWidth *
        0.6,
      bodyTop +
        personHeight *
          0.18
    );

    ctx.stroke();

    /*
     * Manos
     */

    ctx.fillStyle =
      "#a77b5e";

    ctx.beginPath();

    ctx.arc(
      -personWidth *
        0.62,
      bodyTop +
        personHeight *
          0.23,
      Math.max(
        2,
        personWidth *
          0.08
      ),
      0,
      TAU
    );

    ctx.arc(
      personWidth *
        0.6,
      bodyTop +
        personHeight *
          0.18,
      Math.max(
        2,
        personWidth *
          0.08
      ),
      0,
      TAU
    );

    ctx.fill();

    /*
     * Arma enemiga
     */

    if (
      target.type ===
      "enemy"
    ) {
      drawM4(
        personWidth,
        personHeight
      );
    }

    /*
     * Cuello
     */

    ctx.fillStyle =
      "#9d7358";

    ctx.fillRect(
      -personWidth *
        0.11,
      headY +
        headRadius *
          0.65,
      personWidth *
        0.22,
      personHeight *
        0.09
    );

    /*
     * Cabeza
     */

    ctx.fillStyle =
      "#a77a5e";

    ctx.beginPath();

    ctx.arc(
      0,
      headY,
      headRadius,
      0,
      TAU
    );

    ctx.fill();

    ctx.strokeStyle =
      "#111";

    ctx.lineWidth =
      Math.max(
        1,
        headRadius *
          0.12
      );

    ctx.stroke();

    /*
     * Casco + máscara
     */

    if (
      target.type ===
      "enemy"
    ) {
      ctx.fillStyle =
        "#252b2f";

      ctx.beginPath();

      ctx.arc(
        0,
        headY -
          headRadius *
            0.1,
        headRadius *
          1.08,
        Math.PI,
        TAU
      );

      ctx.lineTo(
        headRadius *
          0.95,
        headY
      );

      ctx.lineTo(
        -headRadius *
          0.95,
        headY
      );

      ctx.closePath();

      ctx.fill();

      ctx.fillStyle =
        "#202426";

      ctx.fillRect(
        -headRadius *
          0.86,
        headY -
          headRadius *
            0.02,
        headRadius *
          1.72,
        headRadius *
          0.55
      );

      /*
       * Visor
       */

      ctx.fillStyle =
        "#8c959a";

      ctx.fillRect(
        -headRadius *
          0.56,
        headY +
          headRadius *
            0.05,
        headRadius *
          1.12,
        Math.max(
          1,
          headRadius *
            0.13
        )
      );
    }

    ctx.restore();
  }

  /* =======================================================
     M4 DETALLADA
     ======================================================= */

  function drawM4(
    w,
    h
  ) {
    const length =
      w * 1.15;

    const y =
      -h * 0.02;

    ctx.save();

    ctx.translate(
      w * 0.15,
      y
    );

    ctx.rotate(
      -0.18
    );

    /*
     * Cañón
     */

    ctx.strokeStyle =
      "#151718";

    ctx.lineWidth =
      Math.max(
        2,
        w * 0.075
      );

    ctx.beginPath();

    ctx.moveTo(
      length * 0.1,
      0
    );

    ctx.lineTo(
      length * 0.72,
      0
    );

    ctx.stroke();

    /*
     * Flash hider
     */

    ctx.lineWidth =
      Math.max(
        1,
        w * 0.1
      );

    ctx.beginPath();

    ctx.moveTo(
      length * 0.69,
      0
    );

    ctx.lineTo(
      length * 0.82,
      0
    );

    ctx.stroke();

    /*
     * Receiver
     */

    ctx.fillStyle =
      "#1b1e20";

    ctx.strokeStyle =
      "#080909";

    ctx.lineWidth =
      Math.max(
        1,
        w * 0.035
      );

    ctx.beginPath();

    ctx.roundRect(
      -length *
        0.12,
      -w * 0.1,
      length *
        0.42,
      w * 0.2,
      w * 0.04
    );

    ctx.fill();

    ctx.stroke();

    /*
     * Cargador
     */

    ctx.fillStyle =
      "#24282a";

    ctx.beginPath();

    ctx.moveTo(
      length * 0.04,
      w * 0.1
    );

    ctx.lineTo(
      length * 0.17,
      w * 0.1
    );

    ctx.lineTo(
      length * 0.22,
      w * 0.38
    );

    ctx.lineTo(
      length * 0.09,
      w * 0.4
    );

    ctx.closePath();

    ctx.fill();

    /*
     * Empuñadura
     */

    ctx.fillStyle =
      "#121415";

    ctx.beginPath();

    ctx.moveTo(
      -length *
        0.02,
      w * 0.08
    );

    ctx.lineTo(
      length * 0.1,
      w * 0.08
    );

    ctx.lineTo(
      length * 0.03,
      w * 0.34
    );

    ctx.lineTo(
      -length *
        0.08,
      w * 0.3
    );

    ctx.closePath();

    ctx.fill();

    /*
     * Culata
     */

    ctx.strokeStyle =
      "#17191a";

    ctx.lineWidth =
      Math.max(
        2,
        w * 0.12
      );

    ctx.beginPath();

    ctx.moveTo(
      -length *
        0.13,
      0
    );

    ctx.lineTo(
      -length *
        0.42,
      -w * 0.05
    );

    ctx.lineTo(
      -length *
        0.55,
      -w * 0.17
    );

    ctx.stroke();

    /*
     * Mira
     */

    ctx.lineWidth =
      Math.max(
        1,
        w * 0.055
      );

    ctx.beginPath();

    ctx.moveTo(
      length * 0.02,
      -w * 0.1
    );

    ctx.lineTo(
      length * 0.07,
      -w * 0.24
    );

    ctx.lineTo(
      length * 0.16,
      -w * 0.24
    );

    ctx.stroke();

    ctx.restore();
  }

  /* =======================================================
     PROYECCIÓN DE TARGET
     ======================================================= */

  function getTargetProjection(
    target
  ) {
    return projectPoint(
      target.x,
      target.z,
      1.55 *
        target.scale
    );
  }

  /* =======================================================
     TARGETS EN PANTALLA
     ======================================================= */

  function drawTargets() {
    const sorted =
      [...targets].sort(
        (a, b) => {
          const pa =
            getTargetProjection(
              a
            );

          const pb =
            getTargetProjection(
              b
            );

          return (
            pb.depth -
            pa.depth
          );
        }
      );

    sorted.forEach(
      (target) => {
        const projection =
          getTargetProjection(
            target
          );

        if (
          projection.visible
        ) {
          drawPerson(
            target,
            projection
          );
        }
      }
    );
  }

  /* =======================================================
     FLECHAS DE ENEMIGOS FUERA DE PANTALLA
     ======================================================= */

  function updateOffscreenArrows() {
    if (
      !arrowContainer
    ) {
      return;
    }

    arrowContainer.innerHTML =
      "";

    targets.forEach(
      (target) => {
        const projection =
          getTargetProjection(
            target
          );

        const relative =
          normalizeAngle(
            Math.atan2(
              target.x,
              target.z
            ) -
              cameraAngle
          );

        const offscreen =
          projection.depth <=
            0 ||
          Math.abs(
            relative
          ) >
            FOV * 0.49 ||
          projection.x < 0 ||
          projection.x > width;

        if (!offscreen) {
          return;
        }

        const arrow =
          document.createElement(
            "div"
          );

        arrow.className =
          "antitronks-offscreen-arrow";

        const right =
          relative > 0;

        arrow.style.left =
          right
            ? `${width - 30}px`
            : "30px";

        arrow.style.top =
          `${height / 2}px`;

        arrow.style.transform =
          `translate(-50%, -50%) rotate(${
            right
              ? 90
              : -90
          }deg)`;

        arrowContainer.appendChild(
          arrow
        );
      }
    );
  }

  /* =======================================================
     ARMA DEL JUGADOR
     ======================================================= */

  function drawPlayerWeapon() {
    const scale =
      clamp(
        width / 1100,
        0.7,
        1.2
      );

    /*
     * El arma se ancla siempre al centro
     * horizontal de la pantalla y apunta
     * hacia arriba, en línea recta hacia
     * la mira (HORIZON_Y). Antes el
     * cañón se dibujaba en diagonal hacia
     * la derecha, como si el jugador
     * sujetara el arma de lado; ahora
     * queda simétrica y orientada hacia
     * delante, coherente con hacia dónde
     * apunta realmente el disparo.
     */

    const baseY =
      height * 0.97;

    ctx.save();

    ctx.translate(
      width * 0.5,
      baseY
    );

    /*
     * Antebrazos de apoyo
     */

    ctx.strokeStyle =
      "#111315";

    ctx.lineWidth =
      15 * scale;

    ctx.lineCap =
      "round";

    ctx.beginPath();

    ctx.moveTo(
      -32 * scale,
      6 * scale
    );

    ctx.lineTo(
      -10 * scale,
      -44 * scale
    );

    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
      30 * scale,
      10 * scale
    );

    ctx.lineTo(
      11 * scale,
      -72 * scale
    );

    ctx.stroke();

    /*
     * Culata
     */

    ctx.fillStyle =
      "#1c2022";

    ctx.fillRect(
      -13 * scale,
      -10 * scale,
      26 * scale,
      40 * scale
    );

    /*
     * Cuerpo del arma (vertical y
     * centrado, apuntando hacia la mira)
     */

    ctx.fillStyle =
      "#272b2e";

    ctx.fillRect(
      -15 * scale,
      -128 * scale,
      30 * scale,
      90 * scale
    );

    ctx.strokeStyle =
      "#0d0f10";

    ctx.lineWidth =
      Math.max(
        1,
        2 * scale
      );

    ctx.strokeRect(
      -15 * scale,
      -128 * scale,
      30 * scale,
      90 * scale
    );

    /*
     * Cargador
     */

    ctx.fillStyle =
      "#1c2022";

    ctx.beginPath();

    ctx.moveTo(
      -3 * scale,
      -44 * scale
    );

    ctx.lineTo(
      11 * scale,
      -44 * scale
    );

    ctx.lineTo(
      17 * scale,
      6 * scale
    );

    ctx.lineTo(
      3 * scale,
      8 * scale
    );

    ctx.closePath();

    ctx.fill();

    /*
     * Cañón
     */

    ctx.fillStyle =
      "#151719";

    ctx.fillRect(
      -6 * scale,
      -170 * scale,
      12 * scale,
      44 * scale
    );

    /*
     * Mira del arma, alineada con la
     * mira central de la pantalla
     */

    ctx.strokeStyle =
      "#0d0f10";

    ctx.lineWidth =
      4 * scale;

    ctx.beginPath();

    ctx.moveTo(
      0,
      -128 * scale
    );

    ctx.lineTo(
      0,
      -150 * scale
    );

    ctx.stroke();

    /*
     * Manos
     */

    ctx.fillStyle =
      "#a9795e";

    ctx.beginPath();

    ctx.arc(
      -10 * scale,
      -44 * scale,
      19 * scale,
      0,
      TAU
    );

    ctx.arc(
      11 * scale,
      -72 * scale,
      16 * scale,
      0,
      TAU
    );

    ctx.fill();

    ctx.restore();
  }

  /* =======================================================
     DISPARAR
     ======================================================= */

  function shoot() {
    if (!running) {
      return;
    }

    let selected =
      null;

    let selectedDistance =
      Infinity;

    const centerX =
      width / 2;

    const centerY =
      height * HORIZON_Y;

    for (
      const target of targets
    ) {
      const projection =
        getTargetProjection(
          target
        );

      if (
        !projection.visible
      ) {
        continue;
      }

      const dx =
        projection.x -
        centerX;

      const dy =
        projection.y -
        centerY;

      const distance =
        Math.hypot(
          dx,
          dy
        );

      const radius =
        clamp(
          55 *
            (
              projection.scale ||
              1
            ),
          24,
          85
        );

      if (
        distance <=
          radius &&
        distance <
          selectedDistance
      ) {
        selected =
          target;

        selectedDistance =
          distance;
      }
    }

    if (!selected) {
      showMessage(
        "FALLO",
        250
      );

      return;
    }

    const index =
      targets.indexOf(
        selected
      );

    if (
      index !== -1
    ) {
      targets.splice(
        index,
        1
      );
    }

    if (
      selected.type ===
      "enemy"
    ) {
      score += 1;

      updateHud();

      showMessage(
        "ENEMIGO ELIMINADO",
        350
      );
    } else {
      damagePlayer(
        "¡HAS DISPARADO A UN CIVIL!"
      );
    }
  }

  /* =======================================================
     DAÑO
     ======================================================= */

  function damagePlayer(
    reason
  ) {
    lives -= 1;

    updateHud();

    damageFlash();

    showMessage(
      reason,
      600
    );

    if (
      lives <= 0
    ) {
      gameOver();
    }
  }

  /* =======================================================
     GAME OVER
     ======================================================= */

  function gameOver() {
    running =
      false;

    cancelAnimationFrame(
      animationFrame
    );

    clearTargets();

    if (overlay) {
      overlay.classList.remove(
        "hidden"
      );
    }

    if (overlayTitle) {
      overlayTitle.textContent =
        "GAME OVER";
    }

    if (overlayText) {
      overlayText.textContent =
        `Has conseguido ${score} punto${
          score === 1
            ? ""
            : "s"
        }.`;
    }

    if (startButton) {
      startButton.textContent =
        "REINTENTAR";
    }

    draw();
  }

  /* =======================================================
     REINICIAR
     ======================================================= */

  function resetGame() {
    running =
      false;

    cancelAnimationFrame(
      animationFrame
    );

    score = 0;

    lives = 3;

    cameraAngle = 0;

    cameraTargetAngle = 0;

    spawnTimer = 0;

    nextSpawn = 700;

    lastTime = 0;

    mouseX = 0.5;

    clearTargets();

    updateHud();

    if (overlay) {
      overlay.classList.remove(
        "hidden"
      );
    }

    if (overlayTitle) {
      overlayTitle.textContent =
        "ANTITRONKS";
    }

    if (overlayText) {
      overlayText.textContent =
        "Gira la cámara, localiza a los enemigos y dispara antes de que ellos disparen.";
    }

    if (startButton) {
      startButton.textContent =
        "JUGAR";
    }

    if (message) {
      message.classList.remove(
        "visible"
      );
    }

    resize();

    draw();
  }

  /* =======================================================
     INICIAR
     ======================================================= */

  function startGame() {
    score = 0;

    lives = 3;

    cameraAngle = 0;

    cameraTargetAngle = 0;

    spawnTimer = 0;

    nextSpawn = 600;

    clearTargets();

    updateHud();

    running =
      true;

    if (overlay) {
      overlay.classList.add(
        "hidden"
      );
    }

    lastTime =
      performance.now();

    cancelAnimationFrame(
      animationFrame
    );

    animationFrame =
      requestAnimationFrame(
        loop
      );
  }

  /* =======================================================
     ABRIR JUEGO
     ======================================================= */

  function openGame() {
    modal.classList.remove(
      "hidden"
    );

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "antitronks-open"
    );

    resize();

    resetGame();
  }

  /* =======================================================
     CERRAR JUEGO
     ======================================================= */

  function closeGame() {
    running =
      false;

    cancelAnimationFrame(
      animationFrame
    );

    clearTargets();

    modal.classList.add(
      "hidden"
    );

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "antitronks-open"
    );

    keys.clear();
  }

  /* =======================================================
     ACTUALIZACIÓN DEL JUEGO
     ======================================================= */

  function update(
    delta,
    now
  ) {
    /*
     * A / D y flechas
     */

    if (
      keys.has("a") ||
      keys.has("arrowleft")
    ) {
      cameraTargetAngle -=
        delta *
        0.00155;
    }

    if (
      keys.has("d") ||
      keys.has("arrowright")
    ) {
      cameraTargetAngle +=
        delta *
        0.00155;
    }

    /*
     * Ratón:
     * mueve la cámara según la posición
     * horizontal del ratón.
     */

    const mouseOffset =
      (mouseX - 0.5) *
      2;

    cameraTargetAngle +=
      mouseOffset *
      delta *
      0.00042;

    cameraTargetAngle =
      clamp(
        cameraTargetAngle,
        -CAMERA_TURN_LIMIT,
        CAMERA_TURN_LIMIT
      );

    cameraAngle +=
      (
        cameraTargetAngle -
        cameraAngle
      ) *
      Math.min(
        1,
        delta *
          0.012
      );

    /*
     * Aparición de enemigos.
     */

    spawnTimer +=
      delta;

    if (
      spawnTimer >=
        nextSpawn &&
      targets.length <
        getMaxTargets()
    ) {
      spawnTarget();

      spawnTimer = 0;

      nextSpawn =
        getSpawnInterval() *
        rand(
          0.72,
          1.15
        );
    }

    /*
     * Enemigos y civiles.
     */

    for (
      let i =
        targets.length -
        1;
      i >= 0;
      i--
    ) {
      const target =
        targets[i];

      target.animation +=
        delta *
        0.003;

      const age =
        now -
        target.born;

      if (
        age >=
        target.reaction
      ) {
        if (
          target.type ===
          "enemy"
        ) {
          targets.splice(
            i,
            1
          );

          damagePlayer(
            "¡TE HAN DISPARADO!"
          );

          if (!running) {
            break;
          }
        } else {
          /*
           * Los civiles simplemente
           * desaparecen si no les disparas.
           */

          targets.splice(
            i,
            1
          );
        }
      }
    }

    /*
     * Flash de daño.
     */

    if (
      flashTimer > 0
    ) {
      flashTimer -=
        delta;

      if (
        flashTimer <=
        0
      ) {
        flash?.classList.remove(
          "active"
        );
      }
    }

    /*
     * Mensajes.
     */

    if (
      messageTimer > 0
    ) {
      messageTimer -=
        delta;

      if (
        messageTimer <=
        0
      ) {
        message?.classList.remove(
          "visible"
        );
      }
    }

    updateOffscreenArrows();
  }

  /* =======================================================
     DIBUJAR TODO
     ======================================================= */

  function draw() {
    if (
      width <= 0 ||
      height <= 0
    ) {
      return;
    }

    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    drawEnvironment();

    /*
     * Cajas.
     */

    const sortedBoxes =
      [...BOXES].sort(
        (a, b) => {
          const pa =
            projectPoint(
              a.x,
              a.z,
              a.h / 2
            );

          const pb =
            projectPoint(
              b.x,
              b.z,
              b.h / 2
            );

          return (
            pb.depth -
            pa.depth
          );
        }
      );

    sortedBoxes.forEach(
      drawBox
    );

    /*
     * Personas.
     */

    drawTargets();

    /*
     * Arma del jugador.
     */

    drawPlayerWeapon();
  }

  /* =======================================================
     BUCLE
     ======================================================= */

  function loop(
    now
  ) {
    if (!running) {
      draw();
      return;
    }

    const delta =
      Math.min(
        40,
        now -
          lastTime ||
          16
      );

    lastTime =
      now;

    update(
      delta,
      now
    );

    draw();

    animationFrame =
      requestAnimationFrame(
        loop
      );
  }

  /* =======================================================
     CONTROLES - TARJETA
     ======================================================= */

  card.addEventListener(
    "click",
    openGame
  );

  card.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key ===
          "Enter" ||
        event.key ===
          " "
      ) {
        event.preventDefault();

        openGame();
      }
    }
  );

  /* =======================================================
     CONTROLES - CERRAR
     ======================================================= */

  closeButton?.addEventListener(
    "click",
    closeGame
  );

  backdrop?.addEventListener(
    "click",
    closeGame
  );

  /* =======================================================
     BOTÓN JUGAR
     ======================================================= */

  startButton?.addEventListener(
    "click",
    startGame
  );

  /* =======================================================
     RATÓN - CÁMARA
     ======================================================= */

  game.addEventListener(
    "mousemove",
    (event) => {
      const rect =
        game.getBoundingClientRect();

      mouseX =
        clamp(
          (
            event.clientX -
            rect.left
          ) /
            rect.width,
          0,
          1
        );
    }
  );

  game.addEventListener(
    "mouseleave",
    () => {
      mouseX = 0.5;
    }
  );

  /* =======================================================
     RATÓN - DISPARO
     ======================================================= */

  game.addEventListener(
    "mousedown",
    (event) => {
      if (
        event.button ===
          0 &&
        running
      ) {
        shoot();
      }
    }
  );

  /* =======================================================
     TOUCH
     ======================================================= */

  game.addEventListener(
    "touchstart",
    (event) => {
      if (!running) {
        return;
      }

      const touch =
        event.changedTouches[0];

      if (!touch) {
        return;
      }

      const rect =
        game.getBoundingClientRect();

      mouseX =
        clamp(
          (
            touch.clientX -
            rect.left
          ) /
            rect.width,
          0,
          1
        );

      shoot();
    },
    {
      passive: true
    }
  );

  game.addEventListener(
    "touchmove",
    (event) => {
      const touch =
        event.changedTouches[0];

      if (!touch) {
        return;
      }

      const rect =
        game.getBoundingClientRect();

      mouseX =
        clamp(
          (
            touch.clientX -
            rect.left
          ) /
            rect.width,
          0,
          1
        );
    },
    {
      passive: true
    }
  );

  /* =======================================================
     TECLADO
     ======================================================= */

  window.addEventListener(
    "keydown",
    (event) => {
      if (
        modal.classList.contains(
          "hidden"
        )
      ) {
        return;
      }

      const key =
        event.key.toLowerCase();

      if (
        key === "a" ||
        key === "d" ||
        key ===
          "arrowleft" ||
        key ===
          "arrowright"
      ) {
        keys.add(key);

        event.preventDefault();
      }

      if (
        key ===
        "escape"
      ) {
        closeGame();
      }

      if (
        event.code ===
          "Space" &&
        running
      ) {
        event.preventDefault();

        shoot();
      }
    }
  );

  window.addEventListener(
    "keyup",
    (event) => {
      keys.delete(
        event.key.toLowerCase()
      );
    }
  );

  /* =======================================================
     RESIZE
     ======================================================= */

  window.addEventListener(
    "resize",
    resize
  );

  /* =======================================================
     INICIO DEL JUEGO
     ======================================================= */

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
