"use strict";

/* TronkStudios · js/core.js
   Configuración de Supabase y referencias a los elementos de la página.
   Se carga como script clásico (ver docs/adr/0002). */

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

/* ---------- Cambiar / recuperar contraseña ---------- */

const forgotPanel =
  document.getElementById("forgot-panel");

const newPasswordPanel =
  document.getElementById("new-password-panel");

const forgotForm =
  document.getElementById("forgot-form");

const newPasswordForm =
  document.getElementById("new-password-form");

const newPasswordDescription =
  document.getElementById("new-password-description");

const showForgotButton =
  document.getElementById("show-forgot");

const forgotBackButton =
  document.getElementById("forgot-back");

const changePasswordButton =
  document.getElementById("change-password-button");

const newPasswordCancelButton =
  document.getElementById("new-password-cancel");

/*
  true cuando el usuario llega desde el enlace
  «cambiar contraseña» del correo. Se comprueba aquí,
  antes de que Supabase limpie la dirección.
*/
let recoveryModalShown = false;

let passwordRecoveryMode =
  /type=recovery/.test(
    window.location.hash +
      window.location.search
  );

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
