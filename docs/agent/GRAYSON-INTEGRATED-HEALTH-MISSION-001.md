# GRAYSON-INTEGRATED-HEALTH-MISSION-001 - connected health mission design

- **Authorization / lane:** Gavin, 2026-11-20; **Protected documentation/design-only**.
- **Starting commit:** `f81f1ed66c35c0cd0f02dbf7cf02474bd58fbc46` (master after PR #603).
- **Builder:** Codex.
- **Branch:** `codex/grayson-integrated-health-mission-001`.
- **Active PR:** [#604](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/604).

## Operator benefit

Turn Gavin’s health, weight, strength, performance, food and recovery goals into one guided plan he
can understand and follow, with realistic gym/home/minimum variants and evidence-bounded adaptation.
He should not need to design a training system or interpret disconnected metrics himself.

## Scope

- Establish current BEYOND truth across TRAIN, Body, food, sleep/recovery, Eating Window, Missions
  and Review; preserve the BEYOND foundation and locked TRAIN rules.
- Design phased weight loss with a required review at 170 rather than an assumed push toward 150.
- Define a default three-session full-body Planet Fitness plan with bounded emphasis areas, progression,
  recovery, equipment uncertainty and bodyweight home/minimum fallbacks.
- Integrate the owner-supplied physical standards with protocol/provenance distinctions.
- Define guided setup, Delta language, phone journeys, evidence floors and outcome-review rules.
- Research current primary health/training evidence plus commercial and legally reusable OSS donors.
- Reconcile the Guided Operating Loop, Eating Window, campaign plan, capability map and concurrent
  workout-metric PR #584 without changing it.
- Recommend a ranked sequence and one bounded first implementation objective.

Canonical design: [`GRAYSON_INTEGRATED_HEALTH_MISSION.md`](../GRAYSON_INTEGRATED_HEALTH_MISSION.md).

## Exclusions

No product code, runtime behavior, navigation, prototype, Engine/recommendation priority, command or
event semantics, schema/migration, provider/dependency, treatment or medical advice, private health
record, Google Drive, concurrent PR, merge or implementation authorization. Exact medication/dose,
raw backup data and personal symptom history stay outside source control.

## Leverage disposition

- **REUSE:** current TRAIN templates/custom templates/programme/live workout/progression/history,
  Body, targets, Food Week, Eating Window, lived context, Missions, Review and existing donor rulings.
- **OWN:** the connected health phase; movement/emphasis balance; performance-standard provenance;
  reality variants; cross-domain review and Delta plan-first language.
- **BUILD FROM SCRATCH:** none; this objective authorizes design only.

## Acceptance evidence

- Repository claims link to current code/decisions and distinguish existing from proposed behavior.
- Training design is balanced, understandable, equipment-aware and compatible with locked progression.
- Normal, reduced, home, minimum, recovery, difficult-day and sparse-data journeys are specified.
- Weight, food, sleep, performance and treatment context remain evidence-bounded and clinician-led.
- The physical-standard chart’s current/future age categories and test-specific limitations are
  accurately represented without committing the external artifact.
- Donor patterns, licenses, rejection/defer rulings and sources are explicit.
- Campaign/capability/checkpoint reconciliation changes only where warranted.
- Markdown links, diff hygiene, expected Protected classification, docs-only CI and independent
  exact-head review pass before Gavin’s merge decision.

## Next action

Complete repository reconciliation and documentation checks, open the PR, obtain green required CI
and independent exact-head review, then return to Gavin. Do not implement
`GRAYSON-TRAIN-PLAN-DRAFT-001` or any later slice.
