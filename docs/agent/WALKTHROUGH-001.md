# WALKTHROUGH-001 — phone-size walk-through (report only)

Owner ruling 2026-10-04 (plan "2. A"). Claude Code drove the current app (`origin/master` at
`7ea4533`, local copy with fresh test data, none of Gavin's real data) through a realistic day at
390 × 844: start day, work-day check-in, two TRAIN workouts (one in gym mode, a PR on the
second), RECORDS, water and two weigh-ins, the timeline, two captured notes, MARK WORK ENDED and
the handoff question, switching to a day off and the notes sweep, MORE's time capsule and backup
rows. Screenshots: `docs/agent/screenshots/WALKTHROUGH-001/` (01–13).

Everything worked: no errors, no broken screens, no overflow. The findings below are about
clarity and polish.

## Findings, most useful first

### Affects real use
1. **Gym mode shows no PR tag.** A PR logged in gym mode (05 → 06) only gets its PR tag on the
   plain TRAIN screen, and gym mode is where Gavin will be when it happens.
2. **Gym mode has no UNDO.** The plain TRAIN screen offers UNDO for the last set; gym mode doesn't,
   so a mis-tap means exiting to fix it.
3. **TODAY's new lines sit above the screen's header.** The backup, sweep, handoff and capsule
   lines render above "BEYOND // TODAY" (09, 10, 11), so they look bolted on. They belong under
   the header.
4. **The sweep duplicates Attention.** On a day off, the same notes appear in the sweep line and
   in Attention → CAPTURE (10, 11), and the same action is called "MAKE IT A TASK" in one place
   and "→ OBLIGATION" in the other.

### Plain words (owner ruling 2026-10-04, "fix the developer wording")
5. Workout summary: "Machine Chest Press: same weight (was: not enough history yet)".
6. TRAIN: "Incomplete evidence last time (fewer sets performed than prescribed, or one was
   skipped)." (06).
7. BODYWEIGHT: "Logged 9:29:31 PM": seconds aren't useful.
8. "How BEYOND decided" panel: "no severe or constrained condition", "No higher-priority rule
   matched." (lower priority: this panel is the explanation view).

### Layout and clutter
9. **Timeline chips are loud.** The four filter chips are solid white blocks, the brightest thing
   on BODY (08). BODYWEIGHT also shows two weight charts (the 60-day trend and the 90-day
   timeline).
10. **TRAIN keeps asking "Planning to train today?"** after two workouts were already logged (07).
11. **The "Start your BEYOND Day" card** has a large empty area under START DAY (01).
12. **MORE → Data safety has three backup rows** (BACKUP, AUTOMATIC BACKUP, ARCHIVE) that overlap;
    ARCHIVE does what BACK UP NOW does (13).
13. The sweep line appears only after TODAY is reopened when the day is switched to a day off
    (already on CLEANUP-002).

## Seen working as designed
Gym mode (big controls, ghost set "Last time 100 × 10", auto-advance to set 2, rest timer); PR tag
and RECORDS card; handoff question right after MARK WORK ENDED and "Saved for your next shift.";
the sweep card (DONE / MAKE IT A TASK / KEEP / DELETE, "Note 1 of 2 · captured Oct 4"); time
capsule and automatic backup rows; the HUD look throughout.
