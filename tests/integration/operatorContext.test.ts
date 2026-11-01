import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay, logWater } from "../../src/application/commands";
import { createMission, archiveMission, createObligation } from "../../src/application/intentCommands";
import { createProject } from "../../src/application/projectCommands";
import { createRoutine, modifyRoutine } from "../../src/application/routineCommands";
import { recordMemory } from "../../src/application/memory";
import { rememberFact, forgetFact } from "../../src/application/alfred/alfredMemory";
import { buildPlanningContext, inspectContextSource } from "../../src/application/alfred/personalContext";
import { buildAlfredContext } from "../../src/application/alfred/alfredContext";
import { readOperatorContext, CONTEXT_TEXT_LIMIT, CONTEXT_SOURCE_LIMIT, operatorContextVersion } from "../../src/application/operatorContext";
import * as routines from "../../src/application/routineCommands";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 1, 17)); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const all = () => Promise.all(db.tables.map(async (t) => [t.name, await t.toArray()]));
it("keeps both memory origins, their lifecycles and sharing purposes honest without writes", async () => {
  const day = await startDay();
  await recordMemory({ dayId: day.id, factId: "constraint", kind: "CONSTRAINT", statement: "Keep the first morning quiet.", expectedPreviousId: null, action: "CREATED" });
  await rememberFact("I sometimes run errands after work.", "OTHER");
  const before = await all();
  const local = await readOperatorContext({ purpose: "local", includePersonal: true });
  expect(local.records.find((r) => r.id === "constraint")).toMatchObject({ classification: "Operator statement", lifecycle: "BEYOND memory — revision history available" });
  expect(local.records.find((r) => r.kind === "ALFRED_MEMORY")?.lifecycle).toContain("no revision history");
  expect(local.text).toContain("Local inspection only");
  expect((await buildPlanningContext(false)).text).not.toContain("Keep the first morning quiet");
  expect(await buildAlfredContext()).not.toContain("Keep the first morning quiet");
  expect((await buildPlanningContext(true)).text).toContain("Keep the first morning quiet");
  expect(await all()).toEqual(before);
});
it("bounds the entire source payload with no unbounded legacy prose bypass and inspects omitted records", async () => {
  await startDay();
  for (let i = 0; i < 70; i++) await rememberFact(`Legacy marker ${i}: ${"x".repeat(4000)}`, "OTHER");
  const context = await buildPlanningContext(false);
  expect(context.text.length).toBeLessThanOrEqual(CONTEXT_TEXT_LIMIT);
  expect(context.sources.length).toBeLessThanOrEqual(CONTEXT_SOURCE_LIMIT);
  expect(context.omitted).toBeGreaterThan(0);
  expect(context.coverage.find((c) => c.category === "Alfred legacy memory")?.state).toBe("partial");
  const local = await readOperatorContext({ purpose: "local", includePersonal: true });
  const omitted = local.records.find((r) => r.kind === "ALFRED_MEMORY" && !context.sources.some((s) => s.key === r.key))!;
  expect(context.text).not.toContain(omitted.text);
  expect((await inspectContextSource(omitted, false))?.text).toBe(omitted.text);
  expect((await buildAlfredContext()).length).toBeLessThanOrEqual(CONTEXT_TEXT_LIMIT);
});
it("projects and routines have first-class source identities; edits advance context, mere clock ticks do not", async () => {
  await startDay();
  const project = await createProject({ title: "Garage", finish: "Shelves up" }, [{ title: "Measure" }]);
  const routine = await createRoutine({ title: "Before shift", moment: "BEFORE_SHIFT", steps: ["Keys"] });
  const context = await buildPlanningContext(false);
  expect(context.sources.find((s) => s.kind === "PROJECT")?.id).toBe(project.project.id);
  const ref = context.sources.find((s) => s.kind === "ROUTINE")!;
  vi.setSystemTime(new Date(2026, 10, 1, 17, 1));
  expect(await operatorContextVersion(false)).toBe(context.recordVersion);
  await modifyRoutine(routine.id, { title: "Before duty" });
  expect(await operatorContextVersion(false)).not.toBe(context.recordVersion);
  expect((await inspectContextSource(ref, false))?.text).toContain("Before duty");
});
it("labels an unavailable category separately from empty and does not mutate other sources", async () => {
  await startDay();
  vi.spyOn(routines, "getRoutines").mockRejectedValue(new Error("synthetic failure"));
  const context = await buildPlanningContext(false);
  expect(context.coverage.find((c) => c.category === "Routines")?.state).toBe("unavailable");
  expect(context.coverage.find((c) => c.category === "Alfred legacy memory")?.state).toBe("empty");
  expect(context.text).not.toContain("ROUTINES: none");
});
it("excludes archived-Mission commitments from planning but preserves records for management", async () => {
  await startDay();
  const mission = await createMission({ title: "Parked direction" });
  const task = await createObligation({ title: "Do not schedule this", missionId: mission.id });
  await archiveMission(mission.id);
  expect((await buildPlanningContext(false)).text).not.toContain(task.title);
  expect(await db.obligations.get(task.id)).toBeDefined();
});
it("forgets legacy facts from the next context and tracks current recorded changes", async () => {
  const day = await startDay(); const legacy = await rememberFact("Unique legacy text", "OTHER");
  const before = await buildPlanningContext(false);
  await forgetFact(legacy.id);
  const next = await buildPlanningContext(false);
  expect(next.text).not.toContain("Unique legacy text");
  expect(await inspectContextSource(before.sources.find((s) => s.kind === "ALFRED_MEMORY")!, false)).toBeNull();
  await logWater(day.id, 8);
  expect(await operatorContextVersion(false)).not.toBe(next.recordVersion);
});

