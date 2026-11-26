import { db } from "../persistence/db";
import { getTrainingProgrammeHistory } from "./trainingProgramme";
import { getCustomTemplates } from "./customTemplateQueries";
import { getDaySummaries } from "./dayLedgerQueries";
import { getSchedulePattern } from "./queries";
import { mostRecentBoundaryAtOrBefore } from "../engine/dayRollover";
import { formatLocalDate, isOperatorSavedSchedule, scheduleWeekIndex, scheduledWorkContextForLivedDay } from "../engine/scheduledContext";
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
  home: { templateId: string; name: string; issue: "CHANGED" | "ARCHIVED" | "MISSING" | null } | null;
  short: { templateId: string; name: string; issue: "CHANGED" | "ARCHIVED" | "MISSING" | null } | null;
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

type FormContext = NonNullable<import("../domain/common/types").WorkoutSession["programmeContext"]>;
function formContext(value: unknown): FormContext | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  return typeof item.programmeRevisionId === "string" && (item.memberKey === "A" || item.memberKey === "B" || item.memberKey === "C") && typeof item.parentTemplateId === "string" && (item.form === "HOME" || item.form === "SHORT")
    ? item as unknown as FormContext : null;
}
function completionPayload(value: unknown): { sessionId: string; status: "COMPLETED" | "PARTIAL"; sessionType: SessionType; programmeContext: FormContext | null } | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  if (typeof payload.sessionId !== "string" || (payload.status !== "COMPLETED" && payload.status !== "PARTIAL") || (payload.sessionType !== "STANDARD" && payload.sessionType !== "REDUCED" && payload.sessionType !== "RECOVERY")) return null;
  return { sessionId: payload.sessionId, status: payload.status, sessionType: payload.sessionType, programmeContext: formContext(payload.programmeContext) };
}

