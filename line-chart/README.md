# Line Chart

A cel-shaded anime line & area trend chart drawn on a high-DPI shared-clock canvas. The curve streaks left-to-right on a spring with trailing speed lines and dust puffs, pops cel-shaded nodes at every X-station, and triggers pink accent ticks + a `kira` glint on the peak maximum. Area mode fills under the curve with crisp flat 45-degree halftone screentone dots and a solid highlight ribbon (zero gradients, zero blur).

Hovering, dragging on touch, or pressing arrow keys glides a spring crosshair scrubber with an auto-flipping cel-shaded manga speech-bubble callout. Clicking (or pressing `Enter`/`Space`) pins a point with pink ticks, a baseline dust puff, and a hollow manga sound-effect word (`カチッ`, or `ポン` + `kira` on the peak) cleanly above the chart frame.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/line-chart/
```

`?embed=1` hides the heading and hint.

## Use it

`line-chart.js` is the whole component: one file, no dependencies.

```html
<script src="line-chart.js"></script>
<sakuga-line-chart area label="Weekly Output" unit=" cuts"></sakuga-line-chart>
```

### Single Series

```js
const el = document.querySelector('sakuga-line-chart');
el.items = [
  { label: 'Mon', value: 18 },
  { label: 'Tue', value: 32 },
  { label: 'Wed', value: 26 },
  { label: 'Thu', value: 48 },
  { label: 'Fri', value: 41 },
  { label: 'Sat', value: 64 },
  { label: 'Sun', value: 52 },
];
el.addEventListener('select', (e) => console.log(e.detail));
```

### Multi-Series Compare

```js
el.labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
el.series = [
  { name: 'Key Frames', tone: 'pri', data: [18, 32, 26, 48, 41, 64, 52] },
  { name: 'In-Betweens', tone: 'acc', data: [12, 24, 34, 30, 51, 44, 58] },
];
```

Clicking a legend chip at top-right toggles that series' visibility with a spring pop.

## Attributes & Properties

| attribute / property | what it sets | default |
|---|---|---|
| `area` | enable flat halftone screentone + highlight ribbon area fill | `false` (off unless present) |
| `smooth` | use overshoot-free monotone cubic curve instead of sharp manga polyline | `false` |
| `show-dots` / `showDots` | show cel-shaded circular data nodes (`"false"` hides resting dots) | `true` |
| `show-grid` / `showGrid` | show horizontal dashed ink guide lines (`"false"` hides grid) | `true` |
| `tone` | single-series tone token (`pri`, `acc`, `green`, `amber`, etc.) | `pri` |
| `unit` | suffix appended to readout values (e.g. `' cuts'`, `'fps'`, `'h'`) | empty |
| `height` | canvas plot height in pixels (`120`–`640`) | `220` |
| `label` | chart title & accessible `aria-label` | empty |
| `empty-text` / `emptyText` | placeholder shown when dataset is empty | `No data` |
| `data` | JSON string (`items` array or `{ labels, series }` object) | empty |
| `items` *(prop)* | single-series `[{ label, value, sub? }]` array | `[]` |
| `series` *(prop)* | multi-series `[{ name, tone?, data: number[], hidden? }]` array | `[]` |
| `labels` *(prop)* | X-axis category labels array for multi-series mode | `[]` |
| `selected` *(prop)* | currently pinned X-index (`-1` for none) | `-1` |

## Methods & Events

- `replay()` — replays the left-to-right stroke-draw speed entrance and peak `kira` beat.
- `select(index)` — pins/selects the X-station at `index`, pops the node & speech bubble, fires pin VFX, and emits `select`.
- `clearSelection()` — unpins the active selection.
- Events: `hover` and `select` with `detail = { index, label, value, values, series, pinned }`.
- Keyboard: focus the chart stage and press `ArrowLeft`/`ArrowRight`, `Home`/`End` to scrub, `Enter`/`Space` to pin/unpin, `Escape` to clear.
