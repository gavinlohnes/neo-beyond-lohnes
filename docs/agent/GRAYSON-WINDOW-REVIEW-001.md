# GRAYSON-WINDOW-REVIEW-001 — a smart eating window: what you actually do, whether it's working, and why

- **Authorization:** Gavin, 2026-11-24. At 04:08 CT: **"I'm trying to be healthy, lose weight but keep muscle. Those
  are my goals for now. I'd like to get to 165 or 170."** He wants the eating window **"adjustable and smart"** and
  to **"understand what I'm doing and why"**. At 05:03 CT, asked whether to brief the smart eating window next:
  **"Yes. Start the next briefs"**. His rule: **"I should be able to edit and tweak or correct everything in this
  app."** This is slice **C4.8c, outcome review**, in `docs/GRAYSON_BEHAVIOR_FASTING_DESIGN.md` §11, plus the "learn
  actual timing" purpose of §5.2. Merging this brief approves the defaults below.
- **Lane: PROTECTED** (the design doc's own lane for C4.8c). It reads more data into a health surface and offers plan
  changes. No new table, Dexie version, event type, Engine input, TODAY composition or notification.
- **Starting commit:** `origin/master` `fed6b84` (#662 merged). Re-fetch before starting.
- **Builder:** Grok Bot. Branch `grok/grayson-window-review-001`. **Reviewer:** Claude Code (Codex, Grok Bot's usual
  reviewer, is offline). **Active PR:** pending.
- **Order and overlap:** Grok Bot **#10** in [GRAYSON-BUILD-ORDER](GRAYSON-BUILD-ORDER.md) (2026-11-24), after RUN-DEBRIEF-001. WINDOW-ALERT-001 (#672) is
  merged and also touches the eating window. This
  brief touches `application/eatingWindow.ts` (read helpers only), a new `application/eatingWindowReview.ts`,
  `ui/screens/body/` and `BodyScreen.tsx`. Rebase on whichever merges first; tracker to the oldest open PR.

## Objective and benefit
The window today runs a plan he set: presets, an opening time per kind of day, his marks, meal offers and a protein
line (C4.8a #619, C4.8b #623). It never tells him what he actually does, whether it's helping his goal, or why it
might. After this, BODY's Eating Window section answers three questions in plain words:

1. **What am I actually doing?** His real opening and closing times by kind of day, and one offer to move the plan
   when real life keeps landing somewhere else. This is the "know me well, ask little" part: the plan learns from
   him, but only on his tap.
2. **Is it working for my goal?** After a set look-back period, weight trend toward his goal weight, protein inside the
   window, and whether strength is holding, compared with before. The goal is fat loss while keeping muscle, so a
   window that hits its hours but costs protein or strength is shown as not working.
3. **Why a window at all?** A short, sourced explainer: what a window can and can't do for fat loss and muscle.

**Benchmark:** Zero offers "STATISTICS - Chart your progress and map your weight loss journey", syncs weight from
Google Fit, and sells "FASTING ZONES" in its paid tier
([Zero on Google Play](https://play.google.com/store/apps/details?id=com.zerofasting.zero), read 2026-11-24). Copy the
progress view tied to weight. Leave out zones, which the backlog rules out ("fasting zones and streaks"), because
GRAYSON can't measure them in him (design §5.6). GRAYSON goes past Zero by watching protein and strength too, because
"completion is not success by itself" (design §5.1).

## Recommended defaults (approved when Gavin merges this brief)

### 1. What you actually do
- **Source of truth:** his own marks (`EATING_WINDOW_MARKED`, voids applied, via `readMarks`). Where a lived day has
  no marks, the first and last logged meal that day give an **estimate**, always labelled "From your meals; may be
  incomplete" (design §5.4). A day with neither is **unknown** and counts as unknown, never as "missed".
- **Shown per kind of day** (Work, Recovery, Off, the same kinds as `dayKindFor`), over the last 14 lived days:
  typical opening, typical closing and typical eating hours (medians), with the day count behind each ("6 work days,
  4 marked, 2 from meals").
- **Floor:** 4 known days of a kind before anything shows for it; below that, "Not enough days yet (2 of 4)".
- **One offer at a time:** when his real opening differs from the plan by 45 minutes or more on at least 4 of the
  last 6 known days of a kind, one line: "On work days you've opened around 15:30, not 14:00. Move the plan to
  15:30?" with **MOVE** and **KEEP**. MOVE saves through `saveEatingWindowSettings` (his own change, `setAt`
  updated). KEEP hides that offer for 14 days. Nothing moves by itself.
- **Never narrower:** GRAYSON never offers a shorter eating window. Narrowing is only ever his choice in setup (design
  §5.7: "before encouraging a longer window, the future programme must check" fuel, training and recovery).

### 2. Is it working (the review)
- **Start:** one tap, **CHECK HOW IT'S GOING**, on the section starts a Try through the existing
  `startExperiment` (`application/tryExperiment.ts`): title "Try: Eating window 14:10" (his preset), scope Every day,
  **28 days** (editable to 14 or 28; 7 is too short for weight). Offered once when the window is on and no
  eating-window Try is running. He can start it any time later.
- **During:** a quiet "Day 9 of 28" line. No mid-way verdict.
- **At the end,** a review panel with these lines, each with its day counts:
  - **Weight trend:** the trend (`weightTrend.ts`, his chosen smoothing) at the start and now, and the pace in lb
    per week. With a `goalWeightLbs` set (nutrition targets), "About N weeks to 170 at this pace", only when the
    trend is moving toward the goal and has at least `TREND_MIN_WEIGH_INS` weigh-ins over `TREND_MIN_SPAN_DAYS`.
    Otherwise "Not enough weigh-ins to tell".
  - **Protein:** days protein reached target, during vs his usual days before ("19 of 26 during, 14 of 25 before").
    Training days counted separately.
  - **Strength:** the existing TRAIN verdict across comparable lifts (`deriveTrainProgress` assessment: "holding or
    rising" or "lower than the 4 weeks before"), and "not enough comparable lifts" where TRAIN says so.
  - **Sleep and energy:** the existing Try comparison lines (`experimentResult`).
  - **Window kept:** known days within 30 minutes of plan, out of known days, with unknown days stated. This line is
    last, on purpose.
- **Guardrail lines** (design §5.7, wording pattern from its "Allowed" example), at most two, shown above the choices:
  - Protein below target on 4 or more of the last 6 training days: "Protein has been under target on 4 of 6 training
    days. A wider window on training days may help."
  - Strength lower while weight is falling: "Strength is lower than 4 weeks ago while your weight is dropping. Worth
    more protein or a wider window before anything else."
  - Check-in energy during the Try clearly lower than usual (the Try line's verdict is "lower", not "can't tell"):
    "Energy has been lower while you've been on the window. A wider window or more food on work nights may help."
- **His choices:** **KEEP**, **ADJUST** (opens setup with his current values), **PAUSE** (turns the window off,
  settings kept) and **END** (turns it off and closes the Try). Each closes the Try through `closeExperiment` with the
  matching outcome and an optional one-line lesson, so the decision stays in his journal. No verdict picks for him.
- **Language:** patterns, not proof. Never "success", "failed", a score, a streak or a level.

### 3. Why a window
A **WHY A WINDOW** link opens a short sheet in plain words, written fresh by the builder from these points, with the
source links in the sheet:
- Fat loss comes from eating less than you burn. A window can make that easier, mostly by closing late grazing; the
  hours themselves don't burn extra fat. Trials in people who lift found a modest fat-mass drop, from few, short
  studies ([TRE with resistance training meta-analysis](https://pubmed.ncbi.nlm.nih.gov/41687432/)).
- Keeping muscle needs enough protein and continued training. A tight window can make protein harder to fit
  ([12-week trial](https://jn.nutrition.org/article/S0022-3166%2826%2900371-8/fulltext)), which is why the review
  watches protein and strength, not just hours.
- A 10-hour window was workable for 24-hour shift workers in one trial, though evidence for shift work is thin
  ([Healthy Heroes](https://pmc.ncbi.nlm.nih.gov/articles/PMC9536325/);
  [2026 systematic review](https://pubmed.ncbi.nlm.nih.gov/42383913/)).
- The timer's context lines are typical, not measured in him (existing `TYPICAL_LABEL`).
- Medicine directions and a clinician's advice come before any window. Feeling faint, dizzy or unusually weak is a
  reason to eat and stop the fast, never to push on (design §5.8).
The sheet's text is bundled, labelled "General information, not medical advice", and follows the design's source
register (§12). No other claims.

## Everything is his to change
- MOVE or KEEP on every offer; the 45-minute and 4-of-6 thresholds are fixed defaults in this slice but live in one
  constants block so a later slice can expose them.
- Try length (14 or 28), and every choice at the review.
- Any mark that feeds "what you actually do" is already correctable on TODAY's card (UNDO, existing voids); estimates
  from meals change when he fixes the meal.
- Hide the "what you actually do" block or the review entry from the section, stored in `beyond.windowReview.v1`
  (`{ hideActual?, hideReview?, keptOffers: Record<kind, isoDate> }`), validated, in `TRAVELLING_SETTINGS`.

## Design principles check (Vision, Nov 24)
- **Yours to change:** every offer is a tap; nothing changes by itself.
- **Fix, don't ask:** times come from what he already marks and logs.
- **One tap for the usual:** MOVE, or start the review.
- **Built around shift:** everything is by kind of lived day, never weekday.
- **Calm:** lives in BODY; no notification, no TODAY change.
- **Always says why:** every line shows its day counts and source; the WHY sheet.
- **Simple first:** three short blocks.
- **Tap or say it:** Delta can read the review lines later (not in this slice).

## Scope
- `src/application/eatingWindowReview.ts` (new, pure where possible): `actualWindows(events, meals, days, now)`,
  `planOffer(actual, settings)`, `windowReview(experiment, inputs)` returning lines and guardrails.
- `src/ui/screens/body/EatingWindowReview.tsx` (new) and `WhyWindowSheet.tsx` (new); `BodyScreen.tsx` mounts them in
  the Eating Window section.
- `src/application/eatingWindow.ts`: export the read helpers the review needs, no behaviour change.
- `persistence/settingsTransfer.ts`: one entry.

## Excluded
- TODAY changes, notifications, Delta suggestions, Health Connect biomarkers, alcohol records (design §11 lists those
  separately), automatic plan changes, offers to narrow, any change to targets or the Engine, new events or tables.

## Acceptance
- `tests/eatingWindowReview.test.ts`:
  - medians by day kind from marks; a meal-only day is labelled estimated; a day with neither is unknown and not
    counted as kept;
  - floor of 4 known days;
  - an opening 90 minutes late on 4 of 6 work days offers 15:30 rounded to 15 minutes; 3 of 6 offers nothing; a KEEP
    hides it 14 days;
  - no offer ever shortens `eatingHours`;
  - weight pace and "weeks to goal" only when the trend moves toward the goal and has enough weigh-ins;
  - protein days during vs before; training days counted separately;
  - guardrail lines fire at exactly the stated thresholds and at most two show;
  - END/PAUSE/KEEP close the Try with the right outcome and change settings as stated.
  - Run under `TZ=UTC` and `TZ=America/Chicago`, including a window that opens after midnight on a work night.
- Browser tests: section with the window off shows nothing new; on with too few days shows the floor line; MOVE updates
  the plan and the TODAY card's planned time; the WHY sheet opens and its links open in a new tab; keyboard only; axe
  clean; 320/360/412 px no overflow.
- Screenshots in `docs/agent/screenshots/GRAYSON-WINDOW-REVIEW-001/` at 360 px (key ones 320 and 412): actual window
  block, an offer, the review with a guardrail line, the WHY sheet.
- **Device check (Gavin):** after a week of marks, BODY shows his real times by kind of day and they look right to him.

## Decision record
- Learn from his marks first, meals second, and say which; unknown stays unknown.
- Outcomes over hours: protein and strength are watched because his goal is to keep muscle.
- Reuse Try for the review, so it lands in his journal like every other experiment, with the same honest comparison.
- Never offer a narrower window; only he narrows.

## Stop and ask Gavin if
- `goalWeightLbs` isn't set and he'd want the review to ask for it (default: the line simply omits weeks-to-goal).
- `deriveTrainProgress` can't be called for an arbitrary 28-day window without changing it.
- WINDOW-ALERT-001 changed `eatingWindow.ts` in a way that conflicts.

## Risks
- **Too little logging:** the floor and unknown labels keep it honest; the section says what's missing.
- **Reading cause into a pattern:** every line says "during" and "before", with counts, never "because".
- **Health wording:** the WHY sheet is bundled text from the listed sources only; reviewer checks every claim against
  its source.
