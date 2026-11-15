import { describe, expect, it } from "vitest";
import {
  applyAlertContract,
  buildBridgePlan,
  HORIZON_DAYS,
  inQuietHours,
  KIND_PRIORITY,
  MAX_PER_DAY,
  type BridgeMoment,
} from "../../src/application/bridgePlan";
import { getKeyMomentAlerts, setKeyMomentAlerts } from "../../src/application/keyMomentAlerts";
import { updateSchedulePattern } from "../../src/application/commands";
import { getSchedulePattern } from "../../src/application/queries";
import { createObligation } from "../../src/application/intentCommands";
import { isOperatorSavedSchedule } from "../../src/engine/scheduledContext";
import { mostRecentBoundaryAtOrBefore } from "../../src/engine/dayRollover";
import { db } from "../../src/persistence/db";
import { applyAnyRestore } from "../../src/persistence/restore";
import type { KeyMomentAlertSettings, KeyMomentKind } from "../../src/domain/common/types";

/** BRIDGE-NOTIFY-001: key-moment alerts held to BEYOND-4.0 decision 5 (at most 3 a day, kinds off, quiet hours). */
const ON: KeyMomentAlertSettings = { off: [], quietFrom: null, quietTo: null };
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();
const moment = (t: number, kind: KeyMomentKind): BridgeMoment => ({ at: t, kind, title: kind, text: "", go: "" });
const perLivedDay = (moments: BridgeMoment[]) => {
  const days = new Map<number, number>();
  for (const m of moments) { const k = mostRecentBoundaryAtOrBefore(new Date(m.at)).getTime(); days.set(k, (days.get(k) ?? 0) + 1); }
  return [...days.values()];
};

