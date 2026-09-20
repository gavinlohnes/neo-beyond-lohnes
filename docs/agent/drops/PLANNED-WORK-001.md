---
id: PLANNED-WORK-001
baseline: ae25528de0a0622a74b802ecf63f49c6982256b4
risk_tier: ARCHITECTURAL
---

# PLANNED-WORK-001 // EXPLICIT PLANNED WORK

## Mission

Fix `application/commands.ts`'s `hasPlannedWork: false` hardcoding — discovered during
FOUNDATION-1B, explicitly excluded from that Drop, and sequenced here as its own bounded
follow-up. `EXECUTE_PLANNED_WORK` is currently unreachable via the real `submitCheckIn` path
because nothing ever supplies a real value for this Engine input. Deliver a real, explicit
signal per direct owner ruling (this session, 2026-09-20): `hasPlannedWork` must represent
work the operator has explicitly chosen/planned, never work inferred merely because a
rotation, schedule, or available activity exists, and GREEN capacity must never itself imply
planned work. TRAIN is the first (and, for this Drop, only) supported source, with the
domain/application boundary shaped so the concept can generalize to other activity kinds
later without redefining `evaluate.ts`'s own semantics.

## Approved baseline

`origin/master` at `ae25528de0a0622a74b802ecf63f49c6982256b4`, verified via
`git fetch origin master && git rev-parse origin/master` on 2026-09-20 (FOUNDATION-1B's
closure commit).

## Risk classification

ARCHITECTURAL. Triggers: a new `DomainEventType`/payload in `src/domain/common/types.ts`
(canonical domain semantic addition), and a command/event-semantic change per
`docs/agent/BEYOND_ENGINEERING_CONTRACT.md`'s escalate list (`application/commands.ts` now
computes a real, non-constant value for an existing Engine input). Explicitly NOT High-Risk:
no persistence schema/migration (the `events` table already indexes generically by
`beyondDayId`/`type` — confirmed via `persistence/db.ts`; a new `DomainEventType` member needs
no new Dexie index or `.version()` bump), no backup/restore contract change, no correction-model
change, no new dependency. `evaluate.ts` itself is unchanged — same pattern
INTENT-ARBITRATION-001 already established: the application layer decides the boolean, the
Engine only ever sees it.

## Authorized scope

- Add `PLANNED_WORK_SET` to `DomainEventType` and its payload
  (`{ commandId, planned: boolean, kind: "WORKOUT" }`) in `src/domain/common/types.ts`. `kind`
  is a real union (not a bare boolean-only shape) specifically so a later Drop can widen it to
  a second activity kind without changing this event's shape or any consumer's read logic —
  the one deliberate piece of forward-shaped boundary the owner ruling asked for. No second
  kind is added now.
- New command in `application/commands.ts`: `setPlannedWork(beyondDayId, planned, kind)` —
  explicit, operator-initiated only, same "the ONLY way this changes" doctrine as
  `setWorkContext`.
- New query: `hasActivePlannedWork(beyondDayId): Promise<boolean>` — true only when the most
  recent `PLANNED_WORK_SET` event for the day says `planned: true` AND no rotation-advancing
  `WORKOUT_COMPLETED`/`WORKOUT_ABANDONED` event for that day is later than it (a fulfilled or
  abandoned plan stops being "active," reusing existing TRAIN completion facts rather than a
  new "satisfied" event).
- Replace `application/commands.ts`'s `hasPlannedWork: false` with
  `await hasActivePlannedWork(beyondDayId)` in `submitCheckIn`.
- One explicit UI affordance (TODAY, alongside the existing `WorkContextCard` pattern) letting
  the operator declare/clear "planning to train today" — same YES/NO chip pattern
  `WorkContextCard.tsx` already uses for `setWorkContext`, same immediate-write-no-hidden-state
  discipline.
- Tests: unit coverage for `hasActivePlannedWork`'s resolution logic, and an integration test
  proving `EXECUTE_PLANNED_WORK` is now genuinely reachable end-to-end through `submitCheckIn`
  when (and only when) the operator explicitly declared it, GREEN capacity alone still doesn't
  imply it, and STABILIZE/POST_SHIFT_TRANSITION/RECOVER still outrank it unchanged.
- A `docs/UX_DECISIONS.md` entry recording this as the closure of the gap FOUNDATION-1B's
  section named, citing this Drop.

## Explicit exclusions

- No change to `evaluate.ts`'s `RecommendationKind` set, ranking, or trace shape.
- No inferred/derived planned-work source (rotation, schedule, capacity, time-of-day) — explicit
  operator declaration only, per the owner ruling.
- No second `kind` value (e.g. a non-workout planned activity) — the union is shaped to allow
  one later, not populated now.
