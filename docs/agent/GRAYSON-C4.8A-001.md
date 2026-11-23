# GRAYSON-C4.8A-001 — Eating Window foundation

- **Owner authorization:** Gavin, 2026-11-23: "begin the fasting window function", then "Approve C4.8a" on the
  proposal with three rulings: (1) settings on the existing "current" schedule row, boundary marks as new undoable
  records; (2) a private safety check before turning it on that stores only that it was completed, never answers;
  (3) three day kinds to start (work night, recovery, day off). Design: GRAYSON-BEHAVIOR-FASTING-DESIGN-001 (#601).
- **Lane:** PROTECTED (new event types; TODAY composition; health-adjacent copy). Independent exact-head review,
  green CI and Gavin's merge. **Builder:** Claude Code.
- **Operator benefit:** a neutral, shift-aware eating window he controls: off until he turns it on, a window length
  he picks (12:12, 14:10 suggested, 16:8, 18:6 or 6–16 eating hours), an opening time per kind of lived day, and a
  TODAY card that says where he is (plan, fast in progress, open with time left, skipped) with one-tap marks and UNDO.
- **Data (disclosed in full):** settings `eatingWindowSettings` on the schedulePatterns "current" row (no schema
  change; native backup; preserved by schedule saves); events `EATING_WINDOW_MARKED` (CLOSED = he stopped eating,
  OPENED = he started), `EATING_WINDOW_DAY_SKIPPED` (one day, no reason) and `EATING_WINDOW_MARK_VOIDED` (UNDO of
  either; the original is never deleted). Ruling (1) named the two marks; the skip and the void are the minimum
  records "skip today" and "every tap can be undone" need.
- **Rules:** neutral — completing a fast is never success, no levels or ladder, END FAST never asks why. Context
  lines follow design §5.6 and are labelled "Typical, not measured in you."; no ketosis/autophagy claim. Planned
  times follow the lived day (before 16:30 = its second date). Marks are his; nothing is inferred from meals.
  Reads and changes no targets, advice or Engine input. Safety check (§5.8): any YES shows "Talk with your doctor
  before starting an eating window" and nothing turns on.
- **REUSE:** C4.2a's settings-on-the-schedule-row pattern; additive void/undo like other logs; lived-day boundary and
  life-state purposes; TODAY's framed panel. **OWN:** `application/eatingWindow.ts`, its validation, the setup and
  card. **BUILD FROM SCRATCH:** none.
- **Exclusions (later slices):** meal-inferred boundaries, protein/energy conflicts, training/family exceptions,
  Daily Signals, outcome review, notifications, alcohol, Health Connect.
- **Acceptance:** pure tests (lived-day planning, presets, every state, void/skip, same-instant ordering, copy rules,
  safety questions); integration (off until set up, settings survive a schedule save and write no event, marks /
  UNDO / SKIP additive, safety check required); browser (YES blocks and nothing is stored, NO turns on without
  storing answers; TODAY card states and UNDO at 320/360/412 px, no red, no overflow, axe; absent until on).
