# GRAYSON-C6.5-001 — Override as evidence: "What did I miss?"

- **Owner authorization:** Gavin, 2026-11-25, "1.": approve as proposed, with all five reasons, the 3-in-30-days
  threshold, and both the notebook and the weekly check (still at most three a week).
- **Lane:** PROTECTED (learning semantics; a new optional field on a stored record). Independent exact-head review,
  green CI, Gavin's merge. **Builder:** Claude Code. **Branch:** `ccr-380c4225-1es42i`.
- **Operator benefit:** when he declines advice, Delta learns what its data missed (his shift ran over, he's sore,
  he already did it) instead of only recording a "no". A repeated reason becomes something Delta asks him about, and
  he confirms or drops it.
- **Rules:**
  - **The tap.** After the existing "Why not?" reason, one optional row: *Already did it · Sore or hurting · Shift or
    work ran over · Family or home · Felt better than it looked*. A second tap clears it.
    - It is saved as a new optional `missed` field on the same Decision Journal entry (`linkedRecommendationId`
      already links it to the recommendation).
    - Set at creation only, and refused without a declined recommendation.
    - Older builds ignore the field. No new table, index or Dexie version.
  - **The learning (`delta.ts` `overrideLearnings`, pure).**
    - The same reason, OVERRIDE_MIN (3) or more times within OVERRIDE_DAYS (30), for the same kind of advice, which is
      read from the linked recommendation.
    - It becomes an `OVERRIDE` learning dated the day the third landed: "When BEYOND suggested the planned work, you
      said 'Shift or work ran over' 3 times since Nov 2."
    - Fewer than three, older ones, or a different kind or reason: nothing.
  - **The lifecycle (C6.1).** OBSERVED until he answers. Answerable with Keep / Narrow / Not true / Drop / Undo, and
    included in the weekly check, still at most three a week. Once the reasons fall out of the 30-day window, a kept
    one is OUTDATED (no longer derivable).
  - **Alfred.** Personal (built from his journal), so it reaches Alfred only with the personal opt-in, and with his
    stance.
  - **Never** changes a recommendation, a plan or the Engine.
- **REUSE:**
  - the existing decline reflection (`ReflectOnDecline`, `reflectOnDecline`, the Decision Journal);
  - the C6.1 lifecycle and answer control, and the C6.2 weekly pick;
  - `deltaFacts`' personal gate.
- **OWN:** the reasons, the threshold and the OVERRIDE derivation. **BUILD FROM SCRATCH:** none.
- **Coordination:** #694 (asks count) also edits `ReflectOnDecline.tsx` and `LearningAnswer.tsx`, on different lines.
- **Acceptance:**
  - `tests/integration/overrideEvidence.test.ts`:
    - the threshold, the window, and separation by kind and reason;
    - the learnedOn date;
    - OBSERVED, asked weekly, and the personal gate for Alfred;
    - from the records: the tap saved, joined to the advice kind, three make a learning;
    - a reason without a declined recommendation is refused.
  - `tests/browser/Reflect.test.tsx`:
    - the row appears only after a reason;
    - 44 px chips; a second tap clears;
    - saved with the decline; the advice is untouched;
    - 320 px, axe clean.
  - Existing Delta, journal, weekly and coach suites pass.
  - Screenshot: `docs/agent/screenshots/grayson-c6.5/`.
