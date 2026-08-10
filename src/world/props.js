// ══════════════════════════════════════════════════════════════════════
//  Furniture, clutter and story objects. Everything is assembled from
//  primitives so the whole building fits in a few hundred kilobytes.
//
//  Convention: a prop is a THREE.Group whose origin sits on the floor at
//  its centre. userData.solid marks it as a collider.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { MAT } from './materials.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 14);
const CYL_HI = new THREE.CylinderGeometry(1, 1, 1, 22);
const SPH = new THREE.SphereGeometry(1, 14, 10);
const PLANE = new THREE.PlaneGeometry(1, 1);

/** Reused by nearly every mesh in the game — never dispose these. */
export const SHARED_GEOMETRY = new Set([BOX, CYL, CYL_HI, SPH, PLANE]);

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(BOX, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function cyl(r, h, mat, x = 0, y = 0, z = 0, hi = false) {
  const m = new THREE.Mesh(hi ? CYL_HI : CYL, mat);
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function sphere(r, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(SPH, mat);
  m.scale.setScalar(r);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function plane(w, h, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(PLANE, mat);
  m.scale.set(w, h, 1);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}
function group(solid = true, tag = '') {
  const g = new THREE.Group();
  g.userData.solid = solid;
  g.userData.tag = tag;
  return g;
}

const WOOD = () => MAT.flat(0x4b3a2c, 0.82, 0.02);
const WOOD_D = () => MAT.flat(0x33271e, 0.86, 0.02);
const WOOD_L = () => MAT.flat(0x6b563f, 0.8, 0.02);
const METAL = () => MAT.metal();
const METAL_D = () => MAT.metal(true);
const WHITE = () => MAT.flat(0x74797a, 0.62, 0.05);
const FAB = (c) => MAT.fabric(c);

// ══════════════════ seating / sleeping ══════════════════

export function bed(w = 1.4, l = 2.0, made = true) {
  const g = group(true, 'bed');
  const fm = WOOD();
  g.add(box(w, 0.26, l, fm, 0, 0.28, 0));
  g.add(box(w + 0.08, 0.62, 0.1, fm, 0, 0.46, -l / 2));
  g.add(box(w + 0.08, 0.34, 0.1, fm, 0, 0.32, l / 2));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    g.add(box(0.09, 0.3, 0.09, WOOD_D(), x * (w / 2 - 0.06), 0.15, z * (l / 2 - 0.06)));
  const mat = box(w - 0.06, 0.2, l - 0.1, FAB(made ? 0x5a5a52 : 0x6a655a), 0, 0.51, 0);
  g.add(mat);
  if (made) {
    g.add(box(w - 0.02, 0.09, l * 0.62, FAB(0x4a4038), 0, 0.62, l * 0.15));
    g.add(box(w * 0.6, 0.13, 0.4, FAB(0x7a7468), 0, 0.64, -l / 2 + 0.36));
  } else {
    const blanket = box(w * 0.85, 0.16, l * 0.5, FAB(0x453c34), w * 0.08, 0.63, l * 0.1);
    blanket.rotation.y = 0.14;
    g.add(blanket);
  }
  return g;
}

export function sofa(w = 1.9) {
  const g = group(true, 'sofa');
  const c = FAB(0x4a4238);
  g.add(box(w, 0.36, 0.85, c, 0, 0.24, 0));
  g.add(box(w, 0.66, 0.2, c, 0, 0.53, -0.34));
  g.add(box(0.2, 0.5, 0.85, c, -w / 2 + 0.1, 0.42, 0));
  g.add(box(0.2, 0.5, 0.85, c, w / 2 - 0.1, 0.42, 0));
  for (let i = 0; i < 2; i++)
    g.add(box(w / 2.4, 0.12, 0.7, FAB(0x554b40), (i - 0.5) * w * 0.42, 0.46, 0.02));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    g.add(box(0.07, 0.12, 0.07, WOOD_D(), x * (w / 2 - 0.12), 0.06, z * 0.34));
  return g;
}

export function armchair() {
  const g = group(true, 'chair');
  const c = FAB(0x4d4034);
  g.add(box(0.72, 0.34, 0.72, c, 0, 0.26, 0));
  g.add(box(0.72, 0.62, 0.18, c, 0, 0.52, -0.28));
  g.add(box(0.16, 0.44, 0.72, c, -0.29, 0.4, 0));
  g.add(box(0.16, 0.44, 0.72, c, 0.29, 0.4, 0));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    g.add(box(0.07, 0.1, 0.07, WOOD_D(), x * 0.29, 0.05, z * 0.29));
  return g;
}

export function chair(tipped = false) {
  const g = group(true, 'chair');
  const m = WOOD();
  g.add(box(0.44, 0.05, 0.44, m, 0, 0.45, 0));
  g.add(box(0.42, 0.5, 0.05, m, 0, 0.72, -0.19));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    g.add(box(0.05, 0.45, 0.05, m, x * 0.18, 0.225, z * 0.18));
  if (tipped) { g.rotation.z = Math.PI / 2 - 0.12; g.position.y = 0.22; }
  return g;
}

export function stool() {
  const g = group(true, 'stool');
  g.add(cyl(0.18, 0.05, WOOD(), 0, 0.52, 0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.add(cyl(0.022, 0.52, WOOD_D(), Math.cos(a) * 0.13, 0.26, Math.sin(a) * 0.13));
  }
  return g;
}

// ══════════════════ surfaces / storage ══════════════════

export function table(w = 1.2, d = 0.8, h = 0.75) {
  const g = group(true, 'table');
  const m = WOOD();
  g.add(box(w, 0.06, d, m, 0, h, 0));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    g.add(box(0.07, h, 0.07, WOOD_D(), x * (w / 2 - 0.09), h / 2, z * (d / 2 - 0.09)));
  g.userData.surfaceY = h + 0.03;
  return g;
}

export function desk(w = 1.3) {
  const g = group(true, 'desk');
  const m = WOOD();
  g.add(box(w, 0.05, 0.62, m, 0, 0.76, 0));
  g.add(box(0.42, 0.62, 0.58, WOOD_D(), w / 2 - 0.25, 0.42, 0));
  for (let i = 0; i < 3; i++) {
    g.add(box(0.38, 0.03, 0.03, MAT.brass(), w / 2 - 0.25, 0.24 + i * 0.19, 0.3));
  }
  g.add(box(0.06, 0.72, 0.06, WOOD_D(), -w / 2 + 0.06, 0.38, -0.24));
  g.add(box(0.06, 0.72, 0.06, WOOD_D(), -w / 2 + 0.06, 0.38, 0.24));
  g.userData.surfaceY = 0.79;
  return g;
}

export function shelf(w = 0.9, h = 1.9, books = true, seed = 0) {
  const g = group(true, 'shelf');
  const m = WOOD_D();
  g.add(box(0.04, h, 0.3, m, -w / 2, h / 2, 0));
  g.add(box(0.04, h, 0.3, m, w / 2, h / 2, 0));
  g.add(box(w, 0.03, 0.02, m, 0, h - 0.01, -0.14));
  const rows = 4;
  for (let i = 0; i <= rows; i++) {
    const y = 0.06 + (i / rows) * (h - 0.12);
    g.add(box(w, 0.03, 0.3, m, 0, y, 0));
    if (!books || i === rows) continue;
    let x = -w / 2 + 0.05;
    let s = seed * 13 + i * 7;
    while (x < w / 2 - 0.08) {
      const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      const bw = 0.022 + rnd() * 0.04;
      const bh = 0.16 + rnd() * 0.1;
      if (rnd() < 0.16) { x += bw * 3; continue; }   // gaps: books have been taken
      const hue = 0.05 + rnd() * 0.12;
      const col = new THREE.Color().setHSL(hue, 0.18 + rnd() * 0.2, 0.16 + rnd() * 0.16);
      const b = box(bw, bh, 0.2, MAT.flat(col.getHex(), 0.9, 0), x + bw / 2, y + 0.015 + bh / 2, 0.02);
      if (rnd() < 0.1) b.rotation.z = 0.28;
      g.add(b);
      x += bw + 0.004;
    }
  }
  return g;
}

export function wardrobe(w = 1.0, h = 2.0) {
  const g = group(true, 'wardrobe');
  const m = WOOD();
  g.add(box(w, h, 0.56, m, 0, h / 2, 0));
  g.add(box(w * 0.47, h * 0.9, 0.03, WOOD_L(), -w * 0.24, h / 2, 0.29));
  g.add(box(w * 0.47, h * 0.9, 0.03, WOOD_L(), w * 0.24, h / 2, 0.29));
  g.add(cyl(0.016, 0.1, MAT.brass(), -0.03, h * 0.5, 0.32));
  g.add(cyl(0.016, 0.1, MAT.brass(), 0.03, h * 0.5, 0.32));
  return g;
}

export function dresser(w = 1.0) {
  const g = group(true, 'dresser');
  const m = WOOD();
  g.add(box(w, 0.85, 0.48, m, 0, 0.43, 0));
  for (let i = 0; i < 3; i++) {
    g.add(box(w - 0.08, 0.22, 0.02, WOOD_L(), 0, 0.16 + i * 0.26, 0.25));
    g.add(box(0.14, 0.02, 0.02, MAT.brass(), 0, 0.16 + i * 0.26, 0.27));
  }
  g.userData.surfaceY = 0.88;
  return g;
}

export function cabinet(w = 0.8, h = 0.9) {
  const g = group(true, 'cabinet');
  g.add(box(w, h, 0.42, WOOD_D(), 0, h / 2, 0));
  g.add(box(w * 0.45, h * 0.85, 0.02, WOOD(), -w * 0.23, h / 2, 0.22));
  g.add(box(w * 0.45, h * 0.85, 0.02, WOOD(), w * 0.23, h / 2, 0.22));
  g.userData.surfaceY = h + 0.03;
  return g;
}

export function counter(w = 1.8) {
  const g = group(true, 'counter');
  g.add(box(w, 0.88, 0.62, MAT.flat(0x4a4a46, 0.8, 0.02), 0, 0.44, 0));
  g.add(box(w + 0.04, 0.05, 0.66, MAT.flat(0x2e2e2c, 0.42, 0.1), 0, 0.9, 0));
  for (let i = 0; i < Math.floor(w / 0.6); i++)
    g.add(box(0.52, 0.7, 0.02, MAT.flat(0x565650, 0.75, 0.02), -w / 2 + 0.32 + i * 0.6, 0.46, 0.32));
  g.userData.surfaceY = 0.94;
  return g;
}

// ══════════════════ appliances / fixtures ══════════════════

export function fridge(h = 1.6) {
  const g = group(true, 'fridge');
  g.add(box(0.62, h, 0.62, WHITE(), 0, h / 2, 0));
  g.add(box(0.6, h * 0.66, 0.03, MAT.flat(0x8c9291, 0.5, 0.1), 0, h * 0.66, 0.32));
  g.add(box(0.6, h * 0.3, 0.03, MAT.flat(0x8c9291, 0.5, 0.1), 0, h * 0.16, 0.32));
  g.add(box(0.04, 0.4, 0.04, METAL(), 0.24, h * 0.66, 0.35));
  return g;
}

export function stove() {
  const g = group(true, 'stove');
  g.add(box(0.6, 0.86, 0.6, MAT.flat(0x54544e, 0.7, 0.2), 0, 0.43, 0));
  g.add(box(0.6, 0.03, 0.6, MAT.flat(0x2b2b28, 0.35, 0.4), 0, 0.88, 0));
  for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]])
    g.add(cyl(0.08, 0.015, METAL_D(), x, 0.9, z));
  g.add(box(0.5, 0.34, 0.02, MAT.glass(0x14100c, 0.55), 0, 0.42, 0.31));
  for (let i = 0; i < 4; i++) g.add(cyl(0.024, 0.03, METAL(), -0.22 + i * 0.145, 0.74, 0.31).rotateX(Math.PI / 2));
  return g;
}

export function sink(w = 0.6) {
  const g = group(true, 'sink');
  g.add(box(w, 0.14, 0.46, WHITE(), 0, 0.86, 0));
  g.add(box(w - 0.1, 0.1, 0.36, MAT.flat(0x3a3c3a, 0.4, 0.3), 0, 0.85, 0));
  g.add(cyl(0.02, 0.26, METAL(), 0, 1.0, -0.16));
  const spout = cyl(0.018, 0.16, METAL(), 0, 1.12, -0.09);
  spout.rotation.x = Math.PI / 2.4;
  g.add(spout);
  return g;
}

export function toilet() {
  const g = group(true, 'toilet');
  g.add(box(0.36, 0.5, 0.18, WHITE(), 0, 0.55, -0.24));
  g.add(cyl(0.2, 0.36, WHITE(), 0, 0.18, 0.04, true));
  g.add(cyl(0.22, 0.05, WHITE(), 0, 0.38, 0.04, true));
  return g;
}

export function bathtub() {
  const g = group(true, 'tub');
  const m = WHITE();
  g.add(box(1.6, 0.56, 0.72, m, 0, 0.28, 0));
  g.add(box(1.44, 0.4, 0.58, MAT.flat(0x1a1c1c, 0.5, 0.05), 0, 0.4, 0));
  g.add(cyl(0.02, 0.2, METAL(), -0.7, 0.68, 0));
  return g;
}

export function washer(dryer = false) {
  const g = group(true, 'washer');
  g.add(box(0.6, 0.86, 0.62, WHITE(), 0, 0.43, 0));
  g.add(box(0.58, 0.06, 0.6, MAT.flat(0x5a5f5e, 0.6, 0.2), 0, 0.87, 0));
  g.add(cyl(0.17, 0.04, MAT.flat(0x2a2c2c, 0.3, 0.2), 0, 0.46, 0.31).rotateX(Math.PI / 2));
  const glass = cyl(0.14, 0.02, MAT.glass(0x0a0d10, 0.5), 0, 0.46, 0.33);
  glass.rotation.x = Math.PI / 2;
  g.add(glass);
  if (!dryer) for (let i = 0; i < 3; i++) g.add(cyl(0.022, 0.02, METAL(), -0.16 + i * 0.14, 0.79, 0.32).rotateX(Math.PI / 2));
  return g;
}

export function radiator(w = 0.9) {
  const g = group(true, 'radiator');
  const m = MAT.flat(0x8a8d88, 0.72, 0.35);
  const n = Math.floor(w / 0.07);
  for (let i = 0; i < n; i++) g.add(box(0.045, 0.56, 0.11, m, -w / 2 + i * 0.07 + 0.03, 0.44, 0));
  g.add(box(w, 0.05, 0.12, m, 0, 0.72, 0));
  g.add(box(w, 0.05, 0.12, m, 0, 0.17, 0));
  g.add(cyl(0.02, 0.2, METAL(), w / 2 - 0.02, 0.08, 0));
  return g;
}

export function pipeRun(len = 4, r = 0.055, axis = 'x', rusty = true) {
  const g = group(false, 'pipe');
  const m = rusty ? METAL_D() : METAL();
  const p = cyl(r, len, m, 0, 0, 0, true);
  if (axis === 'x') p.rotation.z = Math.PI / 2;
  if (axis === 'z') p.rotation.x = Math.PI / 2;
  g.add(p);
  // joints / brackets
  const n = Math.max(2, Math.floor(len / 1.4));
  for (let i = 0; i <= n; i++) {
    const t = -len / 2 + (i / n) * len;
    const j = cyl(r * 1.35, 0.07, m, 0, 0, 0, true);
    if (axis === 'x') { j.rotation.z = Math.PI / 2; j.position.x = t; }
    else if (axis === 'z') { j.rotation.x = Math.PI / 2; j.position.z = t; }
    else j.position.y = t;
    g.add(j);
  }
  return g;
}

export function valve() {
  const g = group(false, 'valve');
  g.add(cyl(0.07, 0.12, METAL_D(), 0, 0, 0));
  const w = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 6, 16), MAT.flat(0x6a2b22, 0.8, 0.4));
  w.rotation.x = Math.PI / 2;
  w.position.y = 0.1;
  w.castShadow = true;
  g.add(w);
  return g;
}

