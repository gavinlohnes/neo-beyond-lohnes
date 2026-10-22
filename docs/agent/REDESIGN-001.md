# REDESIGN-001 — one job, one home

**Authorization:** Gavin approved the redesign prototype on 2026-10-19, after talking it through.
The reference is `prototype/redesign/index.html`; commit the supplied file there unchanged. It
uses sample data and is a reference for flow, layout and copy, not for numbers or Engine
output.
**Lane:** PROTECTED. It moves where things live, changes TODAY's composition, and amends locked
UX decisions; the four tabs themselves are unchanged.
**Builder:** Codex. Claude Code does the independent exact-head review, and Codex never merges.
**Start:** fresh master after PR #251 (POLISH-001) merges. #251 implemented SAVE & LOG and the
interim TODAY order; this objective replaces both as described below.

## Owner decisions this implements

- **Usage drives placement.** Gavin ranked his jobs: log water, log a meal, see what's next,
  run a workout, check progress, write a note, weekly review. On shift he opens BEYOND to log.
  He looks for "how am I doing?" in BODY.
- **TODAY has five things only:** the full mode scene, WATER · MEAL · LOG, one next-action card,
  today's numbers, and check-in until it's done.
- **Logging happens in sheets over the current screen.** It never changes the tab.
- **Water:** pick an amount, 2 taps.
- **Meals:** search first, then likely meals for this time of day, then a new meal as the last
  row, plus quick add and servings. You log first; "Save for next time" is unticked by default.
- **BODY:** today's numbers, then progress, then history. No entry forms on the main view.
- **COMMAND:** search, then grouped sections. Review items are grouped together in COMMAND.
- **TRAIN:** a WORKOUT · HISTORY · RECORDS switcher, and Last time plus Best on every exercise.
- **Manual check-in is primary.** Each scale has word anchors at both ends and starts blank
  every time. ALL GOOD stays as a secondary option.
- **Hide** Minimum Day (the screen only), Small Steps and online food lookup.
- **Labels:** plain words, with HUD-style headings.

## Scope

1. **TODAY.**
   - Order: mode scene (as POLISH-001 left it) → WATER · MEAL · LOG → next-action card →
     today's numbers → check-in card (only until done). Nothing else renders.
   - **Next-action card:** the Engine's existing primary recommendation, with one red action
     and WHY. "Nothing needs you right now." when there's no action.
     - An active workout appears here as RESUME WORKOUT.
     - In RECOVER, the card carries START SHIFT DOWN, with MARK WORK ENDED as its secondary
       action until work is marked ended.
     - The late "Did you sleep?" prompt from POLISH-001 lives here too.
     - Advisory shortfalls appear only when they are the Engine's primary recommendation.
   - **Removed from TODAY:** the SYSTEMS line, Plan Today, the workout row, the main sleep row,
     Advisory blocks, the After Action banner and the Tools sheet. Each moves to its home in
     item 5.
   - **Signals (SUIT-001):** the stale-numbers note stays with today's numbers. Offline, backup
     overdue and save failed show as one compact line under the numbers, only while active.
     The glitch rules are unchanged. Tapping the line opens SYSTEMS.
   - **Check-in sheet:** five scales with word anchors (Energy: Drained → Sharp; Stress: Calm →
     Maxed; Mood: Low → Good; Soreness: None → Wrecked; Urge: None → Strong). It starts blank,
     SUBMIT works only when all five are set, and it uses the existing check-in command.
2. **Log sheets.**
   - **WATER:** 8, 12, 16 and 24 oz plus Repeat last, a toast with UNDO, and a link to water
     history.
   - **MEAL:**
     - A search field at the top.
     - "Likely now": up to 4 of Gavin's saved meals, ranked deterministically from his own log
       history by time of day and recency. No AI.
     - Typing filters his meals. The last row is always "New meal '…'", with the name
       prefilled.
     - Each row has LOG (one serving). Tapping the name opens servings (½, 1, 1½, 2) and EDIT
       SAVED MEAL.
     - QUICK ADD takes calories and protein, saves nothing, and replaces "protein only".
   - **New meal:** name, calories, protein, optional carbs and fat, and "Save for next time"
     (unticked). LOG records it exactly once; saving happens only when ticked. Replace #251's
     SAVE & LOG.
   - **LOG sheet:** water, meal, sleep, bodyweight, note and urge open as sheets; workout set
     opens TRAIN.
   - All sheets reuse the canonical commands and undo. Existing home-screen shortcuts
     (`?go=…`, `ui/shortcuts.ts`) open the matching sheet over TODAY.
   - **Sheet updates happen in place.** Selecting a chip or scale value must never re-mount the
     sheet or replay its entry animation; that's the prototype's "flash" bug. Moving between
     sheets (for example meal → new meal) updates the open sheet too.
