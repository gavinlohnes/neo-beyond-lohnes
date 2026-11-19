# Project Grayson — Current Product Baseline

Status: **REPORT-ONLY RECOMMENDATION** — 2026-11-19.

Baseline: `5f9a9a12d8a363a75eb4bcb364c02dc119d69204` (Project Grayson vision merged).
This report describes what exists and recommends one next objective. It authorizes no implementation,
redesign, rename, retirement, or reprioritization.

## Executive judgment

BEYOND is not an early prototype waiting to become a Life OS. Much of the suit already exists.

It has a local-first lived-day record, shift-aware TODAY, sleep and health evidence, numeric check-ins,
training programmes and live workouts, nutrition and hydration, obligations and projects, routines,
People and Home facts, daily notes and a decision journal, personal experiments, planning, Whole
Picture, personal ranges, notifications, capture, search, Alfred planning and tools, and explicit
correction/provenance paths.

The principal gap is **orchestration around lived transitions**. Strong capabilities are separated by
screen, phase, terminology, and specialist workspace. Gavin often has to know which subsystem contains
the help he wants. The system understands many parts of his life but does not yet consistently assemble
them around the moment he is entering: waking, preparing, beginning work, leaving work, returning home,
using time off, preparing tomorrow, or closing the day.

Therefore:

- **Do not rewrite the application.** Its data, commands, evidence rules, Engine, corrections, and
  specialist experiences are high-value foundations.
- **Do not begin with a global redesign.** Navigation has coherence problems, but changing it before
  proving the lived composition would rearrange uncertainty.
- **Do not begin by making Delta more autonomous.** Delta needs a coherent moment and trusted source
  composition before it needs greater action authority.
- **Connect before expanding.** The first Project Grayson build should assemble existing truth and
  actions into one complete lived transition.

## Evidence and limits

The assessment used:

- current master and open-PR inspection;
- the Vision Blueprint, Doctrine, Decision Register, roadmap, Capability Map, and current brief;
- UI operation through day start, mode selection, OFF DUTY, check-in, Whole Life, day-off planning,
  DATA, TRAIN, and MORE on the current local build;
- direct inspection of TODAY closure and Shift Down, Drive Home, handoff, Home, People, Daily Note,
  journal, Whole Life composition, and life-transition code;
- current tests and prior evidence as implementation evidence, not field acceptance.

The operated build used a new local data store. Sparse states were observed; Gavin's real historical
records were not imported. Findings about discoverability and composition are observed. Claims about
long-term personal usefulness remain hypotheses until Gavin uses the resulting experiences.

PR #584 (finished workouts on the shared metric page) and draft PR #473 (shift what-if comparison)
were inspected as concurrent work and left untouched.

## What already fits GRAYSON

### The suit has a trustworthy core

Preserve the local-first lived-day model, append-only corrections, source-aware work context, backup
and export paths, deterministic Engine, explicit operator decisions, and provenance-bearing reads.
These are differentiators, not legacy burden.

### FIELD already exists

TODAY is a credible field instrument: day mode, next action, draft guidance, measured values, fast
capture, work preparation, phase-aware operations, and restrained empty states. TRAIN has a focused
workout operation. LOG is central and fast. These are strong foundations for “glance, act, resume.”

### COMMAND depth already exists

DATA, Cave views, Review, Whole Picture, Week Planner, Personal Understanding, journals, history,
experiments, programme editing, and systems views provide substantial inspectable depth. The problem
is not insufficient capability; it is knowing which depth serves the current question.

### Whole-life records already exist

The Life workspace composes commitments, projects, routines, People, Home, daily notes, training,
food, sleep, calendar, and resurfaced items. It explicitly leaves breathing room when no task is due.
That is close to Project Grayson doctrine.

### Delta has meaningful ancestors

Alfred, the free helper, typed tool registry, immediate reversible low-risk actions, memory, operator
context, source panels, and planning prompts provide a strong path to Delta. The existing code also
contains deterministic Delta knowledge/questions and pattern views. Identity should follow coherent
behavior, not precede it.

## Canonical-scenario assessment

