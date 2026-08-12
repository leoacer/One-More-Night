// ══════════════════════════════════════════════════════════════════════
//  Room interiors. One recipe per kind of room; each one places floor
//  finish, furniture, a light or two, and the things worth looking at.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { GEO } from './layout.js';
import { MAT } from './materials.js';
import * as P from './props.js';
import { DOCS } from '../data/lore.js';
import { ITEMS } from '../data/items.js';
import { makeRng } from '../core/util.js';

// ── helpers ─────────────────────────────────────────────────────────────

function floorFinish(b, lv, y, bounds, kind) {
  const w = bounds.x1 - bounds.x0, d = bounds.z1 - bounds.z0;
  const mat = kind === 'tile' ? MAT.tile([w / 1.6, d / 1.6])
    : kind === 'tileWhite' ? MAT.tile([w / 1.6, d / 1.6], true)
      : kind === 'plaster' ? MAT.plaster(12, [w / 3, d / 3], true)
        : MAT.wood([w / 2.6, d / 2.6]);
  const m = P.box(w - 0.02, 0.02, d - 0.02, mat, (bounds.x0 + bounds.x1) / 2, y + 0.011, (bounds.z0 + bounds.z1) / 2);
  m.matrixAutoUpdate = false; m.updateMatrix();
  m.userData.surface = kind === 'tile' || kind === 'tileWhite' ? 'tile' : kind === 'plaster' ? 'concrete' : 'wood';
  b.group(lv).add(m);
  b.walkable.push(m); m.userData.walkable = true;
  return m;
}

function ceilingLight(b, room, y, x, z, opts = {}) {
  const lv = room.lv;
  const kind = opts.kind || 'pendant';
  const f = kind === 'fluorescent' ? P.fluorescent(opts.len || 1.1) : P.pendantLamp();
  f.position.set(x, y + GEO.CEIL_H + (kind === 'fluorescent' ? 0 : 0.02), z);
  b.group(lv).add(f);
  return b.registerEmitter({
    id: opts.id || `lt_${room.id}_${Math.round(x * 10)}_${Math.round(z * 10)}`,
    lv, x, y: y + GEO.CEIL_H - 0.5, z,
    color: opts.color ?? 0xffcf98, intensity: opts.intensity ?? 3.4,
    distance: opts.distance ?? 7.5, kind, mesh: f.getObjectByName('bulb'),
    flicker: opts.flicker || 0, broken: opts.broken || false,
    on: opts.on !== false,
  });
}

function lamp(b, room, y, x, z, opts = {}) {
  const lv = room.lv;
  const f = opts.desk ? P.deskLamp() : P.floorLamp();
  f.position.set(x, y + (opts.onSurface || 0), z);
  if (opts.rotY) f.rotation.y = opts.rotY;
  b.addMesh(lv, f, { solid: !opts.desk });
  const e = b.registerEmitter({
    id: opts.id || `lamp_${room.id}_${Math.round(x * 10)}`,
    lv, x, y: y + (opts.onSurface || 0) + (opts.desk ? 0.3 : 1.48), z,
    color: opts.color ?? 0xffc078, intensity: opts.intensity ?? 2.2,
    distance: opts.distance ?? 5.5, kind: 'lamp', mesh: f.getObjectByName('bulb'),
    on: opts.on !== false, flicker: opts.flicker || 0,
  });
  b.interact(f, { type: 'lightswitch', emitterId: e.id });
  return e;
}

function readable(b, lv, obj, docId, opts = {}) {
  b.interact(obj, { type: 'read', doc: docId, label: opts.label || 'Read', once: opts.once });
  return obj;
}

function spawnItem(b, lv, itemId, x, y, z, opts = {}) {
  const def = ITEMS[itemId];
  const mesh = P.itemMesh(opts.mesh || itemId);
  mesh.position.set(x, y, z);
  if (opts.rotY) mesh.rotation.y = opts.rotY;
  b.group(lv).add(mesh);
  b.interact(mesh, { type: 'item', item: itemId, qty: opts.qty || 1, label: def?.name || itemId, doc: def?.doc || null });
  mesh.userData.itemId = itemId;
  return mesh;
}

function pinPaper(b, lv, x, y, z, rotY, docId, kind = 'note') {
  const g = new THREE.Group();
  const m = kind === 'drawing'
    ? P.plane(0.3, 0.3, MAT.drawing(DOCS[docId]?.drawing || 'building'))
    : P.plane(0.24, 0.32, MAT.flat(0xa8a08e, 0.95, 0));
  m.material.side = THREE.DoubleSide;
  g.add(m);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  b.group(lv).add(g);
  readable(b, lv, g, docId);
  return g;
}

function clutter(b, room, y, bounds, rngSeed, density = 1) {
  const rng = makeRng(`clutter-${room.id}-${rngSeed}`);
  const n = Math.floor(4 * density + rng.range(0, 4));
  for (let i = 0; i < n; i++) {
    const x = rng.range(bounds.x0 + 0.7, bounds.x1 - 0.7);
    const z = rng.range(bounds.z0 + 0.7, bounds.z1 - 0.7);
    const pick = rng.pick(['papers', 'bottle', 'box', 'crate', 'bucket', 'mug', 'news']);
    let o;
    if (pick === 'papers') o = P.papers(rng.int(2, 6), 0.6);
    else if (pick === 'bottle') o = P.bottle(rng.pick([0x2e4432, 0x3a2f22, 0x22303a]));
    else if (pick === 'box') o = P.cardboard(rng.range(0.35, 0.55), rng.range(0.3, 0.45), rng.chance(0.5));
    else if (pick === 'crate') o = P.crate(rng.range(0.4, 0.6));
    else if (pick === 'bucket') o = P.bucket(rng.chance(0.4));
    else if (pick === 'mug') o = P.mug();
    else o = P.newspaperStack(rng.range(0.06, 0.2));
    o.position.set(x, y + 0.02, z);
    o.rotation.y = rng.range(0, Math.PI * 2);
    b.addMesh(room.lv, o, { solid: o.userData.solid });
  }
}

