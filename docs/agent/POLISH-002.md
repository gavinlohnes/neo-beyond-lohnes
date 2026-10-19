# POLISH-002 — the whole command-center prototype, in production

**Authorization:** Gavin on 2026-10-19: "I want the entire prototype. Not just the one page", and
"fine if this is a big project for tonight." It follows a side-by-side check, which showed that
POLISH-001 (#251) fixed order and logging but not the look.
**Source of truth:** `prototype/command-center/index.html`, the approved prototype. Port it; don't
reinterpret it. Copy its CSS values, markup structure, skyline generator, copy and motion timings.
Production replaces the prototype's sample data with real queries and Engine output.
**Lane:** PROTECTED: TODAY composition, mode header, navigation chrome.
**Builder:** Claude Code, on a branch stacked on #251 until #251 merges. **Reviewer:** Codex,
reviewing the exact head of each PR. Gavin merges.

## Scope: every surface the prototype designs

### Shell (all tabs)
1. **Design tokens.** The prototype's `:root` becomes the app's tokens: colors, lines,
   surfaces, red, amber, mono, cut corners, type scale and easing. Each screen keeps its
   layout, but buttons, rows, panels, chips, fields and lists adopt the prototype classes
   (`.panel`, `.row`, `.opt`, `.ghost`, `.cta`, `.chip`, `.field`, `.lbl`, `.hint`).
2. **Header.**
   - At the top level: the emblem, BEYOND // TAB and the clock on the right. Long-press still
     opens stealth.
   - Inside a sub-view, the emblem becomes a back button labeled with where it returns
     ("‹ TODAY", "‹ SYSTEMS"), as in the prototype's per-tab stack.
   - This replaces the in-page "← BACK TO COMMAND" and "RETURN TO …" buttons. Browser Back and
     focus return keep working.
3. **Nav:** the prototype's four-tab bar, with a 2 px red top indicator and 11 px letter-spaced
   labels. Re-tapping a tab returns it to its root.
4. **Sheets:** a scrim and a bottom sheet with a title and ✕, for mode, LOG, WATER, the work-day
   question and stealth meal. The first option gets focus, and focus is trapped while the sheet
   is open.
5. **Toast:** one bottom toast with UNDO for its window. It replaces the logged-banners that
   push the page.
6. **Boot:** the emblem, BEYOND, a drawn line and a one-line status, on a cold launch only. It
   lasts about 0.9 s and a tap skips it. It never shows with reduced motion or in stealth.
7. **Decrypt:** numbers scramble and settle about 0.5 s after the first open of each lived day,
   as in the prototype. Never with reduced motion, and screen readers get the final value only.

### TODAY (`renderToday`)
8. **Mode hero.** Mode name with CHANGE; one meta line, plus Pinned and "resets 16:30" when
   pinned. Then the timeline (segments, ruler, names, legend), the scene band, and SYSTEMS last
   inside the frame.
   - Scene: crimson sky, beam (hidden ON SHIFT), the skyline with antennas and windows, the
     perch, and ON SHIFT scanlines. The prototype's sweep plays on a mode change.
   - Windows light by the real clock, and during ON SHIFT they go dark as the shift runs down.
9. **Next useful action:** a panel with "NEXT USEFUL ACTION", a headline, one line of evidence,
   the red CTA with ›, and "How BEYOND decided". The Engine stays the only source. Wording is
   mapped in the UI only, and an empty state always says what's next ("6h 20m left. Log as you
   go.").
10. **Today's numbers:** four tiles for PROTEIN /target with a bar, WATER with a bar, WEIGHT
    with its trend word, and SLEEP last main. A tap opens History. When stale they read
    YESTERDAY, with REFRESH.
11. **Actions:** WATER, MEAL and LOG in a row, with LOG emphasized.
    - WATER: the prototype offers 8/12/16/24 oz, while POLISH-001 has 8/12/16 + Repeat last.
      Keep POLISH-001's set and adopt the prototype's look.
12. **Phase rows** in the prototype's per-mode order, with icon, title, detail and ›:
    - PREP: tonight.
    - ON SHIFT: ends-in, handoff.
    - RECOVER: check-in, workout, sleep.
    - OFF DUTY: check-in, workout, plan.

    Rows are fed by existing data. The late-RECOVER sleep prompt from POLISH-001 stays.
13. **Tools:** a collapsed details row ("Everything else for today") holding chips for
    Check-in, Work context, Minimum day, Note, Plan today and End day.

### BODY (`renderBody`)
14. **Numbers first.** Six tiles: WEIGHT (vs 7-day average), PROTEIN (g to go), WATER (logs),
    CALORIES (recorded intake), MAIN SLEEP (time range) and MEASURE. Then "Numbers first. Tap
    any one for its history." The existing forms, meals and timeline stay below, unchanged in
    behavior.

### History (`renderHistory`), for every metric tile
15. Shows:
    - The big current value, plus average, high and low for the range.
    - 7D/14D chips.
    - The prototype's line chart: a dashed average line and a red dot for today.
    - The latest six entries.

    Each entry opens its source record (already shipped in #232). This uses existing BODY
    history queries and no dependency; the chart is hand-built SVG, as in the prototype.

### COMMAND (`renderCommand`)
16. The search field with clear ✕. Results are grouped (LOG, TODAY, TRAINING, RECORDS, …) as
    `.row` items with a title, a description and ›. Uses the existing catalog and search.

### SYSTEMS (`renderSystems`)
17. A 24 px title and "Readings only…", then BODY, TRAINING, STATE and DEVICE groups as rows.
    BODY rows open History. Behavior and values are unchanged; this is the look only.

### TRAIN (`renderTrain`)
18. The entry panel: SUGGESTED WORKOUT with name, exercise/set/minute line and START ›, then
    START REDUCED and HISTORY. Everything after START is the existing TRAIN flow, unchanged.

### Logging forms (`renderForm`)
19. **Meal:** "SAVED MEALS · ONE TAP" presets, each a one-tap log with its protein and calories.
    Manual entry and SAVE & LOG (POLISH-001) follow, in the prototype's field style. Drafts are
    kept.
20. **Sleep, weight, note, urge:** prototype title and field styles, MAIN/NAP chips, and a
    full-width LOG … › CTA. Existing commands, validation and drafts.

### Stealth
21. The prototype's layout: STEALTH label, big time, mode, and PROTEIN and WATER peek tiles
    (•••, hold to show), then WATER and MEAL actions and the hint line. In and out animations
    as in the prototype. Behavior from SUIT-001 is unchanged.

## Not ported, deliberately
The prototype's DEMO bar, sample-data label, scenario clock and signal toggles; its "Existing
screen" notices; and any sample number. Where the prototype and a later owner ruling disagree
(water amounts, SAVE & LOG, 24-hour time), the ruling wins and the prototype supplies the look.

## Exclusions
No Engine, recommendation, phase, status-rule, schema, event, command-semantic or backup
change. No new runtime dependency or font. TRAIN's workout flow and BODY's existing forms behave
exactly as now. Primary IA stays TODAY / TRAIN / BODY / COMMAND.

## Delivery tonight
- **PR A, shell + TODAY:** items 1–13.
- **PR B, the rest:** items 14–21.

Each PR gets `npm run verify`, Codex's exact-head review, green CI and Gavin's merge.

## Acceptance
- **Fidelity harness:** `scripts/compare-prototype.mjs` enters the prototype's sample day
  through the production UI. It screenshots app vs prototype side by side at 360×800 and
  390×844, for every TODAY mode (17:10, 23:40, 07:30, 15:10), BODY, History (protein), COMMAND,
  SYSTEMS, TRAIN, the meal form, the WATER sheet and stealth. Output goes to
  `docs/screenshots/polish-002/`, and any remaining difference is listed with its reason.
- **POLISH-001 guarantees still hold:**
  - TODAY order, with exactly one red action.
  - The action row above the fold.
  - Water logs in 2 taps with exactly-once undo.
  - SAVE & LOG works and the sleep prompt shows.
- **The rest:**
  - Drafts, focus return, browser Back and offline cold reload all keep working.
  - 44 px targets, WCAG AA contrast and axe clean at 320, 360, 390 and 412 px.
  - Reduced motion is fully static.

## Handoff log (Builder keeps this current)

**2026-10-19, Claude Code — PR A in progress on `claude/polish-002`** (stacked on #251 `codex/polish-001`).

**Done (visual port, items 1–5 and 8–13):**
- `src/ui/cc/cc.css`: the prototype's whole stylesheet, ported mechanically by
  `/tmp/claude-0/port-css.py`. Classes are prefixed `cc-`, tokens `--p-`, and the mode selectors
  map to `:root[data-suit-mode=…]`.
- `src/ui/cc/shell.css`: the header and tab bar.
- `OperatorHeader`: emblem, BEYOND // WHERE and the clock.
- `App` nav: the prototype's icons; the top-bar search button is removed (COMMAND tab is search).
- `ModeHeader`: prototype hero markup, timeline with names/legend, SYSTEMS inside the frame.
- `ModeIdentity`: the prototype's exact city (seed 7, antennas), perch, sky and window curves
  fitted to the prototype's scenes.
- `RecommendationCard nextAction`: NEXT USEFUL ACTION panel, red `.cc-cta ›`, quiet "How BEYOND
  decided". The all-clear card shows a staged "what's next" line.
- TODAY numbers: four tiles (protein/target, water + log count, latest weight, last main sleep),
  each opening its history.
- WATER · MEAL · LOG: `.cc-act`.
- Phase rows and Tools: restyled in `console.css` (POLISH-002 sections), behavior unchanged.
- `scripts/compare-prototype.mjs`: side-by-side harness, output in `docs/screenshots/polish-002/`.

**Status:** PR A ready for review. The full local gate passes: architecture, TypeScript, 269
test files with 2,676 passing and 1 existing skip, and the build. Side-by-side screenshots are
in `docs/screenshots/polish-002/` at 360 and 390. Rulings are recorded in `docs/UX_DECISIONS.md`
(POLISH-002).

**Next:**
1. Codex reviews PR A's exact head.
2. Gavin merges #251, then PR A.
3. Builder starts PR B (items 14–21: BODY tiles, History, COMMAND, SYSTEMS look, TRAIN entry,
   forms, stealth) on a branch from PR A. Use the same method: port the prototype's markup and
   cc- classes onto the existing components, keep behavior, and keep accessible names.