| # | Canonical scenario | Current foundation | Assessment | Principal gap |
|---|---|---|---|---|
| 1 | Wake; understand sleep, check in, capture, orient | TODAY start, sleep/Garmin, briefing, check-in, CAPTURE, next action | **Connect + adapt** | Starting the day reveals components, not one calm wake/orientation journey; subjective and measured state remain separate |
| 2 | Prepare food, training, rest, equipment, departure | PREP, routines, training suggestion, schedule, work preparation, reminders | **Connect + deepen** | No single readiness decision; OFF DUTY can still display work preparation; unusual-item checklist is not learned |
| 3 | Arrive, set up, hand off, capture reminders, operate | work marks, preflight, Shift Handoff, fast capture, FIELD | **Preserve + connect** | Role entry is implied by shift phase rather than completed as a coherent arrival/handoff moment |
| 4 | Notice water, food, fasting, movement, mood when useful | hydration pace, nutrition, steps, check-in, notifications, metrics | **Deepen selectively** | No fasting model; mental check-ins are numeric and episodic; nudges are not yet one cross-domain attention policy |
| 5 | Leave work, reflect, preserve, shift down | MARK WORK ENDED, handoff, debrief, Drive Home, Shift Down timer | **Preserve + deepen** | Powerful pieces are separate; Shift Down is mainly a timer/record rather than Deputy → Gavin containment |
| 6 | Return home as husband, dad, self | RECOVER/OFF context, People/Home, personal facts | **Connect + deepen** | Home role is not an explicit transition; work can remain visually and mentally dominant |
| 7 | Use a day off intentionally | OFF context, Whole Life, Week Planner, routines, projects, “Plan my day off” | **Adapt + deepen** | The entry is an Alfred prompt, not a first-class balanced plan; recovery/family/home/enjoyment/open time are not composed together |
| 8 | Remember maintenance, anniversaries, thoughtful opportunities | Home facts + recurring obligations, People + dates, reminders | **Preserve + connect** | Data is available but stewardship has no long-horizon view or contextual opportunity surface |
| 9 | Six-month health mission with editable plans | Missions, projects, programme, nutrition targets/proposals, metrics, experiments | **Connect + deepen** | No single mission studio or cross-domain plan/outcome loop; Engine authority boundaries must remain explicit |
| 10 | Several declining-mood days and shorter reality path | mood/stress check-in, journal, Minimum Day, personal context | **Deepen carefully** | No multi-day mental-health experience, thought/help-intent capture, sensitive policy, or authored support plan |
| 11 | Confront repeated avoidance without guilt | journal outcomes, follow-ups, experiments, coach cards, no-guilt doctrine | **Deepen carefully** | No explicit avoidance classifier or earned-challenge ladder; creating one affects recommendation authority |
| 12 | Close, learn, preview tomorrow, sleep contained | End Day, Daily Note templates, weekly interview, reflection, Week Planner | **Connect + adapt** | END DAY is primarily a button; reflection and tomorrow preview live elsewhere and are not a closing ritual |

## Capability disposition

### Preserve

- Lived-day ownership and 16:30 boundary.
- Deterministic Engine and one primary recommendation.
- Append-only history, corrections, undo, provenance, and source distinctions.
- TODAY/FIELD, central LOG, focused live workout, and sparse-state honesty.
- Specialist DATA/Review/Whole Picture depth.
- Work-context resolution and explicit shift marks.
- Existing Home, People, obligations, projects, routines, journal, and experiment records.
- Manual operation and confirmation/undo boundaries.

### Adapt

- **TODAY:** from a capable phase-aware instrument into the conductor of the current lived transition.
- **Check-in:** preserve the numeric state for Engine compatibility; add optional human context and help
  intent through separately approved, privacy-aware work rather than overloading the existing event.
- **Day-off planning:** retain Alfred's prompt as optional intelligence, but give time off a first-class
  composition using known commitments, recovery, relationships, maintenance, interests, and open time.
- **End Day:** turn mechanical closure into optional reflection, tomorrow orientation, and containment.
- **Mode:** preserve presentation pinning; distinguish it more clearly from canonical work/off truth and
  avoid showing contextually wrong operations under a pin.

