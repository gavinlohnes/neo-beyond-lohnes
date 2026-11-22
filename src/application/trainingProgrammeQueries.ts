import { db } from "../persistence/db";
import { getTrainingProgrammeHistory } from "./trainingProgramme";
import { getCustomTemplates } from "./customTemplateQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getSchedulePattern } from "./queries";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { formatLocalDate, isOperatorSavedSchedule, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
import { resolveProgrammeSlot } from "../engine/trainingProgrammeResolution";
import { WORKOUT_TEMPLATE_ORDER } from "../domain/workout/types";
import { recordedBy, resolveWorkContext } from "./workContextResolution";
import { getConfirmedExceptions } from "./scheduleExceptions";
import type { CustomWorkoutTemplate } from "../domain/workout/customTemplate";
import type { ProgrammeRevision, SequenceTrainingProgramme, TrainingProgramme } from "../domain/workout/trainingProgramme";
import { doesSessionAdvanceRotation } from "../engine/trainSuggestion";
import { getPerformedSets } from "./trainQueries";
import { isWorkingSet, type SessionType, type WorkoutSessionStatus } from "../domain/workout/types";

export interface SequenceMemberView {
  key: "A" | "B" | "C";
  templateId: string;
  name: string;
  issue: "CHANGED" | "ARCHIVED" | "MISSING" | null;
}

export interface SequenceProgrammeView {
  status: "READY" | "REVIEW_REQUIRED" | "UNKNOWN";
  members: SequenceMemberView[];
  nextMember: SequenceMemberView | null;
  why: string;
  previousProgramme: TrainingProgramme | null;
  activatedAt: string | null;
}

const sameSnapshot = (template: CustomWorkoutTemplate, snapshot: SequenceTrainingProgramme["members"][number]["snapshot"]) =>
  JSON.stringify({ name: template.name, exercises: template.exercises }) === JSON.stringify(snapshot);

function completionPayload(value: unknown): { sessionId: string; status: "COMPLETED" | "PARTIAL"; sessionType: SessionType } | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  if (typeof payload.sessionId !== "string" || (payload.status !== "COMPLETED" && payload.status !== "PARTIAL") || (payload.sessionType !== "STANDARD" && payload.sessionType !== "REDUCED" && payload.sessionType !== "RECOVERY")) return null;
  return { sessionId: payload.sessionId, status: payload.status, sessionType: payload.sessionType };
}

async function getSequenceView(revision: ProgrammeRevision, history: ProgrammeRevision[], allTemplates: CustomWorkoutTemplate[]): Promise<SequenceProgrammeView> {
  const programme = revision.programme as SequenceTrainingProgramme;
  const members = programme.members.map((member): SequenceMemberView => {
    const current = allTemplates.find((template) => template.id === member.templateId);
    const issue = !current ? "MISSING" : current.archivedAt ? "ARCHIVED" : !sameSnapshot(current, member.snapshot) ? "CHANGED" : null;
    return { key: member.key, templateId: member.templateId, name: current?.name ?? member.snapshot.name, issue };
  });
  const previousProgramme = history.length > 1 ? history.at(-2)!.programme : null;
  const start = members.find((member) => member.templateId === programme.startTemplateId) ?? null;
  if (!start || revision.seq === undefined || !revision.recordedAt) return { status: "UNKNOWN", members, nextMember: start, why: "Programme activation evidence is incomplete. Nothing was inferred.", previousProgramme, activatedAt: revision.recordedAt ?? null };

  let next = start;
  let why = `Sequence activated with ${start.key} selected first.`;
  const completions = (await db.events.where("type").equals("WORKOUT_COMPLETED").toArray()).sort((a, b) => (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER));
  for (const event of completions) {
    if (event.seq === undefined) {
      if (event.recordedAt >= revision.recordedAt) return { status: "UNKNOWN", members, nextMember: null, why: "A workout outcome has no causal order. Next session is unknown.", previousProgramme, activatedAt: revision.recordedAt };
      continue;
    }
    if (event.seq <= revision.seq) continue;
    const payload = completionPayload(event.payload);
    if (!payload) return { status: "UNKNOWN", members, nextMember: null, why: "A workout outcome is incomplete. Next session is unknown.", previousProgramme, activatedAt: revision.recordedAt };
    const session = await db.workoutSessions.get(payload.sessionId);
    if (!session || session.sessionType !== payload.sessionType || session.status !== payload.status) return { status: "UNKNOWN", members, nextMember: null, why: "Workout records disagree. Next session is unknown.", previousProgramme, activatedAt: revision.recordedAt };
    const memberIndex = members.findIndex((member) => member.templateId === session.templateId);
    if (memberIndex < 0) continue;
    const sets = await getPerformedSets(session.id);
    const workingSetCount = sets.filter(isWorkingSet).length;
    if (doesSessionAdvanceRotation(session.sessionType as SessionType, session.status as WorkoutSessionStatus, workingSetCount)) {
      next = members[(memberIndex + 1) % members.length]!;
      why = `${members[memberIndex]!.key} advanced after a recorded ${session.sessionType.toLowerCase()} ${session.status.toLowerCase()} session with ${workingSetCount} working ${workingSetCount === 1 ? "set" : "sets"}.`;
    }
  }
  const status = members.some((member) => member.issue) ? "REVIEW_REQUIRED" : "READY";
  return { status, members, nextMember: next, why, previousProgramme, activatedAt: revision.recordedAt };
}

