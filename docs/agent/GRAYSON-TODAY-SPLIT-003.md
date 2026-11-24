# GRAYSON-TODAY-SPLIT-003 — finish splitting TODAY: one read, one set of actions, then sections (no visible change)

- **Authorization:** Gavin, 2026-11-24 07:07 CT (campaign row **C9.1**): **"Yes. put this order into the briefs and
  write the TODAY split brief."** That was his yes to the new build order: the hard pieces other features plug into go
  first (his words at 07:02 CT: "first the hard pieces that other features plug into"). Merging this brief approves the
  slices below. It replaces the unfinished slices 3–5 of [TODAY-SPLIT-002](TODAY-SPLIT-002.md).
- **Lane:** a refactor with **no visible change**. That is ROUTINE work under DEV-FLOW-002, but TODAY is the most-used
  screen and every slice moves a lot of code, so each slice gets an independent exact-head review and **Gavin merges**.
  No Builder merge. It changes no Engine, schema, Dexie version, event, command, backup, provider, dependency,
  notification, navigation or TODAY information architecture. If a move would need one, stop and report.
- **Starting commit:** `origin/master` `2d575d0b` or later. Re-fetch before each slice; build on whatever has merged.
- **Builder:** Grok Bot. Branches `grok/grayson-today-split-003-a`, `-b`, `-c`, `-d` (one per slice).
  **Reviewer:** Claude Code (Codex is offline). **Active PR:** pending.
- **Order:** **first in Grok Bot's queue**, ahead of every other TODAY brief. See
  [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md). While a slice is open, no other builder opens a PR that edits
  `TodayScreen.tsx`; anything already open rebases on the slice once it merges. Overlap check on `2d575d0b`: the only
  open build PR is Claude Code's #675 (TRAIN-EDIT-001), which does not touch `ui/screens/today/`.

## Objective and benefit

`ui/screens/today/TodayScreen.tsx` is **3,604 lines** on master `2d575d0b`: 117 `useState` calls, 14 `useRef`, 18
`useEffect`, one `refresh()` of about 290 lines, about 45 handlers, about 1,100 lines of derived values and render
helpers, and a 650-line return. Every queued TODAY brief edits this one file: TODAY-CALM-001, CARRY-001,
SHIFTDOWN-TAPS-001, FLIP-PLAN-001 and PLAN-FRESH-001. So does every TODAY feature after them. That makes TODAY's PRs
collide, slow to review and risky.

