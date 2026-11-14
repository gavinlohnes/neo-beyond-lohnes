# GYM-UPGRADE-001 — complete live workout experience

- **Owner approval:** Gavin deferred CSV and approved this proposed scope: clearer live workout with the visual foundation, optional “how many reps left” effort recording, warm-up/working-set labels with preparation excluded from working statistics, and a clearer finish compared with the previous session. “Approved.” Effort does not change training recommendations; that requires a separate decision.
- **Lane:** Protected — additive set metadata and working-set statistics. Independent exact-head review, green CI and Gavin's merge required. Builder Codex. Fresh branch `codex/gym-upgrade-001` from fetched master `0ffc2a3f` (full baseline in Git parent); one PR, pending creation. No overlapping training PR found.

## Experience and meaning

Reuse TRAIN's active workout, normal and full-screen Gym Mode, rest, previous values, supersets, substitutions, calculators and undo. Working set remains the default, so the normal log path stays quick. An optional warm-up mode records additional preparation without filling a prescribed working slot. Optional integer reps-in-reserve (0–10) records the operator's estimate for a working set; blank is unknown, never zero, and previous effort is never copied automatically.

New fields are additive on existing performedSets/events, no migration/table/provider/dependency. Legacy rows with no kind stay working sets. Warm-ups remain actual non-skipped history, with undo and export/restore intact, but cannot inflate working volume/counts, records, strength trends, completion or A/B/C advancement. Existing deterministic progression rules receive working evidence only; effort is never an Engine input. No thresholds, recommendation priorities, templates or capacity policy changed.

Keep canonical append/undo behavior and atomic row/event writes; real event sequence orders same-time sets. New log controls guard duplicate actions and preserve data on read failures; recovery never replays a write. Persist in-progress entry drafts per session so the normal/Gym views share them and reload resumes intent. Read-only recap compares finished sessions in the same template/variant, matching actual lifts including substitutions; report recorded sets/volume changes, not an invented score or a claim of strength from incomparable workouts. First sessions and changed lifts are honest.

Visual work is confined to live TRAIN, Gym Mode, set-history labels and the finish/last-session recap. Reuse the existing foundation; no new emblem/skyline placement or primary-tab reordering. No nutrition, sleep, calendar, habits, CSV, drop-set modes, reminders or automatic coaching expansion.

## Reuse disposition

- **REUSE:** accepted HARVEST-001 set-effort and live-workout findings, existing performedSets/SET_LOGGED/SET_UNDONE and atomic writes, progression/record formulas, foundation tokens/frames, existing TRAIN/Gym handlers and calculators, native backup and history readers.
- **OWN:** optional metadata mapping, consistent working-evidence boundary and comparison/entry presentation.
- **BUILD FROM SCRATCH:** none beyond BEYOND-specific mapping. No donor source/assets or dependency introduced.

## Acceptance

Test legacy classification, explicit 0 effort versus unknown, validation, metadata row/event/backup round-trip, warm-ups not advancing prescribed slots/rotation or inflating every statistic/record/advisory, atomic failure/duplicate/undo/reload behavior, comparable-versus-changed lifts and first-session recap. Real Chromium normal/Gym flow, rest/skip/substitution/superset/finish/partial/resume, keyboard/focus, reduced motion, 320–1024 widths, 16px controls, axe. Full Node, focused browser regressions, architecture, typecheck/build and full required CI. Exact-head independent review; never merge.
