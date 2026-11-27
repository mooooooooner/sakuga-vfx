# Spinner

Draws a rotating ink-outlined speed-crescent, trailing lavender comet tail, pulsing 4-pointed anime glint star, and crisp pink micro-wedges on a shadow-DOM canvas. Respects `prefers-reduced-motion` with a static star emblem.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/spinner/
```

`?embed=1` hides the heading.

## Use it

`spinner.js` is the whole component: one file, no dependencies.

```html
<script src="spinner.js"></script>
<sakuga-spinner size="md" label="Loading..."></sakuga-spinner>
```

```js
// Purely declarative; toggle hidden or remove from DOM when loading finishes.
```

| attribute | what it sets | default |
|---|---|---|
| `size` | `sm`, `md`, `lg` | `md` |
| `label` | optional status label beside/below the spinner | empty |
| `tone` | `ink`, `pri`, `acc`, `on-pri` | `ink` |
