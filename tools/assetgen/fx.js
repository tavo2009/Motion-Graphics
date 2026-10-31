// Texturas pequeñas: proyectiles, efectos (sobrios, estilo arcade clásico), mejoras e interfaz.
import { makeCanvas } from './util.js';
import { PAL } from './art.js';

const FONT = "'Black Ops One'";
const TAU = Math.PI * 2;

function tex(w, h, draw) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.lineJoin = 'round';
  g.lineCap = 'round';
  draw(g, w, h);
  return c;
}

function radial(g, x, y, r, stops) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  for (const [t, col] of stops) gr.addColorStop(t, col);
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}

export function buildFX() {
  const T = {};
  // proyectil del jugador (4×12 pt a 3x)
  T.bullet = tex(12, 36, (g, w, h) => {
    g.fillStyle = 'rgba(255,190,80,0.55)';
    g.beginPath(); g.ellipse(w / 2, h / 2, 6, 18, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff6d8';
    g.beginPath(); g.ellipse(w / 2, h / 2 - 2, 2.6, 14, 0, 0, TAU); g.fill();
  });
  T.slug = tex(36, 48, (g, w, h) => {
    g.save(); g.translate(w / 2, h / 2); g.scale(1, 1.35);
    radial(g, 0, 0, 17, [[0, 'rgba(255,245,215,1)'], [0.35, 'rgba(255,160,60,0.95)'], [1, 'rgba(255,90,20,0)']]);
    g.restore();
  });
  T.ebullet = tex(36, 36, (g, w, h) => {
    radial(g, w / 2, h / 2, 18, [[0, 'rgba(255,60,95,0.5)'], [1, 'rgba(255,40,80,0)']]);
    g.fillStyle = '#ff3d64'; g.beginPath(); g.arc(w / 2, h / 2, 10, 0, TAU); g.fill();
    g.strokeStyle = '#40050f'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w / 2, h / 2, 4.6, 0, TAU); g.fill();
  });
  T.spark = tex(6, 18, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(1, 0, 4, h);
  });
  T.flash = tex(96, 96, (g) => radial(g, 48, 48, 48, [[0, 'rgba(255,248,225,1)'], [0.35, 'rgba(255,170,70,0.7)'], [1, 'rgba(255,90,20,0)']]));
  T.smoke = tex(64, 64, (g) => radial(g, 32, 32, 32, [[0, 'rgba(58,48,40,0.85)'], [0.6, 'rgba(58,48,40,0.45)'], [1, 'rgba(58,48,40,0)']]));
  T.glow = tex(48, 48, (g) => radial(g, 24, 24, 24, [[0, 'rgba(240,255,190,1)'], [0.3, 'rgba(190,230,110,0.6)'], [1, 'rgba(150,200,60,0)']]));
  T.dot = tex(24, 24, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(12, 12, 11, 0, TAU); g.fill(); });
  T.ring = tex(256, 256, (g) => {
    g.strokeStyle = '#fff'; g.lineWidth = 6;
    g.beginPath(); g.arc(128, 128, 122, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 14;
    g.beginPath(); g.arc(128, 128, 116, 0, TAU); g.stroke();
  });
  T.flame = tex(24, 72, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,245,215,1)'); gr.addColorStop(0.3, 'rgba(255,170,60,0.85)'); gr.addColorStop(1, 'rgba(255,80,20,0)');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, TAU); g.fill();
  });
  // ala translúcida de insecto (se agita en juego)
  T.wing = tex(60, 20, (g, w, h) => {
    g.fillStyle = 'rgba(220,214,180,0.42)';
    g.strokeStyle = 'rgba(30,20,15,0.6)'; g.lineWidth = 1.6;
    g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(30,20,15,0.3)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(4, h / 2); g.lineTo(w - 6, h / 2 - 2); g.stroke();
  });
  // restos metálicos
  for (let k = 0; k < 4; k++) {
    T['debris' + k] = tex(30, 30, (g) => {
      const n = 4 + (k % 3);
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + Math.sin(i * 3 + k) * 0.4;
        const r = 9 + Math.cos(i * 5 + k * 2) * 4;
        const x = 15 + Math.cos(a) * r, y = 15 + Math.sin(a) * r;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath();
      g.fillStyle = [PAL.steel, PAL.rust, PAL.iron, PAL.steelL][k]; g.fill();
      g.strokeStyle = PAL.outline; g.lineWidth = 2; g.stroke();
      g.fillStyle = 'rgba(20,14,11,0.8)'; g.beginPath(); g.arc(12, 13, 1.4, 0, TAU); g.fill();
    });
  }
  // mejoras
  const PK = { impact: ['#ff9a3c', 'I'], wide: ['#b9d45a', 'W'], repair: ['#ff5a6e', '+'], charge: ['#7ad7ff', 'S'] };
  for (const [key, [col, letter]] of Object.entries(PK)) {
    T['pickup_' + key] = tex(84, 84, (g) => {
      radial(g, 42, 42, 42, [[0, col + '88'], [1, col + '00']]);
      g.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.lineTo(42 + Math.cos(a) * 26, 42 + Math.sin(a) * 26); }
      g.closePath();
      g.fillStyle = '#2b221c'; g.fill();
      g.strokeStyle = col; g.lineWidth = 5; g.stroke();
      g.fillStyle = col; g.font = `30px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(letter, 42, 44);
    });
  }
  // interfaz
  const button = (draw) => tex(120, 120, (g) => {
    g.fillStyle = 'rgba(20,14,11,0.6)'; g.beginPath(); g.arc(60, 60, 56, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(200,180,150,0.6)'; g.lineWidth = 4; g.stroke();
    g.translate(60, 60); g.scale(3, 3);
    g.fillStyle = '#e6d6b8'; g.strokeStyle = '#e6d6b8';
    draw(g);
  });
  T.ui_pause = button((g) => { g.fillRect(-6, -7, 4, 14); g.fillRect(2, -7, 4, 14); });
  const speaker = (g) => { g.beginPath(); g.moveTo(-8, -3); g.lineTo(-4, -3); g.lineTo(1, -8); g.lineTo(1, 8); g.lineTo(-4, 3); g.lineTo(-8, 3); g.closePath(); g.fill(); g.lineWidth = 1.6; };
  T.ui_sound = button((g) => { speaker(g); g.beginPath(); g.arc(2, 0, 6, -0.8, 0.8); g.stroke(); });
  T.ui_mute = button((g) => { speaker(g); g.beginPath(); g.moveTo(4, -4); g.lineTo(10, 4); g.moveTo(10, -4); g.lineTo(4, 4); g.stroke(); });
  T.ui_shock = tex(240, 240, (g) => {
    g.fillStyle = 'rgba(20,14,11,0.6)'; g.beginPath(); g.arc(120, 120, 114, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(200,180,150,0.6)'; g.lineWidth = 4; g.stroke();
    g.strokeStyle = '#bcd86a'; g.lineWidth = 7;
    for (const r of [28, 48, 68]) { g.beginPath(); g.arc(120, 112, r, -2.4, -0.74); g.stroke(); }
    g.fillStyle = '#efe0c2'; g.font = `32px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ONDA', 120, 150);
  });
  T.vignette = tex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 140, 70, 128, 140, 190);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,8,6,0.5)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  });
  T.logo = tex(1200, 220, (g, w, h) => {
    g.font = `170px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillText('METALHIVE', w / 2 + 6, h / 2 + 10);
    const gr = g.createLinearGradient(0, h / 2 - 80, 0, h / 2 + 80);
    gr.addColorStop(0, '#f3e4c4'); gr.addColorStop(0.45, '#b9a585'); gr.addColorStop(0.55, '#7c5a3a'); gr.addColorStop(1, '#c47a3a');
    g.fillStyle = gr; g.fillText('METALHIVE', w / 2, h / 2);
    g.strokeStyle = 'rgba(20,14,11,0.9)'; g.lineWidth = 3; g.strokeText('METALHIVE', w / 2, h / 2);
  });
  return T;
}

// Ícono de la app: la nave sobre el desierto
export function buildIcon(shipSprite, terrain) {
  return tex(1024, 1024, (g) => {
    g.drawImage(terrain, 140, 600, 400, 400, 0, 0, 1024, 1024);
    g.fillStyle = 'rgba(10,8,6,0.28)'; g.fillRect(0, 0, 1024, 1024);
    radial(g, 512, 560, 520, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(10,6,4,0.55)']]);
    const s = shipSprite.img;
    const k = 860 / s.width;
    g.drawImage(s, 512 - (s.width * k) / 2, 470 - (s.height * k) / 2, s.width * k, s.height * k);
  });
}
