# CIRCADIAN-SPIKE-001: Circadian Plan (BIG-IDEAS-001 item 3), research spike

Status: recommendation for Gavin's review (2026-11-11). Research only. It authorizes no code, and the first slice
below still needs Gavin's go.

## What others do that BEYOND still lacks
- **Timeshifter** builds a plan from your schedule and sleep preferences. It times when to seek or avoid light, use
  or stop caffeine, nap and (optionally) take melatonin, and sends push reminders. The plan comes from proprietary
  models (light and melatonin phase-response curves, sleep pressure, caffeine pharmacokinetics). I found no
  independent trial of the app.
- **AfterShift** judges recovery *between shifts*, not against a standard night. It weights naps by their length and
  timing relative to the next shift, and times the caffeine cutoff to the next shift rather than to a fixed clock
  time. Its paid recovery score uses sleep, continuity and the next shift. These are the developer's own claims and
  have not been checked independently.
- **BEYOND already has the inputs:**
  - exact shift windows (`livedDayShiftWindow`) and the off-duty window (Shift What-If);
  - measured main sleep and naps, and your usual sleep start and end for each kind of day (SLEEP-RHYTHM-001);
  - your first sleeps after past runs (ROTATION-003 `flips`), and the recovery briefing (SHIFT-RECOVERY-001);
  - in-app timed points (ROUTE).

  **The gap:** nothing turns these into times *relative to the next or last shift*.

## Recommended first slice: four shift-timing cards, information only
These cover only the next shift transition (the next 24 h). Each card is deterministic, shows its own rule and
source, and draws only on the saved schedule and measured sleep.

1. **Caffeine cutoff.** 6 h before your usual main-sleep start for that kind of day (after a night shift, that means
   your usual post-shift sleep). Source: McKenna & Wilkes, *BMJ* 2018. With too little sleep history (THIN), the
   card uses the shift end and says so.
2. **Pre-shift nap window.** Before a night shift, and especially the first of a run: the afternoon gap between your
   last main sleep and the shift. Sources: the BMJ 2018 review (sleep the morning before the first night, then
   nap), and NIOSH (1.5–3 h prophylactic naps help alertness). The exact length and the buffer before the shift are
   set from the full-text sources in the build PR.
3. **First sleep after the run.** On the last shift of a run: "Sleep soon after this shift." NIOSH warns against
   staying up all day. The card also shows your own record from past runs (`flips`). It never prescribes a length,
   because the sources disagree (3–5 h vs a full sleep).
4. **Light on the way home.** After a night shift, if you're going straight to sleep, keep light low on the commute
   (for example sunglasses). Source: Intensive Care Society guidance. BEYOND records no light, so it never claims you
   did or didn't follow this.

## Explicitly out of this slice
- Light-*seeking* plans and phase-shift schedules: they need a circadian model and chronotype, and that is
  Timeshifter's proprietary territory.
- Melatonin or any medication.
- A recovery score or verdict.
- Notifications, alarms or a calendar write.
- Caffeine or light logging, which would be a new record type and so a schema change.
- AI wording, and any Engine input.
- Changes to TODAY's primary rows.
- Other BIG-IDEAS items.

## Design rules that protect Engine authority and local-first behavior
- **Never the Engine.** The cards live in `application/` next to SHIFT-RECOVERY and ROUTE. They never feed
  `evaluate`, never compete with or rank against the one primary Recommendation, and carry the label "shift-work
  guidance, not a decision". `sleepStreak` stays the Engine's only sleep input. Using these cards in the Engine later
  would be a separate Protected approval.
- **Confirm before save.** SKIP stays local to the device (per card, like rest memory). SAVE happens only after a
  tap and a preview, and goes through one *existing* command (for example a plan item via `createObligation`). No
  new record type: **no schema change is needed.**
- **Cited constants.** The rule numbers live in one module, each with its source, and are covered by tests. Each card
  says which input it used and what it assumed. With no saved schedule, it stays silent.
- **Local-first.** No provider, no network and no notification.
- **Surface.** I recommend ROUTE (in the cave), not TODAY's primary rows.
  - ROUTE's existing ruling skipped "Last coffee" because BEYOND records no caffeine.
  - A cutoff *time* needs no caffeine record, but it does revisit that line. Gavin should confirm.

## Questions for Gavin
1. Where should the cards appear: ROUTE (recommended), the sleep page, or Week Ahead?
2. What should SAVE create: a plan item (recommended), a daily-note line, or should slice 1 be skip-only?
3. Is it acceptable that the nap window's exact numbers are settled from the full-text sources in the build PR?

## Sources and gaps
- McKenna H, Wilkes M. "Optimising sleep for night shifts." *BMJ* 2018;360:j5637.
- NIOSH, "Work Schedules: Shift Work and Long Work Hours" (nurse training), modules 7 and 9 (cdc.gov/niosh).
- Intensive Care Society, shift-work sleep guidance (ics.ac.uk).
- Timeshifter (timeshifter.com, the App Store listing) and AfterShift (the App Store listing, the developer's site):
  product claims only.
- **Gap:** this session's network blocked bmj.com and AfterShift's methodology page. The points above come from
  search abstracts. As item 3 already requires, the build PR must confirm each rule against the full text.
