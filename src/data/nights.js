// ══════════════════════════════════════════════════════════════════════
//  Seven nights.
//
//  makeNightPlan() produces everything the world builder needs: which
//  doors are locked, which rooms exist, where people are, what the lift
//  does, and the list of small wrongnesses the player may or may not
//  notice. Later nights layer changes on top of earlier ones.
// ══════════════════════════════════════════════════════════════════════
import { makeRng } from '../core/util.js';
import { ROOMS, GEO } from '../world/layout.js';
import { flag } from '../core/state.js';
import { t } from '../core/i18n.js';

/** t() with {placeholder} substitution — the changing world needs names in its sentences. */
function ts(key, fallback, vars) {
  let s = t(key, fallback);
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
}

const NO_NUMBER_DOOR = () => t('world.doorNoNumber', 'The door with no number');

export const NIGHTS = {
  1: {
    eyebrow: 'NIGHT ONE',
    title: 'Nothing Happens Tonight',
    text: `Eleven days without power.

You have food for a while yet and a torch that works, and the building has settled into the particular quiet of a place where the machines have stopped.

Ten minutes. That is what you allow yourself — out of the door, down the stairs, and back before the ten minutes are gone. You have never been able to say why the number matters. It simply does.

Go and see who is still here.`,
  },
  2: {
    eyebrow: 'NIGHT TWO',
    title: 'The Missing Apartment',
    text: `You slept badly and you do not remember why.

Somebody was talking in the stairwell for a long time. When you finally got up and opened the door, the landing was empty and the talking carried on for another two words before it stopped.

Ilse asked you to come up tonight. She said it twice, which is unlike her.`,
  },
  3: {
    eyebrow: 'NIGHT THREE',
    title: 'The New Door',
    text: `You have started making a list.

Small things. The corridor lamp outside 205 that was working and then was not and then was again. The smell of soup on a floor where nobody cooks.

The list is not long enough to mean anything yet. That is the problem with lists.`,
  },
  4: {
    eyebrow: 'NIGHT FOUR',
    title: 'Wrong Floor',
    text: `The lift has a button for the fourth floor.

You are almost certain it did not have one on Tuesday, and you are entirely certain there is no fourth floor, because you have walked to the top of the stairwell and it ends at three with a wall.

Almost certain. Entirely certain. You have begun grading your own memory, which is new.`,
  },
  5: {
    eyebrow: 'NIGHT FIVE',
    title: 'The Residents',
    text: `Tomas told you the same story twice tonight, word for word, including the pause.

You are not going to mention it. You have a theory about why, and the theory frightens you slightly less than asking would.

Somebody has been on the landing outside your door for the last hour. They have not knocked.`,
  },
  6: {
    eyebrow: 'NIGHT SIX',
    title: 'The Truth',
    text: `There is a version of tonight where you stay in bed.

You have thought about it seriously, the way you think about the front door: a thing that is theoretically available and that you will not do.

Everything you have found so far points at the same shape. Tonight you go and look at it directly.`,
  },
  7: {
    eyebrow: 'NIGHT SEVEN',
    title: 'One More Night',
    text: `The corridor outside your door is longer than it was.

Not much. Six paces, perhaps. Enough that you counted, and then counted again, and then stopped counting because Voss told you what counting does.

Everything ends tonight, one way or another. The building has been very clear about that, in its way.`,
  },
};

