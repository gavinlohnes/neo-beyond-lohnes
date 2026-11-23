import { startDay, submitCheckIn } from "../../src/application/commands";
import { expect, it } from "vitest";
import { resolveProgrammeSlot } from "../../src/engine/trainingProgrammeResolution";
import { DEFAULT_SCHEDULE_PATTERN, scheduledWorkContextForLivedDay } from "../../src/engine/scheduledContext";
import { getTrainingProgramme, saveTrainingProgramme, projectTrainingProgramme } from "../../src/application/trainingProgramme";
import { createCustomTemplate, createCustomTemplateSet, ensureExactCustomTemplateSet, archiveCustomTemplate, updateCustomTemplate } from "../../src/application/customTemplateCommands";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";
import { buildSequenceProgramme, getProgrammeView, linkSequenceHomeForms, linkSequenceShortForms, shortDraftInputs } from "../../src/application/trainingProgrammeQueries";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { db } from "../../src/persistence/db";
import { previewAnyRestore, applyAnyRestore } from "../../src/persistence/restore";
import "dexie-export-import";
import { GRAYSON_HOME_TEMPLATE_INPUTS } from "../../src/domain/workout/homeTemplates";
import { getProgressionSuggestion } from "../../src/application/trainQueries";
import { getTrainingHistory } from "../../src/application/trainHistoryQueries";
const schedule = { ...DEFAULT_SCHEDULE_PATTERN, anchorMonday: "2026-11-02", updatedAt: "2026-11-01T00:00:00Z" };
const programme = { mode: "ROTATION" as const, slots: { WORK1: "A", WORK2: "B", WORK3: "C", OFF1: "B", OFF2: "C", OFF3: "A" } };
const date = (day: number) => new Date(2026, 10, day, 16, 30);
const context = (d: Date) => scheduledWorkContextForLivedDay(d, schedule);
it("resolves Week A/B work and off positions and a manual flip", () => {
  expect(resolveProgrammeSlot(programme, date(2), context)).toEqual({ key: "WORK1", templateId: "A" });
  expect(resolveProgrammeSlot(programme, date(3), context)).toEqual({ key: "WORK2", templateId: "B" });
  expect(resolveProgrammeSlot(programme, date(4), context)).toEqual({ key: "OFF1", templateId: "B" });
  expect(resolveProgrammeSlot(programme, date(7), context)).toEqual({ key: "WORK2", templateId: "B" });
  expect(resolveProgrammeSlot(programme, date(9), context)).toEqual({ key: "OFF1", templateId: "B" });
  expect(resolveProgrammeSlot(programme, date(11), context)).toEqual({ key: "WORK1", templateId: "A" });
  const flip = (d: Date) => d.getDate() === 3 ? "OFF" as const : context(d);
  expect(resolveProgrammeSlot(programme, date(3), flip)).toEqual({ key: "OFF1", templateId: "B" });
});
it("resolves weekdays and unassigned slots without a recommendation", () => {
  expect(resolveProgrammeSlot({ mode: "WEEKDAYS", slots: { "1": "C" } }, date(2), context).templateId).toBe("C");
  expect(resolveProgrammeSlot(null, date(2), context).templateId).toBeNull();
});
it("appends a day-independent confirmed setting, checks stale editors and clears without erasing history", async () => {
  const first = await saveTrainingProgramme(programme, null);
  expect((await getTrainingProgramme()).programme).toEqual(programme);
  expect(await db.beyondDays.count()).toBe(0);
  await expect(saveTrainingProgramme(programme, null)).rejects.toThrow("Programme changed");
  await saveTrainingProgramme(null, first.id);
  expect((await getTrainingProgramme()).programme).toBeNull();
  expect(await db.events.where("type").equals("TRAIN_PROGRAM_SET").count()).toBe(2);
});
it("rejects unavailable templates and invalid slot keys before writing", async () => {
  await expect(saveTrainingProgramme({ mode: "WEEKDAYS", slots: { "1": "not-a-template" } }, null)).rejects.toThrow("no longer available");
  await expect(saveTrainingProgramme({ mode: "WEEKDAYS", slots: { WORK1: "A" } }, null)).rejects.toThrow();
  expect(await db.events.count()).toBe(0);
});
it("round-trips through native preview/restore and reads an old backup with no programme as empty", async () => {
  const oldBackup = new File([await db.export()], "synthetic-before-programmes.json", { type: "application/json" });
  const version = db.verno;
  await saveTrainingProgramme(programme, null);
  expect(db.verno).toBe(version);
  const backup = new File([await db.export()], "synthetic-programme.json", { type: "application/json" });
  await db.events.clear();
  await previewAnyRestore(backup); await applyAnyRestore(backup);
  expect((await getTrainingProgramme()).programme).toEqual(programme);
  await previewAnyRestore(oldBackup); await applyAnyRestore(oldBackup);
  expect((await getTrainingProgramme()).programme).toBeNull();
});

