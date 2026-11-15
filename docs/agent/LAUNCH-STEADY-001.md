# LAUNCH-STEADY-001 — no flash on first launch

- **Authorization:** Gavin, 2026-11-15: "when beyond first launch it kind of flashes between screens. I'd like that
  fixed", then "Approved." for the plan: launch fix, then TIMELINE-EDIT-001, then ALFRED-FIX-001.
- **Builder:** Claude Code. Branch `ccr-88f5c085-launch-steady`, from master `1fed57c8`. Routine lane; Gavin merges.
- **Cause:** TODAY rendered with `day = null` before its first read settled, so it drew "Mode not set", START DAY and
  NOT LOGGED tiles, then jumped to the real mode (Gavin's screenshot at 18:49 shows that first frame).
- **Fix:** a `dayRead` flag. Until the first read settles (or fails), TODAY shows only its header and a quiet "Reading
  your day…" frame. A failed first read ends the frame, so the screen behaves as before. No data, Engine or copy change
  to the real states.
- **Also:** "BRIEFFree · from your records" ran together; the hint now sits 10 px after its label.
- **Not BEYOND:** the round photo with a chat badge over the title is Android's chat bubble from a messaging app; it
  floats over every app and is turned off in that app's notification settings.
- **Leverage gate.** REUSE: TODAY's existing refresh ownership and header. OWN: the reading frame. BUILD FROM SCRATCH:
  none.
- **Tests:** `tests/browser/LaunchSteady001.test.tsx` watches every DOM change from before the first render; with a day
  under way it never sees "Mode not set", START DAY or "Start your" (it does without the fix). With no day, START DAY
  still appears. The brief's hint has its gap.
