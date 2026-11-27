# Drawer

An anime skid-in manga slide-over sheet (`right`, `left`, or `bottom`). Streaks in from off-edge on springs with volume-preserving directional smear and speed lines, skids to a stop with recoil squash, seam braking dust puffs, wobble marks, pink corner ticks, and dotted ズザッ (or a back-layer burst, flying crystal shards, and hollow ドン for `danger`). Exits briskly back off-edge with parting speed lines and dust — never fading opacity.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/drawer/
```

`?embed=1` hides the heading.

## Use it

`drawer.js` is the whole component: one file, no dependencies.

```html
<script src="drawer.js"></script>
<sakuga-drawer id="drw" side="right" size="md" heading="Inspector" subtitle="Review frame properties.">
  <span slot="header-extra">Key 04</span>
  <p>Drawer body content.</p>
  <div slot="footer">
    <button onclick="drw.close('cancel')">Close</button>
  </div>
</sakuga-drawer>
```

```js
const drw = document.getElementById('drw');
drw.show();
drw.addEventListener('sakuga:close', (e) => {
  // call e.preventDefault() to block dismissal (reason: 'close-button' | 'backdrop' | 'escape')
  console.log('closing via', e.detail.reason);
});
drw.addEventListener('open', (e) => console.log('opened', e.detail.side));
drw.addEventListener('close', (e) => console.log('closed', e.detail.reason));
```

| attribute | what it sets | default |
|---|---|---|
| `open` | controls drawer visibility | off |
| `side` | edge anchor: `right`, `left`, `bottom` | `right` |
| `size` | panel width/height preset: `sm`, `md`, `lg` | `md` |
| `heading` / `title` | header title text | empty |
| `subtitle` | optional subtitle under the heading | empty |
| `danger` | adds caution stripe, `!` badge, pink shadow, back-layer burst, shards, and hollow ドン | off |

### Properties, methods & events

- **Properties:** `open`, `side`, `size`, `heading`, `subtitle`, `danger`
- **Methods:** `show()`, `close(reason?)`
- **Slots:** default body slot, `header-extra`, `footer` (auto-hides when empty)
- **Events:** cancelable `sakuga:close` (`{ reason: 'close-button' | 'backdrop' | 'escape' }`), `open` (`{ side }`), `close` (`{ reason }`)