it("supports a custom template and leaves an archived assignment inspectable without offering start", async () => {
  const template = await createCustomTemplate({ name: "Synthetic Push A", exercises: WORKOUT_TEMPLATES.A!.exercises });
  const revision = await saveTrainingProgramme({ mode: "WEEKDAYS", slots: { "1": template.id } }, null);
  expect((await getProgrammeView(date(2))).planned.templateId).toBe(template.id);
  await archiveCustomTemplate(template.id);
  const view = await getProgrammeView(date(2));
  expect(view.planned.templateId).toBe(template.id);
  expect(view.templates.some((t) => t.id === template.id)).toBe(false);
  await expect(saveTrainingProgramme(revision.programme, revision.id)).rejects.toThrow("no longer available");
});

it("rejects imported forked or malformed programme history instead of overwriting it", async () => {
  const root = await saveTrainingProgramme(programme, null);
  const rows = await db.events.where("type").equals("TRAIN_PROGRAM_SET").toArray();
  const original = rows[0]!;
  const payload = { commandId: "synthetic-change", previousId: root.id, programme: null };
  expect(() => projectTrainingProgramme([...rows, { ...original, id: "fork-a", payload }, { ...original, id: "fork-b", payload }])).toThrow("conflicting");
  expect(() => projectTrainingProgramme([{ ...original, payload: {} }])).toThrow("incomplete");
});
it("restores a custom-template assignment together with its referenced template", async () => {
  const template = await createCustomTemplate({ name: "Synthetic custom programme", exercises: WORKOUT_TEMPLATES.A!.exercises });
  await saveTrainingProgramme({ mode: "WEEKDAYS", slots: { "1": template.id } }, null);
  const backup = new File([await db.export()], "synthetic-custom-programme.json", { type: "application/json" });
  await db.events.clear(); await db.customWorkoutTemplates.clear();
  await previewAnyRestore(backup); await applyAnyRestore(backup);
  const view = await getProgrammeView(date(2));
  expect(view.planned.templateId).toBe(template.id);
  expect(view.templates.find((t) => t.id === template.id)?.name).toBe("Synthetic custom programme");
});