const CHANGE_POOL = [
  {
    id: 'plate_swap',
    apply(plan, rng, st) {
      const lv = rng.pick([0, 1, 2]);
      const cands = ROOMS.filter((r) => r.lv === lv && r.plate);
      if (cands.length < 2) return null;
      const [a, b] = rng.pickN(cands, 2);
      plan.plateSwaps[a.id] = b.plate;
      plan.plateSwaps[b.id] = a.plate;
      const [x] = slotX(a);
      return {
        obs: { lv, x, z: sideZ(a), r: 3.2, text: ts('chg.plate_swap.obs', 'The number on {room} reads {now}. You are certain it read {was}.', { room: a.plate, now: b.plate, was: a.plate }) },
        note: ts('chg.plate_swap.note', 'Apartment numbers {a} and {b} have swapped places.', { a: a.plate, b: b.plate }),
      };
    },
  },
  {
    id: 'door_colour',
    apply(plan, rng) {
      const cands = ROOMS.filter((r) => r.lv >= 0 && r.lv <= 2 && r.kind === 'apartment');
      const r = rng.pick(cands);
      const was = r.door;
      const now = rng.pick(['door', 'doorGreen', 'doorBlue', 'doorRed'].filter((d) => d !== was));
      plan.roomState[r.id] = { ...(plan.roomState[r.id] || {}), door: now };
      const [x] = slotX(r);
      return {
        obs: { lv: r.lv, x, z: sideZ(r), r: 2.8, text: ts('chg.door_colour.obs', '{room} has been repainted. It was not this colour yesterday. There is no smell of paint.', { room: r.name }) },
        note: ts('chg.door_colour.note', '{room} changed colour overnight.', { room: r.name }),
      };
    },
  },
  {
    id: 'lamp_out',
    apply(plan, rng) {
      const lv = rng.pick([-1, 0, 1, 2]);
      const i = rng.int(0, 4);
      plan.lightsOff.push(`cor_${lv}_${i}`);
      return {
        obs: { lv, x: -8 + i * 4, z: 0, r: 3.0, text: t('chg.lamp_out.obs', 'The corridor lamp here is dead. The glass is cold. It was on when you passed it.') },
        note: null,
      };
    },
  },
  {
    id: 'lamp_on',
    apply(plan, rng) {
      const lv = rng.pick([-1, 0, 1, 2]);
      plan.lightsForced.push(`cor_${lv}_${rng.int(0, 4)}`);
      return { obs: null, note: null };
    },
  },
  {
    id: 'unlock',
    apply(plan, rng) {
      const cands = ROOMS.filter((r) => r.lv >= 0 && r.lv <= 2 && r.lock === 'locked' && r.furnish === 'empty');
      if (!cands.length) return null;
      const r = rng.pick(cands);
      plan.roomState[r.id] = { ...(plan.roomState[r.id] || {}), lock: 'open', furnish: 'abandoned' };
      const [x] = slotX(r);
      return {
        obs: { lv: r.lv, x, z: sideZ(r), r: 2.6, text: ts('chg.unlock.obs', '{room} is unlocked. It has been locked every night since you moved in.', { room: r.name }) },
        note: ts('chg.unlock.note', '{room} was open tonight.', { room: r.name }),
      };
    },
  },
  {
    id: 'lock',
    apply(plan, rng) {
      const cands = ROOMS.filter((r) => r.lv >= 0 && r.lv <= 2 && r.lock === 'open' && !r.npc && r.kind === 'apartment');
      if (!cands.length) return null;
      const r = rng.pick(cands);
      plan.roomState[r.id] = { ...(plan.roomState[r.id] || {}), lock: 'locked' };
      return { obs: null, note: ts('chg.lock.note', '{room} is locked tonight. It was not before.', { room: r.name }) };
    },
  },
  {
    id: 'graffiti',
    apply(plan, rng) {
      const lv = rng.pick([-1, 0, 1, 2]);
      const [key, en] = rng.pick([['404', '404'], ['w.heCounts', 'HE COUNTS'], ['w.oneMore', 'ONE MORE'],
        ['w.shutTheDoor', 'SHUT THE DOOR'], ['w.sevenLower', 'seven'], ['w.itIsYou', 'IT IS YOU']]);
      const text = t(key, en);
      plan.graffiti.push({ lv, x: rng.range(-8, 8), text });
      return { obs: null, note: null };
    },
  },
  {
    id: 'moved_prop',
    apply(plan, rng) {
      const which = rng.pick(['rocking_horse', 'mira_ball', 'home_clock', 'front_door']);
      plan.movedProps.push(which);
      return { obs: null, note: null };
    },
  },
];

function slotX(room) {
  const [a, b] = GEO.SLOTS[room.slot];
  return [(a + b) / 2];
}
function sideZ(room) {
  return room.side === 'n' ? GEO.COR_Z1 - 0.4 : GEO.COR_Z0 + 0.4;
}