- No change to TRAIN's A/B/C rotation logic, `suggestTemplateForNextWorkout`, or progression.
- No persistence schema/migration, backup/restore contract, or dependency change.
- No gamification: no streak, badge, or completion-pressure copy on the new toggle.

## Relevant authority / references

- Direct owner ruling (this session, 2026-09-20): Option B (explicit operator intent), TRAIN as
  first source, boundary shaped for later generalization, GREEN capacity must not itself imply
  planned work, USER_DECIDES remains authoritative.
- `docs/agent/drops/FOUNDATION-1B.md` and its PR #108 — where this gap was discovered and
  explicitly deferred.
- `docs/UX_DECISIONS.md`'s `WORK SCHEDULE / CONTEXT` entry and `setWorkContext`'s own doc
  comment — the direct precedent this Drop's command/event shape and UI pattern follow.
- `docs/agent/BEYOND_ENGINEERING_CONTRACT.md`'s escalate list (command/event semantic changes).

## Required invariants

- `PLANNED_WORK_SET` is the only way `hasActivePlannedWork` can ever return true — no other
  event type, capacity value, schedule phase, or rotation state contributes to it.
- `evaluate.ts` remains unchanged: same kind set, same ranking, same purity (no new import).
- GREEN capacity with no explicit declaration still resolves `hasPlannedWork: false` — Scenario
  A from FOUNDATION-1B (`NO_ACTION_REQUIRED` on GREEN with nothing else pending) stays reachable
  and unchanged.
- STABILIZE, POST_SHIFT_TRANSITION, and RECOVER still outrank `EXECUTE_PLANNED_WORK` exactly as
  locked — this Drop only makes the existing bottom-of-GREEN-stack kind reachable, it does not
  reorder anything.
- Declaring planned work is reversible (explicit "NO"/clear) and never blocks or degrades any
  other flow — `MANUAL_INPUT_ALWAYS_AVAILABLE`/`AI_CANNOT_SILENTLY_CHANGE_PLANS` hold.
- Existing full test suite stays green — nothing here weakens prior Drop behavior, including
  FOUNDATION-1B's own `foundationContinuity.test.ts` (which never declares planned work, so its
  scenarios must resolve identically to before).

## Acceptance criteria

- `tests/engine` or `tests/application` unit coverage proves `hasActivePlannedWork`'s three
  states (never declared -> false; declared and not yet fulfilled -> true; declared and later
  fulfilled/abandoned -> false) deterministically.
- An integration test proves: GREEN capacity + no declaration -> `NO_ACTION_REQUIRED`; GREEN +
  explicit declaration -> `EXECUTE_PLANNED_WORK`; RED capacity + explicit declaration ->
  `STABILIZE` still wins.
- `npm run verify` passes (architecture, full suite, production build).
- `npm run check:risk ae25528de0a0622a74b802ecf63f49c6982256b4` confirms the diff stays inside
  the Engine/domain/application/UI/docs buckets this contract declares.

## Required verification

Standard Architectural gate per `.claude/skills/beyond-drop/SKILL.md` §3: `npm run verify`
(`check:architecture && vitest run && npm run build`), plus `git diff --check` and
`npm run check:risk ae25528de0a0622a74b802ecf63f49c6982256b4`.

## Builder expectations

- Work only on `claude/planned-work-001-explicit-intent`, cut from the exact baseline above.
- Implement exactly the authorized scope; treat any temptation toward an inferred/derived
  planned-work signal as a STOP condition already resolved against, not a judgment call.
- Run the required verification, commit, push, open a PR, and stop — do not merge, do not open
  a further Drop.

## Reviewer expectations

- A separate session reviews this contract plus the final diff.
- Checks `evaluate.ts` is untouched, `hasActivePlannedWork` never derives true from anything but
  an explicit `PLANNED_WORK_SET` event, and the full existing suite (including
  FOUNDATION-1B's `foundationContinuity.test.ts`) still passes unchanged.
- Persists exact-head-bound review evidence; never merges or expands scope unilaterally.

## Integrator expectations

- A separate, explicitly authorized session merges only an approved, green PR.
- No admin-bypass of any required check.
- After merge, close PLANNED-WORK-001 via `node scripts/factory-drop.mjs close PLANNED-WORK-001
  --integration-sha <merge-commit-sha>`; this contract file is never rewritten by closure.

## Stop / escalation conditions

- Any temptation to infer `hasPlannedWork` from rotation, schedule, capacity, or time rather
  than an explicit operator declaration — already resolved against; a genuine new need here
  stops and returns to the owner rather than being treated as in-scope.
- Any temptation to add a second `kind` value now rather than shaping the union for one later.
- `origin/master` differs from the approved baseline at any point verification is re-run.
- Another Drop becomes ACTIVE concurrently.
