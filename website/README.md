# Locator Gym

A local practice site for Playwright automation with JavaScript. Fifteen rooms:
eight locator traps from the original gym, plus six production-suite rooms —
overlays, virtualised lists, network routing, auth/storageState/popups/clock,
design-system widgets, and a cross-origin payment iframe.

Rooms 01–08 stay offline-only. Rooms 11–14 talk to the tiny API inside `server.js`.
No CDN, no webfonts, no third-party network.

---

## Run it

```bash
cd playwright-gym/Website
node server.js
# → http://localhost:4173          app
# → http://127.0.0.1:4174          payment widget origin
```

Use **localhost** for the app and **127.0.0.1** for the widget. Different hosts
(and different ports) are different origins — that is the point of room 14.

`python3 -m http.server` is no longer enough: `/api/*` and the second origin
live in `server.js`.

## Run the tests

```bash
npm install
npx playwright install
npx playwright test tour --project=chromium
```

`playwright.config.js` starts `server.js` for you.

| Command | What it does |
| --- | --- |
| `npm test` | Chromium + Firefox + WebKit |
| `npx playwright test tour` | Worked examples (rooms 01–14) |
| `npx playwright test challenges` | Exercises marked `test.fixme` |
| `npx playwright test --ui` | Time-travel UI mode |

---

## What's in the box

```
playwright-gym/
├─ index.html
├─ pages/
│  ├─ controls.html        01 · form controls
│  ├─ tables.html          02 · dynamic tables
│  ├─ accordions.html      03 · accordions
│  ├─ calendars.html       04 · calendars
│  ├─ files.html           05 · upload & download
│  ├─ frames.html          06 · nested iframes
│  ├─ dom.html             07 · hostile DOM
│  ├─ shadow.html          08 · shadow DOM
│  ├─ overlays.html        09 · cookie / sticky / dialog / toasts
│  ├─ lists.html           10 · virtualised 10k-row list
│  ├─ network.html         11 · /api/search + heartbeat
│  ├─ session.html         12 · login, popup, idle clock
│  ├─ widgets.html         13 · combobox, chips, OTP, wizard
│  ├─ origins.html         14 · cross-origin widget + permissions
│  └─ invoice.html             popup target for room 12
├─ frames/                 nested frames + pay-widget.html + sandbox.html
├─ assets/
├─ tests/
│  ├─ tour.spec.js         worked examples, all passing
│  └─ challenges.spec.js   fixme exercises
├─ server.js               static files + /api/* + second origin
└─ playwright.config.js
```

---

## Two features worth knowing about

**X-ray test IDs** — outlines every `data-testid` and floats the id above it.

**Hide test IDs** — strips `data-testid` from the main column so you have to
use roles, labels and structure. Session-scoped. Turn it off before running
the shipped tour specs.

**Activity log** — clicks, changes, uploads, downloads, route-facing events,
consent, login, popups and clock warnings.

---

## Module map

### 01 · Form controls
Text, email, password, number, tel, range, colour, textarea, contenteditable, checkboxes with an
indeterminate parent, radios, native and multi-selects, a dependent select that populates
asynchronously, a div-based dropdown, a debounced typeahead, HTML5 drag-and-drop reordering, native
`alert`/`confirm`/`prompt`, a toast that self-hides, and a form that removes itself on success.

Traps: a field that reverts anything not typed as a keystroke, an auto-formatting card number, a
value that trims on blur, and a toggle whose real input is 1×1 pixel.

### 02 · Dynamic tables
Sorting that rewrites `tbody`, pagination, text and dropdown filtering, row selection with an
indeterminate select-all, inline cell editing, row deletion, footer totals, append-on-scroll, a
`rowspan`/`colspan` header with a nested table inside a cell, and a grid built entirely from `div`s
with correct ARIA roles and CSS-reordered columns.

Trap: a live board that rewrites every cell on a 1000 ms interval. Learn `expect.poll`, or find the
pause button.

### 03 · Accordions
Native `<details>` nested three deep, ARIA disclosure that hides panels, ARIA disclosure that
destroys them, an exclusive group with a 320 ms height animation, lazily-loaded panels, headers
whose text is split across `<span>`s, and an accordion inside an iframe inside an accordion.

### 04 · Calendars
Native `date`, `datetime-local`, `month`, `week` and `time` inputs; a popup picker on a read-only
field; a drill-down picker with month and year views and no `data-date` attributes; a two-panel
range picker; a calendar with disabled weekends, blackout dates and min/max bounds; an inline
calendar with event markers; and the whole widget again inside a frame.

### 05 · Upload & download
Single, multiple, directory and type-validated file inputs; a `display:none` input behind a styled
button; a drop zone with no input element at all; an upload with a progress bar and a cancel path;
static downloads across five MIME types; blob downloads generated in the browser; a filename that
changes on every click; a link that doesn't exist until a job finishes; and an upload/download pair
inside a frame.