3. **BODY.**
   1. Today's numbers, each opening its existing metric history.
   2. **Progress:** a weight trend card (opens weight history; shows the goal date when a goal
      is set), a training card (opens TRAIN → RECORDS), and photos and measurements.
   3. **History:** days, then a day detail with entries. Hold to correct or delete, using the
      existing void commands.
   
   Entry forms leave BODY's main view; any old BODY focus route redirects to the sheet.
   Managing saved meals is reachable from EDIT SAVED MEAL and from COMMAND → My meals.
4. **TRAIN.**
   - The WORKOUT · HISTORY · RECORDS switcher sits at the top.
   - **WORKOUT:** the suggestion card (START, or RESUME when a workout is active) plus the
     existing Planned Work, collapsed below.
   - **HISTORY:** sessions by date, opening every set.
   - **RECORDS:** each exercise's best, newest personal records first, opening that exercise's
     history.
   - **In a workout:**
     - Each exercise shows LAST TIME and BEST with its date.
     - Weight and reps are typeable fields. Focusing one clears it and shows the old value as a
       placeholder; leaving it empty restores the old value. The − and + buttons stay.
     - Gym mode, hold-to-confirm COMPLETE/PARTIAL and the rotation rules are unchanged.
5. **COMMAND.**
   - **Search** finds screens, log actions, saved meals and exercises. Results open the right
     sheet or screen. "Search all records" opens the existing record search for everything
     else.
   - **Groups:**
     - Today: work context, mark work ended, end day, stealth.
     - Review: weekly check-in, monthly review, After Action report (with a NEW badge when
       ready), Mirror, History, Decision journal.
     - Plan: Plan Today, missions and obligations, work schedule.
     - Notes: Capture, shift handoff notes, time capsules.
     - Systems.
     - Settings & backup: nutrition targets, My meals, quit tracker, reminders, backup and
       recovery, Hidden features.
   - Every destination reachable today must stay reachable.
6. **Hidden features.** Minimum Day (the screen and tool), Small Steps and online food lookup
   are hidden by default and can be re-enabled under Hidden features. Their data is untouched.
   The Engine's Minimum Day logic stays, and copy that shows the user no longer names
   "Minimum Day" (for example, "Water and protein are short.").
7. **Labels.** Plain words in HUD-style headings:
   - "Immediate operations" and "Orient / Current state" are removed.
   - Daily record → TODAY
   - Meal memory → MY MEALS
   - Explore / Inspect → HISTORY / open
   - NO READ → NOT CHECKED IN
   - Template A · STANDARD → WORKOUT A
   - Performance brief → TRAINING SUMMARY
   
   Bruce-voice rules and 24-hour time continue from POLISH-001. Engine strings are mapped in
   the UI layer only.
8. **Record the rulings:** amend the affected locked UX decisions in `docs/UX_DECISIONS.md`
   (TODAY contents, BODY without forms, COMMAND groups, hidden features, check-in anchors) and
   update the checkpoint.

## Exclusions

No Engine, recommendation, phase, rotation or status-rule change. No schema, event,
command-semantic or backup change. No new dependency. No change to stealth or signal logic
beyond where the signal line sits. No new metrics or scoring. No desktop redesign.

## Acceptance

- **Task paths at 390×844:**
  - A saved meal is logged in 2 taps from TODAY.
  - Water is logged in 2 taps.
  - A new meal can be logged without saving, and with saving when ticked.
  - Neither changes the tab.
  - A personal record is one tap from TRAIN.
  - "How am I doing" is BODY's first two sections.
- **TODAY:** renders only the five sections, plus the signal line when it's active, in every
  mode and in the empty-day and fresh-install states. Exactly one red action.
- **Check-in:** a test proves the sheet element stays mounted across every selection, and
  SUBMIT is gated on all five.
- **Workout:** typed weight and reps log correctly, including decimals. An empty field restores
  its value. RESUME keeps the logged sets.
- **Reachability:** a catalog test proves every pre-change destination is reachable from
  COMMAND. Shortcuts open the matching sheets. Hidden features can be turned back on, with
  their data intact.
- **Unchanged guarantees:** exactly-once writes and undo, drafts, focus return, browser Back,
  offline cold reload, and layout at 320, 360, 390 and 412 px with 44 px targets. Axe checks and
  reduced motion pass. `npm run verify` passes.
- **Evidence:** screenshots of each tab and sheet go in `docs/screenshots/redesign-001/`.
- **Review and merge:** independent exact-head review, green CI and Gavin's merge approval.