export function buildSequenceProgramme(templateIds: [string, string, string], templates: readonly CustomWorkoutTemplate[], startTemplateId = templateIds[0]): SequenceTrainingProgramme {
  if (new Set(templateIds).size !== 3) throw new Error("Choose three different templates.");
  const keys = ["A", "B", "C"] as const;
  const members = templateIds.map((templateId, index) => {
    const template = templates.find((item) => item.id === templateId && !item.archivedAt);
    if (!template) throw new Error("A selected template is no longer available.");
    return { key: keys[index]!, templateId, snapshot: { name: template.name, exercises: structuredClone(template.exercises) } };
  }) as SequenceTrainingProgramme["members"];
  return { mode: "SEQUENCE", members, startTemplateId };
}

export async function getProgrammeView(now = new Date()) {
  const [history, custom, allCustom, summaries, schedule, exceptions] = await Promise.all([getTrainingProgrammeHistory(), getCustomTemplates(), getCustomTemplates({ includeArchived: true }), getDaySummaries(), getSchedulePattern(), getConfirmedExceptions()]);
  const revision = history.at(-1) ?? { id: null, programme: null };
  const date = mostRecentBoundaryAtOrBefore(now);
  // CONTEXT-INTEGRATION-001: the shared rule, recorded first, then the saved rotation. Rotation mode is offered only with a
  // saved schedule (below), so an unknown day never reaches it as WORK or OFF.
  const context = (day: Date): "WORK" | "OFF" => {
    const recorded = summaries.filter((s) => s.livedDayStart === day.toISOString()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const latest = recorded[0];
    const resolved = resolveWorkContext(day, schedule, latest && latest.work.declared !== "UNKNOWN"
      ? { kind: latest.work.declared, by: recordedBy(latest.work.declaredSource) } : null,
      exceptions.get(formatLocalDate(day))?.kind);
    return resolved.kind ?? scheduledWorkContextForLivedDay(day, schedule);
  };
  const actual = summaries.filter((s) => s.livedDayStart === date.toISOString()).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const forecast = !actual || actual.work.declared === "UNKNOWN" || actual.work.declaredSource !== "MANUAL";
  const rotationAvailable = isOperatorSavedSchedule(schedule);
  const planned = revision.programme?.mode === "SEQUENCE"
    ? { key: null, templateId: null }
    : revision.programme?.mode === "ROTATION" && !rotationAvailable
      ? { key: null, templateId: null }
      : resolveProgrammeSlot(revision.programme, date, context);
  const templates = [...WORKOUT_TEMPLATE_ORDER.map((id) => ({ id, name: `Workout ${id}`, custom: false as const })), ...custom.map((t) => ({ id: t.id, name: t.name, custom: true as const }))];
  const sequence = revision.programme?.mode === "SEQUENCE" ? await getSequenceView(revision, history, allCustom) : null;
  return { revision, templates, customTemplates: custom, planned, sequence, forecast, rotationAvailable, date: formatLocalDate(date) };
}
