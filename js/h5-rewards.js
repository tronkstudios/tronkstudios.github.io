const adErrors = {
  offline: "Sin conexión. Vuelve a intentarlo al conectarte.",
  blocked:
    "No se pudo cargar el servicio de anuncios. Puede estar bloqueado en el navegador.",
  initTimeout:
    "El servicio de anuncios no respondió a tiempo. Vuelve a intentarlo.",
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

export function createAdSenseProvider(client) {
  if (!/^ca-pub-\d{16}$/.test(client || "")) return null;
  let loading;
  let sdkLoaded = false;
  let prepared = false;
  let busy = false;
  function push(options) {
    (window.adsbygoogle ||= []).push(options);
  }

  function load() {
    if (navigator.onLine === false) return Promise.reject("offline");
    if (prepared) return Promise.resolve();
    if (loading) return loading;

    loading = new Promise((resolve, reject) => {
      let tag;
      let settled = false;
      const queue = (window.adsbygoogle ||= []);
      const config = {
        onReady() {
          prepared = true;
          finish();
        },
      };
      const timer = setTimeout(() => finish("initTimeout"), 6500);
      function finish(reason) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (reason && tag && !sdkLoaded) {
          tag.onload = tag.onerror = null;
          tag.remove();
          if (Array.isArray(queue)) {
            const index = queue.indexOf(config);
            if (index !== -1) queue.splice(index, 1);
          }
        }
        if (reason) reject(reason);
        else resolve();
      }
      try {
        if (sdkLoaded) {
          // Retry readiness on the existing SDK without setting preload twice.
          push(config);
        } else {
          config.preloadAdBreaks = "on";
          tag = document.createElement("script");
          tag.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
          tag.dataset.adClient = client;
          if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) &&
              new URLSearchParams(location.search).get("ads") === "test") {
            tag.dataset.adbreakTest = "on";
          }
          tag.async = true;
          tag.crossOrigin = "anonymous";
          tag.onload = () => {
            sdkLoaded = true;
          };
          tag.onerror = () => finish("blocked");
          push(config);
          document.head.append(tag);
        }
      } catch {
        finish("blocked");
      }
    }).finally(() => {
      loading = null;
    });
    return loading;
  }

  function showPreparedReward({
    placementName,
    canShow = () => true,
    onShow,
    onReward,
    onCancel,
    onError,
  }) {
    if (navigator.onLine === false) return onError("offline");
    if (!prepared || busy) return onError("notReady");
    let clickInProgress = true;
    if (!canShow() || document.hidden) return onCancel();
    busy = true;

    let shown = false,
      viewed = false,
      dismissed = false,
      closed = false,
      finished = false;
    let timer, prompt;
    function closePrompt() {
      if (!prompt) return;
      prompt.close();
      prompt.remove();
      prompt = null;
    }
    function settle(callback, reason) {
      if (finished) return;
      finished = true;
      busy = false;
      closePrompt();
      clearTimeout(timer);
      callback(reason);
    }
    function wait(milliseconds, callback, reason) {
      clearTimeout(timer);
      timer = setTimeout(() => settle(callback, reason), milliseconds);
    }
    wait(7000, onError, "timeout");
    try {
      push({
        type: "reward",
        name: placementName,
        beforeReward(showAd) {
          if (finished || shown || prompt) return;
          if (!canShow() || document.hidden) return settle(onCancel);
          // Google puede ofrecer el vídeo después del clic, mientras siga activo el gesto.
          const activated = navigator.userActivation?.isActive ?? clickInProgress;
          function openReward() {
            if (finished || shown) return;
            if (!canShow() || document.hidden) return settle(onCancel);
            closePrompt();
            shown = true;
            wait(12000, onError, "timeout");
            try { showAd(); } catch { settle(onError, "error"); }
          }
          if (activated) return openReward();
          // A delayed offer needs a fresh gesture on browsers that restrict video.
          const english = document.documentElement.lang === "en";
          prompt = document.createElement("dialog");
          prompt.className = "tronk-ad-offer";
          prompt.setAttribute("aria-label", english ? "Rewarded ad ready" : "Anuncio con recompensa listo");
          prompt.style.cssText = "max-width:90vw;padding:16px;border:1px solid #658493;border-radius:12px;background:#132331;color:#fff";
          const play = document.createElement("button");
          play.textContent = english ? "Play ad" : "Reproducir anuncio";
          play.onclick = openReward;
          const cancel = document.createElement("button");
          cancel.textContent = english ? "Cancel" : "Cancelar";
          cancel.onclick = () => settle(onCancel);
          prompt.oncancel = event => { event.preventDefault(); settle(onCancel); };
          for (const button of [play, cancel]) {
            button.style.cssText = "min-height:44px;padding:0 14px;margin:3px;border-radius:6px;border:1px solid #9bb6bf;font:600 1rem system-ui";
          }
          play.style.background = "#b2f0df";
          play.style.color = "#092d2a";
          cancel.style.background = "#213747";
          cancel.style.color = "#fff";
          prompt.append(play, cancel);
          document.body.append(prompt);
          prompt.showModal();
          wait(60000, onCancel);
        },
        beforeAd() {
          if (finished || !shown) return;
          wait(180000, onError, "timeout");
          onShow?.();
        },
        afterAd() {
          if (finished) return;
          closed = true;
          if (viewed || dismissed) settle(viewed ? onReward : onCancel);
          else wait(7000, onCancel);
        },
        adViewed() {
          if (!shown || finished) return;
          viewed = true;
          if (closed) settle(onReward);
        },
        adDismissed() {
          dismissed = true;
          if (closed) settle(onCancel);
        },
        adBreakDone({ breakStatus } = {}) {
          if (shown && (viewed || breakStatus === "viewed")) settle(onReward);
          else if (dismissed || breakStatus === "dismissed") settle(onCancel);
          else settle(onError, breakStatus);
        },
      });
    } catch {
      settle(onError, "error");
    } finally {
      clickInProgress = false;
    }
  }

  return {
    prepare: load,
    get prepared() { return prepared; },
    showPreparedReward,
  };
}
