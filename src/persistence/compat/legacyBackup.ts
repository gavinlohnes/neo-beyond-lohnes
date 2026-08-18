import { z } from "zod";
import type { BeyondDB } from "../db";
import type {
  BeyondDay,
  DomainEvent,
  Outcome,
  PerformedSetRaw,
  Recommendation,
  StateCheckIn,
  WorkoutSession,
} from "../../domain/common/types";

/**
 * Historical compatibility importer for the real application-owned
 * BEYOND_BACKUP export format, confirmed by direct inspection of both
 * protected fixtures (test-fixtures/protected/). This is a distinct format
 * from checkpoint 03's own dexie-export-import-based backup.ts and must
 * stay that way — see RECOVERY COMPATIBILITY LOCK step 6 in the recovery
 * briefing ("do not alter the historical fixture ... implement a separate
 * historical compatibility importer/adapter at the boundary").
 *
 * Deliberately NOT wired into MoreScreen's restore UI in this checkpoint —
 * that's a UI decision for a later checkpoint. This module is exercised
 * directly by tests/integration/legacyBackupImport.test.ts.
 */

const metaEntrySchema = z.object({ key: z.string(), value: z.unknown() });

const beyondDaySchema = z
  .object({
    id: z.string(),
    startedAt: z.string(),
    timezoneId: z.string(),
    workContext: z.enum(["WORK", "OFF", "UNKNOWN"]),
    status: z.enum(["ACTIVE", "ENDED"]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

const domainEventSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    beyondDayId: z.string(),
    occurredAt: z.string(),
    recordedAt: z.string(),
    payload: z.unknown(),
    source: z.enum(["USER", "ENGINE", "SYSTEM"]),
    correlationId: z.string().optional(),
    causationId: z.string().optional(),
  })
  .passthrough();

const decisionTraceSchema = z
  .object({
    engineVersion: z.string(),
    evaluatedAt: z.string(),
    inputs: z.array(z.object({ key: z.string(), value: z.unknown() })),
    derived: z.array(z.object({ key: z.string(), value: z.unknown() })),
    matchedRules: z.array(
      z.object({ ruleId: z.string(), result: z.boolean(), reason: z.string() }),
    ),
    selectedRecommendation: z.string(),
    selectionReason: z.string(),
  })
  .passthrough();

const recommendationSchema = z
  .object({
    id: z.string(),
    beyondDayId: z.string(),
    issuedAt: z.string(),
    kind: z.string(),
    priority: z.number(),
    title: z.string(),
    rationale: z.string(),
    suggestedCommand: z.string().nullable(),
    trace: decisionTraceSchema,
    statusAtIssue: z.enum(["ACTION", "NO_ACTION"]),
  })
  .passthrough();

// Outcome carries either recommendationId or commandExecutionId in every
// observed fixture row (never both, never neither) — see
// domain/common/types.ts Outcome. Not enforced here as an XOR constraint
// because a future real export proving otherwise should not fail import.
const outcomeSchema = z
  .object({
    id: z.string(),
    beyondDayId: z.string(),
    recordedAt: z.string(),
    result: z.string(),
    recommendationId: z.string().optional(),
    commandExecutionId: z.string().optional(),
  })
  .passthrough();

const workoutSessionSchema = z
  .object({
    id: z.string(),
    beyondDayId: z.string(),
    templateId: z.string(),
    sessionType: z.string(),
    status: z.string(),
    startedAt: z.string(),
    endedAt: z.string().optional(),
  })
  .passthrough();

// performedSets has zero real examples in either fixture — see
// PerformedSetRaw in domain/common/types.ts. Only id/beyondDayId required.
const performedSetSchema = z
  .object({ id: z.string(), beyondDayId: z.string() })
  .passthrough();

const legacyBackupSchema = z.object({
  format: z.literal("BEYOND_BACKUP"),
  formatVersion: z.number(),
  exportedAt: z.string(),
  appVersion: z.string(),
  dataSchemaVersion: z.number(),
  payload: z.object({
    meta: z.array(metaEntrySchema),
    beyondDays: z.array(beyondDaySchema),
    events: z.array(domainEventSchema),
    recommendations: z.array(recommendationSchema),
    outcomes: z.array(outcomeSchema),
    workoutSessions: z.array(workoutSessionSchema),
    performedSets: z.array(performedSetSchema),
  }),
});

export type LegacyBackup = z.infer<typeof legacyBackupSchema>;

/** Cheap format sniff, before paying for full schema validation. */
export function isLegacyBackupFormat(json: unknown): boolean {
  return (
    typeof json === "object" &&
    json !== null &&
    (json as { format?: unknown }).format === "BEYOND_BACKUP"
  );
}

export function parseLegacyBackup(json: unknown): LegacyBackup {
  const result = legacyBackupSchema.safeParse(json);
  if (!result.success) {
    throw new Error(`INVALID_LEGACY_BACKUP: ${result.error.message}`);
  }
  return result.data;
}

export interface LegacyRestorePreview {
  format: "BEYOND_BACKUP";
  appVersion: string;
  dataSchemaVersion: number;
  exportedAt: string;
  tables: { name: string; rowCount: number }[];
}

export function previewLegacyBackup(backup: LegacyBackup): LegacyRestorePreview {
  const p = backup.payload;
  return {
    format: "BEYOND_BACKUP",
    appVersion: backup.appVersion,
    dataSchemaVersion: backup.dataSchemaVersion,
    exportedAt: backup.exportedAt,
    tables: [
      { name: "beyondDays", rowCount: p.beyondDays.length },
      { name: "events", rowCount: p.events.length },
      { name: "recommendations", rowCount: p.recommendations.length },
      { name: "outcomes", rowCount: p.outcomes.length },
      { name: "workoutSessions", rowCount: p.workoutSessions.length },
      { name: "performedSets", rowCount: p.performedSets.length },
    ],
  };
}

export interface LegacyImportResult {
  beyondDays: number;
  events: number;
  checkIns: number;
  recommendations: number;
  outcomes: number;
  workoutSessions: number;
  performedSets: number;
}

/**
 * Replace-only, matching the real app's confirmed restore behavior and
 * checkpoint 03's own applyRestore. The real BEYOND_BACKUP format has no
 * separate checkIns array — checkpoint 03's schema derives one from
 * STATE_CHECKED_IN events on import, since its own commands write both.
 */
export async function importLegacyBackup(
  db: BeyondDB,
  backup: LegacyBackup,
  options: { clearTablesBeforeImport?: boolean } = {},
): Promise<LegacyImportResult> {
  const clear = options.clearTablesBeforeImport ?? true;
  const p = backup.payload;

  const checkIns = p.events
    .filter((e) => e.type === "STATE_CHECKED_IN")
    .map((e) => e.payload as StateCheckIn);

  await db.transaction(
    "rw",
    [
      db.beyondDays,
      db.events,
      db.checkIns,
      db.recommendations,
      db.outcomes,
      db.workoutSessions,
      db.performedSets,
    ],
    async () => {
      if (clear) {
        await Promise.all([
          db.beyondDays.clear(),
          db.events.clear(),
          db.checkIns.clear(),
          db.recommendations.clear(),
          db.outcomes.clear(),
          db.workoutSessions.clear(),
          db.performedSets.clear(),
        ]);
      }
      await db.beyondDays.bulkAdd(p.beyondDays as unknown as BeyondDay[]);
      await db.events.bulkAdd(p.events as unknown as DomainEvent[]);
      await db.checkIns.bulkAdd(checkIns);
      await db.recommendations.bulkAdd(p.recommendations as unknown as Recommendation[]);
      await db.outcomes.bulkAdd(p.outcomes as unknown as Outcome[]);
      await db.workoutSessions.bulkAdd(p.workoutSessions as unknown as WorkoutSession[]);
      await db.performedSets.bulkAdd(p.performedSets as unknown as PerformedSetRaw[]);
    },
  );

  return {
    beyondDays: p.beyondDays.length,
    events: p.events.length,
    checkIns: checkIns.length,
    recommendations: p.recommendations.length,
    outcomes: p.outcomes.length,
    workoutSessions: p.workoutSessions.length,
    performedSets: p.performedSets.length,
  };
}
