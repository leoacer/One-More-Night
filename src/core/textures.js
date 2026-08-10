// ══════════════════════════════════════════════════════════════════════
//  Procedural textures. Everything is drawn to a <canvas> at load time:
//  wallpaper, rotting plaster, parquet, tile, rust, paper, photographs.
//  No image files ship with the game.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { mulberry32 } from './util.js';

const cache = new Map();

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// ── value noise / fbm ───────────────────────────────────────────────────
function makeNoise(seed) {
  const rnd = mulberry32(seed);
  const P = new Uint8Array(512);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  const grad = (h, x, y) => {
    switch (h & 3) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y; }
  };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const noise2 = (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const A = P[X] + Y, B = P[X + 1] + Y;
    return lerp(
      lerp(grad(P[A], x, y), grad(P[B], x - 1, y), u),
      lerp(grad(P[A + 1], x, y - 1), grad(P[B + 1], x - 1, y - 1), u), v);
  };
  return {
    n: noise2,
    fbm(x, y, oct = 5, lac = 2.03, gain = 0.5) {
      let a = 0.5, f = 1, s = 0, norm = 0;
      for (let i = 0; i < oct; i++) { s += a * noise2(x * f, y * f); norm += a; a *= gain; f *= lac; }
      return s / norm;
    },
    // tileable fbm — samples on a torus so edges match
    tfbm(x, y, oct = 5, period = 4) {
      let a = 0.5, f = 1, s = 0, norm = 0;
      for (let i = 0; i < oct; i++) {
        const p = period * f;
        const xx = ((x * f) % p + p) % p, yy = ((y * f) % p + p) % p;
        s += a * noise2(xx, yy); norm += a; a *= 0.5; f *= 2;
      }
      return s / norm;
    },
  };
}

