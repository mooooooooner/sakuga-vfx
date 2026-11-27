# OTP

A manga verification-code & PIN input row that is plain and crisp at rest. Focusing a tile pops pink corner wedges; typing squashes and springs the tile with dust and crystal chips; pasting ripples left-to-right in a rapid domino wave; completing the code unleashes a cel impact highlight, radiating starburst behind the row, corner puffs, glints, shards, and ドン! (or hollow ポン for 4-digit PINs) cleanly above the tiles; calling `error()` kicks the row into an underdamped recoil shake with pink flash, wobble marks, and outward shards.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/otp/
```

`?embed=1` hides the heading.

## Use it

`otp.js` is the whole component: one file, no dependencies.

```html
<script src="otp.js"></script>
<sakuga-otp length="6" separator="3" name="code" label="Verification code"></sakuga-otp>
<sakuga-otp length="4" masked label="Security PIN"></sakuga-otp>
```

```js
const el = document.querySelector('sakuga-otp');
el.addEventListener('sakuga:complete', (e) => console.log('code:', e.detail.value));
el.fill('482916');         // domino paste wave
el.error('Invalid code');  // underdamped error recoil + manga badge
el.clear();                // reset all tiles
```

| attribute | what it sets | default |
|---|---|---|
| `length` | number of tiles (`3`–`8`) | `6` |
| `value` | initial code value | empty |
| `type` | `numeric` or `alphanumeric` | `numeric` |
| `masked` | hides characters behind bold ink dots while preserving `value` | off |
| `separator` | tile index after which to insert an ink dash (or boolean for midpoint split) | off |
| `label` | accessible group label | `Verification code` |
| `disabled` | disables editing and focus | off |
| `compact` | compact tile sizing | off |

| property / method | what it does |
|---|---|
| `el.value` | reads or sets the unmasked code string (synced with `FormData`) |
| `el.complete` | `true` when every tile is filled |
| `el.fill(code, { animate = true })` | populates tiles with an optional domino wave and fires events |
| `el.clear()` | resets all tiles and clears any error badge |
| `el.error(msg?)` | plays the error recoil shake, pink flash, wobble arcs, shards, and optional badge |
| `el.focus()` | focuses the first empty tile (or last tile if complete) |

| event | detail | when |
|---|---|---|
| `input` | `{ value, index }` | whenever any tile changes |
| `change` | `{ value }` | whenever the code changes |
| `sakuga:complete` | `{ value }` | when the final empty tile completes the code |
