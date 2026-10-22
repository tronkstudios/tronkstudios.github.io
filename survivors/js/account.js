"use strict";

/* TronkStudios · survivors/js/account.js
   Tronk Survivors con la cuenta de TronkStudios (la misma sesión que la
   web, porque están en el mismo sitio):
   - el progreso se guarda también en la cuenta (survivors_saves);
   - los puntos de cada partida suben a la clasificación de la web;
   - los enemigos derrotados cuentan para los retos de la comunidad;
   - el reto diario tiene su propia clasificación.
   Reglas en Supabase: docs/supabase/tronk-survivors.sql.
   Scripts clásicos (ver docs/adr/0002). */

const Account = (() => {
  const SUPABASE_URL = "https://qjjnqhbtovjcbwgcwhgl.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_YPAglgrxaxvaqU8KSS-HkQ_scyeLigm";
  let client = null;
  let user = null;
  let name = "";
  let uploadTimer = 0;
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

  async function submitRun(r) {
    if (!user) return null;
    const score = points(r);
    try {
      await client.rpc("submit_score", { p_game: "survivors", p_score: score });
      if (r.kills > 0) await client.rpc("add_challenge_progress", { p_game: "survivors", p_amount: Math.min(3000, r.kills) });
      if (r.daily) await client.rpc("submit_survivors_daily", { p_day: r.daily, p_score: score, p_character: r.charId || "" });
    } catch (error) {
      console.warn("No se pudo guardar la partida:", error && error.message);
    }
    return score;
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

  return {
    init,
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
