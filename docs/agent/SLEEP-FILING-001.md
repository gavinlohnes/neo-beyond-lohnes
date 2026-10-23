# SLEEP-FILING-001 — count real sleep, not quiet shifts or lost nights

- **Authority (Protected: Garmin fill-in semantics):** Gavin, 2026-10-23: "go sleep filing then. Id like
  it to be on when I'm actually working. I don't keep the same sleep schedule all of the time." Found
  in his backup: two Oct 21 Garmin sleeps were never counted (no lived day covered their start), and
  one of them was 21:47–03:24 at work in central, which a watch reads as sleep.
- **Builder / branch:** Claude Code; `claude/sleep-filing` from master after #288.
- **REUSE:** GARMIN-003's `assignGarminSleep`/`applyGarminSleep` fill-in, withdrawal and owner-precedence
  rules; `livedDayShiftWindow` and the saved schedule; lived days' recorded work context; the Health
  history GARMIN sleep list.
- **OWN:** the filing rules for a night worker — shift overlap and the day-it-ends-in fallback.
- **BUILD FROM SCRATCH:** `classifyGarminSleep` (pure) and `getUnfiledGarminSleep` (read).
- **Rules:** a Garmin sleep overlapping a *worked* shift (a lived day recorded as WORK, with the shift
  the schedule gives that day) by 60+ minutes is not filed; days off, naps and sleep at any time outside
  a worked shift file as before. A sleep starting when no lived day was open is filed under the day it
  ends in; with neither, it isn't filed. The owner's explicit day choice in the import preview always
  wins. Health history's GARMIN SLEEP list says when and why a sleep isn't counted.
- **Effect on existing records:** on the next import, an untouched Garmin-filled entry that now falls in
  a worked shift is withdrawn by the existing withdrawal rule; entries you corrected or replaced are
  never touched. Garmin evidence is never deleted.
- **Excluded:** asking with a button (log it in BODY → Sleep instead), actual work-ended times (the
  scheduled shift is used), shifts on days without a schedule window, Engine, schema.
- **Acceptance:** pure and end-to-end tests (shift, gap, day off, explicit choice, threshold), browser
  test of the notes, full verify, independent exact-head review, Gavin's merge.
