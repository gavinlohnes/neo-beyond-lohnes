# GRAYSON Integrated Health Mission

Status: **OWNER-AUTHORIZED DESIGN CANDIDATE, NOT IMPLEMENTATION** - objective
`GRAYSON-INTEGRATED-HEALTH-MISSION-001`, 2026-11-20. This document designs one connected health
mission from current BEYOND truth. It authorizes no product code, navigation, Engine, command/event,
schema, provider, dependency, medical treatment, Google Drive change or implementation.

## 1. Product judgment

Gavin does not need another fitness dashboard or a catalogue of exercises. He needs an informed plan
he can follow, understand and change.

GRAYSON should translate an outcome such as “be healthier, become stronger and move toward 170” into
one inspectable mission that coordinates:

- phased weight change;
- three full-body strength opportunities with selected emphasis areas;
- a path toward the owner-supplied physical-performance standards;
- Planet Fitness equipment and a bodyweight-only home fallback;
- food, protein, hydration, eating-window and sleep/recovery context;
- ordinary, reduced, home, minimum and recovery-day versions;
- evidence coverage, progress review and explicit owner-approved changes.

> **Health Mission principle:** Delta proposes one safe, coherent starting plan from current evidence
> and conservative defaults. It teaches only what is useful now, names consequential assumptions,
> adapts the plan to lived reality and never silently changes treatment, targets, programmes or
> progression. Gavin remains the final authority.

This is an application design, not medical care or a promise of a particular body weight, physique,
test result or completion date.

## 2. Repository truth: preserve the suit

BEYOND already implements most of the execution and evidence layer.

### Preserve unchanged

- **TRAIN execution:** fixed A/B/C templates, owner-created custom exercises/templates, programme
  assignments, STANDARD/REDUCED/RECOVERY variants, live set recording, warm-ups, optional reps in
  reserve, substitutions, rest timer, interruption recovery and completion states.
- **Progression:** advisory INCREASE/HOLD/REDUCE/NO HISTORY, re-entry after a layoff, evidence-bounded
  deload, visible WHY and owner-chosen load. No plan may silently apply a suggestion.
- **Evidence:** session history, set history, personal records, strength curves, weekly sessions/sets,
  recovery comparisons and the concurrently developed finished-workout metric page in PR #584.
- **Body and fuel:** bodyweight history/trend, calorie/protein targets and proposals, meals, saved
  meals, Food Week direction, hydration, sleep, Garmin/activity evidence and corrections.
- **Intent and life context:** Missions, work/off rotation, Week Planner, lived-day state,
  Orientation, check-ins, difficult-day behavior and the Eating Window design.
- **Trust:** local-first records, source/freshness, explicit approval, undo/correction, missing-data
  honesty and deterministic Engine authority.

### Current limitations to deepen or connect

- The built-in A/B/C sessions are fixed machine-oriented workouts, not three balanced full-body
  sessions designed around a health Mission or chosen emphasis areas.
- Custom templates and programme assignments exist, but Gavin must assemble them manually in MORE;
  the fixed A/B/C rotation suggestion does not generate or rotate custom Mission plans.
- The exercise library stores one primary muscle group. It cannot yet represent secondary-muscle
  contribution, movement-pattern coverage or planned weekly volume with enough fidelity to claim a
  scientific muscle-balance score.
- TRAIN reports what happened and per-exercise progress, but it does not show “where I am, where I am
  going, whether the whole plan is working and what one adjustment is justified.”
- Bodyweight, nutrition, sleep and training coexist but are not yet composed into an owner-approved
  health phase and review.
- No canonical performance-standard record distinguishes a practice estimate from an observed test.
- Current REDUCED means the first two exercises/two sets. That rule remains locked; it is not always
  a complete bodyweight-at-home fallback.

The answer is to connect and deepen these primitives. It is not a parallel workout store, a second
nutrition diary, an opaque readiness score or a replacement application.

## 3. Mission shape: health first, weight in context

The owner outcome is broader than “lose weight.” The Mission is:

> **STRONGER, HEALTHIER, CAPABLE**  
> Reduce body weight at a sustainable clinician-compatible pace, preserve or build useful strength,
> improve the four performance standards, eat and recover better, and reach 170 as a required review
> point rather than an automatic command to continue toward 150.