### Connect

- Sleep + subjective check-in + schedule + obligations + training + preparation at wake.
- Shift Handoff + work marks + capture at role entry.
- Work End + debrief + Drive Home + Shift Down + Home/People at role exit.
- Home/People facts + obligations + reminders into Life Stewardship.
- Daily notes + check-ins + Whole Picture + experiments into inspectable personal learning.
- Missions/projects + health/training/nutrition plans + outcomes into a goal lifecycle.

### Deepen

- Delta's learning dialogue and explicit lifecycle: observed, hypothesized, provisional, confirmed,
  context-specific, contested, outdated, retired.
- Mental wellbeing with thoughts, context, requested support mode, multi-day patterns, authored support,
  and strict sensitive-data controls.
- Nutrition with fasting as an optional strategy evaluated against intake, protein, mood, recovery,
  training, and adherence—not as a duration contest.
- Life Stewardship with “last done / evidence / next useful window / supplies” rather than alarms.
- Personal Science with cross-domain hypotheses and limited opportunity recommendations.
- Shift Down from elapsed minutes to a genuine professional-to-home transition.

### Replace carefully

No current major capability earns immediate replacement. Future experience work may replace a
composition or route only after proving that existing access, correction, and depth remain available.

Candidates for later replacement—not approved now—are duplicated intermediate menus, phase-insensitive
rows, and terminology that exposes implementation architecture instead of the operator's question.

### Retire

Nothing should be retired from this baseline alone. Future objectives may propose retiring a duplicate
surface only with usage/evidence and a verified replacement route. Historical “Delta” deterministic
code must not be confused with the new companion identity or deleted by name alone.

### Defer

- Public/commercial naming and legal clearance.
- Finances as a core domain.
- Broad navigation replacement.
- A new AI provider/backend or greater consequential autonomy.
- Universal opportunity ranking or life score.
- Automatic psychological interpretation.
- Full Mission Studio and life simulation until the daily loop and learning model are proven.

## Navigation and experience coherence

### What works

- Five stable primary actions keep common FIELD destinations reachable.
- TODAY, TRAIN, LOG, DATA, and MORE reflect real operational categories.
- Whole Life is a promising whole-person composition rather than a settings menu.
- Specialist destinations retain inspectable records and corrections.

### What does not yet cohere

- Navigation mixes **moments** (TODAY), **domains** (TRAIN/DATA), **action** (LOG), and **everything
  else** (MORE). That is workable for trained use but does not itself express a Life OS.
- Whole Life is important enough to be opened from TODAY, but remains under a header that reads
  `MORE // LIFE`, exposing its historical placement.
- DATA combines daily health operation, specialist metrics, navigation shortcuts, and the Cave. It is
  powerful but cognitively dense.
- Reflection is split among check-in, Daily Note, Decision Journal, shift debrief, weekly interview,
  Review, and Alfred. Each has valid semantics, but the operator must understand the taxonomy.
- Context pinning can change the visual mode without changing canonical work/off truth. In the observed
  OFF DUTY state, TODAY still displayed PREPARE FOR WORK. The distinction is honest in copy but not
  always coherent in action composition.
- Day-off planning is discoverable, but its first-class button opens prewritten Alfred text. The
  intelligence is strong; the experience depends on an external-model conversation and lacks a native
  reviewed plan before or after that call.

### Recommendation

Keep current primary navigation during the first Project Grayson build. Use it to prove the new
lived-transition composition. Then evaluate whether navigation still obstructs the canonical journeys.
A redesign proposal should follow evidence from at least the opening, closure, and work/home transition
experiences—not precede them.

## Highest-leverage sequence

This is a recommendation, not an approved queue.

1. **Lived-Day Orientation** — assemble the opening transition from existing truth and actions.
2. **Lived-Day Closure** — reflection, tomorrow preview, intentional deferral, and containment.
3. **Work → Home Transition** — connect handoff, debrief, Drive Home, Shift Down, and home orientation.
4. **Day-Off Composition** — recovery, family, home, interests, training, and open time.
5. **Life Stewardship** — long-horizon Home/People/maintenance preparation.
6. **Inner Day** — richer mood/thought/help-intent and difficult-period support.
7. **Delta Learning Dialogue** — inspectable learnings and earned challenge across the proven loop.
8. **Navigation/reimagination study** — compare current IA with the now-proven lived journeys.

