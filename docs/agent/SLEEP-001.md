# SLEEP-001 — main sleep is one tap after a shift

- **Authority:** Gavin, 2026-10-29: "merge 339 and go sleep", after the field study found main
  sleep logged on 23 of 71 Garmin nights and WORK ENDED tapped 8 times. Recorded in
  `docs/UX_DECISIONS.md` (SLEEP-001).
- **Builder / lane:** Claude Code; Protected (it changes the SLEEP DRAFT rule and TODAY's sleep
  prompt), within the owner's go. Branch `ccr-0be4f40f-16m0ja`.

## Scope

1. `getSleepDraftEvidence` falls back to the lived day's scheduled shift end when there is no
   WORK ENDED or Shift Down, once it has passed and the day isn't recorded as OFF.
2. The draft reads as a window ("Slept 06:00 → 13:40?") and is the "Did you sleep?" card after
   13:00, so one tap logs it.
3. Out of scope: Garmin filing (GARMIN-003 already fills main sleep on import).

## Leverage

- **REUSE:** the existing SLEEP DRAFT (`engine/sleepDraft.ts`), `livedDayShiftWindow`, the
  WHOOP / Oura pattern of proposing last night's window for one-tap confirmation.
- **OWN:** the night-shift anchor (scheduled shift end) and where the draft appears.
- **BUILD FROM SCRATCH:** none.

## Tests

`tests/engine/sleepDraft.test.ts`, `tests/integration/sleepDraft.test.ts`,
`tests/browser/SleepDraft.test.tsx` (including a one-tap log from the shift end), and
`tests/browser/Polish001.test.tsx`.
