# DateRange

Twin-field manga date-range picker with a spring-animated speech-bubble popover, dual-month desktop / single-month mobile layout, quick preset rail, live hover range bridge, and `max-span` recoil guard. Plain crisp ink-bordered capsule at rest displaying Start → End dates, a cel-shaded span badge pill (`8d`), optional clear chip, and ink-divided calendar button. Opening pops a speech bubble with flanking puffs, corner ticks, and a trigger ring; first click anchors the start with ticks, puff, and a hollow `カチッ`; second click or preset locks the range with twin `kira` glints, a speed-line sweep + crescent `slash`, corner braking puffs, and a dotted `ズザッ` (or hollow `ポン` for a 1-day range). Clearing slashes across the capsule with crystal shards.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/daterange/
```

`?embed=1` hides the heading and inline showcase.

## Use it

`daterange.js` is the whole component: one file, no dependencies.

```html
<script src="daterange.js"></script>
<sakuga-daterange
  name="period"
  start="2026-04-08"
  end="2026-04-15"
  clearable
  presets
  label="Sprint window">
</sakuga-daterange>

<!-- Constrained max-span picker -->
<sakuga-daterange max-span="7" min="2026-04-01" max="2026-06-30" clearable></sakuga-daterange>

<!-- Inline dual-month calendar directly in flow -->
<sakuga-daterange inline clearable start="2026-04-10" end="2026-04-22"></sakuga-daterange>
```

```js
const el = document.querySelector('sakuga-daterange');
el.addEventListener('change', (e) => console.log(e.detail)); // { start, end, days, value }
el.addEventListener('sakuga:reject', (e) => console.log(e.detail)); // { reason, days, maxSpan }

el.setRange('2026-04-01', '2026-04-10');
el.presets = [
  { label: 'Q2 Start', start: '2026-04-01', end: '2026-04-14' },
  { label: 'Last 5d', days: 5 },
];
```

| attribute | what it sets | default |
|---|---|---|
| `start` | range start date (`YYYY-MM-DD`) | empty |
| `end` | range end date (`YYYY-MM-DD`) | empty |
| `value` | combined range (`YYYY-MM-DD..YYYY-MM-DD`) | empty |
| `min` | earliest selectable date (`YYYY-MM-DD`) | none |
| `max` | latest selectable date (`YYYY-MM-DD`) | none |
| `max-span` | maximum inclusive days allowed (recoils + emits `sakuga:reject` if exceeded) | none |
| `presets` | quick preset rail (`"false"` hides; comma list like `"today,7d,14d"` customizes) | on (`Today`, `Last 7d`, `Last 14d`, `Last 30d`, `This Month`) |
| `clearable` | shows a `×` clear button when a range exists | off |
| `inline` | renders the range calendar directly in flow without a popover | off |
| `keep-open` | keeps the popover open after completing a range | off |
| `compact` | compact field height and tighter typography | off |
| `disabled` | disables opening, clearing, and date picking | off |
| `label` | accessible trigger and dialog label | `Date range` |
| `placeholder-start` | start date placeholder | `Start date` |
| `placeholder-end` | end date placeholder | `End date` |

### Properties, Methods & Events

- **Properties**: `start`, `end`, `value`, `days` (readonly), `min`, `max`, `maxSpan`, `presets`, `clearable`, `inline`, `keepOpen`, `compact`, `disabled`, `open` (readonly)
- **Methods**: `show()`, `hide()`, `toggle()`, `setRange(start, end, silent?)`, `clear(silent?)`
- **Events**: `change` (`{ start, end, days, value }`), `sakuga:open`, `sakuga:close`, `sakuga:reject` (`{ reason, days, maxSpan, date, min, max }`)
- **Forms**: form-associated (`ElementInternals.setFormValue`); submits `YYYY-MM-DD..YYYY-MM-DD` under its `name` attribute and supports form reset.
- **Keyboard**: `Enter` / `Space` / `ArrowDown` opens from the trigger; Arrow keys move across days (updating hover preview while picking end date); `Home` / `End` jump within the week; `PageUp` / `PageDown` navigate months (`Shift` for years); `Escape` closes and returns focus.