export function electricalBox(open = false) {
  const g = group(true, 'ebox');
  g.add(box(0.42, 0.54, 0.14, MAT.flat(0x4a4c48, 0.7, 0.4), 0, 0, 0));
  if (open) {
    const d = box(0.4, 0.5, 0.02, MAT.flat(0x3e403c, 0.7, 0.4), -0.36, 0, 0.14);
    d.rotation.y = -1.1;
    g.add(d);
    for (let i = 0; i < 6; i++) {
      g.add(box(0.05, 0.09, 0.04, MAT.flat(i % 2 ? 0x1e1e1e : 0x8a8a84, 0.8, 0.1),
        -0.13 + (i % 3) * 0.13, 0.1 - Math.floor(i / 3) * 0.16, 0.06));
    }
    g.add(box(0.34, 0.02, 0.03, MAT.flat(0x2a2a26, 0.9, 0.1), 0, -0.16, 0.06));
  } else {
    g.add(box(0.4, 0.5, 0.03, MAT.flat(0x54564f, 0.66, 0.45), 0, 0, 0.08));
    g.add(cyl(0.014, 0.05, MAT.brass(), 0.15, 0, 0.11).rotateX(Math.PI / 2));
  }
  return g;
}

export function meterBank(n = 4) {
  const g = group(true, 'meters');
  g.add(box(n * 0.26 + 0.1, 0.5, 0.1, MAT.flat(0x3e4340, 0.8, 0.3), 0, 0, 0));
  for (let i = 0; i < n; i++) {
    const x = -((n - 1) / 2) * 0.26 + i * 0.26;
    g.add(box(0.2, 0.3, 0.09, MAT.flat(0x6a6c64, 0.6, 0.2), x, 0.02, 0.06));
    const dial = cyl(0.06, 0.02, MAT.glass(0x101418, 0.7), x, 0.06, 0.11);
    dial.rotation.x = Math.PI / 2;
    g.add(dial);
  }
  return g;
}

