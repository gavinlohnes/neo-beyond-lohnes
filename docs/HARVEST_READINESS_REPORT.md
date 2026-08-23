# BEYOND — Harvest Readiness Report

Prepared for the external Open-Source + Product Harvest Sprint. Written so a
researcher who has never seen BEYOND can act on it without reverse-engineering
the codebase. Every claim below is backed by direct repository inspection,
test output, or schema evidence gathered on the date of writing — not
assumption, and not aspiration described elsewhere in chat history.

> **Superseded/current-status note (2026-08-22):** This is a historical
> point-in-time report prepared at HEAD `95a9670`; its present-tense findings,
> counts, maturity ratings, and recommendations describe that snapshot and
> must not be read as current repository truth. At the later verified baseline
> HEAD `6a6391eeb81a358538ad1c3649740ab1e87a3a6e`, `npm run verify` passes:
> the architecture checker scans 53 source files successfully, Vitest passes
> 68 files / 706 tests (50 files / 559 tests in Node and 18 files / 147 tests
> in real Chromium), TypeScript passes, and the production/PWA build succeeds.
> The current Dexie schema is version 6. Real-browser component rendering and
> automated accessibility coverage now exist under `tests/browser`; critical
> layer directions are mechanically enforced by
> `scripts/check-architecture-boundaries.mjs` (with two documented,
> grandfathered UI-to-persistence exceptions). PWA configuration is also more
> deliberate than this snapshot records: explicit update prompting and font
> precaching are configured. Consult `README.md`, `CLAUDE.md`, the code, and
> current test/configuration files for present repository truth. The original
> text below is intentionally preserved as the Harvest Sprint's historical
> evidence and reasoning rather than silently rewritten after the fact.

**Report snapshot HEAD:** `95a9670fce6ddae7e2067da4863a5a0923f8630e` (`master`,
up to date with `origin/master`, working tree clean).
**Deployed:** GitHub Pages, auto-deployed on every push to `master`
(`.github/workflows/deploy-pages.yml`), base path `/neo-beyond-lohnes/`.

---

## Executive Assessment

BEYOND is a small, disciplined, local-first personal daily-state and
training-coach app: React 19 + TypeScript (strict) + Dexie/IndexedDB, zero
backend, zero accounts, five production dependencies total. It is built
event-sourced from the ground up (append-only `DomainEvent` history,
correction chains instead of mutation, a deterministic rule-based
"Engine" that is the sole source of recommendation truth) and has real,
passing test coverage for concurrency, storage failure, long-history
correctness (30+ days), and query performance at 365 simulated days.

It is **not** a prototype pretending to be solid — the architecture is
genuinely load-bearing: 43 test files, 460 tests, a protected pair of
real historical backup fixtures hash-verified on every run, and multiple
recorded "authority reconciliation" decisions that were revisited and
re-confirmed rather than casually overridden. The foundation is trustworthy
enough to build substantially more on top of it.

What it is thin on is **presentation maturity relative to its own growing
capability** — this was the owner's own real-device finding this session,
and it shows up concretely: five screens' worth of UI logic living in large
single-file components with heavy inline styling, no design-system
component layer (CSS classes + inline `style` objects throughout), and a
navigation model that is exactly one tab bar deep (no routing library, no
URL state, no nested navigation stack). None of this is wrong for the
current size of the app. It is exactly the kind of debt that becomes
expensive if the app roughly doubles in screen count.

The dependency footprint is unusually (deliberately) small. This is both a
strength (nothing to harvest is fighting against entrenched framework
choices) and the reason the Harvest Sprint has real headroom: there is
almost no infrastructure category — search, forms, motion, offline
tooling, testing utilities — where BEYOND has already committed to a
third-party library that would need to be ripped out. Most extension
points are genuinely greenfield.

---

## 1. Current Architecture Map

### Layering (as actually enforced — by convention, not tooling)

```
domain/        <- pure types only. No React, no Dexie, no UI. (enforced by comment convention, not a lint rule)
engine/        <- pure functions, deterministic, no I/O. Takes explicit inputs, returns explicit outputs + a DecisionTrace.
persistence/   <- Dexie schema, backup/restore, legacy-format compat, small localStorage helpers.
application/   <- commands (writes) + queries (reads). The ONLY thing allowed to touch engine + persistence together.
ui/            <- screens/components. Only ever calls application/*, never persistence/* or engine/* directly.
app/           <- App.tsx: tab-based root, four-destination bottom nav.
```

This is a real, respected boundary: grepping the UI tree shows zero direct
`Dexie`/`db.` imports outside `application/` and `persistence/`, and zero
`engine/` imports from `ui/` except two intentionally pure calls
(`deriveCapacity`, `suggestSessionVariant`) that TODAY/TRAIN use to derive
*display-only* state (e.g. the capacity dot color) without going through a
command. This is a legitimate, narrow exception, not architecture erosion —
those two functions are pure and side-effect-free by construction.

There is **no dedicated component/design-system layer**. `src/ui/styles/`
holds two CSS files (`tokens.css` — CSS custom properties; `global.css` —
utility classes like `.card`, `.btn-primary`, `.chip`, `.meta`,
`.section-label`, `.corner-flag`). Every screen composes these with raw
`className` strings and large inline `style={{...}}` objects. There is no
`<Card>`/`<Button>`/`<Chip>` React component — the "design system" is CSS
class conventions plus doc-comments explaining when to use which.

### Application entry / routing / navigation

- `src/main.tsx` → `<App />` (StrictMode).
- `src/app/App.tsx`: a single `useState<Tab>` (`"TODAY"|"TRAIN"|"BODY"|"MORE"`)
  drives which screen renders; a fixed-position bottom nav bar switches it.
  **There is no router.** No URL reflects the current tab, no deep-linking,
  no browser back-button behavior, no nested navigation stack. HISTORY and
  WORK SCHEDULE are reached via a **local `useState<"MENU"|"HISTORY"|"WORK_SCHEDULE">`
  inside `MoreScreen.tsx`** — a hand-rolled, one-level-deep "sub-navigation"
  with its own `← BACK TO MORE` button, not a real stack.

### Screen/component structure

Five screens, each one large single-file component with local `useState`
for everything (no global state manager, no context, no query cache):

| Screen | File | Approx. size | Notable internal structure |
|---|---|---|---|
| TODAY | `ui/screens/today/TodayScreen.tsx` | ~1,270 lines | check-in, recommendation card, RESET/SHIFT DOWN inline renderers, Minimum Day, Capture, work context, end day — all one component |
| TRAIN | `ui/screens/train/TrainScreen.tsx` | ~880 lines | template/variant picker, active-session execution UI, completion summary — one component |
| BODY | `ui/screens/body/BodyScreen.tsx` | ~900 lines | four near-identical logging subsystems (water/sleep/bodyweight/protein), each hand-repeating the same confirm+correct+history pattern |
| MORE | `ui/screens/more/MoreScreen.tsx` | ~300 lines | backup/restore/diagnostics + local sub-nav to HISTORY/WORK SCHEDULE |
| HISTORY | `ui/screens/history/HistoryScreen.tsx` | ~95 lines | flat, deliberately unfiltered read-only event list |

