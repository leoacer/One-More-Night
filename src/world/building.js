// ══════════════════════════════════════════════════════════════════════
//  The building itself: slabs, walls, doors, the stairwell, the lift,
//  the roof, and the dead city outside the windows.
//
//  Everything static lives in a per-level THREE.Group so the renderer can
//  drop whole floors out of the frustum in one go.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { GEO, LEVELS, ROOF_LEVEL, ROOMS, levelY, slotBounds, corridorLights } from './layout.js';
import { MAT } from './materials.js';
import * as P from './props.js';
import { makeRng } from '../core/util.js';
import { t } from '../core/i18n.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ── a door that swings ──────────────────────────────────────────────────
export class Door {
  constructor(pivot, panel, opts) {
    this.pivot = pivot;
    this.panel = panel;
    this.id = opts.id;
    this.roomId = opts.roomId || null;
    this.locked = !!opts.locked;
    this.sealed = !!opts.sealed;
    this.keyItem = opts.keyItem || null;
    this.open = false;
    this.angle = 0;
    this.target = 0;
    this.swing = opts.swing ?? -Math.PI * 0.62;
    this.collider = opts.collider;
    this.label = opts.label || '';
    this.creakPos = opts.creakPos;
    this.autoCloses = opts.autoCloses ?? false;
    this._t = 0;
  }
  toggle() {
    this.open = !this.open;
    this.target = this.open ? 1 : 0;
    return this.open;
  }
  setOpen(v) { this.open = v; this.target = v ? 1 : 0; }
  update(dt) {
    if (Math.abs(this.angle - this.target) < 0.001) {
      this.angle = this.target;
    } else {
      const speed = this.target > this.angle ? 2.6 : 3.6;
      this.angle += Math.sign(this.target - this.angle) * Math.min(Math.abs(this.target - this.angle), dt * speed);
    }
    this.pivot.rotation.y = this.swing * this.angle;
    if (this.collider) this.collider.disabled = this.angle > 0.22;
  }
  /** Nudge a closed door a few degrees — used when something is on the other side. */
  creak(amount = 0.12) { this.target = Math.max(this.target, amount); }
}

export class Building {
  constructor(scene, plan) {
    this.scene = scene;
    this.plan = plan;                 // NightPlan: locks, moved things, extra rooms
    this.rng = makeRng(`build-${plan.night}-${plan.seed}`);

    this.root = new THREE.Group();
    scene.add(this.root);

    this.levelGroups = new Map();
    this.colliders = [];
    this.walkable = [];               // meshes hit by the downward floor probe
    this.interactMeshes = [];
    this.doors = new Map();
    this.rooms = new Map();
    this.lightEmitters = [];
    this.bulbs = new Map();           // emitterId → emissive mesh
    this.props = new Map();           // tag → object, for the "things move" system
    this.movables = [];               // clutter the building is allowed to rearrange
    this.windows = [];
    this.dynamic = [];                // things needing per-frame update
  }

  // ── low-level helpers ─────────────────────────────────────────────────

  group(lv) {
    if (!this.levelGroups.has(lv)) {
      const g = new THREE.Group();
      g.name = `level_${lv}`;
      this.root.add(g);
      this.levelGroups.set(lv, g);
    }
    return this.levelGroups.get(lv);
  }

