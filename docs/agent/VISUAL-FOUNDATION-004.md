# VISUAL-FOUNDATION-004 — MORE and THE CAVE on the foundation (slice 4)

- **Authorization:** Gavin, 2026-11-14, on the proposal "MORE and the cave … headers onto the same command bar, tiles
  into framed panels, so BEYOND reads as one instrument across all five tabs": "Let's get to work. Amaze me."
- **Lane:** Feature, with an independent review. It amends MORE-HOME-001's look; MORE's primary information
  architecture (content and order) is unchanged. No Engine, schema, dependency or command change.
- **Builder:** Claude Code. **Starting commit:** `e1209287`. **Branch:** `ccr-88f5c085-more-cave`.

## Scope

- **MORE** (`SystemsHome`, `moreFoundation.css`):
  - The hero becomes the command bar: MORE // SYSTEMS, the date and the purpose line. YOUR SYSTEMS. stays as a
    screen-reader heading.
  - **Unchanged:** Back up my data, Find anything, the areas grid and everything below.
  - Status cards become framed panels, two across from 560 px of their own width.
- **THE CAVE** (`caveFoundation.css`):
  - **Head:** a command bar, with the emblem in its locked place.
  - **Tabs:** mono capitals, with the chosen view in red.
  - **Framed panels:** every view's blocks, plus ROUTE's stops, LOG's lines, and BRIEF's poll and after-action
    table.
  - **Numerals:** the foundation's figures.
  - **Sentences at 16 px.** VITALS' trend caption is split into a label and a legend sentence.
- **Exception:** FILE's run table, MONTH's day grid and REVIEW's rotation map keep their compact table and chart
  labels.
- **Excluded:** what any view says, shows or does; REVIEW; the panels below MORE's top.

**Leverage gate:**
- **REUSE:** the foundation (#515), the cave's existing views and MORE's existing home.
- **OWN:** the mapping onto the foundation.
- **BUILD FROM SCRATCH:** none.

## Verification

- **Gate:** typecheck, the architecture check, the node and browser suites and the build.
- **`tests/browser/VisualFoundation004.test.tsx`:**
  - MORE's bar, actions and framed status panels;
  - the cave's head, its red chosen view and framed blocks in all seven views;
  - no spill and the size rule at 320, 360 and 1024 px (MORE also at 412 and 768);
  - axe on MORE and on every cave view.
- **`MoreHome`:** updated for the bar and the amended size rule.
