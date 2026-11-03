# BEYOND 3.0 Launch — phone daily driver

Owner checklist (Gavin, 2026-11-02), edited with Claude Code. **Goal:** delete the other apps and live in
BEYOND for a full rotation of nights + days off. Everything stays free-first, confirm-before-save, with the
Engine as the only recommendation authority. Ticks reflect master on 2026-11-02; field use is still the test.

## 1. Launch checklist

### Core daily loop
- [x] Shift-aware TODAY that always knows the phase (PREP / ON SHIFT / RECOVER / OFF)
- [x] One clear next action + fast logging path
- [x] Free helper handles ordinary talk/type (water, meals, sleep, weight, tasks, notes, sets) offline
- [x] Alfred for harder questions, planning and memory (confirm-before-save always)
- [x] Corrections + undo (LOG sheet, saved cards, plain words)
- [x] Offline logging + Engine recommendations with no signal

### Training
- [x] Gym mode (one-handed, rest timer, plate math, wake lock)
- [x] Progression advice (INCREASE / HOLD / REDUCE) with WHY
- [x] PR tracking and records
- [x] Next session ready / simple programme on the rotation (TRAIN-PROGRAM-001, PR #396)
- [~] Strength trends are visually unified and inspectable (VIEWS-001 + SUIT-DATA-001); prove them
  during the launch rotation

### Body & fuel
- [x] Sleep (main + supplemental), water, protein, weight
- [x] Meal logging at MyFitnessPal quality (search, barcode, saved meals, diary, protein-first)
- [x] Own protein/calorie targets
- [x] Weekly meal plan + grocery list from saved meals and targets, free (MEAL-PLAN-001, PR #394)
- [~] Clear trends without dashboard tax (SUIT-DATA-001, PR #399); prove them during the launch rotation

### Life & memory
- [x] People, birthdays, home jobs, personal facts
- [x] Routines
- [x] Alfred remembers confirmed facts and recalls them
- [~] Weekly review writes itself from records with Alfred; the structured local review remains
  free, but a useful automatically written free summary is a post-launch 3.1 objective

### Recovery & schedule
- [x] Where today sits in the rotation ("night 2 of 3 · next day off Thu"), scheduled, never a record
- [x] Calendar export of shifts + plans (shareable shifts-only option)
- [~] Read-only first-sleep/shift-recovery context exists (SHIFT-RECOVERY-001, PR #397); field proof
  and an explicitly chosen protection plan remain
- [~] Flip-day evidence and Alfred drafting exist; durable rotation intelligence remains post-launch
- [~] Days-off evidence and Alfred drafting exist; plan-versus-reality continuity remains post-launch
- Rule: always labelled as his own pattern; never medical advice; never says "recovered"; never moves
  commitments or records work/sleep by itself.

### System qualities
- [x] Installable PWA that feels like a real app
- [ ] A few reminders he sets himself, easy to silence. Note: reliable reminders while the app is closed
  need a push service (a new provider, needs Gavin's OK); without it they work only while BEYOND is open.
- [x] Automatic + manual backup
- [x] Calm Batman Beyond visual language
- [~] Same pattern on every screen (where you are → what's next → act → look deeper → back): the shared
  presence line is everywhere; screen-by-screen layout pass still to do
- [x] Cold start and offline size acceptable (start bundle ~1.55 MB of 2 MiB)

### Launch test (the gate)
- [ ] A full rotation using only BEYOND, checked at three moments: end of a real shift, the next wake,
  and a day off. Write down every time another app or a workaround was needed.

## 2. Out of scope until section 1 is green and field-tested
Batcomputer/desktop mode, on-device local model, photo food logging, Hevy/Strong import, deep
multi-week status wall, circadian modelling beyond his own records.

## 3. Deeper backlog (after launch)
- Hevy/Strong/openGym patterns: supersets, muscle fatigue view, history import.
- LiftShift-style "progressing or just wobbling?" analytics.
- "Since last shift" factual summary; private share surface for his wife (calendar + chosen plans only).
- Study before building: openGym, wger, OpenNutriTracker / Waistline / FoodYou, LiftShift, ShiftCal.
  Check licences first (wger is AGPL: patterns only, no code).

The sequenced post-launch roadmap now lives in [BEYOND_AFTER_3.md](BEYOND_AFTER_3.md).

## Questions to keep asking
Does it reduce attention or add it? Does the core path work offline? Does it need a new paid service or
dependency? Does it touch Engine recommendations, schema or privacy? Phone job or Batcomputer job? Can the
free helper do it before Alfred? Would I still want it after three months?
