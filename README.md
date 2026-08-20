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
                      # cold-start measurement (see .claude/launch.json's
                      # "beyond-preview" config, port 4174)
npm run typecheck    # tsc -b only
npm test             # vitest run — full suite, single pass
npm run test:watch   # vitest, watch mode
```

## Architecture

Strict layering, enforced by convention (no framework-level boundary
yet, e.g. a lint rule forbidding cross-layer imports — nothing has
required one so far):

- **`src/domain`** — pure types only (`BeyondDay`, `StateCheckIn`,
  `Recommendation`, `DomainEvent`, workout types). No React, no Dexie,
  no application logic.
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
- **`src/persistence`** — Dexie/IndexedDB (`db.ts`), backup export
  (`backup.ts`), restore with format detection (`restore.ts`), and the
  historical-format compatibility importer (`compat/legacyBackup.ts`).
- **`src/application`** — commands (writes, one per user action) and
  queries (reads). The UI layer never touches Dexie directly, only
  `application/*`.
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
  (see Versions below), and access to HISTORY.
- **HISTORY** (nested under MORE) — read-only, complete: every
  `BeyondDay` and every event on it, chronological within the day,
  most-recent-day-first, collapsed per day by default.

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
| App version | `0.1.0` (`APP_VERSION` in [MoreScreen.tsx](src/ui/screens/more/MoreScreen.tsx)) | `0.1.0` → `0.2.0` (per fixture metadata) |
| Engine version | `0.1.0` | n/a (not preserved in fixtures) |
| Data schema | `3` (Dexie schema — see Migration behavior) | `2` → `3` (per fixture metadata; different numbering scheme, same numbers by coincidence) |
| Backup format | `dexie-export-import` native (`format: "dexie"`) | `BEYOND_BACKUP`, `formatVersion: 1` |

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

39 files / 379 tests as of this writing (Vitest, plain Node
environment — no jsdom, `fake-indexeddb` standing in for IndexedDB; see
`tests/setup.ts` for the polyfills this requires, notably that
`vi.useFakeTimers()` must be scoped to `{ toFake: ["Date"] }` or it
deadlocks `fake-indexeddb`'s internal scheduling).

- `tests/engine`, `tests/ui`, `tests/persistence`, `tests/compat` —
  unit tests near the layer they cover.
- `tests/integration` — cross-layer scenarios, including
  `stabilizationRegressionSuite.test.ts` (the permanent regression
  suite covering lazy day creation, GREEN/YELLOW/RED flows, overnight
  shifts, correction chains, concurrent-submission edge cases,
  storage-failure handling, and long-history correctness) and
  `performanceBenchmarks.test.ts` (30/90/365-day timing at the query
  layer).
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