// ══════════════════ light fittings ══════════════════

export function pendantLamp() {
  const g = group(false, 'lamp');
  g.add(cyl(0.006, 0.5, MAT.flat(0x1a1a18, 0.9, 0.1), 0, -0.25, 0));
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.16, 14, 1, true), MAT.flat(0x6a6459, 0.86, 0.05));
  shade.material.side = THREE.DoubleSide;
  shade.position.y = -0.55;
  shade.castShadow = true;
  g.add(shade);
  const bulb = sphere(0.038, MAT.emissive(0xffd9a0, 2.4), 0, -0.6, 0);
  bulb.castShadow = false;
  bulb.name = 'bulb';
  g.add(bulb);
  return g;
}

export function fluorescent(len = 1.2) {
  const g = group(false, 'lamp');
  g.add(box(len, 0.09, 0.16, MAT.flat(0x53575a, 0.6, 0.5), 0, -0.04, 0));
  const tube = cyl(0.032, len - 0.12, MAT.emissive(0xdfeaff, 2.0), 0, -0.11, 0, true);
  tube.rotation.z = Math.PI / 2;
  tube.name = 'bulb';
  tube.castShadow = false;
  g.add(tube);
  return g;
}

export function sconce() {
  const g = group(false, 'lamp');
  g.add(box(0.1, 0.16, 0.06, MAT.flat(0x3e4038, 0.8, 0.3), 0, 0, 0.03));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.15, 12, 1, true), MAT.flat(0x7a705e, 0.9, 0.02));
  shade.material.side = THREE.DoubleSide;
  shade.position.set(0, 0.02, 0.14);
  g.add(shade);
  const bulb = sphere(0.03, MAT.emissive(0xffcf90, 2.0), 0, 0, 0.14);
  bulb.name = 'bulb'; bulb.castShadow = false;
  g.add(bulb);
  return g;
}

