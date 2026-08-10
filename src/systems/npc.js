// ══════════════════════════════════════════════════════════════════════
//  Residents: bodies, idle behaviour, and the thing on the stairs.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { MAT } from '../world/materials.js';
import * as P from '../world/props.js';
import { NPC_DEFS } from '../data/dialogue.js';
import { GEO, levelY, slotBounds } from '../world/layout.js';
import { clamp, damp, makeRng } from '../core/util.js';

function buildBody(def, dark = false) {
  const g = new THREE.Group();
  const h = def.height;
  const coat = dark ? MAT.flat(0x090b0d, 1.0, 0) : MAT.fabric(def.coat);
  const skin = dark ? MAT.flat(0x0c0e10, 1.0, 0) : MAT.flat(def.skin, 0.86, 0);
  const hair = dark ? MAT.flat(0x070809, 1.0, 0) : MAT.flat(def.hair, 0.95, 0);
  const shoe = MAT.flat(0x1a1a18, 0.9, 0.02);

  const hips = new THREE.Group();
  hips.position.y = h * 0.52;
  g.add(hips);

  // legs
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * h * 0.065, 0, 0);
    const thigh = P.box(h * 0.1, h * 0.28, h * 0.1, coat, 0, -h * 0.14, 0);
    leg.add(thigh);
    const shin = P.box(h * 0.085, h * 0.26, h * 0.09, coat, 0, -h * 0.41, 0);
    leg.add(shin);
    leg.add(P.box(h * 0.09, h * 0.035, h * 0.15, shoe, 0, -h * 0.53, h * 0.03));
    hips.add(leg);
    legs.push(leg);
  }

  // torso
  const torso = new THREE.Group();
  hips.add(torso);
  const chest = P.box(h * 0.24, h * 0.3, h * 0.14, coat, 0, h * 0.15, 0);
  torso.add(chest);
  torso.add(P.box(h * 0.2, h * 0.08, h * 0.13, coat, 0, h * 0.02, 0));

  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * h * 0.135, h * 0.27, 0);
    arm.add(P.box(h * 0.065, h * 0.2, h * 0.07, coat, 0, -h * 0.1, 0));
    arm.add(P.box(h * 0.055, h * 0.2, h * 0.06, coat, 0, -h * 0.29, 0));
    arm.add(P.sphere(h * 0.032, skin, 0, -h * 0.4, 0));
    torso.add(arm);
    arms.push(arm);
  }

  // head
  const neck = new THREE.Group();
  neck.position.y = h * 0.32;
  torso.add(neck);
  neck.add(P.box(h * 0.07, h * 0.05, h * 0.07, skin, 0, h * 0.02, 0));
  const head = P.box(h * 0.115, h * 0.145, h * 0.115, skin, 0, h * 0.11, 0);
  neck.add(head);
  const hairMesh = P.box(h * 0.125, h * 0.075, h * 0.125, hair, 0, h * 0.16, -h * 0.004);
  neck.add(hairMesh);
  if (!dark) {
    for (const s of [-1, 1]) {
      neck.add(P.box(h * 0.016, h * 0.012, h * 0.006, MAT.flat(0x14100c, 0.6, 0), s * h * 0.026, h * 0.115, h * 0.058));
    }
  }

  g.userData.parts = { hips, torso, neck, legs, arms, head };
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export class Npc {
  constructor(id, def, scene) {
    this.id = id;
    this.def = def;
    this.root = buildBody(def);
    this.root.userData.npcId = id;
    scene.add(this.root);
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.targetYaw = 0;
    this.phase = Math.random() * 10;
    this.visible = true;
    this.state = 'idle';
    this.homeRoom = null;
    this.wanderTarget = null;
    this.speed = 0;
    this.talkTimer = 0;
    this.gone = false;
    this.headLook = 0;
  }

  place(x, y, z, yaw) {
    this.pos.set(x, y, z);
    this.yaw = this.targetYaw = yaw;
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;
  }

  setVisible(v) {
    this.visible = v;
    this.root.visible = v;
  }

  update(dt, playerPos, opts = {}) {
    if (!this.visible) return;
    this.phase += dt;
    const p = this.root.userData.parts;
    const h = this.def.height;

    const d = this.pos.distanceTo(playerPos);
    const near = d < 6;

    // face the player when they are close, otherwise drift
    if (near && this.state !== 'walk') {
      const dx = playerPos.x - this.pos.x, dz = playerPos.z - this.pos.z;
      this.targetYaw = Math.atan2(dx, dz);
    }
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * Math.min(1, dt * 3.2);
    this.root.rotation.y = this.yaw;

    // breathing / weight shift
    const breathe = Math.sin(this.phase * 1.1) * 0.5 + 0.5;
    p.torso.position.y = breathe * 0.006;
    p.torso.rotation.z = Math.sin(this.phase * 0.43) * 0.02;
    p.torso.rotation.x = this.def.stoop + Math.sin(this.phase * 0.31) * 0.012;
    p.neck.rotation.x = -this.def.stoop * 0.7 + Math.sin(this.phase * 0.7) * 0.02;

    // head turn toward the player
    const want = near ? clamp(dy * 0.5, -0.6, 0.6) : Math.sin(this.phase * 0.23) * 0.2;
    this.headLook = damp(this.headLook, want, 4, dt);
    p.neck.rotation.y = this.headLook;

    // arms sway
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1;
      p.arms[i].rotation.x = Math.sin(this.phase * 0.9 + i * 1.7) * 0.05 + (this.speed * 0.6 * Math.sin(this.phase * 7 + i * Math.PI));
      p.arms[i].rotation.z = s * (0.06 + Math.sin(this.phase * 0.6 + i) * 0.02);
    }
    for (let i = 0; i < 2; i++) {
      p.legs[i].rotation.x = this.speed * 0.7 * Math.sin(this.phase * 7 + i * Math.PI);
    }
    p.hips.position.y = h * 0.52 + Math.abs(Math.sin(this.phase * 7)) * this.speed * 0.03;

    // wandering
    if (this.state === 'walk' && this.wanderTarget) {
      const to = this.wanderTarget.clone().sub(this.pos);
      to.y = 0;
      const dist = to.length();
      if (dist < 0.35) {
        this.state = 'idle'; this.speed = 0; this.wanderTarget = null;
        this.pauseUntil = this.phase + 2 + Math.random() * 5;
      } else {
        to.normalize();
        this.speed = damp(this.speed, 0.85, 4, dt);
        this.pos.addScaledVector(to, this.speed * dt);
        this.targetYaw = Math.atan2(to.x, to.z);
        if (opts.onStep && Math.floor(this.phase * 3.4) !== this._lastStep) {
          this._lastStep = Math.floor(this.phase * 3.4);
          opts.onStep(this.pos);
        }
      }
    } else {
      this.speed = damp(this.speed, 0, 6, dt);
    }
    this.root.position.copy(this.pos);
  }
}

