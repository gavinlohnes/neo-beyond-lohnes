# SLEEP-ENGINE-001 — two short main sleeps suggest the reduced session

- **Authority:** Gavin, 2026-10-27: "approve option 1", on the proposal in this session. PROTECTED:
  Engine input, decision trace shape and session suggestion. Every merge is Gavin's; independent
  exact-head review required before merge.
- **Builder / branch:** Claude Code; `ccr-0be4f40f-16m0ja` from `5d960e3` (#299 merged).
- **Rule:** when the Engine recommends EXECUTE_PLANNED_WORK (GREEN check-in, planned work) and the
  two most recent lived days with main sleep — the active lived day and the one before it, or the two
  before that until today's main sleep is logged — are each below the low end of the operator's own
  usual main-sleep range for that kind of day (Weekly's personal baselines: 25th–75th percentile, at
  least 30 minutes wide, from the 56 lived days before the last 7), the recommendation stays the same
  kind, priority and command; its title/rationale say "reduced session", and TODAY and TRAIN suggest
  REDUCED instead of STANDARD.
- **Unchanged:** the locked capacity rule; rule order; RED, end-of-shift, YELLOW, obligation and
  no-action outcomes; recommendations without planned work. No usual range yet (still learning), an
  unknown work context or a missing night → no change. The operator can always choose STANDARD.
- **One source of truth:** `submitCheckIn` derives the streak (`engine/sleepStreak.ts`) and passes
  it into `evaluate`; the trace keeps `shortSleepStreak` and the judged nights. TODAY and TRAIN read
  the issued recommendation's trace (`traceShortSleepStreak`), so card, row and TRAIN never disagree.
  Older recommendations have no entry and read false. ENGINE_VERSION 0.1.0 → 0.2.0.
- **REUSE:** personal baselines (bands, lived-day grouping), the evaluate input pattern
  (`hasPlannedWork`), the existing STANDARD/REDUCED variants and override, "Why this?".
  **OWN:** the two-night rule. **BUILD FROM SCRATCH:** none.
- **Excluded:** capacity changes, sleep driving RECOVER/STABILIZE, naps, Garmin-only "unusual"
  readings as Engine input, notifications, new records or schema.

## Evidence

Engine: evaluate (incl. "never changes other outcomes") and trainSuggestion 44/44+; integration
`sleepEngine.test.ts` 3/3 (streak with evidence, today's sleep not yet logged, one short night,
still learning, YELLOW); copy 33/33 incl. old-trace wording; TRAIN copy names sleep, not YELLOW
(bug caught before shipping); browser `SleepEngine.test.tsx` 4/4 at 320/390 with axe;
`TodayScreen.test.tsx` updated for the new closing line. Full verify and review: PR.
