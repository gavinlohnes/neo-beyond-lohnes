# GRAYSON-Q5-PROTEIN-TAP-001 — BODY protein tap

- **Owner authorization:** Gavin, 2026-11-23: "I approve. Let's get started" — approving Q5, the BODY protein tap, as
  recommended (campaign plan Q5; roadmap Next #2: "BODY's NUTRITION card opens calories; a tap on its Protein meter
  opening the protein page is one small objective"; Gavin leaned yes 2026-11-19). Merge stays with Gavin.
- **Lane:** FEATURE (small; presentation-only navigation on an existing card). Independent exact-head review and
  green CI; not merged without Gavin's word. **Builder:** Grok. **Starting commit:** master
  `d2a1616ac0ec43bd8ea23dd4ed1772fc1df47757`. **Branch:** `codex/q5-protein-tap`. **PR:** pending (linked in GitHub).
- **Operator benefit:** on DATA, the protein number is one tap from its page (trend, food sources), instead of
  opening calories and switching the measure by hand.

## Scope
- DATA's NUTRITION card: the Protein meter becomes a button (full width, at least 44 px tall, quiet › after the
  value, accessible name "Protein … g, open protein page"). It opens the existing PROGRESS page on the Protein measure
  through BODY's existing `showProgress("protein")`, the same path the card's › uses for calories.
- The card's › still opens calories. The Eaten meter is unchanged (not a control).
- No protein recorded: no Protein meter, so nothing to tap (unchanged "never invents" behaviour).

- **REUSE:** the foundation `Meter` (gains optional `onOpen`/`openLabel`), the dashboard's existing `onOpen` route and
  BODY's `showProgress` into the PROGRESS insights page (METRIC-PAGE-002 protein measure). **OWN:** the meter's
  button presentation and the `"protein"` dashboard route. **BUILD FROM SCRATCH:** none.
- **Exclusions:** no Engine, schema, backup, information-architecture, dependency or capability change; no new
  page; no change to the Eaten meter, the calories route, targets or wording elsewhere; campaign plan and checkpoint
  untouched while #633 is open (status lives in the PR).
- **Acceptance:** `tests/browser/GraysonQ5ProteinTap.test.tsx` (fails on master): tap opens Protein with protein food
  sources and focus on PROGRESS; the › still opens calories; Enter and Space from keyboard Tab travel with a visible
  focus ring; 44 px target, text ≥16 px, no overflow at 320/360/412 px, axe clean; no meter without protein.
  BodyDash001 and VisualFoundation001 unchanged and passing. Screenshots in
  `screenshots/GRAYSON-Q5-PROTEIN-TAP-001/` (before/after at 320/360, after at 412, protein page).
