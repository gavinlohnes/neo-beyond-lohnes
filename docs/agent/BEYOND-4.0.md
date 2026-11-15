# BEYOND 4.0 — "The Chief of Staff" (master brief)

**Status: APPROVED by Gavin, 2026-11-15.** He asked for "a pretty big transformation", then answered the five
decisions:

> 1. Yes. I want it to learn. 2. Coaching is good. But I still have the final say 3. Yes 4. Yes but just for pictures
> of myself to see progress. I'm not interested in a food log or whatever. 5. Yes. 3

This brief is the bounded authority for 4.0. Each release still has its own brief section, PRs, Protected review where
marked, green CI and Gavin's merge. Nothing here authorises a merge.

## The transformation

From an excellent logbook to a **chief of staff**: BEYOND plans the work run, coaches the body, notices problems early
and handles busywork; Gavin approves, adjusts or ignores. Doctrine unchanged at its core: *know you increasingly well
while asking increasingly little*, no guilt, honest uncertainty, the operator decides.

## Owner decisions (binding for 4.0)

| # | Decision | Ruling | What it means for builders |
|---|---|---|---|
| 1 | The Engine learns | **Yes.** | The Engine may adapt from his own history (training progression, stalls and deloads; adaptive calories; sleep debt; recovery vs load; his own experiments). **Protected.** Every learned rule is deterministic, explained ("why"), shows its evidence and sample size, abstains when evidence is thin, and changes only what it suggests, never a record. |
| 2 | Coaching | **Yes; Gavin keeps the final say.** | Alfred and BEYOND may coach: suggest, with reasons. Every change is a card or plan he confirms; nothing applies itself. Coaching suggestions come from the Engine's evidence; Alfred explains and drafts, never invents. |
| 3 | TODAY redesign | **Yes.** | TODAY may become the mission briefing (now / next / what BEYOND handled). **Protected** (primary information architecture). Built as a preview Gavin judges on his phone before it replaces the current TODAY. |
| 4 | Photos | **Only progress pictures of himself.** | **No meal-photo logging**, no food-photo recognition. Photo intelligence is limited to his existing progress photos (BODY-PROGRESS-001): comparison, timeline and, **only when he taps to ask**, Alfred describing visible change between two of his photos. Body photos are never sent automatically, never in briefs or context, never stored outside the phone by BEYOND. |
| 5 | Proactive notifications | **Yes, at most 3 a day.** | Moments that matter (before shift, after shift, day off, a plan to confirm). Hard cap 3 per day, each kind easy to turn off, quiet while sleeping or on the clock unless he chose it. |

Unchanged: local-first ownership, offline logging, corrections never erase, Garmin scope and owner-wins, no guilt or
streaks, calories never netted, approved providers only (Anthropic, the free food databases, and the integrations
already in use).

## Four releases (each usable on its own)

### 4.0-a — Foundation and zero-effort input

> **Correction (2026-11-15):** voice logging, barcode scan, background Garmin sync and home-screen shortcuts already
> exist (see [4.0-a](BEYOND-4.0-A.md)). Release a is the TODAY slice plus a field check of those paths.
- **Foundation (no visible change):** split `TodayScreen.tsx` (3,500 lines) into self-contained sections, each owning
  its reads; reset browser storage between test files. Prerequisite for safe speed later.
- **Voice logging:** speak a log ("two eggs and a shake", "16 oz water", "rough night") through the free helper and
  Alfred's existing cards, so it's confirmed as now.
- **Barcode scan** for packaged food (camera on the phone; Open Food Facts, already approved), prefilling the existing
  meal sheet.
- **Garmin without a tap:** the Health Bridge syncs on its own on a schedule (Android update) and BEYOND imports with
  the existing owner-wins rules.
- **Home-screen quick log:** the most-used logs one tap from the home screen.

### 4.0-b — The coach brain (Protected: decisions 1 and 2)
- Learned, explained Engine rules: progression, stalls and deloads; adaptive calories (building on TARGET-PROPOSAL);
  sleep debt; recovery against training load.
- **Personal experiments:** "does X work for me?" set up, tracked and answered with honest statistics.
- Daily brief, weekly coach check-in, end-of-run debrief: one suggestion at a time, accept or skip.

