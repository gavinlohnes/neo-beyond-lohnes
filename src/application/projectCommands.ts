import { db } from "../persistence/db";
import { newId, nextSeq } from "./commands";
import { INTENT_WRITE_TABLES, writeAtomically } from "./atomicWrite";
import { assertMissionActive, assertProjectOpen, createObligation, logIntentEvent, modifyObligation, notFound } from "./intentCommands";
import type { Obligation, Project, ProjectStatus } from "../domain/intent/types";
import {
  obligationInputSchema,
  projectInputSchema,
  projectModifyInputSchema,
  type ObligationInput,
  type ObligationModifyInput,
  type ProjectInput,
  type ProjectModifyInput,
} from "../persistence/intentValidation";

/**
 * PROJECTS-001 (owner approval 2026-10-31). Same contract as intentCommands.ts: the Project row is
 * current state, every meaningful change also writes one historical event, and both land in one
 * transaction. Project events carry projectId in their payload (no new events index).
 * A Project's status never changes its steps.
 */

const MAX_STEPS = 12;

/**
 * Creates a Project and, optionally, its first steps as ordinary Obligations, all or nothing.
 * Steps are validated before anything is written, so one bad step saves nothing.
 */
export async function createProject(input: ProjectInput, steps: ObligationInput[] = []): Promise<{ project: Project; steps: Obligation[] }> {
  return writeAtomically(INTENT_WRITE_TABLES, async () => {
    const parsed = projectInputSchema.parse(input);
    if (steps.length > MAX_STEPS) throw new Error(`TOO_MANY_STEPS: a new project takes at most ${MAX_STEPS} steps at once.`);
    const parsedSteps = steps.map((step) => obligationInputSchema.parse(step));
    if (parsed.missionId) {
      const mission = await db.missions.get(parsed.missionId);
      if (!mission) throw notFound("MISSION", parsed.missionId);
      assertMissionActive(mission);
    }
    const now = new Date().toISOString();
    const project: Project = {
      id: newId(),
      title: parsed.title,
      ...(parsed.finish ? { finish: parsed.finish } : {}),
      status: "ACTIVE",
      ...(parsed.missionId ? { missionId: parsed.missionId } : {}),
      source: "USER",
      seq: await nextSeq(),
      createdAt: now,
      updatedAt: now,
    };
    await db.projects.add(project);
    const correlationId = newId();
    await logIntentEvent(
      "PROJECT_CREATED",
      { commandId: correlationId, projectId: project.id, title: project.title, ...(project.missionId ? { missionId: project.missionId } : {}) },
      "USER",
      correlationId,
      {},
    );
    const created: Obligation[] = [];
    for (const step of parsedSteps) created.push(await createObligation({ ...step, projectId: project.id }));
    return { project, steps: created };
  });
}

export async function modifyProject(projectId: string, changes: ProjectModifyInput): Promise<Project> {
  return writeAtomically(INTENT_WRITE_TABLES, async () => {
    const parsed = projectModifyInputSchema.parse(changes);
    const existing = await db.projects.get(projectId);
    if (!existing) throw notFound("PROJECT", projectId);
    const updated: Project = {
      ...existing,
      ...(parsed.title !== undefined ? { title: parsed.title } : {}),
      ...(parsed.finish !== undefined ? { finish: parsed.finish } : {}),
      updatedAt: new Date().toISOString(),
    };
    await db.projects.put(updated);
    const correlationId = newId();
    await logIntentEvent("PROJECT_MODIFIED", { commandId: correlationId, projectId, changes: parsed }, "USER", correlationId, {});
    return updated;
  });
}

const ALLOWED: Record<ProjectStatus, readonly ProjectStatus[]> = {
  ACTIVE: ["PAUSED", "COMPLETED", "CLOSED"],
  PAUSED: ["ACTIVE", "COMPLETED", "CLOSED"],
  COMPLETED: ["ACTIVE"],
  CLOSED: ["ACTIVE"],
};

/**
 * Pause, resume, complete, close or reopen. Only the Project changes: its steps keep their states,
 * dates and links. `expectedStatus` rejects a stale screen (another tab already changed it).
 * Returns false when the Project already has the requested status.
 */
