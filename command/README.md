# Command

An iconic `⌘K` / `Ctrl+K` anime spotlight command palette modal. Slams in from above on springs with volume-preserving squash-stretch, horizontal braking speed lines, twin upper-corner dust puffs, pink corner ticks, and hollow `シュッ` above the modal frame. Typing kicks up caret dust puffs and fuzzy-filters grouped commands with flat cel-shaded `<mark>` highlights. Navigating glides a cel-shaded highlight capsule on spring physics with velocity-coupled stretch. Executing a normal command pops the row with twin ticks, `kira` glint, puff, and hollow `カチッ`; executing a `data-danger` command inverts the row, slices across with a pink crescent `slash`, scatters crystal `shards`, flares corner ticks, and pops hollow `ドン` above the palette before zipping shut.

## Run it

```sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/command/
```

`?embed=1` hides the heading.

## Use it

`command.js` is the whole component: one file, no dependencies.

```html
<script src="command.js"></script>
<sakuga-command id="cmd" shortcut="k" placeholder="Type a command or search...">
  <optgroup label="Animation">
    <option value="keyframe" data-icon="spark" data-shortcut="⌘N" data-desc="Insert a fresh keyframe">Insert Keyframe</option>
    <option value="render" data-icon="download" data-shortcut="⌘E" data-keywords="export png">Render Final Sequence</option>
  </optgroup>
  <optgroup label="Danger Zone">
    <option value="delete-cache" data-icon="trash" data-shortcut="⌘⌫" data-danger>Delete Frame Cache</option>
  </optgroup>
</sakuga-command>
```

```js
const cmd = document.getElementById('cmd');
cmd.show();
cmd.addEventListener('select', (e) => {
  console.log(e.detail); // { value, label, item, query }
});

// Or supply commands programmatically:
cmd.items = [
  { group: 'Actions', value: 'play', label: 'Play Cut', desc: 'Loop at 24fps', icon: 'play', shortcut: 'Space' },
  { group: 'Danger Zone', value: 'wipe', label: 'Wipe Cache', icon: 'trash', shortcut: '⌘⌫', danger: true },
];
```

| attribute | what it sets | default |
|---|---|---|
| `open` | controls modal visibility | off |
| `placeholder` | search input placeholder text | `Type a command or search...` |
| `label` | accessible dialog, combobox, and listbox label | `Command palette` |
| `shortcut` | opt-in global `⌘` / `Ctrl` hotkey (e.g. `k` for `⌘K`/`Ctrl+K`) | off |
| `empty-text` | subtitle shown below the `NO MATCH FOUND` stamp | `No commands match` |
| `keep-query` | preserves the search query across reopens | off |

### Properties, Methods & Events

- **Properties**: `open`, `items`, `query`, `placeholder`, `label`, `shortcut`, `emptyText`, `keepQuery`
- **Methods**: `show()`, `close(reason?)`, `toggle()`, `setQuery(q)`
- **Events**: `select` (`{ value, label, item, query }`), `open` (`{ query }`), `close` (`{ reason }`), `sakuga:search` (`{ query, count }`)
- **Built-in icons**: `search`, `spark`, `bolt`, `layers`, `play`, `folder`, `code`, `sliders`, `moon`, `sun`, `trash`, `download`, `share`, `compass`, `rocket`, `terminal`, `star`, `edit`, `copy`, `check`
