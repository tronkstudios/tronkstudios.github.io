"use strict";

/* TronkStudios · js/ui.js
   Modales generales, cliente Supabase y mensajes al usuario.
   Se carga como script clásico (ver docs/adr/0002). */

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

  const projectModal =
    document.getElementById("project-modal");

  const projectClosed =
    !projectModal ||
    projectModal.classList.contains("hidden");

  if (
    accountClosed &&
    suggestionsClosed &&
    projectClosed
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
