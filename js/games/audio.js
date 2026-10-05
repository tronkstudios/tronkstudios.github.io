"use strict";

/* TronkStudios · js/games/audio.js
   Sonido de los minijuegos (Web Audio, sin archivos).
   Se carga como script clásico (ver docs/adr/0002). */

/* =========================================================
   SONIDO DE LOS MINIJUEGOS (música de piano + efectos)
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
      button.textContent = muted ? "🔇" : "🔊";
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

    flip() {
      noise({ dur: 0.35, vol: 0.12, type: "bandpass", freq: 400, to: 2600, q: 2, attack: 0.05 });
      tone({ freq: 260, to: 720, type: "sine", dur: 0.3, vol: 0.12 });
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

  /* ---------------- Música de piano ---------------- */

  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /*
   * calm: tranquila y alegre (Protect Mogos), Do mayor.
   * night: suave y algo misteriosa (Antitronks), La menor.
   * Cada acorde: [bajo, notas del arpegio...].
   */
  const SONGS = {
    calm: {
      bpm: 72,
      volume: 0.5,
      chords: [
        [48, 60, 64, 67, 71],
        [45, 57, 60, 64, 67],
        [41, 57, 60, 64, 69],
        [43, 59, 62, 67, 71]
      ],
      pattern: [1, 2, 3, 4, 3, 2, 3, 2]
    },
    tense: {
      bpm: 92,
      volume: 0.38,
      chords: [
        [38, 57, 62, 65, 69],
        [34, 58, 62, 65, 70],
        [41, 57, 60, 65, 69],
        [36, 55, 60, 64, 67]
      ],
      pattern: [1, 2, 3, 4, 3, 2, 4, 2]
    },
    night: {
      bpm: 66,
      volume: 0.35,
      chords: [
        [45, 57, 60, 64, 69],
        [41, 57, 60, 64, 65],
        [48, 55, 60, 64, 67],
        [40, 56, 59, 62, 64]
      ],
      pattern: [1, 3, 2, 4, 1, 3, 2, 3]
    }
  };

  let song = null;
  let songTimer = null;
  let step = 0;
  let nextTime = 0;

  function pianoNote(freq, time, velocity, length) {
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2800, time);
    filter.frequency.exponentialRampToValueAtTime(900, time + length);

    out.gain.setValueAtTime(0.0001, time);
    out.gain.exponentialRampToValueAtTime(velocity, time + 0.008);
    out.gain.exponentialRampToValueAtTime(velocity * 0.35, time + 0.25);
    out.gain.exponentialRampToValueAtTime(0.0001, time + length);

    // Mezcla de parciales para que suene a piano suave.
    [
      [1, "triangle", 1],
      [2, "sine", 0.35],
      [3, "sine", 0.12],
      [1.003, "sine", 0.5]
    ].forEach(([mult, type, level]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq * mult;
      g.gain.value = level;
      osc.connect(g);
      g.connect(filter);
      osc.start(time);
      osc.stop(time + length + 0.05);
    });

    filter.connect(out);
    out.connect(musicBus);
    out.connect(reverb);
  }

  function scheduleMusic() {
    if (!song || !ctx) {
      return;
    }

    const eighth = 60 / song.bpm / 2;

    while (nextTime < ctx.currentTime + 0.3) {
      const chord = song.chords[Math.floor(step / 8) % song.chords.length];
      const inBar = step % 8;
      const human = 0.85 + Math.random() * 0.3;

      if (inBar === 0) {
        pianoNote(midi(chord[0]), nextTime, 0.22 * human, eighth * 7);
      }

      pianoNote(midi(chord[song.pattern[inBar]]), nextTime, 0.11 * human, eighth * 4);

      // De vez en cuando, una nota aguda de melodía.
      if ((inBar === 0 || inBar === 5) && Math.random() < 0.45) {
        const top = chord[1 + Math.floor(Math.random() * 4)] + 12;
        pianoNote(midi(top), nextTime + 0.01, 0.07 * human, eighth * 6);
      }

      nextTime += eighth;
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
