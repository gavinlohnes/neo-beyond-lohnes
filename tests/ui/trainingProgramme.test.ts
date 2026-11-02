import { startDay, submitCheckIn } from "../../src/application/commands";
import { expect, it } from "vitest";
import { resolveProgrammeSlot } from "../../src/engine/trainingProgrammeResolution";
import { DEFAULT_SCHEDULE_PATTERN, scheduledWorkContextForLivedDay } from "../../src/engine/scheduledContext";
import { getTrainingProgramme, saveTrainingProgramme, projectTrainingProgramme } from "../../src/application/trainingProgramme";
import { createCustomTemplate, archiveCustomTemplate } from "../../src/application/customTemplateCommands";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";
import { getProgrammeView } from "../../src/application/trainingProgrammeQueries";
import { db } from "../../src/persistence/db";
import { previewAnyRestore, applyAnyRestore } from "../../src/persistence/restore";
import "dexie-export-import";
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
