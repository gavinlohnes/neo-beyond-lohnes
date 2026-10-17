# Current checkpoint

## Current objective — RESTORE-COMPAT, REVIEW-001 Phase 1a prerequisite (2026-10-17, PROTECTED)

Gavin asked to keep moving after REVIEW-001's plan (#231) and its photo-backup ruling (#235,
option (a): photos in the normal backup) merged. Builder: Claude Code. Starting master `ca67da6`;
branch `ccr-f27681c1-sb8gif`; PR linked from the branch.

Found while starting Phase 1a's storage slice, and fixed first on its own: restoring any native
backup exported from an older schema failed with "Database version differs" (dexie-export-import
refuses any version but the live one). That affects every native backup made before schema v12.
Phase 1a's own acceptance needs older backups to restore after its schema bump.

The fix is in `persistence/backup.ts`:
- An older backup restores, still replace-only. Tables it predates are cleared, and missing
  settings rows read as their defaults.
- A newer backup is refused at preview with a plain message, before anything is cleared.

No schema, event, Engine, fixture, dependency or CI change; the legacy `BEYOND_BACKUP` path is
untouched. Next action: an independent exact-head review, then Gavin's merge decision. After that
comes REVIEW-001 Phase 1a slice 1: measurement events, a progress-photo table at v13, and backup
round trips with photos.

## Previous objective — ULTIMATE-FOUNDATION-002 review follow-up (2026-10-17, ROUTINE, merged in #234)

The four nonblocking findings from #233's review were fixed in #234, merged at `5e0f86d` on
Gavin's instruction. REVIEW-001's plan merged in #231 (`69f9538`), and its Decision 2 ruling
(photos in the normal backup) merged in #235 (`ca67da6`).

## Previous objective — ULTIMATE-FOUNDATION-002 Training Record (2026-10-17, PROTECTED, merged in #233)

Gavin approved the Training Record slice ("approve, Protected, Claude Code, defer pause",
2026-10-17). Builder: Claude Code. Brief: [`ULTIMATE-FOUNDATION-002.md`](ULTIMATE-FOUNDATION-002.md).
It adds TRAIN → HISTORY, a session record and lift history during a workout, all read only, plus
one shared volume rule. Pause/resume is deferred.

PR #233 merged at `48e7b54` on Gavin's instruction. Merged head
`be49052149978b38fed9ac1a35b6c00e00750129` had green required PR Verification and an independent
Claude Code exact-head PASS review on PR #233. Four nonblocking findings from that review are
handled by the follow-up above. No deploy.

Open work alongside it:
- #232 (ULTIMATE-FOUNDATION-001, Codex) is blocked on review finding B1 (TODAY FUEL button
  names hide their values). Codex fixes it, then it needs a new exact-head review.
- After #232 merges, the session record gets a link to its History day using #232's History
  focus plumbing.
- #231 (REVIEW-001 plan) merged at `69f9538`.

## Previous objective — PHONE-FIT-001 (2026-10-14, ROUTINE, merged in #230)

Gavin approved fixing review leftovers R3 and R4 from PR #228 ("start option 1", 2026-10-14).
Builder: Claude Code. Starting master `53fcf68`; branch `claude/phone-fit-001`; PR linked from the
branch. Scope: the Obligation EDIT Due/Planned row reuses the create form's responsive
`.intent-dates` (stacks at ≤360 px), and BODY counts an open correction or saved-meal editor as
unsaved input only when a value differs from the saved record it opened with. UI only; no Engine,
schema, event, backup, fixture, dependency or CI change. Evidence and verification are in the PR.
Next action: Gavin's merge decision after green required CI.

## State before PHONE-FIT-001 (2026-10-14)

PR #228 (DAILY-EXPERIENCE-001) merged at `910c436` with Gavin's approval. Merged head
`5a4c33bdd3ab3211150130b81724e5a2e22ac8a5` had green required PR Verification and an independent
Claude Code exact-head PASS review recorded on PR #228. Housekeeping PR #227 merged earlier at
`644aae5`. No deploy. Only isolated prototype #204 remains open. Next action: on "let's work",
propose the next owner-prioritized objective; none is approved.

Open, unapproved: owner decision D1 (see COMMAND-ATOMICITY-002 below; merged default saves nothing
and suggests RELEASE); an after-the-fact independent review of PR #226's `99b8f70` if Gavin wants one.

Carried forward from the PR #228 reviews, nonblocking and unapproved:
- R3 and R4 are being fixed by PHONE-FIT-001 above.
- R3 (pre-existing on master): the Obligation EDIT Due/Planned row is an inline flex row; the page
  is 369 px wide at 320/360 px, and at 320 px the bottom nav is pushed below the viewport. Likely
  fix: use the create form's `.intent-dates`. Plan Today makes this editor easier to reach.
- R4: BODY counts an open but unchanged correction editor as unsaved input, so reload/update
  prompts can fire spuriously (Intent editors already compare against the saved record).
- Plan Today groups by calendar date, so during an overnight shift "planned today" items move at
  midnight, before the 16:30 BeyondDay boundary (existing semantics, not a regression).
- Hidden retained panes keep their timers running; retained TRAIN briefly shows its previous
  headline until its activation re-read finishes.

Also carried forward, unapproved: review notes N1–N4 from PR #220 (count-start churn on re-entry,
destination-guide descriptions, Search Capture result skipping discard confirmation, stale Capture
message); operator stage 6 consolidation (waits for field evidence); VCC-001 stays paused; F1 field
stop runs to about Oct 25. A reviewer once saw a non-reproducing local `MealRoundTrip.test.tsx:80`
scroll-poll failure under combined load; watch for it in CI.

## Historical objective — DAILY-EXPERIENCE-001 (merged PR #228)

