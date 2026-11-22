# GRAYSON Training Sequence Activation

**Status:** Protected design candidate. This document defines a future authority boundary; it changes
no runtime behavior, programme, event, schema, recommendation or navigation.

## 1. Purpose

Gavin can now guide, inspect and save three GRAYSON custom templates. They are still three independent
resources. Activation must make them one owner-controlled programme whose identity is:

> **A → B → C in completed-training order, around real life—not Monday → Wednesday → Friday.**

A missed date creates no debt. Recovery does not erase the plan. A difficult-day alternative counts
only when the recorded work honestly meets the existing advancement rule. Gavin can always choose a
different workout, but GRAYSON never silently guesses what that choice meant for the sequence.

## 2. Repository truth

BEYOND already owns the required foundations:

- `CustomWorkoutTemplate` stores editable owner-created templates; creation/edit/archive and native
  backup already work.
- `TrainingProgramme` is a global, append-only `TRAIN_PROGRAM_SET` revision chain. Its two current
  modes assign templates to weekdays or WORK/OFF rotation positions. It is informational and does not
  change Engine recommendations.
- `WorkoutSession` records template, `STANDARD` / `REDUCED` / `RECOVERY`, status and timestamps;
  performed sets provide the actual working-set evidence.
- `doesSessionAdvanceRotation` already defines the trusted outcome rule: STANDARD advances only on
  COMPLETED; REDUCED advances on COMPLETED or PARTIAL; either needs at least one working set;
  RECOVERY and ABANDONED never advance.
- The Engine's built-in A/B/C suggestion is a separate locked selector. A custom template is not a
  member of that built-in dictionary. Completing one currently makes the legacy selector fall back
  to built-in A; that is not a GRAYSON sequence.
- Week Planner and Week Ahead can display saved assignments or existing suggestions, but neither
  owns an ordered, date-independent custom-template cursor.

The gap is composition and authority—not storage for exercises, workout execution, outcome evidence,
or another calendar.

### Repository anchors

- Programme type/revision: [`src/domain/workout/trainingProgramme.ts`](../src/domain/workout/trainingProgramme.ts),
  [`src/application/trainingProgramme.ts`](../src/application/trainingProgramme.ts)
- Current date/slot resolution: [`src/engine/trainingProgrammeResolution.ts`](../src/engine/trainingProgrammeResolution.ts),
  [`src/application/trainingProgrammeQueries.ts`](../src/application/trainingProgrammeQueries.ts)
- Template records and resolution: [`src/application/customTemplateCommands.ts`](../src/application/customTemplateCommands.ts),
  [`src/application/customTemplateQueries.ts`](../src/application/customTemplateQueries.ts)
- Workout facts: [`src/application/trainCommands.ts`](../src/application/trainCommands.ts),
  [`src/application/trainQueries.ts`](../src/application/trainQueries.ts)
- Existing outcome/rotation rule: [`src/engine/trainSuggestion.ts`](../src/engine/trainSuggestion.ts)
- Planning consumers: [`src/application/weekPlannerQueries.ts`](../src/application/weekPlannerQueries.ts),
  [`src/application/weekAheadQueries.ts`](../src/application/weekAheadQueries.ts)
- Product authority: [`docs/UX_DECISIONS.md`](UX_DECISIONS.md),
  [`docs/GRAYSON_TRAIN_INTELLIGENCE.md`](GRAYSON_TRAIN_INTELLIGENCE.md)

## 3. Canonical authority model

Future implementation should extend the existing programme revision concept with a third mode:
`SEQUENCE`. It should not create a parallel programme table.

A sequence activation records, through an explicit USER-sourced programme revision:

- the three ordered template IDs;
- the owner-chosen first member (A by default, visibly changeable);
- an inspectable normalized snapshot of each confirmed template's name and exercise prescription,
  plus a deterministic signature for comparison;
- the prior programme revision for stale-write protection and guarded undo;
- recorded time and causal sequence supplied by the existing event spine.

The **active revision** is the authority for programme identity. The **next member** is a projection
derived from that activation plus qualifying recorded workout outcomes. It is not a mutable counter.
This preserves causality, rebuildability, backup compatibility and inspectable history.

### Responsibility split

| Authority | Decides | Must not decide |
|---|---|---|
| Gavin's active sequence | Which confirmed template is next | Capacity, recovery need or starting load |
| Existing capacity/recovery authority | STANDARD, REDUCED or RECOVERY guidance and RED override | Which sequence member replaces another |
| Existing workout commands | What was actually started, performed and finished | Programme meaning not confirmed by Gavin |
| Existing progression | Per-exercise load/rep advice from comparable history | Sequence position or programme redesign |
| Week planning | When a possible training opportunity exists | Calendar debt or automatic sequence advancement |