it("programme edits leave canonical check-ins, recommendations and decision traces unchanged", async () => {
  const day = await startDay();
  await submitCheckIn(day.id, { energy: 1, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  const recommendations = await db.recommendations.toArray(), checkIns = await db.checkIns.toArray();
  const revision = await saveTrainingProgramme(programme, null);
  await saveTrainingProgramme(null, revision.id);
  expect(await db.recommendations.toArray()).toEqual(recommendations);
  expect(await db.checkIns.toArray()).toEqual(checkIns);
});

async function threeCustomTemplates() {
  return Promise.all((["Foundation A", "Foundation B", "Foundation C"] as const).map((name, index) => createCustomTemplate({
    name,
    exercises: WORKOUT_TEMPLATES[["A", "B", "C"][index] as "A" | "B" | "C"]!.exercises,
  })));
}

it("activates an exact three-template sequence and derives advancement from qualifying outcomes", async () => {
  const templates = await threeCustomTemplates();
  const sequence = buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates);
  const activation = await saveTrainingProgramme(sequence, null);
  let view = await getProgrammeView();
  expect(view.sequence).toMatchObject({ status: "READY", nextMember: { key: "A", templateId: templates[0]!.id } });
  expect(view.planned.templateId).toBeNull();

  const day = await startDay();
  const partial = await startWorkout(day.id, templates[0]!.id, "STANDARD", { overrideConfirmed: true });
  await logSet(day.id, partial.id, templates[0]!.exercises[0]!.exerciseId, 1, 100, 8);
  await completeWorkout(day.id, partial.id, "STANDARD", "PARTIAL");
  view = await getProgrammeView();
  expect(view.sequence?.nextMember?.key).toBe("A");

  const reduced = await startWorkout(day.id, templates[0]!.id, "REDUCED", { overrideConfirmed: true });
  await logSet(day.id, reduced.id, templates[0]!.exercises[0]!.exerciseId, 1, 100, 8);
  await completeWorkout(day.id, reduced.id, "REDUCED", "PARTIAL");
  view = await getProgrammeView();
  expect(view.sequence?.nextMember?.key).toBe("B");
  expect(view.sequence?.why).toContain("reduced partial");

  const emptyMember = await startWorkout(day.id, templates[1]!.id, "STANDARD", { overrideConfirmed: true });
  await completeWorkout(day.id, emptyMember.id, "STANDARD", "COMPLETED");
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("B");

  const nonMember = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
  await logSet(day.id, nonMember.id, WORKOUT_TEMPLATES.A!.exercises[0]!.exerciseId, 1, 100, 8);
  await completeWorkout(day.id, nonMember.id, "STANDARD", "COMPLETED");
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("B");

  const outOfOrder = await startWorkout(day.id, templates[2]!.id, "STANDARD", { overrideConfirmed: true });
  await logSet(day.id, outOfOrder.id, templates[2]!.exercises[0]!.exerciseId, 1, 100, 8);
  await completeWorkout(day.id, outOfOrder.id, "STANDARD", "COMPLETED");
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("A");

  await expect(saveTrainingProgramme(null, null)).rejects.toThrow("Programme changed");
  const cleared = await saveTrainingProgramme(null, activation.id);
  expect(cleared.programme).toBeNull();
});

it("abstains when an activated member changes or is archived and preserves the prior programme for undo", async () => {
  const prior = await saveTrainingProgramme(programme, null);
  const templates = await threeCustomTemplates();
  const sequence = buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates);
  const activation = await saveTrainingProgramme(sequence, prior.id);
  let view = await getProgrammeView();
  expect(view.sequence?.previousProgramme).toEqual(programme);
  await updateCustomTemplate(templates[1]!.id, { name: "Changed after review" });
  view = await getProgrammeView();
  expect(view.sequence?.status).toBe("REVIEW_REQUIRED");
  expect(view.sequence?.members[1]?.issue).toBe("CHANGED");
  await archiveCustomTemplate(templates[2]!.id);
  view = await getProgrammeView();
  expect(view.sequence?.members[2]?.issue).toBe("ARCHIVED");
  await saveTrainingProgramme(view.sequence!.previousProgramme, activation.id);
  expect((await getTrainingProgramme()).programme).toEqual(programme);
});

