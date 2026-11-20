# GRAYSON-FRONTIER-001 — supporting evidence for the existing campaign

Status: **REPORT-ONLY RESEARCH; NOT A ROADMAP OR OBJECTIVE AUTHORIZATION.** Reconciled 2026-11-20
against master `421bbb89722c43ba7ea2f28972b13b77e5262592`, including merged Home PR #594 and narrowed
owner-editable caffeine PR #595. The original report used `211ccf4`; its implementation-gap and
priority claims must not be carried forward without the corrections below.

**Risk lane: PROTECTED** — report-only research affecting Project Grayson planning evidence;
requires independent exact-head review and Gavin’s merge approval (explicit owner ruling, 2026-11-20).

## Mandate, authority and method

Gavin authorized the original focused research run and now explicitly rules that this PR is supporting
research, not a new roadmap. Codex continues Claude Code's draft [PR #592](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/592)
on `claude/project-thread-exirjg`, from `3b207a8fa988f946031dd05d6b546414aaa35665`, reconciled with the
exact master above. The whole original report was audited; this revision replaces its ranked portfolio,
mini-briefs and unsupported conclusions with bounded findings, provenance and links to existing items.
The Git history preserves the original. This document and the PR description are the research brief;
no additional authority or implementation document is created.

**C1.1 Production Orientation remains the next major implementation objective.** There is no new queue,
scoring/ranking system, prerequisite repair campaign or promise to begin another research run. No product,
tracker, roadmap, checkpoint, capability map, governance source or PR #589 is changed by this research.
A proposal mentioned here is only a research candidate for an existing campaign item, not a new objective.

