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

Independent recovery review blocked the integrated head: DELOAD combined a cross-template stall with an older matching-slot load, and substituted weights could enter that load. Repair: derive DELOAD's load from the latest top set in its existing canonical stall evidence (already excludes warmups, skipped/undone sets and substitutions), keeping ordinary slot-scoped progression and RE-ENTRY unchanged. Added pure and canonical command/query regressions, including cross-variant repeat suppression. No threshold or owner-rule expansion. Renew independent exact-head review and CI after the repair.

## Slice 2 delivery — one coach card

Builder Codex, owner: “Let's get back to work” after slice 1 merged. Original explicit approval of slice 2 and its order above remains the authority. Start fresh master `ba6df574`; branch `codex/4b-coach-card`. Protected: independent exact-head review, required CI, Gavin merges.

Read-only composition selects today's saved programme/active workout or explicitly planned training, then completed experiments awaiting verdict, existing changed calorie proposals, then DELTA's test offer. One optional card sits below canonical Engine guidance, suppressed during an active operation. REVIEW SUGGESTION opens the existing TRAIN, Journal, weekly check-in or DELTA confirmation flow; it does not accept advice, save a target or start a test itself. SKIP stores only a device-local evidence fingerprint, advances to the next eligible card and remains until evidence changes. Empty stays quiet; read/storage failures are explicit. No new rule, Engine arbitration, record/schema, provider, dependency or automatic save. Existing feature screens retain their full evidence, limits and canonical actions.

REUSE: programme resolver, progression query, LOOP experiments, weekly calorie proposal, DELTA, existing navigation/confirmation surfaces and native controls. OWN: approved ordering, evidence-bound local skip and one quiet optional surface. BUILD FROM SCRATCH: none beyond this composition. Verification: rank/read-only query, one-card/skip/reload/changed evidence/error recovery and actual TODAY placement/navigation; existing TODAY/App/browser regressions, architecture/type/build, full CI and independent review. Final results in the PR handoff.

## Slice 3a — weekly training and recovery evidence

Owner, after merging slice 2: “Make whatever decision you think is best. Merged and ready to work. Go.” Builder Codex chooses a bounded read-only first part of slice 3, preserving the brief's Garmin watch-only exclusion rather than introducing a new Garmin-driven recommendation rule. Starting master `2bbceb73`; branch `codex/4b-recovery-comparison`. Feature lane; independent review and full CI before Gavin's merge. This does not complete the later lighter-week coaching rule or authorize new thresholds/Engine inputs.

Inside the existing Weekly TRAINING section, an optional comparison shows two consecutive seven-finished-lived-period windows: logged weighted working-set volume and counts, measured Garmin sleep duration and resting heart rate with sample counts, and the existing outside-usual-range readings with their earlier baseline counts. Reuse exact measured-period boundaries and existing source rules. No-data is unknown, not zero or rest; no score, diagnosis, causal claim, new alert, new recommendation or plan change. Asleep/time-in-bed fallback and weighted/bodyweight exclusions are explicit. Current partial period excluded. Failure shows retry, never a fictitious empty week. No TODAY ranking, schema, dependency/provider, health import, Engine or write changes.

REUSE: canonical Strength Review records (finished sessions, effective working sets), MeasuredSnapshot periods and existing unusual-range interpretation; Weekly disclosure and native table. OWN: read-only window composition and presentation. BUILD FROM SCRATCH: none beyond BEYOND mapping.

Acceptance: boundaries/current-period exclusion, partial/missing measurements and sample counts, no read-side writes, inherited canonical training exclusions; 320px and accessibility, read failure/retry, existing Weekly regressions, type/architecture/build, full CI and independent review. Final results live in the PR handoff; never merge or start another slice automatically.
