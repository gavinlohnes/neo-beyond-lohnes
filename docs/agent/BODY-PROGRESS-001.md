# BODY-PROGRESS-001 — usable body progress

Gavin approved BODY Progress in this session on 2026-10-18: a coherent overview,
dated measurements, and a progress-photo timeline using existing commands/storage.
Builder: Codex. Branch: `codex/body-progress-001`. PR: [#244](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/244).
Starting freshly fetched master: `9f9100ade1d54f4f4368759fb73afcb7f1201a20`.
Lane: PROTECTED, bounded BODY composition and presentation of existing private photos.

BUILD OWNED the connective interface; REUSE measurement/photo commands, effective queries,
image encoding, existing trends, local draft retention and native browser controls.
No dependency, Engine, schema, event, correction semantics or backup-format changes.
No TODAY/global-style/SUIT edits; #242 belongs to Claude. #243 was owner-merged at
`85db25bbc9e6937007cffd88c34c74c3b197600c` during this build and is integrated before the final gate.

Scope: compact recorded-progress overview, retained Trends / Measurements / Photos views;
manual dated tape measurements, effective history and canonical correction; explicit photo
capture/import/save, dated timeline, same-pose comparison and existing metadata correction,
hide and permanent-delete commands with clear confirmations. Missing data stays missing.
No new health score, automatic inference, targets or recommendations. Hidden photos remain in
backups; deleted images do not enter later backups; old backups are unchanged.
Optional camera ghost framing, monthly reviews and analytics remain separate.

Acceptance: 320/360/412, keyboard/focus and axe, reduced motion; interrupted measurement/photo
input through tabs and metric exploration; exactly-once explicit writes, correction provenance,
read/save failure recovery without replay; calendar dates independent of 16:30 ownership;
existing metadata stripping and backup regressions; built-PWA offline reload/exploration/writes.
Focused checks during development, full gate at final implementation, green required CI and
independent exact-head review before Gavin's merge decision. No merge/deploy authorized.
Rollback: revert UI and its tests/docs; existing records remain readable with no conversion.

## Builder evidence

Complete, including photo timeline/comparison. Source frozen at
`21932d9f23b7a4be3682aa2f0dfa4d20cc351dac`; subsequent handoff/evidence edits change no runtime code.
Full local gate: **255 files / 2,582 passed / one existing skip**, architecture (247 files),
TypeScript and production build pass. Focused checks also cover stale corrections, duplicate
taps, read/write failures, keyboard entry, retained drafts and active-workout/16:30 continuity.
Built PWA at 320/360/412 passes offline reads/saves/cold reloads, canonical correction provenance,
44 px controls, unclipped labels, zero axe violations and zero page errors.
[Reproduction and synthetic screenshots](../screenshots/body-progress-001/README.md).
Required CI and independent review bind the final published PR head. No physical-device or
independent-review PASS claimed. Existing bundle-size advisory and cleanup/act warnings remain;
none were suppressed and the built PWA reports no page errors.

Full verification exposed an inherited meal-reopen focus race in unchanged BODY code: a slow
read can outlast the 250 ms shortcut positioner, leaving the temporary shell heading focused.
The strengthened CommandCatalog regression reproduced failure before correction. The BODY-only
handoff now completes after the shell landing and recognizes the placeholder heading, leaving
chosen controls alone. No meal data/command/undo behavior changed. All 62 related browser checks
and the complete rerun pass; no assertion or safeguard was weakened.
