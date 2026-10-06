# BEYOND 1.0 Roadmap

Owner rulings, 2026-09-30 (ROADMAP-1.0-001). This is the build plan for BEYOND 1.0. When the
owner says "let's work", start here: propose the next unfinished Drop, wait for approval, build
it, open a PR, and report in plain language (see `AGENTS.md`).

## Goal

BEYOND 1.0 means TRAIN and BODY work perfectly and the whole app feels finished, calm, and fun on
a night shift.

**Principle:** each screen does one job and shows less.

## Vision

### Command Center Rules

Owner rulings, 2026-10-03.

1. Replace an app's core job, not all its features.
2. Four tabs are fixed: TODAY, TRAIN, BODY, MORE. No new tabs.
3. Every new feature must state when it surfaces. Default home is Tools; it appears on TODAY only in
   the phase where it matters.
4. The per-phase row cap is enforced by test. A new item on TODAY must replace an existing one.
5. Burden Meter is the judge: a feature that raises burden has failed.

## Build order

At most 3 changes per Drop.

### Drop 1 — Declutter I

- START WORKOUT on TRAIN's first screen, with template/variant overrides behind "Change".
  **Done (PR #118, merged).**
- During a workout, show only the current set and collapse finished sets. **Done (stacked in PR #119).**
- On TODAY, collapse a finished check-in to one line and cut helper text/dead space so MARK WORK
  ENDED and SHIFT DOWN are visible without scrolling. **Done (stacked in PR #119).**

### Drop 2 — Declutter II

- Shrink BODY's STATUS box and collapse once-a-day forms (sleep, bodyweight, protein) so the
  hydration buttons are on the first screen. **Done (PR #120, merged).**
- Cut slogans, section intros, and repeated text app-wide. **Done (PR #120, merged).**
- Remove decorative red (headers, section labels, corner brackets, the status strip edge, BODY
  selected chips). **Done (PR #120, merged).**

### Drop 3 — Tidy

- Move Planned Work to TRAIN only. **Done (PR #121, merged).**
- Add a Settings group in MORE: Nutrition Targets; backup status (replacing TODAY's reminder);
  the SYSTEM panel inside Diagnostic detail. **Done (PR #121, merged).**
- Adopt Lucide icons to replace multi-line row descriptions. **Done (PR #121, merged).**

### Drop 4 — TRAIN

- Live PR alerts. **Done (PR #122, merged).**
- A finish-workout summary. **Done (PR #122, merged).**
- Hold-to-confirm on finish. **Done (PR #122, merged).**

### Drop 5 — BODY

- A weight trend with "lowest since", milestones, and a projected goal date. **Done (PR #123, merged).**
- One-tap "same as yesterday" meals. **Done (PR #123, merged).**

### Drop 6 — Quit tracker

- A generic habit to avoid, named by the owner in the app. **Done (PR #124, merged).**
- It shows "clean days this month" (never a resetting streak). **Done (PR #124, merged).**
- A one-tap urge log (time + trigger). **Done (PR #124, merged).**
- A post-shift plan inside SHIFT DOWN. **Done (PR #124, merged).**
- Money saved. **Done (PR #124, merged).**

### Launch polish (owner-added 2026-10-01, after a review against the Launch Vision prototype)

- A quieter TODAY on calm days. **Done (PR #125, merged).**
- Mono type for small labels only; red off routine buttons. **Done (PR #125, merged).**
- BODY/TRAIN tidy: disclosure rows instead of button stacks, Planned Work under the workout card,
  LOG clear of the screen edge. **Done (PR #125, merged).**

### Drop 7 — Tie together

- A weekly check-in screen: weight trend + goal date, workouts + PRs, quit-tracker days, protein
  average. **Done (PR #126, merged).**
- Home-screen quick-log shortcuts: water, weight, meal, urge. **Done (PR #126, merged).**

### Then: field use

Two weeks of field use. Fix whatever bugs the owner. That's 1.0.

### Field-test weekend (owner-added 2026-10-03)

Built during field use, by owner decision: the field test becomes a before/after, with the Burden
Meter (merged 2026-10-03 05:27 UTC) as the baseline line for the Oct 16 debrief. One Drop at a
time, each briefed by the owner.

- **Drop 0 — field fixes:** the saved schedule answers "Are you working today?"; open screens
  follow the 16:30 roll. **Done (PR #130, merged).**
- **Drop 1 — Day Ledger + Burden Meter.** **Done (PR #131, merged).**
- **Drop 1.5 — protein + sleep totals fix:** one protein total on every screen, DELETE for a
  protein-only log, correcting to 0 points to DELETE, "Same food?" for a protein log and a meal
  logged moments apart. **Done (PR #138, merged).**
- **Drop 2 — Shift Clock v1** (TODAY by shift phase, row cap by test, Time-Fit line), with rulings
  (a) no MARK WORK ENDED before the shift and (b) no check-in prompt before or during it.
  **Done (PR #132, merged).**
- **Progression re-entry** (14+ days away → ~90%). **Done (PR #134, merged).**
- **Sleep draft** ("Slept up to 7h 15m?" after Shift Down). **Done (PR #135, merged).**
- **The Ribbon** (the last 28 lived days in Weekly, one column each). **Done (PR #136, merged).**
- **Read-only findings** in Weekly (sleep before workouts, before vs. after the shift, when urges
  came, stalls, exercise stories — counts only, with an abstain floor). **Done (PR #137, merged).**
- **Weekend push (owner: "go all out", 2026-10-03)** — one PR each, built back to back:
  - **Drop 3 — sleep entry guardrails:** whole hours and minutes 0–59, the "outside the usual
    range" check on corrections too, and BODY's SLEEP tile says "latest of N" when a day has more
    than one entry. **Done (PR #139, merged).**
  - **Drop 4 — urge if-then plans** (stretch): your own plan per trigger, shown right after an
    urge, with PLAN USED / NOT THIS TIME. **Done (PR #140, merged).**
  - **Drop 5 — check-in draft** (stretch): the form opens with your last answers and what's been
    logged since; never auto-confirmed; records CONFIRMED / ADJUSTED. **Done (PR #141, merged).**
  - **Drop 6 — expenditure readout** (read-only, in Weekly): an estimated kcal-a-day range from
    logged meals and the weight trend. **Done (PR #142, merged).**
  (The urge-timing finding shipped with the findings.)
- **Field-test soak (2026-10-03):** 2½ simulated days of the owner's routine through the real app
  found one data bug and several frictions. Shipped mid-test, dated so the Oct 16 debrief can tell
  before from after:
  - **Drop 1.6a — field polish:** no empty "0 lb x 0" sets; History and the workout summary in
    plain words; Minimum Day without jargon; MORE re-tap returns to its menu. **Done (PR #144, merged).**
  - **Drop 1.6b — TODAY behavior:** the sleep draft counts from your last activity after the shift;
    Minimum Day's offer shrinks to one line; MARK WORK ENDED waits for the last hour of the shift;
    no work-day memory on a day off. **Done (PR #145, merged).**
- **FIELD-NAV-001 — position and reveal reliability:** every tab opens at its top; UPDATE
  CHECK-IN and disclosures open into view. **Done (PR #149, merged).** Follow-up: tab switches
  from buttons inside a screen also start at the top; a revealed surface clears the real bottom
  nav (iPhone safe area included); reduced motion tested in a real browser. **Done (PR #150,
  merged).**

### After the field test (owner ruling, 2026-10-04)

The Oct 16 debrief is dropped: BEYOND keeps improving now instead of waiting out the field test.
Items once held until after Oct 16 (the Engine reacting to evidence, Week Ahead, deload/stall
suggestions, wildcards) are no longer date-gated, but each still needs its own owner brief, and
adopting a finding as an Engine rule still needs owner sign-off (ruling 2026-10-03).

- **Undo after every log** (owner ruling 2026-10-03; scope approved 2026-10-04: water, sleep,
  weight and protein, in BODY and on TODAY). **Done (PR #151, merged).**
- **FOUNDATION-A-F1 — lived-day series, personal baselines in Weekly** (owner approval
  2026-10-04, with addendum; water fix: one entry of 40 oz or more counts a day). **Done (PR #152,
  merged 2026-10-04).** Now in its field-test stop: about 3 work rotations (~3 weeks, to about
  Oct 25). Passing tests doesn't authorize F2, F3 or F4; field use is the gate.
- **Plain words** (owner ruling 2026-10-04: "fix the developer wording"): TODAY's check-in row
  reads CHECK-IN (was STATE INPUT); "this BeyondDay" becomes "today" / "the day" on the End Day
  card and in Minimum Day; the no-check-in card's "Guidance remains deterministic, but less
  informed" becomes "Suggestions still work without one; a check-in just helps them fit." A test
  keeps those terms off TODAY, BODY, TRAIN, Weekly and History. **Done (PR #154, merged).**
- **Red ALL GOOD stays** (owner ruling 2026-10-04: "I don't mind some of the red. I kind of like
  it."). Not a defect; no change.
- **DUP-MEAL-001 — duplicate-meal prompt** (owner brief 2026-10-04; built by Codex). **Done (PR
  #155, merged).** First Codex-built Drop under the builder-roles rules.
- **DUP-MEAL-002 — SAME AS YESTERDAY duplicates** (owner approval 2026-10-04, option B): the
  duplicate-meal prompt covers the SAME AS YESTERDAY batch too. **Done (PR #157, merged).**
- **Soak-run fixes** (owner approval 2026-10-04, option A): eight frictions from a scripted
  night-shift → day-off walk through the real app (Shift Down repeating, a contradictory header at
  15:00, leftover developer wording, a stale schedule-screen promise). **Done (PR #157, merged).**
- **PR-CARDS-001 — PR record cards** (owner brief 2026-10-04, Queue item 3): a quiet red-outlined
  PR tag, and every PR kept as a card in TRAIN → RECORDS. **Done (PR #164, merged 2026-10-04).**
- **HUD-001 — HUD design system** (owner brief 2026-10-04, Queue item 1; doctrine amendment 1A):
  black, one red, cut corners, 1px lines, self-hosted fonts, every screen except Weekly.
  **Done (PR #160, merged 2026-10-04).**
- **BACKUP-AUTO-001 — automatic backup** (owner brief 2026-10-04, Queue item 2; decision 2A):
  opt-in, due-on-open backup shared to a destination Gavin picks, monthly restore check, no server.
  **Done (PR #162, merged 2026-10-04).**
- **BODY-TIMELINE-001 — transformation timeline** (owner brief 2026-10-04, Queue item 4): BODY →
  BODYWEIGHT → SHOW TIMELINE shows 90 days of weight with PRs, clean-day milestones (7/30/60/90/
  180/365, a count, never a streak), weight milestones and the goal date pinned; filters per kind;
  read only. Example: tapping a marker reads "Machine Chest Press: heaviest yet (145 lb)", the
  finish summary's own words. **Done (PR #166, merged 2026-10-04).**
- **HUD-002 — sprint cleanup** (Gavin's sprint go-ahead 2026-10-04): contrast comment and test gaps only. **Done (PR #168, merged 2026-10-04).**
- **GYM-001 — gym screen** (owner rulings 2026-10-04, 1A/3A): GYM MODE in an active workout opens a
  full-screen, one-handed view (typeable weight/reps, LOG, ghost set, auto-advance, screen awake,
  plate math and warm-up ramp for barbell lifts). **Done (PR #170, merged 2026-10-04).**
- **GYM-002 — cue text per lift** (owner sign-off 2026-10-04, "1. a, 2. A"): a cue under the lift's
  name in the gym screen, stored as an `EXERCISE_CUE_SET` event (in backups, no database upgrade).
  **Done (PR #173, merged 2026-10-04).**
- **NOTES-SWEEP-001 — day-off notes sweep** (owner rulings 2026-10-04, 1A / 3 "A and B"): on a day off, "Sweep your notes · 6 waiting" walks open notes one at a time (DONE / MAKE IT A TASK / KEEP / hold DELETE with UNDO). **Done (PR #175, merged 2026-10-04).**
- **NOTES-HANDOFF-001 — shift handoff** (owner rulings 2026-10-04, 1A/2A): after MARK WORK ENDED, "Note for next shift?"; the next work day opens with "From last shift" until GOT IT; stored as events. **Done (PR #177, merged 2026-10-04).**
- **NOTES-CAPSULE-001 — time capsule** (owner rulings 2026-10-04, 1A/2A): MORE → TIME CAPSULE seals a note for 1/3/6/12 months; it opens on TODAY that day until GOT IT; text hidden until then; stored as day-independent events. **Done (PR #179, merged 2026-10-04).**
- **WALKTHROUGH-001 — phone-size walk-through** (owner ruling 2026-10-04): report in `docs/agent/WALKTHROUGH-001.md`, 13 screenshots; nothing broken, 13 polish findings for Gavin to pick from. **Done 2026-10-04.**
- **GYM-POLISH-001 — gym screen follow-ups** (Gavin's "A" on #170, 2026-10-04): EXIT 56 px, focus into gym mode and Escape closes it, wake lock released before replaced, NEXT EXERCISE on a finished exercise. **Done (PR #171, merged 2026-10-04).**
- **CLEANUP-002 — gym mode and TODAY polish** (Gavin's "Let's do B. All 13", 2026-10-04): walk-through findings 1–4, 11, 13 and the sweep's silent UNDO failure; e.g. gym mode shows "Last set: Machine Chest Press #1 — 110 × 10" with the PR tag and UNDO. **Done (PR #182, merged 2026-10-04).**
- **CLEANUP-003 — words and clutter** (Gavin's "Let's do B. All 13", 2026-10-04): walk-through findings 5–10 and 12 plus the Windows test timeouts; e.g. TRAIN's advice reads "Last time a set was skipped or short, so keep the same weight." **Done (PR #184, merged 2026-10-04).**

## Queue

What gets built next, top first. The builder (see `AGENTS.md`) takes the top item on "let's
work". Only the owner adds to it. Each item is one short brief (what changes, where it surfaces,
one concrete example of the problem it fixes) plus a written Drop in `docs/agent/drops/` so
Codex can build it when Claude is out.

**Owner brief 2026-10-05 ("Advanced batch").** Rulings, same day:

- **The field-week hold is lifted; build now.** Field notes still jump the queue for any TRAIN or
  BODY break. Example: a GitHub Issue labeled `field` saying "LOG doesn't save in gym mode" goes
  ahead of everything below.
- **The app icon stays** (`public/icons`, the bat). It may appear on the icon and the boot screen
  only (the HUD no-logo rule is amended), used as-is, never redrawn. Example: BOOT-001 shows the
  icon file itself, not a traced or animated copy.
- **Approved merges:** System Status is one line on TODAY; Briefing and After Action Report are
  one report; the Mirror lives in Weekly. Example: there is no separate "Mirror" screen; it is a
  closed row in Weekly.
- **The review account stays in the Queue; nothing waits on it.**
- Write all Drops in one session, then build in this order. Every Drop's handoff carries
  screenshots and DECISIONS FOR GAVIN; Architectural Drops wait for Gavin to approve the merge.

1. **ADVISORY-002 — Advisory cleanup** (Routine). Same-kind notes grouped ("Easing back in · 4
   lifts", a tap lists the lifts with WHY); real to-dos such as "Blood work OVERDUE" go to
   Commitments; the vague "An obligation needs attention" line and the "Background context..."
   explainer are cut; three rows max. **Done (PR #187, merged 2026-10-06).**
2. **FEEL-001 — finish-and-feel pass** (Routine, visual only). 150–250 ms transitions, no bounce;
   HUD lines draw in; numbers tick up; haptic tap on LOG, finished set and hold-to-confirm where
   supported; press states; reduced motion makes it instant; phone screenshots of every screen.
   **Done (PR #188, merged 2026-10-06).**
3. **BOOT-001 — boot sequence** (Routine). Cold launch only: icon, a 1px line, "BEYOND" types in,
   three status lines (e.g. DAY 14 · SHIFT 1800 · BACKUP OK), about 1 s, tap to skip.
4. **SHORTCUTS-001 — home-screen shortcuts** (Routine). START WORKOUT, +WATER, LOG MEAL.
5. **VIEWS-001 — data views** (Routine, read only). Lift strength curve with PRs; 12-week heat
   grid in Weekly. "Your usual" bands wait for the F1 stop (~Oct 25).
6. **STATUS-001 — System Status** (Architectural). One TODAY line, e.g. "AMBER · 5h sleep, 3 hard
   sessions in 4 days"; never changes the Engine.
7. **FIND-001 — search everything** (Routine, read only). "chest" returns every chest PR, note and
   session.
8. **REPORT-001 — Briefing / After Action Report** (Architectural). BRIEFING READY on work nights
   0200–0500, AFTER ACTION READY on the first day off; five items max; one suggested call.
9. **MIRROR-001 — the Mirror** (Routine, read only, in Weekly). Now vs 30 and 90 days ago.
10. **WEEKAHEAD-001 — Week Ahead** (Architectural). Needs Gavin's sign-off on a placement rule
    before it is built.
11. **Review account** (owner ruling 2026-10-04, "3. A"). Gavin sets up a separate GitHub account
    for reviews (Claude walks him through it; Claude never creates accounts or handles the token),
    so independent reviews are formal approvals. Nothing waits on it.

### Known, not yet approved

Spotted but not briefed. The owner moves an item up into the Queue or drops it.

- Items no longer held for Oct 16: the Engine reacting to evidence, deload/stall suggestions.
  Each needs a brief; Engine rule adoption needs sign-off. (Week Ahead was briefed 2026-10-05 as
  WEEKAHEAD-001.)
- **Parking lot (owner brief 2026-10-04), no Drops yet:**
  - **Data views:** moved to the Queue as VIEWS-001 (owner brief 2026-10-05); "your usual" bands
    still wait for the F1 review.
  - **Gym mode:** moved to the Queue as GYM-001 and GYM-002 (owner rulings 2026-10-04).
  - **Notes that go somewhere:** moved to the Queue (NOTES-SWEEP-001, -HANDOFF-001, -CAPSULE-001), 2026-10-04.
  - **Data views (after the F1 review):** tap a number to see its story: lift strength curve,
    12-week training heat grid, a measure against its "your usual" band.
  - **Open-source parts to evaluate (licenses first):** free-exercise-db; wger (study only).

## Builders (owner ruling, 2026-10-04)

Speed rules (owner, 2026-10-04): Routine Drops are half a page and merge on green checks;
Architectural/High-Risk keep the full process and wait for the owner. Handoff notes end with
"DECISIONS FOR GAVIN". Field notes come in as GitHub Issues labeled `field`.

Claude Code is the primary builder; OpenAI Codex is the backup builder when Claude's usage runs
out. One builder at a time; Codex builds only from a written Drop, never merges, and doesn't
change doctrine, roadmap or governance docs; every session ends with a handoff note. Full rules
in `AGENTS.md`; the handoff note is `docs/agent/CURRENT_CHECKPOINT.md`.

## Design rules

- A hard cap on the items visible per screen.
- Hold-to-confirm only for big moments (finishing a workout, ending the day, logging a clean
  day), never for routine sets.
- Adherence-neutral: facts and trends, never shame.

## Later list (not part of 1.0)

- Google Fit / Health Connect sync.
- Progress photos.
- Pre-built meal plans.
