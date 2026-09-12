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
  make," not a food database entry.

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
- **The emblem now exists (locked 2026-09-11, direct owner ruling, EMBLEM-001).** A bat-form
  primary mark, `#D6202B` on `#000000` — silhouette, proportions, and color are owner design
  authority, supplied as final production artwork, not to be redesigned/reinterpreted/
  substituted by any Drop. Source SVGs (master/foreground/folded/micro) live in
  `docs/brand/beyond-mark/`, per that directory's own README: update the master geometry there
  first, then regenerate derivatives — never redraw from concept imagery. EMBLEM-001 wired it in
  as the app icon / home-screen mark (`public/icons/icon-*.png`, `index.html`'s favicon and
  `apple-touch-icon` links) only; it is not used anywhere inside the running app's own UI.
- **Emblem color is independent of the in-app UI's red.** `#D6202B` is the emblem's own locked
  brand color — it does not change, and was not derived from, `--accent`/`--red-b` in
  [tokens.css](../src/ui/styles/tokens.css). Unifying the two is a separate, larger decision
  nobody has made; don't infer it from this entry.
- **Not maskable-safe as delivered.** The master/foreground geometry's wingtips sit ~20% past
  the standard maskable safe zone (radius ~495 of a safe 409.6, in the 0–1024 viewBox) — a
  circular/squircle OS mask would clip them. BEYOND's manifest deliberately leaves icon
  `purpose` unset (`"any"`, the spec default) rather than mis-declare this art `"maskable"`. See
  `docs/brand/beyond-mark/README.txt`'s integration note for the numbers.
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
