# Lived-Day Orientation — Project Grayson Experience Design

Status: **OWNER-APPROVED EXPERIENCE DESIGN** — implementation not authorized.

This document designs the first proposed Project Grayson experience. It does not change TODAY,
recommendation authority, runtime naming, navigation, storage, or any functioning application surface.

The 2026-11-19 owner review refined the opening hierarchy, Delta's voice, action limit, day-off
philosophy, and difficult-day response. These are destination design decisions, not claims about the
current runtime. Where they would change recommendation composition, the boundary is named rather
than silently treated as existing behavior.

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

The phone surface has six levels:

1. **Situation:** the kind of day, what changed, and next genuinely fixed event.
2. **You:** sleep evidence and check-in status.
3. **Delta:** a concise, qualified interpretation of the assembled evidence.
4. **Recommendation:** at most one primary recommendation when evidence justifies it.
5. **Supporting actions:** at most two timely existing actions or decisions.
6. **Release:** what is not known or not time-sensitive, plus `ENTER TODAY`.

Do not show every available metric, task, project, routine, family record, or improvement opportunity.
DATA and COMMAND retain depth.

The check-in improves this hierarchy but never gates it. Missing subjective information reduces
Delta's certainty; it never reduces Gavin's access or control.

### 4. The lived day's purpose changes the composition

The surface shares grammar, not content.

**Workday:** protect operational readiness. Food, departure preparation, necessary obligations, and
realistic training take precedence over maximizing output.

**Day off:** ask what would make the day well used before optimizing it. Rest, family, enjoyment,
maintenance, progress, or an intentionally open day are all legitimate purposes. Unallocated time is
not a problem to fill.

**Difficult day:** protect essentials and reduce load. One difficult submitted check-in may simplify
today; it does not label a difficult period. A sustained pattern may raise Delta's concern. Gavin's
explicit statement that he cannot manage the normal plan permits immediate reduction without waiting
for accumulated evidence.

**Recovery day:** use shift history, sleep, submitted check-in, and current guidance together. Never
infer recovery status from sleep alone.

**Unusual day:** lead with the material exception—a changed shift, family event, appointment, travel,
poor night, or other recorded change—and adapt the normal framing around it.

**Unknown context:** ask one existing context question instead of guessing.

It must not treat a day off as a workday with the shift removed, or a difficult day as a character
judgment. It must not infer that blank time is available time.

### 5. Delta uses adaptive analytical command

Delta is concise by default, explanatory when a tradeoff matters, direct when evidence is strong, and
gentler when uncertainty or vulnerability is high. Its directness may increase with evidence and
consequence, but its certainty may not exceed the evidence.

- Routine facts are brief.
- Meaningful tradeoffs include the evidence and reason.
- Strong evidence and meaningful consequence permit calm, man-in-the-chair direction.
- Sensitive or uncertain situations use qualified, non-diagnostic language.
- Repeated avoidance may earn a respectful challenge under the Project Grayson relationship ruling.
- Once Gavin makes an informed decision, Delta respects it unless material circumstances change.
- `WHY?` or `TALK TO DELTA` may expose deeper reasoning; the opening statement should usually remain
  two or three sentences.

The destination permits one primary recommendation and up to two supporting actions, or fewer when
evidence does not justify priority. This is a deliberate refinement of the first design's
presentation-only selection rule. It is **not implemented or authorized for implementation here**.
A future Protected brief must define how an Orientation recommendation relates to recorded Engine
guidance, the approved pre-check-in draft, preparation, commitments, and training. It may not create
two competing authoritative answers or describe a new priority as unchanged Engine behavior.

Orientation remains fully useful offline and makes no automatic model call. Deterministic composition
may use the approved Delta voice; an interactive explanation requires an explicit ask. Runtime naming
remains BEYOND/Alfred until separately changed.

### 6. Absence and failure remain visible

- Missing sleep: “No main sleep is recorded in the last 36 hours,” not “poor sleep.”
- Unknown work context: ask the existing work/off question; do not create a day-off composition.
- Unavailable source: show that the section could not be read; never represent it as empty.
- No due commitments: say there is no recorded time-sensitive item; do not say Gavin has nothing to do.
- No check-in: offer it; do not infer mood, energy, stress, or capacity from behavior or biometrics.
- A missing check-in never blocks Orientation or TODAY. It narrows what Delta can responsibly conclude.

