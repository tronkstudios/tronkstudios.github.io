"use strict";

/* TronkStudios · js/comments.js
   Comentarios en las sugerencias (tabla de docs/supabase/comentarios.sql).
   Cada tarjeta de sugerencia lleva un botón con el número de comentarios;
   al pulsarlo se abre una ficha con la idea, los comentarios y un
   cuadro para escribir. Se carga como script clásico (ver docs/adr/0002). */

const COMMENT_MAX = 500;

// true cuando existe la tabla de comentarios en Supabase
let commentsAvailable = false;

// Número de comentarios de cada idea (id en texto → número)
let commentCounts = new Map();

// Idea abierta en la ficha de comentarios
let openCommentsFor = null;

/* Se llama al cargar las sugerencias (js/suggestions.js) */
async function loadCommentCounts() {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("suggestion_comments")
      .select("suggestion_id")
      .limit(10000);

    if (error) {
      commentsAvailable = false;
      return;
    }

    commentsAvailable = true;
    commentCounts = new Map();

    (data || []).forEach((row) => {
      commentCounts.set(row.suggestion_id, (commentCounts.get(row.suggestion_id) || 0) + 1);
    });
  } catch {
    commentsAvailable = false;
  }
}

/* Botón «💬 N» de la tarjeta */
function createCommentsButton(suggestion) {
  if (!commentsAvailable) {
    return null;
  }

  const button = document.createElement("button");
  const count = commentCounts.get(String(suggestion.id)) || 0;

  button.type = "button";
  button.className = "comments-button";
  button.dataset.suggestion = String(suggestion.id);
  button.title = "Ver y escribir comentarios";
  setIconText(button, "message", String(count));
  button.setAttribute("aria-label", `${count} ${count === 1 ? "comentario" : "comentarios"}`);
  button.addEventListener("click", () => openSuggestionComments(suggestion));

  return button;
}

function commentElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

/* ---------- Ficha de comentarios ---------- */

async function openSuggestionComments(suggestion) {
  const modal = document.getElementById("comments-modal");
  const content = document.getElementById("comments-content");

  if (!modal || !content) {
    return;
  }

  openCommentsFor = suggestion;
  content.replaceChildren();

  // La idea, arriba
  const idea = commentElement("div", "comments-idea");
  const author = commentElement("div", "comments-idea-author");
  const profile = suggestionAuthors.get(suggestion.user_id);
  author.append(
    avatarImage(profile?.avatar, "suggestion-avatar"),
    commentElement("strong", "", suggestionAuthorName(suggestion))
  );

  const title = commentElement("h2", "comments-title", suggestion.idea || "");
  title.id = "comments-modal-title";
  idea.append(author, title);
  content.appendChild(idea);

  const list = commentElement("div", "comments-list");
  list.setAttribute("aria-live", "polite");
  list.appendChild(commentElement("p", "comments-empty", "Cargando comentarios..."));
  content.appendChild(list);

  content.appendChild(createCommentForm(suggestion, list));

  openModal(modal);
  await renderComments(suggestion, list);
}

async function renderComments(suggestion, list) {
  const { data, error } = await supabaseClient
    .from("suggestion_comments")
    .select("id, user_id, body, created_at")
    .eq("suggestion_id", String(suggestion.id))
    .order("created_at", { ascending: true })
    .limit(300);

  // Si mientras cargaba se ha abierto otra idea, no se pinta
  if (openCommentsFor !== suggestion) {
    return;
  }

  list.replaceChildren();

  if (error) {
    console.warn("No se pudieron cargar los comentarios:", error.message);
    list.appendChild(commentElement("p", "comments-empty", "No se pudieron cargar los comentarios."));
    return;
  }

  const comments = data || [];
  commentCounts.set(String(suggestion.id), comments.length);
  updateCommentButtons(suggestion);

  if (!comments.length) {
    list.appendChild(commentElement("p", "comments-empty", "Todavía no hay comentarios. ¡Sé el primero en opinar!"));
    return;
  }

  // Nombres y avatares de quien comenta
  const ids = [...new Set(comments.map((comment) => comment.user_id))];
  const missing = ids.filter((id) => !suggestionAuthors.has(id));

  if (missing.length) {
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("id, display_name, avatar")
      .in("id", missing);

    (profiles || []).forEach((p) => suggestionAuthors.set(p.id, p));
  }

  comments.forEach((comment) => list.appendChild(createComment(comment, suggestion, list)));
}

