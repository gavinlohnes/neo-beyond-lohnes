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
| BODY protein: "40 g" then "40g protein logged today — log a bodyweight to see your target." | "No target yet · a weigh-in sets it." (TODAY's wording) |
| TRAIN title "Chest, Legs, And Triceps" (CSS capitalize) | Sentence case: "Chest, legs, and triceps" |
| #274 review nit: WeightTrend duplicated `formatShortDate` | Reuses it |

## Seen, not fixed here (candidates; bigger ones need Gavin)

- BODY shows weight twice (LAST WEIGHT tile and the PROGRESS weight card). With no weight, WEIGHT
  HISTORY opens an empty history rather than offering to log one.
- TODAY repeats the protein-target hint: tile "NO TARGET" plus the line below the numbers.
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
