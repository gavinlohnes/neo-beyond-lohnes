# SUIT-ALIVE — the Suit and the Cave (campaign)

- **Authority:** Gavin, 2026-10-28. "Go suit prototype", then refinement to the Suit & Cave
  direction ("Build the suit and cave"; the original red bat mark: "I'm good with the symbol").
  "go S2" approves slice S2 only. Each later slice needs its own approval; rulings listed in the
  build plan (`prototype/suit-alive/build-plan.html`) are still open.
- **Builder:** Claude Code. Codex keeps SUIT-001/002, Personal Understanding and memory; S7 and S8
  are coordinated with them.
- **Prototype:** `prototype/suit-alive/index.html` (sample data, interaction reference only) and
  the options board and build plan beside it.

## S2 — the cave, Vitals (this PR)

- **Lane:** FEATURE, read-only. TODAY is unchanged.
- **Built:** in MORE → SYSTEMS, the sleep, protein and water rows and the check-in row open the
  cave in place: one reading in depth with today's value, the last 14 finished lived days against
  your usual range, where you usually are at today's place in the run, the records behind the
  number, what it feeds (decides advice or informational) and its source. Full history stays one
  tap further; bodyweight still opens its history directly. Focus returns to the row you came from.
- **Rules:** the usual range is the personal-baselines rule (middle half of the same kind of day,
  at least 10 days, otherwise "still learning"). Protein and water are running totals: shown, never
  judged against a full-day range (pace is S5). Missing readings stay missing. No score, no
  combined number, no Engine input, nothing stored. Red is not used; amber marks off-normal.
- **REUSE:** SYSTEMS readout query, Whole Picture rows, personal-baselines quantiles, rotation run
  positions, metric history. **OWN:** `application/caveVitals.ts` (composition and copy).
  **BUILD FROM SCRATCH:** none.
- **Excluded:** the bat mark (S1; the logo ruling is now recorded as SUIT-ALIVE-001), TODAY changes, comms, route,
  pace, vision modes.

## The bat ruling (recorded 2026-10-28)

Gavin approved the original red bat mark. [SUIT-ALIVE-001](../UX_DECISIONS.md) records it: the header
emblem, the cave heading and the cold start only. EMBLEM-002 stays the app icon. Building it is S1,
which needs its own go. The one open choice for S1 is which geometry: the prototype's mark or the
EMBLEM-002 master.

## S1 — the bat mark

- **Authority:** Gavin, 2026-10-28: "go S1 with the prototype bat". Ruling: SUIT-ALIVE-001.
- **Lane:** presentation only. No Engine, schema, event or navigation change.
- **Built:** the original red bat (`#D0141B`) replaces the diamond glyph as the header emblem on every
  primary screen. It keeps the emblem's jobs: tap goes to TODAY, long-press toggles stealth, same
  accessible name, 44px target. It also sits beside THE CAVE heading, and replaces the app-icon
  PNG on the cold start, where it opens from its center. The cold start never shows under reduced
  motion, as before. Stealth keeps its own glyph, and the app icon (EMBLEM-002) is unchanged.
- **One source:** `docs/brand/suit-mark/suit-mark.svg`. `src/ui/components/BatMark.tsx` draws it, and
  `tests/ui/batMark.test.ts` keeps the geometry and color identical and the uses to the three places.
- **REUSE:** the prototype's `#bat` path and its reveal, and the existing header emblem button.
  **OWN:** `BatMark.tsx`. **BUILD FROM SCRATCH:** none.

## S3 — comms and Tonight

- **Authority:** Gavin, 2026-10-28: "go S3". Ruling: SUIT-ALIVE-002. **Lane:** PROTECTED, because it
  changes how recommendation authority is presented. No Engine, schema, event or priority change.
- **Built:**
  - **TODAY:** the comms line closes the mode hero. It names the readings furthest from your own
    normal, or says everything is inside it, or that it is still learning. It never names the call.
    Tapping it opens the cave on TONIGHT.
  - **The cave:** now has two views, TONIGHT and VITALS. TONIGHT shows:
    - the call as made, your answer, and the plain reasoning from its trace;
    - readings outside your usual range, furthest first, each opening that vital;
    - what holds steady and what is still learning;
    - overdue commitments.
