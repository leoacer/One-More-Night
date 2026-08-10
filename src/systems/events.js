// ══════════════════════════════════════════════════════════════════════
//  The director. Scripted beats from the night plan, ambient noise that
//  is almost always nothing, the dread meter, and the small business of
//  moving objects while the player is looking somewhere else.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { clamp, damp, makeRng } from '../core/util.js';
import { levelY } from '../world/layout.js';

const AMBIENT = [
  { s: 'creak', w: 3, sub: 'Something settles, one floor up.' },
  { s: 'pipe_clank', w: 3, sub: 'A pipe knocks, somewhere in the wall.' },
  { s: 'drip', w: 4, sub: null },
  { s: 'wood_groan', w: 2, sub: 'The building shifts its weight.' },
  { s: 'drop', w: 1.2, sub: 'Something falls over in an empty room.' },
  { s: 'door_close', w: 1.0, sub: 'A door closes, further away than it sounds.' },
  { s: 'knock', w: 0.7, sub: 'Knocking. Three times. Not at your door.' },
  { s: 'voices', w: 1.4, sub: 'Muffled conversation through a wall.' },
  { s: 'footsteps', w: 1.6, sub: 'Footsteps on the stair above you.' },
];

export class Director {
  constructor(game) {
    this.game = game;
    this.audio = game.audio;
    this.rng = makeRng('director');
    this.timeline = [];
    this.nextAmbient = 8;
    this.dread = 0;
    this.thunderIn = 20 + Math.random() * 30;
    this.observed = new Set();
    this.movedIndex = 0;
    this.whisperIn = 45;
    this.lastLitTime = 0;
  }

  begin(plan) {
    this.plan = plan;
    this.timeline = (plan.events || []).map((e) => ({ ...e, fired: false }));
    this.observed = new Set();
    this.dread = 0;
    this.nextAmbient = 6 + this.rng.range(0, 8);
    this.thunderIn = 15 + this.rng.range(0, 35);
    this.movedIndex = 0;
  }

  posFor(where, player, camDir) {
    const p = player.pos;
    switch (where) {
      case 'behind':
        return new THREE.Vector3(p.x - camDir.x * 2.6 + (Math.random() - 0.5), p.y + 1.5, p.z - camDir.z * 2.6 + (Math.random() - 0.5));
      case 'above':
        return new THREE.Vector3(p.x + this.rng.range(-4, 4), p.y + 3.4, p.z + this.rng.range(-3, 3));
      case 'below':
        return new THREE.Vector3(p.x + this.rng.range(-4, 4), p.y - 3.0, p.z + this.rng.range(-3, 3));
      case 'far':
        return new THREE.Vector3(p.x + this.rng.range(-16, 16), p.y + 1.2, p.z + this.rng.range(-8, 8));
      case 'near':
        return new THREE.Vector3(p.x + this.rng.range(-3.5, 3.5), p.y + this.rng.range(0.2, 2.2), p.z + this.rng.range(-3.5, 3.5));
      case 'stairs':
        return new THREE.Vector3(13, p.y + this.rng.range(-2, 4), 0);
      case 'corridor':
        return new THREE.Vector3(this.rng.range(-9, 9), p.y + 1.2, 0);
      case 'wall':
        return new THREE.Vector3(p.x + this.rng.range(-2, 2), p.y + 1.3, p.z + (this.rng.chance(0.5) ? 2.4 : -2.4));
      case 'newdoor':
        return new THREE.Vector3(-3.5, levelY(2) + 1.4, -1.4);
      case 'self':
        return null;
      default:
        return new THREE.Vector3(p.x, p.y + 1.4, p.z);
    }
  }

