# GRAYSON-FRONTIER-001, run 1 of 2: Gavin's rotation days

Status: **REPORT-ONLY RESEARCH**. Written 2026-11-20 on master `211ccf4` (PR #591 merged).
This report authorizes nothing: no implementation, Engine change, schema, dependency, provider,
notification, TODAY composition change, Google Drive change or change to any other PR. Every
objective below is a proposal that waits for Gavin's own approval, and the Protected ones also
need bounded owner approval and independent exact-head review under
[`DEV-FLOW-002`](agent/DEV-FLOW-002.md).

**Mission (from Gavin, 2026-11-20):** take the GRAYSON research further, split into two focused
runs, run 1 now. Run 1 covers six areas of Gavin's real rotation days. Delta's reasoning, autonomy,
sync and backup, notifications, capture and UI craft are run 2; this report only names
dependencies on them.

**Authority note.** #591 closes with "Stop broad product hunting after this synthesis." Gavin's
direct decision to run this research outranks that line (AGENTS.md authority order, item 1). This
run stays narrow on purpose: six questions about his own days, each checked against code.

**How to read the marks.**
- **Verified** = read at the source on 2026-11-20 (full text, or the abstract where stated), or
  read in BEYOND's code on master `211ccf4`.
- **Search-confirmed** = the paper exists with that title and venue; its body was not read here
  (several PubMed and PMC pages served a bot check to the fetch tool, and those checks were not
  worked or bypassed). A search-confirmed source only supports what its title says.
- **Assumed** = this team's judgment or an inference. Never treated as evidence.
- All web sources were accessed **2026-11-20** unless another date is given.

**The team.** Each section is signed by the people who wrote it:
PS product strategist · CS shift-work sleep and circadian scientist · NS sports nutrition and
training scientist · BS behavioral scientist · ID interaction designer · PE privacy and
local-first engineer · AI applied AI engineer.

---

## 1. Executive summary: the five things a real team would tell Gavin

*Signed: PS, CS, BS, ID, PE.*

1. **The drive-home warning goes quiet on exactly the nights that matter.** BEYOND's energy curve
   (`src/application/alertness.ts`) places your body-clock low 1.5 hours before your usual wake
   time from the last 7 nights. On a run of nights you wake around 14:00, so the curve puts your
   low at about 12:30 in the afternoon and shows you mid-range, not low, at 05:00 to 06:00. Research says
   almost no night workers' body clocks actually move that far: under 3% fully adjust even on
   *permanent* nights (Folkard 2008). We ran the code on a simulated run of nights: the
   "extra care on the drive home" line did **not** appear. On a closed track, 37.5% of
   post-night-shift drives had a near-crash and 43.8% were stopped early for safety (Lee et al.
   2016). This is the first thing to fix, and it's small. (Verified: code, simulation, both papers.)

2. **Your watch may not be seeing your day sleep at all.** The vivoactive 4 manual says it
   "monitors your movement during your normal sleep hours", which you set in Garmin Connect, and
   that naps aren't added to sleep statistics. If your normal sleep hours are still set to night,
   your post-shift sleep may be missed or short, and everything BEYOND builds on Garmin sleep (the
   energy curve, the draft recommendation, sleep owed) inherits the error. A one-minute check, and
   a small BEYOND prompt when a post-shift sleep never arrives, protect all of it. (Verified:
   Garmin manual. Assumed: how your watch is set today.)

3. **BEYOND already has most of the night-shift science; it needs to be right, not bigger.**
   Caffeine cut-off, pre-shift nap window, first sleep after a run, sunglasses on the way home,
   the energy curve, sleep owed against your own baseline, the draft recommendation, the recovery
   contract and Drive Home all exist in code. #591 and HARVEST-003 already studied Rise and
   Timeshifter. What's missing is accuracy for a rotating night worker, plus one or two newer
   findings: the best caffeine meta-analysis now says coffee needs about 8.8 hours before sleep
   and pre-workout about 13.2 hours (Gardiner et al. 2023), not the 6 hours BEYOND uses.
   (Verified.)

4. **Shift-down should become a 2-minute bridge, not a longer timer.** Today SHIFT DOWN is a timer
   (5 to 30 minutes) with your own post-shift plan line. The evidence points to three small moves:
   park what's unfinished with a concrete plan (making a plan removes the mental pull of an
   unfinished goal; Masicampo & Baumeister 2011), one short breathing option with real trial
   evidence (5 minutes a day of cyclic sighing beat mindfulness for mood in an RCT; Balban et al.
   2023), and naming what's first at home. Detachment from work in off-hours goes with better life
   satisfaction and less strain (Sonnentag). Nothing about calls or cases gets stored.
   (Verified sources; design Assumed.)

5. **Days off are life, and research says to shape them roughly, not schedule them.** Scheduling
   leisure at exact times makes it feel more like work; rough scheduling without set times removed
   that effect (Tonietto & Malkoc 2016). BEYOND's recovery contract already offers "sleep first,
   easy training, keep the day light" after a run. Extending it with one rough together-time, one
   stewardship item and protected open time fits the evidence and the anti-goals. (Verified.)

**The top three objectives** (section 4): NIGHT-CURVE-TRUTH-001 (drive-home truth, S),
GARMIN-DAY-SLEEP-CHECK-001 (is the watch seeing your day sleep, S), SHIFT-DOWN-BRIDGE-001 (the
2-minute Deputy Lohnes to Gavin moment, M).

---

## 2. What #591 already settled (not redone here)

*Signed: PS.*

