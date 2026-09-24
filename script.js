"use strict";

/* =========================================================
   TRONKSTUDIOS
   SCRIPT PRINCIPAL
   ========================================================= */

console.log("TronkStudios: script cargando...");

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
   MODAL DE CUENTA
   ========================================================= */

const accountModal =
  document.getElementById("account-modal");

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

const suggestionModal =
  document.getElementById("suggestion-modal");

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
    // Nada que hacer.
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
  document.documentElement.setAttribute(
    "data-theme",
    theme === "dark"
      ? "dark"
      : "light"
  );

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

  const accountOpen =
    accountModal &&
    !accountModal.classList.contains(
      "hidden"
    );

  const suggestionOpen =
    suggestionModal &&
    !suggestionModal.classList.contains(
      "hidden"
    );

  const antitronksOpen =
    antitronksModal &&
    !antitronksModal.classList.contains(
      "hidden"
    );

  if (
    !accountOpen &&
    !suggestionOpen &&
    !antitronksOpen
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
    suggestionMessage.classList.add(type);
  }
}

/* =========================================================
   INTERFAZ DE CUENTA
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

  showLoggedPanel();

  const metadata =
    currentUser.user_metadata ||
    {};

  const name =
    metadata.name ||
    metadata.full_name ||
    currentUser.email
      ?.split("@")[0] ||
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
          "La cuenta todavía no está configurada.",
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

      if (
        !email ||
        !password
      ) {
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
          "La cuenta todavía no está configurada.",
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

        showAuthMessage(
          "Cuenta creada correctamente.",
          "success"
        );

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
        const { error } =
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
    }
  );
}

/* =========================================================
   SUGERENCIAS
   ========================================================= */

function openSuggestionModal() {
  showSuggestionMessage("");

  suggestionForm?.reset();

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
   RENDER SUGERENCIAS
   ========================================================= */

function renderSuggestions(
  suggestions
) {
  allSuggestions =
    suggestions;

  if (!suggestionsList) {
    return;
  }

  let filtered =
    [...allSuggestions];

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

  if (category !== "Todas") {
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
              suggestion.category || ""
            }`.toLowerCase();

          return text.includes(
            search
          );
        }
      );
  }

  if (filtered.length === 0) {
    suggestionsList.innerHTML = `
      <div class="suggestions-loading">
        No hay sugerencias para mostrar.
      </div>
    `;

    return;
  }

  suggestionsList.innerHTML = "";

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
    `👍 ${suggestion.votes || 0}`;

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

  article.appendChild(header);
  article.appendChild(category);
  article.appendChild(text);
  article.appendChild(actions);

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
          "Las sugerencias todavía no están configuradas.",
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

      if (
        !name ||
        !idea
      ) {
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
      console.error(error);
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
  if (
    !isSupabaseConfigured() ||
    !currentUser
  ) {
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
      ".dev-card"
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

          if (existingDetails) {
            existingDetails.remove();
            return;
          }

          const details =
            document.createElement(
              "div"
            );

          details.className =
            "project-details";

          const safeTitle =
            escapeHtml(
              title
            );

          const safeDescription =
            escapeHtml(
              description
            );

          details.innerHTML = `
            <p>
              <strong>Proyecto:</strong>
              ${safeTitle}
            </p>

            <p>
              <strong>Descripción:</strong>
              ${safeDescription}
            </p>

            <p>
              <strong>Lanzamiento previsto:</strong>
              Por determinar
            </p>

            <p>
              <strong>Personas trabajando:</strong>
              5
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

  div.textContent =
    value;

  return div.innerHTML;
}

/* =========================================================
   ANTITRONKS
   ========================================================= */

const antitronksCard =
  document.getElementById(
    "antitronks-card"
  );

const antitronksModal =
  document.getElementById(
    "antitronks-modal"
  );

const antitronksClose =
  document.getElementById(
    "antitronks-close"
  );

const antitronksBackdrop =
  document.querySelector(
    ".antitronks-backdrop"
  );

const antitronksGame =
  document.querySelector(
    ".antitronks-game"
  );

const antitronksCanvas =
  document.getElementById(
    "antitronks-canvas"
  );

/* =========================================================
   VARIABLES DEL JUEGO
   ========================================================= */

let antitronksAnimationFrame =
  null;

let antitronksRunning =
  false;

let antitronksStarted =
  false;

let antitronksScore =
  0;

let antitronksLives =
  3;

let antitronksCamera =
  0;

let antitronksTargetCamera =
  0;

let antitronksLastTime =
  0;

let antitronksWidth =
  0;

let antitronksHeight =
  0;

let antitronksFlash =
  0;

let antitronksSpawnTimer =
  null;

let antitronksNextSpawn =
  0;

let antitronksMessageTimer =
  null;

/*
 * IMPORTANTE:
 * Ahora no existe "currentTarget".
 *
 * Puede haber varios objetivos al mismo tiempo.
 */

let antitronksTargets =
  [];

let antitronksTargetId =
  0;

/* =========================================================
   CONFIGURACIÓN DEL JUEGO
   ========================================================= */

const ANTITRONKS_MAX_TARGETS =
  4;

const ANTITRONKS_FOV =
  Math.PI * 0.72;

const ANTITRONKS_CAMERA_LIMIT =
  Math.PI * 0.9;

const ANTITRONKS_PLAYER_HEIGHT =
  1.7;

const ANTITRONKS_BOXES = [
  {
    x: -6,
    y: 10,
    size: 1.6
  },
  {
    x: 4,
    y: 14,
    size: 1.8
  },
  {
    x: -4,
    y: 19,
    size: 1.7
  },
  {
    x: 6,
    y: 24,
    size: 1.9
  },
  {
    x: -7,
    y: 29,
    size: 1.7
  },
  {
    x: 3,
    y: 34,
    size: 1.8
  },
  {
    x: -5,
    y: 40,
    size: 1.9
  },
  {
    x: 7,
    y: 46,
    size: 1.8
  },
  {
    x: -3,
    y: 52,
    size: 1.7
  },
  {
    x: 5,
    y: 59,
    size: 2
  },
  {
    x: -7,
    y: 66,
    size: 1.8
  },
  {
    x: 4,
    y: 74,
    size: 1.9
  }
];

/* =========================================================
   UTILIDADES ANTITRONKS
   ========================================================= */

function antitronksRandom(
  min,
  max
) {
  return (
    Math.random() *
      (max - min) +
    min
  );
}

function antitronksClamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function antitronksDistance(
  x1,
  y1,
  x2,
  y2
) {
  return Math.sqrt(
    (x2 - x1) ** 2 +
    (y2 - y1) ** 2
  );
}

/* =========================================================
   ABRIR ANTITRONKS
   ========================================================= */

function openAntitronks() {
  if (!antitronksModal) {
    return;
  }

  antitronksModal.classList.remove(
    "hidden"
  );

  antitronksModal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "antitronks-open"
  );

  startAntitronks();
}

