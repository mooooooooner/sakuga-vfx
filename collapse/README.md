# Collapse

Supports both a built-in tactile manga toggle bar (via the `label` attribute or `slot="trigger"`) and pure controlled mode via the `open` attribute. Switches wrapper overflow to visible once settled open so child tooltips and bursts are never clipped.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/collapse/
```

`?embed=1` hides the heading.

## Use it

`collapse.js` is the whole component: one file, no dependencies.

```html
<script src="collapse.js"></script>
<sakuga-collapse label="Advanced options">
  <p>Hidden details here.</p>
</sakuga-collapse>
```

```js
const el = document.querySelector('sakuga-collapse');
el.open = true;
el.addEventListener('change', (e) => console.log(e.detail.open));
```

| attribute | what it sets | default |
|---|---|---|
| `open` | whether the drawer is expanded | off |
| `label` | text for the built-in toggle header | empty |
