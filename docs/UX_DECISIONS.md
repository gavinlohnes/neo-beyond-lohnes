# BEYOND — UX Decision Register

Concise, durable record of product/UX behavior that has been explicitly
decided and locked in this codebase's chat-built rebuild lineage (see
[README.md](../README.md#versions--lineage) for the lineage explanation).
Written for future sessions (human or Claude) so a decision doesn't need
to be re-derived from git archaeology or re-litigated by accident.

Each entry is the *decision*, not the implementation — see the linked
file for the current code. If code and this register disagree, treat it
as an authority conflict to adjudicate; do not silently assume either
that implementation overrides a locked decision or that stale prose
accurately describes current behavior.

## Constitutional adjudication

Locked 2026-08-29: [`OPERATOR_INTERFACE_DOCTRINE.md`](OPERATOR_INTERFACE_DOCTRINE.md) is the
durable constitutional authority for what BEYOND's operator interfaces are allowed to mean.
This register records narrower locked product/UX adjudications under that doctrine; code and
tests record current implementation truth. Neither doctrine nor this register independently
authorizes implementation: future changes require a direct owner decision and an explicitly
authorized, bounded Drop. `FIELD_ALPHA_CAMPAIGN.md` remains unchanged historical evidence, not
standing implementation authority.

## ROADMAP 1.0 rulings (locked 2026-09-30, direct owner ruling, ROADMAP-1.0-001)

These rulings go with [`ROADMAP_1.0.md`](ROADMAP_1.0.md). Where one overrides an older entry
below, this entry wins; the older entry is kept for history.

- **Bodyweight trends, milestones, and a projected goal date are now allowed.** Overrides BODY's
  "a fact only, no goal" position for bodyweight.
- **Review and the weekly check-in may show trends.** Narrows the "Trend charts" item in
  "Explicitly out of scope" below for these two surfaces.
- **Planned Work lives on TRAIN only.**
- **Nutrition Targets move to a Settings group in MORE.**
- **BODY's STATUS box shrinks.** Overrides FIELD-PROTOTYPE-001's fixed height.
- **The "No action needed" button becomes neutral, not red.** Overrides the red-budget entry
  below that kept it red.
- **Red never decorates.** Remove it from headers, labels, brackets, the status strip edge, and
  BODY chips.
- **Hold-to-confirm is for big moments only** (finishing a workout, ending the day, logging a
  clean day), never for routine sets.
- **As built in Drop 2 (Declutter II).** BODY's sleep, bodyweight, and protein trackers are
  one-line rows until tapped, with a DONE chip to close them. Red stays only on primary buttons,
  the dominant recommendation's rail, real warnings (yellow/red status), and the active-tab
  marker. Headers, eyebrows, section labels, the GREEN status-strip edge, and BODY's selected
  chips are neutral; the field-note corner brackets are gone.
- **As built in Drop 3 (Tidy).** Planned Work is off TODAY (TRAIN keeps its card; the same
  fact still feeds the Engine). MORE has a Settings group: Nutrition Targets (moved from BODY,
  which keeps its read-only progress lines) and Diagnostic detail, which now holds the SYSTEM
  readings. Backup status ("Last backup: N days ago.") sits under EXPORT BACKUP; TODAY's backup
  reminder is gone. **Lucide React is adopted** (owner approval 2026-09-30) for row icons the
  locked glyph family doesn't cover, drawn through `src/ui/icons/LineIcon.tsx` at the glyphs'
  1.7 stroke with square caps. It never replaces a locked glyph. Rows whose icon and name say
  what they are drop their fixed description line; rows whose summary reports live state keep it.
- **As built in Drop 4 (TRAIN).** A logged set is a personal record when earlier history exists for
  that exercise and it is either the heaviest weight yet, or the most reps yet at that weight or
  heavier. The first session with an exercise, skipped sets, zero-rep sets, and substituted movements never count.
  Records are derived from logged sets on the fly (nothing stored, nothing fed to the Engine), and
  BEYOND never mentions a record that wasn't hit. The finish summary adds the session's records and
  total volume (weight × reps). COMPLETE and PARTIAL are press-and-hold (`HoldButton`, 1 s, a quick
  tap shows "Hold to finish."); set logging stays one tap.
- **As built in Drop 5 (BODY).** The open BODYWEIGHT tracker shows a neutral 60-day line and, when
  notable, "Lowest since {date}" / "Lowest yet" (the last earlier weigh-in at or below today's, if
  2+ weeks back; "Highest" when the goal is a gain), a milestone in whole 5-lb steps since the first
  weigh-in, and "at this pace, about {date}" from a least-squares line over the last 28 days (needs
  5+ weigh-ins across 14+ days and a trend heading toward the goal; otherwise nothing, never a
  warning). The collapsed row reports the latest weight plus best-since. **Goal weight is stored**
  (owner approval 2026-09-30) as an optional `goalWeightLbs` on the nutrition-targets row, set in
  MORE → Settings; additive, so older rows and backups stay valid and it rides along in backups.
  Meal Memory's SAME AS YESTERDAY logs the previous meal day's still-active saved meals as ordinary
  MEAL_LOGGED entries, and hides once today already has all of them.
- **As built in Drop 6 (quit tracker).** Lives on **BODY** (owner ruling 2026-09-30) as a
  collapsible row, "QUIT: {NAME}", set up in MORE → Settings (name, optional daily cost, optional
  post-shift plan). **New `quitHabits` table at Dexie v12** (owner approval 2026-09-30): one
  settings row, additive, not seeded — "not set up" is the honest default. Clean days are
  `CLEAN_DAY_LOGGED` events, logged only by hold-to-confirm, at most one per BeyondDay, never
  inferred; the tracker shows clean days this calendar month (by the BeyondDay's start) and in
  total — no streak, no reset, no slip wording, and an unmarked day is simply not counted. Urges
  are one tap per trigger (After shift, Stress, Tired, Social, Bored, Other) as `URGE_LOGGED`, with
  undo via `URGE_UNDONE`. Money saved = daily cost × clean days. The post-shift plan shows as
  "Your plan: …" inside SHIFT DOWN. None of it feeds the Engine, recommendations, or the
  check-in's alcohol-urge field.
- **Urge if-then plans (Drop 4, owner approval 2026-10-03 — "go all").** In MORE → Settings →
  QUIT TRACKER the owner can write one short plan per urge trigger ("If it's “After shift”, then
  I'll…", up to 140 characters each, all optional) — stored on the `quitHabits` row as
  `ifThenPlans` (configuration, like the post-shift plan; no migration — an optional field on the
  existing row, carried by the restore validator). Right after an urge with that trigger is logged,
  the quit tracker shows "Your plan for After shift: …" in the owner's own words, with PLAN USED /
  NOT THIS TIME. The tap is optional, asked once per urge, and recorded as `URGE_PLAN_RESPONDED`
  (urge, trigger, the plan text as it read, used yes/no) — a manual entry in the Burden Meter. No
  plan for a trigger: nothing extra appears. Surfaces only on BODY, never on TODAY; BEYOND never
  writes, suggests, or scores a plan, and nothing feeds the Engine.
- **Launch polish (owner approval 2026-10-01, after a review against the Launch Vision
  prototype).** TODAY's ORIENT reading is a status line: no visible label (the level-2 heading
  stays for screen readers) and no box, with the colored left tick kept only on YELLOW/RED days.
  While Work Context is unanswered, its card drops the schedule paragraph the status line already
  states. Advisory folds into one row when every note is QUIET (SURFACE/INTERRUPT stay open). A
  suggested day end is a neutral row, not a red signal row. The mono face is for small labels
  only (`.eyebrow`, `.tool-label`, `.section-label`, chips); `.meta`, `.meta-strong` and the status
  strips use the body face. MORE's TURN ON and EXPORT BACKUP are secondary buttons.
  `FieldDisclosure` summaries are quiet caret rows, not grey button slabs. TRAIN shows the
  suggested workout first and Planned Work under it, drops the picker card's fixed min-height,
  and puts UNDO on the logged set's own line.
- **As built in Drop 7 (tie together, owner approval 2026-10-01).** A read-only WEEKLY CHECK-IN
  opens from MORE → Evidence. "The week" is the last 7 days (rolling — fits shift work), compared
  with the 7 before: weight average and change plus the projected goal date; workouts finished
  (COMPLETED or PARTIAL) and the PRs they set, judged only against earlier sessions; quit-tracker
  clean days of 7 and money saved; average protein per logged day (protein logs + meals) with the
  target shown as a fact; PRs show the best per exercise, at most 5 lines. Thin sections say
  "Not enough data yet", never a grade. Android
  home-screen shortcuts (manifest `shortcuts`: Water, Weight, Meal, Urge) open `?go=…`, which lands
  on BODY at that control (bodyweight entry or quit tracker opened, the rest scrolled into view)
  and is then cleared from the URL; a shortcut never logs anything by itself and takes
  precedence over resuming an active workout (the workout stays active on TRAIN).
- **Field fixes, Drop 0 (direct owner ruling, 2026-10-03).**
  - **Standing schedule: an owner-approved exception to "prediction never writes
    `workContext`"** (see AI_CANNOT_SILENTLY_CHANGE_PLANS below). A schedule the operator saved
    themselves is their declaration, so when it's clear a new BeyondDay starts from it: WORK or
    OFF, recorded as `WORK_CONTEXT_SET` with source `SCHEDULE_STANDING` (event source `SYSTEM`),
    shown on TODAY as "Working · per schedule" / "Off · per schedule" with a one-tap CHANGE TO
    OFF / CHANGE TO WORKING. **Clear** = the schedule has been saved by the operator at least once
    (its `updatedAt` differs from the seeded default's) and no earlier BeyondDay in the same 16:30
    lived-day window carries a MANUAL work-context change. **Unclear** → the day starts UNKNOWN
    and TODAY asks the existing question once. A lived day (start → next 16:30) is a work day when
    a scheduled shift overlaps it, so the 16:30 day owns that evening's 18:00 shift. Only
    `startDay` writes the standing value, only at day start; any later change is an ordinary
    MANUAL declaration and wins. Pure rule: `engine/scheduledContext.ts`'s
    `deriveStandingWorkContext`. No schema change.
  - **Open screens follow the 16:30 roll.** While the app is open it arms a timer for the next
    boundary (`App.tsx`), and every real rollover notifies subscribed screens
    (`subscribeToDayRollover`, `useDayRolloverRefresh`): TODAY, BODY, the quit tracker and TRAIN
    re-read their data without remounting, so unsaved typing survives.
- **As built in Drop 1 (Day Ledger + Burden Meter, owner brief 2026-10-03).**
  - **Day Ledger.** `engine/dayLedger.ts`'s pure `projectDaySummaries` derives one record per
    BeyondDay from stored history (days, events, workout sessions, sets, the saved schedule):
    lived-day window, declared/scheduled work and when work ended, main sleep and naps, water,
    protein (logs + meals), meal kcal, workouts (status, minutes, sets, PRs), urges with their
    schedule phase, clean day, the latest check-in's capacity, and the latest recommendation with
    the operator's decision. **Missing stays missing:** a value exists only when something was
    logged (never a 0 stand-in). Corrections and deletions resolve exactly as the screens resolve
    them. Read-only, nothing stored, nothing fed to the Engine; covers all history via
    `application/dayLedgerQueries.ts`'s `getDaySummaries`. The pure PR rule moved, unchanged, to
    `engine/personalRecords.ts` so the ledger can use it (re-exported from its old home).
  - **Burden Meter.** Per day: manual entries (body logs, check-ins, answers, routine
    completions, quit entries), corrections (fixes, deletions, undone urges, changing an
    already-set work context), and training sets, counted apart. Weekly shows one neutral line:
    "Entries per day: N · corrections this week: N". **Not built:** time from first open to first
    useful action. No stored event records an app open, so it can't be derived from existing data
    without guessing; it needs a new, owner-approved signal first.
- **As built in Drop 2 (Shift Clock v1, owner brief 2026-10-03).** TODAY shows the rows the
  current part of the shift needs — at most 4 (`MAX_PHASE_ROWS`, enforced by test) — and one TOOLS
  row holding every other TODAY capability (nothing removed). Pure placement policy in
  `ui/screens/today/shiftClock.ts`; the Engine and recommendations are unchanged. Phases reuse the
  `SchedulePhase` names, read from the BeyondDay's own lived-day window and the scheduled shift it
  owns: **PRE_WORK** 16:30 → 18:00 (countdown strip "Shift in 1h 20m", AFTER SHIFT workout preview,
  FUEL); **SCHEDULED_SHIFT** 18:00 → 06:00 ("Shift ends in …", QUICK LOG water/meal/urge, FUEL);
  **EXPECTED_POST_WORK** from 06:00 (or MARK WORK ENDED) until a main sleep is logged after the shift
  (or the 16:30 roll) — SHIFT DOWN with MARK WORK ENDED folded in and the post-shift plan, the
  check-in (which becomes the recommendation once done), the workout, MAIN SLEEP; **OFF** a day off,
  and the rest of a work day once main sleep is logged ("After sleep") — check-in/recommendation and
  workout. A declared work context wins over the schedule; an unanswered day takes no phase from the
  schedule's prediction (it shows the work question, check-in and workout). Attention and its cap
  of 2 are unchanged, except that a phase row showing the same thing isn't also offered as an
  attention item (post-shift MARK WORK ENDED; the check-in where it is a row), and two owner rulings
  (2026-10-03): **(a)** MARK WORK ENDED is offered only once the shift has started — never in
  PRE_WORK; **(b)** the check-in is never prompted in Attention before or during the shift (it
  happens after shift); outside its rows it waits in TOOLS. Kept visible above
  TOOLS while they matter: the per-schedule one-tap change (in the status strip), an
  Engine-recommended SHIFT DOWN/RESET, a check-in form or work-context card opened from Attention,
  and SURFACE/INTERRUPT advisory notes. **Time-Fit** (`engine/timeFit.ts`): the median of the last 5
  COMPLETED sessions of that template + variant, shown as "~48 min" only once 3 exist; display only.
  Fuel shows protein (logs + meals) against its target when one exists, and water as a plain total —
  there is no water target to compare against. The check-in row's ALL GOOD is neutral, so red stays
  on the one next step. Burden Meter baseline: Drop 1 merged 2026-10-03 05:27 UTC (PR #131).
- **As built: sleep draft (owner approval 2026-10-03) — the first Draft.** A Draft
  (`domain/intelligence/types.ts`) is a value BEYOND proposes from evidence it already has, with a
  plain reason and basis; it is never written until the operator confirms it, and the resulting fact
  records how it was decided (`DraftDecision`: CONFIRMED or ADJUSTED). The sleep draft
  (`engine/sleepDraft.ts`) replaces the post-shift MAIN SLEEP row's text — no new row: "Slept up to
  7 hr 15 min?" with the reason "Shift Down 07:05 → opened 14:20", LOG, ±15 min, NOT NOW and ENTER IN
  BODY. It is an **upper bound** — from the latest Shift Down / MARK WORK ENDED to the app being
  opened — rounded down to 5 min, and only when nothing else was done in BEYOND in between, main sleep
  isn't logged yet, and the gap is 3–12 h (12 h matches BODY's plausible main-sleep range). LOG
  writes an ordinary main-sleep `SLEEP_LOGGED` carrying the optional `draft` field (shown in
  History); NOT NOW is remembered on this phone only, for that day. Known gap left for later: sleeping
  past the 16:30 roll ends the post-shift phase, so no draft appears (log it in BODY as before).
- **TODAY behavior from the field soak (Drop 1.6b, owner approval 2026-10-03).**
  - **Sleep draft counts from your last activity.** It used to stay quiet whenever anything was
    logged after Shift Down / MARK WORK ENDED — but the after-shift rows themselves suggest a workout,
    and an urge or a glass of water broke it too. It now runs from the last thing logged after the
    shift ended to the app open ("Last logged 08:15 → opened 14:20"), still an upper bound (the
    operator was awake to log it), still 3–12 h, still never written without a tap.
  - **Minimum Day's Attention offer is one line.** After a YELLOW check-in it used to fill TODAY's
    first screen (long body, red button), pushing SHIFT DOWN, the workout and main sleep below the
    fold. Now: "Minimum Day is available if it helps." with a neutral TURN ON, the explanation behind
    WHY. Placement in Attention is unchanged (the offer still comes from the same capacity rule); only
    its size and button weight changed. Once on, its checklist is as before.
  - **MARK WORK ENDED waits for the shift's last hour.** During the scheduled shift it takes an
    Attention slot only from `WORK_END_LEAD_MINUTES` (60) before the scheduled end; before that it is
    one tap away in TOOLS (WORK CONTEXT shows it open) for a night that ends early. Owner ruling (a) —
    never before the shift — is unchanged; a WORK day the schedule doesn't cover keeps it as before.
  - **No work-day memory on a day off.** A prior day's undecided "Shift down after work" is not shown
    as a continuity advisory on a day declared OFF. The locked FOUNDATION-1B continuity rule
    (`engine/continuity.ts`) still resolves it exactly as before; only whether today shows its note
    changed (`application/advisoryQueries.ts`).
- **As built: the Ribbon (owner weekend order 2026-10-03).** Weekly's new LAST 28 DAYS section,
  above WEIGHT: one column per lived day (16:30 → 16:30, built from the Day Ledger by the pure
  `engine/ribbon.ts`), one row per fact — Shift (worked), Sleep (main sleep, a bar up to 12 h), Lift
  (filled square finished, open square partial, a dot for a PR), Protein (filled at or above today's
  protein target, open below it, said in a line under the strip; all filled when there's no target),
  Urges (up to 3 dots), Clean (clean day). Facts only: no score, no colour judgement — every mark is
  neutral ink and rows are told apart by their labels, never colour. A row with nothing in all 28
  days is left out; a day with no record is an empty column, said as "nothing logged". Each column is
  a real button whose name is that day in words ("Thu, Oct 1 · worked · slept 7 hr 15 min · lift B,
  1 PR · protein 182 g · 2 urges · clean day"); tapping one shows the same sentence underneath.
  Where one lived day holds two BeyondDays (ended early, started again) their records are combined.
  Read-only; nothing stored, nothing fed to the Engine; no new tab and nothing on TODAY.
- **As built: read-only findings (owner decision 2026-10-03: "read-only findings over workout
  data are approved, including stall detection and the exercise story as findings").** Weekly's
  FINDINGS section, under LAST 28 DAYS. A fixed catalogue of five templates in the pure
  `engine/findings.ts`, over the Day Ledger and logged sets (undone sets removed):
  **sleep before workouts** (finished workouts split by the main sleep logged in the 24 h before
  each: under 6 h vs 6 h or more — how many were COMPLETED, and PRs); **before vs. after the shift**
  (work days only; "after" starts at the scheduled shift end, or at MARK WORK ENDED when that came
  earlier; mid-shift starts aren't counted); **when urges came** (urges by schedule phase); a
  **stall** (an exercise's last 4 sessions set no new record — heaviest or reps, the PR rule
  already in use); an **exercise story** (first top set → latest, at least 4 sessions over at least
  14 days). Comparisons and urge timing look back 45 days; stall and story cover only exercises done
  in the last 28 days, at most 2 each, with one lift's story and stall under one heading.
  **Counts only:** each finding shows its real numbers and its window, never a cause or a habit
  ("usually", "tends to", "because" are excluded by test). **Abstain floor:** a comparison needs 6
  workouts on each side and urge timing 6 urges; below that it's listed in one quiet line ("Not
  enough data yet: sleep before workouts (2 of 6 each way), …") and never shown as a finding.
  Recomputed on every read; nothing stored, nothing fed to the Engine, nothing to accept or act on.
  Adopting a finding as a rule, deload/stall *suggestions*, and any Engine use wait for separate
  sign-off. The Day Ledger's sleep gains `primaryLogs` (each main-sleep log's time and minutes) so a
  sleep can be placed before a workout by time.
- **As built: check-in draft (Drop 5, owner approval 2026-10-03 — "Never auto-confirm. Record
  whether each draft was confirmed unchanged or adjusted.").** The check-in form (MANUAL CHECK-IN,
  or UPDATE) opens pre-set to the operator's own latest check-in, when it's no more than 36 hours
  old (`engine/checkInDraft.ts`): "Draft: your check-in Wed 07:00. Change anything that's different
  now.", plus "Since then: main sleep 7 hr · lift B (partial) · 1 urge" — the facts logged after it.
  **No value is guessed from other data** (no "short sleep → lower energy" rule): the check-in
  feeds the Engine's locked capacity read, and any evidence-to-value rule waits for separate
  sign-off. Taps win over the draft; the button reads CONFIRM CHECK-IN while nothing has changed,
  SUBMIT CHECK-IN once anything has. START BLANK escapes to the old empty form. Nothing is written
  until the tap; the check-in records `draft: CONFIRMED | ADJUSTED` (absent for ALL GOOD and a blank
  start), shown in History. ALL GOOD is unchanged. Older than 36 hours: no draft, the empty form as
  before (doctrine: prefill only when evidence is stable).
- **As built: position and reveal (FIELD-NAV-001, PR #149, plus follow-up, owner approval
  2026-10-04).** Every tab switch, from the bottom nav or from a button inside a screen (OPEN
  RECOVERY ON TRAIN, RESUME WORKOUT, VIEW, a BODY row, MORE's capture link), opens the destination
  at its top; re-tapping the current tab does the same. Navigation position is not operation
  state: an active workout still resumes at its exact next set. A newly opened disclosure or
  UPDATE CHECK-IN is brought into view by the smallest scroll that shows all of it above the
  bottom nav (measured live, so the iPhone safe area counts), or its top at the top when it's
  taller than the screen; content already fully in view doesn't move. UPDATE CHECK-IN also moves
  focus to the form so screen readers announce it. Reduced motion jumps instead of gliding. Pure
  helpers in `ui/navigationPosition.ts`; shared hook `ui/hooks/useRevealOnOpen.ts`.
- **As built: UNDO after every log (UNDO-001, owner approval 2026-10-04, option A).** Water,
  sleep, bodyweight and protein-only logs get the same UNDO meals already had. BODY's banner reads
  UNDO for its first 5 seconds (`UNDO_WINDOW_MS`), then CORRECT as before; TODAY's water, sleep
  draft and Minimum Day protein banners read UNDO, then CORRECT IN BODY. UNDO appends a void event
  naming the root log: `WATER_LOG_VOIDED`, `SLEEP_LOG_VOIDED` and `BODYWEIGHT_LOG_VOIDED` (one
  `BodyLogVoidedPayload` shape), and protein's existing `PROTEIN_LOG_VOIDED`. Nothing is erased;
  History says "Water log undone." and so on. An undone entry leaves every list and total — BODY,
  TODAY, the Day Ledger and Burden Meter (where an undo counts as a correction), the weight trend
  and protein target's latest weight, and the end-the-day suggestion after main sleep — and can't
  be corrected afterwards. Undoing twice is a no-op. No schema change; backups carry the new events
  like any other.

- **As built: duplicate-meal prompt (DUP-MEAL-001, owner brief 2026-10-04, PR #155).** Field case:
  dinner logged twice doubled the day's protein and kcal. Right after a meal is logged on BODY, an
  earlier standing meal the same BeyondDay counts as a possible duplicate when it was logged at
  most 2 minutes before (`SAME_FOOD_WINDOW_MS`) and is the same saved meal, or has the same name
  (trimmed, case-insensitive) with the same effective calories and protein. BODY asks under that
  meal's row: "Same meal? Dinner already logged at 02:14." — KEEP BOTH (writes nothing) / REMOVE
  THIS ONE (voids only the new entry via `MEAL_LOG_VOIDED`; "Removed the second Dinner. Protein
  today: 50 g."). Never a silent merge. When the protein-vs-meal "Same food?" check would also
  fire, only "Same meal?" shows. Pure rule `findDuplicateMeal` in `engine/sameFood.ts`. SAME AS
  YESTERDAY batches aren't checked. No schema or new event type.
- **As built: SAME AS YESTERDAY duplicates (DUP-MEAL-002, owner approval 2026-10-04).** The
  duplicate-meal prompt now also covers SAME AS YESTERDAY: after the batch logs, each new meal that
  repeats a standing meal logged within the 2 minutes before the tap (same rule as DUP-MEAL-001) is
  named in one question under the button — one: "Same meal? Dinner already logged at 20:00." with
  KEEP BOTH / REMOVE THIS ONE; several: "Same meals? Dinner (20:00) and Shake (20:01) were already
  logged." with KEEP ALL / REMOVE THE REPEATS. Meals inside the batch never match each other, so a
  day with two shakes repeats as two shakes. Removing voids only the repeated new entries and
  clears the batch's UNDO banner. Pure rule `findBatchDuplicateMeals` in `engine/sameFood.ts`.
- **Soak-run fixes (2026-10-04, owner-approved soak run "A").** A scripted night-shift → day-off
  walk through the production build at phone width found: (1) a completed SHIFT DOWN kept showing
  its start form after the shift (row now steps back into TOOLS once a SHIFT DOWN completed after
  the shift began; from history, so a reload knows too); (2) at 15:00 after a night shift the
  header said "before your shift" (the wall-clock schedule's NEXT shift) while the rows said AFTER
  SHIFT — on a work day the header now follows the lived day's Shift Clock phase ("after your
  shift" / "after sleep"); (3) "Capacity is UNKNOWN — no check-in yet today." is now "No check-in
  yet today."; GREEN's reason reads "nothing in your check-in needs care"; (4) the all-clear
  acknowledge button "No action needed" (under the "No action required" title) is now GOT IT;
  (5) PROTECT said water "hasn't been logged" once some was logged under the Minimum Day amount —
  now "today's water … is still short of the Minimum Day amount"; (6) the End Day card's
  "BEYONDDAY" label is END DAY; (7) SHIFT DOWN / RESET start times drop the seconds; (8) the WORK
  SCHEDULE screen said a schedule "never counts … until you confirm it" — since DROP 0 a saved
  schedule starts each day ("per schedule"), so the screen and its preview say that. TODAY's
  unconfirmed-day card keeps "a prediction, not a fact, until you confirm" (still true there).
- **HUD design system approved (owner ruling 2026-10-04, decision 1A).** HUD-001 may bring back
  cut corners and bracket ticks (removed 2026-09-30) as functional frame geometry, with one red
  (#D0141B) and AA contrast; the doctrine's "decorative HUD geometry" line carries the amendment.
  Weekly keeps its look until the F1 review.
- **As built: HUD design system (HUD-001, PR #160, merged 2026-10-04 on the owner's "merge as
  is").** Black #000 ground; every red role resolves to #D0141B; 8px cut corners on cards and
  buttons with the 1px diagonal drawn back in; bracket ticks on `.equipment-row` frames; square
  corners; Chakra Petch + JetBrains Mono self-hosted and precached. #D0141B is ~3.8:1 on black,
  so small red text became white with a red stroke (e.g. an error line reads white beside a red
  left edge). Weekly keeps the pre-HUD look via `.hud-legacy`.
- **Automatic backup is due-on-open + share (owner ruling 2026-10-04, decision 2A).** No Google
  account or OAuth: when a backup is due, BEYOND reminds on open and one tap shares the file to
  Drive/Files; a monthly restore check previews the latest file without writing.
- **Plain words on screen (owner ruling 2026-10-04).** Text the operator reads says "today" / "the
  day", never "BeyondDay", and never "deterministic" or "STATE INPUT": the check-in row's label is
  CHECK-IN and the form's title "Check-in"; the End Day card says "Main sleep logged — today looks
  done. End the day whenever you're ready."; Minimum Day reads "Today · 2 / 6" and "40 oz recorded
  today."; the no-check-in card says "No check-in yet today. Suggestions still work without one; a
  check-in just helps them fit." The "How BEYOND decided" machinery panel stays technical by
  design. `tests/ui/plainWords.test.ts` guards TODAY, BODY, TRAIN, Weekly and History. Red on the
  attention card's ALL GOOD stays: the owner likes some red (same ruling).
- **As built: personal baselines in Weekly (FOUNDATION-A-F1, owner approval 2026-10-04, with
  addendum and the water fix).** A YOUR USUAL section compares the last 7 finished lived days
  (16:30 → 16:30, never the one in progress) with Gavin's own usual range over the 56 lived days
  before them — no overlap, so a week is never compared with itself. Measures: main sleep (naps
  excluded), water, protein; per day kind from the **declared** work context (what was said, or
  what stood per the saved schedule), never re-derived from today's schedule; UNKNOWN days count
  for neither kind. A day counts only when really logged: main sleep with any main-sleep log;
  water with 2+ entries or one entry of 40 oz or more (the Minimum Day water amount — "one big
  bottle" counts, a lone 8 oz quick-add doesn't); protein with 2+ food entries. Kcal, check-in
  capacity, workouts and urges are left out (categories and small counts don't get a median).
  Usual range = the middle half (P25–P75, linear interpolation), at least 30 min / 8 oz / 10 g wide,
  rounded outward; the week's value is the median of its qualifying days; the verdict (below /
  inside / above your usual) is judged on the rounded numbers shown. Under 10 comparable days it
  says "Still learning your usual … (N of 10)"; with fewer than 2 days this week, "Nothing to
  compare this week". At most 6 comparison lines and 1 quiet line, neutral words, no color.
  Derived on read, never stored, never fed to the Engine; nothing on TODAY. The shared primitive is
  `engine/livedDaySeries.ts`; the Ribbon now uses its lived-day grouping. Field-test stop: about 3
  work rotations before any F2/F3/F4 work.
## FOUNDATION-1A — Product-language pillars & behavioral guarantees

Locked 2026-09-16, direct owner authorization (FOUNDATION-1A, a doctrine/architecture
reconciliation Drop — see `docs/agent/drops/FOUNDATION-1A.md` for the full reconciliation
matrix and evidence trail). These are official product-language names for guarantees
`OPERATOR_INTERFACE_DOCTRINE.md` and this register already establish, reconciled against
repository truth rather than pasted in as new authority, plus one newly authorized guarantee
(ENJOYMENT_COUNTS). A pillar name here never renames or supersedes the lower-level
architectural/doctrine term it reconciles to (e.g. STABILIZE → RECOVER → EXECUTE, INFORM →
INTERPRET → RECOMMEND → USER DECIDES) — both names refer to the same guarantee; use whichever
is clearer in context.

### Pillars

- **Quiet Intelligence** — BEYOND recedes by default and escalates attention only when evidence
  earns it. Reconciles to doctrine's KNOW → ANTICIPATE → SURFACE → CONFIRM/CORRECT → LEARN →
  RECEDE loop and its four-question escalation test
  (`OPERATOR_INTERFACE_DOCTRINE.md` "Depth, attention, and control").
- **Attention Supremacy** — the operator's attention is the scarcest resource in the system;
  recommendation surfacing spends as little of it as truthfully possible. Reconciles to
  doctrine's Attention states (AVAILABLE/SUGGESTED/ATTENTION/CRITICAL) and "Availability is not
  urgency."
- **Quick Log** — the fastest path to record something true is always available and never
  requires organizing it first. Reconciles to Capture (`captureItem` in
  [commands.ts](../src/application/commands.ts) — "capture first, organize second, act only
  when clarified") and BODY's quick-add water control.
- **Automatic Time State** — BEYOND infers day/time state from real activity rather than asking
  the operator to declare it. Reconciles to lazy day creation (`ensureActiveDay()`, see "Day
  model" below), the PRIMARY/SUPPLEMENTAL sleep model and overnight-shift handling, and
  `scheduledContext.ts`'s non-authoritative work-phase suggestion.
- **Human Control** — user authority is absolute; BEYOND recommends, the operator decides.
  Reconciles to doctrine's "user authority is absolute" and gets its concrete, testable shape
  from the USER_DECIDES / MANUAL_INPUT_ALWAYS_AVAILABLE / AI_CANNOT_SILENTLY_CHANGE_PLANS
  guarantees below.
- **No Gamification** — no shame copy, punitive streaks, failure theater, withheld capability,
  nagging, or engagement pressure. Reconciles to doctrine's "No guilt mechanics" and "Measure
  operator burden—not engagement" (`OPERATOR_INTERFACE_DOCTRINE.md` "Operator Model and
  reality" / "Evidence, experiments, and field learning").
- **Progressive Disclosure** — capability depth coexists with surface calm; deeper detail is
  opt-in, never forced. Reconciles to doctrine's four depth levels (Surface/Operate/Inspect/
  System), the `FieldDisclosure` component
  ([FieldDisclosure.tsx](../src/ui/components/FieldDisclosure.tsx)), and the Exposed Machinery
  reveal pattern (see "Visual system — red budget" below).
- **Continuity** — an interrupted operation resumes at the point of interruption, never
  silently restarted or abandoned. Reconciles to doctrine's "Interruption preserves state and
  intent," CONTINUITY-001 (workout/day/navigation continuity), and RESET/SHIFT DOWN's own
  documented resumability (see "RESET / SHIFT DOWN" below).

### Behavioral guarantees

- **USER_DECIDES** — every Recommendation is a proposal, never an executed action; only an
  explicit operator action commits a plan. Already the literal decision model: INFORM →
  INTERPRET → RECOMMEND → USER DECIDES.
- **NO_CATCH_UP** — BEYOND never demands retroactive completion of missed days/logs as a
  precondition for using it today. Reconciles to lazy day creation (no day exists until an
  action needs one), doctrine's "not a dashboard, backlog, or demand for interaction," and the
  check-in reminder's hard at-most-once-per-day cap (no accumulating reminders).
- **REDUCE_BEFORE_SKIP** — when capacity is constrained, BEYOND's first move is to offer a
  reduced version of the plan, not to drop it. Reconciles to `trainSuggestion.ts`'s
  capacity-driven session variant (RED → RESET, YELLOW → REDUCED, GREEN → STANDARD) and
  doctrine's "shorter reality path: preserve essential capability, reduce decisions and steps."
- **ONE_PRIMARY_RECOMMENDATION** — the Engine surfaces exactly one primary Recommendation at a
  time, never a competing list. Already literal: `evaluate.ts`'s single-recommendation
  arbitration and doctrine's "the deterministic Engine owns one primary Recommendation."
- **MANUAL_INPUT_ALWAYS_AVAILABLE** — every assisted/prefilled input path has a manual fallback
  that is never blocked or degraded by the assist failing or being unavailable. Already literal:
  doctrine's "manual operation remains available," concretely BODY's USDA lookup (a failed or
  absent lookup falls back to manual entry, never blocks logging).
- **AI_CANNOT_SILENTLY_CHANGE_PLANS** — a prediction or inference never becomes committed state
  without an explicit operator action. Reconciles to doctrine's learned-shortcuts guarantee
  ("never silently execute consequential actions") and the concrete `scheduledContext.ts`
  boundary: prediction never writes `workContext`; only the explicit `setWorkContext` command
  can. **One owner-approved exception (2026-10-03, Drop 0):** a clear, operator-saved schedule
  sets a new day's starting value (`SCHEDULE_STANDING`) — see "Field fixes, Drop 0" above.
- **ENJOYMENT_COUNTS** (new canon) — subjective enjoyment/satisfaction is a legitimate signal to
  record and surface back to the operator, not a lesser one than raw adherence; a
  completed-but-disliked session and a skipped-but-enjoyed one are both honestly representable.
  Scope boundary: this does not reopen or change "Recommendation Engine — outcome ratings stay
  observational" below — enjoyment stays observational data, same as any other Outcome rating,
  unless a future Drop is separately authorized to change that.
- **BEYOND_MAY_DO_LESS** — a successful outcome can be BEYOND doing nothing. Already literal:
  doctrine's "**NO ACTION REQUIRED** is a successful FIELD state."
- **NO_FAKE_PRECISION** — BEYOND never presents a fabricated, guessed, or default-substituted
  number as if it were real. Already this repo's existing "no fabrication" doctrine in practice
  — e.g. `getEffectiveProteinTargetG()` returning `undefined` rather than a guessed number (see
  "NUTRITION TARGETS" below) — and doctrine's "must not fabricate missing facts."

A future implementation Drop that touches behavior one of these guarantees describes should
cite the guarantee name above alongside its underlying mechanism — the name is a pointer to the
mechanism, not an independent authority of its own.

## FOUNDATION-1B — Operational Continuity

Locked 2026-09-20, direct owner authorization (FOUNDATION-1B — see `docs/agent/drops/
FOUNDATION-1B.md` for the full contract). Formalizes three concepts FOUNDATION-1B's product
objective ("what matters right now?") requires and the existing architecture already implied but
had not yet named or completed: a bounded Attention Authority, a Continuity Engine, and a
resolved arbitration-priority question. Terminology note: this Drop's "Continuity Engine"
(historical DROP/DEFER/REINTRODUCE relevance resolution, `engine/continuity.ts`) is distinct from
the existing "Continuity" pillar above (interruption/resume, `OPERATOR_INTERFACE_DOCTRINE.md`'s
"Interruption preserves state and intent") and from CONTINUITY-001 (workout/day/navigation
continuity) — three different concepts that happen to share the English word "continuity," not
one renamed concept. Keep them distinct when citing this section.

- **PROTECT vs EXECUTE — resolved as Advisory-only PROTECT.** FOUNDATION-1B's arbitration
  hierarchy (`STABILIZE → PROTECT → RECOVER → EXECUTE → OPTIONAL`) and its Scenario B ("PROTECT
  outranks EXECUTE") were found, during investigation, to conflict with the locked
  INTENT-ARBITRATION-001 entry above, which ranks `OBLIGATION_DUE` — the closest existing
  analogue — below `EXECUTE_PLANNED_WORK` and records that the owner "explicitly rejected"
  ranking it higher. Presented to the owner directly rather than silently resolved either way
  (matching this register's own stated rule and INTENT-002's precedent for reopening a locked
  ranking). **Resolved: `evaluate.ts`'s kind set, ranking, and trace shape are unchanged —
  INTENT-ARBITRATION-001 stands exactly as locked.** A shift-protection concern instead composes
  into an INTERRUPT-tier `AdvisoryNote` (`engine/shiftProtection.ts`'s `evaluateShiftProtection`,
  composed by `engine/advisory.ts`'s `composeAdvisoryNoteFromShiftProtection`) that accompanies
  whatever `evaluate.ts` selected as primary — it never becomes a competing Engine kind. Gated on
  `scheduledContext.ts`'s existing `PRE_WORK` phase, a real scheduled work day, capacity not
  already RED/YELLOW (the operator's own physical state still wins first), and an unmet Minimum
  Day hydrate/protein floor (reusing MINIMUM DAY's already-locked 40oz/25g thresholds — see
  "Recommendation Engine" and Minimum Day's own six-item baseline — rather than inventing a new,
  unconfigured "shift protection" number).
- **TIME.** FOUNDATION-1B's illustrative TIME-state list (wake period/pre-shift/on-shift/
  post-shift/wind-down/sleep window/off-day) is satisfied for this Drop by reusing
  `scheduledContext.ts`'s existing, tested `SchedulePhase` (`PRE_WORK`/`SCHEDULED_SHIFT`/
  `EXPECTED_POST_WORK`/`OFF`) exactly as-is — "Automatic Time State" above already names this the
  canonical mechanism, and the brief itself asks to "use existing repo concepts where available
  rather than creating unnecessary duplicate representations." **Deliberately not built this
  Drop:** a finer wake/wind-down/sleep-window state distinct from the work schedule. No
  acceptance scenario requires it, and no real-time wake/sleep-detection signal exists to ground
  it honestly — BEYOND only ever learns about sleep after the fact, via a logged `SLEEP_LOGGED`
  duration, never a live clock-based wake/bedtime event. Building it would mean fabricating an
  unconfigured threshold (e.g. "wind-down starts at 9pm"), which NO_FAKE_PRECISION and this
  Drop's own "do not create speculative abstractions" instruction both rule out. Revisit only if
  a future Drop introduces a real evidence source for it.
- **Continuity Engine (DROP/DEFER/REINTRODUCE).** New, `engine/continuity.ts`'s
  `resolveContinuity`: a prior day's unresolved (never accepted/declined/acknowledged)
  Recommendation resolves against **today's** current state, never yesterday's — enforcing
  NO_CATCH_UP mechanically, not just by convention. `NO_ACTION_REQUIRED` and any explicitly
  DECLINED/ACCEPTED/NO_ACTION_RECORDED prior recommendation always resolve DROP (nothing was
  pending, or the operator already decided). An undecided prior recommendation resolves DEFER
  when today's capacity is RED/YELLOW or an unresolved post-shift fact exists (something with
  real, current authority already wins), otherwise REINTRODUCE. **REINTRODUCE is advisory-only
  for this Drop** — composed into a SURFACE-tier `AdvisoryNote`
  (`composeAdvisoryNoteFromContinuity`) via `application/continuityQueries.ts`'s
  `resolvePriorDayContinuity`, never fed back into `evaluate.ts` and never written as a new
  obligation-shaped fact. DROP/DEFER are deliberately silent (no note) — BEYOND does not narrate
  every piece of history it chose not to carry forward.
- **Attention Authority (QUIET/SURFACE/INTERRUPT).** New,
  `domain/intelligence/types.ts`'s `AttentionLevel` — a narrower, code-level formalization of
  `OPERATOR_INTERFACE_DOCTRINE.md`'s four-state AVAILABLE/SUGGESTED/ATTENTION/CRITICAL prose,
  scoped to exactly one thing: how insistently an already-informational `AdvisoryNote` presents
  itself. Every pre-FOUNDATION-1B producer (obligation relevance, TRAIN progression, Decision
  Journal lessons) is QUIET. REINTRODUCE continuity notes and the pattern-proposal note (below)
  are SURFACE. The shift-protection note above is the one and only INTERRUPT-tier producer —
  "rare, reserved for meaningful conflicts or protection of important obligations" is enforced by
  `evaluateShiftProtection`'s own narrow gate, not by convention alone. Distinct from
  TodayScreen's own pre-existing "ATTENTION" budget (the 2-slot Commitments/Capture/
  pending-outcome surfacing mechanism), which is unchanged by this addition. An `AdvisoryNote` at
  any attention level remains only ever an `AdvisoryNote` — no priority, never accepted/declined/
  executed, never an Engine input; see `.claude/rules/engine.md`.
- **Recommendation lifecycle — materially-new-evidence gate and read-time disposition.** New,
  `engine/continuity.ts`'s `isMateriallyNewEvidence` compares two `Recommendation.trace`s (kind
  plus every input/derived key-value pair) structurally; `application/continuityQueries.ts`'s
  `wasRecommendationMateriallyRepeated` uses it to detect when the current recommendation is
  indistinguishable from an immediately-prior DECLINED one on the same day (Scenario E). This is
  presentation-only: `submitCheckIn` still issues a real, honest `Recommendation`/
  `RECOMMENDATION_ISSUED` fact every time (nothing about check-in evidence recording changes) —
  only the "same as before" framing (`RecommendationCard`'s one line of copy) differs. Separately,
  `deriveRecommendationDisposition` derives a read-time-only PENDING/COMPLETED/DISMISSED/
  SUPERSEDED/EXPIRED label for REVIEW's ledger (`getRecommendationDisposition`) from the exact
  same decision-reconstruction path REVIEW already used — no new stored field, no new event type.
- **Outcome feedback (BETTER/SAME/WORSE/SKIP).** Reconciled to the existing `Outcome.rating`
  mechanism (GOOD/NEUTRAL/BAD, "Recommendation Engine — outcome ratings stay observational"
  below) rather than a second, parallel rating vocabulary — TODAY's existing GOOD/NEUTRAL/BAD/
  DISMISS control (`TodayScreen.tsx`'s OUTCOME row) already is the lightweight, optional,
  non-mandatory feedback FOUNDATION-1B describes; "SKIP" already means "leave it unrated" (the
  existing DISMISS path). No code change; this is the same ALREADY_CANONICAL treatment
  FOUNDATION-1A gave several of its own pillars. The locked non-biasing rule below is unchanged
  and unreopened by this entry.
- **Pattern proposal (Scenario F).** New, `engine/patternProposal.ts`'s
  `detectRepeatedRatingPattern`: the most recent three rated Outcomes sharing both the same
  Recommendation kind and the same non-NEUTRAL rating compose into one SURFACE-tier
  `AdvisoryNote` naming the real count and rating in its own copy (never "usually"/"tends to" —
  NO_FAKE_PRECISION). Recomputed fresh on every read; nothing is itself stored, and nothing it
  returns can be accepted/declined/executed or silently changes any plan/threshold/doctrine —
  PATTERN → PROPOSAL → USER DECIDES stays literal. This is the one, deliberately narrow exception
  the FOUNDATION-1B brief itself authorizes to the "Explicitly out of scope: any AI/learning
  layer over workout data" entry further below — not a general reopening of that exclusion.

## PLANNED-WORK-001 — Explicit Planned Work

Locked 2026-09-20, direct owner ruling (following the `hasPlannedWork: false` hardcoding
FOUNDATION-1B discovered and explicitly deferred — see `docs/agent/drops/PLANNED-WORK-001.md`).
Two options were presented (rotation-implied vs. explicit operator intent); the owner chose
**explicit operator intent**, with GREEN capacity never itself implying planned work and
USER_DECIDES remaining authoritative.

- **`hasPlannedWork` is now genuinely wired** — `application/commands.ts`'s `submitCheckIn`
  passes `application/queries.ts`'s `hasActivePlannedWork(beyondDayId)` instead of a hardcoded
  `false`. `EXECUTE_PLANNED_WORK` is reachable through the real app for the first time.
  `evaluate.ts` itself is unchanged: same kind set, same ranking, same purity.
- **The one true source is `PLANNED_WORK_SET`** (`domain/common/types.ts`), written only by
  `application/commands.ts`'s `setPlannedWork(beyondDayId, planned, kind)` — an explicit,
  operator-initiated declaration, never inferred from capacity, schedule, or TRAIN's rotation
  state (`suggestTemplateForNextWorkout` always has a "next" template, so "a workout exists in
  rotation" is trivially true every day and was explicitly rejected as a signal).
- **A declaration resolves itself.** `hasActivePlannedWork` returns false again once a
  `WORKOUT_COMPLETED`/`WORKOUT_ABANDONED` event (any session type) happens after the
  declaration — a fulfilled or deliberately-stopped session both legitimately resolve it,
  matching REDUCE_BEFORE_SKIP/BEYOND_MAY_DO_LESS. Re-declaring afterward is a legitimate new
  fact, not a duplicate.
- **`kind: "WORKOUT"` is a real union, not a bare boolean**, specifically so a later Drop can
  add a second planned-activity source without changing this event's shape or
  `hasActivePlannedWork`'s already-generic read logic (it checks "any active declaration," not
  a TRAIN-specific one). No second `kind` value exists yet — this Drop's own exclusions rule
  that out for now.
- **TODAY's `PlannedWorkCard`** offers an explicit TRAIN TODAY / NOT TODAY toggle (same chip
  pattern as `WorkContextCard`'s YES/NO), with a real tri-state read
  (`getPlannedWorkDeclaration`) so "never answered" never reads as a silent "no" —
  NO_FAKE_PRECISION. Labels are deliberately distinct from `WorkContextCard`'s "YES"/"NO" (both
  cards can render together; identical labels for two different yes/no questions would be
  genuinely ambiguous, not just a test-collision concern).

## Day model

- **Lazy day creation.** No day exists until the first action of the day
  needs one; `ensureActiveDay()` creates it on demand rather than
  requiring an explicit "start my day" ritual. [queries.ts](../src/application/queries.ts)
- **One ACTIVE `BeyondDay` at a time**, enforced by `ensureActiveDay()`'s
  in-flight-promise guard (Product Experience Sprint, Phase 0) — see
  README "Known limitations" for the one narrower case (true
  cross-tab concurrency) this doesn't cover.
- **Sleep/Day-Ownership Model** (locked): sleep logs carry a `kind` field,
  `PRIMARY` or `SUPPLEMENTAL`. Only a `PRIMARY` sleep log can trigger the
  "did your day end?" suggestion (`shouldSuggestEndDay`); naps and other
  supplemental sleep never do. This is what lets someone log a nap at
  3pm without BEYOND thinking their day just ended.
- **Overnight shifts** are handled by this same PRIMARY/SUPPLEMENTAL
  split — a shift worker's "night's sleep" after an overnight shift is
  still PRIMARY regardless of calendar clock time, so END DAY suggestion
  logic tracks lived days, not calendar days.
- **DAY-ROLLOVER-001 (2026-09-21): automatic 16:30 boundary — a recorded
  override, not a reversal, of the "no automatic clock boundary"
  reasoning above.** Direct owner mission this session ("MISSION: DAY
  ROLLOVER AT 16:30"): the BeyondDay boundary is now also 16:30 local
  time, automatic — at 16:30, the current day auto-closes through the
  same `endDay()` path as an explicit END DAY (reason
  `AUTO_CLOSED_DAY_ROLLOVER`), and a fresh day starts (water/protein
  reset; bodyweight already carries forward via
  `getMostRecentBodyweight()`'s existing global scope). This is a
  genuine conflict with the "Calendar midnight is explicitly rejected as
  a boundary" reasoning immediately above — 16:30 is the same category
  of thing (an automatic fixed-clock trigger), not merely a different
  hour. The conflict was surfaced to the owner directly before any
  implementation; the owner's ruling was to override it for this
  specific case and record the override here, not to reopen calendar
  midnight or any other automatic boundary generally. `PRIMARY`/
  `SUPPLEMENTAL` sleep-kind rules are unchanged; the "lived days, not
  calendar days" concern this override reintroduces (a PRIMARY sleep
  landing on a rollover-created day instead of the day it was meant to
  close) is never silently resolved — it is flagged via a SURFACE-tier
  `AdvisoryNote` (`dayRolloverAmbiguity`,
  `engine/dayRollover.ts`/`engine/advisory.ts`) and left to the operator.
  An in-progress workout is never interrupted — rollover happens once it
  ends. See `docs/agent/drops/DAY-ROLLOVER-001.md` for the full
  contract.

## RED / capacity override

- Declining a RED-tier recommendation requires an explicit confirmation
  step: the first decline attempt returns `RED_OVERRIDE_NOT_CONFIRMED`;
  only a second attempt with `{ overrideConfirmed: true }` succeeds. This
  is a deliberate extra-friction gate on overriding the most constrained
  state, not a bug. [redOverride.ts](../src/engine/redOverride.ts)
- YELLOW-tier declines require no such confirmation.

## RESET / SHIFT DOWN

- Both are guided, multi-step experiences (not a single button/toggle) —
  see [resetShiftDownCopy.ts](../src/ui/screens/today/resetShiftDownCopy.ts).
  An interrupted RESET or SHIFT DOWN is expected to be resumable, not
  something the user has to restart from scratch.

## TRAIN

- **Progression advice is advisory only.** The engine (`evaluateProgression`
  in [progression.ts](../src/engine/progression.ts)) always produces a
  suggestion (INCREASE / HOLD / REDUCE) with a plain-language reason —
  it never auto-applies a weight change. The lifter always chooses.
- **Re-entry — an amendment to the locked progression rule (direct owner approval,
  2026-10-03).** When an exercise was last actually performed 14 or more days ago — in any
  template or variant (a layoff is about the lift, not the slot), not counting skipped or undone
  sets or a session still in progress — an INCREASE or HOLD becomes `RE_ENTRY`: about 90% of the
  last load (the clean last weight, or the heaviest set done when last time was mixed or
  incomplete), rounded **down** to the exercise's own increment so it's a weight the equipment
  has. 270 lb on a 10-lb stack → 240 lb. REDUCE stays as it is (already lighter); NO_HISTORY has
  nothing to ease back into; with no lighter step available the ordinary advice stands. The WHY is
  visible ("20 days since you last did this — suggests easing back in at 240lb (about 90% of
  270lb)."), and like all progression advice it is never applied and never pre-fills an input —
  the set inputs still pre-fill from the last performed set, unchanged. Pure rule in
  `engine/progression.ts` (`RE_ENTRY_DAYS`, `RE_ENTRY_FRACTION`); the day count comes from
  `application/trainQueries.ts`'s `getDaysSinceExerciseLastPerformed`.
- HOLD has three distinct sub-paths in the engine (clean hold, incomplete
  evidence, mixed weights in recent history) and only the clean-hold path
  sets a numeric `lastWeight`. UI copy must fall back to the engine's own
  `reason` text for the other two — see `describeProgressionAdvisory` in
  [trainCopy.ts](../src/ui/screens/train/trainCopy.ts) and the bug this
  fixed (rendered "undefined" until caught in live browser testing,
  2026-08-20).
- Every exercise card shows last weight/reps prominently and never shows
  a bare "0" as a placeholder for "no data yet" — no-history is its own
  explicit copy state.
- **Locked A/B/C rotation advancement**, enforced by
  `doesSessionAdvanceRotation`: STANDARD sessions advance the rotation
  only on COMPLETED; REDUCED sessions advance on COMPLETED or PARTIAL;
  RECOVERY sessions never advance the rotation, regardless of outcome.
- Stopping a workout mid-session uses neutral wording (not "quit" /
  "fail") and a PARTIAL completion explicitly explains its rotation
  impact inline, since that's the one place a lifter's choice changes
  what happens next time they open TRAIN.
- Exercise substitution is a fast, low-friction quick-pick sourced from
  the lifter's own most recent substitutions for that exercise
  (`getRecentSubstitutions`), not a full exercise-database search.
- If no check-in exists yet for the day, TRAIN surfaces a one-tap prompt
  to do one rather than blocking or silently proceeding without one.
- A workout session in progress must survive a page reload — resuming
  is a confirmed, tested behavior, not a "best effort."
- **Pre-workout override picker sits behind CHANGE (locked 2026-09-30,
  direct owner ruling, DECLUTTER-001).** The suggested workout card shows
  the current choice as one line ("Template A · STANDARD") with a CHANGE
  button; the template and variant chips appear only after that tap. This
  keeps START WORKOUT on the first phone screen. Override stays one tap
  away and the chosen template/variant is always visible, so the
  suggests/decides/override pattern is unchanged. The TODAY → RECOVERY
  handoff opens the picker automatically so it can focus the RECOVERY
  choice.
- **One set at a time during a workout (locked 2026-09-30, direct owner
  ruling, DECLUTTER-001 / ROADMAP Drop 1).** Only the current set (the
  first one not yet logged or skipped) shows weight/reps inputs and LOG /
  SKIP. Finished sets stay as one-line summaries; later sets are counted
  in one "N more sets" line. Logging, undo, rest timing and rotation rules
  are unchanged.
- **TODAY stays short (locked 2026-09-30, direct owner ruling,
  DECLUTTER-001 / ROADMAP Drop 1).** A finished check-in is one line
  ("Checked in 7:08 AM · all good") with UPDATE to reopen ALL GOOD and the
  manual form. The quiet "No action required" state shows no rationale
  line, keeps its "Just records that you saw this" note inside "How BEYOND
  decided", and no longer reserves an empty field below it (TODAY-005's
  min-height is removed). The Work State card drops its explanation
  sentence. Goal: MARK WORK ENDED and SHIFT DOWN visible without scrolling
  on a phone.

## BODY

- **Sleep entry guardrails (Drop 3, owner approval 2026-10-03).** Field use found a 14 hr 30 min
  sleep reading. BODY's SLEEP tile shows one entry (the latest, main sleep or nap) and never adds
  entries up, so it was one stored entry; the likeliest way in was the Minutes box, which accepted
  any number (7 hours + 450 minutes saved as 14 hr 30 min), or a correction, which had no range
  check. Now, in both the log form and a correction (`readSleepDuration`): hours are a whole
  number, minutes a whole number 0–59, and something must be entered; the message shows inside the
  form or entry, not up in the water card. A correction outside the usual range (main sleep 2–12 h,
  nap 5 min–3 h) asks "… is outside the usual range — save it anyway?" with SAVE ANYWAY, the same
  as a new log's LOG ANYWAY — flagged, never blocked. When a day has more than one sleep entry the
  tile adds "latest of N".
- **Correction, not just logging.** Water, sleep, protein, and
  bodyweight all support in-place correction of a past entry via the
  same correction-chain pattern: the original event stays untouched, a
  `*_CORRECTED` event supersedes it, and every query resolves the
  HEAD-of-chain (most recent correction) as the effective value. Nothing
  is ever mutated or deleted in place — this preserves full history
  while still always showing the corrected number.
- Every correction gets an on-screen confirmation and an immediate,
  one-tap undo — a correction should never feel risky to make.
- Sleep and water are shown in human-readable form (e.g. "7h 15m", not
  raw minutes; a quick-add control for common water amounts), not raw
  numeric fields.
- **No "exposed machinery" reveal (locked 2026-09-16, direct owner ruling, DEPTH-001 scope
  question).** BODY renders neither `.command-surface` nor any WHY/diagnostic disclosure —
  by design, it has four peer trackers and no single dominant decision to expose. Asked
  directly whether DEPTH-001's PCB-trace reveal (see "Visual system — red budget" below, whose
  final bullet records DEPTH-001 itself) should extend to BODY; answer was to skip it entirely
  rather than invent a correction-history
  or per-tracker variant. Matches this section's own "four peers, no leader" doctrine. Not a
  temporary placeholder — a future BODY reveal would need its own fresh ask, not an inferred
  extension of this scope.

## Recommendation Engine — outcome ratings stay observational

Locked 2026-09-16, direct owner ruling, asked directly alongside DEPTH-001's BODY question
above (same session, same "no invented scope" discipline as "Intent & Commitment — Obligations
enter Engine recommendation arbitration" further below).

- **Rated Outcome history (GOOD/NEUTRAL/BAD, `rateOutcome` in
  [commands.ts](../src/application/commands.ts)) never biases or tie-breaks which recommendation
  `evaluate.ts` selects.** Asked explicitly: should a pattern of ratings ever influence future
  Engine behavior, even just as a tie-break? Answer: no — it stays exactly as observational as
  it already was. This confirms, rather than changes, the doctrine already stated at
  `rateOutcome`'s own call sites ("rules provide consistency, outcomes provide correction," not
  silent rule adjustment) and the pre-existing "Explicitly out of scope" entry below ("Any AI /
  learning layer over workout data") — now extended explicitly to the Engine's primary
  recommendation selection generally, not just workout data.
- A future session should not re-raise this as an open question without new information — it
  was asked and answered directly, not merely undecided.

## NUTRITION (Meal Memory — NUTRITION-001, locked)

- **SavedMeal is a preset, not history.** A SavedMeal (name + calories/
  protein/carbs/fat) is a small, directly-mutable reusable record — same
  treatment as CaptureItem/SchedulePattern, not itself event-sourced.
  Editing or archiving it changes the preset going forward only.
- **Logging snapshots.** Logging a SavedMeal writes an immutable
  `MEAL_LOGGED` event carrying a copy of its macros AT THAT MOMENT.
  Meal history is DomainEvent truth with the same hydration-style
  correction chain (`MEAL_LOG_CORRECTED` supersedes without erasing the
  original) as water/sleep/protein/bodyweight. A later SavedMeal edit or
  archive can never rewrite a past log — the log doesn't re-read the
  preset, it already has its own values.
- **Effective meal protein counts toward Minimum Day**, summed alongside
  protein-only BODY logs (one combined total, not two competing ones) —
  see `application/queries.ts`'s `getMinimumDayStatus`.
- No food provider, barcode, recipe, serving ontology, calorie/macro
  goal, or nutrition scoring — a SavedMeal is "the sandwich I always
  make," not a food database entry. **Partially reversed 2026-09-15,
  direct owner ruling — see "NUTRITION TARGETS" below**: a calorie
  target and a bodyweight-derived protein target now exist. The rest of
  this bullet still holds — no food provider/barcode/recipe/serving
  ontology, and no nutrition *scoring* (a single pass/fail or point
  value judging a day) — only two plain numeric targets with honest
  progress-toward-target display.
- **As built in Drop 1.5 (protein totals fix, owner brief 2026-10-03).**
  - **One protein total.** `application/queries.ts`'s `getDayProteinTotalG` (protein-only logs +
    effective meal protein, deleted entries excluded) is the day's protein for every screen: TODAY's
    fuel line and Minimum Day card, BODY's PROTEIN status tile and NUTRITION TARGETS, Minimum Day's
    check and the weekly check-in. The Day Ledger computes the same sum. BODY's status tile used to
    show protein-only logs (49 g) while the rest showed the combined total (99 g).
    `getTotalProteinGrams` still means protein-only logs and is no longer shown on its own.
  - **DELETE for a protein-only log.** Same as meals: tap CORRECT on the entry, then hold DELETE.
    It appends `PROTEIN_LOG_VOIDED` naming the root `PROTEIN_LOGGED` (nothing erased; History shows
    "Protein log deleted."), the whole chain leaves every total, and a deleted entry can't be
    corrected. Confirmation: "Deleted 49 g. Protein today: 50 g." Counted as a correction by the
    Burden Meter.
  - **Correcting to 0** ("0", "00", "0.0") is refused with "0 g can't be saved as a correction. To
    remove this entry, hold DELETE.", shown inside the entry — it used to land in the water card,
    off screen. `correctProtein` refuses a non-positive value too.
  - **"Same food?"** (`engine/sameFood.ts`): right after a protein-only log or a saved-meal LOG, if
    the other kind was logged within 2 minutes with protein within 5 g or 10% (whichever is wider),
    BODY asks "Same food? 49 g protein at 20:43 and Dinner (50 g protein) at 20:43." with KEEP BOTH /
    REMOVE ONE. REMOVE ONE deletes the protein-only entry (the meal carries calories and macros) and
    says so before you tap. Never blocks a log, never removes anything on its own.

## NUTRITION TARGETS (Calorie + Protein Targets — NUTRITION-003, locked)

Direct owner ruling, 2026-09-15 (in chat): reverses NUTRITION-001's "no calorie/macro goal"
restriction specifically for calories and protein, in order to support eating at a deficit while
hitting a protein floor.

- **Calorie target is set directly by the operator — no formula.** No BMR/TDEE estimate
  (Mifflin-St Jeor or otherwise) and no adaptive/trend-derived calorie estimate (a Hacker's
  Diet/MacroFactor-style weight-trend-correlated TDEE was considered and deliberately deferred
  as a possible future direction, not built here). `NutritionTargets.calorieTargetKcal` is an
  optional plain number; omitted means "no target set," not zero.
- **Expenditure readout (Drop 6, owner approval 2026-10-03 — "go all").** The deferred
  weight-trend estimate now exists as a **read-only readout in Weekly only** — the calorie target
  above is still set by hand, with no formula, and nothing reads the estimate. `engine/expenditure.ts`:
  over the last 28 days, average logged intake (finished BeyondDays with at least one meal; today
  and meal-less days are missing, never zero) minus the least-squares weight slope × 3,500 kcal/lb.
  Shown as a range — ± two standard errors of the slope, at least ±100 kcal, rounded outward to 50 —
  "About 2,150–2,350 kcal a day", with what it came from and "Assumes those days' meals were all
  logged." It abstains ("Not enough data yet — needs …") below 14 meal-logged days or 8 weigh-ins
  spanning 2 weeks, and when the range would be wider than 1,000 kcal.
- **Protein target is derived, not set directly.** `getEffectiveProteinTargetG()`
  (`application/nutritionTargetQueries.ts`) = `proteinMultiplierGPerLb` × the most recently
  logged bodyweight (`getMostRecentBodyweight()`, cross-day — unlike the day-scoped
  `getLatestBodyweight` HYDRATION/SLEEP/etc. use). Default multiplier is 1.0 g/lb; the operator
  can adjust it. This is the standard cutting-lifter heuristic (RP, Cronometer, most coaches: 0.8
  – 1.0 g/lb), not a BEYOND-invented number.
- **Never a guessed number.** With no bodyweight ever logged, `getEffectiveProteinTargetG()`
  returns `undefined` — the UI shows "log a bodyweight to see your target," never a fabricated
  default bodyweight or a target computed from zero.
- **`NutritionTargets` is a single mutable settings row** (`id: "current"`), same treatment as
  `SchedulePattern` — not event-sourced, since "what target the operator is currently aiming for"
  isn't itself a historical fact the way a logged meal or bodyweight is.
- **Still no nutrition scoring.** Progress is shown as a plain "logged / target" readout
  (`describeCalorieProgress`/`describeProteinProgress` in `ui/screens/body/nutritionCopy.ts`) —
  remaining or over-by-X, never a score, grade, streak, or judgment.

## WORKOUT LIBRARY (Personal Exercise Library — TRAIN-CREATE-001, locked)

Direct owner ruling, 2026-09-12 (in chat): general authorization to build toward workout
"guider and creator" capability, starting with this foundation Drop.

- **CustomExercise is a preset, not history.** Same treatment as SavedMeal: a small,
  directly-mutable record (name/muscle group/equipment/rep range/notes) that changes in place
  when edited, and `archivedAt` hides it from the active list without deleting it. No event
  trail for "what exercises exist" — this Drop introduces no new historical fact type.
- **A bundled reference list is inert, hand-authored data, never a bulk-imported third-party
  database.** `EXERCISE_LIBRARY` (`src/domain/workout/exerciseLibrary.ts`) is informed by the
  shape of open, permissively-licensed datasets (free-exercise-db, Unlicense; wger, exercise data
  CC-licensed separately from its AGPL code) but every entry is a hand-authored generic exercise
  fact — never a verbatim copy of a specific dataset's file or content.
- **Does not touch the fixed A/B/C `WORKOUT_TEMPLATES` system or Engine progression.** The
  domain-layer comment "No broad exercise database" on `WorkoutTemplateId`
  (`src/domain/workout/types.ts`) constrains *that* fixed template system specifically — why its
  own exercise IDs stay a small closed set for progression-history continuity. It is not a
  blanket rule against a personal exercise library existing elsewhere in the app. This entry
  makes that boundary explicit rather than leaving the two facts to read as a silent
  contradiction.
- **Not yet consumed by TRAIN.** `CustomExercise` is a standalone personal list only — not wired
  into TRAIN's substitution field, set logging, or any execution surface, and there is no way yet
  to assemble saved exercises into a new selectable workout template. Both are explicit exclusions
  of this Drop, left to a distinct, larger future Drop that this one is designed to feed.

## HISTORY

- Read-only, complete: every `BeyondDay` and every event that occurred
  on it, in chronological order within the day, most-recent-day-first.
  No filtering or summarization — HISTORY is the audit trail.
- Each day is collapsed by default (status/date/event count only); the
  event-by-event detail is opt-in per day via SHOW/HIDE, so the screen
  stays scannable as history grows.
- **Field polish (Drop 1.6a, owner approval 2026-10-03, from the field-test soak).** History says
  things in words: "Work marked ended.", recommendations by the title TODAY shows ("Recommendation:
  Shift down after work."), exercises by name, sleep as "6 hr 30 min", and each day as "In progress ·
  day off · 2 events" instead of raw codes. Unmapped future event types still fall back to their
  raw name rather than vanishing. In the same Drop: TRAIN's LOG with no reps entered says "Enter
  your reps first — or SKIP if you didn't do this set." and saves nothing (`logSet` refuses fewer
  than 1 rep or a negative weight; bodyweight sets at 0 lb are fine) — an empty tap used to save
  "0 lb x 0"; the workout summary says "Next time: Machine Chest Press: same weight (was: not
  enough history yet)" instead of "no suggestion yet → hold"; Minimum Day drops the internal word
  "BeyondDay"; Weekly's subtitle notes that LAST 28 DAYS and FINDINGS look further back than 7
  days; and tapping MORE again inside a MORE sub-screen returns to the MORE menu.

## Intent & Commitment — Mission archival and Obligation current-attention eligibility

Locked 2026-08-23 (Intent Lifecycle Integrity — Audit + Correction Drop), owner decision, following
real-device evidence: archived Missions' still-unresolved Obligations were surfacing as live/overdue
in TODAY's COMMITMENT card and in Intelligence Spine AdvisoryNotes.

- **Option B, approved.** Archiving a Mission (`archiveMission`) stays non-destructive and does not
  automatically SATISFY or RELEASE its linked Obligations — their `status` is never touched. They
  remain historically unresolved and remain visible/manageable in the Intent/Obligations management
  surface (`getUnresolvedObligations`, `IntentScreen`'s UNRESOLVED view, unchanged).
- However, an OPEN or WAITING Obligation whose linked Mission is `ARCHIVED` is **not currently
  attention-eligible**: it must not participate in TODAY commitment/attention, AdvisoryNotes, or any
  future current-intelligence consumer while its parent Mission stays archived. A standalone
  Obligation (no `missionId`) is never affected by any Mission's lifecycle. An Obligation whose
  `missionId` cannot be resolved to a live Mission (an unresolved/invalid reference) is treated the
  same as archived — conservatively excluded, never a confident current-attention signal merely
  because its own `status` is `OPEN`.
- This is a pure read-time projection (`engine/obligationEligibility.ts`'s
  `isObligationCurrentlyEligible`/`filterCurrentlyEligibleObligations`, consumed via
  `application/intentQueries.ts`'s `getCurrentlyEligibleUnresolvedObligations`) — no schema change,
  no mutation, no migration of existing records. `getUnresolvedObligations` itself is unchanged and
  keeps its literal OPEN/WAITING meaning for management purposes.
- Write-side companion invariant: `createObligation` and `modifyObligation` reject creating or newly
  linking an Obligation to an already-`ARCHIVED` Mission (`MISSION_ARCHIVED` error). Existing
  historical links predating this rule are untouched and remain valid/readable — the check only runs
  when a caller supplies a new `missionId`.
- Deferred, not implemented now: an explicit disposition flow at archive time (retain / move / satisfy
  / release each unresolved child) — a future UX enhancement if real use proves it valuable, not
  required by this Drop.

## Intent & Commitment — TODAY headline completion

Locked 2026-08-23 (TODAY Headline Commitment Completion), owner decision. This supersedes Drop 02's
presentation ruling that the expanded TODAY commitment is entirely read-only, but only for one
canonical operation:

- The collapsed headline commitment is unchanged. Its expanded detail offers `SATISFY COMMITMENT`,
  which uses the exact displayed Obligation's ID and the existing `satisfyObligation` command.
- Satisfaction means the Obligation was fulfilled and remains distinct from `RELEASE`. TODAY does
  not expose release, waiting, editing, re-linking, or reopening.
- Because satisfaction currently has no reopen operation, mutation requires an explicit inline
  confirmation. Cancellation never mutates.
- Successful satisfaction refreshes the existing eligible-obligation query and lets the existing
  deterministic relevance ordering select any next headline. It does not promote an Obligation
  manually or change Recommendation/DecisionTrace or Attention policy.
- Archived-Mission and invalid-parent Obligations remain excluded by the current-attention
  eligibility rule above; this completion action does not weaken Mission lifecycle semantics.

## Intent & Commitment — Recurring Obligations (INTENT-002)

**Reversed 2026-09-15, direct owner ruling.** Drop 01 (2026-08-22) had explicitly locked "do
not implement a custom recurrence engine," "do not introduce RRULE/rrule.js" — `RecurrenceRule`
existed only as a dormant, unused placeholder shape. Separately, `docs/agent/CAPABILITY_MAP.md`
had pre-approved rrule.js as the standard for exactly this, once recurrence was ever actually
wanted. The genuine conflict between the two was surfaced to the owner directly rather than
silently resolved either way (per CLAUDE.md's authority-order doctrine); the owner chose
rrule.js. Drop 01's original restriction is kept in `src/domain/intent/types.ts`'s own doc
comment for history, not deleted.

- **Recurrence is created and edited from the Obligation form** in `IntentScreen.tsx`: Does
  not repeat / Daily / Weekly (with weekday selection) / Monthly, plus an interval ("every N").
  Stored as a full RFC 5545 `DTSTART:...\nRRULE:...` string, always produced by
  `engine/recurrence.ts`'s `buildRecurrenceRule` — never hand-formatted, never accepted as
  free-form text from the operator.
- **Satisfying a recurring Obligation materializes its next occurrence as a new Obligation** —
  same title/description/mission/recurrence, due on the next computed date. The satisfied
  instance is never reopened (Drop 01's "no reopen action" is unchanged); this also applies
  automatically to TODAY's own `SATISFY COMMITMENT` action above, since both paths call the
  same `satisfyObligation` command — no separate wiring was needed or added there.
- **Releasing a recurring Obligation does not continue the schedule.** "No longer required" is
  read as stopping the standing commitment, not skipping one instance — only `satisfyObligation`
  continues it.
- **Still no calendar/agenda view of upcoming occurrences**, and no RFC 5545 features beyond
  DAILY/WEEKLY(+BYDAY)/MONTHLY are exposed in the picker — this Drop is the create/edit/execute
  mechanism only.

## Intent & Commitment — Obligations enter Engine recommendation arbitration (INTENT-ARBITRATION-001)

Locked 2026-09-15, direct owner ruling via two explicit questions (rank, then eligible tiers) —
Obligations previously had zero influence on `evaluate.ts`'s own recommendation, only on
TODAY's separate ATTENTION budget.

- **New `OBLIGATION_DUE` recommendation kind, ranked bottom-of-stack** — above only
  `NO_ACTION_REQUIRED`, below STABILIZE/POST_SHIFT_TRANSITION/RECOVER/EXECUTE_PLANNED_WORK. The
  owner explicitly rejected the alternative of ranking it between POST_SHIFT_TRANSITION and
  RECOVER.
- **Eligible only for `OVERDUE`/`DUE_TODAY` obligations** — `DUE_SOON`/`PLANNED_TODAY` remain
  advisory-only via the pre-existing TODAY ATTENTION budget, unchanged.
- **Engine purity preserved.** `evaluate.ts` itself imports nothing from
  `engine/obligationRelevance.ts` — `application/commands.ts` computes one boolean
  (`hasEligibleObligationDueOrOverdue`) via `hasObligationRequiringArbitration` and passes only
  that into `evaluate()`, the same pattern as `hasPlannedWork`/`hasUnresolvedPostShift`.
- Known, accepted overlap: an `OVERDUE`/`DUE_TODAY` obligation can show both as the dominant
  `OBLIGATION_DUE` recommendation and as a separate `COMMITMENT_DUE` attention chip — same
  treatment `POST_SHIFT_TRANSITION` already has with its own underlying fact, not a new
  inconsistency.

## Backup / restore / archival

- **Replace-only restore, preview-before-write, always.** Nothing is
  ever written until the user has seen a preview (row counts, dates,
  format) and explicitly confirmed. No merge-with-existing-data path
  exists or is planned.
- Two backup formats are supported for **reading**, but only one is ever
  **written** going forward — see
  [README.md — Versions & lineage](../README.md#versions--lineage) for
  why a second, historical format exists at all.
- **Backup reminder is a passive in-app banner** (days-since-last-export,
  surfaced at 7+ days), never a push notification — BEYOND has no
  backend, and a push notification would require one, contradicting the
  local-first doctrine.
- **Archival is via the OS share sheet**, handed the same export file
  Gavin already has — not an in-app Google Drive integration. In-app
  Drive/OAuth was explicitly considered and **rejected**: archived data
  stays fully on-device until the user themselves chooses where to send
  the share-sheet output.

## Accessibility

- **16px is the app-wide minimum font size**, full stop — no card
  metadata, label, eyebrow, or button text may render smaller. This
  doubles as the iOS Safari input-focus auto-zoom threshold (text under
  16px in a focused input causes Safari to zoom the viewport), so it's
  both a legibility and an anti-jank decision. Audited via live
  `getComputedStyle` sweep, not just source inspection, since Vitest
  alone can't verify rendered pixel sizes. 2026-08-20.

## Visual system — red budget

- **Primary CTA color, reversed (locked 2026-09-03, direct owner ruling, LAUNCH-VISION-001).**
  VISUAL-001 (Hybrid Foundation) had made `.btn-primary`'s default fill neutral (near-white on
  near-black) specifically so red stayed reserved for recommendation/active/earned/warning/
  critical/selection — never merely "the main button." That rule is now overturned:
  `.btn-primary`'s default fill is red again (`--action-primary-bg: var(--accent)`,
  `--action-primary-text: var(--text-1)` in [tokens.css](../src/ui/styles/tokens.css)), following
  a direct owner decision made while comparing the BEYOND Launch Vision prototype's "Terry's
  Suit" direction (`prototype/launch-vision/`) against the running app.
- **Scoped narrowly — not a general loosening of red-scarcity doctrine.** This changes
  `.btn-primary`'s fill only. `.btn-danger`'s distinct `--danger` fill, `.command-surface`'s red
  edge/chamfer treatment, `.capacity-dot--red`, and every other existing red usage are unchanged.
  `OPERATOR_INTERFACE_DOCTRINE.md`'s "red authority must be earned; significance earns intensity"
  still governs every red usage this decision doesn't touch — red is simply no longer scarce
  specifically at the primary-action layer, where it is now the default rather than an exception.
- **BODY carve-out (locked 2026-09-03, direct owner ruling, LAUNCH-VISION-002).** Running the
  real app surfaced a genuine second-order consequence the reversal above didn't anticipate: BODY
  renders one primary log action per tracker (WATER/SLEEP/BODYWEIGHT/PROTEIN, plus meal logging)
  on a single long-scrolling screen, so an app-wide red `.btn-primary` showed up several times at
  once there — unlike TODAY/TRAIN, which only ever surface one dominant action at a time. Rather
  than invent a new "pick one tracker to stay red" rule — which would manufacture a hierarchy
  among the four peer trackers that BODY's own STATUS instrument-cluster doctrine (below, and
  [global.css](../src/ui/styles/global.css)'s own `.instrument-cluster` comment: "BODY's red
  budget is deliberately lower than TODAY/TRAIN's — no red accent at all") already forbids — BODY's
  `.btn-primary` reverts to the neutral fill (`.body-field .btn-primary` in global.css, reusing
  `--text-1`/`--bg`), consistent with that same pre-existing, lower-red-budget identity. TODAY,
  TRAIN, and MORE are unaffected and keep the red default above. The quiet/successful "No action
  needed" state on TODAY was considered for a similar carve-out and explicitly rejected by direct
  owner ruling — it stays red, no per-state exception beyond the BODY-wide one here.
  **Superseded 2026-09-30 (ROADMAP-1.0-001):** "No action needed" becomes neutral, not red —
  see "ROADMAP 1.0 rulings" above.
- The broader "Terry's Suit" direction this reversal is drawn from (chamfered/angular surface
  geometry beyond the existing single-surface `--chamfer` primitive, ambient motion, an
  abstract glyph family) remains prototype-only pending its own separate, explicitly
  authorized Drop(s). Typography is no longer in that deferred set — see "Visual system —
  typography" below (TYPOGRAPHY-001). One narrow slice of motion is also now authorized — see
  "Visual system — motion" below (MOTION-001) — but that Drop only reshaped the timing curve
  of transitions/animations that already existed; it did not add, and does not authorize, any
  new ambient/decorative motion. "Ambient motion" as a category stays deferred.
  **Partially reversed 2026-09-15, direct owner ruling, LAUNCH-VISION-003** — four specific,
  named elements are now authorized (below); everything else in this deferred set (an abstract
  glyph family, and any chamfer/motion/bloom beyond the four named elements) stays
  prototype-only.
- **Four elements authorized (locked 2026-09-15, direct owner ruling, LAUNCH-VISION-003).**
  Chamfered plating extends beyond `.command-surface` alone to two more filled, bordered
  surfaces where the production DOM genuinely supports it without changing an established
  identity: `.instrument-cluster` and `.card--warning` (the RED-tier override confirm panel —
  the real analog of the prototype's `.confirm-panel`). A third prototype-listed target,
  `.equipment-row`, was deliberately excluded — it has no background/border by design (a
  different silhouette entirely, not a card with styling removed — see its own doc comment in
  [global.css](../src/ui/styles/global.css)), so a corner cut there would be invisible at best
  and would clip real content at worst; adding a background/padding to make it visible would
  itself be new geometry beyond the four authorized elements, not truthful adaptation of them.
  An ambient red bloom now surrounds `.command-surface` (the one dominant/earned surface, not
  an app-shell-wide glow — the prototype's "device frame" has no real production equivalent);
  since BODY never renders `.command-surface`, its lower red budget holds without a separate
  carve-out. TODAY's START DAY fires a one-time power-on sweep (`.today-field--boot`), never
  replayed within the same day. `ConfirmBanner.tsx`'s shared root (BODY's water/sleep/
  bodyweight/protein/meal confirmations, TODAY's capture-undo and check-in confirmations) gets
  a one-time confirmation pulse on mount; TRAIN's own pre-existing per-set flash (`.set-earned`,
  VISUAL-001) already serves the identical purpose for set logging and is left untouched rather
  than duplicated. All four are pure presentation — no command/query/engine/domain change.
- **Chamfered plates have square corners (locked 2026-09-30, direct owner ruling).** On
  `.card--warning` and `.instrument-cluster`, the three corners without the chamfer are square
  (`border-radius: 0`) instead of inheriting the 4px `--radius` rounding. `.command-surface`
  already had square corners. So each chamfered surface now has exactly one diagonal cut, and
  its other three corners are square. Ordinary `.card`s without a chamfer keep `--radius`.
- **"Exposed Machinery" reveal (locked 2026-09-16, direct owner ruling over four rendered
  mockup passes, DEPTH-001).** A narrow, explicit authorization beyond this section's own
  "ambient motion stays deferred" framing above — obtained through its own independent review
  process the next day, not an automatic extension of LAUNCH-VISION-003's four named elements.
  Opening any of TODAY's "How BEYOND decided," TRAIN's "Why this suggestion"/"Exercise detail,"
  or MORE's "Diagnostic detail" now also shows a full-viewport, purely decorative, `aria-hidden`
  PCB-style circuit-trace network (flat, unglowing red, matched directly to real circuit-board
  photography — an SVG blur/glow filter was tried and explicitly rejected) behind the still-
  legible disclosed content. Reached over four passes: thin hairline traces confined to the
  panel (rejected as "not dramatic enough"); full-screen solid shattered plates matching a
  Batman Beyond character render (rejected — wrong reference entirely, real PCB photos supplied
  instead); a glowing converging trace network (right direction, but faded toward the edges);
  finally flat, uniformly-bright, unglowing traces matched to the supplied photograph —
  "Perfect. Ship it man." See `docs/agent/drops/DEPTH-001.md` for the full history.
  `prefers-reduced-motion: reduce` fully suppresses it (never mounts, not just hidden). Does not
  extend to BODY (see "BODY" above) and deliberately does not include a whole-screen shake that
  an earlier reviewed pass had — kept only the reveal itself and a contained brightness-pulse
  flash, consistent with this app's own existing "motion explains a state change, never
  decorates" doctrine (see "Visual system — motion" below, MOTION-001).
  **Narrowed 2026-09-30, direct owner ruling:** MORE's "Diagnostic detail" no longer triggers
  the reveal. SYSTEM's diagnostics are plain technical readouts, so they expand inline only
  (`WhyDisclosure reveal={false}`). TODAY's "How BEYOND decided" and TRAIN's "Why this
  suggestion"/"Exercise detail" keep the reveal unchanged.

## Visual system — typography

- **Display font, swapped (locked 2026-09-10, direct owner ruling, TYPOGRAPHY-001).**
  `--font-display` (headlines: `.title`, `.command-title`, `.recommendation-title`, and every
  other consumer of the token in [global.css](../src/ui/styles/global.css)) changes from Space
  Grotesk to Big Shoulders Display, matching the BEYOND Launch Vision prototype's "Terry's Suit"
  direction. Same self-hosted-via-`@fontsource` pattern and the same weights (600/700) as before
  — see [fonts.ts](../src/ui/styles/fonts.ts) — only the family named changed.
- **Scoped narrowly.** `--font-body` (IBM Plex Sans) and `--font-mono` (IBM Plex Mono) are
  unchanged. Font sizes, per-element weights, and letter-spacing are unchanged — this is a
  typeface swap, not a type-scale redesign.

## Visual system — motion

- **Easing curve, swapped (locked 2026-09-10, direct owner ruling, MOTION-001).**
  `--motion-easing` changes from the generic `ease-out` to `cubic-bezier(.2, .8, .2, 1)`,
  matching the BEYOND Launch Vision prototype's "Terry's Suit" direction. All 11 existing
  `var(--motion-easing)` consumers in [global.css](../src/ui/styles/global.css) inherit the new
  curve automatically — no per-component change.
- **Scoped narrowly.** `--motion-fast` (150ms) and `--motion-base` (220ms) are unchanged — both
  already sit inside the Product Experience Sprint P2's documented 100-250ms target range and
  are already close to the prototype's own numbers. Only the curve shape changed, not the
  durations, and no new animation/transition was added.

## System identity — EMBLEM vs. GLYPHS split

Locked 2026-08-31 (SHELL-001, direct owner ruling), correcting SHELL-001's original contract
framing, which had claimed the universal/core diamond motif was itself "BEYOND's one stable
system-identity glyph."

- **The universal/core diamond is retired as BEYOND system identity.** It is not, and is not
  meant to become, the machine's own signature mark.
- **EMBLEM = THE MACHINE.** A single dedicated machine-identity mark is BEYOND's system
  identity, distinct from GLYPHS below.
- **The emblem exists, silhouette and color replaced once already (locked 2026-09-13/14, direct
  owner ruling, EMBLEM-002 — supersedes EMBLEM-001's geometry/color, not the EMBLEM/GLYPHS split
  itself).** A bat-form primary mark, `#EA131C` on `#000000` — silhouette, proportions, and color
  are owner design authority. EMBLEM-001's original mark (`#D6202B`) didn't read well at real
  device size and was replaced after the owner viewed it live on a phone home screen; the
  replacement was traced from an owner-supplied reference image (no vector source existed) and
  independently verified maskable-safe before shipping. Source SVGs (master/foreground/folded/
  micro) live in `docs/brand/beyond-mark/`, per that directory's own README: update the master
  geometry there first, then regenerate derivatives — never redraw from concept imagery. Wired in
  as the app icon / home-screen mark (`public/icons/icon-*.png`, `index.html`'s favicon and
  `apple-touch-icon` links) only; it is not used anywhere inside the running app's own UI.
- **Emblem color is independent of the in-app UI's red.** `#EA131C` is the emblem's own locked
  brand color — it does not change, and was not derived from, `--accent`/`--red-b` in
  [tokens.css](../src/ui/styles/tokens.css). Unifying the two is a separate, larger decision
  nobody has made; don't infer it from this entry.
- **Maskable-safe as of EMBLEM-002.** Unlike EMBLEM-001's geometry (wingtips ~20% past the safe
  radius), EMBLEM-002's silhouette was sized to fit the standard maskable safe zone from the
  start (farthest vertex ~395.5 of a safe 409.6, in the 0–1024 viewBox, with margin). The
  manifest's icon entries now declare `purpose: "any maskable"` accordingly. See
  `docs/brand/beyond-mark/README.txt`'s EMBLEM-002 note for the numbers.
- **GLYPHS = THE INSTRUMENTS.** TODAY/TRAIN/BODY/MORE's existing locked pilot icon family
  ([Icon.tsx](../src/ui/icons/Icon.tsx)) remains the existing locked destination/instrument
  glyph set — unchanged geometry, unrelated to machine identity.

## Explicitly out of scope (do not build without direct sign-off)

- BATCAVE
- Trend charts — **except** bodyweight trends/milestones/goal date, and trends on Review and the
  weekly check-in, allowed 2026-09-30 (see "ROADMAP 1.0 rulings" above)
- Any AI / learning layer over workout data — **except** the read-only findings (deterministic
  counts with an abstain floor, shown in Weekly, never fed to the Engine), approved by the owner
  2026-10-03 (see "As built: read-only findings" above)

These need Gavin's direct input and, for the learning layer, real
workout data volume that doesn't exist yet. A future session should not
infer scope for these from adjacent code.