describe("BRIDGE-NOTIFY-001 — the notification contract", () => {
  it("keeps at most 3 a lived day, chosen by kind priority, then time", () => {
    expect(MAX_PER_DAY).toBe(3);
    expect(KIND_PRIORITY).toEqual(["BEFORE_SHIFT", "SHIFT_DONE", "TASK_DUE", "WAKE"]);
    // One lived day (Nov 2 16:30 to Nov 3 16:30) with five candidates.
    const day = [
      moment(at(2, 17, 30), "BEFORE_SHIFT"), moment(at(3, 6), "SHIFT_DONE"), moment(at(3, 15), "WAKE"),
      moment(at(3, 16), "TASK_DUE"), moment(at(3, 16, 10), "TASK_DUE"),
    ];
    const kept = applyAlertContract(day, ON);
    expect(kept.map((m) => m.kind)).toEqual(["BEFORE_SHIFT", "SHIFT_DONE", "TASK_DUE"]);
    expect(kept[2]!.at).toBe(at(3, 16)); // the earlier of two equal-priority moments
    // The next lived day starts at 16:30 and has its own three.
    const next = applyAlertContract([...day, moment(at(3, 16, 30), "WAKE"), moment(at(3, 17), "WAKE")], ON);
    expect(next.filter((m) => m.at >= at(3, 16, 30)).length).toBe(2);
  });

  it("a kind turned off never reaches the phone, and frees its slot for the next kind", () => {
    const day = [moment(at(2, 17, 30), "BEFORE_SHIFT"), moment(at(3, 6), "SHIFT_DONE"), moment(at(3, 15), "WAKE"), moment(at(3, 16), "TASK_DUE")];
    const kept = applyAlertContract(day, { ...ON, off: ["SHIFT_DONE"] });
    expect(kept.map((m) => m.kind)).toEqual(["BEFORE_SHIFT", "WAKE", "TASK_DUE"]);
  });

  it("quiet hours (crossing midnight) and quiet on the clock drop moments", () => {
    const quiet: KeyMomentAlertSettings = { off: [], quietFrom: "07:00", quietTo: "14:00" };
    expect(inQuietHours(at(3, 6, 59), quiet)).toBe(false);
    expect(inQuietHours(at(3, 7), quiet)).toBe(true);
    expect(inQuietHours(at(3, 14), quiet)).toBe(false);
    const night: KeyMomentAlertSettings = { off: [], quietFrom: "22:00", quietTo: "06:00" };
    expect(inQuietHours(at(3, 23), night)).toBe(true);
    expect(inQuietHours(at(3, 5, 59), night)).toBe(true);
    expect(inQuietHours(at(3, 6), night)).toBe(false);
    expect(inQuietHours(at(3, 12), night)).toBe(false);
    const shift = { start: new Date(at(3, 10)), end: new Date(at(3, 20)) };
    const kept = applyAlertContract([moment(at(3, 9, 30), "BEFORE_SHIFT"), moment(at(3, 16), "TASK_DUE"), moment(at(3, 20), "SHIFT_DONE")], ON, [shift]);
    expect(kept.map((m) => m.kind)).toEqual(["BEFORE_SHIFT", "SHIFT_DONE"]); // the task fell on the clock
  });

  it("buildBridgePlan applies the switches, quiet hours and cap to four weeks of the saved rotation", async () => {
    const now = new Date(2026, 9, 31, 6, 0);
    await createObligation({ title: "Call the bank", dueAt: "2026-11-02" });
    await createObligation({ title: "Post the form", dueAt: "2026-11-02" });
    const plan = await buildBridgePlan("https://example.test/beyond/", "", now);
    expect(Math.max(...perLivedDay(plan.moments))).toBeLessThanOrEqual(MAX_PER_DAY);
    // Four weeks ahead, so the Bridge's background re-arm has moments beyond its 24 alarms.
    expect(plan.moments.at(-1)!.at - now.getTime()).toBeGreaterThan((HORIZON_DAYS - 1) * 24 * 3_600_000);
    expect(plan.moments.length).toBeGreaterThan(24);
    expect(plan.moments.every((m) => m.at > now.getTime())).toBe(true);
    // Two tasks on one day are one moment.
    expect(plan.moments.filter((m) => m.kind === "TASK_DUE")).toEqual([{ at: at(2, 16), kind: "TASK_DUE", title: "Due today", text: "Call the bank + 1 more", go: "" }]);
    // The end of a run says the days off start; a mid-run shift end keeps the usual debrief line.
    const doneTexts = plan.moments.filter((m) => m.kind === "SHIFT_DONE").map((m) => m.text);
    expect(doneTexts.some((t) => t.startsWith("Last shift of the run"))).toBe(true);
    expect(doneTexts.some((t) => t.startsWith("Tap to debrief"))).toBe(true);

    await setKeyMomentAlerts({ off: ["WAKE", "TASK_DUE"], quietFrom: "05:00", quietTo: "07:00" });
    const quieter = await buildBridgePlan("https://example.test/beyond/", "", now);
    expect(quieter.moments.some((m) => m.kind === "WAKE" || m.kind === "TASK_DUE")).toBe(false);
    expect(quieter.moments.some((m) => inQuietHours(m.at, { off: [], quietFrom: "05:00", quietTo: "07:00" }))).toBe(false);
    expect(quieter.moments.filter((m) => m.kind === "SHIFT_DONE")).toEqual([]); // every 06:00 shift end is quiet
  });

  it("settings are validated, survive a schedule save, keep the schedule unsaved, and round-trip a native backup", async () => {
    await db.open();
    expect(await getKeyMomentAlerts()).toEqual(ON);
    await expect(setKeyMomentAlerts({ off: [], quietFrom: "22:00", quietTo: null })).rejects.toThrow();
    await expect(setKeyMomentAlerts({ off: ["NEW_KIND" as KeyMomentKind], quietFrom: null, quietTo: null })).rejects.toThrow();
    const settings: KeyMomentAlertSettings = { off: ["WAKE"], quietFrom: "08:00", quietTo: "14:30" };
    await setKeyMomentAlerts(settings);
    expect(isOperatorSavedSchedule(await getSchedulePattern())).toBe(false);
    const pattern = await getSchedulePattern();
    await updateSchedulePattern({ anchorMonday: pattern.anchorMonday, weeks: pattern.weeks, shiftStartHour: 19, shiftEndHour: 7, postWorkTailHours: pattern.postWorkTailHours });
    expect(await getKeyMomentAlerts()).toEqual(settings);

    const file = new File([await db.export({ prettyJson: true })], "native-backup.json", { type: "application/json" });
    await setKeyMomentAlerts(ON);
    await applyAnyRestore(file);
    expect(await getKeyMomentAlerts()).toEqual(settings);
    expect((await getSchedulePattern()).shiftStartHour).toBe(19);

    // A malformed restored row reads as the defaults, never as a broken plan.
    await db.schedulePatterns.update("current", { keyMomentAlerts: { off: "everything" } as unknown as KeyMomentAlertSettings });
    expect(await getKeyMomentAlerts()).toEqual(ON);
  });
});
