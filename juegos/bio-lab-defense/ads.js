/** Ads are loaded only after the player accepts a named in-game reward. */
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
      const timer = setTimeout(() => fail(), 10000);
      function fail() {
        clearTimeout(timer);
        tag.remove();
        reject(new Error("AdSense unavailable"));
      }
      tag.onerror = fail;
      push({
        preloadAdBreaks: "on",
        onReady() {
          clearTimeout(timer);
          resolve();
        },
      });
      document.head.append(tag);
    }).catch((error) => {
      ready = undefined;
      throw error;
    });
    return ready;
  }

  return {
    async showRewardedAd({
      placementName,
      canShow,
      onReward,
      onCancel,
      onError,
    }) {
      await load();
      if (!canShow() || document.hidden) return onCancel();
      let shown = false;
      let viewed = false;
      let finished = false;
      const timer = setTimeout(() => settle(onError), 12000);

      function settle(callback) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        callback();
      }

      try {
        push({
          type: "reward",
          name: `bio-lab-defense-${placementName}`,
          beforeReward(showAd) {
            if (finished || shown) return;
            if (!canShow() || document.hidden) return settle(onCancel);
            try {
              shown = true;
              showAd();
            } catch {
              settle(onError);
            }
          },
          beforeAd() {
            clearTimeout(timer);
          },
          adViewed() {
            if (shown) viewed = true;
          },
          adBreakDone({ breakStatus } = {}) {
            if (viewed && breakStatus === "viewed") settle(onReward);
            else if (breakStatus === "dismissed") settle(onCancel);
            else settle(onError);
          },
        });
      } catch {
        settle(onError);
      }
    },
  };
}
