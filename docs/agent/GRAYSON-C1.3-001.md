# GRAYSON-C1.3-001 — The close after SHIFT DOWN, with "tomorrow differs" (C1.3 + C1.4)

- **Owner authorization:** Gavin, 2026-11-20. He leaves the day running and crashes at home, so END DAY rarely
  happens. Asked where the close belongs, he chose after SHIFT DOWN: "shift down is kind of a getting home ritual.
  I'm shifting down from Deputy Lohnes to just Gavin at home. I take 5, 10 or 15 minutes for myself ... I could get
  changed out of my work uniform, drink a glass of water and take the medication for my night time ... doing after
  my shift down is a good idea." The plan's C1.4 "tomorrow differs" line ships inside it (Feature inside C1.3).
- **Lane:** PROTECTED (TODAY composition). Independent exact-head review, green CI and Gavin's merge required.
- **Builder:** Claude Code. **Branch:** `ccr-380c4225-1es42i`, restarted from master after #598 merged. **Starting commit:** master with C1.2.
- **Operator benefit:** once he's home and SHIFT DOWN is done, TODAY offers an optional close that takes under a
  minute: one line on what's next when it differs ("Next: tonight's shift is the last of the run."), up to two short
  questions he picked once, SAVE TO NOTE or SKIP. His answers land in that day's Daily Note. It never turns his
  wind-down into homework: no red, skip is one tap, and it never comes back for the same day.
- **Rules:** shown after a SHIFT DOWN completed during this day's shift window, while no workout, reset or shift down
  is running, until he saves or skips (device-local, like Orientation's marker). Questions: what went well / what
  could go better / thankful / what Delta should learn; defaults WELL + LEARN; up to two; his choice stays on the
  device. SAVE adds a `#close <day>` block of the answered questions to the end of that day's note (existing text
  kept), the way the weekly interview adds `#timeline`; all-empty saves nothing. END DAY is unchanged and works alone.
- **C1.4 · tomorrow differs** (`tomorrowDiffers`, pure): from the saved rotation and his confirmed changes only. After
  a work day: the next shift is the run's last, or the run is done ("2 days off, back on Wednesday"). After a day
  off: back on shift tonight/that day at its time, night 1 of N. Abstains when the next day is more of the same,
  without a saved schedule, or when today is unconfirmed.
- **Fix found on the way:** after SHIFT DOWN completed, TODAY kept offering START SHIFT DOWN (red) until main sleep or
  16:30 because the post-work slot ignored `shiftDownDone`. It now steps aside once SHIFT DOWN is done.
- **REUSE:** SHIFT DOWN's completion record (`getLastShiftDownCompletedAt`, `shiftDownDone`); the weekly interview's
  append-a-tagged-block note pattern through `saveDailyNote`; `shiftRun`, `livedDayShiftWindow`, confirmed schedule
  changes; Orientation's device-local marker pattern; TODAY's framed-panel styling. Sunsama's evening shutdown is
  borrowed as an idea only. **OWN:** the close card, prompts, `tomorrowDiffers`, `closeNoteText`. **BUILD FROM
  SCRATCH:** none.
- **Exclusions:** no new data type, schema, event, Engine or recommendation change; no END DAY change; no "park the
  rest" task review in this slice (his open items stay where they are; a later slice can add do/move/release); the
  "next" line is not added to Orientation, whose Situation already says when he's back.
- **Acceptance:** pure tests for every "next" case and the note block; browser tests at 320/360/412 px (shown only
  after SHIFT DOWN, SHIFT DOWN no longer offered again, no red, axe, SAVE writes the exact block, SKIP writes nothing,
  an existing note is kept, chosen questions persist); full suite; a timed phone run under 60 s by Gavin.
- **Review follow-up (independent PASS on `4e0842f`, non-blocking findings):** the close note's label and the "next"
  line now anchor to the day's own lived start, so a day started after midnight or held open past 16:30 reads right.
