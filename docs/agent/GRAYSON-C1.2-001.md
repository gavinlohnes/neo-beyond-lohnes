# GRAYSON-C1.2-001 — Orientation slice 2: day-off, recovery and hard-day grammar

- **Owner authorization:** Gavin, 2026-11-20, on the C1.2 proposal: "1. We will stick with your recommendation"
  (no Orientation-invented day-off advice; only the Engine's recommendation ever appears) and, confirmed in a
  follow-up question, "Include the trend" (Delta notes a sustained mood drop across his recent submitted
  check-ins, as a fact, never a diagnosis, never a change to advice). "Let's get to work."
- **Lane:** PROTECTED (TODAY composition; a new reading of his check-in history). Independent exact-head review,
  green CI and Gavin's merge required.
- **Builder:** Claude Code. **Branch:** `ccr-380c4225-1es42i` (restarted from master after #597 merged).
  **Starting commit:** `4883c62`.
- **Operator benefit:** START DAY opens Orientation on any kind of day, and the screen fits what the day is for.
  The first day off after a run leads with "Back on Wed", sleep first, and the recovery plan he set; a free day
  off names open time as open and lists only what's actually due; the last day off says he's back tomorrow. A
  hard day is shorter and gentler. Mornings on days off reach it from TODAY's ORIENT TODAY button.
- **Grammar:** the day's purpose comes from the life state TODAY already names (WORK RUN / RECOVERY / FLIP / FREE).
  Off-work days show no shift countdown and no work preparation; their runway is only today's timed commitments.
  **Hard day** = Minimum Day (his switch) or the Engine's STABILIZE after his check-in (the locked capacity rule):
  one action at most and Delta's gentler words. **Mood trend** (`moodTrend`): mood strictly lower on each of his
  last three submitted check-ins (latest per day, last 7 days) shows as a fact in YOU; only on a hard day does
  Delta add that it has gone on for a few days.
- **Authority:** unchanged from C1.1 (Option A). No day-off recommendation is invented; the trend never feeds
  the Engine, a recommendation or any score. Viewing writes nothing.
- **REUSE:** C1.1's `orientation.ts` and screen; `lifeState` purposes; `shiftRun` for "back on"; LIFE-STATE-003's
  recovery contract and `hasPlanItem`; `getMinimumDayStatus`; submitted check-ins; eligible obligations.
  Gentler Streak's day status changing tone is borrowed as an idea only. **OWN:** the purpose grammar, the hard-day
  rule, `moodTrend` and the copy. **BUILD FROM SCRATCH:** none.
- **Exclusions:** no Engine, priority, schema, event, notification, provider, dependency or AI change; no
  diagnosis, crisis response or wellbeing score; no change to TODAY's own manual PREPARE FOR WORK, which an
  existing test deliberately keeps available on days off (the plan's "no work prep under OFF" is met on Orientation).
- **Acceptance:** pure tests (recovery, free day with and without something due, flip, STABILIZE hard day,
  trend fact vs. hard-day sentence, Minimum Day, unread history, `moodTrend` strictness); integration on real
  records (Monday after the run: recovery, back on Wed 18:00, the 4 → 3 → 2 trend, no write); browser states at
  320/360/412 px and START DAY on the Monday opening the recovery screen through TODAY; full suite; Gavin's phone.
- **Known limits:** check-in history groups by BeyondDay, so a day opened early and the day it replaced count as
  two entries only if both had check-ins; the trend reads mood only.
- **Review follow-up (independent PASS on `4533184`, non-blocking findings):** "one bad morning" → "one bad day"
  (Gavin kept "worth deliberate attention", 2026-11-20); on a recovery day the sleep fact reads "Your sleep after the
  last shift was under your usual"; an unreadable Minimum Day is reported in `unread` instead of treated as off.
  Loading all check-ins for the trend is left as is at current volumes.
