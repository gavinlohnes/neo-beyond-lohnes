# NAV-001 slice 3 production acceptance

Built PWA, fresh disposable Chromium contexts, synthetic Garmin JSON imported through the real
MORE → IMPORT HEALTH DATA preview/confirmation. No personal data or protected backup fixture.
Offline after import; no application change after this capture. Exact final reviewed SHA and
full verification/CI results are recorded in [PR #292](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/292).

PASS at 320×640, 390×844, 844×390, 1280×800: TODAY and DATA open the same week-first sleep sheet;
calendar month/year navigation, actual bar→night stages→exact source record, CLOSE/focus return,
existing ALL SLEEP RECORDS destination, unchanged domain-event count, no overflow or page errors.
Focused browser tests additionally cover horizontal swipe, keyboard selection/focus, measured
sample counts, missing/manual-only data, read failure/retry and axe accessibility at all sizes.

- [Small phone week](week-320.png)
- [Phone week](week-390.png)
- [Phone night and source](night-390.png)
- [Four-viewport report](acceptance.json)

Reproduce after installing Chromium:

```sh
npm run build
PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright node scripts/verify-nav-sleep.mjs
```

The chart intentionally retains Garmin measurement semantics (longest session per lived day),
not the corrected/manual canonical sleep ledger. Missing is not zero; the page explains the
separation and retains the existing records/correction route. History is bounded to the existing
371 measured periods; clipped calendar periods disclose partial coverage.