Weight is an outcome measure, not a moral score. The Mission must also track:

- strength and repeated-work capacity;
- completion of useful training opportunities;
- 1.5-mile performance and ordinary aerobic activity;
- mobility and core-endurance standards;
- sleep/recovery and subjective capacity;
- protein and food-record coverage;
- symptoms or treatment context that should change the day’s plan;
- whether the plan is practical on work nights and days off.

### Phased strategy

1. **Establish the operating baseline (about two weeks).** Learn exercises and equipment, obtain
   repeatable starting loads, begin the walk/run progression, improve record coverage and avoid
   treating early water-weight change as a stable trend.
2. **First health milestone.** Use the first approximately 5% weight change as a review point because
   it is meaningful without pretending the final goal is already settled. Keep strength and function
   visible alongside scale trend.
3. **Continue in bounded phases.** Review every further meaningful phase rather than authorizing an
   indefinite deficit. A phase may continue, hold, reduce burden or pause.
4. **170 review.** Reassess health, strength, performance, appearance, sustainability and clinician
   guidance. Decide whether the next mission is maintenance/recomposition, continued loss toward a
   lower owner-chosen range, or another outcome. GRAYSON never assumes 150 is automatically healthier.

CDC’s general guidance that gradual loss of roughly 1-2 lb per week is more maintainable and that a
5% reduction can matter is context, not a weekly compliance rule. Medication, starting condition and
clinical guidance can change the observed pace. Delta reports the trend and recommends clinician
discussion when appropriate; it does not manipulate a prescription or force the scale to match a
generic line.

## 4. Guided setup: ask less, produce more

The setup is a short guided session, not a fitness exam. Existing records answer first.

### Known or owner-confirmed direction

- three strength sessions in a normal week;
- whole-body development with extra attention available for chest, triceps and traps;
- Planet Fitness as the normal gym context;
- bodyweight-only home alternatives when leaving home is unrealistic;
- weight reduction and better food quality while protecting strength and muscle;
- the supplied 20-29 and 30-39 performance standards as external benchmarks;
- shift work, sleep and recovery materially affect feasibility;
- treatment remains clinician-led and may affect appetite, hydration, symptoms and fueling.

### Questions Delta may ask only when unanswered

1. Any current pain, injury, movement restriction or clinician exercise restriction?
2. Which exact equipment is present at Gavin’s club? Use the Planet Fitness preset, then let Gavin
   remove anything missing; do not promise that every franchise has identical equipment.
3. Which movements feel familiar enough to begin, and which require instruction or an in-person
   trainer demonstration?
4. How many minutes are realistically available for a normal, reduced and minimum session?
5. Which zero-to-three emphasis areas matter for the next block?
6. Is the performance test an official job requirement with a defined protocol/date, or a personal
   target? Protocol details materially affect what “pass” means.
7. What clinician instructions or symptoms must the plan protect? Store this privately in operator
   data, not source control.

Delta should then produce the draft. It should not ask Gavin to choose a split, periodization model,
volume landmark, RPE system or calorie formula before showing a sensible recommendation.

## 5. Default training architecture

### Why three full-body sessions

Three full-body sessions fit the owner’s stated availability, expose each movement more than once,
allow emphasis without abandoning balance and degrade gracefully when one session is missed. Current
evidence does not show that a complicated split is necessary. Resistance training reliably improves
strength and hypertrophy; heavier loading is more specific to maximal strength, multiple sets support
hypertrophy, and equipment type itself is not consistently decisive.

The plan is a **sequence**, not Monday/Wednesday/Friday. GRAYSON places A, B and C in the lived schedule
with recovery between them where practical. A missed day moves the opportunity; it does not cause a
failed week or demand two sessions close together to “catch up.”

### Balance contract

Every normal week should expose these movement families:

- knee-dominant legs;
- hip/posterior chain;
- horizontal push;
- horizontal pull;
- vertical push;
- vertical pull;
- core/trunk;
- optional loaded carry, calves or mobility work.

