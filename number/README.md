# Number

Plain ink-outlined box with minus and plus buttons at rest. Focus throws pink wedges, typing kicks up caret dust, stepping pops the value vertically with directional ticks, and hitting `min` or `max` triggers a recoil wobble and crystal shards.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/number/
```

`?embed=1` hides the heading.

## Use it

`number.js` is the whole component: one file, no dependencies.

```html
<script src="number.js"></script>
<sakuga-number value="2.5" min="0" max="10" step="0.5" unit="h" label="Hours"></sakuga-number>
```

```js
const el = document.querySelector('sakuga-number');
el.addEventListener('change', () => console.log(el.value));
```

| attribute | what it sets | default |
|---|---|---|
| `value` | numeric value | empty |
| `min` / `max` | lower and upper bounds | none |
| `step` | increment/decrement step | `1` |
| `unit` | unit label shown inside the field | empty |
| `label` | accessible label | `Number` |
| `disabled` | disables input and step buttons | off |
| `compact` | compact sizing | off |
