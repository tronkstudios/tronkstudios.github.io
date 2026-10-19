"use strict";

/* TronkStudios · js/ui.js
   Modales generales, cliente Supabase y mensajes al usuario.
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   MODALES GENERALES
   ========================================================= */

// La última ventana abierta va siempre delante (p. ej. «Inicia sesión»
// encima de la ficha de un juego)
let modalLayer = 1000;

function openModal(modal) {
  if (!modal) {
    return;
  }

  if (!document.querySelector(".modal:not(.hidden)")) {
    modalLayer = 1000;
  }

  modalLayer += 1;
  modal.style.zIndex = String(modalLayer);
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
  modal.style.zIndex = "";

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  if (!document.querySelector(".modal:not(.hidden)")) {
    document.body.classList.remove(
      "modal-open"
    );
  }
}

/* =========================================================
   LISTA COMPLETA EN UNA TARJETA
   «Mostrar más» de la clasificación y de las sugerencias: en la página
   se ven solo unas pocas y aquí salen todas.
   ========================================================= */

function openListModal(kind, title, subtitle, fill) {
  const modal = document.getElementById("list-modal");
  const content = document.getElementById("list-modal-content");

  if (!modal || !content) {
    return;
  }

  document.getElementById("list-modal-title").textContent = title;
  document.getElementById("list-modal-subtitle").textContent = subtitle || "";

  modal.dataset.kind = kind;

  // Se guarda para volver a pintarla si cambian los datos (p. ej. al votar)
  modal.refill = fill;
  content.replaceChildren();
  fill(content);
  content.scrollTop = 0;
  openModal(modal);
}

function refillListModal(kind, fill) {
  const modal = document.getElementById("list-modal");

  if (!modal || modal.classList.contains("hidden") || modal.dataset.kind !== kind) {
    return;
  }

  if (fill) {
    modal.refill = fill;
  }

  const content = document.getElementById("list-modal-content");
  const scroll = content.scrollTop;
  content.replaceChildren();
  modal.refill(content);
  content.scrollTop = scroll;
}

/* Botón «Mostrar más (N)» debajo de una lista */
function setShowMoreButton(button, hiddenCount, label) {
  if (!button) {
    return;
  }

  button.hidden = hiddenCount <= 0;

  if (hiddenCount > 0) {
    button.replaceChildren(
      document.createTextNode(label),
      Object.assign(document.createElement("span"), {
        className: "show-more-count",
        textContent: `+${hiddenCount}`
      })
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
        <span class="verification-icon"><svg class="icon" aria-hidden="true"><use href="#i-mail"></use></svg></span>
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