Authority remains with the [Project Grayson Vision](PROJECT_GRAYSON_VISION.md), its
[Evolution Rule](PROJECT_GRAYSON_VISION.md#grayson-evolution-rule), the
[Operator Interface Doctrine](OPERATOR_INTERFACE_DOCTRINE.md), locked [Decision Register](UX_DECISIONS.md),
[merged research synthesis](GRAYSON_RESEARCH_SYNTHESIS.md), and owner-approved
[Campaign Plan](GRAYSON_CAMPAIGN_PLAN.md). The plan's tracker is the only campaign status record;
this report neither changes its order nor grants approval. Workflow remains [DEV-FLOW-002](agent/DEV-FLOW-002.md).
The original specialist-role signatures are removed: analytical perspectives are not evidence of
external expert review or scientific validation.

### Evidence labels

- **V-code:** verified in the cited repository files at the exact master above. This establishes
  implementation, not that a model is physiologically valid or a device setting is correct on Gavin's phone.
- **V-primary:** the stated passage was accessible on the original author/publisher/manufacturer page;
  abstract/manual access is distinguished from full-paper access in the source register.
- **P-indexed:** an original paper's abstract/excerpt was available through the search index on its primary
  publisher/PubMed/PMC record, but direct article retrieval was blocked or incomplete. Only that limited
  statement is retained; this is not full-text verification or a systematic scientific review.
- **H:** informed hypothesis or design inference. It remains untested for Gavin.
- **A:** assumption requiring operator/device/field confirmation. Absence is not a negative observation.

No patient records, real health exports or private phone settings were inspected. Repository defaults
include an 18:00–06:00 alternating two-week pattern (`engine/scheduledContext.ts`); this is **V-code**,
not verification of Gavin's actual current calendar or schedule exceptions. The watch model, firmware,
normal sleep hours and current delivery pipeline remain **A** unless Gavin confirms them.

## Findings retained, with corrections and existing campaign mappings

The mappings below are thematic reuse links, **not an ordered work list**. Campaign scope, status and
approvals remain in the Campaign Plan. Findings may inform C1.1's honest source/unknown-state treatment;
they do not delay it or authorize domain expansion.

### Energy timing and drive-home language — C4.1; evidence handling in C1.1/C1.2

**V-code:** `application/alertness.ts` places the circadian component's low 1.5 hours before the median
recent wake time. The displayed curve also includes modeled sleep pressure and assumed sleep; its lowest
waking stretch is not identical to that circadian anchor. The drive line appears only if the hour after
shift end overlaps that modeled stretch. `application/alertnessQueries.ts` supplies planned/usual sleep
and calendar-safe lived-day bounds; `ui/screens/today/TodayEnergy.tsx` labels the output an estimate.

**P-indexed:** Folkard's permanent-night-worker review reports incomplete circadian adjustment in many
participants. Lee's small closed-track study reports adverse post-night-shift driving outcomes [S1–S2].
Neither measures Gavin's circadian phase, validates BEYOND's curve, supplies his crash probability, or
shows that the drive home is invariably his riskiest hour.

**H:** recent sleep timing may be an imperfect proxy for circadian phase on rotating nights. An off-day
rhythm or generic morning anchor is another proxy, not an automatically validated replacement.

**Corrected simulation claim:** the original report's “warning goes quiet on exactly the nights that
matter” and verified-defect/priority conclusions are withdrawn. A reproduced pure-function comparison
on current code depends materially on whether planned sleep is supplied (details below). The original
simulation was not a production-query test and its full inputs were not preserved. It cannot justify
forcing a 03:00–08:00 low or asserting where Gavin's body actually is. Any C4.1 change requires its own
bounded validation and approval; C1.1 can preserve uncertainty without inventing physiology.

### Shift-down and being home — C2.2, C2.3 and C2.6

**V-code:** `ui/screens/today/ShiftDownCard.tsx` and `resetShiftDownCopy.ts` already expose optional
shift-down durations (5–30 minutes), a post-shift plan and existing completion/cancel routes. Capture,
`ui/components/DriveHome.tsx`, handoff and journal are separate reusable paths; the Engine already owns
shift-down recommendation behavior. This is not a missing transition subsystem.

**P-indexed:** Balban's paper describes a daily five-minute breathwork intervention [S4]. It does not
validate the original proposed one-minute police shift-down intervention or prove better sleep. The
original paper-title-only claims about plans eliminating mental pull and press-release sleep-onset
benefits are not retained as efficacy evidence.

**H:** a brief, optional bridge using existing capture, timer and role-transition grammar may reduce
interaction friction. “Two minutes” is an untested UX target, not an established therapeutic dose.
Field evaluation belongs to the existing item, with genuine skip/exit and manual routes preserved.
Local storage is not permission to capture restricted work details; no calls, cases, names or addresses
should be solicited. Agency policy and the doctrine's sensitive-data boundaries remain binding.

### Night nutrition and expenditure trust — C4.5; C4.8 only within its separate boundaries

**V-code:** `engine/expenditure.ts` uses completed days with recorded calories and explicitly assumes
those days' meals were all logged. Partial intake can bias the estimate; missing meals cannot be
identified simply because calories are low. `ui/screens/weekly/weeklyCopy.ts::describeExpenditure`
**already shows** the number of meal-logged days and the completeness assumption. The original claim
that no coverage information is shown was incorrect and is removed. Existing diary, PREP, meal plans,
lookup and confirm-first target proposals remain the foundation.

**P-indexed:** Chellappa's study concerns meal timing and glucose tolerance under simulated night work
[S5]. This motivates a research question, not a universal overnight fasting rule, weight-loss outcome,
or police-shift meal prescription. Lab protocols do not establish what Gavin can safely or comfortably
follow at work. No specific glucose percentage or intake-underreporting figure is retained here.

**H:** owner-confirmed completeness information could make future estimate review more honest; it
cannot be inferred as fact from one low-calorie day. C4.5 already addresses partial logging. New records,
exclusions or Engine changes still require their own approval. MacroFactor's numerical examples describe
its proprietary model, not BEYOND's estimator; their exact bias/duration is rejected as transferable evidence.
C4.8 does not become approved merely because meal-timing research exists.

### Fatigue-aware training — C4.4; outcome/context questions in C4.5

**V-code:** `engine/trainSuggestion.ts` already provides RED/RESET, YELLOW/REDUCED and GREEN/STANDARD,
with the existing short-sleep trace able to reduce GREEN's session. `engine/sleepStreak.ts` owns that
signal. Performed-set effort is recording, not a new recommendation input. Current templates, variant
semantics, rotation advancement and operator override are preserved.

**P-indexed:** Craven's pooled research reports performance effects under acute sleep loss [S6]. It
does not validate an individualized best training window, transfer day-living AM/PM effects to Gavin's
rotation, prescribe a per-hour penalty, or establish that all strength outcomes are equivalent under
fatigue. The original universal “costs nothing in strength” inference is rejected.

**H:** existing shift/sleep windows may support a conservative feasibility display under C4.4. “Fits
before work” must not become “physiologically best.” The original fewer-sets/2–3-reps-left instruction
is not treated as an approved prescription; any new effort or timing rule needs its own evidence and
applicable Protected approval. No readiness score or parallel coaching engine is proposed.

### Garmin limits and day-sleep uncertainty — C4.7; source honesty in C1.1/C1.2/C6.4

**V-primary:** the vivoactive 4/4S manual describes normal sleep hours set in Garmin Connect and says
naps are not added to its sleep statistics [S7]. It does not establish Gavin's current settings or prove
that sleep outside those hours can never be detected on every firmware. The original “one setting
that decides whether main sleep is recorded” wording was too categorical.

**V-code:** the Health Bridge manifest requests sleep, steps, heart rate, resting heart rate and
active/total calorie reads; its source uses the corresponding Health Connect records. It declares no
Internet permission. This proves a read capability, not that Garmin actually supplies each record on
Gavin's device. `engine/sleepRhythm.ts` chooses the longest qualifying imported sleep per lived day;
its three-hour eligibility floor and missing imports limit coverage. Canonical owner corrections,
GARMIN-003 reconciliation, freshness/sync and manual logging remain authoritative.

**A:** missing day sleep could reflect measurement, watch configuration, sync/export delay, permissions,
classification or an incomplete plan—not necessarily no sleep or a broken watch setting. A model-specific
phone check is needed before diagnosing the cause. Resting HR availability likewise needs source-specific
verification; omission from a press list proves nothing.

The original press-derived universal Garmin export list, non-Garmin wearable miss rates used to imply
Garmin performance, and categorical HRV/Body Battery availability conclusions are not retained. The
current Garmin support page could not be read beyond its shell [S8]. Android's support for a record type
would not prove that a particular Garmin device writes it. No new sensor/API integration or prompt is
authorized here; source-failure grammar can inform C1.1 without adding a diagnosis or another tracker row.

### Days off as life — C1.2, C3.3; stewardship reuse from merged C3.4/C3.4a

**V-code:** `application/recoveryContract.ts`, `postRunReport.ts` and `lifeTransition.ts` already connect
run-end recovery to existing plan items. Week planning, Home/People facts, recurrence, routines and capture
exist. PR #594 has already added dog/CO presets and optional Home alert time; these are not missing work.
The default Home alert time is not a delivery promise.

**V-primary, abstract only:** Tonietto/Malkoc report differences between scheduled and spontaneous leisure,
including an experiment condition described as rough scheduling [S9]. This supports investigating optional,
flexible presentation, not an individualized claim that Gavin should never schedule enjoyable time.

**H:** a rough day-off shape and a relevant existing stewardship item may help, if Gavin finds them useful.
They must remain optional: no automatic booking, partner/relationship scoring, manufactured obligations,
or assumption that off time is spare productive capacity. The original time-purchase and household-labor
figures add no necessary decision evidence for this bounded reconciliation and are removed. The Vision
already treats family, hobbies, restoration and open time as first-class life, independent of these papers.

## Caffeine reconciliation — merged C4.2a, not a proposed replacement

**V-code:** PR #595 is merged at the audited master. `application/sleepPlanSettings.ts` stores an explicit
owner-selected cutoff (six-hour default, 3–12 whole-hour editing), OWNER origin/time, SAVE and guarded UNDO.
`shiftSleepPlan.ts` and `alertnessQueries.ts` use the same selected value. Settings survive schedule edits
and native backup, with malformed values handled by validation. There is no automated Delta proposal,
count confidence, decline timer, or caffeine exposure/adherence model. The current source presentation
states general research limitations; do not revive the older “Delta learned a better cutoff” proposal.

**P-indexed:** Gardiner's meta-analysis includes dose/timing estimates for specific modeled doses [S3].
Those numbers are population/model results, not Gavin's personal thresholds. The original claim that
BEYOND's constant was simply outdated or “the evidence moved, so use 8.8/13.2 hours” is withdrawn. Neither
coffee, pre-workout nor energy-drink labels alone determine actual consumed dose or adherence.

C4.2 remains the existing campaign location for per-drink questions; this report does not approve it or
rewrite its scope. Actual consumption logging is not rejected as “little gain”: exposure is essential to
any claimed personal caffeine effect. A separately authorized objective may later use BEYOND's existing
experiment lifecycle, with exposure/adherence context, duration, outcome measures, stopping conditions,
provenance and Gavin's consent. That is deferred direction, not a new item, implementation or priority.

## Source verification register — 2026-11-20

All retained scientific statements are limited to the accessible level below. A search result for a
primary record is distinguished from reading that paper. Access failures were left alone; no bot checks,
paywalls or authentication were bypassed. This is a focused audit, not a comprehensive literature review.
No retained exact clinical effect-size claim depends on a secondary press/product summary.

| ID | Primary source | Access/result and retained scope | Explicit limit |
|---|---|---|---|
| S1 | [Folkard 2008](https://pubmed.ncbi.nlm.nih.gov/18533325/) | P-indexed original abstract: permanent-night-worker melatonin adaptation is heterogeneous/incomplete | Not rotating-worker validation or Gavin's phase; original percentages not used as his probability |
| S2 | [Lee et al. 2016](https://pubmed.ncbi.nlm.nih.gov/26699470/) | P-indexed original abstract: small within-person closed-track post-night-shift comparison | No individual crash probability or universal “riskiest hour” claim; original percentages removed |
| S3 | [Gardiner et al. 2023](https://pubmed.ncbi.nlm.nih.gov/36870101/) | P-indexed original abstract: caffeine timing/dose meta-analysis | Not a safe/personal cutoff, a validation of an energy-drink rule or evidence that caffeine caused Gavin's short sleeps |
| S4 | [Balban et al. 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947/) | P-indexed original publication excerpt: daily five-minute breathwork trial | No full-text verification in this audit; no one-minute police-transition or better-sleep claim |
| S5 | [Chellappa et al. 2021](https://pubmed.ncbi.nlm.nih.gov/34860550/) | P-indexed original abstract: simulated night work/daytime versus nighttime eating protocol | Direct retrieval returned an incomplete page; no press-release glucose percentage or field prescription retained |
| S6 | [Craven et al. 2022](https://pubmed.ncbi.nlm.nih.gov/35708888/) | P-indexed original abstract: acute sleep-loss/performance synthesis | Direct retrieval incomplete; no personal training penalty/window or AM/PM transfer asserted |
| S7 | [Garmin vivoactive 4/4S sleep manual](https://www8.garmin.com/manuals/webhelp/vivoactive4_4S/EN-US/GUID-70D41BFB-2BB2-4933-BF95-47FF63140112.html) | V-primary: manual text directly read, normal sleep hours and nap-statistic limitation | Not verification of actual watch model, firmware, settings or real import completeness |
| S8 | [Garmin Health Connect support](https://support.garmin.com/en-US/?faq=JToBEy0jfe6pIygark2Ui5) | Page identified, substantive export table not accessible beyond shell | Unverified; no detailed capability/exclusion list inferred from it or substituted from press |
| S9 | [Tonietto & Malkoc 2016](https://journals.sagepub.com/doi/10.1509/jmr.14.0591) | V-primary: publisher abstract read; full article restricted | Study context, not a prescription for Gavin's days off |

**Original sources not promoted to evidence in this revision:** Smith/Eastman countermeasure detail,
Masicampo/Baumeister title-only efficacy claim, detachment-meta-analysis effect claims, Scullin/Baylor
press account, Clark/Monash intake figures, Ravelli/Schoeller numerical underreporting, ISSN dose/spacing
prescriptions, Gupta/Knowles/Ferguson title-only conclusions, Hickmott equivalence inference,
Chinoy non-Garmin miss percentages, Shcherbina “weakest number” ranking, and Whillans/Daminger figures.
No new full primary-text verification was established for those claims in this audit; title/press
summaries cannot carry intervention or personalized conclusions. They can be investigated only if a
future approved item needs them. MacroFactor/Rise/Timeshifter marketing remains product claims;
relevant donor dispositions are already in the merged synthesis, not renewed clinical evidence.

## Reproduced energy-model check (V-code; not clinical validation)

Unchanged `application/alertness.ts`, executed with Node's TypeScript stripping and
`TZ=America/Chicago`; lived window 2026-11-17 16:30 → 2026-11-18 16:30; shift end 06:00.
Historical day-sleep fixture: Nov 13–17 inclusive, each 07:30–14:00. Circadian anchor in both cases:
median wake 14:00 minus 1.5 hours = 12:30. The displayed waking low differs because the full model
also uses sleep pressure and assumed sleep:

| Input difference | Lowest waking stretch | Drive line |
|---|---|---|
| No planned sleep supplied | Nov 18 07:30–16:30 | Absent |
| Planned Nov 18 07:30–14:00 supplied | Nov 18 04:30–07:30 | Present |

A separate fixture with five night sleeps (Nov 12–16 at 23:00 → following day 07:00), and a mixed
fixture (Nov 15–17 day sleeps plus Nov 12 23:00–Nov 13 07:00), both with the same planned Nov 18
07:30–14:00 sleep, also produced the drive line. The production query explicitly supplies planned/usual
sleep when available (`application/alertnessQueries.ts`), subject to its overlap and evidence conditions.
This does not prove the physiology or guarantee warning coverage; it shows why an omitted-input
simulation is not sufficient evidence of a production defect. Normalized curve values are not measured
alertness and are deliberately not presented as a safety score.

## Conflicts, unresolved questions and dispositions

- **Corrected/rejected:** the original ranked seven-objective portfolio, numerical scores, proposed order
  before Orientation, and “Gavin is holding Orientation” claim are removed. No current owner ruling
  supporting that hold was established. C1.1 remains next; this research is not a hidden prerequisite.
- **Unresolved model question:** recent wake is not a measured circadian phase. A replacement model,
  off-day anchor or warning policy needs validation and bounded approval; this report chooses none.
- **Campaign accuracy question surfaced for Gavin:** C4.1's campaign framing treats the old report's
  early-low/drive-warning concern as a fix. The code concern is a legitimate hypothesis, but this audit
  does not substantiate the original production-failure conclusion. A campaign wording correction may
  be warranted; the plan/tracker is intentionally not edited here. Its scope/order cannot be silently
  changed by this report. Likewise C2.2's short interaction target must not be sold as a studied
  one-minute breathwork treatment.
- **Doctrine/locked-rule boundary:** guaranteed personal lows, causal caffeine learning, automatic
  completeness exclusion, new training prescriptions, repeated prompts or new warning moments would
  exceed the evidence or existing authority. The old “Feature unless Gavin calls it Protected” lane
  assignment is withdrawn; each future bounded change follows DEV-FLOW-002 and locked decisions.
- **Device questions:** actual watch/model, sleep-hour setting, source-specific Health Connect records,
  permissions and sync coverage remain unverified. A manual check can answer these without adding a
  tracker item or inferring that an absent record means no sleep.
- **Operator questions:** whether a brief shift-down bridge, rough day-off shape or completeness marking
  helps Gavin remains a field question, not an established benefit. No unsolicited family scheduling,
  readiness score, mood inference or automatic behavior change is justified by these studies.
- **Retained:** current code pointers, sensor/source limitations, model-input sensitivity, partial-intake
  assumptions, context-limited scientific leads, and their mappings to existing campaign items.
- **Deferred:** caffeine experiments, per-drink rules, model replacement, completeness records and any
  implemented intervention. No future research run is implicitly authorized or scheduled.

## Leverage gate, verification and recommendation

- **REUSE:** current shift-sleep plan, owner-editable cutoff, energy query/model, source/correction paths,
  Shift Down, Drive Home, capture, recovery contract, recurrence, expenditure coverage and Engine training
  rules. Existing experiments remain the future boundary for properly authorized personal science.
- **OWN:** the evidence-to-existing-campaign mapping for the 16:30 lived day, with clear source limits.
- **BUILD FROM SCRATCH:** none.

Only this research report changes relative to the exact reconciliation master. Verify local links and
anchors, report-only diff and source ledger, and required CI. The ephemeral model check above modifies
no production code or tests. No new full app test/build or physical-phone result is claimed. Final
candidate head and live CI are recorded in the PR description/handoff; CI does not validate science.

**Recommendation:** retain and merge this as supporting research only after fresh independent review,
green required CI and Gavin's approval. It is not a roadmap, a product ruling or permission to start
C1.1 or any proposed intervention. No governance correction is made under cover of this report.
