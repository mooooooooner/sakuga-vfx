# Picker

Plain crisp ink-bordered field with a calendar or clock trigger at rest. Opening springs out a manga speech-bubble popover with side puffs, corner wedges, and a ring off the trigger. Picking a cell pops it with pink ticks, dust puff, kira glint, and a hollow カチッ.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/picker/
```

`?embed=1` hides the heading.

## Use it

`picker.js` is the whole component: one file, no dependencies.

```html
<script src="picker.js"></script>
<sakuga-picker type="date" value="2026-04-15" label="Date"></sakuga-picker>
<sakuga-picker type="month" value="2026-04" label="Month"></sakuga-picker>
<sakuga-picker type="time" value="17:00" label="Time"></sakuga-picker>
```

```js
const el = document.querySelector('sakuga-picker');
el.addEventListener('change', () => console.log(el.value));
```

| attribute | what it sets | default |
|---|---|---|
| `type` | `date`, `month`, or `time` | `date` |
| `value` | formatted string (`YYYY-MM-DD`, `YYYY-MM`, or `HH:MM`) | empty |
| `label` | accessible label | auto by type |
| `placeholder` | input placeholder | format hint |
| `disabled` | disables editing and popover | off |
| `compact` | compact sizing | off |
