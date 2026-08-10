// ══════════════════════════════════════════════════════════════════════
//  The building, as data.
//
//  Geometry:  the corridor runs along X. Apartments sit north (+Z) and
//  south (-Z) of it, three per side. The lift shaft is west, the
//  stairwell east. Levels stack every 3.3 m.
// ══════════════════════════════════════════════════════════════════════

export const GEO = {
  FLOOR_H: 3.3,
  CEIL_H: 2.85,
  SLAB: 0.45,

  COR_X0: -10, COR_X1: 10,
  COR_Z0: -1.75, COR_Z1: 1.75,

  ROOM_DEPTH: 6.5,
  N_Z0: 1.75, N_Z1: 8.25,
  S_Z0: -8.25, S_Z1: -1.75,

  // three slots per side, [x0, x1]
  SLOTS: [[-10, -3.6], [-3.4, 3.4], [3.6, 10]],

  ELEV_X0: -15.0, ELEV_X1: -10.0,
  ELEV_Z0: -2.0, ELEV_Z1: 2.0,
  ELEV_CAR_W: 1.9, ELEV_CAR_D: 2.2,

  STAIR_X0: 10.0, STAIR_X1: 16.6,
  STAIR_Z0: -3.2, STAIR_Z1: 3.2,
  LANDING_X1: 11.8,      // entry landing runs 10.0 → 11.8
  MIDLAND_X0: 15.2,      // mid landing runs 15.2 → 16.6
  STEPS: 10,

  WALL_T: 0.16,
  DOOR_W: 0.95,
  DOOR_H: 2.08,
};

export const LEVELS = [-1, 0, 1, 2, 3];      // basement … floor 4
export const ROOF_LEVEL = 4;
export const levelY = (lv) => lv * GEO.FLOOR_H;
export const levelName = (lv) =>
  lv === -1 ? 'Basement' : lv === ROOF_LEVEL ? 'Roof' : `Floor ${lv + 1}`;
export const levelShort = (lv) =>
  lv === -1 ? 'B' : lv === ROOF_LEVEL ? 'R' : String(lv + 1);

/** Centre of a room slot in world space. */
export function slotCenter(side, slot) {
  const [x0, x1] = GEO.SLOTS[slot];
  const z = side === 'n' ? (GEO.N_Z0 + GEO.N_Z1) / 2 : (GEO.S_Z0 + GEO.S_Z1) / 2;
  return { x: (x0 + x1) / 2, z };
}
export function slotBounds(side, slot) {
  const [x0, x1] = GEO.SLOTS[slot];
  const z0 = side === 'n' ? GEO.N_Z0 : GEO.S_Z0;
  const z1 = side === 'n' ? GEO.N_Z1 : GEO.S_Z1;
  return { x0, x1, z0, z1 };
}
/** Where a room's door sits in the corridor wall. */
export function doorSpot(side, slot) {
  const [x0, x1] = GEO.SLOTS[slot];
  return { x: (x0 + x1) / 2, z: side === 'n' ? GEO.COR_Z1 : GEO.COR_Z0 };
}

// ══════════════════ rooms ══════════════════
//  lock:  'open' | 'locked' | 'sealed' | 'key:<item>'
//  furnish: recipe name consumed by building.js
//  colour: door texture key

const R = (o) => o;

