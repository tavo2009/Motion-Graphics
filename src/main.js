import { clamp, rand, pick, TAU } from './util.js';
import * as ART from './art.js';
import * as SFX from './audio.js';

// ============================================================ PANTALLA
// Resolución lógica: ancho mínimo 390, alto mínimo 690. En iPhone vertical queda ~390×844,
// en iPad vertical ~480×690: la nave conserva el mismo tamaño relativo útil.
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
const safeProbe = document.getElementById('safe');
const params = new URLSearchParams(location.search);
const GOD = params.has('god');

let VW = 390, VH = 844, SC = 1, DPR = 1;
const safe = { t: 0, b: 0 };
let BG = null;
const BTN = {};

const SHIP_K = 1;         // escala de la nave: ~62×65 px lógicos (≈16% del ancho, ≈8% del alto)
const SHIP_HIT_R = 5;     // zona vulnerable (núcleo orgánico)
const SHIP_BODY_R = 13;   // choque de cuerpo contra enemigos

const SPR = { ship: ART.buildShipFrames(9), ...ART.buildEnemySprites() };

function resize() {
  let cw = innerWidth, ch = innerHeight;
  if (cw / ch > 0.8) cw = Math.round(ch * 0.5625); // escritorio / horizontal: forzar vertical
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  SC = Math.min(cw / 390, ch / 690);
  VW = cw / SC;
  VH = ch / SC;
  cvs.style.width = cw + 'px';
  cvs.style.height = ch + 'px';
  cvs.width = Math.round(cw * DPR);
  cvs.height = Math.round(ch * DPR);
  const cs = getComputedStyle(safeProbe);
  safe.t = (parseFloat(cs.paddingTop) || 0) / SC;
  safe.b = (parseFloat(cs.paddingBottom) || 0) / SC;
  BG = ART.buildBackground(Math.ceil(VW), 1200, 7);
  BTN.shock = { x: VW - 62, y: VH - safe.b - 74, r: 40 };
  BTN.pause = { x: VW - 28, y: safe.t + 28, r: 20 };
  BTN.mute = { x: VW - 74, y: safe.t + 28, r: 20 };
  if (G.ship) {
    G.ship.x = clamp(G.ship.x, 20, VW - 20); G.ship.tx = G.ship.x;
    G.ship.y = clamp(G.ship.y, 0, VH - 40); G.ship.ty = G.ship.y;
  }
}

// ============================================================ ESTADO
const G = {
  mode: 'title', t: 0, modeT: 0, stageT: 0, script: 0, loop: 0,
  hpMul: 1, bspd: 1, score: 0, best: 0, lives: 3,
  ship: null, enemies: [], pb: [], eb: [], parts: [], pickups: [], texts: [], rings: [],
  shake: 0, hitstop: 0, combo: 0, comboT: 0, banner: null, scroll: 0, respawnT: 0,
};
try { G.best = +localStorage.getItem('metalhive.best') || 0; } catch (e) { /* sin storage */ }

function newShip() {
  return {
    x: VW / 2, y: VH - safe.b - 150, tx: VW / 2, ty: VH - safe.b - 150, px: VW / 2,
    bank: 0, integ: 100, inv: 2, alive: true, fireT: 0, slugT: 0, shotN: 0,
    impactT: 0, wideT: 0, charges: 2, chargeT: 0,
  };
}

function startGame() {
  Object.assign(G, {
    mode: 'play', modeT: 0, stageT: 0, script: 0, loop: 0, hpMul: 1, bspd: 1,
    score: 0, lives: 3, enemies: [], pb: [], eb: [], parts: [], pickups: [], texts: [], rings: [],
    combo: 0, comboT: 0, banner: null, respawnT: 0,
  });
  G.ship = newShip();
  SFX.startMusic();
}

// ============================================================ ENEMIGOS
const DEF = {
  stinger: { hp: 2, r: 12, mass: 1, score: 100, drag: 3.2, k: 1.25 },
  tabano: { hp: 8, r: 15, mass: 2.2, score: 300, drag: 3.5 },
  beetle: { hp: 18, r: 22, mass: 4.5, score: 600, drag: 2.6 },
};

function spawn(type, x, y, opt = {}) {
  const d = DEF[type];
  const e = {
    type, x, y, vx: 0, vy: 0, kx: 0, ky: 0, rot: 0, rv: 0, t: 0, flash: 0, chain: 0, crashCD: 0,
    entered: false, hp: d.hp * G.hpMul, maxHp: d.hp * G.hpMul, r: d.r, mass: d.mass, score: d.score, drag: d.drag,
    fireT: rand(1.5, 3), dead: false, ...opt,
  };
  if (type === 'beetle') e.plates = { L: 5 * G.hpMul, R: 5 * G.hpMul };
  if (type === 'tabano') Object.assign(e, { st: 'enter', stT: 0, cycles: 0, ty: e.ty ?? VH * rand(0.15, 0.3) });
  G.enemies.push(e);
  return e;
}

const F = {
  vee(n = 5, cx = 0.5, spd = 170) {
    for (let i = 0; i < n; i++) {
      const o = i - (n - 1) / 2;
      spawn('stinger', VW * cx + o * 34, -30 - Math.abs(o) * 28, { mode: 'dive', spd, amp: 0, w: 0, ph: 0 });
    }
  },
  snake(n, x0, amp = 50) {
    for (let i = 0; i < n; i++) spawn('stinger', VW * x0, -30 - i * 36, { mode: 'dive', spd: 150, amp, w: 2.4, ph: -i * 0.6 });
  },
  sweep(n, dir, y0 = 0.1) {
    for (let i = 0; i < n; i++) {
      spawn('stinger', dir > 0 ? -20 - i * 34 : VW + 20 + i * 34, VH * y0 + i * 6, { mode: 'sweep', dir, spd: 190 });
    }
  },
  beetle(x, o = {}) { return spawn('beetle', VW * x, -40, o); },
  tabano(x, o = {}) { return spawn('tabano', VW * x, -30, o); },
  orbit(anchor, n = 4) {
    for (let i = 0; i < n; i++) spawn('stinger', anchor.x, anchor.y - 50 - i * 10, { mode: 'orbit', anchor, ang: (i / n) * TAU, R: 46 });
  },
  pickup(type, x) { G.pickups.push({ type, x: VW * x, y: -20, t: 0 }); },
  banner(txt, sub = '') { G.banner = { txt, sub, t: 0 }; SFX.banner(); },
};

