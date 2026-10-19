# SUIT-001 — stealth, glitch signals, SYSTEMS

**Authorization:** Gavin approved and accepted the full command-center prototype on 2026-10-18.
His owner choices: stealth turns on with a long-press on the emblem, and SYSTEMS is one line on
TODAY with a tap for the full readout.
**Lane:** PROTECTED. It adds new UI state, a privacy surface and a change to how System Status
is presented.
**Builder:** Claude Code. **Starts after** the COMMAND-CENTER-001 PR is merged; it builds on that
mode header. **Reference:** `prototype/command-center/index.html` (DEMO → SIGNALS shows the
signals).

## Scope

1. **Stealth (screen privacy only).**
   - **Turn on:** a long-press of about 550 ms on the header emblem, with a thin progress line,
     toggles stealth. A short tap keeps its existing behavior. Suppress the iOS press callout
     and text selection on the emblem.
   - **Keyboard and screen-reader path:** a "Stealth" entry in COMMAND, and Escape exits.
   - **What shows:** a full-screen overlay with the time, the current mode and hidden PROTEIN
     and WATER readings that show only while held (Space or Enter on keyboard).
   - **Blind logging:**
     - WATER uses the existing amount flow with the total hidden.
     - MEAL shows saved meals only, one tap each.
     - Both use canonical commands and undo. Confirmations never show totals.
   - **If a workout is active,** show "Workout in progress". Exiting returns to it unchanged.
   - **Persistence:** stealth stays on across reloads until Gavin exits it (localStorage, not
     backed up, not an event).
   - **Copy:** never describe it as security. It hides the screen, not the data.
2. **Glitch as a signal.** Exactly four signals, each always with plain text:
   - **Stale reading:** values from a previous BeyondDay still showing after the roll. Use the
     existing staleness and re-read state. REFRESH runs the existing re-read and plays the
     decrypt.
   - **Offline:** `navigator.onLine` is false. Text: "Offline. Logging still saves on this
     phone."
   - **Backup overdue:** reuse the existing backup-due logic and threshold.
   - **Save failed:** the existing command failure states.
   - **Glitch behavior:** it plays once when the signal first appears (about 2 × 0.36 s), then
     settles. It never plays on the control being operated and never on healthy screens.
     Reduced motion shows no animation; the text alone carries the signal.
3. **SYSTEMS.**
   - **The line on TODAY** replaces the System Status line in the mode header. It shows the
     last main sleep, fuel (protein against target, or the total if there's no target), the
     check-in state, and any active warning such as backup overdue or offline.
   - **The readout** opens on tap and also from COMMAND. It has four sections:
     - BODY: last main sleep, protein, water and bodyweight, each opening the existing metric
       history.
     - TRAINING: sessions in the last 7 days, last session and next in rotation.
     - STATE: check-in, the full existing System Status explanation, work context with its
       source, and mode with its source.
     - DEVICE: connection, last backup, and that records live on this phone.
   - **Rules:** read-only, using existing queries only. No score, no combined number, no new
     interpretation. System Status keeps its exact meaning and evidence; it only moves.
4. **Voice:** follow COMMAND-CENTER-001's Bruce-voice rules for all new copy.
5. **Record the rulings:** add the stealth, signal-vocabulary and SYSTEMS presentation entries
   to `docs/UX_DECISIONS.md`, and update the checkpoint.

## Exclusions

No Engine, recommendation, priority or status-rule change. No schema, event, command or backup
change. No new dependency. No health scoring or inference. No new signal types beyond the four.

## Acceptance

- **Stealth:**
  - The long-press threshold is met and a short tap still goes home.
  - The keyboard and COMMAND paths work, and Escape exits.
  - Peek shows a value only while held.
  - Blind water and meal logging is exactly-once with undo, and no totals appear anywhere in
    stealth.
  - Stealth persists across a reload, and workout continuity is preserved.
- **Signals:**
  - Each of the four can be triggered in tests, shows its text, and glitches once without
    replaying on re-render.
  - Stale REFRESH re-reads and shows today's values.
  - Under reduced motion there is no animation.
- **SYSTEMS:**
  - The values match the existing queries, including missing-data cases.
  - Every System Status case is still fully explained in STATE.
  - Metric rows open the right history, with back and focus return.
- **Quality:**
  - Layout holds at 320, 360 and 412 px with 44 px targets, axe checks, focus traps and
    returns, and WCAG AA contrast in every mode, stealth included.
  - The built PWA works offline across a cold reload.
  - `npm run verify` passes and the existing suites stay green.
  - Screenshots go in `docs/screenshots/suit-001/`.
  - Independent exact-head review, green CI and Gavin's merge approval are required.

## Owner clarification (2026-10-18)

The effects rule in COMMAND-CENTER-001 binds here too: glitch, stealth transitions and peek are
presentation only, have no animation under reduced motion, keep WCAG AA contrast in every mode,
and never block or delay logging.

## Build record (added 2026-10-18)

**Builder:** Claude Code. **Branch:** `claude/new-session-0xvewh`. **Active PR:** the draft PR
linked from that branch. **Starting commit:** `origin/master` at `9f9100a` (#241,
COMMAND-CENTER-001, merged). The only other open PR is the isolated lab #204, so nothing overlaps.

**Slices.** Commit and push after each one.
0. Brief, checkpoint and draft PR. No app code.
1. **SYSTEMS:** the TODAY line in place of the System Status line, and the readout reachable
   from the line and from COMMAND.
2. **Signals:** stale, offline, backup overdue and save failed, plus the once-only glitch.
3. **Stealth:** long-press, the COMMAND entry, the overlay, peek, blind logging, workout
   continuity and persistence.
4. Decision Register entries, the evidence set and screenshots.

**Repo mapping (verified at `9f9100a`):**
- *Stale reading* uses the existing rollover machinery. TODAY's day is stale when its lived
  day has ended (`now ≥ nextRolloverBoundaryAfter(day.startedAt)`) but the roll has not been
  applied, for example while a workout blocks it. REFRESH runs the existing
  `performDueDayRollover` and then TODAY's own `refresh()`.
- *Backup overdue* uses `getBackupPrompt()`'s `BACKUP_DUE`, with the same setting and threshold.
- *Save failed* uses the error states TODAY and stealth already show for a failed command.
- *Stealth meal* uses the existing saved-meal log command and its undo. *Stealth water* uses
  the existing `logWater` and `voidWaterLog`.
