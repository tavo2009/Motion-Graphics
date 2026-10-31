// Síntesis de los efectos (metal = parciales inarmónicos + ruido filtrado), renderizada offline a WAV.
// Cada sonido tiene varias variantes para que los golpes repetidos no suenen idénticos.
import { mulberry32 } from './util.js';

const METAL = [1, 2.32, 4.25, 6.63];
const PLATE = [1, 2.1, 3.7, 5.2, 7.9];
const HEAVY = [1, 1.98, 2.76, 4.1, 5.4];

function kit(ac, out, rnd) {
  const vary = (v, a = 0.08) => v * (1 + (rnd() * 2 - 1) * a);
  const noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
  const env = (g, t, peak, dur, attack = 0.002) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };
  const ring = (freq, ratios, decay, gain, t = 0) => ratios.forEach((r, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = freq * r * vary(1, 0.006);
    env(g, t, gain / (1 + i * 0.7), decay / (1 + r * 0.25));
    o.connect(g).connect(out); o.start(t); o.stop(t + decay + 0.05);
  });
  const noise = ({ type = 'bandpass', freq = 1000, to = null, q = 1, dur = 0.1, gain = 0.2, t = 0 }) => {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = ac.createGain(); env(g, t, gain, dur);
    s.connect(f).connect(g).connect(out); s.start(t, rnd()); s.stop(t + dur + 0.05);
  };
  const tone = ({ type = 'sine', freq = 200, to = null, dur = 0.2, gain = 0.2, t = 0, attack = 0.003 }) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    env(g, t, gain, dur, attack);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  };
  return { vary, ring, noise, tone, env, noiseBuf };
}

// nombre: [duración, variantes, función]
export const SOUNDS = {
  shot: [0.08, 3, (k) => k.noise({ type: 'highpass', freq: k.vary(2600), dur: 0.035, gain: 0.35 })],
  slug: [0.2, 2, (k) => { k.tone({ type: 'square', freq: 160, to: 60, dur: 0.12, gain: 0.35 }); k.noise({ type: 'lowpass', freq: 900, dur: 0.08, gain: 0.5 }); }],
  hit_armor: [0.25, 4, (k) => { k.ring(k.vary(1900), METAL, 0.16, 0.4); k.noise({ freq: 5000, q: 2, dur: 0.03, gain: 0.4 }); }],
  hit_plate: [0.3, 4, (k) => { k.ring(k.vary(560), PLATE, 0.22, 0.42); k.noise({ freq: 2200, q: 1.5, dur: 0.05, gain: 0.4 }); }],
  hit_flesh: [0.2, 3, (k) => { k.noise({ type: 'lowpass', freq: 700, dur: 0.09, gain: 0.6 }); k.tone({ freq: 170, to: 80, dur: 0.1, gain: 0.5 }); }],
  hit_shell: [0.15, 4, (k) => { k.ring(k.vary(1300), METAL, 0.08, 0.3); k.noise({ freq: 3500, q: 1.2, dur: 0.03, gain: 0.3 }); }],
  plate_off: [1.0, 2, (k) => {
    k.ring(k.vary(330), PLATE, 0.8, 0.6); k.noise({ freq: 1500, q: 1, dur: 0.12, gain: 0.55 });
    for (let i = 0; i < 4; i++) k.ring(k.vary(1600, 0.3), METAL, 0.06, 0.18, 0.12 + i * 0.08);
  }],
  clang: [1.0, 4, (k) => {
    k.ring(k.vary(150, 0.15), HEAVY, 0.9, 0.6); k.noise({ freq: 900, q: 0.8, dur: 0.16, gain: 0.6 });
    k.tone({ freq: 95, to: 42, dur: 0.25, gain: 0.7 });
  }],
  wall: [0.5, 2, (k) => { k.ring(k.vary(220), HEAVY, 0.4, 0.45); k.tone({ freq: 80, to: 40, dur: 0.15, gain: 0.55 }); }],
  explode_s: [0.6, 3, (k) => explode(k, 1)],
  explode_m: [0.9, 3, (k) => explode(k, 1.6)],
  explode_l: [1.3, 2, (k) => explode(k, 2.4)],
  explode_xl: [1.8, 1, (k) => explode(k, 3.2)],
  shock: [1.3, 1, (k) => {
    k.tone({ freq: 420, to: 32, dur: 0.6, gain: 0.8 }); k.noise({ freq: 3200, to: 180, q: 1.2, dur: 0.55, gain: 0.6 });
    k.ring(110, HEAVY, 1.2, 0.35);
  }],
  telegraph: [0.85, 1, (k, ac, out) => {
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(170, 0); o.frequency.exponentialRampToValueAtTime(820, 0.75);
    f.type = 'bandpass'; f.Q.value = 5;
    f.frequency.setValueAtTime(600, 0); f.frequency.exponentialRampToValueAtTime(2400, 0.75);
    g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(0.5, 0.68); g.gain.exponentialRampToValueAtTime(0.0001, 0.8);
    o.connect(f).connect(g).connect(out); o.start(0); o.stop(0.85);
  }],
  eshot: [0.12, 3, (k) => k.tone({ type: 'square', freq: k.vary(620), to: 260, dur: 0.09, gain: 0.22 })],
  player_hit: [0.6, 2, (k) => {
    k.noise({ type: 'lowpass', freq: 1800, to: 300, dur: 0.3, gain: 0.8 }); k.ring(230, HEAVY, 0.5, 0.4);
    k.tone({ type: 'sawtooth', freq: 140, to: 50, dur: 0.25, gain: 0.3 });
  }],
  pickup: [0.6, 1, (k) => {
    [523, 784, 1046].forEach((f, i) => k.tone({ type: 'triangle', freq: f, dur: 0.14, gain: 0.4, t: i * 0.06 }));
    k.ring(1400, METAL, 0.3, 0.15, 0.18);
  }],
  banner: [2.0, 1, (k) => { k.ring(110, HEAVY, 1.6, 0.5); k.ring(165, HEAVY, 1.6, 0.35, 0.2); }],
};