it("round-trips a sequence and its snapshots through the existing backup contract", async () => {
  const templates = await threeCustomTemplates();
  const sequence = buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates);
  await saveTrainingProgramme(sequence, null);
  const backup = new File([await db.export()], "synthetic-sequence.json", { type: "application/json" });
  await db.events.clear(); await db.customWorkoutTemplates.clear();
  await previewAnyRestore(backup); await applyAnyRestore(backup);
  const restored = await getProgrammeView();
  expect(restored.sequence?.status).toBe("READY");
  expect(restored.sequence?.members.map((member) => member.name)).toEqual(["Foundation A", "Foundation B", "Foundation C"]);
});

it("links exact HOME forms, records provenance, advances only a completed worked form, and suppresses loaded progression", async () => {
  const templates = await threeCustomTemplates();
  const activation = await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates), null);
  const homes = await createCustomTemplateSet(GRAYSON_HOME_TEMPLATE_INPUTS);
  const linked = linkSequenceHomeForms(activation.programme as import("../../src/domain/workout/trainingProgramme").SequenceTrainingProgramme, homes.map((home) => home.id) as [string, string, string], homes);
  const linkedRevision = await saveTrainingProgramme(linked, activation.id);
  const view = await getProgrammeView();
  expect(view.sequence?.nextMember?.home).toMatchObject({ templateId: homes[0]!.id, issue: null });

  const day = await startDay();
  const context = { programmeRevisionId: linkedRevision.id!, memberKey: "A" as const, parentTemplateId: templates[0]!.id, form: "HOME" as const };
  const foreign = await startWorkout(day.id, homes[0]!.id, "STANDARD", { overrideConfirmed: true, programmeContext: context });
  await logSet(day.id, foreign.id, "foreign-exercise", 1, 0, 20);
  await completeWorkout(day.id, foreign.id, "STANDARD", "COMPLETED");
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("A");
  const partial = await startWorkout(day.id, homes[0]!.id, "STANDARD", { overrideConfirmed: true, programmeContext: context });
  await logSet(day.id, partial.id, homes[0]!.exercises[0]!.exerciseId, 1, 0, 8);
  await completeWorkout(day.id, partial.id, "STANDARD", "PARTIAL");
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("A");

  const completed = await startWorkout(day.id, homes[0]!.id, "STANDARD", { overrideConfirmed: true, programmeContext: context });
  await logSet(day.id, completed.id, homes[0]!.exercises[0]!.exerciseId, 1, 0, 10);
  await completeWorkout(day.id, completed.id, "STANDARD", "COMPLETED");
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("B");
  const completedEvent = (await db.events.where("type").equals("WORKOUT_COMPLETED").toArray()).find((event) => (event.payload as { sessionId?: string }).sessionId === completed.id);
  expect((completedEvent?.payload as { programmeContext?: unknown }).programmeContext).toEqual(context);
  expect((await getTrainingHistory()).find((entry) => entry.id === completed.id)?.programmeForm).toBe("HOME");
  expect((await getProgressionSuggestion(homes[0]!.id, "STANDARD", homes[0]!.exercises[0]!.exerciseId)).reason).toContain("loaded progression");

  const backup = new File([await db.export()], "synthetic-home-links.json", { type: "application/json" });
  await db.events.clear(); await db.customWorkoutTemplates.clear(); await db.workoutSessions.clear(); await db.performedSets.clear();
  await previewAnyRestore(backup); await applyAnyRestore(backup);
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("B");
});

