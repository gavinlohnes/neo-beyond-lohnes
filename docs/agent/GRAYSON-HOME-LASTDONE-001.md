# GRAYSON-HOME-LASTDONE-001 — last done, notes and "done" right on Home

- **Authorization:** Gavin, 2026-11-24. Backlog row **C3.1 · Q7** (LEARN, ranked 3rd), from the ranked backlog he
  approved; campaign plan item **C3.1 "Last done and evidence"** (`docs/GRAYSON_CAMPAIGN_PLAN.md`, Not started).
  His rule (01:26 CT): **"I should be able to edit and tweak or correct everything in this app."** Later: **"Good,
  put that grok Bot to work. Let's get after it, brother".** Merging this brief is his approval of the defaults
  below; Grok Bot builds it once it merges.
- **Lane: FEATURE.** A read of records BEYOND already keeps (`resolvedAt`, `resolutionNote` on SATISFIED "Home: "
  obligations) plus existing commands (`satisfyObligation`, `modifyObligation`). No new table, field, domain
  event, Dexie version, Engine, notification or navigation change. That matches the campaign plan's own lane for
  C3.1 ("Feature (read + existing fields) · S").
- **Starting commit:** `origin/master` `1fd2c47`. Re-fetch before starting.
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225` (Grok Bot ran out of usage; Gavin moved its queue,
  2026-11-25). Branch `ccr-380c4225-home-lastdone`, or the branch name its session allows. **Reviewer:** a fresh-context
  reviewer. **Active PR:** pending.
- **Order:** Delta-track session **#4** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after FLIP-PLAN-001. CHECKIN-EDIT-001 (#651) and
  FIX-UNDO-001 slice 1 (#653) are merged. Overlap check on
  `1fd2c47`: the only open PR is #641 (campaign plan text). CHECKIN-EDIT-001 touches `CheckInCard.tsx`, not
  `CommitmentQuickActions.tsx`; FIX-UNDO-001 touches void readers, `LogEntrySheet` and History, not intent or
  Home. Recheck open PRs at build time. While other PRs are open, leave the tracker and checkpoint to the oldest
  open PR (DEV-FLOW-002, 2026-11-23 amendment, rule 2).

## Objective and benefit

Today Home lists what's coming round but not what was done (Parity Scorecards row H3, MISSING). Marking a job
done happens two screens away in MISSIONS & OBLIGATIONS, and when it was last done is only implied by an old
record's `resolvedAt`. So the house lives in his head: "did I change the furnace filter in August or October?"
After this, each COMING ROUND row says **Last done Oct 2** with the note he left ("16x25x1, Home Depot"), has its
own **DONE** on the row, and opens a short history of past dates.

**Benchmark:** Sweepy's App Store description: "Track the cleanliness of each room in your household;" and
"Prioritize the tasks that need urgent cleaning;" (apps.apple.com/us/app/id1498897320, read 2026-11-24). The
description doesn't say how it ranks, and it says nothing about last-done dates. We copy the idea (the job that
needs it most comes first, and the app knows when it was last done), not its cleanliness score, coins or
streaks, which are anti-goals (scorecard H6, REJECTED). The campaign plan's borrow for C3.1 is Grocy chores (MIT).

## Recommended defaults (approved when Gavin merges this brief)

1. **Last done on every row.** Under each COMING ROUND job: **Last done Oct 2** (his local date of the latest
   SATISFIED "Home: " obligation with the same title), followed by its note if he left one. No earlier done:
   **Not marked done in GRAYSON yet.** RELEASED ("not a task") instances don't count as done.
2. **DONE right on the row (principle 3).** Each row gets **DONE** and **NEW DATE**, reusing TODAY's
   `CommitmentQuickActions`. DONE is one-way (re-open is not an operation), so it asks once, as on TODAY:
   **Mark Furnace filter done? YES, DONE / CANCEL**, with an optional **Note** field ("what you used or found",
   200 characters) saved as the existing `resolutionNote`. The next date is created as it is today
   (`materializeNextOccurrence`, from the due date). NOT A TASK is left off Home rows, because on a repeating
   job it ends the repeats; stopping a job stays in MISSIONS & OBLIGATIONS.
3. **History one tap away (principle 7).** **Done 4 times** under the last-done line opens the past dates with
   their notes, newest first, up to 10. Nothing to manage there.
4. **"Needs it most" is the order, not a score (principle 5).** Rows stay in due-date order, which already puts
   the job furthest past its date first. No score, colour, badge or alarm; "date passed, still open" stays the
   only words for a passed job (HOME-001: "no scores, no overdue alarms").
5. **Says why (principle 6).** The footer becomes: "Mark a job done here or in MISSIONS & OBLIGATIONS; the next
   one is created from its due date."
6. **Same job = same title.** History joins instances by their exact "Home: " title, because occurrences carry
   no series id. Renaming a job starts a fresh history; carrying it over belongs to E6.

## What's editable, and what isn't yet

- His: the note on each done, the next date (NEW DATE), the job itself (MISSIONS & OBLIGATIONS, as today).
- **Not in this brief:** changing a done date after the fact, back-dating a done ("did it Saturday"), and
  editing a note later. Each needs a correction on an obligation record, which is a new event and so PROTECTED.
  They belong with backlog **E6** (edit or remove Home items), which this brief makes easier, because the wrong
  date is now visible.

## Design principles check (Vision, Nov 24)

1. Yours to change: note on each done, NEW DATE on the row; done-date fixes come with E6 (above).
2. Fix, don't ask: DONE asks once because it can't be undone; nothing else asks.
3. One tap for the usual: DONE is on the row, not two screens away.
4. Built around your shift: not affected.
5. Calm: no score, colour, badge or overdue alarm; order by date only.
6. Always says why: the footer says where the next date comes from.
7. Simple first: one last-done line; history behind "Done N times".
8. Tap or say it: Alfred's add-a-home-job tool is unchanged; marking done by voice is not in scope.

## Scope

- `src/application/homeCommands.ts`: `getHomeView(now)` adds, per `due` row, `lastDone?: { on: string;
  note?: string }` and `history: { on: string; note?: string }[]` (newest first, at most 10, `on` =
  `formatLocalDate(new Date(resolvedAt))`), read from `getObligations()` filtered to SATISFIED with the same
  title. One extra obligations read per view, never one per row. Existing fields and order unchanged, so
  `wholeLifeQueries.ts` keeps working.
- `src/ui/screens/today/CommitmentQuickActions.tsx`: two optional props, `withNote?: boolean` (shows the Note
  field in the DONE confirm and passes it to `satisfyObligation`) and `showRelease?: boolean` (default `true`).
  TODAY's call (`TodayScreen.tsx:1818`) is unchanged and behaves exactly as now.
- `src/ui/components/HomePanel.tsx`: the last-done line, "Done N times" disclosure, the quick actions on each
  row (`withNote`, `showRelease={false}`), the footer line, reload after a change.

## Excluded

Photos as evidence (needs storage, PROTECTED); back-dating or correcting a done date or note (E6); a cleanliness
or urgency score, colours or badges; rooms (B12, PROTECTED); a new "next window" calculation from the done date
(next date stays from the due date, as `materializeNextOccurrence` does now); marking done by voice; any change
to TODAY's quick actions; any change to `intentCommands.ts`.

## Files

- **In scope:** `homeCommands.ts`, `HomePanel.tsx`, `CommitmentQuickActions.tsx` (two optional props), CSS in
  the existing section styles, tests, `docs/decisions/GRAYSON-HOME-LASTDONE.md`,
  `docs/agent/screenshots/GRAYSON-HOME-LASTDONE-001/`.
- **Off limits:** `src/domain/**`, `src/engine/**`, `src/persistence/**`, `intentCommands.ts`,
  `intentQueries.ts`, `TodayScreen.tsx`, `alfredTools.ts`, `android/**`, `package.json`.

## REUSE / OWN / BUILD FROM SCRATCH

- **REUSE:** `satisfyObligation` with its `resolutionNote`; `modifyObligation` for NEW DATE;
  `CommitmentQuickActions` (DONE confirm, NEW DATE, error copy); `getObligations()`; `formatLocalDate`;
  `HOME_PREFIX`; the existing `shortDate` and `when` helpers in `HomePanel.tsx`.
- **OWN:** the title join, the last-done and history shape, the row layout.
- **BUILD FROM SCRATCH:** nothing; no library.

## Acceptance

- `tests/homeLastDone.test.ts` (pure and integration, in `TZ=UTC` and `TZ=America/Chicago`): last done is the
  newest SATISFIED instance with the same title; RELEASED instances are ignored; a job never done has no
  `lastDone` and an empty history; notes come through; history is newest first and capped at 10; a job done at
  23:30 Central on Nov 30 reads **Nov 30**, not Dec 1; a non-"Home: " task with a similar title is never joined;
  at most one extra obligations read per view.
- `tests/browser/HomeLastDone.test.tsx`: mark a job done from Home with a note and see "Last done" with that
  date and note, the next date in COMING ROUND, and the note in "Done 1 time"; CANCEL changes nothing; NEW DATE
  moves the row; no NOT A TASK on Home rows; TODAY's quick actions still show NOT A TASK and no Note field; a
  failed save shows the existing error and changes nothing; keyboard only; 320/360/412 px no overflow; axe clean.
- Existing Home, TODAY, intent and recurrence tests stay green. New tests fail on master. `typecheck`,
  `check:architecture`, `check:risk`, build, focused tests in both zones, full `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-HOME-LASTDONE-001/` at 360 px (key ones also 320 and 412):
  COMING ROUND with a last-done line and a never-done row, the DONE confirm with the Note field, the history
  open.
- **Device check (Gavin, Android):** in MORE → HOME, mark the furnace filter (or any job) done with a short note;
  see "Last done" with today's date, the next date, and the note under "Done 1 time"; move another job with
  NEW DATE. Then KEEP / REFINE / RETHINK.

## Decision record

The build PR records the approved defaults in `docs/decisions/GRAYSON-HOME-LASTDONE.md` (DEV-FLOW-002,
2026-11-23 amendment).

## Stop and ask Gavin if

- the work needs a new field, table, event or Dexie version, or a change to `intentCommands.ts`;
- last done can't be read without an extra obligations read per row;
- TODAY's quick actions would change in any way he'd see;
- the next date would be computed differently from today;
- it seems to need a score, colour or alarm to show "needs it most".

## Risks and checks

- **Title join:** a renamed job starts a new history; a manual task titled exactly like a Home job would join it.
  Both are acceptable for S and noted for E6.
- **Old data:** jobs done before this build already have `resolvedAt`, so history appears at once, without notes.
- **Size:** S.
- **Stale facts to recheck at build time:** line numbers above, the `getHomeView` shape, open PRs.
