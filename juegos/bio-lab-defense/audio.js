const KEY = "biolab_sound";
let enabled = false;
let context;
try {
  enabled = localStorage.getItem(KEY) === "on";
} catch {
  /* optional */
}

const tones = {
  build: [320, 510],
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
  if (enabled) sound("build", true);
  else if (context?.state === "running") void context.suspend().catch(() => {});
  return enabled;
}

export function unlockAudio() {
  if (!enabled) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    context ||= new Audio();
    if (context.state === "suspended") void context.resume().catch(() => {});
  } catch {
    /* play can continue without audio */
  }
}

export function sound(kind, userAction = false) {
  if (!enabled) return;
  if (userAction) unlockAudio();
  if (!context || context.state !== "running") return;
  const notes = tones[kind];
  const now = context.currentTime + 0.011;
  notes.forEach((pitch, i) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const t = now + i * 0.083;
    oscillator.type = "triangle";
    oscillator.frequency.value = pitch;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.055, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(t);
    oscillator.stop(t + 0.16);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  });
}
