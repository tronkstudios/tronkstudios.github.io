"use strict";

/* TronkStudios · js/suggestions.js
   Sugerencias de la comunidad: cargar, votar, buscar y filtrar.
   Se carga como script clásico (ver docs/adr/0002). */

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

// Sugerencias que el usuario ya ha votado (ids en texto)
let myVotedSuggestions = new Set();
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

    await loadMyVotes();

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
   MIS VOTOS (para marcar las sugerencias ya votadas)
   ========================================================= */

async function loadMyVotes() {
  myVotedSuggestions = new Set();

  if (!isSupabaseConfigured() || !currentUser) {
    return;
  }

  try {
    const { data, error } =
      await supabaseClient
        .from("suggestion_votes")
        .select("suggestion_id");

    if (error) {
      // Si la tabla aún no existe, simplemente no se marcan
      console.warn("No se pudieron cargar tus votos:", error.message);
      return;
    }

    (data || []).forEach((row) => {
      myVotedSuggestions.add(String(row.suggestion_id));
    });
  } catch (error) {
    console.error(error);
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

  const alreadyVoted =
    myVotedSuggestions.has(
      String(suggestion.id)
    );

  if (alreadyVoted) {
    voteButton.classList.add("voted");
    voteButton.setAttribute("aria-pressed", "true");
    voteButton.title = "Quitar tu voto";
  } else {
    voteButton.setAttribute("aria-pressed", "false");
    voteButton.title = "Votar esta sugerencia";
  }

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
              idea
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
   VOTAR / QUITAR VOTO
   ========================================================= */

// El voto se suma y se resta en el servidor (funciones
// vote_suggestion y unvote_suggestion de Supabase, ver
// docs/supabase/votos.sql): un voto por persona y nadie puede
// inventarse votos. Si ya has votado, al pulsar se quita el voto.
async function voteSuggestion(
  suggestion,
  button
) {
  if (!isSupabaseConfigured()) {
    return;
  }

  // Para votar hay que iniciar sesión
  if (!currentUser) {
    await updateAccountUI();
    openModal(accountModal);
    showAuthMessage(
      "Inicia sesión para votar las sugerencias.",
      "error"
    );
    return;
  }

  const id = String(suggestion.id);
  const alreadyVoted = myVotedSuggestions.has(id);

  if (button) {
    button.disabled = true;
  }

  try {
    const { error } =
      await supabaseClient.rpc(
        alreadyVoted
          ? "unvote_suggestion"
          : "vote_suggestion",
        {
          p_suggestion_id: id
        }
      );

    if (error) {
      console.error(
        alreadyVoted ? "Error quitando el voto:" : "Error votando:",
        error
      );
      flashVoteButton(
        button,
        alreadyVoted ? "No se pudo quitar" : "No se pudo votar"
      );
      return;
    }

    if (alreadyVoted) {
      myVotedSuggestions.delete(id);
    } else {
      myVotedSuggestions.add(id);
    }

    await loadSuggestions();
  } catch (error) {
    console.error(error);
    flashVoteButton(
      button,
      alreadyVoted ? "No se pudo quitar" : "No se pudo votar"
    );
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

// Cambia el texto del botón un momento y lo devuelve a su estado
function flashVoteButton(button, text) {
  if (!button) {
    return;
  }

  const original = button.textContent;
  button.textContent = text;

  setTimeout(() => {
    if (button.isConnected) {
      button.textContent = original;
    }
  }, 1500);
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
