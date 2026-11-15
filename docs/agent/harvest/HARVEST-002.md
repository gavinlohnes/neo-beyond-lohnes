# BEYOND — whole-product direction check and capability discovery

Date: 15 November 2026. Repository inspected: `gavinlohnes/neo-beyond-lohnes`, fetched master `5d78a5dd95bc566fcb8aada0ea7ed0b131d43143` (Universal fast capture merged). At initial inspection, the checked-out capture branch’s tree matched fetched master; subsequent harvest changes are documentation-only, with no product files changed.

Authorization: Gavin requested the Discover → Inspect → Classify → Rank → one bounded Claude mission → Verify workflow, then clarified that coverage should span all BEYOND rather than focus on Alfred. Researcher: Codex. Archive branch: `codex/harvest-002`, same fetched master as the research snapshot. Routine documentation lane: facts, recommendations, mission proposal and indexes; no governance rule or new product authorization changed. Independent research QA passed after corrections; product approval/review remains separate. Gavin alone merges any archival PR.

## Conclusion

BEYOND is moving in a useful direction: the recent work completes real daily workflows instead of merely adding AI. The immediate bottleneck is finishing and shipping existing integration work, not a shortage of feature ideas.

**Recommended single Claude mission: finish the existing week-planner PR on its own branch, resolve its current conflicts, verify it against fresh master, obtain independent exact-head review and present it for Gavin's merge.** Do not create another planner. The next new opportunity, after that ships, is consistency between the already-existing capture-promotion paths—not another inbox or notes app.