function px(ctx, size, fn) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      fn(x, y, i, d);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Derive a normal map from a canvas' luminance. */
function normalFromCanvas(src, strength = 2.0) {
  const size = src.width;
  const sctx = src.getContext('2d');
  const s = sctx.getImageData(0, 0, size, size).data;
  const out = makeCanvas(size);
  const octx = out.getContext('2d');
  const img = octx.createImageData(size, size);
  const d = img.data;
  const L = (x, y) => {
    x = (x + size) % size; y = (y + size) % size;
    const i = (y * size + x) * 4;
    return (s[i] * 0.299 + s[i + 1] * 0.587 + s[i + 2] * 0.114) / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (L(x + 1, y) - L(x - 1, y)) * strength;
      const dy = (L(x, y + 1) - L(x, y - 1)) * strength;
      let nx = -dx, ny = -dy, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * size + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

function toTexture(canvas, repeat = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// ── stain / grime helpers ───────────────────────────────────────────────
function waterStain(ctx, cx, cy, r, rnd, col = '80,70,50') {
  const layers = 4;
  for (let l = layers; l > 0; l--) {
    const rr = r * (l / layers);
    ctx.beginPath();
    const pts = 26;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const wob = 1 + (rnd() - 0.5) * 0.5 + Math.sin(a * 3 + l) * 0.12;
      const x = cx + Math.cos(a) * rr * wob;
      const y = cy + Math.sin(a) * rr * wob * 1.25;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(${col},${0.055 + l * 0.018})`;
    ctx.fill();
  }
}

function grime(ctx, size, rnd, amount = 1, col = '0,0,0') {
  for (let i = 0; i < 90 * amount; i++) {
    const x = rnd() * size, y = rnd() * size, r = rnd() * size * 0.16 + 4;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${0.03 + rnd() * 0.07})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function speckle(ctx, size, rnd, n, col, maxA = 0.3) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(${col},${rnd() * maxA})`;
    const s = rnd() * 2 + 0.4;
    ctx.fillRect(rnd() * size, rnd() * size, s, s);
  }
}

// ══════════════════ generators ══════════════════

/** Old floral / striped wallpaper, several eras of taste, all of them faded. */
function genWallpaper(variant, size = 512) {
  const rnd = mulberry32(1000 + variant * 77);
  const nz = makeNoise(2000 + variant);
  const c = makeCanvas(size), ctx = c.getContext('2d');

  const palettes = [
    ['#645b48', '#8a8168', '#3f3a2e'], // mustard-grey
    ['#565549', '#787866', '#3a3a32'], // olive
    ['#67544a', '#8d7566', '#443832'], // rose-brown
    ['#4f5a58', '#71807d', '#333c3b'], // sage
    ['#675d4f', '#8d8371', '#443f36'], // oat
  ];
  const pal = palettes[variant % palettes.length];
  ctx.fillStyle = pal[0];
  ctx.fillRect(0, 0, size, size);

  const style = variant % 3;
  if (style === 0) {
    // vertical stripes
    const w = size / 8;
    for (let i = 0; i < 8; i++) {
      if (i % 2 === 0) continue;
      ctx.fillStyle = pal[1];
      ctx.fillRect(i * w, 0, w * 0.62, size);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(i * w + w * 0.62, 0, 2, size);
    }
  } else if (style === 1) {
    // damask-ish repeating motif
    const cell = size / 4;
    for (let gy = 0; gy < 4; gy++) {
      for (let gx = 0; gx < 4; gx++) {
        const ox = gx * cell + cell / 2 + (gy % 2 ? cell / 2 : 0);
        const oy = gy * cell + cell / 2;
        ctx.save();
        ctx.translate(ox % size, oy);
        ctx.strokeStyle = pal[1];
        ctx.lineWidth = 2.2;
        ctx.globalAlpha = 0.75;
        for (let p = 0; p < 6; p++) {
          ctx.beginPath();
          const a = (p / 6) * Math.PI * 2;
          ctx.ellipse(Math.cos(a) * cell * 0.17, Math.sin(a) * cell * 0.17,
            cell * 0.15, cell * 0.07, a, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, cell * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = pal[1]; ctx.fill();
        ctx.restore();
      }
    }
  } else {
    // small repeating floral sprigs
    const cell = size / 6;
    for (let gy = 0; gy < 6; gy++) {
      for (let gx = 0; gx < 6; gx++) {
        ctx.save();
        ctx.translate(gx * cell + cell / 2, gy * cell + cell / 2);
        ctx.rotate((gx + gy) * 0.7);
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = pal[1]; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, cell * 0.2); ctx.lineTo(0, -cell * 0.2); ctx.stroke();
        for (let p = 0; p < 4; p++) {
          ctx.beginPath();
          ctx.ellipse(0, -cell * 0.12 + p * cell * 0.09, cell * 0.09, cell * 0.035, p * 0.9, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  // sun bleaching + fibre grain
  ctx.globalAlpha = 1;
  px(ctx, size, (x, y, i, d) => {
    const n = nz.tfbm(x / 64, y / 64, 4, 8) * 0.5 + 0.5;
    const fib = nz.n(x / 7.0, y / 60) * 0.03;
    const m = 0.9 + n * 0.2 + fib;
    d[i] *= m; d[i + 1] *= m; d[i + 2] *= m;
  });

  grime(ctx, size, rnd, 1.1, '40,32,20');
  for (let i = 0; i < 3; i++) waterStain(ctx, rnd() * size, rnd() * size * 0.5, 40 + rnd() * 70, rnd);

  // peeling seam
  if (variant % 2 === 0) {
    const x = rnd() * size;
    ctx.fillStyle = 'rgba(30,26,22,0.5)';
    ctx.fillRect(x, 0, 2.5, size);
    ctx.fillStyle = 'rgba(150,142,126,0.22)';
    ctx.beginPath();
    ctx.moveTo(x, size * 0.55);
    ctx.quadraticCurveTo(x + 26, size * 0.7, x + 8, size);
    ctx.lineTo(x - 14, size); ctx.closePath(); ctx.fill();
  }
  speckle(ctx, size, rnd, 900, '20,16,12', 0.22);
  return c;
}

/** Bare plaster / concrete, cracked. */
function genPlaster(seed = 1, size = 512, tint = [104, 104, 100]) {
  const rnd = mulberry32(seed);
  const nz = makeNoise(seed * 13);
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = nz.tfbm(x / 40, y / 40, 6, 12.8) * 0.5 + 0.5;
      const fine = nz.tfbm(x / 5, y / 5, 3, 102.4) * 0.5 + 0.5;
      const v = 0.68 + n * 0.42 + fine * 0.14;
      d[i] = tint[0] * v; d[i + 1] = tint[1] * v; d[i + 2] = tint[2] * v; d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // cracks
  ctx.strokeStyle = 'rgba(28,26,24,0.55)';
  for (let k = 0; k < 5; k++) {
    ctx.lineWidth = 0.6 + rnd() * 1.4;
    let x = rnd() * size, y = rnd() * size, a = rnd() * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 40; s++) {
      a += (rnd() - 0.5) * 0.9;
      x += Math.cos(a) * 6; y += Math.sin(a) * 6;
      ctx.lineTo(x, y);
      if (rnd() < 0.12) { ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); }
    }
    ctx.stroke();
  }
  grime(ctx, size, rnd, 1.4, '30,28,22');
  for (let i = 0; i < 2; i++) waterStain(ctx, rnd() * size, rnd() * size, 50 + rnd() * 90, rnd, '70,64,44');
  speckle(ctx, size, rnd, 1400, '0,0,0', 0.18);
  return c;
}

/** Parquet / plank flooring, scuffed. */
function genWoodFloor(seed = 3, size = 512, plankColor = [92, 68, 46]) {
  const rnd = mulberry32(seed);
  const nz = makeNoise(seed * 31);
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const rows = 8, plankH = size / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd() * size * 0.4;
    while (x < size) {
      const w = size * (0.28 + rnd() * 0.34);
      const shade = 0.78 + rnd() * 0.42;
      ctx.fillStyle = `rgb(${plankColor[0] * shade | 0},${plankColor[1] * shade | 0},${plankColor[2] * shade | 0})`;
      ctx.fillRect(x, r * plankH, w - 1.5, plankH - 1.5);
      // grain
      ctx.save();
      ctx.beginPath(); ctx.rect(x, r * plankH, w - 1.5, plankH - 1.5); ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.13)';
      for (let g = 0; g < 9; g++) {
        ctx.lineWidth = 0.5 + rnd();
        ctx.beginPath();
        const gy = r * plankH + rnd() * plankH;
        ctx.moveTo(x, gy);
        for (let s = 0; s < 10; s++) ctx.lineTo(x + (w / 10) * s, gy + Math.sin(s * 0.9 + r) * 2.2 + (rnd() - 0.5) * 1.6);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fillRect(x + w - 1.6, r * plankH, 1.6, plankH);
      x += w;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, (r + 1) * plankH - 1.6, size, 1.6);
  }
  px(ctx, size, (x, y, i, d) => {
    const n = nz.tfbm(x / 70, y / 70, 4, 7.3) * 0.5 + 0.5;
    const m = 0.8 + n * 0.36;
    d[i] *= m; d[i + 1] *= m; d[i + 2] *= m;
  });
  grime(ctx, size, rnd, 1.6, '20,14,8');
  speckle(ctx, size, rnd, 1200, '10,8,6', 0.25);
  return c;
}

/** Chequered hall tile, half of it cracked. */
function genTile(seed = 5, size = 512, a = '#4c4f4b', b = '#33352f') {
  const rnd = mulberry32(seed);
  const nz = makeNoise(seed * 7);
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const n = 8, cell = size / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      ctx.fillStyle = (x + y) % 2 ? a : b;
      ctx.fillRect(x * cell, y * cell, cell, cell);
      ctx.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.1})`;
      ctx.fillRect(x * cell, y * cell, cell, cell);
      // grout
      ctx.strokeStyle = 'rgba(24,22,20,0.85)';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      if (rnd() < 0.16) {  // a cracked tile
        ctx.strokeStyle = 'rgba(15,14,13,0.7)'; ctx.lineWidth = 1;
        ctx.beginPath();
        let px2 = x * cell + rnd() * cell, py = y * cell;
        ctx.moveTo(px2, py);
        for (let s = 0; s < 6; s++) { px2 += (rnd() - 0.5) * cell * 0.4; py += cell / 6; ctx.lineTo(px2, py); }
        ctx.stroke();
      }
    }
  }
  px(ctx, size, (x, y, i, d) => {
    const v = 0.82 + (nz.tfbm(x / 50, y / 50, 4, 10.2) * 0.5 + 0.5) * 0.34;
    d[i] *= v; d[i + 1] *= v; d[i + 2] *= v;
  });
  grime(ctx, size, rnd, 2.0, '18,16,12');
  speckle(ctx, size, rnd, 1500, '0,0,0', 0.22);
  return c;
}

/** Worn hallway carpet with a runner pattern. */
function genCarpet(seed = 9, size = 512) {
  const rnd = mulberry32(seed);
  const nz = makeNoise(seed * 3);
  const c = makeCanvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#4a3630';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(120,90,70,0.32)';
  ctx.lineWidth = size * 0.03;
  ctx.strokeRect(size * 0.1, size * 0.1, size * 0.8, size * 0.8);
  ctx.strokeStyle = 'rgba(90,66,52,0.4)';
  ctx.lineWidth = size * 0.012;
  ctx.strokeRect(size * 0.17, size * 0.17, size * 0.66, size * 0.66);
  px(ctx, size, (x, y, i, d) => {
    const fuzz = nz.n(x / 1.1, y / 1.1) * 0.22 + nz.tfbm(x / 40, y / 40, 4, 12.8) * 0.3;
    const m = 0.85 + fuzz;
    d[i] *= m; d[i + 1] *= m; d[i + 2] *= m;
  });
  grime(ctx, size, rnd, 2.4, '16,10,6');
  return c;
}

/** Painted metal / rust for pipes, boxes, elevator. */
function genMetal(seed = 11, size = 256, base = [78, 82, 84], rust = 1) {
  const rnd = mulberry32(seed);
  const nz = makeNoise(seed * 17);
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const v = 0.75 + (nz.tfbm(x / 24, y / 24, 4, 10.7) * 0.5 + 0.5) * 0.45;
    d[i] = base[0] * v; d[i + 1] = base[1] * v; d[i + 2] = base[2] * v; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // rust blooms
  for (let k = 0; k < 16 * rust; k++) {
    const x = rnd() * size, y = rnd() * size, r = 4 + rnd() * size * 0.14;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const hue = 18 + rnd() * 14;
    g.addColorStop(0, `hsla(${hue},58%,${26 + rnd() * 14}%,${0.35 + rnd() * 0.4})`);
    g.addColorStop(0.6, `hsla(${hue},45%,22%,0.18)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // scratches
  ctx.strokeStyle = 'rgba(200,200,200,0.09)';
  for (let k = 0; k < 26; k++) {
    ctx.lineWidth = rnd() * 1.2;
    ctx.beginPath();
    const x = rnd() * size, y = rnd() * size, a = rnd() * Math.PI;
    const l = 8 + rnd() * 50;
    ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  speckle(ctx, size, rnd, 700, '0,0,0', 0.2);
  return c;
}

/** Painted apartment door, panelled. */
function genDoor(seed = 21, size = 512, color = [96, 74, 58]) {
  const rnd = mulberry32(seed);
  const nz = makeNoise(seed * 5);
  const c = makeCanvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
  ctx.fillRect(0, 0, size, size);
  // two recessed panels
  const panel = (x, y, w, h) => {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = `rgba(${color[0] + 24},${color[1] + 20},${color[2] + 16},1)`;
    ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 2;
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
  };
  panel(size * 0.14, size * 0.08, size * 0.72, size * 0.34);
  panel(size * 0.14, size * 0.52, size * 0.72, size * 0.4);
  px(ctx, size, (x, y, i, d) => {
    const g = nz.n(x / 2.4, y / 140) * 0.06 + nz.tfbm(x / 60, y / 60, 4, 8.5) * 0.16;
    const m = 0.86 + g + 0.1;
    d[i] *= m; d[i + 1] *= m; d[i + 2] *= m;
  });
  grime(ctx, size, rnd, 0.8, '22,16,10');
  // scuff at the bottom where shoes hit it
  const g = ctx.createLinearGradient(0, size * 0.82, 0, size);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = g; ctx.fillRect(0, size * 0.82, size, size * 0.18);
  speckle(ctx, size, rnd, 600, '0,0,0', 0.2);
  return c;
}

/** Brick, for the outside walls seen through windows and the basement. */
function genBrick(seed = 31, size = 512) {
  const rnd = mulberry32(seed);
  const c = makeCanvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#2a2724'; ctx.fillRect(0, 0, size, size);
  const rows = 10, bh = size / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (size / 8);
    for (let b = -1; b < 8; b++) {
      const x = b * (size / 4) + off, w = size / 4 - 4;
      const v = 0.7 + rnd() * 0.6;
      ctx.fillStyle = `rgb(${(88 * v) | 0},${(62 * v) | 0},${(52 * v) | 0})`;
      ctx.fillRect(x, r * bh + 2, w, bh - 4);
      ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.22})`;
      ctx.fillRect(x, r * bh + 2, w, bh - 4);
    }
  }
  grime(ctx, size, rnd, 2.2, '10,8,6');
  speckle(ctx, size, rnd, 2000, '0,0,0', 0.3);
  return c;
}

/** Ceiling: yellowed plaster with a damp bloom. */
function genCeiling(seed = 41, size = 512) {
  const rnd = mulberry32(seed);
  const c = genPlaster(seed, size, [112, 108, 96]);
  const ctx = c.getContext('2d');
  for (let i = 0; i < 3; i++) {
    waterStain(ctx, rnd() * size, rnd() * size, 60 + rnd() * 110, rnd, '96,80,44');
  }
  return c;
}

/** Newspaper page as a texture (used on props and in the reader). */
function genNewspaper(size = 512, headline = 'BLACKOUT') {
  const rnd = mulberry32(headline.length * 991 + 7);
  const c = makeCanvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#c9c2ac'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(120,100,60,0.14)';
  for (let i = 0; i < 40; i++) {
    const x = rnd() * size, y = rnd() * size, r = rnd() * 40 + 10;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(140,116,66,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.fillStyle = '#1d1b17';
  ctx.font = `bold ${size * 0.085}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(headline, size / 2, size * 0.13);
  ctx.fillRect(size * 0.08, size * 0.155, size * 0.84, 2);
  // body columns of illegible type
  const colW = (size * 0.84) / 3;
  for (let col = 0; col < 3; col++) {
    const x0 = size * 0.08 + col * colW;
    for (let line = 0; line < 30; line++) {
      const y = size * 0.2 + line * (size * 0.026);
      if (y > size * 0.95) break;
      ctx.fillStyle = `rgba(29,27,23,${0.5 + rnd() * 0.35})`;
      ctx.fillRect(x0, y, colW * (0.62 + rnd() * 0.3) - 6, 1.7);
    }
    if (col === 1) { // a photo block
      ctx.fillStyle = '#5a564c';
      ctx.fillRect(x0, size * 0.44, colW - 8, size * 0.16);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      for (let i = 0; i < 60; i++) ctx.fillRect(x0 + rnd() * colW, size * 0.44 + rnd() * size * 0.16, 3, 3);
    }
  }
  return c;
}

/** A photograph: two silhouettes, sepia, one of them familiar. */
function genPhoto(size = 256, kind = 'two') {
  const rnd = mulberry32(kind.length * 337 + 11);
  const c = makeCanvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#c3b498'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#6a6455'; ctx.fillRect(size * 0.06, size * 0.06, size * 0.88, size * 0.78);
  // interior gradient — a lit room
  const g = ctx.createLinearGradient(0, size * 0.06, 0, size * 0.84);
  g.addColorStop(0, '#8b7f66'); g.addColorStop(1, '#3a3529');
  ctx.fillStyle = g; ctx.fillRect(size * 0.06, size * 0.06, size * 0.88, size * 0.78);

  const figure = (cx, scale, tone) => {
    ctx.fillStyle = tone;
    ctx.beginPath(); ctx.arc(cx, size * 0.36, size * 0.062 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.075 * scale, size * 0.82);
    ctx.lineTo(cx - size * 0.055 * scale, size * 0.44);
    ctx.quadraticCurveTo(cx, size * 0.38, cx + size * 0.055 * scale, size * 0.44);
    ctx.lineTo(cx + size * 0.075 * scale, size * 0.82);
    ctx.closePath(); ctx.fill();
  };
  if (kind === 'two') { figure(size * 0.36, 1, '#2c2820'); figure(size * 0.63, 1.02, '#332e24'); }
  else if (kind === 'one') { figure(size * 0.5, 1, '#2c2820'); }
  else if (kind === 'three') { figure(size * 0.3, 0.9, '#2c2820'); figure(size * 0.5, 1, '#312c22'); figure(size * 0.7, 0.86, '#2a2620'); }
  else if (kind === 'building') {
    ctx.fillStyle = '#241f19';
    ctx.fillRect(size * 0.2, size * 0.16, size * 0.6, size * 0.68);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) {
      ctx.fillStyle = rnd() < 0.35 ? '#c8b070' : '#151310';
      ctx.fillRect(size * (0.24 + x * 0.14), size * (0.22 + y * 0.12), size * 0.08, size * 0.07);
    }
  } else if (kind === 'empty') {
    // the same room, no one in it
    ctx.fillStyle = '#2f2b22';
    ctx.fillRect(size * 0.2, size * 0.6, size * 0.6, size * 0.06);
  }

  // grain, scratches, sepia bloom
  px(ctx, size, (x, y, i, d) => {
    const n = (Math.random() - 0.5) * 26;
    d[i] = Math.min(255, d[i] + n + 12); d[i + 1] = Math.min(255, d[i + 1] + n + 2); d[i + 2] = Math.min(255, d[i + 2] + n - 10);
  });
  ctx.strokeStyle = 'rgba(255,250,230,0.16)';
  for (let i = 0; i < 6; i++) {
    ctx.lineWidth = rnd() * 1.2;
    ctx.beginPath();
    const x = rnd() * size;
    ctx.moveTo(x, 0); ctx.lineTo(x + (rnd() - 0.5) * 30, size);
    ctx.stroke();
  }
  return c;
}

/** Graffiti / scratched words, drawn with transparency so it decals onto walls. */
function genGraffiti(text, size = 256, color = '#2a2622') {
  const c = makeCanvas(size), ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate((Math.random() - 0.5) * 0.16);
  ctx.font = `bold ${Math.min(size * 0.2, (size * 1.5) / Math.max(4, text.length))}px "Segoe Script", cursive, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.fillText(text, 0, 0);
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.strokeText(text, 1.5, 1.5);
  ctx.restore();
  // erode it a bit
  px(ctx, size, (x, y, i, d) => { if (Math.random() < 0.3) d[i + 3] *= 0.55; });
  return c;
}

/** Enamel apartment number plate. */
function genNumberPlate(num, size = 128) {
  const c = makeCanvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#20242a'; ctx.fillRect(0, 0, size, size);
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#3a4048'); g.addColorStop(1, '#1a1e23');
  ctx.fillStyle = g; ctx.fillRect(3, 3, size - 6, size - 6);
  ctx.fillStyle = '#cfd6dd';
  ctx.font = `600 ${size * 0.5}px Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(num), size / 2, size / 2 + 2);
  // chipped enamel
  const rnd = mulberry32(String(num).charCodeAt(0) * 13 + size);
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = `rgba(70,60,50,${0.2 + rnd() * 0.4})`;
    ctx.beginPath();
    ctx.arc(rnd() * size, rnd() * size, rnd() * 4, 0, Math.PI * 2); ctx.fill();
  }
  return c;
}

/** A dark, rain-streaked window pane seen from inside. */
function genGrimeAlpha(seed = 61, size = 256) {
  const rnd = mulberry32(seed);
  const nz = makeNoise(seed * 3);
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const n = nz.tfbm(x / 30, y / 30, 5, 8.5) * 0.5 + 0.5;
    const streak = Math.max(0, nz.n(x / 3, y / 220)) * 0.5;
    d[i] = d[i + 1] = d[i + 2] = 190;
    d[i + 3] = Math.min(255, (n * 0.6 + streak) * 200);
  }
  ctx.putImageData(img, 0, 0);
  speckle(ctx, size, rnd, 400, '160,160,150', 0.5);
  return c;
}

