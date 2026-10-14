# DAILY-EXPERIENCE-001 — synthetic phone evidence

These screenshots and `acceptance.json` come from the built production PWA in fresh, disposable
Chromium contexts. No owner data, historical fixture, prototype or live deployment is used.
The synthetic clock is 2026-10-13 22:00 America/Chicago. These are layout/task-flow observations,
not physical iPhone/Safari, native-keyboard, screen-reader or measured human task-time evidence.

## Reproduce

From the repository root, build (`npm run build`), start a local production preview on port 5174
(`npm run preview -- --port 5174 --strictPort`), then run:

```sh
BEYOND_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/verify-daily-experience.mjs
```

Omit the executable override when using Playwright's installed Chromium. `BEYOND_ACCEPTANCE_URL`
can select another local preview base URL. The runner only uses fresh browser contexts, performs
writes through the UI, reads IndexedDB for assertions, and closes its browser even on failure.
It overwrites these generated synthetic artifacts. No server process is assumed to survive.

## Evidence

- `today-320.png`, `today-360.png`, `today-412.png`: context, separate Status/guidance and frequent actions.
- `water-360.png`: explicit amounts, accurate total/receipt, undo, and return to origin in one view.
- `meal-360.png`: canonical preset save and consumption stay separate; draft survives a detour.
- `more-360.png`: primary destinations precede on-demand starting guidance; Backup/Recovery remains direct.
- `writing-360.png`: reduced usable height; automated browser tests additionally assert focused input clearance.
- `workout-360.png`: typed set retained through other features before its single canonical save.
- `plan-360.png`: an explicit planned commitment, due date, Mission and recurrence over existing records.

At 320/360/412 px the runner verified one main landmark, no horizontal overflow, retained meal,
sleep, workout-set, Journal, Capture and task-composer input, canonical meal/set/note saves,
recurrence with Mission association, confirmed completion and release, service-worker-controlled
reload offline, water and task writes offline, and another offline reload retaining saved truth.
No page errors were recorded. Data remains isolated to these synthetic contexts.

Drafts remain session-local; reload/process eviction clears unfinished input. Browser automation
models a 420px usable viewport and reduced motion; physical keyboard/assistive-technology behavior
still needs device review. PWA first installation requires an initial online load.
