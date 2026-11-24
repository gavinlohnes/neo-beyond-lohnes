# GRAYSON-WINDOW-ALERT-001 — one alert when your eating window opens

- **Date:** 2026-11-24. **Authority:** Gavin, on the five logging ideas ("I don't want it to be annoying and pester
  me. Start implementing now."; fasting "adjustable and smart... I want to understand what I'm doing and why").
  Brief: `docs/agent/GRAYSON-WINDOW-ALERT-001.md`.
- **Kind:** `WINDOW_OPEN` (11 characters; Health Bridge `Moments.kt` keeps any kind up to 20 and any `go` starting
  with "?", so no APK change). Title "Eating window open"; text "Your window is open until 12:00 AM. Tap to tell Delta
  your first meal." (close = opening + eating hours); tap opens BEYOND on `?alfred=meal`, which opens Delta with
  "I ate " and sends nothing, then clears the query.
- **When:** only while the Eating Window is on. One moment per lived day in the 28-day plan, at
  `plannedOpening(livedStart, opensAt[kind])`; the kind comes from the saved rotation and his confirmed schedule changes
  through `lifeStateInput` / `deriveLifeState` / `dayKindFor` (WORK_RUN → WORK, RECOVERY, FREE or FLIP → OFF). A day
  whose kind can't be named (no saved schedule) gets none.
- **Contract, unchanged:** its own switch ("Eating window opens", default on), quiet hours, the on-the-clock drop and
  `MAX_PER_DAY = 3`. **Lowest priority:** `KIND_PRIORITY` ends with `WINDOW_OPEN`, so it never pushes out an alert he
  already gets; on a work day that already has BEFORE_SHIFT, SHIFT_DONE and the next WAKE it waits (TODAY's Eating
  Window card and the logging nudge still cover it). On his rotation, days off and recovery days have room, so it does
  fire (tested on the default 2-2-3 rotation; his own saved pattern was not inspected).
- **Skips and marks:** the plan is built only at SYNC GARMIN (`MeasuredSheet`), not on TODAY's refresh, so a SKIP
  TODAY, an early OPENED mark or a changed opening time reaches the phone only at the next sync. Left as the brief's
  fallback; no moment is dropped for a skipped or opened day.
- **Validation note:** `WINDOW_OPEN` was added to the allowed `off` kinds in `persistence/keyMomentAlertsValidation.ts`
  (the brief named `keyMomentAlerts.ts`; the validation lives here). An older BEYOND build reading a schedule row whose
  `off` list includes `WINDOW_OPEN` falls back to its defaults (every kind on, no quiet hours) for alert settings only.
- **Benchmarks (read 2026-11-24):** Yazio "Your fasting period starts"/"ends" reminders
  ([Yazio help](https://help.yazio.com/hc/en-us/articles/4406890595601-Set-Up-Reminders-in-Yazio)); Simple's "Exactly on
  time" alert when the fast ends, with Do Not Disturb
  ([Simple help](https://simplefastingapp.zendesk.com/hc/en-us/articles/4408491733521-How-to-configure-your-notifications)).
- **Not editable yet:** a heads-up before the window, a "window closes" alert.
