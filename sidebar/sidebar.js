// Sakuga Sidebar: manga vertical navigation rail with a kinetic spring-leaping active capsule,
// collapsible nested submenus on spring physics, icon-rail collapse mode with speech-bubble tooltips,
// badge pop glints, full keyboard navigation, and cel-shaded anime VFX.
//
// One file, no dependencies. Load with a plain <script src="sidebar.js"></script>.
// Supports both declarative children (<optgroup>, <option>, <hr>) and programmatic el.items = [...].
(() => {
'use strict';

function component(fx) {
  const { Spring, clamp, later, at, esc, squashy, ticks, puff, lines, slash, kira, sfx, hollow, P } = fx;

  let uid = 0;

  // Crisp 20x20 cel-clean ink icon library
  const ICONS = {
    grid: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="5.6" height="5.6" rx="1.4"/><rect x="11.4" y="3" width="5.6" height="5.6" rx="1.4"/><rect x="3" y="11.4" width="5.6" height="5.6" rx="1.4"/><rect x="11.4" y="11.4" width="5.6" height="5.6" rx="1.4"/></svg>',
    home: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 9.4L10 3.2l7 6.2"/><path d="M5 8.2v8a1.4 1.4 0 0 0 1.4 1.4h7.2A1.4 1.4 0 0 0 15 16.2v-8"/><path d="M8.4 17.6v-4.8h3.2v4.8"/></svg>',
    spark: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.4l1.9 5.3 5.5 1.9-5.5 1.9-1.9 5.5-1.9-5.5-5.5-1.9 5.5-1.9L10 2.4z"/><path d="M15.8 3.2v2.4M14.6 4.4H17"/></svg>',
    layers: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.2L2.8 7l7.2 3.8L17.2 7 10 3.2z"/><path d="M2.8 10.6L10 14.4l7.2-3.8"/><path d="M2.8 14.1L10 17.6l7.2-3.5"/></svg>',
    calendar: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4.6" width="14" height="12.6" rx="2"/><path d="M6.6 2.6v3.2M13.4 2.6v3.2M3 8.6h14"/><path d="M7 12h1.5M11.5 12H13M7 14.6h1.5"/></svg>',
    chart: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.2 16.8h13.6"/><rect x="4.6" y="10.6" width="2.8" height="6.2" rx="0.8"/><rect x="8.6" y="6.8" width="2.8" height="10" rx="0.8"/><rect x="12.6" y="3.8" width="2.8" height="13" rx="0.8"/></svg>',
    folder: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.8 6a1.8 1.8 0 0 1 1.8-1.8h3.6l1.7 2h5.5a1.8 1.8 0 0 1 1.8 1.8v7.2a1.8 1.8 0 0 1-1.8 1.8H4.6a1.8 1.8 0 0 1-1.8-1.8V6z"/></svg>',
    bell: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.2a4.6 4.6 0 0 0-4.6 4.6v2.7c0 .9-.4 1.8-1.2 2.4l-.6.5h12.8l-.6-.5a3.1 3.1 0 0 1-1.2-2.4V7.8A4.6 4.6 0 0 0 10 3.2z"/><path d="M8.2 15.8a2 2 0 0 0 3.6 0"/></svg>',
    sliders: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.2 5.6h13.6M3.2 10h13.6M3.2 14.4h13.6"/><circle cx="7.2" cy="5.6" r="1.9" fill="var(--sk-card)"/><circle cx="13" cy="10" r="1.9" fill="var(--sk-card)"/><circle cx="8.6" cy="14.4" r="1.9" fill="var(--sk-card)"/></svg>',
    users: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="7.8" cy="6.8" r="2.6"/><path d="M3.2 16.4c.4-2.8 2.2-4.2 4.6-4.2s4.2 1.4 4.6 4.2"/><circle cx="13.6" cy="7.6" r="2.1"/><path d="M13.6 12.2c1.8 0 3.1 1.1 3.5 3.4"/></svg>',
    rocket: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.2 3.2c2.2-.4 4.2-.2 4.6.2.4.4.6 2.4.2 4.6-.7 3.2-3.4 6-6.6 7.2l-3.6-3.6c1.2-3.2 4-5.9 5.4-8.4z"/><path d="M7.6 11.4L4.4 12l2-3.6M10.4 14.2L9.8 17.4l3.6-2M5 15.8l-1.8 1.8"/><circle cx="12.6" cy="7.4" r="1.3"/></svg>',
    bookmark: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.4 3.4h9.2a1.4 1.4 0 0 1 1.4 1.4v12.4l-6-3.6-6 3.6V4.8a1.4 1.4 0 0 1 1.4-1.4z"/></svg>',
    terminal: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.8" y="3.8" width="14.4" height="12.4" rx="2.2"/><path d="M6.4 8.2L9.2 10.6 6.4 13M10.6 13h3.2"/></svg>',
    shield: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.8l6.2 2.4v4.6c0 3.8-2.6 6.4-6.2 7.6-3.6-1.2-6.2-3.8-6.2-7.6V5.2L10 2.8z"/><path d="M7.4 10.2l1.8 1.8 3.6-3.8"/></svg>',
    star: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.8l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L10 2.8z"/></svg>',
    inbox: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.2 11.4l1.8-6.6A1.4 1.4 0 0 1 6.4 3.8h7.2a1.4 1.4 0 0 1 1.4 1l1.8 6.6v3.8a1.6 1.6 0 0 1-1.6 1.6H4.8a1.6 1.6 0 0 1-1.6-1.6v-3.8z"/><path d="M3.4 11.4h3.8l1.2 2h3.2l1.2-2h3.8"/></svg>',
    compass: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><polygon points="13,7 11.2,11.2 7,13 8.8,8.8" fill="none"/></svg>',
  };
  const ICON_ALIASES = {
    dashboard: 'grid',
    settings: 'sliders',
    mail: 'inbox',
    code: 'terminal',
    team: 'users',
    notifications: 'bell',
    analytics: 'chart',
    explore: 'compass',
  };

  const CHEV_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.8 3.6L10.4 8l-4.6 4.4"/></svg>';
  const COL_SVG = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9.6 4.4L5 9l4.6 4.6"/><path d="M14.2 4.4L9.6 9l4.6 4.6"/></svg>';

  const boolAttr = (el, name) => el.hasAttribute(name) && el.getAttribute(name) !== 'false';
  const BADGE_TONES = new Set(['acc', 'pink', 'pri', 'lavender', 'amber', 'green', 'soft', 'ink']);

  function normTone(t) {
    if (!t) return 'acc';
    const k = String(t).trim().toLowerCase();
    if (k === 'pink') return 'acc';
    if (k === 'lavender') return 'pri';
    return BADGE_TONES.has(k) ? k : 'acc';
  }

  function renderIcon(icon) {
    if (!icon) return '';
    const raw = String(icon).trim();
    const key = ICON_ALIASES[raw.toLowerCase()] || raw.toLowerCase();
    if (ICONS[key]) return `<span class="ico" part="icon" aria-hidden="true">${ICONS[key]}</span>`;
    return `<span class="ico glyph" part="icon" aria-hidden="true">${esc(raw)}</span>`;
  }

  function normalizeNode(raw, idx, prefix = '') {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.divider) return [{ type: 'divider' }];
    if (raw.group !== undefined && raw.value === undefined) {
      const out = [{ type: 'group', label: String(raw.group) }];
      if (Array.isArray(raw.items)) {
        raw.items.forEach((sub, j) => {
          const parsed = normalizeNode(sub, j, prefix + 'g' + idx + '-');
          if (parsed) out.push(...parsed);
        });
      }
      return out;
    }
    const label = String(raw.label ?? raw.value ?? '');
    const value = raw.value !== undefined && raw.value !== null ? String(raw.value) : (label || (prefix + idx));
    const badge = raw.badge !== undefined && raw.badge !== null && String(raw.badge) !== '' ? String(raw.badge) : '';
    const children = Array.isArray(raw.children) && raw.children.length
      ? raw.children.flatMap((c, j) => normalizeNode(c, j, value + '-') || []).filter((n) => n.type === 'item')
      : [];
    return [{
      type: 'item',
      value,
      label,
      icon: raw.icon ? String(raw.icon) : '',
      badge,
      badgeTone: normTone(raw.badgeTone),
      disabled: !!raw.disabled,
      expanded: !!raw.expanded,
      children,
    }];
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    list.forEach((raw, i) => {
      const nodes = normalizeNode(raw, i);
      if (nodes) out.push(...nodes);
    });
    return out;
  }

  class SakugaSidebar extends fx.Base {
    static fromChildren = true;
    static observedAttributes = ['value', 'collapsed', 'collapsible', 'heading', 'label', 'compact', 'items', 'data'];

    static css = `
      :host {
        display: inline-block;
        max-width: 100%;
        vertical-align: top;
        isolation: auto;
      }

      .probes {
        position: absolute;
        left: 0; top: 0; height: 0;
        visibility: hidden; pointer-events: none; overflow: hidden;
      }
      .probe-r { width: var(--sk-sidebar-rail, 68px); }

      .panel {
        position: relative;
        display: flex;
        flex-direction: column;
        width: var(--sk-sidebar-width, 248px);
        max-width: 100%;
        min-height: 100%;
        border: var(--sk-bw, 3.2px) solid var(--sk-ink);
        border-radius: var(--sk-r, 15px);
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: var(--sk-sh);
        user-select: none;
        -webkit-user-select: none;
      }
      .panel.collapsed {
        width: var(--sk-sidebar-rail, 68px);
      }
      .panel.resizing {
        overflow: hidden;
      }

      /* Header */
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 54px;
        padding: 11px 12px 10px 14px;
        border-bottom: 2.4px solid var(--sk-ink);
        flex: none;
      }
      :host([compact]) .head {
        min-height: 46px;
        padding: 8px 10px 8px 12px;
      }
      .head[hidden] { display: none; }
      .panel.rail-ui .head {
        justify-content: center;
        padding-left: 0;
        padding-right: 0;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
        flex: 1 1 auto;
        overflow: hidden;
      }
      .panel.rail-ui .brand { display: none; }

      .brand-mark {
        flex: none;
        width: 9px;
        height: 20px;
        border: 2px solid var(--sk-ink);
        border-radius: 4px;
        background: var(--sk-acc);
        box-shadow: 2px 2px 0 var(--sk-soft);
        transform: skewX(-10deg);
      }
      .brand-title {
        font: italic 900 15.5px/1.15 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        letter-spacing: -0.015em;
        color: var(--sk-ink);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      :host([compact]) .brand-title { font-size: 14.5px; }

      .col-btn {
        flex: none;
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: 2.2px solid var(--sk-ink);
        border-radius: 9px;
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: 2px 2.5px 0 var(--sk-soft);
        cursor: pointer;
        touch-action: manipulation;
        will-change: transform;
      }
      :host([compact]) .col-btn { width: 28px; height: 28px; border-radius: 8px; }
      .col-btn[hidden] { display: none; }
      .col-btn:hover { background: color-mix(in srgb, var(--sk-soft) 24%, var(--sk-card)); }
      .col-btn:focus-visible { outline: 2.5px solid var(--sk-acc); outline-offset: 2px; }
      .col-btn svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.6;
        stroke-linecap: round;
        stroke-linejoin: round;
        will-change: transform;
      }

      /* Navigation body */
      .nav-scroll {
        flex: 1 1 auto;
        padding: 8px;
        overflow-x: hidden;
        overflow-y: auto;
        scrollbar-width: thin;
      }
      :host([compact]) .nav-scroll { padding: 6px; }
      .panel.rail-ui .nav-scroll { padding: 8px 7px; }

      .nav-list {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      :host([compact]) .nav-list { gap: 2px; }

      /* Kinetic vertical active indicator capsule + left pink accent bar */
      .ind {
        position: absolute;
        left: 0;
        top: 0;
        width: 44px;
        height: 40px;
        border: 2.4px solid var(--sk-ink);
        border-radius: 11px;
        background: color-mix(in srgb, var(--sk-soft) 28%, var(--sk-card));
        box-shadow: 3px 3px 0 var(--sk-soft);
        pointer-events: none;
        z-index: 0;
        display: none;
        transform-origin: center center;
        will-change: transform, width, height;
      }
      :host([compact]) .ind { border-radius: 9px; box-shadow: 2.5px 2.5px 0 var(--sk-soft); }
      .ind.on { display: block; }
      .ind-bar {
        position: absolute;
        left: 3.5px;
        top: 5px;
        bottom: 5px;
        width: 4.5px;
        border: 1.4px solid var(--sk-ink);
        border-radius: 3px;
        background: var(--sk-acc);
      }
      .panel.rail-ui .ind-bar {
        left: 2.5px;
        top: 7px;
        bottom: 7px;
        width: 4px;
      }

      /* Section group headers */
      .grp {
        padding: 10px 10px 4px 12px;
        font: 800 10.5px/1.2 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--sk-dim);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: none;
      }
      .grp:first-of-type { padding-top: 4px; }
      :host([compact]) .grp { padding: 8px 8px 3px 10px; font-size: 10px; }
      .panel.rail-ui .grp {
        height: 14px;
        padding: 0;
        margin: 2px 0;
        display: grid;
        place-items: center;
        font-size: 0;
        color: transparent;
      }
      .panel.rail-ui .grp::after {
        content: "";
        display: block;
        width: 18px;
        height: 2.4px;
        border-radius: 2px;
        background: var(--sk-track);
      }

      /* Dividers */
      .div {
        height: 2px;
        margin: 6px 8px;
        border-radius: 2px;
        background: var(--sk-soft);
        flex: none;
      }
      :host([compact]) .div { margin: 5px 6px; }

      /* Nav buttons */
      .item {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-height: 40px;
        padding: 7px 9px 7px 13px;
        margin: 0;
        border: 2px solid transparent;
        border-radius: 11px;
        background: transparent;
        color: var(--sk-ink);
        font-weight: 700;
        font-size: 14px;
        line-height: 1.25;
        text-align: left;
        cursor: pointer;
        touch-action: manipulation;
        will-change: transform;
      }
      :host([compact]) .item {
        min-height: 34px;
        gap: 8px;
        padding: 5px 8px 5px 11px;
        font-size: 13.5px;
        border-radius: 9px;
      }
      .item:hover:not(:disabled):not(.active) {
        background: color-mix(in srgb, var(--sk-soft) 15%, transparent);
      }
      .item:focus { outline: none; }
      .item:focus-visible { outline: 2.5px solid var(--sk-acc); outline-offset: -1px; }
      .item:disabled { opacity: 0.42; cursor: not-allowed; }
      .item.active { font-weight: 800; color: var(--sk-ink); }
      .item.has-active { font-weight: 800; }

      .panel.rail-ui .item {
        justify-content: center;
        gap: 0;
        padding: 7px 0 7px 4px;
      }

      /* Icon wrapper + rail badge dot */
      .ico-wrap {
        position: relative;
        flex: none;
        width: 22px;
        height: 22px;
        display: grid;
        place-items: center;
        will-change: transform;
      }
      .ico {
        display: grid;
        place-items: center;
        width: 20px;
        height: 20px;
        color: var(--sk-ink);
        pointer-events: none;
      }
      .ico svg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .ico.glyph { font-size: 15px; line-height: 1; font-style: normal; font-weight: 800; }
      :host([compact]) .ico svg { width: 16.5px; height: 16.5px; }

      .rail-dot {
        display: none;
        position: absolute;
        top: -2px;
        right: -3px;
        width: 9px;
        height: 9px;
        border: 1.8px solid var(--sk-ink);
        border-radius: 999px;
        background: var(--sk-acc);
        pointer-events: none;
      }
      .rail-dot[data-tone="pri"] { background: var(--sk-pri); }
      .rail-dot[data-tone="amber"] { background: #ff9b54; }
      .rail-dot[data-tone="green"] { background: #38c98a; }
      .rail-dot[data-tone="soft"] { background: var(--sk-soft); }
      .rail-dot[data-tone="ink"] { background: var(--sk-ink); }
      .panel.rail-ui .rail-dot.show { display: block; }

      .lbl {
        flex: 1 1 auto;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .panel.rail-ui .lbl,
      .panel.rail-ui .badge,
      .panel.rail-ui .chev {
        display: none;
      }

      /* Badge pill */
      .badge {
        flex: none;
        display: inline-grid;
        place-items: center;
        min-width: 22px;
        height: 21px;
        padding: 0 7px;
        border: 2px solid var(--sk-ink);
        border-radius: 999px;
        background: var(--sk-acc);
        color: #fff;
        box-shadow: 1.5px 2px 0 var(--sk-soft);
        font-size: 11px;
        font-weight: 900;
        line-height: 1;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
        will-change: transform;
      }
      .badge[hidden] { display: none; }
      .badge[data-tone="pri"] { background: var(--sk-pri); color: #fff; }
      .badge[data-tone="amber"] { background: #ff9b54; color: var(--sk-ink); }
      .badge[data-tone="green"] { background: #38c98a; color: var(--sk-ink); }
      .badge[data-tone="soft"] { background: color-mix(in srgb, var(--sk-soft) 48%, var(--sk-card)); color: var(--sk-ink); }
      .badge[data-tone="ink"] { background: var(--sk-ink); color: #fff; }
      :host([compact]) .badge { min-width: 20px; height: 19px; padding: 0 6px; font-size: 10.5px; }

      /* Submenu chevron */
      .chev {
        flex: none;
        display: grid;
        place-items: center;
        width: 20px;
        height: 20px;
        color: var(--sk-dim);
        pointer-events: none;
        will-change: transform;
      }
      .item.expanded .chev,
      .item.active .chev,
      .item.has-active .chev { color: var(--sk-ink); }
      .chev svg {
        width: 14px;
        height: 14px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      /* Nested submenu block with vertical ink guide rail */
      .sub-wrap {
        position: relative;
        height: var(--h, 0px);
        overflow: hidden;
      }
      .panel.rail-ui .sub-wrap {
        display: none;
      }
      .sub-inner {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 3px 0 4px 31px;
        transform-origin: 50% 0%;
      }
      :host([compact]) .sub-inner { padding: 2px 0 3px 28px; }
      .sub-inner::before {
        content: "";
        position: absolute;
        left: 20px;
        top: 4px;
        bottom: 7px;
        width: 2.4px;
        border-radius: 2px;
        background: var(--sk-ink);
        pointer-events: none;
      }
      :host([compact]) .sub-inner::before { left: 18px; }

      .item.child {
        min-height: 35px;
        padding: 5px 9px 5px 13px;
        font-size: 13.5px;
        font-weight: 600;
        color: color-mix(in srgb, var(--sk-ink) 82%, var(--sk-dim));
        border-radius: 10px;
      }
      :host([compact]) .item.child {
        min-height: 30px;
        padding: 4px 8px 4px 11px;
        font-size: 12.5px;
      }
      .item.child.active {
        font-weight: 800;
        color: var(--sk-ink);
      }
      .item.child .ico-wrap { width: 18px; height: 18px; }
      .item.child .ico { width: 16px; height: 16px; }
      .item.child .ico svg { width: 15px; height: 15px; }

      /* Footer slot */
      .foot {
        margin-top: auto;
        padding: 10px 12px;
        border-top: 2.4px solid var(--sk-ink);
        flex: none;
        overflow: hidden;
      }
      :host([compact]) .foot { padding: 8px 10px; }
      .foot[hidden] { display: none; }
      .panel.rail-ui .foot {
        padding: 8px 6px;
        display: grid;
        place-items: center;
      }

      /* Collapsed icon-rail Sakuga speech-bubble tooltip */
      .tip {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 2147482100;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        max-width: min(236px, calc(100vw - 92px));
        padding: 7px 12px;
        border: 2.8px solid var(--sk-ink);
        border-radius: 12px;
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: 4px 5px 0 var(--sk-soft);
        font: 800 13.5px/1.2 -apple-system, "Segoe UI", system-ui, sans-serif;
        white-space: nowrap;
        pointer-events: none;
        visibility: hidden;
        transform-origin: -10px 50%;
        will-change: transform;
      }
      .tip.on { visibility: visible; }
      .tip::after {
        content: "";
        position: absolute;
        right: 100%;
        top: 50%;
        margin-top: -8px;
        border: 8px solid transparent;
        border-right: 10px solid var(--sk-ink);
      }
      .tip::before {
        content: "";
        position: absolute;
        right: calc(100% - 3.6px);
        top: 50%;
        margin-top: -5.5px;
        border: 5.5px solid transparent;
        border-right: 7.5px solid var(--sk-card);
        z-index: 1;
      }
      .tip.flip { transform-origin: calc(100% + 10px) 50%; }
      .tip.flip::after {
        right: auto; left: 100%;
        border-right-color: transparent;
        border-left: 10px solid var(--sk-ink);
      }
      .tip.flip::before {
        right: auto; left: calc(100% - 3.6px);
        border-right-color: transparent;
        border-left: 7.5px solid var(--sk-card);
      }
      .tip-lbl {
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tip-sub {
        padding: 1px 6px;
        border: 1.6px solid var(--sk-ink);
        border-radius: 6px;
        background: color-mix(in srgb, var(--sk-soft) 35%, var(--sk-card));
        font-size: 10.5px;
        font-weight: 800;
        color: var(--sk-ink);
      }
      .tip-sub[hidden] { display: none; }
    `;

    constructor() {
      super();
      this._id = 'sk-sb-' + ++uid;
      this._nodes = [];
      this._explicitItems = false;
      this._value = '';
      this._collapsed = false;
      this._entries = new Map();
      this._subs = new Map();
      this._flatButtons = [];
      this._badgePops = new Map();
      this._itemPops = new Map();
      this._mo = null;
      this._ro = null;

      this._indOn = false;
      this._jumpPending = null;
      this._widthAnim = false;
      this._widthStart = 248;
      this._widthTarget = 248;
      this._tipEntry = null;
      this._tipVisible = false;
      this._tipX = 0;
      this._tipFlip = false;
      this._icoPopEl = null;
      this._seq = 0;
    }

    get value() { return this._value; }
    set value(v) {
      const next = v == null ? '' : String(v);
      if (!this.ready) {
        this._value = next;
        if (next) this.setAttribute('value', next); else this.removeAttribute('value');
        return;
      }
      this.select(next, true);
    }

    get collapsed() { return this._collapsed; }
    set collapsed(v) {
      const want = !!v;
      if (!this.ready) {
        this._collapsed = want;
        this.toggleAttribute('collapsed', want);
        return;
      }
      this._setCollapsed(want, false);
    }

    get collapsible() { return boolAttr(this, 'collapsible'); }
    set collapsible(v) { this.toggleAttribute('collapsible', !!v); }

    get heading() { return this.getAttribute('heading') || ''; }
    set heading(v) {
      if (v === null || v === undefined || v === '') this.removeAttribute('heading');
      else this.setAttribute('heading', String(v));
    }

    get label() { return this.getAttribute('label') || 'Sidebar navigation'; }
    set label(v) {
      if (v === null || v === undefined || v === '') this.removeAttribute('label');
      else this.setAttribute('label', String(v));
    }

    get compact() { return boolAttr(this, 'compact'); }
    set compact(v) { this.toggleAttribute('compact', !!v); }

    get items() {
      return this._nodes.map((n) => {
        if (n.type === 'divider') return { divider: true };
        if (n.type === 'group') return { group: n.label };
        return {
          value: n.value,
          label: n.label,
          icon: n.icon,
          badge: n.badge || undefined,
          badgeTone: n.badgeTone,
          disabled: n.disabled,
          expanded: n.expanded,
          children: n.children.length ? n.children.map((c) => ({
            value: c.value,
            label: c.label,
            icon: c.icon || undefined,
            badge: c.badge || undefined,
            badgeTone: c.badgeTone,
            disabled: c.disabled,
          })) : undefined,
        };
      });
    }
    set items(list) {
      this._explicitItems = true;
      this._nodes = normalizeList(list);
      if (this.ready) this._rebuild();
    }

    attributeChangedCallback(name, oldV, newV) {
      if (oldV === newV) return;
      if (!this.ready) {
        if (name === 'value') this._value = newV || '';
        else if (name === 'collapsed') this._collapsed = boolAttr(this, 'collapsed');
        else if (name === 'items' || name === 'data') this._parseJsonAttr(newV);
        return;
      }
      if (name === 'value') {
        const next = newV || '';
        if (next !== this._value) this.select(next, true);
      } else if (name === 'collapsed') {
        const want = boolAttr(this, 'collapsed');
        if (want !== this._collapsed) this._setCollapsed(want, false);
      } else if (name === 'collapsible' || name === 'heading') {
        this._syncChrome();
      } else if (name === 'label') {
        if (this.panel) this.panel.setAttribute('aria-label', this.label);
      } else if (name === 'compact') {
        this._snapIndicator();
      } else if (name === 'items' || name === 'data') {
        this._parseJsonAttr(newV);
        this._rebuild();
      }
    }

    _parseJsonAttr(str) {
      if (!str) return;
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          this._explicitItems = true;
          this._nodes = normalizeList(parsed);
        }
      } catch {}
    }

    _readChildNodes() {
      const nodes = [];
      const itemByValue = new Map();
      let idx = 0;
      let lastGroup = null;

      const pushOption = (el, insideOptGroupParent = null) => {
        if (boolAttr(el, 'data-divider')) {
          nodes.push({ type: 'divider' });
          return;
        }
        const label = (el.textContent || '').trim();
        const value = el.hasAttribute('value') ? el.getAttribute('value') : (label || String(idx++));
        const badge = el.getAttribute('data-badge') || '';
        const item = {
          type: 'item',
          value,
          label,
          icon: el.getAttribute('data-icon') || '',
          badge,
          badgeTone: normTone(el.getAttribute('data-badge-tone')),
          disabled: el.hasAttribute('disabled'),
          expanded: boolAttr(el, 'data-expanded'),
          children: [],
        };

        const rawChildren = el.getAttribute('data-children');
        if (rawChildren) {
          try {
            const arr = JSON.parse(rawChildren);
            if (Array.isArray(arr)) {
              item.children = normalizeList(arr).filter((n) => n.type === 'item');
            }
          } catch {}
        }

        const parentVal = el.getAttribute('data-parent') || el.getAttribute('data-submenu') || '';
        if (insideOptGroupParent) {
          insideOptGroupParent.children.push(item);
          return;
        }
        if (parentVal && itemByValue.has(parentVal)) {
          itemByValue.get(parentVal).children.push(item);
          return;
        }

        const grpAttr = el.getAttribute('data-group');
        if (grpAttr && grpAttr !== lastGroup) {
          if (itemByValue.has(grpAttr)) {
            itemByValue.get(grpAttr).children.push(item);
            return;
          }
          nodes.push({ type: 'group', label: grpAttr });
          lastGroup = grpAttr;
        }

        itemByValue.set(value, item);
        nodes.push(item);
      };

      for (const el of this.children) {
        const slot = el.getAttribute('slot');
        if (slot === 'header' || slot === 'footer') continue;
        const tag = el.tagName;
        if (tag === 'HR') {
          nodes.push({ type: 'divider' });
        } else if (tag === 'OPTGROUP') {
          const gLabel = el.getAttribute('label') || '';
          const asSubmenu = el.hasAttribute('data-value') || el.hasAttribute('data-collapsible');
          if (asSubmenu) {
            const pVal = el.getAttribute('data-value') || gLabel || String(idx++);
            const parentItem = {
              type: 'item',
              value: pVal,
              label: gLabel,
              icon: el.getAttribute('data-icon') || '',
              badge: el.getAttribute('data-badge') || '',
              badgeTone: normTone(el.getAttribute('data-badge-tone')),
              disabled: el.hasAttribute('disabled'),
              expanded: boolAttr(el, 'data-expanded'),
              children: [],
            };
            for (const ch of el.children) {
              if (ch.tagName === 'OPTION') pushOption(ch, parentItem);
            }
            itemByValue.set(pVal, parentItem);
            nodes.push(parentItem);
          } else {
            if (gLabel) {
              nodes.push({ type: 'group', label: gLabel });
              lastGroup = gLabel;
            }
            for (const ch of el.children) {
              if (ch.tagName === 'HR') nodes.push({ type: 'divider' });
              else if (ch.tagName === 'OPTION') pushOption(ch);
            }
          }
        } else if (tag === 'OPTION') {
          pushOption(el);
        }
      }
      return nodes;
    }

    render() {
      return `
        <div class="probes" aria-hidden="true"><div class="probe-r"></div></div>
        <nav class="panel" part="panel" aria-label="${esc(this.label)}">
          <div class="head" part="header">
            <div class="brand" part="brand">
              <slot name="header">
                <span class="brand-mark" aria-hidden="true"></span>
                <span class="brand-title"></span>
              </slot>
            </div>
            <button type="button" class="col-btn" part="collapse-button" aria-label="Collapse sidebar" aria-expanded="true">
              ${COL_SVG}
            </button>
          </div>
          <div class="nav-scroll" part="body">
            <div class="nav-list" part="list">
              <div class="ind" part="indicator" aria-hidden="true"><span class="ind-bar"></span></div>
            </div>
          </div>
          <div class="foot" part="footer" hidden>
            <slot name="footer"></slot>
          </div>
        </nav>
        <div class="tip" part="tooltip" role="tooltip" aria-hidden="true">
          <span class="tip-lbl"></span>
          <span class="tip-sub" hidden></span>
          <span class="badge tip-badge" hidden></span>
        </div>
      `;
    }

    setup() {
      this.panel = this.$('.panel');
      this.probeR = this.$('.probe-r');
      this.headEl = this.$('.head');
      this.brandTitle = this.$('.brand-title');
      this.headSlot = this.$('slot[name="header"]');
      this.colBtn = this.$('.col-btn');
      this.colSvg = this.colBtn.querySelector('svg');
      this.navScroll = this.$('.nav-scroll');
      this.navList = this.$('.nav-list');
      this.ind = this.$('.ind');
      this.footEl = this.$('.foot');
      this.footSlot = this.$('slot[name="footer"]');
      this.tip = this.$('.tip');
      this.tipLbl = this.$('.tip-lbl');
      this.tipSub = this.$('.tip-sub');
      this.tipBadge = this.$('.tip-badge');

      this.indY = new Spring(0, 440, 26);
      this.indH = new Spring(40, 440, 28);
      this.indX = new Spring(0, 480, 28);
      this.indW = new Spring(200, 480, 28);
      this.indSquash = new Spring(1, 560, 16);
      this.icoPopS = new Spring(1, 520, 14);
      this.widthS = new Spring(248, 420, 26);
      this.colChevS = new Spring(0, 420, 17);
      this.tipS = new Spring(0, 580, 24);
      this.tipY = new Spring(0, 520, 28);
      this.colSq = squashy(this.colBtn, { low: 0.84, wide: 0.25, k: 520, d: 15 });

      const jsonAttr = this.getAttribute('items') || this.getAttribute('data');
      if (jsonAttr && !this._explicitItems) this._parseJsonAttr(jsonAttr);
      if (!this._explicitItems) this._nodes = this._readChildNodes();

      this._value = this._value || this.getAttribute('value') || '';
      this._collapsed = this._collapsed || boolAttr(this, 'collapsed');

      this._syncChrome();
      this._syncSlots();
      this._applyStaticCollapsed();
      this._rebuild();

      this.headSlot.addEventListener('slotchange', () => this._syncChrome());
      this.footSlot.addEventListener('slotchange', () => this._syncSlots());

      this.colBtn.addEventListener('click', () => this.toggleCollapse());

      this.navList.addEventListener('click', (e) => {
        const btn = e.target.closest('.item');
        if (!btn || btn.disabled) return;
        const val = btn.dataset.value;
        const entry = this._entries.get(val);
        if (!entry) return;
        if (entry.item.children.length) {
          if (this._collapsed) {
            this._setCollapsed(false, true);
            const sub = this._subs.get(val);
            if (sub && !sub.expanded) this.toggleGroup(val);
          } else {
            this.toggleGroup(val);
          }
        } else {
          this.select(val, false);
        }
      });

      this.navList.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('.item');
        if (!btn || btn.disabled) return;
        this._pulseItem(btn, 0.90, 0);
      });

      this.navList.addEventListener('pointerover', (e) => {
        if (!this._collapsed) return;
        const btn = e.target.closest('.item');
        if (!btn) return;
        const entry = this._entries.get(btn.dataset.value);
        if (entry) this._showTip(entry);
      });

      this.navList.addEventListener('pointermove', (e) => {
        if (!this._collapsed) return;
        const btn = e.target.closest('.item');
        if (!btn) return;
        const entry = this._entries.get(btn.dataset.value);
        if (entry && entry !== this._tipEntry) this._showTip(entry);
      });

      this.navList.addEventListener('pointerleave', () => {
        this._hideTip();
      });

      this.navList.addEventListener('focusin', (e) => {
        if (!this._collapsed) return;
        const btn = e.target.closest('.item');
        if (!btn) return;
        const entry = this._entries.get(btn.dataset.value);
        if (entry) this._showTip(entry);
      });

      this.navList.addEventListener('focusout', (e) => {
        if (!this.navList.contains(e.relatedTarget)) this._hideTip();
      });

      this.navList.addEventListener('keydown', (e) => this._onKeyDown(e));

      this._ro = new ResizeObserver(() => {
        if (!this._widthAnim) this._snapIndicator();
      });
      this._ro.observe(this.navList);
      this._attachObserver();
    }

    _attachObserver() {
      if (this._mo) return;
      this._mo = new MutationObserver((records) => {
        if (this._explicitItems) return;
        const touched = records.some((r) => {
          const t = r.target;
          if (t === this) return r.type === 'childList';
          if (t.nodeType === 1 && (t.tagName === 'OPTION' || t.tagName === 'OPTGROUP' || t.tagName === 'HR')) return true;
          if (t.parentElement && (t.parentElement.tagName === 'OPTION' || t.parentElement.tagName === 'OPTGROUP')) return true;
          return false;
        });
        if (!touched) return;
        this._nodes = this._readChildNodes();
        this._rebuild();
      });
      this._mo.observe(this, {
        childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: ['value', 'label', 'disabled', 'data-icon', 'data-badge', 'data-badge-tone', 'data-group', 'data-parent', 'data-submenu', 'data-expanded', 'data-divider', 'data-collapsible', 'slot'],
      });
    }

    connectedCallback() {
      super.connectedCallback();
      if (this.ready) this._attachObserver();
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this._mo?.disconnect(); this._mo = null;
      this._ro?.disconnect(); this._ro = null;
    }

    _syncChrome() {
      if (!this.headEl) return;
      const heading = this.heading;
      this.brandTitle.textContent = heading;
      const hasSlotHead = this.headSlot.assignedNodes().some(
        (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim().length > 0)
      );
      const hasBrand = Boolean(heading || hasSlotHead);
      const showCol = this.collapsible;
      this.colBtn.hidden = !showCol;
      this.$('.brand').hidden = !hasBrand;
      this.headEl.hidden = !hasBrand && !showCol;
      this.colBtn.setAttribute('aria-expanded', String(!this._collapsed));
      this.colBtn.setAttribute('aria-label', this._collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    }

    _syncSlots() {
      if (!this.footEl) return;
      const hasFoot = this.footSlot.assignedNodes().some(
        (n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim().length > 0)
      );
      this.footEl.hidden = !hasFoot;
    }

    _applyStaticCollapsed() {
      this.panel.classList.toggle('collapsed', this._collapsed);
      this.panel.classList.toggle('rail-ui', this._collapsed);
      this.panel.classList.remove('resizing');
      this.panel.style.width = '';
      this.colChevS.x = this.colChevS.to = this._collapsed ? 1 : 0;
      this.colChevS.v = 0;
      this.colSvg.style.transform = this._collapsed ? 'rotate(180deg)' : '';
      this.colBtn.setAttribute('aria-expanded', String(!this._collapsed));
      this.colBtn.setAttribute('aria-label', this._collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    }

    _rebuild() {
      if (!this.navList) return;
      const prevExpanded = new Map();
      for (const [k, s] of this._subs) prevExpanded.set(k, s.expanded);

      for (const old of [...this.navList.children]) {
        if (old !== this.ind) old.remove();
      }
      this._entries.clear();
      this._subs.clear();
      this._flatButtons = [];
      this._badgePops.clear();
      this._itemPops.clear();
      this._hideTip(true);

      // Ensure parent of initial active child is expanded
      let initialParentToOpen = null;
      for (const n of this._nodes) {
        if (n.type === 'item' && n.children.length) {
          if (n.children.some((c) => c.value === this._value)) {
            initialParentToOpen = n.value;
          }
        }
      }

      const frag = document.createDocumentFragment();
      let groupIdx = 0;

      const makeButton = (item, isChild, parentValue) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = isChild ? 'item child' : 'item';
        btn.dataset.value = item.value;
        btn.setAttribute('part', isChild ? 'subitem' : 'item');
        if (item.disabled) {
          btn.disabled = true;
          btn.setAttribute('aria-disabled', 'true');
        }
        const hasChildren = !isChild && item.children.length > 0;
        const subId = hasChildren ? `${this._id}-sub-${esc(item.value).replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
        const expanded = hasChildren
          ? (prevExpanded.has(item.value) ? prevExpanded.get(item.value) : (item.expanded || initialParentToOpen === item.value))
          : false;

        if (hasChildren) {
          btn.classList.add('parent');
          btn.classList.toggle('expanded', expanded);
          btn.setAttribute('aria-expanded', String(expanded));
          btn.setAttribute('aria-controls', subId);
        }

        const iconHtml = item.icon
          ? `<span class="ico-wrap">${renderIcon(item.icon)}<span class="rail-dot${item.badge ? ' show' : ''}" data-tone="${esc(item.badgeTone)}" aria-hidden="true"></span></span>`
          : (isChild ? '' : `<span class="ico-wrap"><span class="ico glyph" part="icon" aria-hidden="true">${esc((item.label || '?').slice(0, 1).toUpperCase())}</span><span class="rail-dot${item.badge ? ' show' : ''}" data-tone="${esc(item.badgeTone)}" aria-hidden="true"></span></span>`);

        const badgeHtml = `<span class="badge" part="badge" data-tone="${esc(item.badgeTone)}"${item.badge ? '' : ' hidden'}>${esc(item.badge)}</span>`;
        const chevHtml = hasChildren ? `<span class="chev" part="chevron" aria-hidden="true">${CHEV_SVG}</span>` : '';

        btn.innerHTML = `${iconHtml}<span class="lbl" part="label">${esc(item.label)}</span>${badgeHtml}${chevHtml}`;

        const entry = {
          item,
          btn,
          icoWrap: btn.querySelector('.ico-wrap'),
          badgeEl: btn.querySelector('.badge'),
          railDot: btn.querySelector('.rail-dot'),
          chevEl: btn.querySelector('.chev'),
          parentValue,
          isChild,
          groupIdx,
          subId,
          expanded,
        };
        this._entries.set(item.value, entry);
        this._flatButtons.push(entry);
        return entry;
      };

      this._nodes.forEach((node) => {
        if (node.type === 'group') {
          groupIdx++;
          const g = document.createElement('div');
          g.className = 'grp';
          g.setAttribute('role', 'presentation');
          g.setAttribute('part', 'group');
          g.textContent = node.label;
          frag.append(g);
          return;
        }
        if (node.type === 'divider') {
          groupIdx++;
          const d = document.createElement('div');
          d.className = 'div';
          d.setAttribute('role', 'separator');
          d.setAttribute('part', 'divider');
          frag.append(d);
          return;
        }
        const entry = makeButton(node, false, null);
        frag.append(entry.btn);

        if (node.children.length) {
          const wrap = document.createElement('div');
          wrap.className = 'sub-wrap';
          wrap.id = entry.subId;
          wrap.setAttribute('role', 'group');
          wrap.setAttribute('aria-label', node.label);
          wrap.setAttribute('part', 'submenu');

          const inner = document.createElement('div');
          inner.className = 'sub-inner';

          node.children.forEach((ch) => {
            const cEntry = makeButton(ch, true, node.value);
            inner.append(cEntry.btn);
          });

          wrap.append(inner);
          frag.append(wrap);

          const open = entry.expanded;
          wrap.inert = !open;
          wrap.setAttribute('aria-hidden', String(!open));
          wrap.style.setProperty('--h', open ? 'auto' : '0px');
          wrap.style.overflow = open ? 'visible' : 'hidden';
          if (entry.chevEl) entry.chevEl.style.transform = open ? 'rotate(90deg)' : '';

          this._subs.set(node.value, {
            value: node.value,
            entry,
            wrap,
            inner,
            expanded: open,
            settled: true,
            naturalH: 0,
            p: new Spring(open ? 1 : 0, 340, 23),
            ch: new Spring(open ? 1 : 0, 440, 15),
          });
        }
      });

      this.navList.append(frag);

      // Default to first selectable leaf if value not set or not found
      if (this._value && !this._entries.has(this._value)) {
        // Keep attribute value, no active match
      } else if (!this._value) {
        const firstLeaf = this._flatButtons.find((e) => !e.item.disabled && !e.item.children.length);
        if (firstLeaf) {
          this._value = firstLeaf.item.value;
          this.setAttribute('value', this._value);
        }
      }

      this._syncActiveClasses();
      this._snapIndicator();
    }

    _syncActiveClasses() {
      let activeParent = null;
      const cur = this._entries.get(this._value);
      if (cur && cur.isChild) activeParent = cur.parentValue;

      for (const e of this._flatButtons) {
        const isAct = e.item.value === this._value;
        e.btn.classList.toggle('active', isAct);
        if (isAct) e.btn.setAttribute('aria-current', 'page');
        else e.btn.removeAttribute('aria-current');
        e.btn.classList.toggle('has-active', e.item.value === activeParent);
      }
    }

    _activeTargetEntry() {
      const e = this._entries.get(this._value);
      if (!e) return null;
      if (e.isChild) {
        const sub = this._subs.get(e.parentValue);
        if (this._collapsed || (sub && !sub.expanded)) {
          return this._entries.get(e.parentValue) || null;
        }
      }
      return e;
    }

    _relRect(el) {
      let x = 0, y = 0, cur = el;
      while (cur && cur !== this.navList) {
        x += cur.offsetLeft;
        y += cur.offsetTop;
        cur = cur.offsetParent;
      }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    }

    _snapIndicator() {
      const target = this._activeTargetEntry();
      if (!target || !target.btn.isConnected) {
        this._indOn = false;
        this.ind.classList.remove('on');
        return;
      }
      const r = this._relRect(target.btn);
      if (r.w <= 0 || r.h <= 0) return;
      this._indOn = true;
      this.ind.classList.add('on');
      this.indX.x = this.indX.to = r.x; this.indX.v = 0;
      this.indY.x = this.indY.to = r.y; this.indY.v = 0;
      this.indW.x = this.indW.to = r.w; this.indW.v = 0;
      this.indH.x = this.indH.to = r.h; this.indH.v = 0;
      this.indSquash.x = this.indSquash.to = 1; this.indSquash.v = 0;
      this.ind.style.width = `${r.w}px`;
      this.ind.style.height = `${r.h}px`;
      this.ind.style.transform = `translate(${r.x}px, ${r.y}px)`;
    }

    _visibleEntries() {
      return this._flatButtons.filter((e) => {
        if (e.item.disabled) return false;
        if (e.isChild) {
          if (this._collapsed) return false;
          const sub = this._subs.get(e.parentValue);
          if (!sub || !sub.expanded) return false;
        }
        return true;
      });
    }

    _sfxPos(cy, wordW) {
      const pr = this.panel.getBoundingClientRect();
      const half = wordW * 0.46 + 10;
      const rightEdge = pr.right + scrollX;
      const leftEdge = pr.left + scrollX;
      const rightRoom = window.innerWidth - pr.right;
      const leftRoom = pr.left;
      let sx, sy = cy - 6;

      if (leftRoom >= wordW * 0.85 + 14) {
        sx = leftEdge - half;
      } else if (rightRoom >= wordW * 0.85 + 14) {
        sx = rightEdge + half;
      } else {
        sx = rightEdge - half;
        sy = pr.top + scrollY - 18;
      }
      sx = clamp(sx, scrollX + half, scrollX + Math.max(half, window.innerWidth - half));
      sy = clamp(sy, scrollY + 26, scrollY + Math.max(26, window.innerHeight - 26));
      return { x: sx, y: sy, rightEdge, leftEdge, pr };
    }

    _pulseItem(btn, scaleY = 0.88, vel = 4) {
      if (fx.calm) return;
      let s = this._itemPops.get(btn);
      if (!s) {
        s = new Spring(1, 520, 15);
        this._itemPops.set(btn, s);
      }
      s.x = scaleY;
      s.v = vel;
      s.to = 1;
    }

    select(value, silent = false) {
      const nextVal = value == null ? '' : String(value);
      const entry = this._entries.get(nextVal);
      if (!entry || entry.item.disabled) return;
      if (entry.item.children.length) {
        this.toggleGroup(nextVal);
        return;
      }

      const prevVal = this._value;
      const prevTarget = this._activeTargetEntry();
      const visBefore = this._visibleEntries();
      const oldVisIdx = prevTarget ? visBefore.indexOf(prevTarget) : -1;

      if (nextVal === prevVal && !silent) return;

      // Auto-expand parent submenu when selecting a nested child
      if (entry.isChild) {
        const sub = this._subs.get(entry.parentValue);
        if (sub && !sub.expanded) {
          this._setGroupOpen(entry.parentValue, true, !silent);
        }
      }

      this._value = nextVal;
      if (this.getAttribute('value') !== nextVal) this.setAttribute('value', nextVal);
      this._syncActiveClasses();

      const newTarget = this._activeTargetEntry();
      const visAfter = this._visibleEntries();
      const newVisIdx = newTarget ? visAfter.indexOf(newTarget) : -1;

      if (!silent) {
        const payload = { ...entry.item };
        this.emit('change', {
          value: entry.item.value,
          label: entry.item.label,
          item: payload,
          prev: prevVal,
        });
      }

      if (!newTarget) {
        this._indOn = false;
        this.ind.classList.remove('on');
        return;
      }

      const r = this._relRect(newTarget.btn);
      if (silent || fx.calm || !this._indOn) {
        this._snapIndicator();
        return;
      }

      const oldY = this.indY.x;
      const dy = r.y - oldY;
      const rowDist = oldVisIdx >= 0 && newVisIdx >= 0 ? Math.abs(newVisIdx - oldVisIdx) : Math.round(Math.abs(dy) / 40);
      const crossedGroup = prevTarget ? (prevTarget.groupIdx !== newTarget.groupIdx) : false;
      const isLong = rowDist >= 3 || (crossedGroup && rowDist >= 2) || Math.abs(dy) >= 120;
      const dir = Math.sign(dy) || 1;

      this.indX.to = r.x;
      this.indY.to = r.y;
      this.indW.to = r.w;
      this.indH.to = r.h;

      // Snappy launch impulse so mid-flight stretch reads clearly on frame 2-4
      this.indY.v += dir * (isLong ? 380 : 140);
      this._pulseItem(newTarget.btn, 0.92, 5.2);

      // Launch speed lines on long jump
      if (isLong) {
        const pr = this.panel.getBoundingClientRect();
        const midY = this.navList.getBoundingClientRect().top + scrollY + (oldY + r.y) / 2 + r.h / 2;
        const trailDir = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
        lines(pr.left + scrollX - 8, midY, { n: 5, dir: trailDir, len: Math.min(82, Math.abs(dy) * 0.45), spread: 8, life: 0.32 });
      }

      this._jumpPending = {
        entry: newTarget,
        isLong,
        dir,
        seq: ++this._seq,
      };
    }

    _fireLanding(jump) {
      const { entry, isLong, dir, seq } = jump;
      if (!entry.btn.isConnected) return;

      this.indSquash.x = isLong ? 0.78 : 0.87;
      this.indSquash.v = isLong ? 5.6 : 3.2;
      this.indSquash.to = 1;

      if (entry.icoWrap) {
        this._icoPopEl = entry.icoWrap;
        this.icoPopS.x = isLong ? 0.74 : 0.84;
        this.icoPopS.v = isLong ? 11 : 7.5;
        this.icoPopS.to = 1;
      }

      const c = at(entry.btn);
      const pr = this.panel.getBoundingClientRect();
      const leftEdge = pr.left + scrollX;
      const rightEdge = pr.right + scrollX;

      if (isLong) {
        // Long jump: crescent slash + braking puffs + pink ticks + vertical speed lines + hollow シュッ outside panel
        const pos = this._sfxPos(c.y, 74);
        slash(c.x, c.y - 8, { len: Math.min(126, Math.max(76, c.w * 0.60)), ang: dir > 0 ? -0.10 : 0.10, thick: 8.5, life: 0.30, col: P.accent });
        ticks(leftEdge - 4, c.y, { dir: Math.PI, n: 4, r: 5, len: 16, fan: 0.44, life: 0.40 });
        puff(leftEdge - 14, c.y - dir * 6, { size: 8, n: 4, vx: -22, vy: -dir * 16, life: 0.56 });
        lines(rightEdge + 8, c.y - dir * 16, { n: 5, dir: dir > 0 ? -Math.PI / 2 : Math.PI / 2, len: 46, spread: 9, life: 0.30 });
        sfx('shu', pos.x, pos.y, { size: 74, rot: -0.11, life: 0.52, ...hollow() });
        later(75, () => {
          if (seq !== this._seq || !this.isConnected) return;
          puff(rightEdge + 12, c.y + dir * 8, { size: 6, n: 3, vx: 16, vy: -dir * 8, life: 0.44 });
        });
      } else {
        // Short jump: pink ticks off left edge + compact puff + hollow カチッ outside panel
        const pos = this._sfxPos(c.y, 62);
        ticks(leftEdge - 4, c.y, { dir: Math.PI, n: 3, r: 4, len: 13, fan: 0.46, life: 0.36 });
        puff(leftEdge - 12, c.y + dir * 4, { size: 6, n: 3, vx: -16, vy: -dir * 10, life: 0.44 });
        sfx('kachi', pos.x, pos.y, { size: 62, rot: -0.09, life: 0.44, ...hollow() });
      }
    }

    toggleGroup(value) {
      const sub = this._subs.get(String(value));
      if (!sub) return;
      this._setGroupOpen(sub.value, !sub.expanded, true);
    }

    _setGroupOpen(value, next, emitEvent = true) {
      const sub = this._subs.get(value);
      if (!sub || sub.expanded === next) return;
      sub.expanded = next;
      sub.entry.expanded = next;
      sub.entry.btn.classList.toggle('expanded', next);
      sub.entry.btn.setAttribute('aria-expanded', String(next));
      sub.wrap.setAttribute('aria-hidden', String(!next));
      sub.wrap.inert = !next;
      sub.naturalH = sub.inner.scrollHeight;

      if (emitEvent) {
        this.emit('sakuga:toggle', { value, expanded: next });
      }

      if (fx.calm) {
        sub.p.x = sub.p.to = next ? 1 : 0; sub.p.v = 0;
        sub.ch.x = sub.ch.to = next ? 1 : 0; sub.ch.v = 0;
        sub.settled = true;
        sub.wrap.style.setProperty('--h', next ? 'auto' : '0px');
        sub.wrap.style.overflow = next ? 'visible' : 'hidden';
        sub.inner.style.transform = '';
        if (sub.entry.chevEl) sub.entry.chevEl.style.transform = next ? 'rotate(90deg)' : '';
        this._snapIndicator();
        return;
      }

      sub.settled = false;
      sub.wrap.style.overflow = 'hidden';
      this._pulseItem(sub.entry.btn, 0.88, 5.4);

      if (next) {
        sub.p.k = 340; sub.p.d = 23; sub.p.to = 1;
        sub.ch.k = 440; sub.ch.d = 15; sub.ch.to = 1;
        if (!this._collapsed) {
          const chevPt = sub.entry.chevEl ? at(sub.entry.chevEl) : at(sub.entry.btn, 0.9, 0.5);
          const pr = this.panel.getBoundingClientRect();
          ticks(pr.right + scrollX + 4, chevPt.y, { dir: -0.25, n: 3, r: 4, len: 12, fan: 0.44, life: 0.36 });
          puff(pr.right + scrollX + 10, chevPt.y + 6, { size: 5.5, n: 3, vx: 15, vy: 4, life: 0.40 });
        }
      } else {
        const curH = sub.wrap.getBoundingClientRect().height;
        if (sub.naturalH > 0) sub.p.x = Math.min(1.08, curH / sub.naturalH);
        sub.wrap.style.setProperty('--h', `${curH.toFixed(1)}px`);
        sub.p.k = 480; sub.p.d = 32; sub.p.to = 0;
        sub.ch.k = 440; sub.ch.d = 22; sub.ch.to = 0;
        if (!this._collapsed) {
          const pr = this.panel.getBoundingClientRect();
          const bt = at(sub.entry.btn, 0.5, 1);
          puff(pr.right + scrollX + 8, bt.y, { size: 5, n: 3, vx: 12, vy: -8, life: 0.36 });
        }
      }

      // If active item was inside this submenu, glide indicator to parent or child
      const cur = this._entries.get(this._value);
      if (cur && cur.parentValue === value) {
        const target = this._activeTargetEntry();
        if (target) {
          const r = this._relRect(target.btn);
          this.indX.to = r.x;
          this.indY.to = r.y;
          this.indW.to = r.w;
          this.indH.to = r.h;
        }
      }
    }

    toggleCollapse() {
      this._setCollapsed(!this._collapsed, true);
    }

    _measureWidth(wantCollapsed) {
      if (wantCollapsed) {
        return this.probeR?.offsetWidth || 68;
      }
      const prevStyleW = this.panel.style.width;
      const hadCol = this.panel.classList.contains('collapsed');
      const hadRail = this.panel.classList.contains('rail-ui');
      this.panel.style.width = '';
      this.panel.classList.remove('collapsed', 'rail-ui');
      const w = this.panel.getBoundingClientRect().width || 248;
      this.panel.classList.toggle('collapsed', hadCol);
      this.panel.classList.toggle('rail-ui', hadRail);
      this.panel.style.width = prevStyleW;
      return w;
    }

    _setCollapsed(want, emitEvent = true) {
      if (want === this._collapsed) return;
      const startW = this.panel.getBoundingClientRect().width;
      const targetW = this._measureWidth(want);

      this._collapsed = want;
      if (boolAttr(this, 'collapsed') !== want) this.toggleAttribute('collapsed', want);
      this.colBtn.setAttribute('aria-expanded', String(!want));
      this.colBtn.setAttribute('aria-label', want ? 'Expand sidebar' : 'Collapse sidebar');
      this._hideTip(true);

      if (emitEvent) {
        this.emit('sakuga:collapse', { collapsed: want });
      }

      if (fx.calm) {
        this._widthAnim = false;
        this._applyStaticCollapsed();
        this._snapIndicator();
        return;
      }

      this.colSq.s.x = Math.min(this.colSq.s.x, 0.80);
      this.colSq.s.v += 3.8;
      this.colChevS.to = want ? 1 : 0;

      this._widthAnim = true;
      this._widthStart = startW;
      this._widthTarget = targetW;
      this.panel.classList.add('resizing');
      this.panel.classList.toggle('collapsed', want);
      this.panel.style.width = `${startW.toFixed(1)}px`;

      this.widthS.x = startW;
      this.widthS.to = targetW;
      this.widthS.v = want ? -260 : 260;

      // Brisk horizontal speed lines + seam puffs + hollow シュッ
      const seq = ++this._seq;
      const pr = this.panel.getBoundingClientRect();
      const midY = pr.top + scrollY + pr.height * 0.45;
      const edgeX = pr.right + scrollX;
      const sweepDir = want ? Math.PI : 0;
      lines(edgeX + (want ? 4 : -6), midY, {
        n: 6,
        dir: sweepDir,
        len: 46,
        spread: Math.min(110, pr.height * 0.28),
        life: 0.34,
      });
      puff(edgeX + 6, pr.top + scrollY + 56, { size: 7.5, n: 4, vx: want ? -16 : 22, vy: -8, life: 0.50 });
      puff(edgeX + 6, pr.bottom + scrollY - 56, { size: 7, n: 3, vx: want ? -14 : 20, vy: 8, life: 0.48 });

      later(65, () => {
        if (seq !== this._seq || !this.isConnected) return;
        const p2 = this.panel.getBoundingClientRect();
        const wordW = 72;
        const half = wordW * 0.46 + 10;
        const leftRoom = p2.left;
        const sy = clamp(p2.top + scrollY + 22, scrollY + 30, scrollY + Math.max(30, window.innerHeight - 30));
        const sx = leftRoom >= wordW * 0.85 + 14
          ? clamp(p2.left + scrollX - half, scrollX + half, scrollX + Math.max(half, window.innerWidth - half))
          : clamp(p2.right + scrollX + half, scrollX + half, scrollX + Math.max(half, window.innerWidth - half));
        sfx('shu', sx, sy, { size: wordW, rot: want ? -0.14 : 0.08, life: 0.48, ...hollow() });
      });
    }

    setBadge(value, badge, tone) {
      const entry = this._entries.get(String(value));
      if (!entry) return;
      const text = badge === null || badge === undefined || String(badge) === '' ? '' : String(badge);
      entry.item.badge = text;
      if (tone !== undefined) entry.item.badgeTone = normTone(tone);

      const toneKey = entry.item.badgeTone;
      if (entry.badgeEl) {
        entry.badgeEl.textContent = text;
        entry.badgeEl.dataset.tone = toneKey;
        entry.badgeEl.hidden = !text;
      }
      if (entry.railDot) {
        entry.railDot.dataset.tone = toneKey;
        entry.railDot.classList.toggle('show', !!text);
      }
      if (this._tipVisible && this._tipEntry === entry) {
        this._syncTipContent(entry);
      }

      if (fx.calm || !text) return;

      // Spring pop on badge pill (or rail icon when collapsed) + kira glint!
      const popTarget = this._collapsed ? entry.icoWrap : entry.badgeEl;
      if (popTarget && popTarget.isConnected) {
        let sp = this._badgePops.get(popTarget);
        if (!sp) {
          sp = new Spring(1, 540, 14);
          this._badgePops.set(popTarget, sp);
        }
        sp.x = 0.28;
        sp.v = 14.5;
        sp.to = 1;

        const bPt = at(popTarget);
        kira(bPt.x + bPt.w * 0.42, bPt.y - bPt.h * 0.42, { r: 10.5, life: 0.56 });
        ticks(bPt.x + bPt.w * 0.5 + 3, bPt.y - 4, { dir: -0.55, n: 2, r: 4, len: 10, fan: 0.48, life: 0.34 });
      }
    }

    _syncTipContent(entry) {
      this.tipLbl.textContent = entry.item.label;
      if (entry.item.children.length) {
        this.tipSub.textContent = `${entry.item.children.length} items`;
        this.tipSub.hidden = false;
      } else {
        this.tipSub.hidden = true;
      }
      if (entry.item.badge) {
        this.tipBadge.textContent = entry.item.badge;
        this.tipBadge.dataset.tone = entry.item.badgeTone;
        this.tipBadge.hidden = false;
      } else {
        this.tipBadge.hidden = true;
      }
    }

    _showTip(entry) {
      if (!this._collapsed || !entry || !entry.btn.isConnected) return;
      const wasVisible = this._tipVisible;
      this._tipEntry = entry;
      this._tipVisible = true;
      this._syncTipContent(entry);
      this.tip.classList.add('on');
      this.tip.setAttribute('aria-hidden', 'false');

      const pr = this.panel.getBoundingClientRect();
      const br = entry.btn.getBoundingClientRect();
      const tw = this.tip.offsetWidth || 120;
      const th = this.tip.offsetHeight || 34;

      const rightSpace = window.innerWidth - pr.right;
      const flip = rightSpace < tw + 20 && pr.left > tw + 20;
      this._tipFlip = flip;
      this.tip.classList.toggle('flip', flip);

      const tx = flip
        ? Math.max(8, pr.left - tw - 12)
        : Math.min(window.innerWidth - tw - 8, pr.right + 12);
      const ty = clamp(br.top + br.height / 2 - th / 2, 8, Math.max(8, window.innerHeight - th - 8));

      this._tipX = Math.round(tx);
      this.tip.style.left = `${this._tipX}px`;
      this.tipY.to = ty;
      if (!wasVisible || fx.calm) {
        this.tipY.x = ty;
        this.tipY.v = 0;
        this.tip.style.top = `${Math.round(ty)}px`;
      }
      if (fx.calm) {
        this.tipS.x = this.tipS.to = 1; this.tipS.v = 0;
        this.tip.style.transform = '';
      } else {
        this.tipS.to = 1;
        if (!wasVisible) {
          this.tipS.x = 0.08;
          this.tipS.v = 7.5;
          this.tip.style.transform = 'scale(0.08)';
        } else {
          this.tipS.x = Math.min(this.tipS.x, 0.9);
          this.tipS.v += 3.2;
        }
      }
    }

    _hideTip(immediate = false) {
      if (!this._tipVisible && !immediate) return;
      this._tipVisible = false;
      this._tipEntry = null;
      this.tip.setAttribute('aria-hidden', 'true');
      if (immediate || fx.calm) {
        this.tipS.x = this.tipS.to = 0; this.tipS.v = 0;
        this.tip.classList.remove('on');
        this.tip.style.transform = 'scale(0)';
      } else {
        this.tipS.to = 0;
        this.tipS.v = Math.min(this.tipS.v, -3);
      }
    }

    _onKeyDown(e) {
      const btn = e.target.closest('.item');
      if (!btn) return;
      const val = btn.dataset.value;
      const entry = this._entries.get(val);
      if (!entry) return;

      const vis = this._visibleEntries();
      const idx = vis.indexOf(entry);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!vis.length) return;
        const next = vis[(idx + 1) % vis.length];
        next.btn.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!vis.length) return;
        const prev = vis[(idx - 1 + vis.length) % vis.length];
        prev.btn.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        if (vis.length) vis[0].btn.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        if (vis.length) vis[vis.length - 1].btn.focus();
      } else if (e.key === 'ArrowRight') {
        if (entry.item.children.length && !this._collapsed) {
          e.preventDefault();
          const sub = this._subs.get(val);
          if (sub && !sub.expanded) {
            this.toggleGroup(val);
          } else if (sub && sub.expanded) {
            const firstChild = entry.item.children
              .map((c) => this._entries.get(c.value))
              .find((ce) => ce && !ce.item.disabled);
            if (firstChild) firstChild.btn.focus();
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (entry.item.children.length && !this._collapsed) {
          const sub = this._subs.get(val);
          if (sub && sub.expanded) {
            e.preventDefault();
            this.toggleGroup(val);
          }
        } else if (entry.isChild && entry.parentValue) {
          e.preventDefault();
          const parentEntry = this._entries.get(entry.parentValue);
          if (parentEntry) parentEntry.btn.focus();
        }
      } else if (e.key === 'Escape' && this._tipVisible) {
        this._hideTip();
      }
    }

    frame(dt) {
      if (fx.calm) return;

      this.colSq.step(dt);

      // Collapse toggle chevron spring
      const ccv = this.colChevS.step(dt);
      const ccvStill = Math.abs(ccv - this.colChevS.to) < 0.002 && Math.abs(this.colChevS.v) < 0.02;
      this.colSvg.style.transform = ccvStill
        ? (this._collapsed ? 'rotate(180deg)' : '')
        : `rotate(${(ccv * 180).toFixed(1)}deg)`;

      // Panel width spring (expanded <-> collapsed rail)
      let layoutShifted = false;
      if (this._widthAnim) {
        layoutShifted = true;
        const w = Math.max(56, this.widthS.step(dt));
        const midW = (this._widthStart + this._widthTarget) * 0.54;
        if (this._collapsed && w < midW) {
          this.panel.classList.add('rail-ui');
        } else if (!this._collapsed && w > midW) {
          this.panel.classList.remove('rail-ui');
        }
        const done = Math.abs(w - this._widthTarget) < 0.5 && Math.abs(this.widthS.v) < 3;
        if (done) {
          this._widthAnim = false;
          this.panel.classList.remove('resizing');
          this.panel.classList.toggle('rail-ui', this._collapsed);
          this.panel.style.width = '';
          this._snapIndicator();
        } else {
          this.panel.style.width = `${w.toFixed(1)}px`;
        }
      }

      // Submenu height & chevron springs
      for (const sub of this._subs.values()) {
        const cv = sub.ch.step(dt);
        const cvTarget = sub.expanded ? 1 : 0;
        if (sub.entry.chevEl) {
          const cStill = Math.abs(cv - cvTarget) < 0.002 && Math.abs(sub.ch.v) < 0.02;
          sub.entry.chevEl.style.transform = cStill
            ? (sub.expanded ? 'rotate(90deg)' : '')
            : `rotate(${(cv * 90).toFixed(1)}deg)`;
        }

        if (sub.settled) continue;
        layoutShifted = true;
        const v = sub.p.step(dt);
        const nat = sub.inner.scrollHeight || sub.naturalH;
        sub.naturalH = nat;

        if (sub.expanded) {
          if (v > 0.994 && Math.abs(v - 1) < 0.006 && Math.abs(sub.p.v) < 0.06) {
            sub.settled = true;
            sub.wrap.style.setProperty('--h', 'auto');
            sub.wrap.style.overflow = 'visible';
            sub.inner.style.transform = '';
          } else {
            const h = Math.max(0, v * nat);
            sub.wrap.style.setProperty('--h', `${h.toFixed(1)}px`);
            const sy = v < 1 ? (0.88 + 0.12 * Math.max(0, v)) : (1 + (v - 1) * 0.35);
            const sx = 1 / Math.sqrt(Math.max(0.6, sy));
            sub.inner.style.transform = `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
          }
        } else {
          if (v < 0.006 && Math.abs(sub.p.v) < 0.14) {
            sub.settled = true;
            sub.wrap.style.setProperty('--h', '0px');
            sub.wrap.style.overflow = 'hidden';
            sub.inner.style.transform = '';
          } else {
            const h = Math.max(0, v * nat);
            sub.wrap.style.setProperty('--h', `${h.toFixed(1)}px`);
            const sy = 0.9 + 0.1 * clamp(v, 0, 1);
            sub.inner.style.transform = `scaleY(${sy.toFixed(4)})`;
          }
        }
      }

      // Keep active indicator target synchronized during layout changes (submenus / width resize)
      if (layoutShifted && this._indOn) {
        const target = this._activeTargetEntry();
        if (target && target.btn.isConnected) {
          const r = this._relRect(target.btn);
          if (r.w > 0 && r.h > 0) {
            this.indX.to = r.x;
            this.indY.to = r.y;
            this.indW.to = r.w;
            this.indH.to = r.h;
            if (this._widthAnim) {
              this.indX.x = r.x; this.indX.v = 0;
              this.indW.x = r.w; this.indW.v = 0;
              this.indY.x = r.y; this.indY.v = 0;
              this.indH.x = r.h; this.indH.v = 0;
            }
          }
        }
      }

      // Kinetic vertical active capsule
      if (this._indOn) {
        const ix = this.indX.step(dt);
        const iy = this.indY.step(dt);
        const iw = Math.max(24, this.indW.step(dt));
        const ih = Math.max(22, this.indH.step(dt));
        const sq = Math.max(0.62, this.indSquash.step(dt));

        if (this._jumpPending && Math.abs(iy - this.indY.to) < 6) {
          const hit = this._jumpPending;
          this._jumpPending = null;
          this._fireLanding(hit);
        }

        const speed = Math.abs(this.indY.v);
        const velStretch = Math.min(0.28, speed * 0.00038);
        const sy = (1 + velStretch) * sq;
        const sx = 1 / Math.sqrt(Math.max(0.55, sy));

        const still = Math.abs(ix - this.indX.to) < 0.12 && Math.abs(this.indX.v) < 0.4
          && Math.abs(iy - this.indY.to) < 0.12 && speed < 0.4
          && Math.abs(iw - this.indW.to) < 0.15 && Math.abs(this.indW.v) < 0.4
          && Math.abs(ih - this.indH.to) < 0.15 && Math.abs(this.indH.v) < 0.4
          && Math.abs(sq - 1) < 0.002 && Math.abs(this.indSquash.v) < 0.02;

        if (still) {
          this.ind.style.width = `${this.indW.to}px`;
          this.ind.style.height = `${this.indH.to}px`;
          this.ind.style.transform = `translate(${this.indX.to}px, ${this.indY.to}px)`;
        } else {
          this.ind.style.width = `${iw.toFixed(2)}px`;
          this.ind.style.height = `${ih.toFixed(2)}px`;
          this.ind.style.transform = `translate(${ix.toFixed(2)}px, ${iy.toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
        }
      }

      // Active icon pop
      if (this._icoPopEl && this._icoPopEl.isConnected) {
        const ps = Math.max(0.55, this.icoPopS.step(dt));
        const px = 1 / Math.sqrt(ps);
        const still = Math.abs(ps - 1) < 0.002 && Math.abs(this.icoPopS.v) < 0.02;
        if (still) {
          this._icoPopEl.style.transform = '';
          this._icoPopEl = null;
        } else {
          this._icoPopEl.style.transform = `scale(${px.toFixed(4)}, ${ps.toFixed(4)})`;
        }
      }

      // Per-button tactile press & pop
      for (const [btn, sp] of this._itemPops) {
        if (!btn.isConnected) { this._itemPops.delete(btn); continue; }
        const y = Math.max(0.72, sp.step(dt));
        const x = 1 + (1 - y) * 0.22;
        const still = Math.abs(y - 1) < 0.0015 && Math.abs(sp.v) < 0.015;
        if (still) {
          btn.style.transform = '';
          this._itemPops.delete(btn);
        } else {
          btn.style.transform = `scale(${x.toFixed(4)}, ${y.toFixed(4)})`;
        }
      }

      // Badge pop springs
      for (const [el, sp] of this._badgePops) {
        if (!el.isConnected) { this._badgePops.delete(el); continue; }
        const s = Math.max(0.2, sp.step(dt));
        const sx = 1 / Math.sqrt(Math.max(0.55, s));
        const still = Math.abs(s - 1) < 0.002 && Math.abs(sp.v) < 0.02;
        if (still) {
          el.style.transform = '';
          this._badgePops.delete(el);
        } else {
          el.style.transform = `scale(${(sx * s).toFixed(4)}, ${s.toFixed(4)})`;
        }
      }

      // Collapsed icon-rail speech-bubble tooltip spring
      if (this._tipVisible || this.tip.classList.contains('on')) {
        const ts = Math.max(0, this.tipS.step(dt));
        const ty = this.tipY.step(dt);
        if (!this._tipVisible && ts < 0.04) {
          this.tipS.x = 0; this.tipS.v = 0;
          this.tip.classList.remove('on');
          this.tip.style.transform = 'scale(0)';
        } else {
          this.tip.style.left = `${this._tipX}px`;
          this.tip.style.top = `${ty.toFixed(1)}px`;
          const tilt = (1 - Math.min(1.15, ts)) * (this._tipFlip ? 4.5 : -4.5);
          const still = this._tipVisible
            && Math.abs(ts - 1) < 0.0015 && Math.abs(this.tipS.v) < 0.015
            && Math.abs(ty - this.tipY.to) < 0.15 && Math.abs(this.tipY.v) < 0.4;
          this.tip.style.transform = still ? '' : `scale(${ts.toFixed(4)}) rotate(${tilt.toFixed(2)}deg)`;
        }
      }
    }
  }

  fx.define('sakuga-sidebar', SakugaSidebar);
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
