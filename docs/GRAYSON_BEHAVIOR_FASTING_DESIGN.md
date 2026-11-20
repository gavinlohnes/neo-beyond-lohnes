# Project Grayson — Daily Signals and Eating Window

Status: **OWNER-AUTHORIZED DESIGN, NOT IMPLEMENTATION** — 2026-11-20
Objective: `GRAYSON-BEHAVIOR-FASTING-DESIGN-001`

This document designs two connected capabilities:

1. **Daily Signals** — a low-friction surface for a small owner-chosen set of behaviors and conditions.
2. **Eating Window** — a customizable, shift-aware time-restricted-eating programme that treats fasting as a tool,
   not an achievement.

It evolves current BEYOND capability under the [GRAYSON Evolution Rule](PROJECT_GRAYSON_VISION.md#grayson-evolution-rule).
It does not authorize new events, storage, product UI, advice or recommendation authority.

---

## 1. Product ruling

The owner-supplied lifestyle screen contributes a useful interaction: a short daily list can make recording a
behavior nearly effortless. Its binary X/check treatment is insufficient for alcohol, uncertainty, quantity,
correction or a day that is not yet over. The owner-supplied nutrition screen contributes readable daily intake and
meal entry points, but breakfast/lunch/dinner and midnight-based weeks do not fit Gavin's lived day or rotating
18:00–06:00 work.

GRAYSON will copy neither product. The donor patterns are:

- one-glance day context;
- very low-cost logging;
- a visible week without streak pressure;
- direct entry into food;
- progressive disclosure when context matters.

**Decision:** Daily Signals is a shared presentation and capture surface over domain-owned facts. It is not a generic
habit database and does not replace Quit, meals, training, check-ins or experiments. Eating Window is a programme
inside the connected Body system, not a timer game. Alcohol reduction remains part of the existing Quit mission.

### North-star test

A signal earns space only if recording it can help Gavin understand current reality, act safely, evaluate an
owner-chosen plan or give Delta evidence that may become useful later. A signal is not added merely because another
app tracks it.

---

## 2. Repository truth and evolution map

| Need | Existing BEYOND truth | Disposition |
|---|---|---|
| Alcohol intention | One current `QuitHabit` with name, cost and owner-written plans | **PRESERVE + DEEPEN** |
| Alcohol urge | Check-in `alcoholUrge` plus timestamped `URGE_LOGGED` with trigger and undo | **PRESERVE + CONNECT** |
| Abstinent day | Explicit, idempotent `CLEAN_DAY_LOGGED`; never inferred; no resetting streak | **PRESERVE** |
| Trigger response | `URGE_PLAN_RESPONDED` records whether Gavin used his plan | **PRESERVE** |
| Alcohol consumed | No structured amount/time/context record | **ADD CAREFULLY** in a separate Protected build |
| Meals | Timestamped saved meals and nutrition totals, correction/removal paths | **PRESERVE + CONNECT** |
| Fasting/window | No setting, interval or UI | **ADD CAREFULLY** under campaign C4.8 |
| Lived context | 16:30 lived-day boundary, WORK/OFF truth, shift run and life states | **PRESERVE + USE** |
| Strength safeguards | Protein, calories, programme, sessions, performance and recovery context | **CONNECT** |
| Personal evaluation | Whole Picture and `tryExperiment.ts` compare similar recorded days with uncertainty | **PRESERVE + DEEPEN** |
| Guidance authority | Deterministic Engine; Delta copy may explain but not invent advice | **PRESERVE** |

No parallel alcohol tracker, nutrition diary, experiment store, generic habit engine or midnight calendar should be
created.

---

## 3. Daily Signals

### 3.1 What it is

Daily Signals is a compact owner-configured list for facts that benefit from one-look capture. Each signal keeps its
domain meaning and input shape. The list may contain:

- alcohol status;
- eating-window status;
- alcohol urge (existing check-in/urge path);
- light or vigorous activity (derived when known, explicit only when not);
- an owner-approved future signal.

The system must not ship a large default checklist. Alcohol and Eating Window are in scope because Gavin chose them.
Exercise should be derived from existing workout/activity truth where possible rather than asking him to report the
same fact twice.

### 3.2 State is not binary

The screen distinguishes:

- **Recorded no** — Gavin explicitly says it did not happen.
- **Recorded yes** — Gavin explicitly says it happened.
- **Known from records** — a domain record already establishes it.
- **Not yet recorded** — absence of evidence, not “no.”
- **Not applicable** — intentionally excluded for this lived day.
- **Unreadable** — the source failed; never shown as “no.”

Today is never declared alcohol-free merely because no drink has been recorded. A clean day remains an explicit
owner act through the existing Quit contract.

### 3.3 Phone composition

```text
DAILY SIGNALS                                      TODAY

Alcohol                                             —
Not recorded                         [NO ALCOHOL] [DRANK]

Eating window                              12 h 18 m
14:10 plan · 10-hour eating window            [OPEN]

Training                                     KNOWN
Strength B completed 17:12                    [VIEW]

Missing is unknown, not failure.
```

The week view uses neutral marks: recorded no, recorded yes, known, not applicable and unknown. It shows no perfect
ring, completion percentage, longest run, badge or broken streak.

---

## 4. Alcohol: stop support without shame or duplicate truth

### 4.1 Mission

Gavin's stated direction is to stop drinking. GRAYSON should support abstinence while remaining honest when alcohol
is consumed. It must not make a lapse harder to record, turn it into a character verdict or erase the existing clean
days and urge history.

### 4.2 Daily interaction

The alcohol row offers:

- **NO ALCOHOL** — invokes the existing clean-day confirmation, with its current idempotence and undo/correction
  policy preserved.
- **DRANK** — a future separately approved record, not an inverse clean-day event.
- **URGE** — opens the existing trigger and if-then-plan path.
- **NOT NOW** — closes without inventing a fact.

If **DRANK** is selected, the minimum useful record is:

- occurred-at or a time range, explicitly recorded or corrected;
- approximate number of standard drinks, optional when Gavin cannot reasonably estimate it;
- context chips: after shift, stress, tired, social, bored, meal, other;
- planned / unplanned / prefer not to say;
- optional note.

A US standard drink contains about 14 g (0.6 fl oz) of pure alcohol. Container count is not automatically drink
count; mixed drinks and high-ABV servings may contain more than one. GRAYSON should eventually reuse the
[NIAAA standard-drink method](https://www.niaaa.nih.gov/sites/default/files/Mini-Poster-Alcohol-Drink-Sizes-and-Signs-of-Problem.pdf)
as education/calculation, not as a diagnosis.

### 4.3 Delta behavior

Allowed after enough comparable records:

> “Three of four recent urges were after your final shift. That is a repeated timing pattern, not a cause.”

> “Alcohol was recorded on two days with shorter sleep. There are too few comparable days to tell whether the two
> move together.”

After a recorded use:

> “You intended not to drink and recorded that you did. Do you want to name what changed, adjust the plan, or leave
> it here?”

Not allowed:

- “You failed,” “you broke your streak,” or celebratory abstinence confetti;
- inferring use from an urge, missing clean day or poor sleep;
- diagnosing alcohol use disorder;
- claiming alcohol caused a sleep, mood, training or relationship outcome from temporal proximity;
- repeatedly prompting after Gavin declines reflection.

### 4.4 Withdrawal safety boundary

The setup must ask, privately and neutrally, whether stopping has previously caused shaking, sweating, racing pulse,
severe anxiety, vomiting, seizures, confusion or similar withdrawal symptoms, and whether drinking is prolonged and
heavy. It must state that sudden cessation after chronic heavy drinking can be dangerous and medical support may be
needed. This is a routing safeguard, not an assessment or detox plan. See
[NIAAA clinical guidance](https://www.niaaa.nih.gov/health-professionals-communities/core-resource-on-alcohol/alcohol-use-disorder-risk-diagnosis-recovery)
and [Rethinking Drinking](https://rethinkingdrinking.niaaa.nih.gov/thinking-about-change/cut-down-or-quit).

If Gavin reports high-risk withdrawal history, GRAYSON does not prescribe tapering. It recommends professional
medical help before an abrupt stop and keeps ordinary recording available.

---

## 5. Eating Window programme

### 5.1 Name and purpose

The ordinary surface is **Eating Window**. “Fasting” appears in education and search. The programme helps Gavin
test whether limiting eating times supports his chosen goal while protecting protein, energy intake, training,
recovery, mood and work safety.

Completion is not success by itself. A programme that consistently harms protein intake, training, recovery or
safe functioning is not working even if every timer reaches its target.

### 5.2 Programme levels

| Programme | Eating window | Burden and use |
|---|---:|---|
| 12:12 | 12 hours | Widest preset; learn actual timing and close late grazing without aggressive restriction |
| 14:10 | 10 hours | Moderate preset; recommended first experiment for Gavin unless safety/context says otherwise |
| 16:8 | 8 hours | Narrow preset; less time to meet energy and protein needs |
| 18:6 | 6 hours | Narrowest supported preset; explicit fueling and training acknowledgement required |
| Custom | 6–16 hours | Owner-defined within the supported daily TRE range |

The duration is the name: there is no beginner-to-advanced ladder and no implied destination. One-meal-a-day, 20:4, alternate-day and
multi-day fasting are outside the first product. They are not hidden “expert levels.”

### 5.3 Schedule follows life, not weekdays

One setting cannot fit Gavin's rotation. Templates may be assigned to:

- work night — first of run;
- work night — later in run;
- post-shift/recovery;
- flip day;
- ordinary day off;
- training day override;
- family/social exception;
- difficult-day suspension.

Each template has planned eating-open and eating-close times, target duration, allowed flexibility and whether it is
active. Times are attached to the applicable lived day and may cross midnight. A temporary adjustment changes only
that occurrence unless Gavin explicitly changes the template.

The initial candidate is **14:10 as a bounded experiment**, not an automatic prescription or a step toward a longer
fast. A
12-week randomized trial found a self-selected 10-hour eating window feasible in 24-hour shift workers, but evidence
specific to shift workers remains sparse and does not establish Gavin's ideal window:
[Healthy Heroes trial](https://pmc.ncbi.nlm.nih.gov/articles/PMC9536325/) and
[2026 systematic review](https://pubmed.ncbi.nlm.nih.gov/42383913/).

### 5.4 Actual interval and provenance

The product distinguishes four things:

1. **Planned window** — what Gavin intended.
2. **Recorded intake** — timestamped caloric meals/drinks already in BEYOND.
3. **Confirmed boundary** — Gavin says eating ended or began.
4. **Estimated interval** — derived from records, visibly labeled and correctable.

A meal may suggest the opening or last-calorie time, but it never proves that all intake was recorded. An explicit
boundary does not rewrite the meal. A correction preserves provenance and the superseded value under the existing
correction model chosen by the implementation brief.

The programme offers a fasting definition:

- **Practical:** no meaningful calories; water and owner-approved noncaloric drinks do not end it.
- **Strict:** only items Gavin explicitly allows.
- **Custom:** an inspectable list; GRAYSON does not decide supplement or medication rules.

Medication directions override programme rules.

### 5.5 Timer and controls

```text
EATING WINDOW

FAST IN PROGRESS                                  11:42
14:10 plan · target 14:00
Eating planned to open at 14:00

Estimated from your last recorded calories at 00:00.
This may be incomplete.                         [CORRECT]

[END FAST]                            [ADJUST TODAY]
```

During eating:

```text
EATING WINDOW

OPEN                                         4:10 LEFT
Protein 76 / 170 g · energy 1,220 / 2,350 kcal

Substantial intake remains today. Extending this fast would
work against the current strength and recovery plan.

[LOG MEAL]                          [CLOSE WHEN DONE]
```

**END FAST** is neutral and immediate, with undo. It never asks Gavin to justify eating. **ADJUST TODAY** can widen,
move, suspend or end the programme for this lived day. “Family dinner,” “training,” “recovery,” “work safety” and
“other” may be optional context, never required excuses.

### 5.6 Scientific context—not a level-up ladder

Elapsed time alone cannot establish Gavin's glucose, insulin, glycogen, ketones or autophagy. Previous meal size and
composition, activity, adaptation and metabolic health change the response; human TRE studies do not give a
universal hour at which an individual enters ketosis or autophagy. A recent physiology review notes that ketone
measurement is uncommon in human intermittent-fasting studies and that adaptation timing in TRE remains unresolved:
[fasting physiology review](https://pmc.ncbi.nlm.nih.gov/articles/PMC12455479/).

The timer may show educational context, always labeled **typical transition—not measured in you**:

| Elapsed range | Permitted wording |
|---|---|
| 0–4 h | “Digestion and absorption may still be active; meal size and composition matter.” |
| 4–12 h | “You are generally moving toward a post-absorptive period. Exact timing varies.” |
| 12–18 h | “Use of stored energy and fat oxidation may be increasing. This is not a measurement.” |
| 18+ h | “This is a longer daily fast. GRAYSON cannot infer ketosis or added benefit from time alone.” |

Autophagy receives one evergreen explainer: it is a real cellular process, but GRAYSON cannot timestamp or confirm it
from a timer. It never appears as “unlocked,” a completed level or a reason to continue when eating is appropriate.

### 5.7 Strength and recovery guardrails

The window reads existing targets and records; it does not create new nutrition authority. Before encouraging a
longer window, the future programme must check:

- remaining protein and energy against remaining eating time;
- planned or completed strength training;
- current sleep/recovery and difficult-day state;
- repeated inability to meet intake;
- dizziness, faintness, confusion or unusual weakness explicitly reported by Gavin;
- work context where under-fueling could become unsafe.

Evidence in resistance-trained adults suggests TRE may modestly reduce fat mass, while the studies are few, short
and do not establish a universal advantage. A recent trial also illustrates that a restricted window can make
prescribed calories and protein harder to consume. Sources:
[resistance-training meta-analysis](https://pubmed.ncbi.nlm.nih.gov/41687432/) and
[12-week randomized trial](https://jn.nutrition.org/article/S0022-3166%2826%2900371-8/fulltext).

Allowed:

> “The window is on plan, but protein has been below target on four of six training days. Consider a wider training-
> day window.”

Not allowed:

> “You completed 16 hours, so today was successful.”

### 5.8 Medical and eating-behavior safeguard

Before activation, the programme asks whether Gavin has diabetes or glucose-lowering medication, medication that
requires food, a history of disordered eating, recurrent fainting/hypoglycemia, or a relevant medical condition for
which fasting advice belongs with a clinician. Positive answers do not erase data or shame the choice; they route to
professional guidance before an active plan.

Potential risks described in the fasting literature include hypoglycemia, dehydration, dizziness, weakness,
hypotension, headache, nausea and excessive hunger. These appear in the background and planned adverse-outcome
assessment of a [Cochrane review protocol](https://pmc.ncbi.nlm.nih.gov/articles/PMC10485895/), not as synthesized
effect estimates from a completed review. GRAYSON does not diagnose these states from
other data and does not encourage continuing through unsafe symptoms.

---

## 6. Personal experiment contract

Eating Window starts as an owner-approved experiment, using the existing Try lifecycle rather than creating a second
science system.

The experiment records:

- **purpose:** for example, reduce late-shift eating while supporting fat loss;
- **change:** 14:10 on named day types;
- **duration:** normally 14 or 28 lived days;
- **primary feasibility measure:** recorded adherence with unknown days kept unknown;
- **protected outcomes:** protein, training completion/performance context, energy, mood, main sleep and safety;
- **success condition:** workable adherence without material harm to protected outcomes;
- **stop conditions:** unsafe symptoms, inability to fuel, Gavin stops it, or clinician direction;
- **unchanged:** calorie/protein targets and training programme unless separately changed;
- **review:** keep, widen/narrow, change day-type rules, pause, retire or cannot tell.

The comparison uses comparable WORK/OFF contexts and reports sample counts. It never converts association into
causation. Alcohol records may be reviewed alongside the experiment only after enough explicit data; no missing
alcohol entry becomes abstinence.

---

## 7. Canonical scenarios

### Work night

Gavin wakes, Orientation names the work night and current Eating Window without turning it into the main mission.
The eating window protects enough time for food and protein before/during the shift. A late recorded meal adjusts the
estimated fast start; it does not mark failure.

### Post-shift recovery

If Gavin needs food after work, he ends or adjusts the fast in one tap. Recovery and safe driving outrank the timer.
The programme may later compare outcomes; it does not challenge eating in the moment.

### Day off and family meal

Open time remains legitimate. Gavin moves the window for a family meal as a one-day exception. The template stays
unchanged unless he chooses to update it.

### Training day

The card shows remaining protein and eating time. If the planned window makes fueling unrealistic, Delta may name
the conflict and offer widening—not demand adherence.

### Difficult day

The programme can be suspended for the lived day. Hard-day language is plain. No duration milestone, missed-window
count or challenge appears.

### Alcohol urge or use

An urge opens the current owner-written response plan. If alcohol is recorded, GRAYSON accepts the fact, offers one
optional reflection and keeps the return path obvious. It does not suggest compensatory fasting.

### Sparse or unreadable data

The interface says what is unknown. It does not infer fasting from missing meals, abstinence from missing alcohol,
or exercise from an intended workout.

---

## 8. Proposed future data semantics (not authorized)

Implementation should prefer domain-specific facts over a universal behavior blob.

### Configuration

- Eating Window programme: enabled, definition, templates by lived context, temporary exception policy, safety
  acknowledgement and experiment link.
- Daily Signals preferences: which eligible domain signals appear and their order. This is presentation preference,
  not a second copy of their records.

### Candidate events

- explicit eating-boundary confirmation/correction/undo with source and occurred-at;
- alcohol-use record/correction/undo with optional standard-drink estimate and context;
- one-day window adjustment/suspension if it must survive devices and backup.

The implementation brief must adjudicate exact names, correction semantics, backup compatibility and migration.
No event is authorized by this design.

---

## 9. Failure, privacy and accessibility

- Core logging and timer operation are local-first and offline.
- No health provider or AI call is needed to start/end/correct a window or record alcohol.
- Alcohol quantity, triggers and notes are sensitive. They follow backup/export/delete rules and are excluded from an
  AI conversation unless Gavin explicitly includes relevant personal context.
- A failed read shows **UNAVAILABLE**, not “none.” A failed write leaves the previous state and offers retry.
- Timer state survives reload because it is derived from persisted facts/configuration, not a browser countdown.
- Controls meet 44 px preferred touch targets. State is conveyed by text and icon, never color alone.
- Screen-reader announcements do not tick every second; elapsed time updates are quiet and announced on meaningful
  actions.
- Time zones, DST, midnight and the 16:30 rollover receive explicit tests.

---

## 10. Acceptance scenarios for implementation

1. Unknown alcohol remains unknown; it never renders as “no alcohol.”
2. Existing clean-day and urge records remain canonical and retain their behavior.
3. A future alcohol-use entry can be corrected/undone without deleting history.
4. A work-night window crosses midnight and remains attached to the correct lived day.
5. A family exception changes one day and not the template.
6. A logged meal can inform an estimate but is visibly incomplete and correctable.
7. Starting, ending or adjusting never changes calorie/protein targets or Engine advice.
8. A difficult day suppresses milestones and uses plain language.
9. Insufficient protein time produces a factual conflict, not a fasting failure.
10. Autophagy/ketosis is never claimed from elapsed time.
11. Alcohol use never triggers compensatory fasting.
12. Sparse/unreadable sources abstain safely.
13. 320/360/412 px layouts have no horizontal overflow; controls and error states are accessible.
14. Backup/restore and correction behavior are verified before production acceptance.

---

## 11. Ranked implementation sequence

Each slice requires separate authorization.

1. **C4.8a — Eating Window foundation (Protected, M).** Programme setup; neutral 12:12/14:10/16:8/18:6/Custom
   durations; lived-context templates; explicit start/end/adjust/correct; local timer; TODAY/BODY entry;
   deterministic educational context; no outcome recommendation.
2. **Alcohol truth deepening (Protected, M).** Extend—not replace—the Quit tracker with explicit DRANK records,
   standard-drink education, context, correction/undo and neutral Daily Signals presentation.
3. **C4.8b — Meal inference and fueling guardrails (Protected, M).** Estimated boundaries with provenance; connect
   protein, calories and training; factual conflicts only.
4. **Daily Signals composition (Feature/Protected to adjudicate, S–M).** Owner-selected list over canonical domain
   facts; week view; no generic behavior event or completion score.
5. **C4.8c — Outcome review (Protected, M).** Bind to Try; compare like lived days; keep/adjust/pause/retire; no
   causal claim or automatic plan change.
6. **Later only:** attention/notification policy, Health Connect biomarkers or Delta suggestions. None is required for
   a useful first programme.

### Recommended next objective

`GRAYSON-C4.8A-EATING-WINDOW-FOUNDATION-001` should be the first build. It gives Gavin a complete, customizable,
shift-aware programme without waiting for inference or personalized recommendations. The implementation must remain
off by default and require explicit activation; it must not include alcohol event work, outcome claims, notifications,
provider integration or automatic changes.

Before authorization, Gavin should answer one safety/setup question privately: whether stopping alcohol has ever
caused withdrawal symptoms or whether current drinking is prolonged/heavy enough that abrupt cessation may require
medical support. The answer is not needed to merge this design and should not be recorded in governance documents.

---

## 12. Source register

- NIAAA, [Alcohol use disorder: risk to recovery](https://www.niaaa.nih.gov/health-professionals-communities/core-resource-on-alcohol/alcohol-use-disorder-risk-diagnosis-recovery) — withdrawal risk and professional-care boundary.
- NIAAA, [Rethinking Drinking](https://www.niaaa.nih.gov/sites/default/files/publications/NIAAA_RethinkingDrinking.pdf) — standard drinks and self-monitoring.
- Manoogian et al., [Healthy Heroes randomized trial](https://pmc.ncbi.nlm.nih.gov/articles/PMC9536325/) — 10-hour TRE feasibility in 24-hour shift workers; not Gavin's exact rotation.
- Wang et al., [shift-worker meal-timing systematic review](https://pubmed.ncbi.nlm.nih.gov/42383913/) — sparse trial base and limited generalizability.
- Centofanti et al., [simulated night-shift fasting trial](https://pmc.ncbi.nlm.nih.gov/articles/PMC11663163/) — meal timing affects glucose response under controlled simulated conditions; not a personal prescription.
- Dote-Montero et al., [fasting physiology review](https://pmc.ncbi.nlm.nih.gov/articles/PMC12455479/) — mechanistic context and limits of human ketone/adaptation evidence.
- Cochrane review protocol, [intermittent fasting for adults with overweight or obesity](https://pmc.ncbi.nlm.nih.gov/articles/PMC10485895/) — potential adverse effects considered in the planned review; not synthesized outcome-effect evidence.
- Ali et al., [TRE with resistance training meta-analysis](https://pubmed.ncbi.nlm.nih.gov/41687432/) — modest fat-mass finding with limited trials and certainty.
- Tinsley et al., [TRE during a bulking phase](https://jn.nutrition.org/article/S0022-3166%2826%2900371-8/fulltext) — restricted-window feasibility and intake/adherence tradeoff in resistance-trained adults.
