---
id: TODAY-008
baseline: 24dfb3c589f11e874dbea9a11a13b958404e979f
risk_tier: ROUTINE
---

# TODAY-008 // Fix day-transition stale-state residual (TODAY-R01)

## Mission

`docs/agent/drops/TODAY-006.md`'s "Residual findings" section flagged, and explicitly deferred,
a real bug: `handleStartDay` in `src/ui/screens/today/TodayScreen.tsx` didn't call `refresh()`
after starting a new day — every other mutating handler in the component does — so state derived
from the *prior* day (checkIn, recommendation, currentContext, advisoryNotes, obligations, and
everything else `refresh()` composes) could keep rendering as if it still applied to the newly
started day, until something else happened to trigger a refresh or the page was reloaded. This
Drop is that fix.

## Approved baseline

`origin/master` at `24dfb3c589f11e874dbea9a11a13b958404e979f`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

ROUTINE. A one-function fix in an existing UI handler, made to match the exact pattern every
sibling handler in the same component already uses. No new state, no new command/query, no
engine/domain/persistence change.

## Root cause

`handleStartDay` was the one mutating handler in `TodayScreen.tsx` that didn't call the shared
`refresh()` after its mutation — it only did `setDay(await startDay())`. Every other handler
(`handleCheckIn`, `handleQuickCheckIn`, `handleRecord`, `handleEndDay`, etc.) calls `await
refresh()` afterward, which re-derives `day` itself (via its own `getActiveDay()` read) plus
every other piece of state the screen composes. Verified empirically: with the fix temporarily
reverted, a new regression test (below) genuinely failed — after starting day B, the ATTENTION
section's real "Check in when you can" prompt never appeared, because state left over from day
A's end-of-day refresh was never re-derived for day B. With the fix restored, the same test
passes.

## Authorized scope

- `src/ui/screens/today/TodayScreen.tsx`: `handleStartDay` now calls `await refresh()` after
  `await startDay()`, exactly matching every sibling handler's pattern. The redundant direct
  `setDay(...)` call is removed since `refresh()` already sets `day` itself.
- `tests/browser/TodayScreen.test.tsx`: one new regression test proving a prior day's
  recommendation/check-in state does not bleed into a newly started day, driven through the real
  START DAY button (not a bypass helper) so it exercises the actual fixed code path.

## Explicit exclusions

- No change to `refresh()` itself, or to any other handler.
- No change to TODAY-R02 (the theoretical, non-human-triggerable double-submit race also flagged
  in TODAY-006) — out of scope for this Drop, tracked separately.
- No change to `justStartedDay`/the power-on sweep logic from LAUNCH-VISION-003/004 — this Drop
  only moves where `await refresh()` happens relative to it (before, not after,
  `setJustStartedDay(true)`, same as before).

## Relevant authority / references

- `docs/agent/drops/TODAY-006.md`'s "Residual findings carried from TODAY-005" section — the
  original flag for this exact bug (TODAY-R01), explicitly deferred at the time rather than
  opportunistically absorbed.
- Every sibling handler in `TodayScreen.tsx` (`handleCheckIn`, `handleQuickCheckIn`,
  `handleRecord`, `handleEndDay`, etc.) — the established, already-correct pattern this Drop
  brings `handleStartDay` into line with.

## Required invariants

- `startDay()`'s own behavior and return value are unchanged — only what the UI does with its
  result changes.
- Every other handler's use of `refresh()` is unchanged.
- The power-on sweep (`justStartedDay`) still fires exactly once per START DAY click.

## Acceptance criteria

- A real, UI-driven regression test (starting day A, checking in, ending day A through the real
  END DAY button, starting day B through the real START DAY button) proves day A's
  recommendation state does not persist into day B's render, and day B's real "no check-in yet"
  prompt appears — without a reload.
- The same test, run against the pre-fix code, genuinely fails (verified manually before
  finalizing this Drop, not just asserted).
- `npm run verify` passes in full.

## Required verification

`npm run verify` (architecture boundaries + typecheck + full test suite including the browser
project + production build).

## Builder expectations

- Work only in `../beyond-worktrees/claude-today-008` on branch
  `claude/today-008-start-day-refresh`, cut from the baseline above.
- Implement exactly the one-line-shaped fix; any temptation to also touch TODAY-R02 or other
  handlers is a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Confirm `handleStartDay`'s new shape genuinely matches its siblings (not just superficially).
- Confirm the new test is a genuine regression test, not a vacuous one — reproduce the
  pre-fix failure directly rather than trusting the Builder's claim to have done so.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merge only an approved, reviewed, green PR.
- After merge: retire this Drop's `ACTIVE_DROP` record via
  `node scripts/factory-drop.mjs close TODAY-008 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to also fix TODAY-R02 or touch any other handler in this Drop.
- A genuine conflict between this contract and higher repository authority.