it("refuses stale or changed HOME starts without blocking the confirmed full member", async () => {
  const templates = await threeCustomTemplates();
  const activation = await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates), null);
  const homes = await createCustomTemplateSet(GRAYSON_HOME_TEMPLATE_INPUTS);
  const linked = linkSequenceHomeForms(activation.programme as import("../../src/domain/workout/trainingProgramme").SequenceTrainingProgramme, homes.map((home) => home.id) as [string, string, string], homes);
  const revision = await saveTrainingProgramme(linked, activation.id);
  const day = await startDay();
  const context = { programmeRevisionId: revision.id!, memberKey: "A" as const, parentTemplateId: templates[0]!.id, form: "HOME" as const };
  await expect(startWorkout(day.id, homes[0]!.id, "RECOVERY", { overrideConfirmed: true, programmeContext: context })).rejects.toThrow("HOME_FORM_INVALID");
  await updateCustomTemplate(templates[0]!.id, { name: "Changed parent A" });
  await expect(startWorkout(day.id, homes[0]!.id, "STANDARD", { overrideConfirmed: true, programmeContext: context })).rejects.toThrow("Programme member changed");
  await updateCustomTemplate(templates[0]!.id, { name: "Foundation A" });
  await updateCustomTemplate(homes[0]!.id, { name: "Changed HOME A" });
  await expect(startWorkout(day.id, homes[0]!.id, "STANDARD", { overrideConfirmed: true, programmeContext: context })).rejects.toThrow("changed or is unavailable");
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("A");
  const full = await startWorkout(day.id, templates[0]!.id, "STANDARD", { overrideConfirmed: true });
  expect(full.templateId).toBe(templates[0]!.id);
});

it("atomically fills a mixed HOME-template state without duplicating an exact existing default", async () => {
  const existing = await createCustomTemplate(GRAYSON_HOME_TEMPLATE_INPUTS[0]!);
  const ensured = await ensureExactCustomTemplateSet(GRAYSON_HOME_TEMPLATE_INPUTS);
  expect(ensured).toHaveLength(3);
  expect(ensured[0]!.id).toBe(existing.id);
  expect(await db.customWorkoutTemplates.count()).toBe(3);
});

it("abstains when imported HOME completion provenance disagrees with its session", async () => {
  const templates = await threeCustomTemplates();
  const activation = await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates), null);
  const homes = await createCustomTemplateSet(GRAYSON_HOME_TEMPLATE_INPUTS);
  const linked = linkSequenceHomeForms(activation.programme as import("../../src/domain/workout/trainingProgramme").SequenceTrainingProgramme, homes.map((home) => home.id) as [string, string, string], homes);
  const revision = await saveTrainingProgramme(linked, activation.id);
  const day = await startDay();
  const context = { programmeRevisionId: revision.id!, memberKey: "A" as const, parentTemplateId: templates[0]!.id, form: "HOME" as const };
  const session = await startWorkout(day.id, homes[0]!.id, "STANDARD", { overrideConfirmed: true, programmeContext: context });
  await logSet(day.id, session.id, homes[0]!.exercises[0]!.exerciseId, 1, 0, 10);
  await completeWorkout(day.id, session.id, "STANDARD", "COMPLETED");
  const event = (await db.events.where("type").equals("WORKOUT_COMPLETED").toArray())[0]!;
  await db.events.update(event.id, { payload: { ...(event.payload as object), programmeContext: { ...context, memberKey: "B" } } });
  const view = await getProgrammeView();
  expect(view.sequence?.status).toBe("UNKNOWN");
  expect(view.sequence?.why).toContain("conflicts");
});

it("preserves the earned next member when HOME links create a new programme revision", async () => {
  const templates = await threeCustomTemplates();
  const activation = await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates), null);
  const day = await startDay();
  const full = await startWorkout(day.id, templates[0]!.id, "STANDARD", { overrideConfirmed: true });
  await logSet(day.id, full.id, templates[0]!.exercises[0]!.exerciseId, 1, 100, 8);
  await completeWorkout(day.id, full.id, "STANDARD", "COMPLETED");
  const before = await getProgrammeView();
  expect(before.sequence?.nextMember?.key).toBe("B");
  const homes = await createCustomTemplateSet(GRAYSON_HOME_TEMPLATE_INPUTS);
  const linked = linkSequenceHomeForms(activation.programme as import("../../src/domain/workout/trainingProgramme").SequenceTrainingProgramme, homes.map((home) => home.id) as [string, string, string], homes, before.sequence!.nextMember!.templateId);
  await saveTrainingProgramme(linked, activation.id);
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("B");
});

