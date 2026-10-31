import { buildAlfredContext } from "../../src/application/alfred/alfredContext";
import { confirmContextProposal } from "../../src/application/alfred/contextActions";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay } from "../../src/application/commands";
import { createMission, archiveMission, createObligation, modifyObligation } from "../../src/application/intentCommands";
import { recordMemory, getMemoryFacts } from "../../src/application/memory";
import { rememberFact } from "../../src/application/alfred/alfredMemory";
import { buildPlanningContext, inspectContextSource, personalContextVersion, readPersonalSources } from "../../src/application/alfred/personalContext";
import { searchRecords } from "../../src/application/alfred/alfredSearch";
import { previewRestore, applyRestore } from "../../src/persistence/backup";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 31, 17)); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const fact = (dayId: string, kind: "DIRECTION" | "CONSTRAINT" = "CONSTRAINT") => recordMemory({ dayId, kind, factId: kind, statement: kind === "CONSTRAINT" ? "Keep the first morning quiet." : "Have more energy outside work.", action: "CREATED", expectedPreviousId: null });
const all = () => Promise.all(db.tables.map(async (t) => [t.name, await t.toArray()]));

it("connects current source records only after opt-in, with no writes or new task system", async () => {
  const day = await startDay(); await fact(day.id); const direction = await fact(day.id, "DIRECTION");
  const mission = await createMission({ title: "More time for family" });
  await createObligation({ title: "Call home", missionId: mission.id });
  await rememberFact("A confirmed Alfred fact", "OTHER");
  const before = await all();
  const off = await buildPlanningContext(false);
  expect(off.text).not.toContain("Keep the first morning quiet"); expect(off.text).not.toContain("More time for family");
  expect(off.text).toContain("A confirmed Alfred fact");
  const on = await buildPlanningContext(true);
  expect(on.text).toContain("Keep the first morning quiet"); expect(on.text).toContain("More time for family");
  expect(on.sources.find((s) => s.id === direction.factId)).toMatchObject({ kind: "MEMORY", revision: direction.id });
  expect(on.personalVersion).toBe(await personalContextVersion(true));
  expect(await all()).toEqual(before);
});

it("corrections, irrelevance and archived Missions invalidate context and inspection", async () => {
  const day = await startDay(), first = await fact(day.id);
  const mission = await createMission({ title: "A chosen direction" });
  const original = await buildPlanningContext(true), ref = original.sources.find((s) => s.id === first.factId)!;
  const corrected = await recordMemory({ dayId: day.id, factId: first.factId, expectedPreviousId: first.id, action: "CORRECTED", statement: "Keep the second morning quiet." });
  expect((await inspectContextSource(ref, true))!.revision).toBe(corrected.id);
  expect((await buildPlanningContext(true)).text).not.toContain("Keep the first morning quiet");
  expect(await personalContextVersion(true)).not.toBe(original.personalVersion);
  await recordMemory({ dayId: day.id, factId: first.factId, expectedPreviousId: corrected.id, action: "IRRELEVANT" });
  await archiveMission(mission.id);
  expect(await inspectContextSource(ref, true)).toBeNull();
  expect(await readPersonalSources()).toEqual([]);
  expect((await getMemoryFacts())[0]!.history).toHaveLength(3);
});

it("read tools cannot recover opted-out or superseded memory through historical events", async () => {
  const day = await startDay(), first = await fact(day.id);
  await createMission({ title: "Private mission zebra" });
  await recordMemory({ dayId: day.id, factId: first.factId, expectedPreviousId: first.id, action: "CORRECTED", statement: "Use a quiet afternoon instead." });
  expect(await searchRecords("first morning", 30, true)).toContain("No records match");
  expect(await searchRecords("quiet afternoon", 30, false)).toContain("No records match");
  expect(await searchRecords("Private mission zebra", 30, false)).toContain("No records match");
  expect(await searchRecords("quiet afternoon", 30, true)).toContain("MEMORY");
});

it("round-trips additive personal kinds and history in native backups, preserving old backup behavior", async () => {
  const day = await startDay(); const old = new File([await db.export()], "before.json");
  await fact(day.id); await fact(day.id, "DIRECTION");
  const expected = await getMemoryFacts(), backup = new File([await db.export()], "personal.json");
  expect((await previewRestore(backup)).databaseVersion).toBe(db.verno);
  await applyRestore(old); expect(await getMemoryFacts()).toEqual([]);
  await applyRestore(backup); expect(await getMemoryFacts()).toEqual(expected);
});

it("fails closed when selected personal history is corrupt; an unreadable fact is not empty context", async () => {
  const day = await startDay(); await fact(day.id);
  const e = (await db.events.where("type").equals("MEMORY_RECORDED").toArray())[0]!;
  await db.events.update(e.id, { payload: { broken: true } });
  await expect(buildPlanningContext(true)).rejects.toThrow();
});

it("rejects changed tasks and rolled-over days in the same transaction as canonical confirmation", async () => {
  await startDay(); const task = await createObligation({ title: "A real task" });
  const before = await buildPlanningContext(false);
  vi.setSystemTime(new Date(2026, 9, 31, 17, 1));
  await modifyObligation(task.id, { title: "A corrected task" });
  await expect(confirmContextProposal({ kind: "task_done", task_id: task.id, title: task.title }, before, false)).rejects.toThrow("CONTEXT_CHANGED");
  expect((await db.obligations.get(task.id))!.status).toBe("OPEN");
  const next = await buildPlanningContext(false);
  vi.setSystemTime(new Date(2026, 10, 1, 17));
  await expect(confirmContextProposal({ kind: "log_water", oz: 8 }, next, false)).rejects.toThrow("CONTEXT_CHANGED");
  expect(await db.events.where("type").equals("WATER_LOGGED").count()).toBe(0);
});

it("preserves #352's automatic prep/recovery context without uploading new personal kinds", async () => {
  const day = await startDay(); await fact(day.id); await fact(day.id, "DIRECTION");
  await recordMemory({ dayId: day.id, factId: "prep", kind: "PREP_FOOD", statement: "Frozen backup is practical.", action: "CREATED", expectedPreviousId: null });
  const automatic = await buildAlfredContext();
  expect(automatic).toContain("Frozen backup is practical.");
  expect(automatic).not.toContain("Keep the first morning quiet");
  expect(automatic).not.toContain("Have more energy outside work");
  const conversation = await buildPlanningContext(false);
  expect(conversation.text).not.toContain("Frozen backup is practical.");
  expect((await buildPlanningContext(true)).text).toContain("Frozen backup is practical.");
});
