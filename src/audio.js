// Sonido 100% sintetizado con WebAudio: metal = parciales inarmónicos + ruido filtrado.
// Cada material tiene su firma para que el jugador "escuche" el estado del enemigo.

let ac = null, master, sfx, mus, noiseBuf;
let muted = false;
const last = {};

export function unlock() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(comp);
    comp.connect(ac.destination);
    sfx = ac.createGain();
    sfx.connect(master);
    mus = ac.createGain();
    mus.gain.value = 0.3;
    mus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // iOS: un buffer silencioso dentro del gesto termina de desbloquear el audio
    const s = ac.createBufferSource();
    s.buffer = ac.createBuffer(1, 1, 22050);
    s.connect(ac.destination);
    s.start(0);
  }
  if (ac.state !== 'running') ac.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.02);
}
export const isMuted = () => muted;

function ok(key, gap) {
  if (!ac || ac.state !== 'running') return false;
  const n = ac.currentTime;
  if (last[key] !== undefined && n - last[key] < gap) return false;
  last[key] = n;
  return true;
}

const vary = (v, amt = 0.08) => v * (1 + (Math.random() * 2 - 1) * amt);

function env(g, t, peak, dur, attack = 0.002) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

// Campana metálica: suma de senos con razones inarmónicas
function ring(freq, ratios, decay, gain, t = ac.currentTime, dest = sfx) {
  ratios.forEach((r, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = freq * r * vary(1, 0.006);
    const a = gain / (1 + i * 0.7);
    env(g, t, a, decay / (1 + r * 0.25));
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + decay + 0.05);
  });
}

