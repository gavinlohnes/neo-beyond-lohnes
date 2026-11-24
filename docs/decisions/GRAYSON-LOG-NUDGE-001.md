# GRAYSON-LOG-NUDGE-001 — a quiet "tell Delta" line at your usual meal times

- **Date:** 2026-11-24. **Authority:** Gavin, on the five logging ideas: "I don't necessarily need #3. But I like the
  rest. I don't want it to be annoying and pester me. Start implementing now." Brief: `docs/agent/GRAYSON-LOG-NUDGE-001.md`.
- **Decision:** one muted line under TODAY's AT A GLANCE tiles, "Usually you eat around 13:00. Nothing logged yet
  today." (or "...since 11:30."), with TELL DELTA (opens Delta with "I ate ", sends nothing) and NOT NOW (hides that
  usual time for the rest of the lived day; nothing written to history). It shows 45 minutes (his setting, 15–120)
  after a usual time when no meal was logged since 90 minutes before it, never on the clock and never in
  operations-only mode. The latest due usual time is the only candidate, so once it is answered or dismissed only the
  next usual time can bring the line back.
- **Usual times:** learned per day kind (WORK, RECOVERY, OFF via `dayKindFor`) from live (not voided) meals in the
  last 28 lived days, leaving out meals inside the shift on work days (the catch-up owns those). Each day's meals
  within 90 minutes are one meal; a 90-minute group seen on at least 4 days becomes a usual time at its median; at most
  4 per kind. Kept as wall-clock minutes into the lived day (from 16:30), so DST never shifts them. Fewer than 4 days:
  no learned time, and the settings say "Not enough meals logged to learn your times yet. Add one?".
- **Editable:** a "Logging nudge" section beside Key-moment alerts (Work schedule): on/off, delay, and per kind each
  time (move, delete, add); an edited list wins, RESET restores the learned times. Stored in `beyond.logNudge.v1`,
  which travels with the backup ("Logging nudge"); NOT NOW answers (`beyond.logNudge.dismissed.v1`) stay on the phone.
- **Why a line, not a push:** "I don't want it to be annoying and pester me." He already opens TODAY many times a day
  to see his steps; the line is where he looks and is gone once he logs.
- **Benchmarks (read 2026-11-24):** Yazio's per-meal reminder times and its rule of reminding only "If you haven't
  logged anything during the day" ([Yazio help](https://help.yazio.com/hc/en-us/articles/4406890595601-Set-Up-Reminders-in-Yazio));
  Carb Manager's "a time for each reminder" and one on/off for meal reminders
  ([Carb Manager help](https://help.carbmanager.com/en/articles/2645984-setting-meal-reminders)).
- **Not editable yet:** the 28-day look-back and the 4-day floor (constants in `application/logNudge.ts`).