/* =========================================================
   CERRAR ANTITRONKS
   ========================================================= */

function closeAntitronks() {
  stopAntitronks();

  if (antitronksModal) {
    antitronksModal.classList.add(
      "hidden"
    );

    antitronksModal.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  document.body.classList.remove(
    "antitronks-open"
  );
}

if (antitronksCard) {
  antitronksCard.addEventListener(
    "click",
    openAntitronks
  );

  antitronksCard.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        openAntitronks();
      }
    }
  );
}

if (antitronksClose) {
  antitronksClose.addEventListener(
    "click",
    closeAntitronks
  );
}

if (antitronksBackdrop) {
  antitronksBackdrop.addEventListener(
    "click",
    closeAntitronks
  );
}

/* =========================================================
   INICIAR ANTITRONKS
   ========================================================= */

function startAntitronks() {
  stopAntitronks();

  antitronksScore = 0;
  antitronksLives = 3;

  antitronksCamera = 0;
  antitronksTargetCamera = 0;

  antitronksLastTime =
    performance.now();

  antitronksFlash = 0;

  antitronksTargets = [];

  antitronksTargetId = 0;

  antitronksStarted = true;
  antitronksRunning = true;

  resizeAntitronksCanvas();

  createAntitronksInterface();

  scheduleAntitronksSpawn(
    900
  );

  antitronksAnimationFrame =
    requestAnimationFrame(
      antitronksLoop
    );
}

/* =========================================================
   PARAR ANTITRONKS
   ========================================================= */

function stopAntitronks() {
  antitronksRunning = false;

  antitronksStarted = false;

  if (
    antitronksAnimationFrame
  ) {
    cancelAnimationFrame(
      antitronksAnimationFrame
    );

    antitronksAnimationFrame =
      null;
  }

  if (
    antitronksSpawnTimer
  ) {
    clearTimeout(
      antitronksSpawnTimer
    );

    antitronksSpawnTimer =
      null;
  }

  if (
    antitronksMessageTimer
  ) {
    clearTimeout(
      antitronksMessageTimer
    );

    antitronksMessageTimer =
      null;
  }

  antitronksTargets = [];

  removeAntitronksInterface();
}

/* =========================================================
   INTERFAZ DEL JUEGO
   ========================================================= */

function createAntitronksInterface() {
  if (!antitronksGame) {
    return;
  }

  removeAntitronksInterface();

  const hud =
    document.createElement(
      "div"
    );

  hud.className =
    "antitronks-hud";

  hud.id =
    "antitronks-hud";

  hud.innerHTML = `
    <div class="antitronks-score">
      Score: <span id="antitronks-score">0</span>
    </div>

    <div class="antitronks-lives">
      Lives: <span id="antitronks-lives">❤️❤️❤️</span>
    </div>

    <div
      class="antitronks-message"
      id="antitronks-message"
    ></div>

    <div
      class="antitronks-offscreen-enemies"
      id="antitronks-offscreen-enemies"
    ></div>
  `;

  antitronksGame.appendChild(
    hud
  );
}

function removeAntitronksInterface() {
  const hud =
    document.getElementById(
      "antitronks-hud"
    );

  if (hud) {
    hud.remove();
  }
}

/* =========================================================
   ACTUALIZAR HUD
   ========================================================= */

function updateAntitronksHUD() {
  const score =
    document.getElementById(
      "antitronks-score"
    );

  const lives =
    document.getElementById(
      "antitronks-lives"
    );

  if (score) {
    score.textContent =
      antitronksScore;
  }

  if (lives) {
    lives.textContent =
      "❤️".repeat(
        Math.max(
          0,
          antitronksLives
        )
      );
  }
}

