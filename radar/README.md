# Radar

Cel-shaded anime Power Hexagon / Stat Radar Chart drawn on a high-DPI shadow-DOM canvas stepped on SakugaFX's shared clock. Uses flat manga halftone screentone fills (Ben-Day dots for primary, 45° diagonal comic hatch for comparison series), alternating two-tone concentric rings, slanted S/A/B/C/D rank stamps, interactive radial vertex dragging, speech-bubble vertex callouts, and a full `powerUp()` detonation beat with back-layer impact burst, crystal shards, twin kira glints, and `ドン!`.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/radar/
```

`?embed=1` hides the heading, hint, and secondary size showcase.

## Use it

`radar.js` is the whole component: one file, no dependencies.

```html
<script src="radar.js"></script>
<sakuga-radar id="el" show-ranks interactive label="Animator Power"></sakuga-radar>
```

```js
const el = document.querySelector('sakuga-radar');

// Single-series convenience (3–8 axes)
el.items = [
  { label: 'Sakuga', value: 96 },
  { label: 'Timing', value: 91 },
  { label: 'Impact', value: 82 },
  { label: 'Linework', value: 94 },
  { label: 'Smear', value: 78 },
  { label: 'Pacing', value: 86 },
];

// Dual-series Rival comparison mode
el.axes = ['Sakuga', 'Timing', 'Impact', 'Linework', 'Smear', 'Pacing'];
el.series = [
  { name: 'Unit-01', tone: 'pri', values: [96, 91, 82, 94, 78, 86] },
  { name: 'Rival',   tone: 'acc', values: [92, 80, 98, 74, 95, 85] },
];

el.replay();                      // staggered spring-burst entrance + S-rank glints
el.powerUp();                     // anticipation dip -> back-layer burst, shards, kira & ドン!
el.setValues([98, 92, 90, 95, 84, 88]);
el.select(0);                     // pin vertex callout + hollow カチッ
el.clearSelection();

el.addEventListener('select', (e) => console.log('Selected:', e.detail));
el.addEventListener('change', (e) => console.log('Tuned:', e.detail));
el.addEventListener('sakuga:srank', (e) => console.log('S-RANK!', e.detail));
```

| attribute | what it sets | default |
|---|---|---|
| `size` | radar dimensions: `sm` (`292px`), `md` (`356px`), or `lg` (`432px`) | `md` |
| `max` | maximum scale value across all axes | `100` |
| `tone` | primary series fill color: `pri`, `acc`, `green`, or `amber` | `pri` |
| `show-ranks` | displays slanted anime rank stamps (`S`, `A`, `B`, `C`, `D`) beside vertices and in the footer badge | off |
| `interactive` | enables radial pointer drag on vertices and Up/Down arrow stat tuning | off |
| `label` | accessible chart title and compact footer caption | `""` |
| `unit` | suffix appended to stat numbers | `""` |
| `data` | JSON array of `{ label, value }` items or `{ axes, series }` comparison object | 6-axis defaults |

### Properties, Methods & Events

- `items` — get/set single-series `[{ label, value }, ...]` (3–8 axes).
- `axes` — get/set axis labels `['ATK', 'SPD', ...]`.
- `series` — get/set multi-series comparison `[{ name, tone?, values: [...] }, ...]`.
- `replay()` — plays the staggered radial spring-burst entrance from `0` outward with `ticks` + `kira` glints on S-rank (`>= 90%`) vertices.
- `powerUp()` / `impact()` — plays a `-12%` anticipation coil (`95ms`), then snaps back with back-layer `burst`, peak `shards`, twin `kira` glints, corner `puff` clouds, and `ドン!` above the top vertex.
- `setValues(vals, seriesIdx = 0)` — updates values on a series with spring animation and fires `sakuga:srank` for axes newly crossing `>= 90%`.
- `select(index)` / `clearSelection()` — pins/unpins a vertex callout with hollow `カチッ` and `select` event.
- Events: `select` (`{ index, label, value, values, item, ratio, rank }`), `input` / `change` (when `interactive`), and `sakuga:srank` (`{ index, label, value, ratio, rank }`).
- Keyboard (`tabindex="0"` stage): `ArrowLeft` / `ArrowRight` cycle axes, `Enter` / `Space` pins, `ArrowUp` / `ArrowDown` tunes values when `interactive` (hold `Shift` for ±1 fine tuning), `Escape` clears selection.