export function floorLamp() {
  const g = group(true, 'lamp');
  g.add(cyl(0.14, 0.03, METAL_D(), 0, 0.015, 0));
  g.add(cyl(0.018, 1.45, METAL_D(), 0, 0.72, 0));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.22, 14, 1, true), MAT.flat(0x8a7d63, 0.92, 0.02));
  shade.material.side = THREE.DoubleSide;
  shade.position.y = 1.5;
  g.add(shade);
  const bulb = sphere(0.035, MAT.emissive(0xffd8a4, 2.2), 0, 1.48, 0);
  bulb.name = 'bulb'; bulb.castShadow = false;
  g.add(bulb);
  return g;
}

export function deskLamp() {
  const g = group(false, 'lamp');
  g.add(cyl(0.08, 0.02, METAL_D(), 0, 0.01, 0));
  const arm = cyl(0.012, 0.3, METAL_D(), 0, 0.16, 0);
  arm.rotation.z = 0.32;
  g.add(arm);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.1, 12, 1, true), MAT.flat(0x5c6b52, 0.8, 0.15));
  shade.material.side = THREE.DoubleSide;
  shade.position.set(-0.1, 0.32, 0);
  shade.rotation.z = -0.5;
  g.add(shade);
  const bulb = sphere(0.024, MAT.emissive(0xffd9a0, 2), -0.1, 0.3, 0);
  bulb.name = 'bulb'; bulb.castShadow = false;
  g.add(bulb);
  return g;
}