// Guion del sector: lectura → combinación → presión → descanso → encuentro
const SCRIPT = [
  [0.3, () => F.banner('SECTOR ' + (G.loop + 1), G.loop ? 'la colmena se endurece' : 'interior de la colmena')],
  [2.5, () => F.vee(5)],
  [7, () => F.sweep(5, 1, 0.08)],
  [10.5, () => F.sweep(5, -1, 0.14)],
  [15, () => F.beetle(0.5)],
  [22, () => { F.snake(4, 0.22); F.snake(4, 0.78); }],
  [27, () => F.pickup('impact', 0.5)],
  [30, () => { F.beetle(0.36); F.beetle(0.64); }],
  [37, () => F.orbit(F.beetle(0.5), 5)],
  [44, () => { F.vee(5, 0.3); F.vee(5, 0.7); }],
  [50, () => F.banner('TÁBANO', 'esquivá cuando brilla')],
  [52, () => F.tabano(0.3)],
  [55, () => F.tabano(0.7)],
  [60, () => F.vee(7, 0.5, 190)],
  [64, () => { F.beetle(0.22); F.beetle(0.5, { fires: true }); F.beetle(0.78); }],
  [70, () => F.pickup('wide', 0.3)],
  [73, () => { F.tabano(0.25); F.tabano(0.75); F.sweep(6, 1, 0.12); }],
  [82, () => F.pickup('repair', 0.6)],
  [84, () => { F.orbit(F.beetle(0.32), 4); F.orbit(F.beetle(0.68), 4); }],
  [90, () => F.tabano(0.5)],
  [97, () => { F.sweep(6, 1, 0.06); F.sweep(6, -1, 0.16); }],
  [103, () => { F.tabano(0.2); F.tabano(0.5); F.tabano(0.8); }],
  [110, () => { F.beetle(0.4); F.beetle(0.6); F.pickup('charge', 0.5); F.pickup('impact', 0.2); }],
  [116, () => { F.snake(5, 0.15, 40); F.snake(5, 0.85, 40); }],
  [122, () => F.banner('ENJAMBRE', '')],
  [124, () => {
    F.beetle(0.2, { fires: true }); F.beetle(0.42); F.beetle(0.58); F.beetle(0.8, { fires: true });
    F.tabano(0.35, { ty: VH * 0.12 }); F.tabano(0.65, { ty: VH * 0.12 });
  }],
  [130, () => F.vee(7)],
  [136, () => { G.waitClear = true; }],
];

function runScript(dt) {
  if (G.waitClear) {
    if (G.enemies.length === 0) {
      G.waitClear = false;
      F.banner('SECTOR DESPEJADO', '+' + (5000 * (G.loop + 1)) + ' pts');
      addScore(5000 * (G.loop + 1));
      G.loop++;
      G.hpMul *= 1.22;
      G.bspd *= 1.1;
      G.stageT = -3;
      G.script = 0;
    }
    return;
  }
  G.stageT += dt;
  while (G.script < SCRIPT.length && SCRIPT[G.script][0] <= G.stageT) SCRIPT[G.script++][1]();
}

// ------------------------------------------------------------ IA
const AI = {
  stinger(e, dt) {
    let dx = 0, dy = 0;
    if (e.mode === 'orbit') {
      if (e.anchor && !e.anchor.dead) {
        e.ang += dt * 1.8;
        const tx = e.anchor.x + Math.cos(e.ang) * e.R, ty = e.anchor.y + Math.sin(e.ang) * e.R * 0.8;
        dx = (tx - e.x) * 5; dy = (ty - e.y) * 5;
      } else { e.mode = 'dive'; e.spd = 180; e.amp = 0; e.w = 0; e.ph = 0; }
    }
    if (e.mode === 'dive') {
      dy = e.spd;
      dx = Math.cos(e.t * e.w + e.ph) * e.amp * e.w;
      if (!e.locked && e.y > VH * 0.3) { e.locked = true; e.aimX = G.ship ? G.ship.x : VW / 2; }
      if (e.locked) dx += clamp((e.aimX - e.x) * 1.2, -110, 110);
    } else if (e.mode === 'sweep') {
      dx = e.dir * e.spd;
      dy = 30 + e.t * 50;
    }
    const s = Math.min(1, 5 * dt);
    e.vx += (dx - e.vx) * s;
    e.vy += (dy - e.vy) * s;
  },
  beetle(e, dt) {
    const tx = G.ship ? clamp((G.ship.x - e.x) * 0.25, -18, 18) : 0;
    e.vx += (tx - e.vx) * Math.min(1, 2 * dt);
    e.vy += (36 - e.vy) * Math.min(1, 2 * dt);
    if (e.fires && e.entered && e.y < VH * 0.6) {
      e.fireT -= dt;
      if (e.fireT <= 0) { e.fireT = 3.2 / G.bspd; aimShot(e.x, e.y + 26, 170); }
    }
  },
  tabano(e, dt) {
    const slow = e.hp < e.maxHp * 0.5 ? 0.55 : 1; // motor dañado: más lento, pero no errático
    e.stT += dt;
    let dx = 0, dy = 0;
    const hoverX = G.ship ? clamp(G.ship.x, 40, VW - 40) : VW / 2;
    if (e.st === 'enter') {
      dy = (e.ty - e.y) * 3 * slow + 20;
      if (e.y >= e.ty - 4) { e.st = 'hover'; e.stT = 0; }
    } else if (e.st === 'hover') {
      dx = clamp(hoverX - e.x, -1, 1) * 60 * slow;
      dy = Math.sin(e.t * 3) * 14 + (e.ty - e.y) * 2;
      if (e.stT > 0.9) { e.st = 'charge'; e.stT = 0; SFX.telegraph(0.75); }
    } else if (e.st === 'charge') {
      dy = (e.ty - e.y) * 2;
      if (e.stT > 0.75) {
        e.st = 'cool'; e.stT = 0; e.cycles++;
        for (const a of [-0.2, 0, 0.2]) {
          aimShot(e.x - 11, e.y + 15, 210, a);
          aimShot(e.x + 11, e.y + 15, 210, a);
        }
      }
    } else if (e.st === 'cool') {
      dy = (e.ty - e.y) * 2;
      if (e.stT > 0.7) { e.st = e.cycles >= 3 ? 'leave' : 'hover'; e.stT = 0; }
    } else if (e.st === 'leave') {
      dx = (e.x < VW / 2 ? -1 : 1) * 160 * slow;
      dy = 120 * slow;
    }
    const s = Math.min(1, 4 * dt);
    e.vx += (dx - e.vx) * s;
    e.vy += (dy - e.vy) * s;
  },
};

function aimShot(x, y, spd, da = 0) {
  const s = G.ship;
  const tx = s && s.alive ? s.x : VW / 2, ty = s && s.alive ? s.y : VH;
  const a = Math.atan2(ty - y, tx - x) + da;
  spd *= G.bspd;
  G.eb.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 5, t: 0 });
  SFX.eshot();
}

