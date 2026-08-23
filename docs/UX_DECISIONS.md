# BEYOND — UX Decision Register

Concise, durable record of product/UX behavior that has been explicitly
decided and locked in this codebase's chat-built rebuild lineage (see
[README.md](../README.md#versions--lineage) for the lineage explanation).
Written for future sessions (human or Claude) so a decision doesn't need
to be re-derived from git archaeology or re-litigated by accident.

Each entry is the *decision*, not the implementation — see the linked
file for the current code. If code and this register ever disagree, the
code's own comments/tests are more likely to be current; treat that as a
signal this register needs updating, not that the code is wrong.

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

## Explicitly out of scope (do not build without direct sign-off)

- BATCAVE
- Trend charts
- Any AI / learning layer over workout data

These need Gavin's direct input and, for the learning layer, real
workout data volume that doesn't exist yet. A future session should not
infer scope for these from adjacent code.
