# Heatmap

Groups days by `YYYY-MM` into ink-outlined monthly mini-cards with Mon-Sun grids, 4-level two-tone intensity swatches, diagonally hatched off-days, and a crisp legend. Hovering or tapping pops a cell with a speech-bubble tooltip; peak days fire ticks, kira glint, and hollow ポン.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/heatmap/
```

`?embed=1` hides the heading.

## Use it

`heatmap.js` is the whole component: one file, no dependencies.

```html
<script src="heatmap.js"></script>
<sakuga-heatmap empty-text="No calendar data yet"></sakuga-heatmap>
```

```js
const el = document.querySelector('sakuga-heatmap');
el.days = [
  { date: '2026-04-01', weekday: 'Wed', kind: 'Workday', workday: true, hours: 3.5 },
];
el.addEventListener('select', (e) => console.log(e.detail));
```

| attribute | what it sets | default |
|---|---|---|
| `empty-text` | message shown when `days` is empty | `No calendar data yet` |
| `data` | JSON-encoded `days` array | empty |
