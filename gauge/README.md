# Gauge

Cel-shaded anime radial arc gauge and mecha tachometer drawn on a high-DPI shadow-DOM canvas stepped on SakugaFX's shared clock. Plain and razor-sharp at rest with a slanted manga digital readout badge; revving rides real springs with tangent speed lines, and crossing the redline triggers a back-layer impact burst, crystal shards, twin kira glints, rim puffs, and a bold `ドン!` above the dial.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/gauge/
```

`?embed=1` hides the heading, hint, and secondary size showcase.

## Use it

`gauge.js` is the whole component: one file, no dependencies.

```html
<script src="gauge.js"></script>
<sakuga-gauge value="25" label="Boost" unit="%" interactive></sakuga-gauge>
<sakuga-gauge size="sm" tone="green" value="42" label="Temp" unit="°C"></sakuga-gauge>
<sakuga-gauge size="lg" value="7200" min="0" max="9000" warn="6500" overdrive="8000" label="RPM" unit=""></sakuga-gauge>
```

```js
const el = document.querySelector('sakuga-gauge');
el.set(96);            // spring-animated jump into overdrive
el.set(40, true);      // instant jump, no VFX
el.rev();              // anticipation dip -> redline rocket sweep -> clean settle

el.addEventListener('sakuga:overdrive', (e) => console.log('OVERDRIVE!', e.detail));
el.addEventListener('change', (e) => console.log('Committed:', e.detail.value));
```

| attribute | what it sets | default |
|---|---|---|
| `value` | current numeric reading (clamped to `[min, max]`) | `0` |
| `min` | minimum dial value | `0` |
| `max` | maximum dial value | `100` |
| `unit` | suffix appended to the digital readout | `%` |
| `label` | caption label and accessible `aria-label` | `Gauge` |
| `size` | dial size: `sm` (`144px`), `md` (`210px`), or `lg` (`272px`) | `md` |
| `tone` | normal-zone fill color: `pri`, `acc`, `green`, or `amber` | `pri` |
| `warn` | warning threshold (value units or `0..1` fraction); shifts fill to amber | `75` |
| `overdrive` | redline threshold (value units or `0..1` fraction); shifts fill to `--sk-acc` and fires overdrive VFX | `90` |
| `interactive` | enables pointer dial dragging and keyboard control (`role="slider"`) | off (`role="meter"`) |
| `disabled` | disables pointer and keyboard interaction | off |

### Methods & Events

- `set(val, instant = false)` — animates the needle and arc to `val` on spring physics (or snaps immediately when `instant` or `prefers-reduced-motion` is active).
- `rev(peak = this.max)` — plays an anticipation dip, rockets up to `peak` triggering overdrive VFX, and settles cleanly.
- `input` (`{ value, ratio }`) — fired while dragging in `interactive` mode.
- `change` (`{ value, ratio }`) — fired on drag commit or keyboard adjustment in `interactive` mode.
- `sakuga:overdrive` (`{ value, ratio }`) — fired (bubbles & composed) whenever the value crosses into `>= overdrive`.
