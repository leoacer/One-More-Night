// ══════════════════════════════════════════════════════════════════════
//  Localisation.
//
//  A language pack is a flat map of key → string. Nothing is duplicated
//  structurally: the English data files stay the single source of shape,
//  and a pack overrides individual strings inside them by derived key.
//
//    ui.*                 interface chrome and runtime messages
//    night.<n>.title      night cards
//    end.<id>.body        endings
//    item.<id>.desc       inventory
//    npc.<id>.bio         residents
//    doc.<id>.b<i>        the i-th paragraph of a document
//    dlg.<npc>.<node>     what a resident says
//    dlg.<npc>.<node>.o<i>  the i-th thing you can say back
//
//  Any key a pack omits falls back to English, so a partial translation
//  degrades one string at a time instead of breaking.
// ══════════════════════════════════════════════════════════════════════

import { DOCS } from '../data/lore.js';
import { DIALOGUE, NPC_DEFS } from '../data/dialogue.js';
import { NIGHTS } from '../data/nights.js';
import { ENDINGS } from '../systems/endings.js';
import { ITEMS, COMBOS } from '../data/items.js';
import { ROOMS, NEW_DOOR } from '../world/layout.js';

export const LANGS = {
  en: { name: 'English', htmlLang: 'en' },
  sv: { name: 'Svenska', htmlLang: 'sv' },
};

let pack = {};
let current = 'en';
let english = null;          // snapshot of the untranslated strings
const listeners = new Set();

export const lang = () => current;
export function onLanguageChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Look up a key, falling back to the English literal at the call site. */
export function t(key, fallback) {
  const v = pack[key];
  return v === undefined ? (fallback === undefined ? key : fallback) : v;
}

/** Pick between a value already in the data and its translation. */
export const tv = (key, value) => t(key, value);

// ── which fields of each structure carry text ──────────────────────────

function bodyField(part) {
  if (part.h !== undefined) return 'h';
  if (part.p !== undefined) return 'p';
  if (part.text !== undefined) return 'text';
  return null;
}

/** Walk every translatable string, calling fn(key, get, set). */
function walk(fn) {
  for (const [id, d] of Object.entries(DOCS)) {
    fn(`doc.${id}.title`, () => d.title, (v) => { d.title = v; });
    (d.body || []).forEach((part, i) => {
      const f = bodyField(part);
      if (f) fn(`doc.${id}.b${i}`, () => part[f], (v) => { part[f] = v; });
      if (part.spk !== undefined) fn(`doc.${id}.b${i}.spk`, () => part.spk, (v) => { part.spk = v; });
    });
    if (d.journal) {
      fn(`doc.${id}.jt`, () => d.journal.title, (v) => { d.journal.title = v; });
      fn(`doc.${id}.jx`, () => d.journal.text, (v) => { d.journal.text = v; });
    }
    if (d.note !== undefined) fn(`doc.${id}.note`, () => d.note, (v) => { d.note = v; });
  }

  for (const [npc, tree] of Object.entries(DIALOGUE)) {
    for (const [nid, node] of Object.entries(tree.nodes)) {
      if (typeof node.text === 'string') {
        fn(`dlg.${npc}.${nid}`, () => node.text, (v) => { node.text = v; });
      }
      (node.opts || []).forEach((o, i) => {
        fn(`dlg.${npc}.${nid}.o${i}`, () => o.t, (v) => { o.t = v; });
        if (o.fx?.journal) {
          fn(`dlg.${npc}.${nid}.o${i}.jt`, () => o.fx.journal.title, (v) => { o.fx.journal.title = v; });
          fn(`dlg.${npc}.${nid}.o${i}.jx`, () => o.fx.journal.text, (v) => { o.fx.journal.text = v; });
        }
      });
    }
  }

  for (const [id, d] of Object.entries(NPC_DEFS)) {
    fn(`npc.${id}.name`, () => d.name, (v) => { d.name = v; });
    fn(`npc.${id}.role`, () => d.role, (v) => { d.role = v; });
    fn(`npc.${id}.short`, () => d.short, (v) => { d.short = v; });
    fn(`npc.${id}.bio`, () => d.bio, (v) => { d.bio = v; });
  }

  for (const [n, d] of Object.entries(NIGHTS)) {
    fn(`night.${n}.eyebrow`, () => d.eyebrow, (v) => { d.eyebrow = v; });
    fn(`night.${n}.title`, () => d.title, (v) => { d.title = v; });
    fn(`night.${n}.text`, () => d.text, (v) => { d.text = v; });
  }

  for (const [id, d] of Object.entries(ENDINGS)) {
    fn(`end.${id}.title`, () => d.title, (v) => { d.title = v; });
    fn(`end.${id}.body`, () => d.body, (v) => { d.body = v; });
  }

  for (const r of ROOMS) {
    fn(`room.${r.id}.name`, () => r.name, (v) => { r.name = v; });
  }
  fn('room.newdoor.name', () => NEW_DOOR.name, (v) => { NEW_DOOR.name = v; });

  for (const [id, d] of Object.entries(ITEMS)) {
    fn(`item.${id}.name`, () => d.name, (v) => { d.name = v; });
    if (d.desc !== undefined) fn(`item.${id}.desc`, () => d.desc, (v) => { d.desc = v; });
    if (d.clue !== undefined) fn(`item.${id}.clue`, () => d.clue, (v) => { d.clue = v; });
    if (d.useLabel !== undefined) fn(`item.${id}.use`, () => d.useLabel, (v) => { d.useLabel = v; });
  }

  COMBOS.forEach((c, i) => {
    fn(`combo.${i}.label`, () => c.label, (v) => { c.label = v; });
    if (typeof c.out === 'string' && c.out.startsWith('note:')) {
      fn(`combo.${i}.note`, () => c.out.slice(5), (v) => { c.out = `note:${v}`; });
    }
  });
}

