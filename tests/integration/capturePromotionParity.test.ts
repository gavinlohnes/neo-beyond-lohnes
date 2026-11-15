import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/persistence/db";
import { captureItem } from "../../src/application/commands";
import { convertCaptureToObligation } from "../../src/application/intentCommands";
import { getTodayPlan } from "../../src/application/planTodayQueries";
import { formatLocalDate } from "../../src/engine/scheduledContext";
import {
  canConfirmCapturePromotion,
  capturePromotionConfirmLabel,
  capturePromotionError,
  capturePromotionInput,
  capturePromotionSuccess,
  emptyCapturePromotionDraft,
} from "../../src/ui/components/CapturePromotionForm";

/**
 * CAPTURE-PARITY-001: quick capture, the older Capture list and Notes Sweep
 * build their task through one draft → input mapping, so an old capture
 * processed later carries exactly the title and explicit dates chosen.
 */
beforeEach(async () => { await db.open(); });
afterEach(() => db.close());

describe("CAPTURE-PARITY-001 — one promotion mapping for every capture path", () => {
  it("sends a trimmed title and only the dates the operator chose", () => {
    expect(capturePromotionInput({ title: "  Call the bank  ", plannedAt: "", dueAt: "" })).toEqual({ title: "Call the bank" });
    expect(capturePromotionInput({ title: "Call", plannedAt: " ", dueAt: "2026-11-23" })).toEqual({ title: "Call", dueAt: "2026-11-23" });
    expect(capturePromotionInput({ title: "Call", plannedAt: "2026-11-20", dueAt: "2026-11-23" })).toEqual({ title: "Call", plannedAt: "2026-11-20", dueAt: "2026-11-23" });
    expect(emptyCapturePromotionDraft("Raw words")).toEqual({ title: "Raw words", plannedAt: "", dueAt: "" });
  });

  it("names the action by what it creates and never confirms a blank title", () => {
    expect(canConfirmCapturePromotion({ title: "   ", plannedAt: "", dueAt: "" })).toBe(false);
    expect(capturePromotionConfirmLabel({ title: "x", plannedAt: "", dueAt: "2026-11-23" })).toBe("CREATE TASK");
    expect(capturePromotionConfirmLabel({ title: "x", plannedAt: "2026-11-20", dueAt: "" })).toBe("CREATE PLAN ITEM");
    expect(capturePromotionSuccess({ title: "x", plannedAt: "2026-11-20", dueAt: "" })).toContain("separate from its deadline");
    expect(capturePromotionError(new Error("CAPTURE_NOT_OPEN: capture c is already RESOLVED."), "fallback")).toContain("already processed or removed");
  });

  it("an older capture promoted late at night keeps its explicit planned day and deadline on the local calendar", async () => {
    const old = await captureItem("Renew truck registration");
    await db.captureItems.update(old.id, { capturedAt: new Date(2026, 9, 30, 8).toISOString() });
    // 23:30 local: in America/Chicago this is already the next UTC day.
    const lateNight = new Date(2026, 10, 20, 23, 30);
    const today = formatLocalDate(lateNight);
    const draft = { ...emptyCapturePromotionDraft(old.text), plannedAt: today, dueAt: "2026-11-25" };
    const task = await convertCaptureToObligation(old.id, capturePromotionInput(draft));
    expect(task).toMatchObject({ title: "Renew truck registration", plannedAt: "2026-11-20", dueAt: "2026-11-25" });
    expect(await db.captureItems.get(old.id)).toMatchObject({ status: "RESOLVED", text: old.text });
    const plan = await getTodayPlan(lateNight);
    expect(plan.planned.map((o) => o.title)).toEqual(["Renew truck registration"]);
    const event = (await db.events.where("type").equals("OBLIGATION_CREATED").toArray())[0]!;
    expect(event.payload).toMatchObject({ obligationId: task.id, sourceCaptureId: old.id });
  });
});