### 4.0-c — The self-running week
- Drafts each work run and day-off block around the rotation: sleep, meals and prep, training, tasks and calendar,
  building on the week planner, sleep plan and meal plans. Re-plans when reality changes (a bad night, an extra shift,
  a missed workout). Gavin approves the plan, not each step. Up to 3 notifications a day (decision 5).

### 4.0-d — TODAY as a mission briefing (Protected: decision 3)
- One cinematic screen: now, next, what BEYOND handled; detail one tap deeper. Run debriefs and a year-in-review.
  Preview first on his phone, then replace.
- The phone-trial preview is specified in [BEYOND-4.0-D.md](BEYOND-4.0-D.md). That delivery does not replace TODAY and does not include run debriefs or a year-in-review.

## Correction — already on master (2026-11-15)

> **Correction (2026-11-15):** much of what this brief listed as new 4.0 work already exists
> on master (checked at `2fc13488`). The 4.0-a input paths were the first such finding.
> Remaining 4.0 work is upgrades to those features, plus a year-in-review, which is genuinely new.

| Planned as new | Already in BEYOND |
|---|---|
| Automatic re-planning | **Partial.** Day-level adaptation exists: two short main sleeps suggest the reduced session (`engine/evaluate.ts`, SLEEP-ENGINE-001); 14-day RE-ENTRY; NO_CATCH_UP continuity; confirmed schedule exceptions propagate; Weekly can offer PLAN A LIGHTER / PLAN RECOVERY SLEEP, confirm-first. There is no multi-day plan re-drafting; [4.0-c](BEYOND-4.0-C.md) is explicitly not autonomous replanning. |
| Key-moment notifications | **Working; held to decision 5 by [BRIDGE-NOTIFY-001](BRIDGE-NOTIFY-001.md)** (PR pending merge). Health Bridge moments 3 hours before, 30 minutes before, and at shift end, plus tasks due at 16:00 (`bridgePlan.ts`, MomentAlerts). That PR adds the 3-a-day cap with a fixed kind priority, per-kind switches, quiet hours, quiet on the clock and a day-off line on the last shift's end; the four-week plan is re-armed by the Bridge's background check. Plan-to-confirm moments are not built (no existing kind). |
| Personal experiments | **Working** (LOOP "Try" experiments, DELTA). Results are averages against usual days with sameness thresholds, not statistics. |
| Adaptive calories | **Working** (expenditure estimate, TARGET-PROPOSAL). A weekly proposal you save or keep — not an Engine rule, and not macros. |
| Sleep debt | **Working, read-only** (`getSleepDebt`: 7 hours a day over the last 7 logged days). A fixed need, not a learned one; the Engine does not read it. |
| Run debriefs | **Working** (AFTER ACTION / END-OF-RUN, LOOP, weekly debrief). One suggestion from a fixed two-item list (lighter week or protect sleep), not an Engine accept/skip card. The parked 4.0-b lighter-week coaching rule overlaps that AFTER ACTION suggestion. |
| Year-in-review | **Absent.** Building blocks already exist: month recap, MONTH-LETTER, day pixels, and the 90-day direction line. |

## Order and evidence

a → b → c → d. Field use on the phone steers each release; the field-gate notes (LOG → NOTE) are read before each
release brief is finalised. Every Protected PR gets independent exact-head review.

## Leverage gate (programme level)

- **REUSE:** the free helper and Alfred cards; Open Food Facts; the Health Bridge; the Engine, day ledger, metric
  pages, calorie proposal, food sources, 90-day direction, week planner, sleep plan, meal plans; BODY-PROGRESS photos;
  the Web Speech and barcode-detection capabilities of the phone's browser where available.
- **OWN:** the learned rules, the planner composition, the briefing surface, the BEYOND-specific mapping.
- **BUILD FROM SCRATCH:** decided per release; none expected for 4.0-a beyond small glue.


## Owner sequence update — 15 November 2026

After the coach card, Gavin selected work-run planning followed by the TODAY briefing preview ("Yes. 3 and 4."). Recovery coaching and the end-of-run debrief are parked for now. Deliver [4.0-c's bounded work-run draft journey](BEYOND-4.0-C.md) first, then the separately reviewed phone preview for 4.0-d. This changes priority, not data/Engine safeguards or merge authority.
