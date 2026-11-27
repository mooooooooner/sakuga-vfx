# Segmented

Plain ink-bordered pill track at rest. On switch, the capsule springs across while stretching with velocity, landing with a squash-settle bounce, three pink wedges, a small braking puff, and crisp speed lines.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/segmented/
```

`?embed=1` hides the heading.

## Use it

`segmented.js` is the whole component: one file, no dependencies.

```html
<script src="segmented.js"></script>
<sakuga-segmented value="auto" label="Mode">
  <option value="auto">Auto</option>
  <option value="fast">Fast</option>
  <option value="quiet">Quiet</option>
</sakuga-segmented>
```

```js
const el = document.querySelector('sakuga-segmented');
el.addEventListener('change', (e) => console.log(e.detail)); // { index, value, label }
```

| attribute | what it sets | default |
|---|---|---|
| `value` | currently selected option value | first option |
| `label` | accessible group label | empty |
| `size` | `sm` or `md` | `md` |
| `full` | stretches across available width | off |
| `accent` | uses accent pink fill for the active capsule | off |
| `disabled` | disables switching | off |