function updEnemy(e, dt) {
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.crashCD -= dt;
  AI[e.type](e, dt);
  // los empujes nunca lanzan al enemigo con fuerza hacia la nave
  if (e.ky > 70) e.ky = 70;
  e.x += (e.vx + e.kx) * dt;
  e.y += (e.vy + e.ky) * dt;
  const damp = Math.exp(-e.drag * dt);
  e.kx *= damp; e.ky *= damp;
  e.rot += e.rv * dt;
  e.rv *= damp;
  e.rot *= Math.exp(-2.5 * dt);
  if (Math.hypot(e.kx, e.ky) < 50) e.chain = 0;
  if (!e.entered && e.x > 0 && e.x < VW && e.y > 0) e.entered = true;
  if (e.entered) {
    // rebote contra las paredes de la colmena
    if ((e.x < e.r && e.kx < 0) || (e.x > VW - e.r && e.kx > 0)) {
      if (Math.abs(e.kx) > 150) {
        hitEnemy(e, Math.abs(e.kx) / 70, 0, 0, e.x, e.y, 'crash');
        sparks(e.x < e.r ? 2 : VW - 2, e.y, 10, '#ffcf7a', 260);
        SFX.wall();
        G.shake = Math.max(G.shake, 4);
      }
      e.kx *= -0.5;
    }
    if (e.y > VH + 60 || e.y < -260 || e.x < -90 || e.x > VW + 90) e.gone = true;
  }
  if (e.type !== 'stinger' && e.hp < e.maxHp * 0.45 && Math.random() < dt * 14) {
    G.parts.push({ k: 'smoke', x: e.x + rand(-8, 8), y: e.y + rand(-8, 8), vx: rand(-10, 10), vy: rand(-40, -10), life: 0, max: rand(0.6, 1), size: rand(5, 9) });
  }
}

// material del impacto según dónde pega (el escarabajo tiene frente blindado)
function hitEnemy(e, dmg, kx, ky, hx, hy, kind) {
  if (e.dead) return;
  if (e.type === 'beetle' && kind !== 'crash' && kind !== 'wave') {
    const lx = hx - e.x;
    const side = Math.abs(lx) > e.r * 0.42 ? (lx < 0 ? 'L' : 'R') : 'F';
    if (side === 'F') {
      dmg *= 0.15;
      SFX.hit('armor');
      sparks(hx, hy + 4, 3, '#fff2c0', 220);
    } else if (e.plates[side] > 0) {
      e.plates[side] -= dmg;
      dmg *= 0.3;
      SFX.hit('plate', 1.4);
      sparks(hx, hy, 3, '#ffd08a', 180);
      if (e.plates[side] <= 0) {
        // la placa se desprende con peso y deja ese lado vulnerable
        SFX.plateOff();
        const s = side === 'L' ? -1 : 1;
        debris(e.x + s * 14, e.y - 4, 1, s * 160, -60, 14, [ART.PAL.steel, ART.PAL.rust]);
        debris(e.x + s * 12, e.y, 4, s * 120, -30, 5, [ART.PAL.steel, ART.PAL.iron]);
        sparks(e.x + s * 14, e.y, 14, '#ffcf7a', 300);
        addScore(150, e.x + s * 18, e.y, 'PLACA');
        G.shake = Math.max(G.shake, 5);
        e.rv += s * 3;
      }
    } else {
      dmg *= 1.7;
      SFX.hit('flesh');
      blood(hx, hy, 4);
    }
  } else if (kind === 'bullet' || kind === 'slug') {
    SFX.hit(e.type === 'stinger' ? 'shell' : 'plate', e.type === 'tabano' ? 1.2 : 0.8);
    sparks(hx, hy, 2, '#ffe9b0', 160);
  }
  e.hp -= dmg;
  e.flash = 0.06;
  // el blindaje pesado absorbe el empuje del cañón liviano; solo el impacto lo desplaza
  if (kind === 'bullet' && e.type === 'beetle') { kx *= 0.25; ky *= 0.25; }
  e.kx += kx / e.mass;
  e.ky += ky / e.mass;
  e.rv += ((hx - e.x) / e.r) * (Math.abs(kx) + Math.abs(ky)) * -0.004 / e.mass;
  if (e.hp <= 0) killEnemy(e, kind);
}

function killEnemy(e, kind) {
  e.dead = true;
  const big = e.type === 'beetle' ? 2.4 : e.type === 'tabano' ? 1.6 : 1;
  SFX.explode(big);
  G.shake = Math.max(G.shake, 3 * big);
  G.parts.push({ k: 'flash', x: e.x, y: e.y, life: 0, max: 0.18, size: e.r * 3 });
  sparks(e.x, e.y, 10 * big, '#ffcf7a', 320);
  const cols = e.type === 'stinger' ? [ART.PAL.ochre, ART.PAL.rust, ART.PAL.steel]
    : e.type === 'tabano' ? [ART.PAL.iron, ART.PAL.rust, ART.PAL.moss] : [ART.PAL.steelL, ART.PAL.steel, ART.PAL.rust];
  debris(e.x, e.y, Math.round(5 * big), e.kx * 0.6, e.ky * 0.6, 4 + big * 2, cols);
  blood(e.x, e.y, Math.round(3 * big));
  for (let i = 0; i < 3 * big; i++) G.parts.push({ k: 'smoke', x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), vx: rand(-30, 30), vy: rand(-30, 20), life: 0, max: rand(0.6, 1.2), size: rand(8, 14) * big * 0.7 });
  G.combo++;
  G.comboT = 1.3;
  const mult = Math.min(8, 1 + Math.floor(G.combo / 4));
  addScore(e.score * mult * (kind === 'crash' ? 2 : 1), e.x, e.y, kind === 'crash' ? 'APLASTADO' : null);
  const roll = Math.random();
  const chance = e.type === 'beetle' ? 0.35 : e.type === 'tabano' ? 0.15 : 0.03;
  if (roll < chance) {
    const t = e.type === 'beetle' ? pick(['impact', 'impact', 'repair', 'charge']) : pick(['wide', 'repair', 'charge', 'impact']);
    G.pickups.push({ type: t, x: e.x, y: e.y, t: 0 });
  }
}

// Choques entre enemigos: la mecánica distintiva
function enemyCollisions() {
  const E = G.enemies;
  for (let i = 0; i < E.length; i++) {
    const a = E[i];
    if (a.dead) continue;
    for (let j = i + 1; j < E.length; j++) {
      const b = E[j];
      if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const rr = (a.r + b.r) * 0.88;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 1, nx = dx / d, ny = dy / d;
      const rel = Math.hypot(a.kx - b.kx, a.ky - b.ky);
      // separar
      const push = (rr - d) / (a.mass + b.mass);
      a.x -= nx * push * b.mass; a.y -= ny * push * b.mass;
      b.x += nx * push * a.mass; b.y += ny * push * a.mass;
      if (rel > 120 && a.crashCD <= 0 && b.crashCD <= 0) {
        // intercambio de momento a lo largo de la normal (choque semi-elástico)
        const va = a.kx * nx + a.ky * ny, vb = b.kx * nx + b.ky * ny;
        const m1 = a.mass, m2 = b.mass, e = 0.7;
        const na = (m1 * va + m2 * vb - m2 * e * (va - vb)) / (m1 + m2);
        const nb = (m1 * va + m2 * vb + m1 * e * (va - vb)) / (m1 + m2);
        a.kx += (na - va) * nx; a.ky += (na - va) * ny;
        b.kx += (nb - vb) * nx; b.ky += (nb - vb) * ny;
        const chain = Math.max(a.chain, b.chain) + 1;
        a.chain = b.chain = chain;
        a.crashCD = b.crashCD = 0.15;
        const dmg = rel / 45;
        const cx = a.x + nx * a.r, cy = a.y + ny * a.r;
        sparks(cx, cy, 16, '#ffd890', 360);
        SFX.clang(rel / 300);
        G.shake = Math.max(G.shake, Math.min(10, rel / 50));
        G.hitstop = Math.max(G.hitstop, 0.045);
        G.rings.push({ x: cx, y: cy, r: 4, max: 40, life: 0, dur: 0.25, col: '255,210,140' });
        addScore(50 * chain, cx, cy - 10, chain > 1 ? 'CHOQUE x' + chain : 'CHOQUE');
        hitEnemy(a, dmg * (b.mass / 2), 0, 0, cx, cy, 'crash');
        hitEnemy(b, dmg * (a.mass / 2), 0, 0, cx, cy, 'crash');
      }
    }
  }
}