Emphasis is additive and bounded. Selecting chest, triceps and traps may add or prioritize a small
number of direct sets, place those movements earlier, or choose a better exercise variant. It does
not erase legs, back, shoulders, core or conditioning. Initial volume stays deliberately recoverable;
the evidence that higher weekly volume may improve hypertrophy does not justify jumping a new lifter
straight to a high-volume programme during weight loss and shift work.

### Proposed Planet Fitness starting block

This is a design reference for the future guided plan, not a prescription activated by this document.
The exact exercise is selected from verified club equipment and owner comfort.

| Session | Foundation | Balanced work | Current emphasis |
| --- | --- | --- | --- |
| **A - Press foundation** | Leg press; machine or Smith chest press | Seated cable row; leg curl | Triceps pressdown; dumbbell/Smith shrug |
| **B - Pull and hinge** | Dumbbell or Smith Romanian deadlift after instruction; lat pulldown | Incline press; machine shoulder press | Face pull/reverse pec deck; overhead cable triceps extension |
| **C - Whole-body repeat** | Squat/leg-press variant; chest-press variant | Row/pulldown counterpart; calves or core | Pec deck/cable fly; shrug or carry |

Default starting dose:

- large compound or machine patterns: usually 2 working sets while learning, progressing toward 3
  when recovery and execution support it;
- accessory work: usually 2 working sets;
- compound rep ranges generally 8-12 and accessories generally 10-15, using current per-exercise
  prescriptions where they already exist;
- stop each learning set with technically clean repetitions still available rather than requiring
  momentary failure;
- record optional reps-in-reserve as observation only. It must not change Engine advice until a
  separately approved rule exists;
- preserve current warm-up, rest, substitution and progression paths.

Starting load is learned conservatively in the first session. Delta does not estimate a heavy load
from bodyweight, sex or appearance. The exercise instruction should say what the machine adjustment,
motion and stop rule are, then use the recorded set as the starting evidence.

### Progression and stalls

The existing per-exercise progression rule remains authoritative:

- all required working sets at the top of range: suggest the next available increment;
- clean work in range: hold;
- all completed required sets below the minimum: suggest reducing one increment;
- mixed/incomplete evidence: hold;
- after a layoff: existing re-entry behavior;
- after the existing evidence-bounded stall: existing one-session deload;
- every change remains advisory and owner-chosen.

Mission review may propose changes to exercise selection, weekly opportunity or total sets, but it
cannot reinterpret one difficult session as a stalled programme. An exercise stall, a missed week,
weight-loss plateau and incomplete logging are different states.

## 6. Reality variants: the plan survives difficult days

The future plan offers five legitimate forms:

| State | Purpose | Result |
| --- | --- | --- |
| **Normal gym** | Full planned stimulus | Run the current A/B/C Mission session |
| **Reduced gym** | Preserve the highest-value work under limited capacity/time | Reuse current REDUCED semantics unless a later approved rule changes them |
| **Home** | Train when leaving home is the main barrier | Bodyweight session; honest about missing loaded pull work |
| **Minimum** | Keep a useful appointment on a genuinely constrained day | About 8-12 minutes, one round/short circuit, no catch-up debt |
| **Recovery** | Protect health and the next useful session | Existing light-movement/RESET path; no rotation advance |

### Bodyweight-only home session

The default home version uses no assumed equipment:

1. chair squat or controlled bodyweight squat;
2. incline, knee or floor push-up at the appropriate level;
3. reverse lunge or supported split squat;
4. glute bridge;
5. prone reverse snow angel or Y-T-W for posture/scapular movement;
6. dead bug, plank or controlled sit-up practice.

It progresses through range of motion, leverage, repetitions, pauses and additional rounds. It does
not invent a weight increment for a bodyweight movement. It also does not claim that prone movements
replace a loaded row or pulldown. The next gym session restores the missing pull stimulus.

### Minimum version

The minimum version is selected from squat, push-up, bridge/lunge and trunk work. It is a real session
only if real work is recorded, but it is not described as equivalent to the normal programme. Its job
is to preserve capacity and reduce the all-or-nothing decision.

### Delta decision grammar

Delta uses current check-in, sleep, schedule, symptoms and explicit operator statement without
exceeding the evidence:

