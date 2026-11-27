# Pet

Interactive cel-shaded anime desktop mascot (`Koma-Neko` and `Koma-Mecha`) drawn on a high-DPI canvas stepped on SakugaFX's shared clock. Lives cleanly inside a manga playground stage or detaches into **Floating Desktop Mode** to roam across the browser viewport floor, complete with cursor eye tracking, spring-chain scarf & tail, pick-up/drag/throw 2D bounce physics, manga speech bubbles, and anime VFX choreography.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/pet/
```

`?embed=1` hides the heading, hint, and secondary demo button strip.

## Use it

`pet.js` is the whole component: one file, no dependencies.

```html
<script src="pet.js"></script>
<sakuga-pet name="Koma" character="neko"></sakuga-pet>
<sakuga-pet name="Koma-09" character="mecha" show-controls="false"></sakuga-pet>
```

```js
const el = document.querySelector('sakuga-pet');
el.pat();                         // headpat bounce, ^ ^ eyes, kira + hollow ポン (5x triggers Fever!)
el.jump();                        // anticipation crouch -> spring hop with dust puffs
el.dash(1);                       // crouch -> horizontal smear streak + speed lines + シュッ
el.celebrate();                   // backflip launch + back-layer burst + shards + ドン!
el.sleep();                       // toggles cozy sleeping pose with rising manga Zzz
el.say('Sakuga power!', 2400);    // pops spring-animated manga speech bubble
el.toggleFloat();                 // detaches onto the viewport floor or docks back
el.reset();                       // resets position, physics, and idle mood

el.addEventListener('sakuga:pat', (e) => console.log('Combo:', e.detail.combo));
el.addEventListener('sakuga:mood', (e) => console.log('Mood:', e.detail.mood));
el.addEventListener('sakuga:toss', (e) => console.log('Thrown at:', e.detail.speed));
el.addEventListener('sakuga:float', (e) => console.log('Floating:', e.detail.floating));
```

| attribute | what it sets | default |
|---|---|---|
| `name` | mascot nameplate and floating dock label | `Koma` |
| `character` | mascot variant: `neko` (spirit-cat) or `mecha` (visor-cat unit) | `neko` |
| `floating` | detaches mascot into fixed viewport desktop-pet mode | off (Stage Mode) |
| `mood` | expression state: `idle`, `happy`, `surprised`, `sleep`, or `dash` | `idle` |
| `autonomy` | enables gentle idle wandering, ear twitches, and naps (`"false"` disables) | on |
| `show-controls` | renders compact manga action pills below the stage (`"false"` hides) | on |
| `label` | accessible `aria-label` prefix for the interactive mascot button | `${name} desktop pet` |

### Keyboard & Reduced Motion

- Focus the mascot hitbox (`Tab`) and press `Enter`/`Space` to pat, `ArrowLeft`/`ArrowRight` to dash, `ArrowUp`/`J` to jump, `S` to toggle sleep, or `F` to toggle Floating Desktop Mode.
- Respects `prefers-reduced-motion`: renders crisp static cel-shaded art with instant mood and speech bubble updates and zero continuous motion or canvas VFX.
- Customize stage dimensions with `--sk-pet-width` (default `320px`) and `--sk-pet-height` (default `210px`), and theme colors with standard `--sk-*` CSS variables.
