import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { applyAnyRestore, previewAnyRestore } from "../../src/persistence/restore";
import { archiveMission, createMission, createObligation, satisfyObligation } from "../../src/application/intentCommands";
import { createProject, modifyProject, setObligationProject, setProjectNext, setProjectStatus } from "../../src/application/projectCommands";
import { getProjectHistory, getProjectViews } from "../../src/application/projectQueries";
import { getCurrentlyEligibleUnresolvedObligations, getObligation, getObligationHistory } from "../../src/application/intentQueries";
import { buildRecurrenceRule } from "../../src/engine/recurrence";

/** PROJECTS-001: invented data only. */
beforeEach(async () => { await db.open(); });
afterEach(() => { db.close(); });

const view = async (id: string) => (await getProjectViews()).find((v) => v.project.id === id)!;

it("creates a project with its steps in one go, and counts progress honestly", async () => {
  const { project, steps } = await createProject({ title: "Renew a passport", finish: "New passport in hand" }, [
    { title: "Fill in the form" }, { title: "Get photos" }, { title: "Book appointment", dueAt: "2026-11-10" },
  ]);
  expect(steps.map((s) => s.projectId)).toEqual([project.id, project.id, project.id]);
  await satisfyObligation(steps[0]!.id);
  const v = await view(project.id);
  expect(v.progress).toMatchObject({ total: 3, done: 1, open: 2, waiting: 0, released: 0, next: null, nextResolved: false });
  const types = (await getProjectHistory(project.id)).map((e) => e.type);
  expect(types).toEqual(["PROJECT_CREATED"]);
  const created = (await getObligationHistory(steps[2]!.id))[0]!;
  expect(created.payload).toMatchObject({ projectId: project.id });
});

it("saves nothing when one step is invalid", async () => {
  await expect(createProject({ title: "Half a plan" }, [{ title: "Good step" }, { title: "  " }])).rejects.toThrow();
  expect(await db.projects.count()).toBe(0);
  expect(await db.obligations.count()).toBe(0);
});

it("pausing, completing or closing never touches the steps, and reopening is explicit", async () => {
  const { project, steps } = await createProject({ title: "Garage clear-out" }, [{ title: "Sort shelves", dueAt: "2026-11-02" }]);
  const before = await db.obligations.toArray();
  const eligible = await getCurrentlyEligibleUnresolvedObligations();
  expect(await setProjectStatus(project.id, "PAUSED", "ACTIVE")).toBe(true);
  expect(await setProjectStatus(project.id, "PAUSED")).toBe(false);
  await setProjectStatus(project.id, "COMPLETED");
  expect(await db.obligations.toArray()).toEqual(before);
  expect(await getCurrentlyEligibleUnresolvedObligations()).toEqual(eligible);
  await expect(createObligation({ title: "One more", projectId: project.id })).rejects.toThrow("PROJECT_FINISHED");
  await expect(setProjectStatus(project.id, "PAUSED")).rejects.toThrow("INVALID_PROJECT_TRANSITION");
  await expect(setProjectStatus(project.id, "ACTIVE", "PAUSED")).rejects.toThrow("PROJECT_CHANGED");
  await setProjectStatus(project.id, "ACTIVE", "COMPLETED");
  await createObligation({ title: "One more", projectId: project.id });
  expect((await view(project.id)).progress.total).toBe(2);
  expect((await getObligation(steps[0]!.id))!.status).toBe("OPEN");
  expect((await getProjectHistory(project.id)).filter((e) => e.type === "PROJECT_STATUS_CHANGED").map((e) => (e.payload as { to: string }).to))
    .toEqual(["PAUSED", "COMPLETED", "ACTIVE"]);
});

it("next step is the operator's choice, must belong to the project, and is never auto-picked", async () => {
  const { project, steps } = await createProject({ title: "Plan a trip" }, [{ title: "Pick dates" }, { title: "Book stay" }]);
  const outsider = await createObligation({ title: "Unrelated" });
  await expect(setProjectNext(project.id, outsider.id)).rejects.toThrow("NOT_A_PROJECT_STEP");
  await setProjectNext(project.id, steps[0]!.id);
  expect((await view(project.id)).progress.next?.id).toBe(steps[0]!.id);
  await satisfyObligation(steps[0]!.id);
  const after = (await view(project.id)).progress;
  expect(after.next).toBeNull(); expect(after.nextResolved).toBe(true);
  await setProjectNext(project.id, null);
  await expect(setProjectNext(project.id, steps[0]!.id)).rejects.toThrow("OBLIGATION_ALREADY_RESOLVED");
  expect((await view(project.id)).progress.nextResolved).toBe(false);
});

