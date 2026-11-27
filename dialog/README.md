# Dialog

Drops in on springs with volume-preserving squash-stretch, four corner puffs, braking lines, pink ticks, and a hollow ポン (or a back-layer burst and hollow ドン for `danger`). Leaves by shrinking briskly with a center puff.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/dialog/
```

`?embed=1` hides the heading.

## Use it

`dialog.js` is the whole component: one file, no dependencies.

```html
<script src="dialog.js"></script>
<sakuga-dialog id="dlg" heading="Confirm" subtitle="Review before continuing.">
  <p>Dialog body content.</p>
  <div slot="footer"><button onclick="dlg.open=false">Close</button></div>
</sakuga-dialog>
```

```js
const dlg = document.getElementById('dlg');
dlg.open = true;
dlg.addEventListener('close', () => console.log('closed'));
```

| attribute | what it sets | default |
|---|---|---|
| `open` | controls modal visibility | off |
| `heading` / `title` | header title text | empty |
| `subtitle` | optional subtitle under the heading | empty |
| `size` | `sm`, `md`, `lg` | `md` |
| `danger` | adds caution stripe and impact burst on open | off |
