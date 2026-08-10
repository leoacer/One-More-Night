// ── shared materials, built once from the procedural texture library ────
import * as THREE from 'three';
import { TX } from '../core/textures.js';

const mats = new Map();

function std(key, opts) {
  if (mats.has(key)) return mats.get(key);
  const m = new THREE.MeshStandardMaterial(opts);
  mats.set(key, m);
  return m;
}

export const MAT = {
  wallpaper(v = 0, repeat = [2, 1]) {
    const k = `wp${v}_${repeat}`;
    return std(k, {
      map: TX.get(`wallpaper:${v}`, repeat),
      normalMap: TX.normal(`wallpaper:${v}`, repeat, 1.1),
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.94, metalness: 0.0,
    });
  },
  plaster(v = 1, repeat = [2, 1], dark = false) {
    const key = dark ? `plasterDark:${v}` : `plaster:${v}`;
    return std(`pl${v}${dark}_${repeat}`, {
      map: TX.get(key, repeat),
      normalMap: TX.normal(key, repeat, 1.6),
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.97, metalness: 0.0,
    });
  },
  wood(repeat = [3, 3], dark = false) {
    const key = dark ? 'woodDark:4' : 'wood:3';
    return std(`wd${dark}_${repeat}`, {
      map: TX.get(key, repeat),
      normalMap: TX.normal(key, repeat, 1.4),
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.7, metalness: 0.0,
    });
  },
  tile(repeat = [4, 4], white = false) {
    const key = white ? 'tileWhite:6' : 'tile:5';
    return std(`tl${white}_${repeat}`, {
      map: TX.get(key, repeat),
      normalMap: TX.normal(key, repeat, 1.8),
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 0.42, metalness: 0.02,
    });
  },
  carpet(repeat = [3, 3]) {
    return std(`cp_${repeat}`, {
      map: TX.get('carpet:9', repeat),
      normalMap: TX.normal('carpet:9', repeat, 1.0),
      roughness: 1.0, metalness: 0,
    });
  },
  ceiling(repeat = [3, 3]) {
    return std(`cl_${repeat}`, {
      map: TX.get('ceiling:41', repeat),
      roughness: 0.98, metalness: 0,
    });
  },
  brick(repeat = [2, 2]) {
    return std(`br_${repeat}`, {
      map: TX.get('brick:31', repeat),
      normalMap: TX.normal('brick:31', repeat, 2.2),
      roughness: 0.95, metalness: 0,
    });
  },
  metal(dark = false) {
    const key = dark ? 'metalDark:12' : 'metal:11';
    return std(`mt${dark}`, {
      map: TX.get(key, [1, 1]),
      normalMap: TX.normal(key, [1, 1], 1.4),
      roughness: 0.58, metalness: 0.72,
    });
  },
  brass() {
    return std('brass', {
      map: TX.get('brass:13', [1, 1]),
      roughness: 0.42, metalness: 0.85, color: 0xd8c090,
    });
  },
  door(variant = 'door') {
    return std(`dr_${variant}`, {
      map: TX.get(`${variant}:21`, [1, 1]),
      normalMap: TX.normal(`${variant}:21`, [1, 1], 1.2),
      roughness: 0.66, metalness: 0.0,
    });
  },
  plate(num) {
    return std(`plate_${num}`, {
      map: TX.get(`plate:${num}`, [1, 1]),
      roughness: 0.5, metalness: 0.35,
    });
  },
  paper(kind = 'news:BLACKOUT') {
    return std(`pa_${kind}`, {
      map: TX.get(kind, [1, 1]),
      roughness: 0.92, metalness: 0, side: THREE.DoubleSide,
    });
  },
  photo(kind = 'two') {
    return std(`ph_${kind}`, {
      map: TX.get(`photo:${kind}`, [1, 1]),
      roughness: 0.55, metalness: 0, side: THREE.DoubleSide,
    });
  },
  drawing(kind = 'building') {
    return std(`dw_${kind}`, {
      map: TX.get(`drawing:${kind}`, [1, 1]),
      roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
    });
  },
  graffiti(text) {
    return std(`gf_${text}`, {
      map: TX.get(`graffiti:${text}`, [1, 1]),
      transparent: true, roughness: 1, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      depthWrite: false,
    });
  },
  /** flat colour helper */
  flat(hex, rough = 0.8, metal = 0.05, extra) {
    const k = `f_${hex}_${rough}_${metal}_${extra ? JSON.stringify(extra) : ''}`;
    return std(k, { color: hex, roughness: rough, metalness: metal, ...(extra || {}) });
  },
  emissive(hex, intensity = 1) {
    return std(`e_${hex}_${intensity}`, {
      color: 0x000000, emissive: hex, emissiveIntensity: intensity,
      roughness: 1, metalness: 0, toneMapped: false,
    });
  },
  glass(tint = 0x0a1018, opacity = 0.22) {
    return std(`gl_${tint}_${opacity}`, {
      color: tint, transparent: true, opacity,
      roughness: 0.08, metalness: 0.1,
      side: THREE.DoubleSide,
    });
  },
  /** window pane that shows a dead city — dark, wet, faintly reflective */
  windowPane() {
    return std('winpane', {
      color: 0x0b1219,
      transparent: true, opacity: 0.2,
      roughness: 0.14, metalness: 0.35,
      alphaMap: TX.get('grime:61', [1, 1]),
      side: THREE.DoubleSide,
    });
  },
  fabric(hex, rough = 0.98) { return this.flat(hex, rough, 0); },

  dispose() { for (const m of mats.values()) m.dispose(); mats.clear(); },
};
