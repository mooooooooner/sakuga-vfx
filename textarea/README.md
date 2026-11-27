# Textarea

Plain ink-bordered box with a slanted bottom-right character counter pill at rest. Focus throws pink wedges, typing measures the caret via an offscreen mirror to kick up dust puffs and occasional crystal shards, Enter throws a speed-line sweep, and Ctrl/Cmd+Enter fires `sakuga:commit`.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/textarea/
```

`?embed=1` hides the heading.

## Use it

`textarea.js` is the whole component: one file, no dependencies.

```html
<script src="textarea.js"></script>
<sakuga-textarea label="Notes" placeholder="Type something..." rows="4" maxlength="200"></sakuga-textarea>
```

```js
const el = document.querySelector('sakuga-textarea');
el.addEventListener('sakuga:commit', (e) => console.log(e.detail.value));
```

| attribute | what it sets | default |
|---|---|---|
| `value` | initial text content | empty |
| `placeholder` | placeholder text | empty |
| `label` | accessible label | `Text content` |
| `rows` | visible text rows | `4` |
| `maxlength` | optional character limit | none |
| `disabled` | disables editing | off |
| `dirty` | highlights the counter dot as unsaved | off |
