# CAPTURE-PARITY-001 — turning a capture into a task works the same everywhere

- **Authorization:** Gavin, 2026-11-15, approved the ranked-list item "Make turning a capture into a task work the
  same everywhere" (HARVEST-002's "best new refinement", score 4.3; its REFINE row: "Fast capture previews
  title/planned/due fields; legacy Capture list exposes title/due; Notes Sweep creates a task directly"), and that
  evening "Bang out improvements and features. Just make beyond better. You lead the way." Bounded: when an older
  capture is processed later (Notes Sweep and the older Capture list), offer the same optional title, planned day and
  due date that quick capture offers; reuse `convertCaptureToObligation` and the quick-capture UI and validation;
  confirm-first like quick capture; no schema, Engine or notification-kind change; do not merge.
- **Builder:** Grok Bot. Branch `codex/capture-parity-001` from fetched `origin/master` `4d74ac26` (#554 merged).
  Worktree `/workspace/capture-parity` (other branches were in flight in the main checkout).
- **Lane: FEATURE.** UI composition of existing commands. `npm run check:risk -- 4d74ac26` result is recorded in the
  PR. Semantically: no Engine, schema, event, persistence, backup, permission, provider, navigation or dependency
  change; no AI autonomy. The one behaviour change, Notes Sweep's MAKE IT A TASK becoming confirm-first, makes a write
  *more* explicit. Normal review, green CI, Gavin merges.
- **Overlap check:** open PRs #555 (sleep debt) and #473 (parked draft) touch no capture code; a work-run re-draft PR
  may open in parallel and also does not. Not already fixed on master (Notes Sweep still called
  `convertCaptureToObligation(note.id, { title: note.text })` directly; the Capture list had no planned day).

## What changes

- **One form** (`src/ui/components/CapturePromotionForm.tsx`, extracted from `FastCapture.tsx`): legend "OPTIONAL ·
  CREATE A TASK OR PLAN ITEM", the note "Only this confirmation creates a task. Your original capture stays in
  history.", Task title (copied from the capture, editable), Planned day (optional), Due date (optional), and
  CREATE TASK, which reads CREATE PLAN ITEM once a planned day is chosen. A blank title can't be confirmed. Helpers
  `capturePromotionInput` (trimmed title, only chosen dates), `capturePromotionError` (a capture processed or removed
  elsewhere is named plainly) and the success copy are shared too.
- **Quick capture** renders the same form; behaviour unchanged (its tests pass untouched).
- **Notes Sweep:** MAKE IT A TASK opens the form for that note instead of writing at once. CREATE writes through
  `convertCaptureToObligation` once (double-tap lock) and moves on; CANCEL returns to DONE / MAKE IT A TASK / KEEP /
  DELETE and writes nothing. A failure keeps the note OPEN and the typed draft for a retry. The summary still counts
  it as a task. The four choices from the 2026-10-04 ruling are unchanged.
- **Older Capture list (TODAY's → TASK):** the same form, adding the planned day it lacked. Its detected-due-date
  proposal (Capture Intelligence, chrono-node + Compromise) is kept: it pre-fills only the due date, is still editable
  and clearable, and shows "Detected from …". The row's own CANCEL closes the form. Success reads "Task created: X",
  or "Plan item created: X. Its planned day is separate from its deadline."; a capture processed elsewhere keeps the
  typed draft.

## Leverage gate

- **REUSE:** quick capture's existing promotion form and copy (UNIVERSAL-FAST-CAPTURE-001, #538), the atomic
  `convertCaptureToObligation` / `createObligation` validation (zod `DATE_ONLY`, required title), the existing
  Capture Intelligence proposal, HoldButton, and the inbox-first → deliberate-triage pattern HARVEST-002 compared
  (Drafts, Things).
- **OWN:** only the shared BEYOND draft → input mapping and wiring it into Notes Sweep and the Capture list.
- **BUILD FROM SCRATCH:** none.

## Acceptance evidence

- Node: `tests/integration/capturePromotionParity.test.ts` — the draft → input mapping, labels and error copy; an
  older capture promoted at 23:30 local keeps its explicit planned day and deadline, appears in TODAY's plan for that
  day, resolves once with `sourceCaptureId`. Run under `TZ=UTC` and `TZ=America/Chicago`.
- Browser: `tests/browser/CapturePromotionParity.test.tsx` — sweep preview/cancel writes nothing; confirmed plan item
  carries title + both dates + source, one write on double tap; failure keeps the draft; Capture list planned day +
  due date; processed-elsewhere message keeps the draft; 320px/375px no horizontal overflow, 44px controls and axe.
  Updated: `NotesSweep.test.tsx` (MAKE IT A TASK now confirms), `TodayScreen.test.tsx` (label "Task title" /
  "Due date (optional)"; assertions unchanged otherwise). Capture browser files also run under `TZ=America/Chicago`.
- Gate: `TZ=UTC npm run verify`; required CI; Gavin merges.

## Deferred

- The Capture Intelligence due-date proposal is not added to Notes Sweep or quick capture (quick capture's tests pin
  "dates in words are not inferred"); whether every path should propose, or none, is an owner call.
- Pre-existing: under MORE → TODAY TOOLS in the full app, an open capture can be listed twice (Attention and TOOLS),
  and → TASK opens the form in both rows at once. Not changed here; a small follow-up.
