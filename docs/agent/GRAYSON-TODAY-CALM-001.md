# GRAYSON-TODAY-CALM-001 — TODAY stays calm as features arrive: two quiet lines at a time, one after-shift card

- **Authorization:** Gavin, 2026-11-24 05:48 CT (campaign row **C9.6**, new): **"Write a today clean up."** Asked after I raised that almost every
  new brief adds a quiet line to TODAY. His rule: **"I should be able to edit and tweak or correct everything in this
  app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED** (TODAY composition). No new table, event, Engine input, recommendation change or notification.
  Nothing is removed from the app: every line still exists and still has its own switch; this decides how many show at
  once and in what order.
- **Starting commit:** `origin/master` `92f46cf3` or later. Re-fetch before starting; build on whatever has merged.
- **Builder:** Grok Bot. Branch `grok/grayson-today-calm-001`. **Reviewer:** Claude Code (Codex is offline).
  **Active PR:** pending.
- **Order:** Grok Bot **#2** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24): **after GRAYSON-TODAY-SPLIT-003**, whose snapshot this reads its
  candidates from, and before CARRY-001 and SHIFTDOWN-TAPS-001. The close's place (after the catch-up) is set here, and
  CARRY-001 later adds its block inside the close. The two queued
  briefs that add a TODAY line (SHIFTDOWN-TAPS-001's "First at home", PLAN-FRESH-001's "Phone alerts are behind") plug
  into this instead of adding their own. Both briefs carry an amendment note pointing here.

## Objective and benefit
TODAY already has a rule for its cards: one dominant surface and at most two attention items
(`ui/screens/today/attentionPolicy.ts`, `ATTENTION_MAX = 2`, Harvest Checkpoint 2). The quiet one-line notes have no
such rule. Each brief adds its own, rendered straight into `TodayScreen.tsx` (3,604 lines on master `92f46cf3`), and
each one is reasonable alone. Right now, after a shift, TODAY can show the shift catch-up card and the close card
together, plus the drive-home button, the routine row, the TELL DELTA meal line and the experiment line. The queued
briefs add "First at home: …" and "Phone alerts are behind." On a bad night that's a list to read, not a calm screen.

After this, the quiet lines go through one small rule: **at most two show at once**, in an order he can change, and the
rest sit behind one "2 more" tap. After SHIFT DOWN, the catch-up card and the close show **one at a time**, catch-up
first. Every future brief that wants a TODAY line adds a candidate here instead of a new block in `TodayScreen.tsx`.