### 06 · Nested iframes
Four levels deep, where levels 2 and 4 share `name="innerFrame"` and level 3 has no `id` or `name`.
The deepest control is a button inside a shadow root inside the fourth frame. Also: two sibling
frames with the same name, a `srcdoc` frame, a frame injected 2.5 seconds after load, a frame hosted
inside a shadow root, and three frames embedded in table cells.

There is a decoy input at depth 1 carrying the same test id as the real one at depth 4. If your
locator resolves too early, the test passes and nothing happens.

### 07 · Hostile DOM
Ids regenerated on every load, three elements sharing one id, hashed class names, attributes
containing colons and brackets, text fragmented across spans, non-breaking and zero-width spaces,
twelve identical "Remove" buttons, a transparent click interceptor, `pointer-events: none`, a moving
target, five flavours of invisibility, a self-destructing node, a node swapped out from under an
`ElementHandle`, a `<template>`, an `IntersectionObserver` reveal, a canvas with painted-only
targets, an SVG whose `className` isn't a string, and elements whose real state lives on the JS
object rather than in any attribute.

### 08 · Shadow DOM
Three instances of an open-root component sharing test ids, three nested shadow boundaries, a closed
root that nothing can pierce, slotted light DOM, exposed `::part()` internals, a shadow root inside
an iframe, and component state exposed only through getters, setters and methods on the element.

---

### 09 · Overlays & chrome
Cookie banner written to `localStorage.gym.consent`. Sticky header Save plus
page Save plus dialog Save — three accessible names, one of them in a portal
on `document.body`. Toast stack. `inert` on the shell while the dialog is open.
Esc closes it.

### 10 · Lists that lie
10,000 shipment rows, ~20 mounted. Scroll `#virt-viewport`, not the window.
Jump control for SHP-9800. A/B wrapper around each row. Skeleton / empty /
error / ready states that reuse `virt-row`.

### 11 · Network gym
`GET /api/search?q=&mode=ok|empty|error|slow`. Heartbeat every 2s so
`networkidle` never comes. Register `page.route` *before* `goto`.

### 12 · Auth, tabs & the clock
`POST /api/login` sets `gym.sid`. Users:

| username | password    | role   |
| -------- | ----------- | ------ |
| maker    | maker-pass  | maker  |
| viewer   | viewer-pass | viewer |
| asha     | asha-pass   | maker  |

Invoice popup via `window.open`. Idle warning after 5 minutes of *clock* time.
Use `page.clock.install` + `fastForward`, not `waitForTimeout`. Snapshot
`storageState` after login.

### 13 · Design-system widgets
Portal combobox, chip multi-select, 6-box OTP that accepts a paste into box 1,
hash wizard (`#step-1` … `#step-3`), split Export button.

### 14 · Origins & permissions
Card widget iframe at `http://127.0.0.1:4174/frames/pay-widget.html`.
Sandboxed frame without `allow-modals`. Geolocation and clipboard buttons.

---

## API (server.js)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/search?q=&mode=` | mode = ok / empty / error / slow |
| GET | `/api/heartbeat` | incrementing tick |
| POST | `/api/login` | `{ username, password }` → Set-Cookie gym.sid |
| POST | `/api/logout` | clears cookie |
| GET | `/api/me` | 401 or `{ user }` |
| GET | `/api/invoices` | requires session |
| POST | `/api/token` | `{ number }` → `{ token, last4 }` |

---

## Locator contract

1. Prefer `getByRole` / label / text.
2. Use testid when the role is dishonest (closed shadow, canvas, virtual row, foreign origin).
3. Never `#id` on room 07.
4. Scope to a region before `nth()`.
5. Register `page.route` before `goto`.
6. Never `waitForTimeout` and never `networkidle` on room 11.

---

## Quick reference

```js
// Frames — chain, don't guess
page.frameLocator('#depth-1')
    .frameLocator('#depth-2')
    .frameLocator('iframe[title="Depth 3"]')
    .frameLocator('#depth-4')
    .getByTestId('deep-input');

// Shadow — open roots need nothing special
page.locator('gym-panel[code="FR-W3"]').getByTestId('shadow-input');

// Closed roots — go through the component's API
page.locator('gym-sealed').evaluate(el => el.setCode('OVR-1'));

// Uploads — no disk required
page.getByTestId('upload-single').setInputFiles({
  name: 'inline.txt', mimeType: 'text/plain', buffer: Buffer.from('hi')
});

// Downloads
const [dl] = await Promise.all([
  page.waitForEvent('download'),
  page.getByTestId('download-csv').click()
]);

// A value that keeps changing
await expect.poll(() => page.getByTestId('feed-ticks').textContent())
  .not.toBe('tick 0');
```

---

## Notes

- The gym pins "today" to **2026-08-03** in the calendar module so date assertions stay
  deterministic. Change `TODAY` in `pages/calendars.html` if you'd rather test against the real date.
- `Cache-Control: no-store` is set on every response, so reloads genuinely re-randomise the unstable
  ids in module 07.
- Nothing here talks to a backend. Uploads are inspected client-side; downloads are either static
  files or blobs built in the browser.
