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
- **Excluded:** the bat mark (S1, needs the logo ruling recorded), TODAY changes, comms, route,
  pace, vision modes.
