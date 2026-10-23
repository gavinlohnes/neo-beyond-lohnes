# FRICTION-001 — the 2:30 AM operator pass

- **Objective / authorization:** Gavin, 2026-10-22: "start the friction pass after it merges" (#274).
  Judge every screen by "why would a deputy open this at 2:30 AM mid-shift?" and remove friction:
  one less tap, better defaults, clearer labels, fewer places to look. Continues UX-COHESION-001
  ("quiet by default"). Builder: Claude Code, branch `claude/friction-1`, from `42d6c2b`.
- **Risk lane:** routine within UX-COHESION-001. Display/copy only. **Excluded without Gavin's
  approval:** Engine or recommendation changes, schema, command/event meaning, moving things
  between TODAY/TRAIN/BODY/COMMAND, removing a capability.
- **Leverage:** BUILD OWNED; existing queries and components only, no dependency.
- **Acceptance:** each fix has a focused test; full verify; green CI; independent exact-head review.

## Slice 1 (this PR)

Walked TODAY, TRAIN, BODY and COMMAND at 390 px, 02:30 on a work day, with a month of Garmin data.

| Seen at 2:30 AM | Fix |
| --- | --- |
| TODAY says sleep 4:35 (Garmin); BODY says MAIN SLEEP "Not logged" for the same night | BODY falls back to TODAY's own `getLastMainSleep`, labelled "Last main sleep"/"Garmin" |
| BODY protein: "40 g" then "40g protein logged today — log a bodyweight to see your target." | "No target yet · a weigh-in sets it." (close to TODAY's "A weigh-in sets the protein target.") |
| TRAIN title "Chest, Legs, And Triceps" (CSS capitalize) | Sentence case: "Chest, legs, and triceps" |
| #274 review nit: WeightTrend duplicated `formatShortDate` | Reuses it |

## Slice 2

Gavin, 2026-10-22: "We have work to do" — continue the pass.

| Seen | Fix |
| --- | --- |
| BODY home shows weight twice (LAST WEIGHT readout and the WEIGHT card) | The card is the one weight surface; the readout is left out on BODY home only |
| Logging a weigh-in from BODY meant going back to TODAY → LOG → BODYWEIGHT | LOG WEIGHT on the WEIGHT card opens the same sheet (one tap) |
| The card said "184.6 lb · latest recorded" | Value only; a lone weigh-in shows its date (the trend line dates two or more) |
| A Garmin sleep from the day before was labelled just "Garmin" | "Garmin · last main sleep" |
| Tapping that sleep opened today's empty day with "not in this rolling range" | Opens all sleep history |

## Slice 3 — COMMAND in plain words

Walked the LOG sheet, CHECK IN, a live workout and every COMMAND group at 02:30.

| Seen | Fix |
| --- | --- |
| COMMAND descriptions written as builder notes: "Existing reset operation", "Existing recovery operation", "the existing protein-only form", "existing conversion actions" | Plain descriptions of what each tool does, from its own on-screen copy |
| "COMMAND ·" prefixed to every item inside COMMAND | Dropped; BODY · / TODAY · / TRAIN · stay because they say where the item goes |
| IMPORT HEALTH DATA said "Preview Garmin sleep" (it imports activity, calories and heart rate too) | "Preview Garmin data from the helper before saving" |
| The workout-complete summary's sentence case had no test | Test added |

A unit test keeps "existing" and the "COMMAND ·" self-tag out of COMMAND descriptions.

## Slice 4 — review screens say it plainly

Walked Weekly, History, Plan today, Import health data, Systems and Review at 02:30.

| Seen | Fix |
| --- | --- |
| Plan today headed "2026-10-22 · …" | "Thu, Oct 22 · …" |
| Review: "Lived days, 16:30 to 16:30, Monday through Sunday" and "lived-day windows" (the internal day boundary on a routine screen) | "Monday through Sunday." / "N of 7 days" |
| Import: "Choose a sleep or a steps and heart rate file" | "sleep, or activity (steps, heart rate and calories)" |

Noted for Gavin (approved and built in slice 5): SYSTEMS' "Logged HH:MM" for a Garmin sleep was
the import time, and the 36 h freshness rule counted from it.

## Slice 5 — owner-approved (Gavin, 2026-10-22: "yes to both")

| Approved | Built |
| --- | --- |
| A Garmin sleep is as fresh as its wake time | `getLastMainSleep` measures the 36 h window from the sleep event's `occurredAt` (Garmin's wake time; your own entry's log time, unchanged). SYSTEMS reads "Garmin · woke HH:MM". A late import can no longer make an old night count as last night, so the AMBER/RED status reading (never advice) can't be colored by it. |
| The PARTIAL rotation note only when it matters | Shown once a set is logged and the workout isn't complete; hidden before the first set and after everything is done. Wording and the rotation rule are unchanged. |

## Seen, not fixed (candidates)

- Review still states the boundary: `WeeklyReviewPanel.tsx` "Lived days starting …" / "the Sunday
  lived day ending Monday at 16:30", `ReviewAnswers.tsx` "lived-day windows, starting at 16:30".
  TODAY/SYSTEMS pin and reset times ("resets 16:30", "Pinned until 16:30") are real times the owner
  acts on, not the boundary, and stay.

- TODAY's tile "NO TARGET" plus the line "A weigh-in sets the protein target." is a deliberate
  FIELD-AUTHORITY-001 split (state in the tile, action below); left as is.
- The LOG sheet's "WORKOUT SET → TRAIN" keeps an arrow; harmless.
- "DONE" closes several inline tool panels; fine as "finished", but not the sheet grammar's CLOSE.

## Screen ownership / architecture notes (for ARCH-001)

- Screen files are the pain, not the hubs alone: `TodayScreen.tsx` 3,183 lines, `BodyScreen.tsx`
  2,689, `TrainScreen.tsx` 1,870, `MoreScreen.tsx` 866, `App.tsx` 700; `application/commands.ts`
  1,342 and `queries.ts` 1,026.
- Each screen derives "today's" numbers itself: TODAY reads `getLastMainSleep`, BODY read only the
  day's own entries, so the two disagreed. A single "today's readings" query shared by TODAY, BODY
  and SYSTEMS would remove this class of mismatch.
- BODY renders two layouts (`overviewOnly` tab home and the full tool surface) from one component;
  `HealthOverview` is passed the same props twice. Natural split: BODY home vs BODY tools.
- Shared copy (`nutritionCopy.ts`) serves several surfaces with different space budgets.
