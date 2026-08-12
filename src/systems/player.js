// ══════════════════════════════════════════════════════════════════════
//  First-person controller: movement, collision, stairs, head movement,
//  footsteps and the torch.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { clamp, damp, lerp } from '../core/util.js';

const EYE_STAND = 1.68;
const EYE_CROUCH = 1.06;
const RADIUS = 0.32;
const BODY_H = 1.75;
const WALK = 2.45;
const SPRINT = 4.35;
const CROUCH_SPD = 1.25;
const ACCEL = 14;
const FRICTION = 11;
const GRAVITY = 18;
const STEP_UP = 0.55;

export class Player {
  constructor(camera, audio, settings) {
    this.camera = camera;
    this.audio = audio;
    this.settings = settings;

    this.yaw = 0;
    this.pitch = 0;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.grounded = true;
    this.groundY = 0;
    this.crouching = false;
    this.sprinting = false;
    this.leaning = 0;
    this.stamina = 1;
    this.eye = EYE_STAND;
    this.surface = 'wood';

    this.bobPhase = 0;
    this.bobAmount = 0;
    this.travel = 0;
    this.stepAccum = 0;
    this.breath = 0;
    this.swayX = 0; this.swayY = 0;
    this.recoil = 0;
    this.landShock = 0;

    // torch
    this.torchOn = false;
    this.battery = 1.0;
    this.batteryDrain = 1 / 480;      // a fresh cell lasts about eight minutes of use
    this.torchFail = 0;

    this.spot = new THREE.SpotLight(0xffe2b4, 0, 26, Math.PI * 0.19, 0.55, 1.9);
    this.spot.castShadow = true;
    this.spot.shadow.mapSize.set(1024, 1024);
    this.spot.shadow.camera.near = 0.2;
    this.spot.shadow.camera.far = 26;
    this.spot.shadow.bias = -0.0022;
    this.spot.shadow.normalBias = 0.028;
    this.spotTarget = new THREE.Object3D();

    // a soft glow at the lens so the beam has a source
    this.torchGlow = new THREE.PointLight(0xffd9a0, 0, 2.4, 2);

    // volumetric cone
    const coneGeo = new THREE.ConeGeometry(1, 1, 24, 1, true);
    coneGeo.translate(0, -0.5, 0);
    coneGeo.rotateX(-Math.PI / 2);
    this.cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({
      color: 0xffd9a8, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    }));
    this.cone.renderOrder = 3;
    this.cone.frustumCulled = false;

