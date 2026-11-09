# JOURNAL-LEARN-001 — BEYOND learns you, from your journal and log

- **Authorization:** Gavin, 2026-11-09: "Let's focus on the journal and log and letting beyond learn me." The Builder
  proposed three parts and Gavin replied **"Yes, build it. Then we add to it."** **Lane: routine:** no new stored data
  type, schema, provider, dependency, Engine or advice change. Builder: Claude Code. One PR per part.

## Parts
1. **Guided note and #tags (this PR).** The daily note's prompts that fit today (work day / day off) come first.
   Under the note there's a row of one-tap **#tags**: your most-used tags, then suggestions (#latecoffee, #alcohol,
   #nap, #sauna, #argument, #goodtalk), plus your own. Tags are plain words written into the note, so they back up,
   search and edit like any text. Nothing saves until SAVE NOTE.
2. **What your tags line up with.** For a tag on 3 or more recorded days, compare those days with untagged days on
   measures BEYOND already records: that night's main sleep, the next check-in's energy and mood, and training.
   Counts and averages only, each with its number of days. "Not enough days yet" otherwise. No score, cause claim
   or advice.
3. **"What BEYOND knows about you."** One read-only page that gathers what is already learned: confirmed Alfred
   memory facts (each forgettable through the existing flow), usual ranges by day kind, sleep rhythm and tag
   patterns, each with its source.

## Leverage gate
- **REUSE:**
  - the daily note and its templates (NOTE-TEMPLATES-001);
  - the Day Ledger and check-ins;
  - personal baselines, SLEEP-RHYTHM-001 and Alfred memory;
  - the Bearable / Daylio tag-correlation pattern.
- **OWN:** the tag grammar and the plain wording.
- **BUILD FROM SCRATCH:** none.

## Evidence (part 1)
- `tests/integration/noteTags.test.ts`: tag grammar (link fragments and numbers are not tags), toggling without
  disturbing other text, and choices ordered by use.
- `tests/browser/NoteTags.test.tsx`: tap, add your own tag, untap; nothing saved until SAVE NOTE; saved text.
- DailyNote001 and related suites pass (90 tests).