it("restores a prior sequence from its earned next member rather than its original start", async () => {
  const templates = await threeCustomTemplates();
  const first = buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates);
  const firstRevision = await saveTrainingProgramme(first, null);
  const day = await startDay();
  const workout = await startWorkout(day.id, templates[0]!.id, "STANDARD", { overrideConfirmed: true });
  await logSet(day.id, workout.id, templates[0]!.exercises[0]!.exerciseId, 1, 100, 8);
  await completeWorkout(day.id, workout.id, "STANDARD", "COMPLETED");
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("B");

  const replacement = buildSequenceProgramme([templates[2]!.id, templates[0]!.id, templates[1]!.id], templates);
  const replacementRevision = await saveTrainingProgramme(replacement, firstRevision.id);
  const replacementView = await getProgrammeView();
  expect(replacementView.sequence?.previousProgramme?.mode).toBe("SEQUENCE");
  expect(replacementView.sequence?.previousProgramme?.mode === "SEQUENCE" ? replacementView.sequence.previousProgramme.startTemplateId : null).toBe(templates[1]!.id);

  await saveTrainingProgramme(replacementView.sequence!.previousProgramme, replacementRevision.id);
  const restored = await getProgrammeView();
  expect(restored.sequence?.nextMember?.templateId).toBe(templates[1]!.id);
});

// ---- GRAYSON-TRAIN-SHORT-LINK-001: SHORT is HOME's sibling: an exact linked smaller loaded prescription. ----
type Seq = import("../../src/domain/workout/trainingProgramme").SequenceTrainingProgramme;

async function activateWithShort() {
  const templates = await threeCustomTemplates();
  const activation = await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates), null);
  const shorts = await ensureExactCustomTemplateSet(shortDraftInputs(activation.programme as Seq));
  const revision = await saveTrainingProgramme(linkSequenceShortForms(activation.programme as Seq, shorts.map((t) => t.id) as [string, string, string], shorts), activation.id);
  return { templates, activation, shorts, revision };
}

it("SHORT drafts are each member's first three FULL movements, unlinked until confirmed", async () => {
  const templates = await threeCustomTemplates();
  const activation = await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates), null);
  const drafts = shortDraftInputs(activation.programme as Seq);
  expect(drafts.map((d) => d.name)).toEqual(["Foundation A · SHORT", "Foundation B · SHORT", "Foundation C · SHORT"]);
  expect(drafts[0]!.exercises).toEqual(templates[0]!.exercises.slice(0, 3));
  await ensureExactCustomTemplateSet(drafts);
  expect((await getProgrammeView()).sequence?.members.every((m) => m.short === null)).toBe(true);
});

it("links exact SHORT forms: a partial holds, a completed worked SHORT advances, history names it, loaded progression stays", async () => {
  const { templates, shorts, revision } = await activateWithShort();
  expect((await getProgrammeView()).sequence?.nextMember?.short).toMatchObject({ templateId: shorts[0]!.id, issue: null });
  const day = await startDay();
  const context = { programmeRevisionId: revision.id!, memberKey: "A" as const, parentTemplateId: templates[0]!.id, form: "SHORT" as const };
  const partial = await startWorkout(day.id, shorts[0]!.id, "STANDARD", { overrideConfirmed: true, programmeContext: context });
  await logSet(day.id, partial.id, shorts[0]!.exercises[0]!.exerciseId, 1, 100, 8);
  await completeWorkout(day.id, partial.id, "STANDARD", "PARTIAL");
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("A");
  const done = await startWorkout(day.id, shorts[0]!.id, "STANDARD", { overrideConfirmed: true, programmeContext: context });
  await logSet(day.id, done.id, shorts[0]!.exercises[0]!.exerciseId, 1, 100, 8);
  await completeWorkout(day.id, done.id, "STANDARD", "COMPLETED");
  const view = await getProgrammeView();
  expect(view.sequence?.nextMember?.key).toBe("B");
  expect(view.sequence?.why).toContain("SHORT completed");
  expect((await getTrainingHistory()).find((entry) => entry.id === done.id)?.programmeForm).toBe("SHORT");
  // SHORT is loaded work on its own template: normal progression applies (unlike HOME).
  expect((await getProgressionSuggestion(shorts[0]!.id, "STANDARD", shorts[0]!.exercises[0]!.exerciseId)).reason ?? "").not.toContain("loaded progression");

  const backup = new File([await db.export()], "synthetic-short-links.json", { type: "application/json" });
  await db.events.clear(); await db.customWorkoutTemplates.clear(); await db.workoutSessions.clear(); await db.performedSets.clear();
  await previewAnyRestore(backup); await applyAnyRestore(backup);
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("B");
});

