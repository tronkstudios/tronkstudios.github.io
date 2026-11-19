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
  return {
    unlockedLevel: Math.max(1, bounded(data?.unlockedLevel, 10, 1)),
    atpBank: bounded(data?.atpBank, 99999, 500),
    bioGems: bounded(data?.bioGems, 9999, 25),
    lastDaily: /^\d{4}-\d{2}-\d{2}$/.test(data?.lastDaily || "")
      ? data.lastDaily
      : "",
    dailyRecords: dailyRecords(data?.dailyRecords),
    stars: Array.from({ length: 10 }, (_, i) => bounded(data?.stars?.[i], 3)),
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
      next.lastDaily = [next.lastDaily, this.data.lastDaily].sort().at(-1);
      const shared = { ...next.dailyRecords };
      for (const [day, points] of Object.entries(this.data.dailyRecords)) {
        shared[day] = Math.max(shared[day] || 0, points);
      }
      next.dailyRecords = dailyRecords(shared);
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

  commit() {
    this.changed++;
    this.cache();
    this.notify();
    if (this.user) void this.flush();
  }

  async flush() {
    if (this.busy || !this.user || this.saved === this.changed) return;
    this.busy = true;
    try {
      if (!this.remoteReady) {
        const remote = await this.download();
        this.remoteReady = true;
        if (remote && this.revision !== remote.revision) this.adopt(remote);
        if (!remote) this.revision = 0;
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
