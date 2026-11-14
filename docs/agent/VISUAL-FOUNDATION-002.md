# VISUAL-FOUNDATION-002 — TRAIN's first view on the foundation (slice 2)

- **Authorization:** Gavin, 2026-11-14, after the slice plan: "Start. Keep last session." Text size: "Amend the rule".
- **Lane:** Feature, with an independent review because the suggested workout (a recommendation) is reframed. No Engine,
  schema, dependency, command or navigation change.
- **Builder:** Claude Code. **Starting commit:** `5a7338bd`. **Branch:** `ccr-88f5c085-train-foundation`.

## Scope

- **Command bar:** it replaces TRAIN-HOME-001's hero with TRAIN // STRENGTH, the date and the day's context. The
  context comes from BODY's rule, now shared as `application/dayContext.ts`; BODY is unchanged.
  - The purpose line stays, and YOUR TRAINING. stays as a screen-reader heading.
  - **No bar action:** START WORKOUT stays the only start, on the first phone screen.
- **Suggested workout:** same frame (CommandSurface), suggestion, wording, CHANGE, WHY and START. The counts are
  numerals.
- **Numbers**, under the suggested workout (`application/trainHomeQueries.ts`, pure `application/trainHome.ts`):
  - **LAST SESSION:** working sets, then template, status, duration and date. Its › opens TRAINING SUMMARY.
  - **THIS WEEK:** sessions and sets by lived-day week (Monday to Sunday), and eight weeks as a sparkline. Its › opens
    HISTORY.
  - **NEWEST RECORD:** weight × reps, the lift, the kind and the date. Its › opens RECORDS.
  - **What counts:** finished (completed or partial) strength sessions with a working set. With nothing recorded, the
    panel says "No sessions yet" or "No records yet".
- **Switcher:** mono capitals, with the chosen view underlined in red.
- **Accessibility rule amended** (Gavin): sentences, buttons and inputs are 16 px or larger. Short mono-capital labels,
  source tags and chart ticks may be smaller, never under 10 px. TRAIN's sentences are 16 px.
- **Leftovers from #515:**
  - habits created in the same millisecond now keep a fixed order (name, then id);
  - the UX_DECISIONS wording notes that exception.
- **Excluded:**
  - the live workout, set logging, rest and finishing;
  - the history and records pages;
  - other screens;
  - BODY's sub-16 px captions and buttons, which need Gavin's go.

**Leverage gate:**
- **REUSE:**
  - the foundation primitives (VISUAL-FOUNDATION-001);
  - TRAIN's existing queries (`getLastStrengthSession`, `getTrainingHistory`, `getAllRecords`);
  - BODY's day-context rule;
  - Habits' Monday-week convention.
- **OWN:** TRAIN's mapping of its records to panels.
- **BUILD FROM SCRATCH:** none.

## Verification

- typecheck, the architecture check, the node and browser suites and the build;
- `tests/trainHome.test.ts`: weeks, the lived-day boundary, the day context and the last-session line;
- `tests/browser/VisualFoundation002.test.tsx`:
  - real seeded sessions, values and links;
  - the empty state;
  - START WORKOUT above the navigation at 360 × 780;
  - no overlap, spill or undersized text at 320, 360, 412, 768 and 1024 px;
  - axe;
- `TrainHome` and `TrainScreen` are updated for the bar and the new LAST SESSION line.

## Next (each needs Gavin's go)

- TODAY's panels on the foundation, with the skyline as the shared horizon.
- MORE and the cave's headers on the command bar.
- BODY's captions and buttons brought up to 16 px.
