# APPS-PICKS-003: eighteen more proven ideas, kept simple

- **Authorization:** Gavin, 2026-11-07, picked from the big list: **17, 19, 38, 11, 13, 7, 29, 30, 34, 39, 12, 36,
  18, 20, 26, 31, 35, 40**. His standing direction: "keeping in mind the user experience and keeping the app simple
  to use and looking great." Two picks cross a Protected line and are approved by picking them:
  **18 supersets** (workout structure / stored data) and **31 places** (a new kind of saved record).
- **Builder:** Claude Code for all picks (Gavin, 2026-11-07: "You will be the builder today"). One PR per pick or small related pair, each with
  independent exact-head review, green CI and before/after phone screenshots at 360 px.

## UX rules for every pick (binding for this objective)

1. **Fold into what exists.** Extend the screen that already owns the job; no new tab, menu row or dashboard unless
   the pick has no home. Reuse `Section`, `SectionEmpty`, `readSection`, `openRecord` and confirm cards.
2. **Quiet by default.** New detail sits behind one tap or below the fold; the top two sections of a phone page stay
   as they are. TODAY's top and the Engine's next action never change.
3. **True and calm.** Recorded numbers only, "not recorded" instead of 0, no streaks, nudges or scores.
4. **One look.** Black, mono labels, 44 px targets, red only for action, 16 px floor in TRAIN.
5. **Save only on a tap.** Anything that writes goes through an existing command or a SAVE/SKIP card.

## Picks, where they live, and what already exists

| # | Pick | Home | Existing code to build on |
|---|---|---|---|
| 11 | On this day | YOUR LIFE "Back for today" | `resurfaceQueries.ts` (#439) — **Claude Code, this PR** |
| 17 | Estimated 1RM + PR timeline per lift | TRAIN → Records / lift history | `StrengthAnswers.tsx`, `LiftHistory.tsx`, `RecordsList.tsx` |
| 19 | Warm-up sets | TRAIN set entry, next to plates | Gym Mode warm-ups (`gymModeQueries.ts`), `plates.ts` |
| 38 | Same as last time (meals) | LOG / DATA meals | existing re-log in `RecordSheets.tsx`, `BodyScreen.tsx` |
| 13 | Unlinked mentions | Connections section | `getMentions`, `connectionQueries.ts`; suggest only, link on tap |
| 7 | Waiting-for list | Plan Today / Missions & Obligations | `markObligationWaiting` + a "check back" planned date |
| 29 | Home maintenance schedule | MORE → Home | Home reminders as repeating obligations (`homeCommands`) |
| 30 | Gift ideas per person | Person page (#436) | PERSON facts; a "gift" phrase in a fact, no new store |
| 34 | Ask your records anything | Alfred | `alfredSearch.ts`, read tools; answers cite sources |
| 39 | Week-over-week card | Review | `WeeklyDashboard.tsx` comparisons |
| 12 | Daily note templates | Daily note | Snippets/templates (A1); insert on tap |
| 36 | Note search with highlights | Search | existing Search Records; highlight matched words |
| 18 🔒 | Supersets / circuits | TRAIN templates | needs a template/session field — schema bump per `.claude/rules/persistence.md` |
| 20 | Muscle map | Review / TRAIN history | exercise library `muscleGroup` |
| 26 | Goal trend | DATA weight / lift goal | `WeightTrend`, goal weight; "at this rate" with uncertainty |
| 31 🔒 | Places | MORE → Life | new store; backup round-trip and old-backup restore required |
| 35 | Weekly planning chat | Alfred | `PLAN_MY_WEEK_ASK` |
| 40 | Day-off morning brief | Alfred brief | `AlfredBrief.tsx`; days off only, drafted on open, no notification |

**Leverage gate.** REUSE: the existing code named per row and each pick's source pattern. OWN: the BEYOND mapping.
BUILD FROM SCRATCH: none, except the two approved Protected stores (18, 31).