- **Rules:** comms is information, not a second recommendation. The order is distance from your own
  range, never a score, and it is never shown. Missing readings stay missing. Today's running totals
  are not judged; the last finished day's are.
- **REUSE:**
  - S2's `caveUsual`;
  - `explainRecommendation` and the recommendation copy (the trace, never recomputed);
  - `classifyObligation` for overdue;
  - the SYSTEMS readout and Whole Picture;
  - the mode hero's existing slot.
- **OWN:** `application/caveTonight.ts` (composition and the comms wording), `CaveTonight.tsx`,
  `CommsLine.tsx`. **BUILD FROM SCRATCH:** none.
- **Review:** Protected; independent review per DEV-FLOW-002 unless Gavin waives it.

## S4 — the route

- **Authority:** Gavin, 2026-10-28: "go S4". Ruling: SUIT-ALIVE-003. **Lane:** PROTECTED, because it
  changes TODAY's primary layout. No Engine, schema or event change.
- **Built:** `application/caveRoute.ts` builds the lived day's route:
  - **Fixed:** the scheduled shift and the rollover.
  - **Usual:** sleep and wake, the median of at least 3 Garmin-timed days of the same kind.
  - **Prep:** food and bottle, on the shift point.

  On TODAY, ROUTE shows the next three points above COMMS, and COMMS says a point for half
  an hour after it passes. The cave gains ROUTE.
- **REUSE:**
  - `livedDayShiftWindow` and `nextRolloverBoundaryAfter`;
  - Whole Picture `sleepWindow`, with `RUN_MEAN_FLOOR`;
  - `getPreparation` and `getWorkPeriodEnded`;
  - S3's hero band and cave navigation.
- **OWN:** the route composition and callout wording, plus `SuitLines.tsx` (which replaces S3's
  `CommsLine.tsx`) and `CaveRoute.tsx`. **BUILD FROM SCRATCH:** none.
- **Deferred:** a break time on the schedule (schema change; needs its own ruling), and "last
  coffee" (no caffeine data).

## S5 — pace and the dark cockpit

- **Authority:** Gavin, 2026-10-28: "go S5". Ruling: SUIT-ALIVE-004. **Lane:** PROTECTED, because it
  changes how TODAY's primary readings look. No Engine, schema or event change.
- **Built:**
  - `application/pace.ts`: your usual protein and water by this minute of the lived day, from the
    timestamped, corrected logs of your last 28 same-kind days, by the personal-baselines rule.
  - **TODAY:** protein and water tiles show BEHIND PACE in amber when behind. Readings inside your
    normal dim.
  - **The cave:** VITALS and TONIGHT judge today's totals by pace.
- **REUSE:**
  - `getHydrationEntries`, `getProteinEntries` and `getMealEntries` (corrected amounts);
  - Whole Picture rows for which days count;
  - the personal-baselines quantiles and `MIN_BASELINE_DAYS`;
  - the existing "unusual" tile style.
- **OWN:** `pace.ts` and the tile states. **BUILD FROM SCRATCH:** none.

## S6 — preflight and after-action

- **Authority:** Gavin, 2026-10-28: "go S6 and make it bigger more more impressive and badass".
  Ruling: SUIT-ALIVE-005. **Lane:** FEATURE, plus the TODAY band that swaps the route line before and
  after a shift. No Engine, schema or event change; writes only through the existing preparation and
  handoff-read commands.
- **Built:**
  - `application/caveBrief.ts`: the poll and the after-action rows, from the route, check-in, meals,
    protein, water, pace, preparation, handoff, MEMORY-001 and debriefs.
  - The cave's BRIEF view: T-minus, the sequenced poll, inline actions, intel, and planned beside
    actual.
  - The TODAY band.
- **REUSE:**
  - S4's route and S5's pace;
  - `getPreparation` and `recordPreparation`;
  - `getShiftHandoffState` and `markShiftHandoffRead`;
  - `getMemoryFacts`;
  - LOOP-002's debrief journal entries;
  - the existing entries queries.
- **OWN:** the poll and report composition and wording, and `CaveBrief.tsx`.
  **BUILD FROM SCRATCH:** none.
