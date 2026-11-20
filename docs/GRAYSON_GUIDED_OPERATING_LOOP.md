# GRAYSON Guided Operating Loop

Status: **OWNER-APPROVED DESIGN DIRECTION** — objective
`GRAYSON-GUIDED-OPERATING-LOOP-001`, 2026-11-20. This document defines a canonical experience
direction. It authorizes no product code, navigation change, Engine or event-semantic change,
provider, dependency, runtime rename, or Google Drive change. Each implementation slice requires
its own bounded authorization.

## 1. The product correction

Gavin should not have to understand BEYOND's internal structure before it can help him.

BEYOND already contains substantial capability, but some of it is presented as unlabeled machinery:
settings, destinations, forms, targets, saved objects and specialist tools. A person who has never
used **WHAT BEYOND SHOULD REMEMBER**, **MY MEALS**, targets, missions or the meal planner cannot know
what useful outcome to begin with. Discoverability alone is not enough; a searchable catalogue of
tools still makes Gavin assemble the system himself.

GRAYSON should instead begin from an outcome or a real situation, gather only the missing context,
compose the relevant existing capabilities, and help Gavin carry the result through daily life.

> **Guided Operating Principle:** GRAYSON guides Gavin through outcomes instead of requiring him to
> operate disconnected tools. Delta asks, understands, proposes and explains. Gavin edits, approves
> and decides. The suit carries the approved plan into the lived day, records reality, and returns
> with evidence for the next decision.

This is not a conversational skin over every screen. Conversation is used where ambiguity and
personal context matter. Direct controls remain faster for familiar actions such as logging water,
repeating a meal, recording a set, correcting an entry or ending a timer.

## 2. Definition of done

The Guided Operating Loop is successful when Gavin can begin with an ordinary statement such as:

> “I want to become stronger and reach 170 pounds.”

or:

> “I need work lunches and a few dinners this week. Make them healthy, high-protein, reasonably
> low-calorie, from Aldi, for about $80.”

and reach an inspectable, editable plan without knowing which BEYOND subsystem owns each part.

The complete loop is:

1. **Express** — Gavin states an outcome, problem, concern or idea in his own words.
2. **Understand** — Delta reflects the intended outcome and asks only material questions.
3. **Propose** — GRAYSON composes existing records and capabilities into an editable plan.
4. **Approve** — assumptions, tradeoffs, uncertainty and material consequences are visible; Gavin
   accepts, edits, defers or rejects.
5. **Operate** — approved actions appear at the relevant lived moments without making every domain
   compete for attention.
6. **Record** — logging is fast, serving- and situation-first, correctable and honest about missing
   data.
7. **Review** — GRAYSON compares the plan with recorded reality and outcomes, not with compliance
   theatre.
8. **Adapt** — Delta proposes at most the useful next change. Nothing consequential silently changes.

At every step Gavin can leave, resume, use a direct tool, or decide that no further action is needed.

## 3. Repository truth and evolution disposition

The design begins from current BEYOND rather than a blank canvas.

### Preserve

- The lived-day model, Orientation, SHIFT DOWN and close ritual.
- Deterministic Engine authority and the distinction between facts, interpretation, recommendation
  and decision.
- Missions, obligations, projects, Week Planner, routines and direct LOG actions.
- Personal Understanding, provenance-aware memories, Delta notebook and source inspection.
- Saved meals, the protein-first food diary, USDA lookup, Open Food Facts barcode lookup, manual
  entry, correction and undo.
- Nutrition targets, weight history, expenditure estimate and owner-approved calorie proposal.
- Training programme, live workout, progression, records and recovery evidence.
- Local-first operation, offline logging, backup/export compatibility and owner control.
- The existing primary TODAY / TRAIN / DATA / MORE information architecture until Gavin separately
  approves a change.

### Connect and deepen

- Turn personal memory from a blank destination into a progressive Delta-led teaching experience.
- Connect a Mission to its relevant training, food, sleep, recovery and review plans without creating
  a second copy of those plans.
- Turn saved meals, lookup, meal planning, grocery notes and food history into one Food Week journey.
- Make LOG MEAL search across the food paths Gavin recognizes instead of exposing storage/provider
  boundaries.
- Prefer named servings and past choices; keep grams and ounces as precise depth.
- Carry approved plans into Orientation, TODAY, TRAIN and DATA only when they are relevant.
- Use the existing review and metric evidence to propose conservative plan changes.