[`GRAYSON_RESEARCH_SYNTHESIS.md`](GRAYSON_RESEARCH_SYNTHESIS.md) (merged as #591) settled, and this
run keeps:

- BEYOND already contains most of the suit; the main deficit is orchestration, not features.
- Donor value is pattern-level ADAPT, never code import. Rulings for Oura, Flighty, Sunsama,
  Linear Mobile, Apple Weather, MacroFactor, Gentler Streak, How We Feel, wger, ActivityWatch,
  Memos, Nomie, Anytype, Monica, Home Assistant and Assist, Grocy, Homebox, Khoj and Open WebUI
  stand as written.
- The dependency order: Orientation, re-entry, work entry and shift-down, evening closure,
  outcome review, mood support, days off and stewardship, Operator Model.
- Rejections: readiness or life score, a new planner, AI call on open, card walls, automatic
  schedule moves, a second coaching engine, a generic agent platform.

Earlier research this run builds on rather than repeats:
[`CIRCADIAN-SPIKE-001`](agent/CIRCADIAN-SPIKE-001.md) (caffeine, nap, first sleep, light cards),
[`HARVEST-003`](agent/harvest/HARVEST-003.md) (Rise, Timeshifter, WHOOP, MacroFactor, Gentler
Streak and others, 2026-11-19), and the GARMIN-003 rulings in
[`UX_DECISIONS.md`](UX_DECISIONS.md). Nothing #591 or HARVEST-003 rejected is revived.

---

## 3. Findings by area

Each area answers one question: the evidence, what BEYOND has, the gap, and the sources.

### 3.1 Rotating nights: sleep timing, light, caffeine and meals on rotation-change days

*Signed: CS, with PS.*

**Question.** What does current evidence say about sleep timing, light, caffeine and meal timing on
12-hour rotating nights, especially rotation-change days, and what can BEYOND act on from data it
already has?

**Gavin's pattern (Verified from his profile; Assumed for any week not on his calendar).** 18:00
to 06:00 nights. Week A: Mon, Tue, Fri, Sat, Sun. Week B: Wed, Thu. So his longest run is three
nights and most are two. He changes direction (nights to days off and back) about four times every
two weeks.

**Evidence.**

- **The body clock rarely follows the sleep schedule.** A review of melatonin studies in permanent
  night workers found "only a very small minority (<3%)" fully adjusted and "less than one in four"
  adjusted enough to benefit (Folkard 2008, review of six studies, abstract read). Verified.
  For two- and three-night runs separated by days off, full adjustment is even less plausible.
  Assumed (inference from the permanent-night finding, not a separate study).
- **The drive home after nights is the riskiest hour of the cycle.** 16 night-shift workers each
  drove 2 hours after sleep and after a night shift on a closed track: 11 near-crashes in 6 of 16
  post-night drives (37.5%) against none after sleep; 7 of 16 (43.8%) stopped early for safety.
  Impairment showed "during the first 15 min"; near-crashes came "after at least 45 min" (Lee et al.
  2016, PNAS, full text read except end of methods). Verified. Small sample, closed-track, strong
  within-subject design.
- **Caffeine needs more time than BEYOND allows.** A meta-analysis of 24 crossover studies found
  caffeine cut total sleep by 45 minutes and that coffee (107 mg) "should be consumed at least 8.8 h
  prior to bedtime" and pre-workout (217.5 mg) "at least 13.2 h" (Gardiner et al. 2023, Sleep Med
  Rev). Verified (abstract and about half the full text). The cut-offs come from a meta-regression
  model, not a direct trial of those doses; healthy adults 18 to 65.
- **Countermeasures beyond "better than nothing".** Smith & Eastman 2012 argue standard advice is
  "not enough" because it ignores misalignment, and propose controlling light and dark: "outdoor
  light exposure, sunglasses, sleep in the dark, and a little bright light during night work."
  Verified (abstract only; their compromise-phase-position detail was not readable, so it is not
  relied on here).
- **Meal timing matters for metabolism on nights.** In a 14-day lab trial of 19 adults under
  simulated night work, glucose "increased by 6.4%" for those eating at night, with no significant
  rise for those eating in the daytime (Chellappa et al. 2021, Science Advances, via the NIH news
  release). Verified (release read; it calls the study "a small clinical trial").
- **Rotating shift workers eat slightly more and more at night.** A systematic review (Clark,
  Bonham et al., Advances in Nutrition) found rotating shift workers ate about 264 kJ (about
  63 kcal) more per recorded day than day workers, with more night eating and snacking. Verified
  (Monash University release read; the paper itself not read).
