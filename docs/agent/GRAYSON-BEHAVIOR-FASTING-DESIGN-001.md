# GRAYSON-BEHAVIOR-FASTING-DESIGN-001 — Daily Signals and Eating Window design

- **Owner authorization:** Gavin, 2026-11-20: after supplying lifestyle-logging and nutrition-app references,
  approved a Protected design-and-evidence objective for Daily Signals, alcohol integration and a highly
  customizable fasting programme: “I approve. Let's get working.”
- **Lane:** PROTECTED documentation/design. The work defines proposed health behavior, safety, future event and
  recommendation boundaries. It authorizes no runtime implementation.
- **Starting commit:** `e7482a459d9b596007577c35768401129fe1c976` (master after PR #600).
- **Builder:** Codex. **Branch:** `codex/grayson-behavior-fasting-design`.
  **Active PR:** [#601](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/601).
- **Operator benefit:** make alcohol reduction and time-restricted eating easy to record and useful to evaluate
  against Gavin's real shifts, protein, training, sleep and mood—without guilt, duration contests or invented
  physiology.
- **Scope:** audit existing Quit, meal, lived-day, experiment and Whole Picture primitives; evaluate authoritative
  alcohol and fasting evidence; define the Daily Signals model; design a shift-aware Eating Window programme,
  evidence timeline, safeguards, corrections and phone flows; recommend bounded implementation slices.
- **Exclusions:** no product code, prototype, schema, event, Engine, recommendation, notification, provider,
  dependency, navigation, runtime identity, Google Drive or concurrent-PR change. No diagnosis, detox protocol,
  calorie-target change, automatic fasting prescription or claim that elapsed time proves a metabolic state.
- **REUSE:** current Quit tracker, check-in urge, meals and timestamps, lived-day/work context, training and protein
  records, Whole Picture, personal experiments, correction/undo conventions and Quiet Command composition; proven
  low-friction donor patterns from the owner-supplied references.
- **OWN:** GRAYSON's mapping across Gavin's rotating night schedule, abstinence mission, strength goals, evidence
  hierarchy and Delta authority.
- **BUILD FROM SCRATCH:** none in this objective; future implementation should add only the domain semantics that
  existing events cannot represent honestly.
- **Acceptance evidence:** canonical design names source strength and uncertainty; repository truth and preservation
  map; work/off/recovery/flip scenarios; phone wireframes; safety and failure behavior; proposed data provenance;
  acceptance scenarios; ranked bounded build sequence and one next objective. Markdown links and diff hygiene pass;
  independent exact-head review and Gavin's merge approval are required.
