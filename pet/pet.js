// Sakuga Pet: an interactive cel-shaded anime desktop mascot ("Koma-Neko" & "Koma-Mecha")
// drawn on a high-DPI canvas stepped on SakugaFX's shared clock.
// Supports Stage Mode (manga playground frame with compact action pills) and Floating Desktop Mode
// (roams across the viewport bottom, pick-up/drag/throw with real 2D bounce physics), cursor eye tracking,
// spring-chain scarf & wagging tail, manga speech bubbles, autonomous idle behaviors, and anime VFX beats.
//
// Usage:
//   <sakuga-pet name="Koma" character="neko"></sakuga-pet>
//   <sakuga-pet name="Unit-09" character="mecha" floating></sakuga-pet>
(() => {
'use strict';

function component(fx) {
  const {
    TAU, clamp, lerp, rnd, Spring, later, esc,
    burst, shards, puff, lines, ticks, wob, kira, sfx, hollow, dotted,
  } = fx;

  const AMBER = '#ff9b54';
  const GREEN = '#38c98a';
  const DEEP_PINK = '#d93d84';
  const MOODS = new Set(['idle', 'happy', 'surprised', 'sleep', 'dash']);
  const CHARS = new Set(['neko', 'mecha']);

  const QUIPS = {
    neko: {
      pat: ['Nya~ ♪', 'Hehe!', 'Purr~ ★', 'More pats!', 'So warm~'],
      fever: ['FEVER!! ★', 'MEGA PURR!!', 'MAX HAPPY!'],
      jump: ['Hup!', 'Boing~!', 'Up up!'],
      dash: ['ZOOM!', 'Catch me!', 'NYA-SHU!'],
      grab: ['Waah?!', 'H-hey!!', 'Put me down!'],
      toss: ['WEEE!!', 'Whoa—!', 'Cat-apult!'],
      sleep: ['Zzz...', 'Nap time~', 'Munya...'],
      wake: ['Nya?! Awake!', 'Oh! Hi~', 'Good morning!'],
      float: ['Free roam!', 'Desk mode! ★'],
      dock: ['Home sweet box!', 'Back on stage!'],
    },
    mecha: {
      pat: ['BEEP-PURR ♪', 'MORALE +10!', 'HEADPAT OK ★', 'SYSTEM WARM!'],
      fever: ['OVERCLOCK!! ★', 'MAX OUTPUT!', 'HYPER NYA!!'],
      jump: ['THRUST UP!', 'HOP.EXE!', 'LAUNCH!'],
      dash: ['TURBO!!', 'MACH-NYA!', 'BOOST ON!'],
      grab: ['ALERT!!', 'GRIP DETECTED!', 'WAIT—!'],
      toss: ['AIRBORNE!!', 'TRAJECTORY?!', 'WHOA.EXE!'],
      sleep: ['STANDBY...', 'LOW POWER...', 'Zzz.bin'],
      wake: ['ONLINE!!', 'BOOT READY ★', 'PING!'],
      float: ['DESKTOP DEPLOY!', 'ROAMING MODE ★'],
      dock: ['DOCKING OK!', 'BAY SECURED!'],
    },
  };

  class SakugaPet extends fx.Base {
    static delegates = true;
    static observedAttributes = [
      'name', 'character', 'floating', 'mood', 'autonomy', 'show-controls', 'label',
    ];

    static css = `
      :host {
        display: inline-block;
        position: relative;
        width: min(var(--sk-pet-width, 320px), 100%);
        max-width: 100%;
        vertical-align: middle;
        user-select: none;
        -webkit-user-select: none;
      }
      :host([floating]) {
        isolation: auto;
        z-index: 2147482500;
      }

      .shell {
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }

      /* ── Stage Mode playground frame ── */
      .stage-wrap {
        position: relative;
        width: 100%;
        height: var(--sk-pet-height, 210px);
      }
      .stage-bg {
        position: absolute;
        inset: 0;
        border: var(--sk-bw) solid var(--sk-ink);
        border-radius: var(--sk-r);
        background: var(--sk-card);
        box-shadow: var(--sk-sh);
        overflow: hidden;
        pointer-events: none;
        z-index: 0;
      }

      .nametag {
        position: absolute;
        left: 12px;
        top: 10px;
        z-index: 3;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 9px 2px 7px;
        border: 2.2px solid var(--sk-ink);
        border-radius: 8px;
        background: var(--sk-card);
        box-shadow: 2.5px 3px 0 var(--sk-soft);
        transform: skewX(-8deg);
        pointer-events: none;
      }
      .nametag-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--sk-pri);
        border: 1.6px solid var(--sk-ink);
        flex: none;
      }
      .nametag-dot.is-happy { background: var(--sk-acc); }
      .nametag-dot.is-dash { background: #ff9b54; }
      .nametag-dot.is-sleep { background: var(--sk-soft); }
      .nametag-dot.is-surprised { background: var(--sk-acc); }
      .nametag-txt {
        font: italic 900 11.5px/1.15 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--sk-ink);
      }

      .combo-tag {
        position: absolute;
        right: 12px;
        top: 10px;
        z-index: 3;
        padding: 2px 8px;
        border: 2.2px solid var(--sk-ink);
        border-radius: 8px;
        background: var(--sk-acc);
        color: #fff;
        box-shadow: 2.5px 3px 0 var(--sk-ink);
        transform: skewX(-10deg) scale(0);
        transform-origin: center;
        font: italic 900 11px/1.15 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        letter-spacing: 0.03em;
        pointer-events: none;
        will-change: transform;
      }

      /* ── Playfield Layer (switches cleanly to fixed viewport in floating mode) ── */
      .playfield {
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
      }
      .stage-click {
        position: absolute;
        inset: 0;
        pointer-events: auto;
        cursor: default;
      }

      canvas.pet-cv {
        position: absolute;
        left: -20px;
        top: -54px;
        width: calc(100% + 40px);
        height: calc(100% + 68px);
        display: block;
        pointer-events: none;
        z-index: 2;
      }

      canvas.back {
        position: absolute;
        left: -160px;
        top: -160px;
        width: calc(100% + 320px);
        height: calc(100% + 320px);
        pointer-events: none;
        z-index: 1;
      }

      /* ── Accessible interactive mascot hitbox ── */
      .pet-hit {
        position: absolute;
        left: 0;
        top: 0;
        width: 76px;
        height: 78px;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        cursor: grab;
        pointer-events: auto;
        touch-action: none;
        z-index: 4;
        will-change: transform;
      }
      .pet-hit.grabbing {
        cursor: grabbing;
      }
      .pet-hit:focus-visible {
        outline: 2.5px solid var(--sk-acc);
        outline-offset: 4px;
      }

      /* ── Authentic Manga Speech Bubble ── */
      .bubble {
        position: absolute;
        left: 0;
        top: 0;
        z-index: 5;
        max-width: 196px;
        padding: 6px 12px 7px;
        border: 2.8px solid var(--sk-ink);
        border-radius: 13px;
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: 4px 4px 0 var(--sk-soft);
        font: italic 900 13px/1.2 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        letter-spacing: -0.01em;
        white-space: nowrap;
        text-align: center;
        pointer-events: none;
        transform-origin: var(--tail-x, 50%) 115%;
        transform: translate(-9999px, -9999px) scale(0);
        will-change: transform;
      }
      .bubble::after {
        content: "";
        position: absolute;
        left: var(--tail-x, 50%);
        top: 100%;
        margin-left: -7px;
        border: 7px solid transparent;
        border-top: 10px solid var(--sk-ink);
      }
      .bubble::before {
        content: "";
        position: absolute;
        left: var(--tail-x, 50%);
        top: calc(100% - 3.6px);
        margin-left: -4.5px;
        border: 4.5px solid transparent;
        border-top: 7px solid var(--sk-card);
        z-index: 1;
      }

      /* ── Compact Manga Action Pill Bar ── */
      .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 6px;
        width: 100%;
      }
      .controls.hidden {
        display: none;
      }
      .pill {
        appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 5px 10px;
        border: 2.4px solid var(--sk-ink);
        border-radius: 10px;
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: 2.5px 3px 0 var(--sk-soft);
        font: 800 12px/1.15 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
        cursor: pointer;
        touch-action: manipulation;
        transition: transform 0.08s ease;
      }
      .pill:hover { transform: translateY(-1px); }
      .pill:active { transform: translate(1.5px, 2px); box-shadow: 1px 1px 0 var(--sk-soft); }
      .pill.pri {
        background: var(--sk-pri);
        color: var(--sk-on-pri);
        box-shadow: 2.5px 3px 0 var(--sk-ink);
      }
      .pill.acc {
        background: var(--sk-acc);
        color: #fff;
        box-shadow: 2.5px 3px 0 var(--sk-ink);
      }
      .pill.is-on {
        background: var(--sk-ink);
        color: var(--sk-card);
        box-shadow: 2.5px 3px 0 var(--sk-acc);
      }

      /* ── Floating Desktop Mode overrides ── */
      .dock-placeholder {
        display: none;
      }
      .float-dock {
        display: none;
      }

      :host([floating]) .stage-bg,
      :host([floating]) .nametag,
      :host([floating]) .combo-tag,
      :host([floating]) .stage-click,
      :host([floating]) .controls {
        display: none;
      }
      :host([floating]) .stage-wrap {
        height: auto;
      }
      :host([floating]) .dock-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        width: 100%;
        min-height: 118px;
        padding: 18px 16px;
        border: 2.6px dashed var(--sk-ink);
        border-radius: var(--sk-r);
        background: var(--sk-card);
        box-shadow: var(--sk-sh);
        text-align: center;
      }
      .dock-note {
        font: italic 800 14px/1.25 "Avenir Next", "Nunito", -apple-system, "Segoe UI", sans-serif;
        color: var(--sk-ink);
      }
      .dock-sub {
        font-size: 12px;
        font-weight: 600;
        color: var(--sk-dim);
      }

      :host([floating]) .playfield {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147482500;
        pointer-events: none;
      }
      :host([floating]) canvas.pet-cv {
        position: fixed;
        left: 0;
        top: 0;
        width: 100vw;
        height: 100vh;
      }
      :host([floating]) canvas.back {
        position: fixed;
        left: 0;
        top: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147482490;
      }
      :host([floating]) .float-dock {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147482510;
        pointer-events: auto;
      }
    `;

    // ─── Attribute & property accessors ───
    get name() { return (this.getAttribute('name') || '').trim() || 'Koma'; }
    set name(v) {
      if (!v) this.removeAttribute('name');
      else this.setAttribute('name', String(v));
    }

    get character() {
      const c = (this.getAttribute('character') || 'neko').toLowerCase();
      return CHARS.has(c) ? c : 'neko';
    }
    set character(v) {
      const c = String(v || 'neko').toLowerCase();
      this.setAttribute('character', CHARS.has(c) ? c : 'neko');
    }

    get floating() { return this.hasAttribute('floating'); }
    set floating(v) { this.toggleAttribute('floating', !!v); }

    get mood() { return this._mood || 'idle'; }
    set mood(v) {
      const m = String(v || 'idle').toLowerCase();
      if (MOODS.has(m)) this._setMood(m, true);
    }

    get autonomy() {
      const v = this.getAttribute('autonomy');
      return v === null ? true : v !== 'false' && v !== '0';
    }
    set autonomy(v) {
      if (v) this.removeAttribute('autonomy');
      else this.setAttribute('autonomy', 'false');
    }

    get showControls() {
      const v = this.getAttribute('show-controls');
      return v === null ? true : v !== 'false' && v !== '0';
    }
    set showControls(v) {
      if (v) this.removeAttribute('show-controls');
      else this.setAttribute('show-controls', 'false');
    }

    get label() {
      return this.getAttribute('label') || `${this.name} desktop pet`;
    }
    set label(v) {
      if (!v) this.removeAttribute('label');
      else this.setAttribute('label', String(v));
    }

    // ─── Render ───
    render() {
      const nm = esc(this.name);
      return `<div class="shell" part="shell">`
        + `<div class="stage-wrap" part="stage">`
        + `<div class="stage-bg" aria-hidden="true"></div>`
        + `<div class="nametag" part="nametag" aria-hidden="true"><span class="nametag-dot"></span><span class="nametag-txt">${nm}</span></div>`
        + `<div class="combo-tag" aria-hidden="true"></div>`
        + `<div class="dock-placeholder" part="placeholder">`
        + `<div class="dock-note">${nm} is roaming your screen!</div>`
        + `<div class="dock-sub">Drag, toss, or pat along the viewport floor.</div>`
        + `<button type="button" class="pill pri act-dock">Call Back to Stage</button>`
        + `</div>`
        + `<div class="playfield">`
        + `<div class="stage-click" aria-hidden="true"></div>`
        + `<canvas class="pet-cv" part="canvas" aria-hidden="true"></canvas>`
        + `<button type="button" class="pet-hit" part="pet" tabindex="0"></button>`
        + `<div class="bubble" part="bubble" role="status" aria-live="polite"></div>`
        + `<div class="float-dock">`
        + `<button type="button" class="pill acc act-float-pat">Pat</button>`
        + `<button type="button" class="pill pri act-float-dock">Dock ${nm}</button>`
        + `</div>`
        + `</div>`
        + `</div>`
        + `<div class="controls" part="controls">`
        + `<button type="button" class="pill act-pat">Pat</button>`
        + `<button type="button" class="pill act-jump">Jump</button>`
        + `<button type="button" class="pill act-dash">Dash</button>`
        + `<button type="button" class="pill act-sleep">Sleep</button>`
        + `<button type="button" class="pill pri act-float">Float on Screen</button>`
        + `</div>`
        + `</div>`;
    }

    setup() {
      this.elStage = this.$('.stage-wrap');
      this.elPlay = this.$('.playfield');
      this.elStageClick = this.$('.stage-click');
      this.cv = this.$('canvas.pet-cv');
      this.ctx = this.cv.getContext('2d');
      this.elHit = this.$('.pet-hit');
      this.elBubble = this.$('.bubble');
      this.elNameTxt = this.$('.nametag-txt');
      this.elMoodDot = this.$('.nametag-dot');
      this.elComboTag = this.$('.combo-tag');
      this.elControls = this.$('.controls');
      this.elSleepBtn = this.$('.act-sleep');
      this.elDockNote = this.$('.dock-note');
      this.elFloatDockBtn = this.$('.act-float-dock');

      // Back layer placed inside stage-wrap so bursts sit cleanly behind mascot & over card background
      this.back = this.backLayer();
      this.elStage.insertBefore(this.back.c, this.elPlay);

      this._inited = true;
      this._t = 0;
      this._palAt = -1;
      this._pal = null;
      this._dpr = 1;
      this._bleedX = 20;
      this._bleedTop = 54;
      this._bleedBot = 14;
      this._W = 320;
      this._H = 210;
      this._groundY = 186;

      // Character physics state
      this.x = 160;
      this.y = 186;
      this.vx = 0;
      this.vy = 0;
      this.facing = 1; // 1 = right, -1 = left
      this._grounded = true;
      this._mood = 'idle';
      this._moodUntil = 0;
      this._moodSeq = 0;
      this._actionSeq = 0;

      // Expressive springs
      this.sqY = new Spring(1, 460, 14);
      this.tiltS = new Spring(0, 310, 13);
      this.earLS = new Spring(0, 360, 11);
      this.earRS = new Spring(0, 360, 11);
      this.tailS = new Spring(0, 200, 8.5);
      this.bellS = new Spring(0, 290, 9.5);
      this.bubbleS = new Spring(0, 480, 15);
      this.comboS = new Spring(0, 460, 14);
      this.lookXS = new Spring(0, 150, 16);
      this.lookYS = new Spring(0, 150, 16);

      // Animation timers & sub-states
      this._dashSmear = 0;
      this._dashDir = 1;
      this._flipT = 0;
      this._flipActive = false;
      this._flipDir = 1;
      this._armsUpT = 0;
      this._panicEyesT = 0;
      this._walkPhase = 0;
      this._walkTarget = null;
      this._walkSpeed = 68;
      this._blinkAt = 3.2;
      this._blinkT = 0;
      this._idleTime = 0;
      this._nextAutoAt = 4.6;
      this._sleepZ = [];
      this._sleepZAcc = 0;

      // Pat combo tracking (on shared clock)
      this._combo = 0;
      this._comboUntil = 0;

      // Speech bubble state
      this._bubbleOpen = false;
      this._bubbleText = '';
      this._bubbleUntil = 0;
      this._quipIdx = 0;

      // Pointer tracking & drag state
      this._ptrX = null;
      this._ptrY = null;
      this._ptrDown = false;
      this._dragging = false;
      this._dragStartX = 0;
      this._dragStartY = 0;
      this._dragOffX = 0;
      this._dragOffY = 0;
      this._dragSamples = [];
      this._dragVx = 0;
      this._wasFloating = this.floating;

      // Trailing scarf ribbon chain (5 nodes in playfield space)
      this._scarf = [];
      this._initScarf();

      // Static manga pebbles on the stage floor
      this._pebbles = [
        { u: 0.11, s: 3.4, rot: -0.2 },
        { u: 0.88, s: 3.8, rot: 0.28 },
        { u: 0.83, s: 2.3, rot: -0.35 },
      ];

      this._readPalette();
      this._measurePlayfield(true);
      this._syncControlsVisibility();
      this._syncNameUI();

      // Respect initial mood attribute if provided
      const initMood = (this.getAttribute('mood') || '').toLowerCase();
      if (MOODS.has(initMood) && initMood !== 'idle') {
        this._setMood(initMood, false);
      }

      this._syncAria();
      this._bindEvents();
      this._syncHitboxAndBubble();
      this._draw();
    }

    connectedCallback() {
      super.connectedCallback();
      if (this._inited) {
        this._bindGlobalListeners();
        this._measurePlayfield(false);
        this._draw();
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this._unbindGlobalListeners();
    }

    attributeChangedCallback(name, oldV, newV) {
      if (!this._inited || oldV === newV) return;
      if (name === 'name') {
        this._syncNameUI();
        this._syncAria();
      } else if (name === 'label') {
        this._syncAria();
      } else if (name === 'character') {
        this._draw();
      } else if (name === 'show-controls') {
        this._syncControlsVisibility();
      } else if (name === 'mood') {
        const m = String(newV || 'idle').toLowerCase();
        if (MOODS.has(m) && m !== this._mood) this._setMood(m, false);
      } else if (name === 'floating') {
        this._handleFloatChange(this.floating);
      } else if (name === 'autonomy') {
        if (!this.autonomy) this._walkTarget = null;
      }
    }

    // ─── Public API ───
    pat() {
      const waking = this._mood === 'sleep';
      this._idleTime = 0;
      this._walkTarget = null;
      this._panicEyesT = 0;

      if (this._t <= this._comboUntil) this._combo += 1;
      else this._combo = 1;
      this._comboUntil = this._t + 1.85;

      this.emit('sakuga:pat', { combo: this._combo });

      if (this._combo >= 5 && this._combo % 5 === 0) {
        this._showComboBadge(this._combo);
        this.celebrate();
        return;
      }

      this._setMood('happy', true, 1.45);
      this._armsUpT = 0.65;
      if (this._combo >= 2) this._showComboBadge(this._combo);

      if (fx.calm) {
        this.say(waking ? this._pickQuip('wake') : this._pickQuip('pat'), 1600);
        this._draw();
        return;
      }

      // Keyframe squash-bounce + expressive ear wiggle + eager tail wag
      this.sqY.to = 1;
      this.sqY.x = 0.74;
      this.sqY.v += 2.6;
      this.tiltS.x = (this._combo % 2 ? 1 : -1) * 0.14;
      this.earLS.v -= 8;
      this.earRS.v += 8;
      this.tailS.v += this.facing * 14;
      this.bellS.v += 11;

      // VFX placed cleanly around mascot without covering speech bubble or ear tips
      const pos = this._petPagePos(0, -38);
      const side = this._openSide();
      ticks(pos.x + side * 30, pos.y - 26, {
        n: 3, r: 5, len: 13, dir: side > 0 ? -0.62 : -2.52, fan: 0.42, life: 0.36,
      });
      kira(pos.x - side * 32, pos.y - 26, { r: 10.5, life: 0.56 });
      later(65, () => {
        if (!this.isConnected) return;
        const p2 = this._petPagePos(side * 38, -18);
        kira(p2.x, p2.y, { r: 8, life: 0.46 });
      });
      sfx('pon', pos.x + side * 72, pos.y - 24, {
        size: 58, rot: side * 0.12, life: 0.62, ...hollow(),
      });

      this.say(waking ? this._pickQuip('wake') : this._pickQuip('pat'), 1550);
    }

    jump() {
      const seq = ++this._actionSeq;
      this._idleTime = 0;
      this._walkTarget = null;
      this._panicEyesT = 0;
      this._setMood('happy', true, 1.15);

      if (fx.calm) {
        this.say(this._pickQuip('jump'), 1400);
        this._draw();
        return;
      }

      // Beat 1: Anticipation crouch
      this.sqY.to = 0.72;
      this.earLS.to = -0.25;
      this.earRS.to = 0.25;

      // Beat 2: Spring launch upward
      later(85, () => {
        if (seq !== this._actionSeq || !this.isConnected || this._dragging) return;
        this.sqY.to = 1;
        this.sqY.x = 1.28;
        this.earLS.to = 0;
        this.earRS.to = 0;
        this.vy = -515;
        if (Math.abs(this.vx) < 20) this.vx = this.facing * rnd(24, 58);
        this._grounded = false;
        this._armsUpT = 0.55;

        const foot = this._petPagePos(0, -4);
        const side = this._openSide();
        puff(foot.x - 10, foot.y, { size: 7.5, n: 4, vx: -36, vy: -12, life: 0.52 });
        puff(foot.x + 10, foot.y, { size: 7.5, n: 4, vx: 36, vy: -12, life: 0.52 });
        lines(foot.x, foot.y - 10, { n: 5, dir: Math.PI / 2, len: 30, spread: 18, life: 0.24 });
        sfx('pon', foot.x + side * 54, foot.y - 46, {
          size: 62, rot: side * 0.1, life: 0.6, ...hollow(),
        });
      });

      this.say(this._pickQuip('jump'), 1300);
    }

    dash(dir) {
      const seq = ++this._actionSeq;
      this._idleTime = 0;
      this._walkTarget = null;
      this._panicEyesT = 0;

      let d = dir === undefined || dir === null
        ? (this.x > this._W * 0.54 ? -1 : 1)
        : (Number(dir) < 0 ? -1 : 1);
      this.facing = d;
      this._dashDir = d;
      this._setMood('dash', true, 0.95);

      if (fx.calm) {
        const minX = 42, maxX = Math.max(minX, this._W - 42);
        this.x = clamp(this.x + d * 88, minX, maxX);
        this._resetScarfAroundPet();
        this.say(this._pickQuip('dash'), 1300);
        this._syncHitboxAndBubble();
        this._draw();
        return;
      }

      // Beat 1: Anticipation crouch & lean forward (115ms)
      this.sqY.to = 0.72;
      this.tiltS.to = d * 0.24;
      this.earLS.to = -d * 0.52;
      this.earRS.to = -d * 0.52;
      this.vx = -d * 35;

      const rear = this._petPagePos(-d * 20, -10);
      ticks(rear.x, rear.y - 14, { n: 3, r: 4, len: 12, dir: d > 0 ? Math.PI - 0.35 : 0.35, fan: 0.4, life: 0.24 });
      puff(rear.x, rear.y + 4, { size: 7, n: 3, vx: -d * 40, vy: -12, life: 0.42 });

      // Beat 2: High-speed horizontal streak + smear + speed lines + シュッ
      later(115, () => {
        if (seq !== this._actionSeq || !this.isConnected || this._dragging) return;
        this.sqY.to = 1;
        this.sqY.x = 0.84;
        this._dashSmear = 0.48;
        this.vx = d * (this.floating ? 840 : 475);
        this.vy = -105;
        this._grounded = false;

        const p = this._petPagePos(-d * 18, -30);
        lines(p.x, p.y, { n: 8, dir: d > 0 ? Math.PI : 0, len: 68, spread: 24, life: 0.32 });
        puff(p.x, p.y + 22, { size: 9.5, n: 4, vx: -d * 65, vy: -14, life: 0.52 });
        sfx('shu', p.x - d * 34, p.y - 30, {
          size: 88, rot: -d * 0.1, life: 0.54, ...hollow(),
        });
      });

      // Trailing dust puff mid-dash
      later(185, () => {
        if (seq !== this._actionSeq || !this.isConnected || this._dragging) return;
        const p = this._petPagePos(-d * 16, -6);
        puff(p.x, p.y, { size: 7.5, n: 3, vx: -d * 50, vy: -10, life: 0.44 });
        lines(p.x, p.y - 22, { n: 4, dir: d > 0 ? Math.PI : 0, len: 50, spread: 18, life: 0.24 });
      });

      // Beat 3: Dramatic skid brake & settle (before hitting wall!)
      later(275, () => {
        if (seq !== this._actionSeq || !this.isConnected || this._dragging) return;
        this.vx *= 0.28;
        this.tiltS.to = -d * 0.22;
        this.earLS.to = 0;
        this.earRS.to = 0;
        const front = this._petPagePos(d * 24, -22);
        wob(front.x, front.y, { dir: d, r: 12, life: 0.38 });
        puff(front.x - d * 6, front.y + 16, { size: 7, n: 3, vx: d * 32, vy: -10, life: 0.42 });
        later(145, () => {
          if (seq === this._actionSeq) this.tiltS.to = 0;
        });
      });

      this.say(this._pickQuip('dash'), 1200);
    }

    sleep(on) {
      const next = on === undefined ? this._mood !== 'sleep' : !!on;
      this._idleTime = 0;
      this._walkTarget = null;
      this._actionSeq++;
      this._panicEyesT = 0;

      if (next) {
        this._setMood('sleep', true, 0);
        this.vx *= 0.2;
        this.sqY.to = 0.88;
        this.tiltS.to = 0;
        this.earLS.to = 0.36;
        this.earRS.to = -0.36;
        this._sleepZ = [];
        this._sleepZAcc = 0.2;
        this.say(this._pickQuip('sleep'), 1600);
      } else {
        this._setMood('idle', true, 0);
        this.sqY.to = 1;
        this.sqY.x = 1.15;
        this.earLS.to = 0;
        this.earRS.to = 0;
        this._sleepZ = [];
        if (!fx.calm) {
          const p = this._petPagePos(0, -56);
          ticks(p.x, p.y, { n: 3, r: 6, len: 11, dir: -Math.PI / 2, fan: 0.5, life: 0.34 });
        }
        this.say(this._pickQuip('wake'), 1400);
      }
      if (fx.calm) {
        this.sqY.x = this.sqY.to;
        this.earLS.x = this.earLS.to;
        this.earRS.x = this.earRS.to;
        this._draw();
      }
    }

    celebrate() {
      const seq = ++this._actionSeq;
      this._idleTime = 0;
      this._walkTarget = null;
      this._panicEyesT = 0;
      this._setMood('happy', true, 1.9);

      if (fx.calm) {
        this.say(this._pickQuip('fever'), 1900);
        this._draw();
        return;
      }

      // Hide current bubble cleanly during impact apex so ドン! owns the top frame with zero overlap
      this._hideBubble();

      // Beat 1: Anticipation deep coil
      this.sqY.to = 0.68;
      this.earLS.to = -0.35;
      this.earRS.to = 0.35;

      // Beat 2: Explosive backflip launch + back-layer burst + shards + kira + puffs + ドン!
      later(95, () => {
        if (seq !== this._actionSeq || !this.isConnected || this._dragging) return;
        this.sqY.to = 1;
        this.sqY.x = 1.32;
        this.earLS.to = 0;
        this.earRS.to = 0;
        this.vy = -515;
        this._grounded = false;
        this._flipActive = true;
        this._flipT = 0;
        this._flipDir = this.facing;
        this._armsUpT = 1.15;
        this.tailS.v += this.facing * 20;

        const c = this._petPagePos(0, -56);
        const ground = this._petPagePos(0, -8);
        burst(c.x, c.y, { r: 68, spikes: 15, life: 0.42, layer: this.back });
        shards(c.x, c.y, { n: 10, speed: 225, size: 6.0, life: 0.72, dir: -Math.PI / 2, arc: 4.8, grav: 360 });
        for (const [dx, dy, sz] of [[-32, -4, 9.5], [32, -4, 9.5], [0, 4, 8]]) {
          puff(ground.x + dx, ground.y + dy, { size: sz, n: 4, vx: dx * 1.3, vy: -14, life: rnd(0.52, 0.7) });
        }
        kira(c.x - 46, c.y - 26, { r: 12.5, life: 0.58 });
        later(60, () => {
          if (this.isConnected) kira(c.x + 48, c.y - 22, { r: 10.5, life: 0.52 });
        });
        ticks(c.x - 50, c.y + 4, { n: 2, r: 6, len: 14, dir: -2.6, fan: 0.4, life: 0.4 });
        ticks(c.x + 50, c.y + 4, { n: 2, r: 6, len: 14, dir: -0.5, fan: 0.4, life: 0.4 });

        // Bold ドン! positioned cleanly ABOVE the stage panel & jump apex (never covers Koma or landing bubble!)
        const stageRect = this.elPlay.getBoundingClientRect();
        const donY = this.floating ? c.y - 118 : Math.min(c.y - 122, stageRect.top + window.scrollY - 38);
        sfx('don', c.x + 6, donY, { size: 126, rot: -0.1, life: 0.56 });
      });

      // Beat 3: Celebratory speech bubble pops right as pet lands & ドン! exits
      later(590, () => {
        if (seq !== this._actionSeq || !this.isConnected) return;
        this.say(this._pickQuip('fever'), 1600);
      });
    }

    say(text, ms = 2200) {
      const clean = String(text ?? '').trim();
      if (!clean) {
        this._hideBubble();
        return;
      }
      this._bubbleText = clean;
      this.elBubble.textContent = clean;
      this._bubbleOpen = true;
      this._bubbleUntil = ms > 0 ? this._t + ms / 1000 : 0;
      this.bubbleS.to = 1;
      this.bubbleS.d = 15;
      if (fx.calm) {
        this.bubbleS.x = 1;
        this.bubbleS.v = 0;
      } else {
        this.bubbleS.x = Math.min(this.bubbleS.x, 0.25);
        this.bubbleS.v += 3.5;
      }
      this._syncHitboxAndBubble();
    }

    toggleFloat() {
      this.floating = !this.floating;
    }

    reset() {
      this._actionSeq++;
      this._dragging = false;
      this._ptrDown = false;
      this.elHit.classList.remove('grabbing');
      this._measurePlayfield(true);
      this.x = this._W * 0.5;
      this.y = this._groundY;
      this.vx = 0;
      this.vy = 0;
      this.facing = 1;
      this._grounded = true;
      this._flipActive = false;
      this._flipT = 0;
      this._dashSmear = 0;
      this._combo = 0;
      this._comboUntil = 0;
      this.comboS.to = 0;
      this.sqY.x = 1; this.sqY.to = 1; this.sqY.v = 0;
      this.tiltS.x = 0; this.tiltS.to = 0; this.tiltS.v = 0;
      this.earLS.x = 0; this.earLS.to = 0; this.earLS.v = 0;
      this.earRS.x = 0; this.earRS.to = 0; this.earRS.v = 0;
      this._walkTarget = null;
      this._idleTime = 0;
      this._nextAutoAt = this._t + 4.8;
      this._setMood('idle', true, 0);
      this._hideBubble();
      this._resetScarfAroundPet();
      this._syncHitboxAndBubble();
      this._draw();
    }

    // ─── Internal state helpers ───
    _pickQuip(kind) {
      const bank = QUIPS[this.character] || QUIPS.neko;
      const arr = bank[kind] || bank.pat;
      return arr[(this._quipIdx++) % arr.length];
    }

    _openSide() {
      return this.x > this._W * 0.56 ? -1 : 1;
    }

    _hideBubble() {
      this._bubbleOpen = false;
      this._bubbleUntil = 0;
      this.bubbleS.to = 0;
      this.bubbleS.d = 32;
      if (fx.calm) {
        this.bubbleS.x = 0;
        this.bubbleS.v = 0;
        this._syncHitboxAndBubble();
      }
    }

    _showComboBadge(n) {
      this.elComboTag.textContent = `${n}x COMBO!`;
      this.comboS.to = 1;
      if (fx.calm) {
        this.comboS.x = 1;
      } else {
        this.comboS.x = Math.max(0.5, this.comboS.x);
        this.comboS.v += 5;
      }
    }

    _setMood(next, emitEvt, durationSec = 0) {
      if (!MOODS.has(next)) return;
      const changed = next !== this._mood;
      this._mood = next;
      this._moodUntil = durationSec > 0 ? this._t + durationSec : 0;

      if (next !== 'sleep') {
        this._sleepZ = [];
        if (this.sqY.to < 0.95 && !this._dragging) this.sqY.to = 1;
        this.earLS.to = 0;
        this.earRS.to = 0;
      }

      if (this.elMoodDot) {
        this.elMoodDot.className = `nametag-dot is-${next}`;
      }
      if (this.elSleepBtn) {
        this.elSleepBtn.classList.toggle('is-on', next === 'sleep');
        this.elSleepBtn.textContent = next === 'sleep' ? 'Wake' : 'Sleep';
      }
      this._syncAria();
      if (changed && emitEvt) this.emit('sakuga:mood', { mood: next });
    }

    _syncNameUI() {
      const nm = this.name;
      if (this.elNameTxt) this.elNameTxt.textContent = nm;
      if (this.elDockNote) this.elDockNote.textContent = `${nm} is roaming your screen!`;
      if (this.elFloatDockBtn) this.elFloatDockBtn.textContent = `Dock ${nm}`;
    }

    _syncControlsVisibility() {
      if (this.elControls) {
        this.elControls.classList.toggle('hidden', !this.showControls);
      }
    }

    _syncAria() {
      if (!this.elHit) return;
      const mode = this.floating ? 'floating on screen' : 'in stage';
      this.elHit.setAttribute(
        'aria-label',
        `${this.label}, mood ${this._mood}, ${mode}. Press Enter to pat, arrows to dash or jump, S to sleep, F to toggle float.`,
      );
    }

    _handleFloatChange(isFloat) {
      if (isFloat === this._wasFloating) return;
      this._wasFloating = isFloat;

      // Preserve exact screen position from last recorded stage rect before fixed switch
      const prevRect = this._lastStageRect || this.elStage.getBoundingClientRect();
      const prevScreenX = prevRect.left + this.x;
      const prevScreenY = prevRect.top + this.y;

      this._measurePlayfield(false);

      if (isFloat) {
        this.x = clamp(prevScreenX, 56, Math.max(56, this._W - 56));
        this.y = clamp(prevScreenY, 80, this._groundY);
        this.vy = -210;
        this._grounded = false;
        this._setMood('happy', true, 1.3);
        this.say(this._pickQuip('float'), 1800);
      } else {
        this.x = this._W * 0.5;
        this.y = this._groundY;
        this.vx = 0;
        this.vy = -180;
        this._grounded = false;
        this._setMood('happy', true, 1.1);
        this.say(this._pickQuip('dock'), 1600);
      }
      this._resetScarfAroundPet();
      this._syncAria();
      this._syncHitboxAndBubble();
      this._draw();

      if (!fx.calm) {
        const p = this._petPagePos(0, -10);
        puff(p.x - 24, p.y, { size: 9, n: 4, vx: -42, vy: -14, life: 0.5 });
        puff(p.x + 24, p.y, { size: 9, n: 4, vx: 42, vy: -14, life: 0.5 });
        kira(p.x + 30, p.y - 44, { r: 10, life: 0.5 });
      }
      this.emit('sakuga:float', { floating: isFloat });
    }

    // ─── Sizing & Dynamic Palette ───
    _measurePlayfield(centerPet) {
      const isFloat = this.floating;
      let w, h;
      if (isFloat) {
        w = window.innerWidth || 900;
        h = window.innerHeight || 700;
      } else {
        const r = this.elStage.getBoundingClientRect();
        this._lastStageRect = { left: r.left, top: r.top, width: r.width, height: r.height };
        w = Math.max(180, Math.round(r.width) || 320);
        h = Math.max(140, Math.round(r.height) || 210);
      }
      this._W = w;
      this._H = h;
      this._groundY = isFloat ? h - 14 : h - 22;

      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const bx = isFloat ? 0 : this._bleedX;
      const bt = isFloat ? 0 : this._bleedTop;
      const bb = isFloat ? 0 : this._bleedBot;
      const cw = w + bx * 2;
      const ch = h + bt + bb;
      const pw = Math.round(cw * dpr);
      const ph = Math.round(ch * dpr);
      if (this.cv.width !== pw || this.cv.height !== ph) {
        this.cv.width = pw;
        this.cv.height = ph;
      }
      this._dpr = dpr;
      this._cvW = cw;
      this._cvH = ch;
      this._offX = bx;
      this._offY = bt;

      const minX = 42, maxX = Math.max(minX, w - 42);
      if (centerPet) {
        this.x = w * 0.5;
        this.y = this._groundY;
        this._resetScarfAroundPet();
      } else {
        this.x = clamp(this.x, minX, maxX);
        if (this._grounded || this.y > this._groundY) {
          this.y = this._groundY;
          this._grounded = true;
        }
      }
    }

    _readPalette() {
      const cs = getComputedStyle(this);
      const v = (name, fb) => (cs.getPropertyValue(name) || '').trim() || fb;
      this._pal = {
        ink: v('--sk-ink', fx.P.ink),
        card: v('--sk-card', fx.P.fill),
        soft: v('--sk-soft', fx.P.shade),
        pri: v('--sk-pri', '#8f8df7'),
        acc: v('--sk-acc', fx.P.accent),
        dim: v('--sk-dim', '#8580b0'),
        track: v('--sk-track', '#c9cbe0'),
      };
      this._palAt = this._t;
    }

    _petPagePos(dx = 0, dy = 0) {
      const r = this.elPlay.getBoundingClientRect();
      return {
        x: r.left + window.scrollX + this.x + dx,
        y: r.top + window.scrollY + this.y + dy,
      };
    }

    // ─── Scarf Ribbon Physics ───
    _initScarf() {
      this._scarf = Array.from({ length: 5 }, (_, i) => ({
        x: this.x - this.facing * (10 + i * 7.6),
        y: this.y - 21 - i * 0.4 + Math.sin(i * 0.7) * 1.4,
        vx: 0,
        vy: 0,
      }));
    }

    _resetScarfAroundPet() {
      for (let i = 0; i < this._scarf.length; i++) {
        this._scarf[i].x = this.x - this.facing * (10 + i * 7.6);
        this._scarf[i].y = this.y - 21 - i * 0.4 + Math.sin(i * 0.7) * 1.4;
        this._scarf[i].vx = 0;
        this._scarf[i].vy = 0;
      }
    }

    _stepScarf(dt) {
      const nodes = this._scarf;
      if (!nodes.length) return;
      const sy = clamp(this.sqY.x, 0.62, 1.44);
      const anchorX = this.x - this.facing * 10;
      const anchorY = this.y - 21 * sy;
      nodes[0].x = anchorX;
      nodes[0].y = anchorY;
      nodes[0].vx = 0;
      nodes[0].vy = 0;

      if (fx.calm) {
        for (let i = 1; i < nodes.length; i++) {
          nodes[i].x = anchorX - this.facing * i * 7.2;
          nodes[i].y = anchorY + i * 1.8;
        }
        return;
      }

      const segLen = 7.6;
      const breeze = -this.facing * 52 + Math.sin(this._t * 3.8) * 18;
      const dragDamp = Math.exp(-8.8 * dt);
      for (let i = 1; i < nodes.length; i++) {
        const n = nodes[i];
        n.vx = (n.vx + breeze * dt) * dragDamp;
        n.vy = (n.vy + (55 - i * 8) * dt) * dragDamp;
        n.x += n.vx * dt;
        n.y += n.vy * dt;
      }
      // Distance constraint relaxation (3 iterations for crisp non-stretchy ribbon)
      for (let iter = 0; iter < 3; iter++) {
        for (let i = 1; i < nodes.length; i++) {
          const prev = nodes[i - 1], cur = nodes[i];
          let dx = cur.x - prev.x;
          let dy = cur.y - prev.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const diff = (dist - segLen) / dist;
          cur.x -= dx * diff;
          cur.y -= dy * diff;
        }
      }
    }

    // ─── Event Binding ───
    _bindEvents() {
      // Compact stage control pills
      this.$('.act-pat').addEventListener('click', () => this.pat());
      this.$('.act-jump').addEventListener('click', () => this.jump());
      this.$('.act-dash').addEventListener('click', () => this.dash());
      this.$('.act-sleep').addEventListener('click', () => this.sleep());
      this.$('.act-float').addEventListener('click', () => this.toggleFloat());
      this.$('.act-dock').addEventListener('click', () => { this.floating = false; });
      this.$('.act-float-dock').addEventListener('click', () => { this.floating = false; });
      this.$('.act-float-pat').addEventListener('click', () => this.pat());

      // Clicking empty floor in stage mode calls the pet curiously over
      this.elStageClick.addEventListener('pointerdown', (e) => {
        if (this.floating || this._dragging || e.button !== 0) return;
        const r = this.elPlay.getBoundingClientRect();
        const tx = clamp(e.clientX - r.left, 44, Math.max(44, this._W - 44));
        if (Math.abs(tx - this.x) < 34) return;
        this._idleTime = 0;
        if (this._mood === 'sleep') this._setMood('idle', true, 0);
        this._walkTarget = tx;
        this._walkSpeed = 105;
        this.facing = tx >= this.x ? 1 : -1;
        if (!fx.calm) {
          this.earLS.v -= 5;
          this.earRS.v += 5;
          const p = this._petPagePos(this.facing * 20, -56);
          ticks(p.x, p.y, { n: 2, r: 4, len: 9, dir: this.facing > 0 ? -0.6 : -2.5, fan: 0.35, life: 0.25 });
        }
      });

      // Pointer drag / pat on the mascot hitbox
      const hit = this.elHit;
      hit.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        hit.focus({ preventScroll: true });
        this._ptrDown = true;
        this._dragging = false;
        this._dragStartX = e.clientX;
        this._dragStartY = e.clientY;
        const r = this.elPlay.getBoundingClientRect();
        this._dragOffX = (e.clientX - r.left) - this.x;
        this._dragOffY = (e.clientY - r.top) - this.y;
        this._dragSamples = [{ x: e.clientX, y: e.clientY, t: this._t }];
        this._dragVx = 0;
        this._idleTime = 0;
        this._walkTarget = null;
        try { hit.setPointerCapture(e.pointerId); } catch {}
        if (!fx.calm) {
          this.sqY.to = 0.84;
        }
      });

      hit.addEventListener('pointermove', (e) => {
        if (!this._ptrDown) return;
        const dist = Math.hypot(e.clientX - this._dragStartX, e.clientY - this._dragStartY);
        if (!this._dragging && dist > 6) {
          this._dragging = true;
          this._actionSeq++;
          this._flipActive = false;
          this._grounded = false;
          hit.classList.add('grabbing');
          this._setMood('surprised', true, 0);
          this.sqY.to = 1.15;
          this.say(this._pickQuip('grab'), 1500);
          if (!fx.calm) {
            const p = this._petPagePos(0, -58);
            ticks(p.x, p.y, { n: 3, r: 6, len: 13, dir: -Math.PI / 2, fan: 0.55, life: 0.36 });
          }
        }
        if (this._dragging) {
          const r = this.elPlay.getBoundingClientRect();
          const minX = 36, maxX = Math.max(minX, this._W - 36);
          const minY = this.floating ? 74 : 44;
          const prevX = this.x;
          this.x = clamp((e.clientX - r.left) - this._dragOffX, minX, maxX);
          this.y = clamp((e.clientY - r.top) - this._dragOffY, minY, this._groundY);
          const dx = this.x - prevX;
          this._dragVx = lerp(this._dragVx, dx * 60, 0.35);
          if (Math.abs(dx) > 1.5) this.facing = dx > 0 ? 1 : -1;
          this.tiltS.to = clamp(-this._dragVx * 0.0008, -0.45, 0.45);
          this._dragSamples.push({ x: e.clientX, y: e.clientY, t: this._t });
          if (this._dragSamples.length > 6) this._dragSamples.shift();
          this._syncHitboxAndBubble();
        }
      });

      const finishPointer = (e) => {
        if (!this._ptrDown) return;
        this._ptrDown = false;
        try { hit.releasePointerCapture(e.pointerId); } catch {}
        hit.classList.remove('grabbing');

        if (!this._dragging) {
          this.sqY.to = 1;
          this.pat();
          return;
        }

        this._dragging = false;
        this.sqY.to = 1;
        this.tiltS.to = 0;

        // Compute release throw velocity from recent samples
        let vx = 0, vy = 0;
        if (this._dragSamples.length >= 2) {
          const a = this._dragSamples[0];
          const b = this._dragSamples[this._dragSamples.length - 1];
          const dtS = Math.max(0.016, b.t - a.t);
          vx = clamp((b.x - a.x) / dtS, -950, 950);
          vy = clamp((b.y - a.y) / dtS, -850, 650);
        }
        this.vx = vx;
        this.vy = vy;
        this._grounded = this.y >= this._groundY - 1 && vy >= 0;
        const speed = Math.hypot(vx, vy);

        if (speed > 210) {
          this._panicEyesT = 0.7;
          this._setMood('surprised', true, 0.9);
          this.emit('sakuga:toss', { speed: Math.round(speed) });
          this.say(this._pickQuip('toss'), 1350);
          if (!fx.calm) {
            const p = this._petPagePos(0, -34);
            const ang = Math.atan2(vy, vx) + Math.PI;
            lines(p.x, p.y, { n: 6, dir: ang, len: 52, spread: 20, life: 0.28 });
          }
        } else {
          this._setMood('idle', true, 0);
        }
      };

      hit.addEventListener('pointerup', finishPointer);
      hit.addEventListener('pointercancel', finishPointer);

      // Keyboard navigation & actions
      hit.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.pat();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.dash(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.dash(1);
        } else if (e.key === 'ArrowUp' || e.key === 'j' || e.key === 'J') {
          e.preventDefault();
          this.jump();
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          this.sleep();
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          this.toggleFloat();
        }
      });

      this._bindGlobalListeners();
    }

    _bindGlobalListeners() {
      if (this._globBound) return;
      this._globBound = true;
      this._onPointerMoveWin = (e) => {
        this._ptrX = e.clientX;
        this._ptrY = e.clientY;
      };
      this._onResizeWin = () => {
        this._measurePlayfield(false);
        this._syncHitboxAndBubble();
        this._draw();
      };
      window.addEventListener('pointermove', this._onPointerMoveWin, { passive: true });
      window.addEventListener('resize', this._onResizeWin, { passive: true });
    }

    _unbindGlobalListeners() {
      if (!this._globBound) return;
      this._globBound = false;
      window.removeEventListener('pointermove', this._onPointerMoveWin);
      window.removeEventListener('resize', this._onResizeWin);
    }

    // ─── Frame Loop (Stepped on SakugaFX Shared Clock) ───
    frame(dt) {
      if (!this._inited) return;
      this._t += dt;
      if (this._t - this._palAt > 0.6) this._readPalette();

      // Re-measure if responsive stage width changed (e.g. mobile 390px) & cache stage rect for seamless float transition
      if (!this.floating) {
        const sr = this.elStage.getBoundingClientRect();
        this._lastStageRect = { left: sr.left, top: sr.top, width: sr.width, height: sr.height };
        if (sr.width > 40 && Math.abs(Math.round(sr.width) - this._W) > 2) {
          this._measurePlayfield(false);
        }
      } else {
        const wantW = window.innerWidth || 900;
        if (wantW > 40 && Math.abs(wantW - this._W) > 2) {
          this._measurePlayfield(false);
        }
      }

      // Auto-expire temporary mood, combo badge, and speech bubble
      if (this._moodUntil > 0 && this._t >= this._moodUntil && !this._dragging) {
        this._setMood('idle', true, 0);
      }
      if (this._combo > 0 && this._t > this._comboUntil) {
        this._combo = 0;
        this.comboS.to = 0;
      }
      if (this._bubbleOpen && this._bubbleUntil > 0 && this._t >= this._bubbleUntil) {
        this._hideBubble();
      }

      if (fx.calm) {
        this._stepScarf(dt);
        this._syncHitboxAndBubble();
        this._draw();
        return;
      }

      // Decay sub-timers
      this._dashSmear = Math.max(0, this._dashSmear - dt * 1.45);
      this._armsUpT = Math.max(0, this._armsUpT - dt);
      this._panicEyesT = Math.max(0, this._panicEyesT - dt);

      // Backflip spin progression
      if (this._flipActive) {
        this._flipT += dt / 0.56;
        if (this._flipT >= 1) {
          this._flipT = 0;
          this._flipActive = false;
        }
      }

      // Natural eye blink
      if (this._blinkT > 0) {
        this._blinkT = Math.max(0, this._blinkT - dt);
      } else if (this._t >= this._blinkAt) {
        this._blinkT = 0.13;
        this._blinkAt = this._t + rnd(2.8, 5.4);
      }

      // Sleep floating Z glyphs (drifting cleanly up-right clear of bubble tail)
      if (this._mood === 'sleep') {
        this._sleepZAcc -= dt;
        if (this._sleepZAcc <= 0) {
          this._sleepZAcc = 0.85;
          this._sleepZ.push({ t: 0, life: 1.65, ox: rnd(22, 30) * this.facing, sz: rnd(11, 14.5) });
        }
        for (const z of this._sleepZ) z.t += dt;
        this._sleepZ = this._sleepZ.filter((z) => z.t < z.life);
      }

      // Autonomous living behavior (quiet, gentle, never spammy)
      if (!this._dragging && this._grounded && this.autonomy) {
        this._idleTime += dt;
        if (this._mood === 'idle' && this._walkTarget === null && this._t >= this._nextAutoAt) {
          if (this._idleTime > 24) {
            this.sleep(true);
            this._nextAutoAt = this._t + 10;
          } else {
            const roll = rnd();
            if (roll < 0.62) {
              const minX = 48, maxX = Math.max(minX, this._W - 48);
              const span = Math.min(180, (maxX - minX) * 0.45);
              let tx = clamp(this.x + (rnd() < 0.5 ? -1 : 1) * rnd(36, Math.max(42, span)), minX, maxX);
              if (Math.abs(tx - this.x) < 28) tx = this.x > this._W * 0.5 ? minX + 20 : maxX - 20;
              this._walkTarget = tx;
              this._walkSpeed = 62;
              this.facing = tx >= this.x ? 1 : -1;
            } else {
              // Playful ear twitch & glance
              this.earLS.v -= 7;
              this.earRS.v += 5;
              this.tailS.v += this.facing * 8;
            }
            this._nextAutoAt = this._t + rnd(4.2, 6.8);
          }
        }
      }

      // Physics integration (when not actively held by pointer)
      if (!this._dragging) {
        const minX = 40;
        const maxX = Math.max(minX, this._W - 40);
        const minY = this.floating ? 74 : 20;

        // Gentle autonomous walking
        if (this._grounded && this._walkTarget !== null && this._mood === 'idle') {
          const dx = this._walkTarget - this.x;
          if (Math.abs(dx) < 5) {
            this._walkTarget = null;
            this.vx *= 0.2;
          } else {
            const dir = Math.sign(dx);
            this.facing = dir;
            this.vx = lerp(this.vx, dir * this._walkSpeed, Math.min(1, dt * 10));
            this._walkPhase += dt * 11;
          }
        } else {
          if (this._grounded) {
            const damp = this._mood === 'dash' ? 3.2 : 8.5;
            this.vx *= Math.exp(-damp * dt);
            if (Math.abs(this.vx) < 2) this.vx = 0;
          }
        }

        // Gravity
        if (!this._grounded) {
          this.vy += 1480 * dt;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Left / right wall bounce
        if (this.x < minX) {
          this.x = minX;
          if (Math.abs(this.vx) > 150) {
            this._onWallBounce(-1, Math.abs(this.vx));
            this.vx = Math.abs(this.vx) * 0.62;
            this.facing = 1;
          } else {
            this.vx = 0;
            this._walkTarget = null;
          }
        } else if (this.x > maxX) {
          this.x = maxX;
          if (Math.abs(this.vx) > 150) {
            this._onWallBounce(1, Math.abs(this.vx));
            this.vx = -Math.abs(this.vx) * 0.62;
            this.facing = -1;
          } else {
            this.vx = 0;
            this._walkTarget = null;
          }
        }

        // Ceiling soft bounce (keeps even hard throws cleanly inside canvas headroom!)
        const ceilY = this.floating ? 74 : 26;
        if (this.y < ceilY) {
          this.y = ceilY;
          if (this.vy < 0) this.vy = -this.vy * 0.38;
        }

        // Floor landing & elastic bounce
        if (this.y >= this._groundY) {
          const impactVy = this.vy;
          this.y = this._groundY;
          if (!this._grounded && impactVy > 130) {
            this._onFloorImpact(impactVy);
          }
          if (impactVy > 260) {
            this.vy = -impactVy * 0.44;
            this.vx *= 0.8;
            this._grounded = false;
          } else {
            this.vy = 0;
            this._grounded = true;
          }
        }
      }

      // Cursor tracking (eyes & subtle 2.5D head turn)
      let targetLookX = this.facing * 0.35;
      let targetLookY = 0;
      if (this._mood === 'sleep') {
        targetLookX = 0;
        targetLookY = 0.2;
      } else if (this._mood === 'dash') {
        targetLookX = this.facing * 1.0;
        targetLookY = -0.1;
      } else if (this._ptrX !== null && this._ptrY !== null) {
        const r = this.elPlay.getBoundingClientRect();
        const headScreenX = r.left + this.x;
        const headScreenY = r.top + this.y - 38;
        const dx = this._ptrX - headScreenX;
        const dy = this._ptrY - headScreenY;
        const d = Math.hypot(dx, dy) || 1;
        const reach = clamp(d / 110, 0, 1);
        targetLookX = (dx / d) * reach;
        targetLookY = (dy / d) * reach;
        // Gently turn facing toward cursor when resting idle
        if (this._grounded && this._walkTarget === null && Math.abs(this.vx) < 12 && Math.abs(dx) > 42 && this._mood === 'idle') {
          this.facing = dx >= 0 ? 1 : -1;
        }
      }
      this.lookXS.to = targetLookX;
      this.lookYS.to = targetLookY;
      this.lookXS.step(dt);
      this.lookYS.step(dt);

      // Tail target driven by mood & motion
      if (this._mood === 'sleep') {
        this.tailS.to = Math.sin(this._t * 1.6) * 0.08;
      } else if (this._mood === 'happy') {
        this.tailS.to = Math.sin(this._t * 15) * 0.44;
      } else if (this._mood === 'surprised' || this._dragging) {
        this.tailS.to = 0.62 + Math.sin(this._t * 22) * 0.14;
      } else if (this._mood === 'dash') {
        this.tailS.to = -0.45;
      } else {
        this.tailS.to = Math.sin(this._t * 3.1) * 0.24;
      }

      // Bell pendulum reacts to horizontal velocity
      this.bellS.to = clamp(-this.vx * 0.0008, -0.55, 0.55);

      // Step all springs
      this.sqY.step(dt);
      this.tiltS.step(dt);
      this.earLS.step(dt);
      this.earRS.step(dt);
      this.tailS.step(dt);
      this.bellS.step(dt);
      this.bubbleS.step(dt);
      this.comboS.step(dt);
      this._stepScarf(dt);

      this._syncHitboxAndBubble();
      this._draw();
    }

    _onWallBounce(side, speed) {
      this.sqY.x = 1.24;
      this.tiltS.x = -side * 0.25;
      this.earLS.v += side * 7;
      this.earRS.v += side * 7;
      if (fx.calm) return;
      const p = this._petPagePos(side * 22, -32);
      ticks(p.x, p.y, { n: 3, r: 5, len: 13, dir: side > 0 ? Math.PI : 0, fan: 0.5, life: 0.34 });
      wob(p.x - side * 8, p.y, { dir: -side, r: 12, life: 0.36 });
      if (speed > 280) {
        puff(p.x, p.y + 8, { size: 8.5, n: 4, vx: -side * 42, vy: -12, life: 0.48 });
      }
    }

    _onFloorImpact(impactVy) {
      const strength = clamp((impactVy - 130) / 480, 0.2, 1);
      this.sqY.x = lerp(0.84, 0.68, strength);
      this.sqY.v += 1.6 * strength;
      this.earLS.v += 6 * strength;
      this.earRS.v -= 6 * strength;
      this.bellS.v += 8 * strength;
      if (fx.calm) return;

      const foot = this._petPagePos(0, -3);
      puff(foot.x - 14, foot.y, { size: 5.5 + 4 * strength, n: 4, vx: -36 - 20 * strength, vy: -10, life: 0.48 });
      puff(foot.x + 14, foot.y, { size: 5.5 + 4 * strength, n: 4, vx: 36 + 20 * strength, vy: -10, life: 0.48 });
      wob(foot.x - 24, foot.y - 16, { dir: -1, r: 10, life: 0.34 });
      wob(foot.x + 24, foot.y - 16, { dir: 1, r: 10, life: 0.34 });

      if (Math.abs(this.vx) > 230) {
        const d = Math.sign(this.vx);
        sfx('zuza', foot.x - d * 44, foot.y - 46, {
          size: 86, rot: -d * 0.08, life: 0.64, ...dotted(),
        });
      } else if (strength > 0.65) {
        const side = this._openSide();
        sfx('pon', foot.x + side * 52, foot.y - 44, {
          size: 62, rot: side * 0.1, life: 0.58, ...hollow(),
        });
      }
    }

    _syncHitboxAndBubble() {
      // Position focusable mascot button directly over body
      const hx = Math.round(this.x - 38);
      const hy = Math.round(this.y - 74);
      this.elHit.style.transform = `translate(${hx}px, ${hy}px)`;

      // Combo badge pop in stage mode
      const cs = Math.max(0, this.comboS.x);
      if (cs < 0.02) {
        this.elComboTag.style.transform = 'skewX(-10deg) scale(0)';
      } else {
        this.elComboTag.style.transform = `skewX(-10deg) scale(${cs.toFixed(3)})`;
      }

      // Speech bubble anchored cleanly above ears and auto-clamped inside playfield
      const bs = Math.max(0, this.bubbleS.x);
      if (bs < 0.015) {
        this.elBubble.style.transform = 'translate(-9999px, -9999px) scale(0)';
        return;
      }
      const bw = this.elBubble.offsetWidth || 110;
      const bh = this.elBubble.offsetHeight || 30;
      const pad = 10;
      const desiredLeft = this.x - bw * 0.5;
      const minLeft = pad;
      const maxLeft = Math.max(pad, this._W - bw - pad);
      const left = clamp(desiredLeft, minLeft, maxLeft);
      const minTop = this.floating ? 12 : -18;
      const top = Math.max(minTop, this.y - 84 - bh);
      const tailPx = clamp(this.x - left, 18, Math.max(18, bw - 18));
      const tiltDeg = (1 - bs) * -9;
      this.elBubble.style.setProperty('--tail-x', `${Math.round(tailPx)}px`);
      this.elBubble.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px) scale(${bs.toFixed(3)}) rotate(${tiltDeg.toFixed(2)}deg)`;
    }

    // ─── High-DPI Cel-Shaded Canvas Rendering ───
    _draw() {
      const g = this.ctx;
      const pal = this._pal;
      if (!g || !pal) return;

      const dpr = this._dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, this._cvW, this._cvH);
      g.lineJoin = 'round';
      g.lineCap = 'round';

      g.save();
      g.translate(this._offX, this._offY);

      // 1. Stage Mode manga ground line + slanted ink hash marks + cel pebbles
      if (!this.floating) {
        this._drawStageGround(g, pal);
      }

      // 2. Ground contact cel-shadow directly beneath mascot (shrinks with altitude)
      const alt = Math.max(0, this._groundY - this.y);
      const shScale = 1 / (1 + alt / 92);
      g.save();
      g.fillStyle = pal.soft;
      g.beginPath();
      g.ellipse(this.x + 3, this._groundY + 1, 22 * shScale, 5.2 * shScale, 0, 0, TAU);
      g.fill();
      g.restore();

      // 3. Trailing kinetic scarf ribbon (drawn in world coordinates behind mascot body!)
      this._drawScarfRibbon(g, pal);

      // 4. Mascot Character transform (volume-preserving squash & stretch + dash smear + backflip!)
      const breath = this._mood === 'sleep' && !fx.calm ? Math.sin(this._t * 2.3) * 0.035 : 0;
      const walkBob = this._walkTarget !== null && this._grounded && !fx.calm ? Math.abs(Math.sin(this._walkPhase)) * 3.8 : 0;
      let sy = clamp(this.sqY.x + breath, 0.58, 1.48);
      let sx = 1 / Math.sqrt(sy);
      if (this._dashSmear > 0.01) {
        sx *= 1 + this._dashSmear * 0.58;
        sy /= Math.sqrt(1 + this._dashSmear * 0.58);
      }

      g.save();
      g.translate(this.x, this.y - walkBob);

      // Rotate around torso center for smooth tilt & celebratory backflip
      const flipAng = this._flipActive ? this._flipDir * this._flipT * TAU : 0;
      const totalRot = this.tiltS.x + flipAng;
      if (Math.abs(totalRot) > 0.001) {
        g.translate(0, -34);
        g.rotate(totalRot);
        g.translate(0, 34);
      }
      g.scale(sx, sy);

      if (this.character === 'mecha') {
        this._drawMecha(g, pal);
      } else {
        this._drawNeko(g, pal);
      }
      g.restore();

      // 5. Rising cel-outlined manga Z glyphs when sleeping
      if (this._mood === 'sleep') {
        this._drawSleepZs(g, pal);
      }

      g.restore();
    }

    _drawStageGround(g, pal) {
      const gy = this._groundY + 2;
      const L = 14, R = this._W - 14;

      // Crisp hand-inked ground baseline
      g.strokeStyle = pal.ink;
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(L, gy);
      g.lineTo(R, gy);
      g.stroke();

      // Slanted manga ink hash marks below baseline (matching chart.js & progress.js)
      g.beginPath();
      for (let hx = L + 14; hx < R - 10; hx += 28) {
        g.moveTo(hx, gy);
        g.lineTo(hx - 4, gy + 7.5);
        g.moveTo(hx + 7, gy);
        g.lineTo(hx + 4.5, gy + 4.5);
      }
      g.lineWidth = 1.7;
      g.strokeStyle = pal.dim;
      g.stroke();

      // Tiny decorative manga grass tuft on left
      const gx = L + 22;
      g.strokeStyle = pal.ink;
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(gx, gy);
      g.lineTo(gx - 3, gy - 6);
      g.moveTo(gx + 3, gy);
      g.lineTo(gx + 5, gy - 4.5);
      g.stroke();

      // Tiny flat cel pebbles at corners
      for (const p of this._pebbles) {
        const px = L + (R - L) * p.u;
        g.save();
        g.translate(px, gy - p.s * 0.45);
        g.rotate(p.rot);
        g.beginPath();
        g.ellipse(0, 0, p.s * 1.2, p.s * 0.72, 0, 0, TAU);
        g.fillStyle = pal.card;
        g.fill();
        g.strokeStyle = pal.ink;
        g.lineWidth = 1.7;
        g.stroke();
        g.restore();
      }
    }

    _drawScarfRibbon(g, pal) {
      const ns = this._scarf;
      if (ns.length < 3) return;

      // Compute perpendicular offsets along the 5-node ribbon chain to form a clean cel-shaded flat scarf tail
      const leftPts = [], rightPts = [];
      for (let i = 0; i < ns.length; i++) {
        const prev = ns[Math.max(0, i - 1)];
        const next = ns[Math.min(ns.length - 1, i + 1)];
        let tx = next.x - prev.x;
        let ty = next.y - prev.y;
        const len = Math.hypot(tx, ty) || 1;
        tx /= len; ty /= len;
        const nx = -ty, ny = tx;
        const halfW = lerp(4.2, 6.4, i / (ns.length - 1));
        leftPts.push([ns[i].x + nx * halfW, ns[i].y + ny * halfW]);
        rightPts.push([ns[i].x - nx * halfW, ns[i].y - ny * halfW]);
      }

      // Swallowtail V-notch at the ribbon end
      const tailTip = ns[ns.length - 1];
      const prevTip = ns[ns.length - 2];
      let dtx = tailTip.x - prevTip.x, dty = tailTip.y - prevTip.y;
      const dlen = Math.hypot(dtx, dty) || 1;
      dtx /= dlen; dty /= dlen;
      const notchX = tailTip.x - dtx * 5;
      const notchY = tailTip.y - dty * 5;

      const p = new Path2D();
      p.moveTo(leftPts[0][0], leftPts[0][1]);
      for (let i = 1; i < leftPts.length; i++) p.lineTo(leftPts[i][0], leftPts[i][1]);
      p.lineTo(notchX, notchY);
      for (let i = rightPts.length - 1; i >= 0; i--) p.lineTo(rightPts[i][0], rightPts[i][1]);
      p.closePath();

      g.save();
      g.fillStyle = pal.acc;
      g.fill(p);
      // Flat two-tone cel shade stripe along lower edge of ribbon
      g.save();
      g.clip(p);
      g.beginPath();
      g.moveTo(ns[0].x, ns[0].y + 1);
      for (let i = 1; i < ns.length; i++) g.lineTo(ns[i].x, ns[i].y + 1);
      for (let i = rightPts.length - 1; i >= 0; i--) g.lineTo(rightPts[i][0], rightPts[i][1] + 2);
      g.closePath();
      g.fillStyle = DEEP_PINK;
      g.fill();
      g.restore();

      g.strokeStyle = pal.ink;
      g.lineWidth = 2.4;
      g.stroke(p);
      g.restore();
    }

    // ─── Character 1: Koma-Neko (Cel-Shaded Manga Spirit-Cat) ───
    _drawNeko(g, pal) {
      const f = this.facing;
      const walking = this._walkTarget !== null && this._grounded && !fx.calm;
      const stride = walking ? Math.sin(this._walkPhase) : 0;
      const isSleep = this._mood === 'sleep';
      const isGrab = this._dragging;
      const isHappy = this._mood === 'happy';
      const isDash = this._mood === 'dash';
      const isSurprised = this._mood === 'surprised' || isGrab;

      // 1. Expressive spring tail (behind torso)
      this._drawNekoTail(g, pal, f, isSleep);

      // 2. Plump chibi torso
      const bodyP = new Path2D();
      bodyP.moveTo(-14, -24);
      bodyP.bezierCurveTo(-20, -17, -20, -4, -10, -3);
      bodyP.lineTo(10, -3);
      bodyP.bezierCurveTo(20, -4, 20, -17, 14, -24);
      bodyP.closePath();

      g.fillStyle = pal.card;
      g.fill(bodyP);
      // Lower-right cel shadow crescent inside torso
      g.save();
      g.clip(bodyP);
      g.fillStyle = pal.soft;
      g.beginPath();
      g.ellipse(8, -8, 17, 13, -0.2, 0, TAU);
      g.fill();
      g.fillStyle = pal.card;
      g.beginPath();
      g.ellipse(-3, -15, 16, 12, 0, 0, TAU);
      g.fill();
      g.restore();
      g.strokeStyle = pal.ink;
      g.lineWidth = 2.8;
      g.stroke(bodyP);

      // 3. Cute bottom feet (animated stride / dangle when grabbed)
      const footL_y = isGrab ? 3 + Math.sin(this._t * 16) * 2.5 : -3.5 - Math.max(0, stride) * 3.5;
      const footR_y = isGrab ? 3 - Math.sin(this._t * 16) * 2.5 : -3.5 - Math.max(0, -stride) * 3.5;
      const footL_x = -9 + stride * 2.5;
      const footR_x = 9 - stride * 2.5;
      for (const [fxp, fyp] of [[footL_x, footL_y], [footR_x, footR_y]]) {
        g.beginPath();
        g.ellipse(fxp, fyp, 6.2, 4.3, 0, 0, TAU);
        g.fillStyle = pal.card;
        g.fill();
        g.strokeStyle = pal.ink;
        g.lineWidth = 2.6;
        g.stroke();
      }

      // 4. Little side paws (raise joyfully on happy/pat/celebrate, wave on grab, tucked on sleep)
      const armsUp = this._armsUpT > 0 || isHappy;
      for (const side of [-1, 1]) {
        g.save();
        if (armsUp && !isGrab) {
          g.translate(side * 18, -21);
          g.rotate(side * -0.58);
        } else if (isGrab) {
          g.translate(side * 19, -15);
          g.rotate(side * (0.25 + Math.sin(this._t * 20 + side) * 0.3));
        } else if (isSleep) {
          g.translate(side * 10, -11);
          g.rotate(side * 0.45);
        } else {
          g.translate(side * 16.5, -14 + side * stride * 1.4);
          g.rotate(side * 0.35);
        }
        g.beginPath();
        g.ellipse(0, 0, 5.2, 4.2, 0, 0, TAU);
        g.fillStyle = pal.card;
        g.fill();
        g.strokeStyle = pal.ink;
        g.lineWidth = 2.5;
        g.stroke();
        g.restore();
      }

      // 5. Articulated Spring Cat Ears (drawn behind head outline so seam is clean)
      this._drawNekoEar(g, pal, -1, this.earLS.x + (isDash ? -f * 0.3 : 0));
      this._drawNekoEar(g, pal, 1, this.earRS.x + (isDash ? -f * 0.3 : 0));

      // 6. Plump Mochi-Cheek Manga Cat Head
      const headP = new Path2D();
      headP.moveTo(0, -61);
      headP.bezierCurveTo(16, -61, 25.5, -51, 25.5, -39);
      headP.bezierCurveTo(25.5, -27, 17, -21, 0, -21);
      headP.bezierCurveTo(-17, -21, -25.5, -27, -25.5, -39);
      headP.bezierCurveTo(-25.5, -51, -16, -61, 0, -61);
      headP.closePath();

      g.fillStyle = pal.card;
      g.fill(headP);

      // Clipped flat cel-shadow crescent on lower-right cheek + cute periwinkle forehead markings
      g.save();
      g.clip(headP);
      // Two-tone flat cel shadow (light from top-left)
      g.fillStyle = pal.soft;
      g.beginPath();
      g.ellipse(10, -28, 25, 19, -0.25, 0, TAU);
      g.fill();
      g.fillStyle = pal.card;
      g.beginPath();
      g.ellipse(-4.5, -42.5, 25.5, 20.5, -0.1, 0, TAU);
      g.fill();

      // Cute subtle periwinkle manga tabby forehead stripes (centered at brow)
      const lx = this.lookXS.x * 3.8;
      g.fillStyle = pal.pri;
      for (const [ox, h] of [[-4.8, 7.5], [0, 9.5], [4.8, 7.5]]) {
        g.beginPath();
        g.roundRect(lx * 0.65 + ox - 1.7, -62.5, 3.4, h, 2);
        g.fill();
      }
      g.restore();

      // Crisp thick outer ink outline of head
      g.strokeStyle = pal.ink;
      g.lineWidth = 3.0;
      g.stroke(headP);

      // 7. Expressive Anime Face (subtle 2.5D cursor parallax)
      const faceX = clamp(this.lookXS.x * 4.4, -5.2, 5.2);
      const faceY = clamp(this.lookYS.x * 2.4, -3, 3) + (isSleep ? 2 : 0);
      this._drawNekoFace(g, pal, faceX, faceY, isHappy, isSurprised, isSleep, isDash);

      // 8. Bouncy Pink Scarf Collar + Shiny Swinging Bell (frames neck cleanly!)
      this._drawScarfCollar(g, pal, f);
    }

    _drawNekoTail(g, pal, f, isSleep) {
      const wag = this.tailS.x;
      const bx = -f * 15;
      const by = -11;
      let cx1, cy1, cx2, cy2, tx, ty;
      if (isSleep) {
        cx1 = bx - f * 12; cy1 = by + 6;
        cx2 = bx - f * 20; cy2 = by + 9;
        tx = bx - f * 12; ty = by + 9;
      } else {
        cx1 = bx - f * (13 + wag * 4);
        cy1 = by - 4;
        cx2 = bx - f * (22 - wag * 12);
        cy2 = by - 22 - wag * 4;
        tx = bx - f * (14 - wag * 16);
        ty = by - 31 + wag * 5;
      }

      const drawCurve = () => {
        g.beginPath();
        g.moveTo(bx, by);
        g.bezierCurveTo(cx1, cy1, cx2, cy2, tx, ty);
      };

      g.save();
      // Thick ink outer silhouette
      drawCurve();
      g.strokeStyle = pal.ink;
      g.lineWidth = 10.6;
      g.stroke();

      // White inner tail fill
      drawCurve();
      g.strokeStyle = pal.card;
      g.lineWidth = 5.4;
      g.stroke();

      // Cute pink/periwinkle dipped tail tip dot
      g.fillStyle = pal.pri;
      g.beginPath();
      g.arc(tx, ty, 3.2, 0, TAU);
      g.fill();
      g.strokeStyle = pal.ink;
      g.lineWidth = 2.0;
      g.stroke();
      g.restore();
    }

    _drawNekoEar(g, pal, side, rotOffset) {
      g.save();
      g.translate(side * 14.5, -53);
      g.rotate(side * 0.24 + rotOffset);

      // Soft curved anime cat ear silhouette
      const earP = new Path2D();
      earP.moveTo(-side * 7.5, 2);
      earP.quadraticCurveTo(side * 2, -16, side * 7.5, -20);
      earP.quadraticCurveTo(side * 12.5, -8, side * 9, 7);
      earP.closePath();

      g.fillStyle = pal.card;
      g.fill(earP);

      // Inner pink ear cushion
      const inP = new Path2D();
      inP.moveTo(-side * 2.5, 1);
      inP.quadraticCurveTo(side * 2.8, -10.5, side * 5.6, -13.5);
      inP.quadraticCurveTo(side * 8.2, -5.5, side * 5.5, 4);
      inP.closePath();
      g.fillStyle = pal.acc;
      g.fill(inP);

      g.strokeStyle = pal.ink;
      g.lineWidth = 2.9;
      g.stroke(earP);
      g.restore();
    }

    _drawNekoFace(g, pal, fxo, fyo, isHappy, isSurprised, isSleep, isDash) {
      g.save();
      g.translate(fxo, fyo);

      // Cheek blush pills
      g.fillStyle = pal.acc;
      for (const side of [-1, 1]) {
        g.beginPath();
        g.ellipse(side * 15.8, -32.2, isHappy ? 4.8 : 3.9, isHappy ? 2.6 : 2.1, side * -0.1, 0, TAU);
        g.fill();
      }

      // Crisp short manga whiskers on cheeks
      g.strokeStyle = pal.ink;
      g.lineWidth = 1.75;
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(side * 20.5, -35.5);
        g.lineTo(side * 26.5, -36.5);
        g.moveTo(side * 20.5, -31.8);
        g.lineTo(side * 26.0, -30.8);
        g.stroke();
      }

      // Eyes
      const blinking = this._blinkT > 0 && !isHappy && !isSurprised && !isSleep;
      const eyeY = -39.5;
      const eyeGap = 10.2;

      for (const side of [-1, 1]) {
        const ex = side * eyeGap;
        if (isHappy) {
          // Joyful arched ^ ^ anime happy eyes
          g.strokeStyle = pal.ink;
          g.lineWidth = 3.1;
          g.beginPath();
          g.arc(ex, eyeY + 2.5, 5.2, Math.PI * 1.14, Math.PI * 1.86);
          g.stroke();
        } else if (isSleep) {
          // Peaceful sleeping curved - - eyes
          g.strokeStyle = pal.ink;
          g.lineWidth = 2.6;
          g.beginPath();
          g.arc(ex, eyeY - 1.5, 4.8, Math.PI * 0.16, Math.PI * 0.84);
          g.stroke();
        } else if (blinking) {
          // Crisp blink line
          g.strokeStyle = pal.ink;
          g.lineWidth = 2.8;
          g.beginPath();
          g.moveTo(ex - 4.8, eyeY + 0.5);
          g.quadraticCurveTo(ex, eyeY + 2.5, ex + 4.8, eyeY + 0.5);
          g.stroke();
        } else if (isSurprised && this._panicEyesT > 0) {
          // Comic > < squint eyes when tossed fast!
          g.strokeStyle = pal.ink;
          g.lineWidth = 2.9;
          g.beginPath();
          if (side < 0) {
            g.moveTo(ex - 4.2, eyeY - 3.6);
            g.lineTo(ex + 3.4, eyeY);
            g.lineTo(ex - 4.2, eyeY + 3.6);
          } else {
            g.moveTo(ex + 4.2, eyeY - 3.6);
            g.lineTo(ex - 3.4, eyeY);
            g.lineTo(ex + 4.2, eyeY + 3.6);
          }
          g.stroke();
        } else if (isSurprised) {
          // Wide comic O O eyes with tiny startled ink pupils
          g.fillStyle = pal.card;
          g.beginPath();
          g.ellipse(ex, eyeY, 5.3, 6.2, 0, 0, TAU);
          g.fill();
          g.strokeStyle = pal.ink;
          g.lineWidth = 2.6;
          g.stroke();
          g.fillStyle = pal.ink;
          g.beginPath();
          g.arc(ex + this.lookXS.x * 1.5, eyeY + this.lookYS.x * 1.5, 1.9, 0, TAU);
          g.fill();
        } else {
          // Expressive anime eyes (idle / walk / dash)
          const px = clamp(this.lookXS.x * 1.6, -2, 2);
          const py = clamp(this.lookYS.x * 1.2, -1.6, 1.6);

          // Main deep-ink iris oval
          g.fillStyle = pal.ink;
          g.beginPath();
          g.ellipse(ex, eyeY, 4.4, isDash ? 5.2 : 5.8, 0, 0, TAU);
          g.fill();

          // Flat periwinkle lower iris reflection crescent
          g.fillStyle = isDash ? pal.acc : pal.pri;
          g.beginPath();
          g.ellipse(ex + px * 0.3, eyeY + 2.3, 2.7, 1.7, 0, 0, TAU);
          g.fill();

          if (isDash) {
            // Crisp 4-pointed star glint inside determined dash eyes!
            this._drawMiniStar(g, ex + px * 0.4, eyeY - 0.6, 3.3, pal.card);
            // Fierce slanted shonen anime brow (\ /) — outer end higher, inner end lower!
            g.strokeStyle = pal.ink;
            g.lineWidth = 2.5;
            g.beginPath();
            g.moveTo(ex + side * 5.2, eyeY - 8.2);
            g.lineTo(ex - side * 4.2, eyeY - 5.2);
            g.stroke();
          } else {
            // Large upper-left specular glint + pinpoint lower-right glint
            g.fillStyle = pal.card;
            g.beginPath();
            g.arc(ex - 1.3 + px * 0.45, eyeY - 2.1 + py * 0.45, 1.85, 0, TAU);
            g.fill();
            g.beginPath();
            g.arc(ex + 1.5 + px * 0.35, eyeY + 1.5 + py * 0.35, 0.85, 0, TAU);
            g.fill();
          }
        }
      }

      // Tiny cute pink nose dot + expressive anime cat mouth
      const my = -31.8;
      if (!isSleep) {
        g.fillStyle = pal.acc;
        g.beginPath();
        g.ellipse(0, my - 2.2, 1.9, 1.3, 0, 0, TAU);
        g.fill();
      }

      g.strokeStyle = pal.ink;
      g.lineWidth = 2.1;
      if (isHappy) {
        // Joyful open anime cat D-smile with pink tongue
        g.beginPath();
        g.moveTo(-4.6, my);
        g.quadraticCurveTo(-2.3, my + 2.2, 0, my - 0.2);
        g.quadraticCurveTo(2.3, my + 2.2, 4.6, my);
        g.stroke();
        g.fillStyle = pal.acc;
        g.beginPath();
        g.arc(0, my + 0.6, 3.2, 0, Math.PI);
        g.closePath();
        g.fill();
        g.stroke();
      } else if (isSurprised) {
        // Startled little 'o' mouth
        g.fillStyle = pal.acc;
        g.beginPath();
        g.ellipse(0, my + 1.5, 2.7, 3.2, 0, 0, TAU);
        g.fill();
        g.stroke();
      } else if (isSleep) {
        // Cozy tiny curved mouth
        g.beginPath();
        g.arc(0, my + 1, 2.2, 0.15 * Math.PI, 0.85 * Math.PI);
        g.stroke();
      } else {
        // Classic anime cat ω ("w") mouth!
        g.beginPath();
        g.moveTo(-4.8, my + 0.3);
        g.quadraticCurveTo(-2.4, my + 3.2, 0, my + 0.3);
        g.quadraticCurveTo(2.4, my + 3.2, 4.8, my + 0.3);
        g.stroke();
      }

      g.restore();
    }

    _drawScarfCollar(g, pal, f) {
      // Curved vivid pink scarf wrap at neck seam
      const colP = new Path2D();
      colP.moveTo(-15.5, -24.5);
      colP.quadraticCurveTo(0, -18.5, 15.5, -24.5);
      colP.quadraticCurveTo(17.5, -20.5, 14.5, -17.5);
      colP.quadraticCurveTo(0, -12.5, -14.5, -17.5);
      colP.quadraticCurveTo(-17.5, -20.5, -15.5, -24.5);
      colP.closePath();

      g.fillStyle = pal.acc;
      g.fill(colP);

      // Subtle flat two-tone shadow strip on lower right of collar
      g.save();
      g.clip(colP);
      g.fillStyle = DEEP_PINK;
      g.fillRect(-20, -17, 40, 10);
      g.restore();

      g.strokeStyle = pal.ink;
      g.lineWidth = 2.5;
      g.stroke(colP);

      // Shiny golden-amber cat bell swinging on bellS spring
      g.save();
      g.translate(f * 2.5, -16.5);
      g.rotate(this.bellS.x);
      g.beginPath();
      g.arc(0, 3.8, 4.8, 0, TAU);
      g.fillStyle = AMBER;
      g.fill();
      g.strokeStyle = pal.ink;
      g.lineWidth = 2.2;
      g.stroke();

      // Bell slit + crisp specular dot
      g.beginPath();
      g.moveTo(-2.2, 5.4);
      g.lineTo(2.2, 5.4);
      g.lineWidth = 1.6;
      g.stroke();
      g.fillStyle = pal.card;
      g.beginPath();
      g.arc(-1.6, 2.2, 1.35, 0, TAU);
      g.fill();
      g.restore();
    }

    // ─── Character 2: Koma-Mecha (Cel-Shaded Visor-Cat Unit) ───
    _drawMecha(g, pal) {
      const f = this.facing;
      const walking = this._walkTarget !== null && this._grounded && !fx.calm;
      const stride = walking ? Math.sin(this._walkPhase) : 0;
      const isSleep = this._mood === 'sleep';
      const isGrab = this._dragging;
      const isHappy = this._mood === 'happy';
      const isDash = this._mood === 'dash';
      const isSurprised = this._mood === 'surprised' || isGrab;

      // 1. Segmented Mecha Lightning-Plug Tail (behind chassis)
      this._drawMechaTail(g, pal, f, isSleep);

      // 2. Compact Armored Mecha Chassis Torso
      const torsoP = new Path2D();
      torsoP.roundRect(-16, -24, 32, 21, [6, 6, 9, 9]);
      g.fillStyle = pal.card;
      g.fill(torsoP);
      g.save();
      g.clip(torsoP);
      g.fillStyle = pal.soft;
      g.fillRect(4, -25, 16, 24);
      // Periwinkle chest armor plate
      g.fillStyle = pal.pri;
      g.beginPath();
      g.roundRect(-11, -18, 22, 11, 4);
      g.fill();
      g.strokeStyle = pal.ink;
      g.lineWidth = 2.0;
      g.stroke();
      // Pink triangular core reactor emblem
      g.fillStyle = pal.acc;
      g.beginPath();
      g.moveTo(0, -15.5);
      g.lineTo(4.2, -9.8);
      g.lineTo(-4.2, -9.8);
      g.closePath();
      g.fill();
      g.strokeStyle = pal.ink;
      g.lineWidth = 1.6;
      g.stroke();
      g.restore();
      g.strokeStyle = pal.ink;
      g.lineWidth = 2.8;
      g.stroke(torsoP);

      // 3. Chunky Mecha Booster Boots
      const footL_y = isGrab ? 3 + Math.sin(this._t * 16) * 2.5 : -3.5 - Math.max(0, stride) * 3.5;
      const footR_y = isGrab ? 3 - Math.sin(this._t * 16) * 2.5 : -3.5 - Math.max(0, -stride) * 3.5;
      for (const [bx, by] of [[-9 + stride * 2.5, footL_y], [9 - stride * 2.5, footR_y]]) {
        g.beginPath();
        g.roundRect(bx - 6.5, by - 4, 13, 8, [3, 3, 4, 4]);
        g.fillStyle = pal.pri;
        g.fill();
        g.strokeStyle = pal.ink;
        g.lineWidth = 2.5;
        g.stroke();
      }

      // 4. Articulated Mecha Arm Pods
      const armsUp = this._armsUpT > 0 || isHappy;
      for (const side of [-1, 1]) {
        g.save();
        if (armsUp && !isGrab) {
          g.translate(side * 19, -21);
          g.rotate(side * -0.65);
        } else if (isGrab) {
          g.translate(side * 20, -15);
          g.rotate(side * (0.2 + Math.sin(this._t * 20 + side) * 0.35));
        } else {
          g.translate(side * 18.5, -14 + side * stride * 1.4);
          g.rotate(side * 0.25);
        }
        g.beginPath();
        g.roundRect(-5, -4, 10, 8, 4);
        g.fillStyle = pal.card;
        g.fill();
        g.strokeStyle = pal.ink;
        g.lineWidth = 2.5;
        g.stroke();
        g.restore();
      }

      // 5. Spring Bobble Antenna + Chamfered Mecha Cat Ears
      this._drawMechaAntenna(g, pal);
      this._drawMechaEar(g, pal, -1, this.earLS.x + (isDash ? -f * 0.28 : 0));
      this._drawMechaEar(g, pal, 1, this.earRS.x + (isDash ? -f * 0.28 : 0));

      // 6. Chamfered Rounded-Cube Mecha Helmet
      const helmP = new Path2D();
      helmP.roundRect(-26, -60, 52, 39, [16, 16, 14, 14]);
      g.fillStyle = pal.card;
      g.fill(helmP);

      g.save();
      g.clip(helmP);
      // Crisp cel shadow along right & lower edge
      g.fillStyle = pal.soft;
      g.fillRect(15, -62, 16, 44);
      g.fillRect(-28, -28, 56, 10);
      // Forehead periwinkle V-crest fin
      g.fillStyle = pal.pri;
      g.beginPath();
      g.moveTo(-7, -61);
      g.lineTo(7, -61);
      g.lineTo(3.5, -53.5);
      g.lineTo(-3.5, -53.5);
      g.closePath();
      g.fill();
      g.strokeStyle = pal.ink;
      g.lineWidth = 2.0;
      g.stroke();
      g.restore();

      g.strokeStyle = pal.ink;
      g.lineWidth = 3.0;
      g.stroke(helmP);

      // 7. Panoramic Deep-Ink Visor + Luminous Flat LED Anime Eyes
      const faceX = clamp(this.lookXS.x * 3.8, -4.4, 4.4);
      const faceY = clamp(this.lookYS.x * 2.0, -2.5, 2.5);
      this._drawMechaVisor(g, pal, faceX, faceY, isHappy, isSurprised, isSleep, isDash);

      // 8. Tokusatsu Hero Scarf Collar
      this._drawScarfCollar(g, pal, f);
    }

    _drawMechaAntenna(g, pal) {
      const sway = clamp(this.earLS.x * 0.6 - this.vx * 0.0005, -0.45, 0.45);
      g.save();
      g.translate(0, -60);
      g.rotate(sway);
      g.strokeStyle = pal.ink;
      g.lineWidth = 2.8;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, -11);
      g.stroke();
      g.fillStyle = pal.acc;
      g.beginPath();
      g.arc(0, -13.5, 4.0, 0, TAU);
      g.fill();
      g.stroke();
      g.fillStyle = pal.card;
      g.beginPath();
      g.arc(-1.2, -14.7, 1.2, 0, TAU);
      g.fill();
      g.restore();
    }

    _drawMechaEar(g, pal, side, rotOffset) {
      g.save();
      g.translate(side * 16, -54);
      g.rotate(side * 0.22 + rotOffset);

      const p = new Path2D();
      p.moveTo(-side * 6, 3);
      p.lineTo(side * 5, -18);
      p.lineTo(side * 10, -14);
      p.lineTo(side * 9, 6);
      p.closePath();

      g.fillStyle = pal.pri;
      g.fill(p);
      // Pink LED sensor slit inside ear pod
      g.fillStyle = pal.acc;
      g.beginPath();
      g.moveTo(side * 0.5, 0);
      g.lineTo(side * 4.8, -11);
      g.lineTo(side * 6.5, -1);
      g.closePath();
      g.fill();

      g.strokeStyle = pal.ink;
      g.lineWidth = 2.7;
      g.stroke(p);
      g.restore();
    }

    _drawMechaTail(g, pal, f, isSleep) {
      const wag = this.tailS.x;
      const bx = -f * 15, by = -12;
      const mx = bx - f * (12 - wag * 4), my = isSleep ? by + 5 : by - 10;
      const tx = bx - f * (21 - wag * 12), ty = isSleep ? by + 7 : by - 25 + wag * 5;

      g.save();
      g.strokeStyle = pal.ink;
      g.lineWidth = 4.2;
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(mx, my);
      g.lineTo(tx, ty);
      g.stroke();

      // Glowing pink lightning/diamond plug tip
      g.translate(tx, ty);
      g.rotate(-f * 0.45 + wag * 0.5);
      const tip = new Path2D();
      tip.moveTo(0, -6.5);
      tip.lineTo(4.5, 0);
      tip.lineTo(0, 6.5);
      tip.lineTo(-4.5, 0);
      tip.closePath();
      g.fillStyle = pal.acc;
      g.fill(tip);
      g.strokeStyle = pal.ink;
      g.lineWidth = 2.2;
      g.stroke(tip);
      g.restore();
    }

    _drawMechaVisor(g, pal, fxo, fyo, isHappy, isSurprised, isSleep, isDash) {
      // Dark rounded visor faceplate
      const visP = new Path2D();
      visP.roundRect(-20.5, -51, 41, 23, 10);
      g.fillStyle = pal.ink;
      g.fill(visP);

      // Crisp flat two-tone cel reflection slash on top-left corner of visor (zero alpha!)
      g.save();
      g.clip(visP);
      g.fillStyle = '#383376';
      g.beginPath();
      g.moveTo(-19, -53);
      g.lineTo(-9, -53);
      g.lineTo(-16, -26);
      g.lineTo(-24, -26);
      g.closePath();
      g.fill();

      // LED anime eyes & expression inside visor
      g.translate(fxo, fyo);
      const blinking = this._blinkT > 0 && !isHappy && !isSurprised && !isSleep;
      const ey = -39.5;
      const gap = 9.8;

      for (const side of [-1, 1]) {
        const ex = side * gap;
        if (isHappy) {
          g.strokeStyle = pal.acc;
          g.lineWidth = 3.2;
          g.beginPath();
          g.arc(ex, ey + 2.5, 4.8, Math.PI * 1.15, Math.PI * 1.85);
          g.stroke();
        } else if (isSleep) {
          g.strokeStyle = pal.soft;
          g.lineWidth = 2.6;
          g.beginPath();
          g.moveTo(ex - 4.2, ey + 1);
          g.lineTo(ex + 4.2, ey + 1);
          g.stroke();
        } else if (blinking) {
          g.strokeStyle = pal.card;
          g.lineWidth = 2.6;
          g.beginPath();
          g.moveTo(ex - 4.5, ey);
          g.lineTo(ex + 4.5, ey);
          g.stroke();
        } else if (isSurprised) {
          g.strokeStyle = AMBER;
          g.lineWidth = 2.8;
          g.beginPath();
          g.arc(ex, ey, 4.4, 0, TAU);
          g.stroke();
        } else if (isDash) {
          // Turbo pink slanted mecha eyes
          g.fillStyle = pal.acc;
          g.beginPath();
          g.moveTo(ex - side * 5.2, ey - 3.6);
          g.lineTo(ex + side * 4.8, ey - 1.2);
          g.lineTo(ex + side * 3.8, ey + 3.8);
          g.lineTo(ex - side * 4.5, ey + 2.8);
          g.closePath();
          g.fill();
          this._drawMiniStar(g, ex, ey, 2.8, pal.card);
        } else {
          // Bright glowing white + mint/periwinkle LED ovals
          g.fillStyle = pal.card;
          g.beginPath();
          g.roundRect(ex - 3.6, ey - 5.2, 7.2, 10.4, 3.6);
          g.fill();
          g.fillStyle = GREEN;
          g.beginPath();
          g.roundRect(ex - 2.6, ey + 1.2, 5.2, 3.0, 1.5);
          g.fill();
        }
      }

      // LED blush bars + mini digital cat smile
      if (isHappy) {
        g.fillStyle = pal.acc;
        g.fillRect(-17.5, -34, 4.5, 2.2);
        g.fillRect(13, -34, 4.5, 2.2);
      }
      if (!isSleep) {
        g.strokeStyle = isDash ? pal.acc : pal.card;
        g.lineWidth = 2.0;
        g.beginPath();
        g.moveTo(-3.8, -32.2);
        g.lineTo(-1.5, -30.5);
        g.lineTo(0, -32.0);
        g.lineTo(1.5, -30.5);
        g.lineTo(3.8, -32.2);
        g.stroke();
      }
      g.restore();

      g.strokeStyle = pal.ink;
      g.lineWidth = 2.4;
      g.stroke(visP);
    }

    _drawMiniStar(g, x, y, r, col) {
      const q = r * 0.24;
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(x, y - r);
      g.quadraticCurveTo(x + q, y - q, x + r, y);
      g.quadraticCurveTo(x + q, y + q, x, y + r);
      g.quadraticCurveTo(x - q, y + q, x - r, y);
      g.quadraticCurveTo(x - q, y - q, x, y - r);
      g.closePath();
      g.fill();
    }

    _drawSleepZs(g, pal) {
      if (fx.calm) {
        // Static crisp manga Zzz badge in calm mode
        this._paintZGlyph(g, pal, this.x + 26, this.y - 62, 13);
        this._paintZGlyph(g, pal, this.x + 38, this.y - 74, 10);
        return;
      }
      for (const z of this._sleepZ) {
        const k = clamp(z.t / z.life, 0, 1);
        // Enters with pop and leaves strictly by shrinking to zero (never opacity fading!)
        const sc = k < 0.2 ? (k / 0.2) : (k > 0.72 ? Math.max(0, 1 - (k - 0.72) / 0.28) : 1);
        if (sc < 0.05) continue;
        const zx = this.x + z.ox + Math.sin(k * Math.PI * 2) * 5;
        const zy = this.y - 54 - k * 34;
        this._paintZGlyph(g, pal, zx, zy, z.sz * sc);
      }
    }

    _paintZGlyph(g, pal, x, y, size) {
      if (size < 2) return;
      g.save();
      g.translate(x, y);
      g.rotate(-0.14);
      g.font = `italic 900 ${size.toFixed(1)}px "Avenir Next", "Nunito", -apple-system, "Segoe UI", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.strokeStyle = pal.card;
      g.lineWidth = Math.max(2.5, size * 0.34);
      g.strokeText('Z', 0, 0);
      g.fillStyle = pal.ink;
      g.fillText('Z', 0, 0);
      g.restore();
    }
  }

  fx.define('sakuga-pet', SakugaPet);
}

