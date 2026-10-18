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

Implementation is complete, including the photo timeline/comparison. Focused Node/browser
verification: 42 passed. Built PWA at 320/360/412: offline reads and explicit saves, cold reloads,
retained drafts, correction provenance, 44 px controls, unclipped labels and zero axe violations.
[Reproduction and synthetic screenshots](../screenshots/body-progress-001/README.md).
Full regression gate is running after integration of master `85db25b`; final results and exact
head will be recorded in the PR/checkpoint. No physical-device or independent-review PASS claimed.

Full verification also exposed an inherited meal-reopen focus race in unchanged BODY code:
a slow read can outlast the 250 ms shortcut positioner, leaving the temporary shell heading
focused after recovery. The existing CommandCatalog regression now holds that read past the
positioner and reproduced the failure before correction. The BODY-only handoff completes after
the shell landing and recognizes its placeholder heading, while leaving chosen controls alone.
No meal data/command/undo behavior changed. All 62 related browser checks pass after the repair;
the full gate is rerun because source changed.