/* =========================================================
   MENSAJES
   ========================================================= */

function showAntitronksMessage(
  message
) {
  const element =
    document.getElementById(
      "antitronks-message"
    );

  if (!element) {
    return;
  }

  element.textContent =
    message;

  if (
    antitronksMessageTimer
  ) {
    clearTimeout(
      antitronksMessageTimer
    );
  }

  if (message) {
    antitronksMessageTimer =
      setTimeout(
        () => {
          element.textContent =
            "";
        },
        900
      );
  }
}

/* =========================================================
   REDIMENSIONAR CANVAS
   ========================================================= */

function resizeAntitronksCanvas() {
  if (
    !antitronksCanvas ||
    !antitronksGame
  ) {
    return;
  }

  const rect =
    antitronksGame.getBoundingClientRect();

  const width =
    Math.max(
      1,
      Math.floor(rect.width)
    );

  const height =
    Math.max(
      1,
      Math.floor(rect.height)
    );

  const dpr =
    Math.min(
      window.devicePixelRatio ||
        1,
      2
    );

  antitronksWidth =
    width;

  antitronksHeight =
    height;

  antitronksCanvas.width =
    Math.floor(
      width * dpr
    );

  antitronksCanvas.height =
    Math.floor(
      height * dpr
    );

  antitronksCanvas.style.width =
    `${width}px`;

  antitronksCanvas.style.height =
    `${height}px`;

  const ctx =
    antitronksCanvas.getContext(
      "2d"
    );

  if (ctx) {
    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );
  }
}

window.addEventListener(
  "resize",
  () => {
    if (
      antitronksRunning
    ) {
      resizeAntitronksCanvas();
    }
  }
);

/* =========================================================
   CREAR OBJETIVO
   ========================================================= */

function spawnAntitronksTarget() {
  if (
    !antitronksRunning
  ) {
    return;
  }

  if (
    antitronksTargets.length >=
    ANTITRONKS_MAX_TARGETS
  ) {
    return;
  }

  let box = null;

  for (
    let attempt = 0;
    attempt < 20;
    attempt++
  ) {
    const candidate =
      ANTITRONKS_BOXES[
        Math.floor(
          Math.random() *
            ANTITRONKS_BOXES.length
        )
      ];

    const occupied =
      antitronksTargets.some(
        (target) =>
          target.boxY ===
          candidate.y
      );

    if (!occupied) {
      box = candidate;
      break;
    }
  }

  if (!box) {
    return;
  }

  const civilianChance =
    0.18;

  const isCivilian =
    Math.random() <
    civilianChance;

  const reactionTime =
    getAntitronksReactionTime();

  const target = {
    id:
      ++antitronksTargetId,

    type:
      isCivilian
        ? "civilian"
        : "enemy",

    x:
      box.x +
      antitronksRandom(
        -0.35,
        0.35
      ),

    y:
      box.y -

      antitronksRandom(
        0.1,
        0.8
      ),

    boxY:
      box.y,

    born:
      performance.now(),

    reactionTime,

    maxLife:
      isCivilian
        ? antitronksRandom(
            2600,
            4200
          )
        : null,

    hit:
      false,

    attack:
      false
  };

  antitronksTargets.push(
    target
  );
}

/* =========================================================
   TIEMPO DE REACCIÓN
   ========================================================= */

function getAntitronksReactionTime() {
  const base =
    2400;

  /*
   * Cuantos más puntos:
   * menos tiempo tiene el jugador.
   */

  const reduction =
    antitronksScore * 45;

  const minimum =
    550;

  return Math.max(
    minimum,
    base - reduction
  );
}

/* =========================================================
   TIEMPO DE APARICIÓN
   ========================================================= */

function getAntitronksSpawnDelay() {
  const minimum =
    Math.max(
      280,
      1150 -
        antitronksScore *
          25
    );

  const maximum =
    Math.max(
      650,
      2200 -
        antitronksScore *
          35
    );

  return antitronksRandom(
    minimum,
    maximum
  );
}

/* =========================================================
   PROGRAMAR APARICIÓN
   ========================================================= */

function scheduleAntitronksSpawn(
  delay = null
) {
  if (
    !antitronksRunning
  ) {
    return;
  }

  if (
    antitronksSpawnTimer
  ) {
    clearTimeout(
      antitronksSpawnTimer
    );
  }

  const spawnDelay =
    delay === null
      ? getAntitronksSpawnDelay()
      : delay;

  antitronksSpawnTimer =
    setTimeout(
      () => {
        if (
          !antitronksRunning
        ) {
          return;
        }

        spawnAntitronksTarget();

        /*
         * Con más puntuación puede haber
         * varios objetivos simultáneamente.
         */

        if (
          antitronksTargets.length <
            ANTITRONKS_MAX_TARGETS &&
          antitronksScore >= 3
        ) {
          const extraChance =
            Math.min(
              0.55,
              0.15 +
                antitronksScore *
                  0.025
            );

          if (
            Math.random() <
            extraChance
          ) {
            setTimeout(
              () => {
                spawnAntitronksTarget();
              },
              antitronksRandom(
                120,
                350
              )
            );
          }
        }

        scheduleAntitronksSpawn();
      },
      spawnDelay
    );
}

