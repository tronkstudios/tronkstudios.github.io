"use strict";

const RewardedAds = (() => {
  const unit = document.querySelector('meta[name="rewarded-ad-unit"]')?.content.trim() || "";
  const client = document.querySelector('meta[name="rewarded-adsense-client"]')?.content.trim() || "";
  const useAdManager = /^\/\d+(?:,\d+)?\/[\w/-]+$/.test(unit);
  const configured = useAdManager || /^ca-pub-\d{16}$/.test(client);
  const coins = 50;
  const cooldown = 15 * 60 * 1000;
  let pending = false;
  let loader;
  let enabled = false;

  function loadAdManager() {
    if (window.googletag?.apiReady) return Promise.resolve(window.googletag);
    if (loader) return loader;
    window.googletag = window.googletag || { cmd: [] };
    loader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
      script.async = true;
      const timer = setTimeout(() => fail(), 10000);
      function fail() {
        clearTimeout(timer);
        script.remove();
        reject(new Error("Rewarded ads unavailable"));
      }
      script.onerror = fail;
      window.googletag.cmd.push(() => {
        clearTimeout(timer);
        resolve(window.googletag);
      });
      document.head.append(script);
    }).catch(error => {
      loader = null;
      throw error;
    });
    return loader;
  }

  function displayAdManager(gpt, stillHere, onShow) {
    return new Promise(resolve => {
      let slot, service, granted = false, shown = false, finished = false;
      const handlers = [];
      const timer = setTimeout(() => finish(false), 12000);

      function finish(reward) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        for (const [event, handler] of handlers) service.removeEventListener(event, handler);
        if (slot) gpt.destroySlots([slot]);
        resolve(reward);
      }
      function listen(event, callback) {
        const handler = eventData => {
          if (!finished && eventData.slot === slot) callback(eventData);
        };
        handlers.push([event, handler]);
        service.addEventListener(event, handler);
      }
      try {
        if (!stillHere()) return finish(false);
        slot = gpt.defineOutOfPageSlot(unit, gpt.enums.OutOfPageFormat.REWARDED);
        if (!slot) return finish(false);
        service = gpt.pubads();
        slot.addService(service);
        listen("rewardedSlotReady", event => {
          if (shown) return;
          if (!stillHere() || document.hidden) return finish(false);
          try {
            shown = true;
            onShow();
            if (event.makeRewardedVisible() === false) finish(false);
            else clearTimeout(timer);
          } catch { finish(false); }
        });
        listen("rewardedSlotGranted", () => { if (shown) granted = true; });
        listen("rewardedSlotClosed", () => finish(granted));
        listen("slotRenderEnded", event => { if (event.isEmpty) finish(false); });
        if (!enabled) {
          gpt.enableServices();
          enabled = true;
        }
        gpt.display(slot);
      } catch { finish(false); }
    });
  }

  function queueAdSense(options) {
    (window.adsbygoogle ||= []).push(options);
  }

  function loadAdSense() {
    if (loader) return loader;
    loader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
      script.async = true;
      script.crossOrigin = "anonymous";
      const timer = setTimeout(() => fail(), 10000);
      function fail() {
        clearTimeout(timer);
        script.remove();
        reject(new Error("Rewarded ads unavailable"));
      }
      script.onerror = fail;
      queueAdSense({
        preloadAdBreaks: "on",
        onReady() {
          clearTimeout(timer);
          resolve();
        }
      });
      document.head.append(script);
    }).catch(error => {
      loader = null;
      throw error;
    });
    return loader;
  }

  function displayAdSense(stillHere, placement, onShow) {
    if (!stillHere() || document.hidden) return false;
    return new Promise(resolve => {
      let finished = false;
      let shown = false;
      let viewed = false;
      const timer = setTimeout(() => finish(false), 12000);
      function finish(reward) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(reward);
      }
      try {
        queueAdSense({
          type: "reward",
          name: placement,
          beforeReward(showAd) {
            if (finished || shown) return;
            // The reward button already specifies the offer and asks the player to watch.
            if (!stillHere() || document.hidden) return finish(false);
            try {
              shown = true;
              showAd();
            } catch { finish(false); }
          },
          beforeAd() {
            clearTimeout(timer);
            onShow();
          },
          adViewed() { if (shown) viewed = true; },
          adDismissed() { viewed = false; },
          adBreakDone() { finish(viewed); }
        });
      } catch { finish(false); }
    });
  }

  async function request(stillHere, placement, onShow) {
    if (!configured || pending) return false;
    pending = true;
    try {
      if (useAdManager) return await displayAdManager(await loadAdManager(), stillHere, onShow);
      await loadAdSense();
      return await displayAdSense(stillHere, placement, onShow);
    }
    catch { return false; }
    finally { pending = false; }
  }

  return { configured, request, coins, cooldown, get pending() { return pending; } };
})();