/** Child's crayon drawing — used both as a prop texture and in the reader. */
function genDrawing(kind, size = 256) {
  const c = makeCanvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#cfc8b4'; ctx.fillRect(0, 0, size, size);
  const crayon = (color, w) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; };
  const wob = (x, y) => [x + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 3];

  if (kind === 'building') {
    crayon('#4a4038', 4);
    ctx.strokeRect(size * 0.24, size * 0.2, size * 0.52, size * 0.68);
    for (let r = 0; r < 4; r++) for (let cc = 0; cc < 3; cc++) {
      ctx.strokeRect(size * (0.3 + cc * 0.15), size * (0.26 + r * 0.15), size * 0.09, size * 0.09);
    }
    crayon('#8a3030', 5);
    ctx.beginPath(); ctx.arc(size * 0.44, size * 0.41, size * 0.032, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#3a3128';
    ctx.font = `${size * 0.06}px "Segoe Script", cursive`;
    ctx.fillText('the man that is', size * 0.12, size * 0.95);
    ctx.fillText('two people', size * 0.12, size * 0.99);
  } else if (kind === 'door') {
    crayon('#3b3a44', 5);
    ctx.strokeRect(size * 0.34, size * 0.24, size * 0.32, size * 0.6);
    crayon('#2a2a30', 8);
    ctx.beginPath(); ctx.moveTo(size * 0.34, size * 0.24); ctx.lineTo(size * 0.66, size * 0.84); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size * 0.66, size * 0.24); ctx.lineTo(size * 0.34, size * 0.84); ctx.stroke();
    ctx.fillStyle = '#3a3128';
    ctx.font = `${size * 0.058}px "Segoe Script", cursive`;
    ctx.fillText("dont knock. it knocks back", size * 0.06, size * 0.95);
  } else if (kind === 'figures') {
    const stick = (x, col) => {
      crayon(col, 4);
      ctx.beginPath(); ctx.arc(x, size * 0.34, size * 0.06, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, size * 0.4); ctx.lineTo(x, size * 0.62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - size * 0.08, size * 0.48); ctx.lineTo(x + size * 0.08, size * 0.48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, size * 0.62); ctx.lineTo(x - size * 0.06, size * 0.78); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, size * 0.62); ctx.lineTo(x + size * 0.06, size * 0.78); ctx.stroke();
    };
    stick(size * 0.24, '#4a4038'); stick(size * 0.42, '#4a4038'); stick(size * 0.6, '#4a4038');
    stick(size * 0.78, '#8a3030');
    ctx.fillStyle = '#3a3128';
    ctx.font = `${size * 0.056}px "Segoe Script", cursive`;
    ctx.fillText('everyone who lives here', size * 0.05, size * 0.93);
    ctx.fillText('the red one is you', size * 0.05, size * 0.985);
  } else if (kind === 'stairs') {
    crayon('#4a4038', 4);
    ctx.beginPath();
    let x = size * 0.16, y = size * 0.8;
    ctx.moveTo(x, y);
    for (let i = 0; i < 7; i++) { [x, y] = [x + size * 0.09, y]; ctx.lineTo(x, y); y -= size * 0.08; ctx.lineTo(x, y); }
    ctx.stroke();
    crayon('#2a2a30', 3);
    ctx.beginPath(); ctx.arc(size * 0.78, size * 0.2, size * 0.05, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#3a3128';
    ctx.font = `${size * 0.055}px "Segoe Script", cursive`;
    ctx.fillText('the stairs go up too many times', size * 0.04, size * 0.95);
  }
  // paper fibre + folds
  px(ctx, size, (x, y, i, d) => {
    const n = (Math.random() - 0.5) * 16;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  });
  return c;
}