// ============================================================ JUGADOR
const keys = new Set();
const touch = { id: null, lx: 0, ly: 0 };
const SENS = 1.2;

function updShip(dt) {
  const s = G.ship;
  if (!s.alive) {
    G.respawnT -= dt;
    if (G.respawnT <= 0 && G.lives > 0) {
      const keep = s.charges;
      G.ship = newShip();
      G.ship.inv = 2.5;
      G.ship.charges = Math.max(2, keep);
    }
    return;
  }
  let kx = 0, ky = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) kx--;
  if (keys.has('ArrowRight') || keys.has('KeyD')) kx++;
  if (keys.has('ArrowUp') || keys.has('KeyW')) ky--;
  if (keys.has('ArrowDown') || keys.has('KeyS')) ky++;
  if (kx || ky) {
    const n = Math.hypot(kx, ky);
    s.tx = s.x + (kx / n) * 380 * dt * 4;
    s.ty = s.y + (ky / n) * 380 * dt * 4;
  }
  s.tx = clamp(s.tx, 22, VW - 22);
  s.ty = clamp(s.ty, safe.t + 90, VH - safe.b - 34);
  const f = 1 - Math.exp(-30 * dt);
  s.px = s.x;
  s.x += (s.tx - s.x) * f;
  s.y += (s.ty - s.y) * f;
  const vx = (s.x - s.px) / Math.max(dt, 1e-3);
  s.bank += (clamp(vx / 380, -1, 1) - s.bank) * (1 - Math.exp(-10 * dt));
  s.inv = Math.max(0, s.inv - dt);
  s.impactT = Math.max(0, s.impactT - dt);
  s.wideT = Math.max(0, s.wideT - dt);
  if (s.charges < 3) {
    s.chargeT += dt;
    if (s.chargeT >= 14) { s.chargeT = 0; s.charges++; }
  }

  // disparo principal automático desde la doble púa
  s.fireT -= dt;
  if (s.fireT <= 0) {
    s.fireT = 0.085;
    s.shotN++;
    const m = ART.shipMuzzles(s.bank);
    for (const [mx, my] of m.nose) G.pb.push({ x: s.x + mx * SHIP_K, y: s.y + my * SHIP_K, vx: 0, vy: -950, dmg: 1, r: 3, kind: 'bullet', kn: 26 });
    if (s.wideT > 0 && s.shotN % 2 === 0) {
      m.wings.forEach(([mx, my], i) => {
        const a = (i ? 1 : -1) * 0.14;
        G.pb.push({ x: s.x + mx * SHIP_K, y: s.y + my * SHIP_K, vx: Math.sin(a) * 900, vy: -Math.cos(a) * 900, dmg: 1, r: 3, kind: 'bullet', kn: 26 });
      });
    }
    SFX.shot();
  }
  // disparo de impacto (mejora temporal): lento, contundente, desplaza enemigos
  if (s.impactT > 0) {
    s.slugT -= dt;
    if (s.slugT <= 0) {
      s.slugT = 0.42;
      G.pb.push({ x: s.x, y: s.y - 36 * SHIP_K, vx: 0, vy: -640, dmg: 4, r: 7, kind: 'slug', kn: 620 });
      SFX.slug();
    }
  }
  // humo de los motores
  if (Math.random() < dt * 30) {
    const [ex, ey] = pick(ART.shipEngines(s.bank));
    G.parts.push({ k: 'ember', x: s.x + ex * SHIP_K + rand(-2, 2), y: s.y + ey * SHIP_K + 14, vx: rand(-15, 15), vy: rand(80, 160), life: 0, max: rand(0.2, 0.45), size: rand(0.8, 1.8) });
  }
}

function shockwave() {
  const s = G.ship;
  if (G.mode !== 'play' || !s || !s.alive || s.charges <= 0) return;
  s.charges--;
  SFX.shock();
  G.shake = Math.max(G.shake, 9);
  G.rings.push({ x: s.x, y: s.y, r: 10, max: 175, life: 0, dur: 0.38, col: '190,230,120', wave: true, hit: new Set() });
  G.rings.push({ x: s.x, y: s.y, r: 6, max: 120, life: 0, dur: 0.3, col: '255,240,200' });
  s.inv = Math.max(s.inv, 0.4);
}

function damageShip(d, x, y) {
  const s = G.ship;
  if (GOD || !s.alive || s.inv > 0) return;
  s.integ -= d;
  s.inv = 1.1;
  G.shake = Math.max(G.shake, 9);
  G.hitstop = Math.max(G.hitstop, 0.06);
  SFX.playerHit();
  sparks(x, y, 14, '#ffb070', 300);
  blood(s.x, s.y, 3);
  if (s.integ <= 0) {
    s.integ = 0;
    s.alive = false;
    G.lives--;
    G.respawnT = 1.6;
    SFX.explode(3);
    G.shake = 16;
    G.parts.push({ k: 'flash', x: s.x, y: s.y, life: 0, max: 0.3, size: 110 });
    sparks(s.x, s.y, 40, '#ffcf7a', 420);
    debris(s.x, s.y, 12, 0, 0, 7, [ART.PAL.steel, ART.PAL.iron, ART.PAL.bio, ART.PAL.rust]);
    G.rings.push({ x: s.x, y: s.y, r: 10, max: 130, life: 0, dur: 0.5, col: '255,190,120' });
    if (G.lives <= 0) {
      G.mode = 'over';
      G.modeT = 0;
      SFX.stopMusic();
      if (G.score > G.best) { G.best = G.score; try { localStorage.setItem('metalhive.best', G.best); } catch (e) { /* sin storage */ } }
    }
  }
}

