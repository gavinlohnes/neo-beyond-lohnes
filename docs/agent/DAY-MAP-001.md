# DAY-MAP-001 — the lived-day map (slice 1: what has happened, on TODAY's bar)

- **Authorization:** Gavin, 2026-11-13: "Just adding features or massive improvements to beyond… Top tier
  improvements that other apps or open source things do." The Builder chose this under that latitude.
- **Lane:** Feature. Read-only: no Engine, schema, command or IA change; nothing stored.
- **Builder / branch:** Claude Code; `ccr-88f5c085-day-map` from `2a7b9763`.
- **REUSE:**
  - the day-timeline pattern of Oura, Whoop and Rise;
  - TODAY's existing 16:30 → 16:30 hero bar (`ModeHeader`, `deriveLivedDayStrip`);
  - the existing read queries: food diary, hydration, check-in, work marks, workout sessions and Garmin's
    `lastNight`.
- **OWN:** `application/livedDayMap.ts` (`deriveMapMarks`, `placeMarks`, `describeMap`, `getLivedDayMap`) and its
  track on the bar.
- **BUILD FROM SCRATCH:** none.

## What it does

A thin track under the hero bar draws what has been recorded on this lived day:

| Mark | What it shows |
|---|---|
| Sleep span | Garmin's main sleep |
| Work span (the one red) | From WORK STARTED to its end, or to now |
| Workout span | A lift, from start to end, or to now |
| Meal tick | A meal or a protein log |
| Water dot | A water log |
| Check-in diamond | The check-in |

- **Key:** a small key names only the kinds present.
- **Screen readers:** one hidden sentence carries the same facts ("Recorded since the day started: …").
- **Out of range:** marks outside the lived day are left out, and a sleep across 16:30 is clipped.
- **Operations:** like the state band, the map steps aside while an operation owns the screen, so RESUME stays above
  the fold. The full suite caught this.

Screenshot: `docs/agent/screenshots/WALKTHROUGH-002/07-day-map.png`. This is not a field test.

## Next slices (each its own PR)

1. **Planned blocks ahead of NOW, outlined:**
   - the shift (forecast or confirmed change);
   - the sleep window from the existing shift sleep plan;
   - the suggested lift.
2. **Tap a mark or a gap:** open its existing action or detail (log water or a meal, see sleep, start TRAIN). Writes
   stay confirm-first.
3. **Since-you-last-looked outline:** new marks get a brief outline.
4. **Alfred:** the map sentence joins "What TODAY shows" (after #502).

## Slice 2 — the sleep plan's windows ahead (Gavin, 2026-11-13: "A"; amends SHIFT-SLEEP-PLAN-001 for the bar only)

Branch `ccr-88f5c085-day-map-plan`.

- **The plan exposes `windows`:** the nap window, when your wake time gives one, and your usual post-shift sleep from
  the Garmin rhythm. These are the cards' own numbers; there is no new rule.
- **TODAY draws them** as dashed or dotted outlines while they are still ahead, and the key names them.
- **The hidden sentence** adds "Planned: …".
- **"SLEEP PLAN ›"** opens ROUTE.
- **During an operation** the map steps aside, and so does the link.
- **Not drawn:**
  - the shift block, because the bar's ON SHIFT segment already shows it;
  - the suggested lift, because it has no time, only "post-shift morning", and BEYOND won't make up a time.

Screenshot: `docs/agent/screenshots/WALKTHROUGH-002/08-day-map-sleep-plan.png`.

### Review of #507, non-blocking notes (follow-up branch `ccr-88f5c085-day-map-plan-fixes`)

- **Last shift of a run:** the bar's sleep window uses the FIRST SLEEP card's past-runs times, or none without enough
  runs, never the work-day rhythm. TODAY and ROUTE agree.
- **Key wording:** the key now says "Planned sleep" and "Planned nap".
- **Test:** a regression test checks that the planned blocks and SLEEP PLAN step aside during a workout.
