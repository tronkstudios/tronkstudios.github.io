"use strict";

/* TronkStudios · js/suggestions.js
   Sugerencias de la comunidad: cargar, votar, buscar y filtrar.
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   SUGERENCIAS
   ========================================================= */

function openSuggestionModal() {
  // Sin cuenta no se puede enviar: se abre directamente «Cuenta»
  if (isSupabaseConfigured() && !currentUser) {
    openAccountForCommunity(
      "Inicia sesión o crea una cuenta para proponer ideas."
    );
    return;
  }

  showSuggestionMessage("");

  if (suggestionForm) {
    suggestionForm.reset();
  }

  // Con perfil, se firma con el nombre de la cuenta (no hace falta escribirlo)
  const useProfileName =
    platformAvailable && Boolean(currentUser);

  if (suggestionName) {
    suggestionName.hidden = useProfileName;
    suggestionName.required = !useProfileName;
    suggestionName.labels?.forEach((label) => {
      label.hidden = useProfileName;
    });
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

/* Abre la ventana de cuenta con un aviso (para votar o proponer). */
function openAccountForCommunity(message, register = false) {
  if (register) {
    showRegisterPanel();
  } else {
    showLoginPanel();
  }

  openModal(accountModal);
  showAuthMessage(message, register ? "" : "error");
}

document
  .getElementById("community-register")
  ?.addEventListener("click", () => {
    openAccountForCommunity(
      "Crea tu cuenta para proponer ideas y votar.",
      true
    );
  });

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
        ${navigator.onLine
          ? "Configura Supabase para mostrar las sugerencias."
          : "Sin conexión. Las sugerencias volverán cuando tengas internet."}
      </div>
    `;

    return;
  }

  suggestionsList.innerHTML = `
    <div class="suggestions-loading">
      Cargando sugerencias...
    </div>
  `;

  setShowMoreButton(
    document.getElementById("suggestions-more"),
    0
  );

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

    await Promise.all([
      loadMyVotes(),
      loadSuggestionAuthors(data || []),
      loadCommentCounts()
    ]);

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
   AUTORES (foto y nombre de su perfil, js/profiles.js)
   ========================================================= */

// id de usuario → { display_name, avatar }
let suggestionAuthors = new Map();

async function loadSuggestionAuthors(suggestions) {
  const ids = [
    ...new Set(
      suggestions
        .map((suggestion) => suggestion.user_id)
        .filter(Boolean)
    )
  ];

  // No espera a platformAvailable (se comprueba a la vez al arrancar):
  // si no existe la tabla de perfiles, se queda el nombre escrito
  if (!ids.length) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, display_name, avatar")
      .in("id", ids);

    if (error) {
      console.warn("No se pudieron cargar los autores:", error.message);
      return;
    }

    suggestionAuthors = new Map(
      (data || []).map((profile) => [profile.id, profile])
    );
  } catch (error) {
    console.error(error);
  }
}

/* Nombre que se muestra: el del perfil; si no hay, el que escribió */
function suggestionAuthorName(suggestion) {
  return (
    suggestionAuthors.get(suggestion.user_id)?.display_name ||
    suggestion.name ||
    "Usuario"
  );
}

/* Nombre del perfil de quien envía (para la columna name) */
async function myDisplayName(user) {
  try {
    const { data } = await supabaseClient
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (data?.display_name) {
      return data.display_name;
    }
  } catch (error) {
    console.error(error);
  }

  return (
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Usuario"
  ).slice(0, 30);
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

  updateCommunityHeader();

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

  // Filtro por estado (js/community.js)
  const status =
    document.getElementById("suggestion-status")?.value ||
    "all";

  if (status !== "all") {
    filtered = filtered.filter(
      (suggestion) => (suggestion.status || "pending") === status
    );
  }

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
            `${suggestionAuthorName(suggestion)} ${
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

  if (document.getElementById("suggestion-sort")?.value === "votes") {
    filtered.sort(
      (a, b) => (b.votes || 0) - (a.votes || 0)
    );
  }

  const more =
    document.getElementById("suggestions-more");

  setShowMoreButton(more, 0);

  if (
    filtered.length === 0
  ) {
    suggestionsList.innerHTML = `
      <div class="suggestions-loading">
        No hay sugerencias para mostrar.
      </div>
    `;

    refillListModal("suggestions", fullSuggestionsFill([]));
    return;
  }

  suggestionsList.innerHTML =
    "";

  // En la página se ven unas pocas; todas, en «Mostrar más»
  filtered
    .slice(0, SUGGESTIONS_PREVIEW)
    .forEach(
      (suggestion) => {
        suggestionsList.appendChild(
          createSuggestionCard(
            suggestion
          )
        );
      }
    );

  setShowMoreButton(
    more,
    filtered.length - SUGGESTIONS_PREVIEW,
    "Mostrar más"
  );

  if (more) {
    more.onclick = () =>
      openListModal(
        "suggestions",
        "Todas las sugerencias",
        `${filtered.length} sugerencias`,
        fullSuggestionsFill(filtered)
      );
  }

  // Si la tarjeta está abierta (p. ej. tras votar), se actualiza
  refillListModal("suggestions", fullSuggestionsFill(filtered));
}

const SUGGESTIONS_PREVIEW = 4;

function fullSuggestionsFill(suggestions) {
  return (content) => {
    if (!suggestions.length) {
      const empty = document.createElement("div");
      empty.className = "suggestions-loading";
      empty.textContent = "No hay sugerencias para mostrar.";
      content.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "suggestions-list";
    suggestions.forEach((suggestion) => list.appendChild(createSuggestionCard(suggestion)));
    content.appendChild(list);
  };
}

/* =========================================================
   RESUMEN Y AVISO DE CUENTA
   ========================================================= */

function updateCommunityHeader() {
  const summary =
    document.getElementById("suggestions-summary");
  const hint =
    document.getElementById("community-hint");

  if (summary) {
    const ideas = allSuggestions.length;
    const votes = allSuggestions.reduce(
      (total, suggestion) => total + (suggestion.votes || 0),
      0
    );

    summary.replaceChildren();

    if (ideas) {
      summary.append(
        makeIcon("bulb"),
        ` ${ideas} ${ideas === 1 ? "idea" : "ideas"} · `,
        makeIcon("thumb"),
        ` ${votes} ${votes === 1 ? "voto" : "votos"}`
      );
    }
  }

  if (hint) {
    hint.hidden = !isSupabaseConfigured() || Boolean(currentUser);
  }
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

  // Con cuenta, el nombre es un botón que abre su perfil (js/profiles.js)
  const author =
    document.createElement(
      suggestion.user_id && (platformAvailable || suggestionAuthors.has(suggestion.user_id)) ? "button" : "strong"
    );

  author.className =
    "suggestion-author";

  if (author.tagName === "BUTTON") {
    author.type = "button";
    author.classList.add("profile-link");
    author.title = "Ver perfil";
    author.addEventListener("click", () => openProfile(suggestion.user_id));
  }

  const profile =
    suggestionAuthors.get(suggestion.user_id);

  const authorName =
    document.createElement("span");

  authorName.textContent =
    suggestionAuthorName(suggestion);

  author.append(
    avatarImage(profile?.avatar, "suggestion-avatar"),
    authorName
  );

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

  setIconText(voteButton, "thumb", String(suggestion.votes || 0));

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

  // Comentarios (js/comments.js)
  const commentsButton =
    createCommentsButton(suggestion);

  if (commentsButton) {
    actions.appendChild(
      commentsButton
    );
  }

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

  // Estado de la idea y respuesta del equipo (js/community.js)
  const tags = document.createElement("div");
  tags.className = "suggestion-tags";
  tags.appendChild(category);

  const statusBadge =
    communityAvailable && suggestion.status
      ? createStatusBadge(suggestion.status)
      : null;

  if (statusBadge) {
    tags.appendChild(statusBadge);
  }

  article.appendChild(
    tags
  );

  article.appendChild(
    text
  );

  if (communityAvailable && suggestion.team_reply) {
    article.appendChild(createTeamReply(suggestion.team_reply));
  }

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
    currentLocale(),
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
        suggestionName && !suggestionName.hidden
          ? suggestionName.value.trim()
          : await myDisplayName(user);

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

        window.TronkUISound?.play("success");
        window.dispatchEvent(new Event("tronk:activity"));

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
    openAccountForCommunity(
      "Inicia sesión para votar las sugerencias."
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
      window.TronkUISound?.play("success");
    }

    await loadSuggestions();
    window.dispatchEvent(new Event("tronk:activity"));
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

/* =========================================================
   ORDENAR
   ========================================================= */

const suggestionSort =
  document.getElementById("suggestion-sort");

if (suggestionSort) {
  suggestionSort.addEventListener(
    "change",
    () => {
      renderSuggestions(
        allSuggestions
      );
    }
  );
}

/* =========================================================
   FILTRO POR ESTADO
   ========================================================= */

document
  .getElementById("suggestion-status")
  ?.addEventListener("change", () => {
    renderSuggestions(allSuggestions);
  });
