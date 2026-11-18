"use strict";

const RewardedAds = (() => {
  // Configure a dedicated rewarded web ad unit from Google Ad Manager.
  const unit = document.querySelector('meta[name="rewarded-ad-unit"]')?.content.trim() || "";
  const configured = /^\/\d+(?:,\d+)?\/[\w/-]+$/.test(unit);
  const coins = 50;
  const cooldown = 15 * 60 * 1000;
  let pending = false;
  let loader;
  let enabled = false;

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

  function display(gpt, stillHere) {
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

  async function request(stillHere) {
    if (!configured || pending) return false;
    pending = true;
    try { return await display(await load(), stillHere); }
    catch { return false; }
    finally { pending = false; }
  }

  return { configured, request, coins, cooldown, get pending() { return pending; } };
})();