function noise({ type = 'bandpass', freq = 1000, to = null, q = 1, dur = 0.1, gain = 0.2, t = ac.currentTime, dest = sfx }) {
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = q;
  const g = ac.createGain();
  env(g, t, gain, dur);
  s.connect(f).connect(g).connect(dest);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

function tone({ type = 'sine', freq = 200, to = null, dur = 0.2, gain = 0.2, t = ac.currentTime, dest = sfx, attack = 0.003 }) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(g, t, gain, dur, attack);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const METAL = [1, 2.32, 4.25, 6.63];
const PLATE = [1, 2.1, 3.7, 5.2, 7.9];
const HEAVY = [1, 1.98, 2.76, 4.1, 5.4];

export function shot() {
  if (!ok('shot', 0.07)) return;
  noise({ type: 'highpass', freq: vary(2600), dur: 0.035, gain: 0.04 });
}

export function slug() {
  if (!ok('slug', 0.1)) return;
  tone({ type: 'square', freq: 160, to: 60, dur: 0.12, gain: 0.08 });
  noise({ type: 'lowpass', freq: 900, dur: 0.08, gain: 0.15 });
}

// material: 'armor' (coraza frontal, aguda), 'plate' (placa lateral), 'flesh' (núcleo expuesto), 'shell' (enemigo chico)
export function hit(material = 'shell', size = 1) {
  if (!ok('hit-' + material, material === 'shell' ? 0.045 : 0.06)) return;
  if (material === 'armor') {
    ring(vary(1900), METAL, 0.16, 0.07);
    noise({ freq: 5000, q: 2, dur: 0.03, gain: 0.08 });
  } else if (material === 'plate') {
    ring(vary(780 / size), PLATE, 0.22, 0.08);
    noise({ freq: 2200, q: 1.5, dur: 0.05, gain: 0.08 });
  } else if (material === 'flesh') {
    noise({ type: 'lowpass', freq: 700, dur: 0.09, gain: 0.14 });
    tone({ freq: 170, to: 80, dur: 0.1, gain: 0.12 });
  } else {
    ring(vary(1300), METAL, 0.08, 0.045);
    noise({ freq: 3500, q: 1.2, dur: 0.03, gain: 0.05 });
  }
}

export function plateOff() {
  if (!ok('plateOff', 0.05)) return;
  const t = ac.currentTime;
  ring(vary(330), PLATE, 0.8, 0.22, t);
  noise({ freq: 1500, q: 1, dur: 0.12, gain: 0.2, t });
  for (let i = 0; i < 4; i++) ring(vary(1600, 0.3), METAL, 0.06, 0.05, t + 0.12 + i * 0.07 + Math.random() * 0.04);
}

export function clang(power = 1) {
  if (!ok('clang', 0.05)) return;
  const t = ac.currentTime;
  ring(vary(150, 0.15), HEAVY, 0.9, 0.3 * Math.min(1.4, power), t);
  noise({ freq: 900, q: 0.8, dur: 0.16, gain: 0.3 * Math.min(1.4, power), t });
  tone({ freq: 95, to: 42, dur: 0.25, gain: 0.35, t });
}

export function wall() {
  if (!ok('wall', 0.08)) return;
  ring(vary(220), HEAVY, 0.4, 0.15);
  tone({ freq: 80, to: 40, dur: 0.15, gain: 0.2 });
}

export function explode(size = 1) {
  if (!ok('exp' + Math.round(size), 0.04)) return;
  const t = ac.currentTime;
  const d = 0.25 + size * 0.25;
  noise({ type: 'lowpass', freq: 2400, to: 90, q: 0.7, dur: d, gain: 0.25 + size * 0.12, t });
  tone({ freq: 120, to: 32, dur: d * 1.2, gain: 0.3 + size * 0.1, t });
  ring(vary(560 / size, 0.2), PLATE, 0.3 + size * 0.2, 0.06 + size * 0.03, t);
  if (size >= 2) for (let i = 0; i < 5; i++) ring(vary(900, 0.4), METAL, 0.12, 0.05, t + 0.15 + i * 0.08 + Math.random() * 0.05);
}

export function shock() {
  const t = ac ? ac.currentTime : 0;
  if (!ok('shock', 0.1)) return;
  tone({ freq: 420, to: 32, dur: 0.6, gain: 0.45, t });
  noise({ freq: 3200, to: 180, q: 1.2, dur: 0.55, gain: 0.35, t });
  ring(110, HEAVY, 1.2, 0.18, t);
}

export function telegraph(dur = 0.75) {
  if (!ok('tele', 0.15)) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(170, t);
  o.frequency.exponentialRampToValueAtTime(820, t + dur);
  f.type = 'bandpass';
  f.Q.value = 5;
  f.frequency.setValueAtTime(600, t);
  f.frequency.exponentialRampToValueAtTime(2400, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + dur * 0.9);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  o.connect(f).connect(g).connect(sfx);
  o.start(t);
  o.stop(t + dur + 0.1);
}

export function eshot() {
  if (!ok('eshot', 0.06)) return;
  tone({ type: 'square', freq: 620, to: 260, dur: 0.09, gain: 0.04 });
}

export function playerHit() {
  if (!ok('phit', 0.1)) return;
  const t = ac.currentTime;
  noise({ type: 'lowpass', freq: 1800, to: 300, dur: 0.3, gain: 0.45, t });
  ring(230, HEAVY, 0.5, 0.2, t);
  tone({ type: 'sawtooth', freq: 140, to: 50, dur: 0.25, gain: 0.12, t });
}

export function pickup() {
  if (!ok('pick', 0.1)) return;
  const t = ac.currentTime;
  [523, 784, 1046].forEach((f, i) => tone({ type: 'triangle', freq: f, dur: 0.14, gain: 0.12, t: t + i * 0.06 }));
  ring(1400, METAL, 0.3, 0.05, t + 0.18);
}

export function banner() {
  if (!ok('banner', 0.5)) return;
  const t = ac.currentTime;
  ring(110, HEAVY, 1.6, 0.18, t);
  ring(165, HEAVY, 1.6, 0.12, t + 0.2);
}

// ---------- Música: pulso industrial simple (kick, hats metálicos, bajo, golpes de chapa)
let musTimer = null, step = 0, nextT = 0;
const BPM = 116;
const BASS = [45, 0, 0, 45, 0, 0, 48, 0, 45, 0, 0, 43, 0, 0, 40, 0];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function schedule(t, s) {
  if ([0, 4, 8, 10, 12].includes(s)) {
    tone({ freq: 150, to: 40, dur: 0.22, gain: 0.55, t, dest: mus });
  }
  if (s % 4 === 2) noise({ type: 'highpass', freq: 7000, dur: 0.04, gain: 0.18, t, dest: mus });
  if (s % 2 === 1) noise({ type: 'highpass', freq: 9000, dur: 0.02, gain: 0.06, t, dest: mus });
  if (s === 6 || s === 14) ring(410, PLATE, 0.25, 0.08, t, mus);
  const n = BASS[s];
  if (n) {
    const o = ac.createOscillator();
    const f = ac.createBiquadFilter();
    const g = ac.createGain();
    o.type = 'sawtooth';
    o.frequency.value = midi(n - 12);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(700, t);
    f.frequency.exponentialRampToValueAtTime(160, t + 0.2);
    env(g, t, 0.22, 0.24);
    o.connect(f).connect(g).connect(mus);
    o.start(t);
    o.stop(t + 0.3);
  }
}

export function startMusic() {
  if (!ac || musTimer) return;
  step = 0;
  nextT = ac.currentTime + 0.1;
  const dt = 60 / BPM / 4;
  musTimer = setInterval(() => {
    while (nextT < ac.currentTime + 0.15) {
      schedule(nextT, step);
      step = (step + 1) % 16;
      nextT += dt;
    }
  }, 30);
}

export function stopMusic() {
  clearInterval(musTimer);
  musTimer = null;
}
