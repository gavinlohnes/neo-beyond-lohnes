# HABIT-RHYTHM-001 — recording, recent history and correction

- **Owner approval:** Gavin approved the bounded proposal in this session ("Approved."): Done / Didn't do it / Not recorded, seven-day overview, 28-day history with work days marked, and past-day corrections. Improve the existing habit system, preserve records and foundation identity; no guilt/streaks. Quit tracker unchanged; reminders and sleep/heart-rate comparisons deferred.
- **Lane:** Protected — explicit habit-answer event semantics and historical correction. This bounded owner approval covers those states and corrections; independent exact-head review, green CI and Gavin's merge remain required.
- **Baseline:** freshly fetched master `c9d6702d3f2459aae7840e6cf402e9d6f9628b47` (metric pilot #519 merged); exact baseline recorded in Git history. Builder Codex. Branch `codex/habit-rhythm-001`; active [PR #520](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/520).

## Meaning and scope

Reuse HABIT_SET, existing habits and existing BeyondDay records. New explicit answer is stored additively alongside the compatible `done` boolean. Legacy true remains Done; legacy false remains Not recorded (it was an undo, not an explicit No). Existing setHabitDone callers retain their mark/undo semantics and getHabitDone remains the done-only projection. No migration, historical rewriting, event deletion, new schema/table, provider or dependency.

One seven-day row per active habit and a shared 28-day history/correction sheet, aligned to local 16:30 lived-day boundaries (calendar arithmetic through DST). Work context is marked from recorded day context first; saved schedule is labelled as planned fallback, unknown stays unknown. Missing records stay visible and unrecorded. Browsing never creates days or writes events. Past-day corrections apply only to existing lived-day records: do not fabricate historical day starts or work context to fill gaps. Current scheduling is guidance, never an invented negative answer. Existing create/schedule/archive, Alfred confirmation and DATA's done count remain available.

Writes append a new event at the real correction time, targeting the selected original lived day. Guard reads, no-op detection and event append are atomic. Reject missing/archived habits, unknown/future days and invalid answers. The UI preserves a selected historical day during refresh, catches write errors, blocks double submissions, and offers read retry without replaying writes. No Engine advice, primary tab IA, backup format or quit-tracker change.

## Reuse disposition

- **REUSE:** accepted CHP-001/HARVEST-001 lifestyle parity findings; existing habit definitions/schedules/HABIT_SET; writeAtomically and real event timestamps/seq; canonical lived-day boundary and schedule helpers; foundation Panel/CommandBar, LogSheet focus lifecycle; native backup export/import.
- **OWN:** explicit-answer projection, bounded day-history composition and controls mapped onto existing records.
- **BUILD FROM SCRATCH:** none beyond BEYOND-specific mapping. No donor source/assets copied or new library needed. Harvest licence/decision evidence is preserved rather than re-researched.

## Acceptance

Test legacy compatibility, explicit No versus unrecorded, correction chains/order/no-ops/concurrent writes, historical-day targeting, future/missing guards, 16:30/DST and work-context/schedule truth, read-only browsing, backup/restore preservation and existing Alfred/DATA paths. Real Chromium at 320/360/412/1024, keyboard and focus return, read/write errors, 16px controls, no overflow, axe and honest gaps. Architecture, full Node suite, typecheck/production/PWA build and required full CI; independent exact-head review. Record final results and limitations in checkpoint/PR. Never merge.
