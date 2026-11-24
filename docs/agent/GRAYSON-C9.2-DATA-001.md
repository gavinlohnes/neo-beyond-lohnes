# GRAYSON-C9.2-DATA-001 — Quiet Command finish for DATA home

- **Owner authorization:** Gavin, 2026-11-24: "Tidy up and we will do 9.2" (C9.2's DATA half; TRAIN shipped in #628).
- **Lane:** PROTECTED (locked visual identity). Independent exact-head review, green CI, Gavin's merge. **Builder:**
  Claude Code. **Starting commit:** master `efe1060c`. **Branch:** `ccr-380c4225-data`.
- **Operator benefit:** below the dashboard, DATA no longer drops into plain lists: the shortcuts and the day's
  history read as part of the same instrument as the panels above, so the whole screen scans the same way.
- **Rules:**
  - The DATA shortcuts sit under a **VIEWS** rule: red bracket, mono label, `--bf-line` rows. They are unboxed, not a
    framed panel, so SHORTCUT-GRID-001's two readable columns hold at 320 px; a box would have split words there.
  - **HISTORY** (recorded this day, health history) wears the framed panel (`bf-panel`), with its mono label.
  - The dashboard, the cave and its tabs are not changed. Same buttons, same order, same handlers. Tokens only,
    and no new red beyond the structural bracket.
- **REUSE:** VISUAL-FOUNDATION-001's `.bf` tokens and the `bf-panel` and `bf-panel__head` classes. **OWN:** where DATA uses
  them (`src/ui/screens/body/dataHome.css`). **BUILD FROM SCRATCH:** none.
- **Acceptance:**
  - New test `tests/browser/DataQuietCommand.test.tsx`: VIEWS keeps every shortcut in order with 44 px targets,
    HISTORY is framed, and there is no overflow and no axe violations at 320, 360 and 412 px.
  - Existing suites still pass: DataHome, ShortcutGrid001 at 320–1024, BodyDash001 collision/spill/cramped, MetricPage002.
  - DataHome.test exempts the short mono-capital panel label from its 16 px floor, per the dashboard's
    2026-11-14 label amendment.
  - Screenshots: `docs/agent/screenshots/grayson-data-c9.2/` (before at 360; after at 320/360/412).
