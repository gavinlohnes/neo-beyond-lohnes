# ONE-LOOK-002 — the rest of the look

- **Authorization:** Gavin, 2026-11-19: "1 through 5 are approved" (item 1, finish the one look). Merge authority:
  Claude Code merges on green CI plus an independent PASS on the exact head (roadmap Queue).
- **Lane:** Feature, presentation only. Changing the Engine, schema, events, commands, backups, providers,
  dependencies or navigation would be Protected: stop and report instead.

## Scope

- **TRAIN HISTORY and RECORDS:** every session and record card carries the red bracket. Titles are in the display
  face and dates in mono. Same taps and details.
- **MY PROGRAMME:** framed with cut corners and the bracket.
- **REVIEW:** its head is a foundation command bar, `/// MORE // REVIEW` and the date.
  - Its title stays the screen's visible h1.
  - The slashes are a real `aria-hidden` span, so the heading's name is unchanged.
  - The REVIEW body (THE WHOLE PICTURE and the ledger) keeps its own design.
- **Header:** Ask Alfred is a 44 px target on every tab. It measured 38 × 32; reviewer finding on #569.
- **Sheet titles:** their slashes move from CSS `::before` into an `aria-hidden` span. Screen readers and accessible
  names then read "CHECK IN", not "/// CHECK IN", which #571 introduced. Alfred's speaker label slashes use CSS alt
  text (`content: "/// " / ""`), and so do TRAIN's live eyebrows.
- **Not changed:** TRAIN's 13 px presence line in the app-wide header. It's a mono-capital label, allowed down to
  10 px by the foundation, and changing it would change every tab's header. It's left for Gavin.

**Reuse:**
- **REUSE:** the foundation's bracket, cut and command bar (VISUAL-FOUNDATION-001), and the existing markup.
- **OWN:** `src/ui/foundation/oneLook.css`, loaded once by the app-wide `OperatorHeader`.
- **BUILD FROM SCRATCH:** none.

## Verification

- New `tests/browser/OneLook002.test.tsx` checks:
  - framed history and record cards, with the readability sweep and axe at 320, 412 and 1024 px;
  - the framed MY PROGRAMME;
  - REVIEW's bar and its unchanged visible h1;
  - Ask Alfred at 44 px or larger on four tabs, with no page spill at 320 and 412 px;
  - the LOG sheet's heading named "LOG".
- `SheetsFoundation001` now checks the aria-hidden slashes.
- Locally: typecheck, the architecture check, and 11 related browser files (160 tests) all pass: TrainHistory,
  TrainScreen, TrainOperator, TrainingProgramme, VisualFoundation002/004, App, accessibility, Alfred001,
  CommandCenterLog and SleepMetric. Also CommandCatalog, CaveFile, ReviewScreen, MoreOperator and MoreScreen
  (165 tests). PR CI runs the full suite.
