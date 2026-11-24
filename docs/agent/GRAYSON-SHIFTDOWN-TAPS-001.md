# GRAYSON-SHIFTDOWN-TAPS-001 — three optional taps as you leave work: park it, breathe, pick what's first at home

- **Authorization:** Gavin, 2026-11-24. Backlog row **C2.2** (CONNECT, ranked 11th): "Shift-down bridge: three
  optional taps as you leave work". At 05:03 CT: **"Yes. Start the next briefs"**; at 05:23 CT: **"Just keep pumping
  out work."** His rule: **"I should be able to edit and tweak or correct everything in this app."** Merging this brief
  approves the defaults below.
- **Lane: FEATURE.** It adds an optional section inside the existing SHIFT DOWN card and one line on TODAY after it.
  It writes only through the existing `captureItem` command and a `beyond.*.v1` preference. No new table, event,
  Dexie version, Engine input, recommendation change or notification. (Campaign plan C2.2 also lists it as Feature.)
- **Starting commit:** `origin/master` `92f46cf3` (#667). Re-fetch before starting.
- **Builder:** Grok Bot. Branch `grok/grayson-shiftdown-taps-001`. **Reviewer:** Claude Code (Codex is offline).
  **Active PR:** pending.
- **Order and overlap:** Grok Bot **#6** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after CARRY-001. Touches `ShiftDownCard.tsx` and
  `TodayScreen.tsx` (one line above `ShiftCatchUpCard`). CARRY-001 changes `CloseCard.tsx`, not these, so no shared
  file except `TodayScreen.tsx`; rebase on whichever merges first.
- **Amended by GRAYSON-TODAY-CALM-001 (2026-11-24):** build after it. The "First at home" line is the quiet-line candidate `FIRST_AT_HOME` (default place 2) rendered by `TodayQuietLines`, not its own block in `TodayScreen.tsx`.

## Objective and benefit
SHIFT DOWN today is a timer: pick minutes, start, complete. The campaign plan's 06:00 moment asks for more: "park
anything unfinished (lands in capture), one minute of slow breathing, pick what's first at home. Under two minutes"
(`docs/GRAYSON_CAMPAIGN_PLAN.md` §2a, row C2.2). After this, the minutes of SHIFT DOWN have three optional things to do
in them, each one tap to start and one tap to skip, so work stays at work and home starts on purpose.

**Benchmark and evidence:**
- Breathing: a Stanford randomized study had people do one of three daily 5-minute breathwork exercises or the same
  time of mindfulness meditation for a month. Cyclic sighing, "which emphasizes prolonged exhalations", produced
  "greater improvement in mood (p < 0.05) and reduction in respiratory rate (p < 0.05) compared with mindfulness
  meditation" ([Balban et al., Cell Reports Medicine 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947), read
  2026-11-24). How it's done: "Breathe in through your nose", "take a second, deeper sip of air", then "very slowly,
  exhale through your mouth until all the air is gone"; "Spiegel recommends repeating these deep sighs for about five
  minutes" ([Stanford Medicine, Feb 2023](https://med.stanford.edu/news/insights/2023/02/cyclic-sighing-can-help-breathe-away-anxiety.html),
  read 2026-11-24). The study used 5 minutes; 1 minute is our default to keep the bridge under two minutes, and the
  length is his to change.
- Look and feel: a single expanding and shrinking shape you breathe with, the pattern breathing apps use (campaign
  plan "Borrow: Headspace/Calm-style breathing cue (COPY THE IDEA)"). We copy the idea only: our own ring, in the
  foundation palette, no audio, no streak.
- Park it: the capture habit GRAYSON already has (`FastCapture.tsx`, Drive Home voice log). This puts it at the exit.

