// Sakuga DateRange: twin-field manga date-range picker with dual-month desktop / single-month mobile speech-bubble popover,
// quick preset rail, live hover range bridge, max-span guard, and anime key-animated VFX beats.
// Plain crisp ink-bordered capsule at rest with Start -> End dates, span badge pill, optional clear button, and calendar trigger.
// Opening springs out a speech bubble with flanking puffs, corner ticks, and a trigger ring;
// 1st click anchors the start with ticks, puff, and hollow カチッ;
// 2nd click or preset locks the range with twin kira glints, speed-line sweep + crescent slash, braking puffs, and dotted ズザッ (or hollow ポン for 1 day);
// clearing slashes across the capsule with crystal shards.
(() => {
'use strict';

function component(fx) {
  const { Spring, clamp, later, at, esc, squashy, ticks, puff, shards, ring, slash, lines, wob, kira, sfx, hollow, dotted } = fx;

  let uid = 0;
  const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const pad2 = (n) => String(n).padStart(2, '0');

  const ICON_CAL = '<svg class="cal-ico" viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4" width="15" height="13.5" rx="2.6"/><path d="M2.5 8.2h15M6.5 2.2v3.2M13.5 2.2v3.2"/></svg>';
  const ICON_ARR = '<svg class="arr-ico" viewBox="0 0 18 12" aria-hidden="true"><path d="M1.5 6h13.5M11 2l4.5 4L11 10"/></svg>';

  function toDayNum(y, m, d) {
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  }

  function parseISO(str) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(str || '').trim());
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return { y, m: mo, d, iso: `${y}-${pad2(mo)}-${pad2(d)}`, dayNum: toDayNum(y, mo, d) };
  }

  function fromDayNum(n) {
    const dt = new Date(n * 86400000);
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    return { y, m, d, iso: `${y}-${pad2(m)}-${pad2(d)}`, dayNum: n };
  }

  function todayInfo() {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    return { y, m, d, iso: `${y}-${pad2(m)}-${pad2(d)}`, dayNum: toDayNum(y, m, d) };
  }

  function addDaysISO(iso, delta) {
    const p = parseISO(iso);
    return p ? fromDayNum(p.dayNum + delta).iso : '';
  }

  function addMonths(y, m, delta) {
    const total = y * 12 + (m - 1) + delta;
    return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 + 1 };
  }

  function spanDays(isoA, isoB) {
    const a = parseISO(isoA), b = parseISO(isoB);
    if (!a || !b) return 0;
    return Math.abs(b.dayNum - a.dayNum) + 1;
  }

  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  function defaultPresets() {
    const t = todayInfo();
    const monthEnd = daysInMonth(t.y, t.m);
    return [
      { id: 'today', label: 'Today', start: t.iso, end: t.iso },
      { id: '7d', label: 'Last 7d', start: fromDayNum(t.dayNum - 6).iso, end: t.iso },
      { id: '14d', label: 'Last 14d', start: fromDayNum(t.dayNum - 13).iso, end: t.iso },
      { id: '30d', label: 'Last 30d', start: fromDayNum(t.dayNum - 29).iso, end: t.iso },
      { id: 'month', label: 'This Month', start: `${t.y}-${pad2(t.m)}-01`, end: `${t.y}-${pad2(t.m)}-${pad2(monthEnd)}` },
    ];
  }

  class SakugaDateRange extends fx.Base {
    static delegates = true;
    static formAssociated = true;
    static observedAttributes = [
      'start', 'end', 'value', 'min', 'max', 'max-span',
      'presets', 'clearable', 'inline', 'keep-open', 'compact',
      'disabled', 'label', 'placeholder-start', 'placeholder-end',
    ];

    static css = `
      :host {
        display: inline-block;
        width: var(--sk-daterange-width, 340px);
        max-width: 100%;
        isolation: auto;
      }
      :host([inline]) {
        width: auto;
        max-width: 100%;
      }

      /* Twin-field manga trigger capsule */
      .wrap {
        display: flex; align-items: stretch; width: 100%; min-height: 48px;
        border: var(--sk-bw, 3.2px) solid var(--sk-ink);
        border-radius: var(--sk-r, 15px);
        background: var(--sk-card);
        box-shadow: var(--sk-sh);
        will-change: transform;
      }
      :host([inline]) .wrap { display: none; }
      :host([compact]) .wrap {
        min-height: 38px;
        border-radius: calc(var(--sk-r, 15px) - 3px);
        box-shadow: var(--sk-sh-sm, 4px 5px 0 var(--sk-soft));
      }
      .wrap:has(.field:focus-visible) { outline: 2.5px solid var(--sk-acc); outline-offset: 3px; }
      :host([disabled]) .wrap { opacity: .5; }

      .field {
        flex: 1; min-width: 0; display: flex; align-items: center; gap: 5px;
        padding: 0 7px 0 11px; margin: 0; border: 0; background: transparent;
        color: var(--sk-ink); text-align: left; cursor: pointer;
        user-select: none; -webkit-user-select: none; touch-action: manipulation;
        border-radius: calc(var(--sk-r, 15px) - var(--sk-bw, 3.2px)) 0 0 calc(var(--sk-r, 15px) - var(--sk-bw, 3.2px));
        outline: none;
      }
      :host([compact]) .field { padding: 0 5px 0 8px; gap: 4px; }
      .field:disabled { cursor: not-allowed; }

      .d-part {
        min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        font-weight: 800; font-size: 13px; line-height: 1.2; letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
        padding: 2px 0;
        border-bottom: 2px solid transparent;
      }
      :host([compact]) .d-part { font-size: 12px; }
      .d-part.ph { color: var(--sk-dim); font-weight: 700; }
      .d-part.await { border-bottom-color: var(--sk-acc); color: var(--sk-acc); }

      .arr-ico {
        flex: none; width: 15px; height: 10px;
        fill: none; stroke: var(--sk-ink); stroke-width: 2.4;
        stroke-linecap: round; stroke-linejoin: round;
        pointer-events: none;
      }
      :host([compact]) .arr-ico { width: 13px; height: 9px; }
      .wrap.pending .arr-ico { stroke: var(--sk-acc); }

      .badge {
        display: none; align-items: center; justify-content: center;
        flex: none; margin-left: auto;
        padding: 1.5px 7px;
        border: 2px solid var(--sk-ink); border-radius: 999px;
        background: var(--sk-soft); color: var(--sk-ink);
        font: italic 900 11px/1.25 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        will-change: transform;
      }
      .badge.on { display: inline-flex; }
      :host([compact]) .badge { padding: 1px 5.5px; font-size: 10px; }

      .clr {
        flex: none; align-self: center; display: none; place-items: center;
        width: 22px; height: 22px; margin-right: 6px; padding: 0;
        border: 2px solid var(--sk-ink); border-radius: 7px;
        background: var(--sk-card); color: var(--sk-ink);
        font-size: 14px; font-weight: 900; line-height: 1; cursor: pointer;
        user-select: none; -webkit-user-select: none; touch-action: manipulation;
      }
      .clr.on { display: grid; }
      .clr:hover:not(:disabled) { background: var(--sk-acc); color: var(--sk-on-pri, #fff); }
      .clr:disabled { cursor: not-allowed; }
      :host([compact]) .clr { width: 19px; height: 19px; margin-right: 4px; border-radius: 6px; font-size: 12px; }

      .trig {
        flex: none; display: grid; place-items: center; width: 42px; padding: 0; margin: 0; border: 0;
        border-left: 2px solid var(--sk-ink);
        border-radius: 0 calc(var(--sk-r, 15px) - var(--sk-bw, 3.2px)) calc(var(--sk-r, 15px) - var(--sk-bw, 3.2px)) 0;
        background: transparent; color: var(--sk-ink); cursor: pointer;
        user-select: none; -webkit-user-select: none; touch-action: manipulation;
        will-change: transform;
      }
      :host([compact]) .trig {
        width: 34px;
        border-radius: 0 calc(var(--sk-r, 15px) - var(--sk-bw, 3.2px) - 3px) calc(var(--sk-r, 15px) - var(--sk-bw, 3.2px) - 3px) 0;
      }
      .wrap.open .trig,
      .trig:hover:not(:disabled) { background: color-mix(in srgb, var(--sk-soft) 24%, var(--sk-card)); }
      .trig:disabled { cursor: not-allowed; }
      .cal-ico {
        width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.2;
        stroke-linecap: round; stroke-linejoin: round; pointer-events: none;
      }
      :host([compact]) .cal-ico { width: 15px; height: 15px; }

      /* Manga speech-bubble popover & inline surface */
      .pop {
        position: fixed; top: 0; left: 0; z-index: 2147482000;
        max-width: calc(100vw - 16px);
        border: var(--sk-bw, 3.2px) solid var(--sk-ink);
        border-radius: 16px;
        background: var(--sk-card);
        box-shadow: var(--sk-sh);
        color: var(--sk-ink);
        visibility: hidden; pointer-events: none;
        transform: scale(0);
        will-change: transform;
      }
      .pop.open { visibility: visible; pointer-events: auto; transform: none; }
      .pop.closing { visibility: visible; pointer-events: none; }

      :host([inline]) .pop {
        position: relative; top: auto; left: auto; z-index: auto;
        display: block; max-width: 100%;
        visibility: visible; pointer-events: auto;
        transform: none;
      }
      :host([inline][disabled]) .pop { opacity: .55; pointer-events: none; }

      .pop:not(.inline-mode).below::after {
        content: ""; position: absolute; left: var(--tail-x, 82%); bottom: 100%; margin-left: -9px;
        border: 9px solid transparent; border-bottom: 11px solid var(--sk-ink);
      }
      .pop:not(.inline-mode).below::before {
        content: ""; position: absolute; left: var(--tail-x, 82%); bottom: calc(100% - 4.2px); margin-left: -6px;
        border: 6px solid transparent; border-bottom: 8px solid var(--sk-card); z-index: 1;
      }
      .pop:not(.inline-mode).above::after {
        content: ""; position: absolute; left: var(--tail-x, 82%); top: 100%; margin-left: -9px;
        border: 9px solid transparent; border-top: 11px solid var(--sk-ink);
      }
      .pop:not(.inline-mode).above::before {
        content: ""; position: absolute; left: var(--tail-x, 82%); top: calc(100% - 4.2px); margin-left: -6px;
        border: 6px solid transparent; border-top: 8px solid var(--sk-card); z-index: 1;
      }

      /* Layout inside popover: optional left preset rail + calendar body */
      .body {
        display: flex; align-items: stretch;
      }
      .pop.mobile .body {
        flex-direction: column;
      }

      .rail {
        flex: none; width: 112px;
        display: flex; flex-direction: column; gap: 6px;
        padding: 12px 10px;
        border-right: 2px solid var(--sk-ink);
        background: color-mix(in srgb, var(--sk-soft) 14%, var(--sk-card));
        border-radius: 12px 0 0 12px;
      }
      .rail-lbl {
        font: italic 900 10.5px/1.1 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        letter-spacing: 0.06em; text-transform: uppercase;
        color: var(--sk-dim); margin: 0 0 2px 2px;
      }
      .preset {
        display: flex; align-items: center; justify-content: space-between; gap: 4px;
        width: 100%; padding: 6px 8px;
        border: 2px solid var(--sk-ink); border-radius: 9px;
        background: var(--sk-card); color: var(--sk-ink);
        box-shadow: 2px 2px 0 var(--sk-soft);
        font-size: 12px; font-weight: 800; line-height: 1.15; text-align: left;
        cursor: pointer; user-select: none; white-space: nowrap;
        will-change: transform;
      }
      .preset:hover:not(:disabled) {
        background: color-mix(in srgb, var(--sk-soft) 28%, var(--sk-card));
      }
      .preset.active {
        background: var(--sk-ink); color: var(--sk-card);
        box-shadow: 2px 2px 0 var(--sk-acc);
      }
      .preset.over {
        border-style: dashed; color: var(--sk-dim);
      }

      .pop.mobile .rail {
        width: auto; flex-direction: row; flex-wrap: wrap; gap: 5px;
        padding: 9px 10px;
        border-right: 0; border-bottom: 2px solid var(--sk-ink);
        border-radius: 12px 12px 0 0;
      }
      .pop.mobile .rail-lbl { display: none; }
      .pop.mobile .preset {
        width: auto; flex: 0 1 auto; padding: 4px 8px; font-size: 11.5px;
      }

      /* Calendar stage */
      .cal {
        flex: 1; min-width: 0; padding: 12px;
        overflow: hidden;
      }
      .pop.mobile .cal { padding: 10px; }

      .head {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
        margin-bottom: 10px; padding-bottom: 8px;
        border-bottom: 2px solid var(--sk-ink);
      }
      .titles {
        flex: 1; min-width: 0;
        display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
        text-align: center;
      }
      .pop.mobile .titles { grid-template-columns: 1fr; gap: 0; }
      .mtitle {
        font: italic 900 15px/1.15 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        font-variant-numeric: tabular-nums; letter-spacing: -0.01em;
        color: var(--sk-ink); white-space: nowrap;
      }

      .nav {
        flex: none; display: grid; place-items: center;
        width: 30px; height: 30px; padding: 0;
        border: 2px solid var(--sk-ink); border-radius: 9px;
        background: var(--sk-card); color: var(--sk-ink);
        box-shadow: 2px 2px 0 var(--sk-soft);
        font-size: 17px; font-weight: 900; line-height: 1;
        cursor: pointer; user-select: none; will-change: transform;
      }
      .nav:hover { background: color-mix(in srgb, var(--sk-soft) 24%, var(--sk-card)); }

      .months {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;
        will-change: transform;
      }
      .pop.mobile .months { grid-template-columns: 1fr; gap: 0; }
      .month { min-width: 0; }

      .wk {
        display: grid; grid-template-columns: repeat(7, 1fr);
        margin-bottom: 4px; text-align: center;
      }
      .wk span {
        font-size: 11px; font-weight: 800; color: var(--sk-dim); padding: 2px 0;
        user-select: none;
      }

      .grid {
        display: grid; grid-template-columns: repeat(7, 1fr);
        column-gap: 0; row-gap: 3px;
      }
      .pad { height: 32px; pointer-events: none; }

      .cell {
        position: relative; display: grid; place-items: center;
        width: 100%; min-width: 31px; height: 32px; padding: 0; margin: 0;
        border: 2px solid transparent; border-radius: 9px;
        background: transparent; color: var(--sk-ink);
        font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums;
        cursor: pointer; user-select: none; touch-action: manipulation;
        will-change: transform;
      }
      .pop.mobile .cell { min-width: 34px; height: 34px; font-size: 13.5px; }

      .cell:hover:not(:disabled):not(.start):not(.end) {
        border-color: var(--sk-ink);
        background: color-mix(in srgb, var(--sk-soft) 22%, var(--sk-card));
        z-index: 2;
      }
      .cell.today:not(.start):not(.end) {
        border-color: var(--sk-acc); font-weight: 900;
      }
      .cell.today:not(.start):not(.end)::before {
        content: ""; position: absolute; bottom: 2.5px; left: 50%;
        width: 4px; height: 4px; margin-left: -2px;
        border-radius: 999px; background: var(--sk-acc);
      }

      .cell.dis {
        color: var(--sk-track); cursor: not-allowed; font-weight: 600;
      }

      /* Flat cel-shaded range ribbon */
      .cell.in-range {
        background: var(--sk-soft);
        color: var(--sk-ink);
        font-weight: 800;
        border-top: 2px solid var(--sk-ink);
        border-bottom: 2px solid var(--sk-ink);
        border-left-color: transparent;
        border-right-color: transparent;
        border-radius: 0;
      }
      .cell.in-range.row-l {
        border-left: 2px solid var(--sk-ink);
        border-top-left-radius: 7px; border-bottom-left-radius: 7px;
      }
      .cell.in-range.row-r {
        border-right: 2px solid var(--sk-ink);
        border-top-right-radius: 7px; border-bottom-right-radius: 7px;
      }

      /* Live hover preview bridge */
      .cell.preview {
        background: color-mix(in srgb, var(--sk-soft) 36%, var(--sk-card));
        color: var(--sk-ink);
        font-weight: 800;
        border-top: 2px dashed var(--sk-ink);
        border-bottom: 2px dashed var(--sk-ink);
        border-left-color: transparent;
        border-right-color: transparent;
        border-radius: 0;
      }
      .cell.preview.row-l {
        border-left: 2px dashed var(--sk-ink);
        border-top-left-radius: 7px; border-bottom-left-radius: 7px;
      }
      .cell.preview.row-r {
        border-right: 2px dashed var(--sk-ink);
        border-top-right-radius: 7px; border-bottom-right-radius: 7px;
      }
      .cell.preview-end {
        background: var(--sk-pri);
        color: var(--sk-on-pri, #fff);
        border: 2px solid var(--sk-ink);
        font-weight: 900;
        z-index: 2;
      }
      .cell.preview-end.cap-l { border-radius: 9px 0 0 9px; }
      .cell.preview-end.cap-r { border-radius: 0 9px 9px 0; }
      .cell.preview-end.cap-both { border-radius: 9px; }

      /* Over max-span warning preview */
      .cell.preview-over {
        background: color-mix(in srgb, var(--sk-acc) 18%, var(--sk-card));
        border-top-color: var(--sk-acc);
        border-bottom-color: var(--sk-acc);
      }
      .cell.preview-over.row-l { border-left-color: var(--sk-acc); }
      .cell.preview-over.row-r { border-right-color: var(--sk-acc); }
      .cell.preview-end.preview-over {
        background: var(--sk-acc);
        color: var(--sk-on-pri, #fff);
        border-color: var(--sk-ink);
      }

      /* Locked Start & End caps */
      .cell.start, .cell.end {
        background: var(--sk-ink);
        color: var(--sk-card);
        border: 2px solid var(--sk-ink);
        font-weight: 900;
        z-index: 3;
      }
      .cell.start::after, .cell.end::after {
        content: ""; position: absolute; top: 3px; right: 3px;
        width: 5px; height: 5px; border-radius: 1.5px;
        background: var(--sk-acc);
        pointer-events: none;
      }
      .cell.start.has-span {
        border-radius: 9px 0 0 9px;
      }
      .cell.end.has-span {
        border-radius: 0 9px 9px 0;
      }
      .cell.start.end, .cell.start.single, .cell.end.single,
      .cell.start.has-span.row-r, .cell.end.has-span.row-l {
        border-radius: 9px;
        box-shadow: 2px 3px 0 var(--sk-soft);
      }

      /* Footer readout bar */
      .foot {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
        margin-top: 10px; padding-top: 8px;
        border-top: 2px solid var(--sk-ink);
        min-height: 30px;
      }
      .foot-readout {
        min-width: 0; flex: 1;
        font-size: 12px; font-weight: 800; line-height: 1.25;
        font-variant-numeric: tabular-nums;
        color: var(--sk-ink);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .foot-readout.mute { color: var(--sk-dim); font-weight: 700; }
      .foot-readout.warn { color: var(--sk-acc); }

      .foot-actions {
        flex: none; display: flex; align-items: center; gap: 6px;
      }
      .foot-pill {
        padding: 2px 7px;
        border: 1.8px solid var(--sk-ink); border-radius: 999px;
        background: color-mix(in srgb, var(--sk-soft) 24%, var(--sk-card));
        color: var(--sk-ink);
        font: italic 900 10.5px/1.2 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        font-variant-numeric: tabular-nums;
      }
      .foot-btn {
        padding: 3.5px 9px;
        border: 2px solid var(--sk-ink); border-radius: 8px;
        background: var(--sk-card); color: var(--sk-ink);
        box-shadow: 2px 2px 0 var(--sk-soft);
        font-size: 11.5px; font-weight: 800; line-height: 1.15;
        cursor: pointer; user-select: none;
      }
      .foot-btn:hover { background: var(--sk-acc); color: var(--sk-on-pri, #fff); }
    `;

    constructor() {
      super();
      this._uid = ++uid;
      this._start = '';
      this._end = '';
      this._pendingStart = '';
      this._hoverDate = '';
      this._focusDate = '';
      this._customPresets = null;
      this._presetsEnabled = true;
      this.isOpen = false;
      this.isBelow = true;
      this.isMobile = false;
      this._seq = 0;
      this._docBound = false;
      this._ro = null;
      this._popRect = null;
      this.pickEl = null;
      this.anchorEl = null;
      this.presetEl = null;
      this.monthsEl = null;

      const t = todayInfo();
      this.viewY = t.y;
      this.viewM = t.m;
    }

    get start() { return this._start; }
    set start(v) {
      const p = parseISO(v);
      const iso = p ? p.iso : '';
      if (iso === this._start) return;
      this._start = iso;
      if (this._start && this._end && this._start > this._end) {
        [this._start, this._end] = [this._end, this._start];
      }
      this._pendingStart = '';
      this._hoverDate = '';
      this._afterStateChange(false);
    }

    get end() { return this._end; }
    set end(v) {
      const p = parseISO(v);
      const iso = p ? p.iso : '';
      if (iso === this._end) return;
      this._end = iso;
      if (this._start && this._end && this._start > this._end) {
        [this._start, this._end] = [this._end, this._start];
      }
      this._pendingStart = '';
      this._hoverDate = '';
      this._afterStateChange(false);
    }

    get value() {
      return this._start && this._end ? `${this._start}..${this._end}` : '';
    }
    set value(v) {
      this._applyValueString(v);
      this._afterStateChange(false);
    }

    get days() {
      return this._start && this._end ? spanDays(this._start, this._end) : 0;
    }

    get min() {
      const p = parseISO(this.getAttribute('min'));
      return p ? p.iso : '';
    }
    set min(v) {
      if (v) this.setAttribute('min', String(v));
      else this.removeAttribute('min');
    }

    get max() {
      const p = parseISO(this.getAttribute('max'));
      return p ? p.iso : '';
    }
    set max(v) {
      if (v) this.setAttribute('max', String(v));
      else this.removeAttribute('max');
    }

    get maxSpan() {
      const raw = this.getAttribute('max-span');
      if (raw == null || raw === '') return null;
      const n = Math.trunc(Number(raw));
      return Number.isFinite(n) && n >= 1 ? n : null;
    }
    set maxSpan(v) {
      if (v == null || v === '' || Number(v) < 1) this.removeAttribute('max-span');
      else this.setAttribute('max-span', String(Math.trunc(Number(v))));
    }

    get presets() {
      if (!this._presetsEnabled) return false;
      return this._customPresets ? this._customPresets.map((p) => ({ ...p })) : true;
    }
    set presets(v) {
      if (Array.isArray(v)) {
        this._customPresets = v.map((item, i) => ({
          id: item.id || `p${i}`,
          label: String(item.label ?? `Preset ${i + 1}`),
          start: item.start ? String(item.start) : '',
          end: item.end ? String(item.end) : '',
          days: Number.isFinite(Number(item.days)) ? Math.trunc(Number(item.days)) : null,
          range: typeof item.range === 'function' ? item.range : null,
        }));
        this._presetsEnabled = this._customPresets.length > 0;
      } else if (v === false || v === 'false' || v === '0' || v === 'off' || v === 'none') {
        this._customPresets = null;
        this._presetsEnabled = false;
        this.setAttribute('presets', 'false');
      } else {
        this._customPresets = null;
        this._presetsEnabled = true;
        if (this.getAttribute('presets') === 'false') this.removeAttribute('presets');
      }
      if (this.ready && (this.isOpen || this.inline)) {
        this._renderPop();
        if (!this.inline) this._placePop();
      }
    }

    get clearable() { return this.hasAttribute('clearable'); }
    set clearable(v) { this.toggleAttribute('clearable', !!v); }

    get inline() { return this.hasAttribute('inline'); }
    set inline(v) { this.toggleAttribute('inline', !!v); }

    get keepOpen() { return this.hasAttribute('keep-open'); }
    set keepOpen(v) { this.toggleAttribute('keep-open', !!v); }

    get compact() { return this.hasAttribute('compact'); }
    set compact(v) { this.toggleAttribute('compact', !!v); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get open() { return this.inline || !!this.isOpen; }

    attributeChangedCallback(name, _, v) {
      if (name === 'presets') {
        const s = String(v ?? '').trim().toLowerCase();
        if (s === 'false' || s === '0' || s === 'off' || s === 'none') {
          this._presetsEnabled = false;
          this._customPresets = null;
        } else {
          this._presetsEnabled = true;
          if (s && s !== 'true' && s !== 'on' && s !== '1') {
            this._customPresets = this._parsePresetAttr(s);
          } else {
            this._customPresets = null;
          }
        }
      }
      if (!this.ready) return;

      if (name === 'value') {
        this._applyValueString(v);
        this._afterStateChange(false);
      } else if (name === 'start') {
        const p = parseISO(v);
        this._start = p ? p.iso : '';
        if (this._start && this._end && this._start > this._end) [this._start, this._end] = [this._end, this._start];
        this._pendingStart = '';
        this._afterStateChange(false);
      } else if (name === 'end') {
        const p = parseISO(v);
        this._end = p ? p.iso : '';
        if (this._start && this._end && this._start > this._end) [this._start, this._end] = [this._end, this._start];
        this._pendingStart = '';
        this._afterStateChange(false);
      } else if (name === 'min' || name === 'max' || name === 'max-span' || name === 'presets') {
        if (this.isOpen || this.inline) {
          this._renderPop();
          if (!this.inline) this._placePop();
        }
      } else if (name === 'clearable' || name === 'placeholder-start' || name === 'placeholder-end') {
        this._syncTrigger();
        if (this.isOpen || this.inline) this._renderPop();
      } else if (name === 'label') {
        const lbl = v || 'Date range';
        this.field.setAttribute('aria-label', lbl);
        this.pop.setAttribute('aria-label', lbl);
      } else if (name === 'disabled') {
        this._syncDisabled();
        if (this.disabled && this.isOpen && !this.inline) this.hide();
      } else if (name === 'inline') {
        this._syncInlineMode();
      }
    }

    formResetCallback() {
      this._readInitialRange();
      this._pendingStart = '';
      this._hoverDate = '';
      this._afterStateChange(false);
    }

    _parsePresetAttr(raw) {
      const defaults = defaultPresets();
      const map = new Map(defaults.map((p) => [p.id, p]));
      const out = [];
      for (const tok of raw.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)) {
        if (map.has(tok)) {
          out.push(map.get(tok));
        } else {
          const m = /^(\d+)d$/.exec(tok);
          if (m && +m[1] >= 1) out.push({ id: tok, label: `Last ${+m[1]}d`, days: +m[1] });
        }
      }
      return out.length ? out : null;
    }

    _resolvePresets() {
      if (!this._presetsEnabled) return [];
      const base = this._customPresets || defaultPresets();
      const t = todayInfo();
      return base.map((p) => {
        if (p.range) {
          const res = p.range(t.iso);
          const s = parseISO(res?.[0])?.iso || '';
          const e = parseISO(res?.[1])?.iso || '';
          return { id: p.id, label: p.label, start: s, end: e };
        }
        if (p.days != null && p.days >= 1) {
          return { id: p.id, label: p.label, start: fromDayNum(t.dayNum - (p.days - 1)).iso, end: t.iso };
        }
        return { id: p.id, label: p.label, start: parseISO(p.start)?.iso || '', end: parseISO(p.end)?.iso || '' };
      }).filter((p) => p.start && p.end);
    }

    _applyValueString(v) {
      const raw = String(v ?? '').trim();
      if (!raw) {
        this._start = '';
        this._end = '';
        this._pendingStart = '';
        this._hoverDate = '';
        return;
      }
      const parts = raw.split(/\.\.|,|~|→|\s+to\s+/i).map((s) => s.trim()).filter(Boolean);
      const a = parseISO(parts[0]);
      const b = parseISO(parts[1] || parts[0]);
      if (a && b) {
        this._start = a.iso <= b.iso ? a.iso : b.iso;
        this._end = a.iso <= b.iso ? b.iso : a.iso;
        this._pendingStart = '';
        this._hoverDate = '';
      }
    }

    _readInitialRange() {
      if (this.hasAttribute('value') && this.getAttribute('value')) {
        this._applyValueString(this.getAttribute('value'));
      } else {
        const s = parseISO(this.getAttribute('start'));
        const e = parseISO(this.getAttribute('end'));
        this._start = s ? s.iso : '';
        this._end = e ? e.iso : '';
        if (this._start && this._end && this._start > this._end) {
          [this._start, this._end] = [this._end, this._start];
        }
      }
    }

    _isDateDisabled(iso) {
      const mn = this.min, mx = this.max;
      if (mn && iso < mn) return true;
      if (mx && iso > mx) return true;
      return false;
    }

    _validateRange(isoA, isoB) {
      const a = parseISO(isoA), b = parseISO(isoB);
      if (!a || !b) return { ok: false, reason: 'invalid' };
      const s = a.iso <= b.iso ? a.iso : b.iso;
      const e = a.iso <= b.iso ? b.iso : a.iso;
      const mn = this.min, mx = this.max, ms = this.maxSpan;
      if (mn && s < mn) return { ok: false, reason: 'min', date: s, min: mn, max: mx, days: spanDays(s, e), maxSpan: ms };
      if (mx && e > mx) return { ok: false, reason: 'max', date: e, min: mn, max: mx, days: spanDays(s, e), maxSpan: ms };
      const days = spanDays(s, e);
      if (ms && days > ms) return { ok: false, reason: 'max-span', date: isoB, min: mn, max: mx, days, maxSpan: ms };
      return { ok: true, start: s, end: e, days };
    }

    _isMobileLayout() {
      if (window.innerWidth < 620) return true;
      if (this.inline) {
        const parentW = this.parentElement?.clientWidth || window.innerWidth;
        if (parentW < 540) return true;
      }
      return false;
    }

    _syncViewToDate(iso) {
      const p = parseISO(iso);
      if (!p) {
        const t = todayInfo();
        this.viewY = t.y;
        this.viewM = t.m;
        return;
      }
      this.viewY = p.y;
      this.viewM = p.m;
    }

    _ensureRangeVisible(startISO, endISO) {
      const s = parseISO(startISO), e = parseISO(endISO);
      if (!s || !e) return;
      const mobile = this._isMobileLayout();
      if (mobile) {
        this.viewY = e.y;
        this.viewM = e.m;
      } else {
        const next = addMonths(s.y, s.m, 1);
        const startVisible = (s.y === this.viewY && s.m === this.viewM)
          || (s.y === addMonths(this.viewY, this.viewM, 1).y && s.m === addMonths(this.viewY, this.viewM, 1).m);
        const endVisible = (e.y === this.viewY && e.m === this.viewM)
          || (e.y === addMonths(this.viewY, this.viewM, 1).y && e.m === addMonths(this.viewY, this.viewM, 1).m);
        if (startVisible && endVisible) return;
        if (e.y === next.y && e.m === next.m) {
          this.viewY = s.y; this.viewM = s.m;
        } else {
          const prev = addMonths(e.y, e.m, -1);
          if (s.y === e.y && s.m === e.m) {
            this.viewY = s.y; this.viewM = s.m;
          } else {
            this.viewY = prev.y; this.viewM = prev.m;
          }
        }
      }
    }

    _afterStateChange(emitEvent) {
      this.internals?.setFormValue(this.value);
      this._syncViewToDate(this._start || this._end);
      if (this.ready) {
        this._syncTrigger();
        if (this.isOpen || this.inline) this._renderPop();
      }
      if (emitEvent) {
        this.emit('change', {
          start: this._start,
          end: this._end,
          days: this.days,
          value: this.value,
        });
      }
    }

    setRange(start, end, silent = false) {
      if (!start && !end) {
        this.clear(silent);
        return true;
      }
      const check = this._validateRange(start, end || start);
      if (!check.ok) {
        if (!silent) this._reject(check, null);
        return false;
      }
      const changed = check.start !== this._start || check.end !== this._end;
      this._start = check.start;
      this._end = check.end;
      this._pendingStart = '';
      this._hoverDate = '';
      this._focusDate = check.end;
      this.internals?.setFormValue(this.value);
      this._ensureRangeVisible(check.start, check.end);
      if (this.ready) {
        this._syncTrigger(true);
        if (this.isOpen || this.inline) this._renderPop();
      }
      if (!silent && changed) {
        this.emit('change', {
          start: this._start,
          end: this._end,
          days: check.days,
          value: this.value,
        });
      }
      return true;
    }

    clear(silent = false) {
      if (this.disabled && !silent) return;
      const hadRange = !!(this._start || this._end || this._pendingStart);
      this._start = '';
      this._end = '';
      this._pendingStart = '';
      this._hoverDate = '';
      this.internals?.setFormValue('');
      if (this.ready) {
        this._syncTrigger();
        if (this.isOpen || this.inline) this._syncCellClasses();
      }
      if (hadRange) {
        if (!silent) {
          this.emit('change', { start: '', end: '', days: 0, value: '' });
        }
        if (!fx.calm && this.ready) {
          const targetEl = this.inline ? (this.pop.querySelector('.foot-readout') || this.pop) : this.field;
          const v = at(targetEl, 0.48, 0.5);
          slash(v.x, v.y, { len: Math.min(165, Math.max(85, v.w * 0.78)), ang: -0.18, life: 0.38, thick: 12 });
          shards(v.x + 18, v.y, { n: 6, speed: 155, size: 4, life: 0.52, dir: -0.45, arc: 1.5 });
          puff(v.x - 10, v.y + 4, { size: 6, n: 3, vx: -16, vy: -10, life: 0.44 });
          if (this.inline) {
            this.popShakeX.x = -7;
            this.popShakeX.v = -40;
            this.popShakeX.to = 0;
          } else {
            this.wrapX.x = -6.5;
            this.wrapX.v = -28;
            this.wrapX.to = 0;
            this.wrapSq.x = 0.93;
            this.wrapSq.to = 1;
          }
        }
      }
    }

    render() {
      const lbl = esc(this.getAttribute('label') || 'Date range');
      const popId = `sk-dr-pop-${this._uid}`;
      const dis = this.disabled ? ' disabled' : '';
      return `
        <div class="wrap" part="box">
          <button type="button" class="field" part="trigger"
            aria-haspopup="dialog" aria-expanded="false" aria-controls="${popId}"
            aria-label="${lbl}"${dis}>
            <span class="d-part d-start ph"></span>
            ${ICON_ARR}
            <span class="d-part d-end ph"></span>
            <span class="badge" part="badge" aria-hidden="true"></span>
          </button>
          <button type="button" class="clr" part="clear" aria-label="Clear date range"${dis}>×</button>
          <button type="button" class="trig" part="calendar-button" tabindex="-1" aria-hidden="true"${dis}>${ICON_CAL}</button>
        </div>
        <div class="pop below" id="${popId}" role="dialog" aria-label="${lbl}" part="popover"></div>`;
    }

    setup() {
      this.wrap = this.$('.wrap');
      this.field = this.$('.field');
      this.startEl = this.$('.d-start');
      this.endEl = this.$('.d-end');
      this.badgeEl = this.$('.badge');
      this.clrBtn = this.$('.clr');
      this.trig = this.$('.trig');
      this.pop = this.$('.pop');

      this.wrapSq = new Spring(1, 560, 16);
      this.wrapX = new Spring(0, 520, 18);
      this.badgeS = new Spring(1, 540, 14);
      this.trigSq = squashy(this.trig, { low: 0.78, wide: 0.3 });
      this.popS = new Spring(0, 500, 22);
      this.popShakeX = new Spring(0, 620, 15);
      this.pickS = new Spring(1, 520, 14);
      this.anchorS = new Spring(1, 520, 15);
      this.presetS = new Spring(1, 540, 15);
      this.gridX = new Spring(0, 460, 20);

      // Apply presets attribute before initial render
      if (this.hasAttribute('presets')) {
        const s = String(this.getAttribute('presets') ?? '').trim().toLowerCase();
        if (s === 'false' || s === '0' || s === 'off' || s === 'none') this._presetsEnabled = false;
        else if (s && s !== 'true' && s !== 'on' && s !== '1') this._customPresets = this._parsePresetAttr(s);
      }

      this._readInitialRange();
      this.internals?.setFormValue(this.value);
      this._syncViewToDate(this._start || this._end);
      this._syncDisabled();
      this._syncTrigger();
      this._syncInlineMode();

      this._onDocDown = (e) => {
        if (!this.isOpen || this.inline) return;
        const path = e.composedPath ? e.composedPath() : [];
        if (!path.includes(this)) this.hide();
      };
      this._onDocKey = (e) => {
        if (this.isOpen && !this.inline && e.key === 'Escape') {
          e.preventDefault();
          this.hide(true);
        }
      };
      this._onReposition = () => {
        const wasMobile = this.isMobile;
        const nowMobile = this._isMobileLayout();
        if (this.inline) {
          if (wasMobile !== nowMobile) this._renderPop();
          return;
        }
        if (!this.isOpen) return;
        if (wasMobile !== nowMobile) this._renderPop();
        this._placePop();
      };

      this.field.addEventListener('pointerdown', () => { if (!this.disabled && !fx.calm) this.wrapSq.to = 0.93; });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) {
        this.field.addEventListener(ev, () => { this.wrapSq.to = 1; });
      }
      this.field.addEventListener('click', () => this.toggle());
      this.trig.addEventListener('click', () => {
        this.toggle();
        if (!this.isOpen) this.field.focus({ preventScroll: true });
      });
      this.clrBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clear();
        this.field.focus({ preventScroll: true });
      });

      this.field.addEventListener('keydown', (e) => this._onFieldKey(e));
      this.pop.addEventListener('click', (e) => this._onPopClick(e));
      this.pop.addEventListener('keydown', (e) => this._onPopKey(e));
      this.pop.addEventListener('pointerover', (e) => this._onPopHover(e));
      this.pop.addEventListener('pointerleave', () => {
        if (this._pendingStart && this._hoverDate) {
          this._hoverDate = '';
          this._syncCellClasses();
        }
      });
    }

    connectedCallback() {
      super.connectedCallback();
      if (this.ready && this.inline) this._syncInlineMode();
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this._bindDoc(false);
      this._ro?.disconnect();
      this._ro = null;
    }

    _syncInlineMode() {
      if (this.inline) {
        this.isOpen = false;
        this._bindDoc(false);
        this.pop.classList.remove('closing', 'below', 'above');
        this.pop.classList.add('inline-mode', 'open');
        this.pop.removeAttribute('role');
        this.pop.setAttribute('role', 'group');
        this.pop.style.left = '';
        this.pop.style.top = '';
        this.pop.style.width = '';
        this.pop.style.transform = '';
        this._renderPop();
        if (!this._ro && typeof ResizeObserver !== 'undefined') {
          this._ro = new ResizeObserver(() => {
            if (!this.inline) return;
            const nowM = this._isMobileLayout();
            if (nowM !== this.isMobile) this._renderPop();
          });
          this._ro.observe(this);
          window.addEventListener('resize', this._onReposition);
        }
      } else {
        this._ro?.disconnect();
        this._ro = null;
        window.removeEventListener('resize', this._onReposition);
        this.pop.classList.remove('inline-mode', 'open', 'closing');
        this.pop.setAttribute('role', 'dialog');
        this.pop.style.transform = 'scale(0)';
      }
    }

    _syncDisabled() {
      const dis = this.disabled;
      this.field.disabled = dis;
      this.trig.disabled = dis;
      this.clrBtn.disabled = dis;
    }

    _syncTrigger(popBadge = false) {
      const phS = this.getAttribute('placeholder-start') || 'Start date';
      const phE = this.getAttribute('placeholder-end') || 'End date';

      const showStart = this._pendingStart || this._start;
      const showEnd = this._pendingStart ? '' : this._end;

      this.startEl.textContent = showStart || phS;
      this.startEl.classList.toggle('ph', !showStart);

      this.endEl.textContent = showEnd || (this._pendingStart ? 'End date' : phE);
      this.endEl.classList.toggle('ph', !showEnd);
      this.endEl.classList.toggle('await', !!this._pendingStart);
      this.wrap.classList.toggle('pending', !!this._pendingStart);

      const d = !this._pendingStart && this._start && this._end ? spanDays(this._start, this._end) : 0;
      if (d > 0) {
        this.badgeEl.textContent = `${d}d`;
        this.badgeEl.classList.add('on');
        if (popBadge && !fx.calm) {
          this.badgeS.x = 0.25;
          this.badgeS.v = 15;
          this.badgeS.to = 1;
        }
      } else {
        this.badgeEl.classList.remove('on');
      }

      this.clrBtn.classList.toggle('on', this.clearable && !!(this._start || this._end) && !this.disabled);
    }

    _renderMonth(y, m) {
      const first = new Date(Date.UTC(y, m - 1, 1));
      const startOff = (first.getUTCDay() + 6) % 7; // Monday = 0
      const total = daysInMonth(y, m);
      const today = todayInfo().iso;

      const cells = [];
      for (let i = 0; i < startOff; i++) cells.push('<span class="pad" aria-hidden="true"></span>');
      for (let d = 1; d <= total; d++) {
        const col = (startOff + d - 1) % 7;
        const iso = `${y}-${pad2(m)}-${pad2(d)}`;
        const dis = this._isDateDisabled(iso);
        const isToday = iso === today;
        const cls = `cell${isToday ? ' today' : ''}${dis ? ' dis' : ''}`;
        cells.push(`<button type="button" class="${cls}" data-date="${iso}" data-col="${col}" data-first="${d === 1 ? 1 : 0}" data-last="${d === total ? 1 : 0}"${dis ? ' disabled aria-disabled="true"' : ''} aria-label="${MONTHS[m - 1]} ${d}, ${y}" tabindex="-1">${d}</button>`);
      }
      return `
        <div class="month">
          <div class="wk">${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}</div>
          <div class="grid" role="grid" aria-label="${MONTHS[m - 1]} ${y}">${cells.join('')}</div>
        </div>`;
    }

    _renderPop() {
      this.isMobile = this._isMobileLayout();
      this.pop.classList.toggle('mobile', this.isMobile);
      this.pickEl = null;
      this.anchorEl = null;
      this.presetEl = null;

      const nextM = addMonths(this.viewY, this.viewM, 1);
      const presets = this._resolvePresets();
      const maxS = this.maxSpan;

      let railHtml = '';
      if (presets.length) {
        const items = presets.map((p) => {
          const v = this._validateRange(p.start, p.end);
          const active = !this._pendingStart && this._start === p.start && this._end === p.end;
          const over = !v.ok;
          return `<button type="button" class="preset${active ? ' active' : ''}${over ? ' over' : ''}" data-preset-start="${p.start}" data-preset-end="${p.end}" data-preset-id="${esc(p.id)}">${esc(p.label)}</button>`;
        }).join('');
        railHtml = `<div class="rail" part="presets"><div class="rail-lbl">Presets</div>${items}</div>`;
      }

      const titlesHtml = this.isMobile
        ? `<span class="mtitle">${MONTHS[this.viewM - 1]} ${this.viewY}</span>`
        : `<span class="mtitle">${MONTHS[this.viewM - 1]} ${this.viewY}</span><span class="mtitle">${MONTHS[nextM.m - 1]} ${nextM.y}</span>`;

      const monthsHtml = this.isMobile
        ? this._renderMonth(this.viewY, this.viewM)
        : this._renderMonth(this.viewY, this.viewM) + this._renderMonth(nextM.y, nextM.m);

      const pillHtml = maxS ? `<span class="foot-pill">max ${maxS}d</span>` : '';
      const clearBtnHtml = this.clearable ? `<button type="button" class="foot-btn" data-clear="1">Clear</button>` : '';

      this.pop.innerHTML = `
        <div class="body">
          ${railHtml}
          <div class="cal">
            <div class="head">
              <button type="button" class="nav" data-nav="-1" aria-label="Previous month">‹</button>
              <div class="titles">${titlesHtml}</div>
              <button type="button" class="nav" data-nav="1" aria-label="Next month">›</button>
            </div>
            <div class="months">${monthsHtml}</div>
            <div class="foot">
              <span class="foot-readout" aria-live="polite"></span>
              <div class="foot-actions">${pillHtml}${clearBtnHtml}</div>
            </div>
          </div>
        </div>`;

      this.monthsEl = this.pop.querySelector('.months');
      this._syncCellClasses();
      this._syncRovingTabindex();
    }

    _syncRovingTabindex() {
      const cells = [...this.pop.querySelectorAll('.cell:not(:disabled)')];
      if (!cells.length) return;
      let target = (this._focusDate && this.pop.querySelector(`.cell[data-date="${this._focusDate}"]:not(:disabled)`))
        || (this._pendingStart && this.pop.querySelector(`.cell[data-date="${this._pendingStart}"]:not(:disabled)`))
        || (this._start && this.pop.querySelector(`.cell[data-date="${this._start}"]:not(:disabled)`))
        || this.pop.querySelector('.cell.today:not(:disabled)')
        || cells[0];
      for (const c of cells) c.tabIndex = c === target ? 0 : -1;
      if (target) this._focusDate = target.dataset.date;
    }

    _syncCellClasses() {
      const cells = this.pop.querySelectorAll('.cell');
      const maxS = this.maxSpan;
      const pending = this._pendingStart;
      const hover = pending && this._hoverDate ? this._hoverDate : '';

      let rangeStart = '', rangeEnd = '', isPreview = false, isOver = false;
      if (pending) {
        if (hover && hover !== pending) {
          rangeStart = pending <= hover ? pending : hover;
          rangeEnd = pending <= hover ? hover : pending;
          isPreview = true;
          const d = spanDays(rangeStart, rangeEnd);
          isOver = !!(maxS && d > maxS);
        } else {
          rangeStart = pending;
          rangeEnd = '';
        }
      } else if (this._start && this._end) {
        rangeStart = this._start;
        rangeEnd = this._end;
      }

      const hasSpan = !!(rangeStart && rangeEnd && rangeStart !== rangeEnd);

      for (const cell of cells) {
        const iso = cell.dataset.date;
        const col = +cell.dataset.col;
        const isFirst = cell.dataset.first === '1';
        const isLast = cell.dataset.last === '1';

        cell.classList.remove(
          'start', 'end', 'single', 'has-span', 'in-range',
          'preview', 'preview-end', 'preview-over', 'cap-l', 'cap-r', 'cap-both', 'row-l', 'row-r',
        );

        let pressed = false;
        if (pending) {
          if (iso === pending) {
            cell.classList.add('start');
            pressed = true;
            if (isPreview) {
              if (pending === rangeStart) {
                cell.classList.add('has-span');
                if (col === 6 || isLast) cell.classList.add('row-r');
              } else {
                cell.classList.remove('start');
                cell.classList.add('end', 'has-span');
                if (col === 0 || isFirst) cell.classList.add('row-l');
              }
            } else {
              cell.classList.add('single');
            }
          } else if (isPreview) {
            if (iso === hover) {
              cell.classList.add('preview-end');
              const capBoth = (hover === rangeEnd && (col === 0 || isFirst))
                || (hover === rangeStart && (col === 6 || isLast));
              cell.classList.add(capBoth ? 'cap-both' : (hover === rangeEnd ? 'cap-r' : 'cap-l'));
              if (isOver) cell.classList.add('preview-over');
            } else if (iso > rangeStart && iso < rangeEnd) {
              cell.classList.add('preview');
              if (isOver) cell.classList.add('preview-over');
              if (col === 0 || isFirst) cell.classList.add('row-l');
              if (col === 6 || isLast) cell.classList.add('row-r');
            }
          }
        } else if (rangeStart && rangeEnd) {
          if (iso === rangeStart && iso === rangeEnd) {
            cell.classList.add('start', 'end', 'single');
            pressed = true;
          } else if (iso === rangeStart) {
            cell.classList.add('start', 'has-span');
            if (col === 6 || isLast) cell.classList.add('row-r');
            pressed = true;
          } else if (iso === rangeEnd) {
            cell.classList.add('end', 'has-span');
            if (col === 0 || isFirst) cell.classList.add('row-l');
            pressed = true;
          } else if (iso > rangeStart && iso < rangeEnd) {
            cell.classList.add('in-range');
            if (col === 0 || isFirst) cell.classList.add('row-l');
            if (col === 6 || isLast) cell.classList.add('row-r');
          }
        }
        cell.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      }

      // Sync active preset pills
      this.pop.querySelectorAll('.preset').forEach((btn) => {
        const active = !pending && this._start === btn.dataset.presetStart && this._end === btn.dataset.presetEnd;
        btn.classList.toggle('active', active);
      });

      // Sync footer live readout
      const out = this.pop.querySelector('.foot-readout');
      if (out) {
        out.classList.remove('mute', 'warn');
        if (pending) {
          if (hover) {
            const s = pending <= hover ? pending : hover;
            const e = pending <= hover ? hover : pending;
            const d = spanDays(s, e);
            const unit = d === 1 ? 'day' : 'days';
            if (isOver) {
              out.textContent = `${s} → ${e} · ${d}d (max ${maxS}d)`;
              out.classList.add('warn');
            } else {
              out.textContent = `${s} → ${e} · ${d} ${unit}`;
            }
          } else {
            out.textContent = `${pending} → Pick end date`;
            out.classList.add('mute');
          }
        } else if (this._start && this._end) {
          const d = spanDays(this._start, this._end);
          out.textContent = `${this._start} → ${this._end} · ${d} ${d === 1 ? 'day' : 'days'}`;
        } else {
          out.textContent = 'Pick start date';
          out.classList.add('mute');
        }
      }

      // Sync inline clear button visibility
      const fClr = this.pop.querySelector('[data-clear]');
      if (fClr) fClr.style.display = (this._start || this._end || this._pendingStart) ? '' : 'none';
    }

    _placePop() {
      if (this.inline) return;
      const wr = this.wrap.getBoundingClientRect();
      const tr = this.trig.getBoundingClientRect();
      const hasPresets = this._resolvePresets().length > 0;
      const targetW = this.isMobile
        ? Math.min(340, window.innerWidth - 16)
        : Math.min(window.innerWidth - 16, hasPresets ? 604 : 492);
      this.pop.style.width = `${Math.round(targetW)}px`;

      const pw = this.pop.offsetWidth || targetW;
      const ph = this.pop.offsetHeight || 310;
      const spaceBelow = window.innerHeight - wr.bottom;
      const spaceAbove = wr.top;
      const below = spaceBelow >= ph + 18 || spaceBelow >= spaceAbove;
      this.isBelow = below;

      let left = wr.left;
      if (left + pw > window.innerWidth - 8) left = wr.right - pw;
      left = clamp(left, 8, Math.max(8, window.innerWidth - pw - 8));

      const top = below
        ? Math.min(window.innerHeight - ph - 8, wr.bottom + 14)
        : Math.max(8, wr.top - ph - 14);

      const trigCenterX = tr.left + tr.width / 2;
      const tailX = clamp(trigCenterX - left, 24, pw - 24);

      this.pop.classList.toggle('below', below);
      this.pop.classList.toggle('above', !below);
      this.pop.style.left = `${Math.round(left)}px`;
      this.pop.style.top = `${Math.round(top)}px`;
      this.pop.style.setProperty('--tail-x', `${Math.round(tailX)}px`);
      this.pop.style.transformOrigin = `${Math.round(tailX)}px ${below ? '-10px' : 'calc(100% + 10px)'}`;
      this._popRect = { left, top, w: pw, h: ph };
    }

    _sfxAnchor(preferX) {
      const r = this.pop.getBoundingClientRect();
      const wr = this.inline ? r : this.wrap.getBoundingClientRect();
      const x = clamp(preferX, scrollX + 64, scrollX + window.innerWidth - 64);
      // Place cleanly OUTSIDE both the popover and trigger capsule so no date numerals or field text are obscured
      const topBound = this.inline ? r.top : Math.min(r.top, wr.top);
      const botBound = this.inline ? r.bottom : Math.max(r.bottom, wr.bottom);
      const y = topBound >= 48
        ? scrollY + topBound - 24
        : scrollY + botBound + 24;
      return { x, y, r };
    }

    show() {
      if (this.disabled || this.inline || this.isOpen) return;
      this.isOpen = true;
      this._seq++;
      const seq = this._seq;
      this._pendingStart = '';
      this._hoverDate = '';
      this._syncViewToDate(this._start || this._end);
      this._renderPop();
      this._placePop();
      this.pop.classList.remove('closing');
      this.pop.classList.add('open');
      this.wrap.classList.add('open');
      this.field.setAttribute('aria-expanded', 'true');
      this._bindDoc(true);
      this.emit('sakuga:open', { start: this._start, end: this._end, value: this.value });

      if (fx.calm) {
        this.popS.x = 1; this.popS.to = 1; this.popS.v = 0;
        this.pop.style.transform = '';
        return;
      }

      this.popS.k = 540;
      this.popS.d = 28;
      this.popS.to = 1;
      this.pop.style.transform = `scale(${Math.max(0, this.popS.x).toFixed(4)})`;
      this.wrapSq.x = 0.92;
      this.wrapSq.v = 3.6;
      this.wrapSq.to = 1;
      this.trigSq.s.x = Math.min(this.trigSq.s.x, 0.78);
      this.trigSq.s.v += 3.5;

      const q = at(this.trig);
      ring(q.x, q.y + (this.isBelow ? q.h / 2 + 2 : -q.h / 2 - 2), { rx: 20, ry: 5.5, life: 0.36, w: 3 });

      later(130, () => {
        if (!this.isOpen || seq !== this._seq) return;
        const r = this._popRect;
        if (!r) return;
        const cx = r.left + scrollX + r.w / 2;
        const cy = r.top + scrollY + r.h / 2;
        puff(cx - r.w / 2 - 22, cy - r.h * 0.12, { size: 7.5, n: 4, vx: -18, vy: -8, life: 0.58 });
        puff(cx + r.w / 2 + 22, cy + r.h * 0.12, { size: 7.5, n: 4, vx: 18, vy: -6, life: 0.58 });
        ticks(cx + r.w / 2 + 5, cy - r.h / 2 - 5, { dir: -0.85, n: 3, r: 6, len: 15, fan: 0.4, life: 0.42 });
      });
    }

    hide(returnFocus = false) {
      if (this.inline || !this.isOpen) return;
      this.isOpen = false;
      if (this._pendingStart) {
        this._pendingStart = '';
        this._hoverDate = '';
        this._syncTrigger();
      }
      this.wrap.classList.remove('open');
      this.field.setAttribute('aria-expanded', 'false');
      this._bindDoc(false);
      this.emit('sakuga:close', { start: this._start, end: this._end, value: this.value });
      if (returnFocus) this.field.focus({ preventScroll: true });

      if (fx.calm) {
        this.popS.x = 0; this.popS.to = 0; this.popS.v = 0;
        this.pop.classList.remove('open', 'closing');
        this.pop.style.transform = 'scale(0)';
        return;
      }

      this.pop.classList.remove('open');
      this.pop.classList.add('closing');
      this.popS.k = 560;
      this.popS.d = 36;
      this.popS.to = 0;
    }

    toggle() {
      if (this.inline) return;
      this.isOpen ? this.hide() : this.show();
    }

    _reject(info, el) {
      this.emit('sakuga:reject', {
        reason: info.reason,
        days: info.days ?? 0,
        maxSpan: info.maxSpan ?? this.maxSpan,
        date: info.date || '',
        min: info.min || this.min,
        max: info.max || this.max,
      });
      if (fx.calm) return;

      this.popShakeX.x = 11;
      this.popShakeX.v = -190;
      this.popShakeX.to = 0;

      const r = this.pop.getBoundingClientRect();
      const midY = scrollY + r.top + r.height * 0.5;
      wob(scrollX + r.right + 14, midY, { dir: 1, r: 14, life: 0.44 });
      wob(scrollX + r.left - 14, midY, { dir: -1, r: 14, life: 0.44 });

      if (el) {
        const c = at(el);
        ticks(c.x, c.y, { dir: -Math.PI / 2, n: 4, r: 13, len: 11, fan: 1.57, life: 0.36 });
      }
    }

    _playAnchorBeat(cell) {
      if (fx.calm || !cell) return;
      this.pickEl = cell;
      this.pickS.x = 0.70;
      this.pickS.v = 12;
      this.pickS.to = 1;
      if (!this.inline) {
        this.wrapSq.x = 1.035;
        this.wrapSq.to = 1;
      }

      const c = at(cell);
      ticks(c.x, c.y, { dir: -0.85, n: 4, r: 13, len: 12, fan: 1.57, life: 0.38 });
      puff(c.x + 14, c.y + 10, { size: 5.2, n: 3, vx: 14, vy: -10, life: 0.42 });

      const pos = this._sfxAnchor(c.x + 10);
      sfx('kachi', pos.x, pos.y, { size: 68, rot: -0.09, life: 0.34, ...hollow() });
    }

    _playCompleteBeat(startISO, endISO, clickedCell, presetBtn) {
      if (fx.calm) return;
      const sCell = this.pop.querySelector(`.cell[data-date="${startISO}"]`);
      const eCell = this.pop.querySelector(`.cell[data-date="${endISO}"]`);
      const endTarget = clickedCell || eCell || sCell;
      const days = spanDays(startISO, endISO);

      if (endTarget) {
        this.pickEl = endTarget;
        this.pickS.x = 0.68;
        this.pickS.v = 13;
        this.pickS.to = 1;
      }
      if (sCell && sCell !== endTarget) {
        this.anchorEl = sCell;
        this.anchorS.x = 0.76;
        this.anchorS.v = 10;
        this.anchorS.to = 1;
      }
      if (presetBtn) {
        this.presetEl = presetBtn;
        this.presetS.x = 0.78;
        this.presetS.v = 11;
        this.presetS.to = 1;
      }
      if (!this.inline) {
        this.wrapSq.x = 1.055;
        this.wrapSq.v = 1.8;
        this.wrapSq.to = 1;
      }

      const r = this.pop.getBoundingClientRect();
      const ec = eCell ? at(eCell) : (endTarget ? at(endTarget) : { x: scrollX + r.left + r.width * 0.65, y: scrollY + r.top + r.height * 0.5 });
      const sc = sCell ? at(sCell) : { x: scrollX + r.left + 32, y: ec.y };

      if (days <= 1) {
        // 1-day range: crisp pop + kira + ring + hollow ポン
        ticks(ec.x, ec.y, { dir: -0.75, n: 4, r: 14, len: 13, fan: 1.57, life: 0.4 });
        kira(ec.x + 12, ec.y - 12, { r: 11, life: 0.52 });
        ring(ec.x, ec.y, { rx: 22, ry: 12, life: 0.36, w: 3.2 });
        const pos = this._sfxAnchor(ec.x);
        sfx('pon', pos.x, pos.y, { size: 70, rot: -0.08, life: 0.54, ...hollow() });
      } else {
        // Multi-day range: twin kira glints, speed-line sweep + crescent slash, braking puffs, dotted ズザッ
        kira(sc.x + 11, sc.y - 12, { r: 10.5, life: 0.54 });
        kira(ec.x + 11, ec.y - 12, { r: 11.5, life: 0.56 });

        const dx = ec.x - sc.x;
        const dy = ec.y - sc.y;
        const dist = Math.hypot(dx, dy);
        const ang = dist > 6 ? Math.atan2(dy, dx) : 0;
        const mx = (sc.x + ec.x) / 2;
        const my = (sc.y + ec.y) / 2;

        lines(sc.x + Math.cos(ang) * Math.min(26, dist * 0.25), sc.y + Math.sin(ang) * Math.min(26, dist * 0.25), {
          n: 8, dir: ang, len: Math.min(82, Math.max(40, dist * 0.45)), spread: 18, life: 0.34,
        });
        slash(mx, my, {
          len: Math.min(185, Math.max(84, dist * 0.92)),
          ang,
          life: 0.38,
          thick: 13,
          col: fx.P.accent,
        });

        // Corner braking puffs flanking the popover cleanly outside the grid
        const midY = scrollY + r.top + r.height * 0.52;
        puff(scrollX + r.left - 18, midY + 14, { size: 7.2, n: 4, vx: -20, vy: -8, life: 0.54 });
        puff(scrollX + r.right + 18, midY - 12, { size: 7.2, n: 4, vx: 20, vy: -8, life: 0.54 });

        const pos = this._sfxAnchor(mx);
        sfx('zuza', pos.x, pos.y, { size: 84, rot: -0.08, life: 0.6, ...dotted() });
      }
    }

    _pickDate(iso, cellEl) {
      if (this.disabled || this._isDateDisabled(iso)) return;
      this._focusDate = iso;

      if (!this._pendingStart) {
        // State 0 -> State 1: Anchor start date
        this._pendingStart = iso;
        this._hoverDate = '';
        this._syncTrigger();
        this._syncCellClasses();
        this._syncRovingTabindex();
        this._playAnchorBeat(cellEl);
        return;
      }

      // State 1 -> State 2: Complete range (auto-swaps if earlier)
      const check = this._validateRange(this._pendingStart, iso);
      if (!check.ok) {
        this._reject(check, cellEl);
        return;
      }

      const changed = check.start !== this._start || check.end !== this._end;
      this._start = check.start;
      this._end = check.end;
      this._pendingStart = '';
      this._hoverDate = '';
      this.internals?.setFormValue(this.value);
      this._syncTrigger(true);
      this._syncCellClasses();
      this._syncRovingTabindex();

      if (changed) {
        this.emit('change', {
          start: this._start,
          end: this._end,
          days: check.days,
          value: this.value,
        });
      }

      this._playCompleteBeat(check.start, check.end, cellEl, null);

      if (!this.inline && !this.keepOpen) {
        const seq = this._seq;
        if (fx.calm) {
          this.hide(true);
        } else {
          later(210, () => { if (this.isOpen && seq === this._seq) this.hide(true); });
        }
      }
    }

    _pickPreset(btn) {
      if (this.disabled) return;
      const s = btn.dataset.presetStart;
      const e = btn.dataset.presetEnd;
      const check = this._validateRange(s, e);
      if (!check.ok) {
        this._reject(check, btn);
        return;
      }

      const changed = check.start !== this._start || check.end !== this._end;
      this._start = check.start;
      this._end = check.end;
      this._pendingStart = '';
      this._hoverDate = '';
      this._focusDate = check.end;
      this.internals?.setFormValue(this.value);
      this._ensureRangeVisible(check.start, check.end);
      this._syncTrigger(true);
      this._renderPop();
      if (!this.inline) this._placePop();

      if (changed) {
        this.emit('change', {
          start: this._start,
          end: this._end,
          days: check.days,
          value: this.value,
        });
      }

      const freshPreset = this.pop.querySelector(`.preset[data-preset-id="${CSS.escape(btn.dataset.presetId || '')}"]`);
      const endCell = this.pop.querySelector(`.cell[data-date="${check.end}"]`);
      this._playCompleteBeat(check.start, check.end, endCell, freshPreset);

      if (!this.inline && !this.keepOpen) {
        const seq = this._seq;
        if (fx.calm) {
          this.hide(true);
        } else {
          later(210, () => { if (this.isOpen && seq === this._seq) this.hide(true); });
        }
      }
    }

    _navigateMonths(delta, navBtn) {
      const next = addMonths(this.viewY, this.viewM, delta);
      this.viewY = next.y;
      this.viewM = next.m;
      const dir = delta > 0 ? 1 : -1;

      if (!fx.calm) {
        if (navBtn) {
          const bc = at(navBtn);
          ticks(bc.x + dir * 7, bc.y - 5, { dir: dir > 0 ? -0.45 : -Math.PI + 0.45, n: 3, r: 4, len: 11, fan: 0.42, life: 0.34 });
          lines(bc.x, bc.y, { n: 4, dir: dir > 0 ? 0 : Math.PI, len: 28, spread: 14, life: 0.24 });
        }
      }

      this._renderPop();
      if (!this.inline) this._placePop();
      if (!fx.calm) {
        this.gridX.x = dir * 18;
        this.gridX.v = -dir * 40;
        this.gridX.to = 0;
      }
    }

    _onPopClick(e) {
      const btn = e.target.closest('button');
      if (!btn || !this.pop.contains(btn)) return;

      if (btn.dataset.nav) {
        this._navigateMonths(+btn.dataset.nav, btn);
        return;
      }
      if (btn.dataset.clear) {
        this.clear();
        return;
      }
      if (btn.dataset.presetStart) {
        this._pickPreset(btn);
        return;
      }
      if (btn.dataset.date) {
        this._pickDate(btn.dataset.date, btn);
      }
    }

    _onPopHover(e) {
      if (!this._pendingStart) return;
      const cell = e.target.closest('.cell');
      if (!cell || cell.disabled || !this.pop.contains(cell)) return;
      const iso = cell.dataset.date;
      if (iso && iso !== this._hoverDate) {
        this._hoverDate = iso;
        this._syncCellClasses();
      }
    }

    _onFieldKey(e) {
      if (this.disabled) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this.isOpen) this.show();
        const focusCell = this.pop.querySelector('.cell[tabindex="0"]') || this.pop.querySelector('.cell:not(:disabled)');
        focusCell?.focus({ preventScroll: true });
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && this.clearable && (this._start || this._end) && !this.isOpen) {
        e.preventDefault();
        this.clear();
      } else if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.hide(true);
      }
    }

    _moveFocusByDays(deltaDays) {
      const cur = this._focusDate || this._pendingStart || this._start || todayInfo().iso;
      const targetISO = addDaysISO(cur, deltaDays);
      if (!targetISO) return;
      this._focusDate = targetISO;

      let cell = this.pop.querySelector(`.cell[data-date="${targetISO}"]`);
      if (!cell) {
        const p = parseISO(targetISO);
        if (p) {
          const dir = deltaDays > 0 ? 1 : -1;
          this.viewY = p.y;
          this.viewM = p.m;
          this._renderPop();
          if (!this.inline) this._placePop();
          if (!fx.calm) {
            this.gridX.x = dir * 14;
            this.gridX.to = 0;
          }
          cell = this.pop.querySelector(`.cell[data-date="${targetISO}"]`);
        }
      }
      if (cell) {
        this.pop.querySelectorAll('.cell[tabindex="0"]').forEach((c) => { c.tabIndex = -1; });
        cell.tabIndex = 0;
        cell.focus({ preventScroll: true });
        if (this._pendingStart && !cell.disabled) {
          this._hoverDate = targetISO;
          this._syncCellClasses();
        }
      }
    }

    _onPopKey(e) {
      const cell = e.target.closest('.cell');
      if (e.key === 'Escape' && !this.inline) {
        e.preventDefault();
        this.hide(true);
        return;
      }
      if (e.key === 'PageUp') {
        e.preventDefault();
        const delta = e.shiftKey ? -12 : -1;
        this._navigateMonths(delta, this.pop.querySelector('[data-nav="-1"]'));
        const f = this.pop.querySelector('.cell[tabindex="0"]') || this.pop.querySelector('.cell:not(:disabled)');
        f?.focus({ preventScroll: true });
        return;
      }
      if (e.key === 'PageDown') {
        e.preventDefault();
        const delta = e.shiftKey ? 12 : 1;
        this._navigateMonths(delta, this.pop.querySelector('[data-nav="1"]'));
        const f = this.pop.querySelector('.cell[tabindex="0"]') || this.pop.querySelector('.cell:not(:disabled)');
        f?.focus({ preventScroll: true });
        return;
      }
      if (!cell) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); this._moveFocusByDays(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this._moveFocusByDays(-1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); this._moveFocusByDays(7); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this._moveFocusByDays(-7); }
      else if (e.key === 'Home') { e.preventDefault(); this._moveFocusByDays(-(+cell.dataset.col)); }
      else if (e.key === 'End') { e.preventDefault(); this._moveFocusByDays(6 - (+cell.dataset.col)); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._pickDate(cell.dataset.date, cell);
      }
    }

    _bindDoc(on) {
      if (on === this._docBound) return;
      this._docBound = on;
      const fn = on ? 'addEventListener' : 'removeEventListener';
      document[fn]('pointerdown', this._onDocDown, true);
      document[fn]('keydown', this._onDocKey, true);
      window[fn]('resize', this._onReposition);
      window[fn]('scroll', this._onReposition, true);
    }

    frame(dt) {
      if (fx.calm) {
        this.wrap.style.transform = '';
        this.trig.style.transform = '';
        this.badgeEl.style.transform = '';
        if (this.inline) this.pop.style.transform = '';
        if (this.pickEl) this.pickEl.style.transform = '';
        if (this.anchorEl) this.anchorEl.style.transform = '';
        if (this.presetEl) this.presetEl.style.transform = '';
        if (this.monthsEl) this.monthsEl.style.transform = '';
        return;
      }

      if (!this.inline) {
        this.trigSq.step(dt);

        const wy = Math.max(0.7, this.wrapSq.step(dt));
        const wx = this.wrapX.step(dt);
        const wStill = Math.abs(wy - 1) < 0.0008 && Math.abs(this.wrapSq.v) < 0.01
          && Math.abs(wx) < 0.08 && Math.abs(this.wrapX.v) < 0.2;
        if (wStill) {
          this.wrap.style.transform = '';
        } else {
          const wsx = 1 / Math.sqrt(wy);
          this.wrap.style.transform = `translateX(${wx.toFixed(2)}px) scale(${wsx.toFixed(4)}, ${wy.toFixed(4)})`;
        }

        const bs = Math.max(0.1, this.badgeS.step(dt));
        const bStill = Math.abs(bs - 1) < 0.001 && Math.abs(this.badgeS.v) < 0.01;
        this.badgeEl.style.transform = bStill ? '' : `scale(${bs.toFixed(4)})`;
      }

      const sx = this.popShakeX.step(dt);
      const sxStill = Math.abs(sx) < 0.08 && Math.abs(this.popShakeX.v) < 0.3;

      if (this.inline) {
        this.pop.style.transform = sxStill ? '' : `translateX(${sx.toFixed(2)}px)`;
      } else if (this.isOpen || this.pop.classList.contains('closing')) {
        const y = Math.max(0, this.popS.step(dt));
        if (!this.isOpen && y < 0.025) {
          this.popS.x = 0; this.popS.v = 0;
          this.pop.classList.remove('closing');
          this.pop.style.transform = 'scale(0)';
          this.pickEl = null;
          this.anchorEl = null;
          this.presetEl = null;
        } else {
          const pStill = this.isOpen && Math.abs(y - 1) < 0.0008 && Math.abs(this.popS.v) < 0.01 && sxStill;
          if (pStill) {
            this.pop.style.transform = '';
          } else {
            const maxTilt = this.isMobile ? 2.5 : 4.5;
            const tilt = (1 - Math.min(1.12, y)) * (this.isBelow ? -maxTilt : maxTilt);
            const tx = sxStill ? '' : `translateX(${sx.toFixed(2)}px) `;
            this.pop.style.transform = `${tx}scale(${y.toFixed(4)}) rotate(${tilt.toFixed(2)}deg)`;
          }
        }
      }

      if (this.pickEl && this.pickEl.isConnected) {
        const ps = Math.max(0.55, this.pickS.step(dt));
        const px = 1 / Math.sqrt(ps);
        const still = Math.abs(ps - 1) < 0.001 && Math.abs(this.pickS.v) < 0.01;
        this.pickEl.style.transform = still ? '' : `scale(${px.toFixed(4)}, ${ps.toFixed(4)})`;
      }

      if (this.anchorEl && this.anchorEl.isConnected) {
        const as = Math.max(0.6, this.anchorS.step(dt));
        const ax = 1 / Math.sqrt(as);
        const still = Math.abs(as - 1) < 0.001 && Math.abs(this.anchorS.v) < 0.01;
        this.anchorEl.style.transform = still ? '' : `scale(${ax.toFixed(4)}, ${as.toFixed(4)})`;
      }

      if (this.presetEl && this.presetEl.isConnected) {
        const rs = Math.max(0.65, this.presetS.step(dt));
        const rx = 1 / Math.sqrt(rs);
        const still = Math.abs(rs - 1) < 0.001 && Math.abs(this.presetS.v) < 0.01;
        this.presetEl.style.transform = still ? '' : `scale(${rx.toFixed(4)}, ${rs.toFixed(4)})`;
      }

      if (this.monthsEl && this.monthsEl.isConnected) {
        const gx = this.gridX.step(dt);
        this.monthsEl.style.transform = Math.abs(gx) < 0.1 && Math.abs(this.gridX.v) < 0.2 ? '' : `translateX(${gx.toFixed(2)}px)`;
      }
    }
  }

  fx.define('sakuga-daterange', SakugaDateRange);
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
