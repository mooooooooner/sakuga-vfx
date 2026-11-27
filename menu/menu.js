// Sakuga Menu: triggered manga action / context menu with a spring-animated speech-bubble panel,
// cel-shaded sliding highlight pill, keyboard shortcuts, checkable items, dividers, and an anime slash for danger actions.
// Plain crisp ink-bordered trigger at rest (or any slotted trigger).
// Opening springs out a manga speech bubble with a ring off the trigger, side puffs, and corner pink wedges;
// picking a normal item pops it with ticks, puff, kira glint, and hollow カチッ;
// toggling a checkable item pops the pink checkmark with kira, ticks, and hollow ポン;
// triggering a danger item slices it with a pink crescent slash, crystal shards, corner ticks, impact inversion, and hollow ドン.
(() => {
'use strict';

function component(fx) {
  const { Spring, clamp, later, at, esc, squashy, ticks, puff, shards, ring, slash, kira, sfx, hollow } = fx;

  let uid = 0;

  const ICONS = {
    edit: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.6 3.2l3.2 3.2L7.4 15.8 3.2 16.8l1-4.2L13.6 3.2z"/><path d="M11.6 5.2l3.2 3.2"/></svg>',
    copy: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7.2" y="7.2" width="9.6" height="9.6" rx="2"/><path d="M12.8 7.2V4.8a1.8 1.8 0 0 0-1.8-1.8H4.8A1.8 1.8 0 0 0 3 4.8V11a1.8 1.8 0 0 0 1.8 1.8h2.4"/></svg>',
    share: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9.2M6.2 6.8L10 3l3.8 3.8"/><path d="M4 12.2v3a1.8 1.8 0 0 0 1.8 1.8h8.4a1.8 1.8 0 0 0 1.8-1.8v-3"/></svg>',
    star: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.6l2.3 4.7 5.2.7-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.2-.7L10 2.6z"/></svg>',
    pin: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.2 3.2l4.6 4.6M13.3 4.3l-4.1 4.1-3.2-.4-1.2 1.2 6 6 1.2-1.2-.4-3.2 4.1-4.1M7.8 12.2L3.2 16.8"/></svg>',
    trash: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.4 5.6h13.2M7.6 5.6V4a1.2 1.2 0 0 1 1.2-1.2h2.4A1.2 1.2 0 0 1 12.4 4v1.6M5.4 5.6l.9 10.4a1.6 1.6 0 0 0 1.6 1.4h4.2a1.6 1.6 0 0 0 1.6-1.4l.9-10.4M8.5 9v5M11.5 9v5"/></svg>',
    check: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.6 10.5l4.4 4.4 8.4-9.2"/></svg>',
    bolt: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.2 2.4L4.4 11h5.1l-.7 6.6L15.6 9h-5.1l.7-6.6z"/></svg>',
    download: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v9.2M6.2 8.6L10 12.4l3.8-3.8"/><path d="M4 13.4v2a1.6 1.6 0 0 0 1.6 1.6h8.8a1.6 1.6 0 0 0 1.6-1.6v-2"/></svg>',
  };

  const CHEV_SVG = '<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 5.8L8 10.4l4.5-4.6"/></svg>';
  const CHK_SVG = '<svg class="chk-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.6 8.3l3.6 3.7L13.4 4"/></svg>';

  const boolAttr = (el, name) => el.hasAttribute(name) && el.getAttribute(name) !== 'false';

  function normalizeItem(it, i) {
    if (!it || it.divider) return { divider: true };
    const label = String(it.label ?? it.value ?? '');
    const value = it.value !== undefined && it.value !== null ? String(it.value) : (label || String(i));
    const checkable = !!it.checkable || it.checked !== undefined;
    return {
      divider: false,
      value,
      label,
      shortcut: it.shortcut ? String(it.shortcut) : '',
      icon: it.icon ? String(it.icon) : '',
      danger: !!it.danger,
      checkable,
      checked: checkable ? !!it.checked : false,
      disabled: !!it.disabled,
    };
  }

  function renderIcon(icon) {
    if (!icon) return '';
    const key = icon.trim().toLowerCase();
    if (ICONS[key]) return `<span class="ico" part="icon" aria-hidden="true">${ICONS[key]}</span>`;
    return `<span class="ico glyph" part="icon" aria-hidden="true">${esc(icon)}</span>`;
  }

  class SakugaMenu extends fx.Base {
    static delegates = true;
    static fromChildren = true;
    static observedAttributes = ['label', 'align', 'disabled', 'compact'];

    static css = `
      :host { display: inline-block; max-width: 100%; isolation: auto; }
      .trig-wrap { display: inline-block; max-width: 100%; will-change: transform; }
      :host([disabled]) .trig-wrap { opacity: .5; }
      .trig {
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        min-height: 44px; max-width: 100%; padding: 9px 15px 9px 17px;
        border: var(--sk-bw, 3.2px) solid var(--sk-btn-line, var(--sk-ink));
        border-radius: var(--sk-r, 15px);
        background: var(--sk-card); color: var(--sk-ink);
        box-shadow: var(--sk-btn-sh, var(--sk-sh));
        font-weight: 800; font-size: 15px; line-height: 1.2;
        cursor: pointer; user-select: none; -webkit-user-select: none; touch-action: manipulation;
        will-change: transform;
      }
      :host([compact]) .trig {
        min-height: 36px; gap: 6px; padding: 6px 12px 6px 14px;
        font-size: 13.5px; border-radius: calc(var(--sk-r, 15px) - 3px);
        box-shadow: 4px 5px 0 var(--sk-soft);
      }
      .trig:hover:not(:disabled) { background: var(--sk-surface, color-mix(in srgb, var(--sk-soft) 18%, var(--sk-card))); }
      .trig:disabled { cursor: not-allowed; }
      .trig-lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .chev {
        flex: none; width: 15px; height: 15px;
        fill: none; stroke: currentColor; stroke-width: 2.6;
        stroke-linecap: round; stroke-linejoin: round;
        pointer-events: none; will-change: transform;
      }
      :host([compact]) .chev { width: 13px; height: 13px; }

      /* Manga speech-bubble menu panel */
      .pop {
        position: fixed; top: 0; left: 0; z-index: 2147482000;
        min-width: 214px; max-width: min(312px, calc(100vw - 16px));
        padding: 6px;
        border: var(--sk-bw, 3.2px) solid var(--sk-ink);
        border-radius: 16px;
        background: var(--sk-card);
        box-shadow: var(--sk-sh);
        color: var(--sk-ink);
        visibility: hidden; pointer-events: none;
        transform: scale(0);
        outline: none;
        will-change: transform;
      }
      :host([compact]) .pop { min-width: 188px; padding: 5px; border-radius: 13px; }
      .pop.open { visibility: visible; pointer-events: auto; transform: none; }
      .pop.closing { visibility: visible; pointer-events: none; }

      .pop.below::after {
        content: ""; position: absolute; left: var(--tail-x, 28px); bottom: 100%; margin-left: -9px;
        border: 9px solid transparent; border-bottom: 11px solid var(--sk-ink);
      }
      .pop.below::before {
        content: ""; position: absolute; left: var(--tail-x, 28px); bottom: calc(100% - 4.2px); margin-left: -6px;
        border: 6px solid transparent; border-bottom: 8px solid var(--sk-card); z-index: 1;
      }
      .pop.above::after {
        content: ""; position: absolute; left: var(--tail-x, 28px); top: 100%; margin-left: -9px;
        border: 9px solid transparent; border-top: 11px solid var(--sk-ink);
      }
      .pop.above::before {
        content: ""; position: absolute; left: var(--tail-x, 28px); top: calc(100% - 4.2px); margin-left: -6px;
        border: 6px solid transparent; border-top: 8px solid var(--sk-card); z-index: 1;
      }
      .pop.point::after, .pop.point::before { display: none; }

      .list {
        position: relative; display: flex; flex-direction: column; gap: 2px;
        max-height: calc(100vh - 32px); overflow-y: auto; scrollbar-width: thin;
      }

      /* Sliding cel-shaded highlight pill */
      .hl {
        position: absolute; left: 0; right: 0; top: 0; height: 36px;
        border: 2px solid var(--sk-ink); border-radius: 10px;
        background: color-mix(in srgb, var(--sk-soft) 32%, var(--sk-card));
        box-shadow: 2px 2px 0 var(--sk-soft);
        pointer-events: none; z-index: 0;
        display: none; transform-origin: center center;
        will-change: transform, height;
      }
      :host([compact]) .hl { border-radius: 8px; }
      .hl.on { display: block; }
      .hl.danger {
        border-color: var(--sk-acc);
        background: color-mix(in srgb, var(--sk-acc) 14%, var(--sk-card));
        box-shadow: 2px 2px 0 color-mix(in srgb, var(--sk-acc) 45%, var(--sk-card));
      }

      .item {
        position: relative; z-index: 1;
        display: flex; align-items: center; gap: 9px;
        width: 100%; min-height: 34px; padding: 5px 9px; margin: 0;
        border: 2px solid transparent; border-radius: 10px;
        background: transparent; color: var(--sk-ink);
        font-weight: 700; font-size: 14px; line-height: 1.25; text-align: left;
        cursor: pointer; user-select: none; -webkit-user-select: none;
        touch-action: manipulation; will-change: transform;
      }
      :host([compact]) .item { min-height: 31px; gap: 7px; padding: 4px 7px; font-size: 13px; border-radius: 8px; }
      .item:focus { outline: none; }
      .item:focus-visible { outline: 2px solid var(--sk-acc); outline-offset: -1px; }
      .item:disabled { opacity: .42; cursor: not-allowed; }

      .item.danger { color: var(--sk-acc); font-weight: 800; }
      .item.danger .ico { color: var(--sk-acc); }
      .item.danger .kbd {
        border-color: var(--sk-acc); color: var(--sk-acc);
        box-shadow: 1.5px 2px 0 color-mix(in srgb, var(--sk-acc) 45%, var(--sk-card));
      }

      /* Danger impact frame */
      .item.inv {
        background: var(--sk-acc); color: var(--sk-on-pri, #fff);
        border-color: var(--sk-ink); box-shadow: 2px 2px 0 var(--sk-ink);
      }
      .item.inv .ico { color: var(--sk-on-pri, #fff); }
      .item.inv .kbd {
        background: var(--sk-ink); color: var(--sk-on-pri, #fff);
        border-color: var(--sk-ink); box-shadow: none;
      }

      .lead {
        flex: none; width: 20px; height: 20px;
        display: grid; place-items: center;
      }
      .ico {
        display: grid; place-items: center; width: 18px; height: 18px;
        color: var(--sk-ink); pointer-events: none;
      }
      .ico svg {
        width: 17px; height: 17px; fill: none; stroke: currentColor;
        stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;
      }
      .ico.glyph { font-size: 14px; line-height: 1; font-style: normal; }
      :host([compact]) .lead { width: 18px; height: 18px; }
      :host([compact]) .ico svg { width: 15px; height: 15px; }

      .chk-box {
        display: grid; place-items: center; flex: none;
        width: 18px; height: 18px;
        border: 2px solid var(--sk-ink); border-radius: 5px;
        background: var(--sk-card);
        box-shadow: 1.5px 1.5px 0 var(--sk-soft);
        pointer-events: none;
      }
      :host([compact]) .chk-box { width: 16px; height: 16px; border-radius: 4px; }
      .chk-svg {
        width: 13px; height: 13px; overflow: visible;
        fill: none; stroke: var(--sk-acc); stroke-width: 3.4;
        stroke-linecap: round; stroke-linejoin: round;
        transform: scale(0); will-change: transform;
      }
      .chk-box.on .chk-svg { transform: scale(1); }

      .lbl {
        flex: 1 1 auto; min-width: 0;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .kbd {
        flex: none; margin-left: 8px; padding: 2px 6px;
        border: 1.8px solid var(--sk-ink); border-radius: 6px;
        background: var(--sk-card); color: var(--sk-ink);
        box-shadow: 1.5px 2px 0 var(--sk-soft);
        font-size: 11px; font-weight: 800; line-height: 1.15;
        font-family: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace;
        letter-spacing: -0.02em; pointer-events: none;
      }
      :host([compact]) .kbd { padding: 1.5px 5px; font-size: 10.5px; }

      .div {
        height: 2px; margin: 4px 4px; flex: none;
        background: var(--sk-ink); border-radius: 1px;
      }
      :host([compact]) .div { margin: 4px 3px; }
    `;

    constructor() {
      super();
      this._id = 'sk-menu-' + ++uid;
      this._items = null;
      this._explicitItems = false;
      this._mo = null;
      this._docBound = false;
      this._seq = 0;
      this._point = null;
      this._executing = false;
      this._hlVisible = false;
      this._activeIdx = -1;
      this._popRect = null;
      this._slottedTrig = null;
      this._pendingOpen = false;
      this._fromKey = false;
      this.isOpen = false;
      this.isBelow = true;
    }

    get label() { return this.getAttribute('label') || 'Actions'; }
    set label(v) {
      if (v === null || v === undefined) this.removeAttribute('label');
      else this.setAttribute('label', String(v));
    }

    get align() { return this.getAttribute('align') === 'end' ? 'end' : 'start'; }
    set align(v) { this.setAttribute('align', v === 'end' ? 'end' : 'start'); }

    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }

    get compact() { return this.hasAttribute('compact'); }
    set compact(v) { this.toggleAttribute('compact', !!v); }

    get open() { return !!this.isOpen; }
    set open(v) {
      const want = !!v;
      if (!this.ready) { this._pendingOpen = want; return; }
      if (want) this.show(); else this.hide();
    }

    get items() {
      const src = this._items ?? this._readChildItems();
      return src.map((it) => ({ ...it }));
    }
    set items(list) {
      this._explicitItems = true;
      this._items = (Array.isArray(list) ? list : []).map(normalizeItem);
      if (this.ready) {
        this._renderMenu();
        if (this.isOpen) this._placePop();
      }
    }

    attributeChangedCallback(name, _, v) {
      if (!this.ready) return;
      if (name === 'label') {
        const lbl = this.label;
        if (this.trigLbl) this.trigLbl.textContent = lbl;
        if (this.pop) this.pop.setAttribute('aria-label', lbl);
      } else if (name === 'align' || name === 'compact') {
        if (this.isOpen) this._placePop();
      } else if (name === 'disabled') {
        this._syncTriggerAria();
        if (this.disabled && this.isOpen) this.hide();
      }
    }

    _readChildItems() {
      const out = [];
      let idx = 0;
      for (const el of this.children) {
        if (el.getAttribute('slot') === 'trigger') continue;
        const tag = el.tagName;
        if (tag === 'HR') {
          out.push({ divider: true });
        } else if (tag === 'OPTION') {
          if (boolAttr(el, 'data-divider')) {
            out.push({ divider: true });
          } else {
            const label = (el.textContent || '').trim();
            const value = el.hasAttribute('value') ? el.getAttribute('value') : (label || String(idx));
            const checkable = boolAttr(el, 'data-checkable') || el.hasAttribute('data-checked');
            out.push({
              divider: false,
              value,
              label,
              shortcut: el.getAttribute('data-shortcut') || '',
              icon: el.getAttribute('data-icon') || '',
              danger: boolAttr(el, 'data-danger'),
              checkable,
              checked: checkable ? boolAttr(el, 'data-checked') : false,
              disabled: el.hasAttribute('disabled'),
              _el: el,
            });
          }
          idx++;
        }
      }
      return out;
    }

    _getTriggerEl() {
      return this._slottedTrig || this.trig;
    }

    _syncTriggerAria() {
      const dis = this.disabled;
      if (this.trig) {
        this.trig.disabled = dis;
        this.trig.setAttribute('aria-expanded', String(!!this.isOpen));
        this.trig.setAttribute('aria-controls', this._id);
      }
      const assigned = this.trigSlot ? this.trigSlot.assignedElements() : [];
      this._slottedTrig = assigned[0] || null;
      if (this._slottedTrig) {
        this._slottedTrig.setAttribute('aria-haspopup', 'menu');
        this._slottedTrig.setAttribute('aria-expanded', String(!!this.isOpen));
        this._slottedTrig.setAttribute('aria-controls', this._id);
        if (dis) this._slottedTrig.setAttribute('aria-disabled', 'true');
        else this._slottedTrig.removeAttribute('aria-disabled');
      }
    }

    render() {
      const lbl = esc(this.label);
      const dis = this.disabled ? ' disabled' : '';
      return `
        <div class="trig-wrap" part="trigger-wrap">
          <slot name="trigger">
            <button type="button" class="trig" part="trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="${this._id}"${dis}>
              <span class="trig-lbl">${lbl}</span>
              ${CHEV_SVG}
            </button>
          </slot>
        </div>
        <div class="pop below" id="${this._id}" role="menu" aria-label="${lbl}" tabindex="-1" part="menu">
          <div class="list" part="list">
            <div class="hl" part="highlight" aria-hidden="true"></div>
          </div>
        </div>`;
    }

    _renderMenu() {
      if (!this.list) return;
      const items = this._items || [];
      const hasLead = items.some((it) => !it.divider && (it.icon || it.checkable));
      for (const old of this.list.querySelectorAll('.item, .div')) old.remove();
      this._itemEls = [];
      const frag = document.createDocumentFragment();

      items.forEach((it, idx) => {
        if (it.divider) {
          const hr = document.createElement('div');
          hr.className = 'div';
          hr.setAttribute('role', 'separator');
          hr.setAttribute('part', 'divider');
          frag.append(hr);
          return;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `item${it.danger ? ' danger' : ''}`;
        btn.setAttribute('role', it.checkable ? 'menuitemcheckbox' : 'menuitem');
        btn.setAttribute('part', it.danger ? 'item danger' : 'item');
        if (it.checkable) btn.setAttribute('aria-checked', String(!!it.checked));
        if (it.disabled) {
          btn.disabled = true;
          btn.setAttribute('aria-disabled', 'true');
        }
        btn.tabIndex = -1;
        btn.dataset.idx = String(idx);

        let html = '';
        if (hasLead) {
          if (it.icon) {
            html += `<span class="lead">${renderIcon(it.icon)}</span>`;
          } else if (it.checkable) {
            html += `<span class="lead"><span class="chk-box${it.checked ? ' on' : ''}" part="checkbox" aria-hidden="true">${CHK_SVG}</span></span>`;
          } else {
            html += '<span class="lead" aria-hidden="true"></span>';
          }
        }
        html += `<span class="lbl" part="label">${esc(it.label)}</span>`;
        if (it.checkable && it.icon) {
          html += `<span class="chk-box${it.checked ? ' on' : ''}" part="checkbox" aria-hidden="true">${CHK_SVG}</span>`;
        }
        if (it.shortcut) {
          html += `<kbd class="kbd" part="shortcut">${esc(it.shortcut)}</kbd>`;
        }
        btn.innerHTML = html;
        this._itemEls.push({ idx, item: it, el: btn });
        frag.append(btn);
      });

      this.list.append(frag);
      this._activeIdx = -1;
      this._hlVisible = false;
      this.hl.classList.remove('on', 'danger');
    }

    _placePop() {
      const pw = this.pop.offsetWidth || 224;
      const ph = this.pop.offsetHeight || 180;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left, top, below;

      if (this._point) {
        const { x, y } = this._point;
        below = (vh - y) >= ph + 12 || (vh - y) >= y;
        const rightward = (vw - x) >= pw + 12 || (vw - x) >= x;
        left = clamp(rightward ? x : x - pw, 8, Math.max(8, vw - pw - 8));
        top = clamp(below ? y + 4 : y - ph - 4, 8, Math.max(8, vh - ph - 8));
        this.isBelow = below;
        this.pop.classList.add('point');
        this.pop.classList.toggle('below', below);
        this.pop.classList.toggle('above', !below);
        const ox = clamp(x - left, 12, Math.max(12, pw - 12));
        this.pop.style.transformOrigin = `${Math.round(ox)}px ${below ? '0px' : '100%'}`;
      } else {
        const anchor = this._getTriggerEl();
        const ar = anchor.getBoundingClientRect();
        const spaceBelow = vh - ar.bottom;
        const spaceAbove = ar.top;
        below = spaceBelow >= ph + 18 || spaceBelow >= spaceAbove;
        this.isBelow = below;

        left = this.align === 'end' ? ar.right - pw : ar.left;
        left = clamp(left, 8, Math.max(8, vw - pw - 8));
        top = below
          ? Math.min(vh - ph - 8, ar.bottom + 12)
          : Math.max(8, ar.top - ph - 12);

        const tailX = clamp(ar.left + ar.width / 2 - left, 22, Math.max(22, pw - 22));
        this.pop.classList.remove('point');
        this.pop.classList.toggle('below', below);
        this.pop.classList.toggle('above', !below);
        this.pop.style.setProperty('--tail-x', `${Math.round(tailX)}px`);
        this.pop.style.transformOrigin = `${Math.round(tailX)}px ${below ? '-10px' : 'calc(100% + 10px)'}`;
      }

      this.pop.style.left = `${Math.round(left)}px`;
      this.pop.style.top = `${Math.round(top)}px`;
      this._popRect = { left, top, w: pw, h: ph };
    }

    _enabledEntries() {
      return (this._itemEls || []).filter((e) => !e.item.disabled);
    }

    _setActive(entry, snap = false, focusEl = false) {
      if (!entry || entry.item.disabled) {
        this._activeIdx = -1;
        this._hlVisible = false;
        this.hl.classList.remove('on', 'danger');
        return;
      }
      const btn = entry.el;
      const wasVisible = this._hlVisible;
      this._activeIdx = entry.idx;
      this._hlVisible = true;
      this.hl.classList.add('on');
      this.hl.classList.toggle('danger', !!entry.item.danger);

      const y = btn.offsetTop;
      const h = btn.offsetHeight;
      this.hlY.to = y;
      this.hlH.to = h;
      if (snap || !wasVisible || fx.calm) {
        this.hlY.x = y; this.hlY.v = 0;
        this.hlH.x = h; this.hlH.v = 0;
        this.hl.style.height = `${h}px`;
        this.hl.style.transform = `translateY(${y}px)`;
      }
      if (focusEl) btn.focus({ preventScroll: true });
    }

    _moveActive(dir) {
      const enabled = this._enabledEntries();
      if (!enabled.length) return;
      const curPos = enabled.findIndex((e) => e.idx === this._activeIdx);
      let nextPos;
      if (dir === 'first') nextPos = 0;
      else if (dir === 'last') nextPos = enabled.length - 1;
      else if (curPos < 0) nextPos = dir > 0 ? 0 : enabled.length - 1;
      else nextPos = (curPos + dir + enabled.length) % enabled.length;
      const target = enabled[nextPos];
      this._setActive(target, false, true);
      target.el.scrollIntoView?.({ block: 'nearest' });
    }

    _jumpByChar(ch) {
      const enabled = this._enabledEntries();
      if (!enabled.length) return;
      const low = ch.toLowerCase();
      const curPos = enabled.findIndex((e) => e.idx === this._activeIdx);
      for (let step = 1; step <= enabled.length; step++) {
        const cand = enabled[(curPos + step + enabled.length) % enabled.length];
        if (cand.item.label.trim().toLowerCase().startsWith(low)) {
          this._setActive(cand, false, true);
          cand.el.scrollIntoView?.({ block: 'nearest' });
          return;
        }
      }
    }

    _openInternal({ point = null, focusFirst = false, focusLast = false } = {}) {
      if (this.disabled) return;
      const reopening = this.isOpen;
      this._point = point;
      this.isOpen = true;
      this._executing = false;
      this.pickEl = null;
      this.chkEl = null;
      this._seq++;
      const seq = this._seq;

      this._renderMenu();
      this._placePop();
      this.pop.classList.remove('closing');
      this.pop.classList.add('open');
      if (!fx.calm) this.pop.style.transform = 'scale(0)';
      this._syncTriggerAria();
      this._bindDoc(true);

      if (focusFirst) this._moveActive('first');
      else if (focusLast) this._moveActive('last');

      if (!reopening) {
        this.emit('sakuga:open', {
          align: this.align,
          context: !!point,
          x: point ? point.x : null,
          y: point ? point.y : null,
        });
      }

      if (fx.calm) {
        this.popS.x = 1; this.popS.to = 1; this.popS.v = 0;
        this.chevS.x = 1; this.chevS.to = 1; this.chevS.v = 0;
        this.pop.style.transform = '';
        if (this.chev) this.chev.style.transform = 'rotate(180deg)';
        return;
      }

      this.popS.k = 560;
      this.popS.d = 30;
      this.popS.x = 0;
      this.popS.v = 4;
      this.popS.to = 1;
      this.joltS.x = 0; this.joltS.v = 0; this.joltS.to = 0;
      this.chevS.to = 1;

      if (point) {
        ring(point.x + scrollX, point.y + scrollY, { rx: 18, ry: 7, life: 0.34, w: 3 });
      } else if (this._slottedTrig) {
        this.trigPopS.x = 0.88;
        this.trigPopS.v = 6.2;
        this.trigPopS.to = 1;
        const q = at(this._slottedTrig);
        ring(q.x, q.y + (this.isBelow ? q.h / 2 + 2 : -q.h / 2 - 2), { rx: clamp(q.w * 0.32, 18, 42), ry: 5, life: 0.34, w: 3 });
      } else {
        this.trigSq.s.x = Math.min(this.trigSq.s.x, 0.78);
        this.trigSq.s.v += 3.8;
        const q = at(this.trig);
        ring(q.x, q.y + (this.isBelow ? q.h / 2 + 2 : -q.h / 2 - 2), { rx: clamp(q.w * 0.34, 20, 42), ry: 5, life: 0.34, w: 3 });
      }

      later(120, () => {
        if (!this.isOpen || seq !== this._seq) return;
        const r = this._popRect;
        if (!r) return;
        const cx = r.left + scrollX + r.w / 2;
        const cy = r.top + scrollY + r.h / 2;
        puff(cx - r.w / 2 - 20, cy - r.h * 0.14, { size: 7.5, n: 4, vx: -18, vy: -8, life: 0.46 });
        puff(cx + r.w / 2 + 20, cy + r.h * 0.12, { size: 7.5, n: 4, vx: 18, vy: -6, life: 0.46 });
        const rightCorner = this.align !== 'end';
        const tx = rightCorner ? (cx + r.w / 2 + 4) : (cx - r.w / 2 - 4);
        const tdir = rightCorner ? -0.95 : -2.2;
        ticks(tx, cy - r.h / 2 - 6, { dir: tdir, n: 3, r: 6, len: 15, fan: 0.38, life: 0.34 });
      });
    }

    show() {
      if (this.disabled || this.isOpen) return;
      this._openInternal({ point: null });
    }

    openAt(x, y) {
      if (this.disabled) return;
      this._openInternal({ point: { x: Number(x) || 0, y: Number(y) || 0 } });
    }

    hide(restoreFocus = false) {
      if (!this.isOpen) return;
      this.isOpen = false;
      this._executing = false;
      const wasPoint = !!this._point;
      this._point = null;
      this._seq++;
      this._syncTriggerAria();
      this._bindDoc(false);
      this.emit('sakuga:close', {});

      if (restoreFocus && !wasPoint) {
        const t = this._getTriggerEl();
        if (t && typeof t.focus === 'function') t.focus({ preventScroll: true });
      }

      if (fx.calm) {
        this.popS.x = 0; this.popS.to = 0; this.popS.v = 0;
        this.chevS.x = 0; this.chevS.to = 0; this.chevS.v = 0;
        this.pop.classList.remove('open', 'closing');
        this.pop.style.transform = 'scale(0)';
        if (this.chev) this.chev.style.transform = '';
        this.pickEl = null;
        this.chkEl = null;
        return;
      }

      this.pop.classList.remove('open');
      this.pop.classList.add('closing');
      this.popS.k = 680;
      this.popS.d = 42;
      this.popS.v = Math.min(this.popS.v, -2.5);
      this.popS.to = 0;
      this.chevS.to = 0;
    }

    toggle() {
      if (this.isOpen) this.hide(); else this.show();
    }

    _sfxPos(cy, wordW) {
      const r = this._popRect;
      const half = wordW * 0.46 + 8;
      const rightEdge = r ? r.left + scrollX + r.w : scrollX + 300;
      const leftEdge = r ? r.left + scrollX : scrollX + 80;
      const rightRoom = window.innerWidth - (r ? r.left + r.w : 300);
      const leftRoom = r ? r.left : 80;
      let sx = (rightRoom >= wordW + 14 || rightRoom >= leftRoom)
        ? rightEdge + half
        : leftEdge - half;
      sx = clamp(sx, scrollX + half, scrollX + Math.max(half, window.innerWidth - half));
      const sy = clamp(cy - 12, scrollY + 34, scrollY + Math.max(34, window.innerHeight - 34));
      return { x: sx, y: sy, rightEdge, leftEdge };
    }

    _activate(entry, fromKey = false) {
      if (!entry || entry.item.disabled || this._executing) return;
      const { idx, item, el } = entry;
      this._executing = true;
      const seq = this._seq;

      if (item.checkable) {
        item.checked = !item.checked;
        el.setAttribute('aria-checked', String(item.checked));
        const box = el.querySelector('.chk-box');
        if (box) box.classList.toggle('on', item.checked);
        if (item._el && !this._explicitItems) {
          item._el.toggleAttribute('data-checked', item.checked);
          this._mo?.takeRecords();
        }
      }

      const payloadItem = { ...item };
      delete payloadItem._el;
      this.emit('select', {
        value: item.value,
        label: item.label,
        index: idx,
        item: payloadItem,
        checked: item.checkable ? item.checked : undefined,
      });

      if (fx.calm) {
        this.hide(fromKey);
        return;
      }

      const c = at(el);
      this.pickEl = el;

      if (item.danger) {
        this.pickS.x = 0.72;
        this.pickS.v = 13.5;
        this.pickS.to = 1;
        this.joltS.x = -5;
        this.joltS.v = 55;
        this.joltS.to = 0;

        el.classList.add('inv');
        later(140, () => el.classList.remove('inv'));

        const pos = this._sfxPos(c.y, 78);
        slash(c.x, c.y, { len: Math.max(104, c.w * 0.76), ang: -0.18, thick: 12, life: 0.40 });
        shards(c.x + c.w * 0.08, c.y, { n: 8, speed: 215, size: 6, life: 0.44, dir: -0.35, arc: 2.3, grav: 380 });
        ticks(pos.leftEdge - 4, c.y + 6, { dir: Math.PI - 0.5, n: 3, r: 5, len: 14, fan: 0.44, life: 0.36 });
        ticks(pos.rightEdge + 4, c.y - 6, { dir: -0.45, n: 3, r: 5, len: 15, fan: 0.44, life: 0.36 });
        sfx('don', pos.x, pos.y - 2, { size: 78, rot: -0.1, life: 0.43, ...hollow() });

        later(180, () => { if (this.isOpen && seq === this._seq) this.hide(fromKey); });
        return;
      }

      if (item.checkable) {
        this.pickS.x = 0.84;
        this.pickS.v = 8.5;
        this.pickS.to = 1;
        const svg = el.querySelector('.chk-svg');
        if (svg) {
          this.chkEl = svg;
          if (item.checked) {
            this.chkS.x = 0.15;
            this.chkS.v = 14;
            this.chkS.to = 1;
          } else {
            this.chkS.x = 1;
            this.chkS.v = -6;
            this.chkS.to = 0;
          }
        }
        const pos = this._sfxPos(c.y, 68);
        const box = el.querySelector('.chk-box');
        const bc = box ? at(box) : c;
        kira(bc.x + 8, bc.y - 8, { r: 9.5, life: 0.48 });
        ticks(pos.rightEdge + 4, c.y - 6, { dir: -0.45, n: 3, r: 6, len: 13, fan: 0.48, life: 0.38 });
        sfx('pon', pos.x, pos.y, { size: 68, rot: -0.08, life: 0.44, ...hollow() });

        later(220, () => { if (this.isOpen && seq === this._seq) this.hide(fromKey); });
        return;
      }

      // Normal item
      this.pickS.x = 0.76;
      this.pickS.v = 10.5;
      this.pickS.to = 1;
      const pos = this._sfxPos(c.y, 70);
      ticks(pos.rightEdge + 4, c.y - 6, { dir: -0.45, n: 3, r: 6, len: 14, fan: 0.5, life: 0.36 });
      puff(pos.rightEdge + 12, c.y + 8, { size: 5.5, n: 3, vx: 16, vy: -8, life: 0.38 });
      kira(pos.rightEdge - 8, c.y - 10, { r: 9.5, life: 0.44 });
      sfx('kachi', pos.x, pos.y, { size: 70, rot: -0.1, life: 0.42, ...hollow() });

      later(115, () => { if (this.isOpen && seq === this._seq) this.hide(fromKey); });
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

    _attachObserver() {
      if (this._mo) return;
      this._mo = new MutationObserver((records) => {
        const touchedItems = records.some((r) => {
          const t = r.target;
          if (t === this) return true;
          if (t.nodeType === 1 && (t.tagName === 'OPTION' || t.tagName === 'HR')) return true;
          if (t.parentElement && t.parentElement.tagName === 'OPTION') return true;
          return false;
        });
        if (!touchedItems) return;
        const childItems = this._readChildItems();
        if (childItems.length || !this._explicitItems) {
          this._explicitItems = false;
          this._items = childItems;
          this._renderMenu();
          if (this.isOpen) this._placePop();
        }
      });
      this._mo.observe(this, {
        childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: ['value', 'disabled', 'data-shortcut', 'data-icon', 'data-danger', 'data-checkable', 'data-checked', 'data-divider', 'slot'],
      });
    }

    connectedCallback() {
      super.connectedCallback();
      if (this.ready) this._attachObserver();
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this._bindDoc(false);
      this._mo?.disconnect();
      this._mo = null;
    }

    setup() {
      this.trigWrap = this.$('.trig-wrap');
      this.trigSlot = this.$('slot[name="trigger"]');
      this.trig = this.$('.trig');
      this.trigLbl = this.$('.trig-lbl');
      this.chev = this.$('.chev');
      this.pop = this.$('.pop');
      this.list = this.$('.list');
      this.hl = this.$('.hl');

      this.popS = new Spring(0, 560, 30);
      this.joltS = new Spring(0, 520, 18);
      this.chevS = new Spring(0, 420, 22);
      this.hlY = new Spring(0, 560, 26);
      this.hlH = new Spring(36, 560, 28);
      this.pickS = new Spring(1, 520, 14);
      this.chkS = new Spring(1, 520, 14);
      this.trigPopS = new Spring(1, 460, 16);
      this.trigSq = squashy(this.trig, { low: 0.8, wide: 0.36 });

      this.pickEl = null;
      this.chkEl = null;

      if (!this._explicitItems) this._items = this._readChildItems();
      this._syncTriggerAria();
      this._renderMenu();
      this._attachObserver();

      this.trigSlot.addEventListener('slotchange', () => this._syncTriggerAria());

      this.trigWrap.addEventListener('click', (e) => {
        if (this.disabled) { e.preventDefault(); return; }
        const fromKey = this._fromKey;
        this._fromKey = false;
        if (this.isOpen) this.hide(fromKey);
        else this._openInternal({ focusFirst: fromKey });
      });

      this.trigWrap.addEventListener('keydown', (e) => {
        if (this.disabled) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (!this.isOpen) this._openInternal({ focusFirst: true });
          else this._moveActive(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!this.isOpen) this._openInternal({ focusLast: true });
          else this._moveActive(-1);
        } else if (e.key === 'Enter' || e.key === ' ') {
          const t = this._getTriggerEl();
          const isNativeBtn = t && t.tagName === 'BUTTON';
          if (isNativeBtn) {
            this._fromKey = true;
          } else {
            e.preventDefault();
            if (!this.isOpen) this._openInternal({ focusFirst: true });
            else this.hide(true);
          }
        }
      });

      this.list.addEventListener('pointermove', (e) => {
        if (!this.isOpen || this._executing) return;
        const btn = e.target.closest('.item');
        if (!btn) return;
        const idx = +btn.dataset.idx;
        if (idx === this._activeIdx) return;
        const entry = this._itemEls.find((it) => it.idx === idx);
        if (entry && !entry.item.disabled) this._setActive(entry, false, false);
      });

      this.list.addEventListener('click', (e) => {
        const btn = e.target.closest('.item');
        if (!btn || btn.disabled) return;
        const idx = +btn.dataset.idx;
        const entry = this._itemEls.find((it) => it.idx === idx);
        if (entry) {
          this._setActive(entry, true, false);
          this._activate(entry, false);
        }
      });

      this._onDocDown = (e) => {
        if (!this.isOpen) return;
        const path = e.composedPath ? e.composedPath() : [];
        if (!path.includes(this)) this.hide(false);
      };

      this._onDocKey = (e) => {
        if (!this.isOpen) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          this.hide(true);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this._moveActive(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this._moveActive(-1);
        } else if (e.key === 'Home') {
          e.preventDefault();
          this._moveActive('first');
        } else if (e.key === 'End') {
          e.preventDefault();
          this._moveActive('last');
        } else if (e.key === 'Enter' || e.key === ' ') {
          const entry = this._itemEls.find((it) => it.idx === this._activeIdx);
          if (entry && !entry.item.disabled) {
            e.preventDefault();
            this._activate(entry, true);
          }
        } else if (e.key === 'Tab') {
          this.hide(false);
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          this._jumpByChar(e.key);
        }
      };

      this._onReposition = (e) => {
        if (!this.isOpen) return;
        if (e && e.target === this.list) return;
        this._placePop();
      };

      if (this._pendingOpen) {
        this._pendingOpen = false;
        this.show();
      }
    }

    frame(dt) {
      if (fx.calm) {
        this.trig.style.transform = '';
        this.trigWrap.style.transform = '';
        if (this.pickEl) this.pickEl.style.transform = '';
        if (this.chkEl) this.chkEl.style.transform = '';
        return;
      }

      this.trigSq.step(dt);

      // Slotted trigger micro-pop
      const tp = this.trigPopS.step(dt);
      const tpStill = Math.abs(tp - 1) < 0.001 && Math.abs(this.trigPopS.v) < 0.01;
      if (this._slottedTrig) {
        const tx = 1 / Math.sqrt(Math.max(0.6, tp));
        this.trigWrap.style.transform = tpStill ? '' : `scale(${tx.toFixed(4)}, ${tp.toFixed(4)})`;
      } else if (this.trigWrap.style.transform) {
        this.trigWrap.style.transform = '';
      }

      // Trigger chevron spring rotation
      if (this.chev && !this._slottedTrig) {
        const cv = this.chevS.step(dt);
        const cStill = Math.abs(cv - this.chevS.to) < 0.002 && Math.abs(this.chevS.v) < 0.01;
        const deg = (cStill ? this.chevS.to : cv) * 180;
        this.chev.style.transform = Math.abs(deg) < 0.2 ? '' : `rotate(${deg.toFixed(2)}deg)`;
      }

      // Speech-bubble panel spring
      if (this.isOpen || this.pop.classList.contains('closing')) {
        const y = Math.max(0, this.popS.step(dt));
        const jx = this.joltS.step(dt);
        if (!this.isOpen && y < 0.055) {
          this.popS.x = 0; this.popS.v = 0;
          this.pop.classList.remove('closing');
          this.pop.style.transform = 'scale(0)';
          this.pickEl = null;
          this.chkEl = null;
        } else {
          const settled = this.isOpen
            && Math.abs(y - 1) < 0.0008 && Math.abs(this.popS.v) < 0.01
            && Math.abs(jx) < 0.08 && Math.abs(this.joltS.v) < 0.2;
          if (settled) {
            this.pop.style.transform = '';
          } else {
            const tilt = (1 - Math.min(1.2, y)) * -5.5;
            const tx = Math.abs(jx) > 0.08 ? `translateX(${jx.toFixed(2)}px) ` : '';
            this.pop.style.transform = `${tx}scale(${y.toFixed(4)}) rotate(${tilt.toFixed(2)}deg)`;
          }
        }
      }

      // Sliding cel-shaded highlight pill with velocity-coupled vertical stretch
      if (this.isOpen && this._hlVisible) {
        const hy = this.hlY.step(dt);
        const hh = Math.max(18, this.hlH.step(dt));
        const speed = Math.abs(this.hlY.v);
        const settled = Math.abs(hy - this.hlY.to) < 0.1 && speed < 0.3 && Math.abs(hh - this.hlH.to) < 0.1 && Math.abs(this.hlH.v) < 0.3;
        if (settled) {
          this.hl.style.height = `${this.hlH.to}px`;
          this.hl.style.transform = `translateY(${this.hlY.to}px)`;
        } else {
          const sy = 1 + Math.min(0.18, speed * 0.00045);
          const sx = 1 / Math.sqrt(sy);
          this.hl.style.height = `${hh.toFixed(2)}px`;
          this.hl.style.transform = `translateY(${hy.toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
        }
      }

      // Activated item squash & pop
      if (this.pickEl && this.pickEl.isConnected) {
        const ps = Math.max(0.55, this.pickS.step(dt));
        const px = 1 / Math.sqrt(ps);
        const still = Math.abs(ps - 1) < 0.001 && Math.abs(this.pickS.v) < 0.01;
        this.pickEl.style.transform = still ? '' : `scale(${px.toFixed(4)}, ${ps.toFixed(4)})`;
      }

      // Animated SVG checkmark pop / shrink
      if (this.chkEl && this.chkEl.isConnected) {
        const cs = Math.max(0, this.chkS.step(dt));
        const still = Math.abs(cs - this.chkS.to) < 0.002 && Math.abs(this.chkS.v) < 0.01;
        if (still) {
          this.chkEl.style.transform = '';
          this.chkEl = null;
        } else {
          this.chkEl.style.transform = `scale(${cs.toFixed(4)})`;
        }
      }
    }
  }

  fx.define('sakuga-menu', SakugaMenu);
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
