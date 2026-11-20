# Project Grayson — Research-to-Evolution Synthesis

Status: **REPORT-ONLY RECOMMENDATION** — 2026-11-19.

Baseline: `ac858def37523b06b06556b22d9f817b56a36210` (GRAYSON Evolution Rule merged).
This report authorizes no implementation, redesign, rename, replacement, product-authority change,
dependency, provider, Google Drive change, or concurrent-PR change.

## Executive judgment

BEYOND does not need a collection of borrowed features. It needs its existing capabilities composed
around Gavin's lived moments, explained with stronger evidence hierarchy, and connected through a
more capable companion relationship.

The donor research reinforces—not overturns—the current-product baseline:

1. **BEYOND already contains most of the suit.** Current code includes lived-day and shift context,
   check-ins, deterministic guidance, sleep/Garmin evidence, training programmes and live workouts,
   nutrition and hydration, metric stories, obligations/projects/missions, Week Planner, routines,
   preparation, handoff, Shift Down/Drive Home, notes/journal/capture/search, People/Home facts,
   personal ranges/experiments, notifications, corrections, and Alfred tools.
2. **The principal deficit is orchestration.** Gavin still has to know which subsystem contains the
   relevant help. The strongest donor products succeed by selecting and translating timely truth,
   not by exposing every capability at once.
3. **Most donor value is pattern-level ADAPT, not code import.** BEYOND's event model, lived-day
   boundary, Engine authority, owner-wins corrections, local-first behavior, and FIELD doctrine are
   already more specific than commodity systems.
4. **Orientation remains the best first production evolution.** It connects existing evidence and
   actions at the beginning of a real day, demonstrates Delta's relationship without increasing
   autonomy, and establishes a grammar reusable by later transitions.
5. **Quiet Command is the preferred visual/voice direction, not a blank-slate identity.** It must be
   implemented through BEYOND's existing foundation, tokens, navigation, actions, and authority—not
   as a replacement app or imitation of Flighty, Oura, Linear, or a fictional interface.

## Method and limits

### Repository truth inspected

The assessment used the Vision Blueprint, GRAYSON Evolution Rule, current-product baseline, Operator
Interface Doctrine, Decision Register, Capability Map, roadmap, current checkpoint, current master,
open PRs, and direct code/test inspection. Representative implementation seams include:

- `TodayScreen`, `LifeStateBand`, `TodayRecommendationDraft`, `TodayEnergy`, `TodayNumbers`,
  `CheckInSheet`, `CaptureSection`, `ShiftRecoveryBrief`, and `ShiftDownCard`;
- application queries for plan-today, sleep/Garmin, lived context, Whole Picture, weekly planning,
  routines, handoff, notes, personal patterns, training home, and Alfred context/actions;
- TRAIN programme, live workout, history, recovery handoff, BODY dashboard/metrics/meal planning,
  Whole Life, Week Planner, Projects, People, Home, Daily Note, Journal, search, and capture;
- Engine tests preserving NO ACTION REQUIRED, check-in-derived capacity, deterministic recommendation
  ownership, continuity, and post-shift handling.

Repository inspection establishes existence and semantics, not field usefulness. Long-term benefit
still requires Gavin's use. PR #584 and draft PR #473 remain separate. PR #589 was read as prototype
evidence and was not changed.

### External research standard

Commercial products are studied through official product/support material. Open-source projects are
studied through official repositories/docs. A license label is a screening fact, not legal advice or
permission to copy assets, identity, data, or code. Any future dependency or source reuse needs a
fresh objective-specific version, license, security, compatibility, and maintenance review.

## Donor register and rulings

### Situational orientation and planning

