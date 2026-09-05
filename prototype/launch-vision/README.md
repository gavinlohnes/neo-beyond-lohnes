# BEYOND — Launch Vision Prototype

Exploratory visual/interaction prototype, **not** production code. It has no dependency on
`src/`, isn't wired into `npm run build`, and `check:architecture` never scans this directory —
it exists to help decide what a launch-ready BEYOND should look and feel like, not to ship.

Nothing in here changes canonical behavior, doctrine, or the running application. If any part of
this direction becomes real, it lands in `src/ui` later as its own deliberate, scoped Drop — this
prototype is reference, not a merge candidate.

## What it is

A single self-contained `index.html` (no build step, no dependencies) rendering an iPhone-width
phone frame you tap through, with a live toggle between two competing visual directions built
over the *same* product state:

- **Bruce's Instrument** — austere, engineered, near-static. Square corners, one hairline red
  rule, motion only for open/close disclosure.
- **Terry's Suit** — same doctrine, more kinetic. Diagonal chamfered "plating" instead of rounded
  corners, an ambient red bloom around the phone when active, a one-time power-on sweep on
  START DAY, and a confirmation pulse on logged actions. *(Currently the preferred direction —
  loads by default.)*

Every screen (TODAY / TRAIN / BODY / MORE, plus a compact design-system reference) renders from
one shared JS state object — direction is a presentation switch, not a fork of the data or logic.
Product terminology and behavior (RED-tier override, RESET/SHIFT DOWN, the A/B/C training
rotation, WATER/SLEEP/WEIGHT/PROTEIN peer parity, PRIMARY/SUPPLEMENTAL sleep, correction-not-
overwrite, HISTORY/SEARCH's no-fabrication rule) are pulled from `docs/OPERATOR_INTERFACE_DOCTRINE.md`
and `docs/UX_DECISIONS.md`, not invented for the mockup.

## Running it

No build step — either open the file directly, or serve it through the repo's own dev server:

```
npm run dev
# then open http://localhost:5173/neo-beyond-lohnes/prototype/launch-vision/
# (the /neo-beyond-lohnes/ base path comes from vite.config.ts's GitHub Pages `base`,
# and applies in dev too — it's not a build-only artifact)
```

It is not part of `npm run build`'s entry points (only the root `index.html` is), so it never
ships in a production bundle.

## Status

Actively iterating. Direction B (Terry's Suit) is the current lead; Direction A stays in the
toggle as a reference point, not because both are equally live candidates.
