// Arte procedural: placas remachadas, óxido, musgo y tejido orgánico.
// Todo se pre-renderiza a canvas (escala 3x) una sola vez y en juego solo se hace drawImage.
import { mulberry32, makeCanvas, clamp } from './util.js';

export const PAL = {
  outline: '#140e0b',
  ironD: '#2a221d', iron: '#463a32', steel: '#6c6157', steelL: '#968a7c', steelH: '#c7baa6',
  rust: '#7c3a1c', rustL: '#b0582a', ochre: '#b8902e',
  moss: '#5d6c24', mossL: '#8f9d3a',
  flesh: '#8e3240', fleshL: '#cf6b78', fleshD: '#3e141b',
  bio: '#6f7d34', bioL: '#bcc771', bioD: '#343d16',
  vein: '#6b2626', veinL: '#a8494a',
};

// ---------------------------------------------------------------- helpers
function poly(g, pts) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
}

function blob(g, cx, cy, r, rnd, n = 7) {
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.55 + rnd() * 0.7);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}

function bbox(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x; if (y < y0) y0 = y;
    if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// Placa metálica con luz, desgaste (óxido/musgo/ocre), contorno y remaches
function plate(g, pts, rnd, o = {}) {
  const { x0, y0, x1, y1 } = bbox(pts);
  poly(g, pts);
  g.fillStyle = o.base || PAL.steel;
  g.fill();
  g.save();
  poly(g, pts);
  g.clip();
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, `rgba(255,236,210,${o.light ?? 0.18})`);
  gr.addColorStop(1, `rgba(0,0,0,${o.shade ?? 0.32})`);
  g.fillStyle = gr;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  const area = (x1 - x0) * (y1 - y0);
  const n = Math.max(2, Math.round((area / 34) * (o.dirt ?? 1)));
  const pr = o.rust ?? 0.45, pm = o.moss ?? 0.3;
  for (let i = 0; i < n; i++) {
    const cx = x0 + rnd() * (x1 - x0), cy = y0 + rnd() * (y1 - y0);
    const r = (1.2 + rnd() * 3.2) * (o.blot ?? 1);
    const roll = rnd();
    const col = roll < pr ? (rnd() < 0.6 ? PAL.rust : PAL.rustL)
      : roll < pr + pm ? (rnd() < 0.5 ? PAL.moss : PAL.mossL)
      : roll < pr + pm + 0.12 ? PAL.ochre : rnd() < 0.7 ? PAL.ironD : PAL.steelH;
    g.fillStyle = rgba(col, 0.18 + rnd() * 0.4);
    blob(g, cx, cy, r, rnd);
    g.fill();
  }
  // brillo de borde superior
  g.strokeStyle = `rgba(255,240,215,${(o.light ?? 0.18) * 0.9})`;
  g.lineWidth = 0.5;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1] + 0.4);
  g.lineTo(pts[1][0], pts[1][1] + 0.4);
  g.stroke();
  g.restore();
  poly(g, pts);
  g.strokeStyle = PAL.outline;
  g.lineWidth = o.lw ?? 0.7;
  g.stroke();
  if (o.rivets !== false) rivets(g, pts, o.rivetGap ?? 3.4);
}

function rivets(g, pts, gap) {
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p[0]; cy += p[1]; }
  cx /= pts.length; cy /= pts.length;
  const inset = (p) => {
    const dx = cx - p[0], dy = cy - p[1], d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1.3, d * 0.4) / d;
    return [p[0] + dx * k, p[1] + dy * k];
  };
  for (let i = 0; i < pts.length; i++) {
    const a = inset(pts[i]), b = inset(pts[(i + 1) % pts.length]);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.floor(len / gap);
    for (let j = 1; j < n; j++) {
      const t = j / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      g.fillStyle = 'rgba(20,14,11,0.85)';
      g.beginPath(); g.arc(x, y, 0.42, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(230,215,190,0.55)';
      g.beginPath(); g.arc(x - 0.12, y - 0.14, 0.2, 0, Math.PI * 2); g.fill();
    }
  }
}

function tendril(g, pts, w = 1.3) {
  const path = () => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 3) g.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    else g.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
  };
  path(); g.strokeStyle = PAL.outline; g.lineWidth = w + 0.7; g.stroke();
  path(); g.strokeStyle = PAL.vein; g.lineWidth = w; g.stroke();
  g.save(); g.translate(-0.2, -0.25);
  path(); g.strokeStyle = PAL.veinL; g.lineWidth = w * 0.35; g.stroke();
  g.restore();
}