export async function setProjectStatus(projectId: string, to: ProjectStatus, expectedStatus?: ProjectStatus): Promise<boolean> {
  return writeAtomically(INTENT_WRITE_TABLES, async () => {
    const existing = await db.projects.get(projectId);
    if (!existing) throw notFound("PROJECT", projectId);
    if (existing.status === to) return false;
    if (expectedStatus && existing.status !== expectedStatus) {
      throw new Error(`PROJECT_CHANGED: this project is now ${existing.status.toLowerCase()}. Nothing changed.`);
    }
    if (!ALLOWED[existing.status].includes(to)) {
      throw new Error(`INVALID_PROJECT_TRANSITION: cannot go from ${existing.status} to ${to}.`);
    }
    await db.projects.update(projectId, { status: to, updatedAt: new Date().toISOString() });
    const correlationId = newId();
    await logIntentEvent("PROJECT_STATUS_CHANGED", { commandId: correlationId, projectId, from: existing.status, to }, "USER", correlationId, {});
    return true;
  });
}

/** The operator's own choice of next step, or null to clear it. Must be an unresolved step of this Project. */
export async function setProjectNext(projectId: string, obligationId: string | null): Promise<boolean> {
  return writeAtomically(INTENT_WRITE_TABLES, async () => {
    const existing = await db.projects.get(projectId);
    if (!existing) throw notFound("PROJECT", projectId);
    if ((existing.nextObligationId ?? null) === obligationId) return false;
    if (obligationId) {
      const step = await db.obligations.get(obligationId);
      if (!step) throw notFound("OBLIGATION", obligationId);
      if (step.projectId !== projectId) throw new Error("NOT_A_PROJECT_STEP: that commitment is not a step of this project.");
      if (step.status === "SATISFIED" || step.status === "RELEASED") throw new Error("OBLIGATION_ALREADY_RESOLVED: choose a step that is still open.");
    }
    const { nextObligationId: _previous, ...rest } = existing;
    await db.projects.put({ ...rest, ...(obligationId ? { nextObligationId: obligationId } : {}), updatedAt: new Date().toISOString() });
    const correlationId = newId();
    await logIntentEvent("PROJECT_NEXT_SET", { commandId: correlationId, projectId, obligationId }, "USER", correlationId, {});
    return true;
  });
}

/**
 * Moves one commitment into a Project, or out of one (null). Joining needs an open Project;
 * leaving is always allowed. If it was its old Project's chosen next step, that choice is cleared
 * in the same transaction, so "next" can never point outside its Project.
 */
export async function setObligationProject(obligationId: string, projectId: string | null): Promise<boolean> {
  return writeAtomically(INTENT_WRITE_TABLES, async () => {
    const existing = await db.obligations.get(obligationId);
    if (!existing) throw notFound("OBLIGATION", obligationId);
    const previous = existing.projectId ?? null;
    if (previous === projectId) return false;
    if (projectId) await assertProjectOpen(projectId);
    const { projectId: _old, ...rest } = existing;
    const now = new Date().toISOString();
    await db.obligations.put({ ...rest, ...(projectId ? { projectId } : {}), updatedAt: now });
    const correlationId = newId();
    await logIntentEvent("OBLIGATION_PROJECT_SET", { commandId: correlationId, obligationId, projectId, previousProjectId: previous }, "USER", correlationId, { obligationId });
    if (previous) {
      const old = await db.projects.get(previous);
      if (old?.nextObligationId === obligationId) {
        const { nextObligationId: _n, ...oldRest } = old;
        await db.projects.put({ ...oldRest, updatedAt: now });
        await logIntentEvent("PROJECT_NEXT_SET", { commandId: correlationId, projectId: previous, obligationId: null }, "USER", correlationId, {});
      }
    }
    return true;
  });
}

/** The Obligation editor's SAVE: field edits and a Project move commit together or not at all. */
export async function saveObligationEdits(obligationId: string, changes: ObligationModifyInput, projectId: string | null): Promise<void> {
  await writeAtomically(INTENT_WRITE_TABLES, async () => {
    await modifyObligation(obligationId, changes);
    await setObligationProject(obligationId, projectId);
  });
}
