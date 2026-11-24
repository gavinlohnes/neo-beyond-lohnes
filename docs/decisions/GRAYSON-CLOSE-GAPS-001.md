# GRAYSON-CLOSE-GAPS-001 — the close names what's missing, in one line

- **Date:** 2026-11-24. **Authority:** Gavin, on the five logging ideas ("I like the rest. I don't want it to be
  annoying and pester me. Start implementing now."). Brief: `docs/agent/GRAYSON-CLOSE-GAPS-001.md`.
- **Decision:** one muted line at the top of the close shown after SHIFT DOWN (never END DAY), only when a gap applies.
  At most two gaps, meals then weight: "No meals logged today outside your shift." (when that day kind has usual meal
  times, learned by GRAYSON-LOG-NUDGE-001 or his own, and no live meal of the lived day falls outside the shift) and
  "No weigh-in since Nov 21." / "No weigh-in yet." (no weigh-in for 3 calendar days, his setting 1–14). The whole line
  is one tap: Delta opens with "I ate " (or "My weight this morning was " when weight is the only gap); nothing is
  sent. No counts, no streaks, no "you forgot"; SKIP ends the close and the line with it.
- **Reads:** the void-aware meal read and usual times from `application/logNudge.ts` (`getLogNudge`, `usualTimesFor`),
  `livedDayShiftWindow`, and the corrected, void-aware weigh-in history (`getBodyweightHistory`). The read runs when the
  close opens, after the catch-up card above it, so a meal the catch-up just logged is seen. Shift meals belong to the
  catch-up and do not clear the outside-shift gap.
- **Editable:** in the close's existing chooser, "Tell me what's missing" (default on) and "Weigh-in gap, days".
  Stored in `beyond.close.gaps.v1`, which travels with the backup as "Evening close gaps".
- **Why in the close, not a push:** it lives inside a card he already chose to open, at the end of the shift.
- **Benchmarks (read 2026-11-24):** Yazio's evening reminder only "If you haven't logged anything during the day"
  ([Yazio help](https://help.yazio.com/hc/en-us/articles/4406890595601-Set-Up-Reminders-in-Yazio)); Simple's end-of-day
  summary push ([Simple help](https://simplefastingapp.zendesk.com/hc/en-us/articles/4408491733521-How-to-configure-your-notifications)).
- **Not editable yet:** which gaps exist (meals and weight only).
