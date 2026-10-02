// All sound is synthesized with Web Audio: no files to download.
import { game } from "./data";

let ctx: AudioContext | null = null;
let master: GainNode;
let muted = false;
const VOLUME = 0.55;

/** Must be called from a user gesture (browsers block audio before one). */
export function initAudio() {
  if (ctx) return;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  master.connect(ctx.destination);
  ambient();
}

export function setMuted(m: boolean) {
  muted = m;
  if (ctx) master.gain.setTargetAtTime(m ? 0 : VOLUME, ctx.currentTime, 0.1);
}

function noise(seconds: number, brown = false) {
  const c = ctx!;
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    d[i] = brown ? (last = (last + 0.02 * w) / 1.02) * 3.5 : w;
  }
  return buf;
}

function env(gain: GainNode, at: number, peak: number, attack: number, decay: number) {
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

function tone(freq: number, at: number, dur: number, peak = 0.15, type: OscillatorType = "sine", toFreq?: number) {
  const c = ctx!;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, at + dur);
  env(g, at, peak, 0.01, dur);
  o.connect(g).connect(master);
  o.start(at);
  o.stop(at + dur + 0.05);
}

function burst(at: number, dur: number, peak: number, filter: BiquadFilterType, freq: number) {
  const c = ctx!;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noise(dur + 0.05);
  f.type = filter;
  f.frequency.value = freq;
  env(g, at, peak, 0.005, dur);
  s.connect(f).connect(g).connect(master);
  s.start(at);
}

/** Ocean wash + wind, plus birds by day and crickets by night. */
function ambient() {
  const c = ctx!;
  const sea = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
  sea.buffer = noise(6, true);
  sea.loop = true;
  lp.type = "lowpass";
  lp.frequency.value = 600;
  g.gain.value = 0.09;
  const lfo = c.createOscillator(), lfoGain = c.createGain();
  lfo.frequency.value = 0.11;
  lfoGain.gain.value = 0.05;
  lfo.connect(lfoGain).connect(g.gain);
  sea.connect(lp).connect(g).connect(master);
  sea.start();
  lfo.start();

  const critter = () => {
    const now = c.currentTime;
    if (game.nightMix > 0.5) {
      for (let i = 0; i < 3; i++) tone(4200 + Math.random() * 300, now + i * 0.07, 0.04, 0.025, "triangle");
    } else {
      const f = 2400 + Math.random() * 1600;
      tone(f, now, 0.09, 0.03, "sine", f * 1.5);
      tone(f * 1.1, now + 0.13, 0.08, 0.025, "sine", f * 1.6);
    }
    setTimeout(critter, 2500 + Math.random() * 5000);
  };
  setTimeout(critter, 2000);
}

export type Sfx = "step" | "jump" | "land" | "pickup" | "discover" | "open" | "close" | "talk" | "boom" | "splash";

export function sfx(name: Sfx) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  switch (name) {
    case "step":
      burst(t, 0.06, 0.05, "bandpass", 700 + Math.random() * 500);
      break;
    case "jump":
      tone(260, t, 0.18, 0.06, "sine", 520);
      break;
    case "land":
      burst(t, 0.12, 0.12, "lowpass", 300);
      break;
    case "pickup":
      [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.06, 0.25, 0.08, "triangle"));
      break;
    case "discover":
      tone(784, t, 0.6, 0.1);
      tone(1175, t + 0.15, 0.9, 0.1);
      break;
    case "open":
      tone(660, t, 0.12, 0.06, "triangle", 880);
      break;
    case "close":
      tone(880, t, 0.12, 0.05, "triangle", 600);
      break;
    case "talk":
      [520, 610, 480].forEach((f, i) => tone(f, t + i * 0.07, 0.06, 0.05, "square"));
      break;
    case "splash":
      burst(t, 0.25, 0.09, "bandpass", 1400 + Math.random() * 600);
      burst(t + 0.03, 0.35, 0.05, "lowpass", 500);
      break;
    case "boom":
      burst(t, 0.5, 0.3, "lowpass", 500);
      burst(t + 0.05, 0.9, 0.05, "highpass", 3000);
      break;
  }
}

let pad: { stop: () => void } | null = null;

/** Warm, slowly breathing chord + sparse pentatonic chimes for the summit sunset. */
export function sunsetMusic(on: boolean) {
  if (!ctx) return;
  if (!on) {
    pad?.stop();
    pad = null;
    return;
  }
  if (pad) return;
  const c = ctx, out = c.createGain(), lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1300;
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 5);
  lp.connect(out).connect(master);

  const oscs: OscillatorNode[] = [];
  // Amaj9-ish: A2, A3, C#4, E4, G#4, B4, each voice slightly detuned for width
  [110, 220, 277.18, 329.63, 415.3, 493.88].forEach((f, i) => {
    for (const detune of [-7, 7]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = i === 0 ? "sine" : "triangle";
      o.frequency.value = f;
      o.detune.value = detune;
      g.gain.value = i === 0 ? 0.3 : 0.14;
      o.connect(g).connect(lp);
      o.start();
      oscs.push(o);
    }
  });
  const lfo = c.createOscillator(), depth = c.createGain();
  lfo.frequency.value = 0.07;
  depth.gain.value = 450;
  lfo.connect(depth).connect(lp.frequency);
  lfo.start();
  oscs.push(lfo);

  let alive = true;
  const notes = [880, 987.77, 1108.73, 1318.51, 1479.98, 1760];
  const chime = () => {
    if (!alive) return;
    tone(notes[(Math.random() * notes.length) | 0], c.currentTime, 2.8, 0.03);
    setTimeout(chime, 1600 + Math.random() * 2800);
  };
  setTimeout(chime, 3000);

  pad = {
    stop: () => {
      alive = false;
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
      oscs.forEach((o) => o.stop(t + 2.6));
    },
  };
}
