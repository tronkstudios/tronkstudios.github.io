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
      lastCoinAd: 0,
      adUnlocks: {},
      lastChestAd: 0,
      redeemedChestAd: 0,
      owned: { [TS.STARTER]: { stars: 1 } },
      selected: TS.STARTER,
      shop: {},
      pity: 0,
      pulls: 0,
      freePull: true, // la primera tirada es gratis
      best: { time: 0, kills: 0, level: 0, wins: 0, streak:0 },
      bestVeteran: {time:0, kills:0, level:0, wins:0, streak:0},
      bestSprint: {time:0, kills:0, level:0, wins:0, streak:0},
      mastery: {},
      runs: 0, history:[],
      settings: { music: true, sfx: true, musicVol: 0.7, sfxVol: 0.9, lang: "" },
      name: "",
      achievements: {},
      maps: { bosque: true },
      stats: { kills: 0, bosses: 0, wins: 0, props: 0, coinsEarned: 0, evolutions: 0, dailies: 0, coop: 0 },
      weekly: null, // misiones de la semana: { week, prog, claimed }
      tutorial: false, // ya ha visto los consejos de la primera partida
      savedAt: 0
    };
  }

  const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback;
  function unlockRoster(d){
    for(const ch of TS.NEW_ROSTER || []){const {key,value}=ch.unlock,progress=key==="runs"?d.runs:key==="time"?d.best?.time:d.stats?.[key];if(progress>=value && !d.owned[ch.id])d.owned[ch.id]={stars:1};}
  }
  const adsByRarity = { comun: 1, raro: 2, epico: 3, legendario: 5 };
  const chestAdCooldown = 24 * 60 * 60 * 1000;

  function adUnlockProgress(id) {
    const character = TS.CHARACTERS.find(ch => ch.id === id);
    if (!character) return null;
    const total = adsByRarity[character.rarity];
    return { count: Math.min(total, integer(get().adUnlocks[id])), total };
  }

  function recordUnlockAd(id) {
    const d = get();
    const progress = adUnlockProgress(id);
    if (!progress || d.owned[id]) return null;
    const count = Math.min(progress.total, progress.count + 1);
    d.adUnlocks[id] = count;
    const unlocked = count === progress.total;
    if (unlocked) d.owned[id] = { stars: 1 };
    persist();
    return { ...progress, count, unlocked };
  }

  const hasAdPulls = () => get().lastChestAd > get().redeemedChestAd;
  const canEarnAdPulls = () => !hasAdPulls() && Date.now() - get().lastChestAd >= chestAdCooldown;

  function recordChestAd() {
    if (!canEarnAdPulls()) return false;
    get().lastChestAd = Date.now();
    persist();
    return true;
  }

  function normalize(d) {
    const owned = {};
    for (const ch of TS.CHARACTERS) if (d.owned && d.owned[ch.id]) {
      owned[ch.id] = { stars: Math.max(1, Math.min(TS.GACHA.maxStars, integer(d.owned[ch.id].stars, 1))) };
    }
    if (!owned[TS.STARTER]) owned[TS.STARTER] = { stars: 1 };
    d.owned = owned;
    if (!owned[d.selected]) d.selected = TS.STARTER;
    d.shop = Object.fromEntries(TS.SHOP.map(item => [item.id, Math.min(item.max, integer(d.shop && d.shop[item.id]))]));
    for (const key of ["coins", "pity", "pulls", "runs", "savedAt", "lastCoinAd", "lastChestAd", "redeemedChestAd"]) d[key] = integer(d[key]);
    d.bestVeteran = { ...fresh().bestVeteran, ...d.bestVeteran };
    d.bestSprint = { ...fresh().bestSprint, ...d.bestSprint };
    d.mastery = Object.fromEntries(TS.CHARACTERS.filter(ch=>d.mastery?.[ch.id]===true).map(ch=>[ch.id,true]));
    for (const section of ["best", "bestVeteran", "bestSprint", "stats"]) {
      for (const key of Object.keys(fresh()[section])) d[section][key] = integer(d[section][key]);
    }
    d.adUnlocks = Object.fromEntries(TS.CHARACTERS.flatMap(ch => {
      const count = Math.min(adsByRarity[ch.rarity], integer(d.adUnlocks?.[ch.id]));
      // Recover a completed unlock from older or partially synced saves.
      if (count === adsByRarity[ch.rarity] && !d.owned[ch.id]) d.owned[ch.id] = { stars: 1 };
      return count ? [[ch.id, count]] : [];
    }));
    unlockRoster(d);
    d.history=normalizeHistory(d.history);
    return d;
  }
  function normalizeHistory(rows){
    return (Array.isArray(rows)?rows:[]).filter(r=>r && TS.CHARACTERS.some(c=>c.id===r.charId)&&TS.MAPS[r.map]).map(r=>({
      id:typeof r.id==="string"?r.id.slice(0,80):String(integer(r.at)),at:integer(r.at),charId:r.charId,map:r.map,
      signature:TS.validRunSignature(r.signature),veteran:!!r.veteran,sprint:!!r.sprint,daily:typeof r.daily==="string"?r.daily.slice(0,30):null,coop:!!r.coop,seconds:integer(r.seconds),kills:integer(r.kills),level:integer(r.level),
      dealt:integer(r.dealt),healed:integer(r.healed),taken:integer(r.taken),activePath:TS.ACTIVE_PATHS[r.activePath]?r.activePath:null,
      techniquePaths:Object.fromEntries(Object.entries(r.techniquePaths || {}).filter(([id,variant])=>["power","reach"].includes(variant) && TS.TECHNIQUES[r.charId]?.some(move=>move.id===id))),
      techniques:Object.fromEntries(Object.entries(r.techniques || {}).filter(([id,n])=>TS.TECHNIQUES[r.charId]?.some(m=>m.id===id)&&Number.isFinite(n)).map(([id,n])=>[id,Math.min(5,integer(n))]))
    })).sort((a,b)=>b.at-a.at).filter((r,i,arr)=>arr.findIndex(o=>o.id===r.id)===i).slice(0,30);
  }


  function load() {
    data = fresh();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (raw && typeof raw === "object") {
        data = { ...data, ...raw, best: { ...data.best, ...(raw.best || {}) }, settings: { ...data.settings, ...(raw.settings || {}) }, stats: { ...data.stats, ...(raw.stats || {}) }, maps: { ...data.maps, ...(raw.maps || {}) }, achievements: { ...(raw.achievements || {}) } };
        if (!data.owned || !data.owned[TS.STARTER]) data.owned = { ...(data.owned || {}), [TS.STARTER]: { stars: 1 } };
        if (!data.owned[data.selected]) data.selected = TS.STARTER;
        data.coins = Math.max(0, Math.floor(Number(data.coins) || 0));
      }
    } catch {
      // sin almacenamiento: se juega igual, pero no se guarda
    }
    return normalize(data);
  }

  let onChange = null;

  function persist() {
    data.savedAt = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // modo privado o almacenamiento bloqueado
    }
    if (onChange) onChange();
  }

  // Lo que se guarda en la cuenta (sin los ajustes de este dispositivo)
  function exportData() {
    const { settings, ...rest } = get();
    return rest;
  }

  /* Junta el progreso de la cuenta con el de este navegador: se queda
     con todos los personajes, las estrellas, mejoras, logros y récords más
     altos de los dos, y con las monedas y tiradas del más reciente. */
  function mergeRemote(remote) {
    if (!remote || typeof remote !== "object") return;
    const d = get();
    const newer = (Number(remote.savedAt) || 0) > (d.savedAt || 0) ? remote : d;
    const owned = { ...d.owned };
    for (const [id, o] of Object.entries(remote.owned || {})) {
      if (!TS.CHARACTERS.some((c) => c.id === id)) continue;
      owned[id] = { stars: Math.min(TS.GACHA.maxStars, Math.max(owned[id] ? owned[id].stars : 0, Number(o && o.stars) || 1)) };
    }
    const maxObj = (a = {}, b = {}) => {
      const out = { ...a };
      for (const [k, v] of Object.entries(b || {})) if (typeof v === "number") out[k] = Math.max(out[k] || 0, v); else if (v === true) out[k] = true;
      return out;
    };
    Object.assign(d, {
      ...d,
      owned,
      lastCoinAd: Math.max(integer(d.lastCoinAd), integer(remote.lastCoinAd)),
      lastChestAd: Math.max(integer(d.lastChestAd), integer(remote.lastChestAd)),
      redeemedChestAd: Math.max(integer(d.redeemedChestAd), integer(remote.redeemedChestAd)),
      adUnlocks: maxObj(d.adUnlocks, remote.adUnlocks),
      coins: Math.max(0, Math.floor(Number(newer.coins) || 0)),
      pity: Number(newer.pity) || 0,
      pulls: Math.max(d.pulls || 0, Number(remote.pulls) || 0),
      runs: Math.max(d.runs || 0, Number(remote.runs) || 0),
      freePull: d.freePull && remote.freePull !== false,
      shop: maxObj(d.shop, remote.shop),
      best: maxObj(d.best, remote.best),
      bestVeteran: maxObj(d.bestVeteran, remote.bestVeteran),
      bestSprint: maxObj(d.bestSprint,remote.bestSprint),
      mastery:maxObj(d.mastery,remote.mastery),
      stats: maxObj(d.stats, remote.stats),
      achievements: maxObj(d.achievements, remote.achievements),
      maps: maxObj(d.maps, remote.maps),
      selected: owned[newer.selected] ? newer.selected : d.selected,
      tutorial: !!(d.tutorial || remote.tutorial),
      history:normalizeHistory([...(d.history || []),...(Array.isArray(remote.history)?remote.history:[])]),
      weekly: mergeWeekly(d.weekly, remote.weekly)
    });
    normalize(d);
    persist();
  }

  // Misiones de la semana: si las dos son de la misma semana, lo mejor de cada una
  function mergeWeekly(a, b) {
    if (!b || typeof b !== "object" || !b.week) return a || null;
    if (!a || !a.week || b.week > a.week) return { week: b.week, prog: { ...(b.prog || {}) }, claimed: { ...(b.claimed || {}) } };
    if (b.week < a.week) return a;
    const prog = { ...(a.prog || {}) };
    for (const [k, v] of Object.entries(b.prog || {})) if (typeof v === "number") prog[k] = Math.max(prog[k] || 0, v);
    return { week: a.week, prog, claimed: { ...(a.claimed || {}), ...(b.claimed || {}) } };
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
    if (times !== 1 && times !== 10 && !(times === 5 && hasAdPulls())) return null;
    const d = get();
    const free = times === 1 && d.freePull;
    const cost = free || times === 5 ? 0 : times === 10 ? TS.GACHA.cost10 : TS.GACHA.cost1 * times;
    if (d.coins < cost) return null;
    d.coins -= cost;
    if (free) d.freePull = false;
    if (times === 5) d.redeemedChestAd = d.lastChestAd;

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

  function recordRun(result,playerId=0) {
    const d = get();
    d.runs += 1;
    const combat=result.combat?.[playerId] || {},at=Date.now();
    d.history=normalizeHistory([{id:`${at}-${d.runs}-${result.charId}`,at,signature:result.signature,charId:result.charId,map:result.map,seconds:result.seconds,kills:result.kills,level:result.level,daily:result.daily,veteran:result.veteran,sprint:result.sprint,coop:result.coop,dealt:combat.dealt,healed:combat.healed,taken:combat.taken,activePath:result.activePaths?.[playerId],techniques:result.techniques?.[playerId],techniquePaths:result.techniquePaths?.[playerId]},...(d.history || [])]);
    const mastery = TS.mastery(result.charId);
    if (combat[mastery.key] >= mastery.count) d.mastery[result.charId] = true;
    const best = result.sprint ? d.bestSprint : result.veteran ? d.bestVeteran : d.best;
    best.time = Math.max(best.time, result.seconds);
    best.kills = Math.max(best.kills, result.kills);
    best.level = Math.max(best.level, result.level);
    best.streak=Math.max(Number.isFinite(best.streak)?Math.max(0,Math.floor(best.streak)):0,Number.isFinite(result.bestStreak)?Math.max(0,Math.floor(result.bestStreak)):0);
    if (result.victory) best.wins += 1;
    d.coins += result.coins;
    const s = d.stats;
    s.kills += result.kills;
    s.bosses += result.bosses || 0;
    s.wins += result.victory ? 1 : 0;
    s.props += result.props || 0;
    s.coinsEarned += result.coins;
    s.evolutions += result.evolutions || 0;
    if (result.daily) s.dailies += 1;
    if (result.coop) s.coop += 1;
    unlockRoster(d);
    persist();
  }

  return { load, get, exportData, mergeRemote, setOnChange: (fn) => (onChange = fn), persist, addCoins, adUnlockProgress, recordUnlockAd, hasAdPulls, canEarnAdPulls, recordChestAd, chestAdCooldown, shopLevel, shopCost, buy, shopStats, pull, recordRun };
})();
