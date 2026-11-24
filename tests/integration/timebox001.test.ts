import { describe, expect, it } from "vitest";
import { convertCaptureToObligation, createObligation, modifyObligation, releaseObligation, satisfyObligation } from "../../src/application/intentCommands";
import { getObligations } from "../../src/application/intentQueries";
import { moveWeekTask } from "../../src/application/weekPlannerCommands";
import { plannerDates } from "../../src/application/weekPlannerQueries";
import { captureItem } from "../../src/application/commands";
import { capturePromotionInput, canConfirmCapturePromotion, emptyCapturePromotionDraft } from "../../src/ui/components/CapturePromotionForm";
import { db } from "../../src/persistence/db";
import { applyAnyRestore } from "../../src/persistence/restore";
import {
  estimateFormFor, estimateTotal, estimateTotalLine, formatEstimate, isValidEstimateMinutes, readEstimateForm,
} from "../../src/domain/intent/estimate";

/**
 * TIMEBOX-001 (Gavin, 2026-11-18 "Go"; restarted 2026-11-23): his optional time estimate on a task, 1–480 whole
 * minutes. Estimate only: no scheduling, no free time, no "full" day. A repeating task's next occurrence keeps it.
 */
describe("TIMEBOX-001 — reading the hours + minutes form", () => {
  it("accepts whole numbers from 1 minute to 8 hours, blank as no estimate, and refuses everything else", () => {
    expect(readEstimateForm({ hours: "", minutes: "" })).toEqual({ ok: true, minutes: null });
    expect(readEstimateForm({ hours: " ", minutes: "  " })).toEqual({ ok: true, minutes: null });
    expect(readEstimateForm({ hours: "", minutes: "1" })).toEqual({ ok: true, minutes: 1 });
    expect(readEstimateForm({ hours: "1", minutes: "30" })).toEqual({ ok: true, minutes: 90 });
    expect(readEstimateForm({ hours: "0", minutes: "90" })).toEqual({ ok: true, minutes: 90 });
    expect(readEstimateForm({ hours: "8", minutes: "" })).toEqual({ ok: true, minutes: 480 });
    for (const bad of [{ hours: "8", minutes: "1" }, { hours: "0", minutes: "0" }, { hours: "", minutes: "0" }, { hours: "9", minutes: "" }]) {
      expect(readEstimateForm(bad)).toEqual({ ok: false, message: "An estimate is 1 minute to 8 hours." });
    }
    for (const bad of [{ hours: "1.5", minutes: "" }, { hours: "", minutes: "-5" }, { hours: "one", minutes: "" }, { hours: "", minutes: "1e2" }]) {
      expect(readEstimateForm(bad)).toEqual({ ok: false, message: "Use whole hours and minutes, like 1 h 30 min." });
    }
    expect(isValidEstimateMinutes(1)).toBe(true);
    expect(isValidEstimateMinutes(480)).toBe(true);
    for (const bad of [0, 481, 1.5, -1, Number.NaN, "30", undefined]) expect(isValidEstimateMinutes(bad)).toBe(false);
  });

  it("says an estimate the way a person does and round-trips the form", () => {
    expect(formatEstimate(45)).toBe("45 min");
    expect(formatEstimate(60)).toBe("1 h");
    expect(formatEstimate(90)).toBe("1 h 30 min");
    expect(formatEstimate(480)).toBe("8 h");
    expect(estimateFormFor(undefined)).toEqual({ hours: "", minutes: "" });
    expect(estimateFormFor(90)).toEqual({ hours: "1", minutes: "30" });
    expect(estimateFormFor(45)).toEqual({ hours: "", minutes: "45" });
    for (const m of [1, 59, 60, 61, 479, 480]) expect(readEstimateForm(estimateFormFor(m))).toEqual({ ok: true, minutes: m });
  });
});

