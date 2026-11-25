# GRAYSON-COMING-UP-001 — a job or date can show up days before it's due

- **Authorization:** Gavin, 2026-11-24. Backlog row **C3.2** (SHAPE): "Surface a job before it's due (lead time,
  'coming up')" (`/mnt/project-files/grayson/BACKLOG.md`, row 21), campaign Campaign 3. 07:02 CT: **"first the hard
  pieces that other features plug into"** (C7.3's lead-time alert plugs into this). His rule: **"I should be able to
  edit and tweak or correct everything in this app."** 05:23 CT: **"Just keep pumping out work."** Merging this brief
  approves the defaults below, including the change to the attention gate named under "A rule this changes".
- **Lane: PROTECTED** (a new stored field on reminders, and `engine/obligationRelevance.ts`, which decides what earns
  TODAY's attention). Optional field only, no new table, no Dexie version. Independent exact-head review, green CI;
  Gavin merges. It counts as the one TODAY change open at a time.
- **Starting commit:** `origin/master` `f70a4a65` or later. Re-fetch before starting. If HOME-PEOPLE-EDIT-001 is open,
  rebase on it once it merges (both edit the Home and People forms).
- **Builder:** Claude Code, the Delta-track session `ccr-380c4225`. Branch `ccr-380c4225-coming-up`, or the branch name
  its session allows. **Reviewer:** a fresh-context reviewer.
- **Order:** Delta-track session **#12** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-25), after
  HOME-PEOPLE-EDIT-001 (#10).

## Objective and benefit
Every task, home job and person's date becomes "due soon" exactly two days ahead (`DUE_SOON_WINDOW_DAYS = 2` in
`engine/obligationRelevance.ts`). That's right for "take the trash out" and too late for a car registration that needs
paperwork, a gift that has to be ordered or a training certificate. Today he either sets the due date early, which
makes "due" untrue, or remembers it himself.

After this, each task, job and date can say **Show it early**: none, 3 days, 1 week, 2 weeks, or his own number of
days. From then until it's due, it reads "Coming up: due Dec 9" wherever due-soon items show, and it's in PLANS's
"Coming up" list.

**Benchmark (read 2026-11-25):** Things: "Tasks with a deadline remain active in the Anytime list. If you need more than
one day to finish them, add a start date several days before the deadline", and to-dos with a start date
"automatically move over to Today to remind you something needs taking care of"
([Things support, Scheduling To-Dos in Things](https://culturedcode.com/things/support/articles/2803579/)).
**What we copy:** something that needs several days shows up that many days early, on its own. **What we add:** one
setting on the item, kept by every repeat, with the due date left true. **What we keep out:** a second date he has to
manage.

## A rule this changes
The locked Drop 02 attention gate lets OVERDUE, DUE_TODAY, DUE_SOON and PLANNED_TODAY earn TODAY's attention slot, with
DUE_SOON fixed at two days. This brief lets one item's own lead time widen its DUE_SOON window. The Engine's
arbitration gate (`ARBITRATION_WORTHY_TIERS`: OVERDUE and DUE_TODAY only) doesn't change, so a coming-up item never
becomes the Engine's recommendation.

## Recommended defaults (approved when Gavin merges this brief)
1. **Field:** `Obligation.leadDays?: number`, whole days 3 to 60. Missing means today's two days. Only he sets it; it's
   never inferred.
2. **Where he sets it:** **Show it early** on the task form (PLANS, the week planner), the home job form (MORE · Home)
   and the person's date form (MORE · People), with chips for None, 3 days, 1 week and 2 weeks, plus **Other** (3 to 60
   days). Editing an item changes it the same way.
3. **Starting values:** new People dates start at **2 weeks**, the campaign plan's gift lead time
   (`docs/GRAYSON_CAMPAIGN_PLAN.md`, C3.2), since a gift usually needs ordering. Tasks and
   home jobs start at None. Every item he already has stays as it is. Each is one tap to change.
4. **The Engine rule:** `classifyObligation` reads DUE_SOON as `1 ≤ days to due ≤ max(2, leadDays)`. Nothing else in the
   relevance order moves.
5. **Words:** a due-soon item with a lead time reads "Coming up: due Dec 9" (`commitmentsCopy.ts`). Within two days it
   reads as today ("Due Dec 9").
6. **PLANS and Week Ahead:** a **Coming up** group lists items inside their lead time, soonest first, above the rest
   of the open list, and Week Ahead (`weekAheadQueries.ts`) shows the same items.
7. **Gift ideas:** a person's date that's coming up says "You saved 2 gift ideas" when `personQueries.ts` finds gift
   facts for that person (GIFTS-001's rule), and a tap opens that person's page. Nothing is said when there are none.
8. **Repeats:** the next occurrence keeps `leadDays`, as it keeps `remindAt` and `estimateMinutes`.
9. **Alerts:** none new. The phone alert stays on the due day (C7.3 is the separate lead-time alert).

## Everything is his to change
Each item's lead time, or none; the People starting value (MORE · People, "New dates show early", default 2 weeks; it moves to
YOUR-NUMBERS-001's page if that has merged first).

## Design principles check (Vision, Nov 24)
- **Asks nothing:** the lead time is set once and every repeat keeps it. **Always says why:** "Coming up: due Dec 9".
  **Calm:** no new alert, and it never becomes the recommendation. **Yours to change:** every item's lead time.

## Scope
- `domain/intent/types.ts` and its schemas (`leadDays`), `engine/obligationRelevance.ts` (`classifyObligation`),
  `application/intentCommands.ts` (create, modify and next occurrence carry it), `homeCommands.ts`,
  `peopleCommands.ts` (both create reminders through `createObligation`), and the People starting value's setting.
- UI: the task, home job and date forms, `commitmentsCopy.ts`, PLANS's Coming up group, Week Ahead, the gift ideas line
  (+ css).
- Tests: each lead time's window edges (the day before it opens, the day it opens, two days out, the due day); missing
  lead time behaves exactly as today; arbitration is unchanged for any lead time; a repeat keeps it; existing items are
  untouched by the People starting value; the gift ideas line shows only with a gift fact; validation 3 to 60; native backup round-trip and an older backup imports;
  320 px and axe on each form with Show it early open.

## Excluded
Alerts ahead of the due day (C7.3). Inferring a lead time. Lead time on Missions or Projects. Changing the two-day
default.

## Acceptance
- Phone check: add a task due in 10 days with Show it early 2 weeks. It shows in PLANS · Coming up today, reading
  "Coming up: due …". Change it to None: it leaves Coming up until two days before.
- Add a birthday on People: Show it early reads 2 weeks. With a gift idea saved for that person, the date in Coming
  up says so.

## Decision record
- A lead time on the item, not a second date, so the due date stays true.
- Arbitration stays at overdue and due today, so a coming-up item is a reminder, never the day's main ask.
- People dates start at two weeks, as the campaign plan set for gifts, his to change.

## Stop and ask Gavin if
- Any reader besides TODAY's attention plan (`attentionPolicy.ts`) and the Engine's arbitration gate uses `classifyObligation`'s DUE_SOON for
  a decision.

## Risks
- **TODAY crowding:** a long lead time on many items fills the attention slot; TODAY already shows one commitment and a
  count, so the slot can't grow.
