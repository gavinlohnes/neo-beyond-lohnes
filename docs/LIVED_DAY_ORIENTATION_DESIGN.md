# Lived-Day Orientation — Project Grayson Experience Design

Status: **OWNER-AUTHORIZED DESIGN PROPOSAL** — implementation not authorized.

This document designs the first proposed Project Grayson experience. It does not change TODAY,
recommendation authority, runtime naming, navigation, storage, or any functioning application surface.

## The job

When Gavin deliberately begins or returns to a newly begun lived day, help him answer—quickly and
truthfully:

1. How did I sleep, and what does BEYOND actually know?
2. How do I feel?
3. What kind of day am I entering?
4. What is fixed, important, or unusual?
5. What is the best existing next action or decision?
6. What should I prepare before the next fixed event?
7. Is there a thought I want to get out of my head?
8. Can I leave everything else alone for now?

The orientation is not a morning dashboard, readiness score, generated schedule, or motivational
speech. Gavin wakes at different clock times around shift work; the product follows the lived day and
his explicit start, not a conventional morning.

## Research disposition

### Personal baselines, not universal judgment

Oura and WHOOP demonstrate the usefulness of comparing sleep/recovery contributors with personal
baselines and explaining what affected a current reading. GRAYSON should reuse that explanatory
pattern while rejecting their single readiness/recovery score as a product model. BEYOND already has
personal ranges, explicit evidence floors, sleep debt, and source-bearing measurements.

- Oura readiness contributors: <https://support.ouraring.com/hc/en-us/articles/360057791533-Readiness-Contributors>
- WHOOP recovery: <https://support.whoop.com/s/article/WHOOP-Recovery?language=en_US>

**Disposition:** `ADAPT PATTERN`. Show measured facts against Gavin's own evidence where already
implemented; never synthesize a new universal orientation score.

### Draft, review, and undo—not silent planning

Sunsama's agentic daily planning drafts from connected context, exposes judgment calls, and lets the
user keep, change, or undo the result. The transferable principle is visible preparation plus operator
review. LIVED-DAY-ORIENT-001 is narrower: it assembles existing truth and opens existing actions; it
does not move work or draft a schedule.

- Sunsama Daily Planning: <https://help.sunsama.com/docs/usage-guides/daily-planning/>

**Disposition:** `ADAPT PATTERN`. Preserve review and explicit action; reject automatic task movement
and standing-rule learning from this objective.

### Brief subjective context remains necessary

Apple's State of Mind flow separates a current emotion from an overall daily mood and makes descriptors,
influences, and additional context optional. Recent systematic-review synthesis says mood monitoring can
add useful granularity but needs context, personalization, and careful burden/safety design; passive
signals are not a replacement for self-report.

- Apple State of Mind: <https://support.apple.com/en-bh/guide/iphone/iph6a6decb13/ios>
- Mood-monitoring review synthesis: <https://pubmed.ncbi.nlm.nih.gov/42228842/>

**Disposition:** `STANDARDIZE BOUNDARY`. The first orientation reuses the current numeric check-in and
offers CAPTURE. Richer thoughts, requested help mode, and sensitive mental-health controls belong to a
later Inner Day objective; do not smuggle them into the existing check-in event.

### Shift fatigue changes the interpretation of the day

NIOSH notes that nonstandard schedules can disrupt or shorten sleep and affect attention, memory, and
judgment. That supports treating shift context and sleep as first-class orientation facts. It does not
authorize a medical risk score, fitness-for-duty judgment, or diagnosis.

- CDC/NIOSH Fatigue and Work: <https://www.cdc.gov/niosh/fatigue/about/index.html>

**Disposition:** `STANDARDIZE CONTEXT`. Show shift timing and recorded sleep honestly; keep health and
fitness-for-duty decisions with Gavin and appropriate professional authority.

## Core design decisions

### 1. The explicit start remains the anchor

