# GRAYSON-TRAIN-FINISH-2 — guided execution and training feeds the night (one batch)

- **Owner authorization:** Gavin, 2026-11-23: "Let's get it", approving the proposed TRAIN finish 2 (guided execution,
  and C4.4 training feeds the night plus a train window). Merge stays with Gavin (no merge-on-PASS for this batch).
- **Lane:** PROTECTED (live-workout guidance; sleep-plan guidance). Independent exact-head review, green CI, Gavin's
  merge. **Builder:** Claude Code. **Starting commit:** master `a379eb51`. **Branch:** `ccr-380c4225-1es42i`.
- **Operator benefit:** under the bar, Delta stays out of the way, says one useful thing when the numbers clearly
  call for it, and stops a movement the moment something hurts; after training, the night plan protects the sleep a
  hard or late session needs, and TRAIN says when today's training fits before the shift.

## Item 1 — GRAYSON-TRAIN-GUIDED-001 (design GRAYSON_TRAIN_INTELLIGENCE §6)
- Normal set: quiet. After a recorded working set that clears the top of its rep range by 2 (or reaches the top with
  3+ reps in reserve), or falls 2 below the bottom, Delta proposes one load step for the next set of that exercise:
  USE fills that set's weight only (no write), KEEP leaves it, WHY? shows the evidence, the step and that it's his
  call. Never on warm-ups, the last set, HOME bodyweight work, unloaded sets or lifts without a load step.
- PAIN OR SOMETHING WRONG stops the movement now, with no diagnosis ("if pain is sharp, or doesn't ease with rest,
  get it checked"): SKIP ITS REMAINING SETS (existing skip), JUST NOTE IT, or continue.
- One "What Delta noticed" review on the completion summary; kept in memory only; nothing stored beyond sets/skips.

## Item 2 — C4.4 training feeds the night and a train window (campaign plan C4.4; HARVEST-003 W2)
- The shift sleep plan gains a "Protect sleep tonight" card when the latest session (ended within 20 h) was hard
  (his own top third by volume of the last 12, with at least 6 to compare) or late (ended within 3 h of his usual
  sleep, the next start of his usual main sleep from his Garmin rhythm). Facts from his records only; no source
  claim, no prescribed length; SAVE/SKIP like the other cards. Only while that sleep is still ahead.
- TRAIN home shows "Train window: 09:00–16:00 · an hour after your usual wake (08:00), done 2 h before your 18:00
  shift." From the plan's own numbers (usual wake on that kind of day + 60 min, to 120 min before the shift).
  Abstains without a saved schedule, a Garmin wake time, a shift ahead, or 45 minutes of room.
- Engine, recommendation, workout/form choice and capacity authority unchanged.

- **REUSE:** live-workout inputs (`patchInput`), `skipSet`, the completion summary; `deriveShiftSleepPlan`, its
  rhythm/wake logic and card UI (ROUTE); training history volumes. **OWN:** `deriveSetProposal`, `reviewLines`,
  `deriveTrainingCard`, the train-window rule and the two UI pieces. **BUILD FROM SCRATCH:** none.
- **Exclusions:** no schema/table/event change; no stored learning; no automatic load change; no notifications; no
  Gym-mode proposals yet; no adaptation; no change to existing cards.
- **Acceptance:** pure guidance tests (quiet, up, down, every exclusion, WHY, review wording); browser live workout at
  320/360/412 px (quiet in range, one proposal, USE fills set 2 only and writes nothing, pain stop skips only when
  chosen, end review, no overflow, axe); sleep-plan integration (window, abstentions, hard, late, stays out); browser
  window line and ROUTE card at 320/360/412 px; existing TRAIN and sleep-plan suites unchanged.