- **Rise and Timeshifter (product claims only).** Timeshifter Shift Work takes "night, early,
  rotating or irregular shifts", "accounts for actual commute time", and plans "timed light
  exposure, strategic light avoidance, caffeine timing" and when melatonin "may help"; it
  "predicts when fatigue risk is highest." The page cites general circadian research and one user
  testimonial, not a validation study ([timeshifter.com/shift-work-app](https://timeshifter.com/shift-work-app)).
  Rise's help center lists "Can RISE work with a night shift or irregular schedule?" under Energy
  Schedule; the answer could not be opened
  ([Rise help, Energy Schedule](https://help.risescience.com/hc/en-us/sections/40620705974039-Energy-Schedule)).
  Verified as claims, not as evidence.

**What BEYOND has (Verified in code).**

- `src/application/shiftSleepPlan.ts`: caffeine cut-off 6 hours before your usual post-shift sleep
  (Drake et al. 2013), pre-shift nap window ending 60 minutes before the shift (Hilditch & McHill
  2019), first sleep after the run (Kalkanis et al. 2023), sunglasses on the way home (Smith, Fogg &
  Eastman 2009). Rules locked in UX_DECISIONS SHIFT-SLEEP-PLAN-001. Shown in ROUTE.
- `src/application/alertness.ts` + `alertnessQueries.ts` + `src/ui/screens/today/TodayEnergy.tsx`:
  the two-process energy curve on TODAY with the shift, caffeine cut-off and an "Extra care on the
  drive home" line when the hour after the shift falls in the day's lowest stretch.
- `src/application/sleepDebt.ts`: sleep owed against your own learned usual sleep by kind of day.
- `src/application/lifeTransition.ts`: RUN_STARTS, LAST_SHIFT, RUN_OVER, FLIP_BEGINS, FREE_AGAIN.
- `src/engine/sleepDraft.ts`, `src/engine/sleepRhythm.ts`, `src/application/rotationProjection.ts`
  (`flips`), `src/application/workContextResolution.ts`.

**The gap.**

1. The energy curve's body-clock placement assumes full adaptation (see Correction C1). This is a
   correctness gap in a safety-adjacent line, not a missing feature.
2. The caffeine constant predates the 2023 meta-analysis and doesn't distinguish coffee from
   pre-workout or energy drinks.
3. Nothing marks a rotation-change *day* (the off day before the first night, or the first day
   off) with its own sleep shape; the nap card covers only the hours just before a shift.
   Light-seeking plans stay out (they need a chronotype model; see killed ideas).

**Sources.**
- Folkard S. Do permanent night workers show circadian adjustment? Chronobiol Int 2008;25(2):215–224.
  [PubMed 18533325](https://pubmed.ncbi.nlm.nih.gov/18533325/). Abstract read.
- Lee ML, Howard ME, Horrey WJ, et al. High risk of near-crash driving events following night-shift
  work. PNAS 2016;113(1):176–181. [PMC4711869](https://pmc.ncbi.nlm.nih.gov/articles/PMC4711869).
- Gardiner C, Weakley J, Burke LM, et al. The effect of caffeine on subsequent sleep: a systematic
  review and meta-analysis. Sleep Med Rev 2023;69:101764.
  [Leeds Beckett repository PDF](https://eprints.leedsbeckett.ac.uk/id/eprint/9625/1/TheEffectOfCaffeineOnSubsequentSleepASystematicReviewAndMetaanalysisPV-WEAKLEY.pdf).
- Smith MR, Eastman CI. Shift work: health, performance and safety problems, traditional
  countermeasures, and innovative management strategies. Nat Sci Sleep 2012;4:111–132.
  [Dove Press](https://www.dovepress.com/shift-work-health-performance-and-safety-problems-traditional-counterm-peer-reviewed-fulltext-article-NSS).
- Chellappa SL, et al. Daytime eating prevents internal circadian misalignment and glucose
  intolerance in night work. Sci Adv 2021. [NIH release](https://www.nih.gov/news-events/news-releases/study-finds-daytime-meals-may-reduce-health-risks-linked-night-shift-work).
- Clark A, Bonham M, et al. Rotating shift workers' intake review, Advances in Nutrition.
  [Monash release](https://www.monash.edu/news/articles/shift-workers-eat-more-and-face-higher-illness-risk-than-day-workers-study).
- Gupta CC, et al. Altering meal timing to improve cognitive performance during simulated
  nightshifts. Chronobiol Int 2019. [Flinders record](https://researchnow.flinders.edu.au/en/publications/altering-meal-timing-to-improve-cognitive-performance-during-simu/).
  Search-confirmed only.
- Ferguson SA, Dawson D. 12-h or 8-h shifts? It depends. Sleep Med Rev 2012.
  [PubMed 22306236](https://pubmed.ncbi.nlm.nih.gov/22306236/). Search-confirmed only; supports
  only that 12-hour effects depend on context.

### 3.2 Shift-down: leaving a high-stress shift and being present at home

*Signed: BS, ID, PE.*

**Question.** What helps someone leave a high-stress shift and be present at home, and what would a
2-minute "Deputy Lohnes to Gavin" moment look like on existing BEYOND pieces?

**Evidence.**

- **Detachment matters.** "Employees who experience more detachment from work during off-hours are
  more satisfied with their lives and experience fewer symptoms of psychological strain"; job
  stressors and high involvement make detachment harder (Sonnentag, Current Directions in
  Psychological Science; abstract read). Verified. Correlational body of work, consistent.
- **Detachment can be trained.** A meta-analysis exists of interventions to improve psychological
  detachment from work ([PubMed 34096763](https://pubmed.ncbi.nlm.nih.gov/34096763/)). Search-
  confirmed only: its effect sizes could not be read, so none are claimed.
- **A concrete plan quiets an unfinished task.** Title claim: "Plan making can eliminate the
  cognitive effects of unfulfilled goals" (Masicampo & Baumeister 2011, JPSP;
  [PubMed 21688924](https://pubmed.ncbi.nlm.nih.gov/21688924/)). Search-confirmed only (title).
- **Writing the to-do list helps sleep onset.** In a polysomnography study of 57 young adults,
  5 minutes writing upcoming tasks before bed beat writing completed tasks for falling asleep
  (Scullin et al. 2018, J Exp Psychol Gen; [Baylor release](https://news.web.baylor.edu/news/story/2018/can-writing-your-dos-help-you-doze-baylor-study-suggests-jotting-down-tasks-can)).
  Verified (release read; minutes faster not given there, so none claimed).
- **A 5-minute breathing practice with RCT evidence.** In a one-month remote RCT, 5 minutes a day of
  cyclic sighing gave "a significantly higher increase in positive affect" than mindfulness
  meditation and lowered breathing rate more; "no changes in sleep were observed" (Balban et al.
  2023, Cell Rep Med; [PMC9873947](https://pmc.ncbi.nlm.nih.gov/articles/PMC9873947)). Verified
  (most of the full text). Exploratory, around 100 healthy adults, analysed n uncertain; not police.

**What BEYOND has (Verified in code).** `src/ui/screens/today/ShiftDownCard.tsx` and
`resetShiftDownCopy.ts`: SHIFT DOWN is "Come down from high alert before anything else", a timer
with 5, 10, 15, 20 and 30 minute presets, your own post-shift plan line, and MARK WORK ENDED folded
in. `src/ui/components/DriveHome.tsx`: hands-free logging on the drive, read back, saved only on
"save". `src/application/shiftHandoffQueries.ts`, `shiftMarks.ts`, the journal, capture and Daily
Note. The Engine can recommend START_SHIFT_DOWN on RED capacity (`src/engine/evaluate.ts`).

**The gap.** SHIFT DOWN starts a clock but doesn't help with the three things the evidence names:
parking unfinished thoughts with a plan, a short body downshift with evidence, and turning toward
home. It also asks for 5 or more minutes when Gavin may have 2.

**Design sketch (Assumed, for the brief in section 4).** Three taps, under 2 minutes, all optional:
1. **Park it.** "Anything to carry forward?" Choices: Nothing · Remind me (opens existing capture
   with a time) · Leave it at work. A reminder holds only what Gavin types; no prompt ever asks
   about calls, people or cases.
2. **Come down.** 1 minute of cyclic sighing with a slow visual cue, or the existing timer, or skip.
3. **Turn toward home.** "First thing at home?" Sleep · Elle · The dogs · Food · Just quiet. The
   pick only colours the next TODAY line; it isn't stored as a judgment or used by the Engine.

### 3.3 Nutrition outcomes: trustworthy adherence and expenditure, and eating on nights

*Signed: NS, BS.*

**Question.** Beyond logging, what makes adherence and expenditure estimates trustworthy, and how
should eating on nights be handled?

**Evidence.**

- **Self-reported intake runs low.** Ravelli & Schoeller 2020 (Front Nutr, review) report "a strong
  and consistent systematic underreporting of energy intake", growing with BMI; energy misreported
  by about −16% in one pooled comparison while protein was only −5%. Verified (most of full text).
- **One partial day distorts the estimate for weeks.** MacroFactor calls partial logging its
  algorithms' "major Achilles heel": one day logged at 1500 of 3000 kcal moves expenditure about
  71 kcal/day for roughly three weeks; "a blank day is skipped"; it asks for "at least four days in
  every seven-day period". Verified (product help pages; product claims about their own model).
- **Protein target and spacing.** ISSN: 1.4 to 2.0 g/kg/day "is sufficient for most exercising
  individuals"; 0.25 g/kg or 20 to 40 g per dose, "evenly distributed, every 3–4 h". Verified.
- **Night eating.** See 3.1: daytime-weighted eating protected glucose in a small lab trial;
  rotating workers eat a little more and more at night. Gupta 2019 (search-confirmed) studied meal
  timing for night cognition; its detail is not relied on.

**What BEYOND has (Verified).** `src/engine/expenditure.ts` estimates burn from logged intake and
the weight trend as a range, abstains below data floors, and counts every finished lived day with
"at least one meal logged" as intake, stating that it "assumes the logged days' meals were all
logged". `src/application/targetProposal.ts` turns that into a weekly calorie proposal that never
writes. Food diary, USDA and Open Food Facts lookup, barcode, protein-first header, food sources,
meal plan (`src/application/mealPlan.ts`), PREP packed food (`src/application/preparation.ts`).
Lived days run 16:30 to 16:30, so a night's eating already lands in one day. No fasting feature.

**The gap.**
1. A day with one meal logged counts as a full day of eating. Given the underreporting evidence,
   expenditure and the weekly proposal can drift low without anyone knowing why.
2. Nothing shows how complete the logging behind an estimate is (days counted, days skipped).
3. Night eating has no shape in PREP or the diary: when the main meal falls relative to the shift,
   and whether 00:00 to 06:00 eating was a snack or a full meal.

### 3.4 Training under fatigue without a readiness score

*Signed: NS, CS, BS.*

**Question.** How should training adapt to short sleep and shift timing without becoming a
readiness score?

**Evidence.**

- **Sleep loss hurts some training more than others.** A meta-analysis (77 studies, n=959, 89% male)
  found an average −7.56% change in performance after acute sleep loss, about −0.4% per hour awake
  before exercise, consistent effects for "deprivation and late-restriction protocols", and "tasks
  performed in the AM were largely unaffected" while PM tasks were consistently hit (Craven et al.
  2022, Sports Med). Verified (abstract and about half the full text). "AM/PM" in lab studies means
  clock time for day-living people; for Gavin, "hours awake" is the transferable part. Assumed.
- **Autoregulating load works as well as fixed loading for strength.** Pooled 1RM difference
  2.07 kg (CI −0.32 to 4.46), "similar improvements in strength" (Hickmott et al. 2022, Sports Med
  Open; 6 load studies, 133 people). Verified (partial). So adjusting by effort (reps in reserve)
  instead of fixed numbers costs nothing in strength.
- Knowles et al. 2018, "Inadequate sleep and muscle strength: implications for resistance
  training" (J Sci Med Sport; [PubMed 29422383](https://pubmed.ncbi.nlm.nih.gov/29422383/)).
  Search-confirmed only.

**What BEYOND has (Verified).** `src/engine/trainSuggestion.ts`: RED suggests RESET, YELLOW
REDUCED, GREEN STANDARD, and two short main sleeps turn GREEN's STANDARD into REDUCED. GYM-UPGRADE
added reps in reserve and warm-up sets to performed sets. The training programme, progression,
stall/deload and recovery handoff exist. Effort never enters recommendation rules (CAPABILITY_MAP).

**The gap.** BEYOND decides *whether* and *how much* but never *when*. On a work day the useful
question is which window: after waking and before the shift, or not at all before the first night.
And REDUCED isn't explained in terms Gavin can act on in the gym (for example, same weights, fewer
sets, stop with 2 to 3 reps in reserve). Both can be done without a score and without touching the
Engine's choice.

### 3.5 Wearables honestly: what a vivoactive 4 really gives through Health Connect

*Signed: PE, CS, AI.*

**Question.** What can a vivoactive 4 really give through Health Connect, what is noise, and where
does watch data mislead night-shift workers?

**Evidence.**

- **Sleep detection is tied to a setting.** The vivoactive 4 "monitors your movement during your
  normal sleep hours", set in Garmin Connect user settings, and "Naps are not added to your sleep
  statistics" ([Garmin vivoactive 4 manual, Sleep Tracking](https://www8.garmin.com/manuals/webhelp/vivoactive4_4S/EN-US/GUID-70D41BFB-2BB2-4933-BF95-47FF63140112.html)).
  Verified. Whether a 2026 firmware or Garmin Connect app detects sleep outside those hours is not
  stated on that page. Assumed: unknown.
- **Daytime sleep can be tracked, but short sleeps get missed.** Four wearables (not Garmin) on 16
  adults' home daytime sleep: time-in-bed bias "low in general", but "missed episodes occurred most
  often when TIB was short (eg, naps < 4 h)", from 3.6% to 37.3% by device (Chinoy et al. 2023, Nat
  Sci Sleep). Verified (partial). Not Garmin, so this sets expectations only.
- **What Garmin sends to Health Connect.** Body fat, calories burned, floors, heart rate, sleep,
  steps and step distance, weight; not Body Battery, training load, training effect, intensity
  minutes or HRV status; one-way only ([Android Central, 2025-06-30](https://www.androidcentral.com/wearables/garmin/heres-everything-garmin-will-and-wont-share-with-google-health-connect)).
  Verified as reported by press, not by a Garmin page read here. Resting heart rate is not named in
  that list. Assumed: check on the phone.
- **Health Connect itself** supports exercise sessions (`ExerciseSessionRecord`) and has record
  types for HRV, respiratory rate, oxygen saturation and skin temperature
  ([Android Developers, data types](https://developer.android.com/health-and-fitness/health-connect/data-types)).
  Verified for exercise; the others from a summary of the page's later half.
- **Watch calories are the weakest number.** Shcherbina et al. 2017 compared wrist heart rate and
  energy expenditure (J Pers Med; [PubMed 28538708](https://pubmed.ncbi.nlm.nih.gov/28538708/)).
  Search-confirmed only, so no error figures are claimed.

**What BEYOND has (Verified).** `android/health-bridge` (0.11.2) reads `SleepSessionRecord` (with
stages), `StepsRecord`, `HeartRateRecord`, `RestingHeartRateRecord`, `TotalCaloriesBurnedRecord`,
`ActiveCaloriesBurnedRecord`; no Internet; a freshness hint tells Gavin to sync Garmin Connect when
data is stale. GARMIN-003: Garmin sleep fills a day marked Garmin, his entry replaces it, Garmin may
only lower advice, check-in beats watch, 28-day personal baselines.
`src/engine/sleepDraft.ts` drafts a sleep from the scheduled shift end when nothing better exists.

**The gap.** BEYOND trusts that an absent day sleep means no sleep data arrived yet, not that the
watch wasn't looking. Nothing checks the one setting that decides whether a night worker's main
sleep is recorded. Noise to keep out: watch calories as truth (BEYOND's weight-trend method is the
better path), and anything Garmin doesn't share (Body Battery, HRV status), which HARVEST-003
already rejected.

### 3.6 Days off and life: rest, family, hobbies and stewardship as life

*Signed: BS, ID, PS.*

**Question.** What products and research treat rest, family, hobbies and household stewardship as
life, not spare capacity?

**Evidence.**

- **Rough plans keep leisure feeling free.** Across 13 studies, scheduling a leisure activity
  "makes it feel less free-flowing and more work-like"; "'roughly scheduling' (without prespecified
  times) eliminates this effect" (Tonietto & Malkoc 2016, J Marketing Research). Verified (about
  half the full text).
- **Buying back time helps.** Across 6,271 people in four countries, spending on time-saving
  services went with greater life satisfaction (d = 0.24); in a field experiment with 60 working
  adults, a time-saving purchase raised end-of-day positive affect over a material one (Whillans et
  al. 2017, PNAS). Verified (most of the full text).
- **Household load is mostly noticing.** Cognitive household labor is "anticipating needs,
  identifying options for filling them, making decisions, and monitoring progress" (Daminger 2019,
  ASR; 70 interviews, 35 couples). Verified (abstract). This is exactly the part software can carry:
  noticing and monitoring, not deciding for the family.
- **Detachment on days off** (3.2) applies here too.
- Products: #591 already ruled on Monica, Grocy, Homebox and Gentler Streak. No new donor beats
  BEYOND's own recovery contract for Gavin's shape. Assumed.

**What BEYOND has (Verified).** `src/application/recoveryContract.ts` (RUN OVER: sleep first, easy
training or rest, keep the day light; written only on CONFIRM as plan items),
`postRunReport.ts`, `lifeTransition.ts` (RUN_OVER, FREE_AGAIN), Week Planner, obligations and
recurrence (`src/engine/recurrence.ts`), People and Home facts, routines, notes sweep.

**The gap.** The first day off protects recovery but says nothing about the rest of life: no rough
together-time, no "one house thing that's come due", no protected open time. And stewardship items
surface by due date, not by "you have two days off now, this is the useful moment".

---

## 4. Portfolio: seven bounded objectives

*Signed: PS (ranking), with each specialist on their brief.*

### Scoring (1 to 5; attention cost: higher = asks less; risk: lower = better)

| # | Objective | Lived value | Attention cost | Foundation fit | Evidence | Grayson leverage | Risk | Size |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 1 | NIGHT-CURVE-TRUTH-001 | 5 | 5 | 5 | 4 | 4 | 2 | S |
| 2 | GARMIN-DAY-SLEEP-CHECK-001 | 4 | 4 | 5 | 3 | 5 | 1 | S |
| 3 | SHIFT-DOWN-BRIDGE-001 | 5 | 4 | 4 | 3 | 5 | 2 | M |
| 4 | CAFFEINE-BY-DOSE-001 | 3 | 4 | 5 | 4 | 2 | 1 | S |
| 5 | FIRST-DAY-OFF-SHAPE-001 | 4 | 4 | 4 | 3 | 4 | 2 | M |
| 6 | HONEST-BURN-001 | 3 | 3 | 4 | 4 | 3 | 3 | M |
| 7 | TRAIN-WINDOW-001 | 3 | 4 | 4 | 3 | 3 | 2 | M |

Ranking rule: lived value and evidence first, then attention cost and foundation fit; risk breaks
ties. #1 and #2 come first because they make facts BEYOND already shows true; everything later,
Orientation included, reads those facts.

---

### 1. NIGHT-CURVE-TRUTH-001: the drive-home warning holds on every night

- **What Gavin experiences.** Monday 05:50, end of the third night in a row: TODAY's energy line shows the low
  where his body actually is, at the end of the shift, and says "Extra care on the drive home,
  06:00–07:00." On the first night after days off it says the same, as it already does.
- **Grayson place.** Foundations layer · scenarios 3 and 5 · Loop: Live, Transition.
- **Builds on.** `src/application/alertness.ts` (`energyCurve`, `habitualWake`,
  `LOW_BEFORE_WAKE_H`), `alertnessQueries.ts`, `src/ui/screens/today/TodayEnergy.tsx`,
  `src/engine/sleepRhythm.ts` (sleep by kind of day).
- **Evidence.** Folkard 2008 (<3% full adaptation); Lee et al. 2016 (post-night drive risk); this
  report's simulation (Correction C1).
- **Change, at brief level.** Place the circadian low from the off-day (night-sleep) rhythm, or a
  cited early-morning default when off-day data is thin, instead of the median wake across all
  recent sleeps. Keep the two-process model, the 15-minute steps and the estimate label.
- **Exclusions and tradeoffs.** No score, no alert or notification (that is run 2 and Protected),
  no Engine input, no light plan, no chronotype questionnaire. Tradeoff: someone who truly adapts
  will see a slightly pessimistic curve; the card says the low is placed from his off-day rhythm.
- **Done when.** Tests with fixtures for a steady two- and three-night run, the first night after
  days off, and a mixed week each place the low between 03:00 and 08:00 local and raise the drive
  line when the shift ends in it; the panel's basis line names how the low was placed; existing
  ENERGY-CURVE tests still pass; source constants carry links and quotes as today.
- **Lane.** Feature with mandatory independent review (it amends the approved ENERGY-CURVE-001
  model, not TODAY's layout). If Gavin reads it as changing ENERGY-CURVE-001's approval, Protected,
  TODAY presentation. **Size S.** **Depends on** nothing.

### 2. GARMIN-DAY-SLEEP-CHECK-001: is your watch seeing your day sleep?

- **What Gavin experiences.** Tuesday 15:30 after Monday's night, if no Garmin main sleep has
  arrived since the shift ended, BEYOND asks once: "No sleep from Garmin since your shift. Sync
  now · I slept, log it · I didn't sleep." Once, in setup or DATA, it shows a one-line tip that
  Garmin tracks sleep during the "normal sleep hours" set in Garmin Connect.
- **Grayson place.** Foundations · scenario 1 · Loop: Wake, Learn.
- **Builds on.** `android/health-bridge` freshness hint, `src/application/externalSleepQueries.ts`,
  `garminSleep.ts`, `src/engine/sleepDraft.ts` (shift-end draft), `src/application/healthSync.ts`,
  the existing sleep entry and fix paths (`src/application/alfred/fixEntries.ts`).
- **Evidence.** Garmin vivoactive 4 manual (Verified); Chinoy et al. 2023 (short sleeps missed most).
- **Exclusions and tradeoffs.** No new Health Connect permission, no Garmin account or API, no
  notification (the prompt shows when he opens BEYOND), no change to GARMIN-003's owner-wins rule.
  Tradeoff: one more prompt; capped at once per lived day.
- **Done when.** Fixtures: shift ended, no main sleep by a threshold after the usual post-shift
  sleep end → prompt shows once; Garmin sleep arrives → prompt never shows; each answer goes
  through an existing command or sync path; nothing writes without a tap; Health Bridge manifest
  and CI checks unchanged.
- **Lane.** Feature. **Size S.** **Depends on** nothing. Run 2's notification work may later decide
  whether this can ever alert; not part of this objective.

### 3. SHIFT-DOWN-BRIDGE-001: Deputy Lohnes to Gavin in two minutes

- **What Gavin experiences.** Saturday 06:05 in the car park after Friday's night, SHIFT DOWN opens to three optional taps:
  park anything unfinished, one minute of slow breathing, and pick what's first at home. He's done
  before the engine's warm, and the Drive Home voice log is one tap away.
- **Grayson place.** Roles and Reflection layers · scenarios 5 and 6 · Loop: Transition.
- **Builds on.** `src/ui/screens/today/ShiftDownCard.tsx`, `resetShiftDownCopy.ts`, the existing
  shift-down session commands, capture (`src/ui/screens/today/CaptureSection.tsx`) and reminders,
  `src/ui/components/DriveHome.tsx`, `src/application/shiftMarks.ts`, the post-shift plan line.
- **Evidence.** Sonnentag (detachment); Masicampo & Baumeister 2011 (plans quiet unfinished goals,
  title only); Scullin et al. 2018 (writing what's next); Balban et al. 2023 (cyclic sighing).
- **Exclusions and tradeoffs.** No debrief questions about calls, people or cases; no new stored
  record beyond what capture and the existing session already store; no Engine change (the Engine
  still recommends SHIFT DOWN only as today); no streak or "shift-down done" count; breathing is
  never a gate. Tradeoff: the 5 to 30 minute timer moves one tap deeper.
- **Done when.** The three steps each complete or skip in one tap, total under 2 minutes in a
  timed walkthrough at 360 px; a parked item lands in capture with its time; the "first thing at
  home" pick is not persisted beyond the lived day and never read by the Engine; MARK WORK ENDED
  and the timer remain reachable; accessibility and reduced-motion checks pass for the breathing cue.
- **Lane.** Feature (inside an existing TODAY card; no composition change). If the bridge needs to
  appear unasked at shift end, that is TODAY composition and Protected. **Size M.** **Depends on**
  #1 for the drive line it hands off to (soft).

### 4. CAFFEINE-BY-DOSE-001: a cut-off for what he actually drinks

- **What Gavin experiences.** Thursday night, the caffeine cut-off reads "Coffee by 23:00,
  pre-workout or energy drink by 18:30" for a usual 07:45 sleep, each with its source.
- **Grayson place.** Foundations · scenario 4 · Loop: Live.
- **Builds on.** `src/application/shiftSleepPlan.ts` (`CAFFEINE_CUTOFF_HOURS`, `SOURCES.CAFFEINE`),
  `alertnessQueries.ts` (draws the cut-off), UX_DECISIONS SHIFT-SLEEP-PLAN-001.
- **Evidence.** Gardiner et al. 2023 (8.8 h coffee, 13.2 h pre-workout).
- **Exclusions.** No caffeine logging (still a schema change), no dose calculator, no Engine input.
- **Done when.** Constants and source updated with quote; both lines render where the old one did;
  tests cover overnight wrap; the decision register entry is amended in place.
- **Lane.** Protected (amends a locked rule in SHIFT-SLEEP-PLAN-001). **Size S.** **Depends on**
  Gavin's answer to Q1.

### 5. FIRST-DAY-OFF-SHAPE-001: the first day off, roughly shaped

- **What Gavin experiences.** Monday after a three-night run, RUN OVER offers the recovery contract
  plus three rough pieces: "Sleep first · Something with Elle, sometime this afternoon · One house
  thing that's due (smoke detectors) · The rest is yours." No clock times unless he adds them.
- **Grayson place.** Life and enjoyment, Commitments · scenarios 7 and 8 · Loop: Plan, Steward.
- **Builds on.** `src/application/recoveryContract.ts`, `lifeTransition.ts`, `postRunReport.ts`,
  obligations and `src/engine/recurrence.ts`, People facts, Week Planner.
- **Evidence.** Tonietto & Malkoc 2016 (rough scheduling); Daminger 2019 (noticing and monitoring);
  Whillans et al. 2017 (time is worth buying back).
- **Exclusions and tradeoffs.** No relationship scoring or suggested gestures, no auto-booking, no
  new planner, nothing written without CONFIRM, no change to the schedule or programme. Tradeoff:
  "Something with Elle" may feel presumptuous; it is off until he turns it on (Q5).
- **Done when.** RUN OVER shows the extra pieces only when enabled; the stewardship pick is the
  nearest due recurring obligation within the off-day span; items save through the existing
  plan-item path with plannedAt only; Engine eligibility unchanged (tests prove a saved item can't
  change the recommendation, as SHIFT-SLEEP-PLAN-001's tests do).
- **Lane.** Feature (extends an approved optional card). **Size M.** **Depends on** nothing; run 2's
  notification rules if it ever alerts.

### 6. HONEST-BURN-001: an expenditure estimate that knows a partial day

- **What Gavin experiences.** Weekly shows "Burn about 2,900–3,200 a day, from 19 of 28 days (6
  looked partly logged and were left out)." He can mark a day "not fully logged" from the diary.
- **Grayson place.** Growth (health mission) · scenario 9 · Loop: Learn.
- **Builds on.** `src/engine/expenditure.ts`, `src/application/targetProposal.ts`,
  `foodDiaryQueries.ts`, `logEntries.ts`.
- **Evidence.** Ravelli & Schoeller 2020; MacroFactor partial-logging help (product claims).
- **Exclusions.** No auto-change to targets, no proprietary algorithm imitation, no watch calories
  as truth.
- **Done when.** A marked or suspected partial day is excluded and counted in the coverage line;
  the range and abstention rules still hold; the target proposal reads the same corrected
  estimate; tests cover a partial day's effect.
- **Lane.** Protected (Engine behavior; a "not fully logged" mark is likely a new event, so schema
  and backup contract). **Size M.** **Depends on** nothing.

### 7. TRAIN-WINDOW-001: when to train on a rotation day

- **What Gavin experiences.** Wednesday 14:30 before Week B's first night, TRAIN says "Best window:
  now to 16:00, then rest before the shift. REDUCED today means same weights, fewer sets, stop with
  2–3 reps left."
- **Grayson place.** Growth · scenarios 2 and 9 · Loop: Plan.
- **Builds on.** `src/engine/trainSuggestion.ts` (unchanged), `src/application/trainHome.ts`,
  `shiftSleepPlan.ts` windows, `alertness.ts` curve, GYM-UPGRADE reps in reserve.
- **Evidence.** Craven et al. 2022 (hours awake, late restriction); Hickmott et al. 2022
  (autoregulation equal for strength).
- **Exclusions.** No change to which variant the Engine picks, no readiness score, no load
  numbers prescribed, no muscle map.
- **Done when.** The window line derives only from existing shift and sleep windows and abstains
  without a saved schedule; REDUCED copy is the same everywhere it shows; Engine tests unchanged.
- **Lane.** Feature (application read and copy). **Size M.** **Depends on** #1 (uses the curve).

### Red team: trying to kill the top three

*Signed: BS (behavioral scientist), PE (privacy engineer).*

**#1 NIGHT-CURVE-TRUTH-001.**
- BS: "A warning that shows every work morning becomes wallpaper, and wallpaper trains people to
  ignore warnings." Answer: the line is one sentence on a panel he already looks at, not an alert;
  and it is truthful, unlike today's line, which only shows on first nights. Survives, with a rule:
  same wording each time, no escalation, no colour change.
- BS: "Telling a deputy to take extra care can read as nagging about his competence." Answer: the
  copy describes the clock ("your lowest stretch"), never his driving. Survives.
- PE: no new data, no network, no storage. Nothing to kill.

**#2 GARMIN-DAY-SLEEP-CHECK-001.**
- BS: "A prompt every post-shift afternoon is friction." Answer: it only fires when data is missing,
  and once fixed in Garmin Connect it should almost never fire. Survives if capped at once per
  lived day and silenced when he answers "I didn't sleep".
- PE: "Prompting about sleep reveals sleep patterns on screen." Answer: same data already on TODAY;
  no new store. Survives.
- Weakness: we don't know how the watch is set (Q2). If his normal sleep hours already cover day
  sleep, this shrinks to a tip. That's acceptable for an S objective.

**#3 SHIFT-DOWN-BRIDGE-001.**
- BS: "Any ritual the app owns can become one more task after a 12-hour shift." Answer: every step
  skips in one tap, nothing counts completions, and the whole thing is under two minutes. Survives.
- BS: "Breathing advice to a police officer can land as patronizing." Answer: it's one of three
  equal choices with the existing timer, worded as a tool, and the evidence is stated if he looks.
  Survives, but copy needs Gavin's eye.
- PE: "A 'park it' box invites work details onto a personal phone: names, addresses, case facts,
  which may be sensitive or restricted by policy." This is the strongest attack. Answer: no prompt
  asks about work content; the box says "a word or two is enough"; parked items stay local like
  all capture; Alfred is never invoked on them by this flow. Survives with that rule written into
  the brief's exclusions. Gavin should follow his agency's own policy on what he records.

---

## 5. Where production Orientation sits

*Signed: PS, ID.*

LIVED-DAY-ORIENT-PRODUCTION-001 (#591's recommendation) composes existing facts at START DAY:
sleep, the day's kind, the draft recommendation and the energy line among them. Gavin is holding it
to avoid spending effort too early. This run supports the hold for one concrete reason: **two of
the facts Orientation would put first can be wrong for a night worker today** (the drive-home line,
#1, and missing day sleep, #2). Both are small. Doing them first means Orientation, when Gavin
releases it, opens on truthful facts instead of polishing a screen around a known error.

Suggested order: #1 → #2 → (Gavin releases Orientation when he chooses) → #3, which is the Loop's
Transition step and can reuse Orientation's grammar later. #4 to #7 don't depend on Orientation
and can go in any gap.

---

## 6. Killed ideas and why

*Signed: whole team.*

- **A light-seeking phase-shift plan (Timeshifter-style).** Needs a circadian model and chronotype,
  and Gavin's two- and three-night runs make full shifting unlikely to pay off (Folkard 2008,
  inference). Sunglasses on the way home stay.
- **Melatonin timing.** Medication; outside BEYOND's boundaries.
- **A fatigue or readiness score.** Anti-goal. The curve stays a shape, not a number.
- **HRV, Body Battery or training load import.** Garmin doesn't share them to Health Connect
  (Android Central 2025), and HARVEST-003 already rejected them.
- **Watch calories as the burn number.** Weaker than BEYOND's weight-trend method; kept out of #6.
- **Caffeine logging.** Still a schema change with little gain over a clear cut-off.
- **A work debrief with questions about calls or cases.** Privacy and agency-policy risk; #3 parks
  thoughts without asking for content.
- **Shift-down completion counts or streaks.** Anti-goal (guilt mechanics).
- **Auto-scheduling days off or suggested gestures for Elle.** Anti-goals (autonomous manager,
  automated affection). #5 offers rough, optional pieces only.
- **Fasting windows.** The Vision says fasting needs separate approval and evidence; not proposed
  in run 1.

---

## 7. Open questions for Gavin (multiple choice)

*Signed: PS.*

1. **What keeps you going on nights?** A) Coffee · B) Energy drinks or pre-workout · C) Both ·
   D) Very little caffeine. *(Decides whether #4 is worth doing.)*
2. **What are your "normal sleep hours" in Garmin Connect?** A) Set to my day sleep after shifts ·
   B) Still at night times · C) Don't know. *(Decides #2's size.)*
3. **The drive-home line, once it's right:** A) Keep it on TODAY only · B) Later, also one alert
   at shift end (Protected, run 2) · C) Don't show it.
4. **When you walk in the door after nights, what matters most?** A) Clearing my head ·
   B) Being present with Elle and the dogs · C) Getting to sleep fast · D) Depends on the night.
   *(Shapes #3's third step.)*
5. **On your first day off after a run, do you want BEYOND to suggest anything beyond rest?**
   A) No, rest only · B) One rough together-time · C) One house thing that's due · D) Both B and C.

---

## 8. Corrections

*Signed: CS, PE, PS.*

**C1. The energy curve assumes a night worker's body clock follows his sleep. (Verified, code and
simulation.)** `src/application/alertness.ts` sets the circadian low at
`habitualWake(nights) − LOW_BEFORE_WAKE_H` (1.5 h), where `habitualWake` is the median wake time of
the main sleeps in the last 7 days (`alertnessQueries.ts`). This team ran `energyCurve` unchanged
under Node 22 with `TZ=America/Chicago` on three synthetic weeks (lived day from 16:30 on
2026-11-17, shift ending 06:00):

| Scenario | Sleeps used | Low placed at | Drive line | Curve value at 06:00 (0 = day's low) |
|---|---|---|---|---|
| A. Steady nights | five sleeps 07:30–14:00 | 12:30 | **no** | 0.45 |
| B. First night after days off | five sleeps 23:00–07:00 | 05:30 | yes | 0.01 |
| C. Mixed week | three day sleeps + one night sleep | 12:30 | **no** | 0.50 |

The source's own rule of thumb (temperature minimum about 1.5 h before habitual wake) comes from
day-living people. Folkard 2008 finds under 3% of permanent night workers fully adapt. So in
scenarios A and C the curve likely shows Gavin more alert at the end of the shift than he is, and
drops the drive-home line. Fix proposed as objective #1. The simulation is this report's own work,
not a repo test; the builder should turn these three cases into fixtures.

**C2. The caffeine cut-off rests on a 2013 single study; a 2023 meta-analysis says longer.
(Verified.)** `CAFFEINE_CUTOFF_HOURS = 6` cites Drake et al. 2013, which was right to cite in
2026-11-11's build. Gardiner et al. 2023 now gives 8.8 h for a coffee-size dose and 13.2 h for a
pre-workout-size dose. Not a bug: the evidence moved. Objective #4.

**C3. "Shift-work science is a gap" is true of #591's donor list, not of BEYOND. (Verified.)**
The brief for this run listed shift work and circadian science among #591's gaps. #591's donor
table indeed doesn't cover it, but BEYOND already has CIRCADIAN-SPIKE-001, SHIFT-SLEEP-PLAN-001,
ENERGY-CURVE-001, SLEEP-DEBT-LEARNED-001 and HARVEST-003's Rise and Timeshifter study. Future
research should start from those, not from scratch.

**C4. Sleep owed against your own baseline can hide a chronic shortfall. (Verified code; Assumed
effect.)** `src/application/sleepDebt.ts` judges each night against the low end of your own usual
range for that kind of day. If day sleeps after nights are routinely short, the learned baseline
learns the shortfall. The adult consensus is 7 or more hours (Watson et al. 2015,
[AASM PDF](https://www.aasm.org/resources/pdf/adultsleepdurationconsensus.pdf), full text read),
though it says nothing specific about shift workers. Not proposed as an objective here; worth a
line on the sleep page later ("your usual on work days is X; the adult guideline is 7+").

**C5. Check before relying on resting heart rate from Garmin. (Assumed.)** Health Bridge reads
`RestingHeartRateRecord`. The press list of what Garmin sends to Health Connect doesn't name
resting heart rate. Gavin can check in Android Settings → Health Connect → Data → Resting heart
rate. If Garmin doesn't write it, BEYOND's resting-HR features are running on another source or
nothing.

**C6. Branch name.** The run's brief asked for branch `research/grayson-frontier-001-run1`. This
session may only push to its assigned branch, so the draft PR uses that branch instead. Content is
unaffected.

---

## Leverage disposition

- **REUSE:** existing shift sleep plan, energy curve, sleep draft, Health Bridge, Shift Down, Drive
  Home, capture, recovery contract, recurrence, expenditure and training suggestion; published
  research and product patterns named above, as ideas only.
- **OWN:** the mapping of that evidence onto Gavin's 16:30 lived day, his rotation and BEYOND's
  owner-wins and Engine-authority rules.
- **BUILD FROM SCRATCH:** none proposed.

## Dependencies on run 2

Notifications (any alert from #1, #2 or #5), capture and Delta's voice (how #3's parked items and
#5's suggestions read), and sync and backup (any new mark in #6) belong to run 2. None of run 1's
top three needs them.