Do not infer that Gavin woke because the app opened, the clock reached a typical wake time, Garmin
reported a wake time, or the phone moved. Existing logging may start a lived day implicitly, but the
orientation is presented only after deliberate interaction.

- If no lived day exists, `START DAY` remains the one primary action.
- Tapping `START DAY` starts the canonical day, then opens Orientation.
- If another action already started the day, TODAY offers `ORIENT TODAY` as one visible, nonmodal
  invitation until reviewed or dismissed.
- A reviewed orientation remains reopenable from TODAY depth for the current lived day.
- It never auto-opens over a workout, Shift Down, correction, confirmation, or other active operation.

This preserves FIELD authority, prevents a surprise modal, and does not equate wake time with day start.

### 2. Orientation is a read-and-route surface

It composes existing reads and opens existing canonical actions. It does not create a second plan,
recommendation, check-in, task, preparation record, or training decision.

Allowed effects:

- `START DAY` through the existing command;
- opening the existing check-in;
- opening existing sleep, plan, training, preparation, routine, reminder, or record surfaces;
- opening CAPTURE;
- a device-local reviewed/dismissed marker for this lived day, if implementation discovery confirms
  that existing session/dismissal patterns are suitable.

Nothing else is saved merely by viewing or dismissing Orientation.

### 3. One hierarchy, not a dashboard

The phone surface has four levels:

1. **Orientation line:** the kind of day and next fixed event.
2. **You:** sleep evidence and check-in status.
3. **Before then:** at most three existing actions that are timely and already authoritative.
4. **Release:** what is not known or not time-sensitive, plus `ENTER TODAY`.

Do not show every available metric, task, project, routine, family record, or improvement opportunity.
DATA and COMMAND retain depth.

### 4. Workday and day-off compositions are genuinely different

The surface shares grammar, not content.

**Workday asks:** What must be ready before departure? Is training still an existing decision? What is
the next fixed shift event?

**Day off asks:** What recovery or chosen commitment is already relevant? Is there one due home/person
item? Can the rest stay open?

It must not treat a day off as a workday with the shift removed. It also must not infer that blank time
is available time.

### 5. Existing guidance stays singular

- A recorded Engine recommendation may be shown verbatim with its rationale and existing action.
- The approved pre-check-in draft may appear only under its existing rules and label.
- No orientation-specific ranking or recommendation is created.
- Training programme/suggestion is described as its current kind; it cannot compete with Engine
  guidance or imply that a scheduled workout is mandatory.
- Delta/Alfred can explain the assembled evidence only through an explicit ask. Orientation works
  completely offline and without an AI call.

### 6. Absence and failure remain visible

- Missing sleep: “No main sleep is recorded in the last 36 hours,” not “poor sleep.”
- Unknown work context: ask the existing work/off question; do not create a day-off composition.
- Unavailable source: show that the section could not be read; never represent it as empty.
- No due commitments: say there is no recorded time-sensitive item; do not say Gavin has nothing to do.
- No check-in: offer it; do not infer mood, energy, stress, or capacity from behavior or biometrics.

## Information contract

| Question | Canonical source | Surface rule | Not allowed |
|---|---|---|---|
| What kind of day? | recorded/confirmed/scheduled work context; Life State | one label + source route | mode pin as canonical truth |
| What is fixed next? | time-fixed shift window or saved calendar event | earliest genuinely time-fixed event; unknown remains unknown | treating a planned day, flexible obligation, or date-only deadline as fixed time |
| How was sleep? | current measured/sleep queries and corrections | duration/source; personal comparison only if current reader already supports it | new score or causal claim |
| How does Gavin feel? | existing submitted check-in | short status or `CHECK IN` | biometric mood/capacity inference |
| What is BEYOND recommending? | recorded Engine recommendation or approved draft | verbatim existing title/rationale and action | orientation ranking or competing advice |
| What needs preparation? | PREP, relevant routine, existing reminder/commitment | timely existing item, max three total actions | inventing checklist items or marking prepared as consumed |
| What about training? | current TRAIN home/programme/suggestion | current decision and route, subordinate to guidance | new workout recommendation |
| What should be captured? | CAPTURE | always-available secondary action | forced organization or AI transmission |
| What can wait? | absence of known time-sensitive records | bounded wording about known records only | declaring all other life safe to ignore |

