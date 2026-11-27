# Chart

Vertical mode sits on a hand-inked ground baseline with staggered spring bars, ground dust puffs, speed lines, and a kira glint on the peak bar. Horizontal mode renders ink-outlined pill tracks with cel specular stripes. Hovering or clicking pops a bar with pink ticks and a manga callout bubble.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/chart/
```

`?embed=1` hides the heading.

## Use it

`chart.js` is the whole component: one file, no dependencies.

```html
<script src="chart.js"></script>
<sakuga-chart mode="vertical" tone="pri" unit="h"></sakuga-chart>
```

```js
const el = document.querySelector('sakuga-chart');
el.items = [
  { label: 'Mon', value: 2.5 },
  { label: 'Tue', value: 4.0 },
  { label: 'Thu', value: 6.0, tone: 'acc' },
];
el.addEventListener('select', (e) => console.log(e.detail));
```

| attribute | what it sets | default |
|---|---|---|
| `mode` | `vertical` or `horizontal` | `vertical` |
| `tone` | default bar color token (`pri`, `acc`, `green`, etc.) | `pri` |
| `unit` | suffix appended to numeric values | empty |
| `empty-text` | label shown when `items` is empty | `No data` |
| `data` | JSON-encoded `items` array | empty |
