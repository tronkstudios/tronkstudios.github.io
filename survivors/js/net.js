"use strict";

/* TronkStudios · survivors/js/net.js
   Jugar con amigos online (hasta 4).
   - Supabase Realtime solo se usa para encontrarse (canal «survivors-CÓDIGO»).
   - Luego los jugadores se conectan directamente entre ellos (WebRTC):
     si estáis en la misma wifi va como en LAN.
   - El anfitrión simula la partida y manda fotos del estado unas 15
     veces por segundo; los invitados mandan sus movimientos.
   Scripts clásicos (ver docs/adr/0002). */

const TronkNet = (() => {
  const ICE = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
  const WORKER_URL = "https://tronkstudios-support.tronkstudios7.workers.dev";
  let iceServers = null; // STUN + los de reenvío (TURN) que da el servidor

  // Servidores de reenvío para redes que no dejan conectar directamente.
  // Si no llegan a tiempo, se juega igual con STUN.
  function loadIce() {
    if (iceServers) return Promise.resolve(iceServers);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    return fetch(`${WORKER_URL}/turn`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => { iceServers = [...ICE, ...(Array.isArray(d.iceServers) ? d.iceServers : [])]; return iceServers; })
      .catch(() => ICE)
      .finally(() => clearTimeout(timer));
  }
  const MAX = 4;
  const myId = Math.random().toString(36).slice(2, 10);
  let channel = null;
  let room = null; // { code, host: bool }
  const pendingCandidates = new Map();
  let peers = new Map(); // id → { pc, game, ctrl, setup, index }
  let lobby = []; // jugadores en la sala (el anfitrión primero)
  let container = null;
  let status = "";
  let playing = false;
  let snapTimer = 0;
  let lastInput = 0;
  let hostId = null;
  let connecting = false;
  let endPending = false;
  let endTimer = 0;

  const $el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  function mySetup() {
    const s = TronkUI.localSetup();
    return { ...s, name: Account.name || s.name };
  }

  function makeCode() {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let c = "";
    for (let i = 0; i < 5; i++) c += abc[Math.floor(Math.random() * abc.length)];
    return c;
  }

  /* ---------- canal de encuentro ---------- */

  function send(msg) {
    if (channel) channel.send({ type: "broadcast", event: "sig", payload: { ...msg, from: myId } });
  }

  async function openChannel(code) {
    await loadIce();
    const client = Account.client;
    if (!client) throw new Error("sin conexión");
    channel = client.channel(`survivors-${code}`, { config: { broadcast: { self: false } } });
    channel.on("broadcast", { event: "sig" }, ({ payload }) => {
      onSignal(payload).catch(() => { if (payload && payload.from) dropPeer(payload.from); });
    });
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), 10000);
      channel.subscribe((s) => {
        if (s === "SUBSCRIBED") { clearTimeout(t); resolve(); }
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") { clearTimeout(t); reject(new Error(s)); }
      });
    });
  }

  async function createRoom() {
    if (connecting || room) return;
    connecting = true;
    status = L("Conectando…");
    render();
    try {
      const code = makeCode();
      await openChannel(code);
      room = { code, host: true };
      hostId = myId;
      lobby = [{ id: myId, ...mySetup() }];
      status = "";
    } catch {
      status = L("No se ha podido conectar. Inténtalo otra vez.");
      leave();
    }
    connecting = false;
    render();
  }

  async function joinRoom(code) {
    code = String(code || "").trim().toUpperCase();
    if (connecting || room) return;
    if (!/^[A-HJ-NP-Z2-9]{5}$/.test(code)) { status = L("Introduce un código de 5 caracteres."); render(); return; }
    connecting = true;
    status = L("Conectando…");
    render();
    try {
      await openChannel(code);
      room = { code, host: false };
      send({ type: "hello", setup: mySetup() });
      // si nadie responde, la sala no existe
      setTimeout(() => {
        if (room && !room.host && !hostId) { status = L("No se ha encontrado la sala."); leave(true); render(); }
      }, 6000);
    } catch {
      status = L("No se ha podido conectar. Inténtalo otra vez.");
      leave(true);
    }
    connecting = false;
    render();
  }

  /* ---------- WebRTC ---------- */

  function newPeer(id) {
    const pc = new RTCPeerConnection({ iceServers: iceServers || ICE });
    const peer = { id, pc, game: null, ctrl: null, setup: null, candidates: pendingCandidates.get(id) || [], disconnectTimer: 0, lastInput: performance.now() };
    pendingCandidates.delete(id);
    pc.onicecandidate = (e) => { if (e.candidate) send({ type: "ice", to: id, cand: e.candidate }); };
    pc.onconnectionstatechange = () => {
      clearTimeout(peer.disconnectTimer);
      if (pc.connectionState === "disconnected") peer.disconnectTimer = setTimeout(() => dropPeer(id), 5000);
      else if (["failed", "closed"].includes(pc.connectionState)) dropPeer(id);
    };
    peers.set(id, peer);
    return peer;
  }

  function wire(peer, dc) {
    if (dc.label === "game") peer.game = dc; else peer.ctrl = dc;
    dc.onmessage = (e) => onData(peer, dc.label, e.data);
    dc.onopen = () => { if (room && !room.host && dc.label === "ctrl") status = L("Esperando a que el anfitrión empiece…"); render(); };
  }

  async function onSignal(m) {
    if (!m || typeof m !== "object") return;
    if (!room || m.from === myId || (m.to && m.to !== myId)) return;
    if (room.host) {
      if (m.type === "hello") {
        if (peers.has(m.from)) return;
        if (lobby.length >= MAX || playing) { send({ type: "full", to: m.from }); return; }
        const peer = newPeer(m.from);
        peer.setup = m.setup;
        wire(peer, peer.pc.createDataChannel("game", { ordered: false, maxRetransmits: 0 }));
        wire(peer, peer.pc.createDataChannel("ctrl"));
        const offer = await peer.pc.createOffer();
        await peer.pc.setLocalDescription(offer);
        send({ type: "offer", to: m.from, sdp: peer.pc.localDescription });
        lobby.push({ id: m.from, ...m.setup });
        broadcastLobby();
        render();
      } else if (m.type === "answer") {
        const peer = peers.get(m.from);
        if (peer) await setRemote(peer, m.sdp);
      } else if (m.type === "ice") {
        const peer = peers.get(m.from);
        if (!peer) {
          const queue = pendingCandidates.get(m.from) || [];
          if (queue.length < 32) queue.push(m.cand);
          pendingCandidates.set(m.from, queue);
        }
        if (peer) {
          if (!peer.pc.remoteDescription) peer.candidates.push(m.cand);
          else try { await peer.pc.addIceCandidate(m.cand); } catch { /* candidato caducado */ }
        }
      } else if (m.type === "bye") dropPeer(m.from);
    } else {
      if (m.type === "full") { status = L("La sala está llena."); leave(true); render(); return; }
      if (m.type === "offer") {
        if (hostId || peers.has(m.from)) return;
        hostId = m.from;
        const peer = newPeer(m.from);
        peer.pc.ondatachannel = (e) => wire(peer, e.channel);
        await setRemote(peer, m.sdp);
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        send({ type: "answer", to: m.from, sdp: peer.pc.localDescription });
      } else if (m.type === "ice") {
        const peer = peers.get(m.from);
        if (!peer) {
          const queue = pendingCandidates.get(m.from) || [];
          if (queue.length < 32) queue.push(m.cand);
          pendingCandidates.set(m.from, queue);
        }
        if (peer) {
          if (!peer.pc.remoteDescription) peer.candidates.push(m.cand);
          else try { await peer.pc.addIceCandidate(m.cand); } catch { /* candidato caducado */ }
        }
      } else if (m.type === "lobby") {
        lobby = m.lobby;
        render();
      }
    }
  }

  async function setRemote(peer, sdp) {
    await peer.pc.setRemoteDescription(sdp);
    for (const candidate of peer.candidates.splice(0)) {
      try { await peer.pc.addIceCandidate(candidate); } catch { /* candidato caducado */ }
    }
  }

  function dropPeer(id) {
    const peer = peers.get(id);
    if (!peer) return;
    clearTimeout(peer.disconnectTimer);
    peers.delete(id);
    peer.pc.onconnectionstatechange = null;
    try { peer.pc.close(); } catch { /* ya cerrada */ }
    if (room && room.host) {
      lobby = lobby.filter((p) => p.id !== id);
      if (playing && peer.index !== undefined) Game.dropPlayer(peer.index);
      broadcastLobby();
      render();
    } else if (id === hostId) {
      if (playing) TronkUI.toast(L("Se ha perdido la conexión con el anfitrión."));
      const wasPlaying = playing;
      leave(true);
      if (wasPlaying) TronkUI.backToMenu();
      render();
    }
  }

  function sendCtrl(peer, msg) {
    if (peer.ctrl && peer.ctrl.readyState === "open") peer.ctrl.send(JSON.stringify(msg));
  }

  function broadcastLobby() {
    const msg = { type: "lobby", lobby: lobby.map(({ id, name, charId }) => ({ id, name, charId })) };
    send(msg);
  }

  /* ---------- datos de la partida ---------- */

  function onData(peer, label, raw) {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!room || peers.get(peer.id) !== peer) return; // llega algo después de salir de la sala
    if (room.host) {
      if (m.type === "in" && peer.index !== undefined) {
        peer.lastInput = performance.now();
        peer.ab = m.ab | 0;
        Game.setInput(peer.index, { x: Math.max(-1, Math.min(1, +m.x || 0)), y: Math.max(-1, Math.min(1, +m.y || 0)), ab: peer.ab });
      }
      else if (m.type === "reroll" && peer.index !== undefined) Game.reroll(peer.index);
      else if (m.type === "choose" && peer.index !== undefined) Game.choose(peer.index, Math.max(0, Math.min(3, m.i | 0)));
    } else {
      if (m.type === "snap") Game.applySnapshot(m.d);
      else if (m.type === "start") startAsGuest(m);
      else if (m.type === "choices") TronkUI.showLevelUp({ options: m.options, level: m.level, rerolls: m.rerolls });
      else if (m.type === "chosenWait") TronkUI.waitOthers();
      else if (m.type === "resume") TronkUI.hideLevelUp();
      else if (m.type === "end") { playing = false; if (Game.state) Game.state.over = true; TronkUI.showEnd(m.result); }
      else if (m.type === "toast") TronkUI.toast(m.text);
      else if (m.type === "banner") TronkUI.banner(m.text, m.small);
    }
  }

  function readyToStart() {
    return lobby.every(p => p.id === myId || (peers.get(p.id)?.ctrl?.readyState === "open" && peers.get(p.id)?.game?.readyState === "open"));
  }

  function startHost() {
    if (!room || !room.host || endPending || !readyToStart()) return;
    const order = lobby.filter((p) => p.id === myId || (peers.get(p.id) && peers.get(p.id).ctrl && peers.get(p.id).ctrl.readyState === "open"));
    const setups = order.map((p) => ({ charId: p.charId, stars: p.stars, meta: p.meta, name: p.name }));
    const map = TronkUI.selectedMap ? TronkUI.selectedMap() : "bosque";
    order.forEach((p, i) => {
      const peer = peers.get(p.id);
      if (!peer) return;
      peer.index = i;
      sendCtrl(peer, { type: "start", localId: i, map, players: setups.map(({ charId, name }) => ({ charId, name })) });
    });
    playing = true;
    TronkUI.play(setups, { mode: "host", localId: 0, map });
    clearInterval(snapTimer);
    snapTimer = setInterval(sendSnapshots, 66);
  }

  function sendSnapshots() {
    const st = Game.state;
    if (!st || st.guest || !playing) return;
    for (const peer of peers.values()) if (peer.index !== undefined && performance.now() - peer.lastInput > 300) {
      Game.setInput(peer.index, { x: 0, y: 0, ab: peer.ab || 0 });
    }
    const snap = JSON.stringify({ type: "snap", d: Game.snapshot(st.players) });
    for (const peer of peers.values()) if (peer.game && peer.game.readyState === "open") {
      try { peer.game.send(snap); } catch { /* mensaje perdido */ }
    }
  }

  function startAsGuest(m) {
    playing = true;
    TronkUI.playGuest({ localId: m.localId, map: m.map, players: m.players });
  }

  // Del juego del anfitrión a los invitados
  Game.on("netChoices", (choosing) => {
    if (!room || !room.host) return;
    for (const peer of peers.values()) if (peer.index !== undefined && choosing[peer.index]) sendCtrl(peer, { type: "choices", options: choosing[peer.index], level: Game.state.level, rerolls: Game.state.players[peer.index].rerolls });
  });
  Game.on("resume", () => { if (room && room.host) for (const peer of peers.values()) sendCtrl(peer, { type: "resume" }); });
  Game.on("toast", (d) => { if (room && room.host && playing) for (const peer of peers.values()) sendCtrl(peer, { type: "toast", text: d.text }); });
  Game.on("boss", (d) => { if (room && room.host && playing) for (const peer of peers.values()) sendCtrl(peer, { type: "banner", text: L("¡JEFE!"), small: d.name }); });
  Game.on("finalPhase", d => {
    if (room && room.host && playing) for (const peer of peers.values()) sendCtrl(peer, {type:"banner",text:L(d.round === 1 ? "¡JEFE FINAL!" : "¡NUEVA FASE!"),small:`${L("Fase")} ${d.round}`});
  });
  Game.on("victory", () => { if (room && room.host && playing) for (const peer of peers.values()) sendCtrl(peer, { type: "banner", text: L("¡VICTORIA!"), small: L("El anfitrión decide si seguir en modo infinito") }); });
  Game.on("endless", () => { if (room && room.host && playing) for (const peer of peers.values()) sendCtrl(peer, { type: "banner", text: L("¡MODO INFINITO!"), small: L("Aguanta todo lo que puedas") }); });
  Game.on("end", (r) => {
    if (!room || !room.host || !playing) return;
    playing = false;
    endPending = true;
    clearInterval(snapTimer);
    for (const peer of peers.values()) sendCtrl(peer, { type: "end", result: r });
    // La pantalla final llama a leave inmediatamente. Mantener el canal
    // un momento permite entregar el resultado antes de cerrar el PC.
    endTimer = setTimeout(() => { endPending = false; leave(); render(); }, 2000);
  });
  Game.on("guestInput", (inp) => {
    const now = performance.now();
    if (now - lastInput < 40) return;
    lastInput = now;
    const host = peers.get(hostId);
    if (host && host.game && host.game.readyState === "open") host.game.send(JSON.stringify({ type: "in", x: +inp.x.toFixed(2), y: +inp.y.toFixed(2), ab: inp.ab | 0 }));
  });

  function sendChoice(i) {
    const host = peers.get(hostId);
    if (host) sendCtrl(host, { type: "choose", i });
    TronkUI.waitOthers();
  }

  function leave(silent) {
    clearTimeout(endTimer); endPending = false;
    clearInterval(snapTimer);
    if (channel) {
      if (!silent) send({ type: "bye" });
      try { channel.unsubscribe(); } catch { /* ya cerrado */ }
    }
    channel = null;
    for (const peer of peers.values()) {
      clearTimeout(peer.disconnectTimer);
      peer.pc.onconnectionstatechange = null;
      try { peer.pc.close(); } catch { /* ya cerrada */ }
    }
    peers = new Map();
    pendingCandidates.clear();
    room = null;
    hostId = null;
    lobby = [];
    playing = false;
    connecting = false;
  }

  /* ---------- pantalla de la sala ---------- */

  function render(el) {
    if (el) container = el;
    if (!container) return;
    container.textContent = "";
    const box = $el("div", "online-grid");
    container.appendChild(box);
    if (!Account.client) {
      box.appendChild($el("p", "online-note", L("No se puede conectar con el servidor ahora mismo.")));
      return;
    }
    if (!room) {
      box.appendChild($el("p", "online-note", L("Cada uno juega con su personaje elegido y sus mejoras. Los jugadores se conectan directamente entre ellos.")));
      const create = $el("button", "btn btn-big", L("Crear sala"));
      create.disabled = connecting;
      create.addEventListener("click", createRoom);
      const input = $el("input", "online-input");
      input.placeholder = L("Código de la sala");
      input.maxLength = 5;
      input.autocomplete = "off";
      const join = $el("button", "btn", L("Unirse"));
      join.disabled = connecting;
      join.addEventListener("click", () => joinRoom(input.value));
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") joinRoom(input.value); });
      box.append(create, input, join);
    } else {
      box.appendChild($el("div", "online-code", room.code));
      if (room.host) box.appendChild($el("p", "online-note", L("Pásale este código a tus amigos (hasta 4 jugadores).")));
      box.appendChild($el("b", "", LT("players", { n: lobby.length || 1 })));
      const list = $el("div", "online-players");
      for (const p of lobby.length ? lobby : [{ id: myId, ...mySetup() }]) {
        const row = $el("div", "online-player");
        const img = document.createElement("img");
        img.src = Sprites.portrait(p.charId, 1);
        img.alt = "";
        row.append(img, $el("span", "", p.name + (p.id === hostId || (room.host && p.id === myId) ? " ★" : "")));
        list.appendChild(row);
      }
      box.appendChild(list);
      if (room.host) {
        const start = $el("button", "btn btn-big", L("Empezar partida"));
        start.disabled = endPending || !readyToStart();
        start.addEventListener("click", startHost);
        box.appendChild(start);
      }
      const out = $el("button", "btn", L("Salir de la sala"));
      out.addEventListener("click", () => { leave(); render(); });
      box.appendChild(out);
    }
    if (status) box.appendChild($el("p", "online-note", L(status)));
  }

  window.addEventListener("beforeunload", () => leave());

  return { render, sendChoice, sendReroll() {const host=peers.get(hostId);if(host)sendCtrl(host,{type:"reroll"});}, leave: () => { if (!playing && !endPending) leave(); }, get active() { return !!room; }, get isHost() { return !!(room && room.host); } };
})();

window.TronkNet = TronkNet;