## Recommended defaults (approved when Gavin merges this brief)
1. **Where:** inside the SHIFT DOWN card, while SHIFT DOWN is **in progress** (between START and COMPLETE), under the
   "in progress" line: a quiet section headed **"BEFORE YOU GO"**, three rows. Nothing about the timer, its buttons,
   MARK WORK ENDED or the recommendation changes. It isn't shown in the picker or after COMPLETE.
2. **Row 1, PARK IT:** "Anything unfinished? Park it." One text box (the phone keyboard's mic works) and **PARK**.
   Each PARK calls `captureItem(text)`, so it lands in Capture as a raw item with the time it was parked, exactly like
   any other capture. After a save: "Parked. It's in Capture." and the box clears for another. He can park several.
3. **Row 2, BREATHE:** **BREATHE 1 MIN** opens a ring in the card: it grows for two short breaths in ("in", "in
   again"), then shrinks slowly ("out, slowly"), about 2 s + 1 s in, 6 s out, repeated for the length. A countdown
   shows the seconds left. **STOP** ends it any time. When it ends: "Done." No sound, no buzz, no record kept.
   **Reduced motion:** no animation; the words change in place with the same timing.
4. **Row 3, FIRST AT HOME:** "What's first at home?" Chips: **Elle**, **The dogs**, **Food**, **Shower**, **Sleep**,
   **Something else** (a short text, 40 characters max). One tap picks it. Picking again changes it; tapping the
   picked chip clears it.
5. **After COMPLETE SHIFT DOWN:** if he picked one, TODAY shows one muted line directly under the next-step section and
   above the shift catch-up: "First at home: Elle." with **CHANGE** (reopens the chips in place) and **CLEAR**. It
   stays until the lived day ends (16:30), then it's gone. It's never written to the day's records, never read by the
   Engine, recommendations, Delta or the close. (C2.3, the home moment, can read it later in its own brief.)
6. **Skipping is the default:** none of the rows needs a tap. COMPLETE SHIFT DOWN works the same whether he touched
   them or not. Nothing nags or counts.
7. **Timing:** all three done in under two minutes at 360 px with the 1-minute breath (that's the campaign plan's
   acceptance line).

## Everything is his to change
In the SHIFT DOWN card, a **CHANGE** link on the "BEFORE YOU GO" heading opens:
- **Show "Before you go"** on or off (default on).
- Each row on or off: PARK IT, BREATHE, FIRST AT HOME (default all on).
- **Breathing length:** 1, 2, 3 or 5 minutes (default 1). The help line says: "The study used 5 minutes a day."
- **Home choices:** rename, remove or add chips, up to 6, 20 characters each (default the five above plus Something
  else, which always stays last).

Stored in `beyond.shiftDownBridge.v1` (validated; bad or missing values fall back to defaults) and added to
`TRAVELLING_SETTINGS` in `persistence/settingsTransfer.ts` so it moves with his settings. Tonight's pick is stored in
`beyond.shiftDownHomeFirst.v1` as `{ dayId, pick }` and is **not** added to travelling settings (it's one day's
state, like the close's done marker).

## Design principles check (Vision, Nov 24)
- **Yours to change:** every row, the length and the chips are editable; the whole section can be turned off.
- **Fix, don't ask:** nothing is asked of him; the rows sit there to use or ignore.
- **One tap for the usual:** BREATHE and a home chip are one tap each.
- **Built around shift:** it lives in the leave-work ritual he already has; the home pick lasts his lived day.
- **Calm:** no red, no sound, no streak, no count of skipped days.
- **Always says why:** the breathing row has a "Why breathe out slowly?" link to one sentence and the two sources.
- **Simple first:** three rows, no setup needed.
- **Tap or say it:** PARK takes dictation; Drive Home voice stays as it is.

## Scope
- `ui/screens/today/ShiftDownCard.tsx`: render `<ShiftDownBridge />` in the in-progress state.
- New `ui/screens/today/ShiftDownBridge.tsx`: the three rows, the ring, the settings panel.
- New `ui/screens/today/shiftDownBridgeStore.ts`: read/write and validate both preferences; `homeFirstFor(dayId)`.
- New `ui/screens/today/breathPacer.ts`: a pure function `breathPhaseAt(elapsedMs)` returning
  `{ phase: "IN" | "IN_AGAIN" | "OUT", progress: 0..1 }` for the 2 s / 1 s / 6 s cycle, so the timing is unit tested.
- `ui/screens/today/TodayScreen.tsx`: the "First at home" line, gated on SHIFT DOWN completed this lived day and a pick
  for this `dayId`, hidden while an operation, workout, RESET or SHIFT DOWN is active (same guard as
  `ShiftCatchUpCard`).
- `persistence/settingsTransfer.ts`: add `beyond.shiftDownBridge.v1`.
- CSS in `todayFoundation.css` (ring uses existing tokens; honours `prefers-reduced-motion`).

## Excluded
- Audio or voice guidance, haptics, a breathing history or count, any record or event, a notification, Engine or
  recommendation changes, Delta changes, the home moment itself (C2.3), changing the SHIFT DOWN timer.
- Anything shown while he's driving: the section is inside the in-progress card he already opens before he leaves;
  no auto-open.

## Acceptance
- `tests/breathPacer.test.ts`: phases at 0, 1.9, 2.1, 2.9, 3.1, 8.9 and 9.1 s; progress stays 0..1; the cycle repeats.
- `tests/shiftDownBridgeStore.test.ts`: defaults; bad JSON falls back; chips capped at 6 and 20 characters; Something
  else stays last; length only 1/2/3/5; the home pick is read only for its own `dayId`; a pick from yesterday's lived
  day reads as none. Run under `TZ=UTC` and `TZ=America/Chicago`, including a SHIFT DOWN at 06:10 and a lived day
  ending at 16:30.
- `tests/settingsTransfer.test.ts`: `beyond.shiftDownBridge.v1` travels; `beyond.shiftDownHomeFirst.v1` doesn't.
- Browser tests: start SHIFT DOWN, park two items and find both in Capture with their times; BREATHE runs and STOP
  ends it; reduced-motion shows words without animation; pick Elle, complete SHIFT DOWN, see "First at home: Elle."
  on TODAY; CHANGE and CLEAR work; the line is gone after the lived day ends (clock moved to 16:31); turning the
  section off hides it; each row's switch hides only that row; keyboard only; axe clean; 320/360/412 px no overflow;
  all three done in under 2 minutes with the default length.
- Screenshots in `docs/agent/screenshots/GRAYSON-SHIFTDOWN-TAPS-001/` at 360 px (key ones 320 and 412): the section,
  the ring mid-breath, the settings panel, the TODAY line.
- **Device check (Gavin):** at the end of a shift, start SHIFT DOWN, park one thing, do the minute, pick what's first,
  complete SHIFT DOWN, and see it on TODAY and the parked item in Capture.

## Decision record
- Inside the in-progress SHIFT DOWN card, not a new card: it's the leave-work ritual he already does, and TODAY doesn't
  get a new surface.
- Parked items are raw captures, not tasks: deciding what they mean is for later, the way Capture already works.
- The home pick is one day's note, never an input: the campaign plan says it "lives only for the lived day and is
  never an Engine input".
- One minute, not five: the bridge has to fit in two minutes; the source's 5 minutes is one tap away in settings.

## Stop and ask Gavin if
- SHIFT DOWN's in-progress card can't take the section without pushing COMPLETE SHIFT DOWN below the fold at 360 px.
- `captureItem` needs any change to take these items.
- The "First at home" line would sit above the day's next step at any width.

## Risks
- **Crowding the in-progress card:** the section is compact rows, and it can be turned off.
- **Driving:** it never opens by itself, and nothing in it needs attention to finish SHIFT DOWN.
- **Breathing claims:** the WHY text quotes the study's result and says it used 5 minutes; no health promise.
