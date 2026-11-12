# BIG-IDEAS-001 — the next big round (Gavin: "Everything but 4", 2026-11-09)

- **Authorization:** Gavin picked items **1, 2, 3, 5, 6, 7, 8** (everything but voice capture). By picking them he
  approved the ones marked Protected: **3** (timing guidance), **7** (new on-device model dependency) and **8**
  (sharing data outward). Each still follows the house rules: counts on every line, patterns not causes, nothing
  saves without a tap, and nothing changes Engine advice unless a slice says so and Gavin re-confirms. One PR per
  slice; independent exact-head review; green CI. Builder: Claude Code.

## Build order and design notes (Gavin's numbers)
1. **Shift what-if** (routine). Ask: "What if I pick up <day>?" Find past runs with the same shape (run length after
   adding the shift; next days off) using ROTATION-001 `groupRuns` / `runPositions`. Report what followed at each
   position: sleep, energy, training, and days until sleep was back in the usual range (personal baselines).
   Counts; "N similar runs"; silent under 3. Entry points: DELTA's view, plus the free helper ("what if I work…").
   **Superseded by Gavin's objective (2026-11-11, "Implement Shift What-If"):** on a Week Ahead day, ask "what if
   this day were a shift / a day off?" and see the change to the recovery window (days off), the next sleep
   opportunity (off-duty window), Week Ahead's workout suggestions and that day's commitments, plus past runs of
   the new length (`shiftWhatIf`). Read only; no schedule change; no new AI behavior, so no free-helper entry.
   Excludes circadian/light advice, schema changes and other items.
2. **Week energy forecast** (routine reading). For the next 7 days (`getWeekAhead`): the expected place in the run,
   plus sleep owed (`getSleepDebt`), mapped to that position's past energy and sleep means (`runPositions`). Label
   each day "forecast from your history", and name the lowest and best days. Never an Engine input.
   **Gavin's objective (2026-11-11, "Implement Week Energy Forecast"):** in Week Ahead, each day's place in the
   scheduled run with the energy and main sleep recorded there in past runs of the same length (any length when
   those give under 3 days, labelled), lowest and best days, and sleep owed. Read only; no schema; no new AI.
3. **Circadian plan** (🔒 approved). Cards for light, caffeine cutoff and nap windows, from SLEEP-RHYTHM-001's
   measured windows and the shift times. Rules must cite standard shift-work sleep guidance (for example a caffeine
   cutoff about 6 h before the usual sleep start; a pre-shift nap window). Save/skip cards only. Advice stays
   separate from the Engine. **Research first:** confirm the sources in the PR.
   **Research done and approved (Gavin, 2026-11-11, "Approved"):** [CIRCADIAN-SPIKE-001.md](CIRCADIAN-SPIKE-001.md).
   The first slice is four cited cards in ROUTE (caffeine cutoff, pre-shift nap window, first sleep after the run,
   light on the way home). SAVE creates a plan item, and the cards are not on TODAY. No schema change.
5. **Weekly interview → life timeline** (routine). Sunday: 3 questions chosen from that week's DELTA learnings and
   gaps. Answers save into the daily note through `saveDailyNote` with a `#timeline` tag, so there's no new data
   type. A Timeline view lists #timeline entries newest first, searchable via the existing search.
   **Gavin's objective (2026-11-11, "Implement Weekly Interview / Timeline"):** in MORE → Weekly check-in, the last 7
   lived days as recorded (shift/off, sleep, naps, energy, workouts, notes and tags), then 4 short questions from that
   week's best day, hardest day and gaps plus one carry-forward. SAVE previews, then adds a #timeline block to the
   day's note via `saveDailyNote` (existing text kept); the carry-forward becomes an undated plan item only on its own
   CONFIRM. Past interviews list newest first. No TODAY change, schema or AI.
6. **Year/Month in BEYOND recap** (routine). A story-style sequence of cards from records: best run, sleep rhythm
   change, top tags, finished experiments, most-mentioned [[people]], workouts. Built on MONTH-LETTER-001 and
   DELTA. Reachable from DATA → MONTH.
   **Built (Gavin, 2026-11-12, "Build the recap"):** PLAY YOUR MONTH IN BEYOND under the month letter in DATA →
   MONTH: the month in a line, best run (highest check-in energy, 2+ check-ins), work-day sleep timing against the month
   before, training, top tags, [[people]] you keep in People, and experiments closed that month. Days counted, empty
   cards left out, read only.
7. **On-device Alfred** (🔒 approved: new dependency). **Spike first:** measure a WebGPU small model (for example
   WebLLM) for download size, phone support and quality on the free helper's question set. Decide in the PR. It
   loads only on opt-in, stays outside the 2 MiB precache, and keeps the free helper's rules: never write without
   SAVE, never guess. Model weights come from a CDN (a new host), so the spike checks licences and the host.
8. **Shared view for his wife** (🔒 approved: outward sharing). The narrowest version: a read-only calendar of
   shifts, sleep windows ("asleep, don't call") and the next day off, exported as an .ics feed or a Drive-shared
   file he controls and can revoke. No health numbers, notes or tags. **Privacy design in the PR first**, and Gavin
   re-confirms exactly what is shared before it ships. An .ics file needs no provider. Sharing through Drive extends
   the backup-only Drive ruling (DRIVE-BACKUP-001), so the design must name that amendment.

## Not now
- **4 (voice capture)** was not picked; phone speech recognition usually sends audio to Google, a new provider.

## Leverage gate (per slice)
- **REUSE:** ROTATION-001, personal baselines, SLEEP-RHYTHM-001, DELTA, MONTH-LETTER-001, the daily note, the
  calendar export, and Drive backup.
- **OWN:** the mappings and wording.
- **BUILD FROM SCRATCH:** none planned. Item 7 (on-device Alfred) evaluates WebLLM-class libraries before any build.
