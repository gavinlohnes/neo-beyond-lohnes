# Project Grayson — Campaign Plan (BEYOND → GRAYSON)

Status: **REPORT-ONLY PLAN with a live progress tracker** — 2026-11-20. Mission GRAYSON-CAMPAIGN-PLAN-001.
Baseline: master `211ccf4` (PR #591 merged). Builder: Claude Code (Duet thread).

This plan authorizes nothing. Every objective in it still needs its own brief, Gavin's go, the lane's
review and his merge under [DEV-FLOW-002](agent/DEV-FLOW-002.md). Where this plan and a higher
authority disagree ([Vision](PROJECT_GRAYSON_VISION.md), [Doctrine](OPERATOR_INTERFACE_DOCTRINE.md),
locked [decisions](UX_DECISIONS.md)), the higher authority wins and the conflict is named below.

**How to read it**

- Tags: **DEEPEN** makes something BEYOND already has better. **EXPAND** connects or widens existing
  pieces. **ADD** is new.
- Sizes, in Builder usage: **S** one short session and one small PR; **M** one full session, one PR;
  **L** two or three sessions, usually more than one PR.
- Lanes: **Feature** (ordinary review) or **Protected** (independent exact-head review and Gavin's
  merge; the protected area is named).
- Borrow verdicts: **REUSE THE CODE** (permissive license, fits a local-first React/TS PWA; still a new
  dependency or vendored code, so Protected) or **COPY THE IDEA** (commercial app, copyleft or
  source-available code, or a poor fit). Every COPY THE IDEA carries an **Our way** line: which BEYOND
  piece it extends and how it works for Gavin.
- Evidence marks: **V** = read in the code or an official source on 2026-11-19/20. **A** = assumed or
  inferred; check before a brief relies on it.

---

## Progress tracker and how to use this plan

This table is the one place every Builder (Claude Code, Codex or another agent) reads and writes to see
what is done and what is left. It is the plan's only status record; the item text in section 4 carries no
status of its own.

**Status words:** `Not started` · `In progress (#PR)` · `Done (#PR)` · `Dropped (reason, date)`.

**Rules for every Builder**

1. Before starting, find the item here and search open PRs for its ID (for example `C3.4`), so two
   Builders never take the same item. One Builder per item.
2. Name the item ID in the PR title or the PR's objective line (for example `GRAYSON-Q1 · C3.4`).
3. Update the item's row in the **same PR**: `Done (#PR)` when the PR finishes the item, so it reads true
   the moment the PR merges; `In progress (#PR)` with what's left in Notes when it finishes only part.
   If a PR closes unmerged, the next Builder sets the row back to `Not started`.
4. Status updates need no separate approval. Adding, killing, reordering or rewording an item is a plan
   change: it needs Gavin's OK and is recorded here with the date.
5. This plan authorizes nothing. Each item still needs Gavin's go, its own brief and its lane's review and
   merge rules under [DEV-FLOW-002](agent/DEV-FLOW-002.md).

| Item | What | Status | Notes |
|---|---|---|---|
| **Campaign 1 — Daily Loop** | | | |
| C1.0 | Early START DAY: an afternoon tap opens tonight's day (added 2026-11-20, Gavin's go) | Done (#596) | Prerequisite found in C1.1 discovery; [brief](agent/GRAYSON-C1.0-001.md) |
| C1.1 | Orientation slice 1: work-night wake | Done (#597) | Approved 2026-11-20 (START DAY trigger, Engine keeps sole recommendation authority, runway layout); built on C1.0, [brief](agent/GRAYSON-C1.1-001.md). Prototype evidence in #589 (not production) |
| C1.2 | Orientation slice 2: day-off, recovery and difficult-day grammar | Done (#598) | Approved 2026-11-20 (no invented day-off advice; mood trend as a fact); [brief](agent/GRAYSON-C1.2-001.md) |
| C1.3 | Close ritual | Done (#599) | Approved 2026-11-20: follows SHIFT DOWN, not END DAY; [brief](agent/GRAYSON-C1.3-001.md) |
| C1.4 (Q4) | "Tomorrow differs" line | Done (#599) | Ships inside C1.3's close |
| C1.5 | Re-entry thread | Not started |  |
| C1.6 | Delta voice pass on the loop | Done (#600) | Approved 2026-11-20: Mentor (Bruce → Terry) default, Delta and Droid switchable; [brief](agent/GRAYSON-C1.6-001.md) |
| C1.7 | Carry or drop unfinished plans at the close (backlog B6, after Sunsama) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: FEATURE, S |
| **Campaign 2 — Shift Transitions** | | | |
| C2.1 | Arrival in two taps | Done (#617) | Approved 2026-11-23 (skips read only to pick one step; one tap marks the note read); [brief](agent/GRAYSON-C2.1-001.md) |
| C2.2 | Shift-down bridge (from #592's SHIFT-DOWN-BRIDGE-001) | Not started | [brief](agent/GRAYSON-SHIFTDOWN-TAPS-001.md); Grok Bot |
| C2.3 | Home moment | Not started |  |
| C2.4 | Flip-day plan | Not started |  |
| C2.5 (Q8) | Two-tap run debrief | Not started | [brief](agent/GRAYSON-RUN-DEBRIEF-001.md) (#647); Grok Bot |
| C2.6 | Work boundary guard | Not started |  |
| C2.7 | Work record: training hours, certifications, fitness standards, court and training dates, the two-year mark (Jan 9, 2027), beside swaps and OT (backlog B16) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: PROTECTED (new stored records), M |
| **Campaign 3 — Home and Family** | | | |
| C3.1 (Q7) | Last done and evidence | Not started | [brief](agent/GRAYSON-HOME-LASTDONE-001.md) (#646); Grok Bot |
| C3.2 | Lead time and "coming up" | Not started |  |
| C3.3 | Day-off shape | Not started |  |
| C3.4 (Q1) | Dog care and CO presets (Quick win Q1) | Done (#594) |  |
| C3.4a | Alert time on repeating Home jobs | Done (#594) | Added 2026-11-20 on Gavin's go; Home jobs alerted only at 16:00 |
| C3.4b | Yearly repeats editable in Plans | Not started | Added 2026-11-20 on Gavin's go; touches `engine/recurrence.ts`, so his merge |
| C3.5 | Seasonal packs | Not started |  |
| C3.6 | Home inventory light | Not started |  |
| C3.7 | Group home jobs by room (backlog B12, after Sweepy) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: PROTECTED (new stored field), S |
| C3.8 | Days off with Elle: where their schedules overlap, from a calendar she shares (backlog B17) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: PROTECTED (new provider and another person's data; needs Elle's OK too), L |
| **Campaign 4 — Body Engine** | | | |
| C4.1 | Energy curve body-clock fix | Done (verified and locked; no runtime change) | [brief](agent/GRAYSON-C4.1-001.md); the body-clock model itself stays unvalidated |
| C4.2 (Q2) | Caffeine cut-off by what he drinks (Quick win Q2) | Not started |  |
| C4.2a | Owner-editable caffeine cut-off, source, SAVE / UNDO | Done (#595) | Narrowed by Gavin 2026-11-20: no automated suggestion, confidence or suppression. Explicit experiment deferred to separate authorization |
| C4.3 | Optional one-tap caffeine log | Not started |  |
| C4.4 | Training feeds the night (HARVEST-003 W2) and a train window | Done (#627) | Hard/late session adds "Protect sleep tonight"; train window from usual wake to 2 h before the shift; [brief](agent/GRAYSON-TRAIN-FINISH-2.md) |
| C4.4p | Guided exercise/calibration preview | Done (#608) | Read-only first Training Intelligence slice; no programme, Engine or C4.4 training-to-sleep/window behavior |
| C4.4d | Guided three-session plan draft | Done (#609) | Ephemeral A/B/C and reality-form preview; no save/activation and does not start C4.4 |
| C4.4s | Owner-confirmed A/B/C template save | Done (#610) | Exact review plus atomic custom-template creation; no programme activation, assignment or C4.4 behavior |
| C4.4q | Ordered sequence activation design | Done (#611) | Protected design only: date-independent next-member, recovery and failure semantics; no runtime change or C4.4 behavior |
| C4.4r | Owner-confirmed A/B/C sequence activation | Done (#612) | Existing programme history plus qualifying workout outcomes; preserves capacity/recovery authority and does not start C4.4 training-to-night behavior |
| C4.4t | Connect next sequence member to week opportunities | Done (#613) | Read-only Week Planner/Week Ahead composition; no fixed dates, time advancement, catch-up debt or new planning semantics |
| C4.4v | FULL/SHORT/MINIMUM/HOME/RECOVERY form design | Done (#614) | Protected design only: explicit parent identity, advancement, history and repair; no runtime change |
| C4.4w | Exact bodyweight HOME links | Done (#616) | Protected candidate: owner-confirmed links, exact provenance/advancement, history truth and loaded-progression suppression; no SHORT/adaptation |
| C4.4x | Linked SHORT forms | Done (#625, fix #626) | Exact loaded SHORT per member, mirrors HOME; completed advances, partial holds; [brief](agent/GRAYSON-TRAIN-FINISH-1.md) |
| C4.4y | TRAIN Progress & Direction (read only) | Done (#625, fix #626) | WORKING / UNCERTAIN / NEEDS ATTENTION with evidence floors and WHY; no adaptation |
| C4.4z | Delta during training (guided execution) | Done (#627; Gym mode #628) | Quiet on normal sets; one owner-decided load proposal on clear evidence; pain stop without diagnosis; one end review |
| LOG-WHEN-001 | Logger: DAY and SHIFT on WHEN | Done (#621) | Protected (amends LOG-TIME-001); water and meal sheets; brief `docs/agent/GRAYSON-LOG-WHEN-001.md` |
| LOG-CATCHUP-001 | Post-shift catch-up | Done (#622) | Protected (TODAY after SHIFT DOWN); brief `docs/agent/GRAYSON-LOG-CATCHUP-001.md` |
| C4.5 | Mission review (monthly) | Not started |  |
| C4.6 | Water target | Done (#629) | Own optional target beside the total on TODAY and the water sheet; [brief](agent/GRAYSON-C4.6-001.md) |
| C4.7 | Watch workouts and weight from Health Connect | Not started |  |
| C4.8 | Optional fasting window | In progress (#619, #623) | Design in #601. Slices C4.8a and C4.8b are done; no further slice is authorized |
| C4.8a | Eating Window foundation | Done (#619) | Approved 2026-11-23 (settings on the schedule row, safety check stores completion only, three day kinds); [brief](agent/GRAYSON-C4.8A-001.md) |
| C4.8b | Eating Window meets the meal log | Done (#623) | Offers END FAST AT / FAST FROM a logged meal (never automatic); protein against the open window; [brief](agent/GRAYSON-C4.8B-001.md) |
| C4.9 | Running sessions: the 9-week run/walk plan in TRAIN (backlog B1, after Couch to 5K) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: PROTECTED (new session kind, stored runs, events), L. [brief](agent/GRAYSON-TRAIN-RUN-001.md) (#640); Codex |
| C4.10 | Buzz when rest ends, screen on (backlog B2, after Hevy) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: FEATURE, S. Reuses `src/ui/feel/feedback.ts`; [brief](agent/GRAYSON-TRAIN-REST-001.md) (#644); Codex |
| C4.11 | Spoken run/walk cues and buzz with the phone locked, through Health Bridge (backlog B3) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog; Gavin's pick 1A. Lane, size: PROTECTED (Android permissions, background service), L. After C4.9; Codex |
| C4.12 | Record the standards tests: timed 1.5-mile run, sit-and-reach, one-minute sit-ups (backlog B4) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog; benchmarks per Gavin's pick 4A. Lane, size: PROTECTED (new stored records), M. After C4.9; Codex |
| C4.13 | Written setup, cues and mistakes for every library exercise, plus a link to a free official video (backlog B5, after MuscleWiki) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog; Gavin's pick 2B. Lane, size: FEATURE, M; Codex |
| C4.14 | Body map: tap a muscle to see its exercises, coverage only (backlog B7, after MuscleWiki) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: FEATURE, M; Codex |
| C4.15 | Smoothed trend weight beside the 60-day line (backlog B8, after MacroFactor) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: FEATURE, S. [brief](agent/GRAYSON-WEIGHT-TREND-001.md) (#648); Claude Code |
| C4.16 | Reorder exercises mid-workout (backlog B9, after Hevy) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: FEATURE, S; Codex |
| C4.17 | Pinned note per exercise (backlog B10, after Hevy) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: PROTECTED (new stored field), S; Codex |
| C4.18 | Nutrition-label scan (backlog B13, after MacroFactor) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: PROTECTED (new OCR dependency), M |
| C4.19 | Short sleep trims TRAIN to the SHORT or RECOVERY form; sleep and Garmin only ever lower it, and his check-in wins (backlog B14) | Done (SLEEP-ENGINE-001) | Added 2026-11-24 from the GRAYSON research backlog, then found already built: [SLEEP-ENGINE-001](agent/SLEEP-ENGINE-001.md) (2026-10-27) turns the standard session into the reduced one after two short nights, and his check-in still wins. Tuning is backlog E9 |
| **Campaign 5 — Inner Day** | | | |
| C5.1 | Feeling word (optional) | Not started |  |
| C5.2 | Help mode | Not started |  |
| C5.3 | Shorter reality path | Not started |  |
| C5.4 | Pattern review (monthly, private) | Not started |  |
| C5.5 | Sensitive-data controls | Not started |  |
| **Campaign 6 — Delta** | | | |
| C6.1 | Learning lifecycle | Done (#639) | [brief](agent/GRAYSON-C6.1-C6.2-001.md); answers are a new LEARNING_RESPONDED event |
| C6.2 | "What I think I'm learning" weekly | Done (#639) | Ships with C6.1; [brief](agent/GRAYSON-C6.1-C6.2-001.md) |
| C6.3 | What moves your numbers | Not started | [brief](agent/GRAYSON-WHAT-MOVES-001.md) (#649); Claude Code |
| C6.4 | "Why am I seeing this?" everywhere | Done (#638) | [brief](agent/GRAYSON-C6.4-001.md) |
| C6.5 | Override as evidence | Not started |  |
| C6.6 | Earned challenge ladder | Not started |  |
| C6.7 | One memory store | Not started |  |
| C6.8 | Guided Start + Teach Delta, slice 1 | Done (#605) | `GRAYSON-GUIDED-START-001`; optional one-question teaching, exact confirmation and canonical memory reuse |
| C6.9 | Count the questions GRAYSON asks each day by area, shown only on Delta's monthly page and never as a score of him (backlog B15) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: PROTECTED (new stored records, Delta behaviour), M |
| C6.10 | His own cross-area rules, with Delta proposing edits he confirms (backlog B18) | Not started | Added 2026-11-24 on Gavin's go ("yes to PR"), from the GRAYSON research backlog. Lane, size: PROTECTED (Engine authority, AI autonomy), L |
| **Campaign 7 — Capture and Attention** | | | |
| C7.1 | Voice into capture everywhere | Not started |  |
| C7.2 | Plan stays fresh | Not started |  |
| C7.3 | New moment kinds | Not started |  |
| C7.4 | Widget quick actions | Not started |  |
| C7.5 | Lock-screen workout (HARVEST-003 later) | Not started |  |
| C7.6 | Search on MiniSearch | Not started |  |
| **Campaign 8 — Data You Own** | | | |
| C8.1 (Q6) | Settings travel with the backup | Done (#633) | [brief](agent/GRAYSON-C8.1-SETTINGS-001.md) |
| C8.2 | Restore drill | Not started |  |
| C8.3 | Export everything readable | Not started |  |
| C8.4 | Second-device sync | Not started | Deferred until a second device is wanted |
| **Campaign 9 — Craft and Identity** | | | |
| C9.1 | TodayScreen split (TODAY-SPLIT-002) | Not started |  |
| C9.2 | Quiet Command finish | Done (TRAIN #628; DATA home #632) | [TRAIN brief](agent/GRAYSON-TRAIN-FINISH-3.md), [DATA brief](agent/GRAYSON-C9.2-DATA-001.md) |
| C9.3 | Navigation study | Not started |  |
| C9.4 | Accessibility and motion pass | Not started |  |
| C9.5 | BEYOND → GRAYSON, Alfred → Delta | Not started |  |
| **Quick wins outside the campaigns** | | | |
| Q3 | Finish workouts on the metric page | Done (#584) | Merged 2026-11-22 |
| Q5 | BODY protein tap (roadmap Next #2) | Done (#634, Codex) | |

Last status update: 2026-11-24.

### Guided Operating Loop overlay

The owner-authorized [`GRAYSON Guided Operating Loop`](GRAYSON_GUIDED_OPERATING_LOOP.md) design candidate does not add a
parallel campaign or authorize implementation. It changes how existing campaign work should compose:
begin from Gavin's outcome, reuse current context, ask only material questions, propose an editable
cross-domain plan, carry approved operations into the lived day, and review recorded outcomes. Its
first recommended build is C6.8, followed by meal-logging usability, Food Week, a Mission brief after
the dedicated workout design conversation, and the existing C4.5 outcome review. Existing campaign
IDs remain authoritative for their domain semantics; no row is marked started by the design.

---

## 1. One-screen summary

**Where BEYOND stands.** BEYOND already holds most of the suit. It has a lived day that follows the
16:30 boundary and the rotation, a deterministic Engine, sleep and Garmin evidence, check-ins,
training with progression, nutrition, routines, obligations with real recurrence, People and Home
facts, journals and experiments, Alfred with typed tools and undo, phone alerts through Health Bridge,
and encrypted Drive backup. What it lacks is the thing Grayson is: **the pieces assembled around the
moment Gavin is in**, plus four real gaps (an inner-day check-in that is more than five numbers,
long-horizon stewardship surfacing, a learning lifecycle Delta can show him, and an attention policy
that reaches him with the app closed).

**The campaigns, in order**

| # | Campaign | One line | Builds |
|---|---|---|---|
| 1 | **Daily Loop** | One calm wake screen and one closing ritual, made from what TODAY already knows | 6 (1 S, 3 M, 2 L) |
| 2 | **Shift Transitions** | Deputy Lohnes in and out: arrival, shift-down, coming home, flip days | 6 (2 S, 4 M) |
| 3 | **Home and Family Stewardship** | Smoke detectors, dogs, Elle's dates and days off that feel like life | 6 (3 S, 3 M) |
| 4 | **Body Engine** | Sleep, training, food and caffeine feeding one plan and one honest review | 8 (3 S, 4 M, 1 L) |
| 5 | **Inner Day** | Feelings in words, a help mode, and a shorter path on hard stretches | 5 (1 S, 3 M, 1 L) |
| 6 | **Delta Intelligence and Memory** | What Delta thinks it's learning, how sure, and Gavin's veto | 7 (1 S, 4 M, 2 L) |
| 7 | **Capture, Voice and Attention** | Speak anything; the right nudge reaches the phone even when the app is shut | 6 (1 S, 3 M, 2 L) |
| 8 | **Data You Own** | Nothing lost, everything exportable, settings travel with the backup | 4 (2 S, 1 M, 1 L) |
| 9 | **Craft and Identity** | Quiet Command finish, navigation proved by the loops, then BEYOND → GRAYSON, Alfred → Delta | 5 (1 S, 2 M, 2 L) |

About **53 builds** in all: 15 S, 27 M, 11 L. Campaigns 7 and 8 run alongside the others; their
early items are small and unblock later work.

**The first move.** Build three quick wins this week (Q1–Q3 below: dog care and CO checks in Home,
a caffeine cut-off for 5-hour Energy, and finishing the workouts metric page), and take a 10-minute
phone look at the Orientation prototype (PR #589). Then start Campaign 1 with the bounded
**Orientation slice 1: a work-night wake** (section 6), which reuses #589's proven layout and only
covers the workday case, so it costs one M build, not the full L.

---

## 2. A day in the life: BEYOND today vs Grayson after the campaigns

All three are drawn from his real rotation (Week A works Mon/Tue/Fri/Sat/Sun, Week B Wed/Thu, 18:00–06:00;
[`scheduledContext.ts`](../src/engine/scheduledContext.ts) V). "Today" is what the code does now (V
unless marked). "Grayson" names the campaign items that make it true.

### 2a. Week A work night (Saturday, night 2 of 3)

| Moment | BEYOND today | Grayson after the campaigns |
|---|---|---|
| **Wake ~15:00** | TODAY opens: Life State band ("Night 2 of 3"), a draft recommendation if two short sleeps, Garmin tiles, energy curve, check-in card, commitments, routines, capture. He reads several panels to assemble the picture. | One Orientation screen: "Slept 6 h 40, a bit under your usual. Night 2 of 3, on at 18:00. You said you felt flat yesterday; check in when you're up." One recommendation or none, at most two actions, then TODAY. (C1.1) |
| **Prepare 15:30–17:15** | PREP sheet for food and bottle, routines for BEFORE SHIFT, training suggestion, caffeine cut-off on the cave's ROUTE (6 h before usual sleep). | Orientation's one prep line reads only what's unusual ("Gym bag: you skipped it twice this run"). Caffeine line by what he drinks: "5-hour Energy by 01:30" (Q2/C4.2). Train window if training fits (C4.4). |
| **Arrive 17:50** | WAKE and BEFORE SHIFT alerts from Health Bridge. MARK WORK STARTED. "From last shift" handoff note. | Arrival in two taps: work started, last shift's handoff read, anything to carry. Personal reminders go quiet for the shift. (C2.1, C7.3) |
| **On shift** | Silent unless the bridge plan has a TASK DUE. Capture and voice log work. | Same silence by default. One caffeine cut-off nudge if he turned it on, inside the 3-a-day cap. (C7.3) |
| **Leave 06:00** | SHIFT'S DONE alert. MARK WORK ENDED. SHIFT DOWN timer (5–30 min). Drive Home voice log. | Shift-down bridge: park anything unfinished (lands in capture), one minute of slow breathing, pick what's first at home. Under two minutes. (C2.2) |
| **Home 06:30** | Post-shift recommendation clears on SHIFT DOWN complete. | "Home" moment: work noise drops off TODAY; Elle and the dogs are what's first if he picked that. (C2.3) |
| **Steward** | Home and People items show only in Life when due. | Nothing tonight unless something is due within his lead time. (C3.2) |
| **Close ~07:15, before sleep** | END DAY button when suggested. | Close: one or two questions he chose, "tomorrow differs" ("Night 3 is the last one; first full day off Monday"), park the rest, sleep. (C1.3, C1.4) |

### 2b. Rotation-change day (Friday 06:00, after Week B's last night, into three days off)

| Moment | BEYOND today | Grayson after the campaigns |
|---|---|---|
| **Leave work** | SHIFT'S DONE, day-off line rides on it. Post-run report and recovery contract on RUN OVER (V: `postRunReport.ts`, `recoveryContract.ts`). | Same, plus the shift-down bridge and a run debrief question set that's two taps (C2.2, C2.5). |
| **First sleep** | FIRST SLEEP card: sleep soon, his own past-run times. | Same card, and the night-to-day flip plan names the one anchor that matters: a short morning sleep, then daylight, then a normal night (C2.4). |
| **Wake midday** | TODAY in OFF mode; PREPARE FOR WORK could still show under a mode pin (baseline finding). | Orientation in day-off grammar: "Day 1 of 3 off. Recovery first. One thing due: smoke alarm test. The rest is yours." (C1.2, C3.3) |
| **Afternoon** | "Plan my day off" opens an Alfred prompt. | A rough shape he can accept, edit or ignore: rest, something with Elle (only if he turned it on), one house thing, open time. Nothing booked. (C3.3) |
| **Evening** | END DAY. | Close names tomorrow's shape and what can wait until Monday (C1.3). |

### 2c. Day off (Saturday, Week B)

| Moment | BEYOND today | Grayson after the campaigns |
|---|---|---|
| **Wake** | TODAY OFF mode, Garmin sleep, check-in. | Orientation day-off view: how he slept, the one or two things that matter today, open time named as open (C1.2). |
| **Plan** | Week Planner and Plan Today lists. | The day-off shape from 2b, plus training if the programme has an OFF slot (C3.3, C4.4). |
| **Live** | Fast capture, voice in Alfred and Drive Home. | Voice capture from anywhere, including the Health Bridge widget (C7.1, C7.4). |
| **Steward** | Home presets (furnace filter, smoke alarms, gutters…) as recurring "Home:" commitments; People dates as yearly commitments. Shown in Life. | "Coming up" with lead time: "Elle's birthday in 12 days. You saved two gift ideas." Dog meds due Monday. Smoke alarm test done → next date set, evidence kept. (C3.1, C3.2, C3.4) |
| **Inner day** | Mood 1–5 slider. | Optional feeling word and "what would help: just listen, help me decide, minimum version" (C5.1, C5.2). |
| **Close** | END DAY. | Close + tomorrow: "Back to work Wednesday; nothing needed from you tomorrow" (C1.3). |

---

## 3. Grayson capability map

Every capability the vision, the six layers and the 12 canonical scenarios need. **B** built, **P**
partial, **M** missing. Paths are under `src/` unless shown. Campaign column says who closes the gap.

### Daily Life Loop

| Capability | Status | Proof | Ev | Gap → campaign |
|---|---|---|---|---|
| Lived day follows sleep/shift, not midnight | **B** | `engine/dayRollover.ts` (16:30), `application/livedDayMap.ts` | V | — |
| Work/off truth with source | **B** | `application/workContextResolution.ts` (RECORDED > CONFIRMED > PREDICTED > UNKNOWN) | V | — |
| Where in the run ("Night 2 of 3"), next switch | **B** | `application/shiftRun.ts`, `ahead.ts`, `rotationProjection.ts` | V | — |
| Life state and transitions | **B** | `application/lifeState.ts`, `lifeTransition.ts` | V | — |
| One calm wake orientation | **P** | Prototype only (PR #589, not merged); TODAY composes many panels: `ui/screens/today/TodayScreen.tsx` | V | C1.1–C1.2 |
| Recommendation (one, deterministic, explained) | **B** | `engine/evaluate.ts` + DecisionTrace; draft before check-in `engine/recommendationDraft.ts` | V | — |
| "No action required" as success | **B** | `evaluate.ts` NO_ACTION_REQUIRED | V | — |
| Since-last-look change line | **P** | `application/sinceLastLook.ts` (TODAY band only) | V | C1.5 |
| Preparation (food, bottle) | **B** | `application/preparation.ts`, `ui/components/WorkPreparation.tsx` | V | — |
| Learned departure checklist (unusual items) | **M** | Routines are fixed lists (`domain/routines.ts`) | V | C2.1 |
| Closing ritual with reflection + tomorrow | **P** | `ui/screens/today/EndDayCard.tsx` is a button; Daily Note, journal, weekly interview live elsewhere | V | C1.3–C1.4 |
| Day types (work, off, recovery, difficult…) | **P** | WORK/OFF + Minimum Day (`MinimumDaySection.tsx`), RECOVERY/FLIP life states | V | C1.2, C5.3 |

### Foundations (sleep, recovery, food, movement, energy)

| Capability | Status | Proof | Ev | Gap → campaign |
|---|---|---|---|---|
| Garmin sleep, steps, HR, resting HR, calories | **B** | Health Bridge `android/health-bridge` (0.11.2), `application/garminSleep.ts`, `healthSync.ts` | V | — |
| Watch-recorded workouts, weight, body fat | **M** | Not in Bridge permissions (AndroidManifest) | V | C4.7 (Protected) |
| Personal baselines and "unusual for you" | **B** | `engine/personalBaselines.ts`, `domain/health/unusual.ts` | V | — |
| Sleep owed vs his own usual | **B** | `application/sleepDebt.ts` | V | — |
| Night energy curve | **P** | `application/alertness.ts`; #592's early-low claim withdrawn (research audit); shown low locked in the waking night by C4.1 (#636); body-clock anchor unvalidated | V / A | C4.1 |
| Caffeine timing | **P** | Owner-editable cutoff, default 6 h (`application/sleepPlanSettings.ts`, C4.2a); no automated proposal or exposure/adherence measurement | V | C4.2–C4.3 |
| Light timing | **P** | LIGHT card on night shifts only (`shiftSleepPlan.ts`) | V | C2.4 |
| Meals, protein, water, barcode, USDA | **B** | `nutritionCommands.ts`, `foodLookupQueries.ts`, `barcodeLookup.ts`, `ui/components/BarcodeScanner.tsx` | V | — |
| Water target | **M** | No target field found | V | C4.6 |
| Fasting | **M** | No fasting field or UI anywhere | V | C4.8 (if Gavin wants it) |
| Expenditure and calorie proposal | **B** | `engine/expenditure.ts`, `application/targetProposal.ts` | V | C4.5 deepens |
| Training programme, live workout, progression, PRs | **B** | `domain/workout/trainingProgramme.ts`, `engine/progression.ts`, `engine/stall.ts`, `engine/personalRecords.ts`, `ui/screens/train/*` | V | — |
| Training ↔ sleep ↔ food linked | **P** | Engine reads sleep streak only (`engine/sleepStreak.ts`); training load doesn't reach sleep plan (HARVEST-003 W2) | V | C4.4–C4.5 |
| Mission-level outcome review | **M** | Pieces exist in Weekly/Review; no goal → plan → outcome loop | V | C4.5 |

### Roles and commitments

| Capability | Status | Proof | Ev | Gap → campaign |
|---|---|---|---|---|
| Shift marks with corrections | **B** | `application/shiftMarks.ts`, `engine/workMarks.ts` | V | — |
| Shift handoff note | **B** | `application/shiftHandoffQueries.ts`, `ui/components/ShiftHandoff.tsx` | V | C2.1 connects |
| Preflight / after-action | **B** | `application/caveBrief.ts`, `shiftChange.ts` | V | — |
| Shift-down as a real transition | **P** | Timer + events (`commands.ts` startShiftDown…, `ui/screens/today/ShiftDownCard.tsx`) | V | C2.2 |
| Drive home hands-free log | **B** | `ui/components/DriveHome.tsx` (Web Speech) | V | — |
| Home role ("husband, dad, Gavin") moment | **M** | No home-arrival composition | V | C2.3 |
| Obligations with RFC 5545 recurrence | **B** | `domain/intent/types.ts`, `engine/recurrence.ts` (rrule) | V | — |
| Projects, missions, week planner | **B** | `projectCommands.ts`, `weekPlannerQueries.ts`, `ui/screens/more/WeekPlanner.tsx` | V | — |
| Work-run plan and redraft | **B** | `application/workRunPlan.ts`, `workRunRedraft.ts` | V | — |

### Life stewardship and relationships

| Capability | Status | Proof | Ev | Gap → campaign |
|---|---|---|---|---|
| Home items with intervals | **B** | `application/homeCommands.ts`, `ui/components/HomePanel.tsx` presets (filter, smoke alarms, gutters, dryer vent…) | V | — |
| Last done / completion evidence / next window | **P** | Next instance on satisfy (`intentCommands.ts` materializeNextOccurrence); "last done" only implied by resolvedAt | V / A | C3.1 |
| Lead time (surface before it's due) | **M** | Obligations surface when due/planned; no per-item lead time | A | C3.2 |
| Dog care | **M** | No presets or kind for pets | V | Q1 / C3.4 |
| People dates (birthday, anniversary) | **B** | `application/peopleCommands.ts`, `personQueries.ts`, `ui/components/PersonPage.tsx` | V | — |
| Gift ideas | **P** | PERSON facts matched by text (`personQueries.ts`) | V | C3.2 |
| Family shared calendar | **B** | `application/familyCalendar.ts` (Working / Asleep / Day off only) | V | — |
| Day-off composition | **P** | "Plan my day off" is an Alfred prompt (`ui/screens/more/PlanTodayScreen.tsx:165`); recovery contract on RUN OVER | V | C3.3 |

### Inner day and reflection

| Capability | Status | Proof | Ev | Gap → campaign |
|---|---|---|---|---|
| Check-in (energy, stress, mood 1–5; soreness, urge 0–5) | **B** | `domain/common/types.ts`, `engine/capacity.ts` (locked) | V | — |
| Feeling words, context, help mode | **M** | Numeric only (`ui/screens/today/checkInFields.ts`) | V | C5.1–C5.2 |
| Multi-day pattern and shorter reality path | **P** | Minimum Day exists; no sustained-pattern path | V | C5.3 |
| Daily note, decision journal, shift debrief | **B** | `dailyNoteCommands.ts`, `journalCommands.ts`, `reflect.ts` | V | — |
| Weekly interview, month letter, year review | **B** | `weeklyInterview.ts`, `monthLetter.ts`, `yearReview.ts` | V | — |
| Time capsule | **B** | `timeCapsuleCommands.ts` | V | — |
| Quit / urge tracking | **B** | `quitCommands.ts`, `ui/screens/body/QuitTracker.tsx` | V | — |

### Delta and personal science

| Capability | Status | Proof | Ev | Gap → campaign |
|---|---|---|---|---|
| Alfred: answers from records, typed tools, confirm/undo | **B** | `application/alfred/alfredTools.ts`, `alfredAct.ts` (10 s undo), `alfredClient.ts` | V | — |
| Free (no-AI) helper and brief | **B** | `application/helper/freeHelper.ts`, `freeBrief.ts` | V | — |
| Memory with provenance | **P** | `application/memory.ts`: ACTIVE / IRRELEVANT only; two stores still exist (`alfredMemories` + MEMORY_RECORDED) | V | C6.1 |
| Learning lifecycle (observed → retired) | **P** | `application/delta.ts` KNOWN / LEARNING / NOT_STARTED notebook | V | C6.1–C6.2 |
| Experiments with honest statistics | **B** | `application/tryExperiment.ts` (Welch 95 %) | V | — |
| Automatic "what moves your numbers" | **P** | `application/tagPatterns.ts` (tags only, ≥3 days a side) | V | C6.3 |
| Ask fixed questions with sources | **B** | `application/askProjection.ts` | V | — |
| Remember at the right moment | **B** | `application/remember.ts` | V | C6.4 extends |
| Override as evidence | **P** | Decline reasons are journal entries (`reflect.ts`); not read back as learning | V | C6.5 |
| Earned challenge ladder | **M** | No avoidance classifier (Protected recommendation work) | V | C6.6 |

### Capture, attention, data, craft

| Capability | Status | Proof | Ev | Gap → campaign |
|---|---|---|---|---|
| Raw-first capture, notes sweep, share inbox | **B** | `ui/components/FastCapture.tsx`, `NotesSweep.tsx`, `SavedInboxScreen.tsx` | V | — |
| Date parsing on capture | **B** | `engine/captureIntelligence.ts` (chrono-node + compromise) | V | — |
| Voice | **P** | Web Speech in `DriveHome.tsx`, `AlfredSheet.tsx` only | V | C7.1 |
| Local search | **P** | MiniSearch installed; `application/searchQueries.ts` hand-rolled (A: check use) | V / A | C7.6 |
| Alerts with app closed | **P** | Health Bridge alarms, 3/day cap (`application/bridgePlan.ts`, `MomentAlerts.kt`); plan refreshes only on SYNC GARMIN | V | C7.2–C7.3 |
| Home-screen widget | **P** | Bridge widget shows brief and next moment (agent read of `MomentAlerts.kt`/Manifest) | A | C7.4 |
| Native backup, restore, encrypted Drive | **B** | `persistence/backup.ts`, `restore.ts`, `application/driveBackup/backupCrypto.ts` (AES-GCM, PBKDF2 600k) | V | — |
| Settings inside the backup | **P** | ~40 `beyond.*` localStorage keys (Alfred cap, reminders, rest timers, hidden features) outside the Dexie export | V | C8.1 |
| CSV export | **B** | `application/recordsExport.ts` | V | — |
| Multi-device sync | **M** | No CRDT or sync code | V | C8.4 (deferred) |
| Visual foundation and sections | **B** | `ui/foundation/primitives.tsx`, `ui/components/Section.tsx` | V | C9 |
| GRAYSON / Delta identity in the app | **M** | Runtime is BEYOND + Alfred (by approved rule) | V | C9.5 |

**What the map says.** Of about 70 capabilities, roughly 40 are built, 20 partial and 10 missing.
Almost every missing one is a *connection* or a *moment*, not a new domain. That matches the baseline
and synthesis: connect first.

---

## 4. The campaigns

Each item: tag · what · **Done when** · **Builds on** · **Lane, size** · **Borrow** (verdict) ·
**Our way** (for idea borrows).

### Campaign 1 — Daily Loop

**When it's done.** Saturday 15:00 he opens the phone and one screen tells him how he slept, that it's
night 2 of 3, and the one thing worth doing before 17:15. At 07:15 Sunday the close takes 40 seconds:
one question, tomorrow's difference, everything else parked.

**Exists now.** TODAY and its sections (`ui/screens/today/*`), `todayPicture.ts`, `lifeState.ts`,
`recommendationDraftQueries.ts`, `sinceLastLook.ts`, `EndDayCard.tsx`, Daily Note
(`ui/screens/more/DailyNoteScreen.tsx`), Orientation design ([LIVED_DAY_ORIENTATION_DESIGN.md](LIVED_DAY_ORIENTATION_DESIGN.md)),
prototype PR #589.

- **C1.1 EXPAND · Orientation slice 1: work-night wake.** The first deliberate START DAY on a
  workday opens Orientation: Situation → You → Delta → zero or one recommendation → at most two actions
  → Release. Sparse, unknown and source-failure states included.
  - Done when: workday, sparse, unknown-context and failed-source states each render at 320/360/412 px;
    tests prove no second recommendation and no write; exit and reopen work; Gavin's phone look.
  - Builds on: #589 layout, `todayPicture.ts`, `recommendationDraftQueries.ts`, `workContextResolution.ts`, `CheckInSheet.tsx`, `FastCapture.tsx`.
  - Lane, size: **Protected** (TODAY composition, recommendation presentation) · **M**.
  - Borrow: Flighty "what changed, why it matters" briefing (COPY THE IDEA). Our way: Delta's lines are
    deterministic sentences built from `todayPicture` and the DecisionTrace, consequence first ("Short
    sleep, night 2 of 3: lighter session"), each with a source tag from `ui/foundation/primitives.tsx`.
    Apple Weather "conclusion → timeline → detail" (COPY THE IDEA). Our way: the energy curve and
    lived-day bar become the one tap deeper, not more cards.
- **C1.2 EXPAND · Orientation slice 2: day-off, recovery and difficult-day grammar.** Same screen,
  purpose-first: rest, family, one due thing, open time named as open.
  - Done when: OFF, RECOVERY (first day after a run) and Minimum Day variants render; no work prep shows
    under OFF (fixes the baseline's PREPARE FOR WORK under a pin); tests cover each.
  - Builds on: C1.1, `lifeState.ts`, `recoveryContract.ts`, `MinimumDaySection.tsx`.
  - Lane, size: **Protected** (TODAY composition) · **M**.
  - Borrow: Gentler Streak's explicit "status" changes the tone (COPY THE IDEA). Our way: the day type
    comes from life state and Minimum Day he already sets; Delta's tone and the action cap change with it.
- **C1.3 ADD · Close ritual.** END DAY becomes optional: up to two reflection prompts from a short
  list he picks once (went well / could improve / thankful / what Delta should learn), "tomorrow
  differs" line, and "park the rest". Answers save as the existing Daily Note.
  - Done when: close completes in under 60 s in a timed walkthrough; answers land in
    `dailyNotes` for that lived day; skipping is one tap; END DAY still works alone.
  - Builds on: `EndDayCard.tsx`, `dailyNoteCommands.ts`, `ahead.ts`, `weekAheadQueries.ts`.
  - Lane, size: **Protected** (TODAY composition; END DAY is a hold-to-confirm big moment) · **M**.
  - Borrow: Sunsama's evening shutdown (COPY THE IDEA). Our way: no task review marathon; the only
    list is what's open today, each with do / move / wait / release, using `modifyObligation` and the
    release command that already exist.
- **C1.4 ADD · "Tomorrow differs" line.** One sentence on the close and in Orientation: the next
  shift, a flip, a first day off, a due date. Abstains when nothing differs.
  - Done when: derives only from `ahead.ts` + Week Ahead; abstains with no saved schedule; tests for
    run-end, flip, day off.
  - Builds on: `ahead.ts`, `weekAheadQueries.ts`, `lifeTransition.ts`.
  - Lane, size: **Feature** inside C1.3 (application read + copy) · **S**. Quick win Q4.
- **C1.5 DEEPEN · Re-entry thread.** When he comes back mid-day, Orientation's top line says what
  changed since the last look (a new sleep import, a reply needed, a done task) and returns him to
  what he was doing.
  - Done when: `sinceLastLook.ts` diff covers sleep import, obligations and active workout; one line,
    or nothing.
  - Builds on: `sinceLastLook.ts`, `lastLookStore.ts`.
  - Lane, size: **Protected** (TODAY composition) · **L** (state across interruptions).
  - Borrow: Linear Mobile's inbox-on-return (COPY THE IDEA). Our way: no inbox; one line from the
    existing device-local snapshot.
- **C1.6 DEEPEN · Delta voice pass on the loop.** Rewrite Orientation, close and recommendation
  copy into Quiet Command (concise, evidence-scaled directness).
  - Done when: copy library in one file, reviewed against Doctrine language rules; no score words.
  - Builds on: `recommendationCopy.ts`, `statusCopy.ts`, `capacityCopy.ts`.
  - Lane, size: **Feature** (copy) · **L** if done across all screens; **S** per screen.

**Dependencies:** none to start. C1.5 benefits from C7.2. **Proof on a real night:** on the next work
wake, open the phone and answer in under a minute "how did I sleep, which night is it, what's the one
thing" without scrolling. Yes = KEEP.

### Campaign 2 — Shift Transitions

**When it's done.** At 06:00 he parks two loose ends with his voice, breathes for a minute and picks
"the dogs" as first at home, all before the car warms up. On the flip into days off, one plain plan
says when to sleep and when to get light.

**Exists now.** `ShiftDownCard.tsx`, `resetShiftDownCopy.ts`, `DriveHome.tsx`, `ShiftHandoff.tsx`,
`shiftChange.ts` (PREFLIGHT / LANDING / SECURED), `caveBrief.ts`, `postRunReport.ts`,
`recoveryContract.ts`, `shiftSleepPlan.ts` (CAFFEINE / NAP / FIRST_SLEEP / LIGHT), routines by moment.

- **C2.1 EXPAND · Arrival in two taps.** At PREFLIGHT, one card: work started, last shift's
  handoff read, the one unusual item from his routine (the item he unticked most often lately).
  - Done when: card appears only in PREFLIGHT; "unusual item" is the routine step skipped most in the
    last 14 lived days, or nothing; marks go through existing commands.
  - Builds on: `shiftChange.ts`, `ShiftHandoff.tsx`, `routineCommands.ts` (ROUTINE_STEP_SET history).
  - Lane, size: **Protected** (TODAY composition) · **M**. Note ROUTINES-001 says "no counts, no
    missed"; this reads skips to pick an item but never shows a count. Needs Gavin's OK on that reading.
  - Borrow: Things' "This Evening" grouping (COPY THE IDEA). Our way: the existing BEFORE SHIFT
    routine shows only the item that is easy to forget, not the whole list.
- **C2.2 DEEPEN · Shift-down bridge (from #592's SHIFT-DOWN-BRIDGE-001).** Three optional taps:
  park unfinished (to capture), one minute of cyclic sighing, pick what's first at home.
  - Done when: under 2 minutes timed at 360 px; parked items land in capture with their time; the home
    pick lives only for the lived day and is never an Engine input; timer and MARK WORK ENDED remain;
    reduced-motion check passes.
  - Builds on: `ShiftDownCard.tsx`, `FastCapture.tsx`, `DriveHome.tsx`.
  - Lane, size: **Feature** (inside an existing card) · **M**.
  - Borrow: Headspace/Calm-style breathing cue (COPY THE IDEA). Our way: one 60-second animated ring in
    the foundation palette, no audio, no streak, skippable.
- **C2.3 ADD · Home moment.** After SHIFT DOWN completes, TODAY drops work items and shows only the
  home pick, today's family/home item if due, and sleep timing.
  - Done when: after completion, work-only sections hide until the next PREFLIGHT; tests per phase.
  - Builds on: `lifeState.ts`, `attentionPolicy.ts`, `hasUnresolvedPostShift` in `application/queries.ts`.
  - Lane, size: **Protected** (TODAY composition) · **M**.
- **C2.4 DEEPEN · Flip-day plan.** On the last shift of a run and the first day off, a short plan:
  sleep soon (his own past-run time), daylight after waking, a normal night. Light card extends to
  day-off mornings.
  - Done when: card set changes on LAST_SHIFT / RUN_OVER; every timing cites its source; no light
    tracking.
  - Builds on: `shiftSleepPlan.ts`, `lifeTransition.ts`, `rotationProjection.ts` flips.
  - Lane, size: **Protected** (amends SHIFT-SLEEP-PLAN-001 timing guidance) · **M**.
  - Borrow: Timeshifter's shift plan and Rise's light windows (COPY THE IDEA). Arcascope `circadian`
    (MIT per LICENSE file, Apache-2.0 per PyPI; conflict, treat as unverified;
    [repo](https://github.com/Arcascope/circadian), `circadian/models.py` Forger99) for the model
    (COPY THE IDEA). Our way: keep the existing rule-and-citation cards; port one light-driven model to
    a pure Engine module only if the rule cards prove too coarse on his real flips.
- **C2.5 DEEPEN · Two-tap run debrief.** On RUN OVER, "How did the run go? Rough / OK / Good" and
  one optional line, saved as the existing shift-debrief journal entry.
  - Done when: reuses `reflect.ts` shift-debrief; shows once per run; never asks about calls or people.
  - Builds on: `reflect.ts`, `postRunReport.ts`.
  - Lane, size: **Feature** · **S**.
- **C2.6 DEEPEN · Work boundary guard.** A one-time note on capture and journal while on shift:
  "Keep case details out of BEYOND." No blocking, no scanning.
  - Done when: shows once per run in on-shift capture; dismissible.
  - Builds on: `FastCapture.tsx`, `shiftChange.ts`.
  - Lane, size: **Feature** · **S**.

**Dependencies:** C2.3 after C1.1 (shares composition). C2.1 needs his OK on reading skip history.
**Proof on a real night:** at 06:05 in the car park, finish the shift-down bridge before you start the
car. Under two minutes = KEEP.

### Campaign 3 — Home and Family Stewardship

**When it's done.** Twelve days before Elle's birthday he sees one quiet line with his saved gift
ideas. The smoke alarm test shows up on a day off, he taps done, and the next date is set with the
evidence kept. The dogs' monthly meds are never a surprise.

**Exists now.** `homeCommands.ts`, `HomePanel.tsx` (8 presets), `peopleCommands.ts`,
`personQueries.ts`, `PersonPage.tsx`, `PeoplePanel.tsx`, recurring obligations (`engine/recurrence.ts`),
`familyCalendar.ts`, Whole Life (`ui/screens/more/WholeLifeHome.tsx`), HOME-001 and RELATIONSHIPS-001
rulings (no scores, no overdue alarms, no cadence prompts).

- **C3.1 DEEPEN · Last done and evidence.** Each Home item shows "last done Mar 3 (you), next Jun 3"
  and an optional note or photo when he marks it done.
  - Done when: "last done" derives from the previous instance's resolvedAt; note uses the existing
    resolutionNote; history list per item; no new table.
  - Builds on: `intentCommands.ts` (materializeNextOccurrence, resolutionNote), `homeCommands.ts`.
  - Lane, size: **Feature** (read + existing fields) · **S**.
  - Borrow: Grocy chores (MIT, verified; [repo](https://github.com/grocy/grocy),
    `services/ChoresService.php` period types incl. "adaptive"). Verdict COPY THE IDEA (PHP).
    Our way: port Grocy's "adaptive" period idea later as an option on the existing rrule: next date
    from his actual average gap, shown as a proposal he confirms.
- **C3.2 ADD · Lead time and "coming up".** Per item, a lead time (gifts 14 days, filters 7,
  smoke alarm 0). Inside the window, one line in Orientation's day-off view and Week Ahead with what he
  saved (gift ideas for that person).
  - Done when: lead time stored on the obligation (new optional field); at most one stewardship line a
    day; ideas come from PERSON facts; tests for window edges.
  - Builds on: `domain/intent/types.ts`, `personQueries.ts`, `weekAheadQueries.ts`.
  - Lane, size: **Protected** (new stored field; backup contract) · **M**.
  - Borrow: Monica's reminders before a date (AGPL-3.0, verified; [repo](https://github.com/monicahq/monica))
    COPY THE IDEA. Our way: no contact cadence or "last talked to" (rejected by RELATIONSHIPS-001); only
    the dates and ideas he saved, surfaced early enough to act.
- **C3.3 ADD · Day-off shape.** On RUN OVER and day-off Orientation, a rough shape he accepts,
  edits or ignores: recovery, one due house thing, an optional "something with Elle" (off by default),
  open time. Saves as plan items with plannedAt only.
  - Done when: nothing written without CONFIRM; Engine eligibility unchanged (test like
    SHIFT-SLEEP-PLAN-001's); works with no Alfred.
  - Builds on: `recoveryContract.ts`, `weekPlannerQueries.ts`, `PlanTodayScreen.tsx` (keeps Alfred as
    the optional deeper planner).
  - Lane, size: **Protected** (TODAY composition) · **M**.
  - Borrow: Sunsama's capacity line (COPY THE IDEA). Our way: show "open time" as a real block, never
    a gap to fill.
- **C3.4 EXPAND · Dog care and CO presets (Quick win Q1).** Add presets: dog flea/tick and
  heartworm monthly, vet checkup yearly, dog food reorder (his interval), CO detector test monthly.
  - Done when: presets appear in HomePanel; save as normal "Home:" recurring items.
  - Builds on: `HomePanel.tsx` HOME_PRESETS.
  - Lane, size: **Feature** · **S**.
- **C3.5 EXPAND · Seasonal packs.** Spring and fall lists (gutters, hoses, furnace start-up,
  winter car kit), added as a batch he picks from.
  - Done when: a pack offers its items with checkboxes; only ticked ones save.
  - Builds on: `HomePanel.tsx`, `homeCommands.ts`.
  - Lane, size: **Feature** · **S**.
- **C3.6 ADD · Home inventory light.** For the few things with a model, size or part number
  (filter size, detector model, battery type), a fact attached to the Home item.
  - Done when: details live in the existing HOME fact; shown on the item; searchable.
  - Builds on: HOME facts (`alfredMemory.ts` / MEMORY_RECORDED).
  - Lane, size: **Feature** · **M**.
  - Borrow: Homebox items/locations (AGPL-3.0, verified; [repo](https://github.com/sysadminsmedia/homebox))
    COPY THE IDEA. Our way: no inventory app; the "check the size on the old one" note becomes a saved
    fact the next time he replaces it.

**Dependencies:** C3.2 and C3.3 surface inside C1.2. **Proof on a real day off:** the morning after a
run, does one line tell you the single house or family thing worth doing, and nothing else? Yes = KEEP.

### Campaign 4 — Body Engine

**When it's done.** After a hard Saturday session the night plan says "protect sleep tonight". The
caffeine line knows he drinks 5-hour Energy. Once a month one honest review says what training, food
and sleep did to his numbers, with how sure it is, and suggests at most one change he can accept.

**Exists now.** `alertness.ts`, `shiftSleepPlan.ts`, `sleepDebt.ts`, `engine/sleepStreak.ts`,
`engine/progression.ts`, `engine/stall.ts`, `trainSuggestion.ts`, `expenditure.ts`,
`targetProposal.ts`, `foodSources.ts`, `pace.ts`, metric pages (`ui/metrics/MetricDetailSheet.tsx`),
Health Bridge.

- **C4.1 DEEPEN · Energy curve body-clock fix.** Place the circadian low from his actual sleep
  pattern on steady night runs (#592 finding C1; its simulation put the low at 12:30, inside day sleep).
  - **Correction (Gavin, 2026-11-24: "Lock it in"):** the research audit withdrew #592's finding. Its simulation
    left out the planned/usual sleep the production query supplies. With it, the shown low on steady nights is in
    the waking night (for example 04:30–07:30 for a 07:30–14:00 day sleep). C4.1 therefore locked that behaviour
    with a property test and changed no runtime code. The circadian anchor (1.5 h before habitual wake, which
    assumes a body clock fully adjusted to nights) stays an unvalidated assumption. Changing it (partial
    adjustment, or an off-day anchor) is a separate, owner-approved objective.
  - Done when: a property test with a 3-night synthetic run puts the low inside the waking night
    window; existing curve tests pass; copy unchanged.
  - Builds on: `application/alertness.ts` (circadian low 1.5 h before habitual wake).
  - Lane, size: **Protected** (TODAY panel guidance) · **S**. No drive-home warning: Gavin dropped it
    (2026-11-19). This only fixes the curve's shape for what already reads it.
- **C4.2 DEEPEN · Caffeine cut-off by what he drinks (Quick win Q2).** "Coffee by 23:00;
  5-hour Energy or pre-workout by 19:30" for his usual sleep, each with its source.
  - Done when: two lines replace one; the 5-hour Energy line uses the stimulant-drink evidence; tests
    cover overnight wrap; UX_DECISIONS entry amended in place.
  - Builds on: `shiftSleepPlan.ts` (`CAFFEINE_CUTOFF_HOURS`, `SOURCES.CAFFEINE`), `alertnessQueries.ts`.
  - Lane, size: **Protected** (amends locked SHIFT-SLEEP-PLAN-001) · **S**.
  - Borrow: jnaskali/caffeine-tracker (MIT, verified; [repo](https://github.com/jnaskali/caffeine-tracker))
    half-life decay. Verdict REUSE THE CODE is allowed, but it is ~10 lines; own it in the Engine.
- **C4.2a DEEPEN · Owner-editable caffeine cut-off** (added and narrowed 2026-11-20 by Gavin).
  ROUTE's CAFFEINE card retains the 6 h starting default, source explanation, CHANGE (3–12 whole hours),
  explicit SAVE and guarded UNDO. The setting and owner provenance survive native backup and schedule edits;
  TODAY's cutoff marker agrees with ROUTE. The study is general evidence, not a safe personal threshold.
  - Removed: automated DELTA suggestion, sleep-count confidence, personalized-benefit implication and suppression.
  - Deferred, separately authorized only: an explicit caffeine experiment through the existing experiment
    lifecycle, with exposure/adherence context, duration, outcomes, stopping conditions, provenance and consent.
    No larger experiment implementation starts in this PR. No generalized plan-number authority is granted.
  - Lane: **Protected** (amends SHIFT-SLEEP-PLAN-001; new stored setting). [Brief](agent/GRAYSON-C4.2a-001.md).
- **C4.3 ADD · Optional one-tap caffeine log.** Log "5-hour Energy" or "coffee" in one tap; the
  cut-off and the curve show what's still in his system; a monthly "caffeine vs your day sleep" line
  once there are 10 days with and without. This is how a healthier habit gets evidence.
  - Done when: new CAFFEINE_LOGGED event with correct/void like water; never an Engine recommendation
    input; abstains on thin data.
  - Builds on: water log pattern (`commands.ts`), `tagPatterns.ts`/`tryExperiment.ts` for the comparison.
  - Lane, size: **Protected** (new event + backup; amends the locked "caffeine never recorded") · **M**.
  - Borrow: same half-life code as C4.2. **Needs Gavin's answer (Q2 in section 7).**
- **C4.4 EXPAND · Training feeds the night (HARVEST-003 W2) and a train window.** A hard or late
  session adds "protect sleep tonight" to the plan; TRAIN shows when to train today from shift and
  sleep windows (#592's TRAIN-WINDOW-001).
  - Done when: hard = his own top-third session volume; window derives from existing windows and
    abstains without a schedule; Engine variant choice unchanged (tests).
  - Builds on: `trainHome.ts`, `shiftSleepPlan.ts`, `alertness.ts`, `performedSets`.
  - Lane, size: **Protected** (sleep-plan guidance) · **M**.
  - **Training-intelligence boundary (design only, 2026-11-20):**
    [`GRAYSON_TRAIN_INTELLIGENCE.md`](GRAYSON_TRAIN_INTELLIGENCE.md) defines the sequenced A/B/C
    Mission, calibration, exercise understanding, emphasis blocks and Progress/Direction. C4.4
    remains only the separately authorized training-to-sleep/window connection. Neither design
    silently changes Engine variant selection, programme activation or recommendation priority.
- **C4.5 ADD · Mission review (monthly).** One page: goal, what he did (training sessions, protein
  days, sleep), what moved (weight trend, strength, resting HR), how sure, and at most one change he can
  accept or skip. Excludes partly logged days from burn (#592's HONEST-BURN-001).
  - Done when: every number links to its metric page; abstains under the evidence floors; the one
    change is a card he confirms; no Engine change applies itself.
  - Builds on: `monthlyReviewQueries.ts`, `expenditure.ts`, `targetProposal.ts`, `personalRecords.ts`,
    `metricDetailQueries.ts`, missions.
  - Lane, size: **Protected** (recommendation authority for the one change; partial-day mark is a new
    event) · **L**.
  - Borrow: MacroFactor's adherence-neutral weekly check-in (COPY THE IDEA). Our way: "hold" is a valid
    outcome when evidence is thin, and the proposal is the existing TARGET-PROPOSAL card.
    simple-statistics (ISC, verified; [repo](https://github.com/simple-statistics/simple-statistics))
    REUSE THE CODE optional; the Welch helpers in `tryExperiment.ts` may already suffice.
- **C4.6 ADD · Water target.** An owner-set daily target with the existing pace line.
  - Done when: target in `nutritionTargets`; pace reads it; no default nag.
  - Builds on: `pace.ts`, `nutritionTargetCommands.ts`.
  - Lane, size: **Protected** (schema) · **S**.
- **C4.7 EXPAND · Watch workouts and weight from Health Connect.** Read ExerciseSessionRecord
  and WeightRecord so watch-recorded walks and scale weights arrive with source tags; owner entries win.
  - Done when: Bridge requests two more read permissions; imports follow GARMIN-003 owner-wins; no
    Body Battery/HRV/sleep score.
  - Builds on: `android/health-bridge` (SleepExport/ActivityExport pattern), `healthSync.ts`,
    `externalActivityCommands.ts`.
  - Lane, size: **Protected** (new Health Connect permissions, import contract) · **M**.
  - Borrow: Health Connect record types (official,
    [docs](https://developer.android.com/health-and-fitness/health-connect/data-types)) REUSE THE
    SCHEMA as the field map. Gadgetbridge (AGPL-3.0, verified) COPY THE IDEA only.
- **C4.8 ADD · Optional fasting window.** A start/stop eating window evaluated against protein,
  mood and training, never as a duration contest.
  - Done when: off by default; window events; review shows protein and training on fasting days vs not.
  - Builds on: meal events, `tryExperiment.ts`.
  - Lane, size: **Protected** (new event; vision says fasting needs separate approval) · **M**.
  - Borrow: Zero/Fastic window timers (COPY THE IDEA). Our way: no streaks, no "longest fast"; it's an
    experiment in the existing Try loop. **Needs Gavin's answer (Q3).**

#### Integrated Health Mission overlay

The owner-authorized design candidate
[`GRAYSON_INTEGRATED_HEALTH_MISSION.md`](GRAYSON_INTEGRATED_HEALTH_MISSION.md) composes this campaign
with current TRAIN, Body, Food Week, Eating Window, Missions and lived context. It does not create a
competing campaign or change C4 priorities by itself.

- **C4.4** remains the boundary for training effects on night guidance. The Mission design may select
  normal/reduced/home/minimum/recovery variants, but it cannot add sleep-plan guidance silently.
- **C4.5** remains the future cross-domain review authority. The Mission design supplies its health
  phase, evidence coverage, performance-standard and one-change contract rather than proposing a
  second review system.
- Existing fixed A/B/C and progression remain available. The first recommended health slice is an
  inspectable three-session custom-template draft with no writes; plan creation, programme assignment,
  Mission linkage and recommendation changes remain later Protected decisions. Programme assignment
  is information only today; a separate Protected Mission-plan activation/template-selection ruling
  is required before a custom plan can become TRAIN’s recommendation.
- Performance standards are four provenance-labeled tracks, not a new readiness score or a shortcut
  from machine/Smith pressing to a free-weight bench pass.
- The run track uses NHS Couch to 5K as a shift-aware endurance foundation, then transitions to a
  separate 1.5-mile-specific phase. The generic nine-week calendar and three-run load are adjustable
  around the concurrent three-session strength plan; no missed-run catch-up or universal 10% rule.

Also considered: free-exercise-db (Unlicense, verified; [repo](https://github.com/yuhonas/free-exercise-db),
`dist/exercises.json` + images) REUSE THE CODE (data) to enrich the 60-entry exercise library and a
later muscle map. Prior ruling said "don't bulk-import"; that needs Gavin's amendment, so it's parked.

**Dependencies:** C4.3 after C4.2; C4.5 after C4.4 and C6.1. **Proof on a real night:** before your
first 5-hour Energy, does the cut-off line tell you the latest time for *that* drink? Yes = KEEP.

### Campaign 5 — Inner Day

**When it's done.** After a rough night he taps "flat" and "help me decide" instead of five sliders;
Delta answers in two lines. After several hard days in a row it offers the minimum-day plan once,
calmly, and never diagnoses.

**Exists now.** Check-in (`CheckInSheet.tsx`, `checkInFields.ts`, `engine/capacity.ts` locked),
Minimum Day, journal, Daily Note, quit tracker, personal context, difficult-day doctrine.

- **C5.1 ADD · Feeling word (optional).** After the numbers, one optional word from a short grid
  (calm, flat, wired, irritable, heavy, good, proud…) and "what's behind it" chips (sleep, work,
  home, body, nothing).
  - Done when: stored on the check-in as optional fields; never read by `capacity.ts`; skipping keeps
    today's two-tap check-in.
  - Builds on: `CheckInSheet.tsx`, STATE_CHECKED_IN payload.
  - Lane, size: **Protected** (check-in event shape, backup, sensitive data) · **M**.
  - Borrow: How We Feel's mood meter vocabulary (COPY THE IDEA). Our way: a small word list sized for a
    tired thumb, in BEYOND's palette, not colour-coded quadrants.
- **C5.2 ADD · Help mode.** "Just listen / Help me understand / Help me decide / Minimum version"
  on the check-in and in Alfred; it sets Delta's response style for that day.
  - Done when: choice changes Alfred's system prompt for the day and Orientation's tone; no write
    beyond the check-in field.
  - Builds on: `alfredClient.ts` PERSONA, `operatorContext.ts`.
  - Lane, size: **Protected** (Alfred behaviour) · **S**.
- **C5.3 ADD · Shorter reality path.** When several recent check-ins are hard (rule in the brief,
  his own range), Orientation offers Minimum Day once with "this is a pattern, not a verdict". Saying
  "I can't manage the plan" reduces at once.
  - Done when: deterministic rule with a floor; offered at most once per stretch; never an Engine
    priority change without approval; copy reviewed against wellbeing rules.
  - Builds on: `MinimumDaySection.tsx`, `needle.ts`, check-in history.
  - Lane, size: **Protected** (recommendation-adjacent, sensitive) · **M**.
- **C5.4 ADD · Pattern review (monthly, private).** Words and contexts over the month, with sleep
  and run position, only when there are enough entries.
  - Done when: abstains under a floor; never names a condition; Alfred sees it only with personal opt-in.
  - Builds on: `wholePictureQueries.ts`, `tagPatterns.ts`, `deltaFacts.ts` opt-in.
  - Lane, size: **Protected** (sensitive data use) · **M**.
  - Borrow: Daylio/Bearable "mood vs factors" (COPY THE IDEA). Our way: counts with sample sizes from
    Whole Picture rows, "can't tell yet" when thin.
- **C5.5 ADD · Sensitive-data controls.** One screen: which inner-day data Alfred may read, which
  stays out of backups-to-cloud, and delete-all for a category.
  - Done when: per-category switches enforced in `operatorContext.ts`; Drive backup option to exclude.
  - Builds on: `operatorContext.ts`, `driveBackupService.ts`.
  - Lane, size: **Protected** (privacy, backup contract) · **L**.

**Dependencies:** C5.3 after C1.2. **Proof on a real night:** after a hard shift, could you check in and
say what kind of help you want in under 20 seconds? Yes = KEEP.

### Campaign 6 — Delta Intelligence and Memory

**When it's done.** Once a week Delta says "Here's what I think I'm learning: you sleep about 40 min
longer after rest days (fairly sure, 9 vs 8 nights). Keep, narrow, or drop?" He taps narrow. When he
overrides a suggestion, Delta asks once what it missed, and remembers.

**Exists now.** `delta.ts` (notebook), `deltaFacts.ts`, `memory.ts` (MEMORY_RECORDED, ACTIVE /
IRRELEVANT), `alfredMemory.ts` (legacy store), `remember.ts`, `reflect.ts`, `tagPatterns.ts`,
`tryExperiment.ts`, `askProjection.ts`, `coachCards.ts`, `PersonalUnderstanding.tsx`.

- **C6.1 DEEPEN · Learning lifecycle.** Give learnings the vision's states: observed, hypothesized,
  provisional, confirmed, context-specific, contested, outdated, retired, each with source, dates,
  confidence and sample size.
  - Done when: states are MEMORY_RECORDED actions (no new table); `delta.ts` learnings map onto them;
    retired never reaches Alfred context; tests per transition.
  - Builds on: `memory.ts`, `delta.ts`, `MemoryPanel.tsx`.
  - Lane, size: **Protected** (correction model, event semantics) · **L**.
- **C6.2 ADD · "What I think I'm learning" weekly.** Up to three learnings with Keep / Narrow /
  Drop, surfaced in the weekly interview.
  - Done when: each tap is a lifecycle action; at most three a week; nothing shown under the floor.
  - Builds on: C6.1, `weeklyInterview.ts`.
  - Lane, size: **Protected** (proactive observation cadence, open vision decision) · **M**.
  - Borrow: ts-fsrs (MIT, verified; [repo](https://github.com/open-spaced-repetition/ts-fsrs),
    `fsrs()`, `scheduler.next`) REUSE THE CODE to space when a confirmed learning is re-checked, so
    stable ones come up rarely. Pure TS; fits the Engine. New dependency.
- **C6.3 EXPAND · What moves your numbers.** Extend tag patterns to habits, workouts, caffeine and
  check-in words against next main sleep, energy and resting HR, after 5 days with and 5 without.
  - Done when: reads Whole Picture rows; Welch interval from `tryExperiment.ts`; "can't tell yet";
    read-only, never advice.
  - Builds on: `tagPatterns.ts`, `tryExperiment.ts`, `wholePictureQueries.ts`.
  - Lane, size: **Feature** (read-only; HARVEST-003 S3 said no approval needed if read-only) · **M**.
  - Borrow: WHOOP Journal Impacts and Exist.io correlations (COPY THE IDEA). Our way: same 5/5 floor,
    next-day effects, sample sizes visible, appears in DATA and in C6.2.
- **C6.4 EXPAND · "Why am I seeing this?" everywhere.** One shared disclosure on every Delta line:
  the rule, the records, the dates.
  - Done when: `WhyDisclosure.tsx` used by Orientation, advisory, coach cards; links to records.
  - Builds on: `ui/components/WhyDisclosure.tsx`, DecisionTrace.
  - Lane, size: **Feature** · **S**.
- **C6.5 ADD · Override as evidence.** When he declines, one optional "what did I miss?" chip set;
  repeated reasons become an observed learning he can confirm.
  - Done when: reasons already saved by `reflect.ts` feed C6.1 as observed; nothing changes the Engine.
  - Builds on: `reflect.ts`, C6.1.
  - Lane, size: **Protected** (learning semantics) · **M**.
- **C6.6 ADD · Earned challenge ladder.** For a repeated miss: ask → name the pattern → challenge
  with evidence → examine the plan. Never more than the evidence allows.
  - Done when: deterministic stages with floors; copy reviewed against "challenge the plan before the
    person"; off switch.
  - Builds on: `continuity.ts`, `coachCards.ts`, journal follow-ups.
  - Lane, size: **Protected** (recommendation priority, user wellbeing) · **L**.
- **C6.7 DEEPEN · One memory store.** Finish moving legacy `alfredMemories` into MEMORY_RECORDED,
  each conversion confirmed, so Delta has one memory.
  - Done when: no unconverted rows after his review; backup round-trip test.
  - Builds on: `alfredMemory.ts`, `AlfredMemoryList.tsx`.
  - Lane, size: **Protected** (data migration) · **M**.

Not borrowed: Khoj (AGPL-3.0), Open WebUI (branding-restricted), Logseq (AGPL-3.0), Anytype
(source-available) — architecture ideas only; GRAYSON is not a chat workbench.

**Dependencies:** C6.2 and C6.5 after C6.1; C6.6 last. **Proof on a real night:** on Sunday's weekly
look, did each learning make sense and did one tap settle it? Yes = KEEP.

### Campaign 7 — Capture, Voice and Attention

**When it's done.** He can say "remind me to call the vet Monday" from TODAY, the widget or the car,
and it's a proposal card. The phone buzzes only for the few moments he chose, and the plan stays fresh
without him tapping SYNC GARMIN.

**Exists now.** `FastCapture.tsx`, `captureIntelligence.ts`, `freeHelper.ts`, Web Speech in
`DriveHome.tsx` and `AlfredSheet.tsx`, `bridgePlan.ts` (3/day, quiet hours), `keyMomentAlerts.ts`,
`MomentAlerts.kt`, `BackgroundSync.kt` (every 3 h), MiniSearch installed.

- **C7.1 EXPAND · Voice into capture everywhere.** A mic on FastCapture and the check-in that
  feeds the free helper's cards.
  - Done when: same Web Speech path as DriveHome; falls back to typing; nothing saves without confirm
    unless it's an immediate-undo kind.
  - Builds on: `DriveHome.tsx`, `freeHelper.ts`, `alfredAct.ts`.
  - Lane, size: **Feature** · **S**.
  - Borrow (later, offline): Transformers.js Whisper (Apache-2.0, verified;
    [repo](https://github.com/huggingface/transformers.js), `pipeline('automatic-speech-recognition')`)
    REUSE THE CODE if Web Speech fails offline on his phone; model weights checked per model; new
    dependency and large download, so Protected.
- **C7.2 DEEPEN · Plan stays fresh.** The bridge's 3-hour background job re-arms moments from the
  last plan BEYOND sent whenever BEYOND opens, not only on SYNC GARMIN.
  - Done when: opening BEYOND hands the plan to the Bridge silently where Android allows; stale plan
    age shown in KEY MOMENT ALERTS.
  - Builds on: `bridgePlan.ts` helperSyncUrl, `MomentAlerts.kt`, `ReminderAlertLine.tsx`.
  - Lane, size: **Protected** (notification delivery) · **M** (A: Android intent limits need a spike).
- **C7.3 ADD · New moment kinds.** Caffeine cut-off, plan to confirm, and stewardship lead time,
  inside the 3-a-day cap and its priority order.
  - Done when: each kind has an off switch; cap and quiet hours unchanged; tests for priority.
  - Builds on: `bridgePlan.ts`, `keyMomentAlerts.ts`.
  - Lane, size: **Protected** (new alert kinds, per BRIDGE-NOTIFY-001) · **M**.
  - Borrow: Capacitor local-notifications (MIT, verified;
    [repo](https://github.com/ionic-team/capacitor-local-notifications)) REUSE THE CODE only if the
    Bridge path can't deliver; a native shell is a large Protected change. Prefer the Bridge.
- **C7.4 EXPAND · Widget quick actions.** The Bridge widget adds CAPTURE and WATER buttons that open
  BEYOND at the right sheet.
  - Done when: two buttons deep-link to existing `beyond:open-record` routes.
  - Builds on: Bridge widget, App shortcuts.
  - Lane, size: **Feature** (Android) · **M**.
- **C7.5 ADD · Lock-screen workout (HARVEST-003 later).** Ongoing notification with current set and
  rest timer during a live workout.
  - Done when: starts and ends with the workout; set done from the notification logs through the
    existing command.
  - Builds on: `GymMode.tsx`, Bridge.
  - Lane, size: **Protected** (new notification, two-way) · **L**.
- **C7.6 DEEPEN · Search on MiniSearch.** Use the approved MiniSearch for ranked, fuzzy search with
  tap-to-open.
  - Done when: index derives from Dexie, never canonical; tap opens the record.
  - Builds on: `searchQueries.ts`, `SearchScreen.tsx`.
  - Lane, size: **Feature** · **L** (A: check how much is already wired).
  - Borrow: Memos quick-capture and tag UI (MIT, verified; [repo](https://github.com/usememos/memos),
    `web/`) REUSE THE CODE for small pieces only; BEYOND's capture already fits.

**Dependencies:** C7.3 serves C4.2, C3.2. **Proof on a real night:** did the phone buzz only for what
you chose today, and was none of it stale? Yes = KEEP.

### Campaign 8 — Data You Own

**When it's done.** A new phone gets everything back from one backup, settings included, and the
monthly restore check says so in a line.

**Exists now.** `persistence/backup.ts`, `restore.ts`, `autoBackup.ts`, `driveBackup/*` (AES-GCM),
`recordsExport.ts`, monthly restore check.

- **C8.1 DEEPEN · Settings travel with the backup.** Non-secret preferences (Alfred monthly cap,
  automatic Alfred, reminders, rest timers, hidden features, vision mode) export and restore; keys and
  tokens stay out.
  - Done when: an allowlist of keys round-trips in a test; secrets list stays phone-local.
  - Builds on: `backup.ts`, `restore.ts`.
  - Lane, size: **Protected** (backup contract) · **S**. Quick win Q6.
- **C8.2 DEEPEN · Restore drill.** A guided "would a new phone get it all?" check that restores into a
  scratch database and compares counts.
  - Done when: runs offline; reports per-table counts; deletes the scratch copy.
  - Builds on: monthly restore check (`autoBackupQueries.ts`).
  - Lane, size: **Feature** · **S**.
- **C8.3 EXPAND · Export everything readable.** CSV export adds sleep, check-ins, journal, home and
  people.
  - Done when: each new file opens in Sheets; corrections applied; sensitive categories opt-in.
  - Builds on: `recordsExport.ts`.
  - Lane, size: **Feature** · **M**.
- **C8.4 ADD (deferred) · Second-device sync.** Only if he gets a tablet or wants Elle-shared lists:
  row-level sync through his own Drive.
  - Done when: (later) conflicts resolve last-write-wins per field with history kept.
  - Builds on: Dexie events, Drive backup.
  - Lane, size: **Protected** (architecture, dependency) · **L**.
  - Borrow: Actual Budget CRDT (MIT, verified; [repo](https://github.com/actualbudget/actual),
    `packages/crdt/src/crdt/timestamp.ts` + `merkle.ts`) REUSE THE CODE (vendor two files). Rejected:
    Yjs/Automerge (MIT, but document model fights Dexie rows), Dexie Cloud (paid service).

**Proof:** after a backup, does the restore drill say every table came back? Yes = KEEP.

### Campaign 9 — Craft and Identity

**When it's done.** The app feels like one calm instrument. The navigation fits the day he actually
lives. Then, and only then, it says GRAYSON and Delta speaks.

**Exists now.** `ui/foundation/*`, `Section.tsx`, sheets foundation, Quiet Command direction (#591),
vision modes (`ui/vision/`), Emblem, TODAY-SPLIT-002 brief.

- **C9.1 DEEPEN · TodayScreen split (TODAY-SPLIT-002).** Finish the smaller first slice (toasts),
  then the rest, so Orientation and close can grow safely.
  - Done when: per the existing brief; no behaviour change.
  - Lane, size: **Feature** · **M**.
- **C9.2 DEEPEN · Quiet Command finish.** Apply the Orientation visual grammar to TRAIN home and
  DATA home.
  - Done when: per-screen visual review at 360 px; tokens only.
  - Lane, size: **Protected** (locked visual identity) · **M** per screen.
- **C9.3 ADD · Navigation study.** After C1 and C2 ship, compare today's tabs with the lived journeys.
  Report only.
  - Lane, size: **Feature** (report) · **S**.
  - Borrow: Things and Linear Mobile hierarchy (COPY THE IDEA). Our way: test the journeys on his phone
    against today's tabs before proposing any change.
- **C9.4 ADD · Accessibility and motion pass.** axe checks on new screens; reduced motion; large text.
  - Builds on: axe-core (already a dev dependency).
  - Lane, size: **Feature** · **L** across the app.
  - Borrow: Radix Dialog (MIT, verified) REUSE THE CODE only if a sheet's focus handling fails review;
    Motion (MIT) and Vaul (unmaintained per its README) not needed.
- **C9.5 ADD · BEYOND → GRAYSON, Alfred → Delta.** Rename in the running app once Delta's behaviour
  (C6.1–C6.2) earns it. Legal/trademark check first.
  - Lane, size: **Protected** (identity, governance) · **L**.

**Proof:** hand the phone to someone for 30 seconds on TODAY: can they say what kind of day it is?
Yes = KEEP.

---

## 5. Campaign order, quick wins and build cost

### Order and why

1. **Daily Loop** — it happens every day, it's where Delta's relationship starts, and every later
   campaign surfaces through it.
2. **Shift Transitions** — BEYOND's most distinctive strength; finishes the work → home half of the loop.
3. **Home and Family Stewardship** — what makes it a Life OS, not a shift app; small items, high
   personal value; surfaces inside C1.2.
4. **Body Engine** — deep already; connecting it pays off once the loop shows it.
5. **Inner Day** — important and sensitive; needs the loop's calm surface first.
6. **Delta Intelligence and Memory** — learns best once the loops create corrections and outcomes.
7. **Capture, Voice and Attention** — runs alongside; C7.1 and C7.2 early, new alert kinds when C3/C4 need them.
8. **Data You Own** — runs alongside; C8.1 early.
9. **Craft and Identity** — C9.1 early as enabling work; rename last.

### Quick wins (each one S build, visible value)

Status for each quick win lives in the progress tracker.

| # | Item | Why it's worth it now | Lane |
|---|---|---|---|
| Q1 | Dog care and CO detector presets (C3.4) | The dogs and detectors are in his own Grayson picture | Feature |
| Q2 | Caffeine cut-off for 5-hour Energy (C4.2) | His stated habit change; one honest line | Protected (locked rule) |
| Q3 | Finish workouts on the metric page (PR #584: resolve the checkpoint conflict) | Built already; only the conflict and review remain | Feature |
| Q4 | "Tomorrow differs" line (C1.4) | Ends the day with what's next | Feature |
| Q5 | BODY protein tap (roadmap Next #2) | Already leaned yes | Feature |
| Q6 | Settings in the backup (C8.1) | Closes a quiet data-loss gap | Protected (backup) |
| Q7 | Last done on Home items (C3.1) | Turns Home into evidence | Feature |
| Q8 | Two-tap run debrief (C2.5) | Uses existing reflect path | Feature |

### Build cost by campaign (rough)

| Campaign | S | M | L | Builds | Needs a new dependency or provider? |
|---|---|---|---|---|---|
| 1 Daily Loop | 1 | 3 | 2 | 6 | No |
| 2 Shift Transitions | 2 | 4 | 0 | 6 | No |
| 3 Stewardship | 3 | 3 | 0 | 6 | No |
| 4 Body Engine | 3 | 4 | 1 | 8 | Optional (simple-statistics); Health Connect permissions |
| 5 Inner Day | 1 | 3 | 1 | 5 | No |
| 6 Delta | 1 | 4 | 2 | 7 | Yes if ts-fsrs is used |
| 7 Capture/Attention | 1 | 3 | 2 | 6 | Optional (Transformers.js, Capacitor) |
| 8 Data You Own | 2 | 1 | 1 | 4 | Yes for C8.4 only (vendored CRDT) |
| 9 Craft/Identity | 1 | 2 | 2 | 5 | No |
| **Total** | **15** | **27** | **11** | **53** | |

C1.6 and C9.2 are counted once though they repeat per screen. Every new dependency, provider or Health
Connect permission is Protected and waits for Gavin.

### Proof on real nights (KEEP / REFINE / RETHINK)

| Campaign | Check, under a minute |
|---|---|
| 1 | On a work wake: sleep, which night, one thing, without scrolling |
| 2 | At 06:05: shift-down bridge done before the car is warm |
| 3 | Day after a run: one house or family line, nothing else |
| 4 | Before a 5-hour Energy: the line names the latest time for that drink |
| 5 | After a hard shift: check in and pick a help mode in 20 seconds |
| 6 | Sunday: each learning makes sense; one tap settles it |
| 7 | Phone buzzed only for what you chose, nothing stale |
| 8 | Restore drill: every table back |
| 9 | Someone else can tell what kind of day it is in 30 seconds |

---

## 6. First objective (Campaign 1) — mission brief

### LIVED-DAY-ORIENT-PRODUCTION-001, slice 1: the work-night wake

Gavin is holding production Orientation to avoid wasted usage. This slice is the smallest version
that is still the real thing: one context (workday), reusing PR #589's reviewed layout, so it is an M
build rather than the full L. A 10-minute phone look at #589 first costs no build usage and tells us
whether the layout is right before anything is built.

- **What he'd experience.** On a work-run day, the deliberate START DAY opens one screen: how he
  slept (Garmin, against his usual), which night of the run and when he's on, whether he's checked in,
  the Engine's one recommendation or its draft (or none), at most two actions (check in, capture or
  prep), and RELEASE to TODAY. He can leave at once and reopen it from TODAY.
- **Why now.** It happens every work day, it's the first thing he described for Grayson, and it
  connects ten things BEYOND already does without inventing any. Closure, the home moment and the
  day-off shape all reuse its grammar.
- **Grayson step.** Campaign 1 · Daily Life Loop: Wake · canonical scenario 1.
- **Scope.** Workday only (WORK_RUN and FLIP into work). Sparse, unknown-context and failed-source
  states. Deterministic Delta copy. Existing commands for every write.
- **Exclusions.** No day-off, recovery or difficult-day variant (slice 2). No new Engine rule,
  recommendation priority, schema, event, notification, provider, dependency or AI call on open. No
  inferred mood or capacity. No navigation change, rename or removal of any TODAY capability.
- **Done criteria.**
  1. Workday, sparse, unknown and failed-source states render at 320/360/412 px with visual evidence.
  2. Tests prove at most one recommendation, at most two actions, no hidden write, and that the
     recommendation is the Engine's or the draft's unchanged.
  3. Exit, reopen and interrupt/resume keep his place.
  4. Every line has a source tag; nothing unknown shows as free time.
  5. Independent exact-head review, green CI, and Gavin's phone look on a real work wake.
- **Lane.** Protected (TODAY composition; recommendation presentation). **Size** M.
- **Leverage disposition.** REUSE: #589 layout, `todayPicture.ts`, `recommendationDraftQueries.ts`,
  `workContextResolution.ts`, `CheckInSheet.tsx`, `FastCapture.tsx`, foundation primitives. OWN: the
  workday selection, Quiet Command copy, state handling. BUILD FROM SCRATCH: none.

---

## 7. Killed ideas and why

| Idea | Why it's out |
|---|---|
| A life, readiness or "Grayson score" | Vision anti-goal; hides evidence behind one number |
| Streaks, badges, "missed" counts | Vision anti-goal; ROUTINES-001 and HABIT rules forbid guilt mechanics |
| Meal photo logging (HARVEST-003 S2) | Gavin's BEYOND-4.0 decision 4: progress photos only, no food photos |
| Importing Body Battery, HRV, sleep scores | HARVEST-003 already-rejected list; opaque vendor scores |
| Mood, stress or capacity inferred from biometrics | LIVED-DAY-ORIENT-REFINE-001; Doctrine |
| Diagnosis or crisis handling inside a feature | Vision: not a diagnosis engine; crisis needs its own safety-reviewed objective |
| Autonomous re-planning or moving his commitments | 4.0-c is explicitly not autonomous; owner keeps the final say |
| A general chatbot or agent platform (Khoj, Open WebUI) | "Not a chatbot attached to a productivity app"; AGPL/branding limits |
| Relationship scoring, "you haven't called" prompts (Monica-style cadence) | RELATIONSHIPS-001 |
| Home ERP / pantry stock (Grocy stock, Homebox inventory) | CAPABILITY_MAP out-of-scope list |
| Dexie Cloud | Paid sync service; not an approved provider |
| Yjs / Automerge document sync | Document model fights Dexie's row-and-event model |
| Embedding Gadgetbridge or copying AGPL code (wger, Monica, Homebox, Logseq) | License |
| Finance as a campaign | Decision Register 2026-10-27: finances tracked outside BEYOND. **Conflict noted:** the vision says finances "may join later". Kept out until Gavin decides. |
| A drive-home drowsiness warning | Gavin isn't concerned with it (2026-11-19); Drive Home stays as the existing voice log |
| Vector/RAG memory | CAPABILITY_MAP: rejected until lexical search fails |

---

## 8. Open questions for Gavin (multiple choice)

1. **Where to start?** A) quick wins Q1–Q3 this week, then Orientation slice 1 · B) Orientation slice 1
   now · C) shift-down bridge (C2.2) first.
2. **Caffeine.** A) better cut-off per drink only (C4.2) · B) also a one-tap caffeine log so we can see
   what it does to your day sleep (C4.3, changes the "never recorded" rule) · C) leave caffeine alone.
3. **Fasting.** A) add the optional fasting window (C4.8) · B) not now · C) never.
4. **Watch data.** A) also import watch workouts and scale weight from Health Connect (C4.7) · B) not now.
5. **Elle on days off.** A) only her dates and the shared calendar, as now · B) add an opt-in "something
   with Elle" line in the day-off shape (C3.3) · C) B, plus shared lists with her later (needs sync).

---

## Sources and verification

- **Repository** (master `211ccf4`): files named in each row were read or searched this session;
  marks **A** need a check before a brief relies on them. PR #592's report (branch
  `claude/project-thread-exirjg`) was read for C1 curve, shift-down bridge, caffeine, day-off shape,
  honest burn and train window; it remains an unmerged report.
- **Licenses** (read from each official repo's LICENSE file on 2026-11-20): Grocy MIT; Homebox AGPL-3.0;
  Monica AGPL-3.0; wger AGPL-3.0-or-later; free-exercise-db Unlicense; Memos MIT; ActivityWatch MPL-2.0;
  Home Assistant frontend Apache-2.0; simple-statistics ISC; ts-fsrs MIT; Actual Budget MIT; Yjs MIT;
  Automerge MIT; dexie-cloud-addon Apache-2.0 (service commercial,
  [pricing](https://dexie.org/cloud/pricing)); Transformers.js Apache-2.0; whisper.cpp MIT; Workbox MIT;
  Capacitor and local-notifications MIT; typage BSD-3-Clause; Radix MIT; Vaul MIT (README: unmaintained);
  Motion MIT; Tiptap MIT; Lexical MIT; Logseq AGPL-3.0; Anytype Any Source Available 1.0; Nomie 6 MIT;
  Gadgetbridge AGPL-3.0 ([Codeberg](https://codeberg.org/freeyourgadget/gadgetbridge));
  jnaskali/caffeine-tracker MIT; Arcascope circadian MIT vs Apache-2.0 (unresolved).
- **Health Connect** record types: [developer.android.com](https://developer.android.com/health-and-fitness/health-connect/data-types).
- **Commercial products** (Flighty, Apple Weather, Sunsama, Linear, Things, Gentler Streak, How We Feel,
  MacroFactor, WHOOP, Exist.io, Timeshifter, Rise, Daylio, Bearable, Zero, Headspace) are idea donors
  only, from #591 and HARVEST-003's cited official pages; no code, assets or identity are reused.
- **Not verified:** the exact behaviour of the Bridge widget; whether Android allows a silent plan
  hand-off on open (C7.2); how much of MiniSearch is already wired (C7.6). Each is flagged in its item.
