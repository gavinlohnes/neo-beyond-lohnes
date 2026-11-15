# BEYOND — Repository Audit (15 November 2026)

**Audience:** Gavin, the product owner, and any AI assistant he hands this to. Written for a non-technical reader.
**Scope:** the whole `gavinlohnes/neo-beyond-lohnes` repository at master `b4739464` (after PR #539).
**Method:** reading the code, the tests, the build and CI setup, the Android helper and the planning documents,
plus measurements (file counts, sizes, imports, open pull requests). No code was changed.
**Honesty note:** this is a whole-product overview. I did not read every one of the ~1,100 source and test files line by
line. Where a statement is a judgement rather than a measured fact, it says so.

A companion file, [`AI-HANDOFF.md`](AI-HANDOFF.md), is the short, durable briefing for future AI assistants.

---

## 1. Executive summary

### What BEYOND does today

BEYOND is a **private personal operating system on your phone**, built around the reality of a rotating shift
worker. It is a web app installed like a normal app (a "PWA"), and everything it knows lives **on the phone**, not on a
company server. Each day it:

- **Tracks what actually happened:** check-ins (energy, stress, mood, soreness, urges), sleep, water, food and
  protein, weight, workouts, habits, tasks, notes, and your work shifts.
- **Reads your Garmin watch** through a small companion Android app (the *Health Bridge*): sleep and sleep stages,
  steps, heart rate, resting heart rate and calories burned.
- **Gives one recommendation at a time** from a rule engine you can inspect ("why this?"), never a black box.
- **Plans around your shifts:** it knows a "day" runs from 16:30 to 16:30 (the *lived day*), knows the work run you're
  in, and plans sleep, food and recovery around it.
- **Coaches training:** workouts from your programme, set logging, warm-ups, effort, records and progression advice.
- **Has Alfred**, an assistant powered by Anthropic's Claude, who answers from your own records and proposes entries as
  cards you confirm. A **free helper** handles simple requests with no AI cost.
- **Reviews your life:** weekly check-in, metric pages (day, week, month, year), "your usual" ranges, 90-day directions,
  where your calories came from, and a weekly calorie proposal.

### Maturity

**Advanced personal product, beyond prototype, not a commercial product.** Concretely:

- About **63,000 lines of app code** and **~526 automated test files** (282 logic tests, 244 real-browser tests). The
  full suite runs on every pull request in four parallel parts.
- Over **530 pull requests** merged in roughly three months of intense development, guided by a very detailed set of
  product rules.
- It is **designed for one person**, Gavin. There are no accounts, no multi-user support and no app-store distribution.
  It's deployed to GitHub Pages and installed on his phone.
- The main remaining gap is **real-world proof**. The roadmap's own gate for "3.0" is Gavin driving it through a full
  work run and day off on his phone; tests can't replace that.

### Overall architecture, in one picture

```
Garmin watch ──► Health Connect ──► BEYOND Health Bridge (Android app) ──► file / share ──► BEYOND
                                                                                            │
 You ──► screens (TODAY · TRAIN · LOG · DATA · MORE) ──► "commands" (each action you take)  │
                                                         │                                  ▼
                                    records every action as an event ──► on-phone database (IndexedDB)
                                                                                            │
         rule engine (deterministic, explainable) ◄── "queries" (read and combine the events)
                 │
                 └─► one recommendation, usual ranges, plans, proposals
 Alfred (Claude, optional online) ─► reads your records ─► proposes cards ─► you confirm ─► a normal command
```

The key design idea is **event sourcing**: BEYOND never overwrites what happened. A correction is a new fact that says
"this replaces that", so history always shows the original and the fix.

---

## 2. Repository map

### Top-level folders

| Folder | What it is | Size |
|---|---|---|
| `src/` | The app itself (TypeScript and React) | ~590 files, ~63k lines |
| `tests/` | Automated tests: logic (`*.test.ts`) and real-browser (`tests/browser/`) | ~544 files |
| `docs/` | Product rules, decisions, briefs, roadmaps, screenshots | ~960 files |
| `android/health-bridge/` | The small Android app that reads Garmin data from Health Connect | ~30 files (Kotlin) |
| `scripts/` | Checks (architecture, risk lane), screenshot/verification scripts, legacy "factory" automation | 31 files |
| `prototype/` | Static design prototypes (command centre, launch vision, redesign, suit-alive, whole picture) | 12 files |
| `test-fixtures/protected/` | **Real historical backups**, used to prove old data still restores. Never edited. | 3 files |
| `.github/workflows/` | CI: PR verification, GitHub Pages deploy, Health Bridge builds | 5 files |
| `.claude/`, `.agents/` | Instructions and skills for AI builders (Claude Code, Codex) | small |

### Inside `src/`: the layers

| Layer | Plain-English job | Size |
|---|---|---|
| `src/domain/` | The **vocabulary**: what a day, a meal, a workout or an event *is* | 30 files, 2.8k lines |
| `src/engine/` | The **rule brain**: pure calculations (capacity GREEN/YELLOW/RED, the recommendation, progression, schedule prediction, the day ledger, expenditure). Same input, same answer, always. | 39 files, 4.3k lines |
| `src/persistence/` | The **filing cabinet**: the on-phone database (schema version 26, 36 tables), backup, restore, old-format import | 24 files, 2k lines |
| `src/application/` | The **clerks**: one "command" per action you take, and "queries" that read and combine records. The only layer allowed to touch the database. Alfred and the free helper live here too. | 191 files, 19.7k lines |
| `src/ui/` | The **screens and components** you see | 254 files, 35k lines |
| `src/app/` | The shell: tabs, navigation, sheets, start-up | 3 files, 0.9k lines |

A checker (`npm run check:architecture`) runs in CI and enforces these boundaries: the screens can't reach into the
database directly, and the rule brain can't depend on storage.

### The most important files

| File | Why it matters |
|---|---|
| `AGENTS.md` (and `CLAUDE.md`) | The front door for every AI builder: rules, authority order, what needs approval |
| `docs/OPERATOR_INTERFACE_DOCTRINE.md` | The **constitution**: what BEYOND is allowed to mean (one recommendation, no guilt, user authority) |
| `docs/UX_DECISIONS.md` | The **decision register**: every locked product ruling (3,300 lines) |
| `docs/PRODUCT_DIRECTION.md` | Gavin's vision and creative approach; Alfred's rules |
| `docs/agent/DEV-FLOW-002.md` | How work gets done: one objective, PR, review for protected work, Gavin merges |
| `docs/agent/CURRENT_CHECKPOINT.md` | The live handoff note: what's in flight |
| `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` | Engineering invariants that must never break |
| `docs/agent/CAPABILITY_MAP.md` | Index of existing capabilities, so nobody rebuilds what exists |
| `docs/ROADMAP_1.0.md` | Build history and queue (partly stale; see §4) |
| `src/persistence/db.ts` | The database schema and its 26 versions of migrations |
| `src/domain/common/types.ts` | ~96 event types: the vocabulary of everything that can happen |
| `src/application/commands.ts`, `queries.ts` | The core actions and reads |
| `src/engine/evaluate.ts`, `capacity.ts`, `dayLedger.ts` | The recommendation and the day's ledger |
| `src/ui/screens/today/TodayScreen.tsx` | TODAY: the home screen, and the largest file (3,500 lines) |
| `src/application/alfred/` | Alfred: context, tools, proposals, memory, cost |
| `src/application/helper/freeHelper.ts` | The free (no-AI) helper's plain-language parser |

### What each system is responsible for

- **TODAY:** the day's mode (on shift, off duty), the shift clock and timeline, COMMS line, the next step, at-a-glance
  numbers, life links, Alfred's or the free brief, check-in, reminders, preparation for work.
- **TRAIN:** programme, suggested session, live workout and Gym Mode, sets with warm-up and effort, history, records,
  strength review, exercise library.
- **LOG:** one place to log water, meals (saved meals, food lookup via USDA and Open Food Facts), sleep, weight,
  protein, notes, urges.
- **DATA:** your records over time: metric pages, daily records, month view, body progress (including photos), sources.
- **MORE:** everything else: weekly check-in and review, missions and tasks, journal, schedule, settings and targets,
  people and dates, home jobs, projects, routines, habits, collections, quit tracker, backup and restore, imports,
  calendar, IFTTT, the "cave" (SYSTEMS: BRIEF, ROUTE, VITALS…).
- **Alfred:** chat, cards you confirm, memory, record search, weekly review, debrief, plans, spoken answers, a cost meter.
- **Health Bridge (Android):** reads Garmin data from Health Connect, sends it to BEYOND, plus notification "moments"
  around shifts and a home-screen widget.

---

## 3. Product analysis

### What BEYOND is trying to become

In its own words: *"BEYOND should know you increasingly well while asking increasingly little from you."* The aim is a
calm, trustworthy **personal chief of staff for a shift worker's body and life**. It notices, plans and proposes. You
stay in charge. It never nags, never guilts and never decides for you. Recently Gavin added: *"I want Beyond to be smart
and act like a coach or nutritionist or weight management professional."* The direction is **from logbook to coach**,
with every suggestion explained and confirmed.

The identity is deliberate: a dark "Batman Beyond" command-centre look (red action, Garmin blue for watch data, a city
skyline, the emblem), with strict accessibility rules (16 px sentences, 44 px tap targets, tested colour contrast).

### Features implemented (shipped on master)

- **Daily core:** start and end the lived day (16:30 → 16:30), check-in with capacity (GREEN/YELLOW/RED), one
  recommendation with WHY, "no action required" as a valid state, Minimum Day, reset and shift-down flows.
- **Shifts and schedule:** rotation (Week A/B), confirmed exceptions, shift clock, work run and recovery states, week
  ahead, sleep plan around shifts, shift-change moments, post-run report.
- **Logging:** water, meals (saved meals, manual, food lookup, same-as-yesterday), protein, sleep (main and naps),
  weight, urges, notes and fast capture; corrections, undo and change-time for every log.
- **Garmin:** sleep and stages, steps, heart rate, resting heart rate, calories, freshness, "unusual for you", owner
  entries win over Garmin.
- **Metric pages:** hydration, steps, resting heart rate, calories (eaten beside burned), sleep's own page;
  today / 7D / 30D / 1Y, your usual, work days against days off, 90-day direction, and where your calories and
  protein came from.
- **Nutrition:** targets (calories, protein per lb, goal weight, weekly rate, your own floor), food diary, expenditure
  estimate from your weight trend, a **weekly calorie proposal** you save or keep, meal plans and grocery lists.
- **Training:** programmes, Gym Mode, set logging with warm-ups and reps-left effort, previous session, records,
  progression advice, strength review, recovery sessions.
- **Life:** missions and tasks (due and planned dates, recurrence), Plan Today, journal and lessons, habits
  (done / didn't / not recorded, 28-day history), routines (routine player), people and dates, home jobs, projects,
  collections, daily note, highlights, snippets, share inbox, smart lists, quit tracker with savings.
- **Review:** weekly check-in and interview, weekly debrief, month letter, whole-picture review, report.
- **Alfred and the free helper:** chat, cards, memory with forget, search, weekly review, plans, debrief, speak, cost
  limits, a free brief from your records.
- **Data safety:** event history, backup export and restore with preview, old-format import, encrypted automatic
  Google Drive backup (DRIVE-BACKUP-001, approved 2026-11-09).
- **Integrations:** Health Bridge (Garmin), Google Calendar (read-only events), IFTTT, USDA and Open Food Facts lookups,
  Anthropic (Alfred).

### Features partially implemented (built but not shipped, or incomplete)

| Feature | State |
|---|---|
| **Week planner** (move tasks across your week around shifts) | **Shipped** (#529, merged 2026-11-15 after independent review). |
| **Edit a log from TODAY's timeline / food diary** (TIMELINE-EDIT-001) | **Shipped** (#540, merged 2026-11-15). |
| **Alfred and the free helper fixing logs** (ALFRED-FIX-001) | **Shipped** (#541, merged 2026-11-15 after independent review). |
| **Capture processing** | Raw capture, Notes Sweep and the Saved inbox all exist, but turning a note into a task works differently on each path (HARVEST-002: "refine"). |
| **Old PRs #482 and #473** | Decided by Gavin 2026-11-15: #482 closed (superseded by LAUNCH-STEADY-001), #473 parked as draft for the coach check-in. |
| **Recommendations from evidence** | The Engine still decides from the check-in only; evidence-driven rules (deload, stalls, sleep debt) are noted but not approved. |

### Features planned but not implemented

- **Readable CSV export** (EXPORT-001): brief merged, no code.
- **Weekly coach check-in:** one weekly read combining the calorie proposal, food sources, directions and training,
  with one suggestion (proposed 2026-11-15).
- **"N times a week" habits**, a home-screen Capture shortcut, task durations / timeboxing (HARVEST-002).
- **Full micronutrients** (fiber, sodium…): needs a data change; not started.
- **Money / envelopes:** report-only discovery proposed in HARVEST-001.
- **Reminders at an exact time**, Garmin sync without a tap, and real-phone tuning of Alfred's brief (roadmap candidates).
- **Alfred recommending:** explicitly a *later* owner decision. Today the Engine alone recommends.

---

## 4. Technical analysis

### Strengths

1. **Data integrity by design.** Every action is an event; corrections and removals are new facts. History is
   inspectable and nothing is silently overwritten. Real old backups are kept as protected fixtures to prove they still
   restore.
2. **Clear layering, mechanically enforced.** The rule brain is pure and testable; only the application layer touches
   storage; CI blocks violations.
3. **Exceptionally thorough tests.** ~526 test files, including real-browser tests that check layout at phone widths,
   text sizes, tap targets and accessibility (axe), and that nothing is written when it shouldn't be.
4. **Written product rules.** The doctrine, the decision register and the briefs make it possible for any AI to learn
   why things are the way they are. That's rare and valuable.
5. **Local-first and private.** No backend; data on the phone. Online features (Alfred, lookups, Drive) are optional
   and say so when unavailable.
6. **A small set of dependencies,** each chosen deliberately (Dexie for storage, zod for validation, rrule, chrono and
   compromise for dates and text, MiniSearch for search, the Anthropic SDK).
7. **Honest uncertainty in the product.** Missing is never zero, estimates are labelled, sources are tagged.

### Weaknesses

1. **A few enormous screen files.** `TodayScreen.tsx` is 3,500 lines, `BodyScreen.tsx` 2,700, `TrainScreen.tsx`
   2,000 and `App.tsx` 900. They hold dozens of features' state and wiring, so every change risks side effects and
   changes collide (seen repeatedly in merges).
2. **Out-of-date front-page documents** (all corrected 2026-11-15: README and roadmap in #542, the Doctrine by owner approval):
   - `README.md` still says "**AI optional** … no AI provider integration". Alfred (Anthropic) has been core since
     2026-10-31. It also says COMMAND replaced MORE, but the nav shows MORE.
   - `OPERATOR_INTERFACE_DOCTRINE.md`, the top written authority, still carries the 2026-10-09 "AI optional"
     amendment. `PRODUCT_DIRECTION.md` supersedes it with RULES-2026-10-31. **This is a real authority conflict, and it
     should be reconciled by an owner-approved amendment.**
   - `ROADMAP_1.0.md`'s "Later list" names Health Connect sync and progress photos, which already exist; its "current
     build" header names HABIT-RHYTHM-001 (merged).
3. **Documentation sprawl.** ~960 doc files, 150+ briefs, a 3,300-line decision register and several generations of
   process (Drops, Factory, DEV-FLOW-002). Valuable history, but slow for any newcomer (human or AI) to orient in.
4. **Styling is spread across 48 CSS files (5,700 lines)** with global rules that override each other. Example: today a
   new sheet's buttons came out at 13 px because of an unrelated, more specific rule.
5. **A long test run.** The full browser suite takes 15–25 minutes locally. Tests sharing the browser's storage between
   files have caused intermittent failures. One (RESUME WORKOUT under the nav) turned out to be a real layout bug, found
   only after several days of "flake".

### Technical debt

- **Monolithic screens** (above). Many unrelated features read and refresh inside TODAY's single `refresh()`.
- **Two grandfathered direct database imports in the UI** (`TodayScreen.tsx`, `MoreScreen.tsx`), documented and frozen
  but still exceptions.
- **26 database versions** of migrations. They're additive and correct, but each new one is a protected, high-care
  change.
- **Browser test isolation:** `localStorage` isn't reset between test files by the shared setup, so leftover keys (for
  example a saved Alfred key) change what a screen shows.
- **Copy and UI rules enforced by tests** (sizes, wording) are good safeguards, but some tests asserted incidental
  states. Several only passed because of the launch flash; they were corrected in LAUNCH-STEADY-001.

### Dead code

- **Very little orphan code.** An import scan found every source file in use, except `vite-env.d.ts` (a standard type
  file) and `ui/styles/fonts.ts` (loaded by tests).
- **Legacy process tooling is effectively retired but still present:** `scripts/factory-*.mjs`, the
  `factory:*` npm scripts, `docs/agent/FACTORY_*`, `ACTIVE_DROP.md`, `ACTIVE_CAMPAIGN.json`, the `beyond-drop` skill and
  `builder-identity-bootstrap.yml`. DEV-FLOW-002 superseded them. They're kept for the record, but they add confusion.
- **Remnants of replaced UI:** `MeasuredSheet.tsx` no longer has its sheet (retired in METRIC-PAGE-001 slice 4) but is
  still the home of shared helpers that sleep and the metric page import. Worth renaming or moving in time.
- **`prototype/`** is design reference, not app code. Harmless, but not obviously labelled as such.

### Duplicate or overlapping systems

| Area | Overlap |
|---|---|
| **Seeing a metric over time** | The shared metric page, sleep's own page, BODY's *Insights Explorer*, the BODY dashboard, the cave's VITALS / SYSTEMS readouts, the weekly dashboard, and the month view all show history for similar numbers in different ways. The metric page is the intended single shape. |
| **Brief** | Alfred's brief, the free brief, the cave's BRIEF and the suit lines (PREFLIGHT / DEBRIEF) each summarise the day. |
| **Capture and notes** | Fast capture, the Capture list, Notes Sweep, the Saved / share inbox and the daily note, with different promotion paths (HARVEST-002). |
| **Plain-language understanding** | Alfred (Claude) and the free helper each turn words into the same proposal cards, through separate code. |
| **Week planning** | Week Ahead (read-only), Plan Today, and the unmerged week planner. |

None of these is a bug. They're the natural result of fast growth. Each is a candidate for consolidation once real use
shows which version you actually reach for.

### Architectural risks

1. **Single-device data.** All data lives in the phone's browser storage. Clearing browser data, or a browser bug, could
   wipe it. Mitigated by manual backup and encrypted Google Drive backup. Make sure the Drive backup is on and tested
   on the real phone.
2. **Alfred's API key lives on the phone** (browser storage) and calls Anthropic directly from the app. It's acceptable
   for a one-person app, but anyone with access to the unlocked phone or the browser profile could use the key. Spend
   limits exist (ALFRED-COST-001). Keep them.
3. **Change collisions.** Several builders (Claude, Codex) work in parallel on the same big files and the same docs.
   Merge conflicts in `CURRENT_CHECKPOINT.md`, `UX_DECISIONS.md` and `TodayScreen.tsx` are frequent. Out-of-order merges
   have let a red check reach master once (#534).
4. **Process weight.** The safeguards are strong, but every small change carries brief, decision, checkpoint and
   capability-map updates. Keep the protected lane for what truly needs it.
5. **The gap between tests and life.** The suite is excellent at "does it render and save correctly", but can't tell you
   whether the 19:15 → 23:00 meal fix is easy at 3 a.m. on shift. The roadmap's field gate is the right answer.

---

## 5. Roadmap analysis

### Highest-value next feature

**Ship what's already built, in this order:**

1. **Week planner (#529):** finish it on its branch, resolve conflicts, review, merge (HARVEST-002's recommendation).
2. **Timeline editing:** fix its 2 failing tests, then PR. This directly answers "I can't edit what time I ate".
3. **Alfred and the free helper fixing logs (ALFRED-FIX-001):** the most-asked-for intelligence gap. Alfred told you
   he can't move a meal; this lets him propose the fix as a card.

After those, the biggest new leap is the **weekly coach check-in**: one calm weekly read that turns the calorie
proposal, food sources, 90-day directions and training into one suggestion you accept or skip. That's the "act like a
coach" direction.

### Highest-value next refactor

**Break `TodayScreen.tsx` into self-contained sections,** each with its own data reading, for example the hero and
timeline, the next step, the numbers, life, brief and sheets. Pair it with **resetting browser storage between test
files**. It makes TODAY safer to change and faster to test, and it cuts merge collisions. It's a refactor with no
visible change, so it needs care and the existing tests as the safety net. Second place: **reconcile the stale
authority documents** (README, the doctrine's AI note, the roadmap header).

### Short-term roadmap (next 2–4 weeks), as a recommendation

1. Merge the week planner, timeline editing and Alfred log fixes.
2. Decide the two stalled PRs (#482, #473): finish or close.
3. Owner-approved doc reconciliation: doctrine and README reflect "Alfred is core"; roadmap header and later list
   updated; legacy factory files clearly marked historical (or moved).
4. **The field gate:** a full work run and day off on the real phone, logging friction through LOG → NOTE. Use what you
   find to set priorities.
5. Capture-promotion consistency (HARVEST-002's next refinement).

### Long-term roadmap (next 2–6 months), as a recommendation

1. **From logbook to coach:** the weekly coach check-in, then evidence-aware suggestions (sleep debt, training stalls,
   deload), always explained and confirmed. An Engine rule change is a protected owner decision.
2. **Consolidate overlapping views:** one way to see a metric over time, one brief, one capture flow. Let real use pick
   the winners.
3. **The self-running week** (`BEYOND_AFTER_3.md`): the week plans itself around shifts and you adjust, rather than
   planning from scratch.
4. **Data portability:** CSV export (EXPORT-001), and a proven, tested restore on a new phone.
5. **Optional depth:** micronutrients, "N times a week" habits, timeboxing. Only when field use shows the need.
6. **Engineering health:** split the remaining big screens (BODY, TRAIN, App), simplify CSS layering, and keep the test
   suite fast enough to run often.

---

## 6. AI handoff package

The AI handoff lives in its own file so it can be pasted into any AI as-is: **[`AI-HANDOFF.md`](AI-HANDOFF.md)**.
