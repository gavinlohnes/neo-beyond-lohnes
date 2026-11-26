# GRAYSON-WORKOUT-CHANGES — add, swap and remove mid-workout, then one question at the end (owner go, 2026-11-25)

Gavin approved the [brief](../agent/GRAYSON-WORKOUT-CHANGES-001.md) ("Brief all of it"; "I should be able to edit and
tweak or correct everything in this app"). It replaces GRAYSON-TRAIN-ORDER-001.

- **Today only until he says so.** ADD EXERCISE, SWAP and REMOVE FROM TODAY each write a `WORKOUT_PLAN_CHANGED` event
  under the session's lived day (USER). Today's plan is the routine as the workout started plus those changes, in order.
- **A swap logs the exercise he did.** Picking a move logs under that exercise's own id, so its history and progression
  are true. The free-text substitute stays in the fold and records `substitutedName`, as before. Sets already done stay
  today; a removal drops only unlogged sets.
- **Suggestions:** three moves for the same muscle group, ranked by equipment he's logged with in the last 60 days, then
  how recently he did the move, then his own; each says "Last: 135 lb × 10" or "Not done yet". SEARCH finds any other.
  ADD EXERCISE shows the three he did most recently, then everything, his own first.
- **One question at the end,** only when something changed (an add, swap, removal or a different order): "You changed
  this workout." KEEP FOR NEXT TIME saves through ROUTINE-EDIT's command (UNDO; the programme stays in step); JUST
  TODAY, or no answer, changes nothing. The kept order is the exercises done, in the order done, then the rest.
- **REDUCED** still takes the routine's first two exercises, after any kept change.
- **Stop-and-ask check:** no standards test or emphasis block counts on a specific exercise today, so a kept change
  can't remove one they depend on.