### Add only where the foundation is genuinely missing

- A resumable guided-session envelope: purpose, unanswered material questions, draft proposal and
  approved result.
- Ingredient- and store-aware planning data sufficient for a grocery list and preparation plan.
- A mission-to-plan association that references canonical domain plans rather than duplicating them.
- Explicit assumption and conflict handling for cross-domain proposals.

Exact persistence and event semantics remain unapproved. Implementation must first prove whether
existing mission, memory, capture, saved-meal and plan records can carry each requirement.

### Reject

- A second chatbot-only application beside BEYOND.
- A universal wizard that blocks access until setup is complete.
- A giant onboarding questionnaire.
- A generic behavior database or a completion score for life.
- A proprietary food database, full pantry ERP or copied commercial nutrition algorithm.
- Automatic target, programme or schedule changes.
- False precision about store prices, calories, serving measures or physiological outcomes.
- Replacing direct logging with conversation.

## 4. The three connected experiences

### 4.1 Teach Delta about me

The current **WHAT BEYOND SHOULD REMEMBER** destination asks Gavin to know what the system needs.
The evolved experience is **TEACH DELTA ABOUT ME**: a progressive, optional interview that produces
inspectable knowledge rather than a hidden profile.

#### Entry

Possible entry points, subject to implementation design and any protected navigation ruling:

- **A PLACE TO START** for a new or returning operator;
- the existing memory destination;
- a relevant moment, such as planning food without known dislikes;
- a Delta learning review after evidence or a correction;
- direct search for memory, preferences or “what do you know about me?”

The entry never gates TODAY, LOG, TRAIN or DATA. Gavin may answer one question, skip a subject, write
freely, or leave.

#### Guided subjects

Questions are organized around help GRAYSON can actually provide, not database fields:

- **Work and transitions:** “What should I help you protect before a shift?”
- **Low capacity:** “When you are exhausted, what should become smaller before it disappears?”
- **Food:** “What will you reliably eat during a difficult work week?”
- **Training:** “What usually causes a planned workout not to happen?”
- **Recovery:** “What helps you come down from work without carrying it home?”
- **Home and relationships:** “What matters but is easy to forget when work is heavy?”
- **Time off:** “What makes a day off feel well used rather than merely productive?”
- **Support:** “When you say you are overwhelmed, should I listen, help decide, reduce the plan or
  offer a concrete next action?”

Questions are generated from missing useful context, not from curiosity. Sensitive subjects are
optional and explain why an answer would help.

#### Confirmation contract

Delta does not convert raw language directly into unquestioned truth. It returns a small proposed
understanding:

> **What I understood**
>
> Before a shift, protect food preparation and departure readiness. Shorten training before
> cancelling it. When the day becomes too much, reduce the visible plan rather than showing Gavin
> everything overdue.
>
> **USE THIS** · **CHANGE** · **NOT QUITE** · **NOT ANYMORE**

Each accepted understanding shows:

- the statement Delta may use;
- source and whether Gavin explicitly confirmed it;
- applicable situations and exceptions;
- when it was learned and last confirmed;
- where it may influence assistance;
- edit, narrow, contest, retire and delete actions.

This maps to the Vision's learning lifecycle. It does not prematurely authorize C6.1 semantics.

#### Progressive completion

There is no percentage-complete profile. The useful state is “enough to help with this request.”
Delta may later ask one timely question when its answer would materially improve a plan. Stable
understandings are rechecked rarely; changing routines and corrections are invitations to recheck.

### 4.2 Pursue a Mission

A Mission is not merely a title or a goal-weight field. It is an outcome with an editable operating
plan, protected constraints and review criteria.

Canonical example:

> “I want to gain muscle and strength and my ideal weight is 170.”

#### Understand the outcome

Delta first identifies ambiguity and potential conflict. It does not assume that “low calorie,”
“gain muscle” and “reach 170” are mutually compatible without knowing current weight, trend and
intent.

The shortest useful clarification covers:

- current weight and recent trend;
- whether the intended strategy is lean gain, recomposition, fat loss before gaining, or uncertain;
- timeframe and why 170 matters;
- training experience, available equipment and realistic weekly opportunities;
- current programme and recent performance;
- food budget, appetite, preferences and preparation capacity;
- sleep, shifts, recovery and injury/medical constraints;
- what counts as success beyond scale weight;
- which assumptions Gavin wants Delta to make versus discuss.

Existing records answer questions before Delta asks them. Old, sparse or conflicting records are
shown as such.

