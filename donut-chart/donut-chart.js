// Sakuga Donut Chart: a cel-shaded anime donut & pie distribution chart drawn on a high-DPI
// shared-clock shadow-DOM canvas with independent per-slice radial springs, slanted manga center KPI,
// synchronized legend pills, manga speech-bubble callout, and anime hit VFX (puff, ticks, kira,
// back-layer burst, iris ring, and hollow カチッ).
//
// Usage:
//   <sakuga-donut-chart label="Studio Time" unit="h"></sakuga-donut-chart>
//   el.items = [{ label: 'Key Animation', value: 64, tone: 'pri', sub: 'Genga' }, ...];
(() => {
'use strict';

function component(fx) {
  const { TAU, clamp, lerp, rnd, Spring, later, esc, burst, puff, ring, ticks, kira, sfx, hollow } = fx;

  const START_A = -Math.PI / 2; // 12 o'clock clockwise

  const SIZES = {
    sm: { d: 168, bleed: 22, Ro: 66,  rIn: 39, lw: 2.6, shX: 4, shY: 5, explode: 9,    kpiFont: 16,   capFont: 8.5,  subFont: 9.5  },
    md: { d: 228, bleed: 26, Ro: 92,  rIn: 55, lw: 3.2, shX: 5, shY: 6, explode: 11.5, kpiFont: 23.5, capFont: 9.5,  subFont: 10.5 },
    lg: { d: 288, bleed: 30, Ro: 118, rIn: 72, lw: 3.6, shX: 6, shY: 7, explode: 13.5, kpiFont: 29,   capFont: 11,   subFont: 11.5 },
  };

  const DEFAULT_CYCLE = ['pri', 'acc', 'cyan', 'amber', 'green', 'soft'];

  const FIXED_TONES = {
    green: { fill: '#38c98a', shade: '#22a56e' },
    amber: { fill: '#ff9b54', shade: '#e0762e' },
    cyan:  { fill: '#4ecdc4', shade: '#2ca69e' },
  };

  function darkenHex(color, factor = 0.8) {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color || '').trim());
    if (!m) return '#6e6ce0';
    let h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) * factor)));
    const g = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) * factor)));
    const b = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) * factor)));
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
  }

  function fmtNum(v) {
    const n = Number(v) || 0;
    if (Number.isInteger(n)) return String(n);
    const r1 = Math.round(n * 10) / 10;
    if (Math.abs(n - r1) < 0.005) return String(r1);
    return n.toFixed(2);
  }

  // Largest-remainder integer percentages so displayed percentages sum cleanly to 100%.
  function computePercents(values) {
    const total = values.reduce((a, b) => a + b, 0);
    if (!(total > 0)) return values.map(() => 0);
    const exact = values.map((v) => (v / total) * 100);
    const floors = exact.map((e) => Math.floor(e));
    let rem = 100 - floors.reduce((a, b) => a + b, 0);
    const order = exact.map((e, i) => ({ i, frac: e - floors[i], v: values[i] }))
      .sort((a, b) => (b.frac - a.frac) || (b.v - a.v));
    for (let k = 0; k < order.length && rem > 0; k++) {
      if (order[k].v > 0) {
        floors[order[k].i]++;
        rem--;
      }
    }
    return floors;
  }

  class SakugaDonutChart extends fx.Base {
    static observedAttributes = [
      'mode', 'size', 'unit', 'label', 'center-value', 'legend', 'selected', 'data', 'empty-text',
    ];

    static css = `
      :host {
        display: block;
        width: 100%;
        max-width: 100%;
        user-select: none;
        -webkit-user-select: none;
        --_d: 228px;
        --_bleed: 26px;
        --_hole-d: 92px;
        --_kpi-font: 23.5px;
        --_cap-font: 9.5px;
        --_sub-font: 10.5px;
      }
      :host([size="sm"]) {
        --_d: 168px; --_bleed: 22px; --_hole-d: 66px;
        --_kpi-font: 16px; --_cap-font: 8.5px; --_sub-font: 9.5px;
      }
      :host([size="lg"]) {
        --_d: 288px; --_bleed: 30px; --_hole-d: 122px;
        --_kpi-font: 29px; --_cap-font: 11px; --_sub-font: 11.5px;
      }

      .wrap {
        position: relative;
        width: 100%;
        max-width: 100%;
        container-type: inline-size;
      }

      .shell {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 18px;
        width: 100%;
        max-width: 100%;
      }
      :host([legend="side"]) .shell {
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 24px;
      }
      :host([legend="none"]) .legend {
        display: none;
      }

      .dial-stage {
        position: relative;
        flex: none;
        width: min(calc(var(--_d) + 20px), 100%);
        aspect-ratio: 1 / 1;
        display: grid;
        place-items: center;
      }

      .dial-box {
        position: relative;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        will-change: transform;
        touch-action: manipulation;
      }
      .dial-box:focus-visible {
        outline: 2.5px solid var(--sk-acc);
        outline-offset: 6px;
      }
      .dial-box.is-hit {
        cursor: pointer;
      }

      canvas.face {
        position: absolute;
        left: calc((var(--_bleed) - 10px) * -1);
        top: calc((var(--_bleed) - 10px) * -1);
        width: calc(100% + (var(--_bleed) - 10px) * 2);
        height: calc(100% + (var(--_bleed) - 10px) * 2);
        display: block;
        pointer-events: none;
      }

      /* ── Slanted Manga Center KPI Readout ── */
      .kpi {
        position: absolute;
        left: 50%;
        top: 50%;
        width: var(--_hole-d);
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        pointer-events: none;
        z-index: 2;
        will-change: transform;
      }
      .kpi-cap {
        max-width: 86%;
        font: 800 var(--_cap-font)/1.08 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
        color: var(--sk-dim);
        letter-spacing: 0.025em;
        text-transform: uppercase;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-wrap: balance;
      }
      .kpi.is-slice .kpi-cap {
        color: var(--sk-ink);
      }
      .kpi-num {
        margin-top: 2px;
        font: italic 900 var(--_kpi-font)/1.02 "Avenir Next", "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.025em;
        color: var(--sk-ink);
        transform: skewX(-8deg);
        white-space: nowrap;
      }
      .kpi-num.is-long { font-size: calc(var(--_kpi-font) * 0.78); }
      .kpi-num.is-xlong { font-size: calc(var(--_kpi-font) * 0.66); }
      .kpi.is-peak .kpi-num {
        color: var(--sk-acc);
      }
      .kpi-bar {
        width: 24px;
        height: 3px;
        margin-top: 4px;
        border-radius: 2px;
        background: var(--sk-acc);
        transform: skewX(-16deg);
      }
      .kpi.is-slice .kpi-bar {
        display: none;
      }
      .kpi-sub {
        display: none;
        margin-top: 4px;
        padding: 1.5px 7px;
        border: 1.8px solid var(--sk-ink);
        border-radius: 999px;
        background: var(--sk-card);
        box-shadow: 2px 2px 0 var(--sk-soft);
        font: 800 var(--_sub-font)/1.15 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
        font-variant-numeric: tabular-nums;
        color: var(--sk-ink);
        white-space: nowrap;
        max-width: 96%;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .kpi.is-slice .kpi-sub {
        display: inline-block;
      }
      .kpi.is-peak .kpi-sub {
        box-shadow: 2px 2px 0 var(--sk-acc);
      }

      /* ── Manga Speech-Bubble Callout ── */
      .callout {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 14;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 11px;
        border: 2.5px solid var(--sk-ink);
        border-radius: 10px;
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: 4px 4px 0 var(--sk-soft);
        font-size: 12px;
        font-weight: 800;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        pointer-events: none;
        will-change: transform;
        transform-origin: var(--tail-x, 50%) 115%;
        transform: scale(0);
      }
      .callout[data-pos="bottom"] {
        transform-origin: var(--tail-x, 50%) -15%;
      }
      .callout[data-pos="right"] {
        transform-origin: -10% var(--tail-y, 50%);
      }
      .callout[data-pos="left"] {
        transform-origin: 110% var(--tail-y, 50%);
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
      .callout[data-pos="bottom"]::after {
        top: auto;
        bottom: 100%;
        border-top: 7px solid transparent;
        border-bottom: 9px solid var(--sk-ink);
      }
      .callout[data-pos="bottom"]::before {
        top: auto;
        bottom: calc(100% - 3.5px);
        border-top: 4.5px solid transparent;
        border-bottom: 6.5px solid var(--sk-card);
      }
      .callout[data-pos="right"]::after {
        left: auto;
        right: 100%;
        top: var(--tail-y, 50%);
        margin-left: 0;
        margin-top: -7px;
        border: 7px solid transparent;
        border-right: 9px solid var(--sk-ink);
      }
      .callout[data-pos="right"]::before {
        left: auto;
        right: calc(100% - 3.5px);
        top: var(--tail-y, 50%);
        margin-left: 0;
        margin-top: -4.5px;
        border: 4.5px solid transparent;
        border-right: 6.5px solid var(--sk-card);
      }
      .callout[data-pos="left"]::after {
        left: 100%;
        top: var(--tail-y, 50%);
        margin-left: 0;
        margin-top: -7px;
        border: 7px solid transparent;
        border-left: 9px solid var(--sk-ink);
      }
      .callout[data-pos="left"]::before {
        left: calc(100% - 3.5px);
        top: var(--tail-y, 50%);
        margin-left: 0;
        margin-top: -4.5px;
        border: 4.5px solid transparent;
        border-left: 6.5px solid var(--sk-card);
      }
      .c-dot {
        width: 10px;
        height: 10px;
        flex: none;
        border: 1.8px solid var(--sk-ink);
        border-radius: 3px;
        background: var(--c-col, var(--sk-pri));
      }
      .c-lbl { color: var(--sk-ink); font-weight: 800; }
      .c-val { color: var(--sk-dim); font-weight: 800; }
      .c-pct {
        color: var(--sk-acc);
        font: italic 900 13px/1 "Avenir Next", "Nunito", -apple-system, "Segoe UI", sans-serif;
        font-variant-numeric: tabular-nums;
      }

      /* ── Synchronized Manga Legend Pills ── */
      .legend {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 8px 9px;
        width: 100%;
        max-width: 100%;
      }
      :host([legend="side"]) .legend {
        flex-direction: column;
        align-items: stretch;
        width: auto;
        min-width: 190px;
        max-width: 248px;
        flex: 0 1 232px;
      }

      .leg-pill {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 34px;
        max-width: 100%;
        padding: 5px 10px 5px 8px;
        border: 2.3px solid var(--sk-ink);
        border-radius: 11px;
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: 3px 3px 0 var(--sk-soft);
        font-size: 12.5px;
        font-weight: 800;
        line-height: 1.15;
        cursor: pointer;
        text-align: left;
        will-change: transform;
      }
      :host([legend="side"]) .leg-pill {
        justify-content: space-between;
        width: 100%;
      }
      .leg-pill.is-hover {
        box-shadow: 4px 5px 0 var(--sk-acc);
      }
      .leg-pill.is-selected {
        background: var(--sk-card);
        box-shadow: 4px 5px 0 var(--sk-acc);
      }
      .leg-pill.is-selected .leg-pct {
        background: var(--sk-acc);
        color: #ffffff;
        border-color: var(--sk-ink);
      }

      .leg-left {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .leg-sw {
        position: relative;
        width: 13px;
        height: 13px;
        flex: none;
        border: 2px solid var(--sk-ink);
        border-radius: 4px;
        background: var(--sw-col, var(--sk-pri));
        overflow: hidden;
      }
      .leg-sw::before {
        content: "";
        position: absolute;
        left: 1.5px;
        top: 1.5px;
        width: 4px;
        height: 2.5px;
        border-radius: 1px;
        background: #ffffff;
        transform: skewX(-20deg);
      }
      .leg-name {
        color: var(--sk-ink);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .leg-meta {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        flex: none;
        font-variant-numeric: tabular-nums;
      }
      .leg-val {
        color: var(--sk-dim);
        font-size: 11.5px;
        font-weight: 800;
        white-space: nowrap;
      }
      .leg-pct {
        padding: 1.5px 6px;
        border: 1.6px solid var(--sk-ink);
        border-radius: 7px;
        background: var(--sk-card);
        color: var(--sk-ink);
        font-size: 11px;
        font-weight: 900;
        line-height: 1.1;
        white-space: nowrap;
      }

      /* ── Empty State ── */
      .empty {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 140px;
        padding: 24px 16px;
        border: 2.4px dashed var(--sk-track);
        border-radius: var(--sk-r, 15px);
        background: var(--sk-card);
        color: var(--sk-dim);
        font-size: 13.5px;
        font-weight: 800;
        text-align: center;
      }

      /* Responsive fallback so side legend stacks cleanly on phones / narrow cards */
      @container (max-width: 470px) {
        :host([legend="side"]) .shell {
          flex-direction: column;
          gap: 16px;
        }
        :host([legend="side"]) .legend {
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: center;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          flex: none;
        }
        :host([legend="side"]) .leg-pill {
          width: auto;
        }
      }

      @media (max-width: 470px) {
        :host([legend="side"]) .shell {
          flex-direction: column;
          gap: 16px;
        }
        :host([legend="side"]) .legend {
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: center;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          flex: none;
        }
        :host([legend="side"]) .leg-pill {
          width: auto;
        }
        .leg-pill {
          font-size: 12px;
          padding: 5px 8px 5px 7px;
          gap: 6px;
        }
      }
    `;

    constructor() {
      super();
      this._items = null;
      this._slices = [];
      this._totalVal = 0;
      this._peakIdx = -1;
      this._selected = -1;
      this._hovered = -1;
      this._kbIdx = -1;
      this._seq = 0;
      this._t = 0;
      this._palAt = -1;
      this._pal = null;
      this._needsDraw = true;
      this._inited = false;
      this._reflectingSel = false;
    }

    // ─── Public Properties ───
    get mode() { return this.getAttribute('mode') === 'pie' ? 'pie' : 'donut'; }
    set mode(v) { this.setAttribute('mode', v === 'pie' ? 'pie' : 'donut'); }

    get size() {
      const s = this.getAttribute('size');
      return SIZES[s] ? s : 'md';
    }
    set size(v) {
      if (!v) this.removeAttribute('size');
      else this.setAttribute('size', String(v));
    }

    get unit() { return this.getAttribute('unit') || ''; }
    set unit(v) {
      if (v === null || v === undefined) this.removeAttribute('unit');
      else this.setAttribute('unit', String(v));
    }

    get label() { return this.getAttribute('label') || 'Total'; }
    set label(v) {
      if (v === null || v === undefined || v === '') this.removeAttribute('label');
      else this.setAttribute('label', String(v));
    }

    get centerValue() { return this.getAttribute('center-value') || ''; }
    set centerValue(v) {
      if (v === null || v === undefined || v === '') this.removeAttribute('center-value');
      else this.setAttribute('center-value', String(v));
    }

    get legend() {
      const l = this.getAttribute('legend');
      return l === 'side' || l === 'none' ? l : 'bottom';
    }
    set legend(v) {
      if (!v) this.removeAttribute('legend');
      else this.setAttribute('legend', String(v));
    }

    get emptyText() { return this.getAttribute('empty-text') || 'No data'; }
    set emptyText(v) { this.setAttribute('empty-text', v ?? ''); }

    get selected() { return this._selected; }
    set selected(v) {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) this.clearSelection();
      else this.select(n);
    }

    get items() { return this._items || []; }
    set items(list) {
      this._items = Array.isArray(list) ? list.slice() : [];
      if (this._inited) this._rebuild(true);
    }

    // ─── DOM Render & Setup ───
    render() {
      return `<div class="wrap" part="chart"></div>`;
    }

    setup() {
      this.elWrap = this.$('.wrap');
      this.back = this.backLayer();
      this._inited = true;

      this.sweepS = new Spring(fx.calm ? 1 : 0, 115, 14.5);
      this.holeS = new Spring(this.mode === 'pie' ? 0 : 1, 250, 17);
      this.dialS = new Spring(1, 400, 15);
      this.badgeS = new Spring(1, 460, 15);
      this.tipS = new Spring(0, 480, 16);
      this._lastTipBox = null;

      this.explodeS = [];
      this.scaleS = [];
      this.pillS = [];
      this.pills = [];
      this.cv = null;
      this.ctx = null;
      this.elDial = null;
      this.elKpi = null;
      this.elKpiCap = null;
      this.elKpiNum = null;
      this.elKpiSub = null;
      this.elTip = null;
      this.elLive = null;
      this._spec = SIZES[this.size];
      this._dpr = Math.min(2.5, window.devicePixelRatio || 1);
      this._totalPx = this._spec.d + this._spec.bleed * 2;
      this._lastKpiKey = '';
      this._tipIdx = -1;

      this._onDocDown = (e) => {
        if (this._selected < 0 && this._hovered < 0) return;
        if (!e.composedPath().includes(this)) {
          this._hovered = -1;
          this._kbIdx = -1;
          if (this._selected >= 0) this.clearSelection();
          else this._syncActiveVisuals(false);
        }
      };
      document.addEventListener('pointerdown', this._onDocDown);

      // Parse initial selected attribute if specified before items
      const initSel = this.getAttribute('selected');
      this._pendingSelected = initSel !== null && initSel !== '' ? parseInt(initSel, 10) : -1;

      if (this._items === null) {
        const raw = this.getAttribute('data');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            this._items = Array.isArray(parsed) ? parsed : [];
          } catch {
            this._items = [];
          }
        } else {
          this._items = [];
        }
      }

      this._readPalette();
      this._rebuild(true);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this._seq++;
      if (this._onDocDown) document.removeEventListener('pointerdown', this._onDocDown);
    }

    attributeChangedCallback(name, oldV, newV) {
      if (!this._inited || oldV === newV) return;
      if (name === 'data') {
        try {
          const parsed = newV ? JSON.parse(newV) : [];
          this._items = Array.isArray(parsed) ? parsed : [];
        } catch {
          this._items = [];
        }
        this._rebuild(true);
      } else if (name === 'mode') {
        this._onModeChange();
      } else if (name === 'size') {
        this._resizeCanvas();
        this._needsDraw = true;
        this._draw();
        if (this._activeIdx() >= 0) this._positionCallout(this._activeIdx());
      } else if (name === 'unit' || name === 'empty-text') {
        this._rebuild(false);
      } else if (name === 'label' || name === 'center-value') {
        this._syncCenterKpi(false);
        this._syncDialAria();
      } else if (name === 'legend') {
        if (this._activeIdx() >= 0) {
          later(16, () => { if (this.isConnected && this._activeIdx() >= 0) this._positionCallout(this._activeIdx()); });
        }
      } else if (name === 'selected') {
        if (this._reflectingSel) return;
        const idx = newV === null || newV === '' ? -1 : parseInt(newV, 10);
        if (!Number.isInteger(idx) || idx < 0) this.clearSelection();
        else this.select(idx);
      }
    }

    // ─── Formatting & Palette ───
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
      this._pal = { ink, card, soft, pri, acc, dim, track };
      this._palAt = this._t;
    }

    _resolveToneColors(toneKey, pal) {
      const k = String(toneKey || '').trim().toLowerCase();
      if (k === 'pri') return { key: 'pri', fill: pal.pri, shade: darkenHex(pal.pri, 0.8) };
      if (k === 'acc') return { key: 'acc', fill: pal.acc, shade: darkenHex(pal.acc, 0.82) };
      if (k === 'soft') return { key: 'soft', fill: pal.soft, shade: darkenHex(pal.soft, 0.82) };
      if (k === 'ink') return { key: 'ink', fill: pal.ink, shade: '#100e2e' };
      if (FIXED_TONES[k]) return { key: k, fill: FIXED_TONES[k].fill, shade: FIXED_TONES[k].shade };
      if (/^(#|rgb|hsl)/i.test(k)) return { key: 'custom', fill: toneKey, shade: darkenHex(toneKey, 0.8) };
      return { key: 'pri', fill: pal.pri, shade: darkenHex(pal.pri, 0.8) };
    }

    _formatItemVal(it) {
      if (it.valueText != null && it.valueText !== '') return String(it.valueText);
      return fmtNum(Math.max(0, Number(it.value) || 0)) + this.unit;
    }

    _formatTotal() {
      if (this.centerValue) return this.centerValue;
      return fmtNum(this._totalVal) + this.unit;
    }

    // ─── Build Slices & Shadow DOM ───
    _rebuild(animate) {
      this._seq++;
      const list = (this._items || []).filter((it) => it && typeof it === 'object');
      this._readPalette();
      const pal = this._pal;

      const cleanValues = list.map((it) => Math.max(0, Number(it.value) || 0));
      const total = cleanValues.reduce((a, b) => a + b, 0);
      this._totalVal = total;
      this._hovered = -1;
      this._kbIdx = -1;
      this._tipIdx = -1;
      this._lastKpiKey = '';
      this.pills = [];
      this.explodeS = [];
      this.scaleS = [];
      this.pillS = [];
      this._slices = [];
      this._peakIdx = -1;

      if (!list.length || !(total > 0)) {
        this._selected = -1;
        this.cv = null;
        this.ctx = null;
        this.elWrap.innerHTML = `<div class="empty" part="empty">${esc(this.emptyText)}</div>`;
        return;
      }

      const percents = computePercents(cleanValues);

      // Assign automatic tones cleanly, avoiding adjacent wrap-around color clash at 12 o'clock
      const toneKeys = list.map((it, i) => it.tone || DEFAULT_CYCLE[i % DEFAULT_CYCLE.length]);
      if (list.length > 1 && !list[list.length - 1].tone && toneKeys[list.length - 1] === toneKeys[0]) {
        const altIdx = (DEFAULT_CYCLE.indexOf(toneKeys[list.length - 1]) + 1) % DEFAULT_CYCLE.length;
        const prevKey = toneKeys[list.length - 2];
        const candidate = DEFAULT_CYCLE[altIdx];
        toneKeys[list.length - 1] = candidate === prevKey
          ? DEFAULT_CYCLE[(altIdx + 1) % DEFAULT_CYCLE.length]
          : candidate;
      }

      let peakVal = -1;
      let peakIdx = 0;
      let cursor = START_A;
      this._slices = list.map((it, i) => {
        const val = cleanValues[i];
        const frac = val / total;
        const span = frac * TAU;
        const a0 = cursor;
        const a1 = i === list.length - 1 ? START_A + TAU : cursor + span;
        cursor = a1;
        if (val > peakVal) { peakVal = val; peakIdx = i; }
        const colors = this._resolveToneColors(toneKeys[i], pal);
        return {
          index: i,
          item: it,
          label: String(it.label ?? `Slice ${i + 1}`),
          sub: it.sub ? String(it.sub) : '',
          value: val,
          valueStr: this._formatItemVal(it),
          percent: percents[i],
          frac,
          a0,
          a1,
          midA: (a0 + a1) * 0.5,
          a0Rel: a0 - START_A,
          a1Rel: a1 - START_A,
          toneKey: colors.key,
          fill: colors.fill,
          shade: colors.shade,
        };
      });
      this._peakIdx = peakIdx;

      // Apply pending initial selected attribute if valid
      if (Number.isInteger(this._pendingSelected) && this._pendingSelected >= 0 && this._pendingSelected < this._slices.length) {
        this._selected = this._pendingSelected;
      } else if (this._selected >= this._slices.length) {
        this._selected = -1;
      }
      this._pendingSelected = -1;

      const pillsHtml = this._slices.map((s, i) => {
        const aria = `${s.label}: ${s.valueStr} (${s.percent}%)${s.sub ? ', ' + s.sub : ''}`;
        return `<button type="button" class="leg-pill" part="legend-item" data-idx="${i}" aria-pressed="${i === this._selected ? 'true' : 'false'}" aria-label="${esc(aria)}">`
          + `<span class="leg-left">`
          + `<span class="leg-sw" style="--sw-col:${esc(s.fill)}" aria-hidden="true"></span>`
          + `<span class="leg-name">${esc(s.label)}</span>`
          + `</span>`
          + `<span class="leg-meta">`
          + `<span class="leg-val">${esc(s.valueStr)}</span>`
          + `<span class="leg-pct">${s.percent}%</span>`
          + `</span></button>`;
      }).join('');

      this.elWrap.innerHTML = `<div class="shell" role="region" aria-label="${esc(this.label)}">`
        + `<div class="dial-stage">`
        + `<div class="dial-box" part="dial" tabindex="0" role="group" aria-roledescription="donut chart">`
        + `<canvas class="face" part="canvas" aria-hidden="true"></canvas>`
        + `<div class="kpi" part="center" aria-hidden="true">`
        + `<span class="kpi-cap" part="center-label"></span>`
        + `<span class="kpi-num" part="center-value"></span>`
        + `<span class="kpi-bar"></span>`
        + `<span class="kpi-sub"></span>`
        + `</div>`
        + `</div>`
        + `<div class="callout" part="callout" role="tooltip" aria-hidden="true"></div>`
        + `</div>`
        + `<div class="legend" part="legend" role="list">${pillsHtml}</div>`
        + `<span class="sr" aria-live="polite"></span>`
        + `</div>`;

      this.elShell = this.$('.shell');
      this.elStage = this.$('.dial-stage');
      this.elDial = this.$('.dial-box');
      this.cv = this.$('canvas.face');
      this.ctx = this.cv.getContext('2d');
      this.elKpi = this.$('.kpi');
      this.elKpiCap = this.$('.kpi-cap');
      this.elKpiNum = this.$('.kpi-num');
      this.elKpiSub = this.$('.kpi-sub');
      this.elTip = this.$('.callout');
      this.elLive = this.$('.sr');
      this.pills = this.$$('.leg-pill');

      this.explodeS = this._slices.map((_, i) => new Spring(i === this._selected ? 1 : 0, 380, 15));
      this.scaleS = this._slices.map(() => new Spring(1, 460, 14));
      this.pillS = this._slices.map(() => new Spring(1, 500, 15));

      const holeTarget = this.mode === 'pie' ? 0 : 1;
      this.holeS.x = holeTarget;
      this.holeS.to = holeTarget;
      this.holeS.v = 0;

      this.tipS.x = 0;
      this.tipS.to = 0;
      this.tipS.v = 0;

      this._resizeCanvas();
      this._bindEvents();
      this._syncCenterKpi(false);
      this._syncDialAria();
      this._syncLegendClasses();

      if (animate && !fx.calm) {
        this.replay();
      } else {
        this.sweepS.x = 1;
        this.sweepS.to = 1;
        this.sweepS.v = 0;
        this._needsDraw = true;
        this._draw();
        if (this._selected >= 0) this._showCallout(this._selected, false);
      }
    }

    _resizeCanvas() {
      if (!this.cv) return;
      const spec = SIZES[this.size];
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const total = spec.d + spec.bleed * 2;
      const pw = Math.round(total * dpr);
      if (this.cv.width !== pw || this.cv.height !== pw) {
        this.cv.width = pw;
        this.cv.height = pw;
      }
      this._spec = spec;
      this._dpr = dpr;
      this._totalPx = total;
    }

    // ─── Public Methods ───
    replay() {
      if (!this._slices.length) return;
      const seq = ++this._seq;

      if (fx.calm) {
        this.sweepS.x = 1;
        this.sweepS.to = 1;
        this.sweepS.v = 0;
        this._needsDraw = true;
        this._draw();
        return;
      }

      this.sweepS.x = 0;
      this.sweepS.v = 0.25;
      this.sweepS.to = 1;
      this.dialS.x = 0.94;
      this.dialS.v = 1.6;
      this.badgeS.x = 0.88;
      this.badgeS.v = 1.8;
      this._needsDraw = true;
      this._draw();

      // Staggered subtle per-slice pop wave as the sweep lands around the ring
      this._slices.forEach((s, i) => {
        const delay = Math.round(140 + (s.a0Rel / TAU) * 260);
        later(delay, () => {
          if (seq !== this._seq || !this.isConnected) return;
          if (this.scaleS[i]) {
            this.scaleS[i].x = 0.95;
            this.scaleS[i].v = 2.2;
          }
          if (this.pillS[i]) {
            this.pillS[i].x = 0.92;
            this.pillS[i].v = 2.8;
          }
        });
      });

      // Landing accent beat on the #1 largest slice: pink ticks + crisp kira glint
      later(380, () => {
        if (seq !== this._seq || !this.isConnected) return;
        const pk = this._slices[this._peakIdx];
        const geo = this._dialPageGeo();
        if (!pk || !geo) return;
        const rimR = geo.Ro + 7 * geo.scale;
        const tx = geo.cx + Math.cos(pk.midA) * rimR;
        const ty = geo.cy + Math.sin(pk.midA) * rimR;
        ticks(tx, ty, { n: 3, r: 5 * geo.scale, len: 12 * geo.scale, dir: pk.midA, fan: 0.42, life: 0.4 });
        later(65, () => {
          if (seq !== this._seq || !this.isConnected) return;
          const g2 = this._dialPageGeo();
          if (!g2) return;
          const ka = pk.midA + 0.24;
          const kr = g2.Ro + 18 * g2.scale;
          kira(g2.cx + Math.cos(ka) * kr, g2.cy + Math.sin(ka) * kr, { r: 11 * g2.scale, life: 0.56 });
        });
      });
    }

    select(index) {
      if (!this._slices.length) return;
      const idx = Number(index);
      if (!Number.isInteger(idx) || idx < 0 || idx >= this._slices.length) {
        this.clearSelection();
        return;
      }

      this._selected = idx;
      this._kbIdx = idx;
      this._reflectSelectedAttr(idx);

      const s = this._slices[idx];
      this._syncLegendClasses();
      this._syncCenterKpi(true);
      this._syncDialAria();
      this._announce(`${s.label}: ${s.valueStr}, ${s.percent} percent selected`);

      // Drive springs for click hit punch
      for (let i = 0; i < this.explodeS.length; i++) {
        this.explodeS[i].to = i === idx ? 1 : 0;
        if (fx.calm) {
          this.explodeS[i].x = this.explodeS[i].to;
          this.explodeS[i].v = 0;
        }
      }

      // Position callout BEFORE firing VFX so kachi & puff avoid overlapping the callout text!
      this._showCallout(idx, true);

      if (!fx.calm) {
        this.explodeS[idx].v += 6.2;
        this.scaleS[idx].x = 0.87;
        this.scaleS[idx].v = 4.2;
        this.pillS[idx].x = 0.84;
        this.pillS[idx].v = 4.6;
        this.dialS.x = 0.96;
        this.dialS.v = 1.8;
        this.badgeS.x = 1.15;
        this.badgeS.v = 1.6;
        this._fireSelectVfx(idx, idx === this._peakIdx);
      }

      this._needsDraw = true;
      this._draw();

      const detail = { index: idx, item: s.item, percent: s.percent };
      this.emit('select', detail);
      this.emit('change', detail);
    }

    clearSelection() {
      const had = this._selected >= 0;
      this._selected = -1;
      this._kbIdx = -1;
      this._reflectSelectedAttr(-1);

      const fallback = this._hovered >= 0 ? this._hovered : -1;
      for (let i = 0; i < this.explodeS.length; i++) {
        this.explodeS[i].to = i === fallback ? 1 : 0;
        if (fx.calm) {
          this.explodeS[i].x = this.explodeS[i].to;
          this.explodeS[i].v = 0;
        }
      }

      this._syncLegendClasses();
      this._syncCenterKpi(true);
      this._syncDialAria();
      if (fallback >= 0) {
        this._showCallout(fallback, false);
      } else {
        this._hideCallout();
      }
      this._needsDraw = true;
      this._draw();

      if (had) {
        this._announce(`${this.label}: ${this._formatTotal()} total`);
        const detail = { index: -1, item: null, percent: 0 };
        this.emit('select', detail);
        this.emit('change', detail);
      }
    }

    impact() {
      if (!this._slices.length) return;
      const idx = this._selected >= 0 ? this._selected : this._peakIdx;
      if (idx < 0) return;

      if (fx.calm) {
        this._needsDraw = true;
        this._draw();
        return;
      }

      this.explodeS[idx].to = 1;
      this.explodeS[idx].v += 7.2;
      this.scaleS[idx].x = 0.84;
      this.scaleS[idx].v = 4.8;
      this.dialS.x = 0.92;
      this.dialS.v = 2.6;
      this.badgeS.x = 1.16;
      this.badgeS.v = 1.8;
      this._fireSelectVfx(idx, true);
      this._needsDraw = true;
    }

    _reflectSelectedAttr(idx) {
      this._reflectingSel = true;
      if (idx < 0) {
        if (this.hasAttribute('selected')) this.removeAttribute('selected');
      } else {
        this.setAttribute('selected', String(idx));
      }
      this._reflectingSel = false;
    }

    _onModeChange() {
      const isPie = this.mode === 'pie';
      const target = isPie ? 0 : 1;
      this.holeS.to = target;
      if (fx.calm) {
        this.holeS.x = target;
        this.holeS.v = 0;
      } else {
        this.dialS.x = 0.94;
        this.dialS.v = 2.2;
        const geo = this._dialPageGeo();
        if (geo) {
          ring(geo.cx, geo.cy, {
            rx: geo.Ro * (isPie ? 0.62 : 0.72),
            ry: geo.Ro * (isPie ? 0.62 : 0.72),
            life: 0.44,
            w: 4.5 * geo.scale,
          });
        }
      }
      this._syncDialAria();
      this._needsDraw = true;
      this._draw();
    }

    // ─── VFX Choreography ───
    _dialPageGeo() {
      if (!this.cv || !this.isConnected) return null;
      const rect = this.cv.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const spec = this._spec;
      const k = rect.width / this._totalPx;
      return {
        cx: rect.left + scrollX + rect.width * 0.5,
        cy: rect.top + scrollY + rect.height * 0.5,
        Ro: spec.Ro * k,
        rIn: spec.rIn * k,
        explode: spec.explode * k,
        lw: spec.lw * k,
        scale: (spec.d / 228) * k,
      };
    }

    _fireSelectVfx(idx, isHero) {
      const s = this._slices[idx];
      const geo = this._dialPageGeo();
      if (!s || !geo) return;
      const { cx, cy, Ro, explode, scale } = geo;
      const a = s.midA;
      const tipBox = this._lastTipBox;

      const hitsBox = (px, py, padX, padY) => {
        if (!tipBox) return false;
        return px + padX > tipBox.x1 && px - padX < tipBox.x2 && py + padY > tipBox.y1 && py - padY < tipBox.y2;
      };

      // 1. Outer-rim dust puff + pink accent ticks, nudged cleanly off any adjacent callout
      const rimR = Ro + explode + 7 * scale;
      let pa = a;
      if (hitsBox(cx + Math.cos(pa) * (rimR + 10 * scale), cy + Math.sin(pa) * (rimR + 10 * scale), 20 * scale, 18 * scale)) {
        const c1 = a - 0.34, c2 = a + 0.34;
        const h1 = hitsBox(cx + Math.cos(c1) * (rimR + 10 * scale), cy + Math.sin(c1) * (rimR + 10 * scale), 18 * scale, 16 * scale);
        const h2 = hitsBox(cx + Math.cos(c2) * (rimR + 10 * scale), cy + Math.sin(c2) * (rimR + 10 * scale), 18 * scale, 16 * scale);
        if (!h1 && h2) pa = c1;
        else if (!h2 && h1) pa = c2;
        else pa = Math.sin(c1) < Math.sin(c2) ? c1 : c2;
      }
      const mx = cx + Math.cos(pa) * rimR;
      const my = cy + Math.sin(pa) * rimR;

      puff(mx, my, {
        size: 7.2 * scale,
        n: 4,
        vx: Math.cos(pa) * 38 * scale,
        vy: Math.sin(pa) * 34 * scale - 10 * scale,
        life: 0.56,
      });
      ticks(mx, my, {
        n: 3,
        r: 5 * scale,
        len: 13 * scale,
        dir: pa,
        fan: 0.44,
        life: 0.42,
      });

      // 2. Hollow カチッ placed cleanly outside the ring with guaranteed clearance from callout & legend
      const wordSize = Math.round(74 * scale);
      const halfW = wordSize * 0.52;
      const halfH = wordSize * 0.32;
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const kDist = Ro + explode + 38 * scale;
      const candidates = Math.cos(a) >= 0
        ? [-2.28, -0.82, -2.52, -1.57, -0.58]
        : [-0.86, -2.32, -0.62, -1.57, -2.56];

      let best = null;
      for (const ca of candidates) {
        const rawX = cx + Math.cos(ca) * kDist;
        const kx = clamp(rawX, scrollX + halfW + 8, scrollX + vw - halfW - 8);
        const ky = cy + Math.sin(ca) * kDist;
        const overlap = hitsBox(kx, ky, halfW + 8, halfH + 8);
        const distToTip = tipBox
          ? Math.hypot(kx - (tipBox.x1 + tipBox.x2) * 0.5, ky - (tipBox.y1 + tipBox.y2) * 0.5)
          : 999;
        const score = (overlap ? -1000 : 0) + distToTip;
        if (!best || score > best.score) best = { kx, ky, ca, score };
      }
      if (best) {
        const kRot = Math.cos(best.ca) >= 0 ? -0.14 : 0.14;
        sfx('kachi', best.kx, best.ky, {
          size: wordSize,
          rot: kRot,
          life: 0.72,
          ...hollow(),
        });
      }

      // 3. Peak slice / impact() upgrade: twin kira glints + back-layer burst behind the ring
      if (isHero) {
        burst(cx, cy, {
          r: Math.round(Ro * 1.16),
          spikes: 15,
          life: 0.38,
          layer: this.back,
        });
        const pickKira = (ang, rad) => {
          let aa = ang;
          if (hitsBox(cx + Math.cos(aa) * rad, cy + Math.sin(aa) * rad, 14 * scale, 14 * scale)) {
            aa = ang + (ang >= a ? 0.28 : -0.28);
          }
          return aa;
        };
        const kr1 = Ro + explode + 18 * scale;
        const kr2 = Ro + explode + 21 * scale;
        const k1a = pickKira(a - 0.36, kr1);
        const k2a = pickKira(a + 0.4, kr2);
        kira(cx + Math.cos(k1a) * kr1, cy + Math.sin(k1a) * kr1, { r: 11.5 * scale, life: 0.58 });
        later(55, () => {
          if (!this.isConnected) return;
          const g2 = this._dialPageGeo();
          if (!g2) return;
          kira(g2.cx + Math.cos(k2a) * kr2, g2.cy + Math.sin(k2a) * kr2, { r: 9.5 * g2.scale, life: 0.52 });
        });
      }
    }

    // ─── Interactions (Canvas Hit-Test, Legend Pills, Keyboard) ───
    _hitTestEvent(e) {
      if (!this.cv || !this._slices.length) return { idx: -1, inHole: false };
      const rect = this.cv.getBoundingClientRect();
      if (!rect.width || !rect.height) return { idx: -1, inHole: false };
      const scale = this._totalPx / rect.width;
      const lx = (e.clientX - rect.left) * scale;
      const ly = (e.clientY - rect.top) * scale;
      const cx = this._totalPx * 0.5;
      const cy = this._totalPx * 0.5;
      const spec = this._spec;
      const rIn = Math.max(0, spec.rIn * clamp(this.holeS.x, 0, 1));
      const rOut = spec.Ro;

      // Test currently active/exploded slice first so there is zero edge flicker
      const active = this._activeIdx();
      const order = this._slices.map((_, i) => i);
      if (active >= 0) {
        order.splice(order.indexOf(active), 1);
        order.unshift(active);
      }

      for (const i of order) {
        const s = this._slices[i];
        const ex = Math.max(0, this.explodeS[i]?.x || 0) * spec.explode;
        const ox = cx + Math.cos(s.midA) * ex;
        const oy = cy + Math.sin(s.midA) * ex;
        const dx = lx - ox;
        const dy = ly - oy;
        const dist = Math.hypot(dx, dy);
        if (dist > rOut + 6 || (rIn > 2.5 && dist < rIn - 3)) continue;
        let rel = (Math.atan2(dy, dx) - START_A) % TAU;
        if (rel < 0) rel += TAU;
        if (rel >= s.a0Rel - 0.005 && rel <= s.a1Rel + 0.005) {
          return { idx: i, inHole: false };
        }
      }

      const dCenter = Math.hypot(lx - cx, ly - cy);
      return { idx: -1, inHole: rIn > 2.5 && dCenter < rIn };
    }

    _activeIdx() {
      if (this._hovered >= 0) return this._hovered;
      if (this._selected >= 0) return this._selected;
      return -1;
    }

    _onSliceHover(i, quietFx) {
      if (i < 0 || i >= this._slices.length) return;
      const prevActive = this._activeIdx();
      this._hovered = i;

      for (let j = 0; j < this.explodeS.length; j++) {
        this.explodeS[j].to = j === i ? 1 : 0;
        if (fx.calm) {
          this.explodeS[j].x = this.explodeS[j].to;
          this.explodeS[j].v = 0;
        }
      }

      const changed = prevActive !== i;
      if (changed && !fx.calm) {
        this.scaleS[i].x = 0.94;
        this.scaleS[i].v = 2.4;
        if (this.pillS[i]) {
          this.pillS[i].x = 0.93;
          this.pillS[i].v = 2.6;
        }
        if (!quietFx) {
          const s = this._slices[i];
          const geo = this._dialPageGeo();
          if (s && geo) {
            const r = geo.Ro + geo.explode * 0.75 + 6 * geo.scale;
            ticks(geo.cx + Math.cos(s.midA) * r, geo.cy + Math.sin(s.midA) * r, {
              n: 3, r: 4 * geo.scale, len: 10 * geo.scale, dir: s.midA, fan: 0.42, life: 0.34,
            });
          }
        }
      }

      this._syncLegendClasses();
      this._syncCenterKpi(changed);
      this._showCallout(i, false);
      this._needsDraw = true;
    }

    _onSliceLeave() {
      if (this._hovered < 0) return;
      this._hovered = -1;
      this._syncActiveVisuals(true);
    }

    _syncActiveVisuals(allowPop) {
      const act = this._activeIdx();
      for (let j = 0; j < this.explodeS.length; j++) {
        this.explodeS[j].to = j === act ? 1 : 0;
        if (fx.calm) {
          this.explodeS[j].x = this.explodeS[j].to;
          this.explodeS[j].v = 0;
        }
      }
      this._syncLegendClasses();
      this._syncCenterKpi(allowPop);
      if (act >= 0) this._showCallout(act, false);
      else this._hideCallout();
      this._needsDraw = true;
    }

    _toggleSelect(i) {
      if (i === this._selected) this.clearSelection();
      else this.select(i);
    }

    _bindEvents() {
      const dial = this.elDial;

      dial.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const hit = this._hitTestEvent(e);
        dial.classList.toggle('is-hit', hit.idx >= 0 || (hit.inHole && this._selected >= 0));
        if (hit.idx >= 0) {
          if (this._hovered !== hit.idx) this._onSliceHover(hit.idx, false);
        } else if (this._hovered >= 0) {
          this._onSliceLeave();
        }
      });

      dial.addEventListener('pointerleave', () => {
        dial.classList.remove('is-hit');
        this._onSliceLeave();
      });

      dial.addEventListener('click', (e) => {
        const hit = this._hitTestEvent(e);
        if (hit.idx >= 0) {
          this._toggleSelect(hit.idx);
        } else if (hit.inHole && this._selected >= 0) {
          this.clearSelection();
        }
      });

      dial.addEventListener('keydown', (e) => {
        const n = this._slices.length;
        if (!n) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          this._hovered = -1;
          this._kbIdx = -1;
          this.clearSelection();
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const idx = this._kbIdx >= 0 ? this._kbIdx : (this._selected >= 0 ? this._selected : 0);
          this._toggleSelect(idx);
          return;
        }
        let next = -1;
        const cur = this._kbIdx >= 0 ? this._kbIdx : (this._selected >= 0 ? this._selected : -1);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1 + n) % n;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = cur < 0 ? n - 1 : (cur - 1 + n) % n;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = n - 1;
        else return;

        e.preventDefault();
        this._kbIdx = next;
        this._onSliceHover(next, false);
        const s = this._slices[next];
        this._syncDialAria();
        this._announce(`${s.label}: ${s.valueStr}, ${s.percent} percent`);
      });

      dial.addEventListener('blur', () => {
        if (this._hovered >= 0) this._onSliceLeave();
      });

      // Synchronized legend pill events
      this.pills.forEach((btn, i) => {
        btn.addEventListener('pointerenter', (e) => {
          if (e.pointerType !== 'mouse') return;
          this._onSliceHover(i, false);
        });
        btn.addEventListener('pointerleave', (e) => {
          if (e.pointerType !== 'mouse') return;
          this._onSliceLeave();
        });
        btn.addEventListener('focus', () => {
          this._kbIdx = i;
          this._onSliceHover(i, true);
        });
        btn.addEventListener('blur', () => {
          this._onSliceLeave();
        });
        btn.addEventListener('click', () => {
          this._toggleSelect(i);
        });
        btn.addEventListener('keydown', (e) => {
          const n = this.pills.length;
          if (e.key === 'Escape') {
            e.preventDefault();
            this._hovered = -1;
            this.clearSelection();
            return;
          }
          let step = 0;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step = 1;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step = -1;
          else if (e.key === 'Home') { e.preventDefault(); this.pills[0]?.focus(); return; }
          else if (e.key === 'End') { e.preventDefault(); this.pills[n - 1]?.focus(); return; }
          else return;
          e.preventDefault();
          this.pills[(i + step + n) % n]?.focus();
        });
      });
    }

    // ─── Sync Center KPI, Legend, Callout & ARIA ───
    _syncLegendClasses() {
      const act = this._activeIdx();
      this.pills.forEach((btn, i) => {
        const isSel = i === this._selected;
        const isHov = i === act && !isSel;
        btn.classList.toggle('is-selected', isSel);
        btn.classList.toggle('is-hover', isHov);
        btn.setAttribute('aria-pressed', isSel ? 'true' : 'false');
      });
    }

    _syncCenterKpi(allowPop) {
      if (!this.elKpi) return;
      const act = this._activeIdx();
      const key = act >= 0 ? `s:${act}` : `t:${this.label}:${this._formatTotal()}`;
      let numStr = '';
      if (act >= 0) {
        const s = this._slices[act];
        numStr = `${s.percent}%`;
        this.elKpiCap.textContent = s.label;
        this.elKpiNum.textContent = numStr;
        this.elKpiSub.textContent = s.valueStr;
        this.elKpi.classList.add('is-slice');
        this.elKpi.classList.toggle('is-peak', act === this._peakIdx);
      } else {
        numStr = this._formatTotal();
        this.elKpiCap.textContent = this.label;
        this.elKpiNum.textContent = numStr;
        this.elKpiSub.textContent = '';
        this.elKpi.classList.remove('is-slice', 'is-peak');
      }
      this.elKpiNum.classList.toggle('is-long', numStr.length >= 6 && numStr.length < 9);
      this.elKpiNum.classList.toggle('is-xlong', numStr.length >= 9);
      if (allowPop && key !== this._lastKpiKey && !fx.calm) {
        this.badgeS.x = Math.max(this.badgeS.x, 1.12);
        this.badgeS.v = Math.max(this.badgeS.v, 1.5);
      }
      this._lastKpiKey = key;
    }

    _syncDialAria() {
      if (!this.elDial) return;
      const modeWord = this.mode === 'pie' ? 'pie chart' : 'donut chart';
      this.elDial.setAttribute('aria-roledescription', modeWord);
      const act = this._activeIdx();
      let desc = `${this.label}: ${this._formatTotal()} total across ${this._slices.length} slices.`;
      if (act >= 0) {
        const s = this._slices[act];
        const st = act === this._selected ? 'Selected' : 'Focused';
        desc += ` ${st}: ${s.label}, ${s.valueStr} (${s.percent}%).`;
      }
      desc += ' Use arrow keys to browse slices, Enter to select.';
      this.elDial.setAttribute('aria-label', desc);
    }

    _announce(text) {
      if (this.elLive) this.elLive.textContent = text;
    }

    _showCallout(i, punch) {
      const tip = this.elTip;
      const s = this._slices[i];
      if (!tip || !s) return;
      tip.innerHTML = `<span class="c-dot" style="--c-col:${esc(s.fill)}"></span>`
        + `<span class="c-lbl">${esc(s.label)}</span>`
        + `<span class="c-val">${esc(s.valueStr)}</span>`
        + `<span class="c-pct">${s.percent}%</span>`;
      tip.setAttribute('aria-hidden', 'false');
      this._positionCallout(i);

      const changed = this._tipIdx !== i;
      this._tipIdx = i;
      this.tipS.d = 15;
      this.tipS.to = 1;
      if (fx.calm) {
        this.tipS.x = 1;
        this.tipS.v = 0;
      } else if (punch || changed) {
        this.tipS.x = Math.min(this.tipS.x, punch ? 0.42 : 0.65);
        this.tipS.v = punch ? 5.2 : 2.8;
      }
    }

    _positionCallout(i) {
      const tip = this.elTip;
      const s = this._slices[i];
      if (!tip || !s || !this.elStage || !this.elShell) return;

      const stageR = this.elStage.getBoundingClientRect();
      const shellR = this.elShell.getBoundingClientRect();
      const cvR = this.cv.getBoundingClientRect();
      if (!stageR.width || !cvR.width) return;

      const k = cvR.width / this._totalPx;
      const cx = stageR.width * 0.5;
      const cy = stageR.height * 0.5;
      const ringR = (this._spec.Ro + this._spec.explode) * k;
      const rTip = ringR + 6 * k;
      const ax = cx + Math.cos(s.midA) * rTip;
      const ay = cy + Math.sin(s.midA) * rTip;

      const tipW = tip.offsetWidth || 150;
      const tipH = tip.offsetHeight || 30;

      // Available horizontal corridor inside .shell (respecting side legend if placed beside dial)
      const minLeft = (shellR.left - stageR.left) + 4;
      let maxRight = (shellR.right - stageR.left) - 4;
      const legEl = this.$('.legend');
      if (this.legend === 'side' && legEl) {
        const legR = legEl.getBoundingClientRect();
        if (legR.width > 0 && legR.left > stageR.right - 24) {
          maxRight = Math.min(maxRight, (legR.left - stageR.left) - 10);
        }
      }

      const cosA = Math.cos(s.midA);
      const sinA = Math.sin(s.midA);
      let pos = 'top';
      let left = 0;
      let top = 0;

      if (cosA > 0.42 && Math.abs(sinA) < 0.72 && (maxRight - (ax + 12)) >= tipW) {
        pos = 'right';
        left = ax + 12;
        top = clamp(ay - tipH * 0.5, cy - ringR - 6, cy + ringR - tipH + 6);
        const tailY = clamp(ay - top, 11, Math.max(11, tipH - 11));
        tip.style.setProperty('--tail-y', `${tailY.toFixed(1)}px`);
      } else if (cosA < -0.42 && Math.abs(sinA) < 0.72 && ((ax - 12) - minLeft) >= tipW) {
        pos = 'left';
        left = ax - tipW - 12;
        top = clamp(ay - tipH * 0.5, cy - ringR - 6, cy + ringR - tipH + 6);
        const tailY = clamp(ay - top, 11, Math.max(11, tipH - 11));
        tip.style.setProperty('--tail-y', `${tailY.toFixed(1)}px`);
      } else if (sinA > 0.42) {
        pos = 'bottom';
        const maxLeft = Math.max(minLeft, maxRight - tipW);
        left = clamp(ax - tipW * 0.5, minLeft, maxLeft);
        top = Math.max(ay + 12, cy + ringR + 8);
        const tailX = clamp(ax - left, 16, Math.max(16, tipW - 16));
        tip.style.setProperty('--tail-x', `${tailX.toFixed(1)}px`);
      } else {
        pos = 'top';
        const maxLeft = Math.max(minLeft, maxRight - tipW);
        left = clamp(ax - tipW * 0.5, minLeft, maxLeft);
        top = Math.min(ay - tipH - 12, cy - ringR - tipH - 12);
        const tailX = clamp(ax - left, 16, Math.max(16, tipW - 16));
        tip.style.setProperty('--tail-x', `${tailX.toFixed(1)}px`);
      }

      tip.setAttribute('data-pos', pos);
      tip.style.left = `${left.toFixed(1)}px`;
      tip.style.top = `${top.toFixed(1)}px`;

      this._lastTipBox = {
        pos,
        x1: stageR.left + scrollX + left,
        y1: stageR.top + scrollY + top,
        x2: stageR.left + scrollX + left + tipW,
        y2: stageR.top + scrollY + top + tipH,
      };
    }

    _hideCallout() {
      this._tipIdx = -1;
      this._lastTipBox = null;
      this.tipS.d = 28;
      this.tipS.to = 0;
      if (fx.calm) {
        this.tipS.x = 0;
        this.tipS.v = 0;
      }
      if (this.elTip) this.elTip.setAttribute('aria-hidden', 'true');
    }

    // ─── Cel-Shaded Canvas Geometry & Rendering ───
    _slicePath(x, y, rIn, rOut, a0, a1, isFull) {
      const p = new Path2D();
      if (isFull) {
        p.arc(x, y, rOut, 0, TAU, false);
        if (rIn > 1.5) {
          p.moveTo(x + rIn, y);
          p.arc(x, y, rIn, 0, TAU, true);
        }
        p.closePath();
        return p;
      }
      if (rIn > 1.5) {
        p.arc(x, y, rOut, a0, a1, false);
        p.arc(x, y, rIn, a1, a0, true);
        p.closePath();
      } else {
        p.moveTo(x, y);
        p.arc(x, y, rOut, a0, a1, false);
        p.closePath();
      }
      return p;
    }

    _drawSpecularDashes(g, ox, oy, rIn, rOut, a0, a1, d) {
      const span = a1 - a0;
      if (span < 0.3) return;
      const T = rOut - rIn;
      const rSpec = rOut - T * 0.25;
      const dashH = Math.min(8, Math.max(3.6, T * 0.19));
      const pairs = span >= 1.5 ? [0.24, 0.62] : [span >= 0.65 ? 0.3 : 0.5];

      g.fillStyle = '#ffffff';
      for (const u of pairs) {
        const baseA = a0 + span * u;
        const dashes = span >= 0.62
          ? [[0, Math.min(0.058, span * 0.095)], [0.115, 0.025]]
          : [[0, Math.min(0.044, span * 0.11)]];
        for (const [da, lenFrac] of dashes) {
          const aa = baseA + da;
          if (aa > a1 - 0.08 || aa < a0 + 0.08) continue;
          const dashW = Math.max(5.5, d * lenFrac);
          g.save();
          g.translate(ox + Math.cos(aa) * rSpec, oy + Math.sin(aa) * rSpec);
          g.rotate(aa + Math.PI / 2);
          const hw = dashW * 0.5;
          const hh = dashH * 0.5;
          const sk = hh * 0.68;
          g.beginPath();
          g.moveTo(-hw + sk, -hh);
          g.lineTo(hw + sk, -hh);
          g.lineTo(hw - sk, hh);
          g.lineTo(-hw - sk, hh);
          g.closePath();
          g.fill();
          g.restore();
        }
      }
    }

    _drawSliceBody(g, s, ox, oy, rIn, rOut, a0, a1, isFull, isTop, exVal, pal, spec) {
      const span = a1 - a0;
      const p = this._slicePath(ox, oy, rIn, rOut, a0, a1, isFull);

      // 1. Flat base fill
      g.fillStyle = s.fill;
      g.fill(p);

      // 2. Clipped flat two-tone cel shade + manga halftone dots (active) + specular dashes
      g.save();
      g.clip(p);

      const T = rOut - rIn;
      const shadeOuter = rIn + T * 0.26;
      const shadePath = this._slicePath(ox, oy, Math.max(0, rIn - 1), shadeOuter, a0, a1, isFull);
      g.fillStyle = s.shade;
      g.fill(shadePath);

      // Crisp flat manga halftone accent dots along inner rim on active/popped slice
      if (isTop && exVal > 0.14 && span > 0.18) {
        const rDot = rIn + T * 0.135;
        const dotR = Math.max(1.4, spec.d * 0.0075);
        const stepA = Math.max(0.11, (dotR * 4.4) / Math.max(18, rDot));
        g.fillStyle = s.toneKey === 'ink' ? pal.soft : '#ffffff';
        g.beginPath();
        for (let aa = a0 + stepA * 0.65; aa <= a1 - stepA * 0.65; aa += stepA) {
          const dx = ox + Math.cos(aa) * rDot;
          const dy = oy + Math.sin(aa) * rDot;
          g.moveTo(dx + dotR, dy);
          g.arc(dx, dy, dotR, 0, TAU);
        }
        g.fill();
      }

      // Crisp white skewed comic specular highlight dashes
      this._drawSpecularDashes(g, ox, oy, rIn, rOut, a0, a1, spec.d);
      g.restore();

      // 3. Thick crisp --sk-ink outline
      g.strokeStyle = pal.ink;
      g.lineWidth = isTop ? spec.lw * 1.1 : spec.lw;
      if (isFull) {
        g.beginPath();
        g.arc(ox, oy, rOut, 0, TAU);
        g.stroke();
        if (rIn > 1.5) {
          g.beginPath();
          g.arc(ox, oy, rIn, 0, TAU);
          g.stroke();
        }
      } else {
        g.stroke(p);
      }

      // 4. Outer cel highlight bracket + midpoint pointer wedge on active/exploded slice
      if (isTop && exVal > 0.12 && span > 0.06) {
        const padA = Math.min(0.045, span * 0.12);
        const rBrk = rOut + spec.lw * 1.9;
        const brkCol = s.toneKey === 'acc' ? pal.ink : pal.acc;
        g.strokeStyle = brkCol;
        g.lineWidth = Math.max(2.3, spec.lw * 0.85);
        g.beginPath();
        if (isFull) g.arc(ox, oy, rBrk, 0, TAU);
        else g.arc(ox, oy, rBrk, a0 + padA, a1 - padA, false);
        g.stroke();

        // Tiny crisp radial pointer wedge at outer midpoint
        const midA = (a0 + a1) * 0.5;
        const tipR = rBrk + 5.2 * (spec.d / 228);
        const baseR = rBrk + 0.4;
        const hw = 0.042;
        g.fillStyle = brkCol;
        g.beginPath();
        g.moveTo(ox + Math.cos(midA) * tipR, oy + Math.sin(midA) * tipR);
        g.lineTo(ox + Math.cos(midA - hw) * baseR, oy + Math.sin(midA - hw) * baseR);
        g.lineTo(ox + Math.cos(midA + hw) * baseR, oy + Math.sin(midA + hw) * baseR);
        g.closePath();
        g.fill();
      }
    }

    _draw() {
      if (!this.ctx || !this._slices.length) return;
      const g = this.ctx;
      const spec = this._spec;
      const pal = this._pal;
      const dpr = this._dpr;
      const total = this._totalPx;
      const cx = total * 0.5;
      const cy = total * 0.5;

      const sweepFrac = clamp(this.sweepS.x, 0, 1);
      const holeFrac = clamp(this.holeS.x, 0, 1.12);
      const rOutBase = spec.Ro;
      const rInBase = Math.max(0, spec.rIn * holeFrac);
      const curSweepEnd = START_A + TAU * sweepFrac;

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, total, total);
      g.lineJoin = 'round';
      g.lineCap = 'round';

      // Pass 0: Opaque flat --sk-card donut-hole shield so back-layer burst radiates ONLY around outer rim!
      if (rInBase > 2.5) {
        g.fillStyle = pal.card;
        g.beginPath();
        g.arc(cx, cy, rInBase + 1.5, 0, TAU);
        g.fill();
      }

      // Subtle guide ring visible strictly while the initial sweep is unfurling
      if (sweepFrac < 0.992) {
        const trackP = this._slicePath(cx, cy, rInBase, rOutBase, 0, TAU, true);
        g.fillStyle = pal.card;
        g.fill(trackP);
        g.strokeStyle = pal.track;
        g.lineWidth = Math.max(1.8, spec.lw * 0.65);
        g.beginPath();
        g.arc(cx, cy, rOutBase, 0, TAU);
        g.stroke();
        if (rInBase > 2.5) {
          g.beginPath();
          g.arc(cx, cy, rInBase, 0, TAU);
          g.stroke();
        }
      }

      // Build visible slice draw records
      const act = this._activeIdx();
      let topIdx = act;
      let maxEx = 0;
      const records = [];

      for (let i = 0; i < this._slices.length; i++) {
        const s = this._slices[i];
        const a0 = s.a0;
        const a1 = Math.min(s.a1, curSweepEnd);
        if (a1 - a0 < 0.002) continue;

        const exVal = Math.max(0, this.explodeS[i]?.x || 0);
        const scVal = this.scaleS[i]?.x ?? 1;
        if (exVal > maxEx && act < 0) { maxEx = exVal; topIdx = i; }

        const exDist = exVal * spec.explode;
        const midA = (a0 + a1) * 0.5;
        const ox = cx + Math.cos(midA) * exDist;
        const oy = cy + Math.sin(midA) * exDist;
        const rO = rOutBase * (1 + (scVal - 1) * 0.16);
        const rI = rInBase > 2.5 ? Math.min(rO - 8, rInBase * (1 + (scVal - 1) * 0.06)) : 0;
        const isFull = this._slices.length === 1 && (a1 - a0 >= TAU - 0.003);

        records.push({ i, s, a0, a1, ox, oy, rI, rO, exVal, isFull });
      }

      // Pass 1: Hard offset lavender drop shadows for non-top slices
      g.fillStyle = pal.soft;
      for (const rec of records) {
        if (rec.i === topIdx) continue;
        const shP = this._slicePath(rec.ox + spec.shX, rec.oy + spec.shY, rec.rI, rec.rO, rec.a0, rec.a1, rec.isFull);
        g.fill(shP);
      }

      // Pass 2: Non-top cel-shaded slices
      for (const rec of records) {
        if (rec.i === topIdx) continue;
        this._drawSliceBody(g, rec.s, rec.ox, rec.oy, rec.rI, rec.rO, rec.a0, rec.a1, rec.isFull, false, rec.exVal, pal, spec);
      }

      // Pass 2.5: Clean central mecha rivet hub in Pie mode so converging slice tips look razor-sharp
      if (holeFrac < 0.24 && sweepFrac > 0.04) {
        const capScale = 1 - holeFrac / 0.24;
        const hubR = Math.max(3, spec.d * 0.032 * capScale);
        g.fillStyle = pal.card;
        g.beginPath();
        g.arc(cx, cy, hubR, 0, TAU);
        g.fill();
        g.strokeStyle = pal.ink;
        g.lineWidth = spec.lw * 0.85;
        g.stroke();
        g.fillStyle = pal.ink;
        g.beginPath();
        g.arc(cx, cy, hubR * 0.42, 0, TAU);
        g.fill();
      }

      // Pass 3: Active / exploded slice painted LAST on top with lifted shadow & outer bracket!
      const topRec = records.find((r) => r.i === topIdx);
      if (topRec) {
        const shExtraX = spec.shX + topRec.exVal * 2.4;
        const shExtraY = spec.shY + topRec.exVal * 3.0;
        g.fillStyle = pal.soft;
        const topShP = this._slicePath(
          topRec.ox + shExtraX,
          topRec.oy + shExtraY,
          topRec.rI,
          topRec.rO,
          topRec.a0,
          topRec.a1,
          topRec.isFull,
        );
        g.fill(topShP);
        this._drawSliceBody(
          g, topRec.s, topRec.ox, topRec.oy, topRec.rI, topRec.rO,
          topRec.a0, topRec.a1, topRec.isFull, true, topRec.exVal, pal, spec,
        );
      }
    }

    // ─── Shared-Clock Frame Loop ───
    frame(dt) {
      this._t += dt;
      if (!this._slices.length || !this.cv) return;

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

      let dirty = this._needsDraw;

      // Step global ring springs
      const prevSweep = this.sweepS.x;
      const sweepX = this.sweepS.step(dt);
      if (Math.abs(sweepX - prevSweep) > 0.0002 || Math.abs(this.sweepS.v) > 0.004) dirty = true;

      const prevHole = this.holeS.x;
      const holeX = this.holeS.step(dt);
      if (Math.abs(holeX - prevHole) > 0.0002 || Math.abs(this.holeS.v) > 0.004) dirty = true;

      const dialY = this.dialS.step(dt);
      const badgeScale = this.badgeS.step(dt);
      const tipScale = Math.max(0, this.tipS.step(dt));

      // Step per-slice springs
      for (let i = 0; i < this.explodeS.length; i++) {
        const pe = this.explodeS[i].x;
        const ex = this.explodeS[i].step(dt);
        const ps = this.scaleS[i].x;
        const sc = this.scaleS[i].step(dt);
        if (
          Math.abs(ex - pe) > 0.0003 || Math.abs(this.explodeS[i].v) > 0.005 ||
          Math.abs(sc - ps) > 0.0003 || Math.abs(this.scaleS[i].v) > 0.005
        ) {
          dirty = true;
        }

        // Legend pill spring squash/pop
        const pp = this.pillS[i];
        const py = pp.step(dt);
        const pillEl = this.pills[i];
        if (pillEl) {
          const isLift = i === this._selected || i === this._hovered;
          const settled = Math.abs(py - 1) < 0.001 && Math.abs(pp.v) < 0.008;
          if (settled) {
            pillEl.style.transform = isLift ? 'translate(-1.5px, -2px)' : '';
          } else {
            const sx = py < 1 ? 1 + (1 - py) * 0.35 : 1 / Math.sqrt(py);
            const lift = isLift ? 'translate(-1.5px, -2px) ' : '';
            pillEl.style.transform = `${lift}scale(${sx.toFixed(4)}, ${py.toFixed(4)})`;
          }
        }
      }

      // Volume-preserving squash & stretch on dial container + sweep overshoot breathe
      const sweepKick = Math.max(0, sweepX - 1) * 0.22;
      const effY = dialY + sweepKick;
      const dialStill = Math.abs(effY - 1) < 0.001 && Math.abs(this.dialS.v) < 0.008 && sweepKick < 0.001;
      if (dialStill) {
        if (this.elDial.style.transform) this.elDial.style.transform = '';
      } else {
        const sx = 1 + (1 - dialY) * 0.55 + sweepKick;
        this.elDial.style.transform = `scale(${sx.toFixed(4)}, ${effY.toFixed(4)})`;
      }

      // Center KPI readout spring pop & iris hide in Pie mode
      if (this.elKpi) {
        const holeVis = clamp((holeX - 0.15) / 0.85, 0, 1);
        const kSc = holeVis * badgeScale;
        if (kSc < 0.01) {
          this.elKpi.style.transform = 'translate(-50%, -50%) scale(0)';
        } else {
          const stillK = Math.abs(kSc - 1) < 0.001 && Math.abs(this.badgeS.v) < 0.008 && holeVis > 0.999;
          this.elKpi.style.transform = stillK
            ? 'translate(-50%, -50%)'
            : `translate(-50%, -50%) scale(${kSc.toFixed(4)})`;
        }
      }

      // Speech-bubble callout spring pop (shrinks away to 0 — never fades opacity!)
      if (this.elTip) {
        if (tipScale < 0.008) {
          this.elTip.style.transform = 'scale(0)';
        } else {
          const tilt = (1 - tipScale) * -7;
          this.elTip.style.transform = `scale(${tipScale.toFixed(4)}) skewX(-6deg) rotate(${tilt.toFixed(2)}deg)`;
        }
      }

      if (dirty) {
        if (this._t - this._palAt > 0.5) {
          this._readPalette();
          // Re-resolve slice colors if page CSS variables changed
          for (const s of this._slices) {
            if (s.toneKey !== 'custom') {
              const c = this._resolveToneColors(s.toneKey, this._pal);
              s.fill = c.fill;
              s.shade = c.shade;
            }
          }
        }
        this._draw();
        this._needsDraw = false;
      }
    }
  }

  fx.define('sakuga-donut-chart', SakugaDonutChart);
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
