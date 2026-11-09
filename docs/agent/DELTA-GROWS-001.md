# DELTA-GROWS-001 — DELTA grows and learns with you

- **Authorization:** Gavin, 2026-11-09: "Make it like Delta from Red vs Blue. It grows and learns with me." After
  the proposal he replied **"Yes, build DELTA. Yes, with the TODAY line."** That covers the Protected TODAY line
  (part 4), approved directly. DELTA is BEYOND's own original voice, inspired by that kind of calm, exact
  companion. It does not reproduce the show's character, name styling or art. Builder: Claude Code.
- **Builds on** DELTA-002 and DELTA-ADVANCED's guardrails (data first, patterns not causes, counts shown, silence
  is valid) and on JOURNAL-LEARN-001. It's deterministic and free, and needs no Alfred key.

## What
1. **DELTA's notebook:** Review → Personal Understanding opens on **DELTA**. The notebook is a dated list of what
   DELTA has learned: your sleep window on work days and days off, and what each #tag lines up with. A learning's
   date is the day enough evidence first existed (for example the 3rd measured night, or the 3rd tagged day),
   derived from history. **Nothing new is stored.**
2. **What I know about you:** each topic shows KNOWN with its count, "Still learning: n of N", or "Not started. N
   … would teach me". Topics: sleep on work days, sleep on days off, each tag, energy and mood (7 check-ins), and
   training (3 workouts).
3. **One question a day:** on the daily note, aimed at what DELTA knows least (days off, tags, check-ins, work
   days). ANSWER IN NOTE puts the question in the draft; nothing saves until SAVE NOTE.
4. **TODAY line (Protected, approved):** "DELTA learned something new about you" shows only when a learning is
   newer than the last GOT IT (or from the last 2 days the first time). READ expands it in place; GOT IT hides it.
   It's silent otherwise.

## Rules
Every line carries its count. Patterns, not causes. Nothing changes advice or feeds the Engine. Read only, except
the seen mark: device bookkeeping in localStorage, like the other quiet lines.

## Leverage gate
- **REUSE:** SLEEP-RHYTHM-001, JOURNAL-LEARN-001 tag patterns, Personal Understanding, the daily note, the quiet
  TODAY line pattern, and the DELTA-002 / DELTA-ADVANCED guardrails.
- **OWN:** the topic map, the learned-on dating, the question choice and DELTA's wording.
- **BUILD FROM SCRATCH:** none.

## Evidence
- `tests/integration/delta.test.ts`: knowing nothing and saying what would teach it; a sleep window learned and
  dated on the 3rd night; the newLearnings cutoff; still-learning tags and check-ins; question choice.
- `tests/browser/Delta.test.tsx`: Personal Understanding opens on DELTA with an honest empty notebook; the
  question goes into the draft without saving; the TODAY line stays silent when nothing is new.
- PersonalUnderstanding suites updated to open Choices explicitly (DELTA is now the first view).
- Node 2147 tests, and 40 TODAY/App browser files (382 tests), pass locally.

## Follow-on: DELTA and experiments (Gavin: "Yes, experiments", 2026-11-09)
Personal experiments already exist (LOOP step 3, `tryExperiment.ts`: start in the Journal, TODAY's active line,
results against your usual, close with an outcome and lesson). They are connected to DELTA, not rebuilt:
- **DELTA suggests a test:** when a ready tag lines up with next-day sleep at least 30 min shorter, and no
  experiment is running or has tested that tag, DELTA's view offers "DELTA SUGGESTS A TEST… Want to test it for 14
  days?". **START 14-DAY TEST** writes the experiment through the existing `startExperiment` (a "Try:" journal
  entry), only on that tap.
- **The notebook learns from finished experiments**, in your own words: "Learned from your experiment 'Skip
  #latecoffee' (14 days): It helped. Your lesson: …", dated when you closed it.
- **The map** gains "What your experiments showed": known after one finished experiment, still learning while one
  runs.

Tests: `tests/integration/delta.test.ts` (the offer, already tested, finished, running) and
`tests/browser/Delta.test.tsx` (the offer writes exactly one experiment, only on the tap).