## Information contract

| Question | Canonical source | Surface rule | Not allowed |
|---|---|---|---|
| What kind of day? | recorded/confirmed/scheduled work context; Life State | one label + source route | mode pin as canonical truth |
| What is fixed next? | time-fixed shift window or saved calendar event | earliest genuinely time-fixed event; unknown remains unknown | treating a planned day, flexible obligation, or date-only deadline as fixed time |
| How was sleep? | current measured/sleep queries and corrections | duration/source; personal comparison only if current reader already supports it | new score or causal claim |
| How does Gavin feel? | existing submitted check-in | short status or `CHECK IN` | biometric mood/capacity inference |
| What is current guidance? | recorded Engine recommendation or approved draft | preserve its kind, rationale, and authority | disguising a new priority as Engine output |
| What does Delta make of it? | assembled sourced facts plus current guidance | concise, uncertainty-matched interpretation | automatic model dependency, unsupported certainty, or diagnosis |
| What is primary now? | future Protected Orientation arbitration contract | no more than one recommendation; none when evidence is insufficient | competing authoritative answers or silent plan changes |
| What needs preparation? | PREP, relevant routine, existing reminder/commitment | timely existing item within the one-primary/two-supporting limit | inventing checklist items or marking prepared as consumed |
| What about training? | current TRAIN home/programme/suggestion | current decision and route, subordinate to guidance | new workout recommendation |
| What should be captured? | CAPTURE | always-available secondary action | forced organization or AI transmission |
| What can wait? | absence of known time-sensitive records | bounded wording about known records only | declaring all other life safe to ignore |

## Attention and selection contract

The desired composition is:

1. Active operation suppresses Orientation.
2. Unknown work context leads with the existing context question.
3. Situation and You establish sourced context before interpretation.
4. Existing Engine guidance retains its current kind, rationale, and action.
5. Delta states one uncertainty-matched interpretation.
6. At most one primary recommendation appears when the future arbitration contract justifies it.
7. At most two supporting actions may follow; CAPTURE remains available outside that limit.
8. A fixed shift/calendar event supplies the time horizon without converting flexible work to fixed time.
9. No justified priority means no primary recommendation.

The earlier presentation-only ordering remains the implementation-safe baseline:

1. Existing Engine guidance retains its current authority and action.
2. A fixed shift/calendar event supplies the time horizon.
3. Existing due/late preparation or a due commitment can fill an action slot.
4. Existing check-in action fills a slot while incomplete.
5. Existing training decision may fill a slot when relevant and space remains.
6. CAPTURE is always available outside the action-slot ranking.
7. No more than three “before then” actions.

The refined destination cannot be implemented by quietly relabelling those presentation rules. The
future implementation objective must either define the bounded recommendation composition with Gavin's
Protected approval or retain the baseline and defer Delta's primary recommendation. Obligation
relevance, reminder priority, Engine semantics, and training semantics remain unchanged unless
explicitly approved.

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
Check-in     Energy 3 · Stress 2 · Mood 3

DELTA
Your check-in supports training, but preparation is the constraint today.
Handle food and work items first. If time remains, use the shortened session.

RECOMMENDATION
Prepare food, water, and work items.              [OPEN PREP]

ALSO AVAILABLE
Review the shortened workout                     [OPEN TRAIN]
Capture something on your mind                    [CAPTURE]

No other recorded item requires attention before the shift.
                                               [ENTER TODAY]
```

This example expresses the approved destination, not current priority semantics. Its implementation
requires the bounded recommendation-composition decision named above. Without that approval, recorded
Engine guidance remains the only recommendation and Delta does not fill the gap with unsupported prose.

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

DELTA
You have good capacity and no immediate time pressure. One home responsibility
is due this week; the rest of the morning can remain open.

RECOMMENDATION
Decide what would make today feel well used before adding tasks. [PLAN MY DAY OFF]

ALSO AVAILABLE
Review today's workout                            [OPEN TRAIN]
Check the smoke detectors                         [OPEN HOME]

Nothing else needs a time this morning.
                                                   [ENTER TODAY]
```

The Home item appears only because it is already due through current records. No relationship prompt
is manufactured merely to fill space.

