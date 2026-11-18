# CAPTURE-PARITY-002 — an open capture is listed once in TODAY TOOLS

- **Authorization:** Gavin, 2026-11-18 (owner session, option 2): "start the next highest-value remaining item that has
  not been done. Prefer from the original ranked list if anything is left (e.g. consistent capture-to-task conversion
  across Notes Sweep and older Capture list, or another refinement that reduces emptiness / improves daily usefulness
  while staying inside existing machinery)", as one bounded mission: branch from latest master, full gate, update the
  checkpoint, open a PR, do not merge. Every named ranked item is merged (notification contract #554, learned sleep debt
  #555, work-run re-draft #556, capture parity #557, experiment stats #559, ALFRED-ACT #560, multi-action #561,
  set-time reminders #562, year in review #563). The one piece of capture-to-task parity still open is the follow-up
  [CAPTURE-PARITY-001](CAPTURE-PARITY-001.md#deferred) recorded: "under MORE → TODAY TOOLS in the full app, an open
  capture can be listed twice (Attention and TOOLS), and → TASK opens the form in both rows at once." HARVEST-002's
  other ranked rows (launcher Capture entry, flexible habit quota, manual timeboxing, micronutrients) each need an
  owner product decision first, so they are not taken here.
- **Builder:** Grok Bot. Branch `codex/capture-parity-002` from fetched `origin/master` `4088b65e` (#561 merged).
  Worktree `/workspace/capture-parity-002`.
- **Lane: FEATURE.** A presentation fix in one existing screen. `npm run check:risk` suggests PROTECTED only because
  this brief and the checkpoint sit on governance paths; no doctrine or authority is amended. Semantically no Engine,
  schema, event, command, persistence, backup, permission, provider, navigation, notification or dependency change;
  no capability removed (every open capture keeps one → TASK / RESOLVE row on the screen). Normal independent review,
  green CI, Gavin merges.
- **Overlap check:** the only other open PR, #473 (parked BIG-IDEAS draft, conflicting), touches no capture code.

## The bug

MORE → TODAY TOOLS mounts `DailyControls` with no focus (`commandFocus === null`) and TOOLS open. That view renders
Attention *and* TOOLS on the same screen, but the TOOLS Capture card was told "capture is not in Attention" whenever
`commandFocus !== undefined`, a rule meant for the focused COMMAND views (CAPTURE, a single daily control), which show
no Attention. So on a work day every open capture appeared twice, and because both rows share the one conversion
state, tapping → TASK opened two identical task forms (two Task title boxes, two CREATE TASK, two CANCEL).

## What changes

- `TodayScreen.tsx`: one derived flag, `captureRowsInAttention`, decides where the TOOLS Capture card leaves its rows.
  - Focused COMMAND views (non-null focus): unchanged, the card lists the rows (no Attention there).
  - TODAY tab (`undefined`): unchanged, follows Attention.
  - MORE → TODAY TOOLS (`null`): the rows show once, in Attention. On a day off, Attention's CAPTURE row is only the
    CLEANUP-002 pointer ("N notes waiting. SWEEP above"), so the rows stay in the TOOLS card, once.
- The TOOLS card keeps its capture box and "CAPTURE (N)" label; resolve/UNDO and the task form are the existing ones.

## Leverage gate

- **REUSE:** the existing `CaptureToolsCard` `captureInAttention` switch (already how TODAY avoids repeating Attention)
  and `CaptureListRow` / `CapturePromotionForm` from CAPTURE-PARITY-001.
- **OWN:** only the rule for which surface lists the rows when Attention and TOOLS share a screen.
- **BUILD FROM SCRATCH:** none.

## Acceptance evidence

- New `tests/browser/CaptureParity002.test.tsx` (mounted as MoreScreen mounts it): a work day lists each open capture
  once, in Attention, with the TOOLS capture box still there; → TASK opens exactly one task form and CANCEL writes
  nothing; a confirmed task resolves that capture once and the other stays listed once; a day off keeps the sweep
  pointer and each row once in TOOLS. The first three failed on master (4 → TASK buttons for 2 captures).
- Existing `Cleanup002`, `CapturePromotionParity` and `TodayScreen` browser suites unchanged and passing, under UTC and
  America/Chicago.
- Gate: `tsc -b`, `check:architecture`, `check:risk`, build, `TZ=UTC npm run verify`; required CI; independent review;
  Gavin merges.

## Deferred

- The other TOOLS items in MORE → TODAY TOOLS (END DAY, minimum day, work context) use the same
  `commandFocus !== undefined` rule and may also repeat an Attention row there. Not changed here; each needs its own
  check that its Attention row offers the same control.
- The Capture Intelligence due-date proposal across all paths remains an owner call (CAPTURE-PARITY-001).
