# GRAYSON-C6.1 + C6.2 — Delta's learning lifecycle, and "What I think I'm learning" weekly

- **Owner authorization:**
  - Gavin, 2026-11-24, "Agreed": Delta's learning loop next, starting with C6.1 and C6.2.
  - His design rulings:
    - store answers as a **new event type**;
    - **Narrow** is a preset tap plus optional words;
    - a kept learning returns only **when evidence flips or goes 8 weeks without fresh evidence**. No spaced re-checks and no new dependency (ts-fsrs deferred).
- **Lane:** PROTECTED (learning and correction semantics, a new event type, the cadence of proactive observation).
  Independent exact-head review, green CI, Gavin's merge. **Builder:** Claude Code. **Branch:** `ccr-380c4225-delta`.
- **Operator benefit:** Delta stops being a list of patterns and becomes a conversation he controls. Once a week he
  sees at most three things Delta thinks it's learning and answers Keep / Narrow / Not true / Drop. What he drops
  never comes back to Delta's lines or Alfred, and what he keeps is flagged if newer records disagree.

## Rules
- **Delta still derives every learning from records** (`application/delta.ts`, unchanged). Nothing derived is stored.
- **Only his answer is stored:** `LEARNING_RESPONDED`.
  - Global (not day-scoped), source USER, append-only.
  - Causally chained by `supersedes`; a broken chain is reported, never skipped.
  - Each answer records the words he saw and the evidence at that moment (days; a TAG's measure and lean; a sleep
    window's midpoint).
  - UNDO cancels the answer before it.
  - Double taps are idempotent, and a stale screen is refused with nothing written.
- **States** (`application/learningLifecycle.ts`, pure):
  - From records:
    - **Observed:** an unusual streak.
    - **Hypothesized:** a #tag pattern or sleep window at its existing evidence floor.
    - **Provisional:** an experiment on that tag is running.
    - **Confirmed:** his own reviewed experiment, or his Keep.
  - From his answers:
    - **Confirmed:** Keep.
    - **Context-specific:** Narrow, with a preset (work days, days off, after night shifts) and/or words.
    - **Contested:** Not true.
    - **Retired:** Drop.
  - From evidence against his answer:
    - **Contested:** a kept #tag lean reverses past a "same" band (sleep ±15 min, energy/mood ±0.25, workouts ±10%),
      or a kept sleep window's midpoint moves 2 h or more.
    - **Outdated:** a kept learning has no fresh evidence for 56 days, or can no longer be derived at all.
- **Retired never reaches reasoning:**
  - Alfred's context (`operatorContext` → `deltaFacts`) leaves it out.
  - Remaining lines say when he confirmed, narrowed or disputed one.
  - The free helper's answers, TODAY's "Delta learned" line and coach cards use the same filtered read
    (`getReasoningKnowledge`). A dropped or disputed tag is never offered as an experiment.
  - If his answers can't be read, Delta's knowledge is withheld rather than shown without them.
- **C6.2 weekly** (`WeeklyInterviewView`):
  - "WHAT I THINK I'M LEARNING", at most three a week.
  - Only #tag patterns and sleep windows, only at their floor, only unanswered ones or ones evidence turned against.
  - Reversed ones come first, then the newest.
  - Silent when there's nothing to ask.
  - This visit's picks stay on screen after answering, showing his answer and UNDO.
- **Notebook:** each pattern shows its state and the same answer control. Dropped learnings sit under "Dropped by
  you" with UNDO.
- **Nothing here changes recommendations, plans or the Engine.**

## Leverage gate
- **REUSE:**
  - Delta's existing derivation and evidence floors (`delta.ts`, `tagPatterns.ts`, `sleepRhythm.ts`);
  - the event log;
  - `writeAtomically` / `logIntentEvent`;
  - C6.4's `WhyTrace`.
- **OWN:** the lifecycle mapping, the answer event and the weekly pick.
- **BUILD FROM SCRATCH:** none.
- **Deferred:** ts-fsrs (MIT) for spaced re-checks, per his ruling.
- **Rejected:** extending `MEMORY_RECORDED`. It would change a strict, locked format that older builds refuse to
  read; his memory store stays "things he wrote".

## Acceptance
- `tests/learningLifecycle.test.ts` (10 tests):
  - every state from records;
  - each answer;
  - UNDO back to the records' state;
  - a reversal versus a wobble;
  - a sleep window moving across midnight;
  - outdated, and no longer derivable;
  - broken or foreign chains rejected;
  - the weekly pick (at most 3, reversed first, never observations or experiments);
  - Alfred's context (retired excluded; stances stated).
- `tests/integration/learningCommands.test.ts`: a global chained USER event; double tap; stale refusal; Narrow
  validation; UNDO rules.
- `tests/integration/coachCards.test.ts`: a dropped tag is never offered as an experiment.
- `tests/browser/LearningLifecycle.test.tsx`:
  - weekly at 320 px: buttons at least 44 px, no overflow, axe clean;
  - KEEP → UNDO → NARROW, with a preset and words;
  - notebook DROP → "Dropped by you" → UNDO.
- Existing suites (Delta views, weekly, coach, Alfred context, free helper): node 143 and browser 101, all passing.
- Screenshots: `docs/agent/screenshots/grayson-c6.1-c6.2/`.
