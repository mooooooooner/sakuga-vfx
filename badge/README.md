# Badge

Plain flat cel stamp at rest. Clickable badges squash and pop on springs, throwing pink wedges, a corner puff, and a kira glint when activated (or a quiet puff when deactivated). Call `el.pop()` for celebratory status-change highlights.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/badge/
```

`?embed=1` hides the heading.

## Use it

`badge.js` is the whole component: one file, no dependencies.

```html
<script src="badge.js"></script>
<sakuga-badge tone="green" dot active>Connected</sakuga-badge>
<sakuga-badge clickable tone="pri" count="12">Filter</sakuga-badge>
```

```js
const el = document.querySelector('sakuga-badge');
el.active = true;
el.pop();   // celebratory spring pop + wedges + kira glint
```

| attribute | what it sets | default |
|---|---|---|
| `tone` | `gray`, `pri`, `acc`, `blue`, `purple`, `orange`, `green`, `red` | `gray` |
| `dot` | shows a live status dot | off |
| `clickable` | renders as an interactive `<button>` with spring physics | off |
| `active` | bold filled active state | off |
| `size` | `xs`, `sm`, `md` | `sm` |
| `count` | right-side counter chip text | empty |
| `disabled` | disables interaction when `clickable` | off |
