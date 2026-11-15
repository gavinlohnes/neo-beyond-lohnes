import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { captureItem, deleteCaptureItem } from "../../src/application/commands";
import { convertCaptureToObligation } from "../../src/application/intentCommands";
import { applyAnyRestore } from "../../src/persistence/restore";

beforeEach(async () => { await db.open(); });
afterEach(() => db.close());
it("native backup retains untouched raw text and the explicitly promoted plan with its source history", async () => {
  const raw = await captureItem("Not a task; keep this raw");
  const original = await captureItem("A thought with context\nNo date inferred");
  const task = await convertCaptureToObligation(original.id, { title: "Chosen plan", plannedAt: "2026-11-21", dueAt: "2026-11-25" });
  const blob = await db.export({ prettyJson: true });
  await deleteCaptureItem(raw.id); await captureItem("Temporary divergence");
  await applyAnyRestore(new File([blob], "capture-native.json", { type: "application/json" }));
  expect(await db.captureItems.get(raw.id)).toMatchObject({ status: "OPEN", text: raw.text });
  expect(await db.captureItems.get(original.id)).toMatchObject({ status: "RESOLVED", text: original.text });
  expect(await db.obligations.get(task.id)).toMatchObject({ title: "Chosen plan", plannedAt: "2026-11-21", dueAt: "2026-11-25" });
  const event = (await db.events.where("type").equals("OBLIGATION_CREATED").toArray())[0]!;
  expect(event.payload).toMatchObject({ obligationId: task.id, sourceCaptureId: original.id });
  await expect(convertCaptureToObligation(original.id, { title: "Duplicate" })).rejects.toThrow("CAPTURE_NOT_OPEN");
  expect(await db.obligations.count()).toBe(1);
});
