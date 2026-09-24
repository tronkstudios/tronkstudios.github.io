"use strict";

console.log("SCRIPT NUEVO CARGADO");

/* =========================================================
   CONFIGURACIÓN SUPABASE
   ========================================================= */

const SUPABASE_URL = "https://qjjnqhbtovjcbwgcwhgl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YPAglgrxaxvaqU8KSS-HkQ_scyeLigm";

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

const accountButton = document.getElementById("account-button");
const themeToggle = document.getElementById("theme-toggle");
const yearElement = document.getElementById("year");

const accountModal = document.getElementById("account-modal");
const suggestionModal = document.getElementById("suggestion-modal");

const loginPanel = document.getElementById("login-panel");
const registerPanel = document.getElementById("register-panel");
const loggedPanel = document.getElementById("logged-panel");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

const showRegisterButton = document.getElementById("show-register");
const showLoginButton = document.getElementById("show-login");
const logoutButton = document.getElementById("logout-button");

const authMessage = document.getElementById("auth-message");

const accountName = document.getElementById("account-name");
const accountEmail = document.getElementById("account-email");

const newSuggestionButton = document.getElementById(
  "new-suggestion-button"
);

const footerSuggestionButton = document.getElementById(
  "footer-suggestion-button"
);

const suggestionForm = document.getElementById("suggestion-form");
const suggestionMessage = document.getElementById("suggestion-message");

const suggestionName = document.getElementById("suggestion-name");
const suggestionText = document.getElementById("suggestion-text");
const characterCount = document.getElementById("character-count");

const suggestionsList = document.getElementById("suggestions-list");
const suggestionSearch = document.getElementById("suggestion-search");
const suggestionCategory = document.getElementById(
  "suggestion-category"
);

const suggestionTabs = document.querySelectorAll(".suggestion-tab");

/* =========================================================
   AÑO
   ========================================================= */

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

/* =========================================================
   TEMA
   ========================================================= */

function getSavedTheme() {
  try {
    return localStorage.getItem("tronkstudios-theme");
  } catch {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem("tronkstudios-theme", theme);
  } catch {
    // No hacer nada si localStorage no está disponible.
  }
}

function updateThemeButton(theme) {
  if (!themeToggle) {
    return;
  }

  const icon = themeToggle.querySelector(".theme-icon");
  const label = themeToggle.querySelector(".theme-label");

  if (theme === "dark") {
    if (icon) {
      icon.textContent = "☀️";
    }

    if (label) {
      label.textContent = "Claro";
    }

    themeToggle.setAttribute("aria-pressed", "true");
    themeToggle.setAttribute("aria-label", "Cambiar a modo claro");
  } else {
    if (icon) {
      icon.textContent = "🌙";
    }

    if (label) {
      label.textContent = "Oscuro";
    }

    themeToggle.setAttribute("aria-pressed", "false");
    themeToggle.setAttribute("aria-label", "Cambiar a modo oscuro");
  }
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
  }

  updateThemeButton(theme);
}

function initializeTheme() {
  const savedTheme = getSavedTheme();

  if (savedTheme === "dark" || savedTheme === "light") {
    applyTheme(savedTheme);
    return;
  }

  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const initialTheme = prefersDark ? "dark" : "light";

  applyTheme(initialTheme);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "light";

    const newTheme =
      currentTheme === "dark" ? "light" : "dark";

    applyTheme(newTheme);
    saveTheme(newTheme);
  });
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
  modal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  if (!modal) {
    return;
  }

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");

  if (
    (!accountModal || accountModal.classList.contains("hidden")) &&
    (!suggestionModal || suggestionModal.classList.contains("hidden"))
  ) {
    document.body.classList.remove("modal-open");
  }
}

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const modalId = button.getAttribute("data-close-modal");
    const modal = document.getElementById(modalId);

    closeModal(modal);
  });
});

document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
  backdrop.addEventListener("click", () => {
    const modal = backdrop.closest(".modal");
    closeModal(modal);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (accountModal && !accountModal.classList.contains("hidden")) {
    closeModal(accountModal);
  }

  if (
    suggestionModal &&
    !suggestionModal.classList.contains("hidden")
  ) {
    closeModal(suggestionModal);
  }
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
    const result = await supabaseClient.auth.getUser();

    if (!result || !result.data) {
      return null;
    }

    return result.data.user || null;
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
    return null;
  }
}