// >>> sakuga core (copied from core.js by tools/build.mjs: edit core.js, not this block)
// Sakuga VFX core: springs, the effects layer and the lettering, shared by every component.
// Each component file carries a copy of this between its core markers, so any one file works on its own. The first one loaded
// sets window.SakugaFX and the others use it. Edit this file, then run `node tools/build.mjs` to stamp it into the components.
(() => {
'use strict';
if (window.SakugaFX) return;
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const out = (t) => 1 - (1 - t) ** 3, inn = (t) => t * t * t, back = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;

// A spring: the thing that makes a control overshoot and settle instead of stopping dead.
class Spring {
  constructor(x = 0, k = 300, d = 20) { this.x = x; this.v = 0; this.to = x; this.k = k; this.d = d; }
  step(dt) { if (!(dt > 0)) return this.x; for (let n = Math.ceil(dt / 0.008), h = dt / n; n--;) { this.v += (-this.k * (this.x - this.to) - this.d * this.v) * h; this.x += this.v * h; } return this.x; }
}

// ───────── the palette ─────────
// P is for the effects; the CSS variables below are for the controls.
const P = { fill: '#ffffff', shade: '#b8b3ff', line: '#5a4fd8', accent: '#ff5fa8', ink: '#1d1a4a', sfx: ['#1d1a4a', '#ffffff'] };
const VARS = '--sk-card:#fff;--sk-ink:#1d1a4a;--sk-dim:#8580b0;--sk-soft:#b8b3ff;--sk-pri:#8f8df7;--sk-pri-ink:#1d1a4a;--sk-acc:#ff5fa8;--sk-track:#c9cbe0;--sk-r:15px;--sk-bw:3.2px;--sk-sh:6px 7px 0 var(--sk-soft);--sk-btn-sh:var(--sk-sh);--sk-btn-line:var(--sk-ink);--sk-alt-sh:var(--sk-sh);--sk-alt-line:var(--sk-ink);--sk-tick:var(--sk-ink);--sk-fill:var(--sk-acc);--sk-on-pri:#fff;';
// :where() keeps these at no specificity, so a page's own :root { --sk-acc: ... } wins.
const pageCss = `:where(:root){${VARS}}
canvas.sakuga-fx{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483000}`;
document.head.append(Object.assign(document.createElement('style'), { textContent: pageCss }));

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let calm = reduce.matches; reduce.addEventListener?.('change', (e) => { calm = e.matches; });

// ───────── layers ─────────
// The front layer is one fixed canvas over the whole page. A component can also have a back layer: a canvas inside it, behind the control.
// Effects are placed in page coordinates, so they scroll with their control.
let g = null, dpr = 1;
const front = { c: null, g: null, live: [], dirty: false }, layers = [front];
function ensureFront() {
  if (front.c || !document.body) return;
  front.c = Object.assign(document.createElement('canvas'), { className: 'sakuga-fx' }); front.c.setAttribute('aria-hidden', 'true');
  document.body.append(front.c); front.g = front.c.getContext('2d'); size();
}
function size() { dpr = Math.min(2.5, devicePixelRatio || 1); if (front.c) { front.c.width = innerWidth * dpr; front.c.height = innerHeight * dpr; } }
addEventListener('resize', size);
function backLayer(canvas) { const L = { c: canvas, g: canvas.getContext('2d'), live: [], dirty: false }; layers.push(L); return L; }
const add = (life, draw, L) => { const p = { t: 0, life, draw }; if (!calm) { L = L || front; if (L === front) ensureFront(); L.live.push(p); start(); } return p; };
// an effect with no end: it draws every frame until its handle is marked dead. layer puts it on a component's back layer.
const persist = (draw, layer) => add(Infinity, draw, layer);
function tick(dt) {
  for (const L of layers) {
    if (!L.c || (!L.live.length && !L.dirty)) continue;
    let ox = scrollX, oy = scrollY;
    if (L !== front) {   // a back layer: keep its pixels matched to where it sits
      if (!L.c.isConnected) { L.live = []; L.dirty = false; continue; }
      const r = L.c.getBoundingClientRect(), w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (L.c.width !== w) L.c.width = w; if (L.c.height !== h) L.c.height = h; ox += r.left; oy += r.top;
    }
    g = L.g; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, L.c.width / dpr, L.c.height / dpr);
    g.translate(-ox, -oy); g.lineJoin = g.lineCap = 'round';
    L.live = L.live.filter((p) => !p.dead && (p.t += dt) < p.life);
    for (const p of L.live) { g.save(); p.draw(p.t / p.life, p.t, dt); g.restore(); }
    L.dirty = L.live.length > 0;
  }
}

// ───────── the clock ─────────
// One loop for every component. later() runs on this clock, not on setTimeout, so a film can step it a frame at a time.
let now = 0, last = 0, running = false;
const frames = new Set(), timers = [];
const later = (ms, f) => { timers.push({ at: now + ms / 1000, f }); start(); };
function advance(dt) {
  now += dt;
  const due = timers.filter((q) => q.at <= now).sort((a, b) => a.at - b.at); if (due.length) for (const q of due) timers.splice(timers.indexOf(q), 1);
  for (const q of due) q.f();
  for (const f of frames) f(dt);
  tick(dt);
}
function loop(ms) {
  if (!running) return;
  const dt = clamp((ms - last) / 1000, 0, 0.034); last = ms;   // a frame's timestamp can be earlier than the moment the loop started
  if (!api.paused) advance(dt);
  if (!frames.size && !timers.length && layers.every((L) => !L.live.length && !L.dirty)) { running = false; return; }
  requestAnimationFrame(loop);
}
function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(loop); }

