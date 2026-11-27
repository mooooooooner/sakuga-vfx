# Calendar

Inline cel-shaded manga calendar with seamless **Day ↔ Month ↔ Year (decade)** zoom-cut switching, weekend rest styling, event marker pips, and a spring-animated selected-day agenda strip.

Drilling **up** (`Day → Month → Year`) punches the grid inward with outward speed lines, corner pink ticks, and hollow **シュッ**. Drilling **down** (`Year → Month → Day`) zooms forward on spring physics with corner puffs, an expanding ring, and hollow **カチッ**. Picking a day pops the tile with pink ticks, dust puff, kira glints (twin glints on event days or Today), and hollow **カチッ**; jumping to **Today** lands with a ring, twin glints, and hollow **ポン**.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/calendar/
```

`?embed=1` hides the heading.

## Use it

`calendar.js` is the whole component: one file, no dependencies. Form-associated (`FormData` submits the selected `YYYY-MM-DD`).

```html
<script src="calendar.js"></script>
<sakuga-calendar id="cal" value="2026-04-15" label="Production schedule"></sakuga-calendar>
```

```js
const cal = document.getElementById('cal');
cal.events = [
  { date: '2026-04-15', title: 'Key Animation Review', tone: 'acc' },
  { date: '2026-04-22', title: 'Color Script Lock', tone: 'green' },
];
cal.addEventListener('change', (e) => console.log(e.detail));
// { value: '2026-04-15', year: 2026, month: 4, day: 15, events: [...] }
cal.addEventListener('sakuga:view-change', (e) => console.log(e.detail));
// { view: 'month', prev: 'day', year: 2026, month: 4 }
```

## Attributes & properties

| attribute | property | what it sets | default |
|---|---|---|---|
| `value` | `value` | selected date (`YYYY-MM-DD`) | empty |
| `view` | `view` | active view: `day`, `month`, or `year` | `day` |
| `min` | `min` | earliest selectable date (`YYYY-MM-DD`) | none |
| `max` | `max` | latest selectable date (`YYYY-MM-DD`) | none |
| `week-start` | `weekStart` | first day of week: `mon` or `sun` | `mon` |
| `label` | `label` | accessible region label | `Calendar` |
| `disabled` | `disabled` | disables all interaction | off |
| `events` | `events` | JSON array (attr) or array (prop) of `{ date, title, tone?: 'pri'\|'acc'\|'green'\|'amber' }` | `[]` |
| `show-agenda` | `showAgenda` | shows selected-day event tag pills (`false` to hide) | `true` |

## Methods

- `setView(view)` — switches between `'day'`, `'month'`, and `'year'` with zoom-cut animation and emits `sakuga:view-change`.
- `goTo(year, month?)` — navigates to the target year (and optional 1-based month) and emits `sakuga:navigate`.
- `today()` — jumps to Day view on today's date with Today Jump VFX and emits `change`.
- `select(dateStr, silent?)` — selects a `YYYY-MM-DD` date, navigates to its month, and emits `change` unless `silent` is true.

## Keyboard

- **Arrow keys**: move cell focus across day, month, and decade grids (auto-stepping across boundaries).
- **PageUp / PageDown**: step previous/next month, year, or decade (`Shift+PageUp/Down` steps year in Day view).
- **Enter / Space**: select day or drill down from Year → Month → Day.
- **Backspace / Alt+ArrowUp**: drill up from Day → Month → Year.
