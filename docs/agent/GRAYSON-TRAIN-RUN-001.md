# GRAYSON-TRAIN-RUN-001 — running sessions: the 9-week run/walk plan in TRAIN

- **Authorization:** Gavin, 2026-11-24, picked backlog B1 ("Running") for the first build brief. TRAIN must fully
  replace Couch to 5K (his role brief). Run cues through Health Bridge come later as B3 (his pick 1A); the
  1.5-mile standard follows as B4 (his pick 4A). **This brief authorizes nothing by itself:** it is Protected, so
  Codex starts only after Gavin's explicit go on this brief and its defaults below.
- **Lane: Protected.** New stored records (one additive Dexie table), new event types, and a new TRAIN
  session kind. No Engine or recommendation change, no dependency, provider, permission or navigation change.
  Independent exact-head review, green CI; Gavin merges. No Builder merge.
- **Doctrine it implements:** `docs/GRAYSON_INTEGRATED_HEALTH_MISSION.md` §7 "Running programme: Couch to 5K,
  then 1.5-mile specificity" and §14 "Running foundation"; `docs/GRAYSON_TRAIN_INTELLIGENCE.md` §9;
  `docs/GRAYSON_CAMPAIGN_PLAN.md` (the run track paragraph under Campaign 4).
- **Starting commit:** `origin/master` `7e61e02` (#638 merged). Re-fetch before starting.
- **Builder:** Codex. Branch `codex/grayson-train-run-001`. **Active PR:** pending.
- **Overlap check (2026-11-24):** open PRs #639 (C6.1 + C6.2, Delta learning) and #606 (C3.4b/c, recurrence)
  touch none of the files below. Two of #639's files (`src/domain/common/types.ts`,
  `src/application/deltaFacts.ts`) are shared ground: rebase on whichever merges first. While other PRs are
  open, record status in the PR description and leave the tracker and checkpoint to the oldest open PR
  (DEV-FLOW-002, 2026-11-23 amendment, rule 2).

## Objective and benefit

One tap on TRAIN starts today's run. GRAYSON knows which run is next, walks him through every run and walk
interval with the screen on, buzzes at each change, survives a reload, and asks once at the end whether to
move on or repeat. He never plans a run, counts weeks or keeps a second app.

## Recommended defaults (Gavin approves these with the brief)

1. **Plan content:** the NHS Couch to 5K pattern, 9 weeks × 3 runs, transcribed as data (below). Structure
   only: no NHS audio, coach voices, logo or branding. One source line in the plan's detail: "Interval pattern
   from the NHS Couch to 5K plan", linking the NHS page.
2. **Per week:** two runs expected, a third optional (Mission §7), counted per calendar week Monday–Sunday in
   his time zone. Shown as information only ("2 of 2 done · a third is optional"), never "missed" or behind.
3. **Advancing:** a COMPLETED run shows **Move on to Week W, run R** and **Repeat this run**. Nothing advances
   without his tap. PARTIAL or ABANDONED never advances and offers **Repeat this run** only. No catch-up
   volume, no skipped weeks, no streaks. He can also pick any earlier run from the plan list.
4. **Placement:** TRAIN shows the next run; it is **not** placed into TODAY's recommendation, the Engine or
   the A/B/C sequence. Placing runs around his shifts and lifts is a separate later slice (RUN-002), because it
   touches recommendation authority.
5. **Cues in B1:** on-screen countdown plus a buzz at each interval change through the existing
   `feedback()` helper, while the screen is on. The screen stays awake during a run with the same wake-lock
   pattern Gym mode uses. Spoken cues and locked-phone cues are B3 and are not built here.
6. **Pain or something wrong:** one always-visible control ends the run as PARTIAL with the same no-diagnosis
   line TRAIN already uses (`DeltaPanels.tsx`), adapted to say "run" not the exercise name.
7. **What a run counts toward in B1:** it appears in TRAIN history and this plan only. It does not count
   toward lift progression, PRs, the A/B/C sequence, Gym mode, "Protect sleep tonight" (C4.4), MINIMUM DAY
   MOVE, or any TODAY line. Each of those is a later, separately approved change.
