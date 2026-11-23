# GRAYSON Training Reality Forms

**Status:** owner-authorized Protected design candidate, objective
`GRAYSON-TRAIN-REALITY-FORMS-DESIGN-001` (2026-11-22). This document changes no product code,
programme, workout, Engine rule, event, command, schema, navigation, dependency, provider, backup or
Google Drive content. A later implementation requires its own bounded authorization.

## 1. Product judgment

GRAYSON's programme should survive reality without becoming five competing programmes.

> **The programme member answers what Gavin is training. The form answers what version fits reality.**

If B is next, FULL B, SHORT B, MINIMUM B and HOME B are inspectable ways to perform B. RECOVERY is
not B performed; it protects capacity while B remains next. A calendar opportunity, a similar list of
exercises or Delta's opinion never creates that identity. Gavin confirms it.

This gives Gavin a useful answer on a normal gym day, a compressed workday, a very low-capacity day,
a day when leaving home is unrealistic, and a recovery day—without guilt, catch-up debt or pretending
that unlike work is equivalent.

## 2. Repository truth

BEYOND already provides most of the required system:

- An active `SEQUENCE` programme records three owner-confirmed custom-template members, their exact
  snapshots and a chosen starting member in the append-only `TRAIN_PROGRAM_SET` revision chain.
- The next A/B/C member is derived from activation plus trustworthy workout outcomes. There is no
  mutable cursor and dates do not advance it.
- Workout sessions record a `templateId`, `STANDARD` / `REDUCED` / `RECOVERY`, status and times.
  Performed sets remain the evidence of work.
- `doesSessionAdvanceRotation` is the shared outcome rule: STANDARD advances only when COMPLETED,
  REDUCED advances when COMPLETED or PARTIAL, either requires at least one working set, and RECOVERY
  or ABANDONED never advances.
- A custom template is a mutable reusable record. Editing or archiving it never rewrites workout
  history. The active sequence protects identity with a confirmed snapshot and abstains when a base
  member changes, disappears or is archived.
- REDUCED is already deterministic for custom templates: the first two exercises, two working sets
  each. It is the truthful current minimum-like form.
- Direct “last time” and base progression evidence begin in a matching `templateId` + `sessionType`
  context. Re-entry timing and deload/stall evidence deliberately span templates by `exerciseId`, and
  every active custom template participates in the current progression sweep. A separate HOME
  template therefore does **not** by itself isolate bodyweight work from loaded guidance.
- Week Planner and Week Ahead now repeat the same authoritative next member on genuine opportunities,
  but remain read-only and create no due date.
- Native backup already includes custom templates, programme events, workout sessions and sets.

What does **not** exist:

- no `SHORT` or `HOME` session type;
- no durable parent-member link for a short or home template;
- no form provenance on a workout session;
- no safe inference that a bodyweight circuit is “Home B”;
- no atomic create/link/review journey for form templates;
- no form-aware history, progression or programme repair.
- no bodyweight-specific progression model or general suppression rule for HOME exercise guidance.

The gap is explicit identity and composition, not another exercise database, calendar or programme.

### Repository anchors

- Programme identity and projection:
  [`src/domain/workout/trainingProgramme.ts`](../src/domain/workout/trainingProgramme.ts),
  [`src/application/trainingProgramme.ts`](../src/application/trainingProgramme.ts),
  [`src/application/trainingProgrammeQueries.ts`](../src/application/trainingProgrammeQueries.ts)
- Custom-template lifecycle:
  [`src/domain/workout/customTemplate.ts`](../src/domain/workout/customTemplate.ts),
  [`src/application/customTemplateCommands.ts`](../src/application/customTemplateCommands.ts),
  [`src/application/customTemplateQueries.ts`](../src/application/customTemplateQueries.ts)
- Workout evidence and outcome rule:
  [`src/application/trainCommands.ts`](../src/application/trainCommands.ts),
  [`src/engine/trainSuggestion.ts`](../src/engine/trainSuggestion.ts)
- Current design authority:
  [`GRAYSON_TRAIN_INTELLIGENCE.md`](GRAYSON_TRAIN_INTELLIGENCE.md),
  [`GRAYSON_TRAIN_SEQUENCE_ACTIVATION.md`](GRAYSON_TRAIN_SEQUENCE_ACTIVATION.md)

