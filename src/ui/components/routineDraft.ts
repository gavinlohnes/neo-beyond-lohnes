import type { RoutineStep } from "../../domain/routines";

/** Duplicate words get separate controls; reordering keeps estimates with the words/ids. */
export function routineDraftKeys(steps: readonly { id?: string; text: string }[]): string[] {
  const counts = new Map<string, number>();
  return steps.map((s) => {
    const n = counts.get(s.text) ?? 0; counts.set(s.text, n + 1);
    return s.id ?? `new:${s.text}:${n}`;
  });
}

export function withDraftMinutes<T extends Pick<RoutineStep, "text" | "minutes"> & { id?: string }>(steps: readonly T[], edits: Record<string, string>): (T & { minutes?: number })[] {
  const keys = routineDraftKeys(steps);
  return steps.map((step, i) => {
    if (!(keys[i]! in edits)) return step;
    const { minutes: _old, ...rest } = step;
    const value = edits[keys[i]!]!.trim();
    return { ...rest, ...(value ? { minutes: Number(value) } : {}) } as T & { minutes?: number };
  });
}

export const validRoutineMinutes = (steps: readonly { minutes?: number }[]) => steps.every((s) => s.minutes === undefined || (Number.isInteger(s.minutes) && s.minutes >= 1 && s.minutes <= 240));