> “You have enough capacity for the normal session, but only 30 minutes before preparation. I moved
> the chest press and row first and selected the reduced gym version. You can still choose the full
> session.”

> “You said leaving home is the barrier, not pain or illness. Use the 12-minute home session. It will
> preserve the appointment; it will not replace this week’s loaded pulling.”

> “Several days of declining mood and your statement that the normal plan is unmanageable change the
> objective. Recovery is the plan today. The Mission remains intact.”

Concerning pain, illness or symptoms are not a motivation problem. GRAYSON stops exercise guidance,
keeps recording available and directs Gavin toward appropriate professional care without diagnosing.

## 7. Physical-performance standard track

The owner-supplied “Appendix A - Physical Fitness Standards” chart was visually inspected. It defines
four standards: sit and reach, one-minute sit-ups, one-repetition maximum bench press as a percentage
of bodyweight, and a 1.5-mile run. The chart remains an external owner artifact; it is not copied into
the repository or treated as a universal health standard.

### Owner-supplied benchmark values

| Test | Male 20-29 (current age category) | Male 30-39 (owner-selected future category) |
| --- | ---: | ---: |
| Sit and reach | 14.4 in | 13.0 in |
| One-minute sit-ups | 33 | 30 |
| One-repetition maximum bench press | 88% bodyweight | 78% bodyweight |
| 1.5-mile run | 14:00 | 14:34 |

The app should show both categories while Gavin is 29: **current applicable reference** and **future
target reference**. It must not quietly use the easier category early.

### Four independent tracks

1. **Mobility:** brief repeated hamstring/hip/lower-back mobility, with sit-and-reach technique kept
   consistent. A practice reading is not automatically comparable if the apparatus/protocol changes.
2. **Core endurance:** progressive trunk work plus periodic one-minute test practice. Normal strength
   training does not by itself prove the timed standard.
3. **Bench strength:** normal chest/triceps strength plus test-specific practice. Machine or Smith
   pressing builds useful strength but is not a valid free-weight 1RM result. If the official test is
   free-weight bench, actual test practice requires the correct equipment, protocol and appropriate
   supervision/spotting.
4. **Run:** a gradual walk/run programme and easy aerobic work, progressing volume before forcing
   speed. Strength and aerobic training can coexist; the system avoids stacking the hardest run and
   hardest lower-body session when schedule allows.

### Evidence labels

- **OBSERVED TEST:** completed using the named protocol, equipment, date and result.
- **PRACTICE:** same task but not official/controlled.
- **ESTIMATE:** derived from submaximal work or another machine; never displayed as a pass.
- **NOT TESTED:** no current comparable evidence.

Bench threshold is recalculated from the weight recorded for the test date. GRAYSON shows the formula
and does not invent a rounding rule absent from the official protocol. Losing weight can lower the
absolute percentage-based threshold, but Delta must never frame weight loss as a substitute for safe,
specific strength development.

Formal benchmarks should be occasional checkpoints, not every-workout pressure. A default review
cadence of roughly 6-8 weeks is a product heuristic to avoid noisy over-testing and is editable; an
official test date may require a different schedule.

## 8. Food, hydration, sleep and treatment context

### Food and protein

The health Mission consumes the existing owner-controlled calorie/protein targets and Food Week; it
does not create a second nutrition authority. The first plan emphasizes:

- a moderate, reviewable energy deficit rather than the lowest possible intake;
- adequate protein distributed through practical eating opportunities;
- warm, reheatable, high-protein work meals and owner-approved convenient backups;
- food-record completeness so missing logs are not treated as low intake;
- enough energy around training to preserve useful work and recovery;
- family/special meals as planned life, not failure.

Evidence supports higher protein intake and resistance training as useful lean-mass protections during
weight loss, but exact protein needs vary and the evidence does not justify one magic number. GRAYSON
should propose a range from the existing target system, the selected phase, tolerance and clinician
constraints; Gavin confirms it. The system must not infer kidney safety or other medical suitability.

### Hydration

The default plan remains simple: water, sparkling water or water with lemon; zero-sugar flavor/electrolyte
mix is interchangeable when useful. Caloric sports drink is situational rather than a routine health
requirement. Protein shake is food/protein, not hydration. Owner-defined **my bottle** and **one scoop**
units prevent repeated calculation.

