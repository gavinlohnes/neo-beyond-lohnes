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
2. **One coach card at a time** (Gavin, 2026-11-15: "I approve it in your recommended order"). On TODAY, under the
   Engine's recommendation and never above it, one suggestion with its evidence; nothing when nothing qualifies.
   Order: (1) today's lift advice on a training day (DELOAD, RE-ENTRY, REDUCE); (2) a finished experiment waiting
   for your verdict; (3) the weekly calorie proposal when it proposes a change; (4) DELTA's offer to test
   something. ACCEPT is that feature's existing action; SKIP hides it until its evidence changes (this phone's
   browser only) and the next takes its place. Protected.
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

## Builder recovery

Gavin explicitly asked Codex to pick up Claude's unfinished work. Codex resumes the existing deload branch/PR from `c99f03c0`, integrates fresh master `4275e263` without source conflicts, and completes verification plus independent exact-head Protected review. Original CI was green; no review PASS was recorded at inspection. No rule/ranking expansion or next slice is part of this takeover. Final evidence is maintained on the existing PR; Gavin alone merges.