  addCollider(x0, x1, y0, y1, z0, z1, meta) {
    const c = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0, y1,
      z0: Math.min(z0, z1), z1: Math.max(z0, z1), disabled: false, ...meta };
    this.colliders.push(c);
    return c;
  }

  static MOVABLE = new Set(['crate', 'box', 'chair', 'bucket', 'papers', 'bottle', 'news', 'mug', 'suitcase', 'stool']);

  addMesh(lv, mesh, { solid = false, walk = false, collideBox = null } = {}) {
    this.group(lv).add(mesh);
    mesh.updateMatrixWorld(true);
    if (Building.MOVABLE.has(mesh.userData.tag)) this.movables.push({ mesh, lv, home: mesh.position.clone() });
    if (walk) { this.walkable.push(mesh); mesh.userData.walkable = true; }
    if (solid) {
      const b = collideBox || new THREE.Box3().setFromObject(mesh);
      this.addCollider(b.min.x, b.max.x, b.min.y, b.max.y, b.min.z, b.max.z);
    }
    return mesh;
  }

  /** Register a mesh (or group) as something the player can look at and press E on. */
  interact(obj, data) {
    obj.traverse((c) => { if (c.isMesh) { c.userData.interactRoot = obj; this.interactMeshes.push(c); } });
    obj.userData.interact = data;
    return obj;
  }

  /**
   * Build an axis-aligned wall with rectangular holes punched in it.
   *  axis 'x' → wall runs along X, sits at z = at
   *  axis 'z' → wall runs along Z, sits at x = at
   */
  wall({ lv, axis, at, from, to, yBase, height, mat, thickness = GEO.WALL_T, holes = [], collide = true, walk = false }) {
    const th = thickness;
    const segs = [];
    const hs = holes.slice().sort((a, b) => a.a0 - b.a0);
    let cur = from;
    for (const h of hs) {
      const a0 = Math.max(from, h.a0), a1 = Math.min(to, h.a1);
      if (a1 <= cur) continue;
      if (a0 > cur) segs.push({ a0: cur, a1: a0, y0: yBase, y1: yBase + height });
      const hy0 = yBase + (h.y0 ?? 0), hy1 = yBase + (h.y1 ?? height);
      if (hy0 > yBase) segs.push({ a0, a1, y0: yBase, y1: hy0 });
      if (hy1 < yBase + height) segs.push({ a0, a1, y0: hy1, y1: yBase + height });
      cur = Math.max(cur, a1);
    }
    if (cur < to) segs.push({ a0: cur, a1: to, y0: yBase, y1: yBase + height });

    const out = [];
    for (const s of segs) {
      const len = s.a1 - s.a0, h = s.y1 - s.y0;
      if (len <= 0.001 || h <= 0.001) continue;
      const m = axis === 'x'
        ? P.box(len, h, th, mat, (s.a0 + s.a1) / 2, (s.y0 + s.y1) / 2, at)
        : P.box(th, h, len, mat, at, (s.y0 + s.y1) / 2, (s.a0 + s.a1) / 2);
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      this.group(lv).add(m);
      out.push(m);
      if (collide) {
        if (axis === 'x') this.addCollider(s.a0, s.a1, s.y0, s.y1, at - th / 2, at + th / 2);
        else this.addCollider(at - th / 2, at + th / 2, s.y0, s.y1, s.a0, s.a1);
      }
      if (walk) { this.walkable.push(m); m.userData.walkable = true; }
    }
    return out;
  }

  slab({ lv, x0, x1, z0, z1, y, mat, thick = 0.2, walk = true, ceiling = false }) {
    const m = P.box(x1 - x0, thick, z1 - z0, mat, (x0 + x1) / 2, y - thick / 2, (z0 + z1) / 2);
    m.matrixAutoUpdate = false; m.updateMatrix();
    m.castShadow = false;
    this.group(lv).add(m);
    if (walk && !ceiling) { this.walkable.push(m); m.userData.walkable = true; }
    return m;
  }

  // ── doors ─────────────────────────────────────────────────────────────

  makeDoor({ lv, id, roomId, axis, at, center, yBase, texture = 'door', locked = false, sealed = false,
    keyItem = null, label = '', width = GEO.DOOR_W, height = GEO.DOOR_H, flip = false, plate = null,
    peep = true, interactData = null }) {
    const g = this.group(lv);
    const pivot = new THREE.Group();
    const hingeOffset = (flip ? -1 : 1) * (width / 2);
    if (axis === 'x') pivot.position.set(center - hingeOffset, yBase, at);
    else pivot.position.set(at, yBase, center - hingeOffset);

    const panelMat = sealed ? MAT.flat(0x2b2622, 0.9, 0.02) : MAT.door(texture);
    const panel = P.box(width, height, 0.055, panelMat, hingeOffset, height / 2, 0);
    if (axis === 'z') { panel.rotation.y = Math.PI / 2; panel.position.set(0, height / 2, hingeOffset); }
    pivot.add(panel);

    // handle
    const hx = hingeOffset * -0.72;
    const handle = P.cyl(0.018, 0.11, MAT.brass(), 0, 0, 0);
    handle.rotation.x = Math.PI / 2;
    if (axis === 'x') handle.position.set(hx, height * 0.5, 0.07);
    else handle.position.set(0.07, height * 0.5, hx);
    if (axis === 'z') handle.rotation.z = Math.PI / 2;
    pivot.add(handle);
    const rose = P.cyl(0.035, 0.02, MAT.brass(), 0, 0, 0);
    rose.rotation.x = Math.PI / 2;
    if (axis === 'x') rose.position.set(hx, height * 0.5, 0.035);
    else rose.position.set(0.035, height * 0.5, hx);
    pivot.add(rose);

    if (peep && !sealed) {
      const ph = P.cyl(0.012, 0.03, MAT.brass(), 0, 0, 0);
      ph.rotation.x = Math.PI / 2;
      if (axis === 'x') ph.position.set(0, height * 0.78, 0.04);
      else ph.position.set(0.04, height * 0.78, 0);
      pivot.add(ph);
    }
    if (sealed) {
      // nailed-on boards
      for (let i = 0; i < 3; i++) {
        const b = P.box(width * 1.12, 0.13, 0.03, MAT.flat(0x4a3a2a, 0.92, 0),
          hingeOffset, height * (0.26 + i * 0.26), 0.05);
        b.rotation.z = (i - 1) * 0.06;
        if (axis === 'z') { b.rotation.y = Math.PI / 2; b.position.set(0.05, height * (0.26 + i * 0.26), hingeOffset); }
        pivot.add(b);
      }
    }

    g.add(pivot);

    // frame
    const fm = MAT.flat(0x3a3128, 0.86, 0.02);
    const fT = 0.09;
    if (axis === 'x') {
      g.add(P.box(fT, height + fT, 0.22, fm, center - width / 2 - fT / 2, yBase + (height + fT) / 2, at));
      g.add(P.box(fT, height + fT, 0.22, fm, center + width / 2 + fT / 2, yBase + (height + fT) / 2, at));
      g.add(P.box(width + fT * 2, fT, 0.22, fm, center, yBase + height + fT / 2, at));
    } else {
      g.add(P.box(0.22, height + fT, fT, fm, at, yBase + (height + fT) / 2, center - width / 2 - fT / 2));
      g.add(P.box(0.22, height + fT, fT, fm, at, yBase + (height + fT) / 2, center + width / 2 + fT / 2));
      g.add(P.box(0.22, fT, width + fT * 2, fm, at, yBase + height + fT / 2, center));
    }

    // number plate beside the door
    if (plate) {
      const pl = P.numberPlate(plate);
      const off = width / 2 + 0.22;
      if (axis === 'x') { pl.position.set(center + off, yBase + 1.62, at + (flip ? -0.1 : 0.1)); pl.rotation.y = flip ? Math.PI : 0; }
      else { pl.position.set(at + (flip ? -0.1 : 0.1), yBase + 1.62, center + off); pl.rotation.y = flip ? -Math.PI / 2 : Math.PI / 2; }
      g.add(pl);
      this.props.set(`plate_${id}`, pl);
    }

    const col = axis === 'x'
      ? this.addCollider(center - width / 2, center + width / 2, yBase, yBase + height, at - 0.06, at + 0.06)
      : this.addCollider(at - 0.06, at + 0.06, yBase, yBase + height, center - width / 2, center + width / 2);

    const door = new Door(pivot, panel, {
      id, roomId, locked, sealed, keyItem, collider: col, label,
      swing: (flip ? 1 : -1) * Math.PI * 0.62,
      creakPos: axis === 'x' ? V(center, yBase + 1.2, at) : V(at, yBase + 1.2, center),
    });
    if (sealed) { door.collider.disabled = false; door.locked = true; }
    this.doors.set(id, door);

    this.interact(pivot, interactData || { type: 'door', doorId: id, roomId });
    pivot.userData.doorId = id;
    return door;
  }

  // ── structure ─────────────────────────────────────────────────────────

  buildLevelShell(lv) {
    const y = levelY(lv);
    const H = GEO.CEIL_H;
    const basement = lv === -1;
    const floorMatCorridor = basement ? MAT.tile([8, 2], true) : MAT.carpet([9, 2]);
    const ceilMat = MAT.ceiling([6, 2]);

    // full-footprint slab (rooms use their own floor finish on top)
    this.slab({ lv, x0: -10, x1: 10, z0: GEO.S_Z0, z1: GEO.N_Z1, y, mat: MAT.plaster(2, [8, 6], true), thick: 0.3 });
    // corridor finish
    const cf = P.box(20, 0.02, GEO.COR_Z1 - GEO.COR_Z0, floorMatCorridor, 0, y + 0.011, 0);
    cf.matrixAutoUpdate = false; cf.updateMatrix();
    this.group(lv).add(cf);
    this.walkable.push(cf); cf.userData.walkable = true;
    cf.userData.surface = basement ? 'tile' : 'carpet';

    // ceiling
    this.slab({ lv, x0: -10, x1: 10, z0: GEO.S_Z0, z1: GEO.N_Z1, y: y + H + 0.2, mat: ceilMat, thick: 0.2, walk: false, ceiling: true });

    // ── corridor long walls, with a hole per room door
    const wpVariant = { '-1': 0, 0: 1, 1: 2, 2: 3, 3: 4 }[String(lv)] ?? 0;
    const corMat = basement ? MAT.plaster(3, [10, 2], true) : MAT.wallpaper(wpVariant, [8, 2]);

    for (const side of ['n', 's']) {
      const at = side === 'n' ? GEO.COR_Z1 : GEO.COR_Z0;
      const holes = [];
      for (const room of this.roomsOn(lv)) {
        if (room.side !== side) continue;
        const b = slotBounds(room.side, room.slot);
        const cx = (b.x0 + b.x1) / 2;
        holes.push({ a0: cx - GEO.DOOR_W / 2 - 0.04, a1: cx + GEO.DOOR_W / 2 + 0.04, y0: 0, y1: GEO.DOOR_H + 0.02 });
      }
      for (const extra of this.plan.extraDoors || []) {
        if (extra.lv === lv && extra.side === side) {
          holes.push({ a0: extra.x - GEO.DOOR_W / 2 - 0.04, a1: extra.x + GEO.DOOR_W / 2 + 0.04, y0: 0, y1: GEO.DOOR_H + 0.02 });
        }
      }
      this.wall({ lv, axis: 'x', at, from: -10, to: 10, yBase: y, height: H, mat: corMat, holes, thickness: 0.2 });
    }

    // ── corridor end walls. The west end is the lift shaft face and is
    //    built with the shaft itself, so only the stair end is needed here.
    this.wall({
      lv, axis: 'z', at: 10, from: GEO.COR_Z0, to: GEO.COR_Z1, yBase: y, height: H,
      mat: basement ? MAT.plaster(4, [2, 2], true) : MAT.plaster(5, [2, 2]),
      holes: [{ a0: -GEO.DOOR_W / 2 - 0.05, a1: GEO.DOOR_W / 2 + 0.05, y0: 0, y1: GEO.DOOR_H + 0.02 }], thickness: 0.24,
    });
    // stairwell door
    this.makeDoor({
      lv, id: `stair_${lv}`, axis: 'z', at: 10, center: 0, yBase: y, texture: 'metal',
      label: t('lbl.stairwell', 'Stairwell'), peep: false, flip: lv % 2 === 0,
    });
    // …and, once you have been here long enough to look down, what is
    // holding it open.
    if (lv === 0 && this.plan.night >= 5) {
      const wedge = P.box(0.2, 0.022, 0.15, MAT.flat(0x8b8473, 0.96, 0), 9.72, y + 0.013, 0.28);
      wedge.rotation.y = 0.2;
      this.group(lv).add(wedge);
      this.interact(wedge, { type: 'read', doc: 'wedge', label: t('lbl.wedge', 'Something under the door') });
    }

    // ── room partitions + outer envelope
    const outerMat = basement ? MAT.plaster(6, [10, 2], true) : MAT.wallpaper((wpVariant + 2) % 5, [8, 2]);
    for (const side of ['n', 's']) {
      const z0 = side === 'n' ? GEO.N_Z0 : GEO.S_Z0;
      const z1 = side === 'n' ? GEO.N_Z1 : GEO.S_Z1;
      // partitions between slots
      for (const px of [GEO.SLOTS[0][1] + (GEO.SLOTS[1][0] - GEO.SLOTS[0][1]) / 2,
        GEO.SLOTS[1][1] + (GEO.SLOTS[2][0] - GEO.SLOTS[1][1]) / 2]) {
        this.wall({ lv, axis: 'z', at: px, from: z0, to: z1, yBase: y, height: H, mat: outerMat, thickness: 0.2 });
      }
      // outer facade with windows
      const facadeZ = side === 'n' ? GEO.N_Z1 : GEO.S_Z0;
      const holes = [];
      if (!basement) {
        for (let s = 0; s < 3; s++) {
          const b = slotBounds(side, s);
          const cx = (b.x0 + b.x1) / 2;
          for (const dx of [-1.4, 1.4]) {
            holes.push({ a0: cx + dx - 0.55, a1: cx + dx + 0.55, y0: 0.95, y1: 2.35 });
          }
        }
      } else {
        for (let s = 0; s < 3; s++) {
          const b = slotBounds(side, s);
          const cx = (b.x0 + b.x1) / 2;
          holes.push({ a0: cx - 0.4, a1: cx + 0.4, y0: 2.3, y1: 2.7 });
        }
      }
      this.wall({ lv, axis: 'x', at: facadeZ, from: -10.1, to: 10.1, yBase: y, height: H, mat: outerMat, holes, thickness: 0.3 });
      for (const h of holes) this.addWindow(lv, 'x', facadeZ, (h.a0 + h.a1) / 2, y + h.y0, h.a1 - h.a0, h.y1 - h.y0, side === 'n' ? 1 : -1, basement);

      // end walls (x = ±10) for the outer rooms
      this.wall({ lv, axis: 'z', at: -10, from: z0, to: z1, yBase: y, height: H, mat: outerMat, thickness: 0.3 });
      this.wall({ lv, axis: 'z', at: 10, from: z0, to: z1, yBase: y, height: H, mat: outerMat, thickness: 0.3 });
    }

    // ── corridor lighting + fittings
    for (const em of corridorLights(lv)) {
      const fitting = em.kind === 'fluorescent' ? P.fluorescent(1.3) : P.pendantLamp();
      fitting.position.set(em.x, em.kind === 'fluorescent' ? y + GEO.CEIL_H : y + GEO.CEIL_H + 0.02, em.z);
      this.group(lv).add(fitting);
      const bulb = fitting.getObjectByName('bulb');
      this.registerEmitter({ ...em, lv, mesh: bulb });
    }

    // corridor dressing: skirting, pipes, a radiator, notices
    const skirt = MAT.flat(0x33291f, 0.9, 0.02);
    for (const zz of [GEO.COR_Z0 + 0.11, GEO.COR_Z1 - 0.11]) {
      const s = P.box(20, 0.14, 0.03, skirt, 0, y + 0.07, zz);
      s.matrixAutoUpdate = false; s.updateMatrix();
      this.group(lv).add(s);
    }
    const pr = P.pipeRun(19, 0.05, 'x', true);
    pr.position.set(0, y + GEO.CEIL_H - 0.16, GEO.COR_Z0 + 0.4);
    this.group(lv).add(pr);
    if (basement) {
      const pr2 = P.pipeRun(19, 0.075, 'x', true);
      pr2.position.set(0, y + GEO.CEIL_H - 0.34, GEO.COR_Z1 - 0.5);
      this.group(lv).add(pr2);
      const v = P.valve(); v.position.set(-4.2, y + GEO.CEIL_H - 0.34, GEO.COR_Z1 - 0.5);
      this.group(lv).add(v);
    }
    const rad = P.radiator(0.9);
    rad.position.set(GEO.SLOTS[1][0] - 0.4, y + 0.12, GEO.COR_Z1 - 0.22);
    this.addMesh(lv, rad, { solid: true });
    this.interact(rad, { type: 'examine', text: t('ex.radiator', 'A radiator, stone cold. It has been cold for longer than the blackout.') });

    // graffiti / stains, seeded per night so they drift
    const g = this.rng;
    for (let i = 0; i < 3; i++) {
      const tx = g.pick(['404', 'IT COUNTS US', 'no 4th floor', 'LEAVE', 'ONE MORE', 'we are the same', 'HE LISTENS']);
      const d = P.graffitiDecal(tx, 1.1, 1.1);
      const nSide = g.chance(0.5);
      d.position.set(g.range(-9, 9), y + g.range(1.1, 1.9), nSide ? GEO.COR_Z1 - 0.105 : GEO.COR_Z0 + 0.105);
      if (!nSide) d.rotation.y = Math.PI;
      this.group(lv).add(d);
    }
  }

  addWindow(lv, axis, at, center, yBottom, w, h, facing, small) {
    const g = this.group(lv);
    const fm = MAT.flat(0x2e2a24, 0.85, 0.03);
    const th = 0.34;
    // reveal
    if (axis === 'x') {
      g.add(P.box(w + 0.1, 0.06, th, fm, center, yBottom - 0.03, at));
      g.add(P.box(w + 0.1, 0.06, th, fm, center, yBottom + h + 0.03, at));
      g.add(P.box(0.06, h, th, fm, center - w / 2 - 0.03, yBottom + h / 2, at));
      g.add(P.box(0.06, h, th, fm, center + w / 2 + 0.03, yBottom + h / 2, at));
      // mullions
      g.add(P.box(0.045, h, 0.05, fm, center, yBottom + h / 2, at));
      if (!small) g.add(P.box(w, 0.045, 0.05, fm, center, yBottom + h * 0.55, at));
      const pane = P.plane(w, h, MAT.windowPane(), center, yBottom + h / 2, at + facing * 0.02);
      pane.material.side = THREE.DoubleSide;
      pane.renderOrder = 2;
      g.add(pane);
      this.windows.push({ lv, pos: V(center, yBottom + h / 2, at), facing, mesh: pane });
      this.interact(pane, { type: 'window', lv });
    }
  }

  roomsOn(lv) {
    return ROOMS.filter((r) => r.lv === lv && !(this.plan.hiddenRooms || []).includes(r.id));
  }

  registerEmitter(em) {
    const e = {
      id: em.id, lv: em.lv, pos: V(em.x, em.y, em.z),
      color: em.color, baseIntensity: em.intensity, intensity: em.intensity,
      distance: em.distance || 8, on: em.on !== false, flicker: em.flicker || 0,
      mesh: em.mesh || null, phase: Math.random() * 100, kind: em.kind || 'pendant',
      broken: !!em.broken,
    };
    if (e.broken) { e.on = false; }
    this.lightEmitters.push(e);
    if (e.mesh) {
      this.bulbs.set(e.id, e.mesh);
      e.mesh.material = e.mesh.material.clone();
      e.mesh.material.emissiveIntensity = e.on ? 2.2 : 0.0;
    }
    return e;
  }

  // ── stairwell ─────────────────────────────────────────────────────────

  buildStairwell() {
    const lvKey = 'stairs';
    const g = new THREE.Group(); g.name = lvKey;
    this.root.add(g);
    this.stairGroup = g;
    const conc = MAT.plaster(7, [4, 4], true);
    const stepMat = MAT.tile([2, 1]);
    const X0 = GEO.STAIR_X0, X1 = GEO.STAIR_X1, Z0 = GEO.STAIR_Z0, Z1 = GEO.STAIR_Z1;
    const LX = GEO.LANDING_X1, MX = GEO.MIDLAND_X0;

    const addBox = (w, h, d, mat, x, y, z, solid, walk, surface) => {
      const m = P.box(w, h, d, mat, x, y, z);
      m.matrixAutoUpdate = false; m.updateMatrix();
      g.add(m);
      if (walk) { this.walkable.push(m); m.userData.walkable = true; m.userData.surface = surface || 'concrete'; }
      if (solid) this.addCollider(x - w / 2, x + w / 2, y - h / 2, y + h / 2, z - d / 2, z + d / 2);
      return m;
    };

    const topLv = ROOF_LEVEL;
    for (let lv = -1; lv <= topLv; lv++) {
      const y = levelY(lv);
      // entry landing
      addBox(LX - X0, 0.2, Z1 - Z0, conc, (X0 + LX) / 2, y - 0.1, 0, false, true, 'concrete');
      if (lv < topLv) {
        // up flight (south lane, z<0)
        const runX = MX - LX, rise = GEO.FLOOR_H / 2;
        const n = GEO.STEPS;
        for (let i = 0; i < n; i++) {
          const sx = LX + (i + 0.5) * (runX / n);
          const sy = y + (i + 1) * (rise / n);
          addBox(runX / n, 0.16, 2.8, stepMat, sx, sy - 0.08, -1.6, false, true, 'concrete');
          // riser
          addBox(0.04, rise / n, 2.8, conc, sx - runX / n / 2, sy - rise / n / 2, -1.6, false, false);
        }
        // mid landing
        addBox(X1 - MX, 0.2, Z1 - Z0, conc, (MX + X1) / 2, y + rise - 0.1, 0, false, true, 'concrete');
        // second flight (north lane, z>0), rising back toward the entry landing of lv+1
        for (let i = 0; i < n; i++) {
          const sx = MX - (i + 0.5) * (runX / n);
          const sy = y + rise + (i + 1) * (rise / n);
          addBox(runX / n, 0.16, 2.8, stepMat, sx, sy - 0.08, 1.6, false, true, 'concrete');
          addBox(0.04, rise / n, 2.8, conc, sx + runX / n / 2, sy - rise / n / 2, 1.6, false, false);
        }
      }

      // shaft walls for this level
      const H = GEO.FLOOR_H;
      const wallH = H;
      // east wall with a window
      const winC = 0, winW = 1.4, winH = 1.5, winY = y + 1.0;
      const holes = lv >= 0 && lv < topLv ? [{ a0: winC - winW / 2, a1: winC + winW / 2, y0: 1.0, y1: 1.0 + winH }] : [];
      this._stairWall(g, 'z', X1, Z0, Z1, y, wallH, conc, holes);
      if (holes.length) {
        const fm = MAT.flat(0x2e2a24, 0.85, 0.03);
        g.add(P.box(0.06, winH, 0.06, fm, X1, winY + winH / 2, winC));
        const pane = P.plane(winW, winH, MAT.windowPane(), X1 - 0.03, winY + winH / 2, winC);
        pane.rotation.y = -Math.PI / 2;
        pane.material.side = THREE.DoubleSide;
        g.add(pane);
        this.interact(pane, { type: 'window', lv });
      }
      this._stairWall(g, 'x', Z0, X0, X1, y, wallH, conc, []);
      this._stairWall(g, 'x', Z1, X0, X1, y, wallH, conc, []);
      // west wall shared with corridor is built by the level shell; the
      // basement and roof still need theirs
      if (lv === topLv) this._stairWall(g, 'z', X0, Z0, Z1, y, wallH, conc, [{ a0: -0.55, a1: 0.55, y0: 0, y1: 2.1 }]);

      // spine between the two lanes
      addBox(MX - LX, 1.0, 0.16, conc, (LX + MX) / 2, y + GEO.FLOOR_H / 2 + 0.5, 0, true, false);
      // balustrade
      const rail = P.cyl(0.028, MX - LX, MAT.metal(true), (LX + MX) / 2, y + GEO.FLOOR_H / 2 + 1.05, 0);
      rail.rotation.z = Math.PI / 2;
      g.add(rail);

      // light
      this.registerEmitter({
        id: `stair_${lv}`, lv: 'stairs', x: (X0 + LX) / 2 + 0.4, y: y + GEO.CEIL_H, z: 0,
        color: 0xcfd8e0, intensity: 3.0, distance: 9, kind: 'fluorescent',
        mesh: (() => {
          const f = P.fluorescent(1.0);
          f.position.set((X0 + LX) / 2 + 0.4, y + GEO.CEIL_H, 0);
          g.add(f);
          return f.getObjectByName('bulb');
        })(),
        broken: lv === -1 || lv === 3,
      });
    }

    // floor-4 debris blocker (removed on Night 4+)
    if (!this.plan.floor4Open) {
      const y = levelY(2) + GEO.FLOOR_H / 2;
      const junk = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const c = P.crate(0.4 + this.rng.range(0, 0.3));
        c.position.set(GEO.LANDING_X1 + this.rng.range(0.3, 2.4), y + this.rng.range(0, 0.9), this.rng.range(-2.6, -0.6));
        c.rotation.y = this.rng.range(0, 3);
        junk.add(c);
      }
      const board = P.box(2.6, 0.12, 2.7, MAT.flat(0x4a3a2a, 0.92, 0), GEO.LANDING_X1 + 1.3, y + 1.3, -1.6);
      board.rotation.z = 0.2;
      junk.add(board);
      g.add(junk);
      this.addCollider(GEO.LANDING_X1, GEO.MIDLAND_X0, y - 0.4, y + 2.2, -3.0, -0.2, { tag: 'debris' });
      this.interact(junk, { type: 'examine', text: t('ex.stairJunk', 'The stair up to the fourth floor is packed with junk — crates, a wardrobe door, something heavy underneath. Someone did this deliberately.') });
      this.stairBlock = junk;
    }
  }

  _stairWall(g, axis, at, from, to, yBase, height, mat, holes) {
    const th = 0.24;
    const segs = [];
    const hs = holes.slice().sort((a, b) => a.a0 - b.a0);
    let cur = from;
    for (const h of hs) {
      if (h.a0 > cur) segs.push({ a0: cur, a1: h.a0, y0: yBase, y1: yBase + height });
      const hy0 = yBase + h.y0, hy1 = yBase + h.y1;
      if (hy0 > yBase) segs.push({ a0: h.a0, a1: h.a1, y0: yBase, y1: hy0 });
      if (hy1 < yBase + height) segs.push({ a0: h.a0, a1: h.a1, y0: hy1, y1: yBase + height });
      cur = h.a1;
    }
    if (cur < to) segs.push({ a0: cur, a1: to, y0: yBase, y1: yBase + height });
    for (const s of segs) {
      const len = s.a1 - s.a0, hh = s.y1 - s.y0;
      if (len <= 0.001 || hh <= 0.001) continue;
      const m = axis === 'x'
        ? P.box(len, hh, th, mat, (s.a0 + s.a1) / 2, (s.y0 + s.y1) / 2, at)
        : P.box(th, hh, len, mat, at, (s.y0 + s.y1) / 2, (s.a0 + s.a1) / 2);
      m.matrixAutoUpdate = false; m.updateMatrix();
      g.add(m);
      if (axis === 'x') this.addCollider(s.a0, s.a1, s.y0, s.y1, at - th / 2, at + th / 2);
      else this.addCollider(at - th / 2, at + th / 2, s.y0, s.y1, s.a0, s.a1);
    }
  }

  // ── lift ──────────────────────────────────────────────────────────────

  buildElevator() {
    const g = new THREE.Group(); g.name = 'elevator';
    this.root.add(g);
    this.elevGroup = g;
    const X0 = GEO.ELEV_X0, X1 = GEO.ELEV_X1, Z0 = GEO.ELEV_Z0, Z1 = GEO.ELEV_Z1;
    const conc = MAT.plaster(8, [3, 8], true);

    // shaft walls, full height
    const yBot = levelY(-1) - 1.2, yTop = levelY(ROOF_LEVEL) + 0.5;
    const H = yTop - yBot;
    const wallBox = (w, h, d, x, y, z) => {
      const m = P.box(w, h, d, conc, x, y, z);
      m.matrixAutoUpdate = false; m.updateMatrix();
      g.add(m);
      this.addCollider(x - w / 2, x + w / 2, y - h / 2, y + h / 2, z - d / 2, z + d / 2);
    };
    wallBox(X1 - X0, H, 0.24, (X0 + X1) / 2, yBot + H / 2, Z0 - 0.12);
    wallBox(X1 - X0, H, 0.24, (X0 + X1) / 2, yBot + H / 2, Z1 + 0.12);
    wallBox(0.24, H, Z1 - Z0 + 0.5, X0 - 0.12, yBot + H / 2, (Z0 + Z1) / 2);
    // shaft bottom + top
    const pit = P.box(X1 - X0, 0.3, Z1 - Z0, conc, (X0 + X1) / 2, yBot, (Z0 + Z1) / 2);
    g.add(pit);

    // per-level landing doors
    this.elevDoors = new Map();
    for (const lv of LEVELS) {
      const y = levelY(lv);
      const doorW = 1.5, doorH = 2.25;
      // the wall face at x = ELEV_X1 with the opening
      this._stairWall(g, 'z', X1, Z0, Z1, y, GEO.FLOOR_H, conc,
        [{ a0: -doorW / 2, a1: doorW / 2, y0: 0, y1: doorH }]);
      // a dark recess so the opening never reads as flat wall
      g.add(P.box(0.04, doorH, doorW, MAT.flat(0x08090b, 1, 0), X1 - 0.16, y + doorH / 2, 0));
      // sliding leaves, with a gap down the middle
      const leaves = new THREE.Group();
      for (const s of [-1, 1]) {
        const leaf = P.box(0.06, doorH, doorW / 2 - 0.03, MAT.metal(), X1 - 0.02, y + doorH / 2, s * (doorW / 4 + 0.015));
        leaf.userData.baseZ = s * doorW / 4;
        leaf.userData.dir = s;
        leaves.add(leaf);
      }
      g.add(leaves);
      const col = this.addCollider(X1 - 0.08, X1 + 0.04, y, y + doorH, -doorW / 2, doorW / 2, { tag: 'elevdoor' });
      this.elevDoors.set(lv, { leaves, collider: col, open: 0, y });

      // call button + indicator
      const panel = P.box(0.12, 0.22, 0.05, MAT.metal(true), X1 + 0.06, y + 1.15, doorW / 2 + 0.28);
      g.add(panel);
      const btn = P.cyl(0.028, 0.02, MAT.flat(0xc9a45c, 0.4, 0.6), X1 + 0.09, y + 1.15, doorW / 2 + 0.28);
      btn.rotation.z = Math.PI / 2;
      g.add(btn);
      this.interact(panel, { type: 'elev_call', lv });
      // floor indicator above the doors
      const ind = P.box(0.4, 0.16, 0.04, MAT.flat(0x14181c, 0.5, 0.3), X1 + 0.02, y + 2.45, 0);
      g.add(ind);
      const digit = P.plane(0.16, 0.12, MAT.emissive(0xd88a3a, 1.4), X1 + 0.05, y + 2.45, 0);
      digit.rotation.y = Math.PI / 2;
      g.add(digit);
      this.elevDoors.get(lv).digit = digit;
    }

    // ── the car
    const car = new THREE.Group();
    const cw = GEO.ELEV_CAR_W, cd = GEO.ELEV_CAR_D;
    // The car sits hard against the landing doors: its floor has to overlap
    // the corridor slab, or stepping in drops you down the shaft.
    const cx = X1 - cw / 2 + 0.05;
    const carFloor = P.box(cw, 0.12, cd, MAT.tile([2, 2]), 0, -0.06, 0);
    carFloor.userData.surface = 'tile';
    car.add(carFloor);
    this.walkable.push(carFloor); carFloor.userData.walkable = true;
    car.add(P.box(cw, 0.1, cd, MAT.metal(true), 0, 2.35, 0));
    const panelMat = MAT.flat(0x4a4038, 0.72, 0.25);
    car.add(P.box(0.08, 2.3, cd, panelMat, -cw / 2, 1.15, 0));
    car.add(P.box(cw, 2.3, 0.08, panelMat, 0, 1.15, -cd / 2));
    car.add(P.box(cw, 2.3, 0.08, panelMat, 0, 1.15, cd / 2));
    // mirror on the back wall
    const mir = P.mirror(0.7, 1.2);
    mir.position.set(-cw / 2 + 0.06, 1.35, 0);
    mir.rotation.y = Math.PI / 2;
    car.add(mir);
    // handrail
    const hr = P.cyl(0.022, cd - 0.2, MAT.brass(), -cw / 2 + 0.12, 0.95, 0);
    hr.rotation.x = Math.PI / 2;
    car.add(hr);
    // car light
    const cl = P.box(0.5, 0.06, 0.5, MAT.emissive(0xffdcb0, 1.8), 0, 2.28, 0);
    cl.name = 'carbulb';
    car.add(cl);
    // button panel
    const bp = P.box(0.14, 0.8, 0.24, MAT.metal(true), cw / 2 - 0.1, 1.2, -cd / 2 + 0.35);
    car.add(bp);
    this.elevButtons = [];
    const labels = [['B', -1], ['1', 0], ['2', 1], ['3', 2], ['4', 3]];
    labels.forEach(([txt, lv], i) => {
      const b = P.cyl(0.026, 0.02, MAT.flat(0x9a8a6a, 0.5, 0.5), cw / 2 - 0.16, 1.5 - i * 0.14, -cd / 2 + 0.35);
      b.rotation.z = Math.PI / 2;
      b.userData.floorLv = lv;
      car.add(b);
      this.elevButtons.push(b);
      this.interact(b, { type: 'elev_button', lv, label: txt });
    });
    // car doors
    const carDoors = new THREE.Group();
    for (const s of [-1, 1]) {
      const leaf = P.box(0.06, 2.25, 0.75, MAT.metal(), cw / 2 - 0.02, 1.125, s * 0.375);
      leaf.userData.baseZ = s * 0.375;
      leaf.userData.dir = s;
      carDoors.add(leaf);
    }
    car.add(carDoors);
    car.position.set(cx, levelY(0), (Z0 + Z1) / 2);
    g.add(car);
    this.elevCar = { group: car, doors: carDoors, floorMesh: carFloor, bulb: cl, cx, cz: (Z0 + Z1) / 2 };

    // moving colliders for the car walls
    this.elevColliders = [
      this.addCollider(cx - cw / 2 - 0.05, cx - cw / 2 + 0.05, 0, 2.3, (Z0 + Z1) / 2 - cd / 2, (Z0 + Z1) / 2 + cd / 2, { tag: 'car' }),
      this.addCollider(cx - cw / 2, cx + cw / 2, 0, 2.3, (Z0 + Z1) / 2 - cd / 2 - 0.05, (Z0 + Z1) / 2 - cd / 2 + 0.05, { tag: 'car' }),
      this.addCollider(cx - cw / 2, cx + cw / 2, 0, 2.3, (Z0 + Z1) / 2 + cd / 2 - 0.05, (Z0 + Z1) / 2 + cd / 2 + 0.05, { tag: 'car' }),
      this.addCollider(cx + cw / 2 - 0.06, cx + cw / 2 + 0.02, 0, 2.3, (Z0 + Z1) / 2 - cd / 2, (Z0 + Z1) / 2 + cd / 2, { tag: 'cardoor' }),
    ];
  }

  /** Move the lift car and its colliders. */
  setElevatorY(y, doorOpen) {
    if (!this.elevCar) return;
    this.elevCar.group.position.y = y;
    const cd = GEO.ELEV_CAR_D;
    for (const c of this.elevColliders) { c.y0 = y; c.y1 = y + 2.3; }
    this.elevColliders[3].disabled = doorOpen > 0.5;
    for (const leaf of this.elevCar.doors.children) {
      leaf.position.z = leaf.userData.baseZ + leaf.userData.dir * doorOpen * 0.72;
    }
    void cd;
  }

  setLandingDoor(lv, open) {
    const d = this.elevDoors.get(lv);
    if (!d) return;
    d.open = open;
    for (const leaf of d.leaves.children) {
      leaf.position.z = leaf.userData.baseZ + leaf.userData.dir * open * 0.72;
    }
    d.collider.disabled = open > 0.5;
  }

  // ── roof ──────────────────────────────────────────────────────────────

  buildRoof() {
    const lv = ROOF_LEVEL;
    const y = levelY(lv);
    const g = this.group(lv);
    const deck = MAT.plaster(9, [12, 10]);
    this.slab({ lv, x0: -10.2, x1: 10.2, z0: GEO.S_Z0 - 0.2, z1: GEO.N_Z1 + 0.2, y, mat: deck, thick: 0.4 });
    // parapet
    const pm = MAT.brick([8, 1]);
    const P0 = { x0: -10.2, x1: 10.2, z0: GEO.S_Z0 - 0.2, z1: GEO.N_Z1 + 0.2 };
    const ph = 1.05;
    const par = (w, d, x, z) => {
      const m = P.box(w, ph, d, pm, x, y + ph / 2, z);
      g.add(m);
      this.addCollider(x - w / 2, x + w / 2, y, y + ph, z - d / 2, z + d / 2);
    };
    par(P0.x1 - P0.x0, 0.34, 0, P0.z0);
    par(P0.x1 - P0.x0, 0.34, 0, P0.z1);
    par(0.34, P0.z1 - P0.z0, P0.x0, (P0.z0 + P0.z1) / 2);
    par(0.34, P0.z1 - P0.z0, P0.x1, (P0.z0 + P0.z1) / 2);

    // stair head-house + door
    const hh = new THREE.Group();
    const hw = 2.4, hd = 3.0, hhh = 2.6;
    // Open on the east side, where it meets the top of the stairwell.
    hh.add(P.box(hw, hhh, 0.2, pm, 0, hhh / 2, -hd / 2));
    hh.add(P.box(hw, hhh, 0.2, pm, 0, hhh / 2, hd / 2));
    hh.add(P.box(hw + 0.3, 0.2, hd + 0.3, deck, 0, hhh + 0.1, 0));
    hh.position.set(9.0, y, 0);
    g.add(hh);
    this.addCollider(9 - hw / 2, 9 + hw / 2, y, y + hhh, -hd / 2 - 0.1, -hd / 2 + 0.1);
    this.addCollider(9 - hw / 2, 9 + hw / 2, y, y + hhh, hd / 2 - 0.1, hd / 2 + 0.1);
    this.makeDoor({ lv, id: 'roof_door', axis: 'z', at: 9 - hw / 2, center: 0, yBase: y, texture: 'metal', label: t('lbl.stairwell', 'Stairwell'), peep: false, flip: true });

    // water tank, vents, aerials, a chair someone sat in
    const tank = new THREE.Group();
    tank.add(P.cyl(1.1, 1.8, MAT.metal(true), 0, 0.9, 0, true));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      tank.add(P.box(0.1, 0.9, 0.1, MAT.metal(true), Math.cos(a) * 0.9, -0.45, Math.sin(a) * 0.9));
    }
    tank.position.set(-6, y + 0.9, 4.5);
    this.addMesh(lv, tank, { solid: true });
    this.interact(tank, { type: 'examine', text: t('ex.waterTank', 'The water tank. Empty, by the sound of it. Something scratched a tally into the side — dozens of marks, grouped in sevens.') });

    for (const [vx, vz] of [[-2, -5], [1.5, 5.5], [5, -4.4], [-8, -2]]) {
      const vent = new THREE.Group();
      vent.add(P.box(0.8, 0.6, 0.8, MAT.metal(true), 0, 0.3, 0));
      vent.add(P.box(1.0, 0.08, 1.0, MAT.metal(), 0, 0.66, 0));
      vent.position.set(vx, y, vz);
      this.addMesh(lv, vent, { solid: true });
    }
    const plaque = P.box(0.7, 0.34, 0.05, MAT.flat(0x3d5148, 0.72, 0.45), -2.5, y + 0.62, GEO.S_Z0 - 0.05);
    g.add(plaque);
    this.interact(plaque, { type: 'read', doc: 'roof_plaque', label: t('lbl.castPlate', 'A cast plate') });

    const ae = P.cyl(0.03, 3.2, MAT.metal(true), -9, y + 1.6, -6);
    g.add(ae);
    const ch = P.chair(false);
    ch.position.set(-4.4, y, -6.2);
    ch.rotation.y = 0.8;
    this.addMesh(lv, ch, { solid: true });
    this.interact(ch, { type: 'examine', text: t('ex.roofChair', 'A kitchen chair, brought up here and left facing the city. The seat is worn smooth. Someone sat here a great many times, watching the lights go out one district at a time.') });

    // roof lighting: only the doorway lamp and the sky
    this.registerEmitter({
      id: 'roof_lamp', lv, x: 9 - 1.3, y: y + 2.3, z: 0, color: 0xffcf90, intensity: 2.4, distance: 7,
      mesh: (() => { const s = P.sconce(); s.position.set(9 - 1.28, y + 2.3, 0); s.rotation.y = -Math.PI / 2; g.add(s); return s.getObjectByName('bulb'); })(),
      flicker: 0.4,
    });
  }

  // ── the city ──────────────────────────────────────────────────────────

  buildExterior() {
    const g = new THREE.Group(); g.name = 'exterior';
    this.root.add(g);
    this.exteriorGroup = g;
    const rng = makeRng('city');
    const brick = MAT.brick([3, 6]);
    // Distant blocks are unlit silhouettes — there is no light out there to
    // catch them, and a shape against the sky is all you would see anyway.
    const far1 = new THREE.MeshBasicMaterial({ color: 0x0e151f });
    const far2 = new THREE.MeshBasicMaterial({ color: 0x121a26 });

    // street
    const street = new THREE.Mesh(new THREE.BoxGeometry(220, 0.4, 220),
      new THREE.MeshBasicMaterial({ color: 0x0b1017 }));
    street.position.set(0, -1.0, 0);
    g.add(street);

    // No outer skin on our own building: the interior walls already are the
    // facade, and a skin here would seal every window from the outside.
    // A plinth at street level is enough to stop the block floating.
    const plinth = P.box(21.6, 1.6, 18.0, brick, 0, levelY(-1) - 1.3, 0);
    g.add(plinth);

    // the rest of the block: dark towers with a scattering of lit windows
    const lit = [];
    for (let i = 0; i < 74; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(30, 105);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const w = rng.range(8, 22), d = rng.range(8, 22);
      const h = rng.range(10, 46);
      const b = P.box(w, h, d, rng.chance(0.5) ? far1 : far2, x, -0.8 + h / 2, z);
      b.castShadow = false; b.receiveShadow = false;
      b.matrixAutoUpdate = false; b.updateMatrix();
      g.add(b);
      // a handful of windows still have power
      if (rng.chance(0.46)) {
        const n = rng.int(1, 3);
        for (let k = 0; k < n; k++) {
          const wy = rng.range(4, h - 2);
          const face = rng.int(0, 3);
          const q = P.plane(1.1, 1.4, MAT.emissive(rng.chance(0.7) ? 0xffca7a : 0x9fc4e8, rng.range(0.5, 1.6)));
          const off = 0.02;
          if (face === 0) { q.position.set(x + rng.range(-w / 3, w / 3), -0.8 + wy, z + d / 2 + off); }
          else if (face === 1) { q.position.set(x + rng.range(-w / 3, w / 3), -0.8 + wy, z - d / 2 - off); q.rotation.y = Math.PI; }
          else if (face === 2) { q.position.set(x + w / 2 + off, -0.8 + wy, z + rng.range(-d / 3, d / 3)); q.rotation.y = Math.PI / 2; }
          else { q.position.set(x - w / 2 - off, -0.8 + wy, z + rng.range(-d / 3, d / 3)); q.rotation.y = -Math.PI / 2; }
          g.add(q);
          lit.push(q);
        }
      }
    }
    this.cityWindows = lit;

    // sky dome — a very dark, faintly stormy vault
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(180, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x1b2534, side: THREE.BackSide, fog: false })
    );
    g.add(sky);
    this.sky = sky;

    // lightning flash source
    const flash = new THREE.DirectionalLight(0x9fc0e0, 0);
    flash.position.set(60, 80, -40);
    this.scene.add(flash);
    this.lightning = flash;

    this.buildRain(g);
  }

  /**
   * Rain, as falling line segments rather than dots — a drop reads as a
   * streak at any sensible shutter speed. Drops whose (x,z) falls inside the
   * building footprint only exist above roof level, so it never rains
   * indoors.
   */
  buildRain(parent) {
    const N = 3400;
    const pos = new Float32Array(N * 2 * 3);
    const meta = new Float32Array(N * 2 * 3);   // yMin, yRange, tipOffset
    const rng = makeRng('rain');
    const roofY = levelY(ROOF_LEVEL);
    for (let i = 0; i < N; i++) {
      const x = rng.range(-70, 70), z = rng.range(-70, 70);
      const inside = Math.abs(x) < 11.6 && z > GEO.S_Z0 - 1.6 && z < GEO.N_Z1 + 1.6;
      const yMin = inside ? roofY + 0.1 : -1.2;
      const yRange = inside ? 24 : roofY + 26;
      const y = yMin + rng.range(0, yRange);
      const len = 0.28 + rng.range(0, 0.5);
      for (let v = 0; v < 2; v++) {
        const k = (i * 2 + v) * 3;
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
        meta[k] = yMin; meta[k + 1] = yRange; meta[k + 2] = v === 0 ? 0 : -len;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('meta', new THREE.BufferAttribute(meta, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, opacity: { value: 0.42 }, camPos: { value: new THREE.Vector3() } },
      vertexShader: /* glsl */`
        attribute vec3 meta;
        uniform float time;
        uniform vec3 camPos;
        varying float vFade;
        void main(){
          vec3 p = position;
          float speed = 17.0 + mod(abs(p.x) * 7.3, 7.0);
          p.y = meta.x + mod(p.y - meta.x - time * speed, meta.y) + meta.z;
          p.x += sin(time * 0.35 + p.z * 0.08) * 0.9 + meta.z * 0.22;
          float d = distance(p, camPos);
          vFade = smoothstep(78.0, 6.0, d) * smoothstep(0.4, 3.0, d);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform float opacity;
        varying float vFade;
        void main(){
          float a = vFade * opacity;
          if (a < 0.008) discard;
          gl_FragColor = vec4(0.58, 0.66, 0.76, a);
        }`,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    parent.add(lines);
    this.rain = lines;
  }

  // ── assembly ──────────────────────────────────────────────────────────

  build(furnishFn) {
    for (const lv of LEVELS) this.buildLevelShell(lv);
    this.buildStairwell();
    this.buildElevator();
    this.buildRoof();
    this.buildExterior();

    for (const room of ROOMS) {
      if ((this.plan.hiddenRooms || []).includes(room.id)) continue;
      const state = this.plan.roomState[room.id] || {};
      const rec = { ...room, ...state };
      const b = slotBounds(room.side, room.slot);
      const y = levelY(room.lv);
      const cx = (b.x0 + b.x1) / 2;

      // door from the corridor
      const lockSpec = rec.lock || 'open';
      const locked = lockSpec !== 'open';
      const sealed = lockSpec === 'sealed';
      const keyItem = lockSpec.startsWith('key:') ? lockSpec.slice(4) : null;
      if (rec.kind !== 'lobby') {
        this.makeDoor({
          lv: room.lv, id: `door_${room.id}`, roomId: room.id,
          axis: 'x', at: room.side === 'n' ? GEO.COR_Z1 : GEO.COR_Z0,
          center: cx, yBase: y, texture: rec.door || 'door',
          locked, sealed, keyItem, label: rec.name, plate: rec.plate,
          flip: room.side === 's',
        });
      } else {
        // the entrance hall is open to the corridor
        this.wall({
          lv: room.lv, axis: 'x', at: GEO.COR_Z1, from: b.x0, to: b.x1, yBase: y, height: GEO.CEIL_H,
          mat: MAT.wallpaper(1, [4, 2]), holes: [{ a0: cx - 1.4, a1: cx + 1.4, y0: 0, y1: 2.4 }],
        });
      }

      this.rooms.set(room.id, { ...rec, bounds: b, center: { x: cx, y, z: (b.z0 + b.z1) / 2 } });
      furnishFn(this, rec, b, y);
    }

    // doors that only exist on some nights
    for (const extra of this.plan.extraDoors || []) {
      this.makeDoor({
        lv: extra.lv, id: extra.id, axis: 'x',
        at: extra.side === 'n' ? GEO.COR_Z1 : GEO.COR_Z0,
        center: extra.x, yBase: levelY(extra.lv), texture: extra.texture || 'doorBlack',
        locked: extra.locked !== false, label: extra.label || '', plate: null, peep: false,
        flip: extra.side === 's',
        interactData: { type: extra.interact || 'newdoor', doorId: extra.id },
      });
    }

    this.root.traverse((o) => {
      if (o.isMesh) { o.castShadow = o.castShadow && true; o.receiveShadow = true; }
    });
    return this;
  }

  setVisibleLevels(playerLv) {
    for (const [lv, g] of this.levelGroups) {
      const d = Math.abs(lv - playerLv);
      g.visible = d <= 1 || (playerLv === ROOF_LEVEL && lv === 3) || (lv === ROOF_LEVEL && playerLv >= 2);
    }
  }

  dispose() {
    // Materials and the primitive geometries are shared across every night,
    // so only the one-off geometries (cones, tori, the rain buffer) are freed.
    this.root.traverse((o) => {
      if (o.isMesh || o.isPoints || o.isLine) {
        if (o.geometry && !P.SHARED_GEOMETRY.has(o.geometry)) o.geometry.dispose();
      }
    });
    this.rain?.material?.dispose?.();
    this.scene.remove(this.root);
    if (this.lightning) this.scene.remove(this.lightning);
  }
}
