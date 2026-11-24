# GRAYSON-WHAT-MOVES-001: what moves your numbers

- **Authorization:** Gavin, 2026-11-24. Backlog row **C6.3** (LEARN), from the ranked backlog he approved, and
  campaign plan item **C6.3 "What moves your numbers"** (`docs/GRAYSON_CAMPAIGN_PLAN.md`, Not started). At 08:19 CT
  he made Claude Code a third builder with its own lane: **"Claude Code, own lane"** (DATA, Weekly and Delta's
  read-only learning). His rule, at 01:26 CT: **"I should be able to edit and tweak or correct everything in this
  app."** Merging this brief is his approval of the defaults below. Claude Code builds it once it merges.
- **Lane: FEATURE.** It's read only. The campaign plan puts C6.3 in "Feature (read-only; HARVEST-003 S3 said no
  approval needed if read-only) · M". It reads Whole Picture rows and habit answers BEYOND already keeps. It adds
  no record, event, Dexie version, Engine input, Delta behaviour, recommendation, notification or navigation
  change.
- **Starting commit:** `origin/master` `1fd2c47`. Re-fetch before starting.
- **Builder:** Claude Code (Gavin runs it from this brief on master). Branch `claude-code/grayson-what-moves-001`.
  **Active PR:** pending.
- **Order:** Claude Code's second brief, after GRAYSON-WEIGHT-TREND-001. Overlap check on `1fd2c47`:
  - The only open PR is #641 (campaign plan text).
  - GRAYSON-FIX-UNDO-001 (Grok Bot) changes void reads inside `wholePictureQueries.ts`. This brief only calls
    `getWholePicture` and leaves that file alone.
  - No other brief touches `PersonalUnderstanding.tsx`.
  - Recheck open PRs at build time. While other PRs are open, leave the tracker and checkpoint to the oldest open
    PR (DEV-FLOW-002, 2026-11-23 amendment, rule 2).

## Objective and benefit

Today the only "what lines up with what" view is #tags against next-day sleep, energy, mood and training, with 3
days a side and plain averages (`tagPatterns.ts`; Parity Scorecards row D1, PARTIAL). His habits, his workouts and
his work days are never compared with how he sleeps or feels next, though BEYOND records all of them. After this,
DATA's Patterns view gets a **What moves your numbers** section. It compares each habit, training days and work
days with next-day main sleep, next-day energy and next-day resting heart rate. It uses the same honest Welch
interval as Try experiments, shows the number of days behind every line, and says **can't tell yet** when it
can't. That lets Delta learn what matters for him without asking him.

**Benchmark:** Exist's mood page: "Exist combines your mood ratings with all the other data you track to help you
figure out what makes you happier" and "Exist will find the correlations you can't find by yourself"
(exist.io/about/mood/, read 2026-11-24). The page doesn't say how it computes them. We copy the idea, not its
method or look. The method here is the one GRAYSON already uses for Try experiments (`tryExperiment.ts`), with
sample sizes visible.

## Recommended defaults (approved when Gavin merges this brief)

1. **What's compared (the "with" side against the "without" side, per lived day):**
   - each active habit: DONE days against NOT DONE days, where days with no answer recorded count on neither
     side;
   - trained that day (a recorded session) against not;
   - work day against day off, from the saved schedule context that Whole Picture already carries. Unknown days
     are left out.
2. **Against what (the next lived day, 16:30 to 16:30, DST-safe, as `tagPatterns.ts` does):**
   - main sleep hours;
   - last check-in energy;
   - resting heart rate (Garmin).

   A missing value is missing and is never counted as zero.
3. **When a line shows:** at least 5 days on each side with the measure recorded, as the campaign plan says,
   within the window.
4. **How it's judged:** `meanDiffInterval` (Welch 95%) and `diffVerdict` from `tryExperiment.ts`. The "about the
   same" band is 15 minutes for sleep, 0.5 for energy and 2 bpm for resting heart rate.
5. **What it says:**
   - A clear direction reads: **After a day you trained, you slept about 40 min more (12 days against 9).**
   - A same verdict reads: **Next-day energy was about the same either way (14 against 11).**
   - Unsure lines are folded into one quiet **Can't tell yet:** list.
   - Clear lines come first, then same, then can't tell.
   - The footer reads: "These line up in your records; they don't prove a cause. Nothing here changes advice."
6. **Window (principle 1):** the last **90 days** by default. The choices are **90 days**, **180 days** and **All**.
7. **Yours to change:**
   - the window, as above;
   - **Hide** on any line, which keeps it out of this list until he brings it back from **Hidden (n)**.

   Both are localStorage preferences that travel with the native backup.
8. **Calm (principle 5):** no score, colour, ranking of him, alert or suggestion. Nothing is pushed to TODAY,
   Delta or Weekly in this brief. Reading it into Weekly is C6.2.

## Design principles check (Vision, Nov 24)

1. Yours to change: the window and Hide on any line.
2. Fix, don't ask: Hide is one tap, and Hidden brings it back.
3. One tap for the usual: nothing to set up. It fills in as data builds.
4. Built around your shift: it's lived days, and work against off is one of the comparisons.
5. Calm: no score, colour or alert, and no advice.
6. Always says why: every line names its days, and the footer says it's not a cause.
7. Simple first: clear lines first; "can't tell yet" is folded into one line.
8. Tap or say it: not affected.

## Scope

- `src/application/whatMoves.ts` (new):
  - `compareCauses(days, { window })`, pure: day facts in, lines out.
  - `whatMovesDayFacts(rows, habitAnswersByDay)`, pure: builds the next-day join from Whole Picture rows.
  - `getWhatMoves(now, window)`: reads `getWholePicture(now)`, the active habits, and habit answers per lived day
    from the events through `projectHabitAnswers` (`domain/habits.ts`).
  - All three reuse `meanDiffInterval` and `diffVerdict`.