// ══════════════════ wall decoration ══════════════════

export function painting(w = 0.5, h = 0.65, kind = 'photo:building') {
  const g = group(false, 'painting');
  g.add(box(w + 0.06, h + 0.06, 0.04, WOOD_D(), 0, 0, 0));
  const face = plane(w, h, MAT.paper(kind), 0, 0, 0.023);
  face.material.side = THREE.FrontSide;
  g.add(face);
  const glass = plane(w, h, MAT.glass(0x141a20, 0.14), 0, 0, 0.026);
  g.add(glass);
  return g;
}

export function mirror(w = 0.5, h = 0.8) {
  const g = group(false, 'mirror');
  g.add(box(w + 0.06, h + 0.06, 0.04, WOOD_D(), 0, 0, 0));
  const m = new THREE.MeshStandardMaterial({ color: 0x2a3238, roughness: 0.06, metalness: 0.95 });
  g.add(box(w, h, 0.01, m, 0, 0, 0.025));
  g.userData.isMirror = true;
  return g;
}

export function poster(w = 0.5, h = 0.7, kind = 'news:CITY IN THE DARK') {
  const g = group(false, 'poster');
  const p = plane(w, h, MAT.paper(kind), 0, 0, 0);
  p.material.side = THREE.DoubleSide;
  g.add(p);
  return g;
}

export function numberPlate(num) {
  const g = group(false, 'plate');
  g.add(box(0.15, 0.15, 0.015, MAT.plate(num), 0, 0, 0));
  return g;
}

export function graffitiDecal(text, w = 0.9, h = 0.9) {
  const g = group(false, 'graffiti');
  const p = plane(w, h, MAT.graffiti(text), 0, 0, 0);
  p.receiveShadow = false;
  g.add(p);
  return g;
}

export function coatHooks() {
  const g = group(false, 'hooks');
  g.add(box(0.62, 0.1, 0.03, WOOD_D(), 0, 0, 0));
  for (let i = 0; i < 3; i++) {
    const h = cyl(0.012, 0.09, MAT.brass(), -0.2 + i * 0.2, -0.04, 0.03);
    h.rotation.x = 0.7;
    g.add(h);
  }
  return g;
}

export function clock(r = 0.14) {
  const g = group(false, 'clock');
  g.add(cyl(r, 0.05, WOOD_D(), 0, 0, 0).rotateX(Math.PI / 2));
  const face = cyl(r * 0.88, 0.01, MAT.flat(0xb8b2a0, 0.8, 0), 0, 0, 0.031);
  face.rotation.x = Math.PI / 2;
  g.add(face);
  const hh = box(0.012, r * 0.5, 0.006, MAT.flat(0x1a1a18, 0.8, 0), 0, r * 0.2, 0.038);
  const mh = box(0.008, r * 0.74, 0.006, MAT.flat(0x1a1a18, 0.8, 0), 0, r * 0.3, 0.042);
  hh.rotation.z = 2.1; mh.rotation.z = 0.6;
  hh.position.set(Math.sin(2.1) * -r * 0.25, Math.cos(2.1) * r * 0.25, 0.038);
  mh.position.set(Math.sin(0.6) * -r * 0.37, Math.cos(0.6) * r * 0.37, 0.042);
  g.add(hh, mh);
  g.userData.hands = [hh, mh];
  return g;
}

// ══════════════════ clutter ══════════════════

export function crate(s = 0.5) {
  const g = group(true, 'crate');
  const m = WOOD();
  g.add(box(s, s * 0.8, s, m, 0, s * 0.4, 0));
  for (const sx of [-1, 1]) {
    g.add(box(0.02, s * 0.8, s, WOOD_D(), sx * s / 2, s * 0.4, 0));
  }
  g.add(box(s, 0.03, s, WOOD_D(), 0, s * 0.8, 0));
  return g;
}

export function cardboard(w = 0.5, h = 0.4, open = false) {
  const g = group(true, 'box');
  const m = MAT.flat(0x6b5a41, 0.95, 0);
  if (open) {
    g.add(box(w, h, w, m, 0, h / 2, 0));
    g.add(box(w * 0.94, 0.02, w * 0.94, MAT.flat(0x2a2620, 0.95, 0), 0, h - 0.01, 0));
    const flap = box(w, 0.02, w * 0.5, m, 0, h + 0.01, -w * 0.4);
    flap.rotation.x = -0.8;
    g.add(flap);
  } else {
    g.add(box(w, h, w, m, 0, h / 2, 0));
    g.add(box(w * 0.1, 0.01, w, MAT.flat(0x8a8577, 0.9, 0), 0, h + 0.001, 0));
  }
  return g;
}

