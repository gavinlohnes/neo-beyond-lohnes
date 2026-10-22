# REDESIGN-001 — item 1 evidence

Synthetic data only. Built production PWA, Chromium, America/Chicago, reduced motion.
Four mode screenshots and the manual check-in sheet at each width: 320, 360, 390, 412.
`item-1-acceptance.json` records the executed checks.

Reproduce: `npm run build && node scripts/verify-redesign-001.mjs`.
Set `BEYOND_BROWSER_EXECUTABLE` for a different Chromium location.

Item 1 checks: five TODAY sections in order; scene retained without SYSTEMS; blank check-in,
word anchors, unchanged modal node after every selection; all-five submission gate; canonical
submission; dismissal draft/focus return; active-operation water confirmation and UNDO above
navigation; note sheet draft retention; displaced controls reachable in COMMAND; empty install;
axe on the check-in sheet; no horizontal overflow; production offline save and cold reload.
Nine focused browser cases pass. TypeScript/build and architecture pass.

This is partial objective evidence, not final acceptance or a review verdict. Log-sheet expansion,
BODY, TRAIN, COMMAND grouping, hidden-feature preferences, labels, locked-ruling amendments,
full regression and independent exact-head review remain. Physical-device/Safari/screen-reader
checks are unclaimed. No Engine, command, event, schema or backup-format changes in item 1.

## Item 2

The same production script now captures MEAL, NEW MEAL (opt-in save), SERVINGS, QUICK ADD,
LOG, SLEEP, BODYWEIGHT, NOTE, URGE and water confirmation at all four widths. It creates a
synthetic saved meal through the real UI, confirms the serving sheet stays mounted across a
chip change, then runs visible water undo and offline save/cold reload. Results are in
`item-2-acceptance.json`. Latest focused meal/receipt tests: 20 passed; prior broad regression:
108 passed / one existing skip. Build/architecture pass. No physical-device claim.

## Item 3

BODY, measurements and photos captured at all four widths by the production verifier.
`item-3-acceptance.json` records production checks with no page errors. Seven BODY browser
cases pass, including closed-day correction integrity, retained measurement drafts, all-width
accessibility and read-only history browsing. Combined BODY/sheet subset: 21 passed. Build and
architecture pass. TRAIN and COMMAND are still incomplete; not final acceptance.

## Item 4

WORKOUT, HISTORY and RECORDS captured at 320/360/390/412; built offline cold reload passes.
`item-4-acceptance.json`. Six new TRAIN cases plus 76 existing TRAIN/history cases pass;
15 operator cases passed separately. Progression/PR integration: 28 passed. Typed decimals,
empty blur restoration, resume, retained cross-view draft and dated PR provenance are covered.