// ───────── the effects ─────────
// circles drawn as one shape: outline, shadow tone, then the light side slid up and to the left
function blob(cs, lw = 1.5, _, { lx = -1, arcs = false, deep = 1 } = {}) {
  const u = new Path2D(); for (const [x, y, r] of cs) if (r > 0.3) { u.moveTo(x + r, y); u.arc(x, y, r, 0, TAU); }
  g.save(); g.lineWidth = lw * 2; g.strokeStyle = P.line; g.stroke(u); g.restore();
  g.save(); g.clip(u); g.fillStyle = P.shade; g.fillRect(-1e4, -1e4, 2e4, 2e4); const r = cs[0] ? cs[0][2] : 8;
  g.save(); g.translate(lx * r * 0.2 * deep, -r * 0.26 * deep); g.fillStyle = P.fill; g.fill(u); g.restore();
  if (arcs) { g.strokeStyle = P.line; g.lineWidth = lw * 0.75; g.beginPath(); for (const [x, y, rr] of cs) if (rr > 3) { g.moveTo(x + Math.cos(-2.7) * rr, y + Math.sin(-2.7) * rr); g.arc(x, y, rr, -2.7, -0.5); } g.stroke(); }   // the cumulus lines inside the cloud
  g.restore();
}
function shape(path, lw = 1.5, off = 3, fill = P.fill) {
  g.save(); g.lineWidth = lw * 2; g.strokeStyle = P.line; g.stroke(path); g.restore();
  g.save(); g.clip(path); g.fillStyle = P.shade; g.fillRect(-1e4, -1e4, 2e4, 2e4); g.translate(-off * 0.7, -off); g.fillStyle = fill; g.fill(path); g.restore();
}
// a puff of smoke: lobes swell out with a little overshoot, roll, and shrink away
function puff(x, y, { n = 5, size = 13, vx = 0, vy = -18, life = 0.8, spread = 1 } = {}) {
  const lobes = Array.from({ length: n }, (_, i) => ({ a: (i / n) * TAU + rnd(0.6), d: rnd(0.25, 0.9) * size * spread, r: rnd(0.55, 1) * size, ph: rnd(TAU), sp: rnd(0.6, 1.3) }));
  lobes.unshift({ a: 0, d: 0, r: size, ph: 0, sp: 1 });
  add(life, (k, t) => {
    const grow = back(clamp(t / 0.22)), die = 1 - inn(clamp((k - 0.55) / 0.45)), px = x + vx * out(k) * life, py = y + vy * out(k) * life;
    blob(lobes.map((l) => [px + Math.cos(l.a + t * 0.9 * l.sp) * l.d * (0.5 + out(k) * 0.9), py + Math.sin(l.a + t * 0.9 * l.sp) * l.d * (0.5 + out(k) * 0.9) - out(k) * 5 * l.sp, l.r * grow * die * (1 + Math.sin(t * 9 + l.ph) * 0.05)]), 1.5, true, { lx: 0.5, arcs: size > 6.5, deep: 1.5 });
  });
}
// the impact: pink needles, a star in the shadow tone, and a white star on top; it leaves by its points thinning to nothing
function burst(x, y, { r = 44, spikes = 13, life = 0.34, layer } = {}) {
  const j = Array.from({ length: spikes * 2 }, (_, i) => (i % 2 ? rnd(0.34, 0.5) : rnd(0.75, 1.15))), rot = rnd(TAU), pins = Array.from({ length: 8 }, (_, i) => ({ a: i / 8 * TAU + rnd(0.5), l: rnd(1.25, 1.75), w: rnd(0.03, 0.055) }));
  const star = (R, turn, inner = 1) => { const p = new Path2D(); j.forEach((m, i) => { const a = rot + turn + (i / j.length) * TAU, rr = R * (i % 2 ? m * inner : m); p[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }); p.closePath(); return p; };
  add(life, (k) => {
    const R = r * out(clamp(k / 0.3)), hollow = 1 + inn(clamp((k - 0.35) / 0.65)) * 1.3, r0 = R * 0.6 * Math.min(1.9, hollow);
    g.save(); g.fillStyle = P.accent; g.beginPath(); for (const n of pins) { const l = R * n.l; if (l <= r0) continue; g.moveTo(x + Math.cos(n.a - n.w) * r0, y + Math.sin(n.a - n.w) * r0); g.lineTo(x + Math.cos(n.a) * l, y + Math.sin(n.a) * l); g.lineTo(x + Math.cos(n.a + n.w) * r0, y + Math.sin(n.a + n.w) * r0); } g.fill(); g.restore();
    const big = star(R * 1.16, 0.19, hollow); g.save(); g.fillStyle = P.shade; g.fill(big); g.strokeStyle = P.line; g.lineWidth = 1.2; g.stroke(big); g.restore();
    shape(star(R * 0.84, 0, hollow), 1.4, 3);
  }, layer);
}
// chips of crystal: long facets with one edge line, tumbling and falling
function shards(x, y, { n = 7, speed = 190, size = 5, life = 0.75, dir = -Math.PI / 2, arc = Math.PI, grav = 420 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = dir + rnd(-arc, arc) / 2, v = speed * rnd(0.5, 1.15), s = size * rnd(0.6, 1.4), spin = rnd(-7, 7), pts = [[-1.4, 0.1], [-0.6, -0.7], [1.2, -0.45], [1.5, 0.15], [0.4, 0.75]].map(([px, py]) => [px * rnd(0.8, 1.2), py * rnd(0.8, 1.2)]);
    add(life * rnd(0.7, 1), (k, t) => {
      const px = x + Math.cos(a) * v * t, py = y + Math.sin(a) * v * t + grav * t * t, sc = s * (1 - inn(clamp((k - 0.6) / 0.4)));
      g.translate(px, py); g.rotate(spin * t + a); const p = new Path2D(); pts.forEach(([u, w], q) => p[q ? 'lineTo' : 'moveTo'](u * sc, w * sc)); p.closePath(); shape(p, 1.1, sc * 0.45, P.fill);
      if (sc > 2.5) { g.strokeStyle = P.line; g.lineWidth = 0.9; g.beginPath(); g.moveTo(pts[1][0] * sc, pts[1][1] * sc); g.lineTo(pts[4][0] * sc, pts[4][1] * sc); g.stroke(); }
    });
  }
}
function ring(x, y, { rx = 40, ry = 12, life = 0.5, w = 5 } = {}) {
  add(life, (k) => { const s = out(k), lw = w * (1 - k); g.beginPath(); g.ellipse(x, y, rx * (0.3 + s), ry * (0.3 + s), 0, 0, TAU); g.strokeStyle = P.line; g.lineWidth = lw + 2.4; g.stroke(); g.strokeStyle = P.fill; g.lineWidth = lw; if (lw > 0.3) g.stroke(); });
}
// a splash crown: tongues of water rise out of a line and fall back with foam on their tips, drops fly
function splash(x, y, { w = 34, h = 26, life = 0.7 } = {}) {
  const n = 7, ts = Array.from({ length: n }, (_, i) => ({ u: i / (n - 1) - 0.5, h: h * rnd(0.55, 1.1) * (1 - Math.abs(i / (n - 1) - 0.5) * 0.7), lean: rnd(-0.4, 0.4), d: rnd(0, 0.14) }));
  add(life, (k) => {
    const p = new Path2D(), tips = []; p.moveTo(x - w * 0.62, y);
    ts.forEach((s) => { const kk = clamp((k - s.d) / 0.8), up = Math.sin(kk * Math.PI) * s.h * (1 - kk * 0.25), bx = x + s.u * w, half = w / n * 0.62, tx = bx + (s.u * 1.6 + s.lean) * up * 0.5; tips.push([tx, y - up, up]); p.quadraticCurveTo(bx - half, y - up * 0.25, tx, y - up); p.quadraticCurveTo(bx + half * 0.5, y - up * 0.3, bx + half, y); });
    p.lineTo(x + w * 0.62, y); p.closePath();
    g.save(); g.lineWidth = 2.8; g.strokeStyle = P.line; g.stroke(p); g.restore(); g.fillStyle = P.shade; g.fill(p);
    g.save(); g.clip(p); g.fillStyle = P.fill; for (const [tx, ty, up] of tips) if (up > 4) { g.beginPath(); g.ellipse(tx, ty + up * 0.2, up * 0.2 + 1.4, up * 0.34, 0, 0, TAU); g.fill(); } g.restore();
  });
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + rnd(-1.1, 1.1), v = rnd(100, 210), r0 = rnd(2, 4);   // drops are teardrops, pointed the way they came from
    add(life * rnd(0.8, 1.15), (k, t) => { const px = x + Math.cos(a) * v * t, py = y - 6 + Math.sin(a) * v * t + 520 * t * t, r = r0 * (1 - inn(clamp((k - 0.6) / 0.4))), ang = Math.atan2(Math.sin(a) * v + 1040 * t, Math.cos(a) * v), d = new Path2D();
      g.translate(px, py); g.rotate(ang); d.moveTo(-r * 2.6, 0); d.quadraticCurveTo(-r * 0.6, -r * 1.05, r * 0.5, -r * 0.9); d.arc(r * 0.4, 0, r * 0.95, -1.4, 1.4); d.quadraticCurveTo(-r * 0.6, r * 1.05, -r * 2.6, 0); if (r > 0.5) shape(d, 1, r * 0.5); }); }
}
// a slash: a crescent whose head races ahead and whose tail catches up
function slash(x, y, { len = 110, ang = -0.5, life = 0.42, thick = 15, col } = {}) {
  const R = len * 0.9, cx = x - Math.cos(ang - Math.PI / 2) * R * 0.86, cy = y - Math.sin(ang - Math.PI / 2) * R * 0.86, a0 = ang - Math.PI / 2 - 0.62, sweep = 1.24, c = col || P.accent;
  add(life, (k) => {
    const head = out(clamp(k / 0.42)), tail = inn(clamp((k - 0.22) / 0.78)); if (head - tail < 0.01) return;
    const cres = (T) => { const p = new Path2D(), N = 26; for (let i = 0; i <= N; i++) { const u = lerp(tail, head, i / N), a = a0 + sweep * u; p[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * R, cy + Math.sin(a) * R); } for (let i = N; i >= 0; i--) { const q = i / N, u = lerp(tail, head, q), a = a0 + sweep * u, rr = R - T * Math.sin(q * Math.PI) ** 0.7; p.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } p.closePath(); return p; };
    g.save(); g.fillStyle = c; g.fill(cres(thick)); g.restore(); g.fillStyle = P.fill; g.fill(cres(thick * 0.42));
    g.strokeStyle = P.line; g.lineWidth = 1.3; g.stroke(cres(thick));
  });
}
// speed lines: strokes that shoot out one way and thin away
function lines(x, y, { n = 7, dir = Math.PI, len = 46, spread = 26, life = 0.3 } = {}) {
  for (let i = 0; i < n; i++) { const o = rnd(-spread, spread), l = len * rnd(0.5, 1.3), d = rnd(0, 0.25), w = rnd(1, 2.6); add(life, (k) => { const kk = clamp((k - d) / (1 - d)), a = out(kk), b = inn(kk), px = x - Math.sin(dir) * o, py = y + Math.cos(dir) * o; g.strokeStyle = P.line; g.lineWidth = w * (1 - b); g.beginPath(); g.moveTo(px + Math.cos(dir) * l * b * 1.4, py + Math.sin(dir) * l * b * 1.4); g.lineTo(px + Math.cos(dir) * l * (0.2 + a * 1.2), py + Math.sin(dir) * l * (0.2 + a * 1.2)); if (kk > 0) g.stroke(); }); }
}
// accent ticks: little wedges that point at something and fly off it
function ticks(x, y, { n = 3, r = 16, len = 9, dir = -0.9, life = 0.4, fan = 0.42 } = {}) {
  add(life, (k) => { const a = out(clamp(k / 0.5)), b = inn(clamp((k - 0.4) / 0.6)); g.save(); g.fillStyle = P.accent; g.beginPath();
    for (let i = 0; i < n; i++) { const an = dir + (i - (n - 1) / 2) * fan, r0 = r + len * b * 1.25, r1 = r + len * a * 1.25, hw = 0.07 + 2.2 / (r1 + 8); if (r1 - r0 < 0.6) continue; g.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); g.lineTo(x + Math.cos(an - hw) * r1, y + Math.sin(an - hw) * r1); g.lineTo(x + Math.cos(an + hw) * r1, y + Math.sin(an + hw) * r1); g.closePath(); }
    g.fill(); g.restore(); });
}
// a smoke ring: a lumpy hoop that drifts off and shrinks
function donut(x, y, { r = 20, vx = 30, vy = -50, life = 1, tilt = -0.25 } = {}) {
  const ph = rnd(TAU);
  add(life, (k, t) => { const s = back(clamp(t / 0.22)) * (1 - inn(clamp((k - 0.6) / 0.4))), px = x + vx * out(k) * life, py = y + vy * out(k) * life, hole = 0.42 + 0.22 * k, p = new Path2D(); if (s < 0.03) return;
    for (const [m, bump] of [[1, 0.09], [hole, 0.05]]) for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU, rr = r * s * m * (1 + bump * Math.sin(a * 9 + ph + t * 2)), ex = Math.cos(a) * rr, ey = Math.sin(a) * rr * 0.52; p[i ? 'lineTo' : 'moveTo'](px + ex * Math.cos(tilt) - ey * Math.sin(tilt), py + ex * Math.sin(tilt) + ey * Math.cos(tilt)); }
    g.save(); g.lineWidth = 3; g.strokeStyle = P.line; g.stroke(p); g.restore(); g.save(); g.clip(p, 'evenodd'); g.fillStyle = P.shade; g.fillRect(-1e4, -1e4, 2e4, 2e4); g.translate(r * 0.06, -r * 0.2); g.fillStyle = P.fill; g.fill(p, 'evenodd'); g.restore(); });
}
// wobble marks: the two little arcs beside something that has just stopped
function wob(x, y, { dir = 1, r = 16, life = 0.45 } = {}) {
  add(life, (k) => { g.strokeStyle = P.line; g.lineWidth = 2.2 * (1 - k); if (g.lineWidth < 0.2) return; g.beginPath(); for (const d of [0, 7]) { const rr = r + d + out(k) * 8, c = dir > 0 ? 0 : Math.PI; g.moveTo(x - dir * r + Math.cos(c - 0.45) * rr, y + Math.sin(c - 0.45) * rr); g.arc(x - dir * r, y, rr, c - 0.45, c + 0.45); } g.stroke(); });
}
// a glint: a four-pointed sparkle that opens and closes
function kira(x, y, { r = 9, life = 0.6, col } = {}) {
  add(life, (k, t) => { const s = r * Math.sin(k * Math.PI) ** 0.6, q = s * 0.16, p = new Path2D(); g.translate(x, y); g.rotate(Math.sin(t * 3) * 0.2); p.moveTo(0, -s); p.quadraticCurveTo(q, -q, s * 0.7, 0); p.quadraticCurveTo(q, q, 0, s); p.quadraticCurveTo(-q, q, -s * 0.7, 0); p.quadraticCurveTo(-q, -q, 0, -s);
    g.save(); g.fillStyle = col || P.fill; g.fill(p); g.restore(); g.strokeStyle = P.accent; g.lineWidth = 2; g.stroke(p); });
}

