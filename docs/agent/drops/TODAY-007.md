---
id: TODAY-007
baseline: 925b826c07812a9fea5b42822be6a92449019f06
risk_tier: ROUTINE
---

# TODAY-007 // Fix recurring CI-only TodayScreen flake

## Mission

`tests/browser/TodayScreen.test.tsx`'s "produces no unhandled rejection when a context request
fails, and clears a stale successful context rather than continuing to show it" test has failed
CI-only (never locally) three times this session: on PR #82 (SEARCH-002), PR #83
(TRAIN-CREATE-003), and — most consequentially — on `master`'s own `deploy-pages.yml` run after
TRAIN-CREATE-003's closure commit, where it silently left production un-redeployed for roughly
34 minutes until the next unrelated push happened to retrigger a build. Each prior occurrence
was diagnosed as "not this PR's own failure," re-run once, and explicitly deferred as "worth a
dedicated investigation Drop sometime, not tonight." This Drop is that investigation, done.

## Approved baseline

`origin/master` at `925b826c07812a9fea5b42822be6a92449019f06` (INTENT-002's own closure commit),
verified via `git fetch origin master && git rev-parse origin/master`.

## Risk classification

ROUTINE. Test-file-only change; zero production code touched; no new dependency; no schema or
Engine/application change.

## Root cause

The failing test's final assertion ran immediately after `tracker.settle()` — a helper whose
`settle()` is a fixed `setTimeout(50)`, unrelated to whether React has actually committed the
re-render the assertion depends on. That assertion depends on a state transition that only
happens inside the component's own request-id-guarded `contextPromise.catch()` handler (see
`src/ui/screens/today/TodayScreen.tsx`'s `refresh()`, the `contextPromise?.then()/.catch()`
block): a rejection calls `setCurrentContext(null)`, which must re-render before
`.status-strip`'s `textContent` reflects the fallback state. Under CI resource contention that
re-render can still be pending when the fixed 50ms elapses; locally it reliably has time. Three
other tests in the same file call `tracker.settle()`: one before an unrelated/unchanged-state
assertion (safe — nothing needed to transition), and two before only checking `tracker.reasons`
(populated synchronously by the `unhandledrejection` listener, not render-dependent) — none of
the three is exposed to this race, which is why only this one test flaked.

## Authorized scope

- `tests/browser/TodayScreen.test.tsx`: wrap the affected test's final DOM assertion in
  `vi.waitFor(...)`, matching the pattern already used elsewhere in the same file (e.g. the
  "keeps the newer day/context installed..." and "never lets context assembled for a prior
  BeyondDay..." tests), so the assertion polls for the actual commit instead of assuming a fixed
  wall-clock delay is always sufficient.

## Explicit exclusions

- No change to `src/ui/screens/today/TodayScreen.tsx` or any other production code — the
  component's request-id-guarded async handling is already correct; only the test's own wait
  mechanics were wrong.
- No change to `trackUnhandledRejections()`'s `settle()` implementation itself, and no change to
  the other two tests using it — both are unaffected by this race (see Root cause above) and
  changing them would be scope creep with no diagnosed problem.
- No broader flake-hardening sweep of other browser test files in this Drop — out of scope
  unless a genuinely identical pattern is found while touching this file (none was).

## Relevant authority / references

- This session's own diagnosis, cross-referenced against the code's existing comments in
  `TodayScreen.tsx` describing two prior whack-a-mole rounds on a related (but distinct) timing
  race in `refresh()`'s field-ordering — that prior work already ruled out reordering `refresh()`
  itself as the right fix for this specific test's failure, since here the async gap is between
  the test's own `settle()` helper and the component's re-render commit, not between two fields
  in the same `refresh()` batch.
- CI logs from PR #82, PR #83, and `deploy-pages.yml` run `34941294825` (the TRAIN-CREATE-003
  closure commit's own run, `conclusion: "failure"`), all showing the identical assertion
  failure: `expected 'Off todayCapacity is UNKNOWN — no che…' not to contain 'Off today'`.

## Required invariants

- The fixed test's actual behavioral assertion is unchanged — it still proves a rejected context
  request clears to the pre-V1 fallback state and produces no unhandled rejection; only how long
  it's willing to wait for that to become observable changes.
- No production behavior changes; `TodayScreen.tsx` is untouched.

## Acceptance criteria

- `tests/browser/TodayScreen.test.tsx` passes locally across multiple consecutive runs (verified:
  72/72 passed, 3 consecutive runs, prior to Drop initialization).
- `npm run verify` passes in full.
- The fix is a genuine robustness improvement (poll for the real condition) rather than a longer
  fixed delay that would just narrow the same race without closing it.

## Required verification

`npm run verify` (architecture boundaries + typecheck + full test suite including the browser
project + production build).

## Builder expectations

- Work only in `../beyond-worktrees/claude-today-flake-001` on branch
  `claude/today-screen-flake-fix-wip`, cut from the baseline above.
- Implement exactly the authorized scope. Any temptation to also touch `TodayScreen.tsx` itself,
  the other two `tracker.settle()` call sites, or other browser test files is a STOP condition.
- Run the required verification before opening a PR.
- Open the PR, then stop — never self-merge, never self-review.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Confirm the root-cause account is accurate by tracing `TodayScreen.tsx`'s
  `contextPromise?.then()/.catch()` block directly, confirm the fix is scoped to only the one
  affected test, and confirm the other two `tracker.settle()`-using tests genuinely are not
  exposed to the same race (per Root cause above) rather than trusting that claim.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merges only an approved, reviewed, green PR.
- After merge: retire this Drop's `ACTIVE_DROP` record via
  `node scripts/factory-drop.mjs close TODAY-007 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to touch production code, other test files, or the shared `settle()` helper is
  a scope-expansion STOP.
- A genuine conflict between this contract and higher repository authority.
