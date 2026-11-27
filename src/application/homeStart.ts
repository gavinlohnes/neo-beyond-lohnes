import { db } from "../persistence/db";
import { writeAtomically } from "./atomicWrite";
import { newId } from "./commands";
import { getCustomTemplates } from "./customTemplateQueries";
import { getProgrammeView, linkSequenceHomeForms } from "./trainingProgrammeQueries";
import { saveTrainingProgramme } from "./trainingProgramme";
import { GRAYSON_HOME_TEMPLATE_INPUTS } from "../domain/workout/homeTemplates";
import type { CustomWorkoutTemplate } from "../domain/workout/customTemplate";

/**
 * GRAYSON-HOME-STRETCH-001 slice A (Gavin, 2026-11-26: "basic home work outs that I can do"): TRAIN's HOME choice.
 * With a sequence whose next member has a linked HOME form, it's one tap. Without links, SET UP HOME makes HOME A, B
 * and C (keeping any he already has, edits included) and offers one review; nothing links until USE THESE. Without a
 * sequence, the three HOME routines are offered directly, the way gym routines are.
 */
export type HomeStart =
  | { kind: "LINKED"; key: "A" | "B" | "C"; templateId: string; name: string; revisionId: string; parentTemplateId: string }
  | { kind: "SETUP_SEQUENCE"; members: { key: "A" | "B" | "C"; name: string }[] }
  | { kind: "DIRECT"; homes: { id: string; name: string }[] }
  | { kind: "SETUP_DIRECT" };

const isHome = (t: CustomWorkoutTemplate) => !t.archivedAt && t.exercises.length > 0 && t.exercises.every((e) => e.exerciseId.startsWith("home-"));

/** What TRAIN's HOME choice offers now; null while a sequence needs review (guided start is paused). */
export async function getHomeStart(now: Date = new Date()): Promise<HomeStart | null> {
  const [view, templates] = await Promise.all([getProgrammeView(now), getCustomTemplates()]);
  const sequence = view.sequence;
  if (sequence) {
    if (sequence.status !== "READY" || !sequence.nextMember || !view.revision.id) return null;
    const next = sequence.nextMember;
    if (next.issue) return null;
    if (next.home && !next.home.issue) {
      return { kind: "LINKED", key: next.key, templateId: next.home.templateId, name: next.home.name, revisionId: view.revision.id, parentTemplateId: next.templateId };
    }
    return { kind: "SETUP_SEQUENCE", members: sequence.members.map((m) => ({ key: m.key, name: m.name })) };
  }
  const homes = templates.filter(isHome).sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ id: t.id, name: t.name }));
  return homes.length ? { kind: "DIRECT", homes } : { kind: "SETUP_DIRECT" };
}

/**
 * HOME A, B and C, made if missing. One he already has (by name, not archived) is kept exactly as it is, so his own
 * edits to it survive; only a missing one is created from the defaults. Returns the three in A, B, C order.
 */
export async function prepareHomeTemplates(): Promise<CustomWorkoutTemplate[]> {
  return writeAtomically(["customWorkoutTemplates"], async () => {
    const existing = (await db.customWorkoutTemplates.toArray()).filter((t) => !t.archivedAt);
    const createdAt = new Date().toISOString();
    const created: CustomWorkoutTemplate[] = [];
    const result = GRAYSON_HOME_TEMPLATE_INPUTS.map((input) => {
      const match = existing.find((t) => t.name.trim().toLowerCase() === input.name.toLowerCase());
      if (match) return match;
      const template: CustomWorkoutTemplate = { id: newId(), name: input.name, exercises: structuredClone(input.exercises), createdAt };
      created.push(template);
      return template;
    });
    if (created.length) await db.customWorkoutTemplates.bulkAdd(created);
    return result;
  });
}

/** Every bodyweight-only routine he could link as a HOME form (for CHANGE). */
export async function getHomeTemplateChoices(): Promise<{ id: string; name: string }[]> {
  return (await getCustomTemplates()).filter(isHome).map((t) => ({ id: t.id, name: t.name }));
}

/**
 * USE THESE: link one HOME routine to each of A, B and C through the programme's own save (its version guard
 * included). The current next member is kept, so linking never moves his place.
 */
export async function linkHomeForms(ids: [string, string, string], now: Date = new Date()): Promise<void> {
  const [view, templates] = await Promise.all([getProgrammeView(now), getCustomTemplates()]);
  if (view.revision.programme?.mode !== "SEQUENCE" || !view.sequence?.nextMember || !view.revision.id) {
    throw new Error("Your programme changed. Look again before linking.");
  }
  const linked = linkSequenceHomeForms(view.revision.programme, ids, templates, view.sequence.nextMember.templateId);
  await saveTrainingProgramme(linked, view.revision.id);
}