export const ROOMS = [
  // ── BASEMENT ──────────────────────────────────────────────────────
  R({ id: 'laundry', lv: -1, side: 'n', slot: 0, name: 'Laundry Room', kind: 'laundry',
      lock: 'open', furnish: 'laundry', door: 'doorGreen', plate: null, floor: 'tileWhite' }),
  R({ id: 'storage', lv: -1, side: 'n', slot: 1, name: 'Storage Cages', kind: 'storage',
      lock: 'open', furnish: 'cages', door: 'doorGreen', plate: null, floor: 'plaster' }),
  R({ id: 'boiler', lv: -1, side: 'n', slot: 2, name: 'Boiler Room', kind: 'boiler',
      lock: 'key:key_basement', furnish: 'boiler', door: 'metal', plate: null, floor: 'plaster' }),
  R({ id: 'office', lv: -1, side: 's', slot: 0, name: "Caretaker's Office", kind: 'office',
      lock: 'locked', furnish: 'office', door: 'doorBlue', plate: null, floor: 'wood', npc: 'halvard' }),
  R({ id: 'maint', lv: -1, side: 's', slot: 1, name: 'Maintenance', kind: 'maint',
      lock: 'open', furnish: 'maint', door: 'metal', plate: null, floor: 'plaster' }),
  R({ id: 'sealed', lv: -1, side: 's', slot: 2, name: '—', kind: 'sealed',
      lock: 'sealed', furnish: 'sealed', door: 'doorBlack', plate: null, floor: 'plaster' }),

  // ── FLOOR 1 ───────────────────────────────────────────────────────
  R({ id: 'lobby', lv: 0, side: 'n', slot: 0, name: 'Entrance Hall', kind: 'lobby',
      lock: 'open', furnish: 'lobby', door: null, plate: null, floor: 'tile' }),
  R({ id: '103', lv: 0, side: 'n', slot: 1, name: 'Apartment 103', kind: 'apartment',
      lock: 'open', furnish: 'abandoned', door: 'door', plate: '103', floor: 'wood', doc: 'note_door' }),
  R({ id: '105', lv: 0, side: 'n', slot: 2, name: 'Apartment 105', kind: 'apartment',
      lock: 'locked', furnish: 'empty', door: 'doorRed', plate: '105', floor: 'wood' }),
  R({ id: '102', lv: 0, side: 's', slot: 0, name: 'Apartment 102', kind: 'apartment',
      lock: 'locked', furnish: 'empty', door: 'door', plate: '102', floor: 'wood' }),
  R({ id: '104', lv: 0, side: 's', slot: 1, name: 'Apartment 104', kind: 'apartment',
      lock: 'open', furnish: 'mechanic', door: 'doorGreen', plate: '104', floor: 'wood', npc: 'tomas' }),
  R({ id: '106', lv: 0, side: 's', slot: 2, name: 'Apartment 106', kind: 'store',
      lock: 'open', furnish: 'junk', door: 'door', plate: '106', floor: 'wood' }),

  // ── FLOOR 2 ───────────────────────────────────────────────────────
  R({ id: '203', lv: 1, side: 'n', slot: 0, name: 'Apartment 203', kind: 'apartment',
      lock: 'locked', furnish: 'empty', door: 'doorBlue', plate: '203', floor: 'wood' }),
  R({ id: '205', lv: 1, side: 'n', slot: 1, name: 'Apartment 205', kind: 'apartment',
      lock: 'open', furnish: 'abandoned', door: 'door', plate: '205', floor: 'wood', doc: 'note_letter' }),
  R({ id: '207', lv: 1, side: 'n', slot: 2, name: 'Apartment 207', kind: 'apartment',
      lock: 'open', furnish: 'child', door: 'doorGreen', plate: '207', floor: 'wood', npc: 'mira' }),
  R({ id: '202', lv: 1, side: 's', slot: 0, name: 'Apartment 202', kind: 'apartment',
      lock: 'locked', furnish: 'empty', door: 'door', plate: '202', floor: 'wood' }),
  R({ id: '204', lv: 1, side: 's', slot: 1, name: 'Apartment 204', kind: 'home',
      lock: 'open', furnish: 'home', door: 'doorRed', plate: '204', floor: 'wood' }),
  R({ id: '206', lv: 1, side: 's', slot: 2, name: 'Utility Closet', kind: 'closet',
      lock: 'open', furnish: 'closet', door: 'metal', plate: null, floor: 'plaster' }),

  // ── FLOOR 3 ───────────────────────────────────────────────────────
  R({ id: '301', lv: 2, side: 'n', slot: 0, name: 'Apartment 301', kind: 'apartment',
      lock: 'locked', furnish: 'empty', door: 'door', plate: '301', floor: 'wood' }),
  R({ id: '305', lv: 2, side: 'n', slot: 1, name: 'Apartment 305', kind: 'apartment',
      lock: 'open', furnish: 'abandoned', door: 'doorBlue', plate: '305', floor: 'wood', doc: 'news_demolition' }),
  R({ id: '307', lv: 2, side: 'n', slot: 2, name: 'Apartment 307', kind: 'apartment',
      lock: 'locked', furnish: 'empty', door: 'door', plate: '307', floor: 'wood' }),
  R({ id: '302', lv: 2, side: 's', slot: 0, name: 'Apartment 302', kind: 'apartment',
      lock: 'open', furnish: 'oldwoman', door: 'doorGreen', plate: '302', floor: 'wood', npc: 'ilse' }),
  R({ id: '304', lv: 2, side: 's', slot: 1, name: 'Apartment 304', kind: 'apartment',
      lock: 'locked', furnish: 'empty', door: 'door', plate: '304', floor: 'wood' }),
  R({ id: '306', lv: 2, side: 's', slot: 2, name: 'Apartment 306', kind: 'apartment',
      lock: 'locked', furnish: 'empty', door: 'doorRed', plate: '306', floor: 'wood' }),

  // ── FLOOR 4 (only exists from Night 4) ────────────────────────────
  R({ id: '401', lv: 3, side: 'n', slot: 0, name: 'Apartment 401', kind: 'apartment',
      lock: 'open', furnish: 'voss', door: 'doorBlue', plate: '401', floor: 'wood', npc: 'voss' }),
  R({ id: '403', lv: 3, side: 'n', slot: 1, name: 'Apartment 403', kind: 'apartment',
      lock: 'open', furnish: 'impossible', door: 'doorBlack', plate: '403', floor: 'wood' }),
  R({ id: '405', lv: 3, side: 'n', slot: 2, name: 'Apartment 405', kind: 'apartment',
      lock: 'locked', furnish: 'empty', door: 'door', plate: '405', floor: 'wood' }),
  R({ id: '402', lv: 3, side: 's', slot: 0, name: 'Apartment 402', kind: 'apartment',
      lock: 'locked', furnish: 'empty', door: 'door', plate: '402', floor: 'wood' }),
  R({ id: '404', lv: 3, side: 's', slot: 1, name: 'Apartment 404', kind: 'apartment',
      lock: 'open', furnish: 'records', door: 'doorGreen', plate: '404', floor: 'wood' }),
  R({ id: '406', lv: 3, side: 's', slot: 2, name: 'Apartment 406', kind: 'apartment',
      lock: 'locked', furnish: 'empty', door: 'door', plate: '406', floor: 'wood' }),
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

/** The room the player sleeps in. */
export const HOME_ID = '204';
export const HOME_LEVEL = 1;

/** The door that shouldn't be there. Appears in the floor-3 corridor. */
export const NEW_DOOR = {
  id: 'newdoor', lv: 2, side: 's', slotX: -0.1, name: 'The Door',
};

// ══════════════════ light emitters per level ══════════════════
// Positions are corridor / stairwell fixtures. Rooms add their own.

export function corridorLights(lv) {
  const out = [];
  const y = levelY(lv) + GEO.CEIL_H - 0.18;
  for (let i = 0; i < 5; i++) {
    const x = -8 + i * 4;
    out.push({
      x, y, z: 0,
      color: lv === -1 ? 0xbfd0e0 : 0xffd2a0,
      intensity: lv === -1 ? 3.2 : 4.0,
      distance: 8.5,
      kind: lv === -1 ? 'fluorescent' : 'pendant',
      id: `cor_${lv}_${i}`,
    });
  }
  return out;
}
