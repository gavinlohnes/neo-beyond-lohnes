# GRAYSON-CLOSE-GAPS-001 — the close names what's missing, in one line

- **Authorization:** Gavin, 2026-11-24. On the five logging ideas: **"I don't necessarily need #3. But I like the
  rest. I don't want it to be annoying and pester me. Start implementing now."** Then: **"Give it to grok."** This
  brief is idea 5: when he closes the day, one line says what didn't get logged, and one tap opens Delta to fix it.
  Merging this brief is his approval of the defaults below. His rule: **"I should be able to edit and tweak or
  correct everything in this app."**
- **Lane: PROTECTED.** It changes TODAY after SHIFT DOWN and reads log history, the same lane LOG-CATCHUP-001 used
  for the card beside it. No new table, domain event, Dexie version, notification or alert kind.
- **Starting commit:** `origin/master` `14616be`. Re-fetch before starting.
- **Builder:** Grok Bot. Branch `grok/grayson-close-gaps-001`. **Active PR:** pending. Reviewer: Claude Code (Codex
  is offline), or Gavin picks.
- **Order and overlap:** after GRAYSON-LOG-NUDGE-001. Both read meals; if LOG-NUDGE is merged first, reuse its
  void-aware meal read. This brief touches `CloseCard.tsx` and `application/dayClose.ts`; LOG-NUDGE touches
  `TodayNumbers.tsx`. No open PRs on `14616be`. Recheck at build time; tracker to the oldest open PR.

## Objective and benefit
The close (C1.3/C1.4) already appears after SHIFT DOWN, and the shift catch-up (LOG-CATCHUP-001) already asks about
meals and water he usually has at work. What nothing tells him is the gap outside the shift, or that he hasn't
weighed in for a while, which matters for his goal: **"I'm trying to be healthy, lose weight but keep muscle... I'd
like to get to 165 or 170."** A trend weight needs regular weigh-ins.

