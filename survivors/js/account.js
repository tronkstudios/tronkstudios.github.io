"use strict";

/* TronkStudios · survivors/js/account.js
   Tronk Survivors con la cuenta de TronkStudios (la misma sesión que la
   web, porque están en el mismo sitio):
   - el progreso se guarda también en la cuenta (survivors_saves);
   - los puntos de cada partida suben a la clasificación de la web;
   - los enemigos derrotados cuentan para los retos de la comunidad;
   - el reto diario y el modo infinito tienen su propia clasificación;
   - cada partida pide un «ticket» al empezar y el servidor comprueba al
     final que los números son posibles (y calcula él los puntos).
   Reglas en Supabase: docs/supabase/tronk-survivors.sql.
   Scripts clásicos (ver docs/adr/0002). */

const Account = (() => {
  const SUPABASE_URL = "https://qjjnqhbtovjcbwgcwhgl.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_YPAglgrxaxvaqU8KSS-HkQ_scyeLigm";
  let client = null;
  let user = null;
  let name = "";
  let uploadTimer = 0;
  let runTicket = null; // promesa con el ticket de la partida actual
  const listeners = [];

  const notify = () => listeners.forEach((fn) => fn({ user, name }));

  function getClient() {
    if (!client && window.supabase && window.supabase.createClient) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return client;
  }

  async function init() {
    const c = getClient();
    if (!c) return;
    try {
      const { data } = await c.auth.getSession();
      user = data.session ? data.session.user : null;
      if (user) {
        const { data: profile } = await c.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
        name = (profile && profile.display_name) || "";
        await syncDown();
      }
    } catch (error) {
      console.warn("Tronk Survivors: sin cuenta", error && error.message);
    }
    notify();
  }

  async function syncDown() {
    const { data, error } = await client.from("survivors_saves").select("data").eq("user_id", user.id).maybeSingle();
    if (error) {
      console.warn("No se pudo leer el progreso de la cuenta:", error.message);
      return;
    }
    if (data && data.data) Save.mergeRemote(data.data);
    await upload();
  }

  async function upload() {
    if (!user) return;
    const { error } = await client.rpc("save_survivors", { p_data: Save.exportData() });
    if (error) console.warn("No se pudo guardar el progreso en la cuenta:", error.message);
  }

  // Se llama cada vez que cambia el progreso (se espera un poco y se sube)
  function scheduleUpload() {
    if (!user) return;
    clearTimeout(uploadTimer);
    uploadTimer = setTimeout(upload, 2000);
  }

  function points(r) {
    return Math.round(r.kills + r.seconds * 5 + r.bosses * 500 + (r.victory ? 2000 : 0));
  }

  // Al empezar cada partida
  function startRun() {
    runTicket = null;
    if (!user) return;
    runTicket = client.rpc("start_survivors_run").then(({ data, error }) => {
      if (error) { console.warn("No se pudo empezar la partida en la cuenta:", error.message); return null; }
      return data;
    }, () => null);
  }

  async function submitRun(r) {
    if (!user || !runTicket) return null;
    const ticket = await runTicket;
    runTicket = null;
    if (!ticket) return null;
    try {
      const { data, error } = await client.rpc("submit_survivors_run", {
        p_run: ticket,
        p_seconds: Math.floor(r.seconds),
        p_kills: Math.floor(r.kills),
        p_bosses: Math.floor(r.bosses || 0),
        p_level: Math.max(1, Math.floor(r.level || 1)),
        p_victory: !!r.victory,
        p_endless: !!r.endless,
        p_character: r.charId || "",
        p_map: r.map || "bosque",
        p_daily: r.daily || null
      });
      if (error) throw error;
      return data && data.points;
    } catch (error) {
      console.warn("No se pudo guardar la partida:", error && error.message);
      return null;
    }
  }

  async function dailyTop(day) {
    const c = getClient();
    if (!c) return [];
    const { data, error } = await c
      .from("survivors_daily")
      .select("score, character, user_id, profiles(display_name)")
      .eq("day", day)
      .order("score", { ascending: false })
      .limit(10);
    if (error) return [];
    return data.map((row) => ({ score: row.score, character: row.character, me: user && row.user_id === user.id, name: (row.profiles && row.profiles.display_name) || "Tronker" }));
  }

  async function endlessTop() {
    const c = getClient();
    if (!c) return [];
    const { data, error } = await c
      .from("survivors_endless")
      .select("seconds, kills, character, map, user_id, profiles(display_name)")
      .order("seconds", { ascending: false })
      .limit(10);
    if (error) return [];
    return data.map((row) => ({ seconds: row.seconds, kills: row.kills, character: row.character, map: row.map, me: user && row.user_id === user.id, name: (row.profiles && row.profiles.display_name) || "Tronker" }));
  }

  return {
    init,
    startRun,
    endlessTop,
    scheduleUpload,
    submitRun,
    dailyTop,
    points,
    onChange: (fn) => listeners.push(fn),
    get user() { return user; },
    get name() { return name; },
    get client() { return getClient(); }
  };
})();
