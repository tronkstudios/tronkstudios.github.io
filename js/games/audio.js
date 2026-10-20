"use strict";

/* TronkStudios · js/games/audio.js
   Sonido de los minijuegos (Web Audio, sin archivos).
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   SONIDO DE LOS MINIJUEGOS (música de cada juego + efectos)
   Todo se genera con Web Audio: no hace falta subir archivos
   de audio al repositorio.
   ========================================================= */

const TronkSound = (() => {
  const MUTE_KEY = "tronk-sound-muted";

  let ctx = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let reverb = null;
  let noiseBuffer = null;

  let muted = false;

  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    muted = false;
  }

  /* ---------------- Inicialización ---------------- */

  // Se llama al hacer clic (los navegadores no dejan sonar nada antes).
  function ensure() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;

    if (!AudioCtx) {
      return null;
    }

    if (!ctx) {
      ctx = new AudioCtx();

      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.85;
      master.connect(ctx.destination);

      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.9;
      sfxBus.connect(master);

      musicBus = ctx.createGain();
      musicBus.gain.value = 0.0;
      musicBus.connect(master);

      // Reverb suave para el piano.
      reverb = ctx.createConvolver();
      reverb.buffer = makeImpulse(2.6);
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      reverb.connect(wet);
      wet.connect(musicBus);

      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    return ctx;
  }

  function makeImpulse(seconds) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);

      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
      }
    }

    return impulse;
  }

  /* ---------------- Silenciar ---------------- */

  function setMuted(value) {
    muted = value;

    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // LocalStorage no disponible.
    }

    if (master && ctx) {
      master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05);
    }

    document.querySelectorAll(".game-sound-toggle").forEach((button) => {
      button.replaceChildren(makeIcon(muted ? "volume-off" : "volume"));
      button.setAttribute("aria-label", muted ? "Activar sonido" : "Silenciar");
      button.setAttribute("aria-pressed", muted ? "true" : "false");
    });
  }

  function isMuted() {
    return muted;
  }

  /* ---------------- Piezas básicas ---------------- */

  function tone({
    freq = 440,
    to = null,
    type = "sine",
    dur = 0.2,
    vol = 0.2,
    attack = 0.005,
    delay = 0,
    filter = null
  }) {
    if (!ensure()) {
      return;
    }

    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    if (to) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    }

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let node = osc;

    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filter;
      osc.connect(f);
      node = f;
    }

    node.connect(gain);
    gain.connect(sfxBus);

    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise({
    dur = 0.2,
    vol = 0.2,
    type = "lowpass",
    freq = 1000,
    to = null,
    q = 1,
    delay = 0,
    attack = 0.003
  }) {
    if (!ensure()) {
      return;
    }

    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    src.buffer = noiseBuffer;
    src.loop = true;

    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t);

    if (to) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    }

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxBus);

    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  /* ---------------- Efectos de sonido ---------------- */

  const SFX = {
    // ---- Antitronks ----
    gunshot() {
      noise({ dur: 0.14, vol: 0.55, type: "bandpass", freq: 2200, to: 500, q: 0.7 });
      tone({ freq: 160, to: 45, type: "sine", dur: 0.16, vol: 0.6 });
      noise({ dur: 0.5, vol: 0.08, type: "lowpass", freq: 900, to: 200, delay: 0.03, attack: 0.02 });
    },

    enemyShot() {
      noise({ dur: 0.2, vol: 0.35, type: "lowpass", freq: 1500, to: 300 });
      tone({ freq: 120, to: 40, dur: 0.2, vol: 0.4 });
      noise({ dur: 0.6, vol: 0.06, type: "lowpass", freq: 600, delay: 0.05, attack: 0.03 });
    },

    hitBody() {
      tone({ freq: 210, to: 80, dur: 0.14, vol: 0.4 });
      noise({ dur: 0.09, vol: 0.25, type: "lowpass", freq: 700 });
    },

    headshot() {
      SFX.hitBody();
      tone({ freq: 1320, dur: 0.35, vol: 0.12, type: "triangle", delay: 0.04 });
      tone({ freq: 1980, dur: 0.3, vol: 0.07, type: "sine", delay: 0.07 });
    },

    woodHit() {
      tone({ freq: 340, to: 170, type: "triangle", dur: 0.09, vol: 0.35 });
      noise({ dur: 0.06, vol: 0.2, type: "bandpass", freq: 1100, q: 2 });
    },

    ricochet() {
      tone({ freq: 2600, to: 900, type: "sine", dur: 0.18, vol: 0.05 });
      noise({ dur: 0.06, vol: 0.08, type: "highpass", freq: 3000 });
    },

    enemyAppear() {
      noise({ dur: 0.18, vol: 0.05, type: "bandpass", freq: 500, to: 1400, q: 1.5, attack: 0.05 });
    },

    warning() {
      tone({ freq: 880, dur: 0.07, vol: 0.08, type: "square", filter: 2000 });
    },

    playerHurt() {
      tone({ freq: 95, to: 55, type: "sawtooth", dur: 0.4, vol: 0.22, filter: 500 });
      noise({ dur: 0.25, vol: 0.2, type: "lowpass", freq: 400 });
    },

    civilian() {
      tone({ freq: 440, to: 330, type: "triangle", dur: 0.22, vol: 0.14 });
      tone({ freq: 330, to: 220, type: "triangle", dur: 0.3, vol: 0.14, delay: 0.22 });
    },

    // ---- Protect Mogos ----
    pop() {
      tone({ freq: 420, to: 1100, type: "sine", dur: 0.09, vol: 0.3 });
      noise({ dur: 0.22, vol: 0.12, type: "lowpass", freq: 1200, to: 300, delay: 0.03 });
    },

    clank() {
      tone({ freq: 820, type: "square", dur: 0.16, vol: 0.08, filter: 3000 });
      tone({ freq: 1230, type: "triangle", dur: 0.22, vol: 0.1 });
      noise({ dur: 0.05, vol: 0.15, type: "highpass", freq: 2500 });
    },

    // El ninja morado esquiva con una voltereta: «fsssh» de aire + «fiu»
    dodge() {
      noise({ dur: 0.2, vol: 0.5, type: "bandpass", freq: 3600, to: 700, q: 1.4, attack: 0.012 });
      noise({ dur: 0.14, vol: 0.28, type: "bandpass", freq: 2400, to: 500, q: 1.6, delay: 0.1, attack: 0.01 });
      tone({ freq: 700, to: 1900, type: "sine", dur: 0.11, vol: 0.16, delay: 0.02 });
      tone({ freq: 1500, to: 900, type: "triangle", dur: 0.12, vol: 0.05, delay: 0.13 });
    },

    escaped() {
      tone({ freq: 1047, type: "triangle", dur: 0.18, vol: 0.12 });
      tone({ freq: 1319, type: "triangle", dur: 0.25, vol: 0.12, delay: 0.1 });
    },

    castleHit() {
      tone({ freq: 130, to: 45, dur: 0.45, vol: 0.55 });
      noise({ dur: 0.35, vol: 0.25, type: "lowpass", freq: 350 });
      tone({ freq: 640, to: 300, type: "triangle", dur: 0.28, vol: 0.12, delay: 0.1 });
    },

    swish() {
      noise({ dur: 0.07, vol: 0.05, type: "bandpass", freq: 2200, q: 1 });
    },

    // ---- Stick Drill ----
    drillBounce() {
      tone({ freq: 980, to: 520, type: "triangle", dur: 0.09, vol: 0.09 });
      noise({ dur: 0.05, vol: 0.1, type: "highpass", freq: 2800 });
    },

    drillWarning() {
      tone({ freq: 740, type: "square", dur: 0.1, vol: 0.06, filter: 2200 });
      tone({ freq: 740, type: "square", dur: 0.1, vol: 0.06, filter: 2200, delay: 0.2 });
      tone({ freq: 740, type: "square", dur: 0.1, vol: 0.06, filter: 2200, delay: 0.4 });
    },

    stickDeath() {
      noise({ dur: 0.5, vol: 0.35, type: "lowpass", freq: 1400, to: 150 });
      tone({ freq: 220, to: 40, dur: 0.45, vol: 0.4 });
      tone({ freq: 520, to: 180, type: "triangle", dur: 0.3, vol: 0.1, delay: 0.05 });
    },

    countdown() {
      tone({ freq: 660, type: "triangle", dur: 0.15, vol: 0.13 });
    },

    go() {
      tone({ freq: 990, type: "triangle", dur: 0.3, vol: 0.15 });
      tone({ freq: 1320, type: "sine", dur: 0.3, vol: 0.06, delay: 0.02 });
    },

    // ---- El Juego Miente ----
    rightAnswer() {
      tone({ freq: 880, type: "triangle", dur: 0.09, vol: 0.17 });
      tone({ freq: 1320, type: "sine", dur: 0.12, vol: 0.08, delay: 0.05 });
    },

    wrongAnswer() {
      tone({ freq: 180, to: 110, type: "sawtooth", dur: 0.32, vol: 0.16, filter: 900 });
      tone({ freq: 190, to: 115, type: "square", dur: 0.32, vol: 0.06, filter: 700 });
    },

    ruleChange() {
      noise({ dur: 0.3, vol: 0.3, type: "bandpass", freq: 600, to: 3200, q: 1.5, attack: 0.04 });
      [523, 659, 784].forEach((f, i) => tone({ freq: f, type: "square", dur: 0.09, vol: 0.1, filter: 2500, delay: 0.06 * i }));
    },

    clockTick() {
      tone({ freq: 1600, to: 1200, type: "triangle", dur: 0.04, vol: 0.07 });
    },

    // ---- Comunes ----
    start() {
      tone({ freq: 523, type: "triangle", dur: 0.12, vol: 0.12 });
      tone({ freq: 784, type: "triangle", dur: 0.2, vol: 0.12, delay: 0.1 });
    },

    gameOver() {
      [523, 440, 349, 262].forEach((f, i) => {
        tone({ freq: f, type: "triangle", dur: 0.35, vol: 0.14, delay: i * 0.18 });
      });
    },

    record() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        tone({ freq: f, type: "triangle", dur: 0.3, vol: 0.13, delay: i * 0.1 });
      });
      tone({ freq: 2093, type: "sine", dur: 0.6, vol: 0.06, delay: 0.5 });
    }
  };

  function play(name) {
    if (muted || !SFX[name]) {
      return;
    }

    try {
      SFX[name]();
    } catch (error) {
      console.warn("TronkSound:", error);
    }
  }

  /* ---------------- Música de cada minijuego ----------------
     Cada juego tiene su estilo (todo generado, sin archivos):
     - action (Antitronks): acción nocturna, bajo de sintetizador y batería.
     - ninja (Protect Mogos): koto, taikos y flauta en escala japonesa.
     - chiptune (Stick Drill): 8 bits rápido, como una recreativa.
     - quiz (El Juego Miente): concurso con prisa y un reloj de fondo.
     (Tronk Fight tiene su propia música de combate.) */

  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Nota con envoltura sencilla, hacia la música
  function voice(type, freq, time, length, vol, {
    to = null,
    attack = 0.005,
    cutoff = null,
    cutoffTo = null,
    detune = 0,
    wet = false
  } = {}) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    let node = osc;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.value = detune;

    if (to) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), time + length);
    }

    if (cutoff) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(cutoff, time);

      if (cutoffTo) {
        filter.frequency.exponentialRampToValueAtTime(cutoffTo, time + length);
      }

      osc.connect(filter);
      node = filter;
    }

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(vol, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);

    node.connect(gain);
    gain.connect(musicBus);

    if (wet) {
      gain.connect(reverb);
    }

    osc.start(time);
    osc.stop(time + length + 0.05);
  }

  function hiss(time, length, vol, { type = "highpass", freq = 7000, to = null, q = 0.8, wet = false } = {}) {
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    src.buffer = noiseBuffer;
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, time);

    if (to) {
      filter.frequency.exponentialRampToValueAtTime(to, time + length);
    }

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(vol, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(musicBus);

    if (wet) {
      gain.connect(reverb);
    }

    src.start(time, Math.random() * 0.5);
    src.stop(time + length + 0.05);
  }

  /* --- Instrumentos --- */

  const kick = (t, v = 0.7) => {
    voice("sine", 150, t, 0.28, v, { to: 42 });
    // «Clic» para que se oiga también en altavoces pequeños (móvil)
    voice("triangle", 900, t, 0.03, v * 0.18, { to: 300 });
  };
  const snare = (t, v = 0.28) => {
    hiss(t, 0.16, v, { freq: 1600 });
    voice("triangle", 200, t, 0.09, v * 0.8, { to: 140 });
  };
  const hat = (t, v = 0.06) => hiss(t, 0.035, v, { freq: 8000 });

  // Koto: cuerda pulsada, brillante al principio y se apaga rápido
  function koto(note, t, v = 0.16, length = 0.9) {
    const f = midi(note);
    voice("sawtooth", f * 1.01, t, length, v * 0.5, { to: f, attack: 0.002, cutoff: 4200, cutoffTo: 500, wet: true });
    voice("triangle", f, t, length * 1.2, v, { attack: 0.002, wet: true });
  }

  // Taiko: tambor grave japonés
  function taiko(t, v = 0.7) {
    voice("sine", 105, t, 0.5, v, { to: 48 });
    hiss(t, 0.12, v * 0.35, { type: "lowpass", freq: 420 });
  }

  // Bloque de madera
  const woodblock = (t, v = 0.07) => voice("triangle", 1250, t, 0.06, v, { to: 900 });

  // Flauta (shakuhachi): entra suave, con soplo y vibrato
  function flute(note, t, length, v = 0.07) {
    const f = midi(note);
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(f * 0.97, t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    lfo.frequency.value = 5;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(f * 0.012, t + length * 0.6);
    lfo.connect(depth);
    depth.connect(osc.frequency);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(v, t + 0.14);
    gain.gain.setValueAtTime(v, t + length * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

    osc.connect(gain);
    gain.connect(musicBus);
    gain.connect(reverb);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + length + 0.05);
    lfo.stop(t + length + 0.05);

    hiss(t, 0.25, v * 0.5, { type: "bandpass", freq: f * 2, q: 2, wet: true });
  }

  const SONGS = {
    /* Antitronks: acción de noche, La menor */
    action: {
      bpm: 112,
      volume: 0.66,
      step(i, t, s) {
        const bar = Math.floor(i / 16) % 4;
        const st = i % 16;
        const roots = [45, 41, 48, 43];
        const chords = [[57, 60, 64], [57, 60, 65], [55, 60, 64], [55, 59, 62]];
        const root = roots[bar];

        if (st === 0 || st === 8 || (st === 10 && bar % 2 === 1)) kick(t, 0.6);
        if (st === 4 || st === 12) snare(t, 0.2);
        if (st % 2 === 1) hat(t, st % 4 === 3 ? 0.05 : 0.03);

        // Bajo en semicorcheas con el filtro que se abre y se cierra
        const octave = st % 4 === 2 ? 12 : 0;
        voice("sawtooth", midi(root + octave), t, s * 0.9, 0.13, { cutoff: 1500, cutoffTo: 300 });

        // Colchón de acordes al empezar cada compás
        if (st === 0) {
          chords[bar].forEach((note) => {
            voice("sawtooth", midi(note), t, s * 16, 0.04, { attack: 0.4, cutoff: 1400, detune: -6, wet: true });
            voice("sawtooth", midi(note), t, s * 16, 0.04, { attack: 0.4, cutoff: 1400, detune: 6, wet: true });
          });
        }

        // En la segunda mitad, un arpegio agudo que sube la tensión
        if (Math.floor(i / 64) % 2 === 1 && st % 2 === 0) {
          const note = chords[bar][(st / 2) % 3] + 12;
          voice("square", midi(note), t, s * 1.6, 0.035, { cutoff: 2400, wet: true });
        }
      }
    },

    /* Protect Mogos: ninjas y castillo japonés (escala miyako-bushi en Re) */
    ninja: {
      bpm: 100,
      volume: 0.5,
      melody: [
        62, 0, 63, 67, 69, 0, 67, 63,
        62, 0, 58, 57, 58, 0, 0, 0,
        69, 0, 70, 69, 67, 0, 63, 67,
        67, 69, 70, 74, 70, 0, 62, 0
      ],
      flute: [[74, 0, 8], [70, 16, 6], [69, 32, 8], [67, 48, 4], [62, 52, 10]],
      step(i, t, s) {
        const st = i % 16;
        const loop = i % 64;

        if (st === 0) taiko(t, 0.75);
        if (st === 10) taiko(t, 0.4);
        if (st === 12) taiko(t, 0.3);
        if (loop >= 56 && st % 2 === 0) taiko(t, 0.25 + (st - 8) * 0.04);
        if (st % 8 === 4) woodblock(t);

        // Bordón grave
        if (st === 0) koto(loop >= 32 ? 45 : 50, t, 0.14, 1.6);

        // Melodía de koto en corcheas
        if (st % 2 === 0) {
          const note = this.melody[(loop / 2) % 32];

          if (note) {
            koto(note, t, 0.13);
          }
        }

        // Flauta solo en una de cada dos vueltas
        if (Math.floor(i / 64) % 2 === 1) {
          this.flute.forEach(([note, at, len]) => {
            if (loop === at) flute(note + 12, t, s * len * 2, 0.06);
          });
        }
      }
    },

    /* El Juego Miente: concurso con prisa, reloj que hace tic-tac (Do menor) */
    quiz: {
      bpm: 124,
      volume: 0.85,
      step(i, t, s) {
        const bar = Math.floor(i / 16) % 4;
        const st = i % 16;
        const roots = [36, 44, 41, 43];
        const chords = [[60, 63, 67], [60, 63, 68], [60, 65, 68], [59, 62, 67]];

        // Tic-tac de reloj en cada negra
        if (st % 4 === 0) voice("triangle", st % 8 === 0 ? 1500 : 1150, t, 0.035, 0.05, { to: 900 });
        if (st === 0 || st === 10) kick(t, 0.45);
        if (st === 4 || st === 12) hiss(t, 0.08, 0.07, { freq: 3000 });

        // Bajo pulsado en corcheas
        if (st % 2 === 0) {
          voice("sawtooth", midi(roots[bar] + (st % 4 === 2 ? 12 : 0)), t, s * 1.4, 0.1, { cutoff: 1100, cutoffTo: 300 });
        }

        // Pizzicato misterioso (pregunta) con las notas del acorde
        if (st % 4 === 2 || st === 15) {
          const chord = chords[bar];
          koto(chord[(i >> 2) % 3] + 12, t, 0.07, 0.3);
        }

        // Cada dos vueltas, un acorde largo de fondo
        if (st === 0 && Math.floor(i / 64) % 2 === 1) {
          chords[bar].forEach((note) => voice("sine", midi(note), t, s * 15, 0.03, { attack: 0.3, wet: true }));
        }
      }
    },

    /* Stick Drill: recreativa de 8 bits, rápida y frenética (Mi menor) */
    chiptune: {
      bpm: 150,
      volume: 0.6,
      step(i, t, s) {
        const bar = Math.floor(i / 16) % 4;
        const st = i % 16;
        const roots = [40, 36, 38, 35];
        const chords = [[64, 67, 71], [64, 67, 72], [62, 66, 69], [63, 66, 71]];

        // Batería de 8 bits
        if (st === 0 || st === 8 || st === 11) voice("square", 130, t, 0.09, 0.12, { to: 40, cutoff: 1200 });
        if (st === 4 || st === 12) hiss(t, 0.1, 0.12, { freq: 2500 });
        if (st % 2 === 0) hiss(t, 0.02, 0.035, { freq: 9000 });

        // Bajo en corcheas: tónica y octava
        if (st % 2 === 0) {
          voice("triangle", midi(roots[bar] + 12 + (st % 4 === 2 ? 12 : 0)), t, s * 1.7, 0.26);
          voice("square", midi(roots[bar] + 12), t, s * 1.2, 0.03, { cutoff: 900 });
        }

        // Arpegio rapidísimo de onda cuadrada
        const chord = chords[bar];
        const note = [chord[0], chord[1], chord[2], chord[0] + 12][st % 4] + (st >= 8 ? 12 : 0);
        voice("square", midi(note), t, s * 0.8, 0.055, { cutoff: 3500 });

        // Melodía en la segunda vuelta
        if (Math.floor(i / 64) % 2 === 1 && (st === 0 || st === 6 || st === 12)) {
          const lead = chord[[2, 1, 0][st / 6]] + 12;
          voice("square", midi(lead), t, s * 5, 0.06, { cutoff: 2800, detune: 8 });
        }
      }
    }
  };

  let song = null;
  let songTimer = null;
  let step = 0;
  let nextTime = 0;

  function scheduleMusic() {
    if (!song || !ctx) {
      return;
    }

    const sixteenth = 60 / song.bpm / 4;

    while (nextTime < ctx.currentTime + 0.25) {
      try {
        song.step(step, nextTime, sixteenth);
      } catch (error) {
        console.warn("TronkSound:", error);
      }

      nextTime += sixteenth;
      step++;
    }
  }

  function startMusic(name) {
    if (!ensure() || !SONGS[name]) {
      return;
    }

    if (song === SONGS[name] && songTimer) {
      return;
    }

    stopMusic(true);

    song = SONGS[name];
    step = 0;
    nextTime = ctx.currentTime + 0.1;

    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(song.volume, ctx.currentTime + 1.5);

    scheduleMusic();
    songTimer = setInterval(scheduleMusic, 60);
  }

  function stopMusic(immediate = false) {
    if (songTimer) {
      clearInterval(songTimer);
      songTimer = null;
    }

    song = null;

    if (ctx && musicBus) {
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setTargetAtTime(0, ctx.currentTime, immediate ? 0.02 : 0.3);
    }
  }

  // Botones de silenciar de las ventanas de juego.
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.(".game-sound-toggle");

    if (button) {
      ensure();
      setMuted(!muted);
    }
  });

  setMuted(muted);

  return { ensure, play, startMusic, stopMusic, setMuted, isMuted };
})();