function bioShell(g, cx, cy, rx, ry, rot = 0) {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  const gr = g.createRadialGradient(-rx * 0.35, -ry * 0.4, 0.3, 0, 0, Math.max(rx, ry));
  gr.addColorStop(0, PAL.bioL);
  gr.addColorStop(0.45, PAL.bio);
  gr.addColorStop(1, PAL.bioD);
  g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = gr; g.fill();
  g.strokeStyle = PAL.outline; g.lineWidth = 0.6; g.stroke();
  g.strokeStyle = rgba(PAL.bioD, 0.7); g.lineWidth = 0.4;
  for (let i = -1; i <= 1; i++) {
    g.beginPath(); g.ellipse(0, i * ry * 0.35, rx * 0.85, ry * 0.25, 0, 0.15, Math.PI - 0.15); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- sprites
export function makeSprite(w, h, ox, oy, draw, scale = 3) {
  const c = makeCanvas(w * scale, h * scale);
  const g = c.getContext('2d');
  g.scale(scale, scale);
  g.translate(ox, oy);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  draw(g);
  return { img: c, white: silhouette(c, '#fff'), dark: silhouette(c, '#000'), w, h, ox, oy };
}

function silhouette(src, color) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

export function drawSprite(ctx, spr, x, y, k = 1, rot = 0, img = spr.img) {
  if (!rot) {
    ctx.drawImage(img, x - spr.ox * k, y - spr.oy * k, spr.w * k, spr.h * k);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(img, -spr.ox * k, -spr.oy * k, spr.w * k, spr.h * k);
  ctx.restore();
}

// ---------------------------------------------------------------- NAVE PROTAGONISTA
// Mezcla de ambas referencias: cuerpo contundente con vaina orgánica (ref 1) +
// proa en doble púa y carne rosada (ref 2). Proporción ~1:1.05 en lugar de ~1:2
// para que en un teléfono vertical deje espacio para leer la pantalla.
// Modelo: x ∈ [-31, 31], y ∈ [-38, 27]. "bank" ∈ [-1, 1] gira la nave (rolido).
const rollT = (bank) => {
  const R = bank * 0.7, C = Math.cos(R), S = Math.sin(R);
  return (x, y, z = 0) => [x * C + z * S, y];
};

export function shipEngines(bank) {
  const T = rollT(bank);
  return [T(-7.5, 26, 2), T(7.5, 26, 2)];
}
export function shipMuzzles(bank) {
  const T = rollT(bank);
  return { nose: [T(-3.6, -37, 4), T(3.6, -37, 4)], wings: [T(-27, -13, 3), T(27, -13, 3)] };
}

function drawShip(g, bank) {
  const rnd = mulberry32(1337);
  const T = rollT(bank);
  const P = (arr) => arr.map(([x, y, z = 0]) => T(x, y, z));
  const C = Math.cos(bank * 0.7);
  // luz desde arriba-izquierda; al rolar, un lado mira más a la luz
  const lit = (side) => (side < 0
    ? { light: clamp(0.24 + bank * 0.14, 0.05, 0.45), shade: clamp(0.22 - bank * 0.1, 0.05, 0.5) }
    : { light: clamp(0.1 - bank * 0.1, 0.02, 0.4), shade: clamp(0.38 + bank * 0.12, 0.1, 0.6) });
  const mir = (pts) => pts.map(([x, y, z]) => [-x, y, z]);
  const sides = [-1, 1];

  // alas (debajo del casco) — orden de dibujo según rolido: el ala lejana primero
  const order = bank > 0 ? [1, -1] : [-1, 1];
  for (const s of order) {
    const wing = [[-11, -9, 1], [-31, 3, -1], [-33, 12, -1], [-27, 16, -1], [-12, 14, 1]];
    const pts = P(s < 0 ? wing : mir(wing));
    plate(g, pts, rnd, { base: PAL.iron, ...lit(s), rust: 0.5, moss: 0.35, blot: 1.2 });
    // costura de panel
    const a = T(14 * s, -2, 1), b = T(29 * s, 8, -1);
    g.strokeStyle = 'rgba(20,14,11,0.7)'; g.lineWidth = 0.5;
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    // cañones de ala (dos por lado, como en las referencias)
    for (const [bx, w, top, bot] of [[27, 3, -14, 6], [19.5, 2.4, -11, 1]]) {
      const x0 = (bx - w / 2) * s, x1 = (bx + w / 2) * s;
      plate(g, P([[x0, top, 3], [x1, top, 3], [x1, bot, 3], [x0, bot, 3]]), rnd,
        { base: PAL.steelL, ...lit(s), dirt: 0.5, rivets: false, lw: 0.55 });
      plate(g, P([[x0 - 0.4 * s, top, 3.5], [x1 + 0.4 * s, top, 3.5], [x1 + 0.4 * s, top + 2.2, 3.5], [x0 - 0.4 * s, top + 2.2, 3.5]]), rnd,
        { base: PAL.ironD, light: 0.15, rivets: false, lw: 0.5, dirt: 0.3 });
    }
  }

  // carcasas de motor
  for (const s of sides) {
    const h = [[-12.5, 10, 2], [-3, 10, 3], [-3, 22, 3], [-4.5, 24.5, 2], [-10.5, 24.5, 2], [-13, 21, 2]];
    plate(g, P(s < 0 ? h : mir(h)), rnd, { base: PAL.iron, ...lit(s), rust: 0.6 });
    const n = [[-11, 22, 2], [-4, 22, 2], [-4.6, 26.5, 2], [-10.4, 26.5, 2]];
    plate(g, P(s < 0 ? n : mir(n)), rnd, { base: PAL.ironD, light: 0.2, rivets: false, lw: 0.6, dirt: 0.3 });
    g.strokeStyle = 'rgba(200,180,150,0.35)'; g.lineWidth = 0.35;
    for (let i = 0; i < 3; i++) {
      const a = T((10.5 - i * 0.2) * s, 23 + i * 1.2, 2);
      const b = T((4.4 + i * 0.2) * s, 23 + i * 1.2, 2);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    const [ex, ey] = T(7.5 * s, 26.3, 2);
    g.fillStyle = '#1a110d';
    g.beginPath(); g.ellipse(ex, ey, 3 * C, 1.3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,170,60,0.9)';
    g.beginPath(); g.ellipse(ex, ey + 0.2, 1.8 * C, 0.7, 0, 0, Math.PI * 2); g.fill();
  }
  // cola central
  plate(g, P([[-3, 13, 4], [3, 13, 4], [2.6, 24, 3], [0, 27, 3], [-2.6, 24, 3]]), rnd, { base: PAL.steel, light: 0.2, rivetGap: 3 });

  // casco segmentado: cresta central elevada (z=7), bordes bajos
  const segs = [
    [-25, 6, -16, 9.5, PAL.steel],
    [-16, 9.5, -7, 12, PAL.steel],
    [-7, 12, 5, 13.5, PAL.iron],
    [5, 13.5, 13, 12.5, PAL.steel],
    [13, 12.5, 17.5, 8, PAL.iron],
  ];
  for (const [yT, wT, yB, wB, base] of segs) {
    for (const s of sides) {
      const half = [[-wT, yT + 0.3, 1], [0, yT + 0.3, 7], [0, yB, 7], [-wB, yB, 1]];
      plate(g, P(s < 0 ? half : mir(half)), rnd, { base, ...lit(s), rust: 0.45, moss: 0.35 });
    }
  }
  // proa en doble púa (ref 2) con muesca central
  poly(g, P([[-1.8, -28, 5], [1.8, -28, 5], [0, -23.5, 6]]));
  g.fillStyle = '#120c0a'; g.fill();
  for (const s of sides) {
    const prong = [[-6, -25, 1], [-4.6, -38, 3], [-3.1, -36.5, 4], [-1.3, -28, 5], [-1.3, -25, 5]];
    plate(g, P(s < 0 ? prong : mir(prong)), rnd, { base: PAL.steelL, ...lit(s), rivetGap: 3, moss: 0.4 });
  }

  // tuberías laterales
  for (const s of sides) {
    const q = P([[8.5 * s, -13, 4], [16 * s, -6, 3], [13 * s, 6, 2]]);
    g.beginPath(); g.moveTo(q[0][0], q[0][1]); g.quadraticCurveTo(q[1][0], q[1][1], q[2][0], q[2][1]);
    g.strokeStyle = PAL.outline; g.lineWidth = 2.2; g.stroke();
    g.strokeStyle = PAL.iron; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = 'rgba(220,200,170,0.45)'; g.lineWidth = 0.4; g.stroke();
  }

  // cavidad orgánica central (zona vulnerable)
  const [cx, cy] = T(0, 3, 6);
  g.beginPath(); g.ellipse(cx, cy, 8.6 * C, 12.5, 0, 0, Math.PI * 2);
  const cg = g.createRadialGradient(cx, cy, 1, cx, cy, 12);
  cg.addColorStop(0, '#5a1d26'); cg.addColorStop(1, PAL.fleshD);
  g.fillStyle = cg; g.fill();
  g.strokeStyle = PAL.outline; g.lineWidth = 0.8; g.stroke();

  // parches de carne rosada (ref 2)
  for (const s of sides) {
    const [fx, fy] = T(9.5 * s, 4, 5);
    g.fillStyle = PAL.flesh; blob(g, fx, fy, 3.4, rnd, 9); g.fill();
    g.strokeStyle = PAL.outline; g.lineWidth = 0.45; g.stroke();
    g.fillStyle = rgba(PAL.fleshL, 0.8); blob(g, fx - 0.6, fy - 0.8, 1.7, rnd, 7); g.fill();
    g.strokeStyle = rgba(PAL.fleshD, 0.8); g.lineWidth = 0.3;
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + (rnd() - 0.5) * 6, fy + (rnd() - 0.5) * 6); g.stroke();
    }
  }

  // tentáculos que unen la vaina con el metal
  const tends = [
    [[-4, -6, 6], [-9, -10, 5], [-12, -7, 3]], [[4, -6, 6], [9, -10, 5], [12, -7, 3]],
    [[-5, 8, 6], [-12, 8, 4], [-13, 14, 3]], [[5, 8, 6], [12, 8, 4], [13, 14, 3]],
    [[-3, 13, 6], [-5, 17, 5], [-7, 19, 3]], [[3, 13, 6], [5, 17, 5], [7, 19, 3]],
    [[-6, 1, 6], [-11, 0, 5], [-13, -2, 2]], [[6, 1, 6], [11, 0, 5], [13, -2, 2]],
  ];
  for (const t of tends) tendril(g, P(t), 1.1);

  // vaina bio-orgánica con forma de caparazón (ref 1)
  const pod = P([[0, -8, 7], [4.2, -4, 7], [5.6, 3, 7], [3.8, 10, 7], [0, 15, 7], [-3.8, 10, 7], [-5.6, 3, 7], [-4.2, -4, 7]]);
  g.beginPath();
  g.moveTo(pod[0][0], pod[0][1]);
  for (let i = 1; i <= pod.length; i++) {
    const a = pod[i % pod.length], b = pod[(i + 1) % pod.length];
    g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  }
  g.closePath();
  const [px, py] = T(-1.5, -1, 7);
  const pg = g.createRadialGradient(px, py, 0.5, px, py + 4, 13);
  pg.addColorStop(0, PAL.bioL); pg.addColorStop(0.4, PAL.bio); pg.addColorStop(1, PAL.bioD);
  g.fillStyle = pg; g.fill();
  g.strokeStyle = PAL.outline; g.lineWidth = 0.7; g.stroke();
  g.strokeStyle = rgba(PAL.bioD, 0.85); g.lineWidth = 0.4;
  const sp = P([[0, -6, 7.5], [0, 14, 7.5]]);
  g.beginPath(); g.moveTo(sp[0][0], sp[0][1]); g.lineTo(sp[1][0], sp[1][1]); g.stroke();
  for (const yy of [0, 5, 10]) {
    const a = T(-4.6, yy, 7), b = T(0, yy + 1.8, 7.5), c = T(4.6, yy, 7);
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(b[0], b[1], c[0], c[1]); g.stroke();
  }
  // cabeza de la criatura piloto
  const [hx, hy] = T(0, -7.5, 7.5);
  g.fillStyle = PAL.flesh; g.beginPath(); g.ellipse(hx, hy, 2.6 * C, 2.2, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = PAL.outline; g.lineWidth = 0.45; g.stroke();
  g.fillStyle = '#ffd36a';
  g.beginPath(); g.arc(hx - 1 * C, hy - 0.3, 0.45, 0, Math.PI * 2); g.arc(hx + 1 * C, hy - 0.3, 0.45, 0, Math.PI * 2); g.fill();

  // vainas laterales verdes junto a los motores (ref 1)
  for (const s of sides) {
    const [vx, vy] = T(13.5 * s, 12, 3);
    bioShell(g, vx, vy, 3.2 * C, 5.2, 0.35 * s);
  }
}

export function buildShipFrames(n = 9) {
  const frames = [];
  for (let i = 0; i < n; i++) {
    const bank = -1 + (2 * i) / (n - 1);
    frames.push(makeSprite(76, 72, 38, 41, (g) => drawShip(g, bank)));
  }
  return frames;
}

// ---------------------------------------------------------------- ENEMIGOS (miran hacia abajo, +y)

// Aguijón: avispa de chapa, pequeña y rápida, con aguja frontal
function drawStinger(g) {
  const rnd = mulberry32(21);
  g.strokeStyle = PAL.ironD; g.lineWidth = 0.8;
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    g.beginPath(); g.moveTo(2 * s, -1 + i * 2); g.lineTo(6 * s, 1 + i * 2.5); g.lineTo(7.5 * s, 4 + i * 2.6); g.stroke();
  }
  plate(g, [[-4.6, -2], [-6, -8], [-4.3, -13.5], [0, -16.5], [4.3, -13.5], [6, -8], [4.6, -2]], rnd,
    { base: PAL.ochre, rust: 0.6, moss: 0.15, rivets: false, light: 0.25 });
  g.save();
  poly(g, [[-4.6, -2], [-6, -8], [-4.3, -13.5], [0, -16.5], [4.3, -13.5], [6, -8], [4.6, -2]]);
  g.clip();
  g.fillStyle = 'rgba(25,16,12,0.85)';
  g.fillRect(-7, -6.4, 14, 1.6); g.fillRect(-7, -11, 14, 1.5);
  g.restore();
  const oct = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; oct.push([Math.cos(a) * 4.4, 1 + Math.sin(a) * 4.4]); }
  plate(g, oct, rnd, { base: PAL.steel, rivetGap: 2.6, light: 0.25 });
  plate(g, [[-3, 4.5], [3, 4.5], [2.4, 8.5], [0, 9.5], [-2.4, 8.5]], rnd, { base: PAL.iron, rivets: false });
  plate(g, [[-0.9, 8.8], [0.9, 8.8], [0, 15]], rnd, { base: PAL.steelH, rivets: false, dirt: 0.2, lw: 0.5 });
  for (const s of [-1, 1]) {
    g.fillStyle = PAL.bioL;
    g.beginPath(); g.ellipse(1.7 * s, 6.6, 1.1, 1.3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,220,0.8)';
    g.beginPath(); g.arc(1.4 * s, 6.2, 0.35, 0, Math.PI * 2); g.fill();
  }
}

// Escarabajo: coraza frontal enorme, placas laterales desmontables
function drawBeetle(g, hasL, hasR) {
  const rnd = mulberry32(77);
  g.strokeStyle = PAL.outline; g.lineCap = 'round';
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const y = -10 + i * 9;
    g.lineWidth = 2.6; g.strokeStyle = PAL.outline;
    g.beginPath(); g.moveTo(10 * s, y); g.lineTo(21 * s, y - 3 + i * 2); g.lineTo(25 * s, y + 4 + i * 2); g.stroke();
    g.lineWidth = 1.6; g.strokeStyle = PAL.iron; g.stroke();
  }
  // núcleo expuesto (se ve cuando caen las placas)
  g.beginPath(); g.ellipse(0, -2, 15.5, 19, 0, 0, Math.PI * 2);
  g.fillStyle = PAL.fleshD; g.fill(); g.strokeStyle = PAL.outline; g.lineWidth = 0.8; g.stroke();
  for (const s of [-1, 1]) {
    g.fillStyle = PAL.flesh; blob(g, 10 * s, -4, 5, rnd, 9); g.fill();
    g.fillStyle = rgba(PAL.fleshL, 0.7); blob(g, 9.5 * s, -5.5, 2.4, rnd); g.fill();
    tendril(g, [[4 * s, -12], [11 * s, -14], [13 * s, -6]], 1);
    tendril(g, [[4 * s, 2], [12 * s, 3], [12 * s, 8]], 1);
  }
  plate(g, [[-11, -17], [11, -17], [7.5, -24], [-7.5, -24]], rnd, { base: PAL.iron, rust: 0.6 });
  plate(g, [[-5.5, -20], [5.5, -20], [8, 1], [-8, 1]], rnd, { base: PAL.steel, rivetGap: 3 });
  const side = [[-5.5, -20.5], [-15, -15.5], [-19.5, -3.5], [-17.5, 7], [-10.5, 9], [-7.5, -4]];
  const mir = (p) => p.map(([x, y]) => [-x, y]);
  if (hasL) plate(g, side, rnd, { base: PAL.iron, rust: 0.55, moss: 0.35, light: 0.25, blot: 1.3 });
  else { g.fillStyle = PAL.ironD; poly(g, [[-5.5, -20.5], [-9, -19], [-7, -15], [-10, -13], [-7.5, -9]]); g.fill(); }
  if (hasR) plate(g, mir(side), rnd, { base: PAL.iron, rust: 0.55, moss: 0.35, light: 0.08, shade: 0.4, blot: 1.3 });
  else { g.fillStyle = PAL.ironD; poly(g, mir([[-5.5, -20.5], [-9, -19], [-7, -15], [-10, -13], [-7.5, -9]])); g.fill(); }
  // coraza frontal (mira al jugador)
  plate(g, [[-17.5, 4], [-14, 15.5], [-6.5, 21.5], [6.5, 21.5], [14, 15.5], [17.5, 4], [9.5, -0.5], [-9.5, -0.5]], rnd,
    { base: PAL.steel, rust: 0.5, moss: 0.3, light: 0.3, shade: 0.4, rivetGap: 3, blot: 1.4 });
  g.strokeStyle = 'rgba(20,14,11,0.6)'; g.lineWidth = 0.6;
  g.beginPath(); g.moveTo(-13, 9); g.quadraticCurveTo(0, 14, 13, 9); g.stroke();
  plate(g, [[-2.8, 20.5], [2.8, 20.5], [0, 29]], rnd, { base: PAL.steelH, rivets: false, dirt: 0.3 });
  for (const s of [-1, 1]) {
    plate(g, [[6 * s, 20], [9.5 * s, 21.5], [8 * s, 26], [5.5 * s, 23]], rnd, { base: PAL.iron, rivets: false });
    g.fillStyle = '#ff6a3a';
    g.beginPath(); g.arc(4.2 * s, 17.5, 1, 0, Math.PI * 2); g.fill();
  }
}