/* =========================================================
   ACTUALIZAR OBJETIVOS
   ========================================================= */

function updateAntitronksTargets(
  now
) {
  for (
    let i =
      antitronksTargets.length -
      1;
    i >= 0;
    i--
  ) {
    const target =
      antitronksTargets[i];

    const elapsed =
      now - target.born;

    /*
     * Los civiles desaparecen después
     * de un tiempo si no reciben un disparo.
     */

    if (
      target.type ===
        "civilian" &&
      elapsed >=
        target.maxLife
    ) {
      antitronksTargets.splice(
        i,
        1
      );

      continue;
    }

    /*
     * Los enemigos disparan automáticamente
     * cuando se acaba su tiempo.
     */

    if (
      target.type ===
        "enemy" &&
      !target.attack &&
      elapsed >=
        target.reactionTime
    ) {
      target.attack = true;

      antitronksPlayerHit();

      antitronksTargets.splice(
        i,
        1
      );
    }
  }
}

/* =========================================================
   DAÑO AL JUGADOR
   ========================================================= */

function antitronksPlayerHit() {
  antitronksLives--;

  antitronksFlash =
    180;

  showAntitronksMessage(
    "¡TE HAN DISPARADO!"
  );

  updateAntitronksHUD();

  if (
    antitronksLives <= 0
  ) {
    endAntitronksGame();
  }
}

/* =========================================================
   FIN DEL JUEGO
   ========================================================= */

function endAntitronksGame() {
  antitronksRunning =
    false;

  if (
    antitronksSpawnTimer
  ) {
    clearTimeout(
      antitronksSpawnTimer
    );

    antitronksSpawnTimer =
      null;
  }

  antitronksTargets = [];

  showAntitronksGameOver();
}

function showAntitronksGameOver() {
  if (!antitronksGame) {
    return;
  }

  const existing =
    document.getElementById(
      "antitronks-game-over"
    );

  if (existing) {
    existing.remove();
  }

  const overlay =
    document.createElement(
      "div"
    );

  overlay.id =
    "antitronks-game-over";

  overlay.className =
    "antitronks-overlay";

  overlay.innerHTML = `
    <div class="antitronks-overlay-box">

      <h3>
        Game Over
      </h3>

      <p>
        Score: <strong>${antitronksScore}</strong>
      </p>

      <button
        type="button"
        class="antitronks-start-button"
        id="antitronks-restart"
      >
        Jugar de nuevo
      </button>

    </div>
  `;

  antitronksGame.appendChild(
    overlay
  );

  document
    .getElementById(
      "antitronks-restart"
    )
    ?.addEventListener(
      "click",
      () => {
        overlay.remove();
        startAntitronks();
      }
    );
}

/* =========================================================
   PROYECCIÓN 3D SIMPLE
   ========================================================= */

function projectAntitronks(
  worldX,
  worldY
) {
  const relativeX =
    worldX;

  const relativeY =
    worldY;

  const dx =
    relativeX;

  const dz =
    relativeY;

  const angle =
    Math.atan2(
      dx,
      dz
    );

  let relativeAngle =
    angle -
    antitronksCamera;

  while (
    relativeAngle >
    Math.PI
  ) {
    relativeAngle -=
      Math.PI * 2;
  }

  while (
    relativeAngle <
    -Math.PI
  ) {
    relativeAngle +=
      Math.PI * 2;
  }

  const distance =
    Math.sqrt(
      dx * dx +
      dz * dz
    );

  if (
    Math.abs(
      relativeAngle
    ) >
    ANTITRONKS_FOV / 2
  ) {
    return {
      visible: false,
      distance,
      relativeAngle
    };
  }

  const horizontal =
    Math.tan(
      relativeAngle
    ) /
    Math.tan(
      ANTITRONKS_FOV / 2
    );

  const screenX =
    antitronksWidth / 2 +
    horizontal *
      (antitronksWidth / 2);

  const depth =
    Math.max(
      1,
      distance
    );

  const scale =
    240 /
    (depth + 5);

  const horizon =
    antitronksHeight *
    0.47;

  const groundY =
    horizon +
    250 *
      (1 / (depth + 2));

  return {
    visible: true,
    x: screenX,
    y: groundY,
    scale,
    distance,
    relativeAngle
  };
}

/* =========================================================
   DIBUJAR CIELO
   ========================================================= */

function drawAntitronksSky(
  ctx
) {
  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      0,
      antitronksHeight
    );

  gradient.addColorStop(
    0,
    "#111827"
  );

  gradient.addColorStop(
    0.5,
    "#374151"
  );

  gradient.addColorStop(
    1,
    "#6b7280"
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    antitronksWidth,
    antitronksHeight
  );
}

/* =========================================================
   DIBUJAR CALLE
   ========================================================= */