## 3. Canonical form model

| Form | Identity and prescription | Runtime truth to preserve | Sequence consequence |
|---|---|---|---|
| **FULL** | The member's confirmed base custom template | Existing `STANDARD` execution | COMPLETED + ≥1 working set advances; PARTIAL holds |
| **SHORT** | A separately confirmed linked template, normally three essential movements | Execute its exact saved prescription; never REDUCED slicing | COMPLETED + ≥1 working set advances; PARTIAL holds |
| **MINIMUM** | Deterministic REDUCED projection of the base FULL template | Existing first two exercises × two sets | COMPLETED or PARTIAL + ≥1 working set advances |
| **HOME** | A separately confirmed linked no-equipment template | Execute its exact saved prescription; no similarity inference | COMPLETED + ≥1 working set advances; PARTIAL holds |
| **RECOVERY** | Existing recovery session; no strength template is claimed as performed | Existing `RECOVERY` authority | Never advances; current member remains next |

### Why SHORT and HOME use full-prescription completion rules

A linked SHORT or HOME template is already a deliberately smaller complete prescription. Treating a
PARTIAL result as completion would make “part of the fallback” equivalent to the confirmed member with
weaker evidence than FULL. MINIMUM already provides the deliberately lenient difficult-day rule.

The future implementation need not add `SHORT` or `HOME` to `SessionType`. It may execute those exact
linked templates through the existing STANDARD mechanics while retaining explicit form provenance.
This preserves RED override and set behavior. The visible form must never be reconstructed later from
the word “STANDARD”; it comes from the confirmed programme link and recorded start provenance.

### Form vocabulary

- `FULL`, `SHORT`, `MINIMUM`, `HOME`, `RECOVERY` are stable operator vocabulary.
- `STANDARD` and `REDUCED` remain underlying execution/session semantics where already authoritative.
- Do not show “standard home” or “reduced short.” One form is selected at a time.
- “Skipped” means Gavin chose not to train; it creates no workout and no programme movement.
- “Partial” describes a recorded workout outcome, never a personal failure.

## 4. Parent-member identity

The active programme revision remains the sole authority. Each A/B/C member should evolve from:

```text
member A
  FULL    → confirmed base template + snapshot
  SHORT   → optional linked template + snapshot
  MINIMUM → derived from FULL; no second template
  HOME    → optional linked template + snapshot
  RECOVERY→ existing form; no linked strength template
```

The link belongs to the **programme member**, not globally to the reusable custom-template record.
The same saved template may exist independently, but it is “HOME B” only while an owner-confirmed
programme revision links that exact ID and snapshot to member B.

Rules:

1. Form links use template IDs plus normalized snapshots, never names or muscle similarity.
2. A linked SHORT/HOME template ID may belong to only one member/form in one active sequence. Reusing
   one ID for A and B would make a recorded session causally ambiguous.
3. Two forms may have identical exercises only if Gavin confirms two distinct records/links. Content
   equality does not collapse identity.
4. Linking, replacing, unlinking or reconfirming a form creates a new guarded programme revision. It
   never mutates an older revision or a workout.
5. A form revision preserves the currently projected next member. It is configuration, not training.
6. A future workout start records the active programme revision ID, member key and selected form as
   optional provenance alongside the existing template/session facts. Old sessions remain valid with
   “form not recorded.”
7. Sequence projection trusts the recorded parent/form provenance and the active historical revision
   at start. It never joins by exercise names after the fact.

This can be implemented through additive optional payload/row fields and an extended programme
revision shape; whether that is the smallest safe implementation must be verified in its own
Protected objective. This design does not authorize that change.

## 5. Creating and confirming forms

### Entry point

`TRAIN → MY PROGRAMME → FORMS` shows three member rows. Each row always shows FULL, MINIMUM and
RECOVERY; SHORT and HOME show `NOT SET` until confirmed.

### Add SHORT or HOME

1. Choose member and form: `B → ADD HOME`.
2. Choose `CREATE A FORM` or `LINK AN EXISTING TEMPLATE`.
3. GRAYSON may prepare a draft from the confirmed member and stated equipment/time, but calls it a
   draft. No link exists yet.