8. **Naming:** in this codebase "run" already means a **work run** (shift; `workRunPlan.ts`, C2.5 "run
   debrief"). Use **running** in every identifier, event and table (`runningSession`, `RUNNING_…`), and
   "run" only in operator-facing copy where TRAIN context makes it clear.

## Scope

- **Pure plan data** `src/domain/workout/runningPlan.ts`: `RUNNING_PLAN_FOUNDATION`, 9 weeks × 3 runs, each run
  an ordered list of segments `{ kind: "WARMUP" | "RUN" | "WALK" | "COOLDOWN", seconds }`. Every run starts
  with a 5-minute warm-up walk and ends with a 5-minute cool-down walk. Plan shape carries
  `phase: "FOUNDATION" | "SPECIFIC"`; only FOUNDATION has content now.
- **Pure cue timeline** `src/domain/workout/runningCues.ts`: `runningCueTimeline(segments)` returns
  `{ atSecond, cue: "WARMUP" | "RUN" | "WALK" | "HALFWAY" | "COOLDOWN" | "FINISH", text }[]`, for example
  "Run for 1 minute", "Walk for 1 minute 30 seconds", "Halfway", "Cool-down walk, 5 minutes". B1's screen
  renders and buzzes from this list; B3 hands the same list to Health Bridge to speak, so **this function is
  the contract** and B3 adds no second timing model. `currentSegment(segments, elapsedSeconds)` lives here
  too.
- **Stored session** `RunningSession` in `src/domain/common/types.ts`, persisted in a new additive table:
  `id, beyondDayId, schemaVersion, kind: "PLAN_RUN"` (B4 adds `"TIMED_TEST"` without migration),
  `planId, phase, week, run, segments` (a snapshot, so a later plan edit never rewrites history),
  `status: "ACTIVE" | "COMPLETED" | "PARTIAL" | "ABANDONED"`, `startedAt, endedAt?, pausedAt?, pausedMs,
  completedSeconds, endReason?: "FINISHED" | "STOPPED" | "PAIN"`. Timing is absolute (`startedAt` plus
  `pausedMs`), as `activeRestEndsAt` does, so a reload or backgrounding recovers the right interval from
  `Date.now()`.
- **Events** (append-only, through the application layer only): `RUNNING_SESSION_STARTED`,
  `RUNNING_SESSION_PAUSED`, `RUNNING_SESSION_RESUMED`, `RUNNING_SESSION_ENDED` (status, completedSeconds,
  endReason), `RUNNING_PLAN_ADVANCED` (from week/run to week/run; only on his tap). Plan position is derived
  from these events, never stored as a mutable counter. One ACTIVE running session at a time, and none while
  a lift session is ACTIVE (and the reverse), with a plain refusal.
- **Persistence:** `src/persistence/db.ts` `this.version(27).stores({ runningSessions: "id, beyondDayId,
  status, startedAt" })`, additive, nothing to migrate. Validation in a new
  `src/persistence/runningSessionValidation.ts` (malformed rows read as unusable, never crash TRAIN).
  Native backups already carry every table: prove a round trip, and that an older backup without the table
  restores with no running history.
- **Application:** new `src/application/runningCommands.ts` (start, pause, resume, end, advance, repeat)
  and `src/application/runningQueries.ts` (next run, this week's count, plan list with done marks, history).
- **UI:** new `src/ui/screens/train/RunningSession.tsx` (+ `running.css`): big current interval, time left in
  it, time left overall, next interval, a segment strip, Pause/Resume, End, the pain control, and the finish
  sheet (defaults 3 and 6). Entry: one card on TRAIN, "Next run · Week 1, run 1 · 28 min 30 s" with **Start
  run**, plus **Plan** to see all 27 runs. TRAIN history lists running sessions read-only (week/run, status,
  minutes). Existing TRAIN look, 44 px controls, 16 px text, reduced motion respected, axe clean.

### Plan data (from the NHS page, read 2026-11-24)

Each run: 5 min warm-up walk, the intervals below, 5 min cool-down walk. All three runs in a week are the same
except weeks 5 and 6.

| Week | Run 1 | Run 2 | Run 3 | Page total |
|---|---|---|---|---|
| 1 | (run 1 min, walk 1 min 30 s) × 7, then run 1 min | same | same | 28 min 30 s |
| 2 | (run 1 min 30 s, walk 2 min) × 5, then run 1 min 30 s | same | same | 29 min |
| 3 | run 1:30, walk 1:30, run 3, walk 3, run 1:30, walk 1:30, run 3 | same | same | 25 min |
| 4 | run 3, walk 1:30, run 5, walk 2:30, run 3, walk 1:30, run 5 | same | same | 31 min 30 s |
| 5 | run 5, walk 3, run 5, walk 3, run 5 | run 8, walk 5, run 8 | run 20 | 31 / 31 / 30 min |
| 6 | run 5, walk 3, run 8, walk 3, run 5 | run 10, walk 3, run 10 | run 25 | 34 / 33 / 35 min |
| 7 | run 25 | same | same | 35 min |
| 8 | run 28 | same | same | 38 min |
| 9 | run 30 | same | same | 40 min |

The page also says to aim for a rest day between runs and that repeating any run or week is fine.
Source: <https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/>.
A unit test checks each run's total against the page totals above, so a transcription slip fails CI. The
Builder re-reads the page at build time and flags any change.

**After week 9 run 3:** "Foundation done: 30 minutes running. The 1.5-mile phase comes next." No invented
1.5-mile content; that is B4 and the SPECIFIC phase, each needing its own go.

## Built so the next slices attach without rework

- **B3 run cues (Health Bridge):** consumes `runningCueTimeline()` and the session's `startedAt`/`pausedMs`.
  B1 must not put timing logic in the component.
- **B4 standards test:** adds `kind: "TIMED_TEST"` (1.5 miles for time, owner-entered) to the same table and
  history; no migration.
- **RUN-002 placement:** reads `runningQueries.nextRun()` and this week's count; B1 exposes both.
- **C4.7 Health Connect:** a watch-recorded run is not linked or deduplicated in B1; nothing here assumes it
  won't be later.

## Excluded

GPS, distance or pace; maps; audio or speech; Android/Health Bridge changes; notifications; placement into
TODAY, Week planner or the Engine; any change to lift progression, PRs, A/B/C sequence, capacity,
STANDARD/REDUCED/RECOVERY, Gym mode, C4.4, MINIMUM DAY or Garmin import; Delta proposals about running;
streaks, badges, certificates or scores; a 1.5-mile phase; editing the plan's intervals.

## Files

- **In scope:** `src/domain/workout/runningPlan.ts` (new), `src/domain/workout/runningCues.ts` (new),
  `src/domain/common/types.ts` (RunningSession + event types/payloads only), `src/persistence/db.ts` (v27 line
  only), `src/persistence/runningSessionValidation.ts` (new), `src/application/runningCommands.ts` (new),
  `src/application/runningQueries.ts` (new), `src/ui/screens/train/RunningSession.tsx` and `running.css`
  (new), `src/ui/screens/train/TrainScreen.tsx` (entry card and route only), `TrainingHistory.tsx` (read-only
  list), `trainCopy.ts` (copy), tests, `docs/agent/screenshots/GRAYSON-TRAIN-RUN-001/`.
- **Off limits:** everything under `src/engine/`; `src/domain/workout/types.ts` (`WORKOUT_TEMPLATES` and the
  lift session model); `src/application/trainCommands.ts` lift semantics; `trainingProgramme*.ts`;
  `GymMode.tsx` beyond reading its wake-lock pattern; `src/ui/feel/feedback.ts` (call it, don't change it);
  `android/**`; sleep plan, Garmin, nutrition and TODAY files; `package.json` (no dependency).

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** NHS Couch to 5K's interval structure (data, cited); `activeRestEndsAt`'s absolute-time recovery;
  Gym mode's screen wake lock; `feedback()` for the buzz; the additive optional-table pattern of
  SCHEDULE-EXCEPTIONS-001 (`db.ts` v26) and its backup round-trip tests; TRAIN's pain-stop wording.
- **OWN:** the running session record and events, plan position derived from events, the two-plus-optional
  weekly count, the cue timeline contract, and the TRAIN screens.
- **BUILD FROM SCRATCH:** the timeline and session model, because no interval-timer library fits BEYOND's
  event log, lived day and offline backup without adding a dependency.

## Acceptance

- `tests/runningPlan.test.ts`: every run's total matches the table; warm-up and cool-down on all 27;
  week 5 and 6 differ by run; `currentSegment` at every boundary (0 s, each change, last second, past end).
- `tests/runningCues.test.ts`: cue times and text for week 1 run 1 and week 5 run 3; HALFWAY once; FINISH at
  the end; no cue inside warm-up except its start.
- `tests/integration/runningSessions.test.ts` (UTC and America/Chicago): start → pause → resume → end
  COMPLETED; reload mid-run returns the right interval; PARTIAL and PAIN never advance; advance only via the
  command; repeat keeps the position; one ACTIVE session and no overlap with a lift session; weekly count
  Monday–Sunday in his zone across a lived day that crosses midnight; backup round trip; older backup restores
  with none; a malformed row doesn't break TRAIN; lift progression, PRs and sequence next-member unchanged
  with running sessions present.
- `tests/browser/RunningSession.test.tsx`: TRAIN card → Start run → interval changes (fake timers) → buzz
  called once per change → finish sheet → Move on / Repeat; pain control; empty state (no runs yet); plan list;
  week 9 done state; keyboard path; 320/360/412 px no overflow; axe clean.
- New tests fail on master. `typecheck`, `check:architecture`, `check:risk`, build, focused tests in both
  zones, full `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-TRAIN-RUN-001/` at 360 px (key ones also 320 and 412):
  TRAIN with the next-run card (first time and mid-plan), live RUN interval, live WALK interval, paused, after
  a reload mid-run, finish sheet after a completed run, after a PARTIAL, plan list, week 9 done.
- **Device check (Gavin):** start Week 1, run 1 on the phone, screen on. The phone buzzes when the first
  run interval starts; pull down to reload at minute 3 and the timer is still right; end early and see only
  **Repeat this run**. Then KEEP / REFINE / RETHINK.

## Risks and checks

- **Timers with the screen off:** browsers throttle or stop timers when the phone locks. B1 keeps the screen
  on and says so plainly ("Keep the screen on. Voice cues with the phone locked come next."). Elapsed time is
  always recomputed from timestamps, so nothing drifts. Locked-phone cues are B3.
- **Injury:** no pace or speed targets; advancing always needs his tap; the pain control is always visible.
- **Shared types file:** `src/domain/common/types.ts` is edited by #639 too; keep additions in one block.
- **The "run" name clash** (default 8): a review blocker if any identifier says `run` for a running session.
- **Stale facts to recheck at build time:** Dexie version (v26 today), open PRs, the NHS page.