// ── the follower ────────────────────────────────────────────────────────
//  Not a monster. It moves when you are not looking, stops when you are,
//  and if it reaches you it takes something and leaves.

export class Follower {
  constructor(scene) {
    this.root = buildBody({ height: 1.72, coat: 0, skin: 0, hair: 0, stoop: 0.12 }, true);
    this.root.visible = false;
    scene.add(this.root);
    this.pos = new THREE.Vector3();
    this.active = false;
    this.state = 'dormant';       // dormant | stalk | frozen | fade
    this.cooldown = 20;
    this.seenTimer = 0;
    this.aggression = 0;
    this.hitCooldown = 0;
    this.phase = 0;
    this.opacity = 1;
    this.materials = [];
    this.root.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; this.materials.push(o.material); } });
  }

  spawnNear(pos, camDir) {
    // appear behind the player, at the edge of the torch
    const a = Math.atan2(-camDir.z, -camDir.x) + (Math.random() - 0.5) * 1.2;
    const r = 9 + Math.random() * 5;
    this.pos.set(pos.x + Math.cos(a) * r, pos.y, pos.z + Math.sin(a) * r);
    this.root.position.copy(this.pos);
    this.root.visible = true;
    this.active = true;
    this.state = 'stalk';
    this.opacity = 0;
  }

  despawn() {
    this.active = false;
    this.state = 'dormant';
    this.root.visible = false;
    this.cooldown = 26 + Math.random() * 24;
  }

  /** looked: is it inside the player's view cone AND lit or torch-lit? */
  update(dt, playerPos, camDir, looked, litHere, onHit, audio) {
    this.phase += dt;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (!this.active) { this.cooldown -= dt; return; }

    const to = new THREE.Vector3().subVectors(playerPos, this.pos);
    to.y = 0;
    const dist = to.length();
    to.normalize();

    // fade in
    this.opacity = damp(this.opacity, this.state === 'fade' ? 0 : 1, 3, dt);
    for (const m of this.materials) m.opacity = this.opacity * 0.94;

    if (this.state === 'fade') {
      if (this.opacity < 0.03) this.despawn();
      this.root.position.copy(this.pos);
      return;
    }

    const watched = looked && (litHere || dist < 12);
    if (watched) {
      this.state = 'frozen';
      this.seenTimer += dt;
      // being stared at in a lit place drives it off
      if (litHere && this.seenTimer > 2.2) {
        this.state = 'fade';
        audio?.play('whisper', { pos: this.pos.clone(), volume: 0.5, dur: 1.4 });
      }
    } else {
      this.seenTimer = Math.max(0, this.seenTimer - dt * 0.6);
      this.state = 'stalk';
      const speed = (0.9 + this.aggression * 1.5) * (dist > 14 ? 2.2 : 1);
      this.pos.addScaledVector(to, speed * dt);
      if (Math.random() < dt * 2.2) {
        audio?.play('step', { pos: this.pos.clone(), surface: 'carpet', volume: 0.24, rate: 0.8 });
      }
    }

    // vertical follow — it never uses the stairs, it is simply on your floor
    this.pos.y = damp(this.pos.y, playerPos.y, 2.2, dt);
    this.root.position.copy(this.pos);
    this.root.lookAt(playerPos.x, this.pos.y + 1.5, playerPos.z);
    this.root.rotation.x = 0; this.root.rotation.z = 0;

    if (dist < 1.15 && this.hitCooldown <= 0) {
      this.hitCooldown = 6;
      onHit?.();
      this.state = 'fade';
    }
  }
}