4. Inspect the exact exercises, order, sets, rep ranges, equipment and what the form cannot cover.
5. Review authority: `Completing this exact template can advance B. Similar workouts will not.`
6. One explicit confirmation atomically creates/selects the template and writes the guarded programme
   revision. A partial create without a link, or a link without its template, is not success.
7. Receipt: `HOME B LINKED`, source/time, exact template, `UNDO LINK` while causally safe.

### Proposed content rules

These guide drafts; Gavin still confirms the prescription.

**SHORT**

- normally 25–35 minutes and three essential movements;
- retain the member's primary emphasis plus balanced push/pull/lower coverage across the weekly A/B/C
  programme, rather than force every short session to reproduce every full exercise;
- use available Planet Fitness equipment and the same exercise IDs where the movement truly matches;
- state what was omitted; do not claim equal volume or stimulus.

**HOME**

- normally 15–30 minutes, bodyweight only unless Gavin explicitly records available home equipment;
- squat/lunge, push-up level, bridge/hinge pattern, core and mobility as appropriate;
- explicitly acknowledge the absence of meaningful loaded pulling when there is no safe household
  pull option; never invent door/table equipment or call a weak substitute equivalent;
- progress through reps, tempo, range of motion or harder confirmed variations, not fictional load;
- preserve the member's mission where possible, while admitting what the home environment cannot
  reproduce.

### Starting drafts from the existing saved-plan design

The merged `graysonPlanDraft` already defines the donor mapping below. These remain drafts until
Gavin reviews the exact prescription; this design does not save them.

| Member | SHORT starting draft | HOME starting draft |
|---|---|---|
| A · Bench strength | Barbell bench press; leg press; seated cable row | Appropriate push-up level; chair/bodyweight squat; prone Y-T-W; close-grip incline push-up; sit-up practice |
| B · Pull/posterior | Dumbbell Romanian deadlift; lat pulldown; machine shoulder press | Glute bridge; prone Y-T-W; elevated pike push-up if appropriate; incline push-up; plank/dead bug |
| C · Bench volume/balance | Barbell bench press; reverse lunge; one-arm dumbbell row | Appropriate push-up level; bodyweight reverse lunge; prone Y-T-W; close-grip incline push-up; bodyweight calf raise or timed sit-up practice |

The SHORT drafts preserve the first three foundation movements already chosen by the guided plan.
The existing draft donor changes the display names but retains the loaded exercise IDs and increments;
it is therefore safe as a preview only and must **not** be saved directly as HOME execution truth. A
future HOME implementation must create/select bodyweight-specific exercise IDs and prescriptions for
push-up levels, bodyweight squat/lunge, bridge, prone Y-T-W, pike push-up, calf work and core. The HOME
drafts cap ordinary movements at about two controlled sets and require Gavin to choose an appropriate
push-up/pike level. Prone Y-T-W is labelled scapular/postural movement, not a replacement for cable,
dumbbell or pulldown loading. The final C accessory is chosen during exact review rather than silently
making a six-movement home session.

### No mandatory setup burden

Forms are optional. FULL/MINIMUM/RECOVERY remain usable before any linked templates exist. GRAYSON
may offer `SET UP HOME OPTIONS` after programme activation or a relevant direct request; it never
blocks TRAIN or repeatedly nags.

## 6. Choosing a form

TRAIN continues to lead with today's current member and one form:

```text
NEXT · B — Pull and posterior
FORM · FULL
Planet Fitness · about 55 min

[ START NEXT ]
  CHANGE FORM
```

`CHANGE FORM` opens a compact comparison:

| Form | What Gavin sees |
|---|---|
| FULL | exact full prescription, estimated time from comparable sessions |
| SHORT | linked name, three movements, estimated time, omissions |
| MINIMUM | exact first two FULL movements × two sets; “a useful floor, not the full session” |
| HOME | exact linked bodyweight prescription and stated coverage limit |
| RECOVERY | recovery work; “B remains next” |

The current capacity/recovery authority may recommend FULL, MINIMUM or RECOVERY as it does today. It
does not silently select SHORT or HOME merely because time or location seems constrained. Gavin may
choose them directly. A later evidence-bounded suggestion requires separate approval.

Form selection never changes the A/B/C member. Choosing HOME while B is next means HOME B. Choosing
HOME C deliberately out of order names the consequence before start: a qualifying completion makes A
next, following the existing out-of-order rule.

## 7. Advancement and direct choice

