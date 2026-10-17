# Connected Health Record — production acceptance

All records in these images were created through canonical UI actions in fresh, synthetic
Chromium contexts. No owner data was read or changed. The frozen prototype is not modified or
used as a production data source. These are production-build screenshots, not prototype renders.

At 320, 360 and 412 pixels:

- `daily-*.png`: existing current-day recording surface with direct metric evidence entries.
- `past-*.png`: selected lived day, explicit read-only state, recorded values and work context.
- `sources-*.png`: exact entries behind an observation, with root/correction provenance and
  full History navigation; historical entries offer no new correction or backdated write.
- `trend-*.png`: raw recorded-water history, retained range and source entry point.

`acceptance.json` records the final script outcome for all three widths. It verifies canonical
meal/water/sleep/weight writes, 16:30 resume rollover, historical browsing without writes,
History event focus/return, range retention, an interrupted sleep draft, canonical correction,
service-worker-controlled offline exploration/History, offline logging and another offline reload.
It checks one main landmark, page overflow and page errors. All writes use real UI controls;
IndexedDB reads are assertions only. No fixture or direct database writes seed the walkthrough.

## Reproduce

```sh
npm ci
npm run build
npm run preview -- --port 5174 --strictPort
# In another terminal:
BEYOND_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/verify-connected-health.mjs
```

Omit the executable variable when Playwright's bundled Chromium is installed. Override the URL
with `BEYOND_ACCEPTANCE_URL` if the preview uses another port. The walkthrough uses new isolated
browser contexts and closes its browser even on failure. The current run used preview port 5176.
A first-install prompt-mode service worker takes control on a subsequent navigation; the script
verifies that control before going offline, without changing the production update policy.

Focused/browser/integration checks are in `ConnectedHealth.test.tsx` and `connectedHealth.test.ts`.
They also cover same-time identity/order, sparse/old/empty data, multiple day segments/main sleeps,
DST, read failure/retry, updated History after correction, no focus stealing, full axe checks of
source/History surfaces at all three widths with reduced motion, and no hidden progress queries.
The existing daily-experience/phone-fit/retained-navigation/Engine/backup suites remain enabled.
The single existing BODY Insights assertion update only follows the clearer “recorded day
segments” label; observation values and all safeguards remain asserted.

## Limits

Desktop Chromium mobile viewports are not physical iOS Safari/Android keyboards, VoiceOver or
TalkBack. Session-local drafts intentionally do not survive reload or browser process eviction.
Existing browser-tab write concurrency limitations and production bundle-size warning remain.
No schema/event/backup-format/Engine/dependency/fixture change. No merge or deployment.

## Verification result

Full local gate: **232 test files passed; 2,417 tests passed, one existing skip**. Architecture
(215 files), TypeScript and production build passed. All three final-code production acceptance
runs passed. The local browser override only selects system Chromium; required CI uses the
repository's normal full gate. Final head, required CI and independent-review status are in
[PR #232](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/232).
