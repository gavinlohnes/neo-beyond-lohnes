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

Health Connect → App permissions → Garmin Connect on Gavin's phone shows these write categories:

| Category | Selected |
|---|---|
| Activity | 8 of 8 |
| Body measurements | 2 of 2 |
| Sleep | 1 of 1 |
| Vitals | 2 of 2 |

The data types inside each category were not expanded. Steps sits under Activity and heart rate
under Vitals. Resting heart rate is read only if Garmin writes it.

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

## PR 2 — BEYOND side (after REDESIGN-001 / #261 merges)

Both PR 2 and #261 rework BODY, so PR 2 waits for that merge.

- Preview, confirm and import the activity file as measured evidence: additive storage, with
  revisions handled like GARMIN-001.
- SEND TO BEYOND: a PWA share target, so the helper hands files to the installed PWA directly.
- BODY shows measured sleep, steps and heart rate labelled as measured, with manual logs
  unchanged.
- No Engine input.

Leverage: INTEGRATE PROVIDER. This uses the official Health Connect aggregate API rather than raw
heart-rate samples, which keeps the file small, and adds no new dependency.
