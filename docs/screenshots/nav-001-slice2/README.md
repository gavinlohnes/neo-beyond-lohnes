# NAV-001 slice 2 production acceptance

Fresh disposable Chromium contexts, synthetic UI-created day only; no personal backup/data.
Application code includes the dynamic return-label fix. No application changes follow capture.

- [Small-phone MORE](more-320.png), [phone MORE](more-390.png), [DATA](data-390.png)
- [Four-viewport results](acceptance.json)

PASS at 320×640, 390×844, 844×390 and 1280×800: prior LOG/meal/draft paths, DATA/MORE labels,
backup first in MORE, offline actual native backup download, that download accepted by the
real restore preview, cancel without replacing any data, unchanged domain event count,
no horizontal overflow or uncaught errors. Restore confirmation is never clicked.

Reuses the existing slice-1 production script and its preview/fresh-context/UI-fixture pattern:

```sh
npm run build
OUTPUT=.cache/nav002-production node scripts/verify-nav-001.mjs
```

Use the installed Playwright Chromium (`PLAYWRIGHT_BROWSERS_PATH` if needed). Temporary backup
files are not committed. Internal route/workspace keys stay BODY/COMMAND for history/shortcuts;
visible labels are DATA/MORE. Physical-body concepts retain their meaning.

Verification history: initial focused run had three recovery-position failures; moving the
existing recovery group before other groups fixed them (26/26 follow-up). The first complete
local run had 2,929 passed / 6 failed / 1 skip / 3 future todos: a missed dynamic return label,
two stale test-selector paths and two timeouts (health history/large photo export). Fixed the
label/selectors; all five affected files then passed (32 tests). No test limit/timeout or
behavioral assertion was weakened. First incomplete local full run was deliberately interrupted
to correct the new native-backup test before proceeding; it was never reported green.

Final full local/CI results and independent exact-head review are recorded in PR #291.