describe("TIMEBOX-001 — the day total", () => {
  it("sums only the estimates he entered and says how many tasks have one; never free or full", () => {
    expect(estimateTotalLine([])).toBeNull();
    expect(estimateTotalLine([{}])).toBe("No time estimates yet · 0 of 1 task has a time.");
    expect(estimateTotalLine([{ estimateMinutes: 30 }])).toBe("Your estimates: 30 min · 1 of 1 task has a time.");
    const tasks = [{ estimateMinutes: 45 }, {}, { estimateMinutes: 30 }];
    expect(estimateTotal(tasks)).toEqual({ minutes: 75, withTime: 2, of: 3 });
    expect(estimateTotalLine(tasks)).toBe("Your estimates: 1 h 15 min · 2 of 3 tasks have a time.");
    // A malformed stored value is not counted, and never read as zero time.
    expect(estimateTotal([{ estimateMinutes: 0 }, { estimateMinutes: 600 }, { estimateMinutes: 60 }])).toEqual({ minutes: 60, withTime: 1, of: 3 });
    // A big total is still only a sum of his guesses.
    const line = estimateTotalLine(Array.from({ length: 4 }, () => ({ estimateMinutes: 480 })))!;
    expect(line).toBe("Your estimates: 32 h · 4 of 4 tasks have a time.");
    for (const word of [/free/i, /full/i, /available/i, /capacity/i, /left/i]) expect(line).not.toMatch(word);
  });
});

describe("TIMEBOX-001 — stored on the task", () => {
  it("validates 1–480 whole minutes on create and modify; null clears it; missing is not zero", async () => {
    for (const bad of [0, 481, 30.5, -10]) {
      await expect(createObligation({ title: "Bad", estimateMinutes: bad })).rejects.toThrow("ESTIMATE_INVALID");
    }
    const none = await createObligation({ title: "No estimate" });
    expect("estimateMinutes" in none).toBe(false);
    const task = await createObligation({ title: "Write report", estimateMinutes: 90 });
    expect(task.estimateMinutes).toBe(90);
    expect((await modifyObligation(task.id, { title: "Write the report" })).estimateMinutes).toBe(90);
    await expect(modifyObligation(task.id, { estimateMinutes: 481 })).rejects.toThrow("ESTIMATE_INVALID");
    expect((await modifyObligation(task.id, { estimateMinutes: 480 })).estimateMinutes).toBe(480);
    const cleared = await modifyObligation(task.id, { estimateMinutes: null });
    expect("estimateMinutes" in cleared).toBe(false);
    expect((await getObligations()).find((o) => o.id === task.id)?.estimateMinutes).toBeUndefined();
  });

  it("refuses to rewrite a resolved task's estimate", async () => {
    const done = await createObligation({ title: "Done", estimateMinutes: 20 });
    await satisfyObligation(done.id);
    await expect(modifyObligation(done.id, { estimateMinutes: 25 })).rejects.toThrow("OBLIGATION_ALREADY_RESOLVED");
    const let_go = await createObligation({ title: "Let go" });
    await releaseObligation(let_go.id);
    await expect(modifyObligation(let_go.id, { estimateMinutes: 10 })).rejects.toThrow("OBLIGATION_ALREADY_RESOLVED");
    expect((await getObligations()).find((o) => o.id === done.id)?.estimateMinutes).toBe(20);
  });

  it("carries the estimate to a repeating task's next occurrence, and not to one without", async () => {
    const weekly = await createObligation({ title: "Bins", dueAt: "2026-11-10", estimateMinutes: 15, recurrence: { rrule: "FREQ=WEEKLY" } });
    await satisfyObligation(weekly.id);
    const next = (await getObligations()).find((o) => o.title === "Bins" && o.status === "OPEN")!;
    expect(next.estimateMinutes).toBe(15);
    expect(next.dueAt).not.toBe("2026-11-10");
    const daily = await createObligation({ title: "Stretch", dueAt: "2026-11-10", recurrence: { rrule: "FREQ=DAILY" } });
    await satisfyObligation(daily.id);
    expect((await getObligations()).find((o) => o.title === "Stretch" && o.status === "OPEN")?.estimateMinutes).toBeUndefined();
  });

  it("survives a native backup; a malformed restored estimate drops only the estimate", async () => {
    await db.open();
    const task = await createObligation({ title: "Taxes", estimateMinutes: 120 });
    const old = await createObligation({ title: "Old untimed" });
    const file = new File([await db.export({ prettyJson: true })], "native-backup.json", { type: "application/json" });
    await modifyObligation(task.id, { estimateMinutes: null });
    await applyAnyRestore(file);
    expect((await getObligations()).find((o) => o.id === task.id)?.estimateMinutes).toBe(120);
    expect((await getObligations()).find((o) => o.id === old.id)?.estimateMinutes).toBeUndefined();
    for (const bad of [0, "an hour", 9999, 2.5]) {
      await db.obligations.update(task.id, { estimateMinutes: bad as never });
      const read = (await getObligations()).find((o) => o.id === task.id);
      expect(read?.title).toBe("Taxes");
      expect(read?.estimateMinutes).toBeUndefined();
    }
  });

  it("is optional when turning a capture into a task", async () => {
    const draft = emptyCapturePromotionDraft("Call the bank");
    expect(capturePromotionInput(draft)).toEqual({ title: "Call the bank" });
    expect(canConfirmCapturePromotion({ ...draft, estimate: { hours: "9", minutes: "" } })).toBe(false);
    expect(canConfirmCapturePromotion({ ...draft, estimate: { hours: "1.5", minutes: "" } })).toBe(false);
    const timed = { ...draft, estimate: { hours: "", minutes: "20" } };
    expect(canConfirmCapturePromotion(timed)).toBe(true);
    expect(capturePromotionInput(timed)).toEqual({ title: "Call the bank", estimateMinutes: 20 });
    const capture = await captureItem("Call the bank");
    const task = await convertCaptureToObligation(capture.id, capturePromotionInput(timed));
    expect(task.estimateMinutes).toBe(20);
  });
});

