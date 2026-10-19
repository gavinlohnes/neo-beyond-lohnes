# TONIGHT-001 — run each work night with the operator

**Authorization:** Gavin, 2026-10-19, after reviewing the product discovery proposal
([The Shift Loop](https://claude.ai/artifact/42q6uGjFAkERRRgydQhrqe), private): "Approve, start
building". Rulings the same day are recorded in UX_DECISIONS → TONIGHT-001:
- idle workouts don't block the 16:30 roll (amends DAY-ROLLOVER-001);
- Week Ahead may place a workout on a post-shift morning (amends WEEKAHEAD-001 rule A);
- online food lookup, Minimum Day and Small Steps move off TODAY and the meal screen.

His answers that shaped the scope: he doesn't always eat the same foods, so there's no derived
meal checklist. He'd lift after work before sleeping, or after waking on a day off, so the
after-shift question is central. He wants his Garmin watch connected, which is a separate later
objective.

**Lane:** PROTECTED (day model, TODAY composition). **Builder:** Claude Code.
**Review:** an independent agent reviews the exact head of each PR. Gavin merges.
**Starting commit:** `d042a1f7c54a8e50dcf045a76f62a4a819d00504` (fresh `origin/master`, the #253
merge; no open PRs). **Branch:** `ccr-83cf6ed8-ug1ym9`. **PR:** linked in the checkpoint.

## PR 1 — no frozen days

A workout left open used to stop the 16:30 rollover indefinitely. In a walkthrough, an open workout
from Thursday 06:52 kept TODAY on Thursday's mode, check-in and numbers until the next Monday.
- At a due rollover, a workout with nothing recorded for 2 hours (no set logged or skipped since
  the later of its start and its last set) no longer blocks. The day rolls, and the workout stays ACTIVE
  and resumable on its original day, never closed or rewritten. A workout in use still holds the
  day, as before.
- Explicit END DAY and the new-day-start fallback keep the CONTINUITY-001 guard unchanged.
- TODAY's card for such a workout reads "WORKOUT STILL OPEN · started Thu 06:52".

## PR 2 — the shift loop on TODAY

- **Morning call:** in RECOVER after a shift, one card asks train / short / sleep first, with
  the Engine's recommendation and trace shown unchanged inside it. The answer is recorded through
  existing planned-work and workout commands. On days off, a **wake card** asks the same question
  after the first open.
- **Quick log:** up to three recently used saved meals and the last water amount, each logged in
  one tap through the canonical commands with UNDO. A compact, searchable MEAL sheet stays
  on TODAY. Meters show values against targets.
- **Night closed** summary in late RECOVER. The 03:00 briefing shows tonight's position.
- An honest headline ("Nothing needs you right now" never sits above an unanswered prompt), and at
  most one input card per mode.
- Protein target from the last weigh-in on record.
- Week Ahead amendment and the declutter ruling above.

## Exclusions

No schema or migration, no new event types or payload changes, no Engine recommendation rule or
priority change, no dependencies, no backend or notifications, no new tab, and no personal
context import. Garmin/Health Connect is a separate objective.

## Acceptance

PR 1: rollover integration tests for idle release, a recent set holding the day, completion on
the original day with no duplicate session, and END DAY unchanged. Engine boundary tests at
exactly 2 hours. A real-browser TODAY test. Full `npm run verify`.
PR 2: the criteria in the proposal's "First meaningful release", at 320/360/390/412 px, offline,
with axe and reduced motion.
