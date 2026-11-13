# LIFE-STATE-002 — Life-State Engine, slice 2: the moments between states

- **Authorization:** Gavin, 2026-11-13: "Life-State Engine — Slice 2: make state transitions explicit, calm, and
  useful." **Lane:** Protected (TODAY); independent exact-head review required.
- **Builder / branch:** Claude Code; `ccr-88f5c085-life-state-2` from `14539fa5` (#494 merged).
- **Scope:** derive the transition into today's state (run starts, last shift, run over, flip day, free days) from
  slice 1's model; show it on TODAY; one optional, confirm-first light-day plan item when a run ends.
- **Exclusions:** Overloaded; full recovery contracts (slice 3); evidence; training coupling; capture; family sharing;
  Engine/recommendation, schema, command or event changes; new tracking; TODAY redesign.
- **REUSE:** slice 1's `deriveLifeState` / `lifeStateInput` (yesterday's state by the same rule), `createObligation`,
  the preview → CONFIRM pattern, the existing state band.
- **OWN:** the moment rule and wording (`src/application/lifeTransition.ts`), the band's moment line and follow-up.
- **BUILD FROM SCRATCH:** none beyond that mapping.
- **Acceptance:** unit tests for each moment, mid-state silence, one-shift runs, unknown yesterday, recorded-over-
  scheduled, calm words and the 2-2-3 week; browser tests for each moment on TODAY, mid-run silence, and the
  follow-up (preview, CANCEL writes nothing, CONFIRM writes one item, not offered twice).
