// ── inventory, journal and dialogue panels ──────────────────────────────
import { $, el, esc } from '../core/util.js';
import { ITEMS, COMBOS } from '../data/items.js';
import { DOCS } from '../data/lore.js';
import { NPC_DEFS } from '../data/dialogue.js';
import { trustLabel } from '../core/state.js';

// ══════════════════ inventory ══════════════════

export class InventoryPanel {
  constructor(game) {
    this.game = game;
    this.node = $('#inventory');
    this.grid = $('#inv-grid');
    this.detail = $('#inv-detail');
    this.open = false;
    this.sel = null;
    this.dragFrom = null;
  }

  toggle() { this.open ? this.close() : this.show(); }

  show() {
    this.open = true;
    this.node.classList.remove('hidden');
    this.render();
  }

  close() {
    this.open = false;
    this.node.classList.add('hidden');
    this.sel = null;
  }

  render() {
    const st = this.game.state;
    this.grid.innerHTML = '';
    if (!st.inventory.length) {
      this.grid.appendChild(el('div', '', '<span style="color:#525c66;font-size:13px;font-style:italic">Your pockets are empty.</span>'));
    }
    for (const slot of st.inventory) {
      const def = ITEMS[slot.id];
      if (!def) continue;
      const cell = el('div', `inv-cell${def.kind === 'key' || def.kind === 'document' ? ' key-item' : ''}`);
      cell.innerHTML = `<span class="glyph">${def.glyph || '▪'}</span><span class="nm">${esc(def.name)}</span>` +
        (slot.qty > 1 ? `<span class="qty">${slot.qty}</span>` : '');
      cell.dataset.id = slot.id;
      cell.draggable = true;
      if (this.sel === slot.id) cell.classList.add('sel');
      cell.addEventListener('click', () => { this.sel = slot.id; this.render(); });
      cell.addEventListener('dragstart', () => { this.dragFrom = slot.id; });
      cell.addEventListener('dragover', (e) => {
        if (this.dragFrom && this.dragFrom !== slot.id) { e.preventDefault(); cell.classList.add('drop'); }
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('drop'));
      cell.addEventListener('drop', (e) => {
        e.preventDefault(); cell.classList.remove('drop');
        if (this.dragFrom) this.game.combine(this.dragFrom, slot.id);
        this.dragFrom = null;
        this.render();
      });
      this.grid.appendChild(cell);
    }
    this.renderDetail();
  }

  renderDetail() {
    const def = ITEMS[this.sel];
    if (!def) { this.detail.innerHTML = '<div class="empty">Nothing selected.</div>'; return; }
    let html = `<h3>${esc(def.name)}</h3><div class="kind">${esc((def.kind || '').toUpperCase())}</div>`;
    html += `<p>${esc(def.desc || '')}</p>`;
    if (def.clue) html += `<p class="clue">${esc(def.clue)}</p>`;
    this.detail.innerHTML = html;

    if (def.doc && DOCS[def.doc]) {
      const b = el('button', '', 'Read it again');
      b.addEventListener('click', () => this.game.readDoc(def.doc, true));
      this.detail.appendChild(b);
    }
    if (def.use) {
      const b = el('button', '', esc(def.useLabel || 'Use'));
      b.addEventListener('click', () => { this.game.useItem(this.sel); this.render(); });
      this.detail.appendChild(b);
    }
    const combo = COMBOS.find((c) => c.a === this.sel || c.b === this.sel);
    if (combo) {
      const other = combo.a === this.sel ? combo.b : combo.a;
      if (this.game.state.inventory.some((s) => s.id === other)) {
        const b = el('button', '', esc(combo.label));
        b.addEventListener('click', () => { this.game.combine(combo.a, combo.b); this.render(); });
        this.detail.appendChild(b);
      }
    }
  }
}

// ══════════════════ journal ══════════════════

const TABS = [
  { id: 'events', label: 'Events' },
  { id: 'characters', label: 'People' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'locations', label: 'Places' },
  { id: 'documents', label: 'Documents' },
  { id: 'notes', label: 'My Notes' },
];

export class JournalPanel {
  constructor(game) {
    this.game = game;
    this.node = $('#journal');
    this.tabsNode = $('#jr-tabs');
    this.list = $('#jr-list');
    this.detail = $('#jr-detail');
    this.tab = 'events';
    this.sel = null;
    this.open = false;
  }

