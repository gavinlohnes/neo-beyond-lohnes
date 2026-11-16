import { describe, expect, it } from "vitest";
import { buildBridgePlan, describeReminderAlert, reminderAlert, reminderAlertLine, taskAlertAt } from "../../src/application/bridgePlan";
import { setKeyMomentAlerts } from "../../src/application/keyMomentAlerts";
import { createObligation, modifyObligation, satisfyObligation } from "../../src/application/intentCommands";
import { getObligations } from "../../src/application/intentQueries";
import { confirmProposal, toProposal } from "../../src/application/alfred/alfredActions";
import { interpret, type HelperContext } from "../../src/application/helper/freeHelper";
import { db } from "../../src/persistence/db";
import { REGISTRY } from "../../src/application/alfred/alfredTools";
import { CLOCK_HHMM } from "../../src/persistence/intentValidation";
import { applyAnyRestore } from "../../src/persistence/restore";

/**
 * REMIND-AT-001: a task can carry a reminder time; its alert fires then, as the existing TASK_DUE kind, under the same
 * 3-a-day cap, priority, switch and quiet hours, and the time-setting screens say when it won't alert.
 * Default rotation (anchor Mon 2026-08-17, A: Mon Tue Fri Sat Sun, B: Wed Thu, 18:00 to 06:00): week of Nov 9 is A.
 */
const at = (y: number, mo: number, d: number, h: number, m = 0) => new Date(y, mo - 1, d, h, m).getTime();
const NOW = new Date(2026, 10, 8, 12, 0); // Sun Nov 8 2026, 12:00 local
const chicago = Intl.DateTimeFormat().resolvedOptions().timeZone === "America/Chicago";