async function deriveSequenceState(revision: ProgrammeRevision, allTemplates: CustomWorkoutTemplate[], endSeq = Number.MAX_SAFE_INTEGER): Promise<Omit<SequenceProgrammeView, "previousProgramme">> {
  const programme = revision.programme as SequenceTrainingProgramme;
  const members = programme.members.map((member): SequenceMemberView => {
    const current = allTemplates.find((template) => template.id === member.templateId);
    const issue = !current ? "MISSING" : current.archivedAt ? "ARCHIVED" : !sameSnapshot(current, member.snapshot) ? "CHANGED" : null;
    const currentHome = member.home ? allTemplates.find((template) => template.id === member.home!.templateId) : undefined;
    const homeIssue = !member.home ? null : !currentHome ? "MISSING" : currentHome.archivedAt ? "ARCHIVED" : !sameSnapshot(currentHome, member.home.snapshot) ? "CHANGED" : null;
    const currentShort = member.short ? allTemplates.find((template) => template.id === member.short!.templateId) : undefined;
    const shortIssue = !member.short ? null : !currentShort ? "MISSING" : currentShort.archivedAt ? "ARCHIVED" : !sameSnapshot(currentShort, member.short.snapshot) ? "CHANGED" : null;
    return { key: member.key, templateId: member.templateId, name: current?.name ?? member.snapshot.name, issue,
      home: member.home ? { templateId: member.home.templateId, name: currentHome?.name ?? member.home.snapshot.name, issue: homeIssue } : null,
      short: member.short ? { templateId: member.short.templateId, name: currentShort?.name ?? member.short.snapshot.name, issue: shortIssue } : null };
  });
  const start = members.find((member) => member.templateId === programme.startTemplateId) ?? null;
  if (!start || revision.seq === undefined || !revision.recordedAt) return { status: "UNKNOWN", members, nextMember: start, why: "Programme activation evidence is incomplete. Nothing was inferred.", activatedAt: revision.recordedAt ?? null };

  let next = start;
  let why = `Sequence activated with ${start.key} selected first.`;
  const completions = (await db.events.where("type").equals("WORKOUT_COMPLETED").toArray()).sort((a, b) => (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER));
  for (const event of completions) {
    if (event.seq === undefined) {
      if (event.recordedAt >= revision.recordedAt) return { status: "UNKNOWN", members, nextMember: null, why: "A workout outcome has no causal order. Next session is unknown.", activatedAt: revision.recordedAt };
      continue;
    }
    if (event.seq <= revision.seq) continue;
    if (event.seq >= endSeq) continue;
    const payload = completionPayload(event.payload);
    if (!payload) return { status: "UNKNOWN", members, nextMember: null, why: "A workout outcome is incomplete. Next session is unknown.", activatedAt: revision.recordedAt };
    const session = await db.workoutSessions.get(payload.sessionId);
    if (!session || session.sessionType !== payload.sessionType || session.status !== payload.status) return { status: "UNKNOWN", members, nextMember: null, why: "Workout records disagree. Next session is unknown.", activatedAt: revision.recordedAt };
    if (payload.programmeContext && !session.programmeContext) return { status: "UNKNOWN", members, nextMember: null, why: "Workout form provenance disagrees. Next session is unknown.", activatedAt: revision.recordedAt };
    let memberIndex = members.findIndex((member) => member.templateId === session.templateId);
    // HOME-LINK-001 / SHORT-LINK-001: a linked form counts only through its recorded, exact start provenance.
    const form = session.programmeContext?.form ?? null;
    if (form) {
      const context = session.programmeContext!;
      memberIndex = members.findIndex((member) => member.key === context.memberKey && member.templateId === context.parentTemplateId);
      const linked = memberIndex >= 0 ? (form === "HOME" ? members[memberIndex]!.home : members[memberIndex]!.short) : null;
      if (payload.sessionType !== "STANDARD" || !payload.programmeContext || JSON.stringify(payload.programmeContext) !== JSON.stringify(context) || context.programmeRevisionId !== revision.id || !linked || linked.templateId !== session.templateId) {
        return { status: "UNKNOWN", members, nextMember: null, why: `${form} workout evidence conflicts with the confirmed programme. Next session is unknown.`, activatedAt: revision.recordedAt };
      }
    }
    if (memberIndex < 0) continue;
    const sets = await getPerformedSets(session.id);
    const linkedSnapshot = form && memberIndex >= 0 ? (form === "HOME" ? programme.members[memberIndex]!.home : programme.members[memberIndex]!.short)?.snapshot : undefined;
    const allowedFormExercises = form ? new Set((linkedSnapshot?.exercises ?? []).map((exercise) => exercise.exerciseId)) : null;
    const workingSetCount = sets.filter((set) => isWorkingSet(set) && (!allowedFormExercises || allowedFormExercises.has(set.exerciseId))).length;
    // A linked SHORT or HOME is a complete smaller prescription: COMPLETED with recorded work advances, PARTIAL holds.
    const advances = form
      ? session.status === "COMPLETED" && workingSetCount > 0
      : doesSessionAdvanceRotation(session.sessionType as SessionType, session.status as WorkoutSessionStatus, workingSetCount);
    if (advances) {
      next = members[(memberIndex + 1) % members.length]!;
      why = `${members[memberIndex]!.key} advanced after a recorded ${form ? `${form} ` : session.sessionType.toLowerCase() + " "}${session.status.toLowerCase()} session with ${workingSetCount} working ${workingSetCount === 1 ? "set" : "sets"}.`;
    }
  }
  const status = members.some((member) => member.issue) ? "REVIEW_REQUIRED" : "READY";
  return { status, members, nextMember: next, why, activatedAt: revision.recordedAt };
}

async function getSequenceView(revision: ProgrammeRevision, history: ProgrammeRevision[], allTemplates: CustomWorkoutTemplate[]): Promise<SequenceProgrammeView> {
  const state = await deriveSequenceState(revision, allTemplates);
  const index = history.findIndex((entry) => entry.id === revision.id);
  const previous = index > 0 ? history[index - 1]! : null;
  let previousProgramme = previous?.programme ?? null;
  if (previous?.programme?.mode === "SEQUENCE" && revision.seq !== undefined) {
    const previousState = await deriveSequenceState(previous, allTemplates, revision.seq);
    previousProgramme = previousState.status !== "UNKNOWN" && previousState.nextMember
      ? { ...previous.programme, startTemplateId: previousState.nextMember.templateId }
      : null;
  }
  return { ...state, previousProgramme };
}

