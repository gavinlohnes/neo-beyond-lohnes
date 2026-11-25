# GRAYSON-MONTH-PATTERNS-001 — how his energy, mood and stress line up with his shift week, sleep and training

- **Authorization:** Gavin, 2026-11-24. Campaign row **C5.4** "Pattern review (monthly, private)": "Words and contexts
  over the month, with sleep and run position, only when there are enough entries. Done when: abstains under a floor;
  never names a condition; Alfred sees it only with personal opt-in" (`docs/GRAYSON_CAMPAIGN_PLAN.md`, Campaign 5);
  backlog row 43 ("Partly built: the month letter, month recap and year review already exist. Left: words and contexts
  over the month"). 05:23 CT: **"Just keep pumping out work."** His rule: **"I should be able to edit and tweak or
  correct everything in this app."** Merging this brief approves the defaults below.
- **Lane: PROTECTED** (sensitive data use: check-ins, and what Delta may read). Read only. No new table, event or Dexie
  version, no Engine change. Independent exact-head review, green CI; Gavin merges.
- **Starting commit:** `origin/master` `e7160c68` or later. Re-fetch before starting.
- **Builder:** Claude Code. Branch `claude/grayson-month-patterns-001`. **Reviewer:** a fresh-context reviewer.
- **Order:** Claude Code **#18** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after DELTA-READS-001
  (#12), since Delta's access is one of its rows.

## Objective and benefit
GRAYSON already compares his #tags with his next sleep, next energy and mood and whether he trained
(`application/tagPatterns.ts`, shown in REVIEW · Personal understanding · Patterns), and its month recap tells the
month's story (`monthRecap.ts`). What it doesn't show is how he feels on different kinds of day: first night back on
shift against the third, the first day off against the last, after a short sleep against a full one, on days he
trained against days he didn't. "Words" in the campaign row assumed mood words; GRAYSON's check-ins are 1 to 5 scales
(energy, stress, mood), so this brief compares those.

After this, the Patterns view opens with **Your last 28 days**: one short line for each kind of day that has enough
check-ins, with its numbers and how many days they're from. Thin ones say "can't tell yet".

**Benchmark (read 2026-11-25):** Daylio's stats: "Here you can see how any activity might be influencing your
wellbeing", where the figure "represents a comparison of entries that contain and do not contain activity", with
"Confidence has three levels Low, Medium, and High" and "Low confidence might describe a specific trend, but you
should not take it at face value"
([Daylio FAQ, Activity and Mood Statistics](https://daylio.net/faq/?p=36)). **What we copy:** comparing days with and
without something, and saying how sure it is. **What we add:** the contexts come from what GRAYSON already knows (his
shift run, his main sleep, TRAIN), so he tags nothing. **What we keep out:** the word "influencing" (these line up;
they don't prove a cause), a score, any condition named, and advice.

## Recommended defaults (approved when Gavin merges this brief)
1. **Window:** the last 28 finished lived days. One check-in per day: the day's last one, with corrections applied
   (`getEffectiveCheckIns`).
2. **Measures:** energy, mood and stress. Soreness and alcohol urge are left out of this view.
3. **Kinds of day,** each compared with his other days in the window:
   - **First work night** against later nights in the same run, from `shiftRun` position on the lived day.
   - **First day off** against later days off.
   - **After a short main sleep** against after a longer one, using his own `sleepFindingUnder` number from
     YOUR-NUMBERS-001 (6 hours by default).
   - **Trained** (a finished TRAIN session or run that lived day) against not.
4. **Floors:** a side with fewer than **5** check-ins says "Can't tell yet: 3 of 5 days." A line shows only when both
   sides reach 5. The floor is shown on the view.
5. **How sure:** each line ends with its days, and a difference under half a point reads "about the same". Example:
   "First night back: energy 2.6 from 5 days, later nights 3.4 from 9 days." Nothing says "because", "causes",
   "better" or "worse", and no condition is ever named. Under the lines: "These line up; they don't prove a cause.
   Nothing here changes advice."
6. **Where:** REVIEW · Personal understanding · Patterns, above the tag patterns. Nothing on TODAY, no alert. The monthly
   review gets one link, "Your patterns for the month", that opens the same view.
7. **Delta:** reads this only through a new DELTA-READS-001 row, "Your patterns", default **When I include personal**.
   With that switch off, Delta never sees it. Automatic runs never see it.

## Everything is his to change
The short-sleep line (his number on MORE · Your numbers); whether the view shows (one switch on the view, on by
default); whether Delta may read it (its DELTA-READS row). The check-ins themselves are corrected where they live.

## Design principles check (Vision, Nov 24)
- **Asks nothing:** every context comes from records he already keeps. **Always says why:** each line says how many
  days it's from. **Calm:** inside Review only. **Yours to change:** the sleep line, the view, Delta's access.

## Scope
- `application/monthPatterns.ts` (pure comparison over day facts, plus a query that builds day facts from check-ins,
  `shiftRun`, the main sleep and TRAIN sessions), `ui/screens/review/MonthPatternsSection.tsx` (+ css) in
  `PersonalUnderstanding.tsx`, the link in the monthly review, a `deltaReads.ts` row and its read in
  `operatorContext.ts`.
- Tests: each kind of day's split; the floor at 4 and 5; corrected check-ins used; one check-in per day; "about the
  same" under half a point; no cause words in any line (a copy test); Delta doesn't receive it with the personal switch
  off or in an automatic run; 320 px and axe on the section.

## Excluded
Mood words or tags for feelings. Soreness and alcohol urge. Advice or a recommendation. A yearly or all-time view.
Sharing or exporting this view (EXPORT-ALL exports check-ins themselves).

## Acceptance
- Phone check: REVIEW · Personal understanding · Patterns shows Your last 28 days, with lines for the kinds of day
  that have 5 check-ins on each side and "Can't tell yet" for the rest.
- Change the short-sleep number on MORE · Your numbers: the sleep line's day counts change.
- With the personal switch off, ask Delta about your patterns: it says you haven't shared them.

## Decision record
- Scales, not words, because GRAYSON's check-ins have no feeling words.
- Soreness and alcohol urge stay out of a view about the shift week.
- Five a side, stricter than tag patterns' three, because these lines compare kinds of day he can't choose.

## Stop and ask Gavin if
- DELTA-READS-001 hasn't merged when this is ready (build it with no Delta read at all, and say so in the PR).
- Fewer than half his lived days in the last 28 have a check-in (the view would be mostly "can't tell yet").

## Risks
- **Reading as a verdict:** the copy test and the closing line are the guard.
- **Private data:** Delta's access is personal-only by default, and automatic runs never see it.