**Benchmark (read 2026-11-24):** Yazio sends an evening reminder only "If you haven't logged anything during the day"
([Yazio help](https://help.yazio.com/hc/en-us/articles/4406890595601-Set-Up-Reminders-in-Yazio)). Simple sends an
end-of-day push with a summary of progress
([Simple help](https://simplefastingapp.zendesk.com/hc/en-us/articles/4408491733521-How-to-configure-your-notifications)).
**What we copy:** an end-of-day look at what is missing. **What we do better:** it is not a push and not a summary
to read; it appears inside the close he already opens, names the gap in plain words, and one tap fixes it.

## Recommended defaults (approved when Gavin merges this brief)
1. **Where:** one line at the top of `CloseCard`, above the prompts, muted, no red. Only the close shown after
   SHIFT DOWN; nothing on END DAY, which he doesn't use. Shown only when at least one gap applies.
2. **Gaps, at most two named, in this order:**
   - **Meals:** no meal logged in this lived day outside the shift window, when that day kind has learned usual
     times (from LOG-NUDGE-001 if merged, otherwise the same rule: a meal cluster on at least 4 of the last 28 days
     of that kind). Words: "No meals logged today outside your shift." A meal the catch-up just logged counts.
   - **Weight:** no weigh-in in the last **3 days**. Words: "No weigh-in since Nov 21." With none ever: "No weigh-in
     yet."
3. **Tap the line:** `askAlfred(...)` with the text it names, e.g. "I ate " for meals, or "My weight this morning
   was " for weight; when both apply, "I ate ". Nothing is sent until he sends it.
4. **No guilt:** no counts of missed days, no streak, no "you forgot". The line says what is missing, never how
   often.
5. **Dismiss:** SKIP on the close already ends the close; the gaps line goes with it. No separate dismiss.

## What's editable, and what isn't yet
- **Editable:** in the close's existing "pick your questions" chooser, a checkbox "Tell me what's missing" (default
  **on**), and the weigh-in gap in days (1–14, default 3). Stored in localStorage `beyond.close.gaps.v1`, added to
  `TRAVELLING_SETTINGS` as "Evening close gaps".
- **Not editable yet:** which gaps exist (meals and weight only).

## Design principles check (Vision, Nov 24)
- **Yours to change:** on/off and the weigh-in gap.
- **Fix, don't ask:** the tap opens the fix.
- **One tap for the usual:** one tap to Delta.
- **Built around shift:** lives in the post-shift close; shift meals are the catch-up's.
- **Calm:** one muted line, inside a card he already chose to open; nothing pushed.
- **Always says why:** the line is the reason.
- **Simple first:** two gaps only.
- **Tap or say it:** Delta takes it in words.

## Scope
- `application/dayClose.ts`: pure `deriveCloseGaps(input)` and an async read for it (meals of the lived day, the
  shift window, the latest weigh-in date).
- `ui/screens/today/CloseCard.tsx`: the line and its tap; the chooser checkbox and weigh-in setting.
- `ui/screens/today/closeStore.ts`: read/write `beyond.close.gaps.v1`.
- `persistence/settingsTransfer.ts`: one `TRAVELLING_SETTINGS` entry.

## Excluded
- No push, no alert kind, no Health Bridge change.
- No water, protein or sleep gaps (water and shift meals are the catch-up's; sleep has the WAKE alert).
- No change to END DAY, the catch-up card, or Delta's tools.

## Files
- **In scope:** the files under Scope, their tests, screenshots.
- **Off limits:** `domain/`, `persistence/db.ts`, `bridgePlan.ts`, `ShiftCatchUpCard.tsx`, `TodayNumbers.tsx`.

## REUSE / OWN / BUILD FROM SCRATCH
- **REUSE:** `getMealEntries` with void readers; `getBodyweightEntries` / the weight trend reads (WEIGHT-TREND-001)
  for the latest weigh-in date; `livedDayShiftWindow`; `askAlfred`; `closeStore.ts`.
- **OWN:** `deriveCloseGaps`.
- **BUILD FROM SCRATCH:** nothing else.

## Acceptance
- `tests/closeGaps.test.ts` (pure, `TZ=UTC` and `TZ=America/Chicago`): meals gap only with learned usual times; a
  meal inside the shift does not clear the outside-shift gap, one outside does; a voided meal does not count;
  weigh-in gap at 3 days and at an edited value; "No weigh-in yet" with none; at most two gaps; off means none; a
  weigh-in at 23:30 Central reads as that date.
- `tests/browser/CloseGaps.test.tsx`: the line shows in the close after SHIFT DOWN, not otherwise; the tap opens Delta
  with the right text and sends nothing; the chooser turns it off; SKIP hides it; keyboard only; axe clean;
  320/360/412 px no overflow.
- Existing close, catch-up and TODAY tests stay green. New tests fail on master. `typecheck`, `check:architecture`,
  `check:risk`, build, focused tests in both zones, full `TZ=UTC npm run verify`.
- **Screenshots** in `docs/agent/screenshots/GRAYSON-CLOSE-GAPS-001/` at 360 px (key ones 320 and 412): the close
  with both gaps, with one, and the chooser setting.
- **Device check (Gavin, Android):** after a shift, tap SHIFT DOWN without having logged a meal outside work; see the
  line in the close; tap it and log through Delta. Then KEEP / REFINE / RETHINK.

## Decision record
`docs/decisions/GRAYSON-CLOSE-GAPS-001.md`: the defaults, why it lives in the close and not a push, and the
benchmarks.

## Stop and ask Gavin if
- The close would show the gaps line when it otherwise shows nothing he picked (it should; confirm in the PR with a
  screenshot rather than ask).
- Adding the line pushes the close's SAVE / SKIP below the first screen at 360 px.
- Any gap seems to need a new event or field.

## Risks and checks
- **Nagging:** two gaps at most, no counts, gone with SKIP, an off switch.
- **False gaps:** meals only when he has usual times; shift meals belong to the catch-up, which runs first.
