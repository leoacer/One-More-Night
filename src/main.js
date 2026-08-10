// ══════════════════════════════════════════════════════════════════════
//  One More Night — game controller.
// ══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';

import { $, el, esc, clamp, damp, makeRng } from './core/util.js';
import { Input, loadSettings, bindSettingsUI } from './core/input.js';
import { AudioEngine } from './core/audio.js';
import { PostFX } from './core/postfx.js';
import { TX } from './core/textures.js';
import * as ST from './core/state.js';

import { GEO, ROOF_LEVEL, ROOMS, HOME_ID, levelY, slotBounds } from './world/layout.js';
import { Building } from './world/building.js';
import { furnishRoom } from './world/furnish.js';
import { MAT } from './world/materials.js';
import * as P from './world/props.js';

import { Player } from './systems/player.js';
import { LightRig } from './systems/lighting.js';
import { Elevator } from './systems/elevator.js';
import { NpcSystem } from './systems/npc.js';
import { Director } from './systems/events.js';
import { resolveEnding, ENDINGS, endingStats } from './systems/endings.js';

import { Hud, Reader } from './ui/hud.js';
import { InventoryPanel, JournalPanel, DialoguePanel } from './ui/panels.js';

import { NIGHTS, makeNightPlan, ambienceFor } from './data/nights.js';
import { DIALOGUE, NPC_DEFS } from './data/dialogue.js';
import { DOCS } from './data/lore.js';
import { ITEMS, COMBOS } from './data/items.js';

const NIGHT_SECONDS = ST.NIGHT_SECONDS;

class Game {
  constructor() {
    this.settings = loadSettings();
    this.canvas = $('#viewport');
    this.state = ST.newState();
    this.mode = 'menu';          // menu | night | paused | summary | ending | dead
    this.elapsed = 0;
    this.time = 0;
    this.paused = false;
    this.building = null;
    this.plan = null;
    this.pendingEnding = null;
    this.distortion = 0;
    this.pulse = 0;
    this.lastRoom = null;
    this.nightStarted = false;
    this.usedThisNight = new Set();
  }

  // ══════════════════ boot ══════════════════

  async boot() {
    if (!this.initRenderer()) return;
    this.audio = new AudioEngine(this.settings);
    this.audio.onSubtitle = (t) => this.hud.say(t, null, 'sfx', 2.6);

    this.input = new Input(this.canvas, this.settings);
    this.hud = new Hud();
    this.reader = new Reader(() => this.onPanelClosed());
    this.inventory = new InventoryPanel(this);
    this.journal = new JournalPanel(this);
    this.dialogue = new DialoguePanel(this);

    this.player = new Player(this.camera, this.audio, this.settings);
    this.player.addToScene(this.scene);
    this.lights = new LightRig(this.scene, this.settings);
    this.lights.onFlicker = (e) => {
      if (Math.random() < 0.5) this.audio.play('flicker', { pos: e.pos, volume: 0.25 });
    };
    this.npcs = new NpcSystem(this.scene, this.audio);
    this.director = new Director(this);

    this.bindUI();
    this.refreshMenu();

    // warm the texture cache while the menu is up so the first night
    // does not stall on canvas work
    setTimeout(() => this.pretexture(), 60);

    this.clock = new THREE.Clock();
    this.loop();
  }