export function barrel() {
  const g = group(true, 'barrel');
  g.add(cyl(0.28, 0.86, METAL_D(), 0, 0.43, 0, true));
  for (const y of [0.16, 0.43, 0.7]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.018, 6, 18), METAL());
    r.rotation.x = Math.PI / 2; r.position.y = y; r.castShadow = true;
    g.add(r);
  }
  return g;
}

export function bucket(tipped = false) {
  const g = group(true, 'bucket');
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.26, 14, 1, true), METAL_D());
  b.material.side = THREE.DoubleSide;
  b.position.y = 0.13;
  b.castShadow = true;
  g.add(b);
  g.add(cyl(0.11, 0.01, METAL_D(), 0, 0.005, 0));
  if (tipped) { g.rotation.z = 1.4; g.position.y = 0.14; }
  return g;
}

export function papers(n = 5, spread = 0.5) {
  const g = group(false, 'papers');
  for (let i = 0; i < n; i++) {
    const p = plane(0.21, 0.29, MAT.flat(0x9a9384, 0.96, 0),
      (Math.random() - 0.5) * spread, 0.002 + i * 0.0012, (Math.random() - 0.5) * spread);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = Math.random() * Math.PI;
    g.add(p);
  }
  return g;
}

export function newspaperStack(h = 0.12) {
  const g = group(true, 'news');
  const n = Math.max(2, Math.floor(h / 0.02));
  for (let i = 0; i < n; i++) {
    const p = box(0.3, 0.018, 0.4, MAT.flat(0x8d8878, 0.95, 0), (Math.random() - 0.5) * 0.02, 0.01 + i * 0.019, (Math.random() - 0.5) * 0.02);
    p.rotation.y = (Math.random() - 0.5) * 0.12;
    g.add(p);
  }
  const top = plane(0.3, 0.4, MAT.paper('news:BLACKOUT ENTERS SECOND WEEK'), 0, 0.012 + n * 0.019, 0);
  top.rotation.x = -Math.PI / 2;
  g.add(top);
  return g;
}

export function bottle(hex = 0x2e4432) {
  const g = group(false, 'bottle');
  g.add(cyl(0.035, 0.18, MAT.glass(hex, 0.65), 0, 0.09, 0, true));
  g.add(cyl(0.014, 0.09, MAT.glass(hex, 0.65), 0, 0.22, 0, true));
  return g;
}

export function mug() {
  const g = group(false, 'mug');
  g.add(cyl(0.04, 0.09, MAT.flat(0x8a8378, 0.75, 0), 0, 0.045, 0, true));
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 5, 10, Math.PI), MAT.flat(0x8a8378, 0.75, 0));
  h.position.set(0.045, 0.05, 0); h.rotation.y = Math.PI / 2;
  g.add(h);
  return g;
}

export function suitcase() {
  const g = group(true, 'suitcase');
  g.add(box(0.56, 0.18, 0.38, MAT.flat(0x3d2f26, 0.85, 0.03), 0, 0.09, 0));
  g.add(box(0.58, 0.02, 0.4, MAT.flat(0x2a1f18, 0.85, 0.05), 0, 0.09, 0));
  g.add(box(0.1, 0.03, 0.03, MAT.brass(), 0, 0.19, 0.18));
  return g;
}

export function rug(w = 2, d = 1.4, hex = 0x4a3830) {
  const g = group(false, 'rug');
  const p = plane(w, d, MAT.fabric(hex), 0, 0.006, 0);
  p.rotation.x = -Math.PI / 2;
  g.add(p);
  const b = plane(w * 0.86, d * 0.78, MAT.fabric(hex + 0x101010), 0, 0.008, 0);
  b.rotation.x = -Math.PI / 2;
  g.add(b);
  return g;
}

export function curtain(w = 1.0, h = 1.6, hex = 0x3a3630) {
  const g = group(false, 'curtain');
  const m = MAT.fabric(hex);
  for (let i = 0; i < 6; i++) {
    const c = box(w / 6, h, 0.05 + Math.sin(i * 1.7) * 0.02, m, -w / 2 + (i + 0.5) * w / 6, -h / 2, 0);
    g.add(c);
  }
  g.add(cyl(0.012, w + 0.1, METAL_D(), 0, 0.03, 0).rotateZ(Math.PI / 2));
  return g;
}

export function tv() {
  const g = group(true, 'tv');
  g.add(box(0.66, 0.5, 0.52, MAT.flat(0x38352f, 0.8, 0.05), 0, 0.25, 0));
  g.add(box(0.5, 0.38, 0.02, MAT.flat(0x0e1114, 0.2, 0.3), 0, 0.27, 0.265));
  g.add(box(0.1, 0.02, 0.02, METAL(), 0, 0.44, 0.27));
  const ant = cyl(0.008, 0.5, METAL(), 0.2, 0.72, -0.1);
  ant.rotation.z = 0.5;
  g.add(ant);
  return g;
}

export function tapePlayer() {
  const g = group(false, 'tape');
  g.add(box(0.26, 0.07, 0.17, MAT.flat(0x3a3d3e, 0.7, 0.15), 0, 0.035, 0));
  g.add(box(0.14, 0.02, 0.09, MAT.flat(0x14161a, 0.4, 0.2), 0, 0.072, 0.01));
  for (let i = 0; i < 5; i++) g.add(box(0.03, 0.012, 0.02, MAT.flat(0x7a7f80, 0.6, 0.2), -0.09 + i * 0.045, 0.078, -0.06));
  return g;
}

