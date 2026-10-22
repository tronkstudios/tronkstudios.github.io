"use strict";

/* TronkStudios · survivors/js/save.js
   Progreso de Tronk Survivors guardado en este navegador: monedas,
   personajes conseguidos (y sus estrellas), mejoras de la tienda,
   tiradas del cofre y récords. El cofre se paga SOLO con monedas
   que se ganan jugando: no hay compras con dinero real.
   Scripts clásicos (ver docs/adr/0002). */

const Save = (() => {
  const KEY = "tronk-survivors";
  let data = null;

  function fresh() {
    return {
      coins: 0,
      owned: { [TS.STARTER]: { stars: 1 } },
      selected: TS.STARTER,
      shop: {},
      pity: 0,
      pulls: 0,
      freePull: true, // la primera tirada es gratis
      best: { time: 0, kills: 0, level: 0, wins: 0 },
      runs: 0,
      settings: { music: true, sfx: true },
      name: ""
    };
  }

  function load() {
    data = fresh();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && typeof raw === "object") {
        data = { ...data, ...raw, best: { ...data.best, ...(raw.best || {}) }, settings: { ...data.settings, ...(raw.settings || {}) } };
        if (!data.owned || !data.owned[TS.STARTER]) data.owned = { ...(data.owned || {}), [TS.STARTER]: { stars: 1 } };
        if (!data.owned[data.selected]) data.selected = TS.STARTER;
        data.coins = Math.max(0, Math.floor(Number(data.coins) || 0));
      }
    } catch {
      // sin almacenamiento: se juega igual, pero no se guarda
    }
    return data;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // modo privado o almacenamiento bloqueado
    }
  }

  const get = () => data || load();

  function addCoins(n) {
    get().coins = Math.max(0, get().coins + Math.floor(n));
    persist();
  }

  function shopLevel(id) {
    return get().shop[id] || 0;
  }

  function shopCost(item) {
    const lvl = shopLevel(item.id);
    return Math.round(item.cost * (1 + lvl * 0.9));
  }

  function buy(item) {
    const d = get();
    const lvl = shopLevel(item.id);
    const cost = shopCost(item);
    if (lvl >= item.max || d.coins < cost) return false;
    d.coins -= cost;
    d.shop[item.id] = lvl + 1;
    persist();
    return true;
  }

  // Ventajas de la tienda para la partida
  function shopStats() {
    const out = {};
    for (const item of TS.SHOP) {
      const lvl = shopLevel(item.id);
      if (lvl) out[item.stat] = (out[item.stat] || 0) + item.per * lvl;
    }
    return out;
  }

  /* ---------- Cofre ---------- */

  function rollRarity(forceLegend) {
    if (forceLegend) return "legendario";
    let r = Math.random();
    for (const id of [...TS.RARITY_ORDER].reverse()) {
      r -= TS.RARITIES[id].rate;
      if (r < 0) return id;
    }
    return "comun";
  }

  function pickCharacter(rarity) {
    const list = TS.CHARACTERS.filter((c) => c.rarity === rarity);
    return list[Math.floor(Math.random() * list.length)];
  }

  // Devuelve null si no hay monedas; si no, la lista de premios
  function pull(times) {
    const d = get();
    const free = times === 1 && d.freePull;
    const cost = free ? 0 : times === 10 ? TS.GACHA.cost10 : TS.GACHA.cost1 * times;
    if (d.coins < cost) return null;
    d.coins -= cost;
    if (free) d.freePull = false;

    const rarities = [];
    for (let i = 0; i < times; i++) {
      d.pity += 1;
      const rarity = rollRarity(d.pity >= TS.GACHA.pity);
      if (rarity === "legendario") d.pity = 0;
      rarities.push(rarity);
    }
    // En la tirada de 10, al menos un raro o mejor
    if (times === 10 && rarities.every((r) => r === "comun")) rarities[9] = "raro";

    const results = rarities.map((rarity) => {
      const ch = pickCharacter(rarity);
      const owned = d.owned[ch.id];
      if (!owned) {
        d.owned[ch.id] = { stars: 1 };
        return { ch, kind: "new" };
      }
      if (owned.stars < TS.GACHA.maxStars) {
        owned.stars += 1;
        return { ch, kind: "star", stars: owned.stars };
      }
      const coins = TS.GACHA.refund[rarity];
      d.coins += coins;
      return { ch, kind: "coins", coins };
    });

    d.pulls += times;
    persist();
    return results;
  }

  function recordRun(result) {
    const d = get();
    d.runs += 1;
    d.best.time = Math.max(d.best.time, result.seconds);
    d.best.kills = Math.max(d.best.kills, result.kills);
    d.best.level = Math.max(d.best.level, result.level);
    if (result.victory) d.best.wins += 1;
    d.coins += result.coins;
    persist();
  }

  return { load, get, persist, addCoins, shopLevel, shopCost, buy, shopStats, pull, recordRun };
})();