function createComment(comment, suggestion, list) {
  const item = commentElement("article", "comment");
  const profile = suggestionAuthors.get(comment.user_id);

  if (currentUser && comment.user_id === currentUser.id) {
    item.classList.add("is-mine");
  }

  const head = commentElement("div", "comment-head");
  const author = commentElement("button", "comment-author profile-link");
  author.type = "button";
  author.title = "Ver perfil";
  author.append(
    avatarImage(profile?.avatar, "comment-avatar"),
    commentElement("span", "", profile?.display_name || "Tronker")
  );
  author.addEventListener("click", () => openProfile(comment.user_id));

  const when = commentElement("time", "comment-time", timeAgo(comment.created_at));
  when.dateTime = comment.created_at;
  head.append(author, when);

  const canDelete =
    currentUser &&
    (comment.user_id === currentUser.id || (typeof isTeamMember !== "undefined" && isTeamMember));

  if (canDelete) {
    const remove = commentElement("button", "comment-delete");
    remove.type = "button";
    remove.title = "Borrar comentario";
    remove.setAttribute("aria-label", "Borrar comentario");
    remove.appendChild(makeIcon("trash"));
    remove.addEventListener("click", async () => {
      if (!window.confirm("¿Borrar este comentario?")) {
        return;
      }

      remove.disabled = true;
      const { error } = await supabaseClient.from("suggestion_comments").delete().eq("id", comment.id);

      if (error) {
        remove.disabled = false;
        console.warn("No se pudo borrar el comentario:", error.message);
        return;
      }

      renderComments(suggestion, list);
    });
    head.appendChild(remove);
  }

  item.append(head, commentElement("p", "comment-body", comment.body));
  return item;
}

function createCommentForm(suggestion, list) {
  if (!currentUser) {
    const box = commentElement("div", "comments-login");
    box.appendChild(commentElement("p", "", "Inicia sesión para dejar tu opinión."));
    const button = commentElement("button", "primary-button", "Iniciar sesión");
    button.type = "button";
    button.addEventListener("click", () =>
      openAccountForCommunity("Inicia sesión para comentar las ideas de la comunidad.")
    );
    box.appendChild(button);
    return box;
  }

  const form = commentElement("form", "comments-form");
  const text = commentElement("textarea", "comments-input");
  text.id = "comment-text";
  text.maxLength = COMMENT_MAX;
  text.rows = 2;
  text.placeholder = "Escribe tu opinión...";
  text.setAttribute("aria-label", "Tu comentario");

  const footer = commentElement("div", "comments-form-footer");
  const counter = commentElement("span", "comments-counter", `0/${COMMENT_MAX}`);
  const message = commentElement("span", "comments-message");
  const send = commentElement("button", "primary-button");
  send.type = "submit";
  setIconText(send, "message", "Comentar");
  footer.append(counter, message, send);

  text.addEventListener("input", () => {
    counter.textContent = `${text.value.length}/${COMMENT_MAX}`;
  });

  // Enter envía; Mayús + Enter hace salto de línea
  text.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const body = text.value.trim();

    if (!body) {
      return;
    }

    send.disabled = true;
    message.textContent = "";

    const { error } = await supabaseClient
      .from("suggestion_comments")
      .insert({ suggestion_id: String(suggestion.id), body });

    send.disabled = false;

    if (error) {
      console.warn("No se pudo enviar el comentario:", error.message);
      message.textContent = /segundos/.test(error.message)
        ? "Espera unos segundos antes de volver a comentar."
        : "No se pudo enviar. Inténtalo de nuevo.";
      return;
    }

    text.value = "";
    counter.textContent = `0/${COMMENT_MAX}`;
    await renderComments(suggestion, list);
    list.lastElementChild?.scrollIntoView({ block: "nearest" });
  });

  form.append(text, footer);
  return form;
}

/* Actualiza el número en los botones de esa idea (página y «Mostrar más») */
function updateCommentButtons(suggestion) {
  const count = commentCounts.get(String(suggestion.id)) || 0;

  document.querySelectorAll(".comments-button").forEach((button) => {
    if (button.dataset.suggestion === String(suggestion.id)) {
      setIconText(button, "message", String(count));
      button.setAttribute("aria-label", `${count} ${count === 1 ? "comentario" : "comentarios"}`);
    }
  });
}

/* Escape cierra solo la ficha de comentarios (y no la lista de detrás) */
window.addEventListener(
  "keydown",
  (event) => {
    const modal = document.getElementById("comments-modal");

    if (event.key === "Escape" && modal && !modal.classList.contains("hidden")) {
      event.stopPropagation();
      closeModal(modal);
    }
  },
  true
);