export function deadPlant() {
  const g = group(true, 'plant');
  g.add(cyl(0.13, 0.16, MAT.flat(0x6a4a38, 0.9, 0), 0, 0.08, 0));
  g.add(cyl(0.115, 0.03, MAT.flat(0x2a2018, 0.98, 0), 0, 0.17, 0));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const st = cyl(0.008, 0.34 + Math.random() * 0.2, MAT.flat(0x4a4230, 0.95, 0),
      Math.cos(a) * 0.05, 0.34, Math.sin(a) * 0.05);
    st.rotation.z = Math.cos(a) * 0.45;
    st.rotation.x = Math.sin(a) * 0.45;
    g.add(st);
  }
  return g;
}

export function toybox() {
  const g = group(true, 'toybox');
  g.add(box(0.6, 0.4, 0.4, MAT.flat(0x5a6a5a, 0.9, 0), 0, 0.2, 0));
  g.add(box(0.62, 0.04, 0.42, MAT.flat(0x46543f, 0.9, 0), 0, 0.42, 0));
  return g;
}

export function ball() {
  const g = group(false, 'ball');
  g.add(sphere(0.08, MAT.flat(0x8a4a3a, 0.85, 0), 0, 0.08, 0));
  return g;
}

export function broom() {
  const g = group(false, 'broom');
  g.add(cyl(0.014, 1.2, WOOD(), 0, 0.6, 0));
  g.add(box(0.26, 0.14, 0.06, MAT.flat(0x6a5a3a, 0.98, 0), 0, 0.07, 0));
  return g;
}

export function ladder(h = 2.2) {
  const g = group(true, 'ladder');
  g.add(box(0.05, h, 0.04, WOOD(), -0.2, h / 2, 0));
  g.add(box(0.05, h, 0.04, WOOD(), 0.2, h / 2, 0));
  const n = Math.floor(h / 0.32);
  for (let i = 1; i <= n; i++) g.add(box(0.44, 0.035, 0.035, WOOD_D(), 0, i * 0.32, 0));
  return g;
}

export function workbench(w = 1.6) {
  const g = group(true, 'bench');
  g.add(box(w, 0.07, 0.66, WOOD(), 0, 0.9, 0));
  for (const x of [-1, 1]) {
    g.add(box(0.08, 0.9, 0.08, WOOD_D(), x * (w / 2 - 0.1), 0.45, -0.26));
    g.add(box(0.08, 0.9, 0.08, WOOD_D(), x * (w / 2 - 0.1), 0.45, 0.26));
  }
  g.add(box(w - 0.3, 0.03, 0.5, WOOD_D(), 0, 0.3, 0));
  // tools scattered on it
  g.add(box(0.18, 0.03, 0.04, METAL(), -w / 4, 0.95, 0.1));
  g.add(box(0.03, 0.03, 0.2, METAL(), w / 5, 0.95, -0.08));
  g.add(cyl(0.03, 0.1, MAT.flat(0x8a3a2a, 0.85, 0.1), w / 3, 0.95, 0.15).rotateZ(Math.PI / 2));
  g.userData.surfaceY = 0.94;
  return g;
}

export function mailboxes(n = 8) {
  const g = group(true, 'mail');
  const cols = 4, rows = Math.ceil(n / cols);
  g.add(box(cols * 0.22 + 0.06, rows * 0.18 + 0.06, 0.16, MAT.flat(0x3a3e3c, 0.7, 0.4), 0, 0, 0));
  for (let i = 0; i < n; i++) {
    const cx = (i % cols - (cols - 1) / 2) * 0.22;
    const cy = (Math.floor(i / cols) - (rows - 1) / 2) * -0.18;
    g.add(box(0.2, 0.16, 0.03, MAT.flat(0x4d514c, 0.62, 0.42), cx, cy, 0.085));
    g.add(box(0.06, 0.012, 0.01, MAT.brass(), cx, cy - 0.05, 0.1));
    g.add(box(0.012, 0.03, 0.01, MAT.flat(0x1a1a18, 0.7, 0.3), cx + 0.07, cy, 0.1));
  }
  return g;
}

export function rockingHorse() {
  const g = group(true, 'horse');
  const m = MAT.flat(0x6a5540, 0.88, 0);
  g.add(box(0.5, 0.16, 0.14, m, 0, 0.42, 0));
  g.add(box(0.16, 0.24, 0.12, m, 0.2, 0.58, 0));
  for (const x of [-0.16, 0.16]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 5, 12, Math.PI * 0.7), m);
    r.rotation.z = Math.PI * 0.85; r.position.set(0, 0.3, x * 0.55);
    g.add(r);
    g.add(box(0.04, 0.22, 0.04, m, x, 0.3, 0));
  }
  return g;
}

// ══════════════════ pickups (small interactable items) ══════════════════

