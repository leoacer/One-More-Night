// ── HUD: prompt, watch, torch, vitals, toasts, captions, documents ──────
import { $, el, esc, fmtTime, clamp } from '../core/util.js';
import { DOCS } from '../data/lore.js';

export class Hud {
  constructor() {
    this.root = $('#hud');
    this.prompt = $('#prompt');
    this.promptKey = this.prompt.querySelector('.key');
    this.promptLabel = this.prompt.querySelector('.label');
    this.cross = $('#crosshair');
    this.watch = $('#watch');
    this.watchTime = this.watch.querySelector('.watch-time');
    this.watchNight = $('#watch-night');
    this.torch = $('#torch');
    this.torchBar = this.torch.querySelector('.torch-bar i');
    this.health = $('#vital-health');
    this.food = $('#vital-food');
    this.subtitle = $('#subtitle');
    this.toasts = $('#toasts');
    this.whisper = $('#whisper');
    this.flash = $('#damage-flash');
    this._subTimer = 0;
    this._watchPeek = 0;
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  setPrompt(text, key = 'E', locked = false) {
    if (!text) {
      this.prompt.classList.add('hidden');
      this.cross.classList.remove('active');
      return;
    }
    this.prompt.classList.remove('hidden');
    this.cross.classList.add('active');
    this.promptKey.textContent = key;
    this.promptLabel.textContent = text;
    this.prompt.classList.toggle('locked', locked);
  }

  setWatch(remaining, night, visible) {
    this.watch.classList.toggle('hidden', !visible);
    this.watchTime.textContent = fmtTime(remaining);
    this.watchNight.textContent = night;
    this.watch.classList.toggle('low', remaining < 180 && remaining >= 60);
    this.watch.classList.toggle('critical', remaining < 60);
  }

  peekWatch() { this._watchPeek = 2.2; }

  setTorch(on, battery) {
    this.torch.classList.toggle('on', on);
    this.torch.classList.toggle('dead', battery <= 0.001);
    this.torchBar.style.width = `${clamp(battery, 0, 1) * 100}%`;
  }

  setVitals(health, food) {
    this.health.querySelector('i').style.setProperty('--w', `${clamp(health, 0, 100)}%`);
    this.food.querySelector('i').style.setProperty('--w', `${clamp(food, 0, 100)}%`);
    this.health.classList.toggle('hurt', health < 45);
    this.food.classList.toggle('hungry', food < 30);
    $('#vitals').classList.toggle('alert', health < 45 || food < 30);
  }

  say(text, who = null, kind = 'speech', seconds = 3.4) {
    this.subtitle.classList.remove('hidden');
    this.subtitle.innerHTML = who
      ? `<span class="who">${esc(who)}</span> — ${esc(text)}`
      : kind === 'sfx' ? `<span class="sfx">${esc(text)}</span>` : esc(text);
    this._subTimer = seconds;
  }

  toast(text, kind = '') {
    const t = el('div', `toast ${kind}`, text);
    this.toasts.appendChild(t);
    setTimeout(() => { t.classList.add('fade'); }, 4200);
    setTimeout(() => { t.remove(); }, 5200);
    while (this.toasts.children.length > 5) this.toasts.firstChild.remove();
  }

  whisperText(text) {
    this.whisper.textContent = text;
    this.whisper.classList.add('show');
    setTimeout(() => this.whisper.classList.remove('show'), 2600);
  }

  damage() {
    this.flash.classList.add('on');
    setTimeout(() => this.flash.classList.remove('on'), 90);
  }

  update(dt) {
    if (this._subTimer > 0) {
      this._subTimer -= dt;
      if (this._subTimer <= 0) this.subtitle.classList.add('hidden');
    }
    if (this._watchPeek > 0) {
      this._watchPeek -= dt;
      this.watch.classList.add('peek');
      if (this._watchPeek <= 0) this.watch.classList.remove('peek');
    }
  }
}

// ── document reader ─────────────────────────────────────────────────────

export class Reader {
  constructor(onClose) {
    this.node = $('#reader');
    this.sheet = $('#reader-sheet');
    this.title = $('#reader-title');
    this.body = $('#reader-body');
    this.onClose = onClose;
    this.open = false;
    this.node.addEventListener('click', (e) => { if (e.target === this.node) this.close(); });
  }

  render(docId) {
    const doc = DOCS[docId];
    if (!doc) return false;
    this.title.textContent = doc.title;
    this.sheet.classList.toggle('tape', doc.type === 'tape');
    let html = '';
    for (const part of doc.body) {
      if (part.h) html += `<h3 style="text-align:center;font-size:26px;letter-spacing:.02em;margin-bottom:6px">${part.h}</h3>`;
      else if (part.spk) html += `<p><span class="spk">${esc(part.spk)}:</span> ${part.text}</p>`;
      else if (part.cls) html += `<p class="${part.cls}">${part.text}</p>`;
      else html += `<p>${part.p}</p>`;
    }
    this.body.innerHTML = html;
    this.node.classList.remove('hidden');
    this.open = true;
    return true;
  }

  close() {
    if (!this.open) return;
    this.node.classList.add('hidden');
    this.open = false;
    this.onClose?.();
  }
}
