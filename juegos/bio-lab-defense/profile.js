import { HEROES, HERO_BY_ID, CONTRACT_BY_ID, MASTERY } from "./operations.js?v=8";

import { MISSIONS } from "./campaign.js?v=16";

const KEY = "biolab_save_v1";
const bounded = (value, max, fallback = 0) =>
  Number.isInteger(value) ? Math.min(max, Math.max(0, value)) : fallback;

function dailyRecords(value) {
  const entries = Object.entries(value || {}).filter(
    ([key, score]) =>
      /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isInteger(score) && score > 0,
  );
  return Object.fromEntries(
    entries.sort(([a], [b]) => b.localeCompare(a)).slice(0, 21),
  );
}

export function normalize(data = {}) {
  const heroAds = Object.fromEntries(HEROES.filter((hero) => hero.ads).map((hero) => [
    hero.id, bounded(data?.heroAds?.[hero.id], hero.ads),
  ]));
  const heroOwned = Object.fromEntries(HEROES.map((hero) => [
    hero.id, hero.cost === 0 || data?.heroOwned?.[hero.id] === true || heroAds[hero.id] === hero.ads,
  ]));
  const contracts = Object.fromEntries(
    [...CONTRACT_BY_ID.keys()].map((id) => [id, bounded(data?.contracts?.[id], 1000000)]),
  );
  const stars = Array.from({ length: MISSIONS.length }, (_, i) => bounded(data?.stars?.[i], 3));
  const nextSector = Math.min(MISSIONS.length, stars.findLastIndex(Boolean) + 2);
  return {
    learnedUpgrade: data?.learnedUpgrade === true,
    heroAds,
    heroOwned,
    heroEquipped: heroOwned[data?.heroEquipped] === true ? data.heroEquipped : "iris",
    contracts,
    masteryMedals: Object.fromEntries(MASTERY.map(({ id }) => [id, data?.masteryMedals?.[id] === true])),
    veteranRecords: Array.from({ length: MISSIONS.length }, (_, i) => bounded(data?.veteranRecords?.[i], 1000000)),
    unlockedLevel: Math.max(nextSector, bounded(data?.unlockedLevel, MISSIONS.length, 1)),
    atpBank: bounded(data?.atpBank, 99999, 500),
    bioGems: bounded(data?.bioGems, 9999, 25),
    lastDaily: /^\d{4}-\d{2}-\d{2}$/.test(data?.lastDaily || "")
      ? data.lastDaily
      : "",
    dailyRecords: dailyRecords(data?.dailyRecords),
    medals: Array.from({ length: MISSIONS.length }, (_, i) => data?.medals?.[i] === true),
    stars,
  };
}