## Attention and selection contract

The first implementation must not add a new recommendation arbitration system. Selection is
presentation-only and deterministic:

1. Active operation suppresses Orientation.
2. Unknown work context leads with the existing context question.
3. Existing Engine guidance retains its current authority and action.
4. A fixed shift/calendar event supplies the time horizon.
5. Existing due/late preparation or a due commitment can fill an action slot.
6. Existing check-in action fills a slot while incomplete.
7. Existing training decision may fill a slot when relevant and space remains.
8. CAPTURE is always available outside the action-slot ranking.
9. No more than three “before then” actions.

The implementation brief must verify that these rules only choose presentation and do not alter the
Engine, obligation relevance, reminder priority, or training recommendation semantics. If that cannot
be proven, stop for a separate recommendation-priority decision.

## Interaction flow

```text
NO ACTIVE DAY
    START DAY
        ↓ existing command
ORIENTATION · FIRST REVIEW
    understand → check in/capture/open an existing action → enter TODAY
        ↓
TODAY · ORIENTATION REVIEWED
    normal FIELD operation; orientation remains reopenable in depth

DAY ALREADY STARTED BY ANOTHER ACTION
    TODAY shows one ORIENT TODAY invitation
        ↓ review or dismiss
    invitation recedes for this lived day
```

Back/Escape returns to TODAY without recording review. `ENTER TODAY` records only the local disposition
marker, not a health or behavioral event. Interruption must restore Orientation at the same point;
opening and returning from check-in or CAPTURE refreshes the affected lines without losing the surface.

## Text wireframes

These describe hierarchy and behavior, not final visual styling.

### Workday, enough evidence

```text
BEYOND // ORIENTATION                         THU · WORK RUN

SHIFT AT 18:00
Leave-ready window begins at 17:20. Saved schedule.

YOU
Sleep        6h 42m · Garmin · below your usual work-day range
Check-in     Not answered                         [CHECK IN]

EXISTING GUIDANCE
Complete the reduced session.
Two short main sleeps were recorded.            [REVIEW]

BEFORE THE SHIFT
Prepare food and bottle                          [OPEN PREP]
Workout A remains today's programme decision     [OPEN TRAIN]

[CAPTURE A THOUGHT]

No other recorded time-sensitive item needs attention before the shift.
                                               [ENTER TODAY]
```

If the Engine has not issued guidance, the guidance block is absent. The surface never fills the gap
with Delta prose.

### Workday, sparse evidence

```text
BEYOND // ORIENTATION                            WORK CONTEXT UNKNOWN

WHAT KIND OF DAY IS THIS?
Your saved schedule predicts work, but the lived day is not confirmed.
                                               [ANSWER WORK / OFF]

YOU
No main sleep is recorded in the last 36 hours. [LOG OR REVIEW SLEEP]
Check-in not answered.                          [CHECK IN]

[CAPTURE A THOUGHT]                             [ENTER TODAY]
```

No fake summary, readiness state, or empty preparation list appears.

### Day off

```text
BEYOND // ORIENTATION                                DAY OFF

YOUR TIME
No fixed event is recorded before 15:00 tomorrow.

YOU
Sleep        8h 06m · Garmin · within your usual day-off range
Check-in     Energy 3 · Stress 2 · Mood 4

TODAY'S KNOWN CHOICES
Workout B is assigned to this day                 [OPEN TRAIN]
Smoke detectors are due this week                 [OPEN HOME]

Nothing else in your records needs a time this morning.
Leave the rest open, or plan it when you choose.  [OPEN YOUR LIFE]

[CAPTURE A THOUGHT]                               [ENTER TODAY]
```

