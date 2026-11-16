# FOLLOWUPS-001 — BRIDGE-NOTIFY-001 review follow-ups

- **Objective / authorization:** Gavin, 2026-11-15, approved the overnight plan ("Approved"), whose wave 2 item 6 is
  one small PR of follow-up fixes from posted independent reviews. This PR carries the BRIDGE-NOTIFY-001 notes N1, N2
  and N4 from the PASS review of [#554](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/554) at `c75a9d5a`.
  The SLEEP-DEBT-LEARNED-001 nap-only-day fix was left out: #555 was still open when this started, and this work does
  not stack on its branch. It follows once #555 merges.
- **Starting commit:** `4d74ac26` (fetched `origin/master`, #554 merged). Builder Grok Bot, branch
  `codex/followups-001`.
- **Lane:** PROTECTED, inherited from BRIDGE-NOTIFY-001 (notification behaviour; the persisted alert settings). No
  new alert kind, no Engine change, no schema change, no permission or dependency change.

## Scope

- **N1, one-time duplicate after upgrading from 0.11.0.** When no shown set was ever stored, the Bridge seeds it with
  every moment of the stored plan already due within the 2 h grace (`seedShown`), so a moment 0.11.0 showed is not
  shown again. Fresh installs have no plan yet and seed nothing; BEYOND only sends future moments.
- **N2, very late deliveries.** The show step (`MomentAlerts.notify`) applies the same window as the re-arm
  (`shouldShow`): an alarm delivered `GRACE_MS` or more after its moment is dropped and the window rolls on. This makes
  the README and the `GRACE_MS` KDoc true.
- **N4, save rollback.** Each settings change is a "set" (this kind off/on, quiet hours on/off, a time), applied when
  its save runs to what is stored rather than to the screen's optimistic value. A failed save is dropped on its own:
  changes queued behind it still save without it, and the screen returns to what is stored plus those queued changes.
  Saves stay serialized.
- Health Bridge **0.11.2** (versionCode 14).

## Not changed

N3 (Doze holding an alarm past the grace window on API 28–30) is unchanged: it needs exact alarms or a new permission,
which is out of scope. UX_DECISIONS is unchanged; no decision changes.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** BRIDGE-NOTIFY-001's `GRACE_MS`, shown set, `toArm`/`rearm` and the serialized save queue.
- **OWN:** the upgrade seed, the show-step grace check, set-style changes with a correct rollback.
- **BUILD FROM SCRATCH:** none.

## Acceptance evidence

- Android `MomentsTest`: `anAlarmDeliveredPastTheGraceWindowIsNotShown` (N2) and
  `theFirstRunAfterUpgradingFrom0110TreatsDueMomentsAsShown` (N1); CI's android job is authoritative.
- Browser `WorkScheduleScreen.test.tsx`: a failed save is not re-applied by a change queued behind it (fails on the old
  code), and off-then-on with the first save failing ends on.
- Local `TZ=UTC npm run verify`; PR CI; independent exact-head review; Gavin merges.
- Device: install the 0.11.2 Bridge over 0.11.1 and tap SYNC GARMIN once; alerts keep coming, none twice.
