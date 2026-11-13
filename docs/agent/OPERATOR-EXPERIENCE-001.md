# OPERATOR-EXPERIENCE-001 — a unified daily operating system (slice 1: NOW · NEXT · WEEK AHEAD on TODAY)

- **Authorization:** Gavin, 2026-11-13 ("OPERATOR-EXPERIENCE-001 — Transform BEYOND Into a Unified Daily Operating
  System").
- **Lane:** Feature.
  - It adds a NEXT line and a WEEK AHEAD disclosure inside TODAY's existing operating-state band.
  - No change to TODAY/TRAIN/BODY/MORE primary IA, the Engine, the schema, commands or recommendation authority.
- **Builder / branch:** Claude Code; `ccr-88f5c085-operator-experience` from `bd4aae57` (#500 merged).
- **Open PRs:** #482 and #473 don't overlap.
- **Leverage gate:**
  - **REUSE:** Life State's band and WHY; Week Ahead's days and the shared resolver (RECORDED > CONFIRMED >
    PREDICTED > UNKNOWN); the whole `WeekAheadView` with its confirm, move and cancel flows, each confirm-first.
  - **OWN:** `application/ahead.ts`, a pure "next switch between work and off" reading, and its placement.
  - **BUILD FROM SCRATCH:** none.

## Problems this slice solves (verified in code and tests)

1. **TODAY says what today is, but not what's coming.** "When is my next shift / day off?" had no answer on TODAY.
   The next switch appeared only in Life State's trailing "Back on Mon", and only on days off. With a confirmed change
   it was never labelled.
2. **Confirmed changes were three screens from TODAY.** Week Ahead, where you confirm, move or cancel them, lives at
   MORE → WEEKLY → SHOW WEEK AHEAD. TODAY gave no sign that a change existed.

## Information hierarchy (FIELD: surface, operate, inspect)

The band now reads as follows:

| Depth | Content |
|---|---|
| Surface, NOW | `WORK RUN Shift 1 of 2. …` (unchanged) |
| Surface, NEXT | `NEXT Next day off: Sat, Nov 21 · forecast · 1 confirmed change ahead` |
| Inspect | `WHY WORK RUN`, which also says where NEXT came from (forecast, not a record, or a confirmed change) |
| Operate | `WEEK AHEAD · 1 CONFIRMED` opens the week in place, with its confirmed-changes list, What-If and confirm, move and cancel. Each write still goes through preview and CONFIRM. NEXT and Life State refresh after a change. |

Rules:

- **Facts and forecasts:** "forecast" and "confirmed change" are always named.
- **Unknown:** with no saved schedule, the line says "work or off not known", never a guess.
- **16:30:** only lived days that haven't started count. At 09:00 tonight's shift is still "next".
- **Mobile:** one line plus two quiet text controls; no new card. The week renders only while open. Checked at 360 px
  with axe.

## Acceptance (automated; no field test claimed)

`tests/ahead.test.ts` and `tests/browser/OperatorExperience001.test.tsx` cover:

1. the lived-day context, NOW and NEXT;
2. one added line;
3. forecast or confirmed change is labelled, and unknown is never guessed;
4. a contextual action: WEEK AHEAD in place;
5. confirm-first writes, and opening writes nothing;
6. 16:30;
7. 360 px;
8. axe;
9. no new authority;
10. fewer steps to reach Week Ahead from TODAY: 1 tap instead of 3 screens.

## Roadmap (later slices, each its own PR)

1. **Alfred explains TODAY.** Give Alfred's Operator Context the same NOW/NEXT readings and their WHY, so "why is
   TODAY showing this?" gets the deterministic answer. Read-side.
2. **Changed since you last looked.** A per-device note of new records since the last open of TODAY (Garmin sync, a
   confirmed change, a check-in). Needs a decision on where "last looked" lives; local only.
3. **Contextual actions on NEXT.** For example, on a FLIP day, "plan sleep before the shift" via the circadian plan's
   existing entry point. Reuse only; no new recommendation authority.
4. **Training on NEXT.** The suggested workout (Week Ahead's `suggestedTemplate`) beside the next day off. Labelled
   a suggestion; the Engine's priority unchanged.

## Slice 3 — changed since you last looked (Gavin, 2026-11-13: "Agreed", device-local)

Branch `ccr-88f5c085-since-last-look`.

- **What it does:** TODAY keeps a small snapshot of what its band showed, on this device only
  (`localStorage`, `beyond.today.lastLook.v1`). It isn't in the database, a backup or Alfred. On the next visit,
  one quiet line leads the band, e.g. `SINCE 20:00 Confirmed changes: 0 → 1`, or
  `SINCE WED 09:05 New advice: … · FLIP → WORK RUN · Garmin sleep synced: 6h 35m`.
- **What counts as a change:** at most four items, most decision-relevant first:
  - new Engine advice (named, not re-ranked);
  - a state change;
  - a confirmed-change count, or else a changed NEXT;
  - a new Garmin sleep.
- **What doesn't:** a field that hasn't loaded is never a change. The visit's own taps aren't reported back; the
  baseline is the first value seen. With nothing changed, or no earlier look, there is no line.
- **Code:** `application/sinceLastLook.ts` (pure) and `ui/screens/today/lastLookStore.ts`.
- **Lane:** Feature. No schema, Engine or IA change.