  fireSound(name, where, player, camDir, opts = {}) {
    const pos = this.posFor(where, player, camDir);
    if (name === 'footsteps') {
      // a short run of steps that arrives nowhere
      const n = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        this.audio.play('step', {
          pos: pos ? pos.clone().add(new THREE.Vector3(i * 0.5 - 1, 0, 0)) : null,
          surface: where === 'stairs' ? 'concrete' : 'carpet',
          volume: 0.34, rate: 0.86, delay: i * 0.44, hall: where === 'stairs', reverb: 0.4,
        });
      }
      return;
    }
    this.audio.play(name, { pos, hall: where === 'stairs', reverb: 0.3, ...opts });
  }

  update(dt, ctx) {
    const { player, camDir, elapsed, lit } = ctx;
    const g = this.game;

    // ── scripted beats
    for (const e of this.timeline) {
      if (e.fired || elapsed < e.at) continue;
      e.fired = true;
      this.run(e, ctx);
    }

    // ── ambient noise, weighted
    this.nextAmbient -= dt;
    if (this.nextAmbient <= 0) {
      this.nextAmbient = 11 + this.rng.range(0, 26) - this.plan.night * 0.8;
      const total = AMBIENT.reduce((a, x) => a + x.w, 0);
      let r = this.rng.range(0, total);
      let pick = AMBIENT[0];
      for (const a of AMBIENT) { r -= a.w; if (r <= 0) { pick = a; break; } }
      const where = this.rng.pick(['above', 'below', 'far', 'wall', 'corridor', 'stairs', 'near']);
      this.fireSound(pick.s, where, player, camDir, { volume: 0.5 + this.rng.range(0, 0.35), dur: 3 });
      if (pick.sub) g.hud.say(pick.sub, null, 'sfx', 2.6);
    }

    // ── weather
    this.thunderIn -= dt;
    if (this.thunderIn <= 0) {
      this.thunderIn = 34 + this.rng.range(0, 70);
      this.audio.play('thunder', { volume: 0.45 + this.rng.range(0, 0.3) });
      g.lightningFlash(0.5 + Math.random() * 0.6);
    }

    // ── dread: darkness and being followed
    const darkness = lit ? -0.5 : (player.torchOn && player.battery > 0 ? 0.05 : 0.24);
    const followerNear = g.npcs.follower.active
      ? clamp(1.6 - g.npcs.follower.pos.distanceTo(player.pos) / 12, 0, 1) : 0;
    this.dread = clamp(this.dread + (darkness + followerNear * 0.5) * dt * 0.34, 0, 1);
    if (lit) this.dread = damp(this.dread, 0, 0.5, dt);

    // audio consequences of dread
    this.audio.bed('tinnitus', this.dread * 0.05, { fade: 1.5 });
    this.audio.bed('drone', 0.03 + this.plan.night * 0.012 + this.dread * 0.06, { fade: 2 });

    this.whisperIn -= dt * (0.4 + this.dread * 2.2);
    if (this.whisperIn <= 0) {
      this.whisperIn = 40 + this.rng.range(0, 60);
      if (this.dread > 0.35) {
        this.audio.playBehind('whisper', camDir, 2.4, { volume: 0.3 + this.dread * 0.3, dur: 1.6 });
        if (this.dread > 0.7) g.hud.whisperText(this.rng.pick(['SHUT THE DOOR', 'ONE MORE', 'SEVEN', 'YOU ARE LATE', 'AGAIN']));
      }
    }

    // ── observations: things you only notice if you get close and look
    for (const o of this.plan.observations || []) {
      if (this.observed.has(o.id)) continue;
      const lv = Math.round(player.pos.y / 3.3);
      if (o.lv !== lv) continue;
      const d = Math.hypot(player.pos.x - o.x, player.pos.z - o.z);
      if (d > (o.r || 3)) continue;
      // must be roughly facing it
      const to = new THREE.Vector3(o.x - player.pos.x, 0, o.z - player.pos.z).normalize();
      if (to.dot(new THREE.Vector3(camDir.x, 0, camDir.z).normalize()) < 0.25 && d > 1.4) continue;
      this.observed.add(o.id);
      g.observe(o);
    }
  }

  run(e, ctx) {
    const g = this.game;
    const { player, camDir } = ctx;
    switch (e.type) {
      case 'sfx':
        this.fireSound(e.sound, e.where, player, camDir, { volume: 0.62, dur: 2.4 });
        if (e.sound === 'knock') g.hud.say('Knocking. Three times, unhurried.', null, 'sfx', 3);
        break;
      case 'voices':
        this.audio.play('voices', { pos: this.posFor('wall', player, camDir), volume: 0.5, dur: 5 });
        g.hud.say('Two people talking, on the other side of a wall that has no room behind it.', null, 'sfx', 4);
        break;
      case 'footsteps':
        this.fireSound('footsteps', e.where, player, camDir);
        g.hud.say('Footsteps. They stop when you stop.', null, 'sfx', 3);
        break;
      case 'lights_dip':
        g.lights.triggerDip(1.6 + Math.random() * 2.2);
        this.audio.play('zap', { volume: 0.4 });
        this.audio.play('flicker', { volume: 0.5, delay: 0.1 });
        break;
      case 'moved_behind':
        g.moveSomethingBehind();
        break;
      case 'ilse_vanish':
        g.onIlseVanished();
        break;
      default:
        break;
    }
  }
}
