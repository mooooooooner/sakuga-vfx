# Pagination

Crisp ink-bordered cel-shaded page tiles at rest. Stepping to a nearby page leaps the active ink-framed tile across on spring physics with velocity-coupled stretch, landing squash, pink wedges, braking dust, and speed lines. Jumping 3 or more pages (or clicking `…`, First, or Last) unleashes a lavender crescent slash, tumbling shards, and a manga シュッ above the row.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/pagination/
```

`?embed=1` hides the heading.

## Use it

`pagination.js` is the whole component: one file, no dependencies.

```html
<script src="pagination.js"></script>
<sakuga-pagination page="1" pages="12" show-edges label="Results"></sakuga-pagination>
<sakuga-pagination total="120" page-size="10" compact accent="acc"></sakuga-pagination>
```

```js
const el = document.querySelector('sakuga-pagination');
el.addEventListener('change', (e) => {
  console.log(e.detail); // { page, prev, pages }
});
el.go(5);
el.next();
el.prev();
el.first();
el.last();
```

| attribute | property | what it sets | default |
|---|---|---|---|
| `page` | `page` | current 1-based page number | `1` |
| `pages` | `pages` | total page count directly | `1` (or derived from `total`) |
| `total` | `total` | optional total item count when `pages` is unset | unset |
| `page-size` | `pageSize` | items per page when computing pages from `total` | `10` |
| `siblings` | `siblings` | sibling pages shown beside the current page | `1` |
| `show-edges` | `showEdges` | renders First (`«`) and Last (`»`) buttons | off |
| `compact` | `compact` | compact tile sizing | off |
| `disabled` | `disabled` | disables all navigation and animations | off |
| `label` | `label` | accessible `<nav>` label | `"Pagination"` |
| `accent` | `accent` | active indicator fill (`pri`, `acc`, or `ink`) | `pri` |

### Methods & Events

| member | description |
|---|---|
| `go(page, { quiet = false })` | Navigate to a 1-based page (`quiet: true` snaps without animation or event). |
| `prev()` / `next()` | Step backward or forward one page (triggers edge recoil at boundaries). |
| `first()` / `last()` | Jump to the first or last page (triggers edge recoil if already there). |
| `change` event | Bubbles + composed `CustomEvent` with `detail: { page, prev, pages }`. |
