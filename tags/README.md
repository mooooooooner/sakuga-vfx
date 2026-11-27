# Tags

Plain crisp ink-bordered tag box with cel-shaded chips at rest. Focusing throws corner wedges, typing kicks up baseline caret dust, adding a tag stamps a volume-preserving chip into place with pink ticks, a ground puff, a kira glint, and a hollow ポン, deleting slices it with a pink-and-white crescent slash and crystal shards before shrinking cleanly to zero, and duplicate or max-limit hits play a crisp spring recoil.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/tags/
```

`?embed=1` hides the heading and extra variant.

## Use it

`tags.js` is the whole component: one file, no dependencies.

```html
<script src="tags.js"></script>
<sakuga-tags
  name="keywords"
  value="sakuga,cel-shaded,keyframe"
  max="6"
  placeholder="Add tag..."
  suggestions="smear,impact,impact-frame,kachi,anime,manga">
</sakuga-tags>
```

```js
const el = document.querySelector('sakuga-tags');
el.add('smear');               // stamps a chip in
el.remove(0);                  // slashes the first chip (index or tag text)
el.clear();                    // clears all tags
console.log(el.tags, el.value);

el.addEventListener('sakuga:add', (e) => console.log('added', e.detail));
el.addEventListener('sakuga:remove', (e) => console.log('removed', e.detail));
el.addEventListener('sakuga:reject', (e) => console.log('rejected', e.detail));
el.addEventListener('change', (e) => console.log('value', e.detail.value));
```

### Attributes

| attribute | what it sets | default |
|---|---|---|
| `value` | comma-separated initial tags | empty |
| `placeholder` | inline input placeholder | `Add tag...` |
| `label` | accessible label for field and input | `Tags` |
| `max` | maximum tag count (shows corner counter pill) | unlimited |
| `allow-duplicates` | allow adding duplicate tag labels | off |
| `suggestions` | comma-separated string or JSON array of quick-add suggestion pills | none |
| `disabled` | disables editing, removing, and suggestions | off |
| `compact` | compact sizing for dense forms | off |
| `tone` | chip surface tone: `pri`, `acc`, or `ink` | `pri` |

### Properties, methods & events

- **Properties:** `value` (comma-separated string, form-associated via `ElementInternals`), `tags` (`string[]`), `max`, `disabled`, `compact`, `allowDuplicates`, `suggestions` (`string[]`), `tone`.
- **Methods:** `add(text, { quiet })`, `remove(indexOrTag, { quiet })`, `clear()`.
- **Events:** `sakuga:add` (`{ tag, tags }`), `sakuga:remove` (`{ tag, index, tags }`), `sakuga:reject` (`{ reason: 'duplicate' | 'max', tag }`), `change` (`{ value, tags }`).
- **Keyboard & Paste:** `Enter`, `,`, or `Tab` (when input has text) commits a tag; `Backspace` on an empty input arms the last chip on the first press and slashes it on the second; pasting comma- or newline-separated text stamps tags in a staggered wave with a single `ポン` on the final chip.