// ── director ────────────────────────────────────────────────────────────

export class NpcSystem {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.npcs = new Map();
    this.follower = new Follower(scene);
    this.rng = makeRng('npc');
  }

  spawnFromPlan(plan, building) {
    for (const n of this.npcs.values()) this.scene.remove(n.root);
    this.npcs.clear();

    for (const spec of plan.npcs) {
      const def = NPC_DEFS[spec.id];
      if (!def) continue;
      const npc = new Npc(spec.id, def, this.scene);
      npc.spec = spec;
      let x = 0, y = 0, z = 0, yaw = 0;
      if (String(spec.roomId).startsWith('corridor:')) {
        const lv = parseInt(spec.roomId.split(':')[1], 10);
        y = levelY(lv);
        x = this.rng.range(-7, 7); z = this.rng.range(-0.7, 0.7);
        yaw = this.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
        npc.corridorLevel = lv;
      } else {
        const room = building.rooms.get(spec.roomId);
        if (!room) continue;
        const b = room.bounds;
        y = levelY(room.lv);
        x = (b.x0 + b.x1) / 2 + this.rng.range(-1.2, 1.2);
        z = (b.z0 + b.z1) / 2 + this.rng.range(-0.8, 0.8);
        yaw = room.side === 'n' ? Math.PI : 0;
        npc.roomLevel = room.lv;
        npc.roomBounds = b;
      }
      npc.place(x, y, z, yaw);
      npc.homeRoom = spec.roomId;
      npc.hostile = !!spec.hostile;
      npc.despawnAt = spec.despawnAt ?? null;
      npc.wander = !!spec.wander;
      this.npcs.set(spec.id, npc);
    }
  }

  get(id) { return this.npcs.get(id); }

  /** Nearest NPC the player can talk to. */
  nearest(pos, maxDist = 2.6) {
    let best = null, bd = maxDist;
    for (const n of this.npcs.values()) {
      if (!n.visible || n.gone) continue;
      const d = n.pos.distanceTo(pos);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  update(dt, playerPos, camDir, ctx) {
    for (const n of this.npcs.values()) {
      if (n.gone) continue;
      if (n.despawnAt != null && ctx.elapsed > n.despawnAt && !n.vanished) {
        n.vanished = true; n.gone = true; n.setVisible(false);
        ctx.onVanish?.(n);
        continue;
      }
      // wander inside a bounded area
      if (n.wander && n.state === 'idle' && n.phase > (n.pauseUntil || 0) && Math.random() < dt * 0.25) {
        const lv = n.corridorLevel;
        if (lv != null) {
          n.wanderTarget = new THREE.Vector3(this.rng.range(-8, 8), levelY(lv), this.rng.range(-0.8, 0.8));
          n.state = 'walk';
        } else if (n.roomBounds) {
          n.wanderTarget = new THREE.Vector3(
            this.rng.range(n.roomBounds.x0 + 1, n.roomBounds.x1 - 1),
            n.pos.y,
            this.rng.range(n.roomBounds.z0 + 1, n.roomBounds.z1 - 1));
          n.state = 'walk';
        }
      }
      n.update(dt, playerPos, {
        onStep: (p) => this.audio.play('step', { pos: p.clone(), surface: 'carpet', volume: 0.16, rate: 0.9 }),
      });
      // cull by level so you never see people through a floor
      const sameLevel = Math.abs(n.pos.y - playerPos.y) < 2.6;
      n.root.visible = n.visible && sameLevel;
    }
  }

  clearFollower() { this.follower.despawn(); }
}

export function roomAnchor(building, roomId) {
  const room = building.rooms.get(roomId);
  if (!room) return null;
  const b = room.bounds ?? slotBounds(room.side, room.slot);
  return new THREE.Vector3((b.x0 + b.x1) / 2, levelY(room.lv), (b.z0 + b.z1) / 2);
}

export { GEO };
