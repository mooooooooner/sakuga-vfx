// Sakuga Line Chart: a cel-shaded anime line & area trend chart drawn on a high-DPI shared-clock
// canvas with stroke-draw speed entrance, flat halftone screentone + highlight ribbon area shading,
// bold double-stroked curves (sharp manga polyline or overshoot-free monotone cubic smooth),
// multi-series support with spring legend chips, interactive spring crosshair scrubber,
// auto-flipping manga speech-bubble callout, and click-to-pin hit VFX (ticks, dust puff, kira, カチッ/ポン).
//
// Usage:
//   <sakuga-line-chart area label="Weekly Output" unit=" cuts"></sakuga-line-chart>
//   el.items = [{ label: 'Mon', value: 18 }, { label: 'Tue', value: 32 }, ...];
//   // or multi-series:
//   el.labels = ['Mon', 'Tue', ...];
//   el.series = [{ name: 'Key Frames', tone: 'pri', data: [...] }, { name: 'In-Betweens', tone: 'acc', data: [...] }];
(() => {
'use strict';

function component(fx) {
  const { TAU, clamp, lerp, rnd, Spring, later, at, esc, puff, lines, ticks, kira, sfx, hollow } = fx;

  const SERIES_TONES = {
    pri:    { main: null,      soft: null,      ribbon: '#cfcaff', dot: '#b8b3ff' },
    acc:    { main: null,      soft: '#ffb3d6', ribbon: '#ffc7e2', dot: '#ff98c8' },
    green:  { main: '#38c98a', soft: '#9ae6c5', ribbon: '#b8f2d6', dot: '#86deb7' },
    amber:  { main: '#ff9b54', soft: '#ffc99e', ribbon: '#ffd9b8', dot: '#ffba84' },
    blue:   { main: '#63a4ff', soft: '#b2d3ff', ribbon: '#cce1ff', dot: '#9ec5ff' },
    purple: { main: '#a78bfa', soft: '#d3c4ff', ribbon: '#dfd4ff', dot: '#c5b4ff' },
    orange: { main: '#ff9b54', soft: '#ffc99e', ribbon: '#ffd9b8', dot: '#ffba84' },
    red:    { main: '#ff6b7a', soft: '#ffb8c0', ribbon: '#ffcdd3', dot: '#ffa3ad' },
  };
  const DEFAULT_CYCLE = ['pri', 'acc', 'green', 'amber', 'blue', 'purple'];

  function fmtVal(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '0';
    if (Math.abs(n) >= 10000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k';
    if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
    return Number(n.toFixed(2)).toString();
  }

  function fmtAxisTick(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '0';
    if (Math.abs(n) >= 1e6) return Number((n / 1e6).toFixed(1)) + 'M';
    if (Math.abs(n) >= 1e4) return Number((n / 1e3).toFixed(1)) + 'k';
    if (Math.abs(n) >= 1e3 && n % 1000 === 0) return (n / 1000) + 'k';
    if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
    return Number(n.toFixed(1)).toString();
  }

  function niceStep(range, targetSteps = 4) {
    const safe = range > 0 ? range : 10;
    const raw = safe / targetSteps;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    let nice;
    if (norm <= 1) nice = 1;
    else if (norm <= 2) nice = 2;
    else if (norm <= 2.5) nice = 2.5;
    else if (norm <= 5) nice = 5;
    else nice = 10;
    return nice * mag;
  }

  // Fritsch-Carlson monotone cubic Hermite spline segments: guaranteed ZERO overshoot below baseline or peaks!
  function buildSmoothSegments(pts) {
    const n = pts.length;
    if (n < 2) return [];
    const m = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      const dx = pts[i + 1].x - pts[i].x;
      m[i] = dx > 1e-6 ? (pts[i + 1].y - pts[i].y) / dx : 0;
    }
    const t = new Array(n);
    t[0] = m[0];
    t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (m[i - 1] * m[i] <= 0) {
        t[i] = 0;
      } else {
        t[i] = (m[i - 1] + m[i]) * 0.5;
      }
    }
    for (let i = 0; i < n - 1; i++) {
      if (Math.abs(m[i]) < 1e-9) {
        t[i] = 0;
        t[i + 1] = 0;
      } else {
        const a = t[i] / m[i];
        const b = t[i + 1] / m[i];
        const h = Math.hypot(a, b);
        if (h > 3) {
          const tau = 3 / h;
          t[i] = tau * a * m[i];
          t[i + 1] = tau * b * m[i];
        }
      }
    }
    const segs = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1];
      const dx = p1.x - p0.x;
      segs.push({
        x0: p0.x, y0: p0.y,
        cx1: p0.x + dx / 3, cy1: p0.y + (t[i] * dx) / 3,
        cx2: p1.x - dx / 3, cy2: p1.y - (t[i + 1] * dx) / 3,
        x1: p1.x, y1: p1.y,
      });
    }
    return segs;
  }

  // Exact de Casteljau subdivision of a cubic Bezier at u in [0, 1]
  function splitCubic(seg, u) {
    const x01 = lerp(seg.x0, seg.cx1, u), y01 = lerp(seg.y0, seg.cy1, u);
    const x12 = lerp(seg.cx1, seg.cx2, u), y12 = lerp(seg.cy1, seg.cy2, u);
    const x23 = lerp(seg.cx2, seg.x1, u), y23 = lerp(seg.cy2, seg.y1, u);
    const x012 = lerp(x01, x12, u), y012 = lerp(y01, y12, u);
    const x123 = lerp(x12, x23, u), y123 = lerp(y12, y23, u);
    const x = lerp(x012, x123, u), y = lerp(y012, y123, u);
    const dx = x - x012, dy = y - y012;
    return { cx1: x01, cy1: y01, cx2: x012, cy2: y012, x, y, ang: Math.atan2(dy, dx) };
  }

  class SakugaLineChart extends fx.Base {
    static delegates = true;
    static observedAttributes = [
      'area', 'smooth', 'show-dots', 'show-grid', 'tone', 'unit', 'height', 'label', 'empty-text', 'data',
    ];

    static css = `
      :host {
        display: block;
        width: 100%;
        user-select: none;
        -webkit-user-select: none;
      }

      .frame {
        position: relative;
        width: 100%;
        background: var(--sk-card, #fff);
        border: var(--sk-bw, 3.2px) solid var(--sk-ink, #1d1a4a);
        border-radius: var(--sk-r, 15px);
        box-shadow: var(--sk-sh, 6px 7px 0 var(--sk-soft, #b8b3ff));
        padding: 12px 14px 10px;
      }

      .head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px 12px;
        margin-bottom: 6px;
        padding: 0 2px;
      }
      .head[hidden] { display: none; }

      .title-wrap {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .title-wrap[hidden] { display: none; }

      .slash-pip {
        display: inline-block;
        width: 6px;
        height: 15px;
        background: var(--sk-acc, #ff5fa8);
        border: 1.8px solid var(--sk-ink, #1d1a4a);
        border-radius: 2px;
        transform: skewX(-16deg);
        flex: none;
      }

      .title {
        font: italic 900 14.5px/1.1 "Avenir Next", "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        color: var(--sk-ink, #1d1a4a);
        letter-spacing: 0.02em;
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .legend {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 7px;
        margin-left: auto;
      }
      .legend[hidden] { display: none; }

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 9px 3px 7px;
        border: 2.2px solid var(--sk-ink, #1d1a4a);
        border-radius: 999px;
        background: var(--sk-card, #fff);
        color: var(--sk-ink, #1d1a4a);
        box-shadow: 2.5px 3px 0 var(--chip-soft, var(--sk-soft, #b8b3ff));
        font: 800 11.5px/1.2 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
        cursor: pointer;
        white-space: nowrap;
        will-change: transform;
      }
      .chip:focus-visible {
        outline: 2.5px solid var(--sk-acc, #ff5fa8);
        outline-offset: 2px;
      }
      .chip.is-off {
        border-style: dashed;
        border-color: var(--sk-dim, #8580b0);
        color: var(--sk-dim, #8580b0);
        box-shadow: none;
        background: var(--sk-card, #fff);
      }
      .chip-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        border: 2px solid var(--sk-ink, #1d1a4a);
        background: var(--chip-col, var(--sk-pri, #8f8df7));
        flex: none;
      }
      .chip.is-off .chip-dot {
        background: var(--sk-card, #fff);
        border-color: var(--sk-dim, #8580b0);
      }

      .stage {
        position: relative;
        width: 100%;
        border-radius: 8px;
        outline-offset: 4px;
        cursor: crosshair;
        touch-action: pan-y;
      }
      .stage.is-dragging {
        touch-action: none;
      }
      .stage:focus-visible {
        outline: 2.5px solid var(--sk-acc, #ff5fa8);
        outline-offset: 3px;
      }

      canvas.plot {
        display: block;
        width: 100%;
        height: var(--_h, 220px);
        pointer-events: none;
      }

      .empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: var(--_h, 220px);
        padding: 20px;
        border: 2.2px dashed var(--sk-track, #c9cbe0);
        border-radius: 10px;
        color: var(--sk-dim, #8580b0);
        font: 800 13.5px/1.3 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
        text-align: center;
      }
      .empty[hidden] { display: none; }

      /* Cel-shaded manga speech-bubble callout */
      .callout {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 8;
        min-width: 84px;
        max-width: min(244px, calc(100% - 16px));
        padding: 7px 11px 7px;
        border: 2.5px solid var(--sk-ink, #1d1a4a);
        border-radius: 10px;
        background: var(--sk-card, #fff);
        color: var(--sk-ink, #1d1a4a);
        box-shadow: 4px 4px 0 var(--sk-soft, #b8b3ff);
        pointer-events: none;
        will-change: transform;
        transform-origin: var(--ox, 50%) var(--oy, 50%);
        transform: scale(0);
      }
      .callout.is-pinned {
        box-shadow: 4px 4px 0 var(--sk-acc, #ff5fa8);
      }

      /* Speech-bubble pointer tails for all 4 flip sides (right / left / top / bottom) */
      .callout::before,
      .callout::after {
        content: "";
        position: absolute;
        width: 0;
        height: 0;
        border-style: solid;
      }
      /* Side = right (bubble sits right of node -> tail points LEFT) */
      .callout[data-side="right"]::after {
        right: 100%; top: var(--ty, 50%); margin-top: -7px;
        border-width: 7px 9px 7px 0;
        border-color: transparent var(--sk-ink, #1d1a4a) transparent transparent;
      }
      .callout[data-side="right"]::before {
        right: calc(100% - 3px); top: var(--ty, 50%); margin-top: -4.8px; z-index: 1;
        border-width: 4.8px 6.5px 4.8px 0;
        border-color: transparent var(--sk-card, #fff) transparent transparent;
      }
      /* Side = left (bubble sits left of node -> tail points RIGHT) */
      .callout[data-side="left"]::after {
        left: 100%; top: var(--ty, 50%); margin-top: -7px;
        border-width: 7px 0 7px 9px;
        border-color: transparent transparent transparent var(--sk-ink, #1d1a4a);
      }
      .callout[data-side="left"]::before {
        left: calc(100% - 3px); top: var(--ty, 50%); margin-top: -4.8px; z-index: 1;
        border-width: 4.8px 0 4.8px 6.5px;
        border-color: transparent transparent transparent var(--sk-card, #fff);
      }
      /* Side = top (bubble sits above node -> tail points DOWN) */
      .callout[data-side="top"]::after {
        left: var(--tx, 50%); top: 100%; margin-left: -7px;
        border-width: 9px 7px 0 7px;
        border-color: var(--sk-ink, #1d1a4a) transparent transparent transparent;
      }
      .callout[data-side="top"]::before {
        left: var(--tx, 50%); top: calc(100% - 3px); margin-left: -4.8px; z-index: 1;
        border-width: 6.5px 4.8px 0 4.8px;
        border-color: var(--sk-card, #fff) transparent transparent transparent;
      }
      /* Side = bottom (bubble sits below node -> tail points UP) */
      .callout[data-side="bottom"]::after {
        left: var(--tx, 50%); bottom: 100%; margin-left: -7px;
        border-width: 0 7px 9px 7px;
        border-color: transparent transparent var(--sk-ink, #1d1a4a) transparent;
      }
      .callout[data-side="bottom"]::before {
        left: var(--tx, 50%); bottom: calc(100% - 3px); margin-left: -4.8px; z-index: 1;
        border-width: 0 4.8px 6.5px 4.8px;
        border-color: transparent transparent var(--sk-card, #fff) transparent;
      }

      .c-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 3px;
      }
      .c-lbl {
        font: 800 11px/1.15 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
        color: var(--sk-dim, #8580b0);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }
      .c-tag {
        display: inline-block;
        padding: 1px 5px;
        border-radius: 4px;
        background: var(--sk-acc, #ff5fa8);
        color: #fff;
        font: italic 900 9.5px/1.15 "Avenir Next", "Nunito", -apple-system, "Segoe UI", sans-serif;
        letter-spacing: 0.03em;
        transform: skewX(-10deg);
        white-space: nowrap;
      }
      .c-tag.is-peak {
        background: var(--sk-ink, #1d1a4a);
        color: #fff;
      }
      .c-single {
        font: italic 900 16.5px/1.1 "Avenir Next", "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-variant-numeric: tabular-nums;
        color: var(--sk-ink, #1d1a4a);
        white-space: nowrap;
      }
      .c-single.is-peak {
        color: var(--sk-acc, #ff5fa8);
      }
      .c-sub {
        margin-top: 2px;
        font: 700 10.5px/1.2 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
        color: var(--sk-dim, #8580b0);
        white-space: nowrap;
      }
      .c-rows {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .c-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font: 700 11.5px/1.2 -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
        white-space: nowrap;
      }
      .c-name {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--sk-ink, #1d1a4a);
      }
      .c-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 1.8px solid var(--sk-ink, #1d1a4a);
        flex: none;
      }
      .c-val {
        font: italic 900 13px/1.1 "Avenir Next", "Nunito", -apple-system, "Segoe UI", sans-serif;
        font-variant-numeric: tabular-nums;
        color: var(--sk-ink, #1d1a4a);
      }

      @media (max-width: 440px) {
        .frame { padding: 10px 10px 8px; }
        .title { font-size: 13px; }
        .chip { font-size: 10.5px; padding: 2.5px 7px 2.5px 6px; }
      }
    `;

    constructor() {
      super();
      this._mode = 'items';
      this._items = null;
      this._labels = [];
      this._series = [];
      this._seq = 0;
    }

    // ─── Attribute & Property Accessors ───
    get area() { return this.hasAttribute('area'); }
    set area(v) { this.toggleAttribute('area', !!v); }

    get smooth() { return this.hasAttribute('smooth'); }
    set smooth(v) { this.toggleAttribute('smooth', !!v); }

    get showDots() {
      const v = this.getAttribute('show-dots');
      return v !== 'false' && v !== '0';
    }
    set showDots(v) {
      if (v) this.removeAttribute('show-dots');
      else this.setAttribute('show-dots', 'false');
    }

    get showGrid() {
      const v = this.getAttribute('show-grid');
      return v !== 'false' && v !== '0';
    }
    set showGrid(v) {
      if (v) this.removeAttribute('show-grid');
      else this.setAttribute('show-grid', 'false');
    }

    get tone() { return this.getAttribute('tone') || 'pri'; }
    set tone(v) {
      if (!v) this.removeAttribute('tone');
      else this.setAttribute('tone', String(v));
    }

    get unit() { return this.getAttribute('unit') || ''; }
    set unit(v) {
      if (v === null || v === undefined || v === '') this.removeAttribute('unit');
      else this.setAttribute('unit', String(v));
    }

    get height() {
      const n = Number(this.getAttribute('height'));
      return Number.isFinite(n) && n > 0 ? clamp(Math.round(n), 120, 640) : 220;
    }
    set height(v) {
      if (v === null || v === undefined) this.removeAttribute('height');
      else this.setAttribute('height', String(clamp(Math.round(Number(v) || 220), 120, 640)));
    }

    get label() { return this.getAttribute('label') || ''; }
    set label(v) {
      if (!v) this.removeAttribute('label');
      else this.setAttribute('label', String(v));
    }

    get emptyText() { return this.getAttribute('empty-text') || 'No data'; }
    set emptyText(v) {
      if (!v) this.removeAttribute('empty-text');
      else this.setAttribute('empty-text', String(v));
    }

    get items() {
      if (this._mode === 'items' && Array.isArray(this._items)) return this._items.slice();
      const s0 = this._series[0];
      if (!s0) return [];
      return this._labels.map((lbl, i) => ({ label: lbl, value: s0.data[i] ?? 0 }));
    }
    set items(list) {
      this._mode = 'items';
      const arr = Array.isArray(list) ? list.slice() : [];
      this._items = arr;
      this._labels = arr.map((it, i) => String(it?.label ?? (i + 1)));
      this._series = arr.length
        ? [{
            name: this.label || 'Value',
            tone: this.tone,
            data: arr.map((it) => {
              const n = Number(it?.value);
              return Number.isFinite(n) ? n : 0;
            }),
            subs: arr.map((it) => (it?.sub != null ? String(it.sub) : '')),
            hidden: false,
          }]
        : [];
      if (this.ready) this._rebuildData(true);
    }

    get series() {
      return this._series.map((s) => ({ name: s.name, tone: s.tone, data: s.data.slice(), hidden: !!s.hidden }));
    }
    set series(list) {
      this._mode = 'series';
      this._items = null;
      const arr = Array.isArray(list) ? list : [];
      this._series = arr.map((s, idx) => ({
        name: String(s?.name ?? `Series ${idx + 1}`),
        tone: String(s?.tone || DEFAULT_CYCLE[idx % DEFAULT_CYCLE.length]),
        data: Array.isArray(s?.data) ? s.data.map((v) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        }) : [],
        subs: [],
        hidden: !!s?.hidden,
      }));
      const maxLen = this._series.reduce((m, s) => Math.max(m, s.data.length), 0);
      if (this._labels.length < maxLen) {
        const next = this._labels.slice();
        while (next.length < maxLen) next.push(String(next.length + 1));
        this._labels = next;
      }
      if (this.ready) this._rebuildData(true);
    }

    get labels() { return this._labels.slice(); }
    set labels(list) {
      this._labels = Array.isArray(list) ? list.map((v) => String(v ?? '')) : [];
      if (this.ready) {
        this._recomputeLayout();
        this._syncAria();
        if (this._activeIdx >= 0) this._updateCallout(this._activeIdx, false);
        this._needsDraw = true;
      }
    }

    get selected() { return this._inited ? this._pinnedIdx : -1; }
    set selected(idx) {
      const n = Number(idx);
      if (!Number.isInteger(n) || n < 0) this.clearSelection();
      else this.select(n);
    }

    // ─── DOM Render & Setup ───
    render() {
      return `<div class="frame" part="frame">`
        + `<div class="head" part="header" hidden>`
        + `<div class="title-wrap" hidden><span class="slash-pip" aria-hidden="true"></span><span class="title" part="title"></span></div>`
        + `<div class="legend" part="legend" role="group" aria-label="Series" hidden></div>`
        + `</div>`
        + `<div class="stage" part="stage" tabindex="0" role="slider" aria-roledescription="interactive line chart">`
        + `<canvas class="plot" part="canvas" aria-hidden="true"></canvas>`
        + `<div class="callout" part="callout" aria-hidden="true"></div>`
        + `</div>`
        + `<div class="empty" part="empty" hidden></div>`
        + `<span class="sr" aria-live="polite"></span>`
        + `</div>`;
    }

    setup() {
      this.elFrame = this.$('.frame');
      this.elHead = this.$('.head');
      this.elTitleWrap = this.$('.title-wrap');
      this.elTitle = this.$('.title');
      this.elLegend = this.$('.legend');
      this.elStage = this.$('.stage');
      this.cv = this.$('canvas.plot');
      this.ctx = this.cv.getContext('2d');
      this.elTip = this.$('.callout');
      this.elEmpty = this.$('.empty');
      this.elSr = this.$('.sr');

      this._inited = true;
      this._t = 0;
      this._palAt = -1;
      this._pal = null;
      this._patterns = new Map();
      this._dpr = Math.min(2.5, window.devicePixelRatio || 1);
      this._w = 0;
      this._h = this.height;
      this._needsDraw = true;

      // Springs & animation state
      this.drawS = new Spring(1, 86, 13.5);
      this.scrubX = new Spring(0, 420, 24);
      this.tipS = new Spring(0, 500, 16);
      this._nodeSprings = [];
      this._chipSprings = [];
      this._crossed = [];
      this._peakFired = false;
      this._trailAcc = 0;

      // Interaction state
      this._activeIdx = -1;
      this._pinnedIdx = -1;
      this._hoverIdx = -1;
      this._dragging = false;
      this._dragMoved = false;
      this._downX = 0;
      this._downIdx = -1;
      this._tipX = 0;
      this._tipY = 0;

      // Geometry cache
      this._geo = null;

      this._applyHeight();
      this._readPalette();

      // Parse initial data attribute if items/series weren't assigned prior to connect
      if (!this._series.length && this.hasAttribute('data')) {
        this._parseDataAttr(this.getAttribute('data'));
      }

      // Watch stage width cleanly with ResizeObserver
      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(() => this._onResize());
        this._ro.observe(this.elStage);
      }
      this._onWinResize = () => this._onResize();
      window.addEventListener('resize', this._onWinResize);

      // Click outside unpins selection cleanly
      this._onDocDown = (e) => {
        if (this._pinnedIdx < 0) return;
        if (!e.composedPath().includes(this)) this.clearSelection();
      };
      document.addEventListener('pointerdown', this._onDocDown);

      this._bindInteractions();
      this._syncHeader();
      this._resizeCanvas();
      this._rebuildData(true);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this._seq++;
      if (this._ro) { this._ro.disconnect(); this._ro = null; }
      if (this._onWinResize) window.removeEventListener('resize', this._onWinResize);
      if (this._onDocDown) document.removeEventListener('pointerdown', this._onDocDown);
    }

    attributeChangedCallback(name, oldV, newV) {
      if (!this._inited || oldV === newV) return;
      if (name === 'data') {
        this._parseDataAttr(newV);
        this._rebuildData(true);
      } else if (name === 'height') {
        this._applyHeight();
        this._resizeCanvas();
        this._recomputeLayout();
        if (this._activeIdx >= 0) this._updateCallout(this._activeIdx, false);
        this._needsDraw = true;
      } else if (name === 'label') {
        if (this._mode === 'items' && this._series[0]) {
          this._series[0].name = this.label || 'Value';
        }
        this._syncHeader();
        this._syncAria();
      } else if (name === 'tone') {
        if (this._mode === 'items' && this._series[0]) {
          this._series[0].tone = this.tone;
        }
        this._readPalette();
        this._patterns.clear();
        this._syncLegendChips();
        this._needsDraw = true;
      } else if (name === 'area' || name === 'smooth' || name === 'show-dots' || name === 'show-grid') {
        this._recomputeLayout();
        this._needsDraw = true;
      } else if (name === 'unit') {
        this._recomputeLayout();
        if (this._activeIdx >= 0) this._updateCallout(this._activeIdx, false);
        this._syncAria();
        this._needsDraw = true;
      } else if (name === 'empty-text') {
        this.elEmpty.textContent = this.emptyText;
      }
    }

    _parseDataAttr(raw) {
      if (!raw) {
        this._mode = 'items';
        this._items = [];
        this._labels = [];
        this._series = [];
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this._mode = 'items';
          this._items = parsed;
          this._labels = parsed.map((it, i) => String(it?.label ?? (i + 1)));
          this._series = parsed.length
            ? [{
                name: this.label || 'Value',
                tone: this.tone,
                data: parsed.map((it) => { const n = Number(it?.value); return Number.isFinite(n) ? n : 0; }),
                subs: parsed.map((it) => (it?.sub != null ? String(it.sub) : '')),
                hidden: false,
              }]
            : [];
        } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.series)) {
          this._mode = 'series';
          this._items = null;
          this._labels = Array.isArray(parsed.labels) ? parsed.labels.map(String) : [];
          this._series = parsed.series.map((s, idx) => ({
            name: String(s?.name ?? `Series ${idx + 1}`),
            tone: String(s?.tone || DEFAULT_CYCLE[idx % DEFAULT_CYCLE.length]),
            data: Array.isArray(s?.data) ? s.data.map((v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; }) : [],
            subs: [],
            hidden: !!s?.hidden,
          }));
          const maxLen = this._series.reduce((m, s) => Math.max(m, s.data.length), 0);
          while (this._labels.length < maxLen) this._labels.push(String(this._labels.length + 1));
        }
      } catch {
        this._labels = [];
        this._series = [];
      }
    }

    // ─── Public Methods ───
    replay() {
      if (!this._inited) return;
      const n = this._pointCount();
      if (!n) return;
      this._seq++;
      this._peakFired = false;
      this._trailAcc = 0;
      this._crossed = new Array(n).fill(false);

      if (fx.calm) {
        this.drawS.x = 1; this.drawS.v = 0; this.drawS.to = 1;
        this._initNodeSprings(1);
        this._needsDraw = true;
        this._draw();
        return;
      }

      this.drawS.x = 0;
      this.drawS.v = 0.85;
      this.drawS.to = 1;
      this._initNodeSprings(0);

      // Immediately pop station 0 as the line launches from the left axis
      if (n > 0) {
        this._crossed[0] = true;
        for (let s = 0; s < this._series.length; s++) {
          if (this._series[s].hidden) continue;
          const sp = this._nodeSprings[s]?.[0];
          if (sp) { sp.to = 1; sp.v = 5.4; }
        }
      }
      this._needsDraw = true;
      this._draw();
    }

    select(index) {
      if (!this._inited) return;
      const n = this._pointCount();
      if (!n) return;
      const i = clamp(Math.round(Number(index) || 0), 0, n - 1);
      this._pinnedIdx = i;
      this._activeIdx = i;
      this._snapCrosshair(i, true);
      this._popNodesAt(i, true);
      this._updateCallout(i, true);
      this._syncAria();
      this._announcePoint(i, true);
      this._firePinHitVfx(i);
      this._needsDraw = true;
      this.emit('select', this._buildEventDetail(i, true));
    }

    clearSelection() {
      if (!this._inited) return;
      const wasPinned = this._pinnedIdx >= 0;
      this._pinnedIdx = -1;
      if (this._hoverIdx >= 0) {
        this._activeIdx = this._hoverIdx;
        this._snapCrosshair(this._activeIdx, false);
        this._updateCallout(this._activeIdx, false);
      } else {
        this._activeIdx = -1;
        this._resetNodeTargets();
        this.tipS.d = 28;
        this.tipS.to = 0;
        if (fx.calm) { this.tipS.x = 0; this.tipS.v = 0; this.elTip.style.transform = 'scale(0)'; }
        this.elTip.classList.remove('is-pinned');
        this.elTip.setAttribute('aria-hidden', 'true');
      }
      this._syncAria();
      this._needsDraw = true;
      if (wasPinned) {
        this.emit('select', { index: -1, label: '', value: null, values: [], series: [], pinned: false });
      }
    }

    // ─── Internal Data & Header Sync ───
    _pointCount() {
      if (!this._series.length) return 0;
      return this._series.reduce((m, s) => Math.max(m, s.data.length), 0);
    }

    _visibleSeries() {
      const out = [];
      for (let i = 0; i < this._series.length; i++) {
        if (!this._series[i].hidden) out.push({ idx: i, s: this._series[i] });
      }
      return out;
    }

    _applyHeight() {
      this._h = this.height;
      this.style.setProperty('--_h', `${this._h}px`);
    }

    _readPalette() {
      const cs = getComputedStyle(this);
      const v = (name, fb) => (cs.getPropertyValue(name) || '').trim() || fb;
      this._pal = {
        card: v('--sk-card', fx.P.fill),
        ink: v('--sk-ink', fx.P.ink),
        dim: v('--sk-dim', '#8580b0'),
        soft: v('--sk-soft', fx.P.shade),
        pri: v('--sk-pri', '#8f8df7'),
        acc: v('--sk-acc', fx.P.accent),
        track: v('--sk-track', '#c9cbe0'),
      };
      this._palAt = this._t;
    }

    _resolveSeriesColors(toneKey) {
      const pal = this._pal || { pri: '#8f8df7', acc: '#ff5fa8', soft: '#b8b3ff', ink: '#1d1a4a' };
      const key = String(toneKey || 'pri').trim().toLowerCase();
      const entry = SERIES_TONES[key];
      if (entry) {
        return {
          main: key === 'pri' ? pal.pri : (key === 'acc' ? pal.acc : entry.main),
          soft: key === 'pri' ? pal.soft : entry.soft,
          ribbon: entry.ribbon,
          dot: key === 'pri' ? pal.soft : entry.dot,
        };
      }
      // Custom raw hex/css color fallback
      return { main: toneKey || pal.pri, soft: pal.soft, ribbon: '#e6e4ff', dot: pal.soft };
    }

    _halftonePattern(dotColor, phaseX = 0, phaseY = 0) {
      const dpr = this._dpr || 1;
      const key = `${dotColor}|${dpr}|${phaseX}|${phaseY}`;
      let pat = this._patterns.get(key);
      if (pat) return pat;
      const step = 10;
      const c = document.createElement('canvas');
      c.width = Math.round(step * dpr);
      c.height = Math.round(step * dpr);
      const x = c.getContext('2d');
      x.scale(dpr, dpr);
      x.fillStyle = dotColor;
      const r = 1.85;
      // 45-degree staggered crisp manga screentone dots (100% flat color, zero alpha fade)
      const pts = [
        [0, 0], [step, 0], [0, step], [step, step],
        [step * 0.5, step * 0.5],
      ];
      x.beginPath();
      for (const [px, py] of pts) {
        const dx = ((px + phaseX) % step + step) % step;
        const dy = ((py + phaseY) % step + step) % step;
        // Draw wrapped copies near edges so seamless tiling never clips dots
        for (const ox of [-step, 0, step]) {
          for (const oy of [-step, 0, step]) {
            const cx = dx + ox, cy = dy + oy;
            if (cx >= -r && cx <= step + r && cy >= -r && cy <= step + r) {
              x.moveTo(cx + r, cy);
              x.arc(cx, cy, r, 0, TAU);
            }
          }
        }
      }
      x.fill();
      pat = this.ctx.createPattern(c, 'repeat');
      if (pat && pat.setTransform && typeof DOMMatrix !== 'undefined') {
        pat.setTransform(new DOMMatrix().scale(1 / dpr));
      }
      this._patterns.set(key, pat);
      return pat;
    }

    _syncHeader() {
      const hasTitle = !!this.label;
      const hasLegend = this._series.length >= 2;
      this.elTitleWrap.hidden = !hasTitle;
      if (hasTitle) this.elTitle.textContent = this.label;
      this.elLegend.hidden = !hasLegend;
      this.elHead.hidden = !hasTitle && !hasLegend;
      this._syncLegendChips();
    }

    _syncLegendChips() {
      if (this._series.length < 2) {
        this.elLegend.innerHTML = '';
        this._chipSprings = [];
        return;
      }
      this.elLegend.innerHTML = this._series.map((s, idx) => {
        const col = this._resolveSeriesColors(s.tone);
        return `<button type="button" class="chip${s.hidden ? ' is-off' : ''}" data-s="${idx}" aria-pressed="${s.hidden ? 'false' : 'true'}" style="--chip-col:${esc(col.main)};--chip-soft:${esc(col.soft)}">`
          + `<span class="chip-dot" aria-hidden="true"></span><span>${esc(s.name)}</span></button>`;
      }).join('');
      this._chipSprings = this._series.map(() => new Spring(1, 520, 14));
      this._chipEls = this.$$('.chip');
      this._chipEls.forEach((btn, idx) => {
        btn.addEventListener('click', () => this._toggleSeries(idx, btn));
      });
    }

    _toggleSeries(idx, btn) {
      const s = this._series[idx];
      if (!s) return;
      s.hidden = !s.hidden;
      btn.classList.toggle('is-off', s.hidden);
      btn.setAttribute('aria-pressed', s.hidden ? 'false' : 'true');

      if (!fx.calm && this._chipSprings[idx]) {
        this._chipSprings[idx].x = 0.8;
        this._chipSprings[idx].v = 5.5;
        this._chipSprings[idx].to = 1;
        const c = at(btn, 0.5, 0);
        if (c.w > 0 && !s.hidden) {
          ticks(c.x, c.y - 3, { n: 3, r: 4, len: 10, dir: -Math.PI / 2, fan: 0.45, life: 0.34 });
        }
      }

      this._recomputeLayout();
      // Pop newly revealed series' nodes smoothly
      if (!s.hidden && !fx.calm && this._nodeSprings[idx]) {
        for (const sp of this._nodeSprings[idx]) {
          sp.x = 0.2;
          sp.v = 6.0;
          sp.to = 1;
        }
      }
      if (this._activeIdx >= 0) {
        if (this._visibleSeries().length) {
          this._updateCallout(this._activeIdx, false);
        } else {
          this.tipS.to = 0;
          this.elTip.setAttribute('aria-hidden', 'true');
        }
      }
      this._syncAria();
      this._needsDraw = true;
    }

    _initNodeSprings(initialScale) {
      const n = this._pointCount();
      this._nodeSprings = this._series.map(() =>
        Array.from({ length: n }, () => new Spring(initialScale, 520, 15))
      );
    }

    _resetNodeTargets() {
      for (let s = 0; s < this._nodeSprings.length; s++) {
        const arr = this._nodeSprings[s];
        for (let i = 0; i < arr.length; i++) {
          arr[i].to = this._crossed[i] ? 1 : 0;
        }
      }
    }

    _popNodesAt(idx, punch) {
      for (let s = 0; s < this._nodeSprings.length; s++) {
        if (this._series[s]?.hidden) continue;
        const arr = this._nodeSprings[s];
        for (let i = 0; i < arr.length; i++) {
          if (i === idx) {
            arr[i].to = punch ? 1.44 : 1.32;
            if (!fx.calm) {
              arr[i].x = punch ? 0.68 : Math.min(arr[i].x, 0.92);
              arr[i].v = punch ? 9.2 : 5.5;
            } else {
              arr[i].x = arr[i].to;
              arr[i].v = 0;
            }
          } else {
            arr[i].to = this._crossed[i] ? 1 : 0;
            if (fx.calm) { arr[i].x = arr[i].to; arr[i].v = 0; }
          }
        }
      }
    }

    _rebuildData(animate) {
      this._seq++;
      this._activeIdx = -1;
      this._pinnedIdx = -1;
      this._hoverIdx = -1;
      this.tipS.x = 0; this.tipS.v = 0; this.tipS.to = 0;
      this.elTip.style.transform = 'scale(0)';
      this.elTip.classList.remove('is-pinned');
      this.elTip.setAttribute('aria-hidden', 'true');

      this._syncHeader();
      const n = this._pointCount();
      const isEmpty = n === 0;
      this.elStage.hidden = isEmpty;
      this.elEmpty.hidden = !isEmpty;
      if (isEmpty) {
        this.elEmpty.textContent = this.emptyText;
        this._geo = null;
        return;
      }

      this._resizeCanvas();
      this._recomputeLayout();
      this._syncAria();

      if (animate && !fx.calm) {
        this.replay();
      } else {
        this._crossed = new Array(n).fill(true);
        this._peakFired = true;
        this.drawS.x = 1; this.drawS.v = 0; this.drawS.to = 1;
        this._initNodeSprings(1);
        this._needsDraw = true;
        this._draw();
      }
    }

    // ─── Canvas Sizing & Layout Geometry ───
    _onResize() {
      if (!this.isConnected || !this._inited) return;
      if (this._resizeCanvas()) {
        this._recomputeLayout();
        if (this._activeIdx >= 0 && this._geo) {
          const x = this._geo.xs[this._activeIdx];
          if (x != null) { this.scrubX.x = x; this.scrubX.to = x; this.scrubX.v = 0; }
          this._updateCallout(this._activeIdx, false);
        }
        this._needsDraw = true;
        this._draw();
      }
    }

    _resizeCanvas() {
      const rect = this.elStage.getBoundingClientRect();
      const w = Math.max(180, Math.round(rect.width || this.clientWidth || 320));
      const h = this._h;
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      const changed = this._w !== w || this._dpr !== dpr || this.cv.width !== pw || this.cv.height !== ph;
      if (changed) {
        this._w = w;
        this._dpr = dpr;
        this.cv.width = pw;
        this.cv.height = ph;
        this._patterns.clear();
      }
      return changed;
    }

    _recomputeLayout() {
      const n = this._pointCount();
      if (!n || !this._w) { this._geo = null; return; }

      const w = this._w;
      const h = this._h;
      const vis = this._visibleSeries();

      // Determine Y domain across visible series (or all series if all hidden)
      const domainSeries = vis.length ? vis.map((v) => v.s) : this._series;
      let rawMin = Infinity, rawMax = -Infinity;
      let peakSeriesIdx = -1, peakIdx = -1, peakVal = -Infinity;

      for (let s = 0; s < this._series.length; s++) {
        const ser = this._series[s];
        const isVis = !ser.hidden || !vis.length;
        if (!isVis) continue;
        for (let i = 0; i < ser.data.length; i++) {
          const val = ser.data[i];
          if (val < rawMin) rawMin = val;
          if (val > rawMax) rawMax = val;
          if (!ser.hidden && val > peakVal) {
            peakVal = val;
            peakSeriesIdx = s;
            peakIdx = i;
          }
        }
      }
      if (!Number.isFinite(rawMin)) { rawMin = 0; rawMax = 10; }

      let yMin, yMax;
      if (rawMin >= 0) {
        yMin = 0;
        const headroom = rawMax > 0 ? rawMax * 1.12 : 10;
        const step = niceStep(headroom, 4);
        yMax = Math.ceil(headroom / step) * step;
        if (yMax <= rawMax) yMax += step;
        var yStep = step;
      } else {
        const span = Math.max(1e-6, rawMax - rawMin);
        const step = niceStep(span * 1.16, 4);
        yMin = Math.floor((rawMin - span * 0.05) / step) * step;
        yMax = Math.ceil((rawMax + span * 0.08) / step) * step;
        var yStep = step;
      }

      const yTicks = [];
      for (let v = yMin; v <= yMax + yStep * 0.001; v += yStep) {
        const clean = Math.abs(v) < 1e-9 ? 0 : Math.round(v * 1e6) / 1e6;
        yTicks.push(clean);
        if (yTicks.length > 8) break;
      }

      // Measure widest Y tick label for dynamic left padding
      const g = this.ctx;
      g.save();
      g.font = '800 11px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif';
      let maxTickW = 24;
      for (const tv of yTicks) {
        const tw = g.measureText(fmtAxisTick(tv)).width;
        if (tw > maxTickW) maxTickW = tw;
      }
      g.restore();

      const padTop = 26;
      const padBottom = 34;
      const padLeft = Math.ceil(maxTickW + 14);
      const padRight = 18;
      const plotW = Math.max(40, w - padLeft - padRight);
      const plotH = Math.max(50, h - padTop - padBottom);
      const plotLeft = padLeft;
      const plotRight = padLeft + plotW;
      const plotTop = padTop;
      const plotBottom = padTop + plotH;

      const xs = new Array(n);
      if (n === 1) {
        xs[0] = plotLeft + plotW * 0.5;
      } else {
        const inset = Math.min(10, plotW * 0.03);
        const usableW = Math.max(10, plotW - inset * 2);
        for (let i = 0; i < n; i++) {
          xs[i] = plotLeft + inset + (i / (n - 1)) * usableW;
        }
      }

      const yOf = (val) => {
        const u = (val - yMin) / Math.max(1e-9, yMax - yMin);
        return plotBottom - u * plotH;
      };
      const baseLineY = yOf(clamp(0, yMin, yMax));

      const seriesPts = this._series.map((ser) => {
        const pts = [];
        for (let i = 0; i < ser.data.length; i++) {
          pts.push({ x: xs[i], y: yOf(ser.data[i]), val: ser.data[i], idx: i });
        }
        return {
          pts,
          segs: this.smooth ? buildSmoothSegments(pts) : null,
        };
      });

      this._geo = {
        w, h, n,
        padLeft, padRight, padTop, padBottom,
        plotLeft, plotRight, plotTop, plotBottom, plotW, plotH,
        yMin, yMax, yStep, yTicks, baseLineY,
        xs, seriesPts,
        peakSeriesIdx, peakIdx, peakVal,
      };
    }

    // Evaluate curve position + tangent angle at horizontal coordinate clipX
    _evalCurveAtX(sp, clipX) {
      const pts = sp.pts;
      if (!pts.length) return null;
      if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, ang: 0 };
      if (clipX <= pts[0].x) {
        const ang = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
        return { x: pts[0].x, y: pts[0].y, ang };
      }
      const last = pts[pts.length - 1];
      if (clipX >= last.x) {
        const prev = pts[pts.length - 2];
        return { x: last.x, y: last.y, ang: Math.atan2(last.y - prev.y, last.x - prev.x) };
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1];
        if (clipX >= p0.x && clipX <= p1.x) {
          const dx = Math.max(1e-6, p1.x - p0.x);
          const u = clamp((clipX - p0.x) / dx, 0, 1);
          if (this.smooth && sp.segs && sp.segs[i]) {
            const sub = splitCubic(sp.segs[i], u);
            return { x: sub.x, y: sub.y, ang: sub.ang };
          }
          return {
            x: lerp(p0.x, p1.x, u),
            y: lerp(p0.y, p1.y, u),
            ang: Math.atan2(p1.y - p0.y, dx),
          };
        }
      }
      return { x: last.x, y: last.y, ang: 0 };
    }

    // Build exact Path2D of the curve up to clipX (using de Casteljau for smooth partial tips!)
    _buildCurvePath(sp, clipX, closeToBaseY) {
      const pts = sp.pts;
      if (!pts.length) return null;
      const p = new Path2D();
      p.moveTo(pts[0].x, pts[0].y);
      let endX = pts[0].x;

      if (pts.length === 1) {
        if (closeToBaseY != null) return null;
        return p;
      }

      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1];
        if (clipX <= p0.x + 1e-4) break;
        if (clipX >= p1.x - 1e-4) {
          if (this.smooth && sp.segs && sp.segs[i]) {
            const s = sp.segs[i];
            p.bezierCurveTo(s.cx1, s.cy1, s.cx2, s.cy2, s.x1, s.y1);
          } else {
            p.lineTo(p1.x, p1.y);
          }
          endX = p1.x;
        } else {
          const dx = Math.max(1e-6, p1.x - p0.x);
          const u = clamp((clipX - p0.x) / dx, 0, 1);
          if (this.smooth && sp.segs && sp.segs[i]) {
            const sub = splitCubic(sp.segs[i], u);
            p.bezierCurveTo(sub.cx1, sub.cy1, sub.cx2, sub.cy2, sub.x, sub.y);
            endX = sub.x;
          } else {
            const y = lerp(p0.y, p1.y, u);
            p.lineTo(clipX, y);
            endX = clipX;
          }
          break;
        }
      }

      if (closeToBaseY != null) {
        p.lineTo(endX, closeToBaseY);
        p.lineTo(pts[0].x, closeToBaseY);
        p.closePath();
      }
      return p;
    }

    // ─── Interactions (Pointer, Touch Drag, Keyboard) ───
    _bindInteractions() {
      const stage = this.elStage;

      const idxFromClientX = (clientX) => {
        if (!this._geo || !this._geo.n) return -1;
        const rect = stage.getBoundingClientRect();
        const lx = clientX - rect.left;
        const xs = this._geo.xs;
        let best = 0, bestD = Infinity;
        for (let i = 0; i < xs.length; i++) {
          const d = Math.abs(xs[i] - lx);
          if (d < bestD) { bestD = d; best = i; }
        }
        return best;
      };

      stage.addEventListener('pointermove', (e) => {
        if (!this._geo || !this._visibleSeries().length) return;
        const idx = idxFromClientX(e.clientX);
        if (idx < 0) return;

        if (this._dragging) {
          if (Math.abs(e.clientX - this._downX) > 7 || idx !== this._downIdx) {
            this._dragMoved = true;
          }
          this._scrubTo(idx, true);
          return;
        }
        if (e.pointerType === 'mouse') {
          this._hoverIdx = idx;
          this._scrubTo(idx, false);
        }
      });

      stage.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse' || this._dragging) return;
        this._hoverIdx = -1;
        if (this._pinnedIdx >= 0) {
          this._activeIdx = this._pinnedIdx;
          this._snapCrosshair(this._pinnedIdx, false);
          this._popNodesAt(this._pinnedIdx, false);
          this._updateCallout(this._pinnedIdx, false);
        } else {
          this._activeIdx = -1;
          this._resetNodeTargets();
          this.tipS.d = 28;
          this.tipS.to = 0;
          if (fx.calm) { this.tipS.x = 0; this.tipS.v = 0; this.elTip.style.transform = 'scale(0)'; }
          this.elTip.setAttribute('aria-hidden', 'true');
        }
        this._needsDraw = true;
      });

      stage.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        if (!this._geo || !this._visibleSeries().length) return;
        const idx = idxFromClientX(e.clientX);
        if (idx < 0) return;
        stage.focus({ preventScroll: true });
        this._dragging = true;
        this._dragMoved = false;
        this._downX = e.clientX;
        this._downIdx = idx;
        stage.classList.add('is-dragging');
        try { stage.setPointerCapture(e.pointerId); } catch {}
        if (e.pointerType !== 'mouse') {
          this._scrubTo(idx, true);
        }
      });

      const endPointer = (e) => {
        if (!this._dragging) return;
        this._dragging = false;
        stage.classList.remove('is-dragging');
        try { stage.releasePointerCapture(e.pointerId); } catch {}
        const idx = idxFromClientX(e.clientX);
        if (idx < 0) return;

        if (!this._dragMoved) {
          // Crisp click / tap: toggle pin on this index
          if (this._pinnedIdx === idx) {
            this.clearSelection();
          } else {
            this.select(idx);
          }
        } else if (e.pointerType !== 'mouse') {
          // Touch drag finished: pin final scrubbed station cleanly so callout stays readable
          this.select(idx);
        }
      };
      stage.addEventListener('pointerup', endPointer);
      stage.addEventListener('pointercancel', endPointer);

      stage.addEventListener('keydown', (e) => {
        const n = this._pointCount();
        if (!n || !this._visibleSeries().length) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          const next = this._activeIdx < 0 ? 0 : Math.min(n - 1, this._activeIdx + 1);
          this._scrubTo(next, true);
          this._announcePoint(next, false);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = this._activeIdx < 0 ? n - 1 : Math.max(0, this._activeIdx - 1);
          this._scrubTo(next, true);
          this._announcePoint(next, false);
        } else if (e.key === 'Home') {
          e.preventDefault();
          this._scrubTo(0, true);
          this._announcePoint(0, false);
        } else if (e.key === 'End') {
          e.preventDefault();
          this._scrubTo(n - 1, true);
          this._announcePoint(n - 1, false);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const target = this._activeIdx >= 0 ? this._activeIdx : 0;
          if (this._pinnedIdx === target) this.clearSelection();
          else this.select(target);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this._hoverIdx = -1;
          this.clearSelection();
        }
      });

      stage.addEventListener('blur', () => {
        if (this._hoverIdx < 0 && this._pinnedIdx < 0 && this._activeIdx >= 0) {
          this._activeIdx = -1;
          this._resetNodeTargets();
          this.tipS.d = 28;
          this.tipS.to = 0;
          if (fx.calm) { this.tipS.x = 0; this.tipS.v = 0; this.elTip.style.transform = 'scale(0)'; }
          this.elTip.setAttribute('aria-hidden', 'true');
          this._needsDraw = true;
        }
      });
    }

    _scrubTo(idx, fromKeyOrTouch) {
      if (!this._geo) return;
      const changed = this._activeIdx !== idx;
      const wasHidden = this._activeIdx < 0;
      this._activeIdx = idx;

      this._snapCrosshair(idx, wasHidden);
      if (changed) {
        this._popNodesAt(idx, false);
        this._updateCallout(idx, false);
        this._syncAria();
        // Subtle pink accent ticks when snapping to a new station
        if (!fx.calm) {
          const anchor = this._highestActivePoint(idx);
          if (anchor) {
            const p = this._canvasToPage(anchor.x, anchor.y);
            if (p) {
              ticks(p.x, p.y - 8, { n: 2, r: 6, len: 9, dir: -Math.PI / 2, fan: 0.55, life: 0.28 });
            }
          }
        }
        this.emit('hover', this._buildEventDetail(idx, this._pinnedIdx === idx));
      } else if (fromKeyOrTouch && this.tipS.to < 0.5) {
        this._updateCallout(idx, false);
      }
      this._needsDraw = true;
    }

    _snapCrosshair(idx, instantJump) {
      if (!this._geo) return;
      const tx = this._geo.xs[idx];
      if (tx == null) return;
      this.scrubX.to = tx;
      if (instantJump || fx.calm) {
        this.scrubX.x = tx;
        this.scrubX.v = 0;
      }
    }

    _highestActivePoint(idx) {
      if (!this._geo) return null;
      let best = null;
      for (let s = 0; s < this._series.length; s++) {
        if (this._series[s].hidden) continue;
        const pt = this._geo.seriesPts[s]?.pts[idx];
        if (pt && (!best || pt.y < best.y)) best = pt;
      }
      return best;
    }

    _canvasToPage(cx, cy) {
      if (!this.cv || !this.isConnected) return null;
      const r = this.cv.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: r.left + scrollX + cx, y: r.top + scrollY + cy, rect: r };
    }

    _buildEventDetail(idx, pinned) {
      const label = this._labels[idx] ?? '';
      const values = [];
      for (let s = 0; s < this._series.length; s++) {
        const ser = this._series[s];
        if (ser.hidden) continue;
        values.push({
          name: ser.name,
          tone: ser.tone,
          value: ser.data[idx] ?? 0,
        });
      }
      return {
        index: idx,
        label,
        value: values.length ? values[0].value : null,
        values,
        series: this._visibleSeries().map(({ s }) => ({ name: s.name, tone: s.tone })),
        pinned: !!pinned,
      };
    }

    // ─── Manga Speech-Bubble Callout (Smart 4-Way Flip, Zero Overlap) ───
    _updateCallout(idx, punch) {
      const tip = this.elTip;
      const geo = this._geo;
      if (!tip || !geo || idx < 0 || idx >= geo.n) return;
      const vis = this._visibleSeries();
      if (!vis.length) return;

      const lbl = this._labels[idx] ?? String(idx + 1);
      const isPinned = this._pinnedIdx === idx;
      const isPeak = idx === geo.peakIdx;
      const unit = this.unit;

      let badgeHtml = '';
      if (isPinned) badgeHtml = `<span class="c-tag">PIN</span>`;
      else if (isPeak) badgeHtml = `<span class="c-tag is-peak">PEAK</span>`;

      if (vis.length === 1) {
        const ser = vis[0].s;
        const val = ser.data[idx] ?? 0;
        const sub = ser.subs?.[idx] || '';
        tip.innerHTML = `<div class="c-head"><span class="c-lbl">${esc(lbl)}</span>${badgeHtml}</div>`
          + `<div class="c-single${isPeak ? ' is-peak' : ''}">${esc(fmtVal(val) + unit)}</div>`
          + (sub ? `<div class="c-sub">${esc(sub)}</div>` : '');
      } else {
        const rows = vis.map(({ s }) => {
          const col = this._resolveSeriesColors(s.tone);
          const val = s.data[idx] ?? 0;
          return `<div class="c-row">`
            + `<span class="c-name"><span class="c-dot" style="background:${esc(col.main)}"></span>${esc(s.name)}</span>`
            + `<span class="c-val">${esc(fmtVal(val) + unit)}</span>`
            + `</div>`;
        }).join('');
        tip.innerHTML = `<div class="c-head"><span class="c-lbl">${esc(lbl)}</span>${badgeHtml}</div>`
          + `<div class="c-rows">${rows}</div>`;
      }

      tip.classList.toggle('is-pinned', isPinned);
      tip.setAttribute('aria-hidden', 'false');

      // Measure unscaled layout size
      const tipW = tip.offsetWidth || 104;
      const tipH = tip.offsetHeight || 48;
      const anchor = this._highestActivePoint(idx);
      if (!anchor) return;

      const stageW = geo.w;
      const gapRight = 22;
      const gapLeft = 26;
      const gapVert = 20;
      const minX = Math.max(6, geo.plotLeft + 4);
      const maxX = stageW - 6;
      const minY = 6;
      const maxY = Math.max(minY, geo.plotBottom - tipH - 6);

      const spaceRight = maxX - (anchor.x + gapRight);
      const spaceLeft = (anchor.x - gapLeft) - minX;

      let left, top, side, ox, oy;
      if (spaceRight >= tipW && (anchor.x <= stageW * 0.56 || spaceLeft < tipW)) {
        // Place cleanly to the RIGHT of the active node (tail points left)
        side = 'right';
        left = anchor.x + gapRight;
        top = clamp(anchor.y - tipH * 0.5, minY, maxY);
        const ty = clamp(anchor.y - top, 12, Math.max(12, tipH - 12));
        tip.style.setProperty('--ty', `${ty.toFixed(1)}px`);
        ox = '0%';
        oy = `${((ty / tipH) * 100).toFixed(0)}%`;
      } else if (spaceLeft >= tipW) {
        // Place cleanly to the LEFT of the active node (tail points right)
        side = 'left';
        left = anchor.x - gapLeft - tipW;
        top = clamp(anchor.y - tipH * 0.5, minY, maxY);
        const ty = clamp(anchor.y - top, 12, Math.max(12, tipH - 12));
        tip.style.setProperty('--ty', `${ty.toFixed(1)}px`);
        ox = '100%';
        oy = `${((ty / tipH) * 100).toFixed(0)}%`;
      } else if (anchor.y - gapVert - tipH >= 4) {
        // Narrow viewport fallback: place ABOVE active node (tail points down)
        side = 'top';
        left = clamp(anchor.x - tipW * 0.5, 6, Math.max(6, stageW - tipW - 6));
        top = anchor.y - gapVert - tipH;
        const tx = clamp(anchor.x - left, 14, Math.max(14, tipW - 14));
        tip.style.setProperty('--tx', `${tx.toFixed(1)}px`);
        ox = `${((tx / tipW) * 100).toFixed(0)}%`;
        oy = '100%';
      } else {
        // Narrow viewport peak fallback: place BELOW active node (tail points up)
        side = 'bottom';
        left = clamp(anchor.x - tipW * 0.5, 6, Math.max(6, stageW - tipW - 6));
        top = Math.min(geo.h - tipH - 4, anchor.y + gapVert);
        const tx = clamp(anchor.x - left, 14, Math.max(14, tipW - 14));
        tip.style.setProperty('--tx', `${tx.toFixed(1)}px`);
        ox = `${((tx / tipW) * 100).toFixed(0)}%`;
        oy = '0%';
      }

      this._tipSide = side;
      tip.dataset.side = side;
      tip.style.left = `${left.toFixed(1)}px`;
      tip.style.top = `${top.toFixed(1)}px`;
      tip.style.setProperty('--ox', ox);
      tip.style.setProperty('--oy', oy);

      this.tipS.d = 15;
      this.tipS.to = 1;
      if (fx.calm) {
        this.tipS.x = 1;
        this.tipS.v = 0;
        tip.style.transform = 'scale(1)';
      } else if (punch) {
        this.tipS.x = 0.62;
        this.tipS.v = 6.2;
      } else if (this.tipS.x < 0.2) {
        this.tipS.x = 0.35;
        this.tipS.v = 4.6;
      } else {
        this.tipS.x = Math.min(this.tipS.x, 0.88);
        this.tipS.v = Math.max(this.tipS.v, 2.4);
      }
    }

    // ─── Pin Click Hit VFX (ticks + baseline puff + peak kira + hollow カチッ/ポン above frame!) ───
    _firePinHitVfx(idx) {
      if (fx.calm || !this._geo) return;
      const geo = this._geo;
      const anchor = this._highestActivePoint(idx);
      if (!anchor) return;

      const nodeP = this._canvasToPage(anchor.x, anchor.y);
      const baseP = this._canvasToPage(anchor.x, geo.plotBottom);
      const frameRect = this.elFrame.getBoundingClientRect();
      if (!nodeP) return;

      const isPeak = idx === geo.peakIdx;

      // 1. Pink accent ticks flaring outward from pinned data node
      ticks(nodeP.x, nodeP.y, {
        n: isPeak ? 4 : 3,
        r: 9,
        len: isPeak ? 14 : 11,
        dir: -Math.PI / 2,
        fan: 0.46,
        life: 0.42,
      });

      // 2. Grounded cel dust puff off the baseline crosshair anchor
      if (baseP) {
        puff(baseP.x, baseP.y - 2, { size: 5.5, n: 3, vx: rnd(-10, 10), vy: -12, life: 0.46 });
      }

      // 3. Peak kira glint on the open side away from the speech-bubble callout
      if (isPeak) {
        const kiraDir = this._tipSide === 'right' ? -1 : 1;
        kira(nodeP.x + kiraDir * 16, nodeP.y - 17, { r: 12, life: 0.56 });
      }

      // 4. Single crisp hollow manga SFX placed cleanly ABOVE the chart frame (zero border/label overlap!)
      const sfxX = clamp(
        nodeP.x,
        frameRect.left + scrollX + 48,
        frameRect.right + scrollX - 48
      );
      const sfxY = Math.max(scrollY + 24, frameRect.top + scrollY - 34);
      sfx(isPeak ? 'pon' : 'kachi', sfxX, sfxY, {
        ...hollow(),
        size: isPeak ? 76 : 68,
        rot: isPeak ? -0.08 : -0.11,
        life: isPeak ? 0.64 : 0.56,
      });
    }

    // ─── ARIA Accessibility Sync ───
    _syncAria() {
      const n = this._pointCount();
      const stage = this.elStage;
      if (!stage) return;
      stage.setAttribute('aria-label', this.label || 'Line chart');
      if (!n) return;
      stage.setAttribute('aria-valuemin', '1');
      stage.setAttribute('aria-valuemax', String(n));
      const idx = this._activeIdx >= 0 ? this._activeIdx : (this._pinnedIdx >= 0 ? this._pinnedIdx : 0);
      stage.setAttribute('aria-valuenow', String(idx + 1));
      const summary = this._describePoint(idx, this._pinnedIdx === idx);
      stage.setAttribute('aria-valuetext', summary);
    }

    _describePoint(idx, pinned) {
      const lbl = this._labels[idx] ?? String(idx + 1);
      const vis = this._visibleSeries();
      if (!vis.length) return `${lbl}: all series hidden`;
      const parts = vis.map(({ s }) =>
        vis.length === 1
          ? `${fmtVal(s.data[idx] ?? 0)}${this.unit}`
          : `${s.name} ${fmtVal(s.data[idx] ?? 0)}${this.unit}`
      );
      return `${lbl}: ${parts.join(', ')}${pinned ? ' (pinned)' : ''}`;
    }

    _announcePoint(idx, pinned) {
      if (this.elSr) this.elSr.textContent = this._describePoint(idx, pinned);
    }

    // ─── Cel-Shaded Canvas Rendering ───
    _drawPeakStar(g, x, y, r, pal) {
      // Crisp 4-pointed anime star / crown pip in vivid --sk-acc with thick --sk-ink outline
      const p = new Path2D();
      const q = r * 0.34;
      p.moveTo(x, y - r);
      p.lineTo(x + q, y - q);
      p.lineTo(x + r * 0.85, y);
      p.lineTo(x + q, y + q);
      p.lineTo(x, y + r);
      p.lineTo(x - q, y + q);
      p.lineTo(x - r * 0.85, y);
      p.lineTo(x - q, y - q);
      p.closePath();

      // Flat cel shadow offset
      g.save();
      g.translate(1.5, 2);
      g.fillStyle = pal.soft;
      g.fill(p);
      g.restore();

      g.fillStyle = pal.acc;
      g.fill(p);
      g.strokeStyle = pal.ink;
      g.lineWidth = 2.0;
      g.lineJoin = 'round';
      g.stroke(p);

      // Tiny white flat sparkle center
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(x, y, Math.max(1.2, r * 0.18), 0, TAU);
      g.fill();
    }

    _draw() {
      const g = this.ctx;
      const geo = this._geo;
      const pal = this._pal;
      if (!g || !geo || !pal) return;

      const dpr = this._dpr;
      const { w, h, n, plotLeft, plotRight, plotTop, plotBottom, plotW, yTicks, baseLineY, xs, seriesPts } = geo;
      const drawProgress = clamp(this.drawS.x, 0, 1);
      const firstX = xs[0];
      const lastX = xs[n - 1];
      const clipX = n > 1 ? lerp(firstX, lastX, drawProgress) : lastX;
      const vis = this._visibleSeries();
      const showGrid = this.showGrid;
      const showDots = this.showDots;
      const isArea = this.area;

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      g.lineJoin = 'round';
      g.lineCap = 'round';

      // 1. Horizontal dashed grid lines + crisp tabular-nums Y-axis ticks
      g.font = '800 11px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif';
      g.textAlign = 'right';
      g.textBaseline = 'middle';

      for (let i = 0; i < yTicks.length; i++) {
        const tv = yTicks[i];
        const u = (tv - geo.yMin) / Math.max(1e-9, geo.yMax - geo.yMin);
        const y = Math.round(plotBottom - u * geo.plotH) + 0.5;

        if (showGrid && i > 0) {
          g.save();
          g.strokeStyle = pal.track;
          g.lineWidth = 1.4;
          g.setLineDash([5, 5]);
          g.beginPath();
          g.moveTo(plotLeft, y);
          g.lineTo(plotRight, y);
          g.stroke();
          g.restore();
        }

        g.fillStyle = pal.dim;
        g.fillText(fmtAxisTick(tv), plotLeft - 9, y);
      }

      // 2. Flat Two-Tone Halftone Screentone Area Shading + Top Highlight Ribbon (ZERO gradients!)
      if (isArea && vis.length && n > 1 && drawProgress > 0.002) {
        // Draw back-to-front so primary series sits crisply on top
        for (let k = vis.length - 1; k >= 0; k--) {
          const { idx: sIdx, s } = vis[k];
          const sp = seriesPts[sIdx];
          const areaPath = this._buildCurvePath(sp, clipX, baseLineY);
          if (!areaPath) continue;
          const col = this._resolveSeriesColors(s.tone);
          const pat = this._halftonePattern(col.dot, k * 3, k * 2);

          g.save();
          g.clip(areaPath);

          // Layer A: Crisp staggered 45° halftone dot screentone (pure flat color dots on paper!)
          if (pat) {
            g.fillStyle = pat;
            g.fillRect(plotLeft - 2, plotTop - 2, plotW + 4, geo.plotH + 4);
          }

          // Layer B: Solid flat cel highlight ribbon hugging cleanly right beneath the ink curve
          const ribbonDepth = vis.length > 1 ? 9 : 13;
          const curvePath = this._buildCurvePath(sp, clipX, null);
          if (curvePath) {
            g.save();
            g.translate(0, ribbonDepth * 0.52);
            g.strokeStyle = col.ribbon;
            g.lineWidth = ribbonDepth;
            g.stroke(curvePath);
            g.restore();
          }

          g.restore();
        }
      }

      // 3. Hand-Inked Manga Ground Baseline + Slanted Ground Hash Marks
      g.strokeStyle = pal.ink;
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(plotLeft - 2, plotBottom);
      g.lineTo(plotRight + 2, plotBottom);
      g.stroke();

      // Slanted manga ground hash marks along the bottom of the ink axis
      const hashSpan = plotRight - plotLeft;
      const hashStep = Math.max(22, Math.min(34, hashSpan / 14));
      for (let hx = plotLeft + 10; hx <= plotRight - 10; hx += hashStep) {
        g.strokeStyle = pal.ink;
        g.lineWidth = 2.0;
        g.beginPath();
        g.moveTo(hx, plotBottom + 0.5);
        g.lineTo(hx - 2.6, plotBottom + 6.5);
        g.stroke();

        if (hx + 6 < plotRight - 6) {
          g.strokeStyle = pal.dim;
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(hx + 6, plotBottom + 0.5);
          g.lineTo(hx + 4.3, plotBottom + 4.5);
          g.stroke();
        }
      }

      // 4. X-Axis Category Labels (auto-thinned cleanly on narrow 390px screens!)
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const labelY = plotBottom + 20;
      const minSpacing = n > 1 ? (xs[1] - xs[0]) : plotW;
      let maxLblW = 28;
      g.font = '800 11.5px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif';
      for (let i = 0; i < n; i++) {
        const lw = g.measureText(this._labels[i] || '').width;
        if (lw > maxLblW) maxLblW = lw;
      }
      const skipStep = Math.max(1, Math.ceil((maxLblW + 10) / Math.max(1, minSpacing)));

      for (let i = 0; i < n; i++) {
        const isActive = i === this._activeIdx;
        if (!isActive && i % skipStep !== 0 && i !== n - 1) continue;
        // Avoid colliding with the very last label if skipStep > 1
        if (!isActive && skipStep > 1 && i !== n - 1 && (n - 1 - i) < skipStep && (xs[n - 1] - xs[i]) < maxLblW + 8) continue;

        const lx = xs[i];
        const txt = this._labels[i] || '';
        if (isActive) {
          // Highlight active X category with crisp cel pill underline
          const tw = g.measureText(txt).width;
          g.fillStyle = this._pinnedIdx === i ? pal.acc : pal.soft;
          g.fillRect(lx - tw * 0.5 - 3, labelY + 6.5, tw + 6, 3);
          g.fillStyle = pal.ink;
        } else {
          g.fillStyle = pal.dim;
        }
        g.fillText(txt, lx, labelY);
      }

      // If all series were toggled off via legend chips, display clean centered note
      if (!vis.length) {
        g.fillStyle = pal.dim;
        g.font = '800 13px -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif';
        g.fillText('Select a series above', plotLeft + plotW * 0.5, plotTop + geo.plotH * 0.5);
        return;
      }

      // 5. Kinetic Spring Crosshair Guide Line (sits cleanly behind the bold curve & active nodes)
      if (this._activeIdx >= 0) {
        const cx = clamp(this.scrubX.x, plotLeft, plotRight);
        g.save();
        g.strokeStyle = pal.ink;
        g.lineWidth = 2.0;
        g.setLineDash([5, 4]);
        g.beginPath();
        g.moveTo(cx, plotTop - 4);
        g.lineTo(cx, plotBottom);
        g.stroke();
        g.restore();

        // Crisp cel-shaded pink diamond marker anchored right on the ground baseline
        g.save();
        g.translate(cx, plotBottom);
        g.rotate(Math.PI / 4);
        g.fillStyle = pal.acc;
        g.strokeStyle = pal.ink;
        g.lineWidth = 2.0;
        g.fillRect(-4, -4, 8, 8);
        g.strokeRect(-4, -4, 8, 8);
        g.restore();
      }

      // 6. Bold Double-Stroked Anime Line + Hard Flat Offset Drop Shadow
      for (let k = vis.length - 1; k >= 0; k--) {
        const { idx: sIdx, s } = vis[k];
        const sp = seriesPts[sIdx];
        if (!sp.pts.length) continue;
        const curvePath = this._buildCurvePath(sp, clipX, null);
        if (!curvePath) continue;
        const col = this._resolveSeriesColors(s.tone);
        const outerW = vis.length > 1 ? 6.8 : 7.4;
        const coreW = vis.length > 1 ? 3.2 : 3.6;

        if (n > 1 && drawProgress > 0.002) {
          // A. Hard flat offset cel drop shadow beneath polyline
          g.save();
          g.translate(3, 4.5);
          g.strokeStyle = col.soft;
          g.lineWidth = outerW - 0.8;
          g.stroke(curvePath);
          g.restore();

          // B. Thick --sk-ink outer casing
          g.strokeStyle = pal.ink;
          g.lineWidth = outerW;
          g.stroke(curvePath);

          // C. Vivid flat series core stroke
          g.strokeStyle = col.main;
          g.lineWidth = coreW;
          g.stroke(curvePath);
        }
      }

      // 7. Cel-Shaded Data Nodes + Active Pink Halo Ring + Peak Crown/Star Pip
      for (let k = vis.length - 1; k >= 0; k--) {
        const { idx: sIdx, s } = vis[k];
        const sp = seriesPts[sIdx];
        const col = this._resolveSeriesColors(s.tone);
        const springs = this._nodeSprings[sIdx] || [];

        for (let i = 0; i < sp.pts.length; i++) {
          const pt = sp.pts[i];
          const isActive = i === this._activeIdx;
          const isPeakNode = sIdx === geo.peakSeriesIdx && i === geo.peakIdx;
          if (!showDots && !isActive && !isPeakNode && n > 1) continue;

          const sc = Math.max(0, springs[i] ? springs[i].x : 1);
          if (sc < 0.04) continue;

          const baseR = (vis.length > 1 ? 4.8 : 5.4) * sc;

          // Active outer pink halo ring
          if (isActive) {
            const haloR = baseR + (this._pinnedIdx === i ? 5.2 : 4.2);
            g.fillStyle = pal.card;
            g.beginPath();
            g.arc(pt.x, pt.y, haloR, 0, TAU);
            g.fill();
            g.strokeStyle = pal.acc;
            g.lineWidth = 2.6;
            g.stroke();
          }

          // Node hard offset cel shadow
          g.fillStyle = pal.soft;
          g.beginPath();
          g.arc(pt.x + 1.8, pt.y + 2.3, baseR, 0, TAU);
          g.fill();

          // Colored ring + thick ink outline
          g.fillStyle = isActive && this._pinnedIdx === i ? pal.acc : col.main;
          g.beginPath();
          g.arc(pt.x, pt.y, baseR, 0, TAU);
          g.fill();
          g.strokeStyle = pal.ink;
          g.lineWidth = 2.4;
          g.stroke();

          // Crisp flat white center dot
          g.fillStyle = pal.card;
          g.beginPath();
          g.arc(pt.x, pt.y, Math.max(1.3, baseR * 0.44), 0, TAU);
          g.fill();

          // Peak high point pink star pip floating neatly above the peak node
          if (isPeakNode && sc > 0.5) {
            const starR = 6.8 * Math.min(1.15, sc);
            const starY = Math.max(10, pt.y - baseR - 10);
            this._drawPeakStar(g, pt.x, starY, starR, pal);
          }
        }
      }
    }

    // ─── Shared Clock Frame Loop ───
    frame(dt) {
      this._t += dt;
      if (!this._geo) return;

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
      const geo = this._geo;
      const n = geo.n;

      // 1. Step stroke-draw entrance spring
      const prevDraw = this.drawS.x;
      const drawXFrac = this.drawS.step(dt);
      const drawMoving = Math.abs(drawXFrac - prevDraw) > 0.0002 || Math.abs(this.drawS.v) > 0.004 || Math.abs(drawXFrac - this.drawS.to) > 0.001;
      if (drawMoving) dirty = true;

      const curClipX = n > 1 ? lerp(geo.xs[0], geo.xs[n - 1], clamp(drawXFrac, 0, 1)) : geo.xs[0];

      // Pop data nodes as the leading ink tip races past each X-station
      for (let i = 0; i < n; i++) {
        const hitEnd = i === n - 1 && drawXFrac >= 0.985;
        if (!this._crossed[i] && (curClipX >= geo.xs[i] - 3 || hitEnd)) {
          this._crossed[i] = true;
          for (let s = 0; s < this._series.length; s++) {
            if (this._series[s].hidden) continue;
            const sp = this._nodeSprings[s]?.[i];
            if (sp) {
              sp.to = i === this._activeIdx ? (this._pinnedIdx === i ? 1.44 : 1.32) : 1;
              sp.v = 6.4;
            }
          }
          // Peak beat: pink accent ticks + kira glint right as the line strikes the peak maximum!
          if (!this._peakFired && i === geo.peakIdx && geo.peakSeriesIdx >= 0) {
            this._peakFired = true;
            const pk = geo.seriesPts[geo.peakSeriesIdx]?.pts[i];
            if (pk) {
              const p = this._canvasToPage(pk.x, pk.y);
              if (p) {
                ticks(p.x, p.y - 10, { n: 3, r: 6, len: 12, dir: -Math.PI / 2, fan: 0.48, life: 0.42 });
                const seq = this._seq;
                later(50, () => {
                  if (seq !== this._seq || !this.isConnected) return;
                  const p2 = this._canvasToPage(pk.x, pk.y);
                  if (p2) kira(p2.x + 12, p2.y - 15, { r: 11.5, life: 0.56 });
                });
              }
            }
          }
        }
      }

      // Emit trailing speed lines & tiny dust puffs off the streaking leading curve tip!
      if (n > 1 && drawXFrac > 0.04 && drawXFrac < 0.96 && this.drawS.v > 0.4) {
        this._trailAcc += dt * (this.drawS.v * 7.8);
        if (this._trailAcc >= 1) {
          this._trailAcc -= 1;
          const vis = this._visibleSeries();
          if (vis.length) {
            const leadSp = geo.seriesPts[vis[0].idx];
            const tip = this._evalCurveAtX(leadSp, curClipX);
            if (tip) {
              const p = this._canvasToPage(tip.x, tip.y);
              if (p) {
                const backDir = tip.ang + Math.PI;
                lines(p.x, p.y, { n: 4, dir: backDir, len: 34, spread: 11, life: 0.25 });
                puff(p.x - Math.cos(tip.ang) * 4, p.y - Math.sin(tip.ang) * 4 + 3, {
                  size: rnd(3.8, 5.2),
                  n: 3,
                  vx: Math.cos(backDir) * 28,
                  vy: Math.sin(backDir) * 18 - 10,
                  life: 0.4,
                });
              }
            }
          }
        }
      } else if (drawXFrac >= 0.96) {
        this._trailAcc = 0;
      }

      // 2. Step individual node pop springs
      for (let s = 0; s < this._nodeSprings.length; s++) {
        const arr = this._nodeSprings[s];
        for (let i = 0; i < arr.length; i++) {
          const sp = arr[i];
          const prev = sp.x;
          const cur = sp.step(dt);
          if (Math.abs(cur - prev) > 0.0005 || Math.abs(sp.v) > 0.01) dirty = true;
        }
      }

      // 3. Step crosshair scrubber spring
      if (this._activeIdx >= 0) {
        const prevSx = this.scrubX.x;
        const curSx = this.scrubX.step(dt);
        if (Math.abs(curSx - prevSx) > 0.05 || Math.abs(this.scrubX.v) > 0.5) dirty = true;
      }

      // 4. Step manga speech-bubble callout spring
      const tipScale = Math.max(0, this.tipS.step(dt));
      if (tipScale < 0.008 && this.tipS.to === 0) {
        if (this.elTip.style.transform !== 'scale(0)') this.elTip.style.transform = 'scale(0)';
      } else {
        const rot = (1 - tipScale) * -5;
        this.elTip.style.transform = `scale(${tipScale.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
      }

      // 5. Step legend chip pop springs (volume-preserving squash & stretch)
      if (this._chipSprings.length && this._chipEls) {
        for (let i = 0; i < this._chipSprings.length; i++) {
          const sp = this._chipSprings[i];
          const el = this._chipEls[i];
          if (!el) continue;
          const y = sp.step(dt);
          const still = Math.abs(y - 1) < 0.001 && Math.abs(sp.v) < 0.01;
          if (still) {
            if (el.style.transform) el.style.transform = '';
          } else {
            const sx = 1 + (1 - y) * 0.45;
            el.style.transform = `scale(${sx.toFixed(4)}, ${y.toFixed(4)})`;
          }
        }
      }

      // 6. Redraw canvas only when needed
      if (dirty) {
        if (this._t - this._palAt > 0.5) this._readPalette();
        this._draw();
        this._needsDraw = false;
      }
    }
  }

  fx.define('sakuga-line-chart', SakugaLineChart);
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
