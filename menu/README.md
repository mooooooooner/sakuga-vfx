# Menu

Plain crisp ink-bordered trigger button (or any custom slotted trigger) at rest. Opening springs out a manga speech-bubble panel with a ring off the trigger, side puffs, and corner pink wedges; hovering or navigating slides a cel-shaded highlight pill on a spring. Picking a normal item pops it with ticks, puff, kira glint, and hollow カチッ; toggling a checkable item pops a pink SVG checkmark with hollow ポン; activating a danger item slices it with a pink crescent slash, crystal shards, corner ticks, impact inversion, and hollow ドン.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/menu/
```

`?embed=1` hides the heading.

## Use it

`menu.js` is the whole component: one file, no dependencies.

```html
<script src="menu.js"></script>
<sakuga-menu label="Actions">
  <option value="edit" data-icon="edit" data-shortcut="⌘E">Edit Frame</option>
  <option value="duplicate" data-icon="copy" data-shortcut="⌘D">Duplicate</option>
  <option value="pin" data-checkable data-checked>Pin to Top</option>
  <hr>
  <option value="delete" data-icon="trash" data-shortcut="Del" data-danger>Delete Cut</option>
</sakuga-menu>
```

Pass a custom trigger via `slot="trigger"`:

```html
<sakuga-menu align="end" label="More options">
  <button type="button" slot="trigger">⋯</button>
  <option value="share" data-icon="share">Share Link</option>
  <option value="purge" data-icon="trash" data-danger>Purge</option>
</sakuga-menu>
```

```js
const menu = document.querySelector('sakuga-menu');
menu.addEventListener('select', (e) => console.log(e.detail)); // { value, label, index, item, checked }
menu.items = [
  { value: 'edit', label: 'Edit', icon: 'edit', shortcut: '⌘E' },
  { value: 'pin', label: 'Pin', checkable: true, checked: true },
  { divider: true },
  { value: 'delete', label: 'Delete', icon: 'trash', shortcut: 'Del', danger: true },
];
// Use as a context menu at cursor coordinates:
target.addEventListener('contextmenu', (e) => { e.preventDefault(); menu.openAt(e.clientX, e.clientY); });
```

### Attributes

| attribute | what it sets | default |
|---|---|---|
| `label` | trigger label and accessible menu name | `Actions` |
| `align` | horizontal menu alignment (`start` or `end`) | `start` |
| `disabled` | disables trigger and prevents opening | off |
| `compact` | compact sizing for trigger and menu rows | off |

### `<option>` item attributes

| attribute | what it sets |
|---|---|
| `value` | action value emitted on `select` |
| `data-icon` | built-in icon token (`edit`, `copy`, `share`, `star`, `pin`, `trash`, `check`, `bolt`, `download`) or short glyph/emoji |
| `data-shortcut` | keyboard shortcut badge rendered in a flat keycap chip |
| `data-checkable` | turns the item into a toggleable `menuitemcheckbox` |
| `data-checked` | sets initial checked state on a checkable item |
| `data-danger` | pink danger styling and anime slash execution |
| `data-divider` | renders a manga ink divider line (or use `<hr>`) |
| `disabled` | disables the individual item |

### Properties, methods & events

| member | type | description |
|---|---|---|
| `open` | property | boolean open state (`true` / `false`) |
| `items` | property | read or set normalized item descriptors array |
| `label`, `align`, `disabled`, `compact` | property | reflected attribute properties |
| `show()`, `hide()`, `toggle()` | method | open, close, or toggle anchored menu |
| `openAt(x, y)` | method | open as a context menu at viewport coordinates `(x, y)` |
| `select` | event | `{ value, label, index, item, checked }` (bubbles + composed) |
| `sakuga:open`, `sakuga:close` | event | lifecycle events when panel opens or closes |