// ============================================================ PARTÍCULAS Y TEXTO
function sparks(x, y, n, col, spd) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), v = rand(0.3, 1) * spd;
    G.parts.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rand(0.12, 0.35), col });
  }
}
function debris(x, y, n, vx, vy, size, cols) {
  for (let i = 0; i < n; i++) {
    const pts = [];
    const m = 3 + ((Math.random() * 3) | 0);
    for (let j = 0; j < m; j++) { const a = (j / m) * TAU + rand(-0.3, 0.3); pts.push([Math.cos(a) * size * rand(0.5, 1), Math.sin(a) * size * rand(0.5, 1)]); }
    const a = rand(TAU), v = rand(40, 200);
    G.parts.push({ k: 'debris', x, y, vx: vx + Math.cos(a) * v, vy: vy + Math.sin(a) * v, rot: rand(TAU), vr: rand(-9, 9), life: 0, max: rand(0.7, 1.3), pts, col: pick(cols) });
  }
}
function blood(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), v = rand(30, 120);
    G.parts.push({ k: 'goo', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rand(0.4, 0.8), size: rand(1.5, 3.5) });
  }
}
function addScore(n, x, y, label) {
  G.score += n;
  if (x !== undefined) G.texts.push({ x, y, txt: label ? `${label} +${n}` : `+${n}`, life: 0, max: label ? 1.1 : 0.7, big: !!label });
}

// ============================================================ UPDATE
function update(dt) {
  G.t += dt;
  G.modeT += dt;
  G.scroll += dt;
  if (G.banner) { G.banner.t += dt; if (G.banner.t > 2.6) G.banner = null; }
  if (G.mode !== 'play') {
    updParts(dt);
    return;
  }
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  runScript(dt);
  updShip(dt);
  const s = G.ship;

  for (const e of G.enemies) updEnemy(e, dt);
  enemyCollisions();

  // balas del jugador
  for (const b of G.pb) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < -20) { b.dead = true; continue; }
    for (const e of G.enemies) {
      if (e.dead || !e.entered) continue;
      const rr = e.r + b.r;
      if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < rr * rr) {
        b.dead = true;
        // empuje: hacia arriba, y lateral si el golpe es descentrado
        const off = clamp((e.x - b.x) / e.r, -1, 1);
        const kx = off * b.kn * (b.kind === 'slug' ? 1.1 : 0.4), ky = -b.kn * (b.kind === 'slug' ? 0.55 : 1);
        if (b.kind === 'slug') {
          G.rings.push({ x: b.x, y: b.y, r: 3, max: 26, life: 0, dur: 0.18, col: '255,170,80' });
          G.shake = Math.max(G.shake, 3);
        }
        hitEnemy(e, b.dmg, kx, ky, b.x, b.y, b.kind);
        break;
      }
    }
  }

  // ondas: la onda de choque empuja, daña y borra proyectiles
  for (const r of G.rings) {
    r.life += dt;
    r.r = r.max * Math.min(1, r.life / r.dur) ** 0.6;
    if (!r.wave) continue;
    for (const e of G.enemies) {
      if (e.dead || r.hit.has(e)) continue;
      const d = Math.hypot(e.x - r.x, e.y - r.y);
      if (d < r.r + e.r) {
        r.hit.add(e);
        const f = 560 * (1 - Math.min(1, d / r.max) * 0.6);
        const nx = (e.x - r.x) / (d || 1), ny = (e.y - r.y) / (d || 1);
        hitEnemy(e, 3, nx * f, Math.min(ny * f, 40), e.x, e.y, 'wave');
        e.chain = 1;
      }
    }
    for (const b of G.eb) if (Math.hypot(b.x - r.x, b.y - r.y) < r.r) { b.dead = true; sparks(b.x, b.y, 3, '#ff8aa0', 100); }
  }
  G.rings = G.rings.filter((r) => r.life < r.dur);

  // balas enemigas
  for (const b of G.eb) {
    b.t += dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y > VH + 20 || b.y < -40 || b.x < -20 || b.x > VW + 20) b.dead = true;
    else if (s.alive && Math.hypot(b.x - s.x, b.y - (s.y + 3)) < SHIP_HIT_R + b.r) {
      if (s.inv <= 0 || GOD) { b.dead = true; damageShip(12, b.x, b.y); }
    }
  }

  // cuerpo a cuerpo con la nave
  if (s.alive) {
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - s.x, e.y - s.y);
      if (d < e.r + SHIP_BODY_R) {
        const nx = (e.x - s.x) / (d || 1), ny = (e.y - s.y) / (d || 1);
        if (s.inv <= 0) damageShip(e.type === 'beetle' ? 34 : 22, (e.x + s.x) / 2, (e.y + s.y) / 2);
        e.kx = nx * 380 / e.mass * 2; e.ky = Math.min(ny * 380 / e.mass * 2, 0);
        hitEnemy(e, 3, 0, 0, e.x, e.y, 'crash');
      }
    }
  }

  // mejoras
  for (const p of G.pickups) {
    p.t += dt;
    p.y += 70 * dt;
    p.x += Math.sin(p.t * 2) * 20 * dt;
    if (p.y > VH + 30) p.dead = true;
    if (s.alive && Math.hypot(p.x - s.x, p.y - s.y) < 30) {
      p.dead = true;
      SFX.pickup();
      const lbl = { impact: 'IMPACTO', wide: 'ABANICO', repair: 'REPARACIÓN', charge: 'ONDA +1' }[p.type];
      if (p.type === 'impact') s.impactT = 10;
      if (p.type === 'wide') s.wideT = 12;
      if (p.type === 'repair') s.integ = Math.min(100, s.integ + 35);
      if (p.type === 'charge') s.charges = Math.min(3, s.charges + 1);
      G.texts.push({ x: s.x, y: s.y - 40, txt: lbl, life: 0, max: 1.2, big: true, col: PICK_COL[p.type] });
      G.rings.push({ x: s.x, y: s.y, r: 10, max: 50, life: 0, dur: 0.3, col: PICK_RGB[p.type] });
    }
  }

  G.comboT -= dt;
  if (G.comboT <= 0) G.combo = 0;

  G.enemies = G.enemies.filter((e) => !e.dead && !e.gone);
  G.pb = G.pb.filter((b) => !b.dead);
  G.eb = G.eb.filter((b) => !b.dead);
  G.pickups = G.pickups.filter((p) => !p.dead);
  updParts(dt);
}

function updParts(dt) {
  for (const p of G.parts) {
    p.life += dt;
    p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
    if (p.k === 'debris') { p.rot += p.vr * dt; p.vx *= 0.97; p.vy = p.vy * 0.97 + 60 * dt; }
    if (p.k === 'spark') { p.vx *= 0.9; p.vy *= 0.9; }
    if (p.k === 'smoke') { p.vy += 40 * dt; }
  }
  G.parts = G.parts.filter((p) => p.life < p.max);
  if (G.parts.length > 700) G.parts.splice(0, G.parts.length - 700);
  for (const t of G.texts) { t.life += dt; t.y -= 30 * dt; }
  G.texts = G.texts.filter((t) => t.life < t.max);
  G.shake *= Math.exp(-9 * dt);
}

