# GRAYSON-ASKS-COUNT-001 — count the questions GRAYSON asks, by area, so "asking less" can be seen going down

- **Authorization:** Gavin, 2026-11-24. Backlog row **B15** (LEARN, ranked 13th) and campaign plan row **C6.9**:
  "Count the questions GRAYSON asks each day by area, shown only on Delta's monthly page, never as a score of you".
  The Vision's section "Asking less, measured" (his yes, Nov 24). At 05:03 CT: **"Yes. Start the next briefs"**; at
  05:23 CT: **"Just keep pumping out work."** North Star: **"know me increasingly well while asking increasingly
  little."** Merging this brief approves the defaults below.
- **Lane: PROTECTED.** A new Dexie table (new stored records) and a new panel in the monthly review. No Engine input,
  recommendation change, event, notification or change to any ask itself.
- **Starting commit:** `origin/master` `92f46cf3` (#667). Re-fetch before starting.
- **Builder:** Claude Code (its lane: DATA, Weekly, Delta's read-only learning). Branch
  `claude/grayson-asks-count-001`. **Reviewer:** Grok Bot. **Active PR:** pending.
- **Order and overlap:** Claude Code **#9** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after GRAYSON-WHAT-MOVES-001. It adds one call at each ask site, so it
  touches many UI files lightly; build it on the latest master and rebase last. Dexie: take the next free version at
  build time (27 is `runningSessions`, #666; a TRAIN brief may take 28 first).

## Objective and benefit
The North Star asks GRAYSON to ask "increasingly little", and the copy gate admits a copied feature only if it means
"fewer asks or better calls". Today nothing measures asks, so neither claim can be checked. After this, the monthly
review shows how many questions GRAYSON put to him in each area over the last four weeks against the four before, and
which ask came up most, so we can see whether the work is paying off and know what to cut next.

**Benchmark:** none of the apps on the scorecards shows its own asks. This is GRAYSON's own idea (the Vision's
"Asking less, measured"), not a copy. The nearest pattern is a product team's internal "prompts shown" metric, shown
here to the one person it's about.

## What counts as an ask (the Vision's three kinds)
A question the app puts to him and waits on, counted when it is **shown**, not when he answers it:
- **FIELD:** each check-in field shown (sleep, energy, mood and the rest), each catch-up item offered, each close
  prompt shown.
- **CONFIRM:** a yes/no he has to give before something happens: an import to confirm, a schedule change or exception
  to confirm, "work day or off?", a save preview's CONFIRM, a log nudge's yes/no.
- **CHOICE:** a pick he's offered that waits on him: Delta's teach-Delta question, a MOVE/KEEP offer, a recovery
  contract offer, a "how did it go?" question, a home-first chip set.

**Not counted:** controls he opens himself (a settings screen, a button he chooses to press), errors, alerts that ask
nothing, anything Delta says in reply to his own question.

## Recommended defaults (approved when Gavin merges this brief)
1. **One call per ask:** `noteAsk({ area, kind, key })` from `application/askCounts.ts`, called when an ask becomes
   visible. `key` names the ask ("checkin.energy", "close.prompt.tomorrow", "logNudge.water"). Each key counts once
   per lived day, however many times it's re-rendered, so reloads and scrolling don't inflate it.
2. **Areas:** TODAY, TRAIN, FOOD, SLEEP, BODY, PLANS, HOME, WORK, DELTA. Each call site passes its area; a key's area
   never changes.
3. **The first set of call sites** (the builder lists every one found in the PR, with any added or left out and why):
   check-in fields (`CheckInCard`, `CheckInSheet`), `ShiftCatchUpCard` items, `CloseCard` prompts, log nudges
   (`logNudgeStore` / the nudge UI), `ReflectOnDecline`, `AskHowItWent`, the recovery contract offer, the shift sleep
   plan's SAVE preview, Guided Start / Teach Delta questions, work-context and schedule-exception confirmations,
   Health Bridge import confirmation, eating-window MOVE/KEEP and the Try review's choice, once those are on master.
4. **Storage:** a new Dexie table `askCounts`, one row per lived date, area, kind and key:
   `{ id: "2026-11-24|TODAY|FIELD|checkin.energy", date, area, kind, key, count: 1, firstAt }`. Kept 400 days, then
   pruned on startup. It goes in the native backup with every other table (the backup exports all tables). No events.
5. **Where it shows:** a panel in the monthly review (`ui/screens/review/WeeklyDashboard.tsx`, beside BODY COMPOSITION
   · LAST 4 WEEKS), headed **"ASKING LESS · LAST 4 WEEKS"**:
   - A line that says what it is: "Questions GRAYSON put to you. This measures the app, not you."
   - One row per area that had asks: the area, the last 4 weeks' total, the 4 weeks before, and the change as words
     ("18 fewer", "6 more", "same"). No colors that judge, no arrows in red or green, no percentages, no score, no
     total across areas.
   - **Asked most:** the three keys with the highest counts, in plain words ("Energy in the check-in, 26 times").
   - Under 8 weeks of counts: "Counting started Nov 24. A comparison needs 8 weeks."
6. **Never an input:** nothing reads `askCounts` except this panel and its tests. Not the Engine, recommendations,
   Delta, the morning read or any nudge, so counting can't change what's asked.

## Everything is his to change
- **Count asks** on or off in MORE, settings (default on). Off stops new counts; the panel then says "Counting is off."
- **Clear the counts:** one button with a confirm and UNDO for 10 seconds.
- **Hide the panel** from the monthly review (default shown).
Stored in `beyond.askCounts.settings.v1` and added to `TRAVELLING_SETTINGS`.

## Design principles check (Vision, Nov 24)
- **Yours to change:** counting can be turned off, cleared or hidden.
- **Fix, don't ask:** it adds no ask of its own.
- **One tap for the usual:** nothing to tap.
- **Built around shift:** counted per lived day.
- **Calm:** words, not colors; no score, no streak, no total.
- **Always says why:** the panel says what it measures and that it's about the app.
- **Simple first:** one panel, area rows, three top asks.
- **Tap or say it:** no change.

## Scope
- New `application/askCounts.ts`: `noteAsk`, `getAskSummary(now)` (pure aggregation in `engine/` or alongside, tested
  without Dexie), pruning, settings read.
- `persistence/db.ts`: the `askCounts` table at the next free version (`id, date, area, key`).
- New `ui/hooks/useNoteAsk.ts`: `useNoteAsk(area, kind, key, visible)` so a component counts once when shown.
- Each call site in default 3: one `useNoteAsk` line, no other change.
- `ui/screens/review/AskingLessPanel.tsx` and its place in `WeeklyDashboard.tsx`.
- `ui/screens/more/` settings: the switch, Clear and Hide.
- `persistence/settingsTransfer.ts`: the settings key.

## Excluded
- Changing, removing or reordering any ask; a daily or weekly view; anything on TODAY; a target or goal number;
  sending counts anywhere; Delta reading or talking about the counts (a later brief can let Delta suggest cuts, on
  his yes); counting Delta's chat replies.

## Acceptance
- `tests/askCounts.test.ts`: the same key twice in a lived day counts once; the next lived day counts again (16:30
  boundary, a 06:10 ask belongs to the night before); off writes nothing; pruning keeps 400 days; summary totals by
  area for two 4-week windows; "Asked most" ties break by key; under 8 weeks returns the "needs 8 weeks" state. Run
  under `TZ=UTC` and `TZ=America/Chicago`, including the DST change.
- `tests/backup.test.ts`: a backup with `askCounts` round-trips; an older backup without the table imports and the
  table stays empty.
- A test per call site (or one table-driven test over a rendered harness) that showing the ask calls `noteAsk` with
  the right area, kind and key, and that re-rendering doesn't count again.
- Browser tests: answer a check-in and run a close, open the monthly review and see the counts; switch off and see
  "Counting is off."; Clear and UNDO; Hide; keyboard only; axe clean; 320/360/412 px no overflow.
- Screenshots in `docs/agent/screenshots/GRAYSON-ASKS-COUNT-001/` at 360 px (key ones 320 and 412): the panel with
  data, the under-8-weeks state, the settings.
- **Device check (Gavin):** after a week of use, the monthly review shows asks by area and the three most-asked.

## Decision record
- Counted when shown, not answered: an ask he ignores still cost him attention.
- Once per key per lived day: a re-render isn't a second question.
- In the monthly review, as "Delta's monthly page": there's no separate Delta monthly page yet, and the monthly review
  is where four-week numbers already live.
- No total and no colors: a single number would read as a score, which the Vision rules out.
- A Dexie table, not a preference: counts are records that should survive a reinstall through the backup.

## Stop and ask Gavin if
- An ask site can't be counted without changing what it shows or when.
- The panel would show any area's number as better or worse in color or as a score.
- The monthly review can't take the panel without pushing BODY COMPOSITION below the fold at 360 px.

## Risks
- **Missed ask sites:** the builder's PR lists every site found; anything missed undercounts, which is safe.
- **Over-counting from re-renders:** the per-day key dedupe and the hook's once-when-visible rule.
- **Reads as judgment:** the copy says it measures the app, and it shows no score, total or color.
