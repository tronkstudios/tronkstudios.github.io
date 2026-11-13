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
  let pulling = false;
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
    if (current === "gacha" && pulling && id !== "gacha") return;
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
    const [view, flip] = Game.options.reducedMotion ? ["downSide",false] : SPIN[spinStep % SPIN.length];
    const key = `${save.selected}:${view}:${flip}`;
    if (!spinCache[key]) {
      const img = Sprites.scaled(Stick.illustration(charById(save.selected),view), 4);
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
    spinTimer = setInterval(() => { if(current !== "menu")clearInterval(spinTimer);else if(!Game.options.reducedMotion)spinHero(); }, 1400);
    $("menu-free").hidden = !save.freePull;
    $("menu-daily").hidden = save.dailyDone === dailyConfig().day;
    $("menu-ach").hidden = (save.weekly && save.weekly.seen) === weekKey();
    const b = save.best;
    $("menu-best").textContent = b.time ? LT("best", { time: fmtTime(b.time), kills: b.kills, level: b.level }) + (b.wins ? LT("wins", { n: b.wins }) : "") : L("Aguanta hasta el minuto 25 y sobrevive a las fases del jefe final.");
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
    Game.options.healthBars = ["off","damaged","always"].includes(save.settings.healthBars)?save.settings.healthBars:"damaged";
    Game.options.numbers = save.settings.numbers !== false;
    const reduced = save.settings.reducedMotion ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.classList.toggle("reduce-motion", reduced);
    Game.options.reducedMotion = reduced;
    Game.options.contrast = save.settings.contrast === true;
    Game.options.zoom = [1,1.25,1.5].includes(Number(save.settings.zoom)) ? Number(save.settings.zoom) : 1.25;
    Game.options.shake = save.settings.shake !== false && !reduced;
    Game.resize();
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
    $("opt-bars").value=Game.options.healthBars;
    $("opt-motion").checked = Game.options.reducedMotion;
    $("opt-contrast").checked = Game.options.contrast;
    $("opt-zoom").value = Game.options.zoom;
    $("opt-tips").checked = !save.tutorial;
  }

  $("vol-music").addEventListener("input", (e) => { save.settings.musicVol = e.target.value / 100; applySettings(); renderSettings(); Save.persist(); });
  $("vol-sfx").addEventListener("input", (e) => { save.settings.sfxVol = e.target.value / 100; applySettings(); renderSettings(); Save.persist(); Sfx.play("coin", 0.15); });
  $("opt-numbers").addEventListener("change", (e) => { save.settings.numbers = e.target.checked; applySettings(); Save.persist(); });
  $("opt-shake").addEventListener("change", (e) => { save.settings.shake = e.target.checked; applySettings(); Save.persist(); });
  $("opt-fx").addEventListener("change", (e) => { save.settings.fx = e.target.value; applySettings(); Save.persist(); });
  for (const [id,key] of [["opt-motion","reducedMotion"],["opt-contrast","contrast"],["opt-zoom","zoom"]]) {
    $(id).addEventListener("change",e=>{save.settings[key]=key==="zoom"?Number(e.target.value):e.target.checked;applySettings();Save.persist();});
  }
  $("opt-bars").addEventListener("change",e=>{save.settings.healthBars=e.target.value;applySettings();Save.persist();});
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
    const characters = [...TS.CHARACTERS].sort((a,b)=>TS.RARITY_ORDER.indexOf(a.rarity)-TS.RARITY_ORDER.indexOf(b.rarity));
    for (const ch of characters) {
      const have = save.owned[ch.id];
      const card = el("button", `char-card${have ? "" : " is-locked"}${ch.id === save.selected ? " is-selected" : ""}`);
      card.type = "button";
      card.dataset.charId = ch.id;
      card.dataset.rarity = ch.rarity;
      card.setAttribute("aria-label",`${have?ch.name:L("Personaje sin conseguir")} · ${L(TS.RARITIES[ch.rarity].name)}`);
      card.style.setProperty("--rarity", TS.RARITIES[ch.rarity].color);
      const img = document.createElement("img");
      img.src = have ? Sprites.portrait(ch.id, 2) : Sprites.silhouettePortrait(ch.id, 2);
      img.alt = "";
      card.append(img, el("span", "", have ? ch.name : "???"), el("small", "char-rarity", L(TS.RARITIES[ch.rarity].name)), el("span", "stars", have ? stars(have.stars) : ""));
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
      img.src = have ? Sprites.portrait(id, 3) : Sprites.silhouettePortrait(id, 3);
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
      const moves = el("div","char-moves");
      moves.append(el("b","",L("Ataques del personaje")));
      const list = el("ul");
      list.append(el("li","",`${L(TS.WEAPONS[ch.weapon].name)} · ${L("Ataque base")}`));
      for(const move of TS.TECHNIQUES[ch.id] || []) {
        const row=el("li");row.append(el("strong","",L(move.name)),el("small","",`${L(move.desc)} · ${L("Desbloqueo")}: ${L("Nivel")} ${move.unlock || 1} · ${fmtTime(move.at || 0)} · ${move.max} ${L("rangos")}`));list.append(row);
      }
      list.append(el("li","",`${L(TS.ABILITIES[ch.id].name)} · ${L("Habilidad activa")}`));
      moves.append(list,el("small","",L("Aprende y mejora tus técnicas al subir de nivel. Solo usas el arma de tu personaje.")));
      const evo=TS.EVOLUTIONS[ch.weapon];
      if(evo)moves.append(el("p","evolution-recipe",`${L(evo.name)} = ${L(TS.WEAPONS[ch.weapon].name)} 6 + ${L(TS.PASSIVES[evo.passive].name)} + ${L("Cofre")}`));
      box.append(el("p", "", L(ch.desc)), weapon, moves, el("p", "", LT("perk", { perk: L(ch.perkText) })), btn);
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
    $("pull-1").disabled = pulling || (!save.freePull && save.coins < TS.GACHA.cost1);
    $("pull-10").disabled = pulling || save.coins < TS.GACHA.cost10;
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
    if (pulling || !$("gacha-reveal").hidden) return;
    const results = Save.pull(times);
    if (!results) return;
    pulling = true;
    $("pull-1").disabled = true; $("pull-10").disabled = true;
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
      $("gacha-reveal").scrollTop = 0;
      $("reveal-ok").focus({preventScroll:true});
      checkAchievements(null);
    }, Game.options.reducedMotion ? 0 : 900);
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

  const isTouch = window.matchMedia("(any-pointer: coarse)").matches;

  function enterGame(prepare) {
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
    const items = [...data.weapons.map((w) => ({ ...w, kind: "w" })), ...(data.techniques || []).map(m=>({...m,kind:"t"})), ...data.passives.map((p) => ({ ...p, kind: "p" }))];
    for (const it of items) {
      const slot = el("div", `hud-slot${it.kind === "t" ? " is-technique" : ""}${it.kind === "p" ? " is-passive" : ""}${it.evo ? " is-evo" : ""}`);
      if (it.kind === "t") {
        slot.dataset.technique = ["I","II","III","IV","V","VI"][["burst","ring","pierce","guard","focus","surge"].indexOf(it.id)] || "";
        slot.dataset.move = it.id;
        slot.append(el("span","tech-cooldown"));
      }
      const img = document.createElement("img");
      img.src = Sprites.iconUrl(it.icon || it.id, big ? 3 : 2);
      img.alt = "";
      slot.title = it.kind === "t" ? it.name : it.evo ? L(TS.EVOLUTIONS[it.id].name) : L((TS.WEAPONS[it.id] || TS.PASSIVES[it.id] || {}).name || "");
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
    tip.textContent = LT(isTouch && TIPS[tipIdx].text === "tipMove" ? "tipMoveTouch" : TIPS[tipIdx].text, { key: isTouch ? L("el botón redondo") : L("Espacio") });
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
    $("hud-phase").textContent = d.finalPhase ? `${L("Fase")} ${d.finalRound}` : `${L("Final")} ${fmtTime(d.finalIn)}`;
    if(d.breach)$("hud-phase").textContent+=` · ${L("Brecha")} ${d.breach.total-d.breach.remaining}/${d.breach.total}`;
    $("hud-milestone").textContent=d.nextTechnique?`${L("Próxima técnica")}: ${L(d.nextTechnique.name)} · ${L("Nivel")} ${d.nextTechnique.unlock} · ${fmtTime(d.nextTechnique.at || 0)}`:`${L("Rangos de técnicas")}: ${d.techniqueRanks}/30`;
    $("hud-sub").textContent = (d.finalPhase ? `${L("Supervivencia final")} · ` : Game.state && Game.state.endless ? `${L("Modo infinito")} · ` : "") + LT("hudSub", { map: L(TS.MAPS[Game.mapId].name), kills: d.kills, coins: d.coins });
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
    const key = JSON.stringify([d.weapons, d.techniques?.map(({ready,...move})=>move), d.passives]);
    if (key !== slotKey) { slotKey = key; renderSlots($("hud-slots"), d); }
    for(const move of d.techniques || []) {
      const slot=$("hud-slots").querySelector(`[data-move="${move.id}"]`);
      if(slot){slot.querySelector(".tech-cooldown").style.height=`${Math.round((1-move.ready)*100)}%`;slot.classList.toggle("is-ready",move.ready>=1);}
    }
    $("hud").classList.toggle("is-critical",!d.down && pct<.25);
    $("hud-status").textContent = d.down ? `${L("Reanimación")} ${Math.round((d.players[Game.localId]?.revivePct || 0)*100)}% · ${L(d.players[Game.localId]?.reviver!=null?"Mantén al compañero cerca":"Un compañero debe acercarse")}` : d.inWater ? L("Agua · movimiento al 58 %") : d.nextBossIn<=30 && !d.finalPhase ? `${L("Jefe en")} ${d.nextBossIn}s` : "";
    $("hud-compass").hidden=!d.compass;
    if(d.compass) $("hud-compass").textContent=`${d.compass.arrow} ${d.compass.label} · ${d.compass.distance}`;
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
        const label=p.disconnected?`${p.name} · ${L("Desconectado")}`:p.down?`${p.name} · ${L("Reanimación")} ${Math.round(p.revivePct*100)}%`:p.name;
        if(p.down && !p.disconnected)fill.style.width=`${p.revivePct*100}%`;
        row.classList.toggle("is-reviving",p.down && p.revivePct>0 && !p.disconnected);
        row.append(el("b", "", label), bar);
        team.appendChild(row);
      });
    }
  });

  function toast(text) {
    const t = el("div", "toast", text);
    $("toasts").appendChild(t);
    while($("toasts").children.length>4)$("toasts").firstElementChild.remove();
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
  Game.on("finalPhase", d => banner(L(d.round === 1 ? "¡JEFE FINAL!" : "¡NUEVA FASE!"), `${L("Fase")} ${d.round} · ${L("Aguanta todo lo que puedas")}`));
  Game.on("boss", (d) => banner(L("¡JEFE!"), d.name));
  Game.on("bossDown", (d) => toast(LT("bossDown", { name: d.name })));
  function showChest(d) { toast(L("¡Cofre! +40 monedas")); for (const line of d.lines) toast(line); }
  Game.on("chest", showChest);
  Game.on("evolve", (d) => banner(L(d.name), L(d.desc)));
  Game.on("down", (d) => { if (d.id === Game.localId && Game.state.players.length > 1) toast(L("¡Has caído! Un compañero puede levantarte si se queda a tu lado.")); });

  /* ---------- subida de nivel ---------- */

  function showLevelUp(d) {
    Game.setControlsEnabled(false);
    $("levelup-title").textContent = LT("levelTitle", { n: d.level });
    const box = $("levelup-cards");
    box.textContent = "";
    $("levelup-wait").hidden = true;
    const rerolls = d.rerolls ?? Game.state?.players[Game.localId]?.rerolls ?? 0;
    $("levelup-reroll").textContent=`${L("Cambiar opciones")} · ${rerolls}/3`;
    $("levelup-reroll").disabled=rerolls<=0;
    d.options.forEach((o, i) => {
      const card = el("button", `up-card${o.kind==="technique"&&o.id==="surge"?" is-ultimate":""}${o.synergy?" is-synergy":""}${o.kind==="technique"?" is-technique":""}`);
      card.type = "button";
      const img = document.createElement("img");
      img.src = Sprites.iconUrl(o.icon, 3);
      img.alt = "";
      img.className = "pix";
      const text = el("div");
      text.append(el("span", "new", o.isNew ? L("¡NUEVO!") : ""), el("b", "", o.title), el("small", "", o.desc));
      if(o.synergy)text.append(el("span","synergy-note",L("Necesario para evolucionar")));
      card.append(img, text, el("kbd", "", i + 1));
      card.addEventListener("click", () => pickLevel(i));
      box.appendChild(card);
    });
    $("levelup").hidden = false;
    setTimeout(() => box.querySelector("button")?.focus(), 50);
  }

  function waitOthers() {
    $("levelup-reroll").disabled=true;
    $("levelup-cards").textContent = "";
    $("levelup-wait").hidden = false;
  }

  function hideLevelUp() {
    $("levelup").hidden = true;
    Game.setControlsEnabled($("pause").hidden && $("end").hidden);
  }

  Game.on("levelUp", showLevelUp);
  $("levelup-reroll").addEventListener("click",()=>{
    if($("levelup-reroll").disabled)return;
    if(Game.mode==="guest") {$("levelup-reroll").disabled=true;for(const card of $("levelup-cards").children)card.disabled=true;TronkNet.sendReroll();}
    else Game.reroll(Game.localId);
  });

  function pickLevel(i) {
    if ($("levelup").hidden || !$("levelup-cards").children[i] || $("levelup-cards").children[i].disabled) return;
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
    Game.setControlsEnabled(!on && $("levelup").hidden);
    if (Game.mode === "solo") Game.setPaused(on);
    $("pause").hidden = !on;
    $("pause-quit").hidden = Game.mode === "guest";
    if (on) {
      const d=Game.hudData();renderSlots($("pause-build"),d,true);
      const evo=d.evolution;
      $("pause-evolution").textContent=evo?evo.evolved?`${L("Evolución")}: ${evo.name} ✓`:
        `${evo.name}
${evo.weapon} ${evo.level}/6 · ${evo.passive} ${evo.hasPassive?"✓":evo.blocked?L("Sin espacio para la pasiva"):"—"}
${L("Recoge un cofre con ambos requisitos")}`:"";
      $("pause-metrics").textContent="";
      for(const [label,value] of [["Daño causado",d.combat.dealt],["Daño recibido",d.combat.taken],["Vida recuperada",d.combat.healed],["Élites",d.combat.elites]]){
        const stat=el("div");stat.append(el("b","",Math.round(value || 0).toLocaleString(LANG)),el("small","",L(label)));$("pause-metrics").append(stat);
      }
      $("pause-fullscreen").hidden=!document.fullscreenEnabled;
      $("pause-resume").focus();
    } else if(!$("levelup").hidden) $("levelup-cards").querySelector("button")?.focus();
  }
  $("hud-pause").addEventListener("click", () => pause(true));
  $("hud-ab").addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); Game.pressAbility(); });
  $("pause-fullscreen").addEventListener("click",async()=>{
    try {if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch {toast(L("Pantalla completa no disponible"));}
  });
  $("pause-resume").addEventListener("click", () => pause(false));
  $("pause-quit").addEventListener("click", () => {
    $("pause").hidden = true;
    Game.setPaused(false);
    Game.finish(false);
  });

  /* ---------- final ---------- */

  async function showEnd(r) {
    Game.setControlsEnabled(false);
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
    $("end-title").textContent = r.finalPhase ? L("Fin de supervivencia") : r.endless ? L("¡Fin del modo infinito!") : r.victory ? L("¡VICTORIA!") : L("¡Has caído!");
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
    const combat=r.combat?.[Game.localId];
    if(combat){add("Daño causado",Math.round(combat.dealt || 0).toLocaleString(LANG));add("Daño recibido",Math.round(combat.taken || 0).toLocaleString(LANG));add("Vida recuperada",Math.round(combat.healed || 0).toLocaleString(LANG));add("Élites",combat.elites || 0);}
    if(r.chests)add("Cofres",r.chests);
    if (r.finalPhase) add("Fases superadas", Math.max(0, r.finalRound - 1));
    if (r.finalPhase) add("Contra el jefe final", fmtTime(r.endlessSeconds), "coins");
    else if (r.endless) add("Modo infinito", fmtTime(r.endlessSeconds), "coins");
    add("Puntos", points, "coins");
    add("Monedas ganadas", `+${r.coins}`, "coins");
    hideLevelUp();
    $("pause").hidden = true;
    Game.setControlsEnabled(false);
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
    Game.setControlsEnabled(false);
    $("pause").hidden = true;
    $("victory").hidden = false;
    $("victory-endless").focus();
  });
  Game.on("endless", () => banner(L("¡MODO INFINITO!"), L("Aguanta todo lo que puedas")));
  $("victory-endless").addEventListener("click", () => { $("victory").hidden = true; Game.setControlsEnabled(true); Game.continueEndless(); });
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
    if (!e.repeat && !$("levelup").hidden && /^Digit[1-4]$/.test(e.code)) {
      pickLevel(Number(e.code.slice(5)) - 1);
      return;
    }
    if (current === "game" && (e.code === "Escape" || e.code === "KeyP")) {
      if (!$("levelup").hidden || !$("end").hidden || !$("victory").hidden) return;
      if (!e.repeat) pause($("pause").hidden);
    }
  });
  window.addEventListener("blur",()=>{
    if(current==="game" && Game.mode==="solo" && $("levelup").hidden)pause(true);
  });
  document.addEventListener("keydown",e=>{
    if(e.key!=="Tab")return;
    const modal=[...document.querySelectorAll(".modal:not([hidden]), .gacha-reveal:not([hidden])")].pop();
    if(!modal)return;
    const buttons=[...modal.querySelectorAll("button:not([disabled]),a[href],input,select")].filter(e=>e.getClientRects().length);
    if(!buttons.length)return;
    const first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey && (document.activeElement===first || !modal.contains(document.activeElement))){e.preventDefault();last.focus();}
    else if(!e.shiftKey && (document.activeElement===last || !modal.contains(document.activeElement))){e.preventDefault();first.focus();}
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
    pulling = false;
    renderGacha();
    $("pull-1").focus();
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

  window.TronkUI = { show, toast, banner, play, playGuest, localSetup, showLevelUp, waitOthers, hideLevelUp, showEnd, showChest, backToMenu, selectedMap: () => save.settings.map || "bosque" };
})();
