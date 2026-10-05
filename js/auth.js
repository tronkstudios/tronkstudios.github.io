"use strict";

/* TronkStudios · js/auth.js
   Cuentas: login, registro, contraseña y sesión.
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   PANELES DE CUENTA
   ========================================================= */

function hidePasswordPanels() {
  forgotPanel?.classList.add("hidden");
  newPasswordPanel?.classList.add("hidden");
}

function hideAllAccountPanels() {
  loginPanel?.classList.add("hidden");
  registerPanel?.classList.add("hidden");
  loggedPanel?.classList.add("hidden");
  hidePasswordPanels();
}

function showForgotPanel() {
  hideAllAccountPanels();
  forgotPanel?.classList.remove("hidden");
}

function showNewPasswordPanel(fromEmailLink) {
  hideAllAccountPanels();

  if (newPasswordDescription) {
    newPasswordDescription.textContent =
      fromEmailLink
        ? "Ya casi está: elige tu nueva contraseña."
        : "Escribe la contraseña nueva que quieres usar.";
  }

  newPasswordForm?.reset();
  newPasswordPanel?.classList.remove("hidden");
}

function showLoginPanel() {
  hidePasswordPanels();

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
  hidePasswordPanels();

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
  hidePasswordPanels();

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

  // Viene del enlace del correo: primero tiene que elegir contraseña
  if (passwordRecoveryMode && currentUser) {
    showNewPasswordPanel(true);
    return;
  }

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
                // Al confirmar el correo, vuelve a esta misma página
                // (antes Supabase mandaba a una dirección que daba 404).
                emailRedirectTo:
                  window.location.origin +
                  window.location.pathname,
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
   CAMBIAR / RECUPERAR CONTRASEÑA
   ========================================================= */

// Traduce los errores de Supabase más habituales
function passwordErrorText(error) {
  const text =
    (error && error.message) || "";

  if (/rate limit|security purposes|seconds/i.test(text)) {
    return "Has pedido demasiados enlaces seguidos. Espera un minuto y vuelve a intentarlo.";
  }

  if (/different from the old/i.test(text)) {
    return "La contraseña nueva tiene que ser distinta de la anterior.";
  }

  if (/at least 6|should be at least/i.test(text)) {
    return "La contraseña necesita al menos 6 caracteres.";
  }

  if (/session|not authenticated|jwt/i.test(text)) {
    return "El enlace ha caducado. Pide uno nuevo desde «¿Olvidaste tu contraseña?».";
  }

  return text || "Ha ocurrido un error. Inténtalo de nuevo.";
}

function passwordRedirectUrl() {
  return (
    window.location.origin +
    window.location.pathname
  );
}

// Abre la ventana de Cuenta en el panel de contraseña.
// Si hay sesión: cambiarla. Si no: pedir el enlace por correo.
async function openPasswordHelp() {
  showAuthMessage("");

  await updateAccountUI();

  if (currentUser) {
    showNewPasswordPanel(false);
  } else {
    showForgotPanel();

    const forgotEmail =
      document.getElementById("forgot-email");

    const loginEmail =
      document.getElementById("login-email");

    if (
      forgotEmail &&
      !forgotEmail.value &&
      loginEmail?.value
    ) {
      forgotEmail.value =
        loginEmail.value.trim();
    }
  }

  openModal(accountModal);
}

// Para que el soporte (Tronker) pueda abrirlo
window.TronkAccount = {
  openPasswordHelp
};

if (showForgotButton) {
  showForgotButton.addEventListener(
    "click",
    () => {
      showAuthMessage("");
      openPasswordHelp();
    }
  );
}

if (forgotBackButton) {
  forgotBackButton.addEventListener(
    "click",
    () => {
      showAuthMessage("");
      showLoginPanel();
    }
  );
}

if (changePasswordButton) {
  changePasswordButton.addEventListener(
    "click",
    () => {
      showAuthMessage("");
      showNewPasswordPanel(false);
    }
  );
}

if (newPasswordCancelButton) {
  newPasswordCancelButton.addEventListener(
    "click",
    async () => {
      passwordRecoveryMode = false;
      showAuthMessage("");
      await updateAccountUI();
    }
  );
}

// Paso 1: pedir el enlace por correo
if (forgotForm) {
  forgotForm.addEventListener(
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

      const email =
        document
          .getElementById("forgot-email")
          ?.value.trim() || "";

      if (!email) {
        showAuthMessage(
          "Escribe el correo de tu cuenta.",
          "error"
        );

        return;
      }

      const submitButton =
        forgotForm.querySelector(
          'button[type="submit"]'
        );

      if (submitButton) {
        submitButton.disabled = true;
      }

      showAuthMessage(
        "Enviando enlace..."
      );

      try {
        const { error } =
          await supabaseClient.auth.resetPasswordForEmail(
            email,
            {
              redirectTo:
                passwordRedirectUrl()
            }
          );

        if (error) {
          showAuthMessage(
            passwordErrorText(error),
            "error"
          );

          return;
        }

        // Mismo mensaje exista o no la cuenta (así nadie
        // puede averiguar qué correos están registrados)
        showAuthMessage(
          "Si hay una cuenta con ese correo, te llegará un enlace en unos minutos. Mira también en Spam.",
          "success"
        );
      } catch (error) {
        console.error(error);

        showAuthMessage(
          "No se ha podido enviar el enlace. Inténtalo de nuevo.",
          "error"
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
        }
      }
    }
  );
}

// Paso 2: guardar la contraseña nueva
if (newPasswordForm) {
  newPasswordForm.addEventListener(
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

      const password =
        document.getElementById("new-password")
          ?.value || "";

      const repeat =
        document.getElementById("new-password-repeat")
          ?.value || "";

      if (password.length < 6) {
        showAuthMessage(
          "La contraseña necesita al menos 6 caracteres.",
          "error"
        );

        return;
      }

      if (password !== repeat) {
        showAuthMessage(
          "Las dos contraseñas no coinciden.",
          "error"
        );

        return;
      }

      const submitButton =
        newPasswordForm.querySelector(
          'button[type="submit"]'
        );

      if (submitButton) {
        submitButton.disabled = true;
      }

      showAuthMessage(
        "Guardando contraseña..."
      );

      try {
        const { error } =
          await supabaseClient.auth.updateUser({
            password
          });

        if (error) {
          showAuthMessage(
            passwordErrorText(error),
            "error"
          );

          return;
        }

        passwordRecoveryMode = false;
        newPasswordForm.reset();

        // Quita el rastro del enlace de la dirección
        if (window.location.hash || window.location.search) {
          history.replaceState(
            null,
            "",
            window.location.pathname
          );
        }

        await updateAccountUI();

        showAuthMessage(
          "Contraseña cambiada correctamente.",
          "success"
        );
      } catch (error) {
        console.error(error);

        showAuthMessage(
          "No se ha podido cambiar la contraseña. Inténtalo de nuevo.",
          "error"
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
        }
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

      if (event === "PASSWORD_RECOVERY") {
        passwordRecoveryMode = true;
      }

      await updateAccountUI();

      // Abre la ventana una sola vez al volver del enlace
      if (
        passwordRecoveryMode &&
        currentUser &&
        !recoveryModalShown
      ) {
        recoveryModalShown = true;
        showAuthMessage("");
        openModal(accountModal);
      }

      if (
        typeof renderSuggestions ===
        "function"
      ) {
        // Al entrar o salir, se actualiza qué sugerencias has votado
        if (event !== "TOKEN_REFRESHED") {
          await loadMyVotes();
        }

        renderSuggestions(
          allSuggestions
        );
      }
    }
  );
}
