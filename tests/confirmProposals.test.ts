import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { confirmProposals } from "../src/application/alfred/contextActions";
import { buildPlanningContext } from "../src/application/alfred/personalContext";
import { startDay } from "../src/application/commands";
import { createObligation, modifyObligation } from "../src/application/intentCommands";
import { db } from "../src/persistence/db";

/** GRAYSON-DICTATE-001: the shared save loop behind Drive Home and the "I heard" preview. Invented data. */
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 31, 17)); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const water = () => db.events.where("type").equals("WATER_LOGGED").count();

it("saves in order and advances the context with his own saves", async () => {
  await startDay();
  const context = await buildPlanningContext(false);
  const done = await confirmProposals([{ kind: "remember", text: "Invented fact", topic: "OTHER" }, { kind: "log_water", oz: 16 }], context, false);
  expect(done.error).toBeNull();
  expect(done.saved).toBe(2);
  expect(done.context.personalVersion).not.toBe(context.personalVersion);
  expect(await water()).toBe(1);
});

it("stops at the first failure and reports how many saved", async () => {
  await startDay();
  const task = await createObligation({ title: "Call the bank" });
  const context = await buildPlanningContext(false);
  const done = await confirmProposals([{ kind: "log_water", oz: 8 }, { kind: "task_done", task_id: task.id, title: "Pay the car" }, { kind: "log_water", oz: 12 }], context, false);
  expect(done.saved).toBe(1);
  expect(done.error).toBeInstanceOf(Error);
  expect(await water()).toBe(1);
});

it("passes CONTEXT_CHANGED through when something changed since the read", async () => {
  await startDay();
  const task = await createObligation({ title: "Call the bank" });
  const context = await buildPlanningContext(false);
  vi.setSystemTime(new Date(2026, 9, 31, 17, 1));
  await modifyObligation(task.id, { title: "A corrected task" });
  const done = await confirmProposals([{ kind: "log_water", oz: 8 }], context, false);
  expect(done.saved).toBe(0);
  expect((done.error as Error).message).toBe("CONTEXT_CHANGED");
  expect(await water()).toBe(0);
});
