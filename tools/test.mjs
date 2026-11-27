// node tools/test.mjs [URL]   drives every control in the gallery with real touch and key events at phone width. Exits 1 on a failure.
// Needs Node 22 or later and Chrome or Chromium (set CHROME if it is somewhere unusual), and the folder served over http.
import { spawn } from 'node:child_process';
import { rmSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const URL_ = process.argv[2] || 'http://localhost:8000/gallery/';
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const PORT = 9800 + Math.floor(Math.random() * 150), PROFILE = mkdtempSync(join(tmpdir(), 'skv-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (Array.isArray(targets) && targets.some((t) => t.type === 'page')) break; } catch {} await sleep(200); }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map(), logs = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)); });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Page.enable'); await send('Page.navigate', { url: URL_ }); await sleep(1800);

// "tag >>> selector" reaches into the element's shadow root
const find = (s) => { const [host, inner] = s.split(' >>> '); return inner ? `document.querySelector(${JSON.stringify(host)}).shadowRoot.querySelector(${JSON.stringify(inner)})` : `document.querySelector(${JSON.stringify(host)})`; };
const at = async (s, fx = 0.5, fy = 0.5) => JSON.parse(await ev(`(() => { const e = ${find(s)}; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return JSON.stringify([b.left + b.width * ${fx}, b.top + b.height * ${fy}]); })()`));
const touch = (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const tap = async (s, fx, fy) => { const [x, y] = await at(s, fx, fy); await sleep(150); await touch('touchStart', x, y); await touch('touchEnd', x, y); };
const key = async (k, code) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code }); };
const type = async (text) => { for (const ch of text) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); await sleep(40); } };
let fails = 0;
const check = (name, ok, got) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${got !== undefined ? `  ->  ${got}` : ''}`); };

check('all 42 elements are defined', (await ev(`['button','toggle','slider','checkbox','radio','input','tabs','progress','rating','toast','tooltip','badge','card','chart','collapse','dialog','heatmap','number','picker','segmented','spinner','stat','stepper','table','textarea','select','drawer','menu','upload','tags','otp','pagination','gauge','sidebar','daterange','calendar','hold-button','donut-chart','line-chart','radar','pet','command'].every((n) => customElements.get('sakuga-' + n))`)));
check('one shared core', (await ev('window.SakugaFX.version')) === 1);
{ await tap('sakuga-button[data-demo=primary] >>> .btn'); await sleep(1200); check('button: tap fires click and done() lands the check', +(await ev(`${find('sakuga-button[data-demo=primary] >>> .btn')}.style.getPropertyValue('--ok')`)) > 0.5); }
{ await tap('sakuga-toggle >>> .tog'); await sleep(500); check('toggle: tap turns it on', await ev(`document.querySelector('sakuga-toggle').checked`));
  check('toggle: aria-checked follows', (await ev(`${find('sakuga-toggle >>> .tog')}.getAttribute('aria-checked')`)) === 'true'); }
{ const [x, y] = await at('sakuga-slider >>> .sld', 0.2); const [x1] = await at('sakuga-slider >>> .sld', 0.9); await sleep(200); await touch('touchStart', x, y);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', x + (x1 - x) * i / 10, y); await sleep(25); } await touch('touchEnd', x1, y); await sleep(400);
  const v = +(await ev(`document.querySelector('sakuga-slider').value`)); check('slider: a drag moves it', v > 70, v);
  await ev(`${find('sakuga-slider >>> input')}.focus()`); await key('ArrowLeft', 37); await sleep(200); check('slider: arrow key steps it', +(await ev(`document.querySelector('sakuga-slider').value`)) === v - 1); }
{ await tap('sakuga-checkbox >>> .box'); await sleep(400); check('checkbox: tap ticks it', await ev(`document.querySelector('sakuga-checkbox').checked`)); }
{ await tap('sakuga-radio >>> label:nth-child(2) .dot'); await sleep(400); check('radio: tap selects B', (await ev(`document.querySelector('sakuga-radio').value`)) === 'b'); }
{ await tap('sakuga-input >>> input'); await sleep(200); await type('hey'); await sleep(300); check('input: typing sets the value', (await ev(`document.querySelector('sakuga-input').value`)) === 'hey'); }
{ await tap('sakuga-tabs >>> button:nth-of-type(3)'); await sleep(500); check('tabs: tap selects the third', (await ev(`document.querySelector('sakuga-tabs').selected`)) === 2);
  await ev(`${find('sakuga-tabs >>> button:nth-of-type(3)')}.focus()`); await key('ArrowLeft', 37); await sleep(300); check('tabs: arrow key moves back', (await ev(`document.querySelector('sakuga-tabs').selected`)) === 1); }
{ await tap('sakuga-rating >>> button:nth-child(4)'); await sleep(700); check('rating: tap sets four', (await ev(`document.querySelector('sakuga-rating').value`)) === 4);
  check('rating: four stars lit', (await ev(`${find('sakuga-rating >>> .stars')}.querySelectorAll('.lit').length`)) === 4); }
{ await at('sakuga-progress'); let done = false; for (let i = 0; i < 24 && !done; i++) { await sleep(500); done = await ev(`document.querySelector('sakuga-progress').done`); }
  check('progress: the demo load completes', done, await ev(`${find('sakuga-progress >>> .pct')}.textContent`)); }
{ await ev(`(() => { const p = document.querySelector('sakuga-progress'); p.removeAttribute('demo'); p.reset(); p.set(0.5); })()`); await sleep(1500);
  check('progress: set(0.5) eases to half', Math.abs((await ev(`+getComputedStyle(${find('sakuga-progress >>> .prog')}).getPropertyValue('--v')`)) - 0.5) < 0.02); }
{ await tap('[data-demo=save] >>> .btn'); await sleep(900); check('toast: it arrives', await ev(`document.querySelector('sakuga-toast').open`)); await sleep(3400); check('toast: it leaves', !(await ev(`document.querySelector('sakuga-toast').open`))); }
{ await tap('sakuga-tooltip >>> .help'); await sleep(600); check('tooltip: tap opens it', await ev(`document.querySelector('sakuga-tooltip').open`)); await key('Escape', 27); await sleep(300); check('tooltip: Escape closes it', !(await ev(`document.querySelector('sakuga-tooltip').open`))); }
{ await tap('sakuga-select >>> .combo'); await sleep(350); check('select: tap opens popover', await ev(`document.querySelector('sakuga-select').open`));
  await tap('sakuga-select >>> [role="option"]:nth-of-type(2)'); await sleep(450); check('select: picks second option', (await ev(`document.querySelector('sakuga-select').value`)) === 'sakuga'); }
{ await tap('sakuga-menu >>> .trig'); await sleep(350); check('menu: tap opens panel', await ev(`document.querySelector('sakuga-menu').open`));
  await key('Escape', 27); await sleep(300); check('menu: Escape closes panel', !(await ev(`document.querySelector('sakuga-menu').open`))); }
{ await tap('[data-demo=drawer-right] >>> .btn'); await sleep(450); check('drawer: opens from right', await ev(`document.querySelector('sakuga-drawer').open`));
  await key('Escape', 27); await sleep(450); check('drawer: Escape closes it', !(await ev(`document.querySelector('sakuga-drawer').open`))); }
{ await tap('[data-demo=rev]'); await sleep(900); check('gauge: rev reaches overdrive', +(await ev(`document.querySelector('sakuga-gauge').value`)) >= 90); }
{ await tap('[data-demo=drop-files]'); await sleep(600); check('upload: adds 3 files', (await ev(`document.querySelector('sakuga-upload').files.length`)) === 3);
  await tap('sakuga-upload >>> .rm'); await sleep(450); check('upload: slash-remove drops count to 2', (await ev(`document.querySelector('sakuga-upload').files.length`)) === 2); }
{ await tap('sakuga-tags >>> .sug'); await sleep(450); check('tags: suggestion click adds chip', (await ev(`document.querySelector('sakuga-tags').tags.length`)) === 4); }
{ await tap('[data-demo=otp-paste]'); await sleep(700); check('otp: fill completes code', (await ev(`document.querySelector('sakuga-otp').value`)) === '482916' && await ev(`document.querySelector('sakuga-otp').complete`)); }
{ await tap('sakuga-pagination >>> button[aria-label="Page 12"]'); await sleep(450); check('pagination: jumps to page 12', (await ev(`document.querySelector('sakuga-pagination').page`)) === 12); }
{ const [x, y] = await at('sakuga-hold-button[data-demo=hold-purge] >>> .btn'); await sleep(150); await touch('touchStart', x, y); await sleep(1050); await touch('touchEnd', x, y); await sleep(350);
  check('hold-button: real touch hold confirms', await ev(`document.querySelector('sakuga-hold-button[data-demo=hold-purge]').confirmed`)); }
{ await tap('sakuga-daterange >>> .field'); await sleep(400); check('daterange: tap opens popover', await ev(`document.querySelector('sakuga-daterange').open`));
  await tap('sakuga-daterange >>> button[data-preset-id="7d"]'); await sleep(500);
  check('daterange: preset selects 7 days and closes', (await ev(`document.querySelector('sakuga-daterange').days`)) === 7 && !(await ev(`document.querySelector('sakuga-daterange').open`))); }
{ await tap('[data-demo=cmd-open] >>> .btn'); await sleep(450); check('command: opens modal palette', await ev(`document.querySelector('sakuga-command').open`));
  await key('Escape', 27); await sleep(400); check('command: Escape closes palette', !(await ev(`document.querySelector('sakuga-command').open`))); }
{ await tap('sakuga-calendar >>> button[data-view="month"]'); await sleep(400); check('calendar: switches to month view', (await ev(`document.querySelector('sakuga-calendar').view`)) === 'month');
  await tap('sakuga-calendar >>> button[data-view="year"]'); await sleep(400); check('calendar: switches to year view', (await ev(`document.querySelector('sakuga-calendar').view`)) === 'year');
  await tap('sakuga-calendar >>> button[data-view="day"]'); await sleep(400); check('calendar: switches back to day view', (await ev(`document.querySelector('sakuga-calendar').view`)) === 'day'); }
{ await tap('sakuga-sidebar >>> button.item[data-value="analytics"]'); await sleep(450); check('sidebar: jumps to analytics', (await ev(`document.querySelector('sakuga-sidebar').value`)) === 'analytics');
  await tap('sakuga-sidebar >>> .col-btn'); await sleep(450); check('sidebar: collapses into icon rail', await ev(`document.querySelector('sakuga-sidebar').collapsed`));
  await tap('sakuga-sidebar >>> .col-btn'); await sleep(450); }
{ await tap('sakuga-donut-chart >>> .leg-pill[data-idx="0"]'); await sleep(400); check('donut-chart: legend pill selects slice 0', (await ev(`document.querySelector('sakuga-donut-chart').selected`)) === 0);
  await tap('[data-demo=donut-mode]'); await sleep(400); check('donut-chart: morphs to pie mode', (await ev(`document.querySelector('sakuga-donut-chart').mode`)) === 'pie'); }
{ await tap('[data-demo=radar-rival]'); await sleep(400); check('radar: enables dual-series rival comparison', (await ev(`document.querySelector('sakuga-radar').series.length`)) === 2);
  await tap('[data-demo=radar-power]'); await sleep(450); }
{ await ev(`${find('sakuga-line-chart >>> .stage')}.focus()`); await key('ArrowRight', 39); await key('Enter', 13); await sleep(400);
  check('line-chart: keyboard scrub and pin selects point', (await ev(`document.querySelector('sakuga-line-chart').selected`)) >= 0); }
{ await tap('sakuga-pet >>> .pet-hit'); await sleep(400); check('pet: tap pats Koma to happy mood', (await ev(`document.querySelector('sakuga-pet').mood`)) === 'happy');
  await tap('[data-demo=pet-char]'); await sleep(350); check('pet: switches to mecha character', (await ev(`document.querySelector('sakuga-pet').character`)) === 'mecha'); }
{ await ev(`(() => { const f = document.createElement('form'); f.id = 'tf'; f.innerHTML = '<sakuga-checkbox name="c" checked></sakuga-checkbox><sakuga-slider name="s" value="42"></sakuga-slider><sakuga-rating name="r" value="3"></sakuga-rating><sakuga-toggle name="t" checked></sakuga-toggle><sakuga-select name="sel" value="ink"><option value="cel">Cel</option><option value="ink">Ink</option></sakuga-select><sakuga-tags name="tg" value="a,b"></sakuga-tags><sakuga-otp name="pin" length="4" value="1234"></sakuga-otp><sakuga-daterange name="dr" start="2026-04-01" end="2026-04-07"></sakuga-daterange><sakuga-calendar name="cal" value="2026-04-15"></sakuga-calendar>'; document.body.append(f); })()`); await sleep(350);
  check('forms: values are sent with a form', (await ev(`new URLSearchParams(new FormData(document.getElementById('tf'))).toString()`)) === 'c=on&s=42&r=3&t=on&sel=ink&tg=a%2Cb&pin=1234&dr=2026-04-01..2026-04-07&cal=2026-04-15', await ev(`new URLSearchParams(new FormData(document.getElementById('tf'))).toString()`)); }
check('no horizontal scroll at 390', (await ev('document.documentElement.scrollWidth')) <= 390, await ev('document.documentElement.scrollWidth'));
if (logs.length) { console.log(logs.join('\n')); fails++; }
ws.close(); chrome.kill(); await sleep(300); try { rmSync(PROFILE, { recursive: true, force: true }); } catch {} process.exit(fails ? 1 : 0);