  toggle() { this.open ? this.close() : this.show(); }
  show() { this.open = true; this.node.classList.remove('hidden'); this.render(); }
  close() { this.open = false; this.node.classList.add('hidden'); }

  render() {
    const st = this.game.state;
    this.tabsNode.innerHTML = '';
    for (const t of TABS) {
      const unread = st.journal.entries.filter((e) => e.cat === t.id && e.unread).length;
      const b = el('button', `jr-tab${this.tab === t.id ? ' on' : ''}`,
        `${t.label}${unread ? `<span class="badge">${unread}</span>` : ''}`);
      b.addEventListener('click', () => { this.tab = t.id; this.sel = null; this.render(); });
      this.tabsNode.appendChild(b);
    }
    this.list.innerHTML = '';

    if (this.tab === 'characters') this.renderCharacters();
    else if (this.tab === 'documents') this.renderDocuments();
    else if (this.tab === 'notes') this.renderNotes();
    else if (this.tab === 'locations') this.renderLocations();
    else this.renderEntries(this.tab);
  }

  _item(label, sub, onClick, unread) {
    const n = el('div', `jr-item${unread ? ' unread' : ''}`, `${esc(label)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}`);
    n.addEventListener('click', onClick);
    this.list.appendChild(n);
    return n;
  }

  renderEntries(cat) {
    const st = this.game.state;
    const list = st.journal.entries.filter((e) => e.cat === cat);
    if (!list.length) {
      this.detail.innerHTML = '<p style="color:#525c66;font-style:italic">Nothing recorded here yet.</p>';
      return;
    }
    for (const e of list.slice().reverse()) {
      this._item(e.title, `Night ${e.night}`, () => {
        e.unread = false;
        this.sel = e.id;
        this.detail.innerHTML = `<h3>${esc(e.title)}</h3><div class="meta">RECORDED ON NIGHT ${e.night}</div><p>${esc(e.text)}</p>`;
        this.renderTheory();
        this.render();
      }, e.unread);
    }
    if (!this.sel) {
      const e = list[list.length - 1];
      this.detail.innerHTML = `<h3>${esc(e.title)}</h3><div class="meta">RECORDED ON NIGHT ${e.night}</div><p>${esc(e.text)}</p>`;
      this.renderTheory();
    }
  }

  renderCharacters() {
    const st = this.game.state;
    if (!st.metNpcs.length) {
      this.detail.innerHTML = '<p style="color:#525c66;font-style:italic">You have not spoken to anyone yet.</p>';
    }
    for (const id of st.metNpcs) {
      const def = NPC_DEFS[id];
      if (!def) continue;
      this._item(def.name, `${def.role} · ${trustLabel(st.trust[id] || 0)}`, () => {
        const notes = st.journal.entries.filter((e) => e.cat === 'characters' && e.text.toLowerCase().includes(def.short.toLowerCase()));
        let html = `<h3>${esc(def.name)}</h3><div class="meta">${esc(def.role)} — ${esc(trustLabel(st.trust[id] || 0)).toUpperCase()}</div>`;
        html += `<p>${esc(def.bio)}</p>`;
        for (const n of notes) html += `<div class="entry"><div class="when">NIGHT ${n.night}</div><p>${esc(n.text)}</p></div>`;
        this.detail.innerHTML = html;
      });
    }
  }

  renderDocuments() {
    const st = this.game.state;
    const found = st.docsRead;
    if (!found.length) this.detail.innerHTML = '<p style="color:#525c66;font-style:italic">You have not read anything yet.</p>';
    for (const id of found) {
      const d = DOCS[id];
      if (!d) continue;
      this._item(d.title, d.ev ? 'evidence' : '', () => {
        this.game.readDoc(id, true);
      });
    }
  }

  renderLocations() {
    const st = this.game.state;
    const names = {
      lobby: 'Entrance Hall', laundry: 'Laundry Room', storage: 'Storage Cages',
      boiler: 'Boiler Room', office: "Caretaker's Office", maint: 'Maintenance',
      sealed: 'The Sealed Room', roof: 'Roof', stairs: 'Stairwell', elevator: 'The Lift',
      newdoor: 'The Door With No Number',
    };
    if (!st.visited.length) this.detail.innerHTML = '<p style="color:#525c66;font-style:italic">You have not been anywhere worth writing down.</p>';
    for (const v of st.visited) {
      this._item(names[v] || `Apartment ${v}`, '', () => {
        this.detail.innerHTML = `<h3>${esc(names[v] || `Apartment ${v}`)}</h3><div class="meta">VISITED</div>` +
          `<p>${esc(this.game.locationNote(v))}</p>`;
      });
    }
  }

