// ── keyboard / mouse / pointer-lock ─────────────────────────────────────
import { $ } from './util.js';

export class Input {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.keys = new Set();
    this.pressed = new Set();     // edge-triggered, cleared each frame
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.locked = false;
    this.enabled = true;          // false while a UI panel owns the cursor
    this._blockedUntil = 0;

    this._onKeyDown = (e) => {
      if (e.repeat) { return; }
      const c = e.code;
      // never swallow devtools / reload
      if (e.metaKey || e.ctrlKey) return;
      if (c === 'Tab' || c === 'Space' || c.startsWith('Arrow') || c === 'F1') e.preventDefault();
      this.keys.add(c);
      this.pressed.add(c);
    };
    this._onKeyUp = (e) => { this.keys.delete(e.code); };
    this._onMouseMove = (e) => {
      if (!this.locked || !this.enabled) return;
      const s = this.settings.sensitivity;
      this.mouseDX += e.movementX * 0.0022 * s;
      this.mouseDY += e.movementY * 0.0022 * s * (this.settings.invertY ? -1 : 1);
    };
    this._onMouseDown = () => { if (this.locked) { this.mouseDown = true; this.mouseClicked = true; } };
    this._onMouseUp = () => { this.mouseDown = false; };
    this._onLockChange = () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.keys.clear();
      this.onLockChange?.(this.locked);
    };
    this._onBlur = () => { this.keys.clear(); this.mouseDown = false; };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('pointerlockchange', this._onLockChange);
  }

  /** Request pointer lock; browsers require this to originate from a gesture. */
  lock() {
    if (this.locked) return;
    const p = this.canvas.requestPointerLock?.({ unadjustedMovement: true });
    if (p && p.catch) p.catch(() => this.canvas.requestPointerLock());
  }
  unlock() { if (this.locked) document.exitPointerLock(); }

  down(code) { return this.enabled && this.keys.has(code); }
  hit(code) { return this.enabled && this.pressed.has(code); }
  /** Edge-trigger that works even when gameplay input is disabled (menus). */
  hitRaw(code) { return this.pressed.has(code); }

  consumeMouse() {
    const dx = this.mouseDX, dy = this.mouseDY;
    this.mouseDX = 0; this.mouseDY = 0;
    return [dx, dy];
  }

  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
  }

  /** Movement vector in local space from WASD. */
  moveAxis() {
    let x = 0, z = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) z -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z += 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    const l = Math.hypot(x, z);
    return l > 0 ? [x / l, z / l] : [0, 0];
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('blur', this._onBlur);
    document.removeEventListener('pointerlockchange', this._onLockChange);
  }
}

// ── persisted settings ──────────────────────────────────────────────────
const KEY = 'omn.settings.v1';
const DEFAULTS = {
  sensitivity: 1.0,
  fov: 74,
  volume: 0.7,
  brightness: 1.0,
  quality: 0.85,
  bob: 1.0,
  grain: 1.0,
  invertY: false,
  subtitles: true,
  reduceFlashing: false,
};

export function loadSettings() {
  let s = { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = { ...s, ...JSON.parse(raw) };
  } catch { /* private mode, corrupt json — defaults are fine */ }
  return s;
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function bindSettingsUI(settings, onChange) {
  const rows = [
    ['#set-sens', 'sensitivity', '#val-sens', (v) => v.toFixed(2)],
    ['#set-fov', 'fov', '#val-fov', (v) => v.toFixed(0) + '°'],
    ['#set-vol', 'volume', '#val-vol', (v) => Math.round(v * 100) + '%'],
    ['#set-bright', 'brightness', '#val-bright', (v) => v.toFixed(2)],
    ['#set-bob', 'bob', '#val-bob', (v) => v.toFixed(2)],
    ['#set-grain', 'grain', '#val-grain', (v) => v.toFixed(2)],
  ];
  for (const [sel, key, valSel, fmt] of rows) {
    const input = $(sel), out = $(valSel);
    input.value = settings[key];
    out.textContent = fmt(settings[key]);
    input.addEventListener('input', () => {
      settings[key] = parseFloat(input.value);
      out.textContent = fmt(settings[key]);
      saveSettings(settings); onChange?.(key);
    });
  }
  const q = $('#set-quality');
  q.value = String(settings.quality);
  q.addEventListener('change', () => {
    settings.quality = parseFloat(q.value); saveSettings(settings); onChange?.('quality');
  });
  for (const [sel, key] of [['#set-invert', 'invertY'], ['#set-subs', 'subtitles'], ['#set-flash', 'reduceFlashing']]) {
    const c = $(sel);
    c.checked = !!settings[key];
    c.addEventListener('change', () => { settings[key] = c.checked; saveSettings(settings); onChange?.(key); });
  }
}