### Sleep and shift recovery

Sleep affects which version is realistic, not whether Gavin is allowed to train. Preserve the current
capacity-driven variant and short-sleep evidence. Mission planning should protect main sleep, avoid
creating catch-up workouts and distinguish “poor sleep may reduce capacity” from “sleep caused this
performance.” Hard/late-session effects on the night remain a separate C4.4 design boundary.

### Eating Window

Eating Window is subordinate to the Mission. A narrow window is relaxed, moved or suspended when it
repeatedly prevents sufficient food/protein, worsens symptoms or undermines training/recovery. Fasting
duration is never the goal that outranks health.

### Clinician-led medication context

Medication name, dose, schedule and symptom history are private operator data, not repository facts.
The product may use explicitly recorded context to:

- protect clinician instructions;
- notice that appetite or gastrointestinal symptoms may make the planned intake impractical;
- favor smaller practical meals or a shake when that is owner-accepted;
- reduce or stop the day’s exercise plan when hydration, intake or symptoms make it inappropriate;
- prepare an accurate question or trend summary for Gavin’s clinician.

It may not change dosage/timing, recommend starting/stopping treatment, diagnose adverse effects,
declare a symptom safe or convert an absent symptom log into evidence that treatment is well tolerated.
The FDA label establishes that decreased appetite and gastrointestinal adverse effects are common and
that serious warnings exist; it does not authorize GRAYSON to manage them.

## 9. Phone-first experience

### Journey A - Build my health plan

1. Gavin says, “Help me get healthier, stronger and reach 170.”
2. Delta reflects the combined outcome and reads current weight trend, programme, recent training,
   available food/recovery evidence and source dates.
3. Delta asks only material safety/equipment/protocol questions.
4. One mission brief shows **NOW**, **FIRST PHASE**, **PROTECT**, **UNKNOWN** and **REVIEW DATE**.
5. **BUILD TRAINING PLAN** produces the A/B/C draft with muscle/movement coverage, time and fallbacks.
6. Gavin can change an exercise, emphasis area, session length or opportunity.
7. **APPROVE PLAN** shows exactly which existing custom templates/programme/targets would change.
8. No write occurs in this design; a future implementation requires confirmation and undo/repair.

Delta example:

> “I recommend fat loss with strength protection as the first phase, not a muscle-gain diet. Three
> full-body sessions will keep chest, triceps and traps prominent without neglecting legs and back.
> Your food record is incomplete, so I can propose the plan but cannot claim your current intake is
> the reason for any result.”

### Journey B - Today’s training

TRAIN opens on one recommendation:

> **SESSION B - PULL AND HINGE**  
> 45-55 min · Planet Fitness · normal version  
> Your last lower-body session was two days ago. Main sleep was within your recent range.  
> **START** · **CHANGE** · **HOME INSTEAD**

WHY contains schedule, capacity, last relevant training and evidence gaps. It does not display a
fabricated recovery percentage.

### Journey C - Difficult day

> “You have postponed this three times. Today’s check-in does not show insufficient capacity, so
> avoidance is a reasonable concern, not a fact. I recommend the 12-minute home session. You can
> choose recovery or dismiss this.”

If Gavin explicitly says he cannot manage the normal plan, Delta accepts that as current reality and
reduces the plan without guilt.

### Journey D - Benchmark review

> **30-39 STANDARD · 2 OF 4 OBSERVED**  
> Sit and reach: not tested  
> Sit-ups: 27 practice / target 30  
> Bench: estimate only; correct test equipment not recorded  
> 1.5 mile: 15:22 observed / target 14:34  
> **NEXT:** keep the plan; add one easy run interval next week.  
> **WHY:** run evidence is comparable; bench evidence is not.

### Journey E - Phase review

The review answers:

1. What phase and plan were approved?
2. How much of the record is complete enough to interpret?
3. What changed in weight trend, strength, standards, sleep and subjective capacity?
4. What alternative explanations remain?
5. Is one change justified?

Allowed outcomes: **KEEP**, **ADJUST ONE THING**, **HOLD WEIGHT PHASE**, **PAUSE/RECOVER**,
**REASSESS WITH CLINICIAN**, **CHANGE MISSION** or **CANNOT TELL**.