| Donor | Proven pattern | Ruling for GRAYSON | Boundary |
|---|---|---|---|
| [Oura Today](https://support.ouraring.com/hc/en-us/articles/42987005571859-How-to-Use-the-Oura-App) | A changing Today surface, personal baseline, timely insights, recent-event timeline | **ADAPT pattern** — dynamic relevance, baseline explanation, recent events | Reject one opaque readiness score and health dominance |
| [Flighty](https://flighty.com/) | Converts complex operational feeds into what changed, why it matters, what may happen, and timely alerts | **ADAPT pattern** — causal situational briefing and consequence-first language | Reject aviation styling and routine-life alarm intensity |
| [Sunsama planning](https://help.sunsama.com/docs/usage-guides/daily-planning/) | Constraints, plan review, visible agent actions, judgment calls, and undo | **ADAPT selectively** — inspectable proposal and reversible judgment | Reject lengthy productivity ritual, automatic plan movement, and celebration mechanics |
| [Linear Mobile](https://linear.app/mobile) | Purpose-built away-from-desk workflows, strict hierarchy, fast capture, snooze, notification schedule | **ADAPT pattern** — disciplined FIELD hierarchy and mobile-specific action | Reject issue-tracker semantics and corporate density for human state |
| [Apple Weather](https://support.apple.com/guide/iphone/check-the-weather-iph1ac0b35f/ios) | Interpretation first, immediate timeline second, progressively deeper evidence | **ADAPT pattern** — conclusion → timeline → detail | Reject decorative empty space and unexplained authority |

**BEYOND consequence:** no new planning store is needed for Orientation. Existing TODAY, life state,
check-in, Engine/draft guidance, schedule, obligations, PREP/routines, training home, capture, and
source disclosures can produce a stronger opening composition. New work is selection, hierarchy,
copy, state handling, and verified routing—not another daily planner.

### Health, nutrition, training, and evidence

| Donor | Proven pattern | Ruling for GRAYSON | Boundary |
|---|---|---|---|
| [MacroFactor expenditure](https://help.macrofactorapp.com/en/articles/20-expenditure) | Outcome-based, adherence-neutral calculation using actual intake and trend weight | **ADAPT later** — judge plans by outcomes, not obedience | Requires sufficient BEYOND evidence and separate nutrition recommendation authority |
| [MacroFactor coaching](https://help.macrofactorapp.com/en/articles/222-how-does-macrofactor-make-adjustments-for-a-weight-gain-or-weight-loss-goal) | Weekly review, smoothing, holding when evidence is insufficient, user acceptance of changes | **ADAPT later** — evidence floors, conservative adjustment, explicit approval | Do not copy proprietary algorithms or imply nutrition precision BEYOND has not earned |
| [Gentler Streak status](https://docs.gentler.app/personalizing-your-profile/what-happens-when-i-set-my-status-to-sick-injured-or-on-a-br) | Intentional break/status suppresses pressure and preserves long-term interpretation | **ADAPT pattern** — explicit constrained context changes communication | Avoid generic fitness status replacing Gavin's check-in and lived context |
| [How We Feel](https://howwefeel.org/) | Nuanced emotion naming, optional strategies, pattern review, on-device default | **ADAPT carefully** — richer optional mood vocabulary and privacy posture | No diagnosis, forced intervention, emotional color as sole meaning, or generic therapy flow |
| [wger](https://github.com/wger-project/wger) | Open exercise/workout/nutrition manager and datasets | **STUDY ONLY** — possible exercise-data reference | AGPL; BEYOND already owns training semantics and UI; direct reuse has high integration/license cost |

**BEYOND consequence:** preserve current TRAIN, BODY, personal ranges, Whole Picture, experiments,
meal/protein/weight logging, and deterministic Engine. Deepen the outcome loop only after enough real
data exists: goal → plan → actual behavior → measured outcome → conservative, owner-approved change.
Do not add a universal readiness score or a second coaching engine.

### Personal data, capture, and inspectable history

| Donor | License/state | Proven pattern | Ruling for GRAYSON |
|---|---|---|---|
| [ActivityWatch](https://github.com/ActivityWatch/activitywatch) | MPL-2.0; active local-first project | Append-like events, local storage, timelines, categories, explicit estimates, privacy filters | **ADAPT data pattern; possible isolated primitive later** — provenance timeline and observation humility |
| [Memos](https://github.com/usememos/memos) | MIT; active self-hosted project | Frictionless thought capture into a personal timeline; search, tags, export | **ADAPT interaction** — capture first, organize later; no subsystem import needed |
| [Nomie 6 OSS](https://github.com/open-nomie/nomie6-oss) | MIT; original project points to a maintained fork | One log can combine free text, trackers, people, and context | **STUDY/ADAPT syntax idea** — flexible capture grammar; avoid runtime parsing as canonical truth |
| [Anytype](https://github.com/anyproto/anytype-ts) | Any Source Available 1.0, not a permissive OSS license | Local/offline-first connected objects, user-defined types, inspectable personal knowledge | **STUDY pattern only** — connected context and object relationships; no code reuse assumption |

**BEYOND consequence:** current capture, notes, journal, search, People/Home facts, event provenance,
and correction paths already cover the foundation. The gap is routing and retrieval in lived context,
not a new notes database. Preserve typed commands as truth; free-form capture may propose structure but
must not silently create it.

### Home, relationships, and stewardship

| Donor | License/state | Proven pattern | Ruling for GRAYSON |
|---|---|---|---|
| [Monica](https://github.com/monicahq/monica) | AGPL-3.0 | People, relationships, activities, notes, tasks, dates, and reminders in one personal timeline | **ADAPT domain model; no direct reuse planned** — connect People facts, dates, obligations, and memories |
| [Home Assistant](https://github.com/home-assistant/frontend/) | Apache-2.0 frontend; active | Many domains under shared state/action/history conventions; customizable views and local control | **ADAPT architecture pattern; possible primitive reuse only if needed** — one coherent system, inspectable automation |
| [Home Assistant Assist](https://www.home-assistant.io/voice_control/) | Local-capable assistant within the HA ecosystem | Natural language operates real capabilities locally or through selected models | **STUDY/ADAPT permission model** — assistant routes to known capability; conversation is not the product |
| [Grocy](https://github.com/grocy/grocy) | MIT; active household manager | Chores, stock, shopping, meal planning, expiry and household state through an API | **ADAPT stewardship concepts; reject wholesale ERP** — intervals, completion evidence, useful lead time |
| [Homebox](https://github.com/sysadminsmedia/homebox) | GPL-family repository; active continuation | Simple but expandable home inventory, locations, search, labels, maintenance metadata | **STUDY only** — useful inventory/maintenance ideas; exact license/need review before any reuse |

**BEYOND consequence:** preserve People, Home facts, recurring obligations, reminders, lists, routines,
projects, and Week Planner. Later stewardship work should connect dates, intervals, completion evidence,
lead time, and context. Reject relationship scoring, automated affection, a home ERP, and a permanent
grid of household tiles.

### Companion intelligence and system coherence

| Donor | License/state | Proven pattern | Ruling for GRAYSON |
|---|---|---|---|
| [Khoj](https://github.com/khoj-ai/khoj) | AGPL-3.0; active | Personal retrieval, multiple model choices, custom agents, scheduled research | **STUDY architecture only** — retrieval and provider separation; reject autonomous-agent sprawl |
| [Open WebUI](https://github.com/open-webui/open-webui) | Source-available branding restriction after v0.6.5 | Offline-capable multi-provider AI workbench | **REJECT as product template; STUDY provider abstraction only** — GRAYSON is not a chat workbench |
| Current BEYOND Alfred | In-repo, approved Anthropic path | Reads BEYOND context, proposes typed actions, uses confirmation/undo boundaries, explains from records | **PRESERVE + ADAPT progressively** — strongest foundation for Delta; identity follows earned behavior |

**BEYOND consequence:** do not bolt on a generic agent platform. Delta should inhabit existing lived
experiences, use BEYOND's typed tools and sources, state assumptions, and remain optional at the point
where deterministic/local capability can do the job. The visual presence is language and judgment,
not a mascot or omnipresent chat panel.

## Cross-journey opportunity map

### 1. Wake and Orientation — **CONNECT + CAREFULLY ADAPT**

**Existing foundation:** START DAY/TODAY, lived-day boundary, Life State, schedule and exceptions,
sleep/Garmin, check-in, Engine and draft guidance, obligations, preparation/routines, TRAIN route,
capture, source disclosures, interruption-safe navigation.

**Gap:** strong facts and actions remain separated. The operator must interpret several surfaces and
know where to go. Delta does not yet deliver one coherent opening relationship.

**Donor contribution:** Flighty's situation/causality; Oura's personal baseline; Apple Weather's
progressive disclosure; Sunsama's visible/reversible proposal; Linear's hierarchy.

**GRAYSON evolution:** Quiet Command Orientation using existing truth and actions. A short Delta
briefing names the situation, distinguishes measured from reported context, presents the existing
canonical recommendation or abstains, and routes at most two supporting actions. Check-in improves
certainty but never gates access.

**Reject:** readiness/life score, new planner, AI call on open, invented capacity, card wall, automatic
schedule movement, health-only framing.

### 2. Live the day — **CONNECT + DEEPEN**

**Existing foundation:** event-backed lived day, fast capture, water/meals/protein, workouts, routines,
reminders, shift marks/handoff, notes, notifications, correction/undo, search.

**Gap:** the system records much of the day but does not consistently summarize what changed since the
last look or time an intervention around the next useful decision.

**Donor contribution:** Flighty live state, ActivityWatch timeline/provenance, Memos frictionless
capture, Home Assistant state/action/history separation.

**Evolution:** one restrained lived-day thread and change-aware re-entry; relevant action while it is
still useful; silence otherwise. No passive surveillance expansion is implied.

### 3. Work entry, operation, and shift-down — **PRESERVE + CONNECT + DEEPEN**

**Existing foundation:** PREP, schedule/run position, shift change, routines, handoff, work start/end,
Shift Down, Drive Home, debrief/journal, recovery brief.

**Gap:** the pieces are unusually strong but do not yet feel like one role transition from Gavin to
Deputy and back. This is a distinctive BEYOND advantage, not a missing commodity feature.

**Donor contribution:** limited. Flighty's phase-aware timing and operational handoff are useful;
generic productivity tools are weak donors.

**Evolution:** reusable transition grammar built after Orientation proves the opening grammar. Protect
work-sensitive boundaries and prevent home life from becoming the next optimization queue.

### 4. Training, nutrition, and recovery — **PRESERVE + CONNECT + DEEPEN LATER**

**Existing foundation:** programme, live workout, sets/effort/warm-ups, history, progress metrics,
personal ranges, sleep/recovery evidence, meals/protein/calories/water, meal planning, targets,
experiments, Whole Picture.

**Gap:** evidence is deep within domains; there is no complete mission-level outcome review joining
goal, programme, intake, recovery, adherence, strength/body outcomes, and justified adjustment.

**Donor contribution:** MacroFactor's adherence-neutral outcome loop and conservative smoothing;
Gentler Streak's intentional-break handling.

**Evolution:** first improve cross-domain review and evidence sufficiency; only later propose bounded,
owner-confirmed plan changes. No proprietary algorithm imitation or competing Engine.

### 5. Mood and difficult periods — **CONNECT + DEEPEN CAREFULLY**

**Existing foundation:** numeric mood/energy/stress/soreness/urge check-in, journal, Daily Note,
personal context, difficult-day doctrine, sleep and behavior history, Whole Picture, support boundaries.

**Gap:** low-burden nuanced thought/context capture and sustained-pattern review are incomplete.

**Donor contribution:** How We Feel's emotion vocabulary and on-device posture; ActivityWatch's
estimation humility; Bearable/Nomie-style context association as a pattern to test, not a causal engine.

**Evolution:** optional richer check-in depth, longitudinal pattern review, help-mode choice, and
explicit sensitive-data controls. One difficult moment never becomes diagnosis or a permanent label.

### 6. Days off, relationships, and home — **CONNECT + DEEPEN**

**Existing foundation:** OFF context, Week Planner, obligations, projects/missions, routines, People,
Home facts, reminders, lists, notes sweep, recurring work, protected open-time doctrine.

**Gap:** separate capabilities do not yet shape a purpose-first day off or surface slow stewardship at
the useful preparation moment.

**Donor contribution:** Monica's relationship-linked history; Grocy/Homebox intervals, inventory, and
maintenance evidence; Sunsama's explicit capacity tradeoff without its work-centric framing.

**Evolution:** day-off composition balancing recovery, family, enjoyment, one meaningful project or
maintenance action, and open time. Stewardship surfaces evidence and lead time, never scores love or
turns home into ERP.

### 7. Operator Model and Delta — **ADAPT PROGRESSIVELY AFTER LIVED USE**

**Existing foundation:** personal facts and memory lifecycle, operator context, typed Alfred tools,
briefs, whole-history reads, pattern queries, experiments, provenance, correction and record versions.

**Gap:** no single inspectable place for observed/hypothesized/confirmed/contested/outdated learning;
Delta's man-in-the-chair voice and selective presence are not yet coherent across lived moments.

**Donor contribution:** local/provider separation from Home Assistant Assist and Khoj; inspectability
from BEYOND's own stronger doctrine; no external product adequately supplies the relationship.

**Evolution:** earn Delta through repeated, grounded experiences. First use deterministic composition
and current Alfred seams; later add inspectable learning lifecycle and bounded permissions. Do not
start with a generic agent framework.

## Ranked evolution sequence

Ranking considers daily frequency, friction removed, reuse leverage, cross-domain benefit, evidence
readiness, risk, maintenance cost, and whether the step strengthens one coherent Life OS.

| Rank | Evolution | Why now | Principal boundary |
|---:|---|---|---|
| 1 | **Production Lived-Day Orientation** | Highest daily leverage; composes many shipped capabilities; research/design/prototype already reduce uncertainty | Protected TODAY composition and recommendation presentation |
| 2 | **Lived-day re-entry and change thread** | Makes existing logs/events useful during the day and reduces repeated interpretation | Attention/notification semantics; no surveillance expansion |
| 3 | **Work entry and shift-down continuity** | Distinctive existing strength; completes role transitions and protects home | Work-sensitive content and transition authority |
| 4 | **Evening closure and tomorrow preparation** | Completes the Daily Life Loop and contains unfinished thought | Reflection burden, reminders, and plan mutation boundaries |
| 5 | **Outcome review for training/nutrition/recovery** | Converts extensive existing records into mission-level evidence | Sufficient samples; recommendation/plan-change authority |
| 6 | **Mood and difficult-period longitudinal support** | Important whole-life gap with existing check-in/journal foundation | Sensitive data, clinical boundaries, inference restraint |
| 7 | **Purpose-first days off and stewardship** | Connects family, home, enjoyment, maintenance, and open time | Avoid work-centric optimization and relationship scoring |
| 8 | **Inspectable Operator Model and earned Delta permissions** | Cross-domain learning becomes valuable after lived journeys produce corrections/outcomes | Consequential AI autonomy, privacy, and correction model |

This is a dependency sequence, not standing authorization. Field evidence may reorder it.

## Orientation and PR #589 reconciliation

PR [#589](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/589) is a valid, reviewed,
non-production visual checkpoint at exact head `19f70be8d7ba101df667df4f9bf8cf19f143464c`.
It proves:

- the approved state set can fit at 320/360/412 px;
- START DAY, exit, enter TODAY, and reopen can be represented coherently;
- Sparse and Unknown can abstain;
- recommendation/supporting-action caps can remain visible;
- the prototype can stay isolated from production commands, persistence, Engine, providers, and AI.

Subsequent owner feedback establishes **Quiet Command** as the preferred foundation and asks Delta to
sound more like Gavin's capable man in the chair: familiar, evidence-aware, willing to make a judgment,
and respectful after an informed decision. That direction is compatible with the merged Orientation
contract but is not implemented by PR #589.

Therefore:

- **PRESERVE** PR #589 as prototype evidence; do not treat it as production code or final visual truth.
- **ADAPT** its proven responsive/state grammar into BEYOND's existing visual foundation.
- **REFINE** Delta copy toward concise personal analytical command, with expandable evidence and
  uncertainty—not generic wellness narration.
- **DO NOT** copy the later static concept image literally, introduce a new color system, or bypass
  current BEYOND identity/navigation/commands.
- **DO NOT** derive implementation authority from the prototype's sample recommendations. Production
  must show the existing canonical Engine/draft guidance or honestly abstain unless Gavin separately
  approves a new recommendation composition rule.

PR #589 may be merged as isolated historical prototype evidence if Gavin wants it retained in master,
but it is not a prerequisite for production implementation and should not be described as the final
design. Closing it would lose no shipped capability. This report makes no merge/close decision.

## Recommended next objective

Approve **LIVED-DAY-ORIENT-PRODUCTION-001** as a bounded Protected implementation objective.

### Outcome

After Gavin deliberately presses START DAY, BEYOND opens one phone-first Quiet Command Orientation
that composes existing repository truth into a calm briefing and routes to existing actions. Gavin can
exit immediately, enter TODAY, reopen Orientation, inspect sources, and operate every underlying
capability as before.

### Required behavior

- Reuse existing lived day, work/off context, schedule, sleep/Garmin, check-in, Engine/draft guidance,
  obligations, PREP/routines, TRAIN, capture, and source/error states through application-layer reads.
- Preserve the approved hierarchy: Situation → You → Delta → zero/one canonical recommendation → at
  most two supporting actions → Release.
- Check-in improves context but never gates Orientation. Missing or failed data lowers certainty and
  remains explicit.
- Delta uses deterministic, evidence-grounded Quiet Command copy for this slice: concise, personal,
  direct only when evidence and consequence earn it, and respectful after Gavin decides. No automatic
  AI/provider call is needed to open the day.
- Use BEYOND's current visual foundation, identity, primary navigation, commands, and correction paths.
- Cover realistic workday, day-off, difficult-day, sparse, unknown-context, source-failure, interrupted,
  and resumed states at phone widths.

### Explicit exclusions

- No new Engine/recommendation semantics or priority, universal readiness/life score, inferred mood or
  capacity, automatic scheduling/moving, new schema/event, notification, provider/dependency, AI call,
  runtime rename, primary-navigation change, removal of TODAY capability, Google Drive change, or
  implementation of later lived-day/closure/stewardship stages.
- If the approved visual hierarchy cannot be satisfied without creating a recommendation beyond
  current canonical guidance, stop and return to Gavin with the exact conflict rather than inventing
  one.

### Leverage disposition

- **REUSE:** current TODAY and visual foundation, application queries, Engine/draft authority, current
  actions/routes, merged Orientation design, responsive/state evidence from PR #589, and donor patterns
  classified above.
- **OWN:** the BEYOND-specific composition, Quiet Command language, state arbitration, source/error
  handling, and transition into/out of Orientation.
- **BUILD FROM SCRATCH:** no commodity subsystem; only the bounded composition not present today.

### Acceptance concept

- Demonstrate each state with truthful repository-backed fixtures and no invented telemetry.
- Prove no second recommendation or hidden write exists.
- Prove all current actions and TODAY remain reachable, interruption/resume is safe, sources/errors are
  honest, and empty/unknown states remain useful.
- Verify focused behavior/regressions, architecture, type/build, accessibility, 320/360/412 layouts,
  realistic visual evidence, independent exact-head review, green required CI, and Gavin's physical-
  phone assessment before merge approval.

## Final recommendation

Stop broad product hunting after this synthesis. Continue targeted research only when a bounded
objective encounters a real design, standards, licensing, or implementation question.

The fastest responsible path toward GRAYSON is not to add more domains. It is to make one existing
moment feel unmistakably like the Life OS: BEYOND knows the current field, Delta explains the best
supported next move, Gavin remains in command, and every existing capability is still there when he
needs depth.