**Why (cited, read 2026-11-24):**
- Calm technology (Amber Case, [calmtech.com](https://calmtech.com/)): "Technology should require the smallest possible
  amount of attention", and "The periphery is informing without overburdening." Already one of the Vision's sources and
  its CALM track.
- Progressive disclosure (Jakob Nielsen, NN/g, 2006,
  [nngroup.com](https://www.nngroup.com/articles/progressive-disclosure/)): "Initially, show users only a few of the most
  important options," and "Offer a larger set of specialized options upon request." That is the "2 more" tap.
- Our own Vision, principle 5: "Calm, not nagging: it speaks only when something needs you."

## What counts as a quiet line
A one-line note or one-button row on TODAY that is **not** the hero (mode header, life-state band, day map), **not** the
next-action card or an operation in progress, **not** the numbers, and **not** an error. Errors and his own just-made
actions always show: the save-failed/offline/backup signal line and the SYNC GARMIN result banner stay outside this rule.

Quiet-line candidates, with today's code and the default order (1 shows first):
1. **DRIVE_HOME** — the hands-free logging button after a shift (`TodayScreen.tsx` `today-drive-home`, POST-SHIFT-001).
2. **FIRST_AT_HOME** — "First at home: X." (queued, SHIFTDOWN-TAPS-001).
3. **LOG_NUDGE** — the TELL DELTA line at his usual meal time (LOG-NUDGE-001, now passed into `TodayNumbers`).
4. **PHONE_ALERTS_BEHIND** — "Phone alerts are behind your plan." (queued, PLAN-FRESH-001).
5. **ROUTINE** — the current moment's routine row (`TodayRoutine`, ROUTINES-001).
6. **EXPERIMENT** — the active experiment line (`ActiveExperimentLine` inside the mode header).
7. **REVIEW** — the weekly review disclosure on days off (`TodayReviewSupport`).

Not candidates (they stay where they are): the check-in line (already in the attention policy), ORIENT TODAY, the
early-start row, TodayEnergy and the Eating Window card (both opt-in panels he turned on), CAPTURE, YOUR LIFE, work
preparation.

## Recommended defaults (approved when Gavin merges this brief)
1. **A pure rule.** `deriveQuietLines(candidates, settings): { shown: QuietLineId[]; tucked: QuietLineId[] }` in
   `ui/screens/today/attentionPolicy.ts`, beside `deriveAttentionPlan`. Input: the candidates that are true right now
   (each line's own existing condition decides that, unchanged). Output: the first `max` by his order, the rest tucked.
   No I/O; tested alone.
2. **Two at once** (`QUIET_MAX` default 2). When more are true, the rest are behind one quiet button, **"2 MORE"**
   (the real count), which opens them in place. Opening it is remembered for the rest of the lived day on this device.
3. **While an operation or the late sleep prompt owns the screen**, no quiet lines show (today's `bandHidden` rule,
   extended to all of them), except DRIVE_HOME's own existing rule.
4. **One after-shift card at a time.** After SHIFT DOWN: the shift catch-up (LOG-CATCHUP-001) shows first; the close
   (C1.3, with CLOSE-GAPS and CARRY) shows once catch-up is done or skipped. Then the after-the-run section (RUN_OVER),
   if it applies. Today they can stack; nothing about either card's content changes.
5. **One place in the layout.** The quiet lines render together in one new component,
   `ui/screens/today/TodayQuietLines.tsx`, right under the numbers. Each line keeps its own words, button and
   behaviour; only where it renders moves. ROUTINE and DRIVE_HOME stay in the support section, so LIFE-STATE-001's
   order (preparation first in a work run) is unchanged, but they still count toward the two and obey the order. LOG_NUDGE leaves `TodayNumbers` for this block; EXPERIMENT leaves the mode
   header. This is a small first slice of C9.1 (the TodayScreen split): those lines' rendering leaves `TodayScreen.tsx`.
6. **Future rule** (written into `attentionPolicy.ts`'s doc comment; campaign row C9.6 says the same): a new TODAY
   note is a new `QuietLineId` with a default place in the order, never a new block in `TodayScreen.tsx`. Briefs say
   which place they take.

## Everything is his to change
In MORE → Settings, a new **TODAY** section (`<details id="command-today-lines">`):
- **Quiet lines at once:** 1, 2 or 3 (default 2), as chips.
- **Order:** the seven lines in his order, each with UP and DOWN, and **RESET ORDER**.
- **Show:** an on/off switch per line, linked to that line's existing switch where it has one (LOG-NUDGE's, PLAN-FRESH's),
  so there is one switch per line, not two.
- **One after-shift card at a time** on or off (default on). Off shows catch-up and the close together, as today.
Stored in `beyond.todayQuiet.v1` (`{ max, order, off, oneAfterShift }`), validated (unknown ids dropped, new ids added at
their default place), and added to `TRAVELLING_SETTINGS`. The "2 MORE" opened state is device state for the day and
doesn't travel.

## Design principles check (Vision, Nov 24)
- **Yours to change:** how many, which order, which lines, and the after-shift rule.
- **Fix, don't ask:** nothing new to answer; TODAY just shows less at once.
- **One tap for the usual:** everything tucked is one tap away.
- **Built around shift:** the after-shift order follows his getting-home ritual: catch-up, then the close.
- **Calm:** two quiet lines at most, by default.
- **Always says why:** "2 MORE" gives the real count; nothing disappears silently.
- **Simple first:** one rule beside the existing attention policy.
- **Tap or say it:** no change.

## Scope
- `ui/screens/today/attentionPolicy.ts`: `QuietLineId`, `QUIET_LINE_DEFAULT_ORDER`, `deriveQuietLines`, doc comment.
- New `ui/screens/today/TodayQuietLines.tsx` (+ css) rendering shown lines and the "N MORE" disclosure.
- `ui/screens/today/TodayScreen.tsx`: build the candidate list from the existing conditions; render the block once;
  sequence catch-up then close; remove the moved lines' old render spots.
- `ui/screens/today/TodayNumbers.tsx`, `ModeHeader` children: the moved lines (LOG_NUDGE, EXPERIMENT).
- New `ui/screens/today/todayQuietStore.ts`: settings read/write and the day's opened state.
- `ui/screens/more/MoreScreen.tsx`: the TODAY section. `persistence/settingsTransfer.ts`: the key.
- `docs/GRAYSON_CAMPAIGN_PLAN.md`: mark C9.6 done when built.

## Excluded
- The full TodayScreen split (C9.1), the hero, the band, the next-action card, the numbers, the attention policy's
  cards, the check-in line, any line's wording or condition, notifications, the Engine.

## Acceptance
- `tests/todayQuietLines.test.ts`: `deriveQuietLines` shows the first `max` in his order and tucks the rest; off lines
  never show; `max` 1/2/3; unknown and new ids in saved settings; empty input; no lines while an operation is active.
- `tests/todayQuietStore.test.ts`: settings round-trip and validation; the opened state resets at the next lived day
  (16:30) under `TZ=UTC` and `TZ=America/Chicago`.
- `tests/settingsTransfer.test.ts`: `beyond.todayQuiet.v1` travels.
- Browser tests (fixture after a shift with SHIFT DOWN done, a meal time due and a routine due): two quiet lines and
  "1 MORE"; tapping it shows the third; catch-up shows and the close doesn't until catch-up is done; with the after-shift
  rule off both show; changing the order in MORE changes TODAY; turning LOG_NUDGE off in either place turns it off in
  both. Existing TODAY, log-nudge, close, catch-up, routine and drive-home tests pass (update only selectors for moved
  lines, never their assertions about content).
- Keyboard only; axe clean; 320/360/412 px no overflow.
- Screenshots in `docs/agent/screenshots/GRAYSON-TODAY-CALM-001/` at 360 px: after a shift before and after this change,
  a day off, and MORE → TODAY.
- **Device check (Gavin):** look at TODAY right after SHIFT DOWN and on a day off. Say whether two lines feels right or
  whether you'd rather have one or three; that sets the default.

## Decision record
- A budget, not removal: each line earned its place in its own brief; the problem is them all at once.
- Beside the existing attention policy, not a new system: same idea (earned, ordered, capped), one file.
- Catch-up before the close: catch-up asks about the shift that just ended; the close is the end of the day.
- Errors and his own just-made actions are never tucked: hiding a failed save or a sync result would mislead him.

## Stop and ask Gavin if
- Moving a line changes what it says, when it shows, or what its button does.
- The catch-up and close sequence would hide the close on a day he skips catch-up (skip must count as done).
- A line not listed here turns up that looks like a quiet line: list it in the PR and give it a place, don't guess.

## Risks
- **A line he relies on gets tucked:** "N MORE" shows the count and he sets the order; the device check sets the default.
- **Overlap with queued TODAY work:** SHIFTDOWN-TAPS-001 and PLAN-FRESH-001 are amended to add candidates here; any
  other open TODAY PR rebases on this.
