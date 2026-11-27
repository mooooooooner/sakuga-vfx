// Sakuga Upload: a manga-framed drag-and-drop file dropzone and animated file queue.
// Plain ink-outlined dropzone at rest. Dragging over inflates it on a spring with eager inward wind lines and pink accents.
// Dropping files slams the dropzone with a back-layer impact burst, corner smoke puffs, flying crystal shards,
// ポン / ドン! lettering above, and a staggered wave of cel-shaded file cards with kira glints.
// Removing a file slices across the card with a pink crescent slash and shrinks it to zero; invalid files shake the frame with a manga alert pill.
(() => {
'use strict';
function component(fx) {
  const { Spring, clamp, rnd, later, at, esc, burst, puff, shards, slash, lines, ticks, wob, kira, sfx, hollow } = fx;

  const EXT_GROUPS = {
    image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico'],
    audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'],
    video: ['mp4', 'webm', 'mov', 'mkv', 'avi'],
    text: ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts', 'log'],
  };

  function parseSize(raw) {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
    const m = /^\s*(\d+(?:\.\d+)?)\s*(b|kb|k|mb|m|gb|g)?\s*$/i.exec(String(raw));
    if (!m) return null;
    const n = parseFloat(m[1]);
    if (!(n > 0)) return null;
    const u = (m[2] || 'b').toLowerCase();
    const mult = u === 'g' || u === 'gb' ? 1073741824 : u === 'm' || u === 'mb' ? 1048576 : u === 'k' || u === 'kb' ? 1024 : 1;
    return Math.round(n * mult);
  }

  function formatBytes(n) {
    const v = Math.max(0, Number(n) || 0);
    if (v < 1024) return `${v} B`;
    const units = ['KB', 'MB', 'GB'];
    let u = -1, x = v;
    while (x >= 1024 && u < units.length - 1) { x /= 1024; u++; }
    const s = x >= 10 ? x.toFixed(1) : x.toFixed(2);
    return `${s.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')} ${units[u]}`;
  }

  function fileExt(name) {
    const base = String(name || '').trim();
    const i = base.lastIndexOf('.');
    if (i <= 0 || i === base.length - 1) return 'FILE';
    return base.slice(i + 1).toUpperCase().slice(0, 5);
  }

  function extTone(ext, type) {
    const t = String(type || '').toLowerCase();
    if (t.startsWith('image/') || ['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG', 'AVIF', 'BMP', 'ICO'].includes(ext)) return 'img';
    if (t === 'application/pdf' || ext === 'PDF') return 'pdf';
    if (['JSON', 'JS', 'TS', 'JSX', 'TSX', 'HTML', 'CSS', 'XML', 'YAML', 'YML', 'CSV', 'SH', 'PY'].includes(ext)) return 'code';
    if (['TXT', 'MD', 'DOC', 'DOCX', 'RTF'].includes(ext)) return 'doc';
    if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ'].includes(ext)) return 'zip';
    return 'def';
  }

  function matchesAccept(file, acceptStr) {
    const raw = String(acceptStr || '').trim();
    if (!raw) return true;
    const tokens = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!tokens.length) return true;
    const name = String(file.name || '').toLowerCase();
    const dotIdx = name.lastIndexOf('.');
    const ext = dotIdx > 0 ? name.slice(dotIdx + 1) : '';
    const mime = String(file.type || '').toLowerCase();
    for (const tok of tokens) {
      if (tok === '*' || tok === '*/*') return true;
      if (tok.startsWith('.')) {
        if (name.endsWith(tok)) return true;
      } else if (tok.endsWith('/*')) {
        const group = tok.slice(0, -2);
        if (mime && mime.startsWith(group + '/')) return true;
        if (!mime && ext && EXT_GROUPS[group]?.includes(ext)) return true;
      } else if (mime && mime === tok) {
        return true;
      }
    }
    return false;
  }

  function describeAccept(acceptStr) {
    const raw = String(acceptStr || '').trim();
    if (!raw) return '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean).map((tok) => {
      const low = tok.toLowerCase();
      if (low === 'image/*') return 'Images';
      if (low === 'audio/*') return 'Audio';
      if (low === 'video/*') return 'Video';
      if (low === 'text/*') return 'Text';
      if (tok.startsWith('.')) return tok.slice(1).toUpperCase();
      return tok;
    }).join(', ');
  }

  const ICON_UPLOAD = `<svg class="emblem-svg" viewBox="0 0 68 54" aria-hidden="true">
    <path class="sh" d="M21 44h28c6.2 0 11-4.5 11-10.3 0-5.1-3.7-9.4-8.8-10.1C49.6 15.8 43 11 35 11c-7.4 0-13.6 4.7-15.6 11.4C14 23.2 10 27.6 10 33.2 10 39.2 14.9 44 21 44Z"/>
    <path class="cloud" d="M18 41h28c6.2 0 11-4.5 11-10.3 0-5.1-3.7-9.4-8.8-10.1C46.6 12.8 40 8 32 8c-7.4 0-13.6 4.7-15.6 11.4C11 20.2 7 24.6 7 30.2 7 36.2 11.9 41 18 41Z"/>
    <path class="cel" d="M10.5 34.5c2 3.2 5.4 5 9.2 5h25.6c5 0 9-3.1 10-7.5-2.6 2.8-6.2 4.3-10.5 4.3H20.5c-4.3 0-7.6-.6-10-1.8Z"/>
    <g class="arrow">
      <path class="arr-sh" d="M35.5 22.5l9.5 9.5h-5.6v13h-7.8V32H26l9.5-9.5Z"/>
      <path class="arr-body" d="M33.5 20.5l9.5 9.5h-5.6v13h-7.8V30H24l9.5-9.5Z"/>
    </g>
    <path class="spark" d="M56 12l4-3M58 17l4.5-.8"/>
  </svg>`;

  const ICON_X = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;

  class SakugaUpload extends fx.Base {
    static delegates = true;
    static formAssociated = true;
    static observedAttributes = ['accept', 'multiple', 'max-size', 'max-files', 'label', 'hint', 'button-label', 'disabled', 'compact'];

    static css = `
      :host {
        display: block;
        width: var(--sk-upload-width, 100%);
        max-width: 100%;
      }
      canvas.back {
        left: -220px;
        top: -220px;
        width: calc(100% + 440px);
        height: calc(100% + 440px);
      }
      .shell {
        position: relative;
        width: 100%;
        min-width: 0;
      }

      /* Outer manga dropzone surface */
      .zone {
        position: relative;
        width: 100%;
        padding: 11px;
        border: var(--sk-bw, 3.2px) solid var(--sk-ink);
        border-radius: var(--sk-r, 15px);
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: var(--sk-sh, 6px 7px 0 var(--sk-soft));
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        transform-origin: center center;
        transition: box-shadow .12s ease, background .12s ease, border-color .12s ease;
      }
      .zone:hover:not(.is-disabled) .cta {
        background: color-mix(in srgb, var(--sk-soft) 24%, var(--sk-card));
      }
      .zone:focus-visible {
        outline: 2.5px solid var(--sk-acc);
        outline-offset: 4px;
      }
      .zone.over {
        border-color: var(--sk-ink);
        box-shadow: 7px 8px 0 var(--sk-acc);
      }
      .zone.hit {
        background: var(--sk-ink);
        color: var(--sk-card);
        box-shadow: 6px 7px 0 var(--sk-acc);
      }
      .zone.is-disabled {
        opacity: .48;
        cursor: not-allowed;
      }

      /* Inner dashed manga drop frame */
      .frame {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px 16px 15px;
        border: 2.4px dashed var(--sk-ink);
        border-radius: calc(var(--sk-r, 15px) - 5px);
        background: var(--sk-card);
        text-align: center;
        transition: border-color .12s ease, background .12s ease;
      }
      .zone.over .frame {
        border-color: var(--sk-acc);
        background: color-mix(in srgb, var(--sk-acc) 9%, var(--sk-card));
      }
      .zone.hit .frame {
        border-color: var(--sk-acc);
        background: var(--sk-ink);
      }

      /* Corner manga registration marks (quiet ink at rest, pink pop on drag-over) */
      .cm {
        position: absolute;
        width: 9px;
        height: 9px;
        pointer-events: none;
        opacity: 0;
      }
      .zone.over .cm, .zone.hit .cm { opacity: 1; }
      .cm-tl { top: 5px; left: 5px; border-top: 2.6px solid var(--sk-acc); border-left: 2.6px solid var(--sk-acc); border-top-left-radius: 3px; }
      .cm-tr { top: 5px; right: 5px; border-top: 2.6px solid var(--sk-acc); border-right: 2.6px solid var(--sk-acc); border-top-right-radius: 3px; }
      .cm-bl { bottom: 5px; left: 5px; border-bottom: 2.6px solid var(--sk-acc); border-left: 2.6px solid var(--sk-acc); border-bottom-left-radius: 3px; }
      .cm-br { bottom: 5px; right: 5px; border-bottom: 2.6px solid var(--sk-acc); border-right: 2.6px solid var(--sk-acc); border-bottom-right-radius: 3px; }

      /* Two-tone SVG manga emblem */
      .emblem {
        display: grid;
        place-items: center;
        width: 62px;
        height: 48px;
        flex: none;
        transform-origin: center center;
      }
      .emblem-svg {
        width: 62px;
        height: 48px;
        overflow: visible;
        display: block;
      }
      .emblem-svg .sh { fill: var(--sk-soft); }
      .emblem-svg .cloud { fill: var(--sk-card); stroke: var(--sk-ink); stroke-width: 3; stroke-linejoin: round; }
      .emblem-svg .cel { fill: var(--sk-soft); }
      .emblem-svg .arr-sh { fill: var(--sk-ink); }
      .emblem-svg .arr-body { fill: var(--sk-pri); stroke: var(--sk-ink); stroke-width: 2.6; stroke-linejoin: round; }
      .emblem-svg .spark { fill: none; stroke: var(--sk-acc); stroke-width: 2.6; stroke-linecap: round; visibility: hidden; }
      .zone.over .emblem-svg .arr-body,
      .zone.hit .emblem-svg .arr-body { fill: var(--sk-acc); }
      .zone.over .emblem-svg .spark,
      .zone.hit .emblem-svg .spark { visibility: visible; }
      .zone.hit .emblem-svg .cloud { fill: var(--sk-card); }

      /* Text copy */
      .copy {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        max-width: 100%;
      }
      .title {
        font: italic 800 17px/1.15 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        letter-spacing: -.01em;
        color: inherit;
      }
      .sub {
        font-size: 12.5px;
        font-weight: 600;
        line-height: 1.35;
        color: var(--sk-dim);
        word-break: break-word;
      }
      .zone.hit .sub { color: var(--sk-soft); }

      /* CTA chip & quota badge */
      .acts {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: 2px;
      }
      .cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 14px;
        border: 2.3px solid var(--sk-ink);
        border-radius: 9px;
        background: var(--sk-card);
        color: var(--sk-ink);
        font: italic 800 13px/1.1 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        letter-spacing: .01em;
        box-shadow: 3px 3px 0 var(--sk-soft);
      }
      .zone.over .cta,
      .zone.hit .cta {
        background: var(--sk-acc);
        color: var(--sk-on-pri);
        border-color: var(--sk-ink);
        box-shadow: 3px 3px 0 var(--sk-ink);
      }
      .quota {
        display: inline-flex;
        align-items: center;
        padding: 4px 9px;
        border: 2px solid var(--sk-ink);
        border-radius: 8px;
        background: color-mix(in srgb, var(--sk-soft) 22%, var(--sk-card));
        color: var(--sk-ink);
        font-size: 11.5px;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        line-height: 1.1;
      }
      .quota[hidden] { display: none; }
      .zone.hit .quota {
        background: var(--sk-card);
        color: var(--sk-ink);
      }

      /* Compact layout */
      :host([compact]) .zone { padding: 8px; box-shadow: 4px 5px 0 var(--sk-soft); }
      :host([compact]) .frame {
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        text-align: left;
      }
      :host([compact]) .emblem,
      :host([compact]) .emblem-svg { width: 42px; height: 34px; }
      :host([compact]) .copy { flex: 1 1 150px; }
      :host([compact]) .title { font-size: 15px; }
      :host([compact]) .sub { font-size: 11.5px; }
      :host([compact]) .acts { margin-top: 0; justify-content: flex-end; }

      /* Flat pink-accent manga rejection alert pill */
      .alert {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        padding: 7px 10px;
        border: 2.3px solid var(--sk-ink);
        border-radius: 11px;
        background: color-mix(in srgb, var(--sk-acc) 14%, var(--sk-card));
        color: var(--sk-ink);
        box-shadow: 3px 3px 0 var(--sk-acc);
        transform-origin: center top;
      }
      .alert[hidden] { display: none; }
      .alert-tag {
        flex: none;
        width: 21px;
        height: 21px;
        display: grid;
        place-items: center;
        border: 2px solid var(--sk-ink);
        border-radius: 6px;
        background: var(--sk-acc);
        color: var(--sk-on-pri);
        font: italic 900 13px/1 "Avenir Next", "Nunito", -apple-system, sans-serif;
      }
      .alert-msg {
        flex: 1;
        min-width: 0;
        font-size: 12.5px;
        font-weight: 700;
        line-height: 1.3;
        word-break: break-word;
      }
      .alert-x {
        flex: none;
        width: 24px;
        height: 24px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 2px solid var(--sk-ink);
        border-radius: 7px;
        background: var(--sk-card);
        color: var(--sk-ink);
        cursor: pointer;
      }
      .alert-x:hover { background: var(--sk-acc); color: var(--sk-on-pri); }
      .alert-x svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; }

      /* Animated file queue */
      .queue {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 8px;
        width: 100%;
        min-width: 0;
      }
      .queue[hidden] { display: none; }

      .item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-width: 0;
        padding: 6px 9px;
        border: 2.2px solid var(--sk-ink);
        border-radius: 11px;
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: 3px 3px 0 var(--sk-soft);
        transform-origin: center center;
      }
      .item.slashed {
        border-color: var(--sk-acc);
        box-shadow: 3px 3px 0 var(--sk-acc);
      }

      /* Cel-shaded slanted extension stamp chip */
      .ext {
        flex: none;
        min-width: 46px;
        padding: 5px 6px;
        border: 2px solid var(--sk-ink);
        border-radius: 7px;
        box-shadow: 2px 2px 0 var(--sk-ink);
        text-align: center;
        font: italic 900 11px/1 "Avenir Next", "Nunito", -apple-system, "Segoe UI", system-ui, sans-serif;
        letter-spacing: .04em;
        text-transform: uppercase;
        transform: rotate(-3deg);
        background: #e8e6ff;
        color: var(--sk-ink);
      }
      .ext[data-tone="img"]  { background: #ffd6ea; color: var(--sk-ink); }
      .ext[data-tone="pdf"]  { background: var(--sk-acc); color: var(--sk-on-pri); }
      .ext[data-tone="code"] { background: var(--sk-soft); color: var(--sk-ink); }
      .ext[data-tone="doc"]  { background: #c8f2e6; color: var(--sk-ink); }
      .ext[data-tone="zip"]  { background: #ffe7a8; color: var(--sk-ink); }

      .meta {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .fname {
        font-weight: 800;
        font-size: 13.5px;
        line-height: 1.2;
        color: var(--sk-ink);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fsize {
        font-size: 11.5px;
        font-weight: 700;
        line-height: 1.2;
        color: var(--sk-dim);
        font-variant-numeric: tabular-nums;
      }

      .rm {
        flex: none;
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 2px solid var(--sk-ink);
        border-radius: 8px;
        background: var(--sk-card);
        color: var(--sk-ink);
        box-shadow: 2px 2px 0 var(--sk-soft);
        cursor: pointer;
        user-select: none;
        touch-action: manipulation;
      }
      .rm:hover:not(:disabled) {
        background: var(--sk-acc);
        color: var(--sk-on-pri);
        box-shadow: 2px 2px 0 var(--sk-ink);
      }
      .rm:disabled { opacity: .45; cursor: not-allowed; }
      .rm svg {
        width: 13px;
        height: 13px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.7;
        stroke-linecap: round;
        pointer-events: none;
      }

      @media (max-width: 440px) {
        .frame { padding: 14px 12px 13px; }
        .title { font-size: 16px; }
        .item { gap: 8px; padding: 6px 8px; }
        .ext { min-width: 42px; font-size: 10.5px; padding: 4px 5px; }
      }
    `;

    // ─── Properties ───
    get files() {
      return (this._items || []).filter((it) => !it.removing).map((it) => it.file);
    }
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', !!v); }
    get multiple() { return this.hasAttribute('multiple'); }
    set multiple(v) { this.toggleAttribute('multiple', !!v); }
    get accept() { return this.getAttribute('accept') || ''; }
    set accept(v) { if (v) this.setAttribute('accept', String(v)); else this.removeAttribute('accept'); }
    get maxSize() { return parseSize(this.getAttribute('max-size')); }
    set maxSize(v) { if (v == null || v === '') this.removeAttribute('max-size'); else this.setAttribute('max-size', String(v)); }
    get maxFiles() {
      const n = parseInt(this.getAttribute('max-files'), 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    set maxFiles(v) { if (v == null || v === '') this.removeAttribute('max-files'); else this.setAttribute('max-files', String(v)); }
    get compact() { return this.hasAttribute('compact'); }
    set compact(v) { this.toggleAttribute('compact', !!v); }

    attributeChangedCallback() {
      if (this.ready) this._syncUI();
    }

    formResetCallback() {
      this.clear();
    }

    formDisabledCallback(disabled) {
      this.disabled = disabled;
    }

    render() {
      return `<div class="shell" part="base">
        <div class="zone" part="dropzone" role="button" tabindex="0" aria-describedby="hint-txt">
          <input class="file-in sr" type="file" tabindex="-1" aria-hidden="true">
          <div class="frame" part="frame">
            <span class="cm cm-tl" aria-hidden="true"></span>
            <span class="cm cm-tr" aria-hidden="true"></span>
            <span class="cm cm-bl" aria-hidden="true"></span>
            <span class="cm cm-br" aria-hidden="true"></span>
            <div class="emblem" part="icon">${ICON_UPLOAD}</div>
            <div class="copy">
              <div class="title" part="label"></div>
              <div class="sub" id="hint-txt" part="hint"></div>
            </div>
            <div class="acts">
              <span class="cta" part="button"></span>
              <span class="quota" part="quota" hidden></span>
            </div>
          </div>
        </div>
        <div class="alert" part="alert" role="alert" hidden>
          <span class="alert-tag" aria-hidden="true">!</span>
          <span class="alert-msg"></span>
          <button class="alert-x" type="button" aria-label="Dismiss message">${ICON_X}</button>
        </div>
        <div class="sr status" role="status" aria-live="polite"></div>
        <div class="queue" part="queue" role="list" aria-label="Selected files" hidden></div>
      </div>`;
    }

    setup() {
      this.zone = this.$('.zone');
      this.input = this.$('.file-in');
      this.emblem = this.$('.emblem');
      this.titleEl = this.$('.title');
      this.hintEl = this.$('.sub');
      this.ctaEl = this.$('.cta');
      this.quotaEl = this.$('.quota');
      this.alertEl = this.$('.alert');
      this.alertMsgEl = this.$('.alert-msg');
      this.alertX = this.$('.alert-x');
      this.statusEl = this.$('.status');
      this.queueEl = this.$('.queue');

      this.back = this.backLayer();
      this._items = [];
      this._uid = 0;
      this._seq = 0;
      this._over = false;
      this._dragDepth = 0;
      this._windT = 0;
      this._windBeat = 0;
      this._alertShown = false;
      this._alertHiding = false;

      // Springs for zone squash, shake, tilt, emblem anticipation, and alert pill
      this.zoneS = new Spring(1, 440, 15);
      this.zoneShake = new Spring(0, 720, 14);
      this.zoneRot = new Spring(0, 380, 14);
      this.iconY = new Spring(0, 320, 13);
      this.iconRot = new Spring(0, 280, 12);
      this.alertS = new Spring(0, 440, 16);

      // Click & keyboard access to native file dialog
      this.zone.addEventListener('click', (e) => {
        if (this.disabled || e.target === this.input) return;
        this.browse();
      });
      this.zone.addEventListener('keydown', (e) => {
        if (this.disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.browse();
        }
      });

      this.input.addEventListener('change', () => {
        const picked = this.input.files ? Array.from(this.input.files) : [];
        this.input.value = '';
        if (picked.length) this.addFiles(picked);
      });

      this.alertX.addEventListener('click', () => this._hideAlert());

      // Drag-and-drop anticipation & drop handling
      this.zone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (this.disabled) return;
        this._dragDepth++;
        this._setDragOver(true);
      });
      this.zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (this.disabled) return;
        try { if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; } catch {}
        if (!this._over) this._setDragOver(true);
      });
      this.zone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (this.disabled) return;
        this._dragDepth = Math.max(0, this._dragDepth - 1);
        if (this._dragDepth === 0) this._setDragOver(false);
      });
      this.zone.addEventListener('drop', (e) => {
        e.preventDefault();
        this._dragDepth = 0;
        this._setDragOver(false);
        if (this.disabled) return;
        const dropped = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
        if (dropped.length) this.addFiles(dropped);
      });

      this._syncUI();
      this._syncForm();
    }

    _syncUI() {
      const dis = this.disabled;
      this.zone.classList.toggle('is-disabled', dis);
      this.zone.setAttribute('aria-disabled', dis ? 'true' : 'false');
      this.zone.tabIndex = dis ? -1 : 0;
      this.input.disabled = dis;
      this.input.multiple = this.multiple;
      if (this.accept) this.input.setAttribute('accept', this.accept);
      else this.input.removeAttribute('accept');

      const defaultLabel = this.multiple ? 'Drop files here' : 'Drop a file here';
      const label = this.getAttribute('label') || defaultLabel;
      this.titleEl.textContent = label;
      this.zone.setAttribute('aria-label', label);

      const customHint = this.getAttribute('hint');
      if (customHint != null) {
        this.hintEl.textContent = customHint;
      } else {
        const parts = ['or click to browse'];
        const acc = describeAccept(this.accept);
        if (acc) parts.push(acc);
        const ms = this.maxSize;
        if (ms) parts.push(`up to ${formatBytes(ms)}`);
        const mf = this.maxFiles;
        if (this.multiple && mf) parts.push(`max ${mf}`);
        this.hintEl.textContent = parts.join(' · ');
      }

      const btnLabel = this.getAttribute('button-label') || (this.multiple ? 'Choose Files' : 'Choose File');
      this.ctaEl.textContent = btnLabel;

      for (const it of this._items) {
        if (it.rmBtn) it.rmBtn.disabled = dis || it.removing;
      }

      this._syncQuota();
    }

    _syncQuota() {
      const count = this.files.length;
      const mf = this.multiple ? this.maxFiles : null;
      if (mf) {
        this.quotaEl.textContent = `${count} / ${mf}`;
        this.quotaEl.hidden = false;
      } else if (count > 0) {
        this.quotaEl.textContent = `${count} ${count === 1 ? 'file' : 'files'}`;
        this.quotaEl.hidden = false;
      } else {
        this.quotaEl.hidden = true;
      }
    }

    _syncForm() {
      if (!this.internals) return;
      const list = this.files;
      if (!list.length) {
        this.internals.setFormValue(null);
        return;
      }
      const name = this.getAttribute('name');
      if (name && (this.multiple || list.length > 1)) {
        const fd = new FormData();
        for (const f of list) fd.append(name, f);
        this.internals.setFormValue(fd);
      } else {
        this.internals.setFormValue(list[0]);
      }
    }

    _announce(text) {
      if (this.statusEl) this.statusEl.textContent = text;
    }

    _setDragOver(on) {
      if (this._over === on) return;
      this._over = on;
      this.zone.classList.toggle('over', on);
      if (on) {
        this._windT = 0.14;
        this._windBeat = 0;
        if (!fx.calm) {
          this.zoneS.to = 1.03;
          this.iconY.to = -6;
          this.iconRot.to = -6;
          const zc = this._zoneBox();
          ticks(zc.x + zc.hw + 6, zc.y - zc.hh - 6, { dir: -0.78, n: 2, r: 5, len: 13, fan: 0.42, life: 0.36 });
        }
      } else {
        this.zoneS.to = 1;
        this.iconY.to = 0;
        this.iconRot.to = 0;
      }
    }

    _zoneBox() {
      const c = at(this.zone);
      const hw = Math.max(c.w, this.zone.offsetWidth) / 2;
      const hh = Math.max(c.h, this.zone.offsetHeight) / 2;
      return { x: c.x, y: c.y, w: hw * 2, h: hh * 2, hw, hh };
    }

    // ─── Public Methods ───
    browse() {
      if (this.disabled || !this.input) return;
      this.input.click();
    }

    addFiles(fileListOrArray, { quiet = false } = {}) {
      if (this.disabled) return { added: [], rejected: [] };
      const incoming = !fileListOrArray
        ? []
        : fileListOrArray instanceof File || (typeof fileListOrArray.name === 'string' && typeof fileListOrArray.size === 'number')
          ? [fileListOrArray]
          : Array.from(fileListOrArray);
      if (!incoming.length) return { added: [], rejected: [] };

      const acceptStr = this.accept;
      const maxSize = this.maxSize;
      const multi = this.multiple;
      const maxFiles = multi ? this.maxFiles : 1;

      const added = [];
      const rejected = [];
      const newItems = [];

      // Single-file mode: if a valid file arrives, it replaces any existing file
      let activeCount = this.files.length;
      let willReplaceSingle = false;

      for (const file of incoming) {
        if (!file || typeof file.name !== 'string') continue;

        if (!matchesAccept(file, acceptStr)) {
          rejected.push({ file, code: 'type', reason: `${file.name} — file type not allowed` });
          continue;
        }
        if (maxSize != null && file.size > maxSize) {
          rejected.push({ file, code: 'size', reason: `${file.name} — exceeds ${formatBytes(maxSize)} limit` });
          continue;
        }
        if (!multi) {
          if (added.length >= 1) {
            rejected.push({ file, code: 'limit', reason: `${file.name} — only 1 file allowed` });
            continue;
          }
          if (activeCount > 0) willReplaceSingle = true;
        } else if (maxFiles != null && activeCount + added.length >= maxFiles) {
          rejected.push({ file, code: 'limit', reason: `Max ${maxFiles} ${maxFiles === 1 ? 'file' : 'files'} allowed` });
          continue;
        }

        added.push(file);
      }

      if (willReplaceSingle) {
        for (const it of this._items) {
          if (!it.removing) {
            it.removing = true;
            it.el?.remove();
          }
        }
        this._items = this._items.filter((it) => !it.removing);
      }

      for (const file of added) {
        const item = this._createItem(file, quiet || fx.calm);
        this._items.push(item);
        newItems.push(item);
        this.queueEl.append(item.el);
      }

      if (this._items.length) this.queueEl.hidden = false;
      this._syncQuota();
      this._syncForm();

      if (added.length) {
        if (!rejected.length) this._hideAlert(true);
        if (!quiet) this._playDropImpact(newItems);
        else {
          for (const it of newItems) {
            it.waiting = false;
            it.enter.x = it.enter.to = 1;
            it.sq.x = it.sq.to = 1;
            it.el.style.transform = '';
          }
        }
        this._announce(`Added ${added.length} ${added.length === 1 ? 'file' : 'files'}: ${added.map((f) => f.name).join(', ')}`);
        this.emit('change', { files: this.files, added });
      }

      if (rejected.length) {
        const first = rejected[0];
        const msg = rejected.length === 1 ? first.reason : `${first.reason} (+${rejected.length - 1} more)`;
        this._showAlert(msg, quiet);
        if (!quiet && !added.length) this._playReject();
        this._announce(msg);
        this.emit('sakuga:reject', { rejected });
      }

      return { added, rejected };
    }

    removeFile(index) {
      const active = this._items.filter((it) => !it.removing);
      const item = active[index];
      if (!item) return false;

      item.removing = true;
      if (item.rmBtn) item.rmBtn.disabled = true;

      this._syncQuota();
      this._syncForm();
      this._announce(`Removed ${item.file.name}`);
      this.emit('change', { files: this.files, removed: item.file });

      if (fx.calm || !item.el || !item.el.isConnected) {
        item.el?.remove();
        this._items = this._items.filter((it) => it !== item);
        if (!this._items.length) this.queueEl.hidden = true;
        return true;
      }

      // Anime slash-to-remove choreography
      const rc = at(item.el);
      const len = clamp(rc.w * 0.68, 130, 248);
      item.baseH = item.el.offsetHeight || rc.h || 46;
      item.slashHold = true;
      item.el.classList.add('slashed');
      item.sq.x = 0.84;
      item.sq.v = -2.4;
      item.sq.to = 1;
      item.el.style.transform = `scale(${(1 / Math.sqrt(0.84)).toFixed(4)}, 0.8400)`;

      // Diagonal pink crescent slash slicing cleanly across the file card without overlapping neighbors
      slash(rc.x + 8, rc.y + len * 0.02, { len, ang: -0.06, life: 0.34, thick: 14 });
      shards(rc.x + 10, rc.y - 2, { n: 7, speed: 175, size: 5.5, life: 0.52, dir: -Math.PI / 2, arc: Math.PI * 1.15, grav: 360 });
      puff(rc.x + Math.min(rc.w * 0.26, 96), rc.y - 2, { size: 9, n: 4, vx: 38, vy: -14, life: 0.48 });

      later(65, () => {
        if (!this.isConnected) return;
        item.slashHold = false;
        item.enter.k = 320;
        item.enter.d = 26;
        item.enter.to = 0;
      });

      return true;
    }

    clear() {
      const had = this.files.length > 0;
      for (const it of this._items) it.el?.remove();
      this._items = [];
      this.queueEl.hidden = true;
      if (this.input) this.input.value = '';
      this._hideAlert(true);
      this._syncQuota();
      this._syncForm();
      if (had) {
        this._announce('Cleared all files');
        this.emit('change', { files: [], cleared: true });
      }
    }

    // ─── Internal DOM & Animation Helpers ───
    _createItem(file, instant) {
      const ext = fileExt(file.name);
      const tone = extTone(ext, file.type);
      const el = document.createElement('div');
      el.className = 'item';
      el.setAttribute('part', 'item');
      el.setAttribute('role', 'listitem');
      el.innerHTML = `<span class="ext" part="badge" data-tone="${tone}">${esc(ext)}</span>`
        + `<div class="meta"><span class="fname" title="${esc(file.name)}">${esc(file.name)}</span>`
        + `<span class="fsize">${esc(formatBytes(file.size))}</span></div>`
        + `<button class="rm" type="button" part="remove-button" aria-label="Remove ${esc(file.name)}"${this.disabled ? ' disabled' : ''}>${ICON_X}</button>`;

      const item = {
        id: ++this._uid,
        file,
        el,
        extEl: el.querySelector('.ext'),
        rmBtn: el.querySelector('.rm'),
        enter: new Spring(instant ? 1 : 0.01, 440, 18),
        sq: new Spring(1, 480, 14),
        waiting: !instant,
        removing: false,
        slashHold: false,
        baseH: 46,
      };
      if (!instant) el.style.transform = 'scale(0)';

      item.rmBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.disabled || item.removing) return;
        const idx = this._items.filter((it) => !it.removing).indexOf(item);
        if (idx >= 0) this.removeFile(idx);
      });

      return item;
    }

    _playDropImpact(newItems) {
      const n = ++this._seq;
      const multi = newItems.length > 1;
      const zc = this._zoneBox();

      if (fx.calm) {
        for (const it of newItems) {
          it.waiting = false;
          it.enter.x = it.enter.to = 1;
          it.sq.x = it.sq.to = 1;
          it.el.style.transform = '';
        }
        return;
      }

      // Beat 1: Hard volume-preserving dropzone squash + impact flash + back-layer burst
      this.zoneS.x = 0.88;
      this.zoneS.v = 3.8;
      this.zoneS.to = 1;
      this.zoneRot.x = multi ? -1.3 : -0.7;
      this.zoneRot.v = 4.2;
      this.zoneRot.to = 0;
      this.iconY.x = 10;
      this.iconY.v = -68;
      this.iconY.to = 0;
      this.iconRot.x = -9;
      this.iconRot.v = 42;
      this.iconRot.to = 0;
      this.zone.style.transform = `translateX(0px) rotate(${this.zoneRot.x.toFixed(2)}deg) scale(${(1 / Math.sqrt(0.88)).toFixed(4)}, 0.8800)`;
      this.emblem.style.transform = `translateY(10.00px) rotate(-9.00deg)`;

      if (multi) {
        this.zone.classList.add('hit');
        later(95, () => { if (this.zone) this.zone.classList.remove('hit'); });
      }

      // Back-layer burst radiating boldly behind the dropzone
      burst(zc.x, zc.y, {
        r: multi ? 154 : 118,
        spikes: multi ? 19 : 15,
        life: multi ? 0.44 : 0.36,
        layer: this.back,
      });

      // 4 corner dust puffs flying outward
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        puff(zc.x + dx * (zc.hw + 4), zc.y + dy * (zc.hh + 2), {
          size: multi ? rnd(11, 14.5) : rnd(8.5, 11.5),
          n: 4,
          vx: dx * (multi ? 48 : 36),
          vy: dy * 22 - 6,
          life: multi ? rnd(0.72, 0.92) : rnd(0.6, 0.78),
        });
      }

      // Crystal shards erupting outward from the upper corners (keeping center emblem & label 100% legible)
      shards(zc.x - zc.hw * 0.78, zc.y - zc.hh - 2, {
        n: multi ? 6 : 4,
        speed: multi ? 235 : 180,
        size: multi ? 6.8 : 5.5,
        life: 0.72,
        dir: -2.25,
        arc: 0.95,
        grav: 360,
      });
      shards(zc.x + zc.hw * 0.78, zc.y - zc.hh - 2, {
        n: multi ? 6 : 4,
        speed: multi ? 235 : 180,
        size: multi ? 6.8 : 5.5,
        life: 0.72,
        dir: -0.9,
        arc: 0.95,
        grav: 360,
      });

      // Pink accent ticks at upper-right (and upper-left on multi)
      ticks(zc.x + zc.hw + 8, zc.y - zc.hh - 8, { dir: -0.78, n: 3, r: 6, len: 18, fan: 0.42, life: 0.46 });
      if (multi) {
        ticks(zc.x - zc.hw - 8, zc.y - zc.hh - 8, { dir: -2.36, n: 2, r: 6, len: 15, fan: 0.4, life: 0.42 });
      }

      // Manga SFX lettering cleanly above the dropzone (never overlapping labels)
      if (multi) {
        sfx('don', zc.x + 12, zc.y - zc.hh - 54, { size: 128, rot: -0.11, life: 0.82 });
      } else {
        sfx('pon', zc.x + Math.min(zc.hw * 0.25, 64), zc.y - zc.hh - 46, { size: 96, rot: -0.09, life: 0.78, ...hollow() });
      }

      // Beat 2: Staggered wave of file rows springing into the queue + kira glint on extension stamps
      newItems.forEach((item, i) => {
        const launch = () => {
          if (!this.isConnected || item.removing) return;
          item.waiting = false;
          item.enter.x = 0.22;
          item.enter.v = 5.4;
          item.enter.to = 1;
          item.sq.x = 0.76;
          item.sq.v = 3.2;
          item.sq.to = 1;
          item.el.style.transform = `scale(${(0.22 / Math.sqrt(0.76)).toFixed(4)}, ${(0.22 * 0.76).toFixed(4)})`;
          later(110, () => {
            if (!this.isConnected || item.removing || !item.extEl) return;
            const q = at(item.extEl, 0.06, 0.06);
            kira(q.x, q.y, { r: 9.5, life: 0.55 });
          });
        };
        if (i === 0) launch();
        else later(i * 55, launch);
      });

      // Beat 3: Subtle settle wobble marks on the dropzone flanks after multi-file impact
      if (multi) {
        later(190, () => {
          if (n !== this._seq || !this.isConnected) return;
          const q = this._zoneBox();
          wob(q.x - q.hw - 10, q.y, { dir: -1, r: 12, life: 0.38 });
          wob(q.x + q.hw + 10, q.y, { dir: 1, r: 12, life: 0.38 });
        });
      }
    }

    _playReject() {
      if (fx.calm) return;
      const zc = this._zoneBox();
      this.zoneShake.x = -13;
      this.zoneShake.v = 270;
      this.zoneShake.to = 0;
      this.zoneRot.x = 1.4;
      this.zoneRot.v = -16;
      this.zoneRot.to = 0;
      this.iconRot.x = -14;
      this.iconRot.v = 90;
      this.iconRot.to = 0;
      this.zone.style.transform = 'translateX(-13.00px) rotate(1.40deg) scale(1.0000, 1.0000)';

      wob(zc.x - zc.hw - 10, zc.y, { dir: -1, r: 14, life: 0.48 });
      wob(zc.x + zc.hw + 10, zc.y, { dir: 1, r: 14, life: 0.48 });
      shards(zc.x - zc.hw, zc.y - zc.hh * 0.35, { n: 4, speed: 155, size: 5.5, dir: Math.PI, arc: 1.2, life: 0.62 });
      shards(zc.x + zc.hw, zc.y - zc.hh * 0.35, { n: 4, speed: 155, size: 5.5, dir: 0, arc: 1.2, life: 0.62 });
      ticks(zc.x + zc.hw + 6, zc.y - zc.hh - 6, { dir: -0.72, n: 2, r: 5, len: 14, fan: 0.42, life: 0.42 });
    }

    _showAlert(msg, quiet) {
      this.alertMsgEl.textContent = msg;
      this.alertEl.hidden = false;
      this._alertShown = true;
      this._alertHiding = false;
      if (quiet || fx.calm) {
        this.alertS.x = this.alertS.to = 1;
        this.alertS.v = 0;
        this.alertEl.style.transform = '';
      } else {
        this.alertS.x = 0.2;
        this.alertS.v = 4.6;
        this.alertS.to = 1;
        this.alertEl.style.transform = 'scale(0.2000)';
      }
    }

    _hideAlert(instant = false) {
      if (!this._alertShown) return;
      if (instant || fx.calm) {
        this._alertShown = false;
        this._alertHiding = false;
        this.alertS.x = this.alertS.to = 0;
        this.alertS.v = 0;
        this.alertEl.hidden = true;
        this.alertEl.style.transform = '';
      } else {
        this._alertHiding = true;
        this.alertS.to = 0;
      }
    }

    frame(dt) {
      // 1. Drag-over inward wind lines + corner ticks (cleanly throttled in frame(dt))
      if (this._over && !fx.calm) {
        this._windT += dt;
        if (this._windT >= 0.18) {
          this._windT = 0;
          this._windBeat++;
          const zc = this._zoneBox();
          lines(zc.x - zc.hw - 26, zc.y, { n: 3, dir: 0, len: 28, spread: Math.min(zc.hh * 0.65, 42), life: 0.24 });
          lines(zc.x + zc.hw + 26, zc.y, { n: 3, dir: Math.PI, len: 28, spread: Math.min(zc.hh * 0.65, 42), life: 0.24 });
          if (this._windBeat % 2 === 1) {
            ticks(zc.x + zc.hw + 6, zc.y - zc.hh - 6, { dir: -0.78, n: 2, r: 5, len: 12, fan: 0.4, life: 0.32 });
            ticks(zc.x - zc.hw - 6, zc.y + zc.hh + 6, { dir: 2.36, n: 2, r: 5, len: 12, fan: 0.4, life: 0.32 });
          }
        }
      }

      // 2. Dropzone springs (volume-preserving squash/stretch + shake + tilt)
      const sy = clamp(this.zoneS.step(dt), 0.72, 1.25);
      const sx = 1 / Math.sqrt(sy);
      const shx = this.zoneShake.step(dt);
      const zr = this.zoneRot.step(dt);
      const zStill = !this._over
        && Math.abs(sy - 1) < 0.001 && Math.abs(this.zoneS.v) < 0.01
        && Math.abs(shx) < 0.08 && Math.abs(this.zoneShake.v) < 0.2
        && Math.abs(zr) < 0.02 && Math.abs(this.zoneRot.v) < 0.05;

      if (zStill) {
        if (this.zone.style.transform) this.zone.style.transform = '';
        if (this.zone.style.willChange) this.zone.style.willChange = '';
      } else {
        if (!this.zone.style.willChange) this.zone.style.willChange = 'transform';
        this.zone.style.transform = `translateX(${shx.toFixed(2)}px) rotate(${zr.toFixed(2)}deg) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      }

      // 3. Emblem float & tilt spring
      const iy = this.iconY.step(dt);
      const ir = this.iconRot.step(dt);
      const iStill = Math.abs(iy) < 0.05 && Math.abs(this.iconY.v) < 0.1 && Math.abs(ir) < 0.05 && Math.abs(this.iconRot.v) < 0.1;
      if (iStill) {
        if (this.emblem.style.transform) this.emblem.style.transform = '';
      } else {
        this.emblem.style.transform = `translateY(${iy.toFixed(2)}px) rotate(${ir.toFixed(2)}deg)`;
      }

      // 4. Alert pill pop / shrink-to-zero spring
      if (this._alertShown) {
        const as = Math.max(0, this.alertS.step(dt));
        if (this._alertHiding && as <= 0.025) {
          this._alertShown = false;
          this._alertHiding = false;
          this.alertEl.hidden = true;
          this.alertEl.style.transform = '';
        } else if (!this._alertHiding && Math.abs(as - 1) < 0.002 && Math.abs(this.alertS.v) < 0.01) {
          if (this.alertEl.style.transform) this.alertEl.style.transform = '';
        } else {
          this.alertEl.style.transform = `scale(${as.toFixed(4)})`;
        }
      }

      // 5. File queue row springs (staggered volume-preserving pop-in & slash shrink-to-zero)
      let pruned = false;
      for (let i = this._items.length - 1; i >= 0; i--) {
        const it = this._items[i];
        if (it.waiting) continue;

        const e = Math.max(0, it.enter.step(dt));
        const q = clamp(it.sq.step(dt), 0.65, 1.35);

        if (it.removing) {
          if (!it.slashHold && e <= 0.025) {
            it.el.remove();
            this._items.splice(i, 1);
            pruned = true;
            continue;
          }
          const scx = e / Math.sqrt(q);
          const scy = e * q;
          it.el.style.transform = `scale(${scx.toFixed(4)}, ${scy.toFixed(4)})`;
          if (!it.slashHold && e < 0.5) {
            const k = clamp(e / 0.5, 0, 1);
            it.el.style.maxHeight = `${(it.baseH * k).toFixed(1)}px`;
            it.el.style.paddingTop = `${(6 * k).toFixed(1)}px`;
            it.el.style.paddingBottom = `${(6 * k).toFixed(1)}px`;
            it.el.style.marginTop = `${(-6 * (1 - k)).toFixed(1)}px`;
            it.el.style.overflow = 'hidden';
          }
        } else {
          const still = Math.abs(e - 1) < 0.002 && Math.abs(it.enter.v) < 0.01
            && Math.abs(q - 1) < 0.002 && Math.abs(it.sq.v) < 0.01;
          if (still) {
            if (it.el.style.transform) it.el.style.transform = '';
            if (it.el.style.willChange) it.el.style.willChange = '';
          } else {
            if (!it.el.style.willChange) it.el.style.willChange = 'transform';
            const scx = e / Math.sqrt(q);
            const scy = e * q;
            it.el.style.transform = `scale(${scx.toFixed(4)}, ${scy.toFixed(4)})`;
          }
        }
      }

      if (pruned && !this._items.length) {
        this.queueEl.hidden = true;
      }
    }
  }

  fx.define('sakuga-upload', SakugaUpload);
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
