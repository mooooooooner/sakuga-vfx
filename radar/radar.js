// Sakuga Radar: cel-shaded anime Power Hexagon / Stat Radar Chart drawn on a high-DPI
// shared-clock canvas with halftone screentone stat fills, dual-series comparison,
// S-rank vertex glints, interactive radial stat drag, and manga speech-bubble callout.
// Plain and razor-sharp at rest; springs burst outward with stagger on entrance and
// detonate with a back-layer impact burst, shards, twin kira glints, and ドン! on powerUp().
//
// Usage:
//   <sakuga-radar show-ranks interactive label="Animator Power"></sakuga-radar>
//   el.items = [{ label: 'Sakuga', value: 96 }, ...];
//   el.axes = ['ATK', 'SPD', ...]; el.series = [{ name: 'Unit-01', tone: 'pri', values: [...] }, ...];
(() => {
'use strict';

function component(fx) {
  const { TAU, clamp, lerp, rnd, Spring, later, esc, burst, shards, puff, ticks, kira, sfx, hollow } = fx;

  const AMBER = '#ff9b54';
  const GREEN = '#38c98a';

  const SIZES = {
    sm: { w: 292, h: 282, R: 74,  lw: 2.6, shX: 4.5, shY: 5.5, lblFont: 9.5,  valFont: 10.5, rankFont: 9.5,  nodeR: 4.8, badgeFont: 13.5, padY: 3, padX: 10 },
    md: { w: 356, h: 344, R: 94,  lw: 3.2, shX: 6,   shY: 7,   lblFont: 11,   valFont: 11.5, rankFont: 10.5, nodeR: 5.8, badgeFont: 15.5, padY: 4, padX: 12 },
    lg: { w: 432, h: 416, R: 120, lw: 3.6, shX: 7,   shY: 8.5, lblFont: 12.5, valFont: 13,   rankFont: 11.5, nodeR: 6.6, badgeFont: 17.5, padY: 4, padX: 14 },
  };

  const DEFAULT_ITEMS = [
    { label: 'Power',      value: 92 },
    { label: 'Speed',      value: 84 },
    { label: 'Range',      value: 74 },
    { label: 'Durability', value: 80 },
    { label: 'Precision',  value: 95 },
    { label: 'Potential',  value: 86 },
  ];

  const RANK_RULES = [
    { min: 0.90, grade: 'S' },
    { min: 0.75, grade: 'A' },
    { min: 0.55, grade: 'B' },
    { min: 0.35, grade: 'C' },
    { min: -1,   grade: 'D' },
  ];

  function rankFor(ratio) {
    for (const r of RANK_RULES) if (ratio >= r.min - 1e-6) return r.grade;
    return 'D';
  }

  function formatVal(v, max) {
    const n = Number(v) || 0;
    if (max <= 2) return (Math.round(n * 100) / 100).toString();
    if (max <= 10 && Math.abs(n - Math.round(n)) > 0.04) return n.toFixed(1);
    return String(Math.round(n));
  }

  function isWhiteLike(c) {
    const s = String(c || '').trim().toLowerCase().replace(/\s+/g, '');
    return s === '#fff' || s === '#ffffff' || s === 'white' || s === 'rgb(255,255,255)';
  }

  class SakugaRadar extends fx.Base {
    static delegates = true;
    static observedAttributes = [
      'size', 'max', 'tone', 'show-ranks', 'interactive', 'label', 'unit', 'data',
    ];

    static css = `
      :host {
        display: inline-block;
        max-width: 100%;
        vertical-align: middle;
        user-select: none;
        -webkit-user-select: none;
        --_w: 356px;
        --_badge-font: 15.5px;
        --_badge-py: 4px;
        --_badge-px: 12px;
      }
      :host([size="sm"]) {
        --_w: 292px; --_badge-font: 13.5px; --_badge-py: 3px; --_badge-px: 10px;
      }
      :host([size="lg"]) {
        --_w: 432px; --_badge-font: 17.5px; --_badge-py: 4px; --_badge-px: 14px;
      }

      .radar {
        position: relative;
        width: min(var(--_w), 100%);
        max-width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        will-change: transform;
      }

      /* ── Multi-series legend pills ── */
      .legend {
        display: none;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 6px;
        z-index: 4;
      }
      .legend.is-multi {
        display: flex;
      }
      .leg-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border: 2.4px solid var(--sk-ink);
        border-radius: 999px;
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: 3px 3px 0 var(--sk-soft);
        font: 800 12px/1.15 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition: transform 0.08s ease;
      }
      .leg-btn:hover { transform: translateY(-1px); }
      .leg-btn.is-active {
        box-shadow: 3px 3px 0 var(--leg-col, var(--sk-acc));
      }
      .leg-btn:not(.is-active) {
        border-color: var(--sk-dim);
        color: var(--sk-dim);
        box-shadow: 2px 2px 0 var(--sk-track);
      }
      .leg-dot {
        width: 10px;
        height: 10px;
        border: 2px solid var(--sk-ink);
        border-radius: 999px;
        background: var(--leg-col, var(--sk-pri));
        flex: none;
      }
      .leg-btn.is-diamond .leg-dot {
        border-radius: 2px;
        transform: rotate(45deg);
        width: 9px;
        height: 9px;
      }
      .leg-avg {
        font-variant-numeric: tabular-nums;
        color: var(--sk-dim);
        font-weight: 800;
      }
      .leg-btn.is-active .leg-avg {
        color: var(--sk-ink);
      }

      /* ── Radar canvas stage ── */
      .stage {
        position: relative;
        width: 100%;
        border-radius: 18px;
        cursor: pointer;
        outline-offset: 4px;
      }
      :host([interactive]) .stage {
        touch-action: none;
      }
      .stage.is-dragging {
        cursor: grabbing;
      }
      canvas.face {
        display: block;
        width: 100%;
        height: auto;
        pointer-events: none;
      }

      /* ── Sakuga speech-bubble callout ── */
      .callout {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 15;
        padding: 6px 11px;
        border: 2.5px solid var(--sk-ink);
        border-radius: 10px;
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: 4px 4px 0 var(--sk-soft);
        font: 800 12px/1.25 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        pointer-events: none;
        will-change: transform;
        transform-origin: var(--tail-x, 50%) 118%;
        transform: scale(0);
      }
      .callout.is-srank {
        box-shadow: 4px 4px 0 var(--sk-acc);
      }
      .callout::after {
        content: "";
        position: absolute;
        left: var(--tail-x, 50%);
        top: 100%;
        margin-left: -7px;
        border: 7px solid transparent;
        border-top: 9px solid var(--sk-ink);
      }
      .callout::before {
        content: "";
        position: absolute;
        left: var(--tail-x, 50%);
        top: calc(100% - 3.5px);
        margin-left: -4.5px;
        border: 4.5px solid transparent;
        border-top: 6.5px solid var(--sk-card);
        z-index: 1;
      }
      .callout.is-below {
        transform-origin: var(--tail-x, 50%) -18%;
      }
      .callout.is-below::after {
        top: auto;
        bottom: 100%;
        border-top: 7px solid transparent;
        border-bottom: 9px solid var(--sk-ink);
      }
      .callout.is-below::before {
        top: auto;
        bottom: calc(100% - 3.5px);
        border-top: 4.5px solid transparent;
        border-bottom: 6.5px solid var(--sk-card);
      }
      .c-head {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .c-lbl {
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--sk-ink);
      }
      .c-val {
        color: var(--sk-acc);
        font-weight: 900;
      }
      .c-max {
        color: var(--sk-dim);
        font-weight: 700;
        font-size: 11px;
      }
      .c-rank {
        display: inline-block;
        padding: 1px 5px;
        border: 1.8px solid var(--sk-ink);
        border-radius: 4px;
        background: var(--sk-pri);
        color: #fff;
        font: italic 900 10.5px/1.1 "Avenir Next", "Nunito", -apple-system, "Segoe UI", sans-serif;
        transform: skewX(-10deg);
      }
      .c-rank.r-S { background: var(--sk-acc); }
      .c-rank.r-B { background: var(--sk-card); color: var(--sk-ink); }
      .c-rank.r-C, .c-rank.r-D { background: var(--sk-card); color: var(--sk-dim); border-color: var(--sk-dim); }
      .c-rows {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-top: 3px;
        padding-top: 3px;
        border-top: 1.5px solid var(--sk-track);
      }
      .c-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-size: 11.5px;
      }
      .c-s {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--sk-dim);
        font-weight: 700;
      }
      .c-sw {
        width: 8px;
        height: 8px;
        border: 1.6px solid var(--sk-ink);
        border-radius: 999px;
        background: var(--sw, var(--sk-pri));
      }
      .c-sw.is-d { border-radius: 1.5px; transform: rotate(45deg); }

      /* ── Overall Power / Score footer badge ── */
      .foot {
        position: relative;
        z-index: 3;
        margin-top: 2px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: var(--_badge-py) var(--_badge-px);
        border: 2.6px solid var(--sk-ink);
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: 4px 4px 0 var(--sk-soft);
        transform: skewX(-10deg);
        font: italic 900 var(--_badge-font)/1.1 "Avenir Next", "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.01em;
        white-space: nowrap;
        will-change: transform;
      }
      .badge.is-srank {
        box-shadow: 4px 4px 0 var(--sk-acc);
      }
      .badge-k {
        font-size: 0.68em;
        font-style: normal;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--sk-dim);
      }
      .badge-v {
        color: var(--sk-ink);
      }
      .badge-sep {
        color: var(--sk-dim);
        font-size: 0.72em;
        font-style: normal;
        font-weight: 800;
      }
      .badge-v2 {
        color: var(--sk-acc);
      }
      .badge-r {
        display: inline-block;
        padding: 1px 6px;
        border: 2px solid var(--sk-ink);
        background: var(--sk-pri);
        color: #fff;
        font-size: 0.78em;
        line-height: 1.1;
      }
      .badge-r.r-S { background: var(--sk-acc); }
      .badge-r.r-B { background: var(--sk-card); color: var(--sk-ink); }
      .badge-r.r-C, .badge-r.r-D { background: var(--sk-card); color: var(--sk-dim); border-color: var(--sk-dim); }
      .lbl {
        padding: 1px 7px;
        border-radius: 6px;
        background: var(--sk-card);
        font: 800 11.5px/1.2 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
        color: var(--sk-dim);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .lbl:empty { display: none; }
    `;

    constructor() {
      super();
      this._axes = DEFAULT_ITEMS.map((it) => it.label);
      this._series = [{ name: 'Stats', tone: '', values: DEFAULT_ITEMS.map((it) => it.value) }];
      this._hasUserData = false;
      this._seq = 0;
      this._activeSeries = 0;
    }

    // ─── Attribute & property accessors ───
    get size() {
      const s = this.getAttribute('size');
      return SIZES[s] ? s : 'md';
    }
    set size(v) {
      if (!v) this.removeAttribute('size');
      else this.setAttribute('size', String(v));
    }

    get max() {
      const raw = this.getAttribute('max');
      if (raw === null || raw === '') return 100;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : 100;
    }
    set max(v) { this.setAttribute('max', String(v)); }

    get tone() { return this.getAttribute('tone') || 'pri'; }
    set tone(v) {
      if (!v) this.removeAttribute('tone');
      else this.setAttribute('tone', String(v));
    }

    get showRanks() { return this.hasAttribute('show-ranks'); }
    set showRanks(v) { this.toggleAttribute('show-ranks', !!v); }

    get interactive() { return this.hasAttribute('interactive'); }
    set interactive(v) { this.toggleAttribute('interactive', !!v); }

    get label() { return this.getAttribute('label') || ''; }
    set label(v) {
      if (v === null || v === undefined || v === '') this.removeAttribute('label');
      else this.setAttribute('label', String(v));
    }

    get unit() { return this.getAttribute('unit') || ''; }
    set unit(v) {
      if (v === null || v === undefined) this.removeAttribute('unit');
      else this.setAttribute('unit', String(v));
    }

    get axes() { return this._axes.slice(); }
    set axes(list) {
      if (!Array.isArray(list) || !list.length) return;
      const clean = list.slice(0, 8).map((s, i) => String(s || `Stat ${i + 1}`));
      while (clean.length < 3) clean.push(`Stat ${clean.length + 1}`);
      this._axes = clean;
      this._hasUserData = true;
      this._alignSeriesLengths();
      if (this._inited) {
        this._syncSpringsToData(false);
        this._syncLegend();
        this._syncFooter();
        this._syncAria();
        this._needsDraw = true;
        this._draw();
      }
    }

    get items() {
      const s0 = this._series[0] || { values: [] };
      return this._axes.map((lbl, i) => ({
        label: lbl,
        value: s0.values[i] ?? 0,
      }));
    }
    set items(list) {
      if (!Array.isArray(list) || !list.length) return;
      const sliced = list.slice(0, 8);
      const axes = sliced.map((it, i) => String(it?.label ?? `Stat ${i + 1}`));
      const vals = sliced.map((it) => clamp(Number(it?.value) || 0, 0, this.max));
      while (axes.length < 3) { axes.push(`Stat ${axes.length + 1}`); vals.push(0); }
      this._axes = axes;
      this._series = [{ name: this.label || 'Stats', tone: '', values: vals }];
      this._activeSeries = 0;
      this._hasUserData = true;
      if (this._inited) this._onDataReplaced(true);
    }

    get series() {
      return this._series.map((s) => ({
        name: s.name,
        tone: s.tone || this.tone,
        values: s.values.slice(),
      }));
    }
    set series(list) {
      if (!Array.isArray(list) || !list.length) return;
      const normalized = list.slice(0, 3).map((s, idx) => ({
        name: String(s?.name ?? (idx === 0 ? 'Primary' : `Series ${idx + 1}`)),
        tone: s?.tone ? String(s.tone) : (idx === 0 ? '' : (idx === 1 ? 'acc' : 'green')),
        values: Array.isArray(s?.values) ? s.values.map((v) => clamp(Number(v) || 0, 0, this.max)) : [],
      }));
      // If axes count doesn't match values length and axes wasn't explicitly matching, ensure valid length
      const vLen = normalized[0].values.length;
      if (vLen >= 3 && vLen <= 8 && this._axes.length !== vLen && !this._hasUserData) {
        this._axes = Array.from({ length: vLen }, (_, i) => `Stat ${i + 1}`);
      }
      this._series = normalized;
      this._activeSeries = clamp(this._activeSeries, 0, this._series.length - 1);
      this._hasUserData = true;
      this._alignSeriesLengths();
      if (this._inited) this._onDataReplaced(true);
    }

    _alignSeriesLengths() {
      const n = this._axes.length;
      for (const s of this._series) {
        while (s.values.length < n) s.values.push(0);
        if (s.values.length > n) s.values.length = n;
      }
    }

    _parseDataAttr(raw) {
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          this.items = parsed;
          return true;
        }
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.axes) && parsed.axes.length) {
            const clean = parsed.axes.slice(0, 8).map((s, i) => String(s || `Stat ${i + 1}`));
            while (clean.length < 3) clean.push(`Stat ${clean.length + 1}`);
            this._axes = clean;
            this._hasUserData = true;
          }
          if (Array.isArray(parsed.series) && parsed.series.length) {
            this.series = parsed.series;
            return true;
          }
          if (Array.isArray(parsed.items) && parsed.items.length) {
            this.items = parsed.items;
            return true;
          }
        }
      } catch {}
      return false;
    }

    // ─── DOM render & setup ───
    render() {
      return `<div class="radar" part="radar">`
        + `<div class="legend" part="legend" role="group" aria-label="Series"></div>`
        + `<div class="stage" part="stage" tabindex="0" role="img">`
        + `<canvas class="face" part="canvas"></canvas>`
        + `<div class="callout" part="callout" role="tooltip" aria-hidden="true"></div>`
        + `</div>`
        + `<div class="foot" part="footer">`
        + `<div class="badge" part="score"></div>`
        + `<span class="lbl" part="label"></span>`
        + `</div>`
        + `<span class="sr" aria-live="polite"></span>`
        + `</div>`;
    }

    setup() {
      this.elRadar = this.$('.radar');
      this.elLegend = this.$('.legend');
      this.elStage = this.$('.stage');
      this.cv = this.$('canvas.face');
      this.ctx = this.cv.getContext('2d');
      this.tipEl = this.$('.callout');
      this.elBadge = this.$('.badge');
      this.elLbl = this.$('.lbl');
      this.elLive = this.$('.sr');
      this.back = this.backLayer();

      this._inited = true;
      this._t = 0;
      this._palAt = -1;
      this._pal = null;
      this._patterns = new Map();
      this._needsDraw = true;
      this._trembleT = 0;
      this._flashT = 0;

      this.stageS = new Spring(1, 420, 15);
      this.stageTilt = new Spring(0, 320, 12);
      this.badgeS = new Spring(1, 460, 14);
      this.tipS = new Spring(0, 480, 16);

      this.radS = [];
      this.nodeS = [];
      this._hitAxes = [];

      this._hoverIdx = -1;
      this._pinnedIdx = -1;
      this._focusIdx = -1;
      this._activeCalloutIdx = -1;
      this._dragging = false;
      this._dragIdx = -1;
      this._dragStartVal = 0;
      this._dragStartX = 0;
      this._dragStartY = 0;
      this._dragMoved = false;
      this._dragPeakV = 0;

      const rawData = this.getAttribute('data');
      if (rawData) this._parseDataAttr(rawData);

      this._resizeCanvas();
      this._readPalette();
      this._syncLegend();
      this._syncFooter();
      this._syncAria();
      this._bindEvents();

      this._onDocDown = (e) => {
        if (this._pinnedIdx < 0) return;
        if (!e.composedPath().includes(this)) this.clearSelection();
      };
      document.addEventListener('pointerdown', this._onDocDown);

      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(() => {
          if (this._resizeCanvas()) {
            this._needsDraw = true;
            this._draw();
            if (this._activeCalloutIdx >= 0) this._positionCallout(this._activeCalloutIdx);
          }
        });
        this._ro.observe(this.elStage);
      }

      // Run initial spring-burst entrance
      this.replay();
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this._seq++;
      if (this._onDocDown) document.removeEventListener('pointerdown', this._onDocDown);
      if (this._ro) this._ro.disconnect();
    }

    attributeChangedCallback(name, oldV, newV) {
      if (!this._inited || oldV === newV) return;
      if (name === 'data') {
        this._parseDataAttr(newV);
      } else if (name === 'size') {
        this._resizeCanvas();
        this._needsDraw = true;
        this._draw();
        if (this._activeCalloutIdx >= 0) this._positionCallout(this._activeCalloutIdx);
      } else if (name === 'tone') {
        this._readPalette();
        this._syncLegend();
        this._needsDraw = true;
        this._draw();
      } else if (name === 'max') {
        for (const s of this._series) {
          s.values = s.values.map((v) => clamp(v, 0, this.max));
        }
        this._syncSpringsToData(false);
        this._syncFooter();
        this._syncLegend();
        this._syncAria();
        this._needsDraw = true;
        this._draw();
      } else if (name === 'show-ranks' || name === 'unit' || name === 'label') {
        this._syncFooter();
        this._syncAria();
        if (this._activeCalloutIdx >= 0) this._showCallout(this._activeCalloutIdx, false);
        this._needsDraw = true;
        this._draw();
      } else if (name === 'interactive') {
        this._syncAria();
        this._needsDraw = true;
        this._draw();
      }
    }

    // ─── Public Methods ───
    replay() {
      const seq = ++this._seq;
      const n = this._axes.length;
      const calm = fx.calm;

      this.radS = this._series.map((s) =>
        s.values.map((v) => {
          const r = clamp(v / this.max, 0, 1);
          const sp = new Spring(calm ? r : 0, 340, 15);
          sp.to = calm ? r : 0;
          return sp;
        })
      );
      this.nodeS = Array.from({ length: n }, () => new Spring(1, 480, 15));
      this._syncFooter();
      this._syncLegend();
      this._needsDraw = true;
      this._draw();

      if (calm) return;

      // Staggered radial spring-burst entrance (35ms per axis)
      for (let i = 0; i < n; i++) {
        later(i * 35, () => {
          if (seq !== this._seq || !this.isConnected) return;
          for (let s = 0; s < this._series.length; s++) {
            const r = clamp(this._series[s].values[i] / this.max, 0, 1);
            const sp = this.radS[s]?.[i];
            if (sp) {
              sp.to = r;
              sp.v = 2.6 * Math.max(0.25, r);
            }
          }
          if (this.nodeS[i]) {
            this.nodeS[i].x = 1.32;
            this.nodeS[i].v = 2.2;
          }
          this._needsDraw = true;

          // S-Rank vertex peak glint (>= 90% on active/primary series), offset slightly off label ray
          const r0 = clamp((this._series[0]?.values[i] ?? 0) / this.max, 0, 1);
          if (r0 >= 0.90 - 1e-6) {
            later(170, () => {
              if (seq !== this._seq || !this.isConnected) return;
              const pt = this._vertexPagePt(i, r0);
              const geo = this._radarPageGeo();
              if (!pt || !geo) return;
              ticks(pt.x, pt.y, { n: 3, r: 6 * pt.sc, len: 11 * pt.sc, dir: pt.ang + 0.2, fan: 0.44, life: 0.4 });
              const kAng = pt.ang + 0.19;
              const kRad = geo.R * r0 + 13 * pt.sc;
              kira(geo.cx + Math.cos(kAng) * kRad, geo.cy + Math.sin(kAng) * kRad, {
                r: 10.5 * pt.sc, life: 0.56,
              });
            });
          }
        });
      }
    }

    powerUp() {
      const seq = ++this._seq;
      const n = this._axes.length;

      if (fx.calm) {
        this._syncSpringsToData(true);
        this._needsDraw = true;
        this._draw();
        return;
      }

      this._ensureSpringArrays();

      // Beat 1: Anticipation coil (-12% inward pull for 95ms)
      this.stageS.to = 0.93;
      this.stageTilt.x = -2.2;
      for (let s = 0; s < this._series.length; s++) {
        for (let i = 0; i < n; i++) {
          const r = clamp(this._series[s].values[i] / this.max, 0, 1);
          const sp = this.radS[s][i];
          sp.to = Math.max(0.04, r * 0.88);
          sp.v = -1.6;
        }
      }
      this._needsDraw = true;

      // Subtle pink anticipation ticks off upper corners
      const geo = this._radarPageGeo();
      if (geo) {
        for (const a of [-2.35, -0.79]) {
          ticks(geo.cx + Math.cos(a) * (geo.R + 6 * geo.sc), geo.cy + Math.sin(a) * (geo.R + 6 * geo.sc), {
            n: 2, r: 4 * geo.sc, len: 9 * geo.sc, dir: a, fan: 0.4, life: 0.24,
          });
        }
      }

      // Beat 2: Detonation Hit at 95ms
      later(95, () => {
        if (seq !== this._seq || !this.isConnected) return;

        this.stageS.to = 1;
        this.stageS.v = 3.8;
        this.stageTilt.to = 0;
        this.stageTilt.v = 14;
        this.badgeS.x = 1.24;
        this.badgeS.v = 2.4;
        this._trembleT = 0.30;
        this._flashT = 0.28;

        for (let s = 0; s < this._series.length; s++) {
          for (let i = 0; i < n; i++) {
            const r = clamp(this._series[s].values[i] / this.max, 0, 1);
            const sp = this.radS[s][i];
            sp.to = r;
            sp.v = 4.4 * Math.max(0.35, r);
          }
        }
        for (let i = 0; i < n; i++) {
          this.nodeS[i].x = 1.44;
          this.nodeS[i].v = 3.0;
        }
        this._needsDraw = true;

        const g = this._radarPageGeo();
        if (!g) return;
        const { cx, cy, R, sc } = g;

        // 1. Back-layer impact burst exploding cleanly AROUND the opaque outer polygon shield!
        burst(cx, cy, { r: Math.round(R * 1.48), spikes: 17, life: 0.44, layer: this.back });

        // 2. Identify peak / S-rank vertices on active series
        const sIdx = clamp(this._activeSeries, 0, this._series.length - 1);
        const vals = this._series[sIdx].values;
        const ranked = vals.map((v, i) => ({ i, r: clamp(v / this.max, 0, 1) })).sort((a, b) => b.r - a.r);
        const sRanks = ranked.filter((x) => x.r >= 0.90 - 1e-6);
        const shardTargets = (sRanks.length ? sRanks : ranked.slice(0, 1)).slice(0, 2);

        // Outward crystal shards from peak vertices
        for (const t of shardTargets) {
          const ang = this._axisAngle(t.i);
          const vx = cx + Math.cos(ang) * (R * t.r);
          const vy = cy + Math.sin(ang) * (R * t.r);
          shards(vx, vy, {
            n: 5, speed: 195 * sc, size: 5.2 * sc, life: 0.68, dir: ang, arc: 1.2, grav: 320,
          });
        }

        // 3. Twin kira glints on S-rank vertices (offset slightly off label ray so rank stamps stay 100% crisp)
        const glintTargets = (sRanks.length ? sRanks : ranked.slice(0, 2)).slice(0, 3);
        glintTargets.forEach((t, idx) => {
          const ang = this._axisAngle(t.i);
          const kAng = ang + (idx % 2 === 0 ? 0.20 : -0.20);
          const rOut = R * Math.max(0.86, t.r) + 15 * sc;
          const kx = cx + Math.cos(kAng) * rOut;
          const ky = cy + Math.sin(kAng) * rOut;
          const fire = () => {
            if (!this.isConnected) return;
            kira(kx, ky, { r: (idx === 0 ? 12.5 : 9.5) * sc, life: 0.58 });
            ticks(cx + Math.cos(ang) * (R * t.r), cy + Math.sin(ang) * (R * t.r), {
              n: 3, r: 6 * sc, len: 12 * sc, dir: kAng, fan: 0.42, life: 0.38,
            });
          };
          if (idx === 0) fire();
          else later(idx * 55, fire);
        });

        // 4. Three cel-shaded corner puffs rolling off label-free hexagon edge midpoints!
        for (const [a, sz] of [[-2.09, 9.2], [-1.05, 9.6], [2.09, 8.6]]) {
          const px = cx + Math.cos(a) * (R + 4 * sc);
          const py = cy + Math.sin(a) * (R + 4 * sc);
          puff(px, py, {
            size: sz * sc, n: 4,
            vx: Math.cos(a) * 42 * sc,
            vy: Math.sin(a) * 34 * sc - 6 * sc,
            life: rnd(0.54, 0.72),
          });
        }

        // 5. Bold ドン! cleanly ABOVE the top vertex and its label with generous air gap
        const topClearY = cy - R - 92 * sc;
        sfx('don', cx + 4 * sc, topClearY, {
          size: Math.round(104 * sc),
          rot: -0.09,
          life: 0.74,
        });
      });
    }

    impact() {
      this.powerUp();
    }

    setValues(vals, seriesIdx = 0) {
      if (!Array.isArray(vals) || !this._series[seriesIdx]) return;
      const s = this._series[seriesIdx];
      const n = this._axes.length;
      this._ensureSpringArrays();

      for (let i = 0; i < n; i++) {
        if (i >= vals.length) break;
        const prev = s.values[i];
        const next = clamp(Number(vals[i]) || 0, 0, this.max);
        const prevR = clamp(prev / this.max, 0, 1);
        const nextR = clamp(next / this.max, 0, 1);
        s.values[i] = next;

        const sp = this.radS[seriesIdx][i];
        if (fx.calm) {
          sp.x = nextR; sp.to = nextR; sp.v = 0;
        } else {
          sp.to = nextR;
          if (Math.abs(nextR - prevR) > 0.08) {
            sp.v += Math.sign(nextR - prevR) * 1.4;
            this.nodeS[i].x = Math.max(this.nodeS[i].x, 1.24);
          }
          if (prevR < 0.90 - 1e-6 && nextR >= 0.90 - 1e-6) {
            this._fireSRankBeat(i, next, nextR);
          }
        }
      }

      if (!fx.calm) this.badgeS.x = Math.max(this.badgeS.x, 1.14);
      this._syncFooter();
      this._syncLegend();
      this._syncAria();
      if (this._activeCalloutIdx >= 0) this._showCallout(this._activeCalloutIdx, false);
      this._needsDraw = true;
      if (fx.calm) this._draw();
    }

    select(index) {
      const n = this._axes.length;
      if (index < 0 || index >= n) return;
      this._pinnedIdx = index;
      this._focusIdx = index;
      this._hoverIdx = index;
      this._onAxisClickEffects(index);
      this._showCallout(index, true);
      this._announceAxis(index);
      this._needsDraw = true;
      this._draw();
      this.emit('select', this._axisDetail(index));
    }

    clearSelection() {
      this._pinnedIdx = -1;
      this._hoverIdx = -1;
      this._activeCalloutIdx = -1;
      this.tipS.d = 30;
      this.tipS.to = 0;
      if (fx.calm) { this.tipS.x = 0; this.tipS.v = 0; }
      if (this.tipEl) this.tipEl.setAttribute('aria-hidden', 'true');
      for (const sp of this.nodeS) sp.to = 1;
      this._needsDraw = true;
      this._draw();
    }

    // ─── Internal Data & Spring Sync ───
    _onDataReplaced(animate) {
      this._pinnedIdx = -1;
      this._hoverIdx = -1;
      this._focusIdx = -1;
      this._activeCalloutIdx = -1;
      this.tipS.x = 0; this.tipS.v = 0; this.tipS.to = 0;
      if (this.tipEl) this.tipEl.setAttribute('aria-hidden', 'true');
      this._syncLegend();
      this._syncFooter();
      this._syncAria();
      if (animate) this.replay();
      else {
        this._syncSpringsToData(true);
        this._needsDraw = true;
        this._draw();
      }
    }

    _ensureSpringArrays() {
      const n = this._axes.length;
      if (this.radS.length !== this._series.length || (this.radS[0] && this.radS[0].length !== n)) {
        this._syncSpringsToData(false);
      }
      if (this.nodeS.length !== n) {
        this.nodeS = Array.from({ length: n }, () => new Spring(1, 480, 15));
      }
    }

    _syncSpringsToData(snap) {
      const n = this._axes.length;
      this.radS = this._series.map((s, si) =>
        s.values.map((v, i) => {
          const r = clamp(v / this.max, 0, 1);
          const prev = this.radS[si]?.[i];
          if (snap || fx.calm || !prev) {
            const sp = new Spring(r, 340, 15);
            sp.to = r;
            return sp;
          }
          prev.to = r;
          return prev;
        })
      );
      if (this.nodeS.length !== n) {
        this.nodeS = Array.from({ length: n }, () => new Spring(1, 480, 15));
      }
    }

    _axisAngle(i) {
      return -Math.PI / 2 + (i / this._axes.length) * TAU;
    }

    _axisDetail(i) {
      const sIdx = clamp(this._activeSeries, 0, this._series.length - 1);
      const val = this._series[sIdx]?.values[i] ?? 0;
      const ratio = clamp(val / this.max, 0, 1);
      const rank = rankFor(ratio);
      const lbl = this._axes[i];
      return {
        index: i,
        label: lbl,
        value: val,
        values: this._series.map((s) => s.values[i] ?? 0),
        item: { label: lbl, value: val },
        ratio,
        rank,
      };
    }

    _resolveSeriesColor(s, idx) {
      const pal = this._pal;
      const t = s.tone || (idx === 0 ? this.tone : (idx === 1 ? 'acc' : 'green'));
      if (t === 'acc') return pal.acc;
      if (t === 'green') return GREEN;
      if (t === 'amber') return AMBER;
      if (t === 'pri') return pal.pri;
      if (/^(#|rgb|hsl)/i.test(t)) return t;
      return idx === 1 ? pal.acc : pal.pri;
    }

    // ─── Legend, Footer & ARIA ───
    _syncLegend() {
      const isMulti = this._series.length > 1;
      this.elLegend.classList.toggle('is-multi', isMulti);
      if (!isMulti) {
        this.elLegend.innerHTML = '';
        return;
      }
      if (!this._pal) this._readPalette();
      this.elLegend.innerHTML = this._series.map((s, idx) => {
        const col = this._resolveSeriesColor(s, idx);
        const avg = s.values.length ? s.values.reduce((a, b) => a + b, 0) / s.values.length : 0;
        const active = idx === this._activeSeries;
        return `<button type="button" class="leg-btn${active ? ' is-active' : ''}${idx === 1 ? ' is-diamond' : ''}" `
          + `data-si="${idx}" style="--leg-col:${esc(col)}" aria-pressed="${active ? 'true' : 'false'}">`
          + `<span class="leg-dot" aria-hidden="true"></span>`
          + `<span>${esc(s.name)}</span>`
          + `<span class="leg-avg">${esc(formatVal(avg, this.max))}${esc(this.unit)}</span>`
          + `</button>`;
      }).join('');

      this.elLegend.querySelectorAll('.leg-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const si = Number(btn.dataset.si) || 0;
          if (si === this._activeSeries) return;
          this._activeSeries = si;
          this._syncLegend();
          this._syncFooter();
          if (!fx.calm) {
            this.badgeS.x = 1.15;
            for (const sp of this.radS[si] || []) sp.v += 1.6;
            for (const ns of this.nodeS) ns.x = 1.22;
          }
          if (this._activeCalloutIdx >= 0) this._showCallout(this._activeCalloutIdx, false);
          this._needsDraw = true;
          this._draw();
        });
      });
    }

    _syncFooter() {
      const s0 = this._series[0];
      const avg0 = s0 && s0.values.length ? s0.values.reduce((a, b) => a + b, 0) / s0.values.length : 0;
      const disp0 = this.max >= 10 ? Math.round(avg0) : avg0;
      const r0 = clamp(disp0 / this.max, 0, 1);
      const grade0 = rankFor(r0);
      const u = this.unit;

      if (this._series.length > 1) {
        const s1 = this._series[1];
        const avg1 = s1 && s1.values.length ? s1.values.reduce((a, b) => a + b, 0) / s1.values.length : 0;
        const actAvg = this._activeSeries === 1 ? avg1 : avg0;
        const actDisp = this.max >= 10 ? Math.round(actAvg) : actAvg;
        const actR = clamp(actDisp / this.max, 0, 1);
        const actGrade = rankFor(actR);
        this.elBadge.classList.toggle('is-srank', actGrade === 'S');
        this.elBadge.innerHTML = `<span class="badge-k">AVG</span>`
          + `<span class="badge-v">${esc(formatVal(avg0, this.max))}${esc(u)}</span>`
          + `<span class="badge-sep">VS</span>`
          + `<span class="badge-v2">${esc(formatVal(avg1, this.max))}${esc(u)}</span>`
          + (this.showRanks ? `<span class="badge-r r-${actGrade}">${actGrade}</span>` : '');
      } else {
        this.elBadge.classList.toggle('is-srank', grade0 === 'S');
        this.elBadge.innerHTML = `<span class="badge-k">AVG</span>`
          + `<span class="badge-v">${esc(formatVal(avg0, this.max))}${esc(u)}</span>`
          + (this.showRanks ? `<span class="badge-r r-${grade0}">${grade0}</span>` : '');
      }
      this.elLbl.textContent = this.label;
    }

    _syncAria() {
      const s0 = this._series[0] || { values: [] };
      const summary = this._axes.map((lbl, i) => `${lbl} ${formatVal(s0.values[i] ?? 0, this.max)}${this.unit}`).join(', ');
      const title = this.label ? `${this.label}: ` : 'Radar chart: ';
      this.elStage.setAttribute('aria-label', `${title}${summary}${this.interactive ? '. Use Left and Right arrows to pick an axis, Up and Down to adjust.' : '. Use Left and Right arrows to inspect axes.'}`);
    }

    _announceAxis(i) {
      const d = this._axisDetail(i);
      const extra = this._series.length > 1
        ? this._series.map((s) => `${s.name} ${formatVal(s.values[i], this.max)}${this.unit}`).join(', ')
        : `${formatVal(d.value, this.max)}${this.unit} (Rank ${d.rank})`;
      this.elLive.textContent = `${d.label}: ${extra}`;
    }

    // ─── Geometry & Hit Testing ───
    _layout() {
      const spec = SIZES[this.size];
      const w = this._cssW || spec.w;
      const sc = w / spec.w;
      const h = Math.round(spec.h * sc);
      const cx = w * 0.5;
      const cy = h * 0.5;
      const R = spec.R * sc;
      return { spec, w, h, cx, cy, R, sc: w / SIZES.md.w, sizeSc: sc };
    }

    _radarPageGeo() {
      if (!this.cv || !this.isConnected) return null;
      const rect = this.cv.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const lay = this._layout();
      const k = rect.width / lay.w;
      return {
        cx: rect.left + scrollX + lay.cx * k,
        cy: rect.top + scrollY + lay.cy * k,
        R: lay.R * k,
        sc: lay.sc * k,
        rect,
      };
    }

    _vertexPagePt(i, ratio) {
      const geo = this._radarPageGeo();
      if (!geo) return null;
      const ang = this._axisAngle(i);
      return {
        x: geo.cx + Math.cos(ang) * (geo.R * ratio),
        y: geo.cy + Math.sin(ang) * (geo.R * ratio),
        ang,
        sc: geo.sc,
      };
    }

    _hitTest(clientX, clientY) {
      const rect = this.cv.getBoundingClientRect();
      if (!rect.width || !rect.height) return { axis: -1, onVertex: false };
      const lay = this._layout();
      const px = ((clientX - rect.left) / rect.width) * lay.w;
      const py = ((clientY - rect.top) / rect.height) * lay.h;

      const sIdx = clamp(this._activeSeries, 0, this._series.length - 1);
      const n = this._axes.length;

      // 1. Direct check on active vertex nodes (most forgiving, 24px radius)
      let bestI = -1;
      let bestD = Infinity;
      for (let i = 0; i < n; i++) {
        const ang = this._axisAngle(i);
        const r = clamp(this.radS[sIdx]?.[i]?.x ?? (this._series[sIdx].values[i] / this.max), 0, 1);
        const vx = lay.cx + Math.cos(ang) * (lay.R * r);
        const vy = lay.cy + Math.sin(ang) * (lay.R * r);
        const d = Math.hypot(px - vx, py - vy);
        if (d < 24 && d < bestD) { bestD = d; bestI = i; }
      }
      if (bestI >= 0) return { axis: bestI, onVertex: true };

      // 2. Check outer label bounding boxes
      for (const box of this._hitAxes) {
        if (px >= box.x0 && px <= box.x1 && py >= box.y0 && py <= box.y1) {
          return { axis: box.i, onVertex: false };
        }
      }

      // 3. Check along spokes inside outer polygon (dist from center between 14px and R + 18px)
      const dx = px - lay.cx;
      const dy = py - lay.cy;
      const dist = Math.hypot(dx, dy);
      if (dist >= 14 && dist <= lay.R + 18) {
        let ang = Math.atan2(dy, dx);
        let closest = -1;
        let minAngDiff = Infinity;
        for (let i = 0; i < n; i++) {
          const a = this._axisAngle(i);
          let diff = Math.abs(Math.atan2(Math.sin(ang - a), Math.cos(ang - a)));
          if (diff < minAngDiff) { minAngDiff = diff; closest = i; }
        }
        const halfSector = Math.min(0.42, (TAU / n) * 0.45);
        if (minAngDiff <= halfSector) {
          return { axis: closest, onVertex: this.interactive };
        }
      }

      return { axis: -1, onVertex: false };
    }

    _ratioFromPointerOnAxis(clientX, clientY, axisIdx) {
      const rect = this.cv.getBoundingClientRect();
      const lay = this._layout();
      const px = ((clientX - rect.left) / rect.width) * lay.w;
      const py = ((clientY - rect.top) / rect.height) * lay.h;
      const ang = this._axisAngle(axisIdx);
      const proj = (px - lay.cx) * Math.cos(ang) + (py - lay.cy) * Math.sin(ang);
      return clamp(proj / lay.R, 0, 1);
    }

    // ─── Interactive Pointer & Keyboard Binding ───
    _bindEvents() {
      const stage = this.elStage;

      stage.addEventListener('pointermove', (e) => {
        if (this._dragging) {
          const moved = Math.hypot(e.clientX - this._dragStartX, e.clientY - this._dragStartY);
          if (moved > 4) this._dragMoved = true;
          if (this._dragMoved) {
            const r = this._ratioFromPointerOnAxis(e.clientX, e.clientY, this._dragIdx);
            this._applyInteractiveAxisRatio(this._dragIdx, r, false);
          }
          return;
        }
        if (e.pointerType !== 'mouse') return;
        const hit = this._hitTest(e.clientX, e.clientY);
        if (hit.axis !== this._hoverIdx) {
          this._setHoverAxis(hit.axis, false);
        }
      });

      stage.addEventListener('pointerleave', (e) => {
        if (this._dragging || e.pointerType !== 'mouse') return;
        if (this._pinnedIdx >= 0) {
          this._hoverIdx = this._pinnedIdx;
          this._updateNodeTargets();
          this._showCallout(this._pinnedIdx, false);
          this._needsDraw = true;
        } else {
          this._setHoverAxis(-1, true);
        }
      });

      stage.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const hit = this._hitTest(e.clientX, e.clientY);
        if (hit.axis < 0) {
          if (this._pinnedIdx >= 0) this.clearSelection();
          return;
        }
        e.preventDefault();
        stage.focus({ preventScroll: true });

        if (this.interactive && hit.onVertex) {
          const sIdx = clamp(this._activeSeries, 0, this._series.length - 1);
          this._dragging = true;
          this._dragIdx = hit.axis;
          this._dragStartVal = this._series[sIdx].values[hit.axis];
          this._dragStartX = e.clientX;
          this._dragStartY = e.clientY;
          this._dragMoved = false;
          this._dragPeakV = 0;
          this._hoverIdx = hit.axis;
          this._focusIdx = hit.axis;
          stage.classList.add('is-dragging');
          try { stage.setPointerCapture(e.pointerId); } catch {}
          this._updateNodeTargets();
          this._showCallout(hit.axis, false);
          this._needsDraw = true;
        } else {
          this.select(hit.axis);
        }
      });

      const endDrag = (e) => {
        if (!this._dragging) return;
        const idx = this._dragIdx;
        const wasMoved = this._dragMoved;
        const startVal = this._dragStartVal;
        const peakV = this._dragPeakV;
        this._dragging = false;
        this._dragIdx = -1;
        this._dragMoved = false;
        this._dragPeakV = 0;
        stage.classList.remove('is-dragging');
        try { stage.releasePointerCapture(e.pointerId); } catch {}

        const sIdx = clamp(this._activeSeries, 0, this._series.length - 1);
        const curVal = this._series[sIdx].values[idx];

        if (!wasMoved) {
          // Treat clean tap as vertex select
          this.select(idx);
          return;
        }

        // Pin callout on dragged vertex and fire subtle settle puff if fast drag
        this._pinnedIdx = idx;
        this._updateNodeTargets();
        this._showCallout(idx, false);
        this._needsDraw = true;

        if (!fx.calm && Math.abs(peakV) > 1.4) {
          const pt = this._vertexPagePt(idx, clamp(curVal / this.max, 0, 1));
          if (pt) {
            puff(pt.x, pt.y, {
              size: 6 * pt.sc, n: 3,
              vx: Math.cos(pt.ang) * 24 * pt.sc,
              vy: Math.sin(pt.ang) * 24 * pt.sc - 6 * pt.sc,
              life: 0.48,
            });
          }
        }
        if (curVal !== startVal) {
          this.emit('change', this._axisDetail(idx));
        }
      };

      stage.addEventListener('pointerup', endDrag);
      stage.addEventListener('pointercancel', endDrag);

      stage.addEventListener('focus', () => {
        if (this._focusIdx < 0) {
          this._focusIdx = this._pinnedIdx >= 0 ? this._pinnedIdx : 0;
          this._setHoverAxis(this._focusIdx, true);
          this._announceAxis(this._focusIdx);
        }
      });

      stage.addEventListener('blur', () => {
        if (this._pinnedIdx < 0) {
          this._focusIdx = -1;
          this._setHoverAxis(-1, true);
        }
      });

      stage.addEventListener('keydown', (e) => {
        const n = this._axes.length;
        if (e.key === 'Escape') {
          e.preventDefault();
          this.clearSelection();
          return;
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const cur = this._focusIdx >= 0 ? this._focusIdx : 0;
          this._focusIdx = (cur + dir + n) % n;
          if (this._pinnedIdx >= 0) this._pinnedIdx = this._focusIdx;
          this._setHoverAxis(this._focusIdx, false);
          this._announceAxis(this._focusIdx);
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const idx = this._focusIdx >= 0 ? this._focusIdx : 0;
          this.select(idx);
          return;
        }
        if (this.interactive && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          const idx = this._focusIdx >= 0 ? this._focusIdx : 0;
          const sIdx = clamp(this._activeSeries, 0, this._series.length - 1);
          const step = e.shiftKey ? 1 : (this.max >= 20 ? 5 : (this.max >= 5 ? 1 : this.max * 0.05));
          const delta = e.key === 'ArrowUp' ? step : -step;
          const next = clamp(this._series[sIdx].values[idx] + delta, 0, this.max);
          if (next === this._series[sIdx].values[idx]) return;
          this._focusIdx = idx;
          this._pinnedIdx = idx;
          this._applyInteractiveAxisRatio(idx, clamp(next / this.max, 0, 1), true);
          this._announceAxis(idx);
        }
      });
    }

    _setHoverAxis(i, quietFx) {
      this._hoverIdx = i;
      this._updateNodeTargets();
      if (i >= 0) {
        if (!fx.calm && this.nodeS[i]) {
          this.nodeS[i].x = Math.max(this.nodeS[i].x, 1.46);
          this.nodeS[i].v = 2.6;
          if (!quietFx) {
            const sIdx = clamp(this._activeSeries, 0, this._series.length - 1);
            const r = clamp(this._series[sIdx].values[i] / this.max, 0, 1);
            const pt = this._vertexPagePt(i, r);
            if (pt) {
              ticks(pt.x, pt.y, { n: 3, r: 6 * pt.sc, len: 10 * pt.sc, dir: pt.ang, fan: 0.44, life: 0.34 });
            }
          }
        }
        this._showCallout(i, false);
      } else if (this._pinnedIdx < 0) {
        this._activeCalloutIdx = -1;
        this.tipS.d = 30;
        this.tipS.to = 0;
        if (fx.calm) { this.tipS.x = 0; this.tipS.v = 0; }
        if (this.tipEl) this.tipEl.setAttribute('aria-hidden', 'true');
      }
      this._needsDraw = true;
    }

    _updateNodeTargets() {
      const active = this._dragging ? this._dragIdx : (this._hoverIdx >= 0 ? this._hoverIdx : this._pinnedIdx);
      for (let j = 0; j < this.nodeS.length; j++) {
        this.nodeS[j].to = j === active ? (this._dragging ? 1.52 : 1.34) : 1;
      }
    }

    _onAxisClickEffects(i) {
      this._updateNodeTargets();
      if (fx.calm) return;
      const sIdx = clamp(this._activeSeries, 0, this._series.length - 1);
      const r = clamp(this._series[sIdx].values[i] / this.max, 0, 1);
      if (this.nodeS[i]) {
        this.nodeS[i].x = 0.72;
        this.nodeS[i].v = 6.2;
        this.nodeS[i].to = 1.36;
      }
      const pt = this._vertexPagePt(i, r);
      const geo = this._radarPageGeo();
      if (!pt || !geo) return;

      ticks(pt.x, pt.y, { n: 4, r: 7 * pt.sc, len: 13 * pt.sc, dir: pt.ang, fan: 0.46, life: 0.4 });
      puff(pt.x, pt.y, {
        size: 6.2 * pt.sc, n: 3,
        vx: Math.cos(pt.ang) * 24 * pt.sc,
        vy: Math.sin(pt.ang) * 24 * pt.sc - 6 * pt.sc,
        life: 0.48,
      });

      // Place hollow カチッ cleanly at the adjacent open edge-midpoint gap (never covering axis label or callout!)
      const halfStep = (TAU / this._axes.length) * 0.5;
      const sideSign = Math.cos(pt.ang) >= -0.05 ? 1 : -1;
      const kAng = pt.ang + sideSign * halfStep;
      const kx = geo.cx + Math.cos(kAng) * (geo.R + 30 * geo.sc);
      const ky = geo.cy + Math.sin(kAng) * (geo.R + 28 * geo.sc);
      sfx('kachi', kx, ky, { size: Math.round(50 * geo.sc), rot: -0.1, life: 0.62, ...hollow() });
    }

    _applyInteractiveAxisRatio(i, r, isCommit) {
      const sIdx = clamp(this._activeSeries, 0, this._series.length - 1);
      const s = this._series[sIdx];
      let next = r * this.max;
      if (this.max >= 10) next = Math.round(next);
      else if (this.max >= 2) next = Math.round(next * 10) / 10;
      next = clamp(next, 0, this.max);

      const prev = s.values[i];
      const prevR = clamp(prev / this.max, 0, 1);
      const nextR = clamp(next / this.max, 0, 1);
      s.values[i] = next;

      this._ensureSpringArrays();
      const sp = this.radS[sIdx][i];
      if (fx.calm) {
        sp.x = nextR; sp.to = nextR; sp.v = 0;
      } else {
        sp.to = nextR;
      }

      this._syncFooter();
      this._syncLegend();
      this._syncAria();
      this._showCallout(i, false);
      this._needsDraw = true;
      if (fx.calm) this._draw();

      if (prevR < 0.90 - 1e-6 && nextR >= 0.90 - 1e-6) {
        this._fireSRankBeat(i, next, nextR);
      }

      if (next !== prev) {
        this.emit('input', this._axisDetail(i));
      }
      if (isCommit && next !== prev) {
        this.emit('change', this._axisDetail(i));
      }
    }

    _fireSRankBeat(i, val, ratio) {
      this.emit('sakuga:srank', { index: i, label: this._axes[i], value: val, ratio, rank: 'S' });
      if (fx.calm) return;
      if (this.nodeS[i]) {
        this.nodeS[i].x = 1.56;
        this.nodeS[i].v = 3.2;
      }
      this.badgeS.x = Math.max(this.badgeS.x, 1.18);
      const pt = this._vertexPagePt(i, ratio);
      const geo = this._radarPageGeo();
      if (pt && geo) {
        const kAng = pt.ang + 0.19;
        const kRad = geo.R * ratio + 14 * pt.sc;
        ticks(pt.x, pt.y, { n: 4, r: 7 * pt.sc, len: 13 * pt.sc, dir: kAng, fan: 0.45, life: 0.42 });
        kira(geo.cx + Math.cos(kAng) * kRad, geo.cy + Math.sin(kAng) * kRad, {
          r: 12 * pt.sc, life: 0.6,
        });
      }
    }

    // ─── Speech-Bubble Callout ───
    _showCallout(i, punch) {
      const tip = this.tipEl;
      if (!tip || i < 0 || i >= this._axes.length) return;
      const lbl = this._axes[i];
      const u = this.unit;
      const sIdx = clamp(this._activeSeries, 0, this._series.length - 1);
      const primaryVal = this._series[sIdx].values[i] ?? 0;
      const primaryR = clamp(primaryVal / this.max, 0, 1);
      const grade = rankFor(primaryR);

      if (this._series.length > 1) {
        const rows = this._series.map((s, si) => {
          const col = this._resolveSeriesColor(s, si);
          const v = s.values[i] ?? 0;
          const r = clamp(v / this.max, 0, 1);
          const gr = rankFor(r);
          return `<div class="c-row"><span class="c-s"><span class="c-sw${si === 1 ? ' is-d' : ''}" style="--sw:${esc(col)}"></span>${esc(s.name)}</span>`
            + `<span><strong>${esc(formatVal(v, this.max))}${esc(u)}</strong>${this.showRanks ? ` <span class="c-rank r-${gr}">${gr}</span>` : ''}</span></div>`;
        }).join('');
        tip.innerHTML = `<div class="c-head"><span class="c-lbl">${esc(lbl)}</span></div><div class="c-rows">${rows}</div>`;
      } else {
        tip.innerHTML = `<div class="c-head"><span class="c-lbl">${esc(lbl)}</span>`
          + `<span class="c-val">${esc(formatVal(primaryVal, this.max))}${esc(u)}</span>`
          + `<span class="c-max">/${esc(formatVal(this.max, this.max))}</span>`
          + (this.showRanks ? `<span class="c-rank r-${grade}">${grade}</span>` : '')
          + `</div>`;
      }

      tip.classList.toggle('is-srank', grade === 'S');
      tip.setAttribute('aria-hidden', 'false');

      this._positionCallout(i);

      const changed = this._activeCalloutIdx !== i;
      this._activeCalloutIdx = i;
      this.tipS.d = 15;
      this.tipS.to = 1;
      if (fx.calm) {
        this.tipS.x = 1; this.tipS.v = 0;
      } else if (punch || changed) {
        this.tipS.x = Math.min(this.tipS.x, punch ? 0.42 : 0.65);
        this.tipS.v = punch ? 5.2 : 2.6;
      }
    }

    _positionCallout(i) {
      const tip = this.tipEl;
      if (!tip || i < 0 || i >= this._axes.length) return;
      const lay = this._layout();
      const sIdx = clamp(this._activeSeries, 0, this._series.length - 1);
      const r = clamp(this.radS[sIdx]?.[i]?.x ?? (this._series[sIdx].values[i] / this.max), 0, 1);
      const ang = this._axisAngle(i);
      const vx = lay.cx + Math.cos(ang) * (lay.R * r);
      const vy = lay.cy + Math.sin(ang) * (lay.R * r);

      const tipW = tip.offsetWidth || 120;
      const tipH = tip.offsetHeight || 32;
      const stageW = this.elStage.offsetWidth || lay.w;

      // Flip below vertex when vertex is near top of radar so callout never clips top edge or top label!
      const placeBelow = vy < tipH + 46;
      tip.classList.toggle('is-below', placeBelow);

      const left = clamp(vx - tipW * 0.5, 4, Math.max(4, stageW - tipW - 4));
      const tailX = clamp(vx - left, 14, Math.max(14, tipW - 14));
      const top = placeBelow ? (vy + 18) : (vy - tipH - 18);

      tip.style.left = `${left.toFixed(1)}px`;
      tip.style.top = `${top.toFixed(1)}px`;
      tip.style.setProperty('--tail-x', `${tailX.toFixed(1)}px`);
    }

    // ─── Canvas Sizing, Palette & Screentone Patterns ───
    _resizeCanvas() {
      const spec = SIZES[this.size];
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const stageW = this.elStage ? Math.floor(this.elStage.getBoundingClientRect().width) : 0;
      const cssW = stageW > 120 ? Math.min(spec.w, stageW) : spec.w;
      const cssH = Math.round(spec.h * (cssW / spec.w));
      const pw = Math.round(cssW * dpr);
      const ph = Math.round(cssH * dpr);
      const changed = this.cv.width !== pw || this.cv.height !== ph || this._cssW !== cssW || this._dpr !== dpr;
      if (changed) {
        this.cv.width = pw;
        this.cv.height = ph;
        this.cv.style.height = `${cssH}px`;
        this._cssW = cssW;
        this._cssH = cssH;
        this._dpr = dpr;
      }
      return changed;
    }

    _readPalette() {
      const cs = getComputedStyle(this);
      const v = (name, fb) => (cs.getPropertyValue(name) || '').trim() || fb;
      const ink = v('--sk-ink', fx.P.ink);
      const card = v('--sk-card', fx.P.fill);
      const soft = v('--sk-soft', fx.P.shade);
      const pri = v('--sk-pri', '#8f8df7');
      const acc = v('--sk-acc', fx.P.accent);
      const dim = v('--sk-dim', '#8580b0');
      const track = v('--sk-track', '#c9cbe0');
      const bandAlt = isWhiteLike(card) ? '#f3f2ff' : card;

      const changed = !this._pal || this._pal.pri !== pri || this._pal.acc !== acc || this._pal.ink !== ink || this._pal.card !== card;
      this._pal = { ink, card, soft, pri, acc, dim, track, bandAlt };
      this._palAt = this._t;
      if (changed) this._patterns.clear();
    }

    // Pure flat manga halftone dots (series 0) & diagonal comic hatch stripes (series 1+) — ZERO alpha, ZERO blur!
    _getPattern(color, style) {
      const key = `${style}:${color}`;
      let pat = this._patterns.get(key);
      if (pat) return pat;

      const tile = document.createElement('canvas');
      if (style === 'dots') {
        // 2x high-DPI Ben-Day 45-degree manga screentone dots (logical 8x8 tile -> crisp 16x16 canvas)
        tile.width = 16;
        tile.height = 16;
        const c = tile.getContext('2d');
        c.fillStyle = color;
        c.beginPath();
        for (const [x, y] of [[4, 4], [12, 12]]) {
          c.moveTo(x + 2.6, y);
          c.arc(x, y, 2.6, 0, TAU);
        }
        c.fill();
      } else {
        // 2x crisp airy 45-degree manga diagonal hatch stripes (logical 12x12 tile -> crisp 24x24 canvas)
        tile.width = 24;
        tile.height = 24;
        const c = tile.getContext('2d');
        c.strokeStyle = color;
        c.lineWidth = 2.2;
        c.beginPath();
        c.moveTo(-4, 24); c.lineTo(24, -4);
        c.moveTo(8, 28);  c.lineTo(28, 8);
        c.moveTo(-16, 12); c.lineTo(12, -16);
        c.stroke();
      }

      pat = this.ctx.createPattern(tile, 'repeat');
      if (pat && typeof DOMMatrix !== 'undefined' && pat.setTransform) {
        pat.setTransform(new DOMMatrix().scale(0.5, 0.5));
      }
      this._patterns.set(key, pat);
      return pat;
    }

    // ─── Canvas Drawing Helpers ───
    _polyPath(cx, cy, radius, n) {
      const p = new Path2D();
      for (let i = 0; i < n; i++) {
        const a = this._axisAngle(i);
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        if (i === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
      p.closePath();
      return p;
    }

    _statPolyPath(cx, cy, R, ratios) {
      const p = new Path2D();
      const n = ratios.length;
      for (let i = 0; i < n; i++) {
        const a = this._axisAngle(i);
        const rr = R * Math.max(0.015, ratios[i]);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
      p.closePath();
      return p;
    }

    _drawRoundRect(g, x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.lineTo(x + w - r, y);
      g.quadraticCurveTo(x + w, y, x + w, y + r);
      g.lineTo(x + w, y + h - r);
      g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      g.lineTo(x + r, y + h);
      g.quadraticCurveTo(x, y + h, x, y + h - r);
      g.lineTo(x, y + r);
      g.quadraticCurveTo(x, y, x + r, y);
      g.closePath();
    }

    _draw() {
      const g = this.ctx;
      const pal = this._pal;
      const dpr = this._dpr || 1;
      const lay = this._layout();
      const { spec, w, h, R, sizeSc } = lay;
      const n = this._axes.length;
      const lw = spec.lw * sizeSc;
      const shX = spec.shX * sizeSc;
      const shY = spec.shY * sizeSc;

      // Brief impact micro-tremble during powerUp hit
      const tremble = this._trembleT > 0 && !fx.calm
        ? Math.sin(this._t * 72) * (this._trembleT / 0.30) * 2.2
        : 0;
      const cx = lay.cx + tremble;
      const cy = lay.cy + tremble * 0.45;

      const activeAxis = this._dragging ? this._dragIdx : (this._hoverIdx >= 0 ? this._hoverIdx : this._pinnedIdx);
      const isFlashing = this._flashT > 0 && !fx.calm;

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      g.lineJoin = 'round';
      g.lineCap = 'round';

      // 1. Hard offset cel drop shadow behind the outer polygon shield
      const shadowPoly = this._polyPath(cx + shX, cy + shY, R, n);
      g.fillStyle = isFlashing ? pal.acc : pal.soft;
      g.fill(shadowPoly);

      // 2. Opaque flat --sk-card outer polygon shield (cleanly masks back-layer impact burst!)
      const outerPoly = this._polyPath(cx, cy, R, n);
      g.fillStyle = pal.card;
      g.fill(outerPoly);

      // 3. Alternating flat cel concentric bands (100% -> 75% -> 50% -> 25%)
      const bands = [
        { frac: 0.75, fill: pal.bandAlt },
        { frac: 0.50, fill: pal.card },
        { frac: 0.25, fill: pal.bandAlt },
      ];
      for (const b of bands) {
        g.fillStyle = b.fill;
        g.fill(this._polyPath(cx, cy, R * b.frac, n));
      }

      // 4. Inner concentric web lines (25%, 50%, 75%)
      for (const [frac, dashed, widthK] of [[0.25, true, 0.42], [0.50, false, 0.54], [0.75, true, 0.44]]) {
        g.save();
        g.strokeStyle = pal.track;
        g.lineWidth = Math.max(1.1, lw * widthK);
        if (dashed) g.setLineDash([4 * sizeSc, 4 * sizeSc]);
        g.stroke(this._polyPath(cx, cy, R * frac, n));
        g.restore();
      }

      // 5. Axis spokes radiating from center + tiny perpendicular scale hash ticks
      for (let i = 0; i < n; i++) {
        const ang = this._axisAngle(i);
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const isAct = i === activeAxis;

        g.strokeStyle = isAct ? pal.acc : pal.track;
        g.lineWidth = isAct ? Math.max(2.2, lw * 0.78) : Math.max(1.3, lw * 0.48);
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + ca * R, cy + sa * R);
        g.stroke();

        // Crisp mini perpendicular calibration ticks at 25%, 50%, 75%
        const px = -sa * 3.2 * sizeSc;
        const py = ca * 3.2 * sizeSc;
        g.strokeStyle = isAct ? pal.acc : pal.ink;
        g.lineWidth = Math.max(1.0, lw * 0.36);
        g.beginPath();
        for (const frac of [0.25, 0.5, 0.75]) {
          const tx = cx + ca * (R * frac);
          const ty = cy + sa * (R * frac);
          g.moveTo(tx - px, ty - py);
          g.lineTo(tx + px, ty + py);
        }
        g.stroke();
      }

      // 6. Outer 100% Polygon Frame (bold --sk-ink border + machined corner studs)
      g.strokeStyle = pal.ink;
      g.lineWidth = lw;
      g.stroke(outerPoly);

      for (let i = 0; i < n; i++) {
        const ang = this._axisAngle(i);
        const vx = cx + Math.cos(ang) * R;
        const vy = cy + Math.sin(ang) * R;
        const isAct = i === activeAxis;
        g.fillStyle = isAct ? pal.acc : pal.ink;
        g.beginPath();
        g.arc(vx, vy, (isAct ? 3.6 : 2.3) * sizeSc, 0, TAU);
        g.fill();
      }

      // 7. Stat Polygons (draw inactive series first, active series always on top!)
      const drawOrder = this._series.map((_, idx) => idx);
      if (this._activeSeries >= 0 && this._activeSeries < drawOrder.length) {
        drawOrder.splice(drawOrder.indexOf(this._activeSeries), 1);
        drawOrder.push(this._activeSeries);
      }

      for (const si of drawOrder) {
        const s = this._series[si];
        const col = this._resolveSeriesColor(s, si);
        const ratios = s.values.map((v, i) => clamp(this.radS[si]?.[i]?.x ?? (v / this.max), 0, 1.15));
        const hasArea = ratios.some((r) => r > 0.02);
        if (!hasArea) continue;

        const poly = this._statPolyPath(cx, cy, R, ratios);
        const isPrimaryStyle = si === 0;
        const isFront = si === this._activeSeries || this._series.length === 1;

        // 7a. Screentone fill (Ben-Day dots for Series 0, diagonal manga hatch for Series 1+)
        g.save();
        g.clip(poly);
        g.fillStyle = this._getPattern(col, isPrimaryStyle ? 'dots' : 'hatch');
        g.fill(poly);

        // 7b. Bold flat cel inner highlight rim clipped cleanly inside the stat polygon!
        g.strokeStyle = col;
        g.lineWidth = (isFront ? 9.5 : 7.5) * sizeSc;
        g.stroke(poly);

        // 7c. Crisp white comic specular slash inside the upper rim on primary series
        if (isFront) {
          g.strokeStyle = '#ffffff';
          g.lineWidth = 2.0 * sizeSc;
          const a0 = this._axisAngle(0);
          const aL = this._axisAngle(n - 1);
          const r0 = R * Math.max(0.05, ratios[0]);
          const rL = R * Math.max(0.05, ratios[n - 1]);
          const p0x = cx + Math.cos(a0) * (r0 * 0.88);
          const p0y = cy + Math.sin(a0) * (r0 * 0.88);
          const pLx = cx + Math.cos(aL) * (rL * 0.88);
          const pLy = cy + Math.sin(aL) * (rL * 0.88);
          g.beginPath();
          g.moveTo(lerp(p0x, pLx, 0.16), lerp(p0y, pLy, 0.16));
          g.lineTo(lerp(p0x, pLx, 0.44), lerp(p0y, pLy, 0.44));
          g.stroke();
        }
        g.restore();

        // 7d. Outer ink contour around stat polygon (solid bold ink for Series 0, crisp dashed ink + color for Rival)
        g.save();
        if (!isPrimaryStyle) {
          g.strokeStyle = col;
          g.lineWidth = Math.max(2.4, lw * 0.85);
          g.stroke(poly);
          g.strokeStyle = pal.ink;
          g.lineWidth = Math.max(1.8, lw * 0.62);
          g.setLineDash([7 * sizeSc, 4 * sizeSc]);
          g.stroke(poly);
        } else {
          g.strokeStyle = pal.ink;
          g.lineWidth = Math.max(2.4, lw * 0.9);
          g.stroke(poly);
        }
        g.restore();

        // 7e. Vertex Nodes
        for (let i = 0; i < n; i++) {
          const ang = this._axisAngle(i);
          const rr = R * Math.max(0.015, ratios[i]);
          const vx = cx + Math.cos(ang) * rr;
          const vy = cy + Math.sin(ang) * rr;
          const isAct = i === activeAxis && isFront;
          const isSRank = ratios[i] >= 0.90 - 1e-6;
          const nSc = isFront ? clamp(this.nodeS[i]?.x ?? 1, 0.5, 2.0) : 0.92;
          const nr = spec.nodeR * sizeSc * nSc;

          // Subtle static pink accent halo on S-rank vertices (primary/active series)
          if (isSRank && isFront) {
            g.strokeStyle = pal.acc;
            g.lineWidth = Math.max(1.6, lw * 0.55);
            g.beginPath();
            g.arc(vx, vy, nr + 3.4 * sizeSc, 0, TAU);
            g.stroke();
          }

          // Interactive radial drag chevron cue on hovered/dragged vertex
          if (this.interactive && isAct) {
            const cDist = nr + 7.5 * sizeSc;
            const cSize = 3.5 * sizeSc;
            g.save();
            g.translate(vx + Math.cos(ang) * cDist, vy + Math.sin(ang) * cDist);
            g.rotate(ang);
            g.strokeStyle = pal.acc;
            g.lineWidth = Math.max(1.8, lw * 0.6);
            g.beginPath();
            g.moveTo(-cSize * 0.4, -cSize);
            g.lineTo(cSize * 0.8, 0);
            g.lineTo(-cSize * 0.4, cSize);
            g.stroke();
            g.restore();
          }

          if (!isPrimaryStyle) {
            // Diamond vertex node for comparison series
            g.save();
            g.translate(vx, vy);
            g.rotate(Math.PI / 4);
            const ds = nr * 1.48;
            g.fillStyle = isAct ? pal.acc : col;
            g.fillRect(-ds * 0.5, -ds * 0.5, ds, ds);
            g.strokeStyle = pal.ink;
            g.lineWidth = Math.max(1.8, lw * 0.68);
            g.strokeRect(-ds * 0.5, -ds * 0.5, ds, ds);
            g.fillStyle = '#ffffff';
            g.fillRect(-ds * 0.2, -ds * 0.2, ds * 0.4, ds * 0.4);
            g.restore();
          } else {
            // Circular cel-shaded vertex node for primary series
            g.fillStyle = isAct || isSRank ? pal.acc : col;
            g.beginPath();
            g.arc(vx, vy, nr, 0, TAU);
            g.fill();

            g.strokeStyle = pal.ink;
            g.lineWidth = Math.max(2.0, lw * 0.72);
            g.stroke();

            // Crisp white cel core dot
            g.fillStyle = '#ffffff';
            g.beginPath();
            g.arc(vx - nr * 0.22, vy - nr * 0.22, Math.max(1.4, nr * 0.34), 0, TAU);
            g.fill();
          }
        }
      }

      // 8. Central Rivet Anchor
      g.fillStyle = pal.card;
      g.beginPath();
      g.arc(cx, cy, 3.2 * sizeSc, 0, TAU);
      g.fill();
      g.strokeStyle = pal.ink;
      g.lineWidth = Math.max(1.6, lw * 0.55);
      g.stroke();

      // 9. Manga Vertex Labels & Rank Stamps (crystal clear, auto-clamped inside canvas bounds!)
      this._drawAxisLabels(g, lay, cx, cy, activeAxis);
    }

    _drawAxisLabels(g, lay, cx, cy, activeAxis) {
      const { spec, w, h, R, sizeSc } = lay;
      const pal = this._pal;
      const n = this._axes.length;
      const sIdx = clamp(this._activeSeries, 0, this._series.length - 1);
      const showRanks = this.showRanks;
      const u = this.unit;

      const lblPx = spec.lblFont * sizeSc;
      const valPx = spec.valFont * sizeSc;
      const rankPx = spec.rankFont * sizeSc;
      const fontFamily = '"Avenir Next", "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const uiFamily = '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif';

      this._hitAxes = [];

      for (let i = 0; i < n; i++) {
        const ang = this._axisAngle(i);
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const isAct = i === activeAxis;
        const val = this._series[sIdx].values[i] ?? 0;
        const ratio = clamp(val / this.max, 0, 1);
        const grade = rankFor(ratio);
        const isSRank = grade === 'S';

        const isCenterX = Math.abs(ca) < 0.22;
        const align = isCenterX ? 'center' : (ca > 0 ? 'left' : 'right');

        const padOut = (isCenterX ? 14 : 13) * sizeSc;
        let ax = cx + ca * (R + padOut);
        let ay = cy + sa * (R + padOut);

        // Compute available horizontal room for side labels so text NEVER clips!
        const edgeMargin = 4 * sizeSc;
        const maxTextW = isCenterX
          ? w - edgeMargin * 2
          : (align === 'left' ? Math.max(40, w - ax - edgeMargin) : Math.max(40, ax - edgeMargin));

        // Vertical anchor adjustment for top/bottom vs side vertices
        const lineGap = 15 * sizeSc;
        let lblY, statY;
        if (isCenterX && sa < 0) {
          // Top vertex: stack label above rank/value row, both sitting cleanly above top tip
          statY = ay - 6 * sizeSc;
          lblY = statY - lineGap;
        } else if (isCenterX && sa > 0) {
          // Bottom vertex: label directly below tip, rank/value beneath it
          lblY = ay + 9 * sizeSc;
          statY = lblY + lineGap;
        } else {
          // Side vertices: center the 2-row block vertically on the vertex
          lblY = ay - 6 * sizeSc;
          statY = ay + 9.5 * sizeSc;
        }

        // Fit label text inside maxTextW
        const rawText = String(this._axes[i]).toUpperCase();
        g.font = `800 ${lblPx.toFixed(1)}px ${uiFamily}`;
        let drawText = rawText;
        let tw = g.measureText(drawText).width;
        if (tw > maxTextW) {
          while (drawText.length > 2 && g.measureText(drawText + '…').width > maxTextW) {
            drawText = drawText.slice(0, -1);
          }
          drawText += '…';
          tw = g.measureText(drawText).width;
        }

        // White paper halo stroke around label so back-layer burst spikes never muddy legibility
        g.textAlign = align;
        g.textBaseline = 'middle';
        g.lineJoin = 'round';
        g.strokeStyle = pal.card;
        g.lineWidth = 4.2 * sizeSc;
        g.strokeText(drawText, ax, lblY);

        g.fillStyle = isAct ? pal.acc : pal.ink;
        g.fillText(drawText, ax, lblY);

        // Row 2: Compact Rank Stamp + Tabular Stat Value
        const valText = this._series.length > 1
          ? `${formatVal(this._series[0].values[i], this.max)}/${formatVal(this._series[1].values[i], this.max)}`
          : `${formatVal(val, this.max)}${u}`;
        g.font = `900 ${valPx.toFixed(1)}px ${fontFamily}`;
        const vw = g.measureText(valText).width;

        const stampW = showRanks ? 17 * sizeSc : 0;
        const stampH = showRanks ? 14.5 * sizeSc : 0;
        const gap = showRanks ? 4.5 * sizeSc : 0;
        const totalRowW = stampW + gap + vw;

        let rowLeft;
        if (align === 'center') rowLeft = ax - totalRowW * 0.5;
        else if (align === 'left') rowLeft = ax;
        else rowLeft = ax - totalRowW;

        // Clamp row inside canvas edges cleanly
        rowLeft = clamp(rowLeft, edgeMargin, Math.max(edgeMargin, w - totalRowW - edgeMargin));

        if (showRanks) {
          const sx = rowLeft;
          const sy = statY - stampH * 0.5;

          // Slanted manga rank stamp box
          g.save();
          g.translate(sx + stampW * 0.5, sy + stampH * 0.5);
          g.transform(1, 0, -0.18, 1, 0, 0); // skewX(-10deg)

          // Hard tiny offset shadow on S & A ranks
          if (isSRank || grade === 'A') {
            g.fillStyle = isSRank ? pal.ink : pal.soft;
            this._drawRoundRect(g, -stampW * 0.5 + 1.8 * sizeSc, -stampH * 0.5 + 1.8 * sizeSc, stampW, stampH, 2.5 * sizeSc);
            g.fill();
          }

          let bg = pal.card, fg = pal.ink, bd = pal.ink;
          if (grade === 'S') { bg = pal.acc; fg = '#ffffff'; bd = pal.ink; }
          else if (grade === 'A') { bg = pal.pri; fg = '#ffffff'; bd = pal.ink; }
          else if (grade === 'B') { bg = pal.card; fg = pal.ink; bd = pal.ink; }
          else { bg = pal.card; fg = pal.dim; bd = pal.dim; }

          this._drawRoundRect(g, -stampW * 0.5, -stampH * 0.5, stampW, stampH, 2.5 * sizeSc);
          g.fillStyle = bg;
          g.fill();
          g.strokeStyle = bd;
          g.lineWidth = Math.max(1.4, 1.7 * sizeSc);
          g.stroke();

          g.font = `italic 900 ${rankPx.toFixed(1)}px ${fontFamily}`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = fg;
          g.fillText(grade, 0, 0.6 * sizeSc);
          g.restore();
        }

        // Numeric stat readout beside rank stamp
        const vxPos = rowLeft + stampW + gap;
        g.font = `800 ${valPx.toFixed(1)}px ${fontFamily}`;
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        g.strokeStyle = pal.card;
        g.lineWidth = 3.8 * sizeSc;
        g.strokeText(valText, vxPos, statY);
        g.fillStyle = isAct || isSRank ? pal.acc : pal.dim;
        g.fillText(valText, vxPos, statY);

        // Save hit bounding box for forgiving click/hover on labels
        const bx0 = Math.min(align === 'center' ? ax - tw * 0.5 : (align === 'left' ? ax : ax - tw), rowLeft) - 5;
        const bx1 = Math.max(align === 'center' ? ax + tw * 0.5 : (align === 'left' ? ax + tw : ax), rowLeft + totalRowW) + 5;
        const by0 = Math.min(lblY, statY) - 10;
        const by1 = Math.max(lblY, statY) + 10;
        this._hitAxes.push({ i, x0: bx0, x1: bx1, y0: by0, y1: by1 });
      }
    }

    // ─── Shared Clock Frame Loop ───
    frame(dt) {
      this._t += dt;
      if (fx.calm) {
        if (this._needsDraw) {
          this._needsDraw = false;
          this._readPalette();
          this._draw();
        }
        return;
      }

      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      if (dpr !== this._dpr) {
        this._resizeCanvas();
        this._needsDraw = true;
      }

      let canvasMoving = false;

      // Step all radial springs
      for (let s = 0; s < this.radS.length; s++) {
        const row = this.radS[s];
        for (let i = 0; i < row.length; i++) {
          const sp = row[i];
          const prev = sp.x;
          const x = sp.step(dt);
          if (this._dragging && s === this._activeSeries && i === this._dragIdx) {
            if (Math.abs(sp.v) > Math.abs(this._dragPeakV)) this._dragPeakV = sp.v;
            else this._dragPeakV *= 0.94;
          }
          if (Math.abs(x - prev) > 0.00015 || Math.abs(x - sp.to) > 0.0006 || Math.abs(sp.v) > 0.005) {
            canvasMoving = true;
          }
        }
      }

      // Step vertex pop springs
      for (let i = 0; i < this.nodeS.length; i++) {
        const sp = this.nodeS[i];
        const prev = sp.x;
        const x = sp.step(dt);
        if (Math.abs(x - prev) > 0.0003 || Math.abs(x - sp.to) > 0.001 || Math.abs(sp.v) > 0.008) {
          canvasMoving = true;
        }
      }

      // Step stage squash & tilt (volume-preserving)
      const sy = this.stageS.step(dt);
      const tilt = this.stageTilt.step(dt);
      const stageStill = Math.abs(sy - 1) < 0.001 && Math.abs(this.stageS.v) < 0.008 && Math.abs(tilt) < 0.02 && Math.abs(this.stageTilt.v) < 0.05;
      if (stageStill) {
        if (this.elRadar.style.transform) this.elRadar.style.transform = '';
      } else {
        const sx = 1 + (1 - sy) * 0.55;
        this.elRadar.style.transform = `rotate(${tilt.toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      }

      // Step overall score badge pop
      const bSc = this.badgeS.step(dt);
      const badgeStill = Math.abs(bSc - 1) < 0.001 && Math.abs(this.badgeS.v) < 0.008;
      this.elBadge.style.transform = badgeStill ? 'skewX(-10deg)' : `skewX(-10deg) scale(${bSc.toFixed(4)})`;

      // Step speech-bubble callout spring
      if (this.tipEl) {
        const ty = Math.max(0, this.tipS.step(dt));
        if (ty < 0.005) {
          if (this.tipEl.style.transform !== 'scale(0)') this.tipEl.style.transform = 'scale(0)';
        } else {
          this.tipEl.style.transform = `scale(${ty.toFixed(4)}) skewX(-8deg) rotate(${((1 - ty) * -8).toFixed(2)}deg)`;
          if (this._activeCalloutIdx >= 0 && canvasMoving) {
            this._positionCallout(this._activeCalloutIdx);
          }
        }
      }

      // Decay brief impact tremble & shadow accent flash
      if (this._trembleT > 0) {
        this._trembleT = Math.max(0, this._trembleT - dt);
        canvasMoving = true;
      }
      if (this._flashT > 0) {
        this._flashT = Math.max(0, this._flashT - dt);
        canvasMoving = true;
      }

      if (canvasMoving || this._needsDraw) {
        if (this._t - this._palAt > 0.5) this._readPalette();
        this._draw();
        this._needsDraw = false;
      }
    }
  }

  fx.define('sakuga-radar', SakugaRadar);
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
