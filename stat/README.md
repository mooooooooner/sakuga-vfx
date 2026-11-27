# Stat

Crisp white paper at rest; whenever its `value` changes or `el.hit()` is called, it pops on spring physics with a slanted cel delta stamp, corner pink ticks, and an anime kira glint.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/stat/
```

`?embed=1` hides the heading.

## Use it

`stat.js` is the whole component: one file, no dependencies.

```html
<script src="stat.js"></script>
<sakuga-stat label="Total Hours" value="18.50 h" sub="6 sessions" delta="+1.20h" tone="pri"></sakuga-stat>
```

```js
const el = document.querySelector('sakuga-stat');
el.setAttribute('value', '20.00 h');
el.hit('big');
```

| attribute | what it sets | default |
|---|---|---|
| `label` | metric title | empty |
| `value` | primary value text (or use `slot="value"`) | empty |
| `sub` | secondary caption | empty |
| `delta` | slanted cel delta stamp | empty |
| `tone` | `gray`, `pri`, `acc`, `green`, `orange`, `red` | `gray` |
| `mode` | `card` or `compact` | `card` |
