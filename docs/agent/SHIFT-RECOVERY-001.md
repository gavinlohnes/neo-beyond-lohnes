# SHIFT-RECOVERY-001 — recovery across the rotation

- **Authorization / Builder / lane:** Gavin approved the recommended Launch 3.0 Shift Recovery
  objective on 2026-11-02 ("Approved. Begin"). Codex; PROTECTED presentation of recovery guidance.
- **Starting commit / branch:** `fc94c0da152a0c9de067d6003af3c042ebbe0bf7`;
  `codex/shift-recovery-001`; PR pending.
- **Outcome:** TODAY names the final shift, first day off and first shift back, and connects that
  position to Gavin's own recorded sleep and training patterns. It protects the first post-run
  sleep by leaving it unallocated and gives factual flip/day-off context without medical advice.
- **Scope:** read-only projection from the saved schedule, recorded work/off context, canonical
  main sleep, check-ins and workouts; concise phone surface with source/limits disclosure.
- **Exclusions:** no Engine or recommendation-priority change, diagnosis/circadian claim, inferred
  recovery state, silent scheduling, commitment move, sleep/work record, schema/event, provider,
  dependency, notification or primary-navigation change.
- **REUSE:** `shiftRun`, Whole Picture's canonical recorded rows, `flips`/`flipSummary`,
  `runPositions`, existing TODAY disclosure and phone visual grammar.
- **OWN:** the bounded mapping from current rotation position to a factual recovery/day-off brief.
- **BUILD FROM SCRATCH:** none; this composes already-shipped rotation evidence.
- **Finished when:** thin/missing history abstains honestly; DST/current-position behavior and
  read-only guarantees are tested; phone-width/accessibility, focused regression, typecheck/build,
  required CI and independent exact-head review pass. Gavin separately decides merge.
