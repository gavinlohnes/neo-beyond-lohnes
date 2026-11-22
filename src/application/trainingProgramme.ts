import { db } from "../persistence/db";
import type { DomainEvent } from "../domain/common/types";
import type { ProgrammeRevision, TrainingProgramme } from "../domain/workout/trainingProgramme";
import { trainingProgrammeEventSchema, trainingProgrammeSchema } from "../persistence/trainingProgrammeValidation";
import { logIntentEvent } from "./intentCommands";
import { newId } from "./commands";
import { writeAtomically } from "./atomicWrite";
import { getCustomTemplates } from "./customTemplateQueries";
import { WORKOUT_TEMPLATES } from "../domain/workout/types";

const broken = () => new Error("Programme history is incomplete or conflicting. Nothing has changed.");
/** Causal order survives imported timestamps and clock rollback; forks never pick a silent winner. */
export function projectTrainingProgrammeHistory(events: readonly DomainEvent[]): ProgrammeRevision[] {
  const next = new Map<string | null, ProgrammeRevision>();
  const relevant = events.filter((e) => e.type === "TRAIN_PROGRAM_SET");
  for (const event of relevant) {
    const parsed = trainingProgrammeEventSchema.safeParse(event.payload);
    if (!event.id || !parsed.success || event.source !== "USER" || event.beyondDayId !== undefined || !Number.isFinite(Date.parse(event.recordedAt)) || next.has(parsed.data.previousId)) throw broken();
    next.set(parsed.data.previousId, { id: event.id, programme: parsed.data.programme as TrainingProgramme | null, recordedAt: event.recordedAt, ...(event.seq !== undefined ? { seq: event.seq } : {}) });
  }
  const visited = new Set<string>();
  let current: ProgrammeRevision = { id: null, programme: null };
  const history: ProgrammeRevision[] = [];
  while (next.has(current.id)) {
    const entry = next.get(current.id)!;
    if (!entry.id) throw broken();
    if (visited.has(entry.id)) throw broken();
    visited.add(entry.id); current = entry; history.push(entry);
  }
  if (visited.size !== relevant.length) throw broken();
  return history;
}
export function projectTrainingProgramme(events: readonly DomainEvent[]): ProgrammeRevision {
  return projectTrainingProgrammeHistory(events).at(-1) ?? { id: null, programme: null };
}
export async function getTrainingProgramme(): Promise<ProgrammeRevision> {
  return projectTrainingProgramme(await db.events.where("type").equals("TRAIN_PROGRAM_SET").toArray());
}
export async function getTrainingProgrammeHistory(): Promise<ProgrammeRevision[]> {
  return projectTrainingProgrammeHistory(await db.events.where("type").equals("TRAIN_PROGRAM_SET").toArray());
}

function snapshotMatches(current: { name: string; exercises: unknown }, snapshot: { name: string; exercises: unknown }) {
  return JSON.stringify({ name: current.name, exercises: current.exercises }) === JSON.stringify(snapshot);
}
/** Explicit SAVE/CLEAR only. Native backups already retain events; no schema/table is added. */
export async function saveTrainingProgramme(programme: TrainingProgramme | null, expectedPreviousId: string | null): Promise<ProgrammeRevision> {
  const parsed = programme === null ? null : trainingProgrammeSchema.parse(programme) as TrainingProgramme;
  return writeAtomically(["customWorkoutTemplates"], async () => {
    const current = await getTrainingProgramme();
    if (current.id !== expectedPreviousId) throw new Error("Programme changed. Reopen it before saving.");
    const custom = await getCustomTemplates();
    if (parsed?.mode === "SEQUENCE") {
      for (const member of parsed.members) {
        const template = custom.find((item) => item.id === member.templateId);
        if (!template) throw new Error("A sequence template is no longer available. Reopen the programme before activating it.");
        if (!snapshotMatches(template, member.snapshot)) throw new Error("A sequence template changed. Reopen and review the current exercises before activating it.");
      }
    } else {
      for (const id of Object.values(parsed?.slots ?? {})) if (!Object.hasOwn(WORKOUT_TEMPLATES, id) && !custom.some((t) => t.id === id)) throw new Error("A selected template is no longer available. Choose another or clear that slot.");
    }
    const commandId = newId();
    const id = await logIntentEvent("TRAIN_PROGRAM_SET", { commandId, previousId: current.id, programme: parsed }, "USER", commandId, {}, current.id ?? undefined);
    const saved = await db.events.get(id);
    return { id, programme: parsed, ...(saved?.recordedAt ? { recordedAt: saved.recordedAt } : {}), ...(saved?.seq !== undefined ? { seq: saved.seq } : {}) };
  });
}