When no sequence is active, all current weekday/work-rotation programmes and built-in suggestions
continue unchanged.

## 4. Activation journey

Activation begins from the saved-plan receipt or MY PROGRAMME, never automatically after saving.

1. **Recognize the set.** GRAYSON finds the three exact saved IDs from the completed save action. It
   does not infer a programme from names such as “Grayson A.”
2. **Show the sequence.** A, B and C appear in order with their full exercise prescriptions. Any
   currently active weekday/work-rotation programme is named as the thing activation will replace.
3. **State the rules.** “The next session advances from recorded training, not dates. Recovery does
   not consume a session. Missing a day changes nothing.”
4. **Choose the starting member.** Default A; Gavin may deliberately choose B or C. No history-based
   guess is applied silently.
5. **Confirm.** `ACTIVATE A → B → C` is one explicit write. `NOT NOW` changes nothing.
6. **Receipt.** Show active revision/time, next session, the replaced programme, `UNDO ACTIVATION`
   while it remains causally safe, and where to inspect/deactivate later.

Activation does not start a workout, schedule a date, choose a load or rewrite past sessions.

### Phone journeys

**Activate after saving**

1. Receipt: `3 TEMPLATES SAVED` → `REVIEW ACTIVATION`.
2. Sequence review: three compact A/B/C rows; each expands to the confirmed exercises.
3. Authority summary: `START WITH A`, `ADVANCES FROM RECORDED TRAINING`, `NO FIXED DAYS`.
4. Final boundary: prior programme named; `ACTIVATE A → B → C` / `NOT NOW`.
5. Receipt: `ACTIVE · NEXT A`, source/time, guarded `UNDO`, `RETURN TO TRAIN`.

**Normal training day**

1. TRAIN: `NEXT · A — Bench strength`; separate `FORM · STANDARD` with WHY.
2. `START NEXT` opens the existing workout confirmation/execution path.
3. After a qualifying finish: one receipt says `A RECORDED · B IS NEXT`; no celebration/streak.

**Difficult or recovery day**

1. TRAIN keeps `NEXT · B` visible while capacity says `REDUCED` or `RECOVERY`.
2. REDUCED starts B through existing execution; a qualifying result advances to C.
3. RECOVERY completes without moving B; receipt says `B remains next`.

**Choose another session**

1. `CHOOSE ANOTHER` shows A/B/C and all existing direct template choices.
2. Selecting sequence member C states: `Completing C will make A next.`
3. Selecting a non-member states: `This workout will not move your programme.`

**Template changed or unavailable**

1. TRAIN shows `REVIEW REQUIRED` or `NEXT UNKNOWN`, not a guessed workout.
2. The detail compares confirmed/current content or names the missing member.
3. `RECONFIRM`, `REPLACE`, `RESTORE`, or `DEACTIVATE`; direct TRAIN access remains.

**Manage or stop the programme**

1. MY PROGRAMME shows active sequence, next member, last advancement and activation source.
2. `DEACTIVATE` explains that templates/history remain and no programme becomes active.
3. A separately chosen `RESTORE PREVIOUS` shows the exact prior configuration before writing.

## 5. Next-session projection

Starting from the owner-chosen member, scan recorded programme-member workouts after activation in
causal order. A workout changes the cursor only when all of these are true:

1. its template ID is a member of the active sequence;
2. it ended after the activation revision and has a trustworthy recorded outcome;
3. its existing session-type/status/working-set evidence qualifies under
   `doesSessionAdvanceRotation`.

An advancing outcome makes the member after the one actually completed become next. Thus, if A was
next but Gavin explicitly started B and completed it, C becomes next. GRAYSON records the informed
override; it does not demand A as catch-up work.

A workout using a template outside the active sequence is real training history but does not move the
sequence. No name matching or muscle similarity is used to infer equivalence.

### Outcome matrix

| Recorded outcome | Sequence result | Reason |
|---|---|---|
| STANDARD · COMPLETED · ≥1 working set | Advance | Existing full-session rule |
| STANDARD · PARTIAL | Hold current member | Existing STANDARD rule |
| REDUCED · COMPLETED · ≥1 working set | Advance | Existing difficult-day rule |
| REDUCED · PARTIAL · ≥1 working set | Advance | Existing REDUCED rule |
| Any completed/partial session with zero working sets | Hold | Recorded finish is not training evidence |
| RECOVERY, any status | Hold | Recovery protects capacity; it never consumes strength sequence |
| ABANDONED | Hold | No completion claim |
| Skipped/missed opportunity | Hold; create no record | No calendar debt and nothing happened |
| Non-member workout | Hold | Useful training, not an inferred programme substitution |

