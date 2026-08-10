// ══════════════════════════════════════════════════════════════════════
//  Procedural 3D audio.
//  Every sound in the game is synthesised at runtime from noise and
//  oscillators — there are no audio files anywhere in this repository.
// ══════════════════════════════════════════════════════════════════════

const TAU = Math.PI * 2;

export class AudioEngine {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.ready = false;
    this.beds = {};
    this.listenerPos = { x: 0, y: 0, z: 0 };
    this._active = new Set();
    this.onSubtitle = null;      // (text) => void — for the accessibility captions
    this.muffle = 0;             // 0..1 "underwater" feel used by dream / distortion states
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC({ latencyHint: 'interactive' }));

    this.master = ctx.createGain();
    this.master.gain.value = this.settings.volume;

    // Gentle bus compression keeps thunder from clipping the quiet moments.
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.knee.value = 22;
    this.comp.ratio.value = 3.4;
    this.comp.attack.value = 0.006;
    this.comp.release.value = 0.28;

    // Global low-pass used for "muffled" states (behind doors, dreaming).
    this.muffleFilter = ctx.createBiquadFilter();
    this.muffleFilter.type = 'lowpass';
    this.muffleFilter.frequency.value = 20000;

    this.master.connect(this.comp);
    this.comp.connect(this.muffleFilter);
    this.muffleFilter.connect(ctx.destination);

    // Two reverb sends: a tight room and a long concrete stairwell.
    this.revRoom = this._makeReverb(1.1, 0.72, 2600);
    this.revHall = this._makeReverb(3.4, 0.5, 1500);

    this._noise = {
      white: this._noiseBuffer(2.0, 'white'),
      pink: this._noiseBuffer(3.0, 'pink'),
      brown: this._noiseBuffer(4.0, 'brown'),
    };

    if (ctx.listener.forwardX) {
      ctx.listener.upX.value = 0; ctx.listener.upY.value = 1; ctx.listener.upZ.value = 0;
    } else {
      ctx.listener.setOrientation(0, 0, -1, 0, 1, 0);
    }
    this.ready = true;
  }

  setVolume(v) { if (this.master) this.master.gain.value = v; }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  // ── building blocks ──────────────────────────────────────────────────

  _noiseBuffer(seconds, kind) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    if (kind === 'white') {
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } else if (kind === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      let last = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    return buf;
  }

  /** Impulse response built from decaying noise — cheap, convincing concrete. */
  _makeReverb(seconds, decay, tone) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, 1 / decay) * (i < rate * 0.004 ? i / (rate * 0.004) : 1);
        const s = (Math.random() * 2 - 1) * env;
        lp += (s - lp) * 0.42;   // soften the tail so it reads as plaster, not glass
        d[i] = lp;
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    const pre = ctx.createGain(); pre.gain.value = 0;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = tone;
    pre.connect(conv); conv.connect(filt); filt.connect(this.master);
    return pre;
  }

  _noiseSrc(kind = 'white', loop = true) {
    const s = this.ctx.createBufferSource();
    s.buffer = this._noise[kind];
    s.loop = loop;
    return s;
  }

  /** Create a positional output node; falls back to plain stereo if pos is null. */
  _out(pos, opts = {}) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    if (pos) {
      const p = ctx.createPanner();
      p.panningModel = 'HRTF';
      p.distanceModel = 'inverse';
      p.refDistance = opts.ref ?? 1.6;
      p.maxDistance = opts.max ?? 90;
      p.rolloffFactor = opts.rolloff ?? 1.15;
      if (p.positionX) {
        p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z;
      } else p.setPosition(pos.x, pos.y, pos.z);
      g.connect(p);
      p.connect(this.master);
      if (opts.reverb !== 0) {
        const send = ctx.createGain();
        send.gain.value = opts.reverb ?? 0.16;
        p.connect(send);
        send.connect(opts.hall ? this.revHall : this.revRoom);
      }
      g._panner = p;
    } else {
      g.connect(this.master);
      if (opts.reverb) {
        const send = ctx.createGain(); send.gain.value = opts.reverb;
        g.connect(send); send.connect(opts.hall ? this.revHall : this.revRoom);
      }
    }
    return g;
  }

  /** Move the listener. `fwd` is the camera forward vector. */
  setListener(pos, fwd) {
    if (!this.ready) return;
    const L = this.ctx.listener, t = this.t;
    this.listenerPos = { x: pos.x, y: pos.y, z: pos.z };
    if (L.positionX) {
      L.positionX.setTargetAtTime(pos.x, t, 0.02);
      L.positionY.setTargetAtTime(pos.y, t, 0.02);
      L.positionZ.setTargetAtTime(pos.z, t, 0.02);
      L.forwardX.setTargetAtTime(fwd.x, t, 0.02);
      L.forwardY.setTargetAtTime(fwd.y, t, 0.02);
      L.forwardZ.setTargetAtTime(fwd.z, t, 0.02);
    } else {
      L.setPosition(pos.x, pos.y, pos.z);
      L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0);
    }
  }

  setMuffle(v) {
    if (!this.ready) return;
    this.muffle = v;
    const f = 20000 * Math.pow(1 - Math.min(0.985, v), 2.4) + 320;
    this.muffleFilter.frequency.setTargetAtTime(f, this.t, 0.15);
  }

  // ── ambient beds ─────────────────────────────────────────────────────

  /** Start (or retune) a looping bed. Beds are cheap and always running. */
  bed(name, targetGain, opts = {}) {
    if (!this.ready) return;
    let b = this.beds[name];
    if (!b) { b = this.beds[name] = this._buildBed(name, opts); if (!b) return; }
    b.gain.gain.setTargetAtTime(Math.max(0.0001, targetGain), this.t, opts.fade ?? 0.9);
    if (opts.tone && b.filter) b.filter.frequency.setTargetAtTime(opts.tone, this.t, 1.2);
  }

  _buildBed(name) {
    const ctx = this.ctx;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    g.connect(this.master);
    const out = { gain: g, nodes: [] };

    switch (name) {
      case 'rain': {
        // Broadband hiss + a slow "sheet" swell + individual drops on glass.
        const src = this._noiseSrc('pink');
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 620;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
        out.filter = lp;
        const swellGain = ctx.createGain(); swellGain.gain.value = 1;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
        const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.32;
        lfo.connect(lfoAmt); lfoAmt.connect(swellGain.gain); lfo.start();
        src.connect(hp); hp.connect(lp); lp.connect(swellGain); swellGain.connect(g);
        src.start();
        out.nodes.push(src, lfo);
        break;
      }
      case 'wind': {
        const src = this._noiseSrc('brown');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 340; bp.Q.value = 1.4;
        out.filter = bp;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.043;
        const amt = ctx.createGain(); amt.gain.value = 190;
        lfo.connect(amt); amt.connect(bp.frequency); lfo.start();
        const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.11;
        const amt2 = ctx.createGain(); amt2.gain.value = 0.45;
        const vg = ctx.createGain(); vg.gain.value = 0.7;
        lfo2.connect(amt2); amt2.connect(vg.gain); lfo2.start();
        src.connect(bp); bp.connect(vg); vg.connect(g); src.start();
        out.nodes.push(src, lfo, lfo2);
        break;
      }
      case 'hum': {
        // Mains buzz: 50Hz fundamental with the harmonics that make it feel electric.
        const mk = (f, amp, type) => {
          const o = ctx.createOscillator(); o.type = type || 'sawtooth'; o.frequency.value = f;
          const gg = ctx.createGain(); gg.gain.value = amp;
          o.connect(gg); gg.connect(bp); o.start(); out.nodes.push(o);
        };
        const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 900; bp.Q.value = 0.8;
        out.filter = bp;
        bp.connect(g);
        mk(50, 0.16); mk(100, 0.09, 'sine'); mk(150, 0.045, 'sine'); mk(250, 0.02, 'sine');
        break;
      }
      case 'pipes': {
        // Air moving through old plumbing — resonant, slightly detuned.
        const src = this._noiseSrc('brown');
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 165; bp.Q.value = 7;
        const bp2 = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 410; bp2.Q.value = 11;
        out.filter = bp;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
        const amt = ctx.createGain(); amt.gain.value = 34;
        lfo.connect(amt); amt.connect(bp.frequency); lfo.start();
        src.connect(bp); src.connect(bp2); bp.connect(g); bp2.connect(g); src.start();
        out.nodes.push(src, lfo);
        break;
      }
      case 'drone': {
        // The building's own note. Very low, felt more than heard.
        const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 41.2;
        const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 41.9;
        const o3 = ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 82.4;
        const g3 = ctx.createGain(); g3.gain.value = 0.18;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
        out.filter = lp;
        o1.connect(lp); o2.connect(lp); o3.connect(g3); g3.connect(lp); lp.connect(g);
        o1.start(); o2.start(); o3.start();
        out.nodes.push(o1, o2, o3);
        break;
      }
      case 'tinnitus': {
        // Rises with dread. A thin, unpleasant ring.
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 3140;
        const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 4710;
        const g2 = ctx.createGain(); g2.gain.value = 0.35;
        o.connect(g); o2.connect(g2); g2.connect(g);
        o.start(); o2.start();
        out.nodes.push(o, o2);
        break;
      }
      case 'motor': {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 44;
        const src = this._noiseSrc('brown');
        const ng = ctx.createGain(); ng.gain.value = 0.25;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
        out.filter = lp;
        o.connect(lp); src.connect(ng); ng.connect(lp); lp.connect(g);
        o.start(); src.start();
        out.nodes.push(o, src);
        break;
      }
      default: return null;
    }
    return out;
  }

  bedOff(name, fade = 1.2) {
    const b = this.beds[name];
    if (b) b.gain.gain.setTargetAtTime(0.0001, this.t, fade);
  }

  // ── one-shots ────────────────────────────────────────────────────────

  /**
   * play(name, opts)
   *   pos       {x,y,z} world position, or null for non-diegetic
   *   volume    linear gain multiplier
   *   rate      pitch multiplier where meaningful
   *   delay     seconds
   *   hall      true → long stairwell reverb
   *   subtitle  caption text for the accessibility option
   */
  play(name, opts = {}) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t0 = this.t + (opts.delay || 0);
    const vol = opts.volume ?? 1;
    const rate = opts.rate ?? 1;
    const out = this._out(opts.pos || null, opts);
    out.gain.value = vol;

    const noise = (kind, dur, shape) => {
      const s = this._noiseSrc(kind, false);
      s.playbackRate.value = rate;
      const g = ctx.createGain();
      s.connect(shape || g);
      if (shape) shape.connect(g);
      g.connect(out);
      s.start(t0, Math.random() * 0.5, dur);
      return g;
    };
    const tone = (type, f, dur, amp, target) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * rate;
      const g = ctx.createGain(); g.gain.value = 0;
      o.connect(g); g.connect(target || out);
      o.start(t0); o.stop(t0 + dur + 0.05);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(amp, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      return { o, g };
    };
    const env = (g, a, d, peak = 1) => {
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    };
    const filt = (type, f, q) => {
      const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b;
    };

    switch (name) {
      case 'step': {
        // Surface-flavoured impact. Wood knocks, concrete slaps, carpet thuds.
        const surf = opts.surface || 'wood';
        const cfg = {
          wood: [1500, 3.5, 0.055, 0.55], concrete: [2400, 2.0, 0.04, 0.5],
          tile: [3400, 3.0, 0.045, 0.55], carpet: [700, 1.2, 0.07, 0.32],
          metal: [3800, 8.0, 0.10, 0.5], dirt: [520, 1.0, 0.06, 0.3],
          water: [1900, 1.6, 0.11, 0.45],
        }[surf] || [1500, 3, 0.055, 0.5];
        const bp = filt('bandpass', cfg[0] * (0.85 + Math.random() * 0.3), cfg[1]);
        const g = noise('white', cfg[2] + 0.05, bp);
        env(g, 0.002, cfg[2], cfg[3]);
        const lp = filt('lowpass', 180, 1);
        const th = tone('sine', surf === 'carpet' ? 78 : 105, 0.09, 0.22, lp);
        lp.connect(out); void th;
        if (surf === 'metal') tone('triangle', 640 + Math.random() * 200, 0.22, 0.06);
        break;
      }
      case 'land': {
        const bp = filt('lowpass', 420, 1.2);
        const g = noise('brown', 0.2, bp); env(g, 0.003, 0.16, 0.75);
        tone('sine', 64, 0.2, 0.3);
        break;
      }
      case 'door_open': {
        // Hinge creak: a swept resonant band, never quite the same twice.
        const bp = filt('bandpass', 380, 16);
        const g = noise('pink', 1.3, bp); env(g, 0.06, 1.0, 0.5);
        bp.frequency.setValueAtTime(300 + Math.random() * 160, t0);
        bp.frequency.exponentialRampToValueAtTime(700 + Math.random() * 500, t0 + 0.9);
        const bp2 = filt('bandpass', 1400, 22);
        const g2 = noise('pink', 1.1, bp2); env(g2, 0.1, 0.85, 0.18);
        bp2.frequency.exponentialRampToValueAtTime(2400, t0 + 0.8);
        break;
      }
      case 'door_close': {
        const lp = filt('lowpass', 380, 1);
        const g = noise('brown', 0.3, lp); env(g, 0.002, 0.22, 0.9);
        tone('sine', 86, 0.28, 0.36);
        tone('triangle', 172, 0.12, 0.1);
        break;
      }
      case 'door_locked': {
        const bp = filt('bandpass', 2600, 6);
        const g = noise('white', 0.1, bp); env(g, 0.002, 0.07, 0.42);
        tone('square', 320, 0.05, 0.05);
        this.play('_rattle', { ...opts, delay: (opts.delay || 0) + 0.11, volume: vol * 0.7 });
        break;
      }
      case '_rattle': {
        const bp = filt('bandpass', 1900, 8);
        const g = noise('white', 0.14, bp); env(g, 0.002, 0.1, 0.3);
        break;
      }
      case 'knock': {
        // Three knocks. The gap between them is what makes it unsettling.
        const n = opts.count ?? 3;
        for (let i = 0; i < n; i++) {
          const d = (opts.delay || 0) + i * (0.29 + Math.random() * 0.06);
          const o2 = { ...opts, delay: d, volume: vol * (1 - i * 0.06) };
          const oo = this._out(opts.pos || null, opts); oo.gain.value = o2.volume;
          const tt = this.t + d;
          const lp = filt('lowpass', 700, 1.4);
          const s = this._noiseSrc('brown', false);
          const gg = ctx.createGain();
          s.connect(lp); lp.connect(gg); gg.connect(oo);
          s.start(tt, Math.random() * 0.4, 0.2);
          gg.gain.setValueAtTime(0, tt);
          gg.gain.linearRampToValueAtTime(0.9, tt + 0.003);
          gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.16);
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 128 + Math.random() * 30;
          const g3 = ctx.createGain(); g3.gain.value = 0;
          o.connect(g3); g3.connect(oo); o.start(tt); o.stop(tt + 0.2);
          g3.gain.setValueAtTime(0, tt); g3.gain.linearRampToValueAtTime(0.34, tt + 0.004);
          g3.gain.exponentialRampToValueAtTime(0.0001, tt + 0.17);
        }
        break;
      }
      case 'thunder': {
        // Distant, mostly felt. Crack first, then the roll.
        const lp = filt('lowpass', 260, 0.9);
        const g = noise('brown', 3.4, lp);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.9, t0 + 0.07);
        g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
        lp.frequency.setValueAtTime(700, t0);
        lp.frequency.exponentialRampToValueAtTime(90, t0 + 2.8);
        const sub = tone('sine', 38, 2.6, 0.4);
        sub.o.frequency.exponentialRampToValueAtTime(26, t0 + 2.4);
        break;
      }
      case 'pipe_clank': {
        // Inharmonic partials: metal, not a musical note.
        const parts = [430, 731, 1103, 1657, 2311];
        for (let i = 0; i < parts.length; i++) {
          const t = tone('sine', parts[i] * (0.96 + Math.random() * 0.08), 0.55 - i * 0.07, 0.2 / (i + 1));
          void t;
        }
        const bp = filt('bandpass', 2800, 3);
        const g = noise('white', 0.09, bp); env(g, 0.001, 0.06, 0.3);
        break;
      }
      case 'drip': {
        const t = tone('sine', 1200, 0.14, 0.28);
        t.o.frequency.exponentialRampToValueAtTime(420, t0 + 0.1);
        const bp = filt('bandpass', 3000, 4);
        const g = noise('white', 0.05, bp); env(g, 0.001, 0.035, 0.12);
        break;
      }
      case 'ding': {
        // Elevator arrival. Two partials, long decay, faintly sour.
        tone('sine', 784, 1.9, 0.3);
        tone('sine', 1176, 1.5, 0.13);
        tone('sine', 1571, 0.9, 0.05);
        break;
      }
      case 'elev_doors': {
        const bp = filt('bandpass', 900, 2.2);
        const g = noise('pink', 1.5, bp); env(g, 0.15, 1.2, 0.4);
        bp.frequency.setValueAtTime(600, t0);
        bp.frequency.linearRampToValueAtTime(1500, t0 + 1.2);
        tone('sine', 60, 0.4, 0.12);
        break;
      }
      case 'creak': {
        const bp = filt('bandpass', 220, 20);
        const g = noise('pink', 1.8, bp); env(g, 0.25, 1.4, 0.32);
        bp.frequency.setValueAtTime(180 + Math.random() * 120, t0);
        bp.frequency.exponentialRampToValueAtTime(520 + Math.random() * 400, t0 + 1.5);
        break;
      }
      case 'wood_groan': {
        const bp = filt('bandpass', 96, 12);
        const g = noise('brown', 2.4, bp); env(g, 0.4, 1.9, 0.45);
        bp.frequency.exponentialRampToValueAtTime(210, t0 + 2.0);
        break;
      }
      case 'drop': {
        // Something falls over somewhere you are not.
        const lp = filt('lowpass', 900, 1);
        const g = noise('brown', 0.5, lp); env(g, 0.002, 0.3, 0.8);
        tone('sine', 110, 0.3, 0.3);
        for (let i = 0; i < 3; i++) {
          const d = 0.18 + i * (0.09 + Math.random() * 0.05);
          const oo = this._out(opts.pos || null, opts); oo.gain.value = vol * (0.4 - i * 0.1);
          const tt = this.t + (opts.delay || 0) + d;
          const s = this._noiseSrc('white', false);
          const bp2 = filt('bandpass', 1200 + Math.random() * 900, 4);
          const gg = ctx.createGain();
          s.connect(bp2); bp2.connect(gg); gg.connect(oo);
          s.start(tt, Math.random() * 0.4, 0.12);
          gg.gain.setValueAtTime(0, tt); gg.gain.linearRampToValueAtTime(0.7, tt + 0.002);
          gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.09);
        }
        break;
      }
      case 'glass': {
        const bp = filt('highpass', 2600);
        const g = noise('white', 0.7, bp); env(g, 0.001, 0.5, 0.5);
        for (let i = 0; i < 6; i++) tone('sine', 2400 + Math.random() * 3000, 0.3 + Math.random() * 0.4, 0.05);
        break;
      }
      case 'paper': {
        const bp = filt('highpass', 1800);
        const g = noise('white', 0.4, bp);
        g.gain.setValueAtTime(0, t0);
        for (let i = 0; i < 7; i++) {
          const tt = t0 + i * 0.045 + Math.random() * 0.02;
          g.gain.setValueAtTime(0.03 + Math.random() * 0.16, tt);
          g.gain.exponentialRampToValueAtTime(0.001, tt + 0.035);
        }
        break;
      }
      case 'pickup': {
        tone('sine', 620, 0.13, 0.11);
        tone('sine', 930, 0.09, 0.05);
        const bp = filt('bandpass', 3000, 3);
        const g = noise('white', 0.05, bp); env(g, 0.001, 0.04, 0.16);
        break;
      }
      case 'click': {
        const bp = filt('bandpass', 2400, 6);
        const g = noise('white', 0.04, bp); env(g, 0.001, 0.028, 0.35);
        tone('square', 900, 0.02, 0.03);
        break;
      }
      case 'switch': {
        const bp = filt('bandpass', 1700, 5);
        const g = noise('white', 0.06, bp); env(g, 0.001, 0.04, 0.5);
        tone('sine', 240, 0.05, 0.08);
        break;
      }
      case 'flicker': {
        const bp = filt('bandpass', 3200, 2);
        const g = noise('white', 0.22, bp); env(g, 0.002, 0.18, 0.28);
        tone('sawtooth', 100, 0.2, 0.05);
        break;
      }
      case 'zap': {
        const hp = filt('highpass', 1400);
        const g = noise('white', 0.3, hp); env(g, 0.001, 0.22, 0.7);
        const t = tone('sawtooth', 180, 0.25, 0.14);
        t.o.frequency.exponentialRampToValueAtTime(40, t0 + 0.22);
        break;
      }
      case 'whisper': {
        // Formant-shaped noise. Sounds like language without being any.
        const dur = opts.dur ?? 2.0;
        const src = this._noiseSrc('pink', false);
        const g = ctx.createGain(); g.gain.value = 0;
        const fs = [[320, 12], [980, 14], [2400, 10]];
        for (const [f, q] of fs) {
          const b = filt('bandpass', f * (0.8 + Math.random() * 0.4), q);
          const bg = ctx.createGain(); bg.gain.value = 0.6;
          src.connect(b); b.connect(bg); bg.connect(g);
          const lfo = ctx.createOscillator(); lfo.frequency.value = 3 + Math.random() * 4;
          const amt = ctx.createGain(); amt.gain.value = f * 0.14;
          lfo.connect(amt); amt.connect(b.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.2);
        }
        g.connect(out);
        src.start(t0, Math.random(), dur);
        g.gain.setValueAtTime(0, t0);
        // syllables
        let tt = t0;
        while (tt < t0 + dur) {
          const l = 0.08 + Math.random() * 0.14;
          g.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.4, tt + 0.03);
          g.gain.linearRampToValueAtTime(0.02, tt + l);
          tt += l + Math.random() * 0.09;
        }
        g.gain.linearRampToValueAtTime(0, t0 + dur);
        break;
      }
      case 'voices': {
        // Muffled conversation through a wall — no words, only cadence.
        const dur = opts.dur ?? 4.0;
        const src = this._noiseSrc('brown', false);
        const lp = filt('lowpass', 480, 1.4);
        const bp = filt('bandpass', 260, 3);
        const g = ctx.createGain(); g.gain.value = 0;
        src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(out);
        src.start(t0, Math.random() * 2, dur);
        let tt = t0;
        let hi = false;
        while (tt < t0 + dur) {
          const l = 0.15 + Math.random() * 0.5;
          hi = !hi;
          bp.frequency.setTargetAtTime(hi ? 300 : 180, tt, 0.1);
          g.gain.setTargetAtTime(0.35 + Math.random() * 0.3, tt, 0.05);
          g.gain.setTargetAtTime(0.04, tt + l * 0.8, 0.08);
          tt += l + Math.random() * 0.25;
        }
        g.gain.setTargetAtTime(0, t0 + dur, 0.2);
        break;
      }
      case 'breath': {
        const bp = filt('bandpass', 620, 1.4);
        const g = noise('pink', 1.1, bp);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.3, t0 + 0.28);
        g.gain.linearRampToValueAtTime(0.02, t0 + 0.75);
        g.gain.linearRampToValueAtTime(0.22, t0 + 1.05);
        g.gain.linearRampToValueAtTime(0.0001, t0 + 1.6);
        break;
      }
      case 'heartbeat': {
        for (const [d, a] of [[0, 0.5], [0.26, 0.34]]) {
          const lp2 = filt('lowpass', 120, 1.2);
          const s = this._noiseSrc('brown', false);
          const gg = ctx.createGain();
          s.connect(lp2); lp2.connect(gg); gg.connect(out);
          const tt = t0 + d;
          s.start(tt, Math.random() * 0.3, 0.25);
          gg.gain.setValueAtTime(0, tt);
          gg.gain.linearRampToValueAtTime(a, tt + 0.02);
          gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.2);
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 48;
          const g4 = ctx.createGain(); g4.gain.value = 0;
          o.connect(g4); g4.connect(out); o.start(tt); o.stop(tt + 0.3);
          g4.gain.setValueAtTime(0, tt); g4.gain.linearRampToValueAtTime(a * 0.8, tt + 0.02);
          g4.gain.exponentialRampToValueAtTime(0.0001, tt + 0.22);
        }
        break;
      }
      case 'stinger': {
        // Used sparingly. Three times in the whole game, roughly.
        const cluster = [110, 116, 233, 247, 466];
        for (const f of cluster) {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
          const gg = ctx.createGain(); gg.gain.value = 0;
          const lp2 = filt('lowpass', 1200, 2);
          o.connect(lp2); lp2.connect(gg); gg.connect(out);
          o.start(t0); o.stop(t0 + 1.5);
          o.frequency.exponentialRampToValueAtTime(f * 1.6, t0 + 0.9);
          gg.gain.setValueAtTime(0, t0);
          gg.gain.linearRampToValueAtTime(0.09, t0 + 0.02);
          gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
        }
        const hp = filt('highpass', 900);
        const g = noise('white', 0.9, hp); env(g, 0.01, 0.7, 0.35);
        break;
      }
      case 'reverse_swell': {
        // The sound of something about to happen.
        const bp = filt('bandpass', 400, 1.2);
        const dur = opts.dur ?? 2.6;
        const g = noise('pink', dur + 0.2, bp);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.5, t0 + dur);
        g.gain.linearRampToValueAtTime(0, t0 + dur + 0.12);
        bp.frequency.setValueAtTime(220, t0);
        bp.frequency.exponentialRampToValueAtTime(2600, t0 + dur);
        break;
      }
      case 'static': {
        const hp = filt('highpass', 700);
        const g = noise('white', opts.dur ?? 0.6, hp);
        env(g, 0.01, (opts.dur ?? 0.6) * 0.9, 0.4);
        break;
      }
      case 'tape_click': {
        const bp = filt('bandpass', 1100, 8);
        const g = noise('white', 0.06, bp); env(g, 0.001, 0.04, 0.6);
        tone('square', 160, 0.04, 0.1);
        break;
      }
      case 'write': {
        for (let i = 0; i < 9; i++) {
          const bp = filt('bandpass', 2200 + Math.random() * 2200, 5);
          const s = this._noiseSrc('white', false);
          const gg = ctx.createGain();
          s.connect(bp); bp.connect(gg); gg.connect(out);
          const tt = t0 + i * 0.07 + Math.random() * 0.03;
          s.start(tt, Math.random() * 0.4, 0.06);
          gg.gain.setValueAtTime(0, tt);
          gg.gain.linearRampToValueAtTime(0.1, tt + 0.005);
          gg.gain.exponentialRampToValueAtTime(0.0001, tt + 0.05);
        }
        break;
      }
      case 'chime_bad': {
        // Something registering that shouldn't be able to.
        tone('sine', 622, 2.4, 0.14);
        tone('sine', 659, 2.2, 0.11);
        tone('sine', 311, 2.8, 0.09);
        break;
      }
      case 'boom': {
        const lp = filt('lowpass', 140, 1);
        const g = noise('brown', 1.6, lp); env(g, 0.004, 1.3, 1.0);
        const t = tone('sine', 52, 1.4, 0.5);
        t.o.frequency.exponentialRampToValueAtTime(24, t0 + 1.2);
        break;
      }
      default:
        return;
    }
    if (opts.subtitle && this.settings.subtitles) this.onSubtitle?.(opts.subtitle);
  }

  /** Convenience: play a sound roughly behind the listener. */
  playBehind(name, camForward, dist = 3.2, opts = {}) {
    const p = this.listenerPos;
    const jitter = (Math.random() - 0.5) * 1.2;
    this.play(name, {
      ...opts,
      pos: {
        x: p.x - camForward.x * dist + jitter,
        y: p.y + (Math.random() - 0.5) * 0.4,
        z: p.z - camForward.z * dist + jitter,
      },
    });
  }

  stopAll() {
    for (const k of Object.keys(this.beds)) this.bedOff(k, 0.25);
  }
}
