# Sidebar

Manga vertical navigation panel framed in thick deep-indigo ink with a hard lavender cel shadow. Selecting an item launches a raised cel-shaded active capsule + vivid pink accent bar vertically on spring physics (velocity-stretching in flight, landing with squash, pink accent wedges, braking puff, and hollow カチッ on adjacent hops — or vertical speed lines, pink crescent slash, braking puffs, and hollow シュッ on long jumps across groups). Supports spring-unfolding nested submenus with a vertical ink guide rail, icon-rail collapse mode with cel-shaded manga speech-bubble tooltips, badge pop glints, and full keyboard navigation.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/sidebar/
```

`?embed=1` hides the heading.

## Use it

`sidebar.js` is the whole component: one file, no dependencies.

```html
<script src="sidebar.js"></script>
<sakuga-sidebar collapsible heading="SAKUGA STUDIO" value="dashboard">
  <optgroup label="Workspace">
    <option value="dashboard" data-icon="grid">Dashboard</option>
    <option value="inbox" data-icon="inbox" data-badge="4">Inbox</option>
    <option value="cuts" data-icon="layers" data-badge="12" data-badge-tone="pri">Production Cuts</option>
    <option value="cuts/keyframes" data-parent="cuts" data-icon="spark">Keyframes</option>
    <option value="cuts/vfx" data-parent="cuts" data-icon="rocket" data-badge="NEW" data-badge-tone="green">VFX Sheets</option>
  </optgroup>
  <hr>
  <optgroup label="Studio">
    <option value="analytics" data-icon="chart">Analytics</option>
    <option value="settings" data-icon="sliders">Preferences</option>
  </optgroup>
  <div slot="footer">Studio Footer</div>
</sakuga-sidebar>
```

Or configure programmatically via `el.items`:

```js
const sb = document.querySelector('sakuga-sidebar');
sb.items = [
  { group: 'Workspace' },
  { value: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { value: 'inbox', label: 'Inbox', icon: 'inbox', badge: '4', badgeTone: 'acc' },
  {
    value: 'cuts', label: 'Production Cuts', icon: 'layers', badge: '12', badgeTone: 'pri',
    children: [
      { value: 'cuts/keyframes', label: 'Keyframes', icon: 'spark' },
      { value: 'cuts/vfx', label: 'VFX Sheets', icon: 'rocket', badge: 'NEW', badgeTone: 'green' },
    ],
  },
  { divider: true },
  { group: 'Studio' },
  { value: 'settings', label: 'Preferences', icon: 'sliders' },
];
sb.addEventListener('change', (e) => console.log(e.detail)); // { value, label, item, prev }
sb.setBadge('inbox', '5');
```

### Attributes

| attribute | what it sets | default |
|---|---|---|
| `value` | active item value | first selectable leaf |
| `collapsed` | icon-rail collapsed mode | off |
| `collapsible` | renders built-in collapse toggle button in header | off |
| `heading` | brand heading text in header | `""` |
| `label` | `aria-label` on `<nav>` | `Sidebar navigation` |
| `compact` | tighter row height and padding | off |
| `items` / `data` | optional JSON array of item descriptors | — |

### Slots & CSS custom properties

| token / slot | purpose | default |
|---|---|---|
| `slot="header"` | custom brand content inside header | built-in mark + `heading` |
| `slot="footer"` | pinned bottom section with crisp ink top divider | hidden when empty |
| `--sk-sidebar-width` | expanded sidebar width | `248px` |
| `--sk-sidebar-rail` | collapsed icon-rail width | `68px` |

### `<option>` item attributes

| attribute | what it sets |
|---|---|
| `value` | route/item value emitted on `change` |
| `data-icon` | built-in icon (`grid`, `home`, `spark`, `layers`, `calendar`, `chart`, `folder`, `bell`, `sliders`, `users`, `rocket`, `bookmark`, `terminal`, `shield`, `star`, `inbox`, `compass`) or single glyph |
| `data-badge` | cel-shaded pill text (shown as an inked corner dot when collapsed) |
| `data-badge-tone` | badge color (`acc`, `pri`, `amber`, `green`, `soft`, `ink`) |
| `data-parent` | attaches option as a nested submenu child under the parent `value` |
| `data-group` | starts a section group header inline |
| `data-expanded` | expands a parent submenu initially |
| `disabled` | disables the item |

### Properties, methods & events

| member | type | description |
|---|---|---|
| `value`, `collapsed`, `collapsible`, `heading`, `label`, `compact`, `items` | property | reflected state & item tree |
| `select(value, silent?)` | method | activates item (auto-expanding its parent submenu if nested) |
| `toggleCollapse()` | method | toggles expanded ↔ icon-rail mode |
| `toggleGroup(value)` | method | expands or collapses a nested submenu |
| `setBadge(value, badge, tone?)` | method | updates badge pill and pops it with a spring + `kira` glint |
| `change` | event | `{ value, label, item, prev }` (bubbles + composed) |
| `sakuga:collapse` | event | `{ collapsed }` (bubbles + composed) |
| `sakuga:toggle` | event | `{ value, expanded }` (bubbles + composed) |