describe("REMIND-AT-001 — reminders at a set time", () => {
  it("stores HH:MM on a due date, clears it, refuses it without a due date, and carries it to the next occurrence", async () => {
    await expect(createObligation({ title: "No day", remindAt: "17:30" })).rejects.toThrow("REMIND_AT_NEEDS_DUE");
    await expect(createObligation({ title: "Bad", dueAt: "2026-11-10", remindAt: "25:00" })).rejects.toThrow();
    const task = await createObligation({ title: "Call mum", dueAt: "2026-11-10", remindAt: "17:30" });
    expect(task.remindAt).toBe("17:30");
    expect((await modifyObligation(task.id, { dueAt: "2026-11-11" })).remindAt).toBe("17:30"); // a new date keeps the time
    expect((await modifyObligation(task.id, { remindAt: "09:05" })).remindAt).toBe("09:05");
    const cleared = await modifyObligation(task.id, { remindAt: null });
    expect("remindAt" in cleared).toBe(false);
    const plain = await createObligation({ title: "Plain" });
    await expect(modifyObligation(plain.id, { remindAt: "10:00" })).rejects.toThrow("REMIND_AT_NEEDS_DUE");

    const weekly = await createObligation({ title: "Bins", dueAt: "2026-11-10", remindAt: "19:45", recurrence: { rrule: "FREQ=WEEKLY" } });
    await satisfyObligation(weekly.id);
    const next = (await getObligations()).find((o) => o.title === "Bins" && o.status === "OPEN")!;
    expect(next.remindAt).toBe("19:45");
    expect(next.dueAt).not.toBe("2026-11-10");
  });

  it("survives a native backup, and a malformed restored time drops only the time", async () => {
    await db.open();
    const task = await createObligation({ title: "Dentist", dueAt: "2026-11-12", remindAt: "08:15" });
    // A row without the field (as in every backup made before REMIND-AT-001) restores unchanged.
    const old = await createObligation({ title: "Old untimed", dueAt: "2026-11-12" });
    const file = new File([await db.export({ prettyJson: true })], "native-backup.json", { type: "application/json" });
    await modifyObligation(task.id, { remindAt: null });
    await applyAnyRestore(file);
    expect((await getObligations()).find((o) => o.id === task.id)?.remindAt).toBe("08:15");
    expect((await getObligations()).find((o) => o.id === old.id)).toMatchObject({ title: "Old untimed", dueAt: "2026-11-12" });
    expect((await getObligations()).find((o) => o.id === old.id)?.remindAt).toBeUndefined();
    await db.obligations.update(task.id, { remindAt: "half eight" });
    const read = (await getObligations()).find((o) => o.id === task.id);
    expect(read?.title).toBe("Dentist");
    expect(read?.remindAt).toBeUndefined();
  });

  it("fires the existing TASK_DUE kind at the set time instead of 16:00, and same-minute tasks share one moment", async () => {
    await createObligation({ title: "Call mum", dueAt: "2026-11-11", remindAt: "17:30" });
    await createObligation({ title: "Text Sam", dueAt: "2026-11-11", remindAt: "17:30" });
    await createObligation({ title: "Pay rent", dueAt: "2026-11-11" });
    const plan = await buildBridgePlan("https://example.test/", "", NOW);
    const tasks = plan.moments.filter((m) => m.kind === "TASK_DUE");
    expect(tasks).toEqual([
      { at: at(2026, 11, 11, 16), kind: "TASK_DUE", title: "Due today", text: "Pay rent", go: "" },
      { at: at(2026, 11, 11, 17, 30), kind: "TASK_DUE", title: "Reminder", text: "Call mum + 1 more", go: "" },
    ]);
    expect(new Set(plan.moments.map((m) => `${m.at}|${m.kind}`)).size).toBe(plan.moments.length);
    expect(await reminderAlert({ dueAt: "2026-11-11", remindAt: "17:30" }, NOW)).toEqual({ state: "ALERTS", at: at(2026, 11, 11, 17, 30) });
  });

  it("says honestly when it won't alert: past, switch off, quiet hours, on the clock, cap full; later when beyond the plan", async () => {
    expect(await reminderAlert({ dueAt: "2026-11-08", remindAt: "11:00" }, NOW)).toMatchObject({ state: "SILENT", reason: "PAST" });
    // Mon Nov 9 18:00 to Tue 06:00 is a shift of the standing rotation.
    expect(await reminderAlert({ dueAt: "2026-11-09", remindAt: "20:00" }, NOW)).toMatchObject({ state: "SILENT", reason: "ON_THE_CLOCK" });
    // Lived day Mon 16:30 to Tue 16:30: shift in 30 (Mon 17:30) and shift done (Tue 06:00) come first; then tasks by time.
    await createObligation({ title: "Earlier", dueAt: "2026-11-10", remindAt: "10:00" });
    expect(await reminderAlert({ dueAt: "2026-11-10", remindAt: "09:00" }, NOW)).toMatchObject({ state: "ALERTS" });
    const full = await reminderAlert({ dueAt: "2026-11-10", remindAt: "12:00" }, NOW);
    expect(full).toMatchObject({ state: "SILENT", reason: "CAP_FULL" });
    expect(describeReminderAlert(full)).toBe("Won't alert: the day from 16:30 Mon 9 Nov already has 3 alerts that come first (shift alerts, then earlier tasks).");
    // Editing the saved task itself is judged without its old copy.
    const own = await createObligation({ title: "Own", dueAt: "2026-11-10", remindAt: "12:00" });
    expect(await reminderAlert({ dueAt: "2026-11-10", remindAt: "09:30", obligationId: own.id }, NOW)).toMatchObject({ state: "ALERTS" });
    const later = await reminderAlert({ dueAt: "2027-01-20", remindAt: "10:00" }, NOW);
    expect(later.state).toBe("LATER");
    expect(describeReminderAlert(later)).toContain("over four weeks away");

    await setKeyMomentAlerts({ off: [], quietFrom: "22:00", quietTo: "07:00" });
    expect(await reminderAlertLine({ dueAt: "2026-11-11", remindAt: "23:30" }, NOW)).toBe("Won't alert: 23:30 is in your quiet hours (22:00 to 07:00).");
    expect(await reminderAlertLine({ dueAt: "2026-11-11", remindAt: "07:00" }, NOW)).toBe("Alerts at 07:00 on Wed 11 Nov. Your phone gets it at the next SYNC GARMIN.");
    await setKeyMomentAlerts({ off: ["TASK_DUE"], quietFrom: null, quietTo: null });
    expect(await reminderAlertLine({ dueAt: "2026-11-11", remindAt: "12:00" }, NOW)).toBe("Won't alert: task alerts are off (MORE → Work Schedule → KEY-MOMENT ALERTS).");
    const plan = await buildBridgePlan("https://example.test/", "", NOW);
    expect(plan.moments.some((m) => m.kind === "TASK_DUE")).toBe(false);
  });

  it("is a wall-clock time across DST in America/Chicago and in UTC", async () => {
    // Fall back is Sun Nov 1 2026 02:00 in Chicago. A 17:30 reminder after it still fires at 17:30 local.
    const before = new Date(2026, 9, 30, 12, 0);
    await createObligation({ title: "After the change", dueAt: "2026-11-02", remindAt: "17:30" });
    const plan = await buildBridgePlan("https://example.test/", "", before);
    const moment = plan.moments.find((m) => m.text === "After the change")!;
    expect([new Date(moment.at).getHours(), new Date(moment.at).getMinutes()]).toEqual([17, 30]);
    expect(new Date(moment.at).toISOString()).toBe(chicago ? "2026-11-02T23:30:00.000Z" : "2026-11-02T17:30:00.000Z");
    expect(new Date(taskAlertAt("2026-10-31", "17:30")!).toISOString()).toBe(chicago ? "2026-10-31T22:30:00.000Z" : "2026-10-31T17:30:00.000Z");
    // Spring forward, Sun Mar 14 2027: 02:30 doesn't exist in Chicago; the line names the real time it will fire.
    const gap = await reminderAlertLine({ dueAt: "2027-03-14", remindAt: "02:30" }, new Date(2027, 2, 1, 12));
    expect(gap).toContain(chicago ? "03:30 on Sun 14 Mar" : "02:30 on Sun 14 Mar");
  });

  it("Alfred and the free helper set the time through the existing add_reminder card", async () => {
    const ctx = { now: new Date(2026, 10, 2, 12), savedMeals: [], openTasks: [], openProjects: [], routines: [] } as unknown as HelperContext;
    expect(interpret("remind me to call mum at 17:30 tomorrow", ctx).cards).toEqual([
      { kind: "add_reminder", title: "Call mum", due_date: "2026-11-03", repeat_rrule: undefined, when_note: "17:30" },
    ]);
    await confirmProposal(toProposal("add_reminder", { title: "Call mum", due_date: "2026-11-20", when_note: "17:30" })!);
    await confirmProposal(toProposal("add_reminder", { title: "CPAP", due_date: "2026-11-20", when_note: "after I wake" })!);
    await confirmProposal(toProposal("add_reminder", { title: "Undated", when_note: "17:30" })!);
    const all = await getObligations();
    expect(all.find((o) => o.title === "Call mum")).toMatchObject({ dueAt: "2026-11-20", remindAt: "17:30" });
    expect(all.find((o) => o.title === "Call mum")?.description).toBeUndefined();
    expect(all.find((o) => o.title === "CPAP")).toMatchObject({ description: "after I wake" });
    expect(all.find((o) => o.title === "CPAP")?.remindAt).toBeUndefined();
    expect(all.find((o) => o.title === "Undated")).toMatchObject({ description: "17:30" });
    // The tool's own examples of a clock time are the HH:MM shape it turns into an alert time.
    const desc = REGISTRY.add_reminder.tool?.description ?? "";
    expect(desc).toContain("HH:MM");
    for (const clock of desc.match(/\d{1,2}:\d{2}/g) ?? []) expect(CLOCK_HHMM.test(clock)).toBe(true);
  });
});
