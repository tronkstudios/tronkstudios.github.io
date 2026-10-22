"use strict";

/* TronkStudios · survivors/js/ui.js
   Menús de Tronk Survivors (inicio, personajes, cofre, mejoras) y la
   interfaz de la partida (barra de experiencia, vida, armas, jefe,
   subidas de nivel, pausa y final). Arranca el juego.
   Scripts clásicos (ver docs/adr/0002). */

(() => {
  const $ = (id) => document.getElementById(id);
  const save = Save.load();
  let current = "loading";
  let selectedView = save.selected;
  let lastSetup = null;

  const charById = (id) => TS.CHARACTERS.find((c) => c.id === id);
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  function show(id) {
    for (const el of document.querySelectorAll(".screen")) el.classList.toggle("is-on", el.id === id);
    current = id;
    if (id === "menu") renderMenu();
    if (id === "chars") renderChars();
    if (id === "gacha") renderGacha();
    if (id === "shop") renderShop();
    if (id === "online") window.TronkNet?.render($("online-body"));
    if (id !== "game") {
      Sfx.startMusic("menu");
      if (!Game.state || Game.state.over) startMenuBackground();
    }
  }

  function fillIcons(root = document) {
    for (const img of root.querySelectorAll("img[data-icon]")) if (!img.src) img.src = Sprites.iconUrl(img.dataset.icon, 3);
  }

  function syncCoins() {
    for (const el of document.querySelectorAll(".js-coins")) el.textContent = save.coins;
    $("menu-coins").textContent = save.coins;
  }

  /* ---------- inicio ---------- */

  // Fondo del menú: todos los personajes paseando y peleando por el mapa
  let demoOn = false;
  function startMenuBackground() {
    if (demoOn) return;
    demoOn = true;
    $("hud").hidden = true;
    Game.startDemo(TS.CHARACTERS.map((c) => c.id));
  }

  // El personaje elegido da vueltas sobre la plataforma
  const SPIN = [["down", false], ["downSide", false], ["side", false], ["upSide", false], ["up", false], ["upSide", true], ["side", true], ["downSide", true]];
  let spinTimer = 0;
  let spinStep = 0;
  function spinHero() {
    const set = Sprites.get(`char:${save.selected}`);
    const [view, flip] = SPIN[spinStep % SPIN.length];
    const k = 4;
    const img = Sprites.scaled(set[view].idle, k);
    if (flip) {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d");
      g.translate(c.width, 0);
      g.scale(-1, 1);
      g.drawImage(img, 0, 0);
      $("stage-img").src = c.toDataURL();
    } else $("stage-img").src = img.toDataURL();
    spinStep++;
  }

  function renderMenu() {
    syncCoins();
    const ch = charById(save.selected);
    const own = save.owned[ch.id];
    $("stage-name").textContent = ch.name;
    $("stage-rarity").textContent = TS.RARITIES[ch.rarity].name;
    $("stage-rarity").style.color = TS.RARITIES[ch.rarity].color;
    $("stage-stars").textContent = stars(own ? own.stars : 1);
    $("stage-weapon").textContent = `${TS.WEAPONS[ch.weapon].name} · ${ch.perkText}`;
    $("stage-weapon-icon").src = Sprites.iconUrl(ch.weapon, 2);
    spinStep = 0;
    spinHero();
    clearInterval(spinTimer);
    spinTimer = setInterval(() => (current === "menu" ? spinHero() : clearInterval(spinTimer)), 700);
    $("menu-free").hidden = !save.freePull;
    const b = save.best;
    $("menu-best").textContent = b.time ? `Mejor partida: ${fmtTime(b.time)} · ${b.kills} enemigos · nivel ${b.level}${b.wins ? ` · ${b.wins} victorias` : ""}` : "Aguanta 10 minutos y derrota al Rey Zombi.";
    $("toggle-music").textContent = `Música: ${save.settings.music ? "sí" : "no"}`;
    $("toggle-sfx").textContent = `Sonido: ${save.settings.sfx ? "sí" : "no"}`;
  }

  /* ---------- personajes ---------- */

  function stars(n) {
    return "★".repeat(n) + "☆".repeat(TS.GACHA.maxStars - n);
  }

  function renderChars() {
    const grid = $("chars-grid");
    grid.textContent = "";
    const owned = Object.keys(save.owned).length;
    $("chars-count").textContent = `${owned} / ${TS.CHARACTERS.length}`;
    for (const ch of TS.CHARACTERS) {
      const have = save.owned[ch.id];
      const card = document.createElement("button");
      card.type = "button";
      card.className = `char-card${have ? "" : " is-locked"}${ch.id === save.selected ? " is-selected" : ""}`;
      card.style.setProperty("--rarity", TS.RARITIES[ch.rarity].color);
      const img = document.createElement("img");
      img.src = have ? Sprites.portrait(ch.id, 2) : Sprites.silhouettePortrait(ch.id, 2);
      img.alt = "";
      const name = document.createElement("span");
      name.textContent = have ? ch.name : "???";
      const st = document.createElement("span");
      st.className = "stars";
      st.textContent = have ? stars(have.stars) : "";
      card.append(img, name, st);
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
    const big = document.createElement("div");
    big.className = "big";
    for (const view of have ? ["down", "side"] : ["down"]) {
      const img = document.createElement("img");
      if (have) {
        const set = Sprites.get(`char:${id}`);
        img.src = Sprites.scaled(set[view].idle, 3).toDataURL();
      } else img.src = Sprites.silhouettePortrait(id, 3);
      img.alt = "";
      big.appendChild(img);
    }
    const title = document.createElement("h3");
    title.textContent = have ? ch.name : "Personaje sin conseguir";
    const rarity = document.createElement("span");
    rarity.className = "rarity";
    rarity.style.color = TS.RARITIES[ch.rarity].color;
    rarity.textContent = `${TS.RARITIES[ch.rarity].name}${ch.from === "Tronk Fight" ? " · de Tronk Fight" : ""}${have ? ` · ${stars(have.stars)}` : ""}`;
    box.append(big, title, rarity);
    if (have) {
      const desc = document.createElement("p");
      desc.textContent = ch.desc;
      const weapon = document.createElement("div");
      weapon.className = "weapon";
      const wi = document.createElement("img");
      wi.src = Sprites.iconUrl(ch.weapon, 2);
      wi.alt = "";
      wi.className = "pix";
      const wt = document.createElement("span");
      wt.innerHTML = `<b></b><br><small></small>`;
      wt.querySelector("b").textContent = TS.WEAPONS[ch.weapon].name;
      wt.querySelector("small").textContent = TS.WEAPONS[ch.weapon].desc;
      weapon.append(wi, wt);
      const perk = document.createElement("p");
      perk.textContent = `Ventaja: ${ch.perkText}`;
      const btn = document.createElement("button");
      btn.className = "btn btn-big";
      btn.textContent = save.selected === id ? "¡A jugar!" : "Elegir";
      btn.addEventListener("click", () => {
        save.selected = id;
        Save.persist();
        if (btn.textContent === "¡A jugar!") play();
        else renderChars();
      });
      box.append(desc, weapon, perk, btn);
    } else {
      const p = document.createElement("p");
      p.textContent = "Consíguelo en el Cofre Tronk con las monedas que ganas jugando.";
      const btn = document.createElement("button");
      btn.className = "btn btn-gold";
      btn.textContent = "Ir al cofre";
      btn.addEventListener("click", () => show("gacha"));
      box.append(p, btn);
    }
  }

  /* ---------- cofre ---------- */

  function renderGacha() {
    syncCoins();
    $("gacha-chest").style.backgroundImage = `url(${Sprites.iconUrl("cofre", 12)})`;
    $("cost-1").textContent = save.freePull ? "¡gratis!" : TS.GACHA.cost1;
    $("cost-10").textContent = TS.GACHA.cost10;
    $("pull-1").disabled = !save.freePull && save.coins < TS.GACHA.cost1;
    $("pull-10").disabled = save.coins < TS.GACHA.cost10;
    $("gacha-pity").textContent = `Legendario seguro en ${TS.GACHA.pity - save.pity} tiradas`;
    const ul = $("gacha-rates");
    ul.textContent = "";
    for (const id of TS.RARITY_ORDER) {
      const li = document.createElement("li");
      const list = TS.CHARACTERS.filter((c) => c.rarity === id).map((c) => c.name).join(", ");
      li.innerHTML = `<b></b> <span></span>`;
      li.querySelector("b").textContent = `${TS.RARITIES[id].name}: ${Math.round(TS.RARITIES[id].rate * 100)} %`;
      li.querySelector("b").style.color = TS.RARITIES[id].color;
      li.querySelector("span").textContent = `(${list})`;
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
        const card = document.createElement("div");
        card.className = `reveal-card${r.kind === "new" ? " is-new" : ""}`;
        card.style.setProperty("--rarity", TS.RARITIES[r.ch.rarity].color);
        card.style.animationDelay = `${i * 0.12}s`;
        const img = document.createElement("img");
        img.src = Sprites.portrait(r.ch.id, 2);
        img.alt = "";
        const name = document.createElement("b");
        name.textContent = r.ch.name;
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = TS.RARITIES[r.ch.rarity].name;
        const extra = document.createElement("small");
        extra.textContent = r.kind === "star" ? `★ ${r.stars} estrellas` : r.kind === "coins" ? `+${r.coins} monedas` : "";
        card.append(img, name, tag, extra);
        cards.appendChild(card);
      });
      $("gacha-reveal").hidden = false;
      $("reveal-ok").focus();
    }, 900);
  }

  /* ---------- tienda ---------- */

  function renderShop() {
    syncCoins();
    const list = $("shop-list");
    list.textContent = "";
    for (const item of TS.SHOP) {
      const lvl = Save.shopLevel(item.id);
      const row = document.createElement("div");
      row.className = "shop-item";
      const info = document.createElement("div");
      info.innerHTML = "<b></b><small></small><div class='shop-pips'></div>";
      info.querySelector("b").textContent = item.name;
      info.querySelector("small").textContent = item.desc;
      for (let i = 0; i < item.max; i++) {
        const pip = document.createElement("i");
        if (i < lvl) pip.className = "on";
        info.querySelector(".shop-pips").appendChild(pip);
      }
      const btn = document.createElement("button");
      btn.className = "btn btn-gold";
      if (lvl >= item.max) {
        btn.textContent = "Al máximo";
        btn.disabled = true;
      } else {
        const cost = Save.shopCost(item);
        btn.innerHTML = `<img alt="" /> <span></span>`;
        btn.querySelector("img").src = Sprites.iconUrl("moneda", 2);
        btn.querySelector("span").textContent = cost;
        btn.disabled = save.coins < cost;
        btn.addEventListener("click", () => {
          if (Save.buy(item)) { Sfx.play("coin"); renderShop(); }
        });
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
    return { charId: save.selected, stars: own.stars, meta: Save.shopStats(), name: save.name || charById(save.selected).name };
  }

  function play(setups, opts) {
    lastSetup = setups ? { setups, opts } : null;
    for (const el of document.querySelectorAll(".screen")) el.classList.remove("is-on");
    for (const id of ["levelup", "pause", "end"]) $(id).hidden = true;
    current = "game";
    $("hud").hidden = false;
    $("loading").classList.add("is-on");
    $("loading-text").textContent = "Preparando la partida…";
    // los dibujos de los enemigos se hacen ahora (tarda un momento)
    setTimeout(() => {
      for (const id of [...Object.keys(People.ENEMIES), "slime", "slimito", "fantasma", "murcielago"]) Sprites.get(`enemy:${id}`);
      for (const s of setups || [localSetup()]) Sprites.get(`char:${s.charId}`);
      $("loading").classList.remove("is-on");
      demoOn = false;
      Game.start(setups || [localSetup()], opts || { mode: "solo", localId: 0 });
    }, 30);
  }
  window.TronkPlay = play;

  function renderSlots(el, data, big) {
    el.textContent = "";
    const items = [...data.weapons.map((w) => ({ ...w, kind: "w" })), ...data.passives.map((p) => ({ ...p, kind: "p" }))];
    for (const it of items) {
      const slot = document.createElement("div");
      slot.className = `hud-slot${it.kind === "p" ? " is-passive" : ""}`;
      const img = document.createElement("img");
      img.src = Sprites.iconUrl(it.id, big ? 3 : 2);
      img.alt = "";
      const lvl = document.createElement("i");
      lvl.textContent = it.lvl;
      slot.append(img, lvl);
      el.appendChild(slot);
    }
  }

  let slotKey = "";
  Game.on("hud", (d) => {
    $("hud-xp-bar").style.width = `${Math.min(100, (d.xp / d.xpNext) * 100)}%`;
    $("hud-level").textContent = `Nv. ${d.level}`;
    $("hud-name").textContent = d.name;
    $("hud-time").textContent = fmtTime(d.seconds);
    $("hud-kills").textContent = d.kills;
    $("hud-coins").textContent = d.coins;
    const pct = Math.max(0, d.hp / d.maxHp);
    $("hud-hp-bar").style.width = `${pct * 100}%`;
    $("hud-hp-bar").classList.toggle("is-low", pct < 0.35);
    $("hud-hp").textContent = `${Math.ceil(Math.max(0, d.hp))} / ${d.maxHp}`;
    const key = JSON.stringify([d.weapons, d.passives]);
    if (key !== slotKey) { slotKey = key; renderSlots($("hud-slots"), d); }
    const boss = $("hud-boss");
    boss.hidden = !d.boss;
    if (d.boss) { $("hud-boss-name").textContent = d.boss.name; $("hud-boss-bar").style.width = `${d.boss.pct * 100}%`; }
    const team = $("hud-team");
    if (d.players.length > 1) {
      team.textContent = "";
      d.players.forEach((p, i) => {
        if (i === Game.localId) return;
        const row = document.createElement("div");
        row.innerHTML = "<b></b><span><i></i></span>";
        row.querySelector("b").textContent = p.down ? `${p.name} (caído)` : p.name;
        row.querySelector("i").style.width = `${Math.max(0, p.hp / p.maxHp) * 100}%`;
        team.appendChild(row);
      });
    } else team.textContent = "";
  });

  function toast(text) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    $("toasts").appendChild(t);
    setTimeout(() => t.remove(), 3300);
  }

  function banner(text, small) {
    const b = $("banner");
    b.hidden = true;
    void b.offsetWidth;
    b.innerHTML = "";
    b.textContent = text;
    if (small) { const s = document.createElement("small"); s.textContent = small; b.appendChild(s); }
    b.hidden = false;
    clearTimeout(banner.t);
    banner.t = setTimeout(() => (b.hidden = true), 2700);
  }

  Game.on("toast", (d) => toast(d.text));
  Game.on("boss", (d) => banner("¡JEFE!", d.name));
  Game.on("bossDown", (d) => toast(`¡Has derrotado a ${d.name}!`));
  Game.on("chest", (d) => { toast("¡Cofre! +40 monedas"); for (const l of d.lines) toast(l); });
  Game.on("down", (d) => { if (d.id === Game.localId && Game.state.players.length > 1) toast("¡Has caído! Un compañero puede levantarte si se queda a tu lado."); });

  // Subida de nivel
  Game.on("levelUp", (d) => {
    $("levelup-level").textContent = d.level;
    const box = $("levelup-cards");
    box.textContent = "";
    $("levelup-wait").hidden = true;
    d.options.forEach((o, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "up-card";
      const img = document.createElement("img");
      img.src = Sprites.iconUrl(o.icon, 3);
      img.alt = "";
      img.className = "pix";
      const text = document.createElement("div");
      text.innerHTML = "<span class='new'></span><b></b><small></small>";
      text.querySelector(".new").textContent = o.isNew ? "¡NUEVO!" : "";
      text.querySelector("b").textContent = o.title;
      text.querySelector("small").textContent = o.desc;
      const key = document.createElement("kbd");
      key.textContent = i + 1;
      card.append(img, text, key);
      card.addEventListener("click", () => pickLevel(i));
      box.appendChild(card);
    });
    $("levelup").hidden = false;
    setTimeout(() => box.querySelector("button")?.focus(), 50);
  });

  function pickLevel(i) {
    if ($("levelup").hidden) return;
    Sfx.play("pick");
    if (Game.mode === "guest") window.TronkNet?.sendChoice(i);
    else Game.choose(Game.localId, i);
  }

  Game.on("chosen", () => {
    if (Game.state && Game.state.choosing && Object.keys(Game.state.choosing).length) {
      $("levelup-cards").textContent = "";
      $("levelup-wait").hidden = false;
    } else $("levelup").hidden = true;
  });
  Game.on("resume", () => ($("levelup").hidden = true));

  // Pausa
  function pause(on) {
    if (current !== "game" || !Game.state || Game.state.over) return;
    if (Game.mode !== "solo") {
      // en el modo online no se para el juego: solo se ve el menú
      $("pause").hidden = !on;
      return;
    }
    Game.setPaused(on);
    $("pause").hidden = !on;
    if (on) renderSlots($("pause-build"), Game.hudData(), true);
  }
  $("hud-pause").addEventListener("click", () => pause(true));
  $("pause-resume").addEventListener("click", () => pause(false));
  $("pause-quit").addEventListener("click", () => {
    $("pause").hidden = true;
    Game.setPaused(false);
    Game.finish(false);
  });

  // Fin de la partida
  Game.on("end", (r) => {
    Save.recordRun(r);
    window.TronkNet?.leave?.();
    $("end-title").textContent = r.victory ? "¡VICTORIA!" : "¡Has caído!";
    const stats = $("end-stats");
    stats.textContent = "";
    const add = (label, value, cls) => {
      const d = document.createElement("div");
      if (cls) d.className = cls;
      d.innerHTML = "<b></b><small></small>";
      d.querySelector("b").textContent = value;
      d.querySelector("small").textContent = label;
      stats.appendChild(d);
    };
    add("Tiempo", fmtTime(r.seconds));
    add("Nivel", r.level);
    add("Enemigos", r.kills);
    add("Jefes", r.bosses);
    add("Monedas ganadas", `+${r.coins}`, "coins");
    $("levelup").hidden = true;
    $("pause").hidden = true;
    setTimeout(() => {
      $("end").hidden = false;
      $("end-again").focus();
    }, 900);
  });
  $("end-again").addEventListener("click", () => {
    $("end").hidden = true;
    Game.stop();
    if (lastSetup) show("online");
    else play();
  });
  $("end-menu").addEventListener("click", () => {
    $("end").hidden = true;
    $("hud").hidden = true;
    Game.stop();
    demoOn = false;
    show("menu");
  });

  /* ---------- teclado ---------- */
  window.addEventListener("keydown", (e) => {
    if (!$("levelup").hidden && /^Digit[1-4]$/.test(e.code)) {
      pickLevel(Number(e.code.slice(5)) - 1);
      return;
    }
    if (current === "game" && (e.code === "Escape" || e.code === "KeyP")) {
      if (!$("levelup").hidden || !$("end").hidden) return;
      pause($("pause").hidden);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && current === "game" && Game.mode === "solo" && $("levelup").hidden) pause(true);
  });

  /* ---------- botones del menú ---------- */
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (!go) return;
    Sfx.init();
    Sfx.play("click");
    if (go.dataset.go === "play") play();
    else show(go.dataset.go);
  });
  $("pull-1").addEventListener("click", () => pull(1));
  $("pull-10").addEventListener("click", () => pull(10));
  $("reveal-ok").addEventListener("click", () => {
    $("gacha-reveal").hidden = true;
    renderGacha();
  });
  $("toggle-music").addEventListener("click", () => {
    save.settings.music = !save.settings.music;
    Sfx.setEnabled("music", save.settings.music);
    Save.persist();
    renderMenu();
  });
  $("toggle-sfx").addEventListener("click", () => {
    save.settings.sfx = !save.settings.sfx;
    Sfx.setEnabled("sfx", save.settings.sfx);
    Save.persist();
    renderMenu();
  });
  // el sonido del navegador solo arranca tras tocar algo
  window.addEventListener("pointerdown", () => Sfx.init(), { once: true });
  window.addEventListener("keydown", () => Sfx.init(), { once: true });

  /* ---------- arranque ---------- */
  Sfx.setEnabled("music", save.settings.music);
  Sfx.setEnabled("sfx", save.settings.sfx);
  setTimeout(() => {
    Sprites.build();
    Game.init($("game"));
    fillIcons();
    // los personajes se dibujan poco a poco para no congelar la página
    const ids = [...TS.CHARACTERS.map((c) => `char:${c.id}`), ...["zombi", "corredor", "antitronk", "ninja", "esqueleto", "murcielago", "slime"].map((id) => `enemy:${id}`)];
    let i = 0;
    const next = () => {
      if (i < ids.length) {
        $("loading-text").textContent = `Dibujando personajes… ${Math.round((i / ids.length) * 100)} %`;
        Sprites.get(ids[i++]);
        setTimeout(next, 0);
      } else show("menu");
    };
    next();
  }, 20);

  window.TronkUI = { show, toast, play, localSetup };
})();
