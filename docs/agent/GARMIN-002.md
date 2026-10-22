# GARMIN-002 — Garmin health data expansion

Authorization: on 2026-10-22 Gavin approved the proposed GARMIN-002 scope ("Sounds good"). That
scope: confirm what Garmin shares, add steps and heart rate to the helper (read-only), add a
SEND TO BEYOND hand-off, and store the new data as measured evidence separate from manual logs,
with no Engine use. Out of scope: background sync, write-back, accounts, servers and
recommendation changes.

Builder: Claude Code. Lane: PROTECTED (new health permissions and a new interchange format).
Starting master: 9f0f2c23efadb7925051172e5eeac48f5882f70f. Branch: `ccr-83cf6ed8-ug1ym9`.

Ruling recorded with the approval: Garmin data is **measured** evidence. It never silently
becomes a manual log. BEYOND keeps measured, reported, interpreted and recommended information
distinct.

## Device observation (2026-10-22)

Health Connect → App permissions → Garmin Connect on Gavin's phone. Garmin is allowed to write,
and all of these are switched on:

| Category | Data types |
|---|---|
| Activity | Active calories burned, Distance, Elevation gained, Exercise, Floors climbed, Speed, Steps, Total calories burned |
| Body measurements | Body fat, Weight |
| Sleep | Sleep |
| Vitals | Heart rate, Resting heart rate |

PR 1 reads Steps, Heart rate and Resting heart rate, all of which are confirmed. The remaining
types are candidates for later, separately approved scope. Weight overlaps BEYOND's manual
weigh-ins and needs the measured-vs-reported rule before any import.

## PR 1 — helper reads steps and heart rate (this PR)

- Optional read permissions: `READ_STEPS`, `READ_HEART_RATE`, `READ_RESTING_HEART_RATE`. Sleep
  still works if they are declined.
- New file format `BEYOND_HEALTH_CONNECT_ACTIVITY` v1, saved separately so the sleep format and
  BEYOND's strict sleep importer are unchanged. It holds the last 7 days of Garmin-origin data:
  - hourly step totals
  - hourly heart-rate low, average and high (Health Connect aggregates)
  - Garmin resting heart rate records with their IDs and modification times
- Data is hourly rather than daily, so BEYOND can total lived days (16:30–16:30) without the
  helper guessing day boundaries. Missing measurements stay null and never become zero.
- No Internet permission, writes, background work or other categories. CI asserts the exact
  packaged permission set.

## PR 2 — BEYOND imports and shows steps and heart rate (same PR, #262)

The owner asked for this to land now ("Let's just get it done"), so it shares #262 instead of
waiting for #261. The only overlap with #261 is one line in BODY.

- COMMAND → IMPORT HEALTH DATA accepts either helper file and previews before anything is saved.
- Additive database v15 adds `externalActivityHours` (keyed by UTC hour start) and
  `externalRestingHeartRates`.
  - Hours are Health Connect aggregates, so a newer export replaces the same hour; older or
    repeated exports are skipped.
  - Resting heart rate keeps the newest source version per record.
  - There are no canonical events, manual-log changes, day creation or Engine input.
- BODY shows **MEASURED · GARMIN**: steps, heart-rate range and average, and resting heart rate
  per existing lived day. A day runs from its 16:30 start to the next day's start, so a night
  shift is never split at midnight. Missing values stay missing.
- Native backups include the new tables. Legacy and pre-feature native replacements clear them.
- Review follow-ups in the helper:
  - The steps and heart-rate file is re-checked against the permissions it was read with
    before saving.
  - The privacy text lists resting heart-rate IDs, source, modification times and offsets.
  - A single implausible value is dropped instead of failing the whole file.

Deferred: **SEND TO BEYOND**. A PWA share target that receives files needs a custom service
worker, which is a larger change to the app's offline update path. It needs its own step.

Leverage: INTEGRATE PROVIDER. This uses the official Health Connect aggregate API rather than raw
heart-rate samples, which keeps the file small, and adds no new dependency.
