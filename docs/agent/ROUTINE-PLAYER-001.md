# ROUTINE-PLAYER-001 / A4 — guided routine playback

- Authorization: selected A4 in `APPS-CHECKLIST-BRIEFS.md`; Gavin directed continued productive work after the reported PR API blocker. Continue implementation and preserve review branches despite that publication limitation; Claude Code remains independent reviewer/merger.
- Builder Codex; branch `codex/routine-player-001`; starting master `361a4feba6b5e9ddb1f294a4110963ed55bc5898` (#406 merged). A7a is preserved separately on `codex/smart-lists-001` and is not a dependency.
- Scope: optional whole-minute estimates per routine step; honest total/partial estimates; scheduled start-by only from an operator-saved pre-shift schedule and fully estimated remaining steps. Native full-screen player from the current TODAY row or LIFE/Routines, one step at a time, explicit DONE/SKIP, optional timer and browser speech.
- Existing text-only callers remain supported. Optional metadata lives in the existing routine step object, with no new index/table/version or backup format. Test new metadata round-trip and old untimed native backups.
- DONE delegates to `setRoutineStep` behind atomic routine-version/day guards. PLAY/SKIP/timer expiry do not write. Without a day, explicit START DAY uses the existing command. Timer/voice stop on close; skips remain session-only. No automatic advancement or guilt mechanics.
- Exclusions: Engine authority, primary navigation, new providers/dependencies, notifications, routine-finished event semantics, migrations, #407 publication, merges.
- REUSE: routine rows/validation/history, setRoutineStep, atomic write tables, native dialog, native timer/speech, existing saved schedule phase and day boundaries.
- OWN: optional estimate metadata, playback presentation and stale-session guards.
- BUILD FROM SCRATCH: none; no animation/timer/speech library.
- Acceptance: lifecycle/idempotence/read-only/rollover guards, native backup compatibility, editor and player phone/axe/focus/timer/voice checks, typecheck/build and required full verification. Results recorded before handoff.