    this.colliders = [];
    this.walkable = [];
    this.ray = new THREE.Raycaster();
    this.ray.far = 4.0;
    this._down = new THREE.Vector3(0, -1, 0);
    this._probe = new THREE.Vector3();
    this.fwd = new THREE.Vector3();
    this.right = new THREE.Vector3();
  }

  /** Re-point the torch shadow at a new resolution. */
  setShadowQuality(size, coneOn) {
    this.spot.shadow.mapSize.set(size, size);
    if (this.spot.shadow.map) { this.spot.shadow.map.dispose(); this.spot.shadow.map = null; }
    this.coneEnabled = coneOn !== false;
    if (!this.coneEnabled) this.cone.visible = false;
  }

  addToScene(scene) {
    scene.add(this.spot);
    scene.add(this.spotTarget);
    scene.add(this.torchGlow);
    scene.add(this.cone);
    this.spot.target = this.spotTarget;
  }

  setWorld(colliders, walkable) {
    this.colliders = colliders;
    this.walkable = walkable;
  }

  teleport(x, y, z, yaw = 0) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    // land on whatever is actually here — stairs and lift cars are not
    // at the level's nominal height
    this._probe.set(x, y + 2.4, z);
    this.ray.set(this._probe, this._down);
    this.ray.far = 5.0;
    const hit = this.ray.intersectObjects(this.walkable, false)[0];
    if (hit) this.pos.y = hit.point.y;
    this.groundY = this.pos.y;
    this.grounded = true;
  }

  get level() { return Math.round(this.pos.y / 3.3); }
  get head() { return new THREE.Vector3(this.pos.x, this.pos.y + this.eye, this.pos.z); }

  // ── collision ───────────────────────────────────────────────────────

  _blocked(x, z, yLow, yHigh) {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (c.disabled) continue;
      if (yHigh <= c.y0 || yLow >= c.y1) continue;
      const cx = clamp(x, c.x0, c.x1);
      const cz = clamp(z, c.z0, c.z1);
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz < RADIUS * RADIUS) return c;
    }
    return null;
  }

  _groundAt(x, z, fromY) {
    this._probe.set(x, fromY + 1.1, z);
    this.ray.set(this._probe, this._down);
    this.ray.far = 3.4;
    const hits = this.ray.intersectObjects(this.walkable, false);
    for (const h of hits) {
      if (h.object.visible === false) continue;
      return { y: h.point.y, surface: h.object.userData.surface || 'wood', obj: h.object };
    }
    return null;
  }

  // ── update ──────────────────────────────────────────────────────────

  update(dt, input, opts = {}) {
    const frozen = opts.frozen;

    // ── look
    if (!frozen) {
      const [mdx, mdy] = input.consumeMouse();
      this.yaw -= mdx;
      this.pitch = clamp(this.pitch - mdy, -1.45, 1.45);
    } else {
      input.consumeMouse();
    }

    // ── intent
    const [ax, az] = frozen ? [0, 0] : input.moveAxis();
    const moving = ax !== 0 || az !== 0;
    const wantCrouch = !frozen && input.down('KeyC');
    const canSprint = !wantCrouch && this.stamina > 0.06 && az < 0;
    this.sprinting = !frozen && canSprint && input.down('ShiftLeft') && moving;

    // crouch, with a headroom check before standing back up
    if (wantCrouch !== this.crouching) {
      if (!wantCrouch) {
        const clear = !this._blocked(this.pos.x, this.pos.z, this.pos.y + EYE_CROUCH + 0.1, this.pos.y + BODY_H);
        if (clear) this.crouching = false;
      } else this.crouching = true;
    }
    this.eye = damp(this.eye, this.crouching ? EYE_CROUCH : EYE_STAND, 11, dt);

    if (this.sprinting) this.stamina = clamp(this.stamina - dt / 7.5, 0, 1);
    else this.stamina = clamp(this.stamina + dt / 11, 0, 1);

    const speed = this.crouching ? CROUCH_SPD : this.sprinting ? SPRINT : WALK;

    // ── accelerate in the yaw frame
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    // camera forward is (-sin, 0, -cos); right is (cos, 0, -sin)
    const wishX = (ax * c + az * s) * speed;
    const wishZ = (az * c - ax * s) * speed;
    const acc = this.grounded ? ACCEL : ACCEL * 0.28;
    this.vel.x += (wishX - this.vel.x) * Math.min(1, acc * dt);
    this.vel.z += (wishZ - this.vel.z) * Math.min(1, acc * dt);
    if (!moving) {
      const f = Math.min(1, FRICTION * dt);
      this.vel.x -= this.vel.x * f;
      this.vel.z -= this.vel.z * f;
    }

    // ── horizontal movement, one axis at a time so walls slide
    const yLow = this.pos.y + 0.35, yHigh = this.pos.y + (this.crouching ? EYE_CROUCH : BODY_H) - 0.08;
    let nx = this.pos.x + this.vel.x * dt;
    if (this._blocked(nx, this.pos.z, yLow, yHigh)) {
      // try stepping up onto a low obstacle (a threshold, a step)
      const g = this._groundAt(nx, this.pos.z, this.pos.y);
      if (g && g.y - this.pos.y > 0.02 && g.y - this.pos.y < STEP_UP &&
          !this._blocked(nx, this.pos.z, g.y + 0.35, g.y + BODY_H - 0.08)) {
        this.pos.x = nx; this.pos.y = g.y;
      } else { nx = this.pos.x; this.vel.x *= 0.2; }
    } else this.pos.x = nx;

    let nz = this.pos.z + this.vel.z * dt;
    if (this._blocked(this.pos.x, nz, yLow, yHigh)) {
      const g = this._groundAt(this.pos.x, nz, this.pos.y);
      if (g && g.y - this.pos.y > 0.02 && g.y - this.pos.y < STEP_UP &&
          !this._blocked(this.pos.x, nz, g.y + 0.35, g.y + BODY_H - 0.08)) {
        this.pos.z = nz; this.pos.y = g.y;
      } else { nz = this.pos.z; this.vel.z *= 0.2; }
    } else this.pos.z = nz;

    // ── vertical: follow the floor, fall if there isn't one
    const g = this._groundAt(this.pos.x, this.pos.z, this.pos.y);
    if (g) {
      this.groundY = g.y;
      this.surface = g.surface;
      const dy = g.y - this.pos.y;
      if (dy > -0.02) {
        // on or slightly below the floor → glue to it (stairs, thresholds)
        if (dy < STEP_UP) {
          if (!this.grounded && this.vel.y < -3.5) {
            this.landShock = clamp(-this.vel.y / 12, 0, 1);
            this.audio.play('land', { pos: this.head, volume: 0.5 });
          }
          this.pos.y = lerp(this.pos.y, g.y, Math.min(1, 22 * dt));
          if (Math.abs(this.pos.y - g.y) < 0.008) this.pos.y = g.y;
          this.vel.y = 0;
          this.grounded = true;
        }
      } else if (dy < -0.06) {
        this.grounded = false;
        this.vel.y -= GRAVITY * dt;
        this.pos.y += this.vel.y * dt;
        if (this.pos.y < g.y) { this.pos.y = g.y; this.vel.y = 0; this.grounded = true; }
      } else {
        this.pos.y = g.y; this.vel.y = 0; this.grounded = true;
      }
    } else {
      this.grounded = false;
      this.vel.y -= GRAVITY * dt;
      this.pos.y += this.vel.y * dt;
      if (this.pos.y < -12) { this.pos.y = -3.3; this.vel.y = 0; }   // never lose the player
    }

    // ── lean
    const wantLean = frozen ? 0 : (input.down('KeyQ') ? -1 : 0);
    this.leaning = damp(this.leaning, wantLean, 8, dt);

    // ── head movement
    const hspeed = Math.hypot(this.vel.x, this.vel.z);
    this.travel += hspeed * dt;
    const bobTarget = this.grounded ? clamp(hspeed / WALK, 0, 1.7) : 0;
    this.bobAmount = damp(this.bobAmount, bobTarget, 7, dt);
    this.bobPhase += hspeed * dt * (this.sprinting ? 4.4 : 5.2);
    this.breath += dt * (this.sprinting ? 2.4 : 1.05);
    this.landShock = damp(this.landShock, 0, 5, dt);
    this.recoil = damp(this.recoil, 0, 6, dt);

    const bobK = this.settings.bob;
    const bobY = Math.sin(this.bobPhase * 2) * 0.032 * this.bobAmount * bobK;
    const bobX = Math.cos(this.bobPhase) * 0.038 * this.bobAmount * bobK;
    const bobRoll = Math.cos(this.bobPhase) * 0.014 * this.bobAmount * bobK;
    const breathY = Math.sin(this.breath) * (0.008 + (1 - this.stamina) * 0.016);
    const breathX = Math.sin(this.breath * 0.6) * 0.006;

    this.swayX = damp(this.swayX, bobX + breathX + this.leaning * 0.42, 16, dt);
    this.swayY = damp(this.swayY, bobY + breathY - this.landShock * 0.22, 16, dt);

    // ── apply to camera
    const cam = this.camera;
    cam.position.set(
      this.pos.x + this.swayX * c,
      this.pos.y + this.eye + this.swayY,
      this.pos.z - this.swayX * s
    );
    cam.rotation.set(0, 0, 0);
    cam.rotateY(this.yaw);
    cam.rotateX(this.pitch - this.recoil);
    cam.rotateZ(bobRoll + this.leaning * 0.2 + (opts.tiltZ || 0));

    cam.getWorldDirection(this.fwd);
    this.right.set(-this.fwd.z, 0, this.fwd.x).normalize();

    // ── footsteps
    if (this.grounded && hspeed > 0.5) {
      const stride = this.crouching ? 1.05 : this.sprinting ? 0.92 : 0.78;
      this.stepAccum += hspeed * dt;
      if (this.stepAccum > stride) {
        this.stepAccum = 0;
        this.audio.play('step', {
          pos: new THREE.Vector3(this.pos.x, this.pos.y + 0.1, this.pos.z),
          surface: this.surface,
          volume: (this.crouching ? 0.28 : this.sprinting ? 0.95 : 0.62) * (0.85 + Math.random() * 0.3),
          rate: 0.92 + Math.random() * 0.18,
          reverb: 0.24, hall: Math.abs(this.pos.x) > 10,
        });
      }
    } else if (hspeed < 0.2) this.stepAccum = Math.max(this.stepAccum, 0.55);

    // ── torch
    this.updateTorch(dt, opts);
  }

  updateTorch(dt, opts = {}) {
    if (this.torchOn && this.battery > 0) {
      this.battery = clamp(this.battery - dt * this.batteryDrain, 0, 1);
    }
    if (this.battery <= 0 && this.torchOn) {
      this.torchOn = false;
      this.audio.play('switch', { volume: 0.5 });
    }

    // the beam lags a little behind the head — it is in your hand, not your eye
    const cam = this.camera;
    const off = new THREE.Vector3(0.22, -0.16, 0).applyQuaternion(cam.quaternion);
    const from = cam.position.clone().add(off);
    this.spot.position.lerp(from, Math.min(1, 24 * dt));
    const aim = cam.position.clone().add(this.fwd.clone().multiplyScalar(9));
    this.spotTarget.position.lerp(aim, Math.min(1, 16 * dt));
    this.torchGlow.position.copy(this.spot.position);

    // flicker as the cell dies, plus whatever the game is imposing
    let level = 0;
    if (this.torchOn && this.battery > 0) {
      const low = clamp(this.battery / 0.22, 0, 1);
      const jitter = this.battery < 0.22
        ? (Math.sin(performance.now() * 0.021) * 0.5 + 0.5) * (1 - low) * 0.75 +
          (Math.random() < 0.02 * (1 - low) ? 0.9 : 0)
        : 0;
      level = clamp((0.55 + this.battery * 0.45) * (1 - jitter) * (1 - (opts.torchSuppress || 0)), 0, 1);
    }
    this.torchFail = damp(this.torchFail, level, 22, dt);
    this.spot.intensity = this.torchFail * 58;       // candela — three uses physical units
    this.spot.distance = 16 + this.torchFail * 14;
    this.torchGlow.intensity = this.torchFail * 1.6;

    // volumetric cone follows the beam
    const len = this.spot.distance * 0.8;
    const rad = Math.tan(this.spot.angle) * len;
    this.cone.visible = this.coneEnabled !== false && this.torchFail > 0.03;
    if (this.cone.visible) {
      this.cone.position.copy(this.spot.position);
      this.cone.lookAt(this.spotTarget.position);
      this.cone.scale.set(rad, rad, len);
      this.cone.material.opacity = this.torchFail * 0.055;
    }
  }

  toggleTorch() {
    if (this.battery <= 0) {
      this.audio.play('click', { volume: 0.6 });
      return false;
    }
    this.torchOn = !this.torchOn;
    this.audio.play('switch', { volume: 0.6 });
    return this.torchOn;
  }

  reload() {
    this.battery = 1;
    this.audio.play('click', { volume: 0.7 });
  }
}