it("refuses SHORT links that are bodyweight, the FULL template itself, or shared with HOME, and stale SHORT starts", async () => {
  const templates = await threeCustomTemplates();
  const activation = await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates), null);
  const seq = activation.programme as Seq;
  const homes = await createCustomTemplateSet(GRAYSON_HOME_TEMPLATE_INPUTS);
  expect(() => linkSequenceShortForms(seq, homes.map((h) => h.id) as [string, string, string], homes)).toThrow("loaded SHORT");
  expect(() => linkSequenceShortForms(seq, templates.map((t) => t.id) as [string, string, string], templates)).toThrow("not the FULL one");
  const shorts = await ensureExactCustomTemplateSet(shortDraftInputs(seq));
  const withShort = linkSequenceShortForms(seq, shorts.map((t) => t.id) as [string, string, string], shorts);
  const clash = { ...withShort, members: withShort.members.map((m, i) => i === 0 ? { ...m, home: { templateId: shorts[0]!.id, snapshot: m.short!.snapshot } } : m) } as Seq;
  await expect(saveTrainingProgramme(clash, activation.id)).rejects.toThrow();
  const revision = await saveTrainingProgramme(withShort, activation.id);
  const day = await startDay();
  const context = { programmeRevisionId: revision.id!, memberKey: "A" as const, parentTemplateId: templates[0]!.id, form: "SHORT" as const };
  await expect(startWorkout(day.id, shorts[0]!.id, "RECOVERY", { overrideConfirmed: true, programmeContext: context })).rejects.toThrow("SHORT_FORM_INVALID");
  await updateCustomTemplate(shorts[0]!.id, { name: "Changed SHORT A" });
  await expect(startWorkout(day.id, shorts[0]!.id, "STANDARD", { overrideConfirmed: true, programmeContext: context })).rejects.toThrow("changed or is unavailable");
  expect((await getProgrammeView()).sequence?.members[0]!.short?.issue).toBe("CHANGED");
  // FULL stays available while SHORT needs review.
  expect((await startWorkout(day.id, templates[0]!.id, "STANDARD", { overrideConfirmed: true })).templateId).toBe(templates[0]!.id);
});

it("preserves the earned next member when SHORT links create a new programme revision", async () => {
  const templates = await threeCustomTemplates();
  const activation = await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates), null);
  const day = await startDay();
  const full = await startWorkout(day.id, templates[0]!.id, "STANDARD", { overrideConfirmed: true });
  await logSet(day.id, full.id, templates[0]!.exercises[0]!.exerciseId, 1, 100, 8);
  await completeWorkout(day.id, full.id, "STANDARD", "COMPLETED");
  const before = await getProgrammeView();
  const shorts = await ensureExactCustomTemplateSet(shortDraftInputs(activation.programme as Seq));
  await saveTrainingProgramme(linkSequenceShortForms(activation.programme as Seq, shorts.map((t) => t.id) as [string, string, string], shorts, before.sequence!.nextMember!.templateId), activation.id);
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("B");
});