/* =========================================================
   MENSAJES
   ========================================================= */

function showAuthMessage(message, type = "") {
  if (!authMessage) {
    return;
  }

  authMessage.textContent = message;
  authMessage.className = "auth-message";

  if (type) {
    authMessage.classList.add(type);
  }
}

function showSuggestionMessage(message, type = "") {
  if (!suggestionMessage) {
    return;
  }

  suggestionMessage.textContent = message;
  suggestionMessage.className = "auth-message";

  if (type) {
    suggestionMessage.classList.add(type);
  }
}

/* =========================================================
   INTERFAZ DE CUENTA
   ========================================================= */

function showLoginPanel() {
  if (loginPanel) {
    loginPanel.classList.remove("hidden");
  }

  if (registerPanel) {
    registerPanel.classList.add("hidden");
  }

  if (loggedPanel) {
    loggedPanel.classList.add("hidden");
  }
}

function showRegisterPanel() {
  if (loginPanel) {
    loginPanel.classList.add("hidden");
  }

  if (registerPanel) {
    registerPanel.classList.remove("hidden");
  }

  if (loggedPanel) {
    loggedPanel.classList.add("hidden");
  }
}

function showLoggedPanel() {
  if (loginPanel) {
    loginPanel.classList.add("hidden");
  }

  if (registerPanel) {
    registerPanel.classList.add("hidden");
  }

  if (loggedPanel) {
    loggedPanel.classList.remove("hidden");
  }
}

async function updateAccountUI() {
  currentUser = await getCurrentUser();

  if (!currentUser) {
    showLoginPanel();

    if (accountButton) {
      accountButton.textContent = "👤 Cuenta";
    }

    return;
  }

  showLoggedPanel();

  const metadata = currentUser.user_metadata || {};

  const name =
    metadata.name ||
    metadata.full_name ||
    currentUser.email?.split("@")[0] ||
    "Usuario";

  if (accountName) {
    accountName.textContent = name;
  }

  if (accountEmail) {
    accountEmail.textContent =
      currentUser.email || "Sin correo";
  }

  if (accountButton) {
    accountButton.textContent = `👤 ${name}`;
  }
}

/* =========================================================
   BOTÓN CUENTA
   ========================================================= */

if (accountButton) {
  accountButton.addEventListener("click", async () => {
    showAuthMessage("");

    await updateAccountUI();

    openModal(accountModal);
  });
}

/* =========================================================
   CAMBIAR LOGIN / REGISTRO
   ========================================================= */

if (showRegisterButton) {
  showRegisterButton.addEventListener("click", () => {
    showAuthMessage("");
    showRegisterPanel();
  });
}

if (showLoginButton) {
  showLoginButton.addEventListener("click", () => {
    showAuthMessage("");
    showLoginPanel();
  });
}

/* =========================================================
   INICIAR SESIÓN
   ========================================================= */

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      showAuthMessage(
        "La cuenta todavía no está configurada. Primero hay que conectar Supabase.",
        "error"
      );
      return;
    }

    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");

    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (!email || !password) {
      showAuthMessage(
        "Introduce tu correo y contraseña.",
        "error"
      );
      return;
    }

    showAuthMessage("Iniciando sesión...");

    try {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        showAuthMessage(
          error.message || "No se pudo iniciar sesión.",
          "error"
        );
        return;
      }

      currentUser = data?.user || null;

      showAuthMessage(
        "Has iniciado sesión correctamente.",
        "success"
      );

      await updateAccountUI();

      setTimeout(() => {
        closeModal(accountModal);
      }, 700);
    } catch (error) {
      console.error(error);

      showAuthMessage(
        "Ha ocurrido un error al iniciar sesión.",
        "error"
      );
    }
  });
}