## 6. Full, short, minimum and home truth

The merged draft describes four useful forms, but runtime truth currently supports only:

- **Full:** the saved custom template used as STANDARD.
- **Minimum-like:** existing REDUCED resolution, the first two exercises at two sets each.
- **Recovery:** no strength-template advancement.

The draft's three-exercise **short** form and bodyweight **home** form are not saved template variants
and have no durable link to A/B/C. The first sequence implementation must not pretend otherwise.

Future linked variants should carry the parent sequence-member identity explicitly. Then:

- an approved short or minimum variant follows REDUCED advancement rules;
- an approved home variant advances only when it is explicitly linked to the current member and its
  recorded outcome meets the authorized rule;
- an improvised bodyweight workout remains non-member training unless Gavin explicitly identifies it
  as the linked alternative before starting.

This keeps honest history and avoids using exercise-name similarity as programme authority.

## 7. Capacity, shifts and recovery

Sequence order does not create a training date. Shifts, sleep and the existing lived-day system
determine whether an opportunity is sensible; capacity/recovery guidance determines the session form.

- GREEN/ordinary capacity may offer the next member as STANDARD.
- Existing REDUCED guidance may offer the next member in the existing REDUCED form.
- RECOVERY keeps the same next member queued.
- A RED override remains separately confirmed every time under the existing command guard.
- Missing a proposed opportunity does not advance, penalize, reschedule or create catch-up language.
- A schedule change moves opportunities, never the sequence cursor.

Delta may say: “B remains next. Recovery today does not change the programme.” It may not say Gavin
“failed B” because no due-date contract exists.

## 8. TRAIN and planning experience

### TRAIN home

When active, MY PROGRAMME should show:

- `ACTIVE SEQUENCE · A → B → C`;
- `NEXT · B — Pull and posterior chain`;
- why B is next, linked to the advancing A session or the activation start choice;
- current capacity form separately: STANDARD / REDUCED / RECOVERY;
- `START NEXT`, `CHOOSE ANOTHER`, `WHY?`, and `MANAGE PROGRAMME`.

The sequence chooses identity; capacity chooses form. They must never be compressed into an opaque
“smart workout” verdict.

The legacy built-in suggestion must not compete as a second primary workout while a sequence is
active. It remains the fallback only when no sequence is active. This is a future Protected
recommendation-composition amendment, not authorized by this design PR.

### Week Planner and Week Ahead

Do not assign A/B/C to future dates merely to fill a calendar. A future planning slice may label an
already-supported training opportunity with “Next in programme: B,” using the same projected cursor.
Unknown schedule/capacity remains unknown. Moving or missing the opportunity does not move B.

## 9. Template changes and unavailable members

Sequence identity uses template IDs, never names. At activation, retain enough confirmed snapshot
detail to compare later current records.

- **Edited member:** mark the programme `REVIEW REQUIRED`; show the exact before/current difference.
  The sequence's guided `START NEXT` pauses until Gavin reconfirms. Direct access to existing TRAIN
  tools remains available.
- **Archived or missing member:** abstain from resolving/starting that member. Offer `RESTORE`,
  `REPLACE MEMBER`, or `DEACTIVATE`; never silently skip to the next member.
- **Edit while a workout is active:** the active workout remains historical truth. Reconciliation
  applies only to future starts.
- **Replacement:** requires exact review and emits a new programme revision. Past sessions keep their
  original template IDs.

This is stricter than today's mutable-template behavior because activation is a confirmed composition,
not merely a reusable resource list.

## 10. Alternatives considered

- **Reuse the current WORK/OFF rotation mode:** rejected. It assigns sessions to positions in a work
  run and cannot express “next after qualifying completion.”
- **Put custom IDs into the built-in A/B/C Engine selector:** rejected. That selector owns a locked
  fixed dictionary and does not carry an owner-confirmed custom sequence.
- **Store a mutable `nextIndex`:** rejected. It creates a second fact that can drift from workout
  history, corrections and backups.
- **Advance when a planned date passes:** rejected. It creates catch-up debt and mistakes a calendar
  opportunity for recorded training.
- **Advance after any roughly similar workout:** rejected. Name/muscle similarity is not owner
  authorization or causal evidence.

The selected design extends the existing programme revision and derives state from existing workout
facts because it is the smallest coherent evolution of BEYOND.

