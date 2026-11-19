# LIVED-DAY-ORIENT-001 — design the opening of a lived day

**Lane:** Protected design/documentation only; future TODAY composition is Protected

**Owner authorization:** Gavin, 2026-11-19: “Then I recommend a documentation/design-only objective
for LIVED-DAY-ORIENT-001 before we authorize implementation.”

**Starting commit:** `b00fa77687d15b7557b04e3e0326aa511fe0906c` (merged PR #586)

**Builder:** Codex

**Branch:** `codex/lived-day-orient-design`

**Active PR:** pending

## Outcome

Design one calm, optional opening orientation for the lived day. Define its information contract,
workday/day-off/recovery/sparse variants, interaction and attention rules, current-primitive reuse,
Delta/Engine boundary, phone-first composition, test scenarios, and a bounded implementation proposal
for Gavin to review.

Operator benefit: opening BEYOND should answer how Gavin slept, how he feels, what kind of day this is,
what is important or unusual, what deserves attention before the next fixed event, and what need not
occupy him—without making him navigate the whole system or accept an AI-generated plan.

## Authorized scope

- Research proven patterns for readiness explanation, reviewed daily planning, low-burden check-ins,
  and shift-aware fatigue.
- Inspect existing BEYOND briefing, TODAY, sleep, work context, check-in, commitments, preparation,
  training, capture, source, and navigation primitives.
- Produce the canonical experience design and text wireframes.
- Recommend exact implementation scope/exclusions, risk, reuse, acceptance, and field questions.
- Update the roadmap and checkpoint where current truth warrants it, then open a documentation PR.

## Exclusions

- No application implementation, production mockup, runtime UI/CSS, rename, schema/event, Engine,
  recommendation-priority, notification, provider, dependency, automation, or navigation change.
- No new mental-health data, fasting model, evening closure, Shift Down redesign, or full Day-Off plan.
- No Google Drive changes and no changes to PR #584 or draft PR #473.
- This design does not activate its proposed build; Gavin separately approves implementation.

## Acceptance evidence

- Design covers direct START DAY, already-started day, workday, day off, recovery, unknown context,
  sparse/unavailable data, confirmed difficult capacity, and an active operation.
- Every proposed line names an existing authoritative source or is explicitly deferred.
- Engine guidance remains singular and unchanged; Delta/Alfred cannot create a competing answer.
- Text wireframes show calm phone hierarchy and a short exit.
- Reuse and build-from-scratch dispositions are explicit.
- Local links and diff hygiene pass; independent exact-head review checks authority boundaries.

## Reuse disposition

- **REUSE:** TODAY, START DAY, Briefing Preview, `todayPicture`, Life State, schedule/work context,
  Garmin/measured sleep, check-in, Engine/draft guidance, `ahead`, obligations/Week Planner, PREP,
  routines, TRAIN home, CAPTURE, sections, source disclosures, and sheet/foundation patterns.
- **OWN:** the Project Grayson selection and composition of those truths into Gavin's first lived-day
  orientation.
- **BUILD FROM SCRATCH:** none expected; the implementation brief must verify.

