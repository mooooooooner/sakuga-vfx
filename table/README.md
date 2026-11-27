# Table

Wraps any slotted `<table>` in a crisp ink frame with sticky header styling, a custom empty-state manga stamp, and a snappy `sweep()` refresh beat (spring nudge, horizontal speed lines along the header seam, corner puffs, and kira glint).

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/table/
```

`?embed=1` hides the heading.

## Use it

`table.js` is the whole component: one file, no dependencies.

```html
<script src="table.js"></script>
<sakuga-table max-height="360px">
  <table>
    <thead><tr><th>Date</th><th>Hours</th></tr></thead>
    <tbody><tr><td>2026-04-15</td><td>2.5 h</td></tr></tbody>
  </table>
</sakuga-table>
```

```js
const el = document.querySelector('sakuga-table');
el.sweep();   // play refresh speed-line sweep
```

| attribute | what it sets | default |
|---|---|---|
| `max-height` | CSS max height for the scroll viewport | none |
| `empty` | displays the empty-state manga stamp | off |
| `empty-text` | text inside the empty-state stamp | `No data` |
| `compact` | tighter cell padding | off |