- `src/persistence/whatMovesPreference.ts` (new): `{ window: 90 | 180 | "ALL", hidden: string[] }` under
  `beyond:whatMovesPreference`. It reads safely, as `restMemory.ts` does.
- `src/persistence/settingsTransfer.ts`: add `"beyond:whatMovesPreference": "What moves your numbers"` to
  `TRAVELLING_SETTINGS`.
- `src/ui/screens/review/WhatMovesSection.tsx` (new), rendered once in `PersonalUnderstanding.tsx`'s Patterns view,
  above the existing `TagPatternsSection`.

## Excluded

- **Tags.** They stay in their own section, unchanged, and folding them into this method is a later item.
- **Caffeine.** It isn't recorded; C4.3 adds it.
- **Check-in feeling words.** C5.1 adds them.
- **Delta, Weekly or TODAY reading the results** (C6.2 and later).
- **"That's not right" on a line** (E8).
- **Any cause claim or advice.**
- **Changes to** `tagPatterns.ts`, `tryExperiment.ts`, `wholePictureQueries.ts` or the habits code.

## Files

- **In scope:** the three new files above, `settingsTransfer.ts` (one allowlist line), `PersonalUnderstanding.tsx`
  (one render line in Patterns), CSS beside the tag patterns styles, tests, `docs/decisions/GRAYSON-WHAT-MOVES.md`,
  and `docs/agent/screenshots/GRAYSON-WHAT-MOVES-001/`.
- **Off limits:** `src/domain/**` (read `projectHabitAnswers` only), `src/engine/**`, `src/persistence/db.ts`,
  `tagPatterns.ts`, `tryExperiment.ts`, `wholePictureQueries.ts`, `habitCommands.ts`, `habitQueries.ts`,
  `src/application/alfred/**`, `android/**`, `package.json`.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:**
  - `getWholePicture` rows: context, sleep hours, energy, resting, sessions;
  - `projectHabitAnswers`;
  - `meanDiffInterval`, `diffVerdict` and `PICTURE_MEAN_FLOOR` thinking;
  - `livedDayBoundary`;
  - `hoursMinutes` and the copy style of `TagPatternsSection`;
  - the localStorage preference pattern and `TRAVELLING_SETTINGS`.
- **OWN:** the cause list, the bands, the 5-a-side floor, the line wording and order.
- **BUILD FROM SCRATCH:** nothing. No library.

## Acceptance

- **`tests/whatMoves.test.ts`** (pure and integration, in `TZ=UTC` and `TZ=America/Chicago`):
  - The next lived day is joined across a DST change, and a gap leaves next-day values missing.
  - UNRECORDED habit days sit on neither side.
  - Fewer than 5 a side shows no line.
  - A planted 1 h sleep difference with low spread reads as a clear "more". Equal means read "about the same".
    Noisy data reads "can't tell yet".
  - Work against off uses only known contexts.
  - Windows of 90, 180 and All change the days counted.
  - A hidden line drops out.
  - Removed or voided logs stay out, because Whole Picture already leaves them out.
- **`tests/browser/WhatMoves.test.tsx`:**
  - In Patterns, the section shows clear lines first and then the folded "Can't tell yet".
  - Every line names its days.
  - Hide removes a line and Hidden brings it back.
  - The window choice persists and survives a native backup round trip.
  - Empty data shows "Not enough days yet. This fills in as you log."
  - A read failure says "couldn't be read; nothing changed".
  - Keyboard only, no overflow at 320, 360 and 412 px, and axe clean.
- **Existing tests:** Patterns, tag patterns, Try experiments, Whole Picture and habit tests stay green.
- **New tests:** fail on master.
- **Checks:** `typecheck`, `check:architecture`, `check:risk`, the build, focused tests in both zones, and the full
  `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-WHAT-MOVES-001/`, at 360 px, with the key ones also at 320 and
  412:
  - the section with clear, same and can't-tell lines;
  - the window choice;
  - the Hidden list.
- **Device check (Gavin, Android):** open DATA → Patterns and read the section. Check one line against what you
  remember, hide one, and switch to 180 days. Then KEEP, REFINE or RETHINK.

## Decision record

The build PR records the approved defaults in `docs/decisions/GRAYSON-WHAT-MOVES.md` (DEV-FLOW-002, 2026-11-23
amendment).

## Stop and ask Gavin if

- the work needs a stored record, event or Dexie version, or a change to `wholePictureQueries.ts`, `tagPatterns.ts`
  or `tryExperiment.ts`;
- any result would feed Delta, Weekly, TODAY, a recommendation or the Engine;
- the copy can't avoid sounding like a cause or advice;
- habit answers can't be read per lived day without a new query in the habits code;
- the 5-a-side floor leaves almost every line empty on his real data. In that case, report the counts and don't
  lower it.

## Risks and checks

- **Many comparisons:** a dozen habits against three measures is dozens of tests, so some "clear" lines will be
  chance. The 5-a-side floor, the "about the same" bands and the footer keep that honest. Ordering lines by
  interval width rather than size of effect is acceptable if the builder thinks it's clearer. Say so in the PR.
- **Confounding:** work days change sleep and training together. The work-against-off line makes that visible. No
  adjustment in this brief.
- **Size:** M.
- **Stale facts to recheck at build time:** Whole Picture row fields, the `projectHabitAnswers` signature, the
  Patterns view layout, and open PRs.
