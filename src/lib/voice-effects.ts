// Web Audio voice changer. Returns a processed MediaStream + a controller to swap effects.

export type VoiceEffect = "normal" | "chipmunk" | "deep" | "robot" | "echo" | "alien";

export const VOICE_EFFECTS: { id: VoiceEffect; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "chipmunk", label: "Chipmunk" },
  { id: "deep", label: "Deep" },
  { id: "robot", label: "Robot" },
  { id: "echo", label: "Echo" },
  { id: "alien", label: "Alien" },
];

export type VoiceProcessor = {
  outputStream: MediaStream;
  setEffect: (effect: VoiceEffect) => void;
  destroy: () => void;
};

export function createVoiceProcessor(input: MediaStream): VoiceProcessor {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(input);
  const dest = ctx.createMediaStreamDestination();

  // Build a flexible chain. We rebuild it on each effect change.
  let chainNodes: AudioNode[] = [];

  const disconnect = () => {
    try { source.disconnect(); } catch {}
    chainNodes.forEach((n) => { try { n.disconnect(); } catch {} });
    chainNodes = [];
  };

  const apply = (effect: VoiceEffect) => {
    disconnect();
    const nodes: AudioNode[] = [];

    if (effect === "normal") {
      source.connect(dest);
      return;
    }

    if (effect === "chipmunk") {
      // Pseudo pitch-up via high-shelf boost + delay-based formant tweak
      const shelf = ctx.createBiquadFilter();
      shelf.type = "highshelf"; shelf.frequency.value = 1200; shelf.gain.value = 12;
      const peak = ctx.createBiquadFilter();
      peak.type = "peaking"; peak.frequency.value = 2400; peak.Q.value = 1; peak.gain.value = 8;
      source.connect(shelf); shelf.connect(peak); peak.connect(dest);
      nodes.push(shelf, peak);
    } else if (effect === "deep") {
      const lowshelf = ctx.createBiquadFilter();
      lowshelf.type = "lowshelf"; lowshelf.frequency.value = 250; lowshelf.gain.value = 14;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 1800;
      const peak = ctx.createBiquadFilter();
      peak.type = "peaking"; peak.frequency.value = 180; peak.Q.value = 1.4; peak.gain.value = 8;
      source.connect(lowshelf); lowshelf.connect(lp); lp.connect(peak); peak.connect(dest);
      nodes.push(lowshelf, lp, peak);
    } else if (effect === "robot") {
      // Ring-modulator style via gain LFO
      const carrier = ctx.createOscillator();
      carrier.frequency.value = 60;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      carrier.connect(gain.gain);
      const mult = ctx.createGain();
      mult.gain.value = 1;
      source.connect(mult);
      mult.connect(gain);
      gain.connect(dest);
      carrier.start();
      nodes.push(carrier, gain, mult);
    } else if (effect === "echo") {
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = 0.22;
      const fb = ctx.createGain();
      fb.gain.value = 0.45;
      const wet = ctx.createGain();
      wet.gain.value = 0.6;
      source.connect(dest);
      source.connect(delay);
      delay.connect(fb); fb.connect(delay);
      delay.connect(wet); wet.connect(dest);
      nodes.push(delay, fb, wet);
    } else if (effect === "alien") {
      // Tremolo + bandpass for a wobbly otherworldly tone
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1100; bp.Q.value = 1.5;
      const trem = ctx.createGain();
      trem.gain.value = 0.6;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.4;
      lfo.connect(lfoGain); lfoGain.connect(trem.gain);
      lfo.start();
      source.connect(bp); bp.connect(trem); trem.connect(dest);
      nodes.push(bp, trem, lfo, lfoGain);
    }

    chainNodes = nodes;
  };

  apply("normal");

  return {
    outputStream: dest.stream,
    setEffect: apply,
    destroy: () => {
      disconnect();
      ctx.close().catch(() => {});
    },
  };
}
