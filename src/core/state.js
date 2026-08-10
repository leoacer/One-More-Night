// ── persistent game state + autosave ────────────────────────────────────
import { START_INVENTORY, ITEMS } from '../data/items.js';

const SAVE_KEY = 'omn.save.v1';
export const MAX_NIGHT = 7;
export const NIGHT_SECONDS = 600;      // ten minutes outside your door

export const NPCS = ['ilse', 'tomas', 'mira', 'voss', 'halvard'];

export function newState() {
  return {
    version: 1,
    night: 1,
    seed: Math.floor(Math.random() * 1e9),
    health: 100,
    food: 78,
    battery: 1,
    inventory: START_INVENTORY.map((i) => ({ ...i })),
    flags: {},
    evidence: [],
    docsRead: [],
    journal: { entries: [], notes: [], theories: [] },
    trust: { ilse: 1, tomas: 1, mira: 0, voss: 0, halvard: 0 },
    metNpcs: [],
    dialogueUsed: {},
    choices: [],
    visited: [],
    changesNoticed: [],
    stats: { nightsDone: 0, itemsFound: 0, docsFound: 0, distance: 0, deaths: 0, secondsOutside: 0 },
    lastNightSummary: null,
    ending: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ── inventory ───────────────────────────────────────────────────────────

export function addItem(st, id, qty = 1) {
  const def = ITEMS[id];
  if (!def) return false;
  const slot = st.inventory.find((s) => s.id === id);
  if (slot && (def.stack || def.kind === 'consumable' || def.kind === 'tool')) {
    if (def.unique) return false;
    slot.qty += qty;
  } else if (slot) {
    return false;
  } else {
    st.inventory.push({ id, qty });
  }
  st.stats.itemsFound += qty;
  return true;
}

export function hasItem(st, id, qty = 1) {
  const slot = st.inventory.find((s) => s.id === id);
  return !!slot && slot.qty >= qty;
}

export function removeItem(st, id, qty = 1) {
  const i = st.inventory.findIndex((s) => s.id === id);
  if (i < 0) return false;
  st.inventory[i].qty -= qty;
  if (st.inventory[i].qty <= 0) st.inventory.splice(i, 1);
  return true;
}

export function countItem(st, id) {
  const slot = st.inventory.find((s) => s.id === id);
  return slot ? slot.qty : 0;
}

// ── flags / trust / evidence ────────────────────────────────────────────

export const flag = (st, k) => !!st.flags[k];
export function setFlag(st, k, v = true) { st.flags[k] = v; }

export function trust(st, npc) { return st.trust[npc] ?? 0; }
export function addTrust(st, npc, d) {
  st.trust[npc] = Math.max(-5, Math.min(6, (st.trust[npc] ?? 0) + d));
  return st.trust[npc];
}
export function trustLabel(v) {
  if (v <= -3) return 'hostile';
  if (v <= -1) return 'wary';
  if (v < 2) return 'neutral';
  if (v < 4) return 'warm';
  return 'trusting';
}

export function addEvidence(st, docId) {
  if (st.evidence.includes(docId)) return false;
  st.evidence.push(docId);
  st.stats.docsFound++;
  return true;
}

export function addJournal(st, entry) {
  const e = {
    cat: entry.cat || 'events',
    title: entry.title,
    text: entry.text || '',
    night: st.night,
    id: entry.id || `${entry.cat}:${entry.title}`,
    unread: true,
  };
  const existing = st.journal.entries.find((x) => x.id === e.id);
  if (existing) return false;
  st.journal.entries.push(e);
  return true;
}

export function markVisited(st, roomId) {
  if (!st.visited.includes(roomId)) st.visited.push(roomId);
}

export function noteChange(st, text) {
  if (!st.changesNoticed.includes(text)) st.changesNoticed.push(text);
}

// ── save / load ─────────────────────────────────────────────────────────

export function save(st, label = 'auto') {
  st.updatedAt = Date.now();
  st.saveLabel = label;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(st));
    return true;
  } catch {
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const st = JSON.parse(raw);
    if (!st || st.version !== 1) return null;
    // heal any missing fields introduced by a newer build
    const base = newState();
    return {
      ...base, ...st,
      trust: { ...base.trust, ...(st.trust || {}) },
      journal: { ...base.journal, ...(st.journal || {}) },
      stats: { ...base.stats, ...(st.stats || {}) },
    };
  } catch {
    return null;
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

export function saveInfo() {
  const st = load();
  if (!st) return null;
  return {
    night: st.night,
    evidence: st.evidence.length,
    when: new Date(st.updatedAt || Date.now()),
    ending: st.ending,
  };
}