Each screen has a co-located `*Copy.ts` module for pure copy/formatting/
validation helpers (unit-tested independently of the DOM — this is a real,
consistently-applied pattern and one of the codebase's better habits).

### Domain layer (`src/domain/`)

Two files, pure types only:

- `common/types.ts` — `BeyondDay`, `StateCheckIn`, `Recommendation`,
  `DecisionTrace`, `Outcome`, `WorkoutSession`, `DomainEvent` (with a
  closed union of ~30 `DomainEventType` string literals), `HydrationEntry`
  (explicitly documented as *derived, not stored*), `CaptureItem`,
  `SchedulePattern`, and one payload interface per event type.
- `workout/types.ts` — `WorkoutTemplateId`/`SessionType`/
  `WorkoutSessionStatus`, `ExercisePrescription`, the three hardcoded
  workout templates (A/B/C, 4 exercises each), `PerformedSet`.

### Deterministic Engine (`src/engine/`)

Six small, pure, single-responsibility modules — this is the part of the
codebase closest to "unimpeachable":

- `capacity.ts` — `deriveCapacity(checkIn) → GREEN|YELLOW|RED` with reason
  codes. Explicitly commented **"LOCKED... do not replace with a weighted
  score or AI interpretation without an explicit product decision."**
- `evaluate.ts` — turns capacity + planned-work + unresolved-post-shift
  into one `Recommendation` (priority-ordered rule list, full
  `DecisionTrace` every time). `ENGINE_VERSION = "0.1.0"` hardcoded.
- `redOverride.ts` — the shared RED-capacity override-confirmation gate
  (`assertRedOverrideConfirmed`), reused by TODAY's decline flow and
  TRAIN's `startWorkout`.
- `scheduledContext.ts` — derives a *suggested* work-schedule phase
  (PRE_WORK/SCHEDULED_SHIFT/EXPECTED_POST_WORK/OFF) from a `SchedulePattern`
  and the current time. Pure; never reads/writes persisted state.
  Contains `DEFAULT_SCHEDULE_PATTERN`, the original hardcoded production
  schedule, now used as migration seed + fallback.
- `trainSuggestion.ts` — capacity→session-variant suggestion, A→B→C
  rotation-advancement rule, RECOVERY completion-tier thresholds.
- `progression.ts` — per-exercise INCREASE/HOLD/REDUCE/NO_HISTORY advisory
  from prior performed sets. Explicitly rejects a flat "+2.5lb" rule in
  favor of a per-exercise `incrementLbs` (currently defaulted to 5 for
  every exercise — a documented placeholder, not a locked value).

Every Engine function takes explicit arguments and returns explicit output
with no hidden I/O — genuinely testable and genuinely tested
(`tests/engine/*.test.ts`, one file per module).

### Command / query architecture (`src/application/`)

- `commands.ts` (866 lines) — every state-changing action in the app. All
  routes to one shared `logEvent()` that stamps `id`, `occurredAt`,
  `recordedAt` (**both set to the same `new Date().toISOString()` call,
  every time, everywhere** — see Protected Core notes below), `source`
  (`USER`/`ENGINE`/`SYSTEM`), `correlationId`, optional `causationId`, and
  a deterministic tie-break `seq` (see below). Corrections
  (water/sleep/protein/bodyweight) share one generic
  `correctSingleValueLog` helper enforcing "target must be the current
  chain HEAD, no-op values rejected, original fact never touched."
- `queries.ts` (576 lines) — every derived read. Correction-chain resolution
  (`getHydrationEntries`, `walkCorrectionChain`) reconstructs "effective"
  values by walking the raw event stream at **read time**, not by
  maintaining a materialized view — BEYOND stores facts, derives truth on
  demand.
- `trainCommands.ts` / `trainQueries.ts` — TRAIN-specific, same pattern
  (idempotent `startWorkout` guarded by an in-flight-promise map keyed by
  day, mirroring `ensureActiveDay`'s single-tab concurrency guard).
- `historyQueries.ts` — one function, `getHistoryDays()`, doing an
  **N+1 query pattern** (one `db.events.where(...)` call per day in a
  `for` loop). Flagged in the Debt Map below — currently harmless at
  benchmarked scale, a real concern if HISTORY ever needs to render
  thousands of days.

**The `seq` field** (`StateCheckIn`/`Recommendation`/`DomainEvent`/
`CaptureItem`) is a notable, well-reasoned piece of infrastructure: a
monotonic counter, seeded once per session from the current on-disk max
(never from the clock), used purely as a same-millisecond tie-break for
"most recent" queries. It deliberately does **not** touch
`occurredAt`/`recordedAt` — those stay real, un-nudged timestamps. This
was a deliberate redesign after an earlier version manufactured fake
historical time to break ties, which was correctly rejected.

### Persistence layer (`src/persistence/`)

- `db.ts` — Dexie schema, **5 real schema versions** (see below), current
  tables: `beyondDays`, `events`, `checkIns`, `recommendations`, `outcomes`,
  `workoutSessions`, `performedSets`, `schedulePatterns`, `captureItems`.
- `backup.ts` — native export (`dexie-export-import`, `format: "dexie"`)
  + backup-reminder bookkeeping (localStorage, days-since-last-export) +
  archive-via-Web-Share-API-with-download-fallback.
- `restore.ts` — format-sniffing dispatcher between the native format and
  the legacy one (below). Both paths are **preview-before-write,
  replace-only** — nothing is written until the caller explicitly
  confirms, and both auto-export current data as a rollback file before
  ever writing (`MoreScreen.handleConfirmRestore`).
- `compat/legacyBackup.ts` — a Zod-validated importer for a **second,
  historical, read-only backup format** (`BEYOND_BACKUP`, produced by an
  earlier, no-longer-running version of this app). Every schema field
  name in this importer is annotated as "confirmed against real fixture
  data" or "unconfirmed shape, opaque passthrough" — a genuinely careful
  reverse-engineering-from-evidence approach, not a guess.
- `schedulePatternValidation.ts` — Zod schemas for `SchedulePattern`,
  shared by both the lenient read path (falls back to a default on
  malformed data) and the strict write path (rejects malformed input
  outright).
- `outcomeDismissals.ts` — a 20-line localStorage helper for one UI-only
  dismissal flag. Correctly *not* modeled as a domain event.

### Dexie database / version history

```
v1: beyondDays, events, checkIns, recommendations
v2: + outcomes, workoutSessions, performedSets   (to faithfully replay real historical fixtures)
v3: performedSets gains sessionId/exerciseId indexes (once TRAIN got a real shape)
v4: + schedulePatterns, upgrade() seeds DEFAULT_SCHEDULE_PATTERN
v5: + captureItems
```

Every version is additive — no version has ever dropped or renamed a
table or column. `tests/persistence/schemaMigration.test.ts` exercises the
upgrade path directly.

### Event model

Closed union of ~30 `DomainEventType` string literals (see domain layer
above). Every event carries `occurredAt`/`recordedAt` (currently
identical at write time — no backdating UI exists anywhere), `source`,
`correlationId` (links related events from one user action), optional
`causationId` (links a terminal event like `RESET_COMPLETED` back to its
`RESET_STARTED`), and optional `seq`. Correction events
(`*_LOG_CORRECTED`) never mutate the original — they carry
`originalEventId` (chain root, never changes) and `supersedesEventId`
(the specific HEAD they replace), confirmed field-for-field against real
historical exports.

### Recommendation / outcome model

One `Recommendation` per check-in (`evaluate()`, priority-ordered:
STABILIZE → POST_SHIFT_TRANSITION → RECOVER → EXECUTE_PLANNED_WORK →
NO_ACTION_REQUIRED), each carrying a full `DecisionTrace` (which rules
matched/didn't and why). Recording a decision
(accept/decline/no-action-acknowledged) is a **separate, explicit** step
from issuance — the Engine issuing a recommendation is not itself a
historical claim that the user acted on it. `Outcome.rating`
(GOOD/NEUTRAL/BAD) is an explicit, optional, later signal, deliberately
never fed back into Engine rules automatically ("rules provide
consistency, outcomes provide correction, not silent rule adjustment" —
BATCAVE pattern-surfacing is explicitly out of scope, not built).

### Workout model

Three fixed, hardcoded templates (A/B/C — 4 exercises each, no exercise
database, no user-authored templates). `SessionType` = STANDARD/REDUCED/
RECOVERY (Engine-suggested, always user-overridable). `WorkoutSessionStatus`
= ACTIVE/COMPLETED/PARTIAL/ABANDONED, PARTIAL a real distinct
rotation-relevant state, not a synonym for "not abandoned." Rotation
advancement (`doesSessionAdvanceRotation`) and per-exercise progression
advisories (INCREASE/HOLD/REDUCE) are both pure Engine functions
(`trainSuggestion.ts`/`progression.ts`), fully unit-tested.

### BODY data model

Four parallel logging subsystems (hydration/sleep/protein/bodyweight), all
event-sourced with the identical correction-chain shape
(`*_LOGGED`→optional `*_LOG_CORRECTED` chain). No goals/targets on any of
them by explicit, repeated product decision ("bodyweight: a fact only, no
goal" — considered and rejected twice). Minimum Day derives HYDRATE/
PROTEIN automatically from these logs; MOVE/RECOVER_CONNECT derive
automatically from a RECOVERY session's duration, with a manual-completion
fallback; MEDS/HYGIENE are always manual, generic-completion-only (no
private detail stored, by design).

### Work-context / schedule model

`BeyondDay.workContext` (WORK/OFF/UNKNOWN) changes through exactly one
command, `setWorkContext` — schedule prediction never writes it directly
("PREDICTION IS NOT FACT," doctrine enforced at the command layer, not
just by convention). `SchedulePattern` (rotating week A/B workdays, shift
start/end hour, post-work tail hours) is user-editable configuration
(`MORE → Work Schedule`), stored as one directly-mutated row, not
event-sourced — a deliberate, documented distinction from domain history.
`WORK_PERIOD_ENDED` is a separate, idempotent, user-only fact (never
inferred from clock/schedule/GPS/inactivity) that the Engine's
POST_SHIFT_TRANSITION tier depends on.

### Capture model

The newest subsystem (Overdrive Phase 10, this build lineage).
Deliberately the smallest possible slice of a larger, **explicitly
unbuilt** "Universal Inbox" R&D design: raw text in, `OPEN`/`RESOLVED`
status, `resolveCaptureItem`/`reopenCaptureItem`, nothing else — no
classification, no linking to any other domain, no AI, not day-scoped
(no `beyondDayId`), not a `DomainEvent` (its own small directly-mutated
table). This session's Phase 17 wired up `reopenCaptureItem` (an
undo-a-resolve) into the UI — it existed and was tested but had no UI
affordance until now.

### Backup / export / import system

Two independent, fully-tested round trips:
1. **Native** — `dexie-export-import`, `format: "dexie"`. Preview →
   confirm → replace-only import.
2. **Legacy compatibility** — a Zod-validated reader for a real
   historical app's own `BEYOND_BACKUP` format (two protected fixture
   files, hash-verified every test run — see below). Read-only forever;
   BEYOND never writes this format.

Archival = handing the native export to the OS share sheet (Web Share
API with a download fallback) — in-app Google Drive/OAuth was explicitly
considered and rejected to preserve local-first doctrine.

### Migrations

Handled entirely by Dexie's own `version(n).stores().upgrade()` API — no
custom migration runner, no separate migration framework. All 5 versions
additive; one (`v4`) has a real `upgrade()` callback seeding a config row.

### Fixture system

`test-fixtures/protected/` holds two **real** historical backup exports
(not synthetic sample data), file-mode 444, and
`tests/compat/fixtureIntegrity.test.ts` fails the entire suite if either
file's SHA-256 ever changes. `tests/helpers/generateHistory.ts` is the
separate **synthetic** history generator used for scale/performance
testing (30/90/365 simulated days) — clearly distinct from, and never
confused with, the two protected real fixtures.

### PWA / offline infrastructure

`vite-plugin-pwa` (`registerType: "autoUpdate"`, `generateSW` mode),
manifest with 192/512px icons, `standalone` display. This is close to
"whatever the plugin defaults give you" — no custom service-worker logic,
no explicit offline-fallback page, no background-sync, no push (by
design — BEYOND has no backend). IndexedDB (via Dexie) is the entire
persistence story; there is no cache-then-network strategy beyond
Workbox's generated defaults.

### Styling / design-system infrastructure

Two hand-written CSS files (see Architecture Map above). No CSS-in-JS, no
Tailwind, no CSS Modules, no component library. `--gutter`/`--space-*`/
color tokens live in `tokens.css`; utility classes (`.card`,
`.btn-primary`, `.chip`, `.section-label`, `.corner-flag`,
`.exercise-focus`, `.meta`/`.meta-strong`) live in `global.css`, each with
a doc-comment explaining its intended use and history. This is a real,
consistently-followed convention — but it is a convention, not a
type-checked component API, so misuse (wrong class combination) is only
caught by code review, never by the compiler.

### Icon / motion infrastructure

`src/ui/icons/Icon.tsx` — 7 hand-drawn inline-SVG icons (6 locked pilot
icons + 1 additive `more`), one shared angular/diamond visual grammar,
`currentColor`-driven so color is CSS-controlled. Three named
motion-primitive components (`ResolveIcon`/`SignalIcon`/`ConfirmIcon`)
play a **one-shot** CSS keyframe animation on fresh mount (React `key`
change), never looping, respecting `prefers-reduced-motion` globally.
This is bespoke, tiny (no animation library), and doctrine-driven ("no
decorative looping animation").

### Testing infrastructure

Vitest, plain Node environment (no jsdom — there are **no
component-render tests anywhere in this codebase**; all UI-adjacent
testing is of pure copy/logic helper functions, e.g.
`tests/ui/trainCopy.test.ts`). `fake-indexeddb` stands in for IndexedDB.
43 test files / 460 tests: engine unit tests, application-layer
integration tests (one file per feature area), a dedicated
"stabilization regression suite" (concurrency races, storage-failure
handling, overnight-shift semantics, 30-day correctness), performance
benchmarks (30/90/365 simulated days), and the fixture-integrity/
compat-parsing suite. This is a genuinely strong safety net for a
project this size — but it means **any future component-render or
visual-regression testing tool would be entirely new territory**, not an
upgrade to something already in place.

### Deployment / build infrastructure

`vite build` (`tsc -b && vite build`), one GitHub Actions workflow
(`deploy-pages.yml`): `npm ci` → `tsc -b` → `vitest run` → `npm run build`
→ upload to GitHub Pages. No staging environment, no preview deploys per
PR, no feature flags, no environment-variable configuration surface at
all (there is nothing to configure — no API keys, no backend URL,
nothing).

### Dependency direction (summary)

```
ui/  --------> application/ --------> engine/  (pure, no deps out)
                    |     \--------> persistence/ --------> (dexie, dexie-export-import, zod)
                    \--------------> domain/  (pure types, no deps out)
app/ --------> ui/screens/*
```

No inappropriate coupling was found beyond what's already flagged above
(the two narrow, intentional `engine/` calls from `ui/` for pure display
derivation, and the fact that "layering" is enforced by comment
convention rather than a lint rule or module boundary tool). Given the
project's current size, this is a reasonable trade-off, not a defect —
flagged in the Debt Map as a *theoretical* future concern, not a real one.

---

## 2. Capability Inventory

Classification key: **MATURE** (built, tested, real-device acceptable) ·
**FUNCTIONAL BUT IMMATURE** (built, tested, works, but has a known
usability/visual gap) · **FOUNDATION ONLY** (data model/schema exists,
little or no UI/behavior on top) · **NOT IMPLEMENTED** (does not exist).

| Capability | Status | Evidence |
|---|---|---|
| TODAY / Command surface | **FUNCTIONAL BUT IMMATURE** | Owner real-device score 5/10 this session — "too much happening simultaneously." Just underwent a correction pass (Phase 18) addressing active-mode dominance and work-context collapse; not yet re-verified on device. |
| State Check-In | **MATURE** | Five-field check-in, quick "ALL GOOD" one-tap, full test coverage (`tests/ui/checkInFields.test.ts`, integration tests). |
| Capacity (GREEN/YELLOW/RED) | **MATURE** | Locked, pure, fully tested rule (`engine/capacity.ts`, `tests/engine/capacity.test.ts`). Explicitly not to be replaced with scoring/AI without a product decision. |
| Work Context | **FUNCTIONAL BUT IMMATURE** | Real, event-sourced, doctrine-correct (prediction≠fact). This session added progressive-disclosure collapse; genuinely simple screen otherwise. |
| Work Schedule | **MATURE** | Full editor (week A/B, shift hours, live preview), Zod-validated both directions, owner explicitly said "reads clearly on the real device" this session. |
| SHIFT DOWN | **FUNCTIONAL BUT IMMATURE** | Full guided flow (duration input → start → complete/cancel), resumable across reload, real Engine tie-in (STABILIZE/POST_SHIFT_TRANSITION both suggest it). Just received an "active mode dominance" visual correction this session, unverified on device yet. |
| RESET | **FUNCTIONAL BUT IMMATURE** | Same shape/maturity as SHIFT DOWN; never the Engine's own `suggestedCommand` today (`resetIsPrimary` is always false under current locked rules) — reachable, tested, but never actually engine-recommended in practice. |
| Minimum Day | **FUNCTIONAL BUT IMMATURE** | Full six-item locked baseline, auto-derivation from BODY logs + RECOVERY duration, manual fallbacks. No real-device signal either way this session — untested against the owner's actual daily use pattern recently. |
| TRAIN — workout execution | **FUNCTIONAL, near-MATURE** | Owner score 8/10. One concrete named friction: numeric entry currently biased toward +/- steppers rather than a direct numeric keyboard (see UX Friction Map). |
| TRAIN — progression/history | **MATURE** | Advisory-only INCREASE/HOLD/REDUCE, fully deterministic, fully tested (`tests/engine/progression.test.ts`, `tests/integration/trainProgression.test.ts`). Increment-per-exercise is a documented placeholder (flat 5lb default) rather than real per-equipment data — a real gap, but an honestly-labeled one. |
| BODY — hydration | **MATURE** | Correction chains, quick-add, "repeat last," collapsed history. Owner score 8/10, "no meaningful complaint." |
| BODY — protein | **MATURE** | Same shape as hydration, no goal by design. |
| BODY — sleep | **MATURE** | PRIMARY/SUPPLEMENTAL distinction correctly drives END-DAY suggestion logic; no fast-path quick-add exists (by nature of the data — every night's duration differs), so it's the one BODY subsystem that is inherently more form-like; owner has not flagged this as a problem. |
| BODY — bodyweight | **MATURE** | "SAME AS LAST" fast path, correction chain, no goal by design. |
| Capture | **FUNCTIONAL BUT IMMATURE** | Real, tested, minimal by design ("smallest slice that doesn't invent unbuilt policy"). The larger CAPTURE PROCESSOR / routing-to-other-domains design is explicitly **approved R&D, not implemented** — do not count it as existing. |
| History | **MATURE** | Deliberately simple, read-only, complete, untouched by multiple recent visual-maturity passes on purpose (per explicit Decision Register entry). |
| Backup / restore / archive | **MATURE** | Two independently-tested round trips (native + legacy-compat), preview-before-write, auto-backup-before-restore, real historical fixtures as regression evidence. |
| Offline / PWA behavior | **FOUNDATION ONLY** | `vite-plugin-pwa` default `generateSW` config only — installable, has an icon/manifest, but no custom offline-fallback UX, no explicit "you're offline" messaging (arguably moot, since there is no network dependency for core function, but this also hasn't been verified as a deliberate design decision vs. simply unexamined). |
| Recommendation / outcome behavior | **MATURE** | Full priority-ordered Engine, full trace, explicit accept/decline/no-action recording, optional later GOOD/NEUTRAL/BAD rating explicitly never fed back automatically. |

---

## 3. Dependency Inventory

Five production dependencies. This is genuinely small — most apps this
functionally rich would carry 15-40.

| Package | Version | What BEYOND uses it for | Depth | Carrying its weight? | Concerns |
|---|---|---|---|---|---|
| `react` | 19.2.8 | The entire UI layer | Deep — every screen | Yes | None found. Current major (19), actively maintained. |
| `react-dom` | 19.2.8 | DOM renderer for React | Deep | Yes | Paired 1:1 with `react`, no drift. |
| `dexie` | 4.4.5 | IndexedDB wrapper: schema/versioning, typed tables, transactions, `where()` queries | Deep — the entire persistence layer is built on Dexie's API surface directly (`db.beyondDays.where(...)`, `.filter()`, `.bulkAdd()`, transactions) | Yes | None found. Actively maintained, this is exactly the job it's built for. |
| `dexie-export-import` | 4.4.0 | Native backup export/import (`db.export()`/`db.import()`) | Deep for that one feature, shallow elsewhere | Yes | Small maintenance surface — one plugin, one job, still maintained alongside core Dexie. |
| `zod` | 4.4.3 | Runtime validation for the legacy backup format and `SchedulePattern` | Moderate — two well-scoped validation surfaces, not used as a general app-wide schema layer | Yes, for what it's asked to do | None found. Recently released major (v4) already adopted, so not stale. |

**Notable non-finding:** BEYOND is **not** recreating functionality any of
these five already provide. There is no hand-rolled IndexedDB wrapper, no
hand-rolled schema validator duplicate of Zod, no hand-rolled
export/import duplicate of `dexie-export-import`. The one arguable
exception is the legacy-backup Zod schemas overlapping conceptually with
what `dexie-export-import`'s own format validation does — but that's
because they validate two genuinely different, incompatible formats, not
duplication of one.

### Meaningful devDependencies

| Package | Version | Purpose | Notes |
|---|---|---|---|
| `vite` | 8.2.1 | Build tool / dev server | `npm outdated` shows 8.2.2 available (patch) |
| `@vitejs/plugin-react` | 6.0.5 | React JSX/Fast-Refresh support for Vite | 6.1.0 available (minor) |
| `vite-plugin-pwa` | 1.3.0 | Service worker + manifest generation | current |
| `vitest` | 4.1.10 | Test runner | 4.1.11 available (patch) |
| `fake-indexeddb` | 6.2.5 | IndexedDB polyfill for Node-environment tests | current, this is the load-bearing piece that makes the whole persistence-layer test suite possible without a browser |
| `typescript` | 5.9.3 | Strict-mode type checking (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc. — an unusually strict tsconfig) | `npm outdated` shows a `7.0.2` "latest" entry; this is a large apparent jump and should be treated with suspicion (verify the registry listing before ever acting on it) rather than assumed to be a real, ready-to-adopt release |
| `@types/node`, `@types/react`, `@types/react-dom` | current-ish | Type definitions only | no runtime footprint |

**Per instruction, nothing above was upgraded or replaced during this
checkpoint** — this is inventory only.

---

## 4. Extension-Point Map

Classification key: **SAFE NOW** (would integrate cleanly today with no
architectural change) · **SAFE WITH ADAPTER** (integrates cleanly once a
thin translation layer exists) · **FUTURE ARCHITECTURE REQUIRED** (needs a
new concept BEYOND doesn't have yet) · **INCOMPATIBLE WITH CURRENT DOCTRINE**
(would violate a locked decision as currently written).

| Extension point | Classification | Why |
|---|---|---|
| Local search (over Capture/History text) | **SAFE NOW** | Both are plain arrays of small objects already fully loaded into memory for their screens (`getAllCaptureItems`, `getHistoryDays`). A local full-text-search library operating on that in-memory array requires zero schema change. |
| Indexing (beyond Dexie's own compound indexes) | **SAFE WITH ADAPTER** | Dexie already supports compound/multi-entry indexes; anything beyond that (e.g. a dedicated search index) would sit *beside* Dexie, reading from it, never replacing it — an adapter, not a rip-and-replace. |
| Capture/inbox processing (routing to KNOWLEDGE/OBLIGATION/etc.) | **FUTURE ARCHITECTURE REQUIRED** | The domain concepts this would route *to* don't exist in BEYOND yet (explicitly documented in `CaptureItem`'s own doc comment as approved-but-unbuilt R&D). Any harvested "inbox triage" tool would need those target concepts defined first. |
| Command/quick-action interface (a command palette) | **SAFE WITH ADAPTER** | Every user-facing action already routes through a small, well-named set of `application/commands.ts` functions — a command palette is almost literally "list these functions with labels." The adapter work is UI-only (a new overlay component), not a data-model change. |
| Knowledge organization | **FUTURE ARCHITECTURE REQUIRED** | No concept of linked notes/entities/tags exists anywhere in the domain layer today. |
| Charts/visualization | **SAFE WITH ADAPTER, WITH AN EXPLICIT CAVEAT** | The data (hydration/protein/sleep/bodyweight/progression history) is all there and query-able. **However:** "Explicitly out of scope: BATCAVE, trend charts" is a standing, repeatedly-reaffirmed product decision (README, UX_DECISIONS.md). Any charting library adopted for internal diagnostics (e.g. a dev-only performance view) would be safe; adopting one to build user-facing trend charts would need a **product decision to reverse that standing doctrine first**, not just an engineering green light. |
| Calendar/scheduling primitives | **FUTURE ARCHITECTURE REQUIRED**, bordering **INCOMPATIBLE** | `SchedulePattern` is a narrow, purpose-built rotation config, not a general calendar. "No Gmail/Calendar" is an explicit standing constraint in the current mandate lineage. A generic calendar/scheduling library could be evaluated for **internal** use (e.g. rendering the work-rotation preview more richly) but external calendar integration is currently doctrine-blocked. |
| Import/export | **SAFE NOW** | Already a clean, tested, two-format abstraction (`previewAnyRestore`/`applyAnyRestore`). Any third-party format-conversion tool would sit at this exact boundary. |
| Data validation | **SAFE NOW** | Zod is already adopted and idiomatically used for exactly this purpose in two places — extending it to more surfaces (e.g. validating command inputs at the UI boundary more broadly) is a natural, zero-new-dependency extension. |
| Local persistence | **SAFE NOW, LOW NEED** | Dexie already covers this well; no evidence of a gap. |
| Offline/PWA behavior | **SAFE WITH ADAPTER** | Current setup is default `vite-plugin-pwa` `generateSW`. A more deliberate offline strategy (explicit cache-first routes, an offline-fallback screen) would layer on top of the existing plugin config, not replace it. |
| Notifications | **INCOMPATIBLE WITH CURRENT DOCTRINE (for push)** | Backup-reminder doctrine explicitly says "never a push notification... BEYOND has no backend to support one without contradicting local-first doctrine." Local, on-device-only notifications (Web Notifications API, no server) are architecturally possible and not doctrine-blocked, but would be new territory — no existing code path uses them today. |
| Forms/input ergonomics | **SAFE NOW** | This is precisely where the owner's named TRAIN friction (numeric keyboard entry) lives — see UX Friction Map. Any lightweight numeric-input primitive would slot directly into TRAIN's existing `<input type="number">` elements with no data-model change at all. |
| Accessibility | **SAFE NOW** | No accessibility-testing tooling exists in the dev pipeline today (no `axe`, no automated a11y CI check) — pure upside to add, zero conflict with anything existing. `:focus-visible` and a locked 16px-minimum-font rule are already manually maintained; an automated checker would reinforce, not replace, that. |
| Interaction primitives (gestures, sheets, etc.) | **SAFE WITH ADAPTER** | Nothing currently exists beyond plain buttons/inputs/`<details>`. A bottom-sheet or swipe-gesture library would be wholly new, additive UI — no conflict, but also no existing pattern to slot into; it would set a new one. |
| Motion | **SAFE WITH ADAPTER, LOW NEED** | The existing bespoke one-shot CSS-keyframe system (RESOLVE/SIGNAL/CONFIRM) is small, intentional, and doctrine-driven ("no decorative looping animation"). A general animation library is not obviously needed and risks fighting that restraint doctrine — see Custom-Code Leverage Audit. |
| Testing (component/visual) | **SAFE NOW, GENUINE GAP** | Zero component-render tests exist anywhere. `@testing-library/react` or a visual-regression tool would be pure addition, no conflict, and would close a real, named gap (this session's UI restructuring across 3 screens had **no automated test coverage of the actual rendered output** — every check was typecheck + logic-test + manual diff review). |
| Backup/data portability | **SAFE NOW** | Already a clean boundary; a third-party format (e.g. a portable personal-data standard) could be added as a third `RestorePreview` variant with no change to the existing two. |
| Future provider integrations (Gmail/Calendar/etc.) | **INCOMPATIBLE WITH CURRENT DOCTRINE** | Explicitly named as out of scope in the current mandate. Any research here is exploratory-only, not implementation-track. |
| Future finance functionality | **INCOMPATIBLE WITH CURRENT DOCTRINE** | Explicitly named as out of scope ("No MONEY"). |
| Future personal intelligence (AI/learning) | **INCOMPATIBLE WITH CURRENT DOCTRINE** | `capacity.ts` is explicitly locked against being replaced by "a weighted score or AI interpretation... without an explicit product decision." Any AI/ML capability would need to be additive and advisory *alongside* the deterministic Engine, never a replacement for it, and would need that explicit decision first. |

---

## 5. Custom-Code Leverage Audit

### Code BEYOND absolutely should keep owning

- **The deterministic Engine** (`src/engine/*`) — capacity rule,
  recommendation priority order, progression advisory, rotation
  advancement. This is BEYOND's actual product thesis (one deterministic,
  explainable recommendation at a time). No external library replaces
  "our specific rules," and the value is entirely in their specificity.
- **The event-sourcing/correction-chain pattern itself** — this is a
  well-known *pattern*, but BEYOND's implementation of it is small,
  purpose-fit, and deeply tied to its own domain events. Adopting a
  general event-sourcing framework (e.g. something with its own
  aggregate/projection ceremony) would very likely add more conceptual
  overhead than the ~150 lines this currently takes across `commands.ts`/
  `queries.ts`.
- **`seq`-based deterministic tie-breaking** — small, correct, specific
  to this app's exact ordering needs. Not a candidate for replacement.
- **The legacy-backup compatibility importer** — inherently
  BEYOND-specific (it decodes a dead app's exact historical export
  shape). No external tool has any reason to know this format.

### Commodity infrastructure BEYOND correctly does NOT reinvent

- IndexedDB access (uses Dexie, doesn't hand-roll a wrapper).
- Backup export/import serialization (uses `dexie-export-import`).
- Schema validation (uses Zod where it validates untrusted/external
  data — the legacy backup and schedule-pattern boundaries).
- Build tooling, dev server, PWA manifest/service-worker generation (Vite
  + `vite-plugin-pwa`).

### Implementation that is currently simple enough that adding a library would make things worse

- **The tab-bar navigation** (`App.tsx`). Four fixed destinations, one
  level of sub-navigation inside MORE. A full router (React Router,
  TanStack Router) would add URL-parsing, route-matching, and a new
  mental model for a grand total of ~5 screens. **This becomes a
  genuine candidate later** (see Debt Map) if screen count/nesting grows
  meaningfully — but adopting one today would be premature.
- **The motion system.** Three named one-shot CSS keyframe animations,
  triggered by React `key` remounts. A general animation library
  (Framer Motion, React Spring) would add a runtime dependency and a new
  animation-authoring API to replace something that is currently ~40
  lines of CSS and works correctly, including respecting
  `prefers-reduced-motion` for free via one global media query.
- **Zod usage itself, at its current scope.** Two well-bounded validation
  surfaces. Fine as-is; do not let a harvest push toward "validate
  everything with Zod" without a concrete problem driving it.

### Places where a mature external primitive could remove significant future complexity

- **A real component/design-system layer.** This is the single highest-
  leverage opportunity in the whole codebase. Every screen currently
  hand-writes `style={{...}}` objects for the same handful of visual
  patterns (a card, a chip row, a confirm-with-undo banner, a
  collapsed-summary-row). A typed component API (even a small,
  hand-rolled one — this does not require adopting a component library
  wholesale) would let the compiler catch misuse that today is only
  caught by code review, and would make future screens faster to build
  correctly the first time.
- **Numeric input ergonomics** — directly maps to the owner's named
  TRAIN friction. A lightweight, well-tested numeric-stepper-with-direct-
  entry pattern (whether hand-built or borrowed) is low-risk, high-value
  and needs no architectural change (see Section 6).
- **Component-render/visual testing.** Zero coverage exists today for
  "does this screen actually render what we think it renders." Given
  this session alone included three separate screen restructurings
  verified only by typecheck + manual diff review, this is a real,
  present gap, not a speculative one.
- **Accessibility auditing tooling.** Currently entirely manual
  (a documented, real 16px-minimum-font rule, verified once via a live
  `getComputedStyle` sweep per the README — not automated, not
  regression-protected).

---

## 6. UX Friction Map

Frequency × interaction cost × cognitive cost × importance, using the
owner's real-device scores as ground truth (not this agent's opinion).

| Screen | Owner score | Friction | Frequency | Interaction cost | Cognitive cost | Importance | Net priority |
|---|---|---|---|---|---|---|---|
| TODAY | 5/10 | Too much happening simultaneously — RESET/SHIFT DOWN/State Input/Work Context/Minimum Day/Capture/END DAY all visible at similar weight | Every open of the app, likely multiple times/day | Low per-tap, but high scanning cost to find "the one thing that matters right now" | **High** — no clear single next action | **Highest** — this is the primary daily surface | **P0** |
| TRAIN | 8/10 | Numeric set entry biased toward +/- steppers rather than direct numeric-keyboard entry | Every set, every workout (could be 10-20+ times per session) | Medium — several taps to step a value vs. one tap + type | Low-medium — the +/- pattern is understandable, just slower | High-frequency, moderate importance | **P1** |
| BODY | 8/10 | None named | Multiple times/day (water/protein especially) | Already low (quick-add/repeat-last paths exist) | Low | Moderate | **Not a priority this cycle** |
| Overall identity | — | "Feels coherent... requires study of mature applications... to determine how visual hierarchy, navigation, interaction quality and OS-like character can mature." | Ambient, every session | N/A | Ambient — a maturity/polish gap, not a blocking friction | Strategic, not urgent | **Ongoing, not a single fix** |

**Read carefully:** TODAY's 5/10 was already the target of this session's
Phase 18 correction pass (active-mode dominance, work-context collapse).
That correction has **not yet been re-verified on a real device** — treat
TODAY's friction as "addressed in code, unconfirmed in practice" rather
than "resolved." TRAIN's numeric-entry friction has **not yet been
addressed at all** — it was named after Phase 18 shipped and is a fresh,
open, well-scoped item for the next design cycle. No fixes were
implemented as part of this audit, per instruction.

---

## 7. Complexity / Debt Map

### Real current debt (measured, present, actually costing something today)

1. **Oversized screen components.** TodayScreen.tsx (~1,270 lines),
   TrainScreen.tsx (~880), BodyScreen.tsx (~900) each hold all state,
   all handlers, and all render logic for their entire feature area in
   one file. Real cost today: every edit this session required reading
   the *entire* file to find the right insertion point, and every
   change risked touching unrelated logic by proximity alone.
2. **Duplicated interaction/render logic across BODY's four subsystems.**
   Hydration/sleep/protein/bodyweight each hand-repeat: a confirmation
   banner with a CORRECT button, a collapsed-history disclosure, a
   correction-chain edit row. This is ~4x the same ~40-line pattern,
   copy-pasted with field names changed. A shared component would
   collapse this to one implementation.
3. **Inline-style duplication.** The exact same `style={{ display: "flex",
   gap: 8, alignItems: "center" }}`-shaped objects recur dozens of times
   across all three main screens. Not a bug, but a real source of drift
   risk (one instance gets tweaked, its dozen siblings don't).
4. **`historyQueries.ts`'s N+1 query pattern** — one `db.events.where(...)`
   call per `BeyondDay` in a loop. Currently fine at benchmarked scale
   (365 simulated days completed under the test's generous ceiling), but
   it is a real, present inefficiency, not a hypothetical one — it's
   just not yet expensive enough to matter.
5. **Zero component-render test coverage.** Not "will become a problem" —
   already true today, and already cost real verification confidence
   this session (every UI change was checkpoint-verified by typecheck +
   logic tests + manual diff review, never by an automated assertion
   that the rendered DOM looks right).
6. **Hardcoded, single-value "policy" placeholders presented as if
   configured:** every exercise's `incrementLbs` defaults to a flat 5,
   explicitly documented as a placeholder rather than real per-equipment
   data. This is honestly labeled, but it is real: TRAIN's progression
   advisories today are less precise than the domain model implies they
   could be.

### Theoretical future concern (not yet real — do not build against these speculatively)

1. **Navigation ceiling.** The one-level `useState<Tab>` + local sub-nav
   inside MORE works fine for 5 screens. It would become a genuine
   constraint if BEYOND grows to meaningfully more destinations, deep
   links, or any need for browser-back-button correctness — but that
   need does not exist today.
2. **Layering enforced by convention, not tooling.** No lint rule
   currently prevents a future contributor from importing Dexie directly
   into a screen component. This has not happened — the boundary has
   held so far, purely through discipline — but it is not
   mechanically enforced.
3. **Migration risk at larger schema counts.** 5 versions today, all
   additive, all tested. Nothing suggests this will become fragile soon,
   but the "just add a version, upgrade if needed" pattern has not yet
   been tested against a genuinely breaking-change scenario (e.g.
   renaming a field that has historical significance).
4. **Backup-compatibility risk if a third format is ever needed.** The
   current two-format dispatcher (`previewAnyRestore`/`applyAnyRestore`)
   was designed with exactly two formats in mind; a third would need
   the format-sniffing logic generalized, though the shape is already
   reasonably extensible.
5. **`--space-4` doing double duty** (card interior padding) after this
   session split out `--gutter` for the screen's own side padding — a
   small, already-resolved instance of "one token, two jobs" that is
   worth watching for recurrence elsewhere in the token system as it
   grows.

---

## 8. Harvest Target Matrix

Scored 1–5 on: **Potential user value (UV)** · **Development time saved
(DTS)** · **Architecture compatibility (AC)** · **Offline/local-first
compatibility (OLF)** · **Risk of unnecessary complexity (RUC — lower is
better)** · **Current need (CN)**.

| Candidate area | UV | DTS | AC | OLF | RUC (lower=better) | CN | Verdict |
|---|---|---|---|---|---|---|---|
| Numeric input / stepper ergonomics for TRAIN | 5 | 3 | 5 | 5 | 1 | 5 | **HARVEST NOW** |
| Component/design-system primitives (typed Card/Button/Chip/etc.) | 4 | 4 | 5 | 5 | 2 | 4 | **HARVEST NOW** |
| Component-render / visual-regression testing tool | 3 | 3 | 5 | 5 | 2 | 4 | **HARVEST NOW** |
| Accessibility auditing tool (automated axe-style CI check) | 3 | 4 | 5 | 5 | 1 | 3 | **HARVEST NOW** |
| Local full-text search (Capture/History) | 2 | 3 | 5 | 5 | 2 | 2 | **RESEARCH** |
| Command-palette / quick-action UI pattern | 3 | 3 | 4 | 5 | 3 | 2 | **RESEARCH** |
| Bottom-sheet / gesture interaction primitives | 3 | 2 | 4 | 5 | 3 | 2 | **RESEARCH** |
| Client-side routing library | 2 | 2 | 3 | 5 | 3 | 1 | **DEFER** |
| Offline-strategy hardening (explicit cache routing beyond `generateSW` defaults) | 2 | 2 | 4 | 5 | 2 | 1 | **DEFER** |
| General animation/motion library | 1 | 1 | 3 | 5 | 4 | 1 | **DO NOT HARVEST** |
| Charting/visualization library (user-facing) | 3 | 3 | 3 | 5 | 3 | **0 (doctrine-blocked)** | **DO NOT HARVEST** (until/unless the standing "no trend charts" decision is itself revisited by the owner) |
| Calendar/scheduling integration library | 2 | 2 | 2 | 4 | 4 | **0 (doctrine-blocked)** | **DO NOT HARVEST** |
| AI/LLM-based interpretation of check-in data | varies | varies | 1 | varies | 5 | **0 (doctrine-blocked)** | **DO NOT HARVEST** without an explicit product decision first |
| General-purpose event-sourcing framework | 1 | 1 | 2 | 4 | 5 | 0 | **DO NOT HARVEST** |
| General form-library (Formik/RHF-class) | 2 | 2 | 3 | 5 | 3 | 1 | **DEFER** — current forms are simple enough that this would add more ceremony than it saves today |

---

## 9. Protected BEYOND Core

Any harvested technology is evaluated **against this list first**. If a
proposed integration requires compromising any item below, it needs an
explicit owner decision before implementation — it is not an engineering
call.

- **Local-first / offline-first.** No backend exists or is planned. Every
  persistence operation is IndexedDB via Dexie, on-device.
- **Deterministic Engine authority.** `capacity.ts` is explicitly locked
  against replacement by a weighted score or AI interpretation without an
  explicit product decision. This is the single most load-bearing
  doctrine statement in the codebase.
- **INFORM → INTERPRET → RECOMMEND → USER DECIDES.** Every recommendation
  is issued, then separately, explicitly recorded as accepted/declined/
  acknowledged. Nothing auto-applies a recommendation.
- **Event/history truth.** BEYOND stores what happened, not a
  reinterpretation of it. `HydrationEntry` and its siblings are
  explicitly documented as *derived, not stored* — this pattern (walk
  the raw event stream at read time) is fundamental, not incidental.
- **`occurredAt` vs `recordedAt` semantics.** The domain model carries
  both fields distinctly on every event, but **the current write path
  sets them identically at every call site** — there is no backdating UI
  anywhere. This is a real, present gap between the model's stated
  intent and current behavior: the *distinction itself* is protected
  (never collapse the two fields into one), but the current
  *implementation* doesn't yet exercise the distinction. Any harvested
  tool that assumes these are always equal would be building on a
  currently-true-but-not-guaranteed-forever fact.
- **Correction chains.** Never mutate a logged fact. A correction is a
  new event that supersedes the current chain HEAD; the original always
  survives. This is enforced today by application-layer checks
  (`STALE_CORRECTION_TARGET`, `NO_OP_CORRECTION`) — genuinely protective,
  not just documented.
- **Backup compatibility.** Two formats must both keep working: the
  native `dexie-export-import` one (which BEYOND writes) and the
  historical `BEYOND_BACKUP` one (which BEYOND only ever reads). Neither
  may be broken by future work.
- **Existing historical fixtures.** The two files in
  `test-fixtures/protected/` are real recovered data, hash-verified on
  every test run. Never edit, reformat, or regenerate them.
- **`BeyondDay` wake→sleep semantics.** A day is not a calendar date. It
  starts on the first meaningful action (or explicit START DAY) and ends
  only via explicit END DAY (or an auto-close fallback when a new day
  starts while one is still ACTIVE). Calendar midnight is explicitly
  rejected as a boundary — this is what makes overnight-shift semantics
  work at all.
- **Manual input availability.** Every quick-action/fast-path
  (quick-add water, "same as last," exact-repeat set) must always sit
  alongside a manual entry path, never replace it.
- **Provider independence.** No Gmail/Calendar/external-account
  integration exists or should be assumed available.
- **Phone-first operation.** This is the explicitly stated primary target
  platform; any harvested UI pattern must work at real narrow-Android
  widths, not just "responsive" in the abstract.
- **One-primary-recommendation doctrine.** TODAY shows one recommendation
  at a time with one clear next action — this is a repeatedly reaffirmed
  design decision (most recently the subject of this session's own
  Phase 18 correction), not incidental simplicity.
- **Existing locked identity assets.** The Abstract-B mark and the six
  locked pilot icons (`mission`/`train`/`body`/`reset`/`shiftDown`/
  `success`) must never be redrawn or reinterpreted — only genuinely new,
  additive icons (like this session's `more`) are in scope.

---

## Top 10 External Research Questions

1. What lightweight patterns exist for **direct numeric-keyboard entry
   with inline +/- affordance** (not a full form library) that would fit
   a small React app with no state-management framework?
2. What is the smallest reasonable path to a **typed component layer**
   (Card/Button/Chip/Banner) for a CSS-utility-class + inline-style
   codebase this size, without adopting a full component library that
   brings its own design language?
3. What component-render/visual-regression testing approach best fits a
   Vitest + Node (no jsdom currently) + React 19 stack, given the
   project's stated preference for minimal dependencies?
4. What automated accessibility-auditing tooling integrates cleanly into
   a GitHub Actions CI pipeline that currently only runs
   `tsc -b && vitest run && vite build`?
5. Are there proven, minimal local full-text-search approaches (not a
   full search-engine dependency) suited to searching a few hundred to
   low-thousands of small text records already resident in memory (as
   Capture/History currently are)?
6. What is the current best practice for a **command-palette pattern**
   in a React app with no existing routing library and a small, fixed
   set of user-facing actions?
7. How do mature single-user, local-first personal apps (task managers,
   journaling apps, habit trackers) handle **visual hierarchy and
   progressive disclosure** on a single "today" surface that must show
   multiple simultaneously-relevant subsystems without feeling like a
   dashboard wall — this is BEYOND's single largest current UX gap.
8. What are the tradeoffs of introducing a lightweight client-side router
   at this project's current scale (5 screens, 1 level of sub-nav) versus
   deferring further — specifically, what's the actual point (screen
   count, nesting depth) past which the current hand-rolled tab-state
   approach becomes a real liability rather than appropriately simple?
9. What proven approaches exist for **bottom-sheet or gesture-based
   interaction primitives** on mobile web (not native) that respect a
   "phone-first, no native app wrapper" constraint?
10. Given BEYOND's protected `occurredAt`/`recordedAt` distinction exists
    in the schema but isn't yet exercised (both always identical today),
    what UX/product patterns from other event-sourced personal-data apps
    exist for **eventually supporting backdated/late-logged entries**
    without compromising the existing correction-chain and historical-
    truth guarantees?

---

## Top 5 Highest-Potential Leverage Areas

1. **Numeric input ergonomics for TRAIN.** Named, specific, owner-verified
   friction. Lowest risk, clearest scope, most direct near-term win
   available in this entire report.
2. **A real component/design-system layer.** The single highest-leverage
   structural investment — collapses BODY's 4x-duplicated interaction
   pattern, gives the compiler a way to catch misuse, and would make
   every future screen (including any Harvest-sourced feature) faster
   and safer to build.
3. **TODAY's visual hierarchy/progressive disclosure**, informed by
   external research into how mature single-user apps solve "many
   simultaneously-true things, one clear next action." This is the
   owner's #1 named pain point and the one with the least clear internal
   answer — genuinely worth external research, not just more internal
   iteration.
4. **Component-render/visual-regression testing.** Closes a real, present
   verification gap (this session's entire UI-restructuring work had
   zero automated coverage of actual rendered output) without touching
   the extensive and well-functioning logic/integration test suite that
   already exists.
5. **Automated accessibility auditing.** Currently 100% manual, already
   has a real, specific, testable rule in place (16px minimum font) that
   an automated tool could regression-protect for free.

---

## Things We Should Explicitly NOT Harvest

- **Anything that touches or replaces `capacity.ts` or the Engine's rule
  evaluation** — locked, and locked for a stated reason (explainability,
  determinism). No scoring model, no ML classifier, no "smart"
  reinterpretation layer.
- **A general-purpose event-sourcing framework.** BEYOND's own ~150-line
  implementation is simpler and more precisely fit than adopting one
  would be at this scale.
- **A general animation/motion library.** The existing bespoke one-shot
  system is small, correct, and doctrine-aligned; a library would add
  weight and a new authoring model to replace something that already
  works.
- **Any charting/trend-visualization library aimed at user-facing
  BODY/TRAIN charts** — this is a standing, explicitly out-of-scope
  product decision (not a technical limitation), and adopting the
  library would create pressure to use it for exactly the thing that's
  currently forbidden.
- **Any calendar/Gmail/external-provider integration**, or any library
  whose main value proposition is that kind of integration — explicitly
  out of current scope.
- **Any AI/LLM feature that would interpret, summarize, or auto-act on
  personal state data** without an explicit prior product decision — this
  cuts directly against the Engine-authority and user-decides doctrines.
- **A full client-side routing library, right now.** Premature at 5
  screens; revisit only if screen count/nesting genuinely grows (see
  Debt Map's theoretical-concern section).
- **A full form-management library** (Formik/React-Hook-Form-class) for
  the current form surfaces — they are simple enough today that the
  library's ceremony would cost more than it saves. Revisit only if
  form complexity genuinely grows (e.g. many more validated fields per
  screen).

---

## Verification Results

All run fresh, against the final repository state, before this report was
written.

| Check | Result |
|---|---|
| `npm run typecheck` (`tsc -b`) | **Clean.** No errors. |
| `npm test` (`vitest run`, full suite) | **460/460 tests passing, 43/43 test files.** |
| `fixtureIntegrity.test.ts` (explicit re-run) | **4/4 passing** — both protected historical backup fixtures' SHA-256 hashes unchanged. |
| `npm run build` (`tsc -b && vite build`) | **Succeeds.** Output: `dist/assets/index-*.js` (536.68 kB), `index-*.css` (6.53 kB), PWA service worker generated. One pre-existing chunk-size warning (>500kB), unrelated to any change this session. |
| `npm outdated` (dependency inspection) | 5 of 13 packages have newer patch/minor versions available (`vite`, `@vitejs/plugin-react`, `vitest`, `@types/node` behind on majors for types-only). One anomalous-looking major jump reported for `typescript` (5.9.3 → registry-reported 7.0.2) — flagged for verification before ever acting on it, not assumed genuine. **Nothing upgraded**, per instruction. |
| `git status` | **Clean working tree.** |
| Current HEAD | `95a9670fce6ddae7e2067da4863a5a0923f8630e` on `master`, up to date with `origin/master`. |

No browser or real-device verification was performed for this audit — it
is a static, evidence-based repository analysis, not a UI check.

---

## Exact Current Commit / Deployment State

- **Commit:** `95a9670fce6ddae7e2067da4863a5a0923f8630e`
- **Branch:** `master` (up to date with `origin/master`)
- **Deployment:** GitHub Pages, auto-deployed on push to `master` via
  `.github/workflows/deploy-pages.yml`; base path `/neo-beyond-lohnes/`.
- **Last shipped functional change:** Overdrive Phase 18 (real-device
  acceptance correction — phone-width gutter, active-mode dominance,
  TRAIN execution-UX layout, TODAY progressive disclosure, BODY
  glanceability, typography contrast pass).
- **Working tree:** clean, nothing staged or modified.

---

## Addendum — Harvest Dependency Register (Harvest Implementation 001, Checkpoint 6)

Recorded for future use. **None of these are installed.** Version/license
facts below were checked against the npm registry on the date of this
addendum — re-verify before actually adopting any of them, since this is
a point-in-time record, not a standing guarantee.

### MiniSearch
- **Registry:** `minisearch@7.2.0`, MIT license, zero runtime
  dependencies.
- **Preferred first candidate when Personal Search is formally
  promoted** (per this checkpoint's explicit instruction). **Not built
  this sprint** — Personal Search itself is out of scope.
- Why it's the right shape for BEYOND specifically: it indexes an
  in-memory array of plain objects (exactly what `getAllCaptureItems()`/
  `getHistoryDays()` already return) with no server, no persistence
  layer of its own, and no schema migration story to reconcile with
  BEYOND's own — a local-first-native fit, not an integration project.

### Base UI vs. Radix (accessible interaction primitives — drawers/dialogs/popovers)
- **Base UI:** `@base-ui-components/react@1.0.0-rc.0`, MIT. Still a
  release candidate, not yet a stable 1.0 — worth re-checking maturity
  before adoption.
- **Radix:** `@radix-ui/react-dialog@1.1.23` (representative primitive),
  MIT. Stable, widely deployed, unbundled (each primitive is its own
  package).
- **Both are candidates only** for whichever future BEYOND interaction
  genuinely requires non-trivial custom focus-trap/keyboard/mobile-
  overlay machinery that would otherwise mean hand-building that
  machinery from scratch. **Do not install either until that real
  interaction need arrives** — nothing in the current app (a bottom tab
  bar, cards, `<details>`, plain buttons/inputs) needs one today. When
  the need arrives: a one-component bakeoff (implement the same real
  BEYOND interaction against both), then pick one ecosystem — never
  both side by side.

### Lucide
- **Registry:** `lucide-react@1.33.0`, ISC license, peer range
  `react: ^16.5.1 || ^17 || ^18 || ^19` — confirmed compatible with the
  installed React 19.2.8.
- May supply **commodity icons** where a genuinely generic glyph is
  needed (e.g. a settings gear, a generic chevron) — never for anything
  BEYOND-specific.
- **Hard boundary, restated:** must never replace the locked Abstract-B
  mark, the six locked pilot icons (`mission`/`train`/`body`/`reset`/
  `shiftDown`/`success`), or any other deliberately BEYOND-specific
  system symbol (including the additive `more` icon and the angular/
  diamond visual grammar). Those stay hand-drawn inline SVG, forever,
  regardless of what this library offers.

### Sonner
- **Registry:** `sonner@2.0.8`, MIT license, peer range
  `react: ^18 || ^19 || ^19-rc` — confirmed compatible with the
  installed React 19.2.8.
- **Adopt only if transient success/error notification duplication
  becomes a demonstrated problem** — i.e., if a future checkpoint finds
  itself hand-rolling a third or fourth ad hoc toast/banner pattern
  (BODY's `ConfirmBanner`-shaped confirmations and TODAY's own banners
  already cover the current, small need without it). **No speculative
  install.**

**Verification for this addendum:** read-only `npm view` registry
queries only — nothing installed, nothing added to `package.json`,
`node_modules` unchanged.
