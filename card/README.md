# Card

Plain paper with a deep-indigo outline and hard offset shadow at rest. Supports `default`, `accent`, `flat`, and `hero` variants, optional interactive tactile lift, and `impact()` / `pulse()` animation beats.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/card/
```

`?embed=1` hides the heading.

## Use it

`card.js` is the whole component: one file, no dependencies.

```html
<script src="card.js"></script>
<sakuga-card heading="Summary" variant="accent" interactive>
  <p>Panel content goes here.</p>
</sakuga-card>
```

```js
const el = document.querySelector('sakuga-card');
el.impact();   // spring hit + corner ticks + puff
el.pulse();    // gentle highlight beat
```

| attribute | what it sets | default |
|---|---|---|
| `variant` | `default`, `accent`, `flat`, `hero` | `default` |
| `padding` | `none`, `sm`, `md`, `lg` | `md` |
| `interactive` | enables hover/press tactile lift | off |
| `heading` / `title` | optional header title | empty |