#### Proposed mission brief

Delta returns a one-screen brief before generating operational detail:

> **MISSION · STRONGER AT 170**
>
> **Outcome** — Increase strength and muscle while moving toward 170 lb.
>
> **Current reality** — Latest weight and trend; current programme; actual recent training;
> protein, sleep and work context with source dates.
>
> **Proposed approach** — the selected phase, expected pace and review period.
>
> **Protect** — sleep, safe recovery, family meals, budget and any named constraints.
>
> **Uncertain** — incomplete intake logging, stale weight or insufficient training history.
>
> **BUILD PLAN** · **CHANGE THE OUTCOME** · **SAVE DRAFT** · **NOT NOW**

The brief separates Gavin's desired outcome from Delta's proposed method.

#### Connected plan

After approval, the Mission references canonical plans:

- **Training:** existing programme, realistic slots, live workout and progression.
- **Food:** calorie/protein targets, Food Week and convenient logging.
- **Recovery:** sleep/recovery protections and shift-aware exceptions.
- **Daily operation:** relevant preparation and next actions, not the entire mission every day.
- **Evidence:** weight trend, strength, completed sessions, intake coverage and subjective state.
- **Review:** a scheduled owner-controlled mission review with explicit evidence floors.

Changing the Mission does not silently rewrite those plans. Delta proposes a reconciled change and
names the affected surfaces.

#### Review and adaptation

The review asks four questions:

1. What was the approved plan?
2. What does the record show actually happened, including missing coverage?
3. What outcomes moved, and what competing explanations remain?
4. Is one change justified, or is holding the plan the honest result?

The result may be **KEEP**, **ADJUST**, **PAUSE**, **CHANGE STRATEGY**, **RETIRE** or **CANNOT TELL**.
This deepens campaign item C4.5 and depends on the learning lifecycle for durable cross-domain
interpretation. It does not authorize recommendation or Engine changes.

### 4.3 Food Week

Food becomes a complete operating journey rather than a collection of meal-storage and logging
tools.

> **PLAN → SHOP → PREP → EAT / LOG → REVIEW → IMPROVE**

**MY MEALS** remains valuable but becomes one resource inside Food, not the definition of Food and
not a settings concept. The primary navigation remains unchanged until separately adjudicated.

#### Start from the job

Gavin may state:

> “I want lunches for work this week and a few dinners. Make them good for me, lower calorie and
> high protein. I am shopping at Aldi and want to spend about $80.”

Delta extracts the known constraints and asks only the missing material questions, one at a time:

1. How many work lunches?
2. How many dinners and how many people per dinner?
3. Which Aldi/location, if current prices or availability are requested?
4. What is already at home?
5. Dislikes, allergies, exclusions and foods the household will actually eat?
6. Available equipment, preparation time and storage/reheating conditions?
7. Which active Mission and nutrition targets should shape the proposal?

“Good for me” is never silently translated into a diet ideology. Delta states the chosen working
meaning—such as protein, energy, produce, fiber, budget and practicality—and lets Gavin change it.

#### Proposal shape

Food Week returns a compact plan with expandable evidence:

- meals and their roles: work lunch, family dinner, recovery meal or flexible backup;
- servings and leftovers mapped to real days and shifts;
- approximate calories, protein and other known nutrients per serving;
- ingredient quantities and a grocery list grouped by store section;
- confirmed current prices, estimated prices and unavailable prices visibly distinguished;
- projected total with a budget buffer;
- preparation order, storage duration and reheating notes;
- substitutions for price, availability, preference or time;
- conflicts with an active Mission, eating window, training day or recovery need;
- **USE THIS WEEK**, **SWAP**, **CHANGE BUDGET**, **CHANGE SERVINGS**, **SAVE DRAFT**, **NOT NOW**.

Store-aware planning uses current evidence when available and dates it. It never promises inventory
or exact checkout cost. When prices are unknown, Delta works with ranges and protects a buffer.

#### Aldi $80 canonical scenario

The acceptance scenario is not a permanent recipe or price list. It proves that the system can:

- plan five work lunches and several dinners within an approximately $80 budget;
- favor a small number of versatile proteins and overlapping ingredients;
- use current target and Mission context instead of treating “low calorie” as universally correct;
- map portions to Gavin's work rotation and household servings;
- reserve a budget buffer and identify price assumptions;
- produce a short preparation sequence rather than only a list of recipes;
- create or reference reusable meals without forcing Gavin to manually recreate every component;
- make the resulting meals the first choices in LOG during their planned windows.

