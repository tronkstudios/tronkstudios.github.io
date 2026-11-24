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

function showStudioPromo({ canShow = () => true, onShow, onReward, onCancel, onError }) {
  if (document.hidden || !canShow()) return onCancel();
  const dialog = document.createElement("dialog");
  dialog.setAttribute("aria-label", "Promoción de TronkStudios");
  dialog.style.cssText = "max-width:min(90vw,560px);max-height:90dvh;background:#121528;color:white;padding:16px;border:2px solid #83ddff;border-radius:12px";
  const name = document.createElement("strong");
  name.textContent = "Promoción de TronkStudios · Tronk Fight";
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.style.cssText = "display:block;width:100%;max-height:55dvh;margin:12px 0";
  const message = document.createElement("p");
  message.textContent = "Mira el vídeo completo para obtener la recompensa.";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Cerrar sin recompensa";
  dialog.append(name, video, message, close);
  document.body.append(dialog);
  let closed = false;
  let timer;
  function finish(callback, reason) {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", visibility);
    video.pause();
    dialog.close();
    dialog.remove();
    callback(reason);
  }
  function visibility() {
    if (document.hidden) { clearTimeout(timer); video.pause(); }
    else if (!canShow()) finish(onCancel);
    else { watchdog(); play(); }
  }
  function play() {
    video.play().catch(error => {
      if (error.name !== "AbortError") finish(onError, "error");
    });
  }
  function watchdog() {
    clearTimeout(timer);
    if (!document.hidden) timer = setTimeout(() => finish(onError, "timeout"), 15000);
  }
  close.onclick = () => finish(onCancel);
  dialog.oncancel = event => { event.preventDefault(); finish(onCancel); };
  video.onended = () => finish(canShow() ? onReward : onCancel);
  video.onerror = () => finish(onError, "error");
  video.ontimeupdate = watchdog;
  document.addEventListener("visibilitychange", visibility);
  dialog.showModal();
  onShow?.();
  video.src = "/video/tronk-fight.mp4";
  watchdog();
  play();
}

export function createAdSenseProvider(client) {
  if (!/^ca-pub-\d{16}$/.test(client || "")) return null;
  let loading,
    sdkLoaded = false,
    signalReady;
  let prepared = false;
  let available = false;
  function push(options) {
    (window.adsbygoogle ||= []).push(options);
  }

  function load() {
    if (navigator.onLine === false) return Promise.reject("offline");
    if (prepared) return Promise.resolve();
    if (loading) return loading;

    loading = new Promise((resolve, reject) => {
      let tag;
      const queue = (window.adsbygoogle ||= []);
      const config = {
        onReady() {
          prepared = true;
          signalReady?.();
        },
      };
      const timer = setTimeout(() => finish("initTimeout"), 6500);
      function finish(reason) {
        clearTimeout(timer);
        signalReady = null;
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
      signalReady = () => finish();
      try {
        if (sdkLoaded) {
          // Retry readiness on the existing SDK without setting preload twice.
          push(config);
        } else {
          config.preloadAdBreaks = "on";
          tag = document.createElement("script");
          tag.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
          tag.dataset.adClient = client;
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
    if (!prepared) return onError("notReady");
    let clickInProgress = true;
    if (!canShow() || document.hidden) return onCancel();

    let shown = false,
      viewed = false,
      dismissed = false,
      finished = false;
    let timer;
    function settle(callback, reason) {
      if (finished) return;
      finished = true;
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
          if (finished || shown) return;
          if (!canShow() || document.hidden) return settle(onCancel);
          // Google puede ofrecer el vídeo después del clic, mientras siga activo el gesto.
          const activated = navigator.userActivation?.isActive ?? clickInProgress;
          if (!activated)
            return settle(onError, "notReady");
          shown = true;
          wait(7000, onError, "timeout");
          try {
            showAd();
          } catch {
            settle(onError, "error");
          }
        },
        beforeAd() {
          if (finished || !shown) return;
          wait(90000, onError, "timeout");
          onShow?.();
        },
        afterAd() {
          if (finished) return;
          clearTimeout(timer);
          timer = setTimeout(() => settle(viewed ? onReward : onCancel), 1000);
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
    } finally {
      clickInProgress = false;
    }
  }

  return {
    async prepare() {
      if (navigator.onLine === false) throw "offline";
      if (!available) {
        available = true;
        void load().catch(() => {});
      }
    },
    get prepared() {
      return available;
    },
    showPreparedReward(options) {
      if (navigator.onLine === false) return options.onError("offline");
      if (!prepared) {
        void load().catch(() => {});
        return showStudioPromo(options);
      }
      let started = false;
      showPreparedReward({
        ...options,
        onShow() { started = true; options.onShow?.(); },
        onError(reason) {
          if (started || reason === "offline") return options.onError(reason);
          showStudioPromo(options);
        },
      });
    },
  };
}
