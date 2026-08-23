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
- **`src/persistence`** — Dexie/IndexedDB (`db.ts`), backup export
  (`backup.ts`), restore with format detection (`restore.ts`), and the
  historical-format compatibility importer (`compat/legacyBackup.ts`).
- **`src/application`** — commands (writes, one per user action) and
  queries (reads). New UI data access routes through `application/*`;
  the two grandfathered direct persistence imports are documented and
  constrained by the architecture checker.
- **`src/ui/screens`** — TODAY, TRAIN, BODY, MORE (primary navigation)
  plus HISTORY, nested under MORE (see below).

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
- **BODY** — sleep (PRIMARY/SUPPLEMENTAL), water, protein, and
  bodyweight logging, all correctable in place via a correction-chain
  (original event untouched, a `*_CORRECTED` event supersedes it,
  queries resolve the head of the chain) with on-screen confirmation
  and immediate undo.
- **MORE** — backup export/share, restore (preview-before-write,
  replace-only), backup-reminder banner, app/engine/schema diagnostics
  (see Versions below), and access to HISTORY, Missions & Obligations
  (Intent & Commitment Spine), and Work Schedule.
- **HISTORY** (nested under MORE) — read-only, complete: every
  `BeyondDay` and every event on it, chronological within the day,
  most-recent-day-first, collapsed per day by default.
- **Missions & Obligations** (nested under MORE, `IntentScreen.tsx`) —
  dedicated deep management for the Intent & Commitment Spine, separate
  from TODAY's own lightweight "one most-relevant commitment" surfacing.
- **Work Schedule** (nested under MORE, `WorkScheduleScreen.tsx`) —
  configures the Week A/B rotation pattern `scheduledContext.ts` derives
  its (non-authoritative) work-phase suggestion from.

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
| Data schema | `6` (Dexie schema — see Migration behavior) | `2` → `3` (per fixture metadata; different numbering scheme, same numbers by coincidence) |
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

68 files / 706 tests at the verified baseline commit `6a6391e`
(50 files / 559 tests in the Node project; 18 files / 147 tests in the
browser project). See `vitest.config.ts`. The "node" project (everything
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

## Explicitly out of scope

BATCAVE, trend charts, and any AI/learning layer over workout data.
These need direct product sign-off and, for the learning layer, real
workout data volume that doesn't exist yet — do not infer scope for
them from adjacent code.
