# PHONE-POLISH-001 — suit experience

- Authorization: Gavin requested overall phone polish, then specified “make it feel more like a BatmanBeyond suit. more dynamic and alive. just cooler over all.”
- Refinement: “the existing visual direction needs to be elevated and enhanced.” Carry the established Gotham scene, physical controls, instrument readings and angular typography across the experience; do not substitute a new theme or navigation model.
- Lane: FEATURE, presentation and discovery within existing navigation and capabilities.
- Builder: Codex; branch `codex/phone-polish-001`; PR pending.
- Starting master: `fc94c0da152a0c9de067d6003af3c042ebbe0bf7`.
- Scope: stronger shared header/navigation framing, responsive interaction/entry motion, cohesive meal/programme panels, clearer existing MORE groups and search vocabulary. Real state only; motion stops with reduced-motion preference.
- Exclusions: primary navigation/IA, Engine recommendations, commands/events/schema, backup, providers/dependencies, new features, merge or deployment.
- Acceptance: production build/type check, relevant browser journeys for meal/programme/command navigation, phone widths and reduced motion. Preserve confirmation, RED override and existing destinations.
- REUSE: shared OperatorHeader, shell/skin styles, catalog and existing planning panels. Existing CSS transitions and native controls; no new animation library.
- OWN: BEYOND's suit geometry and visual response to navigation, focus, loading and plan edits.
- BUILD FROM SCRATCH: none; extend current visual surfaces.

## Verification and handoff

- Initial source at `20b1638`: full `npm run verify` PASS — 408 files passed / one skipped; 3,427 tests passed / two skipped; architecture, TypeScript and production/PWA build passed. An earlier exploratory run was interrupted after finding transient-contrast, header-type and search-copy failures; those were fixed before this successful full run.
- After Gavin's visual-elevation refinement: 9 browser files / 145 tests PASS (FieldRehearsal, TrainOperator, GuidedMoreSmallSteps, CommandCatalog, MealPlan, TrainingProgramme, BodyDailyRecord, BodyProgressExperience, WeeklyReviewLoop). Architecture, TypeScript/production/PWA build and whitespace checks PASS. No second full-suite pass is claimed for the final visual refinement.
- Source walkthrough at 320/360/412 px: all four tabs and seven-day meal plans without horizontal overflow; meal-panel axe and reduced motion PASS; no page errors. An initial walkthrough had insufficient synthetic saved meals and was corrected to meet the real three-meal prerequisite.
- Screenshots: `docs/screenshots/phone-polish-001/`, synthetic records, NORMAL and AUTO night vision. These are Chromium captures, not owner phone acceptance.
- The shared shell, Gothic scene lighting, recorded-data instruments, physical controls and planning panels carry the same existing visual vocabulary. No new runtime dependency or timer was introduced.
- Branch pushed. PR creation attempted using `gh pr create --draft`; GitHub GraphQL returned `Forbidden`. No PR, independent review, remote CI, merge, deployment or phone acceptance is claimed.
- Next: open/review the branch PR, complete required remote checks and obtain Gavin's merge approval. API access remains restricted in this environment.