/**
 * Build the plan for tonight.
 * Deterministic given (save seed, night) so a reload rebuilds the same building.
 */
export function makeNightPlan(st) {
  const n = st.night;
  const rng = makeRng(`night-${st.seed}-${n}`);
  const plan = {
    night: n,
    seed: st.seed,
    roomState: {},
    hiddenRooms: [],
    extraDoors: [],
    floor4Open: n >= 4 || flag(st, 'floor4_found'),
    plateSwaps: {},
    lightsOff: [],
    lightsForced: [],
    graffiti: [],
    movedProps: [],
    observations: [],
    changeNotes: [],
    npcs: [],
    events: [],
    elevatorMap: null,
    distortion: 0,
    corridorStretch: 0,
    threat: { follower: false, aggression: 0, from: 0 },
    allowSleepEarly: true,
    title: NIGHTS[n]?.title || `Night ${n}`,
  };

  // ── floor 4 does not exist until the building admits it
  if (!plan.floor4Open) {
    for (const r of ROOMS) if (r.lv === 3) plan.hiddenRooms.push(r.id);
  }

  // ── baseline people
  const place = (id, roomId, opts = {}) => plan.npcs.push({ id, roomId, ...opts });
  place('ilse', '302');
  place('tomas', '104');
  place('mira', '207');
  place('halvard', 'corridor:-1', { wander: true });
  if (plan.floor4Open) place('voss', '401');

  // ── night-specific script ─────────────────────────────────────────────
  switch (n) {
    case 1: {
      plan.distortion = 0.0;
      plan.events.push(
        { at: 70, type: 'sfx', sound: 'creak', where: 'above' },
        { at: 155, type: 'sfx', sound: 'drop', where: 'far' },
        { at: 240, type: 'voices', where: 'wall' },
        { at: 330, type: 'sfx', sound: 'pipe_clank', where: 'near' },
        { at: 420, type: 'footsteps', where: 'stairs' },
        { at: 520, type: 'sfx', sound: 'knock', where: 'far' },
      );
      break;
    }

    case 2: {
      plan.distortion = 0.05;
      // Ilse is home, and then she is not
      plan.npcs.find((p) => p.id === 'ilse').despawnAt = 235;
      plan.events.push(
        { at: 236, type: 'ilse_vanish' },
        { at: 90, type: 'voices', where: 'wall' },
        { at: 300, type: 'sfx', sound: 'door_close', where: 'far' },
        { at: 380, type: 'footsteps', where: 'corridor' },
        { at: 470, type: 'lights_dip' },
        { at: 545, type: 'sfx', sound: 'whisper', where: 'behind' },
      );
      plan.roomState['302'] = { lock: 'open' };
      break;
    }

    case 3: {
      plan.distortion = 0.1;
      plan.extraDoors.push({
        id: 'newdoor', lv: 2, side: 's', x: (GEO.SLOTS[0][1] + GEO.SLOTS[1][0]) / 2,
        texture: 'doorBlack', label: NO_NUMBER_DOOR(), locked: true, interact: 'newdoor',
      });
      plan.observations.push({
        id: 'newdoor_seen', lv: 2, x: (GEO.SLOTS[0][1] + GEO.SLOTS[1][0]) / 2, z: GEO.COR_Z0 + 0.5, r: 3.4,
        text: t('obs.newdoor_seen', 'There is a door here. Between 302 and 304, in a stretch of wall you have walked past a hundred times. It has no number.'),
        journal: {
          cat: 'events',
          title: t('obs.newdoor_seen.jt', 'A door that was not there'),
          text: t('obs.newdoor_seen.jx', 'Third floor, south side, between 302 and 304. No number plate, no keyhole, warm to the touch. It has always been there, according to the paint.'),
        },
        flag: 'seen_newdoor',
      });
      plan.events.push(
        { at: 120, type: 'sfx', sound: 'knock', where: 'newdoor' },
        { at: 260, type: 'footsteps', where: 'above' },
        { at: 340, type: 'lights_dip' },
        { at: 430, type: 'sfx', sound: 'whisper', where: 'behind' },
        { at: 520, type: 'sfx', sound: 'wood_groan', where: 'near' },
      );
      plan.threat = { follower: true, aggression: 0.15, from: 300 };
      break;
    }

    case 4: {
      plan.distortion = 0.16;
      plan.extraDoors.push({
        id: 'newdoor', lv: 2, side: 's', x: (GEO.SLOTS[0][1] + GEO.SLOTS[1][0]) / 2,
        texture: 'doorBlack', label: NO_NUMBER_DOOR(), locked: true, interact: 'newdoor',
      });
      // the lift lies about where it is going
      plan.elevatorMap = { '-1': -1, 0: 0, 1: rng.chance(0.5) ? 2 : 1, 2: 3, 3: rng.chance(0.6) ? 1 : 3 };
      plan.corridorStretch = 0.0;
      plan.events.push(
        { at: 60, type: 'sfx', sound: 'elev_doors', where: 'far' },
        { at: 190, type: 'moved_behind' },
        { at: 300, type: 'lights_dip' },
        { at: 395, type: 'footsteps', where: 'corridor' },
        { at: 480, type: 'sfx', sound: 'whisper', where: 'behind' },
      );
      plan.observations.push({
        id: 'lift_wrong', lv: 3, x: -9, z: 0, r: 4,
        text: t('obs.lift_wrong', 'The lift said three. The plate on the wall says four. Both of them cannot be right and neither of them feels like it is lying.'),
        journal: {
          cat: 'events',
          title: t('obs.lift_wrong.jt', 'The lift goes to four'),
          text: t('obs.lift_wrong.jx', 'Pressing 3 put me on a floor whose plates all read 4. The stairwell above the third floor is still blocked with junk.'),
        },
        flag: 'seen_floor4',
      });
      plan.threat = { follower: true, aggression: 0.3, from: 200 };
      break;
    }

    case 5: {
      plan.distortion = 0.24;
      plan.extraDoors.push({
        id: 'newdoor', lv: 2, side: 's', x: (GEO.SLOTS[0][1] + GEO.SLOTS[1][0]) / 2,
        texture: 'doorBlack', label: NO_NUMBER_DOOR(), locked: true, interact: 'newdoor',
      });
      plan.elevatorMap = { '-1': -1, 0: 0, 1: 1, 2: 2, 3: 3 };
      // people are in the wrong places
      plan.npcs = [];
      place('ilse', '305');
      place('tomas', '104');
      place('mira', '207');
      place('voss', '401');
      place('halvard', 'corridor:2', { wander: true, hostile: true });
      plan.roomState['305'] = { lock: 'open' };
      plan.roomState['105'] = { lock: 'open', furnish: 'abandoned' };
      plan.events.push(
        { at: 45, type: 'sfx', sound: 'breath', where: 'behind' },
        { at: 150, type: 'moved_behind' },
        { at: 250, type: 'sfx', sound: 'knock', where: 'behind' },
        { at: 330, type: 'lights_dip' },
        { at: 410, type: 'moved_behind' },
        { at: 500, type: 'sfx', sound: 'whisper', where: 'behind' },
      );
      plan.threat = { follower: true, aggression: 0.6, from: 60 };
      plan.observations.push({
        id: 'ilse_moved', lv: 2, x: 0, z: GEO.COR_Z1 - 0.4, r: 4,
        text: t('obs.ilse_moved', 'Ilse is in 305 tonight, and behaves as though she has always been in 305. Her furniture is in 305. It was in 302 yesterday, and 302 is empty again.'),
        journal: {
          cat: 'characters',
          title: t('obs.ilse_moved.jt', 'Ilse has moved apartments'),
          text: t('obs.ilse_moved.jx', 'She lives in 305 now, with all her things, and does not remember 302. 302 is empty and clean.'),
        },
      });
      break;
    }

    case 6: {
      plan.distortion = 0.34;
      plan.extraDoors.push({
        id: 'newdoor', lv: 2, side: 's', x: (GEO.SLOTS[0][1] + GEO.SLOTS[1][0]) / 2,
        texture: 'doorBlack', label: NO_NUMBER_DOOR(), locked: true, interact: 'newdoor',
      });
      plan.roomState['404'] = { lock: 'open' };
      plan.roomState['office'] = { lock: 'open' };
      plan.roomState['boiler'] = { lock: 'open' };
      plan.npcs = [];
      place('ilse', '302');
      place('tomas', 'corridor:0', { wander: true });
      place('mira', '207');
      place('voss', '401');
      place('halvard', 'office', { hostile: true });
      plan.events.push(
        { at: 80, type: 'voices', where: 'wall' },
        { at: 200, type: 'lights_dip' },
        { at: 300, type: 'moved_behind' },
        { at: 420, type: 'sfx', sound: 'reverse_swell', where: 'near' },
        { at: 470, type: 'sfx', sound: 'stinger', where: 'behind' },
        { at: 540, type: 'sfx', sound: 'heartbeat', where: 'self' },
      );
      plan.threat = { follower: true, aggression: 0.75, from: 40 };
      plan.observations.push({
        id: 'stair_wedge', lv: 0, x: 9.4, z: 0, r: 2.2,
        text: t('obs.stair_wedge', 'There is something wedged under the stairwell door on this floor.'),
      });
      break;
    }

    case 7: {
      plan.distortion = 0.5;
      plan.corridorStretch = 1;
      plan.extraDoors.push({
        id: 'newdoor', lv: 2, side: 's', x: (GEO.SLOTS[0][1] + GEO.SLOTS[1][0]) / 2,
        texture: 'doorBlack', label: NO_NUMBER_DOOR(), locked: false, interact: 'newdoor_final',
      });
      plan.roomState['404'] = { lock: 'open' };
      plan.roomState['office'] = { lock: 'open' };
      plan.npcs = [];
      place('ilse', '302');
      place('mira', '207');
      place('voss', '401');
      place('tomas', '104');
      place('halvard', 'corridor:2', { wander: true, hostile: true });
      plan.elevatorMap = { '-1': 3, 0: -1, 1: 2, 2: 0, 3: 1 };
      plan.events.push(
        { at: 30, type: 'sfx', sound: 'boom', where: 'far' },
        { at: 120, type: 'lights_dip' },
        { at: 220, type: 'moved_behind' },
        { at: 300, type: 'sfx', sound: 'whisper', where: 'behind' },
        { at: 380, type: 'lights_dip' },
        { at: 460, type: 'sfx', sound: 'stinger', where: 'behind' },
      );
      plan.threat = { follower: true, aggression: 0.9, from: 20 };
      plan.allowSleepEarly = false;
      break;
    }
    default: break;
  }

  // ── layered subtle changes: more of them, later
  const nChanges = n === 1 ? 0 : Math.min(6, n);
  const pool = rng.shuffle(CHANGE_POOL);
  let applied = 0;
  for (const c of pool) {
    if (applied >= nChanges) break;
    const res = c.apply(plan, rng, st);
    if (!res) continue;
    applied++;
    if (res.obs) plan.observations.push({ id: `${c.id}_${applied}`, ...res.obs });
    if (res.note) plan.changeNotes.push(res.note);
  }

  // ── things that stay unlocked once you have earned them
  if (flag(st, 'has_office_key')) plan.roomState['office'] = { ...(plan.roomState['office'] || {}), lock: 'open' };
  if (flag(st, 'boiler_open')) plan.roomState['boiler'] = { ...(plan.roomState['boiler'] || {}), lock: 'open' };

  return plan;
}

/** Ambient sound bed mix for a given place. */
export function ambienceFor(level, night, insideRoom) {
  const outdoors = level === 4;
  const basement = level === -1;
  return {
    rain: outdoors ? 0.55 : basement ? 0.02 : insideRoom ? 0.12 : 0.07,
    wind: outdoors ? 0.4 : basement ? 0.04 : 0.09,
    hum: basement ? 0.16 : outdoors ? 0 : 0.06,
    pipes: basement ? 0.2 : 0.05,
    drone: 0.03 + night * 0.014,
  };
}