// ══════════════════ public library ══════════════════

export const TX = {
  /** Get (and cache) a canvas by key. */
  canvas(key) {
    if (cache.has(key)) return cache.get(key);
    let c;
    const [kind, arg] = key.split(':');
    switch (kind) {
      case 'wallpaper': c = genWallpaper(parseInt(arg || '0', 10)); break;
      case 'plaster': c = genPlaster(parseInt(arg || '1', 10)); break;
      case 'plasterDark': c = genPlaster(parseInt(arg || '1', 10), 512, [66, 66, 64]); break;
      case 'wood': c = genWoodFloor(parseInt(arg || '3', 10)); break;
      case 'woodDark': c = genWoodFloor(parseInt(arg || '4', 10), 512, [60, 44, 32]); break;
      case 'tile': c = genTile(parseInt(arg || '5', 10)); break;
      case 'tileWhite': c = genTile(parseInt(arg || '6', 10), 512, '#6d6f68', '#565851'); break;
      case 'carpet': c = genCarpet(parseInt(arg || '9', 10)); break;
      case 'metal': c = genMetal(parseInt(arg || '11', 10)); break;
      case 'metalDark': c = genMetal(parseInt(arg || '12', 10), 256, [48, 50, 52], 1.6); break;
      case 'brass': c = genMetal(parseInt(arg || '13', 10), 256, [120, 100, 60], 0.5); break;
      case 'door': c = genDoor(parseInt(arg || '21', 10)); break;
      case 'doorGreen': c = genDoor(parseInt(arg || '22', 10), 512, [62, 76, 66]); break;
      case 'doorBlue': c = genDoor(parseInt(arg || '23', 10), 512, [58, 68, 84]); break;
      case 'doorRed': c = genDoor(parseInt(arg || '24', 10), 512, [92, 56, 50]); break;
      case 'doorBlack': c = genDoor(parseInt(arg || '25', 10), 512, [26, 26, 28]); break;
      case 'brick': c = genBrick(parseInt(arg || '31', 10)); break;
      case 'ceiling': c = genCeiling(parseInt(arg || '41', 10)); break;
      case 'news': c = genNewspaper(512, arg || 'BLACKOUT'); break;
      case 'photo': c = genPhoto(256, arg || 'two'); break;
      case 'graffiti': c = genGraffiti(arg || '...', 256); break;
      case 'plate': c = genNumberPlate(arg || '000'); break;
      case 'grime': c = genGrimeAlpha(parseInt(arg || '61', 10)); break;
      case 'drawing': c = genDrawing(arg || 'building'); break;
      default: c = genPlaster(1);
    }
    cache.set(key, c);
    return c;
  },

  /** Get (and cache) a THREE texture. */
  get(key, repeat = [1, 1]) {
    const ck = `tex:${key}:${repeat[0]}:${repeat[1]}`;
    if (cache.has(ck)) return cache.get(ck);
    const t = toTexture(this.canvas(key), repeat);
    cache.set(ck, t);
    return t;
  },

  /** Normal map derived from a colour texture. */
  normal(key, repeat = [1, 1], strength = 2) {
    const ck = `nrm:${key}:${repeat[0]}:${repeat[1]}:${strength}`;
    if (cache.has(ck)) return cache.get(ck);
    const n = normalFromCanvas(this.canvas(key), strength);
    const t = toTexture(n, repeat, false);
    cache.set(ck, t);
    return t;
  },

  dataURL(key) { return this.canvas(key).toDataURL('image/png'); },

  clear() { cache.clear(); },
};
