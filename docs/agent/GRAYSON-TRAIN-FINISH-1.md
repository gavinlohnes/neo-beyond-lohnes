# GRAYSON-TRAIN-FINISH-1 — SHORT forms and Progress & Direction (one batch)

- **Owner authorization:** Gavin, 2026-11-23: "Let's get closer to finishing TRAIN", then chose "Forms + Progress"
  and, for this batch, "Yes, pass on merge. Approved" (merge on independent PASS plus green CI).
- **Lane:** PROTECTED (programme provenance and advancement; a new TRAIN view). Independent exact-head review and green
  CI. **Builder:** Claude Code. **Starting commit:** master `01f99353`. **Branch:** `ccr-380c4225-train`.
- **Operator benefit:** on a tight night he can run a real, linked SHORT version of today's A/B/C session that still
  moves the programme on; and one tap from today's workout he can see whether the training is working, with what
  isn't known said plainly.

## Item 1 — GRAYSON-TRAIN-SHORT-LINK-001 (design GRAYSON-TRAIN-REALITY-FORMS-DESIGN-001, #614)
- Each A/B/C member may own one exactly confirmed SHORT template (ID plus snapshot), mirroring HOME (#616). SHORT is
  loaded gym work: never `home-*` exercises, never the member's FULL template, never shared with another member or
  with HOME.
- Starts record `programmeContext.form = "SHORT"`; COMPLETED with recorded work on the linked exercises advances,
  PARTIAL/abandoned/zero-set holds; conflicting provenance makes NEXT unknown. History names SHORT. Normal progression
  stays on the SHORT template (unlike HOME). A changed/archived SHORT shows for review; FULL stays available.
- Drafts (on request, never linked until confirmed): the first three FULL movements of each member, same IDs and
  prescription; the review lists what FULL leaves out. Linking preserves the earned next member.
- Each member row shows `FULL · SHORT · MINIMUM · HOME · RECOVERY` (SHORT/HOME "not set" until linked). Titles name a
  linked form once.

## Item 2 — GRAYSON-TRAIN-PROGRESS-001 (design GRAYSON_TRAIN_INTELLIGENCE §8)
- TRAIN gains a PROGRESS tab (TRAIN still opens on today's workout). Read only, phone order: assessment (WORKING /
  UNCERTAIN / NEEDS ATTENTION) with confidence; where you are (next member, finished sessions by form, per week);
  this block (none set yet); standards (bench relative to bodyweight, sit-ups observed; sit-and-reach and the
  1.5-mile run named as not recorded); strength by lift from the existing strength review; bodyweight; WHY on demand.
- Evidence floors: 6 finished sessions and 2 comparable lifts in 4 weeks, else UNCERTAIN with what's missing.
  NEEDS ATTENTION when comparable strength is down more than 2%, and it suggests a look, not a change. READY TO ADJUST
  and every adaptation are out of scope. No streak, "missed", failure or "grew" language; no red.

- **REUSE:** HOME link code paths (#616) generalised to a form; `getStrengthReview` (REVIEW-001); programme view,
  bodyweight history, performed sets; `ensureExactCustomTemplateSet`. **OWN:** SHORT link rules and drafts;
  `deriveTrainProgress` and its verdict wording. **BUILD FROM SCRATCH:** none.
- **Exclusions:** no schema/table, Engine, recommendation, target or advice change; no automatic form selection; no
  emphasis blocks, adaptation, guided execution or C4.4; HOME behaviour unchanged except its title no longer repeats
  "HOME".
- **Acceptance:** SHORT unit/integration (drafts, link, partial holds, completed advances, history, progression kept,
  backup round-trip, every refusal, next member preserved); SHORT browser journey at 320/360/412 px; Progress pure
  tests (each state, floors, unknowns, no forbidden words) and browser at 320/360/412 px (state, evidence, WHY, no
  overflow, axe, nothing written); existing programme/HOME suites unchanged; full suite.