// ============================================================ RENDER
const PICK_COL = { impact: '#ff9a3c', wide: '#b9d45a', repair: '#ff5a6e', charge: '#7ad7ff' };
const PICK_RGB = { impact: '255,154,60', wide: '185,212,90', repair: '255,90,110', charge: '122,215,255' };
const FONT = "'Black Ops One', 'Arial Black', Impact, sans-serif";

function drawBG() {
  const { far, near, H, scale } = BG;
  const w = far.width / scale;
  for (const [img, spd, a] of [[far, 38, 1], [near, 115, 1]]) {
    const off = (G.scroll * spd) % H;
    ctx.globalAlpha = a;
    ctx.drawImage(img, 0, off - H, w, H);
    ctx.drawImage(img, 0, off, w, H);
  }
  ctx.globalAlpha = 1;
  // esporas flotando
  ctx.fillStyle = 'rgba(200,220,120,0.25)';
  for (let i = 0; i < 26; i++) {
    const x = (i * 97.3 + Math.sin(G.t * 0.5 + i) * 12) % VW;
    const y = (i * 151.7 + G.scroll * (60 + (i % 5) * 25)) % (VH + 20) - 10;
    ctx.beginPath(); ctx.arc(x, y, 0.8 + (i % 3) * 0.6, 0, TAU); ctx.fill();
  }
  const vg = ctx.createRadialGradient(VW / 2, VH * 0.55, VH * 0.25, VW / 2, VH * 0.55, VH * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VW, VH);
}

function shipFrame(bank) {
  const n = SPR.ship.length;
  return SPR.ship[clamp(Math.round(((bank + 1) / 2) * (n - 1)), 0, n - 1)];
}