// Tábano: ojos compuestos, dos vainas de disparo
function drawTabano(g) {
  const rnd = mulberry32(55);
  plate(g, [[-6, -6], [-7.5, -13], [-3.5, -18.5], [3.5, -18.5], [7.5, -13], [6, -6]], rnd,
    { base: PAL.rust, moss: 0.55, rust: 0.2, rivetGap: 3 });
  g.strokeStyle = 'rgba(20,14,11,0.7)'; g.lineWidth = 0.6;
  for (const y of [-10, -14]) { g.beginPath(); g.moveTo(-7, y); g.lineTo(7, y); g.stroke(); }
  for (const s of [-1, 1]) {
    plate(g, [[13.5 * s, -3], [8.5 * s, -3], [8.5 * s, 9], [13.5 * s, 9]], rnd, { base: PAL.steel, rivetGap: 2.8 });
    plate(g, [[12 * s, 9], [10 * s, 9], [10 * s, 15], [12 * s, 15]], rnd, { base: PAL.steelH, rivets: false, lw: 0.5 });
  }
  const oct = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; oct.push([Math.cos(a) * 8.6, Math.sin(a) * 8]); }
  plate(g, oct, rnd, { base: PAL.iron, rust: 0.5, moss: 0.3, light: 0.25 });
  bioShell(g, 0, -1, 3.2, 4.5);
  for (const s of [-1, 1]) {
    const x = 3.8 * s, y = 10.5;
    const gr = g.createRadialGradient(x - 1, y - 1.2, 0.3, x, y, 4.4);
    gr.addColorStop(0, '#e8606a'); gr.addColorStop(0.5, '#8e1f2c'); gr.addColorStop(1, '#3a0a12');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(x, y, 4.2, 4.6, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = PAL.outline; g.lineWidth = 0.6; g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(x + (rnd() - 0.5) * 6, y + (rnd() - 0.5) * 6.5, 0.4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,230,230,0.7)';
    g.beginPath(); g.arc(x - 1.2, y - 1.6, 0.8, 0, Math.PI * 2); g.fill();
  }
}

