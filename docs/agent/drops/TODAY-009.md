---
id: TODAY-009
baseline: 2fe63c2d2298d2cd336f9b930afed740f4b10266
risk_tier: ROUTINE
---

# TODAY-009 // Close the busy-guard double-submit race (TODAY-R02)

## Mission

`docs/agent/drops/TODAY-006.md`'s "Residual findings" section flagged, and explicitly deferred,
a theoretical, not-human-triggerable race: `busy` is React state, so `setBusy(true)` doesn't take
effect (re-rendering the disabled buttons that normally prevent a second tap) until the next
render — a sub-frame gap where a handler could run twice before that render lands, since both
invocations would read the same stale `busy === false` closure value. This Drop closes it, for
every handler in `TodayScreen.tsx` that shares the pattern, with a synchronous ref mirroring the
existing `busy` state.

## Approved baseline

`origin/master` at `2fe63c2d2298d2cd336f9b930afed740f4b10266`, verified via
`git fetch origin master && git rev-parse origin/master`.

## Risk classification

ROUTINE. Pure synchronization hardening — a `useRef` guard mirroring existing `busy` state,
applied uniformly to the handlers that already check `busy`. No behavior change, no new
command/query, no engine/domain/persistence change, no UI change (the same buttons are disabled
by the same `busy` state exactly as before).

## Root cause

Verified empirically, not just asserted: added a new regression test that fires two real,
synchronous, native `HTMLElement.click()` calls on the CAPTURE button with no `await` between
them (a real Playwright double-click always leaves a render in between, so it can't reproduce
this — two synchronous native clicks dispatch both events, and both `onClick` invocations, before
React commits the `setBusy(true)` update that would disable the button). Without the fix, this
created **two** capture items from one intended tap. With the fix, exactly one.

## Authorized scope

- `src/ui/screens/today/TodayScreen.tsx`: a new `busyRef = useRef(false)`, mirroring `busy`
  state. Every handler that already checks `busy` before an async mutation (24 in total,
  enumerated in the diff) now also checks `busyRef.current`, sets it `true` synchronously before
  the mutation, and resets it `false` in the same `finally` block that resets `busy`. `busy`
  state itself, and everywhere it drives UI disabling, is unchanged.
- The one handler that already had its own dedicated ref for this exact race
  (`confirmCommitmentSatisfaction`'s `commitmentSatisfactionPendingRef`) now also checks/sets the
  new shared `busyRef`, for consistency — its existing dedicated ref is untouched, not replaced.
- `tests/browser/TodayScreen.test.tsx`: one new regression test.

## Explicit exclusions

- No change to any command, query, engine, or persistence behavior.
- No change to what the `busy` state itself does or which elements it disables.
- No change to the four synchronous, non-mutating functions that check `busy` but never call
  `setBusy(true)` (`requestCommitmentSatisfaction`, `cancelCommitmentSatisfaction`,
  `requestCaptureConversion`, `cancelCaptureConversion`) beyond also checking `busyRef.current`
  for consistency — they were never part of the async race since they complete synchronously.
- No change to `handleDismissOutcome` or any other handler that never checked `busy` at all and
  has no async mutation.

## Relevant authority / references

- `docs/agent/drops/TODAY-006.md`'s "Residual findings carried from TODAY-005" section — the
  original flag for this exact issue (TODAY-R02), explicitly deferred at the time.
- The pre-existing `commitmentSatisfactionPendingRef` pattern already in `TodayScreen.tsx` — the
  established precedent this Drop generalizes into a single shared guard, rather than inventing
  a new mechanism.

## Required invariants

- Every mutation this Drop touches still calls exactly the same commands/queries in exactly the
  same order as before.
- `busy` state's UI-disabling behavior is unchanged.
- The new test's failure mode (with the fix removed from one representative handler) is a
  genuine, observed double-mutation — verified manually, not assumed.

## Acceptance criteria

- A real, native-double-click-driven regression test proves a single intended tap on CAPTURE
  produces exactly one capture item, not two.
- The same test, with `handleCapture`'s guard temporarily reverted, genuinely fails (verified
  manually before finalizing this Drop).
- `npm run verify` passes in full.

## Required verification

`npm run verify` (architecture boundaries + typecheck + full test suite including the browser
project + production build).

## Builder expectations

- Work only in `../beyond-worktrees/claude-today-009` on branch
  `claude/today-009-busy-guard-race`, cut from the baseline above.
- Implement exactly the authorized scope — a mechanical, uniform guard addition, not a redesign
  of the busy/disabled mechanism.
- Run the required verification before opening a PR.
- Open the PR, then stop.

## Reviewer expectations

- A separate session from the Builder, reviewing from this contract plus the final diff only.
- Confirm every one of the 24 handlers now has a matching `busyRef.current = true`/`= false`
  pair, and that no handler's actual mutation logic changed.
- Reproduce the regression test's pre-fix failure directly rather than trusting the Builder's
  claim to have done so.

## Integrator expectations

- A separate, explicitly authorized session — never the Builder or Reviewer for this Drop.
- Merge only an approved, reviewed, green PR.
- After merge: retire this Drop's `ACTIVE_DROP` record via
  `node scripts/factory-drop.mjs close TODAY-009 --integration-sha <merge-commit-sha>`.

## Stop / escalation conditions

- Any temptation to redesign the busy/disabled mechanism itself, rather than closing the one gap
  named above.
- A genuine conflict between this contract and higher repository authority.
