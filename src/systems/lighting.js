// ══════════════════════════════════════════════════════════════════════
//  A fixed pool of real lights is re-assigned every frame to whichever
//  emitters are nearest the camera. Emissive bulb meshes stay visible at
//  any distance, so far-off rooms still read as lit without paying for
//  them. Keeping the light count constant also stops shader recompiles.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { clamp, damp } from '../core/util.js';

const POOL = 7;

// three uses physical light units, so a bare bulb needs candela, not a
// convenient small number. Emitters are authored on a 1-5 scale and scaled here.
const LUX = 4.6;

export class LightRig {
  constructor(scene, settings) {
    this.scene = scene;
    this.settings = settings;
    this.pool = [];
    for (let i = 0; i < POOL; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 8, 1.8);
      l.castShadow = false;
      scene.add(l);
      this.pool.push(l);
    }
    this.ambient = new THREE.HemisphereLight(0x59677c, 0x0d1114, 0.13);
    // 0 indoors, 1 on the roof. Outside, an overcast sky is the only light
    // there is, and it needs to be a great deal stronger than the indoor floor.
    this.skyMix = 0;
    scene.add(this.ambient);
    this.emitters = [];
    this.dip = 0;             // 0..1 global brownout
    this.dipTarget = 0;
    this.blackout = 0;        // full kill, used on night 7
    this._sorted = [];
    this.onFlicker = null;
  }

  setEmitters(list) {
    this.emitters = list;
    for (const e of list) {
      e.value = e.on ? 1 : 0;
      e.flickerState = 1;
      e.nextFlicker = 1 + Math.random() * 6;
    }
  }

  /** Force some emitters off / on for tonight's layout. */
  applyPlan(plan) {
    const off = new Set(plan.lightsOff || []);
    const on = new Set(plan.lightsForced || []);
    for (const e of this.emitters) {
      if (off.has(e.id)) { e.on = false; e.broken = true; }
      if (on.has(e.id)) { e.on = true; e.broken = false; }
    }
  }

  setEmitterOn(id, on) {
    const e = this.emitters.find((x) => x.id === id);
    if (e) { e.on = on; e.broken = false; }
    return e;
  }

  triggerDip(seconds = 2.2) {
    this.dipTarget = 1;
    clearTimeout(this._dipT);
    this._dipT = setTimeout(() => { this.dipTarget = 0; }, seconds * 1000);
  }

  /** Is this world position inside a working light's pool? */
  isLit(pos, radiusScale = 0.75) {
    for (const e of this.emitters) {
      if (!e.on || e.broken) continue;
      if (e.value < 0.25) continue;
      const d = e.pos.distanceTo(pos);
      if (d < e.distance * radiusScale) return true;
    }
    return false;
  }

  update(dt, camPos, time) {
    this.dip = damp(this.dip, this.dipTarget, 6, dt);
    const reduce = this.settings.reduceFlashing;

    // per-emitter flicker + on/off value
    for (const e of this.emitters) {
      let target = (e.on && !e.broken) ? 1 : 0;
      if (e.flicker > 0 && target > 0 && !reduce) {
        e.nextFlicker -= dt;
        if (e.nextFlicker <= 0) {
          e.flickerState = e.flickerState > 0.5 ? (0.08 + Math.random() * 0.3) : 1;
          e.nextFlicker = e.flickerState > 0.5
            ? (0.6 + Math.random() * 7) / (0.3 + e.flicker)
            : 0.03 + Math.random() * 0.16;
          if (e.flickerState < 0.5 && Math.random() < 0.3) this.onFlicker?.(e);
        }
        // fluorescent buzz-flutter
        const flut = e.kind === 'fluorescent'
          ? 0.88 + Math.sin(time * 47 + e.phase) * 0.06 + Math.sin(time * 13.7 + e.phase) * 0.04
          : 0.97 + Math.sin(time * 3.1 + e.phase) * 0.03;
        target *= e.flickerState * flut;
      } else if (e.flicker > 0 && reduce) {
        target *= 0.92;
      }
      target *= (1 - this.dip * 0.86) * (1 - this.blackout);
      e.value = damp(e.value, target, e.kind === 'fluorescent' ? 40 : 16, dt);
      if (e.mesh) {
        e.mesh.material.emissiveIntensity = e.value * 2.4;
        e.mesh.visible = e.value > 0.02;
      }
    }

    // choose the nearest emitters that are actually contributing
    this._sorted.length = 0;
    for (const e of this.emitters) {
      if (e.value < 0.02) continue;
      const d = e.pos.distanceToSquared(camPos);
      if (d > 900) continue;
      this._sorted.push({ e, d });
    }
    this._sorted.sort((a, b) => a.d - b.d);

    for (let i = 0; i < POOL; i++) {
      const slot = this._sorted[i];
      const l = this.pool[i];
      if (!slot) { l.intensity = 0; continue; }
      const e = slot.e;
      l.position.copy(e.pos);
      l.color.setHex(e.color);
      l.distance = e.distance;
      l.intensity = e.baseIntensity * e.value * LUX;
      l.decay = 1.6;
    }

    this.ambient.intensity = (0.13 + this.skyMix * 13) * (1 - this.dip * 0.72 * (1 - this.skyMix)) * (1 - this.blackout * 0.9);
  }

  dispose() {
    for (const l of this.pool) this.scene.remove(l);
    this.scene.remove(this.ambient);
  }
}

export { clamp };
