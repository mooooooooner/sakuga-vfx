# Upload

Plain ink-outlined manga dropzone at rest. Dragging files over inflates the frame on a spring with eager inward wind lines and pink registration marks. Dropping files slams the zone with a back-layer impact burst, four corner smoke puffs, crystal shards, a `ポン` (single) or `ドン!` (multi) sound-effect word above the frame, and a staggered wave of cel-shaded extension stamp cards with `kira` glints. Clicking `×` slices across the card with a pink crescent slash before shrinking it cleanly to zero; invalid files shake the dropzone with a flat pink manga alert pill.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/upload/
```

`?embed=1` hides the heading.

## Use it

`upload.js` is the whole component: one file, no dependencies. Form-associated (`FormData` ready) with a real hidden `<input type="file">`.

```html
<script src="upload.js"></script>
<sakuga-upload
  name="attachments"
  multiple
  accept="image/*,.pdf,.txt,.json"
  max-size="5MB"
  max-files="4">
</sakuga-upload>
```

```js
const el = document.querySelector('sakuga-upload');
el.addEventListener('change', (e) => console.log(e.detail.files));
el.addEventListener('sakuga:reject', (e) => console.warn(e.detail.rejected));

// Programmatic API
el.addFiles([new File(['hello'], 'notes.txt', { type: 'text/plain' })]);
el.removeFile(0);
el.clear();
el.browse();
```

| attribute | what it sets | default |
|---|---|---|
| `accept` | comma-separated MIME types or extensions (e.g. `image/*,.pdf`) | any file |
| `multiple` | allow multiple files | off |
| `max-size` | per-file size limit in bytes or unit string (`"5MB"`, `"500KB"`) | none |
| `max-files` | maximum file count (when `multiple` is set) | none |
| `label` | dropzone heading text | `Drop files here` / `Drop a file here` |
| `hint` | helper line below the heading | auto from constraints |
| `button-label` | label on the browse CTA chip | `Choose Files` / `Choose File` |
| `disabled` | disables drag/drop, browsing, and removal | off |
| `compact` | compact horizontal dropzone layout | off |

| property / method / event | description |
|---|---|
| `files` | returns an `Array` of currently accepted `File` objects |
| `disabled`, `multiple`, `accept`, `maxSize`, `maxFiles` | live getters/setters synced to attributes |
| `addFiles(list, { quiet })` | validates and adds files; fires `change` and/or `sakuga:reject` |
| `removeFile(index)` | triggers anime slash-delete animation, removes file, fires `change` |
| `clear()` | removes all files, clears alerts, resets form value |
| `browse()` | opens the native file picker |
| `change` event | `detail: { files, added?, removed?, cleared? }` |
| `sakuga:reject` event | `detail: { rejected: [{ file, code, reason }] }` |
