// Lightweight WebAudio sound effects + ringtones. No external assets.

let _ctx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
}

let muted = false;
export function setSoundsMuted(v: boolean) { muted = v; }

function blip(freqs: number[], dur = 0.18, type: OscillatorType = "sine", gain = 0.18) {
  if (muted) return;
  try {
    const c = ctx();
    const t0 = c.currentTime;
    freqs.forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t0 + i * 0.06);
      g.gain.setValueAtTime(0, t0 + i * 0.06);
      g.gain.linearRampToValueAtTime(gain, t0 + i * 0.06 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.06 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0 + i * 0.06);
      o.stop(t0 + i * 0.06 + dur + 0.02);
    });
  } catch {}
}

export const playMessageSent = () => blip([880, 1320], 0.12, "triangle", 0.12);
export const playMessageReceived = () => blip([660, 880], 0.16, "sine", 0.16);
export const playMessageDeleted = () => blip([520, 360, 220], 0.14, "sawtooth", 0.10);
export const playNotify = () => blip([784, 1046], 0.22, "sine", 0.18);

// Looping ringtones with start/stop
type Ring = { stop: () => void };
let activeOut: Ring | null = null;
let activeIn: Ring | null = null;

function loopTone(pattern: () => number): Ring {
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const next = pattern();
    window.setTimeout(tick, next);
  };
  tick();
  return { stop: () => { stopped = true; } };
}

export function startOutgoingRing() {
  stopOutgoingRing();
  activeOut = loopTone(() => {
    blip([440, 480], 0.5, "sine", 0.08);
    return 1500;
  });
}
export function stopOutgoingRing() {
  activeOut?.stop(); activeOut = null;
}

export function startIncomingRing() {
  stopIncomingRing();
  activeIn = loopTone(() => {
    blip([880, 660, 880, 660], 0.18, "triangle", 0.18);
    return 1800;
  });
}
export function stopIncomingRing() {
  activeIn?.stop(); activeIn = null;
}