The Home item appears only because it is already due through current records. No relationship prompt
is manufactured merely to fill space.

### Recovery / difficult capacity

```text
BEYOND // ORIENTATION                            RECOVERY

THE RUN IS OVER
This is the first day off. No fixed event is recorded before tonight.

YOU
Sleep        5h 18m · Garmin
Check-in     Energy 1 · Stress 4 · Mood 2

EXISTING GUIDANCE
Recovery first.                                  [REVIEW]

KEEP IT SMALL
One commitment is due today                      [OPEN]
Everything else remains where it is. No plan was changed.

[CAPTURE A THOUGHT]                              [ENTER TODAY]
```

This appears only from submitted check-in and existing guidance. It does not diagnose a difficult
period or silently cancel the day.

### Day already in motion

```text
TODAY

ORIENT TODAY
Your day started when you logged sleep. Review the starting point when useful. [OPEN]
```

The invitation stays subordinate to an active workout, Shift Down, correction, or urgent canonical
operation and may be dismissed.

## Delta's role in this release

The destination is Delta, but current runtime naming remains Alfred until a separate identity change.
The orientation must not make an automatic model call.

Allowed optional route:

> “Explain this orientation”

The current intelligence can receive the exact assembled source lines and answer within existing
source/provenance limits. It cannot add a new recommendation, infer missing state, move the plan, or
learn a standing rule from dismissal. Any future Delta wording should be concise and evidence-first:

> “You work at 18:00. Sleep was shorter than your usual work-day range, but you have not checked in,
> so I cannot tell how capable you feel. Food preparation is the only recorded time-sensitive item.”

## Experience and visual direction

- Phone-first full-height focus surface, not a modal card over a dashboard.
- Preserve black-dominant BEYOND identity, restrained red authority, yellow brand accent, sharp frames,
  accessible text, and reduced motion.
- One dominant orientation line; sections are typographic, not a wall of cards.
- Exact values and sources live near the claim; deeper evidence opens on demand.
- One filled primary action at most. `ENTER TODAY` may be primary only after any required context
  question is resolved; existing Engine action retains authority when present.
- CAPTURE and specialist routes are secondary.
- No readiness ring, score, character animation, motivational banner, streak, badge, gradient, or
  decorative telemetry.
- Opening from `START DAY` may use the existing one-time power-on transition; no looped animation.

## State and persistence proposal

Implementation discovery should prefer an existing local dismissal/session pattern. Proposed state:

```text
orientationDisposition = {
  livedDayId,
  status: REVIEWED | DISMISSED,
  at
}
```

This is device-local presentation state, not a domain event, backup fact, check-in, or evidence that
Gavin read or accepted any recommendation. If no suitable current primitive exists, the build brief
must explicitly justify a new device-local key; it may not introduce a Dexie migration by convenience.

## Failure and interruption

- Each independent source reads fail-closed. A failed commitment read cannot become “nothing due.”
- The shell remains usable if one source fails; show RETRY for that source or omit only when omission is
  explicitly named.
- Returning from a specialist action refreshes the orientation and preserves scroll/focus.
- App close/reload before review returns to the same unreviewed invitation.
- Day rollover expires the invitation and disposition state; no old orientation crosses into a new day.
- A source change during review updates the line and never implies the earlier value was confirmed.
- Offline operation is complete except already-online source refreshes, whose last-known/stale status
  remains visible under their existing contracts.

## Accessibility

- Logical heading order and named regions: Day, You, Guidance, Before Then, Release.
- Source and state never rely on color alone.
- Minimum 44px targets; thumb-reachable primary completion on common phone sizes.
- Focus moves into Orientation after explicit start, returns to the triggering control on exit, and
  moves deliberately into/returning from sheets.
- Screen-reader reading order matches visual priority.
- Dynamic refreshes announce only the changed line, not the whole orientation.
- Reduced motion receives no sweep; content remains identical.

