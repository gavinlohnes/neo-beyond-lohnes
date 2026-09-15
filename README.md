# BEYOND

A local-first, offline-capable daily state and training coach. BEYOND
tracks what actually happened each day (check-ins, sleep, water, protein,
bodyweight, workouts) as an event-sourced history, and a deterministic
Engine turns that history into one recommendation at a time — never a
black box, every recommendation carries a full WHY trace.

All data lives on-device in IndexedDB. There is no backend and no
account system; getting data off the device is an explicit, user-
initiated backup export.

## Run it

```
npm install
npm run dev
```

Then open the printed local URL. Other scripts:

```
npm run build       # typecheck (tsc -b) + production build (vite build)
npm run preview      # serve the production build locally, for a real
                      # cold-start measurement on port 5173
npm run typecheck    # tsc -b only
npm test             # vitest run — full suite, single pass
npm run test:watch   # vitest, watch mode
```

## Architecture

Strict layering, documented as convention and mechanically checked by
`npm run check:architecture`. The checker enforces the critical import
directions described below; two pre-existing UI-to-persistence imports
(`TodayScreen.tsx` and `MoreScreen.tsx`) are explicitly grandfathered,
not treated as the preferred pattern for new code:

- **`src/domain`** — pure domain types and workout definitions/helpers
  (`BeyondDay`, `StateCheckIn`, `Recommendation`, `DomainEvent`, workout
  templates). No React, no Dexie, no application or persistence I/O.
- **`src/engine`** — deterministic, side-effect-free rule evaluation.
  Same inputs always produce the same output, with a full
  `DecisionTrace` on every recommendation. UI and persistence never
  re-implement engine logic themselves.
  - `capacity.ts` — the locked GREEN/YELLOW/RED capacity rule from a
    state check-in.
  - `evaluate.ts` — turns capacity (+ planned work) into a
    `Recommendation` with trace.
  - `redOverride.ts` — the RED-tier override-confirmation gate.
  - `scheduledContext.ts` — derives a *suggested* work-schedule phase
    from the locked Week A/B pattern; never reads/writes persisted
    state (prediction is not fact — only `setWorkContext` in
    `application/commands.ts` can change the real, confirmed
    `workContext`).
  - `trainSuggestion.ts` — capacity-driven session-variant suggestion
    (RED→RESET, YELLOW→REDUCED, GREEN→STANDARD), user-overridable.
  - `progression.ts` — per-exercise INCREASE/HOLD/REDUCE advisory,
    never auto-applied.
  - `obligationRelevance.ts` — classifies Obligations into a relevance
    tier (OVERDUE/DUE_TODAY/DUE_SOON/PLANNED_TODAY/WAITING/QUIET). A
    parallel interpretation layer, not part of `evaluate.ts`'s
    arbitration — Obligations do not yet participate in primary
    recommendation arbitration.
  - `obligationEligibility.ts` — a second parallel interpretation layer:
    whether an already-unresolved Obligation is *currently* eligible to
    surface (an Obligation under an ARCHIVED Mission stays unresolved
    for management but drops out of TODAY/AdvisoryNotes).
  - `advisory.ts` — the Intelligence Spine: composes already-locked
    interpretation output (Obligation relevance, TRAIN progression,
    reviewed Decision Journal Lessons) into a shared, informational-only
    `AdvisoryNote` contract — never a `Recommendation`, never fed back
    into `evaluate.ts`.
  - `journalRelevance.ts` — pure keyword/fuzzy matching (MiniSearch)
    between reviewed Decision Journal entries and current Obligation/
    Mission titles, feeding `advisory.ts`'s journal producer.
  - `captureIntelligence.ts` — a confidence/abstention gate over
    chrono-node (date extraction) + Compromise (negation signal) for
    Capture→Obligation due-date suggestions; abstains rather than
    guesses on any ambiguity.
  - `recurrence.ts` — RFC 5545 recurrence semantics for Obligations, via
    `rrule.js`, wrapped behind BEYOND's own tests rather than trusted
    unquestioned.
  - `nutritionTargets.ts` — derives a daily calorie/protein target from
    configurable settings plus the latest bodyweight; advisory only.
  - `checkInReminder.ts` — the pure decision of whether an on-device
    check-in reminder notification is due right now, given the
    operator's preference and today's check-in state.