function snapshot() {
  if (english) return;
  english = {};
  walk((key, get) => { english[key] = get(); });
}

// ── interface chrome. Selector → key, so index.html stays clean. ───────

const DOM = [
  ['#mainmenu .mm-sub', 'ui.tagline'],
  ['#btn-continue', 'ui.continue'],
  ['#mainmenu button[data-act="new"]', 'ui.newGame'],
  ['#mainmenu button[data-act="settings"]', 'ui.settings'],
  ['#mainmenu button[data-act="credits"]', 'ui.about'],
  ['#pause .m-title', 'ui.paused'],
  ['#pause button[data-act="resume"]', 'ui.resume'],
  ['#pause button[data-act="settings"]', 'ui.settings'],
  ['#pause button[data-act="save"]', 'ui.saveContinue'],
  ['#pause button[data-act="quit"]', 'ui.abandon'],
  ['#settings .m-title', 'ui.settings'],
  ['#settings button[data-act="back"]', 'ui.back'],
  ['#credits .m-title', 'ui.about'],
  ['#credits button[data-act="back"]', 'ui.back'],
  ['#inventory h2', 'ui.inventory'],
  ['#inventory .hint', 'ui.invHint'],
  ['#inv-detail .empty', 'ui.nothingSelected'],
  ['#journal h2', 'ui.journal'],
  ['#journal .hint', 'ui.journalHint'],
  ['#reader .reader-foot', 'ui.readerFoot'],
  ['#summary .sum-note label', 'ui.writeBeforeSleep'],
  ['#sum-btn', 'ui.sleep'],
  ['#ending .end-eyebrow', 'ui.ending'],
  ['#end-again', 'ui.beginAgain'],
  ['#end-menu', 'ui.mainMenu'],
  ['#gameover h1', 'ui.didNotComeBack'],
  ['#go-retry', 'ui.wakeUp'],
  ['#go-menu', 'ui.mainMenu'],
  ['#unsupported .m-title', 'ui.noWebgl'],
  ['#sum-h-found', 'ui.found'],
  ['#sum-h-noticed', 'ui.noticed'],
  ['#sum-h-people', 'ui.people'],
];

const SETTING_LABELS = [
  ['set-sens', 'set.sensitivity'], ['set-fov', 'set.fov'], ['set-vol', 'set.volume'],
  ['set-bright', 'set.brightness'], ['set-bob', 'set.bob'], ['set-grain', 'set.grain'],
  ['set-invert', 'set.invertY'], ['set-subs', 'set.subtitles'], ['set-flash', 'set.reduceFlashing'],
  ['set-quality', 'set.quality'], ['set-lang', 'set.lang'],
];

function patchDom() {
  for (const [sel, key] of DOM) {
    const n = document.querySelector(sel);
    if (!n) continue;
    const v = pack[key];
    if (v !== undefined) n.textContent = v;
    else if (english?.dom?.[sel] !== undefined) n.textContent = english.dom[sel];
  }
  for (const [id, key] of SETTING_LABELS) {
    const row = document.getElementById(id)?.closest('.set-row');
    const label = row?.querySelector('label');
    if (!label) continue;
    const v = pack[key];
    if (v !== undefined) label.textContent = v;
    else if (english?.dom?.[`label:${id}`] !== undefined) label.textContent = english.dom[`label:${id}`];
  }
  const sub = document.querySelector('.watch-label');
  if (sub) sub.childNodes[0].nodeValue = `${t('ui.nightShort', 'NIGHT')} `;
  const prose = document.querySelector('#credits .prose');
  if (prose && pack['ui.aboutHtml'] !== undefined) prose.innerHTML = pack['ui.aboutHtml'];
  else if (prose && english?.aboutHtml !== undefined) prose.innerHTML = english.aboutHtml;
  document.documentElement.lang = LANGS[current]?.htmlLang || 'en';
}

function snapshotDom() {
  if (english.dom) return;
  english.dom = {};
  for (const [sel] of DOM) {
    const n = document.querySelector(sel);
    if (n) english.dom[sel] = n.textContent;
  }
  for (const [id] of SETTING_LABELS) {
    const label = document.getElementById(id)?.closest('.set-row')?.querySelector('label');
    if (label) english.dom[`label:${id}`] = label.textContent;
  }
  const prose = document.querySelector('#credits .prose');
  if (prose) english.aboutHtml = prose.innerHTML;
}

// ── packs ──────────────────────────────────────────────────────────────

const PACKS = { en: {} };

export function registerPack(code, strings) { PACKS[code] = strings; }

/** Switch language: restore English, then lay the pack over the top. */
export function setLanguage(code) {
  if (!LANGS[code]) code = 'en';
  snapshot();
  snapshotDom();
  current = code;
  pack = PACKS[code] || {};
  walk((key, get, set) => {
    const v = pack[key];
    set(v === undefined ? english[key] : v);
  });
  patchDom();
  for (const fn of listeners) { try { fn(code); } catch (e) { console.error(e); } }
}
