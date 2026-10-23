# DELTA-002 — what changed, and why it matters (direction locked 2026-10-23)

- **Authority:** Gavin, 2026-10-23: "I really like the idea. Lock it in for right now." This locks the
  *direction*. It does not authorize implementation; each slice still needs its own brief/approval
  per DEV-FLOW-002, and the items marked Protected below need explicit owner approval.
- **Not the removed advisor.** "Delta" here is a voice for BEYOND's existing deterministic
  intelligence, not an AI assistant. The 2026-10-09 ruling ("smart by design, AI optional; Delta is
  not required") stands; item 6 would need a deliberate amendment of it.
- **Rule:** DELTA explains what BEYOND already computed. It never decides, ranks causes or scores.

## The six parts

1. **What changed (the delta):** on opening, the differences since last shift against your own
   usuals: e.g. "sleep 1h 10m under your usual · weight down 0.6 lb · no workout in 4 days". Facts,
   no scores. Routine.
2. **Every claim taps through to its records.** Each sentence opens the records it came from.
   Routine (required by doctrine: inspectable, correctable).
3. **Questions as buttons, not typing:** Why this? · What changed? · What's normal for me? · What
   would help most? Answered by rules from existing data (extends the Review question hub). Routine,
   except "What would help most?" if it ranks factors (Protected: recommendation priority).
4. **"Not enough data" becomes a goal:** "Log meals on 6 more days and BEYOND can estimate what you
   really burn." Routine.
5. **One-tap pushback** ("Not today" / "Wrong", optional reason) on a recommendation, reusing the
   decision journal where possible. Protected if it adds a new event/command.
6. **AI later, boxed:** a model may only rephrase sentences the rules wrote, numbers filled from
   records, with the rules version as fallback. Protected; amends the 2026-10-09 ruling.

## Sequence

1. Finish WHOLE-PICTURE-001 (Codex; overlaps the weekly side) before starting DELTA work.
2. First DELTA slice: (1) "what changed" + (3) "Why this?" on TODAY, from one shared "today's
   readings" source so the explanation can never disagree with the recommendation (see the
   FRICTION-001 ARCH notes).
3. Live with it on shift; then decide on (4), (5), the remaining buttons, and whether (6) is wanted.

## Slice 1 — "Why this?" in plain words (owner go, 2026-10-23)

Gavin: "yes start step 1", after agreeing to drop the separate "since last shift" block (TODAY's tiles
already show usuals; Whole Picture covers comparisons) and to decide separately whether the Engine
should consider sleep (it currently doesn't; that would be a Protected recommendation change).

- **Built:** `explainRecommendation` turns the recommendation's own DecisionTrace into 1–3 sentences
  (e.g. "Your check-in put capacity at RED: energy is critically low (1 of 5) and stress is very high
  (5 of 5).") and always ends by saying the Engine decides from check-in, plan, shift and commitments,
  not sleep, weight or training. It leads the existing "How BEYOND decided" panel; the rules in
  detail and the check-in values (the evidence) stay right below.
- **Boundaries:** reads the trace only, never recomputes; no Engine, schema or recommendation change.
- **Next decisions:** should the Engine consider sleep (Protected)? Tile marks when a reading leaves
  your usual (Routine, small).

