import { db } from "../persistence/db";
import { parseTrainingBlockSetPayload } from "../persistence/trainingBlockValidation";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { blockWeekOf, DEFAULT_BLOCK_SETTINGS, isLightWeek, type BlockSettings, type TrainingBlock, type TrainingBlockSetPayload } from "../domain/workout/trainingBlock";

/**
 * GRAYSON-BLOCK-CYCLE-001: the block in force (latest TRAINING_BLOCK_SET wins) and which sessions fell in a light week.
 * Reads only; kept apart from trainingBlock.ts so the live workout plan can read it without an import cycle.
 */
export interface BlockState { block: TrainingBlock | null; settings: BlockSettings; latestEventId: string | null; history: { eventId: string; payload: TrainingBlockSetPayload }[] }

export async function getBlockState(): Promise<BlockState> {
  const events = (await db.events.where("type").equals("TRAINING_BLOCK_SET").toArray())
    .filter((e) => e.source === "USER")
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || a.recordedAt.localeCompare(b.recordedAt));
  const history = events.flatMap((e) => { const payload = parseTrainingBlockSetPayload(e.payload); return payload ? [{ eventId: e.id, payload }] : []; });
  const latest = history.at(-1);
  return { block: latest?.payload.block ?? null, settings: latest?.payload.settings ?? DEFAULT_BLOCK_SETTINGS, latestEventId: latest?.eventId ?? null, history };
}


/** The light week a session started in, if any: judged by the newest block covering its date. */
export function lightBlockFor(blocks: readonly TrainingBlock[], startedAt: string): TrainingBlock | null {
  const day = mostRecentBoundaryAtOrBefore(new Date(startedAt));
  const block = [...blocks].reverse().find((b) => blockWeekOf(b, day) !== null);
  return block && isLightWeek(block, day) ? block : null;
}

export async function isLightSession(session: { startedAt: string }): Promise<BlockSettings | null> {
  const { history, settings } = await getBlockState();
  const blocks = history.map((h) => h.payload.block).filter((b): b is TrainingBlock => !!b && b.lightLastWeek);
  return lightBlockFor(blocks, session.startedAt) ? settings : null;
}

/** Is a session inside a light week (so progression and stalls leave it out)? */
export async function lightWeekSessionIds(): Promise<Set<string>> {
  const { history } = await getBlockState();
  const blocks = history.map((h) => h.payload.block).filter((b): b is TrainingBlock => !!b && b.lightLastWeek);
  if (!blocks.length) return new Set();
  const sessions = await db.workoutSessions.toArray();
  return new Set(sessions.filter((s) => lightBlockFor(blocks, s.startedAt)).map((s) => s.id));
}

