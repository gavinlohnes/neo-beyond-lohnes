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

## Order and evidence

a → b → c → d. Field use on the phone steers each release; the field-gate notes (LOG → NOTE) are read before each
release brief is finalised. Every Protected PR gets independent exact-head review.

## Leverage gate (programme level)

- **REUSE:** the free helper and Alfred cards; Open Food Facts; the Health Bridge; the Engine, day ledger, metric
  pages, calorie proposal, food sources, 90-day direction, week planner, sleep plan, meal plans; BODY-PROGRESS photos;
  the Web Speech and barcode-detection capabilities of the phone's browser where available.
- **OWN:** the learned rules, the planner composition, the briefing surface, the BEYOND-specific mapping.
- **BUILD FROM SCRATCH:** decided per release; none expected for 4.0-a beyond small glue.
