# GRAYSON-TRAIN-REST — buzz when rest ends (owner go, 2026-11-24)

Gavin merged the [brief](../agent/GRAYSON-TRAIN-REST-001.md) (#644), which approves these defaults.

- **On by default:** one buzz when rest reaches zero, Short `[200, 100, 200]` ms (Long `[400, 150, 400]`), distinct
  from the 10–35 ms save pulses.
- **Once per rest:** skipped rests never buzz; +15 s after zero buzzes once at the new end; a rest that ended while
  TRAIN was closed or the screen off (seen more than ~3 s late) doesn't buzz late.
- **Live only:** TRAIN open and visible. No background timer, notification, sound or locked-phone buzz (B3).
- **His to change:** "Buzz when rest ends" on the expanded rest widget and in MORE → Settings → Reminders, with
  Short/Long in MORE. `beyond:restBuzzPreference`, travelling with the backup.
- **Reduced motion:** the buzz still fires; the one-time REST COMPLETE highlight doesn't animate.
- **Quiet PRs:** no buzz or new cue on a personal record.