#### Preparation and operation

On preparation day, GRAYSON shows the shortest safe sequence:

1. what to take out and preheat;
2. which ingredients can cook together;
3. how many portions go to work lunches, dinners and backup;
4. what needs labels or freezing;
5. what remains intentionally unassigned.

During the week, TODAY may show one relevant line—such as “Work lunch prepared: chicken bowl”—not
the entire food plan. A missed prep session prompts re-planning from current reality, not guilt.

#### Logging: search-first and serving-first

Opening **LOG → MEAL** should make the obvious job obvious:

- **RECENT** — foods and portions Gavin actually used;
- **PLANNED** — this week's meals at the relevant time;
- **MY MEALS** — saved reusable meals;
- **SEARCH** — one search across eligible saved and online sources;
- **SCAN** — existing barcode path;
- **MANUAL** — always available.

Search results should rank exact and familiar matches before novel database results and clearly show
source. Selecting food asks for a recognizable amount first:

- 1 container;
- 1 slice;
- 1 cup;
- 1 chicken breast;
- 1 label serving;
- 0.5 / 1 / 1.5 / 2 servings;
- **PRECISE AMOUNT** for grams or ounces.

The source must support the named measure, or Gavin defines it. GRAYSON never invents a household
measure from a 100 g database record. An owner-defined usual serving is retained with provenance and
can be changed. “Same as last time,” “log again” and planned-meal defaults reduce repeated work.

#### Review and learning

Food review is adherence-neutral. It distinguishes:

- planned meals from logged meals;
- a likely meal from confirmed intake;
- days with partial logging from known totals;
- price estimates from recorded spend;
- target conflicts from personal failure.

Useful outputs include: which prepared meals were actually eaten, which were inconvenient, whether
protein or energy was repeatedly difficult to reach, what was wasted, and what should be repeated or
changed next week. Any inferred preference returns through **What I understood**, not hidden learning.

## 5. Cross-domain conflict handling

The value of GRAYSON is not that every system agrees. It is that conflicts become visible and
decidable.

Examples:

- A low-calorie meal request conflicts with a current weight-gain phase.
- A narrow eating window leaves too little time to meet protein and energy needs.
- A hard late workout threatens planned sleep before a shift.
- The cheapest meal plan creates too much preparation for the available day off.
- A family dinner does not fit the default template but matters more than template adherence.

Delta responds in this order:

1. Name the conflict factually.
2. Show what is known, assumed and missing.
3. Protect safety and explicit owner constraints.
4. Offer two or three meaningful choices, including doing nothing.
5. Recommend one option only when evidence and owner direction support it.
6. Apply nothing until Gavin confirms.

## 6. Phone journeys and Delta language

### Journey A — first useful teaching session

1. Gavin opens **A PLACE TO START**.
2. The screen says: “I can learn a little at a time. What would make today easier?”
3. Choices include **BEFORE WORK**, **FOOD**, **TRAINING**, **DAYS OFF**, **WHEN I AM STRUGGLING**,
   and **TELL DELTA SOMETHING**.
4. Gavin chooses FOOD.
5. Delta asks one question and explains why it matters.
6. Gavin answers or skips.
7. Delta presents one proposed understanding.
8. Gavin confirms or changes it.
9. The session ends with what that answer will improve; no profile-completion demand appears.

### Journey B — plan food for the work week

1. Gavin chooses **PLAN FOOD** or asks Delta in plain language.
2. Delta identifies five lunches, three dinners, Aldi and an $80 budget from his request.
3. Existing household size, dislikes, targets and work schedule are reused if current and confirmed.
4. Delta asks only unanswered material questions.
5. The draft shows meals, servings, estimated basket, prep time and conflicts.
6. Gavin swaps one dinner and raises or lowers a serving.
7. A change summary shows price, protein and leftovers affected.
8. Gavin approves the week.
9. Shopping and prep views become available; planned meals rise to the top of LOG when relevant.

Sample voice:

> “This fits the budget estimate and gives you five work lunches. Your active goal currently points
> toward gaining weight, so I did not optimize for the lowest possible calories. I kept the meals
> protein-forward and left an $8 price buffer. Change the goal assumption?”

### Journey C — turn 170 into a plan

1. Gavin states the desired outcome.
2. Delta uses current records and asks whether 170 means lean gain, recomposition or an uncertain
   destination.