TODAY-SPLIT-002 started this, but it stopped after its first slice (the toasts, #575). Its own record says why: the
TOOLS block reads **141 pieces of TODAY's shared state**, and moving it with explicit props would mean reorganising
that state first. This brief does that reorganising first, then moves the sections.

After this, TODAY has **one read** (a typed snapshot of the day), **one set of actions** (the handlers, unchanged),
and **sections that take those two as props**. A new TODAY feature then adds a field to the read and a component, not
another `useState` and another block in a 3,600-line file. This is the piece the rest of the TODAY queue plugs into,
which is why Gavin put it first.

## The slices (one PR each, in this order)

Each slice moves code without changing what it does. TODAY keeps its in-flight guard (`busyRef`), its single
`refresh()` entry point, its request-id ownership guard and what each tap opens or writes.

| Slice | What moves | Where to | Notes |
|---|---|---|---|
| **A. One read** | The reads inside `refresh()` (from `getActiveDay()` through `getTonightState()`, `getRecordedYesterday()` and the schedule) | A pure `readTodaySnapshot(now, options)` in `ui/screens/today/todayRead.ts`, returning a typed `TodaySnapshot` | TODAY replaces the read-mirror `useState`s (day, checkIn, recommendation, decision, handoff, prior outcome, lesson, reflection, repeated, suggest end day, pending outcome, minimum day, water and protein totals, open reset and SHIFT DOWN, work period marks, post-shift, work context source, sleep times, sleep draft, check-in draft, advisory notes, status, last sleep, targets, tonight, yesterday, early start, schedule, capture items, obligations, headline mission, backup prompt) with **one** `useState<TodaySnapshot \| null>`. The ownership checks stay where they are and guard installing the snapshot. `currentContext` and the Garmin measured snapshot keep their own request-guarded paths, unchanged. All setters still fire in one synchronous run, as the 2026-09-02 CI-flake fix requires. |
| **B. One set of actions** | The handlers (`handleStartDay` through `handleStaleRefresh`, about 45) | A hook `useTodayActions({ snapshot, refresh, ui, callbacks })` in `ui/screens/today/todayActions.ts`, returning a typed `TodayActions` object | Handler bodies move unchanged. `busyRef` moves into the hook with them, so the guard still runs first in every handler. The shell callbacks (`onWorkEnded`, `onOpenTrain`, …) are passed in. |
| **C. Small local state** | The state that belongs to one place: reset session (id, intensity, started-at, last outcome), SHIFT DOWN session (id, duration, started-at, last outcome), the check-in form (values, error, draft dismissed, fix target, fix undo), the commitment and capture confirm flows, the small-steps navigation | Hooks next to their sections: `useResetSession`, `useShiftDownSession`, `useCheckInForm`, `useConfirmFlows`, `useSmallSteps` | Where the snapshot seeds this state today (an open reset or SHIFT DOWN found on refresh), the hook takes the same seed in the same render. No timing change. |
| **D. Sections out** | With A–C in, the derived values (about lines 1830–2410) become a pure `deriveTodayView(snapshot, ui, now)` in `todayView.ts`. Then TOOLS (`renderToolsItem` and the five `render*Tool` helpers, `toolHasContent`) → `TodayTools.tsx`; the phase rows (`renderPhaseRow`) → `TodayPhaseRows.tsx`; the sheets at the foot of TODAY → `TodaySheets.tsx` | `ui/screens/today/` | Each section takes `{ view, actions }` plus only the local state it owns. This is the move TODAY-SPLIT-002 could not make. |

**Target:** `TodayScreen.tsx` under 1,500 lines after slice D, made mostly of layout. Report the line count before
and after every slice. The target is a guide, not a gate: a slice that is safe and lands at 1,700 lines is fine.

**Order freedom:** if slice A shows that B or C is cleaner first, the Builder may swap B and C and say why in the PR.
A must be first and D must be last.

## Must not change

- What TODAY shows, in what order, and what each tap opens or writes, in every life state, mode and `operationsOnly`
  (COMMAND's TODAY TOOLS).
- The attention policy (`attentionPolicy.ts`): one dominant surface, `ATTENTION_MAX = 2`.
- The in-flight guard, the request-id ownership rules, and the one-render batching of `refresh()`.
- Recommendation authority and the one red action.
- Hook order where it matters: SPLIT-002 kept four `useUndoOpen` hooks that now feed nothing, because removing them
  would change TODAY's hook order. They may go in the slice that moves their owners, with a note in the PR.
- Accessibility (16 px sentences, 44 px targets), lived days (16:30), corrections and undo.
- **Pixel proof:** each slice's element-only TODAY screenshots at 320, 360, 412 and 1024 px match master byte for byte,
  as in VISUAL-FOUNDATION-001 and TODAY-SPLIT-002.

## Everything is his to change

This slice set adds no new default, setting, line or screen, so there is nothing new to edit. What it changes is how
cheaply later features can make their defaults editable: a setting read once in `readTodaySnapshot` reaches every
section that needs it. Gavin's rule ("I should be able to edit and tweak or correct everything in this app") applies
to the features built on top, not to this refactor.

## Design principles check (Vision, Nov 24)

| Principle | How this brief meets it |
|---|---|
| Yours to change | No change; makes later "yours to change" settings cheaper (above). |
| Fix, don't ask | No change. |
| One tap for the usual | No change. |
| Built around shift | No change; every life-state and shift test must pass unchanged. |
| Calm | Enabling: TODAY-CALM-001 next reads its quiet-line candidates from the snapshot instead of from scattered state. |
| Always says why | No change. |
| Simple first | No visible change; the code itself becomes simple first. |
| Tap or say it | No change. |

## Scope

- New: `todayRead.ts`, `todayActions.ts`, `todayView.ts`, the hooks in slice C, `TodayTools.tsx`,
  `TodayPhaseRows.tsx`, `TodaySheets.tsx`, all under `ui/screens/today/`.
- Changed: `TodayScreen.tsx` (shrinks), and test imports only where a test reached into TODAY's internals.
- Unit tests for the new pure functions: `readTodaySnapshot` with fakes for its reads (no day; a day with a check-in and
  recommendation; an open reset; an open SHIFT DOWN; a failed optional read left out, as today) and `deriveTodayView`
  for each life state.

## Excluded

- Any visible change, copy change or reordering. TODAY-CALM-001 does the reordering, after this.
- A state library. One `refresh()`, one snapshot and explicit props is the BEYOND pattern (TODAY-SPLIT-002, reuse
  disposition).
- Splitting other screens.
- Fixing bugs found along the way. Note them in the PR and leave them for their own brief, unless the bug blocks the
  move; then stop and ask.

## Acceptance (each slice)

- `npm run typecheck`, `npm run check:architecture`, `npm test`, `npm run test:browser` and `npm run build` pass.
- The 62 test files that use `TodayScreen` or `DailyControls` pass **unchanged**, including `TodayScreen`, `TodayRun`, `CommandConsole`,
  `CaptureParity*`, `Tonight001DayFreeze`, `MetricPage00*`, `CloseGaps`, `ShiftCatchUp`, `CheckInFix`, `LifeState00*`,
  `DayMap00*` and `accessibility`. A test may only change its imports.
- Element-only TODAY screenshots match master byte for byte (above).
- `TodayScreen.tsx` line count before and after, and the count of `useState` calls before and after.
- PR CI green on the exact head, independent exact-head review by Claude Code, and Gavin merges.

## Decision record

- 2026-11-19: TODAY-SPLIT-002 drafted; Gavin chose the toasts slice first ("3C"); it shipped as #575 and the TOOLS move
  stopped on the 141 shared values.
- 2026-11-24 07:02 CT: Gavin: "first the hard pieces that other features plug into."
- 2026-11-24 07:07 CT: Gavin: "Yes. put this order into the briefs and write the TODAY split brief."
- Builder: Grok Bot, because it owns the queued TODAY briefs and this must land before them. Claude Code reviews.

## Stop and ask Gavin if

- A slice would change anything a person can see, or any test's expected output.
- The one-render batching of `refresh()` can't be kept (the 2026-09-02 CI-flake fix).
- Hook order or the in-flight guard would have to change in a way that isn't a pure move.
- A slice grows past about 1,500 changed lines; split it further first and say how.

## Risks

- **Timing.** `refresh()` has a history of CI-only races. Slice A keeps every setter in one synchronous run and keeps
  the ownership checks; the browser suites are the net.
- **Big diffs are hard to review.** Moves are mechanical, so the PR should say which blocks moved unchanged (a
  `git diff --color-moved` view helps the reviewer) and call out every line that is not a pure move.
- **Queue delay.** CARRY-001, SHIFTDOWN-TAPS-001 and the other TODAY features wait until this lands. Gavin accepted
  that on 2026-11-24.