export function buildEnemySprites() {
  return {
    stinger: makeSprite(32, 36, 16, 18, drawStinger),
    tabano: makeSprite(46, 44, 23, 21, drawTabano),
    beetle: [
      makeSprite(58, 62, 29, 30, (g) => drawBeetle(g, true, true)),
      makeSprite(58, 62, 29, 30, (g) => drawBeetle(g, false, true)),
      makeSprite(58, 62, 29, 30, (g) => drawBeetle(g, true, false)),
      makeSprite(58, 62, 29, 30, (g) => drawBeetle(g, false, false)),
    ],
  };
}

// ---------------------------------------------------------------- FONDO: interior de la colmena
// Dos capas que se repiten verticalmente: casco lejano (placas, celdas, venas) y estructura cercana.
export function buildBackground(W, H, seed = 7, scale = 1.25) {
  const rnd = mulberry32(seed);
  const far = makeCanvas(W * scale, H * scale);
  const g = far.getContext('2d');
  g.scale(scale, scale);
  g.fillStyle = '#16100d';
  g.fillRect(0, 0, W, H);

  // placas del casco
  let y = 0;
  while (y < H) {
    let h = 70 + rnd() * 90;
    if (H - (y + h) < 60) h = H - y;
    let x = -rnd() * 60;
    while (x < W) {
      const w = 80 + rnd() * 120;
      const v = 18 + rnd() * 14;
      g.fillStyle = `rgb(${v + 10},${v + 2},${v - 3})`;
      g.fillRect(x + 1.5, y + 1.5, w - 3, h - 3);
      const gr = g.createLinearGradient(x, y, x + w, y + h);
      gr.addColorStop(0, 'rgba(255,220,190,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
      g.fillStyle = gr; g.fillRect(x + 1.5, y + 1.5, w - 3, h - 3);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = rnd() < 0.6 ? 'rgba(110,50,25,0.18)' : 'rgba(80,95,30,0.14)';
        blob(g, x + rnd() * w, y + rnd() * h, 6 + rnd() * 18, rnd); g.fill();
      }
      if (rnd() < 0.4) { // chorreado de óxido
        const sx = x + 10 + rnd() * (w - 20);
        const sg = g.createLinearGradient(0, y, 0, y + h);
        sg.addColorStop(0, 'rgba(140,60,25,0.28)'); sg.addColorStop(1, 'rgba(140,60,25,0)');
        g.fillStyle = sg; g.fillRect(sx, y + 4, 2 + rnd() * 3, h * (0.4 + rnd() * 0.5));
      }
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(x, y, w, 1.5); g.fillRect(x, y, 1.5, h);
      for (let rx = x + 6; rx < x + w - 4; rx += 9) {
        for (const ry of [y + 5, y + h - 5]) {
          g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(rx, ry, 1.3, 0, 7); g.fill();
          g.fillStyle = 'rgba(200,170,140,0.16)'; g.beginPath(); g.arc(rx - 0.4, ry - 0.4, 0.6, 0, 7); g.fill();
        }
      }
      x += w;
    }
    y += h;
  }

  const wrap = (fn) => { for (const o of [-H, 0, H]) { g.save(); g.translate(0, o); fn(); g.restore(); } };

  // panales de colmena con membranas ámbar
  for (let p = 0; p < 4; p++) {
    const cx = rnd() * W, cy = rnd() * H, R = 45 + rnd() * 50, s = 8;
    const cells = [];
    for (let q = -8; q <= 8; q++) for (let r = -8; r <= 8; r++) {
      const hx = cx + s * 1.5 * q, hy = cy + s * Math.sqrt(3) * (r + q / 2);
      const d = Math.hypot(hx - cx, hy - cy);
      if (d < R * (0.75 + rnd() * 0.35)) cells.push([hx, hy, d / R, rnd()]);
    }
    wrap(() => {
      for (const [hx, hy, d, k] of cells) {
        g.beginPath();
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const px = hx + Math.cos(a) * s * 0.92, py = hy + Math.sin(a) * s * 0.92; i ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.closePath();
        g.fillStyle = k < 0.2 ? `rgba(220,130,40,${0.18 * (1 - d)})` : `rgba(40,18,14,${0.7 * (1 - d * 0.6)})`;
        g.fill();
        g.strokeStyle = `rgba(110,70,45,${0.35 * (1 - d)})`; g.lineWidth = 1; g.stroke();
      }
    });
  }

  // venas orgánicas
  for (let i = 0; i < 7; i++) {
    const x0 = rnd() * W, y0 = rnd() * H, x1 = x0 + (rnd() - 0.5) * 300, y1 = y0 + (rnd() - 0.2) * 260;
    const c1 = [x0 + (rnd() - 0.5) * 200, y0 + rnd() * 120], c2 = [x1 + (rnd() - 0.5) * 200, y1 - rnd() * 120];
    const w = 2 + rnd() * 4;
    wrap(() => {
      g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], x1, y1);
      g.strokeStyle = 'rgba(10,5,4,0.7)'; g.lineWidth = w + 2; g.stroke();
      g.strokeStyle = 'rgba(78,26,26,0.85)'; g.lineWidth = w; g.stroke();
      g.strokeStyle = 'rgba(140,60,55,0.35)'; g.lineWidth = w * 0.3; g.stroke();
    });
  }
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.fillRect(0, 0, W, H);

  // capa cercana: paredes laterales con costillas, tubos y vigas
  const near = makeCanvas(W * scale, H * scale);
  const n = near.getContext('2d');
  n.scale(scale, scale);
  const nr = mulberry32(seed + 1);
  for (const side of [-1, 1]) {
    let yy = 0;
    while (yy < H) {
      let h = 60 + nr() * 120;
      if (H - (yy + h) < 50) h = H - yy;
      const w = 14 + nr() * 22;
      const x = side < 0 ? 0 : W - w;
      const pts = side < 0
        ? [[0, yy], [w, yy + 6], [w, yy + h - 6], [0, yy + h]]
        : [[W, yy], [W - w, yy + 6], [W - w, yy + h - 6], [W, yy + h]];
      plateFlat(n, pts, nr, side);
      if (nr() < 0.35) { // viga transversal
        const bw = 40 + nr() * 70, by = yy + h * 0.5;
        const bp = side < 0
          ? [[w - 2, by - 5], [w + bw, by - 3], [w + bw, by + 3], [w - 2, by + 5]]
          : [[W - w + 2, by - 5], [W - w - bw, by - 3], [W - w - bw, by + 3], [W - w + 2, by + 5]];
        plateFlat(n, bp, nr, side);
      }
      if (nr() < 0.3) { // tentáculo colgando de la pared
        const ex = side < 0 ? x + w : x, ty = yy + nr() * h;
        n.beginPath(); n.moveTo(ex, ty);
        n.bezierCurveTo(ex + side * -30, ty + 10, ex + side * -20, ty + 40, ex + side * -45 * nr(), ty + 60);
        n.strokeStyle = 'rgba(10,4,4,0.8)'; n.lineWidth = 5; n.stroke();
        n.strokeStyle = 'rgba(96,32,32,0.95)'; n.lineWidth = 3.4; n.stroke();
      }
      yy += h;
    }
    // tubo vertical continuo
    const px = side < 0 ? 6 : W - 6;
    n.fillStyle = 'rgba(0,0,0,0.6)'; n.fillRect(px - 3.5, 0, 7, H);
    n.fillStyle = '#3c322b'; n.fillRect(px - 2.5, 0, 5, H);
    n.fillStyle = 'rgba(210,180,150,0.22)'; n.fillRect(px - 1.5, 0, 1, H);
    for (let cy = 20; cy < H; cy += 80) { n.fillStyle = '#5a4c40'; n.fillRect(px - 3.5, cy, 7, 4); }
  }
  return { far, near, W, H, scale };
}

function plateFlat(g, pts, rnd, side) {
  poly(g, pts);
  g.fillStyle = '#2f2620'; g.fill();
  g.save(); poly(g, pts); g.clip();
  const { x0, y0, x1, y1 } = bbox(pts);
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(side < 0 ? 1 : 0, 'rgba(255,220,180,0.1)');
  gr.addColorStop(side < 0 ? 0 : 1, 'rgba(0,0,0,0.4)');
  g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = rnd() < 0.6 ? 'rgba(120,52,24,0.3)' : 'rgba(90,105,35,0.25)';
    blob(g, x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 4 + rnd() * 8, rnd); g.fill();
  }
  g.restore();
  poly(g, pts); g.strokeStyle = '#0c0807'; g.lineWidth = 1.4; g.stroke();
  rivets(g, pts, 7);
}
