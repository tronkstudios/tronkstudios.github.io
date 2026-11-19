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
  let loading,
    sdkLoaded = false,
    signalReady;
  let prepared = false;
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
          // An available H5 ad calls beforeReward during adBreak().
          if (!clickInProgress || navigator.userActivation?.isActive === false)
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
    } finally {
      clickInProgress = false;
    }
  }

  return {
    prepare: load,
    get prepared() {
      return prepared;
    },
    showPreparedReward,
  };
}
