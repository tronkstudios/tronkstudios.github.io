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
  let gameGeneration=0;
  let previewTimer=0;
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
    const renders = { menu: renderMenu, chars: renderChars, gacha: renderGacha, shop: renderShop, maps: renderMaps, daily: renderDaily, achievements: renderAchievements, settings: renderSettings, history:renderHistory };
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
    if(b.streak>0)$("menu-best").textContent+=` · ${L("Mejor racha")}: ${b.streak}`;
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
  $("run-veteran").addEventListener("change", event => {
    save.settings.veteran = event.target.checked;
    Save.persist();
  });
  function renderMaps() {
    const grid = $("maps-grid");
    $("run-veteran").checked = !!save.settings.veteran;
    $("veteran-best").textContent = save.bestVeteran.time
      ? `${L("Récord Veterano")} · ${fmtTime(save.bestVeteran.time)} · ${save.bestVeteran.kills} ${L("enemigos derrotados")}` : "";
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
        play(null, { mode: "solo", localId: 0, map: id, veteran: !!save.settings.veteran });
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

  function scheduleNotice(callback,delay){
    const generation=gameGeneration;
    setTimeout(()=>{if(generation===gameGeneration)callback();},delay);
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
      got.forEach((a, i) => scheduleNotice(() => { toast(LT("achDone", { name: L(a.name), n: a.reward })); Sfx.play("chest"); }, 600 + i * 900));
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
    done.forEach((m, i) => scheduleNotice(() => { toast(LT("missionDone", { name: missionText(m), n: m.reward })); Sfx.play("chest"); }, 1800 + i * 900));
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
    Game.options.softAttacks = save.settings.softAttacks === true;
    Game.options.cameraLead=save.settings.cameraLead===true;document.body.classList.toggle("compact-hud",save.settings.compactHud===true);
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
    $("opt-soft-attacks").checked = Game.options.softAttacks;
    $("opt-contrast").checked = Game.options.contrast;$("opt-compact").checked=save.settings.compactHud===true;$("opt-lead").checked=save.settings.cameraLead===true;
    $("opt-zoom").value = Game.options.zoom;
    $("opt-tips").checked = !save.tutorial;
  }

  $("vol-music").addEventListener("input", (e) => { save.settings.musicVol = e.target.value / 100; applySettings(); renderSettings(); Save.persist(); });
  $("vol-sfx").addEventListener("input", (e) => { save.settings.sfxVol = e.target.value / 100; applySettings(); renderSettings(); Save.persist(); Sfx.play("coin", 0.15); });
  $("sfx-preview").addEventListener("click",()=>{
    if((save.settings.sfxVol ?? .9)===0){toast(L("Sube el volumen de efectos para probarlos."));return;}
    Sfx.init();Sfx.play($("sfx-sample").value,.3);
  });
  $("opt-numbers").addEventListener("change", (e) => { save.settings.numbers = e.target.checked; applySettings(); Save.persist(); });
  $("opt-shake").addEventListener("change", (e) => { save.settings.shake = e.target.checked; applySettings(); Save.persist(); });
  $("opt-fx").addEventListener("change", (e) => { save.settings.fx = e.target.value; applySettings(); Save.persist(); });
  for (const [id,key] of [["opt-motion","reducedMotion"],["opt-soft-attacks","softAttacks"],["opt-contrast","contrast"],["opt-zoom","zoom"]]) {
    $(id).addEventListener("change",e=>{save.settings[key]=key==="zoom"?Number(e.target.value):e.target.checked;applySettings();Save.persist();});
  }
  for(const [id,key]of [["opt-compact","compactHud"],["opt-lead","cameraLead"]])$(id).addEventListener("change",e=>{save.settings[key]=e.target.checked;applySettings();Save.persist();});
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

  function renderHistory(){
    for(const [id,items]of [["history-char",TS.CHARACTERS.map(c=>[c.id,c.name])],["history-map",Object.entries(TS.MAPS).map(([id,m])=>[id,L(m.name)])]]){
      const select=$(id);if(!select.options.length){const any=el("option","",L("Todos"));any.value="";select.append(any);for(const [value,name]of items){const o=el("option","",name);o.value=value;select.append(o);}}
    }
    const list=$("history-list");list.textContent="";const rows=(save.history || []).filter(r=>(!$("history-char").value || r.charId===$("history-char").value) && (!$("history-map").value || r.map===$("history-map").value));
    for(const r of rows){const row=el("li"),ch=charById(r.charId);row.append(el("b","",`${ch?.name || r.charId} · ${L(TS.MAPS[r.map].name)}`),el("span","",`${fmtTime(r.seconds)} · ${L("Nivel")} ${r.level} · ${new Date(r.at).toLocaleDateString(LANG)}`),el("small","",r.signature?L("Configuración registrada"):L("Partida antigua: sin equivalencia de reglas")));list.append(row);}
    if(!rows.length)list.append(el("li","",L("Todavía no hay partidas para este filtro.")));
  }
  for(const id of ["history-char","history-map"])$(id).addEventListener("change",renderHistory);

  function renderChars() {
    const grid = $("chars-grid");
    grid.textContent = "";
    $("chars-count").textContent = `${Object.keys(save.owned).length} / ${TS.CHARACTERS.length}`;
    const family=$("char-family");if(family.options.length===1)for(const id of [...new Set(TS.CHARACTERS.map(c=>TS.WEAPONS[c.weapon].family || c.weapon))]){const option=el("option","",L(TS.WEAPONS[id].name));option.value=id;family.append(option);}
    const query=$("char-search").value.trim().toLocaleLowerCase();
    const filtered=TS.CHARACTERS.filter(c=>(!query || c.name.toLocaleLowerCase().includes(query)) && ($("char-owned").value!=="owned" || save.owned[c.id]) && (family.value==="all" || (TS.WEAPONS[c.weapon].family || c.weapon)===family.value));
    $("char-filter-count").textContent=`${filtered.length} ${L("resultados")}`;
    const characters = [...filtered].sort((a,b)=>TS.RARITY_ORDER.indexOf(a.rarity)-TS.RARITY_ORDER.indexOf(b.rarity));
    for (const ch of characters) {
      const have = save.owned[ch.id];
      const card = el("button", `char-card${have ? "" : " is-locked"}${ch.id === save.selected ? " is-selected" : ""}`);
      card.type = "button";
      card.dataset.charId = ch.id;
      card.dataset.rarity = ch.rarity;
      card.setAttribute("aria-label",`${ch.name} · ${L(TS.RARITIES[ch.rarity].name)}${have ? "" : ` · ${L("Bloqueado")}`}`);
      card.style.setProperty("--rarity", TS.RARITIES[ch.rarity].color);
      const img = document.createElement("img");
      img.src = have ? Sprites.portrait(ch.id, 2) : Sprites.silhouettePortrait(ch.id, 2);
      img.alt = "";
      card.append(img, el("span", "", ch.name), el("small", "char-rarity", L(TS.RARITIES[ch.rarity].name)), el("span", "stars", have ? stars(have.stars) : ""));
      card.addEventListener("click", () => {
        selectedView = ch.id;
        Sfx.play("click");
        if (have) {
          save.selected = ch.id;
          Save.persist();
        }
        renderChars();
        if(window.matchMedia("(max-width: 700px)").matches)$("char-detail").scrollIntoView({block:"start"});
      });
      grid.appendChild(card);
    }
    renderDetail(selectedView);
  }

  for(const id of ["char-search","char-owned","char-family"])$(id).addEventListener(id==="char-search"?"input":"change",renderChars);

  function renderDetail(id) {
    clearTimeout(previewTimer);
    const ch = charById(id);
    const have = save.owned[id];
    const box = $("char-detail");
    box.textContent = "";
    if(window.matchMedia("(max-width: 700px)").matches){const back=el("button","btn btn-small",L("Volver al plantel"));back.type="button";back.addEventListener("click",()=>{const card=$("chars-grid").querySelector(`[data-char-id="${id}"]`);card?.scrollIntoView({block:"center"});card?.focus({preventScroll:true});});box.append(back);}
    const big = el("div", "big");
    for (const view of ["down"]) {
      const img = document.createElement("img");
      img.src = have ? Sprites.portrait(id, 3) : Sprites.silhouettePortrait(id, 3);
      img.alt = "";
      big.appendChild(img);
    }
    const rarity = el("span", "rarity", `${L(TS.RARITIES[ch.rarity].name)}${ch.from === "Tronk Fight" ? ` · ${L("de Tronk Fight")}` : ""}${have ? ` · ${stars(have.stars)}` : ""}`);
    rarity.style.color = TS.RARITIES[ch.rarity].color;
    box.append(big, el("h3", "", ch.name), rarity);
    const stats = el("dl", "profile-stats");
    for (const { label, value, unit } of Game.characterStats(id, have?.stars || 1, Save.shopStats())) {
      const row = el("div");
      row.append(el("dt", "", L(label)), el("dd", "", value.toLocaleString(LANG) + unit));
      stats.append(row);
    }
    box.append(el("h4", "profile-stats-title", L("Estadísticas de inicio")), stats);
    const practice = el("div", "practice-controls");
    const target = el("select");
    target.setAttribute("aria-label", L("Objetivo de práctica"));
    for (const [value,label] of [["dummy","Muñeco"],["shield","Guardián con escudo"]]) {
      const option = el("option", "", L(label));option.value=value;target.append(option);
    }
    const practiceButton = el("button", "btn btn-small", L("Campo de pruebas"));
    practiceButton.type = "button";
    practiceButton.addEventListener("click", () => play([{charId:id,stars:have?.stars || 1,meta:Save.shopStats()}], {map:"bosque",training:target.value}));
    practice.append(target,practiceButton);
    box.append(practice);
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
      const preview=el("section","character-preview"),canvas=el("canvas"),select=el("select","preview-move"),rank=el("select","preview-rank"),previewDescription=el("p","preview-description"),replay=el("button","btn",L("Ver ataque"));
      canvas.width=600;canvas.height=260;canvas.setAttribute("role","img");canvas.setAttribute("aria-label",`${ch.name} · ${L("Demostración de ataques")}`);
      select.setAttribute("aria-label",L("Ataque de demostración"));replay.type="button";
      for(const [value,name] of [["weapon",TS.WEAPONS[ch.weapon].name],...(TS.TECHNIQUES[id] || []).map(m=>[m.id,m.name]),["active",TS.ABILITIES[id].name],...["precision","echo"].map(path=>[`active:${path}`,TS.activePathName(id,path)])]){
        const option=el("option","",L(name));option.value=value;select.append(option);
      }
      const rankLabel=el("label","preview-rank-label",L("Rango"));rank.setAttribute("aria-label",L("Rango del arma o técnica"));
      for(let n=1;n<=5;n++){const option=el("option","",n);option.value=n;rank.append(option);}rank.value="3";rankLabel.append(rank);
      const controls=el("div","preview-controls");controls.append(select,rankLabel,replay);preview.append(canvas,controls,previewDescription);box.append(preview);
      const runPreview=()=>{
        clearTimeout(previewTimer);let frame=0;
        const [move,path]=select.value.split(":");rank.disabled=move==="active";
        previewDescription.textContent=path?`${L(TS.activePathDescription(id,path))} ${id==="duna"?"":L(TS.ACTIVE_PATHS[path].desc)}`:move==="active"?L(TS.ABILITIES[id].desc):L(TS.TECHNIQUES[id].find(m=>m.id===move)?.desc || TS.WEAPONS[ch.weapon].desc);
        const tick=()=>{if(!canvas.isConnected || current!=="chars")return;
          Game.characterPreview(canvas,id,move,Game.options.reducedMotion?12:frame,{rank:rank.disabled?3:Number(rank.value),activePath:path});
          if(!Game.options.reducedMotion && frame<80){frame+=2;previewTimer=setTimeout(tick,1000/30);}
        };tick();
      };
      rank.addEventListener("change",runPreview);select.addEventListener("change",runPreview);replay.addEventListener("click",runPreview);previewTimer=setTimeout(runPreview,0);
      const moves = el("div","char-moves");
      moves.append(el("b","",L("Ataques del personaje")));
      const list = el("ul");
      list.append(el("li","",`${L(TS.WEAPONS[ch.weapon].name)} · ${L("Ataque base")}`));
      for(const move of TS.TECHNIQUES[ch.id] || []) {
        const row=el("li");if(move.icon){const img=document.createElement("img");img.src=Sprites.iconUrl(move.icon,2);img.alt="";img.className="move-icon pix";row.append(img);}row.append(el("strong","",L(move.name)),el("small","",`${L(move.desc)} · ${L("Desbloqueo")}: ${L("Nivel")} ${move.unlock || 1} · ${fmtTime(move.at || 0)} · ${move.max} ${L("rangos")}`));list.append(row);
      }
      list.append(el("li","",`${L(TS.ABILITIES[ch.id].name)} · ${L("Habilidad activa")}`));
      const guard=TS.TECHNIQUES[ch.id].find(m=>m.id==="guard"),focus=TS.TECHNIQUES[ch.id].find(m=>m.id==="focus");
      if(guard && focus)moves.append(el("p","evolution-recipe",`${L(guard.name)} → ${L(focus.name)}: ${L("+35 % de daño si se enlazan en 3 segundos.")}`));
      moves.append(list,el("small","",L("Aprende y mejora tus técnicas al subir de nivel. Solo usas el arma de tu personaje.")));
      moves.append(el("p","evolution-recipe",`${L("Especializaciones")}: ${TS.TALENT_STAGES.map(s=>`${L("Nivel")} ${s.level} · ${fmtTime(s.at)}`).join(" / ")}`));
      const evo=TS.EVOLUTIONS[ch.weapon];
      if(evo)moves.append(el("p","evolution-recipe",`${L(evo.name)} = ${L(TS.WEAPONS[ch.weapon].name)} 6 + ${L(TS.PASSIVES[evo.passive].name)} + ${L("Cofre")} · ${L("Dos caminos de evolución")}`));
      box.append(el("p", "", L(ch.desc)), weapon, moves, el("p", "", LT("perk", { perk: L(ch.perkText) })), btn);
    } else {
      const btn = el("button", "btn btn-gold", L("Ir al cofre"));
      btn.addEventListener("click", () => show("gacha"));
      const newcomer=TS.NEW_ROSTER.find(c=>c.id===id),keys={runs:"partidas",kills:"enemigos derrotados",bosses:"jefes derrotados",time:"segundos de supervivencia"};
      box.append(el("p","",newcomer?`${L("También se desbloquea jugando")}: ${newcomer.unlock.value} ${L(keys[newcomer.unlock.key])}.`:L("Consíguelo en el Cofre Tronk con las monedas que ganas jugando.")),btn);
      if (RewardedAds.configured) {
        const { count, total } = Save.adUnlockProgress(id);
        const progress = el("progress", "ad-unlock-progress");
        progress.max = total;
        progress.value = count;
        progress.setAttribute("aria-label", L("Anuncios completados"));
        const text = `${L("Anuncios completados")} · ${count}/${total}`;
        box.append(el("small", "", text), progress, adButton("character", ch));
      }
    }
  }

  /* =======================================================
     COFRE
     ======================================================= */

  const coinAdReady = () => Date.now() - save.lastCoinAd >= RewardedAds.cooldown;

  function adButton(kind, character) {
    const label = kind === "character"
      ? `${L("Ver anuncio para desbloquear a")} ${character.name}`
      : kind === "chest" ? L("Ver anuncio · 5 aperturas gratis") : L("Ver anuncio · +50 monedas");
    const button = el("button", "btn btn-small", label);
    button.type = "button";
    const available = () => kind === "character" ? !save.owned[character.id]
      : kind === "chest" ? Save.canEarnAdPulls() : coinAdReady();
    function refresh() {
      button.disabled = pulling || RewardedAds.pending || !available();
      button.textContent = available() ? label : kind === "chest" ? L("Cinco aperturas disponibles cada 24 h") : L("Vuelve más tarde para ganar monedas");
    }
    refresh();
    if (kind !== "character" && !available()) {
      const cooldown = kind === "chest" ? Save.chestAdCooldown : RewardedAds.cooldown;
      const last = kind === "chest" ? save.lastChestAd : save.lastCoinAd;
      setTimeout(() => { if (button.isConnected) refresh(); }, Math.max(0, Math.min(cooldown, last + cooldown - Date.now())));
    }
    button.addEventListener("click", async () => {
      if (pulling || button.disabled || RewardedAds.pending || !available()) return;
      button.disabled = true;
      button.textContent = L("Buscando anuncio…");
      const screen = current;
      const granted = await RewardedAds.request(() => current === screen && button.isConnected);
      if (granted && kind === "character") {
        const progress = Save.recordUnlockAd(character.id);
        if (progress) toast(progress.unlocked
          ? `${L("Personaje desbloqueado")} · ${character.name}`
          : `${L("Anuncios completados")} · ${progress.count}/${progress.total}`);
      } else if (granted && kind === "chest") {
        if (Save.recordChestAd()) toast(L("Cinco aperturas guardadas"));
      } else if (granted && coinAdReady()) {
        save.lastCoinAd = Date.now();
        Save.addCoins(RewardedAds.coins);
        syncCoins();
        toast(L("+50 monedas"));
      } else if (!granted && current === screen) {
        toast(L("No se completó ningún anuncio. Puedes volver a intentarlo."));
      }
      if (current === "chars") renderChars();
      if (current === "gacha" && !pulling) renderGacha();
    });
    return button;
  }

  function renderGacha() {
    syncCoins();
    const rewards = $("gacha-rewarded");
    rewards.replaceChildren();
    const freeBatch = Save.hasAdPulls();
    rewards.hidden = !RewardedAds.configured && !freeBatch;
    if (freeBatch) {
      const redeem = el("button", "btn btn-gold", L("Abrir 5 gratis"));
      redeem.type = "button";
      redeem.disabled = pulling || RewardedAds.pending;
      redeem.addEventListener("click", () => pull(5));
      rewards.append(redeem);
    } else if (RewardedAds.configured) rewards.append(adButton("chest"));
    if (RewardedAds.configured) rewards.append(adButton("coins"));
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

  let revealGeneration=0,revealTimer=0,revealResults=[],revealAnimations=[];
  function rewardCard(r){
    const card=el("div",`reveal-card${r.kind==="new"?" is-new":""}`);card.style.setProperty("--rarity",TS.RARITIES[r.ch.rarity].color);card.dataset.rewardCharacter=r.ch.id;
    const img=document.createElement("img");img.src=Sprites.portrait(r.ch.id,2);img.alt="";
    card.append(img,el("b","",r.ch.name),el("span","tag",L(TS.RARITIES[r.ch.rarity].name)),el("small","",r.kind==="star"?LT("stars",{n:r.stars}):r.kind==="coins"?LT("plusCoins",{n:r.coins}):L("¡NUEVO!")));return card;
  }
  function finishReveal(){
    revealGeneration++;clearTimeout(revealTimer);for(const a of revealAnimations)a.cancel();revealAnimations=[];
    const cards=$("reveal-cards");cards.textContent="";for(const r of revealResults)cards.append(rewardCard(r));
    $("reveal-theatre").classList.add("is-open");$("reveal-theatre").classList.remove("is-emerging");$("reveal-hero").classList.remove("is-emerging");
    const last=revealResults.at(-1);if(last){$("reveal-hero").src=Sprites.portrait(last.ch.id,4);$("reveal-hero").style.opacity="1";}
    $("reveal-skip").hidden=true;$("reveal-ok").hidden=false;$("gacha-reveal").setAttribute("aria-busy","false");$("reveal-identity").textContent=L("Tus personajes ya están guardados.");$("reveal-ok").focus({preventScroll:true});checkAchievements(null);
  }
  function pull(times){
    if(pulling || RewardedAds.pending || !$("gacha-reveal").hidden)return;
    const results=Save.pull(times);if(!results)return;
    pulling=true;revealResults=results;const generation=++revealGeneration;clearTimeout(revealTimer);
    $("pull-1").disabled=$("pull-10").disabled=true;syncCoins();
    const overlay=$("gacha-reveal"),theatre=$("reveal-theatre"),cards=$("reveal-cards"),hero=$("reveal-hero");
    overlay.hidden=false;overlay.classList.toggle("is-ten",times>1);overlay.scrollTop=0;overlay.setAttribute("aria-busy","true");
    cards.textContent="";for(const [i]of results.entries()){const slot=el("div","reveal-slot");slot.dataset.slot=i;slot.setAttribute("aria-label",`${L("Premio")} ${i+1}`);cards.append(slot);}
    theatre.classList.remove("is-open","is-emerging");hero.removeAttribute("src");hero.style.opacity="0";$("reveal-ok").hidden=true;$("reveal-skip").hidden=false;$("reveal-skip").focus({preventScroll:true});
    $("reveal-identity").textContent=L("Abriendo el cofre…");Sfx.play("gachaRoll");
    if(Game.options.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches){finishReveal();return;}
    const later=(fn,ms)=>{revealTimer=setTimeout(()=>{if(generation===revealGeneration)fn();},ms);};
    const showOne=i=>{
      if(i>=results.length){finishReveal();return;}
      const r=results[i],slot=cards.children[i];hero.src=Sprites.portrait(r.ch.id,4);hero.style.opacity="1";hero.style.setProperty("--rarity",TS.RARITIES[r.ch.rarity].color);
      theatre.classList.add("is-open");hero.classList.remove("is-emerging");void hero.offsetWidth;hero.classList.add("is-emerging");
      $("reveal-identity").textContent=`${i+1}/${results.length} · ${r.ch.name} · ${L(TS.RARITIES[r.ch.rarity].name)} · ${r.kind==="new"?L("¡NUEVO!"):r.kind==="star"?LT("stars",{n:r.stars}):LT("plusCoins",{n:r.coins})}`;
      Sfx.play(r.ch.rarity==="legendario"?"legend":"reveal",.1);
      later(()=>{
        const from=hero.getBoundingClientRect(),to=slot.getBoundingClientRect();
        const dx=to.x+to.width/2-from.x-from.width/2,dy=to.y+to.height/2-from.y-from.height/2;
        const animation=hero.animate([{transform:"translate(-50%,0) scale(1)",opacity:1},{transform:`translate(calc(-50% + ${dx}px),${dy}px) scale(.23)`,opacity:.25}],{duration:380,easing:"cubic-bezier(.4,0,.2,1)",fill:"forwards"});revealAnimations=[animation];
        later(()=>{animation.cancel();revealAnimations=[];slot.classList.add("is-filled");slot.append(rewardCard(r));hero.classList.remove("is-emerging");hero.style.opacity="0";later(()=>showOne(i+1),100);},390);
      },results.length===1?1050:650);
    };
    later(()=>{theatre.classList.add("is-open");later(()=>showOne(0),420);},350);
  }
  $("reveal-skip").addEventListener("click",finishReveal);

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

  function clearTransientUI(){
    clearTimeout(banner.t);$("banner").hidden=true;$("banner").textContent="";$("toasts").textContent="";$("hud-tip").hidden=true;
  }

  function enterGame(prepare) {
    clearTransientUI();
    const generation=++gameGeneration;
    for (const s of document.querySelectorAll(".screen")) s.classList.remove("is-on");
    for (const id of ["levelup", "pause", "end", "victory"]) $(id).hidden = true;
    current = "game";
    $("hud").hidden = false;
    $("loading").classList.add("is-on");
    $("loading-text").textContent = L("Preparando la partida…");
    setTimeout(() => {
      if(generation!==gameGeneration || current!=="game")return;
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
    if (o.mode === "solo" && !o.daily && !o.veteran && !o.training && save.runs < 3) o.easy = true;
    lastRun = { setups:structuredClone(s), opts:structuredClone(o) };
    for (const x of s) Sprites.get(`char:${x.charId}`);
    if (!o.training && !o.veteran) Account.startRun();
    enterGame(() => {
      Game.start(s, o);
      if (!o.training) startTips(o.easy);
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
      const slot = el(big ? "button" : "div", `hud-slot${it.kind === "t" ? " is-technique" : ""}${it.kind === "p" ? " is-passive" : ""}${it.evo ? " is-evo" : ""}`);
      if (it.kind === "t") {
        slot.dataset.technique = ["I","II","III","IV","V","VI","VII","VIII","IX","X"][["burst","ring","pierce","crossfire","guard","pursuit","focus","bastion","rupture","surge"].indexOf(it.id)] || "";
        slot.dataset.move = it.id;
        slot.append(el("span","tech-cooldown"));if(it.id==="focus")slot.append(el("span","link-time"));
      }
      const img = document.createElement("img");
      img.src = Sprites.iconUrl(it.icon || it.id, big ? 3 : 2);
      img.alt = "";
      slot.title = it.kind === "t" ? it.name : it.evo ? Game.evolutionName(it.id,it.path) : L((TS.WEAPONS[it.id] || TS.PASSIVES[it.id] || {}).name || "");
      slot.append(img, el("i", "", it.evo ? "★" : it.lvl));
      if(big){
        slot.type="button";slot.dataset.item=`${it.kind}:${it.id}`;
        slot.setAttribute("aria-label",`${slot.title} · ${L("Rango")} ${it.lvl}`);
        slot.setAttribute("aria-pressed","false");slot.setAttribute("aria-controls","pause-item-detail");
        slot.addEventListener("click",()=>inspectEquipment(it,data,box));
      }
      box.appendChild(slot);
    }
  }

  function equipmentDefinition(it){
    const player=Game.state?.players[Game.localId];
    return it.kind==="t" ? TS.TECHNIQUES[player?.charId]?.find(move=>move.id===it.id) : (it.kind==="p"?TS.PASSIVES:TS.WEAPONS)[it.id];
  }

  function equipmentPanel(){
    let panel=$("pause-item-detail");
    if(!panel){panel=el("section","equipment-detail");panel.id="pause-item-detail";panel.setAttribute("aria-live","polite");$("pause-build").after(panel);}
    return panel;
  }

  function inspectEquipment(it,data,box){
    const def=equipmentDefinition(it);if(!def)return;
    const panel=equipmentPanel(),player=Game.state.players[Game.localId];panel.textContent="";
    for(const button of box.querySelectorAll("button"))button.setAttribute("aria-pressed",String(button.dataset.item===`${it.kind}:${it.id}`));
    const name=it.evo?Game.evolutionName(it.id,it.path):L(def.name),max=def.max || def.levels?.length || 5;
    const title=el("div","equipment-heading");title.append(el("b","",name),el("span","",`${L("Rango")} ${it.lvl}/${max}${it.lvl>=max?` · ${L("Rango máximo")}`:""}`));panel.append(title);
    const evolution=it.evo?(TS.EVOLUTION_PATHS[it.id] || TS.EVOLUTION_PATHS)[it.path || "precision"]:null;
    panel.append(el("p","",`${it.kind==="p"?`${L("Por rango")}: `:""}${L(evolution?.desc || def.desc)}`));
    if(it.kind==="t")panel.append(el("small","",`${L("Recarga")}: ${(def.cd/60*player.stats.cdMul).toLocaleString(LANG,{maximumFractionDigits:1})} s`));
    const values=it.kind==="p"?null:data.combat?.bySkill?.[it.kind==="w"?"weapon":it.id];
    if(values)panel.append(el("small","equipment-performance",`${L("Daño causado")}: ${Math.round(values.damage || 0).toLocaleString(LANG)} · ${L("Curación")}: ${Math.round(values.healing || 0).toLocaleString(LANG)} · ${L("Aplicaciones de control")}: ${values.control || 0}`));
  }

  function upgradeRanks(option){
    const player=Game.state?.players[Game.localId];if(!player)return null;
    const def=option.kind==="technique"?TS.TECHNIQUES[player.charId]?.find(move=>move.id===option.id):option.kind==="weapon"?TS.WEAPONS[option.id]:option.kind==="passive"?TS.PASSIVES[option.id]:null;
    if(!def || !Number.isInteger(option.lvl))return null;
    // Choice packets can arrive before the guest snapshot; the offered rank is authoritative.
    const before=Math.max(0,option.lvl-1);
    const max=def.max || def.levels?.length || 5;
    const track=el("span","upgrade-ranks");track.append(el("span","",`${L("Rango")} ${before} → ${option.lvl}/${max}${option.lvl>=max?` · ${L("Rango máximo")}`:""}`));
    const steps=el("span","rank-steps");steps.setAttribute("aria-hidden","true");
    for(let rank=1;rank<=max;rank++)steps.append(el("i",rank<=before?"is-owned":rank<=option.lvl?"is-next":""));
    track.append(steps);return track;
  }

  /* ---------- consejos de la primera partida ---------- */
  const TIPS = [
    { at: 1, text: "tipMove" },
    { at: 9, text: "tipGems" },
    { at: 17,text:"tipDash" },
    { at: 22, text: "tipProps" },
    { at: 34, text: "tipAbility" },
    { at: 50, text: "tipRanged" }
  ];
  let tipIdx = -1;
  let tipUntil = 0;
  function startTips(easy) {
    tipIdx = save.tutorial ? TIPS.length : 0;
    $("hud-tip").hidden = true;
    if (easy) scheduleNotice(() => toast(L("Primeras partidas: los enemigos pegan un 25 % menos.")), 1500);
  }
  function updateTips(seconds) {
    const tip = $("hud-tip");
    if (!tip.hidden && seconds >= tipUntil) tip.hidden = true;
    if (tipIdx < 0 || tipIdx >= TIPS.length || seconds < TIPS[tipIdx].at) return;
    tip.textContent = LT(isTouch && TIPS[tipIdx].text === "tipMove" ? "tipMoveTouch" : TIPS[tipIdx].text, { key:TIPS[tipIdx].text==="tipDash"?(isTouch?L("Impulso"):L("Mayúsculas")):isTouch?L("el botón redondo"):L("Espacio") });
    tip.hidden = false;
    tipUntil = seconds + 7;
    tipIdx++;
    if (tipIdx >= TIPS.length) { save.tutorial = true; Save.persist(); }
  }

  let slotKey = "";
  Game.on("hud", (d) => {
    updateTips(d.seconds);
    $("hud-xp-bar").style.width = `${Math.min(100, (d.xp / d.xpNext) * 100)}%`;
    const loot=$("hud-loot");loot.hidden=!d.loot;
    if(d.loot)loot.textContent=[d.loot.xp>0?`+${Math.round(d.loot.xp)} XP`:"",d.loot.coins>0?`+${d.loot.coins} ${L("monedas")}`:"",d.loot.healed>0?`+${Math.round(d.loot.healed)} ${L("vida")}`:""].filter(Boolean).join(" · ");
    const chain=$("hud-streak");chain.hidden=!d.streak || d.streak.count<2;
    if(d.streak){chain.querySelector("b").textContent=`${L("Racha")} ${d.streak.count}`;chain.querySelector("i").style.width=`${Math.round(d.streak.remaining*100)}%`;chain.classList.toggle("is-milestone",d.streak.highlight);}
    $("hud-level").textContent = `${LANG === "en" ? "Lv." : "Nv."} ${d.level}`;
    $("hud-name").textContent = d.name;$("hud-name").title=d.name;
    $("hud-time").textContent = fmtTime(d.seconds);
    $("hud-phase").textContent = d.finalPhase ? `${L("Fase")} ${d.finalRound}` : `${L("Final")} ${fmtTime(d.finalIn)}`;
    if(d.breach)$("hud-phase").textContent+=` · ${L("Brecha")} ${d.breach.total-d.breach.remaining}/${d.breach.total}`;
    $("hud-milestone").textContent=d.nextTechnique?`${L("Próxima técnica")}: ${L(d.nextTechnique.name)} · ${L("Nivel")} ${d.nextTechnique.unlock} · ${fmtTime(d.nextTechnique.at || 0)}`:`${L("Rangos de técnicas")}: ${d.techniqueRanks}/${d.techniqueTotal}`;
    if(d.talentNext?.ready)$("hud-milestone").textContent=L("Especialización disponible en tu próxima subida de nivel");
    const site = d.site;
    const defence = site?.used && site.kind==="camp"
      ? `${site.name} · ${L("Defensores")}: ${site.defenders || 0}${site.seconds?` · ${site.seconds}s`:""}`
      : site?.used && site.kind==="lamp" ? `${site.name} · ${Math.min(8,site.lampKills)}/8 · ${site.seconds}s` : "";
    $("hud-world").textContent=d.training!==null && d.training!==undefined
      ? `${L("Campo de pruebas")} · ${L("Daño causado")}: ${d.training.toLocaleString(LANG)}`
      : defence || (d.combo?d.combo:d.site?`${d.site.name} · ${d.site.used?`${L("Activo")} ${d.site.seconds}s`:d.site.nest?`${d.site.hint} · ${d.site.pct}%`:d.site.activated?`${L("Guardianes restantes")}: ${d.site.guards}`:`${d.site.hint} · ${L("Mantente en el círculo")}: ${d.site.progress}%`}`:Game.mapId==="playa" && d.inWater?L("Corriente: puedes moverte contra ella"):"");
    $("hud-sub").textContent = (d.finalPhase ? `${L("Supervivencia final")} · ` : Game.state && Game.state.endless ? `${L("Modo infinito")} · ` : "") + LT("hudSub", { map: L(TS.MAPS[Game.mapId].name), kills: d.kills, coins: d.coins });
    const pct = Math.max(0, d.hp / d.maxHp);
    $("hud-hp-bar").style.width = `${pct * 100}%`;
    $("hud-hp-bar").classList.toggle("is-low", pct < 0.35);
    $("hud-hp").textContent = `${Math.ceil(Math.max(0, d.hp))} / ${d.maxHp}`;
    $("hud-evo").hidden = !d.canEvolve;
    $("hud-dash").disabled=d.down;$("hud-dash").classList.toggle("is-ready",d.dash?.ready);
    $("hud-dash-state").textContent=d.dash?.ready?(isTouch?L("Listo"):"⇧"):String(d.dash?.seconds || 0)+"s";
    const ab = $("hud-ab");
    ab.hidden = !d.ability;ab.disabled=d.down;
    if (d.ability) {
      const ready = d.ability.pct >= 1;
      $("hud-ab-name").textContent = d.ability.name;
      $("hud-ab-fill").style.height = `${Math.min(1, d.ability.pct) * 100}%`;
      $("hud-ab-state").textContent = ready ? (isTouch ? L("¡Toca!") : L("Espacio")) : `${Math.round(d.ability.pct * 100)}%`;
      ab.classList.toggle("is-ready", ready);
    }
    const key = JSON.stringify([d.weapons, d.techniques?.map(({ready,linkSeconds,...move})=>move), d.passives]);
    if (key !== slotKey) { slotKey = key; renderSlots($("hud-slots"), d); }
    for(const move of d.techniques || []) {
      const slot=$("hud-slots").querySelector(`[data-move="${move.id}"]`);
      if(slot){slot.querySelector(".tech-cooldown").style.height=`${Math.round((1-move.ready)*100)}%`;slot.classList.toggle("is-ready",move.ready>=1);slot.classList.toggle("is-linked",move.linkSeconds>0);
        const countdown=slot.querySelector(".link-time");if(countdown)countdown.textContent=move.linkSeconds>0?`${Math.ceil(move.linkSeconds)}s`:"";
        slot.style.setProperty("--link-remaining",`${Math.min(100,Math.max(0,move.linkSeconds || 0)/3*100)}%`);
        slot.title=move.linkSeconds>0?`${move.name} · ${L("Enlace disponible")}: ${move.linkSeconds.toFixed(1)} s · +35 %`:move.name;}
    }
    $("hud").classList.toggle("is-critical",!d.down && pct<.25);
    $("hud-status").textContent = d.down ? `${L("Reanimación")} ${Math.round((d.players[Game.localId]?.revivePct || 0)*100)}% · ${L(d.players[Game.localId]?.reviver!=null?"Mantén al compañero cerca":"Un compañero debe acercarse")}` : d.inWater ? L("Agua · movimiento al 58 %") : d.nextBossIn<=30 && !d.finalPhase ? `${L("Jefe en")} ${d.nextBossIn}s` : "";
    $("hud-compass").hidden=!d.compass;
    $("hud-compass").classList.toggle("is-help",["revive","heal"].includes(d.compass?.kind));
    if(d.compass) $("hud-compass").textContent=`${d.compass.pinned?"◆ ":""}${d.compass.arrow} ${d.compass.label} · ${d.compass.distance}`;
    const boss = $("hud-boss");
    boss.hidden = !d.boss;
    if (d.boss) { $("hud-boss-name").textContent = d.boss.name+(d.boss.tactic?` · ${d.boss.tactic}`:"");$("hud-boss-name").title=$("hud-boss-name").textContent; $("hud-boss-bar").style.width = `${d.boss.pct * 100}%`; }
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
        const name=el("b","",label);name.title=label;row.append(name,bar);
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

  let choiceGeneration=0;
  function showLevelUp(d) {
    const generation=++choiceGeneration;
    const activeEvolution=d.options.length>0&&d.options.every(o=>o.kind==="activePath");
    const specializing=d.options.length>0&&d.options.every(o=>o.kind==="talent");
    Game.setControlsEnabled(false);
    $("levelup").querySelector(".modal-sub").textContent=d.kind==="chest"?L("Cada jugador elige una recompensa"):L("Elige una mejora");
    $("levelup-title").textContent=activeEvolution?L("Evoluciona tu habilidad activa"):specializing?L("Define tu especialización"):d.kind==="chest"?L("Elige tu recompensa"):LT("levelTitle",{n:d.level});
    if(specializing || activeEvolution)$("levelup").querySelector(".modal-sub").textContent=L("Elige una ventaja con su coste. Solo para esta partida.");
    const box = $("levelup-cards");
    box.textContent = "";
    $("levelup-wait").hidden = true;
    const rerolls = d.rerolls ?? Game.state?.players[Game.localId]?.rerolls ?? 0;
    $("levelup-reroll").textContent=`${L("Cambiar opciones")} · ${rerolls}/3`;
    $("levelup-reroll").disabled=true;
    $("levelup-reroll").hidden=d.kind==="chest" || specializing || activeEvolution;
    d.options.forEach((o, i) => {
      const card = el("button", `up-card${o.kind==="technique"&&o.id==="surge"?" is-ultimate":""}${o.synergy?" is-synergy":""}${o.kind==="technique"?" is-technique":""}${o.kind==="evolution"?" is-evolution":""}${o.kind==="talent" || o.kind==="activePath"?" is-talent":""}${o.kind==="relic"?" is-relic":""}`);
      card.type = "button";card.disabled=true;if(o.path)card.dataset.path=o.path;
      const img = document.createElement("img");
      img.src = Sprites.iconUrl(o.icon, 3);
      img.alt = "";
      img.className = "pix";
      const text = el("div");
      text.append(el("span", "new", o.kind==="relic"?L("Reliquia · solo esta partida"):o.kind==="activePath"?L("Habilidad activa"):o.kind==="talent"?L("Especialización"):o.kind==="evolution"?L("Evolución"):o.isNew ? L("¡NUEVO!") : ""), el("b", "", o.title), el("small", "", o.desc));
      if(o.kind==="technique" && !o.variant && o.cooldownSeconds!==undefined){const ch=Game.state?.players[Game.localId]?.charId,d=TS.TECHNIQUES[ch]?.find(m=>m.id===o.id);if(d){text.querySelector("b").textContent=o.lvl===1?L(d.name):LT("levelOf",{name:L(d.name),lvl:o.lvl});text.querySelector("small").textContent=`${L(d.desc)} · ${L("Recarga")}: ${o.cooldownSeconds.toLocaleString(LANG)} s`;}}
      if(o.kind==="relic"){text.querySelector("b").textContent=L(TS.RELICS[o.id].name);text.querySelector("small").textContent=L(TS.RELICS[o.id].desc);}
      if(o.kind==="talent"){text.querySelector("b").textContent=L(TS.TALENTS[o.id].name);text.querySelector("small").textContent=L(TS.TALENTS[o.id].desc);}
      const ranks=upgradeRanks(o);if(ranks)text.append(ranks);
      if(o.preview?.length){const changes=el("dl","choice-stats");for(const row of o.preview){const value=el("dd",row.loss?"is-loss":"is-gain",`${row.from.toLocaleString(LANG)}${row.unit} → ${row.to.toLocaleString(LANG)}${row.unit}`);changes.append(el("dt","",L(row.label)),value);}text.append(changes);}
      if(o.synergy)text.append(el("span","synergy-note",L("Necesario para evolucionar")));
      card.append(img, text, el("kbd", "", i + 1));
      card.addEventListener("click", () => pickLevel(i));
      box.appendChild(card);
    });
    $("levelup").hidden = false;
    $("levelup").querySelector(".modal-box").scrollTop=0;
    setTimeout(()=>{
      if(generation!==choiceGeneration || $("levelup").hidden)return;
      for(const card of box.children)card.disabled=false;
      $("levelup-reroll").disabled=rerolls<=0 || d.kind==="chest" || specializing || activeEvolution;
      box.querySelector("button")?.focus();
    },180);
  }

  function waitOthers() {
    choiceGeneration++;
    $("levelup-reroll").disabled=true;
    $("levelup-cards").textContent = "";
    $("levelup-wait").hidden = false;
  }

  function hideLevelUp() {
    choiceGeneration++;
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
    // A guest can wait several frames for the host; consume the local choice now.
    for(const card of $("levelup-cards").children)card.disabled=true;
    $("levelup-reroll").disabled=true;
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
      equipmentPanel().textContent=L("Toca una pieza para ver sus detalles");
      $("pause-title").textContent=L(Game.mode==="solo"?"Pausa":"Menú de partida");
      $("pause-live").hidden=Game.mode==="solo";
      $("pause-live").textContent=L("La partida cooperativa continúa mientras miras este menú.");
      $("pause-quit").textContent=L(Game.state?.training ? "Salir del campo de pruebas" : Game.mode==="host"?"Terminar partida para todos":"Terminar partida");
      $("pause-encounters").textContent="";
      for(const event of d.upcoming || []){const row=el("li");row.append(el("span","",event.name),el("b","",event.active?L("En combate"):`${L("En")} ${fmtTime(event.seconds)}`));$("pause-encounters").append(row);}
      const evo=d.evolution;
      $("pause-evolution").textContent=evo?evo.evolved?`${L("Evolución")}: ${evo.name} ✓`:
        `${evo.name}
${evo.weapon} ${evo.level}/6 · ${evo.passive} ${evo.hasPassive?"✓":evo.blocked?L("Sin espacio para la pasiva"):"—"}
${L("Recoge un cofre con ambos requisitos")}`:"";
      $("pause-relics").textContent="";
      $("pause-relics").append(el("small","",`${L("Reliquias de partida")} · ${(d.relics || []).length}/${TS.MAX_RELICS}`));
      for(const relic of d.relics || []){const item=el("div");const img=document.createElement("img");img.src=Sprites.iconUrl(relic.icon,2);img.alt="";item.append(img,el("b","",relic.name),el("small","",relic.desc));$("pause-relics").append(item);}
      if(!(d.relics || []).length)$("pause-relics").append(el("small","",L("En los cofres pares puede aparecer una reliquia. La evolución y su receta tienen prioridad.")));
      const goals=$("pause-goal");goals.textContent="";const auto=el("option","",L("Automático"));auto.value="";goals.append(auto);
      for(const goal of d.goals || []){const option=el("option","",`${goal.label} · ${goal.distance}`);option.value=goal.key;goals.append(option);}goals.value=d.pinnedGoal || "";
      $("pause-talents").textContent="";
      if(d.ability?.path)$("pause-talents").append(el("span","",L(TS.activePathName(Game.state.players[Game.localId].charId,d.ability.path))));
      for(const talent of d.talents || [])$("pause-talents").append(el("span","",talent.name));
      if(d.talentNext)$("pause-talents").append(el("small","",`${L("Próxima especialización")}: ${L("Nivel")} ${d.talentNext.level} · ${fmtTime(d.talentNext.at)}`));
      $("pause-stats").textContent="";
      for(const row of d.stats || [])$("pause-stats").append(el("dt","",L(row.label)),el("dd","",`${row.value.toLocaleString(LANG)}${row.unit}`));
      $("pause-metrics").textContent="";
      for(const [label,value] of [["Daño causado",d.combat.dealt],["Daño recibido",d.combat.taken],["Vida recuperada",d.combat.healed],["Élites",d.combat.elites],["Reanimaciones",d.combat.revives],["Mejor racha",d.bestStreak]]){
        const stat=el("div");stat.append(el("b","",Math.round(value || 0).toLocaleString(LANG)),el("small","",L(label)));$("pause-metrics").append(stat);
      }
      $("pause-fullscreen").hidden=!document.fullscreenEnabled;
      $("pause-resume").focus();
    } else if(!$("levelup").hidden) $("levelup-cards").querySelector("button")?.focus();
  }
  $("pause-goal").addEventListener("change",e=>{Game.setGoal(e.target.value);});
  $("hud-compass").addEventListener("click",()=>{pause(true);$("pause-goal").focus();});
  $("hud-pause").addEventListener("click", () => pause(true));
  $("hud-dash").addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();Game.pressDash();});
  $("hud-dash").addEventListener("keydown",e=>{if(e.code==="Space"||e.code==="Enter"){e.preventDefault();e.stopPropagation();if(!e.repeat)Game.pressDash();}});
  $("hud-dash").addEventListener("click",e=>{if(e.detail===0)Game.pressDash();});
  $("hud-ab").addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); Game.pressAbility(); });
  $("hud-ab").addEventListener("keydown",e=>{if(e.code==="Space"||e.code==="Enter"){e.preventDefault();e.stopPropagation();if(!e.repeat)Game.pressAbility();}});
  $("hud-ab").addEventListener("click",e=>{if(e.detail===0)Game.pressAbility();});
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
    const generation=gameGeneration,endedState=Game.state;
    Game.setControlsEnabled(false);
    if (Game.mode === "guest") r={...r,charId:Game.state?.players[Game.localId]?.charId || save.selected,coop:true};
    if (r.daily && save.dailyDone !== r.daily) {
      save.dailyDone = r.daily;
      r.coins += 100;
      scheduleNotice(() => toast(LT("dailyBonus")), 400);
    }
    const previousRun=(save.history || []).find(h=>h.charId===r.charId && h.map===r.map && h.coop===!!r.coop && !!h.daily===!!r.daily && !!r.signature && h.signature===r.signature);
    const localCombat=r.combat?.[Game.localId];
    r={...r,bestStreak:localCombat?.bestStreak ?? r.bestStreak ?? 0};
    const best = r.veteran ? save.bestVeteran : save.best;
    const records=save.runs>0?[["Tiempo",r.seconds,best.time],["Enemigos",r.kills,best.kills],["Nivel",r.level,best.level],["Mejor racha",r.bestStreak,best.streak || 0]].filter(([,value,best])=>value>best).map(([name])=>L(name)):[];
    $("end-records").hidden=!records.length;$("end-records").textContent=records.length?`${L("Nuevo récord")}: ${records.join(" · ")}`:"";
    updateWeekly(r);
    Save.recordRun(r,Game.localId);
    for (const id of checkMapUnlocks()) scheduleNotice(() => toast(LT("mapUnlocked", { name: L(TS.MAPS[id].name) })), 1200);
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
    const chosenRelics=(r.relics?.[Game.localId] || []).filter(id=>TS.RELICS[id]);$("end-relics").hidden=!chosenRelics.length;$("end-relics").textContent="";
    for(const id of chosenRelics)$("end-relics").append(el("small","",`${L("Reliquia")}: ${L(TS.RELICS[id].name)}`));
    const chosenTalents=(r.talents?.[Game.localId] || []).filter(id=>TS.TALENTS[id]);
    $("end-talents").hidden=!chosenTalents.length;$("end-talents").textContent="";
    const activePath=r.activePaths?.[Game.localId];if(TS.ACTIVE_PATHS[activePath]){$("end-talents").hidden=false;$("end-talents").append(el("span","",L(TS.activePathName(r.charId,activePath))));}
    for(const id of chosenTalents)$("end-talents").append(el("span","",L(TS.TALENTS[id].name)));
    const combat=r.combat?.[Game.localId];
    if(combat){add("Daño causado",Math.round(combat.dealt || 0).toLocaleString(LANG));add("Daño recibido",Math.round(combat.taken || 0).toLocaleString(LANG));add("Vida recuperada",Math.round(combat.healed || 0).toLocaleString(LANG));add("Élites",combat.elites || 0);}
    add("Mejor racha",r.bestStreak);if(combat?.revives)add("Reanimaciones",combat.revives);
    const recap=r.recaps?.[Game.localId];$("end-recap").hidden=!recap?.fatal;$("recap-hits").textContent="";
    if(recap?.fatal){
      const kinds={contact:"Contacto",charge:"Carga",projectile:"Proyectil",bombardment:"Bombardeo",zone:"Zona peligrosa",explosion:"Explosión"};
      for(const hit of recap.hits || [recap.fatal]){const row=el("li");const name=L(TS.ENEMIES[hit.source]?.name || "Enemigo");row.append(el("span","",`${fmtTime(Math.floor(hit.at/60))} · ${name} · ${L(kinds[hit.kind] || "Contacto")}`),el("b","",`−${hit.amount}`));$("recap-hits").append(row);}
      const tips={contact:"Mantén distancia y busca una salida entre los enemigos.",charge:"Sal de la línea marcada antes de la carga.",projectile:"Muévete de lado para evitar los proyectiles.",bombardment:"Sal del área marcada antes de que se active.",zone:"Sal del área marcada antes de que se active.",explosion:"Aléjate del enemigo cuando prepare la explosión."};
      $("recap-advice").textContent=L(tips[recap.fatal.kind] || tips.contact);
    }
    if(r.chests)add("Cofres",r.chests);
    if(combat?.dodges)add("Esquivas precisas",combat.dodges);
    const details=$("end-insights");details.textContent="";
    details.append(el("h3","",L("Rendimiento por habilidad")));
    const sorting=el("select","skill-sorting");sorting.setAttribute("aria-label",L("Ordenar rendimiento"));for(const [value,label]of [["damage","Daño"],["healing","Curación"],["control","Aplicaciones de control"]]){const option=el("option","",L(label));option.value=value;sorting.append(option);}details.append(sorting);
    const skillList=el("div");details.append(skillList);
    const renderSkills=()=>{skillList.textContent="";const skills=Object.entries(combat?.bySkill || {}).sort((a,b)=>(b[1][sorting.value] || 0)-(a[1][sorting.value] || 0));
    if(!skills.length)skillList.append(el("p","",L("Sin impactos registrados")));
    for(const [id,values] of skills){
      const ch=charById(r.charId),name=id==="weapon"?TS.WEAPONS[ch.weapon].name:id==="active"?TS.ABILITIES[ch.id].name:id==="camp"?"Tronk defensor":TS.TECHNIQUES[ch.id]?.find(m=>m.id===id)?.name || id;
      const row=el("div","skill-result"),meter=el("meter");meter.min=0;meter.max=Math.max(1,combat?.dealt || 0);meter.value=values.damage || 0;meter.setAttribute("aria-label",L(name));
      const seconds=(values.availableTicks || 0)/60,dps=seconds>0?((values.damage || 0)/seconds).toLocaleString(LANG,{maximumFractionDigits:1}):"—";
      const variant=r.techniquePaths?.[Game.localId]?.[id];
      row.append(el("b","",L(name)+(variant?` · ${L(variant==="power"?"Impacto":"Cobertura")}`:"")),el("small","",`${L("Daño por segundo disponible")}: ${dps} · ${L("Tiempo disponible")}: ${seconds.toLocaleString(LANG,{maximumFractionDigits:1})} s`),el("span","",`${L("Daño")}: ${Math.round(values.damage || 0).toLocaleString(LANG)} · ${L("Curación")}: ${Math.round(values.healing || 0)} · ${L("Aplicaciones de control")}: ${values.control || 0}`),meter);skillList.append(row);
    }
    };sorting.addEventListener("change",renderSkills);renderSkills();
    details.append(el("h3","",L("Comparación con tu partida anterior")));
    if(previousRun){
      for(const [label,value,before,unit] of [["Tiempo",r.seconds,previousRun.seconds,"s"],["Daño causado",combat?.dealt || 0,previousRun.dealt,""],["Daño recibido",combat?.taken || 0,previousRun.taken,""]]){
        const delta=Math.round(value-before);details.append(el("p","",`${L(label)}: ${delta>=0?"+":""}${delta}${unit}`));
      }
      const techniqueNames=h=>Object.keys(h || {}).map(id=>`${L(TS.TECHNIQUES[r.charId]?.find(m=>m.id===id)?.name || id)} ${h[id]}`).join(" · ");
      details.append(el("p","",`${L("Técnicas anteriores")}: ${techniqueNames(previousRun.techniques) || "—"}`));
      details.append(el("p","",`${L("Técnicas actuales")}: ${techniqueNames(r.techniques?.[Game.localId]) || "—"}`));
    }else details.append(el("p","",L("La comparación requiere las mismas estrellas, mejoras iniciales, equipo y reglas. Las partidas antiguas sin estos datos se conservan en el historial.")));
    const history=(save.history || []).filter(h=>h.charId===r.charId && h.map===r.map && h.coop===!!r.coop && !!h.daily===!!r.daily && !!r.signature && h.signature===r.signature).slice(0,5);
    if(history.length){const list=el("ol","run-history");for(const h of history)list.append(el("li","",`${new Date(h.at).toLocaleDateString(LANG)} · ${fmtTime(h.seconds)} · ${L("Nivel")} ${h.level} · ${L("Enemigos")}: ${h.kills}`));details.append(el("h3","",L("Últimas partidas comparables")),list);}
    const online=lastRun?.guest || lastRun?.opts?.mode==="host";
    $("end-again").textContent=L(online?"Volver a la sala online":"Repetir configuración");
    $("end-retry-note").textContent=L(online?"Vuelve a crear o unirte a una sala para jugar con tus amigos.":"Mismo personaje, mapa y reglas. El mapa se genera de nuevo salvo en retos con semilla.");
    if (r.finalPhase) add("Fases superadas", Math.max(0, r.finalRound - 1));
    if (r.finalPhase) add("Contra el jefe final", fmtTime(r.endlessSeconds), "coins");
    else if (r.endless) add("Modo infinito", fmtTime(r.endlessSeconds), "coins");
    add("Puntos", points, "coins");
    add("Monedas ganadas", `+${r.coins}`, "coins");
    hideLevelUp();
    $("pause").hidden = true;
    Game.setControlsEnabled(false);
    setTimeout(() => {
      if(generation!==gameGeneration || Game.state!==endedState || current!=="game")return;
      $("end").hidden=false;$("end").querySelector(".modal-box").scrollTop=0;
      $("end-title").focus({preventScroll:true});
    },900);
    if (!r.veteran) Account.submitRun(r);
  }
  Game.on("end", showEnd);
  Game.on("trainingEnd", () => { backToMenu(); show("chars"); });

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
    clearTransientUI();
    gameGeneration++;
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
    const buttons=[...modal.querySelectorAll("button:not([disabled]),a[href],input,select,summary")].filter(e=>e.getClientRects().length);
    if(!buttons.length)return;
    const first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey && (document.activeElement===first || !buttons.includes(document.activeElement))){e.preventDefault();last.focus();}
    else if(!e.shiftKey && (document.activeElement===last || !buttons.includes(document.activeElement))){e.preventDefault();first.focus();}
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
    revealGeneration++;clearTimeout(revealTimer);for(const a of revealAnimations)a.cancel();revealAnimations=[];
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
