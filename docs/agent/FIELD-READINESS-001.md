# FIELD-READINESS-001 — real-world operational validation (first correction)

- **Authorization:** Gavin, 2026-11-13 ("FIELD-READINESS-001 — Real-World Operational Validation").
- **Lane:** Feature. Read-side only: no Engine, schema, event, command or primary-IA change.
- **Builder / branch:** Claude Code; `ccr-88f5c085-field-readiness` from `993363e0` (#498 merged).
- **Leverage gate:**
  - **REUSE:** `shiftRun` and `describeShiftRun` (SHIFT-RUN-001), plus `getConfirmedExceptions` (SCHEDULE-EXCEPTIONS-001).
  - **OWN:** passing confirmed changes into the run, and saying so.
  - **BUILD FROM SCRATCH:** none.
- **Method:** a code and automated-test trace of a night-shift week (Gavin's 2-2-3 rotation, Week B from Mon Nov 16
  2026) with confirmed overtime and time off. The trace covered TODAY and Life State, 16:30 day start, the shift run,
  Week Ahead and the energy forecast, training, Alfred's context and the free helper. **No real-world field test was
  done.**

## Findings, ranked

| # | Rank | Finding | Status |
|---|---|---|---|
| 1 | Misleading information | `shiftRun` read the rotation only. With Mon 23 confirmed off, Sunday's TODAY said "day off 3 of 3 · back on Mon"; so did Life State's line, the header presence line, COMMAND's rail, the shift recovery brief and the free helper. Week Ahead and Alfred correctly said Monday was off, so the screens contradicted each other. | **Verified; fixed here.** `shiftRun` takes the confirmed changes, and the wording adds "· with a confirmed change". |
| 2 | Operator effort | Moving a confirmed change to another day has no UI. The UI path is cancel, then confirm again. | Verified. A small follow-up, not done. |
| 3 | — | Week Ahead, energy forecast, training slot, Alfred and the free helper "when do I work" already agree on RECORDED > CONFIRMED > PREDICTED. 16:30 and overnight ownership are covered by tests. | Verified, no defect. |

## Remaining field-test needs

- The rotation field test on a real work day (#402).
- The 16:30 day start on the phone, with a confirmed change in place.
- Whether the header's presence line is still readable at 360 px when it carries "· with a confirmed change".
