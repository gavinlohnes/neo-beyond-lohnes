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

## PR 2 — Garmin sleep becomes a sleep entry (approach A)

- On a confirmed import, each Garmin sleep is assigned to the existing lived day it starts in
  (day start ≤ sleep start < next day start, within 24 hours).
  - The longest in that day is PRIMARY; others are SUPPLEMENTAL.
  - A new `SLEEP_LOGGED` entry carries `source: { kind: "GARMIN", recordKey }`.
- Skipped when the day already has a manual entry of that kind, or when no lived day contains it.
- A manual sleep log voids Garmin entries of the same kind on that day, so the owner's entry wins.
- A newer Garmin version corrects the entry (`SLEEP_LOG_CORRECTED`), unless the owner has
  corrected it.
- Closed-day writes follow the existing correction rules in BEYOND_ENGINEERING_CONTRACT. Any
  conflict with them is surfaced before building.

## PR 3 — baselines

- A pure domain function gives personal rolling 28-day medians from measured data: main sleep,
  resting heart rate, and steps on work vs off days.
- A minimum of 14 days of data is needed; otherwise "not enough data".
- No consumer in this PR.

## Later, after #261 merges and with wording shown to Gavin first

- Tiles and TODAY show measured values labelled Garmin.
- Advice uses baselines under the rulings: soften only, and the check-in wins.

Exclusions: medical claims, HRV/stress (not shared by Garmin), background sync, notifications,
and weight unless Gavin uses a Garmin scale.