export function itemMesh(kind) {
  const g = group(false, 'item');
  switch (kind) {
    case 'battery': {
      g.add(cyl(0.017, 0.05, MAT.flat(0x2a2a2c, 0.5, 0.5), 0, 0.025, 0, true));
      g.add(cyl(0.017, 0.012, MAT.flat(0x9a7a30, 0.4, 0.7), 0, 0.055, 0, true));
      break;
    }
    case 'food': case 'can': {
      g.add(cyl(0.037, 0.1, MAT.flat(0x8d8f88, 0.35, 0.75), 0, 0.05, 0, true));
      g.add(cyl(0.038, 0.05, MAT.flat(0x7a5a3a, 0.85, 0.05), 0, 0.05, 0, true));
      break;
    }
    case 'medicine': {
      g.add(box(0.09, 0.05, 0.05, MAT.flat(0xa8a49a, 0.8, 0), 0, 0.025, 0));
      g.add(box(0.05, 0.02, 0.051, MAT.flat(0x8a3a3a, 0.7, 0), 0, 0.03, 0));
      break;
    }
    case 'key': case 'key_basement': case 'key_401': case 'key_roof': case 'key_302': {
      g.add(box(0.008, 0.06, 0.02, MAT.brass(), 0, 0.012, 0));
      g.add(cyl(0.016, 0.006, MAT.brass(), 0, 0.012, -0.035).rotateX(Math.PI / 2));
      g.add(box(0.008, 0.014, 0.014, MAT.brass(), 0, 0.012, 0.028));
      break;
    }
    case 'screwdriver': {
      g.add(cyl(0.012, 0.09, MAT.flat(0x8a3a2a, 0.75, 0.1), 0, 0.012, 0).rotateZ(Math.PI / 2));
      g.add(cyl(0.004, 0.12, METAL(), 0.1, 0.012, 0).rotateZ(Math.PI / 2));
      break;
    }
    case 'flashlight': {
      g.add(cyl(0.026, 0.16, MAT.flat(0x2e3234, 0.6, 0.4), 0, 0.026, 0).rotateZ(Math.PI / 2));
      g.add(cyl(0.034, 0.04, MAT.flat(0x4a4e50, 0.4, 0.6), 0.09, 0.026, 0).rotateZ(Math.PI / 2));
      break;
    }
    case 'note': case 'letter': case 'newspaper': case 'document': {
      const p = plane(0.19, 0.26, MAT.flat(0xa39c8c, 0.96, 0), 0, 0.003, 0);
      p.rotation.x = -Math.PI / 2;
      p.rotation.z = Math.random() * 0.6 - 0.3;
      g.add(p);
      break;
    }
    case 'photograph': {
      const p = plane(0.13, 0.13, MAT.photo('two'), 0, 0.003, 0);
      p.rotation.x = -Math.PI / 2;
      g.add(p);
      break;
    }
    case 'drawing': {
      const p = plane(0.2, 0.2, MAT.drawing('building'), 0, 0.003, 0);
      p.rotation.x = -Math.PI / 2;
      g.add(p);
      break;
    }
    case 'tape': {
      g.add(box(0.1, 0.016, 0.065, MAT.flat(0x2a2c30, 0.6, 0.15), 0, 0.008, 0));
      g.add(cyl(0.016, 0.018, MAT.flat(0x8a8478, 0.7, 0), -0.023, 0.009, 0).rotateX(Math.PI / 2));
      g.add(cyl(0.016, 0.018, MAT.flat(0x8a8478, 0.7, 0), 0.023, 0.009, 0).rotateX(Math.PI / 2));
      break;
    }
    case 'recorder': return tapePlayer();
    case 'coin': {
      for (let i = 0; i < 3; i++)
        g.add(cyl(0.012, 0.002, MAT.brass(), (Math.random() - 0.5) * 0.04, 0.002 + i * 0.003, (Math.random() - 0.5) * 0.04));
      break;
    }
    case 'fuse': {
      g.add(cyl(0.014, 0.04, MAT.glass(0x8a7a50, 0.6), 0, 0.02, 0, true));
      g.add(cyl(0.015, 0.008, MAT.brass(), 0, 0.004, 0));
      g.add(cyl(0.015, 0.008, MAT.brass(), 0, 0.036, 0));
      break;
    }
    case 'crowbar': {
      const b = cyl(0.014, 0.7, MAT.flat(0x6a3a2a, 0.7, 0.5), 0, 0.014, 0);
      b.rotation.z = Math.PI / 2;
      g.add(b);
      const hook = cyl(0.014, 0.12, MAT.flat(0x6a3a2a, 0.7, 0.5), 0.36, 0.05, 0);
      hook.rotation.z = 0.7;
      g.add(hook);
      break;
    }
    case 'strange': case 'ring': {
      const t = new THREE.Mesh(new THREE.TorusKnotGeometry(0.035, 0.012, 48, 8), MAT.flat(0x1a1c20, 0.28, 0.9));
      t.position.y = 0.05; t.castShadow = true;
      g.add(t);
      break;
    }
    case 'doll': {
      g.add(box(0.06, 0.13, 0.04, MAT.fabric(0x7a6a58), 0, 0.065, 0));
      g.add(sphere(0.04, MAT.flat(0xa89a86, 0.9, 0), 0, 0.16, 0));
      break;
    }
    default: {
      g.add(box(0.08, 0.08, 0.08, MAT.flat(0x6a6a64, 0.8, 0.1), 0, 0.04, 0));
    }
  }
  return g;
}