it("never labels missing Garmin steps as measured zero, including a sleep-only import", async () => {
  vi.setSystemTime(new Date("2026-10-18T17:00:00Z"));
  await startDay();
  expect((await buildPlanningContext(false)).text).toContain("steps so far today not measured");
  const { syntheticSleep } = await import("../helpers/syntheticSleep");
  const { importSleepSnapshot } = await import("../../src/application/externalSleepCommands");
  await importSleepSnapshot(syntheticSleep());
  const context = await buildPlanningContext(false);
  expect(context.text).toContain("steps so far today not measured");
  expect(context.text).not.toContain("steps so far today 0");
});
it("an unrelated SAVE cannot bless an outside correction or advance its context receipt", async () => {
  await startDay();
  const routine = await createRoutine({ title: "Old words", moment: "BEFORE_SHIFT", steps: ["Keys"] });
  const context = await buildPlanningContext(false);
  vi.setSystemTime(new Date(2026, 10, 1, 17, 1));
  await modifyRoutine(routine.id, { title: "Corrected words" });
  const { confirmContextProposal } = await import("../../src/application/alfred/contextActions");
  await expect(confirmContextProposal({ kind: "log_water", oz: 8 }, context, false)).rejects.toThrow("CONTEXT_CHANGED");
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
});
it("resolves authorized historical tool sources even outside the initial catalog", async () => {
  const old = await startDay(new Date(2026, 9, 1, 17).toISOString());
  for (let i = 2; i <= 17; i++) await startDay(new Date(2026, 9, i, 17).toISOString());
  const initial = await buildPlanningContext(false);
  expect(initial.sources.some((s) => s.id === old.id)).toBe(false);
  const { getDays, readToolSources } = await import("../../src/application/alfred/alfredSearch");
  const result = await getDays("2026-10-01", "2026-10-01");
  expect(result).toContain(`[[DAY:${old.id}]]`);
  const sources = await readToolSources(result, false);
  expect(sources).toHaveLength(1); expect(sources[0]!.id).toBe(old.id);
  expect((await inspectContextSource(sources[0]!, false))?.id).toBe(old.id);
});
