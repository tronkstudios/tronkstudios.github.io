"use strict";

/* TronkStudios · survivors/js/audio.js
   Sonido de Tronk Survivors, todo sintetizado (sin archivos):
   efectos cortos y una música chiptune que se acelera con los jefes.
   Scripts clásicos (ver docs/adr/0002). */

const Sfx = (() => {
  let ctx = null;
  let master = null;
  let sfxGain = null;
  let musicGain = null;
  let noise = null;
  let enabled = { sfx: true, music: true };
  const last = {}; // para no repetir el mismo sonido 50 veces por segundo

  function init() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return;
      }
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 5;
      master = ctx.createGain();
      master.gain.value = 0.7;
      sfxGain = ctx.createGain();
      musicGain = ctx.createGain();
      musicGain.gain.value = enabled.music ? 0.32 : 0;
      sfxGain.gain.value = enabled.sfx ? 1 : 0;
      sfxGain.connect(master);
      musicGain.connect(master);
      master.connect(comp).connect(ctx.destination);
      const n = ctx.sampleRate;
      noise = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
  }

  function setEnabled(kind, on) {
    enabled[kind] = on;
    if (!ctx) return;
    if (kind === "music") musicGain.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.05);
    else sfxGain.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.02);
  }

  function tone(type, freq, start, dur, vol, { slide, dest } = {}) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(dest || sfxGain);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  function hiss(start, dur, vol, { f = 1200, type = "bandpass", f2, dest } = {}) {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(f, start);
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    s.connect(flt).connect(g).connect(dest || sfxGain);
    s.start(start);
    s.stop(start + dur + 0.02);
  }

  const SOUNDS = {
    hit: (t) => hiss(t, 0.05, 0.12, { f: 2200 }),
    kill: (t) => tone("square", 420 + Math.random() * 120, t, 0.07, 0.06, { slide: 0.5 }),
    gem: (t) => tone("triangle", 1200 + Math.random() * 300, t, 0.06, 0.06, { slide: 1.4 }),
    coin: (t) => { tone("square", 988, t, 0.06, 0.05); tone("square", 1319, t + 0.06, 0.1, 0.05); },
    hurt: (t) => { tone("sawtooth", 220, t, 0.18, 0.12, { slide: 0.5 }); hiss(t, 0.12, 0.15, { f: 600 }); },
    slash: (t) => hiss(t, 0.12, 0.13, { f: 3000, f2: 900 }),
    shoot: (t) => tone("square", 760, t, 0.05, 0.035, { slide: 0.6 }),
    punch: (t) => { tone("sine", 160, t, 0.1, 0.3, { slide: 0.5 }); hiss(t, 0.06, 0.12, { f: 900 }); },
    boom: (t) => { tone("sine", 90, t, 0.35, 0.35, { slide: 0.3 }); hiss(t, 0.4, 0.3, { type: "lowpass", f: 1600, f2: 120 }); },
    zap: (t) => { tone("sawtooth", 1400, t, 0.12, 0.05, { slide: 0.3 }); hiss(t, 0.1, 0.08, { f: 4000 }); },
    laser: (t) => tone("sawtooth", 1800, t, 0.18, 0.05, { slide: 0.25 }),
    ice: (t) => { tone("triangle", 1800, t, 0.12, 0.05, { slide: 1.5 }); tone("triangle", 2400, t + 0.04, 0.1, 0.04); },
    wave: (t) => { tone("sine", 70, t, 0.3, 0.4, { slide: 0.6 }); hiss(t, 0.25, 0.2, { type: "lowpass", f: 500 }); },
    dodge: (t) => hiss(t, 0.16, 0.18, { f: 1800, f2: 5000 }),
    eshot: (t) => tone("square", 300, t, 0.08, 0.035, { slide: 1.6 }),
    levelUp: (t) => { [523, 659, 784, 1047].forEach((f, i) => tone("square", f, t + i * 0.07, 0.14, 0.07)); },
    pick: (t) => tone("square", 880, t, 0.05, 0.05),
    boss: (t) => { for (let i = 0; i < 3; i++) { tone("sawtooth", 110, t + i * 0.35, 0.28, 0.12); tone("sawtooth", 116, t + i * 0.35, 0.28, 0.08); } },
    chest: (t) => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone("triangle", f, t + i * 0.06, 0.2, 0.08)); },
    gachaRoll: (t) => { for (let i = 0; i < 10; i++) tone("square", 300 + i * 60, t + i * 0.06, 0.05, 0.04); },
    reveal: (t) => { [784, 988, 1175, 1568].forEach((f, i) => tone("triangle", f, t + i * 0.08, 0.35, 0.08)); hiss(t, 0.6, 0.08, { f: 6000 }); },
    legend: (t) => { [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => { tone("square", f, t + i * 0.08, 0.4, 0.06); tone("triangle", f / 2, t + i * 0.08, 0.4, 0.06); }); },
    click: (t) => tone("square", 660, t, 0.03, 0.04),
    die: (t) => { [392, 330, 262, 196].forEach((f, i) => tone("square", f, t + i * 0.16, 0.2, 0.08)); },
    win: (t) => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone("square", f, t + i * 0.12, 0.2, 0.08)); }
  };

  // gap: segundos mínimos entre dos sonidos iguales
  function play(name, gap = 0.03) {
    if (!ctx || !enabled.sfx || !SOUNDS[name]) return;
    const t = ctx.currentTime;
    if (last[name] && t - last[name] < gap) return;
    last[name] = t;
    SOUNDS[name](t);
  }

  /* ---------- Música ---------- */
  // Notas en semitonos desde La (A2 = 110 Hz). null = silencio.
  const SONGS = {
    menu: { bpm: 96, bass: [0, null, 7, null, 3, null, 7, null, -2, null, 5, null, 3, null, 5, null], lead: [12, 15, 19, 15, 17, 15, 12, null, 10, 12, 14, 12, 15, null, null, null] },
    run: { bpm: 132, bass: [0, 0, 12, 0, 3, 3, 15, 3, 5, 5, 17, 5, 3, 3, 10, 7], lead: [12, null, 15, 17, 19, null, 17, 15, 12, null, 10, 12, 15, null, 14, null] },
    boss: { bpm: 152, bass: [0, 12, 0, 12, 1, 13, 1, 13, 3, 15, 3, 15, 1, 13, -1, 11], lead: [24, 22, 19, 22, 25, 24, 22, 19, 27, 25, 24, 22, 19, null, 18, null] }
  };
  let song = null;
  let step = 0;
  let nextTime = 0;
  let timer = null;

  function startMusic(name) {
    init();
    if (!ctx || song === SONGS[name]) return;
    song = SONGS[name];
    step = 0;
    nextTime = ctx.currentTime + 0.05;
    if (!timer) timer = setInterval(schedule, 50);
  }

  function stopMusic() {
    song = null;
    clearInterval(timer);
    timer = null;
  }

  function schedule() {
    if (!ctx || !song) return;
    const stepDur = 60 / song.bpm / 2;
    while (nextTime < ctx.currentTime + 0.2) {
      const b = song.bass[step % song.bass.length];
      const l = song.lead[step % song.lead.length];
      if (b !== null) tone("triangle", 110 * Math.pow(2, b / 12), nextTime, stepDur * 0.9, 0.22, { dest: musicGain });
      if (l !== null && step % 32 < 28) tone("square", 220 * Math.pow(2, l / 12), nextTime, stepDur * 0.7, 0.05, { dest: musicGain });
      if (step % 4 === 0) hiss(nextTime, 0.05, 0.08, { type: "lowpass", f: 300, dest: musicGain });
      if (step % 4 === 2) hiss(nextTime, 0.04, 0.05, { type: "highpass", f: 6000, dest: musicGain });
      nextTime += stepDur;
      step++;
    }
  }

  return { init, play, startMusic, stopMusic, setEnabled };
})();
