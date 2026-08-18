# BEYOND — V0.1 Vertical Slice 001

Checkpoint 1 of your V0.1 Foundation Build Spec: a real, running slice of
START DAY → state check-in → deterministic Engine → one recommendation →
persisted history, on your own device, offline-first.

This has been typechecked (`tsc --strict`) and built successfully (`vite build`)
before delivery.

## Run on Replit (no GitHub required)

1. Create a new Replit project → "Import from a zip" (or drag this folder into
   an existing empty Repl).
2. Set the run command to: `npm install && npm run dev`
3. Replit will give you a live URL — open it on your phone.

## Run anywhere else

```
npm install
npm run dev
```

Then open the printed local URL.

## What's actually implemented in this checkpoint

- `src/domain` — pure domain types (BeyondDay, StateCheckIn, Recommendation,
  DomainEvent). No React/Dexie imports here, per your Foundation Build Spec
  boundary rules.
- `src/engine` — deterministic capacity derivation + rule evaluation, with a
  full WHY trace on every recommendation (matches the trace shape in your
  real backup export).
- `src/persistence/db.ts` — Dexie/IndexedDB, schema v1.
- `src/application` — commands (`startDay`, `submitCheckIn`) and queries.
  UI never touches Dexie directly.
- `src/ui/screens/today` — the TODAY screen: start day, check-in sliders,
  one recommendation card with WHY.

## Flagged for your review

`src/engine/capacity.ts` — I could not find exact GREEN/YELLOW/RED numeric
thresholds in your Drive docs, only the locked output states. I wrote a
reasonable placeholder rule and flagged it in a comment. Tell me the real
thresholds (or write them into the Decision Register) and I'll swap them in
directly.

## Not yet built (next checkpoints)

TRAIN, BODY, MORE screens · RESET/SHIFT DOWN/MINIMUM DAY · backup export/import ·
event history view · offline PWA verification on a real device.