- **`src/persistence`** — Dexie/IndexedDB (`db.ts`), backup export
  (`backup.ts`), restore with format detection (`restore.ts`), the
  historical-format compatibility importer (`compat/legacyBackup.ts`),
  and small localStorage-only operational bookkeeping (backup-reminder
  timestamp, outcome-rating dismissals, the check-in reminder
  preference/last-sent date — the Notification API call itself also
  lives here, alongside `backup.ts`'s own `navigator.share` call).
- **`src/application`** — commands (writes, one per user action) and
  queries (reads), one file per feature area (Intent & Commitment,
  TRAIN, Nutrition, Journal, Search, Review, Reminder, …). New UI data
  access routes through `application/*`; the two grandfathered direct
  persistence imports (`TodayScreen.tsx`, `MoreScreen.tsx`) are
  documented, may not gain further new persistence imports, and are
  constrained by the architecture checker.
- **`src/ui/components`** — a small shared component layer
  (`ConfirmBanner`, `FieldDisclosure`, `CollapsibleRow`, `SignalRow`,
  `CommandSurface`, `RootErrorBoundary`) reused across TODAY/TRAIN/BODY
  instead of each screen hand-repeating the same confirm/disclosure/
  collapse pattern.
- **`src/ui/screens`** — TODAY, TRAIN, BODY, MORE (primary navigation)
  plus HISTORY, REVIEW, SEARCH, Missions & Obligations, Work Schedule,
  Decision Journal, Exercise Library, and Custom Programs, all nested
  under MORE (see below).

## Screens

Primary navigation is **TODAY / TRAIN / BODY / MORE**, per the Decision
Register (Product Experience Sprint, P1 — an earlier build had briefly
added HISTORY as a fifth primary tab; that was a placement error, now
corrected. HISTORY itself, its queries, and its tests are unchanged).

- **TODAY** — start/end the day, state check-in, the current
  recommendation with its WHY trace, RESET / SHIFT DOWN guided flows,
  work-context confirmation.
- **TRAIN** — A/B/C rotation-based workouts. Per-exercise last
  weight/reps plus a plain-language INCREASE/HOLD/REDUCE advisory, fast
  substitution from recently-used alternates, neutral stop-workout
  wording with an inline explanation of PARTIAL's rotation impact, and
  confirmed resume-after-reload for an in-progress session.
- **BODY** — sleep (PRIMARY/SUPPLEMENTAL), water, protein, bodyweight,
  and meal logging (saved presets, optional USDA FoodData Central
  lookup that only pre-fills the manual form — nothing is saved until
  reviewed), all correctable in place via a correction-chain (original
  event untouched, a `*_CORRECTED` event supersedes it, queries resolve
  the head of the chain) with on-screen confirmation and immediate
  undo. Calorie/protein targets are configurable, advisory only.
- **MORE** — backup export/share, restore (preview-before-write,
  replace-only), backup-reminder banner, an opt-in on-device check-in
  reminder (Web Notification, no push/backend — see Reminders below),
  app/engine/schema diagnostics (see Versions below), and access to
  HISTORY, REVIEW, SEARCH, Missions & Obligations (Intent & Commitment
  Spine), Work Schedule, Decision Journal, Exercise Library, and Custom
  Programs.
- **HISTORY** (nested under MORE) — read-only, complete: every
  `BeyondDay` and every event on it, chronological within the day,
  most-recent-day-first, collapsed per day by default.
- **REVIEW** (nested under MORE, `ReviewScreen.tsx`) — a read-only
  Recommendation ledger: what BEYOND recommended, what the operator
  decided, and how it went. Sibling to HISTORY, not a replacement —
  never shows AdvisoryNotes or aggregates/trends anything.
- **SEARCH** (nested under MORE, `SearchScreen.tsx`) — ranked
  fuzzy/prefix lexical search (MiniSearch) over Mission/Obligation/
  Capture text, disposable and rebuilt from Dexie on every call. Tap a
  result to navigate to its management context.
- **Missions & Obligations** (nested under MORE, `IntentScreen.tsx`) —
  dedicated deep management for the Intent & Commitment Spine, separate
  from TODAY's own lightweight "one most-relevant commitment" surfacing.
  Obligations support RFC 5545 recurrence (`rrule.js`).
- **Work Schedule** (nested under MORE, `WorkScheduleScreen.tsx`) —
  configures the Week A/B rotation pattern `scheduledContext.ts` derives
  its (non-authoritative) work-phase suggestion from.
- **Decision Journal** (nested under MORE, `JournalScreen.tsx`) —
  Context → Options → Decision → Reasoning → Expectation, recorded now;
  Outcome → Lesson, recorded later. General-purpose, not limited to
  BEYOND's own Recommendations. A reviewed entry's Lesson may resurface
  as a read-only TODAY advisory note when its text overlaps a current
  Obligation or Mission title — informational only, never an Engine
  input.
- **Exercise Library** (nested under MORE, `ExerciseLibraryScreen.tsx`)
  — a personal, directly-mutable exercise list (from a hand-curated
  reference set or fully custom), independent of the fixed A/B/C
  templates.
- **Custom Programs** (nested under MORE, `CustomTemplateScreen.tsx`) —
  assembles saved exercises into a selectable workout template,
  alongside the fixed A/B/C templates. Per-exercise progression
  increments derive from equipment/muscle group, not one flat number.
- **Reminders** (a section within MORE's own menu, not a separate
  screen) — an opt-in toggle + hour picker for the on-device check-in
  notification described above.

Full behavioral rationale for all of the above — what's locked, why,
and what NOT to change without sign-off — lives in
[docs/UX_DECISIONS.md](docs/UX_DECISIONS.md).

## Versions & lineage

BEYOND has been rebuilt from scratch, in chat, more than once. The
*current* rebuild (this codebase) tracks its own version numbers,
separate from an earlier, no-longer-running "real" app instance that
reached its own further version before being lost and partially
recovered from two exported backups. **These are two different
lineages that happen to share some version numbers by coincidence —
they are not the same sequence.** This distinction matters because it's
the whole reason a second backup format exists (see below).

| | This codebase (current) | Historical app (recovered fixtures only) |
|---|---|---|
| App version | `0.1.0` — `package.json`'s `version`, the single source (`APP_RELEASE` in [buildInfo.ts](src/app/buildInfo.ts)) | `0.1.0` → `0.2.0` (per fixture metadata) |
| Engine version | `0.1.0` (`ENGINE_VERSION` in [evaluate.ts](src/engine/evaluate.ts); stamped onto every `Recommendation.trace`) | n/a (not preserved in fixtures) |
| Data schema | `11` (Dexie schema — see Migration behavior) | `2` → `3` (per fixture metadata; different numbering scheme, same numbers by coincidence) |
| Backup format | `dexie-export-import` native (`format: "dexie"`) | `BEYOND_BACKUP`, `formatVersion: 1` |

App/Engine version are deliberate, human-bumped identities — see the paragraph above on why the
number itself carries lineage meaning. Neither is a build indicator: since this app ships as one
atomic bundle, "what's actually deployed right now" is answered separately by **Build**, shown
alongside App/Engine in MORE → SYSTEM (`BUILD_COMMIT`/`BUILD_TIME` in
[buildInfo.ts](src/app/buildInfo.ts)) — the short git commit and build timestamp, both derived
automatically at build time (`vite.config.ts`'s `define`), never hand-maintained, and immune to
the "forgot to bump it" drift that App/Engine are inherently subject to.

The historical app no longer runs; nothing in this repo executes its
code. What survives is two real backup exports it produced, preserved
read-only as compatibility fixtures at
[test-fixtures/protected/](test-fixtures/protected/MANIFEST.md) — never
edit, reformat, or regenerate those files; `fixtureIntegrity.test.ts`
fails the suite if either one's SHA-256 changes.

Because those are real historical exports someone may still want to
restore from, this codebase's restore path
([persistence/restore.ts](src/persistence/restore.ts)) supports
**reading both formats**: it sniffs `format: "BEYOND_BACKUP"` first and
routes to the legacy importer
([persistence/compat/legacyBackup.ts](src/persistence/compat/legacyBackup.ts)),
falling back to its own native `dexie-export-import` format otherwise.
Going forward, this app **only ever writes** its own native format —
the legacy format is read-only compatibility, never produced.

## Migration behavior

**Dexie schema** (`src/persistence/db.ts`), all additive, no data loss
across versions:
- **v1** — `beyondDays`, `events`, `checkIns`, `recommendations`.
- **v2** — adds `outcomes`, `workoutSessions`, `performedSets`, to
  faithfully reconstruct the real historical fixtures (which include
  these record types even though TRAIN didn't exist yet in this
  codebase at that point).
- **v3** — adds `sessionId`/`exerciseId` indexes to `performedSets`,
  once TRAIN gave that table a real, confirmed shape. v1/v2 tables and
  data are untouched by this change.
- **v4** (Drop 02a, Daily Intelligence/Context) — adds `schedulePatterns`
  (single-row work-rotation config), seeded via `.upgrade()` with a
  default pattern so existing predictions are unchanged across the
  migration.
- **v5** (Overdrive Phase 10) — adds `captureItems` ("capture first,
  organize second"), purely additive.
- **v6** (Intent & Commitment Spine, Drop 01) — adds `missions` and
  `obligations`, plus optional `missionId`/`obligationId` indexes on the
  existing `events` table.
- **v7** (Meal Memory) — adds `savedMeals`, a directly-mutable personal
  preset, purely additive.
- **v8** (Decision Journal, Whole-Life Capability North Star / DEC-007)
  — adds `decisionJournalEntries` plus a `decisionJournalEntryId` index
  on `events` for its historical trail, mirroring v6's pattern.
- **v9** (Personal Exercise Library) — adds `customExercises`, a small
  directly-mutable personal exercise definition, independent of the
  fixed A/B/C `workoutSessions`/`performedSets` tables.
- **v10** (Custom Workout Templates) — adds `customWorkoutTemplates`,
  same directly-mutable treatment as `customExercises` at v9.
- **v11** (Calorie + Protein Targets) — adds `nutritionTargets`, a
  single mutable settings row seeded via `.upgrade()` with a default
  (no calorie target, 1.0 g/lb protein multiplier) so every install
  always has a real row to read.

**Restore is always replace-only.** Both the native and legacy import
paths clear existing tables before writing (`clearTablesBeforeImport`,
default `true`) — there is no merge-with-existing-data path, by design
(see [docs/UX_DECISIONS.md](docs/UX_DECISIONS.md#backup--restore--archival)).
Every restore path validates and builds a preview (row counts, dates,
format) *before* any write; nothing is written until the caller
explicitly confirms.

The legacy `BEYOND_BACKUP` format has no separate `checkIns` array —
this codebase derives one at import time from `STATE_CHECKED_IN` events
in the imported payload, since its own write path always produces both.

## Testing

```
npm test
```

106 files / 1,342 tests, 1 skipped, at the verified baseline commit
`71d2e71` (81 files / 993 tests in the Node project; 25 files / 349
tests in the browser project). Re-verify with a fresh `npm run verify`
rather than trusting this count as it ages. See `vitest.config.ts`. The "node" project (everything
below except `tests/browser`) runs in a plain Node environment — no jsdom,
`fake-indexeddb` standing in for IndexedDB; see `tests/setup.ts` for the
polyfills this requires, notably that `vi.useFakeTimers()` must be
scoped to `{ toFake: ["Date"] }` or it deadlocks `fake-indexeddb`'s
internal scheduling. The "browser" project (`tests/browser/*.test.tsx`,
`npm run test:browser`) renders against a real headless Chromium via
Playwright, and is where UI/accessibility (`axe-core`) assertions live.

- `tests/engine`, `tests/ui`, `tests/persistence`, `tests/compat` —
  unit tests near the layer they cover.
- `tests/integration` — cross-layer scenarios, including
  `stabilizationRegressionSuite.test.ts` (the permanent regression
  suite covering lazy day creation, GREEN/YELLOW/RED flows, overnight
  shifts, correction chains, concurrent-submission edge cases,
  storage-failure handling, and long-history correctness) and
  `performanceBenchmarks.test.ts` (30/90/365-day timing at the query
  layer).
- `tests/browser` — real-Chromium UI tests (Vitest Browser Mode +
  `vitest-browser-react`), including accessibility (`axe-core`) checks
  against the actually-rendered DOM.
- `tests/helpers/generateHistory.ts` — shared realistic-history
  generator, reused by both of the above.
- `test-fixtures/protected/` — real historical backup exports, read-only,
  hash-verified. See its own [MANIFEST.md](test-fixtures/protected/MANIFEST.md).

## Known limitations

- **Concurrency guards are single-tab only.** `ensureActiveDay()` and
  `startWorkout()` (Product Experience Sprint, Phase 0) both use an
  in-process in-flight-promise guard to prevent duplicate ACTIVE rows
  from calls racing within one JS context — see
  `tests/integration/stabilizationRegressionSuite.test.ts` for the
  regression coverage. This does not protect against two different
  browser tabs writing at the same instant; that's a materially larger
  problem (would need the Web Locks API or an IndexedDB-transaction-based
  cross-tab mutex) and isn't reachable through any normal single-tab
  usage, so it's out of scope unless it's ever actually observed.
- **The check-in reminder is not true background push.** It's a real
  on-device Web Notification, but the check that decides whether one is
  due only ever runs when the app is opened/reloaded — there is no
  Periodic Background Sync or Push subscription, so a day the app is
  never opened gets no reminder at all. Deliberate, not a bug.

## Explicitly out of scope

BATCAVE, trend charts, and any AI/learning layer over workout data.
These need direct product sign-off and, for the learning layer, real
workout data volume that doesn't exist yet — do not infer scope for
them from adjacent code.