3. The mission brief exposes current evidence and gaps.
4. Gavin approves the strategy, not every future action.
5. Existing TRAIN programme, nutrition targets and recovery constraints are linked.
6. The first week is proposed with editable training opportunities and Food Week.
7. TODAY surfaces only the relevant next operation.
8. The review holds, adjusts or abstains based on recorded coverage and outcomes.

Sample voice:

> “One number is not enough to build the plan. You are aiming for 170 and more strength. I can use
> your current programme and recent weight trend, but your food record is incomplete. I can still
> draft the first two weeks if we treat intake as an estimate. Do that, or establish a better
> baseline first?”

### Journey D — difficult day

1. Gavin says he cannot manage the normal plan or the current state meets an approved difficult-day
   threshold.
2. The guided session believes the statement and stops asking optimization questions.
3. It protects immediate safety, food, medication/health needs, sleep, critical obligations and one
   owner-chosen support action.
4. Food Week offers the easiest available prepared or backup meal.
5. Training offers only existing approved alternatives; it does not invent a new recommendation.
6. Unfinished planning remains resumable without overdue pressure.

Sample voice:

> “Understood. The normal plan is not the job now. Your prepared meal is available, and tomorrow's
> obligation is already parked. Nothing else needs a decision tonight.”

### Journey E — interruption and return

1. Gavin leaves during a teaching or planning session.
2. Direct logging and the rest of BEYOND remain available.
3. The draft retains its purpose, confirmed facts and unanswered material question.
4. Re-entry says what remains in one sentence: “Your Aldi week is drafted; dinner servings still
   need an answer.”
5. Gavin resumes, changes direction or discards it.

## 7. Composition and information architecture

The design recommends an outcome layer without yet changing the locked primary navigation.

- **TODAY** carries the relevant approved next operation and lived-day context.
- **TRAIN** remains the specialist execution and evidence workspace for training.
- **DATA** remains the specialist record/evidence workspace and can host Food depth.
- **MORE / LIFE / REVIEW** retain inspectable plans, knowledge and long-horizon depth.
- **LOG** remains the direct action entry and becomes smarter about likely/planned/recent food.
- **Delta** may begin and resume guided sessions from existing assistant entry points.

The exact home for a persistent **FOOD** workspace, any renaming of **WHAT BEYOND SHOULD REMEMBER**,
and any primary-navigation change are Protected decisions reserved for Gavin after a phone-first
composition study. This design does not decide them silently.

## 8. Trust, safety and control

- Guided check-ins never gate direct access.
- Delta asks no question it can answer from current reliable records.
- Sensitive answers explain use and remain correctable/deletable.
- Meal and body-composition guidance distinguishes general evidence from personal outcomes.
- Medical conditions, disordered-eating history, unsafe symptoms and alcohol-withdrawal risk retain
  the safeguards in the fasting/alcohol design.
- Food database results display source and serving basis; unknown remains unknown.
- Store prices and availability are dated evidence or visible estimates.
- Missing logging never becomes zero intake or noncompliance.
- A plan is not a recommendation from the deterministic Engine unless the Engine actually produced
  it.
- Delta may become more direct as evidence and consequence increase, but never more certain than the
  evidence supports. Once Gavin makes an informed decision, Delta respects it unless new evidence
  changes the situation.

## 9. Evolution matrix

| Current BEYOND surface | Preserve | Evolve toward | Disposition |
|---|---|---|---|
| A PLACE TO START | Existing guide entry | Progressive outcome-led teaching | Deepen |
| WHAT BEYOND SHOULD REMEMBER | Memory records and correction | TEACH DELTA interview and confirmation | Reframe + connect |
| Personal Understanding / DELTA | Sources, patterns, notebook | Inspectable learning and “what I understood” | Deepen |
| MISSIONS & OBLIGATIONS | Canonical intent records | Mission brief referencing domain plans and outcomes | Connect |
| TARGETS / calorie proposal | Owner-controlled targets, SAVE/KEEP/UNDO | Generated as one part of an approved Mission | Connect |
| MY MEALS | Reusable saved meals | Resource inside Food Week, not a Settings concept | Reframe |
| MEAL PLAN + GROCERY LIST | Deterministic saved-meal rotation and note | Store/budget/ingredient/prep-aware proposal | Deepen carefully |
| USDA / Open Food Facts | Existing providers and source boundaries | Unified search with familiar ranking | Connect |
| MEAL logger | Diary, search, barcode, manual, correction | Recent/planned/saved/search/scan; serving-first | Adapt |
| TRAIN programme/live workout | Canonical specialist execution | Referenced by Mission; later dedicated training design | Preserve + connect |
| Weekly/Review/metric pages | Existing evidence | Mission-level outcome review and one justified change | Connect + deepen |
| Orientation/TODAY | Lived-day authority and Quiet Command | Carry only approved relevant mission operations | Connect |
| Fasting design | Optional experiment and fueling safeguards | Conflict-aware Food Week integration | Connect later |