export function dayKey() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format();
}

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export class Profile {
  constructor(notify) {
    this.notify = notify;
    this.data = normalize(read(KEY));
    this.status = "Comprobando cuenta…";
    this.user = null;
    this.revision = 0;
    this.changed = 0;
    this.saved = 0;
  }

  async init() {
    try {
      this.client = window.supabase?.createClient(
        "https://qjjnqhbtovjcbwgcwhgl.supabase.co",
        "sb_publishable_YPAglgrxaxvaqU8KSS-HkQ_scyeLigm",
      );
      const { data } = (await this.client?.auth.getSession()) || {};
      this.user = data?.session?.user?.id || null;
      if (!this.user) {
        this.status = "Progreso de invitado en este dispositivo.";
        return;
      }
      this.key = `${KEY}:${this.user}`;
      const cache = read(this.key);
      const guest = read(KEY);
      this.data = normalize(cache?.data || guest);
      this.revision = bounded(cache?.revision, Number.MAX_SAFE_INTEGER);
      this.changed = cache?.dirty ? 1 : 0;
      const remote = await this.download();
      this.guest = !cache && !remote ? guest : null;
      this.remoteReady = true;
      if (remote && (!cache?.dirty || this.revision !== remote.revision)) {
        this.adopt(remote);
        if (cache?.dirty) this.changed++;
      } else if (!remote) {
        this.revision = 0;
        this.changed++;
      }
      this.status = "Cuenta de TronkStudios vinculada.";
      this.cache();
      if (this.saved !== this.changed) void this.flush();
    } catch {
      this.status = this.user
        ? "Cuenta detectada. Sincronización pendiente."
        : "Progreso guardado en este navegador.";
    } finally {
      this.notify();
    }
  }

  async download() {
    const { data, error } = await this.client
      .from("bio_lab_saves")
      .select("data,revision")
      .eq("user_id", this.user)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  adopt(remote) {
    const next = normalize(remote.data);
    if (this.changed !== this.saved) {
      next.unlockedLevel = Math.max(
        next.unlockedLevel,
        this.data.unlockedLevel,
      );
      next.stars = next.stars.map((stars, i) =>
        Math.max(stars, this.data.stars[i]),
      );
      next.learnedUpgrade ||= this.data.learnedUpgrade;
      next.medals = next.medals.map(
        (earned, i) => earned || this.data.medals[i],
      );
      next.lastDaily = [next.lastDaily, this.data.lastDaily].sort().at(-1);
      const shared = { ...next.dailyRecords };
      for (const [day, points] of Object.entries(this.data.dailyRecords)) {
        shared[day] = Math.max(shared[day] || 0, points);
      }
      next.dailyRecords = dailyRecords(shared);
      next.veteranRecords = next.veteranRecords.map((score, i) =>
        Math.max(score, this.data.veteranRecords[i]),
      );
      for (const hero of HEROES) {
        if (!hero.ads) continue;
        next.heroAds[hero.id] = Math.max(next.heroAds[hero.id], this.data.heroAds[hero.id]);
        if (next.heroAds[hero.id] >= hero.ads) next.heroOwned[hero.id] = true;
        if (!next.heroOwned[hero.id] && this.data.heroOwned[hero.id] && next.bioGems >= hero.cost) {
          next.bioGems -= hero.cost;
          next.heroOwned[hero.id] = true;
        }
      }
      if (next.heroOwned[this.data.heroEquipped])
        next.heroEquipped = this.data.heroEquipped;
      for (const { id } of MASTERY)
        next.masteryMedals[id] ||= this.data.masteryMedals[id];
      for (const [id, score] of Object.entries(this.data.contracts))
        next.contracts[id] = Math.max(next.contracts[id], score);
    }
    // Keep one wallet when two devices have spent or earned from the same version.
    Object.assign(this.data, next);
    this.revision = remote.revision;
  }

  cache() {
    const stored = this.user
      ? write(this.key, {
          data: this.data,
          revision: this.revision,
          dirty: this.changed !== this.saved,
        })
      : write(KEY, this.data);
    if (!stored)
      this.status = "El navegador impide guardar en este dispositivo.";
  }

  recordDaily(day, score) {
    if (score <= (this.data.dailyRecords[day] || 0)) return false;
    this.data.dailyRecords = dailyRecords({
      ...this.data.dailyRecords,
      [day]: score,
    });
    this.commit();
    return true;
  }

  buyHero(id) {
    const hero = HERO_BY_ID.get(id);
    if (!hero || this.data.heroOwned[id] || this.data.bioGems < hero.cost) return false;
    this.data.bioGems -= hero.cost;
    this.data.heroOwned[id] = true;
    this.commit();
    return true;
  }

  recordHeroAd(id) {
    const hero = HERO_BY_ID.get(id);
    if (!hero?.ads || this.data.heroOwned[id]) return false;
    this.data.heroAds[id] = Math.min(hero.ads, this.data.heroAds[id] + 1);
    this.data.heroOwned[id] = this.data.heroAds[id] >= hero.ads;
    this.commit();
    return true;
  }

  equipHero(id) {
    if (!HERO_BY_ID.has(id) || !this.data.heroOwned[id]) return false;
    this.data.heroEquipped = id;
    this.commit();
    return true;
  }

  recordContract(id, points, medal = false) {
    const contract = CONTRACT_BY_ID.get(id);
    if (!contract) return false;
    const improved = points > this.data.contracts[id];
    const earnedMedal = contract.mastery && medal && !this.data.masteryMedals[id];
    if (improved) this.data.contracts[id] = points;
    if (earnedMedal) this.data.masteryMedals[id] = true;
    if (improved || earnedMedal) this.commit();
    return improved;
  }

  recordVeteran(level, points) {
    const index = level - 1;
    if (!this.data.stars[index] || points <= this.data.veteranRecords[index]) return false;
    this.data.veteranRecords[index] = points;
    this.commit();
    return true;
  }

  commit() {
    this.changed++;
    this.cache();
    this.notify();
    if (this.user) void this.flush();
  }

  async flush() {
    if (this.busy || !this.user || (this.remoteReady && this.saved === this.changed)) return;
    this.busy = true;
    try {
      if (!this.remoteReady) {
        const remote = await this.download();
        this.remoteReady = true;
        if (remote && (this.saved === this.changed || this.revision !== remote.revision)) this.adopt(remote);
        if (!remote) {
          this.revision = 0;
          if (this.saved === this.changed) this.changed++;
        }
        this.status = "Cuenta de TronkStudios vinculada.";
        this.cache();
      }
      let conflicts = 0;
      while (this.changed !== this.saved) {
        const sent = this.changed;
        const { data, error } = await this.client.rpc("save_bio_lab", {
          p_owner: this.user,
          p_revision: this.revision,
          p_data: normalize(this.data),
        });
        if (error) throw error;
        if (data == null) {
          const remote = await this.download();
          if (!remote || ++conflicts > 3)
            throw new Error("Conflicto de guardado");
          this.adopt(remote);
          continue;
        }
        this.revision = data;
        this.saved = sent;
        if (
          this.guest &&
          JSON.stringify(read(KEY)) === JSON.stringify(this.guest)
        ) {
          try {
            localStorage.removeItem(KEY);
          } catch {
            /* cache is optional */
          }
          this.guest = null;
        }
        this.status = "Progreso sincronizado con tu cuenta.";
        this.cache();
      }
    } catch {
      this.status = "Guardado local. Sincronización pendiente.";
      this.cache();
    } finally {
      this.busy = false;
      this.notify();
    }
  }
}