## 10. Evidence and causality contract

### Evidence floors

GRAYSON should not call the plan “working” or “stalled” from one weigh-in, one missed session or one
good workout.

- **Weight:** use an available rolling trend and several weeks of comparable readings; surface fluid
  variability and sparse sampling.
- **Strength:** compare the same exercise/equipment and meaningful working-set evidence. A substitution
  is not the same lift.
- **Muscle growth:** no direct claim from volume or scale alone. Measurements/photos are optional and
  provenance-labeled; strength progress is not identical to hypertrophy.
- **Food:** separate complete, partial and unknown days. A missing meal log is not a calorie deficit.
- **Recovery:** report association and context; do not claim sleep, medication, fasting or protein
  caused a result without a designed experiment and adequate evidence.
- **Performance:** only comparable protocol/equipment earns observed-standard status.

### Adjustment order

When progress is unclear, Delta first checks record coverage and plan feasibility. If evidence is
adequate, it changes at most one major variable for a review period:

1. schedule/consistency;
2. exercise execution or load progression;
3. recoverable weekly volume;
4. food target or meal structure through the existing proposal path;
5. cardio/run progression;
6. mission strategy.

The order is diagnostic guidance, not automatic authority. An owner-confirmed urgent constraint can
change it.

## 11. Donor synthesis and leverage disposition

| Donor | Useful pattern | GRAYSON ruling |
| --- | --- | --- |
| **Fitbod** | Equipment-aware workout selection, explicit exercise feedback, recovery-aware substitution | **ADAPT BEHAVIOR ONLY.** Do not import proprietary algorithms or a pseudo-precise muscle-recovery percentage. |
| **Hevy** | Fast logging, exercise history, muscle/set distribution and period comparison | **ADAPT PRESENTATION.** Show observed set distribution after the exercise model can support it; no social/streak layer. |
| **Planet Fitness** | Club equipment categories, machine QR instruction, trainer support and no-equipment workouts | **INTEGRATE AS A USER-CONFIRMED PRESET.** Club inventory varies; link/encourage official instruction rather than copying proprietary media. |
| **GainPath** (MIT) | Equipment increments, owner-applied progression, re-entry/deload, local-first repair | **COPY IDEAS / CONSIDER SMALL PRIMITIVES.** BEYOND already owns most of this; do not replace TRAIN. |
| **Workout Planner** (MIT) | Direct/secondary muscle accounting, plan preview, offline/mobile cycle calibration | **COPY IDEAS ONLY.** Its volume tiers are not imported as scientific truth. |
| **wger** | Connected routines/exercises/nutrition/weight and flexible progression | **REJECT CODE INTEGRATION.** AGPL application code; separately licensed content requires item-level diligence. |
| **free-exercise-db** | Public-domain exercise schema with muscles/equipment/instructions | **DEFER BULK REUSE.** Existing owner ruling prohibits bulk import; hand-authored library remains until separately amended. |

- **REUSE:** existing BEYOND TRAIN execution/progression/programme/custom-template/history, Body,
  nutrition targets, Food Week, Eating Window, sleep/capacity, Missions, Week Planner and Review.
- **OWN:** the connected health-phase model; movement/emphasis balance; performance-standard
  provenance; reality variants; cross-domain review and Delta plan-first language.
- **BUILD FROM SCRATCH:** none in this design. Future implementation owns only missing orchestration
  and mappings after rechecking existing primitives.

## 12. Evolution matrix

