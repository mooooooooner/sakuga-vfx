# Stepper

Crisp ink-bordered step tiles in a 2x2 grid or horizontal row. When a step flips dynamically to `done`, its tile squashes and pops on springs, its checkmark draws itself briskly, and four pink wedges, a kira glint, and a puff fire.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/stepper/
```

`?embed=1` hides the heading.

## Use it

`stepper.js` is the whole component: one file, no dependencies.

```html
<script src="stepper.js"></script>
<sakuga-stepper layout="grid" label="Workflow">
  <option value="1" data-state="done">Connect</option>
  <option value="2" data-state="active">Compute</option>
  <option value="3" data-state="idle">Preview</option>
  <option value="4" data-state="idle">Save</option>
</sakuga-stepper>
```

```js
const el = document.querySelector('sakuga-stepper');
el.steps = [
  { label: 'Connect', state: 'done' },
  { label: 'Compute', state: 'done' },
  { label: 'Preview', state: 'active' },
  { label: 'Save', state: 'idle' },
];
```

| attribute | what it sets | default |
|---|---|---|
| `layout` | `grid` (2x2) or `row` | `grid` |
| `steps` | JSON array of `{ label, state }` (`idle`, `active`, `done`) | from `<option>` |
| `label` | accessible group label | empty |
