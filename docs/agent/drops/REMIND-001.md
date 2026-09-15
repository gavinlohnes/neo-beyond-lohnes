---
id: REMIND-001
baseline: 4edb35f902d4d408b5fb4a2f981e19f34d8f9301
risk_tier: ARCHITECTURAL
---

# REMIND-001 // On-device check-in reminder notification

## Mission

BEYOND has been purely pull-based since inception: nothing ever reaches out to the operator,
they must remember to open the app. This Drop adds a genuinely new, opt-in capability — an
on-device Web Notification reminding the operator to check in, checked once whenever the app is
next opened after a chosen local hour, if today's check-in hasn't happened yet. Directly
authorized by the owner tonight as item 2 of a four-item execution list ("Add an on-device-only
daily reminder notification (Web Notifications API, no backend, opt-in) so BEYOND can nudge a
check-in instead of being purely pull-based"), itself following an explicit "brutally honest" gap
assessment naming this as a real weakness: "for a system whose whole pitch is 'know you well, ask
little of you,' an app that's totally silent unless you go looking for it is fighting its own
premise."

## Approved baseline

`origin/master` at `4edb35f902d4d408b5fb4a2f981e19f34d8f9301`, verified via
`git fetch origin master && git rev-parse origin/master` — TRAIN-PROGRESSION-001's own closure
commit. This Drop's branch was originally cut from JOURNAL-001's closure commit
(`916f3a9d9cf701d1e184c03ae5ae0607af4fe473`) before TRAIN-PROGRESSION-001 merged/closed the same
night; `origin/master` was merged into this branch (a clean, non-conflicting merge — disjoint
files) and this baseline updated to match before activation, rather than assuming the original
SHA still held.

## Risk classification

ARCHITECTURAL. Not because it touches `src/engine/**`/`src/domain/**` in any meaningful-semantic
sense (the new `engine/checkInReminder.ts` is a small, isolated, zero-cross-import pure function,
not a change to any existing Engine module) — but because this is a genuinely new, first-of-its-
kind user-facing capability: the first time this app has ever requested a browser permission, the
first time it has ever used the Notification API, and a real new interaction pattern (an OS-level
notification, distinct from every existing "in-app banner" nudge like the backup reminder).
`docs/agent/CAPABILITY_MAP.md`'s own GENERAL DEPENDENCY/TEST TOOLING entry already flagged this
exact boundary: "Local, on-device-only notifications (Web Notifications API, no server) are
architecturally possible and not doctrine-blocked, but would be new territory — no existing code
path uses them today." This Drop is that new territory, done deliberately and narrowly.

Not HIGH-RISK: no persistence schema/migration (this is localStorage, mirroring backup.ts's own
last-backup-timestamp bookkeeping, not a new Dexie table/version), no backup/restore contract
change, no correction-model change, no protected fixture, no new npm dependency (the Notification
API is browser-native).

## Authorized scope

- New `src/persistence/checkInReminder.ts`: localStorage-backed preference (`{enabled,
  reminderHour}`) and last-sent-date bookkeeping, mirroring `backup.ts`'s/`outcomeDismissals.ts`'s
  existing "operational bookkeeping, not domain history, lives in persistence/* as localStorage"
  pattern. The actual `Notification`/`Notification.requestPermission()` calls live here too,
  mirroring `backup.ts`'s own `shareBackup` calling `navigator.share` directly from this layer —
  a real precedent for "a browser-API side effect for an operational concern lives in
  persistence/*, not application/* or ui/*."
- New `src/engine/checkInReminder.ts`: `shouldSendCheckInReminder(now, enabled, reminderHour,
  lastReminderSentDate, hasCheckedInToday): boolean` — pure, deterministic, zero I/O, plain
  primitives only (no shared type imported from persistence/*, per `.claude/rules/engine.md`).
- New `src/application/checkInReminderQueries.ts`: the one seam that combines "read real Dexie
  state" (via existing `getActiveDay`/`getLatestCheckIn`) with "read preference/history" (via the
  persistence functions) with "decide" (the engine function) with "act" (persistence's send
  function) — `maybeSendCheckInReminder(now?): Promise<boolean>`. Also re-exports the preference
  getter/setter/permission-request wrapper, since neither `MoreScreen.tsx` nor `App.tsx` may gain
  a new direct `persistence/*` import (`scripts/check-architecture-boundaries.mjs`'s
  `UI_PERSISTENCE_ALLOWLIST` explicitly reserves further NEW persistence imports on the two
  already-grandfathered UI files for a deliberate future review, not this Drop).
- `src/app/App.tsx`: one new root-level `useEffect` on mount calling `maybeSendCheckInReminder()`,
  fire-and-forget, matching the existing continuity-restoration effect's own shape.
- `src/ui/screens/more/MoreScreen.tsx`: a new "Reminders" section (opt-in toggle + hour picker),
  reachable from the existing MENU view, no new sub-screen. New co-located
  `src/ui/screens/more/moreCopy.ts` (`formatReminderHour`), matching every other screen's
  `*Copy.ts` pure-copy-helper convention.
- Tests: `tests/engine/checkInReminder.test.ts`, `tests/persistence/checkInReminder.test.ts`,
  `tests/integration/checkInReminder.test.ts`, `tests/ui/moreCopy.test.ts` (all new), plus new
  cases in `tests/browser/MoreScreen.test.tsx`.

## Explicit exclusions

- No push notification, no Push API subscription, no server/backend of any kind. This stays
  strictly on-device — the reminder only ever fires from a live check when the app happens to be
  open, never while fully closed. This is a deliberate, honest limitation, not an oversight, and
  is documented as such in `persistence/checkInReminder.ts`'s own doc comment and in the MORE UI
  copy itself ("Checked the next time you open BEYOND after your chosen hour").
- No Periodic Background Sync, no Service Worker `notificationclick`/focus-client wiring, no
  interval re-check while the app stays open across the threshold hour. A minimal, honestly-scoped
  v1 — richer delivery/click behavior is a natural, separate future Drop, not required here.
- No change to any existing screen's primary recommendation surface, Engine arbitration, or
  `AdvisoryNote` composition — this capability is unrelated to and does not touch either.
- No default-on behavior anywhere — `enabled: false` is the only possible default, and turning it
  on always requires the operator's own explicit tap plus a real, user-initiated permission grant.
- No new persistence import added to `MoreScreen.tsx`/`TodayScreen.tsx`'s existing grandfathered
  allowlist entries — this capability's UI goes through the new `application/*` seam instead.

## Relevant authority / references

- Direct owner authorization tonight: approval of a four-item execution list with this as item 2,
  following an explicit "brutally honest" product-gap assessment in this conversation.
- `docs/agent/CAPABILITY_MAP.md`'s GENERAL DEPENDENCY/TEST TOOLING entry: local on-device
  notifications explicitly named as "not doctrine-blocked... would be new territory."
- `src/persistence/backup.ts`'s own doc comment (backup-reminder, locked 2026-08-19): rejects
  *push* notification specifically "since BEYOND has no backend to support one without
  contradicting local-first doctrine" — that reasoning is about server-triggered push; this Drop's
  local, client-scheduled Notification needs no push service and does not conflict with it.
- `scripts/check-architecture-boundaries.mjs`'s `UI_PERSISTENCE_ALLOWLIST` doc comment: the two
  existing grandfathered UI files "may not gain further NEW persistence imports... without
  deliberately re-reviewing this list" — respected by routing this Drop's UI through
  `application/checkInReminderQueries.ts` instead.

## Required invariants

- `shouldSendCheckInReminder` stays pure/deterministic/zero-I/O — no import from `application/*`
  or `persistence/*`.
- No `ui/**` file gains a new direct `persistence/**` import.
- The reminder preference defaults to `enabled: false` and can only become `true` via an explicit
  operator action that itself required a real permission grant.
- `sendCheckInReminderNotification` never itself prompts for permission — only
  `requestCheckInNotificationPermission`, called only from the opt-in UI action, does.
- At most one notification per calendar day, enforced by the last-sent-date bookkeeping.

## Acceptance criteria

- `npx tsc -b` passes with zero errors.
- `npm run check:architecture` passes (no new `ui/**` → `persistence/**` import).
- `npx vitest run --project node` passes, including all new test files.
- `npx vitest run --project browser` passes, including new `MoreScreen.test.tsx` cases proving
  the toggle, hour change, and permission-denied path all work in a real rendered browser.
- `npm run build` succeeds.
- `maybeSendCheckInReminder` sends at most one notification per calendar day even across repeated
  calls, sends nothing when the preference is disabled (the default), sends nothing once today's
  check-in exists, and sends nothing before the chosen hour — all proven by
  `tests/integration/checkInReminder.test.ts` against real Dexie state (fake-indexeddb).

## Required verification

Standard gate per `.claude/skills/beyond-drop/SKILL.md` §3: `npm run verify`
(`check:architecture && vitest run && build`). No additional High-Risk compatibility surface
applies.

## Builder expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — isolated worktree/branch from the
exact baseline above, implement only the authorized scope, run required verification, open PR
and stop, persist a Builder handoff on the PR.

## Reviewer expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — a separate session reviewing from
this contract and the final diff only, adversarial by default, every finding evidence-backed and
tagged CONFIRMED/PLAUSIBLE, persist exact-head-bound review evidence as a durable PR comment or
review, never merge or self-authorize a scope change.

## Integrator expectations

Per `.claude/skills/beyond-drop/SKILL.md`'s standard template — merges only an approved, reviewed,
green PR; no admin-bypass; closes `ACTIVE_DROP.md` via
`node scripts/factory-drop.mjs close REMIND-001 --integration-sha <merge-sha>` after merge.

## Stop / escalation conditions

- Any temptation to make the reminder default-on, to add a real push subscription, or to have it
  influence Engine arbitration/Recommendation selection in any way — stop and escalate.
- Any discovery that `Notification`/permission behavior differs meaningfully across the real
  target platform (phone-first, per CLAUDE.md) in a way that changes this Drop's safety
  assumptions (e.g. permission silently auto-denying without the operator ever seeing a real
  prompt) — stop and report rather than ship a silently-broken toggle.
