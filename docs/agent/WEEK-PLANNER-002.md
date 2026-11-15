# WEEK-PLANNER-002 — make the existing week useful for planning

**Authorization:** Gavin selected “Week planner it is then” after the proposal to bring shifts, commitments and workouts together, show what fits and make rearranging an overloaded week easy. Builder Codex; branch `codex/week-planner-001` from fresh master `77c8ab618e8bdd8eddba29d178ac476821eda806` (gym upgrade merged). No competing week-planner PR found; the old shift what-if PR is a different objective and its existing implementation is reused, not replaced.

**Bounded outcome:** a Week planner view within existing Plan Today, with seven local dates, recorded/confirmed/predicted work context, the operator's training-programme assignments or distinctly labelled existing workout suggestions, and cached calendar events with freshness. Tasks show planned attention separately from due dates. Days show factual counts, never a fabricated capacity score or a claim of free time. Earlier deadlines and unplanned/earlier plans stay visible. An explicit move changes only a task's planned date through the existing intent command; deadlines, recurrence, completion and mission rules remain intact. Touch/keyboard controls, clear save/no-op/error/retry handling and a change-again path complete the journey. Existing task detail is still the completion/release workflow.

**Lane:** Protected conservative review of a composed planning experience and guarded reuse of existing plan writes. Independent exact-head review, full required CI and owner merge. No merge by Builder.

**Excluded:** automatic scheduling, task duration/free-time estimates, new workload/recovery algorithms or recommendations, workout per-date override semantics, new calendar connections/writes, primary navigation reordering, schema/migration/dependency/provider changes, CSV or effort-driven training advice. Work shifts retain their existing 16:30 lived-day ownership; task/calendar dates remain calendar dates, explicitly explained.

**REUSE:** existing Week Ahead/context resolution and training-programme resolver; canonical eligible obligations and modifyObligation; local cached calendar; native buttons/selects and BEYOND foundation. Proven agenda + explicit move-date interaction, no drag-only UI or new calendar library. Prior WEEK-PLAN-001 already shipped a read-only week, so this improves it instead of inventing a parallel store.
**OWN:** compositional weekly projection, actual assignment/source labels, explicit date-move/stale-write guard and responsive day selection.
**BUILD FROM SCRATCH:** none beyond BEYOND mappings; native controls meet the interaction need without a dependency.

**Acceptance:** read models write nothing; unknown work stays unknown, assigned programme distinct from suggestions, missing templates honest; eligible tasks only and due/planned dates independent; task moves survive reload/native backup, reject stale/closed/archived state, same-tick double actions and midnight-invalid targets; calendar timezone/all-day handling and cache freshness. Seven-day local/DST boundaries; phone/tablet, keyboard/focus, axe and 16px controls. Existing Plan Today/weekly/TRAIN regressions, full Node, architecture, typecheck/build, full CI and independent review. [Active PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/529).


## Verification and independent handoff

Full Node: 2325 PASS, one existing skip, 280 files. Planner integration 9 PASS in UTC and America/New_York, including DST dates, exclusive-end/overnight calendar overlap, independent due/planned dates, programme assignments without invented work context, confirmed shift changes, stale/concurrent/closed/archived guards, rollback, native backup and in-transaction midnight validation. Focused real Chromium 28 PASS in six files (planner, actual More/weekly navigation, existing smart lists, Week Plan, Week Ahead and friction copy); populated 320/375/768/1024 widths, axe, typed draft retention, midnight reselection, open-sheet retry, same-tick guard, post-commit read failure, Escape/focus and canonical detail route. Architecture, TypeScript and production/PWA build PASS; diff whitespace clean.

Early independent review's three recovery findings were fixed, regression tested and independently rechecked. Final exact-head independent review and full required CI remain prerequisites on the active PR; current result lives in that PR's review/CI handoff, since a follow-up documentation commit itself would require a renewed exact-head review. Gavin alone merges.


## Delivery recovery — 2026-11-15

HARVEST-002 is merged and recommends finishing this existing approved PR before a new improvement. Codex resumes the same preserved branch and objective; no competing Builder or branch found. Integrate fetched master `b4739464` into original head `32fb0f96`; source merges automatically, with two documentation conflicts resolved by preserving both planner and upstream decisions/handoffs. Earlier tests/CI are historical, not renewed approval. Fresh integration verification and independent final-head review are required before ready. No expansion or merge.