## Recommended first objective

### LIVED-DAY-ORIENT-001 — wake, understand, and prepare

**Outcome:** On the first meaningful opening of a lived day, give Gavin one optional, calm orientation
that uses current records to answer: how did I sleep, how do I feel, what kind of day is this, what is
important or unusual, what deserves attention before the next fixed event, and what can wait?

This is the best first objective because it:

- occurs every lived day;
- directly matches Gavin's stated desired first interaction;
- exercises workday and day-off contexts without privileging either;
- connects more existing high-quality capability than it invents;
- establishes the composition pattern later used by closure and transitions;
- creates a useful home for Delta without expanding AI authority;
- can improve value without first changing primary navigation or storage.

#### Proposed bounded scope

- One optional orientation surface on TODAY after a lived day starts or at its first appropriate open.
- Compose existing, source-labelled reads only:
  - last/main sleep and recovery evidence;
  - current schedule/work-context basis and next fixed shift/calendar item;
  - existing check-in state or the existing check-in action;
  - existing Engine recommendation or clearly labelled draft, unchanged;
  - one or two important commitments/reminders already due or planned;
  - current preparation/routine relevance;
  - existing training plan/suggestion without creating a competing recommendation;
  - CAPTURE for a thought;
  - a clear “nothing else needs attention” state.
- Workday composition emphasizes readiness and departure. Day-off composition emphasizes recovery,
  chosen commitments, training, relationships/home only when already due, and protected open time.
- Review/dismiss; all writes continue through existing canonical actions.
- Preserve access to TODAY and every underlying specialist screen.

#### Explicit exclusions

- No new schema/event, Engine rule, recommendation priority, inferred mood/capacity, fasting model,
  notification, provider, dependency, runtime rename, Delta autonomy, or primary-navigation change.
- No automatic scheduling or moving commitments.
- No new universal readiness or life score.
- No full evening closure, Shift Down redesign, mental-health expansion, or Day-Off planner in this
  objective.
- No removal of current TODAY capability until a separately approved replacement proves parity.

#### Reuse disposition

- **REUSE:** TODAY/Life State, `todayPicture`, sleep and measured queries, check-in, Engine/draft
  guidance, work-context resolution, `ahead`, Week Planner/obligations, PREP/routines, training home,
  CAPTURE, source panels, Section patterns, and current tokens/sheet foundation.
- **OWN:** the Project Grayson-specific selection and composition of those truths for Gavin's first
  lived-day orientation.
- **BUILD FROM SCRATCH:** none expected; implementation discovery must confirm.

#### Risk and approval

Protected: this materially changes TODAY composition and how recommendation authority and operator
choice are experienced, even though it should not change their semantics. It requires a separate
owner-approved brief, prototype/experience review where useful, independent exact-head review, green
CI, and Gavin's merge approval.

#### Acceptance concept

- A sparse new day, established workday, established day off, missing sleep, missing schedule,
  check-in complete/incomplete, and unavailable source all remain honest and useful.
- No source failure appears as empty truth; no unknown time appears free.
- Gavin can capture a thought, check in, open the relevant existing action, dismiss orientation, and
  return without losing place.
- The workday and day-off variants visibly serve different realities while sharing one grammar.
- The surface names why each consequential line appears and never creates a second recommendation.
- Phone visual review demonstrates calm hierarchy, fast completion, accessibility, and no dashboard
  wall.

## Final recommendation

Approve **LIVED-DAY-ORIENT-001** next—but approve it first as a Protected design-and-build objective
with the bounded outcome above, not as permission for the entire Daily Life Loop.

After Gavin uses that opening in real life, its evidence should shape Lived-Day Closure and the larger
navigation decision. This preserves BEYOND's investment while beginning Project Grayson where the
relationship starts each day.