### Difficult capacity

```text
BEYOND // ORIENTATION                      WORKDAY · SHIFT AT 18:00

SHIFT AT 18:00
Leave-ready window begins at 17:20. Saved schedule.

YOU
Sleep        5h 18m · Garmin
Check-in     Energy 1 · Stress 4 · Mood 2
Pattern      Mood has declined across three submitted check-ins

DELTA
Today's normal plan is unlikely to be useful in its current form.
Protect the shift essentials and reduce everything else. This pattern has
continued for several days, so give it deliberate attention rather than
treating it as one bad morning.

RECOMMENDATION
Prepare food, water, and work items. Defer the full workout. [OPEN PREP]

ALSO AVAILABLE
Choose a short recovery session                  [OPEN TRAIN]
Talk to Delta                                    [OPEN]

No other plan has been changed.                              [ENTER TODAY]
```

This composition requires submitted check-ins and an actual supported trend, or Gavin's explicit
statement that he cannot manage the normal plan. It does not diagnose, silently cancel the day, or
change anything merely by appearing. Crisis response needs its own safety-reviewed objective and is
not designed or implemented here.

### Day already in motion

```text
TODAY

ORIENT TODAY
Your day started when you logged sleep. Review the starting point when useful. [OPEN]
```

The invitation stays subordinate to an active workout, Shift Down, correction, or urgent canonical
operation and may be dismissed.

## Delta's role in the destination experience

The destination is Delta, but current runtime naming remains Alfred until a separate identity change.
The orientation must not make an automatic model call.

The automatic opening statement is deterministic, source-bounded product composition—not an automatic
model call. An optional interactive route may provide deeper reasoning:

> “Explain this orientation”

The current intelligence can receive the exact assembled source lines and answer within existing
source/provenance limits. It cannot infer missing state, move the plan, or learn a standing rule from
dismissal. Any future Delta wording should be concise and evidence-first:

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

- Logical heading order and named regions: Situation, You, Delta, Recommendation, Supporting actions,
  Release.
- Source and state never rely on color alone.
- Minimum 44px targets; thumb-reachable primary completion on common phone sizes.
- Focus moves into Orientation after explicit start, returns to the triggering control on exit, and
  moves deliberately into/returning from sheets.
- Screen-reader reading order matches visual priority.
- Dynamic refreshes announce only the changed line, not the whole orientation.
- Reduced motion receives no sweep; content remains identical.

## Next objective after this design

The next proposal should be a bounded phone-first prototype/visual checkpoint, not production
implementation. It should let Gavin judge the hierarchy, density, adaptive voice, workday/day-off/
difficult-day differences, and one-primary/two-supporting limit using realistic states.

The prototype must not connect production commands, persist state, change TODAY, add recommendation
semantics, call a model, rename the runtime, or imply that its sample priority already exists. Its
handoff should identify the smallest implementable read contract and present explicit options for the
Protected recommendation-composition boundary. Gavin then decides whether to refine, reject, or
authorize implementation.

## Acceptance scenarios

1. No active day: START DAY creates exactly one day and opens Orientation.
2. Another existing log starts the day: TODAY offers one subordinate orientation invitation.
3. Workday with Garmin sleep, submitted check-in, PREP open, and justified guidance.
4. Workday with missing sleep and unavailable commitments source.
5. Day off with no due items: protected open time, not a productivity prompt.
6. Day off with one due Home item and assigned training: both retain their current meanings.
7. Difficult day from one low-capacity check-in, a sustained supported pattern, and an explicit
   “cannot manage the normal plan” statement remain distinguishable.
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
- Does one primary recommendation plus at most two supporting actions feel decisive without pressure?
- Does Gavin use CAPTURE here, or is persistent global capture already sufficient?
- Does the check-in feel like useful context or a toll before seeing the day?
- Which source lines earn daily visibility after a full work rotation and first day off?

Field evidence should determine Lived-Day Closure and later navigation work.

## Authorization state

The earlier proposed implementation instruction is superseded by the owner-approved refinement because
it prohibited the recommendation-composition decision the destination now requires. No implementation
authorization is implied. After a separately approved prototype/visual checkpoint, return to Gavin
with explicit options and an exact bounded Protected implementation objective.