describe("TIMEBOX-001 — the Week planner sheet saves day and estimate together", () => {
  it("sets, keeps, changes and clears the estimate with the planned day, guarded like a move", async () => {
    const [today, tomorrow] = plannerDates();
    const task = await createObligation({ title: "Paint fence", plannedAt: today!, dueAt: "2027-01-01" });
    const withEstimate = await moveWeekTask(task.id, today!, task, undefined, { estimateMinutes: 60 });
    expect(withEstimate).toMatchObject({ plannedAt: today, estimateMinutes: 60, dueAt: "2027-01-01" });
    // A stale sheet (old updatedAt) never rewrites the task.
    await expect(moveWeekTask(task.id, tomorrow!, task, undefined, { estimateMinutes: 30 })).rejects.toThrow("This task changed");
    const moved = await moveWeekTask(task.id, tomorrow!, withEstimate);
    expect(moved).toMatchObject({ plannedAt: tomorrow, estimateMinutes: 60 });
    const same = await moveWeekTask(task.id, tomorrow!, moved, undefined, { estimateMinutes: 60 });
    expect(same.updatedAt).toBe(moved.updatedAt); // nothing changed, nothing written
    const cleared = await moveWeekTask(task.id, tomorrow!, same, undefined, { estimateMinutes: null });
    expect(cleared.estimateMinutes).toBeUndefined();
    expect(cleared.dueAt).toBe("2027-01-01");
    await expect(moveWeekTask(task.id, "1999-01-01", cleared, undefined, { estimateMinutes: 5 })).rejects.toThrow("outside the current seven-day plan");
    await expect(moveWeekTask(task.id, tomorrow!, cleared, undefined, { estimateMinutes: 0 })).rejects.toThrow("ESTIMATE_INVALID");
    await satisfyObligation(task.id);
    const resolved = (await getObligations()).find((o) => o.id === task.id)!;
    await expect(moveWeekTask(task.id, tomorrow!, resolved, undefined, { estimateMinutes: 10 })).rejects.toThrow("no longer open");
  });
});
