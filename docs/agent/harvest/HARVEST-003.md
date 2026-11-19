# HARVEST-003 — signature features from other apps, and finishing the house

- **Authorization:** Gavin, 2026-11-19. "We have a good foundation. Now we need to wire it all together and finish
  the house", then "C, do both. I explicitly like the idea of taking things or ideas from other apps and making them
  work for us."
- **Researcher:** Claude Code. **Method:** CHP-001 (Discover → Inspect → Classify → Rank → one plan), with web research
  on 11 apps on 2026-11-19 and a check of each feature against BEYOND's code on master `277d439`. This is research
  only: nothing here is approved for build until Gavin approves the plan at the end.
- **Caveats:**
  - Feature descriptions come mostly from each company's own pages and help centres. They are product claims, not
    independent validation.
  - Licences: these are ideas, not code. No reference app's source, assets or identity is reused. BEYOND builds its
    own version.

## 1. Signature features, and what BEYOND has

| App | Signature feature (source) | In BEYOND today | Verdict |
|---|---|---|---|
| **Rise** | An "energy schedule": a forecast of the day's energy peaks and dips from the circadian rhythm, a ~1-hour melatonin window, and sleep debt over 14 nights ([review](https://www.risescience.com/blog/rise-app-review), [App Store](https://apps.apple.com/app/id1453884781)) | Sleep debt from learned sleep (SLEEP-DEBT-LEARNED-001), and shift sleep plan cards with a caffeine cut-off and a nap window (CIRCADIAN-SPIKE-001). **No energy curve.** | **ADAPT**: a shift-worker energy curve |
| **Timeshifter Shift Work** | A plan from the rotation: when to sleep, when to seek or avoid light, caffeine timing, push advice, and a **fatigue prediction that warns when to take extra care** ([timeshifter.com](https://timeshifter.com/shift-work-app), [caffeine](https://timeshifter.com/shift-work/caffeine-and-shift-work)) | Caffeine and nap cards exist. Light timing is thin. **No fatigue warning** (for example, the drive home). | **ADAPT**: light windows and a fatigue warning before DRIVE HOME |
| **Fitbod** | A 0–100% recovery score per muscle group from logged sets, reps and load, shown as a body heat map, which picks the next workout ([help](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout), [blog](https://fitbod.me/blog/muscle-recovery/)) | Exercises carry a muscle group. **No per-muscle freshness or map.** | **ADAPT**: a muscle-freshness map, advisory only |
| **WHOOP** | Journal "Impacts": logged behaviours against recovery, unlocked after 5 yes and 5 no entries in 90 days, with honest caveats ([WHOOP](https://whoop.com/thelocker/a-new-way-to-see-insights-on-which-behaviors-affect-your-recovery)) | Experiments (LOOP TRY) with Welch ranges (EXP-STATS-001), habits, check-ins and Ask. **Insights aren't automatic.** | **ADAPT**: "What moves your numbers" |
| **Exist.io** | Correlations between mood and everything tracked, including next-day effects ([kb](https://kb.exist.io/article/55-will-exist-find-correlations-across-multiple-days), [mood](https://exist.io/about/mood/)) | Same as WHOOP above | Merge with the WHOOP row: include next-day effects |
| **MacroFactor** | Photo, or photo plus text, meal logging that splits a plate into **editable database foods**, not one opaque total ([help](https://help.macrofactorapp.com/en/articles/258-ai-food-logging), [blog](https://macrofactor.com/ai-food-logging/)) | Text and voice through Alfred cards, a USDA lookup and barcodes. **No photo logging.** | **ADAPT**: photo to itemised USDA matches |
| **Hevy** | A Live Activity widget: current exercise, next set, the previous set and a rest timer on the lock screen, with sets marked done from it ([help](https://help.hevyapp.com/hc/en-us/articles/35649846517399)) | Gym mode and the rest timer are in-app only. **Nothing on the lock screen.** | **ADAPT (larger)**: an ongoing notification through Health Bridge |
| **Gentler Streak** | An Activity Path (load against your own band), rest days that keep a run alive, a "sneak peek" of the coming days, and a status for sick or injured ([BGR](https://bgr.com/lifestyle/gentler-streak-gets-two-long-awaited-features-ahead-of-watchos-26), [App Store](https://apps.apple.com/us/app/gentler-streak-fitness-tracker/id1576857102)) | Weekly training against measured recovery (#548) and deload after a stall. **No visual path or forecast.** | **ADAPT (later)**: a load path inside the energy and recovery thread |
| **Oura** | Symptom and Health Radar (early strain signals), and Advisor (an AI coach) ([Health Radar](https://ouraring.com/blog/introducing-health-radar), [Advisor](https://www.androidcentral.com/wearables/oura-app-advisor-labs-test-launch)) | "Unusual for you" runs (ROTATION-002) and Alfred | **EXISTS**: refine the wording, nothing new to build |
| **Garmin Connect IQ** | Watch widgets for logging (Garmin's own hydration widget; third parties such as Ozmo) ([Garmin](https://www8.garmin.com/manuals/webhelp/forerunner945/EN-US/GUID-976C04FF-A4A4-4925-AA4F-34E44C4D468A.html), [Ozmo](https://www.garmin.com/en-US/blog/?p=27238)) | Health Bridge reads Garmin data. **No logging from the wrist.** | **BIG BET**: a new toolchain (Monkey C), so its own decision |
| **Finch** | A pet that grows as you finish your own self-care goals ([review](https://yourstory.com/2022/06/app-review-self-care-pet-finch-gamifies-mental-wellbeing)) | PR tags, weight milestones, the year review | **ADAPT (light)**: visible progress without streak pressure. Keep the doctrine: no guilt mechanics. |

**Already rejected, and not reopened** (CAPABILITY_MAP "out of scope"): readiness, Body Battery and sleep scores;
habit strength scores; HRV import; social feeds.

## 2. Wiring map: what should feed what

BEYOND's parts mostly sit side by side. These are the missing or weak links, each found in the code on master
`277d439`.

| # | Link | Today | Should be |
|---|---|---|---|
| W1 | Measured data → today's recommendation | TODAY: "Not checked in. Check in for today's recommendation." TRAIN: "Check in for a suggested session." The Engine needs a check-in. | A **draft** recommendation from Garmin sleep, resting HR, shift position and sleep owed. The check-in confirms or adjusts it in 2 taps. *(Engine: Protected.)* |
| W2 | Training load → tonight's sleep plan and tomorrow's suggestion | The sleep plan reads the shift transition only. | A hard or late session shows in tonight's plan ("protect sleep tonight") and in tomorrow's suggestion. |
| W3 | Sleep plan → alerts | Plan cards save as plan items, "planned, never due". REMIND-AT alerts are for tasks only. | The caffeine cut-off and wind-down become alerts, inside the existing 3-a-day cap and quiet hours. *(Notification kinds: Protected.)* |
| W4 | Every number → its page | Water, steps, resting HR, calories, weight and protein open the metric page. Workouts (METRIC-PAGE-002 slice 3) are with another builder. | Finish slice 3. |
| W5 | Habits → insights | Habits and check-ins are stored, but nothing reads them against sleep, energy or resting HR automatically. | Feeds "What moves your numbers" (S3). |
| W6 | Workouts → protein | The protein target is grams per pound only. | Optional: training days show the same target and say "lifting day". Facts only; the target only changes if Gavin sets it. |

## 3. Proposed plan: "BEYOND runs your night"

One objective, built in this order. Each part is its own PR with one review at the end, and nothing merges without
its gates.

| Order | Part | What Gavin feels on day one | Built from | Up-front approval needed |
|---|---|---|---|---|
| 1 | **S1. The night energy curve** (Rise + Timeshifter) | TODAY shows a 24-hour line of expected alertness for this lived day, from your sleep timing, sleep owed and the shift. On it: the caffeine cut-off, the nap window, light windows and **"extra care: drive home"** where alertness dips. | shiftSleepPlan, sleep debt, the shift clock, DRIVE HOME | A new TODAY panel (Protected TODAY layout). The curve is an estimate, labelled as one, and never a score. |
| 2 | **W1. A draft recommendation before the check-in** | TODAY opens with "Short sleep, night 1 of 2: suggest RECOVERY", with CONFIRM or ADJUST. The check-in is 2 taps, not a gate. | Engine, capacity, measured snapshot | **Engine change (Protected).** Explicit ruling needed. |
| 3 | **S2. Meals by photo** (MacroFactor) | Photograph the plate. A card lists "Chicken breast ~150 g · rice ~1 cup · broccoli", each one a real USDA food you can edit. Nothing saves until you confirm. | Alfred (Anthropic, approved), USDA lookup, meal cards, fiber and sodium | Photos go to Anthropic. Estimates are marked and never save themselves. |
| 4 | **S3. What moves your numbers** (WHOOP + Exist) | DATA shows "On days you lifted, your next main sleep ran 24 min longer (8 vs 9 days) · can't tell yet / likely". It appears only once there are 5 days with and 5 without, using EXP-STATS ranges. | Habits, check-ins, workouts, sleep, experiments | None if read-only (no score, no advice). |
| 5 | **W2 + W3. Training feeds the night; the plan alerts** | After a late heavy session the curve and sleep plan adjust, and the caffeine cut-off buzzes once. | Parts 1 and 3, REMIND-AT, Bridge alerts | **New alert moments (Protected).** |
| 6 | **S4. Muscle freshness map** (Fitbod) | TRAIN shows a body map shaded by how recently and how hard each muscle group worked. It's advisory; the Engine still suggests. | Exercise muscle groups, performed sets | None (read-only). |
| Later | Hevy-style lock-screen workout, Garmin wrist logging, a light "progress path" | | Health Bridge (Android) or a new Connect IQ app | New toolchain, phone testing |

## 4. Decisions for Gavin

1. **Approve the plan and its order**, or reorder it (parts 1–6).
2. **Grant the Protected approvals up front**, so the build doesn't stop mid-night: a new TODAY panel (part 1), the
   Engine draft recommendation (part 2), photos to Anthropic (part 3), and new alert moments (part 5).
3. **Pace:** parts 1–3 in one night (each still its own PR), or one part per night.
