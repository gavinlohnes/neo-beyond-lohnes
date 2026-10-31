import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { createRoutine, getRoutineHistory, getRoutineTicks, getRoutines, matchSteps, modifyRoutine, routineMomentFor, setRoutineArchived, setRoutineStep, stepKey } from "../../src/application/routineCommands";
import { applyAnyRestore } from "../../src/persistence/restore";
import { confirmProposal, describeProposal, toProposal } from "../../src/application/alfred/alfredActions";
import { searchRecords } from "../../src/application/alfred/alfredSearch";

/** ROUTINES-001. Invented routines only. */
beforeEach(async () => { await db.open(); });
afterEach(() => { db.close(); });

it("creates a routine and ticks/unticks steps on a lived day, latest wins, no-ops are no-ops", async () => {
  const day = await startDay();
  const r = await createRoutine({ title: "Pre-shift", moment: "BEFORE_SHIFT", steps: ["Shower", "Pack meals", "Fill bottle"] });
  const [a, b] = r.steps;
  expect(await setRoutineStep(day.id, r.id, a!.id, true)).toBe(true);
  expect(await setRoutineStep(day.id, r.id, a!.id, true)).toBe(false);
  await setRoutineStep(day.id, r.id, b!.id, true);
  await setRoutineStep(day.id, r.id, b!.id, false);
  expect([...(await getRoutineTicks(day.id))]).toEqual([stepKey(r.id, a!.id)]);
  expect(await db.events.where("type").equals("ROUTINE_STEP_SET").count()).toBe(3);
});

it("keeps ticks with unchanged steps when edited, rejects a stale edit, and records history", async () => {
  const day = await startDay();
  const r = await createRoutine({ title: "Wind-down", moment: "AFTER_SHIFT", steps: ["Shower", "Blackout curtains"] });
  await setRoutineStep(day.id, r.id, r.steps[1]!.id, true);
  const edited = await modifyRoutine(r.id, { steps: matchSteps(r, ["Blackout curtains", "Earplugs"]) }, r.updatedAt);
  expect(edited.steps[0]!.id).toBe(r.steps[1]!.id);
  expect((await getRoutineTicks(day.id)).has(stepKey(r.id, edited.steps[0]!.id))).toBe(true);
  await expect(modifyRoutine(r.id, { title: "Late" }, r.updatedAt)).rejects.toThrow("ROUTINE_CHANGED");
  await expect(setRoutineStep(day.id, r.id, r.steps[0]!.id, true)).rejects.toThrow("ROUTINE_STEP_NOT_FOUND");
  await setRoutineArchived(r.id, true);
  expect(await setRoutineArchived(r.id, true)).toBe(false);
  await setRoutineArchived(r.id, false);
  expect((await getRoutineHistory(r.id)).map((e) => e.type)).toEqual(["ROUTINE_CREATED", "ROUTINE_MODIFIED", "ROUTINE_ARCHIVED", "ROUTINE_RESTORED"]);
});

it("refuses empty routines and steps; saves nothing", async () => {
  await expect(createRoutine({ title: "Empty", moment: "DAY_OFF", steps: [] })).rejects.toThrow();
  await expect(createRoutine({ title: " ", moment: "DAY_OFF", steps: ["x"] })).rejects.toThrow();
  expect(await db.routines.count()).toBe(0);
});

it("maps the rotation to a moment, and declines to guess", () => {
  const at = (phase: Parameters<typeof routineMomentFor>[0]["phase"], workContext: string, workStarted = false, workEnded = false) => routineMomentFor({ phase, workContext, workStarted, workEnded });
  expect(at("PRE_WORK", "WORK")).toBe("BEFORE_SHIFT");
  expect(at("PRE_WORK", "WORK", true)).toBe("ON_SHIFT");
  expect(at("SCHEDULED_SHIFT", "WORK")).toBe("ON_SHIFT");
  expect(at("EXPECTED_POST_WORK", "WORK")).toBe("AFTER_SHIFT");
  expect(at("OFF", "WORK", true, true)).toBe("AFTER_SHIFT");
  expect(at("OFF", "WORK")).toBeNull();
  expect(at("OFF", "OFF")).toBe("DAY_OFF");
  expect(at("OFF", "UNKNOWN")).toBeNull();
  expect(at(null, "UNKNOWN")).toBeNull();
});

it("round-trips routines and ticks through backup and restore", async () => {
  const day = await startDay();
  const r = await createRoutine({ title: "Mid-shift", moment: "ON_SHIFT", steps: ["Eat", "Walk 5 min"] });
  await setRoutineStep(day.id, r.id, r.steps[0]!.id, true);
  const file = new File([await db.export({ prettyJson: true })], "b.json", { type: "application/json" });
  await createRoutine({ title: "Diverge", moment: "DAY_OFF", steps: ["x"] });
  await applyAnyRestore(file);
  expect((await getRoutines()).map((x) => x.title)).toEqual(["Mid-shift"]);
  expect((await getRoutineTicks(day.id)).size).toBe(1);
});

it("Alfred drafts and edits routines only through confirmed cards; ticks stay out of search", async () => {
  const day = await startDay();
  const p = toProposal("routine_new", { title: "Pre-shift", moment: "BEFORE_SHIFT", steps: ["Nap 20 min", "Shower"] })!;
  expect(describeProposal(p)).toBe("New routine · Before shift: Pre-shift · 1. Nap 20 min; 2. Shower");
  expect(toProposal("routine_new", { title: "X", moment: "SOMETIME", steps: ["a"] })).toBeNull();
  await confirmProposal(p);
  const [r] = await getRoutines();
  await setRoutineStep(day.id, r!.id, r!.steps[1]!.id, true);
  await confirmProposal(toProposal("routine_edit", { routine_id: r!.id, title: "Pre-shift", steps: ["Shower", "Nap 15 min"] })!);
  const [after] = await getRoutines();
  expect(after!.steps.map((st) => st.text)).toEqual(["Shower", "Nap 15 min"]);
  expect(after!.steps[0]!.id).toBe(r!.steps[1]!.id);
  await expect(confirmProposal(toProposal("routine_edit", { routine_id: "nope", title: "x" })!)).rejects.toThrow("ROUTINE_NOT_FOUND");
  expect(await searchRecords("ROUTINE_STEP_SET")).toMatch(/^No records match/);
});

it("ignores an invalid routine row", async () => {
  await db.routines.add({ id: "bad", title: "", moment: "NOPE", steps: [], status: "ACTIVE", source: "USER", createdAt: "x", updatedAt: "x" } as never);
  expect(await getRoutines()).toEqual([]);
});