Projection scans causal workout outcomes as it does now, with one additional identity check: which
member/form did the confirmed start provenance name?

| Action/outcome | Programme result |
|---|---|
| FULL current member · COMPLETED · ≥1 working set | Advance |
| FULL current member · PARTIAL/ABANDONED/zero working sets | Hold |
| SHORT linked to current member · COMPLETED · ≥1 working set | Advance |
| SHORT · PARTIAL/ABANDONED/zero working sets | Hold |
| MINIMUM current member · COMPLETED or PARTIAL · ≥1 working set | Advance |
| HOME linked to current member · COMPLETED · ≥1 working set | Advance |
| HOME · PARTIAL/ABANDONED/zero working sets | Hold |
| RECOVERY | Hold |
| Missed/moved opportunity | Hold; write nothing |
| Similar but unlinked bodyweight/custom workout | Hold; real history, non-member training |
| Linked form for another member chosen deliberately | Advance from the member actually completed |
| Form identity/evidence missing or conflicting | `NEXT UNKNOWN`; abstain |

No form grants more authority than the evidence supports. “I did push-ups at home” may be useful
training but is not HOME B unless Gavin selected the confirmed HOME B before starting.

## 8. History, progression and evidence

### History

Workout history shows the form recorded at start:

```text
B · HOME · COMPLETED
Bodyweight squat · Push-up · Glute bridge · Core
Advanced programme to C
```

Older workouts without form provenance retain their current STANDARD/REDUCED/RECOVERY label. They
are never retroactively classified.

### Progression

- FULL STANDARD history stays with the base template and STANDARD context.
- MINIMUM stays with the base template and existing REDUCED context.
- SHORT uses its own template ID, so direct last-session comparison remains in the short prescription;
  shared loaded exercise IDs may still correctly inform re-entry/deload under the existing rule.
- HOME requires bodyweight-specific exercise IDs instead of reusing a loaded press/row/squat ID under
  a new name. Template identity alone is insufficient because current re-entry and deload span
  templates by exercise ID.
- The first HOME implementation must suppress current weight-based progression/advisory output for
  every HOME-linked template. Otherwise a 0-lb set at the top of its rep range can produce a fictional
  `+5 lb` suggestion, and current custom-template sweeps would surface it outside the form screen.
- Weight `0` remains a valid bodyweight record. Reps, tempo/range, leverage or variation progression
  needs a separately designed bodyweight rule and supported fields; until then HOME shows recorded
  history and `NO FORM-SPECIFIC PROGRESSION`, not INCREASE/HOLD/REDUCE fiction.
- Exercise-level history may show bodyweight facts, but no loaded progression, re-entry or deload
  evidence is imported into HOME and no HOME record alters loaded-lift progression through a shared ID.

### Claims

Completing a form shows what was recorded and whether it advanced the programme. It does not claim
equal hypertrophy, calorie expenditure or fitness effect across forms. SHORT/HOME are useful approved
alternatives, not mathematically equivalent doses.

## 9. Editing, archival and repair

| Change | Required behavior |
|---|---|
| Base FULL edited/archived/missing | Existing member-level `REVIEW REQUIRED`; guided start for all forms pauses until member identity is repaired |
| Linked SHORT/HOME edited | That form becomes `REVIEW REQUIRED`; FULL, MINIMUM and RECOVERY remain available if the base is sound |
| Linked SHORT/HOME archived/missing | That form is unavailable; never fall back to a similar template; other valid forms remain |
| Variant replaced | Exact old/new review, new guarded programme revision, current next member preserved |
| Variant unlinked | Confirm consequence; reusable template remains unless separately archived |
| Template archived directly | Link remains inspectable as unavailable; no silent programme rewrite |
| Edit during an active workout | Active session keeps its recorded start provenance; repair applies only to later starts |

`UNDO LINK/REPLACE` is offered only while the programme revision is still current. A later programme
change makes it stale. Repair never rewrites historical sessions or sets.

## 10. Backup, provenance and compatibility

A future implementation must prove:

- old backups with no form links restore as FULL/MINIMUM/RECOVERY-only programmes;
- linked-template records and programme revisions restore together;
- optional session/form provenance survives export/import;
- missing/malformed/forked programme history abstains rather than choosing a link;
- archival remains non-destructive;
- programme revision source/time, exact snapshots and the owner confirmation remain inspectable;
- a failed atomic create/link leaves neither an orphan template nor a partial programme revision;
- post-commit receipt failure retries the read, never the write.

