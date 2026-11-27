# Hold Button

An anime charge-up hold-to-confirm button. Plain and crisp at rest with a thick ink outline, cel shadow, and compact hold-ring pill. Press and hold (pointer, touch, or `Space`/`Enter`) to sweep a two-tone cel-shaded charge fill across the face with automatic white-over-fill contrast flipping, progressive squash & power-up tremble, rising ground pebbles, menacing `ゴゴゴゴ`, and vivid pink overdrive speed lines past 75%. Releasing early snaps the charge bar back on an underdamped spring with recoil tilt, braking dust, and wobble marks; hitting 100% detonates into a 1-frame impact inversion, back-layer spiky burst, crystal shards, four cumulus clouds, `ドン!` (or `ポン` on secondary), drifting smoke rings, and an animated pink checkmark with a sparkle glint.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/hold-button/
```

`?embed=1` hides the heading, demo buttons, and hint.

## Use it

`hold-button.js` is the whole component: one file, no dependencies.

```html
<script src="hold-button.js"></script>
<sakuga-hold-button duration="1200" hold-label="Charging..." done-label="Launched!">Hold to Launch</sakuga-hold-button>
<sakuga-hold-button variant="danger" duration="1000" hold-label="Purging..." done-label="Purged!">Hold to Purge</sakuga-hold-button>
<sakuga-hold-button variant="secondary" duration="700" hold-label="Locking..." done-label="Locked!">Hold to Lock</sakuga-hold-button>
```

```js
const el = document.querySelector('sakuga-hold-button');
el.addEventListener('sakuga:start', (e) => console.log('start', e.detail.duration));
el.addEventListener('sakuga:progress', (e) => console.log('progress', e.detail.progress));
el.addEventListener('sakuga:cancel', (e) => console.log('cancelled at', e.detail.progress));
el.addEventListener('sakuga:confirm', (e) => console.log('CONFIRMED!', e.detail));

el.trigger();      // plays a full animated charge-up to detonation
el.trigger(true);  // immediate 100% detonation
el.reset();        // clears charging or confirmed state
```

| attribute | what it sets | default |
|---|---|---|
| `duration` | hold time in milliseconds to reach 100% | `1200` |
| `variant` | visual & VFX intensity: `primary`, `danger`, or `secondary` | `primary` |
| `hold-label` | optional label swapped in while charging | slot text |
| `done-label` | optional label swapped in once confirmed | slot text |
| `reset-delay` | milliseconds to stay confirmed before auto-resetting (`0` = sticky until `reset()`) | `2400` |
| `disabled` | disables pointer, touch, and keyboard interaction | off |

### Properties, Methods & Events

- `progress` *(readonly)* — current charge progress (`0..1`).
- `confirmed` *(readonly)* — `true` while in the confirmed state.
- `reset()` — immediately cancels any charge or confirmed state and returns cleanly to rest.
- `trigger(instant = false)` — programmatic helper that plays a full charge (`false`) or triggers instant 100% detonation (`true`).
- `sakuga:start` (`{ duration }`) — fired when charging begins.
- `sakuga:progress` (`{ progress }`) — fired as charge advances (`0..1`).
- `sakuga:cancel` (`{ progress }`) — fired when released before reaching 100%.
- `sakuga:confirm` (`{ duration, variant }`) — fired on 100% detonation.