## Proposed implementation slices

One Protected objective may use two implementation PRs if discovery shows reviewability benefits; the
owner approves the objective, not an automatic chain.

### Slice A — read contract and deterministic composition

- `LivedDayOrientation` application query composed from existing readers.
- Pure presentation selection with explicit source states and max-three action slots.
- Unit/integration coverage for every variant and source failure.
- No visible product change if separated from Slice B.

### Slice B — phone experience and routes

- Orientation surface, START DAY handoff, already-started invitation, disposition state, refresh/return.
- Workday/day-off/recovery/sparse compositions.
- Browser accessibility, interruption, 320/360/412px, reduced-motion, and visual evidence.

If both remain small and reviewable, one PR is preferable. Do not create slices merely to imitate a
campaign.

## Proposed build boundaries

### In

- Existing facts, source labels, existing actions, and existing current guidance.
- Workday/day-off/recovery/unknown/sparse composition.
- Direct START DAY handoff and optional later invitation.
- Device-local disposition, reopen, interruption/resume, fail-closed source states.
- Phone-first visual implementation within current identity.

### Out

- New domain data or event semantics.
- New mental-health fields, fasting, meal recommendations, learned departure checklist, relationship
  suggestion, tomorrow planning, evening reflection, or Life Stewardship logic.
- New recommendation ranking, automatic plan edits, notifications, or AI calls.
- Runtime GRAYSON/Delta rename, provider/model change, or increased autonomy.
- Primary navigation, global redesign, removal of Briefing Preview, or specialist-screen redesign.

## Acceptance scenarios

1. No active day: START DAY creates exactly one day and opens Orientation.
2. Another existing log starts the day: TODAY offers one subordinate orientation invitation.
3. Workday with Garmin sleep, no check-in, PREP open, and recorded guidance.
4. Workday with missing sleep and unavailable commitments source.
5. Day off with no due items: protected open time, not a productivity prompt.
6. Day off with one due Home item and assigned training: both retain their current meanings.
7. Recovery day with submitted low-capacity check-in and existing guidance.
8. Unknown work context: answer route leads; no workday/day-off assumption.
9. Active workout, Shift Down, correction, or confirmation suppresses Orientation.
10. Open check-in/CAPTURE/specialist, return, refresh, and retain place.
11. Dismiss/reopen/reload/rollover behave without domain writes or duplicate days.
12. Offline, partial failure, stale external data, reduced motion, keyboard, screen reader, and
    320/360/412px layouts remain complete.

## Field questions after a build

- Does Orientation reduce the number of places Gavin opens after waking?
- Does it make workday preparation clearer without feeling controlling?
- Does the day-off variant protect open time or accidentally create pressure?
- Are three action slots too many, too few, or context-dependent?
- Does Gavin use CAPTURE here, or is persistent global capture already sufficient?
- Does the check-in feel like useful context or a toll before seeing the day?
- Which source lines earn daily visibility after a full work rotation and first day off?

Field evidence should determine Lived-Day Closure and later navigation work.

## Proposed implementation authorization

If Gavin approves this design after review, the bounded instruction is:

> I approve LIVED-DAY-ORIENT-001 as a Protected implementation objective using the approved design.
> Build one optional lived-day Orientation by composing existing authoritative reads and actions for
> workday, day-off, recovery, unknown, and sparse states. Preserve the deterministic Engine, current
> recommendation semantics, operator confirmation, primary navigation, runtime BEYOND/Alfred identity,
> local-first operation, provenance, corrections, and every specialist route. No new schema/event,
> recommendation priority, inferred mood/capacity, fasting, notification, provider, dependency, AI
> autonomy, global redesign, evening closure, Shift Down redesign, or Google Drive change. Use a
> prototype/visual checkpoint before replacing any current TODAY composition; obtain independent
> exact-head review, green required CI, and my merge approval.

Until Gavin gives that approval, this remains design only.
