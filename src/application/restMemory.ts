import { readRestMemory, writeRestMemory } from "../persistence/restMemory";

/**
 * REST-MEMORY-001 (big-list idea 37, "rest timer that remembers your usual rest per exercise", Strong): a
 * set's rest starts at the length you settled on for that exercise last time; until you adjust one, it is
 * the default. Each ± tap during an exercise's rest moves its remembered length by the same amount.
 */
export const DEFAULT_REST_SECONDS = 90;
export const MIN_REST_SECONDS = 15;
export const MAX_REST_SECONDS = 600;

const clamp = (s: number) => Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, Math.round(s)));

export function restSecondsFor(exerciseId: string | null | undefined): number {
  if (!exerciseId) return DEFAULT_REST_SECONDS;
  const remembered = readRestMemory()[exerciseId];
  return remembered === undefined ? DEFAULT_REST_SECONDS : clamp(remembered);
}

/** Whether this exercise has its own remembered rest (so TRAIN can say "your usual"). */
export function hasRememberedRest(exerciseId: string | null | undefined): boolean {
  return Boolean(exerciseId) && readRestMemory()[exerciseId!] !== undefined;
}

export function rememberRestAdjustment(exerciseId: string | null | undefined, deltaSeconds: number): void {
  if (!exerciseId || !Number.isFinite(deltaSeconds) || deltaSeconds === 0) return;
  const memory = readRestMemory();
  memory[exerciseId] = clamp(restSecondsFor(exerciseId) + deltaSeconds);
  writeRestMemory(memory);
}