/* =========================================================
   CREAR CUENTA
   ========================================================= */

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      showAuthMessage(
        "La cuenta todavía no está configurada. Primero hay que conectar Supabase.",
        "error"
      );
      return;
    }

    const nameInput =
      document.getElementById("register-name");

    const emailInput =
      document.getElementById("register-email");

    const passwordInput =
      document.getElementById("register-password");

    const name = nameInput?.value.trim() || "";
    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (!name || !email || !password) {
      showAuthMessage(
        "Completa todos los campos.",
        "error"
      );
      return;
    }

    showAuthMessage("Creando cuenta...");

    try {
      const { data, error } =
        await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              name
            }
          }
        });

      if (error) {
        showAuthMessage(
          error.message || "No se pudo crear la cuenta.",
          "error"
        );
        return;
      }

      currentUser = data?.user || null;

      showAuthMessage(
        "Cuenta creada correctamente.",
        "success"
      );

      if (registerForm) {
        registerForm.reset();
      }

      await updateAccountUI();
    } catch (error) {
      console.error(error);

      showAuthMessage(
        "Ha ocurrido un error al crear la cuenta.",
        "error"
      );
    }
  });
}

/* =========================================================
   CERRAR SESIÓN
   ========================================================= */

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
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
          error.message || "No se pudo cerrar sesión.",
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
        accountButton.textContent = "👤 Cuenta";
      }
    } catch (error) {
      console.error(error);

      showAuthMessage(
        "Ha ocurrido un error al cerrar sesión.",
        "error"
      );
    }
  });
}

/* =========================================================
   CAMBIO DE ESTADO DE SUPABASE
   ========================================================= */

