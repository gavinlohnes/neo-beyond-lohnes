# TODAY-SPLIT-002 — keep splitting TODAY safely (no visible change) — DRAFT for Gavin's approval

- **Status:** draft brief only. Gavin, 2026-11-19, decision 3B: "I draft its brief tonight for you to approve". Nothing
  is built until he approves. This brief authorizes no code.
- **Origin:**
  - [BEYOND-4.0](BEYOND-4.0.md) release a, "Foundation (no visible change)", says to split `TodayScreen.tsx` into
    self-contained sections. [4.0-a Part 1](BEYOND-4.0-A.md) did slice 1 (AT A GLANCE → `TodayNumbers.tsx`).
  - It folded the rest into 4.0-d's rebuild of TODAY as the mission briefing. 4.0-d shipped as an opt-in preview
    only, so that rebuild never happened. The split stopped at slice 1.
  - METRIC-PAGE-002's checkpoint held this work back until its TODAY-tile slices merged, so the two wouldn't
    conflict. Weight (#566) and protein (#567) are now merged.
- **Why now:** `TodayScreen.tsx` is still 3,482 lines with 110 `useState` calls and one `refresh()`. Every TODAY change
  (the metric page's tiles, capture parity, ALFRED-ACT's refresh) edits this one file. That makes TODAY's PRs
  collide, hard to review, and risky under the "TODAY breakage jumps the queue" rule. Smaller files with explicit
  inputs make each later TODAY change smaller and safer.
- **Lane:** a routine refactor with no visible change, as 4.0-a classified it. It still gets an independent
  exact-head review, because TODAY is the most-used screen. It changes no Engine, schema, event, command, backup,
  provider, dependency, navigation or TODAY information architecture. If a move would need one, stop and report.

## Proposed slices (one PR each, in this order)

Each slice moves one section's markup and its local helpers into its own component with explicit props. TODAY keeps:
- its in-flight guard (`busyRef`);
- its single `refresh()`;
- every state that more than one section reads;
- what each tap opens.

No behaviour moves with the code: the handlers stay in TODAY and are passed in unchanged.

| Slice | Section | Moves out | Why this order |
|---|---|---|---|
| 2 | **TODAY TOOLS** | `renderToolsItem`, `renderCheckInTool`, `renderShiftDownTool`, `renderResetTool`, `renderWorkContextTool`, `renderRecoverSleepPrompt` and the small-steps navigation (`openSmallTool`, `returnToSmallSteps`, `exitSmallSteps`, `toolHasContent`) → `ui/screens/today/TodayTools.tsx` | It's the largest block of render code with the clearest boundary (the TOOLS list). CAPTURE-PARITY-001/002 touched it last, so its tests are fresh. |
| 3 | **Phase rows** | `renderPhaseRow` and the phase-row list → `TodayPhaseRows.tsx` | The SHIFT CLOCK rows are self-contained and already read precomputed values. |
| 4 | **Logged banners and toasts** | `renderLoggedBanner`, the hydration, meal, sleep and protein confirmation toasts and their UNDO → `TodayToasts.tsx` | It's pure presentation of confirmations TODAY already holds. |
| 5 | **Sheets** | The sheet elements at the foot of TODAY (`MetricDetailSheet`, `LogEntrySheet`, `ShiftMarkSheet`, `CheckInSheet`, …) → `TodaySheets.tsx` | It's a plain list once the earlier slices are out. |

A slice that turns out to need shared state reorganised, or a behaviour change, stops and comes back to Gavin. It is
not done quietly.

## Must not change

- What TODAY shows, in what order, and what each tap opens or writes.
- TODAY's information architecture.
- The in-flight guard.
- Recommendation authority and the one red action.
- Accessibility (16 px sentences, 44 px targets), lived days (16:30) and corrections.
- **Pixel proof:** each slice's TODAY screenshots match master. Element-only shots are compared, as in
  VISUAL-FOUNDATION-001.

## Reuse disposition

- **REUSE:** 4.0-a slice 1's pattern (`TodayNumbers.tsx`: markup moved unchanged, handlers stay in TODAY), the TODAY
  browser suites as the safety net, and VISUAL-FOUNDATION-001's element-only pixel comparison.
- **OWN:** the section boundaries and their props.
- **BUILD FROM SCRATCH:** none. No state library: one `refresh()` and explicit props is the existing BEYOND pattern.

## Verification (per slice)

- typecheck, the architecture check, the node and browser suites, and the build;
- `TodayScreen`, `TodayRun`, `CommandConsole`, `CaptureParity*`, `Tonight001DayFreeze`, `MetricPage00*` and
  `accessibility` passing unchanged;
- element-only TODAY screenshots at 320, 360, 412 and 1024 px matching master byte for byte;
- `TodayScreen.tsx`'s line count reported before and after;
- PR CI on the exact head, independent exact-head review, and Gavin merges.

## Decisions for Gavin

1. Approve slices 2–5 as written, approve slice 2 only and judge it first, or don't split now.
2. **Builder:** Claude Code, one slice per night, or all four in one night as stacked PRs.