  renderNotes() {
    const st = this.game.state;
    this.detail.innerHTML = '';
    const wrap = el('div');
    wrap.innerHTML = '<h3>My Notes</h3><div class="meta">WHAT I THINK IS HAPPENING</div>';
    for (const n of st.journal.notes) {
      const d = el('div', 'entry', `<div class="when">NIGHT ${n.night}</div><p>${esc(n.text)}</p>`);
      wrap.appendChild(d);
    }
    const ta = el('textarea', 'jr-note');
    ta.rows = 3;
    ta.maxLength = 400;
    ta.placeholder = 'Write down what you noticed…';
    wrap.appendChild(ta);
    const b = el('button', 'jr-addnote', 'Write it down');
    b.addEventListener('click', () => {
      const t = ta.value.trim();
      if (!t) return;
      st.journal.notes.push({ night: st.night, text: t });
      this.game.audio.play('write', { volume: 0.5 });
      this.render();
    });
    wrap.appendChild(b);
    this.detail.appendChild(wrap);
    this.renderTheory();
    for (const n of st.journal.notes.slice().reverse()) {
      this._item(n.text.slice(0, 40) + (n.text.length > 40 ? '…' : ''), `Night ${n.night}`, () => { });
    }
  }

  /** The mystery system: the journal draws its own conclusions. */
  renderTheory() {
    const t = this.game.currentTheory();
    if (!t) return;
    const box = el('div', 'jr-connect', `<h4>WHAT THIS ADDS UP TO</h4><div class="jr-theory">${esc(t)}</div>`);
    this.detail.appendChild(box);
  }
}

// ══════════════════ dialogue ══════════════════

export class DialoguePanel {
  constructor(game) {
    this.game = game;
    this.node = $('#dialogue');
    this.nameNode = $('#dlg-name');
    this.trustNode = $('#dlg-trust');
    this.textNode = $('#dlg-text');
    this.optsNode = $('#dlg-options');
    this.open = false;
    this.typing = 0;
    this.fullText = '';
    this.opts = [];
  }

  start(npcId, nodeId) {
    this.npcId = npcId;
    this.open = true;
    this.node.classList.remove('hidden');
    this.goto(nodeId);
  }

  goto(nodeId) {
    const st = this.game.state;
    const tree = this.game.dialogueTree(this.npcId);
    const node = tree.nodes[nodeId];
    if (!node) { this.close(); return; }
    this.nodeId = nodeId;
    const def = NPC_DEFS[this.npcId];
    this.nameNode.textContent = def.name;
    this.trustNode.textContent = trustLabel(st.trust[this.npcId] || 0).toUpperCase();
    this.fullText = typeof node.text === 'function' ? node.text(st) : node.text;
    this.textNode.textContent = '';
    this.typing = 0;
    this.opts = (node.opts || []).filter((o) => !o.if || o.if(st));
    // never leave the player stranded in a node whose options all failed
    if (!this.opts.length) this.opts = [{ t: 'I should go.', to: null, fx: { close: true } }];
    this.renderOpts();
  }

  renderOpts() {
    this.optsNode.innerHTML = '';
    this.opts.forEach((o, i) => {
      const b = el('button', `dlg-opt${o.tag ? ` tag-${o.tag}` : ''}`,
        `<span class="num">${i + 1}</span><span>${esc(o.t)}</span>`);
      b.addEventListener('click', () => this.choose(i));
      this.optsNode.appendChild(b);
    });
  }

  choose(i) {
    const o = this.opts[i];
    if (!o) return;
    this.game.audio.play('click', { volume: 0.35 });
    this.game.applyDialogueFx(this.npcId, o.fx || {});
    if (o.fx?.close || !o.to) { this.close(); return; }
    this.goto(o.to);
  }

  update(dt) {
    if (!this.open) return;
    if (this.typing < this.fullText.length) {
      this.typing = Math.min(this.fullText.length, this.typing + dt * 62);
      this.textNode.textContent = this.fullText.slice(0, Math.floor(this.typing));
    }
  }

  skipTyping() {
    if (this.typing < this.fullText.length) {
      this.typing = this.fullText.length;
      this.textNode.textContent = this.fullText;
      return true;
    }
    return false;
  }

  close() {
    this.open = false;
    this.node.classList.add('hidden');
    this.game.onDialogueClosed?.();
  }
}