This uses the existing [Capability Harvest Protocol](https://github.com/gavinlohnes/neo-beyond-lohnes/blob/master/docs/agent/CHP-001.md), rather than installing a second process. Gavin's latest request additionally requires independent review before shipping the selected mission. Research and recommendations are not implementation approval for unrelated new features.

## Coverage: the whole product, with explicit depth

This is **a breadth inventory across BEYOND plus a deeper capture/planning comparison**. It is not an exhaustive audit of every screen or a new physical-device usability study. Commercial claims below are published documentation, not hands-on tests. Open-source inspection covered primary repositories, licences, README/features and selected Super Productivity planner code; it was not a security audit or an implementation audit of every donor feature.

| Area | Actual repository evidence inspected | Reference direction | Current finding |
| --- | --- | --- | --- |
| Daily operation / reachability | `TodayScreen.tsx`, `App.tsx`, `ui/shortcuts.ts`, `vite.config.ts` | Drafts fast entry; Things calm hierarchy | Direct raw Capture and current-workout handoff are built. Home-screen capture is a separate, constrained opportunity. |
| Training | `domain/workout/types.ts`, `strengthReviewQueries.ts`, current gym implementation | Hevy optional effort / set types | Working/warm-up distinction, reps left, exclusion boundary and strength review are present. Do not re-propose the old harvest's missing-effort finding. Hevy's additional drop/failure types are not presumed necessary. |
| Nutrition | `mealPlan.ts`, `mealPlanQueries.ts`, `foodDiaryQueries.ts`, `foodSources.ts`, `SavedMeal` and food lookup types | Cronometer inspectable sources; MacroFactor expenditure feedback | Shift-aware draft meal planning, food diary, macro records and calorie/protein contributors are built. Full micronutrient tracking is not present in the inspected saved-meal pipeline; it would be a much larger data objective. Expenditure is an existing readout, not autonomous calorie coaching. |
| Recovery / sleep | `shiftSleepPlan.ts`, `workContextResolution.ts`, current metric-detail source handling | Gentler Streak respect for rest; accepted shift-work research | Context-sensitive recovery and source-labelled sleep/shift planning exist. Do not import a proprietary readiness score or automatically change recommendations. |
| Habits | `domain/habits.ts`, `habitQueries.ts`, `habitCommands.ts` | Loop flexible frequency / offline history | Explicit Done / Didn't do it / Not recorded, 28-day history and corrections are present. “N times per week” is not one of the current four schedule kinds. It is a real possible gap, not the next automatic build. |
| Work / shifts | `workContextResolution.ts`, `weekAheadQueries.ts`, `trainingProgrammeQueries.ts` | Calendar-aware planners, adapted to BEYOND's lived day | Recorded > confirmed > forecast context is already shared. A calendar date must not silently replace 16:30 lived-day semantics. |
| Capture / tasks / planning | `FastCapture.tsx`, `CaptureSection.tsx`, `NotesSweep.tsx`, `SortInbox.tsx`, Plan Today and its queries | Drafts / Things / Todoist / Sunsama / Super Productivity / Vikunja | Raw-first capture, optional task promotion, two existing review experiences and task-date lists exist. Promotion options differ by entry path; the interactive week planner is built in an unmerged PR. |
| Review / evidence / Alfred | `metricDetail.ts`, `weeklyDebrief*`, `weeklyInterview.ts`, `alfredActions.ts`, prior accepted harvest | Evidence before advice; deliberate confirmation | Long-window/source-based review and confirmed proposal paths already exist. Alfred is one subsystem—not the default target. Individual Alfred tool coverage needs its own audit before claiming that writers are missing. No new Alfred/evidence work is proposed here. |

## Discover: what the references actually contribute

| Reference | Useful documented pattern | Source / licence disposition |
| --- | --- | --- |
| Drafts | Opens ready to type; capture before choosing a use; inbox and later actions | [Product](https://getdrafts.com/). Proprietary: interaction ideas only, no code/assets copied. |
| Things | Inbox capture, optional details kept out of the way, Today/Upcoming with calendar events | [Features](https://culturedcode.com/things/features/). Proprietary: ideas only. |
| Todoist | Fast natural-language task entry, Today/Upcoming and task filters | [Features](https://www.todoist.com/features). Proprietary: ideas only. Its parsing/points are not blanket recommendations for BEYOND. |
| Sunsama | Deliberate planning, calendar context and end-of-day reflection | [Current planning docs](https://help.sunsama.com/docs/usage-guides/daily-planning/), [shutdown docs](https://help.sunsama.com/docs/usage-guides/daily-highlights/). Proprietary. Current planning documentation includes automated choices; those do not fit BEYOND's explicit-confirmation rule. |
| Super Productivity | Offline-first daily planning; task/calendar/deadline composition and timeboxing | [Repository](https://github.com/super-productivity/super-productivity), [pinned planner model](https://github.com/super-productivity/super-productivity/blob/2b3f78edbf0721f0842daa097e47247fe245852f/src/app/features/planner/planner.model.ts), [licence](https://github.com/super-productivity/super-productivity/blob/2b3f78edbf0721f0842daa097e47247fe245852f/LICENSE). **MIT verified**, not assumed GPL. Adaptation would require attribution and file/dependency review; none is proposed. |
| Vikunja | Task-centric quick add and multiple task views | [Features](https://vikunja.io/features/), [repository](https://github.com/go-vikunja/vikunja), [licence](https://github.com/go-vikunja/vikunja/blob/293264397571be437c9bc9a32b4c492bd566dbc2/LICENSE). AGPL-3.0-or-later: ideas only under CHP-001. Quick-add implementation was not audited; no parser reuse proposed. |
| Hevy | Optional effort, explicit set types and inline previous performance | [Set types](https://www.hevyapp.com/features/workout-set-types/), accepted HARVEST-001. Proprietary: ideas only. Compare individual semantics, not just “set types” as a name. |
| Cronometer | Food journaling, broad nutrient detail and inspectable nutrition | [Product](https://cronometer.com/). Proprietary. BEYOND already has some source/contribution views; a 95-nutrient system would be different scope. |
| MacroFactor | Feedback from measured intake/weight and expenditure | [Product](https://macrofactor.com/), accepted HARVEST-001's check-in research. Proprietary. Existing BEYOND expenditure readout does not imply adaptive coaching parity or permission to change targets. |
| Gentler Streak | Treat rest as compatible with sustained activity | [Current product destination](https://gentlerstories.com/gentlerstreak). Proprietary. Borrow the low-pressure principle, not an unverified score/formula. |
| Loop Habit Tracker | Flexible frequency such as three times weekly; offline operation | [README](https://github.com/iSoron/uhabits/blob/dev/README.md), [repository](https://github.com/iSoron/uhabits). GPL-3.0: ideas only under CHP-001. |

Sources were retrieved on the research date. Commercial web pages may change. Super Productivity was inspected at `2b3f78edbf0721f0842daa097e47247fe245852f`; Vikunja at `293264397571be437c9bc9a32b4c492bd566dbc2`. Both primary repositories were unarchived. Loop's primary repository/licence and README were checked. Existing accepted research is in `docs/agent/harvest/HARVEST-001.md`; current code overrides its stale capability inventory.

## Inspect and classify

EXISTING = already implemented adequately for the identified purpose. REFINE = present but a concrete interaction/integration gap exists. MISSING = absent from the inspected implementation. UNSUITABLE = conflicts with doctrine/current scope or duplicates existing work. None of these labels implies complete parity with an entire reference app.

| Opportunity | Classification | Evidence and implication |
| --- | --- | --- |
| Raw capture with no destination first | EXISTING | `FastCapture.tsx`; merged capture PR. Do not build another composer. |
| Optional confirmed task / planned-item promotion | EXISTING | Fast capture calls existing atomic `convertCaptureToObligation` with optional planned/due dates. |
| One-at-a-time review | EXISTING | `NotesSweep.tsx` already reviews raw notes; `SortInbox.tsx` reviews Saved items. A new review queue would duplicate both. |
| Equivalent promotion after returning to an old capture | REFINE | Fast capture previews title/planned/due fields; legacy Capture list exposes title/due; Notes Sweep creates a task directly. Reuse consistent choices rather than invent another inbox. |
| Global search and history | EXISTING | `searchQueries.ts` indexes captures including resolved items; absence of an inbox search field is not absence of global retrieval. |
| Task date views / wrap up today | EXISTING | Plan Today provides Today / Next 7 / No date / Waiting and explicit tomorrow moves. Due and planned dates are distinct. |
| Editable week with work / workout / task / saved-calendar context | REFINE — implemented in an unshipped PR | Existing [week-planner PR](https://github.com/gavinlohnes/neo-beyond-lohnes/pull/529) is draft and conflicting with current master. It is not shipped and not missing code. Continue that branch, not a competitor. |
| Calendar-aware read-only Week Ahead | EXISTING | `weekAheadQueries.ts` and `WeekAheadView.tsx`; interactive placement is the in-flight refinement above. |
| Dedicated home-screen Capture shortcut | MISSING, platform-constrained | Current manifest offers workout/water/meal/sync, and `parseShortcut` does not accept capture. [PWA guidance](https://web.dev/articles/app-shortcuts) says displayed shortcut count varies by platform; simply appending an entry is not reliable. Verify target launcher and preserve existing controls before proposing a change. |
| Habit quota such as three times a week | MISSING | Current kinds: ANY_DAY / WEEKDAYS / WORK_DAYS / DAYS_OFF. Requires its own domain/history/UX decision. |
| Full micronutrient diary/planning | MISSING in inspected pipeline | Saved meals/lookup normalize macros; food-source view exposes calories/protein. A broad nutrient system is not a tiny UI refinement. |
| Manual duration/timeboxing | MISSING in inspected task plan | No complete duration/capacity model was established. Do not label days free or feasible from item counts. |
| Silent date assignment, AI filing, auto-calendar placement or timeout-as-consent | UNSUITABLE | Violates explicit-confirmation/user-authority constraints. Current Sunsama/Vikunja/Todoist behaviors are references to judge, not behaviors to copy blindly. |
| Karma, pressure to empty the inbox, engagement streaks | UNSUITABLE | Not a measure of BEYOND's usefulness and conflicts with the calm operator experience. |
| Merge raw Capture and Saved into one new database model | UNSUITABLE for this cycle | Different provenance/lifecycle and existing commands; a schema merger is unnecessary for the identified gaps. |

Important correction to the initial hypothesis: raw notes already have a sweep. The gap is **parity and reachability of existing processing**, not the absence of review. Old comments also describe historical placements; current App wiring places Notes Sweep in the existing daily-controls support, so placement claims must be checked in code.

## Rank: one mission, not a feature shopping list

Scores are engineering/product judgments, not measured personal usage. Each dimension is 1–5. Daily usefulness and integration value are better when high; effort and risk are worse when high. Planning score = 0.4 × usefulness + 0.3 × integration + 0.2 × (6 − effort) + 0.1 × (6 − risk). Numbers make tradeoffs visible; they are not a scientific prediction.

| Opportunity | Daily usefulness | Integration | Effort | Risk | Score | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Finish existing week planner | 5 | 5 | 2 | 2 | 4.7 | **Select one delivery mission.** Already-approved implementation; resolve integration and renew evidence. Effort/risk are provisional until conflicts are inspected. |
| Capture-promotion parity | 4 | 5 | 2 | 2 | 4.3 | Best new refinement after the active delivery closes; not a second mission now. |
| Home-screen Capture entry | 4 | 3 | 2 | 4 | 3.5 | Validate OS shortcut limits and owner priorities first; do not silently remove existing actions. |
| Flexible weekly habit quota | 4 | 3 | 3 | 3 | 3.4 | Worth a future bounded domain decision; preserve unknown versus explicit negative history. |
| Manual timeboxing | 4 | 4 | 5 | 4 | 3.2 | Larger model/UX work, below finishing existing integration. |
| Full micronutrient system | 4 | 3 | 5 | 5 | 2.8 | Significant data/maintenance scope, not the next improvement. |

The additional CHP-001 criteria are assessed explicitly below; they are qualitative rather than extra pseudo-precise numbers.

| Opportunity | Visual / interaction value | Doctrine fit |
| --- | --- | --- |
| Finish existing week planner | High: one coherent weekly view and explicit movement, rather than hunting across separate screens. Actual phone usefulness still needs field confirmation. | Strong within its approved brief: honest provenance, manual choices, no free-time score or new recommendation authority. |
| Capture-promotion parity | High: the same optional preview after immediate capture and later processing reduces relearning and date mistakes. | Strong if raw remains valid, dates remain explicit and existing commands/provenance are preserved. Requires its own owner-approved slice. |
| Launcher Capture entry | High potential speed outside the app; discoverability/display cannot be assumed across launchers. | Conditional: preserve existing authorized shortcuts and confirm platform behavior/owner priorities before changing them. |
| Flexible weekly habit quota | Potentially useful for realistic frequency without daily pressure; history and unknown/negative answers need careful design. | Conditional: a new habit-semantics objective and owner decision, not permission to reinterpret old answers or add streak pressure. |
| Manual timeboxing | Could improve placement, but crowded schedules and imprecise duration estimates could increase fatigue. | Conditional: explicit operator estimates only; no automatic scheduling, invented available hours or covert Engine authority. New model/scope approval required. |
| Full micronutrient system | Richer detail but considerable surface complexity; an optional inspection layer would be essential. | Conditional: verified nutrient sources, honest gaps and new data/maintenance scope approval. Not a compulsory health grade or the next build. |

The week planner wins primarily because it integrates work, training and commitments and already has an approved implementation. Its current conflict is established by GitHub, not speculation: PR head `32fb0f969d45dd790abb57ff5817baccbc8eba4c`, branch `codex/week-planner-001`, draft, OPEN, CONFLICTING/DIRTY when checked. Historical head checks were green; that does not verify integration with today's master. No durable independent exact-head review comment or native review was visible in the live PR reads; obtain one rather than trusting old conversational claims.

## Unresolved questions — not implementation authority

- Will the integrated week planner reduce real phone friction with Gavin’s actual shift and calendar data? Synthetic/browser evidence does not answer that; field-check after owner merge.
- Which Capture promotion entry path is actually used most? No personal usage telemetry or whole-app physical-device timing was collected.
- Which app shortcuts does the operator’s installed launcher display, and which existing entries must remain prominent? Test before proposing a native entry change.
- Are flexible habit quotas or broader nutrient detail sufficiently useful to justify their domain/history/maintenance costs? These are candidate owner decisions, not already-approved features.
- How much week-planner conflict resolution is needed on the latest master? Inspect at handoff; the effort/risk estimate is provisional.

## Build and verify

The one prepared handoff is [Claude mission](HARVEST-002-CLAUDE-MISSION.md): finish the existing week planner without expanding it. It requires fresh repository truth, the existing branch/PR, preserved raw capture/speed/upstream work, proportional local verification, full CI, independent exact-head review and Gavin's merge. No automatic merge and no next improvement until this is delivered and owner-integrated.

No application code, configuration, governance rules, existing implementation PR state or external account was changed during this discovery. No new product tests/build were run or claimed: this is research and mission preparation. The proposed implementation must run its own checks on its actual final head. Per CHP-001, the completed research and mission are being archived as HARVEST-002 on a separate documentation branch/PR and indexed from the capability map; archival is separate from planner implementation and does not expand that mission.