  initRenderer() {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: this.canvas, antialias: false, powerPreference: 'high-performance',
        stencil: false, alpha: false,
      });
    } catch { renderer = null; }
    if (!renderer || !renderer.getContext()) {
      $('#unsupported').classList.remove('hidden');
      $('#mainmenu').classList.add('hidden');
      return false;
    }
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x05070a, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x151d28, 0.021);
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, 1, 0.06, 260);

    this.post = new PostFX(renderer, this.settings);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    return true;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = this.settings.fov;
    this.camera.updateProjectionMatrix();
    this.post.setSize(w * this.renderer.getPixelRatio(), h * this.renderer.getPixelRatio());
  }

  pretexture() {
    const keys = ['wallpaper:0', 'wallpaper:1', 'wallpaper:2', 'plaster:1', 'wood:3', 'tile:5', 'carpet:9', 'metal:11', 'door:21', 'ceiling:41'];
    let i = 0;
    const step = () => {
      if (i >= keys.length || this.mode !== 'menu') return;
      TX.canvas(keys[i++]);
      setTimeout(step, 16);
    };
    step();
  }

  // ══════════════════ UI wiring ══════════════════

  bindUI() {
    const act = (root, fn) => {
      $(root).addEventListener('click', (e) => {
        const b = e.target.closest('button[data-act]');
        if (b) { this.audio.init(); fn(b.dataset.act); }
      });
    };

    act('#mainmenu', (a) => {
      if (a === 'new') this.newGame();
      else if (a === 'continue') this.continueGame();
      else if (a === 'settings') { $('#mainmenu').classList.add('hidden'); $('#settings').classList.remove('hidden'); this.settingsBack = 'mainmenu'; }
      else if (a === 'credits') { $('#mainmenu').classList.add('hidden'); $('#credits').classList.remove('hidden'); }
    });
    act('#pause', (a) => {
      if (a === 'resume') this.setPaused(false);
      else if (a === 'settings') { $('#pause').classList.add('hidden'); $('#settings').classList.remove('hidden'); this.settingsBack = 'pause'; }
      else if (a === 'save') { ST.save(this.state, 'manual'); this.hud.toast('<b>Saved.</b> The night is remembered.'); this.setPaused(false); }
      else if (a === 'quit') this.abandonNight();
    });
    act('#settings', (a) => {
      if (a === 'back') {
        $('#settings').classList.add('hidden');
        $(`#${this.settingsBack || 'mainmenu'}`).classList.remove('hidden');
      }
    });
    act('#credits', () => { $('#credits').classList.add('hidden'); $('#mainmenu').classList.remove('hidden'); });

    bindSettingsUI(this.settings, (key) => {
      if (key === 'fov') { this.camera.fov = this.settings.fov; this.camera.updateProjectionMatrix(); }
      if (key === 'quality') this.resize();
      if (key === 'volume') this.audio.setVolume(this.settings.volume);
    });

    $('#nc-btn').addEventListener('click', () => { this.audio.init(); this.beginPlay(); });
    $('#sum-btn').addEventListener('click', () => this.sleep());
    $('#end-again').addEventListener('click', () => { $('#ending').classList.add('hidden'); this.newGame(); });
    $('#end-menu').addEventListener('click', () => { $('#ending').classList.add('hidden'); this.toMenu(); });
    $('#go-retry').addEventListener('click', () => { $('#gameover').classList.add('hidden'); this.retryNight(); });
    $('#go-menu').addEventListener('click', () => { $('#gameover').classList.add('hidden'); this.toMenu(); });

    this.canvas.addEventListener('click', () => {
      this.audio.init();
      if (this.mode === 'night' && !this.paused && !this.anyPanelOpen()) this.input.lock();
    });
    this.input.onLockChange = (locked) => {
      if (!locked && this.mode === 'night' && !this.anyPanelOpen() && !this.paused) this.setPaused(true);
    };

    // keep the audio context alive across tab switches
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'night') this.setPaused(true);
    });
  }

  refreshMenu() {
    const info = ST.saveInfo();
    const btn = $('#btn-continue');
    btn.disabled = !info;
    $('#mm-save-info').textContent = info
      ? `Saved on night ${info.night} · ${info.evidence} pieces of evidence · ${info.when.toLocaleDateString()}`
      : 'No saved night.';
  }

  anyPanelOpen() {
    return this.inventory.open || this.journal.open || this.dialogue.open || this.reader.open;
  }

  onPanelClosed() {
    if (this.mode === 'night' && !this.paused) this.input.lock();
  }

  closeAllPanels() {
    this.inventory.close(); this.journal.close(); this.reader.close();
    if (this.dialogue.open) this.dialogue.close();
  }

  // ══════════════════ lifecycle ══════════════════

  newGame() {
    this.state = ST.newState();
    ST.save(this.state, 'new');
    $('#mainmenu').classList.add('hidden');
    this.startNight();
  }

  continueGame() {
    const st = ST.load();
    if (!st) return;
    this.state = st;
    if (st.ending) { this.state.ending = null; }
    $('#mainmenu').classList.add('hidden');
    this.startNight();
  }

  toMenu() {
    this.teardownNight();
    this.mode = 'menu';
    this.hud.hide();
    this.input.unlock();
    this.audio.stopAll();
    this.refreshMenu();
    $('#mainmenu').classList.remove('hidden');
  }

  retryNight() {
    const st = ST.load();
    if (st) this.state = st;
    this.state.health = Math.max(45, this.state.health);
    this.startNight();
  }

  abandonNight() {
    $('#pause').classList.add('hidden');
    this.paused = false;
    this.toMenu();
  }

  async startNight() {
    this.teardownNight();
    this.mode = 'loading';
    const load = $('#loading');
    load.classList.remove('hidden');
    const fill = $('#load-fill');
    const text = $('#load-text');
    const steps = [
      ['Rebuilding the building…', () => { this.plan = makeNightPlan(this.state); }],
      ['Hanging the wallpaper…', () => { this.buildWorld(); }],
      ['Turning off the lights…', () => { this.applyPlan(); }],
      ['Waking the residents…', () => { this.npcs.spawnFromPlan(this.plan, this.building); }],
      ['Winding the watch…', () => { this.prepareNight(); }],
    ];
    for (let i = 0; i < steps.length; i++) {
      text.textContent = steps[i][0];
      fill.style.width = `${(i / steps.length) * 100}%`;
      await new Promise((r) => setTimeout(r, 30));
      try { steps[i][1](); } catch (err) { console.error('night build step failed', steps[i][0], err); }
      await new Promise((r) => requestAnimationFrame(r));
    }
    fill.style.width = '100%';
    await new Promise((r) => setTimeout(r, 120));
    load.classList.add('hidden');
    this.showNightCard();
  }

  teardownNight() {
    if (this.building) { this.building.dispose(); this.building = null; }
    for (const n of this.npcs?.npcs.values() || []) this.scene.remove(n.root);
    this.npcs?.npcs.clear();
    this.npcs?.follower.despawn();
    this.audio?.stopAll();
    this.closeAllPanels();
    this.hud.hide();
    this.usedThisNight = new Set();
  }

  buildWorld() {
    this.building = new Building(this.scene, this.plan);
    this.building.build(furnishRoom);
    this.player.setWorld(this.building.colliders, this.building.walkable);
    this.lights.setEmitters(this.building.lightEmitters);
    this.elevator = new Elevator(this.building, this.audio, this.plan);
  }

  applyPlan() {
    const b = this.building, plan = this.plan;
    this.lights.applyPlan(plan);

    // apartment numbers that have changed their minds
    for (const [roomId, newPlate] of Object.entries(plan.plateSwaps)) {
      const pl = b.props.get(`plate_door_${roomId}`);
      if (pl) pl.traverse((c) => { if (c.isMesh) c.material = MAT.plate(newPlate); });
    }
    // fresh graffiti
    for (const g of plan.graffiti) {
      const d = P.graffitiDecal(g.text, 1.2, 1.0);
      d.position.set(g.x, levelY(g.lv) + 1.4, GEO.COR_Z1 - 0.105);
      b.group(g.lv)?.add(d);
    }
    // things that are not where you left them
    const rng = makeRng(`moved-${plan.seed}-${plan.night}`);
    for (const key of plan.movedProps) {
      const o = b.props.get(key);
      if (!o) continue;
      o.position.x += rng.range(-1.1, 1.1);
      o.position.z += rng.range(-0.8, 0.8);
      o.rotation.y += rng.range(-0.7, 0.7);
    }
  }

  prepareNight() {
    const st = this.state;
    this.elapsed = 0;
    this.nightStarted = false;
    this._warned3 = false; this._warned1 = false; this._loopNoted = false;
    this.player.battery = st.battery ?? 1;
    this.player.torchOn = false;
    this.distortion = this.plan.distortion;
    this.director.begin(this.plan);
    this.npcs.follower.aggression = this.plan.threat.aggression;

    // start beside your own bed
    const home = this.building.rooms.get(HOME_ID);
    const b = home ? home.bounds : slotBounds('s', 1);
    this.player.teleport((b.x0 + b.x1) / 2 + 1.4, levelY(1), (b.z0 + b.z1) / 2 - 0.6, Math.PI * 0.9);
    this.building.setVisibleLevels(1);
    this.camera.updateMatrixWorld();
  }

  showNightCard() {
    const n = this.state.night;
    const info = NIGHTS[n] || { eyebrow: `NIGHT ${n}`, title: 'Again', text: '' };
    $('#nc-eyebrow').textContent = info.eyebrow;
    $('#nc-title').textContent = info.title;
    $('#nc-text').textContent = info.text;
    $('#nc-btn').textContent = n === 1 ? 'Leave the apartment' : 'Go out';
    $('#nightcard').classList.remove('hidden');
    this.mode = 'card';
    ST.save(this.state, `night-${n}-start`);
    this.refreshMenu();
  }

  beginPlay() {
    $('#nightcard').classList.add('hidden');
    this.mode = 'night';
    this.nightStarted = true;
    this.hud.show();
    this.hud.setWatch(NIGHT_SECONDS, this.state.night, true);
    this.input.lock();
    this.audio.init();
    this.audio.setVolume(this.settings.volume);
    this.hud.toast('<b>Ten minutes.</b> Be back behind your own door.');
    if (this.state.night === 1) {
      setTimeout(() => this.hud.toast('Press <b>F</b> for the torch, <b>E</b> to interact, <b>J</b> for your journal.'), 4200);
    }
  }

  // ══════════════════ night end ══════════════════

  endNight(how) {
    if (this.mode !== 'night') return;
    this.mode = 'summary';
    this.input.unlock();
    this.closeAllPanels();
    this.audio.stopAll();
    this.state.battery = this.player.battery;
    this.state.stats.secondsOutside += Math.min(this.elapsed, NIGHT_SECONDS);

    if (how === 'timeout') {
      if (this.state.night >= ST.MAX_NIGHT) { this.showEnding('lost'); return; }
      this.state.health = Math.max(1, this.state.health - 26);
      ST.addJournal(this.state, {
        cat: 'events', title: 'I did not get back in time',
        text: 'The ten minutes ended while I was still in the corridor. I do not have the part after that. I woke up on my own floor with the door shut behind me and my hands filthy.',
      });
      this.hud.toast('<b>You lost the end of the night.</b>', 'warn');
    }
    this.showSummary(how);
  }

  showSummary(how) {
    const st = this.state;
    $('#sum-title').textContent = `Night ${st.night} — ${NIGHTS[st.night]?.title || ''}`;
    const fill = (sel, list) => {
      const n = $(sel);
      n.innerHTML = '';
      if (!list.length) { n.appendChild(el('li', 'none', 'Nothing.')); return; }
      for (const t of list.slice(0, 6)) n.appendChild(el('li', '', esc(t)));
    };
    const foundTonight = st.journal.entries.filter((e) => e.night === st.night && e.cat === 'evidence').map((e) => e.title);
    const noticed = st.changesNoticed.slice(-6);
    const people = st.metNpcs.map((id) => `${NPC_DEFS[id].short} — ${ST.trustLabel(st.trust[id] || 0)}`);
    fill('#sum-found', foundTonight);
    fill('#sum-noticed', noticed);
    fill('#sum-people', people);
    $('#sum-note').value = '';
    $('#sum-btn').textContent = st.night >= ST.MAX_NIGHT ? 'Sleep — if you can' : 'Sleep';
    $('#summary').classList.remove('hidden');
    void how;
  }

  sleep() {
    const st = this.state;
    const note = $('#sum-note').value.trim();
    if (note) {
      st.journal.notes.push({ night: st.night, text: note.slice(0, 400) });
      this.audio.play('write', { volume: 0.4 });
    }
    $('#summary').classList.add('hidden');
    st.stats.nightsDone++;
    st.changesNoticed = [];

    // overnight resources
    st.food = clamp(st.food - 16, 0, 100);
    if (st.food <= 0) st.health = Math.max(1, st.health - 14);
    else st.health = clamp(st.health + 8, 0, 100);
    st.battery = this.player.battery;

    if (st.health <= 1 && st.food <= 0) { this.die('You went to sleep hungry once too often.'); return; }

    if (st.night >= ST.MAX_NIGHT) { this.showEnding('stayed'); return; }
    st.night++;
    ST.save(this.state, `night-${st.night}-start`);
    this.startNight();
  }

  die(reason) {
    this.mode = 'dead';
    this.state.stats.deaths++;
    this.input.unlock();
    this.closeAllPanels();
    this.audio.stopAll();
    this.audio.play('boom', { volume: 0.5 });
    $('#go-text').textContent = reason;
    $('#gameover').classList.remove('hidden');
    ST.save(this.state, 'died');
  }

  showEnding(how) {
    const key = resolveEnding(this.state, how);
    const e = ENDINGS[key];
    this.mode = 'ending';
    this.state.ending = key;
    this.state.stats.nightsDone = Math.max(this.state.stats.nightsDone, this.state.night);
    ST.save(this.state, `ending-${key}`);
    this.input.unlock();
    this.closeAllPanels();
    this.audio.stopAll();
    this.hud.hide();
    $('#end-title').textContent = e.title;
    $('#end-body').textContent = e.body;
    const stats = $('#end-stats');
    stats.innerHTML = '';
    for (const s of endingStats(this.state)) stats.appendChild(el('div', 'st', `${esc(s.k)} <b>${esc(s.v)}</b>`));
    $('#ending').classList.remove('hidden');
    this.refreshMenu();
  }

  setPaused(v) {
    if (this.mode !== 'night') return;
    this.paused = v;
    $('#pause').classList.toggle('hidden', !v);
    if (v) { this.input.unlock(); this.audio.suspend(); }
    else { this.audio.resume(); this.input.lock(); }
  }

  // ══════════════════ main loop ══════════════════

  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    try {
      this.update(dt);
      this.render(dt);
    } catch (err) {
      console.error(err);
    }
    this.input.endFrame();
  }

  update(dt) {
    this.handleGlobalKeys();
    if (this.mode !== 'night') {
      this.player.updateTorch(dt);
      return;
    }
    if (this.paused) return;

    const panels = this.anyPanelOpen();
    this.input.enabled = !panels;

    if (panels) {
      this.dialogue.update(dt);
      this.player.update(dt, this.input, { frozen: true });
    } else {
      this.player.update(dt, this.input, { torchSuppress: this.torchSuppress || 0 });
    }

    // ── the clock
    this.elapsed += dt;
    const remaining = Math.max(0, NIGHT_SECONDS - this.elapsed);
    this.hud.setWatch(remaining, this.state.night, true);
    if (remaining <= 0) { this.endNight('timeout'); return; }
    if (!this._warned3 && remaining < 180) { this._warned3 = true; this.hud.toast('Three minutes.', 'warn'); this.hud.peekWatch(); }
    if (!this._warned1 && remaining < 60) { this._warned1 = true; this.hud.toast('<b>One minute.</b> Get back.', 'warn'); this.hud.peekWatch(); this.audio.play('heartbeat', { volume: 0.4 }); }

    // safety net: if the world ever loses the player, put them back in the
    // basement corridor rather than let them fall out of the building
    if (this.player.pos.y < levelY(-1) - 3) {
      this.player.teleport(0, levelY(-1), 0, this.player.yaw);
      this.state.health = clamp(this.state.health - 10, 1, 100);
      this.hud.damage();
      this.hud.say('You came down harder than you should have, and you cannot account for the last few seconds.', null, 'sfx', 4);
    }

    const camDir = this.player.fwd;
    const head = this.player.head;

    // ── audio listener + ambience
    this.audio.setListener(head, camDir);
    const lv = this.currentLevel();
    const inRoom = this.roomAt(this.player.pos) != null;
    const amb = ambienceFor(lv, this.state.night, inRoom);
    this.audio.bed('rain', amb.rain);
    this.audio.bed('wind', amb.wind);
    this.audio.bed('hum', amb.hum);
    this.audio.bed('pipes', amb.pipes);

    // ── systems
    this.building.setVisibleLevels(lv);
    this.elevator.update(dt, this.player.pos);
    // on the roof the overcast sky is the only real light there is
    this.lights.skyMix = damp(this.lights.skyMix, lv === ROOF_LEVEL ? 1 : 0, 2.6, dt);
    this.lights.update(dt, head, this.time);
    const lit = this.lights.isLit(head) || (this.player.torchOn && this.player.battery > 0);

    this.npcs.update(dt, this.player.pos, camDir, {
      elapsed: this.elapsed,
      onVanish: (n) => this.onNpcVanished(n),
    });
    this.updateFollower(dt, lit);
    this.director.update(dt, { player: this.player, camDir, elapsed: this.elapsed, lit });
    this.updateDynamics(dt);
    this.updateInteraction();
    this.updateCorridorLoop();
    this.trackRoom();

    // ── vitals
    if (this.state.food > 0) this.state.food = clamp(this.state.food - dt * 0.32, 0, 100);
    else this.state.health = clamp(this.state.health - dt * 0.5, 0, 100);
    if (this.state.health <= 0) { this.die('Your body gave out somewhere between the third floor and your own front door.'); return; }
    this.hud.setVitals(this.state.health, this.state.food);
    this.hud.setTorch(this.player.torchOn, this.player.battery);
    this.hud.update(dt);

    // ── how wrong things look
    const dread = this.director.dread;
    this.distortion = damp(this.distortion, this.plan.distortion + dread * 0.4 + (this.hurtFx || 0), 2.2, dt);
    this.pulse = damp(this.pulse, this.hurtFx || 0, 3, dt);
    this.hurtFx = Math.max(0, (this.hurtFx || 0) - dt * 0.8);
    this.audio.setMuffle(clamp(dread * 0.35 + (this.plan.distortion - 0.2) * 0.3, 0, 0.6));
    this.lightningDecay(dt);
  }

  render(dt) {
    const st = this.state;
    const dread = this.mode === 'night' ? this.director.dread : 0;
    this.post.render(this.scene, this.camera, dt, {
      distort: this.mode === 'night' ? this.distortion : 0,
      pulse: this.pulse,
      desat: this.mode === 'night' ? clamp(1 - st.health / 60, 0, 0.55) : 0,
      vignette: 0.62 + dread * 0.25,
      bloom: 0.42,
      aberration: 0.0013 + dread * 0.002,
      brightness: 1,
    });
  }

  // ══════════════════ world helpers ══════════════════

  currentLevel() {
    const y = this.player.pos.y;
    if (y > levelY(ROOF_LEVEL) - 1.2) return ROOF_LEVEL;
    return clamp(Math.round(y / GEO.FLOOR_H), -1, ROOF_LEVEL);
  }

  roomAt(pos) {
    const lv = this.currentLevel();
    for (const r of ROOMS) {
      if (r.lv !== lv) continue;
      const b = slotBounds(r.side, r.slot);
      if (pos.x > b.x0 && pos.x < b.x1 && pos.z > b.z0 && pos.z < b.z1) return r;
    }
    return null;
  }

  trackRoom() {
    const r = this.roomAt(this.player.pos);
    const id = r ? r.id : null;
    if (id !== this.lastRoom) {
      this.lastRoom = id;
      if (id) {
        ST.markVisited(this.state, id);
        if (r.kind !== 'apartment' || r.furnish !== 'empty') {
          this.hud.say(r.name, null, 'sfx', 2.0);
        }
      }
    }
  }

  /** Night 7: the corridors on the lower floors stop having ends. */
  updateCorridorLoop() {
    if (!this.plan.corridorStretch) return;
    const lv = this.currentLevel();
    if (lv !== 0 && lv !== 1) return;
    const p = this.player.pos;
    if (p.z < GEO.COR_Z0 || p.z > GEO.COR_Z1) return;
    if (p.x > 9.3 && this.player.vel.x > 0) {
      p.x = -9.1;
      this.audio.play('reverse_swell', { volume: 0.25, dur: 0.8 });
      this.noticeLoop();
    } else if (p.x < -9.3 && this.player.vel.x < 0) {
      p.x = 9.1;
      this.audio.play('reverse_swell', { volume: 0.25, dur: 0.8 });
      this.noticeLoop();
    }
  }

  noticeLoop() {
    if (this._loopNoted) return;
    this._loopNoted = true;
    this.hud.say('You have walked the length of this corridor and arrived at the beginning of it.', null, 'sfx', 5);
    ST.addJournal(this.state, {
      cat: 'events', title: 'The corridor has no ends tonight',
      text: 'Walking east on the first and second floors puts me back at the west end. The doors are in the same order. The stairwell is where it always was, and I cannot walk to it.',
    });
    ST.noteChange(this.state, 'The corridors loop back on themselves.');
  }

  updateDynamics(dt) {
    for (const d of this.building.dynamic) {
      if (d.kind === 'drip') {
        d.next -= dt;
        if (d.next <= 0) {
          d.next = 1.6 + Math.random() * 4;
          this.audio.play('drip', { pos: d.pos, volume: 0.4, rate: 0.9 + Math.random() * 0.3 });
        }
      }
    }
    // rain follows the camera so it never runs out
    if (this.building.rain) {
      this.building.rain.material.uniforms.time.value = this.time;
      this.building.rain.material.uniforms.camPos.value.copy(this.camera.position);
      this.building.rain.material.uniforms.opacity.value = this.currentLevel() === ROOF_LEVEL ? 0.75 : 0.42;
    }
  }

  lightningFlash(power) {
    if (this.settings.reduceFlashing) return;
    this._flash = power;
  }

  lightningDecay(dt) {
    if (!this.building?.lightning) return;
    this._flash = Math.max(0, (this._flash || 0) - dt * 3.2);
    const f = this._flash;
    this.building.lightning.intensity = f > 0.02 ? f * (Math.random() < 0.4 ? 0.4 : 1.6) : 0;
  }

  // ══════════════════ the follower ══════════════════

  updateFollower(dt, lit) {
    const th = this.plan.threat;
    const f = this.npcs.follower;
    if (!th.follower) return;
    if (!f.active && this.elapsed > th.from && f.cooldown <= 0) {
      if (Math.random() < dt * (0.05 + th.aggression * 0.12)) {
        f.aggression = th.aggression;
        f.spawnNear(this.player.pos, this.player.fwd);
        this.audio.play('reverse_swell', { volume: 0.3, dur: 1.8 });
      }
    }
    if (!f.active) { f.update(dt, this.player.pos, this.player.fwd, false, lit, null, this.audio); return; }

    // is it in view?
    const to = new THREE.Vector3().subVectors(f.pos, this.player.pos);
    const dist = to.length();
    to.normalize();
    const facing = to.dot(this.player.fwd) > 0.62;
    const visible = facing && (this.lights.isLit(f.pos, 0.9) || (this.player.torchOn && this.player.battery > 0 && dist < 16));

    f.update(dt, this.player.pos, this.player.fwd, facing, visible, () => this.followerHit(), this.audio);

    if (visible && dist < 20) {
      this.director.dread = clamp(this.director.dread + dt * 0.25, 0, 1);
      if (!this._sawFollower) {
        this._sawFollower = true;
        ST.addJournal(this.state, {
          cat: 'events', title: 'There is someone in the corridor with me',
          text: 'It stands still when I look at it. It does not stand still when I do not. It is my height.',
        });
        this.hud.say('It is standing at the end of the corridor. It is your height.', null, 'sfx', 4);
      }
    }
  }

  followerHit() {
    this.state.health = clamp(this.state.health - 18, 0, 100);
    this.hurtFx = 1;
    this.hud.damage();
    this.audio.play('stinger', { volume: 0.5 });
    this.audio.play('breath', { volume: 0.6 });
    this.hud.toast('<b>It reached you.</b> You cannot say what happened next.', 'warn');
    // it takes something, and it is never the important thing
    const droppable = this.state.inventory.filter((s) => ITEMS[s.id] && ITEMS[s.id].kind === 'consumable');
    if (droppable.length && Math.random() < 0.6) {
      const s = droppable[Math.floor(Math.random() * droppable.length)];
      ST.removeItem(this.state, s.id, 1);
      this.hud.toast(`Something of yours is gone: <b>${esc(ITEMS[s.id].name)}</b>.`, 'warn');
    }
    if (this.state.health <= 0) this.die('Whatever has been walking behind you finally caught up.');
  }

  // ══════════════════ interaction ══════════════════

  updateInteraction() {
    if (this.anyPanelOpen()) { this.hud.setPrompt(null); return; }
    const cam = this.camera;
    this.ray = this.ray || new THREE.Raycaster();
    this.ray.set(cam.position, this.player.fwd);
    this.ray.far = 2.9;

    // people first — they are the point
    const npc = this.npcs.nearest(this.player.pos, 2.7);
    let target = null;
    if (npc) {
      const to = new THREE.Vector3().subVectors(npc.pos, this.player.pos).normalize();
      if (to.dot(this.player.fwd) > 0.55) {
        target = { kind: 'npc', npc, label: `Talk to ${NPC_DEFS[npc.id].short}` };
      }
    }

    if (!target) {
      const hits = this.ray.intersectObjects(this.building.interactMeshes, false);
      for (const h of hits) {
        const root = h.object.userData.interactRoot;
        if (!root || !root.userData.interact) continue;
        if (!this.isVisibleObject(root)) continue;
        const data = root.userData.interact;
        const lbl = this.promptFor(data, root);
        if (!lbl) continue;
        target = { kind: 'obj', root, data, label: lbl.text, locked: lbl.locked };
        break;
      }
    }

    this.hoverTarget = target;
    this.hud.setPrompt(target ? target.label : null, 'E', target?.locked);

    if (target && this.input.hit('KeyE')) {
      if (target.kind === 'npc') this.talkTo(target.npc);
      else this.interactWith(target.data, target.root);
    }
  }

  isVisibleObject(o) {
    let p = o;
    while (p) { if (p.visible === false) return false; p = p.parent; }
    return true;
  }

  promptFor(data, root) {
    const st = this.state;
    switch (data.type) {
      case 'door': {
        const d = this.building.doors.get(data.doorId);
        if (!d) return null;
        if (d.sealed) return { text: 'Sealed shut', locked: true };
        if (d.locked) {
          const key = d.keyItem;
          if (key && ST.hasItem(st, key)) return { text: `Unlock with ${ITEMS[key]?.name || 'key'}` };
          if (!key && ST.hasItem(st, 'key_office')) return { text: "Try the caretaker's keys" };
          return { text: 'Locked', locked: true };
        }
        return { text: d.open ? 'Close' : 'Open' };
      }
      case 'item': return { text: `Take ${data.label || ITEMS[data.item]?.name || 'it'}` };
      case 'read': return { text: data.label || 'Read' };
      case 'examine': return { text: 'Look closer' };
      case 'sleep': return { text: this.plan.allowSleepEarly || this.elapsed > NIGHT_SECONDS - 60 ? 'Go to bed' : 'Not yet' };
      case 'journal_desk': return { text: 'Your journal' };
      case 'larder': return { text: this.usedThisNight.has('larder') ? 'Empty' : 'Search the larder' };
      case 'lightswitch': return { text: 'Switch the lamp' };
      case 'elev_call': return { text: 'Call the lift' };
      case 'elev_button': return { text: `Press ${data.label}` };
      case 'window': return { text: 'Look outside' };
      case 'mirror': return { text: 'Look at yourself' };
      case 'newdoor': return { text: 'The door with no number', locked: true };
      case 'newdoor_final': return { text: 'Open it' };
      case 'frontdoor': return { text: this.canLeaveByFront() ? 'Lift the chain' : 'The front door' };
      case 'workbench': return { text: this.usedThisNight.has('bench') ? "Tomas's bench" : 'Service the torch' };
      case 'washer': return { text: 'Open the drum' };
      case 'filecabinet': return { text: ST.hasItem(st, 'key_office') ? 'Unlock the cabinet' : 'Locked cabinet', locked: !ST.hasItem(st, 'key_office') };
      case 'keyboard_rack': return { text: ST.hasItem(st, 'key_office') ? 'Keys' : 'Take the keys' };
      case 'fusebox': return { text: ST.hasItem(st, 'fuse') ? 'Fit a fuse' : 'Fuse box' };
      case 'breaker': return { text: 'Throw the breaker' };
      case 'valve': return { text: 'Turn the valve' };
      case 'painting': return { text: 'Look at the picture' };
      default: return root?.userData.interact?.text ? { text: 'Look closer' } : null;
    }
  }

  interactWith(data, root) {
    const st = this.state;
    switch (data.type) {
      case 'door': return this.useDoor(data.doorId);
      case 'item': return this.takeItem(data, root);
      case 'read': return this.readDoc(data.doc);
      case 'examine':
        this.hud.say(data.text, null, 'sfx', 6);
        this.audio.play('click', { volume: 0.25 });
        return;
      case 'sleep': {
        if (!this.plan.allowSleepEarly && this.elapsed < NIGHT_SECONDS - 60) {
          this.hud.say('Not tonight. Tonight you finish it.', null, 'sfx', 3.5);
          return;
        }
        this.audio.play('door_close', { volume: 0.4 });
        this.endNight('slept');
        return;
      }
      case 'journal_desk':
        this.journal.show(); this.input.unlock(); return;
      case 'larder': return this.searchLarder();
      case 'lightswitch': {
        const e = this.lights.emitters.find((x) => x.id === data.emitterId);
        if (e) { e.on = !e.on; e.broken = false; this.audio.play('switch', { pos: e.pos, volume: 0.5 }); }
        return;
      }
      case 'elev_call': {
        this.elevator.call(data.lv);
        this.hud.say('Somewhere in the shaft, something heavy begins to move.', null, 'sfx', 2.6);
        return;
      }
      case 'elev_button': return this.pressElevator(data.lv, data.label);
      case 'window': return this.lookOutside();
      case 'mirror': return this.lookInMirror();
      case 'newdoor': return this.tryNewDoor();
      case 'newdoor_final': return this.openNewDoor();
      case 'frontdoor': return this.tryFrontDoor();
      case 'workbench': return this.useBench();
      case 'washer': return this.openWasher(data.index);
      case 'filecabinet': return this.openCabinet();
      case 'keyboard_rack': return this.takeKeys();
      case 'fusebox': return this.fitFuse();
      case 'breaker': {
        const lv = this.currentLevel();
        let n = 0;
        for (const e of this.lights.emitters) {
          if (e.lv === lv && e.id.startsWith('cor_')) { e.on = !e.on; e.broken = false; n++; }
        }
        this.audio.play('zap', { volume: 0.5 });
        this.hud.say(`${n} circuits. They all still work, which is the part nobody wants to talk about.`, null, 'sfx', 4);
        return;
      }
      case 'valve':
        this.audio.play('pipe_clank', { pos: this.player.head, volume: 0.6 });
        this.audio.play('creak', { volume: 0.4, delay: 0.4 });
        this.hud.say('The valve turns easily. Somewhere above you, a long way above you, water begins to move.', null, 'sfx', 4);
        return;
      case 'painting': return this.lookAtPainting(data.roomId, root);
      default:
        if (data.text) this.hud.say(data.text, null, 'sfx', 5);
        void st;
    }
  }

  // ── individual interactions ───────────────────────────────────────────

  useDoor(id) {
    const d = this.building.doors.get(id);
    if (!d) return;
    if (d.sealed) {
      this.audio.play('door_locked', { pos: d.creakPos, volume: 0.6 });
      this.hud.say('Boarded from this side, and the boards are old. Nobody has opened this in years.', null, 'sfx', 4);
      return;
    }
    if (d.locked) {
      const key = d.keyItem;
      if (key && ST.hasItem(this.state, key)) {
        d.locked = false;
        this.audio.play('click', { pos: d.creakPos, volume: 0.7 });
        this.hud.toast(`Unlocked with the <b>${esc(ITEMS[key].name)}</b>.`);
        ST.setFlag(this.state, `${id}_unlocked`);
        return;
      }
      if (!key && ST.hasItem(this.state, 'key_office')) {
        d.locked = false;
        this.audio.play('click', { pos: d.creakPos, volume: 0.7 });
        this.hud.toast("One of the caretaker's keys fits.");
        return;
      }
      this.audio.play('door_locked', { pos: d.creakPos, volume: 0.7 });
      this.hud.say('Locked. The handle moves about a centimetre and stops.', null, 'sfx', 3);
      return;
    }
    const open = d.toggle();
    this.audio.play(open ? 'door_open' : 'door_close', { pos: d.creakPos, volume: 0.55 });
  }

  takeItem(data, root) {
    const st = this.state;
    const id = data.item;
    const def = ITEMS[id];
    if (!def) return;
    const qty = data.qty || 1;
    if (!ST.addItem(st, id, qty)) {
      this.hud.say('You already have one, and one is enough.', null, 'sfx', 2.6);
      return;
    }
    this.audio.play('pickup', { pos: root.position.clone(), volume: 0.6 });
    this.hud.toast(`<b>${esc(def.name)}</b>${qty > 1 ? ` ×${qty}` : ''}`);
    root.visible = false;
    root.userData.interact = null;
    if (def.doc || data.doc) this.readDoc(def.doc || data.doc);
    if (id === 'key_office') ST.setFlag(st, 'has_office_key');
  }

  readDoc(docId, replay = false) {
    const doc = DOCS[docId];
    if (!doc) return;
    const st = this.state;
    if (!st.docsRead.includes(docId)) st.docsRead.push(docId);
    if (doc.ev && ST.addEvidence(st, docId)) {
      this.hud.toast(`<b>Evidence.</b> ${esc(doc.title)}`, 'evidence');
      ST.save(st, 'discovery');
    }
    if (doc.journal) ST.addJournal(st, { ...doc.journal, id: `doc:${docId}` });
    else if (doc.note) ST.addJournal(st, { cat: 'events', title: doc.title, text: doc.note, id: `doc:${docId}` });
    this.audio.play('paper', { volume: 0.5 });
    this.reader.render(docId);
    this.input.unlock();
    void replay;
  }

  searchLarder() {
    if (this.usedThisNight.has('larder')) {
      this.hud.say('Empty. You have been through it twice tonight.', null, 'sfx', 3);
      return;
    }
    this.usedThisNight.add('larder');
    this.audio.play('door_open', { volume: 0.35, rate: 1.3 });
    const rng = makeRng(`larder-${this.state.night}-${this.state.seed}`);
    if (rng.chance(0.75)) {
      ST.addItem(this.state, 'food', 1);
      this.hud.toast('<b>Tinned Food</b> — one more than you remembered having.');
    } else {
      this.hud.say('Nothing. You are certain there were two tins.', null, 'sfx', 3.4);
      ST.noteChange(this.state, 'Food is missing from my own larder.');
    }
  }

  pressElevator(lv, label) {
    const res = this.elevator.press(lv);
    if (res.refused) {
      this.hud.say('The button for four does not light. There is no four.', null, 'sfx', 3.4);
      return;
    }
    if (res.lied) {
      this.hud.say(`You press ${label}.`, null, 'sfx', 2.2);
      ST.noteChange(this.state, 'The lift does not go where the buttons say.');
    }
    this.hud.say(`${label}.`, null, 'sfx', 1.8);
  }

  lookOutside() {
    const n = this.state.night;
    const lines = [
      'Rain on the glass, and behind it a city with almost no lights in it. Three windows burning in the whole northern district. You count them every night and it is always three.',
      'The street below is empty and shining. No cars have moved on it since the outage. The puddles have not been disturbed by anything.',
      'A window across the street lights up while you are watching, and goes out again, and lights up. Someone is signalling, or a fuse is failing. You cannot tell which and it matters.',
      'The building opposite is closer than it was. Not much. Enough that you can see the pattern on somebody\'s curtains.',
      'You cannot see the ground. There is a street down there and you have walked on it, and tonight the window shows you a courtyard you have never seen, with a chair in the middle of it.',
      'Your own reflection is late. It arrives about a third of a second after you move, and it is watching the room rather than the street.',
      'There is no city. There is rain, and there is the light from this window falling on rain, and beyond that the rain simply continues.',
    ];
    this.hud.say(lines[clamp(n, 1, 7) - 1], null, 'sfx', 6.5);
    this.audio.play('wind', { volume: 0.1 });
    if (n >= 5) this.director.dread = clamp(this.director.dread + 0.12, 0, 1);
    if (n === 7) {
      ST.addJournal(this.state, { cat: 'evidence', title: 'There is nothing outside the windows', text: 'No street. No opposite building. Rain, falling through the place where a city should be.' });
    }
  }

  lookInMirror() {
    const n = this.state.night;
    const lines = [
      'You look tired. That is all. It is a relief and you are embarrassed about how much of one.',
      'You look tired. Behind you, the door of your own apartment is closed. You left it open.',
      'You look tired, and slightly wrong, in the way of a photograph of yourself taken by somebody else.',
      'Your reflection blinks first.',
      'The room in the mirror has two plates on the table. The room you are standing in has one.',
      'You are not in it. The room is, perfectly, down to the grain of the wallpaper. You are not.',
      'It is a photograph now. Sepia, cracked, and it has been on this wall for a very long time, and you are in it, at the left edge, being scratched out with a pin.',
    ];
    this.hud.say(lines[clamp(n, 1, 7) - 1], null, 'sfx', 6.5);
    this.audio.play(n >= 4 ? 'chime_bad' : 'click', { volume: 0.4 });
    if (n >= 4) this.director.dread = clamp(this.director.dread + 0.2, 0, 1);
    if (n >= 6) ST.addJournal(this.state, { cat: 'events', title: 'The mirror has stopped including me', text: 'The room is reflected perfectly. I am not in it.' });
  }

  tryNewDoor() {
    const st = this.state;
    this.audio.play('door_locked', { volume: 0.6 });
    if (!st.flags.knocked_newdoor) {
      ST.setFlag(st, 'knocked_newdoor');
      this.hud.say('No handle. No keyhole. It is warm, and it does not move, and after a moment something on the other side knocks four times.', null, 'sfx', 6.5);
      this.audio.play('knock', { volume: 0.7, count: 4, delay: 1.6, pos: this.player.head.clone() });
      this.director.dread = clamp(this.director.dread + 0.3, 0, 1);
      ST.addJournal(st, {
        cat: 'events', title: 'It knocked back',
        text: 'I put my hand on the door with no number and something on the other side knocked four times. Mira says four is not allowed.',
      });
      this.readDoc('door_plaque');
    } else {
      this.hud.say('It is warm. It does not open. Not tonight.', null, 'sfx', 3.4);
    }
  }

  openNewDoor() {
    this.audio.play('door_open', { volume: 0.8 });
    this.audio.play('reverse_swell', { volume: 0.6, dur: 2.4 });
    this.state.choices.push('entered_door');
    ST.save(this.state, 'entered-door');
    this.fadeOut(2.4, () => this.showEnding('door'));
  }

  canLeaveByFront() {
    const st = this.state;
    return st.night >= ST.MAX_NIGHT || st.evidence.includes('tape_c') || st.flags.knows_three_ways;
  }

  tryFrontDoor() {
    const st = this.state;
    if (!this.canLeaveByFront()) {
      this.audio.play('_rattle', { volume: 0.6 });
      this.hud.say('Chained. You have never once tried lifting the hook, and you notice that you have never once tried, and then you do not try.', null, 'sfx', 6);
      ST.addJournal(st, { cat: 'events', title: 'The chain on the front door', text: 'I stood in front of it and did not try it. I have never tried it. That is a strange thing to be certain of.' });
      return;
    }
    if (st.night < ST.MAX_NIGHT) {
      this.hud.say('The hook is resting in the loop. It would lift off with one finger. — Not tonight. Not with this much still unfound.', null, 'sfx', 6);
      return;
    }
    this.audio.play('door_open', { volume: 0.7 });
    this.audio.play('wind', { volume: 0.4 });
    st.choices.push('left_by_front');
    ST.save(st, 'left-front');
    this.fadeOut(2.2, () => this.showEnding('front'));
  }

  useBench() {
    if (this.usedThisNight.has('bench')) {
      this.hud.say('Tools, solder, three radios in pieces. Nothing here is broken and nothing here is finished.', null, 'sfx', 4);
      return;
    }
    this.usedThisNight.add('bench');
    this.player.battery = 1;
    this.audio.play('click', { volume: 0.6 });
    this.audio.play('switch', { volume: 0.4, delay: 0.5 });
    this.hud.toast('<b>Torch serviced.</b> Contacts cleaned, cell topped up.');
    ST.setFlag(this.state, 'torch_serviced');
  }

  openWasher(i) {
    const key = `washer${i}`;
    if (this.usedThisNight.has(key)) { this.hud.say('Empty, and it smells of nothing at all.', null, 'sfx', 3); return; }
    this.usedThisNight.add(key);
    this.audio.play('door_open', { volume: 0.4, rate: 1.4 });
    const rng = makeRng(`wash-${this.state.night}-${i}`);
    if (rng.chance(0.4)) {
      const it = rng.pick(['coin', 'battery', 'ring']);
      ST.addItem(this.state, it, 1);
      this.hud.toast(`In the drum: <b>${esc(ITEMS[it].name)}</b>`);
      if (it === 'ring') this.hud.say('A wedding ring, in a machine nobody has run since the power went.', null, 'sfx', 4.5);
    } else {
      this.hud.say('A load of washing, wrung out and cold. Somebody put it in and never came back for it.', null, 'sfx', 4);
    }
  }

  openCabinet() {
    if (!ST.hasItem(this.state, 'key_office')) {
      this.audio.play('door_locked', { volume: 0.6 });
      this.hud.say('Locked. Halvard keeps the key on a chain.', null, 'sfx', 3);
      return;
    }
    if (this.usedThisNight.has('cabinet')) { this.hud.say('Files, in order, going back further than the building should allow.', null, 'sfx', 3.4); return; }
    this.usedThisNight.add('cabinet');
    this.audio.play('paper', { volume: 0.6 });
    ST.addItem(this.state, 'note_tenant', 1);
    this.readDoc('note_tenant');
    this.hud.toast('<b>Tenant List</b> taken from the cabinet.');
  }

  takeKeys() {
    if (ST.hasItem(this.state, 'key_office')) {
      this.hud.say('An empty board with nine hooks and nine faded outlines.', null, 'sfx', 3);
      return;
    }
    ST.addItem(this.state, 'key_office', 1);
    ST.setFlag(this.state, 'has_office_key');
    ST.setFlag(this.state, 'stole_keys');
    ST.addTrust(this.state, 'halvard', -2);
    this.audio.play('pickup', { volume: 0.7 });
    this.hud.toast("<b>Caretaker's Key</b> — taken. He will notice.", 'warn');
    this.state.choices.push('stole_keys');
    const rack = this.building.props.get('key_rack');
    if (rack) rack.visible = false;
  }

  fitFuse() {
    if (!ST.hasItem(this.state, 'fuse')) {
      this.hud.say('A row of ceramic fuse holders, and one of them is empty and blackened.', null, 'sfx', 4);
      return;
    }
    ST.removeItem(this.state, 'fuse', 1);
    this.audio.play('zap', { volume: 0.6 });
    let n = 0;
    for (const e of this.lights.emitters) {
      if (e.lv === -1) { e.on = true; e.broken = false; n++; }
    }
    this.hud.toast(`<b>The basement lights come on.</b> ${n} of them.`);
    ST.setFlag(this.state, 'basement_lit');
    ST.addJournal(this.state, {
      cat: 'events', title: 'The basement lights work',
      text: 'One fuse. Eleven days of blackout and the basement lights come on off a fuse, and the grid is supposed to be dead.',
    });
  }

  lookAtPainting(roomId, root) {
    const n = this.state.night;
    if (n >= 3 && !this.usedThisNight.has(`paint_${roomId}`)) {
      this.usedThisNight.add(`paint_${roomId}`);
      root.traverse((c) => {
        if (c.isMesh && c.material.map) c.material = MAT.paper('photo:empty');
      });
      this.audio.play('chime_bad', { volume: 0.3 });
      this.hud.say('It is a photograph of this room, taken from where you are standing. There is nobody in it. There was somebody in it a moment ago.', null, 'sfx', 6);
      ST.noteChange(this.state, 'A picture changed while I was looking at it.');
      this.director.dread = clamp(this.director.dread + 0.15, 0, 1);
    } else {
      this.hud.say('A print of the building, from the street, in better weather than this city has had recently.', null, 'sfx', 4);
    }
  }

  /** The building rearranges one small thing that is not in shot. */
  moveSomethingBehind() {
    const b = this.building;
    if (!b.movables.length) return;
    const lv = this.currentLevel();
    const cands = b.movables.filter((m) => {
      if (m.lv !== lv) return false;
      const to = new THREE.Vector3().subVectors(m.mesh.position, this.player.pos);
      const d = to.length();
      if (d > 16 || d < 2) return false;
      return to.normalize().dot(this.player.fwd) < 0.1;   // behind, or well off to the side
    });
    if (!cands.length) return;
    const pick = cands[Math.floor(Math.random() * cands.length)];
    pick.mesh.position.x += (Math.random() - 0.5) * 2.4;
    pick.mesh.position.z += (Math.random() - 0.5) * 1.8;
    pick.mesh.rotation.y += (Math.random() - 0.5) * 1.6;
    this.audio.play('creak', { pos: pick.mesh.position.clone(), volume: 0.3 });
    ST.noteChange(this.state, 'Things are not where I left them.');
  }

  observe(o) {
    this.hud.say(o.text, null, 'sfx', 7);
    this.audio.play('chime_bad', { volume: 0.22 });
    if (o.journal) ST.addJournal(this.state, { ...o.journal, id: `obs:${o.id}` });
    if (o.flag) ST.setFlag(this.state, o.flag);
    ST.noteChange(this.state, o.text.split('.')[0] + '.');
    ST.save(this.state, 'observation');
  }

  onNpcVanished(n) {
    if (n.id !== 'ilse') return;
    this.audio.play('door_close', { pos: n.pos.clone(), volume: 0.4 });
  }

  onIlseVanished() {
    const st = this.state;
    ST.setFlag(st, 'ilse_vanished');
    ST.addJournal(st, {
      cat: 'events', title: 'Ilse is not in 302',
      text: 'She went to the kitchen. There is no kitchen door. The tea is still warm and her glasses are on the arm of the chair.',
    });
    this.hud.say('Somewhere above you, a conversation stops in the middle of a word.', null, 'sfx', 4.5);
    this.audio.play('reverse_swell', { volume: 0.35, dur: 2 });
    // her photograph becomes findable
    const ph = this.building.props.get('ilse_photo');
    if (ph) ph.visible = true;
    ST.save(st, 'ilse-vanished');
  }

  // ══════════════════ dialogue plumbing ══════════════════

  dialogueTree(id) { return DIALOGUE[id]; }

  talkTo(npc) {
    const st = this.state;
    if (!st.metNpcs.includes(npc.id)) {
      st.metNpcs.push(npc.id);
      ST.addJournal(st, {
        cat: 'characters', title: `Met ${NPC_DEFS[npc.id].name}`,
        text: NPC_DEFS[npc.id].bio,
      });
    }
    const tree = DIALOGUE[npc.id];
    if (!tree) return;
    const node = tree.greet(st);
    this.dialogue.start(npc.id, node);
    this.input.unlock();
    this.audio.play('click', { volume: 0.2 });
  }

  applyDialogueFx(npcId, fx) {
    const st = this.state;
    if (fx.trust) ST.addTrust(st, npcId, fx.trust);
    if (fx.flag) ST.setFlag(st, fx.flag);
    if (fx.choice && !st.choices.includes(fx.choice)) st.choices.push(fx.choice);
    if (fx.take) ST.removeItem(st, fx.take, 1);
    if (fx.give) {
      for (const id of fx.give) {
        if (ST.addItem(st, id, 1)) this.hud.toast(`<b>${esc(ITEMS[id]?.name || id)}</b>`);
      }
    }
    if (fx.ev) {
      if (ST.addEvidence(st, fx.ev)) this.hud.toast(`<b>Evidence.</b> ${esc(DOCS[fx.ev]?.title || fx.ev)}`, 'evidence');
      if (!st.docsRead.includes(fx.ev)) st.docsRead.push(fx.ev);
    }
    if (fx.journal) ST.addJournal(st, fx.journal);
    if (fx.close) ST.save(st, 'talked');
  }

  onDialogueClosed() {
    if (this.mode === 'night' && !this.paused) this.input.lock();
  }

  // ══════════════════ items ══════════════════

  useItem(id) {
    const st = this.state;
    const def = ITEMS[id];
    if (!def?.use) return;
    if (def.use === 'reload') {
      if (this.player.battery > 0.95) { this.hud.say('The cell in it is fine.', null, 'sfx', 2.4); return; }
      ST.removeItem(st, id, 1);
      this.player.reload();
      this.hud.toast('<b>Fresh cell.</b> The beam steadies.');
    } else if (def.use === 'eat') {
      ST.removeItem(st, id, 1);
      st.food = clamp(st.food + 34, 0, 100);
      st.health = clamp(st.health + 4, 0, 100);
      this.audio.play('paper', { volume: 0.3 });
      this.hud.toast('You eat, standing up, without tasting it.');
    } else if (def.use === 'heal') {
      ST.removeItem(st, id, 1);
      st.health = clamp(st.health + 32, 0, 100);
      this.audio.play('click', { volume: 0.4 });
      this.hud.toast('The ache steps back a little.');
    }
    this.inventory.render();
  }

  combine(a, b) {
    const st = this.state;
    const combo = COMBOS.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));
    if (!combo) {
      this.hud.say('Those two do not go together.', null, 'sfx', 2.2);
      return;
    }
    if (combo.out === 'reload') { this.useItem('battery'); return; }
    if (combo.out.startsWith('play:')) {
      const tape = combo.out.slice(5);
      this.audio.play('tape_click', { volume: 0.6 });
      this.audio.play('static', { volume: 0.25, dur: 1.2, delay: 0.2 });
      this.readDoc(tape);
      return;
    }
    if (combo.out.startsWith('note:')) this.hud.say(combo.out.slice(5), null, 'sfx', 4);
  }

  // ══════════════════ journal support ══════════════════

  currentTheory() {
    const n = this.state.evidence.length;
    if (n === 0) return null;
    if (n < 3) return 'Not enough yet. Noises, a photograph, an old newspaper. Any one of them is nothing. I am writing them down because Ilse told me to and because I have started to distrust my own recall.';
    if (n < 5) return 'Something happened in this building and everybody who is still here was here for it. The blackout is not the cause. The blackout is the condition under which it repeats.';
    if (n < 7) return 'A fire, eleven days into an outage. Seven dead, six recovered. The fire doors were held open with folded newspaper — deliberately, by a resident, in the middle of an ordinary evening.';
    if (n < 9) return 'The seventh body was never found. The occupant of 204 was seen on the landing and then was not seen again. I live in 204. I have signed the lease more than once.';
    return 'I am the seventh. I propped the doors, I went out for ten minutes, and I have been going out for ten minutes ever since, looking for a version of the evening where I came back in time. The others are here because I am. Ending it means not being inside the building when the ten minutes close.';
  }

  locationNote(id) {
    const notes = {
      lobby: 'The entrance hall. Mailboxes, a dead plant, a chained front door. The chain has never been locked.',
      laundry: 'Four machines, three of them with washing still in them, cold and wrung out.',
      storage: 'Wire cages, one per apartment, most of them full of somebody else\'s decisions.',
      boiler: 'Warm, in a building with no heating. Numbers chalked on the casing, each crossed out by the one below.',
      office: "The caretaker's office. A log book going back decades in the same hand, which is not possible.",
      maint: 'Meters for five apartments. Four turn slowly. Mine does not.',
      sealed: 'Burnt. Boarded. This is where it started.',
      '204': 'My apartment. Tally marks under the door frame, in sevens, that I did not cut.',
      '302': "Ilse's, most nights. Two places always laid.",
      '104': "Tomas's workshop, where nothing is broken and nothing is finished.",
      '207': "Mira's room. The walls are papered in what is going to happen.",
      '401': "Voss's. Twenty-three hundred sheets of arithmetic.",
      '403': 'My own apartment, under years of undisturbed dust.',
      '404': 'The records. Every tenancy since the building opened, and one file for a room that does not exist.',
    };
    return notes[id] || 'Another room in a building that has more of them than it should.';
  }

  // ══════════════════ input outside the world ══════════════════

  handleGlobalKeys() {
    const i = this.input;
    if (i.hitRaw('Escape')) {
      if (this.reader.open) { this.reader.close(); return; }
      if (this.dialogue.open) { this.dialogue.close(); return; }
      if (this.inventory.open) { this.inventory.close(); this.onPanelClosed(); return; }
      if (this.journal.open) { this.journal.close(); this.onPanelClosed(); return; }
      if ($('#settings').classList.contains('hidden') === false) {
        $('#settings').classList.add('hidden');
        $(`#${this.settingsBack || 'mainmenu'}`).classList.remove('hidden');
        return;
      }
      if (this.mode === 'night') this.setPaused(!this.paused);
      return;
    }
    if (this.mode !== 'night' || this.paused) return;

    if (this.reader.open) {
      if (i.hitRaw('KeyE') || i.hitRaw('Space')) this.reader.close();
      return;
    }
    if (this.dialogue.open) {
      for (let k = 1; k <= 9; k++) {
        if (i.hitRaw(`Digit${k}`)) { if (!this.dialogue.skipTyping()) this.dialogue.choose(k - 1); }
      }
      if (i.hitRaw('Space') || i.hitRaw('KeyE')) this.dialogue.skipTyping();
      return;
    }
    if (i.hitRaw('Tab')) {
      if (this.journal.open) this.journal.close();
      this.inventory.toggle();
      if (this.inventory.open) this.input.unlock(); else this.onPanelClosed();
      this.audio.play('paper', { volume: 0.3 });
      return;
    }
    if (i.hitRaw('KeyJ')) {
      if (this.inventory.open) this.inventory.close();
      this.journal.toggle();
      if (this.journal.open) this.input.unlock(); else this.onPanelClosed();
      this.audio.play('paper', { volume: 0.35 });
      return;
    }
    if (i.hitRaw('KeyF')) {
      const on = this.player.toggleTorch();
      if (!on && this.player.battery <= 0) this.hud.toast('The cell is dead. You need a battery.', 'warn');
    }
    if (i.hitRaw('KeyT')) this.hud.peekWatch();
  }

  fadeOut(seconds, done) {
    const b = $('#blackout');
    b.style.transitionDuration = `${seconds}s`;
    b.classList.add('on');
    setTimeout(() => {
      done?.();
      b.classList.remove('on');
      b.style.transitionDuration = '';
    }, seconds * 1000 + 60);
  }
}

// ── go ──────────────────────────────────────────────────────────────────
const game = new Game();
window.__omn = game;
game.boot();