## 11. Deactivation, undo and rollback

- **Deactivate** is an explicit confirmation that emits a new programme revision. Past programme and
  workout history remain. Default result is no active programme, not a guessed return to an older one.
- **Restore previous programme** is a separate inspectable choice. It writes a new revision containing
  the prior configuration; it never deletes or rewinds history.
- **Undo activation** is available only while the activation revision is still current. It restores
  the previously displayed programme and its previously projected next member through a new guarded
  revision. Any later programme change makes the undo stale and safely unavailable.
- Deactivation never archives templates. Archiving never silently deactivates or edits programme
  history.

## 12. Provenance, history and backup

Every programme revision remains USER-sourced and globally recorded through the existing causal event
spine. The sequence view exposes:

- who confirmed it (Gavin / USER);
- when it was activated or revised;
- ordered template IDs and confirmed snapshots;
- chosen starting member;
- the exact workout outcome that last advanced it;
- uncertainty or unavailable evidence when projection cannot be trusted.

Workout history remains in current session/set/event records. Programme history does not rewrite it.
Native backup already includes events and custom templates; a future event-shape amendment must prove
old backups still parse, new backups restore the sequence, and missing/malformed/forked history
abstains rather than selects a winner.

## 13. Failure handling

- Activation validates all three active template IDs and their snapshots inside the acquired write.
- A stale programme revision rejects the write and asks Gavin to reopen; no silent last-write-wins.
- Post-commit read failure reports “activated; receipt unavailable” and retries the read only—it does
  not repeat the command.
- Duplicate taps share or reject the same in-flight command; they cannot create two revisions.
- Broken/forked programme history preserves the current “Nothing has changed” safety response.
- Projection failure shows `NEXT UNKNOWN` with the blocking source; it does not fall back to A.
- Starting a sequence workout continues to use existing active-session idempotency and RED override.

## 14. Evolution map

| Existing BEYOND capability | GRAYSON treatment | Disposition |
|---|---|---|
| Custom templates and My Templates | Sequence members/resources | Preserve |
| Atomic three-template save | Activation entry context | Connect |
| `TRAIN_PROGRAM_SET` causal revisions | Add an explicit SEQUENCE mode later | Deepen carefully |
| Weekday and WORK/OFF assignment modes | Remain available alternatives | Preserve |
| Built-in Engine A/B/C selector | Fallback when no active sequence | Preserve; do not overload |
| `doesSessionAdvanceRotation` | Shared qualifying-outcome primitive | Reuse/standardize |
| STANDARD/REDUCED/RECOVERY and RED override | Capacity authority over active member | Preserve |
| Week Planner / Week Ahead | Later label real opportunities with projected next member | Connect later |
| Template mutable records | Detect change against activation snapshot | Deepen carefully |
| Name matching or calendar catch-up | Never programme authority | Reject |
| Separate sequence database/cursor | Duplicates causal programme/history truth | Reject |

## 15. Ranked implementation sequence

1. **Sequence activation and TRAIN next-member projection.** Extend the existing programme revision
   shape with SEQUENCE; exact confirmation, guarded undo/deactivation, derived next member, change/
   missing-member abstention, and TRAIN-only display/start. Full + existing REDUCED/RECOVERY only.
2. **Planning connection.** Label existing eligible opportunities in Week Planner/Week Ahead without
   turning them into due dates or duplicating the cursor.
3. **Linked short/home variants.** Only after durable parent-member identity and honest execution
   semantics are separately approved.
4. **Fast guided execution and consolidated learning review.** Apply the approved Delta intervention
   rule around existing set commands.
5. **Progress and Direction, then evidence-bounded programme adaptation.** No autonomous changes.

## 16. Smallest recommended implementation objective

### `GRAYSON-TRAIN-SEQUENCE-ACTIVATE-001`

Inside existing TRAIN, allow Gavin to activate exactly three existing custom templates as one ordered
sequence after an exact review. Extend the current programme revision/event validation rather than add
a table. Derive the next member from the activation plus existing qualifying workout evidence; show it
with source and capacity form; allow explicit start, guarded undo and deactivation; abstain on changed,
missing or conflicting data. Preserve weekday/work-rotation modes and all direct TRAIN access.

Stop before Week Planner/Week Ahead changes, linked short/home templates, programme adaptation,
exercise-content edits, new progression rules, Mission review or provider/dependency work.

This is **not authorized by this design**. It requires explicit Protected approval because it changes
programme event semantics and how owner programme identity composes with the current workout
suggestion.
