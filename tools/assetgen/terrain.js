// Terreno árido visto desde ~5000 m: cuencas de arcilla, arena, mesetas rocosas,
// cauces secos, cráteres y unos pocos oasis. Se repite verticalmente sin costura.
import { mulberry32, makeCanvas } from './util.js';

function makePerlin(seed) {
  const rnd = mulberry32(seed);
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const P = new Uint8Array(512);
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y) => {
    switch (h & 7) {
      case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
      case 4: return x; case 5: return -x; case 6: return y; default: return -y;
    }
  };
  // período py (en celdas) sobre el eje Y → costura invisible al repetir
  return (x, y, py) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
    const x0 = xi & 255, x1 = (xi + 1) & 255;
    const h = (a, b) => P[P[a] + (b & 255)];
    const u = fade(xf), v = fade(yf);
    const a = grad(h(x0, y0), xf, yf), b = grad(h(x1, y0), xf - 1, yf);
    const c = grad(h(x0, y1), xf, yf - 1), d = grad(h(x1, y1), xf - 1, yf - 1);
    const ab = a + (b - a) * u, cd = c + (d - c) * u;
    return ab + (cd - ab) * v;
  };
}

function fbm(N, u, v, cells, oct, gain = 0.5) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let o = 0; o < oct; o++) {
    s += N(u * f, v * f, cells * f) * amp;
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return s / norm;
}

