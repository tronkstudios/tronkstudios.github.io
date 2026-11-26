/* Voluntary aggregate playtest counters. Each game has its own consent and cohort. */
(() => {
  const game = document.currentScript.dataset.game;
  const control = document.getElementById("game-measurement");
  const storageKey = "tronk-measurement-" + game;
  const today = () => Math.floor(Date.now() / 86400000);
  let profile;
  try {
    profile = JSON.parse(localStorage.getItem(storageKey));
  } catch {}
  function send(event) {
    if (!profile) return;
    fetch("https://tronkstudios-support.tronkstudios7.workers.dev/game-event", {
      method: "POST", credentials: "omit", referrerPolicy: "no-referrer", keepalive: true,
      headers: {"Content-Type":"text/plain"},
      body: JSON.stringify({game, event, cohort:profile.first})
    }).catch(() => {});
  }
  function visit() {
    if (!profile || profile.last === today()) return;
    profile.last = today();
    try { localStorage.setItem(storageKey, JSON.stringify(profile)); } catch {}
    send("visit");
  }
  control.checked = Number.isInteger(profile?.first);
  if (!control.checked) profile = null;
  control.addEventListener("change", () => {
    if (control.checked) {
      profile = {first:today()};
      visit();
    } else {
      profile = null;
      try { localStorage.removeItem(storageKey); } catch {}
    }
  });
  let starts = 0;
  window.TronkMeasure = event => {
    if (!profile) return;
    visit();
    send(event);
    if ((event === "run_start" || event === "challenge_start") && ++starts === 2) send("second_start");
  };
  visit();
})();