Gavin authorized the complete PROTECTED objective on 2026-10-13; brief in
[DAILY-EXPERIENCE-001.md](DAILY-EXPERIENCE-001.md). Starting master `e145cd16`; branch
`codex/daily-experience-001`; [PR #228](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/228), merged at `910c436`.
Builder: Codex (`d962b6f`, `54aaf8a`); Gavin reassigned the review corrections to Claude Code after
Codex ran out of usage (`73abb55`, `9cb2ace`, `4177b91`, `34a17e4`, `5a4c33b`).

Implemented: session-local meal/sleep/workout-set/Journal/Capture/planning input retained across
tabs and feature links (never persisted; drafts clear on reload/process eviction); reload and
UPDATE NOW warnings for unfinished input; origin/position/focus return; compact Day Line TODAY with
separate recorded Status and Engine guidance; focused canonical water/meal and quick Capture; Plan
Today over explicit existing dates/Missions/recurrence with canonical detail resolution; compact
MORE with on-demand guidance, complete Backup/Recovery access and one main landmark. No Engine,
schema, event/backup contract, historical fixture, dependency, backend or CI change.

Review history: Claude review of `54aaf8a` BLOCKED on B1 (a TODAY shortcut's focused BODY view and
stale RETURN leaked into primary navigation). Codex review of `54aaf8a` BLOCKED on Plan Today A → B
→ A edits being lost and Intent/Plan-composer drafts missing reload/update protection. Claude review
of `34a17e4` confirmed those fixed and BLOCKED on R1 (retained TRAIN showed a stale variant under
SUGGESTED WORKOUT after a check-in; master showed REDUCED for YELLOW). `5a4c33b` re-derives
unchosen template/variant on return and clears a stale Capture return (R2).

Evidence on merged head `5a4c33b` (independent re-review): typecheck, architecture (212 files) and
build pass; full Node + Chromium suite 229 files / 2,393 passed / 1 existing skip; production
acceptance (`scripts/verify-daily-experience.mjs`) passes at 320/360/412 px; required PR
Verification green. Synthetic phone evidence: [README](../screenshots/daily-experience-001/README.md).
Untested: physical iPhone/Safari/Android keyboards and screen readers. Existing bundle-size
advisory and single-tab limitations remain.

## Historical objective — COMMAND-ATOMICITY-002 (issue #225, merged PR #226)

Gavin explicitly approved COMMAND-ATOMICITY-002 on 2026-10-13 as a bounded PROTECTED objective;
brief in [issue #225](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/225). Sole Builder:
Claude Code; branch `claude/command-atomicity-002`; [PR #226](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/226). Fresh
starting master: `e635643` (PR #224 merge, checkpoint already reconciled for #223; #221 closed).
Only prototype #204 is otherwise open.

Implemented: `src/application/atomicWrite.ts` is the one transaction helper (per-family table
lists, plus events/checkIns/recommendations for `nextSeq`'s cold-start read; nested calls join the
caller's transaction). Wrapped, with guard reads inside: `startDay`, `endDay`, rollover,
`submitCheckIn` (check-in + recommendation + both events), `rateOutcome`, `setWorkContext`,
`markWorkEnded`; every Mission/Obligation command incl. recurring next occurrence and Capture
conversion; Journal create/modify/review; TRAIN now uses the same helper. Signatures, validation,
events and payloads unchanged. Diagnostics: `recordIntegrityQueries.ts` reads one read-only
snapshot, tolerates null/malformed payloads, uses local dates, and adds days, check-ins (row side),
recommendations, missions, obligations and journal entries; MORE shows "Record mismatches".
Not covered (unreliable on old data): work context, outcome ratings, Capture conversion, WAITING/OPEN.

Owner decision D1, still open (default implemented and merged): satisfying a recurring obligation whose mission is
archived used to save SATISFIED, skip the next occurrence and still show a "cannot link" error;
now nothing is saved and the error says so and suggests RELEASE. Alternative: satisfy and stop
the recurrence silently.

Evidence: 20 new Node atomicity cases (16 fail on the old commands; the 4 cold-start cases fail
when `checkIns` is dropped from the helper), 5 new diagnostics cases (both protected backups
clean and byte-identical), 5 new real-Chromium cases (rollback, IntentScreen failure → error →
single retry save, D1 copy, MORE listing at 320/412 with axe, no writes). Full local suite,
TypeScript, architecture (209 files), build and whitespace pass; counts in the PR. Production PWA
at 320/360/412 px: day + check-in, mission, obligation satisfy, journal review, offline cold
reload, offline satisfy, Record mismatches 0 ([evidence](../screenshots/command-atomicity-002/README.md)).

Limits: rolled-back writes leave `seq` gaps (ordering only). `seq` is assigned per tab in memory,
so two tabs writing at once could still share a value (pre-existing, unchanged). Single-event
corrections keep their read-then-append shape; UI busy guards still prevent double submits.
Merged; see the current state above.

The PR #223 review notes (cold-start test, payload null guard, UTC dates) are addressed here.

## Historical objective — WORKOUT-ATOMICITY-001 (issue #221, merged PR #223)

Gavin approved [issue #221](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/221) on
2026-10-13 ("Approve #221 with option A"). Sole Builder: Claude Code; branch
`claude/workout-atomicity-001`; PR linked in GitHub. Lane: PROTECTED (command/event write
behavior, data integrity). Fresh starting master: `a0aae6865` (PR #220 merge). Housekeeping docs PR
#222 merged afterwards and was merged into this branch (checkpoint-only conflict); only prototype
#204 is otherwise open.

Implemented: `startWorkout`, `logSet`, `skipSet`, `completeWorkout` and `abandonWorkout` (so also
`completeRecoverySession`) write their row and event in one Dexie read-write transaction over
workoutSessions, performedSets, events, checkIns and recommendations (`nextSeq`'s cold-start
read). Signatures, validation, idempotency/in-flight and RED-override guards, event types and
payloads are unchanged. Option A: read-only `getWorkoutRecordMismatches()` compares session/set
rows with their events both ways; MORE → Diagnostic detail shows the count and plain messages.
It writes and repairs nothing.

Evidence: eight new Node cases (failure injection per command, row failure, undo pairing, every
split kind, read-only, empty DB and protected fixture B report zero). The four rollback cases fail
without the transaction. Five new real-Chromium cases cover rollback in real IndexedDB, readout
0, split listing at 320/360/412 with axe and no writes. TRAIN-OPERATOR-001's partial-failure test
asserted the old half-saved row; it now asserts the rollback, unchanged reconciliation (no replay,
honest re-read) and a single row/event after a manual second LOG. Full local suite: 221 files,
2,321 passed, one existing skip. TypeScript, architecture (207 files), build and whitespace pass.
Production PWA at 320/360/412 px: start, log, skip, undo, offline cold reload, offline log,
COMPLETE hold, start/stop, diagnostics 0, no overflow ([evidence](../screenshots/workout-atomicity-001/README.md)).

Limits: rolled-back writes can leave seq gaps (ordering only, as with day rollover). Non-workout
commands that write twice are out of scope. Merged; see the current state above.

## Historical objective — Guided MORE + Low-Energy TODAY (issue #219, merged PR #220)

PR #220 review correction, 2026-10-13: an independent Claude Code review of
`72b735082ceb39fbae1aec39743a0111f1c6f783` issued BLOCK on B1 only. The retained (hidden-mounted)
Journal kept its last opened entry, so re-entry from the MORE menu or a Search result showed a stale
detail instead of the list. Builder: Claude Code (taking over from Codex). Fix: Journal resets to
its list on each activation; creation drafts are separate state and stay retained. A new browser
regression fails on the reviewed head and passes with the fix. Full local Node+browser suite
(219 files, 2,308 passed, one existing skip), TypeScript, architecture (206 files), build and
whitespace pass. Nonblocking N1–N4 are left unchanged to keep this correction bounded. Prior-head
CI/review do not apply; corrected-head CI and renewed independent exact-head review belong in PR #220.

Owner authorization: [issue #219](https://github.com/gavinlohnes/neo-beyond-lohnes/issues/219)
and Gavin's direct implementation assignment. Sole Builder: Codex; branch
`codex/guided-more-low-energy`; [PR #220](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/220).
Lane: PROTECTED — bounded MORE/TODAY presentation
and navigation composition, not new Engine or Minimum Day behavior. Fresh starting master:
`4b6cf819bfc494f2283270b277a504f5197e22e2`, verified merge of BODY PR #218 at corrected
head `830dcb143815401ee6e7ff3a047cfa625868248d`. Clean worktree; only prototype #204 open,
untouched and unintegrated. The previous BODY checkpoint below is historical, not active work.

Scope: hybrid MORE index with exactly two optional record-grounded destination suggestions,
stable reflection/direction slots and generic fallback; optional destination guide and guided
existing Journal/Mission/Obligation starts; retain free notes in Capture and in-memory writing
drafts across MORE inspection/return. TODAY adds user-chosen session-local Small Steps, direct
access to existing Minimum Day/Capture, focused tool operation and explicit all-tools/return.
Preserve status, work context, active operations, one Engine recommendation/WHY, all existing
routes, manual entry, decisions/confirmation, correction/undo, data and offline reliability.

BUILD OWNED the small read-only canonical-query composition and native React focus/disclosure;
reuse operator components/current forms. No dependency. The locked omission of fixed summaries
on named index rows remains; readable explanations live in a separate optional destination guide.
No locked UX or doctrine revision is assumed. Plain memories stay Capture, not invented journal
records; changing decision-required Journal semantics would need a separate owner ruling.

Excluded: Engine/priority/capacity/Minimum Day rules, commands/events, domain/schema, persistence/
backup formats, primary tabs, AI/diagnosis/inference, new dependencies, notifications/Pulse,
streaks or forced check-ins, silent plans, CI/protections, prototype, merge/deploy.
Acceptance: exactly two truthful/stable starts; archived-Mission eligibility; loading/error/retry;
guides never write without explicit existing save; free/manual paths and draft/focus/return;
normal/unknown/GREEN/YELLOW/RED/active operations and all essentials preserved; real offline PWA,
320/360/412 px screenshots, accessibility/reduced motion, regression/architecture/type/build,
whitespace/links/risk and green required CI. Independent exact-head review and Gavin's separate
merge decision remain required.

Implemented: canonical count-based reflection/direction starts, exactly two, with explicit generic
pending/failure fallback and read-only retry. No date rotation, urgency ranking or inference. The
full MORE index/recovery/settings remain. Optional destination descriptions and writing prompts
reuse existing forms; free memories remain Capture. Creation drafts stay mounted across MORE
inspection/return/search navigation; the new Capture exit explicitly asks before discarding them.
List reads distinguish unavailable from empty and retain manual starts. Small Steps is chosen in
the existing TOOLS toolbar, leaving closed-TOOLS TODAY's previous layout intact. Active Small Steps
offers Minimum Day/Capture, one-tool inspection, all-tools escape and predictable focus/return.
Essentials, active operations, phase/Attention policies, Engine guidance/WHY/decisions, Minimum Day
rules/enable and canonical commands are unchanged. Capture failure retains input; a known committed
save followed by failed refresh is disclosed without inviting a duplicate write.

Verification: full Node, 145 files / 1,545 passed / one existing skip. Seventeen new browser cases
cover guides/drafts/confirmation, write/read failures, explicit saves, GREEN/YELLOW/RED and unknown/
active states, unchanged recommendation/Minimum Day authority, hydration/undo, meal round-trip,
keyboard/focus, axe/reduced motion and mobile widths. Final affected TODAY/new/meal suites pass
120 tests. Earlier complete browser run passed 760 and exposed two 320px toolbar overflow cases;
the toolbar label/wrap correction passes both unchanged assertions in that final 120-case rerun.
An earlier meal-return regression caused by the inactive entry layout was corrected by moving
opt-in to existing TOOLS, not weakening the untouched meal suite. No final full local browser rerun
is claimed; required native CI runs the complete final-head suite. Architecture (206 files),
TypeScript/build, whitespace and ten local documentation links/anchors pass.
[Thirty actual mobile captures](../screenshots/guided-more-small-steps/README.md) document canonical
native restore, guided/free drafts/return, 320/360/412 px, real BODY water/undo, offline cold reload,
and explicit task/Capture saves; no horizontal overflow. Exact-head risk/CI/review evidence belongs
in the active PR. Committed baseline risk detects no automatic Protected path trigger; semantic
judgment keeps this owner-approved objective PROTECTED, with independent review required.
Engine/domain/persistence/commands/backup formats/dependencies/App navigation/CI/
protections/protected fixtures/prototype are untouched.

Limits: Chromium automation, not physical-device/iOS/native assistive-technology certification;
no arbitrary-large-history or cross-tab guarantee. Draft retention is in-memory MORE inspection,
not reload or ordinary primary-tab persistence; new guided Capture navigation confirms discard.
Small Steps is session-local, not a stored preference/plan. Existing bundle warning and command
integrity opportunities are unchanged. No additional owner ruling needed for implemented scope;
general-memory Journal semantics, new persistence or Engine/Minimum Day rules remain separate
owner decisions. Next: green required exact-head CI, independent review, then Gavin's separate
merge decision. No merge/deployment.

## Historical objective — BODY Insights & Progress Intelligence (merged PR #218)

Owner-requested PR #218 review correction, 2026-10-13: Claude Code independently reviewed
`f8274f07512895431c3d901175d6d2cfc865eb12` and issued BLOCK on B1 only. Chart extrema now
explicitly say High and Low, not apparent chronological endpoints. Focused assertions verify
both labels at 320/360/412 px. No calculations, chart interactions, accessibility, history or
other functionality changed. All 61 focused BODY/cleanup browser cases, architecture (203 files),
TypeScript, production build and whitespace pass. Nonblocking read coupling, ribbon disclosure,
selection retention, workout units and naming observations were reviewed and left unchanged to
avoid expanding this correction. Existing screenshots predate the label fix. Corrected-head CI
and renewed independent exact-head review belong in PR #218; prior-head approval does not apply.
No merge/deploy; Gavin retains separate final merge authority.

Gavin approved this bounded objective on 2026-10-13. Sole Builder: Codex; branch
`codex/body-insights-progress`; [PR #218](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/218).
Risk: PROTECTED — meaningful BODY interpretation/
presentation and the explicitly approved narrow chart exception recorded in the UX register.
Fresh starting master: `ea0c26f26d05991811676378174c21b3139805fc`, verified PR #217 merge.
Initial worktree was clean; only isolated prototype #204 is open, untouched and unintegrated.

Scope: enrich existing BODY progress with read-only selectable weight, nutrition, reliable
main-sleep and finished-workout series, useful ranges, truthful comparisons/coverage, accessible
point inspection and supporting records. Preserve Daily Record/meal entry, drafts/focus/return,
corrections/undo, accomplishments/ribbon/timeline/baselines and existing goals/targets.
Reuse canonical correction-aware queries and shared operator readouts; BUILD OWNED small
domain-specific read composition and native SVG/range/disclosure, no dependency or new chart system.
Excluded: Engine/recommendation/medical authority, new inference/correlations, commands/events,
domain/schema/persistence/backup formats, navigation, dependencies, CI/protections, prototype,
merge/deploy. Fiber is absent, not estimated; missing/partial records never become zero intake.
Acceptance: accurate window/coverage/zero/missing/comparison calculations; historical correction/
void integrity; read/loading/failure/retry; existing journeys; 320/360/412 px, accessible keyboard/
contrast/reduced motion, production offline PWA, architecture/type/build, regressions, mobile
evidence and green required exact-head CI. Independent exact-head review and Gavin's separate
merge approval remain required.

Implemented: selectable 7/28/90-day weight, meal calories, protein, reliable main-sleep and
finished-workout series; means/prior-period changes with denominators; native pointer/keyboard
point inspection; dated records and calculation/coverage disclosures; meal carb/fat details and
explicit unavailable fiber. Nutrition is recorded intake, not total intake; ambiguous multiple-main
sleep days are excluded, not combined; co-recording never implies causation. Existing goal/milestone/
projection rules remain. Daily Record/manual/meal handlers are unchanged; accomplishments, ribbon,
timeline and baselines remain reachable. Selectable charts lead, while the established last-recorded
weight SVG remains inspectable when the latest record is older than all recent ranges. Its existing
facts remain; timeline opening still hides both charts.

Evidence so far: all 144 Node files pass (1,542 tests, one existing skip). All 70 targeted real-
Chromium cases across BODY/progress/cleanup pass, including six new UI cases and seven new
calculation/canonical-history cases in Node. Architecture (203 files), TypeScript/build and
whitespace pass. A preservation test caught a new hint pushing water controls below the first
viewport; it was removed, not the assertion. Existing chart tests now assert the new graph while
retaining goal/milestone/no-warning/timeline safeguards, with deterministic dates.
Actual 320/360/412 px PWA native restore, point inspection, offline reload/local exploration,
return focus and manual water/undo pass. [Mobile evidence](../screenshots/body-insights-progress/README.md)
records synthetic fixtures and limitations. Final full browser passes 73 files / 744 tests. A final
source-date annotation distinguishes existing all-history weight facts/projection from range means;
all 71 final focused cases pass, including a seventh new UI regression proving older-history graph
access and timeline suppression. Thirty-four local documentation links/anchors pass.
Required exact-head CI is recorded in the PR. Committed baseline risk reports PROTECTED;
independent review is required before Gavin's separate merge decision. No merge/deploy.

## Historical objective — MORE-OPERATOR-001 control center (merged PR #217)

Gavin approved this bounded Protected stage on 2026-10-10, with no merge/deploy authorization.
Builder: Codex, sole implementation Builder; branch `codex/more-operator-001`;
[PR #217](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/217).
Fresh baseline: `d3386f3d9901e0fa41a10f03e5dc4536578ebc96`; GitHub confirms PR #216 merged
at exactly that commit. Clean starting worktree; sole open PR #204 remains isolated and untouched.
Brief: [Stage 5](BEYOND_OPERATOR_EXPERIENCE.md#active-stage-5-brief--more-operator-001).

Implementation: records/review lead, Direction and Training tools stay distinct, and the identity
zone has an immediate backup/recovery jump. Existing export/share/replace-only restore remain
visible; automatic preferences/file check and time capsules use deliberate native disclosure.
All nine destinations, settings, Findings/Weekly depth and correction/manual routes are retained.
The menu stays mounted during inspection, retaining local settings/capsule drafts, disclosures,
position and focus on explicit return; primary-tab/reset semantics are unchanged. Diagnostics,
History, Review and Weekly distinguish unavailable reads from empty/zero and provide read-only
retry. Backup export failures are surfaced; synchronous UI guards preserve one in-flight safety
operation and existing backup-before-replace/preview/confirmation semantics. No Engine, application,
domain, schema, persistence, events, backup formats, dependencies, CI, protections or prototype edits.

Verification: full Node suite passes 143 files / 1,535 tests, one existing skip; full Chromium
suite passes 72 files / 736 tests. All 24 final focused operator tests pass, including added restore
failure-ordering and computed minimum-text checks (one additional test after the full local run).
Architecture passes (201 files); TypeScript, production PWA build and whitespace pass.
Actual 320/360/412 px PWA offline reload, History/events, record search/result navigation, settings
save/reload, real backup download/preview/cancel/file check and return focus pass at every width.
[Twenty-one synthetic mobile captures](../screenshots/more-operator-001/README.md) record actual
production behavior, not prototype sample rules. Eight local documentation links and heading
anchors pass; committed baseline risk reports PROTECTED. Exact-head CI/review results
belong in the linked PR rather than a self-referential checkpoint SHA.

Limits: Chromium-only automation, no physical-device/iOS/native-screen-reader or OS share-sheet
certification. Draft continuity is session-local menu inspection, not new persistence or cross-tab
draft authority. Existing bundle-size warning and excluded workout command atomicity opportunity
remain. Environment reuses the existing setup and temporary system-Chromium browser override;
no tracked runner changes or new configuration needed. Next: green required exact-head CI,
independent review, then Gavin's separate merge decision. Do not merge/deploy.

Owner-requested PR #217 follow-up, 2026-10-10: Weekly clears its last successful summary when
a fresh read begins. Pending reads show Loading; failure shows the error and RETRY WEEKLY without
old figures. A gated regression covers successful load → failed refresh → pending retry → successful
recovery and unchanged canonical events; it failed against `a664d92c94dfdbaf532411545984e8881e83d354`
before the correction. This is UI read-state repair only, reusing existing query/cancellation state;
no command, domain, persistence or authority change. All 76 focused MORE/Review browser cases
pass, including the new recovery sequence; architecture, TypeScript/build, whitespace and eight
local documentation links/anchors pass. Corrected-head native CI and renewed
independent exact-head review belong in PR #217; prior-head CI/review is not approval of this update.

## Historical objective — TRAIN-OPERATOR-001 operating surface transformation (merged PR #216)

Gavin approved this bounded Protected stage on 2026-10-10. Builder: Codex, sole implementation
Builder; branch `codex/train-operator-001`; [PR #216](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/216). Starting master is the freshly verified
`173b9f930764e99b7d03d36d14d21aa4f3f57a49`, merging PR #215. Initial working tree was clean;
initial public open-PR inspection showed only isolated prototype #204. GitHub API access initially
failed with network Forbidden (including sandbox escalation); after saving missing destinations
in the environment draft, authenticated API access and PR creation succeeded. No required CI
success is claimed here. Full concise brief:
[TRAIN stage 4](BEYOND_OPERATOR_EXPERIENCE.md#active-stage-4-brief--train-operator-001).

Implementation: preparation leads with the chosen session, prescribed exercise/set totals and
START; the full prescription and unchanged WHY evidence remain deliberately inspectable. Active
TRAIN shows canonical session progress, current lift/prescription, known or explicitly unknown
last performance and current set inputs before progression/substitution. Gym Mode, rest,
exercise navigation, undo, finish/partial/stop confirmation and all pre-session library, template,
history and record routes remain accessible. A finished lift has an explicit CONTINUE route to
the existing first unfinished lift; chosen substitutions remain visible outside inspection.
Completion uses truthful recorded/skipped metrics and keyboard focus follows completion/return;
read retry never restarts a workout, and LOG feedback distinguishes an unconfirmed command from
a successful commit whose subsequent read failed. An uncertain command failure requires read-only
reconciliation before another LOG is possible. No protected data/rule/command layer changes.

Verification: all 143 Node files pass, 1,535 tests and one existing skip. Final full browser project
passes 71 files / 713 tests, including 15 operator tests and a real performed-row-present/event-
failed injection without duplicate recording. Architecture passes (201 files); TypeScript,
production PWA build, whitespace and 25 local documentation links pass. Actual production
PWA offline reload, canonical resumption, offline recording and hold-to-finish pass at 320/360/412
px. Eighteen synthetic mobile captures and limitations are in
[TRAIN evidence](../screenshots/train-operator-001/README.md). No physical-phone/iOS, native
assistive-technology, hardware haptic or wake-lock acceptance is claimed. Existing bundle-size
warning remains. Committed baseline risk classification reports PROTECTED; required exact-head CI
and independent review are pending. The pushed branch is recoverable in PR #216. Environment
network corrections are saved; successful live API requests do not establish a published setup
snapshot. Next: obtain independent exact-head review and successful required CI, then Gavin's
separate merge decision. Do not merge/deploy.

Separate owner decision required, not implemented: existing workout commands can write a row and
its event separately. UI recovery reconciles an uncertain result and never blindly repeats LOG;
it cannot provide transactional row/event integrity or repair policy without crossing the
excluded command/application boundary. Recommend a separately approved atomicity/recovery objective.

## Historical objective — TODAY-OPERATOR-001 command surface transformation (merged PR #215)

Gavin explicitly approved this bounded Protected objective on 2026-10-09. Freshly fetched
`origin/master` and the starting commit are
`1d83756b2ba971144365714d7450fb1091b9f2dc`, the verified merge of PR #214. Builder: Codex;
branch `codex/today-operator-001`; merged as [PR #215](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/215). Public GitHub inspection showed PR #204 was the only
other open PR; it remains an isolated interaction prototype and is neither modified nor integrated.

Scope: transform TODAY's production composition into one operator command surface ordered around
current phase/context, truthful System Status/capacity, the one canonical Engine recommendation,
immediate existing operations, earned attention and deliberate inspection. Reuse `OperatorHeader`
and existing application queries, commands, recommendation evidence, State/shift context and
presentation primitives. Preserve every existing TODAY journey, manual control, confirmation,
draft, recovery, focus, offline, exactly-once and correction path. No Engine, recommendation,
domain, schema, persistence, backup, event, command, navigation, dependency, CI, protection or
prototype change. Full concise brief: [BEYOND operator experience migration](BEYOND_OPERATOR_EXPERIENCE.md#active-stage-3-brief--today-operator-001).

Delivered implementation: TODAY identifies CURRENT STATE and its authoritative phase,
separates SYSTEM STATUS from context, labels the canonical Engine result PRIMARY RECOMMENDATION,
and places WATER / MEAL / SYSTEM after that recommendation as IMMEDIATE OPERATIONS. Foreground
operations still retain precedence; phase rows, capped Attention and the complete TOOLS disclosure
remain reachable below. No new inference, score, urgency, command or data path is introduced.

Verification: the full real-Chromium project passes 70 files / 698 tests, including the complete
TODAY journey, GREEN/AMBER/RED/NO READ, NO ACTION REQUIRED, recommendation/WHY, manual commands,
confirmations, failures/retries, focus return, drafts, workout continuity, reduced motion, axe and
320/360/412 px containment. All 143 Node files pass: 1,535 tests and one existing skip.
Architecture passes (201 files); TypeScript, production PWA build and whitespace pass. The built
PWA retains the synthetic day and current command surface through an offline service-worker reload
at 360 px. Synthetic production-build captures are in `docs/screenshots/today-operator-001/`.
The existing bundle-size warning remains. Final committed risk classification, required exact-head
CI and independent exact-head review remain pending. No merge or deployment is authorized.

## Historical objective — shared operator shell and primitives

Gavin approved stage 2 of the BEYOND-wide operator experience migration on 2026-10-09 after PR
#213 merged at `61b27232881f246c3e0038c9a8b1492a76b3dace`. Risk lane: PROTECTED because shared
primary-surface presentation can affect identity, hierarchy and accessibility. Builder: Codex;
branch `codex/operator-shell-primitives`; merged as PR #214. PR #204 remains an isolated prototype.

Scope: extract the already-common primary destination identity header and BODY's proven small
read-only fact matrix into constrained shared components; adopt them only with exact copy, glyph,
focus, data and layout parity. No TODAY/TRAIN/MORE redesign, behavior relocation, generic card
system, Engine/application/domain/persistence/event/schema/backup/dependency/fixture/CI/prototype
or deployment change. Acceptance and full brief: [BEYOND operator experience migration](BEYOND_OPERATOR_EXPERIENCE.md#active-stage-2-brief--shared-shell-and-primitives).

Implementation: `OperatorHeader` now owns the already-identical destination glyph/heading/rule
frame across the four primary screens while preserving each caller's exact copy and focus handoff.
`ReadoutGrid`/`Readout` extract BODY's daily read-only fact matrix with an explicit non-card,
non-action contract. Existing `health-*` hooks remain for compatibility; no query, state or control
moved. New browser coverage checks heading semantics/focus, long values, 320/360/412 px containment,
axe and reduced motion. Focused final sets: 46 passed before a full-gate compatibility finding;
the preserved hooks and affected BODY/protein/primitive subset then passed 21/21. Node suite: 143
files, 1,535 passed and one existing skip. Architecture passed (201 files); TypeScript, production
PWA build and whitespace passed. The existing bundle-size warning remains. Required exact-head CI,
independent review and Gavin's merge approval are pending.

## Historical objective — BEYOND-wide operator experience migration contract

Gavin explicitly approved evolving all of BEYOND toward the Insights Phase A prototype's
operator-console experience and directed Codex to start on 2026-10-09. BODY Daily Health Record is
already merged in PR #212. This first follow-on objective is documentation-only: establish the
shared screen grammar, semantic boundaries, preservation matrix and staged production sequence
before TODAY, TRAIN or MORE changes.

Risk lane: PROTECTED because the contract governs a future primary-information-architecture
migration. Starting master: `c0f0d3c1c171aa0aac301141e3ea4c1e5e7a2d47`. Builder: Codex;
branch `codex/beyond-design-system`; active PR [#213](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/213). Prototype PR #204 remains isolated and
untouched. Full brief: [BEYOND operator experience migration](BEYOND_OPERATOR_EXPERIENCE.md).

Scope is this contract and checkpoint only. No production source, runtime behavior, Engine,
events, schema, persistence, backup, dependencies, fixtures, CI, protections, prototype integration,
deployment or merge. Acceptance: authority consistency, resolving links, clean whitespace,
Protected classification, green required CI and independent exact-head PASS. Every later
production stage requires its own bounded owner-approved Protected brief.

## Historical objective — BODY Daily Health Record

Gavin explicitly approved this cohesive Protected objective on 2026-10-09, including amendment of
BODY's four-tracker presentation and latest-entry sleep summary. Fresh master:
`bb36ffbf12116cc1e29d27bac1fa549744101e8a` (#211 integrated). No overlapping Builder;
only prototype PR #204 was open and remains untouched. Builder: Codex; branch
`codex/body-daily-record`; active PR [#212](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/212).

Scope: daily calories/protein orientation, secondary nutrition details, separate main sleep/naps,
canonical record inspection/correction, immediate meal/water entry and existing progress without a
weigh-in gate. Reuse canonical forms/commands/read models; keep four tabs and all meal/undo/draft/
recovery/offline/workout safeguards. No Engine, event, schema, persistence, backup, dependency,
one-off meal or unrelated changes. UX amendments are in the existing Decision Register.
Leverage: REUSE existing BEYOND tools/queries; USE PLATFORM native disclosures; BUILD OWNED the
small connective presentation. Do not add a library or another logging architecture.

Acceptance: real mobile 320/360/412 px; effective totals and corrections; main/nap and lived-day
ownership; progress without weight; draft/focus/return/error recovery; exactly-once logging and
existing regressions; offline built PWA; architecture/type/build; green required CI and independent
exact-head PASS. Verification: architecture passed (199 files), TypeScript/production PWA build and whitespace passed.
Full local suite covered 212 files: 2,220 passed / one existing skip; six legacy presentation selectors
needed updating for the authorized layout. All affected suites were corrected and rerun successfully
(112 tests across the final focused sets), with no assertions weakened. The 10 new daily-record cases
cover all three phone widths with full contrast/axe checks, overnight main/nap ownership, canonical
meal/water inspection, retained correction drafts, read-only recovery/focus, local draft/return and
same-tick write guards. Final timeline/recovery subset: 14 passed. Existing meal/workout/rollover,
Engine, provenance and historical restore regressions remain. Actual synthetic browser screenshots
are in `docs/screenshots/body-daily-record/`; all quick water controls fit above navigation at
320/360/412 px, with no horizontal overflow. Built-PWA offline preset save/log/return/reopen/undo/
correction/cold reload passed. Required exact-head CI and independent review are pending in the PR.
Initial independent review found one minor missing inspect glyph. It is replaced with the existing
LineIcon/ArrowUpRight SVG, and affected real screenshots were recaptured. A subsequent manual
read-retry timing defect is corrected with a post-commit enabled-control handoff; the regression
uses a gated read. New layout tests load the real local production fonts before measuring rather
than relying on platform fallback fonts. Final daily/meal/focus correction set: 41 tests passed;
architecture/build pass. Renewed independent exact-head review and required CI are requested.
Limitations: Chromium verification; existing memory-only drafts/undo windows; no canonical fiber
field; existing bundle warning. No merge or deployment authorized.

## Historical objective — Delta removal and intelligence preservation

Gavin explicitly authorized this bounded Protected cleanup on 2026-10-09. Fresh master:
`1170a13bbbd96627665087cef203e45d662f3a86`, the verified merge of #210. The meal milestone
#209 is already merged; only prototype PR #204 is open and stays untouched. Builder: Codex;
branch `codex/delta-removal`; active PR [#211](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/211)
carries exact-head evidence and independent review.

Audit: current tracked production navigation/App/MORE/SYSTEM, runtime source, package manifest and
lockfile, Vite/PWA/deployment configuration, environment declarations, event/storage types and
native/legacy restore contracts contain no active Delta assistant, model integration, AI-specific
prompt/configuration/dependency or Delta storage contract. Mathematical variables named `delta`
are unrelated. Optional USDA food lookup is non-AI and remains. Local chrono-node/Compromise date
parsing, MiniSearch retrieval/relevance, advisory composition, baselines, analytics and the canonical
Engine are useful non-AI capabilities, not deletion targets. No Delta-specific compatibility shim
is needed; existing legacy importers and native backup/restore remain necessary and unchanged.

Scope: remove misleading active future-cleanup requirements and record the verified intelligence
strategy in existing documents. No invented runtime deletion, migration, dependency removal or
replacement abstraction. Production source, data, commands, schemas, backups, tests, packages,
CI/protections and historical evidence remain unchanged. Leverage: REUSE existing deterministic
capabilities; REJECT unnecessary replacement infrastructure. Acceptance: preservation regressions,
architecture/type/build, document consistency, required CI and independent exact-head review.
Verification: 18 preservation test files passed (331 tests, one existing skip), covering Engine,
advisory/date/baseline/progression intelligence, canonical nutrition/hydration, meal drafts/recovery,
SYSTEM, TRAIN and historical restore fixtures. Architecture passed (196 files), TypeScript/build,
whitespace and 38 local document links passed. Built PWA in an isolated synthetic Chromium profile
passed offline preset save, exactly-once log, explicit return/focus/reopen, undo, correction and
cold reload retaining canonical totals. No new tests are needed for documentation-only changes;
required full CI and independent exact-head review belong in the PR before owner merge approval.
Existing Chromium-only verification, memory-only drafts, undo windows and bundle warning remain.
No merge/deployment authorized.

## Historical objective — product direction and creative freedom transition

Gavin explicitly authorized this bounded Protected governance transition on 2026-10-09.
Freshly fetched master: `5a021de81d73520c3ed3a32d47ca5e5d85e69a76`; PR #209 is merged at
that commit, so no active meal Builder overlaps this objective. PR #204 is the only open prototype
PR and is untouched. Older pending meal/catalog pointers below are historical.
Builder: Codex; branch `codex/product-direction-transition`; active PR [#210](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/210).

Scope: one concise Product Direction reference and necessary links/authority reconciliation;
creative independence within approved outcomes, complete experiences, existing leverage gate,
historical-decision amendment path and smart-by-design/AI-optional direction; classify the new
product-direction authority as Protected with a focused regression. Preserve DEV-FLOW-002
review/CI/merge safeguards, locked behavior until amended and all engineering/data protections.
No product code, Delta removal, dependencies, settings, CI/protection changes, deployments or merges.
BUILD OWNED concise repository direction; reuse the current workflow and leverage gate.
Verification: 30 local document links resolve; identified authority conflicts are reconciled;
CLAUDE's router and the engineering contract are byte-unchanged. Architecture passed (196 files),
whitespace passed, and all 26 risk-classifier cases passed. The new Product Direction case failed
before path recognition and passes after it. Changes are governance documents plus the classifier
path and its regression; production code, dependencies, historical Drops/fixtures and CI stay intact.
Required CI and independent exact-head review belong in the PR. Independent PASS/BLOCK must be
recorded in GitHub before owner merge approval. No unrelated objective is activated.

## Historical objective — focused meals, Product Experience Milestone 3

Gavin approved the read-only assessment's bounded Protected recommendation on 2026-10-09.
Starting freshly fetched master: `97103b5235ff02b07fffdc7d0b5727470f2abcdb`; PRs #205–#208
are merged (older pending pointers below are historical). Builder: Codex, sole Lead Builder;
branch `codex/focused-meal-m3`; active PR [#209](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/209). PR #204 is the sole open prototype PR and stays untouched.

Scope: focused meal presentation within BODY; shared existing fields/commands/state; saved LOG
first, secondary preset management/online lookup, direct offline manual entry, local all-tracker
access. Preserve separate preset save/consumption, direct BODY workflow, four tabs, drafts,
synchronous guards, recovery/focus, undo/correction, canonical totals/history and workout continuity.
No Engine, schema, persistence, backup, new dependency, hydration redesign, progress consolidation,
VCC-001 or prototype changes. BUILD OWNED small presentation; USE PLATFORM native disclosures.
Acceptance: actual mobile 320/360/412 px, draft/return/focus and recovery, exactly-once records,
management snapshot integrity, existing regressions, architecture/type/build and required CI.
Verification: full local gate 211 files / 2,218 passed / one existing skip; 31 focused meal/journey
cases passed, including eight new presentation tests. Architecture, TypeScript/build and whitespace
passed. Actual synthetic mobile screenshots at 320/360/412 px are in
`docs/screenshots/focused-meals-m3/`. Built PWA offline preset save (no consumed record), exactly-once
log, explicit return/reopen/focus, undo, correction and cold reload all passed. Local tracker choices
supersede the delayed initial handoff. Accessibility tests finish finite entrance effects before
contrast inspection; waiting on hidden retained-screen animations cannot settle while hidden.
Required CI/exact head belong in the PR. Chromium-only evidence, memory-only drafts, existing undo
windows and the existing bundle-size warning remain. Next: independent exact-head review, then
Gavin's merge decision. No merge or deployment authorized.


## Historical objective — searchable SYSTEM catalog milestone 2

Owner authorization: Gavin's bounded implementation instruction, 2026-10-09; Protected navigation
integration. Starting freshly fetched master: `9b2e62417d639eb541b1de47e1b52ff9f5502845`, merged
PR #207. Builder: Codex, sole Lead Builder; branch `codex/system-catalog-m2`; active PR [#208](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/208).
PR #204 is the only existing open PR and remains untouched. Prior milestone handoffs below are
historical; their pending review/merge pointers do not describe current master.

Scope: the approved 18 existing destinations, browsable groups and local names/aliases in SYSTEM;
existing App navigation handlers and MORE subviews; separate record search. BUILD OWNED small
navigation metadata; USE PLATFORM native dialog/input/buttons. No new dependency, storage,
commands, Engine/schema/backup changes, tab replacement, prototype integration or unrelated work.
Keep meal drafts, synchronous guards, canonical logging/undo/correction, read recovery, explicit
return, workout continuity, accessibility and offline behavior. VCC-001 stays paused.

Acceptance: every destination and all four tabs accessible; navigation/search performs no domain
writes; alias/empty/clear behavior; destination/focus return; guarded cancellation and recovery;
canonical exactly-once meal logging and workout continuity; mobile 320/360/412 px and constrained
keyboard space; architecture, build, proportional regression and required CI. Verification: 76 targeted cases passed; final full suite 210 files / 2,201 passed / one existing
skip; architecture, TypeScript/production build and whitespace passed. Forty-one new tests
(34 browser, seven discovery cases) cover the catalog and real journey safeguards. Built PWA
offline passed preset creation/log, cold reload, catalog/aliases, meal return, History, separate
record search, water/undo and focus return. Ten actual synthetic-fixture screenshots are in
`docs/screenshots/system-catalog-m2/`. A constrained-height regression failed before chrome
refinement and now keeps a full matching result visible at 320/360/412 px with 420px height.
Final label audit distinguishes REVIEW's recommendation/decision/rating ledger from Weekly's
progress views; eight affected discovery/destination cases, build and offline PWA passed again.
Required CI/exact head are recorded in the PR. Chromium-only automation, memory-only drafts,
existing undo windows and the existing bundle warning remain; no physical/Safari/screen-reader
certification is claimed. Next: finish verification, independent exact-head review,
then owner review. No merge or deployment authorized.

Independent-review follow-up, 2026-10-09: Gavin authorized correction of the P2 BLOCK at
`75c5b7c73a62686f26003eaf7ca372a9f89e41f8`. Dialog capture prevents native search Escape
from clearing a populated query before dismissal; the existing close/focus path is reused.
Nine focused-query regressions cover empty, matching and no-result searches at 320/360/412 px,
closure after one press, stable trigger focus and clean reopen. Six populated cases failed before
the fix; all 85 targeted cases now pass, with architecture/TypeScript/build and whitespace green.
The review's unrelated meal-test readiness race is bounded to initial LOG availability: wait
before the unchanged same-tick dispatch sequence. CI also exposed the explicit-read-retry
test matching an earlier error while retry was pending; require its specific failure and enabled
control before restoring successful reads. No meal production code changed or assertions weakened.
Built PWA offline one-Escape/focus/reopen checks passed for all nine cases, alongside canonical
logging/return, record search, water/undo and cold reload. Corrected head and required CI belong
in PR #208. The prior BLOCK is not
independent approval of the corrected head; renewed exact-head review is required before owner
approval. No further milestone, merge or deployment authorized.

## Historical objective — Command Console production milestone 1

Gavin authorized this bounded Protected milestone and explicitly amended the placement rule for
persistent WATER/MEAL/SYSTEM controls (UX Decision Register, 2026-10-08). Builder: Codex, sole
Lead Builder; branch `codex/command-console-m1`; active PR [#207](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/207).
Starting fresh master: `db5bae3267ddd82e15f3038f65dc7ba3412893ff`; PR #206 is integrated with
its reviewed head and green CI. PR #204 remains the sole overlapping open prototype PR, untouched.

Scope: compact production TODAY composition, one canonical RecommendationCard retaining existing
dominant/attention/support authority, existing work context/System Status, visible workout resume,
canonical BODY water/meal entry, and a native SYSTEM chooser over existing workspaces/TODAY Tools.
The four tabs and all capabilities stay. Contextual phase rows retain their four-row cap, semantics
and timing; time-sensitive work controls keep precedence. No Engine, commands, persistence, schema,
backup, dependency, fixture, identity-asset or prototype changes. VCC-001 remains paused and is not
implemented; complete searchable launcher/Milestone 2 is deferred. BUILD OWNED composition over
existing components/commands; USE PLATFORM native dialog with explicit focus containment/return.

Evidence: 17 new real-browser console cases, including a deterministic wider-font context
control regression; console/phase/visual/motion coverage retains overflow, touch-target and
resume visibility assertions. Status context safely wraps at 320 px; touch targets stay at least
44 px. Full local regression: 208 files passed, 2,169 tests passed and one existing skip. Final
TypeScript/build, architecture, whitespace, offline and exact-head required CI results are recorded
in PR #207. Actual synthetic-fixture screenshots at 320/360/412 px,
status/evidence, logging, SYSTEM and resume are in `docs/screenshots/command-console-m1/`.
Built PWA checks cover offline save/log, cold reload, meal return, SYSTEM navigation,
water logging/undo, canonical totals and keyboard focus return.
Independent exact-head review and Gavin's final merge approval
remain required. Chromium automation is not physical-device/Safari or screen-reader testing;
memory-only meal drafts, existing undo windows and the existing bundle-size warning remain.
No merge or deployment is authorized. Next: independent review, then owner review.

## Historical objective — post-merge meal recovery focus correction

Updated 2026-10-08 by Codex. Gavin authorized a bounded accessibility follow-up to merged
PR #205. Fresh master is `22fa8c5af134088bdb0c9391914cea4282fa6a61`; open PRs #201 and
#204 are untouched. Builder: Codex; branch `codex/meal-recovery-focus`; corrective PR linked
from this branch's GitHub PR. Risk: ROUTINE accessibility repair, with independent exact-head
review explicitly requested before owner approval. BUILD OWNED: complete the existing native
focus handoff; no dependency, navigation, command, Engine, schema or persistence changes.

The delayed-read regression reproduced focus loss on master. BODY now completes the return-control
handoff after automatic recovery enables it, without stealing focus from a chosen visible control.
Deterministic gated-read tests also preserve the draft, canonical totals/history, correction access
and exactly one log. Verification: 99 browser tests passed across meal/App/BODY; both final focus
variants passed separately (21 unselected cases skipped). Architecture, TypeScript/production
build and whitespace passed. Built PWA passed offline save/log, offline cold reload, and offline
TODAY meal return with refreshed totals. Existing memory-only drafts and five-second undo remain.
Browser verification used Chromium. Required CI and exact head are recorded in the corrective PR.

Next: independent review of the exact corrective head, then Gavin's merge decision. No merge or
deployment authorized. VCC-001 remains paused. The prior milestone handoff below is historical;
its pending-merge pointers are superseded by PR #205's verified merge.

## Historical milestone 1 handoff

Updated 2026-10-08 by Codex, Lead Builder for Product Unification milestone 1.
This is a handoff, not merge authorization. Exact head and CI are recorded in the linked PR.

## Current objective — complete the meal-logging round trip

- **Authorization:** Gavin explicitly approved this bounded implementation following the Unified
  Product Blueprint. Product Unification takes priority; VCC-001 is paused, not canceled or
  superseded. No State Rail implementation or PR #204 integration is authorized.
- **Risk:** FEATURE UI handoff; conservative PROTECTED review lane because the roadmap records
  Gavin's explicit priority instruction (no workflow/authority rules changed). Independent exact-head
  review is required before merge. No primary navigation,
  doctrine, Engine, application commands, schemas, persistence, backups, dependencies or identity
  assets changed. BUILD OWNED: small React presentation state over existing canonical meal commands;
  native confirmation/focus/scroll behavior, no new infrastructure.
- **Starting state:** fresh `origin/master` = `8035dfbc0011bed03fb668e100aa8794cda4a8e7`;
  PR #203 is merged and DEV-FLOW-002 adopted. Open PRs #201 and #204 remain untouched.
- **Builder / branch:** Codex; `codex/unify-meal-round-trip`. Active PR: [#205](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/205).
- **Scope:** existing TODAY meal entry -> real BODY workflow -> explicit return with TODAY
  disclosures/position/focus retained; in-memory draft preservation; busy/discard guards; canonical
  confirmation, undo/correction and totals; near-control errors and duplicate-tap latch.
- **Exclusions:** new logger/persistence path, Engine/data/backup changes, navigation redesign,
  VCC-001, prototype changes, deployment and merges.
- **Acceptance evidence:** 115 targeted browser tests passed across seven files; follow-up
  browser/canonical nutrition/correction tests: 69 passed, one existing skip across six files
  (includes the 13 new round-trip cases again). Final repeated-return refinement: all 13
  round-trip cases pass; architecture, TypeScript/build and whitespace pass.
  Browser tests reuse installed Chromium through the existing temporary onboarding config, with
  no assertion or tracked configuration changes. Required full CI will be recorded in the PR.
- **Screenshots:** `docs/screenshots/unify-meal-round-trip/`, running app at 320/360/412 px,
  success/undo and returned TODAY; synthetic fixtures only, reduced-motion browser context.
- **Limitations:** drafts are session memory, not saved records; a supported browser warns on
  reload/close, but OS termination cannot preserve them. Existing five-second undo window is
  unchanged; later correction remains in TODAY'S MEALS. Primary tab navigation keeps its existing
  reset semantics after any needed discard confirmation. Only the existing TODAY meal entry
  gains this round trip; no new phase action is introduced.
- **Offline evidence:** built PWA passed offline preset save, canonical logging, TODAY -> BODY
  -> explicit return with updated totals, and service-worker cold reload with the meal retained.
- **Next:** confirm green required CI at the final head, obtain independent exact-head review,
  then owner review. No merge or deployment authorized. No unapproved product boundary is crossed.

## Independent review corrections — PR #205

- Owner supplied a BLOCK review of `16cff0feb46bc80b9b0e8da7e5e5dbfe6a7b7ac7`:
  P2 same-tick navigation could abandon a pending meal write; P2 post-commit read failures
  did not recover through explicit return/reopen. The reviewer reported a Forbidden review POST;
  no GitHub review existed. This handoff records the findings, not a Builder-issued review verdict.
- Fixes: synchronous BODY in-flight reporting and shell guards; synchronous existing BODY action
  guards; failed read continuations retried on reopen or through RETRY READINGS. Retry runs only
  reads, including duplicate/same-food checks, preserving drafts, confirmation and undo.
- Evidence: three new assertions fail on the blocked head. Fixed tree: 122 browser tests pass
  across seven files, plus one additional duplicate-check recovery case (21 round-trip cases total);
  immediate LOG -> all navigation paths,
  committed-preset/log recovery and explicit retry preserving another draft. Architecture,
  TypeScript/production build and whitespace pass. Built PWA offline save/log/return and cold
  reload pass again. Required CI at the new head is pending.
- The prior BLOCK is not cleared by Builder verification. Next: green exact-head CI and renewed
  independent review; owner merge approval remains required. No merge or deployment authorized.

## Historical adoption handoff

The following checkpoint is preserved as historical evidence. Its pending-adoption/merge pointers
are superseded by the verified state above.

# Current checkpoint

Updated 2026-10-08 by Codex, assigned Primary Builder for DEV-FLOW-002 only.
This is a handoff, not implementation or merge authorization. Read the approved objective brief;
verify branch/PR/head/CI from Git and GitHub rather than assuming this checkpoint is live state.

## Verified starting state

- Fresh `origin/master` and starting checkout both matched
  `9cf48c07b4b4e1ff807983dbc845d06a2de6eedb` with a clean working tree.
- PR [#200](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/200) merged at that SHA;
  both Git history and the public PR page confirm it. The former pending-review pointer is stale.
- PR [#199](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/199) remains the historical
  standalone-activation prerequisite. Its implementation and evidence are preserved.
- PR [#201](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/201) is still open on GitHub;
  this objective does not modify or close it. PR #200 already contains the AutoBackup selector repair.
- `ACTIVE_DROP.md` still records WEEKAHEAD-001 as CLOSED and is untouched historical Factory state.
  It does not assign this adoption objective or authorize VCC-001 implementation.

## DEV-FLOW-002 adoption

- **Authorization / risk:** explicit bounded owner approval, 2026-10-08; PROTECTED governance.
- **Brief:** [`DEV-FLOW-002.md`](DEV-FLOW-002.md), including scope and hard exclusions.
- **Branch:** `codex/dev-flow-002-adoption`. Exact head is derived with `git rev-parse HEAD` and
  will be bound in the PR description/review; do not use a self-referential checkpoint hash.
- **PR:** [#203](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/203),
  `DEV-FLOW-002 — Simplify BEYOND Development Workflow`; opened, not merged.
- **Done:** central workflow charter; reconciled procedural instructions; preserved historical
  Drop skill with a supersession notice; Protected governance risk guidance and 25 CLI regression
  cases; VCC-001 procedural transfer retaining all product scope, acceptance evidence, six
  screenshots, and independent exact-head review. State Rail remains unimplemented/unstarted.
- **Local verification:** 206 files passed; 2,129 tests passed, one skipped. Architecture checks,
  TypeScript/production build, syntax and whitespace checks passed. Committed-diff risk guidance
  reports PROTECTED. Consistency checks confirm unchanged product doctrine, VCC scope/invariants/
  acceptance/review, historical skill body, Factory pointer, CI workflows, and dependency files.
  Browser tests used the ignored onboarding config selecting installed `/usr/bin/chromium`;
  no tests, assertions, or tracked browser configuration were bypassed or weakened.
- **Remaining:** confirm exact-head required PR Verification, obtain independent Protected review,
  and wait for Gavin's merge approval. No PR merge is authorized in this session.
- **Environment:** initial GitHub API requests were denied by the egress policy. Added only
  `api.github.com` to the cloud environment draft, preserving presets and setup instructions.
  PR creation and subsequent read-only API checks now succeed using the existing binding; no
  new token was requested. Draft publication is not claimed.
- **Next action:** inspect required CI on the final PR head, then assign an independent Protected
  Reviewer to that exact head and resolve any findings. Wait for Gavin's explicit merge approval.
  Do not modify PR #201, start VCC-001, activate Factory Phase 2, or integrate anything.
- **Authority conflicts:** none unresolved within the approved adoption scope. Historical procedure
  is explicitly superseded for new work only after this adoption merges with owner approval.

## DECISIONS FOR GAVIN

None. Independent Protected review and owner merge approval remain separate steps.