it("moves a commitment in and out; leaving clears it as next in the same write", async () => {
  const { project } = await createProject({ title: "Fix the fence" });
  const task = await createObligation({ title: "Buy posts" });
  await setObligationProject(task.id, project.id);
  await setProjectNext(project.id, task.id);
  expect(await setObligationProject(task.id, project.id)).toBe(false);
  await setObligationProject(task.id, null);
  expect((await getObligation(task.id))!.projectId).toBeUndefined();
  expect((await db.projects.get(project.id))!.nextObligationId).toBeUndefined();
  expect((await getProjectHistory(project.id)).map((e) => e.type)).toEqual(["PROJECT_CREATED", "OBLIGATION_PROJECT_SET", "PROJECT_NEXT_SET", "OBLIGATION_PROJECT_SET", "PROJECT_NEXT_SET"]);
  expect((await getObligationHistory(task.id)).map((e) => e.type)).toContain("OBLIGATION_PROJECT_SET");
});

it("keeps Mission rules: no new project under an archived mission, archived links untouched", async () => {
  const mission = await createMission({ title: "Invented direction" });
  const { project } = await createProject({ title: "Under a mission", missionId: mission.id });
  await archiveMission(mission.id);
  await expect(createProject({ title: "Too late", missionId: mission.id })).rejects.toThrow("MISSION_ARCHIVED");
  expect((await db.projects.get(project.id))!.missionId).toBe(mission.id);
  await modifyProject(project.id, { finish: "Done when it's done" });
  expect((await db.projects.get(project.id))!.finish).toBe("Done when it's done");
});

it("a repeating step's next occurrence stays in an open project and goes standalone once it's finished", async () => {
  const recurrence = { rrule: buildRecurrenceRule({ freq: "WEEKLY", interval: 1, anchor: "2026-11-02" }) };
  const { project, steps } = await createProject({ title: "Weekly tidy" }, [{ title: "Tidy", dueAt: "2026-11-02", recurrence }]);
  await satisfyObligation(steps[0]!.id);
  expect((await view(project.id)).progress.total).toBe(2);
  await setProjectStatus(project.id, "CLOSED");
  const open = (await db.obligations.toArray()).find((o) => o.status === "OPEN")!;
  await satisfyObligation(open.id);
  const standalone = (await db.obligations.toArray()).find((o) => o.status === "OPEN")!;
  expect(standalone.projectId).toBeUndefined();
});

it("round-trips projects, links and history through backup and restore", async () => {
  const { project, steps } = await createProject({ title: "Backup me", finish: "Restored" }, [{ title: "Step one" }]);
  await setProjectNext(project.id, steps[0]!.id);
  await setProjectStatus(project.id, "PAUSED");
  const file = new File([await db.export({ prettyJson: true })], "backup.json", { type: "application/json" });
  const preview = await previewAnyRestore(file);
  if (preview.format === "NATIVE") expect(preview.tables.some((t) => t.name === "projects" && t.rowCount === 1)).toBe(true);
  await createProject({ title: "Diverge" });
  await applyAnyRestore(file);
  const views = await getProjectViews();
  expect(views).toHaveLength(1);
  expect(views[0]!.project).toMatchObject({ id: project.id, status: "PAUSED", finish: "Restored", nextObligationId: steps[0]!.id });
  expect(views[0]!.progress.next?.id).toBe(steps[0]!.id);
  expect((await getProjectHistory(project.id)).length).toBe(3);
});

it("ignores an invalid project row instead of trusting it", async () => {
  await db.projects.add({ id: "bad", title: "", status: "ACTIVE", source: "USER", createdAt: "x", updatedAt: "x" } as never);
  expect(await getProjectViews()).toEqual([]);
});

it("Alfred's add-step card names its project, and the save checks it's the same one", async () => {
  const { confirmProposal, describeProposal, toProposal } = await import("../../src/application/alfred/alfredActions");
  const { project } = await createProject({ title: "Fix the fence" });
  const card = toProposal("add_reminder", { title: "Buy posts", project_id: project.id, project_title: "Fix the fence" })!;
  expect(describeProposal(card)).toBe("Add step to Fix the fence: Buy posts");
  await expect(confirmProposal({ ...card, project_title: "Paint the shed" } as typeof card)).rejects.toThrow("PROJECT_MISMATCH");
  expect(await db.obligations.count()).toBe(0);
  await confirmProposal(card);
  expect((await view(project.id)).progress.total).toBe(1);
});
