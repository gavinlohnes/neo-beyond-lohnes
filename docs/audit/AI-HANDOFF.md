# AI-HANDOFF.md — what any AI working on BEYOND needs to know

You are joining **BEYOND**, a one-person, local-first "personal operating system" built for **Gavin**, a rotating
shift worker. Gavin is the **product owner, not a software engineer**: explain in plain language, recommend one option,
and never make him manage technical steps. This file is a briefing; the binding rules live in the repository files it
points to. Last refreshed 2026-11-15 at master `b4739464`.

---

## 1. Read these first, in this order

1. `AGENTS.md`: the rules for every AI builder (Claude Code reads it through `CLAUDE.md`).
2. `docs/agent/CURRENT_CHECKPOINT.md`: what's in flight right now. **Read first, update last.**
3. `docs/agent/DEV-FLOW-002.md`: how work is done ("Advance BEYOND" / "Let's work" protocol).
4. `docs/OPERATOR_INTERFACE_DOCTRINE.md`: the constitution of what BEYOND may mean.
5. `docs/PRODUCT_DIRECTION.md`: the vision and Alfred's rules.
6. `docs/UX_DECISIONS.md`: locked decisions (search it, don't read it top to bottom).
7. `docs/agent/BEYOND_ENGINEERING_CONTRACT.md` and `docs/agent/CAPABILITY_MAP.md`: invariants, and what already exists.
8. `docs/audit/AUDIT-REPORT.md`: this audit's full picture.

**Authority order when sources disagree:** Gavin's direct decision → the Doctrine → locked decisions → the current
brief → the code → older material. Surface genuine conflicts; don't quietly resolve them. One is known: the Doctrine
still carries the 2026-10-09 "AI optional" note, while Alfred has been core since RULES-2026-10-31
(`PRODUCT_DIRECTION.md`; the README now says so). The Doctrine amendment awaits Gavin's approval.

---

## 2. Product vision, in five sentences

BEYOND knows Gavin increasingly well while asking increasingly little of him. It records what really happened (food,
water, sleep, weight, training, check-ins, work shifts, habits, tasks) and reads his Garmin watch. A deterministic,
explainable **Engine** gives one recommendation at a time; "no action required" is a success. **Alfred**, Claude
through the Anthropic API, answers from Gavin's own records and *proposes* changes as cards Gavin confirms; a free
helper does simple things with no AI cost. The direction now is **from logbook to coach** ("act like a coach or
nutritionist or weight management professional") without ever nagging, guilting or deciding for him.

---

## 3. Architecture overview (non-technical)

- **A web app installed on the phone (PWA)**, React and TypeScript, built with Vite, deployed to GitHub Pages. **No
  server, no accounts.** Data lives on the phone in IndexedDB (via Dexie, schema v26).
- **Event sourcing:** every action is saved as an event. Corrections, retimes and removals are *new* events that point
  to the original. Nothing is overwritten, and HISTORY shows both.
- **The lived day runs 16:30 → 16:30**, not midnight to midnight, because of night shifts. Almost every calculation
  depends on this.
- **Layers (enforced by `npm run check:architecture`):**
  - `src/domain`: vocabulary (types)
  - `src/engine`: pure rules, no storage, deterministic
  - `src/persistence`: the database, backup and restore
  - `src/application`: commands (one per user action) and queries (reads); the only layer that touches storage
  - `src/ui`: screens and components; they call `application/*` only
- **Tabs:** TODAY · TRAIN · LOG (centre button) · DATA · MORE.
- **Garmin:** watch → Health Connect → the **Health Bridge** Android app (`android/health-bridge`) → a file shared to
  BEYOND → imported. Gavin's own entries always win over Garmin's.
- **Alfred:** `src/application/alfred/` (context, tools, proposals, memory, cost). The free helper is
  `src/application/helper/freeHelper.ts`. Both produce the same proposal cards; confirming a card runs a normal command.
- **Online services in use:** Anthropic (Alfred), USDA and Open Food Facts (food lookup), Google Calendar (read-only),
  Google Drive (encrypted backup), IFTTT. Anything beyond these needs Gavin's approval.

---

## 4. Development principles

- **One objective at a time; one Builder per objective.** Check open PRs and the checkpoint for overlap first. Codex
  and Claude both work here; never edit another builder's branch without an explicit handoff.
- **Every PR needs Gavin's merge. Never self-merge, never bypass checks, never force-push.**
- **Risk lanes:** Routine and Feature work needs green CI. **Protected work** also needs Gavin's specific approval and
  an **independent exact-head review**. Protected work includes Engine or recommendation changes, schema/migration,
  backup format, correction or event semantics, removing capability, primary navigation, new providers or
  dependencies, and amending a locked decision.
- **The leverage gate:** reuse what exists before building (check `CAPABILITY_MAP.md` and the code); every brief and PR
  states REUSE / OWN / BUILD FROM SCRATCH.
- **One short brief per objective** in `docs/agent/` (authorization quote, lane, scope, exclusions, tests). Record
  product rulings in `UX_DECISIONS.md`, and update `CURRENT_CHECKPOINT.md` with every push.
- **Verify proportionally, honestly:** typecheck (`npx tsc -b`), architecture check, Node tests, browser tests
  (`BEYOND_BROWSER_EXECUTABLE=… npx vitest run --project browser`), build. Don't run two browser suites at once (they
  interfere). Report failures plainly; "flaky" is not a root cause.
- **Talking to Gavin:** short and plain. Lead with what he'll experience. Give one recommendation and ask one clear
  question. Say "Ready to merge: PR #___ — CI green at `<sha>`" only when it truly is, and in the order that's safe to
  merge.

---

## 5. Important constraints (do not break)

**Product**
- The **Engine keeps recommendation authority.** Alfred explains, plans and proposes; he never writes without a
  confirm, and never recommends until Gavin decides otherwise.
- **The operator confirms every change.** No silent writes, no automatic filing, no timeout-as-consent.
- **No guilt, streak pressure or manufactured urgency.** Missing is never zero; estimates say they're estimates;
  sources are labelled; uncertainty is stated.
- **Corrections supersede, never erase.** HISTORY is sacred.
- **Offline first:** logging and the core day work without signal; online features say when they're unavailable.
- **Garmin scope:** steps, heart rate, resting heart rate, sleep and stages, calories. No Garmin weight or hydration
  import, no Garmin cloud. Owner entries win.
- **Calories:** eaten and burned are never netted into "deficit/surplus/remaining". The weekly calorie proposal is
  saved or kept by Gavin, never applied automatically, and never goes below his own floor.
- **Gavin doesn't want to be asked whether he'll work out today.** If he wants to, he starts a workout.

**Interface**
- **Accessibility:** sentences, buttons and inputs at least 16 px; only short uppercase labels and chart ticks smaller,
  never under 10 px; 44 px tap targets; tested contrast (axe).
- **Identity:** dark command-centre look; one filled red action per screen (FIELD-AUTHORITY-001); Garmin data in Garmin
  blue; locked emblem and skyline placements; TODAY's readings in the mono face.
- Phone widths 320–1024 px must not spill or collide.

**Engineering**
- Respect the layers. The UI never touches the database.
- **Never edit `test-fixtures/protected/*`** (real historical backups).
- Database changes are additive only, and each new version is Protected.
- **Privacy:** never put Gavin's personal details in outside requests. No model names in commits or PRs.

---

## 6. Where things stand (2026-11-15)

- **Recently merged:** calories on the metric page, the weekly calorie proposal and an adjustable floor, the 90-day
  direction line, where your food came from, no flash on launch, RESUME WORKOUT stays above the nav, speed under
  fatigue (#537), universal fast capture (#538), and HARVEST-002 research (#539).
- **Also merged since the audit:** the week planner (#529) and timeline editing (#540): fix a meal's or water's time,
  amount or presence from TODAY's timeline and the food diary (`application/logEntries.ts`).
- **In flight:** **ALFRED-FIX-001 (#541, Protected, in review):** Alfred and the free helper propose move, correct and
  remove for a logged entry, with BEYOND filling the card's real before and after. #482 closed; #473 parked as draft.
- **Plan:** ship existing work before new work (ROADMAP_1.0 "Current plan"); then the field gate on the phone.
- **Known debt:** huge screen files (`TodayScreen.tsx` 3,500 lines), stale README and Doctrine AI note, documentation
  sprawl, CSS specificity fights, browser storage not reset between test files.
- **Next big idea Gavin liked:** a weekly coach check-in (one weekly read, one suggestion, accept or skip).
