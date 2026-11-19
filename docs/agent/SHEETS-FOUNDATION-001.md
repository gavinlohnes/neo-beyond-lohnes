# SHEETS-FOUNDATION-001 — every sheet on the visual foundation

- **Authorization:** Gavin, 2026-11-19: "1A" (finish the one look: the live workout, then the everyday sheets). This is
  HARVEST-001 backlog #11 ("Remaining sheets on the foundation: LOG, check-in, REVIEW, Alfred"). Building and opening
  the PR are authorized. Gavin merges.
- **Builder:** Claude Code. **Starting commit:** master `1f6e3d8`. **Branch:** `claude/sheets-foundation-001`.
- **Lane:** Feature, presentation only, with independent exact-head review. Changing the Engine, schema, events,
  commands, backups, providers, dependencies or navigation would be Protected: stop and report instead.

## Scope

**One container, every sheet.** `LogSheet` is the one container behind all 11 sheets:
- LOG and its record sheets
- CHECK IN
- ALFRED
- the metric pages
- a log entry's fixes
- shift marks
- habits
- work preparation
- the week planner
- the sleep sheet

It now carries `.bf` and `sheetFoundation.css`, so every sheet gets:
- **The sheet:** a near-black plate, a thin red top edge and one cut corner.
- **Its header:** a command bar, with red slashes before the title (via CSS, so the accessible name and text are
  unchanged) and the red bracket.
- **Buttons:** every button inside a sheet is 16 px. TODAY's `.today-field .btn-*` set CLOSE and SUBMIT CHECK-IN to
  13 px inside sheets opened from TODAY. That was against the foundation's size rule, and it's fixed here.

**Inside particular sheets:**
- **CHECK IN:** each scale's name is a mono label, and its choices are 26 px numerals. The chosen one is framed in
  white with the red underline (TRAIN's switcher mark).
- **LOG → WATER:** the amounts are 24 px numerals.
- **ALFRED:**
  - who's speaking is a mono label with the slashes;
  - each proposal card, which had no styling at all before, is a framed foundation panel with the red bracket;
  - its footer links are 16 px.

**Excluded:**
- any change to what a sheet shows, its words, focus handling, closing rules or saves;
- REVIEW, which is a screen rather than a sheet: proposed as the next slice;
- the toasts under TODAY.

**Leverage gate:**
- **REUSE:** the foundation's tokens and the panel bracket and cut (VISUAL-FOUNDATION-001), and the one shared
  `LogSheet` container, so one change covers every sheet.
- **OWN:** `src/ui/components/sheetFoundation.css`.
- **BUILD FROM SCRATCH:** none.

## Verification

- `tests/browser/SheetsFoundation001.test.tsx` checks:
  - the shell on LOG, CHECK IN and ALFRED (`.bf`, the red top edge, the cut, the bracket, the slashes);
  - water amounts as numerals, and +16 oz still writes one `WATER_LOGGED`;
  - CHECK IN's numerals, red mark and mono labels;
  - Alfred's framed card, with nothing saved before SAVE;
  - no spill, 16 px sentences and controls, and labels 10 px or larger, at 320, 412 and 1024 px;
  - axe on all three sheets.
- Full local gate: `TZ=UTC npm run verify` passed (569 files, 4210 tests, build OK). PR CI runs on the exact head.

## Next

- REVIEW on the foundation (its screen header as a command bar).
- On the phone: open LOG → WATER, CHECK IN, and ask Alfred something that proposes a card.