function explode(k, size) {
  const d = 0.25 + size * 0.25;
  k.noise({ type: 'lowpass', freq: 2400, to: 90, q: 0.7, dur: d, gain: 0.45 + size * 0.12 });
  k.tone({ freq: 120, to: 32, dur: d * 1.2, gain: 0.5 + size * 0.1 });
  k.ring(k.vary(560 / size, 0.2), PLATE, 0.3 + size * 0.2, 0.12 + size * 0.04);
  if (size >= 2) for (let i = 0; i < 5; i++) k.ring(k.vary(900, 0.4), METAL, 0.12, 0.1, 0.15 + i * 0.08);
}

export async function renderSound(name, variant, sr = 44100) {
  const [dur, , fn] = SOUNDS[name];
  const ac = new OfflineAudioContext(1, Math.ceil(dur * sr), sr);
  const out = ac.createGain();
  out.connect(ac.destination);
  const k = kit(ac, out, mulberry32(name.length * 1000 + variant * 77 + 3));
  fn(k, ac, out);
  return normalize((await ac.startRendering()).getChannelData(0), 0.85);
}

// Pulso industrial: kick, hats metálicos, chapa y bajo. 16 compases en loop perfecto.
export async function renderMusic(sr = 44100) {
  const BPM = 112, step = 60 / BPM / 4, steps = 16 * 16;
  const dur = steps * step;
  const ac = new OfflineAudioContext(1, Math.round(dur * sr), sr);
  const out = ac.createGain(); out.connect(ac.destination);
  const k = kit(ac, out, mulberry32(4242));
  const BASS = [45, 0, 0, 45, 0, 0, 48, 0, 45, 0, 0, 43, 0, 0, 40, 0];
  const BASS2 = [41, 0, 0, 41, 0, 0, 43, 0, 41, 0, 0, 40, 0, 0, 38, 0];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  for (let i = 0; i < steps; i++) {
    const t = i * step, s = i % 16, bar = Math.floor(i / 16);
    if ([0, 4, 8, 10, 12].includes(s)) k.tone({ freq: 150, to: 40, dur: 0.22, gain: 0.7, t });
    if (s % 4 === 2) k.noise({ type: 'highpass', freq: 7000, dur: 0.04, gain: 0.22, t });
    if (s % 2 === 1 && bar >= 2) k.noise({ type: 'highpass', freq: 9000, dur: 0.02, gain: 0.08, t });
    if ((s === 6 || s === 14) && bar >= 4) k.ring(410, PLATE, 0.25, 0.12, t);
    const n = (bar % 8 >= 4 ? BASS2 : BASS)[s];
    if (n) {
      const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = midi(n - 12);
      f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(160, t + 0.2);
      k.env(g, t, 0.3, 0.24);
      o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 0.3);
    }
  }
  return normalize((await ac.startRendering()).getChannelData(0), 0.7);
}

function normalize(data, peak) {
  let m = 0;
  for (let i = 0; i < data.length; i++) m = Math.max(m, Math.abs(data[i]));
  const k = m > 0 ? peak / m : 1;
  for (let i = 0; i < data.length; i++) data[i] *= k;
  return data;
}

export function wav16(data, sr = 44100) {
  const buf = new ArrayBuffer(44 + data.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + data.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 32767, true);
  return new Uint8Array(buf);
}