| Current BEYOND capability | Preserve | Evolve toward | Disposition |
| --- | --- | --- | --- |
| Fixed A/B/C templates | Locked content and history continuity | Remain available; Mission uses owner-approved custom templates rather than rewriting them | Preserve + route around carefully |
| Custom exercises/templates | Local records, edit/archive and TRAIN execution | Guided three-session draft and explicit creation | Connect + deepen |
| Training programme | Weekday/rotation assignment | Mission-aware proposal with schedule preview | Connect |
| Progression/re-entry/deload | Existing deterministic advisory rules | Explain within the Mission; no hidden application | Preserve |
| TRAIN home/live workout | One recommendation, CHANGE, one-set-at-a-time | Normal/home/minimum entry and Mission context | Deepen carefully |
| Training history/records | Canonical performed evidence | Mission trend and comparable-evidence labels | Connect |
| Exercise library | Hand-authored local list | Verified equipment, movement pattern and secondary-muscle metadata | Deepen later |
| Bodyweight/targets | Correctable owner data and proposals | Phased weight Mission with 170 review point | Connect |
| Food Week/meal logging | One food record and owner targets | Mission-shaped work meals, coverage and fueling | Connect |
| Eating Window | Optional owner-controlled experiment | Subordinate to fueling/recovery safeguards | Connect |
| Sleep/check-in/shift context | Existing capacity and provenance | Select a reality variant, not a new readiness score | Connect |
| Missions | Owner intent and lifecycle | Reference training/food/recovery plans and review | Deepen later; Protected semantics |
| Review/metrics | Existing trends and sources | One evidence-bounded phase review and one proposed change | Connect + deepen |
| PR #584 workout metric | Concurrent finished-workout evidence | Supporting training metric after merge; no duplicate work here | Preserve concurrent work |

## 13. Ranked evolution sequence

Every implementation requires separate approval.

1. **Health Mission training-plan draft - Protected, M.** Inside TRAIN, read current programme,
   templates, schedule, recent sessions and owner-confirmed Planet Fitness/home constraints. Generate
   an inspectable three-session custom-template draft with movement coverage, emphasis and normal/
   home/minimum previews. Do not write until Gavin confirms the exact templates and assignments.
2. **Approved plan creation and programme assignment - Protected, M.** Reuse existing custom-template
   and programme commands with a multi-write preview, conflict handling and repair/undo strategy.
   Preserve fixed A/B/C and all history.
3. **Exercise teaching and equipment profile - Protected, M.** Owner-confirmed club equipment,
   movement-pattern/secondary-muscle metadata, concise cues and official-instruction links. No copied
   proprietary media or unreviewed bulk dataset.
4. **Home/minimum execution - Protected, M.** First-class bodyweight alternatives whose records remain
   honest and do not contaminate weighted-lift progression.
5. **Performance Standards - Protected, L.** Protocol/versioned benchmark definitions, observed/
   practice/estimate evidence and four-track planning. Actual 1RM safety/protocol needs explicit owner
   and clinical/professional review where warranted.
6. **Health Mission phase and cross-domain review - Protected, L.** Weight phase, record coverage,
   training, food, sleep and standards; one explicit proposed adjustment. Reconcile C4.5 and Mission
   semantics rather than introducing a second review system.
7. **Personal learning - Protected, L.** Only after real use generates corrections and outcomes;
   inspectable, provenance-retaining and never a hidden recommendation model.

### Recommended first implementation objective

`GRAYSON-TRAIN-PLAN-DRAFT-001`: one phone-first, read-mostly guided plan builder inside TRAIN. It
produces a three-session Planet Fitness draft plus home/minimum previews using existing exercises,
custom-template shapes, programme slots and current evidence. Gavin can change emphasis, duration and
exercises. The first slice stops at a fully inspectable confirmation preview; it creates no template,
changes no programme, alters no Engine rule and adds no schema/provider/dependency. This isolates the
hardest product question - whether the generated plan is understandable, balanced and useful - before
authorizing writes or Mission semantics.

This is the health Mission’s recommended first slice. It does not silently displace the merged Guided
Operating Loop’s broader Guided Start priority; Gavin decides their order.

## 14. Acceptance scenarios for later implementation

- **Normal week:** three balanced sessions fit the actual work/off sequence; chest/triceps/traps are
  visibly emphasized without neglected movement families.
- **Equipment missing:** substitute from verified equipment without rewriting history or claiming the
  movement is identical.
- **Bad day at home:** the home/minimum plan is immediately usable, bodyweight-only and does not create
  loaded-pull or weighted-progression fiction.
- **Sparse data:** a useful conservative draft is offered with uncertainty; access is never gated.
- **Medication/appetite context:** the plan reduces burden and protects clinician authority; no dose,
  diagnosis or treatment recommendation appears.
- **Weight trend down, strength stable:** report the observed pattern with coverage and keep the plan
  when no change is justified.
