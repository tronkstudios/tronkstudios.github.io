"use strict";

/* TronkStudios · js/push.js
   Activar las notificaciones push en este dispositivo (panel de la
   campanita). Se guarda la suscripción en Supabase
   (docs/supabase/push.sql) y el Worker envía los avisos (index.js).
   En el iPhone solo funciona con la app instalada (iOS 16.4 o más).
   Se carga como script clásico (ver docs/adr/0002). */

const TronkPush = (() => {
  let publicKey = null;

  const supported = () =>
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  function keyBytes(base64) {
    const padded = base64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64.length % 4)) % 4);
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  }

  async function loadKey() {
    if (publicKey !== null) {
      return publicKey;
    }

    try {
      const response = await fetch(`${WORKER_URL}/push-key`);
      const data = await response.json();
      publicKey = data.key || "";
    } catch {
      publicKey = "";
    }

    return publicKey;
  }

  async function currentSubscription() {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  }

  function elements() {
    return {
      box: document.getElementById("push-setting"),
      text: document.getElementById("push-setting-text"),
      button: document.getElementById("push-setting-button")
    };
  }

  function paint(state) {
    const { box, text, button } = elements();

    if (!box) {
      return;
    }

    box.hidden = state === "hidden";
    button.hidden = state === "ios" || state === "blocked";
    button.disabled = false;

    if (state === "on") {
      text.textContent = "Avisos activados en este dispositivo.";
      button.textContent = "Desactivar";
    } else if (state === "off") {
      text.textContent = "Recibe los avisos en este dispositivo, aunque tengas la web cerrada.";
      button.textContent = "Activar";
    } else if (state === "blocked") {
      text.textContent = "Has bloqueado las notificaciones. Actívalas en los ajustes del navegador para esta web.";
    } else if (state === "ios") {
      text.textContent = "En el iPhone, instala la app (Compartir → Añadir a pantalla de inicio) para recibir avisos.";
    }

    box.dataset.state = state;
  }

  async function refresh() {
    if (!currentUser) {
      paint("hidden");
      return;
    }

    if (!supported()) {
      paint(isIos() && !isStandalone() ? "ios" : "hidden");
      return;
    }

    if (!(await loadKey())) {
      paint("hidden");
      return;
    }

    if (Notification.permission === "denied") {
      paint("blocked");
      return;
    }

    try {
      paint((await currentSubscription()) ? "on" : "off");
    } catch {
      paint("hidden");
    }
  }

  async function enable() {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      paint(permission === "denied" ? "blocked" : "off");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));

    const data = subscription.toJSON();
    const { error } = await supabaseClient
      .from("push_subscriptions")
      .insert({ endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth });

    if (error) {
      console.warn("No se pudieron activar los avisos:", error.message);
      await subscription.unsubscribe().catch(() => {});
      paint("off");
      showTronkToast("bell-off", "No se pudieron activar los avisos. Inténtalo de nuevo.");
      return;
    }

    paint("on");
    showTronkToast("bell", "¡Listo! Te avisaremos en este dispositivo.");
  }

  async function disable() {
    const subscription = await currentSubscription();

    if (subscription) {
      await supabaseClient.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
      await subscription.unsubscribe().catch(() => {});
    }

    paint("off");
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest?.("#push-setting-button");

    if (!button) {
      return;
    }

    event.stopPropagation();
    button.disabled = true;

    try {
      if (elements().box.dataset.state === "on") {
        await disable();
      } else {
        await enable();
      }
    } catch (error) {
      console.warn("Notificaciones push:", error);
      button.disabled = false;
    }
  });

  return { refresh };
})();

window.TronkPush = TronkPush;