/** A window-side detail every apartment gets: curtains and a sill. */
function windowDressing(b, room, y, bounds) {
  const lv = room.lv;
  const facadeZ = room.side === 'n' ? GEO.N_Z1 : GEO.S_Z0;
  const inward = room.side === 'n' ? -1 : 1;
  const cx = (bounds.x0 + bounds.x1) / 2;
  for (const dx of [-1.4, 1.4]) {
    const sill = P.box(1.3, 0.06, 0.26, MAT.flat(0x6a6357, 0.85, 0.02), cx + dx, y + 0.95, facadeZ + inward * 0.16);
    b.group(lv).add(sill);
    // Curtains are bunched at the jambs, not drawn — the whole point of a
    // window in this game is that you can look through it.
    for (const side of [-1, 1]) {
      const cur = P.curtain(0.34, 1.6, 0x39352e);
      cur.position.set(cx + dx + side * 0.76, y + 2.55, facadeZ + inward * 0.3);
      b.group(lv).add(cur);
    }
    // pelmet rail across the top
    const rail = P.box(1.9, 0.05, 0.05, MAT.metal(true), cx + dx, y + 2.55, facadeZ + inward * 0.3);
    b.group(lv).add(rail);
  }
}

// ══════════════════ recipes ══════════════════

const RECIPES = {

  // ── the player's own apartment ─────────────────────────────────────
  home(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'wood');
    windowDressing(b, room, y, bounds);
    ceilingLight(b, room, y, cx, cz + 1.2, { intensity: 3.0, color: 0xffc890, id: 'home_main' });

    const bd = P.bed(1.35, 2.0, false);
    bd.position.set(bounds.x0 + 1.2, y, bounds.z0 + 1.4);
    bd.rotation.y = Math.PI / 2;
    b.addMesh(lv, bd, { solid: true });
    b.interact(bd, { type: 'sleep' });

    const dsk = P.desk(1.3);
    dsk.position.set(bounds.x1 - 1.1, y, bounds.z0 + 1.1);
    dsk.rotation.y = -Math.PI / 2;
    b.addMesh(lv, dsk, { solid: true });
    lamp(b, room, y, bounds.x1 - 1.1, bounds.z0 + 1.1, { desk: true, onSurface: 0.79, intensity: 2.6, distance: 4.5, id: 'home_desk' });
    b.interact(dsk, { type: 'journal_desk' });

    // Nothing solid goes in the strip between the front door and the middle
    // of the room: x within ±1.0 of centre, z from the door back to cz + 0.4.
    const t = P.table(1.1, 0.75);
    t.position.set(cx + 0.1, y, cz - 0.5);
    b.addMesh(lv, t, { solid: true });
    const ch = P.chair(); ch.position.set(cx - 1.0, y, cz - 0.5); ch.rotation.y = Math.PI / 2;
    b.addMesh(lv, ch, { solid: true });
    const ch2 = P.chair(); ch2.position.set(cx + 1.2, y, cz - 0.5); ch2.rotation.y = -Math.PI / 2;
    b.addMesh(lv, ch2, { solid: true });

    // kitchen run along the west wall, well clear of the doorway
    const cn = P.counter(2.0);
    cn.position.set(bounds.x0 + 0.35, y, cz + 0.6);
    cn.rotation.y = Math.PI / 2;
    b.addMesh(lv, cn, { solid: true });
    const fr = P.fridge(1.5);
    fr.position.set(bounds.x0 + 0.36, y, bounds.z1 - 0.65);
    fr.rotation.y = Math.PI / 2;
    b.addMesh(lv, fr, { solid: true });
    b.interact(fr, { type: 'larder' });
    const sk = P.sink(0.6);
    sk.position.set(bounds.x0 + 0.35, y, cz - 0.9);
    sk.rotation.y = Math.PI / 2;
    b.group(lv).add(sk);

    const sh = P.shelf(1.0, 1.8, true, 3);
    sh.position.set(bounds.x1 - 0.4, y, cz + 0.6);
    sh.rotation.y = -Math.PI / 2;
    b.addMesh(lv, sh, { solid: true });

    const rg = P.rug(2.2, 1.5, 0x453229);
    rg.position.set(cx + 0.1, y, cz - 0.4);
    b.group(lv).add(rg);

    const ar = P.armchair();
    ar.position.set(bounds.x1 - 1.4, y, bounds.z1 - 1.3);
    ar.rotation.y = -2.3;
    b.addMesh(lv, ar, { solid: true });

    // the book, face down, open at the page you left it
    const bk = P.box(0.16, 0.03, 0.22, MAT.flat(0x5a4a3a, 0.9, 0), bounds.x1 - 1.55, y + 0.47, bounds.z1 - 1.3);
    bk.rotation.y = 0.3;
    b.group(lv).add(bk);
    b.interact(bk, { type: 'examine', text: 'A book, face down on the arm of the chair, open at the same page it has been open at since you moved in. You have never got past that page.' });

    const cl = P.clock(0.15);
    cl.position.set(cx, y + 2.1, bounds.z0 + 0.12);
    b.group(lv).add(cl);
    b.interact(cl, { type: 'examine', text: 'The clock stopped a long time ago. Both hands are still. You keep meaning to wind it, and you keep not doing it.' });
    b.props.set('home_clock', cl);

    const mr = P.mirror(0.5, 0.8);
    mr.position.set(bounds.x0 + 0.11, y + 1.5, bounds.z1 - 1.15);
    mr.rotation.y = Math.PI / 2;
    b.group(lv).add(mr);
    b.interact(mr, { type: 'mirror' });
    b.props.set('home_mirror', mr);

    const hk = P.coatHooks();
    hk.position.set(cx + 1.15, y + 1.7, bounds.z1 - 0.12);
    hk.rotation.y = Math.PI;
    b.group(lv).add(hk);

    spawnItem(b, lv, 'battery', bounds.x1 - 1.1, y + 0.79, bounds.z0 + 0.85, { qty: 1 });

    // your own lease, in the drawer you never open
    const drawer = P.box(0.36, 0.16, 0.04, MAT.flat(0x5c4a38, 0.85, 0.02),
      bounds.x1 - 1.38, y + 0.44, bounds.z0 + 1.1);
    drawer.rotation.y = -Math.PI / 2;
    b.group(lv).add(drawer);
    b.interact(drawer, { type: 'item', item: 'note_lease', doc: 'note_lease', label: 'Papers in the drawer' });

    // the frame of your own front door — searchable from inside
    const frameMark = P.box(0.9, 0.06, 0.1, MAT.flat(0x3a3128, 0.9, 0.02), cx, y + 2.12, bounds.z1 - 0.14);
    b.group(lv).add(frameMark);
    b.interact(frameMark, { type: 'read', doc: 'frame_marks', label: 'Door frame' });
  },

  // ── Tomas, 104 ────────────────────────────────────────────────────
  mechanic(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'wood');
    windowDressing(b, room, y, bounds);
    ceilingLight(b, room, y, cx, cz, { intensity: 2.6, color: 0xffd0a0 });
    ceilingLight(b, room, y, cx + 2.0, cz - 1.6, { kind: 'fluorescent', intensity: 3.2, color: 0xdce8f2, flicker: 0.25 });

    const wb = P.workbench(2.2);
    wb.position.set(cx + 1.2, y, bounds.z0 + 0.6);
    b.addMesh(lv, wb, { solid: true });
    b.interact(wb, { type: 'workbench' });

    const sh = P.shelf(1.2, 2.0, false, 9);
    sh.position.set(bounds.x1 - 0.35, y, cz);
    sh.rotation.y = -Math.PI / 2;
    b.addMesh(lv, sh, { solid: true });
    for (let i = 0; i < 8; i++) {
      const bx = P.cardboard(0.28, 0.2, false);
      bx.position.set(bounds.x1 - 0.5, y + 0.1 + (i % 4) * 0.47, cz - 0.6 + Math.floor(i / 4) * 0.55);
      b.group(lv).add(bx);
    }

    const t = P.table(1.2, 0.8);
    t.position.set(bounds.x0 + 1.5, y, cz + 1.0);
    b.addMesh(lv, t, { solid: true });
    const ch = P.chair(); ch.position.set(bounds.x0 + 1.5, y, cz + 2.0); ch.rotation.y = Math.PI;
    b.addMesh(lv, ch, { solid: true });

    const sofa = P.sofa(1.7);
    sofa.position.set(bounds.x0 + 1.4, y, bounds.z1 - 0.7);
    sofa.rotation.y = Math.PI;
    b.addMesh(lv, sofa, { solid: true });

    spawnItem(b, lv, 'screwdriver', cx + 1.2, y + 0.94, bounds.z0 + 0.55);
    spawnItem(b, lv, 'battery', cx + 1.9, y + 0.94, bounds.z0 + 0.7, { qty: 2 });
    pinPaper(b, lv, cx + 1.2, y + 1.65, bounds.z0 + 0.1, 0, 'workshop_note');

    const rad = P.radiator(0.8);
    rad.position.set(bounds.x0 + 0.6, y + 0.1, bounds.z0 + 0.3);
    b.addMesh(lv, rad, { solid: true });
    clutter(b, room, y, bounds, 4, 0.7);
  },

  // ── Mira, 207 ─────────────────────────────────────────────────────
  child(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'wood');
    windowDressing(b, room, y, bounds);
    ceilingLight(b, room, y, cx, cz, { intensity: 2.4, color: 0xffc078 });

    const bd = P.bed(1.0, 1.75, true);
    bd.position.set(bounds.x0 + 0.9, y, bounds.z1 - 1.2);
    bd.rotation.y = Math.PI / 2;
    b.addMesh(lv, bd, { solid: true });

    const tb = P.toybox();
    tb.position.set(cx - 0.6, y, cz - 1.4);
    b.addMesh(lv, tb, { solid: true });
    readable(b, lv, tb, 'child_note');

    const rh = P.rockingHorse();
    rh.position.set(bounds.x1 - 1.4, y, bounds.z1 - 1.6);
    rh.rotation.y = -0.7;
    b.addMesh(lv, rh, { solid: true });
    b.props.set('rocking_horse', rh);

    const bl = P.ball();
    bl.position.set(cx + 0.9, y, cz + 0.7);
    b.group(lv).add(bl);
    b.props.set('mira_ball', bl);

    const t = P.table(0.9, 0.6, 0.55);
    t.position.set(cx + 1.2, y, cz - 0.4);
    b.addMesh(lv, t, { solid: true });
    const st = P.stool(); st.position.set(cx + 1.2, y, cz + 0.4);
    b.addMesh(lv, st, { solid: true });
    lamp(b, room, y, cx + 1.2, cz - 0.6, { desk: true, onSurface: 0.58, intensity: 2.0, distance: 3.6 });

    // drawings pinned everywhere
    const facadeZ = room.side === 'n' ? GEO.N_Z1 : GEO.S_Z0;
    const inward = room.side === 'n' ? -1 : 1;
    pinPaper(b, lv, cx - 1.6, y + 1.6, bounds.z0 + 0.12, room.side === 'n' ? 0 : Math.PI, 'mira_stairs', 'drawing');
    pinPaper(b, lv, cx + 2.0, y + 1.5, bounds.z0 + 0.12, room.side === 'n' ? 0 : Math.PI, 'mira_figures', 'drawing');
    for (let i = 0; i < 7; i++) {
      const d = P.plane(0.22, 0.22, MAT.drawing(['building', 'door', 'figures', 'stairs'][i % 4]));
      d.material.side = THREE.DoubleSide;
      d.position.set(bounds.x0 + 0.6 + i * 0.7, y + 1.15 + (i % 3) * 0.42, facadeZ + inward * 0.14);
      d.rotation.y = room.side === 'n' ? Math.PI : 0;
      d.rotation.z = (Math.random() - 0.5) * 0.18;
      b.group(lv).add(d);
    }
    const sh = P.shelf(0.8, 1.2, true, 2);
    sh.position.set(bounds.x1 - 0.35, y, cz + 1.4);
    sh.rotation.y = -Math.PI / 2;
    b.addMesh(lv, sh, { solid: true });
    spawnItem(b, lv, 'doll', cx - 0.6, y + 0.44, cz - 1.4);
    clutter(b, room, y, bounds, 7, 0.5);
  },

  // ── Ilse, 302 ─────────────────────────────────────────────────────
  oldwoman(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'wood');
    windowDressing(b, room, y, bounds);
    ceilingLight(b, room, y, cx, cz, { intensity: 2.2, color: 0xffb870, id: 'ilse_main' });

    const t = P.table(1.3, 0.85);
    t.position.set(cx, y, cz + 0.6);
    b.addMesh(lv, t, { solid: true });
    b.props.set('ilse_table', t);
    for (const [dx, ry] of [[-1.0, Math.PI / 2], [1.0, -Math.PI / 2]]) {
      const ch = P.chair(); ch.position.set(cx + dx, y, cz + 0.6); ch.rotation.y = ry;
      b.addMesh(lv, ch, { solid: true });
    }
    // two plates and a cup, still set
    const setting = new THREE.Group();
    for (const dx of [-0.35, 0.35]) {
      const pl = P.cyl(0.11, 0.015, MAT.flat(0xa8a294, 0.6, 0), dx, 0.79, 0.6, true);
      setting.add(pl);
    }
    const cup = P.mug(); cup.position.set(0.05, 0.78, 0.3);
    setting.add(cup);
    const brd = P.box(0.2, 0.08, 0.12, MAT.flat(0x8a7a5a, 0.95, 0), -0.1, 0.82, 0.85);
    setting.add(brd);
    setting.position.set(cx, y, cz);
    b.group(lv).add(setting);
    readable(b, lv, setting, 'ilse_table');
    b.props.set('ilse_setting', setting);

    const ar = P.armchair();
    ar.position.set(bounds.x0 + 1.1, y, bounds.z1 - 1.2);
    ar.rotation.y = -0.9;
    b.addMesh(lv, ar, { solid: true });
    lamp(b, room, y, bounds.x0 + 0.6, bounds.z1 - 1.9, { intensity: 2.4, distance: 5.0, id: 'ilse_lamp' });

    const sh = P.shelf(1.1, 1.9, true, 11);
    sh.position.set(bounds.x1 - 0.35, y, cz - 0.6);
    sh.rotation.y = -Math.PI / 2;
    b.addMesh(lv, sh, { solid: true });

    const dr = P.dresser(1.1);
    dr.position.set(cx + 1.4, y, bounds.z0 + 0.4);
    b.addMesh(lv, dr, { solid: true });

    // photographs, everywhere, in frames
    const facadeZ = room.side === 'n' ? GEO.N_Z1 : GEO.S_Z0;
    for (const [px, pz, ry, kind] of [
      [cx - 1.9, bounds.z0 + 0.12, 0, 'photo:three'],
      [cx - 1.1, bounds.z0 + 0.12, 0, 'photo:one'],
      [cx + 2.3, bounds.z0 + 0.12, 0, 'photo:building'],
    ]) {
      const pt = P.painting(0.34, 0.4, kind);
      pt.position.set(px, y + 1.7, pz);
      pt.rotation.y = room.side === 'n' ? ry : Math.PI;
      b.group(lv).add(pt);
    }
    const framed = P.painting(0.26, 0.3, 'photo:two');
    framed.position.set(cx + 1.4, y + 0.98, bounds.z0 + 0.34);
    framed.rotation.x = -0.35;
    b.group(lv).add(framed);
    b.interact(framed, { type: 'item', item: 'photo_two', doc: 'photo_two', label: 'Photograph' });
    b.props.set('ilse_photo', framed);

    const cl = P.clock(0.16);
    cl.position.set(cx + 0.4, y + 2.15, facadeZ + (room.side === 'n' ? -0.14 : 0.14));
    cl.rotation.y = room.side === 'n' ? Math.PI : 0;
    b.group(lv).add(cl);

    const rug = P.rug(2.4, 1.6, 0x4a3428);
    rug.position.set(cx, y, cz + 0.4);
    b.group(lv).add(rug);
    spawnItem(b, lv, 'food', cx + 1.4, y + 0.88, bounds.z0 + 0.4, { qty: 1 });
  },

  // ── Voss, 401 ─────────────────────────────────────────────────────
  voss(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'wood');
    windowDressing(b, room, y, bounds);
    ceilingLight(b, room, y, cx, cz, { intensity: 1.6, color: 0xffb060, flicker: 0.2 });

    // the walls are papered in his own arithmetic
    const facadeZ = room.side === 'n' ? GEO.N_Z1 : GEO.S_Z0;
    const inward = room.side === 'n' ? -1 : 1;
    for (let i = 0; i < 22; i++) {
      const s = P.plane(0.21, 0.29, MAT.flat(0x9d9686, 0.96, 0));
      s.material.side = THREE.DoubleSide;
      const wall = i % 2;
      if (wall === 0) {
        s.position.set(bounds.x0 + 0.5 + (i % 8) * 0.66, y + 0.9 + Math.floor(i / 8) * 0.44, bounds.z0 + 0.12);
        s.rotation.y = room.side === 'n' ? 0 : Math.PI;
      } else {
        s.position.set(bounds.x0 + 0.5 + (i % 7) * 0.72, y + 0.9 + Math.floor(i / 7) * 0.44, facadeZ + inward * 0.14);
        s.rotation.y = room.side === 'n' ? Math.PI : 0;
      }
      s.rotation.z = (Math.random() - 0.5) * 0.1;
      b.group(lv).add(s);
    }

    const dsk = P.desk(1.4);
    dsk.position.set(cx, y, bounds.z0 + 0.9);
    b.addMesh(lv, dsk, { solid: true });
    lamp(b, room, y, cx - 0.4, bounds.z0 + 0.9, { desk: true, onSurface: 0.79, intensity: 2.4, distance: 4 });
    const stack = P.newspaperStack(0.34);
    stack.position.set(cx + 0.4, y + 0.79, bounds.z0 + 0.9);
    b.group(lv).add(stack);
    readable(b, lv, stack, 'note_voss');
    spawnItem(b, lv, 'note_voss', cx + 0.4, y + 1.14, bounds.z0 + 1.2, { mesh: 'note' });

    const bd = P.bed(1.0, 1.9, false);
    bd.position.set(bounds.x1 - 1.0, y, bounds.z1 - 1.4);
    bd.rotation.y = Math.PI / 2;
    b.addMesh(lv, bd, { solid: true });

    const ch = P.chair(); ch.position.set(cx, y, bounds.z0 + 1.8);
    b.addMesh(lv, ch, { solid: true });

    for (let i = 0; i < 5; i++) {
      const st = P.newspaperStack(0.25 + Math.random() * 0.3);
      st.position.set(bounds.x0 + 0.6 + i * 0.5, y, cz + 1.6 + (i % 2) * 0.5);
      b.addMesh(lv, st, { solid: false });
    }
    clutter(b, room, y, bounds, 13, 0.6);
  },

  // ── an apartment nobody has lived in for a while ──────────────────
  abandoned(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    const rng = makeRng(`ab-${room.id}`);
    floorFinish(b, lv, y, bounds, 'wood');
    windowDressing(b, room, y, bounds);
    ceilingLight(b, room, y, cx, cz, { intensity: 2.0, color: 0xffc890, broken: rng.chance(0.5), flicker: 0.5 });

    const sofa = P.sofa(1.8);
    sofa.position.set(bounds.x0 + 1.6, y, bounds.z1 - 0.9);
    sofa.rotation.y = Math.PI + rng.range(-0.2, 0.2);
    b.addMesh(lv, sofa, { solid: true });

    const t = P.table(1.1, 0.7);
    t.position.set(cx - 0.4, y, cz);
    t.rotation.y = rng.range(-0.3, 0.3);
    b.addMesh(lv, t, { solid: true });
    const c1 = P.chair(rng.chance(0.5));
    c1.position.set(cx - 0.4, y, cz + 1.0);
    b.addMesh(lv, c1, { solid: true });

    const wd = P.wardrobe(1.0, 1.9);
    wd.position.set(bounds.x1 - 0.7, y, bounds.z0 + 0.6);
    wd.rotation.y = -Math.PI / 2;
    b.addMesh(lv, wd, { solid: true });
    b.interact(wd, { type: 'examine', text: 'The wardrobe is empty except for hangers, and the hangers are all facing the same way, which is somehow worse than if they were not.' });

    const dr = P.dresser(0.9);
    dr.position.set(cx + 1.8, y, bounds.z0 + 0.4);
    b.addMesh(lv, dr, { solid: true });

    if (rng.chance(0.7)) {
      const p = P.painting(0.4, 0.5, rng.pick(['photo:building', 'photo:empty', 'photo:one']));
      p.position.set(cx - 1.4, y + 1.7, bounds.z0 + 0.12);
      p.rotation.y = room.side === 'n' ? 0 : Math.PI;
      p.rotation.z = rng.range(-0.06, 0.06);
      b.group(lv).add(p);
      b.props.set(`painting_${room.id}`, p);
      b.interact(p, { type: 'painting', roomId: room.id });
    }
    const rug = P.rug(2.0, 1.4, 0x3f2f28);
    rug.position.set(cx, y, cz + 0.3);
    b.group(lv).add(rug);
    if (room.doc) {
      const sheet = P.plane(0.21, 0.29, MAT.flat(0xa7a08e, 0.95, 0));
      sheet.rotation.x = -Math.PI / 2;
      sheet.rotation.z = rng.range(-0.4, 0.4);
      sheet.position.set(cx - 0.4, y + 0.79, cz);
      b.group(lv).add(sheet);
      readable(b, lv, sheet, room.doc);
    }
    clutter(b, room, y, bounds, 21, 1.2);
    if (rng.chance(0.6)) spawnItem(b, lv, rng.pick(['battery', 'food', 'coin', 'medicine']), cx + rng.range(-1.5, 1.5), y + 0.88, bounds.z0 + 0.4);
  },

  empty(b, room, bounds, y) {
    // Locked rooms still get a floor so the physics probe has something to hit.
    floorFinish(b, room.lv, y, bounds, room.floor === 'plaster' ? 'plaster' : 'wood');
  },

  junk(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'wood');
    windowDressing(b, room, y, bounds);
    ceilingLight(b, room, y, cx, cz, { intensity: 1.8, flicker: 0.35, color: 0xffcc90 });
    const rng = makeRng(`junk-${room.id}`);
    for (let i = 0; i < 16; i++) {
      const o = rng.pick([P.crate(rng.range(0.4, 0.7)), P.cardboard(rng.range(0.4, 0.6), rng.range(0.3, 0.5), rng.chance(0.4)),
        P.suitcase(), P.barrel(), P.chair(rng.chance(0.4))]);
      o.position.set(rng.range(bounds.x0 + 0.8, bounds.x1 - 0.8), y, rng.range(bounds.z0 + 0.8, bounds.z1 - 0.8));
      o.rotation.y = rng.range(0, 6.2);
      b.addMesh(lv, o, { solid: true });
    }
    const st = P.newspaperStack(0.4);
    st.position.set(cx, y, cz - 1.4);
    b.addMesh(lv, st, { solid: false });
    readable(b, lv, st, 'news_blackout');
    spawnItem(b, lv, 'battery', cx + 1.2, y + 0.02, cz + 1.2, { qty: 1 });
    spawnItem(b, lv, 'food', cx - 1.4, y + 0.02, cz + 0.8, { qty: 1 });
  },

  // ── basement rooms ────────────────────────────────────────────────
  laundry(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'tileWhite');
    ceilingLight(b, room, y, cx - 1.4, cz, { kind: 'fluorescent', intensity: 3.0, color: 0xdfeaf4, flicker: 0.55 });
    ceilingLight(b, room, y, cx + 1.6, cz, { kind: 'fluorescent', intensity: 2.6, color: 0xdfeaf4, broken: true });

    for (let i = 0; i < 4; i++) {
      const w = P.washer(i > 1);
      w.position.set(bounds.x0 + 1.0 + i * 0.75, y, bounds.z1 - 0.6);
      w.rotation.y = Math.PI;
      b.addMesh(lv, w, { solid: true });
      b.interact(w, { type: 'washer', index: i });
    }
    const t = P.table(1.6, 0.7, 0.9);
    t.position.set(cx + 1.2, y, cz - 0.6);
    b.addMesh(lv, t, { solid: true });
    const sk = P.sink(0.7);
    sk.position.set(bounds.x1 - 0.8, y, bounds.z1 - 0.5);
    sk.rotation.y = Math.PI;
    b.group(lv).add(sk);
    pinPaper(b, lv, bounds.x0 + 1.6, y + 1.6, bounds.z1 - 0.12, Math.PI, 'laundry_note');

    const pr = P.pipeRun(bounds.x1 - bounds.x0 - 0.5, 0.06, 'x');
    pr.position.set(cx, y + GEO.CEIL_H - 0.3, cz - 1.4);
    b.group(lv).add(pr);
    const dripPos = new THREE.Vector3(cx, y + GEO.CEIL_H - 0.3, cz - 1.4);
    b.dynamic.push({ kind: 'drip', pos: dripPos, next: 2 + Math.random() * 3 });
    const bk = P.bucket(false);
    bk.position.set(cx, y, cz - 1.4);
    b.addMesh(lv, bk, { solid: false });
    spawnItem(b, lv, 'battery', cx + 1.2, y + 0.94, cz - 0.6);
    spawnItem(b, lv, 'tape_b', cx + 1.7, y + 0.94, cz - 0.6, { mesh: 'tape' });
    clutter(b, room, y, bounds, 31, 0.6);
  },

  cages(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'plaster');
    ceilingLight(b, room, y, cx, cz, { kind: 'fluorescent', intensity: 2.2, color: 0xd6e2ee, flicker: 0.4 });
    const mesh = MAT.metal(true);
    // storage cages in two rows
    for (let i = 0; i < 4; i++) {
      const x = bounds.x0 + 1.3 + i * 1.35;
      for (const zSign of [-1, 1]) {
        const z = cz + zSign * 1.7;
        const cage = new THREE.Group();
        for (let bar = 0; bar <= 8; bar++) {
          cage.add(P.box(0.03, 2.0, 0.03, mesh, -0.6 + bar * 0.15, 1.0, -0.75));
        }
        for (let bar = 0; bar <= 10; bar++) {
          cage.add(P.box(0.03, 2.0, 0.03, mesh, -0.6, 1.0, -0.75 + bar * 0.15));
        }
        cage.add(P.box(1.3, 0.04, 1.5, mesh, 0, 2.0, 0));
        cage.position.set(x, y, z);
        b.addMesh(lv, cage, { solid: false });
        b.addCollider(x - 0.62, x + 0.62, y, y + 2.0, z - 0.78, z - 0.72);
        b.addCollider(x - 0.62, x - 0.58, y, y + 2.0, z - 0.78, z + 0.78);
        // contents
        const rng = makeRng(`cage-${i}-${zSign}`);
        for (let k = 0; k < 3; k++) {
          const o = rng.pick([P.crate(0.45), P.cardboard(0.4, 0.35, false), P.suitcase()]);
          o.position.set(x + rng.range(-0.4, 0.4), y, z + rng.range(-0.4, 0.4));
          o.rotation.y = rng.range(0, 6);
          b.group(lv).add(o);
        }
      }
    }
    // one cage is open, with something in it
    spawnItem(b, lv, 'crowbar', bounds.x0 + 1.3, y + 0.02, cz + 1.7);
    const stack = P.newspaperStack(0.3);
    stack.position.set(bounds.x1 - 0.9, y, cz);
    b.addMesh(lv, stack, { solid: false });
    readable(b, lv, stack, 'news_fire');
  },

  boiler(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'plaster');
    ceilingLight(b, room, y, cx, cz, { intensity: 1.6, color: 0xffa860, flicker: 0.6 });
    const boil = new THREE.Group();
    boil.add(P.cyl(0.75, 2.2, MAT.metal(true), 0, 1.1, 0, true));
    boil.add(P.cyl(0.8, 0.16, MAT.metal(true), 0, 2.2, 0, true));
    boil.add(P.box(0.4, 0.5, 0.1, MAT.flat(0x2a2c28, 0.6, 0.5), 0, 1.0, 0.76));
    boil.position.set(cx - 1.2, y, cz - 1.0);
    b.addMesh(lv, boil, { solid: true });
    readable(b, lv, boil, 'boiler_note');

    for (const [px, pz, ax, len] of [[cx, cz, 'x', 5.0], [cx + 1.4, cz, 'z', 4.0]]) {
      const pr = P.pipeRun(len, 0.07, ax);
      pr.position.set(px, y + 2.4, pz);
      b.group(lv).add(pr);
    }
    for (let i = 0; i < 3; i++) {
      const v = P.valve();
      v.position.set(cx - 0.5 + i * 0.9, y + 2.4, cz);
      b.group(lv).add(v);
      b.interact(v, { type: 'valve', index: i });
    }
    const eb = P.electricalBox(true);
    eb.position.set(bounds.x1 - 0.3, y + 1.5, cz + 1.0);
    eb.rotation.y = -Math.PI / 2;
    b.group(lv).add(eb);
    b.interact(eb, { type: 'fusebox' });
    b.props.set('fusebox', eb);
    spawnItem(b, lv, 'fuse', bounds.x1 - 0.7, y + 0.02, cz + 1.6, { qty: 2 });
    clutter(b, room, y, bounds, 41, 0.8);
  },

  office(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'wood');
    ceilingLight(b, room, y, cx, cz, { intensity: 2.2, color: 0xffc078 });
    const dsk = P.desk(1.6);
    dsk.position.set(cx, y, cz - 1.2);
    b.addMesh(lv, dsk, { solid: true });
    lamp(b, room, y, cx - 0.5, cz - 1.2, { desk: true, onSurface: 0.79, intensity: 2.6, distance: 4.5 });
    const ch = P.chair(); ch.position.set(cx, y, cz - 0.2);
    b.addMesh(lv, ch, { solid: true });

    for (let i = 0; i < 3; i++) {
      const cab = P.cabinet(0.7, 1.5);
      cab.position.set(bounds.x0 + 0.7 + i * 0.8, y, bounds.z1 - 0.5);
      cab.rotation.y = Math.PI;
      b.addMesh(lv, cab, { solid: true });
      if (i === 1) b.interact(cab, { type: 'filecabinet' });
    }
    const sh = P.shelf(1.2, 2.0, true, 5);
    sh.position.set(bounds.x1 - 0.35, y, cz);
    sh.rotation.y = -Math.PI / 2;
    b.addMesh(lv, sh, { solid: true });

    const log = P.box(0.24, 0.05, 0.32, MAT.flat(0x3a3028, 0.9, 0), cx + 0.5, y + 0.81, cz - 1.2);
    b.group(lv).add(log);
    b.interact(log, { type: 'item', item: 'note_halvard', doc: 'note_halvard', label: 'Maintenance Log' });

    const keys = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const k = P.itemMesh('key');
      k.position.set(-0.3 + (i % 3) * 0.3, -0.1 - Math.floor(i / 3) * 0.16, 0);
      k.rotation.z = Math.PI;
      keys.add(k);
    }
    keys.position.set(bounds.x0 + 0.3, y + 1.6, cz);
    keys.rotation.y = Math.PI / 2;
    b.group(lv).add(keys);
    b.interact(keys, { type: 'keyboard_rack' });
    b.props.set('key_rack', keys);

    const board = P.plane(1.4, 0.9, MAT.flat(0x4a4032, 0.95, 0));
    board.position.set(cx, y + 1.75, bounds.z0 + 0.12);
    b.group(lv).add(board);
    pinPaper(b, lv, cx - 0.4, y + 1.85, bounds.z0 + 0.14, 0, 'note_tenant');
    pinPaper(b, lv, cx + 0.4, y + 1.7, bounds.z0 + 0.14, 0, 'notice_board');
  },

  maint(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'plaster');
    ceilingLight(b, room, y, cx, cz, { kind: 'fluorescent', intensity: 1.8, color: 0xd0dce8, flicker: 0.7 });
    const wb = P.workbench(1.8);
    wb.position.set(cx - 1.0, y, bounds.z1 - 0.6);
    wb.rotation.y = Math.PI;
    b.addMesh(lv, wb, { solid: true });
    const ld = P.ladder(2.4);
    ld.position.set(bounds.x1 - 0.6, y, bounds.z0 + 0.5);
    ld.rotation.y = 0.3;
    b.addMesh(lv, ld, { solid: true });
    const br = P.broom();
    br.position.set(bounds.x1 - 1.2, y, bounds.z0 + 0.4);
    br.rotation.z = 0.28;
    b.group(lv).add(br);
    const mb = P.meterBank(5);
    mb.position.set(bounds.x0 + 0.28, y + 1.6, cz);
    mb.rotation.y = Math.PI / 2;
    b.group(lv).add(mb);
    b.interact(mb, { type: 'examine', text: 'Five meters, one per occupied apartment. Four of them are turning slowly. The fifth — 204 — is turning very fast, and has been for a long time, judging by the numbers.' });
    spawnItem(b, lv, 'bulb', cx - 1.0, y + 0.94, bounds.z1 - 0.6, { qty: 2 });
    spawnItem(b, lv, 'recorder', cx - 1.6, y + 0.94, bounds.z1 - 0.6, { mesh: 'recorder' });
    spawnItem(b, lv, 'tape_a', cx - 0.4, y + 0.94, bounds.z1 - 0.6, { mesh: 'tape' });
    clutter(b, room, y, bounds, 51, 1.0);
  },

  sealed(b, room, bounds, y) {
    const lv = room.lv;
    floorFinish(b, lv, y, bounds, 'plaster');
    const cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    ceilingLight(b, room, y, cx, cz, { intensity: 0.8, color: 0x8fa0b0, broken: true });
    // burnt out. this is where the fire started.
    const rng = makeRng('sealed');
    for (let i = 0; i < 12; i++) {
      const o = rng.pick([P.crate(0.5), P.chair(true), P.cardboard(0.5, 0.4, true), P.barrel()]);
      o.position.set(rng.range(bounds.x0 + 0.8, bounds.x1 - 0.8), y, rng.range(bounds.z0 + 0.8, bounds.z1 - 0.8));
      o.rotation.y = rng.range(0, 6);
      o.traverse((c) => { if (c.isMesh) c.material = MAT.flat(0x1a1714, 0.98, 0); });
      b.addMesh(lv, o, { solid: true });
    }
    const g = P.graffitiDecal('SEVEN', 2.0, 1.4);
    g.position.set(cx, y + 1.7, bounds.z1 - 0.11);
    g.rotation.y = Math.PI;
    b.group(lv).add(g);
  },

  closet(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'plaster');
    ceilingLight(b, room, y, cx, cz, { intensity: 1.4, color: 0xffcf98, flicker: 0.4 });
    const sh = P.shelf(1.0, 2.0, false, 6);
    sh.position.set(bounds.x1 - 0.4, y, cz);
    sh.rotation.y = -Math.PI / 2;
    b.addMesh(lv, sh, { solid: true });
    const eb = P.electricalBox(false);
    eb.position.set(cx, y + 1.5, bounds.z0 + 0.12);
    eb.rotation.y = room.side === 'n' ? 0 : Math.PI;
    b.group(lv).add(eb);
    b.interact(eb, { type: 'breaker', roomId: room.id });
    spawnItem(b, lv, 'battery', bounds.x1 - 0.55, y + 1.0, cz + 0.3);
    spawnItem(b, lv, 'bulb', bounds.x1 - 0.55, y + 1.47, cz - 0.3);
    clutter(b, room, y, bounds, 61, 0.5);
  },

  lobby(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'tile');
    ceilingLight(b, room, y, cx, cz + 1.0, { intensity: 2.8, color: 0xffcf98, flicker: 0.15, id: 'lobby_main' });

    // the front door: double leaf, chained
    const doorW = 1.8;
    const frame = new THREE.Group();
    frame.add(P.box(doorW + 0.3, 0.14, 0.3, MAT.flat(0x3a3128, 0.86, 0.02), 0, 2.32, 0));
    for (const s of [-1, 1]) frame.add(P.box(0.16, 2.4, 0.3, MAT.flat(0x3a3128, 0.86, 0.02), s * (doorW / 2 + 0.08), 1.2, 0));
    for (const s of [-1, 1]) {
      const leaf = P.box(doorW / 2 - 0.02, 2.25, 0.07, MAT.door('doorGreen'), s * doorW / 4, 1.13, 0);
      frame.add(leaf);
      const glass = P.box(doorW / 2 - 0.24, 1.0, 0.02, MAT.glass(0x0a1218, 0.4), s * doorW / 4, 1.62, 0.04);
      frame.add(glass);
    }
    // the chain
    const chain = new THREE.Group();
    for (let i = 0; i < 14; i++) {
      const l = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.011, 5, 10), MAT.metal(true));
      l.position.set(-0.5 + i * 0.075, 1.2 + Math.sin(i * 0.6) * 0.02, 0.09);
      l.rotation.y = i % 2 ? Math.PI / 2 : 0;
      chain.add(l);
    }
    frame.add(chain);
    frame.position.set(cx, y, bounds.z1 - 0.2);
    b.group(lv).add(frame);
    b.addCollider(cx - doorW / 2, cx + doorW / 2, y, y + 2.3, bounds.z1 - 0.3, bounds.z1 - 0.1, { tag: 'frontdoor' });
    b.interact(frame, { type: 'frontdoor' });
    b.props.set('front_door', frame);

    const mb = P.mailboxes(12);
    mb.position.set(bounds.x0 + 0.4, y + 1.45, cz);
    mb.rotation.y = Math.PI / 2;
    b.group(lv).add(mb);
    b.interact(mb, { type: 'read', doc: 'mailbox_note', label: 'Mailboxes' });

    const board = P.plane(1.2, 0.8, MAT.flat(0x4a4032, 0.95, 0));
    board.position.set(cx + 2.0, y + 1.7, bounds.z0 + 0.12);
    b.group(lv).add(board);
    pinPaper(b, lv, cx + 2.0, y + 1.75, bounds.z0 + 0.14, 0, 'notice_board');

    const pl = P.deadPlant();
    pl.position.set(bounds.x1 - 0.7, y, bounds.z1 - 0.9);
    b.addMesh(lv, pl, { solid: true });
    const rad = P.radiator(1.0);
    rad.position.set(bounds.x1 - 1.0, y + 0.1, bounds.z0 + 0.3);
    b.addMesh(lv, rad, { solid: true });
    const st = P.newspaperStack(0.24);
    st.position.set(bounds.x0 + 1.6, y, bounds.z1 - 0.8);
    b.addMesh(lv, st, { solid: false });
    readable(b, lv, st, 'news_blackout');
    const gf = P.graffitiDecal('IT IS NOT THE BUILDING', 2.6, 0.9);
    gf.position.set(cx - 1.4, y + 1.2, bounds.z0 + 0.13);
    b.group(lv).add(gf);
    readable(b, lv, gf, 'graffiti_note');
  },

  records(b, room, bounds, y) {
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    floorFinish(b, lv, y, bounds, 'wood');
    windowDressing(b, room, y, bounds);
    ceilingLight(b, room, y, cx, cz, { intensity: 1.8, color: 0xffc078, flicker: 0.3 });
    // the building's memory, boxed
    for (let i = 0; i < 5; i++) {
      const sh = P.shelf(1.4, 2.1, false, i);
      sh.position.set(bounds.x0 + 1.0 + i * 1.3, y, bounds.z0 + 0.5);
      b.addMesh(lv, sh, { solid: true });
      for (let k = 0; k < 8; k++) {
        const bx = P.cardboard(0.3, 0.22, false);
        bx.position.set(bounds.x0 + 0.6 + i * 1.3 + (k % 2) * 0.42, y + 0.1 + Math.floor(k / 2) * 0.49, bounds.z0 + 0.5);
        b.group(lv).add(bx);
      }
    }
    const t = P.table(1.4, 0.9);
    t.position.set(cx, y, cz + 1.4);
    b.addMesh(lv, t, { solid: true });
    lamp(b, room, y, cx - 0.5, cz + 1.4, { desk: true, onSurface: 0.79, intensity: 2.4, distance: 4 });
    const folder = P.box(0.3, 0.04, 0.4, MAT.flat(0x8a7f66, 0.92, 0), cx + 0.3, y + 0.79, cz + 1.4);
    b.group(lv).add(folder);
    b.interact(folder, { type: 'item', item: 'file_404', doc: 'file_404', label: 'File — 404' });
    const bookM = P.box(0.32, 0.09, 0.42, MAT.flat(0x4a2a24, 0.9, 0), cx - 0.35, y + 0.83, cz + 1.5);
    b.group(lv).add(bookM);
    b.interact(bookM, { type: 'item', item: 'register', doc: 'register', label: 'Building Register' });
    spawnItem(b, lv, 'tape_c', cx + 0.9, y + 0.79, cz + 1.2, { mesh: 'tape' });
    clutter(b, room, y, bounds, 71, 0.4);
  },

  impossible(b, room, bounds, y) {
    // 403 is a copy of the player's own apartment, under years of dust.
    RECIPES.home(b, { ...room, id: room.id + '_copy' }, bounds, y);
    const lv = room.lv, cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
    const dust = P.plane(bounds.x1 - bounds.x0 - 0.3, bounds.z1 - bounds.z0 - 0.3, MAT.flat(0x6a6660, 0.99, 0));
    dust.rotation.x = -Math.PI / 2;
    dust.position.set(cx, y + 0.03, cz);
    dust.material.transparent = true;
    dust.material.opacity = 0.28;
    b.group(lv).add(dust);
    const marker = P.box(0.4, 0.02, 0.4, MAT.flat(0x2a2a28, 0.98, 0), cx, y + 0.05, cz);
    marker.visible = false;
    b.group(lv).add(marker);
    b.interact(marker, { type: 'read', doc: 'impossible_room' });
    // make it discoverable by looking at the table
    const t = P.table(0.6, 0.5, 0.8);
    t.position.set(cx + 2.2, y, cz - 1.8);
    b.addMesh(lv, t, { solid: true });
    b.interact(t, { type: 'read', doc: 'impossible_room' });
  },
};

export function furnishRoom(b, room, bounds, y) {
  const fn = RECIPES[room.furnish] || RECIPES.empty;
  try {
    fn(b, room, bounds, y);
  } catch (err) {
    console.error('furnish failed for', room.id, err);
    RECIPES.empty(b, room, bounds, y);
  }
}

export { RECIPES, spawnItem, readable, ceilingLight, pinPaper, floorFinish };
