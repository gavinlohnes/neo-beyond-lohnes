# GARMIN-003 — Garmin fills in your record

Authorization: Gavin approved this scope and its decisions on 2026-10-22, after reviewing it
first ("I want to review the scope of option 3 before you just do it"). He approved approach A
and "start now" for the parts that don't touch REDESIGN-001's screens. Rulings are in
[UX_DECISIONS → GARMIN-003](../UX_DECISIONS.md).

Builder: Claude Code. Lane: PROTECTED. It covers new health permissions, a change to what a
sleep log can be, and later the Engine's use of measured data. Each PR gets an independent
exact-head review and the owner's merge.

## PR 1 — history

- Helper: optional `READ_HEALTH_DATA_HISTORY` ("Access past data") and **READ FULL HISTORY**.
  - It reads everything Health Connect has from Garmin, up to 366 days, in 30-day queries.
  - It covers sleep, hourly steps and heart rate, and resting heart rate.
  - The 7-day **ALLOW ACCESS AND READ** stays the daily path.
- Both file formats keep schema version 1, with larger limits: a window of up to 366 days, an
  8 MiB file, 8,784 hours, 2,000 sleep sessions with 60,000 stages, and 1,000 resting readings.
  The helper writes compact JSON.
- BEYOND's validation, size checks and the SEND TO BEYOND handler accept the same limits.
- Nothing else changes: same preview, confirm, and storage semantics.

## PR 2 — Garmin sleep becomes a sleep entry, plus baselines

Baselines are folded into this PR to save a review round. They have no consumer yet.

**Sleep entries**
- **Where:** `applyGarminSleep` runs inside the confirmed sleep import's transaction. It is
  idempotent and reconciles every stored Garmin sleep.
- **Day assignment:** `assignGarminSleep` (pure) uses the lived day the sleep starts in, capped at 24
  hours.
  - The longest sleep in that day is PRIMARY; the rest are SUPPLEMENTAL.
  - Minutes are the asleep total when the stages are complete, otherwise the session span.
  - Sessions under 10 minutes and sleep with no day stay as evidence only.
- **New entry:** a `SLEEP_LOGGED` with event source `SYSTEM`, payload
  `source: { kind: "GARMIN", recordKey, sourceVersion }`, `occurredAt` at wake time (the Garmin end
  time).
  - Skipped if the owner has an active entry of that kind on that day.
- **Updates:** while the owner hasn't touched the entry, a newer Garmin value becomes a `SYSTEM`
  `SLEEP_LOG_CORRECTED`. A change between main sleep and nap voids the entry and logs it again.
- **The owner wins:**
  - An entry the owner corrected is never overwritten.
  - An entry that was deleted or replaced is never added again.
  - `logSleep` voids active Garmin entries of the same kind on that day, atomically, with the
    owner's entry as the cause.
- **Labels:** BODY's sleep list, the MAIN SLEEP tile and History label Garmin-filled entries. The
  import confirmation says what Garmin filled in.

**Baselines**
- `personalBaselines` (pure) gives rolling 28-day medians by lived period.
- The measures are: the longest sleep per period, the lowest resting heart rate per period, and
  steps per finished lived day, split work vs off.
- A baseline needs at least 14 samples; until then it is `null` with its sample count.

## Later, after #261 merges and with wording shown to Gavin first

- Tiles and TODAY show measured values labelled Garmin.
- Advice uses baselines under the rulings: soften only, and the check-in wins.

Exclusions: medical claims, HRV/stress (not shared by Garmin), background sync, notifications,
and weight unless Gavin uses a Garmin scale.