/**
 * GRAYSON-ROUTINE-EDIT-001: the member this sequence revision currently names next, or null when the evidence can't
 * say. A routine edit writes a new revision starting there, so it never moves his place in the sequence.
 */
export async function getSequenceNextTemplateId(revision: ProgrammeRevision): Promise<string | null> {
  if (revision.programme?.mode !== "SEQUENCE") return null;
  const state = await deriveSequenceState(revision, await getCustomTemplates({ includeArchived: true }));
  return state.status === "UNKNOWN" ? null : state.nextMember?.templateId ?? null;
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

export function linkSequenceHomeForms(programme: SequenceTrainingProgramme, ids: [string, string, string], templates: readonly CustomWorkoutTemplate[], currentNextTemplateId = programme.startTemplateId): SequenceTrainingProgramme {
  if (new Set(ids).size !== 3) throw new Error("Choose three different HOME templates.");
  if (!programme.members.some((member) => member.templateId === currentNextTemplateId)) throw new Error("Current next member is unavailable. Reopen the programme.");
  return { ...programme, startTemplateId: currentNextTemplateId, members: programme.members.map((member, index) => {
    const template = templates.find((item) => item.id === ids[index] && !item.archivedAt);
    if (!template || !template.exercises.every((exercise) => exercise.exerciseId.startsWith("home-"))) throw new Error("Choose a bodyweight HOME template for every member.");
    return { ...member, home: { templateId: template.id, snapshot: { name: template.name, exercises: structuredClone(template.exercises) } } };
  }) as SequenceTrainingProgramme["members"] };
}

/** SHORT-LINK-001: link one confirmed loaded SHORT template to each member; the projected next member is kept. */
export function linkSequenceShortForms(programme: SequenceTrainingProgramme, ids: [string, string, string], templates: readonly CustomWorkoutTemplate[], currentNextTemplateId = programme.startTemplateId): SequenceTrainingProgramme {
  if (new Set(ids).size !== 3) throw new Error("Choose three different SHORT templates.");
  if (!programme.members.some((member) => member.templateId === currentNextTemplateId)) throw new Error("Current next member is unavailable. Reopen the programme.");
  return { ...programme, startTemplateId: currentNextTemplateId, members: programme.members.map((member, index) => {
    const template = templates.find((item) => item.id === ids[index] && !item.archivedAt);
    if (!template || template.exercises.length === 0 || template.exercises.some((exercise) => exercise.exerciseId.startsWith("home-"))) throw new Error("Choose a loaded SHORT template for every member.");
    if (template.id === member.templateId) throw new Error(`SHORT ${member.key} must be its own template, not the FULL one.`);
    return { ...member, short: { templateId: template.id, snapshot: { name: template.name, exercises: structuredClone(template.exercises) } } };
  }) as SequenceTrainingProgramme["members"] };
}

/**
 * SHORT-LINK-001 (design §5): reviewable starting drafts, the first three movements of each member's confirmed FULL,
 * same exercise IDs and prescription. Creating them never links or starts them.
 */
export function shortDraftInputs(programme: SequenceTrainingProgramme): { name: string; exercises: SequenceTrainingProgramme["members"][number]["snapshot"]["exercises"] }[] {
  return programme.members.map((member) => ({ name: `${member.snapshot.name} · SHORT`, exercises: structuredClone(member.snapshot.exercises.slice(0, 3)) }));
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
      : resolveProgrammeSlot(revision.programme, date, context, (day) => (rotationAvailable ? scheduleWeekIndex(day, schedule) : 0));
  const templates = [...WORKOUT_TEMPLATE_ORDER.map((id) => ({ id, name: `Workout ${id}`, custom: false as const })), ...custom.map((t) => ({ id: t.id, name: t.name, custom: true as const }))];
  const sequence = revision.programme?.mode === "SEQUENCE" ? await getSequenceView(revision, history, allCustom) : null;
  return { revision, templates, customTemplates: custom, planned, sequence, forecast, rotationAvailable, date: formatLocalDate(date) };
}
