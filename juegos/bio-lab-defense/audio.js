const KEY = "biolab_sound";
let enabled = false;
let context;
try {
  enabled = localStorage.getItem(KEY) === "on";
} catch {
  /* optional */
}

const tones = {
  build: [180, 370, 610],
  wave: [180, 230, 385],
  ready: [440, 660, 880],
  alert: [275, 350, 275],
  shield: [690, 385],
  objective: [450, 565, 720],
  phase: [135, 180, 135, 100],
  pulse: [580, 375, 195],
  boss: [118, 144, 103],
  victory: [360, 460, 590, 710],
  defeat: [280, 180, 108],
};

export function soundEnabled() {
  return enabled;
}

export function toggleSound() {
  enabled = !enabled;
  try {
    localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {
    /* optional */
  }
  if (enabled) sound("ready", true);
  else if (context?.state === "running") void context.suspend().catch(() => {});
  return enabled;
}

export function unlockAudio() {
  if (!enabled) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    context ||= new Audio();
    if (context.state !== "running") return context.resume().catch(() => {});
  } catch {
    /* play can continue without audio */
  }
}

export function sound(kind, userAction = false) {
  if (!enabled) return;
  if (userAction) {
    const resume = unlockAudio();
    if (resume) {
      void resume.then(() => sound(kind));
      return;
    }
  }
  if (!context || context.state !== "running") return;
  const notes = tones[kind];
  const now = context.currentTime + 0.011;
  notes.forEach((pitch, i) => voice(pitch, pitch, now + i * 0.083, 0.15, 0.055, "triangle"));
}

function voice(startHz, endHz, time, length, volume, type) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startHz, time);
  oscillator.frequency.exponentialRampToValueAtTime(endHz, time + length);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.009);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(time);
  oscillator.stop(time + length + 0.01);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

const weapons = {
  single: [760, 210, "triangle"], slow: [1100, 640, "sine"],
  splash: [160, 48, "triangle"], dot: [340, 105, "sine"], chain: [880, 310, "sawtooth"],
};
const bass = [110, 87.31, 130.81, 98];
const motif = [0, 7, 12, 15, 7, 10, 5, 7];
let nextBeat = 0, beat = 0, nextShot = 0, nextDeath = 0, nextImpact = 0, nextCore = 0;
const heard = new WeakSet();
const lastShot = new WeakMap();

export function combatAudio(match) {
  if (!enabled || !context || context.state !== "running") return;
  const now = context.currentTime;
  // Trigger from the same events as the artwork, even when a shot hits instantly.
  for (const effect of match.effects) {
    if (!effect.kind || heard.has(effect)) continue;
    heard.add(effect);
    if (effect.kind === "core-hit" && now >= nextCore) {
      voice(132, 36, now, 0.23, 0.11, "triangle");
      voice(410, 170, now + 0.03, 0.13, 0.045, "square");
      nextCore = now + 0.15;
    } else if (effect.kind === "impact" && now >= nextImpact) {
      voice(effect.shielded ? 1260 : 300, effect.shielded ? 620 : 92, now, 0.075, 0.045, "triangle");
      nextImpact = now + 0.085;
    } else if (effect.kind === "death" && (effect.boss || now >= nextDeath)) {
      voice(effect.boss ? 138 : 400, effect.boss ? 34 : 88, now, effect.boss ? 0.38 : 0.11, 0.047, "triangle");
      nextDeath = now + 0.1;
    }
  }
  for (let i = 0; i < match.towers.length + Number(!!match.hero); i++) {
    const tower = match.towers[i] || match.hero;
    if (tower.firedAt == null || tower.firedAt === lastShot.get(tower)) continue;
    lastShot.set(tower, tower.firedAt);
    if (now < nextShot || match.time - tower.firedAt > 6) continue;
    const [start, end, type] = weapons[tower.type] || weapons.single;
    voice(start, end, now, 0.09, 0.038, type);
    nextShot = now + 0.095;
  }
  if (match.state !== "wave" || now < nextBeat) return;
  const boss = match.enemies.some(enemy => enemy.boss && enemy.hp > 0);
  const root = bass[Math.floor(beat / 8) % bass.length];
  if (beat % 4 === 0) voice(root, root, now, 0.38, 0.036, "sine");
  if (beat % 2 === 0 || boss) {
    const note = root * 2 * 2 ** (motif[beat % 8] / 12);
    voice(note, note, now, 0.19, 0.016, "triangle");
  }
  if (beat % 4 === 2) voice(95, 42, now, 0.08, 0.024, "sine");
  beat = (beat + 1) % 32;
  nextBeat = now + (boss ? 0.18 : 0.22);
}