function drawAntitronksStreet(
  ctx
) {
  const horizon =
    antitronksHeight *
    0.47;

  ctx.fillStyle =
    "#171717";

  ctx.fillRect(
    0,
    horizon,
    antitronksWidth,
    antitronksHeight -
      horizon
  );

  ctx.fillStyle =
    "#252525";

  ctx.beginPath();

  ctx.moveTo(
    antitronksWidth *
      0.36,
    horizon
  );

  ctx.lineTo(
    antitronksWidth *
      0.64,
    horizon
  );

  ctx.lineTo(
    antitronksWidth,
    antitronksHeight
  );

  ctx.lineTo(
    0,
    antitronksHeight
  );

  ctx.closePath();

  ctx.fill();

  /*
   * Línea central de la carretera.
   */

  ctx.strokeStyle =
    "#d4d4d4";

  ctx.lineWidth =
    4;

  ctx.setLineDash([
    35,
    35
  ]);

  ctx.beginPath();

  ctx.moveTo(
    antitronksWidth / 2,
    horizon
  );

  ctx.lineTo(
    antitronksWidth / 2,
    antitronksHeight
  );

  ctx.stroke();

  ctx.setLineDash([]);
}

/* =========================================================
   DIBUJAR EDIFICIOS
   ========================================================= */

function drawAntitronksBuildings(
  ctx
) {
  const horizon =
    antitronksHeight *
    0.47;

  ctx.fillStyle =
    "#111111";

  ctx.fillRect(
    0,
    horizon - 110,
    antitronksWidth *
      0.25,
    110
  );

  ctx.fillRect(
    antitronksWidth *
      0.75,
    horizon - 135,
    antitronksWidth *
      0.25,
    135
  );

  ctx.fillStyle =
    "#1f2937";

  for (
    let i = 0;
    i < 7;
    i++
  ) {
    const left =
      i *
      (antitronksWidth /
        7);

    const h =
      35 +
      (i % 3) *
        25;

    ctx.fillRect(
      left,
      horizon - h,
      antitronksWidth /
        7 -
        4,
      h
    );
  }
}

/* =========================================================
   DIBUJAR CAJAS
   ========================================================= */

function drawAntitronksBoxes(
  ctx
) {
  ANTITRONKS_BOXES.forEach(
    (box) => {
      const projected =
        projectAntitronks(
          box.x,
          box.y
        );

      if (
        !projected.visible
      ) {
        return;
      }

      const size =
        Math.max(
          8,
          projected.scale *
            box.size
        );

      const x =
        projected.x -
        size / 2;

      const y =
        projected.y -
        size;

      ctx.fillStyle =
        "#7c4a21";

      ctx.fillRect(
        x,
        y,
        size,
        size
      );

      ctx.strokeStyle =
        "#3f2412";

      ctx.lineWidth =
        2;

      ctx.strokeRect(
        x,
        y,
        size,
        size
      );

      ctx.strokeStyle =
        "#a66b35";

      ctx.beginPath();

      ctx.moveTo(
        x,
        y
      );

      ctx.lineTo(
        x + size,
        y + size
      );

      ctx.moveTo(
        x + size,
        y
      );

      ctx.lineTo(
        x,
        y + size
      );

      ctx.stroke();
    }
  );
}

/* =========================================================
   DIBUJAR ENEMIGO
   ========================================================= */

