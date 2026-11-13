# WALKTHROUGH-002 — phone-size check of #499–#503

- **Authorization:** Gavin, 2026-11-13 ("Walkthrough").
- **Lane:** Routine. Report plus two small UI fixes.
- **Builder / branch:** Claude Code; `ccr-88f5c085-walkthrough-002` from `333c63d4`.
- **Method:** the whole app (`App`) at 360 × 800 in Chromium, on eight weeks of the owner's seeded 2-2-3 rotation
  (synthetic data, none of Gavin's real data). It walks Tue Oct 27 → Thu Oct 29 2026 with confirmed overtime on
  Thu 29. Every stop checks for horizontal overflow and runs axe at WCAG 2 A/AA.
- **Test:** `tests/browser/Walkthrough002.test.tsx`, which also runs in CI. Screenshots are taken when
  `VITE_WALKTHROUGH_SHOTS` is set; they are in `docs/agent/screenshots/WALKTHROUGH-002/`. This is not a field test.

## Screenshots

| # | Moment | Shows |
|---|---|---|
| 01 | Tue 17:10, shift 2 of 2 | NOW and NEXT ("1 confirmed change ahead"), WHY and WEEK AHEAD |
| 02 | WEEK AHEAD opened on TODAY | Confirmed changes, the energy forecast and the week |
| 03 | MOVE preview | "Move to", the preview sentence, CONFIRM and BACK |
| 04 | Wed 17:05, the next lived day | `SINCE TUE 17:10 WORK RUN → RECOVERY · Next shift: Thu, Oct 29 · 18:00 · confirmed change` |
| 05 | TRAIN | The header line "scheduled: day off 1 of 1 · back on Thu · with a confirmed change" fits at 360 px |
| 06 | Thu 09:00, still Wednesday's lived day | Tonight's confirmed shift is NEXT |

There is no horizontal overflow at any stop.

## Findings

### Fixed in this PR

1. **The SINCE label failed WCAG AA colour contrast.** I introduced this in #503. Axe flagged `color-contrast` on
   `.today-life-state__since > strong`: the red accent at 13 px. It now uses `--red-text`, the theme's red text
   token. All six stops now pass axe.
2. **WEEK AHEAD opened below the fold on a work day.** On a work day the band sits at the very bottom of the first
   screen, under the hero, PREFLIGHT, COMMS and the shift row (01). Tapping WEEK AHEAD added the panel out of sight.
   It now scrolls into view when it opens, and the test asserts this.

### For Gavin (not changed; most useful first)

3. **The same fact appears three times on TODAY.**
   - On a day off (04, 06):
     - the hero says "scheduled: day off 1 of 1 · back on Thu · with a confirmed change";
     - the band says "Back on Thu.";
     - NEXT says "Next shift: Thu, Oct 29 · 18:00".
   - On a work day (01):
     - the hero says "night 2 of 2 · next day off Wed";
     - the band says "Shift 2 of 2";
     - NEXT says "Next day off: Wed".

   **Recommendation:** drop the hero's "scheduled: …" run line while the band is showing. The band carries both
   facts and says where they came from. This changes TODAY's composition, so it is your call.
4. **"NEXT Next shift:" repeats a word.** Recommendation: "NEXT Shift Thu, Oct 29 · 18:00 · confirmed change". I'd
   do this after #502 merges, because #502's tests and Alfred's wording use the current line.
5. **Up to five lines of state at the fold.** On a transition day a moment line stacks above the state:
   "LAST SHIFT …" over "WORK RUN …", or "RUN OVER …" over "RECOVERY …". With SINCE and NEXT that makes up to five
   lines. At Thu 09:00, "RUN OVER … This is the first day off." is still shown. That is correct by lived day, but it
   reads stale the morning after. Low priority; #3 would shorten the stack.
6. **WEEK AHEAD in place is long.** It is about 3,100 px at 360 px wide: changes, the energy forecast with two
   actions, and seven days with workouts. That's fine at Inspect depth. A compact mode on TODAY (changes plus days
   only) is a possible later step.