No new database table is justified. Existing custom templates, programme events, workout sessions and
sets are sufficient if the future objective proves its additive compatibility and event validation.

## 11. Delta behavior

Delta is concise and evidence-bounded.

**Normal day**

> “B is next. Full is appropriate based on the current capacity reading. The short and home forms are
> available if your time or location changes.”

**Time-limited request**

> “Use Short B. It keeps the primary pull, one lower-body movement and one press. It omits two
> accessory movements. Completing it advances the programme; a partial result does not.”

**Does not want to leave home**

> “You do not need the gym to preserve the sequence. Home B is 22 minutes and bodyweight only. It
> cannot reproduce loaded pulling, so it is a practical fallback—not an equivalent dose.”

**Very low-capacity day**

> “Minimum B is the smaller useful floor: the first two movements, two sets each. Recovery remains
> available if training is not the right call.”

**Recovery**

> “Recovery today does not consume B. B remains next.”

**Unlinked improvisation**

> “That workout can still be recorded. It is not a confirmed B form, so it will not move the
> programme.”

Delta is silent after normal sets, brief when an adjustment is justified, immediate for reported
pain/safety concerns, detailed on demand, and consolidates learning after the workout. This design
does not implement that later execution layer.

## 12. Phone journeys

### A. Planet Fitness, normal capacity

1. TRAIN: `NEXT · A`, `FORM · FULL`, gym/equipment and time.
2. `START NEXT` uses the existing confirmation and active-workout path.
3. Sets remain fast; no form explanation repeats during execution.
4. Finish: recorded facts, `A COMPLETE · B IS NEXT`, one learning review.

### B. Only 30 minutes before work

1. TRAIN: `NEXT · B`, `FORM · FULL`; Gavin chooses `CHANGE FORM`.
2. SHORT B preview shows exact three movements, approximately 28 minutes and omissions.
3. `USE SHORT B` confirms the form but does not start until the existing start action.
4. COMPLETED advances to C; PARTIAL says `B remains next` without guilt.

### C. Bad day, will not leave home

1. `CHANGE FORM → HOME`.
2. HOME C shows bodyweight-only prescription and the honest loaded-pull limitation.
3. `START HOME C`; no location inference or equipment claim.
4. Completion with work recorded advances to A. Partial/abandoned holds C.
5. Delta asks one optional post-workout learning question, not a motivational speech.

### D. Very low capacity

1. Existing capacity authority recommends REDUCED; UI names the operator form `MINIMUM`.
2. Exact first two FULL exercises × two sets are inspectable before start.
3. PARTIAL with a working set can advance under the existing REDUCED rule; the consequence is shown
   before finish as it is today.

### E. Recovery

1. TRAIN keeps `NEXT · A` visible and shows `FORM · RECOVERY` separately.
2. Receipt: `RECOVERY RECORDED · A REMAINS NEXT`.
3. Week Planner continues to show A on the next real opportunity; no rescheduling occurs.

### F. Form needs review

1. HOME B row says `CHANGED · REVIEW BEFORE USE`.
2. FULL B, MINIMUM B and RECOVERY remain available if the base member is valid.
3. Review shows confirmed versus current prescription; `RECONFIRM`, `REPLACE`, `UNLINK`, `NOT NOW`.
4. `NOT NOW` writes nothing and never silently uses the changed template.

### G. No forms configured

TRAIN behaves exactly as it does after sequence activation: FULL plus existing REDUCED/RECOVERY.
`SET UP SHORT OR HOME` is optional depth in MY PROGRAMME, not a gate.

## 13. Failure and recovery

- Double confirmation creates one link/revision.
- Stale programme or template state rejects before writing and preserves the reviewed draft.
- Creating a form and linking it is atomic; no orphan on interruption.
- An active workout always resumes with the recorded member/form, even if the linked template changes.
- Missing start provenance cannot be guessed from template content; sequence projection abstains.
- If a linked form becomes unavailable after selection but before start, start is refused with the
  preserved choice and a route to FULL/MINIMUM/RECOVERY.
