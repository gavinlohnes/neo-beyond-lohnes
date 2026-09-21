# BEYOND — UX Decision Register

Concise, durable record of product/UX behavior that has been explicitly
decided and locked in this codebase's chat-built rebuild lineage (see
[README.md](../README.md#versions--lineage) for the lineage explanation).
Written for future sessions (human or Claude) so a decision doesn't need
to be re-derived from git archaeology or re-litigated by accident.

Each entry is the *decision*, not the implementation — see the linked
file for the current code. If code and this register disagree, treat it
as an authority conflict to adjudicate; do not silently assume either
that implementation overrides a locked decision or that stale prose
accurately describes current behavior.

## Constitutional adjudication

Locked 2026-08-29: [`OPERATOR_INTERFACE_DOCTRINE.md`](OPERATOR_INTERFACE_DOCTRINE.md) is the
durable constitutional authority for what BEYOND's operator interfaces are allowed to mean.
This register records narrower locked product/UX adjudications under that doctrine; code and
tests record current implementation truth. Neither doctrine nor this register independently
authorizes implementation: future changes require a direct owner decision and an explicitly
authorized, bounded Drop. `FIELD_ALPHA_CAMPAIGN.md` remains unchanged historical evidence, not
standing implementation authority.

## FOUNDATION-1A — Product-language pillars & behavioral guarantees

Locked 2026-09-16, direct owner authorization (FOUNDATION-1A, a doctrine/architecture
reconciliation Drop — see `docs/agent/drops/FOUNDATION-1A.md` for the full reconciliation
matrix and evidence trail). These are official product-language names for guarantees
`OPERATOR_INTERFACE_DOCTRINE.md` and this register already establish, reconciled against
repository truth rather than pasted in as new authority, plus one newly authorized guarantee
(ENJOYMENT_COUNTS). A pillar name here never renames or supersedes the lower-level
architectural/doctrine term it reconciles to (e.g. STABILIZE → RECOVER → EXECUTE, INFORM →
INTERPRET → RECOMMEND → USER DECIDES) — both names refer to the same guarantee; use whichever
is clearer in context.

### Pillars

- **Quiet Intelligence** — BEYOND recedes by default and escalates attention only when evidence
  earns it. Reconciles to doctrine's KNOW → ANTICIPATE → SURFACE → CONFIRM/CORRECT → LEARN →
  RECEDE loop and its four-question escalation test
  (`OPERATOR_INTERFACE_DOCTRINE.md` "Depth, attention, and control").
- **Attention Supremacy** — the operator's attention is the scarcest resource in the system;
  recommendation surfacing spends as little of it as truthfully possible. Reconciles to
  doctrine's Attention states (AVAILABLE/SUGGESTED/ATTENTION/CRITICAL) and "Availability is not
  urgency."
- **Quick Log** — the fastest path to record something true is always available and never
  requires organizing it first. Reconciles to Capture (`captureItem` in
  [commands.ts](../src/application/commands.ts) — "capture first, organize second, act only
  when clarified") and BODY's quick-add water control.
- **Automatic Time State** — BEYOND infers day/time state from real activity rather than asking
  the operator to declare it. Reconciles to lazy day creation (`ensureActiveDay()`, see "Day
  model" below), the PRIMARY/SUPPLEMENTAL sleep model and overnight-shift handling, and
  `scheduledContext.ts`'s non-authoritative work-phase suggestion.
- **Human Control** — user authority is absolute; BEYOND recommends, the operator decides.
  Reconciles to doctrine's "user authority is absolute" and gets its concrete, testable shape
  from the USER_DECIDES / MANUAL_INPUT_ALWAYS_AVAILABLE / AI_CANNOT_SILENTLY_CHANGE_PLANS
  guarantees below.
- **No Gamification** — no shame copy, punitive streaks, failure theater, withheld capability,
  nagging, or engagement pressure. Reconciles to doctrine's "No guilt mechanics" and "Measure
  operator burden—not engagement" (`OPERATOR_INTERFACE_DOCTRINE.md` "Operator Model and
  reality" / "Evidence, experiments, and field learning").
- **Progressive Disclosure** — capability depth coexists with surface calm; deeper detail is
  opt-in, never forced. Reconciles to doctrine's four depth levels (Surface/Operate/Inspect/
  System), the `FieldDisclosure` component
  ([FieldDisclosure.tsx](../src/ui/components/FieldDisclosure.tsx)), and the Exposed Machinery
  reveal pattern (see "Visual system — red budget" below).
- **Continuity** — an interrupted operation resumes at the point of interruption, never
  silently restarted or abandoned. Reconciles to doctrine's "Interruption preserves state and
  intent," CONTINUITY-001 (workout/day/navigation continuity), and RESET/SHIFT DOWN's own
  documented resumability (see "RESET / SHIFT DOWN" below).

### Behavioral guarantees

- **USER_DECIDES** — every Recommendation is a proposal, never an executed action; only an
  explicit operator action commits a plan. Already the literal decision model: INFORM →
  INTERPRET → RECOMMEND → USER DECIDES.
- **NO_CATCH_UP** — BEYOND never demands retroactive completion of missed days/logs as a
  precondition for using it today. Reconciles to lazy day creation (no day exists until an
  action needs one), doctrine's "not a dashboard, backlog, or demand for interaction," and the
  check-in reminder's hard at-most-once-per-day cap (no accumulating reminders).
- **REDUCE_BEFORE_SKIP** — when capacity is constrained, BEYOND's first move is to offer a
  reduced version of the plan, not to drop it. Reconciles to `trainSuggestion.ts`'s
  capacity-driven session variant (RED → RESET, YELLOW → REDUCED, GREEN → STANDARD) and
  doctrine's "shorter reality path: preserve essential capability, reduce decisions and steps."
- **ONE_PRIMARY_RECOMMENDATION** — the Engine surfaces exactly one primary Recommendation at a
  time, never a competing list. Already literal: `evaluate.ts`'s single-recommendation
  arbitration and doctrine's "the deterministic Engine owns one primary Recommendation."
- **MANUAL_INPUT_ALWAYS_AVAILABLE** — every assisted/prefilled input path has a manual fallback
  that is never blocked or degraded by the assist failing or being unavailable. Already literal:
  doctrine's "manual operation remains available," concretely BODY's USDA lookup (a failed or
  absent lookup falls back to manual entry, never blocks logging).
- **AI_CANNOT_SILENTLY_CHANGE_PLANS** — a prediction or inference never becomes committed state
  without an explicit operator action. Reconciles to doctrine's learned-shortcuts guarantee
  ("never silently execute consequential actions") and the concrete `scheduledContext.ts`
  boundary: prediction never writes `workContext`; only the explicit `setWorkContext` command
  can.
- **ENJOYMENT_COUNTS** (new canon) — subjective enjoyment/satisfaction is a legitimate signal to
  record and surface back to the operator, not a lesser one than raw adherence; a
  completed-but-disliked session and a skipped-but-enjoyed one are both honestly representable.
  Scope boundary: this does not reopen or change "Recommendation Engine — outcome ratings stay
  observational" below — enjoyment stays observational data, same as any other Outcome rating,
  unless a future Drop is separately authorized to change that.
- **BEYOND_MAY_DO_LESS** — a successful outcome can be BEYOND doing nothing. Already literal:
  doctrine's "**NO ACTION REQUIRED** is a successful FIELD state."
- **NO_FAKE_PRECISION** — BEYOND never presents a fabricated, guessed, or default-substituted
  number as if it were real. Already this repo's existing "no fabrication" doctrine in practice
  — e.g. `getEffectiveProteinTargetG()` returning `undefined` rather than a guessed number (see
  "NUTRITION TARGETS" below) — and doctrine's "must not fabricate missing facts."

A future implementation Drop that touches behavior one of these guarantees describes should
cite the guarantee name above alongside its underlying mechanism — the name is a pointer to the
mechanism, not an independent authority of its own.

## FOUNDATION-1B — Operational Continuity

Locked 2026-09-20, direct owner authorization (FOUNDATION-1B — see `docs/agent/drops/
FOUNDATION-1B.md` for the full contract). Formalizes three concepts FOUNDATION-1B's product
objective ("what matters right now?") requires and the existing architecture already implied but
had not yet named or completed: a bounded Attention Authority, a Continuity Engine, and a
resolved arbitration-priority question. Terminology note: this Drop's "Continuity Engine"
(historical DROP/DEFER/REINTRODUCE relevance resolution, `engine/continuity.ts`) is distinct from
the existing "Continuity" pillar above (interruption/resume, `OPERATOR_INTERFACE_DOCTRINE.md`'s
"Interruption preserves state and intent") and from CONTINUITY-001 (workout/day/navigation
continuity) — three different concepts that happen to share the English word "continuity," not
one renamed concept. Keep them distinct when citing this section.

- **PROTECT vs EXECUTE — resolved as Advisory-only PROTECT.** FOUNDATION-1B's arbitration
  hierarchy (`STABILIZE → PROTECT → RECOVER → EXECUTE → OPTIONAL`) and its Scenario B ("PROTECT
  outranks EXECUTE") were found, during investigation, to conflict with the locked
  INTENT-ARBITRATION-001 entry above, which ranks `OBLIGATION_DUE` — the closest existing
  analogue — below `EXECUTE_PLANNED_WORK` and records that the owner "explicitly rejected"
  ranking it higher. Presented to the owner directly rather than silently resolved either way
  (matching this register's own stated rule and INTENT-002's precedent for reopening a locked
  ranking). **Resolved: `evaluate.ts`'s kind set, ranking, and trace shape are unchanged —
  INTENT-ARBITRATION-001 stands exactly as locked.** A shift-protection concern instead composes
  into an INTERRUPT-tier `AdvisoryNote` (`engine/shiftProtection.ts`'s `evaluateShiftProtection`,
  composed by `engine/advisory.ts`'s `composeAdvisoryNoteFromShiftProtection`) that accompanies
  whatever `evaluate.ts` selected as primary — it never becomes a competing Engine kind. Gated on
  `scheduledContext.ts`'s existing `PRE_WORK` phase, a real scheduled work day, capacity not
  already RED/YELLOW (the operator's own physical state still wins first), and an unmet Minimum
  Day hydrate/protein floor (reusing MINIMUM DAY's already-locked 40oz/25g thresholds — see
  "Recommendation Engine" and Minimum Day's own six-item baseline — rather than inventing a new,
  unconfigured "shift protection" number).
- **TIME.** FOUNDATION-1B's illustrative TIME-state list (wake period/pre-shift/on-shift/
  post-shift/wind-down/sleep window/off-day) is satisfied for this Drop by reusing
  `scheduledContext.ts`'s existing, tested `SchedulePhase` (`PRE_WORK`/`SCHEDULED_SHIFT`/
  `EXPECTED_POST_WORK`/`OFF`) exactly as-is — "Automatic Time State" above already names this the
  canonical mechanism, and the brief itself asks to "use existing repo concepts where available
  rather than creating unnecessary duplicate representations." **Deliberately not built this
  Drop:** a finer wake/wind-down/sleep-window state distinct from the work schedule. No
  acceptance scenario requires it, and no real-time wake/sleep-detection signal exists to ground
  it honestly — BEYOND only ever learns about sleep after the fact, via a logged `SLEEP_LOGGED`
  duration, never a live clock-based wake/bedtime event. Building it would mean fabricating an
  unconfigured threshold (e.g. "wind-down starts at 9pm"), which NO_FAKE_PRECISION and this
  Drop's own "do not create speculative abstractions" instruction both rule out. Revisit only if
  a future Drop introduces a real evidence source for it.
- **Continuity Engine (DROP/DEFER/REINTRODUCE).** New, `engine/continuity.ts`'s
  `resolveContinuity`: a prior day's unresolved (never accepted/declined/acknowledged)
  Recommendation resolves against **today's** current state, never yesterday's — enforcing
  NO_CATCH_UP mechanically, not just by convention. `NO_ACTION_REQUIRED` and any explicitly
  DECLINED/ACCEPTED/NO_ACTION_RECORDED prior recommendation always resolve DROP (nothing was
  pending, or the operator already decided). An undecided prior recommendation resolves DEFER
  when today's capacity is RED/YELLOW or an unresolved post-shift fact exists (something with
  real, current authority already wins), otherwise REINTRODUCE. **REINTRODUCE is advisory-only
  for this Drop** — composed into a SURFACE-tier `AdvisoryNote`
  (`composeAdvisoryNoteFromContinuity`) via `application/continuityQueries.ts`'s
  `resolvePriorDayContinuity`, never fed back into `evaluate.ts` and never written as a new
  obligation-shaped fact. DROP/DEFER are deliberately silent (no note) — BEYOND does not narrate
  every piece of history it chose not to carry forward.
- **Attention Authority (QUIET/SURFACE/INTERRUPT).** New,
  `domain/intelligence/types.ts`'s `AttentionLevel` — a narrower, code-level formalization of
  `OPERATOR_INTERFACE_DOCTRINE.md`'s four-state AVAILABLE/SUGGESTED/ATTENTION/CRITICAL prose,
  scoped to exactly one thing: how insistently an already-informational `AdvisoryNote` presents
  itself. Every pre-FOUNDATION-1B producer (obligation relevance, TRAIN progression, Decision
  Journal lessons) is QUIET. REINTRODUCE continuity notes and the pattern-proposal note (below)
  are SURFACE. The shift-protection note above is the one and only INTERRUPT-tier producer —
  "rare, reserved for meaningful conflicts or protection of important obligations" is enforced by
  `evaluateShiftProtection`'s own narrow gate, not by convention alone. Distinct from
  TodayScreen's own pre-existing "ATTENTION" budget (the 2-slot Commitments/Capture/
  pending-outcome surfacing mechanism), which is unchanged by this addition. An `AdvisoryNote` at
  any attention level remains only ever an `AdvisoryNote` — no priority, never accepted/declined/
  executed, never an Engine input; see `.claude/rules/engine.md`.
- **Recommendation lifecycle — materially-new-evidence gate and read-time disposition.** New,
  `engine/continuity.ts`'s `isMateriallyNewEvidence` compares two `Recommendation.trace`s (kind
  plus every input/derived key-value pair) structurally; `application/continuityQueries.ts`'s
  `wasRecommendationMateriallyRepeated` uses it to detect when the current recommendation is
  indistinguishable from an immediately-prior DECLINED one on the same day (Scenario E). This is
  presentation-only: `submitCheckIn` still issues a real, honest `Recommendation`/
  `RECOMMENDATION_ISSUED` fact every time (nothing about check-in evidence recording changes) —
  only the "same as before" framing (`RecommendationCard`'s one line of copy) differs. Separately,
  `deriveRecommendationDisposition` derives a read-time-only PENDING/COMPLETED/DISMISSED/
  SUPERSEDED/EXPIRED label for REVIEW's ledger (`getRecommendationDisposition`) from the exact
  same decision-reconstruction path REVIEW already used — no new stored field, no new event type.
- **Outcome feedback (BETTER/SAME/WORSE/SKIP).** Reconciled to the existing `Outcome.rating`
  mechanism (GOOD/NEUTRAL/BAD, "Recommendation Engine — outcome ratings stay observational"
  below) rather than a second, parallel rating vocabulary — TODAY's existing GOOD/NEUTRAL/BAD/
  DISMISS control (`TodayScreen.tsx`'s OUTCOME row) already is the lightweight, optional,
  non-mandatory feedback FOUNDATION-1B describes; "SKIP" already means "leave it unrated" (the
  existing DISMISS path). No code change; this is the same ALREADY_CANONICAL treatment
  FOUNDATION-1A gave several of its own pillars. The locked non-biasing rule below is unchanged
  and unreopened by this entry.
- **Pattern proposal (Scenario F).** New, `engine/patternProposal.ts`'s
  `detectRepeatedRatingPattern`: the most recent three rated Outcomes sharing both the same
  Recommendation kind and the same non-NEUTRAL rating compose into one SURFACE-tier
  `AdvisoryNote` naming the real count and rating in its own copy (never "usually"/"tends to" —
  NO_FAKE_PRECISION). Recomputed fresh on every read; nothing is itself stored, and nothing it
  returns can be accepted/declined/executed or silently changes any plan/threshold/doctrine —
  PATTERN → PROPOSAL → USER DECIDES stays literal. This is the one, deliberately narrow exception
  the FOUNDATION-1B brief itself authorizes to the "Explicitly out of scope: any AI/learning
  layer over workout data" entry further below — not a general reopening of that exclusion.

## PLANNED-WORK-001 — Explicit Planned Work

Locked 2026-09-20, direct owner ruling (following the `hasPlannedWork: false` hardcoding
FOUNDATION-1B discovered and explicitly deferred — see `docs/agent/drops/PLANNED-WORK-001.md`).
Two options were presented (rotation-implied vs. explicit operator intent); the owner chose
**explicit operator intent**, with GREEN capacity never itself implying planned work and
USER_DECIDES remaining authoritative.

- **`hasPlannedWork` is now genuinely wired** — `application/commands.ts`'s `submitCheckIn`
  passes `application/queries.ts`'s `hasActivePlannedWork(beyondDayId)` instead of a hardcoded
  `false`. `EXECUTE_PLANNED_WORK` is reachable through the real app for the first time.
  `evaluate.ts` itself is unchanged: same kind set, same ranking, same purity.
- **The one true source is `PLANNED_WORK_SET`** (`domain/common/types.ts`), written only by
  `application/commands.ts`'s `setPlannedWork(beyondDayId, planned, kind)` — an explicit,
  operator-initiated declaration, never inferred from capacity, schedule, or TRAIN's rotation
  state (`suggestTemplateForNextWorkout` always has a "next" template, so "a workout exists in
  rotation" is trivially true every day and was explicitly rejected as a signal).
- **A declaration resolves itself.** `hasActivePlannedWork` returns false again once a
  `WORKOUT_COMPLETED`/`WORKOUT_ABANDONED` event (any session type) happens after the
  declaration — a fulfilled or deliberately-stopped session both legitimately resolve it,
  matching REDUCE_BEFORE_SKIP/BEYOND_MAY_DO_LESS. Re-declaring afterward is a legitimate new
  fact, not a duplicate.
- **`kind: "WORKOUT"` is a real union, not a bare boolean**, specifically so a later Drop can
  add a second planned-activity source without changing this event's shape or
  `hasActivePlannedWork`'s already-generic read logic (it checks "any active declaration," not
  a TRAIN-specific one). No second `kind` value exists yet — this Drop's own exclusions rule
  that out for now.
- **TODAY's `PlannedWorkCard`** offers an explicit TRAIN TODAY / NOT TODAY toggle (same chip
  pattern as `WorkContextCard`'s YES/NO), with a real tri-state read
  (`getPlannedWorkDeclaration`) so "never answered" never reads as a silent "no" —
  NO_FAKE_PRECISION. Labels are deliberately distinct from `WorkContextCard`'s "YES"/"NO" (both
  cards can render together; identical labels for two different yes/no questions would be
  genuinely ambiguous, not just a test-collision concern).

## Day model

- **Lazy day creation.** No day exists until the first action of the day
  needs one; `ensureActiveDay()` creates it on demand rather than
  requiring an explicit "start my day" ritual. [queries.ts](../src/application/queries.ts)
- **One ACTIVE `BeyondDay` at a time**, enforced by `ensureActiveDay()`'s
  in-flight-promise guard (Product Experience Sprint, Phase 0) — see
  README "Known limitations" for the one narrower case (true
  cross-tab concurrency) this doesn't cover.
- **Sleep/Day-Ownership Model** (locked): sleep logs carry a `kind` field,
  `PRIMARY` or `SUPPLEMENTAL`. Only a `PRIMARY` sleep log can trigger the
  "did your day end?" suggestion (`shouldSuggestEndDay`); naps and other
  supplemental sleep never do. This is what lets someone log a nap at
  3pm without BEYOND thinking their day just ended.
- **Overnight shifts** are handled by this same PRIMARY/SUPPLEMENTAL
  split — a shift worker's "night's sleep" after an overnight shift is
  still PRIMARY regardless of calendar clock time, so END DAY suggestion
  logic tracks lived days, not calendar days.
- **DAY-ROLLOVER-001 (2026-09-21): automatic 16:30 boundary — a recorded
  override, not a reversal, of the "no automatic clock boundary"
  reasoning above.** Direct owner mission this session ("MISSION: DAY
  ROLLOVER AT 16:30"): the BeyondDay boundary is now also 16:30 local
  time, automatic — at 16:30, the current day auto-closes through the
  same `endDay()` path as an explicit END DAY (reason
  `AUTO_CLOSED_DAY_ROLLOVER`), and a fresh day starts (water/protein
  reset; bodyweight already carries forward via
  `getMostRecentBodyweight()`'s existing global scope). This is a
  genuine conflict with the "Calendar midnight is explicitly rejected as
  a boundary" reasoning immediately above — 16:30 is the same category
  of thing (an automatic fixed-clock trigger), not merely a different
  hour. The conflict was surfaced to the owner directly before any
  implementation; the owner's ruling was to override it for this
  specific case and record the override here, not to reopen calendar
  midnight or any other automatic boundary generally. `PRIMARY`/
  `SUPPLEMENTAL` sleep-kind rules are unchanged; the "lived days, not
  calendar days" concern this override reintroduces (a PRIMARY sleep
  landing on a rollover-created day instead of the day it was meant to
  close) is never silently resolved — it is flagged via a SURFACE-tier
  `AdvisoryNote` (`dayRolloverAmbiguity`,
  `engine/dayRollover.ts`/`engine/advisory.ts`) and left to the operator.
  An in-progress workout is never interrupted — rollover happens once it
  ends. See `docs/agent/drops/DAY-ROLLOVER-001.md` for the full
  contract.

## RED / capacity override

- Declining a RED-tier recommendation requires an explicit confirmation
  step: the first decline attempt returns `RED_OVERRIDE_NOT_CONFIRMED`;
  only a second attempt with `{ overrideConfirmed: true }` succeeds. This
  is a deliberate extra-friction gate on overriding the most constrained
  state, not a bug. [redOverride.ts](../src/engine/redOverride.ts)
- YELLOW-tier declines require no such confirmation.

## RESET / SHIFT DOWN

- Both are guided, multi-step experiences (not a single button/toggle) —
  see [resetShiftDownCopy.ts](../src/ui/screens/today/resetShiftDownCopy.ts).
  An interrupted RESET or SHIFT DOWN is expected to be resumable, not
  something the user has to restart from scratch.

## TRAIN

- **Progression advice is advisory only.** The engine (`evaluateProgression`
  in [progression.ts](../src/engine/progression.ts)) always produces a
  suggestion (INCREASE / HOLD / REDUCE) with a plain-language reason —
  it never auto-applies a weight change. The lifter always chooses.
- HOLD has three distinct sub-paths in the engine (clean hold, incomplete
  evidence, mixed weights in recent history) and only the clean-hold path
  sets a numeric `lastWeight`. UI copy must fall back to the engine's own
  `reason` text for the other two — see `describeProgressionAdvisory` in
  [trainCopy.ts](../src/ui/screens/train/trainCopy.ts) and the bug this
  fixed (rendered "undefined" until caught in live browser testing,
  2026-08-20).
- Every exercise card shows last weight/reps prominently and never shows
  a bare "0" as a placeholder for "no data yet" — no-history is its own
  explicit copy state.
- **Locked A/B/C rotation advancement**, enforced by
  `doesSessionAdvanceRotation`: STANDARD sessions advance the rotation
  only on COMPLETED; REDUCED sessions advance on COMPLETED or PARTIAL;
  RECOVERY sessions never advance the rotation, regardless of outcome.
- Stopping a workout mid-session uses neutral wording (not "quit" /
  "fail") and a PARTIAL completion explicitly explains its rotation
  impact inline, since that's the one place a lifter's choice changes
  what happens next time they open TRAIN.
- Exercise substitution is a fast, low-friction quick-pick sourced from
  the lifter's own most recent substitutions for that exercise
  (`getRecentSubstitutions`), not a full exercise-database search.
- If no check-in exists yet for the day, TRAIN surfaces a one-tap prompt
  to do one rather than blocking or silently proceeding without one.
- A workout session in progress must survive a page reload — resuming
  is a confirmed, tested behavior, not a "best effort."

## BODY

- **Correction, not just logging.** Water, sleep, protein, and
  bodyweight all support in-place correction of a past entry via the
  same correction-chain pattern: the original event stays untouched, a
  `*_CORRECTED` event supersedes it, and every query resolves the
  HEAD-of-chain (most recent correction) as the effective value. Nothing
  is ever mutated or deleted in place — this preserves full history
  while still always showing the corrected number.
- Every correction gets an on-screen confirmation and an immediate,
  one-tap undo — a correction should never feel risky to make.
- Sleep and water are shown in human-readable form (e.g. "7h 15m", not
  raw minutes; a quick-add control for common water amounts), not raw
  numeric fields.
- **No "exposed machinery" reveal (locked 2026-09-16, direct owner ruling, DEPTH-001 scope
  question).** BODY renders neither `.command-surface` nor any WHY/diagnostic disclosure —
  by design, it has four peer trackers and no single dominant decision to expose. Asked
  directly whether DEPTH-001's PCB-trace reveal (see "Visual system — red budget" below, whose
  final bullet records DEPTH-001 itself) should extend to BODY; answer was to skip it entirely
  rather than invent a correction-history
  or per-tracker variant. Matches this section's own "four peers, no leader" doctrine. Not a
  temporary placeholder — a future BODY reveal would need its own fresh ask, not an inferred
  extension of this scope.

## Recommendation Engine — outcome ratings stay observational

Locked 2026-09-16, direct owner ruling, asked directly alongside DEPTH-001's BODY question
above (same session, same "no invented scope" discipline as "Intent & Commitment — Obligations
enter Engine recommendation arbitration" further below).

- **Rated Outcome history (GOOD/NEUTRAL/BAD, `rateOutcome` in
  [commands.ts](../src/application/commands.ts)) never biases or tie-breaks which recommendation
  `evaluate.ts` selects.** Asked explicitly: should a pattern of ratings ever influence future
  Engine behavior, even just as a tie-break? Answer: no — it stays exactly as observational as
  it already was. This confirms, rather than changes, the doctrine already stated at
  `rateOutcome`'s own call sites ("rules provide consistency, outcomes provide correction," not
  silent rule adjustment) and the pre-existing "Explicitly out of scope" entry below ("Any AI /
  learning layer over workout data") — now extended explicitly to the Engine's primary
  recommendation selection generally, not just workout data.
- A future session should not re-raise this as an open question without new information — it
  was asked and answered directly, not merely undecided.

## NUTRITION (Meal Memory — NUTRITION-001, locked)

- **SavedMeal is a preset, not history.** A SavedMeal (name + calories/
  protein/carbs/fat) is a small, directly-mutable reusable record — same
  treatment as CaptureItem/SchedulePattern, not itself event-sourced.
  Editing or archiving it changes the preset going forward only.
- **Logging snapshots.** Logging a SavedMeal writes an immutable
  `MEAL_LOGGED` event carrying a copy of its macros AT THAT MOMENT.
  Meal history is DomainEvent truth with the same hydration-style
  correction chain (`MEAL_LOG_CORRECTED` supersedes without erasing the
  original) as water/sleep/protein/bodyweight. A later SavedMeal edit or
  archive can never rewrite a past log — the log doesn't re-read the
  preset, it already has its own values.
- **Effective meal protein counts toward Minimum Day**, summed alongside
  protein-only BODY logs (one combined total, not two competing ones) —
  see `application/queries.ts`'s `getMinimumDayStatus`.
- No food provider, barcode, recipe, serving ontology, calorie/macro
  goal, or nutrition scoring — a SavedMeal is "the sandwich I always
  make," not a food database entry. **Partially reversed 2026-09-15,
  direct owner ruling — see "NUTRITION TARGETS" below**: a calorie
  target and a bodyweight-derived protein target now exist. The rest of
  this bullet still holds — no food provider/barcode/recipe/serving
  ontology, and no nutrition *scoring* (a single pass/fail or point
  value judging a day) — only two plain numeric targets with honest
  progress-toward-target display.

## NUTRITION TARGETS (Calorie + Protein Targets — NUTRITION-003, locked)

Direct owner ruling, 2026-09-15 (in chat): reverses NUTRITION-001's "no calorie/macro goal"
restriction specifically for calories and protein, in order to support eating at a deficit while
hitting a protein floor.

- **Calorie target is set directly by the operator — no formula.** No BMR/TDEE estimate
  (Mifflin-St Jeor or otherwise) and no adaptive/trend-derived calorie estimate (a Hacker's
  Diet/MacroFactor-style weight-trend-correlated TDEE was considered and deliberately deferred
  as a possible future direction, not built here). `NutritionTargets.calorieTargetKcal` is an
  optional plain number; omitted means "no target set," not zero.
- **Protein target is derived, not set directly.** `getEffectiveProteinTargetG()`
  (`application/nutritionTargetQueries.ts`) = `proteinMultiplierGPerLb` × the most recently
  logged bodyweight (`getMostRecentBodyweight()`, cross-day — unlike the day-scoped
  `getLatestBodyweight` HYDRATION/SLEEP/etc. use). Default multiplier is 1.0 g/lb; the operator
  can adjust it. This is the standard cutting-lifter heuristic (RP, Cronometer, most coaches: 0.8
  – 1.0 g/lb), not a BEYOND-invented number.
- **Never a guessed number.** With no bodyweight ever logged, `getEffectiveProteinTargetG()`
  returns `undefined` — the UI shows "log a bodyweight to see your target," never a fabricated
  default bodyweight or a target computed from zero.
- **`NutritionTargets` is a single mutable settings row** (`id: "current"`), same treatment as
  `SchedulePattern` — not event-sourced, since "what target the operator is currently aiming for"
  isn't itself a historical fact the way a logged meal or bodyweight is.
- **Still no nutrition scoring.** Progress is shown as a plain "logged / target" readout
  (`describeCalorieProgress`/`describeProteinProgress` in `ui/screens/body/nutritionCopy.ts`) —
  remaining or over-by-X, never a score, grade, streak, or judgment.

## WORKOUT LIBRARY (Personal Exercise Library — TRAIN-CREATE-001, locked)

Direct owner ruling, 2026-09-12 (in chat): general authorization to build toward workout
"guider and creator" capability, starting with this foundation Drop.

- **CustomExercise is a preset, not history.** Same treatment as SavedMeal: a small,
  directly-mutable record (name/muscle group/equipment/rep range/notes) that changes in place
  when edited, and `archivedAt` hides it from the active list without deleting it. No event
  trail for "what exercises exist" — this Drop introduces no new historical fact type.
- **A bundled reference list is inert, hand-authored data, never a bulk-imported third-party
  database.** `EXERCISE_LIBRARY` (`src/domain/workout/exerciseLibrary.ts`) is informed by the
  shape of open, permissively-licensed datasets (free-exercise-db, Unlicense; wger, exercise data
  CC-licensed separately from its AGPL code) but every entry is a hand-authored generic exercise
  fact — never a verbatim copy of a specific dataset's file or content.
- **Does not touch the fixed A/B/C `WORKOUT_TEMPLATES` system or Engine progression.** The
  domain-layer comment "No broad exercise database" on `WorkoutTemplateId`
  (`src/domain/workout/types.ts`) constrains *that* fixed template system specifically — why its
  own exercise IDs stay a small closed set for progression-history continuity. It is not a
  blanket rule against a personal exercise library existing elsewhere in the app. This entry
  makes that boundary explicit rather than leaving the two facts to read as a silent
  contradiction.
- **Not yet consumed by TRAIN.** `CustomExercise` is a standalone personal list only — not wired
  into TRAIN's substitution field, set logging, or any execution surface, and there is no way yet
  to assemble saved exercises into a new selectable workout template. Both are explicit exclusions
  of this Drop, left to a distinct, larger future Drop that this one is designed to feed.

## HISTORY

- Read-only, complete: every `BeyondDay` and every event that occurred
  on it, in chronological order within the day, most-recent-day-first.
  No filtering or summarization — HISTORY is the audit trail.
- Each day is collapsed by default (status/date/event count only); the
  event-by-event detail is opt-in per day via SHOW/HIDE, so the screen
  stays scannable as history grows.

## Intent & Commitment — Mission archival and Obligation current-attention eligibility

Locked 2026-08-23 (Intent Lifecycle Integrity — Audit + Correction Drop), owner decision, following
real-device evidence: archived Missions' still-unresolved Obligations were surfacing as live/overdue
in TODAY's COMMITMENT card and in Intelligence Spine AdvisoryNotes.

- **Option B, approved.** Archiving a Mission (`archiveMission`) stays non-destructive and does not
  automatically SATISFY or RELEASE its linked Obligations — their `status` is never touched. They
  remain historically unresolved and remain visible/manageable in the Intent/Obligations management
  surface (`getUnresolvedObligations`, `IntentScreen`'s UNRESOLVED view, unchanged).
- However, an OPEN or WAITING Obligation whose linked Mission is `ARCHIVED` is **not currently
  attention-eligible**: it must not participate in TODAY commitment/attention, AdvisoryNotes, or any
  future current-intelligence consumer while its parent Mission stays archived. A standalone
  Obligation (no `missionId`) is never affected by any Mission's lifecycle. An Obligation whose
  `missionId` cannot be resolved to a live Mission (an unresolved/invalid reference) is treated the
  same as archived — conservatively excluded, never a confident current-attention signal merely
  because its own `status` is `OPEN`.
- This is a pure read-time projection (`engine/obligationEligibility.ts`'s
  `isObligationCurrentlyEligible`/`filterCurrentlyEligibleObligations`, consumed via
  `application/intentQueries.ts`'s `getCurrentlyEligibleUnresolvedObligations`) — no schema change,
  no mutation, no migration of existing records. `getUnresolvedObligations` itself is unchanged and
  keeps its literal OPEN/WAITING meaning for management purposes.
- Write-side companion invariant: `createObligation` and `modifyObligation` reject creating or newly
  linking an Obligation to an already-`ARCHIVED` Mission (`MISSION_ARCHIVED` error). Existing
  historical links predating this rule are untouched and remain valid/readable — the check only runs
  when a caller supplies a new `missionId`.
- Deferred, not implemented now: an explicit disposition flow at archive time (retain / move / satisfy
  / release each unresolved child) — a future UX enhancement if real use proves it valuable, not
  required by this Drop.

## Intent & Commitment — TODAY headline completion

Locked 2026-08-23 (TODAY Headline Commitment Completion), owner decision. This supersedes Drop 02's
presentation ruling that the expanded TODAY commitment is entirely read-only, but only for one
canonical operation:

- The collapsed headline commitment is unchanged. Its expanded detail offers `SATISFY COMMITMENT`,
  which uses the exact displayed Obligation's ID and the existing `satisfyObligation` command.
- Satisfaction means the Obligation was fulfilled and remains distinct from `RELEASE`. TODAY does
  not expose release, waiting, editing, re-linking, or reopening.
- Because satisfaction currently has no reopen operation, mutation requires an explicit inline
  confirmation. Cancellation never mutates.
- Successful satisfaction refreshes the existing eligible-obligation query and lets the existing
  deterministic relevance ordering select any next headline. It does not promote an Obligation
  manually or change Recommendation/DecisionTrace or Attention policy.
- Archived-Mission and invalid-parent Obligations remain excluded by the current-attention
  eligibility rule above; this completion action does not weaken Mission lifecycle semantics.

## Intent & Commitment — Recurring Obligations (INTENT-002)

**Reversed 2026-09-15, direct owner ruling.** Drop 01 (2026-08-22) had explicitly locked "do
not implement a custom recurrence engine," "do not introduce RRULE/rrule.js" — `RecurrenceRule`
existed only as a dormant, unused placeholder shape. Separately, `docs/agent/CAPABILITY_MAP.md`
had pre-approved rrule.js as the standard for exactly this, once recurrence was ever actually
wanted. The genuine conflict between the two was surfaced to the owner directly rather than
silently resolved either way (per CLAUDE.md's authority-order doctrine); the owner chose
rrule.js. Drop 01's original restriction is kept in `src/domain/intent/types.ts`'s own doc
comment for history, not deleted.

- **Recurrence is created and edited from the Obligation form** in `IntentScreen.tsx`: Does
  not repeat / Daily / Weekly (with weekday selection) / Monthly, plus an interval ("every N").
  Stored as a full RFC 5545 `DTSTART:...\nRRULE:...` string, always produced by
  `engine/recurrence.ts`'s `buildRecurrenceRule` — never hand-formatted, never accepted as
  free-form text from the operator.
- **Satisfying a recurring Obligation materializes its next occurrence as a new Obligation** —
  same title/description/mission/recurrence, due on the next computed date. The satisfied
  instance is never reopened (Drop 01's "no reopen action" is unchanged); this also applies
  automatically to TODAY's own `SATISFY COMMITMENT` action above, since both paths call the
  same `satisfyObligation` command — no separate wiring was needed or added there.
- **Releasing a recurring Obligation does not continue the schedule.** "No longer required" is
  read as stopping the standing commitment, not skipping one instance — only `satisfyObligation`
  continues it.
- **Still no calendar/agenda view of upcoming occurrences**, and no RFC 5545 features beyond
  DAILY/WEEKLY(+BYDAY)/MONTHLY are exposed in the picker — this Drop is the create/edit/execute
  mechanism only.

## Intent & Commitment — Obligations enter Engine recommendation arbitration (INTENT-ARBITRATION-001)

Locked 2026-09-15, direct owner ruling via two explicit questions (rank, then eligible tiers) —
Obligations previously had zero influence on `evaluate.ts`'s own recommendation, only on
TODAY's separate ATTENTION budget.

- **New `OBLIGATION_DUE` recommendation kind, ranked bottom-of-stack** — above only
  `NO_ACTION_REQUIRED`, below STABILIZE/POST_SHIFT_TRANSITION/RECOVER/EXECUTE_PLANNED_WORK. The
  owner explicitly rejected the alternative of ranking it between POST_SHIFT_TRANSITION and
  RECOVER.
- **Eligible only for `OVERDUE`/`DUE_TODAY` obligations** — `DUE_SOON`/`PLANNED_TODAY` remain
  advisory-only via the pre-existing TODAY ATTENTION budget, unchanged.
- **Engine purity preserved.** `evaluate.ts` itself imports nothing from
  `engine/obligationRelevance.ts` — `application/commands.ts` computes one boolean
  (`hasEligibleObligationDueOrOverdue`) via `hasObligationRequiringArbitration` and passes only
  that into `evaluate()`, the same pattern as `hasPlannedWork`/`hasUnresolvedPostShift`.
- Known, accepted overlap: an `OVERDUE`/`DUE_TODAY` obligation can show both as the dominant
  `OBLIGATION_DUE` recommendation and as a separate `COMMITMENT_DUE` attention chip — same
  treatment `POST_SHIFT_TRANSITION` already has with its own underlying fact, not a new
  inconsistency.

## Backup / restore / archival

- **Replace-only restore, preview-before-write, always.** Nothing is
  ever written until the user has seen a preview (row counts, dates,
  format) and explicitly confirmed. No merge-with-existing-data path
  exists or is planned.
- Two backup formats are supported for **reading**, but only one is ever
  **written** going forward — see
  [README.md — Versions & lineage](../README.md#versions--lineage) for
  why a second, historical format exists at all.
- **Backup reminder is a passive in-app banner** (days-since-last-export,
  surfaced at 7+ days), never a push notification — BEYOND has no
  backend, and a push notification would require one, contradicting the
  local-first doctrine.
- **Archival is via the OS share sheet**, handed the same export file
  Gavin already has — not an in-app Google Drive integration. In-app
  Drive/OAuth was explicitly considered and **rejected**: archived data
  stays fully on-device until the user themselves chooses where to send
  the share-sheet output.

## Accessibility

- **16px is the app-wide minimum font size**, full stop — no card
  metadata, label, eyebrow, or button text may render smaller. This
  doubles as the iOS Safari input-focus auto-zoom threshold (text under
  16px in a focused input causes Safari to zoom the viewport), so it's
  both a legibility and an anti-jank decision. Audited via live
  `getComputedStyle` sweep, not just source inspection, since Vitest
  alone can't verify rendered pixel sizes. 2026-08-20.

## Visual system — red budget

- **Primary CTA color, reversed (locked 2026-09-03, direct owner ruling, LAUNCH-VISION-001).**
  VISUAL-001 (Hybrid Foundation) had made `.btn-primary`'s default fill neutral (near-white on
  near-black) specifically so red stayed reserved for recommendation/active/earned/warning/
  critical/selection — never merely "the main button." That rule is now overturned:
  `.btn-primary`'s default fill is red again (`--action-primary-bg: var(--accent)`,
  `--action-primary-text: var(--text-1)` in [tokens.css](../src/ui/styles/tokens.css)), following
  a direct owner decision made while comparing the BEYOND Launch Vision prototype's "Terry's
  Suit" direction (`prototype/launch-vision/`) against the running app.
- **Scoped narrowly — not a general loosening of red-scarcity doctrine.** This changes
  `.btn-primary`'s fill only. `.btn-danger`'s distinct `--danger` fill, `.command-surface`'s red
  edge/chamfer treatment, `.capacity-dot--red`, and every other existing red usage are unchanged.
  `OPERATOR_INTERFACE_DOCTRINE.md`'s "red authority must be earned; significance earns intensity"
  still governs every red usage this decision doesn't touch — red is simply no longer scarce
  specifically at the primary-action layer, where it is now the default rather than an exception.
- **BODY carve-out (locked 2026-09-03, direct owner ruling, LAUNCH-VISION-002).** Running the
  real app surfaced a genuine second-order consequence the reversal above didn't anticipate: BODY
  renders one primary log action per tracker (WATER/SLEEP/BODYWEIGHT/PROTEIN, plus meal logging)
  on a single long-scrolling screen, so an app-wide red `.btn-primary` showed up several times at
  once there — unlike TODAY/TRAIN, which only ever surface one dominant action at a time. Rather
  than invent a new "pick one tracker to stay red" rule — which would manufacture a hierarchy
  among the four peer trackers that BODY's own STATUS instrument-cluster doctrine (below, and
  [global.css](../src/ui/styles/global.css)'s own `.instrument-cluster` comment: "BODY's red
  budget is deliberately lower than TODAY/TRAIN's — no red accent at all") already forbids — BODY's
  `.btn-primary` reverts to the neutral fill (`.body-field .btn-primary` in global.css, reusing
  `--text-1`/`--bg`), consistent with that same pre-existing, lower-red-budget identity. TODAY,
  TRAIN, and MORE are unaffected and keep the red default above. The quiet/successful "No action
  needed" state on TODAY was considered for a similar carve-out and explicitly rejected by direct
  owner ruling — it stays red, no per-state exception beyond the BODY-wide one here.
- The broader "Terry's Suit" direction this reversal is drawn from (chamfered/angular surface
  geometry beyond the existing single-surface `--chamfer` primitive, ambient motion, an
  abstract glyph family) remains prototype-only pending its own separate, explicitly
  authorized Drop(s). Typography is no longer in that deferred set — see "Visual system —
  typography" below (TYPOGRAPHY-001). One narrow slice of motion is also now authorized — see
  "Visual system — motion" below (MOTION-001) — but that Drop only reshaped the timing curve
  of transitions/animations that already existed; it did not add, and does not authorize, any
  new ambient/decorative motion. "Ambient motion" as a category stays deferred.
  **Partially reversed 2026-09-15, direct owner ruling, LAUNCH-VISION-003** — four specific,
  named elements are now authorized (below); everything else in this deferred set (an abstract
  glyph family, and any chamfer/motion/bloom beyond the four named elements) stays
  prototype-only.
- **Four elements authorized (locked 2026-09-15, direct owner ruling, LAUNCH-VISION-003).**
  Chamfered plating extends beyond `.command-surface` alone to two more filled, bordered
  surfaces where the production DOM genuinely supports it without changing an established
  identity: `.instrument-cluster` and `.card--warning` (the RED-tier override confirm panel —
  the real analog of the prototype's `.confirm-panel`). A third prototype-listed target,
  `.equipment-row`, was deliberately excluded — it has no background/border by design (a
  different silhouette entirely, not a card with styling removed — see its own doc comment in
  [global.css](../src/ui/styles/global.css)), so a corner cut there would be invisible at best
  and would clip real content at worst; adding a background/padding to make it visible would
  itself be new geometry beyond the four authorized elements, not truthful adaptation of them.
  An ambient red bloom now surrounds `.command-surface` (the one dominant/earned surface, not
  an app-shell-wide glow — the prototype's "device frame" has no real production equivalent);
  since BODY never renders `.command-surface`, its lower red budget holds without a separate
  carve-out. TODAY's START DAY fires a one-time power-on sweep (`.today-field--boot`), never
  replayed within the same day. `ConfirmBanner.tsx`'s shared root (BODY's water/sleep/
  bodyweight/protein/meal confirmations, TODAY's capture-undo and check-in confirmations) gets
  a one-time confirmation pulse on mount; TRAIN's own pre-existing per-set flash (`.set-earned`,
  VISUAL-001) already serves the identical purpose for set logging and is left untouched rather
  than duplicated. All four are pure presentation — no command/query/engine/domain change.
- **"Exposed Machinery" reveal (locked 2026-09-16, direct owner ruling over four rendered
  mockup passes, DEPTH-001).** A narrow, explicit authorization beyond this section's own
  "ambient motion stays deferred" framing above — obtained through its own independent review
  process the next day, not an automatic extension of LAUNCH-VISION-003's four named elements.
  Opening any of TODAY's "How BEYOND decided," TRAIN's "Why this suggestion"/"Exercise detail,"
  or MORE's "Diagnostic detail" now also shows a full-viewport, purely decorative, `aria-hidden`
  PCB-style circuit-trace network (flat, unglowing red, matched directly to real circuit-board
  photography — an SVG blur/glow filter was tried and explicitly rejected) behind the still-
  legible disclosed content. Reached over four passes: thin hairline traces confined to the
  panel (rejected as "not dramatic enough"); full-screen solid shattered plates matching a
  Batman Beyond character render (rejected — wrong reference entirely, real PCB photos supplied
  instead); a glowing converging trace network (right direction, but faded toward the edges);
  finally flat, uniformly-bright, unglowing traces matched to the supplied photograph —
  "Perfect. Ship it man." See `docs/agent/drops/DEPTH-001.md` for the full history.
  `prefers-reduced-motion: reduce` fully suppresses it (never mounts, not just hidden). Does not
  extend to BODY (see "BODY" above) and deliberately does not include a whole-screen shake that
  an earlier reviewed pass had — kept only the reveal itself and a contained brightness-pulse
  flash, consistent with this app's own existing "motion explains a state change, never
  decorates" doctrine (see "Visual system — motion" below, MOTION-001).

## Visual system — typography

- **Display font, swapped (locked 2026-09-10, direct owner ruling, TYPOGRAPHY-001).**
  `--font-display` (headlines: `.title`, `.command-title`, `.recommendation-title`, and every
  other consumer of the token in [global.css](../src/ui/styles/global.css)) changes from Space
  Grotesk to Big Shoulders Display, matching the BEYOND Launch Vision prototype's "Terry's Suit"
  direction. Same self-hosted-via-`@fontsource` pattern and the same weights (600/700) as before
  — see [fonts.ts](../src/ui/styles/fonts.ts) — only the family named changed.
- **Scoped narrowly.** `--font-body` (IBM Plex Sans) and `--font-mono` (IBM Plex Mono) are
  unchanged. Font sizes, per-element weights, and letter-spacing are unchanged — this is a
  typeface swap, not a type-scale redesign.

## Visual system — motion

- **Easing curve, swapped (locked 2026-09-10, direct owner ruling, MOTION-001).**
  `--motion-easing` changes from the generic `ease-out` to `cubic-bezier(.2, .8, .2, 1)`,
  matching the BEYOND Launch Vision prototype's "Terry's Suit" direction. All 11 existing
  `var(--motion-easing)` consumers in [global.css](../src/ui/styles/global.css) inherit the new
  curve automatically — no per-component change.
- **Scoped narrowly.** `--motion-fast` (150ms) and `--motion-base` (220ms) are unchanged — both
  already sit inside the Product Experience Sprint P2's documented 100-250ms target range and
  are already close to the prototype's own numbers. Only the curve shape changed, not the
  durations, and no new animation/transition was added.

## System identity — EMBLEM vs. GLYPHS split

Locked 2026-08-31 (SHELL-001, direct owner ruling), correcting SHELL-001's original contract
framing, which had claimed the universal/core diamond motif was itself "BEYOND's one stable
system-identity glyph."

- **The universal/core diamond is retired as BEYOND system identity.** It is not, and is not
  meant to become, the machine's own signature mark.
- **EMBLEM = THE MACHINE.** A single dedicated machine-identity mark is BEYOND's system
  identity, distinct from GLYPHS below.
- **The emblem exists, silhouette and color replaced once already (locked 2026-09-13/14, direct
  owner ruling, EMBLEM-002 — supersedes EMBLEM-001's geometry/color, not the EMBLEM/GLYPHS split
  itself).** A bat-form primary mark, `#EA131C` on `#000000` — silhouette, proportions, and color
  are owner design authority. EMBLEM-001's original mark (`#D6202B`) didn't read well at real
  device size and was replaced after the owner viewed it live on a phone home screen; the
  replacement was traced from an owner-supplied reference image (no vector source existed) and
  independently verified maskable-safe before shipping. Source SVGs (master/foreground/folded/
  micro) live in `docs/brand/beyond-mark/`, per that directory's own README: update the master
  geometry there first, then regenerate derivatives — never redraw from concept imagery. Wired in
  as the app icon / home-screen mark (`public/icons/icon-*.png`, `index.html`'s favicon and
  `apple-touch-icon` links) only; it is not used anywhere inside the running app's own UI.
- **Emblem color is independent of the in-app UI's red.** `#EA131C` is the emblem's own locked
  brand color — it does not change, and was not derived from, `--accent`/`--red-b` in
  [tokens.css](../src/ui/styles/tokens.css). Unifying the two is a separate, larger decision
  nobody has made; don't infer it from this entry.
- **Maskable-safe as of EMBLEM-002.** Unlike EMBLEM-001's geometry (wingtips ~20% past the safe
  radius), EMBLEM-002's silhouette was sized to fit the standard maskable safe zone from the
  start (farthest vertex ~395.5 of a safe 409.6, in the 0–1024 viewBox, with margin). The
  manifest's icon entries now declare `purpose: "any maskable"` accordingly. See
  `docs/brand/beyond-mark/README.txt`'s EMBLEM-002 note for the numbers.
- **GLYPHS = THE INSTRUMENTS.** TODAY/TRAIN/BODY/MORE's existing locked pilot icon family
  ([Icon.tsx](../src/ui/icons/Icon.tsx)) remains the existing locked destination/instrument
  glyph set — unchanged geometry, unrelated to machine identity.

## Explicitly out of scope (do not build without direct sign-off)

- BATCAVE
- Trend charts
- Any AI / learning layer over workout data

These need Gavin's direct input and, for the learning layer, real
workout data volume that doesn't exist yet. A future session should not
infer scope for these from adjacent code.
