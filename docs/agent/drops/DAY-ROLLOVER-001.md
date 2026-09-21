---
id: DAY-ROLLOVER-001
baseline: c91a7f710499af6e1a71e5d193bfea05aeffd7df
risk_tier: ARCHITECTURAL
---

# DAY-ROLLOVER-001 // AUTOMATIC 16:30 DAY BOUNDARY

## Amendment (ROLLOVER-ON-RESUME, direct owner mission, 2026-09-21, same session)

Extends this same Drop (branch/PR unchanged) rather than opening a new one — a direct
continuation of the exact mechanism this contract already authorizes, not an independent
concern. Adds: `performDueDayRollover()` also runs on `visibilitychange`/`pageshow` (App.tsx),
not only on cold mount; an in-flight-promise memoization guard on `performDueDayRollover()`
itself (`application/commands.ts`, same pattern as `ensureActiveDay()`'s own established guard)
so two resume signals firing for the same real-world resume collapse into at most one actual
rollover. No UI change, no new feature, no change to the workout-in-progress guard. Authorized
scope/acceptance criteria below are updated in place to include this.

## Amendment (atomicity fix, PR #111 review finding, 2026-09-21, same session)

Fixes a real reliability bug found in review, scoped to this fix only: `endDay()`'s close and
`startDay()`'s replacement-day creation inside `performDueDayRollover()` were two independent
Dexie writes, so a failure between them (a crash, an IndexedDB quota error) could leave BEYOND
with no ACTIVE day at all — a later `performDueDayRollover()` call would see nothing active and
silently no-op forever, unable to self-heal. Fixed by wrapping both calls in a single Dexie
`db.transaction("rw", ...)` inside `performDueDayRollover()` only — they now commit or roll back
together, so the interrupted-partway state can no longer occur at all (a stronger, smaller fix
than detect-and-heal recovery logic). `endDay()`/`startDay()` themselves, the 16:30/DST boundary
math, the workout-in-progress guard, and the resume in-flight-promise idempotency guard are all
unchanged. Authorized scope/acceptance criteria below are updated in place to include this.

## Mission

Direct owner mission (this session, 2026-09-21, "MISSION: DAY ROLLOVER AT 16:30"): the BeyondDay
boundary becomes 16:30 local time, automatic. At 16:30, the current BeyondDay auto-closes through
the same `endDay()` path as an explicit END DAY (flagged as an auto-close, permanently retained
history), and a fresh BeyondDay starts with water/protein reset. Bodyweight carries forward as
the last known value, never zero. Manual END DAY still works as an early close, with no
double-closing. If the app was closed across 16:30, the rollover catches up on next open, stamped
at the 16:30 boundary itself, not the actual catch-up/open time. Sleep PRIMARY/SUPPLEMENTAL rules
are unchanged; any sleep-to-day assignment ambiguity this creates is flagged, never guessed. An
in-progress workout at 16:30 is never interrupted — rollover happens once it ends. No UI changes,
no new features beyond what's needed to satisfy this mission; open a PR, do not merge.

## Approved baseline

`origin/master` at `c91a7f710499af6e1a71e5d193bfea05aeffd7df`, verified via
`git fetch origin master && git rev-parse origin/master` on 2026-09-21 — the same SHA
TODAY-QUICKACTIONS-001 (PR #110, still open/unmerged) also built from.

## Risk classification

ARCHITECTURAL. Two real triggers apply:

1. **Canonical domain semantic/type change** (`src/domain/common/types.ts`): `DayEndedPayload`'s
   `reason` union gains a third value (`AUTO_CLOSED_DAY_ROLLOVER`), and `BeyondDay`'s
   `startedAt`/`createdAt` split gains a new meaning distinction (semantic boundary instant vs.
   real detection instant) it didn't carry before.
2. **Meaningful Engine architecture** (`src/engine/**`): a new pure module
   (`engine/dayRollover.ts`) and a new `AdvisoryNote` producer in `engine/advisory.ts`.

Not HIGH-RISK: no Dexie schema/table/version change (no new field, no new table — the existing
`startedAt`/`createdAt`/`occurredAt`/`recordedAt` fields already exist; this only changes which
value each gets in one new code path), no backup/restore contract change, no correction-model
change, no protected fixtures, no dependency change.

**Doctrine conflict, resolved by direct owner ruling before implementation began**: the locked
"Day model" decision (`docs/UX_DECISIONS.md`) states BeyondDay "ends via explicit END DAY action
only, or as a fallback auto-close when a new day starts while one is still ACTIVE. Calendar
midnight is explicitly rejected as a boundary" — specifically so a shift worker's night's-sleep
crossing midnight still counts as one lived day, not two. An automatic 16:30 boundary is the same
category of thing (a fixed wall-clock automatic trigger), not merely a different hour than
midnight. This was surfaced to the owner directly (this session) before any implementation, per
`CLAUDE.md`'s "do not silently reconcile a genuine conflict between these — surface it." Owner
ruling: **override, record it** — proceed with automatic 16:30 rollover; this Drop's
`docs/UX_DECISIONS.md` entry records the override explicitly so a future session sees the current
state, not stale doctrine.

**Concurrent-Drop note**: TODAY-QUICKACTIONS-001 (PR #110) is still genuinely ACTIVE/unmerged —
not a stale/abandoned branch like the recurring `claude/body-ux-001-add-meal-disclosure` case.
Direct owner authorization this session ("Leave PR #110 alone") explicitly permits this second,
independent Drop to proceed concurrently. Verified no file-level overlap: PR #110 touches
`src/ui/screens/today/{AdvisorySection,PlannedWorkCard,TodayScreen}.tsx`,
`src/ui/screens/train/TrainScreen.tsx`, and test files under `tests/browser/`; this Drop is
scoped to stay out of `src/ui/screens/today/**` and `src/ui/screens/train/**` entirely (see
Explicit exclusions) specifically to avoid colliding with that still-open PR's own SERIAL-ONLY
seam. `docs/agent/ACTIVE_DROP.md` is hand-authored for this Drop (not via `factory-drop.mjs
init`, which enforces one-ACTIVE-Drop and would correctly refuse this) — same documented-
substitution pattern as prior Drops' stale-branch workaround, with this concurrency exception
spelled out explicitly rather than silently overriding the mechanism's default.

## Authorized scope

- `src/engine/dayRollover.ts` (new): pure boundary math. `DAY_ROLLOVER_HOUR`/`DAY_ROLLOVER_MINUTE`
  constants (16:30); `computeDueRollover(dayStartedAt: Date, now: Date): Date | null` — the
  single most recent 16:30 boundary strictly after `dayStartedAt` and at-or-before `now`, or
  `null` if none has been crossed yet. No I/O, no persistence import, DST-safe by construction
  (local calendar-component `Date` construction + epoch-millisecond comparison only — never
  duration/offset arithmetic).
- `src/domain/common/types.ts`: widen `DayEndedPayload.reason` to add
  `"AUTO_CLOSED_DAY_ROLLOVER"`.
- `src/application/commands.ts`:
  - `logEvent`: add an optional trailing `occurredAtOverride?: string` param (default: real
    `new Date().toISOString()`, unchanged for every existing caller) — `recordedAt` always stays
    the real, unmodified write instant per the existing locked doctrine
    (`StateCheckIn.seq`'s doc comment); only `occurredAt` may differ.
  - `endDay`: widen `reason` to accept `"AUTO_CLOSED_DAY_ROLLOVER"`; add an optional trailing
    `occurredAtOverride?: string` threaded into its `logEvent` call.
  - `startDay`: add an optional trailing `startedAtOverride?: string` param (default: real now,
    unchanged for every existing caller) applied to the new row's `startedAt`/`updatedAt`;
    `createdAt` always stays the real, unmodified insertion instant.
  - New command `performDueDayRollover(now: Date = new Date()): Promise<BeyondDay | undefined>`:
    reads the active day (no-op/`undefined` if none — never spontaneously creates a day, matching
    locked "Lazy day creation" doctrine); computes the due boundary; if an active workout blocks
    the close, no-ops (`ActiveWorkoutBlocksDayEndError` caught, not rethrown — "don't interrupt
    it"); otherwise closes the old day with `AUTO_CLOSED_DAY_ROLLOVER` stamped at the boundary
    instant and starts a new one stamped at the same boundary instant, returning the new day.
    A stretch with the app closed across several 16:30s collapses to exactly one rollover (the
    single most recent boundary), never a fabricated multi-day backfill.
- `src/domain/intelligence/types.ts`: add `"dayRolloverAmbiguity"` to `AdvisorySourceModule`.
- `src/engine/advisory.ts`: new composer, SURFACE tier, firing only when a PRIMARY sleep log
  exists on a BeyondDay that was itself created by `performDueDayRollover` (detected by an exact
  `DAY_ENDED`/`occurredAt` match against the new day's `startedAt` — never a fuzzy/guessed time
  window). Never blocks or reassigns the sleep log; purely an `AdvisoryNote`, same non-Recommendation
  contract as every other producer.
- `src/application/advisoryQueries.ts`: wire the new producer into `getAdvisoryNotes()`, supplying
  its own current-state input, same pattern as every existing producer.
- `src/application/queries.ts` or a small new query module: the read this new composer needs
  (PRIMARY-sleep-logged + rollover-created facts for the active day).
- `src/ui/screens/history/historyCopy.ts`: the existing `DAY_ENDED` reason ternary must keep
  classifying every non-`EXPLICIT_END_DAY` reason as "auto-closed" (currently a two-way ternary
  keyed on the one prior auto-close reason; a third reason value must not silently fall through
  to "explicit"). Minimal, necessary correction to existing UI text — not new UI.
- `src/app/App.tsx`: fire `performDueDayRollover()` once, inside the same continuity-resolution
  gate that already exists for restoring an active workout session before any screen mounts (same
  "resolve real state before first render" shape, not a new pattern) — satisfies "catch up on
  next open."
- `src/ui/screens/train/TrainScreen.tsx`: **exception to the "stay out of `today`/`train`"
  boundary above, deliberately minimal** — call `performDueDayRollover()` (fire-and-forget, no
  render-affecting change) immediately after a workout-completing command
  (`completeWorkout`/`abandonWorkout`/`completeRecoverySession`) succeeds, so "roll over when it
  ends" is satisfied without a live polling timer. This is a single non-visual side-effect line
  per call site, not a change to what TrainScreen.tsx renders or how PR #110's own toggle/card
  changes behave — verified against PR #110's actual diff (three call sites, none inside its
  changed regions) before touching the file.
- Tests: `tests/engine/dayRollover.test.ts` (16:29:59/16:30:00 boundary, multi-day catch-up
  collapse, real DST spring-forward/fall-back via `process.env.TZ` override), an integration test
  for `performDueDayRollover` (close+reopen, water/protein reset, weight carry-forward, workout
  guard, no-double-close, sleep-ambiguity advisory), and an `engine/advisory.test.ts` extension
  for the new composer.

**ROLLOVER-ON-RESUME amendment:**

- `src/app/App.tsx`: a second `useEffect` attaches `visibilitychange`/`pageshow` listeners
  (both, since a real browser doesn't reliably fire only one for every resume path) that call
  `performDueDayRollover()` when `document.visibilityState === "visible"`. Fire-and-forget, no
  render-affecting change, cleaned up on unmount.
- `src/application/commands.ts`: `performDueDayRollover()` gains an in-flight-promise
  memoization guard (same shape as `ensureActiveDay()`'s own) so two resume signals for one
  real-world resume collapse into at most one actual close+reopen.
- Tests: `tests/integration/dayRollover.test.ts` gains two concurrency tests (simultaneous calls
  produce exactly one rollover; a genuinely later call still performs a real, separate one).
  `tests/browser/App.test.tsx` gains a real, unmocked `<App/>`-level suite — real
  `visibilitychange`/`pageshow` events dispatched, real Dexie state checked afterward, with
  `startedAt` backdated relative to `Date.now()` (not a fixed calendar date) so both the
  "not yet due" and "guaranteed due" cases are deterministic regardless of the actual current
  wall-clock time.

## Explicit exclusions

- No change to `src/ui/screens/today/**` or any of PR #110's own changed files/regions, beyond
  the single narrow TrainScreen.tsx exception named above (verified against #110's actual diff).
- No new Dexie table, field, or schema version — every value needed already has a home in
  existing fields.
- No configurable/per-operator rollover time — 16:30 is a fixed constant, per the mission's own
  literal text ("BeyondDay boundary is 16:30 local time, automatic"), not a settings surface.
- No new UI component, screen, or interaction — the sleep-ambiguity flag renders through the
  already-generic `AdvisorySection`/`AdvisoryNote` mechanism with zero new rendering code.
- No live/polling timer while the app is open — matches the existing, already-documented
  `maybeSendCheckInReminder` precedent in `App.tsx` ("fires on open/reload... not an attempt at
  true background delivery"), applied identically here.
- No change to `engine/scheduledContext.ts`, `engine/continuity.ts`, or any WORK/OFF schedule
  concept — this Drop is a day-lifecycle boundary only, with no interaction with predicted shift
  phase.
- No change to `shouldSuggestEndDay`'s own logic — it already naturally stops suggesting once a
  day has any `DAY_ENDED` event, regardless of reason.
- No merge of PR #110, no further Drop beyond this one, no self-review, no self-merge.

## Relevant authority / references

- Direct owner mission text, this session, 2026-09-21 ("MISSION: DAY ROLLOVER AT 16:30").
- Direct owner ruling resolving the Day-model doctrine conflict (this session, via
  AskUserQuestion): "Override, record it" — proceed with automatic 16:30 rollover as a deliberate
  override of the locked "no calendar-time boundary" decision.
- `docs/UX_DECISIONS.md`'s "Day model" section (the decision being overridden) and `Sleep/
  Day-Ownership Model` entry (unchanged, but now newly adjacent to a genuine ambiguity source).
- `src/domain/common/types.ts`'s `DayEndedPayload`/`StateCheckIn.seq` doc comments — the
  `occurredAt`-may-differ / `recordedAt`-always-real convention this Drop reuses rather than
  inventing a new mechanism.
- `src/app/App.tsx`'s `maybeSendCheckInReminder` doc comment — the "checks on open/reload only,
  not true background delivery" precedent this Drop follows identically.
- `.claude/skills/beyond-drop/SKILL.md` §8's SERIAL-ONLY seams — the reason this Drop is scoped
  away from `src/ui/screens/today/**`/`train/**` beyond one narrow, verified exception.

## Required invariants

- `recordedAt` (events) and `createdAt` (BeyondDay) always stay the real, unmodified instant the
  system actually wrote the record — never fabricated/backdated. Only `occurredAt` (events) and
  `startedAt` (BeyondDay) may be stamped at the semantic 16:30 boundary instant.
- At most one ACTIVE BeyondDay at a time (existing invariant, unchanged) — `performDueDayRollover`
  never creates a new day without first actually closing the old one.
- Lazy day creation (existing locked doctrine, unchanged in every other path): `performDueDayRollover`
  never creates a day from nothing — it only ever closes-and-reopens an already-ACTIVE day whose
  boundary has passed.
- `AdvisoryNote` remains informational-only — the sleep-ambiguity note carries no `priority`, is
  never accepted/declined, never reassigns or mutates the sleep log it flags.
- An in-progress `WorkoutSession` (`status: "ACTIVE"`) is never interrupted by a rollover.
- Existing full test suite (FOUNDATION-1B/PLANNED-WORK-001/TODAY-QUICKACTIONS-001's own
  integration suites included) stays green.
- The old day's close and the new day's creation inside `performDueDayRollover` commit or roll
  back together — there is never a durable state with the old day `ENDED` and no ACTIVE day to
  replace it.

## Acceptance criteria

- `computeDueRollover`: not due at 16:29:59 local, due at exactly 16:30:00 local (boundary
  returned equals that instant).
- A day started days ago, checked after the app was closed across several 16:30s, rolls over
  exactly once (the single most recent boundary) — not once per elapsed boundary.
- A real DST spring-forward and fall-back date (2026-03-08, 2026-11-01, via `process.env.TZ =
  "America/New_York"`) still resolve correctly — the boundary math never assumes a 24-hour day.
- `performDueDayRollover` end-to-end: old day closes with `DAY_ENDED` reason
  `AUTO_CLOSED_DAY_ROLLOVER` stamped at the boundary; new day's `startedAt` is the same boundary
  instant; water/protein read as unset on the new day; `getMostRecentBodyweight()` still returns
  the last logged value (proving carry-forward, already-existing global-scope behavior).
- An active workout on the old day blocks the rollover; completing/abandoning it triggers the
  rollover on the very next `performDueDayRollover()` call.
- A day manually ended (explicit END DAY) before 16:30 is not double-closed by a later
  `performDueDayRollover()` call (no active day exists to act on).
- A PRIMARY sleep logged on a rollover-created day produces a SURFACE-tier `dayRolloverAmbiguity`
  AdvisoryNote; a PRIMARY sleep on an explicitly-started day does not; a SUPPLEMENTAL sleep never
  does, on either kind of day.
- `historyCopy.ts` labels an `AUTO_CLOSED_DAY_ROLLOVER`-reason day as "auto-closed," not
  "explicit."
- **ROLLOVER-ON-RESUME**: dispatching `visibilitychange` (visible) or `pageshow` at a real,
  rendered `<App/>` rolls over an active day whose boundary has elapsed since it started, even
  when the mount-time check already ran and found nothing due; a day that hasn't crossed its
  boundary is left untouched by a resume event. Two resume events fired together produce exactly
  one rollover, never two, and a genuinely later call after the first fully resolves still
  performs a real one when a new boundary is due.
- **Atomicity**: a failure injected exactly where `startDay()` performs its own write (after
  `endDay()`'s writes have already run within the same transaction) leaves the old day untouched
  (`ACTIVE`, not `ENDED`) and creates no new day; a later `performDueDayRollover()` call then
  completes the rollover correctly, with exactly one `DAY_ENDED`/`AUTO_CLOSED_DAY_ROLLOVER` event
  for the old day (never double-closed) and exactly one new day (never a duplicate/fabricated
  extra).
- `npm run verify` passes (architecture, full suite including browser, production build).

## Required verification

Standard Architectural gate per `.claude/skills/beyond-drop/SKILL.md` §3: `npm run verify`
(`check:architecture && vitest run && npm run build`), plus `git diff --check` and
`npm run check:risk c91a7f710499af6e1a71e5d193bfea05aeffd7df`.

## Builder expectations

- Work only on `claude/day-rollover-1630`, cut from the exact baseline above.
- Implement exactly the authorized scope; treat any temptation to touch
  `src/ui/screens/today/**`/`train/**` beyond the one named exception, to add a config surface,
  or to add a live polling timer, as a STOP condition already resolved against.
- Run the required verification, commit, push, open a PR, and stop — do not merge PR #110's own
  branch, do not merge this Drop's PR, do not open a further Drop.

## Reviewer expectations

- A separate session reviews this contract plus the final diff.
- Checks: no Dexie schema/version change; `recordedAt`/`createdAt` never fabricated; the workout
  guard genuinely blocks; the sleep-ambiguity note never blocks/reassigns anything; zero overlap
  with PR #110's own changed regions beyond the one named TrainScreen.tsx exception; the full
  existing suite still passes unchanged.
- Persists exact-head-bound review evidence; never merges or expands scope unilaterally.

## Integrator expectations

- A separate, explicitly authorized session merges only an approved, green PR.
- No admin-bypass of any required check.
- After merge, close DAY-ROLLOVER-001 via `node scripts/factory-drop.mjs close DAY-ROLLOVER-001
  --integration-sha <merge-commit-sha>`; this contract file is never rewritten by closure.

## Stop / escalation conditions

- `origin/master` differs from the approved baseline at any point verification is re-run.
- Any genuine file-level collision discovered against PR #110's actual diff beyond the one named
  exception — stop and re-scope rather than silently expanding into it.
- A real, indexed Dexie schema change turns out to be necessary — stop and escalate (this would
  move the Drop to HIGH-RISK).
- Any temptation to add a live polling timer, a configurable rollover time, or new UI — already
  resolved against.