function drawAntitronksEnemy(
  ctx,
  target,
  projected
) {
  const scale =
    projected.scale;

  const x =
    projected.x;

  const y =
    projected.y;

  const bodyWidth =
    Math.max(
      14,
      30 * scale
    );

  const bodyHeight =
    Math.max(
      25,
      55 * scale
    );

  const headRadius =
    Math.max(
      7,
      12 * scale
    );

  /*
   * Cuerpo.
   */

  ctx.fillStyle =
    "#1f2937";

  ctx.fillRect(
    x -
      bodyWidth / 2,
    y -
      bodyHeight,
    bodyWidth,
    bodyHeight
  );

  /*
   * Chaleco antibalas.
   */

  ctx.fillStyle =
    "#374151";

  ctx.fillRect(
    x -
      bodyWidth / 2 +
      3 * scale,
    y -
      bodyHeight +
      14 * scale,
    bodyWidth -
      6 * scale,
    27 * scale
  );

  /*
   * Cabeza.
   */

  ctx.fillStyle =
    "#111827";

  ctx.beginPath();

  ctx.arc(
    x,
    y -
      bodyHeight -
      headRadius,
    headRadius,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /*
   * Visor / máscara.
   */

  ctx.fillStyle =
    "#050505";

  ctx.fillRect(
    x -
      headRadius *
        0.75,
    y -
      bodyHeight -
      headRadius *
        1.15,
    headRadius *
      1.5,
    headRadius *
      0.45
  );

  /*
   * Brazos.
   */

  ctx.strokeStyle =
    "#1f2937";

  ctx.lineWidth =
    Math.max(
      3,
      8 * scale
    );

  ctx.beginPath();

  ctx.moveTo(
    x -
      bodyWidth / 2,
    y -
      bodyHeight +
      15 * scale
  );

  ctx.lineTo(
    x -
      bodyWidth *
        1.25,
    y -
      bodyHeight *
        0.55
  );

  ctx.moveTo(
    x +
      bodyWidth / 2,
    y -
      bodyHeight +
      15 * scale
  );

  ctx.lineTo(
    x +
      bodyWidth *
        1.25,
    y -
      bodyHeight *
        0.55
  );

  ctx.stroke();

  /*
   * M4.
   */

  ctx.strokeStyle =
    "#080808";

  ctx.lineWidth =
    Math.max(
      2,
      5 * scale
    );

  ctx.beginPath();

  ctx.moveTo(
    x +
      bodyWidth *
        0.55,
    y -
      bodyHeight *
        0.58
  );

  ctx.lineTo(
    x +
      bodyWidth *
        1.65,
    y -
      bodyHeight *
        0.82
  );

  ctx.stroke();

  /*
   * Nombre visual.
   */

  ctx.font =
    `${Math.max(
      9,
      12 * scale
    )}px Arial`;

  ctx.textAlign =
    "center";

  ctx.fillStyle =
    "#ef4444";

  ctx.fillText(
    "ENEMY",
    x,
    y -
      bodyHeight -
      headRadius *
        2.1
  );
}

/* =========================================================
   DIBUJAR CIVIL
   ========================================================= */

function drawAntitronksCivilian(
  ctx,
  target,
  projected
) {
  const scale =
    projected.scale;

  const x =
    projected.x;

  const y =
    projected.y;

  const bodyWidth =
    Math.max(
      13,
      27 * scale
    );

  const bodyHeight =
    Math.max(
      24,
      50 * scale
    );

  const headRadius =
    Math.max(
      7,
      11 * scale
    );

  ctx.fillStyle =
    "#2563eb";

  ctx.fillRect(
    x -
      bodyWidth / 2,
    y -
      bodyHeight,
    bodyWidth,
    bodyHeight
  );

  ctx.fillStyle =
    "#d1a37c";

  ctx.beginPath();

  ctx.arc(
    x,
    y -
      bodyHeight -
      headRadius,
    headRadius,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.strokeStyle =
    "#2563eb";

  ctx.lineWidth =
    Math.max(
      3,
      7 * scale
    );

  ctx.beginPath();

  ctx.moveTo(
    x -
      bodyWidth / 2,
    y -
      bodyHeight +
      12 * scale
  );

  ctx.lineTo(
    x -
      bodyWidth,
    y -
      bodyHeight *
        0.45
  );

  ctx.moveTo(
    x +
      bodyWidth / 2,
    y -
      bodyHeight +
      12 * scale
  );

  ctx.lineTo(
    x +
      bodyWidth,
    y -
      bodyHeight *
        0.45
  );

  ctx.stroke();

  ctx.font =
    `${Math.max(
      9,
      12 * scale
    )}px Arial`;

  ctx.textAlign =
    "center";

  ctx.fillStyle =
    "#60a5fa";

  ctx.fillText(
    "CIVILIAN",
    x,
    y -
      bodyHeight -
      headRadius *
        2
  );
}

/* =========================================================
   DIBUJAR OBJETIVOS
   ========================================================= */

function drawAntitronksTargets(
  ctx
) {
  antitronksTargets.forEach(
    (target) => {
      const projected =
        projectAntitronks(
          target.x,
          target.y
        );

      if (
        !projected.visible
      ) {
        return;
      }

      if (
        target.type ===
        "enemy"
      ) {
        drawAntitronksEnemy(
          ctx,
          target,
          projected
        );
      } else {
        drawAntitronksCivilian(
          ctx,
          target,
          projected
        );
      }
    }
  );
}

/* =========================================================
   FLECHAS FUERA DE CÁMARA
   ========================================================= */

function updateAntitronksOffscreenArrows() {
  const container =
    document.getElementById(
      "antitronks-offscreen-enemies"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const offscreenTargets =
    antitronksTargets.filter(
      (target) => {
        const projected =
          projectAntitronks(
            target.x,
            target.y
          );

        return (
          !projected.visible
        );
      }
    );

  offscreenTargets.forEach(
    (target, index) => {
      createAntitronksArrow(
        container,
        target,
        index,
        offscreenTargets.length
      );
    }
  );
}

/* =========================================================
   CREAR FLECHA
   ========================================================= */

function createAntitronksArrow(
  container,
  target,
  index,
  total
) {
  const arrow =
    document.createElement(
      "div"
    );

  arrow.className =
    "antitronks-offscreen-arrow";

  /*
   * Calculamos hacia qué lado
   * está el objetivo.
   */

  let relativeAngle =
    Math.atan2(
      target.x,
      target.y
    ) -
    antitronksCamera;

  while (
    relativeAngle >
    Math.PI
  ) {
    relativeAngle -=
      Math.PI * 2;
  }

  while (
    relativeAngle <
    -Math.PI
  ) {
    relativeAngle +=
      Math.PI * 2;
  }

  const isLeft =
    relativeAngle < 0;

  const verticalSpacing =
    42;

  const totalHeight =
    (total - 1) *
    verticalSpacing;

  const top =
    antitronksHeight /
      2 -
    totalHeight / 2 +
    index *
      verticalSpacing;

  arrow.style.top =
    `${antitronksClamp(
      top,
      80,
      antitronksHeight -
        80
    )}px`;

  /*
   * Flecha apuntando a izquierda/derecha.
   */

  arrow.style.left =
    isLeft
      ? "28px"
      : `${antitronksWidth - 28}px`;

  arrow.style.transform =
    isLeft
      ? "translateY(-50%) rotate(-90deg)"
      : "translateY(-50%) rotate(90deg)";

  container.appendChild(
    arrow
  );
}

/* =========================================================
   DIBUJAR PUNTERO / MIRA
   ========================================================= */

function drawAntitronksCrosshair(
  ctx
) {
  const centerX =
    antitronksWidth / 2;

  const centerY =
    antitronksHeight / 2;

  ctx.strokeStyle =
    "#ffffff";

  ctx.lineWidth =
    2;

  ctx.beginPath();

  ctx.moveTo(
    centerX - 14,
    centerY
  );

  ctx.lineTo(
    centerX - 4,
    centerY
  );

  ctx.moveTo(
    centerX + 4,
    centerY
  );

  ctx.lineTo(
    centerX + 14,
    centerY
  );

  ctx.moveTo(
    centerX,
    centerY - 14
  );

  ctx.lineTo(
    centerX,
    centerY - 4
  );

  ctx.moveTo(
    centerX,
    centerY + 4
  );

  ctx.lineTo(
    centerX,
    centerY + 14
  );

  ctx.stroke();

  ctx.beginPath();

  ctx.arc(
    centerX,
    centerY,
    3,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "#ffffff";

  ctx.fill();
}

/* =========================================================
   DIBUJAR ARMA
   ========================================================= */

function drawAntitronksWeapon(
  ctx
) {
  const centerX =
    antitronksWidth / 2;

  const bottom =
    antitronksHeight;

  const weaponWidth =
    Math.min(
      190,
      antitronksWidth *
        0.28
    );

  const weaponHeight =
    Math.min(
      130,
      antitronksHeight *
        0.25
    );

  /*
   * Culata / cuerpo.
   */

  ctx.fillStyle =
    "#111111";

  ctx.beginPath();

  ctx.moveTo(
    centerX -
      weaponWidth / 2,
    bottom
  );

  ctx.lineTo(
    centerX -
      weaponWidth *
        0.22,
    bottom -
      weaponHeight
  );

  ctx.lineTo(
    centerX +
      weaponWidth *
        0.20,
    bottom -
      weaponHeight
  );

  ctx.lineTo(
    centerX +
      weaponWidth / 2,
    bottom
  );

  ctx.closePath();

  ctx.fill();

  /*
   * Cargador.
   */

  ctx.fillStyle =
    "#262626";

  ctx.beginPath();

  ctx.moveTo(
    centerX -
      weaponWidth *
        0.08,
    bottom -
      weaponHeight *
        0.5
  );

  ctx.lineTo(
    centerX +
      weaponWidth *
        0.06,
    bottom -
      weaponHeight *
        0.5
  );

  ctx.lineTo(
    centerX +
      weaponWidth *
        0.16,
    bottom
  );

  ctx.lineTo(
    centerX -
      weaponWidth *
        0.02,
    bottom
  );

  ctx.closePath();

  ctx.fill();

  /*
   * Cañón.
   */

  ctx.fillStyle =
    "#090909";

  ctx.fillRect(
    centerX -
      5,
    bottom -
      weaponHeight *
        1.25,
    10,
    weaponHeight *
      0.65
  );
}

/* =========================================================
   BUCLE DEL JUEGO
   ========================================================= */

function antitronksLoop(
  now
) {
  if (
    !antitronksRunning
  ) {
    return;
  }

  const delta =
    now -
    antitronksLastTime;

  antitronksLastTime =
    now;

  updateAntitronksCamera();

  updateAntitronksTargets(
    now
  );

  if (
    antitronksFlash > 0
  ) {
    antitronksFlash -=
      delta;
  }

  drawAntitronks();

  updateAntitronksOffscreenArrows();

  updateAntitronksHUD();

  antitronksAnimationFrame =
    requestAnimationFrame(
      antitronksLoop
    );
}

/* =========================================================
   ACTUALIZAR CÁMARA
   ========================================================= */

function updateAntitronksCamera() {
  const difference =
    antitronksTargetCamera -
    antitronksCamera;

  antitronksCamera +=
    difference *
    0.12;

  antitronksCamera =
    antitronksClamp(
      antitronksCamera,
      -ANTITRONKS_CAMERA_LIMIT,
      ANTITRONKS_CAMERA_LIMIT
    );
}

/* =========================================================
   DIBUJAR TODO
   ========================================================= */

function drawAntitronks() {
  if (!antitronksCanvas) {
    return;
  }

  const ctx =
    antitronksCanvas.getContext(
      "2d"
    );

  if (!ctx) {
    return;
  }

  ctx.clearRect(
    0,
    0,
    antitronksWidth,
    antitronksHeight
  );

  drawAntitronksSky(
    ctx
  );

  drawAntitronksBuildings(
    ctx
  );

  drawAntitronksStreet(
    ctx
  );

  drawAntitronksBoxes(
    ctx
  );

  drawAntitronksTargets(
    ctx
  );

  drawAntitronksWeapon(
    ctx
  );

  drawAntitronksCrosshair(
    ctx
  );

  if (
    antitronksFlash > 0
  ) {
    ctx.fillStyle =
      `rgba(
        255,
        40,
        40,
        ${Math.min(
          0.35,
          antitronksFlash /
            500
        )}
      )`;

    ctx.fillRect(
      0,
      0,
      antitronksWidth,
      antitronksHeight
    );
  }
}

/* =========================================================
   DISPARAR
   ========================================================= */

function shootAntitronks() {
  if (
    !antitronksRunning
  ) {
    return;
  }

  antitronksFlash =
    80;

  const centerX =
    antitronksWidth / 2;

  const centerY =
    antitronksHeight / 2;

  let bestTarget =
    null;

  let bestDistance =
    Infinity;

  antitronksTargets.forEach(
    (target) => {
      const projected =
        projectAntitronks(
          target.x,
          target.y
        );

      if (
        !projected.visible
      ) {
        return;
      }

      const dx =
        projected.x -
        centerX;

      const dy =
        projected.y -
        centerY;

      const distance =
        Math.sqrt(
          dx * dx +
          dy * dy
        );

      /*
       * Zona de impacto.
       */

      const hitRadius =
        Math.max(
          35,
          projected.scale *
            55
        );

      if (
        distance <=
          hitRadius &&
        distance <
          bestDistance
      ) {
        bestTarget =
          target;

        bestDistance =
          distance;
      }
    }
  );

  if (!bestTarget) {
    return;
  }

  /*
   * Civilian:
   * perder una vida.
   */

  if (
    bestTarget.type ===
    "civilian"
  ) {
    antitronksLives--;

    showAntitronksMessage(
      "¡HAS DISPARADO A UN CIVIL!"
    );

    antitronksTargets =
      antitronksTargets.filter(
        (target) =>
          target.id !==
          bestTarget.id
      );

    updateAntitronksHUD();

    if (
      antitronksLives <= 0
    ) {
      endAntitronksGame();
    }

    return;
  }

  /*
   * Enemy:
   * sumar punto.
   */

  antitronksScore++;

  showAntitronksMessage(
    "+1"
  );

  antitronksTargets =
    antitronksTargets.filter(
      (target) =>
        target.id !==
        bestTarget.id
    );

  updateAntitronksHUD();
}

/* =========================================================
   CONTROL DE RATÓN
   ========================================================= */

if (antitronksCanvas) {
  antitronksCanvas.addEventListener(
    "mousemove",
    (event) => {
      if (
        !antitronksRunning
      ) {
        return;
      }

      const rect =
        antitronksCanvas.getBoundingClientRect();

      const x =
        event.clientX -
        rect.left;

      const normalized =
        x /
        rect.width;

      antitronksTargetCamera =
        (normalized -
          0.5) *
        2 *
        ANTITRONKS_CAMERA_LIMIT;
    }
  );

  antitronksCanvas.addEventListener(
    "mousedown",
    (event) => {
      if (
        event.button === 0
      ) {
        event.preventDefault();
        shootAntitronks();
      }
    }
  );

  antitronksCanvas.addEventListener(
    "contextmenu",
    (event) => {
      event.preventDefault();
    }
  );
}

/* =========================================================
   TECLADO
   ========================================================= */

const antitronksKeys = {
  left: false,
  right: false
};

document.addEventListener(
  "keydown",
  (event) => {
    if (
      !antitronksRunning
    ) {
      return;
    }

    if (
      event.code ===
      "ArrowLeft"
    ) {
      antitronksKeys.left =
        true;

      event.preventDefault();
    }

    if (
      event.code ===
        "ArrowRight" ||
      event.code === "d" ||
      event.code === "D"
    ) {
      antitronksKeys.right =
        true;

      event.preventDefault();
    }

    if (
      event.code === "a" ||
      event.code === "A"
    ) {
      antitronksKeys.left =
        true;

      event.preventDefault();
    }

    if (
      event.code === "Space"
    ) {
      event.preventDefault();

      shootAntitronks();
    }

    if (
      event.key === "Escape" &&
      antitronksModal &&
      !antitronksModal.classList.contains(
        "hidden"
      )
    ) {
      closeAntitronks();
    }
  }
);

document.addEventListener(
  "keyup",
  (event) => {
    if (
      event.code ===
        "ArrowLeft" ||
      event.code === "a" ||
      event.code === "A"
    ) {
      antitronksKeys.left =
        false;
    }

    if (
      event.code ===
        "ArrowRight" ||
      event.code === "d" ||
      event.code === "D"
    ) {
      antitronksKeys.right =
        false;
    }
  }
);

/* =========================================================
   MOVIMIENTO DE CÁMARA CON TECLADO
   ========================================================= */

setInterval(
  () => {
    if (
      !antitronksRunning
    ) {
      return;
    }

    if (
      antitronksKeys.left
    ) {
      antitronksTargetCamera -=
        0.035;
    }

    if (
      antitronksKeys.right
    ) {
      antitronksTargetCamera +=
        0.035;
    }

    antitronksTargetCamera =
      antitronksClamp(
        antitronksTargetCamera,
        -ANTITRONKS_CAMERA_LIMIT,
        ANTITRONKS_CAMERA_LIMIT
      );
  },
  16
);

/* =========================================================
   CERRAR ANTITRONKS CON ESC
   ========================================================= */

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      antitronksModal &&
      !antitronksModal.classList.contains(
        "hidden"
      )
    ) {
      closeAntitronks();
    }
  }
);

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

initializeProjects();

loadSuggestions();

updateAccountUI();

console.log(
  "TronkStudios: script cargado correctamente."
);