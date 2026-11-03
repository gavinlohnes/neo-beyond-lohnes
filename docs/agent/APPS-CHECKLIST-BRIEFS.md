# APPS-CHECKLIST briefs A1–A9 (Builder: Codex · reviewer/merger: Claude Code)

Owner selection 2026-11-03 ([checklist](../BEYOND_APPS_CHECKLIST.md)). Field test #402 is paused by Gavin.
These are BEYOND's own features modelled on jobs other apps do — not the apps. Only A8 (Google
Calendar) and A9 (IFTTT) connect to real services; Gavin approved both providers by selecting them
(recorded in [UX_DECISIONS](../UX_DECISIONS.md), "2026-11-03 — Apps checklist selection").

## Rules for every item
- One branch per item `codex/<id>` from fresh `origin/master`; open a **ready** PR with the item id in the
  title and REUSE / OWN / BUILD FROM SCRATCH. If GitHub write access fails, stop and tell Gavin.
- Read AGENTS.md, DEV-FLOW-002, the engineering contract and `.claude/rules/` for touched layers.
- Nothing saves without explicit confirmation. Engine keeps recommendation authority. No streaks, guilt,
  miss counts or nagging. New MORE catalog entries are `browse: false`. Synthetic test data only.
- Persistence: `.claude/rules/persistence.md` — backup round-trip, old backups still restore, migration
  tests if the schema changes. No new dependency without saying why (prefer none).
- Before the PR: `npm run typecheck`, relevant tests, `BEYOND_BROWSER_EXECUTABLE=/usr/bin/chromium npm run
  verify` green. Known-flaky timeouts: re-run alone and say so. Never skip or weaken a test.
- 360px, 44px targets, axe. Claude Code reviews independently and merges on PASS + green CI; fix BLOCK
  findings on the same branch. Order: A1, A2, A7a, A4, A5, A3, A6, A7b, A8, A9.

## A1 SNIPPETS-001 — snippets and log templates (Espanso)
Snippets: MORE → SNIPPETS (search-only) saves `;trigger → text`; in any BEYOND text box, a trigger plus
space/punctuation expands; one Backspace undoes. Log templates: a named set of free-helper cards ("usual
pre-shift" = Protein shake + 20 oz water); the name in Alfred, search or drive home produces those cards,
still needing SAVE. Operator config, in backups.

## A2 SHARE-INBOX-001 — share into BEYOND (Raindrop, Shortwave)
Extend the PWA `share_target` (today: Health Bridge files) to also take `title`/`text`/`url`. Items land
in a **Saved** inbox (source, URL, title, text): tag, note, make a task (`createObligation`, link kept),
delete. Health Bridge sharing unchanged. Nothing is fetched from the URL.

## A7a SMART-LISTS-001 — Today / Next 7 / No date (TickTick)
Read-only views over `getCurrentlyEligibleUnresolvedObligations` in Plans. Past-due items show under
Today as "from Mon" — no red, no count, no alarm.

## A4 ROUTINE-PLAYER-001 — routine player (RoutineFlow)
Optional minutes per step; "about N min", and before a shift "start by HH:MM" (labelled scheduled). PLAY
from TODAY's routine row or LIFE → Routines: full-screen, one step at a time, big DONE/SKIP, optional
timer and spoken step names. DONE ticks via `setRoutineStep`. TODAY only gains a PLAY button on the row.

## A5 HABITS-001 — habits without streaks (TickTick)
Habits with optional days (or work days / days off from the saved schedule). One tap marks done for the
lived day; tap again undoes. "4 this week" and a 4-week count only — no streaks, "missed" or miss colour.
Events, in backups, correctable. Free helper understands "did <habit>".

## A3 DAILY-NOTE-001 — daily note and [[links]] (Obsidian)
One note per lived day (16:30→16:30): that day's logs read-only, free text below (draft autosave, SAVE).
The draft lives on the phone only until SAVE. `[[Name]]` in notes/journal/daily notes links to a person, project, collection item or day
(`[[2026-11-03]]`), with autocomplete; each target shows "Mentioned in". Links derived on read.

## A6 COLLECTIONS-001 — collections (Notion)
His own lists ("Gear sizes", "Gift ideas"), up to 6 fields (text, number, date, yes/no, link). Add, edit,
archive, sort, search from the command bar. New saved data → Protected: migration + old-backup restore
tests. Free helper: "add to gift ideas: …" makes a card.

## A7b HIGHLIGHTS-001 — highlights (Readwise)
From a shared item (A2) or a paste: source title/URL, text, note, tags. Searchable, linkable with
`[[ ]]`. Optional "one highlight" in the weekly review only — never TODAY, never a prompt.

## A8 GCAL-SYNC-001 — Google Calendar sync (provider approved)
His own Google sign-in via Google Identity Services in the browser, no server. Scope: one BEYOND
calendar he picks/creates (write) plus read of his primary calendar. Out: scheduled shifts (labelled),
and planned/due tasks if he chooses (titles only — no notes, health, money or memory). In: his events
read-only in Week Ahead and the presence line; never BEYOND records, never free/busy truth for
recommendations. Sync on SYNC, or on open if he turns it on; disconnect removes the token. The token stays on the phone only
(like the Alfred key): never in backups or exports, with a backup round-trip test proving it. The OAuth
client ID comes from an optional build-time env var; the PR body gives Gavin plain phone steps to create it.

## A9 IFTTT-001 — IFTTT webhooks (provider approved)
Off by default. MORE → AUTOMATIONS (search-only): paste his Webhooks key, tick events (work started/ended,
workout finished, day started, routine finished). Payload = event + time only unless he ticks "include
value" on a non-sensitive item. TEST button; last 20 sends logged on the phone. The key stays on the phone only: never in backups or
exports, with a round-trip test proving it. Fire-and-forget POST to
maker.ifttt.com; failures shown, no retry loop.
