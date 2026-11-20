# GRAYSON-C1.0-001 — Early START DAY (EARLY-DAY-START-001)

- **Owner authorization:** Gavin, 2026-11-20, after C1.1 discovery showed that a 15:05 START DAY opened a
  stub day which TODAY labelled wrongly ("OFF DUTY · FLIP DAY" on night 2, or "ON SHIFT" at 15:05) and which
  the 16:30 roll replaced, losing the check-in and recommendation: "fix this first as a small piece of work of
  its own. A START DAY tap in the afternoon before 16:30 should open the day that owns tonight's shift, so your
  check-in, your recommendation and the 'work day' label survive past 16:30. Then build C1.1 on top of that.
  Changing how days start and roll over is Protected. It amends that September 16:30 rule and I'm okay with
  that." He leaves the day running after a shift, so the tap must also be offered while yesterday's day runs.
- **Lane:** PROTECTED (day-start and rollover semantics; amends DAY-ROLLOVER-001). Independent exact-head
  review, green CI and Gavin's merge required.
- **Builder:** Claude Code. **Branch:** `ccr-380c4225-1es42i`. **Starting commit:** `83c3482`.
- **Operator benefit:** waking at 15:00 he taps START DAY once and TODAY is tonight's day straight away —
  PREP, shift in 2 h 55 m, shift 2 of 3 — and his check-in and advice carry through 16:30 to the shift.
- **Rule:** a deliberate START DAY tap between his post-shift tail (shift end + `postWorkTailHours`, 12:00 on
  his 18:00–06:00 schedule) and 16:30 opens the lived day that begins at 16:30, stamped at that boundary as the
  automatic roll stamps its days; `createdAt` keeps the real tap. The running day closes through the existing
  `AUTO_CLOSED_ON_NEW_DAY_START` path. A schedule whose tail reaches 16:30 has no window. TODAY shows one
  START DAY row in the window once last night's wake card is answered and no operation owns the screen.
- **REUSE:** `startDay(startedAtOverride)` boundary stamping (DAY-ROLLOVER-001), the schedule's own shift end
  and post-work tail, `livedDayShiftWindow`, the standing work context, TODAY's framed-panel styling.
  **OWN:** the window rule, `startDayFromTap`, `livedReadAt`, the row. **BUILD FROM SCRATCH:** none.
- **Exclusions:** lazy day creation (logging) and the automatic roll are unchanged, so logging never opens a
  day early; no schema, event type, Engine recommendation, notification or dependency change; Orientation is C1.1.
- **Known limits:** the time editor on log-history rows (`LogTimeEditor`) still resolves a typed "15:30" on a
  day opened early to the next afternoon; saving it there is valid but unlikely to be meant. TODAY's own reads
  follow the opened day; a few non-TODAY reads (helper answers, reflection prompts) still use the clock's lived
  day until 16:30.
- **Acceptance:** engine window tests; integration tests for open/close, survival of the 16:30 roll, the next
  day's normal roll, tonight's TODAY picture (shift 2 of 3), log placement from the tap, and no change outside
  the window; browser tests at 320/360/412 px (row shown, no write by showing, tap opens tonight's work day,
  absent before the window and once the 16:30 day runs); full Node suite in UTC; Gavin's phone check.
