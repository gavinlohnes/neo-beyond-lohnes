# SUPERCHARGE-001 — free helper, Alfred and DELTA work together

- **Authorization:** Gavin, 2026-11-09, picked items **1, 2, 4, 5** from the Builder's list. **Lane: routine.**
  These are readings and answers only, over existing data. There is no new stored data, provider or dependency,
  and no Engine or advice change. Item 2 adds facts to Alfred's existing context (Anthropic, approved); how
  Alfred is called is unchanged. Builder: Claude Code.

## What
1. **Ask DELTA, free.** Alfred's box and search answer DELTA questions offline, before any paid call: "what have
   you learned about me", "anything unusual", "what does #tag line up with", "when do I usually sleep", "how did my
   experiment go", "what moves the needle". They use the notebook's counted words, honest "not yet" answers, and
   leave everything else on its usual route. (`ui/components/DeltaViews.tsx` `deltaAnswer`.)
2. **Alfred knows what DELTA knows.** Alfred's context gains "What DELTA has learned" as counted facts (new kind
   `DELTA`). Sleep windows and unusual readings are always included. Tag patterns, finished experiments and
   good-week patterns rest on daily notes or the journal, so they are included **only with the personal opt-in**,
   the same rule as daily notes. "A pattern, not a cause" appears in every line. (`application/deltaFacts.ts`.)
3. **Every DELTA line taps through.** Notebook lines carry their evidence. "Show the N days behind this" opens each
   day; a finished experiment opens in the Journal. This completes the DELTA-ADVANCED guardrail "every claim taps
   through".
4. **More answered free:** steps so far today, the latest resting heart rate, the latest weight, and the last 7
   lived days against the 7 before (sleep, protein, workouts, each with day counts). Missing values are said to be
   missing, never zero ("No Garmin steps for today yet"). Lift questions ("what weight did I squat") keep their
   own route.
- **Also (#468 review note):** a #tag only ranks in "good weeks" once both sides rest on at least 3 noted weeks.

## Leverage gate
- **REUSE:** FREE-HELPER-001's answer route, Alfred's operator context and personal opt-in, DELTA, openRecord,
  `getMeasuredSnapshot` and the Day Ledger.
- **OWN:** the question patterns and the fact wording.
- **BUILD FROM SCRATCH:** none.

## Evidence
- `tests/integration/deltaAnswer.test.ts`: every DELTA question shape, plus null for others.
- `tests/integration/deltaFacts.test.ts`: exact facts and the opt-in gate.
- `tests/integration/delta.test.ts`: evidence for tap-through.
- `tests/integration/freeAnswers.test.ts`: the new answers, missing-not-zero, and the lift question left alone.
- `tests/integration/needle.test.ts`: the noted-week floor.
- Alfred, search and operator-context suites pass (170 browser tests and 27 node tests).
