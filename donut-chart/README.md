# Donut Chart

Cel-shaded anime donut & pie distribution chart drawn on a high-DPI shadow-DOM canvas stepped on SakugaFX's shared clock. Slices unfurl clockwise from 12 o'clock on underdamped springs with peak-slice `ticks` and a `kira` glint, slide radially outward on hover/focus with a slanted manga center KPI readout and speech-bubble callout, and punch out with dust `puff`, pink `ticks`, hollow `カチッ`, and a back-layer impact `burst` + twin `kira` glints on the #1 peak slice.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/donut-chart/
```

`?embed=1` hides the heading, hint, and secondary variant showcase.

## Use it

`donut-chart.js` is the whole component: one file, no dependencies.

```html
<script src="donut-chart.js"></script>
<sakuga-donut-chart id="el" label="Studio Time" unit="h"></sakuga-donut-chart>
```

```js
const el = document.querySelector('sakuga-donut-chart');
el.items = [
  { label: 'Key Animation', value: 64, tone: 'pri', sub: 'Genga & layouts' },
  { label: 'In-Betweening', value: 42, tone: 'acc', sub: 'Douga & cleanup' },
  { label: 'Background Art', value: 28, tone: 'cyan', sub: 'Painted cels' },
  { label: 'VFX Compositing', value: 18, tone: 'amber', sub: 'Sakuga effects' },
  { label: 'Sound Mix', value: 12, tone: 'green', sub: 'Foley & score' },
];

el.addEventListener('select', (e) => console.log(e.detail)); // { index, item, percent }
el.select(0);      // pop & pin slice 0
el.mode = 'pie';   // spring iris morph between donut and pie
el.replay();       // replay clockwise unfurl sweep
el.impact();       // fire full peak impact burst & glints
```

| attribute | what it sets | default |
|---|---|---|
| `mode` | `donut` or `pie` (spring iris morph) | `donut` |
| `size` | dial size: `sm` (`168px`), `md` (`228px`), or `lg` (`288px`) | `md` |
| `unit` | suffix appended to numeric values (e.g. `h`, `%`) | empty |
| `label` | accessible region label and default center KPI caption | `Total` |
| `center-value` | optional string override for the center total readout | formatted sum |
| `legend` | legend placement: `bottom`, `side` (auto-stacks `< 470px`), or `none` | `bottom` |
| `selected` | pinned slice index (`-1` for none) | `-1` |
| `data` | JSON-encoded `items` array | empty |
| `empty-text` | label shown when `items` is empty or sums to zero | `No data` |

### Item Shape & Palette Tones

Each item in `el.items` accepts `{ label, value, tone?, sub?, valueText? }`. Built-in cel-shaded tones are `pri`, `acc`, `soft`, `green`, `amber`, `cyan`, and `ink` (plus custom CSS hex/rgb strings). Omitted tones cycle automatically without adjacent wrap-around collisions.

### Methods & Events

- `select(index)` — pins slice `index`, explodes it outward with click VFX (`puff`, `ticks`, hollow `カチッ`, plus back-layer `burst` & twin `kira` on the #1 peak slice), and emits `select` & `change`.
- `clearSelection()` — unpins the active slice back to the total view and emits `select` & `change` (`{ index: -1, item: null, percent: 0 }`).
- `replay()` — replays the clockwise unfurl sweep entrance from 12 o'clock.
- `impact()` — fires the peak impact choreography (`burst`, twin `kira`, `puff`, `ticks`, hollow `カチッ`) on the selected or #1 peak slice.
- `select` / `change` (`{ index, item, percent }`) — dispatched when a slice is selected or deselected via pointer, legend pill, keyboard (`Arrow*`, `Enter`/`Space`, `Escape`), or API.