// ───────── the lettering ─────────
// Six sound-effect words, painted with GPT Image and traced into paths by tools/trace.py: [width, height, path].
// >>> words (written by tools/trace.py)
const WORDS = {"don":[520,297,"M3 290C4 287 6 283 7 281C9 277 18 252 19 248C20 246 19 246 15 250C13 253 11 255 11 254C12 253 15 242 19 230C24 218 30 195 34 180C38 165 43 144 46 133C49 122 51 113 51 113C50 113 50 110 51 107C52 104 52 98 52 94C53 86 57 69 63 54C69 41 69 40 70 41C71 42 72 42 74 40L76 38L75 40C75 43 76 42 85 34C90 28 94 24 95 24C95 24 94 27 92 30C87 40 88 40 100 28C106 22 111 18 111 18C111 18 110 20 109 22C107 28 108 28 114 23C123 15 124 15 122 19C120 21 120 22 121 21C124 20 132 14 136 10C141 5 141 5 136 14C132 23 132 23 135 23C136 22 136 22 135 24C133 29 131 36 132 36C132 36 133 35 135 34C136 32 138 31 138 31C138 31 136 39 132 48C123 71 97 147 98 148C98 148 101 147 105 145C108 144 116 141 122 138C128 136 141 131 150 128C179 117 232 98 234 98C235 98 233 101 229 104C226 108 223 111 223 111C224 111 222 114 219 117C213 124 213 124 216 123C218 123 218 124 214 128C209 133 205 139 204 142C203 143 203 143 205 142C208 140 208 141 204 147C201 150 200 152 201 152C204 151 203 152 197 159C193 163 192 166 194 166C196 166 192 169 182 173C176 175 172 177 170 176C169 176 166 177 163 178C157 180 144 185 143 185C143 185 143 184 144 184C144 183 144 183 143 183C142 183 137 185 132 186C122 189 99 198 90 201L85 204L80 216C73 232 61 258 59 261C57 263 57 263 58 258L58 252L55 255C54 256 52 259 51 260C50 261 49 262 50 261C51 258 48 261 43 267C37 274 36 274 39 268C40 265 41 262 41 262C41 261 36 266 29 273C23 280 18 285 17 285C17 284 18 282 19 279C23 271 22 272 14 281C10 286 5 291 4 292L1 296L3 290ZM223 274C222 274 221 273 220 273C219 273 218 272 218 271C218 266 214 260 212 260C211 261 210 260 210 258C208 251 208 247 208 247C208 246 208 246 207 246C207 246 206 243 207 239C207 234 207 232 206 232C205 233 205 232 206 227C207 225 210 222 214 218C222 213 223 212 220 217C218 221 220 220 233 211C244 203 247 201 243 205C242 207 241 208 241 208C242 210 296 172 333 144C343 137 352 131 353 130C356 129 382 110 397 98C403 94 408 90 408 90C408 91 403 99 397 107C393 112 393 116 396 111C397 111 398 110 398 110C398 111 394 116 390 122C379 135 379 136 382 134C384 133 384 133 383 134C379 140 373 148 372 149C371 151 371 151 381 143C385 140 388 138 389 138C389 138 386 142 382 147C378 151 375 155 375 156C377 158 353 182 344 189C342 191 332 199 323 206C304 222 280 241 277 242C276 242 273 244 269 247C259 255 226 276 225 276C225 276 224 275 223 274ZM373 264C372 264 372 263 372 262C372 261 371 259 370 259C369 257 369 257 370 252C373 244 372 243 370 246C366 249 366 248 369 243C373 237 378 226 378 225C378 222 386 217 398 211C411 204 415 202 413 204C412 205 412 206 412 207C413 207 429 203 432 202C434 201 435 200 429 212C425 222 425 222 432 217C436 214 436 214 428 226C424 231 420 238 418 242L414 249L403 255C397 258 391 261 389 263C384 266 384 266 385 263C385 261 383 261 378 264C375 265 374 265 373 264ZM392 199C392 196 438 54 441 46C444 41 453 28 458 23C463 18 463 18 462 21C461 23 460 25 459 27L458 29L461 27C462 26 467 22 470 19C477 13 477 13 473 21C471 24 470 27 470 27C471 27 476 24 483 20C496 12 497 11 495 14C491 17 494 16 505 9C512 5 517 2 517 2C518 2 515 6 512 10C507 17 500 29 502 29C502 29 504 28 506 26C509 25 511 23 512 23C514 22 514 21 507 32C499 44 497 49 502 44C505 41 504 44 498 55C488 70 483 79 477 92C473 98 470 103 470 104C467 107 455 132 456 131C460 128 459 131 450 145C446 153 438 166 434 174C425 190 425 191 426 184L426 179L420 184C416 188 412 191 411 193C409 196 408 194 410 189C411 185 410 185 405 191C403 193 401 195 401 194C402 191 401 192 396 196C394 199 392 200 392 199ZM226 147C228 140 228 140 226 141C225 141 225 140 227 136C232 128 235 122 234 121C234 120 235 118 237 115C245 103 245 103 242 104C241 105 241 104 244 102C250 96 260 88 264 87C268 86 282 87 281 88C281 89 283 89 285 89C287 89 289 90 289 90C289 91 294 92 299 94C304 95 309 96 309 97C310 98 319 102 325 102C331 103 331 103 326 108C325 110 323 113 323 113C323 114 320 118 316 121C312 125 309 129 309 129C310 129 307 132 304 136L299 142L290 142C279 141 265 142 245 148C235 150 226 152 225 153L223 153L226 147ZM133 121C133 103 157 28 160 39C160 41 161 41 166 35C173 28 174 28 173 32C171 36 172 36 180 32C184 30 188 28 188 29C189 29 192 28 195 26C201 22 202 22 199 29C197 31 196 36 195 39C192 46 167 99 165 101C164 102 164 102 164 100C164 99 163 100 158 104C153 109 153 109 153 107L153 104L149 107C147 108 143 112 139 116C136 120 133 122 133 121ZM180 104C180 97 192 64 203 43C210 29 220 16 218 22L218 25L225 21C231 16 233 15 231 18C226 25 230 23 245 13C251 10 255 7 255 8C255 8 253 12 251 15C246 22 245 25 248 22C251 20 250 22 246 30C241 38 240 39 243 38C245 37 245 36 228 62C212 85 208 91 209 87C209 85 208 84 207 86C206 86 204 88 202 90L198 93L199 90C200 87 198 88 188 98C184 102 180 105 180 104Z"],"gogo":[520,288,"M1 284C1 281 1 274 1 268L2 257L15 253C22 250 32 247 37 246C42 245 46 244 46 243C47 243 50 217 49 216C48 215 31 222 19 228C4 235 6 235 6 231C7 229 7 229 6 229C4 230 4 231 6 220C8 215 9 208 10 206C10 202 10 201 13 201C15 200 24 197 34 194C43 190 51 187 52 187C52 187 52 189 52 192C52 198 53 199 60 196C66 193 79 190 80 190C80 191 79 198 77 207C73 225 70 242 70 254C69 263 72 261 44 270C28 275 18 279 1 288C0 288 0 286 1 284ZM84 281C84 280 85 273 87 263C88 254 89 245 89 243L88 239L102 234C109 232 122 228 129 226C136 224 143 222 143 222C143 221 149 189 149 187C149 185 148 186 133 192C119 197 105 204 97 209L93 211L93 207C94 203 94 202 93 203C91 203 91 202 93 198C98 186 102 173 102 169C102 167 103 166 103 166C109 164 125 159 137 154C145 151 151 149 152 149C152 149 153 152 154 156C154 160 154 163 155 163C155 163 159 161 164 159C171 156 190 152 191 153C191 153 189 164 185 178C179 205 174 231 174 240L174 245L163 248C157 250 148 253 142 255C131 258 101 271 90 278C85 281 84 281 84 281ZM191 269C191 268 192 260 193 251C195 241 196 230 196 225L196 217L200 216C203 215 217 211 233 206C249 200 263 196 265 196C267 195 268 194 269 194C269 193 276 149 276 148C275 147 241 160 230 166C226 168 219 172 214 175C201 182 202 183 205 165C206 159 208 147 209 140L211 126L215 125C217 125 231 121 247 116C263 110 276 106 278 106C280 105 280 105 281 114C281 122 281 123 283 123C284 122 289 120 294 118C307 113 327 109 327 112C327 113 324 125 321 139C312 173 305 212 307 219L307 223L298 226C293 228 283 231 276 232C259 237 209 259 196 267C192 269 192 269 191 269ZM321 255C321 253 333 202 333 201C334 201 333 199 332 197C330 192 331 191 338 191C342 190 357 187 372 184C387 180 404 176 410 175C415 174 420 173 420 172C421 172 433 117 433 115C433 113 430 114 418 118C396 124 369 136 353 146C348 150 344 152 343 152C343 151 343 148 344 144C346 137 346 136 343 138C340 139 340 139 344 124C349 108 352 94 352 88C352 83 353 81 356 81C359 81 381 75 402 69C421 63 436 59 437 59C437 60 437 65 438 70C438 76 439 81 439 82C440 82 446 80 454 77C466 72 469 72 481 70C500 68 498 68 496 73C496 76 493 84 491 92C489 99 485 112 483 119C478 132 470 167 469 178C468 182 467 187 466 191C465 195 465 200 465 203L464 209L455 211C450 212 441 215 435 216C429 218 420 221 415 223C395 228 372 237 353 246C332 257 332 257 332 254C333 251 331 251 326 254C322 257 321 258 321 255ZM55 179L56 164L64 160C69 158 74 156 74 157C74 157 73 164 71 173L67 188L62 191C59 193 56 194 56 194C55 194 55 187 55 179ZM72 188C72 186 78 162 79 161C80 160 93 155 94 155C95 155 93 162 89 173L85 184L79 186C73 188 72 188 72 188ZM157 140C157 130 157 121 156 119C156 116 156 115 159 115C160 114 166 112 171 109C176 107 181 105 181 106C182 106 181 111 179 116C178 122 176 132 175 138C174 145 173 151 173 151C172 151 158 158 158 158C157 158 157 150 157 140ZM178 149C178 146 185 115 186 114C187 113 202 107 204 107C206 107 205 113 199 131L195 146L188 148C184 149 180 150 179 150C179 150 178 150 178 149ZM285 103C285 95 285 84 285 78C285 67 285 67 288 66C293 65 300 63 308 59C320 54 319 54 315 69C311 81 308 93 306 102C305 108 305 109 302 109C301 110 296 112 292 114C288 115 285 117 285 117C284 117 284 111 285 103ZM311 106C311 105 313 97 316 87C318 77 320 68 321 67C321 66 322 65 323 64C325 63 345 56 346 56C348 56 347 62 341 78C332 104 334 102 323 105C318 106 313 107 312 108C312 108 311 107 311 106ZM443 74C442 73 442 15 442 14C443 14 445 13 447 13C450 13 458 10 466 6C474 3 481 0 481 1C482 1 480 10 478 20C475 30 472 45 470 52C469 60 467 66 467 66C466 66 461 68 455 71C442 76 443 75 443 74ZM475 64C475 64 478 52 481 37L487 11L503 5C512 2 519 0 519 1C521 2 505 55 502 59C502 59 497 61 490 62C484 63 478 64 477 65C476 65 475 65 475 64Z"],"kachi":[520,295,"M28 292C28 290 53 225 68 186C72 175 75 167 75 167C73 167 30 186 15 193C8 196 2 199 1 199C1 198 25 138 26 137C26 136 41 132 59 127C76 122 91 118 92 118C92 117 97 103 102 85C108 68 113 53 114 53C114 52 118 51 122 51C126 50 138 48 147 46C157 45 166 43 166 44C168 45 167 49 156 74C149 89 144 101 144 102C144 103 171 94 195 86C218 78 216 78 220 84C221 87 224 92 227 96L231 102L221 122C208 150 203 160 188 196C163 260 160 265 148 265C143 265 139 262 125 247C114 235 111 231 102 228C97 226 97 226 111 223C117 223 125 221 130 220L139 218L141 213C143 208 168 136 168 135C167 135 157 138 145 142L124 149L108 180C90 219 84 232 82 236C80 241 79 243 73 246C70 248 60 259 49 270C26 295 28 294 28 292ZM258 263C258 261 271 217 281 187C287 168 292 152 292 151C291 151 235 175 220 183C214 186 210 188 209 188C209 187 217 151 219 145C220 142 221 142 262 126C285 117 304 110 304 110C304 109 310 81 310 80C309 80 289 89 263 101C252 106 244 110 243 110C243 109 245 106 247 102C252 92 252 92 245 92C242 92 239 92 239 92C240 88 378 1 383 1C384 1 383 3 382 5C379 10 379 11 384 15C387 17 387 18 387 20C386 25 388 28 395 35L402 42L399 43C396 44 358 60 357 60C357 61 347 94 347 95C347 96 359 92 373 87C403 77 428 69 429 69C429 69 425 75 419 82C413 89 406 98 403 101C398 109 401 108 362 124C348 129 336 134 336 134C336 135 333 141 330 150C307 205 308 203 301 210C297 214 292 221 288 226C273 245 258 264 258 263ZM427 204C427 199 485 90 490 84C491 84 494 84 500 85C505 86 512 87 514 87C517 88 519 89 520 90C520 90 510 105 497 124L475 156L451 180C438 194 427 204 427 204ZM406 136C407 124 408 114 408 113C409 112 433 98 435 98C436 98 437 96 432 121L427 143L417 150C412 155 407 158 406 158C406 158 406 148 406 136ZM439 135C440 124 445 90 445 89C447 88 469 80 470 81C470 81 468 91 465 103L460 124L450 134C445 139 440 143 440 143C439 143 439 140 439 135Z"],"pon":[520,297,"M323 296C302 290 292 271 300 254C305 244 313 239 330 234C383 222 420 197 456 149C473 126 477 123 490 123C502 123 515 131 518 142C527 165 495 216 452 248C410 280 348 303 323 296ZM154 295C141 292 137 288 134 273C132 265 125 222 120 190C116 160 116 163 113 164C112 164 99 168 85 172C41 186 32 187 19 183C4 179-3 162 2 147C10 127 29 118 84 107C96 104 107 102 107 101C107 101 106 98 105 94C99 74 97 61 101 53C107 40 128 29 147 29C169 29 177 40 177 73C177 83 177 88 178 88C179 88 185 86 193 84L207 81L204 76C191 56 197 29 217 14C242-4 271-4 289 15C314 42 302 84 266 96L260 98L260 105C259 125 245 133 191 145C180 148 180 147 182 159C186 175 192 223 194 242C197 276 193 286 175 293C169 295 157 296 154 295ZM42 292C26 286 21 269 27 246C35 221 50 196 62 189C69 185 86 185 93 189C109 197 110 213 97 249C85 281 74 292 55 293C48 293 44 293 42 292ZM240 251C227 246 218 234 203 204C192 183 192 175 203 165C220 149 242 154 266 178C284 196 288 209 282 227C276 243 253 256 240 251ZM366 172C350 167 309 151 303 147C289 136 289 116 303 100C316 85 333 83 360 94C389 106 404 122 404 138C404 160 386 177 366 172ZM256 63C268 57 270 40 258 34C244 26 226 43 234 56C238 64 248 67 256 63Z"],"shu":[520,266,"M8 258C11 255 14 252 14 251C14 251 15 250 16 249C17 248 19 244 19 242C19 242 20 241 20 240C22 237 22 236 19 238C16 239 16 238 21 234C25 231 26 229 26 227C26 226 27 225 27 224C28 223 29 222 28 222C28 221 60 197 61 198C62 198 86 181 120 157C144 140 146 138 171 118C216 81 246 58 270 42C277 37 277 37 256 58C235 78 217 98 182 138C139 187 131 194 76 230C56 242 57 242 63 236C66 233 68 230 68 230C67 230 67 230 51 240C45 244 38 249 36 250L32 252L36 247L42 242L37 245C35 246 31 249 28 250C24 253 22 254 24 252C24 251 24 251 23 252C22 252 17 255 12 258L2 264L8 258ZM24 221C28 216 42 207 40 209C38 212 30 218 24 221L20 223L24 221ZM192 189C192 188 194 187 197 185C202 182 203 180 200 181C199 182 202 179 206 175C210 171 213 168 212 168C211 168 211 168 212 166C216 161 216 160 213 161C211 162 209 162 209 162C209 161 217 156 218 156C218 156 220 155 222 153C227 149 250 140 277 132C287 129 290 128 291 127C291 125 294 118 298 109C301 101 304 94 304 93C304 93 291 99 276 106C261 113 247 119 244 120L240 122L242 120C243 118 244 117 244 116C244 116 245 115 246 114C246 113 247 112 247 111C246 111 247 109 247 108C249 106 248 103 246 103C245 104 246 102 248 100C253 94 253 94 249 94C247 95 245 95 245 95C245 94 257 88 258 88C258 89 262 87 266 86C282 78 340 57 341 58C341 59 340 60 338 62C335 67 336 67 344 64C347 63 349 62 350 62C350 62 346 68 342 74C333 88 313 122 314 123C314 123 325 121 336 118C361 111 367 110 366 111C366 112 365 112 364 112C363 112 363 112 364 113C365 114 366 115 365 115C365 116 368 116 373 116L380 115L376 117C373 118 360 123 348 127C336 132 323 136 321 138C319 139 300 146 280 154C259 162 233 172 222 177C192 189 192 189 192 189ZM38 158C43 153 46 150 46 150C45 150 46 148 46 146C47 145 47 143 47 143C46 143 46 142 47 141C48 139 48 139 47 139C45 140 45 139 47 137L49 133L44 136L40 138L46 132C54 124 55 120 48 124C43 127 42 127 46 122C53 115 77 103 108 91C123 85 138 79 150 73C156 71 163 68 166 68C168 67 172 66 174 65C180 62 180 63 172 69C164 76 160 80 164 79C165 78 164 79 162 81C161 82 160 84 160 84C159 85 155 89 149 93C138 100 132 105 135 103C145 98 108 124 82 139C63 150 61 151 66 147C71 143 68 144 56 151C50 155 45 158 44 158C43 158 40 159 36 161L30 165L38 158ZM379 158C380 157 386 149 392 141C411 116 432 84 453 48C463 32 471 22 472 22C472 23 475 22 477 20C480 18 482 17 483 17C483 17 487 15 492 13C497 11 501 9 502 9C503 10 513 5 516 3C526-6 468 68 451 84C441 95 413 124 392 146C384 154 378 160 379 158ZM380 93C380 90 380 81 380 73C381 55 384 41 386 45C386 46 388 45 390 43C392 41 393 40 393 41C393 41 394 41 395 40C396 39 398 38 399 37C400 37 403 36 405 34C407 33 409 32 410 32C410 32 412 30 415 28C417 26 419 25 419 25C419 29 398 75 395 78C394 79 392 82 390 84C388 86 386 89 385 90C384 91 383 93 382 95C379 99 379 99 380 93ZM46 88C57 78 59 76 62 73C63 71 66 69 67 68C69 66 69 66 66 68C62 69 61 69 64 67C66 65 67 62 65 63C63 65 64 62 67 58L70 53L67 54C65 54 62 55 61 55C60 56 61 54 65 52C69 50 72 47 74 46C80 40 154 13 159 15C160 15 160 15 160 14C159 13 159 13 160 14C161 14 167 12 174 9C186 5 189 4 184 7C174 14 168 21 172 21C173 21 171 24 167 28C164 32 162 34 164 34C168 32 160 38 147 45C140 49 132 54 128 57C124 59 115 64 107 69C99 73 90 78 86 80C82 82 80 82 81 82C81 81 82 80 82 80C82 80 83 79 84 78C85 76 82 77 73 82C66 86 60 89 60 89C59 89 60 88 64 81C65 79 64 80 58 82C55 85 49 87 47 89L42 91L46 88ZM412 83C412 82 416 59 418 50C420 41 425 30 426 31C426 32 432 28 433 26C434 25 439 23 451 17C453 16 456 14 457 13C461 10 461 10 448 35C434 60 433 61 425 69C421 73 416 78 415 80C413 84 412 85 412 83Z"],"zuza":[520,287,"M3 282C6 279 27 251 63 203C78 183 99 155 109 141C119 128 128 115 129 113C130 111 131 110 131 110C130 108 61 142 35 157C28 161 22 164 22 164C22 163 23 161 25 158C31 146 40 118 40 112C40 111 39 109 38 108C38 107 37 106 37 106C37 105 48 101 67 94C82 89 92 85 155 61C177 53 195 46 195 46C195 46 195 52 193 60C192 67 190 79 189 85L188 97L166 126C153 142 143 155 143 156C143 156 148 159 154 162C172 171 213 194 215 196C215 197 213 199 211 202C203 210 189 236 189 241C189 242 189 243 188 243C188 243 152 217 132 201L119 191L101 207C79 226 53 248 52 248C52 248 52 247 53 247C53 246 54 245 54 245C54 244 52 245 26 266C16 275 6 282 4 283L2 285L3 282ZM287 256C297 230 308 203 314 189C326 161 340 127 340 126C339 126 307 137 306 138C306 138 303 147 299 158L293 176L285 183C281 187 274 193 271 197C268 201 266 204 265 204C265 204 270 173 273 154C273 151 273 148 273 148C270 148 223 167 211 173C203 177 202 177 205 171C207 167 217 136 217 134C217 133 216 131 216 130C214 128 214 128 247 119C265 114 280 110 280 110C280 109 281 102 283 93C290 64 289 66 295 63C303 59 336 45 336 45C337 45 334 52 330 61C322 81 316 99 316 100C317 100 325 98 334 95L351 90L356 77C363 57 368 44 370 42C372 39 412 20 413 21C413 22 411 28 408 35C400 52 391 78 391 79C391 80 395 80 407 77C416 75 428 72 434 71L445 68L443 71C417 103 415 105 410 106C407 107 399 109 393 111L381 114L372 136C354 181 351 186 344 194C340 197 333 205 328 212C323 218 311 231 302 242C293 252 286 261 285 261C285 261 286 259 287 256ZM424 202C426 200 436 184 447 166C459 147 472 126 477 119L486 105L493 103C502 100 517 97 518 97C519 97 516 102 512 107C508 112 498 126 489 138C474 159 473 160 458 173C450 180 439 190 435 194C431 197 426 201 425 203L423 204L424 202ZM411 154C411 146 412 136 412 131L412 123L426 115C442 107 443 107 442 110C438 130 431 152 428 153C427 155 422 158 418 162L410 168L411 154ZM442 145C449 108 449 108 454 104C459 101 478 91 479 91C479 91 468 117 462 132C461 134 457 137 452 141C441 149 442 149 442 145ZM193 104C193 103 195 89 198 74C204 36 204 33 207 31C211 28 241 11 242 11C243 11 242 14 240 19C239 23 234 37 229 49C223 68 221 72 218 76C208 88 196 102 194 104L192 106L193 104ZM223 87C223 85 243 31 246 24C247 21 250 19 256 15C270 7 282 1 282 2C281 3 278 11 274 20C270 29 264 42 261 50L256 62L248 68C244 71 237 76 232 81C227 85 223 88 223 87ZM408 70C408 66 425 22 429 18C431 15 457 1 458 2C458 3 453 13 446 26C435 48 434 50 429 54C426 56 420 61 416 65C411 68 408 71 408 70ZM437 63C444 43 455 20 458 18C462 14 488 0 489 1C489 2 470 37 465 44C464 45 458 50 451 54C436 66 436 66 437 63Z"]};
// <<< words
const shapes = {}, baked = new Map();
const word = (name) => shapes[name] || (WORDS[name] && (shapes[name] = { w: WORDS[name][0], h: WORDS[name][1], p: new Path2D(WORDS[name][2]) }));
// The outline and fill are painted once per word and colour, so a word on screen costs one drawImage a frame.
function bake(name, fc, oc, dots) {
  const key = name + fc + oc + dots; let c = baked.get(key); if (c) return c;
  const s = word(name), pad = 24, e = s.w * 0.035;
  c = document.createElement('canvas'); c.width = s.w + pad * 2; c.height = s.h + pad * 2;
  const x = c.getContext('2d'); x.translate(pad, pad); x.lineJoin = 'round';
  x.strokeStyle = x.fillStyle = oc; x.lineWidth = e * 2; x.stroke(s.p); x.fill(s.p);
  if (dots) {   // screentone letters: dots in the outline colour on white
    const t = document.createElement('canvas'); t.width = 22; t.height = 44; const y = t.getContext('2d'); y.fillStyle = '#fff'; y.fillRect(0, 0, 22, 44); y.fillStyle = oc; y.beginPath();
    for (const [px, py] of [[0, 0], [22, 0], [0, 44], [22, 44], [11, 22]]) { y.moveTo(px + 5.2, py); y.arc(px, py, 5.2, 0, TAU); } y.fill(); x.fillStyle = x.createPattern(t, 'repeat');
  } else x.fillStyle = fc;
  x.fill(s.p); baked.set(key, c); return c;
}
// A word lands a size too big and wobbles while it stays. col: fill colour. edge: outline colour. dots: screentone letters.
function sfx(name, x, y, { size = 64, rot = -0.14, life = 0.95, col, edge, dots } = {}) {
  if (!word(name)) return; const s = new Spring(0.2, 520, 17); s.to = 1; let lastT = 0;
  const c = bake(name, col || P.sfx[0], edge || P.sfx[1], !!dots), k0 = size / WORDS[name][0];
  add(life, (k, t) => {
    const sc = s.step(t - lastT) * (1 - inn(clamp((k - 0.86) / 0.14))) * k0; lastT = t;
    g.translate(x + Math.sin(t * 31) * 0.8, y + Math.cos(t * 27) * 0.8); g.rotate(rot + Math.sin(t * 6) * 0.03);
    g.drawImage(c, -c.width / 2 * sc, -c.height / 2 * sc, c.width * sc, c.height * sc);
  });
}
// two lettering styles: hollow (white with an ink edge) and dotted (screentone letters)
const hollow = () => ({ col: '#ffffff', edge: '#1d1a4a' }), dotted = () => ({ dots: true, edge: '#1d1a4a' });