function drawShip(s, k = SHIP_K, flicker = true) {
  if (!s.alive) return;
  const spr = shipFrame(s.bank);
  if (flicker && s.inv > 0 && Math.floor(G.t * 16) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.save();
  ctx.globalAlpha *= 0.35;
  ART.drawSprite(ctx, spr, s.x + 9, s.y + 14, k * 0.92, s.bank * 0.08, spr.dark);
  ctx.restore();
  // llamas de los motores
  ctx.globalCompositeOperation = 'lighter';
  for (const [ex, ey] of ART.shipEngines(s.bank)) {
    const x = s.x + ex * k, y = s.y + ey * k;
    const L = (16 + Math.sin(G.t * 40 + ex) * 3 + rand(0, 3)) * k * 1.15;
    const gr = ctx.createLinearGradient(x, y, x, y + L);
    gr.addColorStop(0, 'rgba(255,240,200,0.95)');
    gr.addColorStop(0.3, 'rgba(255,170,60,0.8)');
    gr.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(x, y + L * 0.45, 3.2 * k, L * 0.55, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,150,50,0.18)';
    ctx.beginPath(); ctx.arc(x, y + 3, 8 * k, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ART.drawSprite(ctx, spr, s.x, s.y, k, s.bank * 0.08);
  if (s.inv > 0.9 && flicker) {
    ctx.globalAlpha = (s.inv - 0.9) * 2;
    ART.drawSprite(ctx, spr, s.x, s.y, k, s.bank * 0.08, spr.white);
  }
  ctx.globalAlpha = 1;
  // núcleo: marca clara de la zona vulnerable
  const pulse = 0.55 + Math.sin(G.t * 6) * 0.2;
  ctx.globalCompositeOperation = 'lighter';
  const cg = ctx.createRadialGradient(s.x, s.y + 3, 0, s.x, s.y + 3, 9);
  cg.addColorStop(0, `rgba(230,255,170,${pulse})`);
  cg.addColorStop(1, 'rgba(150,200,60,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(s.x, s.y + 3, 9, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fbffe6';
  ctx.beginPath(); ctx.arc(s.x, s.y + 3, 2, 0, TAU); ctx.fill();
}

function enemySprite(e) {
  if (e.type === 'beetle') return SPR.beetle[(e.plates.L > 0 ? 0 : 1) + (e.plates.R > 0 ? 0 : 2)];
  return SPR[e.type];
}

function drawWings(e) {
  const flap = Math.floor(G.t * 30 + e.x) % 2;
  const big = e.type === 'tabano';
  ctx.fillStyle = big ? 'rgba(190,200,170,0.28)' : 'rgba(220,210,170,0.3)';
  ctx.strokeStyle = 'rgba(30,20,15,0.5)';
  ctx.lineWidth = 0.8;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * (big ? 10 : 6.5), big ? -5 : -1, big ? 12 : 8, big ? 3.6 : 2.6, s * (flap ? 0.35 : 0.65), 0, TAU);
    ctx.fill(); ctx.stroke();
  }
}

function drawEnemy(e) {
  const spr = enemySprite(e);
  let rot = e.rot;
  if (e.type === 'stinger') rot += Math.atan2(-(e.vx + e.kx), e.vy + e.ky + 1);
  ctx.save();
  ctx.globalAlpha = 0.32;
  const k = DEF[e.type].k || 1;
  ART.drawSprite(ctx, spr, e.x + 8, e.y + 13, 0.9 * k, rot, spr.dark);
  ctx.restore();
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(rot);
  ctx.scale(k, k);
  if (e.type !== 'beetle') drawWings(e);
  ART.drawSprite(ctx, spr, 0, 0, 1);
  if (e.flash > 0) {
    ctx.globalAlpha = 0.85;
    ART.drawSprite(ctx, spr, 0, 0, 1, 0, spr.white);
    ctx.globalAlpha = 1;
  }
  // aviso del tábano: los ojos y las vainas se encienden antes de disparar
  if (e.type === 'tabano' && e.st === 'charge') {
    const k = e.stT / 0.75;
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r] of [[-11, 15, 7], [11, 15, 7], [0, 10, 10]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * (0.6 + k));
      g.addColorStop(0, `rgba(255,90,110,${0.25 + k * 0.7})`);
      g.addColorStop(1, 'rgba(255,40,70,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * (0.6 + k), 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function drawPickup(p) {
  const col = PICK_COL[p.type];
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
  g.addColorStop(0, `rgba(${PICK_RGB[p.type]},0.45)`);
  g.addColorStop(1, `rgba(${PICK_RGB[p.type]},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.rotate(p.t * 1.5);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); }
  ctx.closePath();
  ctx.fillStyle = '#2b221c'; ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.rotate(-p.t * 1.5);
  ctx.fillStyle = col;
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText({ impact: 'I', wide: 'W', repair: '+', charge: 'S' }[p.type], 0, 1);
  ctx.restore();
}

function drawBullets() {
  ctx.globalCompositeOperation = 'lighter';
  for (const b of G.pb) {
    if (b.kind === 'slug') {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 14);
      g.addColorStop(0, 'rgba(255,240,200,1)');
      g.addColorStop(0.35, 'rgba(255,150,50,0.85)');
      g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(b.x, b.y + 3, 9, 14, 0, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,190,80,0.45)';
      ctx.beginPath(); ctx.ellipse(b.x, b.y + 2, 3.2, 10, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 1.3, 7, 0, 0, TAU); ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawEnemyBullets() {
  for (const b of G.eb) {
    const p = 1 + Math.sin(b.t * 20) * 0.12;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,45,85,0.35)';
    ctx.beginPath(); ctx.arc(b.x, b.y, 9 * p, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ff3d64';
    ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y, 2.4, 0, TAU); ctx.fill();
  }
}

function drawParts() {
  for (const p of G.parts) {
    const k = 1 - p.life / p.max;
    if (p.k === 'smoke') {
      ctx.fillStyle = `rgba(30,24,20,${0.45 * k})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, TAU); ctx.fill();
    } else if (p.k === 'debris') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.beginPath();
      p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = p.col; ctx.fill();
      ctx.strokeStyle = '#140e0b'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    } else if (p.k === 'goo') {
      ctx.fillStyle = `rgba(150,170,60,${k})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * k, 0, TAU); ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.parts) {
    const k = 1 - p.life / p.max;
    if (p.k === 'spark') {
      ctx.strokeStyle = p.col;
      ctx.globalAlpha = k;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
    } else if (p.k === 'ember') {
      ctx.globalAlpha = k;
      ctx.fillStyle = '#ffb04a';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    } else if (p.k === 'flash') {
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, `rgba(255,240,200,${k})`);
      g.addColorStop(0.4, `rgba(255,150,60,${k * 0.6})`);
      g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
  }
  for (const r of G.rings) {
    const k = 1 - r.life / r.dur;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(${r.col},${k * 0.9})`;
    ctx.lineWidth = r.wave ? 6 * k + 1 : 2.5 * k + 0.5;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawTexts() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of G.texts) {
    const k = 1 - t.life / t.max;
    ctx.globalAlpha = Math.min(1, k * 2.5);
    ctx.font = `${t.big ? 14 : 11}px ${FONT}`;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(t.txt, t.x + 1, t.y + 1);
    ctx.fillStyle = t.col || (t.big ? '#ffd27a' : '#f2e6cf');
    ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function metalText(txt, x, y, size, align = 'center') {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillText(txt, x + 2, y + 3);
  const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  g.addColorStop(0, '#f3e4c4'); g.addColorStop(0.45, '#b9a585'); g.addColorStop(0.55, '#7c5a3a'); g.addColorStop(1, '#c47a3a');
  ctx.fillStyle = g;
  ctx.fillText(txt, x, y);
}

function drawButton(b, draw, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(b.x, b.y);
  ctx.fillStyle = 'rgba(20,14,11,0.6)';
  ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(200,180,150,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  draw();
  ctx.restore();
}

function drawHUD() {
  const s = G.ship;
  const top = safe.t + 14;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  const sc = String(G.score).padStart(7, '0');
  ctx.fillText(sc, 17, top + 9);
  ctx.fillStyle = '#efe0c2';
  ctx.fillText(sc, 16, top + 8);
  // vidas
  for (let i = 0; i < G.lives; i++) ART.drawSprite(ctx, SPR.ship[4], 24 + i * 22, top + 34, 0.28);
  // integridad
  const bw = Math.min(150, VW * 0.38), bx = 16 + 70, by = top + 28;
  ctx.font = `9px ${FONT}`;
  ctx.fillStyle = '#b9a585';
  ctx.fillText('INTEGRIDAD', bx, by - 1);
  const integ = s ? s.integ / 100 : 0;
  for (let i = 0; i < 10; i++) {
    const on = integ > i / 10 + 0.001;
    const col = integ < 0.3 ? (Math.floor(G.t * 6) % 2 ? '#ff4d5e' : '#a8202e') : integ < 0.6 ? '#e0a03a' : '#b9c46e';
    ctx.fillStyle = on ? col : 'rgba(60,45,36,0.8)';
    ctx.fillRect(bx + i * (bw / 10), by + 7, bw / 10 - 2, 7);
  }
  // mejoras activas
  let px = bx;
  for (const [key, t, max] of [['impact', s?.impactT, 10], ['wide', s?.wideT, 12]]) {
    if (!t) continue;
    ctx.fillStyle = PICK_COL[key];
    ctx.fillRect(px, by + 18, (bw / 2 - 4) * (t / max), 3);
    px += bw / 2;
  }
  // combo
  if (G.combo >= 4) {
    const mult = Math.min(8, 1 + Math.floor(G.combo / 4));
    ctx.textAlign = 'right';
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = '#ffd27a';
    ctx.fillText(`x${mult}  CADENA ${G.combo}`, VW - 104, top + 14);
  }
  // botones
  drawButton(BTN.pause, () => {
    ctx.fillStyle = '#e6d6b8';
    ctx.fillRect(-6, -7, 4, 14); ctx.fillRect(2, -7, 4, 14);
  });
  drawButton(BTN.mute, () => {
    ctx.fillStyle = '#e6d6b8';
    ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-4, -3); ctx.lineTo(1, -8); ctx.lineTo(1, 8); ctx.lineTo(-4, 3); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e6d6b8'; ctx.lineWidth = 1.6;
    if (SFX.isMuted()) { ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(10, 4); ctx.moveTo(10, -4); ctx.lineTo(4, 4); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(2, 0, 6, -0.8, 0.8); ctx.stroke(); }
  });
  // botón de onda de choque
  const ch = s ? s.charges : 0;
  drawButton(BTN.shock, () => {
    const ready = ch > 0;
    if (ready) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
      g.addColorStop(0, `rgba(190,230,120,${0.25 + Math.sin(G.t * 4) * 0.08})`);
      g.addColorStop(1, 'rgba(190,230,120,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = ready ? '#bcd86a' : '#6a5a48';
    ctx.lineWidth = 2.5;
    for (const r of [10, 17, 24]) { ctx.beginPath(); ctx.arc(0, -2, r, -2.4, -0.74); ctx.stroke(); }
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = ready ? '#efe0c2' : '#7a6a58';
    ctx.fillText('ONDA', 0, 12);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < ch ? '#bcd86a' : 'rgba(80,65,50,0.9)';
      ctx.beginPath(); ctx.arc(-10 + i * 10, 25, 3.2, 0, TAU); ctx.fill();
    }
    if (s && ch < 3) {
      ctx.strokeStyle = 'rgba(188,216,106,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 38, -Math.PI / 2, -Math.PI / 2 + TAU * (s.chargeT / 14)); ctx.stroke();
    }
  }, 0.95);
}

function drawBanner() {
  const b = G.banner;
  if (!b) return;
  const a = Math.min(1, b.t * 4, (2.6 - b.t) * 3);
  ctx.globalAlpha = Math.max(0, a);
  const y = VH * 0.36;
  ctx.fillStyle = 'rgba(10,6,5,0.55)';
  ctx.fillRect(0, y - 30, VW, 60);
  ctx.fillStyle = 'rgba(200,120,60,0.6)';
  ctx.fillRect(0, y - 30, VW, 1.5); ctx.fillRect(0, y + 28.5, VW, 1.5);
  metalText(b.txt, VW / 2, y - (b.sub ? 6 : 0), 28);
  if (b.sub) {
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = '#c9b38e';
    ctx.fillText(b.sub.toUpperCase(), VW / 2, y + 17);
  }
  ctx.globalAlpha = 1;
}

const demoShip = { x: 0, y: 0, bank: 0, alive: true, inv: 0 };

function drawTitle() {
  ctx.fillStyle = 'rgba(8,5,4,0.45)';
  ctx.fillRect(0, 0, VW, VH);
  metalText('METALHIVE', VW / 2, VH * 0.2, Math.min(52, VW * 0.13));
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = '#c9b38e';
  ctx.textAlign = 'center';
  ctx.fillText('ARCADE CIBERORGÁNICO', VW / 2, VH * 0.2 + 34);
  demoShip.x = VW / 2;
  demoShip.y = VH * 0.47 + Math.sin(G.t * 1.6) * 6;
  demoShip.bank = Math.sin(G.t * 0.9) * 0.9;
  drawShip(demoShip, 1.9, false);
  const lines = matchMedia('(pointer: coarse)').matches
    ? ['ARRASTRÁ EN CUALQUIER LUGAR PARA MOVER', 'DISPARO AUTOMÁTICO', 'ONDA: EMPUJA Y HACE CHOCAR ENEMIGOS']
    : ['FLECHAS / WASD PARA MOVER (O ARRASTRAR)', 'ESPACIO = ONDA  ·  P = PAUSA  ·  M = SONIDO', 'HACÉ CHOCAR A LOS ENEMIGOS ENTRE SÍ'];
  ctx.font = `10px ${FONT}`;
  ctx.fillStyle = '#a8977a';
  lines.forEach((l, i) => ctx.fillText(l, VW / 2, VH * 0.7 + i * 18));
  if (Math.floor(G.t * 2) % 2 === 0) {
    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = '#ffd27a';
    ctx.fillText('TOCÁ PARA EMPEZAR', VW / 2, VH * 0.84);
  }
  if (G.best) {
    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = '#8a7a62';
    ctx.fillText('RÉCORD ' + G.best, VW / 2, VH - safe.b - 24);
  }
}

function drawOver() {
  ctx.fillStyle = `rgba(8,5,4,${Math.min(0.65, G.modeT)})`;
  ctx.fillRect(0, 0, VW, VH);
  metalText('NAVE PERDIDA', VW / 2, VH * 0.36, 34);
  ctx.textAlign = 'center';
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = '#efe0c2';
  ctx.fillText(String(G.score), VW / 2, VH * 0.45);
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = '#a8977a';
  ctx.fillText('RÉCORD ' + G.best + '  ·  SECTOR ' + (G.loop + 1), VW / 2, VH * 0.45 + 26);
  if (G.modeT > 1 && Math.floor(G.t * 2) % 2 === 0) {
    ctx.font = `15px ${FONT}`;
    ctx.fillStyle = '#ffd27a';
    ctx.fillText('TOCÁ PARA REINTENTAR', VW / 2, VH * 0.6);
  }
}

function render() {
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, 0, 0);
  ctx.fillStyle = '#0d0907';
  ctx.fillRect(0, 0, VW, VH);
  ctx.save();
  if (G.shake > 0.3) ctx.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake));
  drawBG();
  if (G.mode !== 'title') {
    for (const p of G.pickups) drawPickup(p);
    for (const e of G.enemies) if (e.type === 'beetle') drawEnemy(e);
    for (const e of G.enemies) if (e.type !== 'beetle') drawEnemy(e);
    drawBullets();
    if (G.ship) drawShip(G.ship);
    drawParts();
    drawEnemyBullets();
    drawTexts();
  }
  ctx.restore();
  if (G.mode === 'title') drawTitle();
  else {
    drawBanner();
    drawHUD();
    if (G.mode === 'paused') {
      ctx.fillStyle = 'rgba(8,5,4,0.6)';
      ctx.fillRect(0, 0, VW, VH);
      metalText('PAUSA', VW / 2, VH * 0.42, 40);
      ctx.font = `12px ${FONT}`;
      ctx.fillStyle = '#c9b38e';
      ctx.fillText('TOCÁ PARA SEGUIR', VW / 2, VH * 0.42 + 40);
    }
    if (G.mode === 'over') drawOver();
  }
}

