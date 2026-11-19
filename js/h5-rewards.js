const adErrors = {
  offline: "Sin conexión. Vuelve a intentarlo al conectarte.",
  blocked:
    "No se pudo cargar el servicio de anuncios. Puede estar bloqueado en el navegador.",
  initTimeout:
    "El servicio no se ha activado. Puede que la cuenta o el sitio aún estén en revisión.",
  notReady:
    "El anuncio aún no está listo. Puedes volver a intentarlo en unos segundos.",
  timeout: "El servicio de anuncios tardó demasiado.",
  frequencyCapped:
    "Ya se han mostrado varios anuncios. Vuelve a intentarlo más tarde.",
  noAdPreloaded: "Ahora mismo no hay ningún anuncio disponible.",
  error: "No se ha podido mostrar un anuncio ahora.",
};

export function adMessage(reason) {
  return adErrors[reason] || adErrors.error;
}

function confirmReward(reward, accept, cancel) {
  const dialog = document.createElement("dialog");
  dialog.className = "tronk-ad-offer";
  dialog.setAttribute("aria-label", "Anuncio con recompensa");
  const title = document.createElement("h2");
  const english = document.documentElement.lang === "en";
  title.textContent = english ? "Ad available" : "Anuncio disponible";
  const detail = document.createElement("p");
  detail.textContent = reward;
  const buttons = document.createElement("div");
  const watch = document.createElement("button");
  watch.type = "button";
  watch.className = "tronk-ad-watch";
  watch.textContent = english ? "Watch video" : "Ver vídeo";
  const back = document.createElement("button");
  back.type = "button";
  back.textContent = english ? "Not now" : "Ahora no";
  function hide() {
    if (dialog.open) dialog.close();
    dialog.remove();
  }
  watch.onclick = () => {
    hide();
    accept();
  };
  back.onclick = cancel;
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    cancel();
  });
  buttons.append(watch, back);
  dialog.append(title, detail, buttons);
  document.body.append(dialog);
  dialog.showModal();
  return hide;
}

export function createAdSenseProvider(client) {
  if (!/^ca-pub-\d{16}$/.test(client || "")) return null;
  let ready;
  function push(options) {
    (window.adsbygoogle ||= []).push(options);
  }

  function load() {
    ready ||= new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      tag.async = true;
      tag.crossOrigin = "anonymous";
      const config = { preloadAdBreaks: "on", onReady: resolve };
      const queue = (window.adsbygoogle ||= []);
      tag.onerror = () => {
        tag.remove();
        if (Array.isArray(queue)) {
          const index = queue.indexOf(config);
          if (index !== -1) queue.splice(index, 1);
        }
        reject("blocked");
      };
      push(config);
      document.head.append(tag);
    }).catch((reason) => {
      ready = undefined;
      throw reason;
    });
    let timer;
    return Promise.race([
      ready,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject("initTimeout"), 10000);
      }),
    ]).finally(() => clearTimeout(timer));
  }

  return {
    async showRewardedAd({
      placementName,
      canShow = () => true,
      reward,
      onShow,
      onReward,
      onCancel,
      onError,
    }) {
      if (navigator.onLine === false) return onError("offline");
      try {
        await load();
      } catch (reason) {
        return onError(reason);
      }
      if (!canShow() || document.hidden) return onCancel();

      let shown = false,
        viewed = false,
        dismissed = false,
        finished = false;
      let timer, hideOffer;
      function settle(callback, reason) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        hideOffer?.();
        callback(reason);
      }
      function wait(milliseconds, callback, reason) {
        clearTimeout(timer);
        timer = setTimeout(() => settle(callback, reason), milliseconds);
      }
      wait(10000, onError, "timeout");
      try {
        push({
          type: "reward",
          name: placementName,
          beforeReward(showAd) {
            if (finished || shown || hideOffer) return;
            if (!canShow() || document.hidden) return settle(onCancel);
            wait(30000, onCancel);
            hideOffer = confirmReward(
              reward,
              () => {
                if (finished || shown) return;
                if (!canShow() || document.hidden) return settle(onCancel);
                shown = true;
                wait(10000, onError, "timeout");
                try {
                  showAd();
                } catch {
                  settle(onError, "error");
                }
              },
              () => settle(onCancel),
            );
          },
          beforeAd() {
            wait(180000, onError, "timeout");
            onShow?.();
          },
          afterAd() {
            if (!finished) wait(250, viewed ? onReward : onCancel);
          },
          adViewed() {
            if (shown) viewed = true;
          },
          adDismissed() {
            dismissed = true;
          },
          adBreakDone({ breakStatus } = {}) {
            if (viewed && shown) settle(onReward);
            else if (dismissed || breakStatus === "dismissed") settle(onCancel);
            else settle(onError, breakStatus);
          },
        });
      } catch {
        settle(onError, "error");
      }
    },
  };
}