// ───────── for components ─────────
const at = (el, fx = 0.5, fy = 0.5) => { const b = el.getBoundingClientRect(); return { x: b.left + scrollX + b.width * fx, y: b.top + scrollY + b.height * fy, w: b.width, h: b.height }; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// a press: squash flat while held, overshoot on release. Call step(dt) every frame.
function squashy(el, { low = 0.82, k = 520, d = 15, wide = 0.55 } = {}) {
  const s = new Spring(1, k, d), pop = new Spring(1, 300, 12), tilt = new Spring(0, 260, 10);
  el.addEventListener('pointerdown', () => { if (!el.disabled) s.to = low; });
  for (const e of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) el.addEventListener(e, () => { s.to = 1; });
  return { s, pop, tilt, step(dt) { const y = s.step(dt), p = pop.step(dt), r = tilt.step(dt), still = Math.abs(y - 1) < 0.001 && Math.abs(s.v) < 0.01 && Math.abs(p - 1) < 0.001 && Math.abs(r) < 0.02;
    el.style.transform = still ? '' : `rotate(${r}deg) scale(${(1 + (1 - y) * wide) * p}, ${y * p})`; } };
}
const BASE_CSS = `:host{display:inline-block;position:relative;isolation:isolate;vertical-align:middle;color:var(--sk-ink);font:500 15px/1.4 -apple-system,BlinkMacSystemFont,"Inter","Segoe UI",system-ui,sans-serif;-webkit-tap-highlight-color:transparent}
:host([hidden]){display:none}*{box-sizing:border-box}button,input{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
:focus-visible{outline:2.5px solid var(--sk-acc);outline-offset:3px}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
canvas.back{position:absolute;left:-160px;top:-160px;width:calc(100% + 320px);height:calc(100% + 320px);pointer-events:none;z-index:-1}`;
// The base for every component: a shadow root built on first connect, one frame callback on the shared clock while it is on the page.
class Base extends HTMLElement {
  constructor() { super(); this.root = this.attachShadow({ mode: 'open', delegatesFocus: !!this.constructor.delegates }); if (this.constructor.formAssociated) this.internals = this.attachInternals(); }
  connectedCallback() {
    // a component built from its <option>s waits until the parser has read them
    if (!this.ready && this.constructor.fromChildren && document.readyState === 'loading') { if (!this.waiting) { this.waiting = true; document.addEventListener('DOMContentLoaded', () => { this.waiting = false; if (this.isConnected) this.connectedCallback(); }, { once: true }); } return; }
    if (!this.ready) { this.ready = true; this.root.innerHTML = `<style>${BASE_CSS}${this.constructor.css || ''}</style>${this.render()}`; this.setup(); }
    this.tickFn ||= (dt) => this.frame(dt); frames.add(this.tickFn); start();
  }
  disconnectedCallback() { frames.delete(this.tickFn); }
  $(s) { return this.root.querySelector(s); }
  $$(s) { return [...this.root.querySelectorAll(s)]; }
  render() { return ''; } setup() {} frame() {}
  backLayer() { const c = document.createElement('canvas'); c.className = 'back'; c.setAttribute('aria-hidden', 'true'); this.root.prepend(c); return backLayer(c); }
  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail })); }
}
const define = (tag, cls) => { if (!customElements.get(tag)) customElements.define(tag, cls); };

const api = window.SakugaFX = {
  version: 1, paused: false,
  get P() { return P; }, get calm() { return calm; }, get now() { return now; },
  TAU, clamp, lerp, rnd, Spring,
  advance, later, persist, blob, shape, get g() { return g; },
  puff, burst, shards, ring, splash, slash, lines, ticks, donut, wob, kira, sfx, hollow, dotted,
  at, esc, squashy, Base, define,
};
})();
// <<< sakuga core
component(window.SakugaFX);
})();
