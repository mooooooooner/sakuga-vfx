// Sakuga Calendar: inline cel-shaded manga calendar with seamless Day ↔ Month ↔ Year (decade) zoom-cut switching.
// Plain crisp ink-bordered panel at rest with weekend tinting, event pips, Today ring, and a selected-day agenda strip.
// Drilling UP (Day → Month → Year) punches the grid inward with outward speed lines, corner pink ticks, and hollow シュッ;
// drilling DOWN (Year → Month → Day) zooms forward on spring physics with puffs, ring, and hollow カチッ;
// picking a day pops the tile with ticks, puff, kira glints, and agenda pills; Today jumps home with ring, kira, and hollow ポン.
(() => {
'use strict';

function component(fx) {
  const { Spring, clamp, later, at, esc, squashy, ticks, puff, ring, lines, kira, sfx, hollow } = fx;

  const VIEWS = ['day', 'month', 'year'];
  const VIEW_DEPTH = { day: 0, month: 1, year: 2 };
  const TONES = new Set(['pri', 'acc', 'green', 'amber']);
  const FULL_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const WK_MON = [
    { lbl: 'Mo', wknd: false }, { lbl: 'Tu', wknd: false }, { lbl: 'We', wknd: false },
    { lbl: 'Th', wknd: false }, { lbl: 'Fr', wknd: false }, { lbl: 'Sa', wknd: true }, { lbl: 'Su', wknd: true },
  ];
  const WK_SUN = [
    { lbl: 'Su', wknd: true }, { lbl: 'Mo', wknd: false }, { lbl: 'Tu', wknd: false },
    { lbl: 'We', wknd: false }, { lbl: 'Th', wknd: false }, { lbl: 'Fr', wknd: false }, { lbl: 'Sa', wknd: true },
  ];

  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtISO = (y, m, d) => `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`;

  function parseDate(str) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(str || '').trim());
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return { y, m: mo, d, iso: fmtISO(y, mo, d) };
  }

  function todayParts() {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), iso: fmtISO(n.getFullYear(), n.getMonth() + 1, n.getDate()) };
  }

  function formatPretty(p) {
    if (!p) return 'No date selected';
    const dt = new Date(p.y, p.m - 1, p.d);
    return `${SHORT_DAYS[dt.getDay()]}, ${SHORT_MONTHS[p.m - 1]} ${p.d}, ${p.y}`;
  }

  function normalizeEvents(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const p = parseDate(item.date);
      if (!p) continue;
      const title = String(item.title ?? '').trim();
      if (!title) continue;
      const tone = TONES.has(item.tone) ? item.tone : 'pri';
      out.push({ date: p.iso, title, tone });
    }
    return out;
  }

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  const ICON_PREV = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.2 3.2L5.4 8l4.8 4.8"/></svg>';
  const ICON_NEXT = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.8 3.2L10.6 8l-4.8 4.8"/></svg>';
  const ICON_UP = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 7.8L6 4l3.8 3.8"/></svg>';

  class SakugaCalendar extends fx.Base {
    static formAssociated = true;
    static observedAttributes = ['value', 'view', 'min', 'max', 'week-start', 'label', 'disabled', 'events', 'show-agenda'];

    static css = `
      :host {
        display: inline-block;
        width: 100%;
        max-width: var(--sk-calendar-width, 420px);
        --sk-green: #38c98a;
        --sk-amber: #ff9b54;
      }

      .cal {
        position: relative;
        width: 100%;
        padding: 15px 15px 13px;
        border: var(--sk-bw, 3.2px) solid var(--sk-ink);
        border-radius: var(--sk-r, 15px);
        background: var(--sk-card);
        box-shadow: var(--sk-sh);
        color: var(--sk-ink);
        will-change: transform;
        user-select: none;
        -webkit-user-select: none;
      }
      :host([disabled]) .cal { opacity: .55; }

      /* ─── Header ─── */
      .head-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .nav {
        flex: none;
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        padding: 0;
        border: 2.4px solid var(--sk-ink);
        border-radius: 10px;
        background: var(--sk-card);
        box-shadow: 2.5px 3px 0 var(--sk-soft);
        color: var(--sk-ink);
        cursor: pointer;
        touch-action: manipulation;
        will-change: transform;
      }
      .nav svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.7;
        stroke-linecap: round;
        stroke-linejoin: round;
        pointer-events: none;
      }
      .nav:hover:not(:disabled) { background: #f2f1ff; }
      .nav:disabled { opacity: .45; cursor: not-allowed; }

      .zoom-btn {
        flex: 1;
        min-width: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 34px;
        padding: 4px 10px;
        border: 2.2px solid transparent;
        border-radius: 10px;
        background: transparent;
        color: var(--sk-ink);
        font: italic 900 18.5px/1.15 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.015em;
        cursor: pointer;
        touch-action: manipulation;
        will-change: transform;
        white-space: nowrap;
      }
      .zoom-btn:hover:not(:disabled):not([aria-disabled="true"]) {
        border-color: var(--sk-ink);
        background: #f2f1ff;
        box-shadow: 2px 2.5px 0 var(--sk-soft);
      }
      .zoom-btn[aria-disabled="true"] {
        cursor: default;
      }
      .zoom-btn:disabled { cursor: not-allowed; }
      .zoom-caret {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border: 1.9px solid var(--sk-ink);
        border-radius: 6px;
        background: var(--sk-soft);
        color: var(--sk-ink);
        flex: none;
      }
      .zoom-caret svg {
        width: 11px;
        height: 11px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-linejoin: round;
        pointer-events: none;
      }
      .zoom-btn[aria-disabled="true"] .zoom-caret { display: none; }

      .head-sub {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 10px;
        padding-bottom: 11px;
        border-bottom: 2.4px solid var(--sk-ink);
      }

      /* Mini spring-sliding view switcher */
      .seg {
        position: relative;
        display: inline-flex;
        align-items: stretch;
        padding: 2.5px;
        border: 2.2px solid var(--sk-ink);
        border-radius: 999px;
        background: var(--sk-card);
        box-shadow: 2.5px 3px 0 var(--sk-soft);
      }
      .seg-cap {
        position: absolute;
        top: 2.5px;
        bottom: 2.5px;
        left: 0;
        width: 0;
        border-radius: 999px;
        border: 1.8px solid var(--sk-ink);
        background: var(--sk-pri);
        pointer-events: none;
        transform-origin: center center;
        will-change: transform, width;
        display: none;
      }
      .seg-cap.on { display: block; }
      .seg-btn {
        position: relative;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 3.5px 11px;
        margin: 0;
        border: 0;
        border-radius: 999px;
        background: none;
        color: var(--sk-ink);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.25;
        cursor: pointer;
        white-space: nowrap;
        touch-action: manipulation;
      }
      .seg-btn.lit {
        color: var(--sk-on-pri, #fff);
        font-weight: 800;
      }
      .seg-btn:disabled { cursor: not-allowed; }
      .seg-btn:focus-visible { outline: 2.5px solid var(--sk-acc); outline-offset: 2px; }

      .head-meta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
      }
      .period-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 9px;
        border: 2px solid var(--sk-ink);
        border-radius: 999px;
        background: #f4f3ff;
        box-shadow: 2px 2px 0 var(--sk-soft);
        color: var(--sk-ink);
        font-size: 11.5px;
        font-weight: 800;
        line-height: 1.25;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .period-pill.empty {
        background: var(--sk-card);
        border-color: var(--sk-track);
        box-shadow: none;
        color: var(--sk-dim);
      }
      .period-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        border: 1.5px solid var(--sk-ink);
        background: var(--sk-acc);
        flex: none;
      }
      .period-pill.empty .period-dot { display: none; }

      /* ─── Stage & Grids ─── */
      .stage-clip {
        position: relative;
        overflow: hidden;
        margin: 0 -12px -6px;
        padding: 11px 12px 10px;
      }
      .stage {
        position: relative;
        transform-origin: 50% 50%;
        will-change: transform;
      }

      .wk {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 4px;
        margin-bottom: 5px;
        text-align: center;
      }
      .wk span {
        font-size: 11px;
        font-weight: 800;
        line-height: 1.2;
        color: var(--sk-dim);
        padding: 2px 0;
        letter-spacing: 0.02em;
      }
      .wk span.wknd {
        color: var(--sk-ink);
        position: relative;
      }
      .wk span.wknd::after {
        content: "";
        display: block;
        width: 12px;
        height: 2px;
        margin: 2px auto 0;
        border-radius: 2px;
        background: var(--sk-soft);
      }

      .grid {
        display: grid;
      }
      .grid.days {
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 4px;
      }
      .grid.months,
      .grid.years {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 9px;
        padding: 10px 0 8px;
      }

      /* ─── Shared Cell Styling ─── */
      .cell {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 2px solid transparent;
        border-radius: 10px;
        background: transparent;
        color: var(--sk-ink);
        font-variant-numeric: tabular-nums;
        cursor: pointer;
        touch-action: manipulation;
        will-change: transform;
        transform-origin: 50% 50%;
      }
      .cell:focus-visible {
        outline: 2.5px solid var(--sk-acc);
        outline-offset: 2px;
        z-index: 4;
      }
      .cell:disabled {
        cursor: not-allowed;
        opacity: .42;
      }

      /* Day Cells */
      .cell.day-cell {
        height: 40px;
        padding-top: 2px;
        gap: 3px;
      }
      .cell.day-cell .num {
        font-size: 13.5px;
        font-weight: 800;
        line-height: 1.05;
      }
      .cell.day-cell.wknd:not(.sel):not(.out):not(.today) {
        background: #f5f4ff;
        border: 1.8px dashed var(--sk-track);
      }
      .cell.day-cell.out {
        color: var(--sk-dim);
        opacity: .46;
      }
      .cell.day-cell:disabled .num {
        text-decoration: line-through;
      }

      /* Month & Year Chunky Manga Tiles */
      .cell.tile-cell {
        height: 78px;
        padding-top: 4px;
        gap: 6px;
        border: 2.2px solid var(--sk-track);
        border-radius: 12px;
        background: var(--sk-card);
      }
      .cell.tile-cell .tile-lbl {
        font: italic 900 16px/1.1 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.01em;
      }
      .cell.tile-cell .tile-meta {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 19px;
      }
      .cell.tile-cell.out {
        color: var(--sk-dim);
        border-style: dashed;
        opacity: .56;
      }

      /* Interactive Hover */
      .cell:hover:not(:disabled):not(.sel) {
        border: 2.2px solid var(--sk-ink);
        background: #f2f1ff;
        box-shadow: 2px 2.5px 0 var(--sk-soft);
        opacity: 1;
      }

      /* Today Highlight */
      .cell.today {
        border: 2.4px solid var(--sk-acc);
        background: var(--sk-card);
        color: var(--sk-ink);
        font-weight: 900;
        opacity: 1;
      }
      .cell.today::after {
        content: "";
        position: absolute;
        top: 3.5px;
        right: 3.5px;
        width: 5.5px;
        height: 5.5px;
        border-radius: 50%;
        background: var(--sk-acc);
        pointer-events: none;
      }
      .cell.tile-cell.today::after {
        top: 5px;
        right: 5px;
        width: 6.5px;
        height: 6.5px;
      }

      /* Selected Tile */
      .cell.sel {
        background: var(--sk-ink);
        color: var(--sk-card);
        border: 2.2px solid var(--sk-ink);
        box-shadow: 2.5px 3.5px 0 var(--sk-soft);
        opacity: 1;
        z-index: 2;
      }
      .cell.sel.today {
        border-color: var(--sk-acc);
      }
      .cell.tile-cell.sel {
        box-shadow: 3px 4px 0 var(--sk-soft);
      }

      /* Event Marker Pips inside Day & Year Cells */
      .pips {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        height: 7px;
      }
      .pip {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        border: 1.5px solid var(--sk-ink);
        background: var(--sk-pri);
        flex: none;
      }
      .pip.pri { background: var(--sk-pri); }
      .pip.acc { background: var(--sk-acc); }
      .pip.green { background: var(--sk-green); }
      .pip.amber { background: var(--sk-amber); }
      .cell.sel .pip { border-color: var(--sk-card); }

      /* Cel-Shaded Event Count Pill inside Month Cells */
      .ev-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 1.5px 7px;
        border: 1.8px solid var(--sk-ink);
        border-radius: 999px;
        background: #f4f3ff;
        color: var(--sk-ink);
        font-size: 10.5px;
        font-weight: 900;
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
      }
      .ev-badge .ev-dot {
        width: 5.5px;
        height: 5.5px;
        border-radius: 50%;
        background: var(--sk-acc);
        flex: none;
      }
      .cell.sel .ev-badge {
        background: var(--sk-card);
        border-color: var(--sk-card);
        color: var(--sk-ink);
      }

      /* ─── Agenda / Selected Day Footer Strip ─── */
      .foot {
        margin-top: 10px;
        padding-top: 11px;
        border-top: 2.4px solid var(--sk-ink);
      }
      .foot-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .sel-date-wrap {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .sel-swatch {
        width: 10px;
        height: 10px;
        border-radius: 3px;
        border: 2px solid var(--sk-ink);
        background: var(--sk-pri);
        flex: none;
      }
      .sel-swatch.is-today { background: var(--sk-acc); }
      .sel-swatch.is-empty { background: var(--sk-track); border-color: var(--sk-dim); }
      .sel-date {
        font-size: 13.5px;
        font-weight: 800;
        line-height: 1.25;
        color: var(--sk-ink);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sel-date.empty { color: var(--sk-dim); font-weight: 700; }

      .today-btn {
        flex: none;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4.5px 11px;
        border: 2.2px solid var(--sk-ink);
        border-radius: 9px;
        background: var(--sk-card);
        box-shadow: 2.5px 3px 0 var(--sk-soft);
        color: var(--sk-ink);
        font-size: 12px;
        font-weight: 900;
        line-height: 1.2;
        cursor: pointer;
        touch-action: manipulation;
        will-change: transform;
      }
      .today-btn:hover:not(:disabled) { background: #f2f1ff; }
      .today-btn:disabled { opacity: .45; cursor: not-allowed; }
      .today-dot {
        width: 6.5px;
        height: 6.5px;
        border-radius: 50%;
        background: var(--sk-acc);
        flex: none;
      }

      .agenda {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 9px;
      }
      .agenda:empty { display: none; }

      .ev-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        max-width: 100%;
        padding: 4px 10px;
        border: 2px solid var(--sk-ink);
        border-radius: 999px;
        background: var(--sk-card);
        box-shadow: 2px 2.5px 0 var(--sk-soft);
        color: var(--sk-ink);
        font-size: 12px;
        font-weight: 800;
        line-height: 1.25;
        will-change: transform;
        transform-origin: 20% 50%;
      }
      .ev-pill.tone-acc { box-shadow: 2px 2.5px 0 var(--sk-acc); }
      .ev-pill.tone-green { box-shadow: 2px 2.5px 0 var(--sk-green); }
      .ev-pill.tone-amber { box-shadow: 2px 2.5px 0 var(--sk-amber); }
      .ev-pill-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        border: 1.6px solid var(--sk-ink);
        background: var(--sk-pri);
        flex: none;
      }
      .ev-pill.tone-acc .ev-pill-dot { background: var(--sk-acc); }
      .ev-pill.tone-green .ev-pill-dot { background: var(--sk-green); }
      .ev-pill.tone-amber .ev-pill-dot { background: var(--sk-amber); }
      .ev-pill-txt {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      @media (max-width: 400px) {
        .cal { padding: 12px 11px 11px; }
        .stage-clip { margin: 0 -9px -6px; padding: 10px 9px 10px; }
        .nav { width: 32px; height: 32px; }
        .zoom-btn { font-size: 16.5px; padding: 3px 6px; gap: 5px; }
        .seg-btn { padding: 3.5px 9px; font-size: 11.5px; }
        .period-pill { font-size: 11px; padding: 2.5px 7px; }
        .wk, .grid.days { gap: 3px; }
        .cell.day-cell { height: 38px; border-radius: 9px; }
        .cell.day-cell .num { font-size: 13px; }
        .grid.months, .grid.years { gap: 7px; padding: 8px 0 6px; }
        .cell.tile-cell { height: 72px; }
        .cell.tile-cell .tile-lbl { font-size: 15px; }
        .sel-date { font-size: 12.5px; }
        .today-btn { padding: 4px 9px; font-size: 11.5px; }
        .ev-pill { font-size: 11.5px; padding: 3.5px 9px; }
      }
    `;

    constructor() {
      super();
      this._value = '';
      this._view = 'day';
      this._events = [];
      this._eventsByDate = new Map();
      this._eventsByMonth = new Map();
      this._eventsByYear = new Map();
      this._seq = 0;
      this._focusKey = null;
      this._ro = null;
      this._capPending = false;
      this._capDir = 1;
      this._pillSprings = [];
      const t = todayParts();
      this.viewY = t.y;
      this.viewM = t.m;
    }

    // ─── Properties ───
    get value() { return this._value; }
    set value(v) {
      const p = parseDate(v);
      const next = p ? p.iso : '';
      if (next === this._value && this.ready) return;
      this._value = next;
      if (p) { this.viewY = p.y; this.viewM = p.m; this._focusKey = p.iso; }
      this.internals?.setFormValue(this._value);
      if (this.ready) this._renderAll(false);
    }

    get view() { return this._view; }
    set view(v) {
      if (!VIEWS.includes(v)) return;
      if (this.ready) this.setView(v);
      else this._view = v;
    }

    get min() { return this.getAttribute('min') || ''; }
    set min(v) { v ? this.setAttribute('min', String(v)) : this.removeAttribute('min'); }

    get max() { return this.getAttribute('max') || ''; }
    set max(v) { v ? this.setAttribute('max', String(v)) : this.removeAttribute('max'); }

    get weekStart() { return this.getAttribute('week-start') === 'sun' ? 'sun' : 'mon'; }
    set weekStart(v) { this.setAttribute('week-start', v === 'sun' ? 'sun' : 'mon'); }

    get label() { return this.getAttribute('label') || 'Calendar'; }
    set label(v) { v ? this.setAttribute('label', String(v)) : this.removeAttribute('label'); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get showAgenda() {
      const a = this.getAttribute('show-agenda');
      return a !== 'false' && a !== '0';
    }
    set showAgenda(v) { this.setAttribute('show-agenda', v ? 'true' : 'false'); }

    get events() { return this._events.map((e) => ({ ...e })); }
    set events(list) {
      this._setEventsList(list);
      if (this.ready) this._renderAll(false);
    }

    formResetCallback() {
      const init = parseDate(this.getAttribute('value'));
      this._value = init ? init.iso : '';
      if (init) { this.viewY = init.y; this.viewM = init.m; }
      this.internals?.setFormValue(this._value);
      if (this.ready) this._renderAll(false);
    }

    attributeChangedCallback(name, oldV, newV) {
      if (oldV === newV) return;
      if (name === 'value') {
        const p = parseDate(newV);
        this._value = p ? p.iso : '';
        if (p) { this.viewY = p.y; this.viewM = p.m; this._focusKey = p.iso; }
        this.internals?.setFormValue(this._value);
        if (this.ready) this._renderAll(false);
      } else if (name === 'view') {
        const next = VIEWS.includes(newV) ? newV : 'day';
        if (this.ready) {
          if (next !== this._view) this.setView(next);
        } else {
          this._view = next;
        }
      } else if (name === 'events') {
        try { this._setEventsList(newV ? JSON.parse(newV) : []); } catch { this._setEventsList([]); }
        if (this.ready) this._renderAll(false);
      } else if (name === 'label') {
        if (this.cal) this.cal.setAttribute('aria-label', this.label);
      } else if (name === 'disabled') {
        if (this.ready) this._syncDisabled();
      } else if (name === 'min' || name === 'max' || name === 'week-start' || name === 'show-agenda') {
        if (this.ready) this._renderAll(false);
      }
    }

    _setEventsList(list) {
      this._events = normalizeEvents(list);
      this._eventsByDate = new Map();
      this._eventsByMonth = new Map();
      this._eventsByYear = new Map();
      for (const ev of this._events) {
        const dKey = ev.date;
        const mKey = dKey.slice(0, 7);
        const yKey = dKey.slice(0, 4);
        if (!this._eventsByDate.has(dKey)) this._eventsByDate.set(dKey, []);
        this._eventsByDate.get(dKey).push(ev);
        if (!this._eventsByMonth.has(mKey)) this._eventsByMonth.set(mKey, []);
        this._eventsByMonth.get(mKey).push(ev);
        if (!this._eventsByYear.has(yKey)) this._eventsByYear.set(yKey, []);
        this._eventsByYear.get(yKey).push(ev);
      }
    }

    _isDisabledDate(iso) {
      if (this.disabled) return true;
      const mn = parseDate(this.min);
      if (mn && iso < mn.iso) return true;
      const mx = parseDate(this.max);
      if (mx && iso > mx.iso) return true;
      return false;
    }

    _isDisabledMonth(y, m) {
      if (this.disabled) return true;
      const mn = parseDate(this.min);
      const first = fmtISO(y, m, 1);
      const last = fmtISO(y, m, daysInMonth(y, m));
      if (mn && last < mn.iso) return true;
      const mx = parseDate(this.max);
      if (mx && first > mx.iso) return true;
      return false;
    }

    _isDisabledYear(y) {
      if (this.disabled) return true;
      const mn = parseDate(this.min);
      if (mn && y < mn.y) return true;
      const mx = parseDate(this.max);
      if (mx && y > mx.y) return true;
      return false;
    }

    // ─── Public Methods ───
    setView(nextView, { anchorEl = null, silent = false } = {}) {
      if (!VIEWS.includes(nextView)) return;
      const prev = this._view;
      if (nextView === prev) return;
      const anchorPos = anchorEl && anchorEl.isConnected ? at(anchorEl) : null;
      this._view = nextView;
      this._focusKey = null;
      this._seq++;

      const goingUp = VIEW_DEPTH[nextView] > VIEW_DEPTH[prev];
      this._renderAll(false);
      this._moveCap(false);

      if (!fx.calm && this.isConnected) {
        this._triggerZoomFx(goingUp, anchorPos);
      }

      if (!silent) {
        this.emit('sakuga:view-change', { view: nextView, prev, year: this.viewY, month: this.viewM });
      }
    }

    goTo(year, month) {
      const y = Number(year);
      if (!Number.isFinite(y)) return;
      const prevY = this.viewY, prevM = this.viewM;
      const nextY = clamp(Math.trunc(y), 1, 9999);
      const nextM = month !== undefined && month !== null ? clamp(Math.trunc(Number(month)), 1, 12) : this.viewM;
      const dir = (nextY * 12 + nextM) >= (prevY * 12 + prevM) ? 1 : -1;
      this.viewY = nextY;
      this.viewM = nextM;
      this._focusKey = null;
      this._renderAll(false);

      if (!fx.calm && this.isConnected && (nextY !== prevY || nextM !== prevM)) {
        this.slideX.x = dir * 20;
        this.slideX.v = -dir * 32;
        this.slideX.to = 0;
      }

      this.emit('sakuga:navigate', { year: this.viewY, month: this.viewM, view: this._view });
    }

    today() {
      if (this.disabled) return;
      const t = todayParts();
      const prevView = this._view;
      const prevY = this.viewY, prevM = this.viewM;
      const viewChanged = prevView !== 'day';
      const navChanged = this.viewY !== t.y || this.viewM !== t.m;
      const canSelect = !this._isDisabledDate(t.iso);

      this._view = 'day';
      this.viewY = t.y;
      this.viewM = t.m;
      this._focusKey = t.iso;
      this._seq++;

      if (canSelect) {
        this._value = t.iso;
        this.internals?.setFormValue(this._value);
      }

      this._renderAll(true);
      this._moveCap(false);

      if (!fx.calm && this.isConnected) {
        if (viewChanged) {
          this.zoomS.x = 0.82;
          this.zoomS.v = 3.8;
          this.zoomS.to = 1;
        } else if (navChanged) {
          const dir = (t.y * 12 + t.m) >= (prevY * 12 + prevM) ? 1 : -1;
          this.slideX.x = dir * 18;
          this.slideX.v = -dir * 28;
          this.slideX.to = 0;
        }
        const cell = this.stage.querySelector(`[data-date="${t.iso}"]`);
        this._triggerTodayFx(cell);
      }

      if (viewChanged) {
        this.emit('sakuga:view-change', { view: 'day', prev: prevView, year: this.viewY, month: this.viewM });
      }
      if (navChanged) {
        this.emit('sakuga:navigate', { year: this.viewY, month: this.viewM, view: 'day' });
      }
      if (canSelect) {
        const evs = (this._eventsByDate.get(t.iso) || []).map((e) => ({ ...e }));
        this.emit('change', { value: t.iso, year: t.y, month: t.m, day: t.d, events: evs });
      }
    }

    select(dateStr, silent = false) {
      const p = parseDate(dateStr);
      if (!p || this._isDisabledDate(p.iso)) return false;
      const navChanged = p.y !== this.viewY || p.m !== this.viewM;
      this._value = p.iso;
      this.viewY = p.y;
      this.viewM = p.m;
      this._focusKey = p.iso;
      this._seq++;
      this.internals?.setFormValue(this._value);

      const animatePills = !silent && !fx.calm;
      this._renderAll(animatePills);

      if (!silent && !fx.calm && this.isConnected && this._view === 'day') {
        const cell = this.stage.querySelector(`[data-date="${p.iso}"]`);
        if (cell) this._triggerDayPickFx(cell, p.iso);
      }

      if (navChanged && !silent) {
        this.emit('sakuga:navigate', { year: this.viewY, month: this.viewM, view: this._view });
      }
      if (!silent) {
        const evs = (this._eventsByDate.get(p.iso) || []).map((e) => ({ ...e }));
        this.emit('change', { value: p.iso, year: p.y, month: p.m, day: p.d, events: evs });
      }
      return true;
    }

    // ─── Template ───
    render() {
      return `
        <section class="cal" part="card" role="region" aria-label="${esc(this.label)}">
          <header class="head" part="header">
            <div class="head-top">
              <button type="button" class="nav" part="nav" data-nav="-1" aria-label="Previous month">${ICON_PREV}</button>
              <button type="button" class="zoom-btn" part="title" aria-label="Zoom out view">
                <span class="zoom-txt"></span>
                <span class="zoom-caret" aria-hidden="true">${ICON_UP}</span>
              </button>
              <button type="button" class="nav" part="nav" data-nav="1" aria-label="Next month">${ICON_NEXT}</button>
            </div>
            <div class="head-sub">
              <div class="seg" role="tablist" part="switcher" aria-label="Calendar view">
                <span class="seg-cap" aria-hidden="true"></span>
                <button type="button" class="seg-btn" role="tab" data-view="day" aria-selected="true">Day</button>
                <button type="button" class="seg-btn" role="tab" data-view="month" aria-selected="false">Month</button>
                <button type="button" class="seg-btn" role="tab" data-view="year" aria-selected="false">Year</button>
              </div>
              <div class="head-meta">
                <span class="period-pill" part="period-badge" aria-live="polite"><i class="period-dot" aria-hidden="true"></i><span class="period-txt"></span></span>
              </div>
            </div>
          </header>

          <div class="stage-clip">
            <div class="stage" part="grid-stage"></div>
          </div>

          <footer class="foot" part="footer">
            <div class="foot-row">
              <div class="sel-date-wrap">
                <span class="sel-swatch" aria-hidden="true"></span>
                <span class="sel-date" part="selected-date"></span>
              </div>
              <button type="button" class="today-btn" part="today">
                <span class="today-dot" aria-hidden="true"></span>
                Today
              </button>
            </div>
            <div class="agenda" part="agenda" aria-label="Selected day events"></div>
          </footer>
        </section>`;
    }

    setup() {
      this.cal = this.$('.cal');
      this.prevBtn = this.$('[data-nav="-1"]');
      this.nextBtn = this.$('[data-nav="1"]');
      this.zoomBtn = this.$('.zoom-btn');
      this.zoomTxt = this.$('.zoom-txt');
      this.seg = this.$('.seg');
      this.segCap = this.$('.seg-cap');
      this.segBtns = this.$$('.seg-btn');
      this.periodPill = this.$('.period-pill');
      this.periodTxt = this.$('.period-txt');
      this.stage = this.$('.stage');
      this.foot = this.$('.foot');
      this.selSwatch = this.$('.sel-swatch');
      this.selDateEl = this.$('.sel-date');
      this.todayBtn = this.$('.today-btn');
      this.agendaEl = this.$('.agenda');

      // Springs
      this.cardS = new Spring(1, 560, 18);
      this.zoomS = new Spring(1, 450, 16);
      this.slideX = new Spring(0, 440, 19);
      this.pickS = new Spring(1, 520, 14);
      this.pickEl = null;

      // Mini capsule switcher springs
      this.capX = new Spring(0, 420, 24);
      this.capW = new Spring(48, 420, 26);
      this.capUp = new Spring(1, 480, 15);

      // Tactile button squashy physics
      this.prevSq = squashy(this.prevBtn, { low: 0.78, wide: 0.35 });
      this.nextSq = squashy(this.nextBtn, { low: 0.78, wide: 0.35 });
      this.zoomSq = squashy(this.zoomBtn, { low: 0.84, wide: 0.25 });
      this.todaySq = squashy(this.todayBtn, { low: 0.8, wide: 0.35 });

      // Parse initial attributes
      const initView = this.getAttribute('view');
      if (VIEWS.includes(initView)) this._view = initView;
      const initVal = parseDate(this.getAttribute('value'));
      if (initVal) {
        this._value = initVal.iso;
        this.viewY = initVal.y;
        this.viewM = initVal.m;
        this._focusKey = initVal.iso;
      }
      if (!this._events.length && this.hasAttribute('events')) {
        try { this._setEventsList(JSON.parse(this.getAttribute('events') || '[]')); } catch { this._setEventsList([]); }
      }
      this.internals?.setFormValue(this._value);

      // Bind listeners
      this.prevBtn.addEventListener('click', () => this._stepNav(-1, this.prevBtn));
      this.nextBtn.addEventListener('click', () => this._stepNav(1, this.nextBtn));
      this.zoomBtn.addEventListener('click', () => this._drillUp());
      this.todayBtn.addEventListener('click', () => this.today());

      this.segBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          if (this.disabled) return;
          const v = btn.dataset.view;
          if (v && v !== this._view) this.setView(v);
        });
        btn.addEventListener('keydown', (e) => {
          const i = VIEWS.indexOf(btn.dataset.view);
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const ni = (i + (e.key === 'ArrowRight' ? 1 : -1) + VIEWS.length) % VIEWS.length;
            this.setView(VIEWS[ni]);
            this.segBtns[ni].focus();
          }
        });
      });

      this.stage.addEventListener('click', (e) => this._onStageClick(e));
      this.stage.addEventListener('keydown', (e) => this._onStageKey(e));

      this._renderAll(false);
      this._syncDisabled();
      this._moveCap(true);
      this._attachObserver();
    }

    connectedCallback() {
      super.connectedCallback();
      if (this.ready) {
        this._attachObserver();
        this._moveCap(true);
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this._seq++;
      this._ro?.disconnect();
      this._ro = null;
    }

    _attachObserver() {
      if (!this._ro && this.seg) {
        this._ro = new ResizeObserver(() => {
          if (!this._capPending) this._moveCap(true);
        });
        this._ro.observe(this.seg);
      }
    }

    _syncDisabled() {
      const dis = this.disabled;
      this.prevBtn.disabled = dis;
      this.nextBtn.disabled = dis;
      this.zoomBtn.disabled = dis;
      this.todayBtn.disabled = dis;
      this.segBtns.forEach((b) => { b.disabled = dis; });
      this._renderStage();
    }

    // ─── Rendering ───
    _renderAll(animatePills) {
      this._renderHeader();
      this._renderStage();
      this._renderFooter(animatePills);
    }

    _renderHeader() {
      const v = this._view;
      const decStart = Math.floor(this.viewY / 10) * 10;

      if (v === 'day') {
        this.zoomTxt.textContent = `${FULL_MONTHS[this.viewM - 1]} ${this.viewY}`;
        this.zoomBtn.setAttribute('aria-label', `${FULL_MONTHS[this.viewM - 1]} ${this.viewY}, switch to month view`);
        this.zoomBtn.removeAttribute('aria-disabled');
        this.prevBtn.setAttribute('aria-label', 'Previous month');
        this.nextBtn.setAttribute('aria-label', 'Next month');
      } else if (v === 'month') {
        this.zoomTxt.textContent = String(this.viewY);
        this.zoomBtn.setAttribute('aria-label', `${this.viewY}, switch to decade view`);
        this.zoomBtn.removeAttribute('aria-disabled');
        this.prevBtn.setAttribute('aria-label', 'Previous year');
        this.nextBtn.setAttribute('aria-label', 'Next year');
      } else {
        this.zoomTxt.textContent = `${decStart} – ${decStart + 9}`;
        this.zoomBtn.setAttribute('aria-label', `Years ${decStart} to ${decStart + 9}`);
        this.zoomBtn.setAttribute('aria-disabled', 'true');
        this.prevBtn.setAttribute('aria-label', 'Previous decade');
        this.nextBtn.setAttribute('aria-label', 'Next decade');
      }

      this.segBtns.forEach((b) => {
        const active = b.dataset.view === v;
        b.setAttribute('aria-selected', String(active));
        b.tabIndex = active ? 0 : -1;
      });

      // Period event badge
      let evCount = 0;
      if (v === 'day') {
        evCount = (this._eventsByMonth.get(`${String(this.viewY).padStart(4, '0')}-${pad2(this.viewM)}`) || []).length;
      } else if (v === 'month') {
        evCount = (this._eventsByYear.get(String(this.viewY).padStart(4, '0')) || []).length;
      } else {
        for (let y = decStart; y <= decStart + 9; y++) {
          evCount += (this._eventsByYear.get(String(y).padStart(4, '0')) || []).length;
        }
      }

      if (evCount > 0) {
        this.periodPill.classList.remove('empty');
        this.periodTxt.textContent = evCount === 1 ? '1 event' : `${evCount} events`;
      } else {
        this.periodPill.classList.add('empty');
        this.periodTxt.textContent = v === 'day' ? SHORT_MONTHS[this.viewM - 1] : v === 'month' ? String(this.viewY) : `${decStart}s`;
      }
    }

    _renderStage() {
      const v = this._view;
      const today = todayParts();
      const sel = parseDate(this._value);

      if (v === 'day') {
        const sun = this.weekStart === 'sun';
        const wk = sun ? WK_SUN : WK_MON;
        const first = new Date(this.viewY, this.viewM - 1, 1);
        const startOff = sun ? first.getDay() : (first.getDay() + 6) % 7;
        const startDate = new Date(this.viewY, this.viewM - 1, 1 - startOff);

        let focusTarget = this._focusKey;
        const cells = [];
        const isoList = [];

        for (let i = 0; i < 42; i++) {
          const dt = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
          const cy = dt.getFullYear(), cm = dt.getMonth() + 1, cd = dt.getDate();
          const iso = fmtISO(cy, cm, cd);
          const col = i % 7;
          const isWknd = wk[col].wknd;
          const isOut = cm !== this.viewM;
          const isToday = iso === today.iso;
          const isSel = sel && sel.iso === iso;
          const dis = this._isDisabledDate(iso);
          const evs = this._eventsByDate.get(iso) || [];
          isoList.push({ iso, isOut, isSel, isToday, dis });

          const pipsHtml = evs.slice(0, 3)
            .map((ev) => `<i class="pip ${ev.tone}" aria-hidden="true"></i>`)
            .join('');

          const ariaParts = [formatPretty({ y: cy, m: cm, d: cd })];
          if (isToday) ariaParts.push('Today');
          if (evs.length) ariaParts.push(evs.map((e) => e.title).join(', '));

          const cls = [
            'cell', 'day-cell',
            isWknd ? 'wknd' : '',
            isOut ? 'out' : '',
            isToday ? 'today' : '',
            isSel ? 'sel' : '',
            evs.length ? 'has-ev' : '',
          ].filter(Boolean).join(' ');

          cells.push({
            iso,
            html: `<button type="button" class="${cls}" part="day" data-date="${iso}" aria-label="${esc(ariaParts.join(' · '))}" aria-pressed="${isSel ? 'true' : 'false'}"${dis ? ' disabled' : ''}><span class="num">${cd}</span><span class="pips">${pipsHtml}</span></button>`,
          });
        }

        if (!focusTarget || !isoList.some((c) => c.iso === focusTarget && !c.dis)) {
          const prefer = isoList.find((c) => c.isSel && !c.dis)
            || isoList.find((c) => c.isToday && !c.isOut && !c.dis)
            || isoList.find((c) => !c.isOut && !c.dis)
            || isoList[0];
          focusTarget = prefer?.iso || '';
        }

        const cellsStr = cells.map((c) => c.html.replace('<button ', `<button tabindex="${c.iso === focusTarget ? '0' : '-1'}" `)).join('');
        const wkHtml = wk.map((w) => `<span class="${w.wknd ? 'wknd' : ''}" aria-hidden="true">${w.lbl}</span>`).join('');
        this.stage.innerHTML = `<div class="wk">${wkHtml}</div><div class="grid days" role="grid" aria-label="${esc(`${FULL_MONTHS[this.viewM - 1]} ${this.viewY}`)}">${cellsStr}</div>`;
      } else if (v === 'month') {
        const focusM = Number(this._focusKey) || (sel && sel.y === this.viewY ? sel.m : this.viewM);
        const cells = [];
        for (let m = 1; m <= 12; m++) {
          const isToday = this.viewY === today.y && m === today.m;
          const isSel = sel && sel.y === this.viewY && sel.m === m;
          const dis = this._isDisabledMonth(this.viewY, m);
          const evs = this._eventsByMonth.get(`${String(this.viewY).padStart(4, '0')}-${pad2(m)}`) || [];
          const cls = ['cell', 'tile-cell', 'month-cell', isToday ? 'today' : '', isSel ? 'sel' : ''].filter(Boolean).join(' ');
          const badge = evs.length
            ? `<span class="tile-meta"><span class="ev-badge"><i class="ev-dot" aria-hidden="true"></i>${evs.length}</span></span>`
            : `<span class="tile-meta" aria-hidden="true"></span>`;
          const aria = `${FULL_MONTHS[m - 1]} ${this.viewY}${evs.length ? `, ${evs.length} events` : ''}`;
          cells.push(`<button type="button" class="${cls}" part="month" data-month="${m}" tabindex="${m === focusM ? '0' : '-1'}" aria-label="${esc(aria)}" aria-pressed="${isSel ? 'true' : 'false'}"${dis ? ' disabled' : ''}><span class="tile-lbl">${SHORT_MONTHS[m - 1]}</span>${badge}</button>`);
        }
        this.stage.innerHTML = `<div class="grid months" role="grid" aria-label="Months of ${this.viewY}">${cells.join('')}</div>`;
      } else {
        const decStart = Math.floor(this.viewY / 10) * 10;
        const focusY = Number(this._focusKey) || (sel && sel.y >= decStart - 1 && sel.y <= decStart + 10 ? sel.y : this.viewY);
        const cells = [];
        for (let i = -1; i <= 10; i++) {
          const y = decStart + i;
          const isOut = i < 0 || i > 9;
          const isToday = y === today.y;
          const isSel = sel && sel.y === y;
          const dis = this._isDisabledYear(y);
          const evs = this._eventsByYear.get(String(y).padStart(4, '0')) || [];
          const cls = ['cell', 'tile-cell', 'year-cell', isOut ? 'out' : '', isToday ? 'today' : '', isSel ? 'sel' : ''].filter(Boolean).join(' ');
          const pipsHtml = evs.slice(0, 3).map((ev) => `<i class="pip ${ev.tone}" aria-hidden="true"></i>`).join('');
          const aria = `${y}${evs.length ? `, ${evs.length} events` : ''}`;
          cells.push(`<button type="button" class="${cls}" part="year" data-year="${y}" tabindex="${y === focusY ? '0' : '-1'}" aria-label="${esc(aria)}" aria-pressed="${isSel ? 'true' : 'false'}"${dis ? ' disabled' : ''}><span class="tile-lbl">${y}</span><span class="tile-meta"><span class="pips">${pipsHtml}</span></span></button>`);
        }
        this.stage.innerHTML = `<div class="grid years" role="grid" aria-label="Years ${decStart} to ${decStart + 9}">${cells.join('')}</div>`;
      }
    }

    _renderFooter(animatePills) {
      const sel = parseDate(this._value);
      const today = todayParts();
      const show = this.showAgenda;

      this.selDateEl.textContent = formatPretty(sel);
      this.selDateEl.classList.toggle('empty', !sel);
      this.selSwatch.classList.toggle('is-empty', !sel);
      this.selSwatch.classList.toggle('is-today', !!(sel && sel.iso === today.iso));

      this._pillSprings = [];
      if (!show || !sel) {
        this.agendaEl.innerHTML = '';
        return;
      }

      const evs = this._eventsByDate.get(sel.iso) || [];
      if (!evs.length) {
        this.agendaEl.innerHTML = '';
        return;
      }

      this.agendaEl.innerHTML = evs
        .map((ev) => `<span class="ev-pill tone-${ev.tone}" part="event"><i class="ev-pill-dot" aria-hidden="true"></i><span class="ev-pill-txt">${esc(ev.title)}</span></span>`)
        .join('');

      if (!animatePills || fx.calm) return;

      const pills = this.$$('.ev-pill');
      const seq = this._seq;
      this._pillSprings = pills.map((el) => {
        const sp = new Spring(0.55, 520, 15);
        sp.to = 0.55;
        el.style.transform = 'scale(0.55)';
        return { el, sp };
      });
      this._pillSprings.forEach((item, idx) => {
        later(idx * 45, () => {
          if (seq !== this._seq || !this.isConnected) return;
          item.sp.to = 1;
          item.sp.v = 6.2;
        });
      });
    }

    // ─── View Switcher Capsule Physics ───
    _moveCap(snap) {
      const idx = Math.max(0, VIEWS.indexOf(this._view));
      const btn = this.segBtns?.[idx];
      if (!btn || !btn.offsetWidth) {
        this.segCap?.classList.remove('on');
        return false;
      }
      this.segCap.classList.add('on');
      const prevX = this.capX.x;
      this.capX.to = btn.offsetLeft;
      this.capW.to = btn.offsetWidth;
      if (snap || fx.calm) {
        this._capPending = false;
        this.capX.x = this.capX.to; this.capX.v = 0;
        this.capW.x = this.capW.to; this.capW.v = 0;
        this.capUp.x = 1; this.capUp.v = 0;
        this.segCap.style.width = this.capW.to + 'px';
        this.segCap.style.transform = `translateX(${this.capX.to}px)`;
        this._syncSegLit(this.capX.to, this.capW.to);
      } else {
        this._capDir = Math.sign(this.capX.to - prevX) || 1;
        this.capUp.x = 0.9;
        this._capPending = true;
      }
      return true;
    }

    _syncSegLit(left, w) {
      const mid = left + w * 0.5;
      (this.segBtns || []).forEach((b) => {
        const bm = b.offsetLeft + b.offsetWidth * 0.5;
        b.classList.toggle('lit', Math.abs(mid - bm) < Math.max(b.offsetWidth * 0.52, w * 0.42));
      });
    }

    // ─── Interaction Handlers ───
    _stepNav(dir, btnEl) {
      if (this.disabled) return;
      if (this._view === 'day') {
        let m = this.viewM + dir, y = this.viewY;
        if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
        this.viewY = clamp(y, 1, 9999);
        this.viewM = m;
      } else if (this._view === 'month') {
        this.viewY = clamp(this.viewY + dir, 1, 9999);
      } else {
        this.viewY = clamp(this.viewY + dir * 10, 1, 9999);
      }
      this._focusKey = null;
      this._renderAll(false);

      if (!fx.calm && this.isConnected) {
        this.slideX.x = dir * 16;
        this.slideX.v = -dir * 28;
        this.slideX.to = 0;

        const sq = dir < 0 ? this.prevSq : this.nextSq;
        sq.s.x = Math.min(sq.s.x, 0.8);
        sq.s.v += 3.8;

        if (btnEl) {
          const b = at(btnEl);
          const outX = b.x + dir * (b.w * 0.62);
          lines(outX, b.y, { n: 4, dir: dir > 0 ? 0 : Math.PI, len: 30, spread: 12, life: 0.3 });
          ticks(b.x + dir * (b.w * 0.48), b.y - b.h * 0.36, {
            dir: dir > 0 ? -0.55 : -Math.PI + 0.55,
            n: 3, r: 5, len: 12, fan: 0.44, life: 0.36,
          });
        }
      }

      this.emit('sakuga:navigate', { year: this.viewY, month: this.viewM, view: this._view });
    }

    _drillUp() {
      if (this.disabled) return;
      if (this._view === 'day') {
        this.zoomSq.s.x = Math.min(this.zoomSq.s.x, 0.84);
        this.zoomSq.s.v += 3.2;
        this.setView('month', { anchorEl: this.zoomBtn });
      } else if (this._view === 'month') {
        this.zoomSq.s.x = Math.min(this.zoomSq.s.x, 0.84);
        this.zoomSq.s.v += 3.2;
        this.setView('year', { anchorEl: this.zoomBtn });
      }
    }

    _onStageClick(e) {
      const btn = e.target.closest('button.cell');
      if (!btn || btn.disabled || this.disabled) return;

      if (btn.dataset.date) {
        this.select(btn.dataset.date, false);
        return;
      }
      if (btn.dataset.month) {
        const m = +btn.dataset.month;
        this.viewM = m;
        this.setView('day', { anchorEl: btn });
        this.emit('sakuga:navigate', { year: this.viewY, month: this.viewM, view: 'day' });
        return;
      }
      if (btn.dataset.year) {
        const y = +btn.dataset.year;
        this.viewY = y;
        this.setView('month', { anchorEl: btn });
        this.emit('sakuga:navigate', { year: this.viewY, month: this.viewM, view: 'month' });
      }
    }

    _onStageKey(e) {
      if (this.disabled) return;
      const btn = e.target.closest('button.cell');
      if (!btn) return;

      if (e.key === 'Backspace' || (e.altKey && e.key === 'ArrowUp')) {
        if (this._view !== 'year') {
          e.preventDefault();
          this._drillUp();
          const nextFocus = this.stage.querySelector('button.cell[tabindex="0"]');
          nextFocus?.focus();
        }
        return;
      }

      if (e.key === 'PageUp' || e.key === 'PageDown') {
        e.preventDefault();
        const dir = e.key === 'PageDown' ? 1 : -1;
        if (this._view === 'day' && e.shiftKey) {
          this.goTo(this.viewY + dir, this.viewM);
        } else {
          this._stepNav(dir, dir > 0 ? this.nextBtn : this.prevBtn);
        }
        this.stage.querySelector('button.cell[tabindex="0"]')?.focus();
        return;
      }

      if (this._view === 'day' && btn.dataset.date) {
        const p = parseDate(btn.dataset.date);
        if (!p) return;
        let delta = 0;
        if (e.key === 'ArrowRight') delta = 1;
        else if (e.key === 'ArrowLeft') delta = -1;
        else if (e.key === 'ArrowDown') delta = 7;
        else if (e.key === 'ArrowUp') delta = -7;
        else if (e.key === 'Home') {
          const cells = [...this.stage.querySelectorAll('button.cell')];
          const idx = cells.indexOf(btn);
          delta = -(idx % 7);
        } else if (e.key === 'End') {
          const cells = [...this.stage.querySelectorAll('button.cell')];
          const idx = cells.indexOf(btn);
          delta = 6 - (idx % 7);
        }
        if (!delta) return;
        e.preventDefault();
        const nextDt = new Date(p.y, p.m - 1, p.d + delta);
        const ny = nextDt.getFullYear(), nm = nextDt.getMonth() + 1, nd = nextDt.getDate();
        const nextIso = fmtISO(ny, nm, nd);
        this._focusKey = nextIso;
        if (ny !== this.viewY || nm !== this.viewM) {
          const dir = delta > 0 ? 1 : -1;
          this.viewY = ny; this.viewM = nm;
          this._renderAll(false);
          if (!fx.calm) { this.slideX.x = dir * 16; this.slideX.v = -dir * 26; }
          this.emit('sakuga:navigate', { year: this.viewY, month: this.viewM, view: 'day' });
        } else {
          this.stage.querySelectorAll('button.cell').forEach((c) => { c.tabIndex = c.dataset.date === nextIso ? 0 : -1; });
        }
        this.stage.querySelector(`[data-date="${nextIso}"]`)?.focus();
      } else if (this._view === 'month' && btn.dataset.month) {
        const cur = +btn.dataset.month;
        const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 }[e.key];
        if (!step) return;
        e.preventDefault();
        let nm = cur + step, ny = this.viewY;
        while (nm < 1) { nm += 12; ny--; }
        while (nm > 12) { nm -= 12; ny++; }
        this._focusKey = String(nm);
        if (ny !== this.viewY) {
          this.viewY = clamp(ny, 1, 9999);
          this._renderAll(false);
          if (!fx.calm) { this.slideX.x = (step > 0 ? 1 : -1) * 16; }
          this.emit('sakuga:navigate', { year: this.viewY, month: this.viewM, view: 'month' });
        } else {
          this.stage.querySelectorAll('button.cell').forEach((c) => { c.tabIndex = +c.dataset.month === nm ? 0 : -1; });
        }
        this.stage.querySelector(`[data-month="${nm}"]`)?.focus();
      } else if (this._view === 'year' && btn.dataset.year) {
        const cur = +btn.dataset.year;
        const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 }[e.key];
        if (!step) return;
        e.preventDefault();
        const ny = clamp(cur + step, 1, 9999);
        const oldDec = Math.floor(this.viewY / 10) * 10;
        this._focusKey = String(ny);
        if (ny < oldDec - 1 || ny > oldDec + 10) {
          this.viewY = ny;
          this._renderAll(false);
          if (!fx.calm) { this.slideX.x = (step > 0 ? 1 : -1) * 16; }
          this.emit('sakuga:navigate', { year: this.viewY, month: this.viewM, view: 'year' });
        } else {
          this.stage.querySelectorAll('button.cell').forEach((c) => { c.tabIndex = +c.dataset.year === ny ? 0 : -1; });
        }
        this.stage.querySelector(`[data-year="${ny}"]`)?.focus();
      }
    }

    // ─── Anime VFX Choreography ───
    _sfxTopPos(preferX) {
      const box = at(this.cal);
      const topEdge = box.y - box.h * 0.5;
      const y = Math.max(scrollY + 26, topEdge - 26);
      const minX = box.x - box.w * 0.34;
      const maxX = box.x + box.w * 0.34;
      const x = preferX !== undefined ? clamp(preferX, minX, maxX) : box.x + box.w * 0.24;
      return { x, y, box };
    }

    _triggerZoomFx(goingUp, anchorPos) {
      const box = at(this.cal);
      if (box.w <= 0 || box.h <= 0) return;

      if (goingUp) {
        // Drilling UP (Day → Month → Year): inward punch + radial outward speed lines + corner pink ticks + hollow シュッ
        this.zoomS.k = 460; this.zoomS.d = 17;
        this.zoomS.x = 1.22;
        this.zoomS.v = -2.4;
        this.zoomS.to = 1;
        this.cardS.x = 0.986;
        this.cardS.v = 0.5;

        const leftX = box.x - box.w * 0.5 - 4;
        const rightX = box.x + box.w * 0.5 + 4;
        const topY = box.y - box.h * 0.5;
        const botY = box.y + box.h * 0.5;

        lines(leftX, box.y - box.h * 0.08, { n: 5, dir: Math.PI, len: 38, spread: 42, life: 0.32 });
        lines(rightX, box.y + box.h * 0.08, { n: 5, dir: 0, len: 38, spread: 42, life: 0.32 });
        ticks(rightX - 2, topY - 2, { dir: -0.78, n: 3, r: 6, len: 14, fan: 0.44, life: 0.42 });
        ticks(leftX + 2, botY + 2, { dir: 2.36, n: 3, r: 6, len: 14, fan: 0.44, life: 0.42 });

        const pos = this._sfxTopPos(box.x + box.w * 0.24);
        sfx('shu', pos.x, pos.y, { size: 76, rot: -0.1, life: 0.56, ...hollow() });
      } else {
        // Drilling DOWN (Year → Month → Day): forward zoom overshoot + corner puffs + ring + hollow カチッ
        this.zoomS.k = 440; this.zoomS.d = 15;
        this.zoomS.x = 0.78;
        this.zoomS.v = 4.6;
        this.zoomS.to = 1;
        this.cardS.x = 1.016;
        this.cardS.v = -0.6;

        const leftX = box.x - box.w * 0.5 - 8;
        const rightX = box.x + box.w * 0.5 + 8;
        const topY = box.y - box.h * 0.5;
        const botY = box.y + box.h * 0.5;

        puff(leftX, botY - 26, { size: 7.2, n: 4, vx: -16, vy: -8, life: 0.54 });
        puff(rightX, topY + 30, { size: 7.2, n: 4, vx: 16, vy: -8, life: 0.54 });

        const anc = anchorPos || at(this.stage);
        ring(anc.x, anc.y, { rx: 30, ry: 12, life: 0.38, w: 3.4 });

        const pos = this._sfxTopPos(box.x + box.w * 0.28);
        sfx('kachi', pos.x, pos.y, { size: 70, rot: -0.09, life: 0.52, ...hollow() });
      }
    }

    _triggerDayPickFx(cell, iso) {
      const c = at(cell);
      if (c.w <= 0 || c.h <= 0) return;

      this.pickEl = cell;
      this.pickS.x = 0.72;
      this.pickS.v = 11.5;
      this.pickS.to = 1;
      this.cardS.x = 1.01;

      const evs = this._eventsByDate.get(iso) || [];
      const isToday = iso === todayParts().iso;
      const special = evs.length > 0 || isToday;

      // 4-way pink ticks, dust puff, kira glint
      ticks(c.x, c.y, { dir: -0.78, n: 4, r: 15, len: 12, fan: Math.PI / 2, life: 0.38 });
      puff(c.x + 15, c.y + 12, { size: 5.6, n: 3, vx: 15, vy: -9, life: 0.44 });
      kira(c.x + 14, c.y - 13, { r: 9.5, life: 0.5 });

      if (special) {
        const seq = this._seq;
        puff(c.x - 16, c.y + 10, { size: 6.2, n: 4, vx: -16, vy: -12, life: 0.48 });
        later(45, () => {
          if (seq !== this._seq || !this.isConnected) return;
          kira(c.x - 15, c.y - 11, { r: 10.5, life: 0.54 });
        });
      }

      // Hollow カチッ cleanly outside top edge so no calendar numerals are ever covered
      const pos = this._sfxTopPos(c.x);
      sfx('kachi', pos.x, pos.y, { size: 70, rot: -0.09, life: 0.52, ...hollow() });
    }

    _triggerTodayFx(cell) {
      const target = cell && cell.isConnected ? at(cell) : at(this.stage);
      if (cell && cell.isConnected) {
        this.pickEl = cell;
        this.pickS.x = 0.7;
        this.pickS.v = 12;
        this.pickS.to = 1;
      }
      this.todaySq.s.x = Math.min(this.todaySq.s.x, 0.8);
      this.todaySq.s.v += 3.6;
      this.cardS.x = 1.014;

      ring(target.x, target.y, { rx: 28, ry: 11, life: 0.44, w: 3.5 });
      kira(target.x + 15, target.y - 14, { r: 10.5, life: 0.54 });
      const seq = this._seq;
      later(50, () => {
        if (seq !== this._seq || !this.isConnected) return;
        kira(target.x - 15, target.y + 11, { r: 9, life: 0.48 });
      });

      const pos = this._sfxTopPos(target.x);
      sfx('pon', pos.x, pos.y, { size: 72, rot: 0.08, life: 0.56, ...hollow() });
    }

    // ─── Per-Frame Spring Step ───
    frame(dt) {
      if (fx.calm) {
        this.cal.style.transform = '';
        this.stage.style.transform = '';
        this.prevBtn.style.transform = '';
        this.nextBtn.style.transform = '';
        this.zoomBtn.style.transform = '';
        this.todayBtn.style.transform = '';
        if (this.pickEl) this.pickEl.style.transform = '';
        return;
      }

      // If switcher capsule wasn't measurable at setup (e.g. hidden tab), catch it once laid out
      if (this.segCap && !this.segCap.classList.contains('on') && this.segBtns?.[0]?.offsetWidth) {
        this._moveCap(true);
      }

      // Tactile button springs
      this.prevSq.step(dt);
      this.nextSq.step(dt);
      this.zoomSq.step(dt);
      this.todaySq.step(dt);

      // Card subtle punch
      const cs = this.cardS.step(dt);
      const cardStill = Math.abs(cs - 1) < 0.0006 && Math.abs(this.cardS.v) < 0.01;
      this.cal.style.transform = cardStill ? '' : `scale(${(1 / Math.sqrt(cs)).toFixed(4)}, ${cs.toFixed(4)})`;

      // Stage zoom-cut + horizontal slide kick
      const zs = Math.max(0.5, this.zoomS.step(dt));
      const sxOff = this.slideX.step(dt);
      const zoomStill = Math.abs(zs - 1) < 0.0008 && Math.abs(this.zoomS.v) < 0.01;
      const slideStill = Math.abs(sxOff) < 0.08 && Math.abs(this.slideX.v) < 0.2;
      if (zoomStill && slideStill) {
        this.stage.style.transform = '';
      } else {
        const vStr = clamp(this.zoomS.v * 0.014, -0.06, 0.06);
        const hStr = clamp(Math.abs(this.slideX.v) * 0.00025, 0, 0.045);
        const scaleX = zs * (1 - vStr) * (1 + hStr);
        const scaleY = zs * (1 + vStr) / (1 + hStr);
        const skew = clamp(-this.slideX.v * 0.012, -4.5, 4.5);
        this.stage.style.transform = `translateX(${sxOff.toFixed(2)}px) skewX(${skew.toFixed(2)}deg) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
      }

      // Picked cell squash & pop
      if (this.pickEl && this.pickEl.isConnected) {
        const ps = Math.max(0.55, this.pickS.step(dt));
        const px = 1 / Math.sqrt(ps);
        const still = Math.abs(ps - 1) < 0.001 && Math.abs(this.pickS.v) < 0.01;
        this.pickEl.style.transform = still ? '' : `scale(${px.toFixed(4)}, ${ps.toFixed(4)})`;
      }

      // Agenda pills spring entrance
      if (this._pillSprings.length) {
        let anyMoving = false;
        for (const item of this._pillSprings) {
          if (!item.el.isConnected) continue;
          const y = Math.max(0.3, item.sp.step(dt));
          const still = Math.abs(y - item.sp.to) < 0.0015 && Math.abs(item.sp.v) < 0.015;
          if (still && item.sp.to === 1) {
            item.el.style.transform = '';
          } else {
            anyMoving = true;
            const vs = clamp(item.sp.v * 0.012, -0.08, 0.08);
            item.el.style.transform = `scale(${(y * (1 + vs)).toFixed(4)}, ${(y * (1 - vs)).toFixed(4)})`;
          }
        }
        if (!anyMoving) this._pillSprings = [];
      }

      // Mini view switcher sliding capsule
      if (this.segCap?.classList.contains('on')) {
        const x = this.capX.step(dt);
        const bw = Math.max(12, this.capW.step(dt));
        const u = this.capUp.step(dt);
        const pad = 2.5;
        const maxR = Math.max(pad + 12, this.seg.clientWidth - pad);
        const extra = Math.min(20, Math.abs(this.capX.v) * 0.038);

        let left = x - (this.capX.v > 0 ? extra : 0);
        let right = left + bw + extra;
        if (left < pad) left = pad;
        if (right > maxR) right = maxR;
        const w = Math.max(12, right - left);

        const st = w / Math.max(12, bw);
        const vy = (1 / Math.sqrt(st)) * u;
        const hx = 1 + (1 - u) * 0.14;
        const settled = !this._capPending
          && Math.abs(x - this.capX.to) < 0.08 && Math.abs(this.capX.v) < 0.2
          && Math.abs(bw - this.capW.to) < 0.08 && Math.abs(this.capW.v) < 0.2
          && Math.abs(u - 1) < 0.002 && Math.abs(this.capUp.v) < 0.02;

        if (settled) {
          this.segCap.style.width = this.capW.to + 'px';
          this.segCap.style.transform = `translateX(${this.capX.to}px)`;
          this._syncSegLit(this.capX.to, this.capW.to);
        } else {
          this.segCap.style.width = w.toFixed(2) + 'px';
          this.segCap.style.transform = `translateX(${left.toFixed(2)}px) scale(${hx.toFixed(3)}, ${vy.toFixed(3)})`;
          this._syncSegLit(left, w);
        }

        const reached = Math.abs(x - this.capX.to) < 2.5 || (this._capDir > 0 ? x >= this.capX.to - 2.5 : x <= this.capX.to + 2.5);
        if (this._capPending && reached) {
          this._capPending = false;
          this.capUp.x = 0.86;
          this.capUp.v = -1.5;
        }
      }
    }
  }

  fx.define('sakuga-calendar', SakugaCalendar);
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
