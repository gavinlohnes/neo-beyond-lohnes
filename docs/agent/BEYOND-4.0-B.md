# BEYOND 4.0-b — The coach brain (release brief)

- **Authority:** [master brief](BEYOND-4.0.md), decisions 1 (the Engine learns) and 2 (coaching; Gavin keeps the
  final say). Gavin, 2026-11-15: "Start 4.0-B"; slice 1's rule: "I approve the [deload] rule".
- **Builder:** Claude Code. **Risk lane: Protected** (Engine recommendation changes): independent exact-head review,
  green CI, Gavin merges. Each later slice's exact rule goes to Gavin before it's built.
- **Starting commit:** master `cb1c780a`.

## What already exists (leverage gate, checked in code first)

| Coach piece | Already in BEYOND |
|---|---|
| Adaptive calories | Weekly calorie proposal (TARGET-PROPOSAL-001/002), SAVE or KEEP |
| Personal experiments | LOOP "Try" experiments (`application/tryExperiment.ts`) and DELTA's offers to test a tag |
| Stall detection | Read-only stall finding in Weekly (`engine/findings.ts`) |
| Your usual ranges | Personal baselines (`engine/personalBaselines.ts`); sleep owed in the week forecast |
| Short sleep → lighter training | SLEEP-ENGINE-001: two short main sleeps turn STANDARD into REDUCED |
| Progression | The locked INCREASE / HOLD / REDUCE rule plus RE-ENTRY (`engine/progression.ts`) |

So 4.0-b turns existing evidence into coaching rather than building a new brain.

## Slices

1. **DELOAD after a steady stall** (this PR). A lift's last 4 sessions in the past 28 days set no record, all at
   about the same weight → one lighter session at ~90%, rounded down to the lift's increment. Never replaces
   INCREASE or RE-ENTRY; never applied. The stall test is shared with the finding (`engine/stall.ts`).
2. **One coach card at a time:** the most useful current suggestion from the pieces above, with its evidence,
   ACCEPT or SKIP. Composition of recommendation authority, so Protected; the ranking goes to Gavin first.
3. **Recovery against training load:** a weekly read of training volume against sleep and resting-heart-rate
   baselines, suggesting a lighter week when they diverge. Rule and thresholds to Gavin first.
4. **End-of-run debrief with one suggestion**, building on END-OF-RUN-001.

## Exclusions

No new schema, record kind, dependency or service. Nothing applies itself; every learned rule is deterministic,
shows its evidence and abstains when thin. Garmin stays watch-only.

## Leverage gate (slice 1)

- **REUSE:** the stall finding's test and the PR rule (`findSessionRecords`); RE-ENTRY's ~90% rounding.
- **OWN:** the DELOAD mapping onto BEYOND's progression rule.
- **BUILD FROM SCRATCH:** none.
