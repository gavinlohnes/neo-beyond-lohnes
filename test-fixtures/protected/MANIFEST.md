# Protected historical backup fixtures

These are real, application-owned BEYOND backup exports recovered during the
2026-08-18 recovery effort. They are **compatibility evidence, not sample
data**. Never edit, reformat, pretty-print, or regenerate these files. If a
test needs a mutated variant (e.g. a corrupted/forked correction chain), copy
the JSON into a synthetic fixture elsewhere — never modify these in place.

File mode is set read-only (444) as a guard, not a guarantee; the real
guarantee is `fixtureIntegrity.test.ts`, which fails the suite if either
file's SHA-256 ever changes.

## Fixture A — `beyond-backup-2026-08-17T23-15-09-360Z.json`

- App 0.1.0, data schema 2, backup format 1
- Exported 2026-08-17T23:15:09.360Z
- Size: 62,028 bytes
- SHA-256: `8818f6e7e8c6a23d2c89b148c7975176f9f2314af3e4178c1a66ec34a496a8db`
- Contents: 1 BeyondDay / 69 events / 15 recommendations / 5 outcomes /
  0 workoutSessions / 0 performedSets

## Fixture B — `beyond-backup-2026-08-18T06-33-36-443Z.json`

- App 0.2.0, data schema 3, backup format 1
- Exported 2026-08-18T06:33:36.443Z
- Size: 73,513 bytes
- SHA-256: `a5bb46f1b1da5070f55f1c255812235ba33e643a41f9af176dfccbb0e9481c15`
- Contents: 1 BeyondDay / 85 events / 16 recommendations / 6 outcomes /
  1 workoutSession (STANDARD template A, ABANDONED) / 0 performedSets
- Contains one hydration correction chain: original WATER_LOGGED 13oz,
  corrected via WATER_LOG_CORRECTED to effective 17oz.

Both fixtures share the same underlying `beyondDayId`
(`31014bdb-f21b-40bf-aed5-07e97d1f346f`) — Fixture B is a later export of
the same continuing BeyondDay, with more events accumulated (water logging,
a workout, and the hydration correction all happened between the two
exports). Each is nonetheless a complete, self-contained `BEYOND_BACKUP`
snapshot and must be importable independently.

## Real backup format (confirmed by direct inspection, 2026-08-18)

Both fixtures use a custom application-owned format, **not** the
`dexie-export-import` format that checkpoint 03's own `backup.ts` currently
produces/consumes:

```
{
  format: "BEYOND_BACKUP",
  formatVersion: 1,
  exportedAt: string,
  appVersion: string,
  dataSchemaVersion: number,
  payload: {
    meta: { key: string; value: unknown }[],
    beyondDays: BeyondDay[],
    events: DomainEvent[],
    recommendations: Recommendation[],
    outcomes: Outcome[],
    workoutSessions: WorkoutSession[],
    performedSets: PerformedSet[],
  }
}
```

This is the reason a separate historical-compatibility importer exists at
`src/persistence/compat/legacyBackup.ts` instead of pointing
`dexie-export-import` at these files directly — see recovery briefing
"START HERE — CLAUDE CODE BRIEFING", RECOVERY COMPATIBILITY LOCK step 6.

## Confirmed discrepancy vs. checkpoint 03's own event shape

Real `WATER_LOG_CORRECTED` events use payload fields `originalEventId` +
`supersedesEventId`. Checkpoint 03's own `correctWater` command wrote a
different placeholder field, `correctsEventId`. This has been reconciled in
`src/application/commands.ts` to match the confirmed historical shape (see
git history) — the real evidence outranks the placeholder reconstruction
per the recovery briefing's authority order.