- Offline operation uses local records exactly as current TRAIN does; no provider is required.
- Pain or safety reports pause the affected movement; no diagnosis or automatic replacement.

## 14. Alternatives considered

### Infer a form from its name or exercises — REJECT

“Home B” text or similar muscles is not owner-confirmed identity and becomes ambiguous after edits.

### Add five independent programmes — REJECT

This fragments direction, creates competing cursors and makes a difficult day a programme change.

### Store links on mutable custom-template rows — REJECT

Global mutable metadata cannot preserve historical programme meaning or guarded revisions. A template
may be reusable outside this sequence.

### Use REDUCED for SHORT — REJECT

Current REDUCED always slices the first two exercises to two sets. It cannot execute a confirmed
three-movement short prescription without lying about the form.

### Treat all fallbacks as STANDARD without form provenance — REJECT

Execution might work, but history could not explain whether Gavin chose FULL, SHORT or HOME or why a
session advanced.

### Add a form table or mutable cursor — REJECT

Existing programme revisions, templates, sessions and events are sufficient. Another authority store
would drift.

## 15. Evolution map

| Existing capability | GRAYSON treatment | Disposition |
|---|---|---|
| Base A/B/C custom templates | FULL member identity | Preserve |
| REDUCED first-two/two-set rule | MINIMUM form | Reframe visibly; preserve semantics |
| RECOVERY | Recovery form that never consumes member | Preserve |
| Custom templates | SHORT/HOME prescriptions | Reuse |
| Programme revision chain | Owner-confirmed form links/snapshots | Deepen carefully |
| Workout session/event provenance | Optional member/form identity at start | Deepen carefully |
| Set history and direct last-session progression | Matching template/session context | Preserve |
| Cross-template re-entry/deload by exercise ID | Loaded forms only; HOME uses distinct IDs and suppresses weight progression | Bound in first HOME implementation |
| Week planning connection | Repeats member, not form/date obligation | Preserve |
| Similarity/name inference | Programme authority | Reject |
| Separate form programme/table/cursor | Duplicate truth | Reject |

## 16. Ranked evolution sequence

1. **Linked HOME forms plus progression isolation.** Prove explicit member/form identity, atomic
   review/link, start provenance, honest advancement, history and repair with bodyweight-specific
   exercise IDs and suppression of current weight-based progression for HOME-linked templates.
2. **Linked SHORT forms.** Reuse the same identity mechanism for a confirmed three-movement/time-
   limited prescription; no REDUCED slicing.
3. **Unified form chooser and receipts.** Present FULL/SHORT/MINIMUM/HOME/RECOVERY consistently once
   both links exist; preserve the existing first-screen start priority.
4. **Fast guided execution and consolidated learning review.** Apply the approved Delta intervention
   rule around unchanged set commands.
5. **Training Progress and Direction.** Interpret form-specific evidence without claiming equivalent
   dose or causal muscle growth.
6. **Evidence-bounded form suggestions/adaptation.** Only after field use and separate authority.

## 17. Smallest recommended implementation

### `GRAYSON-TRAIN-HOME-LINK-001`

Inside MY PROGRAMME, let Gavin create or select and exactly review one bodyweight-only HOME template
for each active A/B/C member, then confirm all links through one guarded programme revision. Record
member/form/revision provenance when starting a linked HOME session; show HOME in active workout and
history; advance only when the exact linked form is COMPLETED with at least one working set; hold on
PARTIAL, ABANDONED, RECOVERY, zero working sets or missing/conflicting evidence. A changed/archived
HOME form becomes unavailable without blocking valid FULL, MINIMUM or RECOVERY paths. Preserve atomic
creation/linking, undo, backup compatibility, direct choice and all current capacity authority. HOME
prescriptions must use bodyweight-specific exercise IDs, and the objective must suppress existing
weight-based progression, re-entry and deload output for HOME-linked templates everywhere it can
surface. It must prove loaded histories remain unchanged.

Stop before SHORT forms, form suggestions, automatic drafting, a new bodyweight progression rule,
programme adaptation, exercise demonstrations, navigation, providers or dependencies. Suppression of
inapplicable loaded progression is part of truthful HOME execution, not authority to invent a new rule.

This implementation would cross programme event/command and backup-contract boundaries. It is **not
authorized by this design objective** and requires a separately approved Protected brief with exact
validation and migration/compatibility evidence.
