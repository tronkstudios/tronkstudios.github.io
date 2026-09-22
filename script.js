(function () {
  "use strict";

  /*
   * ============================================================
   * CONFIGURACIÓN SUPABASE
   * ============================================================
   *
   * PON AQUÍ LOS DATOS DE TU PROYECTO DE SUPABASE.
   *
   * IMPORTANTE:
   * - La anon key SÍ puede estar en este archivo.
   * - NUNCA pongas aquí la service_role key.
   */

  const SUPABASE_URL = "PON_AQUI_TU_SUPABASE_URL";
const SUPABASE_ANON_KEY = "PON_AQUI_TU_SUPABASE_ANON_KEY";

let supabaseClient = null;

if (
  SUPABASE_URL !== "PON_AQUI_TU_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "PON_AQUI_TU_SUPABASE_ANON_KEY"
) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}


  /*
   * ============================================================
   * TEMA
   * ============================================================
   */

  const root = document.documentElement;
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = themeToggle.querySelector(".theme-icon");
  const themeLabel = themeToggle.querySelector(".theme-label");

  const STORAGE_KEY = "tronk-theme";

  function readStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Nada
    }
  }

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    saveTheme(theme);

    if (theme === "dark") {
      themeIcon.textContent = "☀️";
      themeLabel.textContent = "Claro";
      themeToggle.setAttribute("aria-pressed", "true");
    } else {
      themeIcon.textContent = "🌙";
      themeLabel.textContent = "Oscuro";
      themeToggle.setAttribute("aria-pressed", "false");
    }
  }

  let currentTheme = readStoredTheme() || getSystemTheme();

  applyTheme(currentTheme);

  themeToggle.addEventListener("click", function () {
    currentTheme =
      currentTheme === "dark"
        ? "light"
        : "dark";

    applyTheme(currentTheme);
  });


  /*
   * ============================================================
   * ELEMENTOS
   * ============================================================
   */

  const accountButton =
    document.getElementById("account-button");

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

  const authMessage =
    document.getElementById("auth-message");

  const suggestionsList =
    document.getElementById("suggestions-list");

  const newSuggestionButton =
    document.getElementById("new-suggestion-button");

  const footerSuggestionButton =
    document.getElementById("footer-suggestion-button");

  const suggestionMessage =
    document.getElementById("suggestion-message");

  const suggestionText =
    document.getElementById("suggestion-text");

  const characterCount =
    document.getElementById("character-count");


  /*
   * ============================================================
   * MODALES
   * ============================================================
   */

  function openModal(modal) {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");

    if (
      accountModal.classList.contains("hidden") &&
      suggestionModal.classList.contains("hidden")
    ) {
      document.body.style.overflow = "";
    }
  }

  document
    .querySelectorAll("[data-close-modal]")
    .forEach(function (button) {

      button.addEventListener("click", function () {

        const modal =
          document.getElementById(
            button.dataset.closeModal
          );

        closeModal(modal);
      });
    });

  document
    .querySelectorAll(".modal-backdrop")
    .forEach(function (backdrop) {

      backdrop.addEventListener("click", function () {

        const modal =
          backdrop.closest(".modal");

        closeModal(modal);
      });
    });

  document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

      if (!accountModal.classList.contains("hidden")) {
        closeModal(accountModal);
      }

      if (!suggestionModal.classList.contains("hidden")) {
        closeModal(suggestionModal);
      }
    }
  });


  /*
   * ============================================================
   * CUENTA
   * ============================================================
   */

  async function getCurrentUser() {

    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    return user;
  }


  async function updateAccountUI() {

    const user = await getCurrentUser();

    if (!user) {

      accountButton.textContent = "👤 Cuenta";

      loginPanel.classList.remove("hidden");
      registerPanel.classList.add("hidden");
      loggedPanel.classList.add("hidden");

      return;
    }

    accountButton.textContent =
      "👤 " +
      (
        user.user_metadata?.display_name ||
        user.email ||
        "Cuenta"
      );

    loginPanel.classList.add("hidden");
    registerPanel.classList.add("hidden");
    loggedPanel.classList.remove("hidden");

    document.getElementById("account-name").textContent =
      user.user_metadata?.display_name ||
      "Usuario";

    document.getElementById("account-email").textContent =
      user.email || "";

    document.getElementById("suggestion-name").value =
      user.user_metadata?.display_name || "";

    await loadSuggestions();
  }


  accountButton.addEventListener("click", async function () {

    authMessage.textContent = "";

    await updateAccountUI();

    openModal(accountModal);
  });


  document
    .getElementById("show-register")
    .addEventListener("click", function () {

      loginPanel.classList.add("hidden");
      registerPanel.classList.remove("hidden");

      authMessage.textContent = "";
    });


  document
    .getElementById("show-login")
    .addEventListener("click", function () {

      registerPanel.classList.add("hidden");
      loginPanel.classList.remove("hidden");

      authMessage.textContent = "";
    });


  /*
   * ============================================================
   * REGISTRO
   * ============================================================
   */

  document
    .getElementById("register-form")
    .addEventListener("submit", async function (event) {

      event.preventDefault();

      const name =
        document
          .getElementById("register-name")
          .value
          .trim();

      const email =
        document
          .getElementById("register-email")
          .value
          .trim();

      const password =
        document
          .getElementById("register-password")
          .value;

      authMessage.textContent =
        "Creando cuenta...";

      const {
        data,
        error
      } = await supabaseClient.auth.signUp({

        email,
        password,

        options: {
          data: {
            display_name: name
          }
        }

      });

      if (error) {

        authMessage.textContent =
          error.message;

        return;
      }

      if (data.user && !data.session) {

        authMessage.textContent =
          "Cuenta creada. Revisa tu correo para confirmar la cuenta.";

        return;
      }

      authMessage.textContent =
        "Cuenta creada correctamente.";

      await updateAccountUI();

      setTimeout(function () {
        closeModal(accountModal);
      }, 800);
    });


  /*
   * ============================================================
   * LOGIN
   * ============================================================
   */

  document
    .getElementById("login-form")
    .addEventListener("submit", async function (event) {

      event.preventDefault();

      const email =
        document
          .getElementById("login-email")
          .value
          .trim();

      const password =
        document
          .getElementById("login-password")
          .value;

      authMessage.textContent =
        "Iniciando sesión...";

      const {
        error
      } = await supabaseClient.auth.signInWithPassword({

        email,
        password

      });

      if (error) {

        authMessage.textContent =
          "Correo o contraseña incorrectos.";

        return;
      }

      authMessage.textContent =
        "Sesión iniciada.";

      await updateAccountUI();

      setTimeout(function () {
        closeModal(accountModal);
      }, 500);
    });


  /*
   * ============================================================
   * CERRAR SESIÓN
   * ============================================================
   */

  document
    .getElementById("logout-button")
    .addEventListener("click", async function () {

      await supabaseClient.auth.signOut();

      authMessage.textContent =
        "Has cerrado sesión.";

      await updateAccountUI();

      await loadSuggestions();
    });


  /*
   * ============================================================
   * CAMBIO DE SESIÓN
   * ============================================================
   */

  supabaseClient.auth.onAuthStateChange(
    async function () {

      await updateAccountUI();

    }
  );


  /*
   * ============================================================
   * ABRIR SUGERENCIAS
   * ============================================================
   */

  async function openSuggestionForm() {

    const user = await getCurrentUser();

    if (!user) {

      loginPanel.classList.remove("hidden");
      registerPanel.classList.add("hidden");
      loggedPanel.classList.add("hidden");

      authMessage.textContent =
        "Necesitas una cuenta para enviar una sugerencia.";

      openModal(accountModal);

      return;
    }

    suggestionMessage.textContent = "";

    document.getElementById(
      "suggestion-name"
    ).value =
      user.user_metadata?.display_name || "";

    openModal(suggestionModal);
  }


  newSuggestionButton.addEventListener(
    "click",
    openSuggestionForm
  );

  footerSuggestionButton.addEventListener(
    "click",
    openSuggestionForm
  );


  /*
   * ============================================================
   * CONTADOR
   * ============================================================
   */

  suggestionText.addEventListener("input", function () {

    characterCount.textContent =
      suggestionText.value.length;

  });


  /*
   * ============================================================
   * MODERACIÓN BÁSICA
   * ============================================================
   *
   * Esto sirve como primera barrera.
   * La seguridad real también depende de las políticas
   * de Supabase.
   */

  const prohibitedWords = [

    "puta",
    "puto",
    "mierda",
    "coño",
    "joder",
    "cabron",
    "cabrón",
    "gilipollas",
    "maricon",
    "maricón",
    "idiota",
    "imbecil",
    "imbécil"

  ];


  function containsObsceneContent(text) {

    const normalized =
      text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    return prohibitedWords.some(function (word) {

      return normalized.includes(
        word
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
      );

    });
  }


  /*
   * ============================================================
   * CREAR SUGERENCIA
   * ============================================================
   */

  document
    .getElementById("suggestion-form")
    .addEventListener("submit", async function (event) {

      event.preventDefault();

      const user = await getCurrentUser();

      if (!user) {

        closeModal(suggestionModal);
        openSuggestionForm();

        return;
      }

      const name =
        document
          .getElementById("suggestion-name")
          .value
          .trim();

      const category =
        document
          .getElementById("suggestion-category-input")
          .value;

      const idea =
        suggestionText.value.trim();


      if (!name || !idea) {

        suggestionMessage.textContent =
          "Completa todos los campos.";

        return;
      }


      if (containsObsceneContent(name + " " + idea)) {

        suggestionMessage.textContent =
          "La sugerencia contiene contenido no permitido.";

        return;
      }


      suggestionMessage.textContent =
        "Enviando sugerencia...";


      const {
        error
      } = await supabaseClient
        .from("suggestions")
        .insert({

          user_id: user.id,
          name: name,
          category: category,
          idea: idea

        });


      if (error) {

        console.error(error);

        suggestionMessage.textContent =
          "No se pudo enviar la sugerencia.";

        return;
      }


      suggestionMessage.textContent =
        "¡Sugerencia enviada!";

      document
        .getElementById("suggestion-form")
        .reset();

      characterCount.textContent = "0";

      await loadSuggestions();


      setTimeout(function () {
        closeModal(suggestionModal);
      }, 700);

    });


  /*
   * ============================================================
   * CARGAR SUGERENCIAS
   * ============================================================
   */

  let currentTab = "all";


  async function loadSuggestions() {

    suggestionsList.innerHTML =
      '<div class="suggestions-loading">Cargando sugerencias...</div>';


    let query = supabaseClient
      .from("suggestions")
      .select(`
        id,
        user_id,
        name,
        category,
        idea,
        created_at,
        suggestion_votes (
          vote,
          user_id
        )
      `)
      .order("created_at", {
        ascending: false
      });


    if (currentTab === "mine") {

      const user = await getCurrentUser();

      if (!user) {

        suggestionsList.innerHTML =
          '<div class="no-suggestions">Inicia sesión para ver tus sugerencias.</div>';

        return;
      }

      query = query.eq(
        "user_id",
        user.id
      );
    }


    const {
      data,
      error
    } = await query;


    if (error) {

      console.error(error);

      suggestionsList.innerHTML =
        '<div class="no-suggestions">No se pudieron cargar las sugerencias.</div>';

      return;
    }


    renderSuggestions(data || []);
  }


  /*
   * ============================================================
   * RENDERIZAR SUGERENCIAS
   * ============================================================
   */

  function renderSuggestions(suggestions) {

    const search =
      document
        .getElementById("suggestion-search")
        .value
        .trim()
        .toLowerCase();

    const category =
      document
        .getElementById("suggestion-category")
        .value;


    const filtered =
      suggestions.filter(function (suggestion) {

        const matchesSearch =
          !search ||
          suggestion.name
            .toLowerCase()
            .includes(search) ||
          suggestion.idea
            .toLowerCase()
            .includes(search);

        const matchesCategory =
          category === "Todas" ||
          suggestion.category === category;

        return (
          matchesSearch &&
          matchesCategory
        );

      });


    if (!filtered.length) {

      suggestionsList.innerHTML =
        '<div class="no-suggestions">No hay sugerencias que coincidan.</div>';

      return;
    }


    suggestionsList.innerHTML = "";


    filtered.forEach(function (suggestion) {

      const card =
        document.createElement("article");

      card.className =
        "suggestion-card";


      const header =
        document.createElement("div");

      header.className =
        "suggestion-header";


      const authorBox =
        document.createElement("div");


      const author =
        document.createElement("div");

      author.className =
        "suggestion-author";

      author.textContent =
        suggestion.name;


      const date =
        document.createElement("div");

      date.className =
        "suggestion-date";

      date.textContent =
        formatDate(suggestion.created_at);


      const badge =
        document.createElement("span");

      badge.className =
        "suggestion-category-badge";

      badge.textContent =
        suggestion.category;


      authorBox.appendChild(author);
      authorBox.appendChild(date);
      authorBox.appendChild(badge);


      header.appendChild(authorBox);


      const text =
        document.createElement("p");

      text.className =
        "suggestion-text";

      text.textContent =
        suggestion.idea;


      const actions =
        document.createElement("div");

      actions.className =
        "suggestion-actions";


      let likes = 0;
      let dislikes = 0;
      let myVote = 0;


      (suggestion.suggestion_votes || [])
        .forEach(function (vote) {

          if (vote.vote === 1) {
            likes++;
          }

          if (vote.vote === -1) {
            dislikes++;
          }

        });


      const voteLike =
        document.createElement("button");

      voteLike.className =
        "vote-button";

      voteLike.type =
        "button";

      voteLike.textContent =
        "👍 " + likes;


      const voteDislike =
        document.createElement("button");

      voteDislike.className =
        "vote-button";

      voteDislike.type =
        "button";

      voteDislike.textContent =
        "👎 " + dislikes;


      const userPromise =
        getCurrentUser();


      voteLike.addEventListener(
        "click",
        async function () {

          const user =
            await getCurrentUser();

          if (!user) {

            authMessage.textContent =
              "Necesitas una cuenta para votar.";

            openModal(accountModal);

            return;
          }

          await voteSuggestion(
            suggestion.id,
            1
          );

        }
      );


      voteDislike.addEventListener(
        "click",
        async function () {

          const user =
            await getCurrentUser();

          if (!user) {

            authMessage.textContent =
              "Necesitas una cuenta para votar.";

            openModal(accountModal);

            return;
          }

          await voteSuggestion(
            suggestion.id,
            -1
          );

        }
      );


      actions.appendChild(voteLike);
      actions.appendChild(voteDislike);


      const currentUser =
        window.__tronkUser;


      if (
        currentUser &&
        currentUser.id === suggestion.user_id
      ) {

        const deleteButton =
          document.createElement("button");

        deleteButton.className =
          "delete-suggestion-button";

        deleteButton.type =
          "button";

        deleteButton.textContent =
          "🗑️ Borrar";

        deleteButton.addEventListener(
          "click",
          async function () {

            if (
              !confirm(
                "¿Quieres borrar esta sugerencia?"
              )
            ) {
              return;
            }

            await deleteSuggestion(
              suggestion.id
            );

          }
        );

        actions.appendChild(
          deleteButton
        );
      }


      card.appendChild(header);
      card.appendChild(text);
      card.appendChild(actions);

      suggestionsList.appendChild(card);

    });
  }


  /*
   * ============================================================
   * VOTOS
   * ============================================================
   */

  async function voteSuggestion(
    suggestionId,
    vote
  ) {

    const user =
      await getCurrentUser();

    if (!user) {
      return;
    }


    const {
      data: existing
    } = await supabaseClient
      .from("suggestion_votes")
      .select("id, vote")
      .eq(
        "suggestion_id",
        suggestionId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();


    if (existing) {

      if (existing.vote === vote) {

        await supabaseClient
          .from("suggestion_votes")
          .delete()
          .eq(
            "id",
            existing.id
          );

      } else {

        await supabaseClient
          .from("suggestion_votes")
          .update({
            vote: vote
          })
          .eq(
            "id",
            existing.id
          );
      }

    } else {

      await supabaseClient
        .from("suggestion_votes")
        .insert({

          suggestion_id:
            suggestionId,

          user_id:
            user.id,

          vote:
            vote

        });
    }


    await loadSuggestions();
  }


  /*
   * ============================================================
   * BORRAR SUGERENCIA
   * ============================================================
   */

  async function deleteSuggestion(id) {

    const {
      error
    } = await supabaseClient
      .from("suggestions")
      .delete()
      .eq("id", id);


    if (error) {

      console.error(error);

      alert(
        "No tienes permiso para borrar esta sugerencia."
      );

      return;
    }


    await loadSuggestions();
  }


  /*
   * ============================================================
   * TABS
   * ============================================================
   */

  document
    .querySelectorAll(".suggestion-tab")
    .forEach(function (tab) {

      tab.addEventListener(
        "click",
        async function () {

          document
            .querySelectorAll(".suggestion-tab")
            .forEach(function (other) {
              other.classList.remove("active");
            });

          tab.classList.add("active");

          currentTab =
            tab.dataset.tab;

          await loadSuggestions();

        }
      );

    });


  /*
   * ============================================================
   * BUSCAR / FILTRAR
   * ============================================================
   */

  document
    .getElementById("suggestion-search")
    .addEventListener(
      "input",
      loadSuggestions
    );

  document
    .getElementById("suggestion-category")
    .addEventListener(
      "change",
      loadSuggestions
    );


  /*
   * ============================================================
   * FECHA
   * ============================================================
   */

  function formatDate(dateString) {

    return new Date(dateString)
      .toLocaleDateString(
        "es-ES",
        {
          day: "numeric",
          month: "short",
          year: "numeric"
        }
      );
  }


  /*
   * ============================================================
   * AÑO
   * ============================================================
   */

  document.getElementById("year").textContent =
    new Date().getFullYear();


  /*
   * ============================================================
   * ANIMACIÓN
   * ============================================================
   */

  const sections =
    document.querySelectorAll(".section");

  sections.forEach(function (section) {
    section.classList.add("reveal");
  });


  if ("IntersectionObserver" in window) {

    const observer =
      new IntersectionObserver(
        function (entries) {

          entries.forEach(function (entry) {

            if (entry.isIntersecting) {

              entry.target.classList.add(
                "is-visible"
              );

              observer.unobserve(
                entry.target
              );
            }

          });

        },
        {
          threshold: 0.15
        }
      );


    sections.forEach(function (section) {
      observer.observe(section);
    });

  } else {

    sections.forEach(function (section) {
      section.classList.add("is-visible");
    });

  }


  /*
   * ============================================================
   * USUARIO GLOBAL PARA LA INTERFAZ
   * ============================================================
   */

  async function refreshGlobalUser() {

    window.__tronkUser =
      await getCurrentUser();

  }


  supabaseClient.auth.onAuthStateChange(
    async function () {

      await refreshGlobalUser();

      await loadSuggestions();

    }
  );


  /*
   * ============================================================
   * INICIO
   * ============================================================
   */

  (async function init() {

    await refreshGlobalUser();

    await updateAccountUI();

    await loadSuggestions();

  })();

})();
