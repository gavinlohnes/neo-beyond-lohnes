# NAV-001 slice 1 — production acceptance

Fresh disposable Chromium contexts; synthetic day setup through actual production UI.
No personal backup or real user records. Application code built at `89f69e6`.

- [Phone TODAY](today-390.png), [small phone](today-320.png), [landscape](today-844.png)
- [Meal sheet](meal-390.png), [four-viewport acceptance results](acceptance.json)

PASS at 320×640, 390×844, 844×390 and 1280×800: floating LOG above navigation;
LOG → MEAL → NEW MEAL; CLOSE restores focus; LOG hidden outside TODAY;
meal draft survives sheet close and primary-tab detour; no horizontal overflow or
uncaught page errors. Records were not imported; no meal was saved by this script.

Reuses the isolated preview/browser/UI-fixture pattern from `scripts/verify-polish-001.mjs`:

```sh
npm run build
node scripts/verify-nav-001.mjs
```

Set `OUTPUT` to change the default `.cache/nav001-production` directory. Use the
installed Playwright Chromium (`PLAYWRIGHT_BROWSERS_PATH` if needed).

Local browser regression run: 8 files, **230 passed / 4 future-slice todos** (including
NavPaths' 9 current tests). Added tests also check immediate hit testing, fixed
position after scrolling, modal isolation and focus return. A reproduced failure
showed TODAY's transformed entrance temporarily trapping the fixed LOG in page
coordinates. The fix uses a scoped opacity-only entrance, preserving native sheets,
hidden workspaces and shell inertness. No logging handlers were changed.

Full required CI and final independent exact-head review are recorded in PR #290.
This is slice 1 evidence, not completion of the later DATA/MORE/metric-page slices.
