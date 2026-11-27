# Select

Tactile, searchable manga dropdown / combobox matching `<sakuga-picker>` and `<sakuga-input>`. Plain crisp ink-bordered field with an optional clear chip and ink-divided chevron button at rest. Opening squashes the trigger, spins the chevron 180°, ripples a ring, and springs out a speech-bubble popover with flanking puffs and corner ticks. Hovering or arrowing slides a cel-shaded capsule on a spring with velocity-coupled vertical stretch. Picking an option pops the row and ink checkmark badge with pink ticks, puff, kira glint, and a hollow カチッ before shrinking cleanly to zero. Clearing slashes across the value with crystal shards.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/select/
```

`?embed=1` hides the heading.

## Use it

`select.js` is the whole component: one file, no dependencies.

```html
<script src="select.js"></script>
<sakuga-select name="style" label="Animation style" value="cel">
  <option value="cel" data-tag="2D">Cel Shaded</option>
  <option value="sakuga" data-tag="KEY" data-desc="Full-motion key animation">Sakuga Cut</option>
  <option value="ink" data-tag="B/W">Manga Ink</option>
</sakuga-select>

<sakuga-select searchable clearable label="Studio tool" placeholder="Find a tool...">
  <option value="gpen" data-tag="INK" data-desc="Sharp variable-width nib">G-Pen Nib</option>
  <option value="smear" data-tag="FX" data-desc="High-speed bridge frame" selected>Smear Frame</option>
</sakuga-select>
```

```js
const el = document.querySelector('sakuga-select');
el.addEventListener('change', (e) => console.log(e.detail)); // { index, value, label, option }
el.setOptions([
  { value: 'a', label: 'Alpha', tag: 'NEW', desc: 'First preset' },
  { value: 'b', label: 'Beta', disabled: true },
]);
```

| attribute | what it sets | default |
|---|---|---|
| `value` | currently selected option value | empty (or `<option selected>`) |
| `placeholder` | text shown when nothing is selected | `Select an option...` |
| `label` | accessible combobox and listbox label | `Select` |
| `searchable` | shows an auto-focused filter input inside the popover | off |
| `clearable` | shows a `×` clear chip when a value is selected | off |
| `disabled` | disables opening, clearing, and selection | off |
| `compact` | compact field height and typography | off |
| `empty-text` | message shown when search matches no options | `No matching options` |

### Properties, Methods & Events

- **Properties**: `value`, `selectedIndex`, `selectedOption`, `options`, `open`, `disabled`, `searchable`, `clearable`, `compact`
- **Methods**: `show()`, `hide()`, `toggle()`, `clear()`, `setOptions(items)`
- **Events**: `change` (`{ index, value, label, option }`), `sakuga:open`, `sakuga:close`
- **Forms**: form-associated (`ElementInternals.setFormValue`); submits `value` under its `name` attribute and supports form reset.
