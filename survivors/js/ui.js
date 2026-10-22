"use strict";

/* TronkStudios · survivors/js/ui.js
   Menús de Tronk Survivors (inicio, mapas, reto diario, personajes,
   cofre, mejoras, logros, ajustes, online) y la interfaz de la partida
   (vida, experiencia, armas, jefe, subidas de nivel, pausa y final).
   Arranca el juego.
   Scripts clásicos (ver docs/adr/0002). */

(() => {
  const $ = (id) => document.getElementById(id);
  const save = Save.load();
  let current = "loading";
  let selectedView = save.selected;
  let lastRun = null; // cómo empezó la última partida (para «Otra vez»)

  const charById = (id) => TS.CHARACTERS.find((c) => c.id === id);
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  function show(id) {
    for (const s of document.querySelectorAll(".screen")) s.classList.toggle("is-on", s.id === id);
    current = id;
    const renders = { menu: renderMenu, chars: renderChars, gacha: renderGacha, shop: renderShop, maps: renderMaps, daily: renderDaily, achievements: renderAchievements, settings: renderSettings };
    if (renders[id]) renders[id]();
    if (id === "online") TronkNet.render($("online-body"));
    if (id !== "game") {
      Sfx.startMusic("menu");
      if (!Game.state || Game.state.over) startMenuBackground();
    }
  }

  function fillIcons(root = document) {
    for (const img of root.querySelectorAll("img[data-icon]")) if (!img.src) img.src = Sprites.iconUrl(img.dataset.icon, 3);
  }

  function syncCoins() {
    for (const e of document.querySelectorAll(".js-coins")) e.textContent = save.coins;
    $("menu-coins").textContent = save.coins;
  }

  function stars(n) {
    return "★".repeat(n) + "☆".repeat(TS.GACHA.maxStars - n);
  }

  /* =======================================================
     INICIO
     ======================================================= */

  // Fondo del menú: todos los personajes paseando y peleando por el mapa
  let demoOn = false;
  function startMenuBackground() {
    if (demoOn) return;
    demoOn = true;
    $("hud").hidden = true;
    Game.setMap(save.settings.map || "bosque");
    Game.startDemo(TS.CHARACTERS.map((c) => c.id));
  }

  let spinTimer = 0;
  let spinStep = 0;
  const spinCache = {};
  // El personaje elegido da vueltas sobre la plataforma
  const SPIN = [["down", false], ["downSide", false], ["side", false], ["upSide", false], ["up", false], ["upSide", true], ["side", true], ["downSide", true]];
  function spinHero() {
    const set = Sprites.get(`char:${save.selected}`);
    const [view, flip] = SPIN[spinStep % SPIN.length];
    const key = `${save.selected}:${view}:${flip}`;
    if (!spinCache[key]) {
      const img = Sprites.scaled(Stick.portrait(set[view].idle), 4);
      if (flip) {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext("2d");
        g.translate(c.width, 0);
        g.scale(-1, 1);
        g.drawImage(img, 0, 0);
        spinCache[key] = c.toDataURL();
      } else spinCache[key] = img.toDataURL();
    }
    $("stage-img").src = spinCache[key];
    spinStep++;
  }



  function renderAccount() {
    const p = $("menu-account");
    p.textContent = "";
    if (Account.user) p.textContent = LT("loggedIn", { name: Account.name || "Tronker" });
    else {
      const a = el("a", "", LT("loggedOut"));
      a.href = "/";
      p.appendChild(a);
    }
  }

  function renderMenu() {
    syncCoins();
    const ch = charById(save.selected);
    const own = save.owned[ch.id];
    $("stage-name").textContent = ch.name;
    $("stage-rarity").textContent = L(TS.RARITIES[ch.rarity].name);
    $("stage-rarity").style.color = TS.RARITIES[ch.rarity].color;
    $("stage-stars").textContent = stars(own ? own.stars : 1);
    $("stage-weapon").textContent = LT("weaponPerk", { weapon: L(TS.WEAPONS[ch.weapon].name), perk: L(ch.perkText) });
    $("stage-weapon-icon").src = Sprites.iconUrl(ch.weapon, 2);
    spinStep = 0;
    spinHero();
    clearInterval(spinTimer);
    spinTimer = setInterval(() => (current === "menu" ? spinHero() : clearInterval(spinTimer)), 700);
    $("menu-free").hidden = !save.freePull;
    $("menu-daily").hidden = save.dailyDone === dailyConfig().day;
    $("menu-ach").hidden = (save.weekly && save.weekly.seen) === weekKey();
    const b = save.best;
    $("menu-best").textContent = b.time ? LT("best", { time: fmtTime(b.time), kills: b.kills, level: b.level }) + (b.wins ? LT("wins", { n: b.wins }) : "") : L("Aguanta 10 minutos y derrota al jefe final.");
    renderAccount();
  }

  /* =======================================================
     MAPAS
     ======================================================= */

  function mapUnlocked(id) {
    const m = TS.MAPS[id];
    return !m.unlock || !!save.maps[id];
  }

  function checkMapUnlocks() {
    const out = [];
    for (const [id, m] of Object.entries(TS.MAPS)) {
      if (!m.unlock || save.maps[id]) continue;
      const u = m.unlock;
      const value = u.best === "time" ? save.best.time : u.best === "bosses" ? save.stats.bosses : save.best.wins;
      if (value >= u.value) { save.maps[id] = true; out.push(id); }
    }
    return out;
  }

  const previews = {};
  function renderMaps() {
    const grid = $("maps-grid");
    grid.textContent = "";
    for (const [id, m] of Object.entries(TS.MAPS)) {
      const open = mapUnlocked(id);
      const card = el("button", "map-card");
      card.type = "button";
      card.disabled = !open;
      if (!previews[id]) previews[id] = Game.mapPreview(id);
      const c = document.createElement("canvas");
      c.width = previews[id].width;
      c.height = previews[id].height;
      c.getContext("2d").drawImage(previews[id], 0, 0);
      const info = el("div");
      info.append(el("b", "", L(m.name)), el("small", "", L(m.desc)));
      card.append(c, info);
      if (!open) card.appendChild(el("span", "map-lock", `🔒 ${L(m.unlock.text)}`));
      card.addEventListener("click", () => {
        save.settings.map = id;
        Save.persist();
        play(null, { mode: "solo", localId: 0, map: id });
      });
      grid.appendChild(card);
    }
    renderEndlessTop();
  }

  async function renderEndlessTop() {
    const top = $("endless-top");
    top.textContent = "";
    if (!Account.client) return;
    const rows = await Account.endlessTop();
    top.textContent = "";
    if (!rows.length) top.appendChild(el("li", "empty", L("Todavía no hay nadie. ¡Sé el primero!")));
    for (const r of rows) top.appendChild(el("li", r.me ? "me" : "", `${r.name} — ${fmtTime(r.seconds)}${r.character ? ` (${(charById(r.character) || {}).name || ""})` : ""}`));
  }

  /* =======================================================
     RETO DIARIO
     ======================================================= */

  function dailyConfig() {
    const day = new Date().toISOString().slice(0, 10); // día en hora universal
    let h = 2166136261;
    for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    let x = h || 1;
    const rng = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
    const charId = TS.CHARACTERS[Math.floor(rng() * TS.CHARACTERS.length)].id;
    const maps = Object.keys(TS.MAPS);
    const map = maps[Math.floor(rng() * maps.length)];
    const keys = Object.keys(TS.DAILY_MODS);
    const m1 = keys[Math.floor(rng() * keys.length)];
    let m2 = m1;
    while (m2 === m1) m2 = keys[Math.floor(rng() * keys.length)];
    return { day, seed: h || 1, charId, map, mods: [m1, m2] };
  }

  async function renderDaily() {
    const cfg = dailyConfig();
    $("daily-date").textContent = new Date(`${cfg.day}T12:00:00Z`).toLocaleDateString(LANG === "en" ? "en-US" : "es-ES", { day: "numeric", month: "long" });
    const card = $("daily-card");
    card.textContent = "";
    const img = document.createElement("img");
    img.src = Sprites.portrait(cfg.charId, 2);
    img.alt = "";
    const info = el("div");
    const ch = charById(cfg.charId);
    info.append(el("b", "", `${ch.name} · ${L(TS.MAPS[cfg.map].name)}`));
    const ul = el("ul");
    for (const m of cfg.mods) ul.appendChild(el("li", "", `${L(TS.DAILY_MODS[m].name)}: ${L(TS.DAILY_MODS[m].desc)}`));
    info.append(el("small", "", L("Reglas de hoy")), ul);
    card.append(img, info);
    const top = $("daily-top");
    top.textContent = "";
    if (!Account.client) return;
    const rows = await Account.dailyTop(cfg.day);
    top.textContent = "";
    if (!rows.length) top.appendChild(el("li", "empty", L("Todavía no hay nadie. ¡Sé el primero!")));
    for (const r of rows) top.appendChild(el("li", r.me ? "me" : "", `${r.name} — ${LT("points", { n: r.score })}${r.character ? ` (${(charById(r.character) || {}).name || ""})` : ""}`));
    if (!Account.user) top.appendChild(el("li", "empty", L("Inicia sesión en TronkStudios para salir en la clasificación.")));
  }

  function playDaily() {
    const cfg = dailyConfig();
    const ch = charById(cfg.charId);
    play([{ charId: cfg.charId, stars: 1, meta: {}, name: Account.name || ch.name }], { mode: "solo", localId: 0, map: cfg.map, seed: cfg.seed, mods: cfg.mods, daily: cfg.day });
  }

  /* =======================================================
     LOGROS
     ======================================================= */

  function renderAchievements() {
    renderMissions();
    const list = $("ach-list");
    list.textContent = "";
    let done = 0;
    for (const a of TS.ACHIEVEMENTS) {
      const ok = !!save.achievements[a.id];
      if (ok) done++;
      const row = el("div", `ach${ok ? " done" : ""}`);
      const text = el("div");
      text.append(el("b", "", L(a.name)), el("small", "", L(a.desc)));
      row.append(el("i", "", ok ? "🏆" : "🔒"), text, el("span", "", `+${a.reward}`));
      list.appendChild(row);
    }
    $("ach-count").textContent = LT("achCount", { a: done, b: TS.ACHIEVEMENTS.length });
  }

  function checkAchievements(run) {
    const got = [];
    for (const a of TS.ACHIEVEMENTS) {
      if (save.achievements[a.id]) continue;
      let ok = false;
      try { ok = a.test(run || { kills: 0, seconds: 0, bosses: 0, level: 0 }, save); } catch { ok = false; }
      if (ok) {
        save.achievements[a.id] = true;
        save.coins += a.reward;
        got.push(a);
      }
    }
    if (got.length) {
      Save.persist();
      got.forEach((a, i) => setTimeout(() => { toast(LT("achDone", { name: L(a.name), n: a.reward })); Sfx.play("chest"); }, 600 + i * 900));
    }
    return got;
  }

  /* =======================================================
     MISIONES DE LA SEMANA
     ======================================================= */

  // La semana empieza el lunes (hora universal)
  function weekKey() {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  }

  function weekMissions() {
    const key = weekKey();
    let h = 2166136261;
    for (const ch of `semana-${key}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    const pool = [...TS.MISSIONS];
    const out = [];
    while (out.length < 3 && pool.length) {
      h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
      out.push(pool.splice(h % pool.length, 1)[0]);
    }
    return out;
  }

  function weekly() {
    const key = weekKey();
    if (!save.weekly || save.weekly.week !== key) save.weekly = { week: key, prog: {}, claimed: {} };
    return save.weekly;
  }

  function missionText(m) {
    return L(m.text).replace("{n}", m.goal);
  }

  function updateWeekly(r) {
    const w = weekly();
    const value = {
      kills: r.kills, bosses: r.bosses || 0, runs: 1, props: r.props || 0, minutes: Math.floor(r.seconds / 60), level: r.level,
      wins: r.victory ? 1 : 0, coop: r.coop ? 1 : 0, dailies: r.daily ? 1 : 0, evolutions: r.evolutions || 0,
      otherMaps: r.map && r.map !== "bosque" ? 1 : 0, abilities: r.abilities || 0
    };
    const done = [];
    for (const m of weekMissions()) {
      const v = value[m.stat] || 0;
      w.prog[m.id] = m.kind === "best" ? Math.max(w.prog[m.id] || 0, v) : (w.prog[m.id] || 0) + v;
      if (w.prog[m.id] >= m.goal && !w.claimed[m.id]) {
        w.claimed[m.id] = true;
        save.coins += m.reward;
        done.push(m);
      }
    }
    done.forEach((m, i) => setTimeout(() => { toast(LT("missionDone", { name: missionText(m), n: m.reward })); Sfx.play("chest"); }, 1800 + i * 900));
  }

  function renderMissions() {
    const w = weekly();
    w.seen = w.week;
    Save.persist();
    const box = $("missions");
    box.textContent = "";
    for (const m of weekMissions()) {
      const prog = Math.min(m.goal, w.prog[m.id] || 0);
      const row = el("div", `mission${w.claimed[m.id] ? " claimed" : ""}`);
      const bar = el("div", "bar");
      const fill = el("i");
      fill.style.width = `${(prog / m.goal) * 100}%`;
      bar.appendChild(fill);
      row.append(el("b", "", missionText(m)), el("span", "", w.claimed[m.id] ? "✓" : `+${m.reward}`), bar, el("small", "", `${prog} / ${m.goal}`));
      box.appendChild(row);
    }
    const end = new Date(`${w.week}T00:00:00Z`).getTime() + 7 * 86400000;
    const days = Math.max(0, Math.ceil((end - Date.now()) / 86400000));
    $("week-left").textContent = LT("weekLeft", { n: days });
  }

  /* =======================================================
     AJUSTES
     ======================================================= */

  function applySettings() {
    Sfx.setVolume("music", save.settings.musicVol ?? 0.7);
    Sfx.setVolume("sfx", save.settings.sfxVol ?? 0.9);
    Game.options.numbers = save.settings.numbers !== false;
    Game.options.shake = save.settings.shake !== false;
    Game.options.fx = save.settings.fx || "auto";
  }

  function renderSettings() {
    const mv = Math.round((save.settings.musicVol ?? 0.7) * 100);
    const sv = Math.round((save.settings.sfxVol ?? 0.9) * 100);
    $("vol-music").value = mv;
    $("vol-sfx").value = sv;
    $("vol-music-v").textContent = `${mv}%`;
    $("vol-sfx-v").textContent = `${sv}%`;
    $("lang-select").value = LANG;
    $("opt-numbers").checked = save.settings.numbers !== false;
    $("opt-shake").checked = save.settings.shake !== false;
    $("opt-fx").value = save.settings.fx || "auto";
    $("opt-tips").checked = !save.tutorial;
  }

  $("vol-music").addEventListener("input", (e) => { save.settings.musicVol = e.target.value / 100; applySettings(); renderSettings(); Save.persist(); });
  $("vol-sfx").addEventListener("input", (e) => { save.settings.sfxVol = e.target.value / 100; applySettings(); renderSettings(); Save.persist(); Sfx.play("coin", 0.15); });
  $("opt-numbers").addEventListener("change", (e) => { save.settings.numbers = e.target.checked; applySettings(); Save.persist(); });
  $("opt-shake").addEventListener("change", (e) => { save.settings.shake = e.target.checked; applySettings(); Save.persist(); });
  $("opt-fx").addEventListener("change", (e) => { save.settings.fx = e.target.value; applySettings(); Save.persist(); });
  $("opt-tips").addEventListener("change", (e) => { save.tutorial = !e.target.checked; Save.persist(); });
  $("lang-select").addEventListener("change", (e) => {
    setLang(e.target.value);
    translatePage();
    renderSettings();
  });

  /* =======================================================
     PERSONAJES
     ======================================================= */

  function renderChars() {
    const grid = $("chars-grid");
    grid.textContent = "";
    $("chars-count").textContent = `${Object.keys(save.owned).length} / ${TS.CHARACTERS.length}`;
    for (const ch of TS.CHARACTERS) {
      const have = save.owned[ch.id];
      const card = el("button", `char-card${have ? "" : " is-locked"}${ch.id === save.selected ? " is-selected" : ""}`);
      card.type = "button";
      card.style.setProperty("--rarity", TS.RARITIES[ch.rarity].color);
      const img = document.createElement("img");
      img.src = have ? Sprites.portrait(ch.id, 2) : Sprites.silhouettePortrait(ch.id, 2);
      img.alt = "";
      card.append(img, el("span", "", have ? ch.name : "???"), el("span", "stars", have ? stars(have.stars) : ""));
      card.addEventListener("click", () => {
        selectedView = ch.id;
        Sfx.play("click");
        if (have) {
          save.selected = ch.id;
          Save.persist();
        }
        renderChars();
      });
      grid.appendChild(card);
    }
    renderDetail(selectedView);
  }

  function renderDetail(id) {
    const ch = charById(id);
    const have = save.owned[id];
    const box = $("char-detail");
    box.textContent = "";
    const big = el("div", "big");
    for (const view of ["down"]) {
      const img = document.createElement("img");
      img.src = have ? Sprites.scaled(Sprites.get(`char:${id}`)[view].idle, 3).toDataURL() : Sprites.silhouettePortrait(id, 3);
      img.alt = "";
      big.appendChild(img);
    }
    const rarity = el("span", "rarity", `${L(TS.RARITIES[ch.rarity].name)}${ch.from === "Tronk Fight" ? ` · ${L("de Tronk Fight")}` : ""}${have ? ` · ${stars(have.stars)}` : ""}`);
    rarity.style.color = TS.RARITIES[ch.rarity].color;
    box.append(big, el("h3", "", have ? ch.name : L("Personaje sin conseguir")), rarity);
    if (have) {
      const weapon = el("div", "weapon");
      const wi = document.createElement("img");
      wi.src = Sprites.iconUrl(ch.weapon, 2);
      wi.alt = "";
      wi.className = "pix";
      const wt = el("span");
      wt.append(el("b", "", L(TS.WEAPONS[ch.weapon].name)), document.createElement("br"), el("small", "", L(TS.WEAPONS[ch.weapon].desc)));
      weapon.append(wi, wt);
      const btn = el("button", "btn btn-big", save.selected === id ? L("¡A jugar!") : L("Elegir"));
      btn.addEventListener("click", () => {
        const go = save.selected === id;
        save.selected = id;
        Save.persist();
        if (go) show("maps");
        else renderChars();
      });
      box.append(el("p", "", L(ch.desc)), weapon, el("p", "", LT("perk", { perk: L(ch.perkText) })), btn);
    } else {
      const btn = el("button", "btn btn-gold", L("Ir al cofre"));
      btn.addEventListener("click", () => show("gacha"));
      box.append(el("p", "", L("Consíguelo en el Cofre Tronk con las monedas que ganas jugando.")), btn);
    }
  }

  /* =======================================================
     COFRE
     ======================================================= */

  function renderGacha() {
    syncCoins();
    $("gacha-chest").style.backgroundImage = `url(${Sprites.iconUrl("cofre", 12)})`;
    $("cost-1").textContent = save.freePull ? LT("free") : TS.GACHA.cost1;
    $("cost-10").textContent = TS.GACHA.cost10;
    $("pull-1").disabled = !save.freePull && save.coins < TS.GACHA.cost1;
    $("pull-10").disabled = save.coins < TS.GACHA.cost10;
    $("gacha-pity").textContent = LT("pity", { n: TS.GACHA.pity - save.pity });
    const ul = $("gacha-rates");
    ul.textContent = "";
    for (const id of TS.RARITY_ORDER) {
      const li = el("li");
      const b = el("b", "", LT("rate", { name: L(TS.RARITIES[id].name), n: Math.round(TS.RARITIES[id].rate * 100) }));
      b.style.color = TS.RARITIES[id].color;
      li.append(b, document.createTextNode(` (${TS.CHARACTERS.filter((c) => c.rarity === id).map((c) => c.name).join(", ")})`));
      ul.appendChild(li);
    }
  }

  function pull(times) {
    const results = Save.pull(times);
    if (!results) return;
    syncCoins();
    const chest = $("gacha-chest");
    chest.classList.add("is-shaking");
    Sfx.play("gachaRoll");
    setTimeout(() => {
      chest.classList.remove("is-shaking");
      const best = results.reduce((m, r) => Math.max(m, TS.RARITY_ORDER.indexOf(r.ch.rarity)), 0);
      Sfx.play(best >= 3 ? "legend" : "reveal");
      const cards = $("reveal-cards");
      cards.textContent = "";
      results.forEach((r, i) => {
        const card = el("div", `reveal-card${r.kind === "new" ? " is-new" : ""}`);
        card.style.setProperty("--rarity", TS.RARITIES[r.ch.rarity].color);
        card.style.animationDelay = `${i * 0.12}s`;
        const img = document.createElement("img");
        img.src = Sprites.portrait(r.ch.id, 2);
        img.alt = "";
        card.append(img, el("b", "", r.ch.name), el("span", "tag", L(TS.RARITIES[r.ch.rarity].name)), el("small", "", r.kind === "star" ? LT("stars", { n: r.stars }) : r.kind === "coins" ? LT("plusCoins", { n: r.coins }) : ""));
        cards.appendChild(card);
      });
      $("gacha-reveal").hidden = false;
      $("reveal-ok").focus();
      checkAchievements(null);
    }, 900);
  }

  /* =======================================================
     TIENDA
     ======================================================= */

  function renderShop() {
    syncCoins();
    const list = $("shop-list");
    list.textContent = "";
    for (const item of TS.SHOP) {
      const lvl = Save.shopLevel(item.id);
      const row = el("div", "shop-item");
      const info = el("div");
      const pips = el("div", "shop-pips");
      for (let i = 0; i < item.max; i++) pips.appendChild(el("i", i < lvl ? "on" : ""));
      info.append(el("b", "", L(item.name)), el("small", "", L(item.desc)), pips);
      const btn = el("button", "btn btn-gold");
      if (lvl >= item.max) {
        btn.textContent = L("Al máximo");
        btn.disabled = true;
      } else {
        const cost = Save.shopCost(item);
        const img = document.createElement("img");
        img.src = Sprites.iconUrl("moneda", 2);
        img.alt = "";
        btn.append(img, el("span", "", cost));
        btn.disabled = save.coins < cost;
        btn.addEventListener("click", () => { if (Save.buy(item)) { Sfx.play("coin"); renderShop(); } });
      }
      row.append(info, btn);
      list.appendChild(row);
    }
  }

  /* =======================================================
     PARTIDA
     ======================================================= */

  function localSetup() {
    const own = save.owned[save.selected] || { stars: 1 };
    return { charId: save.selected, stars: own.stars, meta: Save.shopStats(), name: Account.name || charById(save.selected).name };
  }

  /* ---------- solo en ordenador ----------
     En móviles y tablets sin ratón no se puede jugar: sale un aviso. */
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const desktopOnly = isTouch && !window.matchMedia("(any-pointer: fine)").matches;
  if (desktopOnly) $("mobile-block").hidden = false;

  function enterGame(prepare) {
    if (desktopOnly) return;
    for (const s of document.querySelectorAll(".screen")) s.classList.remove("is-on");
    for (const id of ["levelup", "pause", "end", "victory"]) $(id).hidden = true;
    current = "game";
    $("hud").hidden = false;
    $("loading").classList.add("is-on");
    $("loading-text").textContent = L("Preparando la partida…");
    setTimeout(() => {
      // los dibujos de los enemigos se hacen ahora (tarda un momento)
      for (const id of [...Object.keys(People.ENEMIES), "slime", "slimito", "fantasma", "murcielago"]) Sprites.get(`enemy:${id}`);
      $("loading").classList.remove("is-on");
      demoOn = false;
      slotKey = "";
      prepare();
    }, 30);
  }

  function play(setups, opts) {
    const s = setups || [localSetup()];
    const o = { mode: "solo", localId: 0, map: save.settings.map || "bosque", ...(opts || {}) };
    // en las 3 primeras partidas los enemigos pegan menos
    if (o.mode === "solo" && !o.daily && save.runs < 3) o.easy = true;
    lastRun = { setups, opts: o };
    for (const x of s) Sprites.get(`char:${x.charId}`);
    Account.startRun();
    enterGame(() => {
      Game.start(s, o);
      startTips(o.easy);
    });
  }

  function playGuest(info) {
    lastRun = { guest: true };
    Account.startRun();
    enterGame(() => {
      Game.startGuest(info);
      startTips(false);
    });
  }

  function renderSlots(box, data, big) {
    box.textContent = "";
    const items = [...data.weapons.map((w) => ({ ...w, kind: "w" })), ...data.passives.map((p) => ({ ...p, kind: "p" }))];
    for (const it of items) {
      const slot = el("div", `hud-slot${it.kind === "p" ? " is-passive" : ""}${it.evo ? " is-evo" : ""}`);
      const img = document.createElement("img");
      img.src = Sprites.iconUrl(it.id, big ? 3 : 2);
      img.alt = "";
      slot.title = it.evo ? L(TS.EVOLUTIONS[it.id].name) : L((TS.WEAPONS[it.id] || TS.PASSIVES[it.id] || {}).name || "");
      slot.append(img, el("i", "", it.evo ? "★" : it.lvl));
      box.appendChild(slot);
    }
  }

  /* ---------- consejos de la primera partida ---------- */
  const TIPS = [
    { at: 1, text: "tipMove" },
    { at: 9, text: "tipGems" },
    { at: 22, text: "tipProps" },
    { at: 34, text: "tipAbility" },
    { at: 50, text: "tipRanged" }
  ];
  let tipIdx = -1;
  let tipUntil = 0;
  function startTips(easy) {
    tipIdx = save.tutorial ? TIPS.length : 0;
    $("hud-tip").hidden = true;
    if (easy) setTimeout(() => toast(L("Primeras partidas: los enemigos pegan un 25 % menos.")), 1500);
  }
  function updateTips(seconds) {
    const tip = $("hud-tip");
    if (!tip.hidden && seconds >= tipUntil) tip.hidden = true;
    if (tipIdx < 0 || tipIdx >= TIPS.length || seconds < TIPS[tipIdx].at) return;
    tip.textContent = LT(TIPS[tipIdx].text, { key: isTouch ? L("el botón redondo") : L("Espacio") });
    tip.hidden = false;
    tipUntil = seconds + 7;
    tipIdx++;
    if (tipIdx >= TIPS.length) { save.tutorial = true; Save.persist(); }
  }

  let slotKey = "";
  Game.on("hud", (d) => {
    updateTips(d.seconds);
    $("hud-xp-bar").style.width = `${Math.min(100, (d.xp / d.xpNext) * 100)}%`;
    $("hud-level").textContent = `${LANG === "en" ? "Lv." : "Nv."} ${d.level}`;
    $("hud-name").textContent = d.name;
    $("hud-time").textContent = fmtTime(d.seconds);
    $("hud-sub").textContent = (Game.state && Game.state.endless ? `${L("Modo infinito")} · ` : "") + LT("hudSub", { map: L(TS.MAPS[Game.mapId].name), kills: d.kills, coins: d.coins });
    const pct = Math.max(0, d.hp / d.maxHp);
    $("hud-hp-bar").style.width = `${pct * 100}%`;
    $("hud-hp-bar").classList.toggle("is-low", pct < 0.35);
    $("hud-hp").textContent = `${Math.ceil(Math.max(0, d.hp))} / ${d.maxHp}`;
    $("hud-evo").hidden = !d.canEvolve;
    const ab = $("hud-ab");
    ab.hidden = !d.ability;
    if (d.ability) {
      const ready = d.ability.pct >= 1;
      $("hud-ab-name").textContent = d.ability.name;
      $("hud-ab-fill").style.height = `${Math.min(1, d.ability.pct) * 100}%`;
      $("hud-ab-state").textContent = ready ? (isTouch ? L("¡Toca!") : L("Espacio")) : `${Math.round(d.ability.pct * 100)}%`;
      ab.classList.toggle("is-ready", ready);
    }
    const key = JSON.stringify([d.weapons, d.passives]);
    if (key !== slotKey) { slotKey = key; renderSlots($("hud-slots"), d); }
    const boss = $("hud-boss");
    boss.hidden = !d.boss;
    if (d.boss) { $("hud-boss-name").textContent = d.boss.name; $("hud-boss-bar").style.width = `${d.boss.pct * 100}%`; }
    const team = $("hud-team");
    team.textContent = "";
    if (d.players.length > 1) {
      d.players.forEach((p, i) => {
        if (i === Game.localId) return;
        const row = el("div");
        const bar = el("span");
        const fill = el("i");
        fill.style.width = `${Math.max(0, p.hp / p.maxHp) * 100}%`;
        bar.appendChild(fill);
        row.append(el("b", "", p.down ? LT("fallen", { name: p.name }) : p.name), bar);
        team.appendChild(row);
      });
    }
  });

  function toast(text) {
    const t = el("div", "toast", text);
    $("toasts").appendChild(t);
    setTimeout(() => t.remove(), 3300);
  }

  function banner(text, small) {
    const b = $("banner");
    b.hidden = true;
    void b.offsetWidth;
    b.textContent = text;
    if (small) b.appendChild(el("small", "", small));
    b.hidden = false;
    clearTimeout(banner.t);
    banner.t = setTimeout(() => (b.hidden = true), 2700);
  }

  Game.on("toast", (d) => toast(d.text));
  Game.on("lowFx", () => toast(L("Efectos reducidos para que el juego vaya más fluido.")));
  Game.on("boss", (d) => banner(L("¡JEFE!"), d.name));
  Game.on("bossDown", (d) => toast(LT("bossDown", { name: d.name })));
  Game.on("chest", (d) => { toast(L("¡Cofre! +40 monedas")); for (const l of d.lines) toast(l); });
  Game.on("evolve", (d) => banner(L(d.name), L(d.desc)));
  Game.on("down", (d) => { if (d.id === Game.localId && Game.state.players.length > 1) toast(L("¡Has caído! Un compañero puede levantarte si se queda a tu lado.")); });

  /* ---------- subida de nivel ---------- */

  function showLevelUp(d) {
    $("levelup-title").textContent = LT("levelTitle", { n: d.level });
    const box = $("levelup-cards");
    box.textContent = "";
    $("levelup-wait").hidden = true;
    d.options.forEach((o, i) => {
      const card = el("button", "up-card");
      card.type = "button";
      const img = document.createElement("img");
      img.src = Sprites.iconUrl(o.icon, 3);
      img.alt = "";
      img.className = "pix";
      const text = el("div");
      text.append(el("span", "new", o.isNew ? L("¡NUEVO!") : ""), el("b", "", o.title), el("small", "", o.desc));
      card.append(img, text, el("kbd", "", i + 1));
      card.addEventListener("click", () => pickLevel(i));
      box.appendChild(card);
    });
    $("levelup").hidden = false;
    setTimeout(() => box.querySelector("button")?.focus(), 50);
  }

  function waitOthers() {
    $("levelup-cards").textContent = "";
    $("levelup-wait").hidden = false;
  }

  function hideLevelUp() {
    $("levelup").hidden = true;
  }

  Game.on("levelUp", showLevelUp);

  function pickLevel(i) {
    if ($("levelup").hidden || !$("levelup-cards").children.length) return;
    Sfx.play("pick");
    if (Game.mode === "guest") TronkNet.sendChoice(i);
    else Game.choose(Game.localId, i);
  }

  Game.on("chosen", () => {
    if (Game.state && Game.state.choosing && Object.keys(Game.state.choosing).length) waitOthers();
    else hideLevelUp();
  });
  Game.on("resume", hideLevelUp);

  /* ---------- pausa ---------- */

  function pause(on) {
    if (current !== "game" || !Game.state || Game.state.over) return;
    if (Game.mode === "solo") Game.setPaused(on);
    $("pause").hidden = !on;
    $("pause-quit").hidden = Game.mode === "guest";
    if (on) renderSlots($("pause-build"), Game.hudData(), true);
  }
  $("hud-pause").addEventListener("click", () => pause(true));
  $("hud-ab").addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); Game.pressAbility(); });
  $("pause-resume").addEventListener("click", () => pause(false));
  $("pause-quit").addEventListener("click", () => {
    $("pause").hidden = true;
    Game.setPaused(false);
    Game.finish(false);
  });

  /* ---------- final ---------- */

  async function showEnd(r) {
    if (Game.mode === "guest") r = { ...r, charId: save.selected, coop: true };
    if (r.daily && save.dailyDone !== r.daily) {
      save.dailyDone = r.daily;
      r.coins += 100;
      setTimeout(() => toast(LT("dailyBonus")), 400);
    }
    updateWeekly(r);
    Save.recordRun(r);
    for (const id of checkMapUnlocks()) setTimeout(() => toast(LT("mapUnlocked", { name: L(TS.MAPS[id].name) })), 1200);
    checkAchievements(r);
    TronkNet.leave();
    const points = Account.points(r);
    $("end-title").textContent = r.endless ? L("¡Fin del modo infinito!") : r.victory ? L("¡VICTORIA!") : L("¡Has caído!");
    const stats = $("end-stats");
    stats.textContent = "";
    const add = (label, value, cls) => {
      const d = el("div", cls || "");
      d.append(el("b", "", value), el("small", "", L(label)));
      stats.appendChild(d);
    };
    add("Tiempo", fmtTime(r.seconds));
    add("Nivel", r.level);
    add("Enemigos", r.kills);
    add("Jefes", r.bosses);
    if (r.endless) add("Modo infinito", fmtTime(r.endlessSeconds), "coins");
    add("Puntos", points, "coins");
    add("Monedas ganadas", `+${r.coins}`, "coins");
    hideLevelUp();
    $("pause").hidden = true;
    setTimeout(() => {
      $("end").hidden = false;
      $("end-again").focus();
    }, 900);
    Account.submitRun(r);
  }
  Game.on("end", showEnd);

  Game.on("victory", () => {
    if (Game.mode === "guest") return;
    hideLevelUp();
    $("pause").hidden = true;
    $("victory").hidden = false;
    $("victory-endless").focus();
  });
  Game.on("endless", () => banner(L("¡MODO INFINITO!"), L("Aguanta todo lo que puedas")));
  $("victory-endless").addEventListener("click", () => { $("victory").hidden = true; Game.continueEndless(); });
  $("victory-end").addEventListener("click", () => { $("victory").hidden = true; Game.endWin(); });

  function backToMenu() {
    for (const id of ["end", "levelup", "pause", "victory"]) $(id).hidden = true;
    $("hud").hidden = true;
    Game.stop();
    demoOn = false;
    show("menu");
  }

  $("end-again").addEventListener("click", () => {
    $("end").hidden = true;
    Game.stop();
    if (!lastRun || lastRun.guest || (lastRun.opts && lastRun.opts.mode === "host")) { demoOn = false; show("online"); }
    else play(lastRun.setups, lastRun.opts);
  });
  $("end-menu").addEventListener("click", backToMenu);

  /* ---------- teclado ---------- */
  window.addEventListener("keydown", (e) => {
    if (!$("levelup").hidden && /^Digit[1-4]$/.test(e.code)) {
      pickLevel(Number(e.code.slice(5)) - 1);
      return;
    }
    if (current === "game" && (e.code === "Escape" || e.code === "KeyP")) {
      if (!$("levelup").hidden || !$("end").hidden || !$("victory").hidden) return;
      pause($("pause").hidden);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && current === "game" && Game.mode === "solo" && $("levelup").hidden) pause(true);
  });

  /* ---------- botones ---------- */
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (!go) return;
    Sfx.init();
    Sfx.play("click");
    show(go.dataset.go);
  });
  $("pull-1").addEventListener("click", () => pull(1));
  $("pull-10").addEventListener("click", () => pull(10));
  $("reveal-ok").addEventListener("click", () => {
    $("gacha-reveal").hidden = true;
    renderGacha();
  });
  $("daily-play").addEventListener("click", playDaily);
  // el sonido del navegador solo arranca tras tocar algo
  window.addEventListener("pointerdown", () => Sfx.init(), { once: true });
  window.addEventListener("keydown", () => Sfx.init(), { once: true });

  /* ---------- cuenta ---------- */
  Save.setOnChange(() => Account.scheduleUpload());
  Account.onChange(() => {
    if (current === "menu") renderMenu();
  });

  /* ---------- arranque ---------- */
  applySettings();
  translatePage();
  setTimeout(async () => {
    Sprites.build();
    Game.init($("game"));
    fillIcons();
    Account.init();
    // los personajes se dibujan poco a poco para no congelar la página
    const ids = [...TS.CHARACTERS.map((c) => `char:${c.id}`), ...["zombi", "corredor", "antitronk", "ninja", "esqueleto", "murcielago", "slime"].map((id) => `enemy:${id}`)];
    let i = 0;
    const next = () => {
      if (i < ids.length) {
        $("loading-text").textContent = LT("drawing", { n: Math.round((i / ids.length) * 100) });
        Sprites.get(ids[i++]);
        setTimeout(next, 0);
      } else {
        checkMapUnlocks();
        show("menu");
      }
    };
    next();
  }, 20);

  window.TronkUI = { show, toast, banner, play, playGuest, localSetup, showLevelUp, waitOthers, hideLevelUp, showEnd, backToMenu, selectedMap: () => save.settings.map || "bosque" };
})();
