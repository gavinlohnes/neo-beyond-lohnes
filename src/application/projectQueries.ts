import { db } from "../persistence/db";
import type { DomainEvent } from "../domain/common/types";
import type { Obligation, Project } from "../domain/intent/types";
import { parseProject } from "../persistence/intentValidation";
import { getObligations } from "./intentQueries";
import { byTimeThenSeq } from "./queries";

/**
 * PROJECTS-001 read side. Invalid rows are excluded, never crash or become truth (same rule as
 * intentQueries.ts). Progress is task accounting only: "2 of 4 done" counts steps, it is not a
 * percentage of a goal and feeds nothing in the Engine.
 */

export interface ProjectProgress {
  total: number; done: number; released: number; waiting: number; open: number;
  /** The operator's chosen next step, only while it is still unresolved. */
  next: Obligation | null;
  /** True when a next step was chosen but is now resolved: "choose another when ready". */
  nextResolved: boolean;
}
export interface ProjectView { project: Project; steps: Obligation[]; progress: ProjectProgress }

const byCreated = <T extends { createdAt: string; seq?: number }>(a: T, b: T) => byTimeThenSeq(a.createdAt, a.seq, b.createdAt, b.seq);

export async function getProjects(): Promise<Project[]> {
  return (await db.projects.toArray()).map(parseProject).filter((p): p is Project => p !== null).sort(byCreated);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const raw = await db.projects.get(id);
  return raw ? (parseProject(raw) ?? undefined) : undefined;
}

export function summarizeProject(project: Project, steps: Obligation[]): ProjectProgress {
  const count = (s: Obligation["status"]) => steps.filter((o) => o.status === s).length;
  const chosen = project.nextObligationId ? steps.find((o) => o.id === project.nextObligationId) : undefined;
  const unresolved = chosen && (chosen.status === "OPEN" || chosen.status === "WAITING");
  return {
    total: steps.length, done: count("SATISFIED"), released: count("RELEASED"), waiting: count("WAITING"), open: count("OPEN"),
    next: unresolved ? chosen : null,
    nextResolved: Boolean(chosen && !unresolved),
  };
}

/** Every valid Project with its current steps and progress, oldest first. */
export async function getProjectViews(): Promise<ProjectView[]> {
  const [projects, obligations] = await Promise.all([getProjects(), getObligations()]);
  return projects.map((project) => {
    const steps = obligations.filter((o) => o.projectId === project.id);
    return { project, steps, progress: summarizeProject(project, steps) };
  });
}

const PROJECT_EVENTS = ["PROJECT_CREATED", "PROJECT_MODIFIED", "PROJECT_STATUS_CHANGED", "PROJECT_NEXT_SET", "OBLIGATION_PROJECT_SET"] as const;

/** Oldest first: the Project's own events plus steps joining or leaving it. */
export async function getProjectHistory(projectId: string): Promise<DomainEvent[]> {
  const events = await db.events.where("type").anyOf(PROJECT_EVENTS as unknown as string[]).toArray();
  return events
    .filter((e) => {
      const p = (e.payload ?? {}) as { projectId?: unknown; previousProjectId?: unknown };
      return p.projectId === projectId || (e.type === "OBLIGATION_PROJECT_SET" && p.previousProjectId === projectId);
    })
    .sort((a, b) => byTimeThenSeq(a.occurredAt, a.seq, b.occurredAt, b.seq));
}