if (isSupabaseConfigured()) {
  supabaseClient.auth.onAuthStateChange(
    async (event, session) => {
      currentUser = session?.user || null;

      await updateAccountUI();
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
   CONTADOR DE CARACTERES
   ========================================================= */

function updateCharacterCounter() {
  if (!suggestionText || !characterCount) {
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
    const { data, error } = await supabaseClient
      .from("suggestions")
      .select("*")
      .order("created_at", {
        ascending: false
      });

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

    renderSuggestions(data || []);
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

let allSuggestions = [];
let currentSuggestionTab = "all";

function renderSuggestions(suggestions) {
  allSuggestions = suggestions;

  if (!suggestionsList) {
    return;
  }

  let filtered = [...allSuggestions];

  const search =
    suggestionSearch?.value
      .trim()
      .toLowerCase() || "";

  const category =
    suggestionCategory?.value || "Todas";

  if (currentSuggestionTab === "mine") {
    if (!currentUser) {
      filtered = [];
    } else {
      filtered = filtered.filter(
        (suggestion) =>
          suggestion.user_id === currentUser.id
      );
    }
  }

  if (category !== "Todas") {
    filtered = filtered.filter(
      (suggestion) =>
        suggestion.category === category
    );
  }

  if (search) {
    filtered = filtered.filter((suggestion) => {
      const text =
        `${suggestion.name || ""} ${
          suggestion.idea || ""
        } ${suggestion.category || ""}`.toLowerCase();

      return text.includes(search);
    });
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

  filtered.forEach((suggestion) => {
    const card = createSuggestionCard(suggestion);

    suggestionsList.appendChild(card);
  });
}

/* =========================================================
   CREAR TARJETA
   ========================================================= */

function createSuggestionCard(suggestion) {
  const article = document.createElement("article");

  article.className = "suggestion-card";

  const header = document.createElement("div");

  header.className = "suggestion-header";

  const author = document.createElement("strong");

  author.className = "suggestion-author";

  author.textContent =
    suggestion.name || "Usuario";

  const date = document.createElement("span");

  date.className = "suggestion-date";

  date.textContent =
    formatDate(suggestion.created_at);

  header.appendChild(author);
  header.appendChild(date);

  const category = document.createElement("span");

  category.className =
    "suggestion-category-badge";

  category.textContent =
    suggestion.category || "Sin categoría";

  const text = document.createElement("p");

  text.className = "suggestion-text";

  text.textContent =
    suggestion.idea || "";

  const actions = document.createElement("div");

  actions.className = "suggestion-actions";

  const voteButton = document.createElement("button");

  voteButton.type = "button";
  voteButton.className = "vote-button";

  voteButton.textContent =
    `👍 ${suggestion.votes || 0}`;

  voteButton.addEventListener("click", () => {
    voteSuggestion(suggestion);
  });

  actions.appendChild(voteButton);

  if (
    currentUser &&
    suggestion.user_id === currentUser.id
  ) {
    const deleteButton =
      document.createElement("button");

    deleteButton.type = "button";

    deleteButton.className =
      "delete-suggestion-button";

    deleteButton.textContent = "Eliminar";

    deleteButton.addEventListener(
      "click",
      () => {
        deleteSuggestion(suggestion.id);
      }
    );

    actions.appendChild(deleteButton);
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

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
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
        suggestionName?.value.trim() || "";

      const categoryInput =
        document.getElementById(
          "suggestion-category-input"
        );

      const category =
        categoryInput?.value || "Juego";

      const idea =
        suggestionText?.value.trim() || "";

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
        const { error } =
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
          closeModal(suggestionModal);
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

async function voteSuggestion(suggestion) {
  if (!isSupabaseConfigured()) {
    return;
  }

  // Comprobar que hay un usuario conectado
  const user = await getCurrentUser();

  if (!user) {
    alert("Necesitas iniciar sesión para votar.");
    return;
  }

  try {
    // Comprobar si este usuario ya ha votado esta sugerencia
    const { data: existingLike, error: checkError } =
      await supabaseClient
        .from("Likes")
        .select("id")
        .eq("user_id", user.id)
        .eq("project_id", suggestion.id)
        .maybeSingle();

    if (checkError) {
      console.error("Error comprobando el voto:", checkError);
      alert("No se ha podido comprobar tu voto.");
      return;
    }

    // Si ya existe un voto, no permitimos otro
    if (existingLike) {
      alert("Ya has votado esta sugerencia.");
      return;
    }

    // Crear el voto
    const { error: likeError } =
      await supabaseClient
        .from("Likes")
        .insert({
          user_id: user.id,
          project_id: suggestion.id
        });

    if (likeError) {
      console.error("Error creando el voto:", likeError);

      // Si la base de datos detecta que ya existe,
      // tampoco permitimos otro voto.
      if (likeError.code === "23505") {
        alert("Ya has votado esta sugerencia.");
      } else {
        alert("No se ha podido registrar tu voto.");
      }

      return;
    }

    // Aumentar el contador de votos
    const newVotes =
      Number(suggestion.votes || 0) + 1;

    const { error: updateError } =
      await supabaseClient
        .from("suggestions")
        .update({
          votes: newVotes
        })
        .eq("id", suggestion.id);

    if (updateError) {
      console.error(
        "Error actualizando los votos:",
        updateError
      );
      return;
    }

    // Recargar las sugerencias
    await loadSuggestions();

  } catch (error) {
    console.error("Error votando:", error);
  }
}
  if (!isSupabaseConfigured()) {
    return;
  }

  const newVotes =
    Number(suggestion.votes || 0) + 1;

  try {
    const { error } =
      await supabaseClient
        .from("suggestions")
        .update({
          votes: newVotes
        })
        .eq("id", suggestion.id);

    if (error) {
      console.error(error);
      return;
    }

    await loadSuggestions();
  } catch (error) {
    console.error(error);
  }


/* =========================================================
   ELIMINAR SUGERENCIA
   ========================================================= */

async function deleteSuggestion(id) {
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
    const { error } =
      await supabaseClient
        .from("suggestions")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUser.id);

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
   PESTAÑAS
   ========================================================= */

suggestionTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    suggestionTabs.forEach((item) => {
      item.classList.remove("active");
    });

    tab.classList.add("active");

    currentSuggestionTab =
      tab.dataset.tab || "all";

    renderSuggestions(allSuggestions);
  });
});

/* =========================================================
   BUSCADOR
   ========================================================= */

if (suggestionSearch) {
  suggestionSearch.addEventListener(
    "input",
    () => {
      renderSuggestions(allSuggestions);
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
      renderSuggestions(allSuggestions);
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

  projectCards.forEach((card) => {
    card.style.cursor = "pointer";

    card.addEventListener("click", () => {
      const title =
        card.querySelector("h3")
          ?.textContent ||
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
        document.createElement("div");

      details.className =
        "project-details";

      details.innerHTML = `
        <p><strong>Proyecto:</strong> ${escapeHtml(title)}</p>
        <p><strong>Descripción:</strong> ${escapeHtml(description)}</p>
        <p><strong>Lanzamiento previsto:</strong> Por determinar</p>
        <p><strong>Personas trabajando:</strong> Por determinar</p>
      `;

      card.appendChild(details);
    });
  });
}

function escapeHtml(value) {
  const div =
    document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}

/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

initializeProjects();
loadSuggestions();

updateAccountUI();

console.log(
  "TronkStudios: script cargado correctamente."
);