## 10. Ranked implementation sequence

Every item below requires separate authorization. The sequence supersedes no already approved active
Builder work; it guides the next objectives after this design is merged.

1. **Guided Start + Teach Delta, slice 1 — Protected, M.** Evolve **A PLACE TO START** and the
   existing memory entry into a resumable, optional guided conversation covering a small set of
   useful subjects; produce explicit proposed understandings with confirm/change/not-now. Reuse
   existing memory commands and provenance. No generic AI memory write, no primary-navigation
   change, no C6.1 lifecycle expansion.
2. **Meal logging usability — Protected, M.** Make LOG → MEAL search-first and serving-first using
   existing saved meals, diary, USDA and barcode paths. Add recent/repeat/planned ranking only where
   current records justify it. Preserve manual and precise amounts. Exact event/schema implications
   must be adjudicated in the brief.
3. **Food Week design-to-build — Protected, L.** Ingredient-aware meal proposals, Aldi/store and
   budget evidence, household servings, grocery grouping, prep sequence and approval. First prove a
   useful local-first draft without importing a pantry ERP or commercial algorithm.
4. **Mission Brief + connected plan — Protected, L.** Start with the strength/170 scenario. Reference
   existing Mission, programme, nutrition and recovery plans; do not duplicate or silently mutate
   them. This objective follows the dedicated training design conversation.
5. **Mission outcome review — Protected, L.** Reconcile with C4.5: plan versus recorded reality,
   evidence coverage, outcomes, competing explanations and at most one owner-approved change.
6. **Learning lifecycle and guided adaptation — Protected, L.** Implement C6.1/C6.2/C6.5 only after
   guided sessions and mission reviews generate real corrections and outcomes.
7. **Composition study — Protected design, S–M.** After field use, decide whether Food or guided
   missions warrant information-architecture change. Do not pre-commit now.

### Recommended next implementation objective

After this design merges and the dedicated workout conversation is recorded, begin
`GRAYSON-GUIDED-START-001`: the first Teach Delta slice. It addresses the most fundamental problem
Gavin reported—capability that exists but offers no clear way to begin—and improves every later
domain without waiting for the full Food or Mission system.

## 11. Reuse disposition

- **REUSE:** BEYOND's lived day, Orientation, assistant entry, Personal Understanding, memory and
  provenance paths, Missions, nutrition targets/proposals, saved meals, FOOD-001 diary/search/
  barcode/servings, meal planner, TRAIN programme/live workout, Review and metric evidence. Donor
  patterns already adjudicated in the research synthesis: Oura's contextual Today, MacroFactor's
  adherence-neutral proposal/review, Memos' capture-first behavior, Home Assistant's assistant-as-
  capability-router and Grocy's planning concepts without its ERP.
- **OWN:** the GRAYSON-specific guided-session grammar; mapping Gavin's lived context and explicit
  understandings into existing capabilities; cross-domain conflict handling; Mission and Food Week
  composition; Delta's voice and owner-control contract.
- **BUILD FROM SCRATCH:** none authorized by this design. Each implementation brief must justify any
  missing primitive after inspecting existing records and legally reusable standards/libraries.

## 12. Decisions reserved for Gavin

This design recommends but does not lock:

1. Whether the visible label becomes **TEACH DELTA ABOUT ME**, **WHAT DELTA KNOWS**, or another name.
2. Whether Food gains a persistent workspace and where it lives within the current primary
   information architecture.
3. Whether guided sessions are deterministic prompts, AI-assisted within approved Anthropic
   boundaries, or a hybrid. Direct operation must remain available offline either way.
4. Which training philosophy, programme-building experience and live-workout relationship GRAYSON
   should use. This receives a dedicated owner design conversation before Mission implementation.
5. Exact data/event semantics for sessions, ingredient plans, owner-defined servings and Mission
   associations.

These decisions should be made with phone-first designs and repository truth, not abstract labels.
