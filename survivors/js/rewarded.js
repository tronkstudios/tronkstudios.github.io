"use strict";

const RewardedAds = (() => {
  // Configure a dedicated rewarded web ad unit from Google Ad Manager.
  const unit = document.querySelector('meta[name="rewarded-ad-unit"]')?.content.trim() || "";
  const client = document.querySelector('meta[name="rewarded-adsense-client"]')?.content.trim() || "";
  const adManager = /^\/\d+(?:,\d+)?\/[\w/-]+$/.test(unit);
  const configured = adManager || /^ca-pub-\d{16}$/.test(client);
  const coins = 50;
  const cooldown = 15 * 60 * 1000;
  let pending = false;
  let loader;
  let enabled = false;
  let h5, lastError;

  function load() {
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

  function display(gpt, stillHere, onShow) {
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

  async function request(stillHere, placement, reward, onShow) {
    if (!configured || pending) return false;
    lastError = "";
    pending = true;
    try {
      if (adManager) return await display(await load(), stillHere, onShow);
      const { createAdSenseProvider, adMessage } = await import("/js/h5-rewards.js?v=1");
      h5 ||= createAdSenseProvider(client);
      return await new Promise(resolve => {
        h5.showRewardedAd({
          placementName: `tronk-survivors-${placement}`,
          canShow: stillHere,
          reward,
          onShow,
          onReward: () => resolve(true),
          onCancel: () => resolve(false),
          onError: reason => {
            lastError = adMessage(reason);
            resolve(false);
          }
        }).catch(() => resolve(false));
      });
    }
    catch { return false; }
    finally { pending = false; }
  }

  return { configured, request, coins, cooldown, get pending() { return pending; }, get lastError() { return lastError; } };
})();
