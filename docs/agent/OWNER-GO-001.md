# OWNER-GO-001 — the field study's protected fixes

- **Authority:** Gavin, 2026-10-29: "Go." on the five Protected items in the field study
  ([report](https://claude.ai/artifact/3QYkVbMnVzQHUqgJLx4Mvr)), plus "When I log some stuff it says
  delete or undo. That can go away too." Recorded in `docs/UX_DECISIONS.md` (OWNER-GO-001).
- **Builder / lane:** Claude Code; Protected (navigation, TODAY composition, Engine rotation rule,
  removing the undo/duplicate prompts), all within the owner's go. Branch `ccr-0be4f40f-16m0ja`.

## Scope

1. Log confirmations are the message only; same-meal / same-food prompts removed.
2. LOG in the middle of the bottom bar on every tab; the floating + is gone.
3. PREFLIGHT: sleep line plus "Still to do: …"; STARTED WORK switches TODAY to ON SHIFT; on shift
   the route line steps back.
4. Rotation advances only on a completion with at least one working set.
5. Check-in SAME AS LAST, and a one-line outcome after every check-in.

## Leverage

- **REUSE:** Material's centered bottom-bar action (the pattern Cronometer and Lifesum use), the
  existing LOG sheet, `submitCheckIn`'s returned recommendation, `doesSessionAdvanceRotation`, the
  mode pin's placement-only mechanism, the cave BRIEF.
- **OWN:** where each appears for a night-shift owner.
- **BUILD FROM SCRATCH:** none.

## Tests

`tests/browser/OwnerGo001.test.tsx`, the engine rule test in `tests/engine/trainSuggestion.test.ts`,
and the updated tests that covered the removed prompts (tests of removed behavior were removed).