- **Weight trend down, performance declining:** inspect fueling, recovery, symptoms and comparability;
  propose one reviewable change or clinician discussion, not a causal verdict.
- **Benchmark:** Smith press is labeled estimate/practice and never satisfies free-weight bench.
- **Missed week:** resume with existing re-entry behavior; no streak loss, guilt or catch-up overload.
- **Owner override:** Gavin’s informed choice is respected until new evidence changes the situation.

## 15. Evidence register

Primary and first-party sources inspected 2026-11-20:

- Currier et al., ACSM 2026 Position Stand, overview of 137 systematic reviews: resistance training
  improves strength, hypertrophy and physical function; heavier load, 2-3 sets and at least two weekly
  sessions favor strength, while higher weekly volume favors hypertrophy.
  <https://pubmed.ncbi.nlm.nih.gov/41843416/>
- Currier et al., 2023 network meta-analysis: all studied resistance prescriptions improved strength
  and hypertrophy versus no exercise; heavier-load prescriptions ranked higher for strength and
  multiset prescriptions for hypertrophy. <https://pubmed.ncbi.nlm.nih.gov/37414459/>
- American Heart Association 2023 scientific statement: major muscle groups can be trained with
  machines, free weights, bands or bodyweight; practical resistance prescription and safety require
  individual context. <https://pubmed.ncbi.nlm.nih.gov/38059362/>
- U.S. Physical Activity Guidelines, second edition: adults benefit from both aerobic activity and
  muscle-strengthening activity. <https://health.gov/paguidelines/second-edition/pdf/Physical_Activity_Guidelines_2nd_edition.pdf>
- Schumann et al., 2022 meta-analysis: concurrent aerobic and strength training did not compromise
  maximal strength or hypertrophy overall; same-session work was more relevant to explosive strength.
  <https://pubmed.ncbi.nlm.nih.gov/34757594/>
- Binmahfoz et al., 2025 systematic review/meta-analysis: adding resistance exercise during dietary
  weight loss protected fat-free mass and improved fat loss/strength relative to diet-only groups,
  with outcome-specific certainty. <https://pubmed.ncbi.nlm.nih.gov/40909191/>
- Hashimoto et al., 2024 systematic review/meta-analysis: higher protein intake was associated with
  better muscle-mass retention during weight loss, but not clearly with strength or function.
  <https://pubmed.ncbi.nlm.nih.gov/39002131/>
- CDC healthy weight guidance: gradual weight loss, specific planning, sleep/activity/stress context
  and clinically meaningful modest loss. <https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html>
- FDA Mounjaro prescribing information: authoritative treatment/warning/adverse-reaction boundary;
  used only to constrain product behavior, not to store the owner’s treatment details or manage it.
  <https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/215866s044s045lbl.pdf>
- Planet Fitness first-party club/equipment and training information: equipment classes, machine QR
  instruction, trainers and no-equipment workouts; individual club availability varies.
  <https://www.planetfitness.com/our-clubs>
- Fitbod first-party help: equipment, history, feedback and estimated recovery influence selection;
  pattern donor only. <https://help.fitbod.me/hc/en-us/articles/43489509474455-How-does-Fitbod-choose-which-exercises-to-give-me>
- Hevy first-party feature documentation: observed sets/volume by muscle and period comparison;
  presentation donor only. <https://www.hevyapp.com/features/training-chart/>
- GainPath, MIT: local-first logging, owner-applied suggestions, equipment increments and repair
  patterns. <https://github.com/shihatsu1/gainpath>
- Workout Planner, MIT: offline programme preview and direct/secondary muscle accounting; ideas only.
  <https://github.com/Aebisc/Workout-Planner>
- wger: AGPL-3.0 application; exercise/ingredient content separately Creative Commons per item.
  <https://github.com/wger-project/wger>
- free-exercise-db: Unlicense/public-domain-style dataset; reuse remains deferred by the existing
  owner ruling. <https://github.com/yuhonas/free-exercise-db>

Owner-supplied external evidence inspected but not committed: “Appendix A - Physical Fitness
Standards,” dated row 12-15-22, containing the four male/female age-category tables summarized above.