const STOPS = [
  [0.0, [176, 152, 118]],  // cuenca de arcilla
  [0.3, [188, 156, 110]],  // arena
  [0.52, [166, 126, 86]],  // arena oscura
  [0.7, [128, 92, 66]],    // roca
  [0.86, [100, 74, 58]],   // meseta
  [1.0, [82, 64, 54]],
];
function ramp(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1], [t1, c1] = STOPS[i];
      const k = (t - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export function buildTerrain({ wPt = 540, hPt = 2048, scale = 2, seed = 11, oases = 3 } = {}) {
  const W = wPt * scale, H = hPt * scale;
  const N = makePerlin(seed), N2 = makePerlin(seed + 1), N3 = makePerlin(seed + 2);
  const cells = 20, cs = H / cells;
  const elev = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / cs, v = y / cs;
      let e = fbm(N, u, v, cells, 5, 0.45);
      const r = 1 - Math.abs(N2(u * 2, v * 2, cells * 2));
      e += 0.32 * r * r * r;
      // gran escala: llanuras calmas (mar de arena) alternadas con zonas rocosas
      const zone = fbm(N3, u * 0.25, v * 0.25, cells / 4, 3);
      const rocky = Math.min(1, Math.max(0, (zone + 0.02) / 0.22));
      const rk = rocky * rocky * (3 - 2 * rocky);
      const dunes = Math.sin((u * 0.8 + v * 1.4) * 9 + N(u * 0.7, v * 0.7, cells) * 4) * 0.018;
      e = e * (0.1 + 0.9 * rk) + (1 - rk) * (dunes - 0.08);
      // mesetas escalonadas
      if (e > 0.18) e = 0.18 + Math.round((e - 0.18) * 14) / 14 * 0.8 + (e - 0.18) * 0.2;
      elev[y * W + x] = e;
    }
  }
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const d = img.data;
  const grain = mulberry32(seed + 9);
  const haze = [178, 170, 152];
  for (let y = 0; y < H; y++) {
    const yu = ((y - 1 + H) % H) * W, yd = ((y + 1) % H) * W;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const e = elev[i];
      const u = x / cs, v = y / cs;
      const dx = elev[y * W + Math.min(W - 1, x + 1)] - elev[y * W + Math.max(0, x - 1)];
      const dy = elev[yd + x] - elev[yu + x];
      // luz desde arriba-izquierda
      const shade = Math.max(0.55, Math.min(1.22, 1 + (dx + dy) * -26));
      let col = ramp((e + 0.45) / 1.0);
      const m = fbm(N3, u * 1.5, v * 1.5, cells * 1.5, 4);
      if (e < -0.18 && m > 0.05) { // salinas pálidas
        const k = Math.min(1, (m - 0.05) * 6) * Math.min(1, (-0.18 - e) * 8);
        col = [col[0] + (214 - col[0]) * k, col[1] + (204 - col[1]) * k, col[2] + (182 - col[2]) * k];
      }
      // cauces secos
      const w = Math.abs(N2(u * 3, v * 3, cells * 3) + 0.25 * N3(u * 11, v * 11, cells * 11));
      if (w < 0.03 && e < 0.25) {
        const k = 1 - w / 0.03;
        col = [col[0] * (1 - 0.22 * k), col[1] * (1 - 0.2 * k), col[2] * (1 - 0.16 * k)];
      }
      const gr = 1 + (grain() - 0.5) * 0.04;
      let r = col[0] * shade * gr, gg = col[1] * shade * gr, b = col[2] * shade * gr;
      // perspectiva aérea: 5000 m de aire entre la nave y el suelo
      r = r * 0.66 + haze[0] * 0.34; gg = gg * 0.66 + haze[1] * 0.34; b = b * 0.66 + haze[2] * 0.34;
      const o = i * 4;
      d[o] = r * 0.76; d[o + 1] = gg * 0.76; d[o + 2] = b * 0.78; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  const rnd = mulberry32(seed + 5);
  const wrap = (y, fn) => { for (const o of [-H, 0, H]) { g.save(); g.translate(0, o); fn(y); g.restore(); } };
  // cráteres
  for (let k = 0; k < 34; k++) {
    const x = rnd() * W, y = rnd() * H, R = (2.5 + Math.pow(rnd(), 2.2) * 14) * scale;
    wrap(y, () => {
      g.fillStyle = 'rgba(60,44,34,0.32)';
      g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(210,192,165,0.18)';
      g.beginPath(); g.arc(x + R * 0.18, y + R * 0.18, R * 0.78, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(120,96,74,0.35)';
      g.beginPath(); g.arc(x + R * 0.08, y + R * 0.08, R * 0.6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(225,210,185,0.18)'; g.lineWidth = Math.max(1, R * 0.12);
      g.beginPath(); g.arc(x, y, R * 1.02, 0.1, Math.PI * 0.9); g.stroke();
    });
  }
  // oasis: agua oscura, vegetación en anillo que se dispersa, pocos y lejos entre sí
  for (let k = 0; k < oases; k++) {
    const x = W * (0.2 + rnd() * 0.6), y = H * ((k + 0.2 + rnd() * 0.6) / oases), R = (9 + rnd() * 10) * scale;
    const spots = [];
    for (let i = 0; i < 260; i++) {
      const a = rnd() * Math.PI * 2, dd = R * (0.8 + Math.pow(rnd(), 1.6) * 2.4);
      spots.push([x + Math.cos(a) * dd * 1.3, y + Math.sin(a) * dd, (0.6 + rnd() * 1.4) * scale, rnd()]);
    }
    wrap(y, () => {
      const gg = g.createRadialGradient(x, y, R * 0.5, x, y, R * 3.4);
      gg.addColorStop(0, 'rgba(96,110,62,0.55)');
      gg.addColorStop(1, 'rgba(96,110,62,0)');
      g.fillStyle = gg;
      g.beginPath(); g.ellipse(x, y, R * 4.2, R * 3.4, 0, 0, Math.PI * 2); g.fill();
      for (const [sx, sy, sr, t] of spots) {
        g.fillStyle = t < 0.5 ? 'rgba(64,84,46,0.85)' : 'rgba(92,110,58,0.8)';
        g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#3a5650';
      g.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, rr = R * (0.75 + 0.35 * Math.sin(i * 2.3 + k));
        const px = x + Math.cos(a) * rr * 1.25, py = y + Math.sin(a) * rr * 0.85;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(200,214,190,0.35)'; g.lineWidth = 1.2 * scale; g.stroke();
      g.fillStyle = 'rgba(190,210,205,0.25)';
      g.beginPath(); g.ellipse(x - R * 0.3, y - R * 0.2, R * 0.4, R * 0.15, -0.3, 0, Math.PI * 2); g.fill();
    });
  }
  return c;
}

// Nubes muy difuminadas que pasan entre el suelo y la nave
export function buildCloud(seed, w = 320, h = 220) {
  const N = makePerlin(seed);
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = (x - w / 2) / (w / 2), ny = (y - h / 2) / (h / 2);
    const fall = Math.max(0, 1 - (nx * nx + ny * ny));
    const n = fbm(N, x / 70, y / 70, 64, 5) * 0.5 + 0.5;
    let a = Math.max(0, n * 1.6 - 0.55) * fall * fall;
    a = Math.min(1, a * 1.5);
    const o = (y * w + x) * 4;
    const sh = 1 - Math.max(0, ny) * 0.12;
    d[o] = 236 * sh; d[o + 1] = 238 * sh; d[o + 2] = 240 * sh; d[o + 3] = a * 255;
  }
  g.putImageData(img, 0, 0);
  const out = makeCanvas(w, h);
  const og = out.getContext('2d');
  og.filter = 'blur(5px)';
  og.drawImage(c, 0, 0);
  return out;
}