// ============================================================ INPUT
function toL(e) {
  const r = cvs.getBoundingClientRect();
  return { x: (e.clientX - r.left) / SC, y: (e.clientY - r.top) / SC };
}
const inBtn = (b, p) => Math.hypot(p.x - b.x, p.y - b.y) < b.r + 8;

function togglePause() {
  if (G.mode === 'play') { G.mode = 'paused'; SFX.stopMusic(); }
  else if (G.mode === 'paused') { G.mode = 'play'; SFX.startMusic(); }
}
function toggleMute() { SFX.setMuted(!SFX.isMuted()); }

cvs.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  SFX.unlock();
  const p = toL(e);
  if (G.mode === 'title') { startGame(); return; }
  if (G.mode === 'over') { if (G.modeT > 1) startGame(); return; }
  if (inBtn(BTN.mute, p)) { toggleMute(); return; }
  if (inBtn(BTN.pause, p)) { togglePause(); return; }
  if (G.mode === 'paused') { togglePause(); return; }
  if (inBtn(BTN.shock, p)) { shockwave(); return; }
  if (touch.id === null) {
    touch.id = e.pointerId;
    touch.lx = p.x; touch.ly = p.y;
    try { cvs.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  }
});
cvs.addEventListener('pointermove', (e) => {
  if (e.pointerId !== touch.id || !G.ship) return;
  const p = toL(e);
  // movimiento relativo: el dedo nunca tapa la nave
  G.ship.tx += (p.x - touch.lx) * SENS;
  G.ship.ty += (p.y - touch.ly) * SENS;
  G.ship.tx = clamp(G.ship.tx, 22, VW - 22);
  G.ship.ty = clamp(G.ship.ty, safe.t + 90, VH - safe.b - 34);
  touch.lx = p.x; touch.ly = p.y;
});
const endTouch = (e) => { if (e.pointerId === touch.id) touch.id = null; };
cvs.addEventListener('pointerup', endTouch);
cvs.addEventListener('pointercancel', endTouch);

addEventListener('keydown', (e) => {
  SFX.unlock();
  keys.add(e.code);
  if (e.code === 'Space' || e.code === 'KeyX') {
    e.preventDefault();
    if (G.mode === 'title' || (G.mode === 'over' && G.modeT > 1)) startGame();
    else shockwave();
  }
  if (e.code === 'Enter' && (G.mode === 'title' || (G.mode === 'over' && G.modeT > 1))) startGame();
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyM') toggleMute();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); if (G.mode === 'play') togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') togglePause(); });
addEventListener('resize', resize);
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ============================================================ LOOP
resize();
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - lastT) / 1000);
  lastT = now;
  requestAnimationFrame(frame);
  update(dt);
  render();
}
requestAnimationFrame(frame);

// gancho para pruebas automatizadas
window.__MH = { G, startGame, shockwave, F };
