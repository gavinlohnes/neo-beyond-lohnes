# POLISH-001 — make production match the approved command center

**Authorization:** Gavin approved this as one objective on 2026-10-18, after a beta test of
master `82e9234`. It fixes the gaps between production and the prototype he accepted
(`prototype/command-center/index.html`), plus field friction found in that test.
**Lane:** PROTECTED. It changes TODAY's composition and order, and the mode header.
**Builder:** Codex. Use branch `codex/polish-001`, starting from fresh master (after #250 if it
has merged). Codex never merges. Claude Code does the independent exact-head review.
**How the findings were reproduced:** the built PWA in Chromium at 390×844 and 320×640, on a
fresh install, with a faked clock at 17:10, 23:40, 07:30 and 16:25 → 16:32. Re-check each item
on the current tree before fixing it.

## Scope

1. **Mode header: restore the prototype's scene.** Files: `ModeIdentity.tsx`,
   `modeHeader.css`.
   - The city currently sits as a short strip behind the mode name and meta, so buildings
     overlap text. Give it its own band instead:
     1. mode name and CHANGE
     2. meta
     3. the timeline
     4. an open sky band of about 40px
     5. the SYSTEMS strip
     
     The skyline stands on the SYSTEMS strip and never sits behind the mode name or meta.
   - **Red sky:** use the prototype's radial glow (strong crimson near the horizon, fading
     upward), not the current faint `#57080d` wash. Keep the real-clock curve in `cityLight`.
   - **Searchlight:** use a light gradient beam that is visible on a phone (prototype: about
     0.18 alpha at the base, slight blur), rising from behind the buildings. It replaces the
     flat gray beam at 0.045. It stays gated on the same primary-action signal as item 2.
   - **Windows:** generate them per building and light them by fraction, as in the prototype.
     They replace the 34 uniform dash pairs.
   - Under reduced motion, everything is static.
2. **One next-action card.**
   - Directly under the mode header, show the Engine's existing primary recommendation as one
     card with one red action and the existing WHY.
   - When the Engine has no action, the card reads "Nothing needs you right now." The current
     ON SHIFT TODAY shows no guidance at all.
   - Move the existing Advisory or Guidance block into this card position. Don't add any
     recommendation logic; the Engine stays the only source.
3. **Lock TODAY's order** in every mode:
   1. mode header
   2. next-action card
   3. today's numbers
   4. WATER · MEAL · LOG row
   5. mode rows (cap unchanged)
   6. Tools
   
   The After Action Ready banner becomes a compact line under the card or a mode row, not a
   block above the header. **The action row must be above the fold at 390×844 and 360×800 in
   all four modes.** RECOVER currently pushes it below.
4. **Water: log and stay.**
   - TODAY's WATER opens an amount sheet on TODAY: +8, +12 and +16 oz and Repeat last, using
     the same canonical water command and undo as BODY.
   - One tap logs it and shows a toast with UNDO. You stay on TODAY.
   - Add a "More" link to BODY water for manual entry and today's entries.
   - It currently takes 3 taps and changes the tab to BODY.
5. **Meal: save and log in one step.**
   - In BODY Meals add-meal, the primary action becomes SAVE & LOG; SAVE ONLY is secondary.
   - It is exactly-once. If saving succeeds and logging fails, show the saved meal with LOG to
     retry, never a duplicate.
   - Add "log once without saving" only if an existing command already supports it. No new
     command or schema.
6. **RECOVER without sleep.**
   - If the day is still in the post-shift phase at 13:00 with no main sleep logged, replace the
     SHIFT DOWN block with a "Did you sleep?" card offering LOG MAIN SLEEP (prefilled from the
     existing sleep draft if there is one) and NOT YET.
   - This is presentation only. Phase derivation and the Engine are unchanged.
   - Currently SHIFT DOWN still shows at 16:25.
7. **Red budget on TODAY.** The only red is the next-action card's action.
   - MARK WORK ENDED and the selected SHIFT DOWN minutes chip become neutral. Show selection
     with an ivory border, not red.
   - Make it clear which SHIFT DOWN action comes first.
8. **Bruce-voice pass** (rules in COMMAND-CENTER-001 §6) on display copy across TODAY, TRAIN,
   BODY, COMMAND and SYSTEMS.
   - Visible sentences should be about 15 words or fewer. Longer explanations move into
     WHY or details disclosures.
   - Start with these:
     - `resetShiftDownCopy.ts` (the 40-word SHIFT DOWN text)
     - TRAIN's no-check-in line
     - the Advisory PROTECT text
     - the BODY meal hints
   - Map Engine strings in the UI layer only. Meaning stays identical.
9. **Back context.** A COMMAND destination opened from TODAY (SYSTEMS, for example) shows
   "← TODAY" and returns there. It currently says "← BACK TO COMMAND."
10. **24-hour time everywhere a person reads it.**
    - Use HH:MM with no seconds in log entries, the workout start time, the schedule picker
      options, toasts and SYSTEMS. Currently you see "11:45 PM" and "started 7:34:05 AM."
    - This is display formatting only; stored values don't change.
11. **No duplicate water controls.** While the action row is on screen, Advisory's
    +8/+12/+16 chips collapse to their evidence line and point to WATER. Extend the existing
    Minimum Day suppression.
12. **COMMAND label.** The header reads "COMMAND", not "COMMAND // SYSTEM".
13. **Record the rulings** (TODAY order, red budget, water sheet, SAVE & LOG, RECOVER prompt,
    24-hour time) in `docs/UX_DECISIONS.md`, and update the checkpoint.

## Exclusions

No Engine, recommendation logic, phase derivation or status-rule change. No schema, event,
command-semantic or backup change. No new dependency. No changes to stealth, the signals or the
SYSTEMS readout beyond copy and back context. Find & Act (one search for screens and records)
is the next objective, not this one.

## Acceptance

- **Header and scene:**
  - At 320, 360, 390 and 412 px, in every mode, no building overlaps the mode name or meta.
  - The red sky is visible at 23:40 and absent at 11:00.
  - The beam is visible whenever the Engine has an action and absent on "Nothing needs you
    right now."
- **Order and the card:**
  - TODAY's order matches item 3 in all modes.
  - The action row is above the fold at 390×844 and 360×800.
  - Exactly one red action is on TODAY.
- **Logging:**
  - Water logs from TODAY in 2 taps, stays on TODAY, and undoes exactly-once.
  - SAVE & LOG produces one saved meal and one log, and recovers cleanly from an injected log
    failure.
- **RECOVER prompt:** it appears at 13:00 without sleep, never with sleep logged, and never in
  other phases.
- **Copy and format:**
  - No visible sentence on the listed screens runs much past 15 words.
  - No 12-hour or seconds time appears in the touched views.
  - The back label is correct from TODAY and from COMMAND.
- **Unchanged:** drafts, focus return, browser Back, offline cold reload and existing tests
  all still pass. `npm run verify` passes.
- **Evidence:** screenshots of each mode at 320, 360, 390 and 412 px go in
  `docs/screenshots/polish-001/`.
- **Review and merge:** Claude Code's independent exact-head review, green CI and Gavin's merge
  approval.
